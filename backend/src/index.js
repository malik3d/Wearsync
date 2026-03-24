require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDB } = require('./models/database');

const authRoutes    = require('./routes/auth');
const metricsRoutes = require('./routes/metrics');
const devicesRoutes = require('./routes/devices');
const exportRoutes  = require('./routes/export');
const syncRoutes    = require('./routes/sync');
const importRoutes  = require('./routes/import');
const { scheduleDailyCron } = require('./utils/cron');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());

// Init database on startup
initDB();

// Routes
app.use('/auth',    authRoutes);
app.use('/metrics', metricsRoutes);
app.use('/devices', devicesRoutes);
app.use('/export',  exportRoutes);
app.use('/sync',    syncRoutes);
app.use('/import',  importRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', version: '1.0.0' }));

app.listen(PORT, () => {
  console.log(`\n🩺 WearSync Backend running on http://localhost:${PORT}`);
  console.log(`   Connected devices: check /devices`);
  scheduleDailyCron();
});
