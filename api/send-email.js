// api/send-email.js — Vercel serverless function
// Відправка email через Resend API

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

export default async function handler(req, res) {
  // Тільки POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    return res.status(500).json({ error: 'RESEND_API_KEY not configured' });
  }

  const { type, to, data } = req.body;

  if (!type || !to) {
    return res.status(400).json({ error: 'Missing type or to' });
  }

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
      <h2 style="margin:0 0 16px;font-size:22px;color:#111">Ласкаво просимо, ${escHtml(data?.name || 'друже')}! 🎉</h2>
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
    subject = `💬 Нове повідомлення від ${escHtml(data?.senderName || 'користувача')} — RideGO`;
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
        <strong>${escHtml(data?.senderName || 'Користувач')}</strong> написав вам повідомлення${data?.listingTitle ? ` щодо оголошення <strong>"${escHtml(data.listingTitle)}"</strong>` : ''}:
      </p>
      <div style="background:#f8f8f8;border-left:4px solid #1db954;border-radius:0 8px 8px 0;padding:16px 20px;margin:0 0 24px">
        <p style="margin:0;color:#333;font-size:15px;line-height:1.6;font-style:italic">"${escHtml(data?.message || '')}"</p>
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
