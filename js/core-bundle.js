// ── UA PLURALIZATION HELPER ──────────────────────────────
window.updateHomeStats = function(){ try { var L = (typeof _allListings === 'function') ? _allListings() : []; if (!L.length) return; var c={}, s={}; for (var i=0;i<L.length;i++){ var l=L[i]; if (l.city) c[l.city]=1; var u=l.uid||l.userId||l.sellerId; if (u) s[u]=1; } var nL=L.length, nC=Object.keys(c).length, nS=Object.keys(s).length; var st=function(id,v){ var e=document.getElementById(id); if (e) e.textContent=v; }; st('stat-listings',nL); st('stat-sellers',nS); st('stat-cities',nC); var h=document.getElementById('hero-count-text'); if (h) h.textContent='Більше '+nL+' '+(window.plUk?plUk(nL,['пропозиція','пропозиції','пропозицій']):'пропозицій'); } catch(e){} };
[300, 1500, 4000, 8000].forEach(function(d){ setTimeout(function(){ if (window.updateHomeStats) window.updateHomeStats(); }, d); });
window.plUk = function(n, forms) {
  var m10 = Math.abs(n) % 10, m100 = Math.abs(n) % 100;
  if (m10 === 1 && m100 !== 11) return forms[0];
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return forms[1];
  return forms[2];
};

// ── HTML ESCAPE HELPERS (XSS prevention) ────────────────
window.escHtml = function(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
};
window.escAttr = window.escHtml;

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

function loadUserSlots(profileData) {
  if (!currentUser || !currentUser.uid) return;

  // Якщо передали дані з профілю — не робити зайвий Firestore read
  if (profileData) {
    _applySlots(profileData);
    return;
  }

  // Спробувати з localStorage кешу профілю
  var _pcKey = '_pc_' + currentUser.uid;
  try {
    var _pcAt = parseInt(localStorage.getItem(_pcKey + '_at') || '0');
    if (Date.now() - _pcAt < 15 * 60 * 1000) {
      var cached = JSON.parse(localStorage.getItem(_pcKey) || 'null');
      if (cached) { _applySlots(cached); return; }
    }
  } catch(e) {}

  // Fallback — читаємо з Firestore (рідко, тільки коли немає кешу)
  if (!window._db) {
    if (typeof window._onFirebaseReady === 'function') window._onFirebaseReady(function() { _loadUserSlots(); });
    return;
  }
  window._db.collection('users').doc(currentUser.uid).get().then(function(snap) {
    if (!snap.exists) return;
    _applySlots(snap.data());
  }).catch(function(e){ void('slots load:', e.message); });
}

function _applySlots(d) {
    _userSlots.slots             = Math.max(0, d.slots || 0);
    _userSlots.slotsWelcome      = Math.max(0, d.slotsWelcome || 0);
    _userSlots.slotsWelcomeExpiry= d.slotsWelcomeExpiry || null;
    _userSlots.lastFreeSlotAt    = d.lastFreeSlotAt || null;
    _userSlots.loaded            = true;
    _checkMonthlyFreeSlot();
    _renderSlotsUI();
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
  }).catch(function(e){ void('monthly slot:', e.message); });
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
  }).catch(function(e){ void('init slots:', e.message); });
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
    }).catch(function(e){ void('welcome email error:', e.message); });
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
    .catch(function(e) { void('consume slot:', e.message); return false; });
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
  const map = {
    'Олег К.': 'oleg-k', 'Марія В.': 'maria-v', 'Auto-Market': 'auto-market',
    'Велосипед Шоп': 'veloshop', 'Parts Store': 'parts-store', 'Moto Parts': 'parts-store',
    'ElectroMax': 'electromax',
  };
  return _fbSellers.find(s => s.id === (map[name] || ''));
}

function updateProfileCats() {
  var checked = [];
  document.querySelectorAll('#set-cats-wrap input[type=checkbox]:checked').forEach(function(cb) {
    checked.push(cb.value);
  });
  var hiddenEl = document.getElementById('set-cats-value');
  if (hiddenEl) hiddenEl.value = JSON.stringify(checked);
}
function _fillProfileCats(cats) {
  if (!cats || !cats.length) return;
  document.querySelectorAll('#set-cats-wrap input[type=checkbox]').forEach(function(cb) {
    cb.checked = cats.indexOf(cb.value) >= 0;
  });
  updateProfileCats();
}

function toggleFaq(el) {
  var isOpen = el.classList.contains('open');

  document.querySelectorAll('.faq-q').forEach(function(q) {
    q.classList.remove('open');
    var a = q.nextElementSibling;
    if (a) a.classList.remove('open');
  });

  if (!isOpen) {
    el.classList.add('open');
    var answer = el.nextElementSibling;
    if (answer) answer.classList.add('open');
  }
}

function _parseDate(val) {
  if (!val) return null;
  if (val.seconds) return new Date(val.seconds * 1000);
  if (val.toDate) return val.toDate();
  var d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function _timeAgo(val) {
  var date = _parseDate(val);
  if (!date) return '';
  var now = Date.now();
  var diff = Math.floor((now - date.getTime()) / 1000);
  if (diff < 60)    return 'Щойно';
  if (diff < 3600)  return Math.floor(diff / 60) + ' хв. тому';
  if (diff < 86400) return Math.floor(diff / 3600) + ' год. тому';
  var days = Math.floor(diff / 86400);
  if (days === 1) return 'Вчора';
  if (days < 7)  return days + ' дн. тому';
  if (days < 30) return Math.floor(days / 7) + ' тижд. тому';
  if (days < 365) return Math.floor(days / 30) + ' міс. тому';
  return date.toLocaleDateString('uk-UA', {day:'numeric',month:'short',year:'numeric'});
}

function _isPromoActive(l) {
  if (!l || !l.promo) return false;
  if (!l.promoUntil) return true;
  var until = _parseDate(l.promoUntil);
  return until ? until > new Date() : true;
}

function _cleanExpiredPromos(listings) {
  var expired = [];
  var now = new Date();
  listings.forEach(function(l) {
    if (!l || !l.promo) return;

    if (!l.promoUntil) return;
    var until = _parseDate(l.promoUntil);

    if (!until) return;
    if (until <= now) {
      expired.push(l.id);
      delete l.promo;
      delete l.promoUntil;
      delete l.promoDays;
    }
  });

  if (window._db && expired.length) {
    expired.forEach(function(id) {
      if (!id) return;
      window._db.collection('listings').doc(String(id)).update({
        promo: firebase.firestore.FieldValue.delete(),
        promoUntil: firebase.firestore.FieldValue.delete(),
        promoDays: firebase.firestore.FieldValue.delete()
      }).catch(function(){});
    });
  }
  return listings;
}

var MAX_TOP_IN_ROW = 4;

function _sortWithPromo(data, sortType) {

  data.forEach(function(l) {
    if (l.promo && !_isPromoActive(l)) {
      delete l.promo;
    }
  });

  var tops      = data.filter(function(l){ return l.promo === 'top'; });
  var highlights= data.filter(function(l){ return l.promo === 'highlight'; });
  var urgents   = data.filter(function(l){ return l.promo === 'urgent'; });
  var regulars  = data.filter(function(l){ return !l.promo || l.promo === 'banner'; });

  var byDate = function(a, b) {
    var ta = a.createdAt && a.createdAt.seconds ? a.createdAt.seconds : 0;
    var tb = b.createdAt && b.createdAt.seconds ? b.createdAt.seconds : 0;
    return tb - ta;
  };
  var byDateAsc = function(a, b) { return byDate(b, a); };

  tops.sort(byDate);
  highlights.sort(byDate);
  urgents.sort(byDate);

  if (sortType === 'cheap') {
    regulars.sort(function(a,b){ return a.price - b.price; });
  } else if (sortType === 'expensive') {
    regulars.sort(function(a,b){ return b.price - a.price; });
  } else {
    regulars.sort(byDate);
  }

  var mixed = [];
  var urgIdx = 0, hlIdx = 0, regIdx = 0;
  var regBatch = 3;

  var topIdx = 0;
  var totalItems = data.length;
  var inserted = 0;

  while (topIdx < tops.length || regIdx < regulars.length || urgIdx < urgents.length || hlIdx < highlights.length) {

    var topBatch = Math.min(MAX_TOP_IN_ROW, tops.length - topIdx);
    for (var i = 0; i < topBatch; i++) {
      mixed.push(tops[topIdx++]);
    }

    if (urgIdx < urgents.length) mixed.push(urgents[urgIdx++]);

    if (hlIdx < highlights.length) mixed.push(highlights[hlIdx++]);

    for (var j = 0; j < regBatch && regIdx < regulars.length; j++) {
      mixed.push(regulars[regIdx++]);
    }

    if (topBatch === 0 && urgIdx >= urgents.length && hlIdx >= highlights.length && regIdx >= regulars.length) break;
    if (topBatch === 0 && tops.length === 0) {

      while (regIdx < regulars.length) mixed.push(regulars[regIdx++]);
      while (urgIdx < urgents.length) mixed.push(urgents[urgIdx++]);
      while (hlIdx < highlights.length) mixed.push(highlights[hlIdx++]);
      break;
    }
  }
  return mixed;
}

function _allListings() {
  var seen = {};
  return _fbListings.concat(myListings).filter(function(l) {
    if (!l || !l.id) return false;
    if (seen[l.id]) return false;
    seen[l.id] = true;
    return true;
  });
}

var _citySearchTimer = null;
var _citySearchCache = {};

function onCityInput(val) {
  var sugEl = document.getElementById('city-suggestions');
  if (!sugEl) return;
  val = (val || '').trim();
  if (val.length < 2) { sugEl.style.display = 'none'; return; }
  clearTimeout(_citySearchTimer);
  _citySearchTimer = setTimeout(function() { _searchCityNominatim(val); }, 350);

  clearTimeout(_cityMapTimer);
  _cityMapTimer = setTimeout(function() {
    if (document.getElementById('new-city').value.trim().length >= 2) {
      onCityChange();
    }
  }, 800);
}

var _cityMapTimer = null;

function _searchCityNominatim(q) {
  var sugEl = document.getElementById('city-suggestions');
  if (!sugEl) return;
  if (_citySearchCache[q]) { _renderCitySuggestions(_citySearchCache[q]); return; }
  sugEl.style.display = '';
  sugEl.innerHTML = '<div style="padding:10px 14px;font-size:13px;color:var(--text-muted)">Пошук...</div>';

  var url = 'https://nominatim.openstreetmap.org/search'
    + '?q=' + encodeURIComponent(q + ' Україна')
    + '&countrycodes=ua'
    + '&addressdetails=1'
    + '&limit=10'
    + '&format=json'
    + '&accept-language=uk';

  fetch(url, { headers: { 'Accept-Language': 'uk,en' } })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var results = [];
      var seen = {};
      data.forEach(function(p) {
        var addr = p.address || {};

        var name = addr.village || addr.hamlet || addr.city || addr.town
                || addr.suburb || addr.municipality || addr.county
                || p.display_name.split(',')[0];
        if (!name) return;

        var cleanName = name.replace(/ громада$/i, '').replace(/ рада$/i, '');
        var oblast = (addr.state || '').replace(' область', ' обл.');
        var raion  = (addr.county || '').replace(' район', ' р-н');
        var sub    = [raion, oblast].filter(Boolean).join(', ');
        var key    = cleanName.toLowerCase() + '|' + (addr.state || '');
        if (seen[key]) return;
        seen[key] = true;
        results.push({ name: cleanName, sub: sub });
      });
      _citySearchCache[q] = results;
      _renderCitySuggestions(results);
    })
    .catch(function() { sugEl.style.display = 'none'; });
}

