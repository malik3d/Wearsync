/**
 * WearSync — Apple Health XML Import
 *
 * How to export from iPhone:
 * Settings → Health → your name → Export All Health Data
 * → sends export.zip → extract → upload export.xml here
 *
 * The XML contains <Record> elements like:
 * <Record type="HKQuantityTypeIdentifierHeartRate" value="72" startDate="2026-03-23 08:00:00 +0000" .../>
 */

const fs   = require('fs');
const path = require('path');
const { getDB } = require('../models/database');

// Apple Health type → our schema field
const TYPE_MAP = {
  HKQuantityTypeIdentifierHeartRate:             'hr',
  HKQuantityTypeIdentifierRestingHeartRate:      'resting_hr',
  HKQuantityTypeIdentifierHeartRateVariabilitySDNN: 'hrv_ms',
  HKQuantityTypeIdentifierStepCount:             'steps',
  HKQuantityTypeIdentifierActiveEnergyBurned:    'calories_active',
  HKQuantityTypeIdentifierBasalEnergyBurned:     'calories_basal',
  HKQuantityTypeIdentifierDistanceWalkingRunning:'distance_m',
  HKQuantityTypeIdentifierAppleExerciseTime:     'active_min',
  HKQuantityTypeIdentifierOxygenSaturation:      'spo2',
  HKCategoryTypeIdentifierSleepAnalysis:         'sleep',
};

// Sleep value codes
const SLEEP_VALUES = {
  HKCategoryValueSleepAnalysisInBed:    'in_bed',
  HKCategoryValueSleepAnalysisAsleep:   'asleep',
  HKCategoryValueSleepAnalysisAwake:    'awake',
  HKCategoryValueSleepAnalysisCore:     'light',
  HKCategoryValueSleepAnalysisDeep:     'deep',
  HKCategoryValueSleepAnalysisREM:      'rem',
};

/**
 * Parse Apple Health export.xml (streaming, handles large files)
 * Returns normalized daily metrics array
 */
