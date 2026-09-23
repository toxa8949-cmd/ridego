// api/_shell.js — збирає ОДНУ сторінку для всіх відвідувачів.
//
// ЩО БУЛО НЕ ТАК
//   Кожна SSR-функція починалась приблизно так:
//       const isBot = BOTS.test(req.headers['user-agent']);
//       if (!isBot) return res.send(index.html);   // людина — порожній SPA
//       ...                                        // робот — багатий HTML
//
//   Тобто пошуковик і людина отримували РІЗНІ сторінки. Google називає це
//   cloaking і вважає порушенням Spam Policies — за нього прилітає ручний
//   санкційний захід із втратою органічного трафіку.
//
//   Побічний ефект був не менш неприємний: усі 78 посадкових сторінок для
//   живих людей мали однаковий <title> головної сторінки, а весь унікальний
//   текст (описи брендів, FAQ, характеристики моделей) бачив лише робот.
//
// ЯК ТЕПЕР
//   Один і той самий index.html віддається всім, байт у байт. У <head>
//   підставляються title/description/canonical/OG саме цієї сторінки, а
//   підготовлений текст вставляється в <div id="ssr-prerender"> одразу
//   після <body>.
//
//   Поки не завантажився JS, людина бачить цей текст — це швидший перший
//   екран, ніж порожній каркас. Щойно SPA стартує, _renderRoute() прибирає
//   блок із DOM і показує звичайний інтерфейс. Якщо JS не завантажився
//   взагалі — людина лишається з читабельним контентом замість головної.

const fs   = require('fs');
const path = require('path');

const BASE = 'https://www.ridego.com.ua';

let _cachedIndex = null;

function readIndex() {
  // Лямбда живе між запитами, тож читаємо файл з диска один раз.
  if (_cachedIndex) return _cachedIndex;
  _cachedIndex = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  return _cachedIndex;
}

function escHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// JSON-LD вставляється всередину <script>, тому послідовність "</script>"
// у даних (наприклад, у заголовку оголошення) розірвала б тег і зламала
// сторінку. Екрануємо і її, і символи, якими закривають теги.
function safeJsonLd(obj) {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}


// Українська множина: 1 пропозиція, 2 пропозиції, 5 пропозицій.
function plUk(n, forms) {
  var n10 = n % 10, n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return forms[0];
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return forms[1];
  return forms[2];
}

function replaceOne(html, re, replacement, label, warnings) {
  const matches = html.match(re);
  if (!matches) {
    // Не кидаємо помилку: краще віддати сторінку зі старим тегом,
    // ніж 500. Але лишаємо слід у логах Vercel.
    warnings.push(label);
    return html;
  }
  return html.replace(re, () => replacement);
}

/**
 * @param {object} o
 * @param {string} o.title        <title> і og:title
 * @param {string} o.desc         meta description і og:description
 * @param {string} o.canonical    повний URL сторінки
 * @param {string} [o.ogImage]    абсолютний URL картинки
 * @param {string} [o.ogType]     website | product | article
 * @param {object[]} [o.jsonLd]   схеми schema.org
 * @param {string} [o.bodyHtml]   готовий HTML для першого екрана
 */