function _renderCitySuggestions(results) {
  var sugEl = document.getElementById('city-suggestions');
  if (!sugEl) return;
  if (!results.length) {
    sugEl.innerHTML = '<div style="padding:10px 14px;font-size:13px;color:var(--text-muted)">Не знайдено — введіть назву вручну</div>';
    sugEl.style.display = '';
    return;
  }
  sugEl.innerHTML = results.map(function(r) {
    var safe = r.name.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
    return '<div class="city-sug-item" onclick="selectCitySuggestion(\'' + safe + '\')">'
      + '<div style="font-size:14px;font-weight:600">' + window.escHtml(r.name) + '</div>'
      + (r.sub ? '<div style="font-size:12px;color:var(--text-muted)">' + window.escHtml(r.sub) + '</div>' : '')
      + '</div>';
  }).join('');
  sugEl.style.display = '';
}

function selectCitySuggestion(name) {
  var inp = document.getElementById('new-city');
  if (inp) inp.value = name;
  closeCitySuggestions();

  setTimeout(onCityChange, 50);
}

function closeCitySuggestions() {
  var s = document.getElementById('city-suggestions');
  if (s) s.style.display = 'none';
}

function toggleMobileSearch() {
  var bar = document.getElementById('mobileSearchBar');
  if (!bar) return;
  var isOpen = bar.style.display !== 'none';
  bar.style.display = isOpen ? 'none' : 'flex';
  if (!isOpen) {
    var inp = document.getElementById('headerSearchMobile');
    if (inp) { inp.removeAttribute('readonly'); setTimeout(function(){ inp.focus(); }, 50); }
  }
}

let _routerLock = false;
var _savedScrollPositions = {};

function _setPath(path) {
  if (location.pathname !== path) {
    // Зберігаємо поточну позицію скролу для поточного шляху
    _savedScrollPositions[location.pathname] = window.scrollY;
    history.pushState({ scrollY: window.scrollY, from: location.pathname }, '', path);
  }
}

var CAT_SLUGS = {
  'elektrosamokaty':   'Електросамокати',
  'velosypedy':        'Велосипеди',
  'elektrovelosypedy': 'Електровелосипеди',
  'elektroskutery':    'Електроскутери',
  'elektromotocykly':  'Електромотоцикли',
};
var CAT_TO_SLUG = {};
Object.keys(CAT_SLUGS).forEach(function(slug) { CAT_TO_SLUG[CAT_SLUGS[slug]] = slug; });

function _parsePath(path) {
  var p = (path || location.pathname).replace(/\/+$/, '') || '/';
  if (p === '/' || p === '/home') return { page: 'home' };
  if (p === '/catalog')   return { page: 'catalog' };
  if (p === '/add')       return { page: 'add' };
  if (p === '/services')  return { page: 'services' };
  if (p === '/messages')  return { page: 'messages' };
  if (p === '/profile')   return { page: 'profile' };
  if (p === '/news')      return { page: 'news' };
  if (p === '/faq')       return { page: 'faq' };
  if (p === '/terms')     return { page: 'terms' };
  if (p === '/privacy')   return { page: 'privacy' };
  if (p === '/feedback')  return { page: 'feedback' };

  var listingMatch = p.match(/^\/listing\/(.+)$/);
  if (listingMatch) return { page: 'detail', id: listingMatch[1] };

  var serviceMatch = p.match(/^\/service\/(.+)$/);
  if (serviceMatch) return { page: 'service-detail', id: serviceMatch[1] };

  var sellerMatch = p.match(/^\/seller\/(.+)$/);
  if (sellerMatch) return { page: 'seller', id: 'uid:' + sellerMatch[1] };

  var catMatch = p.match(/^\/category\/(.+)$/);
  if (catMatch && CAT_SLUGS[catMatch[1]]) return { page: 'catalog', cat: CAT_SLUGS[catMatch[1]] };

  var brandMatch = p.match(/^\/brand\/(.+)$/);
  if (brandMatch) return { page: 'catalog', brand: brandMatch[1] };

  // SEO pages
  if (p === '/prodaty-elektrosamokat') return { page: 'catalog' };
  if (p === '/elektrosamokat-z-sydinniam') return { page: 'catalog' };
  if (p === '/elektrosamokat-dlya-mista') return { page: 'catalog' };
  if (p === '/elektrosamokat-dlia-bezdorizhzhia') return { page: 'catalog' };
  if (p === '/elektrosamokat-biudzhetnyj') return { page: 'catalog' };
  if (p === '/elektrosamokat-kyiv') return { page: 'catalog' };
  if (p === '/elektrosamokat-kharkiv') return { page: 'catalog' };
  if (p === '/elektrosamokat-odesa') return { page: 'catalog' };
  if (p === '/elektrosamokat-dnipro') return { page: 'catalog' };
  if (p === '/elektrosamokat-lviv') return { page: 'catalog' };
  if (p === '/kukirin-vs-ninebot') return { page: 'catalog', brand: 'kukirin' };
  if (p === '/kukirin-vs-xiaomi') return { page: 'catalog', brand: 'kukirin' };
  if (p === '/dualtron-vs-kaabo') return { page: 'catalog', brand: 'dualtron' };

  var modelMatch = p.match(/^\/(kukirin|dualtron|xiaomi|ninebot|kaabo|vsett)-(.+)$/);
  if (modelMatch) return { page: 'catalog', brand: modelMatch[1], model: modelMatch[2] };

  var newsMatch = p.match(/^\/news\/(.+)$/);
  if (newsMatch) return { page: 'news-detail', id: newsMatch[1] };

  // Невідомий маршрут — 404
  return { page: '404' };
}

function _setHash(hash) {
  var pathMap = {
    '': '/', 'home': '/', 'catalog': '/catalog', 'add': '/add',
    'services': '/services', 'messages': '/messages', 'profile': '/profile', 'news': '/news',
    'feedback': '/feedback'
  };
  if (pathMap[hash] !== undefined) { _setPath(pathMap[hash]); return; }
  if (hash.startsWith('detail/')) { _setPath('/listing/' + hash.replace('detail/', '')); return; }
  if (hash.startsWith('service/')) { _setPath('/service/' + hash.replace('service/', '')); return; }
  if (hash.startsWith('seller/uid:')) { _setPath('/seller/' + hash.replace('seller/uid:', '')); return; }
  if (hash.startsWith('seller/')) { _setPath('/seller/' + hash.replace('seller/', '')); return; }
  _setPath('/' + hash);
}

