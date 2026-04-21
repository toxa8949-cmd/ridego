const BASE = 'https://www.ridego.com.ua';
const PROJECT = 'ridego-6f981';
const BOTS = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|linkedinbot|telegrambot|whatsapp|applebot|mj12bot|ahrefsbot|semrushbot|petalbot|bytespider|google-inspectiontool|google-structured-data-testing|storebot|developers\.google/i;

const CATEGORIES = {
  'elektrosamokaty':   { name: 'Електросамокати', icon: '⚡', desc: 'Купити електросамокат в Україні — великий вибір нових та вживаних електросамокатів від приватних продавців і магазинів за вигідними цінами.' },
  'velosypedy':        { name: 'Велосипеди', icon: '🚲', desc: 'Купити велосипед в Україні — гірські, міські, дорожні велосипеди від приватних продавців за доступними цінами.' },
  'elektrovelosypedy': { name: 'Електровелосипеди', icon: '🚴', desc: 'Купити електровелосипед в Україні — новітні моделі електровелосипедів для міста та бездоріжжя.' },
  'elektroskutery':    { name: 'Електроскутери', icon: '🛵', desc: 'Купити електроскутер в Україні — широкий вибір електроскутерів для міських поїздок за найкращими цінами.' },
  'elektromotocykly':  { name: 'Електромотоцикли', icon: '🏍', desc: 'Купити електромотоцикл в Україні — потужні електромотоцикли для активного відпочинку та щоденних поїздок.' },
};

// ─── BRANDS ───
const BRANDS = {
  'kukirin': {
    name: 'KuKirin', firebaseNames: ['Kukirin','KuKirin','Kugoo'], category: 'Електросамокати', catSlug: 'elektrosamokaty', icon: '⚡',
    title: 'Купити електросамокат KuKirin (Кукірін) в Україні — ціни, моделі | RideGO',
    h1: 'Електросамокати KuKirin — купити в Україні',
    metaDesc: 'Електросамокати KuKirin (Кукірін, Kugoo Kirin) — купити в Україні на маркетплейсі RideGO. Моделі G2, G2 Pro, G2 Max, G3, G4, M4 Pro, S1 Max. Нові та б/в, ціни від продавців по всій Україні.',
    keywords: 'купити KuKirin, KuKirin ціна, електросамокат KuKirin, купити Kukirin, купити Kugoo Kirin, купити Кукірін, купити Кукирін, купити Кукирин, KuKirin Україна, KuKirin Київ, KuKirin б/в',
    introHtml: '<div style="background:#f0fdf4;border-radius:16px;padding:24px 28px;margin-bottom:28px;line-height:1.8;font-size:15px;color:#333"><h2 style="font-size:20px;font-weight:800;margin-bottom:12px;color:#111">KuKirin (Кукірін) — електросамокати для міста та бездоріжжя</h2><p><strong>KuKirin</strong> (також відомий як <strong>Kugoo Kirin</strong>, Кукірін, Кукирін) — один із найпопулярніших брендів електросамокатів в Україні. Бренд пропонує широку лінійку моделей: від компактних міських (<strong>KuKirin S1 Max</strong>, <strong>KuKirin A1</strong>) до потужних позашляховиків (<strong>KuKirin G2 Pro</strong>, <strong>KuKirin G3</strong>, <strong>KuKirin G4</strong>) та моделей із сидінням (<strong>KuKirin M4 Pro</strong>, <strong>KuKirin M5 Pro</strong>).</p><p style="margin-top:12px">На маркетплейсі <strong>RideGO</strong> ви можете <strong>купити електросамокат KuKirin</strong> як новий, так і б/в — від приватних продавців та магазинів по всій Україні.</p><h3 style="font-size:17px;font-weight:700;margin-top:20px;margin-bottom:10px;color:#111">Популярні моделі KuKirin</h3><ul style="margin:0;padding-left:20px;color:#444"><li><strong>KuKirin G2</strong> — 800 Вт, 48V 15Ah, до 60 км запас ходу.</li><li><strong>KuKirin G2 Pro</strong> — покращена версія з посиленою рамою.</li><li><strong>KuKirin G2 Max</strong> — 1000 Вт, 20Ah, до 70 км ходу.</li><li><strong>KuKirin G3 / G3 Pro</strong> — подвійний двигун до 1200 Вт.</li><li><strong>KuKirin G4</strong> — 2000 Вт, до 69 км/год. Флагман.</li><li><strong>KuKirin M4 Pro</strong> — з сидінням, 1500 Вт, NFC.</li><li><strong>KuKirin S1 Max</strong> — легкий 16 кг, складний.</li><li><strong>KuKirin T3</strong> — 800 Вт, золота середина.</li><li><strong>KuKirin C1 Pro</strong> — 14" колеса, до 100 км ходу.</li></ul></div>',
    faqItems: [
      { q: 'Скільки коштує електросамокат KuKirin в Україні?', a: 'Ціни починаються від ~14 000 грн (S1 Max) до ~40 000 грн (G4, G2 Master). Вживані дешевше.' },
      { q: 'Який KuKirin вибрати для міста?', a: 'KuKirin G2 (800 Вт, до 60 км) або S1 Max (16 кг). Для поганих доріг — G2 Pro.' },
      { q: 'Чим KuKirin відрізняється від Kugoo?', a: 'KuKirin — ребрендинг Kugoo Kirin. Той самий виробник, новий бренд.' },
      { q: 'Де купити оригінальний KuKirin?', a: 'На маркетплейсі RideGO — порівняйте ціни від продавців по всій Україні.' },
      { q: 'Який запас ходу у KuKirin?', a: 'S1 Max — 40 км, G2 — 60 км, G2 Max — 70 км, C1 Pro — 100 км.' }
    ],
    relatedSearches: ['купити kukirin g2','kukirin g2 pro ціна','kukirin g4 купити','kukirin m4 pro ціна','електросамокат kukirin ціна','kukirin або ninebot'],
    models: ['g2','g2-pro','g2-max','g3','g3-pro','g4','g4-max','m4-pro','m5-pro','s1-max','t3','c1-pro']
  },
  'dualtron': { name:'Dualtron', firebaseNames:['Dualtron'], category:'Електросамокати', catSlug:'elektrosamokaty', icon:'⚡', title:'Купити електросамокат Dualtron в Україні — ціни, моделі | RideGO', h1:'Електросамокати Dualtron — купити в Україні', metaDesc:'Електросамокати Dualtron — купити в Україні на RideGO. Thunder, Victor, Storm, Spider, Eagle. Нові та б/в, ціни від продавців.', keywords:'купити Dualtron, Dualtron ціна, Dualtron Thunder, Dualtron Victor, Dualtron Україна', introHtml:'<div style="background:#f0fdf4;border-radius:16px;padding:24px 28px;margin-bottom:28px;line-height:1.8;font-size:15px;color:#333"><h2 style="font-size:20px;font-weight:800;margin-bottom:12px;color:#111">Dualtron — преміальні електросамокати від Minimotors</h2><p><strong>Dualtron</strong> — це преміум-клас електросамокатів з подвійними двигунами та найвищою якістю збірки. Популярні моделі: <strong>Thunder 2</strong>, <strong>Victor</strong>, <strong>Storm</strong>, <strong>Spider 2</strong>, <strong>Eagle Pro</strong>.</p></div>', faqItems:[{q:'Скільки коштує Dualtron?',a:'Від 40 000 до 150 000 грн залежно від моделі.'},{q:'Який Dualtron для міста?',a:'Spider 2 або Eagle Pro — компактні але потужні.'}], relatedSearches:['dualtron thunder купити','dualtron victor ціна','dualtron spider 2'], models:['thunder-2','victor','storm','spider-2','eagle-pro'] },
  'xiaomi': { name:'Xiaomi', firebaseNames:['Xiaomi'], category:'Електросамокати', catSlug:'elektrosamokaty', icon:'⚡', title:'Купити електросамокат Xiaomi в Україні — ціни, моделі | RideGO', h1:'Електросамокати Xiaomi — купити в Україні', metaDesc:'Електросамокати Xiaomi Mi Electric Scooter — купити в Україні. Моделі 4, 4 Pro, 4 Ultra, 5, 5 Pro. Ціни на RideGO.', keywords:'купити Xiaomi самокат, Xiaomi електросамокат, Xiaomi Mi Scooter, Xiaomi Україна', introHtml:'<div style="background:#f0fdf4;border-radius:16px;padding:24px 28px;margin-bottom:28px;line-height:1.8;font-size:15px;color:#333"><h2 style="font-size:20px;font-weight:800;margin-bottom:12px;color:#111">Xiaomi — найпопулярніші електросамокати у світі</h2><p><strong>Xiaomi Mi Electric Scooter</strong> — лідер масового ринку. Моделі: <strong>Scooter 4</strong>, <strong>4 Pro</strong>, <strong>4 Ultra</strong>, <strong>5</strong>, <strong>5 Pro</strong>.</p></div>', faqItems:[{q:'Який Xiaomi вибрати?',a:'Для міста — Scooter 4. Для далеких поїздок — 4 Pro або 4 Ultra.'},{q:'Xiaomi або Ninebot?',a:'Xiaomi дешевший, Ninebot преміальніший. Обидва надійні.'}], relatedSearches:['xiaomi scooter 4 pro купити','xiaomi самокат ціна','xiaomi або ninebot'], models:['scooter-4','scooter-4-pro','scooter-4-ultra','scooter-5','scooter-5-pro'] },
  'ninebot': { name:'Ninebot', firebaseNames:['Ninebot','Ninebot (Segway)'], category:'Електросамокати', catSlug:'elektrosamokaty', icon:'⚡', title:'Купити електросамокат Ninebot (Segway) в Україні — ціни | RideGO', h1:'Електросамокати Ninebot — купити в Україні', metaDesc:'Електросамокати Ninebot by Segway — купити в Україні. MAX G30, G2, F2 Pro, GT3. Ціни на RideGO.', keywords:'купити Ninebot, Segway Ninebot, Ninebot MAX, Ninebot Україна, Найнбот купити', introHtml:'<div style="background:#f0fdf4;border-radius:16px;padding:24px 28px;margin-bottom:28px;line-height:1.8;font-size:15px;color:#333"><h2 style="font-size:20px;font-weight:800;margin-bottom:12px;color:#111">Ninebot by Segway — надійні електросамокати від світового лідера</h2><p><strong>Ninebot</strong> — один з найнадійніших виробників. Серія <strong>MAX G30</strong>, серія <strong>F</strong> для міста та флагман <strong>GT3</strong>.</p></div>', faqItems:[{q:'Який Ninebot вибрати?',a:'Для міста — F2 Pro. Для далеких поїздок — MAX G30. Для швидкості — GT3.'},{q:'Ninebot або Xiaomi?',a:'Ninebot преміальніший з кращою збіркою. Xiaomi доступніший.'}], relatedSearches:['ninebot max g30 купити','ninebot f2 pro ціна','ninebot gt3','segway ninebot'], models:['max-g30','f2-pro','gt3'] },
  'kaabo': { name:'Kaabo', firebaseNames:['Kaabo'], category:'Електросамокати', catSlug:'elektrosamokaty', icon:'⚡', title:'Купити електросамокат Kaabo в Україні — ціни, моделі | RideGO', h1:'Електросамокати Kaabo — купити в Україні', metaDesc:'Електросамокати Kaabo — купити в Україні. Mantis, Wolf Warrior, Wolf King. Потужні позашляхові самокати на RideGO.', keywords:'купити Kaabo, Kaabo Mantis, Kaabo Wolf Warrior, Kaabo Wolf King, Kaabo Україна', introHtml:'<div style="background:#f0fdf4;border-radius:16px;padding:24px 28px;margin-bottom:28px;line-height:1.8;font-size:15px;color:#333"><h2 style="font-size:20px;font-weight:800;margin-bottom:12px;color:#111">Kaabo — потужні позашляхові електросамокати</h2><p><strong>Kaabo</strong> — бренд для тих, хто шукає потужність. Серія <strong>Mantis</strong> для міста, <strong>Wolf Warrior</strong> та <strong>Wolf King</strong> — для бездоріжжя.</p></div>', faqItems:[{q:'Який Kaabo вибрати?',a:'Mantis 10 Pro — золота середина. Wolf King GT Pro — максимум потужності.'},{q:'Kaabo або Dualtron?',a:'Kaabo зазвичай дешевший. Dualtron має кращий сервіс.'}], relatedSearches:['kaabo mantis купити','kaabo wolf warrior ціна','kaabo wolf king'], models:['mantis-10-pro','wolf-warrior-11','wolf-king-gt-pro'] },
  'vsett': { name:'Vsett', firebaseNames:['Vsett'], category:'Електросамокати', catSlug:'elektrosamokaty', icon:'⚡', title:'Купити електросамокат Vsett в Україні — ціни | RideGO', h1:'Електросамокати Vsett — купити в Україні', metaDesc:'Електросамокати Vsett — купити в Україні. Vsett 10+, 11+, 9+. Відмінне співвідношення ціна/якість на RideGO.', keywords:'купити Vsett, Vsett 10+, Vsett 11+, Vsett Україна', introHtml:'<div style="background:#f0fdf4;border-radius:16px;padding:24px 28px;margin-bottom:28px;line-height:1.8;font-size:15px;color:#333"><h2 style="font-size:20px;font-weight:800;margin-bottom:12px;color:#111">Vsett — потужні самокати з відмінним ціна/якість</h2><p><strong>Vsett</strong> швидко набирає популярність. <strong>Vsett 10+</strong>, <strong>11+</strong> та <strong>9+</strong> конкурують з Dualtron та Kaabo за нижчу ціну.</p></div>', faqItems:[{q:'Який Vsett найкращий?',a:'Vsett 10+ — найпопулярніший. 11+ — флагман. 9+ — золота середина.'}], relatedSearches:['vsett 10+ купити','vsett 11+ ціна','vsett або dualtron'], models:['10-plus','11-plus','9-plus'] },
  'ausom': {
    name: 'Ausom', firebaseNames: ['Ausom','AUSOM'], category: 'Електросамокати', catSlug: 'elektrosamokaty', icon: '⚡',
    title: 'Купити електросамокат Ausom в Україні — ціни, моделі | RideGO',
    h1: 'Електросамокати Ausom — купити в Україні',
    metaDesc: 'Електросамокати Ausom — купити в Україні на маркетплейсі RideGO. Моделі L1, L2, L2 Max, DT2 Pro. Потужні самокати з двигунами від 2200 Вт. Нові та б/в, ціни від продавців по всій Україні.',
    keywords: 'купити Ausom, Ausom ціна, електросамокат Ausom, Ausom L2, Ausom L2 Max, Ausom DT2 Pro, Ausom Україна, Ausom Київ',
    introHtml: '<div style="background:#f0fdf4;border-radius:16px;padding:24px 28px;margin-bottom:28px;line-height:1.8;font-size:15px;color:#333"><h2 style="font-size:20px;font-weight:800;margin-bottom:12px;color:#111">Ausom — потужні електросамокати для міста та бездоріжжя</h2><p><strong>Ausom</strong> — бренд електросамокатів преміум-класу, що швидко набирає популярність в Україні. Відомий моделями з потужними двигунами та великим запасом ходу: <strong>Ausom L1</strong>, <strong>Ausom L2</strong>, <strong>Ausom L2 Max</strong>, <strong>Ausom DT2 Pro</strong>.</p><p style="margin-top:12px">На маркетплейсі <strong>RideGO</strong> ви можете <strong>купити електросамокат Ausom</strong> як новий, так і б/в — від приватних продавців та магазинів по всій Україні.</p><h3 style="font-size:17px;font-weight:700;margin-top:20px;margin-bottom:10px;color:#111">Популярні моделі Ausom</h3><ul style="margin:0;padding-left:20px;color:#444"><li><strong>Ausom L1</strong> — 1000 Вт, доступна ціна, міський самокат.</li><li><strong>Ausom L2</strong> — 2200 Вт, два двигуни, запас ходу до 80 км.</li><li><strong>Ausom L2 Max</strong> — покращена версія L2 з більшою батареєю.</li><li><strong>Ausom DT2 Pro</strong> — 2×1100 Вт, 52V 23.4Ah, до 115 км ходу.</li></ul></div>',
    faqItems: [
      { q: 'Скільки коштує електросамокат Ausom в Україні?', a: 'Ціни на Ausom починаються від ~25 000 грн (L1) до ~50 000 грн (L2 Max, DT2 Pro). Вживані дешевше.' },
      { q: 'Який Ausom вибрати для міста?', a: 'Ausom L1 або L2 — потужні, але не надто важкі. DT2 Pro — для тих хто хоче максимум.' },
      { q: 'Де купити оригінальний Ausom в Україні?', a: 'На маркетплейсі RideGO — порівняйте ціни від продавців по всій Україні.' },
      { q: 'Який запас ходу у Ausom?', a: 'L1 — до 50 км, L2 — до 80 км, DT2 Pro — до 115 км.' }
    ],
    relatedSearches: ['ausom l2 купити','ausom dt2 pro ціна','ausom l2 max купити','ausom або kukirin','ausom електросамокат україна'],
    models: ['l1','l2','l2-max','dt2-pro']
  }};

