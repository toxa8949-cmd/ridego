// ── Промо-система: ціни, модальне вікно, публікація ──

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
    img:  uploadedPhotos[0] || '',
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

        var photos = uploadedPhotos.filter(function(p){ return p && p.blob; });
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
  } else {
    console.warn('No db or uid, saving locally');
    _fbListings.unshift(newL);
    if (document.getElementById('pstat-active')) document.getElementById('pstat-active').textContent = _allListings().filter(function(l){ return l.uid === (currentUser && currentUser.uid); }).length;
    if (typeof renderMyListings === 'function') renderMyListings();
    showToast('✅ Оголошення опубліковано!');
    _resetAddWizard();
  }

}

function _resetAddWizard() {
  uploadedPhotos = [];
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
  var l = _allListings().find(function(x){ return x && x.id === id; });
  if (!l) { showToast('⚠️ Оголошення не знайдено'); return; }
  _editListingId = id;

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

  showPage('add');
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


