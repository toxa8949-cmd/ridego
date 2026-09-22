const PROJECT = 'ridego-6f981';
const { renderShell, BASE } = require('./_shell');

// Список ботів більше не потрібен: сторінка однакова для всіх.

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

const esc = escHtml;

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
  const id = getId(req).replace(/[^a-zA-Z0-9_-]/g, '');

  const listing = id ? await getListingFromFirestore(id) : null;

  // Оголошення немає — чесний 404 з тим самим каркасом.
  // SPA домалює свою сторінку «не знайдено».
  if (!listing) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, must-revalidate');
    res.setHeader('X-Robots-Tag', 'noindex, follow');
    return res.status(404).send(renderShell({
      title: 'Оголошення не знайдено — RideGO',
      desc: 'Це оголошення більше недоступне. Перегляньте актуальні пропозиції в каталозі RideGO.',
      canonical: `${BASE}/listing/${id}`,
    }));
  }

  const priceFormatted = listing.price ? Number(listing.price).toLocaleString('uk') : '';
  const catSlug = CAT_SLUGS[listing.cat] || 'catalog';

  const titleStr = listing.title
    ? [listing.title, listing.city ? `купити в ${listing.city}` : 'купити', priceFormatted ? `${priceFormatted} грн` : '', 'RideGO'].filter(Boolean).join(' — ')
    : 'RideGO — Маркетплейс електротранспорту';

  const rawDesc = listing.desc ? listing.desc.replace(/\s+/g, ' ').trim() : '';
  const autoParts = [listing.condition, listing.cat, listing.city ? `м.${listing.city}` : '', priceFormatted ? `${priceFormatted}грн` : '', listing.year ? `${listing.year}р.` : ''].filter(Boolean);
  const descStr = rawDesc ? (rawDesc.length > 155 ? rawDesc.slice(0, 152) + '...' : rawDesc) : (autoParts.join(' · ') || listing.title);

  const productSchema = {
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
      "priceValidUntil": new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
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
        "shippingDestination": { "@type": "DefinedRegion", "addressCountry": "UA" },
        "deliveryTime": {
          "@type": "ShippingDeliveryTime",
          "handlingTime": { "@type": "QuantitativeValue", "minValue": 0, "maxValue": 3, "unitCode": "DAY" },
          "transitTime": { "@type": "QuantitativeValue", "minValue": 1, "maxValue": 7, "unitCode": "DAY" }
        }
      }
    }
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "RideGO", "item": BASE },
      { "@type": "ListItem", "position": 2, "name": "Каталог", "item": `${BASE}/catalog` },
      ...(listing.cat ? [{ "@type": "ListItem", "position": 3, "name": listing.cat, "item": `${BASE}/category/${catSlug}` }] : []),
      { "@type": "ListItem", "position": listing.cat ? 4 : 3, "name": listing.title, "item": `${BASE}/listing/${id}` }
    ]
  };

  // Контент першого екрана. Усі селектори з префіксом #ssr-prerender,
  // щоб ці стилі не перетиналися з css/main.css.
  const bodyHtml = `
<style>
#ssr-prerender{max-width:820px;margin:0 auto;padding:20px;font-family:'Inter','Segoe UI',Arial,sans-serif;color:#222}
#ssr-prerender .bc{font-size:13px;color:#888;margin-bottom:20px}
#ssr-prerender .bc a{color:#1db954;text-decoration:none}
#ssr-prerender .bc span{margin:0 5px;color:#ccc}
#ssr-prerender h1{font-size:clamp(20px,4vw,28px);font-weight:800;margin:0 0 8px;color:#111}
#ssr-prerender .price{font-size:32px;font-weight:800;color:#1db954;margin-bottom:16px}
#ssr-prerender .img-wrap img{width:100%;max-height:480px;object-fit:cover;border-radius:12px;display:block;margin-bottom:20px}
#ssr-prerender .specs{border-collapse:collapse;width:100%;margin-bottom:20px;font-size:15px}
#ssr-prerender .specs td{padding:10px 12px;border-bottom:1px solid #f0f0f0}
#ssr-prerender .specs td:first-child{color:#888;width:130px}
#ssr-prerender .specs td:last-child{font-weight:600}
#ssr-prerender .desc{font-size:15px;color:#444;line-height:1.8;margin-bottom:24px;background:#f9f9f9;border-radius:10px;padding:16px}
#ssr-prerender .related a{display:inline-block;padding:8px 16px;background:#f0fdf4;border-radius:8px;text-decoration:none;color:#166534;font-size:13px;font-weight:600;margin:4px}
</style>
<nav class="bc">
  <a href="${BASE}">RideGO</a><span>›</span>
  <a href="${BASE}/catalog">Каталог</a><span>›</span>
  ${listing.cat ? `<a href="${BASE}/category/${catSlug}">${esc(listing.cat)}</a><span>›</span>` : ''}
  <span>${esc(listing.title.slice(0, 50))}</span>
</nav>
<h1>${esc(listing.title)}${listing.city ? ` у ${esc(listing.city)}` : ''}</h1>
<div class="price">${priceFormatted ? priceFormatted + ' грн' : 'Ціна договірна'}</div>
${listing.img ? `<div class="img-wrap"><img src="${esc(listing.img)}" alt="${esc(listing.title)}" width="820" height="480" loading="eager"></div>` : ''}
<table class="specs">
  ${listing.city ? `<tr><td>Місто</td><td>${esc(listing.city)}</td></tr>` : ''}
  ${listing.cat ? `<tr><td>Категорія</td><td><a href="${BASE}/category/${catSlug}" style="color:#1db954;text-decoration:none">${esc(listing.cat)}</a></td></tr>` : ''}
  ${listing.brand ? `<tr><td>Бренд</td><td>${esc(listing.brand)}</td></tr>` : ''}
  ${listing.model ? `<tr><td>Модель</td><td>${esc(listing.model)}</td></tr>` : ''}
  ${listing.condition ? `<tr><td>Стан</td><td>${esc(listing.condition)}</td></tr>` : ''}
  ${listing.year ? `<tr><td>Рік</td><td>${esc(String(listing.year))}</td></tr>` : ''}
  ${listing.battery ? `<tr><td>Акумулятор</td><td>${esc(listing.battery)}</td></tr>` : ''}
  ${listing.speed ? `<tr><td>Швидкість</td><td>${esc(listing.speed)}</td></tr>` : ''}
  ${listing.range ? `<tr><td>Запас ходу</td><td>${esc(listing.range)}</td></tr>` : ''}
  ${listing.sellerName ? `<tr><td>Продавець</td><td>${esc(listing.sellerName)}</td></tr>` : ''}
</table>
${listing.desc ? `<div class="desc">${esc(listing.desc)}</div>` : ''}
<div class="related">
  <strong style="display:block;margin-bottom:8px;font-size:15px">Більше оголошень:</strong>
  ${listing.cat ? `<a href="${BASE}/category/${catSlug}">Всі ${esc(listing.cat)}</a>` : ''}
  <a href="${BASE}/catalog">Весь каталог</a>
</div>`;

  const html = renderShell({
    title: titleStr,
    desc: descStr,
    canonical: `${BASE}/listing/${id}`,
    ogImage: listing.img || `${BASE}/og-image.png`,
    ogType: 'product',
    jsonLd: [productSchema, breadcrumbSchema],
    bodyHtml
  });

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(html);
};
