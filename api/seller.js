const BASE = 'https://ridego.com.ua';
const PROJECT = 'ridego-6f981';

const BOTS = /googlebot|google-inspectiontool|google-inspection|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|linkedinbot|telegrambot|whatsapp|applebot|mj12bot|ahrefsbot|semrushbot|petalbot|bytespider|headlesschrome|lighthouse|chrome-lighthouse/i;

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function getSeller(uid) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users/${uid}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.fields) return null;
  const f = data.fields;
  return {
    name:     f.name?.stringValue || '',
    type:     f.type?.stringValue || 'personal',
    city:     f.city?.stringValue || '',
    about:    f.about?.stringValue || f.desc?.stringValue || '',
    photoUrl: f.photoUrl?.stringValue || '',
    phone:    f.phone?.stringValue || '',
    listings: f.listings?.integerValue || 0,
  };
}

async function getSellerListings(uid) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`;
  const body = {
    structuredQuery: {
      from: [{ collectionId: 'listings' }],
      where: {
        compositeFilter: {
          op: 'AND',
          filters: [
            { fieldFilter: { field: { fieldPath: 'uid' }, op: 'EQUAL', value: { stringValue: uid } } },
            { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'active' } } }
          ]
        }
      },
      orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
      limit: 20
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

function getParam(req, key) {
  if (req.query && req.query[key]) return req.query[key];
  try {
    const qs = (req.url || '').split('?')[1] || '';
    for (const p of qs.split('&')) {
      const [k,v] = p.split('=');
      if (decodeURIComponent(k||'') === key) return decodeURIComponent(v||'');
    }
  } catch(e) {}
  return '';
}

module.exports = async (req, res) => {
  const ua = req.headers['user-agent'] || '';
  const isBot = BOTS.test(ua);

  const uid = getParam(req, 'uid').replace(/[^a-zA-Z0-9_-]/g, '');

  if (!isBot) {
    const fs = require('fs'); const path = require('path');
    try {
      const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      return res.status(200).send(html);
    } catch(e) {
      res.setHeader('Location', `${BASE}/seller/${uid}`);
      return res.status(302).end();
    }
  }

  const [seller, listings] = await Promise.all([getSeller(uid), getSellerListings(uid)]);
  if (!seller) return res.status(404).send('<h1>Продавця не знайдено</h1>');

  const isShop = seller.type === 'business';
  const titleStr = isShop
    ? `${seller.name} — магазин електротранспорту${seller.city ? ' у ' + seller.city : ''} | RideGO`
    : `${seller.name} — продавець електротранспорту${seller.city ? ' у ' + seller.city : ''} | RideGO`;
  const descStr = seller.about
    ? seller.about.slice(0, 155)
    : `${isShop ? 'Магазин' : 'Продавець'} ${seller.name}${seller.city ? ' у ' + seller.city : ''} на RideGO. ${listings.length} активних оголошень.`;

  const listingsHtml = listings.length ? listings.map(l => {
    const price = l.price ? Number(l.price).toLocaleString('uk') + ' грн' : '';
    return `<article style="border:1px solid #eee;border-radius:10px;overflow:hidden">
      ${l.img ? `<a href="${BASE}/listing/${l.id}"><img src="${escHtml(l.img)}" alt="${escHtml(l.title)}" width="300" height="200" loading="lazy" style="width:100%;height:160px;object-fit:cover;display:block"></a>` : ''}
      <div style="padding:10px">
        <a href="${BASE}/listing/${l.id}" style="font-weight:700;color:#111;text-decoration:none;font-size:14px;display:block;margin-bottom:3px">${escHtml(l.title)}</a>
        ${price ? `<div style="color:#1db954;font-weight:800">${price}</div>` : ''}
        <div style="color:#888;font-size:12px">${escHtml(l.city)}${l.condition ? ' · '+escHtml(l.condition) : ''}</div>
      </div>
    </article>`;
  }).join('') : '<p style="color:#888">Активних оголошень немає</p>';

  const personSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": isShop ? "Store" : "Person",
    "name": seller.name,
    "description": descStr,
    "url": `${BASE}/seller/${uid}`,
    ...(seller.city ? { "address": { "@type": "PostalAddress", "addressLocality": seller.city, "addressCountry": "UA" } } : {}),
    ...(seller.photoUrl ? { "image": seller.photoUrl } : {})
  });

  const breadcrumbSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "RideGO", "item": BASE },
      { "@type": "ListItem", "position": 2, "name": isShop ? "Магазини" : "Продавці", "item": `${BASE}/catalog` },
      { "@type": "ListItem", "position": 3, "name": seller.name, "item": `${BASE}/seller/${uid}` }
    ]
  });

  const html = `<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escHtml(titleStr)}</title>
