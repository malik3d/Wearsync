// routes/devices.js
const express = require('express');
const router = express.Router();
const { getDB } = require('../models/database');

router.get('/', (req, res) => {
  const db = getDB();
  const devices = db.prepare('SELECT provider, label, connected_at, last_sync FROM devices').all();
  const ALL_PROVIDERS = ['garmin', 'fitbit', 'whoop', 'withings', 'zepp'];
  const connected = new Set(devices.map(d => d.provider));
  const result = ALL_PROVIDERS.map(p => ({
    provider: p,
    label: devices.find(d => d.provider === p)?.label || p.charAt(0).toUpperCase() + p.slice(1),
    connected: connected.has(p),
    connected_at: devices.find(d => d.provider === p)?.connected_at || null,
    last_sync: devices.find(d => d.provider === p)?.last_sync || null,
  }));
  res.json(result);
});

router.delete('/:provider', (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM devices WHERE provider=?').run(req.params.provider);
  res.json({ ok: true });
});

module.exports = router;