// ─── MODELS (SEO сторінки під кожну модель) ───
const MODELS = {
  'kukirin-g2':     { brand:'kukirin', model:'G2', searchTerms:['G2','Kirin G2'], power:'800W', battery:'48V 15Ah', range:'60 км', speed:'45 км/год', weight:'24 кг', title:'KuKirin G2 — купити в Україні ⚡ ціна 2026, характеристики | RideGO', h1:'Електросамокат KuKirin G2 — купити в Україні', metaDesc:'Купити електросамокат KuKirin G2 (800W, 48V 15Ah) в Україні. Ціна, характеристики, відгуки. Запас ходу до 60 км. Нові та б/в на маркетплейсі RideGO.', text:'KuKirin G2 — універсальний міський електросамокат з двигуном 800 Вт та батареєю 48V 15Ah. Запас ходу до 60 км, максимальна швидкість 45 км/год. 10-дюймові пневматичні шини забезпечують комфортну їзду по будь-якому покриттю. Оновлена версія 2025 року отримала збільшені гальмівні диски (160 мм), посилений задній крило та водозахисну платформу.' },
  'kukirin-g2-pro': { brand:'kukirin', model:'G2 Pro', searchTerms:['G2 Pro','G2Pro','Kirin G2 Pro'], power:'600W', battery:'48V 15Ah', range:'55 км', speed:'45 км/год', weight:'23 кг', title:'KuKirin G2 Pro — купити в Україні ⚡ ціна, відгуки | RideGO', h1:'Електросамокат KuKirin G2 Pro — купити в Україні', metaDesc:'Купити KuKirin G2 Pro в Україні. 600W, 48V 15Ah, до 55 км ходу. Покращена амортизація та гальма. Ціни на RideGO.', text:'KuKirin G2 Pro — покращена версія G2 з посиленою рамою, збільшеними гальмівними дисками та покращеною підвіскою. Двигун 600 Вт забезпечує впевнений розгін, а батарея 15Ah — до 55 км ходу.' },
  'kukirin-g2-max': { brand:'kukirin', model:'G2 Max', searchTerms:['G2 Max','G2Max','Kirin G2 Max'], power:'1000W', battery:'48V 20Ah', range:'70 км', speed:'55 км/год', weight:'28 кг', title:'KuKirin G2 Max — купити в Україні ⚡ ціна 2026 | RideGO', h1:'Електросамокат KuKirin G2 Max — купити в Україні', metaDesc:'KuKirin G2 Max (1000W, 20Ah) — купити в Україні. До 70 км ходу, 55 км/год. Ціни від продавців на RideGO.', text:'KuKirin G2 Max — версія з максимальним запасом ходу в лінійці G2. Потужний двигун 1000 Вт, батарея 48V 20Ah забезпечує до 70 км на одному заряді. Ідеальний для далеких поїздок та приміських маршрутів.' },
  'kukirin-g3':     { brand:'kukirin', model:'G3', searchTerms:['G3','Kirin G3'], power:'1200W', battery:'52V 18Ah', range:'60 км', speed:'50 км/год', weight:'27 кг', title:'KuKirin G3 — купити в Україні ⚡ ціна, характеристики | RideGO', h1:'Електросамокат KuKirin G3 — купити в Україні', metaDesc:'KuKirin G3 (1200W, 52V 18Ah) — купити в Україні. Потужний позашляховик з подвійним двигуном. Ціни на RideGO.', text:'KuKirin G3 — потужний позашляховий електросамокат з двигуном 1200 Вт. Батарея 52V 18Ah, запас ходу до 60 км. Великі пневматичні шини та подвійна амортизація для бездоріжжя.' },
  'kukirin-g3-pro': { brand:'kukirin', model:'G3 Pro', searchTerms:['G3 Pro','G3Pro'], power:'1200W×2', battery:'52V 18Ah', range:'70 км', speed:'50 км/год', weight:'32 кг', title:'KuKirin G3 Pro — купити в Україні ⚡ ціна | RideGO', h1:'Електросамокат KuKirin G3 Pro — купити в Україні', metaDesc:'KuKirin G3 Pro — повнопривідний (2×1200W). Купити в Україні, ціни на RideGO.', text:'KuKirin G3 Pro — повнопривідна версія з подвійним двигуном (2×1200 Вт). До 70 км ходу, просунута система амортизації. Створений для бездоріжжя та складних умов.' },
  'kukirin-g4':     { brand:'kukirin', model:'G4', searchTerms:['G4','Kirin G4'], power:'2000W', battery:'60V 20Ah', range:'70 км', speed:'69 км/год', weight:'35 кг', title:'KuKirin G4 — купити в Україні ⚡ ціна 2026, наявність | RideGO', h1:'Електросамокат KuKirin G4 — купити в Україні', metaDesc:'Купити KuKirin G4 (2000W, 60V 20Ah) в Україні. Швидкість до 69 км/год, запас ходу 70 км. Ціни, наявність, доставка на RideGO.', text:'KuKirin G4 — флагманський електросамокат бренду. Потужний задній двигун 2000 Вт, батарея 60V 20Ah, максимальна швидкість до 69 км/год. Гідравлічна підвіска, гідравлічні гальма, 10-дюймові позашляхові шини. Це серйозний апарат для досвідчених райдерів.' },
  'kukirin-g4-max': { brand:'kukirin', model:'G4 Max', searchTerms:['G4 Max','G4Max'], power:'2000W', battery:'60V 28Ah', range:'90 км', speed:'69 км/год', weight:'38 кг', title:'KuKirin G4 Max — купити в Україні ⚡ ціна | RideGO', h1:'Електросамокат KuKirin G4 Max — купити в Україні', metaDesc:'KuKirin G4 Max (2000W, 28Ah) — до 90 км ходу. Купити в Україні на RideGO.', text:'KuKirin G4 Max — версія G4 зі збільшеною батареєю 28Ah. До 90 км ходу на одному заряді, гідравлічна підвіска та гальма.' },
  'kukirin-m4-pro': { brand:'kukirin', model:'M4 Pro', searchTerms:['M4 Pro','M4Pro','Kirin M4 Pro','M4 PRO'], power:'1500W', battery:'48V 21Ah', range:'65 км', speed:'50 км/год', weight:'30 кг', title:'KuKirin M4 Pro — купити в Україні ⚡ з сидінням | RideGO', h1:'Електросамокат KuKirin M4 Pro — купити в Україні', metaDesc:'KuKirin M4 Pro з сидінням (1500W, 21Ah) — купити в Україні. NFC-ключ, до 65 км ходу. Ціни на RideGO.', text:'KuKirin M4 Pro — електросамокат з сидінням для комфортних тривалих поїздок. Двигун 1500 Вт, батарея 48V 21Ah, NFC-ключ для захисту від крадіжки. Знімне сидіння, LED-фари.' },
  'kukirin-s1-max': { brand:'kukirin', model:'S1 Max', searchTerms:['S1 Max','S1Max','Kirin S1 Max'], power:'350W', battery:'36V 10.4Ah', range:'40 км', speed:'25 км/год', weight:'16 кг', title:'KuKirin S1 Max — купити в Україні ⚡ легкий, складний | RideGO', h1:'Електросамокат KuKirin S1 Max — купити в Україні', metaDesc:'KuKirin S1 Max (350W, 16 кг) — легкий складний електросамокат. Купити в Україні, ціни на RideGO.', text:'KuKirin S1 Max — компактний та легкий електросамокат вагою лише 16 кг. Двигун 350 Вт, батарея 36V 10.4Ah, до 40 км ходу. Ідеальний для щоденних міських поїздок та останньої милі.' },
  'kukirin-t3':     { brand:'kukirin', model:'T3', searchTerms:['T3','Kirin T3'], power:'800W', battery:'48V 15.6Ah', range:'55 км', speed:'45 км/год', weight:'22 кг', title:'KuKirin T3 — купити в Україні ⚡ ціна, огляд | RideGO', h1:'Електросамокат KuKirin T3 — купити в Україні', metaDesc:'KuKirin T3 (800W, 15.6Ah) — купити в Україні. Золота середина ціна/якість. Ціни на RideGO.', text:'KuKirin T3 — збалансований електросамокат з двигуном 800 Вт та батареєю 15.6Ah. 10-дюймові пневматичні колеса, подвійна амортизація. Відмінне співвідношення ціна/якість.' },
  'kukirin-c1-pro': { brand:'kukirin', model:'C1 Pro', searchTerms:['C1 Pro','C1Pro','Kirin C1 Pro'], power:'500W', battery:'48V 26Ah', range:'100 км', speed:'40 км/год', weight:'28 кг', title:'KuKirin C1 Pro — купити в Україні ⚡ до 100 км ходу | RideGO', h1:'Електросамокат KuKirin C1 Pro — купити в Україні', metaDesc:'KuKirin C1 Pro (500W, 26Ah, 14" колеса) — до 100 км ходу. Купити в Україні на RideGO.', text:'KuKirin C1 Pro — електросамокат з великими 14-дюймовими колесами та рекордною батареєю 26Ah. До 100 км ходу на одному заряді. Ідеальний для далеких комфортних поїздок.' },
  'kukirin-m5-pro': { brand:'kukirin', model:'M5 Pro', searchTerms:['M5 Pro','M5Pro','Kirin M5 Pro','M5 PRO'], power:'2000W', battery:'48V 26Ah', range:'70 км', speed:'55 км/год', weight:'35 кг', title:'KuKirin M5 Pro — купити в Україні ⚡ потужний | RideGO', h1:'Електросамокат KuKirin M5 Pro — купити в Україні', metaDesc:'KuKirin M5 Pro (2000W, 26Ah) — потужний електросамокат з сидінням. Купити в Україні на RideGO.', text:'KuKirin M5 Pro — потужний електросамокат з сидінням. Двигун 2000 Вт, батарея 48V 26Ah. До 70 км ходу, швидкість до 55 км/год.' },
  'dualtron-thunder-2': { brand:'dualtron', model:'Thunder 2', searchTerms:['Thunder 2','Thunder2','Thunder 2 Ultra'], power:'2×2700W', battery:'72V 35Ah', range:'120 км', speed:'100 км/год', weight:'47 кг', title:'Dualtron Thunder 2 — купити в Україні ⚡ ціна | RideGO', h1:'Електросамокат Dualtron Thunder 2 — купити в Україні', metaDesc:'Dualtron Thunder 2 (2×2700W, 72V 35Ah) — купити в Україні. Швидкість до 100 км/год, запас ходу 120 км. RideGO.', text:'Dualtron Thunder 2 — флагман Minimotors з двома двигунами по 2700 Вт. Швидкість до 100 км/год, батарея 72V 35Ah забезпечує до 120 км ходу.' },
  'dualtron-victor': { brand:'dualtron', model:'Victor', searchTerms:['Victor','Victor Luxury'], power:'2×1200W', battery:'60V 24.5Ah', range:'80 км', speed:'70 км/год', weight:'35 кг', title:'Dualtron Victor — купити в Україні ⚡ ціна | RideGO', h1:'Електросамокат Dualtron Victor — купити в Україні', metaDesc:'Dualtron Victor (2×1200W, 60V) — купити в Україні. Збалансований преміум-самокат. RideGO.', text:'Dualtron Victor — збалансований преміум-самокат з двома двигунами по 1200 Вт. Батарея 60V 24.5Ah, запас ходу до 80 км.' },
  'dualtron-storm': { brand:'dualtron', model:'Storm', searchTerms:['Storm'], power:'2×3600W', battery:'72V 31.5Ah', range:'100 км', speed:'100 км/год', weight:'46 кг', title:'Dualtron Storm — купити в Україні ⚡ | RideGO', h1:'Електросамокат Dualtron Storm — купити в Україні', metaDesc:'Dualtron Storm (2×3600W) — один з найпотужніших електросамокатів. Купити в Україні на RideGO.', text:'Dualtron Storm — монстр потужності з двома двигунами по 3600 Вт. Швидкість до 100 км/год, запас ходу до 100 км.' },
  'dualtron-spider-2': { brand:'dualtron', model:'Spider 2', searchTerms:['Spider 2','Spider2'], power:'2×800W', battery:'60V 24.5Ah', range:'70 км', speed:'60 км/год', weight:'24 кг', title:'Dualtron Spider 2 — купити в Україні ⚡ | RideGO', h1:'Електросамокат Dualtron Spider 2 — купити в Україні', metaDesc:'Dualtron Spider 2 — легкий та потужний (24 кг). Купити в Україні на RideGO.', text:'Dualtron Spider 2 — найлегший у лінійці Dualtron (24 кг) при двох двигунах по 800 Вт. Ідеальний для міста з преміум-якістю.' },
  'dualtron-eagle-pro': { brand:'dualtron', model:'Eagle Pro', searchTerms:['Eagle Pro','Eagle'], power:'1800W', battery:'60V 22.5Ah', range:'60 км', speed:'60 км/год', weight:'28 кг', title:'Dualtron Eagle Pro — купити в Україні ⚡ | RideGO', h1:'Електросамокат Dualtron Eagle Pro — купити в Україні', metaDesc:'Dualtron Eagle Pro (1800W) — купити в Україні на RideGO.', text:'Dualtron Eagle Pro — один з найпопулярніших самокатів Dualtron. Двигун 1800 Вт, запас ходу до 60 км.' },
  'xiaomi-scooter-4': { brand:'xiaomi', model:'Mi Scooter 4', searchTerms:['Scooter 4','Mi Electric Scooter 4','Mi Scooter 4'], power:'300W', battery:'36V 10Ah', range:'35 км', speed:'25 км/год', weight:'14 кг', title:'Xiaomi Mi Scooter 4 — купити в Україні ⚡ ціна | RideGO', h1:'Електросамокат Xiaomi Mi Scooter 4 — купити в Україні', metaDesc:'Xiaomi Mi Electric Scooter 4 (300W) — купити в Україні. Легкий, надійний, доступний. Ціни на RideGO.', text:'Xiaomi Mi Electric Scooter 4 — надійний міський самокат вагою 14 кг. Двигун 300 Вт, до 35 км ходу.' },
  'xiaomi-scooter-4-pro': { brand:'xiaomi', model:'Mi Scooter 4 Pro', searchTerms:['Scooter 4 Pro','4 Pro','Mi Electric Scooter 4 Pro','Mi Scooter 4 Pro'], power:'400W', battery:'36V 12.4Ah', range:'45 км', speed:'25 км/год', weight:'16.5 кг', title:'Xiaomi Mi Scooter 4 Pro — купити в Україні ⚡ | RideGO', h1:'Електросамокат Xiaomi Mi Scooter 4 Pro — купити в Україні', metaDesc:'Xiaomi Mi Scooter 4 Pro (400W, 45 км ходу) — купити в Україні на RideGO.', text:'Xiaomi Mi Scooter 4 Pro — покращена версія з двигуном 400 Вт та батареєю 12.4Ah для до 45 км ходу. 10-дюймові безкамерні шини.' },
  'xiaomi-scooter-4-ultra': { brand:'xiaomi', model:'Mi Scooter 4 Ultra', searchTerms:['4 Ultra','Scooter 4 Ultra','Mi Electric Scooter 4 Ultra'], power:'500W', battery:'48V 11.4Ah', range:'70 км', speed:'25 км/год', weight:'24 кг', title:'Xiaomi Mi Scooter 4 Ultra — купити в Україні ⚡ | RideGO', h1:'Електросамокат Xiaomi Mi Scooter 4 Ultra — купити в Україні', metaDesc:'Xiaomi Mi Scooter 4 Ultra (500W, 70 км ходу) — флагман Xiaomi. Купити в Україні на RideGO.', text:'Xiaomi Mi Scooter 4 Ultra — флагман лінійки з двигуном 500 Вт та рекордним запасом ходу до 70 км.' },
  'xiaomi-scooter-5': { brand:'xiaomi', model:'Mi Scooter 5', searchTerms:['Scooter 5','Mi Electric Scooter 5','Mi Scooter 5'], power:'400W', battery:'36V 12.8Ah', range:'40 км', speed:'25 км/год', weight:'15 кг', title:'Xiaomi Mi Scooter 5 — купити в Україні ⚡ 2026 | RideGO', h1:'Електросамокат Xiaomi Mi Scooter 5 — купити в Україні', metaDesc:'Xiaomi Mi Electric Scooter 5 (2025) — нова модель. Купити в Україні на RideGO.', text:'Xiaomi Mi Scooter 5 — нова модель 2025 року з покращеним двигуном 400 Вт та оновленою батареєю.' },
  'xiaomi-scooter-5-pro': { brand:'xiaomi', model:'Mi Scooter 5 Pro', searchTerms:['Scooter 5 Pro','5 Pro','Mi Electric Scooter 5 Pro'], power:'500W', battery:'48V 12.8Ah', range:'50 км', speed:'25 км/год', weight:'17 кг', title:'Xiaomi Mi Scooter 5 Pro — купити в Україні ⚡ | RideGO', h1:'Електросамокат Xiaomi Mi Scooter 5 Pro — купити в Україні', metaDesc:'Xiaomi Mi Scooter 5 Pro (500W, 50 км ходу) — купити в Україні на RideGO.', text:'Xiaomi Mi Scooter 5 Pro — топова версія 5-ї серії з 500 Вт двигуном та запасом ходу до 50 км.' },
  'ninebot-max-g30': { brand:'ninebot', model:'MAX G30', searchTerms:['MAX G30','G30','Ninebot Max','MAX G30E'], power:'350W', battery:'36V 15.3Ah', range:'65 км', speed:'30 км/год', weight:'19.1 кг', title:'Ninebot MAX G30 — купити в Україні ⚡ ціна | RideGO', h1:'Електросамокат Ninebot MAX G30 — купити в Україні', metaDesc:'Ninebot MAX G30 (350W, 65 км ходу) — легендарний самокат. Купити в Україні на RideGO.', text:'Ninebot MAX G30 — легендарний електросамокат з рекордним запасом ходу 65 км. Двигун 350 Вт, 10-дюймові безкамерні шини.' },
  'ninebot-f2-pro': { brand:'ninebot', model:'F2 Pro', searchTerms:['F2 Pro','F2Pro','F2 Pro E'], power:'400W', battery:'36V 12.8Ah', range:'40 км', speed:'25 км/год', weight:'16 кг', title:'Ninebot F2 Pro — купити в Україні ⚡ | RideGO', h1:'Електросамокат Ninebot F2 Pro — купити в Україні', metaDesc:'Ninebot F2 Pro (400W, 40 км ходу) — міський самокат. Купити в Україні на RideGO.', text:'Ninebot F2 Pro — сучасний міський самокат з двигуном 400 Вт та 10-дюймовими колесами.' },
  'ninebot-gt3': { brand:'ninebot', model:'GT3', searchTerms:['GT3','Ninebot GT3','Segway GT3'], power:'2×1500W', battery:'72V 18Ah', range:'60 км', speed:'70 км/год', weight:'40 кг', title:'Ninebot GT3 — купити в Україні ⚡ флагман | RideGO', h1:'Електросамокат Ninebot GT3 — купити в Україні', metaDesc:'Ninebot GT3 (2×1500W, 70 км/год) — флагман Segway-Ninebot. Купити в Україні на RideGO.', text:'Ninebot GT3 — флагманський самокат Segway-Ninebot з двома двигунами по 1500 Вт та швидкістю до 70 км/год.' },
  'kaabo-mantis-10-pro': { brand:'kaabo', model:'Mantis 10 Pro', searchTerms:['Mantis 10 Pro','Mantis 10','Mantis Pro'], power:'2×1000W', battery:'60V 18.2Ah', range:'60 км', speed:'60 км/год', weight:'26 кг', title:'Kaabo Mantis 10 Pro — купити в Україні ⚡ | RideGO', h1:'Електросамокат Kaabo Mantis 10 Pro — купити в Україні', metaDesc:'Kaabo Mantis 10 Pro (2×1000W) — збалансований потужний самокат. Купити в Україні на RideGO.', text:'Kaabo Mantis 10 Pro — популярний самокат з двома двигунами по 1000 Вт. Золота середина між потужністю та вагою.' },
  'kaabo-wolf-warrior-11': { brand:'kaabo', model:'Wolf Warrior 11', searchTerms:['Wolf Warrior 11','Wolf Warrior','WW11'], power:'2×1200W', battery:'60V 26Ah', range:'70 км', speed:'80 км/год', weight:'40 кг', title:'Kaabo Wolf Warrior 11 — купити в Україні ⚡ | RideGO', h1:'Електросамокат Kaabo Wolf Warrior 11 — купити в Україні', metaDesc:'Kaabo Wolf Warrior 11 — позашляховий самокат з двома двигунами. Купити в Україні на RideGO.', text:'Kaabo Wolf Warrior 11 — позашляховий монстр з 11-дюймовими колесами та двома двигунами по 1200 Вт.' },
  'kaabo-wolf-king-gt-pro': { brand:'kaabo', model:'Wolf King GT Pro', searchTerms:['Wolf King GT Pro','Wolf King','Wolf King GT'], power:'2×1500W', battery:'72V 35Ah', range:'100 км', speed:'90 км/год', weight:'50 кг', title:'Kaabo Wolf King GT Pro — купити в Україні ⚡ | RideGO', h1:'Електросамокат Kaabo Wolf King GT Pro — купити в Україні', metaDesc:'Kaabo Wolf King GT Pro — найпотужніший Kaabo. Купити в Україні на RideGO.', text:'Kaabo Wolf King GT Pro — найпотужніший самокат лінійки з двома двигунами по 1500 Вт та батареєю 72V 35Ah.' },
  'vsett-10-plus': { brand:'vsett', model:'10+', searchTerms:['10+','Vsett 10','Vsett 10+','10 Plus'], power:'2×1000W', battery:'60V 20.8Ah', range:'70 км', speed:'65 км/год', weight:'30 кг', title:'Vsett 10+ — купити в Україні ⚡ ціна | RideGO', h1:'Електросамокат Vsett 10+ — купити в Україні', metaDesc:'Vsett 10+ (2×1000W, 70 км ходу) — найпопулярніший Vsett. Купити в Україні на RideGO.', text:'Vsett 10+ — найпопулярніший самокат бренду з двома двигунами по 1000 Вт. Відмінне співвідношення ціна/якість.' },
  'vsett-11-plus': { brand:'vsett', model:'11+', searchTerms:['11+','Vsett 11','Vsett 11+','11 Plus'], power:'2×1400W', battery:'60V 28Ah', range:'90 км', speed:'75 км/год', weight:'36 кг', title:'Vsett 11+ — купити в Україні ⚡ | RideGO', h1:'Електросамокат Vsett 11+ — купити в Україні', metaDesc:'Vsett 11+ (2×1400W, 90 км ходу) — флагман. Купити в Україні на RideGO.', text:'Vsett 11+ — флагман бренду з 11-дюймовими колесами та двома двигунами по 1400 Вт.' },
  'vsett-9-plus': { brand:'vsett', model:'9+', searchTerms:['9+','Vsett 9','Vsett 9+','9 Plus'], power:'2×650W', battery:'52V 15.6Ah', range:'50 км', speed:'50 км/год', weight:'22 кг', title:'Vsett 9+ — купити в Україні ⚡ | RideGO', h1:'Електросамокат Vsett 9+ — купити в Україні', metaDesc:'Vsett 9+ — збалансований самокат. Купити в Україні на RideGO.', text:'Vsett 9+ — золота середина з двома двигунами по 650 Вт та вагою 22 кг.' },
  'ausom-l1': { brand:'ausom', model:'L1', searchTerms:['Ausom L1','L1','AUSOM L1'], power:'1000W', battery:'48V 15Ah', range:'50 км', speed:'45 км/год', weight:'22 кг',
    title:'Ausom L1 — купити в Україні ⚡ ціна 2026 | RideGO', h1:'Ausom L1 — купити в Україні',
    metaDesc:'Купити Ausom L1 (1000W, 15Ah) в Україні. До 50 км ходу, 45 км/год. Нові та б/в на RideGO.',
    text:'Ausom L1 — доступний електросамокат бренду Ausom з двигуном 1000 Вт. Батарея 48V 15Ah, запас ходу до 50 км. Ідеальний для щоденних міських поїздок.' },
  'ausom-l2': { brand:'ausom', model:'L2', searchTerms:['Ausom L2','L2','AUSOM L2'], power:'2200W', battery:'48V 20.8Ah', range:'80 км', speed:'55 км/год', weight:'32 кг',
    title:'Ausom L2 — купити в Україні ⚡ ціна 2026 | RideGO', h1:'Ausom L2 — купити в Україні',
    metaDesc:'Купити Ausom L2 (2200W, 20.8Ah) в Україні. Потужний двомоторний самокат. Нові та б/в на RideGO.',
    text:'Ausom L2 — потужний двомоторний електросамокат з піковою потужністю 2200 Вт. Батарея 48V 20.8Ah, запас ходу до 80 км, максимальна швидкість 55 км/год. Гідравлічна підвіска, великі 10дюймові пневматичні колеса.' },
  'ausom-l2-max': { brand:'ausom', model:'L2 Max', searchTerms:['Ausom L2 Max','L2 Max','L2Max','AUSOM L2 Max'], power:'2×1100W', battery:'48V 20.8Ah', range:'90 км', speed:'60 км/год', weight:'34 кг',
    title:'Ausom L2 Max — купити в Україні ⚡ | RideGO', h1:'Ausom L2 Max — купити в Україні',
    metaDesc:'Купити Ausom L2 Max (2×1100W, 20.8Ah) в Україні. До 90 км ходу, 60 км/год. Нові та б/в на RideGO.',
    text:'Ausom L2 Max — покращена версія L2 з подвійними двигунами (2×1100 Вт) та збільшеним запасом ходу до 90 км. Гідравлічна підвіска та дискові гальма.' },
  'ausom-dt2-pro': { brand:'ausom', model:'DT2 Pro', searchTerms:['Ausom DT2 Pro','DT2 Pro','DT2Pro','AUSOM DT2'], power:'2×1100W', battery:'52V 23.4Ah', range:'115 км', speed:'60 км/год', weight:'37 кг',
    title:'Ausom DT2 Pro — купити в Україні ⚡ до 115 км | RideGO', h1:'Ausom DT2 Pro — купити в Україні',
    metaDesc:'Купити Ausom DT2 Pro (2×1100W, 52V 23.4Ah) в Україні. До 115 км ходу, 60 км/год. Флагман Ausom на RideGO.',
    text:'Ausom DT2 Pro — флагман Ausom з рекордним запасом ходу до 115 км. Подвійний двигун 2×1100 Вт, батарея 52V 23.4Ah. Ідеальний для далеких поїздок та позаміських маршрутів.' }};

