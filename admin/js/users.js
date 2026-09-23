/* Користувачі: пошук, профіль, слоти, блокування, експорт. */
'use strict';
(function () {
  function activeCount(uid) {
    var n = 0;
    A.data.listings.forEach(function (l) { if (l.uid === uid && l.status === 'active') n++; });
    return n;
  }
  function welcomeLeft(u) {
    var w = Number(u.slotsWelcome) || 0;
    var exp = A.sec(u.slotsWelcomeExpiry);
    if (exp && exp * 1000 < Date.now()) return 0;
    return w;
  }
  function slotsTotal(u) { return (Number(u.slots) || 0) + welcomeLeft(u); }

  function filtered() {
    var q = A.$('u-q').value.trim().toLowerCase();
    var type = A.$('u-type').value;
    var st = A.$('u-status').value;
    return A.data.users.filter(function (u) {
      if (type && (u.type || 'personal') !== type) return false;
      if (st === 'blocked' && u.status !== 'blocked') return false;
      if (st === 'active' && u.status === 'blocked') return false;
      if (q) {
        var hay = [u.name, u.displayName, u.email, u.phone, u.city, u.id].join(' ').toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  A.page('users', {
    title: 'Користувачі',
    render: function () {
      var n = A.table('users', {
        el: 'u-table', more: 'u-more', rows: filtered(), sort: 'createdAt',
        empty: 'Нікого не знайдено',
        cols: [
          { key: 'name', label: 'Користувач', sort: true, get: function (u) { return A.userName(u); } },
          { key: 'type', label: 'Тип', sort: true, cls: 'hide-m' },
          { key: 'ads', label: 'Активних', sort: true, cls: 'r', get: function (u) { return activeCount(u.id); } },
          { key: 'slots', label: 'Слоти', sort: true, cls: 'r hide-m', get: slotsTotal },
          { key: 'createdAt', label: 'Реєстрація', sort: true, get: function (u) { return A.sec(u.createdAt); } },
          { key: 'status', label: 'Статус', sort: true },
          { key: '_', label: '' }
        ],
        row: function (u) {
          var id = A.esc(u.id);
          var ads = activeCount(u.id);
          var blocked = u.status === 'blocked';
          return '<tr>' +
            '<td><div class="cell-main"><button class="link" style="color:var(--text);text-decoration:none;font-weight:500" data-act="user-open" data-id="' + id + '">' + A.esc(A.userName(u)) + '</button></div>' +
              '<div class="cell-sub">' + A.esc([u.email, u.phone].filter(Boolean).join(' · ')) + '</div></td>' +
            '<td class="hide-m">' + (u.type === 'business' ? 'Бізнес' : 'Приватний') + '</td>' +
            '<td class="r num">' + (ads ? '<button class="link" data-act="listing-seller" data-id="' + id + '">' + ads + '</button>' : '0') + '</td>' +
            '<td class="r num hide-m" title="куплені ' + (u.slots || 0) + ', стартові ' + welcomeLeft(u) + '">' + slotsTotal(u) + '</td>' +
            '<td class="nowrap">' + A.date(u.createdAt) + '</td>' +
            '<td>' + (blocked ? '<span class="st bad" title="' + A.esc(u.blockReason || '') + '">Заблок.</span>' : '<span class="st ok">Активний</span>') + '</td>' +
            '<td><div class="acts">' +
              '<button class="btn btn-sm" data-act="user-open" data-id="' + id + '">Профіль</button>' +
              '<button class="btn btn-sm" data-act="user-slots" data-id="' + id + '">Слоти</button>' +
              (blocked
                ? '<button class="btn btn-sm" data-act="user-unblock" data-id="' + id + '">Розблокувати</button>'
                : '<button class="btn btn-sm btn-danger" data-act="user-block" data-id="' + id + '">Блок</button>') +
            '</div></td></tr>';
        }
      });
      A.$('u-total').textContent = n + ' з ' + A.data.users.length;
    }
  });

  // ── Профіль ───────────────────────────────────────────────
  A.act('user-open', function (el, uid) {
    var u = A.userById(uid);
    if (!u) { A.toast('Користувача не знайдено — оновіть дані', true); return; }
    var all = A.data.listings.filter(function (l) { return l.uid === uid; });
    var ads = all.filter(function (l) { return l.status === 'active'; }).length;
    A.dialog({
      title: A.userName(u),
      body:
        '<div class="row">' +
          '<label class="field"><span>Ім\'я</span><input type="text" name="name" value="' + A.esc(u.name || '') + '"></label>' +
          '<label class="field"><span>Телефон</span><input type="text" name="phone" value="' + A.esc(u.phone || '') + '"></label>' +
        '</div><div class="row">' +
          '<label class="field"><span>Місто</span><input type="text" name="city" value="' + A.esc(u.city || '') + '"></label>' +
          '<label class="field"><span>Тип акаунта</span><select name="type">' +
            '<option value="personal"' + (u.type !== 'business' ? ' selected' : '') + '>Приватний</option>' +
            '<option value="business"' + (u.type === 'business' ? ' selected' : '') + '>Бізнес</option></select></label>' +
        '</div>' +
        '<dl class="facts">' +
          '<dt>Email</dt><dd>' + A.esc(u.email || '—') + '</dd>' +
          '<dt>UID</dt><dd class="mono">' + A.esc(u.id) + '</dd>' +
          '<dt>Реєстрація</dt><dd>' + A.dateTime(u.createdAt) + '</dd>' +
          '<dt>Оголошення</dt><dd>' + ads + ' активних, усього ' + all.length +
            (all.length ? ' · <button type="button" class="link" data-act="listing-seller" data-id="' + A.esc(u.id) + '">показати</button>' : '') + '</dd>' +
          '<dt>Слоти</dt><dd>куплені ' + (u.slots || 0) + ', стартові ' + welcomeLeft(u) +
            (u.slotsWelcomeExpiry ? ' (до ' + A.date(u.slotsWelcomeExpiry) + ')' : '') + '</dd>' +
          '<dt>Розсилка</dt><dd>' + (u.marketingOptIn ? 'погодився' : 'ні') + '</dd>' +
          (u.status === 'blocked' ? '<dt>Блокування</dt><dd>' + A.dateTime(u.blockedAt) + ' · ' + A.esc(u.blockReason || 'без причини') + '</dd>' : '') +
        '</dl>',
      buttons: [
        { label: 'Сторінка продавця', value: 'page', left: true },
        { label: 'Скасувати', value: null },
        { label: 'Зберегти', value: 'save', primary: true }
      ],
      onSubmit: function (v, root) {
        if (v === 'page') { window.open(A.SITE + '/seller/' + uid, '_blank', 'noopener'); return false; }
        var f = { name: A.val(root, 'name'), phone: A.val(root, 'phone'), city: A.val(root, 'city'), type: A.val(root, 'type') };
        return A.db.collection('users').doc(uid).update(f).then(function () {
          // Ці поля показуються на сторінці продавця — дублюємо в publicProfiles.
          return A.db.collection('publicProfiles').doc(uid)
            .set(Object.assign({ uid: uid, updatedAt: A.FV.serverTimestamp() }, f), { merge: true })
            .catch(function (e) { A.toast('Профіль збережено, але публічна копія не оновилась: ' + e.message, true); });
        }).then(function () {
          A.patch('users', uid, f);
          A.log('edit_user', uid + ' · ' + f.name);
          A.render();
          A.toast('Збережено');
        });
      }
    });
  });

  // ── Слоти ─────────────────────────────────────────────────
  A.act('user-slots', function (el, uid) {
    var u = A.userById(uid); if (!u) return;
    var exp = A.sec(u.slotsWelcomeExpiry);
    var expired = exp && exp * 1000 < Date.now();
    A.dialog({
      title: 'Слоти · ' + A.userName(u),
      body:
        '<dl class="facts" style="margin-bottom:16px">' +
          '<dt>Куплені</dt><dd class="num">' + (u.slots || 0) + '</dd>' +
          '<dt>Стартові</dt><dd class="num">' + (u.slotsWelcome || 0) + (exp ? (expired ? ' · термін минув ' : ' · до ') + A.date(u.slotsWelcomeExpiry) : '') + '</dd>' +
          '<dt>Опубліковано всього</dt><dd class="num">' + (u.totalListingsPublished || 0) + '</dd>' +
        '</dl>' +
        '<div class="row">' +
          '<label class="field"><span>Що змінити</span><select name="kind"><option value="slots">Куплені слоти</option><option value="slotsWelcome">Стартові слоти</option></select></label>' +
          '<label class="field"><span>Дія</span><select name="op"><option value="add">Додати</option><option value="sub">Забрати</option></select></label>' +
        '</div>' +
        '<label class="field"><span>Кількість</span><input type="number" name="n" min="1" max="1000" value="1"></label>' +
        '<label class="check"><input type="checkbox" name="extend"' + (expired ? ' checked' : '') + '> Для стартових: продовжити термін на 30 днів від сьогодні</label>' +
        '<label class="field"><span>Коментар для журналу</span><input type="text" name="note" placeholder="Напр.: компенсація за збій"></label>',
      buttons: [{ label: 'Скасувати', value: null }, { label: 'Застосувати', value: 'ok', primary: true }],
      onSubmit: function (v, root) {
        var kind = A.val(root, 'kind'), op = A.val(root, 'op');
        var n = parseInt(A.val(root, 'n'), 10);
        if (!(n >= 1 && n <= 1000)) { A.toast('Кількість — від 1 до 1000', true); return false; }
        var ref = A.db.collection('users').doc(uid);
        var result = {};
        // Транзакція: не можна забрати більше, ніж є зараз у базі.
        return A.db.runTransaction(function (tx) {
          return tx.get(ref).then(function (snap) {
            var cur = Number((snap.data() || {})[kind]) || 0;
            var next = op === 'add' ? cur + n : cur - n;
            if (next < 0) throw new Error('Є лише ' + cur + ', забрати ' + n + ' не можна');
            var upd = {}; upd[kind] = next;
            if (kind === 'slotsWelcome' && A.val(root, 'extend')) {
              upd.slotsWelcomeExpiry = firebase.firestore.Timestamp.fromDate(new Date(Date.now() + 30 * 86400000));
            }
            tx.update(ref, upd);
            result = upd;
          });
        }).then(function () {
          A.patch('users', uid, result);
          A.log('slots', uid + ' · ' + A.userName(u) + ' · ' + (kind === 'slots' ? 'куплені' : 'стартові') + ' ' + (op === 'add' ? '+' : '−') + n +
            (A.val(root, 'note') ? ' · ' + A.val(root, 'note') : ''));
          A.render();
          A.toast('Слоти оновлено: тепер ' + result[kind]);
        });
      }
    });
  });

  // ── Блокування ────────────────────────────────────────────
  // Сайт сам по собі статус «blocked» не перевіряє, тому разом із
  // блокуванням ховаємо активні оголошення (позначка hiddenByBlock),
  // щоб при розблокуванні повернути саме їх.
  A.act('user-block', function (el, uid) {
    var u = A.userById(uid); if (!u) return;
    var ads = A.data.listings.filter(function (l) { return l.uid === uid && l.status === 'active'; });
    A.dialog({
      title: 'Заблокувати ' + A.userName(u),
      body:
        '<label class="field"><span>Причина</span><input type="text" name="reason" placeholder="Напр.: шахрайство, спам"></label>' +
        (ads.length
          ? '<label class="check"><input type="checkbox" name="hide" checked> Сховати його активні оголошення (' + ads.length + ')</label>'
          : '<p class="muted">Активних оголошень немає.</p>'),
      buttons: [{ label: 'Скасувати', value: null }, { label: 'Заблокувати', value: 'ok', danger: true }],
      onSubmit: function (v, root) {
        var reason = A.val(root, 'reason');
        var hide = ads.length && A.val(root, 'hide');
        var batch = A.db.batch();
        var uf = { status: 'blocked', blockReason: reason || '', blockedAt: A.FV.serverTimestamp() };
        batch.update(A.db.collection('users').doc(uid), uf);
        if (hide) ads.forEach(function (l) {
          batch.update(A.db.collection('listings').doc(l.id), { status: 'inactive', hiddenByBlock: true });
        });
        return batch.commit().then(function () {
          A.patch('users', uid, uf);
          if (hide) ads.forEach(function (l) { A.patch('listings', l.id, { status: 'inactive', hiddenByBlock: true }); });
          A.log('block_user', uid + ' · ' + A.userName(u) + (reason ? ' · ' + reason : '') + (hide ? ' · сховано ' + ads.length : ''));
          A.render();
          A.toast('Заблоковано' + (hide ? ', оголошення сховано' : ''));
        });
      }
    });
  });

  A.act('user-unblock', function (el, uid) {
    var u = A.userById(uid); if (!u) return;
    var hidden = A.data.listings.filter(function (l) { return l.uid === uid && l.hiddenByBlock; });
    A.dialog({
      title: 'Розблокувати ' + A.userName(u),
      body: '<p>Причина блокування: ' + A.esc(u.blockReason || 'не вказана') + '</p>' +
        (hidden.length ? '<label class="check"><input type="checkbox" name="restore" checked> Повернути на сайт оголошення, сховані при блокуванні (' + hidden.length + ')</label>' : ''),
      buttons: [{ label: 'Скасувати', value: null }, { label: 'Розблокувати', value: 'ok', primary: true }],
      onSubmit: function (v, root) {
        var restore = hidden.length && A.val(root, 'restore');
        var batch = A.db.batch();
        batch.update(A.db.collection('users').doc(uid), { status: 'active', blockReason: A.FV.delete(), blockedAt: A.FV.delete() });
        if (restore) hidden.forEach(function (l) {
          batch.update(A.db.collection('listings').doc(l.id), { status: 'active', hiddenByBlock: A.FV.delete() });
        });
        return batch.commit().then(function () {
          A.patch('users', uid, { status: 'active', blockReason: A.FV.delete(), blockedAt: A.FV.delete() });
          if (restore) hidden.forEach(function (l) { A.patch('listings', l.id, { status: 'active', hiddenByBlock: A.FV.delete() }); });
          A.log('unblock_user', uid + ' · ' + A.userName(u) + (restore ? ' · повернуто ' + hidden.length : ''));
          A.render();
          A.toast('Розблоковано');
        });
      }
    });
  });

  // ── CSV ───────────────────────────────────────────────────
  // Крапка з комою і BOM — так Excel з українською локаллю відкриває файл
  // одразу в колонках і без «кракозябр». Лапки екрануються.
  A.act('users-csv', function () {
    var rows = filtered();
    var cell = function (v) {
      v = v == null ? '' : String(v);
      return /[";\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    };
    var head = ['uid', 'Ім\'я', 'Email', 'Телефон', 'Місто', 'Тип', 'Статус', 'Активних оголошень', 'Куплені слоти', 'Стартові слоти', 'Розсилка', 'Реєстрація'];
    var lines = [head.join(';')].concat(rows.map(function (u) {
      return [u.id, u.name || '', u.email || '', u.phone || '', u.city || '', u.type || 'personal', u.status || 'active',
        activeCount(u.id), u.slots || 0, welcomeLeft(u), u.marketingOptIn ? 'так' : 'ні', A.date(u.createdAt)].map(cell).join(';');
    }));
    var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ridego-users-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    A.log('export_users', rows.length + ' записів');
    A.toast('Вивантажено ' + rows.length);
  });
})();