function _parseHash(hash) { return _parsePath(); }

function _renderRoute(route, isBack) {
  _routerLock = true;
  const { page, id, cat } = route;

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('page-' + page);
  if (el) {
    el.classList.add('active');
  } else if (page === '404') {
    // Show 404 page
    var notFoundEl = document.getElementById('page-404');
    if (!notFoundEl) {
      notFoundEl = document.createElement('div');
      notFoundEl.id = 'page-404';
      notFoundEl.className = 'page';
      notFoundEl.innerHTML = '<div style="min-height:70vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px 24px">'
        + '<div style="font-size:80px;margin-bottom:16px">🛴</div>'
        + '<div style="font-size:clamp(60px,15vw,120px);font-weight:800;line-height:1;background:linear-gradient(135deg,var(--brand),#00e676);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:16px">404</div>'
        + '<h1 style="font-size:clamp(20px,3vw,28px);font-weight:800;margin-bottom:12px">Сторінку не знайдено</h1>'
        + '<p style="color:var(--text-muted);font-size:15px;max-width:400px;margin-bottom:32px;line-height:1.6">Здається, ця сторінка поїхала кататись і не повернулась. Перевірте адресу або поверніться на головну.</p>'
        + '<div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center">'
        + '<button class="btn-primary" onclick="showPage(\'home\')" style="padding:13px 28px"><i class="fa-solid fa-house" style="margin-right:8px"></i>На головну</button>'
        + '<button class="btn-outline" onclick="showPage(\'catalog\')" style="padding:13px 28px"><i class="fa-solid fa-search" style="margin-right:8px"></i>Каталог</button>'
        + '</div>'
        + '</div>';
      // Insert before footer
      var footer = document.querySelector('.site-footer');
      if (footer) footer.parentNode.insertBefore(notFoundEl, footer);
      else document.body.appendChild(notFoundEl);
    }
    notFoundEl.classList.add('active');
  }

  document.querySelectorAll('.mnav-item').forEach(b => b.classList.remove('active'));
  const navMap = { home:0, catalog:1, services:2, profile:3 };
  const navItems = document.querySelectorAll('.mnav-item');
  if (navMap[page] !== undefined && navItems[navMap[page]]) navItems[navMap[page]].classList.add('active');

  if (!isBack) window.scrollTo({ top: 0, behavior: 'smooth' });

  if (page === 'home')     renderHomeListings();
  if (page === 'messages') {

    if (window._authInitialized && !isLoggedIn) {
      showToast('⚠️ Увійдіть щоб переглянути повідомлення');
      _renderRoute({ page: 'profile' });
      return;
    }
    renderChats();
  }
  if (page === 'profile') {

    var _authLoading = document.getElementById('auth-loading');
    var _authWall    = document.getElementById('auth-wall');
    var _profileWall = document.getElementById('profile-wall');
    if (!window._authInitialized) {
      if (_authLoading) _authLoading.style.display = '';
      if (_authWall)    _authWall.style.display    = 'none';
      if (_profileWall) _profileWall.style.display = 'none';
    } else {
      renderProfile();
    }
  }
  if (page === 'catalog') {

    if (!route.cat) {
      selectedCat = null;
      document.querySelectorAll('.transport-btn').forEach(function(b){ b.classList.remove('selected'); });
      var fp = document.getElementById('filter-panel');
      if (fp) fp.classList.remove('open');
      var rw = document.getElementById('catalog-results-wrap');
      if (rw) rw.style.display = 'none';
      var dv = document.getElementById('catalog-divider');
      if (dv) dv.style.display = 'none';
    }
    // Якщо прийшли з /category/elektrosamokaty — автоматично вибрати категорію
    if (route.cat) {
      setTimeout(function() {
        var catBtn = document.querySelector('.transport-btn[data-cat="' + route.cat + '"]');
        if (catBtn) {
          document.querySelectorAll('.transport-btn').forEach(function(b){ b.classList.remove('selected'); });
          catBtn.classList.add('selected');
        }
        selectedCat = route.cat;
        if (typeof openFilterPanel === 'function') openFilterPanel(route.cat);
        setTimeout(function(){ if (typeof runSearch === 'function') runSearch(); }, 200);
      }, 150);
    }
    // Якщо прийшли з /brand/kukirin — автоматично вибрати категорію і бренд
    if (route.brand) {
      var _brandMap = {
        'kukirin': { cat: 'Електросамокати', brand: 'KuKirin' },
        'dualtron': { cat: 'Електросамокати', brand: 'Dualtron' },
        'xiaomi': { cat: 'Електросамокати', brand: 'Xiaomi' },
        'ninebot': { cat: 'Електросамокати', brand: 'Ninebot' },
        'kaabo': { cat: 'Електросамокати', brand: 'Kaabo' },
        'vsett': { cat: 'Електросамокати', brand: 'Vsett' },
        'kugoo': { cat: 'Електросамокати', brand: 'Kugoo' },
      };
      var _modelMap = {
        'g2': 'G2', 'g2-pro': 'G2 Pro', 'g2-max': 'G2 Max',
        'g3': 'G3', 'g3-pro': 'G3 Pro', 'g4': 'G4', 'g4-max': 'G4 Max',
        'm4-pro': 'M4 Pro', 'm5-pro': 'M5 Pro', 's1-max': 'S1 Max',
        't3': 'T3', 'c1-pro': 'C1 Pro',
        'thunder-2': 'Thunder 2', 'victor': 'Victor', 'storm': 'Storm',
        'spider-2': 'Spider 2', 'eagle-pro': 'Eagle Pro',
        'scooter-4': 'Mi Scooter 4', 'scooter-4-pro': 'Mi Scooter 4 Pro',
        'scooter-4-ultra': 'Mi Scooter 4 Ultra', 'scooter-5': 'Mi Scooter 5',
        'scooter-5-pro': 'Mi Scooter 5 Pro',
        'max-g30': 'MAX G30', 'f2-pro': 'F2 Pro', 'gt3': 'GT3',
        'mantis-10-pro': 'Mantis 10 Pro', 'wolf-warrior-11': 'Wolf Warrior 11',
        'wolf-king-gt-pro': 'Wolf King GT Pro',
        '10-plus': '10+', '11-plus': '11+', '9-plus': '9+'
      };
      var _bm = _brandMap[route.brand];
      if (_bm) {
        setTimeout(function() {
          // Вибрати категорію
          // Встановити категорію без зміни URL
          var catBtn = document.querySelector('.transport-btn[data-cat="' + _bm.cat + '"]');
          if (catBtn) { document.querySelectorAll('.transport-btn').forEach(function(b){ b.classList.remove('selected'); }); catBtn.classList.add('selected'); }
          selectedCat = _bm.cat;
          if (typeof openFilterPanel === 'function') openFilterPanel(_bm.cat);
          // Встановити бренд у фільтрі
          setTimeout(function() {
            var brandSel = document.getElementById('fp-brand');
            if (brandSel) { brandSel.value = _bm.brand; if (typeof onFpBrandChange === 'function') onFpBrandChange(); }
            // Модель
            var _modelName = route.model ? (_modelMap[route.model] || null) : null;
            if (_modelName) {
              setTimeout(function() {
                var modelSel = document.getElementById('fp-model');
                if (modelSel) { for (var i = 0; i < modelSel.options.length; i++) { if (modelSel.options[i].value === _modelName) { modelSel.value = modelSel.options[i].value; break; } } }
                setTimeout(function(){ if (typeof runSearch === 'function') runSearch(); }, 200);
              }, 300);
            } else {
              setTimeout(function(){ if (typeof runSearch === 'function') runSearch(); }, 200);
            }
          }, 300);
        }, 200);
      }
    }
    setTimeout(function(){ if(typeof runSearch==='function') runSearch(); }, 150);
  }
  if (page === 'services')       renderServices();
  if (page === 'service-detail' && id) showServiceDetail(id);
  if (page === 'add') {

    if (window._authInitialized && !isLoggedIn) {
      showToast('⚠️ Увійдіть щоб подати оголошення');
      setTimeout(function(){ showPage('profile'); }, 100);
      return;
    }
    setTimeout(initOblastSelect, 50);
    // Автозаповнення телефону та локації з профілю
    setTimeout(function() {
      if (!currentUser || !currentUser.uid) return;
      // Не перезаписувати якщо вже заповнено (режим редагування)
      if (_editListingId) return;
      var phoneEl = document.getElementById('new-phone');
      if (phoneEl && !phoneEl.value && currentUser.phone) phoneEl.value = currentUser.phone;
      var oblastEl = document.getElementById('new-oblast');
      if (oblastEl && !oblastEl.value && currentUser.oblast) {
        oblastEl.value = currentUser.oblast;
        if (typeof onOblastChange === 'function') onOblastChange();
        setTimeout(function() {
          if (currentUser.raion) {
            var raionEl = document.getElementById('new-raion');
            if (raionEl) { raionEl.value = currentUser.raion; if (typeof onRaionChange === 'function') onRaionChange(); }
          }
          setTimeout(function() {
            var cityEl = document.getElementById('new-city');
            if (cityEl && !cityEl.value && currentUser.city) {
              cityEl.value = currentUser.city;
              if (typeof onCityChange === 'function') onCityChange();
            }
          }, 100);
        }, 150);
      }
    }, 400);
  }
  if (page === 'seller' && id) renderSellerPage(id);
  if (page === 'detail' && id) showDetail(id, true);
  if (page === 'news-detail' && id) {

    if (typeof showNewsDetail === 'function') {
      showNewsDetail(id);
    } else {

      setTimeout(function(){ if (typeof showNewsDetail === 'function') showNewsDetail(id); }, 500);
    }
  }

  if (page === 'feedback') {
    // Auto-fill name/email if logged in
    if (window.currentUser && currentUser.name) {
      var fnEl = document.getElementById('feedback-name');
      if (fnEl && !fnEl.value) fnEl.value = currentUser.name;
    }
    if (window.currentUser && currentUser.email) {
      var feEl = document.getElementById('feedback-email');
      if (feEl && !feEl.value) feEl.value = currentUser.email;
    }
    if (typeof loadMyFeedback === 'function') loadMyFeedback();
  }

  document.title = _pageTitle(page, id, route); try { var _seoP=route&&route.page||page; var _seoCfg={home:{t:'Головна',d:'Купуй та продавай електросамокати, велосипеди, скутери в Україні.'},catalog:{t:'Каталог оголошень',d:'Всі оголошення електротранспорту в Україні.'},services:{t:'Сервісні центри',d:'Ремонт та обслуговування електротранспорту по всій Україні.'},news:{t:'Новини та огляди',d:'Останні новини, огляди та поради про електротранспорт.'},add:{t:'Подати оголошення',d:'Продайте свій електротранспорт на RideGO.'},faq:{t:'FAQ — Часті запитання',d:'Відповіді на найпоширеніші питання про RideGO.'},terms:{t:'Правила користування',d:'Правила використання маркетплейсу RideGO.'},privacy:{t:'Політика конфіденційності',d:'Як RideGO зберігає та використовує ваші дані.'},feedback:{t:'Зворотний зв\'язок',d:'Залиште скаргу або пропозицію команді RideGO.'}}; var _seoT=_seoCfg[_seoP]?_seoCfg[_seoP].t:null; var _seoD=_seoCfg[_seoP]?_seoCfg[_seoP].d:null; var _seoI=null; var _seoU='https://www.ridego.com.ua'+(location.pathname==='/'?'/':location.pathname); if (_seoP==='catalog' && route) { if (route.cat) { try { var _L=(typeof _allListings==='function')?_allListings():[]; var _nC=_L.filter(function(x){return x&&x.cat===route.cat;}).length; var _wC=(typeof window.plUk==='function'&&_nC>0)?(' — '+_nC+' '+window.plUk(_nC,['оголошення','оголошення','оголошень'])):''; _seoT=route.cat+_wC+' в Україні'; _seoD='Купити '+route.cat.toLowerCase()+' в Україні. '+(_nC>0?_nC+' актуальних оголошень':'Актуальні оголошення')+' від перевірених продавців на RideGO.'; } catch(e){} } else if (route.brand) { _seoT=(route.brand.charAt(0).toUpperCase()+route.brand.slice(1))+(route.model?' '+route.model.toUpperCase().replace(/-/g,' '):'')+' — купити в Україні'; _seoD='Купити '+route.brand+(route.model?' '+route.model:'')+' в Україні на маркетплейсі RideGO.'; } } else if (_seoP==='detail' && id) { try { var _l=(typeof _allListings==='function'?_allListings():[]).find(function(x){return x&&x.id===id;}); if (_l) { _seoT=(_l.title||'Оголошення')+(_l.price?' — '+_l.price+' грн':''); _seoD=(_l.title||'')+'. '+(_l.cat||'')+(_l.brand?', '+_l.brand:'')+(_l.city?', '+_l.city:'')+'. Купити на маркетплейсі RideGO.'; _seoI=(_l.photos&&_l.photos[0])||_l.img||null; } } catch(e){} } else if (_seoP==='seller' && id) { try { var _sid=String(id).replace(/^uid:/,''); var _s=(window._fbSellers||[]).find(function(x){return x&&(x.id===_sid||x.uid===_sid);}); if (_s) { _seoT=(_s.name||'Продавець')+' — продавець на RideGO'; _seoD='Оголошення продавця '+(_s.name||'')+' на маркетплейсі електротранспорту RideGO.'; _seoI=_s.photoUrl||null; } } catch(e){} } if (typeof _updateSEO==='function' && _seoT) { _updateSEO({title:_seoT,desc:_seoD,img:_seoI,url:_seoU}); if(_seoP==='catalog'&&route&&route.cat){[1500,4000].forEach(function(_d){setTimeout(function(){try{var _LL=_allListings();var _nn=_LL.filter(function(x){return x&&x.cat===route.cat;}).length;if(_nn>0){var _ww=' — '+_nn+' '+window.plUk(_nn,['оголошення','оголошення','оголошень']);_updateSEO({title:route.cat+_ww+' в Україні',desc:'Купити '+route.cat.toLowerCase()+' в Україні. '+_nn+' актуальних оголошень від перевірених продавців на RideGO.',img:(function(){try{var _f=_LL.find(function(x){return x&&x.cat===route.cat&&((x.images&&x.images[0])||x.imageUrl||x.image);});if(_f){var _u=(_f.images&&_f.images[0])||_f.imageUrl||_f.image;return _u||null;}}catch(e){}return null;})(),url:_seoU});}}catch(e){}},_d);});} if(_seoP==='detail'&&id){[1500,4000].forEach(function(_d){setTimeout(function(){try{var _ll=(_allListings()||[]).find(function(x){return x&&x.id===id;});if(_ll){_updateSEO({title:(_ll.title||'Оголошення')+(_ll.price?' — '+_ll.price+' грн':''),desc:(_ll.title||'')+'. '+(_ll.cat||'')+(_ll.brand?', '+_ll.brand:'')+(_ll.city?', '+_ll.city:'')+'. Купити на маркетплейсі RideGO.',img:(_ll.photos&&_ll.photos[0])||_ll.img||null,url:_seoU});}}catch(e){}},_d);});} if(_seoP==='catalog'&&route&&route.cat){[1500,4000].forEach(function(_d){setTimeout(function(){try{var _LL=_allListings();var _nn=_LL.filter(function(x){return x&&x.cat===route.cat;}).length;if(_nn>0){var _ww=' — '+_nn+' '+window.plUk(_nn,['оголошення','оголошення','оголошень']);_updateSEO({title:route.cat+_ww+' в Україні',desc:'Купити '+route.cat.toLowerCase()+' в Україні. '+_nn+' актуальних оголошень від перевірених продавців на RideGO.',img:(function(){try{var _f=_LL.find(function(x){return x&&x.cat===route.cat&&((x.images&&x.images[0])||x.imageUrl||x.image);});if(_f){var _u=(_f.images&&_f.images[0])||_f.imageUrl||_f.image;return _u||null;}}catch(e){}return null;})(),url:_seoU});}}catch(e){}},_d);});} if(_seoP==='detail'&&id){[1500,4000].forEach(function(_d){setTimeout(function(){try{var _ll=(_allListings()||[]).find(function(x){return x&&x.id===id;});if(_ll){_updateSEO({title:(_ll.title||'Оголошення')+(_ll.price?' — '+_ll.price+' грн':''),desc:(_ll.title||'')+'. '+(_ll.cat||'')+(_ll.brand?', '+_ll.brand:'')+(_ll.city?', '+_ll.city:'')+'. Купити на маркетплейсі RideGO.',img:(_ll.photos&&_ll.photos[0])||_ll.img||null,url:_seoU});}}catch(e){}},_d);});} } } catch(e){}
  // Dynamic canonical
  var _canon = document.getElementById('dynamic-canonical');
  if (_canon) _canon.href = 'https://www.ridego.com.ua' + (location.pathname === '/' ? '/' : location.pathname);
  var _ogUrl = document.querySelector('meta[property="og:url"]');
  if (_ogUrl) _ogUrl.content = 'https://www.ridego.com.ua' + (location.pathname === '/' ? '/' : location.pathname);
  _routerLock = false;
}

