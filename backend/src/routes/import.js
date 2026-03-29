const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const os = require('os');
const { parseAppleHealthXML, importToDB } = require('../services/apple');
const { parseGarminExport, importGarminToDB } = require('../services/garmin');
const { importLimiter } = require('../middleware/auth');
const AdmZip = require('adm-zip');

router.use(importLimiter);

// POST /import/apple-health-xml
router.post('/apple-health-xml', async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const uploadedFile = req.files.file;
    const tempPath = path.join(os.tmpdir(), `apple-${Date.now()}.xml`);
    await uploadedFile.mv(tempPath);
    const rows = await parseAppleHealthXML(tempPath);
    // fs.unlinkSync(tempPath); // DEBUG
    const count = importToDB(rows);
    res.json({ success: true, imported: count, source: 'apple' });
  } catch (err) {
    console.error('Apple import error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /import/garmin-zip
router.post('/garmin-zip', async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const uploadedFile = req.files.file;
    const tempZip = path.join(os.tmpdir(), `garmin-${Date.now()}.zip`);
    const tempDir = path.join(os.tmpdir(), `garmin-${Date.now()}`);
    
    await uploadedFile.mv(tempZip);
    
    // Extract ZIP
    const zip = new AdmZip(tempZip);
    zip.extractAllTo(tempDir, true);
    
    // Parse
    const rows = await parseGarminExport(tempDir);
    
    // Cleanup
    fs.unlinkSync(tempZip);
    fs.rmSync(tempDir, { recursive: true, force: true });
    
    const count = importGarminToDB(rows);
    res.json({ success: true, imported: count, source: 'garmin' });
  } catch (err) {
    console.error('Garmin import error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
