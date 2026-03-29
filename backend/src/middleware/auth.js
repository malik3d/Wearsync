const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_to_a_random_secret_string';

// Rate limiters
const defaultLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});

const importLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Too many import requests, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many auth attempts, please try again later.' }
});

function generateToken(userId = 'local') {
  if (!JWT_SECRET || JWT_SECRET === 'change_this_to_a_random_secret_string') {
    return null;
  }
  return jwt.sign({ userId, iat: Date.now() }, JWT_SECRET, { expiresIn: '30d' });
}

function requireAuth(req, res, next) {
  if (!JWT_SECRET || JWT_SECRET === 'change_this_to_a_random_secret_string') {
    req.user = { userId: 'local' };
    return next();
  }
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { defaultLimiter, importLimiter, authLimiter, generateToken, requireAuth };