function _pageTitle(page, id, route) {
  const base = 'RideGO';
  if (page === 'home')     return base + ' — Маркетплейс електротранспорту';
  if (page === 'catalog' && route && route.brand) {
    var _brandTitles = { 'kukirin': 'KuKirin — купити електросамокат в Україні', 'kugoo': 'Kugoo — купити електросамокат', 'ninebot': 'Ninebot — купити електросамокат', 'xiaomi': 'Xiaomi — купити електросамокат' };
    if (route.model) return base + ' — ' + (_brandTitles[route.brand]?.split(' —')[0] || route.brand) + ' ' + route.model.toUpperCase().replace(/-/g, ' ') + ' — купити в Україні';
    return base + ' — ' + (_brandTitles[route.brand] || route.brand);
  }
  if (page === 'catalog')  return base + ' — Каталог';
  if (page === 'add')      return base + ' — Подати оголошення';
  if (page === 'services') return base + ' — Сервіси';
  if (page === 'messages') return base + ' — Повідомлення';
  if (page === 'profile')  return base + ' — Профіль';
  if (page === 'faq')      return base + ' — FAQ';
  if (page === 'terms')    return base + ' — Правила';
  if (page === 'privacy')  return base + ' — Конфіденційність';
  if (page === 'feedback') return base + ' — Зворотний зв\'язок';
  if (page === 'seller') {
    const s = _fbSellers.find(x => x.id === id);
    return s ? base + ' — ' + s.name : base + ' — Продавець';
  }
  if (page === 'detail') {
    const l = _allListings().find(x => x && x.id === id);
    return l ? base + ' — ' + l.title : base + ' — Оголошення';
  }
  if (page === '404')      return base + ' — Сторінку не знайдено';
  if (page === 'news') return base + ' — Новини та огляди електротранспорту';
  return base;
}

