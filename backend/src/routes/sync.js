// routes/sync.js
const express = require('express');
const router  = express.Router();
const { getDB } = require('../models/database');
const garmin    = require('../services/garmin');
const fitbit    = require('../services/fitbit');
const whoop     = require('../services/whoop');
const withings  = require('../services/withings');
const zepp      = require('../services/zepp');

const SERVICES = { garmin, fitbit, whoop, withings, zepp };

// POST /sync — sync all connected devices for a date
router.post('/', async (req, res) => {
  const date    = req.body.date || new Date().toISOString().slice(0, 10);
  const db      = getDB();
  const devices = db.prepare('SELECT provider FROM devices').all().map(d => d.provider);

  const results = {};
  for (const provider of devices) {
    if (!SERVICES[provider]) { results[provider] = { skipped: true }; continue; }
    try {
      results[provider] = await SERVICES[provider].fetchDaily(date);
    } catch (e) {
      results[provider] = { error: e.message };
    }
  }

  res.json({ date, results });
});

// POST /sync/:provider — sync specific device
router.post('/:provider', async (req, res) => {
  const date     = req.body.date || new Date().toISOString().slice(0, 10);
  const provider = req.params.provider;
  const svc      = SERVICES[provider];
  if (!svc) return res.status(404).json({ error: 'Unknown provider' });

  try {
    const data = await svc.fetchDaily(date);
    res.json({ date, provider, data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
