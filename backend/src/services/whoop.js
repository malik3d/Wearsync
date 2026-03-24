const axios = require('axios');
const { getDB } = require('../models/database');
const { normalizeWhoop } = require('../utils/normalizer');

const BASE      = 'https://api.prod.whoop.com/developer/v1';
const AUTH_URL  = 'https://api.prod.whoop.com/oauth/oauth2/auth';
const TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token';

function getAuthURL() {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.WHOOP_CLIENT_ID,
    redirect_uri: process.env.WHOOP_CALLBACK_URL,
    scope: 'read:recovery read:sleep read:workout read:body_measurement read:profile offline',
  });
  return `${AUTH_URL}?${params}`;
}

async function exchangeCode(code) {
  const res = await axios.post(TOKEN_URL, new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.WHOOP_CALLBACK_URL,
    client_id: process.env.WHOOP_CLIENT_ID,
    client_secret: process.env.WHOOP_CLIENT_SECRET,
  }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

  const db = getDB();
  db.prepare(`
    INSERT INTO devices (provider, label, access_token, refresh_token, token_expires)
    VALUES ('whoop', 'Whoop', ?, ?, ?)
    ON CONFLICT(provider) DO UPDATE SET
      access_token=excluded.access_token,
      refresh_token=excluded.refresh_token,
      token_expires=excluded.token_expires
  `).run(res.data.access_token, res.data.refresh_token, Date.now() + res.data.expires_in * 1000);

  return res.data;
}

async function refreshToken() {
  const db = getDB();
  const device = db.prepare("SELECT * FROM devices WHERE provider='whoop'").get();
  if (!device) throw new Error('Whoop not connected');

  const res = await axios.post(TOKEN_URL, new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: device.refresh_token,
    client_id: process.env.WHOOP_CLIENT_ID,
    client_secret: process.env.WHOOP_CLIENT_SECRET,
  }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

  db.prepare("UPDATE devices SET access_token=?, refresh_token=?, token_expires=? WHERE provider='whoop'")
    .run(res.data.access_token, res.data.refresh_token, Date.now() + res.data.expires_in * 1000);

  return res.data.access_token;
}

async function getAccessToken() {
  const db = getDB();
  const device = db.prepare("SELECT * FROM devices WHERE provider='whoop'").get();
  if (!device) throw new Error('Whoop not connected');
  if (Date.now() > device.token_expires - 60000) return refreshToken();
  return device.access_token;
}

async function fetchDaily(date) {
  const token = await getAccessToken();
  const startTime = `${date}T00:00:00.000Z`;
  const endTime   = `${date}T23:59:59.999Z`;

  const headers = { Authorization: `Bearer ${token}` };

  const [recoveryRes, sleepRes, workoutRes] = await Promise.allSettled([
    axios.get(`${BASE}/recovery`, { headers, params: { start: startTime, end: endTime } }),
    axios.get(`${BASE}/activity/sleep`, { headers, params: { start: startTime, end: endTime } }),
    axios.get(`${BASE}/activity/workout`, { headers, params: { start: startTime, end: endTime } }),
  ]);

  const recovery = recoveryRes.status === 'fulfilled' ? recoveryRes.value.data?.records?.[0] : null;
  const sleep    = sleepRes.status    === 'fulfilled' ? sleepRes.value.data?.records?.[0]    : null;
  const workout  = workoutRes.status  === 'fulfilled' ? workoutRes.value.data?.records?.[0]  : null;

  const normalized = normalizeWhoop(date, recovery, sleep, workout);

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

  db.prepare("UPDATE devices SET last_sync=datetime('now') WHERE provider='whoop'").run();
  return normalized;
}

module.exports = { getAuthURL, exchangeCode, fetchDaily };
