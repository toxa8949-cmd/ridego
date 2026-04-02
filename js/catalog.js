// ── BRANDS, CAT_SPECIFIC, фільтри, ADD_BRANDS, ADD_MODELS, spec fields ──
const BRANDS = {
  'Електросамокати': [
    'Acer',
    'Apollo',
    'Blaupunkt',
    'Crosser',
    'Cruzzer',
    'Currus',
    'Dualtron',
    'E-Scooter',
    'E-Twow',
    'Forte (scooter)',
    'Gelius',
    'GIANT (scooter)',
    'Hikerboy',
    'Hoverbot',
    'Inmotion',
    'Inokim',
    'Joyor',
    'Kaabo',
    'KingSong',
    'Kugoo',
    'Lankeleisi',
    'Mantis',
    'Maxxter',
    'MegaDrive',
    'Mercane',
    'Navee',
    'Ninebot',
    'Ninebot (Segway)',
    'PRIME3',
    'Proove',
    'Razor',
    'Ruitoo',
    'Speedway',
    'Swagtron',
    'Tecros',
    'Tesla (scooter)',
    'Turboant',
    'Vortex',
    'Vsett',
    'Wegoboard',
    'Wolf Warrior',
    'X-Scooter',
    'Xiaomi',
  ],
  'Велосипеди': [
    'Apollo',
    'Ardis',
    'Author',
    'Avanti',
    'Azimut',
    'Batavus',
    'Bergamont',
    'Bianchi',
    'BMC',
    'Bulls',
    'Cannondale',
    'Colnago',
    'Commencal',
    'Conway',
    'Corso',
    'Cross',
    'CTM',
    'Cube',
    'Cyclone',
    'De Rosa',
    'Discovery',
    'Dorozhnik',
    'Evil',
    'Felt',
    'Focus',
    'Formula',
    'Fuji',
    'Gazelle',
    'Ghost',
    'Giant',
    'GT',
    'Intenzo',
    'Kellys',
    'Kinetic',
    'KTM',
    'Lapierre',
    'Leon',
    'Look',
    'Marin',
    'Mascotte',
    'Merida',
    'Mongoose',
    'Norco',
    'Nukeproof',
    'Orbea',
    'Pegasus',
    'Pinarello',
    'Pivot',
    'Polygon',
    'Pride',
    'Raleigh',
    'Ridley',
    'Rocky Mountain',
    'Romet',
    'Santa Cruz',
    'Scott',
    'Specialized',
    'Spelli',
    'Stern',
    'Stevens',
    'Transition',
    'Trek',
    'Univega',
    'Vitus',
    'Whyte',
    'Wilier',
    'Winner',
    'Winora',
    'Yeti',
  ],
  'Електровелосипеди': [
    'Ado',
    'Ampler',
    'Anomaly Energy',
    'Bafang',
    'Batavus',
    'Bezior',
    'Cannondale',
    'Corso (ebike)',
    'Cowboy',
    'Crosser',
    'Cube',
    'Delfast',
    'Dorozhnik',
    'E-motion',
    'Eleek',
    'Eleglide',
    'Engwe',
    'ESKUTE',
    'Fafrees',
    'Fiido',
    'Focus',
    'Formula (ebike)',
    'Gazelle',
    'Ghost',
    'Giant',
    'Gogobest',
    'Gunai',
    'Haibike',
    'Heybike',
    'Hidoes',
    'Himo',
    'Hitway',
    'Hoverbot',
    'Jasion',
    'KTM',
    'Lankeleisi',
    'Lapierre',
    'Lectric',
    'Merida',
    'Moustache',
    'NCM',
    'Randride',
    'Richbit',
    'Riese & Müller',
    'Rooder',
    'Samebike',
    'Scott',
    'Specialized',
    'Stromer',
    'Tenways',
    'Tern',
    'Trek',
    'VanMoof',
    'Velowave',
    'Voltronic',
    'Winora',
    'Yuba',
  ],
  'Електроскутери': [
    'AIMA',
    'Askoll',
    'Ather',
    'Atlas',
    'BMW CE 02',
    'BMW CE 04',
    'Chopper',
    'Citycoco',
    'Corso (scooter)',
    'Doohan',
    'Electra',
    'Eskooter',
    'EVOBIKE',
    'Fada',
    'Forte',
    'Govecs',
    'Horwin',
    'Kugoo (scooter)',
    'Kymco',
    'LIBERTY',
    'MANTA',
    'Maxxter (scooter)',
    'Neco',
    'Nito',
    'NIU',
    'Okinawa',
    'Ola Electric',
    'Orcal',
    'Piaggio',
    'Revolt',
    'Rieju',
    'Rooder',
    'Seev',
    'Segway',
    'Silence',
    'SPARK',
    'Super Soco',
    'SYM',
    'Torrot',
    'Vespa Electric',
    'Vmoto',
    'Vuka',
    'W-TEC',
    'Yadea',
    'Zero',
  ],
  'Електромотоцикли': [
    'Arc',
    'BMW',
    'Cake',
    'CSC',
    'Curtiss',
    'Damon',
    'Davinci',
    'Ducati',
    'Energica',
    'GasGas',
    'Harley-Davidson',
    'Honda',
    'Husqvarna',
    'Indian',
    'Kawasaki',
    'KOVE',
    'KTM',
    'Lightning',
    'LiveWire',
    'Maeving',
    'Revolt',
    'RGNT',
    'Sondors',
    'Stark',
    'Sur Ron',
    'Talaria',
    'Tarform',
    'Ultraviolette',
    'Verge',
    'Yamaha',
    'Zero Motorcycles',
  ],

};

