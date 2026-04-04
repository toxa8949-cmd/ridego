const BASE = 'https://ridego.com.ua';
const PROJECT = 'ridego-6f981';

const BOTS = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|linkedinbot|telegrambot|whatsapp|applebot|mj12bot|ahrefsbot|semrushbot|petalbot|bytespider/i;

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

const CATEGORIES = {
  'elektrosamokaty':   { name: 'Електросамокати', icon: '⚡', h1: 'Електросамокати — купити в Україні' },
  'velosypedy':        { name: 'Велосипеди', icon: '🚲', h1: 'Велосипеди — купити в Україні' },
  'elektrovelosypedy': { name: 'Електровелосипеди', icon: '🚴', h1: 'Електровелосипеди — купити в Україні' },
  'elektroskutery':    { name: 'Електроскутери', icon: '🛵', h1: 'Електроскутери — купити в Україні' },
  'elektromotocykly':  { name: 'Електромотоцикли', icon: '🏍', h1: 'Електромотоцикли — купити в Україні' },
};

async function getListings(limit) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`;
  const body = {
    structuredQuery: {
      from: [{ collectionId: 'listings' }],
      where: { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'active' } } },
      orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
      limit: limit || 24
    }
  };
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) return [];
    const data = await res.json();
    return data.filter(d => d.document).map(d => {
      const f = d.document.fields || {};
      const id = d.document.name.split('/').pop();
      return {
        id,
        title: f.title?.stringValue || '',
        price: f.price?.integerValue || f.price?.doubleValue || '',
        city: f.city?.stringValue || '',
        cat: f.cat?.stringValue || '',
        condition: f.condition?.stringValue || '',
        img: f.img?.stringValue || '',
      };
    });
  } catch(e) { return []; }
}

module.exports = async (req, res) => {
  const ua = req.headers['user-agent'] || '';
  const isBot = BOTS.test(ua);

  if (!isBot) {
    const fs = require('fs'); const path = require('path');
    try {
      const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      return res.status(200).send(html);
    } catch(e) {
      res.setHeader('Location', `${BASE}/catalog`);
      return res.status(302).end();
    }
  }

  const listings = await getListings(24);

  const listingsHtml = listings.length ? listings.map(l => {
    const price = l.price ? Number(l.price).toLocaleString('uk') + ' грн' : '';
    const catSlug = Object.entries(CATEGORIES).find(([,v])=>v.name===l.cat)?.[0] || 'catalog';
    return `<article style="border:1px solid #eee;border-radius:12px;overflow:hidden;display:flex;gap:0;flex-direction:column">
      ${l.img ? `<a href="${BASE}/listing/${l.id}"><img src="${escHtml(l.img)}" alt="${escHtml(l.title+(l.city?' у '+l.city:''))}" width="400" height="300" loading="lazy" style="width:100%;height:180px;object-fit:cover;display:block"></a>` : ''}
      <div style="padding:12px">
        <a href="${BASE}/listing/${l.id}" style="font-weight:700;color:#111;text-decoration:none;font-size:15px;display:block;margin-bottom:4px">${escHtml(l.title)}</a>
        ${price ? `<div style="color:#1db954;font-weight:800;font-size:17px;margin-bottom:4px">${price}</div>` : ''}
        <div style="color:#888;font-size:13px">${escHtml(l.city)}${l.cat ? ` · <a href="${BASE}/category/${catSlug}" style="color:#888;text-decoration:none">${escHtml(l.cat)}</a>` : ''}${l.condition ? ' · '+escHtml(l.condition) : ''}</div>
      </div>
    </article>`;
  }).join('\n') : '<p style="color:#888;grid-column:1/-1">Оголошення завантажуються...</p>';

  const catNavHtml = Object.entries(CATEGORIES).map(([slug, info]) =>
    `<a href="${BASE}/category/${slug}" style="display:inline-flex;align-items:center;gap:6px;padding:10px 18px;background:#f0fdf4;border-radius:10px;text-decoration:none;color:#111;font-weight:600;font-size:14px;margin:4px;border:1px solid #d1fae5">${info.icon} ${escHtml(info.name)}</a>`
  ).join('');

  const itemListSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Каталог електротранспорту — RideGO",
    "url": `${BASE}/catalog`,
    "numberOfItems": listings.length,
    "itemListElement": listings.slice(0,20).map((l,i) => ({
      "@type": "ListItem", "position": i+1, "url": `${BASE}/listing/${l.id}`, "name": l.title
    }))
  });

  const breadcrumbSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "RideGO", "item": BASE },
      { "@type": "ListItem", "position": 2, "name": "Каталог", "item": `${BASE}/catalog` }
    ]
  });

  const html = `<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Каталог електротранспорту — купити електросамокат, велосипед, скутер в Україні | RideGO</title>
