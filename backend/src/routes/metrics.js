// routes/metrics.js
const express = require('express');
const router  = express.Router();
const { getDB } = require('../models/database');

// GET /metrics?date=2026-03-23&devices=garmin,whoop
router.get('/', (req, res) => {
  const db = getDB();
  const date    = req.query.date    || new Date().toISOString().slice(0, 10);
  const devices = req.query.devices ? req.query.devices.split(',') : null;

  let query  = 'SELECT * FROM metrics WHERE date=?';
  const args = [date];

  if (devices?.length) {
    query += ` AND device IN (${devices.map(() => '?').join(',')})`;
    args.push(...devices);
  }

  const rows = db.prepare(query).all(...args);
  res.json(rows);
});

// GET /metrics/range?from=2026-03-01&to=2026-03-23&metric=hrv_ms&devices=garmin,whoop
router.get('/range', (req, res) => {
  const db = getDB();
  const { from, to, devices } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'from and to required' });

  const deviceList = devices ? devices.split(',') : null;
  let query  = 'SELECT device, date, hr_avg, hr_min, hr_max, hrv_ms, resting_hr, sleep_duration_s, sleep_score, steps, calories_total, active_min, recovery_score, strain_score, spo2_avg, stress_avg, weight_kg, fat_ratio, fat_mass_kg, hydration_kg, muscle_mass_kg, bone_mass_kg, systolic_bp, diastolic_bp, pulse_wave_velocity FROM metrics WHERE date>=? AND date<=?';
  const args = [from, to];

  if (deviceList?.length) {
    query += ` AND device IN (${deviceList.map(() => '?').join(',')})`;
    args.push(...deviceList);
  }

  query += ' ORDER BY device, date ASC';
  const rows = db.prepare(query).all(...args);
  res.json(rows);
});

// GET /metrics/today — latest data for dashboard
router.get('/today', (req, res) => {
  const db = getDB();
  const today = new Date().toISOString().slice(0, 10);
  const rows  = db.prepare('SELECT * FROM metrics WHERE date=?').all(today);
  res.json(rows);
});

// GET /metrics/compare?metric=hrv_ms&from=2026-03-01&to=2026-03-23
// Returns per-device arrays suitable for chart rendering
router.get('/compare', (req, res) => {
  const db = getDB();
  const { metric, from, to } = req.query;
  if (!metric || !from || !to) return res.status(400).json({ error: 'metric, from, to required' });

  const ALLOWED = ['hr_avg','hrv_ms','resting_hr','sleep_duration_s','sleep_score',
                   'steps','calories_total','recovery_score','strain_score','spo2_avg',
                   'weight_kg','fat_ratio','fat_mass_kg','hydration_kg','muscle_mass_kg','bone_mass_kg',
                   'systolic_bp','diastolic_bp','pulse_wave_velocity'];
  if (!ALLOWED.includes(metric)) return res.status(400).json({ error: 'invalid metric' });

  const rows = db.prepare(
    `SELECT device, date, ${metric} as value FROM metrics WHERE date>=? AND date<=? AND ${metric} IS NOT NULL ORDER BY device, date`
  ).all(from, to);

  // Group by device
  const grouped = {};
  for (const row of rows) {
    if (!grouped[row.device]) grouped[row.device] = [];
    grouped[row.device].push({ date: row.date, value: row.value });
  }

  res.json(grouped);
});

// DELETE /metrics/:provider — delete all data for a specific device
router.delete('/:provider', (req, res) => {
  const db = getDB();
  const provider = req.params.provider;
  db.prepare('DELETE FROM metrics WHERE device=?').run(provider);
  db.prepare('UPDATE devices SET last_sync=NULL WHERE provider=?').run(provider);
  res.json({ ok: true, deleted: provider });
});

module.exports = router;
