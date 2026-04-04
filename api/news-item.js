const PROJECT = 'ridego-6f981';
const BASE = 'https://ridego.com.ua';
const BOTS = /googlebot|google-inspectiontool|google-inspection|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|linkedinbot|telegrambot|whatsapp|applebot|mj12bot|ahrefsbot|semrushbot|petalbot|bytespider|headlesschrome|lighthouse|chrome-lighthouse/i;

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
    updatedAt: f.updatedAt?.timestampValue || '',
    author:    f.author?.stringValue || 'RideGO',
    tags:      f.tags?.arrayValue?.values?.map(v=>v.stringValue).filter(Boolean) || [],
  };
}

// Отримуємо 3 схожі новини для internal linking
async function getRelatedNews(currentId, cat) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`;
  const body = {
    structuredQuery: {
      from: [{ collectionId: 'news' }],
      where: { fieldFilter: { field: { fieldPath: 'published' }, op: 'EQUAL', value: { booleanValue: true } } },
      orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
      limit: 6
    }
  };
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) return [];
    const data = await res.json();
    return data
      .filter(d => d.document && d.document.name.split('/').pop() !== currentId)
      .slice(0, 3)
      .map(d => {
        const f = d.document.fields || {};
        return {
          id: d.document.name.split('/').pop(),
          title: f.title?.stringValue || '',
          img: f.img?.stringValue || '',
          excerpt: f.excerpt?.stringValue || '',
        };
      });
  } catch(e) { return []; }
}

module.exports = async (req, res) => {
  const ua = req.headers['user-agent'] || '';
  const isBot = BOTS.test(ua);

  // Читаємо id з query string вручну (req.query може бути undefined)
  const _qs = req.url.includes('?') ? req.url.split('?')[1] : '';
  const _qp = {};
  _qs.split('&').forEach(function(p) {
    const kv = p.split('=');
    if (kv[0]) _qp[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
  });
  const rawId = _qp.id || (req.query && req.query.id) || '';
  const id = rawId.replace(/[^a-zA-Z0-9_-]/g, '');

  // SSR для всіх

  const [news, related] = await Promise.all([
    getNewsFromFirestore(id),
    getRelatedNews(id)
  ]);
  if (!news) return res.status(404).send('<h1>Не знайдено</h1>');

  // Чистий текст для description
  const plainText = (news.body || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const rawDesc = news.excerpt || plainText.slice(0, 160) || news.title;
  const desc = rawDesc.length > 155 ? rawDesc.slice(0, 152) + '...' : rawDesc;

  const datePublished = news.createdAt ? new Date(news.createdAt).toISOString() : '';
  const dateModified  = news.updatedAt ? new Date(news.updatedAt).toISOString() : datePublished;
  const dateStr       = datePublished ? datePublished.split('T')[0] : '';

  // Title: до 60 символів
  const titleSeo = news.title.length > 55
    ? `${news.title.slice(0, 52)}... | RideGO`
    : `${news.title} | RideGO`;

  const articleSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": news.title,
    "description": desc,
    "image": { "@type": "ImageObject", "url": news.img || `${BASE}/og-image.png`, "width": 1200, "height": 630 },
    "url": `${BASE}/news/${id}`,
    "datePublished": datePublished,
    "dateModified": dateModified,
    "author": { "@type": "Organization", "name": news.author || "RideGO", "url": BASE },
    "publisher": {
      "@type": "Organization",
      "name": "RideGO",
      "url": BASE,
      "logo": { "@type": "ImageObject", "url": `${BASE}/favicon.svg`, "width": 32, "height": 32 }
    },
    "mainEntityOfPage": { "@type": "WebPage", "@id": `${BASE}/news/${id}` },
    ...(news.tags.length ? { "keywords": news.tags.join(', ') } : {})
  });

  const breadcrumb = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "RideGO", "item": BASE },
      { "@type": "ListItem", "position": 2, "name": "Новини", "item": `${BASE}/news` },
      ...(news.cat ? [{ "@type": "ListItem", "position": 3, "name": news.cat, "item": `${BASE}/news?cat=${encodeURIComponent(news.cat)}` }] : []),
      { "@type": "ListItem", "position": news.cat ? 4 : 3, "name": news.title, "item": `${BASE}/news/${id}` }
    ]
  });

  const relatedHtml = related.length ? related.map(r => `
    <a href="${BASE}/news/${r.id}" style="display:flex;gap:12px;align-items:center;padding:12px;border:1px solid #eee;border-radius:10px;text-decoration:none;color:#111;margin-bottom:10px">
      ${r.img ? `<img src="${escHtml(r.img)}" alt="${escHtml(r.title)}" width="80" height="60" loading="lazy" style="width:80px;height:60px;object-fit:cover;border-radius:6px;flex-shrink:0">` : ''}
      <div>
        <div style="font-weight:600;font-size:14px;margin-bottom:3px">${escHtml(r.title)}</div>
        ${r.excerpt ? `<div style="font-size:12px;color:#888">${escHtml(r.excerpt.slice(0,80))}...</div>` : ''}
      </div>
    </a>`).join('') : '';

  // Безпечний body — прибираємо скрипти та inline handlers
  const safeBody = (news.body || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\bon\w+\s*=/gi, 'data-removed=');

  const html = `<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escHtml(titleSeo)}</title>