function escHtml(str) { return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

async function getListingsByCategory(catName) {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`;
    const body = { structuredQuery: { from:[{collectionId:'listings'}], where:{compositeFilter:{op:'AND',filters:[{fieldFilter:{field:{fieldPath:'cat'},op:'EQUAL',value:{stringValue:catName}}},{fieldFilter:{field:{fieldPath:'status'},op:'EQUAL',value:{stringValue:'active'}}}]}}, orderBy:[{field:{fieldPath:'createdAt'},direction:'DESCENDING'}], limit:20 } };
    const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
    if (!res.ok) return [];
    const data = await res.json();
    return data.filter(d=>d.document).map(d=>{ const f=d.document.fields||{}; const id=d.document.name.split('/').pop(); return { id, title:f.title?.stringValue||'', price:f.price?.integerValue||f.price?.doubleValue||'', city:f.city?.stringValue||'', condition:f.condition?.stringValue||'', img:f.img?.stringValue||'' }; });
  } catch(e) { return []; }
}

async function getListingsByBrand(brandNames, limit) {
  const all=[]; const seen=new Set();
  for (const bn of brandNames) {
    try {
      const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`;
      const body = { structuredQuery: { from:[{collectionId:'listings'}], where:{compositeFilter:{op:'AND',filters:[{fieldFilter:{field:{fieldPath:'status'},op:'EQUAL',value:{stringValue:'active'}}},{fieldFilter:{field:{fieldPath:'brand'},op:'EQUAL',value:{stringValue:bn}}}]}}, limit:limit||30 } };
      const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
      if (res.ok) { const data=await res.json(); data.filter(d=>d.document).forEach(d=>{ const id=d.document.name.split('/').pop(); if(!seen.has(id)){seen.add(id); const f=d.document.fields||{}; all.push({id,title:f.title?.stringValue||'',price:f.price?.integerValue||f.price?.doubleValue||'',city:f.city?.stringValue||'',condition:f.condition?.stringValue||'',img:f.img?.stringValue||''});} }); }
    } catch(e) {}
  }
  return all.slice(0,limit||30);
}

