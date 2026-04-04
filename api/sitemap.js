const BASE = 'https://ridego.com.ua';
const PROJECT = 'ridego-6f981';

const STATIC_PAGES = [
  { loc: '/',                           priority: '1.0', changefreq: 'daily' },
  { loc: '/catalog',                    priority: '0.9', changefreq: 'hourly' },
  { loc: '/services',                   priority: '0.7', changefreq: 'weekly' },
  { loc: '/news',                       priority: '0.8', changefreq: 'daily' },
  { loc: '/faq',                        priority: '0.6', changefreq: 'monthly' },
  { loc: '/category/elektrosamokaty',   priority: '0.8', changefreq: 'daily' },
  { loc: '/category/velosypedy',        priority: '0.8', changefreq: 'daily' },
  { loc: '/category/elektrovelosypedy', priority: '0.8', changefreq: 'daily' },
  { loc: '/category/elektroskutery',    priority: '0.8', changefreq: 'daily' },
  { loc: '/category/elektromotocykly',  priority: '0.7', changefreq: 'daily' },
];

async function query(collection, filters, selectFields, limitN) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`;
  const where = filters.length === 1
    ? { fieldFilter: filters[0] }
    : { compositeFilter: { op: 'AND', filters: filters.map(f => ({ fieldFilter: f })) } };

  const body = {
    structuredQuery: {
      from: [{ collectionId: collection }],
      where,
      select: { fields: selectFields.map(f => ({ fieldPath: f })) },
      orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
      limit: limitN || 5000
    }
  };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) return [];
    return res.json();
  } catch(e) {
    console.error('Sitemap query error:', e.message);
    return [];
  }
}

function getDate(fields, key) {
  return fields[key]?.timestampValue ? fields[key].timestampValue.slice(0,10) : '';
}

module.exports = async (req, res) => {
  const urls = [...STATIC_PAGES];

  try {
    // ── Оголошення (тільки active) ─────────────────────────
    const listings = await query(
      'listings',
      [{ field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'active' } }],
      ['createdAt', 'updatedAt', 'promo', 'status'],
      5000
    );
    listings.forEach(item => {
      if (!item.document) return;
      const f = item.document.fields || {};
      const id = item.document.name.split('/').pop();
      const date = getDate(f, 'updatedAt') || getDate(f, 'createdAt');
      const promo = f.promo?.stringValue || '';
      urls.push({
        loc: `/listing/${id}`,
        priority: promo === 'top' ? '0.9' : '0.7',
        changefreq: 'weekly',
        lastmod: date
      });
    });

    // ── Новини ─────────────────────────────────────────────
    const news = await query(
      'news',
      [{ field: { fieldPath: 'published' }, op: 'EQUAL', value: { booleanValue: true } }],
      ['createdAt', 'updatedAt'],
      1000
    );
    news.forEach(item => {
      if (!item.document) return;
      const f = item.document.fields || {};
      const id = item.document.name.split('/').pop();
      const date = getDate(f, 'updatedAt') || getDate(f, 'createdAt');
      urls.push({ loc: `/news/${id}`, priority: '0.8', changefreq: 'monthly', lastmod: date });
    });

    // ── Сервісні центри ────────────────────────────────────
    const services = await query(
      'services',
      [{ field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'active' } }],
      ['createdAt', 'updatedAt'],
      1000
    );
    services.forEach(item => {
      if (!item.document) return;
      const f = item.document.fields || {};
      const id = item.document.name.split('/').pop();
      const date = getDate(f, 'updatedAt') || getDate(f, 'createdAt');
      urls.push({ loc: `/service/${id}`, priority: '0.6', changefreq: 'monthly', lastmod: date });
    });

    // ── Продавці / магазини (тип business або з оголошеннями) ──
    const sellers = await query(
      'users',
      [{ field: { fieldPath: 'type' }, op: 'EQUAL', value: { stringValue: 'business' } }],
      ['createdAt', 'updatedAt'],
      2000
    );
    sellers.forEach(item => {
      if (!item.document) return;
      const f = item.document.fields || {};
      const uid = item.document.name.split('/').pop();
      const date = getDate(f, 'updatedAt') || getDate(f, 'createdAt');
      urls.push({ loc: `/seller/${uid}`, priority: '0.6', changefreq: 'weekly', lastmod: date });
    });

  } catch(e) {
    console.error('Sitemap error:', e.message);
  }

  // ── Генерація XML ──────────────────────────────────────
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    '',
    ...urls.map(u => [
      '  <url>',
      `    <loc>${BASE}${u.loc}</loc>`,
      u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>` : '',
      `    <changefreq>${u.changefreq}</changefreq>`,
      `    <priority>${u.priority}</priority>`,
      '  </url>',
    ].filter(Boolean).join('\n')),
    '',
    '</urlset>'
  ].join('\n');

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=600');
  res.status(200).send(xml);
};