async function parseAppleHealthXML(xmlPath) {
  console.log(`📱 Parsing Apple Health export: ${xmlPath}`);

  const content = fs.readFileSync(xmlPath, 'utf8');

  // Daily accumulators: { 'YYYY-MM-DD': { ... } }
  const daily = {};

  function getDay(dateStr) {
    return dateStr.slice(0, 10);
  }

  function ensure(date) {
    if (!daily[date]) daily[date] = {
      hr_values: [], hrv_values: [], spo2_values: [],
      resting_hr: null,
      steps: 0, calories_active: 0, calories_basal: 0,
      distance_m: 0, active_min: 0,
      sleep: { deep:0, rem:0, light:0, awake:0, in_bed:0, asleep:0 },
    };
    return daily[date];
  }

  // Parse <Record ...> tags with regex (faster than full DOM parse for huge files)
  const recordRE = /<Record([^>]+)\/>/g;
  let match;

  while ((match = recordRE.exec(content)) !== null) {
    const attrs = parseAttrs(match[1]);
    const type  = attrs.type;
    const field = TYPE_MAP[type];
    if (!field) continue;

    const date  = getDay(attrs.startDate || attrs.endDate || '');
    if (!date || date < '2000-01-01') continue;
    const d     = ensure(date);
    const val   = parseFloat(attrs.value);

    if (field === 'hr')          { if (!isNaN(val)) d.hr_values.push(val); }
    else if (field === 'resting_hr') { if (!isNaN(val) && (d.resting_hr === null || val < d.resting_hr)) d.resting_hr = val; }
    else if (field === 'hrv_ms') { if (!isNaN(val)) d.hrv_values.push(val * 1000); } // Apple exports in seconds
    else if (field === 'steps')  { if (!isNaN(val)) d.steps += val; }
    else if (field === 'calories_active') { if (!isNaN(val)) d.calories_active += val; }
    else if (field === 'calories_basal')  { if (!isNaN(val)) d.calories_basal  += val; }
    else if (field === 'distance_m') { if (!isNaN(val)) d.distance_m += val * 1000; } // km → m
    else if (field === 'active_min') { if (!isNaN(val)) d.active_min += val; }
    else if (field === 'spo2')   { if (!isNaN(val)) d.spo2_values.push(val * 100); } // 0-1 → percentage
    else if (field === 'sleep') {
      const sleepType = SLEEP_VALUES[attrs.value] || 'asleep';
      const start = new Date(attrs.startDate);
      const end   = new Date(attrs.endDate);
      const dur   = isNaN(start) || isNaN(end) ? 0 : (end - start) / 1000;
      if (dur > 0) d.sleep[sleepType] = (d.sleep[sleepType] || 0) + dur;
    }
  }

  // Convert accumulators → normalized rows
  const rows = [];
  for (const [date, d] of Object.entries(daily)) {
    const hr_avg = d.hr_values.length ? avg(d.hr_values) : null;
    const hrv    = d.hrv_values.length ? avg(d.hrv_values) : null;
    const spo2   = d.spo2_values.length ? avg(d.spo2_values) : null;
    const sleep_total = d.sleep.deep + d.sleep.rem + d.sleep.light;

    // Only include days that have some data
    if (!hr_avg && !d.steps && !sleep_total) continue;

    rows.push({
      device: 'apple',
      date,
      hr_avg:           hr_avg ? +hr_avg.toFixed(1) : null,
      hr_min:           d.hr_values.length ? Math.min(...d.hr_values) : null,
      hr_max:           d.hr_values.length ? Math.max(...d.hr_values) : null,
      hrv_ms:           hrv ? +hrv.toFixed(1) : null,
      resting_hr:       d.resting_hr,
      sleep_duration_s: sleep_total || (d.sleep.asleep || null),
      sleep_score:      calcSleepScore(d.sleep),
      sleep_deep_s:     d.sleep.deep   || null,
      sleep_rem_s:      d.sleep.rem    || null,
      sleep_light_s:    d.sleep.light  || null,
      sleep_awake_s:    d.sleep.awake  || null,
      steps:            d.steps  ? Math.round(d.steps)  : null,
      calories_total:   Math.round(d.calories_active + d.calories_basal) || null,
      calories_active:  Math.round(d.calories_active) || null,
      active_min:       Math.round(d.active_min) || null,
      distance_m:       d.distance_m ? +d.distance_m.toFixed(0) : null,
      recovery_score:   null,
      strain_score:     null,
      spo2_avg:         spo2 ? +spo2.toFixed(1) : null,
      stress_avg:       null,
      raw:              JSON.stringify({ source: 'apple_health_xml' }),
    });
  }

  rows.sort((a, b) => a.date.localeCompare(b.date));
  console.log(`✅ Parsed ${rows.length} days from Apple Health export`);
  return rows;
}

/**
 * Import parsed rows into the database
 */
function importToDB(rows) {
  const db   = getDB();
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

  const insert = db.transaction(rows => { for (const r of rows) stmt.run(r); });
  insert(rows);

  // Register Apple as a "device" entry
  db.prepare(`
    INSERT INTO devices (provider, label, access_token, refresh_token, token_expires)
    VALUES ('apple', 'Apple Health', 'local_import', null, 9999999999999)
    ON CONFLICT(provider) DO UPDATE SET last_sync=datetime('now')
  `).run();

  console.log(`💾 Imported ${rows.length} days into database`);
  return rows.length;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function avg(arr) { return arr.reduce((a,b) => a+b, 0) / arr.length; }

function calcSleepScore(sleep) {
  const total = sleep.deep + sleep.rem + sleep.light + sleep.awake;
  if (total < 3600) return null; // less than 1h, skip
  const efficiency = (total - sleep.awake) / total;
  const deepPct    = sleep.deep / total;
  const remPct     = sleep.rem  / total;
  // Simple heuristic: efficiency 40% + deep 30% + rem 30%
  const score = (efficiency * 40) + (Math.min(deepPct / 0.20, 1) * 30) + (Math.min(remPct / 0.25, 1) * 30);
  return Math.min(100, Math.round(score));
}

function parseAttrs(str) {
  const attrs = {};
  const re = /(\w+)="([^"]*)"/g;
  let m;
  while ((m = re.exec(str)) !== null) attrs[m[1]] = m[2];
  return attrs;
}

module.exports = { parseAppleHealthXML, importToDB };
