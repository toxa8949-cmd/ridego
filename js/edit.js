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