<meta name="description" content="Каталог електросамокатів, велосипедів, електровелосипедів та скутерів. Понад 5800 оголошень по всій Україні. Нові та вживані, вигідні ціни від приватних продавців.">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${BASE}/catalog">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<meta property="og:type" content="website">
<meta property="og:title" content="Каталог електротранспорту — RideGO">
<meta property="og:description" content="Понад 5800 оголошень електротранспорту по всій Україні.">
<meta property="og:url" content="${BASE}/catalog">
<meta property="og:site_name" content="RideGO">
<meta property="og:image" content="${BASE}/og-image.png">
<meta property="og:locale" content="uk_UA">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Каталог електротранспорту — RideGO">
<meta name="twitter:description" content="Понад 5800 оголошень. Електросамокати, велосипеди, скутери.">
<meta name="twitter:image" content="${BASE}/og-image.png">
<script type="application/ld+json">${breadcrumbSchema}</script>
<script type="application/ld+json">${itemListSchema}</script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;max-width:980px;margin:0 auto;padding:20px;color:#222;background:#fff}
header{padding:16px 0;border-bottom:2px solid #1db954;margin-bottom:20px}
header a{font-size:26px;font-weight:800;color:#111;text-decoration:none}
header a span{color:#1db954}
.bc{font-size:13px;color:#888;margin-bottom:20px}
.bc a{color:#1db954;text-decoration:none}
.bc span{margin:0 5px;color:#ccc}
h1{font-size:clamp(22px,4vw,34px);font-weight:800;margin-bottom:8px;color:#111}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px;margin-bottom:32px}
footer{padding:20px 0;border-top:1px solid #eee;font-size:13px;color:#999;text-align:center;margin-top:32px}
footer a{color:#1db954;text-decoration:none;margin:0 8px}
</style>
</head>
<body>
<header>
  <a href="${BASE}">Ride<span>GO</span></a>
</header>
<nav class="bc" aria-label="Breadcrumb">
  <a href="${BASE}">RideGO</a><span>›</span><span>Каталог</span>
</nav>
<h1>Каталог електротранспорту</h1>
<p style="color:#666;margin-bottom:20px">Купуй та продавай електросамокати, велосипеди, скутери по всій Україні</p>
<section style="margin-bottom:28px">
  <h2 style="font-size:17px;font-weight:700;margin-bottom:12px;color:#111">Категорії</h2>
  <div>${catNavHtml}</div>
</section>
<section>
  <h2 style="font-size:17px;font-weight:700;margin-bottom:16px;color:#111">Оголошення <span style="color:#888;font-weight:400;font-size:14px">(${listings.length})</span></h2>
  <div class="grid">${listingsHtml}</div>
</section>
<section style="padding:28px;background:#f0fdf4;border-radius:16px;text-align:center;margin-bottom:32px">
  <h2 style="font-size:19px;font-weight:700;margin-bottom:8px">Продайте свій транспорт</h2>
  <p style="color:#555;margin-bottom:16px">Розмістіть оголошення безкоштовно — 10 слотів при реєстрації</p>
  <a href="${BASE}/add" style="display:inline-block;background:#1db954;color:#fff;padding:13px 28px;border-radius:10px;text-decoration:none;font-weight:700">Подати оголошення →</a>
</section>
<footer>
  <span>© 2024–2026 RideGO</span>
  <a href="${BASE}">Головна</a>
  <a href="${BASE}/catalog">Каталог</a>
  <a href="${BASE}/news">Новини</a>
  <a href="${BASE}/faq">FAQ</a>
</footer>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
  res.status(200).send(html);
};
