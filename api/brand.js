const BASE = 'https://www.ridego.com.ua';
const PROJECT = 'ridego-6f981';

const BOTS = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|linkedinbot|telegrambot|whatsapp|applebot|mj12bot|ahrefsbot|semrushbot|petalbot|bytespider|google-inspectiontool|google-structured-data-testing|storebot|developers\.google/i;

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── SEO-дані брендів ───────────────────────────────────────────────
const BRANDS = {
  'kukirin': {
    name: 'KuKirin',
    aliases: ['Kukirin', 'Kugoo Kirin', 'Kugoo', 'КуКірін', 'Кукірін', 'Кукирін', 'Кукирин'],
    firebaseNames: ['Kukirin', 'KuKirin', 'Kugoo'],
    category: 'Електросамокати',
    catSlug: 'elektrosamokaty',
    icon: '⚡',
    ogImage: '', // можна додати пізніше
    title: 'Купити електросамокат KuKirin (Кукірін) в Україні — ціни, моделі | RideGO',
    h1: 'Електросамокати KuKirin — купити в Україні',
    metaDesc: 'Електросамокати KuKirin (Кукірін, Kugoo Kirin) — купити в Україні на маркетплейсі RideGO. Моделі G2, G2 Pro, G2 Max, G3, G4, M4 Pro, S1 Max. Нові та б/в, ціни від продавців по всій Україні.',
    introHtml: `
      <div style="background:#f0fdf4;border-radius:16px;padding:24px 28px;margin-bottom:28px;line-height:1.8;font-size:15px;color:#333">
        <h2 style="font-size:20px;font-weight:800;margin-bottom:12px;color:#111">KuKirin (Кукірін) — електросамокати для міста та бездоріжжя</h2>
        <p>
          <strong>KuKirin</strong> (також відомий як <strong>Kugoo Kirin</strong>, Кукірін, Кукирін) — один із найпопулярніших брендів електросамокатів в Україні.
          Бренд пропонує широку лінійку моделей: від компактних міських (<strong>KuKirin S1 Max</strong>, <strong>KuKirin A1</strong>) до потужних позашляховиків
          (<strong>KuKirin G2 Pro</strong>, <strong>KuKirin G3</strong>, <strong>KuKirin G4</strong>) та моделей із сидінням (<strong>KuKirin M4 Pro</strong>, <strong>KuKirin M5 Pro</strong>).
        </p>
        <p style="margin-top:12px">
          На маркетплейсі <strong>RideGO</strong> ви можете <strong>купити електросамокат KuKirin</strong> як новий, так і б/в — від приватних продавців та магазинів по всій Україні.
          Порівнюйте ціни, характеристики та стан, обирайте найкращу пропозицію та зв'яжіться з продавцем напряму.
        </p>

        <h3 style="font-size:17px;font-weight:700;margin-top:20px;margin-bottom:10px;color:#111">Популярні моделі KuKirin</h3>
        <ul style="margin:0;padding-left:20px;color:#444">
          <li><strong>KuKirin G2</strong> — 800 Вт, 48V 15Ah, до 60 км запас ходу. Універсальна міська модель.</li>
          <li><strong>KuKirin G2 Pro</strong> — покращена версія G2 з посиленою рамою та більшими гальмами.</li>
          <li><strong>KuKirin G2 Max</strong> — 1000 Вт, 20Ah батарея, до 70 км ходу. Для далеких поїздок.</li>
          <li><strong>KuKirin G3 / G3 Pro</strong> — подвійний двигун до 1200 Вт, пневматичні шини, потужна амортизація.</li>
          <li><strong>KuKirin G4</strong> — 2000 Вт, до 69 км/год. Флагман для досвідчених райдерів.</li>
          <li><strong>KuKirin M4 Pro</strong> — з сидінням, 1500 Вт, NFC-ключ. Комфорт для тривалих поїздок.</li>
          <li><strong>KuKirin S1 Max</strong> — легкий (16 кг), 350 Вт, складний. Ідеальний для "останньої милі".</li>
          <li><strong>KuKirin T3</strong> — 800 Вт, 15.6Ah, 10-дюймові колеса. Золота середина ціна/якість.</li>
          <li><strong>KuKirin C1 Pro</strong> — 14-дюймові колеса, 26Ah, до 100 км ходу. Для комфортних далеких поїздок.</li>
        </ul>

        <h3 style="font-size:17px;font-weight:700;margin-top:20px;margin-bottom:10px;color:#111">Чому купити KuKirin на RideGO?</h3>
        <p>
          На RideGO зібрані оголошення від продавців по всій Україні — Київ, Харків, Одеса, Дніпро, Львів та інші міста.
          Ви бачите реальні фото, точні характеристики та ціни без прихованих комісій.
          Купити електросамокат Кукірін на RideGO — це зручно, безпечно та вигідно.
        </p>
      </div>
    `,
    faqItems: [
      {
        q: 'Скільки коштує електросамокат KuKirin в Україні?',
        a: 'Ціни на електросамокати KuKirin в Україні починаються від ~14 000 грн за легкі моделі (S1 Max) і до ~40 000 грн за флагмани (G4, G2 Master). Вживані моделі можна знайти значно дешевше.'
      },
      {
        q: 'Який KuKirin вибрати для міста?',
        a: 'Для щоденних міських поїздок підійдуть KuKirin G2 (800 Вт, до 60 км ходу) або KuKirin S1 Max (легкий, 16 кг). Для поганих доріг — KuKirin G2 Pro з покращеною амортизацією.'
      },
      {
        q: 'Чим KuKirin відрізняється від Kugoo?',
        a: 'KuKirin — це ребрендинг Kugoo Kirin. Фактично це той самий виробник, але під новим брендом KuKirin. Моделі серії Kirin (G2, G3, M4 Pro) тепер випускаються під назвою KuKirin.'
      },
      {
        q: 'Де купити оригінальний KuKirin в Україні?',
        a: 'На маркетплейсі RideGO зібрані оголошення від продавців по всій Україні. Ви можете порівняти ціни, перевірити рейтинг продавця та обрати найкращу пропозицію.'
      },
      {
        q: 'Який запас ходу у електросамокатів KuKirin?',
        a: 'Залежно від моделі: KuKirin S1 Max — до 40 км, G2 — до 60 км, G2 Max — до 70 км, C1 Pro — до 100 км. Реальний пробіг залежить від ваги райдера, рельєфу та швидкості.'
      }
    ],
    // Пошукові запити для внутрішньої перелінковки
    relatedSearches: [
      'купити kukirin g2',
      'kukirin g2 pro ціна',
      'kukirin g4 купити',
      'kukirin m4 pro ціна',
      'електросамокат kukirin ціна',
      'kukirin або ninebot',
      'kukirin запчастини',
    ]
  },
  // Можна додавати нові бренди за тим самим шаблоном:
  // 'ninebot': { ... },
  // 'xiaomi': { ... },
};

