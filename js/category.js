// api/category.js — SSR для сторінок категорій
const BASE = 'https://ridego.com.ua';
const PROJECT = 'ridego-6f981';

const BOTS = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|linkedinbot|telegrambot|whatsapp/i;

const CATEGORIES = {
  'elektrosamokaty':   { name: 'Електросамокати', icon: '⚡', desc: 'Купити електросамокат в Україні. Великий вибір нових та вживаних електросамокатів від приватних продавців та магазинів.' },
  'velosypedy':        { name: 'Велосипеди', icon: '🚲', desc: 'Купити велосипед в Україні. Гірські, міські, дорожні велосипеди від приватних продавців.' },
  'elektrovelosypedy': { name: 'Електровелосипеди', icon: '🚴', desc: 'Купити електровелосипед в Україні. Новітні моделі електровелосипедів для міста та бездоріжжя.' },
  'elektroskutery':    { name: 'Електроскутери', icon: '🛵', desc: 'Купити електроскутер в Україні. Широкий вибір електроскутерів для міських поїздок.' },
  'elektromotocykly':  { name: 'Електромотоцикли', icon: '🏍', desc: 'Купити електромотоцикл в Україні. Потужні електромотоцикли для активного відпочинку.' },
};

async function getListingsByCategory(cat) {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`;
    const body = {
      structuredQuery: {
        from: [{ collectionId: 'listings' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'cat' },
            op: 'EQUAL',
            value: { stringValue: CATEGORIES[cat]?.name || cat }
          }
        },
        orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
        limit: 10
      }
    };
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
          condition: f.condition?.stringValue || '',
          img: f.img?.stringValue || '',
        };
      });
  } catch(e) {
    return [];
  }
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

module.exports = async (req, res) => {
  const ua = req.headers['user-agent'] || '';
  const isBot = BOTS.test(ua);

  const slug = req.url.replace('/api/category/', '').replace('/category/', '').split('?')[0].trim().replace(/[^a-zA-Z0-9_-]/g, '');
  const catInfo = CATEGORIES[slug];

  if (!isBot) {
    res.setHeader('Location', `${BASE}/category/${slug}`);
    return res.status(302).end();
  }

  const catName = catInfo?.name || slug;
  const catDesc = catInfo?.desc || `Купити ${catName} в Україні на маркетплейсі RideGO.`;
  const listings = await getListingsByCategory(slug);

  const listingsHtml = listings.length ? listings.map((l, i) => `
    <div style="border:1px solid #eee;border-radius:12px;padding:16px;margin-bottom:12px;display:flex;gap:16px;align-items:center">
      ${l.img ? `<img src="${escHtml(l.img)}" alt="${escHtml(l.title)}" style="width:80px;height:80px;object-fit:cover;border-radius:8px;flex-shrink:0">` : ''}
      <div>
        <a href="${BASE}/listing/${l.id}" style="font-weight:600;color:#111;text-decoration:none;font-size:16px">${escHtml(l.title)}</a>
        <div style="color:#1db954;font-weight:700;margin:4px 0">${l.price ? l.price.toLocaleString('uk') + ' грн' : ''}</div>
        <div style="color:#666;font-size:13px">${escHtml(l.city)}${l.condition ? ' · ' + escHtml(l.condition) : ''}</div>
      </div>
    </div>
  `).join('') : '<p style="color:#666">Оголошень поки немає</p>';

  const itemListSchema = listings.length ? JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": catName + " — RideGO",
    "url": `${BASE}/category/${slug}`,
    "numberOfItems": listings.length,
    "itemListElement": listings.map((l, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "url": `${BASE}/listing/${l.id}`,
      "name": l.title
    }))
  }, null, 2) : '{}';

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
<title>${escHtml(catName)} — купити в Україні | RideGO</title>
<meta name="description" content="${escHtml(catDesc)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${BASE}/category/${slug}">

<meta property="og:type" content="website">
<meta property="og:title" content="${escHtml(catName)} — RideGO">
<meta property="og:description" content="${escHtml(catDesc)}">
<meta property="og:url" content="${BASE}/category/${slug}">
<meta property="og:site_name" content="RideGO">
<meta property="og:locale" content="uk_UA">

<script type="application/ld+json">${breadcrumbSchema}</script>
<script type="application/ld+json">${itemListSchema}</script>
</head>
<body style="font-family:sans-serif;max-width:800px;margin:40px auto;padding:0 20px">
  <nav style="font-size:13px;color:#666;margin-bottom:24px">
    <a href="${BASE}" style="color:#1db954;text-decoration:none">RideGO</a> →
    <a href="${BASE}/catalog" style="color:#1db954;text-decoration:none">Каталог</a> →
    <span>${escHtml(catName)}</span>
  </nav>
  <h1 style="margin:0 0 8px">${escHtml(catInfo?.icon || '')} ${escHtml(catName)}</h1>
  <p style="color:#555;margin:0 0 32px">${escHtml(catDesc)}</p>
  <h2 style="margin:0 0 16px;font-size:18px">Оголошення</h2>
  ${listingsHtml}
  <div style="margin-top:32px">
    <a href="${BASE}/category/${slug}" style="display:inline-block;background:#1db954;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600">
      Переглянути всі ${escHtml(catName)} на RideGO →
    </a>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(html);
};
