const ALLOWED_ORIGINS = [
  'https://ridego-sigma.vercel.app',
  'https://ridego-6f981.firebaseapp.com',
  'https://ridego-6f981.web.app',
  'http://localhost:3000',
  'http://localhost:5000',
];

module.exports = (req, res) => {
  if (req.method !== 'GET') return res.status(405).end();

  const origin = req.headers.origin || '';
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const cfg = {
    apiKey:            process.env.FIREBASE_API_KEY,
    authDomain:        process.env.FIREBASE_AUTH_DOMAIN,
    databaseURL:       process.env.FIREBASE_DATABASE_URL,
    projectId:         process.env.FIREBASE_PROJECT_ID,
    storageBucket:     process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER,
    appId:             process.env.FIREBASE_APP_ID,
  };

  // Перевірити що всі змінні задані
  const missing = Object.entries(cfg)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missing.length > 0) {
    console.error('Missing env vars:', missing.join(', '));
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  res.status(200).json(cfg);
};