function _fs(id,label,opts){
  return `<div class="fp-group"><label>${label}</label><select class="fp-select" id="${id}" onchange="updateActiveFilters()">`
    + `<option value="">Будь-який</option>`
    + opts.map(o=>`<option>${o}</option>`).join('')
    + `</select></div>`;
}
function _fRow(...fields){ return `<div class="fp-grid" style="margin-top:0">${fields.join('')}</div>`; }

const CAT_SPECIFIC = {
  'Електросамокати': _fRow(
    _fs('fp-battery','Батарея (Ah)',['до 7 Ah','7–10 Ah','10–15 Ah','15–20 Ah','20+ Ah']),
    _fs('fp-speed','Макс. швидкість',['до 20 км/год','20–25 км/год','25–35 км/год','35–45 км/год','45+ км/год']),
    _fs('fp-range','Запас ходу',['до 20 км','20–40 км','40–60 км','60–90 км','90+ км']),
    _fs('fp-motor-w','Потужність (Вт)',['до 250','250–500','500–1000','1000–1500','1500+']),
    _fs('fp-wheel','Розмір коліс',['8"','8.5"','10"','11"','12.5"']),
    _fs('fp-suspension','Підвіска',['Без підвіски','Передня','Повна']),
    _fs('fp-ip','IP-рейтинг',['IPX4','IPX5','IPX6']),
  ),
  'Велосипеди': _fRow(
    _fs('fp-frame','Тип рами',['Гірський (MTB)','Шосейний','Міський','BMX','Гравій','Туристичний']),
    _fs('fp-wheel','Розмір коліс',['20"','24"','26"','27.5"','29"']),
    _fs('fp-gears','Передачі',['Без передач','1–3','6–8','9–11','21+']),
    _fs('fp-frame-mat','Матеріал рами',['Алюміній','Сталь','Карбон','Хромолі','Титан']),
    _fs('fp-brakes','Гальма',['V-brake','Механічний диск','Гідравлічний диск','Обідні']),
    _fs('fp-suspension','Підвіска',['Жорстка (HT)','Хардтейл','Повна (FS)']),
  ),
  'Електровелосипеди': _fRow(
    _fs('fp-motor-w','Потужність (Вт)',['до 250','250–350','350–500','500–750','750+']),
    _fs('fp-battery','Батарея (Ah)',['до 10 Ah','10–14 Ah','14–17 Ah','17–20 Ah','20+ Ah']),
    _fs('fp-range','Запас ходу',['до 40 км','40–60 км','60–80 км','80–120 км','120+ км']),
    _fs('fp-motor-pos','Тип мотора',['Задній хаб','Передній хаб','Середній (BB)']),
    _fs('fp-pas','Рівні PAS',['1–3','1–5','1–9']),
    _fs('fp-frame','Тип рами',['Складний','Гірський','Міський','Фет-байк','Вантажний']),
    _fs('fp-wheel','Розмір коліс',['20"','24"','26"','27.5"','28"','29"']),
    _fs('fp-speed','Макс. швидкість',['до 25 км/год','25–35 км/год','35–45 км/год','45+ км/год']),
    _fs('fp-display','Дисплей',['Є','Немає']),
  ),
  'Електроскутери': _fRow(
    _fs('fp-motor-w','Потужність (Вт)',['до 500','500–1200','1200–3000','3000–5000','5000+']),
    _fs('fp-battery','Батарея (Ah)',['до 20 Ah','20–40 Ah','40–60 Ah','60+ Ah']),
    _fs('fp-speed','Макс. швидкість',['до 45 км/год','45–70 км/год','70–100 км/год','100+ км/год']),
    _fs('fp-range','Запас ходу',['до 50 км','50–80 км','80–120 км','120+ км']),
    _fs('fp-battery-t','Тип АКБ',['Літій-іонний','LiFePO4','Свинцево-кислотний']),
    _fs('fp-seats','Кількість місць',['1','2']),
    _fs('fp-wheel','Розмір коліс',['10"','12"','14"','16"']),
    _fs('fp-suspension','Підвіска',['Телескопічна','Перевернута','Маятник','Жорстка']),
    _fs('fp-brakes','Гальма',['Механічні дискові','Гідравлічні дискові','Барабанні']),
    _fs('fp-cert','Документи',['Є, розмитнений','Є без розмитнення','Без документів']),
  ),
  'Електромотоцикли': _fRow(
    _fs('fp-motor-w','Потужність (кВт)',['до 5 кВт','5–10 кВт','10–20 кВт','20–50 кВт','50+ кВт']),
    _fs('fp-battery','Батарея (кВт·год)',['до 5','5–10','10–15','15–20','20+']),
    _fs('fp-speed','Макс. швидкість',['до 80 км/год','80–120 км/год','120–160 км/год','160+ км/год']),
    _fs('fp-range','Запас ходу',['до 100 км','100–150 км','150–200 км','200+ км']),
    _fs('fp-charge-t','Час зарядки',['до 1 год','1–2 год','2–4 год','4–8 год','8+ год']),
    _fs('fp-charge-std','Стандарт зарядки',['AC (домашня розетка)','DC Fast Charge','CHAdeMO','CCS Combo']),
    _fs('fp-motor-t','Тип мотора',['Синхронний AC','Асинхронний AC','Постійного струму DC']),
    _fs('fp-torque','Крутний момент (Нм)',['до 80','80–150','150–250','250+']),
    _fs('fp-suspension','Підвіска',['Телескопічна / Маятник','Перевернута / Моноамортизатор','Повна']),
    _fs('fp-brakes','Гальма',['Гідравлічні дискові','ABS','Комбіновані CBS+ABS']),
    _fs('fp-cert','Документи',['Є, розмитнений','Є без розмитнення','Без документів']),
  ),
};


