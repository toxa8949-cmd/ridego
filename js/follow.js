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

