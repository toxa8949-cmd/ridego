
// ── Санітизація HTML для новин (allow-list підхід) ────────────
function _sanitizeNewsHtml(html) {
  if (!html) return '';
  var tmp = document.createElement('div');
  tmp.innerHTML = html;
  // Видаляємо небезпечні елементи
  var dangerous = tmp.querySelectorAll('script,iframe,object,embed,form,input,textarea,button,link,meta,style');
  dangerous.forEach(function(el) { el.remove(); });
  // Видаляємо всі on* атрибути та javascript: href
  tmp.querySelectorAll('*').forEach(function(el) {
    Array.from(el.attributes).forEach(function(attr) {
      if (attr.name.toLowerCase().startsWith('on')) el.removeAttribute(attr.name);
      if (attr.name.toLowerCase() === 'href' && attr.value.trim().toLowerCase().startsWith('javascript:')) {
        el.setAttribute('href', '#');
      }
      if (attr.name.toLowerCase() === 'src' && attr.value.trim().toLowerCase().startsWith('javascript:')) {
        el.removeAttribute('src');
      }
    });
  });
  return tmp.innerHTML;
}

function _closeSoldOverlay() {
  var o = document.getElementById('sold-overlay');
  if (o) o.remove();
}

function markAsSold(id) {
  if (!id || !isLoggedIn) return;
  var l = typeof _allListings === 'function'
    ? _allListings().find(function(x){ return x && x.id === id; })
    : null;
  var titleText = l ? l.title : '';

  var overlay = document.createElement('div');
  overlay.id = 'sold-overlay';
  overlay.dataset.listingId = id;
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';

  var d = document.createElement('div');
  d.style.cssText = 'background:var(--card-bg);border:1px solid var(--border);border-radius:20px;padding:28px;max-width:380px;width:100%;text-align:center';
  d.innerHTML = '<div style="font-size:48px;margin-bottom:12px">&#127881;</div>'
    + '<div style="font-size:18px;font-weight:700;margin-bottom:8px">&#1055;&#1086;&#1079;&#1085;&#1072;&#1095;&#1080;&#1090;&#1080; &#1103;&#1082; &#1087;&#1088;&#1086;&#1076;&#1072;&#1085;&#1077;?</div>'
    + '<div style="font-size:14px;color:var(--text-muted);margin-bottom:24px">'
    + (titleText ? '&laquo;' + titleText + '&raquo; ' : '')
    + '&#1073;&#1091;&#1076;&#1077; &#1087;&#1086;&#1079;&#1085;&#1072;&#1095;&#1077;&#1085;&#1086; &#1103;&#1082; &#1087;&#1088;&#1086;&#1076;&#1072;&#1085;&#1077; &#1110; &#1087;&#1088;&#1080;&#1093;&#1086;&#1074;&#1072;&#1085;&#1086; &#1079; &#1082;&#1072;&#1090;&#1072;&#1083;&#1086;&#1075;&#1091;</div>'
    + '<div style="display:flex;gap:10px">'
    + '<button class="btn-outline" style="flex:1;padding:11px" onclick="_closeSoldOverlay()">&#1057;&#1082;&#1072;&#1089;&#1091;&#1074;&#1072;&#1090;&#1080;</button>'
    + '<button class="btn-primary" style="flex:1;padding:11px;background:#16a34a" onclick="_confirmSold()">'
    + '<i class="fa-solid fa-circle-check" style="margin-right:6px"></i>&#1058;&#1072;&#1082;, &#1087;&#1088;&#1086;&#1076;&#1072;&#1085;&#1086;!</button>'
    + '</div>';
  overlay.appendChild(d);
  document.body.appendChild(overlay);
}