// ── Каталог UI: фільтри, пошук, пагінація, layout ──
let selectedCat = null;
let currentSort = 'new';
let currentLayout = 'grid';
let conditionFilter = '';

function selectTransport(btn) {
  const wasSelected = btn.classList.contains('selected');
  document.querySelectorAll('.transport-btn').forEach(b => b.classList.remove('selected'));
  if (wasSelected) {
    selectedCat = null;
    _setPath('/catalog');
    document.getElementById('filter-panel').classList.remove('open');
    document.getElementById('catalog-results-wrap').style.display = 'none';
    const div = document.getElementById('catalog-divider');
    if (div) div.style.display = 'none';
    return;
  }
  btn.classList.add('selected');
  selectedCat = btn.dataset.cat;

  var slug = CAT_TO_SLUG[selectedCat];
  if (slug) _setPath('/category/' + slug);
  openFilterPanel(selectedCat);
}

function initFilterOblast() {
  const sel = document.getElementById('fp-oblast');
  if (!sel || sel.options.length > 1) return;
  Object.keys(UA_GEO).sort((a,b)=>a.localeCompare(b,'uk')).forEach(name => {
    const opt = document.createElement('option');
    opt.value = name; opt.textContent = name;
    sel.appendChild(opt);
  });
}

function onFilterOblastChange() {
  const oblast = document.getElementById('fp-oblast').value;
  const citySel = document.getElementById('fp-city');
  citySel.innerHTML = '<option value="">Усі міста</option>';
  citySel.disabled = !oblast;
  if (!oblast) { updateActiveFilters(); return; }

  const raions = UA_GEO[oblast]?.raions || {};
  const allCities = [...new Set(Object.values(raions).flatMap(r => r.cities))].sort((a,b)=>a.localeCompare(b,'uk'));
  allCities.forEach(c => {
    const o = document.createElement('option');
    o.value = c; o.textContent = c;
    citySel.appendChild(o);
  });
  citySel.disabled = false;
  updateActiveFilters();
}