window.addEventListener('popstate', function(e) {
  if (_routerLock) return;
  var route = _parsePath();
  _renderRoute(route, true); // true = це "назад", не скролити вгору
  // Відновити збережену позицію скролу
  var savedY = 0;
  if (e.state && e.state.scrollY !== undefined) {
    savedY = e.state.scrollY;
  } else if (_savedScrollPositions[location.pathname] !== undefined) {
    savedY = _savedScrollPositions[location.pathname];
  }
  if (savedY > 0) {
    setTimeout(function() { window.scrollTo({ top: savedY, behavior: 'instant' }); }, 50);
  }
});

function showPage(page, sellerId) {
  // Cleanup: відписуємось від messages listener коли покидаємо чат
  if (page !== 'messages' && typeof _chatUnsubscribe === 'function') {
    _chatUnsubscribe();
    _chatUnsubscribe = null;
  }

  // GA: відправляємо page_view при SPA навігації
  if (typeof gtag === 'function') {
    var _gaPath = page === 'home' ? '/' : '/' + page + (sellerId ? '/' + sellerId : '');
    gtag('event', 'page_view', { page_path: _gaPath, page_title: 'RideGO — ' + (page || 'Головна') });
  }
  var pageSEO = {
    home:    { title: 'Головна', desc: 'Купуй та продавай електросамокати, велосипеди, скутери в Україні.' },
    catalog: { title: 'Каталог оголошень', desc: 'Всі оголошення електротранспорту в Україні. Електросамокати, велосипеди, скутери.' },
    services:{ title: 'Сервісні центри', desc: 'Ремонт та обслуговування електротранспорту по всій Україні.' },
    news:    { title: 'Новини та огляди', desc: 'Останні новини, огляди та поради про електротранспорт.' },
    add:     { title: 'Подати оголошення', desc: 'Продайте свій електротранспорт на RideGO.' },
    faq:     { title: 'FAQ — Часті запитання', desc: 'Відповіді на найпоширеніші питання про RideGO.' },
    terms:   { title: 'Правила користування', desc: 'Правила використання маркетплейсу RideGO.' },
    privacy: { title: 'Політика конфіденційності', desc: 'Як RideGO зберігає та використовує ваші дані.' },
    feedback:{ title: 'Зворотний зв\'язок', desc: 'Залиште скаргу, пропозицію або питання команді RideGO.' },
  };
  if (pageSEO[page]) {
    var _pageUrl = 'https://www.ridego.com.ua' + (page === 'home' ? '/' : '/' + page);
    var _seoT=pageSEO[page].title,_seoD=pageSEO[page].desc,_seoI=null;if(page==='catalog'&&route){if(route.cat){var _slug=Object.keys(CAT_SLUGS||{}).find(function(k){return CAT_SLUGS[k]===route.cat;});if(_slug)_pageUrl='https://www.ridego.com.ua/category/'+_slug;try{var _L=(typeof _allListings==='function')?_allListings():[];var _nC=_L.filter(function(x){return x&&x.cat===route.cat;}).length;var _wC=(typeof window.plUk==='function'&&_nC>0)?(' — '+_nC+' '+window.plUk(_nC,['оголошення','оголошення','оголошень'])):'';_seoT=route.cat+_wC+' в Україні';_seoD='Купити '+route.cat.toLowerCase()+' в Україні. '+(_nC>0?_nC+' актуальних оголошень':'Актуальні оголошення')+' від перевірених продавців на RideGO.';}catch(e){}}else if(route.brand){_seoT=(route.brand.charAt(0).toUpperCase()+route.brand.slice(1))+(route.model?' '+route.model.toUpperCase().replace(/-/g,' '):'')+' — купити в Україні';_seoD='Купити '+route.brand+(route.model?' '+route.model:'')+' в Україні на маркетплейсі RideGO.';}}_updateSEO({title:_seoT,desc:_seoD,img:_seoI,url:_pageUrl});
    _setListingSchema(null);
    _setNewsSchema(null); } else if (page === 'detail' && id) { try { var _l = (typeof _allListings==='function'?_allListings():[]).find(function(x){return x && x.id === id;}); if (_l) { var _ttl = (_l.title||'Оголошення') + (_l.price ? ' — ' + _l.price + ' грн' : '') + ' | RideGO'; var _dsc = (_l.title||'') + '. ' + (_l.cat||'') + (_l.brand?', '+_l.brand:'') + (_l.city?', '+_l.city:'') + '. Купити на маркетплейсі RideGO.'; var _img = (_l.photos && _l.photos[0]) || _l.img || 'https://ridego.com.ua/og-image.png'; _updateSEO({ title: _ttl, desc: _dsc, img: _img, url: 'https://www.ridego.com.ua/listing/' + id }); } } catch(e){} } else if (page === 'seller' && id) { try { var _sid = String(id).replace(/^uid:/,''); var _s = (window._fbSellers||[]).find(function(x){return x && (x.id === _sid || x.uid === _sid);}); if (_s) { _updateSEO({ title: (_s.name||'Продавець') + ' — продавець на RideGO', desc: 'Оголошення продавця ' + (_s.name||'') + ' на маркетплейсі електротранспорту RideGO.', img: _s.photoUrl || 'https://ridego.com.ua/og-image.png', url: 'https://www.ridego.com.ua/seller/' + _sid }); } } catch(e){}
  }
  if (page === 'seller' && sellerId) {
    _setHash('seller/' + sellerId);
  } else if (page === 'detail') {

  } else {
    _setHash(page === 'home' ? '' : page);
  }
  _renderRoute({ page, id: sellerId || null });
}


function showSellerByUid(uid) {
  if (!uid) { showToast('ℹ️ Профіль продавця не знайдено'); return; }
  _setPath('/seller/' + uid);
  _renderRoute({ page: 'seller', id: 'uid:' + uid });
}

function _initRouter() {
  var route = _parsePath();
  _renderRoute(route);
}

function _skeletonCards(count) {
  count = count || 4;
  var card = '<div class="skel-card">'
    + '<div class="skeleton skel-img"></div>'
    + '<div class="skel-body">'
    + '<div class="skeleton skel-line short"></div>'
    + '<div class="skeleton skel-line full"></div>'
    + '<div class="skeleton skel-line price"></div>'
    + '<div class="skeleton skel-line short"></div>'
    + '</div></div>';
  return Array(count).fill(card).join('');
}

