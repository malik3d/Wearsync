const express = require('express');
const router = express.Router();
const { getDB } = require('../models/database');

// GET /workouts?limit=50&offset=0&type=running&year=2025
router.get('/', (req, res) => {
  const db = getDB();
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;
  const type = req.query.type;
  const year = req.query.year;
  
  let where = [];
  let args = [];
  
  if (type && type !== 'all') {
    where.push('LOWER(workout_type) = ?');
    args.push(type.toLowerCase());
  }
  if (year && year !== 'all') {
    where.push("strftime('%Y', date) = ?");
    args.push(year);
  }
  
  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  
  const workouts = db.prepare(`
    SELECT id, device, date, start_time, end_time, workout_type as type,
           duration_s, distance_m, calories, hr_avg, hr_max, elevation_m, 
           CASE WHEN route_gpx IS NOT NULL THEN 1 ELSE 0 END as has_route
    FROM workouts 
    ${whereClause}
    ORDER BY date DESC, start_time DESC
    LIMIT ? OFFSET ?
  `).all(...args, limit, offset);
  
  const stats = db.prepare(`
    SELECT COUNT(*) as total, 
           SUM(duration_s) as total_duration,
           SUM(distance_m) as total_distance,
           SUM(calories) as total_calories
    FROM workouts ${whereClause}
  `).get(...args);
  
  res.json({ workouts, stats });
});

// GET /workouts/:id
router.get('/:id', (req, res) => {
  const db = getDB();
  const row = db.prepare('SELECT * FROM workouts WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Workout not found' });
  res.json(row);
});

// PUT /workouts/:id
router.put('/:id', (req, res) => {
  const db = getDB();
  const { notes } = req.body;
  db.prepare('UPDATE workouts SET notes = ? WHERE id = ?').run(notes, req.params.id);
  res.json({ success: true });
});

module.exports = router;
