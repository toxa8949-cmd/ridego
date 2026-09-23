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
    var render = function (s) {
      if ($(elId) !== el || el.getAttribute('data-uid') !== uid) return;
      if (!s) { el.innerHTML = ''; return; }
      var d = Date.now() / 1000 - s;
      if (d > 30 * 86400) { el.innerHTML = ''; return; }
      el.innerHTML = d < 300
        ? '<span class="ux-online"><i></i>Онлайн</span>'
        : '<span class="ux-seen">На сайті ' + ago(s) + '</span>';
    };
    el.setAttribute('data-uid', uid);
    var c = seenCache[uid];
    if (c && Date.now() - c.at < 2 * 60 * 1000) { render(c.s); return; }
    db().collection('publicProfiles').doc(uid).get().then(function (snap) {
      var s = snap.exists ? sec(snap.data().lastSeen) : 0;
      seenCache[uid] = { at: Date.now(), s: s };
      render(s);
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
  });
})();
