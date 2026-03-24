const axios = require('axios');
const { getDB } = require('../models/database');
const { normalizeWithings } = require('../utils/normalizer');

const BASE      = 'https://wbsapi.withings.net';
const AUTH_URL  = 'https://account.withings.com/oauth2_user/authorize2';
const TOKEN_URL = 'https://wbsapi.withings.net/v2/oauth2';

function getAuthURL() {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     process.env.WITHINGS_CLIENT_ID,
    redirect_uri:  process.env.WITHINGS_CALLBACK_URL,
    scope:         'user.activity,user.sleepevents,user.metrics',
    state:         'wearsync',
  });
  return `${AUTH_URL}?${params}`;
}

async function exchangeCode(code) {
  const res = await axios.post(`${TOKEN_URL}`, new URLSearchParams({
    action:        'requesttoken',
    grant_type:    'authorization_code',
    client_id:     process.env.WITHINGS_CLIENT_ID,
    client_secret: process.env.WITHINGS_CLIENT_SECRET,
    code,
    redirect_uri:  process.env.WITHINGS_CALLBACK_URL,
  }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

  const body = res.data.body;
  const db   = getDB();
  db.prepare(`
    INSERT INTO devices (provider, label, access_token, refresh_token, token_expires)
    VALUES ('withings', 'Withings', ?, ?, ?)
    ON CONFLICT(provider) DO UPDATE SET
      access_token=excluded.access_token,
      refresh_token=excluded.refresh_token,
      token_expires=excluded.token_expires
  `).run(body.access_token, body.refresh_token, Date.now() + body.expires_in * 1000);

  return body;
}

async function getAccessToken() {
  const db     = getDB();
  const device = db.prepare("SELECT * FROM devices WHERE provider='withings'").get();
  if (!device) throw new Error('Withings not connected');

  if (Date.now() > device.token_expires - 60000) {
    const res = await axios.post(TOKEN_URL, new URLSearchParams({
      action:        'requesttoken',
      grant_type:    'refresh_token',
      client_id:     process.env.WITHINGS_CLIENT_ID,
      client_secret: process.env.WITHINGS_CLIENT_SECRET,
      refresh_token: device.refresh_token,
    }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

    const body = res.data.body;
    db.prepare("UPDATE devices SET access_token=?, refresh_token=?, token_expires=? WHERE provider='withings'")
      .run(body.access_token, body.refresh_token, Date.now() + body.expires_in * 1000);
    return body.access_token;
  }
  return device.access_token;
}

async function fetchDaily(date) {
  const token     = await getAccessToken();
  const headers   = { Authorization: `Bearer ${token}` };
  const startDate = Math.floor(new Date(date + 'T00:00:00Z').getTime() / 1000);
  const endDate   = Math.floor(new Date(date + 'T23:59:59Z').getTime() / 1000);

  const [activityRes, sleepRes] = await Promise.allSettled([
    axios.get(`${BASE}/v2/measure`, {
      headers,
      params: { action: 'getactivity', startdateymd: date, enddateymd: date, data_fields: 'steps,calories,totalcalories,distance,active' },
    }),
    axios.get(`${BASE}/v2/sleep`, {
      headers,
      params: { action: 'getsummary', startdateymd: date, enddateymd: date, data_fields: 'sleep_score,deepsleepduration,lightsleepduration,remsleepduration,wakeupduration,durationtosleep' },
    }),
  ]);

  const activity = activityRes.status === 'fulfilled' ? activityRes.value.data : null;
  const sleep    = sleepRes.status    === 'fulfilled' ? sleepRes.value.data    : null;

  const normalized = normalizeWithings(date, activity, sleep, null);

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

  db.prepare("UPDATE devices SET last_sync=datetime('now') WHERE provider='withings'").run();
  return normalized;
}

module.exports = { getAuthURL, exchangeCode, fetchDaily };
