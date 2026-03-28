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

function safeWithingsBody(resp) {
  if (!resp || typeof resp !== 'object') return null;
  if (resp.status !== 0) return null;
  return resp.body || null;
}

function withingsValue(meas) {
  if (!meas || typeof meas.value !== 'number' || typeof meas.unit !== 'number') return null;
  const val = meas.value * Math.pow(10, meas.unit);
  return Number.isFinite(val) ? val : null;
}

function extractBodyMetrics(measureApiResp) {
  const body = safeWithingsBody(measureApiResp);
  const groups = body?.measuregrps || [];
  if (!Array.isArray(groups) || !groups.length) return {};

  const byTypeLatest = new Map();
  for (const grp of groups) {
    if (!Array.isArray(grp?.measures)) continue;
    const ts = typeof grp.date === 'number' ? grp.date : 0;
    for (const m of grp.measures) {
      const val = withingsValue(m);
      if (val == null) continue;
      const prev = byTypeLatest.get(m.type);
      if (!prev || ts >= prev.ts) byTypeLatest.set(m.type, { value: val, ts });
    }
  }

  // Reliable Withings meastype codes
  const weight_kg       = byTypeLatest.get(1)?.value ?? null;   // Weight
  const fat_ratio       = byTypeLatest.get(6)?.value ?? null;   // Body fat %
  const fat_mass_kg     = byTypeLatest.get(8)?.value ?? null;   // Fat mass kg
  const diastolic_bp    = byTypeLatest.get(9)?.value ?? null;
  const systolic_bp     = byTypeLatest.get(10)?.value ?? null;
  const heart_rate      = byTypeLatest.get(11)?.value ?? null;
  const spo2            = byTypeLatest.get(54)?.value ?? null;
  const muscle_mass_kg  = byTypeLatest.get(76)?.value ?? null;
  const hydration_kg    = byTypeLatest.get(77)?.value ?? null;
  const bone_mass_kg    = byTypeLatest.get(88)?.value ?? null;
  const pwv_ms          = byTypeLatest.get(91)?.value ?? null;

  return {
    weight_kg,
    fat_ratio,
    fat_mass_kg,
    hydration_kg,
    muscle_mass_kg,
    bone_mass_kg,
    heart_rate,
    systolic_bp,
    diastolic_bp,
    spo2,
    pulse_wave_velocity: pwv_ms,
  };
}

async function fetchDaily(date) {
  const token = await getAccessToken();

  const [activityRes, sleepRes, measureRes] = await Promise.allSettled([
    axios.post(`${BASE}/v2/measure`, new URLSearchParams({
      action: 'getactivity',
      startdateymd: date,
      enddateymd: date,
      data_fields: 'steps,calories,totalcalories,distance,active'
    }), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }),
    axios.post(`${BASE}/v2/sleep`, new URLSearchParams({
      action: 'getsummary',
      startdateymd: date,
      enddateymd: date,
      data_fields: 'sleep_score,deepsleepduration,lightsleepduration,remsleepduration,wakeupduration,durationtosleep'
    }), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }),
    axios.get(`${BASE}/measure`, {
      params: {
        action: 'getmeas',
        access_token: token,
        startdateymd: date,
        enddateymd: date,
      }
    }),
  ]);

  const activity = activityRes.status === 'fulfilled' ? activityRes.value.data : null;
  const sleep    = sleepRes.status    === 'fulfilled' ? sleepRes.value.data    : null;
  const measure  = measureRes.status  === 'fulfilled' ? measureRes.value.data  : null;

  if (activity && activity.status !== 0) {
    console.error(`Withings activity error for ${date}:`, JSON.stringify(activity));
    throw new Error(`Withings API Error ${activity.status}`);
  }
  if (sleep && sleep.status !== 0) {
    console.error(`Withings sleep error for ${date}:`, JSON.stringify(sleep));
  }
  if (measure && measure.status !== 0) {
    console.error(`Withings measure error for ${date}:`, JSON.stringify(measure));
  }

  const bodyMetrics = extractBodyMetrics(measure);
  const normalized = normalizeWithings(date, activity, sleep, null, bodyMetrics);

  const db = getDB();
  db.prepare(`
    INSERT OR REPLACE INTO metrics (
      device, date, hr_avg, hr_min, hr_max, hrv_ms, resting_hr,
      sleep_duration_s, sleep_score, sleep_deep_s, sleep_rem_s, sleep_light_s, sleep_awake_s,
      steps, calories_total, calories_active, active_min, distance_m,
      recovery_score, strain_score, spo2_avg, stress_avg,
      weight_kg, fat_ratio, fat_mass_kg, hydration_kg, muscle_mass_kg, bone_mass_kg,
      systolic_bp, diastolic_bp, pulse_wave_velocity, raw
    )
    VALUES (
      @device,@date,@hr_avg,@hr_min,@hr_max,@hrv_ms,@resting_hr,
      @sleep_duration_s,@sleep_score,@sleep_deep_s,@sleep_rem_s,@sleep_light_s,@sleep_awake_s,
      @steps,@calories_total,@calories_active,@active_min,@distance_m,
      @recovery_score,@strain_score,@spo2_avg,@stress_avg,
      @weight_kg,@fat_ratio,@fat_mass_kg,@hydration_kg,@muscle_mass_kg,@bone_mass_kg,
      @systolic_bp,@diastolic_bp,@pulse_wave_velocity,@raw
    )
  `).run(normalized);

  db.prepare("UPDATE devices SET last_sync=datetime('now') WHERE provider='withings'").run();
  return normalized;
}

