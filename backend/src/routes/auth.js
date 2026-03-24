// routes/auth.js
const express   = require('express');
const router    = express.Router();
const garmin    = require('../services/garmin');
const fitbit    = require('../services/fitbit');
const whoop     = require('../services/whoop');
const withings  = require('../services/withings');
const zepp      = require('../services/zepp');

// ── Garmin ──────────────────────────────
router.get('/garmin',          (req, res) => res.redirect(garmin.getAuthURL()));
router.get('/garmin/callback', async (req, res) => {
  try {
    await garmin.exchangeCode(req.query.code);
    res.redirect(`${process.env.FRONTEND_URL}/?connected=garmin`);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Fitbit ──────────────────────────────
router.get('/fitbit',          (req, res) => res.redirect(fitbit.getAuthURL()));
router.get('/fitbit/callback', async (req, res) => {
  try {
    await fitbit.exchangeCode(req.query.code);
    res.redirect(`${process.env.FRONTEND_URL}/?connected=fitbit`);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Whoop ───────────────────────────────
router.get('/whoop',          (req, res) => res.redirect(whoop.getAuthURL()));
router.get('/whoop/callback', async (req, res) => {
  try {
    await whoop.exchangeCode(req.query.code);
    res.redirect(`${process.env.FRONTEND_URL}/?connected=whoop`);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

const oura      = require('../services/oura');

// ── Oura Ring ───────────────────────────
router.get('/oura',          (req, res) => res.redirect(oura.getAuthURL()));
router.get('/oura/callback', async (req, res) => {
  try {
    await oura.exchangeCode(req.query.code);
    res.redirect(`${process.env.FRONTEND_URL}/?connected=oura`);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// PAT shortcut (paste token directly)
router.post('/oura/pat', async (req, res) => {
  try {
    await oura.connectPAT(req.body.token);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
router.get('/withings',          (req, res) => res.redirect(withings.getAuthURL()));
router.get('/withings/callback', async (req, res) => {
  try {
    await withings.exchangeCode(req.query.code);
    res.redirect(`${process.env.FRONTEND_URL}/?connected=withings`);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Zepp / Amazfit ──────────────────────
router.get('/zepp',          (req, res) => res.redirect(zepp.getAuthURL()));
router.get('/zepp/callback', async (req, res) => {
  try {
    await zepp.exchangeCode(req.query.code);
    res.redirect(`${process.env.FRONTEND_URL}/?connected=zepp`);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
