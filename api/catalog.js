// api/catalog.js — SSR для каталогу (боти отримують оголошення з Firestore)
const BASE = 'https://ridego.com.ua';
const PROJECT = 'ridego-6f981';

const BOTS = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|linkedinbot|telegrambot|whatsapp|applebot|mj12bot|ahrefsbot|semrushbot|petalbot|bytespider/i;

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

const CATEGORIES = {
  'elektrosamokaty':   { name: 'Електросамокати', icon: '⚡' },
  'velosypedy':        { name: 'Велосипеди', icon: '🚲' },
  'elektrovelosypedy': { name: 'Електровелосипеди', icon: '🚴' },
  'elektroskutery':    { name: 'Електроскутери', icon: '🛵' },
  'elektromotocykly':  { name: 'Електромотоцикли', icon: '🏍' },
};

async function getListings(limit) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`;
  const body = {
    structuredQuery: {
      from: [{ collectionId: 'listings' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'status' },
          op: 'EQUAL',
          value: { stringValue: 'active' }
        }
      },
      orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
      limit: limit || 20
    }
  };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data
      .filter(d => d.document)
      .map(d => {
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
  } catch(e) {
    return [];
  }
}

module.exports = async (req, res) => {
  const ua = req.headers['user-agent'] || '';
  const isBot = BOTS.test(ua);

  if (!isBot) {
    const fs = require('fs');
    const path = require('path');
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

  const listings = await getListings(30);

  // Групуємо по категоріях для статистики
  const catCounts = {};
  listings.forEach(l => {
    if (l.cat) catCounts[l.cat] = (catCounts[l.cat] || 0) + 1;
  });

  const catNavHtml = Object.entries(CATEGORIES).map(([slug, info]) =>
    `<a href="${BASE}/category/${slug}" style="display:inline-block;padding:10px 18px;background:#f0fdf4;border-radius:10px;text-decoration:none;color:#111;font-weight:600;font-size:14px;margin:4px">${info.icon} ${escHtml(info.name)}</a>`
  ).join('\n');

  const listingsHtml = listings.length ? listings.map(l => `
    <div style="border:1px solid #eee;border-radius:12px;padding:16px;display:flex;gap:16px;align-items:center">
      ${l.img ? `<img src="${escHtml(l.img)}" alt="${escHtml(l.title)}" style="width:80px;height:80px;object-fit:cover;border-radius:8px;flex-shrink:0" loading="lazy">` : ''}
      <div>
        <a href="${BASE}/listing/${l.id}" style="font-weight:600;color:#111;text-decoration:none;font-size:15px">${escHtml(l.title)}</a>
        <div style="color:#1db954;font-weight:700;margin:4px 0">${l.price ? Number(l.price).toLocaleString('uk') + ' грн' : ''}</div>
        <div style="color:#666;font-size:13px">${escHtml(l.city)}${l.cat ? ' · ' + escHtml(l.cat) : ''}${l.condition ? ' · ' + escHtml(l.condition) : ''}</div>
      </div>
    </div>
  `).join('\n') : '<p style="color:#666">Оголошення завантажуються...</p>';

  // Schema.org ItemList
  const itemListSchema = listings.length ? JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Каталог електротранспорту — RideGO",
    "url": `${BASE}/catalog`,
    "numberOfItems": listings.length,
    "itemListElement": listings.slice(0, 20).map((l, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "url": `${BASE}/listing/${l.id}`,
      "name": l.title
    }))
  }) : '{}';

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
<title>Каталог електротранспорту — купити в Україні | RideGO</title>
<meta name="description" content="Каталог електросамокатів, велосипедів, електровелосипедів, електроскутерів та електромотоциклів. Понад 5800 оголошень по всій Україні. Нові та вживані.">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${BASE}/catalog">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">

<meta property="og:type" content="website">
<meta property="og:title" content="Каталог електротранспорту — RideGO">
<meta property="og:description" content="Понад 5800 оголошень електротранспорту по всій Україні. Знайдіть ідеальний електросамокат, велосипед або скутер.">
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
</head>
<body style="font-family:'Segoe UI',Arial,sans-serif;max-width:960px;margin:0 auto;padding:0 20px;color:#333;line-height:1.7">

  <!-- Header -->
  <header style="padding:20px 0;border-bottom:2px solid #1db954">
    <a href="${BASE}" style="font-size:28px;font-weight:800;color:#111;text-decoration:none">Ride<span style="color:#1db954">GO</span></a>
  </header>

  <!-- Breadcrumb -->
  <nav style="font-size:13px;color:#666;padding:16px 0">
    <a href="${BASE}" style="color:#1db954;text-decoration:none">RideGO</a> →
    <span>Каталог</span>
  </nav>

  <h1 style="font-size:32px;font-weight:800;margin-bottom:8px">Каталог електротранспорту</h1>
  <p style="color:#555;margin-bottom:24px">Оберіть категорію або перегляньте всі оголошення</p>

  <!-- Категорії -->
  <section style="margin-bottom:32px">
    <h2 style="font-size:18px;font-weight:700;margin-bottom:12px">Категорії</h2>
    <div style="display:flex;flex-wrap:wrap;gap:4px">${catNavHtml}</div>
  </section>

  <!-- Оголошення -->
  <section>
    <h2 style="font-size:18px;font-weight:700;margin-bottom:16px">Оголошення <span style="color:#666;font-weight:400;font-size:14px">(${listings.length})</span></h2>
    <div style="display:flex;flex-direction:column;gap:12px">
      ${listingsHtml}
    </div>
  </section>

  <!-- CTA -->
  <section style="padding:32px;background:#f0fdf4;border-radius:16px;text-align:center;margin:32px 0">
    <h2 style="font-size:20px;font-weight:700;margin-bottom:8px">Не знайшли потрібне?</h2>
    <p style="color:#555;margin-bottom:16px">Розмістіть оголошення — покупці знайдуть вас!</p>
    <a href="${BASE}/add" style="display:inline-block;background:#1db954;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:600">Подати оголошення →</a>
  </section>

  <footer style="padding:24px 0;border-top:1px solid #eee;font-size:13px;color:#888;text-align:center">
    <p>© 2024–2026 RideGO. Всі права захищено.</p>
  </footer>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
  res.status(200).send(html);
};
