const PROMO_PRICES = {
  top:       { 7: 150, 14: 250, 30: 400 },
  highlight: { 7:  80, 14: 130, 30: 200 },
  urgent:    { 7: 100, 14: 160, 30: 250 },
  banner:    { 7: 500, 14: 800, 30: 1200 },
};
const PROMO_NAMES = {
  top: 'TOP оголошення', highlight: 'Підсвічування',
  urgent: 'Термінова продажа', banner: 'Банер магазину',
};

let _promoListingId  = null;
let _promoAfterAdd   = false;
let _selectedPromoType = 'top';
let _selectedPromoDays = 7;

function openPromoModal(listingId, afterAdd) {
  _promoListingId  = listingId;
  _promoAfterAdd   = !!afterAdd;
  _selectedPromoType = 'top';
  _selectedPromoDays = 7;

  const allListings = _allListings();
  const l = allListings.find(x => x && (x.id === +listingId || x.id === listingId));
  const subEl = document.getElementById('promo-modal-listing-name');
  if (subEl) {
    subEl.textContent = afterAdd
      ? '🎉 Оголошення опубліковано! Хочете більше переглядів?'
      : (l ? '«' + l.title + '»' : 'Ваше оголошення');
  }

  document.querySelectorAll('.promo-card').forEach(c => c.classList.remove('selected'));
  document.querySelector('.promo-card[data-promo="top"]').classList.add('selected');
  document.querySelectorAll('.promo-dur-btn').forEach((b,i) => b.classList.toggle('active', i===0));

  _updatePromoUI();
  document.getElementById('promo-modal-overlay').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closePromoModal() {
  document.getElementById('promo-modal-overlay').style.display = 'none';
  document.body.style.overflow = '';
  if (_promoAfterAdd) {
    setTimeout(() => showPage('profile'), 100);
  }
}

function promoModalClickOutside(e) {
  if (e.target === document.getElementById('promo-modal-overlay')) closePromoModal();
}

function selectPromoType(type, el) {
  _selectedPromoType = type;
  document.querySelectorAll('.promo-card').forEach(c => {
    c.classList.remove('selected');
    c.querySelector('.promo-card-check').innerHTML = '';
  });
  el.classList.add('selected');
  el.querySelector('.promo-card-check').innerHTML = '<i class="fa-solid fa-check"></i>';
  _updatePromoUI();
}

function selectPromoDuration(days, el) {
  _selectedPromoDays = days;
  document.querySelectorAll('.promo-dur-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  _updatePromoUI();
}

function _updatePromoUI() {
  const days  = _selectedPromoDays;
  const type  = _selectedPromoType;
  const price = PROMO_PRICES[type] ? PROMO_PRICES[type][days] : 0;

  Object.keys(PROMO_PRICES).forEach(t => {
    const el = document.getElementById('price-' + t);
    if (el) {
      el.textContent = PROMO_PRICES[t][days] + ' грн';
      if (el.nextElementSibling) el.nextElementSibling.textContent = 'за ' + days + ' днів';
    }
  });

  const totalEl = document.getElementById('promo-total-price');
  const untilEl = document.getElementById('promo-until-date');
  const descEl  = document.getElementById('promo-summary-desc');
  if (!totalEl || !untilEl || !descEl) return;

  const until = new Date();
  until.setDate(until.getDate() + days);
  const formatted = until.toLocaleDateString('uk-UA', { day:'numeric', month:'long' });
  totalEl.textContent = (price || 0) + ' грн';
  untilEl.textContent = formatted;
  descEl.innerHTML = `${PROMO_NAMES[type]} · ${days} днів · активно до <b>${formatted}</b>`;
}

function applyPromo() {
  showToast('⏳ Платне просування скоро буде доступне! Слідкуйте за оновленнями.');
  closePromoModal();
}

function submitListing() {

  if (!isLoggedIn || !currentUser || !currentUser.uid) {
    showToast('⚠️ Увійдіть щоб публікувати'); showPage('profile'); return;
  }

  var _rateKey = 'ridego_post_rate';
  try {
    var rateData = JSON.parse(localStorage.getItem(_rateKey) || '{"count":0,"since":0}');
    var now = Date.now();
    if (now - rateData.since < 600000) {
      if (rateData.count >= 5) {
        showToast('⚠️ Забагато оголошень підряд. Зачекайте кілька хвилин.'); return;
      }
    } else {
      rateData = { count: 0, since: now };
    }
  } catch(e) { var rateData = { count: 0, since: Date.now() }; }

  if (_userSlots.loaded && _totalSlots() <= 0) {
    showToast('⚠️ Немає слотів для публікації');
    openBuySlots();
    return;
  }

  const title = document.getElementById('new-title')?.value.trim();
  const price = parseInt(document.getElementById('new-price')?.value);
  const phone = document.getElementById('new-phone')?.value.trim();

  if (!title) { showToast('⚠️ Введіть назву оголошення'); return; }
  if (title.length > 200) { showToast('⚠️ Назва занадто довга (макс 200 символів)'); return; }
  if (!price || price < 1) { showToast('⚠️ Введіть коректну ціну'); return; }
  if (price > 10000000) { showToast('⚠️ Ціна перевищує максимум (10 млн грн)'); return; }
  if (!phone) { showToast('⚠️ Введіть номер телефону'); return; }

  if (!/^[\d\s\+\-\(\)]{7,20}$/.test(phone)) {
    showToast('⚠️ Невірний формат телефону'); return;
  }
  if (!(window._pendingPhotos && window._pendingPhotos.length > 0) && (!uploadedPhotos || uploadedPhotos.length === 0)) {
    showToast('⚠️ Додайте хоча б одне фото'); return;
  }

  if (/https?:\/\/|www\.|\.com|\.ua|\.org/i.test(title)) {
    showToast('⚠️ Посилання в назві заборонені'); return;
  }

  const condition = document.getElementById('new-condition')?.value || 'Хороший';
  const bargain   = document.getElementById('new-bargain')?.value || '';
  const brandRaw  = document.getElementById('new-brand')?.value || '';
  const brandCustom = document.getElementById('new-brand-custom')?.value.trim() || '';
  const brand     = brandRaw === 'Інший бренд' ? (brandCustom || 'Інший') : brandRaw;
  const modelSel  = document.getElementById('new-model-select')?.value || '';
  const modelInp  = document.getElementById('new-model')?.value.trim() || '';
  const model     = (modelSel && modelSel !== '__other__') ? modelSel : modelInp;
  const year      = document.getElementById('new-year')?.value || '';
  const mileage   = document.getElementById('new-mileage')?.value || '';
  const oblastVal = document.getElementById('new-oblast')?.value || '';
  const raionVal  = document.getElementById('new-raion')?.value  || '';
  const cityVal   = document.getElementById('new-city')?.value   || '';
  const city      = cityVal || oblastVal || 'Україна';
  const fullLoc   = [cityVal, raionVal, oblastVal].filter(Boolean).join(', ');
  const desc      = document.getElementById('new-desc')?.value || '';
  const finalTitle = title || [brand, model].filter(Boolean).join(' ') || 'Без назви';

  const motorW  = document.getElementById('sp-motor-w')?.value || '';
  const battAh  = document.getElementById('sp-battery-ah')?.value || '';
  const spSpeed = document.getElementById('sp-speed')?.value || '';
  const spRange = document.getElementById('sp-range')?.value || '';
  const spWheel = document.getElementById('sp-wheel')?.value || '';
  const spWeight= document.getElementById('sp-weight')?.value || '';

  const _savedCat = addSelectedCat;
  const rawSpecs = collectSpecs();

  const SECTION_KEY_MAP = {

    'Електросистема':     'motor',
    'Двигун':             'motor',

    'Акумулятор':         'battery',

    'Їзда':               'performance',
    'Динаміка':           'performance',
    'Характеристики руху':'performance',
    'Характеристики':     'performance',
    'Ходові':             'performance',

    'Рама і колеса':      'physical',
    'Рама':               'physical',
    'Трансмісія':         'physical',
    'Колеса і ходова':    'physical',
    'Колеса':             'physical',
    'Шасі':               'physical',
    'Гальма і підвіска':  'physical',
    'Гальма':             'physical',
    'Підвіска':           'physical',
    'Конструкція':        'physical',
    'Посадка і кузов':    'physical',
    'Розміри та вага':    'physical',
    'Розміри':            'physical',
    'Габарити':           'physical',

    'Оснащення':          'extras',
    'Електроніка':        'extras',
    'Додатково':          'extras',
    'Стан і кількість':   'extras',
    'Сертифікати':        'extras',
    'Безпека':            'extras',
    'Документи':          'extras',

    'Деталь':             'general',
    'Аксесуар':           'general',
    'Загальне':           'general',
  };

  const specsForCard = {};
  Object.keys(rawSpecs).forEach(function(sectionName) {

    var clean = sectionName.replace(/^[^\u0400-\u04FFa-zA-Z]+/, '').trim();
    var key = null;

    if (SECTION_KEY_MAP[clean]) {
      key = SECTION_KEY_MAP[clean];
    } else {

      Object.keys(SECTION_KEY_MAP).forEach(function(k) {
        if (clean.toLowerCase().includes(k.toLowerCase())) key = SECTION_KEY_MAP[k];
      });
    }
    if (!key) key = 'extras';
    if (!specsForCard[key]) specsForCard[key] = [];
    specsForCard[key] = specsForCard[key].concat(rawSpecs[sectionName]);
  });

  const generalRows = [
    ['Бренд', brand], ['Рік випуску', year], ['Стан', condition],
    mileage ? ['Пробіг', mileage+' км'] : null,
  ].filter(Boolean);
  specsForCard.general = [...generalRows, ...(specsForCard.general||[])];

  const catIcons = { 'Самокати':'⚡','Велосипеди':'🚲','Скутери':'🛵','Мопеди':'🛺','Запчастини':'🔧','Аксесуари':'🪖' };
  const newL = {
    id: nextId++,
    title,
    price,
    cat: addSelectedCat || 'Інше',
    city, fullLoc, condition,
    badge: bargain || (condition==='Новий' ? 'НОВИЙ' : ''),
    badgeClass: bargain ? 'tag-red' : 'tag-green',
    icon: catIcons[addSelectedCat] || '📦',
    battery: battAh || '—',
    speed:   spSpeed || '—',
    range:   spRange || '—',
    weight:  spWeight ? spWeight+' кг' : '—',
    desc: desc || 'Опис не вказано.',
    seller: currentUser.name || currentUser.email || '',
    time: 'Щойно',
    img:  (window._pendingPhotos && window._pendingPhotos[0] && window._pendingPhotos[0].preview) || '',
    imgs: uploadedPhotos.length ? [...uploadedPhotos] : [],
    specs: specsForCard,
  };

  if (window._db && currentUser && currentUser.uid) {

    var safeSpecs = {};
    if (newL.specs) {
      Object.keys(newL.specs).forEach(function(key) {
        if (Array.isArray(newL.specs[key])) {

          var obj = {};
          newL.specs[key].forEach(function(row) {
            if (Array.isArray(row) && row.length >= 2) {
              obj[row[0]] = row[1];
            }
          });
          safeSpecs[key] = obj;
        } else {
          safeSpecs[key] = newL.specs[key];
        }
      });
    }
    var fbListing = {
      title: (newL.title || '').substring(0, 200),
      price: newL.price || 0,
      cat: newL.cat || '',
      city: (newL.city || '').substring(0, 100),
      fullLoc: (newL.fullLoc || '').substring(0, 200),
      condition: newL.condition || '',
      badge: newL.badge || '',
      icon: newL.icon || '',
      battery: (newL.battery || '').substring(0, 50),
      speed: (newL.speed || '').substring(0, 50),
      range: (newL.range || '').substring(0, 50),
      weight: (newL.weight || '').substring(0, 50),
      desc: (newL.desc || '').substring(0, 2000),
      time: new Date().toLocaleDateString('uk-UA'),
      seller: (currentUser.name || '').substring(0, 100),
      specs: safeSpecs || {},
      img: '',
      imgs: [],
      uid: currentUser.uid,
      sellerName: (currentUser.name || '').substring(0, 100),
      sellerEmail: (currentUser.email || '').substring(0, 200),
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      expiresAt: firebase.firestore.Timestamp.fromDate(new Date(Date.now() + 30*24*60*60*1000)),
      status: 'active'
    };
    // Перевірка дублів перед публікацією
    window._db.collection('listings')
      .where('uid','==',currentUser.uid)
      .where('status','==','active')
      .where('title','==',fbListing.title)
      .get().then(function(dupSnap) {
        if (!dupSnap.empty) {
          var dm = document.createElement('div');
          dm.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px';
          dm.innerHTML = '<div style="background:var(--card-bg,#fff);border-radius:20px;padding:28px;max-width:420px;width:100%">' +
            '<div style="font-size:32px;text-align:center;margin-bottom:12px">⚠️</div>' +
            '<div style="font-size:18px;font-weight:700;text-align:center;margin-bottom:8px">Схоже оголошення вже є</div>' +
            '<div style="font-size:14px;color:#666;text-align:center;margin-bottom:20px;line-height:1.6">У вас вже є активне оголошення<br><b style="color:#00c853">"' + fbListing.title + '"</b></div>' +
            '<div style="display:flex;flex-direction:column;gap:10px">' +
            '<button id="dup-back" style="padding:13px;border-radius:12px;border:2px solid #00c853;background:transparent;color:#00c853;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit">← Повернутись і змінити назву</button>' +
            '<button id="dup-ok" style="padding:13px;border-radius:12px;border:none;background:#f0f0f0;color:#888;font-size:14px;cursor:pointer;font-family:inherit">Все одно опублікувати</button>' +
            '</div></div>';
          document.body.appendChild(dm);
          var sb = document.getElementById('add-submit-btn');
          if (sb) { sb.disabled=false; sb.innerHTML='<i class="fa-solid fa-bolt" style="margin-right:8px"></i>Опублікувати'; }
          document.getElementById('dup-back').onclick = function(){ document.body.removeChild(dm); };
          document.getElementById('dup-ok').onclick = function(){
            document.body.removeChild(dm);
            _doPublish();
          };
          return;
        }
        _doPublish();
      }).catch(function(){ _doPublish(); });

    function _doPublish() {
    window._db.collection('listings').add(fbListing)
      .then(function(docRef) {

        _consumeSlot().then(function(ok) {
          if (!ok) console.warn('consumeSlot failed after listing publish');
          _renderSlotsUI();
        }).catch(function(e) { console.warn('consumeSlot error:', e); });
        newL.id = docRef.id;
        _fbListings.unshift(newL);
        if (document.getElementById('pstat-active')) {
          var _activeCount = _allListings().filter(function(l){ return l && l.uid === currentUser.uid && l.status !== 'deleted' && l.status !== 'sold'; }).length;
          document.getElementById('pstat-active').textContent = _activeCount;
        }
        if (typeof renderMyListings === 'function') renderMyListings();
        renderHomeListings();
        showToast('✅ Оголошення опубліковано!');

        try {
          var _rd = JSON.parse(localStorage.getItem('ridego_post_rate') || '{"count":0,"since":' + Date.now() + '}');
          _rd.count = (_rd.count || 0) + 1;
          localStorage.setItem('ridego_post_rate', JSON.stringify(_rd));
        } catch(e) {}

        var photos = (window._pendingPhotos || []).filter(function(p){ return p && p.blob; });
        window._pendingPhotos = []; // очищаємо після збереження
        _resetAddWizard();
        setTimeout(function(){ openPromoModal(newL.id, true); }, 600);

        if (photos.length > 0) {
          var urls = new Array(photos.length).fill(null);
          var uploaded = 0;
          photos.forEach(function(p, idx) {
            var fd = new FormData();
            fd.append('file', p.blob, 'photo.jpg');
            fd.append('upload_preset', 'ridego_unsigned');
            fd.append('folder', 'listings/' + docRef.id);
            fetch('https://api.cloudinary.com/v1_1/dxgtpo5dq/image/upload', {
              method: 'POST', body: fd
            }).then(function(r){ return r.json(); })
            .then(function(data) {
              urls[idx] = data.secure_url;
              uploaded++;
              if (uploaded === photos.length) {
                var finalUrls = urls.filter(Boolean);
                window._db.collection('listings').doc(docRef.id).update({
                  img: finalUrls[0] || '',
                  imgs: finalUrls
                }).then(function() {
                  newL.img = finalUrls[0] || '';
                  newL.imgs = finalUrls;
                  if (typeof renderMyListings === 'function') renderMyListings();
                  renderHomeListings();
                  showToast('🖼 Фото завантажено!');
                });
              }
            }).catch(function(e){ console.error('Cloudinary upload error:', e); });
          });
        }
      })
      .catch(function(e) {
        console.error('Firestore save error:', e);
        showToast('⚠️ Помилка збереження: ' + e.message);
      });
    } // end _doPublish
  } else {
    console.warn('No db or uid, saving locally');
    _fbListings.unshift(newL);
    if (document.getElementById('pstat-active')) document.getElementById('pstat-active').textContent = _allListings().filter(function(l){ return l.uid === (currentUser && currentUser.uid) && l.status !== 'deleted' && l.status !== 'sold' && l.status !== 'inactive'; }).length;
    if (typeof renderMyListings === 'function') renderMyListings();
    showToast('✅ Оголошення опубліковано!');
    _resetAddWizard();
  }

}

function _resetAddWizard() {
  uploadedPhotos = []; if (typeof window !== "undefined") window.uploadedPhotos = [];
  addSelectedCat = null;
  addSelectedIcon = '📦';
  if (typeof addMapInstance !== 'undefined' && addMapInstance) { addMapInstance.remove(); addMapInstance = null; addMapMarker = null; }
  if (typeof selectedCoords !== 'undefined') selectedCoords = null;
  var mw = document.getElementById('add-map-wrap');
  if (mw) mw.style.display = 'none';
  var lh = document.getElementById('add-location-hint');
  if (lh) lh.style.display = 'none';
  document.querySelectorAll('#add-step-1 .transport-btn').forEach(function(b){ b.classList.remove('selected'); });
  ['new-title','new-price','new-desc','new-phone','new-mileage','new-district','new-model'].forEach(function(id) {
    var el = document.getElementById(id); if(el) el.value = '';
  });
  var bc = document.getElementById('new-brand-custom');
  if (bc) { bc.value=''; bc.style.display='none'; }
  var ms = document.getElementById('new-model-select');
  if (ms) { ms.innerHTML='<option value="">— спочатку оберіть бренд —</option>'; ms.disabled=true; }
  if (typeof addGoStep === 'function') addGoStep(1);
}


var _editListingId = null;

function openEditListing(id) {
  _editListingId = id;
  showPage('add');
  // Завжди беремо свіжі дані з Firestore
  if (window._db) {
    window._db.collection('listings').doc(id).get().then(function(snap) {
      if (!snap.exists) { showToast('⚠️ Оголошення не знайдено'); return; }
      var l = Object.assign({ id: snap.id }, snap.data());
      _fillEditForm(l);
    });
    return;
  }
  var l = _allListings().find(function(x){ return x && x.id === id; });
  if (!l) { showToast('⚠️ Оголошення не знайдено'); return; }
  _fillEditForm(l);
}

function _fillEditForm(l) {

  _resetAddWizard();

  addSelectedCat = l.cat || null;
  document.querySelectorAll('#add-step-1 .transport-btn').forEach(function(b) {
    if (b.dataset.cat === l.cat) {
      b.classList.add('selected');
      addSelectedIcon = b.dataset.icon || '📦';
    }
  });

  addGoStep(2);

  setTimeout(function() {
    var set = function(id, val) {
      var el = document.getElementById(id);
      if (el && val !== undefined && val !== null) el.value = val;
    };

    set('new-title',    l.title || '');
    set('new-price',    l.price || '');
    set('new-desc',     l.desc  || '');
    set('new-phone',    l.phone || '');
    set('new-mileage',  l.mileage || '');
    set('new-district', l.district || l.address || '');
    set('new-year',     l.year || '');
    set('new-condition', l.condition || 'Хороший');
    set('new-bargain',  l.bargain || '');

    var brandEl = document.getElementById('new-brand');
    if (brandEl && l.brand) {

      var found = false;
      Array.from(brandEl.options).forEach(function(opt) {
        if (opt.value === l.brand) { brandEl.value = l.brand; found = true; }
      });
      if (!found) {

        brandEl.value = 'Інший бренд';
        var customEl = document.getElementById('new-brand-custom');
        if (customEl) { customEl.value = l.brand; customEl.style.display = ''; }
      }
    }

    set('new-city', l.city || '');

    var oblastEl = document.getElementById('new-oblast');
    if (oblastEl && l.oblast) {
      oblastEl.value = l.oblast;
      onOblastChange();
      setTimeout(function() {
        var raionEl = document.getElementById('new-raion');
        if (raionEl && l.raion) {
          raionEl.value = l.raion;
          onRaionChange();
        }
        set('new-city', l.city || '');
      }, 100);
    }

    set('sp-battery-ah', l.battAh || '');
    set('sp-speed',      l.speedVal || '');
    set('sp-range',      l.rangeVal || '');
    set('sp-weight',     l.weightVal || '');
    set('sp-wheel',      l.wheelVal || '');
    set('sp-motor-w',    l.motorW || '');
    set('sp-voltage',    l.voltage || '');

    var h2 = document.querySelector('#add-step-2 h2');
    if (h2) h2.textContent = 'Редагування оголошення';
    var submitBtn = document.getElementById('add-submit-btn');
    if (submitBtn) {
      submitBtn.textContent = 'Зберегти зміни';
      submitBtn.onclick = function() { saveEditListing(); };
    }

    showToast('✏️ Режим редагування');
  }, 300);

}

function saveEditListing() {
  if (!_editListingId || !isLoggedIn) return;

  var title    = document.getElementById('new-title')?.value.trim();
  var price    = parseInt(document.getElementById('new-price')?.value);
  var desc     = document.getElementById('new-desc')?.value.trim() || '';
  var phone    = document.getElementById('new-phone')?.value.trim() || '';
  var mileage  = document.getElementById('new-mileage')?.value.trim() || '';
  var district = document.getElementById('new-district')?.value.trim() || '';
  var year     = document.getElementById('new-year')?.value || '';
  var condition= document.getElementById('new-condition')?.value || 'Хороший';
  var bargain  = document.getElementById('new-bargain')?.value || '';
  var city     = document.getElementById('new-city')?.value || '';
  var oblast   = document.getElementById('new-oblast')?.value || '';
  var raion    = document.getElementById('new-raion')?.value || '';
  var brandRaw = document.getElementById('new-brand')?.value || '';
  var brandCustom = document.getElementById('new-brand-custom')?.value.trim() || '';
  var brand    = brandRaw === 'Інший бренд' ? (brandCustom || 'Інший') : brandRaw;
  var modelSel = document.getElementById('new-model-select')?.value || '';
  var modelInp = document.getElementById('new-model')?.value.trim() || '';
  var model    = (modelSel && modelSel !== '__other__') ? modelSel : modelInp;

  if (!title) { showToast('⚠️ Введіть назву'); return; }
  if (!price || price < 1) { showToast('⚠️ Введіть коректну ціну'); return; }
  if (title.length > 200) { showToast('⚠️ Назва занадто довга'); return; }
  if (price > 10000000) { showToast('⚠️ Ціна перевищує максимум'); return; }

  var fullLoc = [city, raion, oblast].filter(Boolean).join(', ');

  var updateData = {
    title, price, desc, phone, mileage, district, year,
    condition, bargain, city, oblast, raion,
    brand, model,
    seller: currentUser.name || currentUser.email || '',
    sellerName: currentUser.name || currentUser.email || '',
    fullLocation: fullLoc,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  var spFields = {
    'sp-battery-ah': 'battAh', 'sp-speed': 'speedVal',
    'sp-range': 'rangeVal', 'sp-weight': 'weightVal',
    'sp-wheel': 'wheelVal', 'sp-motor-w': 'motorW', 'sp-voltage': 'voltage'
  };
  Object.keys(spFields).forEach(function(domId) {
    var el = document.getElementById(domId);
    if (el && el.value) updateData[spFields[domId]] = el.value;
  });

  var battAh = updateData.battAh || '';
  var speedVal = updateData.speedVal || '';
  var rangeVal = updateData.rangeVal || '';
  if (battAh) updateData.battery = battAh + ' Ah';
  if (speedVal) updateData.speed = speedVal + ' км/год';
  if (rangeVal) updateData.range = rangeVal + ' км';

  if (!window._db) return;

  var btn = document.getElementById('add-submit-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Збереження...'; }

  window._db.collection('listings').doc(_editListingId).update(updateData)
    .then(function() {
      showToast('✅ Оголошення оновлено!');

      var cached = _allListings().find(function(x){ return x && x.id === _editListingId; });
      if (cached) Object.assign(cached, updateData);
      _editListingId = null;
      _resetAddWizard();

      var submitBtn = document.getElementById('add-submit-btn');
      if (submitBtn) {
        submitBtn.textContent = 'Опублікувати оголошення';
        submitBtn.onclick = submitListing;
        submitBtn.disabled = false;
      }
      renderMyListings();
      renderHomeListings();
      showPage('profile');
    })
    .catch(function(e) {
      showToast('⚠️ Помилка збереження: ' + e.message);
      if (btn) { btn.disabled = false; btn.textContent = 'Зберегти зміни'; }
    });
}


function renderMyListings() {
  const grid  = document.getElementById('my-listings-grid');
  const empty = document.getElementById('my-listings-empty');
  if (!grid || !empty) return;
  var uid = currentUser && currentUser.uid;
  var mine = uid
    ? _allListings().filter(function(l){ return l && l.uid === uid && l.status !== 'deleted'; })
    : myListings.filter(function(l){ return l && l.status !== 'deleted'; });
  if (!mine.length) { grid.innerHTML = ''; empty.style.display = ''; return; }
  empty.style.display = 'none';
  grid.innerHTML = mine.map(function(l){ return createMyCard(l); }).join('');

  // Оновити лічильник активних
  _updateActiveCount();

  if (uid) loadViewsStats('7');
}

function _updateActiveCount() {
  var uid = currentUser && currentUser.uid;
  if (!uid) return;
  var count = _allListings().filter(function(l){
    return l && l.uid === uid && l.status !== 'deleted' && l.status !== 'sold';
  }).length;
  var el = document.getElementById('pstat-active');
  if (el) el.textContent = count;
}

function deleteListing(id) {
  if (!window._db || !currentUser) return;
  var l = _allListings().find(function(x){ return x && x.id === id; });
  var title = l ? l.title : 'це оголошення';

  if (!confirm('Видалити «' + title + '»?\nВитрачений слот не повертається.')) return;

  window._db.collection('listings').doc(id).update({
      status: 'deleted',
      deletedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(function() {
      // Видалити з локальних масивів
      myListings = myListings.filter(function(x){ return x.id !== id; });
      _fbListings = _fbListings.filter(function(x){ return !x || x.id !== id; });

      // Інвалідувати кеш — примусово
      try {
        sessionStorage.removeItem('ridego_listings_cache');
        sessionStorage.removeItem('ridego_listings_cache_ts');
      } catch(e) {}
      _idbSet('listings', _fbListings);

      // Оновити UI
      renderMyListings(); // всередині вже викликає _updateActiveCount
      renderHomeListings();
      renderCatalog();
      showToast('🗑 Оголошення видалено');
    })
    .catch(function(e){ showToast('⚠️ Помилка: ' + e.message); });
}

function renewListing(id) {
  if (_totalSlots() <= 0) {
    showToast('⚠️ Немає слотів — купіть щоб поновити');
    openBuySlots();
    return;
  }
  if (!window._db || !currentUser || !currentUser.uid) return;
  var newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  _consumeSlot().then(function(ok) {
    if (!ok) { showToast('⚠️ Помилка списання слоту'); return; }
    window._db.collection('listings').doc(id).update({
      status: 'active',
      expiresAt: firebase.firestore.Timestamp.fromDate(newExpiry),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function() {

      var l = myListings.find(function(x){ return x.id === id; });
      if (l) { l.status = 'active'; l.expiresAt = { seconds: Math.floor(newExpiry.getTime()/1000) }; }
      var fl = _fbListings.find(function(x){ return x.id === id; });
      if (fl) { fl.status = 'active'; fl.expiresAt = { seconds: Math.floor(newExpiry.getTime()/1000) }; }
      renderMyListings();
      showToast('✅ Оголошення поновлено на 30 днів!');
    }).catch(function(e){ showToast('⚠️ ' + e.message); });
  });
}

function createMyCard(l) {
  const base = createCard(l, 'profile');
  const hasPromo = !!l.promo;
  const promoLabel = hasPromo ? PROMO_NAMES[l.promo] : null;

  var isInactive = l.status === 'inactive' || l.status === 'expired';
  var expiryStr = '';
  if (l.expiresAt && l.expiresAt.seconds) {
    var exp = new Date(l.expiresAt.seconds * 1000);
    var daysLeft = Math.ceil((exp - new Date()) / (1000 * 60 * 60 * 24));
    if (isInactive) {
      expiryStr = '<span style="font-size:11px;color:#ff5252">Неактивне</span>';
    } else if (daysLeft <= 3) {
      expiryStr = '<span style="font-size:11px;color:#ffa726">Закінчується через ' + daysLeft + ' дн.</span>';
    } else {
      expiryStr = '<span style="font-size:11px;color:var(--text-muted)">Активне до ' + exp.toLocaleDateString('uk-UA',{day:'numeric',month:'short'}) + '</span>';
    }
  }

  const promoBtn = `
    <div style="padding: 8px 16px 12px; border-top: 1px solid var(--border); display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap;">
      <div style="display:flex;flex-direction:column;gap:2px">
        ${expiryStr}
        ${hasPromo && !isInactive
          ? `<span style="font-size:11px;color:var(--brand);display:flex;align-items:center;gap:5px">
               <i class="fa-solid fa-circle-dot" style="font-size:8px"></i>${promoLabel}
             </span>`
          : (!isInactive ? `<span style="font-size:11px;color:var(--text-muted)">Звичайне розміщення</span>` : '')
        }
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="promo-manage-btn no-promo" style="background:var(--dark3);color:var(--text-muted)"
          onclick="event.stopPropagation(); deleteListing('${l.id}')">
          <i class="fa-solid fa-trash"></i> Видалити
        </button>
        ${l.status === 'sold'
          ? `<button class="promo-manage-btn no-promo" style="background:#e8f5e9;color:#2e7d32;cursor:default">
               <i class="fa-solid fa-circle-check"></i> Продано
             </button>`
          : `<button class="promo-manage-btn no-promo" style="background:var(--brand-dim);color:var(--brand)"
               onclick="event.stopPropagation(); markAsSold('${l.id}')">
               <i class="fa-solid fa-circle-check"></i> Продано
             </button>`
        }
        <button class="promo-manage-btn no-promo" style="background:var(--brand-dim);color:var(--brand)"
          onclick="event.stopPropagation(); openEditListing('${l.id}')">
          <i class="fa-solid fa-pen"></i> Редагувати
        </button>
        ${isInactive
          ? `<button class="promo-manage-btn has-promo" onclick="event.stopPropagation(); renewListing('${l.id}')">
               <i class="fa-solid fa-rotate-right"></i> Поновити (1 слот)
             </button>`
          : (l.status !== 'sold'
            ? `<button class="promo-manage-btn ${hasPromo ? 'has-promo' : 'no-promo'}"
                 onclick="event.stopPropagation(); openPromoModal('${l.id}', false)">
                 <i class="fa-solid fa-${hasPromo ? 'pen' : 'rocket'}"></i>
                 ${hasPromo ? 'Змінити' : 'Просувати'}
               </button>`
            : '')
        }
      </div>
    </div>`;

  const insertAt = base.lastIndexOf('</div>');
  return base.slice(0, insertAt) + promoBtn + base.slice(insertAt);
}


function renderServices(){_initSvcCitySelect();filterServices();_initSvcOblastSelect();}

function _initSvcCitySelect(){var sel=document.getElementById("svc-city-select");if(!sel)return;var all=_fbServices.concat(myServices);var cities=[];all.forEach(function(s){if(s.city&&cities.indexOf(s.city)<0)cities.push(s.city);});cities.sort(function(a,b){return a.localeCompare(b,"uk");});var cur=sel.value;sel.innerHTML="<option value=\"\">📍 Всі міста</option>";cities.forEach(function(c){var o=document.createElement("option");o.value=c;o.textContent="📍 "+c;sel.appendChild(o);});if(cur)sel.value=cur;}
function _initSvcOblastSelect(){
  var sel=document.getElementById("svc-add-oblast");
  if(!sel||sel.options.length>1)return;
  Object.keys(UA_GEO).sort(function(a,b){return a.localeCompare(b,"uk");}).forEach(function(name){
    var o=document.createElement("option");o.value=name;o.textContent=name;sel.appendChild(o);
  });
}

function setSvcCat(cat,el){
  currentServiceFilter=cat;
  document.querySelectorAll(".svc-filter-pill").forEach(function(p){p.classList.remove("active");});
  el.classList.add("active");
  filterServices();
}

function filterServices(){
  var q=(document.getElementById("svc-search-input")?document.getElementById("svc-search-input").value:"").toLowerCase().trim();
  var cityF=document.getElementById("svc-city-select")?document.getElementById("svc-city-select").value:"";
  var all=_fbServices.concat(myServices);
  var filtered=all.filter(function(s){
    var mc=!currentServiceFilter||s.cats.indexOf(currentServiceFilter)>=0;
    var mq=!q||s.name.toLowerCase().indexOf(q)>=0||(s.city||"").toLowerCase().indexOf(q)>=0||(s.desc||"").toLowerCase().indexOf(q)>=0||s.services.some(function(sv){return sv.name.toLowerCase().indexOf(q)>=0;});
    var mct=!cityF||s.city===cityF;
    return mc&&mq&&mct;
  });
  var grid=document.getElementById("services-grid");
  var empty=document.getElementById("services-empty");
  if(!grid)return;
  var lbl=document.getElementById("svc-count-label");
  var sub=document.getElementById("svc-count-sub");
  var cLbl=document.getElementById("svc-city-select")?document.getElementById("svc-city-select").value:"";
  var mLbl=currentServiceFilter||(cLbl?"\u041c\u0456\u0441\u0442\u043e: "+cLbl:"\u0412\u0441\u0456 \u0441\u0435\u0440\u0432\u0456\u0441\u0438");
  if(lbl)lbl.textContent=mLbl;
  if(sub)sub.textContent="\u0417\u043d\u0430\u0439\u0434\u0435\u043d\u043e: "+filtered.length+" \u0441\u0435\u0440\u0432\u0456\u0441\u0456\u0432"+(cLbl?" \u2022 "+cLbl:"");
  if(!filtered.length){grid.innerHTML="";if(empty)empty.style.display="";return;}
  if(empty)empty.style.display="none";
  grid.innerHTML=filtered.map(function(s){return createServiceCard(s);}).join("");
}

function createServiceCard(s){
  var stars="\u2605".repeat(Math.round(s.rating));
  var badge=s.badge?"<div class=\"service-card-cover-badge "+s.badge+"\">"+s.badgeLabel+"</div>":"";
  var shopLk=s.sellerId?"<button onclick=\"event.stopPropagation();showSeller('"+s.sellerId+"')\" style=\"font-size:11px;color:var(--brand);background:none;border:none;cursor:pointer;padding:0;font-family:inherit;display:flex;align-items:center;gap:4px\"><i class=\"fa-solid fa-store\"></i> \u041c\u0430\u0433\u0430\u0437\u0438\u043d</button>":"";
  var prev=_renderSvcPreview(s.services);
      var cats=s.cats.map(function(c){return "<span class=\"service-cat-tag\">"+c+"</span>";}).join("");
  var addr=s.address?" \u00b7 "+s.address:"";
  var rating=s.rating>0?s.rating+" \u00b7 "+s.reviews+" \u0432\u0456\u0434\u0433\u0443\u043a\u0456\u0432":"\u041d\u043e\u0432\u0438\u0439";
  return "<div class=\"service-card\" onclick=\"showServiceDetail('"+s.id+"')\">"+
    (s.photoUrl
      ? "<div class=\"service-card-cover\" style=\"background:none;padding:0;overflow:hidden\"><img src=\""+s.photoUrl+"\" style=\"width:100%;height:100%;object-fit:cover\">"+badge+"</div>"
      : "<div class=\"service-card-cover\" style=\"background:linear-gradient(135deg,"+s.coverColor+" 0%,var(--dark2) 100%)\"><div class=\"service-card-cover-icon\">"+s.icon+"</div>"+badge+"</div>"
    )+
    "<div class=\"service-card-body\">"+
    "<div class=\"service-card-cats\">"+cats+"</div>"+
    "<div class=\"service-card-name\">"+s.name+"</div>"+
    "<div class=\"service-card-city\"><i class=\"fa-solid fa-location-dot\" style=\"color:var(--brand)\"></i>"+s.city+addr+"</div>"+
    "<div class=\"service-card-desc\">"+s.desc+"</div>"+
    "<div class=\"service-card-services\">"+prev+"</div>"+
    "<div class=\"service-card-footer\">"+
    "<div class=\"service-card-rating\"><span style=\"color:#ffa726\">"+stars+"</span> "+rating+"</div>"+
    "<div style=\"display:flex;flex-direction:column;align-items:flex-end;gap:5px\">"+
    shopLk+"<button class=\"service-card-btn\" onclick=\"event.stopPropagation();showServiceDetail('"+s.id+"')\">\u0414\u0435\u0442\u0430\u043b\u044c\u043d\u0456\u0448\u0435 \u2192</button>"+
    "</div></div></div></div>";
}

function _buildSvcDetailHeader(s){
  var badge=s.badge?"<div class=\"service-card-cover-badge "+s.badge+"\" style=\"font-size:12px;padding:5px 14px\">"+s.badgeLabel+"</div>":"";
  var cats=s.cats.map(function(c){return "<span class=\"service-cat-tag\">"+c+"</span>";}).join("");
  var cityLine=s.city?"<span><i class=\"fa-solid fa-location-dot\" style=\"color:var(--brand);margin-right:6px\"></i>"+s.city+(s.address?", "+s.address:"")+"</span>":"";
  var hoursLine=s.hours?"<span><i class=\"fa-solid fa-clock\" style=\"color:var(--brand);margin-right:6px\"></i>"+s.hours+"</span>":"";
  var phoneLine=s.phone?"<span><i class=\"fa-solid fa-phone\" style=\"color:var(--brand);margin-right:6px\"></i>"+s.phone+"</span>":"";
  var btnPhone=s.phone?"<button class=\"btn-primary\" style=\"padding:11px 20px;font-size:14px\" onclick=\"showToast('\u260e\ufe0f '+s.phone)\"><i class=\"fa-solid fa-phone\" style=\"margin-right:6px\"></i>\u0417\u0430\u0442\u0435\u043b\u0435\u0444\u043e\u043d\u0443\u0432\u0430\u0442\u0438</button>":"";
  var btnTg=s.telegram?"<button class=\"btn-outline\" style=\"padding:11px 20px;font-size:14px\" onclick=\"showToast('\ud83d\udcf1 '+s.telegram)\"><i class=\"fa-brands fa-telegram\" style=\"margin-right:6px;color:#2ca5e0\"></i>Telegram</button>":"";
  var btnShop=s.sellerId?"<button class=\"btn-outline\" style=\"padding:11px 20px;font-size:14px\" onclick=\"showSeller('"+s.sellerId+"')\"><i class=\"fa-solid fa-store\" style=\"margin-right:6px\"></i>Магазин</button>":"";

  var btnMsg = s.uid
    ? "<button class=\"btn-outline\" style=\"padding:11px 20px;font-size:14px\" onclick=\"_openSvcChat('"+s.uid+"','"+s.name+"')\"><i class=\"fa-solid fa-comment\" style=\"margin-right:6px\"></i>Написати</button>"
    : "";

  var coverHtml;
  if (s.photoUrl) {
    coverHtml = "<div class=\"service-detail-cover\" style=\"background:none;padding:0;overflow:hidden\">" +
      "<img src=\"" + s.photoUrl + "\" style=\"width:100%;height:100%;object-fit:cover\">" +
      badge + "</div>";
  } else {
    coverHtml = "<div class=\"service-detail-cover\" style=\"background:linear-gradient(135deg,"+s.coverColor+" 0%,var(--dark2) 100%)\"><span>"+s.icon+"</span>"+badge+"</div>";
  }

  var isOwner = (typeof currentUser !== 'undefined') && currentUser && currentUser.uid && s.uid && currentUser.uid === s.uid;
  var editPhotoBtn = isOwner
    ? "<button onclick=\"triggerSvcPhotoUpload('"+s.id+"')\" style=\"position:absolute;bottom:10px;left:10px;background:rgba(0,0,0,.6);border:none;color:#fff;border-radius:8px;padding:6px 12px;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:6px\"><i class='fa-solid fa-camera'></i> Змінити фото</button>"
    : "";
  return "<div style=\"position:relative\">" + coverHtml + editPhotoBtn + "</div>"+
    "<div><div style=\"display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px\">"+cats+"</div>"+
    "<div class=\"service-detail-name\">"+s.name+"</div>"+
    "<div style=\"display:flex;flex-direction:column;gap:8px;font-size:14px;color:var(--text-muted);margin-bottom:16px\">"+cityLine+hoursLine+phoneLine+"</div>"+
    "<div style=\"display:flex;gap:8px;flex-wrap:wrap\">"+btnPhone+btnMsg+btnTg+btnShop+"</div></div>";
}

function _openSvcChat(sellerUid, svcName) {
  _startChat(sellerUid, null, svcName);
}

function triggerSvcPhotoUpload(svcId) {
  var inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'image/*';
  inp.onchange = function(e) {
    var file = e.target.files[0];
    if (!file) return;
    showToast('⏳ Завантаження фото...');
    var reader = new FileReader();
    reader.onload = function(ev) {
      var img = new Image();
      img.onload = function() {
        var canvas = document.createElement('canvas');
        var maxW = 1200, maxH = 600;
        var w = img.width, h = img.height;
        if (w > maxW) { h = h*maxW/w; w = maxW; }
        if (h > maxH) { w = w*maxH/h; h = maxH; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        canvas.toBlob(function(blob) {
          var fd = new FormData();
          fd.append('file', blob, 'svc-cover.jpg');
          fd.append('upload_preset', 'ridego_unsigned');
          fd.append('folder', 'services');
          fetch('https://api.cloudinary.com/v1_1/dxgtpo5dq/image/upload', { method:'POST', body:fd })
            .then(function(r){ return r.json(); })
            .then(function(data) {
              if (!data.secure_url) { showToast('⚠️ Помилка завантаження'); return; }
              var url = data.secure_url;

              if (window._db) {
                window._db.collection('services').doc(svcId).update({ photoUrl: url })
                  .then(function() {
                    showToast('✅ Фото оновлено!');

                    var svc = _fbServices.concat(myServices).find(function(x){ return x.id === svcId; });
                    if (svc) svc.photoUrl = url;

                    var coverEl = document.querySelector('#page-service-detail .service-detail-cover img');
                    if (coverEl) {
                      coverEl.src = url;
                    } else {

                      showServiceDetail(svcId);
                    }
                  }).catch(function(e){ showToast('⚠️ ' + e.message); });
              }
            }).catch(function(){ showToast('⚠️ Помилка зв\'язку з Cloudinary'); });
        }, 'image/jpeg', 0.85);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };
  inp.click();
}

function _buildSvcDetailBody(s){
  var stars5="\u2605".repeat(Math.round(s.rating))+"\u2606".repeat(5-Math.round(s.rating));
  var svcList=_renderSvcList(s.services);
    var ratingNum=s.rating>0?s.rating:"\u2014";
  var ratingStars=s.rating>0?stars5:"\u2606\u2606\u2606\u2606\u2606";
  var reviewsTxt=s.reviews>0?"\u043d\u0430 \u043e\u0441\u043d\u043e\u0432\u0456 "+s.reviews+" \u0432\u0456\u0434\u0433\u0443\u043a\u0456\u0432":"\u041f\u043e\u043a\u0438 \u043d\u0435\u043c\u0430\u0454 \u0432\u0456\u0434\u0433\u0443\u043a\u0456\u0432";
  var socialBlock="";
  if(s.telegram||s.instagram){
    var tgLine=s.telegram?"<div style=\"display:flex;align-items:center;gap:10px;font-size:14px;cursor:pointer\" onclick=\"showToast('\ud83d\udcf1 "+s.telegram+"')\"><div style=\"width:36px;height:36px;border-radius:8px;background:#2ca5e020;display:flex;align-items:center;justify-content:center\"><i class=\"fa-brands fa-telegram\" style=\"color:#2ca5e0\"></i></div>"+s.telegram+"</div>":"";
    var igLine=s.instagram?"<div style=\"display:flex;align-items:center;gap:10px;font-size:14px;cursor:pointer\" onclick=\"showToast('\ud83d\udcf8 "+s.instagram+"')\"><div style=\"width:36px;height:36px;border-radius:8px;background:#e1306c20;display:flex;align-items:center;justify-content:center\"><i class=\"fa-brands fa-instagram\" style=\"color:#e1306c\"></i></div>"+s.instagram+"</div>":"";
    socialBlock="<div style=\"background:var(--card-bg);border:1px solid var(--border);border-radius:16px;padding:22px\"><div style=\"font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:14px\">\u0421\u043e\u0446\u043c\u0435\u0440\u0435\u0436\u0456</div><div style=\"display:flex;flex-direction:column;gap:10px\">"+tgLine+igLine+"</div></div>";
  }

  var _shopTarget = s.sellerId || (s.uid ? 'uid:'+s.uid : null);
  var shopBlock = _shopTarget ? (
    "<div style=\"background:var(--brand-dim);border:1px solid rgba(0,200,83,.25);border-radius:16px;padding:22px\">" +
    "<div style=\"font-size:11px;font-weight:700;text-transform:uppercase;color:var(--brand);margin-bottom:10px\">" +
    "<i class=\"fa-solid fa-store\" style=\"margin-right:5px\"></i>Пов'язаний магазин</div>" +
    "<p style=\"font-size:13px;color:var(--text-muted);margin-bottom:12px\">Перегляньте всі оголошення цього продавця</p>" +
    "<button class=\"btn-primary\" style=\"width:100%;padding:11px\" onclick=\"showSellerByUid('" + (s.uid||'') + "')\">Перейти до оголошень →</button>" +
    "</div>"
  ) : "";
  return "<div style=\"display:flex;flex-direction:column;gap:20px\">"+
    "<div style=\"background:var(--card-bg);border:1px solid var(--border);border-radius:16px;padding:24px\">"+
    "<div style=\"font-size:15px;font-weight:700;margin-bottom:12px\"><i class=\"fa-solid fa-circle-info\" style=\"color:var(--brand);margin-right:8px\"></i>\u041f\u0440\u043e \u0441\u0435\u0440\u0432\u0456\u0441</div>"+
    "<p style=\"font-size:14px;line-height:1.8;color:var(--text-muted)\">"+s.desc+"</p></div>"+
    "<div><div style=\"font-size:15px;font-weight:700;margin-bottom:12px\"><i class=\"fa-solid fa-list-check\" style=\"color:var(--brand);margin-right:8px\"></i>\u041f\u043e\u0441\u043b\u0443\u0433\u0438 \u0442\u0430 \u0446\u0456\u043d\u0438</div>"+
    "<div class=\"service-services-list\">"+svcList+"</div></div></div>"+
    "<div style=\"display:flex;flex-direction:column;gap:16px\">"+
    "<div style=\"background:var(--card-bg);border:1px solid var(--border);border-radius:16px;padding:22px;text-align:center\">"+
    "<div style=\"font-size:48px;font-weight:800;color:var(--brand);line-height:1\">"+ratingNum+"</div>"+
    "<div style=\"color:#ffa726;font-size:22px;margin:6px 0\">"+ratingStars+"</div>"+
    "<div style=\"font-size:13px;color:var(--text-muted);margin-bottom:14px\">"+reviewsTxt+"</div>"+
    "<button class=\"btn-outline\" style=\"width:100%;padding:10px\" onclick=\"openSvcReviewForm('"+s.uid+"')\"><i class=\"fa-solid fa-star\" style=\"margin-right:5px\"></i>Залишити відгук</button>"+
    "</div>"+
    "<div id=\"svc-review-form-"+s.uid+"\" style=\"display:none;background:var(--card-bg);border:1px solid var(--border);border-radius:16px;padding:20px\">"+
    "<div style=\"font-size:14px;font-weight:700;margin-bottom:12px\">Ваш відгук</div>"+
    "<div style=\"display:flex;gap:6px;margin-bottom:12px;font-size:28px\" id=\"svc-stars-"+s.uid+"\">"+
    "<span style=\"cursor:pointer;transition:transform .1s\" onclick=\"setSvcStar('"+s.uid+"',1)\">☆</span>"+
    "<span style=\"cursor:pointer;transition:transform .1s\" onclick=\"setSvcStar('"+s.uid+"',2)\">☆</span>"+
    "<span style=\"cursor:pointer;transition:transform .1s\" onclick=\"setSvcStar('"+s.uid+"',3)\">☆</span>"+
    "<span style=\"cursor:pointer;transition:transform .1s\" onclick=\"setSvcStar('"+s.uid+"',4)\">☆</span>"+
    "<span style=\"cursor:pointer;transition:transform .1s\" onclick=\"setSvcStar('"+s.uid+"',5)\">☆</span>"+
    "</div>"+
    "<textarea id=\"svc-review-text-"+s.uid+"\" rows=\"3\" placeholder=\"Розкажіть про досвід з цим сервісом...\" style=\"width:100%;background:var(--dark3);border:1px solid var(--border);border-radius:10px;padding:10px 14px;color:var(--text);font-family:inherit;font-size:14px;outline:none;resize:vertical;margin-bottom:10px\"></textarea>"+
    "<div style=\"display:flex;gap:8px\">"+
    "<button class=\"btn-outline\" style=\"flex:1;padding:10px\" onclick=\"closeSvcReviewForm('"+s.uid+"')\">Скасувати</button>"+
    "<button class=\"btn-primary\" style=\"flex:2;padding:10px\" onclick=\"submitSvcReview('"+s.uid+"')\"><i class=\"fa-solid fa-paper-plane\" style=\"margin-right:6px\"></i>Надіслати</button>"+
    "</div>"+
    "</div>"+
    socialBlock+shopBlock+"</div>";
}

var _svcReviewStars = {};

function openSvcReviewForm(uid) {
  if (!isLoggedIn || !currentUser || !currentUser.uid) {
    showToast('⚠️ Спочатку увійдіть в акаунт'); showPage('profile'); return;
  }
  if (currentUser.uid === uid) {
    showToast('⚠️ Не можна залишити відгук собі'); return;
  }
  var form = document.getElementById('svc-review-form-' + uid);
  if (form) form.style.display = '';
}

function closeSvcReviewForm(uid) {
  var form = document.getElementById('svc-review-form-' + uid);
  if (form) form.style.display = 'none';
}

function setSvcStar(uid, n) {
  _svcReviewStars[uid] = n;
  var starsEl = document.getElementById('svc-stars-' + uid);
  if (!starsEl) return;
  starsEl.querySelectorAll('span').forEach(function(s, i) {
    s.textContent = i < n ? '★' : '☆';
    s.style.color  = i < n ? '#ffa726' : '';
    s.style.transform = i < n ? 'scale(1.1)' : '';
  });
}

function submitSvcReview(uid) {
  if (!isLoggedIn || !currentUser || !currentUser.uid) {
    showToast('⚠️ Спочатку увійдіть в акаунт'); return;
  }
  var stars = _svcReviewStars[uid] || 0;
  if (!stars) { showToast('⚠️ Оберіть оцінку'); return; }
  var textEl = document.getElementById('svc-review-text-' + uid);
  var text = textEl ? textEl.value.trim() : '';
  if (!text) { showToast('⚠️ Напишіть текст відгуку'); return; }
  if (text.length < 10) { showToast('⚠️ Відгук занадто короткий'); return; }

  if (!window._db) return;
  window._db.collection('reviews').add({
    sellerUid:    uid,
    reviewerUid:  currentUser.uid,
    reviewerName: currentUser.name || currentUser.email || '',
    rating:  stars,
    text:    text,
    type:    'service',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(function() {
    showToast('✅ Відгук опубліковано!');
    closeSvcReviewForm(uid);
    if (textEl) textEl.value = '';
    setSvcStar(uid, 0);

    _refreshSvcRating(uid, stars);

    if (typeof _loadSellerReviews === 'function') _loadSellerReviews(uid);
  }).catch(function(e) {
    showToast('⚠️ Помилка: ' + e.message);
  });
}

function _refreshSvcRating(uid, newStars) {
  if (!window._db) return;
  window._db.collection('reviews').where('sellerUid', '==', uid).get()
    .then(function(snap) {
      var revs = snap.docs.map(function(d){ return d.data(); });
      var total = revs.length;
      var avg = total > 0
        ? (revs.reduce(function(s,r){ return s+(r.rating||0); }, 0) / total)
        : 0;
      var avgStr = avg > 0 ? avg.toFixed(1) : '—';
      var starsStr = avg > 0
        ? ('★'.repeat(Math.round(avg)) + '☆'.repeat(5-Math.round(avg)))
        : '☆☆☆☆☆';
      var reviewsTxt = total > 0
        ? 'на основі ' + total + ' відгук' + (total===1?'а':total<5?'ів':'ів')
        : 'Поки немає відгуків';

      var form = document.getElementById('svc-review-form-' + uid);
      if (form) {

        var ratingDiv = form.previousElementSibling;
        if (ratingDiv) {
          var numEl = ratingDiv.querySelector('div[style*="font-size:48px"]');
          var starsEl = ratingDiv.querySelector('div[style*="color:#ffa726"]');
          var cntEl = ratingDiv.querySelector('div[style*="font-size:13px"][style*="text-muted"]');
          if (numEl) numEl.textContent = avgStr;
          if (starsEl) starsEl.textContent = starsStr;
          if (cntEl) cntEl.textContent = reviewsTxt;
        }
      }

      var svc = _fbServices.concat(myServices).find(function(x){ return x.uid === uid; });
      if (svc) { svc.rating = avg; svc.reviews = total; }
    }).catch(function(){});
}

function showServiceDetail(id){
  var s=_fbServices.concat(myServices).filter(function(x){return x.id===id;})[0];
  if(!s)return;
  currentServiceId=id;
  document.getElementById("svc-detail-header").innerHTML=_buildSvcDetailHeader(s);
  document.getElementById("svc-detail-body").innerHTML=_buildSvcDetailBody(s);
  document.querySelectorAll(".page").forEach(function(p){p.classList.remove("active");});
  document.getElementById("page-service-detail").classList.add("active");
  window.scrollTo({top:0,behavior:"smooth"});
  _setPath('/service/' + id);
  _updateSEO({ title: s.name, desc: s.desc ? s.desc.slice(0,160) : s.name + ' — сервісний центр у ' + (s.city||''), url: 'https://ridego.com.ua/service/' + id });

  if (window._db && s.uid) {
    window._db.collection('reviews').where('sellerUid', '==', s.uid).get()
      .then(function(snap) {
        var revs = snap.docs.map(function(d){ return d.data(); });
        if (!revs.length) return;
        var total = revs.length;
        var avg = revs.reduce(function(sum, r){ return sum + (r.rating||0); }, 0) / total;
        var avgStr = avg.toFixed(1);
        var starsStr = '★'.repeat(Math.round(avg)) + '☆'.repeat(5-Math.round(avg));
        var reviewsTxt = 'на основі ' + total + ' відгук' + (total===1?'а':total<5?'ів':'ів');

        var form = document.getElementById('svc-review-form-' + s.uid);
        if (form) {
          var ratingDiv = form.previousElementSibling;
          if (ratingDiv) {
            var numEl = ratingDiv.querySelector('div[style*="48px"]');
            var starsEl = ratingDiv.querySelector('div[style*="#ffa726"]');
            var cntEl = ratingDiv.querySelector('div[style*="13px"][style*="text-muted"]');
            if (numEl) numEl.textContent = avgStr;
            if (starsEl) starsEl.textContent = starsStr;
            if (cntEl) cntEl.textContent = reviewsTxt;
          }
        }

        s.rating = +avgStr; s.reviews = total;
      }).catch(function(){});
  }
}

function openAddServiceModal(){
  if(!isLoggedIn){showToast("\u26a0\ufe0f \u0423\u0432\u0456\u0439\u0434\u0456\u0442\u044c \u0449\u043e\u0431 \u0434\u043e\u0434\u0430\u0442\u0438 \u0441\u0435\u0440\u0432\u0456\u0441");showPage("profile");return;}
  _initSvcOblastSelect();
  document.getElementById("svc-add-services-list").innerHTML="";
  addSvcServiceRow();
  document.getElementById("add-service-modal-overlay").style.display="flex";
  document.body.style.overflow="hidden";
}

function closeAddServiceModal(){
  document.getElementById("add-service-modal-overlay").style.display="none";
  document.body.style.overflow="";
}

function onSvcOblastChange(){
  var oblast=document.getElementById("svc-add-oblast").value;
  var citySel=document.getElementById("svc-add-city");
  citySel.innerHTML="<option value=\"\">Оберіть місто...</option>";
  citySel.disabled=!oblast;
  if(!oblast)return;

  var _km={'Місто Київ':'Київ','Місто Севастополь':'Севастополь'};
  if(_km[oblast]){citySel.innerHTML='<option value="'+_km[oblast]+'">'+_km[oblast]+'</option>';citySel.disabled=false;citySel.value=_km[oblast];return;}
  var raions=(UA_GEO[oblast]&&UA_GEO[oblast].raions)||{};
  var allCities=[];
  Object.values(raions).forEach(function(r){r.cities.forEach(function(c){if(allCities.indexOf(c)<0)allCities.push(c);});});
  allCities.sort(function(a,b){return a.localeCompare(b,"uk");});
  allCities.forEach(function(c){var o=document.createElement("option");o.value=c;o.textContent=c;citySel.appendChild(o);});
  citySel.disabled=false;
}
function toggleSvcCat(el){el.classList.toggle("active");}

function addSvcServiceRow(){
  var id=++_svcRowId;
  var row=document.createElement("div");
  row.style.cssText="display:flex;gap:8px;align-items:center";
  row.innerHTML="<input type=\"text\" class=\"form-input\" id=\"svc-row-name-"+id+"\" placeholder=\"\u041d\u0430\u0437\u0432\u0430 \u043f\u043e\u0441\u043b\u0443\u0433\u0438\" style=\"flex:2\"><input type=\"text\" class=\"form-input\" id=\"svc-row-price-"+id+"\" placeholder=\"\u0426\u0456\u043d\u0430\" style=\"flex:1\"><button onclick=\"this.parentElement.remove()\" style=\"background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:18px;padding:4px;flex-shrink:0\">\u00d7</button>";
  document.getElementById("svc-add-services-list").appendChild(row);
}

function submitService(){
  var name=document.getElementById("svc-add-name")?document.getElementById("svc-add-name").value.trim():"";
  var phone=document.getElementById("svc-add-phone")?document.getElementById("svc-add-phone").value.trim():"";
  var city=document.getElementById("svc-add-city")?document.getElementById("svc-add-city").value:"";
  var oblast=document.getElementById("svc-add-oblast")?document.getElementById("svc-add-oblast").value:"";
  if(!name){showToast("\u26a0\ufe0f \u0412\u0432\u0435\u0434\u0456\u0442\u044c \u043d\u0430\u0437\u0432\u0443");return;}
  if(!phone){showToast("\u26a0\ufe0f \u0412\u0432\u0435\u0434\u0456\u0442\u044c \u0442\u0435\u043b\u0435\u0444\u043e\u043d");return;}
  if(!city){showToast("\u26a0\ufe0f \u041e\u0431\u0435\u0440\u0456\u0442\u044c \u043c\u0456\u0441\u0442\u043e");return;}
  var cats=Array.from(document.querySelectorAll("#svc-add-cats .pill.active")).map(function(p){return p.dataset.cat;});
  if(!cats.length){showToast("\u26a0\ufe0f \u041e\u0431\u0435\u0440\u0456\u0442\u044c \u0442\u0438\u043f");return;}
  var svcRows=[];
  document.querySelectorAll("#svc-add-services-list > div").forEach(function(row){
    var inputs=row.querySelectorAll("input");
    var n=inputs[0]?inputs[0].value.trim():"",p=inputs[1]?inputs[1].value.trim():"";
    if(n)svcRows.push({name:n,desc:"",price:p||"\u0417\u0430 \u0434\u043e\u043c\u043e\u0432\u043b\u0435\u043d\u0456\u0441\u0442\u044e"});
  });
  var icon=cats.indexOf("\u0412\u0435\u043b\u043e\u0441\u0438\u043f\u0435\u0434\u0438")>=0?"\ud83d\udeb2":cats.indexOf("\u0415\u043b\u0435\u043a\u0442\u0440\u043e\u0441\u043a\u0443\u0442\u0435\u0440\u0438")>=0?"\ud83d\udef5":"\ud83d\udd27";
  var newSvc={
    id:"user-"+Date.now(),name:name,icon:icon,coverColor:"#1a1a1a",cats:cats,city:city,oblast:oblast,
    address:document.getElementById("svc-add-address")?document.getElementById("svc-add-address").value.trim():"",
    hours:document.getElementById("svc-add-hours")?document.getElementById("svc-add-hours").value.trim():"",
    phone:phone,
    telegram:document.getElementById("svc-add-telegram")?document.getElementById("svc-add-telegram").value.trim():"",
    instagram:document.getElementById("svc-add-instagram")?document.getElementById("svc-add-instagram").value.trim():"",
    desc:document.getElementById("svc-add-desc")?document.getElementById("svc-add-desc").value.trim():"\u0421\u0435\u0440\u0432\u0456\u0441\u043d\u0438\u0439 \u0446\u0435\u043d\u0442\u0440",
    badge:null,badgeLabel:null,sellerId:null,rating:0,reviews:0,services:svcRows
  };
  myServices.unshift(newSvc);
  closeAddServiceModal();
  showToast("\u2705 \u0421\u0435\u0440\u0432\u0456\u0441 \u043e\u043f\u0443\u0431\u043b\u0456\u043a\u043e\u0432\u0430\u043d\u043e!");
  filterServices();
}

function getSellerService(sellerId){
  return _fbServices.concat(myServices).filter(function(s){return s.sellerId===sellerId;})[0]||null;
}

var _editingSvc = null;
var _mysvcRowId = 0;
var CATS_LIST = [
  {key:"Електросамокати", label:"\u26a1 Самокати"},
  {key:"Велосипеди",      label:"🚲 Велосипеди"},
  {key:"Електровелосипеди", label:"🔋 Е-байки"},
  {key:"Електроскутери", label:"🛵 Скутери"},
  {key:"Електромотоцикли", label:"🏍 Мотоцикли"},
  {key:"Акумулятори",    label:"🔋 Акумулятори"},
];

function renderMyServiceTab() {
  var el = document.getElementById("ptab-myservice-inner");
  if (!el) return;

  var userSvcs = myServices.filter(function(s){ return s._isOwn; });

  if (!userSvcs.length) {
    el.innerHTML = _mysvcEmptyState();
    return;
  }

  var html = '<div style="display:flex;flex-direction:column;gap:16px">';
  userSvcs.forEach(function(s) {
    html += _mysvcCard(s);
  });
  html += '<button class="mysvc-add-row-btn" style="margin-top:8px;font-size:14px;padding:13px" onclick="openMysvcEditor(null)">'
    + '<i class="fa-solid fa-plus"></i> Додати ще один сервіс'
    + '</button></div>';
  el.innerHTML = html;
}

function _mysvcEmptyState() {
  return '<div style="text-align:center;padding:48px 24px">'
    + '<div style="font-size:56px;margin-bottom:16px">🔧</div>'
    + '<div style="font-size:20px;font-weight:800;margin-bottom:8px">Ще немає сервісу</div>'
    + '<p style="color:var(--text-muted);margin-bottom:24px;font-size:14px">Додайте свій сервісний центр — він з\'явиться в каталозі сервісів та на вашій сторінці магазину</p>'
    + '<button class="btn-primary" style="padding:13px 32px;font-size:15px" onclick="openMysvcEditor(null)">'
    + '<i class="fa-solid fa-plus" style="margin-right:8px"></i>Додати сервіс'
    + '</button></div>';
}

function _mysvcCard(s) {
  var stars = s.rating > 0 ? "\u2605".repeat(Math.round(s.rating)) : "";
  var cats  = s.cats.map(function(c){return '<span class="service-cat-tag">'+c+'</span>';}).join("");
  var svcPreview = _renderSvcPreview(s.services);

  return '<div class="mysvc-hero" style="flex-direction:column;align-items:stretch">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">'
    + '<div class="mysvc-hero-left">'
    + '<div class="mysvc-hero-icon">'+s.icon+'</div>'
    + '<div><div class="mysvc-hero-title">'+s.name+'</div>'
    + '<div class="mysvc-hero-meta"><i class="fa-solid fa-location-dot" style="margin-right:5px;color:var(--brand)"></i>'+s.city+(s.address?', '+s.address:'')+'</div>'
    + (s.hours?'<div class="mysvc-hero-meta"><i class="fa-solid fa-clock" style="margin-right:5px;color:var(--brand)"></i>'+s.hours+'</div>':'')
    + '</div></div>'
    + '<div style="display:flex;gap:10px;flex-wrap:wrap">'
    + '<button class="btn-outline" style="padding:9px 18px;font-size:13px" onclick="showServiceDetail(\''+s.id+'\')"><i class="fa-solid fa-eye" style="margin-right:6px"></i>Переглянути</button>'
    + '<button class="btn-primary" style="padding:9px 18px;font-size:13px" onclick="openMysvcEditor(\''+s.id+'\')"><i class="fa-solid fa-pen" style="margin-right:6px"></i>Редагувати</button>'
    + '</div></div>'
    + '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:12px">'+cats+'</div>'
    + '<div class="service-card-services" style="margin-top:12px">'+svcPreview+'</div>'
    + (s.services.length>3?'<div style="font-size:12px;color:var(--text-muted);margin-top:4px">+ще '+(s.services.length-3)+' послуги</div>':'')
    + '</div>';
}

function openMysvcEditor(id) {
  var s = id ? _fbServices.concat(myServices).filter(function(x){return x.id===id;})[0] : null;
  _editingSvc = s;

  var el = document.getElementById("ptab-myservice-inner");
  if (!el) return;

  var oblastOpts = '<option value="">\u041e\u0431\u0435\u0440\u0456\u0442\u044c \u043e\u0431\u043b\u0430\u0441\u0442\u044c...</option>';
  Object.keys(UA_GEO).sort(function(a,b){return a.localeCompare(b,"uk");}).forEach(function(name){
    var sel = (s && s.oblast === name) ? ' selected' : '';
    oblastOpts += '<option value="'+name+'"'+sel+'>'+name+'</option>';
  });

  var catsHtml = CATS_LIST.map(function(cat){
    var active = (s && s.cats.indexOf(cat.key)>=0) ? ' active' : '';
    return '<button type="button" class="mysvc-cat-pill'+active+'" data-cat="'+cat.key+'" onclick="toggleMysvcCatPill(this)">'
      +cat.label+'</button>';
  }).join(' ');

  var badgeOpts = [
    {v:'', l:'Без значка'},
    {v:'official', l:'\🟢 Офіційний сервіс'},
    {v:'verified', l:'\🟣 Перевірений'},
  ].map(function(o){
    var sel = (s && s.badge===o.v) || (!s && o.v==='') ? ' selected' : '';
    return '<option value="'+o.v+'"'+sel+'>'+o.l+'</option>';
  }).join('');

  _mysvcRowId = 0;
  var svcRowsHtml = '';
  if (s && s.services && s.services.length) {
    var initCats = _normalizeSvcs(s.services);
    initCats.forEach(function(catObj, idx){ svcRowsHtml += _mysvcCatBlock(catObj, idx); });
  }

  var cityOpts = '<option value="">\u041e\u0431\u0435\u0440\u0456\u0442\u044c \u043c\u0456\u0441\u0442\u043e...</option>';
  if (s && s.oblast && UA_GEO[s.oblast]) {
    var raions = UA_GEO[s.oblast].raions || {};
    var cities = [];
    Object.values(raions).forEach(function(r){r.cities.forEach(function(ci){if(cities.indexOf(ci)<0)cities.push(ci);});});
    cities.sort(function(a,b){return a.localeCompare(b,'uk');});
    // Нормалізуємо апостроф для порівняння
    var normalizeApos = function(str){ return str ? str.replace(/[\u2019\u0027\u2018\u02bc]/g, "\u2019") : str; };
    var savedCity = normalizeApos(s.city || '');
    cities.forEach(function(ci){
      var sel = (normalizeApos(ci) === savedCity) ? ' selected' : '';
      cityOpts += '<option value="'+ci+'"'+sel+'>'+ci+'</option>';
    });
  }

  var isNew = !id;
  el.innerHTML = '<div style="max-width:720px">'

    + '<div style="display:flex;align-items:center;gap:12px;margin-bottom:24px">'
    + (isNew ? '' : '<button class="btn-outline" style="padding:8px 14px;font-size:13px" onclick="renderMyServiceTab()"><i class="fa-solid fa-arrow-left"></i></button>')
    + '<div><div style="font-size:20px;font-weight:800">'+(isNew?'🔧 Новий сервіс':'\u270f\ufe0f \u0420\u0435\u0434\u0430\u0433\u0443\u0432\u0430\u0442\u0438 \u0441\u0435\u0440\u0432\u0456\u0441')+'</div>'
    + '<div style="font-size:13px;color:var(--text-muted)">'+(isNew?'\u0417\u0430\u043f\u043e\u0432\u043d\u0456\u0442\u044c \u0456\u043d\u0444\u043e\u0440\u043c\u0430\u0446\u0456\u044e \u0456 \u043e\u043f\u0443\u0431\u043b\u0456\u043a\u0443\u0439\u0442\u0435':'\u0412\u043d\u0435\u0441\u0456\u0442\u044c \u0437\u043c\u0456\u043d\u0438 \u0456 \u0437\u0431\u0435\u0440\u0435\u0436\u0456\u0442\u044c')+'</div></div></div>'

    + '<div class="mysvc-section">'
    + '<div class="mysvc-section-title"><i class="fa-solid fa-circle-info"></i> \u041e\u0441\u043d\u043e\u0432\u043d\u0430 \u0456\u043d\u0444\u043e\u0440\u043c\u0430\u0446\u0456\u044f</div>'
    + '<div class="form-group"><label>\u041d\u0430\u0437\u0432\u0430 \u0441\u0435\u0440\u0432\u0456\u0441\u0443 *</label>'
    + '<input type="text" class="form-input" id="mysvc-name" placeholder="\u041d\u0430\u043f\u0440\u0438\u043a\u043b\u0430\u0434: ScooterFix \u041a\u0438\u0457\u0432" value="'+(s?s.name:'')+'"></div>'
    + '<div class="form-group"><label>\u041e\u043f\u0438\u0441 \u0441\u0435\u0440\u0432\u0456\u0441\u0443</label>'
    + '<textarea class="form-input" id="mysvc-desc" rows="3" placeholder="\u0420\u043e\u0437\u043a\u0430\u0436\u0456\u0442\u044c \u043f\u0440\u043e \u0434\u043e\u0441\u0432\u0456\u0434, \u0433\u0430\u0440\u0430\u043d\u0442\u0456\u0457, \u0441\u043f\u0435\u0446\u0456\u0430\u043b\u0456\u0437\u0430\u0446\u0456\u044e...">'+(s?s.desc:'')+'</textarea></div>'
    + '<div class="form-group"><label>\u0417\u043d\u0430\u0447\u043e\u043a / \u0441\u0442\u0430\u0442\u0443\u0441</label>'
    + '<select class="form-input" id="mysvc-badge">'+badgeOpts+'</select></div>'
    + '</div>'

    + '<div class="mysvc-section">'
    + '<div class="mysvc-section-title"><i class="fa-solid fa-tags"></i> \u0422\u0438\u043f\u0438 \u0442\u0440\u0430\u043d\u0441\u043f\u043e\u0440\u0442\u0443</div>'
    + '<div style="display:flex;flex-wrap:wrap;gap:8px" id="mysvc-cats">'+catsHtml+'</div>'
    + '</div>'

    + '<div class="mysvc-section">'
    + '<div class="mysvc-section-title"><i class="fa-solid fa-location-dot"></i> \u041c\u0456\u0441\u0446\u0435\u0437\u043d\u0430\u0445\u043e\u0434\u0436\u0435\u043d\u043d\u044f</div>'
    + '<div class="form-row">'
    + '<div class="form-group" style="margin-bottom:0"><label>\u041e\u0431\u043b\u0430\u0441\u0442\u044c *</label>'
    + '<select class="form-input" id="mysvc-oblast" onchange="onMysvcOblastChange()">'+oblastOpts+'</select></div>'
    + '<div class="form-group" style="margin-bottom:0"><label>\u041c\u0456\u0441\u0442\u043e *</label>'
    + '<select class="form-input" id="mysvc-city" '+(s&&s.city?'':'disabled')+'>'+(s&&s.city?cityOpts:'<option value="">\u0421\u043f\u043e\u0447\u0430\u0442\u043a\u0443 \u043e\u0431\u043b\u0430\u0441\u0442\u044c</option>')+'</select></div>'
    + '</div>'
    + '<div class="form-group" style="margin-top:12px"><label>\u0410\u0434\u0440\u0435\u0441\u0430</label>'
    + '<input type="text" class="form-input" id="mysvc-address" placeholder="\u0432\u0443\u043b. \u0425\u0440\u0435\u0449\u0430\u0442\u0438\u043a 1" value="'+(s?s.address:'')+'"></div>'
    + '<div class="form-group"><label>\u0413\u0440\u0430\u0444\u0456\u043a \u0440\u043e\u0431\u043e\u0442\u0438</label>'
    + '<input type="text" class="form-input" id="mysvc-hours" placeholder="\u041f\u043d\u2013\u041f\u0442 9:00\u201318:00, \u0421\u0431 10:00\u201316:00" value="'+(s?s.hours:'')+'"></div>'
    + '</div>'

    + '<div class="mysvc-section">'
    + '<div class="mysvc-section-title"><i class="fa-solid fa-phone"></i> \u041a\u043e\u043d\u0442\u0430\u043a\u0442\u0438</div>'
    + '<div class="form-group"><label>\u0422\u0435\u043b\u0435\u0444\u043e\u043d *</label>'
    + '<input type="tel" class="form-input" id="mysvc-phone" placeholder="+380 67 000 00 00" value="'+(s?s.phone:'')+'"></div>'
    + '<div class="form-row">'
    + '<div class="form-group" style="margin-bottom:0"><label>Telegram</label>'
    + '<input type="text" class="form-input" id="mysvc-telegram" placeholder="@myservice" value="'+(s&&s.telegram?s.telegram:'')+'"></div>'
    + '<div class="form-group" style="margin-bottom:0"><label>Instagram</label>'
    + '<input type="text" class="form-input" id="mysvc-instagram" placeholder="@myservice" value="'+(s&&s.instagram?s.instagram:'')+'"></div>'
    + '</div></div>'

    + '<div class="mysvc-section">'
    + '<div class="mysvc-section-title"><i class="fa-solid fa-list-check"></i> \u041f\u043e\u0441\u043b\u0443\u0433\u0438 \u0442\u0430 \u0446\u0456\u043d\u0438</div>'
    + '<div style="display:grid;grid-template-columns:1fr 140px 120px 32px;gap:8px;margin-bottom:8px;padding:0 4px">'
    + '<span style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase">\u041d\u0430\u0437\u0432\u0430</span>'
    + '<span style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase">\u041e\u043f\u0438\u0441</span>'
    + '<span style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase">\u0426\u0456\u043d\u0430</span>'
    + '<span></span></div>'
    + '<div id="mysvc-services-list">'+svcRowsHtml+'</div>'
    + '<button type="button" class="mysvc-add-row-btn" onclick="addMysvcCategory()" style="margin-top:4px"><i class="fa-solid fa-folder-plus" style="margin-right:6px"></i>\u0414\u043e\u0434\u0430\u0442\u0438 \u0440\u043e\u0437\u0434\u0456\u043b</button>'
    + '</div>'

    + '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:8px">'
    + '<button type="button" class="mysvc-save-btn" onclick="saveMysvc()">'
    + '<i class="fa-solid fa-check"></i>'+(isNew?'\u041e\u043f\u0443\u0431\u043b\u0456\u043a\u0443\u0432\u0430\u0442\u0438':'\u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438 \u0437\u043c\u0456\u043d\u0438')+'</button>'
    + (!isNew ? '<button type="button" class="mysvc-delete-btn" onclick="deleteMysvc(\''+id+'\')"><i class="fa-solid fa-trash" style="margin-right:6px"></i>\u0412\u0438\u0434\u0430\u043b\u0438\u0442\u0438 \u0441\u0435\u0440\u0432\u0456\u0441</button>' : '')
    + '<button type="button" class="btn-outline" style="padding:13px 20px" onclick="renderMyServiceTab()">\u0421\u043a\u0430\u0441\u0443\u0432\u0430\u0442\u0438</button>'
    + '</div></div>';
}

function _mysvcServiceRow(sv) {
  var id = ++_mysvcRowId;
  return '<div class="mysvc-service-row" id="mysvc-row-'+id+'">'
    + '<input type="text" class="form-input" id="mysvc-sname-'+id+'" placeholder="\u041d\u0430\u0437\u0432\u0430 \u043f\u043e\u0441\u043b\u0443\u0433\u0438" value="'+(sv.name||'')+'">'
    + '<input type="text" class="form-input mysvc-desc-input" id="mysvc-sdesc-'+id+'" placeholder="\u041e\u043f\u0438\u0441 (\u043d\u0435\u043e\u0431\u043e\u0432\u2019\u044f\u0437\u043a\u043e\u0432\u043e)" value="'+(sv.desc||'')+'">'
    + '<input type="text" class="form-input" id="mysvc-sprice-'+id+'" placeholder="\u0426\u0456\u043d\u0430" value="'+(sv.price||'')+'">'
    + '<button type="button" onclick="document.getElementById(\'mysvc-row-'+id+'\').remove()" '
    + 'style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:18px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:8px;transition:all .2s;flex-shrink:0"'
    + ' onmouseover="this.style.background=\'rgba(255,71,87,.1)\';this.style.color=\'#ff4757\'"'
    + ' onmouseout="this.style.background=\'none\';this.style.color=\'var(--text-muted)\'">\u00d7</button>'
    + '</div>';

  if (s) setTimeout(_syncCatBlocksWithPills, 0);
}

function addMysvcRow() {
  var list = document.getElementById("mysvc-services-list");
  if (!list) return;
  var div = document.createElement("div");
  div.innerHTML = _mysvcServiceRow({name:"",desc:"",price:""});
  list.appendChild(div.firstChild);
}

function _normalizeSvcs(services) {
  if (!services || !services.length) return [{cat:"", items:[{name:"",price:""}]}];
  if (services[0] && typeof services[0].cat !== "undefined") return services;
  return [{cat:"", items: services.map(function(sv){return {name:sv.name||"", price:sv.price||""};})}];
}

function _mysvcItemRow(item) {
  var id = ++_mysvcRowId;
  var hasPrice = item.price && item.price.trim();
  return '<div class="mysvc-service-row" id="mysvc-row-'+id+'">'
    + '<input type="text" class="form-input" id="mysvc-sname-'+id+'" '
    + 'placeholder="\u041d\u0430\u0437\u0432\u0430 \u043f\u043e\u0441\u043b\u0443\u0433\u0438" '
    + 'value="'+(item.name||'')+'" style="font-size:13px">'
    + '<div class="mysvc-price-wrap">'
    + '<input type="text" class="form-input" id="mysvc-sprice-'+id+'" '
    + 'placeholder="\u0426\u0456\u043d\u0430" '
    + 'value="'+(item.price||'')+'" '
    + 'oninput="formatMysvcPrice(this)" '
    + 'style="font-size:13px">'
    + '<span class="mysvc-price-suffix" id="mysvc-suffix-'+id+'" '
    + 'style="display:'+(hasPrice?'block':'none')+';">\u0433\u0440\u043d</span>'
    + '</div>'
    + '<button type="button" onclick="document.getElementById(\'mysvc-row-'+id+'\').remove()" '
    + 'style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:18px;width:30px;height:30px;display:flex;align-items:center;justify-content:center;border-radius:6px;transition:all .2s;flex-shrink:0" '
    + 'onmouseover="this.style.background=\'rgba(255,71,87,.1)\';this.style.color=\'#ff4757\'" '
    + 'onmouseout="this.style.background=\'none\';this.style.color=\'var(--text-muted)\'">×</button>'
    + '</div>';
}

function _mysvcCatBlock(catObj, catIdx) {
  var rowsHtml = ((catObj && catObj.items) || [{name:"",price:""}]).map(function(item){
    return _mysvcItemRow(item);
  }).join("");
  var uid = "mysvc-cat-"+(++_mysvcRowId)+"-"+catIdx;
  return '<div class="mysvc-cat-block" id="'+uid+'">'
    + '<div class="mysvc-cat-header">'
    + '<i class="fa-solid fa-layer-group" style="color:var(--brand);font-size:12px;flex-shrink:0"></i>'
    + '<input type="text" class="mysvc-cat-name-input" '
    + 'placeholder="\u041d\u0430\u0437\u0432\u0430 \u0440\u043e\u0437\u0434\u0456\u043b\u0443 (\u043d\u0430\u043f\u0440.: \u0421\u0435\u0440\u0432\u0456\u0441 \u0441\u0430\u043c\u043e\u043a\u0430\u0442\u0456\u0432)" '
    + 'value="'+(catObj&&catObj.cat||'')+'">'
    + '<button type="button" onclick="this.closest(\'.mysvc-cat-block\').remove()" '
    + 'title="\u0412\u0438\u0434\u0430\u043b\u0438\u0442\u0438 \u0440\u043e\u0437\u0434\u0456\u043b" '
    + 'style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:16px;padding:2px 6px;border-radius:6px;transition:color .2s;flex-shrink:0" '
    + 'onmouseover="this.style.color=\'#ff4757\'" onmouseout="this.style.color=\'var(--text-muted)\'">×</button>'
    + '</div>'
    + '<div class="mysvc-cat-rows" id="'+uid+'-rows">'+rowsHtml+'</div>'
    + '<div style="padding:0 12px 10px">'
    + '<button type="button" onclick="addMysvcItemRow(\''+uid+'-rows\')" '
    + 'style="background:none;border:1.5px dashed var(--border);color:var(--text-muted);border-radius:8px;padding:6px 14px;font-size:12px;font-weight:600;cursor:pointer;font-family:\'Inter\',sans-serif;width:100%;transition:all .2s" '
    + 'onmouseover="this.style.borderColor=\'var(--brand)\';this.style.color=\'var(--brand)\'" '
    + 'onmouseout="this.style.borderColor=\'var(--border)\';this.style.color=\'var(--text-muted)\'">'
    + '<i class="fa-solid fa-plus" style="margin-right:5px"></i>\u0414\u043e\u0434\u0430\u0442\u0438 \u043f\u043e\u0441\u043b\u0443\u0433\u0443</button>'
    + '</div></div>';
}

function formatMysvcPrice(input) {
  var id = input.id.replace("mysvc-sprice-", "");
  var suffix = document.getElementById("mysvc-suffix-"+id);
  if (!suffix) return;
  var val = input.value.trim();

  suffix.style.display = val ? "block" : "none";

}

function addMysvcItemRow(containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;
  var div = document.createElement("div");
  div.innerHTML = _mysvcItemRow({name:"",price:""});
  container.appendChild(div.firstChild);
}

function addMysvcCategory() {
  var list = document.getElementById("mysvc-services-list");
  if (!list) return;
  var catIdx = list.querySelectorAll(".mysvc-cat-block").length;
  var div = document.createElement("div");
  div.innerHTML = _mysvcCatBlock({cat:"", items:[{name:"",price:""}]}, catIdx);
  list.appendChild(div.firstChild);
  var newBlock = list.lastElementChild;
  if (newBlock) {
    var inp = newBlock.querySelector(".mysvc-cat-name-input");
    if (inp) inp.focus();
  }
}

function _collectMysvcServices() {
  var result = [];
  document.querySelectorAll("#mysvc-services-list .mysvc-cat-block").forEach(function(block) {
    var catInp = block.querySelector(".mysvc-cat-name-input");
    var catName = catInp ? catInp.value.trim() : "";
    var items = [];
    block.querySelectorAll(".mysvc-service-row").forEach(function(row) {
      var id = row.id.replace("mysvc-row-","");
      var name  = (document.getElementById("mysvc-sname-"+id)||{value:""}).value.trim();
      var price = (document.getElementById("mysvc-sprice-"+id)||{value:""}).value.trim();
      if (name) {

        if (price && /^\d/.test(price) && !/\u0433\u0440\u043d|\u20ac|\$|%|\u0431\u0435\u0437/.test(price)) {
          price = price + " \u0433\u0440\u043d";
        }
        items.push({name:name, price:price||"\u0417\u0430 \u0434\u043e\u043c\u043e\u0432\u043b\u0435\u043d\u0456\u0441\u0442\u044e"});
      }
    });
    if (items.length) result.push({cat: catName, items: items});
  });
  return result;
}

function _renderSvcPreview(services) {
  var cats = _normalizeSvcs(services);
  var all = [];
  cats.forEach(function(c){ (c.items||[]).forEach(function(i){ all.push(i); }); });
  return all.slice(0,3).map(function(item){
    return '<div class="svc-item"><span class="svc-item-name">'+(item.name||"")+'</span>'
      +'<span class="svc-item-price">'+(item.price||"")+'</span></div>';
  }).join("")
  + (all.length>3?'<div style="font-size:11px;color:var(--text-muted);margin-top:4px">+\u0449\u0435 '+(all.length-3)+' \u043f\u043e\u0441\u043b\u0443\u0433\u0438</div>':"");
}

function _renderSvcList(services) {
  var cats = _normalizeSvcs(services);
  return cats.map(function(catObj){
    var hdr = catObj.cat
      ? '<div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--brand);padding:10px 18px 4px;margin-top:2px">'+catObj.cat+'</div>'
      : "";
    var rows = (catObj.items||[]).map(function(item){
      return '<div class="svc-list-item"><div><div class="svc-list-name">'+(item.name||"")+'</div></div>'
        +'<div class="svc-list-price">'+(item.price||"")+'</div></div>';
    }).join("");
    return hdr+rows;
  }).join("");
}

function toggleMysvcCatPill(btn) {
  btn.classList.toggle("active");
  _syncCatBlocksWithPills();
}

function _syncCatBlocksWithPills() {
  var list = document.getElementById("mysvc-services-list");
  if (!list) return;
  hideMysvcHint();

  var activeCats = [];
  CATS_LIST.forEach(function(cat) {
    var pill = document.querySelector("#mysvc-cats [data-cat=\""+cat.key+"\"]");
    if (pill && pill.classList.contains("active")) {
      activeCats.push({key: cat.key, label: cat.label});
    }
  });

  var existing = {};
  list.querySelectorAll(".mysvc-cat-block").forEach(function(block) {
    var inp = block.querySelector(".mysvc-cat-name-input");
    var name = inp ? inp.value.trim() : "";
    existing[name] = block;
  });

  var autoCatNames = CATS_LIST.map(function(c){ return c.key; });

  activeCats.forEach(function(cat, i) {
    if (!existing[cat.key]) {

      var div = document.createElement("div");
      div.innerHTML = _mysvcCatBlock({cat: cat.key, items:[{name:"",price:""}]}, Date.now()+i);
      var newBlock = div.firstChild;

      newBlock.setAttribute("data-auto-cat", cat.key);

      var manualBlocks = Array.from(list.querySelectorAll(".mysvc-cat-block")).filter(function(b){
        return !b.getAttribute("data-auto-cat") ||
               autoCatNames.indexOf((b.querySelector(".mysvc-cat-name-input")||{value:""}).value.trim()) < 0;
      });
      if (manualBlocks.length > 0) {
        list.insertBefore(newBlock, manualBlocks[0]);
      } else {
        list.appendChild(newBlock);
      }
    }
  });

  list.querySelectorAll(".mysvc-cat-block").forEach(function(block) {
    var inp = block.querySelector(".mysvc-cat-name-input");
    var name = inp ? inp.value.trim() : "";
    var isAutoCat = autoCatNames.indexOf(name) >= 0;
    if (isAutoCat) {

      var isActive = activeCats.some(function(c){ return c.key === name; });
      if (!isActive) {

        var hasContent = false;
        block.querySelectorAll(".mysvc-service-row").forEach(function(row){
          var id = row.id.replace("mysvc-row-","");
          var val = (document.getElementById("mysvc-sname-"+id)||{value:""}).value.trim();
          if (val) hasContent = true;
        });
        if (!hasContent) block.remove();
      }
    }
  });
}

function hideMysvcHint() {
  var h = document.getElementById("mysvc-svc-hint");
  if (h) h.style.display = "none";
}

function onMysvcOblastChange() {
  var oblast  = document.getElementById("mysvc-oblast").value;
  var citySel = document.getElementById("mysvc-city");
  var prevCity = citySel.value; // зберегти поточне місто
  citySel.innerHTML = '<option value="">\u041e\u0431\u0435\u0440\u0456\u0442\u044c \u043c\u0456\u0441\u0442\u043e...</option>';
  citySel.disabled = !oblast;
  if (!oblast) return;
  var raions = (UA_GEO[oblast] && UA_GEO[oblast].raions) || {};
  var cities = [];
  Object.values(raions).forEach(function(r){ r.cities.forEach(function(ci){ if(cities.indexOf(ci)<0) cities.push(ci); }); });
  cities.sort(function(a,b){ return a.localeCompare(b,'uk'); });
  cities.forEach(function(ci){
    var o = document.createElement("option"); o.value = ci; o.textContent = ci;
    citySel.appendChild(o);
  });
  citySel.disabled = false;
  // Відновити попереднє місто якщо воно є в новому списку
  if (prevCity && cities.indexOf(prevCity) >= 0) {
    citySel.value = prevCity;
  }
}

function saveMysvc() {
  var name   = (document.getElementById("mysvc-name")||{}).value;
  var phone  = (document.getElementById("mysvc-phone")||{}).value;
  var city   = (document.getElementById("mysvc-city")||{}).value;
  var oblast = (document.getElementById("mysvc-oblast")||{}).value;

  if (!name || !name.trim())  { showToast("\u26a0\ufe0f \u0412\u0432\u0435\u0434\u0456\u0442\u044c \u043d\u0430\u0437\u0432\u0443 \u0441\u0435\u0440\u0432\u0456\u0441\u0443"); return; }
  if (!phone || !phone.trim()){ showToast("\u26a0\ufe0f \u0412\u0432\u0435\u0434\u0456\u0442\u044c \u0442\u0435\u043b\u0435\u0444\u043e\u043d"); return; }
  if (!city)                  { showToast("\u26a0\ufe0f \u041e\u0431\u0435\u0440\u0456\u0442\u044c \u043c\u0456\u0441\u0442\u043e"); return; }

  var cats = Array.from(document.querySelectorAll("#mysvc-cats .mysvc-cat-pill.active")).map(function(p){ return p.dataset.cat; });
  if (!cats.length) { showToast("\u26a0\ufe0f \u041e\u0431\u0435\u0440\u0456\u0442\u044c \u0445\u043e\u0447 \u0431 \u043e\u0434\u0438\u043d \u0442\u0438\u043f \u0442\u0440\u0430\u043d\u0441\u043f\u043e\u0440\u0442\u0443"); return; }

  var svcRows = _collectMysvcServices();
  var badgeSel = document.getElementById("mysvc-badge");
  var badge    = badgeSel ? badgeSel.value : null;
  var BADGE_LABELS = {official:"\u041e\u0444\u0456\u0446\u0456\u0439\u043d\u0438\u0439 \u0441\u0435\u0440\u0432\u0456\u0441", verified:"\u041f\u0435\u0440\u0435\u0432\u0456\u0440\u0435\u043d\u0438\u0439"};

  var icon = cats.indexOf("\u0412\u0435\u043b\u043e\u0441\u0438\u043f\u0435\u0434\u0438")>=0 ? "🚲"
           : cats.indexOf("\u0415\u043b\u0435\u043a\u0442\u0440\u043e\u0441\u043a\u0443\u0442\u0435\u0440\u0438")>=0 ? "🛵"
           : cats.indexOf("\u0410\u043a\u0443\u043c\u0443\u043b\u044f\u0442\u043e\u0440\u0438")>=0 ? "🔋"
           : cats.indexOf("\u0415\u043b\u0435\u043a\u0442\u0440\u043e\u043c\u043e\u0442\u043e\u0446\u0438\u043a\u043b\u0438")>=0 ? "🏍"
           : "🔧";

  if (_editingSvc) {

    _editingSvc.name      = name.trim();
    _editingSvc.desc      = (document.getElementById("mysvc-desc")||{}).value||"";
    _editingSvc.cats      = cats;
    _editingSvc.city      = city;
    _editingSvc.oblast    = oblast;
    _editingSvc.address   = (document.getElementById("mysvc-address")||{}).value||"";
    _editingSvc.hours     = (document.getElementById("mysvc-hours")||{}).value||"";
    _editingSvc.phone     = phone.trim();
    _editingSvc.telegram  = (document.getElementById("mysvc-telegram")||{}).value||"";
    _editingSvc.instagram = (document.getElementById("mysvc-instagram")||{}).value||"";
    _editingSvc.badge     = badge||null;
    _editingSvc.badgeLabel= badge ? BADGE_LABELS[badge] : null;
    _editingSvc.icon      = icon;
    _editingSvc.services  = svcRows;

    if (window._db && _editingSvc.id && currentUser && currentUser.uid) {
      var upd = {
        name:_editingSvc.name, desc:_editingSvc.desc, cats:cats, city:city, oblast:oblast,
        address:_editingSvc.address, hours:_editingSvc.hours, phone:phone.trim(),
        telegram:_editingSvc.telegram, instagram:_editingSvc.instagram,
        badge:badge||null, badgeLabel:badge?BADGE_LABELS[badge]:null, icon:icon, services:svcRows
      };
      window._db.collection('services').doc(_editingSvc.id).update(upd)
        .catch(function(e){ console.error('service update error:', e); });
    }
    showToast("✅ Сервіс оновлено!");
  } else {

    var newSvc = {
      id:         "own-"+Date.now(),
      name:       name.trim(),
      icon:       icon,
      coverColor: "#0a1a0a",
      cats:       cats,
      city:       city,
      oblast:     oblast,
      address:    (document.getElementById("mysvc-address")||{}).value||"",
      hours:      (document.getElementById("mysvc-hours")||{}).value||"",
      phone:      phone.trim(),
      telegram:   (document.getElementById("mysvc-telegram")||{}).value||"",
      instagram:  (document.getElementById("mysvc-instagram")||{}).value||"",
      desc:       (document.getElementById("mysvc-desc")||{}).value||"",
      badge:      badge||null,
      badgeLabel: badge ? BADGE_LABELS[badge] : null,
      sellerId:   null,
      rating:     0,
      reviews:    0,
      services:   svcRows,
      _isOwn:     true,
    };
    if (window._db && currentUser && currentUser.uid) {
      var fbSvc = Object.assign({}, newSvc, {
        uid: currentUser.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      delete fbSvc.id;
      delete fbSvc._isOwn;
      window._db.collection('services').add(fbSvc)
        .then(function(ref) {
          newSvc.id = ref.id;
          newSvc._isOwn = true;
          myServices.unshift(newSvc);
          _fbServices.unshift(newSvc);
          _initSvcCitySelect();
          showToast('✅ Сервіс опубліковано!');
          renderMyServiceTab();
        }).catch(function(e) {
          newSvc._isOwn = true;
          myServices.unshift(newSvc);
          _initSvcCitySelect();
          showToast('✅ Сервіс збережено локально');
          console.error('service save error:', e);
        });
    } else {
      newSvc._isOwn = true;
      myServices.unshift(newSvc);
      _initSvcCitySelect();
      showToast('✅ Сервіс опубліковано!');
    }
  }
  _editingSvc = null;
  renderMyServiceTab();
}

function deleteMysvc(id) {
  if (!confirm("\u0412\u0438\u0434\u0430\u043b\u0438\u0442\u0438 \u0441\u0435\u0440\u0432\u0456\u0441? \u0426\u044e \u0434\u0456\u044e \u043d\u0435\u043c\u043e\u0436\u043b\u0438\u0432\u043e \u0441\u043a\u0430\u0441\u0443\u0432\u0430\u0442\u0438.")) return;
  myServices = myServices.filter(function(s){ return s.id !== id; });
  _initSvcCitySelect();
  showToast("\u2705 \u0421\u0435\u0440\u0432\u0456\u0441 \u0432\u0438\u0434\u0430\u043b\u0435\u043d\u043e");
  renderMyServiceTab();
}


function loadViewsStats(days) {
  if (!isLoggedIn || !currentUser || !currentUser.uid || !window._db) return;

  document.querySelectorAll('.vstab').forEach(function(b) {
    var isActive = b.id === 'vstab-' + days;
    b.style.background = isActive ? 'var(--brand)' : 'transparent';
    b.style.color = isActive ? '#000' : 'var(--text-muted)';
    b.style.borderColor = isActive ? 'var(--brand)' : 'var(--border)';
  });

  var panel = document.getElementById('views-stats-panel');
  var content = document.getElementById('views-stats-content');
  if (!panel || !content) return;
  panel.style.display = '';
  content.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)"><i class="fa-solid fa-spinner fa-spin"></i> Завантаження...</div>';

  var uid = currentUser.uid;
  var numDays = parseInt(days) || 7;

  window._db.collection('listings')
    .where('uid', '==', uid)
    .get()
    .then(function(snap) {
      var listings = snap.docs.map(function(d) {
        return Object.assign({ id: d.id }, d.data());
      }).filter(function(l) { return l.status !== 'deleted'; });

      if (!listings.length) {
        content.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">Немає оголошень для статистики</div>';
        return;
      }

      var totalViews = listings.reduce(function(s, l) { return s + (l.views || 0); }, 0);

      var sorted = listings.slice().sort(function(a, b) { return (b.views || 0) - (a.views || 0); });
      var top3 = sorted.slice(0, 3);

      var avgViews = listings.length ? Math.round(totalViews / listings.length) : 0;

      var noViews = listings.filter(function(l) { return !l.views || l.views === 0; }).length;

      var html = '';

      html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px">';
      html += _statBox('<i class="fa-solid fa-eye"></i>', totalViews.toLocaleString('uk'), '\u0417\u0430\u0433\u0430\u043b\u044c\u043d\u043e \u043f\u0435\u0440\u0435\u0433\u043b\u044f\u0434\u0456\u0432', 'var(--brand)');
      html += _statBox('<i class="fa-solid fa-chart-simple"></i>', avgViews, '\u0421\u0435\u0440\u0435\u0434\u043d\u0454 \u043d\u0430 \u043e\u0433\u043e\u043b\u043e\u0448\u0435\u043d\u043d\u044f', '#6366f1');
      html += _statBox('<i class="fa-solid fa-list"></i>', listings.length, '\u0412\u0441\u044c\u043e\u0433\u043e \u043e\u0433\u043e\u043b\u043e\u0448\u0435\u043d\u044c', '#f59e0b');
      html += '</div>';

      if (top3.length) {
        html += '<div style="font-size:13px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">\u041d\u0430\u0439\u043f\u043e\u043f\u0443\u043b\u044f\u0440\u043d\u0456\u0448\u0456</div>';
        html += '<div style="display:flex;flex-direction:column;gap:8px">';
        top3.forEach(function(l, i) {
          var maxViews = top3[0].views || 1;
          var pct = Math.round(((l.views || 0) / maxViews) * 100);
          var medals = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'];
          html += '<div style="background:var(--dark3);border-radius:10px;padding:10px 14px">';
          html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">';
          html += '<div style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:70%">' + medals[i] + ' ' + (l.title || '\u0411\u0435\u0437 \u043d\u0430\u0437\u0432\u0438') + '</div>';
          html += '<div style="font-size:13px;font-weight:700;color:var(--brand);flex-shrink:0"><i class="fa-solid fa-eye" style="font-size:11px;margin-right:4px"></i>' + (l.views || 0) + '</div>';
          html += '</div>';
          html += '<div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden">';
          html += '<div style="height:100%;width:' + pct + '%;background:var(--brand);border-radius:3px;transition:width .5s"></div>';
          html += '</div></div>';
        });
        html += '</div>';
      }

      if (noViews > 0) {
        html += '<div style="margin-top:14px;padding:10px 14px;background:var(--brand-dim);border-radius:10px;font-size:12px;color:var(--text-muted)">';
        html += '<i class="fa-solid fa-lightbulb" style="color:var(--brand);margin-right:6px"></i>';
        html += noViews + ' \u043e\u0433\u043e\u043b\u043e\u0448\u0435\u043d\u044c \u043d\u0435 \u043c\u0430\u044e\u0442\u044c \u043f\u0435\u0440\u0435\u0433\u043b\u044f\u0434\u0456\u0432 \u2014 \u0434\u043e\u0434\u0430\u0439\u0442\u0435 \u0444\u043e\u0442\u043e \u0430\u0431\u043e \u0430\u043a\u0442\u0438\u0432\u0443\u0439\u0442\u0435 TOP \u043f\u0440\u043e\u0441\u0443\u0432\u0430\u043d\u043d\u044f.';
        html += '</div>';
      }

      content.innerHTML = html;
    })
    .catch(function(e) {
      content.innerHTML = '<div style="text-align:center;padding:16px;color:var(--text-muted)">\u041f\u043e\u043c\u0438\u043b\u043a\u0430 \u0437\u0430\u0432\u0430\u043d\u0442\u0430\u0436\u0435\u043d\u043d\u044f: ' + e.message + '</div>';
    });
}

function _statBox(icon, value, label, color) {
  return '<div style="background:var(--dark3);border-radius:12px;padding:14px 10px;text-align:center">'
    + '<div style="font-size:20px;color:' + color + ';margin-bottom:4px">' + icon + '</div>'
    + '<div style="font-size:20px;font-weight:800;color:' + color + '">' + value + '</div>'
    + '<div style="font-size:11px;color:var(--text-muted);margin-top:2px">' + label + '</div>'
    + '</div>';
}

var _phoneConfirmResult = null;
var _recaptchaVerifier  = null;

function _initRecaptcha() {
  if (_recaptchaVerifier) return;
  if (!window._auth) return;

  var container = document.getElementById('recaptcha-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'recaptcha-container';
    document.body.appendChild(container);
  }
  try {
    _recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
      size: 'invisible',
      callback: function() {}
    });
  } catch(e) {
    console.error('recaptcha init:', e);
  }
}

function startPhoneVerification() {
  if (!isLoggedIn) { showToast('\u26a0\ufe0f \u0423\u0432\u0456\u0439\u0434\u0456\u0442\u044c \u0432 \u0430\u043a\u0430\u0443\u043d\u0442'); return; }

  var phone = document.getElementById('set-phone')?.value.trim();
  if (!phone) { showToast('\u26a0\ufe0f \u0412\u0432\u0435\u0434\u0456\u0442\u044c \u043d\u043e\u043c\u0435\u0440 \u0442\u0435\u043b\u0435\u0444\u043e\u043d\u0443'); return; }

  var normalized = phone.replace(/\s/g, '');
  if (normalized.startsWith('0')) normalized = '+38' + normalized;
  if (!normalized.startsWith('+')) normalized = '+' + normalized;
  if (!/^\+\d{10,15}$/.test(normalized)) {
    showToast('\u26a0\ufe0f \u041d\u0435\u0432\u0456\u0440\u043d\u0438\u0439 \u0444\u043e\u0440\u043c\u0430\u0442 \u0442\u0435\u043b\u0435\u0444\u043e\u043d\u0443 (\u043f\u0440\u0438\u043a\u043b\u0430\u0434: +380671234567)');
    return;
  }

  _initRecaptcha();
  if (!_recaptchaVerifier) {
    showToast('\u26a0\ufe0f reCAPTCHA \u043d\u0435 \u0456\u043d\u0456\u0446\u0456\u0430\u043b\u0456\u0437\u043e\u0432\u0430\u043d\u0430');
    return;
  }

  var btn = document.getElementById('phone-verify-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> \u0412\u0456\u0434\u043f\u0440\u0430\u0432\u043a\u0430...'; }

  window._auth.signInWithPhoneNumber(normalized, _recaptchaVerifier)
    .then(function(confirmResult) {
      _phoneConfirmResult = confirmResult;
      document.getElementById('phone-sms-wrap').style.display = '';
      document.getElementById('phone-sms-code').focus();
      showToast('\uD83D\uDCF1 SMS \u0432\u0456\u0434\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u043e \u043d\u0430 ' + normalized);
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-shield-halved" style="margin-right:5px"></i>\u0412\u0456\u0434\u043f\u0440\u0430\u0432\u0438\u0442\u0438 \u0449\u0435 \u0440\u0430\u0437'; }
    })
    .catch(function(e) {
      console.error('phone auth:', e);
      var msg = e.code === 'auth/invalid-phone-number' ? '\u041d\u0435\u0432\u0456\u0440\u043d\u0438\u0439 \u043d\u043e\u043c\u0435\u0440 \u0442\u0435\u043b\u0435\u0444\u043e\u043d\u0443'
              : e.code === 'auth/too-many-requests' ? '\u0417\u0430\u0431\u0430\u0433\u0430\u0442\u043e \u0441\u043f\u0440\u043e\u0431. \u0421\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u043f\u0456\u0437\u043d\u0456\u0448\u0435'
              : e.message;
      showToast('\u26a0\ufe0f ' + msg);
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-shield-halved" style="margin-right:5px"></i>\u0412\u0435\u0440\u0438\u0444\u0456\u043a\u0443\u0432\u0430\u0442\u0438'; }

      _recaptchaVerifier = null;
    });
}

function confirmPhoneCode() {
  if (!_phoneConfirmResult) return;
  var code = (document.getElementById('phone-sms-code')?.value || '').trim();
  if (!code || code.length < 6) { showToast('\u26a0\ufe0f \u0412\u0432\u0435\u0434\u0456\u0442\u044c 6-\u0437\u043d\u0430\u0447\u043d\u0438\u0439 \u043a\u043e\u0434'); return; }

  _phoneConfirmResult.confirm(code)
    .then(function(result) {

      var phone = document.getElementById('set-phone')?.value.trim() || '';
      if (window._db && currentUser && currentUser.uid) {
        window._db.collection('users').doc(currentUser.uid).update({
          phone: phone,
          phoneVerified: true,
          phoneVerifiedAt: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(function(){});
      }

      var badge = document.getElementById('phone-verified-badge');
      if (badge) badge.style.display = 'inline';
      var btn = document.getElementById('phone-verify-btn');
      if (btn) { btn.style.display = 'none'; }
      cancelPhoneVerification();
      showToast('\u2705 \u0422\u0435\u043b\u0435\u0444\u043e\u043d \u0432\u0435\u0440\u0438\u0444\u0456\u043a\u043e\u0432\u0430\u043d\u043e!');
    })
    .catch(function(e) {
      var msg = e.code === 'auth/invalid-verification-code' ? '\u041d\u0435\u0432\u0456\u0440\u043d\u0438\u0439 \u043a\u043e\u0434 SMS'
              : e.code === 'auth/code-expired' ? '\u041a\u043e\u0434 \u0432\u0438\u0439\u0448\u043e\u0432 \u2014 \u0432\u0456\u0434\u043f\u0440\u0430\u0432\u0442\u0435 \u0449\u0435 \u0440\u0430\u0437'
              : e.message;
      showToast('\u26a0\ufe0f ' + msg);
    });
}

function cancelPhoneVerification() {
  _phoneConfirmResult = null;
  var wrap = document.getElementById('phone-sms-wrap');
  if (wrap) wrap.style.display = 'none';
  var codeEl = document.getElementById('phone-sms-code');
  if (codeEl) codeEl.value = '';
}

function _checkPhoneVerified(d) {
  if (!d || !d.phoneVerified) return;
  var badge = document.getElementById('phone-verified-badge');
  if (badge) badge.style.display = 'inline';
  var btn = document.getElementById('phone-verify-btn');
  if (btn) btn.style.display = 'none';
}


var PRICE_MAX = 500000;

function onPriceRangeInput() {
  var fromEl = document.getElementById('fp-price-from-range');
  var toEl   = document.getElementById('fp-price-to-range');
  if (!fromEl || !toEl) return;

  var from = parseInt(fromEl.value);
  var to   = parseInt(toEl.value);

  var gap = 1000;
  if (from > to - gap) {
    if (document.activeElement === fromEl) {
      from = to - gap;
      fromEl.value = from;
    } else {
      to = from + gap;
      toEl.value = to;
    }
  }

  _updatePriceSliderFill(from, to);

  var label = document.getElementById('price-range-label');
  if (label) {
    if (from === 0 && to >= PRICE_MAX) {
      label.textContent = '\u0411\u0443\u0434\u044c-\u044f\u043a\u0430';
    } else {
      label.textContent = _fmtPrice(from) + ' \u2014 ' + (to >= PRICE_MAX ? '\u0431\u0435\u0437 \u043c\u0435\u0436\u0456' : _fmtPrice(to)) + ' \u0433\u0440\u043d';
    }
  }

  var hidFrom = document.getElementById('fp-price-from');
  var hidTo   = document.getElementById('fp-price-to');
  if (hidFrom) hidFrom.value = from > 0 ? from : '';
  if (hidTo)   hidTo.value   = to < PRICE_MAX ? to : '';

  document.querySelectorAll('.price-preset').forEach(function(b) { b.classList.remove('active'); });

  updateActiveFilters();
}

function _updatePriceSliderFill(from, to) {
  var fill = document.getElementById('price-slider-fill');
  if (!fill) return;
  var pctFrom = (from / PRICE_MAX) * 100;
  var pctTo   = (to   / PRICE_MAX) * 100;
  fill.style.left  = pctFrom + '%';
  fill.style.width = (pctTo - pctFrom) + '%';
}

function setPricePreset(from, to) {
  var fromEl = document.getElementById('fp-price-from-range');
  var toEl   = document.getElementById('fp-price-to-range');
  if (fromEl) fromEl.value = from;
  if (toEl)   toEl.value   = Math.min(to, PRICE_MAX);

  document.querySelectorAll('.price-preset').forEach(function(b) {
    var txt = b.textContent;
    var isAll = from === 0 && to >= PRICE_MAX;
    b.classList.toggle('active', isAll ? txt === '\u0412\u0441\u0456' : false);
  });

  event && event.target && event.target.classList.add('active');

  onPriceRangeInput();
}

function _fmtPrice(n) {
  if (n >= 1000) return Math.round(n/1000) + '\u00a0\u0442\u0438\u0441';
  return n.toLocaleString('uk');
}

function _initPriceSlider() {
  var fromEl = document.getElementById('fp-price-from-range');
  var toEl   = document.getElementById('fp-price-to-range');
  if (!fromEl || !toEl) return;
  if (fromEl.dataset.initialized) return;
  fromEl.dataset.initialized = '1';
  _updatePriceSliderFill(parseInt(fromEl.value)||0, parseInt(toEl.value)||PRICE_MAX);
}

function shareListing() {
  var l = _allListings().find(function(x){ return x && x.id === currentDetailId; });
  if (!l) return;
  var url  = 'https://ridego.com.ua/listing/' + l.id;
  var text = l.title + ' — ' + l.price.toLocaleString('uk') + ' грн';

  if (navigator.share) {
    navigator.share({ title: text, text: text, url: url })
      .catch(function(){});
  } else {

    _showShareModal(url, text, l.title);
  }
}

function _showShareModal(url, text, title) {
  var existing = document.getElementById('share-modal-overlay');
  if (existing) existing.remove();

  var tgUrl  = 'https://t.me/share/url?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(text);
  var vibUrl = 'viber://forward?text=' + encodeURIComponent(text + ' ' + url);
  var fbUrl  = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url);

  var overlay = document.createElement('div');
  overlay.id = 'share-modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:flex-end;justify-content:center;padding:0 0 20px';
  overlay.onclick = function(e){ if(e.target===overlay) overlay.remove(); };

  overlay.innerHTML = '<div style="background:var(--card-bg);border:1px solid var(--border);border-radius:20px 20px 16px 16px;padding:24px;max-width:400px;width:100%;margin:0 16px">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">'
    + '<div style="font-size:16px;font-weight:700">\uD83D\uDD17 \u041f\u043e\u0434\u0456\u043b\u0438\u0442\u0438\u0441\u044c</div>'
    + '<button onclick="document.getElementById(\'share-modal-overlay\').remove()" style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--text-muted);padding:0">\xd7</button>'
    + '</div>'
    + '<div style="font-size:13px;color:var(--text-muted);margin-bottom:16px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + title + '</div>'
    + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">'
    + _shareBtn('fa-brands fa-telegram', '#2ca5e0', '\u0422\u0435\u043b\u0435\u0433\u0440\u0430\u043c', "window.open('" + tgUrl + "','_blank')")
    + _shareBtn('fa-brands fa-viber', '#7360f2', '\u0412\u0430\u0439\u0431\u0435\u0440', "window.open('" + vibUrl + "','_blank')")
    + _shareBtn('fa-brands fa-facebook', '#1877f2', 'Facebook', "window.open('" + fbUrl + "','_blank')")
    + _shareBtn('fa-solid fa-copy', 'var(--brand)', '\u041a\u043e\u043f\u0456\u044e\u0432\u0430\u0442\u0438', "_copyShareUrl('" + url + "')")
    + '</div>'
    + '<div style="display:flex;align-items:center;gap:8px;background:var(--dark3);border-radius:10px;padding:10px 14px">'
    + '<div style="font-size:12px;color:var(--text-muted);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + url + '</div>'
    + '<button onclick="_copyShareUrl(\'' + url + '\')" style="background:var(--brand);border:none;color:#000;border-radius:7px;padding:5px 12px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;flex-shrink:0">\u0421\u043a\u043e\u043f\u0456\u044e\u0432\u0430\u0442\u0438</button>'
    + '</div></div>';

  document.body.appendChild(overlay);
}

function _shareBtn(icon, color, label, action) {
  return '<div style="display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer" onclick="' + action + '">'
    + '<div style="width:48px;height:48px;border-radius:50%;background:' + color + '20;display:flex;align-items:center;justify-content:center;font-size:22px;color:' + color + '">'
    + '<i class="' + icon + '"></i></div>'
    + '<div style="font-size:11px;color:var(--text-muted);text-align:center">' + label + '</div>'
    + '</div>';
}

function _copyShareUrl(url) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(function() {
      showToast('\u2705 \u041f\u043e\u0441\u0438\u043b\u0430\u043d\u043d\u044f \u0441\u043a\u043e\u043f\u0456\u0439\u043e\u0432\u0430\u043d\u043e!');
    });
  } else {
    var ta = document.createElement('textarea');
    ta.value = url; document.body.appendChild(ta);
    ta.select(); document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('\u2705 \u041f\u043e\u0441\u0438\u043b\u0430\u043d\u043d\u044f \u0441\u043a\u043e\u043f\u0456\u0439\u043e\u0432\u0430\u043d\u043e!');
  }
  var overlay = document.getElementById('share-modal-overlay');
  if (overlay) setTimeout(function(){ overlay.remove(); }, 1000);
}

// copySellerLink визначена вище (використовує currentSellerId)

var _compareIds = [];
var _compareMax = 3;

function toggleCompare(id, btn) {
  var idx = _compareIds.indexOf(id);
  if (idx >= 0) {
    _compareIds.splice(idx, 1);
    if (btn) { btn.style.opacity = '.6'; btn.style.color = ''; }
  } else {
    if (_compareIds.length >= _compareMax) {
      showToast('\u041c\u0430\u043a\u0441\u0438\u043c\u0443\u043c ' + _compareMax + ' \u043e\u0433\u043e\u043b\u043e\u0448\u0435\u043d\u043d\u044f \u0434\u043b\u044f \u043f\u043e\u0440\u0456\u0432\u043d\u044f\u043d\u043d\u044f');
      return;
    }
    _compareIds.push(id);
    if (btn) { btn.style.opacity = '1'; btn.style.color = 'var(--brand)'; }
  }
  _updateCompareBar();
}

function _updateCompareBar() {
  var bar = document.getElementById('compare-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'compare-bar';
    bar.style.cssText = 'position:fixed;bottom:70px;left:50%;transform:translateX(-50%);z-index:8888;'
      + 'background:var(--dark3);border:1px solid var(--brand);border-radius:50px;'
      + 'padding:10px 20px;display:flex;align-items:center;gap:14px;'
      + 'box-shadow:0 4px 20px rgba(0,200,83,.25);transition:all .3s;white-space:nowrap';
    document.body.appendChild(bar);
  }

  if (_compareIds.length === 0) {
    bar.style.display = 'none';
    return;
  }

  bar.style.display = 'flex';
  var listings = _compareIds.map(function(id) {
    return _allListings().find(function(l){ return l && l.id === id; });
  }).filter(Boolean);

  var thumbs = listings.map(function(l) {
    var src = l.img || (l.photos && l.photos[0]) || '';
    return src
      ? '<img src="' + src + '" style="width:28px;height:28px;border-radius:6px;object-fit:cover;border:1px solid var(--border)">'
      : '<div style="width:28px;height:28px;border-radius:6px;background:var(--brand-dim);display:flex;align-items:center;justify-content:center;font-size:14px">\uD83D\uDCF7</div>';
  }).join('');

  bar.innerHTML = thumbs
    + '<span style="font-size:13px;font-weight:600">' + _compareIds.length + '/' + _compareMax + ' \u043e\u0433\u043e\u043b\u043e\u0448\u0435\u043d\u043d\u044f</span>'
    + (_compareIds.length >= 2
      ? '<button onclick="openCompareModal()" style="background:var(--brand);border:none;color:#000;border-radius:20px;padding:6px 16px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">'
        + '<i class="fa-solid fa-scale-balanced" style="margin-right:5px"></i>\u041f\u043e\u0440\u0456\u0432\u043d\u044f\u0442\u0438</button>'
      : '<span style="font-size:12px;color:var(--text-muted)">\u0414\u043e\u0434\u0430\u0439\u0442\u0435 \u0449\u0435 1</span>')
    + '<button onclick="clearCompare()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:18px;padding:0;line-height:1">\xd7</button>';
}

function clearCompare() {
  _compareIds = [];
  document.querySelectorAll('.compare-btn-card').forEach(function(b) {
    b.style.opacity = '.6'; b.style.color = '';
  });
  _updateCompareBar();
}

function openCompareModal() {
  var listings = _compareIds.map(function(id) {
    return _allListings().find(function(l){ return l && l.id === id; });
  }).filter(Boolean);
  if (listings.length < 2) return;

  var overlay = document.createElement('div');
  overlay.id = 'compare-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;overflow-y:auto;padding:20px';
  overlay.onclick = function(e){ if(e.target===overlay) overlay.remove(); };

  var cols = listings.map(function(l) {
    var img = l.img || (l.photos && l.photos[0]) || '';
    return '<div style="flex:1;min-width:0">'
      + (img ? '<img src="' + img + '" style="width:100%;height:140px;object-fit:cover;border-radius:12px;margin-bottom:12px">' : '')
      + '<div style="font-weight:700;font-size:15px;margin-bottom:4px">' + (l.title||'') + '</div>'
      + '<div style="font-size:20px;font-weight:800;color:var(--brand);margin-bottom:12px">' + (l.price||0).toLocaleString('uk') + ' \u0433\u0440\u043d</div>'
      + '<button onclick="showDetail(\'' + l.id + '\');document.getElementById(\'compare-overlay\').remove()" '
      + 'style="width:100%;padding:8px;border-radius:8px;background:var(--brand);border:none;color:#000;font-weight:700;cursor:pointer;font-size:13px;font-family:inherit">'
      + '\u0414\u0438\u0432\u0438\u0442\u0438\u0441\u044c</button>'
      + '</div>';
  }).join('<div style="width:1px;background:var(--border);flex-shrink:0"></div>');

  var rows = [
    ['\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0456\u044f', function(l){ return l.cat || '\u2014'; }],
    ['\u0421\u0442\u0430\u043d', function(l){ return l.condition || '\u2014'; }],
    ['\u0420\u0456\u043a', function(l){ return l.year || '\u2014'; }],
    ['\u041f\u0440\u043e\u0431\u0456\u0433', function(l){ return l.mileage ? l.mileage + ' \u043a\u043c' : '\u2014'; }],
    ['\u0411\u0440\u0435\u043d\u0434', function(l){ return l.brand || '\u2014'; }],
    ['\u041c\u043e\u0434\u0435\u043b\u044c', function(l){ return l.model || '\u2014'; }],
    ['\u0411\u0430\u0442\u0430\u0440\u0435\u044f', function(l){ return l.battery || l.battAh ? (l.battAh||'') + ' Ah' : '\u2014'; }],
    ['\u0428\u0432\u0438\u0434\u043a\u0456\u0441\u0442\u044c', function(l){ return l.speed || l.speedVal ? (l.speedVal||l.speed||'') + ' \u043a\u043c/\u0433\u043e\u0434' : '\u2014'; }],
    ['\u0417\u0430\u043f\u0430\u0441 \u0445\u043e\u0434\u0443', function(l){ return l.range || l.rangeVal ? (l.rangeVal||'') + ' \u043a\u043c' : '\u2014'; }],
    ['\u041c\u0456\u0441\u0442\u043e', function(l){ return l.city || '\u2014'; }],
    ['\u041f\u0440\u043e\u0434\u0430\u0432\u0435\u0446\u044c', function(l){ return l.sellerName || l.seller || '\u2014'; }],
  ].map(function(row) {
    var label = row[0]; var fn = row[1];
    var vals = listings.map(fn);
    var allSame = vals.every(function(v){ return v === vals[0]; });
    var cells = listings.map(function(l, i) {
      var v = fn(l);
      var best = '';
      if (label === '\u0426\u0456\u043d\u0430') {
        var prices = listings.map(function(x){ return x.price; });
        if (l.price === Math.min.apply(null, prices)) best = 'color:var(--brand);font-weight:700';
      }
      return '<td style="padding:10px 12px;text-align:center;' + (allSame?'':'') + best + '">' + v + '</td>';
    }).join('<td style="width:1px;background:var(--border)"></td>');
    return '<tr style="border-bottom:1px solid var(--border)"><td style="padding:10px 12px;font-size:12px;color:var(--text-muted);font-weight:600;white-space:nowrap">' + label + '</td>' + cells + '</tr>';
  }).join('');

  overlay.innerHTML = '<div style="background:var(--card-bg);border-radius:20px;max-width:700px;margin:0 auto;overflow:hidden">'
    + '<div style="padding:20px 24px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">'
    + '<div style="font-size:18px;font-weight:700"><i class="fa-solid fa-scale-balanced" style="color:var(--brand);margin-right:8px"></i>\u041f\u043e\u0440\u0456\u0432\u043d\u044f\u043d\u043d\u044f</div>'
    + '<button onclick="document.getElementById(\'compare-overlay\').remove()" style="background:none;border:none;font-size:24px;cursor:pointer;color:var(--text-muted)">\xd7</button>'
    + '</div>'
    + '<div style="display:flex;gap:16px;padding:20px 24px;border-bottom:1px solid var(--border)">' + cols + '</div>'
    + '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">'
    + '<tbody>' + rows + '</tbody></table></div>'
    + '<div style="padding:16px 24px;display:flex;justify-content:center">'
    + '<button onclick="clearCompare();document.getElementById(\'compare-overlay\').remove()" style="background:none;border:1px solid var(--border);color:var(--text-muted);border-radius:20px;padding:8px 20px;font-size:13px;cursor:pointer;font-family:inherit">'
    + '\u041e\u0447\u0438\u0441\u0442\u0438\u0442\u0438 \u0432\u0438\u0431\u0456\u0440</button></div>'
    + '</div>';

  document.body.appendChild(overlay);
}


// (duplicate shareListing/copySellerLink/toggleCompare/openCompareModal block removed)



var _currentSellerUid = null;

function _initFollowBtn(sellerUid) {
  _currentSellerUid = sellerUid;
  var btn = document.getElementById('seller-follow-btn');
  if (!btn) return;

  if (!isLoggedIn || !currentUser || currentUser.uid === sellerUid) {
    btn.style.display = 'none';
    return;
  }
  btn.style.display = '';

  _isFollowing(sellerUid, function(following) {
    _renderFollowBtn(following);
  });
}

function _isFollowing(sellerUid, cb) {
  if (!window._db || !currentUser || !currentUser.uid) return cb(false);
  window._db.collection('follows')
    .where('followerUid', '==', currentUser.uid)
    .where('sellerUid', '==', sellerUid)
    .limit(1).get()
    .then(function(snap) { cb(!snap.empty); })
    .catch(function() { cb(false); });
}

function _renderFollowBtn(following) {
  var icon  = document.getElementById('seller-follow-icon');
  var label = document.getElementById('seller-follow-label');
  var btn   = document.getElementById('seller-follow-btn');
  if (!icon || !label || !btn) return;
  if (following) {
    icon.className  = 'fa-solid fa-bell';
    label.textContent = '\u041f\u0456\u0434\u043f\u0438\u0441\u0430\u043d\u0438\u0439';
    btn.style.background = 'var(--brand-dim)';
    btn.style.color = 'var(--brand)';
    btn.style.borderColor = 'var(--brand)';
  } else {
    icon.className  = 'fa-regular fa-bell';
    label.textContent = '\u041f\u0456\u0434\u043f\u0438\u0441\u0430\u0442\u0438\u0441\u044c';
    btn.style.background = '';
    btn.style.color = '';
    btn.style.borderColor = '';
  }
}

function toggleFollowSeller() {
  if (!isLoggedIn) { showToast('\u26a0\ufe0f \u0423\u0432\u0456\u0439\u0434\u0456\u0442\u044c \u0449\u043e\u0431 \u043f\u0456\u0434\u043f\u0438\u0441\u0430\u0442\u0438\u0441\u044c'); showPage('profile'); return; }
  if (!_currentSellerUid || !window._db) return;

  var sellerUid = _currentSellerUid;
  _isFollowing(sellerUid, function(following) {
    if (following) {

      window._db.collection('follows')
        .where('followerUid', '==', currentUser.uid)
        .where('sellerUid', '==', sellerUid)
        .get().then(function(snap) {
          snap.docs.forEach(function(d) { d.ref.delete(); });
          _renderFollowBtn(false);
          showToast('\u0412\u0456\u0434\u043f\u0438\u0441\u0430\u043d\u043e');

          window._db.collection('users').doc(sellerUid).update({
            followers: firebase.firestore.FieldValue.increment(-1)
          }).catch(function(){});
        });
    } else {

      window._db.collection('follows').add({
        followerUid: currentUser.uid,
        followerName: currentUser.name || currentUser.email || '',
        sellerUid: sellerUid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      }).then(function() {
        _renderFollowBtn(true);
        showToast('\u2705 \u041f\u0456\u0434\u043f\u0438\u0441\u0430\u043b\u0438\u0441\u044c! \u0411\u0443\u0434\u0435\u043c\u043e \u0441\u0441\u043f\u043e\u0432\u0456\u0449\u0430\u0442\u0438 \u043f\u0440\u043e \u043d\u043e\u0432\u0456 \u043e\u0433\u043e\u043b\u043e\u0448\u0435\u043d\u043d\u044f');

        window._db.collection('users').doc(sellerUid).update({
          followers: firebase.firestore.FieldValue.increment(1)
        }).catch(function(){});

      });
    }
  });
}

function _renderFollowersCount(sellerUid) {
  if (!window._db) return;
  window._db.collection('users').doc(sellerUid).get().then(function(snap) {
    if (!snap.exists) return;
    var followers = snap.data().followers || 0;
    var el = document.getElementById('sp-stat-response');
    if (el) {
      el.textContent = followers;
      var lbl = el.nextElementSibling;
      if (lbl) lbl.textContent = '\u041f\u0456\u0434\u043f\u0438\u0441\u043d\u0438\u043a\u0456\u0432';
    }
  }).catch(function(){});
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
    'offers': {
      '@type': 'Offer',
      'price': l.price || 0,
      'priceCurrency': 'UAH',
      'availability': l.status === 'active'
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      'seller': {
        '@type': 'Person',
        'name': l.sellerName || l.seller || ''
      }
    },
    'category': l.cat || '',
    'brand': l.brand ? { '@type': 'Brand', 'name': l.brand } : undefined,
    'model': l.model || undefined,
    'image': l.photos && l.photos.length ? l.photos : (l.img ? [l.img] : undefined),
    'itemCondition': l.condition === '\u041d\u043e\u0432\u0438\u0439'
      ? 'https://schema.org/NewCondition'
      : 'https://schema.org/UsedCondition',
    'url': 'https://ridego.com.ua/listing/' + l.id
  };

  Object.keys(schema).forEach(function(k) { if (schema[k] === undefined) delete schema[k]; });
  if (schema.offers) Object.keys(schema.offers).forEach(function(k) { if (schema.offers[k] === undefined) delete schema.offers[k]; });

  var script = document.createElement('script');
  script.id = 'schema-listing';
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(schema);
  document.head.appendChild(script);
}

function _setSellerSchema(d, listings) {
  var existing = document.getElementById('schema-seller');
  if (existing) existing.remove();

  if (!d) return;

  var schema = {
    '@context': 'https://schema.org',
    '@type': d.type === 'business' ? 'Store' : 'Person',
    'name': d.name || '',
    'description': d.about || d.desc || '',
    'address': d.city ? { '@type': 'PostalAddress', 'addressLocality': d.city, 'addressCountry': 'UA' } : undefined,
    'telephone': d.phone || undefined,
    'url': 'https://ridego.com.ua/seller/' + (d.uid || ''),
    'image': d.photoUrl || undefined,
    'numberOfItems': listings ? listings.length : undefined
  };

  Object.keys(schema).forEach(function(k) { if (schema[k] === undefined) delete schema[k]; });

  var script = document.createElement('script');
  script.id = 'schema-seller';
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(schema);
  document.head.appendChild(script);
}

function _setHomeBreadcrumbSchema() {
  var existing = document.getElementById('schema-breadcrumb');
  if (existing) return;
  var schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    'name': 'RideGO',
    'url': 'https://ridego.com.ua',
    'description': '\u041c\u0430\u0440\u043a\u0435\u0442\u043f\u043b\u0435\u0439\u0441 \u0435\u043b\u0435\u043a\u0442\u0440\u043e\u0442\u0440\u0430\u043d\u0441\u043f\u043e\u0440\u0442\u0443 \u0423\u043a\u0440\u0430\u0457\u043d\u0438',
    'potentialAction': {
      '@type': 'SearchAction',
      'target': 'https://ridego.com.ua/catalog?q={search_term_string}',
      'query-input': 'required name=search_term_string'
    }
  };
  var script = document.createElement('script');
  script.id = 'schema-breadcrumb';
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(schema);
  document.head.appendChild(script);
}


var _idbDb = null;
var _IDB_NAME = 'ridego-cache';
var _IDB_VER  = 1;
var _IDB_STORE = 'data';

function _idbOpen(cb) {
  if (_idbDb) { cb(_idbDb); return; }
  if (!window.indexedDB) { cb(null); return; }
  var req = indexedDB.open(_IDB_NAME, _IDB_VER);
  req.onupgradeneeded = function(e) {
    var db = e.target.result;
    if (!db.objectStoreNames.contains(_IDB_STORE)) {
      db.createObjectStore(_IDB_STORE, { keyPath: 'key' });
    }
  };
  req.onsuccess = function(e) {
    _idbDb = e.target.result;
    cb(_idbDb);
  };
  req.onerror = function() { cb(null); };
}

function _idbSet(key, value, cb) {
  _idbOpen(function(db) {
    if (!db) {
      try { sessionStorage.setItem(key, JSON.stringify({ v: value, t: Date.now() })); } catch(e) {}
      if (cb) cb();
      return;
    }
    var tx = db.transaction(_IDB_STORE, 'readwrite');
    var store = tx.objectStore(_IDB_STORE);
    store.put({ key: key, value: value, ts: Date.now() });
    tx.oncomplete = function() { if (cb) cb(); };
    tx.onerror = function() { if (cb) cb(); };
  });
}

function _idbGet(key, maxAgeMs, cb) {
  _idbOpen(function(db) {
    if (!db) {
      try {
        var raw = sessionStorage.getItem(key);
        if (raw) {
          var parsed = JSON.parse(raw);
          if (parsed && Date.now() - parsed.t < maxAgeMs) {
            cb(parsed.v);
            return;
          }
        }
      } catch(e) {}
      cb(null);
      return;
    }
    var tx = db.transaction(_IDB_STORE, 'readonly');
    var req = tx.objectStore(_IDB_STORE).get(key);
    req.onsuccess = function() {
      var result = req.result;
      if (result && Date.now() - result.ts < maxAgeMs) {
        cb(result.value);
      } else {
        cb(null);
      }
    };
    req.onerror = function() { cb(null); };
  });
}

// ══════════════════════════════════════════════════════════════
// BULK IMPORT — CSV / EXCEL
// ══════════════════════════════════════════════════════════════


var _importRows   = [];  // розпарсені рядки
var _importErrors = [];  // помилки валідації

// Колонки CSV — порядок і назви
var IMPORT_COLS = [
  { key: 'title',     label: 'Назва*',        required: true  },
  { key: 'price',     label: 'Ціна*',         required: true  },
  { key: 'cat',       label: 'Категорія*',    required: true  },
  { key: 'condition', label: 'Стан',          required: false },
  { key: 'city',      label: 'Місто',         required: false },
  { key: 'desc',      label: 'Опис',          required: false },
  { key: 'battery',   label: 'АКБ (Ah)',      required: false },
  { key: 'speed',     label: 'Швидкість',     required: false },
  { key: 'range',     label: 'Запас ходу',    required: false },
  { key: 'year',      label: 'Рік',           required: false },
  { key: 'bargain',   label: 'Торг/Обмін',    required: false },
];

var VALID_CATS = [
  'Електросамокати','Велосипеди','Електровелосипеди',
  'Електроскутери','Електромотоцикли','Гіроборди та сигвеї',
  'Моноколеса','Квадроцикли','Аксесуари'
];
var VALID_CONDITIONS = ['Новий','Відмінний','Хороший','Задовільний'];
var VALID_BARGAIN    = ['Торг','Обмін','Торг+Обмін',''];

// ── Відкрити модальне вікно імпорту ──────────────────────────
function openImportModal() {
  if (!isLoggedIn) { showToast('⚠️ Увійдіть щоб імпортувати'); return; }
  var existing = document.getElementById('import-modal-overlay');
  if (existing) existing.remove();

  var overlay = document.createElement('div');
  overlay.id = 'import-modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto';
  overlay.onclick = function(e){ if(e.target===overlay) overlay.remove(); };

  overlay.innerHTML = [
    '<div style="background:var(--card-bg);border:1px solid var(--border);border-radius:20px;padding:28px;max-width:560px;width:100%;max-height:90vh;overflow-y:auto">',
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">',
        '<div>',
          '<div style="font-size:18px;font-weight:700">📥 Імпорт оголошень</div>',
          '<div style="font-size:13px;color:var(--text-muted);margin-top:2px">CSV або Excel файл</div>',
        '</div>',
        '<button onclick="document.getElementById(\'import-modal-overlay\').remove()" style="background:none;border:none;font-size:24px;cursor:pointer;color:var(--text-muted)">×</button>',
      '</div>',

      // Шаблон
      '<div style="background:var(--dark3);border-radius:12px;padding:14px 16px;margin-bottom:16px">',
        '<div style="font-size:13px;font-weight:600;margin-bottom:8px">Формат файлу:</div>',
        '<div style="font-size:12px;color:var(--text-muted);line-height:1.8">',
          'Перший рядок — заголовки. Колонки:<br>',
          '<code style="font-size:11px;background:var(--dark2);padding:2px 6px;border-radius:4px;color:var(--brand)">',
          IMPORT_COLS.map(function(c){ return c.label; }).join(' | '),
          '</code>',
        '</div>',
        '<button onclick="_downloadImportTemplate()" style="margin-top:10px;background:none;border:1px solid var(--border);border-radius:8px;padding:6px 14px;font-size:12px;cursor:pointer;color:var(--text-muted);font-family:inherit">',
          '⬇ Завантажити шаблон CSV',
        '</button>',
      '</div>',

      // Drag & drop зона
      '<div id="import-drop-zone" style="border:2px dashed var(--border);border-radius:14px;padding:36px 24px;text-align:center;cursor:pointer;transition:all .2s;margin-bottom:16px"',
        ' onclick="document.getElementById(\'import-file-input\').click()"',
        ' ondragover="event.preventDefault();this.style.borderColor=\'var(--brand)\'"',
        ' ondragleave="this.style.borderColor=\'var(--border)\'"',
        ' ondrop="_onImportDrop(event)">',
        '<div style="font-size:36px;margin-bottom:8px">📂</div>',
        '<div style="font-size:14px;font-weight:600">Перетягніть файл сюди</div>',
        '<div style="font-size:12px;color:var(--text-muted);margin-top:4px">або натисніть щоб обрати</div>',
        '<div style="font-size:11px;color:var(--text-muted);margin-top:6px">.csv, .xlsx, .xls</div>',
        '<input type="file" id="import-file-input" accept=".csv,.xlsx,.xls" style="display:none" onchange="_onImportFile(this)">',
      '</div>',

      // Preview
      '<div id="import-preview" style="display:none">',
        '<div id="import-stats" style="font-size:13px;margin-bottom:12px"></div>',
        '<div id="import-errors-wrap" style="display:none;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.3);border-radius:10px;padding:12px;margin-bottom:12px">',
          '<div style="font-weight:600;font-size:13px;color:#ef4444;margin-bottom:6px">⚠️ Помилки:</div>',
          '<div id="import-errors-list" style="font-size:12px;color:var(--text-muted)"></div>',
        '</div>',
        '<div id="import-table-wrap" style="overflow-x:auto;max-height:220px;border:1px solid var(--border);border-radius:10px;margin-bottom:16px"></div>',
        '<div style="display:flex;gap:10px">',
          '<button class="btn-outline" onclick="_resetImport()" style="flex:1;padding:11px">Скасувати</button>',
          '<button id="import-submit-btn" class="btn-primary" onclick="_submitImport()" style="flex:1;padding:11px" disabled>',
            'Імпортувати (<span id="import-valid-count">0</span>)',
          '</button>',
        '</div>',
      '</div>',
    '</div>'
  ].join('');

  document.body.appendChild(overlay);
}

// ── Drag & drop ───────────────────────────────────────────────
function _onImportDrop(e) {
  e.preventDefault();
  document.getElementById('import-drop-zone').style.borderColor = 'var(--border)';
  var file = e.dataTransfer.files[0];
  if (file) _parseImportFile(file);
}

function _onImportFile(input) {
  var file = input.files[0];
  if (file) _parseImportFile(file);
}

// ── Парсинг файлу ─────────────────────────────────────────────
function _parseImportFile(file) {
  var ext = file.name.split('.').pop().toLowerCase();
  var zone = document.getElementById('import-drop-zone');
  if (zone) zone.innerHTML = '<div style="padding:20px;color:var(--text-muted);font-size:13px">⏳ Читаємо файл...</div>';

  if (ext === 'csv') {
    var reader = new FileReader();
    reader.onload = function(e) {
      var rows = _parseCSV(e.target.result);
      _processImportRows(rows);
    };
    reader.readAsText(file, 'UTF-8');
  } else if (ext === 'xlsx' || ext === 'xls') {
    // Для Excel використовуємо SheetJS якщо доступний, інакше підказуємо CSV
    if (typeof XLSX !== 'undefined') {
      var reader2 = new FileReader();
      reader2.onload = function(e2) {
        var wb = XLSX.read(e2.target.result, { type: 'array' });
        var ws = wb.Sheets[wb.SheetNames[0]];
        var rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        _processImportRows(rows);
      };
      reader2.readAsArrayBuffer(file);
    } else {
      // Підвантажити SheetJS динамічно
      var s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      s.onload = function() { _parseImportFile(file); };
      s.onerror = function() { showToast('⚠️ Конвертуйте файл у CSV'); };
      document.head.appendChild(s);
    }
  } else {
    showToast('⚠️ Підтримуються тільки CSV, XLSX, XLS');
  }
}

// ── Парсер CSV ────────────────────────────────────────────────
function _parseCSV(text) {
  // Підтримка ; та , як розділювач
  var lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (!lines.length) return [];
  var delim = (lines[0].split(';').length > lines[0].split(',').length) ? ';' : ',';

  return lines.filter(function(l){ return l.trim(); }).map(function(line) {
    var cells = []; var cur = ''; var inQ = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (ch === '"') { inQ = !inQ; }
      else if (ch === delim && !inQ) { cells.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
    cells.push(cur.trim());
    return cells;
  });
}

// ── Обробка рядків ────────────────────────────────────────────
function _processImportRows(rows) {
  if (!rows || rows.length < 2) {
    showToast('⚠️ Файл порожній або неправильний формат');
    return;
  }

  // Знайти заголовки
  var headers = rows[0].map(function(h){ return String(h).trim().toLowerCase(); });
  var colMap = {};
  IMPORT_COLS.forEach(function(col) {
    var idx = headers.findIndex(function(h) {
      return h === col.key.toLowerCase() ||
             h === col.label.toLowerCase().replace('*','') ||
             h === col.label.toLowerCase();
    });
    if (idx >= 0) colMap[col.key] = idx;
  });

  // Парсимо рядки
  _importRows = [];
  _importErrors = [];

  var dataRows = rows.slice(1).filter(function(r){ return r.some(function(c){ return c && String(c).trim(); }); });

  dataRows.forEach(function(row, idx) {
    var lineNum = idx + 2;
    var item = {};
    var errors = [];

    IMPORT_COLS.forEach(function(col) {
      var val = (colMap[col.key] !== undefined) ? String(row[colMap[col.key]] || '').trim() : '';
      item[col.key] = val;
    });

    // Валідація
    if (!item.title) errors.push('Рядок ' + lineNum + ': відсутня назва');
    else if (item.title.length > 200) errors.push('Рядок ' + lineNum + ': назва > 200 символів');

    var price = parseInt(String(item.price).replace(/\s/g,'').replace(',','.'));
    if (!price || isNaN(price) || price < 0) errors.push('Рядок ' + lineNum + ': невірна ціна "' + item.price + '"');
    else item.price = price;

    if (!item.cat) errors.push('Рядок ' + lineNum + ': відсутня категорія');
    else {
      var matchCat = VALID_CATS.find(function(c){ return c.toLowerCase() === item.cat.toLowerCase(); });
      if (!matchCat) errors.push('Рядок ' + lineNum + ': невідома категорія "' + item.cat + '"');
      else item.cat = matchCat;
    }

    if (item.condition && !VALID_CONDITIONS.find(function(c){ return c.toLowerCase() === item.condition.toLowerCase(); })) {
      item.condition = 'Хороший'; // fallback
    }

    if (errors.length) {
      _importErrors = _importErrors.concat(errors);
      item._error = errors.join('; ');
      item._valid = false;
    } else {
      item._valid = true;
    }
    item._line = lineNum;
    _importRows.push(item);
  });

  _renderImportPreview();
}

// ── Рендер preview ────────────────────────────────────────────
function _renderImportPreview() {
  var preview = document.getElementById('import-preview');
  var zone    = document.getElementById('import-drop-zone');
  if (!preview) return;

  if (zone) zone.style.display = 'none';
  preview.style.display = '';

  var valid   = _importRows.filter(function(r){ return r._valid; }).length;
  var invalid = _importRows.length - valid;

  var statsEl = document.getElementById('import-stats');
  if (statsEl) {
    statsEl.innerHTML = '✅ Готово до імпорту: <b style="color:var(--brand)">' + valid + '</b>'
      + (invalid ? ' &nbsp;⚠️ З помилками: <b style="color:#ef4444">' + invalid + '</b>' : '');
  }

  // Помилки
  var errWrap = document.getElementById('import-errors-wrap');
  var errList = document.getElementById('import-errors-list');
  if (_importErrors.length && errWrap && errList) {
    errWrap.style.display = '';
    errList.innerHTML = _importErrors.slice(0, 10).map(function(e){ return '• ' + e; }).join('<br>')
      + (_importErrors.length > 10 ? '<br>... ще ' + (_importErrors.length - 10) + ' помилок' : '');
  }

  // Таблиця preview
  var tableWrap = document.getElementById('import-table-wrap');
  if (tableWrap) {
    var previewRows = _importRows.slice(0, 8);
    var html = '<table style="width:100%;border-collapse:collapse;font-size:12px">'
      + '<thead><tr style="background:var(--dark3)">'
      + '<th style="padding:8px;text-align:left;border-bottom:1px solid var(--border)">#</th>'
      + '<th style="padding:8px;text-align:left;border-bottom:1px solid var(--border)">Назва</th>'
      + '<th style="padding:8px;text-align:left;border-bottom:1px solid var(--border)">Ціна</th>'
      + '<th style="padding:8px;text-align:left;border-bottom:1px solid var(--border)">Категорія</th>'
      + '<th style="padding:8px;text-align:left;border-bottom:1px solid var(--border)">Стан</th>'
      + '<th style="padding:8px;text-align:left;border-bottom:1px solid var(--border)">Статус</th>'
      + '</tr></thead><tbody>';

    previewRows.forEach(function(row) {
      var bg = row._valid ? '' : 'background:rgba(239,68,68,.06)';
      html += '<tr style="border-bottom:1px solid var(--border);' + bg + '">'
        + '<td style="padding:7px 8px;color:var(--text-muted)">' + row._line + '</td>'
        + '<td style="padding:7px 8px;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (row.title || '—') + '</td>'
        + '<td style="padding:7px 8px;color:var(--brand);font-weight:600">' + (row.price ? row.price.toLocaleString('uk') + ' грн' : '—') + '</td>'
        + '<td style="padding:7px 8px;color:var(--text-muted)">' + (row.cat || '—') + '</td>'
        + '<td style="padding:7px 8px;color:var(--text-muted)">' + (row.condition || '—') + '</td>'
        + '<td style="padding:7px 8px">' + (row._valid ? '<span style="color:var(--brand)">✓</span>' : '<span style="color:#ef4444" title="' + (row._error||'') + '">✗</span>') + '</td>'
        + '</tr>';
    });

    if (_importRows.length > 8) {
      html += '<tr><td colspan="6" style="padding:8px;text-align:center;color:var(--text-muted)">... ще ' + (_importRows.length - 8) + ' рядків</td></tr>';
    }
    html += '</tbody></table>';
    tableWrap.innerHTML = html;
  }

  // Кнопка імпорту
  var btn = document.getElementById('import-submit-btn');
  var cnt = document.getElementById('import-valid-count');
  if (cnt) cnt.textContent = valid;
  if (btn) btn.disabled = valid === 0;
}

// ── Скинути форму ────────────────────────────────────────────
function _resetImport() {
  _importRows = [];
  _importErrors = [];
  var preview = document.getElementById('import-preview');
  var zone    = document.getElementById('import-drop-zone');
  if (preview) preview.style.display = 'none';
  if (zone) {
    zone.style.display = '';
    zone.innerHTML = '<div style="font-size:36px;margin-bottom:8px">📂</div>'
      + '<div style="font-size:14px;font-weight:600">Перетягніть файл сюди</div>'
      + '<div style="font-size:12px;color:var(--text-muted);margin-top:4px">або натисніть щоб обрати</div>'
      + '<div style="font-size:11px;color:var(--text-muted);margin-top:6px">.csv, .xlsx, .xls</div>'
      + '<input type="file" id="import-file-input" accept=".csv,.xlsx,.xls" style="display:none" onchange="_onImportFile(this)">';
    zone.onclick = function(){ document.getElementById('import-file-input').click(); };
  }
}

// ── Відправити імпорт ─────────────────────────────────────────
function _submitImport() {
  var valid = _importRows.filter(function(r){ return r._valid; });
  if (!valid.length) return;
  if (!isLoggedIn || !window._db) { showToast('⚠️ Увійдіть для імпорту'); return; }

  // Перевірка слотів
  var slots = _totalSlots();
  if (slots < valid.length) {
    showToast('⚠️ Недостатньо слотів. Потрібно ' + valid.length + ', є ' + slots);
    return;
  }

  var btn = document.getElementById('import-submit-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Імпортуємо...'; }

  var done = 0; var failed = 0;
  var total = valid.length;

  function _next(i) {
    if (i >= total) {
      showToast('✅ Імпортовано ' + done + ' оголошень' + (failed ? ', помилок: ' + failed : ''));
      document.getElementById('import-modal-overlay') && document.getElementById('import-modal-overlay').remove();
      if (typeof renderMyListings === 'function') renderMyListings();
      renderHomeListings();
      renderCatalog();
      return;
    }

    var row = valid[i];
    var fbListing = {
      title:      row.title.substring(0, 200),
      price:      row.price || 0,
      cat:        row.cat || '',
      city:       (row.city || '').substring(0, 100),
      condition:  row.condition || 'Хороший',
      desc:       (row.desc || '').substring(0, 2000),
      battery:    (row.battery || '').substring(0, 50),
      speed:      (row.speed || '').substring(0, 50),
      range:      (row.range || '').substring(0, 50),
      year:       row.year || '',
      bargain:    row.bargain || '',
      badge:      '',
      icon:       '',
      img:        '',
      imgs:       [],
      specs:      {},
      time:       new Date().toLocaleDateString('uk-UA'),
      seller:     (currentUser.name || '').substring(0, 100),
      sellerName: (currentUser.name || '').substring(0, 100),
      sellerEmail:(currentUser.email || '').substring(0, 200),
      uid:        currentUser.uid,
      createdAt:  firebase.firestore.FieldValue.serverTimestamp(),
      expiresAt:  firebase.firestore.Timestamp.fromDate(new Date(Date.now() + 30*24*60*60*1000)),
      status:     'active'
    };

    window._db.collection('listings').add(fbListing)
      .then(function(ref) {
        done++;
        fbListing.id = ref.id;
        _fbListings.unshift(fbListing);
        // Списуємо слот і чекаємо завершення перед наступним
        return _consumeSlot();
      })
      .then(function() {
        // Оновити прогрес
        var btn2 = document.getElementById('import-submit-btn');
        if (btn2) btn2.textContent = 'Імпортуємо... ' + (i+1) + '/' + total;
        setTimeout(function(){ _next(i+1); }, 300); // 300ms між записами щоб не перевантажити
      })
      .catch(function(e) {
        failed++;
        console.error('Import error row ' + (i+1) + ':', e.message);
        setTimeout(function(){ _next(i+1); }, 300);
      });
  }
  _next(0);
}

// ── Завантажити шаблон CSV ────────────────────────────────────
function _downloadImportTemplate() {
  var headers = IMPORT_COLS.map(function(c){ return c.label.replace('*',''); }).join(';');
  var example = [
    'Електросамокат Kugoo S3 Pro;15000;Електросамокати;Хороший;Київ;Хороший стан мінімальний пробіг;7.5 Ah;30 км/год;25 км;2022;Торг',
    'Велосипед Trek 820;8500;Велосипеди;Відмінний;Львів;;;"";;"";2023;',
  ].join('\n');
  var csv = headers + '\n' + example;
  var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href = url; a.download = 'ridego-import-template.csv';
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
// ══════════════════════════════════════════════════════════════
// BULK IMPORT END
// ══════════════════════════════════════════════════════════════

// ── QR-код для оголошення ───────────────────────────────────
function showListingQR() {
  var id = window.currentDetailId || '';
  if (!id) { if (typeof showToast === 'function') showToast('Оголошення не знайдено'); return; }
  var url = 'https://ridego.com.ua/listing/' + id;

  // Overlay
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px)';
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

  var card = document.createElement('div');
  card.style.cssText = 'background:var(--card-bg,#fff);border-radius:20px;padding:28px;max-width:360px;width:100%;text-align:center;box-shadow:0 16px 48px rgba(0,0,0,.25)';

  // Close button
  var closeBtn = document.createElement('button');
  closeBtn.innerHTML = '&times;';
  closeBtn.style.cssText = 'position:absolute;top:12px;right:16px;background:none;border:none;font-size:24px;cursor:pointer;color:var(--text-muted,#888)';
  closeBtn.onclick = function() { overlay.remove(); };

  card.style.position = 'relative';
  card.appendChild(closeBtn);

  // Title
  var title = document.createElement('div');
  title.textContent = 'QR-код оголошення';
  title.style.cssText = 'font-size:16px;font-weight:700;margin-bottom:16px';
  card.appendChild(title);

  // QR container
  var qrWrap = document.createElement('div');
  qrWrap.id = 'listing-qr-container';
  qrWrap.style.cssText = 'display:inline-block;padding:16px;background:#fff;border-radius:12px;margin-bottom:16px';
  card.appendChild(qrWrap);

  // URL display
  var urlEl = document.createElement('div');
  urlEl.textContent = url;
  urlEl.style.cssText = 'font-size:11px;color:var(--text-muted,#888);word-break:break-all;margin-bottom:16px;line-height:1.4';
  card.appendChild(urlEl);

  // Copy button
  var copyBtn = document.createElement('button');
  copyBtn.innerHTML = '<i class="fa-solid fa-copy" style="margin-right:6px"></i>Копіювати посилання';
  copyBtn.className = 'btn-outline';
  copyBtn.style.cssText = 'width:100%;padding:11px;font-size:13px';
  copyBtn.onclick = function() {
    navigator.clipboard.writeText(url).then(function() {
      if (typeof showToast === 'function') showToast('✅ Посилання скопійовано!');
    }).catch(function() {});
  };
  card.appendChild(copyBtn);

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  // Generate QR using QRCode library (loaded via CDN in index.html)
  if (typeof QRCode !== 'undefined') {
    new QRCode(qrWrap, {
      text: url,
      width: 200,
      height: 200,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
  } else {
    // Fallback: use API
    var img = document.createElement('img');
    img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(url);
    img.alt = 'QR-код';
    img.style.cssText = 'width:200px;height:200px';
    qrWrap.appendChild(img);
  }
}

// ══════════════════════════════════════════════════════════════
// FEEDBACK SYSTEM — Скарги, пропозиції, зворотний зв'язок
// ══════════════════════════════════════════════════════════════

var _feedbackType = 'question';

function setFeedbackType(type, el) {
  _feedbackType = type;
  document.getElementById('feedback-type').value = type;
  document.querySelectorAll('#feedback-type-pills .pill').forEach(function(p) { p.classList.remove('active'); });
  if (el) el.classList.add('active');
}

function uploadFeedbackImg(input) {
  var file = input.files[0];
  if (!file) return;
  document.getElementById('feedback-img-label').textContent = 'Завантаження...';
  // Preview
  var reader = new FileReader();
  reader.onload = function(e) {
    document.getElementById('feedback-img-el').src = e.target.result;
    document.getElementById('feedback-img-preview').style.display = '';
  };
  reader.readAsDataURL(file);
  // Upload to Cloudinary
  var fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', 'ridego_unsigned');
  fd.append('folder', 'feedback');
  fetch('https://api.cloudinary.com/v1_1/dxgtpo5dq/image/upload', { method: 'POST', body: fd })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.secure_url) {
        document.getElementById('feedback-img-url').value = data.secure_url;
        document.getElementById('feedback-img-label').textContent = 'Файл прикріплено ✓';
        document.getElementById('feedback-img-clear').style.display = '';
      }
    })
    .catch(function() {
      document.getElementById('feedback-img-label').textContent = 'Помилка завантаження';
    });
}

function clearFeedbackImg() {
  document.getElementById('feedback-img-url').value = '';
  document.getElementById('feedback-img-input').value = '';
  document.getElementById('feedback-img-preview').style.display = 'none';
  document.getElementById('feedback-img-clear').style.display = 'none';
  document.getElementById('feedback-img-label').textContent = 'Прикріпити файл';
}

function submitFeedback() {
  // Перевірка авторизації — щоб uid завжди був
  if (!window.currentUser || !currentUser.uid) {
    showToast('⚠️ Увійдіть в акаунт щоб надіслати звернення');
    setTimeout(function() { showPage('profile'); }, 500);
    return;
  }

  var subject = (document.getElementById('feedback-subject').value || '').trim();
  var message = (document.getElementById('feedback-message').value || '').trim();
  var name    = (document.getElementById('feedback-name').value || '').trim();
  var email   = (document.getElementById('feedback-email').value || '').trim();
  var img     = (document.getElementById('feedback-img-url').value || '').trim();
  var type    = _feedbackType || 'question';

  if (!subject) { showToast('⚠️ Введіть тему звернення'); return; }
  if (!message) { showToast('⚠️ Опишіть детальніше вашу проблему'); return; }
  if (!name)    { showToast('⚠️ Вкажіть ваше ім\'я'); return; }

  var btn = document.getElementById('feedback-submit-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="margin-right:8px"></i>Надсилання...'; }

  var feedbackData = {
    type: type,
    subject: subject,
    message: message,
    name: name,
    email: email,
    img: img || null,
    status: 'new',          // new → in_progress → resolved
    adminReply: null,
    uid: (window.currentUser && currentUser.uid) || null,
    userAgent: navigator.userAgent.slice(0, 200),
    page: location.pathname,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  window._db.collection('feedback').add(feedbackData)
    .then(function() {
      showToast('✅ Дякуємо! Ваше звернення надіслано. Ми відповімо найближчим часом.');
      // Reset form
      document.getElementById('feedback-subject').value = '';
      document.getElementById('feedback-message').value = '';
      clearFeedbackImg();
      setFeedbackType('question', document.querySelector('#feedback-type-pills .pill[data-type="question"]'));
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-paper-plane" style="margin-right:8px"></i>Надіслати'; }
      // Reload user's feedback
      if (typeof loadMyFeedback === 'function') loadMyFeedback();
    })
    .catch(function(e) {
      showToast('⚠️ Помилка: ' + e.message);
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-paper-plane" style="margin-right:8px"></i>Надіслати'; }
    });
}

function loadMyFeedback() {
  var section = document.getElementById('my-feedback-section');
  var list = document.getElementById('my-feedback-list');
  if (!section || !list) return;
  var uid = window.currentUser && currentUser.uid;
  if (!uid) { section.style.display = 'none'; return; }

  // Simple query without orderBy to avoid composite index requirement
  window._db.collection('feedback').where('uid', '==', uid).limit(20).get()
    .then(function(snap) {
      if (!snap.size) { section.style.display = 'none'; return; }
      section.style.display = '';

      // Sort client-side
      var items = snap.docs.map(function(d) { return Object.assign({id: d.id}, d.data()); });
      items.sort(function(a, b) {
        var ta = a.createdAt && a.createdAt.seconds ? a.createdAt.seconds : 0;
        var tb = b.createdAt && b.createdAt.seconds ? b.createdAt.seconds : 0;
        return tb - ta;
      });

      var typeLabels = { question: '❓ Питання', suggestion: '💡 Пропозиція', complaint: '⚠️ Скарга', bug: '🐛 Баг' };
      var statusLabels = { new: 'Нове', in_progress: 'В роботі', resolved: 'Вирішено' };
      var statusColors = { new: 'var(--brand)', in_progress: '#ffa726', resolved: '#8b949e' };

      list.innerHTML = items.map(function(f) {
        var date = f.createdAt ? new Date(f.createdAt.seconds * 1000).toLocaleDateString('uk-UA') : '';
        var status = f.status || 'new';
        var hasReply = f.adminReply && f.adminReply.trim();

        return '<div style="background:var(--dark3);border:1px solid ' + (hasReply ? 'rgba(0,200,83,.25)' : 'var(--border)') + ';border-radius:14px;padding:18px;margin-bottom:12px">'
          + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap">'
          + '<span style="font-size:12px;background:var(--brand-dim);color:var(--brand);padding:3px 10px;border-radius:50px;font-weight:600">' + (typeLabels[f.type] || f.type) + '</span>'
          + '<span style="font-size:11px;color:' + (statusColors[status]) + ';font-weight:600">● ' + (statusLabels[status] || status) + '</span>'
          + (hasReply ? '<span style="font-size:11px;background:rgba(0,200,83,.12);color:var(--brand);padding:2px 8px;border-radius:50px;font-weight:600">💬 Є відповідь</span>' : '')
          + '<span style="font-size:11px;color:var(--text-muted);margin-left:auto">' + date + '</span>'
          + '</div>'
          + '<div style="font-weight:700;font-size:15px;margin-bottom:6px">' + _esc(f.subject) + '</div>'
          + '<div style="font-size:13px;color:var(--text-muted);line-height:1.6;white-space:pre-line">' + _esc(f.message.length > 200 ? f.message.slice(0, 200) + '...' : f.message) + '</div>'
          + (hasReply ? '<div style="margin-top:12px;padding:14px 16px;background:var(--brand-dim);border:1px solid rgba(0,200,83,.2);border-radius:12px">'
            + '<div style="font-size:12px;font-weight:700;color:var(--brand);margin-bottom:8px;display:flex;align-items:center;gap:6px"><i class="fa-solid fa-reply"></i> Відповідь від команди RideGO:</div>'
            + '<div style="font-size:14px;color:var(--text);line-height:1.7;white-space:pre-line">' + _esc(f.adminReply) + '</div>'
            + '</div>' : '<div style="margin-top:10px;font-size:12px;color:var(--text-muted);font-style:italic">⏳ Очікує відповіді...</div>')
          + '</div>';
      }).join('');
    })
    .catch(function(e) {
      console.warn('loadMyFeedback:', e.message);
      section.style.display = 'none';
    });
}


// ── Ініціалізація (після завантаження всіх бандлів) ──────────
loadSavedProfile();
_initRouter();
