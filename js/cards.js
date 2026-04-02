// ── Cloudinary CDN хелпери, createCard ──
var _CLOUDINARY_BASE = 'https://res.cloudinary.com/dxgtpo5dq/image/upload';

function _cdnImg(url, opts) {
  if (!url || !url.includes('cloudinary.com')) return url;
  opts = opts || {};
  var w = opts.w || 600;
  var q = opts.q || 'auto';
  var f = opts.f || 'auto';
  var c = opts.c || 'fill';

  var transforms = 'w_' + w + ',q_' + q + ',f_' + f + ',c_' + c;
  return url.replace('/upload/', '/upload/' + transforms + '/');
}

function _cdnThumb(url) { return _cdnImg(url, { w: 400, q: 75, c: 'fill' }); }

function _cdnTiny(url) { return _cdnImg(url, { w: 20, q: 30, c: 'fill' }); }

function _cdnDetail(url) { return _cdnImg(url, { w: 1200, q: 85, c: 'limit' }); }

function _cdnOg(url) { return _cdnImg(url, { w: 1200, q: 80, c: 'fill' }); }

function createCard(l, backPage) {
  const isFav    = favorites.includes(l.id);
  const thumbSrc = _cdnThumb(l.img) || l.img;
  // ── XSS: екрануємо всі поля що надходять від користувача ──
  const eTitle      = _esc(l.title);
  const eCity       = _esc(l.city);
  const eCat        = _esc(l.cat);
  const eCondition  = _esc(l.condition);
  const eYear       = _esc(l.year);
  const eSellerName = _esc(l.sellerName || l.seller || 'Продавець');
  const eSellerUid  = _esc(l.uid || '');
  const eBargain    = _esc(l.bargain);
  const imgHtml  = l.img
    ? `<div class="listing-img-wrap"><img class="listing-img lazy-img" src="${_cdnTiny(l.img)||thumbSrc}" data-src="${thumbSrc}" alt="${eTitle}" loading="lazy" decoding="async" onerror="this.style.display='none'" style="filter:blur(8px);transition:filter .4s ease"></div>`
    : `<div class="listing-img-placeholder">${l.icon || '📦'}</div>`;
  const badgeHtml = l.badge
    ? `<div class="tag ${l.badgeClass}" style="position:absolute;top:12px;left:12px;z-index:1">${l.badge}</div>`
    : '';

  let promoClass = '';
  let promoBadge = '';
  const activePromo = _isPromoActive(l) ? l.promo : null;

  if (l.status === 'sold') {
    promoClass = 'is-sold';
    // Overlay поверх всього фото
    promoBadge = `<div class="promo-badge-sold"><i class="fa-solid fa-circle-check"></i> ПРОДАНО</div>`;
  } else if (activePromo === 'top') {
    promoClass = 'is-top';
    promoBadge = `<div class="promo-badge-top"><i class="fa-solid fa-arrow-up"></i> TOP</div>`;
  } else if (activePromo === 'highlight') {
    promoClass = 'is-highlight';
    promoBadge = `<div class="promo-badge-highlight"><i class="fa-solid fa-star"></i> Хіт</div>`;
  } else if (activePromo === 'urgent') {
    promoClass = 'is-urgent';
    promoBadge = `<div class="promo-badge-urgent"><i class="fa-solid fa-fire"></i> Терміново</div>`;
  }
  // Нормалізація specs — завжди однакові одиниці
  function _specVal(v, unit) {
    if (!v || v === '—') return null;
    var s = String(v).trim();
    if (!s) return null;
    // Якщо одиниця вже є — не дублювати
    if (unit && !s.includes(unit.trim())) return s + ' ' + unit.trim();
    return s;
  }
  const specBattery = _specVal(l.battery, 'Ah');
  const specSpeed   = _specVal(l.speed, 'км/год');
  const specRange   = _specVal(l.range, 'км');

  // XSS: екрануємо spec значення
  const eSpecBattery = _esc(specBattery);
  const eSpecSpeed   = _esc(specSpeed);
  const eSpecRange   = _esc(specRange);

  const specsHtml = (specBattery || specSpeed || specRange) ? `
    <div class="listing-specs">
      ${eSpecBattery ? `<div class="spec"><i class="fa-solid fa-battery-full"></i>${eSpecBattery}</div>` : ''}
      ${eSpecSpeed   ? `<div class="spec"><i class="fa-solid fa-gauge-high"></i>${eSpecSpeed}</div>`   : ''}
      ${eSpecRange   ? `<div class="spec"><i class="fa-solid fa-road"></i>${eSpecRange}</div>`         : ''}
    </div>` : '<div class="listing-specs-empty"></div>';

  const yearHtml = eYear ? `<span class="lv-year" style="font-size:12px;color:var(--text-muted);margin-left:6px;font-weight:500">${eYear} р.</span>` : '';
  const condHtml = eCondition
    ? `<span class="lv-condition"><i class="fa-solid fa-circle-check" style="font-size:10px"></i>${eCondition}</span>`
    : `<span class="lv-condition"><i class="fa-solid fa-circle-check" style="font-size:10px"></i>Хороший</span>`;
  // Метарядок: рік + стан — під назвою
  const metaHtml = (eYear || eCondition)
    ? `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap">
        ${eYear ? `<span style="font-size:12px;color:var(--text-muted);display:flex;align-items:center;gap:4px"><i class="fa-regular fa-calendar" style="font-size:10px"></i>${eYear} р.</span>` : ''}
        ${eCondition ? `<span style="font-size:12px;color:${l.condition==='Новий'?'var(--brand)':'var(--text-muted)'};display:flex;align-items:center;gap:4px"><i class="fa-solid fa-circle-check" style="font-size:10px"></i>${eCondition}</span>` : ''}
       </div>`
    : '';

  const _sellerUid = eSellerUid;
  const sellerBtn = `<button onclick="event.stopPropagation();${_sellerUid ? `showSellerByUid('${_sellerUid}')` : `showSeller('${_esc((l.seller||'').replace(/'/g,"\\'"))}')` };"
    style="background:none;border:none;cursor:pointer;font-size:12px;color:var(--text-muted);
           display:inline-flex;align-items:center;gap:5px;padding:0;transition:color .15s;font-family:inherit"
    onmouseover="this.style.color='var(--brand)'" onmouseout="this.style.color='var(--text-muted)'">
    <i class="fa-solid fa-user-circle" style="color:var(--brand)"></i>${eSellerName}
  </button>`;

  return `
  <div class="listing-card ${promoClass}" onclick="showDetail('${_esc(l.id)}')">

    <!-- Photo — тільки promo badges (TOP/Хіт/Терміново) -->
    <div style="position:relative;flex-shrink:0">${imgHtml}${promoBadge}</div>

    <!-- Body -->
    <div class="listing-body">

      <!-- LIST MODE top row: category + price -->
      <div class="lv-top-row">
        <span class="tag tag-blue" style="font-size:11px">${eCat}</span>
        <div class="listing-price" style="font-size:20px;margin:0;white-space:nowrap">
          ${l.price.toLocaleString('uk')} грн
        </div>
      </div>

      <!-- Title -->
      <div class="listing-title">${eTitle}</div>

      <!-- Condition + year -->
      <div class="card-pills-row">
        ${eCondition ? `<span class="card-pill card-pill-${l.condition==='Новий'?'new':l.condition==='Хороший'?'good':'used'}">${eCondition}</span>` : ''}
        ${eYear ? `<span class="card-pill card-pill-year"><i class="fa-regular fa-calendar" style="font-size:10px"></i>${eYear}</span>` : ''}
      </div>

      <!-- Price + ТОРГ/ОБМІН -->
      <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap">
        <div class="listing-price">${l.price.toLocaleString('uk')} грн</div>
        ${eBargain==='Торг' ? `<span class="card-pill card-pill-bargain">Торг</span>` : ''}
        ${eBargain==='Обмін' ? `<span class="card-pill card-pill-exchange">Обмін</span>` : ''}
        ${eBargain==='Торг+Обмін' ? `<span class="card-pill card-pill-bargain">Торг</span><span class="card-pill card-pill-exchange">Обмін</span>` : ''}
      </div>

      <!-- Specs -->
      ${specsHtml}

      <!-- Footer: продавець + кнопки -->
      <div class="listing-footer">
        <div style="display:flex;flex-direction:column;gap:4px;min-width:0">
          <button onclick="event.stopPropagation();${_sellerUid ? `showSellerByUid('${_sellerUid}')` : `showSeller('${_esc((l.seller||'').replace(/'/g,"\\'"))}')` };"
            class="card-seller-btn">
            <i class="fa-solid fa-user-circle"></i>${eSellerName}
          </button>
          <span class="loc"><i class="fa-solid fa-location-dot"></i>${eCity}</span>
        </div>
        <div style="display:flex;gap:4px;align-items:center">
          <button class="fav-btn compare-btn-card" id="cmp-btn-${_esc(l.id)}"
            onclick="event.stopPropagation();toggleCompare('${_esc(l.id)}',this)"
            style="font-size:13px;opacity:.5" title="\u041f\u043e\u0440\u0456\u0432\u043d\u044f\u0442\u0438">
            <i class="fa-solid fa-scale-balanced"></i>
          </button>
          <button class="fav-btn ${isFav?'active':''}" onclick="event.stopPropagation();toggleFav('${_esc(l.id)}',this)">
            <i class="fa-${isFav?'solid':'regular'} fa-heart"></i>
          </button>
        </div>
      </div>

      <!-- LIST MODE bottom row -->
      <div class="lv-bottom-row">
        <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
          ${sellerBtn}
          <span style="display:inline-flex;align-items:center;gap:4px;font-size:12px;color:var(--text-muted)">
            <i class="fa-solid fa-location-dot" style="color:var(--brand);font-size:11px"></i>${eCity}
          </span>
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-shrink:0">
          <button class="lv-btn" onclick="event.stopPropagation();showDetail('${_esc(l.id)}')">
            <i class="fa-solid fa-arrow-right" style="font-size:11px"></i> Переглянути
          </button>
          <button class="fav-btn ${isFav?'active':''}" onclick="event.stopPropagation();toggleFav('${_esc(l.id)}',this)" style="font-size:18px">
            <i class="fa-${isFav?'solid':'regular'} fa-heart"></i>
          </button>
        </div>
      </div>

    </div>
  </div>`;
}


