const BASE = 'https://www.ridego.com.ua';
const PROJECT = 'ridego-6f981';
const API_KEY = process.env.FIREBASE_API_KEY;

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
  { loc: '/brand/kukirin',              priority: '0.9', changefreq: 'daily' },
  { loc: '/kukirin-g2',                 priority: '0.9', changefreq: 'daily' },
  { loc: '/kukirin-g2-pro',             priority: '0.9', changefreq: 'daily' },
  { loc: '/kukirin-g2-max',             priority: '0.9', changefreq: 'daily' },
  { loc: '/kukirin-g3',                 priority: '0.9', changefreq: 'daily' },
  { loc: '/kukirin-g3-pro',             priority: '0.8', changefreq: 'daily' },
  { loc: '/kukirin-g4',                 priority: '0.9', changefreq: 'daily' },
  { loc: '/kukirin-g4-max',             priority: '0.8', changefreq: 'daily' },
  { loc: '/kukirin-m4-pro',             priority: '0.9', changefreq: 'daily' },
  { loc: '/kukirin-m5-pro',             priority: '0.8', changefreq: 'daily' },
  { loc: '/kukirin-s1-max',             priority: '0.8', changefreq: 'daily' },
  { loc: '/kukirin-t3',                 priority: '0.8', changefreq: 'daily' },
  { loc: '/kukirin-c1-pro',             priority: '0.8', changefreq: 'daily' },
  { loc: '/brand/dualtron',             priority: '0.9', changefreq: 'daily' },
  { loc: '/dualtron-thunder-2',         priority: '0.9', changefreq: 'daily' },
  { loc: '/dualtron-victor',            priority: '0.9', changefreq: 'daily' },
  { loc: '/dualtron-storm',             priority: '0.8', changefreq: 'daily' },
  { loc: '/dualtron-spider-2',          priority: '0.8', changefreq: 'daily' },
  { loc: '/dualtron-eagle-pro',         priority: '0.8', changefreq: 'daily' },
  { loc: '/brand/xiaomi',               priority: '0.9', changefreq: 'daily' },
  { loc: '/xiaomi-scooter-4',           priority: '0.9', changefreq: 'daily' },
  { loc: '/xiaomi-scooter-4-pro',       priority: '0.9', changefreq: 'daily' },
  { loc: '/xiaomi-scooter-4-ultra',     priority: '0.8', changefreq: 'daily' },
  { loc: '/xiaomi-scooter-5',           priority: '0.9', changefreq: 'daily' },
  { loc: '/xiaomi-scooter-5-pro',       priority: '0.8', changefreq: 'daily' },
  { loc: '/brand/ninebot',              priority: '0.9', changefreq: 'daily' },
  { loc: '/ninebot-max-g30',            priority: '0.9', changefreq: 'daily' },
  { loc: '/ninebot-f2-pro',             priority: '0.8', changefreq: 'daily' },
  { loc: '/ninebot-gt3',                priority: '0.8', changefreq: 'daily' },
  { loc: '/brand/kaabo',                priority: '0.9', changefreq: 'daily' },
  { loc: '/kaabo-mantis-10-pro',        priority: '0.9', changefreq: 'daily' },
  { loc: '/kaabo-wolf-warrior-11',      priority: '0.8', changefreq: 'daily' },
  { loc: '/kaabo-wolf-king-gt-pro',     priority: '0.8', changefreq: 'daily' },
  { loc: '/brand/vsett',                priority: '0.9', changefreq: 'daily' },
  { loc: '/vsett-10-plus',              priority: '0.9', changefreq: 'daily' },
  { loc: '/vsett-11-plus',              priority: '0.8', changefreq: 'daily' },
  { loc: '/vsett-9-plus',               priority: '0.8', changefreq: 'daily' },
  { loc: '/prodaty-elektrosamokat',      priority: '0.9', changefreq: 'daily' },
  { loc: '/elektrosamokat-z-sydinniam',  priority: '0.8', changefreq: 'daily' },
  { loc: '/elektrosamokat-dlya-mista',   priority: '0.8', changefreq: 'daily' },
  { loc: '/elektrosamokat-dlia-bezdorizhzhia', priority: '0.8', changefreq: 'daily' },
  { loc: '/elektrosamokat-biudzhetnyj',  priority: '0.8', changefreq: 'daily' },
  { loc: '/elektrosamokat-kyiv',         priority: '0.8', changefreq: 'daily' },
  { loc: '/elektrosamokat-kharkiv',      priority: '0.8', changefreq: 'daily' },
  { loc: '/elektrosamokat-odesa',        priority: '0.8', changefreq: 'daily' },
  { loc: '/elektrosamokat-dnipro',       priority: '0.8', changefreq: 'daily' },
  { loc: '/elektrosamokat-lviv',         priority: '0.8', changefreq: 'daily' },
  { loc: '/kukirin-vs-ninebot',          priority: '0.8', changefreq: 'monthly' },
  { loc: '/kukirin-vs-xiaomi',           priority: '0.8', changefreq: 'monthly' },
  { loc: '/dualtron-vs-kaabo',           priority: '0.8', changefreq: 'monthly' },
  { loc: '/brand/ausom',               priority: '0.9', changefreq: 'daily' },
  { loc: '/ausom-l1',                   priority: '0.8', changefreq: 'daily' },
  { loc: '/ausom-l2',                   priority: '0.8', changefreq: 'daily' },
  { loc: '/ausom-l2-max',               priority: '0.8', changefreq: 'daily' },
  { loc: '/ausom-dt2-pro',              priority: '0.8', changefreq: 'daily' },
  { loc: '/kupyty-elektrovelo',         priority: '0.9', changefreq: 'daily' },
  { loc: '/kupyty-elektroskuter',       priority: '0.9', changefreq: 'daily' },
  { loc: '/kupyty-elektromotocykl',     priority: '0.8', changefreq: 'daily' },
  { loc: '/elektrosamokat-vzhyvanyy',   priority: '0.8', changefreq: 'daily' },
  { loc: '/prodaty-elektrovelo',        priority: '0.8', changefreq: 'daily' },
  { loc: '/prodaty-elektroskuter',      priority: '0.8', changefreq: 'daily' },
  { loc: '/ausom-elektrosamokaty',      priority: '0.8', changefreq: 'daily' },
  { loc: '/elektrovelosyped-kyiv',      priority: '0.8', changefreq: 'daily' },
  { loc: '/kukirin-g4-kupit',           priority: '0.9', changefreq: 'daily' },
];

