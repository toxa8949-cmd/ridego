/* RideGO адмінка — ядро.
   Firebase, вхід, дані, маршрутизація, діалоги, дрібні утиліти.
   Інші файли реєструють свої сторінки через A.page() і дії через A.act(). */
'use strict';

var A = window.A = {
  data: { users: [], listings: [], services: [], reports: [], feedback: [], reviews: [], news: [], logs: null },
  pages: {},
  actions: {},
  tables: {},
  current: null,
  loadedAt: 0
};

// ── Firebase ────────────────────────────────────────────────
firebase.initializeApp({
  apiKey: 'AIzaSyA49XBAsQnx919_85FY3IsP6djCcMX7nIs',
  authDomain: 'ridego-6f981.firebaseapp.com',
  projectId: 'ridego-6f981',
  storageBucket: 'ridego-6f981.firebasestorage.app',
  messagingSenderId: '769845611953',
  appId: '1:769845611953:web:d21b7cf32f5fae84888190',
  databaseURL: 'https://ridego-6f981-default-rtdb.europe-west1.firebasedatabase.app'
});
A.db = firebase.firestore();
A.auth = firebase.auth();
A.rtdb = firebase.database ? firebase.database() : null; // лише для «онлайн зараз»
A.FV = firebase.firestore.FieldValue;
A.SITE = 'https://www.ridego.com.ua';

// ── Утиліти ─────────────────────────────────────────────────
A.$ = function (id) { return document.getElementById(id); };

A.esc = function (s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
};

// Секунди з будь-якого формату дати, що трапляється в базі.
A.sec = function (v) {
  if (!v) return 0;
  if (typeof v.seconds === 'number') return v.seconds;
  if (typeof v.toDate === 'function') return Math.floor(v.toDate().getTime() / 1000);
  if (v instanceof Date) return Math.floor(v.getTime() / 1000);
  if (typeof v === 'number') return v > 1e12 ? Math.floor(v / 1000) : v;
  if (typeof v === 'string') { var t = Date.parse(v); return isNaN(t) ? 0 : Math.floor(t / 1000); }
  return 0;
};
A.date = function (v) {
  var s = A.sec(v); if (!s) return '—';
  return new Date(s * 1000).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: '2-digit' });
};
A.dateTime = function (v) {
  var s = A.sec(v); if (!s) return '—';
  return new Date(s * 1000).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
};
A.ago = function (v) {
  var s = A.sec(v); if (!s) return '';
  var d = Math.floor(Date.now() / 1000) - s;
  if (d < 60) return 'щойно';
  if (d < 3600) return Math.floor(d / 60) + ' хв тому';
  if (d < 86400) return Math.floor(d / 3600) + ' год тому';
  if (d < 86400 * 30) return Math.floor(d / 86400) + ' дн тому';
  return A.date(v);
};
A.num = function (n) { return (Number(n) || 0).toLocaleString('uk-UA'); };
A.money = function (n) { return n ? A.num(n) + ' грн' : '—'; };
A.startOfDay = function (daysAgo) {
  var d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (daysAgo || 0));
  return Math.floor(d.getTime() / 1000);
};
A.plural = function (n, one, few, many) {
  var m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
};

// Мініатюра з Cloudinary замість повнорозмірного фото.
A.thumb = function (url, size) {
  url = String(url || '');
  if (url.indexOf('res.cloudinary.com') === -1 || url.indexOf('/upload/') === -1) return url;
  return url.replace('/upload/', '/upload/c_fill,w_' + size + ',h_' + size + ',q_auto,f_auto/');
};
A.listingPhotos = function (l) {
  var arr = Array.isArray(l.imgs) ? l.imgs.filter(Boolean) : [];
  if (!arr.length && l.img) arr = [l.img];
  return arr;
};

A.userById = function (uid) {
  for (var i = 0; i < A.data.users.length; i++) if (A.data.users[i].id === uid) return A.data.users[i];
  return null;
};
A.listingById = function (id) {
  for (var i = 0; i < A.data.listings.length; i++) if (A.data.listings[i].id === id) return A.data.listings[i];
  return null;
};
A.userName = function (u) { return u ? (u.name || u.displayName || u.email || u.id) : '—'; };

