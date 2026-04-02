// ── Слайдер цін, шерінг, порівняння ──
var PRICE_MAX = 500000;

function onPriceRangeInput() {
  var fromEl = document.getElementById('fp-price-from-range');
  var toEl   = document.getElementById('fp-price-to-range');
  if (!fromEl || !toEl) return;

  var from = parseInt(fromEl.value);
  var to   = parseInt(toEl.value);

  var gap = 1000;
  if (from > to - gap) {
    if (document.activeElement === fromEl) {
      from = to - gap;
      fromEl.value = from;
    } else {
      to = from + gap;
      toEl.value = to;
    }
  }

  _updatePriceSliderFill(from, to);

  var label = document.getElementById('price-range-label');
  if (label) {
    if (from === 0 && to >= PRICE_MAX) {
      label.textContent = '\u0411\u0443\u0434\u044c-\u044f\u043a\u0430';
    } else {
      label.textContent = _fmtPrice(from) + ' \u2014 ' + (to >= PRICE_MAX ? '\u0431\u0435\u0437 \u043c\u0435\u0436\u0456' : _fmtPrice(to)) + ' \u0433\u0440\u043d';
    }
  }

  var hidFrom = document.getElementById('fp-price-from');
  var hidTo   = document.getElementById('fp-price-to');
  if (hidFrom) hidFrom.value = from > 0 ? from : '';
  if (hidTo)   hidTo.value   = to < PRICE_MAX ? to : '';

  document.querySelectorAll('.price-preset').forEach(function(b) { b.classList.remove('active'); });

  updateActiveFilters();
}

function _updatePriceSliderFill(from, to) {
  var fill = document.getElementById('price-slider-fill');
  if (!fill) return;
  var pctFrom = (from / PRICE_MAX) * 100;
  var pctTo   = (to   / PRICE_MAX) * 100;
  fill.style.left  = pctFrom + '%';
  fill.style.width = (pctTo - pctFrom) + '%';
}

function setPricePreset(from, to) {
  var fromEl = document.getElementById('fp-price-from-range');
  var toEl   = document.getElementById('fp-price-to-range');
  if (fromEl) fromEl.value = from;
  if (toEl)   toEl.value   = Math.min(to, PRICE_MAX);

  document.querySelectorAll('.price-preset').forEach(function(b) {
    var txt = b.textContent;
    var isAll = from === 0 && to >= PRICE_MAX;
    b.classList.toggle('active', isAll ? txt === '\u0412\u0441\u0456' : false);
  });

  event && event.target && event.target.classList.add('active');

  onPriceRangeInput();
}

function _fmtPrice(n) {
  if (n >= 1000) return Math.round(n/1000) + '\u00a0\u0442\u0438\u0441';
  return n.toLocaleString('uk');
}

function _initPriceSlider() {
  var fromEl = document.getElementById('fp-price-from-range');
  var toEl   = document.getElementById('fp-price-to-range');
  if (!fromEl || !toEl) return;
  if (fromEl.dataset.initialized) return;
  fromEl.dataset.initialized = '1';
  _updatePriceSliderFill(parseInt(fromEl.value)||0, parseInt(toEl.value)||PRICE_MAX);
}

function shareListing() {
  var l = _allListings().find(function(x){ return x && x.id === currentDetailId; });
  if (!l) return;
  var url  = 'https://ridego.com.ua/listing/' + l.id;
  var text = l.title + ' — ' + l.price.toLocaleString('uk') + ' грн';

  if (navigator.share) {
    navigator.share({ title: text, text: text, url: url })
      .catch(function(){});
  } else {

    _showShareModal(url, text, l.title);
  }
}

