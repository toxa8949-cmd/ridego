let currentSellerId = null;

function showSeller(sellerName) {
  const s = getSellerById(sellerName);
  if (s) showPage('seller', s.id);
  else showToast('ℹ️ Сторінку продавця не знайдено');
}

function _renderSellerByUid(uid) {
  if (!window._db) return;

  var av = document.getElementById('seller-page-avatar');
  if (av) { av.textContent = '?'; av.className = 'seller-avatar-big'; }
  var nameEl = document.getElementById('seller-page-name');
  if (nameEl) nameEl.textContent = 'Завантаження...';
  var gridEl = document.getElementById('seller-listings-grid');
  if (gridEl) gridEl.innerHTML = _skeletonCards ? _skeletonCards(4) : '';

  function _doRender(listings) {
    var sellerName = listings.length ? (listings[0].sellerName || listings[0].seller || 'Продавець') : 'Продавець';
    var initial = sellerName[0] ? sellerName[0].toUpperCase() : '?';

    var isDark = !document.body.classList.contains('light');
    var endColor = isDark ? '#21262d' : '#e8f0e8';
    document.getElementById('seller-cover-bg').style.background =
      'linear-gradient(160deg, #0a1a0a 0%, ' + endColor + ' 100%)';
    var av = document.getElementById('seller-page-avatar');
    av.textContent = initial;
    av.className = 'seller-avatar-big';
    document.getElementById('seller-page-name').textContent = sellerName;
    document.getElementById('seller-page-type-badge').innerHTML =
      '<span class="seller-verified-badge"><i class="fa-solid fa-circle-check" style="margin-right:4px"></i>Продавець</span>';
    document.getElementById('seller-page-desc').textContent = '';
    document.getElementById('seller-page-city').innerHTML = '';

    window._db.collection('users').doc(uid).get().then(function(snap) {
      if (!snap.exists) return;
      var d = snap.data();
      var year = d.createdAt ? new Date(d.createdAt.seconds*1000).getFullYear() : '';

      document.getElementById('seller-page-name').textContent = d.name || sellerName;
      if (year) document.getElementById('seller-page-since').innerHTML =
        '<i class="fa-solid fa-calendar" style="color:var(--brand);margin-right:5px"></i>На сайті з ' + year;
      if (d.city) document.getElementById('seller-page-city').innerHTML =
        '<i class="fa-solid fa-location-dot" style="color:var(--brand);margin-right:5px"></i>' + _esc(d.city);

      if (d.phoneVerified) {
        var metaEl = document.getElementById('seller-page-since');
        if (metaEl) {
          var phoneTag = document.createElement('span');
          phoneTag.style.cssText = 'display:inline-flex;align-items:center;gap:4px;background:#16a34a20;color:#16a34a;border-radius:20px;padding:3px 10px;font-size:11px;font-weight:700;margin-left:8px';
          phoneTag.innerHTML = '<i class="fa-solid fa-phone"></i> Верифіковано';
          if (!metaEl.querySelector('.phone-verified-tag')) {
            phoneTag.className = 'phone-verified-tag';
            metaEl.parentNode && metaEl.parentNode.appendChild(phoneTag);
          }
        }
      }

      var avEl = document.getElementById('seller-page-avatar');
      if (avEl) {
        if (d.photoUrl) {
          avEl.innerHTML = '<img src="' + d.photoUrl + '" style="width:100%;height:100%;object-fit:cover;border-radius:14px">';
        } else {
          avEl.textContent = (d.name || sellerName)[0].toUpperCase();
        }
      }

      if (d.type === 'business') {
        document.getElementById('seller-page-type-badge').innerHTML =
          '<span class="seller-shop-badge"><i class="fa-solid fa-store" style="margin-right:4px"></i>Офіційний магазин</span>';
        var isDarkNow = !document.body.classList.contains('light');
        document.getElementById('seller-cover-bg').style.background =
          'linear-gradient(160deg, #0a2a1a 0%, ' + (isDarkNow ? '#1a2e1a' : '#d4edda') + ' 100%)';
      }

      var descEl = document.getElementById('seller-page-desc');
      if (descEl && (d.about || d.desc)) {
        descEl.textContent = d.about || d.desc;
      }

      var typeBadgeEl = document.getElementById('seller-page-type-badge');
      if (typeBadgeEl) {
        typeBadgeEl.innerHTML = d.type === 'business'
          ? '<span class="seller-shop-badge"><i class="fa-solid fa-store" style="margin-right:4px"></i>Офіційний магазин</span>'
          : '<span class="seller-verified-badge"><i class="fa-solid fa-circle-check" style="margin-right:4px"></i>Продавець</span>';
      }

      if (typeof _setSellerSchema === 'function') {
        _setSellerSchema(Object.assign({ uid: uid }, d), cached);
      }

      var aboutEl = document.getElementById('seller-about-text');
      if (aboutEl) aboutEl.textContent = d.about || d.desc || '';

      var catsEl = document.getElementById('seller-cats-list');
      if (catsEl) {
        var cats = d.cats || [];
        catsEl.innerHTML = cats.map(function(c) {
          return '<span class="tag tag-blue" style="padding:6px 14px;font-size:13px">' + _esc(c) + '</span>';
        }).join('');
      }

      var contactsEl = document.getElementById('seller-contacts');
      if (contactsEl) {
        var lines = [];
        if (d.phone) lines.push('<a href="tel:' + d.phone + '" style="display:flex;align-items:center;gap:10px;color:var(--text);text-decoration:none;font-size:14px;font-weight:500"><i class="fa-solid fa-phone" style="color:var(--brand);width:16px"></i>' + _esc(d.phone) + '</a>');
        if (d.email) lines.push('<a href="mailto:' + d.email + '" style="display:flex;align-items:center;gap:10px;color:var(--text);text-decoration:none;font-size:14px"><i class="fa-solid fa-envelope" style="color:var(--brand);width:16px"></i>' + _esc(d.email) + '</a>');
        if (d.website) lines.push('<a href="' + d.website + '" target="_blank" style="display:flex;align-items:center;gap:10px;color:var(--brand);text-decoration:none;font-size:14px"><i class="fa-solid fa-globe" style="width:16px"></i>' + d.website.replace(/^https?:\/\//, '') + '</a>');
        contactsEl.innerHTML = lines.join('') || '<span style="font-size:13px;color:var(--text-muted)">Контакти не вказані</span>';
      }

      var socialsEl = document.getElementById('seller-socials');
      if (socialsEl) {
        var soc = [];
        if (d.telegram) soc.push('<a href="https://t.me/' + d.telegram.replace('@','') + '" target="_blank" style="display:flex;align-items:center;gap:10px;color:var(--text);text-decoration:none;font-size:14px"><div style="width:32px;height:32px;border-radius:8px;background:#2ca5e020;display:flex;align-items:center;justify-content:center"><i class="fa-brands fa-telegram" style="color:#2ca5e0"></i></div>' + d.telegram + '</a>');
        if (d.instagram) soc.push('<a href="https://instagram.com/' + d.instagram.replace('@','') + '" target="_blank" style="display:flex;align-items:center;gap:10px;color:var(--text);text-decoration:none;font-size:14px"><div style="width:32px;height:32px;border-radius:8px;background:#e1306c20;display:flex;align-items:center;justify-content:center"><i class="fa-brands fa-instagram" style="color:#e1306c"></i></div>' + d.instagram + '</a>');
        if (d.youtube) soc.push('<a href="' + d.youtube + '" target="_blank" style="display:flex;align-items:center;gap:10px;color:var(--text);text-decoration:none;font-size:14px"><div style="width:32px;height:32px;border-radius:8px;background:#ff000020;display:flex;align-items:center;justify-content:center"><i class="fa-brands fa-youtube" style="color:#ff0000"></i></div>YouTube</a>');
        if (d.tiktok) soc.push('<a href="https://tiktok.com/@' + d.tiktok.replace('@','') + '" target="_blank" style="display:flex;align-items:center;gap:10px;color:var(--text);text-decoration:none;font-size:14px"><div style="width:32px;height:32px;border-radius:8px;background:#00000020;display:flex;align-items:center;justify-content:center"><i class="fa-brands fa-tiktok"></i></div>' + d.tiktok + '</a>');
        socialsEl.innerHTML = soc.join('') || '<span style="font-size:13px;color:var(--text-muted)">Соцмережі не вказані</span>';
      }

      var descEl = document.getElementById('seller-page-desc');
      if (descEl) descEl.textContent = d.desc || d.about || '';

    }).catch(function(){});

    var adsEl = document.getElementById('sp-stat-ads');
    if (adsEl) adsEl.textContent = listings.length;
    ['sp-stat-sold','sp-stat-rating','sp-stat-response'].forEach(function(sid){
      var el = document.getElementById(sid); if(el) el.textContent = '—';
    });
    renderSellerListings(listings, {name: sellerName, id: 'uid:' + uid});

    var urlEl = document.getElementById('seller-page-url');
    if (urlEl) urlEl.textContent = 'https://ridego.com.ua/seller/' + uid;
    _loadSellerReviews(uid);
    _initReviewForm(uid);

    if (typeof _initFollowBtn === 'function') _initFollowBtn(uid);
    if (typeof _renderFollowersCount === 'function') _renderFollowersCount(uid);
    var svcTab = document.getElementById('seller-tab-service');
    var sellerSvc = _fbServices.concat(myServices).filter(function(s){ return s.uid === uid; })[0];
    if (svcTab) svcTab.style.display = sellerSvc ? '' : 'none';
    if (sellerSvc) {
      var svcContent = document.getElementById('seller-service-content');
      if (svcContent) svcContent.innerHTML = _buildSvcDetailBody(sellerSvc);
    }
    switchSellerTab('listings', document.querySelector('.seller-tab'));
  }

  var cached = _fbListings.filter(function(x){ return x && x.uid === uid; });
  if (cached.length > 0 || _fbListings.length > 0) {

    _doRender(cached);
  } else {

    window._db.collection('listings')
      .where('uid', '==', uid)
      .get()
      .then(function(snap) {
        var listings = snap.docs
          .map(function(d){ return Object.assign({id: d.id}, d.data()); })
          .filter(function(l){ return l.status !== 'inactive' && l.status !== 'deleted' && l.status !== 'sold'; });

        listings.sort(function(a,b){
          var ta=a.createdAt&&a.createdAt.seconds?a.createdAt.seconds:0;
          var tb=b.createdAt&&b.createdAt.seconds?b.createdAt.seconds:0;
          return tb-ta;
        });

        listings.forEach(function(l) {
          if (!_fbListings.find(function(x){ return x.id === l.id; })) {
            _fbListings.push(l);
          }
        });
        _doRender(listings);
      })
      .catch(function(e) {
        showToast('⚠️ Помилка завантаження: ' + e.message);
      });
  }
}

function renderSellerPage(id) {
  currentSellerId = id;

  if (id && id.startsWith('uid:')) {
    var uid = id.replace('uid:', '');
    _renderSellerByUid(uid);
    return;
  }

  const s = _fbSellers.find(x => x.id === id);
  if (!s) { showToast('⚠️ Продавця не знайдено'); return; }

  try {
  const isDark = !document.body.classList.contains('light');
  const endColor = isDark ? '#21262d' : '#e8f0e8';
  document.getElementById('seller-cover-bg').style.background =
    `linear-gradient(160deg, ${s.coverColor || '#0a1a0a'} 0%, ${endColor} 100%)`;
  const av = document.getElementById('seller-page-avatar');
  av.textContent = s.initial || (s.name||'?')[0];
  av.className = 'seller-avatar-big' + (s.type === 'shop' ? ' shop' : '');
  document.getElementById('seller-page-name').textContent = s.name;
  document.getElementById('seller-page-type-badge').innerHTML = s.type === 'shop'
    ? '<span class="seller-shop-badge"><i class="fa-solid fa-store" style="margin-right:4px"></i>Офіційний магазин</span>'
    : '<span class="seller-verified-badge"><i class="fa-solid fa-circle-check" style="margin-right:4px"></i>Перевірений</span>';
  document.getElementById('seller-page-desc').textContent = s.desc || '';
  document.getElementById('seller-page-city').innerHTML =
    `<i class="fa-solid fa-location-dot" style="color:var(--brand);margin-right:5px"></i>${s.city || ''}`;
  document.getElementById('seller-page-since').innerHTML =
    `<i class="fa-solid fa-calendar" style="color:var(--brand);margin-right:5px"></i>На сайті з ${s.since || ''}`;
  const listings = _allListings().filter(l => l && l.seller === s.name);
  const sellerSvc = _fbServices.concat(myServices).find(function(sv){ return sv.uid === s.uid; }) || null;
  ['sp-stat-ads','sp-stat-sold','sp-stat-rating','sp-stat-response'].forEach(function(sid) {
    var el = document.getElementById(sid);
    if (el) el.textContent = sid==='sp-stat-ads' ? listings.length : (s[sid.replace('sp-stat-','')] || '—');
  });
  renderSellerListings(listings, s);
  document.getElementById('seller-about-text').textContent = s.about || s.desc || '';
  const catsEl = document.getElementById('seller-cats-list');
  if (catsEl) catsEl.innerHTML = (s.cats||[]).map(c =>
    `<span class="tag tag-blue" style="padding:6px 14px;font-size:13px">${c}</span>`).join('');
  const contactsEl = document.getElementById('seller-contacts');
  if (contactsEl) contactsEl.innerHTML = [
    s.phone ? `<a href="tel:${s.phone}" style="display:flex;align-items:center;gap:10px;color:var(--text);text-decoration:none;font-size:14px;font-weight:500"><i class="fa-solid fa-phone" style="color:var(--brand);width:16px"></i>${s.phone}</a>` : '',
  ].filter(Boolean).join('');
  const socialsEl = document.getElementById('seller-socials');
  if (socialsEl) socialsEl.innerHTML = '';
  renderSellerReviews(s);
  const svcTab = document.getElementById('seller-tab-service');
  if (svcTab) svcTab.style.display = 'none';
  if (sellerSvc) {
    const svcContent = document.getElementById('seller-service-content');
    if (svcContent) {
      svcContent.innerHTML = `
        <div style="background:var(--brand-dim);border:1px solid rgba(0,200,83,.2);border-radius:20px;padding:28px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px">
          <div style="display:flex;align-items:center;gap:16px">
            <div style="width:56px;height:56px;border-radius:14px;background:var(--brand-dim);border:2px solid var(--brand);display:flex;align-items:center;justify-content:center;font-size:24px">${sellerSvc.icon}</div>
            <div>
              <div style="font-size:18px;font-weight:800;margin-bottom:4px">${sellerSvc.name}</div>
              <div style="font-size:13px;color:var(--text-muted)">${sellerSvc.city} · ${sellerSvc.hours || ''}</div>
            </div>
          </div>
          <button class="btn-primary" style="padding:11px 24px" onclick="showServiceDetail('${sellerSvc.id}')">
            <i class="fa-solid fa-wrench" style="margin-right:6px"></i>Відкрити сервіс
          </button>
        </div>
        <div class="service-services-list">
          ${sellerSvc.services.map(sv => `<div class="svc-list-item"><div><div class="svc-list-name">${sv.name}</div><div class="svc-list-desc">${sv.desc}</div></div><div class="svc-list-price">${sv.price}</div></div>`).join('')}
        </div>`;
    }
  }

  switchSellerTab('listings', document.querySelector('.seller-tab'));
  } catch(err) {
    console.error('renderSellerPage error:', err);
    showToast('⚠️ Помилка завантаження сторінки продавця');
  }
}

function renderSellerListings(listings, s) {

  const cats = [...new Set(listings.map(l => l.cat))];
  const filterEl = document.getElementById('seller-cat-filters');
  filterEl.innerHTML = [
    `<div class="filter-chip active" data-scat="all" onclick="filterSellerCat('all',this,'${s.id||''}')">Всі (${listings.length})</div>`,
    ...cats.map(c => {
      const cnt = listings.filter(l => l.cat === c).length;
      return `<div class="filter-chip" data-scat="${c}" onclick="filterSellerCat('${c}',this,'${s.id}')">${c} (${cnt})</div>`;
    })
  ].join('');

  const grid = document.getElementById('seller-listings-grid');
  const empty = document.getElementById('seller-listings-empty');
  if (!listings.length) {
    grid.innerHTML = ''; empty.style.display = '';
  } else {
    empty.style.display = 'none';
    grid.innerHTML = listings.map(l => createCard(l, 'seller')).join('');
  }
}

function filterSellerCat(cat, el, sellerId) {
  document.querySelectorAll('#seller-cat-filters .filter-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');

  var uid = sellerId && sellerId.startsWith('uid:') ? sellerId.replace('uid:', '') : null;
  var listings;
  if (uid) {
    listings = _fbListings.filter(function(l){ return l && l.uid === uid; });
  } else {
    var s = _fbSellers.find(function(x){ return x.id === sellerId; });
    listings = s ? _fbListings.filter(function(l){ return l && l.seller === s.name; }) : [];
  }
  if (cat !== 'all') listings = listings.filter(function(l){ return l.cat === cat; });
  var grid = document.getElementById('seller-listings-grid');
  grid.innerHTML = listings.map(function(l){ return createCard(l, 'seller'); }).join('');
}

function renderSellerReviews(s) {
  const revs = (s && s.reviews && Array.isArray(s.reviews)) ? s.reviews : [];
  const avg = (s && s.rating && !isNaN(s.rating)) ? s.rating : 0;
  document.getElementById('rev-avg').textContent = avg > 0 ? avg.toFixed(1) : '—';
  document.getElementById('rev-stars').textContent = avg > 0 ? ('★'.repeat(Math.round(avg)) + '☆'.repeat(5 - Math.round(avg))) : '☆☆☆☆☆';
  document.getElementById('rev-count').textContent = revs.length ? `на основі ${revs.length} відгуків` : 'Відгуків поки немає';

  const bars = [5,4,3,2,1];
  document.getElementById('rev-bars').innerHTML = bars.map(star => {
    const cnt = revs.filter(r => r.rating === star).length;
    const pct = revs.length ? Math.round(cnt / revs.length * 100) : 0;
    return `<div style="display:flex;align-items:center;gap:10px;font-size:13px">
      <span style="width:14px;text-align:right;font-weight:600;color:var(--text)">${star}</span>
      <i class="fa-solid fa-star" style="color:#ffa726;font-size:11px"></i>
      <div style="flex:1;height:8px;background:var(--dark3);border-radius:4px;overflow:hidden">
        <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,#ffa726,#ff8f00);border-radius:4px;transition:width .7s cubic-bezier(.4,0,.2,1)"></div>
      </div>
      <span style="width:24px;font-size:12px;color:var(--text-muted);font-weight:600">${cnt}</span>
    </div>`;
  }).join('');

  const colors = ['#6366f1','#ec4899','#14b8a6','#f59e0b','#22c55e','#f97316'];
  document.getElementById('reviews-list').innerHTML = revs.length ? revs.map((r, i) => {
    const eAuthor = _esc(r.author || 'Анонім');
    const eText   = _esc(r.text || '');
    const eDate   = _esc(r.date || '');
    const initials = eAuthor.replace(/&amp;|&lt;|&gt;|&quot;|&#39;/g,'').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    const color = colors[i % colors.length];
    const stars = '★'.repeat(r.rating) + '☆'.repeat(5-r.rating);
    return `<div class="review-card">
      <div style="display:flex;align-items:flex-start;gap:14px">
        <div style="width:44px;height:44px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:#fff;flex-shrink:0">${initials}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;flex-wrap:wrap;gap:6px">
            <span style="font-weight:700;font-size:14px">${eAuthor}</span>
            <span style="font-size:11px;color:var(--text-muted)">${eDate}</span>
          </div>
          <div style="color:#ffa726;font-size:13px;margin-bottom:8px;letter-spacing:1px">${stars}</div>
          <p style="font-size:14px;line-height:1.7;color:var(--text-muted);margin:0">${eText}</p>
        </div>
      </div>
    </div>`;
  }).join('') : `<div class="empty-state"><i class="fa-regular fa-star"></i><h3>Поки немає відгуків</h3><p>Будьте першим хто залишить відгук</p></div>`;
}

function switchSellerTab(tab, el) {
  ['listings','about','reviews','service'].forEach(t => {
    const el2 = document.getElementById('stab-'+t);
    if (el2) el2.style.display = t===tab ? '' : 'none';
  });
  document.querySelectorAll('.seller-tab').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
}

function copySellerLink() {
  var uid = currentSellerId ? currentSellerId.replace('uid:', '') : '';

  var path = currentSellerId && currentSellerId.startsWith('uid:')
    ? '/seller/' + uid
    : (currentSellerId ? '/seller/' + currentSellerId : '/');
  var url = location.origin + path;
  navigator.clipboard && navigator.clipboard.writeText(url).catch(function(){});
  showToast('🔗 Посилання скопійовано!');
}

