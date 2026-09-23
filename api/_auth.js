// api/_auth.js — спільна перевірка Firebase ID-токена і службовий доступ до Firestore.
//
// ЧОМУ НЕ identitytoolkit accounts:lookup
//   Раніше токен перевірявся запитом до Google з публічним ключем сайту.
//   Із сервера Vercel цей запит не проходив, тому і /api/cloudinary-sign,
//   і /api/send-email відповідали 401 навіть справжньому користувачу.
//
//   Тепер токен перевіряється локально, як це робить firebase-admin:
//   підпис RS256 звіряється з публічними сертифікатами Google, плюс
//   перевіряються aud / iss / exp / sub. Жодних ключів для цього не треба.
//
// СЛУЖБОВИЙ ДОСТУП (необов'язково)
//   Якщо у Vercel задано FIREBASE_SERVICE_ACCOUNT (увесь JSON сервісного
//   акаунта Firebase), getAdminToken() видає OAuth-токен, з яким сервер
//   може читати закриту колекцію users — наприклад, email отримувача
//   листа про нове повідомлення. Без змінної повертає null.

const crypto = require('crypto');

const PROJECT = process.env.FIREBASE_PROJECT_ID || 'ridego-6f981';
const CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

let _certs = null, _certsExp = 0;
async function getCerts() {
  if (_certs && Date.now() < _certsExp) return _certs;
  const r = await fetch(CERTS_URL);
  if (!r.ok) throw new Error('certs http ' + r.status);
  const m = (r.headers.get('cache-control') || '').match(/max-age=(\d+)/);
  _certs = await r.json();
  _certsExp = Date.now() + (m ? Number(m[1]) * 1000 : 3600 * 1000);
  return _certs;
}

function b64uDecode(s) {
  return Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}
function b64uEncode(buf) {
  return Buffer.from(buf).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

// Повертає { uid, email } або кидає Error з короткою причиною.
async function verifyIdTokenStrict(idToken) {
  if (!idToken) throw new Error('no token');
  const parts = String(idToken).split('.');
  if (parts.length !== 3) throw new Error('bad format');

  let header, p;
  try {
    header = JSON.parse(b64uDecode(parts[0]).toString('utf8'));
    p = JSON.parse(b64uDecode(parts[1]).toString('utf8'));
  } catch (e) { throw new Error('bad json'); }

  if (header.alg !== 'RS256') throw new Error('bad alg');
  const certs = await getCerts();
  let pem = certs[header.kid];
  if (!pem) {                       // сертифікати могли щойно оновитись
    _certsExp = 0;
    pem = (await getCerts())[header.kid];
    if (!pem) throw new Error('unknown kid');
  }

  const ok = crypto.verify(
    'RSA-SHA256',
    Buffer.from(parts[0] + '.' + parts[1]),
    crypto.createPublicKey(pem),
    b64uDecode(parts[2])
  );
  if (!ok) throw new Error('bad signature');

  const now = Math.floor(Date.now() / 1000);
  if (p.aud !== PROJECT) throw new Error('bad aud');
  if (p.iss !== 'https://securetoken.google.com/' + PROJECT) throw new Error('bad iss');
  if (typeof p.exp !== 'number' || p.exp < now - 30) throw new Error('expired');
  if (typeof p.iat !== 'number' || p.iat > now + 300) throw new Error('bad iat');
  if (!p.sub || typeof p.sub !== 'string' || p.sub.length > 128) throw new Error('bad sub');

  return { uid: p.sub, email: p.email || '' };
}

// Зручна обгортка: { uid, email } або null; причину пише в лог.
async function verifyIdToken(idToken, tag) {
  try {
    return await verifyIdTokenStrict(idToken);
  } catch (e) {
    if (idToken) console.warn('[auth' + (tag ? ':' + tag : '') + '] token rejected:', e.message);
    return null;
  }
}

function bearer(req) {
  const h = (req.headers && req.headers.authorization) || '';
  return h.startsWith('Bearer ') ? h.slice(7).trim() : '';
}

// ── Службовий OAuth-токен з сервісного акаунта ────────────────
let _admin = null, _adminExp = 0;
async function getAdminToken() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  if (_admin && Date.now() < _adminExp) return _admin;
  try {
    const sa = JSON.parse(raw);
    const iat = Math.floor(Date.now() / 1000);
    const head = b64uEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claims = b64uEncode(JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/datastore',
      aud: 'https://oauth2.googleapis.com/token',
      iat, exp: iat + 3600
    }));
    const sig = b64uEncode(crypto.sign('RSA-SHA256', Buffer.from(head + '.' + claims), sa.private_key));
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') +
            '&assertion=' + head + '.' + claims + '.' + sig
    });
    if (!r.ok) { console.warn('[auth] admin token http', r.status); return null; }
    const j = await r.json();
    _admin = j.access_token;
    _adminExp = Date.now() + Math.max(60, (j.expires_in || 3600) - 120) * 1000;
    return _admin;
  } catch (e) {
    console.warn('[auth] admin token failed:', e.message);
    return null;
  }
}

module.exports = { PROJECT, verifyIdToken, verifyIdTokenStrict, bearer, getAdminToken };
