const axios = require('axios');
const { getDB } = require('../models/database');

// Zepp Health (Amazfit) Developer API
// https://developer.zepp.com/os/home
const BASE      = 'https://api-mifit-de2.huami.com';
const AUTH_URL  = 'https://account.huami.com/v2/client/login';
const TOKEN_URL = 'https://account.huami.com/v2/client/token';

function getAuthURL() {
  // Zepp uses a slightly different OAuth flow — redirect to their auth page
  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     process.env.ZEPP_CLIENT_ID,
    redirect_uri:  process.env.ZEPP_CALLBACK_URL,
    state:         'wearsync',
  });
  return `https://account.zepp.com/oauth2/authorize?${params}`;
}

async function exchangeCode(code) {
  const res = await axios.post(TOKEN_URL, {
    grant_type:    'authorization_code',
    code,
    redirect_uri:  process.env.ZEPP_CALLBACK_URL,
    client_id:     process.env.ZEPP_CLIENT_ID,
    client_secret: process.env.ZEPP_CLIENT_SECRET,
  });

  const db = getDB();
  db.prepare(`
    INSERT INTO devices (provider, label, access_token, refresh_token, token_expires)
    VALUES ('zepp', 'Amazfit', ?, ?, ?)
    ON CONFLICT(provider) DO UPDATE SET
      access_token=excluded.access_token,
      refresh_token=excluded.refresh_token,
      token_expires=excluded.token_expires
  `).run(res.data.access_token, res.data.refresh_token, Date.now() + (res.data.expires_in || 3600) * 1000);

  return res.data;
}

async function getAccessToken() {
  const db     = getDB();
  const device = db.prepare("SELECT * FROM devices WHERE provider='zepp'").get();
  if (!device) throw new Error('Zepp not connected');

  if (Date.now() > device.token_expires - 60000) {
    const res = await axios.post(TOKEN_URL, {
      grant_type:    'refresh_token',
      refresh_token: device.refresh_token,
      client_id:     process.env.ZEPP_CLIENT_ID,
      client_secret: process.env.ZEPP_CLIENT_SECRET,
    });
    db.prepare("UPDATE devices SET access_token=?, refresh_token=?, token_expires=? WHERE provider='zepp'")
      .run(res.data.access_token, res.data.refresh_token, Date.now() + (res.data.expires_in || 3600) * 1000);
    return res.data.access_token;
  }
  return device.access_token;
}

async function fetchDaily(date) {
  const token   = await getAccessToken();
  const headers = {
    'apptoken': token,
    'Content-Type': 'application/json',
  };

  // Zepp API uses Unix timestamps
  const from_date = Math.floor(new Date(date + 'T00:00:00Z').getTime() / 1000);
  const to_date   = Math.floor(new Date(date + 'T23:59:59Z').getTime() / 1000);

  const [activityRes, sleepRes, heartRes] = await Promise.allSettled([
    axios.get(`${BASE}/v3/sport/run/count`, { headers, params: { from_date, to_date } }),
    axios.get(`${BASE}/v3/user/sleep`, { headers, params: { from_date, to_date } }),
    axios.get(`${BASE}/v3/health/heartrate`, { headers, params: { from_date, to_date } }),
  ]);

  const activity = activityRes.status === 'fulfilled' ? activityRes.value.data : null;
  const sleep    = sleepRes.status    === 'fulfilled' ? sleepRes.value.data    : null;
  const heart    = heartRes.status    === 'fulfilled' ? heartRes.value.data    : null;

  // Normalize into our unified schema
  const normalized = {
    device: 'zepp',
    date,
    hr_avg:           heart?.data?.avg_heart_rate ?? null,
    hr_min:           heart?.data?.min_heart_rate ?? null,
    hr_max:           heart?.data?.max_heart_rate ?? null,
    hrv_ms:           null,
    resting_hr:       heart?.data?.resting_heart_rate ?? null,
    sleep_duration_s: sleep?.data?.sleep_time ?? null,
    sleep_score:      sleep?.data?.score ?? null,
    sleep_deep_s:     sleep?.data?.deep_time ?? null,
    sleep_rem_s:      sleep?.data?.rem_time ?? null,
    sleep_light_s:    sleep?.data?.light_time ?? null,
    sleep_awake_s:    sleep?.data?.awake_time ?? null,
    steps:            activity?.data?.step ?? null,
    calories_total:   activity?.data?.calorie ?? null,
    calories_active:  null,
    active_min:       activity?.data?.active_time ? Math.floor(activity.data.active_time / 60) : null,
    distance_m:       activity?.data?.distance ?? null,
    recovery_score:   null,
    strain_score:     null,
    spo2_avg:         heart?.data?.spo2_avg ?? null,
    stress_avg:       null,
    raw:              JSON.stringify({ activity, sleep, heart }),
  };

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

  db.prepare("UPDATE devices SET last_sync=datetime('now') WHERE provider='zepp'").run();
  return normalized;
}

module.exports = { getAuthURL, exchangeCode, fetchDaily };
