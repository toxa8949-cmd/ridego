// api/send-email.js — Vercel serverless function
// Відправка email через Resend API

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ── Простий ліміт у пам'яті інстансу лямбди ──────────────────
// Не є повноцінним rate-limit (у Vercel кілька інстансів), але
// відсікає найгрубіше зловживання. Головний захист — ID-токен нижче.
const _rate = new Map();
function rateLimited(uid) {
  const now = Date.now();
  const WINDOW = 60 * 60 * 1000;   // 1 година
  const MAX    = 20;               // не більше 20 листів на годину з акаунта
  const rec = _rate.get(uid);
  if (!rec || now - rec.start > WINDOW) {
    _rate.set(uid, { start: now, count: 1 });
    return false;
  }
  rec.count++;
  if (_rate.size > 5000) _rate.clear();
  return rec.count > MAX;
}

const { verifyIdToken, bearer, getAdminToken, PROJECT } = require('./_auth');

// ── Email отримувача беремо з Firestore за uid, а не з тіла ──
// Колекція users закрита правилами, тож читаємо її службовим
// токеном (FIREBASE_SERVICE_ACCOUNT у Vercel). Без нього — ''.
async function getUserEmail(uid) {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(uid || '')) return '';
  const token = await getAdminToken();
  if (!token) return '';
  try {
    const r = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users/${uid}`,
      { headers: { Authorization: 'Bearer ' + token } }
    );
    if (!r.ok) { console.warn('[send-email] users read http', r.status); return ''; }
    const j = await r.json();
    return (j.fields && j.fields.email && j.fields.email.stringValue) || '';
  } catch (e) {
    return '';
  }
}

// ── Firestore REST зі службовим токеном ───────────────────────
const FS = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

function fromValue(v) {
  if (!v || typeof v !== 'object') return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return { seconds: Math.floor(Date.parse(v.timestampValue) / 1000) };
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromValue);
  if ('mapValue' in v) return fromFields(v.mapValue.fields || {});
  return null;
}
function fromFields(f) {
  const o = {};
  Object.keys(f || {}).forEach(k => { o[k] = fromValue(f[k]); });
  return o;
}
function docId(name) { return String(name || '').split('/').pop(); }

async function fsGet(token, path) {
  const r = await fetch(`${FS}/${path}`, { headers: { Authorization: 'Bearer ' + token } });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('fs get ' + r.status);
  const j = await r.json();
  return Object.assign({ id: docId(j.name) }, fromFields(j.fields));
}
async function fsQuery(token, collection, field, op, value, limit) {
  const v = typeof value === 'boolean' ? { booleanValue: value } : { stringValue: String(value) };
  const r = await fetch(`${FS}:runQuery`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: {
      from: [{ collectionId: collection }],
      where: { fieldFilter: { field: { fieldPath: field }, op, value: v } },
      limit: limit || 500
    } })
  });
  if (!r.ok) throw new Error('fs query ' + r.status);
  const rows = await r.json();
  return rows.filter(x => x.document).map(x => Object.assign({ id: docId(x.document.name) }, fromFields(x.document.fields)));
}
async function fsGetMany(token, paths) {
  if (!paths.length) return [];
  const base = `projects/${PROJECT}/databases/(default)/documents/`;
  const r = await fetch(`${FS}:batchGet`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ documents: paths.map(p => base + p) })
  });
  if (!r.ok) throw new Error('fs batchGet ' + r.status);
  const rows = await r.json();
  return rows.filter(x => x.found).map(x => Object.assign({ id: docId(x.found.name) }, fromFields(x.found.fields)));
}
// Записати кілька полів (лише їх — через updateMask)
async function fsPatch(token, path, values) {
  const fields = {}, mask = [];
  Object.keys(values).forEach(k => {
    const v = values[k];
    mask.push('updateMask.fieldPaths=' + encodeURIComponent(k));
    if (v instanceof Date) fields[k] = { timestampValue: v.toISOString() };
    else if (typeof v === 'number') fields[k] = Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    else fields[k] = { stringValue: String(v) };
  });
  const r = await fetch(`${FS}/${path}?${mask.join('&')}&currentDocument.exists=true`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields })
  });
  if (!r.ok) throw new Error('fs patch ' + r.status);
}

// Та сама логіка, що й у js/ux.js → matchSearch
function norm(s) { return String(s || '').toLowerCase().trim(); }
function matchSearch(s, l) {
  if (s.cat && s.cat !== l.cat) return false;
  if (s.city) { if (norm(s.city) !== norm(l.city)) return false; }
  else if (s.oblast) {
    if (norm(l.oblast) !== norm(s.oblast) && norm(l.fullLoc).indexOf(norm(s.oblast)) < 0) return false;
  }
  const t = norm(l.title) + ' ' + norm(l.brand) + ' ' + norm(l.model);
  if (s.brand && t.indexOf(norm(s.brand)) < 0) return false;
  if (s.model && t.indexOf(norm(s.model)) < 0) return false;
  const price = Number(l.price) || 0;
  if (s.priceFrom && price < Number(s.priceFrom)) return false;
  if (s.priceTo && price > Number(s.priceTo)) return false;
  if (s.condition && s.condition !== l.condition) return false;
  return true;
}

const SITE = 'https://www.ridego.com.ua';
function fmtPrice(n) { return Number(n || 0).toLocaleString('uk-UA').replace(/\u202f|\u00a0/g, ' '); }
function thumb(url) {
  url = String(url || '');
  if (!/^https:\/\/res\.cloudinary\.com\//.test(url)) return '';
  return url.replace('/upload/', '/upload/c_fill,w_520,h_340,q_auto,f_jpg/');
}
function listingCard(l, extra) {
  const img = thumb(l.img || (Array.isArray(l.imgs) && l.imgs[0]));
  const url = `${SITE}/listing/${encodeURIComponent(l.id)}`;
  return `
      <a href="${url}" style="display:block;text-decoration:none;color:#111;border:1px solid #eee;border-radius:12px;overflow:hidden;margin:0 0 24px">
        ${img ? `<img src="${escHtml(img)}" alt="" width="480" style="display:block;width:100%;height:auto;border:0">` : ''}
        <div style="padding:16px 18px">
          <div style="font-size:16px;font-weight:700;margin:0 0 6px">${escHtml(l.title || 'Оголошення')}</div>
          <div style="font-size:20px;font-weight:800;color:#1db954">${fmtPrice(l.price)} грн ${extra || ''}</div>
          <div style="font-size:13px;color:#777;margin-top:6px">${escHtml(l.city || '')}${l.condition ? ' · ' + escHtml(l.condition) : ''}</div>
        </div>
      </a>`;
}
function wrapEmail(headline, bodyHtml, footNote) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Segoe UI',Arial,sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
    <div style="background:#1db954;padding:24px 40px;text-align:center">
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:800;letter-spacing:-0.5px">RideGO</h1>
    </div>
    <div style="padding:32px 40px">
      <h2 style="margin:0 0 20px;font-size:20px;color:#111">${headline}</h2>
      ${bodyHtml}
    </div>
    <div style="padding:20px 40px;background:#f9f9f9;border-top:1px solid #eee;text-align:center">
      <p style="margin:0 0 6px;color:#999;font-size:12px">${footNote}</p>
      <p style="margin:0;color:#999;font-size:12px">© 2026 RideGO · <a href="${SITE}" style="color:#1db954;text-decoration:none">ridego.com.ua</a></p>
    </div>
  </div>
</body>
</html>`;
}