function _showShareModal(url, text, title) {
  var existing = document.getElementById('share-modal-overlay');
  if (existing) existing.remove();

  var tgUrl  = 'https://t.me/share/url?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(text);
  var vibUrl = 'viber://forward?text=' + encodeURIComponent(text + ' ' + url);
  var fbUrl  = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url);

  var overlay = document.createElement('div');
  overlay.id = 'share-modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:flex-end;justify-content:center;padding:0 0 20px';
  overlay.onclick = function(e){ if(e.target===overlay) overlay.remove(); };

  overlay.innerHTML = '<div style="background:var(--card-bg);border:1px solid var(--border);border-radius:20px 20px 16px 16px;padding:24px;max-width:400px;width:100%;margin:0 16px">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">'
    + '<div style="font-size:16px;font-weight:700">\uD83D\uDD17 \u041f\u043e\u0434\u0456\u043b\u0438\u0442\u0438\u0441\u044c</div>'
    + '<button onclick="document.getElementById(\'share-modal-overlay\').remove()" style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--text-muted);padding:0">\xd7</button>'
    + '</div>'
    + '<div style="font-size:13px;color:var(--text-muted);margin-bottom:16px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + title + '</div>'
    + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">'
    + _shareBtn('fa-brands fa-telegram', '#2ca5e0', '\u0422\u0435\u043b\u0435\u0433\u0440\u0430\u043c', "window.open('" + tgUrl + "','_blank')")
    + _shareBtn('fa-brands fa-viber', '#7360f2', '\u0412\u0430\u0439\u0431\u0435\u0440', "window.open('" + vibUrl + "','_blank')")
    + _shareBtn('fa-brands fa-facebook', '#1877f2', 'Facebook', "window.open('" + fbUrl + "','_blank')")
    + _shareBtn('fa-solid fa-copy', 'var(--brand)', '\u041a\u043e\u043f\u0456\u044e\u0432\u0430\u0442\u0438', "_copyShareUrl('" + url + "')")
    + '</div>'
    + '<div style="display:flex;align-items:center;gap:8px;background:var(--dark3);border-radius:10px;padding:10px 14px">'
    + '<div style="font-size:12px;color:var(--text-muted);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + url + '</div>'
    + '<button onclick="_copyShareUrl(\'' + url + '\')" style="background:var(--brand);border:none;color:#000;border-radius:7px;padding:5px 12px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;flex-shrink:0">\u0421\u043a\u043e\u043f\u0456\u044e\u0432\u0430\u0442\u0438</button>'
    + '</div></div>';

  document.body.appendChild(overlay);
}

function _shareBtn(icon, color, label, action) {
  return '<div style="display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer" onclick="' + action + '">'
    + '<div style="width:48px;height:48px;border-radius:50%;background:' + color + '20;display:flex;align-items:center;justify-content:center;font-size:22px;color:' + color + '">'
    + '<i class="' + icon + '"></i></div>'
    + '<div style="font-size:11px;color:var(--text-muted);text-align:center">' + label + '</div>'
    + '</div>';
}

function _copyShareUrl(url) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(function() {
      showToast('\u2705 \u041f\u043e\u0441\u0438\u043b\u0430\u043d\u043d\u044f \u0441\u043a\u043e\u043f\u0456\u0439\u043e\u0432\u0430\u043d\u043e!');
    });
  } else {
    var ta = document.createElement('textarea');
    ta.value = url; document.body.appendChild(ta);
    ta.select(); document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('\u2705 \u041f\u043e\u0441\u0438\u043b\u0430\u043d\u043d\u044f \u0441\u043a\u043e\u043f\u0456\u0439\u043e\u0432\u0430\u043d\u043e!');
  }
  var overlay = document.getElementById('share-modal-overlay');
  if (overlay) setTimeout(function(){ overlay.remove(); }, 1000);
}

// copySellerLink визначена вище (використовує currentSellerId)

var _compareIds = [];
var _compareMax = 3;

function toggleCompare(id, btn) {
  var idx = _compareIds.indexOf(id);
  if (idx >= 0) {
    _compareIds.splice(idx, 1);
    if (btn) { btn.style.opacity = '.6'; btn.style.color = ''; }
  } else {
    if (_compareIds.length >= _compareMax) {
      showToast('\u041c\u0430\u043a\u0441\u0438\u043c\u0443\u043c ' + _compareMax + ' \u043e\u0433\u043e\u043b\u043e\u0448\u0435\u043d\u043d\u044f \u0434\u043b\u044f \u043f\u043e\u0440\u0456\u0432\u043d\u044f\u043d\u043d\u044f');
      return;
    }
    _compareIds.push(id);
    if (btn) { btn.style.opacity = '1'; btn.style.color = 'var(--brand)'; }
  }
  _updateCompareBar();
}

