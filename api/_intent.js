// api/_intent.js — посадкові сторінки під пошукові запити «продати / купити …».
//
// /prodaty-elektrosamokat   /kupyty-elektrosamokat
// /prodaty-elektrovelosyped /kupyty-elektrovelosyped
// /prodaty-velosyped        /kupyty-velosyped
// /prodaty-samokat          /kupyty-samokat
//
// Кожна сторінка — власний унікальний текст + живі дані з каталогу
// (кількість оголошень, діапазон цін, міста, свіжі оголошення). Живі
// цифри роблять сторінку корисною й «свіжою» для Google, а текст
// відповідає саме на той намір, з яким людина прийшла з пошуку.
// SPA не прибирає цей контент (route 'landing'), тож Google бачить
// його і після виконання JS.

const { renderShell, escHtml, BASE } = require('./_shell');
const PROJECT = 'ridego-6f981';

// ─── Дані ───────────────────────────────────────────────────────
let _cache = null, _cacheAt = 0;
async function getActive() {
  if (_cache && Date.now() - _cacheAt < 120000) return _cache;
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`;
  const body = { structuredQuery: {
    from: [{ collectionId: 'listings' }],
    where: { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'active' } } },
    limit: 400
  } };
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) return _cache || [];
    const data = await r.json();
    _cache = data.filter(d => d.document).map(d => {
      const f = d.document.fields || {};
      const imgs = f.imgs && f.imgs.arrayValue && f.imgs.arrayValue.values || [];
      return {
        id: d.document.name.split('/').pop(),
        title: (f.title && f.title.stringValue) || '',
        price: Number((f.price && (f.price.integerValue || f.price.doubleValue)) || 0),
        city: (f.city && f.city.stringValue) || '',
        cat: (f.cat && f.cat.stringValue) || '',
        condition: (f.condition && f.condition.stringValue) || '',
        img: (f.img && f.img.stringValue) || (imgs[0] && imgs[0].stringValue) || '',
        ts: (f.bumpedAt && f.bumpedAt.timestampValue) || (f.createdAt && f.createdAt.timestampValue) || ''
      };
    });
    _cache.sort((a, b) => String(b.ts).localeCompare(String(a.ts)));
    _cacheAt = Date.now();
    return _cache;
  } catch (e) { return _cache || []; }
}

function median(a) { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2); }
function fmt(n) { return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
function round100(n) { return Math.round(n / 100) * 100; }
function plUk(n, f) { const a = n % 10, b = n % 100; return a === 1 && b !== 11 ? f[0] : (a >= 2 && a <= 4 && (b < 10 || b >= 20) ? f[1] : f[2]); }
function imgSmall(u) { return /^https:\/\/res\.cloudinary\.com\//.test(u || '') ? u.replace('/upload/', '/upload/w_400,q_70,f_auto,c_fill/') : (u || ''); }

function stats(list) {
  const prices = list.map(l => l.price).filter(p => p >= 500 && p < 2000000);
  const used = list.filter(l => l.condition && l.condition !== 'Новий').map(l => l.price).filter(p => p >= 500);
  const fresh = list.filter(l => l.condition === 'Новий').map(l => l.price).filter(p => p >= 500);
  const cities = {};
  list.forEach(l => { if (l.city) cities[l.city] = (cities[l.city] || 0) + 1; });
  const topCities = Object.entries(cities).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const s = prices.slice().sort((a, b) => a - b);
  const p10 = s.length ? s[Math.floor(s.length * 0.1)] : 0, p90 = s.length ? s[Math.min(s.length - 1, Math.floor(s.length * 0.9))] : 0;
  return { count: list.length, min: s[0] || 0, max: s[s.length - 1] || 0, p10, p90, med: median(prices), medUsed: used.length >= 3 ? median(used) : 0, medNew: fresh.length >= 3 ? median(fresh) : 0, topCities };
}

// ─── Категорії ──────────────────────────────────────────────────
const KINDS = {
  elektrosamokat: {
    cat: 'Електросамокати', catSlug: 'elektrosamokaty', icon: '⚡',
    one: 'електросамокат', gen: 'електросамоката', many: 'електросамокати', manyGen: 'електросамокатів',
    brands: [['kukirin', 'KuKirin'], ['xiaomi', 'Xiaomi'], ['ninebot', 'Ninebot'], ['dualtron', 'Dualtron'], ['kaabo', 'Kaabo'], ['vsett', 'Vsett'], ['ausom', 'Ausom']],
    extraLinks: [['/elektrosamokat-vzhyvanyy', 'Вживані електросамокати'], ['/elektrosamokat-biudzhetnyj', 'Бюджетні електросамокати'], ['/elektrosamokat-z-sydinniam', 'Електросамокати з сидінням'], ['/elektrosamokat-dlya-mista', 'Для міста'], ['/elektrosamokat-dlia-bezdorizhzhia', 'Для бездоріжжя'], ['/elektrosamokat-kyiv', 'Електросамокати Київ'], ['/elektrosamokat-lviv', 'Електросамокати Львів'], ['/elektrosamokat-odesa', 'Електросамокати Одеса'], ['/elektrosamokat-kharkiv', 'Електросамокати Харків'], ['/elektrosamokat-dnipro', 'Електросамокати Дніпро']],
    buyChecks: [
      ['Акумулятор', 'Попросіть показати напругу на повному заряді й реальний запас ходу. Після 300–500 циклів ємність батареї помітно падає — це найдорожча деталь самоката.'],
      ['Пробіг', 'На більшості моделей пробіг видно на дисплеї або в застосунку. Порівняйте його зі зносом покришок і гальм — вони мають «розповідати» ту саму історію.'],
      ['Рама і кермова колонка', 'Перевірте складний механізм: люфт у кермовій колонці, тріщини біля шарніра, сліди зварювання. Люфт — привід торгуватися або відмовитися.'],
      ['Гальма і світло', 'Під час тест-драйву загальмуйте на швидкості обома гальмами, увімкніть фару, стоп-сигнал і поворотники.'],
      ['Документи', 'Чек, гарантійний талон або коробка — плюс до надійності й до ціни при наступному продажу.']
    ],
    sellTips: [
      'Зарядіть самокат повністю і сфотографуйте дисплей з пробігом — покупці першим ділом питають про нього.',
      'Зробіть 5–8 фото при денному світлі: загальний вигляд з обох боків, кермо, дека, колеса, складний механізм.',
      'Вкажіть модель повністю (наприклад, «KuKirin G2 Pro 2023»), потужність мотора, ємність батареї і реальний запас ходу.',
      'Чесно опишіть недоліки: подряпини, замінені деталі, стан покришок. Це знімає зайві питання і прискорює угоду.',
      'Додайте в комплект зарядку, ключі, документи — повний комплект продається швидше і дорожче.'
    ],
    priceFactors: 'На ціну вживаного електросамоката найбільше впливають бренд і модель, стан акумулятора, пробіг, рік випуску і комплектація. Популярні моделі (KuKirin, Xiaomi, Ninebot) продаються швидше, бо на них є попит і запчастини.'
  },
  elektrovelosyped: {
    cat: 'Електровелосипеди', catSlug: 'elektrovelosypedy', icon: '🚴',
    one: 'електровелосипед', gen: 'електровелосипеда', many: 'електровелосипеди', manyGen: 'електровелосипедів',
    brands: [['ausom', 'Ausom']],
    extraLinks: [['/elektrovelosyped-kyiv', 'Електровелосипеди Київ'], ['/kupyty-elektroskuter', 'Купити електроскутер'], ['/kupyty-elektromotocykl', 'Купити електромотоцикл']],
    buyChecks: [
      ['Акумулятор', 'Уточніть напругу і ємність (наприклад, 48V 15Ah), вік батареї і реальний запас ходу. Нова батарея для електровелосипеда коштує суттєво, тож її стан — головне.'],
      ['Мотор', 'Мотор-колесо чи кареточний (mid-drive)? Послухайте мотор під навантаженням: скрегіт і ривки — ознака зносу.'],
      ['Рама', 'Огляньте зварні шви, дропаути й місце кріплення батареї. Тріщини рами не ремонтуються надійно.'],
      ['Гальма і трансмісія', 'Гідравлічні дискові гальма — стандарт для важкого електровелосипеда. Перевірте знос колодок, ланцюга і касети.'],
      ['Контролер і дисплей', 'Усі режими асистенту мають вмикатися, дисплей — показувати заряд і швидкість без збоїв.']
    ],
    sellTips: [
      'Вкажіть тип мотора, його потужність, напругу і ємність батареї, реальний запас ходу.',
      'Сфотографуйте велосипед з обох боків, мотор, батарею, дисплей, гальма і трансмісію.',
      'Напишіть, скільки років батареї і приблизний пробіг — це перше, що питають покупці.',
      'Згадайте про обслуговування: заміну ланцюга, колодок, прокачку гальм.',
      'Додайте зарядний пристрій і ключ від батареї до комплекту.'
    ],
    priceFactors: 'Ціна електровелосипеда залежить від батареї (ємність і вік), типу і потужності мотора, якості рами й компонентів (гальма, перемикачі), а також бренду. Електрофетбайки і моделі з кареточним мотором тримають ціну краще.'
  },
  velosyped: {
    cat: 'Велосипеди', catSlug: 'velosypedy', icon: '🚲',
    one: 'велосипед', gen: 'велосипеда', many: 'велосипеди', manyGen: 'велосипедів',
    brands: [],
    extraLinks: [['/kupyty-elektrovelosyped', 'Купити електровелосипед'], ['/category/elektrovelosypedy', 'Електровелосипеди'], ['/services', 'Веломайстерні та сервіси']],
    buyChecks: [
      ['Розмір рами', 'Спершу — розмір під ваш зріст. Навіть ідеальний велосипед з неправильною рамою буде незручним.'],
      ['Рама і вилка', 'Шукайте тріщини, вм’ятини, сліди фарбування поверх пошкоджень. Перевірте хід амортизаційної вилки і відсутність протікань.'],
      ['Трансмісія', 'Розтягнутий ланцюг і «зализані» зірки — найчастіша витрата після купівлі. Перемикання мають бути чіткими.'],
      ['Гальма', 'Дискові чи ободові — вони мають зупиняти впевнено, без скрипу і провалювання ручки.'],
      ['Колеса і втулки', 'Покрутіть колеса: вісімки, люфт у втулках і хрускіт у каретці — привід для торгу.']
    ],
    sellTips: [
      'Вкажіть тип (гірський, міський, шосейний, гравійний), розмір рами і коліс, рік.',
      'Перелічіть навісне обладнання: перемикачі, гальма, вилку — покупці шукають за ними.',
      'Помийте велосипед і зробіть фото при денному світлі з боку трансмісії.',
      'Якщо щось замінювали або обслуговували — напишіть, це підвищує довіру.',
      'Вкажіть, на який зріст підійде велосипед — це заощадить вам час на відповідях.'
    ],
    priceFactors: 'На ціну вживаного велосипеда впливають бренд, рівень навісного обладнання (Shimano, SRAM), матеріал рами, тип вилки і гальм, а також загальний стан. Якісні бренди зберігають вартість роками.'
  },
  samokat: {
    cat: 'Електросамокати', catSlug: 'elektrosamokaty', icon: '🛴',
    one: 'самокат', gen: 'самоката', many: 'самокати', manyGen: 'самокатів',
    brands: [['kukirin', 'KuKirin'], ['xiaomi', 'Xiaomi'], ['ninebot', 'Ninebot']],
    extraLinks: [['/kupyty-elektrosamokat', 'Купити електросамокат'], ['/prodaty-elektrosamokat', 'Продати електросамокат'], ['/elektrosamokat-biudzhetnyj', 'Бюджетні самокати'], ['/elektrosamokat-vzhyvanyy', 'Вживані самокати']],
    buyChecks: [
      ['Тип самоката', 'Звичайний (кікскутер) чи електричний? Електросамокат потребує перевірки батареї й мотора, звичайний — підшипників і деки.'],
      ['Складний механізм', 'Люфт у кермі чи шарнірі — головна хвороба самокатів. Потрясіть кермо в розкладеному стані.'],
      ['Колеса', 'Надувні колеса м’якші, литі не проколюються, але жорсткіші. Перевірте знос і тріщини.'],
      ['Гальма', 'Перевірте гальма на ходу. У електросамокатів — і механічне, і рекуперативне.'],
      ['Максимальне навантаження', 'Переконайтеся, що самокат розрахований на вашу вагу, особливо дитячі й легкі моделі.']
    ],
    sellTips: [
      'Напишіть, чи це електросамокат, чи звичайний, і для якого віку або ваги він підходить.',
      'Зробіть фото загального вигляду, деки, коліс і складного механізму.',
      'Для електросамоката вкажіть запас ходу, пробіг і стан батареї.',
      'Чесно опишіть подряпини і заміни — угода пройде швидше.',
      'Вкажіть реальну ціну: орієнтуйтеся на схожі оголошення нижче.'
    ],
    priceFactors: 'Ціна самоката залежить від типу (звичайний чи електричний), бренду, стану коліс і складного механізму, а для електросамоката — ще й від батареї та пробігу.'
  }
};

// ─── Сторінки ───────────────────────────────────────────────────
const PAGES = {
  'prodaty-elektrosamokat':   { kind: 'elektrosamokat',   mode: 'sell' },
  'kupyty-elektrosamokat':    { kind: 'elektrosamokat',   mode: 'buy' },
  'prodaty-elektrovelosyped': { kind: 'elektrovelosyped', mode: 'sell' },
  'kupyty-elektrovelosyped':  { kind: 'elektrovelosyped', mode: 'buy' },
  'prodaty-velosyped':        { kind: 'velosyped',        mode: 'sell' },
  'kupyty-velosyped':         { kind: 'velosyped',        mode: 'buy' },
  'prodaty-samokat':          { kind: 'samokat',          mode: 'sell' },
  'kupyty-samokat':           { kind: 'samokat',          mode: 'buy' }
};

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function buildPage(slug, list) {
  const pg = PAGES[slug], k = KINDS[pg.kind], sell = pg.mode === 'sell';
  const st = stats(list);
  const other = (sell ? 'kupyty-' : 'prodaty-') + pg.kind;
  const cnt = st.count ? `${st.count} ${plUk(st.count, ['оголошення', 'оголошення', 'оголошень'])}` : '';
  // Цін (середніх, діапазонів) навмисно не показуємо: поки оголошень
  // небагато, такі цифри вводили б в оману.
  const range = '';
  st.med = st.medUsed = st.medNew = 0;

  const title = sell
    ? `Продати ${k.one} — безкоштовне оголошення | RideGO`
    : `Купити ${k.one} б/у і новий${cnt ? ' — ' + cnt : ''} | RideGO`;
  const h1 = sell ? `Продати ${k.one}` : `Купити ${k.one}`;
  const desc = sell
    ? `Продайте ${k.one} на RideGO: безкоштовне оголошення за 2 хвилини, покупці по всій Україні, чат без посередників.${range ? ' Реальні ціни на ринку: ' + range + '.' : ''}`
    : `Купити ${k.one} в Україні: ${cnt ? cnt + ' від власників і магазинів' : 'оголошення від власників і магазинів'}${range ? ', ціни ' + range : ''}. Порівнюйте, пишіть продавцю напряму.`;

  const H = s => escHtml(s);
  const listCards = list.slice(0, 12).map(l => {
    const img = imgSmall(l.img);
    return `<a class="seo-card" href="/listing/${encodeURIComponent(l.id)}">` +
      (img ? `<img src="${H(img)}" alt="${H(l.title)}" width="400" height="300" loading="lazy" decoding="async">` : `<span class="seo-card-ph">${k.icon}</span>`) +
      `<span class="seo-card-body"><span class="seo-card-title">${H(l.title)}</span>` +
      `<span class="seo-card-price">${l.price ? fmt(l.price) + ' грн' : 'Ціна договірна'}</span>` +
      `<span class="seo-card-meta">${H(l.city)}${l.condition ? ' · ' + H(l.condition) : ''}</span></span></a>`;
  }).join('');

  const statBox = st.count ? `<div class="seo-stats">
    <div><b>${st.count}</b><span>${plUk(st.count, ['оголошення', 'оголошення', 'оголошень'])} зараз</span></div>
    ${st.med ? `<div><b>${fmt(round100(st.med))} грн</b><span>середня ціна</span></div>` : ''}
    ${st.medUsed && Math.abs(st.medUsed - st.med) > 300 ? `<div><b>${fmt(round100(st.medUsed))} грн</b><span>середня ціна вживаного</span></div>` : (range ? `<div><b>${range.replace('від ', '').replace(' до ', ' – ')}</b><span>типовий діапазон цін</span></div>` : '')}
    ${st.topCities.length ? `<div><b>${st.topCities.length}${st.topCities.length >= 8 ? '+' : ''}</b><span>${plUk(st.topCities.length, ['місто', 'міста', 'міст'])} з пропозиціями</span></div>` : ''}
  </div>` : '';

  const cities = st.topCities.length ? `<p class="seo-note">Найбільше пропозицій зараз: ${st.topCities.map(([c, n]) => `${H(c)} (${n})`).join(', ')}.</p>` : '';

  const brandLinks = k.brands.length ? `<div class="seo-links">${k.brands.map(([s, n]) => `<a href="/brand/${s}">${sell ? 'Ціни на ' : ''}${n}</a>`).join('')}</div>` : '';
  const extra = `<div class="seo-links">${k.extraLinks.map(([u, n]) => `<a href="${u}">${H(n)}</a>`).join('')}<a href="/${other}">${sell ? 'Купити ' : 'Продати '}${k.one}</a><a href="/category/${k.catSlug}">Усі ${k.many}</a></div>`;

  // ── FAQ ──
  const faq = sell ? [
    [`Скільки коштує розмістити оголошення про продаж ${k.gen}?`, `Базове оголошення на RideGO безкоштовне. За бажанням можна підняти його в ТОП, щоб швидше знайти покупця.`],
    [`Яку ціну поставити на вживаний ${k.one}?`, `Подивіться схожі оголошення на RideGO${st.medUsed ? ` — зараз середня ціна вживаного ${k.gen} близько ${fmt(round100(st.medUsed))} грн` : range ? ` — більшість пропозицій у діапазоні ${range}` : ''}. Ставте ціну трохи вище за бажану, щоб залишити простір для торгу.`],
    [`Як швидко можна продати ${k.one}?`, `Популярні моделі з хорошими фото і чесним описом часто продаються за кілька днів. Оголошення без фото і з завищеною ціною висять тижнями.`],
    [`Як безпечно отримати оплату?`, `Найбезпечніше — зустріч особисто з оплатою готівкою або переказом на місці. Не переходьте за посиланнями «для отримання оплати» і не повідомляйте дані картки, крім її номера.`],
    [`Чи можна продати ${k.one} з доставкою?`, `Так. Домовтеся з покупцем про відправку Новою поштою з оплатою при отриманні — так захищені обидві сторони.`]
  ] : [
    [`Скільки коштує ${k.one} в Україні?`, st.count >= 3 && range ? `Зараз на RideGO ${cnt}. Більшість пропозицій — ${range}${st.medNew && st.medUsed ? `; середня ціна нового близько ${fmt(round100(st.medNew))} грн, вживаного — ${fmt(round100(st.medUsed))} грн` : ''}.` : `Ціна залежить від моделі, стану і комплектації. Порівняйте актуальні оголошення на RideGO.`],
    [`Що краще: новий чи вживаний ${k.one}?`, `Вживаний ${k.one} у хорошому стані коштує помітно дешевше за новий. Новий дає гарантію і невідому історію не треба перевіряти. Якщо купуєте вживаний — обов’язково огляньте його наживо і перевірте пункти зі списку вище.`],
    [`Як не натрапити на шахраїв?`, `Не вносьте передоплату незнайомим продавцям, оглядайте товар наживо або купуйте з оплатою при отриманні. Спілкуйтеся в чаті RideGO — так залишається історія домовленостей.`],
    [`Чи можна торгуватися?`, `Так, це нормальна практика. Аргументуйте торг конкретними недоліками, які знайшли під час огляду.`],
    [`Як купити ${k.one} в іншому місті?`, `Домовтеся з продавцем про відправку Новою поштою з оплатою при отриманні та оглядом у відділенні.`]
  ];
  const faqHtml = `<section class="seo-sec"><h2>Часті питання</h2>${faq.map(([q, a]) => `<details class="seo-faq"><summary>${H(q)}</summary><p>${H(a)}</p></details>`).join('')}</section>`;

  // ── Основний текст ──
  const main = sell ? `
    <section class="seo-sec"><h2>Як продати ${k.one} на RideGO</h2>
      <ol class="seo-steps">
        <li><b>Увійдіть через Google або email</b><span>30 секунд, без анкет і дзвінків.</span></li>
        <li><b>Додайте фото й опис</b><span>Форма підкаже, які характеристики вказати, щоб покупці знаходили ваш ${k.one}.</span></li>
        <li><b>Спілкуйтеся з покупцями напряму</b><span>Чат на сайті і ваш телефон — без посередників і комісій.</span></li>
      </ol>
      <a class="seo-cta" href="/add">Подати оголошення безкоштовно</a>
    </section>
    <section class="seo-sec"><h2>Як продати ${k.one} швидше і дорожче</h2>
      <ul class="seo-list">${k.sellTips.map(t => `<li>${H(t)}</li>`).join('')}</ul>
    </section>
    <section class="seo-sec"><h2>Від чого залежить ціна вживаного ${k.gen}</h2>
      <p>${H(k.priceFactors)}</p>
      ${range ? `<p>За даними RideGO, більшість ${k.manyGen} зараз пропонують ${range}${st.medUsed ? `, а середня ціна вживаного — близько ${fmt(round100(st.medUsed))} грн` : ''}. Орієнтуйтеся на схожі оголошення нижче, щоб поставити конкурентну ціну.</p>` : ''}
      ${cities}
    </section>
    ${listCards ? `<section class="seo-sec"><h2>Що зараз продають</h2><div class="seo-grid">${listCards}</div><a class="seo-more" href="/category/${k.catSlug}">Усі ${k.many} →</a></section>` : ''}
  ` : `
    ${listCards ? `<section class="seo-sec"><h2>Свіжі оголошення</h2><div class="seo-grid">${listCards}</div><a class="seo-more" href="/category/${k.catSlug}">Дивитися всі ${cnt || k.many} →</a></section>` : ''}
    <section class="seo-sec"><h2>Як вибрати вживаний ${k.one}: що перевірити</h2>
      <div class="seo-checks">${k.buyChecks.map(([t, d]) => `<div><b>${H(t)}</b><p>${H(d)}</p></div>`).join('')}</div>
    </section>
    <section class="seo-sec"><h2>Від чого залежить ціна</h2>
      <p>${H(k.priceFactors)}</p>
      ${range ? `<p>Зараз на RideGO ${cnt}; більшість пропозицій — ${range}${st.medNew ? `, новий ${k.one} — у середньому ${fmt(round100(st.medNew))} грн` : ''}${st.medUsed ? `, вживаний — ${fmt(round100(st.medUsed))} грн` : ''}.</p>` : ''}
      ${cities}
      ${brandLinks}
    </section>
    <section class="seo-sec seo-sec-soft"><h2>Хочете продати свій ${k.one}?</h2><p>Розмістіть оголошення безкоштовно — покупці з усієї України побачать його вже сьогодні.</p><a class="seo-cta" href="/add">Подати оголошення</a></section>
  `;

  const bodyHtml = `<article class="seo-landing">
    <nav class="seo-bc" aria-label="Breadcrumb"><a href="/">RideGO</a><span>›</span><a href="/category/${k.catSlug}">${H(k.cat)}</a><span>›</span><span>${H(h1)}</span></nav>
    <header class="seo-hero">
      <h1>${H(h1)}</h1>
      <p class="seo-lead">${sell
        ? `Безкоштовне оголошення за 2 хвилини. Покупці з усієї України, чат без посередників і жодних комісій з продажу.`
        : `${cnt ? cap(cnt) + ' від власників і магазинів по всій Україні' : 'Оголошення від власників і магазинів по всій Україні'}${range ? ', ціни ' + range : ''}. Пишіть продавцю напряму, без посередників.`}</p>
      <div class="seo-hero-acts">${sell
        ? `<a class="seo-cta" href="/add">Продати ${k.one}</a><a class="seo-ghost" href="/category/${k.catSlug}">Подивитися ціни</a>`
        : `<a class="seo-cta" href="/category/${k.catSlug}">Дивитися всі оголошення</a><a class="seo-ghost" href="/${other}">Продати свій</a>`}</div>
    </header>
    ${statBox}
    ${main}
    ${faqHtml}
    <section class="seo-sec"><h2>Корисне</h2>${sell ? brandLinks : ''}${extra}</section>
  </article>`;

  const url = `${BASE}/${slug}`;
  const jsonLd = [
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'RideGO', item: BASE + '/' },
      { '@type': 'ListItem', position: 2, name: k.cat, item: `${BASE}/category/${k.catSlug}` },
      { '@type': 'ListItem', position: 3, name: h1, item: url } ] },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }
  ];
  if (!sell && list.length) {
    jsonLd.push({ '@context': 'https://schema.org', '@type': 'ItemList', name: h1, url, numberOfItems: Math.min(12, list.length),
      itemListElement: list.slice(0, 12).map((l, i) => ({ '@type': 'ListItem', position: i + 1, url: `${BASE}/listing/${l.id}`, name: l.title })) });
    if (st.count >= 3 && st.min) jsonLd.push({ '@context': 'https://schema.org', '@type': 'Product', name: cap(k.many), description: desc,
      offers: { '@type': 'AggregateOffer', priceCurrency: 'UAH', lowPrice: st.min, highPrice: st.max, offerCount: st.count } });
  }
  return { title, desc, url, bodyHtml, jsonLd, ogImage: (list.find(l => l.img) || {}).img };
}

module.exports = async (req, res) => {
  let slug = (req.query && req.query.page) || '';
  if (!slug) { const m = String(req.url || '').match(/[?&]page=([a-z-]+)/); slug = m ? m[1] : ''; }
  slug = String(slug).toLowerCase().replace(/[^a-z-]/g, '');
  const pg = PAGES[slug];
  if (!pg) { res.setHeader('Location', `${BASE}/catalog`); return res.status(302).end(); }
  const all = await getActive();
  const list = all.filter(l => l.cat === KINDS[pg.kind].cat);
  const p = buildPage(slug, list);
  const html = renderShell({ title: p.title, desc: p.desc, canonical: p.url, ogImage: p.ogImage, jsonLd: p.jsonLd, bodyHtml: p.bodyHtml });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=86400');
  res.status(200).send(html);
};
module.exports.PAGES = PAGES;
module.exports.buildPage = buildPage;
