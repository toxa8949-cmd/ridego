/* Новини: список і редактор. */
'use strict';
(function () {
  var CATS = ['Новини', 'Огляди', 'Поради', 'Акції'];

  A.page('news', {
    title: 'Новини',
    render: function () {
      var n = A.table('news', {
        el: 'n-table', rows: A.data.news, sort: 'createdAt',
        empty: 'Публікацій ще немає',
        cols: [
          { key: 'title', label: 'Публікація', sort: true },
          { key: 'cat', label: 'Рубрика', sort: true, cls: 'hide-m' },
          { key: 'published', label: 'Статус', sort: true, get: function (x) { return x.published ? 1 : 0; } },
          { key: 'createdAt', label: 'Створено', sort: true, get: function (x) { return A.sec(x.createdAt); } },
          { key: '_', label: '' }
        ],
        row: function (x) {
          var id = A.esc(x.id);
          return '<tr><td><div class="with-thumb">' +
              (x.img ? '<img class="thumb" alt="" loading="lazy" src="' + A.esc(A.thumb(x.img, 80)) + '">' : '<span class="thumb"></span>') +
              '<div><div class="cell-main">' + (x.published
                ? '<a href="' + A.SITE + '/news/' + id + '" target="_blank" rel="noopener">' + A.esc(x.title || 'Без заголовка') + '</a>'
                : A.esc(x.title || 'Без заголовка')) + '</div>' +
              '<div class="cell-sub">' + A.esc(x.excerpt || '') + '</div></div></div></td>' +
            '<td class="hide-m">' + A.esc(x.cat || 'Новини') + '</td>' +
            '<td>' + (x.published ? '<span class="st ok">Опубліковано</span>' : '<span class="st">Чернетка</span>') + '</td>' +
            '<td class="nowrap">' + A.date(x.createdAt) + '</td>' +
            '<td><div class="acts">' +
              '<button class="btn btn-sm" data-act="news-edit" data-id="' + id + '">Змінити</button>' +
              '<button class="btn btn-sm" data-act="news-toggle" data-id="' + id + '">' + (x.published ? 'У чернетки' : 'Опублікувати') + '</button>' +
              '<button class="btn btn-sm btn-danger" data-act="news-delete" data-id="' + id + '">Видалити</button>' +
            '</div></td></tr>';
        }
      });
      A.$('n-total').textContent = n + ' ' + A.plural(n, 'публікація', 'публікації', 'публікацій');
    }
  });

  function byId(id) { return A.data.news.filter(function (x) { return x.id === id; })[0]; }

  // ── Завантаження фото (підписане) ──────────────────────────
  A.upload = function (file, folder) {
    var u = A.auth.currentUser;
    if (!u) return Promise.reject(new Error('Сесія закінчилась — увійдіть знову'));
    if (file.size > 15 * 1024 * 1024) return Promise.reject(new Error('Файл більший за 15 МБ'));
    return u.getIdToken().then(function (tok) {
      return fetch('/api/cloudinary-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
        body: JSON.stringify({ folder: folder })
      });
    }).then(function (r) {
      if (!r.ok) throw new Error('сервер не видав підпис (' + r.status + ')');
      return r.json();
    }).then(function (sig) {
      var fd = new FormData();
      fd.append('file', file);
      fd.append('api_key', sig.apiKey);
      fd.append('timestamp', sig.timestamp);
      fd.append('signature', sig.signature);
      fd.append('folder', sig.folder);
      return fetch('https://api.cloudinary.com/v1_1/' + sig.cloudName + '/image/upload', { method: 'POST', body: fd });
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (!d || !d.secure_url) throw new Error((d && d.error && d.error.message) || 'Cloudinary не прийняв файл');
      return d.secure_url;
    });
  };

  // ── Очищення HTML з редактора ──────────────────────────────
  // Лишаємо тільки просте форматування. Вставлене з інших сайтів
  // приносить стилі, скрипти й обробники — вони на сайт не потрапляють.
  var ALLOWED = { P: [], BR: [], B: [], STRONG: [], I: [], EM: [], U: [], H2: [], H3: [], UL: [], OL: [], LI: [], BLOCKQUOTE: [], A: ['href'], IMG: ['src', 'alt'] };
  function sanitize(html) {
    var box = document.createElement('div');
    box.innerHTML = html;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (ch) {
        if (ch.nodeType === 3) return;
        if (ch.nodeType !== 1) { ch.remove(); return; }
        var tag = ch.tagName;
        if (tag === 'DIV') { // contenteditable ділить на div — перетворюємо на p
          var p = document.createElement('p');
          while (ch.firstChild) p.appendChild(ch.firstChild);
          ch.replaceWith(p); ch = p; tag = 'P';
        }
        if (/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|FORM|INPUT|BUTTON|META|LINK)$/.test(tag)) { ch.remove(); return; }
        if (!ALLOWED[tag]) {
          walk(ch);
          while (ch.firstChild) ch.parentNode.insertBefore(ch.firstChild, ch);
          ch.remove();
          return;
        }
        Array.prototype.slice.call(ch.attributes).forEach(function (at) {
          if (ALLOWED[tag].indexOf(at.name) === -1) ch.removeAttribute(at.name);
        });
        if (tag === 'A') {
          var href = ch.getAttribute('href') || '';
          if (!/^(https?:|mailto:|\/)/i.test(href)) ch.removeAttribute('href');
          else if (/^https?:/i.test(href) && href.indexOf('ridego.com.ua') === -1) { ch.setAttribute('target', '_blank'); ch.setAttribute('rel', 'noopener nofollow'); }
        }
        if (tag === 'IMG' && !/^https:\/\//.test(ch.getAttribute('src') || '')) { ch.remove(); return; }
        walk(ch);
      });
    })(box);
    return box.innerHTML.replace(/(<p>(\s|&nbsp;|<br>)*<\/p>)+$/g, '').trim();
  }
  A.sanitizeHtml = sanitize;

  function editor(x) {
    x = x || {};
    var cover = x.img || '';
    var body =
      '<label class="field"><span>Заголовок</span><input type="text" name="title" maxlength="160" value="' + A.esc(x.title || '') + '"></label>' +
      '<div class="row">' +
        '<label class="field"><span>Рубрика</span><select name="cat">' + CATS.map(function (c) {
          return '<option' + ((x.cat || 'Новини') === c ? ' selected' : '') + '>' + c + '</option>';
        }).join('') + '</select></label>' +
        '<div class="field"><span>Обкладинка</span><div class="cover" id="cover-box"></div></div>' +
      '</div>' +
      '<label class="field"><span>Короткий опис</span><input type="text" name="excerpt" maxlength="300" value="' + A.esc(x.excerpt || '') + '">' +
        '<span class="hint">1–2 речення для списку новин і прев\'ю в соцмережах</span></label>' +
      '<div class="field"><span>Текст</span>' +
        '<div class="editor-bar" id="ed-bar">' +
          '<button type="button" data-cmd="bold" title="Жирний"><b>Ж</b></button>' +
          '<button type="button" data-cmd="italic" title="Курсив"><i>К</i></button>' +
          '<button type="button" data-cmd="formatBlock" data-arg="h2">Заголовок</button>' +
          '<button type="button" data-cmd="formatBlock" data-arg="h3">Підзаголовок</button>' +
          '<button type="button" data-cmd="formatBlock" data-arg="p">Абзац</button>' +
          '<button type="button" data-cmd="insertUnorderedList">Список</button>' +
          '<button type="button" data-cmd="formatBlock" data-arg="blockquote">Цитата</button>' +
          '<button type="button" data-cmd="link">Посилання</button>' +
          '<button type="button" data-cmd="image">Фото</button>' +
          '<button type="button" data-cmd="removeFormat" title="Прибрати форматування">Очистити</button>' +
        '</div>' +
        '<div class="editor" id="ed" contenteditable="true" data-placeholder="Текст публікації…"></div>' +
      '</div>' +
      '<label class="check"><input type="checkbox" name="published"' + (x.id ? (x.published ? ' checked' : '') : '') + '> Опублікувати на сайті</label>' +
      '<input type="file" id="ed-file" accept="image/*" hidden><input type="file" id="cover-file" accept="image/*" hidden>';

    function coverHtml() {
      return (cover ? '<img alt="" src="' + A.esc(A.thumb(cover, 240)) + '">' : '') +
        '<button type="button" class="btn btn-sm" id="cover-pick">' + (cover ? 'Замінити' : 'Завантажити') + '</button>' +
        (cover ? '<button type="button" class="btn btn-sm" id="cover-del">Прибрати</button>' : '');
    }

    A.dialog({
      title: x.id ? 'Редагування публікації' : 'Нова публікація',
      wide: true,
      body: body,
      buttons: [
        { label: 'Скасувати', value: null },
        { label: 'Зберегти', value: 'save', primary: true }
      ],
      onOpen: function (root) {
        var ed = root.querySelector('#ed');
        ed.innerHTML = sanitize(x.body || '');
        var cb = root.querySelector('#cover-box');
        cb.innerHTML = coverHtml();
        var savedRange = null;
        ed.addEventListener('blur', function () {
          var s = window.getSelection();
          if (s.rangeCount) savedRange = s.getRangeAt(0);
        });
        function restore() {
          ed.focus();
          if (savedRange) { var s = window.getSelection(); s.removeAllRanges(); s.addRange(savedRange); }
        }
        // Вставка — як простий текст, без чужих стилів.
        ed.addEventListener('paste', function (ev) {
          var t = (ev.clipboardData || window.clipboardData).getData('text/plain');
          if (t == null) return;
          ev.preventDefault();
          document.execCommand('insertText', false, t);
        });
        root.querySelector('#ed-bar').addEventListener('mousedown', function (ev) { ev.preventDefault(); });
        root.querySelector('#ed-bar').addEventListener('click', function (ev) {
          var b = ev.target.closest('button'); if (!b) return;
          var cmd = b.getAttribute('data-cmd');
          if (cmd === 'image') { root.querySelector('#ed-file').click(); return; }
          ed.focus();
          if (cmd === 'link') {
            var url = window.prompt('Адреса посилання (https://…)');
            if (url && /^(https?:\/\/|\/)/.test(url.trim())) document.execCommand('createLink', false, url.trim());
            return;
          }
          document.execCommand(cmd, false, b.getAttribute('data-arg') || null);
        });
        root.querySelector('#ed-file').addEventListener('change', function (ev) {
          var f = ev.target.files[0]; ev.target.value = '';
          if (!f) return;
          A.toast('Завантажую фото…');
          A.upload(f, 'news').then(function (url) {
            restore();
            document.execCommand('insertHTML', false, '<img src="' + A.esc(url) + '" alt="">');
          }, A.fail);
        });
        cb.addEventListener('click', function (ev) {
          if (ev.target.id === 'cover-pick') root.querySelector('#cover-file').click();
          if (ev.target.id === 'cover-del') { cover = ''; cb.innerHTML = coverHtml(); }
        });
        root.querySelector('#cover-file').addEventListener('change', function (ev) {
          var f = ev.target.files[0]; ev.target.value = '';
          if (!f) return;
          cb.innerHTML = '<span class="muted">Завантаження…</span>';
          A.upload(f, 'news').then(function (url) { cover = url; cb.innerHTML = coverHtml(); },
            function (e) { cb.innerHTML = coverHtml(); A.fail(e); });
        });
      },
      onSubmit: function (v, root) {
        var title = A.val(root, 'title');
        var html = sanitize(root.querySelector('#ed').innerHTML);
        var text = html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
        if (!title) { A.toast('Потрібен заголовок', true); return false; }
        if (!text && html.indexOf('<img') === -1) { A.toast('Текст порожній', true); return false; }
        var data = {
          title: title,
          cat: A.val(root, 'cat'),
          excerpt: A.val(root, 'excerpt') || text.slice(0, 180),
          body: html,
          img: cover,
          published: A.val(root, 'published'),
          updatedAt: A.FV.serverTimestamp()
        };
        var p;
        if (x.id) {
          p = A.db.collection('news').doc(x.id).update(data).then(function () { A.patch('news', x.id, data); });
        } else {
          data.createdAt = A.FV.serverTimestamp();
          p = A.db.collection('news').add(data).then(function (ref) {
            var now = { seconds: Math.floor(Date.now() / 1000) };
            A.data.news.unshift(Object.assign({}, data, { id: ref.id, createdAt: now, updatedAt: now }));
          });
        }
        return p.then(function () {
          A.log(x.id ? 'edit_news' : 'create_news', title);
          A.render();
          A.toast(data.published ? 'Збережено й опубліковано' : 'Збережено як чернетку');
        });
      }
    });
  }

  A.act('news-new', function () { editor(null); });
  A.act('news-edit', function (el, id) { var x = byId(id); if (x) editor(x); });
  A.act('news-toggle', function (el, id) {
    var x = byId(id); if (!x) return;
    var f = { published: !x.published, updatedAt: A.FV.serverTimestamp() };
    A.db.collection('news').doc(id).update(f).then(function () {
      A.patch('news', id, f);
      A.log(f.published ? 'publish_news' : 'unpublish_news', x.title || id);
      A.render();
      A.toast(f.published ? 'Опубліковано' : 'Знято з публікації');
    }, A.fail);
  });
  A.act('news-delete', function (el, id) {
    var x = byId(id); if (!x) return;
    A.confirm('Видалити «' + (x.title || 'без заголовка') + '»? Це незворотно. Якщо треба лише сховати — перенесіть у чернетки.', { danger: true, ok: 'Видалити' }).then(function (ok) {
      if (!ok) return;
      A.db.collection('news').doc(id).delete().then(function () {
        A.data.news = A.data.news.filter(function (n) { return n.id !== id; });
        A.log('delete_news', x.title || id);
        A.render();
        A.toast('Видалено');
      }, A.fail);
    });
  });
})();
