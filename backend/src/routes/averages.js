const express = require('express');
const router = express.Router();
const { getDB } = require('../models/database');

router.get('/', (req, res) => {
  const db = getDB();
  const today = new Date().toISOString().slice(0, 10);
  const yearStart = new Date().getFullYear() + '-01-01';
  
  const week7 = db.prepare(`
    SELECT 
      AVG(hr_avg) as hr_avg,
      AVG(resting_hr) as resting_hr,
      AVG(hrv_ms) as hrv_ms,
      AVG(sleep_duration_s) as sleep_duration_s,
      AVG(steps) as steps,
      AVG(calories_total) as calories_total,
      AVG(spo2_avg) as spo2_avg,
      AVG(distance_m) as distance_m
    FROM metrics 
    WHERE date >= date(?, '-7 days') AND date <= ?
  `).get(today, today);

  const month30 = db.prepare(`
    SELECT 
      AVG(hr_avg) as hr_avg,
      AVG(resting_hr) as resting_hr,
      AVG(hrv_ms) as hrv_ms,
      AVG(sleep_duration_s) as sleep_duration_s,
      AVG(steps) as steps,
      AVG(calories_total) as calories_total,
      AVG(spo2_avg) as spo2_avg,
      AVG(distance_m) as distance_m
    FROM metrics 
    WHERE date >= date(?, '-30 days') AND date <= ?
  `).get(today, today);

  const year = db.prepare(`
    SELECT 
      AVG(hr_avg) as hr_avg,
      AVG(resting_hr) as resting_hr,
      AVG(hrv_ms) as hrv_ms,
      AVG(sleep_duration_s) as sleep_duration_s,
      AVG(steps) as steps,
      AVG(calories_total) as calories_total,
      AVG(spo2_avg) as spo2_avg,
      AVG(distance_m) as distance_m
    FROM metrics 
    WHERE date >= ? AND date <= ?
  `).get(yearStart, today);

  res.json({ week7, month30, year });
});

module.exports = router;