function showSkeletons() {
  // Скелетони вже вбудовані в HTML — ця функція потрібна тільки для SPA-переходів
  var homeEl   = document.getElementById('home-listings');
  var catalogEl = document.getElementById('catalog-listings');
  var svcEl    = document.getElementById('home-services-grid');
  if (homeEl    && !homeEl.querySelector('.listing-card'))  homeEl.innerHTML    = _skeletonCards(6);
  if (catalogEl && !catalogEl.querySelector('.listing-card')) catalogEl.innerHTML = _skeletonCards(4);
  if (svcEl     && !svcEl.querySelector('.home-svc-card'))  svcEl.innerHTML     = _skeletonCards(3);
}


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
    ? `<div class="listing-img-wrap"><img class="listing-img lazy-img" src="${_cdnTiny(l.img)||thumbSrc}" data-src="${thumbSrc}" alt="${eTitle}" width="400" height="260" loading="lazy" decoding="async" onerror="this.style.display='none'" style="filter:blur(8px);transition:filter .4s ease"></div>`
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
    <span style="width:18px;height:18px;border-radius:50%;background:var(--brand-dim);display:inline-flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:var(--brand);overflow:hidden;flex-shrink:0">${l.sellerPhoto ? '<img alt="Аватар" src="'+_esc(l.sellerPhoto)+'" style="width:100%;height:100%;object-fit:cover">' : (eSellerName[0]||'?')}</span>${eSellerName}
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
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <span class="loc"><i class="fa-solid fa-location-dot"></i>${eCity}</span>
            <span style="font-size:11px;color:var(--text-muted);display:flex;align-items:center;gap:3px"><i class="fa-regular fa-clock" style="font-size:10px"></i>${_esc(_timeAgo(l.createdAt) || l.time || '')}</span>
            ${l.views ? `<span style="font-size:11px;color:var(--text-muted);display:flex;align-items:center;gap:3px"><i class="fa-solid fa-eye" style="font-size:10px"></i>${l.views}</span>` : ''}
          </div>
        </div>
        <div style="display:flex;gap:4px;align-items:center">
          <button class="fav-btn compare-btn-card"
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


const SERVICES = [];
let myServices=[],currentServiceFilter="",currentServiceId=null,_svcRowId=0;

let _fbListings = [];
let _fbSellers  = [];
let _fbServices = [];
let _fbChats    = [];
let _fbLoaded   = false;

function _applyUserServices(loaded) {
  myServices = myServices.filter(function(s){ return !s._isOwn; });
  myServices = loaded.concat(myServices);
  var myIds = loaded.map(function(s){ return s.id; });
  _fbServices = _fbServices.filter(function(s){ return myIds.indexOf(s.id) < 0; });
  renderMyServiceTab();
  renderHomeServices();
  if (typeof renderServices === 'function') renderServices();
}

function _loadUserServices(uid) {
  if (!window._db || !uid) return;

  // Кеш в sessionStorage на 15 хвилин
  var _svcKey   = '_userSvc_' + uid;
  var _svcKeyAt = '_userSvc_at_' + uid;
  try {
    var _svcAt = parseInt(sessionStorage.getItem(_svcKeyAt) || '0');
    if (Date.now() - _svcAt < 15 * 60 * 1000) {
      var _svcCached = JSON.parse(sessionStorage.getItem(_svcKey) || 'null');
      if (_svcCached) { _applyUserServices(_svcCached); return; }
    }
  } catch(e) {}

  window._db.collection('services').where('uid','==',uid).get()
    .then(function(snap) {
      var loaded = snap.docs.map(function(d){
        return Object.assign({id:d.id, _isOwn:true}, d.data());
      });
      try {
        sessionStorage.setItem(_svcKey, JSON.stringify(loaded));
        sessionStorage.setItem(_svcKeyAt, String(Date.now()));
      } catch(e) {}
      _applyUserServices(loaded);
    }).catch(function(e){ void('services load:', e.message); });
}

var _fbDataLoadedAt = 0;
var _FB_CACHE_TTL   = 30 * 60 * 1000; // 30 хв замість 10 хв

function _shouldRefresh() {
  return Date.now() - _fbDataLoadedAt > _FB_CACHE_TTL;
}
var _lastListingDoc = null;
var _allListingsLoaded = false;
var _loadingMore = false;

function loadMoreListings(callback) {
  if (_allListingsLoaded || !window._db) {
    if (callback) callback(false);
    return;
  }
  // Якщо вже завантажується — чекаємо і повторюємо
  if (_loadingMore) {
    setTimeout(function() { loadMoreListings(callback); }, 600);
    return;
  }
  _loadingMore = true;

  var query = window._db.collection('listings')
    .where('status','==','active');

  // Якщо є cursor — продовжуємо з нього
  if (_lastListingDoc) {
    query = query.orderBy('createdAt','desc').startAfter(_lastListingDoc);
  }

  query.limit(50).get()
    .then(function(snap) {
      _loadingMore = false;
      if (!snap.docs.length) {
        _allListingsLoaded = true;
        if (callback) callback(false);
        return;
      }
      _lastListingDoc = snap.docs[snap.docs.length - 1];
      if (snap.docs.length < 50) _allListingsLoaded = true;

      var existingIds = {};
      _fbListings.forEach(function(l){ if (l.id) existingIds[l.id] = true; });

      snap.docs.forEach(function(d) {
        if (!existingIds[d.id]) {
          _fbListings.push(Object.assign({id: d.id}, d.data()));
        }
      });
      _idbSet('listings', _fbListings);
      if (callback) callback(true);
    }).catch(function(e) {
      _loadingMore = false;
      void('loadMore:', e.message);
      // Fallback без orderBy
      if (e.message && e.message.includes('index')) {
        window._db.collection('listings')
          .where('status','==','active')
          .limit(50).get()
          .then(function(snap) {
            _allListingsLoaded = true; // без cursor не можемо пагінувати
            var existingIds = {};
            _fbListings.forEach(function(l){ if (l.id) existingIds[l.id] = true; });
            snap.docs.forEach(function(d) {
              if (!existingIds[d.id]) {
                _fbListings.push(Object.assign({id: d.id}, d.data()));
              }
            });
            _idbSet('listings', _fbListings);
            if (callback) callback(true);
          }).catch(function() { if (callback) callback(false); });
      } else {
        if (callback) callback(false);
      }
    });
}

function loadFirebaseData(force) {
  if (!window._db) {
    if (typeof window._onFirebaseReady === 'function') {
      window._onFirebaseReady(function() { loadFirebaseData(force); });
    } else {
      setTimeout(function() { loadFirebaseData(force); }, 1000);
    }
    return;
  }
  var now = Date.now();

  if (!force && _fbListings.length && (now - _fbDataLoadedAt) < _FB_CACHE_TTL) {
    renderHomeListings();
    renderCatalog();
    return;
  }

  if (!force) {
    _idbGet('listings', 30 * 60 * 1000, function(cached) {
      if (cached && cached.length) {
        _fbListings = cached.filter(function(l){ return l && l.status !== 'deleted'; });
        _fbDataLoadedAt = Date.now();
        _idbGet('services', 30 * 60 * 1000, function(svcs) {
          if (svcs) _fbServices = svcs;
          renderHomeListings();
          renderCatalog();
          if (_fbServices.length) {
            renderHomeServices();
            if (typeof renderServices === 'function') renderServices();
          }
        });
        // Фоновий refresh тільки якщо кеш протух
        setTimeout(function() {
          if (_shouldRefresh()) {
            loadFirebaseData(true);
          }
        }, 5000);
        return;
      }
      _loadFirebaseFromNetwork(force);
    });
    return;
  }
  _loadFirebaseFromNetwork(force);
}

function _loadFirebaseFromNetwork(force) {
  var now = Date.now();

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    showToast('⚠️ Немає з\'єднання з інтернетом');
    return;
  }

  // Завантажуємо 50 для першого рендеру (було 12 — мало, оголошення зникали)
  window._db.collection('listings')
    .where('status','==','active')
    .orderBy('createdAt','desc').limit(50).get()
    .then(function(snap) {
      _applyListingsSnap(snap);
    }).catch(function(e){
      void('listings (indexed):', e.message);
      // Fallback — без orderBy (якщо composite index ще не створений)
      window._db.collection('listings')
        .where('status','==','active')
        .limit(50).get()
        .then(function(snap) {
          void('listings (fallback): got', snap.docs.length);
          _applyListingsSnap(snap);
        }).catch(function(e2) {
          void('listings (fallback2):', e2.message);
          // Останній fallback — без фільтрів взагалі
          window._db.collection('listings').limit(50).get()
            .then(function(snap) {
              // Фільтруємо видалені на клієнті
              var filtered = { docs: snap.docs.filter(function(d) {
                var data = d.data();
                return data.status === 'active' || !data.status;
              })};
              _applyListingsSnap(filtered);
            }).catch(function(e3) {
              void('listings FAIL:', e3.message);
              if (!navigator.onLine) showToast('⚠️ Немає з\'єднання з інтернетом');
            });
        });
    });

  // Services — спочатку IDB кеш, потім Firestore
  _idbGet('services', 30 * 60 * 1000, function(cachedSvcs) {
    if (cachedSvcs && cachedSvcs.length) {
      var myIds = myServices.map(function(s){ return s.id; });
      _fbServices = cachedSvcs.filter(function(s){ return myIds.indexOf(s.id) < 0; });
      renderHomeServices();
      if (typeof renderServices === 'function') renderServices();
      var _svcPath = window.location.pathname.match(/^\/service\/(.+)$/);
      if (_svcPath) showServiceDetail(_svcPath[1]);
      return;
    }
    window._db.collection('services').orderBy('rating','desc').limit(30).get()
      .then(function(snap) {
        var allSvcs = snap.docs.map(function(d){ return Object.assign({id:d.id}, d.data()); });
        var myIds = myServices.map(function(s){ return s.id; });
        _fbServices = allSvcs.filter(function(s){ return myIds.indexOf(s.id) < 0; });
        _idbSet('services', _fbServices);
        renderHomeServices();
        if (typeof renderServices === 'function') renderServices();
        var _svcPath = window.location.pathname.match(/^\/service\/(.+)$/);
        if (_svcPath) showServiceDetail(_svcPath[1]);
      }).catch(function(e){ void('services:', e.message); });
  });
}