function renderShell(o) {
  const warnings = [];
  let html = readIndex();

  const title = escHtml(o.title);
  const desc  = escHtml(o.desc);
  const url   = o.canonical || BASE + '/';
  const img   = o.ogImage || BASE + '/og-image.png';
  const type  = o.ogType || 'website';

  html = replaceOne(html, /<title>[\s\S]*?<\/title>/,
    `<title>${title}</title>`, 'title', warnings);

  html = replaceOne(html, /<meta name="description" content="[^"]*">/,
    `<meta name="description" content="${desc}">`, 'description', warnings);

  html = replaceOne(html, /<link rel="canonical"[^>]*>/,
    `<link rel="canonical" id="dynamic-canonical" href="${escHtml(url)}">`, 'canonical', warnings);

  // robots підставляємо лише якщо сторінка його задала —
  // інакше лишається index, follow з index.html.
  if (o.robots) {
    html = replaceOne(html, /<meta name="robots" content="[^"]*">/,
      `<meta name="robots" content="${escHtml(o.robots)}">`, 'robots', warnings);
  }

  html = replaceOne(html, /<meta property="og:type" content="[^"]*">/,
    `<meta property="og:type" content="${escHtml(type)}">`, 'og:type', warnings);
  html = replaceOne(html, /<meta property="og:title" content="[^"]*">/,
    `<meta property="og:title" content="${title}">`, 'og:title', warnings);
  html = replaceOne(html, /<meta property="og:description" content="[^"]*">/,
    `<meta property="og:description" content="${desc}">`, 'og:description', warnings);
  html = replaceOne(html, /<meta property="og:url" content="[^"]*">/,
    `<meta property="og:url" content="${escHtml(url)}">`, 'og:url', warnings);
  html = replaceOne(html, /<meta property="og:image" content="[^"]*">/,
    `<meta property="og:image" content="${escHtml(img)}">`, 'og:image', warnings);

  html = replaceOne(html, /<meta name="twitter:title" content="[^"]*">/,
    `<meta name="twitter:title" content="${title}">`, 'twitter:title', warnings);
  html = replaceOne(html, /<meta name="twitter:description" content="[^"]*">/,
    `<meta name="twitter:description" content="${desc}">`, 'twitter:description', warnings);
  html = replaceOne(html, /<meta name="twitter:image" content="[^"]*">/,
    `<meta name="twitter:image" content="${escHtml(img)}">`, 'twitter:image', warnings);

  // Схеми цієї сторінки — перед </head>, поруч із загальними WebSite/Organization.
  const ld = [];
  if (o.jsonLd && o.jsonLd.length) {
    o.jsonLd.filter(Boolean).forEach(s => ld.push(safeJsonLd(s)));
  }
  if (o.jsonLdRaw && o.jsonLdRaw.length) {
    // Уже готові JSON-рядки зі старих шаблонів. Екрануємо лише те,
    // що могло б розірвати <script>.
    o.jsonLdRaw.filter(Boolean).forEach(s => ld.push(
      String(s).replace(/<\/script/gi, '\\u003c/script').replace(/<!--/g, '\\u003c!--')
    ));
  }
  if (ld.length) {
    const blocks = ld.map(s => `<script type="application/ld+json">${s}</script>`).join('\n');
    html = html.replace('</head>', blocks + '\n</head>');
  }

  // Справжні цифри — одразу в розмітку, а не лише в JS-змінну.
  // У index.html вони зашиті як 70 / 20 / 30, і без виконання JS
  // (а так сторінку бачать частина краулерів і читалки) там лишались
  // би саме ці числа.
  if (o.stats && o.stats.listings) {
    const nL = o.stats.listings, nS = o.stats.sellers || 0, nC = o.stats.cities || 0;
    html = html.replace(
      /(<span id="hero-count-text">)[^<]*(<\/span>)/,
      `$1Більше ${nL} ${plUk(nL, ['пропозиція', 'пропозиції', 'пропозицій'])}$2`);
    html = html.replace(/(<span class="stat-num" id="stat-listings">)[^<]*(<)/, `$1${nL}$2`);
    html = html.replace(/(<span class="stat-num" id="stat-sellers">)[^<]*(<)/,  `$1${nS}$2`);
    html = html.replace(/(<span class="stat-num" id="stat-cities">)[^<]*(<)/,   `$1${nC}$2`);
  }

  // Нові оголошення головної — одразу в сітку замість скелетонів.
  // Це і перший екран без очікування JS, і посилання для краулерів.
  // Коли SPA завантажить дані, renderHomeListings() замінить їх
  // звичайними картками.
  if (o.homeListings && o.homeListings.length) {
    const cards = o.homeListings.slice(0, 6).map(l => {
      const img = /^https:\/\/res\.cloudinary\.com\//.test(l.img || '')
        ? l.img.replace('/upload/', '/upload/w_400,q_75,f_auto,c_fill/') : (l.img || '');
      const price = l.price ? Number(l.price).toLocaleString('uk-UA') + ' грн' : '';
      return '<a class="listing-card" href="/listing/' + encodeURIComponent(l.id) + '" style="text-decoration:none;color:inherit">' +
        '<div style="position:relative;flex-shrink:0">' +
          (img ? '<div class="listing-img-wrap"><img class="listing-img" src="' + escHtml(img) + '" alt="' + escHtml(l.title) + '" width="400" height="260" loading="lazy" decoding="async"></div>'
               : '<div class="listing-img-placeholder">📦</div>') +
        '</div>' +
        '<div class="listing-body">' +
          '<div class="listing-title">' + escHtml(l.title) + '</div>' +
          '<div class="listing-price">' + escHtml(price) + '</div>' +
          '<div class="listing-footer"><span class="loc">' + escHtml(l.city || '') + '</span></div>' +
        '</div></a>';
    }).join('');
    const re = /(<div class="listing-grid" id="home-listings">)[\s\S]*?(<\/div>\s*<\/div>\s*<!-- ═══ НОВИНИ)/;
    if (re.test(html)) html = html.replace(re, (m, a, b) => a + cards + b);
    else warnings.push('home-listings');
  }

  // Позначка для SPA: цю сторінку вже наповнив сервер, тож не треба
  // перезатирати добрий <title> загальною заглушкою, поки не приїхали дані.
  let boot = '<script>window.__SSR_SEO__=true;';

  // Реальна статистика майданчика, порахована на сервері по всій колекції.
  // Клієнт вантажить лише перші 50 оголошень, тому його власний підрахунок
  // завжди занижений — на головній було «Більше 70» замість фактичної цифри.
  if (o.stats && o.stats.listings) {
    boot += 'window.__RIDEGO_STATS__=' + safeJsonLd(o.stats) + ';';
  }
  boot += '</script>';
  html = html.replace('<body>', '<body>\n' + boot);

  // Контент першого екрана.
  if (o.bodyHtml) {
    // #page-home стартує з класом active, тобто до запуску JS видно головну.
    // Саме через це /kukirin-g4 показував живим людям головну сторінку.
    // Прибираємо active — замість неї покажемо контент цієї сторінки.
    html = html.replace('<div id="page-home" class="page active">',
                        '<div id="page-home" class="page">');

    const block =
      '<div id="ssr-prerender">' + o.bodyHtml + '</div>';
    html = html.replace('<body>', '<body>\n' + block);
  }

  if (warnings.length) {
    console.warn('[_shell] не знайдено теги в index.html:', warnings.join(', '));
  }
  return html;
}

