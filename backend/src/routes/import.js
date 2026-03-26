const express = require('express');
const router  = express.Router();
const path    = require('path');
const fs      = require('fs');
const os      = require('os');
const { parseAppleHealthXML, importToDB } = require('../services/apple');
const { importLimiter } = require('../middleware/auth');

const SAFE_TMP = os.tmpdir();
const MAX_SIZE = '100mb';

router.post(
  '/apple',
  importLimiter,
  express.raw({ type: ['application/xml', 'text/xml', 'application/octet-stream'], limit: MAX_SIZE }),
  async (req, res) => {
    if (!req.body || req.body.length < 100) {
      return res.status(400).json({ error: 'File too small — is this a valid export.xml?' });
    }

    const preview = req.body.slice(0, 200).toString('utf8');
    if (!preview.includes('<?xml') && !preview.includes('<HealthData')) {
      return res.status(400).json({ error: 'Not a valid Apple Health export' });
    }

    const tmpFile = path.join(
      SAFE_TMP,
      `wearsync_apple_${Date.now()}_${Math.random().toString(36).slice(2)}.xml`
    );

    try {
      fs.writeFileSync(tmpFile, req.body);
      const rows  = await parseAppleHealthXML(tmpFile);
      const count = importToDB(rows);
      res.json({ ok: true, imported: count, days: rows.length });
    } catch (e) {
      console.error('Apple import error:', e);
      res.status(500).json({ error: 'Import failed — ' + e.message });
    } finally {
      try { fs.unlinkSync(tmpFile); } catch (_) {}
    }
  }
);

// /apple/path endpoint removed — was a path traversal vulnerability (#2)

router.get('/apple/status', (req, res) => {
  const { getDB } = require('../models/database');
  const db = getDB();
  const count = db.prepare(
    "SELECT COUNT(*) as days, MIN(date) as first, MAX(date) as last FROM metrics WHERE device='apple'"
  ).get();
  res.json(count);
});

module.exports = router;
```

---

Commit message:
```
security: fix #2 #5 — remove path traversal endpoint, validate uploads
