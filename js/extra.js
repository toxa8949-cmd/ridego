// Завантажити дані після повного завантаження DOM
document.addEventListener('DOMContentLoaded', function() {
  // Очистити поле пошуку при завантаженні (браузер може автозаповнити)
  var searchEl = document.getElementById('headerSearch');
  if (searchEl) { searchEl.value = ''; searchEl.setAttribute('autocomplete', 'off'); }

  setTimeout(loadFirebaseData, 300);
  setTimeout(loadSiteNews, 800);
});

// ── REVIEWS ──────────────────────────────────────────────────────
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

  // Якщо не залогінений
  if (!isLoggedIn || !currentUser || !currentUser.uid) {
    formWrap.style.display  = 'none';
    alreadyEl.style.display = 'none';
    loginEl.style.display   = '';
    return;
  }
  // Якщо це свій профіль — не показувати форму
  if (currentUser.uid === sellerUid) {
    formWrap.style.display  = 'none';
    alreadyEl.style.display = 'none';
    loginEl.style.display   = 'none';
    return;
  }
  // Перевірити чи вже залишив відгук
  loginEl.style.display = 'none';
  if (!window._db) { formWrap.style.display = ''; return; }
  window._db.collection('reviews')
    .where('reviewerUid', '==', currentUser.uid)
    .where('sellerUid',   '==', sellerUid)
    .get().then(function(snap) {
      if (snap.empty) {
        formWrap.style.display  = '';
        alreadyEl.style.display = 'none';
      } else {
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
    // Оновити список відгуків
    _loadSellerReviews(_reviewSellerUid);
  }).catch(function(e) {
    showToast('⚠️ Помилка: ' + e.message);
  });
}

function _loadSellerReviews(sellerUid) {
  if (!window._db) return;
  window._db.collection('reviews')
    .where('sellerUid', '==', sellerUid)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get().then(function(snap) {
      var revs = snap.docs.map(function(d){ return d.data(); });
      var avg = revs.length ? revs.reduce(function(s,r){ return s+r.rating; }, 0) / revs.length : 0;
      document.getElementById('rev-avg').textContent = avg > 0 ? avg.toFixed(1) : '—';
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
        var initials = (r.reviewerName||'?').split(' ').map(function(w){ return w[0]; }).join('').slice(0,2).toUpperCase();
        var stars = '★'.repeat(r.rating) + '☆'.repeat(5-r.rating);
        var date = r.createdAt ? new Date(r.createdAt.seconds*1000).toLocaleDateString('uk-UA') : '';
        return '<div class="review-card">' +
          '<div style="display:flex;align-items:flex-start;gap:14px">' +
          '<div style="width:44px;height:44px;border-radius:50%;background:' + colors[i%colors.length] + ';display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:#fff;flex-shrink:0">' + initials + '</div>' +
          '<div style="flex:1"><div style="display:flex;justify-content:space-between;margin-bottom:4px">' +
          '<span style="font-weight:700;font-size:14px">' + (r.reviewerName||'Анонім') + '</span>' +
          '<span style="font-size:11px;color:var(--text-muted)">' + date + '</span></div>' +
          '<div style="color:#ffa726;font-size:13px;margin-bottom:8px">' + stars + '</div>' +
          '<p style="font-size:14px;line-height:1.7;color:var(--text-muted);margin:0">' + r.text + '</p>' +
          '</div></div></div>';
      }).join('') :
        '<div class="empty-state"><i class="fa-regular fa-star"></i><h3>Поки немає відгуків</h3><p>Будьте першим хто залишить відгук</p></div>';
    }).catch(function(e){ console.error('reviews load:', e); });
}

