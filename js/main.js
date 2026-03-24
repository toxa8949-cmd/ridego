

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

  if (!lastDate) return;

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
  if (!window._db || !currentUser || !currentUser.uid) {
    showToast('⚠️ Увійдіть в акаунт'); return;
  }

  var confirmed = confirm('Купити ' + count + ' слот(ів) за ' + price + ' грн?\n(Тестовий режим — оплата не стягується)');
  if (!confirmed) return;

  window._db.collection('users').doc(currentUser.uid).update({
    slots: firebase.firestore.FieldValue.increment(count)
  }).then(function() {
    _userSlots.slots = (_userSlots.slots || 0) + count;
    _renderSlotsUI();
    closeBuySlots();
    showToast('✅ Куплено ' + count + ' слот(ів)!');
  }).catch(function(e){ showToast('⚠️ Помилка: ' + e.message); });
}

function _renderSlotsUI() {
  var total   = Math.max(0, _totalSlots());
  var welcome = Math.max(0, Math.min(_userSlots.slotsWelcome || 0, total));
  var bought  = Math.max(0, _userSlots.slots || 0);

  var el = document.getElementById('profile-slots-badge');
  if (el) {
    el.textContent = total + ' слот' + (total === 1 ? '' : total < 5 ? 'и' : 'ів');
    el.style.color = total > 0 ? 'var(--brand)' : '#ff5252';
  }

  var panel = document.getElementById('slots-panel');
  if (!panel) return;

  var welcomeExpiry = '';
  if (welcome > 0 && _userSlots.slotsWelcomeExpiry) {
    var exp = new Date(_userSlots.slotsWelcomeExpiry.seconds * 1000);
    welcomeExpiry = ' (згорають ' + exp.toLocaleDateString('uk-UA', {day:'numeric',month:'long'}) + ')';
  }

  panel.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:16px">'
    + '<div>'
    + '<div style="font-size:28px;font-weight:800;color:var(--brand)">' + total + '</div>'
    + '<div style="font-size:13px;color:var(--text-muted)">доступних слотів</div>'
    + '</div>'
    + '<button class="btn-primary" style="padding:10px 20px;font-size:14px" onclick="openBuySlots()">'
    + '<i class="fa-solid fa-plus" style="margin-right:6px"></i>Купити слоти</button>'
    + '</div>'
    + (welcome > 0 ? '<div style="font-size:13px;color:var(--text-muted);margin-bottom:8px">🎁 Стартові: <b>' + welcome + '</b>' + welcomeExpiry + '</div>' : '')
    + (bought > 0  ? '<div style="font-size:13px;color:var(--text-muted);margin-bottom:8px">💳 Куплені: <b>' + bought + '</b> (не згорають)</div>' : '')
    + (total === 0 ? '<div style="font-size:13px;color:#ff5252;margin-bottom:8px">⚠️ Слотів немає — купіть щоб публікувати оголошення</div>' : '');
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

const SELLERS = [];

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

function _isPromoActive(l) {
  if (!l || !l.promo) return false;
  if (!l.promoUntil) return true;
  return new Date(l.promoUntil) > new Date();
}

function _cleanExpiredPromos(listings) {
  var expired = [];
  var now = new Date();
  listings.forEach(function(l) {
    if (!l || !l.promo) return;

    if (!l.promoUntil) return;
    var until = new Date(l.promoUntil);

    if (isNaN(until.getTime())) return;
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
      + '<div style="font-size:14px;font-weight:600">' + r.name + '</div>'
      + (r.sub ? '<div style="font-size:12px;color:var(--text-muted)">' + r.sub + '</div>' : '')
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

function _setPath(path) {
  if (location.pathname !== path) {
    history.pushState(null, '', path);
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

  var listingMatch = p.match(/^\/listing\/(.+)$/);
  if (listingMatch) return { page: 'detail', id: listingMatch[1] };

  var serviceMatch = p.match(/^\/service\/(.+)$/);
  if (serviceMatch) return { page: 'service-detail', id: serviceMatch[1] };

  var sellerMatch = p.match(/^\/seller\/(.+)$/);
  if (sellerMatch) return { page: 'seller', id: 'uid:' + sellerMatch[1] };

  var catMatch = p.match(/^\/category\/(.+)$/);
  if (catMatch && CAT_SLUGS[catMatch[1]]) return { page: 'catalog', cat: CAT_SLUGS[catMatch[1]] };

  var newsMatch = p.match(/^\/news\/(.+)$/);
  if (newsMatch) return { page: 'news-detail', id: newsMatch[1] };
  return { page: 'home' };
}

function _setHash(hash) {
  var pathMap = {
    '': '/', 'home': '/', 'catalog': '/catalog', 'add': '/add',
    'services': '/services', 'messages': '/messages', 'profile': '/profile', 'news': '/news'
  };
  if (pathMap[hash] !== undefined) { _setPath(pathMap[hash]); return; }
  if (hash.startsWith('detail/')) { _setPath('/listing/' + hash.replace('detail/', '')); return; }
  if (hash.startsWith('service/')) { _setPath('/service/' + hash.replace('service/', '')); return; }
  if (hash.startsWith('seller/uid:')) { _setPath('/seller/' + hash.replace('seller/uid:', '')); return; }
  if (hash.startsWith('seller/')) { _setPath('/seller/' + hash.replace('seller/', '')); return; }
  _setPath('/' + hash);
}

function _parseHash(hash) { return _parsePath(); }

function _renderRoute(route) {
  _routerLock = true;
  const { page, id, cat } = route;

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('page-' + page);
  if (el) el.classList.add('active');

  document.querySelectorAll('.mnav-item').forEach(b => b.classList.remove('active'));
  const navMap = { home:0, catalog:1, services:2, profile:3 };
  const navItems = document.querySelectorAll('.mnav-item');
  if (navMap[page] !== undefined && navItems[navMap[page]]) navItems[navMap[page]].classList.add('active');

  window.scrollTo({ top: 0, behavior: 'smooth' });

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

  document.title = _pageTitle(page, id);
  _routerLock = false;
}

function _pageTitle(page, id) {
  const base = 'RideGO';
  if (page === 'home')     return base + ' — Маркетплейс електротранспорту';
  if (page === 'catalog')  return base + ' — Каталог';
  if (page === 'add')      return base + ' — Подати оголошення';
  if (page === 'services') return base + ' — Сервіси';
  if (page === 'messages') return base + ' — Повідомлення';
  if (page === 'profile')  return base + ' — Профіль';
  if (page === 'faq')      return base + ' — FAQ';
  if (page === 'terms')    return base + ' — Правила';
  if (page === 'privacy')  return base + ' — Конфіденційність';
  if (page === 'seller') {
    const s = _fbSellers.find(x => x.id === id);
    return s ? base + ' — ' + s.name : base + ' — Продавець';
  }
  if (page === 'detail') {
    const l = _allListings().find(x => x && x.id === id);
    return l ? base + ' — ' + l.title : base + ' — Оголошення';
  }
  return base;
}

window.addEventListener('popstate', function() {
  if (_routerLock) return;
  _renderRoute(_parsePath());
});

function showPage(page, sellerId) {
  var pageSEO = {
    home:    { title: 'Головна', desc: 'Купуй та продавай електросамокати, велосипеди, скутери в Україні.' },
    catalog: { title: 'Каталог оголошень', desc: 'Всі оголошення електротранспорту в Україні. Електросамокати, велосипеди, скутери.' },
    services:{ title: 'Сервісні центри', desc: 'Ремонт та обслуговування електротранспорту по всій Україні.' },
    news:    { title: 'Новини та огляди', desc: 'Останні новини, огляди та поради про електротранспорт.' },
    add:     { title: 'Подати оголошення', desc: 'Продайте свій електротранспорт на RideGO.' },
    faq:     { title: 'FAQ — Часті запитання', desc: 'Відповіді на найпоширеніші питання про RideGO.' },
    terms:   { title: 'Правила користування', desc: 'Правила використання маркетплейсу RideGO.' },
    privacy: { title: 'Політика конфіденційності', desc: 'Як RideGO зберігає та використовує ваші дані.' },
  };
  if (pageSEO[page]) {
    var _pageUrl = 'https://ridego-sigma.vercel.app' + (page === 'home' ? '/' : '/' + page);
    _updateSEO({ title: pageSEO[page].title, desc: pageSEO[page].desc, url: _pageUrl });
    _setListingSchema(null);
    _setNewsSchema(null);
  }
  if (page === 'seller' && sellerId) {
    _setHash('seller/' + sellerId);
  } else if (page === 'detail') {

  } else {
    _setHash(page === 'home' ? '' : page);
  }
  _renderRoute({ page, id: sellerId || null });
}

const _origShowDetail = showDetail;

function showSeller(sellerName) {
  const s = getSellerById(sellerName);
  if (s) {
    _setHash('seller/' + s.id);
    _renderRoute({ page: 'seller', id: s.id });
  } else {
    showToast('ℹ️ Сторінку продавця не знайдено');
  }
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
  var homeEl   = document.getElementById('home-listings');
  var catalogEl = document.getElementById('catalog-listings');
  var svcEl    = document.getElementById('home-services-grid');
  if (homeEl    && !homeEl.children.length)    homeEl.innerHTML    = _skeletonCards(6);
  if (catalogEl && !catalogEl.children.length) catalogEl.innerHTML = _skeletonCards(4);
  if (svcEl     && !svcEl.children.length)     svcEl.innerHTML     = _skeletonCards(3);
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
  const imgHtml  = l.img
    ? `<div class="listing-img-wrap"><img class="listing-img lazy-img" src="${_cdnTiny(l.img)||thumbSrc}" data-src="${thumbSrc}" alt="${l.title}" loading="lazy" decoding="async" onerror="this.style.display='none'" style="filter:blur(8px);transition:filter .4s ease"></div>`
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
  const hasSpecs = l.battery && l.battery !== '—';
  const specsHtml = hasSpecs ? `
    <div class="listing-specs">
      <div class="spec"><i class="fa-solid fa-battery-full"></i>${l.battery}</div>
      <div class="spec"><i class="fa-solid fa-gauge-high"></i>${l.speed}</div>
      ${l.range && l.range !== '—' ? `<div class="spec"><i class="fa-solid fa-road"></i>${l.range}</div>` : ''}
    </div>` : '';

  const yearHtml = l.year ? `<span class="lv-year" style="font-size:12px;color:var(--text-muted);margin-left:6px;font-weight:500">${l.year} р.</span>` : '';
  const condHtml = l.condition && l.condition !== 'Хороший'
    ? `<span class="lv-condition"><i class="fa-solid fa-circle-check" style="font-size:10px"></i>${l.condition}</span>`
    : `<span class="lv-condition"><i class="fa-solid fa-circle-check" style="font-size:10px"></i>${l.condition || 'Хороший'}</span>`;
  // Метарядок: рік + стан — під назвою
  const metaHtml = (l.year || l.condition)
    ? `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap">
        ${l.year ? `<span style="font-size:12px;color:var(--text-muted);display:flex;align-items:center;gap:4px"><i class="fa-regular fa-calendar" style="font-size:10px"></i>${l.year} р.</span>` : ''}
        ${l.condition ? `<span style="font-size:12px;color:${l.condition==='Новий'?'var(--brand)':'var(--text-muted)'};display:flex;align-items:center;gap:4px"><i class="fa-solid fa-circle-check" style="font-size:10px"></i>${l.condition}</span>` : ''}
       </div>`
    : '';

  const _sellerUid = l.uid || '';
  const sellerBtn = `<button onclick="event.stopPropagation();${_sellerUid ? `showSellerByUid('${_sellerUid}')` : `showSeller('${(l.seller||'').replace(/'/g,"\\'")}')` };"
    style="background:none;border:none;cursor:pointer;font-size:12px;color:var(--text-muted);
           display:inline-flex;align-items:center;gap:5px;padding:0;transition:color .15s;font-family:inherit"
    onmouseover="this.style.color='var(--brand)'" onmouseout="this.style.color='var(--text-muted)'">
    <i class="fa-solid fa-user-circle" style="color:var(--brand)"></i>${l.sellerName || l.seller || 'Продавець'}
  </button>`;

  return `
  <div class="listing-card ${promoClass}" onclick="showDetail('${l.id}')">

    <!-- Photo -->
    <div style="position:relative;flex-shrink:0">${imgHtml}${badgeHtml}${promoBadge}</div>

    <!-- Body -->
    <div class="listing-body">

      <!-- LIST MODE top row: category + price -->
      <div class="lv-top-row">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span class="tag tag-blue" style="font-size:11px">${l.cat}</span>
        </div>
        <div class="listing-price" style="font-size:20px;margin:0;white-space:nowrap">
          ${l.price.toLocaleString('uk')} грн
        </div>
      </div>

      <!-- Title -->
      <div class="listing-title">${l.title}</div>

      <!-- Condition + year pill row -->
      <div class="card-pills-row">
        ${l.condition ? `<span class="card-pill card-pill-${l.condition==='Новий'?'new':l.condition==='Хороший'?'good':'used'}">${l.condition}</span>` : ''}
        ${l.year ? `<span class="card-pill card-pill-year"><i class="fa-regular fa-calendar" style="font-size:10px"></i>${l.year}</span>` : ''}
      </div>

      <!-- Grid price -->
      <div class="listing-price">${l.price.toLocaleString('uk')} грн</div>

      <!-- Specs -->
      ${specsHtml}

      <!-- GRID MODE footer -->
      <div class="listing-footer">
        <button onclick="event.stopPropagation();${_sellerUid ? `showSellerByUid('${_sellerUid}')` : `showSeller('${(l.seller||'').replace(/'/g,"\\'")}')` };"
          class="card-seller-btn">
          <i class="fa-solid fa-user-circle"></i>${l.sellerName || l.seller || 'Продавець'}
        </button>
        <div style="display:flex;gap:4px;align-items:center">
          <button class="fav-btn compare-btn-card" id="cmp-btn-${l.id}" title="\u041f\u043e\u0440\u0456\u0432\u043d\u044f\u0442\u0438"
            onclick="event.stopPropagation();toggleCompare('${l.id}',this)"
            style="font-size:13px;opacity:.5">
            <i class="fa-solid fa-scale-balanced"></i>
          </button>
          <button class="fav-btn ${isFav?'active':''}" onclick="event.stopPropagation();toggleFav('${l.id}',this)">
            <i class="fa-${isFav?'solid':'regular'} fa-heart"></i>
          </button>
        </div>
      </div>

      <!-- LIST MODE bottom row -->
      <div class="lv-bottom-row">
        <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
          ${sellerBtn}
          <span style="display:inline-flex;align-items:center;gap:4px;font-size:12px;color:var(--text-muted)">
            <i class="fa-solid fa-location-dot" style="color:var(--brand);font-size:11px"></i>${l.city}
          </span>
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-shrink:0">
          <button class="lv-btn" onclick="event.stopPropagation();showDetail('${l.id}')">
            <i class="fa-solid fa-arrow-right" style="font-size:11px"></i> Переглянути
          </button>
          <button class="fav-btn ${isFav?'active':''}" onclick="event.stopPropagation();toggleFav('${l.id}',this)" style="font-size:18px">
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

function _loadUserServices(uid) {
  if (!window._db || !uid) return;
  window._db.collection('services').where('uid','==',uid).get()
    .then(function(snap) {
      var loaded = snap.docs.map(function(d){
        return Object.assign({id:d.id, _isOwn:true}, d.data());
      });

      myServices = myServices.filter(function(s){ return !s._isOwn; });
      myServices = loaded.concat(myServices);

      var myIds = loaded.map(function(s){ return s.id; });
      _fbServices = _fbServices.filter(function(s){ return myIds.indexOf(s.id) < 0; });
      renderMyServiceTab();
      renderHomeServices();
      if (typeof renderServices === 'function') renderServices();
    }).catch(function(e){ console.log('services load:', e.message); });
}

var _fbDataLoadedAt = 0;
var _FB_CACHE_TTL   = 10 * 60 * 1000;

function loadFirebaseData(force) {
  if (!window._db) return;
  var now = Date.now();

  if (!force && _fbListings.length && (now - _fbDataLoadedAt) < _FB_CACHE_TTL) {
    renderHomeListings();
    renderCatalog();
    return;
  }

  if (!force) {
    _idbGet('listings', 10 * 60 * 1000, function(cached) {
      if (cached && cached.length) {
        _fbListings = cached;
        _fbDataLoadedAt = Date.now();
        _idbGet('services', 15 * 60 * 1000, function(svcs) {
          if (svcs) _fbServices = svcs;
          renderHomeListings();
          renderCatalog();
          if (_fbServices.length) {
            renderHomeServices();
            if (typeof renderServices === 'function') renderServices();
          }
        });
        setTimeout(function() { loadFirebaseData(true); }, 3000);
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

  window._db.collection('listings').orderBy('createdAt','desc').limit(50).get()
    .then(function(snap) {
      _fbListings = snap.docs.map(function(d){ return Object.assign({id:d.id}, d.data()); });
      _fbDataLoadedAt = Date.now();

      _idbSet('listings', _fbListings);

      var fbIds = {};
      _fbListings.forEach(function(l){ if (l.id) fbIds[l.id] = true; });
      myListings = myListings.filter(function(l){ return l && l.id && !fbIds[l.id]; });

      renderHomeListings();
      renderCatalog();

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
    }).catch(function(e){
      console.log('listings:', e.message);
      if (!navigator.onLine) showToast('⚠️ Немає з\'єднання з інтернетом');
    });

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
    }).catch(function(e){ console.log('services:', e.message); });
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
    .limit(20).get()
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
    }).catch(function(e){ console.log('chats:', e.message); });
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
    if (el) el.textContent = cnt > 0 ? cnt + ' пропозицій' : 'Скоро буде';
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
      newEl.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:32px">Оголошень поки немає</p>';
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
      + '<div style="font-weight:700;font-size:13px;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + s.name + '</div>'
      + '<div style="font-size:11px;color:var(--text-muted)">' + (s.city || '') + '</div>'
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
      ? "<div class=\"home-svc-icon\" style=\"background:none;overflow:hidden;padding:0\"><img src=\""+s.photoUrl+"\" style=\"width:100%;height:100%;object-fit:cover;border-radius:inherit\"></div>"
      : "<div class=\"home-svc-icon\">"+s.icon+"</div>"
    )
    +"<div style=\"flex:1;min-width:0\">"
    +"<div style=\"display:flex;align-items:center;gap:6px;flex-wrap:wrap\">"
    +"<div class=\"home-svc-name\">"+s.name+"</div>"+badge+"</div>"
    +"<div class=\"home-svc-city\">📍 "+(s.city||"")+(s.address?" \u00b7 "+s.address:"")+"</div>"
    +"</div></div>"
    +"<div class=\"home-svc-cats\">"+cats+"</div>"
    +(preview ? "<div class=\"home-svc-services\">"+preview+"</div>" : "")
    +(rating ? rating : "")
    +"</div>";
}

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

  var all = _allListings().filter(function(l){ return l && l.status !== 'deleted'; });

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
    if (urlEl) urlEl.textContent = 'https://ridego-sigma.vercel.app/seller/' + uid;
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
    const initials = r.author.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    const color = colors[i % colors.length];
    const stars = '★'.repeat(r.rating) + '☆'.repeat(5-r.rating);
    return `<div class="review-card">
      <div style="display:flex;align-items:flex-start;gap:14px">
        <div style="width:44px;height:44px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:#fff;flex-shrink:0">${initials}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;flex-wrap:wrap;gap:6px">
            <span style="font-weight:700;font-size:14px">${r.author}</span>
            <span style="font-size:11px;color:var(--text-muted)">${r.date}</span>
          </div>
          <div style="color:#ffa726;font-size:13px;margin-bottom:8px;letter-spacing:1px">${stars}</div>
          <p style="font-size:14px;line-height:1.7;color:var(--text-muted);margin:0">${r.text}</p>
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
    url: 'https://ridego-sigma.vercel.app/listing/' + id
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
    <span style="display:flex;align-items:center;gap:5px"><i class="fa-solid fa-location-dot" style="color:var(--brand)"></i>${l.city}</span>
    <span style="display:flex;align-items:center;gap:5px"><span style="width:8px;height:8px;border-radius:50%;background:${condColor};display:inline-block"></span>${l.condition}</span>
    <span style="display:flex;align-items:center;gap:5px"><i class="fa-regular fa-clock" style="color:var(--brand)"></i>${l.time}</span>
    <span style="display:flex;align-items:center;gap:5px"><i class="fa-solid fa-tag" style="color:var(--brand)"></i>${l.cat}</span>
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
    wrap.innerHTML = `<img src="${detailSrc}" alt="${l.title || ''}" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:contain;background:var(--dark3);transition:opacity .3s" onerror="this.style.display='none';var fb=document.getElementById('detail-img-fallback');if(fb)fb.style.display='flex'"><div id="detail-img-fallback" style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:80px;opacity:.4">${fallbackIcon}</div>`;
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
  if (!l.specs) { document.getElementById('detail-specs-full').innerHTML = '<p style="color:var(--text-muted);padding:20px">Детальні характеристики відсутні</p>'; return; }
  var specs = _convertSpecs(l.specs);
  const order = ['general','motor','battery','performance','physical','extras'];

  Object.keys(specs).forEach(function(k){ if(order.indexOf(k)<0) order.push(k); });
  let html = '<div class="spec-section">';
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
  document.getElementById('detail-specs-full').innerHTML = html;
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

let nextId = 100;
let addCurrentStep = 1;
let addSelectedCat = null;
let addSelectedIcon = '📦';
let uploadedPhotos = [];

const ADD_BRANDS = {
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
    'Forte',
    'Gelius',
    'GIANT (самокат)',
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
    'Ninebot (Segway)',
    'PRIME3',
    'Proove',
    'Razor',
    'Ruitoo',
    'Speedway',
    'Swagtron',
    'Tecros',
    'Tesla (самокат)',
    'Turboant',
    'Vortex',
    'Vsett',
    'Wegoboard',
    'Wolf Warrior',
    'X-Scooter',
    'Xiaomi',
    'Інший бренд',
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
    'Corso',
    'Cross',
    'CTM',
    'Cube',
    'Cyclone',
    'Discovery',
    'Dorozhnik',
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
    'Trek',
    'Univega',
    'Wilier',
    'Winner',
    'Winora',
    'Yeti',
    'Інший бренд',
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
    'Інший бренд',
  ],
  'Електроскутери': [
    'AIMA',
    'Askoll',
    'Ather',
    'Atlas',
    'BMW CE 02',
    'BMW CE 04',
    'Citycoco',
    'Corso (скутер)',
    'Doohan',
    'Electra',
    'Eskooter',
    'EVOBIKE',
    'Fada',
    'Forte',
    'Govecs',
    'Horwin',
    'Kugoo (скутер)',
    'Kymco',
    'LIBERTY',
    'MANTA',
    'Maxxter',
    'Neco',
    'Nito',
    'NIU',
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
    'Інший бренд',
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
    'Інший бренд',
  ],
};

const ADD_MODELS = {

  'Xiaomi': [
    'Mi Electric Scooter 1S','Mi Electric Scooter 3','Mi Electric Scooter 3 Lite',
    'Mi Electric Scooter 4','Mi Electric Scooter 4 Lite','Mi Electric Scooter 4 Lite Gen2',
    'Mi Electric Scooter 4 Pro','Mi Electric Scooter 4 Pro 2nd Gen',
    'Mi Electric Scooter 4 Ultra','Mi Electric Scooter 5','Mi Electric Scooter 5 Pro',
    'Mi Electric Scooter Elite GL','Mi Electric Scooter Essential',
    'Mi Electric Scooter Pro 2','Redmi Electric Scooter 3',
  ],
  'Ninebot (Segway)': [
    'C2 Pro E','C2 Lite','E2 E','E2 E II','E2 Pro E',
    'E3','E3 Pro E','F2 E Plus','F2 II E','F2 Pro E','F2 Pro E II',
    'F3 E','F3 Pro E','GT3','GT3 E','GT3 Pro','GT3 Pro E',
    'KickScooter C2 Lite','KickScooter C2 Pro',
    'MAX G2 E','MAX G30','MAX G30D','MAX G30E II','MAX G30LE','MAX G30P',
    'MAX G3','MAX G3 E','P65E','ZT3 Pro E',
    'eKickScooter E3 Pro E','eKickScooter F3 Pro E','eKickScooter MAX G3 E',
    'Air T15','Air T15E','Zing C20','Zing E10',
  ],
  'Kugoo': [
    'C1','C1+','C1 Pro','G-Booster','G1','G1 Plus',
    'G2 MAX','G2 Pro','G2 Pro Black','G2 Pro OffRoad',
    'G30 Ekam','G30 MAX','G30 MAX PRO','G30 MAX PRO Plus',
    'Jilong M365','Kirin G2','Kirin G2 2025','Kirin G2 2026',
    'Kirin G2 Master','Kirin G2 Master Dual','Kirin G2 Max','Kirin G2 Pro',
    'Kirin G2 Ultra 2025','Kirin G3','Kirin G3 Pro','Kirin G3 Pro Dual',
    'Kirin G4','Kirin G4 Max','Kirin iScooty M4 PRO',
    'Kirin M4','Kirin M4 Pro','Kirin M4 Pro Plus','Kirin M5 Pro',
    'Kirin M5 PRO MAX','Kirin M5 PRO 2025','Kirin S3 PRO Premium',
    'Kirin T3','M2','M365 Pro','M365 Pro Max','M365 Pro Max 4',
    'M4','M4 Pro','M4 Pro 18Ah','M4 PRO 1000','M5 Pro',
    'PRO 5 Max','S1 Pro','S3','S3 Pro','S3 Pro Black',
  ],
  'Joyor': [
    'A3','A5','A5S','A5S Plus','F3','F5','F6',
    'G5S','G5S Plus','G7S','S1','S5','S10',
    'X1','X2','X3','X5S','X5S Plus','X5S SE','X5S Pro',
    'Y5S','Y6S','Y6S Plus','Y10',
  ],
  'Kaabo': [
    'Mantis 8','Mantis 8 Pro','Mantis 8+ Pro',
    'Mantis 10','Mantis 10 Pro','Mantis King GT','Mantis King GT Pro',
    'Mantis X Plus','Skywalker 8 ECO500','Skywalker 10H ECO800',
    'Skywalker 10S','Skywalker 10S Plus',
    'Wolf Warrior 11','Wolf Warrior 11+','Wolf King GT','Wolf King GT Pro',
    'Wolf Warrior X','Wolf Warrior X Pro Plus Gold',
  ],
  'Dualtron': [
    'Mini','Mini 2','Compact','Victor','Victor Luxury','Victor Raptor',
    'Eagle Pro','Spider 2','Storm','Thunder 2','Thunder 2 Ultra',
    'Ultra 2','X2','Lightning','Achilleus',
  ],
  'Inokim': [
    'Light 2','Light 2 Super','Mini 2','OX','OX Sport','OX Super',
    'Quick 3','Quick 4','Quick 4 Super',
  ],
  'Vsett': ['8','8+','9+','9+ Pro','10+','10+ Pro','11+'],
  'Apollo': [
    'Air','City','City 2023','Ghost','Ghost Max',
    'Explore','Phantom','Phantom V3','Pro','Shadow',
  ],
  'Hoverbot': [
    'Alpha','Carbon','Matrix','Ranger','Titan','Titan Fat','Titan Light','Titan Pro','Vector',
  ],
  'KingSong': ['KS-N10','KS-N11','KS-N12','KS-N13','KS-S16','KS-S18','KS-16X','KS-S1 Plus'],
  'Inmotion': ['Climber S1 Pro','RS','S1','S1 Pro','S1F'],
  'Navee': ['GT3','GT3 MAX','N40','N65','S40 350W','S65','S65 Carbon','S85','V50'],
  'OKAI': ['EA10C Ceetle Pro','ES10 Lite','ES20','ES30','ES30 Neon Pro','ES35'],
  'Proove': ['City Max','Dual Sport','Explorer','X-City Max','X-City Pro','X-City Pro Max'],
  'Turboant': ['D3F','M10 Lite','M10 Pro','Thunder T1','Thunder T1 Pro','V8','X7 Max','X7 Pro'],
  'Motus': ['PRO 10 Sport','PRO 10 Urban','Scooty 8.5'],
  'Mercane': ['WideWheel 48V','WideWheel Pro'],
  'Atlas': [
    'Eagle','Falcon Box 1500W','mini','Spider','Spider Box 1500W',
    'Spider 2 Box 2000W Plus','Speedy Box 2000W',
    'Tiger Box 2000W','Tiger Box Plus 2000W',
  ],
  'Crosser (самокат)': [
    'T4 Seat','Tesla MODEL 12000','CR-4 1200W','CR-17 2500W','Super Max 1200W',
  ],
  'Forte (самокат)': ['E9 PRO','E9 PRO MAX','EB5'],
  'Maxxter': ['ANT','LUMINA','LUMINA 1500W','NEOS III','NOVA 1000W','Rock 2.0'],
  'Maraton': ['M4 MAX','Scooter Tesla 5000'],
  'Razor': ['E100','E200','E300','E Prime','Power Core E100','Power Core E90'],
  'Acer': ['Nitro ES Series 4','Scooter 3 Advance','Scooter 5 Select ES035'],
  'ProCraft': ['DS500L'],
  'VNC': ['E-Booster A7'],
  'Ausom': ['L2 Max Dual Motor'],
  'MS Energy': ['MS-E10','MS-E40','MS-E200','MS-E450'],
  'Globber': ['E-MOTION 4','One K E-Motion 20','One K E-Motion 22'],
  'E-Twow': ['Booster GT','Booster GT+ Plus','Master GT','Master GT+'],
  'Speedway': ['5 Pro','Leger','Leger Pro','Mini 4 Pro','Phantom V3'],
  'MegaDrive': ['City 2000','Sport','Z10','Z10 Pro'],
  'Gelius': ['GES-U73','Scooter Pro','UL-ES001'],
  'Blaupunkt': ['ESC440','ESC608','ESC912'],
  'Proove': ['City Max','Dual Sport','Explorer','X-City Max','X-City Pro','X-City Pro Max'],
  'Red Bull': ['Skate Electric','Urban'],
  'PRIME3': ['ESA21GY','ESA32GY','ESA33GY','ESA34GY'],
  'Sencor': ['SBM 02','SBM 03 Plus','SBM 04','SBM 500'],
  'Sharp': ['SHA-ES101','SHA-ES201','SHA-ES301','SHA-ES401'],
  'InMotion': ['RS','S1 Pro','E1'],
  'Vsett': ['8','8+','9+','9+ Pro','10+','11+'],
  'City Boss': ['CRB01','CRB02','CRB03'],
  'NAVEE': ['GT3','GT3 MAX','N40','N65','S40','S65','ST3','ST3 PRO','ZT3 Pro'],
  'W-TEC': ['eDirt W-8011','eSportway W-8000','eCity W-2000'],

  'Trek': [
    'Checkpoint ALR 4','Checkpoint ALR 5','Checkpoint SL 5','Checkpoint SL 6',
    'CrossRip 1','Domane AL 2','Domane AL 3','Domane AL 5',
    'Domane SL 5','Domane SL 6','Dual Sport 2','Dual Sport 3',
    'Emonda ALR 5','Emonda SL 5','Emonda SL 6',
    'Fuel EX 5','Fuel EX 7','Fuel EX 8','Fuel EX 9.5',
    'FX 3','FX Sport 4','FX Sport 6',
    'Madone SL 5','Marlin 4','Marlin 5','Marlin 6','Marlin 7','Marlin 8',
    'Procaliber 9.5','Procaliber 9.7',
    'Rail 7','Rail 9.7','Roscoe 6','Roscoe 8',
    'Slash 5','Slash 7','Slash 9',
    'Supercaliber 9.6','Top Fuel 5','Top Fuel 8',
    'Verve 1','Verve 2','X-Caliber 7','X-Caliber 8','X-Caliber 9',
  ],
  'Giant': [
    'Contend AR 2','Contend AR 3','Defy Advanced 2','Defy Advanced 3',
    'Escape 1','Escape 2','Escape 3',
    'FastRoad AR 2','FastRoad AR 3','FastRoad SL 1',
    'Fathom 1','Fathom 2','Fathom 29 1','Fathom 29 2',
    'Revolt 1','Revolt 2','Revolt Advanced 1',
    'Roam 4','Stance 1','Stance 2',
    'Talon 1','Talon 2','Talon 3','Talon 29 1','Talon 29 2',
    'TCR Advanced 1','TCR Advanced 2','TCR Advanced Pro 0',
    'Trance X 1','Trance X 2','Trance X 29 1',
    'XTC Advanced 27.5',
  ],
  'Specialized': [
    'Allez','Allez Sport','Allez Elite',
    'Diverge Base Carbon','Diverge Comp Carbon',
    'Enduro Comp','Enduro Expert',
    'Epic Evo','Epic Expert',
    'Rockhopper Comp','Rockhopper Sport',
    'Roubaix Comp','Roubaix Sport',
    'Sirrus X 3.0','Sirrus X 4.0',
    'Stumpjumper Comp','Stumpjumper EVO Comp',
    'Tarmac SL7 Expert',
  ],
  'Merida': [
    'Big Nine 300','Big Nine 400','Big Nine XT',
    'Big Seven 300','Big Seven 400','Big Seven 600',
    'Crossway 20','Crossway 40','Crossway 100',
    'One-Twenty 400','One-Twenty 600',
    'Reacto 5000','Scultura 300','Scultura 400',
    'Silex 300','Silex 400','Speeder 200','Speeder 300',
  ],
  'Cube': [
    'Agree C:62 Pro','Aim Pro','Aim Race',
    'Attention SL','Hyde Race','Litening C:68X Pro',
    'Nature Cross Pro','Reaction 300','Reaction 400',
    'Stereo 120 Race','Touring Hybrid 400',
  ],
  'Cannondale': [
    'Habit 4','Habit 5','Quick 4','Quick CX 3',
    'Synapse Carbon 2','Topstone 1','Topstone 2','Topstone Carbon 1',
    'Trail 5','Trail 6','Trail 7','Treadwell 2',
  ],
  'Scott': [
    'Addict RC 20','Aspect 970','Genius 930',
    'Scale 960','Scale 970','Spark RC 900 Pro',
    'Speedster 40',
  ],
  'Kellys': [
    'Arc 10','Arc 30','Desire 30','Desire 70',
    'Gibon 30','Gibon 50','Gibon 70','Gibon 90',
    'Hacker 30','Hacker 70','Phanatic 29',
  ],
  'Marin': [
    'Bobcat Trail 3','Bobcat Trail 5','Fairfax 1',
    'Four Corners','Gestalt X 11','Hawk Hill 1','Hawk Hill 2',
    'Nicasio+','Pine Mountain 2',
  ],
  'Author': ['Codex 29','Impulse 29','Outset 29','Rival 29','Traction 27','Traction 29'],
  'Ghost': ['Hybride EQ 5.8','Kato FS Pro','Nirvana Tour 3.8','Panamao X'],
  'GT': ['Aggressor Comp','Avalanche Comp','Grade Carbon Pro','Sensor Comp'],
  'Ardis': ['Berta 28','Blaze 29 MTB AL','Buggy 26','CHARGE 20 CTB','CHARGE 24 CTB 3x','City Folding FLD AL 24','Cleo 24','CTB 26 ST LIDO','DALLAS 27.5 MTB AL','Drift MTB MG 20','EZREAL 24','Flex 26','Fold 20 FLD ST','GTA E-BIKE 500W 29','Lido 26','Lido CTB AL 26','MG CROSS 20','Paola 28','PEPPA 20 MTB AL','POLO 20 MTB ST','Santana MTB ST 24','SHADOW 16 BMX','Shultz 27.5','Swift.Pro 27.5','Titan 27.5','Verona 26','Vintage 26','ЛІБІДЬ 28',],
  'Pride': ['Brave R1 29','Brave Team 29','Flame','Journey 1.0','Rocket','Savage 27.5'],
  'Dorozhnik': ['CRYSTAL','COMFORT','AQUAMARINE','ONYX','RETRO','TRAIL'],
  'Formula': ['Acid Vbr 24','Alpina AM DD 26','BLACKWOOD 1.0 24','BLACKWOOD 26','Cherry 16','Cursor Man AM DD 28','DRAGONFLY 29','eHeavy Duty 29','eMOTION PLUS DD FR','F-1 AM DD 26','MOTION DD','MOTION DD FR','MOTION PLUS','MOTION PLUS AM DD','OMEGA 26','SLIM Vbr 18','SMART 20','SMART FRW AM 24','THOR 26','THOR 29','ZEPHYR 1.0 AM HDD','ZEPHYR 2.0','ZEPHYR 3.0 AM DD','ZEPHYR EXPERT HDD',],
  'Cross': ['Blade','Egoist','Elegant','Galaxi','Kron'],
  'CTM': ['Rein','Scream','Versus','Viper','Warp'],
  'Discovery': ['Camp','Canyon','Track','Trail'],
  'Cyclone': ['ALX','GSX','SLX'],
  'Kinetic': ['Storm','Vesta'],
  'Winner': ['Fighter','Grace','Street'],

  'Fiido': [
    'Beast Pro','C11','C21','D2S','D3 Pro','D4s','D4s Plus',
    'D11','D21','L3','L3 Cargo','M1 Pro','M21','Q1S',
  ],
  'NCM': [
    'Aspen','Aspen Plus','C5','Hamburg Plus','London Plus',
    'Milano+','Milano Max','Moscow+','Moscow Max','Prague+','Prague Max',
    'S6','Vienna Plus',
  ],
  'Eleglide': [
    'Citycrosser','Citycrosser 2.0','Coozy','Coozy Pro',
    'F1','M1 Plus','M2','M2 Pro','T1 Step-Thru','T1 ST Plus','Tankroll',
  ],
  'Engwe': [
    'C20 Pro','Engine Pro 2.0','Engine Pro 2.0 Plus',
    'EP-2 Boost','EP-2 Pro','L20','M20 Dual','P275 ST','P26','X26',
  ],
  'Haibike': [
    'AllMtn 3','AllMtn 5','AllMtn CF 5','AllMtn CF 7',
    'HardNine 3','HardSeven 3',
    'FLYON AllMtn 2','Sduro FullSeven 3.0',
    'Trekking 5','Trekking 7','Trekking Cross 5',
  ],
  'Dorozhnik': [
    'eADAMANT HDD','eAKVAMARIN','eCORAL AM DD',
    'eCRYSTAL BH','eRETRO DD','eRETRO VBR',
  ],
  'KTM': [
    'Macina Chacana 791','Macina Eight 11',
    'Macina Sport 720','Ultra Fun 29',
  ],
  'Lankeleisi': ['G650','G660','RV800','RX80','TG750','X3000 Plus','XT750'],
  'Samebike': ['LO26-II','MY-SM26','RS-A01','RS-A08','SB-686MT'],
  'Tenways': ['AGO T','AGO Z','CGO600 Pro','CGO800S','CGO20 Pro'],
  'Cowboy': ['C4','C4 ST','Cruiser','C4 Adventure','Cross'],
  'Bezior': ['BK1','M2 Pro','X500 Pro','X1500','XF200'],
  'Gogobest': ['GF300','GF500','GF600','GF700 Dual','GN20'],
  'Randride': ['G100','TX90 Max','YG90'],
  'Lectric': ['One','XP 3.0','XP 3.0 Step-Thru','XPeak'],
  'Delfast': ['Partner 2.0','Top 3.0i','Top 3.0 Enduro'],
  'Eleek': ['Atom','Atom Military','Enduro'],
  'Crosser': ['Angel 24','Angel 26','Angel 29','COMP 350W','CR-9 1000W','CR-EL-29PRO','Dominator 10','E-400','E-500','E-777 Fat','E-CODE 1000W','E9','E9 Premium','Leon 29','M5','Martin 24','Rocket 11','Super Light 20','Sweet 24','T4 Pneumatic','T4 TURBO','T8 MAX','T8 MAX AWD',],
  'Hidoes': ['B10','B16','B20 Pro'],
  'Rooder': ['Chopper 3000W','City 1500W','Fat 2000W','MTB 750W'],
  'Voltronic': ['Kentor 500W 27.5','Kentor 750W 29'],
  'Focus': ['Aventura2 6.8','Jam2 6.8','Jarifa2 6.8','Thron2 6.8'],
  'Winora': ['Sinus N8','Tria N8','Yakun 10','Yakun 12','Yucatan 12'],
  'Himo': ['C26','C30','H26','Z16','Z20'],
  'Fafrees': ['F20 Pro','F26 Carbon','F28 Pro','FF20 Polar'],
  'Batavus': ['Bravo E-go','Finez E-go','Finez E-go Power','Fonk E-go','Stream E-go'],
  'Gazelle': ['Arroyo C8','Medeo T9','Miss Grace C7','Ultimate C380+','Ultimate T10'],
  'Stromer': ['ST2 S','ST3','ST5','ST7'],
  'Tern': ['Fastrack','GSD S10','HSD S11','Quick Haul','Vektron S10'],
  'Riese & Müller': ['Charger3 GT','Homage3','Load 75','Nevo3 GT','Supercharger3'],
  'VanMoof': ['A5','S5'],
  'Ampler': ['Axel','Curt','Juna','Stout'],
  'ESKUTE': ['Polluno','Polluno Pro','Voyager','Wayfarer'],
  'Heybike': ['Cityscape','Mars 2.0','Ranger','Tyson'],
  'Velowave': ['Ghost','Prado','Ranger','Ranger Fat'],
  'Anomaly Energy': ['T6 Elegance','V8','V8 Pro'],
  'E-motion': ['City 36V','Enduro 48V','MTB 27.5 GT','MTB 29 GT'],
  'FADA': ['MOAi 800W','MOAi Pro','City 350W'],
  'Ado': ['A20','A20 Air','A20F Beast','A28','E28 XE Pro'],
  'Bafang': ['BBSHD 1000W','BBS02 750W','M600','M620 Ultra'],

  'NIU': [
    'EM215','EM215A','EM215N',
    'KQi2 Pro','KQi3','KQi3 Me','KQi3 Pro','KQi3 Max','KQi3 Sport',
    'MQi+','MQi+ Sport','MQi GT EVO',
    'NQi GTS Pro','NQi GTS Sport','NQi Pro','NQi Sport',
    'RQi','RQi Sport','UQi GT Pro',
  ],
  'AIMA': ['Eagle','Eagle Max','Eagle Pro','Fox','Fox Pro','Mine Max','Mine Plus','Mine Pro','Star','T3','T4','T5','Tiger','Tiger Pro'],
  'Yadea': ['C1S','C1S Pro','EPOC','EPOC Pro','G5','G5 Max','G5 Sport','G5S','G6','G6 Pro','KS5 Pro','LUNA','RN','S-Like','T2','T9','T9 Pro','Vfly','YADEA G5S','YADEA KS6 Pro','YADEA T9','Z3','Zuma',],
  'Super Soco': ['CPX','CPX Pro','CUx','TC','TC Max','TC Wanderer','TS Street Hunter','VS2'],
  'Forte': ['E-BIKE 500W','FLY','GP-1000-C','GP-1500-C','GRAVY','HAWK','JB-1500','LEON','LEON PRO','Lucky WS350','Lucky WS500','NIRO','R2','R3','T1','T3','Tron 800W','UNICORN EV',],
  'Atlas': [
    'Eagle','Falcon Box 1500W','mini','Spider Box 1500W',
    'Spider 2 Box 2000W Plus','Speedy Box 2000W',
    'Tiger Box 2000W','Tiger Box Plus 2000W',
  ],
  'Crosser': [
    'CR-4 1200W','CR-17 2500W','CR1 500W','CR2 500W','CR4',
    'Super Max 1200W LifePO4','TR1 PRO','TR3',
    'E-Delta 800W',
  ],
  'Maxxter': ['ANT','LUMINA','LUMINA 1500W','NEOS III','NOVA 1000W','Rock 2.0','SCAT','Trike'],
  'Citycoco': ['3000W Classic','3000W Fat Tyre','Chopper 2000W','Spider','T8 Pro','X3 Pro'],
  'Doohan': ['iTank 3000W','iTank Cargo','iTank Pro 4000W','iVolt'],
  'Govecs': ['GO! L','GO! S3.4','GO! T1.6'],
  'Horwin': ['CR6','CR6 Pro','EK1','EK3 Plus','SK3'],
  'Kymco': ['iFlow+','Ionex S','Like EV','RevoNEX','Super NEX'],
  'Nito': ['N1','N1X','N3','N4','N5'],
  'Ola Electric': ['S1 Air','S1 Pro','S1 X','S1 X+'],
  'Segway': ['Apex Max','E110SE','E125S','E300SE'],
  'Silence': ['S01','S01+','S02','S04'],
  'SYM': ['Husky','iFlow','Mio 110e','Jet e+'],
  'Vmoto': ['CPX','CUX','TS2'],
  'EVOBIKE': ['City Pro 72V','Luna TRIO 60V','Sport 72V'],
  'Fada': ['TDT1261Z','TDT1262Z','TDT2028'],
  'Neco': ['Clover','Ides','Portofino'],
  'SPARK': ['Compact 14','Spark 48V 400W'],
  'Vespa Electric': ['Elettrica 45','Elettrica 70','Elettrica L3'],
  'Zero': ['DS','DSR','DSR/X','FXE','S ZF14.4','SR/F','SR/S'],
  'BMW CE 02': ['CE 02 4.0 kW','CE 02 11 kW'],
  'BMW CE 04': ['CE 04 31 kW'],
  'Revolt': ['RV300','RV400'],
  'Rooder': ['Chopper 3000W','City 1500W','Fat 2000W'],
  'Kugoo (скутер)': ['C1','C1 Pro','C3'],
  'Corso (скутер)': ['Hawk 1000W','Komodo 1000W','Komodo 1200W','Nova 1000W','Niro 800W','Raven 800W','SIG-8 Pro','Spider Box 1500W',],
  'W-TEC': ['eCity W-2000','eDirt W-8011','eSportway W-8000'],
  'Orcal': ['Astor','Ecooter E2R'],
  'Rieju': ['MRT','Nuuk Cargo','Nuuk City'],
  'Torrot': ['Adventure','Futura','Muvi'],
  'Piaggio': ['1 Active','1 Outfit','Liberty S','MP3'],
  'Askoll': ['ES1','ES3 Evolution','NGS3'],
  'Ather': ['450 Plus','450S','450X','Rizta'],
  'Vuka': ['Vuka 1500W','Vuka Pro'],
  'LIBERTY': ['Liberty 2000W','Liberty Pro'],
  'MANTA': ['Manta 2000W','Manta Pro'],
  'SPARK': ['Compact 14','Spark 48V 400W'],
  'Seev': ['Seev 1500W','Seev Pro'],
  'Eskooter': ['Eskooter City','Eskooter Pro'],

  'Zero Motorcycles': [
    'DS ZF14.4','DSR ZF14.4','DSR Black Forest','DSR/X','DSR/X Premium',
    'FX ZF7.2','FX ZF14.4','FXE','FXS ZF3.6',
    'S ZF7.2','S ZF14.4','SR ZF14.4','SR/F','SR/F Premium','SR/S','SR/S Premium',
  ],
  'Energica': [
    'Eva EsseEsse9+ RS','Eva Ribelle','Eva Ribelle RS',
    'Experia','Experia GT','Ego+','Ego+ RS','Ego Corsa',
  ],
  'Sur Ron': ['Light Bee','Light Bee S','Light Bee X','Storm Bee','Ultra Bee'],
  'Talaria': ['Sting','Sting MX3','Sting MX3 Pro','Sting R','Sting R MX4','Sting X3+'],
  'Kawasaki': ['Ninja e-1','Ninja e-1 ABS','Z e-1','Z e-1 ABS'],
  'LiveWire': ['Del Mar LTD','Del Mar S','Del Mar S2','One'],
  'Harley-Davidson': ['LiveWire','LiveWire One'],
  'KTM': ['Freeride E-SM','Freeride E-XC'],
  'GasGas': ['EC-E 5','MC-E 5'],
  'Husqvarna': ['EE 3','EE 5'],
  'Stark': ['VARG EX 450','VARG MX 450'],
  'Cake': ['Kalk OR','Kalk& Street','Kalk INK SL','Ösa Lite','Ösa+'],
  'BMW': ['CE 02','CE 04'],
  'Honda': ['EM1 e:','PCX Electric'],
  'Yamaha': ['E01','EC-05','EMF','NEOs'],
  'Ducati': ['MotoE'],
  'CSC': ['City Slicker 2.0'],
  'Indian': ['PowerPlus','Thunderstroke 116e'],
  'KOVE': ['450 Rally E','800X Adventure'],
  'Lightning': ['LS-218','Strike','Strike Carbon'],
  'Maeving': ['RM1','RM1S'],
  'RGNT': ['No.1 Classic','No.1 Scrambler'],
  'Sondors': ['Metacycle'],
  'Tarform': ['Luna Roadster','Luna Scrambler'],
  'Ultraviolette': ['F77 Mach 2','F77 Recon'],
  'Verge': ['TS','TS Pro','TS Ultra'],
  'Arc': ['Arc Vector'],
  'Curtiss': ['Apollo','Hera','Zeus'],
  'Damon': ['HyperFighter Colossus','HyperSport Premier','HyperSport Pro'],
  'Davinci': ['DC100'],
  'Currus': ['EG','EG One','NF-9','NF-9 Plus','Panther','Wolf+'],
  'E-Scooter': ['M4 PRO 1000W','Zen U12 PRO','E-Scooter 11"'],
  'GIANT (самокат)': ['Move U8 PRO','Outlander M11','Kids ES1','E-Scooter'],
  'Avanti': ['Aspire 1','Aspire 2','Rival 2','Rival 3','Edge'],
  'Azimut': ['Energy','Sprint','Space'],
  'Bergamont': ['Revox 4','Revox 6','Helix 4','Revox 8'],
  'Bianchi': ['Camaleonte 1','Sprint','Via Nirone 7'],
  'BMC': ['Roadmachine 01','Teammachine SLR 01','Fourstroke 01'],
  'Colnago': ['C68','V3Rs','G3-X'],
  'De Rosa': ['King XS','Idol','SK','Protos'],
  'Fuji': ['Nevada 1.9','Traverse 1.5','Gran Fondo 2.1'],
  'Mongoose': ['Tyax Comp','Impasse Comp','Dolomite Fat'],
  'Norco': ['Optic C3','Sight C3','Fluid HT 2'],
  'Nukeproof': ['Mega 275 Comp','Scout 275 Sport','Giga 275'],
  'Orbea': ['Orca M31','Gain M30i','Alma M25'],
  'Rocky Mountain': ['Altitude 50','Thunderbolt 30','Fusion 30'],
  'Santa Cruz': ['Hightower C','Bronson C','Blur','Megatower'],
  'Yeti': ['SB130','SB150','SB115','SB100'],
  'Pivot': ['Trail 429','Shadowcat','Mach 4 SL'],
  'Spelli': ['SPX-6000','SPX-5200','SPC-4200'],
  'Stern': ['Rocket 27.5','Advance 29','Power 26'],
  'Pinarello': ['Dogma F','Prince','Paris'],
  'Ridley': ['Kanzo Fast','Noah Fast','Fenix SLiC'],
  'Wilier': ['Filante SLR','Zero SLR','Jena'],
  'Raleigh': ['Stuntman','Mustang','Pioneer'],
  'Gazelle (велосипед)': ['Miss Grace','Bold','Orange'],
  'Batavus (велосипед)': ['Finez','Fonk','Quip'],
  'Stevens': ['Jura CF','Super Prestige','Tactic'],
  'Bulls': ['Copperhead EVO AM 4','Sonic Evo AM 4','Desert Falcon'],
  'Pegasus': ['Solero E8 Plus','Premio E10','Piazza E9'],
  'Romet': ['R922','R926','Orkan 7'],
  'Corso (ebike)': ['Atlant Plus 20','Shadow 22','Volt Bike 26'],
  'Gunai': ['CX10','CX20','MX03','MX10'],
  'Hitway': ['BK5','BK11','BK15','BK22'],
  'Jasion': ['EB5 Plus','EB7'],
  'Moustache': ['Friday 27 3','Samedi 27 Trail 4'],
  'Richbit': ['RT-011','RT-012','RT-023'],
  'Electra': ['Electra 3000W','Electra City'],
  'Cruzzer': ['City Pro','M5 Pro 2000W','M6 Pro'],
  'Currus': ['EG','EG One','NF-9','NF-9 Plus','Panther','Wolf+'],
  'E-Scooter': ['E-Scooter 11"','M4 PRO 1000W','Zen U12 PRO'],
  'GIANT (самокат)': ['E-Scooter','Kids ES1','Move U8 PRO','Outlander M11'],
  'Hikerboy': ['Escape Pro','Hero 3.0','Urban Pro'],
  'Mantis': ['10 Pro','8 Pro','King GT'],
  'Ruitoo': ['T3PRO','T5','T7 Pro'],
  'Swagtron': ['Swagger 5 Elite','Swagger 5 Pro','Swagger 7','Swagboard Elite'],
  'Tecros': ['E9 MAX PRO','F1 500W 20','F1 Dual 20','F2 500W 20','Limousine 4000W','S01 2400W','S02','S03 3000W','T03 Plus 6000W','T4 PRO','V8 Pro','V9 Pro','X9 Dual',],
  'Tesla (самокат)': ['"16000" 48V','4000 60V','20000 NEW 2025','26000'],
  'Vortex': ['CY-E','MX-E','Speed Pro'],
  'Wegoboard': ['City Pro','Sport','X-Urban'],
  'Wolf Warrior': ['Wolf King GT','Wolf King GT Pro','Wolf Warrior 11','Wolf Warrior 11+'],
  'X-Scooter': ['EKAM PRO 2x2500W','Pro 1000W'],
  'Avanti': ['Aspire 1','Aspire 2','Edge','Rival 2'],
  'Azimut': ['Energy','Space','Sprint'],
  'Bergamont': ['Helix 4','Revox 4','Revox 6','Revox 8'],
  'Bianchi': ['Camaleonte 1','Sprint','Via Nirone 7'],
  'BMC': ['Fourstroke 01','Roadmachine 01','Teammachine SLR 01'],
  'Bulls': ['Copperhead EVO AM','Desert Falcon','Sonic Evo AM'],
  'Colnago': ['C68','G3-X','V3Rs'],
  'Commencal': ['Meta TR','Clash','Clash Dirt'],
  'Corso': ['ADVANCE','ALPHA','AMBER','AMG','AMG 29','ANTARES','ANTARES 29','APEX','ATLANT','ATLANT PLUS','Atlas mini','AVENTO','BLADE','BRAVE','BRAVE 29','CAMARO','Connect 20','CRANK','CYBER','DARK-X','DEX-73','DREAM','ELYSIUM','ENERGY','ENIGMA','EVOLUTION','F35','FISHER','FORTUNA','FREEDOM','GENESIS','GLOBAL','GTR-3000','HUNTER','INFINITY','INSIDER','INTEGRA','INTENSE','JUSTER','KENO','KLEO','KOMODO','KOMODO MAX','KOMODO PRO','KORD','Kord 29','KRAFT','LEADER','LEGEND','LIBERTY','LINER','MADMAX','MADMAX 29','MAGNUS','MAGNUS 29','MERCURY','MERCURY 26','MISTRAL','MONTANA','MX-5 POWER','NERO','NEW-NITRO','NEXT','NITRO','PHANTOM','POLARIS','POWERFULL','PREMIER','PROJECT','PULSAR','REND','ROCCO','ROCCO 20','ROTEX','SHADOW','Shadow 22','SHADOW PRO','SKYWALKER','SONATA','SPEEDLINE','SPIDER','SPIRIT','STELLAR','TORNADO','TRAVEL','TRUCK','ULTRA','ULTRA 26','VIOLA','VOLT BIKE','Volt Bike 26','VULCAN','X-POWER',],
  'Felt': ['Breed 30','Broam 30','Doctrine Advanced'],
  'Fuji': ['Gran Fondo 2.1','Nevada 1.9','Traverse 1.5'],
  'Intenzo': ['Carbon','Metal','Storm'],
  'Leon': ['GO Vbr 20','GO 7speed 20','HD-80 28','Junior AM DD 24','Junior DD 24','Junior Vbr 24','Super Junior 26','TN-70 29','TN-80 29','TN-90 29','TN-105 DD 29','XC 80 27.5','XC 100 27.5','XC Lady 27.5','XC-40 29',],
  'Mascotte': ['City','Cross','MTB'],
  'Mongoose': ['Dolomite Fat','Impasse Comp','Tyax Comp'],
  'Norco': ['Fluid HT 2','Optic C3','Sight C3'],
  'Nukeproof': ['Giga 275','Mega 275 Comp','Scout 275 Sport'],
  'Orbea': ['Alma M25','Gain M30i','Orca M31'],
  'Pegasus': ['Piazza E9','Premio E10','Solero E8 Plus'],
  'Pinarello': ['Dogma F','Paris','Prince'],
  'Pivot': ['Mach 4 SL','Shadowcat','Trail 429'],
  'Raleigh': ['Mustang','Pioneer','Stuntman'],
  'Ridley': ['Fenix SLiC','Kanzo Fast','Noah Fast'],
  'Rocky Mountain': ['Altitude 50','Fusion 30','Thunderbolt 30'],
  'Romet': ['R922','R926'],
  'Santa Cruz': ['Blur','Bronson C','Hightower C','Megatower'],
  'Spelli': ['SPC-4200','SPX-5200','SPX-6000'],
  'Stern': ['Advance 29','Power 26','Rocket 27.5'],
  'Stevens': ['Jura CF','Super Prestige','Tactic'],
  'Univega': ['Alpina Pro','Via Uno','Via Palermo'],
  'Wilier': ['Filante SLR','Jena','Zero SLR'],
  'Yeti': ['SB100','SB115','SB130','SB150'],
  'Lapierre': ['Overvolt AM 6.5','Overvolt HT 5.5','Overvolt Trekking 5.5'],
  'Moustache': ['Friday 27 3','Samedi 27 Trail 4','Samedi 27 Trail 8'],
  'Richbit': ['RT-011','RT-012','RT-023'],
  'Yuba': ['Boda Boda','Cargo Bike','Fastrack','Spicy Curry'],
  'Gunai': ['CX10','CX20','MX03','MX10'],
  'Hitway': ['BK5','BK11','BK15','BK22'],
  'Jasion': ['EB5 Plus','EB7'],

  'Electra': ['Electra 3000W','Electra City'],

  'Corso (scooter)': ['Hawk 1000W','Komodo 1000W','Komodo 1200W','Niro 800W','Nova 1000W','Raven 800W','SIG-8 Pro','Spider Box 1500W',],
  'Kugoo (scooter)': ['C1','C1 Pro','C3',],
  'Maxxter (scooter)': ['ANT','LUMINA','LUMINA 1500W','NEOS III','NOVA 1000W','Rock 2.0',],
  'Forte (scooter)': ['E-BIKE 500W','FLY','GP-1000-C','GP-1500-C','GRAVY','HAWK','JB-1500','LEON','LEON PRO','Lucky WS350','Lucky WS500','NIRO','R2','R3','T1','T3','Tron 800W','UNICORN EV',],
  'GIANT (scooter)': ['E-Scooter','Kids ES1','Move U8 PRO','Outlander M11',],
  'Tesla (scooter)': ['"16000" 48V','20000 NEW 2025','26000','4000 60V',],
  'Formula (ebike)': ['Acid Vbr 24','Alpina AM DD 26','BLACKWOOD 1.0 24','BLACKWOOD 26','Cherry 16','Cursor Man AM DD 28','DRAGONFLY 29','eHeavy Duty 29','eMOTION PLUS DD FR','F-1 AM DD 26','MOTION DD','MOTION DD FR','MOTION PLUS','MOTION PLUS AM DD','OMEGA 26','SLIM Vbr 18','SMART 20','SMART FRW AM 24','THOR 26','THOR 29','ZEPHYR 1.0 AM HDD','ZEPHYR 2.0','ZEPHYR 3.0 AM DD','ZEPHYR EXPERT HDD',],
  'Ninebot': ['C2 Pro E','E2 E','E3','F2 Pro E','F3 E','GT3','MAX G2 E','MAX G3','MAX G30','ZT3 Pro E',],
  'Conway': ['MT 829','Cairon S 929','WME Evo','Flux 6.0','Futura 7.0',],
  'Evil': ['Calling','Following','Insurgent','Offering','Wreckoning',],
  'Look': ['675','695','765','785','986','Geo Trekking',],
  'Polygon': ['Heist X5','Xtrada 7','Syncline 5','Premier X5','Siskiu T8',],
  'Transition': ['Patrol','Scout','Sentinel','Smuggler','Spire',],
  'Vitus': ['Energie','Escarpe','Mythique','Sommet','Zenium',],
  'Whyte': ['G-150 S','G-150 Works','G-170','T-140 S','T-130 S',],
  'Chopper': ['Chopper 2000W','Chopper 3000W','Fat Chopper 3000W',],
  'Okinawa': ['Dual','Evo','i-Praise','Lite','R30','Ridge',],

};

function _fsel(id,label,opts,req){
  return {id,label:(req?label+' *':label),type:'select',opts:['',...opts]};
}
function _finp(id,label,ph){
  return {id,label,type:'text',ph};
}
function _fnum(id,label,ph){
  return {id,label,type:'number',ph};
}

function _funit(id,label,unit,ph,req){
  return {id,label:(req?label+' *':label),type:'unit',unit,ph:ph||''};
}

var ADD_SPEC_FIELDS = window.ADD_SPEC_FIELDS || {};

function onBrandChange() {
  const sel    = document.getElementById('new-brand');
  const custom = document.getElementById('new-brand-custom');
  const modelSel = document.getElementById('new-model-select');
  const modelInp = document.getElementById('new-model');
  if (!sel) return;

  const brand = sel.value;

  if (custom) {
    if (brand === 'Інший бренд') {
      custom.style.display = '';
      custom.focus();
    } else {
      custom.style.display = 'none';
      custom.value = '';
    }
  }

  if (modelSel) {
    const models = ADD_MODELS[brand] || [];
    if (models.length) {
      modelSel.disabled = false;
      modelSel.innerHTML = '<option value="">Оберіть модель...</option>'
        + models.map(m => `<option value="${m}">${m}</option>`).join('')
        + '<option value="__other__">Інша модель...</option>';
      if (modelInp) modelInp.placeholder = 'або введіть вручну...';
    } else {
      modelSel.disabled = true;
      modelSel.innerHTML = '<option value="">— немає списку для цього бренду —</option>';
      if (modelInp) { modelInp.placeholder = 'Введіть модель вручну'; modelInp.focus(); }
    }
    if (modelInp) modelInp.value = '';
  }
}

function onModelChange() {
  const sel = document.getElementById('new-model-select');
  const inp = document.getElementById('new-model');
  if (!sel || !inp) return;
  if (sel.value === '__other__') {
    inp.value = '';
    inp.placeholder = 'Введіть свою модель...';
    inp.focus();
  } else if (sel.value) {
    inp.value = sel.value;
  }
}

function addSelectType(btn) {
  document.querySelectorAll('#add-step-1 .transport-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  addSelectedCat = btn.dataset.cat;
  addSelectedIcon = btn.dataset.icon;
}

function addGoStep(step) {

  if (step === 2 && !addSelectedCat) {
    showToast('⚠️ Оберіть тип транспорту'); return;
  }
  if (step === 3) {
    const title = document.getElementById('new-title').value.trim();
    const price = parseInt(document.getElementById('new-price').value);
    const oblast = document.getElementById('new-oblast')?.value;
    const city   = document.getElementById('new-city')?.value;
    if (!title) { showToast('⚠️ Введіть назву оголошення'); return; }
    if (!price || price < 1) { showToast('⚠️ Введіть коректну ціну'); return; }
    if (!oblast) { showToast('⚠️ Оберіть область'); return; }
    if (!city) { showToast('⚠️ Оберіть місто або село'); return; }
  }
  if (step === 4) {

    buildPreviewSummary();
  }

  [1,2,3,4].forEach(s => {
    document.getElementById('add-step-'+s).style.display = s===step ? '' : 'none';
  });

  [1,2,3,4].forEach(s => {
    const dot = document.getElementById('sdot-'+s);
    dot.classList.remove('active','done');
    if (s < step) dot.classList.add('done');
    else if (s === step) dot.classList.add('active');
    if (s < 4) {
      const line = document.getElementById('sline-'+s);
      line.classList.toggle('done', s < step);
    }
  });

  addCurrentStep = step;

  if (step === 2) {
    const bs = document.getElementById('new-brand');
    bs.innerHTML = (ADD_BRANDS[addSelectedCat] || []).map(b => `<option>${b}</option>`).join('');
    document.getElementById('add-type-badge').textContent = addSelectedIcon;
    document.getElementById('add-type-label').textContent = addSelectedCat;
  }

  if (step === 3) renderSpecFields();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderSpecFields() {
  const container = document.getElementById('add-specs-form');
  const sections = ADD_SPEC_FIELDS[addSelectedCat] || [];
  if (!sections.length) {
    container.innerHTML = '<p style="color:var(--text-muted);padding:10px">Специфічних полів для цієї категорії немає.</p>';
    return;
  }
  container.innerHTML = sections.map(sec => `
    <div class="add-spec-section">
      <div class="add-spec-section-title"><i class="fa-solid fa-chevron-right" style="font-size:10px"></i>${sec.section}</div>
      <div class="form-row" style="row-gap:16px;grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">
        ${sec.fields.map(f => `
          <div class="form-group" style="margin-bottom:0">
            <label>${f.label}</label>
            ${f.type === 'select'
              ? `<select class="form-input" id="${f.id}">${f.opts.map((o,i) => `<option value="${o}">${i===0?'Не вказано':o}</option>`).join('')}</select>`
              : f.type === 'unit'
              ? `<div style="position:relative;display:flex;align-items:center">
                   <input type="number" class="form-input" id="${f.id}" placeholder="${f.ph||''}" style="padding-right:${f.unit.length*9+16}px;-moz-appearance:textfield" min="0">
                   <span style="position:absolute;right:14px;font-size:13px;font-weight:600;color:var(--text-muted);pointer-events:none;white-space:nowrap">${f.unit}</span>
                 </div>`
              : `<input type="${f.type==='number'?'number':'text'}" class="form-input" id="${f.id}" placeholder="${f.ph||''}">`
            }
          </div>`).join('')}
      </div>
    </div>`).join('');
}

function buildPreviewSummary() {
  const title  = document.getElementById('new-title')?.value || '—';
  const price  = parseInt(document.getElementById('new-price')?.value)||0;
  const oblast = document.getElementById('new-oblast')?.value || '';
  const raion  = document.getElementById('new-raion')?.value  || '';
  const city   = document.getElementById('new-city')?.value   || '';
  const locationStr = [city, raion, oblast].filter(Boolean).join(', ') || '—';
  const cond   = document.getElementById('new-condition')?.value || '—';
  const brandRaw = document.getElementById('new-brand')?.value || '—';
  const brandCustom = document.getElementById('new-brand-custom')?.value.trim() || '';
  const brand  = brandRaw === 'Інший бренд' ? (brandCustom || 'Інший') : brandRaw;
  const modelSel = document.getElementById('new-model-select')?.value || '';
  const modelInp = document.getElementById('new-model')?.value.trim() || '';
  const model  = (modelSel && modelSel !== '__other__') ? modelSel : modelInp;
  const photos = uploadedPhotos.length;

  document.getElementById('add-preview-summary').innerHTML = [
    ['Тип', addSelectedIcon + ' ' + (addSelectedCat||'—')],
    ['Назва', title],
    ['Ціна', price ? price.toLocaleString('uk') + ' грн' : '⚠️ не вказано'],
    ['Бренд / Модель', brand + (model ? ' · ' + model : '')],
    ['Стан', cond],
    ['Місто', locationStr],
    ['Фото', photos ? photos + ' шт.' : '⚠️ фото не додано'],
  ].map(([k,v]) => `
    <div style="display:flex;gap:10px;align-items:baseline">
      <span style="color:var(--text-muted);min-width:100px;font-size:12px">${k}</span>
      <span style="font-weight:600">${v}</span>
    </div>`).join('');
}

function triggerPhotoUpload() {
  document.getElementById('photo-input').click();
}

function compressImage(file, maxWidth, maxHeight, quality) {
  return new Promise(function(resolve) {
    var reader = new FileReader();
    reader.onload = function(e) {
      var img = new Image();
      img.onload = function() {
        var canvas = document.createElement('canvas');
        var w = img.width, h = img.height;
        if (w > maxWidth)  { h = Math.round(h * maxWidth  / w); w = maxWidth; }
        if (h > maxHeight) { w = Math.round(w * maxHeight / h); h = maxHeight; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);

        var supportsWebP = canvas.toDataURL('image/webp').startsWith('data:image/webp');
        var mimeType = supportsWebP ? 'image/webp' : 'image/jpeg';
        canvas.toBlob(function(blob) { resolve(blob); }, mimeType, quality);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function handlePhotoUpload(event) {
  var files = Array.from(event.target.files);
  var remaining = 10 - uploadedPhotos.length;
  files.slice(0, remaining).forEach(function(file) {

    compressImage(file, 1600, 1600, 0.88).then(function(blob) {
      var url = URL.createObjectURL(blob);
      uploadedPhotos.push({ blob: blob, preview: url, uploaded: false, storageUrl: null });
      renderPhotoGrid();
    });
  });
  event.target.value = '';
}

function renderPhotoGrid() {
  const grid = document.getElementById('photo-grid');
  grid.innerHTML = uploadedPhotos.map(function(item, i) {
    var src = typeof item === 'string' ? item : item.preview;
    return '<div class="photo-thumb-wrap">' +
      '<img src="' + src + '" alt="Фото ' + (i+1) + '" loading="lazy" decoding="async">' +
      (i===0 ? '<div class="photo-main-badge">Головне</div>' : '') +
      '<button class="remove-photo" onclick="removePhoto(' + i + ')">×</button>' +
      '</div>';
  }).join('');
  document.getElementById('upload-trigger').style.display = uploadedPhotos.length >= 10 ? 'none' : '';
}

function removePhoto(i) {
  uploadedPhotos.splice(i, 1);
  renderPhotoGrid();
}

function toggleContact(type, el) {
  el.classList.toggle('active');
}

function collectSpecs() {
  const sections = ADD_SPEC_FIELDS[addSelectedCat] || [];
  const result = {};
  const allFields = sections.flatMap(s => s.fields);
  const sectionMap = {};
  sections.forEach(s => {
    const key = s.section.replace(/^[^\s]+ /,'').toLowerCase().replace(/[^а-яa-z]/g,'').slice(0,8);
    s.fields.forEach(f => sectionMap[f.id] = key);
  });

  sections.forEach(s => {
    const sKey = s.section;
    s.fields.forEach(f => {
      const el = document.getElementById(f.id);
      if (el && el.value && el.value !== 'Не вказано') {
        if (!result[sKey]) result[sKey] = [];
        result[sKey].push([f.label.replace(' *',''), el.value]);
      }
    });
  });
  return result;
}

function doLogin() {
  var email = document.getElementById('login-email').value.trim();
  var pass  = document.getElementById('login-pass').value;
  if (!email) { showToast('⚠️ Введіть email'); return; }
  if (!pass)  { showToast('⚠️ Введіть пароль'); return; }
  if (window._auth) {
    window._auth.signInWithEmailAndPassword(email, pass)
      .then(function() { showToast('✅ Вхід успішний!'); showPage('profile'); })
      .catch(function(e) {
        if (e.code === 'auth/too-many-requests') showToast('⚠️ Забагато спроб. Зачекайте');
        else showToast('⚠️ Невірний email або пароль');
      });
  }
}
function doSocialLogin(provider) {
  if (provider === 'Google' && window._auth) {
    var gProvider = new firebase.auth.GoogleAuthProvider();
    gProvider.setCustomParameters({ prompt: 'select_account' });
    window._auth.signInWithPopup(gProvider)
      .then(function(result) {
        var user = result.user;
        isLoggedIn = true;

        currentUser = currentUser || {};
        currentUser.uid     = user.uid;
        currentUser.email   = user.email;
        currentUser.name    = user.displayName || user.email.split('@')[0];
        currentUser.initial = currentUser.name[0].toUpperCase();

        window._db.collection('users').doc(user.uid).get().then(function(snap) {
          if (snap.exists) {
            var d = snap.data();
            currentUser.name    = d.name || currentUser.name;
            currentUser.initial = currentUser.name[0].toUpperCase();
            currentUser.type    = d.type || 'personal';
          } else {
            window._db.collection('users').doc(user.uid).set({
              name: user.displayName, email: user.email, uid: user.uid,
              type: 'personal', listings: 0, status: 'active',
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
          }
          showToast('✅ Вхід через Google!');
          showPage('profile');
        }).catch(function() {
          showToast('✅ Вхід через Google!');
          showPage('profile');
        });
      })
      .catch(function(e) {
        if (e.code === 'auth/popup-blocked') {
          showToast('⚠️ Дозвольте popup для цього сайту і спробуйте знову');
        } else if (e.code !== 'auth/popup-closed-by-user') {
          showToast('⚠️ ' + e.message);
        }
      });
  } else {
    showToast('⚠️ Поки підтримується тільки Google');
  }
}
function doLogout() {
  if (window._auth) {
    if (typeof _chatsUnsubscribe === 'function') { _chatsUnsubscribe(); window._chatsUnsubscribe = null; }
    if (typeof _chatUnsubscribe  === 'function') { _chatUnsubscribe();  _chatUnsubscribe = null; }
    window._auth.signOut().then(function() {
      isLoggedIn  = false;
      myListings  = [];
      _fbChats    = [];
      currentUser = { name:'', email:'', initial:'' };
      if (typeof renderProfile    === 'function') renderProfile();
      if (typeof renderChats      === 'function') renderChats();
      if (typeof _updateChatBadge === 'function') _updateChatBadge();
      showToast('До побачення!');
      showPage('home');
    });
  }
}
function showRegister() {
  document.getElementById('auth-form-title').textContent = 'Реєстрація';
  document.getElementById('auth-form-sub').textContent = 'Приєднуйтесь до RideGO!';
  document.getElementById('auth-form-body').innerHTML = `
    <div class="form-group"><label>Ім'я</label><input type="text" class="form-input" id="reg-name" placeholder="Ваше ім'я"></div>
    <div class="form-group"><label>Email</label><input type="email" class="form-input" id="reg-email" placeholder="your@email.com"></div>
    <div class="form-group"><label>Пароль</label><input type="password" class="form-input" id="reg-pass" placeholder="Мін. 8 символів"></div>
    <button class="btn-primary" style="width:100%;padding:14px;font-size:15px;margin-top:8px" onclick="doRegister()">Зареєструватись</button>
  `;
  document.querySelector('.auth-switch').innerHTML = 'Вже є акаунт? <a onclick="resetAuthForm()">Увійти</a>';
}
function resetAuthForm() { showPage('profile'); }
function doRegister() {
  var name  = (document.getElementById('reg-name')  || {}).value || '';
  var email = (document.getElementById('reg-email') || {}).value || '';
  var pass  = (document.getElementById('reg-pass')  || {}).value || '';
  name = name.trim(); email = email.trim();
  if (!name)  { showToast('⚠️ Введіть ім’я'); return; }
  if (!email) { showToast('⚠️ Введіть email'); return; }
  if (pass.length < 6) { showToast('⚠️ Пароль мінімум 6 символів'); return; }
  if (window._auth) {
    window._auth.createUserWithEmailAndPassword(email, pass)
      .then(function(cred) {
        return cred.user.updateProfile({displayName: name}).then(function() {
          return window._db.collection('users').doc(cred.user.uid).set({
            name: name, email: email, uid: cred.user.uid,
            type: 'personal', listings: 0, status: 'active',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        });
      })
      .then(function() { showToast('✅ Акаунт створено!'); showPage('profile'); })
      .catch(function(e) {
        if (e.code === 'auth/email-already-in-use') showToast('⚠️ Цей email вже використовується');
        else if (e.code === 'auth/weak-password') showToast('⚠️ Пароль мінімум 6 символів');
        else showToast('⚠️ ' + e.message);
      });
  }
}

let profileType = 'personal';
let profilePhotoUrl = null;

function renderProfile() {
  const authLoading = document.getElementById('auth-loading');
  const authWall    = document.getElementById('auth-wall');
  const profileWall = document.getElementById('profile-wall');

  if (authLoading) authLoading.style.display = 'none';
  if (!isLoggedIn) {
    authWall.style.display = '';
    profileWall.style.display = 'none';
    return;
  }
  authWall.style.display = 'none';
  profileWall.style.display = '';

  const displayName = currentUser.name || currentUser.email || 'Користувач';
  const displayInitial = displayName[0].toUpperCase();
  document.getElementById('profile-name-text').textContent = displayName;
  const letterEl = document.getElementById('profile-pic-letter');
  if (letterEl) letterEl.textContent = displayInitial;
  const settingsLetterEl = document.getElementById('settings-avatar-letter');
  if (settingsLetterEl) settingsLetterEl.textContent = currentUser.initial;

  document.getElementById('pstat-active').textContent = myListings.length;
  document.getElementById('pstat-sold').textContent   = 0;
  document.getElementById('pstat-favs').textContent   = favorites.length;

  var metaEl = document.getElementById('profile-meta-text');
  if (metaEl && window._db && currentUser && currentUser.uid) {
    window._db.collection('users').doc(currentUser.uid).get().then(function(snap) {
      if (!snap.exists) return;
      var d = snap.data();
      var year = d.createdAt ? new Date(d.createdAt.seconds * 1000).getFullYear() : new Date().getFullYear();

      window._db.collection('reviews').where('sellerUid','==',currentUser.uid).get()
        .then(function(revSnap) {
          var revs = revSnap.docs.map(function(r){ return r.data(); });
          var avg = revs.length ? (revs.reduce(function(s,r){ return s+r.rating; },0) / revs.length).toFixed(1) : null;
          var ratingHtml = avg
            ? '<i class="fa-solid fa-star" style="color:#ffa726;margin-right:3px"></i>' + avg + ' · '
            : '';
          metaEl.innerHTML = ratingHtml + 'На сайті з ' + year;
        }).catch(function() {
          metaEl.innerHTML = 'На сайті з ' + year;
        });

      var fill = function(id, val) {
        var el = document.getElementById(id);
        if (el && val) el.value = val;
      };
      fill('set-name',      d.name);
      fill('set-phone',     d.phone);
      fill('set-telegram',  d.telegram);
      fill('set-instagram', d.instagram);
      fill('set-youtube',   d.youtube);
      fill('set-tiktok',    d.tiktok);
      fill('set-website',   d.website);
      fill('set-company',   d.company);
      fill('set-address',   d.address);
      fill('set-hours',     d.hours);
      fill('set-about',     d.about || d.desc);

      if (typeof _checkPhoneVerified === 'function') _checkPhoneVerified(d);

      if (d.cats && d.cats.length && typeof _fillProfileCats === 'function') {
        _fillProfileCats(d.cats);
      }

      if (d.photoUrl && !profilePhotoUrl) {
        profilePhotoUrl = d.photoUrl;
        ['profile-pic-el', 'settings-avatar-preview'].forEach(function(id) {
          var el = document.getElementById(id);
          if (el) el.innerHTML = '<img src="' + d.photoUrl + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%">';
        });
        var letterEl = document.getElementById('profile-pic-letter');
        if (letterEl) letterEl.style.display = 'none';
      }
    }).catch(function(){});
  }

  const nameEl  = document.getElementById('set-name');
  const emailEl = document.getElementById('set-email');
  if (nameEl && !nameEl.value)  nameEl.value  = currentUser.name;
  if (emailEl && !emailEl.value) emailEl.value = currentUser.email || '';

  initSettingsOblast();

  renderMyListings();
  renderFavs();
}

function initSettingsOblast() {
  const sel = document.getElementById('set-oblast');
  if (!sel || sel.options.length > 1) return;
  Object.keys(UA_GEO).sort((a,b) => a.localeCompare(b,'uk')).forEach(name => {
    const o = document.createElement('option');
    o.value = name; o.textContent = name;
    sel.appendChild(o);
  });
}

function onSettingsOblastChange() {
  const oblast  = document.getElementById('set-oblast').value;
  const citySel = document.getElementById('set-city');
  citySel.innerHTML = '<option value="">Оберіть місто / село...</option>';
  citySel.disabled  = !oblast;
  if (!oblast) return;

  const _cityOblasts3 = {'Місто Київ': 'Київ', 'Місто Севастополь': 'Севастополь'};
  if (_cityOblasts3[oblast]) {
    citySel.innerHTML = '<option value="' + _cityOblasts3[oblast] + '">' + _cityOblasts3[oblast] + '</option>';
    citySel.disabled = false;
    citySel.value = _cityOblasts3[oblast];
    return;
  }
  const raions = UA_GEO[oblast]?.raions || {};
  const cities = [...new Set(Object.values(raions).flatMap(r => r.cities))].sort((a,b) => a.localeCompare(b,'uk'));
  cities.forEach(c => {
    const o = document.createElement('option');
    o.value = c; o.textContent = c;
    citySel.appendChild(o);
  });
  citySel.disabled = false;
}

function selectProfileType(type) {
  profileType = type;
  document.getElementById('type-card-personal').classList.toggle('active', type === 'personal');
  document.getElementById('type-card-business').classList.toggle('active', type === 'business');
  document.getElementById('settings-business-block').style.display = type === 'business' ? '' : 'none';

  const badge = document.getElementById('profile-type-badge-el');
  if (badge) {
    badge.className = `profile-type-badge ${type}`;
    badge.innerHTML = type === 'business'
      ? '<i class="fa-solid fa-store"></i> Магазин'
      : '<i class="fa-solid fa-user"></i> Фізособа';
  }
}

function onProfilePhotoChange(input) {
  var file = input.files[0];
  if (!file) return;
  showToast('📸 Завантаження фото...');
  compressImage(file, 400, 400, 0.85).then(function(blob) {

    var localUrl = URL.createObjectURL(blob);
    ['profile-pic-el','settings-avatar-preview'].forEach(function(id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.innerHTML = '<img src="' + localUrl + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%">';
    });

    var fd = new FormData();
    fd.append('file', blob, 'avatar.jpg');
    fd.append('upload_preset', 'ridego_unsigned');
    fd.append('folder', 'avatars');
    fetch('https://api.cloudinary.com/v1_1/dxgtpo5dq/image/upload', {
      method: 'POST', body: fd
    }).then(function(r){ return r.json(); })
    .then(function(data) {
      if (data.secure_url) {
        profilePhotoUrl = data.secure_url;

        ['profile-pic-el','settings-avatar-preview'].forEach(function(id) {
          var el = document.getElementById(id);
          if (!el) return;
          el.innerHTML = '<img src="' + profilePhotoUrl + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%">';
        });

        if (window._db && currentUser && currentUser.uid) {
          window._db.collection('users').doc(currentUser.uid).update({
            photoUrl: profilePhotoUrl
          }).catch(function(e){ console.error('photo save:', e); });
        }
        showToast('✅ Фото оновлено!');
      } else {
        showToast('⚠️ Помилка завантаження фото');
      }
    }).catch(function(e){
      console.error('photo upload:', e);
      showToast('⚠️ Помилка завантаження фото');
    });
  });
}

function saveProfileSettings() {
  const name     = document.getElementById('set-name')?.value.trim();
  const email    = document.getElementById('set-email')?.value.trim();
  const phone    = document.getElementById('set-phone')?.value.trim();
  const oblast   = document.getElementById('set-oblast')?.value;
  const city     = document.getElementById('set-city')?.value;
  const pass     = document.getElementById('set-pass')?.value;
  const pass2    = document.getElementById('set-pass2')?.value;

  const telegram  = document.getElementById('set-telegram')?.value.trim();
  const instagram = document.getElementById('set-instagram')?.value.trim();
  const youtube   = document.getElementById('set-youtube')?.value.trim();
  const tiktok    = document.getElementById('set-tiktok')?.value.trim();

  const website  = document.getElementById('set-website')?.value.trim();
  const company  = document.getElementById('set-company')?.value.trim();
  const address  = document.getElementById('set-address')?.value.trim();
  const hours    = document.getElementById('set-hours')?.value.trim();
  const about    = document.getElementById('set-about')?.value.trim();

  var catsRaw = document.getElementById('set-cats-value')?.value;
  var profileCats = [];
  try { profileCats = catsRaw ? JSON.parse(catsRaw) : []; } catch(e) {}

  if (!name) { showToast("⚠️ Введіть ваше ім'я"); return; }
  if (pass && pass !== pass2) { showToast('⚠️ Паролі не збігаються'); return; }

  currentUser.name    = name;
  currentUser.email   = email;
  currentUser.initial = name.trim()[0]?.toUpperCase() || 'A';
  if (city) currentUser.city = city;
  if (phone) currentUser.phone = phone;

  document.getElementById('profile-name-text').textContent = name;
  const loc = [city, oblast].filter(Boolean).join(', ');
  if (loc) {
    document.getElementById('profile-meta-text').innerHTML =
      `<i class="fa-solid fa-location-dot" style="color:var(--brand);margin-right:4px"></i>${loc}`;
  }
  if (!profilePhotoUrl) {
    const l = document.getElementById('profile-pic-letter');
    if (l) l.textContent = currentUser.initial;
  }

  try { localStorage.setItem('eria-profile', JSON.stringify({ name, email, phone, city, oblast, profileType, profilePhotoUrl })); } catch(e) {}

  if (window._db && currentUser && currentUser.uid) {
    var profileData = {
      name:      name,
      email:     email || '',
      phone:     phone || '',
      city:      city || '',
      oblast:    oblast || '',
      type:      profileType || 'personal',
      telegram:  telegram || '',
      instagram: instagram || '',
      youtube:   youtube || '',
      tiktok:    tiktok || '',
      website:   website || '',
      company:   company || '',
      address:   address || '',
      hours:     hours || '',
      about:     about || '',
      desc:      about || '',
      cats:      profileCats,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    window._db.collection('users').doc(currentUser.uid).update(profileData)
      .then(function(){ showToast('✅ Профіль збережено!'); })
      .catch(function(e){ console.error('profile save:', e); showToast('⚠️ Помилка: ' + e.message); });

    window._db.collection('listings')
      .where('uid', '==', currentUser.uid)
      .get()
      .then(function(snap) {
        if (snap.empty) return;
        var batch = window._db.batch();
        snap.docs.forEach(function(doc) {
          batch.update(doc.ref, { sellerName: name, seller: name });
        });
        return batch.commit();
      })
      .then(function() {
        _fbListings.forEach(function(l) {
          if (l && l.uid === currentUser.uid) { l.sellerName = name; l.seller = name; }
        });
        renderHomeListings();
      })
      .catch(function(e){ console.log('batch sellerName:', e.message); });
  }

  switchPTab('my', document.querySelector('.ptab'));
}

function loadSavedProfile() {
  try {
    const saved = JSON.parse(localStorage.getItem('eria-profile') || 'null');
    if (!saved) return;
    if (saved.name)          currentUser.name    = saved.name;
    if (saved.email)         currentUser.email   = saved.email;
    if (saved.name)          currentUser.initial = saved.name[0]?.toUpperCase() || 'A';
    if (saved.profileType)   selectProfileType(saved.profileType);
    if (saved.profilePhotoUrl) {
      profilePhotoUrl = saved.profilePhotoUrl;
    }

    setTimeout(() => {
      const n = document.getElementById('set-name'); if(n) n.value = saved.name || '';
      const e = document.getElementById('set-email'); if(e) e.value = saved.email || '';
      const p = document.getElementById('set-phone'); if(p) p.value = saved.phone || '';
    }, 200);
  } catch(e) {}
}

function switchPTab(tab, btn) {
  ['my','favs','settings','myservice','history'].forEach(t => {
    var el = document.getElementById('ptab-'+t);
    if (el) el.style.display = t===tab ? '' : 'none';
  });
  document.querySelectorAll('.ptab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  if (tab === 'favs')      renderFavs();
  if (tab === 'settings')  initSettingsOblast();
  if (tab === 'myservice') renderMyServiceTab();
  if (tab === 'history')   renderViewHistory();
}

var HISTORY_KEY = 'ridego_view_history';
var HISTORY_MAX = 20;

function _addToHistory(id) {
  if (!id) return;
  try {
    var hist = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    hist = hist.filter(function(i){ return i !== id; });
    hist.unshift(id);
    if (hist.length > HISTORY_MAX) hist = hist.slice(0, HISTORY_MAX);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(hist));
  } catch(e) {}
}

function renderViewHistory() {
  var grid  = document.getElementById('history-grid');
  var empty = document.getElementById('history-empty');
  if (!grid) return;
  try {
    var hist = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    var listings = hist.map(function(id) {
      return _allListings().find(function(l){ return l && l.id === id; });
    }).filter(Boolean);
    if (!listings.length) {
      grid.innerHTML = ''; empty.style.display = '';
    } else {
      empty.style.display = 'none';
      grid.innerHTML = listings.map(function(l){ return createCard(l,'profile'); }).join('');
    }
  } catch(e) { grid.innerHTML = ''; empty.style.display = ''; }
}

function clearViewHistory() {
  try { localStorage.removeItem(HISTORY_KEY); } catch(e) {}
  renderViewHistory();
  showToast('\u2705 \u0406\u0441\u0442\u043e\u0440\u0456\u044e \u043e\u0447\u0438\u0449\u0435\u043d\u043e');
}

var PRICE_WATCH_KEY = 'ridego_price_watch';

function _trackFavPrices() {

  if (!favorites.length) return;
  try {
    var priceMap = {};
    favorites.forEach(function(id) {
      var l = _allListings().find(function(x){ return x && x.id === id; });
      if (l && l.price) priceMap[id] = l.price;
    });
    var existing = JSON.parse(localStorage.getItem(PRICE_WATCH_KEY) || '{}');

    Object.keys(priceMap).forEach(function(id) {
      var oldPrice = existing[id];
      var newPrice = priceMap[id];
      if (oldPrice && newPrice < oldPrice) {
        var l = _allListings().find(function(x){ return x && x.id === id; });
        var diff = oldPrice - newPrice;
        var pct  = Math.round(diff / oldPrice * 100);
        _showPriceDropToast(l, diff, pct);
      }
    });

    Object.assign(existing, priceMap);
    localStorage.setItem(PRICE_WATCH_KEY, JSON.stringify(existing));
  } catch(e) {}
}

function _showPriceDropToast(l, diff, pct) {
  if (!l) return;

  if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.hidden) {
    try {
      var n = new Notification('\uD83D\uDCB8 \u0426\u0456\u043d\u0430 \u0437\u043d\u0438\u0437\u0438\u043b\u0430\u0441\u044c \u043d\u0430 ' + pct + '%! \u2014 RideGO', {
        body: l.title + '\n-' + diff.toLocaleString('uk') + ' \u0433\u0440\u043d',
        icon: '/favicon.svg',
        tag: 'price-drop-' + l.id
      });
      n.onclick = function() { window.focus(); showDetail(l.id); n.close(); };
    } catch(e) {}
  }

  var toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;bottom:80px;left:20px;z-index:9999;background:var(--card-bg);'
    + 'border:1px solid #16a34a;border-radius:16px;padding:14px 18px;max-width:300px;'
    + 'box-shadow:0 8px 32px rgba(22,163,74,.25);display:flex;align-items:center;gap:12px;'
    + 'cursor:pointer;animation:_slideInL .3s ease;transition:opacity .3s';
  toast.onclick = function() { showDetail(l.id); toast.style.opacity='0'; setTimeout(function(){ toast.remove(); },300); };
  toast.innerHTML = '<div style="font-size:28px">\uD83D\uDCB8</div>'
    + '<div><div style="font-weight:700;font-size:13px;margin-bottom:2px">\u0426\u0456\u043d\u0430 \u0437\u043d\u0438\u0437\u0438\u043b\u0430\u0441\u044c \u043d\u0430 ' + pct + '%!</div>'
    + '<div style="font-size:12px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px">' + _esc(l.title) + '</div>'
    + '<div style="font-size:12px;color:#16a34a;font-weight:700">-' + diff.toLocaleString('uk') + ' \u0433\u0440\u043d</div></div>';
  document.body.appendChild(toast);
  var style = document.createElement('style');
  style.textContent = '@keyframes _slideInL{from{transform:translateX(-110%);opacity:0}to{transform:translateX(0);opacity:1}}';
  document.head.appendChild(style);
  setTimeout(function() { toast.style.opacity='0'; setTimeout(function(){ toast.remove(); },300); }, 6000);
}

var _userCoords = null;

function filterByLocation() {
  if (!navigator.geolocation) {
    showToast('\u26a0\ufe0f \u0413\u0435\u043e\u043b\u043e\u043a\u0430\u0446\u0456\u044f \u043d\u0435 \u043f\u0456\u0434\u0442\u0440\u0438\u043c\u0443\u0454\u0442\u044c\u0441\u044f \u0432\u0430\u0448\u0438\u043c \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u043e\u043c');
    return;
  }
  var btn = document.getElementById('geo-filter-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> \u0412\u0438\u0437\u043d\u0430\u0447\u0435\u043d\u043d\u044f...'; }

  navigator.geolocation.getCurrentPosition(function(pos) {
    _userCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i> \u041f\u043e\u0440\u044f\u0434 \u0437\u0456 \u043c\u043d\u043e\u044e'; btn.style.background = 'var(--brand)'; btn.style.color = '#000'; }

    fetch('https://nominatim.openstreetmap.org/reverse?format=json&lat=' + _userCoords.lat + '&lon=' + _userCoords.lng + '&accept-language=uk')
      .then(function(r){ return r.json(); })
      .then(function(data) {
        var city = data.address && (data.address.city || data.address.town || data.address.village || data.address.hamlet);
        if (city) {
          showToast('\uD83D\uDCCD \u0412\u0438\u0437\u043d\u0430\u0447\u0435\u043d\u043e: ' + city);

          _renderNearbyListings(city);
        } else {
          _renderNearbyListingsCoords();
        }
      }).catch(function() { _renderNearbyListingsCoords(); });
  }, function(err) {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i> \u041f\u043e\u0440\u044f\u0434 \u0437\u0456 \u043c\u043d\u043e\u044e'; }
    var msg = err.code === 1 ? '\u0414\u043e\u0437\u0432\u0456\u043b \u043d\u0430 \u0433\u0435\u043e\u043b\u043e\u043a\u0430\u0446\u0456\u044e \u0437\u0430\u0431\u043e\u0440\u043e\u043d\u0435\u043d\u043e' : '\u041d\u0435 \u0432\u0434\u0430\u043b\u043e\u0441\u044c \u0432\u0438\u0437\u043d\u0430\u0447\u0438\u0442\u0438 \u043c\u0456\u0441\u0446\u0435\u0437\u043d\u0430\u0445\u043e\u0434\u0436\u0435\u043d\u043d\u044f';
    showToast('\u26a0\ufe0f ' + msg);
  }, { timeout: 8000, maximumAge: 300000 });
}

function _renderNearbyListings(city) {

  var nearby = _allListings().filter(function(l) {
    return l && l.status !== 'deleted' && l.status !== 'sold' && l.city &&
      l.city.toLowerCase().includes(city.toLowerCase().slice(0, 4));
  });
  if (!nearby.length) {
    showToast('\u041e\u0433\u043e\u043b\u043e\u0448\u0435\u043d\u044c \u0443 ' + city + ' \u043d\u0435 \u0437\u043d\u0430\u0439\u0434\u0435\u043d\u043e \u2014 \u043f\u043e\u043a\u0430\u0437\u0443\u044e \u0432\u0441\u0456');
    return;
  }
  showPage('catalog');
  var grid = document.getElementById('catalog-listings');
  var wrap = document.getElementById('catalog-results-wrap');
  var numEl = document.getElementById('results-num');
  var lblEl = document.getElementById('results-cat-label');
  if (wrap) wrap.style.display = '';
  if (numEl) numEl.textContent = nearby.length;
  if (lblEl) lblEl.innerHTML = '\uD83D\uDCCD \u041f\u043e\u0440\u044f\u0434 \u0437 \u0432\u0430\u043c\u0438: <b>' + city + '</b>';
  if (grid) grid.innerHTML = nearby.map(function(l){ return createCard(l,'catalog'); }).join('');

  var topSec = document.getElementById('catalog-top-section');
  if (topSec) topSec.style.display = 'none';
  var allLbl = document.getElementById('catalog-all-label');
  if (allLbl) allLbl.style.display = 'none';
  showToast('\uD83D\uDCCD \u0417\u043d\u0430\u0439\u0434\u0435\u043d\u043e ' + nearby.length + ' \u043e\u0433\u043e\u043b\u043e\u0448\u0435\u043d\u044c \u0443 ' + city);
}

function _renderNearbyListingsCoords() {

  showToast('\uD83D\uDCCD \u041c\u0456\u0441\u0446\u0435\u0437\u043d\u0430\u0445\u043e\u0434\u0436\u0435\u043d\u043d\u044f \u0432\u0438\u0437\u043d\u0430\u0447\u0435\u043d\u043e, \u0430\u043b\u0435 \u043c\u0456\u0441\u0442\u043e \u043d\u0435 \u0440\u043e\u0437\u043f\u0456\u0437\u043d\u0430\u043d\u043e');
}

function renderFavs() {
  const grid  = document.getElementById('favs-grid');
  const empty = document.getElementById('favs-empty');
  const favData = _allListings().filter(l => favorites.includes(l.id));
  if (!favData.length) { grid.innerHTML=''; empty.style.display=''; return; }
  empty.style.display = 'none';
  grid.innerHTML = favData.map(l => createCard(l,'profile')).join('');
}

var _activeChatId = null;
var _chatUnsubscribe = null;

function renderChats() {
  var list = document.getElementById('chat-list');
  if (!list) return;

  if (!window._authInitialized) {
    list.innerHTML = '<div style="padding:16px;display:flex;flex-direction:column;gap:12px">'
      + [1,2,3].map(function() {
          return '<div style="display:flex;gap:12px;align-items:center">'
            + '<div class="skeleton" style="width:44px;height:44px;border-radius:50%;flex-shrink:0"></div>'
            + '<div style="flex:1;display:flex;flex-direction:column;gap:8px">'
            + '<div class="skeleton" style="height:13px;width:55%;border-radius:4px"></div>'
            + '<div class="skeleton" style="height:11px;width:80%;border-radius:4px"></div>'
            + '</div></div>';
        }).join('')
      + '</div>';
    return;
  }
  if (!isLoggedIn) {
    list.innerHTML = '<div style="text-align:center;padding:48px 24px;color:var(--text-muted)">'
      + '<i class="fa-solid fa-lock" style="font-size:36px;display:block;margin-bottom:16px;color:var(--brand)"></i>'
      + '<div style="font-size:16px;font-weight:700;margin-bottom:8px;color:var(--text)">Вхід для повідомлень</div>'
      + '<p style="margin-bottom:20px;font-size:14px">Увійдіть в акаунт щоб переглянути та відправляти повідомлення</p>'
      + '<button class="btn-primary" onclick="showPage(\'profile\')" style="padding:11px 28px">'
      + '<i class="fa-solid fa-user" style="margin-right:8px"></i>Увійти</button>'
      + '</div>';

    var inp = document.getElementById('chat-input');
    var sendBtn = document.querySelector('.send-btn');
    if (inp) { inp.disabled = true; inp.placeholder = 'Увійдіть щоб писати...'; }
    if (sendBtn) sendBtn.disabled = true;
    return;
  }

  var inp2 = document.getElementById('chat-input');
  var sendBtn2 = document.querySelector('.send-btn');
  if (inp2) { inp2.disabled = false; inp2.placeholder = 'Написати повідомлення...'; }
  if (sendBtn2) sendBtn2.disabled = false;
  if (!_fbChats.length) {
    list.innerHTML = '<div style="text-align:center;padding:32px;color:var(--text-muted)"><i class="fa-regular fa-comment-dots" style="font-size:32px;display:block;margin-bottom:12px"></i>Повідомлень поки немає</div>';
    return;
  }
  list.innerHTML = _fbChats.map(function(c) {
    var otherId = c.participants ? c.participants.find(function(p){ return p !== currentUser.uid; }) : null;
    var name = c.otherName || (otherId && c[otherId+'_name']) || 'Користувач';
    var lastMsg = c.lastMessage || '';
    var lastTime = c.lastMessageAt ? _formatChatTime(c.lastMessageAt.seconds) : '';
    var initial = (name[0] || '?').toUpperCase();
    var isActive = _activeChatId === c.id;
    var listingTag = c.listingTitle
      ? '<div style="font-size:10px;color:var(--brand);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><i class="fa-solid fa-tag" style="font-size:9px;margin-right:3px"></i>' + _esc(c.listingTitle) + '</div>'
      : '';
    var unreadDot = (c.unread && c.unread > 0 && !isActive)
      ? '<span style="width:8px;height:8px;border-radius:50%;background:var(--brand);flex-shrink:0"></span>' : '';
    return '<div class="chat-item ' + (isActive ? 'active' : '') + '" onclick="openChatById(this.dataset.id)" data-id="' + c.id + '">'
      + '<div class="chat-avatar" style="cursor:pointer" onclick="event.stopPropagation();' + (otherId ? 'showSellerByUid(\''+otherId+'\')' : '') + '">' + initial + '</div>'
      + '<div style="flex:1;min-width:0">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;gap:6px">'
      + '<div class="chat-name">' + _esc(name) + '</div>'
      + '<div style="display:flex;align-items:center;gap:5px;flex-shrink:0">' + unreadDot + '<div class="chat-time">' + lastTime + '</div></div>'
      + '</div>'
      + listingTag
      + '<div class="chat-last" style="margin-top:3px">' + _esc(lastMsg) + '</div>'
      + '</div></div>';
  }).join('');
}

function _formatChatTime(seconds) {
  if (!seconds) return '';
  var d = new Date(seconds * 1000);
  var now = new Date();
  var diff = now - d;
  if (diff < 86400000 && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString('uk-UA', {hour:'2-digit', minute:'2-digit'});
  }
  return d.toLocaleDateString('uk-UA', {day:'numeric', month:'short'});
}

function openChatById(chatId) {
  if (!chatId || !isLoggedIn) return;
  _activeChatId = chatId;
  var c = _fbChats.find(function(x){ return x.id === chatId; });

  var otherId = c && c.participants ? c.participants.find(function(p){ return p !== currentUser.uid; }) : null;
  var name = (c && c.otherName) || (c && c[otherId + '_name']) || 'Користувач';
  var sub  = (c && c.listingTitle) ? 'Оголошення: ' + c.listingTitle : '';

  var headerName = document.getElementById('chat-header-name');
  var headerSub  = document.getElementById('chat-header-sub');
  var headerAva  = document.getElementById('chat-header-avatar');

  if (headerName) {
    if (otherId) {
      headerName.innerHTML = '<span style="cursor:pointer;text-decoration:underline;text-decoration-color:var(--brand)" onclick="showSellerByUid(\''+otherId+'\')">' + _esc(name) + '</span>';
    } else {
      headerName.textContent = name;
    }
  }

  if (headerSub) {
    if (c && c.listingId) {
      headerSub.innerHTML = '<span style="cursor:pointer;color:var(--brand)" onclick="showDetail(\''+c.listingId+'\')">'
        + '<i class="fa-solid fa-tag" style="margin-right:4px;font-size:10px"></i>' + _esc(c.listingTitle || 'Оголошення') + '</span>';
    } else {
      headerSub.textContent = sub || '';
    }
  }
  if (headerAva) headerAva.textContent = (name[0] || '?').toUpperCase();

  var layout = document.querySelector('.messages-layout');
  if (layout && window.innerWidth <= 700) {
    layout.classList.add('chat-open');
  }

  if (window._db && currentUser && currentUser.uid) {
    var resetUpd = {};
    resetUpd['unread_' + currentUser.uid] = 0;
    window._db.collection('chats').doc(chatId).update(resetUpd).catch(function(){});
    if (c) { c['unread_' + currentUser.uid] = 0; c.unread = 0; }
    _updateChatBadge();
  }

  var area = document.getElementById('messages-area');
  if (area) area.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted)">Завантаження...</div>';

  if (_chatUnsubscribe) { _chatUnsubscribe(); _chatUnsubscribe = null; }

  if (window._rtdb) {
    var msgsRef = window._rtdb.ref('chats/' + chatId + '/messages');
    var _rtdbCallback = msgsRef.on('value', function(snap) {
      var msgs = [];
      if (snap && snap.forEach) {
        snap.forEach(function(child) { msgs.push(child.val()); });
      }
      _renderMessages(msgs, c);
    });
    _chatUnsubscribe = function() { msgsRef.off('value', _rtdbCallback); };
  } else if (window._db) {
    _chatUnsubscribe = window._db.collection('chats').doc(chatId)
      .collection('messages').onSnapshot(function(snap) {
        var msgs = snap.docs.map(function(d){ return d.data(); });
        msgs.sort(function(a,b){ return (a.createdAt||0)-(b.createdAt||0); });
        _renderMessages(msgs, c);
      });
  }

  renderChats();
}

function _renderMessages(msgs, chat) {
  var area = document.getElementById('messages-area');
  if (!area) return;

  var html = '';

  if (chat && chat.listingId && chat.listingTitle) {
    var listing = _allListings().find(function(l){ return l && l.id === chat.listingId; });
    var imgHtml = listing && listing.photos && listing.photos[0]
      ? '<img src="' + listing.photos[0] + '" style="width:56px;height:56px;object-fit:cover;border-radius:8px;flex-shrink:0">'
      : '<div style="width:56px;height:56px;background:var(--dark3);border-radius:8px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:22px">🛵</div>';
    var priceHtml = listing ? '<div style="color:var(--brand);font-weight:700;font-size:15px">' + listing.price.toLocaleString('uk') + ' грн</div>' : '';
    html += '<div style="margin-bottom:12px;display:flex;justify-content:center">'
      + '<div onclick="showDetail(\''+chat.listingId+'\')" style="cursor:pointer;display:flex;align-items:center;gap:12px;background:var(--card-bg);border:1px solid var(--border);border-radius:14px;padding:12px 16px;max-width:320px;width:100%;transition:box-shadow .2s" onmouseover="this.style.boxShadow=\'0 4px 16px rgba(0,200,83,.15)\'" onmouseout="this.style.boxShadow=\'none\'">'
      + imgHtml
      + '<div style="min-width:0">'
      + '<div style="font-size:11px;color:var(--text-muted);margin-bottom:2px">Оголошення</div>'
      + '<div style="font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + _esc(chat.listingTitle) + '</div>'
      + priceHtml
      + '</div>'
      + '<i class="fa-solid fa-arrow-right" style="color:var(--brand);font-size:12px;flex-shrink:0;margin-left:auto"></i>'
      + '</div></div>';
  }

  if (!msgs.length) {
    html += '<div style="text-align:center;padding:24px;color:var(--text-muted)">Напишіть перше повідомлення!</div>';
    area.innerHTML = html;
    return;
  }

  html += msgs.map(function(m) {

    var myUid = currentUser && currentUser.uid;
    var mine = myUid && m.senderUid && m.senderUid === myUid;

    if (!mine && !m.senderUid && myUid && m.senderName) {
      mine = m.senderName === (currentUser.name || currentUser.email);
    }

    var time = m.createdAt ? _formatChatTime(typeof m.createdAt === 'object' ? m.createdAt.seconds : m.createdAt/1000) : '';
    return '<div class="msg ' + (mine ? 'mine' : 'theirs') + '">'
      + '<div class="msg-bubble">' + _esc(m.text || '') + '</div>'
      + '<div class="msg-time">' + time + '</div>'
      + '</div>';
  }).join('');

  area.innerHTML = html;
  area.scrollTop = area.scrollHeight;
}

function sendMessage() {
  if (!_activeChatId || !isLoggedIn) return;
  var input = document.getElementById('chat-input');
  var text = (input ? input.value : '').trim();
  if (!text) return;
  input.value = '';

  var msg = {
    text: text,
    senderUid: currentUser.uid,
    senderName: currentUser.name || currentUser.email || '',
    createdAt: Date.now()
  };

  var localChat = _fbChats.find(function(c){ return c.id === _activeChatId; });
  var receiverUid = localChat && localChat.participants
    ? localChat.participants.find(function(p){ return p !== currentUser.uid; })
    : null;

  if (localChat) {
    localChat.lastMessage   = text;
    localChat.lastMessageAt = { seconds: Math.floor(Date.now() / 1000) };
    _fbChats = [localChat].concat(_fbChats.filter(function(c){ return c.id !== _activeChatId; }));
    renderChats();
  }

  if (window._rtdb) {
    window._rtdb.ref('chats/' + _activeChatId + '/messages').push(msg);
    window._rtdb.ref('chats/' + _activeChatId).update({
      lastMessage: text,
      lastMessageAt: { seconds: Math.floor(Date.now() / 1000) }
    });
  }

  if (window._db && receiverUid) {
    var upd = {
      lastMessage: text,
      lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastSenderUid: currentUser.uid
    };

    upd['unread_' + receiverUid] = firebase.firestore.FieldValue.increment(1);
    window._db.collection('chats').doc(_activeChatId).update(upd).catch(function(){});
  } else if (window._db) {
    window._db.collection('chats').doc(_activeChatId).update({
      lastMessage: text,
      lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(function(){});
  }
}

function _startChatFromListing() {
  var l = [..._fbListings, ...myListings].find(function(x){ return x && x.id === currentDetailId; });
  if (!l) return;
  _startChat(l.uid, currentDetailId, l.title);
}

function openChat() {
  showPage('messages');
}

function closeChatOnMobile() {
  var layout = document.getElementById('messages-layout');
  if (layout) layout.classList.remove('chat-open');
  _activeChatId = null;
  renderChats();
}

function _startChat(sellerUid, listingId, listingTitle) {
  if (!isLoggedIn) { showToast('⚠️ Увійдіть щоб написати'); showPage('profile'); return; }
  if (sellerUid === currentUser.uid) { showToast('ℹ️ Це ваше оголошення'); return; }

  var existing = _fbChats.find(function(c) {
    return c.participants && c.participants.indexOf(sellerUid) >= 0
      && c.participants.indexOf(currentUser.uid) >= 0;
  });

  if (existing) {

    if (listingId && existing.listingId !== listingId) {
      existing.listingId = listingId;
      existing.listingTitle = listingTitle || '';
      if (window._db) {
        window._db.collection('chats').doc(existing.id).update({
          listingId: listingId,
          listingTitle: listingTitle || ''
        }).catch(function(){});
      }
    }
    showPage('messages');
    setTimeout(function(){ openChatById(existing.id); }, 200);
    return;
  }

  if (!window._db) return;
  var chatData = {
    participants: [currentUser.uid, sellerUid],
    listingId: listingId || null,
    listingTitle: listingTitle || '',
    lastMessage: '',
    lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    [currentUser.uid + '_name']: currentUser.name || currentUser.email || '',
    [sellerUid + '_name']: ''
  };

  window._db.collection('chats').add(chatData).then(function(ref) {
    var newChat = Object.assign({ id: ref.id }, chatData);
    newChat.otherName = '';
    _fbChats.unshift(newChat);
    showPage('messages');
    setTimeout(function(){ openChatById(ref.id); }, 200);

    window._db.collection('users').doc(sellerUid).get().then(function(snap) {
      if (snap.exists) {
        var sellerName = snap.data().name || '';
        var upd = { otherName: sellerName };
        upd[sellerUid + '_name'] = sellerName;
        window._db.collection('chats').doc(ref.id).update(upd);
        var chat = _fbChats.find(function(c){ return c.id === ref.id; });
        if (chat) { chat.otherName = sellerName; renderChats(); }
      }
    });
  }).catch(function(e){ showToast('⚠️ Помилка: ' + e.message); });
}

let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove('show'), 3000);
}

document.getElementById('headerSearch').addEventListener('keydown', e=>{
  if(e.key==='Enter') {
    const q = e.target.value.trim().toLowerCase();
    if(!q) return;
    showPage('catalog');
    currentCatFilter = 'all';
    setTimeout(()=>{
      let data = _allListings().filter(l=>l.title.toLowerCase().includes(q)||l.cat.toLowerCase().includes(q)||l.city.toLowerCase().includes(q));
      document.getElementById('catalog-listings').innerHTML = data.length
        ? data.map(l=>createCard(l,'catalog')).join('')
        : '<div class="empty-state"><i class="fa-solid fa-search"></i><h3>Нічого не знайдено</h3><p>Спробуйте інший запит</p></div>';
    },50);
  }
});

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
  "Маріуполь":{"lat":47.0953,"lng":37.5402},"Покровськ":{"lat":48.2831,"lng":37.1731},
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
  "Хуст":{"lat":48.1822,"lng":23.2942},"Мукачево":{"lat":48.4414,"lng":22.7105},
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
    raionSel.disabled = true;
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

loadSavedProfile();
_initRouter();

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
  if (!_promoListingId) return;

  var listing = (_allListings())
    .find(function(x){ return x && (x.id === _promoListingId || x.id === +_promoListingId || String(x.id) === String(_promoListingId)); });

  var promoUntilDate = new Date(Date.now() + _selectedPromoDays * 86400000);
  var promoData = {
    promo:      _selectedPromoType,
    promoDays:  _selectedPromoDays,
    promoUntil: promoUntilDate.toISOString()
  };

  var listingId = String(_promoListingId);

  if (window._db && listingId) {
    window._db.collection('listings').doc(listingId).update(promoData)
      .then(function() {
        console.log('Promo saved to Firestore:', listingId, promoData);
        showToast('🚀 ' + PROMO_NAMES[_selectedPromoType] + ' активовано на ' + _selectedPromoDays + ' днів! (до ' + promoUntilDate.toLocaleDateString('uk-UA', {day:'numeric',month:'long'}) + ')');
      })
      .catch(function(e) {
        showToast('⚠️ Помилка збереження промо: ' + e.message);
        console.error('Promo save error:', e);
      });
  }

  if (listing) {
    Object.assign(listing, promoData);
  }
  var inFb = _fbListings.find(function(x){ return x && String(x.id) === listingId; });
  if (inFb) Object.assign(inFb, promoData);
  var inMy = myListings.find(function(x){ return x && String(x.id) === listingId; });
  if (inMy) Object.assign(inMy, promoData);

  closePromoModal();
  renderHomeListings();
  if (typeof renderMyListings === 'function') renderMyListings();
  if (typeof runSearch === 'function' && document.getElementById('catalog-results-wrap') &&
      document.getElementById('catalog-results-wrap').style.display !== 'none') {
    runSearch();
  }
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
  console.log('DEBUG specs cat:', _savedCat, 'rawSpecs keys:', Object.keys(rawSpecs));

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
    console.log('Saving to Firestore...', fbListing.title, fbListing.uid);
    window._db.collection('listings').add(fbListing)
      .then(function(docRef) {
        console.log('Saved OK:', docRef.id);

        _consumeSlot();
        newL.id = docRef.id;
        _fbListings.unshift(newL);
        if (document.getElementById('pstat-active')) document.getElementById('pstat-active').textContent = myListings.length;
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
    ? _allListings().filter(function(l){ return l && l.uid === uid; })
    : myListings;
  if (!mine.length) { grid.innerHTML = ''; empty.style.display = ''; return; }
  empty.style.display = 'none';
  grid.innerHTML = mine.map(function(l){ return createMyCard(l); }).join('');

  if (uid) loadViewsStats('7');
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
  _updateSEO({ title: s.name, desc: s.desc ? s.desc.slice(0,160) : s.name + ' — сервісний центр у ' + (s.city||''), url: 'https://ridego-sigma.vercel.app/service/' + id });

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
    cities.forEach(function(ci){
      var sel = (s.city===ci) ? ' selected' : '';
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
  var url  = 'https://ridego-sigma.vercel.app/listing/' + l.id;
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

function copySellerLink() {
  var url = window.location.href;
  _copyShareUrl(url);
}

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

function shareListing() {
  var l = _allListings().find(function(x){ return x && x.id === currentDetailId; });
  if (!l) return;
  var url  = 'https://ridego-sigma.vercel.app/listing/' + l.id;
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

function copySellerLink() {
  var url = window.location.href;
  _copyShareUrl(url);
}

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
    'url': 'https://ridego-sigma.vercel.app/listing/' + l.id
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
    'url': 'https://ridego-sigma.vercel.app/seller/' + (d.uid || ''),
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
    'url': 'https://ridego-sigma.vercel.app',
    'description': '\u041c\u0430\u0440\u043a\u0435\u0442\u043f\u043b\u0435\u0439\u0441 \u0435\u043b\u0435\u043a\u0442\u0440\u043e\u0442\u0440\u0430\u043d\u0441\u043f\u043e\u0440\u0442\u0443 \u0423\u043a\u0440\u0430\u0457\u043d\u0438',
    'potentialAction': {
      '@type': 'SearchAction',
      'target': 'https://ridego-sigma.vercel.app/catalog?q={search_term_string}',
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