function onFpBrandChange() {
  const brand    = document.getElementById('fp-brand')?.value;
  const modelSel = document.getElementById('fp-model');
  if (!modelSel) { updateActiveFilters(); return; }

  modelSel.innerHTML = '<option value="">Будь-яка</option>';
  const models = ADD_MODELS[brand] || [];
  if (models.length && brand) {
    models.forEach(m => {
      const o = document.createElement('option');
      o.value = m; o.textContent = m;
      modelSel.appendChild(o);
    });
    modelSel.disabled = false;
  } else {
    modelSel.disabled = true;
  }
  updateActiveFilters();
}

function openFilterPanel(cat) {
  initFilterOblast();
  const brandSel = document.getElementById('fp-brand');
  brandSel.innerHTML = '<option value="">Будь-який</option>';
  (BRANDS[cat] || []).forEach(b => { const o = document.createElement('option'); o.value = b; o.textContent = b; brandSel.appendChild(o); });

  const modelSel = document.getElementById('fp-model');
  if (modelSel) { modelSel.innerHTML = '<option value="">Будь-яка</option>'; modelSel.disabled = true; }
  document.getElementById('fp-title').textContent = 'Фільтри: ' + cat;
  document.getElementById('fp-specific').innerHTML = CAT_SPECIFIC[cat] || '';
  document.getElementById('filter-panel').classList.add('open');
  document.getElementById('catalog-results-wrap').style.display = 'none';
  const divider = document.getElementById('catalog-divider');
  if (divider) divider.style.display = '';
  conditionFilter = '';
  document.querySelectorAll('#fp-condition .pill').forEach((p,i) => p.classList.toggle('active', i===0));

  setTimeout(function() { if (typeof _initPriceSlider === 'function') _initPriceSlider(); }, 50);
  setTimeout(() => {
    const divEl = document.getElementById('catalog-divider');
    if (divEl) divEl.scrollIntoView({ behavior:'smooth', block:'start' });
    else document.getElementById('filter-panel').scrollIntoView({ behavior:'smooth', block:'start' });
  }, 120);
  updateResultCount();
}

function setPill(el, groupId) {
  document.querySelectorAll('#'+groupId+' .pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  conditionFilter = el.dataset.val;
  updateActiveFilters();
}

function updateResultCount() {
  const count = getFilteredData().length;
  const el = document.getElementById('fp-result-count');
  if(el) el.textContent = count;
}

var _debounceTimers = {};
function _debounce(key, fn, delay) {
  clearTimeout(_debounceTimers[key]);
  _debounceTimers[key] = setTimeout(fn, delay || 200);
}

function updateActiveFilters() {
  updateResultCount();
  const chips = [];
  const brand  = document.getElementById('fp-brand')?.value;
  const model  = document.getElementById('fp-model')?.value;
  const oblast = document.getElementById('fp-oblast')?.value;
  const city   = document.getElementById('fp-city')?.value;
  const pFrom  = document.getElementById('fp-price-from')?.value;
  const pTo    = document.getElementById('fp-price-to')?.value;
  if (brand)  chips.push({ label: brand, i: 0 });
  if (model)  chips.push({ label: model, i: 1 });
  if (oblast) chips.push({ label: oblast, i: 2 });
  if (city)   chips.push({ label: city, i: 3 });
  if (pFrom || pTo) chips.push({ label: (pFrom||'0')+' — '+(pTo||'∞')+' грн', i: 4 });
  if (conditionFilter) chips.push({ label: conditionFilter, i: 5 });
  window._filterChipActions = [
    () => { document.getElementById('fp-brand').value=''; onFpBrandChange(); },
    () => { document.getElementById('fp-model').value=''; updateActiveFilters(); },
    () => { document.getElementById('fp-oblast').value=''; onFilterOblastChange(); },
    () => { document.getElementById('fp-city').value=''; updateActiveFilters(); },
    () => { document.getElementById('fp-price-from').value=''; document.getElementById('fp-price-to').value=''; updateActiveFilters(); },
    () => { setPill(document.querySelector('#fp-condition .pill'),'fp-condition'); },
  ];
  document.getElementById('active-filters').innerHTML = chips.map(c =>
    `<div class="af-chip">${c.label}<button onclick="window._filterChipActions[${c.i}]()">×</button></div>`).join('');

  _debounce('runSearch', function() {
    if (document.getElementById('catalog-results-wrap').style.display !== 'none') {
      runSearch();
    }
  }, 250);
}

function clearFilters() {
  ['fp-brand','fp-model','fp-city','fp-oblast'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.value=''; if(id==='fp-model') el.disabled=true; }
  });
  ['fp-price-from','fp-price-to'].forEach(id => { const el = document.getElementById(id); if(el) el.value=''; });

  var fromRange = document.getElementById('fp-price-from-range');
  var toRange   = document.getElementById('fp-price-to-range');
  if (fromRange) fromRange.value = 0;
  if (toRange)   toRange.value   = PRICE_MAX;
  _updatePriceSliderFill(0, PRICE_MAX);
  var lbl = document.getElementById('price-range-label');
  if (lbl) lbl.textContent = '\u0411\u0443\u0434\u044c-\u044f\u043a\u0430';
  document.querySelectorAll('.price-preset').forEach(function(b){ b.classList.remove('active'); });
  conditionFilter = '';
  document.querySelectorAll('#fp-condition .pill').forEach((p,i) => p.classList.toggle('active',i===0));
  document.querySelectorAll('#fp-specific select').forEach(s => s.value='');
  updateActiveFilters();
}

