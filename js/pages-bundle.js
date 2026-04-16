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
    'KuKirin',
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
  const divider = document.getElementById('catalog-divider');
  if (divider) divider.style.display = '';
  conditionFilter = '';
  document.querySelectorAll('#fp-condition .pill').forEach((p,i) => p.classList.toggle('active', i===0));

  setTimeout(function() { if (typeof _initPriceSlider === 'function') _initPriceSlider(); }, 50);

  // На мобільних — згорнути фільтри, показати одразу результати
  if (window.innerWidth <= 768) {
    var fpBody = document.getElementById('fp-body');
    if (fpBody) fpBody.style.display = 'none';
    var icon = document.getElementById('fp-toggle-icon');
    if (icon) icon.style.transform = '';
    var sub = document.getElementById('fp-active-count');
    if (sub) sub.textContent = 'Натисніть щоб відкрити';
  } else {
    var fpBody = document.getElementById('fp-body');
    if (fpBody) fpBody.style.display = '';
    var icon = document.getElementById('fp-toggle-icon');
    if (icon) icon.style.transform = 'rotate(180deg)';
    var sub = document.getElementById('fp-active-count');
    if (sub) sub.textContent = 'Натисніть щоб згорнути';
  }

  updateResultCount();
  setTimeout(function() { runSearch(); }, 100);
}

function _toggleFilterPanel() {
  var fpBody = document.getElementById('fp-body');
  var icon = document.getElementById('fp-toggle-icon');
  var sub = document.getElementById('fp-active-count');
  if (!fpBody) return;
  var isHidden = fpBody.style.display === 'none';
  fpBody.style.display = isHidden ? '' : 'none';
  if (icon) icon.style.transform = isHidden ? 'rotate(180deg)' : '';
  if (sub) sub.textContent = isHidden ? 'Натисніть щоб згорнути' : 'Натисніть щоб відкрити';
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

  // Prefetch: якщо залишилось менше 2 сторінок локальних даних — довантажити з сервера у фоні
  var remaining = _catalogData.length - shown;
  if (remaining < PAGE_SIZE * 2 && typeof loadMoreListings === 'function' && !_allListingsLoaded && !_loadingMore) {
    loadMoreListings(function(hasMore) {
      if (hasMore) {
        // Тихо оновлюємо дані — юзер побачить нові при наступному скролі
        var data = getFilteredData();
        _cleanExpiredPromos(data);
        var regularData = data.filter(function(l){ return !(l.promo === 'top' && _isPromoActive(l)); });
        _catalogData = _sortWithPromo(regularData, currentSort);
        _catalogAllShown = false;
        var numEl = document.getElementById('results-num');
        if (numEl) numEl.textContent = data.length;
        // Оновлюємо UI кнопки
        var remEl = document.getElementById('catalog-remaining-count');
        if (remEl) {
          var newRemaining = _catalogData.length - shown;
          remEl.textContent = newRemaining > 0 ? '(' + newRemaining + (!_allListingsLoaded ? '+' : '') + ' ще)' : '';
        }
      }
    });
  }

  _updatePaginationUI();
}

function _updatePaginationUI() {
  var existing = document.getElementById('catalog-load-more-wrap');
  var shown = _catalogPage * PAGE_SIZE;
  var localExhausted = shown >= _catalogData.length;

  // Якщо локальні дані закінчились, але на сервері є ще — довантажити
  if (localExhausted && typeof loadMoreListings === 'function' && !_allListingsLoaded) {
    if (!existing) _createLoadMoreBtn();
    var btn = document.getElementById('catalog-load-more-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="margin-right:8px"></i>Завантаження...'; }
    loadMoreListings(function(hasMore) {
      if (hasMore) {
        // Перезапустити пошук з новими даними
        var data = getFilteredData();
        _cleanExpiredPromos(data);
        var regularData = data.filter(function(l){ return !(l.promo === 'top' && _isPromoActive(l)); });
        regularData = _sortWithPromo(regularData, currentSort);
        _catalogData = regularData;
        _catalogAllShown = false;
        document.getElementById('results-num').textContent = data.length;
        _appendCatalogPage();
      } else {
        _catalogAllShown = true;
        if (existing) existing.remove();
        _detachInfiniteScroll();
      }
    });
    return;
  }

  if (localExhausted) {
    _catalogAllShown = true;
    if (existing) existing.remove();
    _detachInfiniteScroll();
    return;
  }
  if (!existing) _createLoadMoreBtn();

  var remEl = document.getElementById('catalog-remaining-count');
  if (remEl) {
    var remaining = _catalogData.length - shown;
    var serverMore = (typeof _allListingsLoaded !== 'undefined' && !_allListingsLoaded) ? '+' : '';
    remEl.textContent = remaining > 0 ? '(' + remaining + serverMore + ' ще)' : '';
  }
}

