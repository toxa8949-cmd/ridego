const PROJECT = 'ridego-6f981';
const BASE = 'https://ridego.com.ua';

const BOTS = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|linkedinbot|telegrambot|whatsapp/i;

async function getListingFromFirestore(id) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/listings/${id}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.fields) return null;

  const f = data.fields;
  // Отримати перше фото з масиву
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
    sellerName: f.sellerName?.stringValue || f.seller?.stringValue || '',
    year:       f.year?.stringValue || f.year?.integerValue || '',
  };
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

module.exports = async (req, res) => {
  const ua = req.headers['user-agent'] || '';
  const isBot = BOTS.test(ua);

  const id = req.url.replace('/api/listing/', '').split('?')[0].replace(/[^a-zA-Z0-9_-]/g, '');

  if (!isBot) {
    // Serve SPA shell for non-bots
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

  if (!listing) {
    return res.status(404).send('<h1>Не знайдено</h1>');
  }

  // Генерація SEO описів
  const titleStr = listing.title
    ? `${listing.title} — купити в ${listing.city} за ${listing.price} грн | RideGO`
    : 'RideGO — Маркетплейс електротранспорту';

  const descParts = [];
  if (listing.condition) descParts.push(listing.condition);
  if (listing.cat) descParts.push(listing.cat);
  if (listing.city) descParts.push(`м. ${listing.city}`);
  if (listing.price) descParts.push(`${listing.price} грн`);
  if (listing.year) descParts.push(`${listing.year} р.`);
  const autoDesc = descParts.join(' · ');

  const descStr = listing.desc
    ? listing.desc.slice(0, 160)
    : (autoDesc || listing.title);

  const html = `<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escHtml(titleStr)}</title>
<meta name="description" content="${escHtml(descStr)}">
<meta name="robots" content="index, follow">

<!-- Open Graph -->
<meta property="og:type" content="product">
<meta property="og:title" content="${escHtml(listing.title + ' — RideGO')}">
<meta property="og:description" content="${escHtml(descStr)}">
<meta property="og:image" content="${escHtml(listing.img)}">
<meta property="og:url" content="${BASE}/listing/${id}">
<meta property="og:site_name" content="RideGO">
<meta property="og:locale" content="uk_UA">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escHtml(listing.title + ' — RideGO')}">
<meta name="twitter:description" content="${escHtml(descStr)}">
<meta name="twitter:image" content="${escHtml(listing.img)}">

<link rel="canonical" href="${BASE}/listing/${id}">

<!-- JSON-LD структуровані дані -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "${escHtml(listing.title)}",
  "description": "${escHtml(descStr)}",
  "image": "${escHtml(listing.img)}",
  "offers": {
    "@type": "Offer",
    "price": "${escHtml(String(listing.price))}",
    "priceCurrency": "UAH",
    "availability": "https://schema.org/InStock",
    "url": "${BASE}/listing/${id}",
    "seller": {
      "@type": "Person",
      "name": "${escHtml(listing.sellerName)}"
    }
  },
  "itemCondition": "${listing.condition === 'Новий' ? 'https://schema.org/NewCondition' : 'https://schema.org/UsedCondition'}"
}
</script>
</head>
<body style="font-family:sans-serif;max-width:800px;margin:40px auto;padding:0 20px">
<a href="${BASE}" style="color:#1db954;text-decoration:none;font-size:14px">← RideGO</a>
<h1 style="margin:16px 0 8px">${escHtml(listing.title)}</h1>
<p style="font-size:28px;font-weight:800;color:#1db954;margin:0 0 16px">${escHtml(String(listing.price))} грн</p>
${listing.img ? `<img src="${escHtml(listing.img)}" alt="${escHtml(listing.title)}" style="max-width:100%;border-radius:12px;margin-bottom:16px">` : ''}
<table style="border-collapse:collapse;width:100%;margin-bottom:16px">
  ${listing.city ? `<tr><td style="padding:8px;color:#666">Місто</td><td style="padding:8px;font-weight:600">${escHtml(listing.city)}</td></tr>` : ''}
  ${listing.cat ? `<tr><td style="padding:8px;color:#666">Категорія</td><td style="padding:8px;font-weight:600">${escHtml(listing.cat)}</td></tr>` : ''}
  ${listing.condition ? `<tr><td style="padding:8px;color:#666">Стан</td><td style="padding:8px;font-weight:600">${escHtml(listing.condition)}</td></tr>` : ''}
  ${listing.year ? `<tr><td style="padding:8px;color:#666">Рік</td><td style="padding:8px;font-weight:600">${escHtml(String(listing.year))}</td></tr>` : ''}
  ${listing.sellerName ? `<tr><td style="padding:8px;color:#666">Продавець</td><td style="padding:8px;font-weight:600">${escHtml(listing.sellerName)}</td></tr>` : ''}
</table>
${listing.desc ? `<p style="line-height:1.6;color:#333">${escHtml(listing.desc)}</p>` : ''}
<a href="${BASE}/listing/${id}" style="display:inline-block;background:#1db954;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;margin-top:16px">Переглянути оголошення на RideGO →</a>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(html);
};