function _confirmSold() {
  var overlay = document.getElementById('sold-overlay');
  var id = overlay ? overlay.dataset.listingId : null;
  if (overlay) overlay.remove();
  if (!id || !window._db) return;

  window._db.collection('listings').doc(id).update({
    status: 'sold',
    soldAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(function() {

    if (typeof _fbListings !== 'undefined') {
      var l = _fbListings.find(function(x){ return x && x.id === id; });
      if (l) l.status = 'sold';
    }
    if (typeof myListings !== 'undefined') {
      var l2 = myListings.find(function(x){ return x && x.id === id; });
      if (l2) l2.status = 'sold';
    }

    var uid = currentUser && currentUser.uid;
    var soldCount = (typeof _allListings === 'function' ? _allListings() : [])
      .filter(function(x){ return x && x.uid === uid && x.status === 'sold'; }).length;
    var soldEl = document.getElementById('pstat-sold');
    if (soldEl) soldEl.textContent = soldCount;
    if (window._db && uid) {
      window._db.collection('users').doc(uid).update({
        sold: firebase.firestore.FieldValue.increment(1)
      }).catch(function(){});
    }
    if (typeof renderMyListings === 'function') renderMyListings();
    if (typeof renderHomeListings === 'function') renderHomeListings();
    showToast('\u2705 \u041e\u0433\u043e\u043b\u043e\u0448\u0435\u043d\u043d\u044f \u043f\u043e\u0437\u043d\u0430\u0447\u0435\u043d\u043e \u044f\u043a \u043f\u0440\u043e\u0434\u0430\u043d\u0435!');
  }).catch(function(e) {
    showToast('\u26a0\ufe0f \u041f\u043e\u043c\u0438\u043b\u043a\u0430: ' + e.message);
  });
}

document.addEventListener('DOMContentLoaded', function() {
  var searchEl = document.getElementById('headerSearch');
  if (searchEl) {
    searchEl.value = '';
    setTimeout(function() { if (searchEl.value && !searchEl.dataset.userTyped) searchEl.value = ''; }, 100);
    setTimeout(function() { if (searchEl.value && !searchEl.dataset.userTyped) searchEl.value = ''; }, 500);
    searchEl.addEventListener('input', function() { searchEl.dataset.userTyped = '1'; });
  }


  if ('IntersectionObserver' in window) {
    var _lazyObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (!entry.isIntersecting) return;
        var img = entry.target;
        var src = img.dataset.src;
        if (!src) return;
        var hi = new Image();
        hi.onload = function() {
          img.src = src;
          img.style.filter = 'none';
          delete img.dataset.src;
        };
        hi.src = src;
        _lazyObserver.unobserve(img);
      });
    }, { rootMargin: '200px' });


    var _domObserver = new MutationObserver(function() {
      document.querySelectorAll('img.lazy-img[data-src]').forEach(function(img) {
        _lazyObserver.observe(img);
      });
    });
    _domObserver.observe(document.body, { childList: true, subtree: true });

    document.querySelectorAll('img.lazy-img[data-src]').forEach(function(img) {
      _lazyObserver.observe(img);
    });
  } else {

    document.querySelectorAll('img.lazy-img[data-src]').forEach(function(img) {
      img.src = img.dataset.src;
      img.style.filter = 'none';
    });
  }




  (function _trackUniqueVisitor() {
    try {
      var today = new Date().toISOString().slice(0, 10);
      var storageKey = 'ridego_visited_' + today;


      if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(storageKey)) return;


      if (localStorage.getItem(storageKey)) {

        if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(storageKey, '1');
        return;
      }


      var browserId = localStorage.getItem('ridego_bid');
      if (!browserId) {
        browserId = 'b' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem('ridego_bid', browserId);
      }

      var _waitForDb = setInterval(function() {
        if (!window._db) return;
        clearInterval(_waitForDb);

        var docId = 'visitors_' + today;

        // Тільки інкрементуємо лічильник — localStorage запобігає повторному підрахунку
        window._db.collection('analytics').doc(docId).set({
          count: firebase.firestore.FieldValue.increment(1),
          date: today,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).then(function() {
          localStorage.setItem(storageKey, '1');
          if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(storageKey, '1');
        }).catch(function(){});
      }, 500);

      setTimeout(function(){ clearInterval(_waitForDb); }, 10000);
    } catch(e) {}
  })();



  // Скелетони вже в HTML — не потрібно вставляти повторно


  window.addEventListener('offline', function() {
    if (typeof showToast === 'function') showToast('⚠️ З\'єднання з інтернетом втрачено');
  });
  window.addEventListener('online', function() {
    if (typeof showToast === 'function') showToast('✅ З\'єднання відновлено');

    if (typeof loadFirebaseData === 'function' && typeof _fbListings !== 'undefined' && !_fbListings.length) {
      loadFirebaseData();
    }
  });

  setTimeout(loadFirebaseData, 300);
  setTimeout(loadSiteNews, 800);

  // ── Fallback: якщо дані не завантажились за 10с — показати повідомлення ──
  setTimeout(function() {
    var sections = [
      { id: 'home-listings',     label: 'оголошення' },
      { id: 'home-top-listings', label: 'ТОП оголошення' },
      { id: 'home-news-grid',    label: 'новини' },
    ];
    sections.forEach(function(sec) {
      var el = document.getElementById(sec.id);
      if (!el) return;
      // Якщо ще є скелетони — дані не прийшли
      var hasSkeletons = el.querySelector('.skel-card') || el.querySelector('.skeleton');
      var isEmpty = !el.children.length;
      if (hasSkeletons || isEmpty) {
        el.innerHTML = '<div style="text-align:center;padding:40px 24px;grid-column:1/-1;color:var(--text-muted)">'
          + '<div style="font-size:40px;margin-bottom:12px">📡</div>'
          + '<div style="font-size:16px;font-weight:600;margin-bottom:8px;color:var(--text)">Не вдалося завантажити ' + sec.label + '</div>'
          + '<p style="font-size:14px;margin-bottom:16px">Перевірте з\'єднання з інтернетом</p>'
          + '<button class="btn-primary" style="padding:10px 24px;font-size:14px" onclick="location.reload()">'
          + '<i class="fa-solid fa-rotate-right" style="margin-right:8px"></i>Спробувати знову</button>'
          + '</div>';
      }
    });
  }, 10000);
});