async function getListingsByModel(brandNames, searchTerms, limit) {
  const all = await getListingsByBrand(brandNames, 100);
  const terms = searchTerms.map(t => t.toLowerCase());
  const filtered = all.filter(l => { const t = l.title.toLowerCase(); return terms.some(term => t.includes(term.toLowerCase())); });
  return filtered.slice(0, limit || 20);
}

function getParam(req,key) { if(req.query&&req.query[key]) return req.query[key]; try{ const qs=(req.url||'').split('?')[1]||''; for(const p of qs.split('&')){const[k,v]=p.split('='); if(decodeURIComponent(k||'')===key) return decodeURIComponent(v||'');} }catch(e){} return ''; }

function card(l) { const price=l.price?Number(l.price).toLocaleString('uk')+' грн':''; return `<article style="border:1px solid #eee;border-radius:12px;overflow:hidden">${l.img?`<a href="${BASE}/listing/${l.id}"><img src="${escHtml(l.img)}" alt="${escHtml(l.title+(l.city?' купити в '+l.city:''))}" width="400" height="240" loading="lazy" style="width:100%;height:160px;object-fit:cover;display:block"></a>`:''}<div style="padding:12px"><a href="${BASE}/listing/${l.id}" style="font-weight:700;color:#111;text-decoration:none;font-size:15px;display:block;margin-bottom:4px">${escHtml(l.title)}</a>${price?`<div style="color:#1db954;font-weight:800;font-size:16px;margin-bottom:4px">${price}</div>`:''}<div style="color:#888;font-size:13px">${escHtml(l.city)}${l.condition?' · '+escHtml(l.condition):''}</div></div></article>`; }

function shell(head,body) { return `<!DOCTYPE html><html lang="uk"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">${head}<link rel="icon" type="image/svg+xml" href="/favicon.svg"><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;max-width:980px;margin:0 auto;padding:20px;color:#222;background:#fff}header{padding:16px 0;border-bottom:2px solid #1db954;margin-bottom:20px}header a{font-size:26px;font-weight:800;color:#111;text-decoration:none}header a span{color:#1db954}.bc{font-size:13px;color:#888;margin-bottom:20px}.bc a{color:#1db954;text-decoration:none}.bc span{margin:0 5px;color:#ccc}h1{font-size:clamp(22px,4vw,34px);font-weight:800;margin-bottom:8px;color:#111}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px;margin-bottom:32px}footer{padding:20px 0;border-top:1px solid #eee;font-size:13px;color:#999;text-align:center;margin-top:32px}footer a{color:#1db954;text-decoration:none;margin:0 8px}details summary{list-style:none}details summary::-webkit-details-marker{display:none}details summary::before{content:'▸ ';color:#1db954}details[open] summary::before{content:'▾ '}.specs{border-collapse:collapse;width:100%;margin-bottom:20px;font-size:15px}.specs td{padding:10px 12px;border-bottom:1px solid #f0f0f0}.specs td:first-child{color:#888;width:140px}.specs td:last-child{font-weight:600}</style></head><body><header><a href="${BASE}">Ride<span>GO</span></a></header>${body}<footer><span>© 2024–2026 RideGO</span><a href="${BASE}">Головна</a><a href="${BASE}/catalog">Каталог</a><a href="${BASE}/category/elektrosamokaty">Електросамокати</a><a href="${BASE}/news">Новини</a><a href="${BASE}/faq">FAQ</a></footer></body></html>`; }

