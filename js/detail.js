const SPEC_SECTION_META = {
  general:     { label: 'Загальне',          icon: 'fa-info-circle' },
  motor:       { label: 'Двигун',            icon: 'fa-bolt' },
  battery:     { label: 'Акумулятор',        icon: 'fa-battery-full' },
  performance: { label: 'Характеристики',    icon: 'fa-gauge-high' },
  physical:    { label: 'Розміри та маса',   icon: 'fa-ruler-combined' },
  extras:      { label: 'Додатково',         icon: 'fa-star' },
};

let currentDetailId = null;
let galleryImgs = [];
let galleryIdx = 0;

function showDetail(id, _skipPush) {

  if (id && typeof _addToHistory === 'function') _addToHistory(id);

  const l = _allListings().find(x => x && x.id === id);
  if (!l) {

    if (window._db && id) {
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      var detailPage = document.getElementById('page-detail');
      if (detailPage) detailPage.classList.add('active');
      window.scrollTo({ top: 0 });

      var titleEl = document.getElementById('detail-title');
      if (titleEl) titleEl.innerHTML = '<span class="skeleton" style="display:inline-block;width:60%;height:22px;border-radius:6px"></span>';
      var imgWrap = document.getElementById('detail-main-img-wrap');
      if (imgWrap) imgWrap.innerHTML = '<div class="skeleton" style="width:100%;height:100%;border-radius:12px"></div>';
      var priceEl = document.getElementById('detail-price');
      if (priceEl) priceEl.innerHTML = '<span class="skeleton" style="display:inline-block;width:120px;height:28px;border-radius:6px"></span>';
      var descEl = document.getElementById('detail-desc');
      if (descEl) descEl.innerHTML = '<div class="skeleton" style="height:14px;margin-bottom:8px;border-radius:4px"></div><div class="skeleton" style="height:14px;width:80%;border-radius:4px"></div>';

      window._db.collection('listings').doc(id).get().then(function(snap) {
        if (!snap.exists) { showToast('⚠️ Оголошення не знайдено'); return; }
        var data = Object.assign({ id: snap.id }, snap.data());
        _fbListings.unshift(data);
        showDetail(id, _skipPush);
      }).catch(function(e) {
        if (!navigator.onLine) showToast('⚠️ Немає з\'єднання з інтернетом');
        else showToast('⚠️ Помилка завантаження: ' + e.message);
      });
    }
    return;
  }
  currentDetailId = id;

  var _revBtn = document.getElementById('reveal-phone-btn');
  var _revDiv = document.getElementById('phone-revealed');
  if (_revBtn) { _revBtn.style.display = ''; _revBtn.disabled = false; _revBtn.innerHTML = '<i class="fa-solid fa-phone" style="margin-right:8px"></i>Показати номер'; }
  if (_revDiv) _revDiv.style.display = 'none';

  _updateSEO({
    title: l.title,
    desc: l.desc ? l.desc.substring(0,160) : (l.title + ' — ' + (l.cat||'') + ' в ' + (l.city||'Україні')),
    img: _cdnOg(l.img) || l.img || '',
    url: 'https://ridego.com.ua/listing/' + id
  });
  _setListingSchema(l);

  if (window._db && id && typeof id === 'string') {
    var today = new Date().toISOString().slice(0,10);
    var _viewKey = 'ridego_view_' + id + '_' + today;
    var _alreadyViewed = false;
    try { _alreadyViewed = !!localStorage.getItem(_viewKey); } catch(e) {}

    if (!_alreadyViewed) {
      window._db.collection('analytics').doc('views_' + today).set({
        date: today,
        count: firebase.firestore.FieldValue.increment(1)
      }, { merge: true }).catch(function(){});
      window._db.collection('listings').doc(id).update({
        views: firebase.firestore.FieldValue.increment(1)
      }).catch(function(){});
      try { localStorage.setItem(_viewKey, '1'); } catch(e) {}
    }
  }

  document.title = 'RideGO — ' + l.title;
  if (!_skipPush) {
    _setPath('/listing/' + id);
  }

  document.getElementById('detail-breadcrumb').textContent = l.title;
  document.getElementById('detail-title').textContent = l.title;

  // ── SEO: оновити title і meta description динамічно ───────
  var _seoTitle = l.title
    ? (l.title + (l.city ? ' — ' + l.city : '') + (l.price ? ' за ' + l.price.toLocaleString('uk') + ' грн' : '') + ' | RideGO')
    : 'RideGO — Маркетплейс електротранспорту';
  document.title = _seoTitle;
  var _metaDesc = document.querySelector('meta[name="description"]');
  if (_metaDesc) {
    var _descParts = [];
    if (l.condition) _descParts.push(l.condition);
    if (l.cat) _descParts.push(l.cat);
    if (l.city) _descParts.push('м. ' + l.city);
    if (l.price) _descParts.push(l.price.toLocaleString('uk') + ' грн');
    var _descStr = l.desc ? l.desc.slice(0, 160) : _descParts.join(' · ');
    _metaDesc.setAttribute('content', _descStr);
  }
  // Canonical URL
  var _canonical = document.querySelector('link[rel="canonical"]');
  if (_canonical) _canonical.setAttribute('href', 'https://ridego.com.ua/listing/' + l.id);
  // OG теги
  var _ogTitle = document.querySelector('meta[property="og:title"]');
  if (_ogTitle) _ogTitle.setAttribute('content', l.title + ' — RideGO');
  var _ogImg = document.querySelector('meta[property="og:image"]');
  if (_ogImg && l.img) _ogImg.setAttribute('content', l.img);
  var _ogUrl = document.querySelector('meta[property="og:url"]');
  if (_ogUrl) _ogUrl.setAttribute('content', 'https://ridego.com.ua/listing/' + l.id);

  document.getElementById('detail-price').textContent = l.price.toLocaleString('uk') + ' грн';
  var _usdEl = document.getElementById('detail-price-usd');
  if (_usdEl) {
    var _rate = window._usdRate || 41;
    _usdEl.textContent = '≈ $' + Math.round(l.price / _rate).toLocaleString('uk');

    if (!window._usdRateFetched) {
      window._usdRateFetched = true;
      fetch('https://api.exchangerate-api.com/v4/latest/USD')
        .then(function(r){ return r.json(); })
        .then(function(d){
          if (d && d.rates && d.rates.UAH) {
            window._usdRate = d.rates.UAH;

            var el = document.getElementById('detail-price-usd');
            var pEl = document.getElementById('detail-price');
            if (el && pEl) {
              var priceNum = parseInt((pEl.textContent || '').replace(/\D/g, ''));
              if (priceNum) el.textContent = '≈ $' + Math.round(priceNum / window._usdRate).toLocaleString('uk');
            }
          }
        })
        .catch(function(){});
    }
  }

  const condColor = { 'Новий':'#00e676','Чудовий':'#69f0ae','Хороший':'#ffa726','Задовільний':'#ff5252' }[l.condition] || '#8b949e';
  document.getElementById('detail-meta').innerHTML = `
    <span style="display:flex;align-items:center;gap:5px"><i class="fa-solid fa-location-dot" style="color:var(--brand)"></i>${_esc(l.city)}</span>
    <span style="display:flex;align-items:center;gap:5px"><span style="width:8px;height:8px;border-radius:50%;background:${condColor};display:inline-block"></span>${_esc(l.condition)}</span>
    <span style="display:flex;align-items:center;gap:5px"><i class="fa-regular fa-clock" style="color:var(--brand)"></i>${_esc(l.time)}</span>
    <span style="display:flex;align-items:center;gap:5px"><i class="fa-solid fa-tag" style="color:var(--brand)"></i>${_esc(l.cat)}</span>
  `;

  renderDetailMap(l.city, l.fullLoc || `${l.city}, Україна`);

  document.getElementById('detail-badge-wrap').innerHTML = l.badge
    ? `<span class="tag ${l.badgeClass}" style="font-size:13px;padding:5px 12px">${l.badge}</span>` : '';

  galleryImgs = (l.imgs && l.imgs.length) ? l.imgs : (l.img ? [l.img] : []);
  galleryIdx = 0;
  renderGalleryImage(l);

  const thumbs = document.getElementById('detail-thumbs');
  if (l.img) {
    thumbs.innerHTML = galleryImgs.map((src, i) => `
      <div class="thumb ${i===0?'active':''}" onclick="setGalleryIdx(${i})"
        style="background-image:url(${src});background-size:cover;background-position:center"></div>`).join('');
  } else { thumbs.innerHTML = ''; }

  var sellerName = l.sellerName || l.seller || 'Продавець';
  var sellerInitial = sellerName[0] ? sellerName[0].toUpperCase() : '?';
  document.getElementById('detail-seller').textContent = sellerName;
  document.getElementById('detail-avatar').textContent = sellerInitial;

  var ratingEl = document.getElementById('detail-seller-rating');
  var sinceEl  = document.getElementById('detail-seller-since');
  var adsEl    = document.getElementById('seller-ads-count');
  var rateEl   = document.getElementById('seller-response-rate');
  if (ratingEl) ratingEl.innerHTML = '';
  if (sinceEl)  sinceEl.innerHTML  = '';
  if (rateEl)   rateEl.textContent = '—';

  var sellerUid = l.uid || null;
  window._currentDetailUid = sellerUid;
  var sellerListings = _fbListings.filter(function(x){ return x && (sellerUid ? x.uid === sellerUid : x.seller === sellerName); });
  if (adsEl) adsEl.textContent = sellerListings.length || 1;

  if (window._db && sellerUid) {
    window._db.collection('users').doc(sellerUid).get().then(function(snap) {
      if (!snap.exists) return;
      var d = snap.data();
      var createdYear = d.createdAt ? new Date(d.createdAt.seconds * 1000).getFullYear() : '';
      if (ratingEl) ratingEl.innerHTML = '<span style="color:var(--text-muted);font-size:12px">Новий продавець</span>';
      if (sinceEl && createdYear) sinceEl.innerHTML = 'На сайті з ' + createdYear;
    }).catch(function(){});
  }

  document.getElementById('detail-desc').textContent = l.desc || 'Опис не вказано';

  buildSpecTable(l);

  updateFavBtn();

  const similar = _allListings().filter(x => x && x.cat === l.cat && x.id !== id).slice(0, 4);
  document.getElementById('similar-listings').innerHTML = similar.length
    ? similar.map(s => createCard(s, 'catalog')).join('')
    : '<p style="color:var(--text-muted);font-size:14px">Схожих оголошень не знайдено</p>';

  switchDTab('specs', document.querySelector('.dtab'));

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-detail').classList.add('active');
  document.querySelectorAll('.mnav-item').forEach(b => b.classList.remove('active'));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderGalleryImage(l) {
  const wrap = document.getElementById('detail-main-img-wrap');
  if (l && l.img) {
    var fallbackIcon = l.icon || '📦';
    var detailSrc = _cdnDetail(galleryImgs[galleryIdx]) || galleryImgs[galleryIdx];
    wrap.innerHTML = `<img src="${detailSrc}" alt="${_esc(l.title || '')}" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:contain;background:var(--dark3);transition:opacity .3s" onerror="this.style.display='none';var fb=document.getElementById('detail-img-fallback');if(fb)fb.style.display='flex'"><div id="detail-img-fallback" style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:80px;opacity:.4">${_esc(l.icon || '📦')}</div>`;
  } else {
    const icon = l ? (l.icon || '📦') : '📦';
    wrap.innerHTML = `<div style="font-size:100px;color:var(--brand);opacity:.5">${icon}</div>`;
  }
}

function galleryNav(dir) {
  if (!galleryImgs.length) return;
  galleryIdx = (galleryIdx + dir + galleryImgs.length) % galleryImgs.length;
  const l = _allListings().find(x => x && x.id === currentDetailId);
  renderGalleryImage(l);
  document.querySelectorAll('#detail-thumbs .thumb').forEach((t,i) => t.classList.toggle('active', i===galleryIdx));
}

function setGalleryIdx(i) {
  galleryIdx = i;
  const l = _allListings().find(x => x && x.id === currentDetailId);
  renderGalleryImage(l);
  document.querySelectorAll('#detail-thumbs .thumb').forEach((t,j) => t.classList.toggle('active', j===i));
}

function _convertSpecs(specs) {

  if (!specs) return specs;
  var result = {};
  Object.keys(specs).forEach(function(key) {
    var val = specs[key];
    if (Array.isArray(val)) {
      result[key] = val;
    } else if (val && typeof val === 'object') {
      result[key] = Object.entries(val);
    } else {
      result[key] = val;
    }
  });
  return result;
}

function buildSpecTable(l) {
  var specsEl = document.getElementById('detail-specs-full');
  if (!specsEl) return;

  // Базові характеристики з окремих полів (battery, speed, range, weight)
  var basicRows = '';
  if (l.battery && l.battery !== '—') basicRows += '<tr><td>АКБ</td><td class="spec-val-green">' + l.battery + '</td></tr>';
  if (l.speed   && l.speed   !== '—') basicRows += '<tr><td>Макс. швидкість</td><td class="spec-val-green">' + l.speed + '</td></tr>';
  if (l.range   && l.range   !== '—') basicRows += '<tr><td>Запас ходу</td><td class="spec-val-green">' + l.range + '</td></tr>';
  if (l.weight  && l.weight  !== '—') basicRows += '<tr><td>Вага</td><td>' + l.weight + '</td></tr>';
  if (l.year    && l.year    !== '—') basicRows += '<tr><td>Рік випуску</td><td>' + l.year + '</td></tr>';
  if (l.condition) basicRows += '<tr><td>Стан</td><td>' + l.condition + '</td></tr>';

  // Якщо немає specs — показуємо тільки базові
  if (!l.specs || !Object.keys(l.specs).length) {
    if (basicRows) {
      specsEl.innerHTML = '<div class="spec-section"><div class="spec-section-title"><i class="fa-solid fa-list-check"></i>Основні характеристики</div><table class="spec-table">' + basicRows + '</table></div>';
    } else {
      specsEl.innerHTML = '<p style="color:var(--text-muted);padding:20px">Детальні характеристики відсутні</p>';
    }
    return;
  }

  var specs = _convertSpecs(l.specs);
  const order = ['general','motor','battery','performance','physical','extras'];

  Object.keys(specs).forEach(function(k){ if(order.indexOf(k)<0) order.push(k); });
  let html = '<div class="spec-section">';

  // Додаємо базові поля якщо вони є і ще не в specs
  if (basicRows) {
    html += '<div class="spec-section-title"><i class="fa-solid fa-bolt"></i>Основні</div><table class="spec-table">' + basicRows + '</table>';
  }

  order.forEach(key => {
    if (!specs[key] || !specs[key].length) return;
    const meta = SPEC_SECTION_META[key] || { label: key, icon: 'fa-circle' };
    html += `
      <div class="spec-section-title"><i class="fa-solid ${meta.icon}"></i>${meta.label}</div>
      <table class="spec-table">
        ${specs[key].map(([k,v]) => `
          <tr>
            <td>${k}</td>
            <td class="${isHighlight(k,v) ? 'spec-val-green' : ''}">${formatSpecVal(k,v)}</td>
          </tr>`).join('')}
      </table>`;
  });
  html += '</div>';
  specsEl.innerHTML = html;
}

function isHighlight(key, val) {
  const keys = ['запас ходу','макс. швидкість','потужність','ємність','кількість передач'];
  return keys.some(k => key.toLowerCase().includes(k));
}

function formatSpecVal(key, val) {
  if (val === 'Так') return '<span class="spec-val-badge" style="background:rgba(0,230,118,.15);color:var(--brand)">✓ Так</span>';
  if (val === 'Немає') return '<span class="spec-val-badge" style="background:rgba(255,255,255,.06);color:var(--text-muted)">✗ Немає</span>';
  if (key.toLowerCase().includes('стан')) {
    const c = { 'Новий':'#00e676','Чудовий':'#69f0ae','Хороший':'#ffa726','Задовільний':'#ff5252' }[val];
    if (c) return `<span class="spec-val-badge" style="background:${c}22;color:${c}">${val}</span>`;
  }
  return val;
}

function switchDTab(tab, el) {
  ['specs','desc','safety'].forEach(t => {
    document.getElementById('dtab-'+t).style.display = t===tab ? '' : 'none';
  });
  document.querySelectorAll('.dtab').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  else document.querySelectorAll('.dtab')[0]?.classList.add('active');
}

function updateFavBtn() {
  const isFav = favorites.includes(currentDetailId);
  const fb = document.getElementById('fav-detail-btn');
  if (!fb) return;
  fb.innerHTML = `<i class="fa-${isFav?'solid':'regular'} fa-heart" style="margin-right:8px"></i>${isFav?'В обраному':'В обране'}`;
  fb.style.color = isFav ? '#ff5252' : '';
}

function toggleFavDetail() {
  if (!currentDetailId) return;
  toggleFavById(currentDetailId);
  updateFavBtn();
  showToast(favorites.includes(currentDetailId) ? '❤️ Додано в обране!' : '💔 Видалено з обраного');
}

function revealPhone() {
  var btn = document.getElementById('reveal-phone-btn');
  var revealed = document.getElementById('phone-revealed');
  var phoneEl = document.getElementById('phone-number');
  if (!btn || !revealed || !phoneEl) return;

  var l = [..._fbListings, ...myListings].find(function(x){ return x && x.id === currentDetailId; });
  if (!l || !l.uid) {
    showToast('⚠️ Номер недоступний');
    return;
  }

  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="margin-right:8px"></i>Завантаження...';
  btn.disabled = true;

  window._db.collection('users').doc(l.uid).get().then(function(snap) {
    var phone = snap.exists ? snap.data().phone : '';
    if (phone) {
      phoneEl.href = 'tel:' + phone.replace(/\s/g, '');
      phoneEl.textContent = phone;
      btn.style.display = 'none';
      revealed.style.display = '';
    } else {
      btn.innerHTML = '<i class="fa-solid fa-phone" style="margin-right:8px"></i>Номер не вказано';
      btn.disabled = false;
      showToast('ℹ️ Продавець не вказав номер телефону');
    }
  }).catch(function() {
    btn.innerHTML = '<i class="fa-solid fa-phone" style="margin-right:8px"></i>Показати номер';
    btn.disabled = false;
    showToast('⚠️ Помилка завантаження');
  });
}

function toggleFav(id, btn) {
  toggleFavById(id);
  const isFav = favorites.includes(id);
  btn.classList.toggle('active', isFav);
  btn.innerHTML = `<i class="fa-${isFav?'solid':'regular'} fa-heart"></i>`;
  showToast(isFav ? '❤️ Додано в обране!' : '💔 Видалено з обраного');
  document.getElementById('pstat-favs').textContent = favorites.length;
}
function toggleFavById(id) {
  const idx = favorites.indexOf(id);
  if(idx>-1) favorites.splice(idx,1); else favorites.push(id);
}

