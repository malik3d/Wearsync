require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const { initDB } = require('./models/database');

const authRoutes    = require('./routes/auth');
const metricsRoutes = require('./routes/metrics');
const devicesRoutes = require('./routes/devices');
const exportRoutes  = require('./routes/export');
const syncRoutes    = require('./routes/sync');
const importRoutes  = require('./routes/import');
const { scheduleDailyCron } = require('./utils/cron');
const { requireAuth, generateToken, defaultLimiter } = require('./middleware/auth');

const app  = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(defaultLimiter);

initDB();

// Public
app.get('/health', (req, res) => res.json({ status: 'ok', version: '1.0.1' }));
app.use('/auth', authRoutes);

// Protected
app.use('/metrics', requireAuth, metricsRoutes);
app.use('/devices', requireAuth, devicesRoutes);
app.use('/export',  requireAuth, exportRoutes);
app.use('/sync',    requireAuth, syncRoutes);
app.use('/import',  requireAuth, importRoutes);

const { serveStatic } = require('./static');
serveStatic(app);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🩺 WearSync Backend running on http://localhost:${PORT}`);
  if (process.env.JWT_SECRET && process.env.JWT_SECRET !== 'change_this_to_a_random_secret_string') {
    console.log(`\n🔑 Your API token:\n   ${generateToken()}\n`);
  } else {
    console.log(`\n⚠️  Auth disabled — set JWT_SECRET in .env to secure your instance\n`);
  }
  scheduleDailyCron();
});
