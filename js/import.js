// ── Масовий імпорт CSV/Excel ──
var _importRows   = [];  // розпарсені рядки
var _importErrors = [];  // помилки валідації

// Колонки CSV — порядок і назви
var IMPORT_COLS = [
  { key: 'title',     label: 'Назва*',        required: true  },
  { key: 'price',     label: 'Ціна*',         required: true  },
  { key: 'cat',       label: 'Категорія*',    required: true  },
  { key: 'condition', label: 'Стан',          required: false },
  { key: 'city',      label: 'Місто',         required: false },
  { key: 'desc',      label: 'Опис',          required: false },
  { key: 'battery',   label: 'АКБ (Ah)',      required: false },
  { key: 'speed',     label: 'Швидкість',     required: false },
  { key: 'range',     label: 'Запас ходу',    required: false },
  { key: 'year',      label: 'Рік',           required: false },
  { key: 'bargain',   label: 'Торг/Обмін',    required: false },
];

var VALID_CATS = [
  'Електросамокати','Велосипеди','Електровелосипеди',
  'Електроскутери','Електромотоцикли','Гіроборди та сигвеї',
  'Моноколеса','Квадроцикли','Аксесуари'
];
var VALID_CONDITIONS = ['Новий','Відмінний','Хороший','Задовільний'];
var VALID_BARGAIN    = ['Торг','Обмін','Торг+Обмін',''];

// ── Відкрити модальне вікно імпорту ──────────────────────────
function openImportModal() {
  if (!isLoggedIn) { showToast('⚠️ Увійдіть щоб імпортувати'); return; }
  var existing = document.getElementById('import-modal-overlay');
  if (existing) existing.remove();

  var overlay = document.createElement('div');
  overlay.id = 'import-modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto';
  overlay.onclick = function(e){ if(e.target===overlay) overlay.remove(); };

  overlay.innerHTML = [
    '<div style="background:var(--card-bg);border:1px solid var(--border);border-radius:20px;padding:28px;max-width:560px;width:100%;max-height:90vh;overflow-y:auto">',
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">',
        '<div>',
          '<div style="font-size:18px;font-weight:700">📥 Імпорт оголошень</div>',
          '<div style="font-size:13px;color:var(--text-muted);margin-top:2px">CSV або Excel файл</div>',
        '</div>',
        '<button onclick="document.getElementById(\'import-modal-overlay\').remove()" style="background:none;border:none;font-size:24px;cursor:pointer;color:var(--text-muted)">×</button>',
      '</div>',

      // Шаблон
      '<div style="background:var(--dark3);border-radius:12px;padding:14px 16px;margin-bottom:16px">',
        '<div style="font-size:13px;font-weight:600;margin-bottom:8px">Формат файлу:</div>',
        '<div style="font-size:12px;color:var(--text-muted);line-height:1.8">',
          'Перший рядок — заголовки. Колонки:<br>',
          '<code style="font-size:11px;background:var(--dark2);padding:2px 6px;border-radius:4px;color:var(--brand)">',
          IMPORT_COLS.map(function(c){ return c.label; }).join(' | '),
          '</code>',
        '</div>',
        '<button onclick="_downloadImportTemplate()" style="margin-top:10px;background:none;border:1px solid var(--border);border-radius:8px;padding:6px 14px;font-size:12px;cursor:pointer;color:var(--text-muted);font-family:inherit">',
          '⬇ Завантажити шаблон CSV',
        '</button>',
      '</div>',

      // Drag & drop зона
      '<div id="import-drop-zone" style="border:2px dashed var(--border);border-radius:14px;padding:36px 24px;text-align:center;cursor:pointer;transition:all .2s;margin-bottom:16px"',
        ' onclick="document.getElementById(\'import-file-input\').click()"',
        ' ondragover="event.preventDefault();this.style.borderColor=\'var(--brand)\'"',
        ' ondragleave="this.style.borderColor=\'var(--border)\'"',
        ' ondrop="_onImportDrop(event)">',
        '<div style="font-size:36px;margin-bottom:8px">📂</div>',
        '<div style="font-size:14px;font-weight:600">Перетягніть файл сюди</div>',
        '<div style="font-size:12px;color:var(--text-muted);margin-top:4px">або натисніть щоб обрати</div>',
        '<div style="font-size:11px;color:var(--text-muted);margin-top:6px">.csv, .xlsx, .xls</div>',
        '<input type="file" id="import-file-input" accept=".csv,.xlsx,.xls" style="display:none" onchange="_onImportFile(this)">',
      '</div>',

      // Preview
      '<div id="import-preview" style="display:none">',
        '<div id="import-stats" style="font-size:13px;margin-bottom:12px"></div>',
        '<div id="import-errors-wrap" style="display:none;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.3);border-radius:10px;padding:12px;margin-bottom:12px">',
          '<div style="font-weight:600;font-size:13px;color:#ef4444;margin-bottom:6px">⚠️ Помилки:</div>',
          '<div id="import-errors-list" style="font-size:12px;color:var(--text-muted)"></div>',
        '</div>',
        '<div id="import-table-wrap" style="overflow-x:auto;max-height:220px;border:1px solid var(--border);border-radius:10px;margin-bottom:16px"></div>',
        '<div style="display:flex;gap:10px">',
          '<button class="btn-outline" onclick="_resetImport()" style="flex:1;padding:11px">Скасувати</button>',
          '<button id="import-submit-btn" class="btn-primary" onclick="_submitImport()" style="flex:1;padding:11px" disabled>',
            'Імпортувати (<span id="import-valid-count">0</span>)',
          '</button>',
        '</div>',
      '</div>',
    '</div>'
  ].join('');

  document.body.appendChild(overlay);
}