function getFilteredData() {
  let data = _allListings().filter(l => l && l.cat && l.price != null && l.status !== 'deleted' && l.status !== 'sold');
  if (selectedCat) data = data.filter(l => l.cat === selectedCat);
  const oblast = document.getElementById('fp-oblast')?.value;
  const city   = document.getElementById('fp-city')?.value;
  const brand  = document.getElementById('fp-brand')?.value;
  const model  = document.getElementById('fp-model')?.value;
  const pFrom  = parseInt(document.getElementById('fp-price-from')?.value) || 0;
  const pTo    = parseInt(document.getElementById('fp-price-to')?.value) || Infinity;
  if (oblast && !city) {
    const raions = UA_GEO[oblast]?.raions || {};
    const oblastCities = new Set(Object.values(raions).flatMap(r => r.cities));
    data = data.filter(l => oblastCities.has(l.city) || l.city === oblast || (l.fullLoc||'').includes(oblast));
  }
  if (city)  data = data.filter(l => l.city === city);
  if (brand) data = data.filter(l => l.title && l.title.toLowerCase().includes(brand.toLowerCase()));
  if (model) data = data.filter(l => l.title && l.title.toLowerCase().includes(model.toLowerCase()));
  if (pFrom) data = data.filter(l => +l.price >= pFrom);
  if (pTo < Infinity) data = data.filter(l => +l.price <= pTo);
  if (conditionFilter) data = data.filter(l => l.condition === conditionFilter);
  return data;
}

const PAGE_SIZE = 12;
var _catalogData  = [];
var _catalogPage  = 0;
var _catalogAllShown = false;

