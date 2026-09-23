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

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    return res.status(500).json({ error: 'RESEND_API_KEY not configured' });
  }

  const { type, toUid, data } = req.body || {};

  // ── 1. Тільки відомі типи ───────────────────────────────────
  if (!['welcome', 'new_message'].includes(type)) {
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
