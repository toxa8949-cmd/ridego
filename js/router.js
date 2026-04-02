// ── SPA роутер, parsePath, renderRoute, showPage, навігація ──
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
    var _pageUrl = 'https://ridego.com.ua' + (page === 'home' ? '/' : '/' + page);
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