function _applyListingsSnap(snap) {
  var newDocs = snap.docs.map(function(d){ return Object.assign({id:d.id}, d.data()); });
  _fbDataLoadedAt = Date.now();
  _lastListingDoc = snap.docs.length ? snap.docs[snap.docs.length - 1] : null;
  _allListingsLoaded = snap.docs.length < 50;

  // MERGE замість заміни — зберігаємо існуючі лістинги з кешу
  if (_fbListings.length > newDocs.length) {
    // Оновлюємо існуючі і додаємо нові, але НЕ видаляємо ті що вже є
    var existingById = {};
    _fbListings.forEach(function(l){ if (l && l.id) existingById[l.id] = l; });
    // Оновлюємо дані з нового запиту
    newDocs.forEach(function(l){ if (l && l.id) existingById[l.id] = l; });
    _fbListings = Object.values(existingById).filter(function(l){
      return l && l.status !== 'deleted' && l.status !== 'inactive';
    });
  } else {
    _fbListings = newDocs;
  }

  _idbSet('listings', _fbListings);

  var fbIds = {};
  _fbListings.forEach(function(l){ if (l.id) fbIds[l.id] = true; });
  myListings = myListings.filter(function(l){ return l && l.id && !fbIds[l.id]; });

  renderHomeListings();
  renderCatalog();
  if (typeof _updateActiveCount === 'function') _updateActiveCount();

  // Автоматичне довантаження якщо є ще лістинги
  if (!_allListingsLoaded) {
    setTimeout(function() {
      loadMoreListings(function(hasMore) {
        if (hasMore) {
          renderHomeListings();
          renderCatalog();
          // Продовжуємо довантажувати поки є
          if (!_allListingsLoaded) {
            setTimeout(function() {
              loadMoreListings(function(more) {
                if (more) { renderHomeListings(); renderCatalog(); }
              });
            }, 1000);
          }
        }
      });
    }, 500);
  }

  setTimeout(function() {
    if (typeof _trackFavPrices === 'function') _trackFavPrices();
  }, 1500);

  var _lstPath = window.location.pathname.match(/^\/listing\/(.+)$/);
  if (_lstPath) showDetail(_lstPath[1], true);

  var _catPath = window.location.pathname.match(/^\/category\/(.+)$/);
  if (_catPath && CAT_SLUGS[_catPath[1]]) {
    var _catName = CAT_SLUGS[_catPath[1]];
    setTimeout(function() { filterCatalog(_catName); }, 200);
  }
}