// Після запису оновлюємо локальну копію, щоб не перечитувати всю базу.
A.patch = function (coll, id, fields) {
  var arr = A.data[coll] || [];
  var now = { seconds: Math.floor(Date.now() / 1000) };
  var clean = {};
  Object.keys(fields).forEach(function (k) {
    var v = fields[k];
    if (v && typeof v === 'object' && typeof v.isEqual === 'function' && !(v instanceof firebase.firestore.Timestamp)) {
      // FieldValue: serverTimestamp → «зараз», delete → прибрати поле.
      // increment викликач має підставити сам.
      clean[k] = v.isEqual(A.FV.serverTimestamp()) ? now : undefined;
      return;
    }
    clean[k] = v;
  });
  for (var i = 0; i < arr.length; i++) {
    if (arr[i].id === id) {
      Object.keys(clean).forEach(function (k) {
        if (clean[k] === undefined) delete arr[i][k]; else arr[i][k] = clean[k];
      });
      return arr[i];
    }
  }
  return null;
};

// ── Сповіщення ─────────────────────────────────────────────
A.toast = function (msg, isError) {
  var box = A.$('toasts');
  var t = document.createElement('div');
  t.className = 'toast' + (isError ? ' err' : '');
  t.textContent = msg;
  box.appendChild(t);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(function () { t.style.opacity = '0'; setTimeout(function () { t.remove(); }, 300); }, isError ? 6000 : 3000);
};
A.fail = function (e) {
  console.error(e);
  var code = e && e.code;
  var msg = code === 'permission-denied' ? 'Немає прав на цю дію'
          : code === 'unavailable' ? 'Немає з\'єднання з базою'
          : (e && e.message) || String(e);
  A.toast('Помилка: ' + msg, true);
};

// ── Журнал дій ─────────────────────────────────────────────
A.log = function (type, details) {
  var u = A.auth.currentUser;
  var entry = {
    type: type,
    details: String(details || '').slice(0, 500),
    adminEmail: u ? (u.email || u.uid) : 'admin',
    createdAt: A.FV.serverTimestamp()
  };
  A.db.collection('adminLogs').add(entry).catch(function () {});
  if (A.data.logs) A.data.logs.unshift(Object.assign({ id: 'local' + Date.now() }, entry, { createdAt: { seconds: Math.floor(Date.now() / 1000) } }));
};

// ── Діалог ─────────────────────────────────────────────────
// A.dialog({ title, body, wide, buttons:[{label, value, primary, danger, left}], onSubmit(value, bodyEl) })
// onSubmit може повернути false (або Promise<false>), щоб лишити вікно відкритим.
// Результат — Promise зі значенням натиснутої кнопки або null.
A.dialog = function (o) {
  var dlg = A.$('dlg');
  if (dlg.open) dlg.close();
  A.$('dlg-title').textContent = o.title || '';
  A.$('dlg-body').innerHTML = o.body || '';
  dlg.classList.toggle('wide', !!o.wide);

  var foot = A.$('dlg-foot');
  foot.innerHTML = '';
  var buttons = o.buttons || [{ label: 'Закрити', value: null }];

  return new Promise(function (resolve) {
    var done = false;
    function finish(v) {
      if (done) return;
      done = true;
      dlg.removeEventListener('close', onClose);
      if (dlg.open) dlg.close();
      resolve(v);
    }
    // Запізніле «close» від попереднього вікна приходить, коли нове вже відкрите — його ігноруємо.
    function onClose() { if (dlg.open) return; finish(null); }
    dlg.addEventListener('close', onClose);

    buttons.forEach(function (b) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn' + (b.primary ? ' btn-primary' : '') + (b.danger ? ' btn-danger' : '') + (b.left ? ' left' : '');
      btn.textContent = b.label;
      btn.addEventListener('click', function () {
        if (b.value == null) return finish(null);
        if (!o.onSubmit) return finish(b.value);
        var all = foot.querySelectorAll('button');
        all.forEach(function (x) { x.disabled = true; });
        Promise.resolve()
          .then(function () { return o.onSubmit(b.value, A.$('dlg-body')); })
          .then(function (ok) {
            all.forEach(function (x) { x.disabled = false; });
            if (ok !== false) finish(b.value);
          }, function (e) {
            all.forEach(function (x) { x.disabled = false; });
            A.fail(e);
          });
      });
      foot.appendChild(btn);
    });

    dlg.showModal();
    var first = A.$('dlg-body').querySelector('input:not([type=hidden]):not([readonly]), textarea, select');
    if (first && !o.noFocus) first.focus();
    if (o.onOpen) o.onOpen(A.$('dlg-body'));
  });
};