function runSearch() {
  var data = getFilteredData();
  _cleanExpiredPromos(data);

  var topData     = data.filter(function(l){ return _isPromoActive(l) && l.promo === 'top'; });
  var regularData = data.filter(function(l){ return !(l.promo === 'top' && _isPromoActive(l)); });

  var topSec = document.getElementById('catalog-top-section');
  var topEl  = document.getElementById('catalog-top-listings');
  var allLbl = document.getElementById('catalog-all-label');
  if (topSec && topEl) {
    if (topData.length > 0) {
      topSec.style.display = '';
      topEl.innerHTML = topData.map(function(l){ return createCard(l,'catalog'); }).join('');
    } else {
      topSec.style.display = 'none';
      topEl.innerHTML = '';
    }
  }
  if (allLbl) allLbl.style.display = topData.length > 0 ? '' : 'none';

  regularData = _sortWithPromo(regularData, currentSort);

  _catalogData     = regularData;
  _catalogPage     = 0;
  _catalogAllShown = false;

  const wrap = document.getElementById('catalog-results-wrap');
  if (wrap) wrap.style.display = '';
  document.getElementById('results-num').textContent = data.length;
  document.getElementById('results-cat-label').textContent = selectedCat ? 'Категорія: ' + selectedCat : 'Всі категорії';

  const grid = document.getElementById('catalog-listings');
  grid.className = 'listing-grid' + (currentLayout === 'list' ? ' list-view' : '');

  if (!regularData.length && !topData.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fa-solid fa-search"></i><h3>Нічого не знайдено</h3><p>Спробуйте змінити фільтри</p></div>`;
    _removePaginationUI();
  } else if (!regularData.length) {
    grid.innerHTML = '';
    _removePaginationUI();
  } else {
    grid.innerHTML = '';
    _appendCatalogPage();
  }
  setTimeout(() => wrap.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
}

function _appendCatalogPage() {
  const grid = document.getElementById('catalog-listings');
  if (!grid || !_catalogData.length) return;

  const start = _catalogPage * PAGE_SIZE;
  const slice = _catalogData.slice(start, start + PAGE_SIZE);
  if (!slice.length) return;

  const BANNER_INTERVAL = 8;
  const shopBanners = _fbSellers.filter(s => s.type === 'shop' && s.banner);
  let html = '';
  let shopBannerIdx = Math.floor(start / BANNER_INTERVAL);
  let regularCount = 0;

  slice.forEach((l, i) => {
    if (_isPromoActive(l) && l.promo === 'banner') {

      var seller = _fbSellers.find(function(s){ return s.uid === l.uid; });
      if (seller) {
        html += createShopBanner(seller);
      } else {
        html += createCard(l, 'catalog');
      }
    } else {
      html += createCard(l, 'catalog');
      regularCount++;
      const globalIdx = start + i;

      if (regularCount % BANNER_INTERVAL === 0 && shopBannerIdx < shopBanners.length) {
        html += createShopBanner(shopBanners[shopBannerIdx++]);
      }
    }
  });

  grid.insertAdjacentHTML('beforeend', html);
  _catalogPage++;

  const shown = _catalogPage * PAGE_SIZE;
  _catalogAllShown = shown >= _catalogData.length;
  _updatePaginationUI();
}

function _updatePaginationUI() {
  var existing = document.getElementById('catalog-load-more-wrap');
  if (_catalogAllShown) {
    if (existing) existing.remove();
    _detachInfiniteScroll();
    return;
  }
  if (!existing) {
    var div = document.createElement('div');
    div.id = 'catalog-load-more-wrap';
    div.style.cssText = 'display:flex;justify-content:center;padding:28px 0 8px;grid-column:1/-1';
    div.innerHTML = `<button id="catalog-load-more-btn" onclick="_appendCatalogPage()"
      style="padding:13px 36px;border-radius:50px;border:1px solid var(--brand);color:var(--brand);
             background:transparent;font-size:14px;font-weight:600;cursor:pointer;transition:all .2s;font-family:inherit"
      onmouseover="this.style.background='var(--brand-dim)'" onmouseout="this.style.background='transparent'">
      <i class="fa-solid fa-chevron-down" style="margin-right:8px"></i>
      Завантажити ще
      <span style="opacity:.6;font-weight:400;margin-left:6px" id="catalog-remaining-count"></span>
    </button>`;
    document.getElementById('catalog-listings').after(div);
    _attachInfiniteScroll();
  }

  var remEl = document.getElementById('catalog-remaining-count');
  if (remEl) {
    var remaining = _catalogData.length - _catalogPage * PAGE_SIZE;
    remEl.textContent = remaining > 0 ? '(' + remaining + ' ще)' : '';
  }
}

function _removePaginationUI() {
  var el = document.getElementById('catalog-load-more-wrap');
  if (el) el.remove();
  _detachInfiniteScroll();
}

var _infiniteScrollObserver = null;
function _attachInfiniteScroll() {
  if (_infiniteScrollObserver || typeof IntersectionObserver === 'undefined') return;
  var sentinel = document.getElementById('catalog-load-more-wrap');
  if (!sentinel) return;
  _infiniteScrollObserver = new IntersectionObserver(function(entries) {
    if (entries[0].isIntersecting && !_catalogAllShown) {
      _appendCatalogPage();
    }
  }, { rootMargin: '200px' });
  _infiniteScrollObserver.observe(sentinel);
}

function _detachInfiniteScroll() {
  if (_infiniteScrollObserver) {
    _infiniteScrollObserver.disconnect();
    _infiniteScrollObserver = null;
  }
}

function setSort(sort, el) {
  currentSort = sort;
  document.querySelectorAll('.sort-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  runSearch();
}

function setLayout(mode) {
  currentLayout = mode;
  document.getElementById('lt-grid').classList.toggle('active', mode === 'grid');
  document.getElementById('lt-list').classList.toggle('active', mode === 'list');
  const grid = document.getElementById('catalog-listings');
  if (grid) grid.className = 'listing-grid' + (mode === 'list' ? ' list-view' : '');

  if (_catalogData.length) {
    grid.innerHTML = '';
    _catalogPage = 0;
    _catalogAllShown = false;
    _removePaginationUI();
    _appendCatalogPage();
  }
}

function filterCatalog(cat) {

  var slug = CAT_TO_SLUG[cat];
  if (slug) _setPath('/category/' + slug);
  else _setPath('/catalog');
  showPage('catalog');
  setTimeout(() => {
    const btn = document.querySelector('.transport-btn[data-cat="' + cat + '"]');
    if (btn) selectTransport(btn);
  }, 60);
}

function setCatFilter() {}
function renderCatalog(catFilter) {
  var topEl  = document.getElementById('catalog-top-listings');
  var allEl  = document.getElementById('catalog-listings');
  var topSec = document.getElementById('catalog-top-section');
  var allLbl = document.getElementById('catalog-all-label');
  if (!allEl) return;

  var all = _allListings().filter(function(l){ return l && l.status !== 'deleted' && l.status !== 'inactive' && l.status !== 'sold'; });

  if (catFilter) all = all.filter(function(l){ return l.cat === catFilter; });

  if (all.length === 0) {
    if (topSec) topSec.style.display = 'none';
    allEl.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:48px 24px">Оголошень поки немає.<br>Будьте першим!</p>';
    return;
  }

  var topListings = all.filter(function(l){ return l.promo === 'top'; });
  var regular = all.filter(function(l){ return l.promo !== 'top'; });

  regular.sort(function(a, b){
    var ta = a.createdAt && a.createdAt.seconds ? a.createdAt.seconds : 0;
    var tb = b.createdAt && b.createdAt.seconds ? b.createdAt.seconds : 0;
    return tb - ta;
  });

  if (topEl && topSec) {
    if (topListings.length > 0) {
      topSec.style.display = '';
      topEl.innerHTML = topListings.map(function(l){ return createCard(l,'catalog'); }).join('');
    } else {
      topSec.style.display = 'none';
    }
  }

  if (allLbl) allLbl.style.display = topListings.length > 0 ? '' : 'none';
  allEl.innerHTML = regular.map(function(l){ return createCard(l,'catalog'); }).join('');
}

function createShopBanner(s) {
  return `
  <div class="shop-banner" onclick="showSeller('${s.id}')">
    <div class="shop-banner-logo">${s.initial}</div>
    <div class="shop-banner-info">
      <div class="shop-banner-name">
        ${s.name}
        <span class="shop-banner-verified">✓ Верифіковано</span>
      </div>
      <div class="shop-banner-desc">${s.desc || 'Офіційний магазин електротранспорту'}</div>
      <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
        ${(s.tags||[]).map(t=>`<span style="background:var(--brand-dim);color:var(--brand);font-size:11px;font-weight:600;padding:2px 9px;border-radius:50px">${t}</span>`).join('')}
      </div>
    </div>
    <div class="shop-banner-stats">
      <div>
        <div class="shop-banner-stat-num">${s.listings || 0}</div>
        <div class="shop-banner-stat-l">Оголошень</div>
      </div>
      <div>
        <div class="shop-banner-stat-num">${s.sold || 0}</div>
        <div class="shop-banner-stat-l">Продано</div>
      </div>
      <div>
        <div class="shop-banner-stat-num">${s.rating || '—'}</div>
        <div class="shop-banner-stat-l">Рейтинг</div>
      </div>
    </div>
    <button class="shop-banner-btn" onclick="event.stopPropagation();showSeller('${s.id}')">
      Відкрити магазин <i class="fa-solid fa-arrow-right" style="font-size:11px;margin-left:4px"></i>
    </button>
    <span class="shop-banner-label">Реклама</span>
  </div>`;
}