// ── Drag & drop ───────────────────────────────────────────────
function _onImportDrop(e) {
  e.preventDefault();
  document.getElementById('import-drop-zone').style.borderColor = 'var(--border)';
  var file = e.dataTransfer.files[0];
  if (file) _parseImportFile(file);
}

function _onImportFile(input) {
  var file = input.files[0];
  if (file) _parseImportFile(file);
}

// ── Парсинг файлу ─────────────────────────────────────────────
function _parseImportFile(file) {
  var ext = file.name.split('.').pop().toLowerCase();
  var zone = document.getElementById('import-drop-zone');
  if (zone) zone.innerHTML = '<div style="padding:20px;color:var(--text-muted);font-size:13px">⏳ Читаємо файл...</div>';

  if (ext === 'csv') {
    var reader = new FileReader();
    reader.onload = function(e) {
      var rows = _parseCSV(e.target.result);
      _processImportRows(rows);
    };
    reader.readAsText(file, 'UTF-8');
  } else if (ext === 'xlsx' || ext === 'xls') {
    // Для Excel використовуємо SheetJS якщо доступний, інакше підказуємо CSV
    if (typeof XLSX !== 'undefined') {
      var reader2 = new FileReader();
      reader2.onload = function(e2) {
        var wb = XLSX.read(e2.target.result, { type: 'array' });
        var ws = wb.Sheets[wb.SheetNames[0]];
        var rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        _processImportRows(rows);
      };
      reader2.readAsArrayBuffer(file);
    } else {
      // Підвантажити SheetJS динамічно
      var s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      s.onload = function() { _parseImportFile(file); };
      s.onerror = function() { showToast('⚠️ Конвертуйте файл у CSV'); };
      document.head.appendChild(s);
    }
  } else {
    showToast('⚠️ Підтримуються тільки CSV, XLSX, XLS');
  }
}