async function getListingsFiltered(catFilter, opts) {
  const all = await getListingsByCategory(catFilter);
  let result = all;
  if (opts.city) result = result.filter(l => l.city === opts.city);
  if (opts.titleFilter) { const tf = opts.titleFilter.map(t=>t.toLowerCase()); result = result.filter(l => { const t=l.title.toLowerCase(); return tf.some(f=>t.includes(f)); }); }
  if (opts.priceMax) result = result.filter(l => l.price && Number(l.price) <= opts.priceMax);
  return result;
}
// ════════════════════════════════════════════════════════════════
const PAGES = {
  // ─── SELLING ───
  'prodaty-elektrosamokat': {
    type:'sell', catFilter:'Електросамокати',
    title:'Продати електросамокат в Україні — безкоштовне оголошення | RideGO',
    h1:'Продати електросамокат в Україні',
    metaDesc:'Продати електросамокат швидко та безкоштовно на RideGO. Розмістіть оголошення за 2 хвилини — тисячі покупців шукають електросамокати щодня.',
    introHtml:'<div style="background:#f0fdf4;border-radius:16px;padding:24px 28px;margin-bottom:28px;line-height:1.8;font-size:15px;color:#333"><h2 style="font-size:20px;font-weight:800;margin-bottom:12px;color:#111">Як продати електросамокат на RideGO?</h2><p>RideGO — спеціалізований маркетплейс електротранспорту України. Тут шукають саме електросамокати, тому ваше оголошення побачать цільові покупці.</p><h3 style="font-size:17px;font-weight:700;margin-top:16px;margin-bottom:8px">3 кроки до продажу:</h3><ol style="padding-left:20px;color:#444"><li><strong>Зареєструйтесь</strong> — через Google або email, 30 секунд</li><li><strong>Додайте оголошення</strong> — фото, опис, ціна, характеристики</li><li><strong>Отримайте покупця</strong> — прямий чат без посередників</li></ol><h3 style="font-size:17px;font-weight:700;margin-top:16px;margin-bottom:8px">Поради для швидкого продажу:</h3><ul style="padding-left:20px;color:#444"><li>Додайте 5+ якісних фото (загальний вигляд, деталі, пробіг на дисплеї)</li><li>Вкажіть реальний пробіг і стан батареї</li><li>Порівняйте ціну з аналогами на RideGO</li><li>Активуйте промо для підняття в ТОП</li></ul></div>',
    faqItems:[
      {q:'Скільки коштує розміщення оголошення?',a:'Базове розміщення безкоштовне. Є платні промо-опції для швидшого продажу.'},
      {q:'Як швидко продається електросамокат?',a:'Популярні моделі (KuKirin, Xiaomi, Ninebot) продаються за 3-7 днів. Рідкісні моделі — до 2-3 тижнів.'},
      {q:'Чи безпечно продавати на RideGO?',a:'Так. Ви спілкуєтесь напряму з покупцем через вбудований чат. Ми не беремо комісій з продажу.'}
    ]
  },
  // ─── USE-CASE: з сидінням ───
  'elektrosamokat-z-sydinniam': {
    type:'filter', catFilter:'Електросамокати', titleFilter:['сидінн','seat','сідінн','M4','M5'],
    title:'Електросамокати з сидінням — купити в Україні ⚡ ціни | RideGO',
    h1:'Електросамокати з сидінням — купити в Україні',
    metaDesc:'Електросамокати з сидінням — купити нові та б/в в Україні. KuKirin M4 Pro, M5 Pro, Kugoo та інші. Порівняйте ціни на RideGO.',
    introHtml:'<div style="background:#f0fdf4;border-radius:16px;padding:24px 28px;margin-bottom:28px;line-height:1.8;font-size:15px;color:#333"><h2 style="font-size:20px;font-weight:800;margin-bottom:12px;color:#111">Електросамокати з сидінням — для комфортних поїздок</h2><p>Електросамокат із сидінням — ідеальний вибір для тривалих поїздок, людей старшого віку або тих, хто просто цінує комфорт. Популярні моделі: <strong>KuKirin M4 Pro</strong>, <strong>KuKirin M5 Pro</strong>, <strong>Kugoo M4</strong>. Сидіння зазвичай знімне — можна їздити як стоячи, так і сидячи.</p></div>',
    faqItems:[
      {q:'Які переваги самоката з сидінням?',a:'Комфорт на далеких дистанціях, менше навантаження на ноги, зручніше для людей старшого віку.'},
      {q:'Чи можна зняти сидіння?',a:'Так, у більшості моделей сидіння знімне — можна їздити стоячи або сидячи.'}
    ]
  },
  // ─── USE-CASE: для міста ───
  'elektrosamokat-dlya-mista': {
    type:'filter', catFilter:'Електросамокати', titleFilter:['Xiaomi','Ninebot','S1 Max','M365','Scooter 4','Scooter 5','F2','E2'],
    title:'Електросамокат для міста — як вибрати, купити в Україні | RideGO',
    h1:'Електросамокат для міста — купити в Україні',
    metaDesc:'Кращі електросамокати для міста: Xiaomi, Ninebot, KuKirin S1 Max. Легкі, складні, до 25 км/год. Порівняйте ціни на RideGO.',
    introHtml:'<div style="background:#f0fdf4;border-radius:16px;padding:24px 28px;margin-bottom:28px;line-height:1.8;font-size:15px;color:#333"><h2 style="font-size:20px;font-weight:800;margin-bottom:12px;color:#111">Як вибрати електросамокат для міста?</h2><p>Для міських поїздок потрібен <strong>легкий</strong> (до 16 кг), <strong>складний</strong> самокат з запасом ходу <strong>30-50 км</strong>. Ідеальні бренди: <strong>Xiaomi</strong>, <strong>Ninebot</strong>, <strong>KuKirin S1 Max</strong>.</p><h3 style="font-size:17px;font-weight:700;margin-top:16px;margin-bottom:8px">На що звертати увагу:</h3><ul style="padding-left:20px;color:#444"><li><strong>Вага</strong> — до 16 кг, щоб легко заносити в транспорт</li><li><strong>Запас ходу</strong> — мінімум 30 км для щоденних поїздок</li><li><strong>Колеса</strong> — 8.5-10 дюймів, краще пневматичні</li><li><strong>Швидкість</strong> — 25 км/год достатньо для тротуарів</li></ul></div>',
    faqItems:[
      {q:'Який найкращий самокат для міста?',a:'Xiaomi Mi Scooter 4 Pro або Ninebot MAX G30 — перевірені, надійні, легкі.'},
      {q:'Скільки коштує міський електросамокат?',a:'Від 10 000 грн (б/в) до 25 000 грн (новий). Xiaomi Scooter 4 — від 14 000 грн.'}
    ]
  },
  // ─── USE-CASE: для бездоріжжя ───
  'elektrosamokat-dlia-bezdorizhzhia': {
    type:'filter', catFilter:'Електросамокати', titleFilter:['Dualtron','Kaabo','Wolf','G3','G4','Storm','Thunder','Vsett 10','Vsett 11'],
    title:'Позашляхові електросамокати — купити в Україні ⚡ потужні | RideGO',
    h1:'Позашляхові електросамокати — купити в Україні',
    metaDesc:'Потужні електросамокати для бездоріжжя: Dualtron, Kaabo, KuKirin G3/G4. Подвійні двигуни, великі колеса. Ціни на RideGO.',
    introHtml:'<div style="background:#f0fdf4;border-radius:16px;padding:24px 28px;margin-bottom:28px;line-height:1.8;font-size:15px;color:#333"><h2 style="font-size:20px;font-weight:800;margin-bottom:12px;color:#111">Позашляхові електросамокати — для бездоріжжя та поганих доріг</h2><p>Для їзди по ґрунтовим дорогам, бордюрам та поганому асфальту потрібні потужні самокати з <strong>великими колесами</strong> (10-11"), <strong>подвійною амортизацією</strong> та <strong>двигуном від 1000 Вт</strong>. Топ бренди: <strong>Dualtron</strong>, <strong>Kaabo</strong>, <strong>KuKirin G3/G4</strong>, <strong>Vsett</strong>.</p></div>',
    faqItems:[
      {q:'Який самокат для бездоріжжя найкращий?',a:'Dualtron Thunder 2 або Kaabo Wolf King GT Pro — найпотужніші. Дешевше — KuKirin G3 або Vsett 10+.'},
      {q:'Скільки коштує позашляховий самокат?',a:'Від 25 000 грн (KuKirin G3) до 150 000 грн (Dualtron Storm). На RideGO є б/в варіанти значно дешевше.'}
    ]
  },
  // ─── USE-CASE: бюджетні ───
  'elektrosamokat-biudzhetnyj': {
    type:'filter', catFilter:'Електросамокати', priceMax:15000,
    title:'Електросамокати до 15 000 грн — купити недорого | RideGO',
    h1:'Електросамокати до 15 000 грн — купити в Україні',
    metaDesc:'Недорогі електросамокати до 15 000 грн — нові та б/в. Xiaomi, KuKirin S1 Max та інші бюджетні моделі на RideGO.',
    introHtml:'<div style="background:#f0fdf4;border-radius:16px;padding:24px 28px;margin-bottom:28px;line-height:1.8;font-size:15px;color:#333"><h2 style="font-size:20px;font-weight:800;margin-bottom:12px;color:#111">Бюджетні електросамокати до 15 000 грн</h2><p>Навіть за невеликий бюджет можна знайти гідний електросамокат. Нові моделі: <strong>KuKirin S1 Max</strong> (~14 000 грн), <strong>Xiaomi Scooter 4 Lite</strong>. А на RideGO є б/в варіанти від 5 000 грн — KuKirin G2, Ninebot, Xiaomi в хорошому стані.</p></div>',
    faqItems:[
      {q:'Який самокат купити до 15 000 грн?',a:'Новий — KuKirin S1 Max (~14 000 грн). Б/в — Xiaomi M365 або KuKirin G2 від 8 000 грн.'}
    ]
  },
  // ─── GEO: Київ ───
  'elektrosamokat-kyiv': {
    type:'geo', catFilter:'Електросамокати', city:'Київ',
    title:'Електросамокати Київ — купити та продати ⚡ | RideGO',
    h1:'Електросамокати в Києві — купити та продати',
    metaDesc:'Електросамокати в Києві — нові та б/в. Купити або продати на маркетплейсі RideGO. Оголошення від продавців Києва.',
    introHtml:'<div style="background:#f0fdf4;border-radius:16px;padding:24px 28px;margin-bottom:28px;line-height:1.8;font-size:15px;color:#333"><h2 style="font-size:20px;font-weight:800;margin-bottom:12px;color:#111">Електросамокати в Києві — купити та продати</h2><p>Київ — найбільший ринок електросамокатів в Україні. На RideGO зібрані оголошення від продавців з усіх районів: Оболонь, Подол, Лівий берег, Святошин, Голосіїв. Можна домовитись про зустріч і оглянути самокат особисто перед покупкою.</p><h3 style="font-size:17px;font-weight:700;margin-top:16px;margin-bottom:8px">Популярні райони для купівлі/продажу:</h3><ul style="padding-left:20px;color:#444"><li>Оболонь, Подол — багато продавців, зручне метро</li><li>Лівий берег (Позняки, Осокорки) — доступні ціни</li><li>Центр (Хрещатик, Бессарабка) — магазини та шоуруми</li></ul><p style="margin-top:12px"><strong>Доставка по Києву</strong> — більшість продавців на RideGO пропонують доставку Новою Поштою або самовивіз.</p></div>',
    faqItems:[{q:'Де купити електросамокат в Києві?',a:'На RideGO зібрані оголошення від продавців Києва. Можна домовитись про зустріч і оглянути самокат особисто.'}]
  },
  // ─── GEO: Харків ───
  'elektrosamokat-kharkiv': {
    type:'geo', catFilter:'Електросамокати', city:'Харків',
    title:'Електросамокати Харків — купити та продати ⚡ | RideGO',
    h1:'Електросамокати в Харкові — купити та продати',
    metaDesc:'Електросамокати в Харкові — нові та б/в на маркетплейсі RideGO. Оголошення від продавців Харкова.',
    introHtml:'<div style="background:#f0fdf4;border-radius:16px;padding:24px 28px;margin-bottom:28px;line-height:1.8;font-size:15px;color:#333"><h2 style="font-size:20px;font-weight:800;margin-bottom:12px;color:#111">Електросамокати в Харкові</h2><p>Харків — друге за величиною місто України з великим ринком електросамокатів. На RideGO оголошення від харківських продавців — як нові самокати від магазинів, так і б/в від приватних осіб. Популярні бренди в Харкові: KuKirin, Xiaomi, Ninebot.</p><p style="margin-top:12px">Доставка по Харкову через Нову Пошту або самовивіз. Багато продавців готові зробити тест-драйв перед покупкою.</p></div>',
    faqItems:[{q:'Де купити електросамокат в Харкові?',a:'На RideGO є оголошення від продавців Харкова.'}]
  },
  // ─── GEO: Одеса ───
  'elektrosamokat-odesa': {
    type:'geo', catFilter:'Електросамокати', city:'Одеса',
    title:'Електросамокати Одеса — купити та продати ⚡ | RideGO',
    h1:'Електросамокати в Одесі — купити та продати',
    metaDesc:'Електросамокати в Одесі на RideGO. Нові та б/в від продавців Одеси.',
    introHtml:'<div style="background:#f0fdf4;border-radius:16px;padding:24px 28px;margin-bottom:28px;line-height:1.8;font-size:15px;color:#333"><h2 style="font-size:20px;font-weight:800;margin-bottom:12px;color:#111">Електросамокати в Одесі</h2><p>Одеса — ідеальне місто для електросамоката: рівний рельєф, набережна, довгий теплий сезон. На RideGO оголошення від одеських продавців з можливістю зустрітись і оглянути самокат. Самокати з вологозахистом IP54+ особливо популярні через близькість моря.</p></div>',
    faqItems:[]
  },
  // ─── GEO: Дніпро ───
  'elektrosamokat-dnipro': {
    type:'geo', catFilter:'Електросамокати', city:'Дніпро',
    title:'Електросамокати Дніпро — купити та продати ⚡ | RideGO',
    h1:'Електросамокати в Дніпрі — купити та продати',
    metaDesc:'Електросамокати в Дніпрі на RideGO. Нові та б/в від продавців Дніпра.',
    introHtml:'<div style="background:#f0fdf4;border-radius:16px;padding:24px 28px;margin-bottom:28px;line-height:1.8;font-size:15px;color:#333"><h2 style="font-size:20px;font-weight:800;margin-bottom:12px;color:#111">Електросамокати в Дніпрі</h2><p>Дніпро — місто з розвиненою інфраструктурою для електросамокатів. Набережна, парки та нові велодоріжки роблять поїздки комфортними. На RideGO оголошення від дніпровських продавців — нові та вживані самокати від KuKirin, Xiaomi, Dualtron.</p></div>',
    faqItems:[]
  },
  // ─── GEO: Львів ───
  'elektrosamokat-lviv': {
    type:'geo', catFilter:'Електросамокати', city:'Львів',
    title:'Електросамокати Львів — купити та продати ⚡ | RideGO',
    h1:'Електросамокати у Львові — купити та продати',
    metaDesc:'Електросамокати у Львові на RideGO. Нові та б/в від продавців Львова.',
    introHtml:'<div style="background:#f0fdf4;border-radius:16px;padding:24px 28px;margin-bottom:28px;line-height:1.8;font-size:15px;color:#333"><h2 style="font-size:20px;font-weight:800;margin-bottom:12px;color:#111">Електросамокати у Львові</h2><p>Львів — компактне місто де електросамокат ідеально підходить для щоденних поїздок. Бруківка в центрі вимагає самокат з хорошою амортизацією (від 10-дюймових коліс). На RideGO оголошення від львівських продавців. Популярні моделі: KuKirin G2 (амортизація для бруківки), Ninebot MAX G30 (великий запас ходу).</p></div>',
    faqItems:[]
  },
  // ─── COMPARISON ───
  'kukirin-vs-ninebot': {
    type:'compare', brands:['kukirin','ninebot'],
    title:'KuKirin або Ninebot — що вибрати? Порівняння 2026 | RideGO',
    h1:'KuKirin або Ninebot — що вибрати?',
    metaDesc:'Порівняння KuKirin та Ninebot: ціни, характеристики, плюси та мінуси. Який електросамокат краще купити в Україні? Аналіз на RideGO.',
    introHtml:'<div style="background:#f0fdf4;border-radius:16px;padding:24px 28px;margin-bottom:28px;line-height:1.8;font-size:15px;color:#333"><h2 style="font-size:20px;font-weight:800;margin-bottom:12px;color:#111">KuKirin або Ninebot — детальне порівняння</h2><p>Два найпопулярніших бренди електросамокатів в Україні. <strong>KuKirin</strong> — потужніший та дешевший, <strong>Ninebot</strong> — надійніший та преміальніший.</p><table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px"><tr style="background:#e8f5e9"><th style="padding:10px;text-align:left;border:1px solid #ddd">Критерій</th><th style="padding:10px;border:1px solid #ddd">KuKirin</th><th style="padding:10px;border:1px solid #ddd">Ninebot</th></tr><tr><td style="padding:10px;border:1px solid #eee">Ціна</td><td style="padding:10px;border:1px solid #eee">14 000 – 40 000 грн</td><td style="padding:10px;border:1px solid #eee">18 000 – 80 000 грн</td></tr><tr><td style="padding:10px;border:1px solid #eee">Потужність</td><td style="padding:10px;border:1px solid #eee">350W – 2000W</td><td style="padding:10px;border:1px solid #eee">300W – 3000W</td></tr><tr><td style="padding:10px;border:1px solid #eee">Запас ходу</td><td style="padding:10px;border:1px solid #eee">40 – 100 км</td><td style="padding:10px;border:1px solid #eee">30 – 65 км</td></tr><tr><td style="padding:10px;border:1px solid #eee">Якість збірки</td><td style="padding:10px;border:1px solid #eee">⭐⭐⭐</td><td style="padding:10px;border:1px solid #eee">⭐⭐⭐⭐⭐</td></tr><tr><td style="padding:10px;border:1px solid #eee">Для кого</td><td style="padding:10px;border:1px solid #eee">Потужність за ціну</td><td style="padding:10px;border:1px solid #eee">Надійність і сервіс</td></tr></table></div>',
    faqItems:[
      {q:'KuKirin або Ninebot — що краще для міста?',a:'Ninebot (F2 Pro, MAX G30) — легший, надійніший, кращий для тротуарів. KuKirin (G2, S1 Max) — потужніший і дешевший.'},
      {q:'Що дешевше — KuKirin чи Ninebot?',a:'KuKirin зазвичай на 20-40% дешевший за аналогічний по характеристикам Ninebot.'}
    ]
  },
  'kukirin-vs-xiaomi': {
    type:'compare', brands:['kukirin','xiaomi'],
    title:'KuKirin або Xiaomi — що вибрати? Порівняння 2026 | RideGO',
    h1:'KuKirin або Xiaomi — що вибрати?',
    metaDesc:'Порівняння KuKirin та Xiaomi: ціни, потужність, запас ходу. Який електросамокат кращий для вас? Аналіз на RideGO.',
    introHtml:'<div style="background:#f0fdf4;border-radius:16px;padding:24px 28px;margin-bottom:28px;line-height:1.8;font-size:15px;color:#333"><h2 style="font-size:20px;font-weight:800;margin-bottom:12px;color:#111">KuKirin або Xiaomi — детальне порівняння</h2><p><strong>Xiaomi</strong> — найпопулярніший бренд для міста: легкий, надійний, з додатком. <strong>KuKirin</strong> — для тих хто хоче більше потужності та швидкості за ті ж гроші.</p><table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px"><tr style="background:#e8f5e9"><th style="padding:10px;text-align:left;border:1px solid #ddd">Критерій</th><th style="padding:10px;border:1px solid #ddd">KuKirin</th><th style="padding:10px;border:1px solid #ddd">Xiaomi</th></tr><tr><td style="padding:10px;border:1px solid #eee">Ціна</td><td style="padding:10px;border:1px solid #eee">14 000 – 40 000 грн</td><td style="padding:10px;border:1px solid #eee">12 000 – 30 000 грн</td></tr><tr><td style="padding:10px;border:1px solid #eee">Потужність</td><td style="padding:10px;border:1px solid #eee">350W – 2000W</td><td style="padding:10px;border:1px solid #eee">300W – 500W</td></tr><tr><td style="padding:10px;border:1px solid #eee">Швидкість</td><td style="padding:10px;border:1px solid #eee">до 69 км/год</td><td style="padding:10px;border:1px solid #eee">до 25 км/год</td></tr><tr><td style="padding:10px;border:1px solid #eee">Мобільний додаток</td><td style="padding:10px;border:1px solid #eee">Ні</td><td style="padding:10px;border:1px solid #eee">Так (Mi Home)</td></tr><tr><td style="padding:10px;border:1px solid #eee">Для кого</td><td style="padding:10px;border:1px solid #eee">Потужність, бездоріжжя</td><td style="padding:10px;border:1px solid #eee">Місто, щоденні поїздки</td></tr></table></div>',
    faqItems:[
      {q:'Xiaomi або KuKirin для міста?',a:'Xiaomi — легший, з додатком, обмежена швидкість 25 км/год. KuKirin — потужніший, без обмежень.'},
      {q:'Що надійніше?',a:'Xiaomi має кращу якість збірки. KuKirin потужніший, але може потребувати більше обслуговування.'}
    ]
  },
  'dualtron-vs-kaabo': {
    type:'compare', brands:['dualtron','kaabo'],
    title:'Dualtron або Kaabo — порівняння преміум самокатів 2026 | RideGO',
    h1:'Dualtron або Kaabo — що вибрати?',
    metaDesc:'Порівняння Dualtron та Kaabo: Thunder vs Wolf King, Victor vs Mantis. Який преміум-самокат кращий? Аналіз на RideGO.',
    introHtml:'<div style="background:#f0fdf4;border-radius:16px;padding:24px 28px;margin-bottom:28px;line-height:1.8;font-size:15px;color:#333"><h2 style="font-size:20px;font-weight:800;margin-bottom:12px;color:#111">Dualtron або Kaabo — битва преміум-самокатів</h2><p>Два топових бренди для досвідчених райдерів. <strong>Dualtron</strong> — корейська якість та сервіс. <strong>Kaabo</strong> — аналогічна потужність за нижчу ціну.</p><table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px"><tr style="background:#e8f5e9"><th style="padding:10px;text-align:left;border:1px solid #ddd">Критерій</th><th style="padding:10px;border:1px solid #ddd">Dualtron</th><th style="padding:10px;border:1px solid #ddd">Kaabo</th></tr><tr><td style="padding:10px;border:1px solid #eee">Ціна</td><td style="padding:10px;border:1px solid #eee">40 000 – 150 000 грн</td><td style="padding:10px;border:1px solid #eee">35 000 – 120 000 грн</td></tr><tr><td style="padding:10px;border:1px solid #eee">Якість</td><td style="padding:10px;border:1px solid #eee">⭐⭐⭐⭐⭐</td><td style="padding:10px;border:1px solid #eee">⭐⭐⭐⭐</td></tr><tr><td style="padding:10px;border:1px solid #eee">Сервіс в Україні</td><td style="padding:10px;border:1px solid #eee">Кращий</td><td style="padding:10px;border:1px solid #eee">Обмежений</td></tr></table></div>',
    faqItems:[
      {q:'Dualtron або Kaabo — що краще?',a:'Dualtron — вища якість та сервіс. Kaabo — більше потужності за ті ж гроші.'}
    ]
  },

  'kupyty-elektrovelo': {
    type: 'filter',
    catFilter: 'Електровелосипеди',
    title: 'Купити електровелосипед в Україні — ціни 2025 | RideGo',
    h1: 'Купити електровелосипед в Україні',
    metaDesc: 'Купити електровелосипед в Україні за найкращою ціною. Великий вибір електровелосипедів для міста, гір та прогулянок. Доставка по всій Україні.',
    introHtml: '<p>Електровелосипеди — оптимальний вибір для щоденних поїздок містом, прогулянок та активного відпочинку. На RideGo представлені моделі з різними характеристиками: міські, складні, гірські та вантажні електровелики. Підберіть електровелосипед за потужністю мотора, ємністю батареї та запасом ходу.</p>',
    faqItems: [
      { q: 'Яку потужність електровелосипеда вибрати?', a: 'Для міста достатньо 250–500 Вт. Для гірських трас або вантажних перевезень рекомендуємо 750–1000 Вт.' },
      { q: 'Яка відстань на одному заряді?', a: 'Середній запас ходу — 40–80 км залежно від батареї та стилю їзди. Деякі моделі з великою батареєю проїжджають до 120 км.' },
      { q: 'Чи потрібні права на електровелосипед?', a: 'Для електровелосипедів потужністю до 250 Вт і швидкістю до 25 км/год права не потрібні.' }
    ],
    relatedSearches: ['електровелосипед купити Київ', 'електровелик ціна', 'електровелосипед складаний', 'міський електровелосипед']
  },
  'kupyty-elektroskuter': {
    type: 'filter',
    catFilter: 'Електроскутери',
    title: 'Купити електроскутер в Україні — ціни 2025 | RideGo',
    h1: 'Купити електроскутер в Україні',
    metaDesc: 'Купити електроскутер в Україні. Широкий вибір електроскутерів для міста та за містом. Офіційна гарантія, доставка по всій Україні.',
    introHtml: '<p>Електроскутери — зручний і економний транспорт для міських поїздок. RideGo пропонує електроскутери різної потужності: від легких міських моделей до потужних позаміських. Без витрат на бензин, тихі та екологічні.</p>',
    faqItems: [
      { q: 'Чим електроскутер відрізняється від електросамоката?', a: 'Електроскутер має сидіння, більшу потужність і призначений для довших поїздок. Електросамокат компактніший і більш портативний.' },
      { q: 'Яка швидкість електроскутера?', a: 'Залежно від моделі — від 45 до 80 км/год. Для руху дорогами загального користування потрібні права категорії А1 або А.' },
      { q: 'Скільки коштує обслуговування електроскутера?', a: 'Витрати мінімальні — заряд акумулятора коштує 5–15 грн, обслуговування значно дешевше ніж у бензинових скутерів.' }
    ],
    relatedSearches: ['електроскутер купити Київ', 'електроскутер ціна Україна', 'електроскутер для міста', 'купити скутер електро']
  },
  'kupyty-elektromotocykl': {
    type: 'filter',
    catFilter: 'Електромотоцикли',
    title: 'Купити електромотоцикл в Україні — ціни 2025 | RideGo',
    h1: 'Купити електромотоцикл в Україні',
    metaDesc: 'Купити електромотоцикл в Україні. Потужні електромотоцикли для міста та трас. Великий вибір, гарантія, доставка по Україні.',
    introHtml: '<p>Електромотоцикли поєднують потужність класичного мотоцикла з ефективністю електропривода. На RideGo ви знайдете моделі для міських поїздок і спортивної їзди. Сучасні електромотоцикли розганяються до 100+ км/год та мають запас ходу 100–200 км.</p>',
    faqItems: [
      { q: 'Які права потрібні на електромотоцикл?', a: 'Для електромотоциклів потужністю понад 4 кВт потрібні права категорії А1 або А.' },
      { q: 'Скільки часу заряджається електромотоцикл?', a: 'Стандартна зарядка — 4–8 годин. Деякі моделі підтримують швидку зарядку за 1–2 години.' },
      { q: 'Який запас ходу у електромотоцикла?', a: 'В залежності від моделі і батареї — від 80 до 250 км на одному заряді.' }
    ],
    relatedSearches: ['електромотоцикл купити Київ', 'електромото ціна', 'спортивний електромотоцикл', 'електромотоцикл Україна 2025']
  },
  'elektrosamokat-vzhyvanyy': {
    type: 'listing',
    listingType: 'used',
    title: 'Вживані електросамокати — купити б/в електросамокат | RideGo',
    h1: 'Вживані електросамокати в Україні',
    metaDesc: 'Купити вживаний електросамокат в Україні. Перевірені б/в електросамокати з гарантією якості. Економте до 50% порівняно з новими моделями.',
    introHtml: '<p>На RideGo можна купити вживаний електросамокат і зекономити до 50% від нової ціни. Всі б/в самокати перевірені нашими фахівцями. Ми продаємо тільки справні моделі з чесним описом стану — без прихованих дефектів.</p>',
    faqItems: [
      { q: 'Чи безпечно купувати вживаний електросамокат?', a: 'Якщо купувати у перевіреного продавця — так. На RideGo всі б/в самокати проходять технічну перевірку перед продажем.' },
      { q: 'Яка гарантія на б/в електросамокат?', a: 'Ми надаємо гарантію 30 днів на всі вживані електросамокати. Якщо виявите проблему — повернемо гроші або замінимо товар.' },
      { q: 'Які моделі найчастіше є в наявності?', a: 'Найчастіше є Xiaomi, Ninebot, KuKirin, Kaabo та Vsett у різних цінових категоріях.' }
    ],
    relatedSearches: ['б/в електросамокат купити', 'вживаний електросамокат Київ', 'електросамокат б/у недорого', 'самокат електро б/в']
  },
  'prodaty-elektrovelo': {
    type: 'sell',
    sellCategory: 'електровелосипед',
    title: 'Продати електровелосипед в Україні — RideGo',
    h1: 'Продати електровелосипед',
    metaDesc: 'Продайте свій електровелосипед швидко та вигідно на RideGo. Безкоштовне розміщення оголошення, широка аудиторія покупців в Україні.',
    introHtml: '<p>Хочете продати електровелосипед? RideGo — спеціалізований майданчик для продажу електротранспорту в Україні. Розмістіть оголошення безкоштовно та знайдіть покупця серед цільової аудиторії любителів електротранспорту.</p>',
    faqItems: [
      { q: 'Як швидко продається електровелосипед?', a: 'Популярні моделі зазвичай знаходять покупця за 3–7 днів. Правильна ціна та якісні фото прискорюють продаж.' },
      { q: 'Як правильно оцінити електровелосипед для продажу?', a: 'Орієнтуйтеся на 50–70% від нової ціни залежно від стану, пробігу та віку батареї.' },
      { q: 'Які документи потрібні для продажу?', a: 'Для продажу електровелосипеда офіційні документи не обовязкові, але наявність чеку або гарантійного талону підвищує довіру покупця.' }
    ],
    relatedSearches: ['продати електровелосипед Київ', 'продати електровелик', 'здати електровелосипед', 'електровелосипед обмін']
  },
  'prodaty-elektroskuter': {
    type: 'sell',
    sellCategory: 'електроскутер',
    title: 'Продати електроскутер в Україні — RideGo',
    h1: 'Продати електроскутер',
    metaDesc: 'Продайте свій електроскутер швидко та вигідно на RideGo. Спеціалізований майданчик для продажу електротранспорту в Україні.',
    introHtml: '<p>RideGo — найкраще місце для продажу електроскутера в Україні. Ваше оголошення побачать тисячі зацікавлених покупців. Розміщення безкоштовне, продаж швидкий.</p>',
    faqItems: [
      { q: 'Скільки коштує розмістити оголошення?', a: 'Базове розміщення оголошення на RideGo безкоштовне.' },
      { q: 'Як підготувати електроскутер до продажу?', a: 'Зробіть якісні фото, зазначте реальний пробіг і стан батареї, вкажіть комплектацію. Чесний опис — запорука швидкого продажу.' },
      { q: 'Чи можна обміняти електроскутер на інший транспорт?', a: 'Так, на RideGo є розділ обміну. Вкажіть у оголошенні, що розглядаєте обмін.' }
    ],
    relatedSearches: ['продати електроскутер Київ', 'продати скутер електро', 'здати електроскутер', 'електроскутер обмін']
  },
  'ausom-elektrosamokaty': {
    type: 'brand-category',
    brand: 'ausom',
    title: 'Ausom електросамокати — купити в Україні | RideGo',
    h1: 'Ausom електросамокати — купити в Україні',
    metaDesc: 'Купити електросамокат Ausom в Україні. Моделі L1, L2, L2 Max, DT2 Pro — потужні самокати для міста та офроду. Ціни, характеристики, відгуки.',
    introHtml: '<p>Ausom — бренд електросамокатів для тих, хто цінує продуктивність і стиль. Лінійка включає міські (L1, L2) та позашляхові (L2 Max, DT2 Pro) моделі. На RideGo ви знайдете актуальні ціни та детальні характеристики всіх самокатів Ausom.</p>',
    faqItems: [
      { q: 'Яка краща модель Ausom для міста?', a: 'Для міста ідеально підійдуть Ausom L1 або L2 — компактні, легкі та мають запас ходу до 40 км.' },
      { q: 'Чи є запчастини Ausom в Україні?', a: 'Так, основні запчастини та покришки для самокатів Ausom є в наявності.' },
      { q: 'Яка потужність у Ausom DT2 Pro?', a: 'Ausom DT2 Pro має потужний мотор 2×2000 Вт для складного рельєфу та підйомів.' }
    ],
    relatedSearches: ['ausom l1 купити', 'ausom l2 ціна', 'ausom dt2 pro', 'самокат ausom Україна']
  },
  'elektrovelosyped-kyiv': {
    type: 'geo',
    geoCity: 'Київ',
    catFilter: 'Електровелосипеди',
    title: 'Електровелосипед Київ — купити електровелик у Києві | RideGo',
    h1: 'Купити електровелосипед у Києві',
    metaDesc: 'Купити електровелосипед у Києві. Самовивіз та доставка по Києву. Великий вибір міських і гірських електровелосипедів за найкращими цінами.',
    introHtml: '<p>Шукаєте електровелосипед у Києві? RideGo пропонує зручний вибір і доставку по всьому місту. Самовивіз з нашого шоуруму або кур’єрська доставка до вашого дому.</p>',
    faqItems: [
      { q: 'Де купити електровелосипед у Києві?', a: 'На RideGo — онлайн з доставкою по Києву або самовивозом. Широкий вибір моделей постійно в наявності.' },
      { q: 'Чи є тест-драйв електровелосипедів у Києві?', a: 'Так, у нашому шоурумі в Києві ви можете протестувати обрану модель перед покупкою.' }
    ],
    relatedSearches: ['електровелосипед купити Київ', 'електровелик Київ ціна', 'магазин електровелосипедів Київ']
  },
  'elektrosamokat-kyiv': {
    type: 'geo',
    geoCity: 'Київ',
    catFilter: 'Електросамокати',
    title: 'Електросамокат Київ — купити електросамокат у Києві | RideGo',
    h1: 'Купити електросамокат у Києві',
    metaDesc: 'Купити електросамокат у Києві. Самовивіз та доставка по Києву. Великий вибір брендів: KuKirin, Ausom, Kaabo, Vsett, Ninebot, Xiaomi.',
    introHtml: '<p>Шукаєте електросамокат у Києві? На RideGo — великий вибір моделей для міста та бездоріжжя з доставкою по Києву. Наш шоурум дозволяє побачити та протестувати самокат перед покупкою.</p>',
    faqItems: [
      { q: 'Де купити електросамокат у Києві?', a: 'На RideGo ви можете замовити електросамокат онлайн з доставкою по Києву або забрати самостійно з шоуруму.' },
      { q: 'Який електросамокат найпопулярніший у Києві?', a: 'Серед киян найбільш популярні KuKirin G4, Ninebot Max G30 та Xiaomi Electric Scooter 4 Pro.' }
    ],
    relatedSearches: ['електросамокат купити Київ', 'самокат електро Київ', 'електросамокат Київ ціна 2025']
  },
  'kukirin-g4-kupit': {
    type: 'model-page',
    modelSlug: 'kukirin-g4',
    title: 'KuKirin G4 купити в Україні — ціна, характеристики | RideGo',
    h1: 'KuKirin G4 — купити в Україні',
    metaDesc: 'KuKirin G4 купити в Україні за найкращою ціною. Характеристики, відгуки, фото. Офіційна гарантія, доставка по всій Україні.',
    introHtml: '<p>KuKirin G4 — один з найпопулярніших електросамокатів 2024–2025 в Україні. Потужний мотор, велика батарея та пневматичні колеса роблять G4 ідеальним вибором для щоденних поїздок містом та за містом.</p>',
    faqItems: [
      { q: 'Скільки коштує KuKirin G4 в Україні?', a: 'Актуальну ціну KuKirin G4 дивіться на сторінці товару на RideGo. Ціна може змінюватися залежно від акцій.' },
      { q: 'Яка максимальна швидкість KuKirin G4?', a: 'KuKirin G4 розганяється до 45 км/год у максимальному режимі.' },
      { q: 'Який запас ходу у KuKirin G4?', a: 'Заявлений виробником запас ходу — до 70 км. У реальних умовах міських поїздок — 40–55 км.' }
    ],
    relatedSearches: ['kukirin g4 ціна', 'kukirin g4 характеристики', 'kukirin g4 відгуки', 'кукірін г4 купити']
  },
};