// Розсилка через Resend batch (до 100 листів за запит)
async function sendBatch(key, emails) {
  let sent = 0;
  for (let i = 0; i < emails.length; i += 100) {
    const chunk = emails.slice(i, i + 100).map(e => Object.assign({ from: 'RideGO <noreply@ridego.com.ua>' }, e));
    const r = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(chunk)
    });
    if (r.ok) sent += chunk.length;
    else console.error('[send-email] batch', r.status, await r.text().catch(() => ''));
  }
  return sent;
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Нове оголошення → власникам збережених пошуків ────────────
// Викликає автор оголошення одразу після публікації. Сервер сам
// перевіряє, що оголошення його, свіже і ще не розсилалось.
async function notifyNewListing(caller, listingId, key) {
  const token = await getAdminToken();
  if (!token) return [501, { error: 'Service account not configured' }];
  const l = await fsGet(token, 'listings/' + listingId);
  if (!l) return [404, { error: 'Listing not found' }];
  if (l.uid !== caller.uid) return [403, { error: 'Not your listing' }];
  if (l.status !== 'active') return [200, { sent: 0, skipped: 'not active' }];
  const created = (l.createdAt && l.createdAt.seconds) || 0;
  if (!created || Date.now() / 1000 - created > 6 * 3600) return [200, { sent: 0, skipped: 'too old' }];
  if (l.searchNotifiedAt) return [200, { sent: 0, skipped: 'already sent' }];
  await fsPatch(token, 'listings/' + listingId, { searchNotifiedAt: new Date() });

  const searches = await fsQuery(token, 'savedSearches', 'notify', 'EQUAL', true, 2000);
  const byUid = {};
  searches.forEach(s => {
    if (!s.uid || s.uid === l.uid || byUid[s.uid]) return;
    if (matchSearch(s, l)) byUid[s.uid] = s;
  });
  const uids = Object.keys(byUid).slice(0, 500);
  if (!uids.length) return [200, { sent: 0 }];
  const users = await fsGetMany(token, uids.map(u => 'users/' + u));
  const emails = users.filter(u => EMAIL_RE.test(u.email || '') && u.status !== 'blocked').map(u => {
    const s = byUid[u.id];
    return {
      to: [u.email],
      subject: `🔔 Нове оголошення: ${String(l.title || '').slice(0, 80)} — RideGO`,
      html: wrapEmail(
        'З\'явилось нове оголошення за вашим пошуком',
        `<p style="margin:0 0 18px;color:#444;font-size:15px;line-height:1.6">Пошук: <strong>${escHtml(s.label || '')}</strong></p>` +
        listingCard(l) +
        `<a href="${SITE}/listing/${encodeURIComponent(l.id)}" style="display:inline-block;background:#1db954;color:#fff;text-decoration:none;padding:13px 26px;border-radius:10px;font-weight:600;font-size:15px">Переглянути оголошення →</a>`,
        `Ви отримали цей лист, бо зберегли пошук на RideGO. <a href="${SITE}/profile?tab=favs" style="color:#999">Керувати сповіщеннями</a>`
      )
    };
  });
  const sent = await sendBatch(key, emails);
  return [200, { sent }];
}

