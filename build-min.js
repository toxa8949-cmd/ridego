// build-min.js — мінімізація JS і CSS ПРЯМО НА МІСЦі, під час збірки на Vercel.
//
// Навіщо на місці, а не в dist/:
//   Старий build.js збирав окрему теку dist/ зі списками файлів для копіювання.
//   У цих списках бракувало api/faq.js, api/news.js, og-image.png та PWA-іконок —
//   тобто після збірки /faq, /news і картинки для соцмереж віддавали б 404.
//   Мінімізація на місці не має списків копіювання взагалі, тож і забути нічого не можна.
//
// У Git залишається звичайний, читабельний код. Мінімізується лише та копія,
// яку Vercel розгортає. Локально нічого запускати не треба.
//
// Якщо деплой колись впаде на цьому кроці — приберіть "buildCommand" з vercel.json
// і видаліть package.json. Сайт повернеться до роботи без мінімізації.

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const ROOT = __dirname;

// Хеш від вмісту файлу — підставляється в index.html як ?v=<хеш>.
// Без цього не можна вмикати immutable-кешування: браузер тримав би
// старий JS до року, якби ?v= забули оновити вручну.
function contentHash(str) {
  return crypto.createHash('md5').update(str).digest('hex').slice(0, 8);
}

const JS_FILES = [
  'js/core-bundle.js',
  'js/pages-bundle.js',
  'js/user-bundle.js',
  'js/features-bundle.js',
  'js/extra.js',
  'js/gallery-ux.js',
  'js/data_geo.js',
  'js/data_specs.js',
];

const CSS_FILES = ['css/main.css'];

const TERSER_OPTIONS = {
  compress: {
    drop_debugger: true,
    drop_console: false,   // console лишаємо — інакше важче діагностувати продакшн
    passes: 2,
  },
  // ВАЖЛИВО: toplevel:false — глобальні імена НЕ чіпаємо.
  // У проекті ~330 глобальних функцій, і 223 inline-обробники onclick="..."
  // в index.html викликають їх по іменах. Якщо Terser перейменує функції,
  // кожна така кнопка перестане працювати.
  mangle: { toplevel: false },
  format: { comments: false },
};

function kb(n) { return (n / 1024).toFixed(1) + ' KB'; }

async function run() {
  let minify, csso;
  try {
    ({ minify } = require('terser'));
    csso = require('csso');
  } catch (e) {
    console.error('✗ Немає terser/csso. Перевірте devDependencies у package.json.');
    console.error('  Збірку припинено, щоб не задеплоїти половину роботи.');
    process.exit(1);
  }

  let before = 0, after = 0, failed = 0;
  const hashes = {};   // 'js/core-bundle.js' -> 'a1b2c3d4'

  console.log('\n── JS ─────────────────────────────────────────');
  for (const rel of JS_FILES) {
    const p = path.join(ROOT, rel);
    if (!fs.existsSync(p)) { console.log(`  · пропущено (немає): ${rel}`); continue; }

    const src = fs.readFileSync(p, 'utf8');
    try {
      const res = await minify(src, TERSER_OPTIONS);
      if (!res.code) throw new Error('порожній результат');
      fs.writeFileSync(p, res.code);
      hashes[rel] = contentHash(res.code);
      before += src.length; after += res.code.length;
      console.log(`  ✓ ${rel}: ${kb(src.length)} → ${kb(res.code.length)}  [${hashes[rel]}]`);
    } catch (e) {
      // Файл лишається оригінальним — краще більший, ніж зламаний.
      // Хеш усе одно рахуємо, щоб ?v= відповідав тому, що реально віддається.
      failed++;
      hashes[rel] = contentHash(src);
      console.error(`  ✗ ${rel}: ${e.message} — лишаю оригінал`);
      before += src.length; after += src.length;
    }
  }

  console.log('\n── CSS ────────────────────────────────────────');
  for (const rel of CSS_FILES) {
    const p = path.join(ROOT, rel);
    if (!fs.existsSync(p)) { console.log(`  · пропущено (немає): ${rel}`); continue; }

    const src = fs.readFileSync(p, 'utf8');
    try {
      const out = csso.minify(src).css;
      if (!out) throw new Error('порожній результат');
      fs.writeFileSync(p, out);
      hashes[rel] = contentHash(out);
      before += src.length; after += out.length;
      console.log(`  ✓ ${rel}: ${kb(src.length)} → ${kb(out.length)}  [${hashes[rel]}]`);
    } catch (e) {
      failed++;
      hashes[rel] = contentHash(src);
      console.error(`  ✗ ${rel}: ${e.message} — лишаю оригінал`);
      before += src.length; after += src.length;
    }
  }

  // ── index.html: підставляємо ?v=<хеш> ────────────────────────
  // Було ?v=20260511 вручну. Тепер версія рахується з вмісту файлу,
  // тож забути її оновити неможливо — а отже immutable-кеш безпечний.
  console.log('\n── index.html: версії ресурсів ────────────────');
  const htmlPath = path.join(ROOT, 'index.html');
  if (fs.existsSync(htmlPath)) {
    let html = fs.readFileSync(htmlPath, 'utf8');
    let n = 0;
    for (const [rel, h] of Object.entries(hashes)) {
      // /js/core-bundle.js?v=щось  або  /js/core-bundle.js  →  /js/core-bundle.js?v=<хеш>
      const esc = rel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp('(["\'])/' + esc + '(\\?v=[^"\']*)?\\1', 'g');
      html = html.replace(re, (m, q) => { n++; return `${q}/${rel}?v=${h}${q}`; });
    }
    fs.writeFileSync(htmlPath, html);
    console.log(`  ✓ оновлено посилань: ${n}`);
  } else {
    console.log('  · index.html не знайдено');
  }

  // ── sw.js: піднімаємо версію кешу ────────────────────────────
  // Інакше service worker продовжить віддавати старі файли з офлайн-кешу.
  const swPath = path.join(ROOT, 'sw.js');
  if (fs.existsSync(swPath)) {
    const buildTag = contentHash(Object.values(hashes).join('|')).slice(0, 6);
    let sw = fs.readFileSync(swPath, 'utf8');
    sw = sw.replace(/ridego-static-v[\w]+/g, 'ridego-static-v' + buildTag)
           .replace(/ridego-v[\w]+/g,        'ridego-v' + buildTag);
    fs.writeFileSync(swPath, sw);
    console.log(`  ✓ sw.js: версія кешу → ridego-v${buildTag}`);
  }

  const saved = before - after;
  console.log('\n───────────────────────────────────────────────');
  console.log(`Разом: ${kb(before)} → ${kb(after)}  (мінус ${kb(saved)}, ${(saved / before * 100).toFixed(0)}%)`);
  if (failed) console.log(`Не вдалося мінімізувати файлів: ${failed} (вони лишились як є)`);
  console.log('');
}

run().catch(e => { console.error('Збірка впала:', e); process.exit(1); });
