// api/notfound.js — віддає SPA, але зі статусом 404.
//
// Проблема, яку це лагодить:
//   У vercel.json останнім правилом стоїть catch-all "/:path*" → "/index".
//   Через це БУДЬ-ЯКА неіснуюча адреса віддавала HTTP 200 і заголовок
//   головної сторінки. Наприклад /this-page-does-not-exist-12345 повертав
//   200 OK з <title>RideGO — Маркетплейс електротранспорту України</title>.
//
//   Google називає це soft 404: пошуковик бачить успішну відповідь,
//   індексує сміттєву адресу як дубль головної, і краулінговий бюджет
//   витрачається на неіснуючі сторінки замість реальних оголошень.
//
// Рішення: той самий index.html, але зі статусом 404. Людина бачить
// звичайну сторінку «нічого не знайдено», яку малює клієнтський роутер
// (_parsePath повертає { page: '404' }), а робот бачить чесний 404.

const fs   = require('fs');
const path = require('path');

module.exports = (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Не кешуємо: сторінка може стати валідною (наприклад, з'явиться
  // оголошення з таким id), і застряглий у кеші 404 це приховає.
  res.setHeader('Cache-Control', 'no-store, must-revalidate');
  res.setHeader('X-Robots-Tag', 'noindex, follow');

  try {
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    return res.status(404).send(html);
  } catch (e) {
    return res.status(404).send(
      '<!DOCTYPE html><html lang="uk"><head><meta charset="UTF-8">' +
      '<title>Сторінку не знайдено — RideGO</title>' +
      '<meta name="robots" content="noindex, follow"></head>' +
      '<body style="font-family:system-ui,sans-serif;text-align:center;padding:60px 20px">' +
      '<h1>404 — сторінку не знайдено</h1>' +
      '<p><a href="https://www.ridego.com.ua/" style="color:#1db954">На головну</a> · ' +
      '<a href="https://www.ridego.com.ua/catalog" style="color:#1db954">Каталог</a></p>' +
      '</body></html>'
    );
  }
};
