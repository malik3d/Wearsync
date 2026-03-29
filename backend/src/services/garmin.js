const fs = require('fs');
const path = require('path');
const { getDB } = require('../models/database');

async function parseGarminExport(extractedPath) {
  console.log('📱 Parsing Garmin export:', extractedPath);
  
  // Find wellness folder
  let wellnessPath = path.join(extractedPath, 'DI_CONNECT', 'DI-Connect-Wellness');
  if (!fs.existsSync(wellnessPath)) {
    // Check one level deeper (ZIP might have root folder)
    const entries = fs.readdirSync(extractedPath);
    for (const entry of entries) {
      const testPath = path.join(extractedPath, entry, 'DI_CONNECT', 'DI-Connect-Wellness');
      if (fs.existsSync(testPath)) {
        wellnessPath = testPath;
        break;
      }
    }
  }
  
  if (!fs.existsSync(wellnessPath)) {
    throw new Error('Garmin wellness folder not found. Expected DI_CONNECT/DI-Connect-Wellness');
  }

  const dailyData = {};
  const files = fs.readdirSync(wellnessPath);

  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    try {
      const content = fs.readFileSync(path.join(wellnessPath, file), 'utf8');
      const data = JSON.parse(content);
      
      if (Array.isArray(data)) {
        for (const item of data) processItem(item, dailyData);
      } else {
        processItem(data, dailyData);
      }
    } catch (e) { continue; }
  }

  const rows = Object.entries(dailyData).map(([date, d]) => ({
    device: 'garmin',
    date,
    hr_avg: d.hr_avg || null,
    hr_min: d.hr_min || null,
    hr_max: d.hr_max || null,
    hrv_ms: d.hrv || null,
    resting_hr: d.resting_hr || null,
    sleep_duration_s: d.sleep_duration || null,
    sleep_score: d.sleep_score || null,
    sleep_deep_s: d.sleep_deep || null,
    sleep_rem_s: d.sleep_rem || null,
    sleep_light_s: d.sleep_light || null,
    sleep_awake_s: d.sleep_awake || null,
    steps: d.steps || null,
    calories_total: d.calories_total || null,
    calories_active: d.calories_active || null,
    active_min: d.active_min || null,
    distance_m: d.distance || null,
    recovery_score: d.body_battery || null,
    strain_score: null,
    spo2_avg: d.spo2 || null,
    stress_avg: d.stress || null,
    raw: JSON.stringify({ source: 'garmin_export' }),
  })).filter(r => r.steps || r.hr_avg || r.sleep_duration_s);

  rows.sort((a, b) => a.date.localeCompare(b.date));
  console.log('Parsed', rows.length, 'days from Garmin');
  return rows;
}

function processItem(item, daily) {
  const date = item.calendarDate || (item.startTimeLocal || '').slice(0, 10);
  if (!date || date < '2000') return;
  if (!daily[date]) daily[date] = {};
  const d = daily[date];

  if (item.restingHeartRate) d.resting_hr = item.restingHeartRate;
  if (item.maxHeartRate) d.hr_max = item.maxHeartRate;
  if (item.minHeartRate) d.hr_min = item.minHeartRate;
  if (item.totalSteps) d.steps = item.totalSteps;
  if (item.totalDistanceMeters) d.distance = item.totalDistanceMeters;
  if (item.totalKilocalories) d.calories_total = item.totalKilocalories;
  if (item.activeKilocalories) d.calories_active = item.activeKilocalories;
  if (item.sleepTimeSeconds) d.sleep_duration = item.sleepTimeSeconds;
  if (item.deepSleepSeconds) d.sleep_deep = item.deepSleepSeconds;
  if (item.lightSleepSeconds) d.sleep_light = item.lightSleepSeconds;
  if (item.remSleepSeconds) d.sleep_rem = item.remSleepSeconds;
  if (item.awakeSleepSeconds) d.sleep_awake = item.awakeSleepSeconds;
  if (item.averageStressLevel) d.stress = item.averageStressLevel;
  if (item.bodyBatteryHighestValue) d.body_battery = item.bodyBatteryHighestValue;
  if (item.hrvValue) d.hrv = item.hrvValue;
}

function importGarminToDB(rows) {
  const db = getDB();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO metrics (device, date, hr_avg, hr_min, hr_max, hrv_ms, resting_hr,
      sleep_duration_s, sleep_score, sleep_deep_s, sleep_rem_s, sleep_light_s, sleep_awake_s,
      steps, calories_total, calories_active, active_min, distance_m,
      recovery_score, strain_score, spo2_avg, stress_avg, raw)
    VALUES (@device,@date,@hr_avg,@hr_min,@hr_max,@hrv_ms,@resting_hr,
      @sleep_duration_s,@sleep_score,@sleep_deep_s,@sleep_rem_s,@sleep_light_s,@sleep_awake_s,
      @steps,@calories_total,@calories_active,@active_min,@distance_m,
      @recovery_score,@strain_score,@spo2_avg,@stress_avg,@raw)
  `);
  const insert = db.transaction(r => { for (const x of r) stmt.run(x); });
  insert(rows);
  db.prepare(`INSERT INTO devices (provider,label,access_token) VALUES ('garmin','Garmin','local') ON CONFLICT DO UPDATE SET last_sync=datetime('now')`).run();
  return rows.length;
}

module.exports = { parseGarminExport, importGarminToDB };