async function query(collection, filters, selectFields, limitN) {
  const key = API_KEY ? `?key=${API_KEY}` : '';
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery${key}`;

  const where = filters.length === 1
    ? { fieldFilter: filters[0] }
    : { compositeFilter: { op: 'AND', filters: filters.map(f => ({ fieldFilter: f })) } };

  // БЕЗ orderBy — це головна причина 429 на анонімних запитах
  const body = {
    structuredQuery: {
      from: [{ collectionId: collection }],
      where,
      select: { fields: selectFields.map(f => ({ fieldPath: f })) },
      limit: limitN || 5000
    }
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const json = await res.json();
    const docsCount = Array.isArray(json) ? json.filter(i => i.document).length : 0;
    console.log(`[sitemap] ${collection}: http=${res.status}, docs=${docsCount}`);

    if (!res.ok) {
      console.error(`[sitemap] ${collection} ERROR:`, JSON.stringify(json).slice(0, 300));
      return [];
    }

    return json;
  } catch(e) {
    console.error(`[sitemap] ${collection} FETCH ERROR:`, e.message);
    return [];
  }
}

function getDate(fields, key) {
  return fields[key]?.timestampValue ? fields[key].timestampValue.slice(0,10) : '';
}

module.exports = async (req, res) => {
  const urls = [...STATIC_PAGES];

  try {
    // Всі запити паралельно
    const [listings, news, services, sellers] = await Promise.all([
      query(
        'listings',
        [{ field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'active' } }],
        ['createdAt', 'updatedAt', 'promo', 'status'],
        5000
      ),
      query(
        'news',
        [{ field: { fieldPath: 'published' }, op: 'EQUAL', value: { booleanValue: true } }],
        ['createdAt', 'updatedAt'],
        1000
      ),
      query(
        'services',
        [{ field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'active' } }],
        ['createdAt', 'updatedAt'],
        1000
      ),
      query(
        'users',
        [{ field: { fieldPath: 'type' }, op: 'EQUAL', value: { stringValue: 'business' } }],
        ['createdAt', 'updatedAt'],
        2000
      ),
    ]);

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

    news.forEach(item => {
      if (!item.document) return;
      const f = item.document.fields || {};
      const id = item.document.name.split('/').pop();
      const date = getDate(f, 'updatedAt') || getDate(f, 'createdAt');
      urls.push({ loc: `/news/${id}`, priority: '0.8', changefreq: 'monthly', lastmod: date });
    });

    services.forEach(item => {
      if (!item.document) return;
      const f = item.document.fields || {};
      const id = item.document.name.split('/').pop();
      const date = getDate(f, 'updatedAt') || getDate(f, 'createdAt');
      urls.push({ loc: `/service/${id}`, priority: '0.6', changefreq: 'monthly', lastmod: date });
    });

    sellers.forEach(item => {
      if (!item.document) return;
      const f = item.document.fields || {};
      const uid = item.document.name.split('/').pop();
      const date = getDate(f, 'updatedAt') || getDate(f, 'createdAt');
      urls.push({ loc: `/seller/${uid}`, priority: '0.6', changefreq: 'weekly', lastmod: date });
    });

    console.log(`[sitemap] TOTAL URLs: ${urls.length}`);

  } catch(e) {
    console.error('[sitemap] GENERAL ERROR:', e.message);
  }

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
