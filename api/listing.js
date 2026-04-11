const PROJECT = 'ridego-6f981';
const BASE = 'https://www.ridego.com.ua';

const BOTS = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|linkedinbot|telegrambot|whatsapp|applebot|mj12bot|ahrefsbot|semrushbot|petalbot|bytespider|google-inspectiontool|google-structured-data-testing|storebot|developers\.google/i;

const CAT_SLUGS = {
  'Електросамокати':   'elektrosamokaty',
  'Велосипеди':        'velosypedy',
  'Електровелосипеди': 'elektrovelosypedy',
  'Електроскутери':    'elektroskutery',
  'Електромотоцикли':  'elektromotocykly',
};

async function getListingFromFirestore(id) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/listings/${id}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.fields) return null;
  const f = data.fields;
  let img = f.img?.stringValue || '';
  if (!img && f.photos?.arrayValue?.values?.length) {
    img = f.photos.arrayValue.values[0]?.stringValue || '';
  }
  return {
    title:      f.title?.stringValue || '',
    desc:       f.desc?.stringValue || '',
    price:      f.price?.integerValue || f.price?.doubleValue || '',
    city:       f.city?.stringValue || '',
    cat:        f.cat?.stringValue || '',
    condition:  f.condition?.stringValue || '',
    img,
    imgs:       f.imgs?.arrayValue?.values?.map(v => v.stringValue).filter(Boolean) || (img ? [img] : []),
    sellerName: f.sellerName?.stringValue || f.seller?.stringValue || '',
    year:       f.year?.stringValue || f.year?.integerValue || '',
    brand:      f.brand?.stringValue || '',
    model:      f.model?.stringValue || '',
    battery:    f.battery?.stringValue || '',
    speed:      f.speed?.stringValue || '',
    range:      f.range?.stringValue || '',
  };
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function getId(req) {
  // 1. Vercel x-now-route-matches header (найнадійніший)
  try {
    const matches = req.headers['x-now-route-matches'];
    if (matches) {
      const parsed = JSON.parse(matches);
      if (parsed.id) return parsed.id;
    }
  } catch(e) {}

  // 2. Query string
  try {
    const qs = req.url.split('?')[1] || '';
    const params = {};
    qs.split('&').forEach(p => {
      const [k,v] = p.split('=');
      if (k) params[decodeURIComponent(k)] = decodeURIComponent(v||'');
    });
    if (params.id) return params.id;
  } catch(e) {}

  // 3. req.query
  if (req.query && req.query.id) return req.query.id;

  return '';
}