function _updateCompareBar() {
  var bar = document.getElementById('compare-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'compare-bar';
    bar.style.cssText = 'position:fixed;bottom:70px;left:50%;transform:translateX(-50%);z-index:8888;'
      + 'background:var(--dark3);border:1px solid var(--brand);border-radius:50px;'
      + 'padding:10px 20px;display:flex;align-items:center;gap:14px;'
      + 'box-shadow:0 4px 20px rgba(0,200,83,.25);transition:all .3s;white-space:nowrap';
    document.body.appendChild(bar);
  }

  if (_compareIds.length === 0) {
    bar.style.display = 'none';
    return;
  }

  bar.style.display = 'flex';
  var listings = _compareIds.map(function(id) {
    return _allListings().find(function(l){ return l && l.id === id; });
  }).filter(Boolean);

  var thumbs = listings.map(function(l) {
    var src = l.img || (l.photos && l.photos[0]) || '';
    return src
      ? '<img src="' + src + '" style="width:28px;height:28px;border-radius:6px;object-fit:cover;border:1px solid var(--border)">'
      : '<div style="width:28px;height:28px;border-radius:6px;background:var(--brand-dim);display:flex;align-items:center;justify-content:center;font-size:14px">\uD83D\uDCF7</div>';
  }).join('');

  bar.innerHTML = thumbs
    + '<span style="font-size:13px;font-weight:600">' + _compareIds.length + '/' + _compareMax + ' \u043e\u0433\u043e\u043b\u043e\u0448\u0435\u043d\u043d\u044f</span>'
    + (_compareIds.length >= 2
      ? '<button onclick="openCompareModal()" style="background:var(--brand);border:none;color:#000;border-radius:20px;padding:6px 16px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">'
        + '<i class="fa-solid fa-scale-balanced" style="margin-right:5px"></i>\u041f\u043e\u0440\u0456\u0432\u043d\u044f\u0442\u0438</button>'
      : '<span style="font-size:12px;color:var(--text-muted)">\u0414\u043e\u0434\u0430\u0439\u0442\u0435 \u0449\u0435 1</span>')
    + '<button onclick="clearCompare()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:18px;padding:0;line-height:1">\xd7</button>';
}

function clearCompare() {
  _compareIds = [];
  document.querySelectorAll('.compare-btn-card').forEach(function(b) {
    b.style.opacity = '.6'; b.style.color = '';
  });
  _updateCompareBar();
}

