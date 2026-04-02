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
        // Фільтруємо видалені з кешу
        _fbListings = cached.filter(function(l){ return l && l.status !== 'deleted'; });
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
        // Завжди оновлюємо з Firestore у фоні через 2 сек
        setTimeout(function() { loadFirebaseData(true); }, 2000);
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
      // Оновити лічильник активних оголошень в профілі
      if (typeof _updateActiveCount === 'function') _updateActiveCount();

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

