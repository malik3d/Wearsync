// routes/export.js
const express = require('express');
const router  = express.Router();
const { getDB } = require('../models/database');

// GET /export/json?from=2026-03-01&to=2026-03-23&devices=garmin,whoop
router.get('/json', (req, res) => {
  const { from, to, devices } = req.query;
  const db = getDB();

  let query  = 'SELECT * FROM metrics WHERE 1=1';
  const args = [];

  if (from) { query += ' AND date>=?'; args.push(from); }
  if (to)   { query += ' AND date<=?'; args.push(to); }
  if (devices) {
    const list = devices.split(',');
    query += ` AND device IN (${list.map(() => '?').join(',')})`;
    args.push(...list);
  }
  query += ' ORDER BY device, date';

  const rows = db.prepare(query).all(...args);
  res.setHeader('Content-Disposition', `attachment; filename="wearsync-export-${Date.now()}.json"`);
  res.json(rows);
});

// GET /export/csv?from=2026-03-01&to=2026-03-23&devices=garmin,whoop
router.get('/csv', (req, res) => {
  const { from, to, devices } = req.query;
  const db = getDB();

  let query  = 'SELECT device,date,hr_avg,hr_min,hr_max,hrv_ms,resting_hr,sleep_duration_s,sleep_score,sleep_deep_s,sleep_rem_s,steps,calories_total,active_min,distance_m,recovery_score,strain_score,spo2_avg,stress_avg,weight_kg,fat_ratio,fat_mass_kg,hydration_kg,muscle_mass_kg,bone_mass_kg,systolic_bp,diastolic_bp,pulse_wave_velocity FROM metrics WHERE 1=1';
  const args = [];

  if (from) { query += ' AND date>=?'; args.push(from); }
  if (to)   { query += ' AND date<=?'; args.push(to); }
  if (devices) {
    const list = devices.split(',');
    query += ` AND device IN (${list.map(() => '?').join(',')})`;
    args.push(...list);
  }
  query += ' ORDER BY device, date';

  const rows = db.prepare(query).all(...args);

  if (!rows.length) return res.status(200).send('No data found');

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map(row => headers.map(h => {
      const val = row[h] ?? '';
      return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
    }).join(','))
  ].join('\n');

  res.setHeader('Content-Disposition', `attachment; filename="wearsync-export-${Date.now()}.csv"`);
  res.setHeader('Content-Type', 'text/csv');
  res.send(csv);
});

module.exports = router;
