const express = require('express');
const router = express.Router();
const { getDB } = require('../models/database');

// GET /events
router.get('/', (req, res) => {
  const db = getDB();
  const rows = db.prepare('SELECT * FROM events ORDER BY date DESC').all();
  res.json(rows);
});

// GET /events/upcoming
router.get('/upcoming', (req, res) => {
  const db = getDB();
  const today = new Date().toISOString().slice(0, 10);
  const rows = db.prepare('SELECT * FROM events WHERE date >= ? ORDER BY date ASC LIMIT 10').all(today);
  res.json(rows);
});

// POST /events
router.post('/', (req, res) => {
  const db = getDB();
  const { title, event_type, date, end_date, location, distance_m, target_time_s, notes, url } = req.body;
  const result = db.prepare(`
    INSERT INTO events (title, event_type, date, end_date, location, distance_m, target_time_s, notes, url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, event_type, date, end_date, location, distance_m, target_time_s, notes, url);
  res.json({ id: result.lastInsertRowid });
});

// PUT /events/:id
router.put('/:id', (req, res) => {
  const db = getDB();
  const { title, event_type, date, end_date, location, distance_m, target_time_s, actual_time_s, result_place, notes, url } = req.body;
  db.prepare(`
    UPDATE events SET title=?, event_type=?, date=?, end_date=?, location=?, distance_m=?, target_time_s=?, actual_time_s=?, result_place=?, notes=?, url=?
    WHERE id=?
  `).run(title, event_type, date, end_date, location, distance_m, target_time_s, actual_time_s, result_place, notes, url, req.params.id);
  res.json({ success: true });
});

// DELETE /events/:id
router.delete('/:id', (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
