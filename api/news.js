// api/news.js — SSR для сторінки списку новин (для пошукових ботів)
const BASE = 'https://www.ridego.com.ua';
const PROJECT = 'ridego-6f981';
const BOTS = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|linkedinbot|telegrambot|whatsapp|applebot|mj12bot|ahrefsbot|semrushbot|petalbot|bytespider|google-inspectiontool/i;

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function getNews() {
  const url = 'https://firestore.googleapis.com/v1/projects/' + PROJECT + '/databases/(default)/documents:runQuery';
  const body = {
    structuredQuery: {
      from: [{ collectionId: 'news' }],
      where: { fieldFilter: { field: { fieldPath: 'published' }, op: 'EQUAL', value: { booleanValue: true } } },
      orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
      limit: 60
    }
  };
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) return [];
    const data = await res.json();
    return data.filter(d => d.document).map(d => {
      const f = d.document.fields || {};
      return {
        id: d.document.name.split('/').pop(),
        title: f.title?.stringValue || '',
        excerpt: f.excerpt?.stringValue || '',
        img: f.img?.stringValue || '',
        cat: f.cat?.stringValue || '',
        author: f.author?.stringValue || 'RideGO',
        createdAt: f.createdAt?.timestampValue || '',
      };
    });
  } catch(e) { return []; }
}

module.exports = async (req, res) => {
  const ua = req.headers['user-agent'] || '';
  if (!BOTS.test(ua)) {
    const fs = require('fs'), path = require('path');
    try {
      const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      return res.status(200).send(html);
    } catch(e) {}
    res.setHeader('Location', BASE + '/news');
    return res.status(302).end();
  }

  const articles = await getNews();

  const CATS = [...new Set(articles.map(a => a.cat).filter(Boolean))];
  const catNav = CATS.map(cat =>
    '<a href="' + BASE + '/news?cat=' + encodeURIComponent(cat) + '" style="display:inline-flex;padding:7px 14px;background:#f0fdf4;border-radius:8px;text-decoration:none;color:#166534;font-weight:600;font-size:13px;margin:3px;border:1px solid #d1fae5">' + escHtml(cat) + '</a>'
  ).join('');

  const grid = articles.map(a => {
    const date = a.createdAt ? new Date(a.createdAt).toISOString().split('T')[0] : '';
    return '<article style="border:1px solid #eee;border-radius:12px;overflow:hidden">' +
      (a.img ? '<a href="' + BASE + '/news/' + a.id + '"><img src="' + escHtml(a.img) + '" alt="' + escHtml(a.title) + '" width="600" height="340" loading="lazy" style="width:100%;height:190px;object-fit:cover;display:block"></a>' : '') +
      '<div style="padding:14px">' +
      (a.cat ? '<span style="background:#f0fdf4;color:#166534;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;margin-bottom:8px;display:inline-block">' + escHtml(a.cat) + '</span>' : '') +
      '<a href="' + BASE + '/news/' + a.id + '" style="font-weight:700;color:#111;text-decoration:none;font-size:15px;line-height:1.4;margin-bottom:8px;display:block">' + escHtml(a.title) + '</a>' +
      (a.excerpt ? '<p style="color:#666;font-size:13px;line-height:1.6;margin-bottom:8px">' + escHtml(a.excerpt.slice(0,100)) + '...</p>' : '') +
      '<div style="font-size:12px;color:#aaa">' + (date ? date : '') + (a.author ? ' · ' + escHtml(a.author) : '') + '</div>' +
      '</div></article>';
  }).join('') || '<p style="color:#888">Статей поки немає</p>';

  const breadcrumb = JSON.stringify({"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"RideGO","item":BASE},{"@type":"ListItem","position":2,"name":"Новини та огляди","item":BASE+"/news"}]});
  const collPage = JSON.stringify({"@context":"https://schema.org","@type":"CollectionPage","name":"Новини та огляди електротранспорту | RideGO","url":BASE+"/news","description":"Огляди електросамокатів, велосипедів, скутерів. Новини ринку електротранспорту України.","publisher":{"@type":"Organization","name":"RideGO","url":BASE}});

  const html = '<!DOCTYPE html><html lang="uk"><head>' +
    '<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<title>Новини та огляди електротранспорту — електросамокати, велосипеди | RideGO</title>' +
    '<meta name="description" content="Огляди та новини електросамокатів, велосипедів, скутерів. Поради покупцям, порівняння моделей та актуальні новини ринку електротранспорту України.">' +
    '<meta name="keywords" content="новини електросамокат, огляд електросамокат, електровелосипед, електроскутер, купити, Україна, RideGO">' +
    '<meta name="robots" content="index, follow">' +
    '<link rel="canonical" href="' + BASE + '/news">' +
    '<link rel="icon" type="image/svg+xml" href="/favicon.svg">' +
    '<meta property="og:type" content="website">' +
    '<meta property="og:title" content="Новини та огляди електротранспорту | RideGO">' +
    '<meta property="og:description" content="Огляди та новини електросамокатів, велосипедів і скутерів в Україні.">' +
    '<meta property="og:url" content="' + BASE + '/news">' +
    '<meta property="og:image" content="' + BASE + '/og-image.png">' +
    '<meta property="og:locale" content="uk_UA"><meta property="og:site_name" content="RideGO">' +
    '<meta name="twitter:card" content="summary_large_image">' +
    '<meta name="twitter:title" content="Новини та огляди електротранспорту | RideGO">' +
    '<meta name="twitter:description" content="Огляди та новини електросамокатів в Україні">' +
    '<script type="application/ld+json">' + breadcrumb + '<\/script>' +
    '<script type="application/ld+json">' + collPage + '<\/script>' +
    '<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:"Segoe UI",Arial,sans-serif;max-width:1040px;margin:0 auto;padding:20px;color:#222;background:#fff}header{padding:16px 0;border-bottom:2px solid #1db954;margin-bottom:24px}header a{font-size:26px;font-weight:800;color:#111;text-decoration:none}header a span{color:#1db954}.bc{font-size:13px;color:#888;margin-bottom:20px}.bc a{color:#1db954;text-decoration:none}.bc span{margin:0 5px;color:#ccc}h1{font-size:clamp(22px,4vw,32px);font-weight:800;margin-bottom:8px;color:#111}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:18px;margin-bottom:32px}footer{padding:20px 0;border-top:1px solid #eee;font-size:13px;color:#999;text-align:center;margin-top:32px}footer a{color:#1db954;text-decoration:none;margin:0 8px}<\/style>' +
    '</head><body>' +
    '<header><a href="' + BASE + '">Ride<span>GO</span></a></header>' +
    '<nav class="bc"><a href="' + BASE + '">RideGO</a><span>&#8250;</span><span>Новини та огляди</span></nav>' +
    '<h1>Новини та огляди електротранспорту</h1>' +
    '<p style="color:#666;margin-bottom:20px">Актуальні огляди, поради та новини про електросамокати, велосипеди та скутери в Україні</p>' +
    (catNav ? '<div style="margin-bottom:22px">' + catNav + '</div>' : '') +
    '<div class="grid">' + grid + '</div>' +
    '<footer><span>&#169; 2024&#8211;2026 RideGO</span> <a href="' + BASE + '">Головна</a> <a href="' + BASE + '/catalog">Каталог</a> <a href="' + BASE + '/news">Новини</a> <a href="' + BASE + '/faq">FAQ</a></footer>' +
    '</body></html>';

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
  res.status(200).send(html);
};