module.exports = async (req, res) => {
  const ua = req.headers['user-agent'] || '';
  const isBot = BOTS.test(ua);
  const id = getId(req).replace(/[^a-zA-Z0-9_-]/g, '');

  if (!isBot) {
    const fs = require('fs');
    const path = require('path');
    try {
      const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      return res.status(200).send(html);
    } catch(e) {
      res.setHeader('Location', `${BASE}/listing/${id}`);
      return res.status(302).end();
    }
  }

  const listing = await getListingFromFirestore(id);
  if (!listing) return res.status(404).send('<h1>Не знайдено</h1>');

  const priceFormatted = listing.price ? Number(listing.price).toLocaleString('uk') : '';
  const catSlug = CAT_SLUGS[listing.cat] || 'catalog';

  const titleStr = listing.title
    ? [listing.title, listing.city ? `купити в ${listing.city}` : 'купити', priceFormatted ? `${priceFormatted} грн` : '', 'RideGO'].filter(Boolean).join(' — ')
    : 'RideGO — Маркетплейс електротранспорту';

  const rawDesc = listing.desc ? listing.desc.replace(/\s+/g,' ').trim() : '';
  const autoParts = [listing.condition, listing.cat, listing.city ? `м.${listing.city}` : '', priceFormatted ? `${priceFormatted}грн` : '', listing.year ? `${listing.year}р.` : ''].filter(Boolean);
  const descStr = rawDesc ? (rawDesc.length > 155 ? rawDesc.slice(0,152)+'...' : rawDesc) : autoParts.join(' · ') || listing.title;

  const productSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    "name": listing.title,
    "description": descStr,
    "image": listing.imgs.length ? listing.imgs : (listing.img ? [listing.img] : []),
    "brand": { "@type": "Brand", "name": listing.brand || listing.cat || "RideGO" },
    ...(listing.model ? { "model": listing.model } : {}),
    "offers": {
      "@type": "Offer",
      "price": String(listing.price || 0),
      "priceCurrency": "UAH",
      "availability": "https://schema.org/InStock",
      "url": `${BASE}/listing/${id}`,
      "priceValidUntil": new Date(Date.now()+30*86400000).toISOString().split('T')[0],
      "seller": { "@type": "Person", "name": listing.sellerName || "Продавець" },
      "itemCondition": listing.condition === 'Новий' ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
      "hasMerchantReturnPolicy": {
        "@type": "MerchantReturnPolicy",
        "applicableCountry": "UA",
        "returnPolicyCategory": "https://schema.org/MerchantReturnNotPermitted",
        "merchantReturnDays": 0
      },
      "shippingDetails": {
        "@type": "OfferShippingDetails",
        "shippingDestination": {
          "@type": "DefinedRegion",
          "addressCountry": "UA"
        },
        "deliveryTime": {
          "@type": "ShippingDeliveryTime",
          "handlingTime": { "@type": "QuantitativeValue", "minValue": 0, "maxValue": 3, "unitCode": "DAY" },
          "transitTime": { "@type": "QuantitativeValue", "minValue": 1, "maxValue": 7, "unitCode": "DAY" }
        }
      }
    }
  });

  const breadcrumbSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "RideGO", "item": BASE },
      { "@type": "ListItem", "position": 2, "name": "Каталог", "item": `${BASE}/catalog` },
      ...(listing.cat ? [{ "@type": "ListItem", "position": 3, "name": listing.cat, "item": `${BASE}/category/${catSlug}` }] : []),
      { "@type": "ListItem", "position": listing.cat ? 4 : 3, "name": listing.title, "item": `${BASE}/listing/${id}` }
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
<link rel="canonical" href="${BASE}/listing/${id}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<meta property="og:type" content="product">
<meta property="og:title" content="${escHtml(listing.title + ' — RideGO')}">
<meta property="og:description" content="${escHtml(descStr)}">
<meta property="og:image" content="${escHtml(listing.img || BASE+'/og-image.png')}">
${listing.imgs.slice(1).map(u => `<meta property="og:image" content="${escHtml(u)}">`).join('\n')}
<meta property="og:url" content="${BASE}/listing/${id}">
<meta property="og:locale" content="uk_UA">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escHtml(listing.title + ' — RideGO')}">
<meta name="twitter:description" content="${escHtml(descStr)}">
<meta name="twitter:image" content="${escHtml(listing.img || BASE+'/og-image.png')}">
<script type="application/ld+json">${productSchema}</script>
<script type="application/ld+json">${breadcrumbSchema}</script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;max-width:820px;margin:0 auto;padding:20px;color:#222;background:#fff}
.bc{font-size:13px;color:#888;margin-bottom:20px}.bc a{color:#1db954;text-decoration:none}.bc span{margin:0 5px;color:#ccc}
h1{font-size:clamp(20px,4vw,28px);font-weight:800;margin-bottom:8px;color:#111}
.price{font-size:32px;font-weight:800;color:#1db954;margin-bottom:16px}
.img-wrap img{width:100%;max-height:480px;object-fit:cover;border-radius:12px;display:block;margin-bottom:20px}
.specs{border-collapse:collapse;width:100%;margin-bottom:20px;font-size:15px}
.specs td{padding:10px 12px;border-bottom:1px solid #f0f0f0}
.specs td:first-child{color:#888;width:130px}.specs td:last-child{font-weight:600}
.desc{font-size:15px;color:#444;line-height:1.8;margin-bottom:24px;background:#f9f9f9;border-radius:10px;padding:16px}
.cta{display:inline-block;background:#1db954;color:#fff;padding:15px 32px;border-radius:12px;text-decoration:none;font-weight:700;font-size:16px;margin-bottom:32px}
.related a{display:inline-block;padding:8px 16px;background:#f0fdf4;border-radius:8px;text-decoration:none;color:#166534;font-size:13px;font-weight:600;margin:4px}
</style>
</head>
<body>
<nav class="bc">
  <a href="${BASE}">RideGO</a><span>›</span>
  <a href="${BASE}/catalog">Каталог</a><span>›</span>
  ${listing.cat ? `<a href="${BASE}/category/${catSlug}">${escHtml(listing.cat)}</a><span>›</span>` : ''}
  <span>${escHtml(listing.title.slice(0,50))}</span>
</nav>
<h1>${escHtml(listing.title)}${listing.city ? ` у ${escHtml(listing.city)}` : ''}</h1>
<div class="price">${priceFormatted ? priceFormatted+' грн' : 'Ціна договірна'}</div>
${listing.img ? `<div class="img-wrap"><img src="${escHtml(listing.img)}" alt="${escHtml(listing.title)}" width="820" height="480" loading="eager"></div>` : ''}
${listing.imgs.length > 1 ? `<div style="display:flex;gap:8px;overflow-x:auto;margin-bottom:20px;padding-bottom:4px">${listing.imgs.map((u,i) => `<img src="${escHtml(u)}" alt="${escHtml(listing.title)} фото ${i+1}" width="120" height="90" loading="lazy" style="width:120px;height:90px;object-fit:cover;border-radius:8px;flex-shrink:0">`).join('')}</div>` : ''}
<table class="specs">
  ${listing.city ? `<tr><td>Місто</td><td>${escHtml(listing.city)}</td></tr>` : ''}
  ${listing.cat ? `<tr><td>Категорія</td><td><a href="${BASE}/category/${catSlug}" style="color:#1db954;text-decoration:none">${escHtml(listing.cat)}</a></td></tr>` : ''}
  ${listing.brand ? `<tr><td>Бренд</td><td>${escHtml(listing.brand)}</td></tr>` : ''}
  ${listing.model ? `<tr><td>Модель</td><td>${escHtml(listing.model)}</td></tr>` : ''}
  ${listing.condition ? `<tr><td>Стан</td><td>${escHtml(listing.condition)}</td></tr>` : ''}
  ${listing.year ? `<tr><td>Рік</td><td>${escHtml(String(listing.year))}</td></tr>` : ''}
  ${listing.battery ? `<tr><td>Акумулятор</td><td>${escHtml(listing.battery)}</td></tr>` : ''}
  ${listing.speed ? `<tr><td>Швидкість</td><td>${escHtml(listing.speed)}</td></tr>` : ''}
  ${listing.range ? `<tr><td>Запас ходу</td><td>${escHtml(listing.range)}</td></tr>` : ''}
  ${listing.sellerName ? `<tr><td>Продавець</td><td>${escHtml(listing.sellerName)}</td></tr>` : ''}
</table>
${listing.desc ? `<div class="desc">${escHtml(listing.desc)}</div>` : ''}
<a href="${BASE}/listing/${id}" class="cta">Переглянути на RideGO →</a>
<div class="related">
  <strong style="display:block;margin-bottom:8px;font-size:15px">Більше оголошень:</strong>
  ${listing.cat ? `<a href="${BASE}/category/${catSlug}">Всі ${escHtml(listing.cat)}</a>` : ''}
  <a href="${BASE}/catalog">Весь каталог</a>
</div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(html);
};
