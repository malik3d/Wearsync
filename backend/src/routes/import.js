const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const os = require('os');
const { parseAppleHealthXML, importToDB } = require('../services/apple');
const { importLimiter } = require('../middleware/auth');

router.use(importLimiter);

router.post('/apple-health', async (req, res) => {
  try {
    const { data } = req.body;
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ error: 'Invalid data format' });
    }
    const result = await importToDB(data, 'apple_health', req.user?.userId || 'local');
    res.json({ success: true, imported: result.imported, skipped: result.skipped });
  } catch (err) {
    res.status(500).json({ error: 'Import failed: ' + err.message });
  }
});

router.post('/generic', async (req, res) => {
  try {
    const { device, data } = req.body;
    if (!device || !data || !Array.isArray(data)) {
      return res.status(400).json({ error: 'Invalid format' });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(device)) {
      return res.status(400).json({ error: 'Invalid device name' });
    }
    const result = await importToDB(data, device, req.user?.userId || 'local');
    res.json({ success: true, imported: result.imported, skipped: result.skipped });
  } catch (err) {
    res.status(500).json({ error: 'Import failed: ' + err.message });
  }
});

module.exports = router;
