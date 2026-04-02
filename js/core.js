// ── Утиліти, глобальні змінні, слоти, _esc, _parseDate ──


// ── HERO ПОШУК ─────────────────────────────────────────────
function heroSearch() {
  var q = (document.getElementById('hero-search-input') || {}).value || '';
  if (!q.trim()) { showPage('catalog'); return; }
  showPage('catalog');
  setTimeout(function() {
    var inp = document.getElementById('search-input') || document.getElementById('catalog-search-input');
    if (inp) { inp.value = q.trim(); }
    if (typeof runSearch === 'function') runSearch();
    else if (typeof filterListings === 'function') filterListings();
  }, 100);
}

function heroFilter(type, value) {
  showPage('catalog');
  setTimeout(function() {
    if (type === 'category') {
      var catEl = document.getElementById('fp-cat') || document.querySelector('[id*="cat"]');
      if (catEl) { catEl.value = value; }
    } else if (type === 'price') {
      var priceEl = document.getElementById('fp-price-to') || document.getElementById('filter-price-to');
      if (priceEl) { priceEl.value = value; }
    } else if (type === 'condition') {
      var condEl = document.getElementById('fp-condition') || document.querySelector('[id*="condition"]');
      if (condEl) { condEl.value = value; }
    } else if (type === 'city') {
      var cityEl = document.getElementById('fp-city');
      if (cityEl) { cityEl.value = value; }
    }
    if (typeof runSearch === 'function') runSearch();
    else if (typeof filterListings === 'function') filterListings();
    if (typeof updateActiveFilters === 'function') updateActiveFilters();
  }, 100);
}

function _esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

var _userSlots = {
  slots: 0,
  slotsWelcome: 0,
  slotsWelcomeExpiry: null,
  lastFreeSlotAt: null,
  loaded: false
};

function _totalSlots() {
  var welcome = Math.max(0, _userSlots.slotsWelcome || 0);
  var bought  = Math.max(0, _userSlots.slots || 0);
  if (welcome > 0 && _userSlots.slotsWelcomeExpiry) {
    var exp = _userSlots.slotsWelcomeExpiry;
    var expDate = exp && exp.seconds ? new Date(exp.seconds * 1000)
                : exp && exp.toDate  ? exp.toDate()
                : new Date(exp);
    if (!isNaN(expDate.getTime()) && new Date() > expDate) welcome = 0;
  }
  return bought + welcome;
}

function loadUserSlots() {
  if (!window._db || !currentUser || !currentUser.uid) return;
  window._db.collection('users').doc(currentUser.uid).get().then(function(snap) {
    if (!snap.exists) return;
    var d = snap.data();

    _userSlots.slots             = Math.max(0, d.slots || 0);
    _userSlots.slotsWelcome      = Math.max(0, d.slotsWelcome || 0);
    _userSlots.slotsWelcomeExpiry= d.slotsWelcomeExpiry || null;
    _userSlots.lastFreeSlotAt    = d.lastFreeSlotAt || null;
    _userSlots.loaded            = true;

    var fixUpdate = {};
    if ((d.slots || 0) < 0)        { fixUpdate.slots = 0; }
    if ((d.slotsWelcome || 0) < 0) { fixUpdate.slotsWelcome = 0; }
    if (Object.keys(fixUpdate).length > 0) {
      window._db.collection('users').doc(currentUser.uid).update(fixUpdate).catch(function(){});
    }

    _checkMonthlyFreeSlot();
    _renderSlotsUI();
  }).catch(function(e){ console.log('slots load:', e.message); });
}

