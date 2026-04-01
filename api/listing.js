const PROJECT = 'ridego-6f981';
const BASE = 'https://ridego.com.ua';

// Боти пошукових систем
const BOTS = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|linkedinbot/i;

async function getListingFromFirestore(id) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/listings/${id}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.fields) return null;

  const f = data.fields;
  return {
    title:     f.title?.stringValue || '',
    desc:      f.desc?.stringValue || '',
    price:     f.price?.integerValue || f.price?.doubleValue || '',
    city:      f.city?.stringValue || '',
    cat:       f.cat?.stringValue || '',
    condition: f.condition?.stringValue || '',
    img:       f.img?.stringValue || '',
    sellerName: f.sellerName?.stringValue || f.seller?.stringValue || '',
  };
}

module.exports = async (req, res) => {
  const ua = req.headers['user-agent'] || '';
  const isBot = BOTS.test(ua);

  // Витягнути ID з URL — /listing/ABC123
  const id = req.url.replace('/api/listing/', '').split('?')[0];

  if (!isBot) {
    // Звичайний юзер — redirect на SPA
    res.setHeader('Location', `${BASE}/listing/${id}`);
    return res.status(302).end();
  }

  // Бот — повернути HTML з даними
  const listing = await getListingFromFirestore(id);

  if (!listing) {
    return res.status(404).send('<h1>Не знайдено</h1>');
  }

  const html = `<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${listing.title} — RideGO</title>
<meta name="description" content="${listing.desc ? listing.desc.slice(0, 160) : listing.title + ' — купити в ' + listing.city + ' за ' + listing.price + ' грн'}">
<meta property="og:title" content="${listing.title} — RideGO">
<meta property="og:description" content="${listing.desc ? listing.desc.slice(0, 200) : ''}">
<meta property="og:image" content="${listing.img || ''}">
<meta property="og:url" content="${BASE}/listing/${id}">
<link rel="canonical" href="${BASE}/listing/${id}">
</head>
<body>
<h1>${listing.title}</h1>
<p><strong>Ціна:</strong> ${listing.price} грн</p>
<p><strong>Місто:</strong> ${listing.city}</p>
<p><strong>Категорія:</strong> ${listing.cat}</p>
<p><strong>Стан:</strong> ${listing.condition}</p>
<p><strong>Продавець:</strong> ${listing.sellerName}</p>
${listing.img ? `<img src="${listing.img}" alt="${listing.title}" style="max-width:600px">` : ''}
<p>${listing.desc || ''}</p>
<a href="${BASE}/listing/${id}">Переглянути оголошення</a>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600');
  res.status(200).send(html);
};