<meta name="description" content="${escHtml(descStr)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${BASE}/seller/${uid}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<meta property="og:type" content="profile">
<meta property="og:title" content="${escHtml(seller.name + ' — RideGO')}">
<meta property="og:description" content="${escHtml(descStr)}">
<meta property="og:url" content="${BASE}/seller/${uid}">
<meta property="og:site_name" content="RideGO">
${seller.photoUrl ? `<meta property="og:image" content="${escHtml(seller.photoUrl)}">` : `<meta property="og:image" content="${BASE}/og-image.png">`}
<meta property="og:locale" content="uk_UA">
<script type="application/ld+json">${personSchema}</script>
<script type="application/ld+json">${breadcrumbSchema}</script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;max-width:960px;margin:0 auto;padding:20px;color:#222;background:#fff}
header{padding:16px 0;border-bottom:2px solid #1db954;margin-bottom:20px}
header a{font-size:26px;font-weight:800;color:#111;text-decoration:none}
header a span{color:#1db954}
.bc{font-size:13px;color:#888;margin-bottom:20px}
.bc a{color:#1db954;text-decoration:none}
.bc span{margin:0 5px;color:#ccc}
.seller-card{display:flex;align-items:center;gap:20px;padding:24px;background:#f9f9f9;border-radius:16px;margin-bottom:28px}
.seller-card img{width:80px;height:80px;border-radius:50%;object-fit:cover;flex-shrink:0}
.seller-card .avatar{width:80px;height:80px;border-radius:50%;background:#00c853;display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:800;color:#fff;flex-shrink:0}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px}
footer{padding:20px 0;border-top:1px solid #eee;font-size:13px;color:#999;text-align:center;margin-top:32px}
footer a{color:#1db954;text-decoration:none;margin:0 8px}
</style>
</head>
<body>
<header><a href="${BASE}">Ride<span>GO</span></a></header>
<nav class="bc" aria-label="Breadcrumb">
  <a href="${BASE}">RideGO</a><span>›</span>
  <a href="${BASE}/catalog">Каталог</a><span>›</span>
  <span>${escHtml(seller.name)}</span>
</nav>
<div class="seller-card">
  ${seller.photoUrl
    ? `<img src="${escHtml(seller.photoUrl)}" alt="${escHtml(seller.name)}" width="80" height="80">`
    : `<div class="avatar">${escHtml(seller.name[0]||'?').toUpperCase()}</div>`}
  <div>
    <h1 style="font-size:24px;font-weight:800;margin-bottom:4px">${escHtml(seller.name)}</h1>
    <div style="color:#888;font-size:14px;margin-bottom:6px">${isShop ? '🏪 Магазин' : '👤 Приватний продавець'}${seller.city ? ' · 📍 '+escHtml(seller.city) : ''}</div>
    ${seller.about ? `<p style="font-size:14px;color:#555">${escHtml(seller.about.slice(0,200))}</p>` : ''}
  </div>
</div>
<h2 style="font-size:18px;font-weight:700;margin-bottom:16px">Оголошення <span style="color:#888;font-weight:400;font-size:14px">(${listings.length})</span></h2>
<div class="grid">${listingsHtml}</div>
<div style="text-align:center;margin-top:20px">
  <a href="${BASE}/seller/${uid}" style="display:inline-block;background:#1db954;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700">Всі оголошення продавця на RideGO →</a>
</div>
<footer>
  <span>© 2024–2026 RideGO</span>
  <a href="${BASE}">Головна</a>
  <a href="${BASE}/catalog">Каталог</a>
  <a href="${BASE}/faq">FAQ</a>
</footer>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(html);
};