// Маппінг slug → brand для швидкого пошуку
const BRAND_BY_SLUG = {};
Object.keys(BRANDS).forEach(slug => { BRAND_BY_SLUG[slug] = BRANDS[slug]; });

// ─── Firestore query ────────────────────────────────────────────────
async function getListingsByBrand(brandNames, limit) {
  // Шукаємо по title, бо brand-поле не завжди заповнене
  // Робимо окремі запити для кожного brandName і об'єднуємо
  const allListings = [];
  const seenIds = new Set();

  for (const brandName of brandNames) {
    try {
      // Спочатку пробуємо по полю brand
      const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`;
      const body = {
        structuredQuery: {
          from: [{ collectionId: 'listings' }],
          where: {
            compositeFilter: {
              op: 'AND',
              filters: [
                { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'active' } } },
                { fieldFilter: { field: { fieldPath: 'brand' }, op: 'EQUAL', value: { stringValue: brandName } } }
              ]
            }
          },
          limit: limit || 30
        }
      };
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) {
        const data = await res.json();
        data.filter(d => d.document).forEach(d => {
          const id = d.document.name.split('/').pop();
          if (!seenIds.has(id)) {
            seenIds.add(id);
            const f = d.document.fields || {};
            allListings.push({
              id,
              title: f.title?.stringValue || '',
              price: f.price?.integerValue || f.price?.doubleValue || '',
              city: f.city?.stringValue || '',
              condition: f.condition?.stringValue || '',
              img: f.img?.stringValue || '',
              brand: f.brand?.stringValue || '',
              model: f.model?.stringValue || '',
            });
          }
        });
      }
    } catch(e) { /* continue */ }
  }

  return allListings.slice(0, limit || 30);
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

// ─── Main handler ───────────────────────────────────────────────────
module.exports = async (req, res) => {
  const ua = req.headers['user-agent'] || '';
  const isBot = BOTS.test(ua);
  const slug = getParam(req, 'slug').replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
  const brand = BRAND_BY_SLUG[slug];

  // Невідомий бренд → 404
  if (!brand) {
    res.setHeader('Location', `${BASE}/catalog`);
    return res.status(302).end();
  }

  // Для звичайних користувачів — віддаємо SPA
  if (!isBot) {
    const fs = require('fs'); const path = require('path');
    try {
      const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      return res.status(200).send(html);
    } catch(e) {
      res.setHeader('Location', `${BASE}/brand/${slug}`);
      return res.status(302).end();
    }
  }

  // ─── SSR для ботів ───
  const listings = await getListingsByBrand(brand.firebaseNames, 30);

  const listingsHtml = listings.length ? listings.map(l => {
    const price = l.price ? Number(l.price).toLocaleString('uk') + ' грн' : '';
    return `<article itemscope itemtype="https://schema.org/Product" style="border:1px solid #eee;border-radius:12px;overflow:hidden">
      ${l.img ? `<a href="${BASE}/listing/${l.id}"><img itemprop="image" src="${escHtml(l.img)}" alt="${escHtml(l.title + (l.city ? ' купити в ' + l.city : ''))}" width="400" height="240" loading="lazy" style="width:100%;height:160px;object-fit:cover;display:block"></a>` : ''}
      <div style="padding:12px">
        <a href="${BASE}/listing/${l.id}" style="font-weight:700;color:#111;text-decoration:none;font-size:15px;display:block;margin-bottom:4px" itemprop="name">${escHtml(l.title)}</a>
        ${price ? `<div style="color:#1db954;font-weight:800;font-size:16px;margin-bottom:4px" itemprop="offers" itemscope itemtype="https://schema.org/Offer"><span itemprop="price" content="${l.price}">${price}</span><meta itemprop="priceCurrency" content="UAH"><meta itemprop="availability" content="https://schema.org/InStock"></div>` : ''}
        <div style="color:#888;font-size:13px">${escHtml(l.city)}${l.condition ? ' · ' + escHtml(l.condition) : ''}</div>
      </div>
    </article>`;
  }).join('\n') : '<p style="color:#888;grid-column:1/-1">Оголошень з цим брендом поки немає — <a href="' + BASE + '/add" style="color:#1db954">додайте першим!</a></p>';

  // ─── JSON-LD: ItemList ───
  const itemListSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": `${brand.name} — купити в Україні | RideGO`,
    "url": `${BASE}/brand/${slug}`,
    "numberOfItems": listings.length,
    "itemListElement": listings.slice(0, 20).map((l, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "url": `${BASE}/listing/${l.id}`,
      "name": l.title
    }))
  });

  // ─── JSON-LD: BreadcrumbList ───
  const breadcrumbSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "RideGO", "item": BASE },
      { "@type": "ListItem", "position": 2, "name": "Каталог", "item": `${BASE}/catalog` },
      { "@type": "ListItem", "position": 3, "name": brand.category, "item": `${BASE}/category/${brand.catSlug}` },
      { "@type": "ListItem", "position": 4, "name": brand.name, "item": `${BASE}/brand/${slug}` }
    ]
  });

  // ─── JSON-LD: FAQPage ───
  const faqSchema = brand.faqItems ? JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": brand.faqItems.map(faq => ({
      "@type": "Question",
      "name": faq.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.a
      }
    }))
  }) : '';

  // ─── JSON-LD: Organization (brand) ───
  const brandSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Brand",
    "name": brand.name,
    "url": `${BASE}/brand/${slug}`,
    "description": brand.metaDesc
  });

  // ─── FAQ HTML ───
  const faqHtml = brand.faqItems ? `
    <section style="margin-bottom:32px">
      <h2 style="font-size:19px;font-weight:800;margin-bottom:16px;color:#111">Часті питання про ${escHtml(brand.name)}</h2>
      ${brand.faqItems.map(faq => `
        <details style="margin-bottom:10px;border:1px solid #eee;border-radius:10px;overflow:hidden">
          <summary style="padding:14px 18px;font-weight:700;font-size:15px;cursor:pointer;background:#fafafa;color:#111">${escHtml(faq.q)}</summary>
          <div style="padding:14px 18px;font-size:14px;color:#555;line-height:1.7">${escHtml(faq.a)}</div>
        </details>
      `).join('')}
    </section>` : '';

  // ─── Related searches HTML ───
  const relatedHtml = brand.relatedSearches ? `
    <section style="margin-bottom:32px">
      <h2 style="font-size:16px;font-weight:700;margin-bottom:12px;color:#111">Популярні запити</h2>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        ${brand.relatedSearches.map(q => `<span style="display:inline-block;padding:8px 14px;background:#f5f5f5;border-radius:20px;font-size:13px;color:#555">${escHtml(q)}</span>`).join('')}
      </div>
    </section>` : '';

  // ─── Фінальний HTML ───
  const html = `<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escHtml(brand.title)}</title>
<meta name="description" content="${escHtml(brand.metaDesc)}">
<meta name="keywords" content="купити ${escHtml(brand.name)}, ${escHtml(brand.name)} ціна, електросамокат ${escHtml(brand.name)}, ${brand.aliases.map(a => 'купити ' + a).join(', ')}, ${escHtml(brand.name)} Україна, ${escHtml(brand.name)} Київ, ${escHtml(brand.name)} б/в">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${BASE}/brand/${slug}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">

<meta property="og:type" content="website">
<meta property="og:title" content="${escHtml(brand.name)} — купити електросамокат в Україні | RideGO">
<meta property="og:description" content="${escHtml(brand.metaDesc)}">
<meta property="og:url" content="${BASE}/brand/${slug}">
<meta property="og:site_name" content="RideGO">
<meta property="og:image" content="${brand.ogImage || BASE + '/og-image.png'}">
<meta property="og:locale" content="uk_UA">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escHtml(brand.name)} — купити в Україні | RideGO">
<meta name="twitter:description" content="${escHtml(brand.metaDesc)}">
<meta name="twitter:image" content="${brand.ogImage || BASE + '/og-image.png'}">

<link rel="alternate" hreflang="uk" href="${BASE}/brand/${slug}">
<link rel="alternate" hreflang="ru" href="${BASE}/brand/${slug}">
<link rel="alternate" hreflang="x-default" href="${BASE}/brand/${slug}">

<script type="application/ld+json">${breadcrumbSchema}</script>
<script type="application/ld+json">${itemListSchema}</script>
<script type="application/ld+json">${brandSchema}</script>
${faqSchema ? `<script type="application/ld+json">${faqSchema}</script>` : ''}

<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;max-width:980px;margin:0 auto;padding:20px;color:#222;background:#fff}
header{padding:16px 0;border-bottom:2px solid #1db954;margin-bottom:20px}
header a{font-size:26px;font-weight:800;color:#111;text-decoration:none}
header a span{color:#1db954}
.bc{font-size:13px;color:#888;margin-bottom:20px}
.bc a{color:#1db954;text-decoration:none}
.bc span{margin:0 5px;color:#ccc}
h1{font-size:clamp(22px,4vw,34px);font-weight:800;margin-bottom:8px;color:#111}
.subtitle{color:#666;margin-bottom:24px;font-size:15px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px;margin-bottom:32px}
footer{padding:20px 0;border-top:1px solid #eee;font-size:13px;color:#999;text-align:center;margin-top:32px}
footer a{color:#1db954;text-decoration:none;margin:0 8px}
details summary{list-style:none}
details summary::-webkit-details-marker{display:none}
details summary::before{content:'▸ ';color:#1db954}
details[open] summary::before{content:'▾ '}
</style>
</head>
<body>
<header>
  <a href="${BASE}">Ride<span>GO</span></a>
</header>

<nav class="bc" aria-label="Breadcrumb">
  <a href="${BASE}">RideGO</a><span>›</span>
  <a href="${BASE}/catalog">Каталог</a><span>›</span>
  <a href="${BASE}/category/${brand.catSlug}">${escHtml(brand.category)}</a><span>›</span>
  <span>${escHtml(brand.name)}</span>
</nav>

<h1>${escHtml(brand.icon)} ${escHtml(brand.h1)}</h1>
<p class="subtitle">Знайдено <strong>${listings.length}</strong> оголошень ${escHtml(brand.name)} на маркетплейсі RideGO</p>

${brand.introHtml || ''}

<section>
  <h2 style="font-size:17px;font-weight:700;margin-bottom:16px;color:#111">Оголошення ${escHtml(brand.name)} <span style="color:#888;font-weight:400;font-size:14px">(${listings.length})</span></h2>
  <div class="grid">${listingsHtml}</div>
</section>

${faqHtml}
${relatedHtml}

<section style="padding:28px;background:#f0fdf4;border-radius:16px;text-align:center;margin-bottom:32px">
  <h2 style="font-size:19px;font-weight:700;margin-bottom:8px">Продаєте ${escHtml(brand.name)}?</h2>
  <p style="color:#555;margin-bottom:16px">Розмістіть оголошення безкоштовно на RideGO — тисячі покупців шукають ${escHtml(brand.name)} щодня</p>
  <a href="${BASE}/add" style="display:inline-block;background:#1db954;color:#fff;padding:13px 28px;border-radius:10px;text-decoration:none;font-weight:700">Подати оголошення →</a>
</section>

<section style="margin-bottom:28px">
  <h2 style="font-size:16px;font-weight:700;margin-bottom:12px">Інші категорії</h2>
  <div>
    <a href="${BASE}/category/elektrosamokaty" style="display:inline-flex;align-items:center;gap:5px;padding:8px 14px;background:#f0fdf4;border-radius:8px;text-decoration:none;color:#166534;font-size:13px;font-weight:600;margin:3px">⚡ Усі електросамокати</a>
    <a href="${BASE}/category/elektrovelosypedy" style="display:inline-flex;align-items:center;gap:5px;padding:8px 14px;background:#f0fdf4;border-radius:8px;text-decoration:none;color:#166534;font-size:13px;font-weight:600;margin:3px">🚴 Електровелосипеди</a>
    <a href="${BASE}/category/elektroskutery" style="display:inline-flex;align-items:center;gap:5px;padding:8px 14px;background:#f0fdf4;border-radius:8px;text-decoration:none;color:#166534;font-size:13px;font-weight:600;margin:3px">🛵 Електроскутери</a>
    <a href="${BASE}/catalog" style="display:inline-flex;align-items:center;gap:5px;padding:8px 14px;background:#f0fdf4;border-radius:8px;text-decoration:none;color:#166534;font-size:13px;font-weight:600;margin:3px">📋 Весь каталог</a>
  </div>
</section>

<footer>
  <span>© 2024–2026 RideGO — маркетплейс електротранспорту України</span><br style="margin-bottom:8px">
  <a href="${BASE}">Головна</a>
  <a href="${BASE}/catalog">Каталог</a>
  <a href="${BASE}/category/elektrosamokaty">Електросамокати</a>
  <a href="${BASE}/news">Новини</a>
  <a href="${BASE}/faq">FAQ</a>
</footer>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
  res.status(200).send(html);
};