function openCompareModal() {
  var listings = _compareIds.map(function(id) {
    return _allListings().find(function(l){ return l && l.id === id; });
  }).filter(Boolean);
  if (listings.length < 2) return;

  var overlay = document.createElement('div');
  overlay.id = 'compare-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;overflow-y:auto;padding:20px';
  overlay.onclick = function(e){ if(e.target===overlay) overlay.remove(); };

  var cols = listings.map(function(l) {
    var img = l.img || (l.photos && l.photos[0]) || '';
    return '<div style="flex:1;min-width:0">'
      + (img ? '<img src="' + img + '" style="width:100%;height:140px;object-fit:cover;border-radius:12px;margin-bottom:12px">' : '')
      + '<div style="font-weight:700;font-size:15px;margin-bottom:4px">' + (l.title||'') + '</div>'
      + '<div style="font-size:20px;font-weight:800;color:var(--brand);margin-bottom:12px">' + (l.price||0).toLocaleString('uk') + ' \u0433\u0440\u043d</div>'
      + '<button onclick="showDetail(\'' + l.id + '\');document.getElementById(\'compare-overlay\').remove()" '
      + 'style="width:100%;padding:8px;border-radius:8px;background:var(--brand);border:none;color:#000;font-weight:700;cursor:pointer;font-size:13px;font-family:inherit">'
      + '\u0414\u0438\u0432\u0438\u0442\u0438\u0441\u044c</button>'
      + '</div>';
  }).join('<div style="width:1px;background:var(--border);flex-shrink:0"></div>');

  var rows = [
    ['\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0456\u044f', function(l){ return l.cat || '\u2014'; }],
    ['\u0421\u0442\u0430\u043d', function(l){ return l.condition || '\u2014'; }],
    ['\u0420\u0456\u043a', function(l){ return l.year || '\u2014'; }],
    ['\u041f\u0440\u043e\u0431\u0456\u0433', function(l){ return l.mileage ? l.mileage + ' \u043a\u043c' : '\u2014'; }],
    ['\u0411\u0440\u0435\u043d\u0434', function(l){ return l.brand || '\u2014'; }],
    ['\u041c\u043e\u0434\u0435\u043b\u044c', function(l){ return l.model || '\u2014'; }],
    ['\u0411\u0430\u0442\u0430\u0440\u0435\u044f', function(l){ return l.battery || l.battAh ? (l.battAh||'') + ' Ah' : '\u2014'; }],
    ['\u0428\u0432\u0438\u0434\u043a\u0456\u0441\u0442\u044c', function(l){ return l.speed || l.speedVal ? (l.speedVal||l.speed||'') + ' \u043a\u043c/\u0433\u043e\u0434' : '\u2014'; }],
    ['\u0417\u0430\u043f\u0430\u0441 \u0445\u043e\u0434\u0443', function(l){ return l.range || l.rangeVal ? (l.rangeVal||'') + ' \u043a\u043c' : '\u2014'; }],
    ['\u041c\u0456\u0441\u0442\u043e', function(l){ return l.city || '\u2014'; }],
    ['\u041f\u0440\u043e\u0434\u0430\u0432\u0435\u0446\u044c', function(l){ return l.sellerName || l.seller || '\u2014'; }],
  ].map(function(row) {
    var label = row[0]; var fn = row[1];
    var vals = listings.map(fn);
    var allSame = vals.every(function(v){ return v === vals[0]; });
    var cells = listings.map(function(l, i) {
      var v = fn(l);
      var best = '';
      if (label === '\u0426\u0456\u043d\u0430') {
        var prices = listings.map(function(x){ return x.price; });
        if (l.price === Math.min.apply(null, prices)) best = 'color:var(--brand);font-weight:700';
      }
      return '<td style="padding:10px 12px;text-align:center;' + (allSame?'':'') + best + '">' + v + '</td>';
    }).join('<td style="width:1px;background:var(--border)"></td>');
    return '<tr style="border-bottom:1px solid var(--border)"><td style="padding:10px 12px;font-size:12px;color:var(--text-muted);font-weight:600;white-space:nowrap">' + label + '</td>' + cells + '</tr>';
  }).join('');

  overlay.innerHTML = '<div style="background:var(--card-bg);border-radius:20px;max-width:700px;margin:0 auto;overflow:hidden">'
    + '<div style="padding:20px 24px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">'
    + '<div style="font-size:18px;font-weight:700"><i class="fa-solid fa-scale-balanced" style="color:var(--brand);margin-right:8px"></i>\u041f\u043e\u0440\u0456\u0432\u043d\u044f\u043d\u043d\u044f</div>'
    + '<button onclick="document.getElementById(\'compare-overlay\').remove()" style="background:none;border:none;font-size:24px;cursor:pointer;color:var(--text-muted)">\xd7</button>'
    + '</div>'
    + '<div style="display:flex;gap:16px;padding:20px 24px;border-bottom:1px solid var(--border)">' + cols + '</div>'
    + '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">'
    + '<tbody>' + rows + '</tbody></table></div>'
    + '<div style="padding:16px 24px;display:flex;justify-content:center">'
    + '<button onclick="clearCompare();document.getElementById(\'compare-overlay\').remove()" style="background:none;border:1px solid var(--border);color:var(--text-muted);border-radius:20px;padding:8px 20px;font-size:13px;cursor:pointer;font-family:inherit">'
    + '\u041e\u0447\u0438\u0441\u0442\u0438\u0442\u0438 \u0432\u0438\u0431\u0456\u0440</button></div>'
    + '</div>';

  document.body.appendChild(overlay);
}


// (duplicate shareListing/copySellerLink/toggleCompare/openCompareModal block removed)



