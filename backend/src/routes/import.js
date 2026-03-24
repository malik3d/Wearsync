// routes/import.js
const express  = require('express');
const router   = express.Router();
const path     = require('path');
const fs       = require('fs');
const { parseAppleHealthXML, importToDB } = require('../services/apple');

// Simple in-memory upload handler (no extra deps)
// For production: use multer — add to package.json
router.post('/apple', express.raw({ type: 'application/xml', limit: '500mb' }), async (req, res) => {
  try {
    // Save uploaded XML to temp file
    const tmpPath = path.join('/tmp', `apple_health_${Date.now()}.xml`);
    fs.writeFileSync(tmpPath, req.body);

    const rows  = await parseAppleHealthXML(tmpPath);
    const count = importToDB(rows);

    fs.unlinkSync(tmpPath); // cleanup
    res.json({ ok: true, imported: count, days: rows.length });
  } catch (e) {
    console.error('Apple import error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Upload via file path (for CLI use)
router.post('/apple/path', express.json(), async (req, res) => {
  const { xmlPath } = req.body;
  if (!xmlPath || !fs.existsSync(xmlPath)) return res.status(400).json({ error: 'File not found' });
  try {
    const rows  = await parseAppleHealthXML(xmlPath);
    const count = importToDB(rows);
    res.json({ ok: true, imported: count });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Status: how many Apple Health days are imported?
router.get('/apple/status', (req, res) => {
  const { getDB } = require('../models/database');
  const db = getDB();
  const count = db.prepare("SELECT COUNT(*) as c, MIN(date) as first, MAX(date) as last FROM metrics WHERE device='apple'").get();
  res.json(count);
});

module.exports = router;