// ── Парсер CSV ────────────────────────────────────────────────
function _parseCSV(text) {
  // Підтримка ; та , як розділювач
  var lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (!lines.length) return [];
  var delim = (lines[0].split(';').length > lines[0].split(',').length) ? ';' : ',';

  return lines.filter(function(l){ return l.trim(); }).map(function(line) {
    var cells = []; var cur = ''; var inQ = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (ch === '"') { inQ = !inQ; }
      else if (ch === delim && !inQ) { cells.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
    cells.push(cur.trim());
    return cells;
  });
}

// ── Обробка рядків ────────────────────────────────────────────
function _processImportRows(rows) {
  if (!rows || rows.length < 2) {
    showToast('⚠️ Файл порожній або неправильний формат');
    return;
  }

  // Знайти заголовки
  var headers = rows[0].map(function(h){ return String(h).trim().toLowerCase(); });
  var colMap = {};
  IMPORT_COLS.forEach(function(col) {
    var idx = headers.findIndex(function(h) {
      return h === col.key.toLowerCase() ||
             h === col.label.toLowerCase().replace('*','') ||
             h === col.label.toLowerCase();
    });
    if (idx >= 0) colMap[col.key] = idx;
  });

  // Парсимо рядки
  _importRows = [];
  _importErrors = [];

  var dataRows = rows.slice(1).filter(function(r){ return r.some(function(c){ return c && String(c).trim(); }); });

  dataRows.forEach(function(row, idx) {
    var lineNum = idx + 2;
    var item = {};
    var errors = [];

    IMPORT_COLS.forEach(function(col) {
      var val = (colMap[col.key] !== undefined) ? String(row[colMap[col.key]] || '').trim() : '';
      item[col.key] = val;
    });

    // Валідація
    if (!item.title) errors.push('Рядок ' + lineNum + ': відсутня назва');
    else if (item.title.length > 200) errors.push('Рядок ' + lineNum + ': назва > 200 символів');

    var price = parseInt(String(item.price).replace(/\s/g,'').replace(',','.'));
    if (!price || isNaN(price) || price < 0) errors.push('Рядок ' + lineNum + ': невірна ціна "' + item.price + '"');
    else item.price = price;

    if (!item.cat) errors.push('Рядок ' + lineNum + ': відсутня категорія');
    else {
      var matchCat = VALID_CATS.find(function(c){ return c.toLowerCase() === item.cat.toLowerCase(); });
      if (!matchCat) errors.push('Рядок ' + lineNum + ': невідома категорія "' + item.cat + '"');
      else item.cat = matchCat;
    }

    if (item.condition && !VALID_CONDITIONS.find(function(c){ return c.toLowerCase() === item.condition.toLowerCase(); })) {
      item.condition = 'Хороший'; // fallback
    }

    if (errors.length) {
      _importErrors = _importErrors.concat(errors);
      item._error = errors.join('; ');
      item._valid = false;
    } else {
      item._valid = true;
    }
    item._line = lineNum;
    _importRows.push(item);
  });

  _renderImportPreview();
}

// ── Рендер preview ────────────────────────────────────────────
function _renderImportPreview() {
  var preview = document.getElementById('import-preview');
  var zone    = document.getElementById('import-drop-zone');
  if (!preview) return;

  if (zone) zone.style.display = 'none';
  preview.style.display = '';

  var valid   = _importRows.filter(function(r){ return r._valid; }).length;
  var invalid = _importRows.length - valid;

  var statsEl = document.getElementById('import-stats');
  if (statsEl) {
    statsEl.innerHTML = '✅ Готово до імпорту: <b style="color:var(--brand)">' + valid + '</b>'
      + (invalid ? ' &nbsp;⚠️ З помилками: <b style="color:#ef4444">' + invalid + '</b>' : '');
  }

  // Помилки
  var errWrap = document.getElementById('import-errors-wrap');
  var errList = document.getElementById('import-errors-list');
  if (_importErrors.length && errWrap && errList) {
    errWrap.style.display = '';
    errList.innerHTML = _importErrors.slice(0, 10).map(function(e){ return '• ' + e; }).join('<br>')
      + (_importErrors.length > 10 ? '<br>... ще ' + (_importErrors.length - 10) + ' помилок' : '');
  }

  // Таблиця preview
  var tableWrap = document.getElementById('import-table-wrap');
  if (tableWrap) {
    var previewRows = _importRows.slice(0, 8);
    var html = '<table style="width:100%;border-collapse:collapse;font-size:12px">'
      + '<thead><tr style="background:var(--dark3)">'
      + '<th style="padding:8px;text-align:left;border-bottom:1px solid var(--border)">#</th>'
      + '<th style="padding:8px;text-align:left;border-bottom:1px solid var(--border)">Назва</th>'
      + '<th style="padding:8px;text-align:left;border-bottom:1px solid var(--border)">Ціна</th>'
      + '<th style="padding:8px;text-align:left;border-bottom:1px solid var(--border)">Категорія</th>'
      + '<th style="padding:8px;text-align:left;border-bottom:1px solid var(--border)">Стан</th>'
      + '<th style="padding:8px;text-align:left;border-bottom:1px solid var(--border)">Статус</th>'
      + '</tr></thead><tbody>';

    previewRows.forEach(function(row) {
      var bg = row._valid ? '' : 'background:rgba(239,68,68,.06)';
      html += '<tr style="border-bottom:1px solid var(--border);' + bg + '">'
        + '<td style="padding:7px 8px;color:var(--text-muted)">' + row._line + '</td>'
        + '<td style="padding:7px 8px;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (row.title || '—') + '</td>'
        + '<td style="padding:7px 8px;color:var(--brand);font-weight:600">' + (row.price ? row.price.toLocaleString('uk') + ' грн' : '—') + '</td>'
        + '<td style="padding:7px 8px;color:var(--text-muted)">' + (row.cat || '—') + '</td>'
        + '<td style="padding:7px 8px;color:var(--text-muted)">' + (row.condition || '—') + '</td>'
        + '<td style="padding:7px 8px">' + (row._valid ? '<span style="color:var(--brand)">✓</span>' : '<span style="color:#ef4444" title="' + (row._error||'') + '">✗</span>') + '</td>'
        + '</tr>';
    });

    if (_importRows.length > 8) {
      html += '<tr><td colspan="6" style="padding:8px;text-align:center;color:var(--text-muted)">... ще ' + (_importRows.length - 8) + ' рядків</td></tr>';
    }
    html += '</tbody></table>';
    tableWrap.innerHTML = html;
  }

  // Кнопка імпорту
  var btn = document.getElementById('import-submit-btn');
  var cnt = document.getElementById('import-valid-count');
  if (cnt) cnt.textContent = valid;
  if (btn) btn.disabled = valid === 0;
}

// ── Скинути форму ────────────────────────────────────────────
function _resetImport() {
  _importRows = [];
  _importErrors = [];
  var preview = document.getElementById('import-preview');
  var zone    = document.getElementById('import-drop-zone');
  if (preview) preview.style.display = 'none';
  if (zone) {
    zone.style.display = '';
    zone.innerHTML = '<div style="font-size:36px;margin-bottom:8px">📂</div>'
      + '<div style="font-size:14px;font-weight:600">Перетягніть файл сюди</div>'
      + '<div style="font-size:12px;color:var(--text-muted);margin-top:4px">або натисніть щоб обрати</div>'
      + '<div style="font-size:11px;color:var(--text-muted);margin-top:6px">.csv, .xlsx, .xls</div>'
      + '<input type="file" id="import-file-input" accept=".csv,.xlsx,.xls" style="display:none" onchange="_onImportFile(this)">';
    zone.onclick = function(){ document.getElementById('import-file-input').click(); };
  }
}

// ── Відправити імпорт ─────────────────────────────────────────
function _submitImport() {
  var valid = _importRows.filter(function(r){ return r._valid; });
  if (!valid.length) return;
  if (!isLoggedIn || !window._db) { showToast('⚠️ Увійдіть для імпорту'); return; }

  // Перевірка слотів
  var slots = _totalSlots();
  if (slots < valid.length) {
    showToast('⚠️ Недостатньо слотів. Потрібно ' + valid.length + ', є ' + slots);
    return;
  }

  var btn = document.getElementById('import-submit-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Імпортуємо...'; }

  var done = 0; var failed = 0;
  var total = valid.length;

  function _next(i) {
    if (i >= total) {
      showToast('✅ Імпортовано ' + done + ' оголошень' + (failed ? ', помилок: ' + failed : ''));
      document.getElementById('import-modal-overlay') && document.getElementById('import-modal-overlay').remove();
      if (typeof renderMyListings === 'function') renderMyListings();
      renderHomeListings();
      renderCatalog();
      return;
    }

    var row = valid[i];
    var fbListing = {
      title:      row.title.substring(0, 200),
      price:      row.price || 0,
      cat:        row.cat || '',
      city:       (row.city || '').substring(0, 100),
      condition:  row.condition || 'Хороший',
      desc:       (row.desc || '').substring(0, 2000),
      battery:    (row.battery || '').substring(0, 50),
      speed:      (row.speed || '').substring(0, 50),
      range:      (row.range || '').substring(0, 50),
      year:       row.year || '',
      bargain:    row.bargain || '',
      badge:      '',
      icon:       '',
      img:        '',
      imgs:       [],
      specs:      {},
      time:       new Date().toLocaleDateString('uk-UA'),
      seller:     (currentUser.name || '').substring(0, 100),
      sellerName: (currentUser.name || '').substring(0, 100),
      sellerEmail:(currentUser.email || '').substring(0, 200),
      uid:        currentUser.uid,
      createdAt:  firebase.firestore.FieldValue.serverTimestamp(),
      expiresAt:  firebase.firestore.Timestamp.fromDate(new Date(Date.now() + 30*24*60*60*1000)),
      status:     'active'
    };

    window._db.collection('listings').add(fbListing)
      .then(function(ref) {
        done++;
        fbListing.id = ref.id;
        _fbListings.unshift(fbListing);
        // Списуємо слот і чекаємо завершення перед наступним
        return _consumeSlot();
      })
      .then(function() {
        // Оновити прогрес
        var btn2 = document.getElementById('import-submit-btn');
        if (btn2) btn2.textContent = 'Імпортуємо... ' + (i+1) + '/' + total;
        setTimeout(function(){ _next(i+1); }, 300); // 300ms між записами щоб не перевантажити
      })
      .catch(function(e) {
        failed++;
        console.error('Import error row ' + (i+1) + ':', e.message);
        setTimeout(function(){ _next(i+1); }, 300);
      });
  }
  _next(0);
}

// ── Завантажити шаблон CSV ────────────────────────────────────
function _downloadImportTemplate() {
  var headers = IMPORT_COLS.map(function(c){ return c.label.replace('*',''); }).join(';');
  var example = [
    'Електросамокат Kugoo S3 Pro;15000;Електросамокати;Хороший;Київ;Хороший стан мінімальний пробіг;7.5 Ah;30 км/год;25 км;2022;Торг',
    'Велосипед Trek 820;8500;Велосипеди;Відмінний;Львів;;;"";;"";2023;',
  ].join('\n');
  var csv = headers + '\n' + example;
  var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href = url; a.download = 'ridego-import-template.csv';
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
// ══════════════════════════════════════════════════════════════
// BULK IMPORT END
// ══════════════════════════════════════════════════════════════