function _createLoadMoreBtn() {
  var div = document.createElement('div');
  div.id = 'catalog-load-more-wrap';
  div.style.cssText = 'display:flex;justify-content:center;padding:28px 0 8px;grid-column:1/-1';
  div.innerHTML = '<button id="catalog-load-more-btn" onclick="_appendCatalogPage()"'
    + ' style="padding:13px 36px;border-radius:50px;border:1px solid var(--brand);color:var(--brand);'
    + 'background:transparent;font-size:14px;font-weight:600;cursor:pointer;transition:all .2s;font-family:inherit"'
    + ' onmouseover="this.style.background=\'var(--brand-dim)\'" onmouseout="this.style.background=\'transparent\'">'
    + '<i class="fa-solid fa-chevron-down" style="margin-right:8px"></i>'
    + 'Завантажити ще'
    + '<span style="opacity:.6;font-weight:400;margin-left:6px" id="catalog-remaining-count"></span>'
    + '</button>';
  document.getElementById('catalog-listings').after(div);
  _attachInfiniteScroll();
}

function _removePaginationUI() {
  var el = document.getElementById('catalog-load-more-wrap');
  if (el) el.remove();
  _detachInfiniteScroll();
}

var _infiniteScrollObserver = null;
var _infiniteScrollLoading = false;
function _attachInfiniteScroll() {
  if (_infiniteScrollObserver || typeof IntersectionObserver === 'undefined') return;
  var sentinel = document.getElementById('catalog-load-more-wrap');
  if (!sentinel) return;
  _infiniteScrollObserver = new IntersectionObserver(function(entries) {
    if (entries[0].isIntersecting && !_catalogAllShown && !_infiniteScrollLoading) {
      _infiniteScrollLoading = true;
      _appendCatalogPage();
      // Розблокувати через невеликий таймаут (щоб loadMore встиг почати)
      setTimeout(function() { _infiniteScrollLoading = false; }, 500);
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


let currentSellerId = null;

function showSeller(sellerName) {
  const s = getSellerById(sellerName);
  if (s) showPage('seller', s.id);
  else showToast('ℹ️ Сторінку продавця не знайдено');
}

function _renderSellerByUid(uid) {
  if (!window._db) {
    // Firebase ще не завантажився — чекаємо
    if (typeof window._onFirebaseReady === 'function') {
      window._onFirebaseReady(function() { _renderSellerByUid(uid); });
    } else {
      setTimeout(function() { _renderSellerByUid(uid); }, 1000);
    }
    return;
  }

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

      // ── Contacts sidebar ──
      var quickInfo = document.getElementById('seller-quick-info');
      if (quickInfo) {
        var qi = [];
        if (d.phone) qi.push('<a href="tel:' + _esc(d.phone) + '"><i class="fa-solid fa-phone"></i>' + _esc(d.phone) + '</a>');
        if (d.address) qi.push('<span><i class="fa-solid fa-location-dot"></i>' + _esc(d.address) + '</span>');
        if (d.city && !d.address) qi.push('<span><i class="fa-solid fa-location-dot"></i>' + _esc(d.city) + '</span>');
        if (d.hours || d.schedule) qi.push('<span><i class="fa-solid fa-clock"></i>' + _esc(d.hours || d.schedule) + '</span>');
        if (d.email) qi.push('<a href="mailto:' + _esc(d.email) + '"><i class="fa-solid fa-envelope"></i>' + _esc(d.email) + '</a>');
        if (d.website) qi.push('<a href="' + _esc(d.website) + '" target="_blank"><i class="fa-solid fa-globe"></i>' + _esc(d.website).replace(/^https?:\/\//, '') + '</a>');
        quickInfo.innerHTML = qi.join('') || '<span style="color:var(--text-muted)">Контакти не вказані</span>';
      }
      // Hide socials wrap if no socials
      var socWrap = document.getElementById('seller-socials-wrap');
      if (socWrap && !d.telegram && !d.instagram && !d.youtube && !d.tiktok && !d.website) {
        socWrap.style.display = 'none';
      }

      // ── Trust badges ──
      var trustEl = document.getElementById('seller-trust-badges');
      if (trustEl) {
        var badges = [];
        if (d.type === 'business') badges.push('<span class="seller-trust-badge"><i class="fa-solid fa-shield-halved"></i>Офіційний продавець</span>');
        if (d.phoneVerified) badges.push('<span class="seller-trust-badge"><i class="fa-solid fa-phone"></i>Телефон верифікований</span>');
        if (cached && cached.length > 5) badges.push('<span class="seller-trust-badge"><i class="fa-solid fa-bolt"></i>' + cached.length + '+ оголошень</span>');
        if (year && (new Date().getFullYear() - year) >= 1) badges.push('<span class="seller-trust-badge"><i class="fa-solid fa-clock"></i>На сайті ' + (new Date().getFullYear() - year) + '+ років</span>');
        trustEl.innerHTML = badges.join('');
      }

      // ── Social icons inline (compact) ──
      var socInline = document.getElementById('seller-socials-inline');
      if (socInline) {
        var si = [];
        if (d.telegram) si.push('<a href="https://t.me/' + _esc(d.telegram).replace('@','') + '" target="_blank" class="seller-social-icon tg" title="Telegram"><i class="fa-brands fa-telegram"></i></a>');
        if (d.instagram) si.push('<a href="https://instagram.com/' + _esc(d.instagram).replace('@','') + '" target="_blank" class="seller-social-icon ig" title="Instagram"><i class="fa-brands fa-instagram"></i></a>');
        if (d.youtube) si.push('<a href="' + _esc(d.youtube) + '" target="_blank" class="seller-social-icon yt" title="YouTube"><i class="fa-brands fa-youtube"></i></a>');
        if (d.tiktok) si.push('<a href="https://tiktok.com/@' + _esc(d.tiktok).replace('@','') + '" target="_blank" class="seller-social-icon tt" title="TikTok"><i class="fa-brands fa-tiktok"></i></a>');
        if (d.website) si.push('<a href="' + _esc(d.website) + '" target="_blank" class="seller-social-icon web" title="Сайт"><i class="fa-solid fa-globe"></i></a>');
        socInline.innerHTML = si.join('');
      }

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

  var cached = _fbListings.filter(function(x){ return x && x.uid === uid && x.status !== 'deleted' && x.status !== 'sold' && x.status !== 'inactive'; });
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
  const listings = _allListings().filter(l => l && l.seller === s.name && l.status !== 'deleted' && l.status !== 'sold' && l.status !== 'inactive');
  const sellerSvc = _fbServices.concat(myServices).find(function(sv){ return sv.uid === s.uid; }) || null;
  var adsEl2 = document.getElementById('sp-stat-ads'); if(adsEl2) adsEl2.textContent = listings.length;
  var ratEl = document.getElementById('sp-stat-rating'); if(ratEl) ratEl.textContent = s.rating || '—';
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
    listings = _fbListings.filter(function(l){ return l && l.uid === uid && l.status !== 'deleted' && l.status !== 'sold' && l.status !== 'inactive'; });
  } else {
    var s = _fbSellers.find(function(x){ return x.id === sellerId; });
    listings = s ? _fbListings.filter(function(l){ return l && l.seller === s.name && l.status !== 'deleted' && l.status !== 'sold' && l.status !== 'inactive'; }) : [];
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


const SPEC_SECTION_META = {
  general:     { label: 'Загальне',          icon: 'fa-info-circle' },
  motor:       { label: 'Двигун',            icon: 'fa-bolt' },
  battery:     { label: 'Акумулятор',        icon: 'fa-battery-full' },
  performance: { label: 'Характеристики',    icon: 'fa-gauge-high' },
  physical:    { label: 'Розміри та маса',   icon: 'fa-ruler-combined' },
  extras:      { label: 'Додатково',         icon: 'fa-star' },
};

let currentDetailId = null;

// Mobile detail layout fix — спрацьовує при resize і повороті
window.addEventListener('resize', function() {
  var _layout = document.getElementById('detail-main-layout');
  if (!_layout) return;
  if (window.innerWidth <= 900) {
    _layout.style.gridTemplateColumns = '1fr';
    _layout.style.gap = '16px';
    document.querySelectorAll('#detail-main-layout .detail-card').forEach(function(c) {
      c.style.position = 'static';
      c.style.maxWidth = '100%';
      c.style.width = '100%';
    });
  } else {
    _layout.style.gridTemplateColumns = '';
    _layout.style.gap = '';
    document.querySelectorAll('#detail-main-layout .detail-card').forEach(function(c) {
      c.style.position = '';
      c.style.maxWidth = '';
      c.style.width = '';
    });
  }
});
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
  window.currentDetailId = id;

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
  var viewsCount = l.views ? Number(l.views) : 0;
  document.getElementById('detail-meta').innerHTML = `
    <span style="display:flex;align-items:center;gap:5px"><i class="fa-solid fa-location-dot" style="color:var(--brand)"></i>${_esc(l.city)}</span>
    <span style="display:flex;align-items:center;gap:5px"><span style="width:8px;height:8px;border-radius:50%;background:${condColor};display:inline-block"></span>${_esc(l.condition)}</span>
    <span style="display:flex;align-items:center;gap:5px"><i class="fa-regular fa-clock" style="color:var(--brand)"></i>${_esc(_timeAgo(l.createdAt) || l.time)}</span>
    <span style="display:flex;align-items:center;gap:5px"><i class="fa-solid fa-tag" style="color:var(--brand)"></i>${_esc(l.cat)}</span>
    <span style="display:flex;align-items:center;gap:5px"><i class="fa-solid fa-eye" style="color:var(--brand)"></i>${viewsCount} переглядів</span>
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
  var sellerListings = _fbListings.filter(function(x){ return x && (sellerUid ? x.uid === sellerUid : x.seller === sellerName) && x.status !== 'deleted' && x.status !== 'sold' && x.status !== 'inactive'; });
  if (adsEl) adsEl.textContent = sellerListings.length || 1;

  if (window._db && sellerUid) {
    if (!window._sellersCache) window._sellersCache = {};
    var _cachedSeller = window._sellersCache[sellerUid];
    if (_cachedSeller) {
      var createdYear = _cachedSeller.createdAt ? new Date(_cachedSeller.createdAt.seconds * 1000).getFullYear() : '';
      if (ratingEl) ratingEl.innerHTML = '<span style="color:var(--text-muted);font-size:12px">Новий продавець</span>';
      if (sinceEl && createdYear) sinceEl.innerHTML = 'На сайті з ' + createdYear;
    } else {
      window._db.collection('users').doc(sellerUid).get().then(function(snap) {
        if (!snap.exists) return;
        var d = snap.data();
        window._sellersCache[sellerUid] = d;
        var createdYear = d.createdAt ? new Date(d.createdAt.seconds * 1000).getFullYear() : '';
        if (ratingEl) ratingEl.innerHTML = '<span style="color:var(--text-muted);font-size:12px">Новий продавець</span>';
        if (sinceEl && createdYear) sinceEl.innerHTML = 'На сайті з ' + createdYear;
      }).catch(function(){});
    }
  }

  var descEl = document.getElementById('detail-desc');
  if (descEl) {
    var descText = l.desc || 'Опис не вказано';
    // Зберігаємо переноси рядків, але захищаємо від XSS
    descEl.innerHTML = _esc(descText).replace(/\n/g, '<br>');
  }

  buildSpecTable(l);

  updateFavBtn();

  const candidates = _allListings().filter(x => x && x.id !== id && x.status !== 'deleted' && x.status !== 'sold' && x.status !== 'inactive');

  // Скоринг схожості
  var scored = candidates.map(function(c) {
    var score = 0;
    if (c.cat === l.cat)    score += 10;  // та сама категорія — найважливіше
    if (c.brand && l.brand && c.brand === l.brand) score += 5;  // той самий бренд
    if (c.city && l.city && c.city === l.city) score += 3;  // те саме місто
    // Ціна в межах ±30%
    if (c.price && l.price) {
      var ratio = c.price / l.price;
      if (ratio > 0.7 && ratio < 1.3) score += 2;
    }
    if (c.condition && l.condition && c.condition === l.condition) score += 1;
    return { listing: c, score: score };
  }).filter(function(s) { return s.score >= 5; }); // мін 5 балів (хоча б категорія)

  scored.sort(function(a, b) { return b.score - a.score; });
  var similar = scored.slice(0, 4).map(function(s) { return s.listing; });

  // Fallback: якщо мало результатів — додати з тієї ж категорії
  if (similar.length < 4) {
    var extra = candidates.filter(function(c) { return c.cat === l.cat && !similar.find(function(s){ return s.id === c.id; }); }).slice(0, 4 - similar.length);
    similar = similar.concat(extra);
  }

  document.getElementById('similar-listings').innerHTML = similar.length
    ? similar.map(s => createCard(s, 'catalog')).join('')
    : '<p style="color:var(--text-muted);font-size:14px">Схожих оголошень не знайдено</p>';

  switchDTab('specs', document.querySelector('.dtab'));

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-detail').classList.add('active');
  document.querySelectorAll('.mnav-item').forEach(b => b.classList.remove('active'));
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Примусово скидаємо layout на мобільному
  var _layout = document.getElementById('detail-main-layout');
  if (_layout) {
    if (window.innerWidth <= 900) {
      _layout.style.gridTemplateColumns = '1fr';
      _layout.style.gap = '16px';
      document.querySelectorAll('#detail-main-layout .detail-card').forEach(function(c) {
        c.style.position = 'static';
        c.style.maxWidth = '100%';
        c.style.width = '100%';
      });
    } else {
      _layout.style.gridTemplateColumns = '';
      _layout.style.gap = '';
      document.querySelectorAll('#detail-main-layout .detail-card').forEach(function(c) {
        c.style.position = '';
        c.style.maxWidth = '';
        c.style.width = '';
      });
    }
  }
}

function renderGalleryImage(l) {
  const wrap = document.getElementById('detail-main-img-wrap');
  if (l && l.img) {
    var fallbackIcon = l.icon || '📦';
    var detailSrc = _cdnDetail(galleryImgs[galleryIdx]) || galleryImgs[galleryIdx];
    wrap.innerHTML = `<img src="${detailSrc}" alt="${_esc(l.title || '')}" width="800" height="500" loading="lazy" decoding="async" class="detail-main-img" style="width:100%;height:100%;object-fit:contain;object-position:center;background:var(--dark3);transition:opacity .3s" onerror="this.style.display='none';var fb=document.getElementById('detail-img-fallback');if(fb)fb.style.display='flex'"><div id="detail-img-fallback" style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:80px;opacity:.4">${_esc(l.icon || '📦')}</div>`;
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

  // Базові характеристики — спочатку з human-readable, потім fallback на raw значення
  var battery = l.battery || (l.battAh ? l.battAh + ' Ah' : '');
  var speed = l.speed || (l.speedVal ? l.speedVal + ' км/год' : '');
  var range = l.range || (l.rangeVal ? l.rangeVal + ' км' : '');
  var weight = l.weight || (l.weightVal ? l.weightVal + ' кг' : '');
  var motorW = l.motorW ? l.motorW + ' Вт' : '';

  var basicRows = '';
  if (battery && battery !== '—') basicRows += '<tr><td>АКБ</td><td class="spec-val-green">' + _esc(battery) + '</td></tr>';
  if (speed && speed !== '—')     basicRows += '<tr><td>Макс. швидкість</td><td class="spec-val-green">' + _esc(speed) + '</td></tr>';
  if (range && range !== '—')     basicRows += '<tr><td>Запас ходу</td><td class="spec-val-green">' + _esc(range) + '</td></tr>';
  if (motorW)                     basicRows += '<tr><td>Потужність</td><td class="spec-val-green">' + _esc(motorW) + '</td></tr>';
  if (weight && weight !== '—')   basicRows += '<tr><td>Вага</td><td>' + _esc(weight) + '</td></tr>';
  if (l.year && l.year !== '—')   basicRows += '<tr><td>Рік випуску</td><td>' + _esc(l.year) + '</td></tr>';
  if (l.condition)                basicRows += '<tr><td>Стан</td><td>' + formatSpecVal('Стан', l.condition) + '</td></tr>';

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

  if (basicRows) {
    html += '<div class="spec-section-title"><i class="fa-solid fa-bolt"></i>Основні</div><table class="spec-table">' + basicRows + '</table>';
  }

  order.forEach(key => {
    if (!specs[key] || !specs[key].length) return;
    // Фільтруємо пусті значення
    var filtered = specs[key].filter(function(row) {
      if (!Array.isArray(row) || row.length < 2) return false;
      var v = String(row[1] || '').trim();
      return v && v !== '' && v !== 'Не вказано' && v !== '—' && v !== 'undefined';
    });
    if (!filtered.length) return;
    const meta = SPEC_SECTION_META[key] || { label: key, icon: 'fa-circle' };
    html += `
      <div class="spec-section-title"><i class="fa-solid ${meta.icon}"></i>${meta.label}</div>
      <table class="spec-table">
        ${filtered.map(([k,v]) => `
          <tr>
            <td>${_esc(k)}</td>
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

  // Спочатку перевіряємо телефон з оголошення
  if (l.phone && l.phone.trim()) {
    var ph = l.phone.trim();
    phoneEl.href = 'tel:' + ph.replace(/\s/g, '');
    phoneEl.textContent = ph;
    btn.style.display = 'none';
    revealed.style.display = '';
    return;
  }

  // Якщо в оголошенні немає — беремо з профілю
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


var UA_GEO = window.UA_GEO || {};

const CITY_COORDS = {
  "Київ":{"lat":50.4501,"lng":30.5234},"Харків":{"lat":49.9935,"lng":36.2304},
  "Одеса":{"lat":46.4825,"lng":30.7233},"Дніпро":{"lat":48.4647,"lng":35.0462},
  "Запоріжжя":{"lat":47.8388,"lng":35.1396},"Львів":{"lat":49.8397,"lng":24.0297},
  "Кривий Ріг":{"lat":47.9135,"lng":33.3519},"Миколаїв":{"lat":46.9750,"lng":31.9946},
  "Маріуполь":{"lat":47.0953,"lng":37.5402},"Луганськ":{"lat":48.5740,"lng":39.3078},
  "Вінниця":{"lat":49.2328,"lng":28.4682},"Херсон":{"lat":46.6354,"lng":32.6169},
  "Полтава":{"lat":49.5883,"lng":34.5514},"Чернігів":{"lat":51.4982,"lng":31.2893},
  "Черкаси":{"lat":49.4444,"lng":32.0598},"Житомир":{"lat":50.2547,"lng":28.6587},
  "Суми":{"lat":50.9216,"lng":34.7981},"Хмельницький":{"lat":49.4229,"lng":26.9871},
  "Рівне":{"lat":50.6199,"lng":26.2516},"Чернівці":{"lat":48.2921,"lng":25.9358},
  "Іванo-Франківськ":{"lat":48.9226,"lng":24.7111},"Тернопіль":{"lat":49.5535,"lng":25.5948},
  "Луцьк":{"lat":50.7472,"lng":25.3254},"Ужгород":{"lat":48.6208,"lng":22.2879},
  "Кропивницький":{"lat":48.5132,"lng":32.2597},"Мукачево":{"lat":48.4414,"lng":22.7105},
  "Бровари":{"lat":50.5119,"lng":30.7895},"Буча":{"lat":50.5491,"lng":30.2340},
  "Ірпінь":{"lat":50.5225,"lng":30.2539},"Вишгород":{"lat":50.5884,"lng":30.4737},
  "Бориспіль":{"lat":50.3508,"lng":30.9636},"Переяслав":{"lat":50.0745,"lng":31.4436},
  "Бердичів":{"lat":49.9000,"lng":28.6020},"Коростень":{"lat":50.9525,"lng":28.6485},
  "Звягель":{"lat":50.9078,"lng":27.6419},"Малин":{"lat":50.7721,"lng":29.2397},
  "Новоград-Волинський":{"lat":50.5942,"lng":27.6167},"Коростишів":{"lat":50.3167,"lng":29.0667},
  "Радомишль":{"lat":50.5000,"lng":29.2333},"Баранівка":{"lat":50.2964,"lng":27.6696},
  "Любар":{"lat":50.0103,"lng":27.7641},"Овруч":{"lat":51.3250,"lng":28.8031},
  "Олевськ":{"lat":51.2167,"lng":27.6500},"Андрушівка":{"lat":50.0231,"lng":29.0019},
  "Ковель":{"lat":51.2156,"lng":24.7089},"Нововолинськ":{"lat":50.7267,"lng":24.1625},
  "Кременчук":{"lat":49.0685,"lng":33.4217},"Горішні Плавні":{"lat":49.0092,"lng":33.6486},
  "Дрогобич":{"lat":49.3503,"lng":23.5050},"Трускавець":{"lat":49.2794,"lng":23.5056},
  "Самбір":{"lat":49.5189,"lng":23.2014},"Стрий":{"lat":49.2614,"lng":23.8583},
  "Червоноград":{"lat":50.3883,"lng":24.2344},"Зборів":{"lat":49.6572,"lng":25.1478},
  "Мелітополь":{"lat":46.8481,"lng":35.3699},"Бердянськ":{"lat":46.7597,"lng":36.7968},
  "Краматорськ":{"lat":48.7195,"lng":37.5291},"Слов'янськ":{"lat":48.8597,"lng":37.6228},
  "Покровськ":{"lat":48.2831,"lng":37.1731},
  "Лисичанськ":{"lat":48.9028,"lng":38.4328},"Сєвєродонецьк":{"lat":48.9480,"lng":38.4897},
  "Рубіжне":{"lat":48.9931,"lng":38.3767},"Конотоп":{"lat":51.2303,"lng":33.2028},
  "Шостка":{"lat":51.8689,"lng":33.4658},"Охтирка":{"lat":50.3031,"lng":34.9028},
  "Умань":{"lat":48.7444,"lng":30.2269},"Золотоноша":{"lat":49.6636,"lng":32.0350},
  "Корсунь-Шевченківський":{"lat":49.4228,"lng":31.2819},"Сміла":{"lat":49.2256,"lng":31.8697},
  "Ромни":{"lat":50.7483,"lng":33.4708},"Ніжин":{"lat":51.0497,"lng":31.8892},
  "Прилуки":{"lat":50.5869,"lng":32.3886},"Новгород-Сіверський":{"lat":51.9883,"lng":33.2711},
  "Болград":{"lat":45.6842,"lng":28.6117},"Ізмаїл":{"lat":45.3500,"lng":28.8500},
  "Кам'янець-Подільський":{"lat":48.6786,"lng":26.5789},"Шепетівка":{"lat":50.1872,"lng":27.0608},
  "Чортків":{"lat":49.0161,"lng":25.7950},"Кременець":{"lat":50.0986,"lng":25.7278},
  "Богодухів":{"lat":50.1667,"lng":35.5500},"Ізюм":{"lat":49.2094,"lng":37.2783},
  "Куп'янськ":{"lat":49.7111,"lng":37.6189},"Лозова":{"lat":48.8889,"lng":36.3183},
  "Хуст":{"lat":48.1822,"lng":23.2942},
  "Свалява":{"lat":48.5406,"lng":22.9769},"Рахів":{"lat":48.0528,"lng":24.2111},
};

const UA_OBLASTS = Object.entries(UA_GEO).map(([name, data]) => ({
  name, lat: data.lat, lng: data.lng, osm: name
}));

const _settlementsCache = {};
const _raionsCache = {};

let addMapInstance = null;
let addMapMarker  = null;
let selectedCoords = null;

function initOblastSelect() {
  const sel = document.getElementById('new-oblast');
  if (!sel || sel.options.length > 1) return;
  Object.keys(UA_GEO).sort((a,b) => a.localeCompare(b,'uk')).forEach(name => {
    const opt = document.createElement('option');
    opt.value = name; opt.textContent = name;
    sel.appendChild(opt);
  });
}

function onOblastChange() {
  const oblast = document.getElementById('new-oblast').value;
  const raionSel = document.getElementById('new-raion');

  raionSel.innerHTML = '<option value="">Оберіть район...</option>';
  raionSel.disabled = !oblast;

  var cityInp = document.getElementById('new-city');
  if (cityInp) cityInp.value = '';

  var _cityOblasts2 = {'Місто Київ': 'Київ', 'Місто Севастополь': 'Севастополь'};
  if (_cityOblasts2[oblast] && cityInp) {
    cityInp.value = _cityOblasts2[oblast];
    var geoData = UA_GEO[oblast];
    if (geoData && geoData.raions) {
      Object.entries(geoData.raions).sort((a,b)=>a[0].localeCompare(b[0],"uk")).forEach(([name,data])=>{
        const o=document.createElement("option");
        o.value=name; o.textContent=name;
        o.dataset.lat=data.lat; o.dataset.lng=data.lng;
        raionSel.appendChild(o);
      });
      raionSel.disabled = false;
    } else {
      raionSel.disabled = true;
    }
    setTimeout(onCityChange, 50);
    return;
  }

  const hint = document.getElementById('add-location-hint');
  if (hint) hint.style.display = 'none';
  if (!oblast) return;

  const geo = UA_GEO[oblast];
  if (geo) showAddMap(geo.lat, geo.lng, oblast, 8);

  Object.entries(geo?.raions || {}).sort((a,b) => a[0].localeCompare(b[0],'uk')).forEach(([name, data]) => {
    const o = document.createElement('option');
    o.value = name; o.textContent = name;
    o.dataset.lat = data.lat; o.dataset.lng = data.lng;
    raionSel.appendChild(o);
  });
  raionSel.disabled = false;
}

function onRaionChange() {
  const raion   = document.getElementById('new-raion').value;
  if (!raion) return;

  const raionOpt = document.querySelector('#new-raion option:checked');
  if (raionOpt?.dataset.lat) {
    showAddMap(+raionOpt.dataset.lat, +raionOpt.dataset.lng, raion, 10);
  }

}

function onCityChange() {
  const oblast = document.getElementById('new-oblast').value;
  const raion  = document.getElementById('new-raion').value;
  const city   = document.getElementById('new-city').value;
  if (!city) return;

  const known = CITY_COORDS[city];
  if (known) {
    selectedCoords = known;
    showAddMap(known.lat, known.lng, city, 13);
  } else {
    const rData = UA_GEO[oblast]?.raions[raion];
    if (rData) showAddMap(rData.lat, rData.lng, city, 11);

    fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city+', '+oblast+', Україна')}&format=json&limit=1&countrycodes=ua`, {
      headers:{'Accept-Language':'uk'}
    }).then(r=>r.json()).then(data=>{
      if (data[0]) {
        const lat = +data[0].lat, lng = +data[0].lon;
        CITY_COORDS[city] = { lat, lng };
        selectedCoords = { lat, lng };
        if (addMapInstance) {
          addMapInstance.setView([lat,lng],13);
          if (addMapMarker) addMapMarker.remove();
          addMapMarker = L.circleMarker([lat,lng],{
            radius:10,fillColor:'#00c853',color:'#fff',weight:3,opacity:1,fillOpacity:.9
          }).bindPopup('<b>'+city+'</b>').addTo(addMapInstance).openPopup();
        }
      }
    }).catch(()=>{});
  }

  const hint  = document.getElementById('add-location-hint');
  const label = document.getElementById('add-location-label');
  if (hint && label) {
    hint.style.display = '';
    label.textContent = [city, raion, oblast].filter(Boolean).join(', ');
  }
}

var _leafletLoaded = false;
var _leafletLoading = false;
var _leafletQueue = [];

function _loadLeaflet(cb) {
  if (_leafletLoaded) { cb(); return; }
  _leafletQueue.push(cb);
  if (_leafletLoading) return;
  _leafletLoading = true;

  var css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
  document.head.appendChild(css);

  var script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
  script.onload = function() {
    _leafletLoaded = true;
    _leafletLoading = false;
    _leafletQueue.forEach(function(fn) { fn(); });
    _leafletQueue = [];
  };
  script.onerror = function() {
    _leafletLoading = false;
    _leafletQueue = [];
    console.error('Leaflet не завантажився');
  };
  document.head.appendChild(script);
}

function showAddMap(lat, lng, label, zoom) {
  const wrap = document.getElementById('add-map-wrap');
  if (!wrap) return;
  wrap.style.display = '';

  _loadLeaflet(function() {
  if (!addMapInstance) {
    addMapInstance = L.map('add-map', { zoomControl: true, scrollWheelZoom: false })
      .setView([lat, lng], zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 18
    }).addTo(addMapInstance);
  } else {
    addMapInstance.setView([lat, lng], zoom);
  }

  if (addMapMarker) addMapMarker.remove();
  if (zoom >= 11) {
    addMapMarker = L.circleMarker([lat, lng], {
      radius: 10, fillColor: '#00c853', color: '#fff',
      weight: 3, opacity: 1, fillOpacity: 0.9
    }).bindPopup(`<b>${label}</b>`).addTo(addMapInstance).openPopup();
  }
  setTimeout(() => addMapInstance.invalidateSize(), 60);
  });
}

let detailMapInstance = null;
let detailMapMarker   = null;

function renderDetailMap(city, fullLocation) {
  document.getElementById('detail-location-text').textContent = fullLocation;
  document.getElementById('detail-map-link').href =
    `https://www.google.com/maps/search/${encodeURIComponent(fullLocation)}`;

  const mapEl = document.getElementById('detail-map');
  if (!mapEl) return;

  if (detailMapInstance) {
    detailMapInstance.remove();
    detailMapInstance = null;
    detailMapMarker   = null;
  }

  _loadLeaflet(function() {
    const known = CITY_COORDS[city];
    if (known) {
      _initDetailMap(known.lat, known.lng, city, 12);
    } else {
      _initDetailMap(49.0, 32.0, city, 6);
      fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city + ', Україна')}&format=json&limit=1&countrycodes=ua`, {
        headers: { 'Accept-Language': 'uk' }
      })
      .then(r => r.json())
      .then(data => {
        if (data[0]) {
          const lat = +data[0].lat, lng = +data[0].lon;
          CITY_COORDS[city] = { lat, lng };
          if (detailMapInstance) {
            detailMapInstance.setView([lat, lng], 13);
            if (detailMapMarker) detailMapMarker.remove();
            detailMapMarker = L.circleMarker([lat, lng], {
              radius:12, fillColor:'#00c853', color:'#fff', weight:3, opacity:1, fillOpacity:.9
            }).bindPopup(`<b>${city}</b>`).addTo(detailMapInstance).openPopup();
          }
        }
      })
      .catch(() => {});
    }
  });
}

function _initDetailMap(lat, lng, label, zoom) {
  detailMapInstance = L.map('detail-map', { zoomControl:true, scrollWheelZoom:false })
    .setView([lat, lng], zoom);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:'© OpenStreetMap', maxZoom:18
  }).addTo(detailMapInstance);
  if (zoom > 6) {
    detailMapMarker = L.circleMarker([lat, lng], {
      radius:12, fillColor:'#00c853', color:'#fff', weight:3, opacity:1, fillOpacity:.9
    }).bindPopup(`<b>${label}</b>`).addTo(detailMapInstance).openPopup();
  }
  setTimeout(() => detailMapInstance.invalidateSize(), 80);
}

