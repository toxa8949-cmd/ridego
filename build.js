// build.js — RideGO build script
// Запуск: node build.js
// Що робить:
//   1. Копіює всі файли проекту в dist/
//   2. Мінімізує JS через Terser (js/main.js, js/extra.js, js/data_geo.js, js/data_specs.js)
//   3. Мінімізує CSS через CSSO (css/main.css)
//   4. Замінює посилання в index.html на версійовані (cache busting)

const fs   = require('fs');
const path = require('path');
const { minify } = require('terser');
const csso = require('csso');
const crypto = require('crypto');

const SRC  = path.join(__dirname);
const DIST = path.join(__dirname, 'dist');

// ── Утиліти ──────────────────────────────────────────────────
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function hash(content) {
  return crypto.createHash('md5').update(content).digest('hex').slice(0, 8);
}

function sizeKb(str) {
  return (Buffer.byteLength(str, 'utf8') / 1024).toFixed(1) + ' KB';
}

// ── Підготовка dist/ ─────────────────────────────────────────
ensureDir(DIST);
ensureDir(path.join(DIST, 'js'));
ensureDir(path.join(DIST, 'css'));
ensureDir(path.join(DIST, 'api'));

// ── Файли що просто копіюються без змін ──────────────────────
const COPY_FILES = [
  'manifest.json',
  'robots.txt',
  'sw.js',
  'favicon.svg',
  'favicon.ico',
  'sitemap.xml',
  'ridego-admin.html',
  '404.html',
];

COPY_FILES.forEach(f => {
  const src = path.join(SRC, f);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(DIST, f));
    console.log(`  copied: ${f}`);
  }
});

// API файли
['listing.js', 'news-item.js', 'sitemap.js', 'category.js', 'send-email.js', 'config.js', 'home.js', 'catalog.js'].forEach(f => {
  const src = path.join(SRC, 'api', f);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(DIST, 'api', f));
    console.log(`  copied: api/${f}`);
  }
});

// ── Мінімізація JS ───────────────────────────────────────────
const JS_FILES = [
  // 4 бандли (розробка — в js/modules/, продакшн — бандли)
  { src: 'js/core-bundle.js',     dist: 'js/core-bundle.js' },
  { src: 'js/pages-bundle.js',    dist: 'js/pages-bundle.js' },
  { src: 'js/user-bundle.js',     dist: 'js/user-bundle.js' },
  { src: 'js/features-bundle.js', dist: 'js/features-bundle.js' },
  // Окремі файли
  { src: 'js/extra.js',           dist: 'js/extra.js' },
  { src: 'js/gallery-ux.js',      dist: 'js/gallery-ux.js' },
  { src: 'js/data_geo.js',        dist: 'js/data_geo.js' },
  { src: 'js/data_specs.js',      dist: 'js/data_specs.js' },
];

const TERSER_OPTIONS = {
  compress: {
    drop_console: false,   // залишаємо console.log для дебагу (можна true для prod)
    drop_debugger: true,
    passes: 2,
  },
  mangle: true,
  format: {
    comments: false,
  },
};

const hashes = {};

async function buildJS() {
  console.log('\n── JS мінімізація ──────────────────────────────');
  for (const { src, dist } of JS_FILES) {
    const srcPath = path.join(SRC, src);
    if (!fs.existsSync(srcPath)) {
      console.log(`  skip (not found): ${src}`);
      continue;
    }
    const original = fs.readFileSync(srcPath, 'utf8');
    try {
      const result = await minify(original, TERSER_OPTIONS);
      const minified = result.code;
      const h = hash(minified);
      hashes[src] = h;

      // Зберігаємо і з хешем і без (для sw.js кешування)
      const distPath = path.join(DIST, dist);
      fs.writeFileSync(distPath, minified);

      console.log(`  ${src}: ${sizeKb(original)} → ${sizeKb(minified)} (hash: ${h})`);
    } catch (e) {
      console.error(`  ERROR minifying ${src}:`, e.message);
      // Якщо помилка — копіюємо оригінал
      fs.copyFileSync(srcPath, path.join(DIST, dist));
    }
  }

  // ── Мінімізація CSS ─────────────────────────────────────────
  console.log('\n── CSS мінімізація ─────────────────────────────');
  const cssPath = path.join(SRC, 'css/main.css');
  if (fs.existsSync(cssPath)) {
    const original = fs.readFileSync(cssPath, 'utf8');
    const result   = csso.minify(original);
    const minified = result.css;
    const h = hash(minified);
    hashes['css/main.css'] = h;
    fs.writeFileSync(path.join(DIST, 'css/main.css'), minified);
    console.log(`  css/main.css: ${sizeKb(original)} → ${sizeKb(minified)} (hash: ${h})`);
  }

  // ── Обробка index.html ───────────────────────────────────────
  console.log('\n── index.html ──────────────────────────────────');
  const htmlPath = path.join(SRC, 'index.html');
  if (!fs.existsSync(htmlPath)) {
    console.error('  index.html not found!');
    return;
  }

  let html = fs.readFileSync(htmlPath, 'utf8');

  // Cache busting — додаємо ?v=HASH до JS і CSS
  // /js/main.js → /js/main.js?v=abc12345
  for (const [file, h] of Object.entries(hashes)) {
    const escaped = file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(["'])/${escaped}(["'\\s>])`, 'g');
    html = html.replace(re, `$1/${file}?v=${h}$2`);
    // також src= і href=
    html = html.replace(
      new RegExp(`(src|href)="/${escaped}"`, 'g'),
      `$1="/${file}?v=${h}"`
    );
  }

  fs.writeFileSync(path.join(DIST, 'index.html'), html);
  console.log('  index.html готовий з cache-busting хешами');

  // ── Підсумок ────────────────────────────────────────────────
  console.log('\n✅ Build завершено → dist/');
  const totalJs = JS_FILES.reduce((sum, { dist }) => {
    const p = path.join(DIST, dist);
    return sum + (fs.existsSync(p) ? fs.statSync(p).size : 0);
  }, 0);
  console.log(`   JS разом: ${(totalJs / 1024).toFixed(1)} KB`);
}

buildJS().catch(console.error);
