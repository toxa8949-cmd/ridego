const PROJECT = 'ridego-6f981';
const BASE = 'https://ridego.com.ua';
const BOTS = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot/i;

async function getNewsFromFirestore(id) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/news/${id}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.fields) return null;
  const f = data.fields;
  return {
    title:   f.title?.stringValue || '',
    excerpt: f.excerpt?.stringValue || '',
    body:    f.body?.stringValue || '',
    img:     f.img?.stringValue || '',
    cat:     f.cat?.stringValue || '',
  };
}

module.exports = async (req, res) => {
  const ua = req.headers['user-agent'] || '';
  const isBot = BOTS.test(ua);
  const id = req.url.replace('/api/news-item/', '').split('?')[0];

  if (!isBot) {
    res.setHeader('Location', `${BASE}/news/${id}`);
    return res.status(302).end();
  }

  const news = await getNewsFromFirestore(id);
  if (!news) return res.status(404).send('<h1>Не знайдено</h1>');

  // Прибрати HTML теги з body для meta description
  const plainText = (news.body || '').replace(/<[^>]+>/g, ' ').slice(0, 200);

  const html = `<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${news.title} — RideGO</title>
<meta name="description" content="${news.excerpt || plainText}">
<meta property="og:title" content="${news.title}">
<meta property="og:description" content="${news.excerpt || ''}">
<meta property="og:image" content="${news.img || ''}">
<meta property="og:type" content="article">
<meta property="og:url" content="${BASE}/news/${id}">
<link rel="canonical" href="${BASE}/news/${id}">
</head>
<body>
<article>
<h1>${news.title}</h1>
<p><em>${news.excerpt}</em></p>
${news.img ? `<img src="${news.img}" alt="${news.title}" style="max-width:800px">` : ''}
<div>${news.body || ''}</div>
</article>
<a href="${BASE}/news/${id}">Читати повністю</a>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=7200');
  res.status(200).send(html);
};