var _reviewStar = 0;
var _reviewSellerUid = null;

function setReviewStar(n) {
  _reviewStar = n;
  document.querySelectorAll('#review-stars-input span').forEach(function(s, i) {
    s.textContent = i < n ? '★' : '☆';
    s.style.color = i < n ? '#ffa726' : '';
  });
}

function _initReviewForm(sellerUid) {
  _reviewSellerUid = sellerUid;
  _reviewStar = 0;
  setReviewStar(0);
  var textEl = document.getElementById('review-text-input');
  if (textEl) textEl.value = '';

  var formWrap   = document.getElementById('review-form-wrap');
  var alreadyEl  = document.getElementById('review-already-done');
  var loginEl    = document.getElementById('review-login-prompt');
  if (!formWrap) return;


  if (!isLoggedIn || !currentUser || !currentUser.uid) {
    formWrap.style.display  = 'none';
    alreadyEl.style.display = 'none';
    loginEl.style.display   = '';
    return;
  }

  if (currentUser.uid === sellerUid) {
    formWrap.style.display  = 'none';
    alreadyEl.style.display = 'none';
    loginEl.style.display   = 'none';
    return;
  }

  loginEl.style.display = 'none';
  if (!window._db) { formWrap.style.display = ''; return; }

  // Кеш — зберігаємо Set uid продавців яким вже залишали відгук
  if (!window._reviewedSellers) window._reviewedSellers = new Set();
  if (window._reviewedSellers.has(sellerUid)) {
    formWrap.style.display  = 'none';
    alreadyEl.style.display = '';
    return;
  }

  window._db.collection('reviews')
    .where('reviewerUid', '==', currentUser.uid)
    .where('sellerUid',   '==', sellerUid)
    .get().then(function(snap) {
      if (snap.empty) {
        formWrap.style.display  = '';
        alreadyEl.style.display = 'none';
      } else {
        window._reviewedSellers.add(sellerUid); // кешуємо результат
        formWrap.style.display  = 'none';
        alreadyEl.style.display = '';
      }
    }).catch(function() { formWrap.style.display = ''; });
}