// ── Зниження ціни → тим, хто додав оголошення в обране ────────
async function notifyPriceDrop(caller, listingId, key) {
  const token = await getAdminToken();
  if (!token) return [501, { error: 'Service account not configured' }];
  const l = await fsGet(token, 'listings/' + listingId);
  if (!l) return [404, { error: 'Listing not found' }];
  if (l.uid !== caller.uid) return [403, { error: 'Not your listing' }];
  const price = Number(l.price) || 0, old = Number(l.oldPrice) || 0;
  if (l.status !== 'active' || !old || !price || old <= price) return [200, { sent: 0, skipped: 'no drop' }];
  const dropped = (l.priceDroppedAt && l.priceDroppedAt.seconds) || 0;
  if (Date.now() / 1000 - dropped > 3600) return [200, { sent: 0, skipped: 'stale' }];
  // Не частіше разу на добу і лише якщо ціна нижча за ту, про яку вже писали
  const lastAt = (l.priceNotifiedAt && l.priceNotifiedAt.seconds) || 0;
  if (Date.now() / 1000 - lastAt < 86400) return [200, { sent: 0, skipped: 'recently sent' }];
  if (l.priceNotifiedPrice && price >= Number(l.priceNotifiedPrice)) return [200, { sent: 0, skipped: 'not lower' }];
  await fsPatch(token, 'listings/' + listingId, { priceNotifiedAt: new Date(), priceNotifiedPrice: price });

  const favs = await fsQuery(token, 'favorites', 'listingId', 'EQUAL', listingId, 1000);
  const uids = [...new Set(favs.map(f => f.uid).filter(u => u && u !== l.uid))].slice(0, 500);
  if (!uids.length) return [200, { sent: 0 }];
  const users = await fsGetMany(token, uids.map(u => 'users/' + u));
  const pct = Math.round((old - price) / old * 100);
  const extra = `<span style="font-size:14px;color:#999;text-decoration:line-through;font-weight:400;margin-left:6px">${fmtPrice(old)} грн</span>`;
  const emails = users
    .filter(u => EMAIL_RE.test(u.email || '') && u.status !== 'blocked' && u.emailPriceDrop !== false)
    .map(u => ({
      to: [u.email],
      subject: `💸 Ціну знижено на ${pct}%: ${String(l.title || '').slice(0, 70)} — RideGO`,
      html: wrapEmail(
        `Ціна знизилась на ${pct}% 💸`,
        `<p style="margin:0 0 18px;color:#444;font-size:15px;line-height:1.6">Продавець знизив ціну на оголошення з вашого обраного — тепер на <strong>${fmtPrice(old - price)} грн</strong> дешевше.</p>` +
        listingCard(l, extra) +
        `<a href="${SITE}/listing/${encodeURIComponent(l.id)}" style="display:inline-block;background:#1db954;color:#fff;text-decoration:none;padding:13px 26px;border-radius:10px;font-weight:600;font-size:15px">Написати продавцю →</a>`,
        `Ви отримали цей лист, бо додали оголошення в обране на RideGO. <a href="${SITE}/profile?tab=favs" style="color:#999">Вимкнути такі листи</a>`
      )
    }));
  const sent = await sendBatch(key, emails);
  return [200, { sent }];
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    return res.status(500).json({ error: 'RESEND_API_KEY not configured' });
  }

  const { type, toUid, data, listingId } = req.body || {};

  // ── 1. Тільки відомі типи ───────────────────────────────────
  if (!['welcome', 'new_message', 'new_listing', 'price_drop'].includes(type)) {
    return res.status(400).json({ error: 'Unknown email type' });
  }

  // ── 2. Обов'язковий Firebase ID-токен ───────────────────────
  // Раніше тут була перевірка Origin, яка пропускала будь-який
  // запит без заголовка Origin (звичайний curl) — відкритий релей.
  const caller = await verifyIdToken(bearer(req), 'send-email');
  if (!caller) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // ── 3. Ліміт на акаунт ──────────────────────────────────────
  if (rateLimited(caller.uid)) {
    return res.status(429).json({ error: 'Too many emails' });
  }

  // ── Розсилки за оголошенням (нове / знижена ціна) ───────────
  if (type === 'new_listing' || type === 'price_drop') {
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(listingId || '')) {
      return res.status(400).json({ error: 'Bad listingId' });
    }
    try {
      const [code, body] = type === 'new_listing'
        ? await notifyNewListing(caller, listingId, RESEND_API_KEY)
        : await notifyPriceDrop(caller, listingId, RESEND_API_KEY);
      return res.status(code).json(body);
    } catch (e) {
      console.error('[send-email] ' + type, e.message);
      return res.status(500).json({ error: 'Notify failed' });
    }
  }

  // ── 4. Адресу визначає СЕРВЕР, а не клієнт ──────────────────
  let to = '';
  if (type === 'welcome') {
    // вітальний лист — тільки на власну адресу з токена
    to = caller.email;
  } else {
    // лист про повідомлення — на адресу співрозмовника за його uid
    to = await getUserEmail(toUid);
  }

  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return res.status(400).json({ error: 'Recipient not resolved' });
  }

  // ── 5. Обрізаємо поля, що потрапляють у лист ────────────────
  const safe = {
    name:         String((data && data.name) || '').slice(0, 80),
    senderName:   String((data && data.senderName) || '').slice(0, 80),
    message:      String((data && data.message) || '').slice(0, 500),
    listingTitle: String((data && data.listingTitle) || '').slice(0, 120)
  };

  let subject = '';
  let html = '';

  // ── ВІТАЛЬНИЙ EMAIL ────────────────────────────────────────
  if (type === 'welcome') {
    subject = '👋 Ласкаво просимо на RideGO!';
    html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Segoe UI',Arial,sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
    <!-- Header -->
    <div style="background:#1db954;padding:32px 40px;text-align:center">
      <h1 style="margin:0;color:#fff;font-size:28px;font-weight:800;letter-spacing:-0.5px">RideGO</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px">Маркетплейс електротранспорту України</p>
    </div>
    <!-- Body -->
    <div style="padding:40px">
      <h2 style="margin:0 0 16px;font-size:22px;color:#111">Ласкаво просимо, ${escHtml(safe.name || 'друже')}! 🎉</h2>
      <p style="margin:0 0 20px;color:#444;line-height:1.6;font-size:15px">
        Ваш акаунт на <strong>RideGO</strong> успішно створений. Тепер ви можете купувати, продавати та обмінюватись електросамокатами, велосипедами та іншим транспортом.
      </p>
      <div style="background:#f0fdf4;border-radius:12px;padding:20px;margin:24px 0">
        <p style="margin:0 0 12px;font-weight:600;color:#166534;font-size:14px">🎁 Ваш стартовий бонус:</p>
        <p style="margin:0;color:#166534;font-size:15px"><strong>10 безкоштовних розміщень</strong> — публікуйте оголошення вже зараз!</p>
      </div>
      <a href="https://ridego.com.ua" style="display:inline-block;background:#1db954;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px;margin-top:8px">
        Перейти на RideGO →
      </a>
    </div>
    <!-- Footer -->
    <div style="padding:24px 40px;background:#f9f9f9;border-top:1px solid #eee;text-align:center">
      <p style="margin:0;color:#999;font-size:12px">© 2026 RideGO · <a href="https://ridego.com.ua" style="color:#1db954;text-decoration:none">ridego.com.ua</a></p>
    </div>
  </div>
</body>
</html>`;
  }

  // ── НОВЕ ПОВІДОМЛЕННЯ В ЧАТІ ───────────────────────────────
  else if (type === 'new_message') {
    subject = `💬 Нове повідомлення від ${escHtml(safe.senderName || 'користувача')} — RideGO`;
    html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Segoe UI',Arial,sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
    <!-- Header -->
    <div style="background:#1db954;padding:32px 40px;text-align:center">
      <h1 style="margin:0;color:#fff;font-size:28px;font-weight:800;letter-spacing:-0.5px">RideGO</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px">Нове повідомлення</p>
    </div>
    <!-- Body -->
    <div style="padding:40px">
      <h2 style="margin:0 0 16px;font-size:20px;color:#111">У вас нове повідомлення 💬</h2>
      <p style="margin:0 0 20px;color:#444;line-height:1.6;font-size:15px">
        <strong>${escHtml(safe.senderName || 'Користувач')}</strong> написав вам повідомлення${safe.listingTitle ? ` щодо оголошення <strong>"${escHtml(safe.listingTitle)}"</strong>` : ''}:
      </p>
      <div style="background:#f8f8f8;border-left:4px solid #1db954;border-radius:0 8px 8px 0;padding:16px 20px;margin:0 0 24px">
        <p style="margin:0;color:#333;font-size:15px;line-height:1.6;font-style:italic">"${escHtml(safe.message)}"</p>
      </div>
      <a href="https://ridego.com.ua/messages" style="display:inline-block;background:#1db954;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px">
        Відповісти →
      </a>
    </div>
    <!-- Footer -->
    <div style="padding:24px 40px;background:#f9f9f9;border-top:1px solid #eee;text-align:center">
      <p style="margin:0;color:#999;font-size:12px">© 2026 RideGO · <a href="https://ridego.com.ua" style="color:#1db954;text-decoration:none">ridego.com.ua</a></p>
    </div>
  </div>
</body>
</html>`;
  }

  else {
    return res.status(400).json({ error: 'Unknown email type' });
  }

  // Відправка через Resend
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'RideGO <noreply@ridego.com.ua>',
        to: [to],
        subject,
        html
      })
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Resend error:', result);
      return res.status(response.status).json({ error: result.message || 'Resend error' });
    }

    return res.status(200).json({ success: true, id: result.id });
  } catch (err) {
    console.error('Send email error:', err);
    return res.status(500).json({ error: err.message });
  }
}

module.exports = handler;