function _checkMonthlyFreeSlot() {
  if (!window._db || !currentUser || !currentUser.uid) return;
  var now = new Date();
  var lastDate = _userSlots.lastFreeSlotAt
    ? (_userSlots.lastFreeSlotAt.seconds
        ? new Date(_userSlots.lastFreeSlotAt.seconds * 1000)
        : new Date(_userSlots.lastFreeSlotAt))
    : null;

  var shouldGive = !lastDate || (now - lastDate) >= 30 * 24 * 60 * 60 * 1000;
  if (!shouldGive) return;

  // Для нових користувачів (lastDate === null) — тільки ініціалізуємо lastFreeSlotAt,
  // не нараховуємо слот (вони вже отримали slotsWelcome)
  if (!lastDate) {
    window._db.collection('users').doc(currentUser.uid).update({
      lastFreeSlotAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(function(){});
    _userSlots.lastFreeSlotAt = { seconds: Math.floor(Date.now() / 1000) };
    return;
  }

  _userSlots.slots = (_userSlots.slots || 0) + 1;
  window._db.collection('users').doc(currentUser.uid).update({
    slots: firebase.firestore.FieldValue.increment(1),
    lastFreeSlotAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(function() {
    _userSlots.lastFreeSlotAt = { seconds: Math.floor(Date.now() / 1000) };
    _renderSlotsUI();
    showToast('🎁 Нараховано 1 безкоштовний слот за цей місяць!');
  }).catch(function(e){ console.log('monthly slot:', e.message); });
}

function _initNewUserSlots(uid) {
  if (!window._db || !uid) return;
  var expiry = new Date();
  expiry.setDate(expiry.getDate() + 30);
  window._db.collection('users').doc(uid).update({
    slots: 0,
    slotsWelcome: 10,
    slotsWelcomeExpiry: firebase.firestore.Timestamp.fromDate(expiry),
    lastFreeSlotAt: firebase.firestore.FieldValue.serverTimestamp(),
    totalListingsPublished: 0
  }).catch(function(e){ console.log('init slots:', e.message); });
  _userSlots.slots = 0;
  _userSlots.slotsWelcome = 10;
  _userSlots.slotsWelcomeExpiry = { seconds: Math.floor(expiry.getTime() / 1000) };

  // Відправити вітальний email
  if (currentUser && currentUser.email) {
    fetch('/api/send-email', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        type: 'welcome',
        to: currentUser.email,
        data: { name: currentUser.displayName || currentUser.email.split('@')[0] }
      })
    }).catch(function(e){ console.log('welcome email error:', e.message); });
  }
  _userSlots.loaded = true;
}

function _consumeSlot() {
  if (!window._db || !currentUser || !currentUser.uid) return Promise.resolve(false);
  if (_totalSlots() <= 0) return Promise.resolve(false);

  var now = new Date();
  var welcomeCount = _userSlots.slotsWelcome || 0;
  var welcomeValid = false;

  if (welcomeCount > 0) {
    if (!_userSlots.slotsWelcomeExpiry) {

      welcomeValid = true;
    } else {

      var expiry = _userSlots.slotsWelcomeExpiry;
      var expiryDate;
      if (expiry && expiry.seconds) {
        expiryDate = new Date(expiry.seconds * 1000);
      } else if (expiry && expiry.toDate) {
        expiryDate = expiry.toDate();
      } else if (expiry instanceof Date) {
        expiryDate = expiry;
      } else {
        expiryDate = new Date(expiry);
      }
      welcomeValid = !isNaN(expiryDate.getTime()) && now < expiryDate;
    }
  }

  var update = {};
  if (welcomeValid && welcomeCount > 0) {
    update.slotsWelcome = firebase.firestore.FieldValue.increment(-1);
    _userSlots.slotsWelcome = Math.max(0, welcomeCount - 1);
  } else if ((_userSlots.slots || 0) > 0) {
    update.slots = firebase.firestore.FieldValue.increment(-1);
    _userSlots.slots = Math.max(0, (_userSlots.slots || 0) - 1);
  } else {

    return Promise.resolve(false);
  }
  update.totalListingsPublished = firebase.firestore.FieldValue.increment(1);

  return window._db.collection('users').doc(currentUser.uid).update(update)
    .then(function() { _renderSlotsUI(); return true; })
    .catch(function(e) { console.log('consume slot:', e.message); return false; });
}

var SLOT_PACKAGES = [
  { count: 1,  price: 15,  label: '1 слот',    discount: 0   },
  { count: 3,  price: 43,  label: '3 слоти',   discount: 5   },
  { count: 5,  price: 68,  label: '5 слотів',  discount: 10  },
  { count: 10, price: 128, label: '10 слотів', discount: 15  },
  { count: 20, price: 225, label: '20 слотів', discount: 25  },
  { count: 50, price: 525, label: '50 слотів', discount: 30  },
];

function buySlotPackage(count, price) {
  showToast('⏳ Оплата розміщень скоро буде доступна! Слідкуйте за оновленнями.');
}

function _renderSlotsUI() {
  var total   = Math.max(0, _totalSlots());
  var welcome = Math.max(0, Math.min(_userSlots.slotsWelcome || 0, total));
  var bought  = Math.max(0, _userSlots.slots || 0);

  var panel = document.getElementById('slots-panel');
  if (!panel) return;

  var welcomeExpiry = '';
  if (welcome > 0 && _userSlots.slotsWelcomeExpiry) {
    var exp = new Date(_userSlots.slotsWelcomeExpiry.seconds * 1000);
    welcomeExpiry = ' (згорають ' + exp.toLocaleDateString('uk-UA', {day:'numeric',month:'long'}) + ')';
  }

  // Склонування: розміщення
  var label = total === 1 ? 'розміщення' : total < 5 ? 'розміщення' : 'розміщень';

  panel.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:16px">'
    + '<div>'
    + '<div style="font-size:28px;font-weight:800;color:var(--brand)">' + total + '</div>'
    + '<div style="font-size:13px;color:var(--text-muted)">доступних ' + label + '</div>'
    + '</div>'
    + '<button class="btn-primary" style="padding:10px 20px;font-size:14px" onclick="openBuySlots()">'
    + '<i class="fa-solid fa-plus" style="margin-right:6px"></i>Купити розміщення</button>'
    + '</div>'
    + (welcome > 0 ? '<div style="font-size:13px;color:var(--text-muted);margin-bottom:8px">🎁 Стартові: <b>' + welcome + '</b>' + welcomeExpiry + '</div>' : '')
    + (bought > 0  ? '<div style="font-size:13px;color:var(--text-muted);margin-bottom:8px">💳 Куплені: <b>' + bought + '</b> (не згорають)</div>' : '')
    + (total === 0 ? '<div style="font-size:13px;color:#ff5252;margin-bottom:8px">⚠️ Розміщень немає — придбайте щоб публікувати оголошення</div>' : '');
}

function openBuySlots() {
  var overlay = document.getElementById('buy-slots-overlay');
  if (overlay) { overlay.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
}
function closeBuySlots() {
  var overlay = document.getElementById('buy-slots-overlay');
  if (overlay) { overlay.style.display = 'none'; document.body.style.overflow = ''; }
}

const LISTINGS = [];

let favorites = [];
let myListings = [];
let activeChat = null;
let isLoggedIn = false;
let currentUser = { name:'', email:'', initial:'' };

const chats = [];

function getSellerById(name) {