A.confirm = function (text, opts) {
  opts = opts || {};
  return A.dialog({
    title: opts.title || 'Підтвердження',
    body: '<p>' + A.esc(text) + '</p>' + (opts.extra || ''),
    noFocus: true,
    buttons: [
      { label: 'Скасувати', value: null },
      { label: opts.ok || 'Так', value: 'ok', primary: !opts.danger, danger: !!opts.danger }
    ]
  }).then(function (v) { return v === 'ok'; });
};

// Значення поля з діалогу за name.
A.val = function (root, name) {
  var el = root.querySelector('[name="' + name + '"]');
  if (!el) return '';
  if (el.type === 'checkbox') return el.checked;
  return el.value.trim();
};

// ── Таблиці з сортуванням і «показати ще» ──────────────────
// cols: [{ key, label, sort:true, cls, get(row) }]
A.table = function (id, cfg) {
  var st = A.tables[id] || (A.tables[id] = { sort: cfg.sort || null, dir: cfg.dir || -1, limit: cfg.pageSize || 100 });
  var rows = cfg.rows.slice();
  if (st.sort) {
    var col = cfg.cols.filter(function (c) { return c.key === st.sort; })[0];
    var get = (col && col.get) || function (r) { return r[st.sort]; };
    rows.sort(function (a, b) {
      var x = get(a), y = get(b);
      if (x == null) x = ''; if (y == null) y = '';
      if (typeof x === 'string') x = x.toLowerCase();
      if (typeof y === 'string') y = y.toLowerCase();
      return x < y ? -st.dir : x > y ? st.dir : 0;
    });
  }
  var head = '<thead><tr>' + cfg.cols.map(function (c) {
    var dir = st.sort === c.key ? '<span class="dir">' + (st.dir > 0 ? '↑' : '↓') + '</span>' : '';
    return '<th' + (c.cls ? ' class="' + c.cls + '"' : '') + (c.sort ? ' data-sort="' + c.key + '" data-table="' + id + '"' : '') + '>' + c.label + dir + '</th>';
  }).join('') + '</tr></thead>';
  var shown = rows.slice(0, st.limit);
  var body = shown.length
    ? shown.map(cfg.row).join('')
    : '<tr class="empty"><td colspan="' + cfg.cols.length + '">' + (cfg.empty || 'Нічого немає') + '</td></tr>';
  A.$(cfg.el).innerHTML = head + '<tbody>' + body + '</tbody>';
  if (cfg.more) {
    A.$(cfg.more).innerHTML = rows.length > shown.length
      ? '<button class="btn btn-sm" data-act="more" data-table="' + id + '">Показати ще (' + (rows.length - shown.length) + ')</button>'
      : '';
  }
  return rows.length;
};

// ── Сторінки і дії ─────────────────────────────────────────
A.page = function (name, def) { A.pages[name] = def; };
A.act = function (name, fn) { A.actions[name] = fn; };

A.render = function () {
  var p = A.pages[A.current];
  if (p && p.render) {
    try { p.render(); } catch (e) { console.error(e); }
  }
  A.renderCounts();
};

A.go = function (name) {
  if (!A.pages[name]) name = 'overview';
  A.current = name;
  document.querySelectorAll('.page').forEach(function (s) { s.hidden = s.id !== 'page-' + name; });
  document.querySelectorAll('#nav a').forEach(function (a) { a.classList.toggle('on', a.getAttribute('data-page') === name); });
  A.$('page-title').textContent = A.pages[name].title;
  document.title = A.pages[name].title + ' · RideGO адмінка';
  A.$('side').classList.remove('open');
  if (A.pages[name].enter) A.pages[name].enter();
  A.render();
  window.scrollTo(0, 0);
};

