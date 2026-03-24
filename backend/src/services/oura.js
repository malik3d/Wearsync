/**
 * WearSync — Oura Ring Integration
 * API Docs: https://cloud.ouraring.com/docs
 * Free developer access: https://cloud.ouraring.com/personal-access-tokens
 *
 * Oura v2 API supports both OAuth and Personal Access Token (PAT)
 * PAT is simpler for personal use — just paste the token in .env
 */

const axios  = require('axios');
const { getDB } = require('../models/database');

const BASE     = 'https://api.ouraring.com/v2/usercollection';
const AUTH_URL = 'https://cloud.ouraring.com/oauth/authorize';
const TOKEN_URL= 'https://api.ouraring.com/oauth/token';

function getAuthURL() {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     process.env.OURA_CLIENT_ID,
    redirect_uri:  process.env.OURA_CALLBACK_URL,
    scope:         'daily email heartrate personal session spo2 workout',
    state:         'wearsync',
  });
  return `${AUTH_URL}?${params}`;
}

async function exchangeCode(code) {
  const res = await axios.post(TOKEN_URL, new URLSearchParams({
    grant_type:    'authorization_code',
    code,
    redirect_uri:  process.env.OURA_CALLBACK_URL,
    client_id:     process.env.OURA_CLIENT_ID,
    client_secret: process.env.OURA_CLIENT_SECRET,
  }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

  saveTokens(res.data);
  return res.data;
}

// Personal Access Token (easier for personal use)
async function connectPAT(token) {
  const db = getDB();
  db.prepare(`
    INSERT INTO devices (provider, label, access_token, refresh_token, token_expires)
    VALUES ('oura', 'Oura Ring', ?, null, 9999999999999)
    ON CONFLICT(provider) DO UPDATE SET access_token=excluded.access_token
  `).run(token, null, 9999999999999);
  return { ok: true };
}

function saveTokens(data) {
  const db = getDB();
  db.prepare(`
    INSERT INTO devices (provider, label, access_token, refresh_token, token_expires)
    VALUES ('oura', 'Oura Ring', ?, ?, ?)
    ON CONFLICT(provider) DO UPDATE SET
      access_token=excluded.access_token,
      refresh_token=excluded.refresh_token,
      token_expires=excluded.token_expires
  `).run(data.access_token, data.refresh_token || null, Date.now() + (data.expires_in || 86400) * 1000);
}

async function getAccessToken() {
  const db     = getDB();
  const device = db.prepare("SELECT * FROM devices WHERE provider='oura'").get();
  if (!device) throw new Error('Oura not connected');

  // PAT never expires
  if (device.token_expires > 9999999999000) return device.access_token;

  if (Date.now() > device.token_expires - 60000) {
    const res = await axios.post(TOKEN_URL, new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: device.refresh_token,
      client_id:     process.env.OURA_CLIENT_ID,
      client_secret: process.env.OURA_CLIENT_SECRET,
    }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    saveTokens(res.data);
    return res.data.access_token;
  }
  return device.access_token;
}

async function fetchDaily(date) {
  const token   = await getAccessToken();
  const headers = { Authorization: `Bearer ${token}` };
  const params  = { start_date: date, end_date: date };

  const [dailyRes, sleepRes, hrvRes, spo2Res] = await Promise.allSettled([
    axios.get(`${BASE}/daily_activity`, { headers, params }),
    axios.get(`${BASE}/daily_sleep`,    { headers, params }),
    axios.get(`${BASE}/daily_readiness`,{ headers, params }),
    axios.get(`${BASE}/daily_spo2`,     { headers, params }),
  ]);

  const activity  = dailyRes.status  === 'fulfilled' ? dailyRes.value.data?.data?.[0]  : null;
  const sleep     = sleepRes.status  === 'fulfilled' ? sleepRes.value.data?.data?.[0]  : null;
  const readiness = hrvRes.status    === 'fulfilled' ? hrvRes.value.data?.data?.[0]    : null;
  const spo2      = spo2Res.status   === 'fulfilled' ? spo2Res.value.data?.data?.[0]  : null;

  const normalized = {
    device: 'oura',
    date,

    hr_avg:           activity?.average_met_minutes ? null : null, // Oura doesn't expose daily avg HR directly
    hr_min:           sleep?.lowest_heart_rate ?? null,
    hr_max:           null,
    hrv_ms:           sleep?.average_hrv ?? null,
    resting_hr:       sleep?.average_heart_rate ?? null,

    sleep_duration_s: sleep?.total_sleep_duration ?? null,
    sleep_score:      sleep?.score ?? null,
    sleep_deep_s:     sleep?.contributors?.deep_sleep
                        ? null : null, // available in session endpoint
    sleep_rem_s:      null,
    sleep_light_s:    null,
    sleep_awake_s:    null,

    steps:            activity?.steps ?? null,
    calories_total:   activity?.total_calories ?? null,
    calories_active:  activity?.active_calories ?? null,
    active_min:       activity?.active_time_in_seconds
                        ? Math.round(activity.active_time_in_seconds / 60) : null,
    distance_m:       activity?.equivalent_walking_distance ?? null,

    recovery_score:   readiness?.score ?? null,
    strain_score:     null,
    spo2_avg:         spo2?.spo2_percentage?.average ?? null,
    stress_avg:       null,

    raw: JSON.stringify({ activity, sleep, readiness, spo2 }),
  };

  // Also fetch sleep sessions for detailed stages
  try {
    const sessRes = await axios.get(`${BASE}/sleep`, { headers, params });
    const sess    = sessRes.data?.data?.[0];
    if (sess) {
      normalized.sleep_deep_s  = sess.deep_sleep_duration  ?? null;
      normalized.sleep_rem_s   = sess.rem_sleep_duration   ?? null;
      normalized.sleep_light_s = sess.light_sleep_duration ?? null;
      normalized.sleep_awake_s = sess.awake_time           ?? null;
    }
  } catch (_) {}

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

  db.prepare("UPDATE devices SET last_sync=datetime('now') WHERE provider='oura'").run();
  return normalized;
}

module.exports = { getAuthURL, exchangeCode, connectPAT, fetchDaily };
