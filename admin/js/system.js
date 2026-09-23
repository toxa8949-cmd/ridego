/* Журнал дій і службові інструменти. */
'use strict';
(function () {
  var LABELS = {
    edit_user: 'Змінено профіль', block_user: 'Заблоковано користувача', unblock_user: 'Розблоковано користувача',
    slots: 'Змінено слоти', balance: 'Змінено слоти', export_users: 'Експорт користувачів',
    edit_listing: 'Змінено оголошення', hide_listing: 'Сховано оголошення', show_listing: 'Показано оголошення',
    delete_listing: 'Видалено оголошення', restore_listing: 'Відновлено оголошення',
    report_hidden: 'Скарга: оголошення сховано', report_deleted: 'Скарга: оголошення видалено',
    report_dismissed: 'Скаргу відхилено', resolve_report: 'Скаргу закрито',
    feedback_status: 'Статус звернення', feedback_reply: 'Відповідь на звернення', feedback_delete: 'Видалено звернення',
    review_delete: 'Видалено відгук', delete_service: 'Видалено сервіс',
    create_news: 'Нова публікація', edit_news: 'Змінено публікацію', delete_news: 'Видалено публікацію',
    publish_news: 'Опубліковано', unpublish_news: 'Знято з публікації',
    backfill_profiles: 'Синхронізація профілів', backfill_brands: 'Заповнення брендів',
    strip_seller_email: 'Прибрано email з оголошень', change_password: 'Змінено пароль', save_settings: 'Налаштування (стара версія)'
  };

  // ── Журнал ────────────────────────────────────────────────
  function loadLog() {
    A.$('g-table').innerHTML = '<tbody><tr class="empty"><td>Завантаження…</td></tr></tbody>';
    A.db.collection('adminLogs').orderBy('createdAt', 'desc').limit(500).get().then(function (s) {
      A.data.logs = s.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
      var sel = A.$('g-type'), cur = sel.value;
      var types = {};
      A.data.logs.forEach(function (l) { if (l.type) types[l.type] = 1; });
      sel.innerHTML = '<option value="">Усі дії</option>' + Object.keys(types).sort().map(function (t) {
        return '<option value="' + A.esc(t) + '">' + A.esc(LABELS[t] || t) + '</option>';
      }).join('');
      sel.value = cur;
      if (A.current === 'log') A.render();
    }, A.fail);
  }

  A.page('log', {
    title: 'Журнал дій',
    enter: function () { if (!A.data.logs) loadLog(); },
    render: function () {
      if (!A.data.logs) return;
      var t = A.$('g-type').value;
      var rows = A.data.logs.filter(function (l) { return !t || l.type === t; });
      var n = A.table('log', {
        el: 'g-table', rows: rows, sort: 'createdAt', pageSize: 100,
        empty: 'Записів немає',
        cols: [
          { key: 'createdAt', label: 'Час', sort: true, get: function (l) { return A.sec(l.createdAt); } },
          { key: 'adminEmail', label: 'Хто', sort: true, cls: 'hide-m' },
          { key: 'type', label: 'Дія', sort: true, get: function (l) { return LABELS[l.type] || l.type || ''; } },
          { key: 'details', label: 'Деталі' }
        ],
        row: function (l) {
          return '<tr><td class="nowrap num">' + A.dateTime(l.createdAt) + '</td>' +
            '<td class="hide-m">' + A.esc(l.adminEmail || '—') + '</td>' +
            '<td class="nowrap">' + A.esc(LABELS[l.type] || l.type || '—') + '</td>' +
            '<td style="word-break:break-word">' + A.esc(l.details || '') + '</td></tr>';
        }
      });
      A.$('g-total').textContent = n + ' ' + A.plural(n, 'запис', 'записи', 'записів') + (A.data.logs.length >= 500 ? ' (останні 500)' : '');
    }
  });

  // ── Інструменти ───────────────────────────────────────────
  function tool(id, title, text, buttons) {
    return '<section class="tool" id="' + id + '"><h2>' + title + '</h2><p>' + text + '</p>' +
      (buttons ? '<div class="tool-acts">' + buttons + '</div>' : '') + '<div class="out"></div></section>';
  }
  function out(id, html) { var el = document.querySelector('#' + id + ' .out'); if (el) el.innerHTML = html; }

  A.page('tools', {
    title: 'Інструменти',
    render: function () {
      if (A.$('tools').childElementCount) { renderFacts(); return; }
      var u = A.auth.currentUser;
      var hasPassword = u && u.providerData.some(function (p) { return p.providerId === 'password'; });
      A.$('tools').innerHTML =
        '<section class="tool"><h2>Стан бази</h2><dl class="facts" id="facts"></dl></section>' +

        tool('t-email', 'Email продавців в оголошеннях',
          'У кожному оголошенні зберігалося поле sellerEmail. Оголошення читає будь-хто, тож пошту продавців можна було витягнути навіть після того, як ми закрили профілі. Сайт це поле ніде не показує. Інструмент видаляє його з усіх оголошень.',
          '<button class="btn" data-act="tool-email" data-mode="check">Перевірити</button><button class="btn btn-primary" data-act="tool-email" data-mode="run" disabled>Прибрати</button>') +

        tool('t-profiles', 'Публічні профілі',
          'Сторінки продавців читають колекцію publicProfiles (ім\'я, місто, фото, телефон — без email). Новий користувач отримує профіль автоматично; тут можна знайти й дописати тих, у кого його немає.',
          '<button class="btn" data-act="tool-profiles" data-mode="check">Перевірити</button><button class="btn btn-primary" data-act="tool-profiles" data-mode="run" disabled>Створити відсутні</button>') +

        tool('t-brands', 'Бренд в оголошеннях',
          'Сторінки брендів шукають поле brand. Інструмент визначає бренд із заголовка для активних оголошень, де його немає. Уже заповнені значення не змінюються.',
          '<button class="btn" data-act="tool-brands" data-mode="check">Перевірити</button><button class="btn btn-primary" data-act="tool-brands" data-mode="run" disabled>Записати</button>') +

        '<section class="tool"><h2>Ваш акаунт</h2>' +
          '<dl class="facts" style="margin-bottom:12px"><dt>Email</dt><dd>' + A.esc(u ? u.email || '—' : '—') + '</dd>' +
          '<dt>Вхід через</dt><dd>' + A.esc(u ? u.providerData.map(function (p) { return p.providerId === 'password' ? 'пароль' : p.providerId === 'google.com' ? 'Google' : p.providerId; }).join(', ') : '—') + '</dd></dl>' +
          (hasPassword
            ? '<button class="btn" data-act="tool-password">Змінити пароль</button>'
            : '<p>Ви входите через Google, тому пароль змінюється в налаштуваннях акаунта Google.</p>') +
        '</section>' +

        '<section class="tool"><h2>Про налаштування</h2><p>Попередня сторінка «Налаштування» (тарифи, стартові слоти, модерація) нікуди не впливала: сайт ці значення не читає, вони задані в його коді. Щоб не вводити в оману, її прибрано. Зміна тарифів чи кількості стартових слотів — це правка коду сайту.</p></section>';
      renderFacts();
    }
  });

  function renderFacts() {
    var d = A.data, el = A.$('facts'); if (!el) return;
    var st = A.countBy(d.listings, function (l) { return l.status || 'без статусу'; });
    el.innerHTML =
      '<dt>Оголошення</dt><dd>' + d.listings.length + ' (' + st.map(function (s) { return A.esc(s[0]) + ': ' + s[1]; }).join(', ') + ')</dd>' +
      '<dt>Користувачі</dt><dd>' + d.users.length + ', з них заблоковано ' + d.users.filter(function (u) { return u.status === 'blocked'; }).length + '</dd>' +
      '<dt>Скарги</dt><dd>' + d.reports.length + '</dd>' +
      '<dt>Звернення</dt><dd>' + d.feedback.length + (d.feedback.length >= 300 ? ' (показано останні 300)' : '') + '</dd>' +
      '<dt>Відгуки</dt><dd>' + d.reviews.length + '</dd>' +
      '<dt>Сервіси</dt><dd>' + d.services.length + '</dd>' +
      '<dt>Новини</dt><dd>' + d.news.length + '</dd>' +
      '<dt>Дані завантажено</dt><dd>' + (A.loadedAt ? new Date(A.loadedAt).toLocaleString('uk-UA') : '—') + '</dd>';
  }

  // Запис пачками по 400 (ліміт Firestore — 500 операцій на batch).
  function inBatches(items, apply, progress) {
    var done = 0, i = 0;
    function next() {
      if (i >= items.length) return Promise.resolve(done);
      var chunk = items.slice(i, i + 400); i += 400;
      var b = A.db.batch();
      chunk.forEach(function (x) { apply(b, x); });
      return b.commit().then(function () { done += chunk.length; if (progress) progress(done); return next(); });
    }
    return next();
  }
  function runBtn(id) { return document.querySelector('#' + id + ' [data-mode="run"]'); }

  // ── sellerEmail ───────────────────────────────────────────
  var emailPlan = null;
  A.act('tool-email', function (el) {
    if (el.getAttribute('data-mode') === 'check') {
      emailPlan = A.data.listings.filter(function (l) { return l.sellerEmail != null; });
      runBtn('t-email').disabled = !emailPlan.length;
      out('t-email', emailPlan.length ? 'Поле є в <b>' + emailPlan.length + '</b> оголошеннях.' : 'Жодне оголошення не містить email. Нічого робити не треба.');
      return;
    }
    if (!emailPlan || !emailPlan.length) return;
    A.confirm('Прибрати email з ' + emailPlan.length + ' оголошень?', { ok: 'Прибрати' }).then(function (ok) {
      if (!ok) return;
      runBtn('t-email').disabled = true;
      inBatches(emailPlan, function (b, l) {
        b.update(A.db.collection('listings').doc(l.id), { sellerEmail: A.FV.delete() });
      }, function (n) { out('t-email', 'Оброблено ' + n + ' з ' + emailPlan.length + '…'); }).then(function (n) {
        emailPlan.forEach(function (l) { delete l.sellerEmail; });
        A.log('strip_seller_email', 'оголошень: ' + n);
        out('t-email', 'Готово: email прибрано з ' + n + ' оголошень.');
        emailPlan = null;
      }, function (e) { out('t-email', ''); A.fail(e); });
    });
  });

  // ── Публічні профілі ─────────────────────────────────────
  var PUBLIC = ['name', 'city', 'oblast', 'raion', 'photoUrl', 'about', 'desc', 'type', 'verified', 'followers',
                'phone', 'company', 'website', 'telegram', 'instagram', 'hours', 'cats', 'listings', 'createdAt'];
  var profPlan = null;
  A.act('tool-profiles', function (el) {
    if (el.getAttribute('data-mode') === 'check') {
      out('t-profiles', 'Перевіряю…');
      A.db.collection('publicProfiles').get().then(function (s) {
        var have = {}; s.forEach(function (d) { have[d.id] = 1; });
        profPlan = A.data.users.filter(function (u) { return !have[u.id]; });
        runBtn('t-profiles').disabled = !profPlan.length;
        out('t-profiles', 'Профілів: <b>' + s.size + '</b> на ' + A.data.users.length + ' користувачів. ' +
          (profPlan.length ? 'Бракує: <b>' + profPlan.length + '</b>.' : 'Усі на місці.'));
      }, A.fail);
      return;
    }
    if (!profPlan || !profPlan.length) return;
    runBtn('t-profiles').disabled = true;
    inBatches(profPlan, function (b, u) {
      var pub = { uid: u.id };
      PUBLIC.forEach(function (k) { if (u[k] !== undefined && u[k] !== null) pub[k] = u[k]; });
      b.set(A.db.collection('publicProfiles').doc(u.id), pub, { merge: true });
    }).then(function (n) {
      A.log('backfill_profiles', 'створено профілів: ' + n);
      out('t-profiles', 'Готово: створено ' + n + '.');
      profPlan = null;
    }, A.fail);
  });

  // ── Бренди ───────────────────────────────────────────────
  var BRANDS = ['Kukirin', 'Kugoo', 'Ninebot', 'Segway', 'Dualtron', 'Minimotors', 'Xiaomi', 'Kaabo', 'Vsett', 'Ausom',
    'Ardis', 'Yume', 'Acer', 'Ado', 'Aima', 'Apollo', 'Crosser', 'Likebike', 'Maxxter', 'Hiper', 'Bambi', 'Forte',
    'Spark', 'Musstang', 'Viper', 'Lifan', 'Geon', 'Bajaj', 'Honda', 'Yamaha', 'Suzuki']
    .sort(function (a, b) { return b.length - a.length; });
  function detectBrand(title) {
    var t = String(title || '').toLowerCase();
    for (var i = 0; i < BRANDS.length; i++) {
      // Лише ціле слово: «Ado» не має знаходитись у «Adobe» чи «Tornado».
      var re = new RegExp('(^|[^a-zа-яіїєґ0-9])' + BRANDS[i].toLowerCase() + '($|[^a-zа-яіїєґ0-9])', 'i');
      if (re.test(t)) return BRANDS[i];
    }
    return '';
  }
  var brandPlan = null;
  A.act('tool-brands', function (el) {
    if (el.getAttribute('data-mode') === 'check') {
      var act = A.data.listings.filter(function (l) { return l.status === 'active'; });
      var without = act.filter(function (l) { return !String(l.brand || '').trim(); });
      brandPlan = [];
      without.forEach(function (l) { var b = detectBrand(l.title); if (b) brandPlan.push({ id: l.id, title: l.title, brand: b }); });
      runBtn('t-brands').disabled = !brandPlan.length;
      out('t-brands', 'Активних без бренду: <b>' + without.length + '</b>, з них впізнано: <b>' + brandPlan.length + '</b>.' +
        (brandPlan.length ? '<br>' + brandPlan.slice(0, 5).map(function (x) { return A.esc(String(x.title).slice(0, 50)) + ' → ' + A.esc(x.brand); }).join('<br>') : '') +
        (without.length - brandPlan.length ? '<br><span class="muted">Решту можна заповнити вручну в картці оголошення.</span>' : ''));
      return;
    }
    if (!brandPlan || !brandPlan.length) return;
    runBtn('t-brands').disabled = true;
    inBatches(brandPlan, function (b, x) { b.update(A.db.collection('listings').doc(x.id), { brand: x.brand }); }).then(function (n) {
      brandPlan.forEach(function (x) { A.patch('listings', x.id, { brand: x.brand }); });
      A.log('backfill_brands', 'записано брендів: ' + n);
      out('t-brands', 'Готово: записано ' + n + '.');
      brandPlan = null;
    }, A.fail);
  });

  // ── Пароль ───────────────────────────────────────────────
  A.act('tool-password', function () {
    A.dialog({
      title: 'Зміна пароля',
      body: '<label class="field"><span>Поточний пароль</span><input type="password" name="cur" autocomplete="current-password"></label>' +
        '<label class="field"><span>Новий пароль</span><input type="password" name="p1" autocomplete="new-password"><span class="hint">Щонайменше 10 символів</span></label>' +
        '<label class="field"><span>Ще раз</span><input type="password" name="p2" autocomplete="new-password"></label>',
      buttons: [{ label: 'Скасувати', value: null }, { label: 'Змінити', value: 'ok', primary: true }],
      onSubmit: function (v, root) {
        var cur = root.querySelector('[name=cur]').value, p1 = root.querySelector('[name=p1]').value, p2 = root.querySelector('[name=p2]').value;
        if (p1.length < 10) { A.toast('Пароль має містити щонайменше 10 символів', true); return false; }
        if (p1 !== p2) { A.toast('Паролі не збігаються', true); return false; }
        var u = A.auth.currentUser;
        // Firebase вимагає свіжого входу для зміни пароля — підтверджуємо поточним.
        var cred = firebase.auth.EmailAuthProvider.credential(u.email, cur);
        return u.reauthenticateWithCredential(cred).then(function () { return u.updatePassword(p1); }).then(function () {
          A.log('change_password', '');
          A.toast('Пароль змінено');
        }, function (e) {
          A.toast(e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential' ? 'Поточний пароль невірний' : 'Помилка: ' + e.message, true);
          return false;
        });
      }
    });
  });
})();
