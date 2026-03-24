const axios = require('axios');
const { getDB } = require('../models/database');
const { normalizeFitbit } = require('../utils/normalizer');

const BASE      = 'https://api.fitbit.com/1';
const AUTH_URL  = 'https://www.fitbit.com/oauth2/authorize';
const TOKEN_URL = 'https://api.fitbit.com/oauth2/token';

function getAuthURL() {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.FITBIT_CLIENT_ID,
    redirect_uri: process.env.FITBIT_CALLBACK_URL,
    scope: 'activity heartrate sleep profile',
  });
  return `${AUTH_URL}?${params}`;
}

async function exchangeCode(code) {
  const creds = Buffer.from(`${process.env.FITBIT_CLIENT_ID}:${process.env.FITBIT_CLIENT_SECRET}`).toString('base64');
  const res = await axios.post(TOKEN_URL, new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.FITBIT_CALLBACK_URL,
  }), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${creds}`,
    },
  });

  const db = getDB();
  db.prepare(`
    INSERT INTO devices (provider, label, access_token, refresh_token, token_expires)
    VALUES ('fitbit', 'Fitbit', ?, ?, ?)
    ON CONFLICT(provider) DO UPDATE SET
      access_token=excluded.access_token,
      refresh_token=excluded.refresh_token,
      token_expires=excluded.token_expires
  `).run(res.data.access_token, res.data.refresh_token, Date.now() + res.data.expires_in * 1000);

  return res.data;
}

async function getAccessToken() {
  const db = getDB();
  const device = db.prepare("SELECT * FROM devices WHERE provider='fitbit'").get();
  if (!device) throw new Error('Fitbit not connected');

  if (Date.now() > device.token_expires - 60000) {
    const creds = Buffer.from(`${process.env.FITBIT_CLIENT_ID}:${process.env.FITBIT_CLIENT_SECRET}`).toString('base64');
    const res = await axios.post(TOKEN_URL, new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: device.refresh_token,
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${creds}`,
      },
    });
    db.prepare("UPDATE devices SET access_token=?, refresh_token=?, token_expires=? WHERE provider='fitbit'")
      .run(res.data.access_token, res.data.refresh_token, Date.now() + res.data.expires_in * 1000);
    return res.data.access_token;
  }
  return device.access_token;
}

async function fetchDaily(date) {
  const token = await getAccessToken();
  const headers = { Authorization: `Bearer ${token}` };

  const [activityRes, sleepRes, hrvRes] = await Promise.allSettled([
    axios.get(`${BASE}/user/-/activities/date/${date}.json`, { headers }),
    axios.get(`${BASE}/user/-/sleep/date/${date}.json`, { headers }),
    axios.get(`${BASE}/user/-/hrv/date/${date}.json`, { headers }),
  ]);

  const summary  = activityRes.status  === 'fulfilled' ? activityRes.value.data  : null;
  const sleep    = sleepRes.status     === 'fulfilled' ? sleepRes.value.data     : null;
  const hrv      = hrvRes.status       === 'fulfilled' ? hrvRes.value.data       : null;

  const normalized = normalizeFitbit(date, summary, sleep, hrv);

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

  db.prepare("UPDATE devices SET last_sync=datetime('now') WHERE provider='fitbit'").run();
  return normalized;
}

module.exports = { getAuthURL, exchangeCode, fetchDaily };
