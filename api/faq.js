// api/faq.js — SSR для сторінки FAQ
const BASE = 'https://www.ridego.com.ua';
const BOTS = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|linkedinbot|telegrambot|whatsapp|applebot|mj12bot|ahrefsbot|semrushbot|petalbot|bytespider|google-inspectiontool/i;

const FAQS = [
  {
    q: 'Як подати оголошення на RideGO?',
    a: 'Натисніть кнопку "Подати оголошення" або "+" внизу сторінки. Оберіть категорію (електросамокати, велосипеди, скутери), заповніть назву, опис, ціну, додайте фотографії та вкажіть місто. Перші 10 слотів для нових користувачів — безкоштовно.'
  },
  {
    q: 'Що таке слоти для оголошень?',
    a: '1 слот = право розмістити 1 оголошення на 30 днів. При реєстрації ви отримуєте 10 безкоштовних слотів. Після їх використання можна придбати додаткові або підвищити тариф.'
  },
  {
    q: 'Як зв'язатися з продавцем?',
    a: 'На сторінці оголошення натисніть "Написати" — відкриється вбудований чат. Також можна натиснути "Показати номер" щоб зателефонувати продавцю напряму.'
  },
  {
    q: 'Чи безпечно купувати через RideGO?',
    a: 'RideGO — платформа для розміщення оголошень між приватними особами та бізнесом. Рекомендуємо зустрічатися особисто, перевіряти товар до оплати та не робити передплату незнайомим людям.'
  },
  {
    q: 'Як перевірити справність електросамоката перед покупкою?',
    a: 'Перевірте заряд акумулятора, проїдьтеся на самокаті, протестуйте гальма та фари. Попросіть продавця показати пробіг та вік акумулятора. Ідеально — зустрічайтеся вдень і беріть із собою знайомого механіка.'
  },
  {
    q: 'Яка різниця між електросамокатом та електровелосипедом?',
    a: 'Електросамокат — стоячий транспорт без педалей, компактний та легкий (зазвичай 10-25 кг). Електровелосипед має педалі та асистент двигуна, підходить для довших поїздок та людей з фізичними навантаженнями.'
  },
  {
    q: 'Які документи потрібні для продажу?',
    a: 'Для приватних продажів документи на електросамокат в Україні не обов'язкові — він не підлягає реєстрації. Але можна зберегти чек або гарантійний талон як підтвердження покупки.'
  },
  {
    q: 'Як видалити або деактивувати оголошення?',
    a: 'Зайдіть у розділ "Мої оголошення" у своєму профілі та натисніть "Деактивувати" або "Видалити". Слот повернеться на ваш рахунок автоматично.'
  },
  {
    q: 'Яку максимальну швидкість дозволено для електросамокатів в Україні?',
    a: 'Згідно ПДД України, електросамокати до 25 км/год є засобами індивідуальної мобільності (ЗІМ) і можуть їздити тротуарами та велодоріжками. Самокати понад 25 км/год вважаються мопедами і потребують прав категорії AM.'
  },
  {
    q: 'Як написати в підтримку RideGO?',
    a: 'Напишіть нам у Telegram: @ridego_support або через форму зворотного зв'язку на сторінці "Контакти". Відповідаємо протягом робочого дня.'
  },
];

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
    res.setHeader('Location', BASE + '/faq');
    return res.status(302).end();
  }

  const faqItems = FAQS.map((f, i) =>
    '<div style="border:1px solid #eee;border-radius:12px;padding:20px 24px;margin-bottom:12px">' +
    '<h2 style="font-size:17px;font-weight:700;color:#111;margin-bottom:10px">' + (i + 1) + '. ' + f.q + '</h2>' +
    '<p style="color:#444;line-height:1.7;font-size:15px">' + f.a + '</p>' +
    '</div>'
  ).join('');

  const faqSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": FAQS.map(f => ({
      "@type": "Question",
      "name": f.q,
      "acceptedAnswer": { "@type": "Answer", "text": f.a }
    }))
  });

  const breadcrumb = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "RideGO", "item": BASE },
      { "@type": "ListItem", "position": 2, "name": "Часті питання", "item": BASE + "/faq" }
    ]
  });

  const html = '<!DOCTYPE html><html lang="uk"><head>' +
    '<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<title>Часті запитання про купівлю електросамоката в Україні | RideGO FAQ</title>' +
    '<meta name="description" content="Відповіді на часті запитання: як купити електросамокат, що перевірити перед покупкою, як подати оголошення на RideGO, які документи потрібні та інше.">' +
    '<meta name="keywords" content="FAQ, питання, електросамокат, купити, оголошення, RideGO, Україна">' +
    '<meta name="robots" content="index, follow">' +
    '<link rel="canonical" href="' + BASE + '/faq">' +
    '<link rel="icon" type="image/svg+xml" href="/favicon.svg">' +
    '<meta property="og:type" content="website">' +
    '<meta property="og:title" content="Часті запитання | RideGO">' +
    '<meta property="og:description" content="Відповіді на часті запитання про купівлю електросамоката та використання RideGO.">' +
    '<meta property="og:url" content="' + BASE + '/faq">' +
    '<meta property="og:image" content="' + BASE + '/og-image.png">' +
    '<meta property="og:locale" content="uk_UA"><meta property="og:site_name" content="RideGO">' +
    '<meta name="twitter:card" content="summary_large_image">' +
    '<meta name="twitter:title" content="Часті запитання | RideGO">' +
    '<meta name="twitter:description" content="Відповіді на часті запитання про купівлю електросамоката в Україні.">' +
    '<script type="application/ld+json">' + faqSchema + '<\/script>' +
    '<script type="application/ld+json">' + breadcrumb + '<\/script>' +
    '<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:"Segoe UI",Arial,sans-serif;max-width:820px;margin:0 auto;padding:20px;color:#222;background:#fff}header{padding:16px 0;border-bottom:2px solid #1db954;margin-bottom:24px}header a{font-size:26px;font-weight:800;color:#111;text-decoration:none}header a span{color:#1db954}.bc{font-size:13px;color:#888;margin-bottom:20px}.bc a{color:#1db954;text-decoration:none}.bc span{margin:0 5px;color:#ccc}h1{font-size:clamp(22px,4vw,30px);font-weight:800;margin-bottom:8px;color:#111}footer{padding:20px 0;border-top:1px solid #eee;font-size:13px;color:#999;text-align:center;margin-top:32px}footer a{color:#1db954;text-decoration:none;margin:0 8px}<\/style>' +
    '</head><body>' +
    '<header><a href="' + BASE + '">Ride<span>GO</span></a></header>' +
    '<nav class="bc"><a href="' + BASE + '">RideGO</a><span>&#8250;</span><span>Часті питання</span></nav>' +
    '<h1>Часті питання (FAQ)</h1>' +
    '<p style="color:#666;margin-bottom:24px">Відповіді на найпопулярніші запитання про купівлю електротранспорту та використання платформи RideGO</p>' +
    faqItems +
    '<div style="margin-top:32px;padding:24px;background:#f0fdf4;border-radius:12px;text-align:center">' +
    '<p style="font-weight:700;font-size:16px;margin-bottom:8px">Не знайшли відповіді?</p>' +
    '<p style="color:#555;margin-bottom:16px">Напишіть нам у Telegram або подайте оголошення вже зараз</p>' +
    '<a href="https://t.me/ridego_support" style="display:inline-block;background:#1db954;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:700;margin-right:8px">Telegram підтримка</a>' +
    '<a href="' + BASE + '/catalog" style="display:inline-block;background:#fff;color:#1db954;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:700;border:2px solid #1db954">Каталог</a>' +
    '</div>' +
    '<footer><span>&#169; 2024&#8211;2026 RideGO</span> <a href="' + BASE + '">Головна</a> <a href="' + BASE + '/catalog">Каталог</a> <a href="' + BASE + '/news">Новини</a> <a href="' + BASE + '/faq">FAQ</a></footer>' +
    '</body></html>';

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');
  res.status(200).send(html);
};
