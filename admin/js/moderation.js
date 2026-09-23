/* Модерація: скарги на оголошення, звернення, відгуки, сервіси. */
'use strict';
(function () {
  var REASONS = {
    fraud: 'Шахрайство', spam: 'Спам', wrong_cat: 'Не та категорія', wrong_category: 'Не та категорія',
    sold: 'Вже продано', duplicate: 'Дубль', prohibited: 'Заборонений товар', other: 'Інше'
  };
  var RESOLUTION = { hidden: 'оголошення сховано', deleted: 'оголошення видалено', dismissed: 'без дій' };

  // ── Скарги ────────────────────────────────────────────────
  A.page('reports', {
    title: 'Скарги',
    render: function () {
      var st = A.$('r-status').value;
      var openBy = {};
      A.data.reports.forEach(function (r) { if (r.status !== 'resolved') openBy[r.listingId] = (openBy[r.listingId] || 0) + 1; });
      var rows = A.data.reports.filter(function (r) {
        if (st === 'open') return r.status !== 'resolved';
        if (st === 'resolved') return r.status === 'resolved';
        return true;
      });
      var n = A.table('reports', {
        el: 'r-table', rows: rows, sort: 'createdAt',
        empty: st === 'open' ? 'Відкритих скарг немає' : 'Скарг немає',
        cols: [
          { key: 'listing', label: 'Оголошення', sort: true, get: function (r) { var l = A.listingById(r.listingId); return l ? l.title : ''; } },
          { key: 'reason', label: 'Причина', sort: true },
          { key: 'reporter', label: 'Від кого', cls: 'hide-m' },
          { key: 'createdAt', label: 'Дата', sort: true, get: function (r) { return A.sec(r.createdAt); } },
          { key: 'status', label: 'Статус', sort: true },
          { key: '_', label: '' }
        ],
        row: function (r) {
          var l = A.listingById(r.listingId);
          var rep = A.userById(r.reporterUid);
          var id = A.esc(r.id);
          var listingCell = l
            ? '<div class="cell-main"><a href="#" data-act="listing-edit" data-id="' + A.esc(l.id) + '">' + A.esc(l.title || 'Без назви') + '</a></div>' +
              '<div class="cell-sub">' + A.esc(l.sellerName || '') + ' · ' + A.listingStatus(l.status) + (openBy[r.listingId] > 1 ? ' · скарг: ' + openBy[r.listingId] : '') + '</div>'
            : '<span class="muted">не знайдено (' + A.esc(r.listingId || '—') + ')</span>';
          var acts = '';
          if (r.status !== 'resolved') {
            if (l && l.status === 'active') acts += '<button class="btn btn-sm" data-act="report-hide" data-id="' + id + '">Сховати</button>';
            if (l && l.status !== 'deleted') acts += '<button class="btn btn-sm btn-danger" data-act="report-delete" data-id="' + id + '">Видалити</button>';
            acts += '<button class="btn btn-sm" data-act="report-dismiss" data-id="' + id + '">Відхилити</button>';
          }
          return '<tr><td>' + listingCell + '</td>' +
            '<td>' + A.esc(REASONS[r.reason] || r.reason || '—') + (r.comment ? '<div class="cell-sub">' + A.esc(r.comment) + '</div>' : '') + '</td>' +
            '<td class="hide-m">' + A.esc(rep ? A.userName(rep) : (r.reporterName || r.reporterUid || '—')) + '</td>' +
            '<td class="nowrap">' + A.date(r.createdAt) + '</td>' +
            '<td>' + (r.status === 'resolved'
              ? '<span class="st">Закрита</span><div class="cell-sub">' + A.esc(RESOLUTION[r.resolution] || '') + '</div>'
              : '<span class="st warn">Відкрита</span>') + '</td>' +
            '<td><div class="acts">' + acts + '</div></td></tr>';
        }
      });
      A.$('r-total').textContent = n + ' ' + A.plural(n, 'скарга', 'скарги', 'скарг');
    }
  });

  // Закриваємо всі відкриті скарги на це оголошення разом.
  function resolveFor(report, resolution, listingFields) {
    var open = A.data.reports.filter(function (r) { return r.listingId === report.listingId && r.status !== 'resolved'; });
    var batch = A.db.batch();
    var who = (A.auth.currentUser && A.auth.currentUser.email) || 'admin';
    var rf = { status: 'resolved', resolution: resolution, resolvedAt: A.FV.serverTimestamp(), resolvedBy: who };
    open.forEach(function (r) { batch.update(A.db.collection('reports').doc(r.id), rf); });
    if (listingFields) batch.update(A.db.collection('listings').doc(report.listingId), listingFields);
    return batch.commit().then(function () {
      open.forEach(function (r) { A.patch('reports', r.id, rf); });
      if (listingFields) A.patch('listings', report.listingId, listingFields);
      var l = A.listingById(report.listingId);
      A.log('report_' + resolution, report.listingId + ' · ' + (l ? l.title : '') + ' · скарг: ' + open.length);
      A.render();
    });
  }
  function byId(id) { return A.data.reports.filter(function (r) { return r.id === id; })[0]; }

  A.act('report-hide', function (el, id) {
    var r = byId(id); if (!r) return;
    resolveFor(r, 'hidden', { status: 'inactive', updatedAt: A.FV.serverTimestamp() })
      .then(function () { A.toast('Оголошення сховано, скаргу закрито'); }, A.fail);
  });
  A.act('report-delete', function (el, id) {
    var r = byId(id); if (!r) return;
    var l = A.listingById(r.listingId);
    A.confirm('Видалити «' + (l ? l.title : r.listingId) + '» і закрити скаргу?', { danger: true, ok: 'Видалити' }).then(function (ok) {
      if (!ok) return;
      resolveFor(r, 'deleted', { status: 'deleted', deletedAt: A.FV.serverTimestamp(), deletedReason: 'Скарга: ' + (REASONS[r.reason] || r.reason || '') })
        .then(function () { A.toast('Оголошення видалено, скаргу закрито'); }, A.fail);
    });
  });
  A.act('report-dismiss', function (el, id) {
    var r = byId(id); if (!r) return;
    resolveFor(r, 'dismissed', null).then(function () { A.toast('Скаргу відхилено'); }, A.fail);
  });

  // ── Звернення ─────────────────────────────────────────────
  var F_TYPE = { question: 'Питання', suggestion: 'Пропозиція', complaint: 'Скарга', bug: 'Помилка' };
  var F_STATUS = { new: ['Нове', 'ok'], in_progress: ['В роботі', 'warn'], resolved: ['Закрите', ''] };

  A.page('feedback', {
    title: 'Звернення',
    render: function () {
      var st = A.$('f-status').value, type = A.$('f-type').value;
      var rows = A.data.feedback.filter(function (f) {
        var s = f.status || 'new';
        if (st === 'open' && s === 'resolved') return false;
        if (st && st !== 'open' && s !== st) return false;
        if (type && f.type !== type) return false;
        return true;
      }).sort(function (a, b) { return A.sec(b.createdAt) - A.sec(a.createdAt); });
      A.$('f-total').textContent = rows.length + ' ' + A.plural(rows.length, 'звернення', 'звернення', 'звернень');
      if (!rows.length) { A.$('f-list').innerHTML = '<p class="muted">Звернень немає.</p>'; return; }
      A.$('f-list').innerHTML = rows.map(function (f) {
        var s = f.status || 'new', id = A.esc(f.id);
        var sx = F_STATUS[s] || [s, ''];
        var user = f.uid ? A.userById(f.uid) : null;
        var who = A.esc(f.name || (user && A.userName(user)) || 'Без імені');
        if (f.uid) who = '<button class="link" data-act="user-open" data-id="' + A.esc(f.uid) + '">' + who + '</button>';
        return '<article class="card' + (s === 'new' ? ' is-new' : '') + '">' +
          '<div class="card-meta"><span class="st ' + sx[1] + '">' + sx[0] + '</span>' +
            '<span>' + A.esc(F_TYPE[f.type] || f.type || 'Звернення') + '</span>' +
            '<span>' + A.dateTime(f.createdAt) + '</span>' +
            '<span>' + who + '</span>' +
            (f.email ? '<span><a href="mailto:' + A.esc(f.email) + '">' + A.esc(f.email) + '</a></span>' : '') +
            (f.page ? '<span class="mono">' + A.esc(f.page) + '</span>' : '') +
          '</div>' +
          '<h3>' + A.esc(f.subject || 'Без теми') + '</h3>' +
          '<p>' + A.esc(f.message || '') + '</p>' +
          (f.img ? '<a href="' + A.esc(f.img) + '" target="_blank" rel="noopener"><img class="attach" alt="Вкладення" loading="lazy" src="' + A.esc(A.thumb(f.img, 480)) + '"></a>' : '') +
          (f.adminReply ? '<div class="reply"><b>Відповідь' + (f.repliedAt ? ' · ' + A.dateTime(f.repliedAt) : '') + '</b>' + A.esc(f.adminReply) + '</div>' : '') +
          '<div class="card-acts">' +
            '<button class="btn btn-sm' + (f.adminReply ? '' : ' btn-primary') + '" data-act="fb-reply" data-id="' + id + '">' + (f.adminReply ? 'Змінити відповідь' : 'Відповісти') + '</button>' +
            (s === 'new' ? '<button class="btn btn-sm" data-act="fb-status" data-st="in_progress" data-id="' + id + '">В роботу</button>' : '') +
            (s !== 'resolved' ? '<button class="btn btn-sm" data-act="fb-status" data-st="resolved" data-id="' + id + '">Закрити</button>'
                              : '<button class="btn btn-sm" data-act="fb-status" data-st="in_progress" data-id="' + id + '">Відкрити знову</button>') +
            '<span class="grow"></span>' +
            '<button class="btn btn-sm btn-danger" data-act="fb-delete" data-id="' + id + '">Видалити</button>' +
          '</div></article>';
      }).join('');
    }
  });

  function fb(id) { return A.data.feedback.filter(function (f) { return f.id === id; })[0]; }

  A.act('fb-status', function (el, id) {
    var st = el.getAttribute('data-st');
    A.db.collection('feedback').doc(id).update({ status: st }).then(function () {
      A.patch('feedback', id, { status: st });
      A.log('feedback_status', id + ' → ' + st);
      A.render();
    }, A.fail);
  });
  A.act('fb-reply', function (el, id) {
    var f = fb(id); if (!f) return;
    A.dialog({
      title: 'Відповідь: ' + (f.subject || 'звернення'),
      body: '<p style="white-space:pre-line">' + A.esc(f.message || '') + '</p>' +
        '<label class="field"><span>Ваша відповідь</span><textarea name="reply" rows="6">' + A.esc(f.adminReply || '') + '</textarea>' +
        '<span class="hint">' + (f.uid ? 'Користувач побачить її у своєму профілі на сайті.' : 'Звернення без акаунта — відповідь на сайті не з\'явиться, краще напишіть на пошту.') + '</span></label>' +
        '<label class="check"><input type="checkbox" name="close" checked> Закрити звернення</label>',
      buttons: (f.email ? [{ label: 'Написати на пошту', value: 'mail', left: true }] : [])
        .concat([{ label: 'Скасувати', value: null }, { label: 'Зберегти відповідь', value: 'ok', primary: true }]),
      onSubmit: function (v, root) {
        var text = A.val(root, 'reply');
        if (v === 'mail') {
          location.href = 'mailto:' + encodeURIComponent(f.email) + '?subject=' + encodeURIComponent('Re: ' + (f.subject || 'ваше звернення на RideGO')) + '&body=' + encodeURIComponent(text);
          return false;
        }
        if (!text) { A.toast('Відповідь порожня', true); return false; }
        var upd = {
          adminReply: text,
          repliedAt: A.FV.serverTimestamp(),
          repliedBy: (A.auth.currentUser && A.auth.currentUser.email) || 'admin'
        };
        if (A.val(root, 'close')) upd.status = 'resolved';
        else if ((f.status || 'new') === 'new') upd.status = 'in_progress';
        return A.db.collection('feedback').doc(id).update(upd).then(function () {
          A.patch('feedback', id, upd);
          A.log('feedback_reply', id + ' · ' + (f.subject || ''));
          A.render();
          A.toast('Відповідь збережено');
        });
      }
    });
  });
  A.act('fb-delete', function (el, id) {
    var f = fb(id); if (!f) return;
    A.confirm('Видалити звернення «' + (f.subject || 'без теми') + '»? Це незворотно.', { danger: true, ok: 'Видалити' }).then(function (ok) {
      if (!ok) return;
      A.db.collection('feedback').doc(id).delete().then(function () {
        A.data.feedback = A.data.feedback.filter(function (x) { return x.id !== id; });
        A.log('feedback_delete', id + ' · ' + (f.subject || ''));
        A.render();
        A.toast('Видалено');
      }, A.fail);
    });
  });

  // ── Відгуки про продавців ─────────────────────────────────
  A.page('reviews', {
    title: 'Відгуки',
    render: function () {
      var q = A.$('v-q').value.trim().toLowerCase();
      var rows = A.data.reviews.filter(function (r) {
        if (!q) return true;
        var s = A.userById(r.sellerUid);
        return [r.text, r.reviewerName, s && A.userName(s)].join(' ').toLowerCase().indexOf(q) !== -1;
      });
      var n = A.table('reviews', {
        el: 'v-table', rows: rows, sort: 'createdAt',
        empty: 'Відгуків немає',
        cols: [
          { key: 'seller', label: 'Продавець', sort: true, get: function (r) { var s = A.userById(r.sellerUid); return s ? A.userName(s) : ''; } },
          { key: 'rating', label: 'Оцінка', sort: true, cls: 'r' },
          { key: 'text', label: 'Текст' },
          { key: 'reviewerName', label: 'Автор', sort: true, cls: 'hide-m' },
          { key: 'createdAt', label: 'Дата', sort: true, get: function (r) { return A.sec(r.createdAt); } },
          { key: '_', label: '' }
        ],
        row: function (r) {
          var s = A.userById(r.sellerUid);
          var author = A.userById(r.reviewerUid);
          return '<tr><td>' + (s ? '<button class="link" data-act="user-open" data-id="' + A.esc(s.id) + '">' + A.esc(A.userName(s)) + '</button>' : '<span class="muted mono">' + A.esc(r.sellerUid || '') + '</span>') + '</td>' +
            '<td class="r num">' + (Number(r.rating) || 0) + ' / 5</td>' +
            '<td style="max-width:420px">' + A.esc(r.text || '') + '</td>' +
            // У старих відгуках замість імені міг зберегтися email — показуємо ім'я з профілю.
            '<td class="hide-m">' + A.esc(author ? A.userName(author) : (r.reviewerName || '—')) + '</td>' +
            '<td class="nowrap">' + A.date(r.createdAt) + '</td>' +
            '<td><div class="acts"><button class="btn btn-sm btn-danger" data-act="review-delete" data-id="' + A.esc(r.id) + '">Видалити</button></div></td></tr>';
        }
      });
      A.$('v-total').textContent = n + ' ' + A.plural(n, 'відгук', 'відгуки', 'відгуків');
    }
  });
  A.act('review-delete', function (el, id) {
    var r = A.data.reviews.filter(function (x) { return x.id === id; })[0]; if (!r) return;
    A.confirm('Видалити відгук «' + String(r.text || '').slice(0, 80) + '»? Це незворотно.', { danger: true, ok: 'Видалити' }).then(function (ok) {
      if (!ok) return;
      A.db.collection('reviews').doc(id).delete().then(function () {
        A.data.reviews = A.data.reviews.filter(function (x) { return x.id !== id; });
        A.log('review_delete', id + ' · ' + (r.sellerUid || '') + ' · ' + String(r.text || '').slice(0, 80));
        A.render();
        A.toast('Відгук видалено');
      }, A.fail);
    });
  });

  // ── Сервіси ───────────────────────────────────────────────
  A.page('services', {
    title: 'Сервіси',
    render: function () {
      A.table('services', {
        el: 's-table', rows: A.data.services, sort: 'createdAt',
        empty: 'Сервісів немає',
        cols: [
          { key: 'name', label: 'Назва', sort: true },
          { key: 'city', label: 'Місто', sort: true },
          { key: 'owner', label: 'Власник', cls: 'hide-m' },
          { key: 'rating', label: 'Рейтинг', sort: true, cls: 'r' },
          { key: 'createdAt', label: 'Додано', sort: true, get: function (s) { return A.sec(s.createdAt); } },
          { key: '_', label: '' }
        ],
        row: function (s) {
          var owner = A.userById(s.uid || s.sellerId);
          var cats = Array.isArray(s.cats) ? s.cats.join(', ') : '';
          return '<tr><td><div class="cell-main">' + A.esc(s.name || '—') + '</div><div class="cell-sub">' + A.esc([cats, s.address].filter(Boolean).join(' · ')) + '</div></td>' +
            '<td>' + A.esc(s.city || '—') + '</td>' +
            '<td class="hide-m">' + (owner ? '<button class="link" data-act="user-open" data-id="' + A.esc(owner.id) + '">' + A.esc(A.userName(owner)) + '</button>' : '—') + '</td>' +
            '<td class="r num">' + (s.rating ? Number(s.rating).toFixed(1) : '—') + '</td>' +
            '<td class="nowrap">' + A.date(s.createdAt) + '</td>' +
            '<td><div class="acts"><button class="btn btn-sm btn-danger" data-act="service-delete" data-id="' + A.esc(s.id) + '">Видалити</button></div></td></tr>';
        }
      });
    }
  });
  A.act('service-delete', function (el, id) {
    var s = A.data.services.filter(function (x) { return x.id === id; })[0]; if (!s) return;
    A.confirm('Видалити сервіс «' + (s.name || id) + '»? Це незворотно.', { danger: true, ok: 'Видалити' }).then(function (ok) {
      if (!ok) return;
      A.db.collection('services').doc(id).delete().then(function () {
        A.data.services = A.data.services.filter(function (x) { return x.id !== id; });
        A.log('delete_service', id + ' · ' + (s.name || ''));
        A.render();
        A.toast('Сервіс видалено');
      }, A.fail);
    });
  });
})();
