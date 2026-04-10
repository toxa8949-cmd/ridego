// api/home.js — SSR для головної сторінки (боти отримують повний контент)
const BASE = 'https://www.ridego.com.ua';
const PROJECT = 'ridego-6f981';

const BOTS = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|linkedinbot|telegrambot|whatsapp|applebot|mj12bot|ahrefsbot|semrushbot|petalbot|bytespider/i;

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function queryFirestore(collection, orderBy, dir, limit) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`;
  const body = {
    structuredQuery: {
      from: [{ collectionId: collection }],
      orderBy: [{ field: { fieldPath: orderBy }, direction: dir || 'DESCENDING' }],
      limit: limit || 12
    }
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) return [];
  return res.json();
}

async function getActiveListings() {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`;
  const body = {
    structuredQuery: {
      from: [{ collectionId: 'listings' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'status' },
          op: 'EQUAL',
          value: { stringValue: 'active' }
        }
      },
      orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
      limit: 12
    }
  };
  try {
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
          cat: f.cat?.stringValue || '',
          condition: f.condition?.stringValue || '',
          img: f.img?.stringValue || '',
        };
      });
  } catch(e) {
    return [];
  }
}

async function getPublishedNews() {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`;
  const body = {
    structuredQuery: {
      from: [{ collectionId: 'news' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'published' },
          op: 'EQUAL',
          value: { booleanValue: true }
        }
      },
      orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
      limit: 6
    }
  };
  try {
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
          excerpt: f.excerpt?.stringValue || '',
          img: f.img?.stringValue || '',
          cat: f.cat?.stringValue || '',
        };
      });
  } catch(e) {
    return [];
  }
}

const CATEGORIES = [
  { name: 'Електросамокати', slug: 'elektrosamokaty', icon: '⚡' },
  { name: 'Велосипеди', slug: 'velosypedy', icon: '🚲' },
  { name: 'Електровелосипеди', slug: 'elektrovelosypedy', icon: '🚴' },
  { name: 'Електроскутери', slug: 'elektroskutery', icon: '🛵' },
  { name: 'Електромотоцикли', slug: 'elektromotocykly', icon: '🏍' },
];

module.exports = async (req, res) => {
  const ua = req.headers['user-agent'] || '';
  const isBot = BOTS.test(ua);

  // Звичайні юзери — віддаємо SPA
  if (!isBot) {
    const fs = require('fs');
    const path = require('path');
    try {
      const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      return res.status(200).send(html);
    } catch(e) {
      res.setHeader('Location', BASE + '/');
      return res.status(302).end();
    }
  }

  // Боти — SSR
  const [listings, news] = await Promise.all([
    getActiveListings(),
    getPublishedNews()
  ]);

  // Категорії HTML
  const categoriesHtml = CATEGORIES.map(c =>
    `<a href="${BASE}/category/${c.slug}" style="display:inline-block;padding:12px 20px;background:#f0fdf4;border-radius:12px;text-decoration:none;color:#111;font-weight:600;margin:4px">${c.icon} ${escHtml(c.name)}</a>`
  ).join('\n');

  // Оголошення HTML
  const listingsHtml = listings.length ? listings.map(l => `
    <div style="border:1px solid #eee;border-radius:12px;padding:16px;margin-bottom:12px;display:flex;gap:16px;align-items:center">
      ${l.img ? `<img src="${escHtml(l.img)}" alt="${escHtml(l.title)}" style="width:80px;height:80px;object-fit:cover;border-radius:8px;flex-shrink:0" loading="lazy">` : ''}
      <div>
        <a href="${BASE}/listing/${l.id}" style="font-weight:600;color:#111;text-decoration:none;font-size:16px">${escHtml(l.title)}</a>
        <div style="color:#1db954;font-weight:700;margin:4px 0">${l.price ? Number(l.price).toLocaleString('uk') + ' грн' : ''}</div>
        <div style="color:#666;font-size:13px">${escHtml(l.city)}${l.cat ? ' · ' + escHtml(l.cat) : ''}${l.condition ? ' · ' + escHtml(l.condition) : ''}</div>
      </div>
    </div>
  `).join('') : '<p style="color:#666">Оголошення завантажуються...</p>';

  // Новини HTML
  const newsHtml = news.length ? news.map(n => `
    <div style="border:1px solid #eee;border-radius:12px;padding:16px;margin-bottom:12px">
      ${n.img ? `<img src="${escHtml(n.img)}" alt="${escHtml(n.title)}" style="width:100%;height:160px;object-fit:cover;border-radius:8px;margin-bottom:12px" loading="lazy">` : ''}
      <a href="${BASE}/news/${n.id}" style="font-weight:600;color:#111;text-decoration:none;font-size:15px">${escHtml(n.title)}</a>
      ${n.excerpt ? `<p style="color:#666;font-size:13px;margin-top:6px">${escHtml(n.excerpt.slice(0,120))}</p>` : ''}
    </div>
  `).join('') : '';

  // Schema.org
  const websiteSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "RideGO",
    "url": BASE + "/",
    "description": "Маркетплейс електротранспорту України",
    "potentialAction": {
      "@type": "SearchAction",
      "target": BASE + "/catalog?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  });

  const orgSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "RideGO",
    "url": BASE,
    "logo": BASE + "/favicon.svg",
    "description": "Маркетплейс електротранспорту України",
    "sameAs": ["https://t.me/ridego_ua", "https://instagram.com/ridego.ua"]
  });

  const itemListSchema = listings.length ? JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Нові оголошення електротранспорту",
    "url": BASE + "/",
    "numberOfItems": listings.length,
    "itemListElement": listings.slice(0, 10).map((l, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "url": BASE + "/listing/" + l.id,
      "name": l.title
    }))
  }) : '';

  const catListSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Категорії електротранспорту",
    "url": BASE + "/catalog",
    "itemListElement": CATEGORIES.map((c, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": c.name,
      "url": BASE + "/category/" + c.slug
    }))
  });

  const faqSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      { "@type": "Question", "name": "Як подати оголошення?", "acceptedAnswer": { "@type": "Answer", "text": "Натисніть «+» внизу або «Подати оголошення» на головній. Оберіть категорію, заповніть опис, ціну, додайте фото та вкажіть місто." }},
      { "@type": "Question", "name": "Що таке слоти?", "acceptedAnswer": { "@type": "Answer", "text": "1 слот = право розмістити 1 оголошення на 30 днів. При реєстрації — 10 слотів безкоштовно." }},
      { "@type": "Question", "name": "Як зв'язатися з продавцем?", "acceptedAnswer": { "@type": "Answer", "text": "На сторінці оголошення натисніть «Написати» — відкриється вбудований чат. Або «Показати номер» щоб зателефонувати." }},
      { "@type": "Question", "name": "Чи безпечно купувати через RideGO?", "acceptedAnswer": { "@type": "Answer", "text": "RideGO — майданчик для оголошень. Рекомендуємо зустрічатись особисто, перевіряти товар перед оплатою." }},
    ]
  });

  const html = `<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>RideGO — Маркетплейс електротранспорту України</title>
<meta name="description" content="RideGO — найбільший маркетплейс електротранспорту в Україні. Купуй та продавай електросамокати, велосипеди, скутери. Понад 5800 оголошень по всій Україні.">
<meta name="keywords" content="електросамокат, велосипед, електровелосипед, електроскутер, купити, продати, маркетплейс, Україна">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${BASE}/">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">

<meta property="og:type" content="website">
<meta property="og:site_name" content="RideGO">
<meta property="og:title" content="RideGO — Маркетплейс електротранспорту України">
<meta property="og:description" content="Купуй та продавай електросамокати, велосипеди, скутери. Понад 5800 оголошень по всій Україні.">
<meta property="og:url" content="${BASE}/">
<meta property="og:image" content="${BASE}/og-image.png">
<meta property="og:locale" content="uk_UA">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="RideGO — Маркетплейс електротранспорту">
<meta name="twitter:description" content="Купуй та продавай електротранспорт в Україні">
<meta name="twitter:image" content="${BASE}/og-image.png">

<script type="application/ld+json">${websiteSchema}</script>
<script type="application/ld+json">${orgSchema}</script>
<script type="application/ld+json">${catListSchema}</script>
${itemListSchema ? `<script type="application/ld+json">${itemListSchema}</script>` : ''}
<script type="application/ld+json">${faqSchema}</script>
</head>
<body style="font-family:'Segoe UI',Arial,sans-serif;max-width:960px;margin:0 auto;padding:0 20px;color:#333;line-height:1.7">

  <!-- Header -->
  <header style="padding:20px 0;border-bottom:2px solid #1db954">
    <a href="${BASE}" style="font-size:28px;font-weight:800;color:#111;text-decoration:none">Ride<span style="color:#1db954">GO</span></a>
    <nav style="margin-top:12px;display:flex;gap:20px;font-size:14px">
      <a href="${BASE}/catalog" style="color:#1db954;text-decoration:none;font-weight:600">Каталог</a>
      <a href="${BASE}/news" style="color:#1db954;text-decoration:none;font-weight:600">Новини</a>
      <a href="${BASE}/services" style="color:#1db954;text-decoration:none;font-weight:600">Сервіси</a>
      <a href="${BASE}/faq" style="color:#1db954;text-decoration:none;font-weight:600">FAQ</a>
    </nav>
  </header>

  <!-- Hero -->
  <section style="padding:40px 0;text-align:center">
    <h1 style="font-size:36px;font-weight:800;line-height:1.2;margin-bottom:16px">
      Маркетплейс електротранспорту <span style="color:#1db954">України</span>
    </h1>
    <p style="font-size:18px;color:#555;margin-bottom:24px">
      Купуй та продавай електросамокати, велосипеди та скутери. Більше 5 800 пропозицій по всій Україні.
    </p>
    <div style="display:flex;gap:24px;justify-content:center;flex-wrap:wrap;margin-bottom:32px">
      <div><strong style="font-size:24px;color:#1db954">5 800+</strong><br><span style="font-size:13px;color:#666">Оголошень</span></div>
      <div><strong style="font-size:24px;color:#1db954">12 000+</strong><br><span style="font-size:13px;color:#666">Покупців</span></div>
      <div><strong style="font-size:24px;color:#1db954">24 міста</strong><br><span style="font-size:13px;color:#666">По Україні</span></div>
    </div>
    <a href="${BASE}/catalog" style="display:inline-block;background:#1db954;color:#fff;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700;font-size:16px">Переглянути оголошення →</a>
  </section>

  <!-- Категорії -->
  <section style="padding:24px 0;border-top:1px solid #eee">
    <h2 style="font-size:22px;font-weight:800;margin-bottom:16px">Категорії</h2>
    <div style="display:flex;flex-wrap:wrap;gap:4px">${categoriesHtml}</div>
  </section>

  <!-- Нові оголошення -->
  <section style="padding:24px 0;border-top:1px solid #eee">
    <h2 style="font-size:22px;font-weight:800;margin-bottom:16px">Нові оголошення</h2>
    ${listingsHtml}
    <a href="${BASE}/catalog" style="display:inline-block;margin-top:12px;color:#1db954;font-weight:600;text-decoration:none">Всі оголошення →</a>
  </section>

  <!-- Новини -->
  ${news.length ? `
  <section style="padding:24px 0;border-top:1px solid #eee">
    <h2 style="font-size:22px;font-weight:800;margin-bottom:16px">Новини та огляди</h2>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">
      ${newsHtml}
    </div>
    <a href="${BASE}/news" style="display:inline-block;margin-top:12px;color:#1db954;font-weight:600;text-decoration:none">Всі статті →</a>
  </section>
  ` : ''}

  <!-- CTA -->
  <section style="padding:32px;background:#f0fdf4;border-radius:16px;text-align:center;margin:32px 0">
    <h2 style="font-size:20px;font-weight:700;margin-bottom:8px">Розмістіть оголошення</h2>
    <p style="color:#555;margin-bottom:16px">Безкоштовно або з просуванням — ваш транспорт знайде покупця швидше!</p>
    <a href="${BASE}/add" style="display:inline-block;background:#1db954;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:600">Подати оголошення →</a>
  </section>

  <!-- Footer -->
  <footer style="padding:24px 0;border-top:1px solid #eee;font-size:13px;color:#888;text-align:center">
    <p>© 2024–2026 RideGO. Всі права захищено.</p>
    <nav style="margin-top:8px;display:flex;gap:16px;justify-content:center">
      <a href="${BASE}/terms" style="color:#1db954;text-decoration:none">Правила</a>
      <a href="${BASE}/privacy" style="color:#1db954;text-decoration:none">Конфіденційність</a>
      <a href="${BASE}/faq" style="color:#1db954;text-decoration:none">FAQ</a>
    </nav>
  </footer>

</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
  res.status(200).send(html);
};
