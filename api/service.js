const BASE = 'https://www.ridego.com.ua';
const PROJECT = 'ridego-6f981';

const BOTS = /googlebot|google-inspectiontool|google-inspection|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|linkedinbot|telegrambot|whatsapp|applebot|mj12bot|ahrefsbot|semrushbot|petalbot|bytespider|headlesschrome|lighthouse|chrome-lighthouse/i;

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function getService(id) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/services/${id}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.fields) return null;
  const f = data.fields;
  const types = f.types?.arrayValue?.values?.map(v => v.stringValue).filter(Boolean) || [];
  const services = f.services?.arrayValue?.values?.map(v => {
    const sf = v.mapValue?.fields || {};
    return { name: sf.name?.stringValue || '', price: sf.price?.stringValue || '' };
  }).filter(s => s.name) || [];
  return {
    name:     f.name?.stringValue || '',
    city:     f.city?.stringValue || '',
    address:  f.address?.stringValue || '',
    phone:    f.phone?.stringValue || '',
    desc:     f.desc?.stringValue || f.description?.stringValue || '',
    schedule: f.schedule?.stringValue || f.hours?.stringValue || '',
    types,
    services,
    telegram: f.telegram?.stringValue || '',
    instagram:f.instagram?.stringValue || '',
    photoUrl: f.photoUrl?.stringValue || f.img?.stringValue || '',
  };
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

  const id = getParam(req, 'id').replace(/[^a-zA-Z0-9_-]/g, '');

  if (!isBot) {
    const fs = require('fs'); const path = require('path');
    try {
      const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      return res.status(200).send(html);
    } catch(e) {
      res.setHeader('Location', `${BASE}/service/${id}`);
      return res.status(302).end();
    }
  }

  const svc = await getService(id);
  if (!svc) return res.status(404).send('<h1>Сервіс не знайдено</h1>');

  const typesStr = svc.types.length ? svc.types.join(', ') : 'електротранспорт';
  const titleStr = `${svc.name} — сервісний центр${svc.city ? ' у ' + svc.city : ''} | RideGO`;
  const descStr = svc.desc
    ? svc.desc.slice(0, 155)
    : `Сервісний центр ${svc.name}${svc.city ? ' у ' + svc.city : ''}. Ремонт та обслуговування: ${typesStr}.`;

  const servicesHtml = svc.services.length
    ? svc.services.map(s => `<tr><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${escHtml(s.name)}</td><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-weight:600;color:#1db954;text-align:right">${escHtml(s.price)}</td></tr>`).join('')
    : '';

  const localBizSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "AutoRepair",
    "name": svc.name,
    "description": descStr,
    "url": `${BASE}/service/${id}`,
    "image": svc.photoUrl || `${BASE}/og-image.png`,
    ...(svc.address || svc.city ? {
      "address": {
        "@type": "PostalAddress",
        "streetAddress": svc.address || '',
        "addressLocality": svc.city || '',
        "addressCountry": "UA"
      }
    } : {}),
    ...(svc.phone ? { "telephone": svc.phone } : {}),
    ...(svc.schedule ? { "openingHours": svc.schedule } : {}),
    "priceRange": svc.services.length ? "₴₴" : undefined,
  });

  const breadcrumbSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "RideGO", "item": BASE },
      { "@type": "ListItem", "position": 2, "name": "Сервіси", "item": `${BASE}/services` },
      { "@type": "ListItem", "position": 3, "name": svc.name, "item": `${BASE}/service/${id}` }
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
<link rel="canonical" href="${BASE}/service/${id}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<meta property="og:type" content="business.business">
<meta property="og:title" content="${escHtml(svc.name + ' — RideGO')}">
<meta property="og:description" content="${escHtml(descStr)}">
<meta property="og:url" content="${BASE}/service/${id}">
<meta property="og:site_name" content="RideGO">
<meta property="og:image" content="${escHtml(svc.photoUrl || BASE+'/og-image.png')}">
<meta property="og:locale" content="uk_UA">
<script type="application/ld+json">${localBizSchema}</script>
<script type="application/ld+json">${breadcrumbSchema}</script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;max-width:820px;margin:0 auto;padding:20px;color:#222;background:#fff}
header{padding:16px 0;border-bottom:2px solid #1db954;margin-bottom:20px}
header a{font-size:26px;font-weight:800;color:#111;text-decoration:none}
header a span{color:#1db954}
.bc{font-size:13px;color:#888;margin-bottom:20px}
.bc a{color:#1db954;text-decoration:none}
.bc span{margin:0 5px;color:#ccc}
.tag{display:inline-block;padding:5px 12px;background:#f0fdf4;border-radius:20px;font-size:13px;font-weight:600;color:#166534;margin:3px}
footer{padding:20px 0;border-top:1px solid #eee;font-size:13px;color:#999;text-align:center;margin-top:32px}
footer a{color:#1db954;text-decoration:none;margin:0 8px}
</style>
</head>
<body>
<header><a href="${BASE}">Ride<span>GO</span></a></header>
<nav class="bc" aria-label="Breadcrumb">
  <a href="${BASE}">RideGO</a><span>›</span>
  <a href="${BASE}/services">Сервіси</a><span>›</span>
  <span>${escHtml(svc.name)}</span>
</nav>
${svc.photoUrl ? `<img src="${escHtml(svc.photoUrl)}" alt="${escHtml(svc.name)}" width="820" height="300" loading="eager" style="width:100%;height:240px;object-fit:cover;border-radius:12px;margin-bottom:20px">` : ''}
<h1 style="font-size:clamp(22px,4vw,30px);font-weight:800;margin-bottom:8px">${escHtml(svc.name)}</h1>
<div style="color:#888;font-size:14px;margin-bottom:16px">
  🔧 Сервісний центр${svc.city ? ` · 📍 ${escHtml(svc.city)}` : ''}${svc.address ? ` · ${escHtml(svc.address)}` : ''}
</div>
${svc.types.length ? `<div style="margin-bottom:16px">${svc.types.map(t=>`<span class="tag">${escHtml(t)}</span>`).join('')}</div>` : ''}
${svc.desc ? `<p style="font-size:15px;color:#444;line-height:1.8;margin-bottom:24px;background:#f9f9f9;border-radius:10px;padding:16px">${escHtml(svc.desc)}</p>` : ''}
${svc.schedule ? `<div style="margin-bottom:16px;font-size:14px">🕐 <strong>Графік:</strong> ${escHtml(svc.schedule)}</div>` : ''}
${svc.phone ? `<div style="margin-bottom:16px"><a href="tel:${escHtml(svc.phone)}" style="display:inline-block;background:#1db954;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">📞 ${escHtml(svc.phone)}</a></div>` : ''}
${svc.services.length ? `
<h2 style="font-size:17px;font-weight:700;margin-bottom:12px">Послуги та ціни</h2>
<table style="border-collapse:collapse;width:100%;margin-bottom:24px">
  ${servicesHtml}
</table>` : ''}
<div style="margin-top:16px;display:flex;gap:12px;flex-wrap:wrap">
  ${svc.telegram ? `<a href="https://t.me/${svc.telegram.replace('@','')}" target="_blank" style="padding:10px 20px;background:#2ca5e0;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Telegram</a>` : ''}
  ${svc.instagram ? `<a href="https://instagram.com/${svc.instagram.replace('@','')}" target="_blank" style="padding:10px 20px;background:#e1306c;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Instagram</a>` : ''}
  <a href="${BASE}/service/${id}" style="padding:10px 20px;background:#1db954;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Відкрити на RideGO →</a>
</div>
<footer>
  <span>© 2024–2026 RideGO</span>
  <a href="${BASE}">Головна</a>
  <a href="${BASE}/services">Всі сервіси</a>
  <a href="${BASE}/catalog">Каталог</a>
</footer>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=7200, stale-while-revalidate=86400');
  res.status(200).send(html);
};
