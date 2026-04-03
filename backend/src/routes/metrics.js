// routes/metrics.js
const express = require('express');
const router  = express.Router();
const { getDB } = require('../models/database');

// GET /metrics?date=2026-03-23 OR /metrics?days=30
router.get('/', (req, res) => {
  const db = getDB();
  
  // Support for ?days=N parameter (for trends)
  if (req.query.days) {
    const days = parseInt(req.query.days);
    const from = new Date();
    from.setDate(from.getDate() - days);
    const fromStr = from.toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    
    const rows = db.prepare(`
      SELECT date, device, hr_avg, resting_hr, hrv_ms, sleep_duration_s, steps, calories_total, spo2_avg, vo2_max, distance_m
      FROM metrics 
      WHERE date >= ? AND date <= ?
      ORDER BY date DESC
    `).all(fromStr, today);
    
    // Dedupe by date (merge devices, prefer non-null values)
    const byDate = {};
    for (const row of rows) {
      if (!byDate[row.date]) byDate[row.date] = { date: row.date };
      Object.keys(row).forEach(k => {
        if (row[k] != null && byDate[row.date][k] == null) byDate[row.date][k] = row[k];
      });
    }
    return res.json(Object.values(byDate));
  }
  
  // Default: single date
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const devices = req.query.devices ? req.query.devices.split(',') : null;
  let query = 'SELECT * FROM metrics WHERE date=?';
  const args = [date];
  if (devices?.length) {
    query += ` AND device IN (${devices.map(() => '?').join(',')})`;
    args.push(...devices);
  }
  const rows = db.prepare(query).all(...args);
  res.json(rows);
});

// GET /metrics/range?from=2026-03-01&to=2026-03-23
router.get('/range', (req, res) => {
  const db = getDB();
  const { from, to, devices } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'from and to required' });
  const deviceList = devices ? devices.split(',') : null;
  let query = 'SELECT device, date, hr_avg, hr_min, hr_max, hrv_ms, resting_hr, sleep_duration_s, sleep_score, steps, calories_total, active_min, recovery_score, strain_score, spo2_avg, stress_avg, weight_kg, fat_ratio, fat_mass_kg, hydration_kg, muscle_mass_kg, bone_mass_kg, systolic_bp, diastolic_bp, pulse_wave_velocity FROM metrics WHERE date>=? AND date<=?';
  const args = [from, to];
  if (deviceList?.length) {
    query += ` AND device IN (${deviceList.map(() => '?').join(',')})`;
    args.push(...deviceList);
  }
  query += ' ORDER BY device, date ASC';
  const rows = db.prepare(query).all(...args);
  res.json(rows);
});

// GET /metrics/today
router.get('/today', (req, res) => {
  const db = getDB();
  const today = new Date().toISOString().slice(0, 10);
  const rows = db.prepare('SELECT * FROM metrics WHERE date=?').all(today);
  res.json(rows);
});

// GET /metrics/averages
router.get('/averages', (req, res) => {
  const db = getDB();
  const today = new Date().toISOString().slice(0, 10);
  
  const calcAvg = (days) => {
    const from = new Date();
    from.setDate(from.getDate() - days);
    const fromStr = from.toISOString().slice(0, 10);
    
    return db.prepare(`
      SELECT 
        AVG(hr_avg) as hr_avg,
        AVG(resting_hr) as resting_hr,
        AVG(hrv_ms) as hrv_ms,
        AVG(sleep_duration_s) as sleep_duration_s,
        AVG(steps) as steps,
        AVG(calories_total) as calories_total,
        AVG(spo2_avg) as spo2_avg,
        AVG(vo2_max) as vo2_max
      FROM metrics 
      WHERE date >= ? AND date <= ? AND hr_avg IS NOT NULL
    `).get(fromStr, today);
  };
  
  // VO2 Max Fallback: 1d -> 7d -> 30d -> 90d -> 180d -> 365d
  const getVo2MaxWithFallback = () => {
    const periods = [1, 7, 30, 90, 180, 365];
    for (const days of periods) {
      const from = new Date();
      from.setDate(from.getDate() - days);
      const fromStr = from.toISOString().slice(0, 10);
      const row = db.prepare(`
        SELECT vo2_max, date FROM metrics 
        WHERE date >= ? AND date <= ? AND vo2_max IS NOT NULL
        ORDER BY date DESC LIMIT 1
      `).get(fromStr, today);
      if (row?.vo2_max) return { value: row.vo2_max, date: row.date, period: days };
    }
    return null;
  };
  
  const week7 = calcAvg(7);
  const month30 = calcAvg(30);
  const year = calcAvg(365);
  const vo2 = getVo2MaxWithFallback();
  
  if (vo2) {
    if (week7) week7.vo2_max = vo2.value;
    if (month30) month30.vo2_max = vo2.value;
    if (year) year.vo2_max = vo2.value;
  }
  
  res.json({ week7, month30, year, vo2_max_info: vo2 });
});

// GET /metrics/compare
router.get('/compare', (req, res) => {
  const db = getDB();
  const { metric, from, to } = req.query;
  if (!metric || !from || !to) return res.status(400).json({ error: 'metric, from, to required' });
  const ALLOWED = ['hr_avg','hrv_ms','resting_hr','sleep_duration_s','sleep_score','steps','calories_total','recovery_score','strain_score','spo2_avg','weight_kg','fat_ratio','vo2_max'];
  if (!ALLOWED.includes(metric)) return res.status(400).json({ error: 'invalid metric' });
  const rows = db.prepare(`SELECT device, date, ${metric} as value FROM metrics WHERE date>=? AND date<=? AND ${metric} IS NOT NULL ORDER BY device, date`).all(from, to);
  const grouped = {};
  for (const row of rows) {
    if (!grouped[row.device]) grouped[row.device] = [];
    grouped[row.device].push({ date: row.date, value: row.value });
  }
  res.json(grouped);
});

// DELETE /metrics/:provider
router.delete('/:provider', (req, res) => {
  const db = getDB();
  const provider = req.params.provider;
  db.prepare('DELETE FROM metrics WHERE device=?').run(provider);
  db.prepare('UPDATE devices SET last_sync=NULL WHERE provider=?').run(provider);
  res.json({ ok: true, deleted: provider });
});

module.exports = router;