function submitReview() {
  if (!_reviewSellerUid) return;
  if (!isLoggedIn || !currentUser || !currentUser.uid) {
    showToast('⚠️ Спочатку увійдіть в акаунт'); return;
  }
  if (currentUser.uid === _reviewSellerUid) {
    showToast('⚠️ Не можна залишити відгук собі'); return;
  }
  if (!_reviewStar) { showToast('⚠️ Оберіть оцінку'); return; }
  var text = (document.getElementById('review-text-input').value || '').trim();
  if (!text) { showToast('⚠️ Напишіть текст відгуку'); return; }
  if (text.length < 10) { showToast('⚠️ Відгук занадто короткий'); return; }

  var review = {
    sellerUid:   _reviewSellerUid,
    reviewerUid: currentUser.uid,
    reviewerName: currentUser.name || currentUser.email,
    rating: _reviewStar,
    text:   text,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  window._db.collection('reviews').add(review).then(function() {
    showToast('✅ Відгук опубліковано!');
    document.getElementById('review-form-wrap').style.display  = 'none';
    document.getElementById('review-already-done').style.display = '';
    // Кешуємо щоб не перевіряти знову
    if (window._reviewedSellers) window._reviewedSellers.add(_reviewSellerUid);
    // Інвалідуємо кеш відгуків щоб показати новий
    if (typeof _reviewsCache !== 'undefined') delete _reviewsCache[_reviewSellerUid];
    _loadSellerReviews(_reviewSellerUid);
  }).catch(function(e) {
    showToast('⚠️ Помилка: ' + e.message);
  });
}

function _loadSellerReviews(sellerUid) {
  if (!window._db) return;

  // Перевіряємо кеш
  var cache = typeof _reviewsCache !== 'undefined' && _reviewsCache[sellerUid];
  if (cache && (Date.now() - cache.loadedAt) < (typeof _REVIEWS_TTL !== 'undefined' ? _REVIEWS_TTL : 5 * 60 * 1000)) {
    _renderSellerReviewsUI(cache.data);
    return;
  }

  window._db.collection('reviews')
    .where('sellerUid', '==', sellerUid)
    .limit(50)
    .get().then(function(snap) {
      var revs = snap.docs.map(function(d){ return d.data(); });
      // Зберігаємо в кеш
      if (typeof _reviewsCache !== 'undefined') {
        _reviewsCache[sellerUid] = { data: revs, loadedAt: Date.now() };
      }
      _renderSellerReviewsUI(revs);
    }).catch(function(e){ console.error('reviews load:', e); });
}

function _renderSellerReviewsUI(revs) {

      revs.sort(function(a, b) {
        var ta = a.createdAt && a.createdAt.seconds ? a.createdAt.seconds : 0;
        var tb = b.createdAt && b.createdAt.seconds ? b.createdAt.seconds : 0;
        return tb - ta;
      });
      var avg = revs.length ? revs.reduce(function(s,r){ return s+r.rating; }, 0) / revs.length : 0;
      document.getElementById('rev-avg').textContent = avg > 0 ? avg.toFixed(1) : '—';
      // Оновити рейтинг в stat card
      var ratingStat = document.getElementById('sp-stat-rating');
      if (ratingStat) ratingStat.textContent = avg > 0 ? avg.toFixed(1) : '—';
      document.getElementById('rev-stars').textContent = avg > 0
        ? ('★'.repeat(Math.round(avg)) + '☆'.repeat(5-Math.round(avg))) : '☆☆☆☆☆';
      document.getElementById('rev-count').textContent = revs.length
        ? 'на основі ' + revs.length + ' відгуків' : 'Відгуків поки немає';

      var bars = [5,4,3,2,1];
      document.getElementById('rev-bars').innerHTML = bars.map(function(star) {
        var cnt = revs.filter(function(r){ return r.rating === star; }).length;
        var pct = revs.length ? Math.round(cnt / revs.length * 100) : 0;
        return '<div style="display:flex;align-items:center;gap:10px;font-size:13px">' +
          '<span style="width:14px;text-align:right;font-weight:600">' + star + '</span>' +
          '<i class="fa-solid fa-star" style="color:#ffa726;font-size:11px"></i>' +
          '<div style="flex:1;height:8px;background:var(--dark3);border-radius:4px;overflow:hidden">' +
          '<div style="width:' + pct + '%;height:100%;background:linear-gradient(90deg,#ffa726,#ff8f00);border-radius:4px"></div></div>' +
          '<span style="width:24px;font-size:12px;color:var(--text-muted)">' + cnt + '</span></div>';
      }).join('');

      var colors = ['#6366f1','#ec4899','#14b8a6','#f59e0b','#22c55e','#f97316'];
      document.getElementById('reviews-list').innerHTML = revs.length ? revs.map(function(r, i) {
        var safeName = typeof _esc === 'function' ? _esc(r.reviewerName||'Анонім') : (r.reviewerName||'Анонім');
        var safeText = typeof _esc === 'function' ? _esc(r.text||'')               : (r.text||'');
        var initials = safeName.replace(/&amp;|&lt;|&gt;|&quot;|&#39;/g,'').split(' ').map(function(w){ return w[0]||''; }).join('').slice(0,2).toUpperCase() || '?';
        var stars = '★'.repeat(r.rating) + '☆'.repeat(5-r.rating);
        var date = r.createdAt ? new Date(r.createdAt.seconds*1000).toLocaleDateString('uk-UA') : '';
        return '<div class="review-card">' +
          '<div style="display:flex;align-items:flex-start;gap:14px">' +
          '<div style="width:44px;height:44px;border-radius:50%;background:' + colors[i%colors.length] + ';display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:#fff;flex-shrink:0">' + initials + '</div>' +
          '<div style="flex:1"><div style="display:flex;justify-content:space-between;margin-bottom:4px">' +
          '<span style="font-weight:700;font-size:14px">' + safeName + '</span>' +
          '<span style="font-size:11px;color:var(--text-muted)">' + date + '</span></div>' +
          '<div style="color:#ffa726;font-size:13px;margin-bottom:8px">' + stars + '</div>' +
          '<p style="font-size:14px;line-height:1.7;color:var(--text-muted);margin:0">' + safeText + '</p>' +
          '</div></div></div>';
      }).join('') :
        '<div class="empty-state"><i class="fa-regular fa-star"></i><h3>Поки немає відгуків</h3><p>Будьте першим хто залишить відгук</p></div>';
}

// deleteListing визначена в main.js

function _confirmDelete(id, btn) {
  var reason = document.querySelector('input[name="del-reason"]:checked');
  if (!reason) { showToast('⚠️ Оберіть причину видалення'); return; }
  var overlay = btn.closest('[style*=fixed]');
  if (overlay) overlay.remove();


  if (window._db && id) {
    window._db.collection('listings').doc(id).update({
      status: 'deleted',
      deletedReason: reason.value,
      deletedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(function(e){ console.error('delete error:', e); });
  }

  myListings = myListings.filter(function(l){ return l.id !== id; });
  _fbListings = _fbListings.filter(function(l){ return l.id !== id; });
  if (typeof renderMyListings === 'function') renderMyListings();
  if (typeof _updateActiveCount === 'function') _updateActiveCount();
  showToast('✅ Оголошення видалено');
}

function reportListing(id) {
  if (!id) return;
  if (!isLoggedIn) { showToast('⚠️ Увійдіть щоб поскаржитись'); return; }
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.innerHTML = `
    <div style="background:var(--card-bg);border:1px solid var(--border);border-radius:20px;padding:28px;max-width:400px;width:100%">
      <div style="font-size:18px;font-weight:700;margin-bottom:6px">🚩 Поскаржитись на оголошення</div>
      <div style="font-size:14px;color:var(--text-muted);margin-bottom:20px">Ми розглянемо скаргу протягом 24 годин</div>
      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px">
        ${['Шахрайство / обман','Неправдива інформація','Заборонений товар','Спам / дублікат','Образливий контент','Інше'].map(r =>
          `<label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:14px">
            <input type="radio" name="rep-reason" value="${r}" style="accent-color:var(--brand)"> ${r}
          </label>`
        ).join('')}
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn-outline" style="flex:1;padding:11px" onclick="this.closest('[style*=fixed]').remove()">Скасувати</button>
        <button class="btn-primary" style="flex:1;padding:11px" onclick="_confirmReport('${id}', this)">
          Надіслати скаргу
        </button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

function _confirmReport(id, btn) {
  var reason = document.querySelector('input[name="rep-reason"]:checked');
  if (!reason) { showToast('⚠️ Оберіть причину скарги'); return; }
  var overlay = btn.closest('[style*=fixed]');
  if (overlay) overlay.remove();
  if (window._db && currentUser && currentUser.uid) {
    window._db.collection('reports').add({
      listingId: id,
      reason: reason.value,
      reporterUid: currentUser.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(function(e){ console.error('report error:', e); });
  }
  showToast('✅ Скаргу надіслано. Дякуємо!');
}

var _searchTimeout = null;

function handleSearch(query, immediate) {
  clearTimeout(_searchTimeout);
  var delay = immediate ? 0 : 350;
  _searchTimeout = setTimeout(function() {
    doSearch(query.trim());
  }, delay);
}

function doSearch(query) {
  if (!query) return;
  var q = query.toLowerCase();
  var results = (typeof _allListings === 'function' ? _allListings() : _fbListings.concat(myListings)).filter(function(l) {
    if (!l) return false;
    if (l.status === 'deleted' || l.status === 'sold') return false;
    return (l.title && l.title.toLowerCase().includes(q)) ||
           (l.cat && l.cat.toLowerCase().includes(q)) ||
           (l.city && l.city.toLowerCase().includes(q)) ||
           (l.seller && l.seller.toLowerCase().includes(q)) ||
           (l.desc && l.desc.toLowerCase().includes(q)) ||
           (l.badge && l.badge.toLowerCase().includes(q));
  });


  showPage('catalog');
  setTimeout(function() {
    var el = document.getElementById('catalog-listings') || document.getElementById('catalog-list') || document.getElementById('listings-grid');
    var hero = document.querySelector('.catalog-hero h1');
    if (hero) hero.textContent = results.length
      ? 'Результати: "' + query + '" (' + results.length + ')'
      : 'Нічого не знайдено';
    if (el) {
      el.innerHTML = results.length
        ? results.map(function(l){ return createCard(l, 'catalog'); }).join('')
        : '<div style="text-align:center;padding:60px 24px;color:var(--text-muted)">' +
          '<div style="font-size:48px;margin-bottom:16px">🔍</div>' +
          '<div style="font-size:18px;font-weight:700;margin-bottom:8px">Нічого не знайдено</div>' +
          '<p>Спробуйте інший запит або перегляньте всі оголошення</p></div>';
    }
  }, 100);
}

var _allNews = [];
var _newsLoadedAt = 0;
var _NEWS_TTL = 30 * 60 * 1000; // 30 хвилин

function loadSiteNews() {
  if (!window._db) return;

  // Якщо in-memory кеш свіжий — просто рендеримо
  if (_allNews.length && (Date.now() - _newsLoadedAt) < _NEWS_TTL) {
    renderHomeNews();
    if (document.getElementById('news-grid')) renderNewsGrid(_allNews);
    return;
  }

  // Спробувати localStorage кеш (30 хв)
  try {
    var _newsAt = parseInt(localStorage.getItem('_news_at') || '0');
    if (Date.now() - _newsAt < 30 * 60 * 1000) {
      var cached = JSON.parse(localStorage.getItem('_news_data') || 'null');
      if (cached && cached.length) {
        _allNews = cached;
        _newsLoadedAt = Date.now();
        renderHomeNews();
        if (document.getElementById('news-grid')) renderNewsGrid(_allNews);
        return;
      }
    }
  } catch(e) {}

  var newsGridEl = document.getElementById('news-grid');
  if (newsGridEl && !_allNews.length) {
    newsGridEl.innerHTML = [1,2,3,4,5,6].map(function() {
      return '<div class="skel-card"><div class="skeleton skel-img"></div>'
        + '<div class="skel-body">'
        + '<div class="skeleton skel-line short"></div>'
        + '<div class="skeleton skel-line full"></div>'
        + '<div class="skeleton skel-line full"></div>'
        + '<div class="skeleton skel-line short"></div>'
        + '</div></div>';
    }).join('');
  }
  window._db.collection('news').where('published','==',true).get()
    .then(function(snap) {
      _allNews = snap.docs.map(function(d){ return Object.assign({id:d.id}, d.data()); });
      _newsLoadedAt = Date.now();
      try {
        localStorage.setItem('_news_data', JSON.stringify(_allNews));
        localStorage.setItem('_news_at', String(Date.now()));
      } catch(e) {}
      renderHomeNews();
      if (document.getElementById('news-grid')) renderNewsGrid(_allNews);
    }).catch(function(e){ console.error('news:', e); });
}

function renderHomeNews() {
  var el = document.getElementById('home-news-grid');
  if (!el) return;
  var top3 = _allNews.slice(0, 3);
  if (!top3.length) {
    el.closest('.section') && (el.closest('.section').style.display = 'none');
    return;
  }
  el.innerHTML = top3.map(function(n){ return createNewsCard(n); }).join('');
}

function renderNewsGrid(news) {
  var el = document.getElementById('news-grid');
  if (!el) return;
  if (!news.length) {
    el.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text-muted);grid-column:1/-1"><i class="fa-solid fa-newspaper" style="font-size:40px;margin-bottom:16px;display:block"></i>Новин поки немає</div>';
    return;
  }
  el.innerHTML = news.map(function(n){ return createNewsCard(n); }).join('');
}

function createNewsCard(n) {
  var date = n.createdAt ? new Date(n.createdAt.seconds*1000).toLocaleDateString('uk-UA',{day:'numeric',month:'long',year:'numeric'}) : '';
  return '<div class="news-card" onclick="showNewsDetail(this.dataset.id)" data-id="'+n.id+'">' + (n.img ? '<img class="news-card-img" src="'+n.img+'" alt="'+n.title+'" loading="lazy">'
             : '<div class="news-card-img-ph">📰</div>')
    + '<div class="news-card-body">'
    + '<div class="news-card-cat">'+(n.cat||'Новини')+'</div>'
    + '<div class="news-card-title">'+(n.title||'')+'</div>'
    + '<div class="news-card-excerpt">'+(n.excerpt||'')+'</div>'
    + '<div class="news-card-date"><i class="fa-regular fa-calendar" style="margin-right:4px"></i>'+date+'</div>'
    + '</div></div>';
}

function showNewsDetail(id) {
  var n = _allNews.find(function(x){ return x.id === id; });
  if (!n) {

    if (window._db && id) {
      document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active'); });
      var detailPage = document.getElementById('page-news-detail');
      if (detailPage) detailPage.classList.add('active');
      var contentEl = document.getElementById('news-detail-content');
      if (contentEl) contentEl.innerHTML = '<div style="display:flex;flex-direction:column;gap:16px;padding:20px 0">'
        + '<div class="skeleton" style="height:300px;border-radius:12px"></div>'
        + '<div class="skeleton" style="height:18px;width:40%;border-radius:6px"></div>'
        + '<div class="skeleton" style="height:28px;width:80%;border-radius:6px"></div>'
        + '<div class="skeleton" style="height:14px;border-radius:4px"></div>'
        + '</div>';
      if (typeof _setPath === 'function') _setPath('/news/' + id);
      window._db.collection('news').doc(id).get().then(function(snap) {
        if (!snap.exists) { if(typeof showToast==='function') showToast('⚠️ Новину не знайдено'); return; }
        var data = Object.assign({ id: snap.id }, snap.data());
        _allNews.unshift(data);
        showNewsDetail(id);
      }).catch(function(e) {
        if(typeof showToast==='function') showToast('⚠️ Помилка: ' + e.message);
      });
    }
    return;
  }




  var _fromNews = (window.location.pathname === '/news' || window.location.pathname.startsWith('/news/'));
  if (!_fromNews && typeof _setPath === 'function') {
    history.pushState(null, '', '/news');
  }
  if (typeof _setPath === 'function') _setPath('/news/' + id);
  document.title = n.title + ' — RideGO';

  _updateSEO({
    title: n.title,
    desc: n.excerpt || '',
    img: n.img || '',
    url: 'https://ridego.com.ua/news/' + id
  });
  _setNewsSchema(n);
  var date = n.createdAt ? new Date(n.createdAt.seconds*1000).toLocaleDateString('uk-UA',{day:'numeric',month:'long',year:'numeric'}) : '';
  var breadcrumb = document.getElementById('news-detail-breadcrumb');
  if (breadcrumb) breadcrumb.textContent = n.title;
  var el = document.getElementById('news-detail-content');
  if (el) el.innerHTML = ''
    + (n.img ? '<img src="'+n.img+'" alt="'+n.title+'" style="width:100%;border-radius:16px;margin-bottom:28px;max-height:400px;object-fit:cover">' : '')
    + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">'
    + '<span style="font-size:12px;background:var(--brand-dim);color:var(--brand);padding:3px 10px;border-radius:50px;font-weight:700">'+(n.cat||'Новини')+'</span>'
    + '<span style="font-size:13px;color:var(--text-muted)">'+date+'</span>'
    + '</div>'
    + '<h1 style="font-size:clamp(22px,3vw,32px);font-weight:800;margin-bottom:20px;line-height:1.3">'+_esc(n.title||'')+'</h1>'
    + '<div style="font-size:16px;color:var(--text-muted);margin-bottom:24px;font-style:italic;border-left:3px solid var(--brand);padding-left:16px">'+_esc(n.excerpt||'')+'</div>'
    + '<div class="news-article-body" style="font-size:16px;line-height:1.8">'+_sanitizeNewsHtml(n.body||'')+'</div>';


  document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active'); });
  var _ndPage = document.getElementById('page-news-detail');
  if (_ndPage) _ndPage.classList.add('active');
  document.querySelectorAll('.mnav-item').forEach(function(b){ b.classList.remove('active'); });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function filterNewsCat(cat, btn) {
  document.querySelectorAll('.news-cat-btn').forEach(function(b){ b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  var filtered = cat ? _allNews.filter(function(n){ return n.cat === cat; }) : _allNews;
  renderNewsGrid(filtered);
}

var _chatsUnsubscribe = null;
var _chatsSubscribedUid = null;
window.__chatListenersCount = 0; // лічильник для дебагу

function _subscribeChats() {
  if (!window._db || !currentUser || !currentUser.uid) return;

  // Idempotent guard — не підписуємось двічі на одного юзера
  if (_chatsUnsubscribe && _chatsSubscribedUid === currentUser.uid) return;

  // Bulletproof — завжди відписуємось перед новою підпискою
  if (_chatsUnsubscribe) {
    _chatsUnsubscribe();
    _chatsUnsubscribe = null;
    window.__chatListenersCount = Math.max(0, window.__chatListenersCount - 1);
  }

  _chatsSubscribedUid = currentUser.uid;
  window.__chatListenersCount++;
  void('[RideGO] Chats subscribe for uid:', currentUser.uid, '| Active listeners:', window.__chatListenersCount);

  var _prevUnreadTotal = 0;

  _chatsUnsubscribe = window._db.collection('chats')
    .where('participants', 'array-contains', currentUser.uid)
    .limit(10)
    .onSnapshot(function(snap) {
      _fbChats = snap.docs.map(function(d) {
        var data = Object.assign({ id: d.id }, d.data());
        var otherId = data.participants
          ? data.participants.find(function(p) { return p !== currentUser.uid; })
          : null;
        if (otherId) data.otherName = data[otherId + '_name'] || data.otherName || '';

        data.unread = data['unread_' + currentUser.uid] || 0;
        return data;
      });
      _fbChats.sort(function(a, b) {
        var ta = a.lastMessageAt && a.lastMessageAt.seconds ? a.lastMessageAt.seconds : 0;
        var tb = b.lastMessageAt && b.lastMessageAt.seconds ? b.lastMessageAt.seconds : 0;
        return tb - ta;
      });

      var totalUnread = _fbChats.reduce(function(s, c) { return s + (c.unread || 0); }, 0);
      if (totalUnread > _prevUnreadTotal && _prevUnreadTotal >= 0) {
        var newChat = _fbChats.find(function(c) {
          return (c.unread || 0) > 0 && c.lastSenderUid !== currentUser.uid;
        });
        if (newChat && typeof _showMsgPush === 'function') {
          _showMsgPush(newChat.otherName || 'Новий контакт', newChat.lastMessage || '...', newChat.id);
        }
      }
      _prevUnreadTotal = totalUnread;

      renderChats();
      if (typeof _updateChatBadge === 'function') _updateChatBadge();
    }, function(e) {
      void('chats listener:', e.message);
      loadUserChats();
    });
}

// Visibility control — не слухаємо чати коли вкладка неактивна
document.addEventListener('visibilitychange', function() {
  if (!document.hidden) {
    // Вкладка знову активна — відновлюємо підписку якщо залогінені і listener закритий
    if (currentUser && currentUser.uid && window._db && !_chatsUnsubscribe) {
      _chatsSubscribedUid = null;
      _subscribeChats();
      void('[RideGO] Chats resubscribed (tab visible)');
    }
  }
});

function _updateSEO(opts) {
  var title = opts.title ? opts.title + ' — RideGO' : 'RideGO — Маркетплейс електротранспорту України';
  var desc = opts.desc || 'Купуй та продавай електросамокати, велосипеди, скутери. Понад 5800 оголошень по всій Україні.';
  var img = opts.img || 'https://ridego.com.ua/og-image.png';
  var url = opts.url || 'https://ridego.com.ua/';

  document.title = title;
  _setMeta('description', desc);
  _setOG('title', title);
  _setOG('description', desc);
  _setOG('image', img);
  _setOG('url', url);
  _setMeta('twitter:title', title);
  _setMeta('twitter:description', desc);
  _setMeta('twitter:image', img); _setMeta('twitter:card','summary_large_image'); _setOG('image:width','1200'); _setOG('image:height','630'); _setOG('image:alt', title); _setOG('type', opts.type||'website');

  var canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.href = url;
}

function _setMeta(name, content) {
  var el = document.querySelector('meta[name="'+name+'"]');
  if (!el) { el = document.createElement('meta'); el.setAttribute('name', name); document.head.appendChild(el); }
  el.setAttribute('content', content);
}

function _setOG(prop, content) {
  var el = document.querySelector('meta[property="og:'+prop+'"]');
  if (!el) { el = document.createElement('meta'); el.setAttribute('property', 'og:'+prop); document.head.appendChild(el); }
  el.setAttribute('content', content);
}

function _setListingSchema(l) {
  var existing = document.getElementById('schema-listing');
  if (existing) existing.remove();
  if (!l) return;
  var schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    'name': l.title || '',
    'description': l.desc || '',
    'image': l.imgs || (l.img ? [l.img] : []),
    'offers': {
      '@type': 'Offer',
      'price': l.price || 0,
      'priceCurrency': 'UAH',
      'availability': 'https://schema.org/InStock',
      'seller': { '@type': 'Person', 'name': l.sellerName || l.seller || '' }
    },
    'brand': { '@type': 'Brand', 'name': l.brand || 'RideGO' }
  };
  var s = document.createElement('script');
  s.type = 'application/ld+json';
  s.id = 'schema-listing';
  s.textContent = JSON.stringify(schema);
  document.head.appendChild(s);
}

function _setNewsSchema(n) {
  var existing = document.getElementById('schema-news');
  if (existing) existing.remove();
  if (!n) return;
  var date = n.createdAt ? new Date(n.createdAt.seconds*1000).toISOString() : new Date().toISOString();
  var schema = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    'headline': n.title || '',
    'description': n.excerpt || '',
    'image': n.img ? [n.img] : [],
    'datePublished': date,
    'dateModified': date,
    'author': { '@type': 'Organization', 'name': 'RideGO' },
    'publisher': {
      '@type': 'Organization',
      'name': 'RideGO',
      'url': 'https://ridego.com.ua/'
    }
  };
  var s = document.createElement('script');
  s.type = 'application/ld+json';
  s.id = 'schema-news';
  s.textContent = JSON.stringify(schema);
  document.head.appendChild(s);
}