// ── Перенесення стилів зі старих SSR-шаблонів ────────────────
// Старі «ботівські» сторінки мали власний <style> із правилами на кшталт
// body{...}, h1{...}, header{...}. Якщо вставити їх як є, вони переб'ють
// css/main.css і зламають вигляд усього сайту. Тому кожен селектор
// отримує префікс #ssr-prerender, а body/html перетворюються на сам блок.
function scopeCss(css) {
  if (!css) return '';
  // @media, @supports тощо: обробляємо їхній вміст окремо.
  return css.replace(/(^|\})\s*([^{}@]+)\{/g, (m, brace, sel) => {
    const scoped = sel.split(',').map(s => {
      s = s.trim();
      if (!s) return s;
      if (/^(body|html)$/i.test(s)) return '#ssr-prerender';
      if (/^\*$/.test(s)) return '#ssr-prerender *';
      if (/^(body|html)\b/i.test(s)) return s.replace(/^(body|html)\b/i, '#ssr-prerender');
      return '#ssr-prerender ' + s;
    }).join(', ');
    return `${brace} ${scoped}{`;
  });
}

/**
 * Бере повний HTML-документ, який стара SSR-функція збирала для ботів,
 * і перетворює його на аргументи renderShell. Завдяки цьому кожну
 * функцію можна перевести на спільний каркас, майже не переписуючи її
 * шаблони — а отже, з меншим ризиком щось зламати.
 */
function adaptLegacyDocument(legacyHtml, extra) {
  const pick = (re) => { const m = legacyHtml.match(re); return m ? m[1] : ''; };

  const title     = pick(/<title>([\s\S]*?)<\/title>/);
  const desc      = pick(/<meta name="description" content="([^"]*)"/);
  const canonical = pick(/<link rel="canonical"[^>]*href="([^"]*)"/);
  const ogImage   = pick(/<meta property="og:image" content="([^"]*)"/);
  const ogType    = pick(/<meta property="og:type" content="([^"]*)"/);
  // Без цього noindex зі старого шаблону губився б, і порожні
  // посадкові сторінки далі потрапляли б в індекс.
  const robots    = pick(/<meta name="robots" content="([^"]*)"/);

  // JSON-LD лишаємо рядками як є — вони вже валідний JSON,
  // повторно серіалізувати немає сенсу.
  const jsonLdRaw = [];
  const ldRe = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let m;
  while ((m = ldRe.exec(legacyHtml)) !== null) jsonLdRaw.push(m[1].trim());

  // Стилі документа → з префіксом.
  const styles = [];
  const stRe = /<style>([\s\S]*?)<\/style>/g;
  while ((m = stRe.exec(legacyHtml)) !== null) styles.push(scopeCss(m[1]));

  // Тіло без <script> і <style>; власні header/footer прибираємо —
  // у index.html вже є справжня шапка й підвал.
  let body = pick(/<body[^>]*>([\s\S]*)<\/body>/);
  body = body
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<header[\s\S]*?<\/header>/g, '')
    .replace(/<footer[\s\S]*?<\/footer>/g, '');

  const bodyHtml = (styles.length ? `<style>${styles.join('\n')}</style>` : '') + body;

  return Object.assign({
    title: decodeEntities(title),
    desc: decodeEntities(desc),
    canonical,
    ogImage,
    ogType,
    robots,
    jsonLdRaw,
    bodyHtml
  }, extra || {});
}

// title/desc у старому шаблоні вже екрановані, а renderShell екранує ще раз.
// Тому спершу розгортаємо назад, інакше отримаємо &amp;quot;.
function decodeEntities(s) {
  return String(s || '')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

module.exports = { renderShell, adaptLegacyDocument, scopeCss, escHtml, safeJsonLd, BASE };
