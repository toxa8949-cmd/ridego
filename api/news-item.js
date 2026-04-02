const PROJECT = 'ridego-6f981';
const BASE = 'https://ridego.com.ua';
const BOTS = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|linkedinbot|telegrambot|whatsapp/i;

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function getNewsFromFirestore(id) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/news/${id}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.fields) return null;
  const f = data.fields;
  return {
    title:     f.title?.stringValue || '',
    excerpt:   f.excerpt?.stringValue || '',
    body:      f.body?.stringValue || '',
    img:       f.img?.stringValue || '',
    cat:       f.cat?.stringValue || '',
    createdAt: f.createdAt?.timestampValue || '',
    author:    f.author?.stringValue || 'RideGO',
  };
}

module.exports = async (req, res) => {
  const ua = req.headers['user-agent'] || '';
  const isBot = BOTS.test(ua);
  const id = req.url.replace('/api/news-item/', '').split('?')[0].replace(/[^a-zA-Z0-9_-]/g, '');

  if (!isBot) {
    const fs = require('fs');
    const path = require('path');
    try {
      const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      return res.status(200).send(html);
    } catch(e) {
      res.setHeader('Location', `${BASE}/news/${id}`);
      return res.status(302).end();
    }
  }

  const news = await getNewsFromFirestore(id);
  if (!news) return res.status(404).send('<h1>Не знайдено</h1>');

  const plainText = (news.body || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
  const desc = news.excerpt || plainText || news.title;
  const dateStr = news.createdAt ? new Date(news.createdAt).toISOString().split('T')[0] : '';

  const articleSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": news.title,
    "description": desc,
    "image": news.img || `${BASE}/og-image.png`,
    "url": `${BASE}/news/${id}`,
    "datePublished": dateStr,
    "author": { "@type": "Organization", "name": "RideGO", "url": BASE },
    "publisher": {
      "@type": "Organization",
      "name": "RideGO",
      "url": BASE,
      "logo": { "@type": "ImageObject", "url": `${BASE}/favicon.svg` }
    }
  });

  const breadcrumb = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "RideGO", "item": BASE },
      { "@type": "ListItem", "position": 2, "name": "Новини", "item": `${BASE}/news` },
      { "@type": "ListItem", "position": 3, "name": news.title, "item": `${BASE}/news/${id}` }
    ]
  });

  const html = `<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escHtml(news.title)} | RideGO</title>
<meta name="description" content="${escHtml(desc)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${BASE}/news/${id}">

<meta property="og:type" content="article">
<meta property="og:title" content="${escHtml(news.title)}">
<meta property="og:description" content="${escHtml(desc)}">
<meta property="og:image" content="${escHtml(news.img || BASE + '/og-image.png')}">
<meta property="og:url" content="${BASE}/news/${id}">
<meta property="og:site_name" content="RideGO">
<meta property="og:locale" content="uk_UA">
${dateStr ? `<meta property="article:published_time" content="${dateStr}">` : ''}

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escHtml(news.title)}">
<meta name="twitter:description" content="${escHtml(desc)}">
<meta name="twitter:image" content="${escHtml(news.img || BASE + '/og-image.png')}">

<script type="application/ld+json">${articleSchema}</script>
<script type="application/ld+json">${breadcrumb}</script>
</head>
<body style="font-family:sans-serif;max-width:800px;margin:40px auto;padding:0 20px;color:#333;line-height:1.7">
  <nav style="font-size:13px;color:#666;margin-bottom:24px">
    <a href="${BASE}" style="color:#1db954;text-decoration:none">RideGO</a> →
    <a href="${BASE}/news" style="color:#1db954;text-decoration:none">Новини</a> →
    <span>${escHtml(news.title)}</span>
  </nav>
  ${news.cat ? `<span style="background:#f0fdf4;color:#166534;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:600">${escHtml(news.cat)}</span>` : ''}
  <h1 style="margin:16px 0 8px;font-size:32px;line-height:1.3;color:#111">${escHtml(news.title)}</h1>
  ${news.excerpt ? `<p style="font-size:18px;color:#555;font-style:italic;margin:0 0 24px">${escHtml(news.excerpt)}</p>` : ''}
  ${news.img ? `<img src="${escHtml(news.img)}" alt="${escHtml(news.title)}" style="width:100%;border-radius:12px;margin-bottom:24px;object-fit:cover;max-height:400px">` : ''}
  <div style="font-size:16px;line-height:1.8">${(news.body || '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\bon\w+\s*=/gi, 'data-removed=')}</div>
  <div style="margin-top:40px;padding:24px;background:#f0fdf4;border-radius:12px;text-align:center">
    <p style="margin:0 0 12px;font-weight:600">Купуй та продавай електротранспорт на RideGO</p>
    <a href="${BASE}" style="display:inline-block;background:#1db954;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600">Перейти на RideGO →</a>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=7200, stale-while-revalidate=86400');
  res.status(200).send(html);
};
