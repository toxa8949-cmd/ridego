/* Оголошення: пошук, фільтри, редагування, приховування, видалення. */
'use strict';
(function () {
  var CATS = ['Електросамокати', 'Електровелосипеди', 'Велосипеди', 'Електроскутери', 'Електромотоцикли'];
  var CONDITIONS = ['Новий', 'Чудовий', 'Хороший', 'Задовільний'];
  var STATUS = {
    active:   ['Активне', 'ok'],
    inactive: ['Приховане', 'warn'],
    sold:     ['Продане', ''],
    deleted:  ['Видалене', 'bad']
  };
  var PROMO = { top: 'ТОП', highlight: 'Виділення', urgent: 'Терміново' };
  var sellerFilter = '';

  A.listingStatus = function (s) {
    var x = STATUS[s] || [s || 'без статусу', ''];
    return '<span class="st ' + x[1] + '">' + A.esc(x[0]) + '</span>';
  };
  function promoActive(l) {
    if (!l.promo) return false;
    var until = A.sec(l.promoUntil);
    return !until || until * 1000 > Date.now();
  }

  function filtered() {
    var q = A.$('l-q').value.trim().toLowerCase();
    var st = A.$('l-status').value;
    var cat = A.$('l-cat').value;
    return A.data.listings.filter(function (l) {
      if (st && (l.status || '') !== st) return false;
      if (cat && l.cat !== cat) return false;
      if (sellerFilter && l.uid !== sellerFilter) return false;
      if (q) {
        var hay = [l.title, l.city, l.sellerName, l.seller, l.id, l.brand, l.model].join(' ').toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  A.page('listings', {
    title: 'Оголошення',
    render: function () {
      var sel = A.$('l-cat');
      if (sel.options.length === 1) {
        var cats = CATS.slice();
        A.data.listings.forEach(function (l) { if (l.cat && cats.indexOf(l.cat) === -1) cats.push(l.cat); });
        cats.forEach(function (c) { var o = document.createElement('option'); o.value = o.textContent = c; sel.appendChild(o); });
      }
      var chip = A.$('l-seller-chip');
      if (sellerFilter) {
        var u = A.userById(sellerFilter);
        chip.hidden = false;
        chip.innerHTML = 'Продавець: ' + A.esc(u ? A.userName(u) : sellerFilter) + ' <button data-act="listing-seller" data-id="" aria-label="Прибрати">✕</button>';
      } else chip.hidden = true;

      var rows = filtered();
      var n = A.table('listings', {
        el: 'l-table', more: 'l-more', rows: rows, sort: 'createdAt',
        empty: 'Оголошень за цим фільтром немає',
        cols: [
          { key: 'title', label: 'Оголошення', sort: true },
          { key: 'sellerName', label: 'Продавець', sort: true, get: function (l) { return l.sellerName || l.seller || ''; } },
          { key: 'price', label: 'Ціна', sort: true, cls: 'r', get: function (l) { return Number(l.price) || 0; } },
          { key: 'city', label: 'Місто', sort: true, cls: 'hide-m' },
          { key: 'views', label: 'Перегл.', sort: true, cls: 'r hide-m', get: function (l) { return Number(l.views) || 0; } },
          { key: 'createdAt', label: 'Додано', sort: true, get: function (l) { return A.sec(l.createdAt); } },
          { key: 'status', label: 'Статус', sort: true },
          { key: '_', label: '' }
        ],
        row: function (l) {
          var ph = A.listingPhotos(l)[0];
          var id = A.esc(l.id);
          var promo = promoActive(l) ? ' <span class="tag">' + (PROMO[l.promo] || A.esc(l.promo)) + '</span>' : '';
          var acts = '<button class="btn btn-sm" data-act="listing-edit" data-id="' + id + '">Змінити</button>';
          if (l.status === 'active') acts += '<button class="btn btn-sm" data-act="listing-hide" data-id="' + id + '">Сховати</button>';
          else if (l.status === 'inactive') acts += '<button class="btn btn-sm" data-act="listing-show" data-id="' + id + '">Показати</button>';
          if (l.status === 'deleted') acts += '<button class="btn btn-sm" data-act="listing-restore" data-id="' + id + '">Відновити</button>';
          else acts += '<button class="btn btn-sm btn-danger" data-act="listing-delete" data-id="' + id + '">Видалити</button>';
          return '<tr>' +
            '<td><div class="with-thumb">' +
              (ph ? '<img class="thumb" loading="lazy" alt="" src="' + A.esc(A.thumb(ph, 80)) + '">' : '<span class="thumb"></span>') +
              '<div><div class="cell-main"><a href="' + A.SITE + '/listing/' + id + '" target="_blank" rel="noopener">' + A.esc(l.title || 'Без назви') + '</a>' + promo + '</div>' +
              '<div class="cell-sub">' + A.esc([l.cat, l.brand, l.condition].filter(Boolean).join(' · ')) + '</div></div>' +
            '</div></td>' +
            '<td><button class="link" data-act="listing-seller" data-id="' + A.esc(l.uid || '') + '" title="Усі оголошення продавця">' + A.esc(l.sellerName || l.seller || '—') + '</button></td>' +
            '<td class="r num nowrap">' + A.money(l.price) + '</td>' +
            '<td class="hide-m">' + A.esc(l.city || '—') + '</td>' +
            '<td class="r num hide-m">' + (l.views || 0) + '</td>' +
            '<td class="nowrap" title="' + A.esc(A.dateTime(l.createdAt)) + '">' + A.date(l.createdAt) + '</td>' +
            '<td>' + A.listingStatus(l.status) + '</td>' +
            '<td><div class="acts">' + acts + '</div></td></tr>';
        }
      });
      A.$('l-total').textContent = n + ' ' + A.plural(n, 'оголошення', 'оголошення', 'оголошень');
    }
  });

  A.act('listing-seller', function (el, uid) {
    if (A.$('dlg').open) A.$('dlg').close();
    sellerFilter = uid || '';
    if (sellerFilter) A.$('l-status').value = '';
    if (A.current !== 'listings') location.hash = '#listings'; else A.render();
  });
  A.showSellerListings = function (uid) { sellerFilter = uid; A.$('l-status').value = ''; location.hash = '#listings'; if (A.current === 'listings') A.render(); };

  function save(id, fields, logType, logText) {
    return A.db.collection('listings').doc(id).update(fields).then(function () {
      A.patch('listings', id, fields);
      A.log(logType, logText);
      A.render();
    });
  }

  A.act('listing-hide', function (el, id) {
    var l = A.listingById(id); if (!l) return;
    save(id, { status: 'inactive', updatedAt: A.FV.serverTimestamp() }, 'hide_listing', id + ' · ' + (l.title || ''))
      .then(function () { A.toast('Оголошення приховане з сайту'); }, A.fail);
  });
  A.act('listing-show', function (el, id) {
    var l = A.listingById(id); if (!l) return;
    save(id, { status: 'active', updatedAt: A.FV.serverTimestamp() }, 'show_listing', id + ' · ' + (l.title || ''))
      .then(function () { A.toast('Оголошення знову на сайті'); }, A.fail);
  });
  A.act('listing-restore', function (el, id) {
    var l = A.listingById(id); if (!l) return;
    save(id, { status: 'active', deletedAt: A.FV.delete(), deletedReason: A.FV.delete(), updatedAt: A.FV.serverTimestamp() },
      'restore_listing', id + ' · ' + (l.title || ''))
      .then(function () { A.toast('Оголошення відновлене'); }, A.fail);
  });
  A.act('listing-delete', function (el, id) {
    var l = A.listingById(id); if (!l) return;
    A.dialog({
      title: 'Видалити оголошення',
      body: '<p>«' + A.esc(l.title || 'Без назви') + '» зникне з сайту. Його можна буде відновити у фільтрі «Видалені».</p>' +
        '<label class="field"><span>Причина (бачите тільки ви)</span><input type="text" name="reason" placeholder="Напр.: дубль, заборонений товар"></label>',
      buttons: [{ label: 'Скасувати', value: null }, { label: 'Видалити', value: 'del', danger: true }],
      onSubmit: function (v, body) {
        var reason = A.val(body, 'reason') || 'Видалено адміністратором';
        return save(id, { status: 'deleted', deletedAt: A.FV.serverTimestamp(), deletedReason: reason },
          'delete_listing', id + ' · ' + (l.title || '') + ' · ' + reason)
          .then(function () { A.toast('Оголошення видалене'); });
      }
    });
  });

  // ── Редагування ────────────────────────────────────────────
  A.act('listing-edit', function (el, id) {
    var l = A.listingById(id);
    if (!l) { A.toast('Оголошення не знайдено — оновіть дані', true); return; }
    var photos = A.listingPhotos(l).slice();
    var opts = function (list, cur) {
      var has = list.indexOf(cur) !== -1;
      return (cur && !has ? '<option selected>' + A.esc(cur) + '</option>' : '') +
        list.map(function (x) { return '<option' + (x === cur ? ' selected' : '') + '>' + A.esc(x) + '</option>'; }).join('');
    };
    var statusOpts = Object.keys(STATUS).map(function (k) {
      return '<option value="' + k + '"' + (l.status === k ? ' selected' : '') + '>' + STATUS[k][0] + '</option>';
    }).join('');
    var pActive = promoActive(l);
    var promoOpts = '<option value="">Немає</option>' + Object.keys(PROMO).map(function (k) {
      return '<option value="' + k + '"' + (pActive && l.promo === k ? ' selected' : '') + '>' + PROMO[k] + '</option>';
    }).join('');
    var until = A.sec(l.promoUntil);

    function photosHtml() {
      if (!photos.length) return '<p class="muted">Фото немає</p>';
      return '<div class="photos">' + photos.map(function (p, i) {
        return '<div class="photo' + (i === 0 ? ' first' : '') + '"><a href="' + A.esc(p) + '" target="_blank" rel="noopener"><img alt="" src="' + A.esc(A.thumb(p, 168)) + '"></a>' +
          '<button type="button" data-ph-del="' + i + '" title="Прибрати фото">✕</button>' +
          (i > 0 ? '<button type="button" data-ph-main="' + i + '" title="Зробити головним" style="right:auto;left:3px">★</button>' : '') + '</div>';
      }).join('') + '</div>';
    }

    var body =
      '<label class="field"><span>Назва</span><input type="text" name="title" maxlength="200" value="' + A.esc(l.title || '') + '"></label>' +
      '<div class="row">' +
        '<label class="field"><span>Ціна, грн</span><input type="number" name="price" min="0" max="10000000" value="' + A.esc(l.price || '') + '"></label>' +
        '<label class="field"><span>Категорія</span><select name="cat">' + opts(CATS, l.cat) + '</select></label>' +
      '</div><div class="row">' +
        '<label class="field"><span>Бренд</span><input type="text" name="brand" value="' + A.esc(l.brand || '') + '"></label>' +
        '<label class="field"><span>Модель</span><input type="text" name="model" value="' + A.esc(l.model || '') + '"></label>' +
      '</div><div class="row">' +
        '<label class="field"><span>Місто</span><input type="text" name="city" value="' + A.esc(l.city || '') + '"></label>' +
        '<label class="field"><span>Стан</span><select name="condition">' + opts(CONDITIONS, l.condition) + '</select></label>' +
      '</div>' +
      '<label class="field"><span>Опис</span><textarea name="desc" rows="5">' + A.esc(l.desc || '') + '</textarea></label>' +
      '<div class="row">' +
        '<label class="field"><span>Статус</span><select name="status">' + statusOpts + '</select></label>' +
        '<label class="field"><span>Просування</span><select name="promo">' + promoOpts + '</select>' +
          '<span class="hint">' + (pActive && until ? 'діє до ' + A.date(l.promoUntil) : 'нове — на 7 днів') + '</span></label>' +
      '</div>' +
      '<div class="field"><span>Фото</span><div id="ph-box">' + photosHtml() + '</div></div>' +
      '<dl class="facts" style="margin-top:8px">' +
        '<dt>ID</dt><dd class="mono">' + A.esc(l.id) + '</dd>' +
        '<dt>Продавець</dt><dd>' + A.esc(l.sellerName || l.seller || '—') + ' <span class="mono muted">' + A.esc(l.uid || '') + '</span></dd>' +
        '<dt>Додано</dt><dd>' + A.dateTime(l.createdAt) + (l.updatedAt ? ' · змінено ' + A.dateTime(l.updatedAt) : '') + '</dd>' +
        '<dt>Переглядів</dt><dd>' + (l.views || 0) + '</dd>' +
        (l.status === 'deleted' ? '<dt>Видалено</dt><dd>' + A.dateTime(l.deletedAt) + ' · ' + A.esc(l.deletedReason || '') + '</dd>' : '') +
      '</dl>';

    A.dialog({
      title: l.title || 'Оголошення',
      wide: true,
      body: body,
      buttons: [
        { label: 'Відкрити на сайті', value: 'open', left: true },
        { label: 'Скасувати', value: null },
        { label: 'Зберегти', value: 'save', primary: true }
      ],
      onOpen: function (root) {
        root.querySelector('#ph-box').addEventListener('click', function (ev) {
          var del = ev.target.getAttribute('data-ph-del'), main = ev.target.getAttribute('data-ph-main');
          if (del != null) { photos.splice(Number(del), 1); }
          else if (main != null) { var p = photos.splice(Number(main), 1)[0]; photos.unshift(p); }
          else return;
          ev.preventDefault();
          root.querySelector('#ph-box').innerHTML = photosHtml();
        });
      },
      onSubmit: function (v, root) {
        if (v === 'open') { window.open(A.SITE + '/listing/' + l.id, '_blank', 'noopener'); return false; }
        var title = A.val(root, 'title');
        if (!title) { A.toast('Назва не може бути порожньою', true); return false; }
        var price = Number(A.val(root, 'price'));
        if (!(price >= 0 && price <= 10000000)) { A.toast('Ціна має бути від 0 до 10 000 000', true); return false; }
        var f = {
          title: title,
          price: Math.round(price),
          cat: A.val(root, 'cat'),
          brand: A.val(root, 'brand'),
          model: A.val(root, 'model'),
          city: A.val(root, 'city'),
          condition: A.val(root, 'condition'),
          desc: A.val(root, 'desc'),
          status: A.val(root, 'status'),
          imgs: photos,
          img: photos[0] || '',
          updatedAt: A.FV.serverTimestamp()
        };
        var promo = A.val(root, 'promo');
        if (!promo) {
          if (l.promo) { f.promo = A.FV.delete(); f.promoUntil = A.FV.delete(); f.promoDays = A.FV.delete(); }
        } else if (!(pActive && l.promo === promo)) {
          f.promo = promo; f.promoDays = 7;
          f.promoUntil = new Date(Date.now() + 7 * 86400000).toISOString();
        }
        if (f.status === 'deleted' && l.status !== 'deleted') { f.deletedAt = A.FV.serverTimestamp(); f.deletedReason = 'Видалено адміністратором'; }
        if (f.status !== 'deleted' && l.status === 'deleted') { f.deletedAt = A.FV.delete(); f.deletedReason = A.FV.delete(); }
        return save(l.id, f, 'edit_listing', l.id + ' · ' + title).then(function () {
          if (typeof f.promoUntil === 'string') A.patch('listings', l.id, { promoUntil: f.promoUntil });
          A.toast('Збережено');
        });
      }
    });
  });
})();
