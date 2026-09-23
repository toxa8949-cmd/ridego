/* Огляд: ключові цифри, динаміка, розподіли. */
'use strict';
(function () {
  var chartDays = 30;
  var traffic = null; // { visitors, views } за сьогодні

  function loadTraffic() {
    var today = new Date().toISOString().slice(0, 10);
    var get = function (id) {
      return A.db.collection('analytics').doc(id).get()
        .then(function (s) { return s.exists ? (s.data().count || 0) : 0; }, function () { return null; });
    };
    Promise.all([get('visitors_' + today), get('views_' + today)]).then(function (r) {
      traffic = { visitors: r[0], views: r[1] };
      if (A.current === 'overview') A.render();
    });
  }

  function kpi(value, label, sub, up) {
    return '<div class="kpi"><div class="kpi-v">' + value + '</div><div class="kpi-l">' + label + '</div>' +
      (sub ? '<div class="kpi-s' + (up ? ' up' : '') + '">' + sub + '</div>' : '') + '</div>';
  }

  function chart(days) {
    var L = A.data.listings, U = A.data.users;
    var buckets = [];
    for (var i = days - 1; i >= 0; i--) {
      var from = A.startOfDay(i), to = from + 86400;
      buckets.push({
        from: from,
        l: L.filter(function (x) { var s = A.sec(x.createdAt); return s >= from && s < to; }).length,
        u: U.filter(function (x) { var s = A.sec(x.createdAt); return s >= from && s < to; }).length
      });
    }
    var max = Math.max(1, Math.max.apply(null, buckets.map(function (b) { return Math.max(b.l, b.u); })));
    var W = 720, H = 170, pad = 18, gw = (W - 30) / days, bw = Math.max(2, Math.min(9, gw / 2 - 1));
    var sumL = 0, sumU = 0;
    var svg = '<svg viewBox="0 0 ' + W + ' ' + (H + pad) + '" role="img" aria-label="Графік за ' + days + ' днів">';
    // сітка: 0 і максимум
    svg += '<line class="axis" x1="30" x2="' + W + '" y1="' + H + '" y2="' + H + '"/>';
    svg += '<text x="24" y="' + (H) + '" text-anchor="end">0</text>';
    svg += '<text x="24" y="10" text-anchor="end">' + max + '</text>';
    svg += '<line class="axis" x1="30" x2="' + W + '" y1="4" y2="4" stroke-dasharray="2 4"/>';
    buckets.forEach(function (b, i) {
      sumL += b.l; sumU += b.u;
      var x = 30 + i * gw + (gw - bw * 2 - 1) / 2;
      var hl = Math.round(b.l / max * (H - 6)), hu = Math.round(b.u / max * (H - 6));
      var d = new Date(b.from * 1000);
      var label = d.getDate() + '.' + String(d.getMonth() + 1).padStart(2, '0');
      svg += '<g><title>' + label + ': оголошень ' + b.l + ', реєстрацій ' + b.u + '</title>' +
        '<rect class="bar-l" x="' + x.toFixed(1) + '" y="' + (H - hl) + '" width="' + bw.toFixed(1) + '" height="' + hl + '"/>' +
        '<rect class="bar-u" x="' + (x + bw + 1).toFixed(1) + '" y="' + (H - hu) + '" width="' + bw.toFixed(1) + '" height="' + hu + '"/>' +
        '<rect x="' + (30 + i * gw).toFixed(1) + '" y="0" width="' + gw.toFixed(1) + '" height="' + H + '" fill="transparent"/></g>';
      var step = days <= 14 ? 1 : days <= 30 ? 3 : 10;
      if ((days - 1 - i) % step === 0) {
        svg += '<text x="' + (30 + i * gw + gw / 2).toFixed(1) + '" y="' + (H + 13) + '" text-anchor="middle">' + label + '</text>';
      }
    });
    svg += '</svg>';
    return '<div class="chart">' + svg + '</div>' +
      '<div class="legend"><span><i style="background:var(--accent)"></i>Оголошення: ' + sumL + '</span>' +
      '<span><i style="background:var(--text-3)"></i>Реєстрації: ' + sumU + '</span></div>';
  }

  A.page('overview', {
    title: 'Огляд',
    enter: function () { if (!traffic) loadTraffic(); },
    render: function () {
      var d = A.data;
      var active = d.listings.filter(function (l) { return l.status === 'active'; });
      var t0 = A.startOfDay(0), t7 = A.startOfDay(6);
      var l7 = d.listings.filter(function (l) { return A.sec(l.createdAt) >= t7; }).length;
      var lToday = d.listings.filter(function (l) { return A.sec(l.createdAt) >= t0; }).length;
      var u7 = d.users.filter(function (u) { return A.sec(u.createdAt) >= t7; }).length;
      var uToday = d.users.filter(function (u) { return A.sec(u.createdAt) >= t0; }).length;
      var business = d.users.filter(function (u) { return u.type === 'business'; }).length;
      var sellers = {}; active.forEach(function (l) { if (l.uid) sellers[l.uid] = 1; });
      var openReports = d.reports.filter(function (r) { return r.status !== 'resolved'; }).length;
      var newFeedback = d.feedback.filter(function (f) { return (f.status || 'new') === 'new'; }).length;
      var prices = active.map(function (l) { return Number(l.price) || 0; }).filter(Boolean).sort(function (a, b) { return a - b; });
      var median = prices.length ? prices[Math.floor(prices.length / 2)] : 0;

      A.$('kpis').innerHTML =
        kpi(A.num(active.length), 'Активних оголошень', '+' + l7 + ' за 7 днів', l7 > 0) +
        kpi(A.num(d.users.length), 'Користувачів', '+' + u7 + ' за 7 днів', u7 > 0) +
        kpi(lToday + ' / ' + uToday, 'Сьогодні: оголошень / реєстрацій') +
        kpi(Object.keys(sellers).length, 'Продавців з активними', business + ' бізнес-акаунтів') +
        kpi(median ? A.num(median) : '—', 'Медіанна ціна, грн') +
        kpi(traffic && traffic.visitors != null ? A.num(traffic.visitors) : '—', 'Відвідувачів сьогодні',
          'лише з входом в акаунт') +
        kpi(traffic && traffic.views != null ? A.num(traffic.views) : '—', 'Переглядів оголошень сьогодні');

      var att = [];
      if (openReports) att.push('<a href="#reports">' + openReports + ' ' + A.plural(openReports, 'відкрита скарга', 'відкриті скарги', 'відкритих скарг') + '</a>');
      if (newFeedback) att.push('<a href="#feedback">' + newFeedback + ' ' + A.plural(newFeedback, 'нове звернення', 'нові звернення', 'нових звернень') + '</a>');
      var blockedWithAds = d.users.filter(function (u) {
        return u.status === 'blocked' && active.some(function (l) { return l.uid === u.id; });
      }).length;
      if (blockedWithAds) att.push('<a href="#users">' + blockedWithAds + ' заблок. з активними оголошеннями</a>');
      A.$('attention').innerHTML = att.length ? '<div class="notice"><span>Потребує уваги:</span>' + att.join('<span class="muted">·</span>') + '</div>' : '';

      document.querySelectorAll('#chart-range button').forEach(function (b) {
        b.classList.toggle('on', Number(b.getAttribute('data-days')) === chartDays);
      });
      A.$('chart').innerHTML = chart(chartDays);

      A.$('by-cat').innerHTML = A.distHtml(A.countBy(active, function (l) { return l.cat; }), active.length);
      A.$('by-city').innerHTML = A.distHtml(A.countBy(active, function (l) { return (l.city || '').split(',')[0].trim(); }), active.length, 7);
      var withBrand = active.filter(function (l) { return l.brand; });
      A.$('by-brand').innerHTML = A.distHtml(A.countBy(withBrand, function (l) { return l.brand; }), 0, 7) +
        (active.length - withBrand.length ? '<p class="muted" style="margin:8px 0 0;font-size:12px">без бренду: ' + (active.length - withBrand.length) + '</p>' : '');

      var recentUsers = d.users.slice().sort(function (a, b) { return A.sec(b.createdAt) - A.sec(a.createdAt); }).slice(0, 6);
      A.$('recent-users').innerHTML = '<ul class="list">' + recentUsers.map(function (u) {
        return '<li><span class="t"><a href="#users" data-act="user-open" data-id="' + A.esc(u.id) + '">' + A.esc(A.userName(u)) + '</a>' +
          (u.type === 'business' ? ' <span class="tag">бізнес</span>' : '') + '</span><span class="m">' + A.ago(u.createdAt) + '</span></li>';
      }).join('') + '</ul>';

      var recent = d.listings.slice().sort(function (a, b) { return A.sec(b.createdAt) - A.sec(a.createdAt); }).slice(0, 8);
      A.$('recent-listings').innerHTML = '<ul class="list">' + recent.map(function (l) {
        return '<li><span class="t"><a href="#" data-act="listing-edit" data-id="' + A.esc(l.id) + '">' + A.esc(l.title || 'Без назви') + '</a>' +
          ' <span class="muted">· ' + A.esc(l.sellerName || '') + (l.city ? ', ' + A.esc(l.city) : '') + '</span></span>' +
          '<span class="m num">' + A.money(l.price) + '</span>' +
          '<span class="m">' + (l.status === 'active' ? '' : A.esc(statusLabel(l.status)) + ' · ') + A.ago(l.createdAt) + '</span></li>';
      }).join('') + '</ul>';
    }
  });

  function statusLabel(s) {
    return { deleted: 'видалене', inactive: 'приховане', sold: 'продане' }[s] || s || '';
  }

  A.act('chart-range', function (el) {
    chartDays = Number(el.getAttribute('data-days')) || 30;
    A.render();
  });
})();