<meta name="description" content="${escHtml(desc)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${BASE}/news/${id}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
${dateStr ? `<meta name="article:published_time" content="${dateStr}">` : ''}
${news.cat ? `<meta name="article:section" content="${escHtml(news.cat)}">` : ''}
${news.tags.length ? `<meta name="keywords" content="${escHtml(news.tags.join(', '))}">` : ''}
<meta property="og:type" content="article">
<meta property="og:title" content="${escHtml(news.title)}">
<meta property="og:description" content="${escHtml(desc)}">
<meta property="og:image" content="${escHtml(news.img || BASE+'/og-image.png')}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="${BASE}/news/${id}">
<meta property="og:site_name" content="RideGO">
<meta property="og:locale" content="uk_UA">
${datePublished ? `<meta property="article:published_time" content="${datePublished}">` : ''}
${dateModified ? `<meta property="article:modified_time" content="${dateModified}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escHtml(news.title)}">
<meta name="twitter:description" content="${escHtml(desc)}">
<meta name="twitter:image" content="${escHtml(news.img || BASE+'/og-image.png')}">
<script type="application/ld+json">${articleSchema}</script>
<script type="application/ld+json">${breadcrumb}</script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;max-width:820px;margin:0 auto;padding:20px;color:#222;line-height:1.7;background:#fff}
header{padding:16px 0;border-bottom:2px solid #1db954;margin-bottom:20px}
header a{font-size:26px;font-weight:800;color:#111;text-decoration:none}
header a span{color:#1db954}
.bc{font-size:13px;color:#888;margin-bottom:20px}
.bc a{color:#1db954;text-decoration:none}
.bc span{margin:0 5px;color:#ccc}
.cat-tag{background:#f0fdf4;color:#166534;padding:4px 14px;border-radius:20px;font-size:13px;font-weight:600;display:inline-block;margin-bottom:14px;text-decoration:none}
h1{font-size:clamp(22px,4vw,34px);font-weight:800;line-height:1.3;color:#111;margin-bottom:10px}
.excerpt{font-size:18px;color:#555;font-style:italic;margin-bottom:20px;line-height:1.6}
.hero-img{width:100%;max-height:440px;object-fit:cover;border-radius:12px;display:block;margin-bottom:24px}
.meta{font-size:13px;color:#999;margin-bottom:24px;display:flex;gap:16px;flex-wrap:wrap}
.article-body{font-size:16px;line-height:1.9;color:#333}
.article-body h2{font-size:22px;font-weight:700;margin:28px 0 12px;color:#111}
.article-body h3{font-size:18px;font-weight:700;margin:24px 0 10px;color:#111}
.article-body p{margin-bottom:16px}
.article-body img{max-width:100%;border-radius:8px;margin:16px 0}
.article-body ul,.article-body ol{margin:0 0 16px 24px}
.article-body li{margin-bottom:6px}
.cta-box{margin-top:40px;padding:24px;background:#f0fdf4;border-radius:12px;text-align:center;border:1px solid #d1fae5}
.related{margin-top:36px}
.related h2{font-size:18px;font-weight:700;margin-bottom:16px;color:#111}
footer{padding:20px 0;border-top:1px solid #eee;font-size:13px;color:#999;text-align:center;margin-top:32px}
footer a{color:#1db954;text-decoration:none;margin:0 8px}
</style>
</head>
<body>
<header><a href="${BASE}">Ride<span>GO</span></a></header>
<nav class="bc" aria-label="Breadcrumb">
  <a href="${BASE}">RideGO</a><span>›</span>
  <a href="${BASE}/news">Новини</a><span>›</span>
  <span>${escHtml(news.title.slice(0,40))}${news.title.length>40?'...':''}</span>
</nav>
${news.cat ? `<a href="${BASE}/news?cat=${encodeURIComponent(news.cat)}" class="cat-tag">${escHtml(news.cat)}</a>` : ''}
<h1>${escHtml(news.title)}</h1>
${news.excerpt ? `<p class="excerpt">${escHtml(news.excerpt)}</p>` : ''}
<div class="meta">
  ${dateStr ? `<span>📅 ${dateStr}</span>` : ''}
  <span>✍️ ${escHtml(news.author)}</span>
</div>
${news.img ? `<img src="${escHtml(news.img)}" alt="${escHtml(news.title)}" width="820" height="440" loading="eager" fetchpriority="high" class="hero-img">` : ''}
<article class="article-body">${safeBody}</article>
<div class="cta-box">
  <p style="font-weight:700;font-size:16px;margin-bottom:8px">Купуй та продавай електротранспорт на RideGO</p>
  <p style="color:#555;font-size:14px;margin-bottom:16px">Понад 5800 оголошень по всій Україні</p>
  <a href="${BASE}/catalog" style="display:inline-block;background:#1db954;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;margin-right:8px">Каталог →</a>
  <a href="${BASE}/add" style="display:inline-block;background:#fff;color:#1db954;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;border:2px solid #1db954">Подати оголошення</a>
</div>
${related.length ? `<div class="related"><h2>Читайте також</h2>${relatedHtml}</div>` : ''}
<footer>
  <span>© 2024–2026 RideGO</span>
  <a href="${BASE}">Головна</a>
  <a href="${BASE}/news">Всі новини</a>
  <a href="${BASE}/catalog">Каталог</a>
</footer>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=7200, stale-while-revalidate=86400');
  res.status(200).send(html);
};
