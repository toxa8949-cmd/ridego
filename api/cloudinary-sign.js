// api/cloudinary-sign.js — підпис для завантаження фото в Cloudinary.
//
// ЩО БУЛО НЕ ТАК
//   Усі п'ять місць, де сайт вантажить зображення, робили так:
//       fd.append('upload_preset', 'ridego_unsigned');
//       fetch('https://api.cloudinary.com/v1_1/dxgtpo5dq/image/upload', ...)
//
//   «unsigned» означає, що підпис не потрібен: достатньо знати назву
//   пресета й хмари, а вони лежать у відкритому JS будь-якої сторінки.
//   Тобто заливати файли в акаунт міг хто завгодно, навіть не реєструючись:
//   з'їсти квоту, залити сторонній вміст і роздавати його з вашого акаунта.
//
// ЯК ТЕПЕР
//   Клієнт спершу просить підпис тут. Ми перевіряємо його Firebase
//   ID-токен, і лише авторизованому користувачу віддаємо підпис,
//   дійсний для однієї конкретної теки й одного моменту часу.
//   Сам секрет Cloudinary на клієнт не потрапляє ніколи.
//
// ЩО ПОТРІБНО ДОДАТИ В VERCEL (Settings → Environment Variables)
//   CLOUDINARY_API_KEY     — з Cloudinary → Settings → API Keys
//   CLOUDINARY_API_SECRET  — звідти ж
//
//   Поки цих змінних немає, функція відповідає 501 і фото не вантажаться.

const crypto = require('crypto');
const { verifyIdToken, bearer, PROJECT } = require('./_auth');

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'dxgtpo5dq';

// Теки, в які взагалі можна вантажити. Без цього списку клієнт міг би
// попросити підпис на будь-який шлях в акаунті.
const FOLDER_OK = /^(listings\/[A-Za-z0-9_-]{1,64}|services|feedback|profiles|avatars|news)$/;
// Ці теки — лише для адмінів (фото новин з адмінки).
const ADMIN_FOLDERS = ['news'];

// Адмін = існує документ admins/{uid}. Читаємо його токеном самого
// користувача: правила дозволяють це будь-кому авторизованому.
async function isAdmin(uid, idToken) {
  try {
    const r = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/admins/${encodeURIComponent(uid)}`,
      { headers: { Authorization: 'Bearer ' + idToken } }
    );
    return r.ok;
  } catch (e) { return false; }
}

// Простий ліміт у пам'яті інстансу — щоб один акаунт не міг
// нескінченно просити підписи.
const _rate = new Map();
function rateLimited(uid) {
  const now = Date.now(), WINDOW = 60 * 60 * 1000, MAX = 200;
  const rec = _rate.get(uid);
  if (!rec || now - rec.start > WINDOW) { _rate.set(uid, { start: now, count: 1 }); return false; }
  rec.count++;
  if (_rate.size > 5000) _rate.clear();
  return rec.count > MAX;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const API_KEY    = process.env.CLOUDINARY_API_KEY;
  const API_SECRET = process.env.CLOUDINARY_API_SECRET;
  if (!API_KEY || !API_SECRET) {
    // Навмисно 501, а не 500: клієнт розуміє це як «підписи ще не
    // налаштовані» і використовує старий шлях замість показу помилки.
    return res.status(501).json({ error: 'Signed uploads not configured' });
  }

  const idToken = bearer(req);
  const caller = await verifyIdToken(idToken, 'cloudinary');
  if (!caller) return res.status(401).json({ error: 'Unauthorized' });

  if (rateLimited(caller.uid)) return res.status(429).json({ error: 'Too many uploads' });

  const folder = String((req.body && req.body.folder) || '').trim();
  if (!FOLDER_OK.test(folder)) return res.status(400).json({ error: 'Bad folder' });
  if (ADMIN_FOLDERS.includes(folder) && !(await isAdmin(caller.uid, idToken))) {
    return res.status(403).json({ error: 'Admins only' });
  }

  // Підпис Cloudinary: sha1 від параметрів, відсортованих за іменем,
  // плюс секрет у кінці. Підписуємо рівно те, що надішле клієнт.
  const timestamp = Math.floor(Date.now() / 1000);
  const toSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto.createHash('sha1').update(toSign + API_SECRET).digest('hex');

  return res.status(200).json({
    cloudName: CLOUD_NAME,
    apiKey: API_KEY,
    timestamp,
    folder,
    signature
  });
};