A.renderCounts = function () {
  var d = A.data;
  var c = {
    listings: d.listings.filter(function (l) { return l.status === 'active'; }).length,
    users: d.users.length,
    reports: d.reports.filter(function (r) { return r.status !== 'resolved'; }).length,
    feedback: d.feedback.filter(function (f) { return (f.status || 'new') === 'new'; }).length,
    services: d.services.length,
    reviews: d.reviews.length,
    news: d.news.length
  };
  document.querySelectorAll('[data-count]').forEach(function (b) {
    var v = c[b.getAttribute('data-count')];
    b.textContent = v ? v : (b.classList.contains('hot') ? '' : '0');
  });
  if (A.loadedAt) A.$('updated').textContent = 'дані на ' + new Date(A.loadedAt).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
};

// ── Завантаження даних ─────────────────────────────────────
// Раніше вся база перечитувалась кожні 30 секунд — тисячі читань на годину
// просто від відкритої вкладки. Тепер: один раз при вході, кнопка «Оновити»
// і тихе оновлення раз на 10 хвилин, лише коли вкладка на екрані.
function _all(coll, q) {
  return (q || A.db.collection(coll)).get().then(function (s) {
    return s.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
  });
}
A.load = function () {
  var btn = A.$('refresh-btn');
  btn.disabled = true; btn.textContent = 'Оновлення…';
  var jobs = {
    users: _all('users'),
    listings: _all('listings'),
    services: _all('services'),
    reports: _all('reports'),
    feedback: _all('feedback', A.db.collection('feedback').orderBy('createdAt', 'desc').limit(300)),
    reviews: _all('reviews'),
    news: _all('news', A.db.collection('news').orderBy('createdAt', 'desc'))
  };
  var keys = Object.keys(jobs);
  return Promise.all(keys.map(function (k) {
    return jobs[k].then(function (rows) { A.data[k] = rows; }, function (e) { console.error(k, e); throw { coll: k, e: e }; });
  }).map(function (p) { return p.catch(function (x) { return x; }); }))
    .then(function (res) {
      var errs = res.filter(Boolean);
      if (errs.length) A.toast('Не завантажилось: ' + errs.map(function (x) { return x.coll; }).join(', '), true);
      A.loadedAt = Date.now();
      A.data.logs = null; // журнал перечитується при відкритті
      if (A.reloadTraffic) A.reloadTraffic();
      A.render();
    })
    .finally(function () { btn.disabled = false; btn.textContent = 'Оновити'; });
};

// ── Вхід ────────────────────────────────────────────────────
function showLogin(msg) {
  A.$('boot').hidden = true;
  A.$('app').hidden = true;
  A.$('login').hidden = false;
  var err = A.$('login-error');
  err.hidden = !msg;
  err.textContent = msg || '';
  var b = A.$('login-submit'); b.disabled = false; b.textContent = 'Увійти';
}
function authMessage(e) {
  var c = e && e.code;
  if (c === 'auth/invalid-credential' || c === 'auth/wrong-password' || c === 'auth/user-not-found' || c === 'auth/invalid-login-credentials') return 'Невірний email або пароль';
  if (c === 'auth/too-many-requests') return 'Забагато спроб. Спробуйте за кілька хвилин.';
  if (c === 'auth/popup-closed-by-user' || c === 'auth/cancelled-popup-request') return '';
  if (c === 'auth/network-request-failed') return 'Немає з\'єднання';
  return (e && e.message) || 'Не вдалося увійти';
}

var _refreshTimer = null;
var _loginMsg = '';
A.auth.onAuthStateChanged(function (user) {
  // signOut() теж викликає цей обробник — не губимо пояснення, чому вийшли.
  if (!user) { showLogin(_loginMsg); _loginMsg = ''; return; }
  A.db.collection('admins').doc(user.uid).get().then(function (snap) {
    if (!snap.exists) {
      _loginMsg = 'Акаунт ' + (user.email || user.uid) + ' не має доступу до адмінки.';
      A.auth.signOut();
      return;
    }
    A.$('boot').hidden = true;
    A.$('login').hidden = true;
    A.$('app').hidden = false;
    A.$('me').textContent = user.displayName ? user.displayName + ' · ' + (user.email || '') : (user.email || user.uid);
    A.go((location.hash || '#overview').slice(1));
    A.load();
    clearInterval(_refreshTimer);
    _refreshTimer = setInterval(function () {
      if (document.visibilityState === 'visible' && !A.$('dlg').open) A.load();
    }, 10 * 60 * 1000);
  }).catch(function (e) {
    showLogin('Не вдалося перевірити доступ: ' + authMessage(e));
  });
});

