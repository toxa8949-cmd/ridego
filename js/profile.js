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

