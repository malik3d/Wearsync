const jwt      = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

function generateToken() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'change_this_to_a_random_secret_string') {
    console.warn('⚠️  WARNING: JWT_SECRET is not set. Set a strong secret in .env');
  }
  return jwt.sign({ role: 'owner' }, secret, { expiresIn: '365d' });
}

function requireAuth(req, res, next) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'change_this_to_a_random_secret_string') {
    console.warn('⚠️  Auth disabled — set JWT_SECRET in .env to enable');
    return next();
  }
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    jwt.verify(header.slice(7), process.env.JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

const defaultLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const syncLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Sync rate limit exceeded — max 5 per minute.' },
});

const importLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Import rate limit exceeded — max 10 per hour.' },
});

module.exports = { requireAuth, generateToken, defaultLimiter, syncLimiter, importLimiter };
```

---

Commit message unten:
```
security: fix #1 #4 — wire up JWT auth and rate limiting