// ── DELETE & REPORT LISTING ──────────────────────────────────────
function deleteListing(id) {
  // Показати модалку з причиною видалення
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.innerHTML = `
    <div style="background:var(--card-bg);border:1px solid var(--border);border-radius:20px;padding:28px;max-width:400px;width:100%">
      <div style="font-size:18px;font-weight:700;margin-bottom:6px">Видалити оголошення?</div>
      <div style="font-size:14px;color:var(--text-muted);margin-bottom:20px">Вкажіть причину — це допоможе покращити сервіс</div>
      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px">
        ${['Продано через RideGO','Продано в іншому місці','Передумав продавати','Помилка в оголошенні','Інша причина'].map(r =>
          `<label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:14px">
            <input type="radio" name="del-reason" value="${r}" style="accent-color:var(--brand)"> ${r}
          </label>`
        ).join('')}
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn-outline" style="flex:1;padding:11px" onclick="this.closest('[style*=fixed]').remove()">Скасувати</button>
        <button class="btn-primary" style="flex:1;padding:11px;background:#ef4444;border-color:#ef4444" onclick="_confirmDelete('${id}', this)">
          <i class="fa-solid fa-trash" style="margin-right:6px"></i>Видалити
        </button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

function _confirmDelete(id, btn) {
  var reason = document.querySelector('input[name="del-reason"]:checked');
  if (!reason) { showToast('⚠️ Оберіть причину видалення'); return; }
  var overlay = btn.closest('[style*=fixed]');
  if (overlay) overlay.remove();

  // Видалити з Firestore
  if (window._db && id) {
    window._db.collection('listings').doc(id).update({
      status: 'deleted',
      deletedReason: reason.value,
      deletedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(function(e){ console.error('delete error:', e); });
  }
  // Прибрати з локальних масивів
  myListings = myListings.filter(function(l){ return l.id !== id; });
  _fbListings = _fbListings.filter(function(l){ return l.id !== id; });
  if (typeof renderMyListings === 'function') renderMyListings();
  var pstat = document.getElementById('pstat-active');
  if (pstat) pstat.textContent = myListings.length;
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

// ── SEARCH ──────────────────────────────────────────────────────
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
  var results = _fbListings.concat(myListings).filter(function(l) {
    if (!l) return false;
    return (l.title && l.title.toLowerCase().includes(q)) ||
           (l.cat && l.cat.toLowerCase().includes(q)) ||
           (l.city && l.city.toLowerCase().includes(q)) ||
           (l.seller && l.seller.toLowerCase().includes(q)) ||
           (l.desc && l.desc.toLowerCase().includes(q)) ||
           (l.badge && l.badge.toLowerCase().includes(q));
  });

  // Перейти в каталог і показати результати
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

// ── NEWS ─────────────────────────────────────────
var _allNews = [];

function loadSiteNews() {
  if (!window._db) return;
  window._db.collection('news').where('published','==',true).orderBy('createdAt','desc').get()
    .then(function(snap) {
      _allNews = snap.docs.map(function(d){ return Object.assign({id:d.id}, d.data()); });
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
  if (!n) return;
  _updateSEO({
    title: n.title,
    desc: n.excerpt || '',
    img: n.img || '',
    url: 'https://ridego-sigma.vercel.app/#news/' + id
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
    + '<h1 style="font-size:clamp(22px,3vw,32px);font-weight:800;margin-bottom:20px;line-height:1.3">'+(n.title||'')+'</h1>'
    + '<div style="font-size:16px;color:var(--text-muted);margin-bottom:24px;font-style:italic;border-left:3px solid var(--brand);padding-left:16px">'+(n.excerpt||'')+'</div>'
    + '<div class="news-article-body" style="font-size:16px;line-height:1.8">'+(n.body||'')+'</div>';
  showPage('news-detail');
}

function filterNewsCat(cat, btn) {
  document.querySelectorAll('.news-cat-btn').forEach(function(b){ b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  var filtered = cat ? _allNews.filter(function(n){ return n.cat === cat; }) : _allNews;
  renderNewsGrid(filtered);
}

// ── SEO: динамічні meta теги ─────────────────────
function _updateSEO(opts) {
  var title = opts.title ? opts.title + ' — RideGO' : 'RideGO — Маркетплейс електротранспорту України';
  var desc = opts.desc || 'Купуй та продавай електросамокати, велосипеди, скутери. Понад 5800 оголошень по всій Україні.';
  var img = opts.img || 'https://ridego-sigma.vercel.app/og-image.jpg';
  var url = opts.url || 'https://ridego-sigma.vercel.app/';

  document.title = title;
  _setMeta('description', desc);
  _setOG('title', title);
  _setOG('description', desc);
  _setOG('image', img);
  _setOG('url', url);
  _setMeta('twitter:title', title, true);
  _setMeta('twitter:description', desc, true);
  _setMeta('twitter:image', img, true);

  var canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.href = url;
}

function _setMeta(name, content, isTwitter) {
  var attr = isTwitter ? 'name' : 'name';
  var el = document.querySelector('meta[name="'+name+'"]');
  if (!el) { el = document.createElement('meta'); el.setAttribute('name', name); document.head.appendChild(el); }
  el.setAttribute('content', content);
}

function _setOG(prop, content) {
  var el = document.querySelector('meta[property="og:'+prop+'"]');
  if (!el) { el = document.createElement('meta'); el.setAttribute('property', 'og:'+prop); document.head.appendChild(el); }
  el.setAttribute('content', content);
}

// Schema.org для оголошення
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

// Schema.org для новини
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
      'url': 'https://ridego-sigma.vercel.app/'
    }
  };
  var s = document.createElement('script');
  s.type = 'application/ld+json';
  s.id = 'schema-news';
  s.textContent = JSON.stringify(schema);
  document.head.appendChild(s);
}