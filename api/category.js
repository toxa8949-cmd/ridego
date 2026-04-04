const BASE = 'https://ridego.com.ua';
const PROJECT = 'ridego-6f981';

const BOTS = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|linkedinbot|telegrambot|whatsapp|applebot|mj12bot|ahrefsbot|semrushbot|petalbot|bytespider/i;

const CATEGORIES = {
  'elektrosamokaty':   { name: 'Електросамокати', icon: '⚡', desc: 'Купити електросамокат в Україні — великий вибір нових та вживаних електросамокатів від приватних продавців і магазинів за вигідними цінами.' },
  'velosypedy':        { name: 'Велосипеди', icon: '🚲', desc: 'Купити велосипед в Україні — гірські, міські, дорожні велосипеди від приватних продавців за доступними цінами.' },
  'elektrovelosypedy': { name: 'Електровелосипеди', icon: '🚴', desc: 'Купити електровелосипед в Україні — новітні моделі електровелосипедів для міста та бездоріжжя.' },
  'elektroskutery':    { name: 'Електроскутери', icon: '🛵', desc: 'Купити електроскутер в Україні — широкий вибір електроскутерів для міських поїздок за найкращими цінами.' },
  'elektromotocykly':  { name: 'Електромотоцикли', icon: '🏍', desc: 'Купити електромотоцикл в Україні — потужні електромотоцикли для активного відпочинку та щоденних поїздок.' },
};

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function getListingsByCategory(catName) {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`;
    const body = {
      structuredQuery: {
        from: [{ collectionId: 'listings' }],
        where: {
          compositeFilter: {
            op: 'AND',
            filters: [
              { fieldFilter: { field: { fieldPath: 'cat' }, op: 'EQUAL', value: { stringValue: catName } } },
              { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'active' } } }
            ]
          }
        },
        orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
        limit: 20
      }
    };
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
        condition: f.condition?.stringValue || '',
        img: f.img?.stringValue || '',
      };
    });
  } catch(e) { return []; }
}

module.exports = async (req, res) => {
  const ua = req.headers['user-agent'] || '';
  const isBot = BOTS.test(ua);
  // Vercel rewrite: /category/:slug → /api/category, slug через req.query.slug
  const rawSlug = (req.query && req.query.slug)
    || (req.headers['x-matched-path'] || '').split('/').filter(Boolean).pop()
    || req.url.replace('/api/category/','').replace('/category/','').split('?')[0].trim()
    || '';
  const slug = rawSlug.replace(/[^a-zA-Z0-9_-]/g,'');
  const catInfo = CATEGORIES[slug];

  if (!isBot) {
    const fs = require('fs'); const path = require('path');
    try {
      const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      return res.status(200).send(html);
    } catch(e) {
      res.setHeader('Location', `${BASE}/category/${slug}`);
      return res.status(302).end();
    }
  }

  const catName = catInfo?.name || slug;
  const catDesc = catInfo?.desc || `Купити ${catName} в Україні на маркетплейсі RideGO.`;
  const listings = await getListingsByCategory(catName);

  const listingsHtml = listings.length ? listings.map(l => {
    const price = l.price ? Number(l.price).toLocaleString('uk') + ' грн' : '';
    return `<article style="border:1px solid #eee;border-radius:12px;overflow:hidden">
      ${l.img ? `<a href="${BASE}/listing/${l.id}"><img src="${escHtml(l.img)}" alt="${escHtml(l.title+(l.city?' у '+l.city:''))}" width="400" height="240" loading="lazy" style="width:100%;height:160px;object-fit:cover;display:block"></a>` : ''}
      <div style="padding:12px">
        <a href="${BASE}/listing/${l.id}" style="font-weight:700;color:#111;text-decoration:none;font-size:15px;display:block;margin-bottom:4px">${escHtml(l.title)}</a>
        ${price ? `<div style="color:#1db954;font-weight:800;font-size:16px;margin-bottom:4px">${price}</div>` : ''}
        <div style="color:#888;font-size:13px">${escHtml(l.city)}${l.condition ? ' · '+escHtml(l.condition) : ''}</div>
      </div>
    </article>`;
  }).join('\n') : '<p style="color:#888;grid-column:1/-1">Оголошень поки немає</p>';

  const otherCats = Object.entries(CATEGORIES).filter(([s])=>s!==slug).map(([s,info])=>
    `<a href="${BASE}/category/${s}" style="display:inline-flex;align-items:center;gap:5px;padding:8px 14px;background:#f0fdf4;border-radius:8px;text-decoration:none;color:#166534;font-size:13px;font-weight:600;margin:3px">${info.icon} ${escHtml(info.name)}</a>`
  ).join('');

  const itemListSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": `${catName} — RideGO`,
    "url": `${BASE}/category/${slug}`,
    "numberOfItems": listings.length,
    "itemListElement": listings.map((l,i) => ({
      "@type": "ListItem", "position": i+1, "url": `${BASE}/listing/${l.id}`, "name": l.title
    }))
  });

  const breadcrumbSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "RideGO", "item": BASE },
      { "@type": "ListItem", "position": 2, "name": "Каталог", "item": `${BASE}/catalog` },
      { "@type": "ListItem", "position": 3, "name": catName, "item": `${BASE}/category/${slug}` }
    ]
  });

  const html = `<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escHtml(catName)} — купити в Україні, ціни, оголошення | RideGO</title>
<meta name="description" content="${escHtml(catDesc)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${BASE}/category/${slug}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<meta property="og:type" content="website">
<meta property="og:title" content="${escHtml(catName)} — RideGO">
<meta property="og:description" content="${escHtml(catDesc)}">
<meta property="og:url" content="${BASE}/category/${slug}">
<meta property="og:site_name" content="RideGO">
<meta property="og:locale" content="uk_UA">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escHtml(catName)} — RideGO">
<meta name="twitter:description" content="${escHtml(catDesc)}">
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
<header><a href="${BASE}">Ride<span>GO</span></a></header>
<nav class="bc" aria-label="Breadcrumb">
  <a href="${BASE}">RideGO</a><span>›</span>
  <a href="${BASE}/catalog">Каталог</a><span>›</span>
  <span>${escHtml(catName)}</span>
</nav>
<h1>${escHtml(catInfo?.icon||'')} ${escHtml(catName)}</h1>
<p style="color:#666;margin-bottom:24px;font-size:15px">${escHtml(catDesc)}</p>
<section style="margin-bottom:28px">
  <h2 style="font-size:17px;font-weight:700;margin-bottom:12px">Оголошення <span style="color:#888;font-weight:400;font-size:14px">(${listings.length})</span></h2>
  <div class="grid">${listingsHtml}</div>
  <div style="text-align:center;margin-top:8px">
    <a href="${BASE}/category/${slug}" style="display:inline-block;background:#1db954;color:#fff;padding:13px 28px;border-radius:10px;text-decoration:none;font-weight:700">Переглянути всі ${escHtml(catName)} на RideGO →</a>
  </div>
</section>
<section style="margin-bottom:28px">
  <h2 style="font-size:16px;font-weight:700;margin-bottom:12px">Інші категорії</h2>
  <div>${otherCats}</div>
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
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(html);
};
