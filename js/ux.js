/* ux.js — покращення для покупців і продавців.
 *
 *  1. Обране зберігається (раніше жило лише до перезавантаження сторінки)
 *     і синхронізується між пристроями через колекцію favorites.
 *  2. Збережені пошуки: кнопка в каталозі, список у профілі, лічильник нових
 *     оголошень і email, коли з'являється підходяще оголошення.
 *  3. «Онлайн / На сайті N хв тому» біля продавця (publicProfiles.lastSeen).
 *  4. Чернетка оголошення: форма не губиться, якщо закрити сторінку.
 *  5. Підказки якості оголошення на останньому кроці.
 *  6. «Підняти» оголошення раз на 7 днів.
 *  7. Безпека угоди в чаті: попередження і скарга на співрозмовника.
 *
 *  Файл підключається останнім і лише доповнює існуючі функції
 *  (обгортає їх), тож якщо він не завантажиться — сайт працює як раніше.
 */
(function () {
  'use strict';

  // ── Спільне ──────────────────────────────────────────────────
  function db() { return window._db; }
  function me() { return window._auth && window._auth.currentUser; }
  function FV() { return firebase.firestore.FieldValue; }
  function noop() {}
  function toast(m) { if (typeof showToast === 'function') showToast(m); }
  function pl(n, f) { return window.plUk ? window.plUk(n, f) : f[2]; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function $(id) { return document.getElementById(id); }
  function sec(ts) {
    if (!ts) return 0;
    if (typeof ts.seconds === 'number') return ts.seconds;
    if (typeof ts === 'number') return ts > 1e12 ? Math.floor(ts / 1000) : ts;
    if (typeof ts.toDate === 'function') return Math.floor(ts.toDate().getTime() / 1000);
    return 0;
  }
  function listings() { return typeof _allListings === 'function' ? _allListings() : []; }
  function findListing(id) { return listings().filter(function (l) { return l && l.id === id; })[0] || null; }
  function lsGet(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function wrap(name, after, before) {
    var orig = window[name];
    if (typeof orig !== 'function') return;
    window[name] = function () {
      if (before && before.apply(this, arguments) === false) return;
      var r = orig.apply(this, arguments);
      try { if (after) after.apply(this, [r].concat([].slice.call(arguments))); } catch (e) { console.warn('[ux] ' + name, e); }
      return r;
    };
  }
  function onAuth(cb) {
    var go = function () { if (window._auth) window._auth.onAuthStateChanged(cb); };
    if (window._firebaseReady) go();
    else if (typeof window._onFirebaseReady === 'function') window._onFirebaseReady(go);
  }
  function ago(s) {
    var d = Math.max(0, Date.now() / 1000 - s);
    if (d < 3600) { var m = Math.max(1, Math.round(d / 60)); return m + ' хв тому'; }
    if (d < 86400) { var h = Math.round(d / 3600); return h + ' ' + pl(h, ['годину', 'години', 'годин']) + ' тому'; }
    if (d < 2 * 86400) return 'вчора';
    var n = Math.floor(d / 86400); return n + ' ' + pl(n, ['день', 'дні', 'днів']) + ' тому';
  }

  // Повідомити сервер про нове оголошення або зниження ціни —
  // він сам розішле листи тим, кого це стосується.
  window._uxNotify = function (type, listingId) {
    var u = me();
    if (!u || !listingId) return;
    u.getIdToken().then(function (tok) {
      return fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
        body: JSON.stringify({ type: type, listingId: String(listingId) })
      });
    }).catch(noop);
  };

  // ══ 1. ОБРАНЕ ════════════════════════════════════════════════
  var FAV_KEY = 'ridego_favs';
  var favExtra = {};   // оголошення з обраного, яких немає в загальному списку (продані тощо)

  function saveLocalFavs() { lsSet(FAV_KEY, favorites.slice(-300)); }
  function setFavs(ids) {
    var seen = {};
    favorites.length = 0;
    ids.forEach(function (id) { if (id && !seen[id]) { seen[id] = 1; favorites.push(id); } });
    saveLocalFavs();
    refreshFavUI();
  }
  function refreshFavUI() {
    var c = $('pstat-favs'); if (c) c.textContent = favorites.length;
    document.querySelectorAll('.fav-btn:not(.compare-btn-card)').forEach(function (b) {
      var m = (b.getAttribute('onclick') || '').match(/toggleFav\('([^']+)'/);
      if (!m) return;
      var on = favorites.indexOf(m[1]) > -1;
      b.classList.toggle('active', on);
      var i = b.querySelector('i'); if (i) i.className = 'fa-' + (on ? 'solid' : 'regular') + ' fa-heart';
    });
    if (window.currentDetailId && typeof updateFavBtn === 'function') { try { updateFavBtn(); } catch (e) {} }
    var tab = $('ptab-favs');
    if (tab && tab.style.display !== 'none') window.renderFavs();
  }

  if (typeof favorites !== 'undefined') setFavs(favorites.concat(lsGet(FAV_KEY, [])));

  window.toggleFavById = function (id) {
    var i = favorites.indexOf(id), add = i < 0;
    if (add) favorites.push(id); else favorites.splice(i, 1);
    saveLocalFavs();
    var u = me();
    if (u && db()) {
      var ref = db().collection('favorites').doc(u.uid + '_' + id);
      if (add) {
        var l = findListing(id);
        ref.set({ uid: u.uid, listingId: id, price: (l && Number(l.price)) || 0, createdAt: FV().serverTimestamp() }).catch(noop);
      } else ref.delete().catch(noop);
    } else if (add && !lsGet('ridego_fav_hint', 0)) {
      lsSet('ridego_fav_hint', 1);
      setTimeout(function () { toast('💡 Увійдіть, щоб обране було на всіх пристроях і приходили листи про зниження ціни'); }, 1800);
    }
    var c = $('pstat-favs'); if (c) c.textContent = favorites.length;
  };

  function syncFavs(uid) {
    db().collection('favorites').where('uid', '==', uid).limit(300).get().then(function (snap) {
      var remote = snap.docs.map(function (d) { return d.data().listingId; }).filter(Boolean);
      favorites.filter(function (id) { return remote.indexOf(id) < 0; }).slice(0, 50).forEach(function (id) {
        var l = findListing(id);
        db().collection('favorites').doc(uid + '_' + id).set({
          uid: uid, listingId: id, price: (l && Number(l.price)) || 0, createdAt: FV().serverTimestamp()
        }).catch(noop);
      });
      setFavs(remote.concat(favorites));
    }).catch(function (e) { console.warn('[ux] favorites', e.message); });
  }

  window.renderFavs = function () {
    var grid = $('favs-grid'), empty = $('favs-empty');
    renderSearches();
    renderEmailPrefs();
    if (!grid || !empty) return;
    var map = {};
    listings().forEach(function (l) { if (l && l.id) map[l.id] = l; });
    var list = favorites.slice().reverse().map(function (id) { return map[id] || favExtra[id]; })
      .filter(function (l) { return l && l.status !== 'deleted'; });
    empty.style.display = list.length ? 'none' : '';
    grid.innerHTML = list.map(function (l) { return createCard(l, 'profile'); }).join('');

    var missing = favorites.filter(function (id) { return !map[id] && !(id in favExtra); }).slice(0, 30);
    if (!missing.length || !db()) return;
    missing.forEach(function (id) { favExtra[id] = null; });
    var chunks = [];
    for (var i = 0; i < missing.length; i += 10) chunks.push(missing.slice(i, i + 10));
    Promise.all(chunks.map(function (ids) {
      return db().collection('listings').where(firebase.firestore.FieldPath.documentId(), 'in', ids).get()
        .then(function (s) { s.docs.forEach(function (d) { favExtra[d.id] = Object.assign({ id: d.id }, d.data()); }); })
        .catch(noop);
    })).then(function () {
      var tab = $('ptab-favs');
      if (tab && tab.style.display !== 'none') window.renderFavs();
    });
  };

  // Налаштування листів у вкладці «Обране»
  var userPrefs = null;
  function renderEmailPrefs() {
    var box = $('ux-email-prefs');
    if (!box) return;
    var u = me();
    if (!u) { box.innerHTML = ''; return; }
    var on = !userPrefs || userPrefs.emailPriceDrop !== false;
    box.innerHTML = '<label class="ux-switch"><input type="checkbox" ' + (on ? 'checked' : '') +
      ' onchange="_uxSetPref(\'emailPriceDrop\', this.checked)"> <span>Лист на пошту, коли продавець знижує ціну на оголошення з обраного</span></label>';
  }
  window._uxSetPref = function (key, val) {
    var u = me(); if (!u || !db()) return;
    var upd = {}; upd[key] = !!val;
    userPrefs = Object.assign(userPrefs || {}, upd);
    db().collection('users').doc(u.uid).update(upd)
      .then(function () { toast(val ? '🔔 Сповіщення увімкнено' : '🔕 Сповіщення вимкнено'); })
      .catch(function () { toast('⚠️ Не вдалося зберегти'); });
  };

  // ══ 2. ЗБЕРЕЖЕНІ ПОШУКИ ═════════════════════════════════════
  var searches = null;   // null — ще не завантажено
  var MAX_SEARCHES = 10;

  function fval(id) { var el = $(id); return el ? String(el.value || '').trim() : ''; }
  function currentFilters() {
    return {
      cat: (typeof selectedCat !== 'undefined' && selectedCat) || '',
      oblast: fval('fp-oblast'), city: fval('fp-city'),
      brand: fval('fp-brand'), model: fval('fp-model'),
      priceFrom: parseInt(fval('fp-price-from'), 10) || 0,
      priceTo: parseInt(fval('fp-price-to'), 10) || 0,
      condition: (typeof conditionFilter !== 'undefined' && conditionFilter) || ''
    };
  }
  var FKEYS = ['cat', 'oblast', 'city', 'brand', 'model', 'priceFrom', 'priceTo', 'condition'];
  function sameFilters(a, b) { return FKEYS.every(function (k) { return String(a[k] || '') === String(b[k] || ''); }); }
  function fmtN(n) { return Number(n).toLocaleString('uk'); }
  function searchLabel(f) {
    var p = [];
    if (f.cat) p.push(f.cat);
    if (f.brand) p.push(f.brand + (f.model ? ' ' + f.model : ''));
    if (f.city || f.oblast) p.push(f.city || f.oblast);
    if (f.priceFrom && f.priceTo) p.push(fmtN(f.priceFrom) + '–' + fmtN(f.priceTo) + ' грн');
    else if (f.priceTo) p.push('до ' + fmtN(f.priceTo) + ' грн');
    else if (f.priceFrom) p.push('від ' + fmtN(f.priceFrom) + ' грн');
    if (f.condition) p.push(f.condition);
    return p.join(' · ') || 'Усі оголошення';
  }
  function norm(s) { return String(s || '').toLowerCase().trim(); }
  // Та сама логіка є на сервері (api/send-email.js → matchSearch).
  function matchSearch(s, l) {
    if (!l || l.status === 'deleted' || l.status === 'sold' || l.status === 'inactive') return false;
    if (s.cat && s.cat !== l.cat) return false;
    if (s.city) { if (norm(s.city) !== norm(l.city)) return false; }
    else if (s.oblast) {
      if (norm(l.oblast) !== norm(s.oblast) && norm(l.fullLoc).indexOf(norm(s.oblast)) < 0) {
        var geo = window.UA_GEO && window.UA_GEO[s.oblast];
        var inObl = false;
        if (geo && geo.raions) Object.keys(geo.raions).forEach(function (r) {
          if ((geo.raions[r].cities || []).indexOf(l.city) > -1) inObl = true;
        });
        if (!inObl) return false;
      }
    }
    var t = norm(l.title) + ' ' + norm(l.brand) + ' ' + norm(l.model);
    if (s.brand && t.indexOf(norm(s.brand)) < 0) return false;
    if (s.model && t.indexOf(norm(s.model)) < 0) return false;
    var price = Number(l.price) || 0;
    if (s.priceFrom && price < s.priceFrom) return false;
    if (s.priceTo && price > s.priceTo) return false;
    if (s.condition && s.condition !== l.condition) return false;
    return true;
  }
  function newCount(s) {
    var since = sec(s.lastSeenAt) || sec(s.createdAt) || Date.now() / 1000;
    return listings().filter(function (l) {
      return matchSearch(s, l) && sec(l.createdAt) > since && (!me() || l.uid !== me().uid);
    }).length;
  }

  function loadSearches(uid) {
    db().collection('savedSearches').where('uid', '==', uid).limit(MAX_SEARCHES + 5).get().then(function (snap) {
      searches = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); })
        .sort(function (a, b) { return sec(b.createdAt) - sec(a.createdAt); });
      renderSearches();
      updateSaveBtn();
    }).catch(function (e) { searches = []; console.warn('[ux] savedSearches', e.message); });
  }

  window._uxSaveSearch = function () {
    var u = me();
    if (!u) { toast('🔔 Увійдіть, щоб зберегти пошук і отримувати нові оголошення'); if (typeof showPage === 'function') showPage('profile'); return; }
    var f = currentFilters();
    if (!f.cat) { toast('⚠️ Спочатку оберіть категорію'); return; }
    if (searches && searches.some(function (s) { return sameFilters(s, f); })) { toast('ℹ️ Цей пошук уже збережено — він у профілі, вкладка «Обране»'); return; }
    if (searches && searches.length >= MAX_SEARCHES) { toast('⚠️ Можна зберегти до ' + MAX_SEARCHES + ' пошуків. Видаліть старий у профілі.'); return; }
    var doc = Object.assign({}, f, {
      uid: u.uid, label: searchLabel(f), notify: true,
      createdAt: FV().serverTimestamp(), lastSeenAt: FV().serverTimestamp()
    });
    var btn = $('save-search-btn'); if (btn) btn.disabled = true;
    db().collection('savedSearches').add(doc).then(function (ref) {
      var now = { seconds: Math.floor(Date.now() / 1000) };
      (searches = searches || []).unshift(Object.assign({}, doc, { id: ref.id, createdAt: now, lastSeenAt: now }));
      toast('🔔 Пошук збережено. Напишемо на пошту, щойно з\'явиться нове оголошення');
      updateSaveBtn();
    }).catch(function (e) {
      toast('⚠️ Не вдалося зберегти: ' + e.message);
      if (btn) btn.disabled = false;
    });
  };

  function updateSaveBtn() {
    var btn = $('save-search-btn');
    if (!btn) return;
    var f = currentFilters();
    var saved = !!(searches && searches.some(function (s) { return sameFilters(s, f); }));
    btn.disabled = saved;
    btn.innerHTML = saved
      ? '<i class="fa-solid fa-bell"></i> Пошук збережено'
      : '<i class="fa-regular fa-bell"></i> Зберегти пошук';
  }
  wrap('runSearch', function () {
    updateSaveBtn();
    var w = $('results-word'), n = $('results-num');
    if (w && n) w.textContent = pl(parseInt(n.textContent, 10) || 0, ['оголошення', 'оголошення', 'оголошень']);
  });

  function renderSearches() {
    var box = $('ux-searches');
    if (!box) return;
    if (!me()) { box.innerHTML = ''; return; }
    var list = searches || [];
    var head = '<div class="ux-sec-head"><i class="fa-solid fa-bell"></i> Збережені пошуки' +
      (list.length ? ' <span class="ux-muted">' + list.length + '</span>' : '') + '</div>';
    if (!list.length) {
      box.innerHTML = head + '<div class="ux-empty-line">Оберіть фільтри в каталозі й натисніть «Зберегти пошук» — ми повідомимо про нові оголошення.</div>';
      return;
    }
    box.innerHTML = head + list.map(function (s) {
      var n = newCount(s), id = esc(s.id);
      return '<div class="ux-search">' +
        '<div class="ux-search-main" onclick="_uxOpenSearch(\'' + id + '\')">' +
          '<div class="ux-search-label">' + esc(s.label || searchLabel(s)) + '</div>' +
          '<div class="ux-muted">' + (n ? '<b class="ux-new">' + n + ' ' + pl(n, ['нове', 'нові', 'нових']) + '</b>' : 'Нових немає') + '</div>' +
        '</div>' +
        '<button class="ux-icon-btn" title="' + (s.notify !== false ? 'Вимкнути листи' : 'Увімкнути листи') + '" onclick="_uxToggleSearch(\'' + id + '\')">' +
          '<i class="fa-' + (s.notify !== false ? 'solid' : 'regular') + ' fa-bell' + (s.notify !== false ? '' : '-slash') + '"></i></button>' +
        '<button class="ux-icon-btn" title="Видалити" onclick="_uxDeleteSearch(\'' + id + '\')"><i class="fa-solid fa-trash"></i></button>' +
      '</div>';
    }).join('');
  }
  function byId(id) { return (searches || []).filter(function (s) { return s.id === id; })[0]; }

  window._uxToggleSearch = function (id) {
    var s = byId(id); if (!s) return;
    var val = s.notify === false;
    db().collection('savedSearches').doc(id).update({ notify: val }).then(function () {
      s.notify = val; renderSearches();
      toast(val ? '🔔 Листи за цим пошуком увімкнено' : '🔕 Листи за цим пошуком вимкнено');
    }).catch(function () { toast('⚠️ Не вдалося змінити'); });
  };
  window._uxDeleteSearch = function (id) {
    if (!confirm('Видалити збережений пошук?')) return;
    db().collection('savedSearches').doc(id).delete().then(function () {
      searches = (searches || []).filter(function (s) { return s.id !== id; });
      renderSearches(); updateSaveBtn();
    }).catch(function () { toast('⚠️ Не вдалося видалити'); });
  };
  window._uxOpenSearch = function (id) {
    var s = byId(id); if (!s) return;
    s.lastSeenAt = { seconds: Math.floor(Date.now() / 1000) };
    db().collection('savedSearches').doc(id).update({ lastSeenAt: FV().serverTimestamp() }).catch(noop);
    if (typeof filterCatalog !== 'function') return;
    filterCatalog(s.cat);
    setTimeout(function () {
      var set = function (elId, v) { var el = $(elId); if (el) el.value = v == null ? '' : String(v); };
      if (s.oblast) { set('fp-oblast', s.oblast); if (typeof onFilterOblastChange === 'function') onFilterOblastChange(); }
      if (s.city) set('fp-city', s.city);
      if (s.brand) { set('fp-brand', s.brand); if (typeof onFpBrandChange === 'function') onFpBrandChange(); }
      if (s.model) set('fp-model', s.model);
      set('fp-price-from', s.priceFrom || '');
      set('fp-price-to', s.priceTo || '');
      var pill = document.querySelector('#fp-condition .pill[data-val="' + (s.condition || '') + '"]');
      if (pill && typeof setPill === 'function') setPill(pill, 'fp-condition');
      if (typeof updateActiveFilters === 'function') updateActiveFilters();
      if (typeof runSearch === 'function') runSearch();
    }, 400);
  };

  // Посилання з листа: /profile?tab=favs
  function openTabFromUrl() {
    var m = location.search.match(/[?&]tab=(favs|history)/);
    if (!m || typeof switchPTab !== 'function') return;
    var btn = document.querySelector('.ptab[data-tab="' + m[1] + '"]');
    setTimeout(function () { switchPTab(m[1], btn); }, 300);
  }

  // ══ 3. «ОНЛАЙН / НА САЙТІ N ХВ ТОМУ» ═══════════════════════
  var SEEN_KEY = 'ridego_seen_at';
  function touchLastSeen() {
    var u = me();
    if (!u || !db() || document.visibilityState !== 'visible') return;
    var last = lsGet(SEEN_KEY, {});
    if (last.uid === u.uid && Date.now() - last.at < 4 * 60 * 1000) return;
    lsSet(SEEN_KEY, { uid: u.uid, at: Date.now() });
    // update(), а не set(): якщо публічного профілю ще немає, не створюємо
    // порожній — інакше сторінка продавця втратила б ім'я і фото.
    db().collection('publicProfiles').doc(u.uid).update({ lastSeen: FV().serverTimestamp() }).catch(noop);
  }
  setInterval(touchLastSeen, 5 * 60 * 1000);
  document.addEventListener('visibilitychange', touchLastSeen);

  var seenCache = {};
  function showSeen(elId, uid) {
    var el = $(elId);
    if (!el) return;
    el.innerHTML = '';
    if (!uid || !db()) return;
    var render = function (s, pv) {
      if ($(elId) !== el || el.getAttribute('data-uid') !== uid) return;
      var badge = pv && elId === 'detail-seller-seen' ? '<div class="ux-pv"><i class="fa-solid fa-circle-check"></i>Телефон підтверджено</div>' : '';
      var d = s ? Date.now() / 1000 - s : 1e9;
      var seen = d > 30 * 86400 ? '' : d < 300
        ? '<span class="ux-online"><i></i>Онлайн</span>'
        : '<span class="ux-seen">Був(ла) онлайн ' + ago(s) + '</span>';
      el.innerHTML = seen + badge;
    };
    el.setAttribute('data-uid', uid);
    var c = seenCache[uid];
    if (c && Date.now() - c.at < 2 * 60 * 1000) { render(c.s, c.pv); return; }
    db().collection('publicProfiles').doc(uid).get().then(function (snap) {
      var dd = snap.exists ? snap.data() : {};
      var s = sec(dd.lastSeen), pv = !!dd.phoneVerified;
      seenCache[uid] = { at: Date.now(), s: s, pv: pv };
      render(s, pv);
    }).catch(noop);
  }
  wrap('showDetail', function (r, id) {
    var l = findListing(id);
    if (!l) return;
    showSeen('detail-seller-seen', l.uid);
    renderDetailOldPrice(l);
  });
  wrap('_renderSellerByUid', function (r, uid) { showSeen('seller-page-seen', uid); });

  function renderDetailOldPrice(l) {
    var el = $('detail-old-price');
    if (!el) return;
    var o = typeof _oldPrice === 'function' ? _oldPrice(l) : 0;
    el.innerHTML = o
      ? '<s>' + fmtN(o) + ' грн</s> <span class="ux-drop">−' + Math.round((o - l.price) / o * 100) + '%</span>'
      : '';
  }

  // ══ 4. ЧЕРНЕТКА ОГОЛОШЕННЯ ══════════════════════════════════
  var DRAFT_KEY = 'ridego_add_draft';
  var DRAFT_PHOTOS = 'add_draft_photos';
  var restoring = false, draftTimer = null, pendingSpecs = null;

  function editing() { return typeof _editListingId !== 'undefined' && !!_editListingId; }
  function collectDraft() {
    var page = $('page-add');
    if (!page) return null;
    var fields = {};
    page.querySelectorAll('input[id], select[id], textarea[id]').forEach(function (el) {
      if (el.type === 'file' || el.type === 'hidden') return;
      if (el.value !== '' && el.value != null) fields[el.id] = el.value;
    });
    return {
      at: Date.now(),
      cat: (typeof addSelectedCat !== 'undefined' && addSelectedCat) || '',
      step: (typeof addCurrentStep !== 'undefined' && addCurrentStep) || 1,
      fields: fields
    };
  }
  function hasContent(d) {
    if (!d) return false;
    var f = d.fields || {};
    return !!(f['new-title'] || f['new-price'] || f['new-desc'] || (d.photos || 0) > 0);
  }
  function saveDraft() {
    if (restoring || editing()) return;
    clearTimeout(draftTimer);
    draftTimer = setTimeout(function () {
      var d = collectDraft();
      if (!d) return;
      var photos = (window.uploadedPhotos || []).filter(function (p) { return p && p.blob; });
      d.photos = photos.length;
      if (!hasContent(d) && !d.cat) return;
      lsSet(DRAFT_KEY, d);
      if (typeof _idbSet === 'function') _idbSet(DRAFT_PHOTOS, photos.map(function (p) { return p.blob; }));
    }, 600);
  }
  window._uxDraftClear = function () {
    lsDel(DRAFT_KEY);
    if (typeof _idbSet === 'function') _idbSet(DRAFT_PHOTOS, []);
    var b = $('ux-draft-banner'); if (b) b.remove();
  };

  document.addEventListener('input', function (e) { if (e.target.closest && e.target.closest('#page-add')) saveDraft(); }, true);
  document.addEventListener('change', function (e) { if (e.target.closest && e.target.closest('#page-add')) saveDraft(); }, true);
  wrap('addSelectType', saveDraft);
  wrap('addGoStep', saveDraft);

  function offerDraft() {
    if (editing() || $('ux-draft-banner')) return;
    var d = lsGet(DRAFT_KEY, null);
    if (!d || !hasContent(d) || Date.now() - d.at > 14 * 86400000) return;
    var cur = collectDraft();
    if (cur && hasContent(cur)) return;   // користувач уже почав заповнювати
    var page = $('page-add');
    var host = page && (page.querySelector('#add-progress-bar') || page.firstElementChild);
    if (!host) return;
    var title = (d.fields && d.fields['new-title']) || d.cat || 'оголошення';
    var bar = document.createElement('div');
    bar.id = 'ux-draft-banner';
    bar.className = 'ux-banner';
    bar.innerHTML = '<div><b>У вас є незавершене оголошення</b><div class="ux-muted">' + esc(title) +
      ' · збережено ' + ago(d.at / 1000) + '</div></div>' +
      '<div class="ux-banner-acts"><button class="btn-primary" onclick="_uxDraftRestore()">Продовжити</button>' +
      '<button class="btn-outline" onclick="_uxDraftClear()">Почати заново</button></div>';
    var wrapEl = host.closest('div[style*="margin-bottom:36px"]') || host;
    wrapEl.parentNode.insertBefore(bar, wrapEl);
  }

  window._uxDraftRestore = function () {
    var d = lsGet(DRAFT_KEY, null);
    var b = $('ux-draft-banner'); if (b) b.remove();
    if (!d) return;
    restoring = true;
    var f = d.fields || {};
    var set = function (id) { var el = $(id); if (el && f[id] != null) el.value = f[id]; };
    var btn = document.querySelector('#add-step-1 .transport-btn[data-cat="' + (d.cat || '').replace(/"/g, '') + '"]');
    if (btn && typeof addSelectType === 'function') addSelectType(btn);
    if (!d.cat) { restoring = false; return; }
    addGoStep(2);
    setTimeout(function () {
      ['new-title', 'new-price', 'new-year', 'new-bargain', 'new-condition', 'new-mileage', 'new-district', 'new-desc', 'new-phone'].forEach(set);
      var brand = $('new-brand');
      if (brand && f['new-brand']) {
        brand.value = f['new-brand'];
        if (typeof onBrandChange === 'function') onBrandChange();
        set('new-brand-custom');
        var bc = $('new-brand-custom'); if (bc && f['new-brand'] === 'Інший бренд') bc.style.display = '';
      }
      setTimeout(function () {
        set('new-model-select'); set('new-model');
        set('new-title');   // onBrandChange міг підставити автоназву
        if (f['new-oblast']) {
          set('new-oblast');
          if (typeof onOblastChange === 'function') onOblastChange();
          setTimeout(function () {
            if (f['new-raion']) { set('new-raion'); if (typeof onRaionChange === 'function') onRaionChange(); }
            setTimeout(function () {
              set('new-city');
              if (f['new-city'] && typeof onCityChange === 'function') onCityChange();
            }, 100);
          }, 150);
        }
      }, 120);
      // Характеристики підставляться, коли відмалюється крок 3.
      pendingSpecs = {};
      Object.keys(f).forEach(function (k) { if (k.indexOf('new-') !== 0) pendingSpecs[k] = f[k]; });
      // Фото з IndexedDB
      if (typeof _idbGet === 'function') _idbGet(DRAFT_PHOTOS, 30 * 86400000, function (blobs) {
        if (blobs && blobs.length && typeof uploadedPhotos !== 'undefined' && !uploadedPhotos.length) {
          blobs.slice(0, 10).forEach(function (bl) {
            if (bl) uploadedPhotos.push({ blob: bl, preview: URL.createObjectURL(bl), uploaded: false, storageUrl: null });
          });
          window.uploadedPhotos = uploadedPhotos;
          if (typeof renderPhotoGrid === 'function') renderPhotoGrid();
        }
      });
      setTimeout(function () { restoring = false; toast('📝 Чернетку відновлено'); }, 700);
    }, 80);
  };

  // Крок 3 перемальовує поля характеристик при кожному заході — раніше
  // введені значення (і при редагуванні теж) губились. Зберігаємо їх.
  var lastSpecCat = null;
  (function () {
    var orig = window.renderSpecFields;
    if (typeof orig !== 'function') return;
    window.renderSpecFields = function () {
      var keep = {};
      var form = $('add-specs-form');
      var cat = typeof addSelectedCat !== 'undefined' ? addSelectedCat : null;
      if (form && cat === lastSpecCat) {
        form.querySelectorAll('input[id], select[id]').forEach(function (el) { if (el.value) keep[el.id] = el.value; });
      }
      var r = orig.apply(this, arguments);
      lastSpecCat = cat;
      if (pendingSpecs) { Object.assign(keep, pendingSpecs); pendingSpecs = null; }
      Object.keys(keep).forEach(function (id) {
        var el = $(id);
        if (el && el.closest('#add-specs-form')) el.value = keep[id];
      });
      return r;
    };
  })();

  // Показати пропозицію відновити чернетку, коли відкривається сторінка «Подати»
  (function () {
    var page = $('page-add');
    if (!page || !window.MutationObserver) return;
    new MutationObserver(function () {
      if (page.classList.contains('active')) setTimeout(offerDraft, 250);
    }).observe(page, { attributes: true, attributeFilter: ['class'] });
    if (page.classList.contains('active')) setTimeout(offerDraft, 800);
  })();

  // ══ 5. ЯКІСТЬ ОГОЛОШЕННЯ ════════════════════════════════════
  function quality() {
    var photos = (window.uploadedPhotos || []).length;
    var desc = fval('new-desc');
    var title = fval('new-title');
    var specs = 0;
    var form = $('add-specs-form');
    if (form) form.querySelectorAll('input, select').forEach(function (el) {
      if (el.tagName === 'SELECT' ? el.selectedIndex > 0 : String(el.value).trim()) specs++;
    });
    var cond = fval('new-condition');
    var checks = [
      { ok: photos >= 3, w: 30, tip: photos ? 'Додайте ще ' + (3 - photos) + ' ' + pl(3 - photos, ['фото', 'фото', 'фото']) + ' — з різних боків і крупно дисплей/пробіг' : 'Додайте фото — без них оголошення майже не переглядають' },
      { ok: photos >= 5, w: 10, tip: 'Оголошення з 5+ фото отримують помітно більше повідомлень', soft: true },
      { ok: desc.length >= 80, w: 20, tip: desc ? 'Опишіть детальніше (зараз ' + desc.length + ' символів): стан, комплектація, причина продажу' : 'Додайте опис: стан, комплектація, чи є документи, причина продажу' },
      { ok: specs >= 3, w: 20, tip: 'Заповніть характеристики на кроці 3 — за ними фільтрують покупці' },
      { ok: !!fval('new-year'), w: 5, tip: 'Вкажіть рік випуску' },
      { ok: cond === 'Новий' || !!fval('new-mileage'), w: 5, tip: 'Вкажіть пробіг' },
      { ok: title.length >= 12, w: 10, tip: 'Зробіть назву конкретнішою: бренд, модель, ключова характеристика' }
    ];
    var score = 0;
    checks.forEach(function (c) { if (c.ok) score += c.w; });
    return { score: score, tips: checks.filter(function (c) { return !c.ok; }) };
  }
  function renderQuality() {
    var sum = $('add-preview-summary');
    if (!sum) return;
    var box = $('ux-quality');
    if (!box) {
      box = document.createElement('div');
      box.id = 'ux-quality';
      box.className = 'form-card ux-quality';
      var card = sum.closest('.form-card');
      card.parentNode.insertBefore(box, card);
    }
    var q = quality();
    var color = q.score >= 80 ? 'var(--brand)' : q.score >= 50 ? '#f59e0b' : '#ef4444';
    var word = q.score >= 80 ? 'Чудово' : q.score >= 50 ? 'Непогано' : 'Слабко';
    box.innerHTML = '<div class="ux-q-head"><span>Якість оголошення</span><b style="color:' + color + '">' + word + ' · ' + q.score + '%</b></div>' +
      '<div class="ux-q-bar"><i style="width:' + q.score + '%;background:' + color + '"></i></div>' +
      (q.tips.length
        ? '<ul class="ux-q-tips">' + q.tips.slice(0, 4).map(function (t) { return '<li' + (t.soft ? ' class="soft"' : '') + '>' + esc(t.tip) + '</li>'; }).join('') + '</ul>'
        : '<div class="ux-muted" style="margin-top:8px">Оголошення заповнене повністю — так його швидше знайдуть.</div>');
  }
  wrap('buildPreviewSummary', renderQuality);
  wrap('renderPhotoGrid', function () { if ($('ux-quality')) renderQuality(); saveDraft(); });
  wrap('removePhoto', function () { saveDraft(); });

  // ══ 6. ПІДНЯТИ ОГОЛОШЕННЯ ═══════════════════════════════════
  var BUMP_DAYS = 7;
  window._uxBumpLeft = function (l) {
    var last = Math.max(sec(l.bumpedAt), sec(l.createdAt));
    if (!last) return 0;
    var left = last + BUMP_DAYS * 86400 - Date.now() / 1000;
    return left > 0 ? Math.ceil(left / 86400) : 0;
  };
  window.bumpListing = function (id) {
    var l = findListing(id);
    if (!l || !db()) return;
    var left = window._uxBumpLeft(l);
    if (left) { toast('⏳ Підняти знову можна через ' + left + ' ' + pl(left, ['день', 'дні', 'днів'])); return; }
    db().collection('listings').doc(id).update({ bumpedAt: FV().serverTimestamp() }).then(function () {
      var now = { seconds: Math.floor(Date.now() / 1000) };
      listings().forEach(function (x) { if (x && x.id === id) x.bumpedAt = now; });
      if (typeof _idbSet === 'function' && typeof _fbListings !== 'undefined') _idbSet('listings', _fbListings);
      if (typeof renderMyListings === 'function') renderMyListings();
      if (typeof renderHomeListings === 'function') renderHomeListings();
      toast('⬆️ Оголошення піднято на початок списку');
    }).catch(function (e) { toast('⚠️ Не вдалося підняти: ' + e.message); });
  };

  // ══ 7. БЕЗПЕКА В ЧАТІ ═══════════════════════════════════════
  var RISK = [
    /перед\s*опл|предопл|аванс|завдат|задат/i,
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/,
    /номер\w*\s+карт|на\s+карт[уик]|скин\w*\s+(гроші|кошти|на)|перека[зж]\w*\s+(гроші|кошти|на)/i,
    /https?:\/\/|www\.|t\.me\/|bit\.ly|\b[a-z0-9-]+\.(com|net|org|site|online|shop|xyz|top|link|info|pro|store)\b/i,
    /олх\s*доставк|olx\s*(доставк|delivery)|безпечн\w*\s*(угод|доставк|оплат)|отримати\s*(кошти|оплату|гроші)|посиланн\w*\s*(для|на)\s*оплат/i,
    /cvv|cvc|термін\s+дії|код\s+(з|із)\s+смс|пін[\s-]?код/i
  ];
  function risky(t) { return RISK.some(function (re) { return re.test(t); }); }

  wrap('_renderMessages', function (r, msgs) {
    var area = $('messages-area');
    if (!area) return;
    if (msgs && msgs.length && !area.querySelector('.ux-chat-tip')) {
      var tip = document.createElement('div');
      tip.className = 'ux-chat-tip';
      tip.innerHTML = '<i class="fa-solid fa-shield-halved"></i> Оглядайте товар і платіть при зустрічі. Не робіть передоплату і не вводьте дані картки за посиланнями — RideGO не має «безпечної доставки» чи оплати через сайт.';
      area.insertBefore(tip, area.firstChild);
    }
    area.querySelectorAll('.msg.theirs .msg-bubble').forEach(function (b) {
      if (b.classList.contains('exchange-card') || !risky(b.textContent || '')) return;
      var warn = document.createElement('div');
      warn.className = 'ux-chat-warn';
      warn.innerHTML = '⚠️ Схоже на прохання про передоплату або посилання. Будьте обережні. <button onclick="_uxReportChat()">Поскаржитись</button>';
      b.parentNode.insertBefore(warn, b.nextSibling);
    });
    if (area.scrollHeight) area.scrollTop = area.scrollHeight;
    addReportBtn();
  });

  function addReportBtn() {
    var h = $('chat-header');
    if (!h || $('ux-chat-report')) return;
    var b = document.createElement('button');
    b.id = 'ux-chat-report';
    b.className = 'ux-icon-btn';
    b.title = 'Поскаржитись на співрозмовника';
    b.innerHTML = '<i class="fa-solid fa-flag"></i>';
    b.onclick = function () { window._uxReportChat(); };
    h.appendChild(b);
  }

  window._uxReportChat = function () {
    var u = me();
    if (!u || typeof _activeChatId === 'undefined' || !_activeChatId) return;
    var chat = (typeof _fbChats !== 'undefined' ? _fbChats : []).filter(function (c) { return c.id === _activeChatId; })[0] || {};
    var other = (chat.participants || []).filter(function (p) { return p !== u.uid; })[0] || '';
    var old = $('ux-report-modal'); if (old) old.remove();
    var m = document.createElement('div');
    m.id = 'ux-report-modal';
    m.className = 'ux-modal';
    var reasons = [['fraud', 'Шахрайство, просить передоплату'], ['rude', 'Образи чи погрози'], ['spam', 'Спам або реклама'], ['other', 'Інше']];
    m.innerHTML = '<div class="ux-modal-box"><h3>Поскаржитись на співрозмовника</h3>' +
      reasons.map(function (x, i) { return '<label class="ux-radio"><input type="radio" name="ux-rr" value="' + x[0] + '"' + (i ? '' : ' checked') + '> ' + x[1] + '</label>'; }).join('') +
      '<textarea id="ux-rr-text" class="form-input" rows="3" placeholder="Що сталося? (необов\'язково)"></textarea>' +
      '<div class="ux-modal-acts"><button class="btn-outline" onclick="this.closest(\'.ux-modal\').remove()">Скасувати</button>' +
      '<button class="btn-primary" id="ux-rr-send">Надіслати</button></div></div>';
    m.addEventListener('click', function (e) { if (e.target === m) m.remove(); });
    document.body.appendChild(m);
    $('ux-rr-send').onclick = function () {
      var reason = (m.querySelector('input[name="ux-rr"]:checked') || {}).value || 'other';
      var label = reasons.filter(function (x) { return x[0] === reason; })[0][1];
      var theirs = [].slice.call(document.querySelectorAll('#messages-area .msg.theirs .msg-bubble'))
        .slice(-5).map(function (el) { return '— ' + (el.textContent || '').trim().slice(0, 200); }).join('\n');
      var text = ($('ux-rr-text').value || '').trim().slice(0, 1000);
      this.disabled = true;
      db().collection('feedback').add({
        type: 'complaint',
        subject: 'Скарга в чаті: ' + label,
        message: (text ? text + '\n\n' : '') + 'Останні повідомлення співрозмовника:\n' + (theirs || '—') +
          (chat.listingTitle ? '\n\nОголошення: ' + chat.listingTitle : ''),
        name: (typeof currentUser !== 'undefined' && currentUser.name) || '',
        email: u.email || '',
        img: null, status: 'new', adminReply: null,
        uid: u.uid, reportedUid: other, chatId: _activeChatId, listingId: chat.listingId || null,
        page: '/messages', userAgent: navigator.userAgent.slice(0, 200),
        createdAt: FV().serverTimestamp()
      }).then(function () {
        m.remove();
        toast('✅ Скаргу надіслано. Ми перевіримо цього користувача.');
      }).catch(function (e) { toast('⚠️ ' + e.message); });
    };
  };

  // ══ Кнопка «Назад» телефона/браузера у формі оголошення ══════
  // Раніше системне «назад» викидало з форми цілком. Тепер кожен крок —
  // окремий запис в історії, і «назад» повертає на попередній крок.
  var stepNav = false;
  (function () {
    var orig = window.addGoStep;
    if (typeof orig !== 'function') return;
    window.addGoStep = function (step) {
      var from = typeof addCurrentStep !== 'undefined' ? addCurrentStep : 1;
      var r = orig.apply(this, arguments);
      var to = typeof addCurrentStep !== 'undefined' ? addCurrentStep : from;
      if (!stepNav && to > from) {
        try { history.pushState({ addStep: to }, '', location.pathname + location.search); } catch (e) {}
      }
      return r;
    };
  })();
  window.addEventListener('popstate', function (e) {
    var page = $('page-add');
    if (!page || typeof addCurrentStep === 'undefined') return;
    var target = (e.state && e.state.addStep) || 1;
    setTimeout(function () {
      if (!page.classList.contains('active') || addCurrentStep <= target) return;
      stepNav = true;
      try { window.addGoStep(target); } finally { stepNav = false; }
    }, 30);
  });

  // ══ 8. ПАНЕЛЬ «ПОДЗВОНИТИ / НАПИСАТИ» НА ТЕЛЕФОНІ ═══════════
  // На сторінці оголошення кнопки зв'язку були лише в середині сторінки —
  // після галереї й опису їх доводилось шукати. Тепер вони завжди під рукою.
  function contactBar() {
    var bar = $('ux-contact-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'ux-contact-bar';
      bar.innerHTML = '<div class="ux-cb-price" id="ux-cb-price"></div>' +
        '<button class="ux-cb-btn ux-cb-call" onclick="_uxCallSeller()"><i class="fa-solid fa-phone"></i> Подзвонити</button>' +
        '<button class="ux-cb-btn ux-cb-msg" onclick="_startChatFromListing()"><i class="fa-solid fa-comment"></i> Написати</button>';
      document.body.appendChild(bar);
    }
    return bar;
  }
  function updateContactBar() {
    var page = $('page-detail');
    var l = window.currentDetailId ? findListing(window.currentDetailId) : null;
    var own = l && me() && l.uid === me().uid;
    var show = !!(page && page.classList.contains('active') && l && !own && l.status !== 'sold' && window.innerWidth <= 768);
    var bar = show ? contactBar() : $('ux-contact-bar');
    if (!bar) return;
    bar.classList.toggle('show', show);
    document.body.classList.toggle('ux-has-cb', show);
    if (show) $('ux-cb-price').textContent = fmtN(l.price) + ' грн';
  }
  window._uxCallSeller = function () {
    var a = $('phone-number'), rev = $('phone-revealed');
    if (rev && rev.style.display !== 'none' && a && /^tel:\+?\d{7,}/.test(a.getAttribute('href') || '')) { location.href = a.getAttribute('href'); return; }
    if (typeof revealPhone === 'function') revealPhone();
    var tries = 0, t = setInterval(function () {
      tries++;
      var r = $('phone-revealed'), n = $('phone-number');
      if (r && r.style.display !== 'none' && n) {
        clearInterval(t);
        r.scrollIntoView({ behavior: 'smooth', block: 'center' });
        location.href = n.getAttribute('href');
      } else if (tries > 20) clearInterval(t);
    }, 150);
  };
  wrap('showDetail', function () { setTimeout(updateContactBar, 50); });
  (function () {
    var page = $('page-detail');
    if (page && window.MutationObserver) new MutationObserver(updateContactBar).observe(page, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('resize', updateContactBar);
  })();

  // ══ 9. ЕКРАН «ОГОЛОШЕННЯ ОПУБЛІКОВАНО» ══════════════════════
  // Раніше одразу після публікації на весь екран відкривалось вікно
  // платного просування. Тепер — спокійне підтвердження з вибором дій.
  window._uxPublished = function (l) {
    if (!l || !l.id) return;
    var old = $('ux-pub-modal'); if (old) old.remove();
    var m = document.createElement('div');
    m.id = 'ux-pub-modal';
    m.className = 'ux-modal';
    var id = esc(l.id);
    m.innerHTML = '<div class="ux-modal-box ux-pub">' +
      '<div class="ux-pub-ico"><i class="fa-solid fa-check"></i></div>' +
      '<h3>Оголошення опубліковано</h3>' +
      '<p class="ux-muted">«' + esc(l.title) + '» вже бачать покупці. Фото завантажуються у фоні.</p>' +
      '<div class="ux-pub-acts">' +
        '<button class="btn-primary" onclick="document.getElementById(\'ux-pub-modal\').remove();showDetail(\'' + id + '\')"><i class="fa-solid fa-eye"></i> Переглянути</button>' +
        '<button class="btn-outline" onclick="document.getElementById(\'ux-pub-modal\').remove();showDetail(\'' + id + '\');setTimeout(function(){shareListing()},600)"><i class="fa-solid fa-share-nodes"></i> Поділитись</button>' +
        '<button class="btn-outline" onclick="document.getElementById(\'ux-pub-modal\').remove();openPromoModal(\'' + id + '\', false)"><i class="fa-solid fa-rocket"></i> Просувати в ТОП</button>' +
        '<button class="ux-link" onclick="document.getElementById(\'ux-pub-modal\').remove()">Подати ще одне</button>' +
      '</div></div>';
    m.addEventListener('click', function (e) { if (e.target === m) m.remove(); });
    document.body.appendChild(m);
  };

  // ══ 10. ФІЛЬТРИ ШТОРКОЮ ЗНИЗУ НА ТЕЛЕФОНІ ════════════════════
  // На телефоні панель фільтрів розгорталась посеред сторінки довгим
  // полотном. Тепер вона відкривається шторкою знизу, а кнопка
  // «Показати оголошення» завжди видна внизу шторки.
  function isMobile() { return window.innerWidth <= 768; }
  function closeSheet() {
    document.body.classList.remove('ux-fp-sheet');
    var b = $('fp-body'); if (b && isMobile()) b.style.display = 'none';
    var ov = $('ux-fp-overlay'); if (ov) ov.remove();
  }
  function openSheet() {
    document.body.classList.add('ux-fp-sheet');
    if (!$('ux-fp-overlay')) {
      var ov = document.createElement('div');
      ov.id = 'ux-fp-overlay';
      ov.onclick = closeSheet;
      document.body.appendChild(ov);
    }
    var body = $('fp-body');
    if (body && !$('ux-fp-sheet-head')) {
      var h = document.createElement('div');
      h.id = 'ux-fp-sheet-head';
      h.innerHTML = '<b>Фільтри</b><button type="button" aria-label="Закрити" onclick="event.stopPropagation();_uxCloseFilters()"><i class="fa-solid fa-xmark"></i></button>';
      body.insertBefore(h, body.firstChild);
    }
  }
  window._uxCloseFilters = closeSheet;
  wrap('_toggleFilterPanel', function () {
    if (!isMobile()) return;
    var b = $('fp-body');
    if (b && b.style.display !== 'none') openSheet(); else closeSheet();
  });
  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('.fp-search-btn') && document.body.classList.contains('ux-fp-sheet')) setTimeout(closeSheet, 0);
  }, true);
  wrap('showPage', function () { if (document.body.classList.contains('ux-fp-sheet')) closeSheet(); });

  // ══ 11. ПІДКАЗКИ В ПОШУКУ ═══════════════════════════════════
  // Раніше кожна літера в рядку пошуку одразу перекидала на каталог.
  // Тепер під рядком з'являються підказки (моделі, бренди, міста),
  // а пошук запускається по Enter або по кліку на підказку.
  var sugBox = null, sugInput = null, sugTimer = null;
  function sugHide() { if (sugBox) sugBox.style.display = 'none'; }
  function buildSuggestions(q) {
    q = norm(q);
    if (q.length < 2) return [];
    var out = [], seen = {};
    function add(type, text, action, extra) {
      var k = type + '|' + norm(text);
      if (seen[k] || out.length >= 8) return; seen[k] = 1;
      out.push({ type: type, text: text, action: action, extra: extra || '' });
    }
    var ls = listings().filter(function (l) { return l && l.status !== 'deleted' && l.status !== 'sold'; });
    // Спершу бренди й міста (по 2), далі конкретні оголошення
    var brands = {};
    if (typeof BRANDS !== 'undefined') Object.keys(BRANDS).forEach(function (c) { (BRANDS[c] || []).forEach(function (b) { brands[b.replace(/\s*\(.*\)$/, '')] = 1; }); });
    Object.keys(brands).filter(function (b) { return norm(b).indexOf(q) === 0; }).slice(0, 2).forEach(function (b) { add('brand', b, 'q:' + b); });
    var cities = {};
    ls.forEach(function (l) { if (l.city) cities[String(l.city).split(',')[0].trim()] = 1; });
    Object.keys(cities).filter(function (c) { return norm(c).indexOf(q) === 0; }).slice(0, 2).forEach(function (c) { add('city', c, 'q:' + c); });
    ls.forEach(function (l) {
      if (norm(l.title).indexOf(q) > -1) add('listing', l.title, 'l:' + l.id, fmtN(l.price) + ' грн');
    });
    return out.slice(0, 7);
  }
  function sugRender(input) {
    var items = buildSuggestions(input.value);
    if (!sugBox) {
      sugBox = document.createElement('div');
      sugBox.id = 'ux-suggest';
      sugBox.addEventListener('mousedown', function (e) { e.preventDefault(); });
      sugBox.addEventListener('click', function (e) {
        var it = e.target.closest('[data-act]'); if (!it) return;
        var a = it.getAttribute('data-act');
        sugHide();
        if (a.indexOf('l:') === 0) { if (typeof showDetail === 'function') showDetail(a.slice(2)); }
        else { var q = a.slice(2); if (sugInput) sugInput.value = q; if (typeof doSearch === 'function') doSearch(q); }
      });
      document.body.appendChild(sugBox);
    }
    if (!items.length) { sugHide(); return; }
    var icons = { listing: 'fa-bolt', brand: 'fa-tag', city: 'fa-location-dot' };
    sugBox.innerHTML = items.map(function (it) {
      return '<div class="ux-sug" data-act="' + esc(it.action) + '"><i class="fa-solid ' + icons[it.type] + '"></i><span>' + esc(it.text) + '</span>' +
        (it.extra ? '<small>' + esc(it.extra) + '</small>' : '') + '</div>';
    }).join('') + '<div class="ux-sug ux-sug-all" data-act="q:' + esc(input.value.trim()) + '"><i class="fa-solid fa-magnifying-glass"></i><span>Шукати «' + esc(input.value.trim()) + '»</span></div>';
    var r = input.getBoundingClientRect();
    sugBox.style.left = Math.max(8, r.left) + 'px';
    sugBox.style.top = (r.bottom + 6) + 'px';
    sugBox.style.width = Math.min(Math.max(r.width, 280), window.innerWidth - 16) + 'px';
    sugBox.style.display = 'block';
  }
  (function () {
    var orig = window.handleSearch;
    if (typeof orig !== 'function') return;
    window.handleSearch = function (query, immediate) {
      var input = document.activeElement && /headerSearch/.test(document.activeElement.id) ? document.activeElement : null;
      if (immediate) { sugHide(); return orig.apply(this, arguments); }
      if (!input) return orig.apply(this, arguments);
      sugInput = input;
      clearTimeout(sugTimer);
      sugTimer = setTimeout(function () { sugRender(input); }, 120);
    };
    ['headerSearch', 'headerSearchMobile', 'headerSearchHero'].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.addEventListener('blur', function () { setTimeout(sugHide, 150); });
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { sugHide(); if (id === 'headerSearchMobile') window.handleSearch(el.value, true); }
        if (e.key === 'Escape') sugHide();
      });
    });
    window.addEventListener('scroll', sugHide, { passive: true });
  })();

  // ══ 12. ХАРАКТЕРИСТИКИ: СПОЧАТКУ ГОЛОВНЕ ═══════════════════════
  wrap('buildSpecTable', function () {
    var el = $('detail-specs-full');
    if (!el) return;
    var rows = el.querySelectorAll('.spec-table tr');
    if (rows.length <= 8) return;
    el.classList.add('ux-specs-collapsed');
    for (var i = 8; i < rows.length; i++) rows[i].classList.add('ux-spec-more');
    el.querySelectorAll('.spec-section').forEach(function (sec) {
      if (!sec.querySelector('.spec-table tr:not(.ux-spec-more)')) sec.classList.add('ux-spec-more');
    });
    var btn = document.createElement('button');
    btn.className = 'ux-specs-toggle';
    btn.textContent = 'Усі характеристики (' + rows.length + ')';
    btn.onclick = function () {
      var c = el.classList.toggle('ux-specs-collapsed');
      btn.textContent = c ? 'Усі характеристики (' + rows.length + ')' : 'Згорнути';
    };
    el.appendChild(btn);
  });

  // ══ 13. ЧАТ НА ТЕЛЕФОНІ НА ВЕСЬ ЕКРАН ═══════════════════════
  // Коли відкрита переписка, нижнє меню ховаємо: поле вводу не
  // затискається між меню і клавіатурою, а повідомленням більше місця.
  function syncChatMode() {
    var lay = $('messages-layout'), page = $('page-messages');
    var on = !!(lay && page && page.classList.contains('active') && lay.classList.contains('chat-open') && window.innerWidth <= 700);
    document.body.classList.toggle('ux-chat-full', on);
  }
  (function () {
    var lay = $('messages-layout'), page = $('page-messages');
    if (!window.MutationObserver) return;
    if (lay) new MutationObserver(syncChatMode).observe(lay, { attributes: true, attributeFilter: ['class'] });
    if (page) new MutationObserver(syncChatMode).observe(page, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('resize', syncChatMode);
  })();


  // ══ 14. ФОТО ОГОЛОШЕННЯ НА ТЕЛЕФОНІ ════════════════════════
  // На телефоні фото йде першим (як на OLX), з лічильником «2 / 7»;
  // стрілки й мініатюри ховаємо, коли фото лише одне.
  function galleryTitleRow() {
    var t = $('detail-title');
    return t && t.parentElement && t.parentElement.parentElement;
  }
  function placeGallery() {
    var g = $('detail-gallery-wrap'), th = $('detail-thumbs'), row = galleryTitleRow();
    if (!g || !row || !row.parentElement) return;
    if (!g._uxHome) { g._uxHome = document.createComment('gallery'); g.parentElement.insertBefore(g._uxHome, g); }
    var mobile = window.innerWidth <= 700;
    if (mobile && g.parentElement !== row.parentElement) {
      row.parentElement.insertBefore(g, row);
      if (th) row.parentElement.insertBefore(th, row);
      g.classList.add('ux-gal-top');
    } else if (!mobile && g.parentElement === row.parentElement) {
      var home = g._uxHome;
      home.parentElement.insertBefore(g, home.nextSibling);
      if (th) home.parentElement.insertBefore(th, g.nextSibling);
      g.classList.remove('ux-gal-top');
    }
  }
  function galleryCounter() {
    var g = $('detail-gallery-wrap');
    if (!g) return;
    var n = (window.galleryImgs || []).length, i = (window.galleryIdx || 0) + 1;
    g.classList.toggle('ux-one-photo', n <= 1);
    var th = $('detail-thumbs');
    if (th) th.classList.toggle('ux-one-photo', n <= 1);
    var c = $('ux-gal-count');
    if (!c) { c = document.createElement('div'); c.id = 'ux-gal-count'; g.appendChild(c); }
    c.textContent = i + ' / ' + n;
    c.style.display = n > 1 ? '' : 'none';
  }
  wrap('showDetail', function () { placeGallery(); galleryCounter(); });
  wrap('galleryNav', galleryCounter);
  wrap('setGalleryIdx', galleryCounter);
  window.addEventListener('resize', placeGallery);



  // ══ 16. ТЕКСТОВИЙ ПОШУК У КАТАЛОЗІ ══════════════════════════
  // Раніше doSearch малював результати поверх каталогу, а за мить
  // каталог перемальовувався і показував усі оголошення. Тепер запит —
  // це звичайний фільтр каталогу: працює разом з категорією, сортуванням
  // і фільтрами, і його видно чипом «Пошук: …  ✕».
  var catQuery = '', fromSearch = false;
  function qNorm(v) { return String(v || '').toLowerCase().replace(/ё/g, 'е'); }
  function matchQuery(l, words) {
    var hay = qNorm([l.title, l.brand, l.model, l.cat, l.city, l.fullLoc, l.seller, l.sellerName, l.desc].join(' '));
    return words.every(function (w) { return hay.indexOf(w) > -1; });
  }
  (function () {
    var orig = window.getFilteredData;
    if (typeof orig !== 'function') return;
    window.getFilteredData = function () {
      var data = orig.apply(this, arguments);
      if (!catQuery) return data;
      var words = qNorm(catQuery).split(/\s+/).filter(Boolean);
      return (data || []).filter(function (l) { return matchQuery(l, words); });
    };
  })();
  function renderQueryUi() {
    var h1 = document.querySelector('#page-catalog .catalog-hero h1');
    if (h1) {
      if (!h1._uxOrig) h1._uxOrig = h1.innerHTML;
      if (catQuery) h1.innerHTML = 'Пошук: <span>' + esc(catQuery) + '</span>';
      else h1.innerHTML = h1._uxOrig;
    }
    var lbl = $('results-cat-label');
    var chip = $('ux-query-chip');
    if (catQuery) {
      if (!chip && lbl) {
        chip = document.createElement('button');
        chip.id = 'ux-query-chip'; chip.type = 'button';
        chip.onclick = function () { window._uxClearQuery(); };
        lbl.parentElement.insertBefore(chip, lbl.nextSibling);
      }
      if (chip) chip.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i>«' + esc(catQuery) + '»<b>✕</b>';
    } else if (chip) chip.remove();
  }
  window._uxClearQuery = function () {
    catQuery = '';
    ['headerSearch', 'headerSearchMobile', 'headerSearchHero'].forEach(function (id) { var e = $(id); if (e) e.value = ''; });
    renderQueryUi();
    if (typeof runSearch === 'function') runSearch();
  };
  window.doSearch = function (query) {
    query = String(query || '').trim();
    if (!query) return;
    catQuery = query;
    if (typeof sugHide === 'function') sugHide();
    fromSearch = true;
    var onCatalog = $('page-catalog') && $('page-catalog').classList.contains('active');
    if (!onCatalog) showPage('catalog');
    fromSearch = false;
    setTimeout(function () { renderQueryUi(); if (typeof runSearch === 'function') runSearch(); }, onCatalog ? 0 : 200);
  };
  // Перехід у каталог з меню чи категорії без пошуку — скидаємо запит
  wrap('showPage', function (r, page) {
    if (page === 'catalog' && !fromSearch && catQuery) { catQuery = ''; renderQueryUi(); }
  });
  wrap('runSearch', function () { renderQueryUi(); });
  wrap('clearFilters', function () { if (catQuery) window._uxClearQuery(); });


  // ══ 17. ПОРІВНЯННЯ ОГОЛОШЕНЬ ════════════════════════════════
  // До 4 оголошень поруч: ціна, стан, АКБ, швидкість, запас ходу…
  // Найкраще значення в рядку підсвічується. Список живе в браузері.
  var CMP_KEY = 'ridego_cmp', CMP_MAX = 4, cmpCache = {};
  function cmpIds() { return lsGet(CMP_KEY, []).filter(function (x) { return typeof x === 'string'; }).slice(0, CMP_MAX); }
  function cmpSet(a) { lsSet(CMP_KEY, a.slice(0, CMP_MAX)); renderCmpBar(); syncCmpBtn(); }
  function cmpHas(id) { return cmpIds().indexOf(id) > -1; }
  window._uxCmpToggle = function (id) {
    id = id || window.currentDetailId; if (!id) return;
    var a = cmpIds();
    if (a.indexOf(id) > -1) { a = a.filter(function (x) { return x !== id; }); cmpSet(a); toast('Прибрано з порівняння'); return; }
    if (a.length >= CMP_MAX) { toast('У порівнянні вже ' + CMP_MAX + ' оголошення — приберіть одне'); window._uxCmpOpen(); return; }
    var l = findListing(id); if (l) cmpCache[id] = l;
    a.push(id); cmpSet(a);
    toast(a.length > 1 ? 'Додано до порівняння (' + a.length + ')' : 'Додано. Відкрийте інше оголошення і теж натисніть «Порівняти»');
  };
  function syncCmpBtn() {
    var b = $('ux-cmp-btn'); if (!b) return;
    var on = cmpHas(window.currentDetailId);
    b.classList.toggle('on', on);
    b.innerHTML = '<i class="fa-solid ' + (on ? 'fa-check' : 'fa-scale-balanced') + '" style="margin-right:8px"></i>' + (on ? 'У порівнянні' : 'Порівняти');
  }
  wrap('showDetail', function () {
    var fav = $('fav-detail-btn');
    if (fav && !$('ux-cmp-btn')) {
      var b = document.createElement('button');
      b.id = 'ux-cmp-btn'; b.className = 'btn-msg ux-cmp-btn';
      b.onclick = function () { window._uxCmpToggle(); };
      fav.parentElement.insertBefore(b, fav.nextSibling);
    }
    syncCmpBtn(); renderCmpBar();
  });
  function renderCmpBar() {
    var a = cmpIds(), bar = $('ux-cmp-bar');
    if (!a.length) { if (bar) bar.classList.remove('show'); document.body.classList.remove('ux-has-cmp'); return; }
    if (!bar) {
      bar = document.createElement('div'); bar.id = 'ux-cmp-bar';
      bar.innerHTML = '<button class="ux-cmp-open" onclick="_uxCmpOpen()"><i class="fa-solid fa-scale-balanced"></i><span>Порівняння</span><b id="ux-cmp-n"></b></button><button class="ux-cmp-x" onclick="_uxCmpClear()" aria-label="Очистити порівняння">✕</button>';
      document.body.appendChild(bar);
    }
    $('ux-cmp-n').textContent = a.length;
    bar.classList.add('show'); document.body.classList.add('ux-has-cmp');
  }
  window._uxCmpClear = function () { cmpSet([]); var m = $('ux-cmp-modal'); if (m) m.remove(); };

  function num(v) { var m = String(v == null ? '' : v).replace(',', '.').match(/\d+(\.\d+)?/); return m ? parseFloat(m[0]) : NaN; }
  function cmpRows(l) {
    var r = {};
    function put(k, v) { v = v == null ? '' : String(v).trim(); if (v && v !== '—' && v !== 'Не вказано' && v !== 'undefined') r[k] = v; }
    put('Ціна', l.price ? fmtN(l.price) + ' грн' : '');
    put('Місто', l.city);
    put('Стан', l.condition);
    put('Рік випуску', l.year);
    put('Пробіг', l.mileage ? fmtN(l.mileage) + ' км' : '');
    put('АКБ', l.battery || (l.battAh ? l.battAh + ' Ah' : ''));
    put('Макс. швидкість', l.speed || (l.speedVal ? l.speedVal + ' км/год' : ''));
    put('Запас ходу', l.range || (l.rangeVal ? l.rangeVal + ' км' : ''));
    put('Потужність', l.motorW ? l.motorW + ' Вт' : '');
    put('Вага', l.weight || (l.weightVal ? l.weightVal + ' кг' : ''));
    var sp = l.specs && typeof _convertSpecs === 'function' ? _convertSpecs(l.specs) : null;
    if (sp) Object.keys(sp).forEach(function (sec) {
      (Array.isArray(sp[sec]) ? sp[sec] : []).forEach(function (row) { if (Array.isArray(row) && !r[row[0]]) put(row[0], row[1]); });
    });
    return r;
  }
  var BEST = { 'Ціна': 'min', 'Пробіг': 'min', 'Вага': 'min', 'АКБ': 'max', 'Макс. швидкість': 'max', 'Запас ходу': 'max', 'Потужність': 'max', 'Рік випуску': 'max' };
  function bestRule(k) { if (BEST[k]) return BEST[k]; var q = k.toLowerCase(); if (/запас|швидк|потужн|ємн|напруг/.test(q)) return 'max'; if (/вага|час заряд/.test(q)) return 'min'; return ''; }

  function loadCmp(ids) {
    return Promise.all(ids.map(function (id) {
      var l = findListing(id) || cmpCache[id];
      if (l) return Promise.resolve(l);
      if (!db()) return Promise.resolve(null);
      return db().collection('listings').doc(id).get().then(function (d) {
        if (!d.exists) return null; var x = Object.assign({ id: d.id }, d.data()); cmpCache[id] = x; return x;
      }).catch(function () { return null; });
    }));
  }
  window._uxCmpOpen = function () {
    var ids = cmpIds(); if (!ids.length) return;
    var m = $('ux-cmp-modal');
    if (!m) {
      m = document.createElement('div'); m.id = 'ux-cmp-modal';
      m.addEventListener('click', function (e) { if (e.target === m) m.remove(); });
      document.body.appendChild(m);
    }
    m.innerHTML = '<div class="ux-cmp-box"><div class="ux-cmp-loading"><i class="fa-solid fa-spinner fa-spin"></i></div></div>';
    loadCmp(ids).then(function (ls) {
      var gone = ids.filter(function (id, i) { return !ls[i]; });
      if (gone.length) cmpSet(ids.filter(function (id) { return gone.indexOf(id) < 0; }));
      ls = ls.filter(Boolean);
      if (!ls.length) { m.remove(); return; }
      drawCmp(m, ls, m._onlyDiff);
    });
  };
  function drawCmp(m, ls, onlyDiff) {
    var rows = ls.map(cmpRows), keys = [];
    rows.forEach(function (r) { Object.keys(r).forEach(function (k) { if (keys.indexOf(k) < 0) keys.push(k); }); });
    // рядки, які є хоча б у двох оголошень, — вище; «самотні» — нижче
    var base = ['Ціна', 'Місто', 'Стан', 'Рік випуску', 'Пробіг', 'АКБ', 'Макс. швидкість', 'Запас ходу', 'Потужність', 'Вага'];
    keys.sort(function (a, b) {
      var ia = base.indexOf(a), ib = base.indexOf(b);
      if (ia > -1 || ib > -1) return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      var ca = rows.filter(function (r) { return r[a]; }).length, cb = rows.filter(function (r) { return r[b]; }).length;
      return cb - ca;
    });
    var cats = {}; ls.forEach(function (l) { cats[l.cat] = 1; });
    var head = ls.map(function (l) {
      var img = (l.imgs && l.imgs[0]) || l.img || '';
      img = typeof _cdnImg === 'function' && img ? _cdnImg(img, { w: 400 }) : img;
      return '<th><div class="ux-cmp-card">' +
        '<button class="ux-cmp-rm" onclick="_uxCmpToggle(\'' + esc(l.id) + '\');_uxCmpOpen()" aria-label="Прибрати">✕</button>' +
        '<a onclick="document.getElementById(\'ux-cmp-modal\').remove();showDetail(\'' + esc(l.id) + '\')">' +
        (img ? '<img src="' + esc(img) + '" alt="" loading="lazy">' : '<span class="ux-cmp-ph">' + esc(l.icon || '📦') + '</span>') +
        '<span class="ux-cmp-title">' + esc(l.title) + '</span></a>' +
        '<span class="ux-cmp-price">' + (l.price ? fmtN(l.price) + ' грн' : '') + '</span></div></th>';
    }).join('');
    var body = keys.filter(function (k) { return k !== 'Ціна'; }).map(function (k) {
      var vals = rows.map(function (r) { return r[k] || ''; });
      var filled = vals.filter(Boolean);
      var same = filled.length === vals.length && filled.every(function (v) { return v === filled[0]; });
      if (onlyDiff && (same || filled.length < 2)) return '';
      var rule = bestRule(k), best = null;
      if (rule && filled.length >= 2) {
        var ns = vals.map(num).filter(function (n) { return !isNaN(n); });
        if (ns.length >= 2) best = rule === 'max' ? Math.max.apply(null, ns) : Math.min.apply(null, ns);
        if (ns.length >= 2 && Math.max.apply(null, ns) === Math.min.apply(null, ns)) best = null;
      }
      return '<tr' + (same ? ' class="same"' : '') + '><td class="k">' + esc(k) + '</td>' + vals.map(function (v) {
        var b = best != null && v && num(v) === best;
        return '<td' + (b ? ' class="best"' : '') + '>' + (v ? esc(v) : '<span class="nil">—</span>') + '</td>';
      }).join('') + '</tr>';
    }).join('');
    var priceRow = (function () {
      var ps = ls.map(function (l) { return +l.price || 0; }), valid = ps.filter(function (p) { return p > 0; });
      var min = valid.length >= 2 ? Math.min.apply(null, valid) : null;
      return '<tr class="price"><td class="k">Ціна</td>' + ls.map(function (l, i) { return '<td' + (min && ps[i] === min && Math.max.apply(null, valid) !== min ? ' class="best"' : '') + '>' + (ps[i] ? fmtN(ps[i]) + ' грн' : '—') + '</td>'; }).join('') + '</tr>';
    })();
    m._onlyDiff = !!onlyDiff;
    m.innerHTML = '<div class="ux-cmp-box" role="dialog" aria-label="Порівняння оголошень">' +
      '<div class="ux-cmp-top"><div><h3>Порівняння</h3><span>' + ls.length + ' з ' + CMP_MAX + (Object.keys(cats).length > 1 ? ' · різні категорії' : '') + '</span></div>' +
      '<label class="ux-cmp-diff"><input type="checkbox" ' + (onlyDiff ? 'checked' : '') + ' id="ux-cmp-diff"> Лише відмінності</label>' +
      '<button class="ux-cmp-close" onclick="document.getElementById(\'ux-cmp-modal\').remove()" aria-label="Закрити">✕</button></div>' +
      '<div class="ux-cmp-scroll"><table class="ux-cmp-table" style="--cols:' + ls.length + '"><thead><tr><th class="k"></th>' + head + '</tr></thead><tbody>' + priceRow + body + '</tbody></table></div>' +
      (ls.length < 2 ? '<p class="ux-cmp-hint">Відкрийте ще одне оголошення і натисніть «Порівняти», щоб побачити їх поруч.</p>' : '') +
      '</div>';
    var cb = $('ux-cmp-diff'); if (cb) cb.onchange = function () { drawCmp(m, ls, cb.checked); };
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { var m = $('ux-cmp-modal'); if (m) m.remove(); } });
  setTimeout(renderCmpBar, 800);


  // ══ 18. ШВИДКІ ВІДПОВІДІ В ЧАТІ ═════════════════════════════
  // Перше повідомлення — найважче. Кнопки з типовими питаннями
  // (покупцю) і відповідями (продавцю) над полем вводу.
  var QR_BUYER = ['Добрий день! Ще актуально?', 'Можливий торг?', 'Який реальний стан і пробіг?', 'Можна подивитись сьогодні?', 'Відправите Новою поштою?'];
  var QR_SELLER = ['Так, ще актуально', 'Торг можливий при огляді', 'Можна подивитись сьогодні', 'Відправлю Новою поштою з оплатою при отриманні'];
  function chatRole(chat) {
    var u = me(); if (!u || !chat) return 'buyer';
    var l = chat.listingId ? findListing(chat.listingId) : null;
    if (l && l.uid) return l.uid === u.uid ? 'seller' : 'buyer';
    return chat.participants && chat.participants[0] === u.uid ? 'buyer' : 'seller';
  }
  function renderQuick(msgs, chat) {
    var bar = document.querySelector('.chat-input-bar'); if (!bar) return;
    var box = $('ux-quick');
    if (!box) { box = document.createElement('div'); box.id = 'ux-quick'; bar.parentElement.insertBefore(box, bar); }
    var u = me(); if (!u || !chat) { box.style.display = 'none'; return; }
    var mine = msgs.filter(function (m) { return m && m.senderUid === u.uid; });
    var last = msgs[msgs.length - 1];
    var role = chatRole(chat);
    var show = role === 'buyer' ? (mine.length < 2 && msgs.length < 8) : (last && last.senderUid !== u.uid && mine.length < 3);
    var sent = {}; mine.forEach(function (m) { sent[m.text] = 1; });
    var list = (role === 'buyer' ? QR_BUYER : QR_SELLER).filter(function (t) { return !sent[t]; });
    if (!show || !list.length) { box.style.display = 'none'; box.innerHTML = ''; return; }
    box.innerHTML = list.map(function (t) { return '<button type="button" data-q="' + esc(t) + '">' + esc(t) + '</button>'; }).join('');
    box.style.display = '';
  }
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest && e.target.closest('#ux-quick [data-q]'); if (!b) return;
    var i = $('chat-input'); if (!i) return;
    i.value = b.getAttribute('data-q');
    if (typeof sendMessage === 'function') sendMessage();
  });

  // ══ 19. ВІДГУК ПІСЛЯ УГОДИ ══════════════════════════════════
  // Через 2 дні після початку переписки покупцю пропонуємо оцінити
  // продавця прямо в чаті: зірки + кілька слів.
  var revDone = {};
  function reviewedAlready(me_, other) {
    if (revDone[other] != null) return Promise.resolve(revDone[other]);
    if (window._reviewedSellers && window._reviewedSellers.has && window._reviewedSellers.has(other)) return Promise.resolve(revDone[other] = true);
    return db().collection('reviews').where('reviewerUid', '==', me_).where('sellerUid', '==', other).limit(1).get()
      .then(function (s) { return (revDone[other] = !s.empty); }).catch(function () { return true; });
  }
  function renderReviewAsk(msgs, chat) {
    var area = $('messages-area'), u = me();
    if (!area || !chat || !u || !db() || chatRole(chat) !== 'buyer') return;
    var other = (chat.participants || []).filter(function (p) { return p !== u.uid; })[0]; if (!other) return;
    var first = msgs[0] && msgs[0].createdAt ? sec(msgs[0].createdAt) : 0;
    var created = sec(chat.createdAt) || first;
    if (!created || Date.now() / 1000 - created < 2 * 86400) return;
    var mine = msgs.filter(function (m) { return m && m.senderUid === u.uid; }).length;
    if (mine < 1 || msgs.length - mine < 1) return;
    if (lsGet('ridego_rev_skip', {})[other]) return;
    reviewedAlready(u.uid, other).then(function (done) {
      var act = typeof _activeChatId !== 'undefined' ? _activeChatId : null;
      if (done || act !== chat.id) return;
      if ($('ux-rev-ask')) return;
      var name = chat.otherName || chat[other + '_name'] || 'продавцем';
      var box = document.createElement('div');
      box.id = 'ux-rev-ask';
      box.innerHTML = '<div class="ux-rev-t">Як пройшла угода з <b>' + esc(name) + '</b>?</div>' +
        '<div class="ux-rev-stars">' + [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" data-star="' + n + '" aria-label="' + n + ' з 5">★</button>'; }).join('') + '</div>' +
        '<div class="ux-rev-form" hidden><textarea maxlength="1000" rows="2" placeholder="Кілька слів про продавця (необов’язково)"></textarea><button type="button" class="ux-rev-send">Надіслати відгук</button></div>' +
        '<button type="button" class="ux-rev-skip">Не зараз</button>';
      var star = 0;
      box.addEventListener('click', function (e) {
        var s = e.target.closest('[data-star]');
        if (s) {
          star = +s.getAttribute('data-star');
          box.querySelectorAll('[data-star]').forEach(function (b) { b.classList.toggle('on', +b.getAttribute('data-star') <= star); });
          box.querySelector('.ux-rev-form').hidden = false;
          return;
        }
        if (e.target.closest('.ux-rev-skip')) {
          var sk = lsGet('ridego_rev_skip', {}); sk[other] = Date.now(); lsSet('ridego_rev_skip', sk); box.remove(); return;
        }
        if (e.target.closest('.ux-rev-send') && star) {
          var text = (box.querySelector('textarea').value || '').trim().slice(0, 1000);
          var cu = typeof currentUser !== 'undefined' ? currentUser : {};
          db().collection('reviews').add({
            sellerUid: other, reviewerUid: u.uid,
            reviewerName: cu.name || (u.email ? String(u.email).split('@')[0] : 'Користувач'),
            rating: star, text: text, chatId: chat.id, listingId: chat.listingId || null,
            createdAt: FV().serverTimestamp()
          }).then(function () {
            revDone[other] = true;
            if (window._reviewedSellers && window._reviewedSellers.add) window._reviewedSellers.add(other);
            box.innerHTML = '<div class="ux-rev-t">Дякуємо! Ваш відгук допоможе іншим покупцям 💚</div>';
            setTimeout(function () { box.remove(); }, 3500);
          }).catch(function () { toast('Не вдалося надіслати відгук'); });
        }
      });
      area.insertBefore(box, area.firstChild && area.firstChild.nextSibling || null);
    });
  }
  wrap('_renderMessages', function (r, msgs, chat) {
    msgs = msgs || [];
    renderQuick(msgs, chat);
    renderReviewAsk(msgs, chat);
  });

  // ══ 20. СПОВІЩЕННЯ ПРО НОВІ ПОВІДОМЛЕННЯ ════════════════════
  // 1) М'яко просимо дозвіл (після першого повідомлення, а не при вході).
  // 2) Якщо дозвіл є — реєструємо push через Firebase Cloud Messaging,
  //    щоб сповіщення приходили навіть із закритим сайтом.
  function notifOk() { return 'Notification' in window; }
  function askNotifBanner() {
    if (!notifOk() || Notification.permission !== 'default' || !me()) return;
    if (Date.now() - lsGet('ridego_notif_ask', 0) < 7 * 86400000) return;
    var pane = $('messages-area'); if (!pane || $('ux-notif-ask')) return;
    var b = document.createElement('div'); b.id = 'ux-notif-ask';
    b.innerHTML = '<i class="fa-solid fa-bell"></i><span>Увімкніть сповіщення, щоб не пропустити відповідь — навіть коли сайт закритий.</span>' +
      '<button type="button" class="on">Увімкнути</button><button type="button" class="x" aria-label="Закрити">✕</button>';
    b.querySelector('.on').onclick = function () {
      lsSet('ridego_notif_ask', Date.now());
      Notification.requestPermission().then(function (p) {
        b.remove();
        if (p === 'granted') { toast('🔔 Сповіщення увімкнено'); setupPush(true); }
      }).catch(function () { b.remove(); });
    };
    b.querySelector('.x').onclick = function () { lsSet('ridego_notif_ask', Date.now()); b.remove(); };
    pane.parentElement.insertBefore(b, pane);
  }
  wrap('sendMessage', function () { setTimeout(askNotifBanner, 500); });

  var pushBusy = false;
  function loadScript(src) {
    return new Promise(function (ok, fail) {
      if (document.querySelector('script[src="' + src + '"]')) return ok();
      var s = document.createElement('script'); s.src = src; s.async = true; s.onload = ok; s.onerror = fail; document.head.appendChild(s);
    });
  }
  function setupPush(force) {
    var u = me();
    if (pushBusy || !u || !db() || !notifOk() || Notification.permission !== 'granted') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    var saved = lsGet('ridego_fcm', {});
    if (!force && saved.uid === u.uid && Date.now() - (saved.at || 0) < 3 * 86400000) return;
    pushBusy = true;
    fetch('/api/config').then(function (r) { return r.ok ? r.json() : {}; }).then(function (cfg) {
      if (!cfg || !cfg.vapidKey) throw new Error('no vapid');
      return loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js').then(function () {
        return navigator.serviceWorker.ready;
      }).then(function (reg) {
        return firebase.messaging().getToken({ vapidKey: cfg.vapidKey, serviceWorkerRegistration: reg });
      });
    }).then(function (tok) {
      if (!tok) return;
      return db().collection('users').doc(u.uid).update({ fcmTokens: FV().arrayUnion(tok) }).then(function () {
        lsSet('ridego_fcm', { uid: u.uid, at: Date.now() });
      });
    }).catch(function (e) { if (e && e.message !== 'no vapid') console.warn('[ux] push', e && e.message); })
      .then(function () { pushBusy = false; });
  }
  // Відкрити чат з посилання в сповіщенні: /messages?chat=ID
  function openChatFromUrl() {
    var m = location.search.match(/[?&]chat=([A-Za-z0-9_-]{5,64})/);
    if (!m) return;
    setTimeout(function () {
      if (typeof showPage === 'function') showPage('messages');
      setTimeout(function () { if (typeof openChatById === 'function') openChatById(m[1]); }, 700);
    }, 600);
  }

  // ══ 21. ПІДТВЕРДЖЕННЯ ТЕЛЕФОНУ ══════════════════════════════
  // Раніше номер підтверджувався через signInWithPhoneNumber — це
  // ВХІД під новим акаунтом, а не підтвердження поточного. Тепер номер
  // прив'язується до вашого акаунта (linkWithPhoneNumber), а позначка
  // з'являється і в публічному профілі — її бачать покупці.
  var phoneConfirm = null, phoneVerifier = null;
  function phoneNorm(v) {
    var n = String(v || '').replace(/[^\d+]/g, '');
    if (/^0\d{9}$/.test(n)) n = '+38' + n;
    if (/^380\d{9}$/.test(n)) n = '+' + n;
    return /^\+\d{10,15}$/.test(n) ? n : '';
  }
  function markVerified(phone) {
    var u = me(); if (!u || !db()) return Promise.resolve();
    return u.getIdToken(true).then(function () {
      var data = { phoneVerified: true, phoneVerifiedAt: FV().serverTimestamp() };
      return Promise.all([
        db().collection('users').doc(u.uid).update(Object.assign({ phone: phone }, data)).catch(noop),
        db().collection('publicProfiles').doc(u.uid).set(data, { merge: true }).catch(function (e) { console.warn('[ux] pv', e && e.message); })
      ]);
    }).then(function () {
      var badge = $('phone-verified-badge'); if (badge) badge.style.display = 'inline';
      var btn = $('phone-verify-btn'); if (btn) btn.style.display = 'none';
    });
  }
  function phoneErr(e) {
    var c = e && e.code || '';
    return c === 'auth/invalid-phone-number' ? 'Невірний номер телефону'
      : c === 'auth/too-many-requests' ? 'Забагато спроб. Спробуйте пізніше'
      : c === 'auth/credential-already-in-use' || c === 'auth/account-exists-with-different-credential' ? 'Цей номер уже прив’язаний до іншого акаунта'
      : c === 'auth/operation-not-allowed' ? 'Підтвердження телефону тимчасово недоступне'
      : c === 'auth/invalid-verification-code' ? 'Невірний код з SMS'
      : c === 'auth/code-expired' ? 'Код застарів — надішліть ще раз'
      : (e && e.message) || 'Помилка';
  }
  window.startPhoneVerification = function () {
    var u = me(); if (!u) { toast('⚠️ Увійдіть в акаунт'); return; }
    var inp = $('set-phone'), phone = phoneNorm(inp && inp.value);
    if (!phone) { toast('⚠️ Введіть номер у форматі +380671234567'); return; }
    if (u.phoneNumber && u.phoneNumber === phone) { markVerified(phone).then(function () { toast('✅ Номер уже підтверджено'); }); return; }
    var btn = $('phone-verify-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Надсилаємо...'; }
    try {
      if (!phoneVerifier) {
        if (!$('recaptcha-container')) { var c = document.createElement('div'); c.id = 'recaptcha-container'; document.body.appendChild(c); }
        phoneVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', { size: 'invisible' });
      }
    } catch (e) { phoneVerifier = null; }
    Promise.resolve().then(function () {
      return u.phoneNumber
        ? new firebase.auth.PhoneAuthProvider(window._auth).verifyPhoneNumber(phone, phoneVerifier).then(function (vid) { return { vid: vid, update: true }; })
        : u.linkWithPhoneNumber(phone, phoneVerifier).then(function (cr) { return { cr: cr }; });
    }).then(function (res) {
      phoneConfirm = res;
      var w = $('phone-sms-wrap'); if (w) w.style.display = '';
      var code = $('phone-sms-code'); if (code) code.focus();
      toast('📱 SMS надіслано на ' + phone);
    }).catch(function (e) {
      toast('⚠️ ' + phoneErr(e));
      try { phoneVerifier && phoneVerifier.clear(); } catch (x) {}
      phoneVerifier = null;
    }).then(function () {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-shield-halved" style="margin-right:5px"></i>' + (phoneConfirm ? 'Надіслати ще раз' : 'Верифікувати'); }
    });
  };
  window.confirmPhoneCode = function () {
    var code = (($('phone-sms-code') || {}).value || '').trim();
    if (!phoneConfirm) return;
    if (!/^\d{6}$/.test(code)) { toast('⚠️ Введіть 6-значний код'); return; }
    var u = me(), phone = phoneNorm(($('set-phone') || {}).value);
    Promise.resolve().then(function () {
      return phoneConfirm.cr
        ? phoneConfirm.cr.confirm(code)
        : u.updatePhoneNumber(firebase.auth.PhoneAuthProvider.credential(phoneConfirm.vid, code));
    }).then(function () { return markVerified(phone); }).then(function () {
      phoneConfirm = null;
      if (typeof cancelPhoneVerification === 'function') cancelPhoneVerification();
      toast('✅ Телефон підтверджено! Покупці бачитимуть позначку біля ваших оголошень');
    }).catch(function (e) { toast('⚠️ ' + phoneErr(e)); });
  };
  // Номер уже є в акаунті, а позначки в профілі нема — дописуємо.
  function syncPhoneFlag() {
    var u = me(); if (!u || !u.phoneNumber || !db()) return;
    if (lsGet('ridego_pv_sync', '') === u.uid) return;
    markVerified(u.phoneNumber).then(function () { lsSet('ridego_pv_sync', u.uid); });
  }

  // ══ 22. ШВИДКІ ФІЛЬТРИ В КАТАЛОЗІ ═══════════════════════════
  // Ціна і стан в один дотик — без відкриття панелі фільтрів.
  var QF_PRICE = [[0, 10000, 'До 10 тис'], [10000, 20000, '10–20 тис'], [20000, 40000, '20–40 тис'], [40000, 0, 'Від 40 тис']];
  var qfUsed = false;
  (function () {
    var orig = window.getFilteredData;
    if (typeof orig !== 'function') return;
    window.getFilteredData = function () {
      var d = orig.apply(this, arguments);
      return qfUsed ? (d || []).filter(function (l) { return l.condition && l.condition !== 'Новий'; }) : d;
    };
  })();
  function pv(id) { var e = $(id); return e ? (parseInt(e.value, 10) || 0) : 0; }
  function renderQuickFilters() {
    var grid = $('catalog-listings'); if (!grid) return;
    var box = $('ux-qf');
    if (!box) {
      box = document.createElement('div'); box.id = 'ux-qf';
      var lbl = $('catalog-top-section') || grid;
      lbl.parentElement.insertBefore(box, lbl);
      box.addEventListener('click', function (e) {
        var b = e.target.closest('[data-qf]'); if (!b) return;
        var k = b.getAttribute('data-qf'), f = $('fp-price-from'), t = $('fp-price-to');
        if (k.indexOf('p') === 0) {
          var r = QF_PRICE[+k.slice(1)], on = pv('fp-price-from') === r[0] && pv('fp-price-to') === r[1];
          if (f) f.value = on || !r[0] ? '' : r[0];
          if (t) t.value = on || !r[1] ? '' : r[1];
        } else if (k === 'new') {
          qfUsed = false;
          conditionFilter = (conditionFilter === 'Новий' ? '' : 'Новий');
        } else if (k === 'used') {
          qfUsed = !qfUsed; conditionFilter = '';
        }
        if (typeof runSearch === 'function') runSearch();
      });
    }
    var from = pv('fp-price-from'), to = pv('fp-price-to');
    var cf = typeof conditionFilter !== 'undefined' ? conditionFilter : '';
    box.innerHTML = QF_PRICE.map(function (r, i) {
      return '<button type="button" data-qf="p' + i + '" class="' + (from === r[0] && to === r[1] ? 'on' : '') + '">' + r[2] + '</button>';
    }).join('') + '<span class="ux-qf-sep"></span>' +
      '<button type="button" data-qf="new" class="' + (cf === 'Новий' ? 'on' : '') + '">Нові</button>' +
      '<button type="button" data-qf="used" class="' + (qfUsed ? 'on' : '') + '">Вживані</button>';
  }
  wrap('runSearch', renderQuickFilters);
  wrap('clearFilters', function () { if (qfUsed) { qfUsed = false; if (typeof runSearch === 'function') runSearch(); } });

  // ══ 23. ЗВІДКИ ПРИХОДЯТЬ ЛЮДИ (для адмінки) ═════════════════
  // Раз на сесію: +1 до лічильника джерела (google, telegram, …) за день.
  (function trackSource() {
    try {
      if (sessionStorage.getItem('ridego_src')) return;
      sessionStorage.setItem('ridego_src', '1');
    } catch (e) { return; }
    var r = (document.referrer || '').toLowerCase(), q = location.search.toLowerCase(), src = 'direct';
    if (/utm_source=([a-z]+)/.test(q)) src = RegExp.$1;
    else if (/google\./.test(r)) src = 'google';
    else if (/t\.me|telegram/.test(r)) src = 'telegram';
    else if (/instagram/.test(r)) src = 'instagram';
    else if (/facebook|fb\.com/.test(r)) src = 'facebook';
    else if (/tiktok/.test(r)) src = 'tiktok';
    else if (/viber/.test(r)) src = 'viber';
    else if (/bing\./.test(r)) src = 'bing';
    else if (/olx\./.test(r)) src = 'olx';
    else if (r && r.indexOf(location.hostname) < 0) src = 'other';
    if (['google', 'telegram', 'instagram', 'facebook', 'tiktok', 'viber', 'bing', 'olx', 'direct', 'other'].indexOf(src) < 0) src = 'other';
    if (r && r.indexOf(location.hostname) > -1) return;
    setTimeout(function () { bumpCounter('src_' + src); }, 4000);
  })();
  function bumpCounter(prefix) {
    var day = new Date().toISOString().slice(0, 10), id = prefix + '_' + day;
    var go = function () {
      if (!db()) return;
      var ref = db().collection('analytics').doc(id);
      db().runTransaction(function (tx) {
        return tx.get(ref).then(function (s) {
          if (s.exists) tx.update(ref, { count: (s.data().count || 0) + 1, date: day, updatedAt: FV().serverTimestamp() });
          else tx.set(ref, { count: 1, date: day, updatedAt: FV().serverTimestamp() });
        });
      }).catch(noop);
    };
    if (window._firebaseReady) go(); else if (window._onFirebaseReady) window._onFirebaseReady(go);
  }
  // Новий діалог = перше повідомлення в чаті (для статистики в адмінці)
  wrap('sendMessage', null, function () {
    try {
      var id = typeof _activeChatId !== 'undefined' ? _activeChatId : null;
      var c = id && typeof _fbChats !== 'undefined' ? _fbChats.filter(function (x) { return x.id === id; })[0] : null;
      var i = $('chat-input');
      if (c && !c.lastMessage && i && i.value.trim()) bumpCounter('chats');
    } catch (e) {}
  });

  // ══ Вхід / вихід ════════════════════════════════════════════
  onAuth(function (user) {
    if (!user || !db()) { searches = null; userPrefs = null; renderSearches(); renderEmailPrefs(); return; }
    syncFavs(user.uid);
    loadSearches(user.uid);
    touchLastSeen();
    db().collection('users').doc(user.uid).get().then(function (s) {
      userPrefs = s.exists ? { emailPriceDrop: s.data().emailPriceDrop } : {};
      renderEmailPrefs();
    }).catch(noop);
    openTabFromUrl();
    openChatFromUrl();
    setTimeout(function () { setupPush(false); syncPhoneFlag(); }, 3000);
  });
})();
