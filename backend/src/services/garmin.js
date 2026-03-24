const axios = require('axios');
const { getDB } = require('../models/database');
const { normalizeGarmin } = require('../utils/normalizer');

const BASE = 'https://healthapi.garmin.com/wellness-api/rest';
const AUTH_URL = 'https://connect.garmin.com/oauthConfirm';
const TOKEN_URL = 'https://connectapi.garmin.com/oauth-service/oauth/token';

function getAuthURL() {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.GARMIN_CLIENT_ID,
    redirect_uri: process.env.GARMIN_CALLBACK_URL,
    scope: 'WELLNESS',
  });
  return `${AUTH_URL}?${params}`;
}

async function exchangeCode(code) {
  const res = await axios.post(TOKEN_URL, new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.GARMIN_CALLBACK_URL,
    client_id: process.env.GARMIN_CLIENT_ID,
    client_secret: process.env.GARMIN_CLIENT_SECRET,
  }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

  const db = getDB();
  db.prepare(`
    INSERT INTO devices (provider, label, access_token, refresh_token, token_expires)
    VALUES ('garmin', 'Garmin', ?, ?, ?)
    ON CONFLICT(provider) DO UPDATE SET
      access_token=excluded.access_token,
      refresh_token=excluded.refresh_token,
      token_expires=excluded.token_expires
  `).run(res.data.access_token, res.data.refresh_token, Date.now() + res.data.expires_in * 1000);

  return res.data;
}

async function refreshToken() {
  const db = getDB();
  const device = db.prepare("SELECT * FROM devices WHERE provider='garmin'").get();
  if (!device) throw new Error('Garmin not connected');

  const res = await axios.post(TOKEN_URL, new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: device.refresh_token,
    client_id: process.env.GARMIN_CLIENT_ID,
    client_secret: process.env.GARMIN_CLIENT_SECRET,
  }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

  db.prepare(`UPDATE devices SET access_token=?, refresh_token=?, token_expires=? WHERE provider='garmin'`)
    .run(res.data.access_token, res.data.refresh_token, Date.now() + res.data.expires_in * 1000);

  return res.data.access_token;
}

async function getAccessToken() {
  const db = getDB();
  const device = db.prepare("SELECT * FROM devices WHERE provider='garmin'").get();
  if (!device) throw new Error('Garmin not connected');
  if (Date.now() > device.token_expires - 60000) return refreshToken();
  return device.access_token;
}

async function fetchDaily(date) {
  const token = await getAccessToken();
  const [dailyRes, sleepRes] = await Promise.all([
    axios.get(`${BASE}/dailies`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { startdate: date, enddate: date },
    }),
    axios.get(`${BASE}/sleeps`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { startdate: date, enddate: date },
    }),
  ]);

  const daily = dailyRes.data?.dailies?.[0];
  const sleep = sleepRes.data?.sleeps?.[0];
  const normalized = normalizeGarmin(date, daily, sleep, null);

  const db = getDB();
  db.prepare(`
    INSERT OR REPLACE INTO metrics (device, date, hr_avg, hr_min, hr_max, hrv_ms, resting_hr,
      sleep_duration_s, sleep_score, sleep_deep_s, sleep_rem_s, sleep_light_s, sleep_awake_s,
      steps, calories_total, calories_active, active_min, distance_m,
      recovery_score, strain_score, spo2_avg, stress_avg, raw)
    VALUES (@device,@date,@hr_avg,@hr_min,@hr_max,@hrv_ms,@resting_hr,
      @sleep_duration_s,@sleep_score,@sleep_deep_s,@sleep_rem_s,@sleep_light_s,@sleep_awake_s,
      @steps,@calories_total,@calories_active,@active_min,@distance_m,
      @recovery_score,@strain_score,@spo2_avg,@stress_avg,@raw)
  `).run(normalized);

  db.prepare("UPDATE devices SET last_sync=datetime('now') WHERE provider='garmin'").run();
  return normalized;
}

module.exports = { getAuthURL, exchangeCode, fetchDaily };