module.exports = async (req, res) => {
  const ua=req.headers['user-agent']||''; const isBot=BOTS.test(ua);
  const slug=getParam(req,'slug').replace(/[^a-zA-Z0-9_-]/g,'');
  const brandSlug=getParam(req,'brand').replace(/[^a-zA-Z0-9_-]/g,'').toLowerCase();
  const modelSlug=getParam(req,'model').replace(/[^a-zA-Z0-9_-]/g,'').toLowerCase();
  const pageSlug=getParam(req,'page').replace(/[^a-zA-Z0-9_-]/g,'').toLowerCase();

  const isBrand=!!brandSlug; const isModel=!!modelSlug; const isPage=!!pageSlug;
  const brand=isBrand?BRANDS[brandSlug]:null;
  const model=isModel?MODELS[modelSlug]:null;
  const pageData=isPage?PAGES[pageSlug]:null;
  const catInfo=(!isBrand&&!isModel&&!isPage)?CATEGORIES[slug]:null;

  // Unknown → redirect
  if(isBrand&&!brand){res.setHeader('Location',`${BASE}/catalog`);return res.status(302).end();}
  if(isModel&&!model){res.setHeader('Location',`${BASE}/catalog`);return res.status(302).end();}
  if(isPage&&!pageData){res.setHeader('Location',`${BASE}/catalog`);return res.status(302).end();}

  // Non-bot → SPA
  if(!isBot){const fs=require('fs');const path=require('path');try{const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','public, max-age=0, must-revalidate');return res.status(200).send(html);}catch(e){return res.status(302).end();}}

  // ════════════════════════════════════
  // STATIC SEO PAGES (sell, use-case, geo, compare)
  // ════════════════════════════════════
  if(isPage&&pageData){
    let listings=[];
    if(pageData.type==='geo'&&pageData.city) listings=await getListingsFiltered(pageData.catFilter,{city:pageData.city});
    else if(pageData.type==='filter'&&pageData.titleFilter) listings=await getListingsFiltered(pageData.catFilter,{titleFilter:pageData.titleFilter});
    else if(pageData.type==='filter'&&pageData.priceMax) listings=await getListingsFiltered(pageData.catFilter,{priceMax:pageData.priceMax});
    else if(pageData.type==='compare'&&pageData.brands) { for(const bs of pageData.brands){const br=BRANDS[bs]; if(br) { const bl=await getListingsByBrand(br.firebaseNames,10); listings=listings.concat(bl);}} }
    else if(pageData.type==='sell') listings=await getListingsByCategory(pageData.catFilter);
    const lHtml=listings.length?listings.slice(0,20).map(l=>card(l)).join('\n'):`<p style="color:#888;grid-column:1/-1">Оголошень поки немає</p>`;
    const faqH=pageData.faqItems&&pageData.faqItems.length?`<section style="margin-bottom:32px"><h2 style="font-size:19px;font-weight:800;margin-bottom:16px;color:#111">Часті питання</h2>${pageData.faqItems.map(f=>`<details style="margin-bottom:10px;border:1px solid #eee;border-radius:10px;overflow:hidden"><summary style="padding:14px 18px;font-weight:700;font-size:15px;cursor:pointer;background:#fafafa;color:#111">${escHtml(f.q)}</summary><div style="padding:14px 18px;font-size:14px;color:#555;line-height:1.7">${escHtml(f.a)}</div></details>`).join('')}</section>`:'';
    const faqSchema=pageData.faqItems&&pageData.faqItems.length?JSON.stringify({"@context":"https://schema.org","@type":"FAQPage","mainEntity":pageData.faqItems.map(f=>({"@type":"Question","name":f.q,"acceptedAnswer":{"@type":"Answer","text":f.a}}))}):''
    const bcs=JSON.stringify({"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"RideGO","item":BASE},{"@type":"ListItem","position":2,"name":"Електросамокати","item":`${BASE}/category/elektrosamokaty`},{"@type":"ListItem","position":3,"name":pageData.h1,"item":`${BASE}/${pageSlug}`}]});
    const head=`<title>${escHtml(pageData.title)}</title><meta name="description" content="${escHtml(pageData.metaDesc)}"><meta name="robots" content="index, follow"><link rel="canonical" href="${BASE}/${pageSlug}"><meta property="og:type" content="website"><meta property="og:title" content="${escHtml(pageData.h1)} | RideGO"><meta property="og:description" content="${escHtml(pageData.metaDesc)}"><meta property="og:url" content="${BASE}/${pageSlug}"><meta property="og:site_name" content="RideGO"><meta property="og:image" content="${BASE}/og-image.png"><meta property="og:locale" content="uk_UA"><script type="application/ld+json">${bcs}</script>${faqSchema?`<script type="application/ld+json">${faqSchema}</script>`:''}`;
    const sellCta=pageData.type==='sell'?`<section style="padding:28px;background:#1db954;border-radius:16px;text-align:center;margin-bottom:32px"><h2 style="font-size:22px;font-weight:800;margin-bottom:8px;color:#fff">Продайте свій електросамокат прямо зараз</h2><p style="color:#d4edda;margin-bottom:16px">Безкоштовно, за 2 хвилини, без комісій</p><a href="${BASE}/add" style="display:inline-block;background:#fff;color:#1db954;padding:15px 36px;border-radius:12px;text-decoration:none;font-weight:800;font-size:17px">Подати оголошення →</a></section>`:`<section style="padding:28px;background:#f0fdf4;border-radius:16px;text-align:center;margin-bottom:32px"><h2 style="font-size:19px;font-weight:700;margin-bottom:8px">Не знайшли потрібне?</h2><p style="color:#555;margin-bottom:16px">Подайте оголошення "Шукаю" або перегляньте весь каталог</p><a href="${BASE}/catalog" style="display:inline-block;background:#1db954;color:#fff;padding:13px 28px;border-radius:10px;text-decoration:none;font-weight:700;margin-right:12px">Каталог</a><a href="${BASE}/add" style="display:inline-block;background:#fff;color:#1db954;padding:13px 28px;border-radius:10px;text-decoration:none;font-weight:700;border:2px solid #1db954">Подати оголошення</a></section>`;
    const brandsLinks=`<section style="margin-bottom:28px"><h2 style="font-size:16px;font-weight:700;margin-bottom:12px">Популярні бренди</h2><div>${Object.entries(BRANDS).map(([s,b])=>`<a href="${BASE}/${s}" style="display:inline-flex;align-items:center;gap:5px;padding:8px 14px;background:#f0fdf4;border-radius:8px;text-decoration:none;color:#166534;font-size:13px;font-weight:600;margin:3px">${b.icon} ${escHtml(b.name)}</a>`).join('')}</div></section>`;
    const body=`<nav class="bc" aria-label="Breadcrumb"><a href="${BASE}">RideGO</a><span>›</span><a href="${BASE}/category/elektrosamokaty">Електросамокати</a><span>›</span><span>${escHtml(pageData.h1)}</span></nav><h1>⚡ ${escHtml(pageData.h1)}</h1><p style="color:#666;margin-bottom:24px;font-size:15px">${escHtml(pageData.metaDesc)}</p>${pageData.introHtml||''}${listings.length?`<section style="margin-bottom:28px"><h2 style="font-size:17px;font-weight:700;margin-bottom:16px;color:#111">Оголошення <span style="color:#888;font-weight:400;font-size:14px">(${listings.length})</span></h2><div class="grid">${lHtml}</div></section>`:''}<br>${faqH}${sellCta}${brandsLinks}`;
    res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','s-maxage=1800, stale-while-revalidate=3600');return res.status(200).send(shell(head,body));
  }

  // ════════════════════════════════════
  // MODEL PAGE SSR  /kukirin-g4
  // ════════════════════════════════════
  if(isModel&&model){
    const br=BRANDS[model.brand]||{};
    const listings=await getListingsByModel(br.firebaseNames||[model.brand], model.searchTerms, 20);
    const lHtml=listings.length?listings.map(l=>card(l)).join('\n'):`<p style="color:#888;grid-column:1/-1">Оголошень поки немає — <a href="${BASE}/add" style="color:#1db954">додайте першим!</a></p>`;

    const specsHtml=`<table class="specs">${model.power?`<tr><td>Двигун</td><td>${escHtml(model.power)}</td></tr>`:''}${model.battery?`<tr><td>Акумулятор</td><td>${escHtml(model.battery)}</td></tr>`:''}${model.range?`<tr><td>Запас ходу</td><td>${escHtml(model.range)}</td></tr>`:''}${model.speed?`<tr><td>Макс. швидкість</td><td>${escHtml(model.speed)}</td></tr>`:''}${model.weight?`<tr><td>Вага</td><td>${escHtml(model.weight)}</td></tr>`:''}</table>`;

    // Other models from same brand
    const otherModels=Object.entries(MODELS).filter(([s,m])=>m.brand===model.brand&&s!==modelSlug).slice(0,6).map(([s,m])=>`<a href="${BASE}/${s}" style="display:inline-flex;align-items:center;gap:5px;padding:8px 14px;background:#f0fdf4;border-radius:8px;text-decoration:none;color:#166534;font-size:13px;font-weight:600;margin:3px">⚡ ${escHtml(br.name||'')} ${escHtml(m.model)}</a>`).join('');

    const bcs=JSON.stringify({"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"RideGO","item":BASE},{"@type":"ListItem","position":2,"name":"Електросамокати","item":`${BASE}/category/elektrosamokaty`},{"@type":"ListItem","position":3,"name":br.name||'','item':`${BASE}/brand/${model.brand}`},{"@type":"ListItem","position":4,"name":`${br.name||''} ${model.model}`,"item":`${BASE}/${modelSlug}`}]});
    const prodSchema=JSON.stringify({"@context":"https://schema.org","@type":"Product","name":`${br.name||''} ${model.model}`,"description":model.metaDesc,"brand":{"@type":"Brand","name":br.name||''},"offers":{"@type":"AggregateOffer","priceCurrency":"UAH","offerCount":listings.length,"availability":"https://schema.org/InStock","url":`${BASE}/${modelSlug}`}});
    const faqSchema=JSON.stringify({"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":`Скільки коштує ${br.name} ${model.model}?`,"acceptedAnswer":{"@type":"Answer","text":`Ціни на ${br.name} ${model.model} в Україні можна порівняти на маркетплейсі RideGO. Дивіться актуальні оголошення від продавців.`}},{"@type":"Question","name":`Де купити ${br.name} ${model.model} в Україні?`,"acceptedAnswer":{"@type":"Answer","text":`На маркетплейсі RideGO зібрані оголошення ${br.name} ${model.model} від продавців по всій Україні — Київ, Харків, Одеса, Дніпро, Львів та інші міста.`}},{"@type":"Question","name":`Які характеристики ${br.name} ${model.model}?`,"acceptedAnswer":{"@type":"Answer","text":`${br.name} ${model.model}: двигун ${model.power||'—'}, батарея ${model.battery||'—'}, запас ходу ${model.range||'—'}, макс. швидкість ${model.speed||'—'}.`}}]});

    const head=`<title>${escHtml(model.title)}</title><meta name="description" content="${escHtml(model.metaDesc)}"><meta name="keywords" content="${escHtml(br.name)} ${escHtml(model.model)} купити, ${escHtml(br.name)} ${escHtml(model.model)} ціна, ${escHtml(br.name)} ${escHtml(model.model)} Україна, електросамокат ${escHtml(br.name)} ${escHtml(model.model)}, ${escHtml(br.name)} ${escHtml(model.model)} характеристики, ${escHtml(br.name)} ${escHtml(model.model)} відгуки"><meta name="robots" content="index, follow"><link rel="canonical" href="${BASE}/${modelSlug}"><meta property="og:type" content="product"><meta property="og:title" content="${escHtml(br.name)} ${escHtml(model.model)} — купити в Україні | RideGO"><meta property="og:description" content="${escHtml(model.metaDesc)}"><meta property="og:url" content="${BASE}/${modelSlug}"><meta property="og:site_name" content="RideGO"><meta property="og:image" content="${BASE}/og-image.png"><meta property="og:locale" content="uk_UA"><script type="application/ld+json">${bcs}</script><script type="application/ld+json">${prodSchema}</script><script type="application/ld+json">${faqSchema}</script>`;

    const body=`<nav class="bc" aria-label="Breadcrumb"><a href="${BASE}">RideGO</a><span>›</span><a href="${BASE}/category/elektrosamokaty">Електросамокати</a><span>›</span><a href="${BASE}/brand/${model.brand}">${escHtml(br.name||'')}</a><span>›</span><span>${escHtml(br.name||'')} ${escHtml(model.model)}</span></nav>
<h1>⚡ ${escHtml(model.h1)}</h1>
<p style="color:#666;margin-bottom:20px;font-size:15px">${escHtml(model.metaDesc)}</p>
<section style="margin-bottom:28px"><h2 style="font-size:18px;font-weight:700;margin-bottom:12px;color:#111">Характеристики ${escHtml(br.name)} ${escHtml(model.model)}</h2>${specsHtml}</section>
<section style="margin-bottom:28px;background:#f9f9f9;border-radius:12px;padding:20px;line-height:1.8;font-size:15px;color:#444"><h2 style="font-size:18px;font-weight:700;margin-bottom:10px;color:#111">Про ${escHtml(br.name)} ${escHtml(model.model)}</h2><p>${model.text}</p></section>
<section style="margin-bottom:28px"><h2 style="font-size:17px;font-weight:700;margin-bottom:16px;color:#111">Оголошення ${escHtml(br.name)} ${escHtml(model.model)} <span style="color:#888;font-weight:400;font-size:14px">(${listings.length})</span></h2><div class="grid">${lHtml}</div></section>
<section style="margin-bottom:28px"><h2 style="font-size:17px;font-weight:700;margin-bottom:12px;color:#111">Часті питання</h2><details style="margin-bottom:8px;border:1px solid #eee;border-radius:10px"><summary style="padding:12px 16px;font-weight:600;cursor:pointer;background:#fafafa">Скільки коштує ${escHtml(br.name)} ${escHtml(model.model)}?</summary><div style="padding:12px 16px;font-size:14px;color:#555;line-height:1.7">Актуальні ціни на ${escHtml(br.name)} ${escHtml(model.model)} дивіться в оголошеннях вище. Ціни залежать від стану, комплектації та міста продавця.</div></details><details style="margin-bottom:8px;border:1px solid #eee;border-radius:10px"><summary style="padding:12px 16px;font-weight:600;cursor:pointer;background:#fafafa">Де купити ${escHtml(br.name)} ${escHtml(model.model)} в Україні?</summary><div style="padding:12px 16px;font-size:14px;color:#555;line-height:1.7">На маркетплейсі RideGO зібрані оголошення від продавців по всій Україні — Київ, Харків, Одеса, Дніпро, Львів та інші міста.</div></details><details style="margin-bottom:8px;border:1px solid #eee;border-radius:10px"><summary style="padding:12px 16px;font-weight:600;cursor:pointer;background:#fafafa">Які характеристики ${escHtml(br.name)} ${escHtml(model.model)}?</summary><div style="padding:12px 16px;font-size:14px;color:#555;line-height:1.7">Двигун: ${escHtml(model.power||'—')}, батарея: ${escHtml(model.battery||'—')}, запас ходу: ${escHtml(model.range||'—')}, макс. швидкість: ${escHtml(model.speed||'—')}, вага: ${escHtml(model.weight||'—')}.</div></details></section>
${otherModels?`<section style="margin-bottom:28px"><h2 style="font-size:16px;font-weight:700;margin-bottom:12px">Інші моделі ${escHtml(br.name)}</h2><div>${otherModels}</div><div style="margin-top:12px"><a href="${BASE}/brand/${model.brand}" style="color:#1db954;font-weight:600;text-decoration:none">Всі моделі ${escHtml(br.name)} →</a></div></section>`:''}
<section style="padding:28px;background:#f0fdf4;border-radius:16px;text-align:center;margin-bottom:32px"><h2 style="font-size:19px;font-weight:700;margin-bottom:8px">Продаєте ${escHtml(br.name)} ${escHtml(model.model)}?</h2><p style="color:#555;margin-bottom:16px">Розмістіть оголошення безкоштовно на RideGO</p><a href="${BASE}/add" style="display:inline-block;background:#1db954;color:#fff;padding:13px 28px;border-radius:10px;text-decoration:none;font-weight:700">Подати оголошення →</a></section>`;

    res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','s-maxage=1800, stale-while-revalidate=3600');return res.status(200).send(shell(head,body));
  }

  // ════════════════════════════════════
  // BRAND PAGE SSR  /brand/kukirin
  // ════════════════════════════════════
  if(isBrand&&brand){
    const listings=await getListingsByBrand(brand.firebaseNames,30);
    const lHtml=listings.length?listings.map(l=>card(l)).join('\n'):`<p style="color:#888;grid-column:1/-1">Оголошень поки немає — <a href="${BASE}/add" style="color:#1db954">додайте першим!</a></p>`;
    const modelsHtml=brand.models?`<section style="margin-bottom:28px"><h2 style="font-size:17px;font-weight:700;margin-bottom:12px;color:#111">Моделі ${escHtml(brand.name)}</h2><div style="display:flex;flex-wrap:wrap;gap:8px">${brand.models.map(m=>{const s=brand.name.toLowerCase().replace(/\s+/g,'')+'-'+m; const md=MODELS[s]; return md?`<a href="${BASE}/${s}" style="display:inline-flex;align-items:center;gap:5px;padding:10px 16px;background:#f0fdf4;border-radius:10px;text-decoration:none;color:#111;font-weight:600;font-size:14px;border:1px solid #d1fae5">⚡ ${escHtml(brand.name)} ${escHtml(md.model)}</a>`:''}).filter(Boolean).join('')}</div></section>`:'';
    const ils=JSON.stringify({"@context":"https://schema.org","@type":"ItemList","name":`${brand.name} — купити в Україні | RideGO`,"url":`${BASE}/brand/${brandSlug}`,"numberOfItems":listings.length,"itemListElement":listings.slice(0,20).map((l,i)=>({"@type":"ListItem","position":i+1,"url":`${BASE}/listing/${l.id}`,"name":l.title}))});
    const bcs=JSON.stringify({"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"RideGO","item":BASE},{"@type":"ListItem","position":2,"name":"Каталог","item":`${BASE}/catalog`},{"@type":"ListItem","position":3,"name":brand.category,"item":`${BASE}/category/${brand.catSlug}`},{"@type":"ListItem","position":4,"name":brand.name,"item":`${BASE}/brand/${brandSlug}`}]});
    const faqs=brand.faqItems?JSON.stringify({"@context":"https://schema.org","@type":"FAQPage","mainEntity":brand.faqItems.map(f=>({"@type":"Question","name":f.q,"acceptedAnswer":{"@type":"Answer","text":f.a}}))}):''
    const faqH=brand.faqItems?`<section style="margin-bottom:32px"><h2 style="font-size:19px;font-weight:800;margin-bottom:16px;color:#111">Часті питання про ${escHtml(brand.name)}</h2>${brand.faqItems.map(f=>`<details style="margin-bottom:10px;border:1px solid #eee;border-radius:10px;overflow:hidden"><summary style="padding:14px 18px;font-weight:700;font-size:15px;cursor:pointer;background:#fafafa;color:#111">${escHtml(f.q)}</summary><div style="padding:14px 18px;font-size:14px;color:#555;line-height:1.7">${escHtml(f.a)}</div></details>`).join('')}</section>`:'';
    const relH=brand.relatedSearches?`<section style="margin-bottom:32px"><h2 style="font-size:16px;font-weight:700;margin-bottom:12px;color:#111">Популярні запити</h2><div style="display:flex;flex-wrap:wrap;gap:8px">${brand.relatedSearches.map(q=>`<span style="display:inline-block;padding:8px 14px;background:#f5f5f5;border-radius:20px;font-size:13px;color:#555">${escHtml(q)}</span>`).join('')}</div></section>`:'';
    const head=`<title>${escHtml(brand.title)}</title><meta name="description" content="${escHtml(brand.metaDesc)}"><meta name="keywords" content="${escHtml(brand.keywords||'')}"><meta name="robots" content="index, follow"><link rel="canonical" href="${BASE}/brand/${brandSlug}"><meta property="og:type" content="website"><meta property="og:title" content="${escHtml(brand.name)} — купити електросамокат | RideGO"><meta property="og:description" content="${escHtml(brand.metaDesc)}"><meta property="og:url" content="${BASE}/brand/${brandSlug}"><meta property="og:site_name" content="RideGO"><meta property="og:image" content="${BASE}/og-image.png"><meta property="og:locale" content="uk_UA"><script type="application/ld+json">${bcs}</script><script type="application/ld+json">${ils}</script>${faqs?`<script type="application/ld+json">${faqs}</script>`:''}`;
    const body=`<nav class="bc" aria-label="Breadcrumb"><a href="${BASE}">RideGO</a><span>›</span><a href="${BASE}/catalog">Каталог</a><span>›</span><a href="${BASE}/category/${brand.catSlug}">${escHtml(brand.category)}</a><span>›</span><span>${escHtml(brand.name)}</span></nav><h1>${escHtml(brand.icon)} ${escHtml(brand.h1)}</h1><p style="color:#666;margin-bottom:24px;font-size:15px">Знайдено <strong>${listings.length}</strong> оголошень ${escHtml(brand.name)} на маркетплейсі RideGO</p>${brand.introHtml||''}${modelsHtml}<section><h2 style="font-size:17px;font-weight:700;margin-bottom:16px;color:#111">Оголошення ${escHtml(brand.name)} <span style="color:#888;font-weight:400;font-size:14px">(${listings.length})</span></h2><div class="grid">${lHtml}</div></section>${faqH}${relH}<section style="padding:28px;background:#f0fdf4;border-radius:16px;text-align:center;margin-bottom:32px"><h2 style="font-size:19px;font-weight:700;margin-bottom:8px">Продаєте ${escHtml(brand.name)}?</h2><p style="color:#555;margin-bottom:16px">Розмістіть оголошення безкоштовно на RideGO</p><a href="${BASE}/add" style="display:inline-block;background:#1db954;color:#fff;padding:13px 28px;border-radius:10px;text-decoration:none;font-weight:700">Подати оголошення →</a></section>`;
    res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','s-maxage=1800, stale-while-revalidate=3600');return res.status(200).send(shell(head,body));
  }

  // ════════════════════════════════════
  // CATEGORY PAGE SSR  /category/elektrosamokaty
  // ════════════════════════════════════
  const catName=catInfo?.name||slug; const catDesc=catInfo?.desc||`Купити ${catName} в Україні на маркетплейсі RideGO.`;
  const listings=await getListingsByCategory(catName);
  const lHtml=listings.length?listings.map(l=>card(l)).join('\n'):'<p style="color:#888;grid-column:1/-1">Оголошень поки немає</p>';
  const otherCats=Object.entries(CATEGORIES).filter(([s])=>s!==slug).map(([s,info])=>`<a href="${BASE}/category/${s}" style="display:inline-flex;align-items:center;gap:5px;padding:8px 14px;background:#f0fdf4;border-radius:8px;text-decoration:none;color:#166534;font-size:13px;font-weight:600;margin:3px">${info.icon} ${escHtml(info.name)}</a>`).join('');
  const ils=JSON.stringify({"@context":"https://schema.org","@type":"ItemList","name":`${catName} — RideGO`,"url":`${BASE}/category/${slug}`,"numberOfItems":listings.length,"itemListElement":listings.map((l,i)=>({"@type":"ListItem","position":i+1,"url":`${BASE}/listing/${l.id}`,"name":l.title}))});
  const bcs=JSON.stringify({"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"RideGO","item":BASE},{"@type":"ListItem","position":2,"name":"Каталог","item":`${BASE}/catalog`},{"@type":"ListItem","position":3,"name":catName,"item":`${BASE}/category/${slug}`}]});
  const head=`<title>${escHtml(catName)} — купити в Україні, ціни, оголошення | RideGO</title><meta name="description" content="${escHtml(catDesc)}"><meta name="robots" content="index, follow"><link rel="canonical" href="${BASE}/category/${slug}"><meta property="og:type" content="website"><meta property="og:title" content="${escHtml(catName)} — RideGO"><meta property="og:description" content="${escHtml(catDesc)}"><meta property="og:url" content="${BASE}/category/${slug}"><meta property="og:site_name" content="RideGO"><meta property="og:locale" content="uk_UA"><script type="application/ld+json">${bcs}</script><script type="application/ld+json">${ils}</script>`;
  const body=`<nav class="bc" aria-label="Breadcrumb"><a href="${BASE}">RideGO</a><span>›</span><a href="${BASE}/catalog">Каталог</a><span>›</span><span>${escHtml(catName)}</span></nav><h1>${escHtml(catInfo?.icon||'')} ${escHtml(catName)}</h1><p style="color:#666;margin-bottom:24px;font-size:15px">${escHtml(catDesc)}</p><section style="margin-bottom:28px"><h2 style="font-size:17px;font-weight:700;margin-bottom:12px">Оголошення <span style="color:#888;font-weight:400;font-size:14px">(${listings.length})</span></h2><div class="grid">${lHtml}</div></section><section style="margin-bottom:28px"><h2 style="font-size:16px;font-weight:700;margin-bottom:12px">Інші категорії</h2><div>${otherCats}</div></section>${slug==='elektrosamokaty'?`<section style="margin-bottom:28px"><h2 style="font-size:16px;font-weight:700;margin-bottom:12px">Популярні бренди електросамокатів</h2><div><a href="${BASE}/brand/kukirin" style="display:inline-flex;align-items:center;gap:5px;padding:8px 14px;background:#f0fdf4;border-radius:8px;text-decoration:none;color:#166534;font-size:13px;font-weight:600;margin:3px">⚡ KuKirin (Kugoo Kirin)</a></div></section>`:''}`;
  res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','s-maxage=3600, stale-while-revalidate=86400');res.status(200).send(shell(head,body));
};

// ════════════════════════════════════════════════════════════════
// STATIC SEO PAGES (selling, use-case, geo, comparisons)