// Backfill optimized for Withings: chunk by month instead of day-by-day requests.
async function fetchBackfill({ from = '2024-01-01', to = new Date().toISOString().slice(0, 10), onProgress = null, shouldCancel = null } = {}) {
  const db = getDB();
  const start = new Date(from + 'T00:00:00Z');
  const end = new Date(to + 'T00:00:00Z');
  const cursor = new Date(start);

  let syncedDays = 0;
  let insertedRows = 0;
  while (cursor <= end) {
    const monthStart = new Date(cursor);
    const monthEnd = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0));
    if (monthEnd > end) monthEnd.setTime(end.getTime());

    if (typeof shouldCancel === 'function' && shouldCancel()) {
      return { status: 'aborted_cancelled', syncedDays, insertedRows };
    }

    // Abort if device disconnected while running
    const isConnected = db.prepare('SELECT id FROM devices WHERE provider=?').get('withings');
    if (!isConnected) {
      return { status: 'aborted_disconnected', syncedDays, insertedRows };
    }

    const token = await getAccessToken();
    const startStr = monthStart.toISOString().slice(0, 10);
    const endStr = monthEnd.toISOString().slice(0, 10);

    const [activityRes, sleepRes, measureRes] = await Promise.allSettled([
      axios.post(`${BASE}/v2/measure`, new URLSearchParams({
        action: 'getactivity',
        startdateymd: startStr,
        enddateymd: endStr,
        data_fields: 'steps,calories,totalcalories,distance,active'
      }), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }),
      axios.post(`${BASE}/v2/sleep`, new URLSearchParams({
        action: 'getsummary',
        startdateymd: startStr,
        enddateymd: endStr,
        data_fields: 'sleep_score,deepsleepduration,lightsleepduration,remsleepduration,wakeupduration,durationtosleep'
      }), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }),
      axios.get(`${BASE}/measure`, {
        params: {
          action: 'getmeas',
          access_token: token,
          startdateymd: startStr,
          enddateymd: endStr,
        }
      }),
    ]);

    const activity = activityRes.status === 'fulfilled' ? activityRes.value.data : null;
    const sleep    = sleepRes.status    === 'fulfilled' ? sleepRes.value.data    : null;
    const measure  = measureRes.status  === 'fulfilled' ? measureRes.value.data  : null;

    const byDateBody = new Map();
    const groups = measure?.body?.measuregrps || [];
    for (const grp of groups) {
      if (!Array.isArray(grp?.measures) || typeof grp?.date !== 'number') continue;
      const d = new Date(grp.date * 1000).toISOString().slice(0, 10);
      const existing = byDateBody.get(d) || { body: { status: 0, body: { measuregrps: [] } } };
      existing.body.body.measuregrps.push(grp);
      byDateBody.set(d, existing);
    }

    // Build per-day maps to avoid accidental cross-day copying
    const byDateActivity = new Map();
    for (const a of (activity?.body?.activities || [])) {
      if (!a?.date) continue;
      const d = String(a.date).slice(0, 10);
      if (!byDateActivity.has(d)) byDateActivity.set(d, []);
      byDateActivity.get(d).push(a);
    }

    const byDateSleep = new Map();
    for (const s of (sleep?.body?.series || [])) {
      const rawDate = s?.model?.date || s?.date || s?.startdate || s?.enddate || null;
      if (!rawDate) continue;
      const d = String(rawDate).slice(0, 10);
      if (!byDateSleep.has(d)) byDateSleep.set(d, []);
      byDateSleep.get(d).push(s);
    }

    // Upsert only dates where source has measurements for that exact day.
    const allDates = new Set([
      ...byDateActivity.keys(),
      ...byDateSleep.keys(),
      ...byDateBody.keys(),
    ]);

    for (const date of [...allDates].sort()) {
      const dayActivities = byDateActivity.get(date) || [];
      const daySleepSeries = byDateSleep.get(date) || [];
      const dayMeasurePayload = byDateBody.get(date)?.body || { status: 0, body: { measuregrps: [] } };

      const dayActivityPayload = { status: 0, body: { activities: dayActivities } };
      const daySleepPayload = { status: 0, body: { series: daySleepSeries } };

      const bodyMetrics = extractBodyMetrics(dayMeasurePayload);
      const normalized = normalizeWithings(date, dayActivityPayload, daySleepPayload, null, bodyMetrics);

      db.prepare(`
        INSERT OR REPLACE INTO metrics (
          device, date, hr_avg, hr_min, hr_max, hrv_ms, resting_hr,
          sleep_duration_s, sleep_score, sleep_deep_s, sleep_rem_s, sleep_light_s, sleep_awake_s,
          steps, calories_total, calories_active, active_min, distance_m,
          recovery_score, strain_score, spo2_avg, stress_avg,
          weight_kg, fat_ratio, fat_mass_kg, hydration_kg, muscle_mass_kg, bone_mass_kg,
          systolic_bp, diastolic_bp, pulse_wave_velocity, raw
        ) VALUES (
          @device, @date, @hr_avg, @hr_min, @hr_max, @hrv_ms, @resting_hr,
          @sleep_duration_s, @sleep_score, @sleep_deep_s, @sleep_rem_s, @sleep_light_s, @sleep_awake_s,
          @steps, @calories_total, @calories_active, @active_min, @distance_m,
          @recovery_score, @strain_score, @spo2_avg, @stress_avg,
          @weight_kg, @fat_ratio, @fat_mass_kg, @hydration_kg, @muscle_mass_kg, @bone_mass_kg,
          @systolic_bp, @diastolic_bp, @pulse_wave_velocity, @raw
        )
      `).run(normalized);

      insertedRows += 1;
      syncedDays += 1;
    }

    db.prepare("UPDATE devices SET last_sync=datetime('now') WHERE provider='withings'").run();
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);

    if (typeof onProgress === 'function') {
      const progressedTo = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), 1));
      const totalMs = end.getTime() - start.getTime() || 1;
      const doneMs = Math.min(progressedTo.getTime(), end.getTime()) - start.getTime();
      const pct = Math.max(0, Math.min(100, Math.floor((doneMs / totalMs) * 100)));
      onProgress({ pct, syncedDays, insertedRows, currentTo: monthEnd.toISOString().slice(0, 10) });
    }
  }

  return { status: 'ok', syncedDays, insertedRows, range: { from, to } };
}

module.exports = { getAuthURL, exchangeCode, fetchDaily, fetchBackfill };