A.$('login-form').addEventListener('submit', function (ev) {
  ev.preventDefault();
  var b = A.$('login-submit');
  b.disabled = true; b.textContent = 'Вхід…';
  A.$('login-error').hidden = true;
  A.auth.signInWithEmailAndPassword(A.$('login-email').value.trim(), A.$('login-pass').value)
    .catch(function (e) { A.$('login-pass').value = ''; showLogin(authMessage(e)); });
});
A.act('login-google', function () {
  A.auth.signInWithPopup(new firebase.auth.GoogleAuthProvider())
    .catch(function (e) { var m = authMessage(e); if (m) showLogin(m); });
});
A.act('logout', function () {
  A.confirm('Вийти з адмінки?', { ok: 'Вийти' }).then(function (ok) {
    if (!ok) return;
    clearInterval(_refreshTimer);
    A.auth.signOut();
  });
});

// ── Глобальні дії ──────────────────────────────────────────
A.act('refresh', function () { A.load().then(function () { A.toast('Дані оновлено'); }); });
A.act('menu', function () { A.$('side').classList.toggle('open'); });
A.act('dlg-close', function () { A.$('dlg').close(); });
A.act('more', function (el) {
  var st = A.tables[el.getAttribute('data-table')];
  if (st) { st.limit += 100; A.render(); }
});
A.act('theme', function () {
  var root = document.documentElement;
  var cur = root.getAttribute('data-theme') ||
    (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  var next = cur === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  try { localStorage.setItem('rg_admin_theme', next); } catch (e) {}
});

// Делегування: жодних onclick="…" з підставленими рядками — раніше ім'я
// з апострофом (Мар'яна) ламало кнопку «Баланс».
document.addEventListener('click', function (ev) {
  var th = ev.target.closest('th[data-sort]');
  if (th) {
    var st = A.tables[th.getAttribute('data-table')];
    var key = th.getAttribute('data-sort');
    if (st) {
      if (st.sort === key) st.dir = -st.dir; else { st.sort = key; st.dir = -1; }
      A.render();
    }
    return;
  }
  var el = ev.target.closest('[data-act]');
  if (!el) {
    if (A.$('side').classList.contains('open') && !ev.target.closest('#side')) A.$('side').classList.remove('open');
    return;
  }
  var fn = A.actions[el.getAttribute('data-act')];
  if (!fn) return;
  ev.preventDefault();
  fn(el, el.getAttribute('data-id'));
});
function onFilter(ev) {
  var f = ev.target.getAttribute && ev.target.getAttribute('data-filter');
  if (!f) return;
  // Для поля пошуку — лише input. Інакше «change» при втраті фокусу
  // перемальовує таблицю між mousedown і mouseup, і перший клік по кнопці
  // в результатах пошуку просто губиться.
  if (ev.type === 'change' && ev.target.tagName === 'INPUT') return;
  if (A.tables[f]) A.tables[f].limit = 100;
  if (A.current === f) A.render();
}
document.addEventListener('input', onFilter);
document.addEventListener('change', onFilter);
window.addEventListener('hashchange', function () {
  if (!A.$('app').hidden) A.go(location.hash.slice(1));
});
document.addEventListener('keydown', function (ev) {
  if (ev.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !A.$('dlg').open) {
    var s = document.querySelector('.page:not([hidden]) input[type=search]');
    if (s) { ev.preventDefault(); s.focus(); }
  }
});

// Розподіл для блоків «категорії / міста / бренди».
A.distHtml = function (pairs, total, limit) {
  if (!pairs.length) return '<p class="muted">Немає даних</p>';
  var max = pairs[0][1] || 1;
  return '<ul class="dist">' + pairs.slice(0, limit || 8).map(function (p) {
    var pct = total ? Math.round(p[1] / total * 100) : 0;
    return '<li><span>' + A.esc(p[0]) + '</span><span class="n">' + p[1] + (total ? ' · ' + pct + '%' : '') + '</span>' +
      '<span class="bar"><span style="width:' + Math.max(2, Math.round(p[1] / max * 100)) + '%"></span></span></li>';
  }).join('') + '</ul>';
};
A.countBy = function (rows, get) {
  var m = {};
  rows.forEach(function (r) { var k = get(r); if (k) m[k] = (m[k] || 0) + 1; });
  return Object.keys(m).map(function (k) { return [k, m[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
};
