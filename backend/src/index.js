const path = require('path');
// In container __dirname is /app/src, so .env is one level up at /app/.env
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const express    = require('express');
const fileUpload = require('express-fileupload');
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
app.use(fileUpload({ limits: { fileSize: 500 * 1024 * 1024 }, useTempFiles: true }));
app.use(defaultLimiter);

initDB();

// Public
app.get('/health', (req, res) => res.json({ status: 'ok', version: '1.0.1' }));
app.use('/api/auth', authRoutes);

// Protected
app.use('/api/metrics/averages', requireAuth, require('./routes/averages'));
app.use('/api/metrics', requireAuth, metricsRoutes);
app.use('/api/devices', requireAuth, devicesRoutes);
app.use('/api/export',  requireAuth, exportRoutes);
app.use('/api/sync',    requireAuth, syncRoutes);
app.use('/api/import',  requireAuth, importRoutes);
app.use('/api/profiles', require('./routes/profiles'));
app.use('/api/workouts', require('./routes/workouts'));
app.use('/api/events', require('./routes/events'));

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
