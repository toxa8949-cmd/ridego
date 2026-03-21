const BASE = 'https://ridego-sigma.vercel.app';
const PROJECT = 'ridego-6f981';

const STATIC_PAGES = [
  { loc: '/',                           priority: '1.0', changefreq: 'daily' },
  { loc: '/catalog',                    priority: '0.9', changefreq: 'hourly' },
  { loc: '/services',                   priority: '0.7', changefreq: 'weekly' },
  { loc: '/news',                       priority: '0.8', changefreq: 'daily' },
  { loc: '/category/elektrosamokaty',   priority: '0.8', changefreq: 'daily' },
  { loc: '/category/velosypedy',        priority: '0.8', changefreq: 'daily' },
  { loc: '/category/elektrovelosypedy', priority: '0.8', changefreq: 'daily' },
  { loc: '/category/elektroskutery',    priority: '0.8', changefreq: 'daily' },
  { loc: '/category/elektromotocykly',  priority: '0.7', changefreq: 'daily' },
];

async function queryFirestore(collection, fieldPath, op, value, valueType) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`;
  const body = {
    structuredQuery: {
      from: [{ collectionId: collection }],
      where: {
        fieldFilter: {
          field: { fieldPath },
          op,
          value: { [valueType]: value }
        }
      },
      select: { fields: [{ fieldPath: 'createdAt' }, { fieldPath: 'promo' }] },
      limit: 5000
    }
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}

module.exports = async (req, res) => {
  const urls = [...STATIC_PAGES];

  try {
    // Оголошення
    const listings = await queryFirestore('listings', 'status', 'NOT_EQUAL', 'deleted', 'stringValue');
    if (Array.isArray(listings)) {
      listings.forEach(item => {
        if (!item.document) return;
        const id = item.document.name.split('/').pop();
        const f = item.document.fields || {};
        const date = f.createdAt && f.createdAt.timestampValue ? f.createdAt.timestampValue.slice(0,10) : '';
        const promo = f.promo && f.promo.stringValue || '';
        urls.push({ loc: `/listing/${id}`, priority: promo === 'top' ? '0.9' : '0.7', changefreq: 'weekly', lastmod: date });
      });
    }

    // Новини
    const news = await queryFirestore('news', 'published', 'EQUAL', true, 'booleanValue');
    if (Array.isArray(news)) {
      news.forEach(item => {
        if (!item.document) return;
        const id = item.document.name.split('/').pop();
        const f = item.document.fields || {};
        const date = f.createdAt && f.createdAt.timestampValue ? f.createdAt.timestampValue.slice(0,10) : '';
        urls.push({ loc: `/news/${id}`, priority: '0.8', changefreq: 'monthly', lastmod: date });
      });
    }
  } catch (e) {
    console.error('Sitemap:', e.message);
  }

  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n\n'
    + urls.map(u => `  <url>\n    <loc>${BASE}${u.loc}</loc>${u.lastmod ? '\n    <lastmod>' + u.lastmod + '</lastmod>' : ''}\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`).join('\n\n')
    + '\n\n</urlset>';

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=600');
  res.status(200).send(xml);
};
