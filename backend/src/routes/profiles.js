const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getDB } = require('../models/database');

// Hash PIN
function hashPin(pin) {
  return crypto.createHash('sha256').update(pin).digest('hex');
}

// Check if any profile exists
router.get('/exists', (req, res) => {
  const db = getDB();
  const count = db.prepare('SELECT COUNT(*) as count FROM profiles').get();
  res.json({ exists: count.count > 0 });
});

// Get all profiles (ohne PIN)
router.get('/', (req, res) => {
  const db = getDB();
  const profiles = db.prepare('SELECT id, name, birth_date, gender, height_cm, target_weight_kg, activity_level FROM profiles').all();
  res.json(profiles);
});

// Get profile by ID
router.get('/:id', (req, res) => {
  const db = getDB();
  const profile = db.prepare('SELECT id, name, birth_date, gender, height_cm, target_weight_kg, activity_level FROM profiles WHERE id = ?').get(req.params.id);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  res.json(profile);
});

// Create profile
router.post('/', (req, res) => {
  const { name, birth_date, gender, height_cm, pin, target_weight_kg, activity_level } = req.body;
  
  if (!name || !birth_date || !gender || !height_cm || !pin) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  if (pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
    return res.status(400).json({ error: 'PIN must be 4-6 digits' });
  }
  
  const db = getDB();
  const result = db.prepare(`
    INSERT INTO profiles (name, birth_date, gender, height_cm, pin_hash, target_weight_kg, activity_level)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(name, birth_date, gender, height_cm, hashPin(pin), target_weight_kg || null, activity_level || 'active');
  
  res.json({ success: true, id: result.lastInsertRowid });
});

// Verify PIN
router.post('/:id/verify', (req, res) => {
  const { pin } = req.body;
  const db = getDB();
  const profile = db.prepare('SELECT pin_hash FROM profiles WHERE id = ?').get(req.params.id);
  
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  
  const valid = profile.pin_hash === hashPin(pin);
  res.json({ valid });
});

// Update profile
router.put('/:id', (req, res) => {
  const { name, birth_date, gender, height_cm, pin, target_weight_kg, activity_level } = req.body;
  const db = getDB();
  
  let query = `UPDATE profiles SET name=?, birth_date=?, gender=?, height_cm=?, target_weight_kg=?, activity_level=?, updated_at=datetime('now') WHERE id=?`;
  let params = [name, birth_date, gender, height_cm, target_weight_kg, activity_level, req.params.id];
  
  // Update PIN if provided
  if (pin) {
    if (pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
      return res.status(400).json({ error: 'PIN must be 4-6 digits' });
    }
    query = `UPDATE profiles SET name=?, birth_date=?, gender=?, height_cm=?, pin_hash=?, target_weight_kg=?, activity_level=?, updated_at=datetime('now') WHERE id=?`;
    params = [name, birth_date, gender, height_cm, hashPin(pin), target_weight_kg, activity_level, req.params.id];
  }
  
  db.prepare(query).run(...params);
  res.json({ success: true });
});

// Delete profile
router.delete('/:id', (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM profiles WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
