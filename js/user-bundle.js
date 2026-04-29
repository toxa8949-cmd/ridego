function doLogin() {
  var email = document.getElementById('login-email').value.trim();
  var pass  = document.getElementById('login-pass').value;
  if (!email) { showToast('⚠️ Введіть email'); return; }
  if (!pass)  { showToast('⚠️ Введіть пароль'); return; }
  if (window._auth) {
    window._auth.signInWithEmailAndPassword(email, pass)
      .then(function() {
        showToast('✅ Вхід успішний!');
        showPage('profile');
        if (typeof _preloadFollowing === 'function') _preloadFollowing();
      })
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
              name: user.displayName, email: user.email, uid: user.uid, termsAcceptedAt: firebase.firestore.FieldValue.serverTimestamp(), marketingOptIn: (function(){var _c=document.getElementById('reg-marketing');return !!(_c && _c.checked);})(), marketingOptInAt: (function(){var _c=document.getElementById('reg-marketing');return (_c && _c.checked) ? firebase.firestore.FieldValue.serverTimestamp() : null;})(),
              type: 'personal', listings: 0, status: 'active',
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
          }
          showToast('✅ Вхід через Google!');
          showPage('profile');
          if (typeof _preloadFollowing === 'function') _preloadFollowing();
        }).catch(function() {
          showToast('✅ Вхід через Google!');
          if (typeof _preloadFollowing === 'function') _preloadFollowing();
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
    if (typeof _chatsUnsubscribe === 'function') {
      _chatsUnsubscribe();
      _chatsUnsubscribe = null;
      window._chatsUnsubscribe = null;
      window.__chatListenersCount = 0;
    }
    if (typeof _chatUnsubscribe  === 'function') { _chatUnsubscribe();  _chatUnsubscribe = null; }
    if (typeof _chatsSubscribedUid !== 'undefined') _chatsSubscribedUid = null;
    window._auth.signOut().then(function() {
      isLoggedIn  = false;
      myListings  = [];
      _fbChats    = [];
      currentUser = { name:'', email:'', initial:'' };
      // Очищаємо кеш підписок і відгуків
      if (typeof _followingCache !== 'undefined') { _followingCache = null; _followingCacheUid = null; }
      if (typeof _reviewsCache   !== 'undefined') { _reviewsCache = {}; }
      if (window._sellersCache)    window._sellersCache = {};
      if (window._reviewedSellers) window._reviewedSellers = new Set();
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
    <div class="form-group" style="margin-top:4px"><label style="display:flex;align-items:flex-start;gap:8px;cursor:pointer;font-size:13px;line-height:1.4;color:var(--text-muted);font-weight:400"><input type="checkbox" id="reg-marketing" style="margin-top:3px;flex-shrink:0;width:16px;height:16px;cursor:pointer"><span>Хочу отримувати інформацію про акції, новини та оновлення RideGO</span></label></div><div style="font-size:12px;line-height:1.45;color:var(--text-muted);margin-top:2px;margin-bottom:4px">Натискаючи «Зареєструватись» або «Продовжити з Google», ви приймаєте <a href="/terms" onclick="event.preventDefault();showPage('terms')" style="color:var(--brand);text-decoration:underline">Угоду користувача</a> та <a href="/privacy" onclick="event.preventDefault();showPage('privacy')" style="color:var(--brand);text-decoration:underline">Політику конфіденційності</a>.</div><button class="btn-primary" style="width:100%;padding:14px;font-size:15px;margin-top:8px" onclick="doRegister()">Зареєструватись</button>
  `;
  document.querySelector('.auth-switch').innerHTML = 'Вже є акаунт? <a onclick="resetAuthForm()">Увійти</a>';
}
function resetAuthForm() { showPage('profile'); }
function doRegister() { var _mkt = !!(document.getElementById('reg-marketing') && document.getElementById('reg-marketing').checked);
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
            name: name, email: email, uid: cred.user.uid, termsAcceptedAt: firebase.firestore.FieldValue.serverTimestamp(), marketingOptIn: _mkt, marketingOptInAt: _mkt ? firebase.firestore.FieldValue.serverTimestamp() : null,
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

// Кеш профілю в sessionStorage
var _profileCacheTTL = 15 * 60 * 1000;

function _getProfileCache() {
  try {
    if (!currentUser || !currentUser.uid) return null;
    var key = '_pc_' + currentUser.uid;
    var at  = parseInt(sessionStorage.getItem(key + '_at') || '0');
    if (Date.now() - at > _profileCacheTTL) return null;
    return JSON.parse(sessionStorage.getItem(key) || 'null');
  } catch(e) { return null; }
}

function _setProfileCache(d) {
  try {
    if (!currentUser || !currentUser.uid) return;
    var key = '_pc_' + currentUser.uid;
    sessionStorage.setItem(key, JSON.stringify(d));
    sessionStorage.setItem(key + '_at', String(Date.now()));
  } catch(e) {}
}

function _applyProfileData(d) {
  var year = d.createdAt ? new Date(d.createdAt.seconds * 1000).getFullYear() : new Date().getFullYear();
  var metaEl = document.getElementById('profile-meta-text');

  // Відгуки — з reviewsCache якщо є
  var revCache = typeof _reviewsCache !== 'undefined' && _reviewsCache[currentUser.uid];
  if (revCache && (Date.now() - revCache.loadedAt) < 5 * 60 * 1000) {
    var revs = revCache.data;
    var avg = revs.length ? (revs.reduce(function(s,r){ return s+r.rating; },0) / revs.length).toFixed(1) : null;
    if (metaEl) metaEl.innerHTML = (avg ? '<i class="fa-solid fa-star" style="color:#ffa726;margin-right:3px"></i>' + avg + ' · ' : '') + 'На сайті з ' + year;
  } else if (window._db && metaEl) {
    window._db.collection('reviews').where('sellerUid','==',currentUser.uid).get()
      .then(function(revSnap) {
        var revs = revSnap.docs.map(function(r){ return r.data(); });
        if (typeof _reviewsCache !== 'undefined') _reviewsCache[currentUser.uid] = { data: revs, loadedAt: Date.now() };
        var avg = revs.length ? (revs.reduce(function(s,r){ return s+r.rating; },0) / revs.length).toFixed(1) : null;
        metaEl.innerHTML = (avg ? '<i class="fa-solid fa-star" style="color:#ffa726;margin-right:3px"></i>' + avg + ' · ' : '') + 'На сайті з ' + year;
      }).catch(function() { if (metaEl) metaEl.innerHTML = 'На сайті з ' + year; });
  } else if (metaEl) {
    metaEl.innerHTML = 'На сайті з ' + year;
  }

  var fill = function(id, val) { var el = document.getElementById(id); if (el && val) el.value = val; };
  fill('set-name', d.name); fill('set-phone', d.phone);
  fill('set-telegram', d.telegram); fill('set-instagram', d.instagram);
  fill('set-youtube', d.youtube); fill('set-tiktok', d.tiktok);
  fill('set-website', d.website); fill('set-company', d.company);
  fill('set-address', d.address); fill('set-hours', d.hours);
  fill('set-about', d.about || d.desc);
  if (typeof _checkPhoneVerified === 'function') _checkPhoneVerified(d);
  if (d.cats && d.cats.length && typeof _fillProfileCats === 'function') _fillProfileCats(d.cats);
  if (d.photoUrl && !profilePhotoUrl) {
    profilePhotoUrl = d.photoUrl;
    ['profile-pic-el', 'settings-avatar-preview'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.innerHTML = '<img alt="Аватар" src="' + d.photoUrl + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%">';
    });
    var lEl = document.getElementById('profile-pic-letter');
    if (lEl) lEl.style.display = 'none';
  }
}

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
  document.getElementById('profile-name-text').textContent = displayName;
  const letterEl = document.getElementById('profile-pic-letter');
  if (letterEl) letterEl.textContent = displayName[0].toUpperCase();
  const settingsLetterEl = document.getElementById('settings-avatar-letter');
  if (settingsLetterEl) settingsLetterEl.textContent = currentUser.initial;

  document.getElementById('pstat-active').textContent = myListings.filter(function(l){ return l && l.status !== 'deleted' && l.status !== 'sold' && l.status !== 'inactive'; }).length;
  document.getElementById('pstat-sold').textContent = 0;
  document.getElementById('pstat-favs').textContent = favorites.length;

  // Беремо профіль з кешу або Firestore
  if (window._db && currentUser && currentUser.uid) {
    var cached = _getProfileCache();
    if (cached) {
      _applyProfileData(cached);
    } else {
      window._db.collection('users').doc(currentUser.uid).get().then(function(snap) {
        if (!snap.exists) return;
        var d = snap.data();
        _setProfileCache(d);
        _applyProfileData(d);
      }).catch(function(){});
    }
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
      el.innerHTML = '<img alt="Аватар" src="' + localUrl + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%">';
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
          el.innerHTML = '<img alt="Аватар" src="' + profilePhotoUrl + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%">';
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
      .catch(function(e){ void('batch sellerName:', e.message); });
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
      ? '<img alt="Фото оголошення" src="' + listing.photos[0] + '" style="width:56px;height:56px;object-fit:cover;border-radius:8px;flex-shrink:0">'
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
    // Exchange card
    if (m.exchangeOffer) {
      var ex = m.exchangeOffer;
      var exImg = ex.offerImg
        ? '<img alt="Фото обміну" src="' + ex.offerImg + '" style="width:44px;height:44px;object-fit:cover;border-radius:8px;flex-shrink:0">'
        : '<div style="width:44px;height:44px;border-radius:8px;background:var(--dark3);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">' + String.fromCodePoint(0x1F4E6) + '</div>';
      var surchargeHtml = '';
      if (ex.surchargeType === 'i-pay' && ex.surchargeAmount > 0) {
        surchargeHtml = '<div style="margin-top:8px;padding:5px 9px;background:rgba(0,200,83,.12);border:1px solid rgba(0,200,83,.22);border-radius:7px;font-size:11px;color:var(--brand);font-weight:700">' + '\u0414\u043e\u043f\u043b\u0430\u0447\u0443 ' + Number(ex.surchargeAmount).toLocaleString('uk') + ' \u0433\u0440\u043d</div>';
      } else if (ex.surchargeType === 'they-pay' && ex.surchargeAmount > 0) {
        surchargeHtml = '<div style="margin-top:8px;padding:5px 9px;background:rgba(255,160,0,.1);border:1px solid rgba(255,160,0,.22);border-radius:7px;font-size:11px;color:#e67e00;font-weight:700">\u041f\u0440\u043e\u0448\u0443 \u0434\u043e\u043f\u043b\u0430\u0442\u0443 ' + Number(ex.surchargeAmount).toLocaleString('uk') + ' \u0433\u0440\u043d</div>';
      } else {
        surchargeHtml = '<div style="margin-top:8px;font-size:11px;color:var(--text-muted)">\u0411\u0435\u0437 \u0434\u043e\u043f\u043b\u0430\u0442\u0438</div>';
      }
      var commentHtml = ex.comment
        ? '<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border);font-size:11px;color:var(--text-muted)">' + window.escHtml(ex.comment) + '</div>'
        : '';
      var viewBtn = ex.offerId
        ? '<div onclick="showDetail(\'' + ex.offerId + '\')" style="cursor:pointer;width:28px;height:28px;border-radius:7px;background:var(--dark3);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-left:auto"><i class="fa-solid fa-arrow-up-right-from-square" style="font-size:10px;color:var(--brand)"></i></div>'
        : '';
      var card = '<div style="width:256px">'
        + '<div style="display:flex;align-items:center;gap:6px;margin-bottom:10px">'
        + '<span style="font-size:10px;font-weight:800;letter-spacing:.7px;color:var(--brand)">\u{1F504} \u041f\u0420\u041e\u041f\u041e\u0417\u0418\u0426\u0406\u042f \u041e\u0411\u041c\u0406\u041d\u0423</span>'
        + '</div>'
        + '<div class="exc-inner-box" style="margin-bottom:8px">'
        + '<div style="font-size:9px;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted);margin-bottom:3px">\u0425\u043e\u0447\u0435 \u043e\u0442\u0440\u0438\u043c\u0430\u0442\u0438</div>'
        + '<div style="font-size:13px;font-weight:700;color:var(--text)">' + _esc(ex.targetTitle || '') + '</div>'
        + (ex.targetPrice ? '<div style="font-size:11px;color:var(--text-muted);margin-top:2px">' + Number(ex.targetPrice).toLocaleString('uk') + ' \u0433\u0440\u043d</div>' : '')
        + '</div>'
        + '<div style="font-size:9px;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted);margin-bottom:6px">\u041f\u0440\u043e\u043f\u043e\u043d\u0443\u0454 \u0432 \u043e\u0431\u043c\u0456\u043d</div>'
        + '<div class="exc-inner-box" style="display:flex;align-items:center;gap:8px">'
        + exImg
        + '<div style="min-width:0;flex:1">'
        + '<div style="font-size:13px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + _esc(ex.offerTitle || '') + '</div>'
        + (ex.offerPrice ? '<div style="font-size:11px;color:var(--brand);font-weight:700;margin-top:1px">' + Number(ex.offerPrice).toLocaleString('uk') + ' \u0433\u0440\u043d</div>' : '')
        + '</div>'
        + viewBtn
        + '</div>'
        + surchargeHtml
        + commentHtml
        + '</div>';
      return '<div class="msg ' + (mine ? 'mine' : 'theirs') + '">'
        + '<div class="msg-bubble exchange-card" style="border-radius:16px;max-width:none">' + card + '</div>'
        + '<div class="msg-time">' + time + '</div>'
        + '</div>';
    }


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

    // Відправити email отримувачу якщо є email в Firestore
    window._db.collection('users').doc(receiverUid).get().then(function(doc) {
      if (doc.exists && doc.data().email) {
        var chat = _fbChats.find(function(c){ return c.id === _activeChatId; });
        fetch('/api/send-email', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            type: 'new_message',
            to: doc.data().email,
            data: {
              senderName: currentUser.name || currentUser.email || 'Користувач',
              message: text,
              listingTitle: chat && chat.listingTitle ? chat.listingTitle : ''
            }
          })
        }).catch(function(e){ void('chat email error:', e.message); });
      }
    }).catch(function(){});
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

function _startChat(sellerUid, listingId, listingTitle) { if (!isLoggedIn) { showToast('\u26A0\uFE0F \u0423\u0432\u0456\u0439\u0434\u0456\u0442\u044C \u0449\u043E\u0431 \u043D\u0430\u043F\u0438\u0441\u0430\u0442\u0438'); showPage('profile'); return; } if (sellerUid === currentUser.uid) { showToast('\uD83D\uDCED \u0426\u0435 \u0432\u0430\u0448\u0435 \u043E\u0433\u043E\u043B\u043E\u0448\u0435\u043D\u043D\u044F'); return; } if (window._db && currentUser && currentUser.uid) { window._db.collection('chats').where('participants','array-contains',currentUser.uid).get().then(function(s){ var f=null; s.forEach(function(doc){ var d=doc.data(); if(!f && d && d.participants && d.participants.indexOf(sellerUid)>=0) f=Object.assign({id:doc.id},d); }); if(f){ var ex=false; for(var i=0;i<_fbChats.length;i++){ if(_fbChats[i].id===f.id){ex=true;break;} } if(!ex) _fbChats.unshift(f); if(listingId && f.listingId!==listingId){ f.listingId=listingId; f.listingTitle=listingTitle||''; window._db.collection('chats').doc(f.id).update({listingId:listingId,listingTitle:listingTitle||''}).catch(function(){}); } showPage('messages'); setTimeout(function(){openChatById(f.id);},200);} else { _startChatImpl(sellerUid, listingId, listingTitle); } }).catch(function(){_startChatImpl(sellerUid, listingId, listingTitle);}); return; } _startChatImpl(sellerUid, listingId, listingTitle); }function _startChatImpl(sellerUid, listingId, listingTitle) {
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
      let data = _allListings().filter(l=>l && l.status !== 'deleted' && l.status !== 'sold' && (l.title.toLowerCase().includes(q)||l.cat.toLowerCase().includes(q)||l.city.toLowerCase().includes(q)));
      document.getElementById('catalog-listings').innerHTML = data.length
        ? data.map(l=>createCard(l,'catalog')).join('')
        : '<div class="empty-state"><i class="fa-solid fa-search"></i><h3>Нічого не знайдено</h3><p>Спробуйте інший запит</p></div>';
    },50);
  }
});


let nextId = 100;
let addCurrentStep = 1;
let addSelectedCat = null;
let addSelectedIcon = '📦';
var uploadedPhotos = []; window.uploadedPhotos = uploadedPhotos;

const ADD_BRANDS = {
  'Електросамокати': [
    'Acer','Apollo','Atlas','Ausom','Best Scooter','Blaupunkt','Crosser','Cruzzer','Currus',
    'Dualtron','E-Scooter','E-Twow','ENGWE','Forte','Gelius','HALO KNIGHT',
    'Hikerboy','Hover-1','Hoverbot','IDEMO','Inmotion','Inokim','iScooter','isinwheel',
    'Joyor','Kaabo','Kamikaze','KingSong','Kugoo','Kukirin','Lankeleisi',
    'Mantis','Maxxter','MegaDrive','Mercane','Navee','Ninebot (Segway)',
    'OKAI','PRIME3','Proove','Razor','Ruitoo','Speedway','Swagtron',
    'Tecros','Tesla (самокат)','Turboant','Vortex','Vsett','Wegoboard',
    'Wolf Warrior','X-Scooter','Xiaomi','Yume',
    'Інший бренд',
  ],
  'Велосипеди': [
    'Apollo','Ardis','Author','Avanti','Azimut','Batavus','Bergamont','Bianchi','BMC',
    'Bulls','Cannondale','Colnago','Commencal','Corso','Cross','CROSSRIDE','CTM','Cube',
    'Cyclone','Discovery','Dorozhnik','Felt','Focus','Formula','Fuji',
    'Gazelle','Ghost','Giant','GT','Intenzo','Kellys','Kinetic','KTM',
    'Lapierre','Leon','Marin','Mascotte','Merida','Mongoose','Norco',
    'Nukeproof','Orbea','Pegasus','Pinarello','Pivot','Polygon','Pride',
    'Raleigh','Ridley','Rocky Mountain','Romet','ROYALBABY',
    'Santa Cruz','Scott','Specialized','Spelli','Stern','Stevens',
    'Trek','Univega','Velotrade','Wilier','Winner','Winora','Yeti',
    'Інший бренд',
  ],
  'Електровелосипеди': [
    'ADO','Ampler','Anomaly Energy','Ardis','Bafang','Batavus','BearEbike','Bezior',
    'Booster','Cannondale','CMACEWHEEL','Corso','COSWHEEL','Cowboy','Crosser','CROSSRIDE',
    'Cube','Cysum','Delfast','Dorozhnik','DYU','E-motion','Eleek',
    'Eleglide','ENGOO','Engwe','ESKUTE','Fafrees','Fiido','Focus',
    'Formula','Gazelle','Ghost','Giant','Gogobest','Gunai','Haibike',
    'Heybike','Hidoes','Himo','Hitway','Jasion','KTM','Lankeleisi',
    'Lapierre','Lectric','Merida','Moustache','NCM','Randride','Richbit',
    'Riese & Müller','Rooder','Samebike','Scott','Specialized','Stromer',
    'Tenways','Tern','Trek','VanMoof','Velowave','Velotrade','Voltronic',
    'Winora','Yuba',
    'Інший бренд',
  ],
  'Електроскутери': [
    'AIMA','Askoll','Ather','Atlas','BMW CE 02','BMW CE 04',
    'Citycoco','Corso','Doohan','Electra','Eskooter','EVOBIKE',
    'Fada','Forte','Govecs','Horwin','Kugoo','Kymco',
    'LIBERTY','MANTA','Maxxter','Neco','Nito','NIU',
    'Ola Electric','Orcal','Piaggio','Revolt','Rieju','Rooder',
    'Seev','Segway','Silence','SPARK','Super Soco','SYM',
    'Torrot','Vespa Electric','Vmoto','Vuka','W-TEC','Yadea','Zero',
    'Інший бренд',
  ],
  'Електромотоцикли': [
    'Arc','BMW','Cake','CSC','Curtiss','Damon','Davinci','Ducati',
    'Eleek','Energica','GasGas','Harley-Davidson','Honda','Husqvarna',
    'Indian','Kawasaki','KOVE','KTM','Lightning','LiveWire',
    'Maeving','Revolt','RGNT','Sondors','Stark','Sur Ron',
    'Talaria','Tarform','Ultraviolette','Verge','Yamaha','Zero Motorcycles',
    'Інший бренд',
  ],
};

const ADD_MODELS = {
  'Acer': ['Nitro ES Series 4','Scooter 3 Advance','Scooter 5 Select ES035'],
  'Ado': ['A20','A20 Air','A20F Beast','A28','E28 XE Pro'],
  'AIMA': ['Eagle','Eagle Max','Eagle Pro','Fox','Fox Pro','Mine Max','Mine Plus','Mine Pro','Star','T3','T4','T5','Tiger','Tiger Pro'],
  'Ampler': ['Axel','Curt','Juna','Stout'],
  'Anomaly Energy': ['T6 Elegance','V8','V8 Pro'],
  'Apollo': ['Air','City','City 2023','Explore','Ghost','Ghost Max','Phantom','Phantom V3','Pro','Shadow'],
  'Arc': ['Arc Vector'],
  'Ardis': ['Berta 28','Blaze 29 MTB AL','Buggy 26','CHARGE 20 CTB','CHARGE 24 CTB 3x','City Folding FLD AL 24','Cleo 24','CTB 26 ST LIDO','DALLAS 27.5 MTB AL','Drift MTB MG 20','EZREAL 24','Flex 26','Fold 20 FLD ST','GTA E-BIKE 500W 29','Lido 26','Lido CTB AL 26','MG CROSS 20','Paola 28','PEPPA 20 MTB AL','POLO 20 MTB ST','Santana MTB ST 24','SHADOW 16 BMX','Shultz 27.5','Swift.Pro 27.5','Titan 27.5','Verona 26','Vintage 26','ЛІБІДЬ 28'],
  'Askoll': ['ES1','ES3 Evolution','NGS3'],
  'Ather': ['450 Plus','450S','450X','Rizta'],
  'Atlas': ['Eagle','Falcon Box 1500W','mini','Speedy Box 2000W','Spider','Spider 2 Box 2000W Plus','Spider Box 1500W','Tiger Box 2000W','Tiger Box Plus 2000W'],
  'Ausom': ['L2 Max Dual Motor'],
  'Author': ['Codex 29','Impulse 29','Outset 29','Rival 29','Traction 27','Traction 29'],
  'Avanti': ['Aspire 1','Aspire 2','Edge','Rival 2','Rival 3'],
  'Azimut': ['Energy','Space','Sprint'],
  'Bafang': ['BBS02 750W','BBSHD 1000W','M600','M620 Ultra'],
  'Batavus': ['Bravo E-go','Finez E-go','Finez E-go Power','Fonk E-go','Stream E-go'],
  'Batavus (велосипед)': ['Finez','Fonk','Quip'],
  'Bergamont': ['Helix 4','Revox 4','Revox 6','Revox 8'],
  'Bezior': ['BK1','M2 Pro','X1500','X500 Pro','XF200'],
  'Bianchi': ['Camaleonte 1','Sprint','Via Nirone 7'],
  'Blaupunkt': ['ESC440','ESC608','ESC912'],
  'BMC': ['Fourstroke 01','Roadmachine 01','Teammachine SLR 01'],
  'BMW': ['CE 02','CE 04'],
  'BMW CE 02': ['CE 02 11 kW','CE 02 4.0 kW'],
  'BMW CE 04': ['CE 04 31 kW'],
  'Bulls': ['Copperhead EVO AM','Copperhead EVO AM 4','Desert Falcon','Sonic Evo AM','Sonic Evo AM 4'],
  'Cake': ['Kalk INK SL','Kalk OR','Kalk& Street','Ösa Lite','Ösa+'],
  'Cannondale': ['Habit 4','Habit 5','Quick 4','Quick CX 3','Synapse Carbon 2','Topstone 1','Topstone 2','Topstone Carbon 1','Trail 5','Trail 6','Trail 7','Treadwell 2'],
  'Chopper': ['Chopper 2000W','Chopper 3000W','Fat Chopper 3000W'],
  'City Boss': ['CRB01','CRB02','CRB03'],
  'Citycoco': ['3000W Classic','3000W Fat Tyre','Chopper 2000W','Spider','T8 Pro','X3 Pro'],
  'Colnago': ['C68','G3-X','V3Rs'],
  'Commencal': ['Clash','Clash Dirt','Meta TR'],
  'Conway': ['Cairon S 929','Flux 6.0','Futura 7.0','MT 829','WME Evo'],
  'Corso': ['ADVANCE','ALPHA','AMBER','AMG','AMG 29','ANTARES','ANTARES 29','APEX','ATLANT','ATLANT PLUS','Atlas mini','AVENTO','BLADE','BRAVE','BRAVE 29','CAMARO','Connect 20','CRANK','CYBER','DARK-X','DEX-73','DREAM','ELYSIUM','ENERGY','ENIGMA','EVOLUTION','F35','FISHER','FORTUNA','FREEDOM','GENESIS','GLOBAL','GTR-3000','HUNTER','INFINITY','INSIDER','INTEGRA','INTENSE','JUSTER','KENO','KLEO','KOMODO','KOMODO MAX','KOMODO PRO','KORD','Kord 29','KRAFT','LEADER','LEGEND','LIBERTY','LINER','MADMAX','MADMAX 29','MAGNUS','MAGNUS 29','MERCURY','MERCURY 26','MISTRAL','MONTANA','MX-5 POWER','NERO','NEW-NITRO','NEXT','NITRO','PHANTOM','POLARIS','POWERFULL','PREMIER','PROJECT','PULSAR','REND','ROCCO','ROCCO 20','ROTEX','SHADOW','Shadow 22','SHADOW PRO','SKYWALKER','SONATA','SPEEDLINE','SPIDER','SPIRIT','STELLAR','TORNADO','TRAVEL','TRUCK','ULTRA','ULTRA 26','VIOLA','VOLT BIKE','Volt Bike 26','VULCAN','X-POWER'],
  'Corso (ebike)': ['Atlant Plus 20','Shadow 22','Volt Bike 26'],
  'Corso (scooter)': ['Hawk 1000W','Komodo 1000W','Komodo 1200W','Niro 800W','Nova 1000W','Raven 800W','SIG-8 Pro','Spider Box 1500W'],
  'Corso (скутер)': ['Hawk 1000W','Komodo 1000W','Komodo 1200W','Niro 800W','Nova 1000W','Raven 800W','SIG-8 Pro','Spider Box 1500W'],
  'Cowboy': ['C4','C4 Adventure','C4 ST','Cross','Cruiser'],
  'Cross': ['Blade','Egoist','Elegant','Galaxi','Kron'],
  'Crosser': ['Angel 24','Angel 26','Angel 29','COMP 350W','CR-17 2500W','CR-4 1200W','CR-9 1000W','CR-EL-29PRO','CR1 500W','CR2 500W','CR4','Dominator 10','E-400','E-500','E-777 Fat','E-CODE 1000W','E-Delta 800W','E9','E9 Premium','Leon 29','M5','Martin 24','Rocket 11','Super Light 20','Super Max 1200W LifePO4','Sweet 24','T4 Pneumatic','T4 TURBO','T8 MAX','T8 MAX AWD','TR1 PRO','TR3'],
  'Crosser (самокат)': ['CR-17 2500W','CR-4 1200W','Super Max 1200W','T4 Seat','Tesla MODEL 12000'],
  'Cruzzer': ['City Pro','M5 Pro 2000W','M6 Pro'],
  'CSC': ['City Slicker 2.0'],
  'CTM': ['Rein','Scream','Versus','Viper','Warp'],
  'Cube': ['Agree C:62 Pro','Aim Pro','Aim Race','Attention SL','Hyde Race','Litening C:68X Pro','Nature Cross Pro','Reaction 300','Reaction 400','Stereo 120 Race','Touring Hybrid 400'],
  'Currus': ['EG','EG One','NF-9','NF-9 Plus','Panther','Wolf+'],
  'Curtiss': ['Apollo','Hera','Zeus'],
  'Cyclone': ['ALX','GSX','SLX'],
  'Damon': ['HyperFighter Colossus','HyperSport Premier','HyperSport Pro'],
  'Davinci': ['DC100'],
  'De Rosa': ['Idol','King XS','Protos','SK'],
  'Delfast': ['Partner 2.0','Top 3.0 Enduro','Top 3.0i'],
  'Discovery': ['Camp','Canyon','Track','Trail'],
  'Doohan': ['iTank 3000W','iTank Cargo','iTank Pro 4000W','iVolt'],
  'Dorozhnik': ['AQUAMARINE','COMFORT','CRYSTAL','eADAMANT HDD','eAKVAMARIN','eCORAL AM DD','eCRYSTAL BH','eRETRO DD','eRETRO VBR','ONYX','RETRO','TRAIL'],
  'Dualtron': ['Achilleus','Compact','Eagle Pro','Lightning','Mini','Mini 2','Spider 2','Storm','Thunder 2','Thunder 2 Ultra','Ultra 2','Victor','Victor Luxury','Victor Raptor','X2'],
  'Ducati': ['MotoE'],
  'E-motion': ['City 36V','Enduro 48V','MTB 27.5 GT','MTB 29 GT'],
  'E-Scooter': ['E-Scooter 11"','M4 PRO 1000W','Zen U12 PRO'],
  'E-Twow': ['Booster GT','Booster GT+ Plus','Master GT','Master GT+'],
  'Electra': ['Electra 3000W','Electra City'],
  'Eleek': ['Atom','Atom Military','Enduro'],
  'Eleglide': ['Citycrosser','Citycrosser 2.0','Coozy','Coozy Pro','F1','M1 Plus','M2','M2 Pro','T1 ST Plus','T1 Step-Thru','Tankroll'],
  'Energica': ['Ego Corsa','Ego+','Ego+ RS','Eva EsseEsse9+ RS','Eva Ribelle','Eva Ribelle RS','Experia','Experia GT'],
  'Engwe': ['C20 Pro','Engine Pro 2.0','Engine Pro 2.0 Plus','EP-2 Boost','EP-2 Pro','L20','M20 Dual','P26','P275 ST','X26'],
  'Eskooter': ['Eskooter City','Eskooter Pro'],
  'ESKUTE': ['Polluno','Polluno Pro','Voyager','Wayfarer'],
  'Evil': ['Calling','Following','Insurgent','Offering','Wreckoning'],
  'EVOBIKE': ['City Pro 72V','Luna TRIO 60V','Sport 72V'],
  'Fada': ['TDT1261Z','TDT1262Z','TDT2028'],
  'FADA': ['City 350W','MOAi 800W','MOAi Pro'],
  'Fafrees': ['F20 Pro','F26 Carbon','F28 Pro','FF20 Polar'],
  'Felt': ['Breed 30','Broam 30','Doctrine Advanced'],
  'Fiido': ['Beast Pro','C11','C21','D11','D21','D2S','D3 Pro','D4s','D4s Plus','L3','L3 Cargo','M1 Pro','M21','Q1S'],
  'Focus': ['Aventura2 6.8','Jam2 6.8','Jarifa2 6.8','Thron2 6.8'],
  'Formula': ['Acid Vbr 24','Alpina AM DD 26','BLACKWOOD 1.0 24','BLACKWOOD 26','Cherry 16','Cursor Man AM DD 28','DRAGONFLY 29','eHeavy Duty 29','eMOTION PLUS DD FR','F-1 AM DD 26','MOTION DD','MOTION DD FR','MOTION PLUS','MOTION PLUS AM DD','OMEGA 26','SLIM Vbr 18','SMART 20','SMART FRW AM 24','THOR 26','THOR 29','ZEPHYR 1.0 AM HDD','ZEPHYR 2.0','ZEPHYR 3.0 AM DD','ZEPHYR EXPERT HDD'],
  'Formula (ebike)': ['Acid Vbr 24','Alpina AM DD 26','BLACKWOOD 1.0 24','BLACKWOOD 26','Cherry 16','Cursor Man AM DD 28','DRAGONFLY 29','eHeavy Duty 29','eMOTION PLUS DD FR','F-1 AM DD 26','MOTION DD','MOTION DD FR','MOTION PLUS','MOTION PLUS AM DD','OMEGA 26','SLIM Vbr 18','SMART 20','SMART FRW AM 24','THOR 26','THOR 29','ZEPHYR 1.0 AM HDD','ZEPHYR 2.0','ZEPHYR 3.0 AM DD','ZEPHYR EXPERT HDD'],
  'Forte': ['E-BIKE 500W','FLY','GP-1000-C','GP-1500-C','GRAVY','HAWK','JB-1500','LEON','LEON PRO','Lucky WS350','Lucky WS500','NIRO','R2','R3','T1','T3','Tron 800W','UNICORN EV'],
  'Forte (scooter)': ['E-BIKE 500W','FLY','GP-1000-C','GP-1500-C','GRAVY','HAWK','JB-1500','LEON','LEON PRO','Lucky WS350','Lucky WS500','NIRO','R2','R3','T1','T3','Tron 800W','UNICORN EV'],
  'Forte (самокат)': ['E9 PRO','E9 PRO MAX','EB5'],
  'Fuji': ['Gran Fondo 2.1','Nevada 1.9','Traverse 1.5'],
  'GasGas': ['EC-E 5','MC-E 5'],
  'Gazelle': ['Arroyo C8','Medeo T9','Miss Grace C7','Ultimate C380+','Ultimate T10'],
  'Gazelle (велосипед)': ['Bold','Miss Grace','Orange'],
  'Gelius': ['GES-U73','Scooter Pro','UL-ES001'],
  'Ghost': ['Hybride EQ 5.8','Kato FS Pro','Nirvana Tour 3.8','Panamao X'],
  'Giant': ['Contend AR 2','Contend AR 3','Defy Advanced 2','Defy Advanced 3','Escape 1','Escape 2','Escape 3','FastRoad AR 2','FastRoad AR 3','FastRoad SL 1','Fathom 1','Fathom 2','Fathom 29 1','Fathom 29 2','Revolt 1','Revolt 2','Revolt Advanced 1','Roam 4','Stance 1','Stance 2','Talon 1','Talon 2','Talon 29 1','Talon 29 2','Talon 3','TCR Advanced 1','TCR Advanced 2','TCR Advanced Pro 0','Trance X 1','Trance X 2','Trance X 29 1','XTC Advanced 27.5'],
  'GIANT (scooter)': ['E-Scooter','Kids ES1','Move U8 PRO','Outlander M11'],
  'GIANT (самокат)': ['E-Scooter','Kids ES1','Move U8 PRO','Outlander M11'],
  'Globber': ['E-MOTION 4','One K E-Motion 20','One K E-Motion 22'],
  'Gogobest': ['GF300','GF500','GF600','GF700 Dual','GN20'],
  'Govecs': ['GO! L','GO! S3.4','GO! T1.6'],
  'GT': ['Aggressor Comp','Avalanche Comp','Grade Carbon Pro','Sensor Comp'],
  'Gunai': ['CX10','CX20','MX03','MX10'],
  'Haibike': ['AllMtn 3','AllMtn 5','AllMtn CF 5','AllMtn CF 7','FLYON AllMtn 2','HardNine 3','HardSeven 3','Sduro FullSeven 3.0','Trekking 5','Trekking 7','Trekking Cross 5'],
  'Harley-Davidson': ['LiveWire','LiveWire One'],
  'Heybike': ['Cityscape','Mars 2.0','Ranger','Tyson'],
  'Hidoes': ['B10','B16','B20 Pro'],
  'Hikerboy': ['Escape Pro','Hero 3.0','Urban Pro'],
  'Himo': ['C26','C30','H26','Z16','Z20'],
  'Hitway': ['BK11','BK15','BK22','BK5'],
  'Honda': ['EM1 e:','PCX Electric'],
  'Horwin': ['CR6','CR6 Pro','EK1','EK3 Plus','SK3'],
  'Hoverbot': ['Alpha','Carbon','Matrix','Ranger','Titan','Titan Fat','Titan Light','Titan Pro','Vector'],
  'Husqvarna': ['EE 3','EE 5'],
  'Indian': ['PowerPlus','Thunderstroke 116e'],
  'Inmotion': ['Climber S1 Pro','RS','S1','S1 Pro','S1F'],
  'InMotion': ['E1','RS','S1 Pro'],
  'Inokim': ['Light 2','Light 2 Super','Mini 2','OX','OX Sport','OX Super','Quick 3','Quick 4','Quick 4 Super'],
  'Intenzo': ['Carbon','Metal','Storm'],
  'Jasion': ['EB5 Plus','EB7'],
  'Joyor': ['A3','A5','A5S','A5S Plus','F3','F5','F6','G5S','G5S Plus','G7S','S1','S10','S5','X1','X2','X3','X5S','X5S Plus','X5S Pro','X5S SE','Y10','Y5S','Y6S','Y6S Plus'],
  'Kaabo': ['Mantis 10','Mantis 10 Pro','Mantis 8','Mantis 8 Pro','Mantis 8+ Pro','Mantis King GT','Mantis King GT Pro','Mantis X Plus','Skywalker 10H ECO800','Skywalker 10S','Skywalker 10S Plus','Skywalker 8 ECO500','Wolf King GT','Wolf King GT Pro','Wolf Warrior 11','Wolf Warrior 11+','Wolf Warrior X','Wolf Warrior X Pro Plus Gold'],
  'Kawasaki': ['Ninja e-1','Ninja e-1 ABS','Z e-1','Z e-1 ABS'],
  'Kellys': ['Arc 10','Arc 30','Desire 30','Desire 70','Gibon 30','Gibon 50','Gibon 70','Gibon 90','Hacker 30','Hacker 70','Phanatic 29'],
  'Kinetic': ['Storm','Vesta'],
  'KingSong': ['KS-16X','KS-N10','KS-N11','KS-N12','KS-N13','KS-S1 Plus','KS-S16','KS-S18'],
  'KOVE': ['450 Rally E','800X Adventure'],
  'KTM': ['Freeride E-SM','Freeride E-XC','Macina Chacana 791','Macina Eight 11','Macina Sport 720','Ultra Fun 29'],
  'Kugoo': ['C1','C1 Pro','C1+','G-Booster','G1','G1 Plus','G2 MAX','G2 Pro','G2 Pro Black','G2 Pro OffRoad','G30 Ekam','G30 MAX','G30 MAX PRO','G30 MAX PRO Plus','Jilong M365','Kirin G2','Kirin G2 2025','Kirin G2 2026','Kirin G2 Master','Kirin G2 Master Dual','Kirin G2 Max','Kirin G2 Pro','Kirin G2 Ultra 2025','Kirin G3','Kirin G3 Pro','Kirin G3 Pro Dual','Kirin G4','Kirin G4 Max','Kirin iScooty M4 PRO','Kirin M4','Kirin M4 Pro','Kirin M4 Pro Plus','Kirin M5 Pro','Kirin M5 PRO 2025','Kirin M5 PRO MAX','Kirin S3 PRO Premium','Kirin T3','M2','M365 Pro','M365 Pro Max','M365 Pro Max 4','M4','M4 Pro','M4 PRO 1000','M4 Pro 18Ah','M5 Pro','PRO 5 Max','S1 Pro','S3','S3 Pro','S3 Pro Black'],
  'Kugoo (scooter)': ['C1','C1 Pro','C3'],
  'Kugoo (скутер)': ['C1','C1 Pro','C3'],
  'Kymco': ['iFlow+','Ionex S','Like EV','RevoNEX','Super NEX'],
  'Lankeleisi': ['G650','G660','RV800','RX80','TG750','X3000 Plus','XT750'],
  'Lapierre': ['Overvolt AM 6.5','Overvolt HT 5.5','Overvolt Trekking 5.5'],
  'Lectric': ['One','XP 3.0','XP 3.0 Step-Thru','XPeak'],
  'Leon': ['GO 7speed 20','GO Vbr 20','HD-80 28','Junior AM DD 24','Junior DD 24','Junior Vbr 24','Super Junior 26','TN-105 DD 29','TN-70 29','TN-80 29','TN-90 29','XC 100 27.5','XC 80 27.5','XC Lady 27.5','XC-40 29'],
  'LIBERTY': ['Liberty 2000W','Liberty Pro'],
  'Lightning': ['LS-218','Strike','Strike Carbon'],
  'LiveWire': ['Del Mar LTD','Del Mar S','Del Mar S2','One'],
  'Look': ['675','695','765','785','986','Geo Trekking'],
  'Maeving': ['RM1','RM1S'],
  'MANTA': ['Manta 2000W','Manta Pro'],
  'Mantis': ['10 Pro','8 Pro','King GT'],
  'Maraton': ['M4 MAX','Scooter Tesla 5000'],
  'Marin': ['Bobcat Trail 3','Bobcat Trail 5','Fairfax 1','Four Corners','Gestalt X 11','Hawk Hill 1','Hawk Hill 2','Nicasio+','Pine Mountain 2'],
  'Mascotte': ['City','Cross','MTB'],
  'Maxxter': ['ANT','LUMINA','LUMINA 1500W','NEOS III','NOVA 1000W','Rock 2.0','SCAT','Trike'],
  'Maxxter (scooter)': ['ANT','LUMINA','LUMINA 1500W','NEOS III','NOVA 1000W','Rock 2.0'],
  'MegaDrive': ['City 2000','Sport','Z10','Z10 Pro'],
  'Mercane': ['WideWheel 48V','WideWheel Pro'],
  'Merida': ['Big Nine 300','Big Nine 400','Big Nine XT','Big Seven 300','Big Seven 400','Big Seven 600','Crossway 100','Crossway 20','Crossway 40','One-Twenty 400','One-Twenty 600','Reacto 5000','Scultura 300','Scultura 400','Silex 300','Silex 400','Speeder 200','Speeder 300'],
  'Mongoose': ['Dolomite Fat','Impasse Comp','Tyax Comp'],
  'Motus': ['PRO 10 Sport','PRO 10 Urban','Scooty 8.5'],
  'Moustache': ['Friday 27 3','Samedi 27 Trail 4','Samedi 27 Trail 8'],
  'MS Energy': ['MS-E10','MS-E200','MS-E40','MS-E450'],
  'Navee': ['GT3','GT3 MAX','N40','N65','S40 350W','S65','S65 Carbon','S85','V50'],
  'NAVEE': ['GT3','GT3 MAX','N40','N65','S40','S65','ST3','ST3 PRO','ZT3 Pro'],
  'NCM': ['Aspen','Aspen Plus','C5','Hamburg Plus','London Plus','Milano Max','Milano+','Moscow Max','Moscow+','Prague Max','Prague+','S6','Vienna Plus'],
  'Neco': ['Clover','Ides','Portofino'],
  'Ninebot': ['C2 Pro E','E2 E','E3','F2 Pro E','F3 E','GT3','MAX G2 E','MAX G3','MAX G30','ZT3 Pro E'],
  'Ninebot (Segway)': ['Air T15','Air T15E','C2 Lite','C2 Pro E','E2 E','E2 E II','E2 Pro E','E3','E3 Pro E','eKickScooter E3 Pro E','eKickScooter F3 Pro E','eKickScooter MAX G3 E','F2 E Plus','F2 II E','F2 Pro E','F2 Pro E II','F3 E','F3 Pro E','GT3','GT3 E','GT3 Pro','GT3 Pro E','KickScooter C2 Lite','KickScooter C2 Pro','MAX G2 E','MAX G3','MAX G3 E','MAX G30','MAX G30D','MAX G30E II','MAX G30LE','MAX G30P','P65E','Zing C20','Zing E10','ZT3 Pro E'],
  'Nito': ['N1','N1X','N3','N4','N5'],
  'NIU': ['EM215','EM215A','EM215N','KQi2 Pro','KQi3','KQi3 Max','KQi3 Me','KQi3 Pro','KQi3 Sport','MQi GT EVO','MQi+','MQi+ Sport','NQi GTS Pro','NQi GTS Sport','NQi Pro','NQi Sport','RQi','RQi Sport','UQi GT Pro'],
  'Norco': ['Fluid HT 2','Optic C3','Sight C3'],
  'Nukeproof': ['Giga 275','Mega 275 Comp','Scout 275 Sport'],
  'OKAI': ['EA10C Ceetle Pro','ES10 Lite','ES20','ES30','ES30 Neon Pro','ES35'],
  'Okinawa': ['Dual','Evo','i-Praise','Lite','R30','Ridge'],
  'Ola Electric': ['S1 Air','S1 Pro','S1 X','S1 X+'],
  'Orbea': ['Alma M25','Gain M30i','Orca M31'],
  'Orcal': ['Astor','Ecooter E2R'],
  'Pegasus': ['Piazza E9','Premio E10','Solero E8 Plus'],
  'Piaggio': ['1 Active','1 Outfit','Liberty S','MP3'],
  'Pinarello': ['Dogma F','Paris','Prince'],
  'Pivot': ['Mach 4 SL','Shadowcat','Trail 429'],
  'Polygon': ['Heist X5','Premier X5','Siskiu T8','Syncline 5','Xtrada 7'],
  'Pride': ['Brave R1 29','Brave Team 29','Flame','Journey 1.0','Rocket','Savage 27.5'],
  'PRIME3': ['ESA21GY','ESA32GY','ESA33GY','ESA34GY'],
  'ProCraft': ['DS500L'],
  'Proove': ['City Max','Dual Sport','Explorer','X-City Max','X-City Pro','X-City Pro Max'],
  'Raleigh': ['Mustang','Pioneer','Stuntman'],
  'Randride': ['G100','TX90 Max','YG90'],
  'Razor': ['E Prime','E100','E200','E300','Power Core E100','Power Core E90'],
  'Red Bull': ['Skate Electric','Urban'],
  'Revolt': ['RV300','RV400'],
  'RGNT': ['No.1 Classic','No.1 Scrambler'],
  'Richbit': ['RT-011','RT-012','RT-023'],
  'Ridley': ['Fenix SLiC','Kanzo Fast','Noah Fast'],
  'Rieju': ['MRT','Nuuk Cargo','Nuuk City'],
  'Riese & Müller': ['Charger3 GT','Homage3','Load 75','Nevo3 GT','Supercharger3'],
  'Rocky Mountain': ['Altitude 50','Fusion 30','Thunderbolt 30'],
  'Romet': ['Orkan 7','R922','R926'],
  'Rooder': ['Chopper 3000W','City 1500W','Fat 2000W','MTB 750W'],
  'Ruitoo': ['T3PRO','T5','T7 Pro'],
  'Samebike': ['LO26-II','MY-SM26','RS-A01','RS-A08','SB-686MT'],
  'Santa Cruz': ['Blur','Bronson C','Hightower C','Megatower'],
  'Scott': ['Addict RC 20','Aspect 970','Genius 930','Scale 960','Scale 970','Spark RC 900 Pro','Speedster 40'],
  'Seev': ['Seev 1500W','Seev Pro'],
  'Segway': ['Apex Max','E110SE','E125S','E300SE'],
  'Sencor': ['SBM 02','SBM 03 Plus','SBM 04','SBM 500'],
  'Sharp': ['SHA-ES101','SHA-ES201','SHA-ES301','SHA-ES401'],
  'Silence': ['S01','S01+','S02','S04'],
  'Sondors': ['Metacycle'],
  'SPARK': ['Compact 14','Spark 48V 400W'],
  'Specialized': ['Allez','Allez Elite','Allez Sport','Diverge Base Carbon','Diverge Comp Carbon','Enduro Comp','Enduro Expert','Epic Evo','Epic Expert','Rockhopper Comp','Rockhopper Sport','Roubaix Comp','Roubaix Sport','Sirrus X 3.0','Sirrus X 4.0','Stumpjumper Comp','Stumpjumper EVO Comp','Tarmac SL7 Expert'],
  'Speedway': ['5 Pro','Leger','Leger Pro','Mini 4 Pro','Phantom V3'],
  'Spelli': ['SPC-4200','SPX-5200','SPX-6000'],
  'Stark': ['VARG EX 450','VARG MX 450'],
  'Stern': ['Advance 29','Power 26','Rocket 27.5'],
  'Stevens': ['Jura CF','Super Prestige','Tactic'],
  'Stromer': ['ST2 S','ST3','ST5','ST7'],
  'Super Soco': ['CPX','CPX Pro','CUx','TC','TC Max','TC Wanderer','TS Street Hunter','VS2'],
  'Sur Ron': ['Light Bee','Light Bee S','Light Bee X','Storm Bee','Ultra Bee'],
  'Swagtron': ['Swagboard Elite','Swagger 5 Elite','Swagger 5 Pro','Swagger 7'],
  'SYM': ['Husky','iFlow','Jet e+','Mio 110e'],
  'Talaria': ['Sting','Sting MX3','Sting MX3 Pro','Sting R','Sting R MX4','Sting X3+'],
  'Tarform': ['Luna Roadster','Luna Scrambler'],
  'Tecros': ['E9 MAX PRO','F1 500W 20','F1 Dual 20','F2 500W 20','Limousine 4000W','S01 2400W','S02','S03 3000W','T03 Plus 6000W','T4 PRO','V8 Pro','V9 Pro','X9 Dual'],
  'Tenways': ['AGO T','AGO Z','CGO20 Pro','CGO600 Pro','CGO800S'],
  'Tern': ['Fastrack','GSD S10','HSD S11','Quick Haul','Vektron S10'],
  'Tesla (scooter)': ['"16000" 48V','20000 NEW 2025','26000','4000 60V'],
  'Tesla (самокат)': ['"16000" 48V','20000 NEW 2025','26000','4000 60V'],
  'Torrot': ['Adventure','Futura','Muvi'],
  'Transition': ['Patrol','Scout','Sentinel','Smuggler','Spire'],
  'Trek': ['Checkpoint ALR 4','Checkpoint ALR 5','Checkpoint SL 5','Checkpoint SL 6','CrossRip 1','Domane AL 2','Domane AL 3','Domane AL 5','Domane SL 5','Domane SL 6','Dual Sport 2','Dual Sport 3','Emonda ALR 5','Emonda SL 5','Emonda SL 6','Fuel EX 5','Fuel EX 7','Fuel EX 8','Fuel EX 9.5','FX 3','FX Sport 4','FX Sport 6','Madone SL 5','Marlin 4','Marlin 5','Marlin 6','Marlin 7','Marlin 8','Procaliber 9.5','Procaliber 9.7','Rail 7','Rail 9.7','Roscoe 6','Roscoe 8','Slash 5','Slash 7','Slash 9','Supercaliber 9.6','Top Fuel 5','Top Fuel 8','Verve 1','Verve 2','X-Caliber 7','X-Caliber 8','X-Caliber 9'],
  'Turboant': ['D3F','M10 Lite','M10 Pro','Thunder T1','Thunder T1 Pro','V8','X7 Max','X7 Pro'],
  'Ultraviolette': ['F77 Mach 2','F77 Recon'],
  'Univega': ['Alpina Pro','Via Palermo','Via Uno'],
  'VanMoof': ['A5','S5'],
  'Velowave': ['Ghost','Prado','Ranger','Ranger Fat'],
  'Verge': ['TS','TS Pro','TS Ultra'],
  'Vespa Electric': ['Elettrica 45','Elettrica 70','Elettrica L3'],
  'Vitus': ['Energie','Escarpe','Mythique','Sommet','Zenium'],
  'Vmoto': ['CPX','CUX','TS2'],
  'VNC': ['E-Booster A7'],
  'Voltronic': ['Kentor 500W 27.5','Kentor 750W 29'],
  'Vortex': ['CY-E','MX-E','Speed Pro'],
  'Vsett': ['10+','10+ Pro','11+','8','8+','9+','9+ Pro'],
  'Vuka': ['Vuka 1500W','Vuka Pro'],
  'W-TEC': ['eCity W-2000','eDirt W-8011','eSportway W-8000'],
  'Wegoboard': ['City Pro','Sport','X-Urban'],
  'Whyte': ['G-150 S','G-150 Works','G-170','T-130 S','T-140 S'],
  'Wilier': ['Filante SLR','Jena','Zero SLR'],
  'Winner': ['Fighter','Grace','Street'],
  'Winora': ['Sinus N8','Tria N8','Yakun 10','Yakun 12','Yucatan 12'],
  'Wolf Warrior': ['Wolf King GT','Wolf King GT Pro','Wolf Warrior 11','Wolf Warrior 11+'],
  'X-Scooter': ['EKAM PRO 2x2500W','Pro 1000W'],
  'Xiaomi': ['Mi Electric Scooter 1S','Mi Electric Scooter 3','Mi Electric Scooter 3 Lite','Mi Electric Scooter 4','Mi Electric Scooter 4 Lite','Mi Electric Scooter 4 Lite Gen2','Mi Electric Scooter 4 Pro','Mi Electric Scooter 4 Pro 2nd Gen','Mi Electric Scooter 4 Ultra','Mi Electric Scooter 5','Mi Electric Scooter 5 Pro','Mi Electric Scooter Elite GL','Mi Electric Scooter Essential','Mi Electric Scooter Pro 2','Redmi Electric Scooter 3'],
  'Yadea': ['C1S','C1S Pro','EPOC','EPOC Pro','G5','G5 Max','G5 Sport','G5S','G6','G6 Pro','KS5 Pro','LUNA','RN','S-Like','T2','T9','T9 Pro','Vfly','YADEA G5S','YADEA KS6 Pro','YADEA T9','Z3','Zuma'],
  'Yamaha': ['E01','EC-05','EMF','NEOs'],
  'Yeti': ['SB100','SB115','SB130','SB150'],
  'Yuba': ['Boda Boda','Cargo Bike','Fastrack','Spicy Curry'],
  'Zero': ['DS','DSR','DSR/X','FXE','S ZF14.4','SR/F','SR/S'],
  'Zero Motorcycles': ['DS ZF14.4','DSR Black Forest','DSR ZF14.4','DSR/X','DSR/X Premium','FX ZF14.4','FX ZF7.2','FXE','FXS ZF3.6','S ZF14.4','S ZF7.2','SR ZF14.4','SR/F','SR/F Premium','SR/S','SR/S Premium'],
  'Kukirin': ['A1','C1 Pro','G2','G2 Pro','G2 Max','G2 Master','G2 Master Dual','G2 Ultra','G3','G3 Pro','G3 Pro Dual','G4','G4 Max','M4','M4 Pro','M4 Pro Plus','M4 Max','M5','M5 Pro','S1 Max','S3 Pro','S9','T3','V2','X1'],
  'KuKirin': ['A1','C1 Pro','G2','G2 Pro','G2 Max','G2 Master','G2 Master Dual','G2 Ultra','G3','G3 Pro','G3 Pro Dual','G4','G4 Max','M4','M4 Pro','M4 Pro Plus','M4 Max','M5','M5 Pro','S1 Max','S3 Pro','S9','T3','V2','X1'],
  'iScooter': ['i8','i9','i9 Max','i9 Pro','iX3','iX4','iX5','iX6','iX8'],
  'isinwheel': ['S6','S9 Max','S9 Pro','S10 Max','GT2'],
  'Ausom': ['L1','L2','L2 Dual Motor','L2 Max','R1'],
  'Yume': ['D4+','D5','M12','M13 Pro','S10','X7','X11','X11+','X13'],
  'HALO KNIGHT': ['T104','T108','T108 Pro'],
  'Kamikaze': ['K1 800W','K2 1000W','K3 1200W'],
  'Hover-1': ['Alpha','Altai','Altai Pro','Blackhawk','Eclipse','Jive'],
  'IDEMO': ['City 8.5','Max Pro','Ultra 10'],
  'Best Scooter': ['A5','A6','A7 Pro','A9 Max','T8','T10'],
  'ENGWE': ['C20','C20 Pro','Engine Pro','EP-2 Pro','L20','M20','P26','P275 ST','S6','T14','X26'],
  'ADO': ['A16','A16 XE','A20','A20 Air','A20F','A20F Beast','A26','A26S XE','A28','DECE 300','E28 XE Pro'],
  'DYU': ['A1F','A1F Pro','C6','D2F','D3F','FF500','HF01','King 750','R1','T1','V6'],
  'ENGOO': ['V20 Enduro','V20 Pro','C20 City'],
  'BearEbike': ['Bear 1000','Bear 750','Grizzly','Kodiak'],
  'Booster': ['Cruiser 750W','MTB 500W','Pro 1000W','Tour 350W'],
  'COSWHEEL': ['CT20','FTN T20R','GT20','T20','T20R'],
  'CMACEWHEEL': ['GW20','KS26','RX20','T20','Y20'],
  'Cysum': ['CM520','M520','M900','M999'],
  'CROSSRIDE': ['E-CROSS 350W','E-FAT 500W','E-MTB 750W','Navigator 350W'],
  'Velotrade': ['City E-Bike 350W','Fat E-Bike 500W','MTB E-Bike 750W','Touring 350W'],
  'ROYALBABY': ['Chipmunk 12','Chipmunk 14','Chipmunk 16','Freestyle 12','Freestyle 14','Freestyle 16','Freestyle 18','Freestyle 20','Galaxy Fleet 14','Galaxy Fleet 16','Galaxy Fleet 18','LITTLE SWAN 16','LITTLE SWAN 18','Space Shuttle 14','Space Shuttle 16','Space Shuttle 18'],
  'Polygon': ['Cascade 3','Heist X5','Monarch 5','Premier 4','Premier 5','Siskiu D5','Siskiu D7','Siskiu T8','Syncline 5','Xtrada 5','Xtrada 7'],
  'Horwin': ['CR6','CR6 Pro','EK1','EK3','SK1','SK3'],
  'Eleek': ['Atom','Atom Military','Enduro']
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
  _autoFillTitle();
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
  _autoFillTitle();
}

function _autoFillTitle() {
  // Не автозаповнювати при редагуванні
  if (typeof _editListingId !== 'undefined' && _editListingId) return;
  var titleEl = document.getElementById('new-title');
  if (!titleEl || titleEl.value.trim()) return; // не перезаписувати якщо вже заповнено
  var brandEl = document.getElementById('new-brand');
  var customBrand = document.getElementById('new-brand-custom');
  var modelInp = document.getElementById('new-model');

  var brand = (brandEl && brandEl.value === 'Інший бренд' && customBrand)
    ? customBrand.value.trim()
    : (brandEl ? brandEl.value : '');
  var model = modelInp ? modelInp.value.trim() : '';

  if (!brand || brand === 'Інший бренд') return;

  var catPrefix = {
    'Електросамокати': 'Електросамокат',
    'Велосипеди': 'Велосипед',
    'Електровелосипеди': 'Електровелосипед',
    'Електроскутери': 'Електроскутер',
    'Електромотоцикли': 'Електромотоцикл',
  };
  var prefix = catPrefix[addSelectedCat] || '';
  var parts = [prefix, brand, model].filter(Boolean);
  if (parts.length >= 2) titleEl.value = parts.join(' ');
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
    var prevBrand = bs ? bs.value : '';
    bs.innerHTML = (ADD_BRANDS[addSelectedCat] || []).map(b => `<option>${b}</option>`).join('');
    // Відновити попередній вибір якщо він був
    if (prevBrand) {
      var found = false;
      Array.from(bs.options).forEach(function(opt) { if (opt.value === prevBrand) { bs.value = prevBrand; found = true; } });
      if (!found) bs.selectedIndex = 0;
    }
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
  var _up = (typeof uploadedPhotos !== "undefined" && uploadedPhotos.length > 0) ? uploadedPhotos : (window.uploadedPhotos || []);
  const photos = _up.length;

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
  _processPhotoFiles(files);
  event.target.value = '';
}

function _processPhotoFiles(files) {
  var remaining = 10 - uploadedPhotos.length;
  if (remaining <= 0) { showToast('⚠️ Максимум 10 фото'); return; }
  var validFiles = files.slice(0, remaining).filter(function(file) {
    if (!file.type.startsWith('image/')) {
      showToast('⚠️ ' + file.name + ' — не зображення');
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('⚠️ ' + file.name + ' перевищує 10 МБ');
      return false;
    }
    return true;
  });
  if (!validFiles.length) return;

  // Показати індикатор
  var trigger = document.getElementById('upload-trigger');
  if (trigger) trigger.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="font-size:24px;color:var(--brand)"></i><p>Обробка фото...</p>';

  var processed = 0;
  validFiles.forEach(function(file) {
    compressImage(file, 1600, 1600, 0.88).then(function(blob) {
      var url = URL.createObjectURL(blob);
      uploadedPhotos.push({ blob: blob, preview: url, uploaded: false, storageUrl: null });
      window.uploadedPhotos = uploadedPhotos;
      processed++;
      if (processed === validFiles.length) {
        renderPhotoGrid();
        // Відновити upload area
        if (trigger && uploadedPhotos.length < 10) {
          trigger.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i><p>Клікніть або перетягніть фото<br><small>JPG, PNG — до 10 фото, кожне до 10 МБ</small></p>';
        }
      }
    });
  });
}

// Drag-and-drop для фото
function _initPhotoDragDrop() {
  var area = document.getElementById('upload-trigger');
  if (!area || area._dragInit) return;
  area._dragInit = true;

  area.addEventListener('dragover', function(e) {
    e.preventDefault();
    e.stopPropagation();
    area.style.borderColor = 'var(--brand)';
    area.style.background = 'var(--brand-dim, rgba(0,200,83,0.08))';
  });
  area.addEventListener('dragleave', function(e) {
    e.preventDefault();
    area.style.borderColor = '';
    area.style.background = '';
  });
  area.addEventListener('drop', function(e) {
    e.preventDefault();
    e.stopPropagation();
    area.style.borderColor = '';
    area.style.background = '';
    var files = Array.from(e.dataTransfer.files);
    if (files.length) _processPhotoFiles(files);
  });
}

// Ініціалізувати drag-drop коли DOM готовий
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _initPhotoDragDrop);
} else {
  _initPhotoDragDrop();
}
// Також при SPA-переходах
var _ddObserver = new MutationObserver(function() { _initPhotoDragDrop(); });
var _addPage = document.getElementById('page-add');
if (_addPage) _ddObserver.observe(_addPage, { childList: true, subtree: true });

function renderPhotoGrid() {
  const grid = document.getElementById('photo-grid');
  if (!grid) return;
  grid.innerHTML = uploadedPhotos.map(function(item, i) {
    var src = typeof item === 'string' ? item : (item.preview || item.storageUrl || '');
    if (!src) return '';
    return '<div class="photo-thumb-wrap" draggable="true" data-idx="' + i + '"' +
      ' ondragstart="_photoDragStart(event,' + i + ')"' +
      ' ondragover="_photoDragOver(event)"' +
      ' ondrop="_photoDrop(event,' + i + ')"' +
      ' ondragend="_photoDragEnd(event)"' +
      ' style="cursor:grab;position:relative">' +
      '<img src="' + src + '" alt="Фото ' + (i+1) + '" loading="lazy" decoding="async" style="pointer-events:none">' +
      (i===0 ? '<div class="photo-main-badge">Головне</div>' : '') +
      '<button class="remove-photo" onclick="event.stopPropagation();removePhoto(' + i + ')">×</button>' +
      '<div style="position:absolute;bottom:4px;left:4px;background:rgba(0,0,0,.5);color:#fff;font-size:10px;padding:2px 6px;border-radius:4px;pointer-events:none">' + (i+1) + '</div>' +
      '</div>';
  }).join('');
  var trigger = document.getElementById('upload-trigger');
  if (trigger) trigger.style.display = uploadedPhotos.length >= 10 ? 'none' : '';
}

var _photoDragIdx = -1;

function _photoDragStart(e, idx) {
  _photoDragIdx = idx;
  e.target.style.opacity = '0.4';
  e.dataTransfer.effectAllowed = 'move';
}

function _photoDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  var wrap = e.target.closest('.photo-thumb-wrap');
  if (wrap) wrap.style.outline = '2px solid var(--brand, #00c853)';
}

function _photoDragEnd(e) {
  e.target.style.opacity = '1';
  document.querySelectorAll('.photo-thumb-wrap').forEach(function(el) { el.style.outline = ''; });
}

function _photoDrop(e, targetIdx) {
  e.preventDefault();
  var wrap = e.target.closest('.photo-thumb-wrap');
  if (wrap) wrap.style.outline = '';
  if (_photoDragIdx < 0 || _photoDragIdx === targetIdx) return;
  // Поміняти місцями
  var moved = uploadedPhotos.splice(_photoDragIdx, 1)[0];
  uploadedPhotos.splice(targetIdx, 0, moved);
  window.uploadedPhotos = uploadedPhotos;
  _photoDragIdx = -1;
  renderPhotoGrid();
  showToast('📸 Порядок фото змінено');
}

function removePhoto(i) {
  uploadedPhotos.splice(i, 1); window.uploadedPhotos = uploadedPhotos;
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