function _updateChatBadge() {
  var unread = _fbChats.reduce(function(s, c){ return s + (c.unread || 0); }, 0);
  ['header-msg-badge', 'mobile-msg-badge'].forEach(function(id) {
    var badge = document.getElementById(id);
    if (!badge) return;
    if (unread > 0) {
      badge.textContent = unread > 99 ? '99+' : unread;
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }
  });
  if (unread > 0) {
    if (!document.title.match(/^\(\d/)) document.title = "(" + unread + ") " + document.title;
  } else {
    document.title = document.title.replace(/^\(\d+\)\s*/, '');
  }
}

function _requestNotifPermission() {
  if (typeof Notification === 'undefined') return;
  if (Notification.permission === 'default') {
    Notification.requestPermission().catch(function(){});
  }
}

function _showMsgPush(senderName, text, chatId) {

  if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.hidden) {
    try {
      var n = new Notification('💬 ' + senderName + ' — RideGO', {
        body: text, icon: '/favicon.ico',
        tag: 'ridego-msg-' + chatId, renotify: true
      });
      n.onclick = function() {
        window.focus();
        if (typeof showPage === 'function') showPage('messages');
        if (typeof openChatById === 'function') setTimeout(function(){ openChatById(chatId); }, 200);
        n.close();
      };
    } catch(e) {}
  }

  if (_activeChatId === chatId) return;
  var toast = document.getElementById('msg-push-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'msg-push-toast';
    toast.style.cssText = 'position:fixed;bottom:80px;right:20px;z-index:9999;background:var(--card-bg);'
      + 'border:1px solid var(--brand);border-radius:16px;padding:14px 18px;max-width:300px;'
      + 'box-shadow:0 8px 32px rgba(0,200,83,.25);display:flex;align-items:center;gap:12px;'
      + 'cursor:pointer;transition:opacity .3s;';
    var _pushStyle = document.createElement('style');
    _pushStyle.textContent = '@keyframes _slideInR{from{transform:translateX(110%);opacity:0}to{transform:translateX(0);opacity:1}}';
    document.head.appendChild(_pushStyle);
    toast.style.animation = '_slideInR .3s ease';
    document.body.appendChild(toast);
  }
  toast.onclick = function() {
    if (typeof showPage === 'function') showPage('messages');
    if (typeof openChatById === 'function') setTimeout(function(){ openChatById(chatId); }, 200);
    toast.style.opacity = '0';
    setTimeout(function(){ if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
  };
  var initial = (senderName[0] || '?').toUpperCase();
  var safeName = typeof _esc === 'function' ? _esc(senderName) : senderName;
  var safeText = typeof _esc === 'function' ? _esc(text) : text;
  toast.innerHTML = '<div style="width:40px;height:40px;border-radius:50%;background:var(--brand-dim);'
    + 'border:2px solid var(--brand);display:flex;align-items:center;justify-content:center;'
    + 'font-weight:800;color:var(--brand);font-size:15px;flex-shrink:0">' + initial + '</div>'
    + '<div style="min-width:0;flex:1"><div style="font-weight:700;font-size:14px">' + safeName + '</div>'
    + '<div style="font-size:13px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + safeText + '</div></div>'
    + '<span onclick="event.stopPropagation();var t=document.getElementById(\'msg-push-toast\');if(t)t.style.opacity=\'0\';" '
    + 'style="color:var(--text-muted);cursor:pointer;font-size:20px;line-height:1;flex-shrink:0;padding:4px">&times;</span>';
  toast.style.opacity = '1';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(function() {
    toast.style.opacity = '0';
    setTimeout(function(){ if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
  }, 5000);
}

function loadUserChats() {
  if (!window._db || !currentUser || !currentUser.uid) return;
  window._db.collection('chats')
    .where('participants','array-contains', currentUser.uid)
    .get()
    .then(function(snap) {
      _fbChats = snap.docs.map(function(d){
        var data = Object.assign({id:d.id}, d.data());

        var otherId = data.participants ? data.participants.find(function(p){ return p !== currentUser.uid; }) : null;
        if (otherId) data.otherName = data[otherId + '_name'] || data.otherName || '';
        return data;
      });

      _fbChats.sort(function(a,b){
        var ta=a.lastMessageAt&&a.lastMessageAt.seconds?a.lastMessageAt.seconds:0;
        var tb=b.lastMessageAt&&b.lastMessageAt.seconds?b.lastMessageAt.seconds:0;
        return tb-ta;
      });
      renderChats();
      if (typeof _updateChatBadge === "function") _updateChatBadge();
    }).catch(function(e){ void('chats:', e.message); });
}

function renderHomeListings() {
  var all = _allListings().filter(function(l){ return l && l.status !== 'deleted' && l.status !== 'inactive' && l.status !== 'sold'; });
  _cleanExpiredPromos(all);

  if (typeof _setHomeBreadcrumbSchema === 'function') _setHomeBreadcrumbSchema();

  var cats = {
    'Електросамокати': 'cnt-scooters',
    'Велосипеди': 'cnt-bikes',
    'Електровелосипеди': 'cnt-ebikes',
    'Електроскутери': 'cnt-escooters',
    'Електромотоцикли': 'cnt-emoto'
  };
  Object.keys(cats).forEach(function(cat) {
    var el = document.getElementById(cats[cat]);
    var cnt = all.filter(function(l){ return l.cat === cat; }).length;
    if (el) el.textContent = cnt > 0 ? cnt + ' ' + window.plUk(cnt, ['пропозиція','пропозиції','пропозицій']) : 'Скоро буде';
  });

  // RIDEGO: counts for catalog page category buttons (.transport-btn)
  document.querySelectorAll('.transport-btn').forEach(function(btn) {
    var c = btn.getAttribute('data-cat');
    var sp = btn.querySelector('.tb-count');
    if (!sp) return;
    var n = all.filter(function(l){ return l.cat === c; }).length;
    var txt = n === 0 ? 'Скоро буде' : (n + ' ' + window.plUk(n, ['оголошення','оголошення','оголошень']));
    sp.textContent = txt;
  });

  var topEl = document.getElementById('home-top-listings');
  var topEmpty = document.getElementById('home-top-empty');
  var topList = all.filter(function(l){ return _isPromoActive(l) && l.promo === 'top'; });

  topList.sort(function(a, b) {
    var ta = a.createdAt && a.createdAt.seconds ? a.createdAt.seconds : 0;
    var tb = b.createdAt && b.createdAt.seconds ? b.createdAt.seconds : 0;
    return tb - ta;
  });
  var topShow = topList.slice(0, 4);
  if (topEl) {
    if (topShow.length) {
      topEl.innerHTML = topShow.map(function(l){ return createCard(l,'home'); }).join('');
      if (topEmpty) topEmpty.style.display = 'none';
    } else {
      topEl.innerHTML = '';
      if (topEmpty) topEmpty.style.display = '';
    }
  }

  var urgentEl = document.getElementById('home-urgent-listings');
  var urgentEmpty = document.getElementById('home-urgent-empty');
  var urgentList = all.filter(function(l){ return _isPromoActive(l) && l.promo === 'urgent'; });
  var highlightList = all.filter(function(l){ return _isPromoActive(l) && l.promo === 'highlight'; });
  var hotList = urgentList.concat(highlightList).slice(0, 4);
  if (urgentEl) {
    if (hotList.length) {
      urgentEl.innerHTML = hotList.map(function(l){ return createCard(l,'home'); }).join('');
      if (urgentEmpty) urgentEmpty.style.display = 'none';
    } else {
      urgentEl.innerHTML = '';
      if (urgentEmpty) urgentEmpty.style.display = '';
    }
  }

  var newEl = document.getElementById('home-listings');
  var regular = all.filter(function(l){ return !_isPromoActive(l); });
  regular.sort(function(a, b) {
    var ta = a.createdAt && a.createdAt.seconds ? a.createdAt.seconds : 0;
    var tb = b.createdAt && b.createdAt.seconds ? b.createdAt.seconds : 0;
    return tb - ta;
  });
  if (newEl) {
    if (regular.length) {
      newEl.innerHTML = regular.slice(0, 6).map(function(l){ return createCard(l,'home'); }).join('');
    } else {
      newEl.innerHTML = `
        <div style="text-align:center;padding:48px 24px;grid-column:1/-1">
          <div style="font-size:64px;margin-bottom:16px">🛴</div>
          <div style="font-size:20px;font-weight:700;margin-bottom:8px;color:var(--text-main)">Оголошень поки немає</div>
          <p style="color:var(--text-muted);margin-bottom:24px">Будь першим! Додай своє оголошення і знайди покупця.</p>
          <button class="btn-primary" onclick="showPage('add')" style="padding:12px 24px">
            <i class="fa-solid fa-plus" style="margin-right:8px"></i>Додати оголошення
          </button>
        </div>`;
    }
  }

  _renderHomeShops();
  renderHomeServices();
}

function _renderHomeShops() {
  var shopsSection = document.getElementById('home-shops-section');
  var shopsScroll = document.getElementById('home-shops-scroll');
  if (!shopsScroll) return;
  var shops = _fbServices.concat(myServices).filter(function(s){ return s && s.badge; });
  if (!shops.length) {
    if (shopsSection) shopsSection.style.display = 'none';
    return;
  }
  if (shopsSection) shopsSection.style.display = '';
  shopsScroll.innerHTML = shops.slice(0, 8).map(function(s) {
    return '<div onclick="showServiceDetail(\'' + s.id + '\')" style="flex-shrink:0;width:160px;background:var(--card-bg);border:1px solid var(--border);border-radius:16px;padding:16px;cursor:pointer;transition:box-shadow .2s;text-align:center" onmouseover="this.style.boxShadow=\'0 4px 20px rgba(0,0,0,.15)\'" onmouseout="this.style.boxShadow=\'\'">'
      + '<div style="font-size:32px;margin-bottom:8px">' + (s.icon || '🔧') + '</div>'
      + '<div style="font-weight:700;font-size:13px;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + window.escHtml(s.name) + '</div>'
      + '<div style="font-size:11px;color:var(--text-muted)">' + window.escHtml(s.city || '') + '</div>'
      + (s.badge ? '<div style="margin-top:6px;font-size:10px;background:var(--brand-dim);color:var(--brand);padding:2px 8px;border-radius:50px;font-weight:700">' + (s.badgeLabel || s.badge) + '</div>' : '')
      + '</div>';
  }).join('');
}

function renderHomeServices() {
  var grid = document.getElementById("home-services-grid");
  if (!grid) return;
  var all = _fbServices.concat(myServices);

  var sorted = all.slice().sort(function(a,b) {
    var wa = a.badge==="official"?0:a.badge==="verified"?1:2;
    var wb = b.badge==="official"?0:b.badge==="verified"?1:2;
    return wa - wb || b.rating - a.rating;
  });
  var top3 = sorted.slice(0,3);
  grid.innerHTML = top3.map(function(s) { return createHomeSvcCard(s); }).join("");
}

function createHomeSvcCard(s) {

  var allCats = _normalizeSvcs(s.services);
  var items = [];
  allCats.forEach(function(cat){ (cat.items||[]).forEach(function(i){ items.push(i); }); });
  var preview = items.slice(0,3).map(function(item) {
    return "<div class=\"home-svc-row\"><span>"+(item.name||"")+"</span><span>"+(item.price||"")+"</span></div>";
  }).join("");
  var cats = (s.cats||[]).slice(0,3).map(function(cat) {
    return "<span class=\"home-svc-cat\">"+cat+"</span>";
  }).join("");
  var badge = s.badge
    ? "<span class=\"home-svc-badge "+s.badge+"\">"+s.badgeLabel+"</span>"
    : "";
  var stars = s.rating > 0 ? "\u2605".repeat(Math.round(s.rating)) : "";
  var rating = s.rating > 0
    ? "<div class=\"home-svc-rating\"><span style=\"color:#ffa726\">"+stars+"</span> "+s.rating+"</div>"
    : "";
  return "<div class=\"home-svc-card\" onclick=\"showServiceDetail('"+s.id+"')\">"
    +"<div class=\"home-svc-card-top\">"
    +(s.photoUrl
      ? "<div class=\"home-svc-icon\" style=\"background:none;overflow:hidden;padding:0\"><img alt=\"Фото сервісу\" src=\""+s.photoUrl+"\" style=\"width:100%;height:100%;object-fit:cover;border-radius:inherit\"></div>"
      : "<div class=\"home-svc-icon\">"+s.icon+"</div>"
    )
    +"<div style=\"flex:1;min-width:0\">"
    +"<div style=\"display:flex;align-items:center;gap:6px;flex-wrap:wrap\">"
    +"<div class=\"home-svc-name\">"+window.escHtml(s.name)+"</div>"+badge+"</div>"
    +"<div class=\"home-svc-city\">📍 "+(s.city||"")+(s.address?" \u00b7 "+s.address:"")+"</div>"
    +"</div></div>"
    +"<div class=\"home-svc-cats\">"+cats+"</div>"
    +(preview ? "<div class=\"home-svc-services\">"+preview+"</div>" : "")
    +(rating ? rating : "")
    +"</div>";
}


function toggleTheme() {
  const isLight = document.body.classList.toggle('light');
  const knob = document.getElementById('themeKnob');
  knob.textContent = isLight ? '☀️' : '🌙';
  try { localStorage.setItem('eria-theme', isLight ? 'light' : 'dark'); } catch(e) {}
  showToast(isLight ? '☀️ Денна тема увімкнена' : '🌙 Нічна тема увімкнена');
}

try {
  var savedTheme = localStorage.getItem('eria-theme');

  document.documentElement.style.setProperty('--transition-override', 'none');
  var _noTransStyle = document.createElement('style');
  _noTransStyle.textContent = '*, *::before, *::after { transition: none !important; }';
  _noTransStyle.id = 'no-trans-init';
  document.head.appendChild(_noTransStyle);

  if (savedTheme === 'light' || savedTheme === null) {
    document.body.classList.add('light');
    var knob = document.getElementById('themeKnob');
    if (knob) knob.textContent = '☀️';
    if (savedTheme === null) localStorage.setItem('eria-theme', 'light');
  }

  document.documentElement.classList.remove('light-preload');

  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      var el = document.getElementById('no-trans-init');
      if (el) el.remove();
    });
  });
} catch(e) {}

// Чекаємо поки всі defer скрипти завантажаться
// loadSavedProfile() та _initRouter() викликаються в кінці features-bundle.js
// (після завантаження всіх залежностей)


// Розумне оновлення при поверненні на вкладку
document.addEventListener('visibilitychange', function() {
  if (document.visibilityState === 'visible' && _shouldRefresh()) {
    loadFirebaseData(true);
  }
});
