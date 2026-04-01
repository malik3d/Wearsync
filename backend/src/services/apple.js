const fs = require('fs');
const sax = require('sax');
const { getDB } = require('../models/database');

const TYPE_MAP = {
  HKQuantityTypeIdentifierHeartRate: 'hr',
  HKQuantityTypeIdentifierRestingHeartRate: 'resting_hr',
  HKQuantityTypeIdentifierHeartRateVariabilitySDNN: 'hrv_ms',
  HKQuantityTypeIdentifierStepCount: 'steps',
  HKQuantityTypeIdentifierActiveEnergyBurned: 'calories_active',
  HKQuantityTypeIdentifierBasalEnergyBurned: 'calories_basal',
  HKQuantityTypeIdentifierDistanceWalkingRunning: 'distance_m',
  HKQuantityTypeIdentifierAppleExerciseTime: 'active_min',
  HKQuantityTypeIdentifierOxygenSaturation: 'spo2',
  HKCategoryTypeIdentifierSleepAnalysis: 'sleep',
  // Body composition
  HKQuantityTypeIdentifierBodyMass: 'weight',
  HKQuantityTypeIdentifierBodyFatPercentage: 'body_fat',
  HKQuantityTypeIdentifierLeanBodyMass: 'lean_mass',
  HKQuantityTypeIdentifierBodyMassIndex: 'bmi',
  HKQuantityTypeIdentifierHeight: 'height',
  HKQuantityTypeIdentifierWaistCircumference: 'waist',
};

const SLEEP_VALUES = {
  HKCategoryValueSleepAnalysisInBed: 'in_bed',
  HKCategoryValueSleepAnalysisAsleep: 'asleep',
  HKCategoryValueSleepAnalysisAwake: 'awake',
  HKCategoryValueSleepAnalysisCore: 'light',
  HKCategoryValueSleepAnalysisDeep: 'deep',
  HKCategoryValueSleepAnalysisREM: 'rem',
  HKCategoryValueSleepAnalysisAsleepCore: 'light',
  HKCategoryValueSleepAnalysisAsleepDeep: 'deep',
  HKCategoryValueSleepAnalysisAsleepREM: 'rem',
  HKCategoryValueSleepAnalysisAsleepUnspecified: 'asleep',
};

function parseAppleHealthXML(xmlPath) {
  return new Promise((resolve, reject) => {
    console.log('📱 Parsing Apple Health export:', xmlPath);
    
    const daily = {};
    const parser = sax.createStream(true, { trim: true });

    function getDay(dateStr) {
      if (!dateStr) return null;
      return dateStr.slice(0, 10);
    }

    function ensure(date) {
      if (!daily[date]) daily[date] = {
        hr_values: [], hrv_values: [], spo2_values: [], resting_hr_values: [],
        weight_values: [], body_fat_values: [], lean_mass_values: [], bmi_values: [],
        steps: 0, calories_active: 0, calories_basal: 0, distance_m: 0, active_min: 0,
        sleep: { deep: 0, rem: 0, light: 0, awake: 0, in_bed: 0, asleep: 0 },
      };
      return daily[date];
    }

    parser.on('opentag', (node) => {
      if (node.name !== 'Record') return;
      
      const attrs = node.attributes;
      const type = attrs.type;
      const field = TYPE_MAP[type];
      if (!field) return;

      const date = getDay(attrs.startDate || attrs.endDate || '');
      if (!date || date < '2000-01-01') return;
      const d = ensure(date);
      const val = parseFloat(attrs.value);

      if (field === 'hr') { if (!isNaN(val)) d.hr_values.push(val); }
      else if (field === 'resting_hr') { if (!isNaN(val)) d.resting_hr_values.push(val); }
      else if (field === 'hrv_ms') { if (!isNaN(val)) d.hrv_values.push(val); }
      else if (field === 'steps') { if (!isNaN(val)) d.steps += val; }
      else if (field === 'calories_active') { if (!isNaN(val)) d.calories_active += val; }
      else if (field === 'calories_basal') { if (!isNaN(val)) d.calories_basal += val; }
      else if (field === 'distance_m') { if (!isNaN(val)) d.distance_m += val * 1000; }
      else if (field === 'active_min') { if (!isNaN(val)) d.active_min += val; }
      else if (field === 'spo2') { if (!isNaN(val)) d.spo2_values.push(val * 100); }
      else if (field === 'weight') { if (!isNaN(val)) d.weight_values.push(val); }
      else if (field === 'body_fat') { if (!isNaN(val)) d.body_fat_values.push(val * 100); }
      else if (field === 'lean_mass') { if (!isNaN(val)) d.lean_mass_values.push(val); }
      else if (field === 'bmi') { if (!isNaN(val)) d.bmi_values.push(val); }
      else if (field === 'sleep') {
        const sleepType = SLEEP_VALUES[attrs.value] || 'asleep';
        const start = new Date(attrs.startDate);
        const end = new Date(attrs.endDate);
        const dur = isNaN(start) || isNaN(end) ? 0 : (end - start) / 1000;
        if (dur > 0) d.sleep[sleepType] = (d.sleep[sleepType] || 0) + dur;
      }
    });

    parser.on('end', () => {
      const rows = [];
      for (const [date, d] of Object.entries(daily)) {
        const hr_avg = d.hr_values.length ? avg(d.hr_values) : null;
        const hrv = d.hrv_values.length ? avg(d.hrv_values) : null;
        const spo2 = d.spo2_values.length ? avg(d.spo2_values) : null;
        const resting = d.resting_hr_values.length ? Math.min(...d.resting_hr_values) : null;
        const sleep_total = d.sleep.deep + d.sleep.rem + d.sleep.light;

        if (!hr_avg && !d.steps && !sleep_total) continue;

        rows.push({
          device: 'apple',
          date,
          hr_avg: hr_avg ? +hr_avg.toFixed(1) : null,
          hr_min: d.hr_values.length ? Math.min(...d.hr_values) : null,
          hr_max: d.hr_values.length ? Math.max(...d.hr_values) : null,
          hrv_ms: hrv ? +hrv.toFixed(1) : null,
          resting_hr: resting ? +resting.toFixed(0) : null,
          sleep_duration_s: sleep_total || (d.sleep.asleep || null),
          sleep_score: calcSleepScore(d.sleep),
          sleep_deep_s: d.sleep.deep || null,
          sleep_rem_s: d.sleep.rem || null,
          sleep_light_s: d.sleep.light || null,
          sleep_awake_s: d.sleep.awake || null,
          steps: d.steps ? Math.round(d.steps) : null,
          calories_total: Math.round(d.calories_active + d.calories_basal) || null,
          calories_active: Math.round(d.calories_active) || null,
          active_min: Math.round(d.active_min) || null,
          distance_m: d.distance_m ? +d.distance_m.toFixed(0) : null,
          recovery_score: null,
          strain_score: null,
          spo2_avg: spo2 ? +spo2.toFixed(1) : null,
          weight_kg: d.weight_values.length ? +avg(d.weight_values).toFixed(2) : null,
          fat_ratio: d.body_fat_values.length ? +avg(d.body_fat_values).toFixed(1) : null,
          lean_mass_kg: d.lean_mass_values.length ? +avg(d.lean_mass_values).toFixed(2) : null,
          bmi: d.bmi_values.length ? +avg(d.bmi_values).toFixed(1) : null,
          stress_avg: null,
          raw: JSON.stringify({ source: 'apple_health_xml' }),
        });
      }

      rows.sort((a, b) => a.date.localeCompare(b.date));
      console.log('✅ Parsed', rows.length, 'days from Apple Health');
      resolve(rows);
    });

    parser.on('error', (err) => {
      console.error('Parser error:', err);
      reject(err);
    });

    fs.createReadStream(xmlPath).pipe(parser);
  });
}

function importToDB(rows) {
  const db = getDB();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO metrics (device, date, hr_avg, hr_min, hr_max, hrv_ms, resting_hr, weight_kg, fat_ratio, lean_mass_kg, bmi,
      sleep_duration_s, sleep_score, sleep_deep_s, sleep_rem_s, sleep_light_s, sleep_awake_s,
      steps, calories_total, calories_active, active_min, distance_m,
      recovery_score, strain_score, spo2_avg, stress_avg, raw)
    VALUES (@device,@date,@hr_avg,@hr_min,@hr_max,@hrv_ms,@resting_hr,@weight_kg,@fat_ratio,@lean_mass_kg,@bmi,
      @sleep_duration_s,@sleep_score,@sleep_deep_s,@sleep_rem_s,@sleep_light_s,@sleep_awake_s,
      @steps,@calories_total,@calories_active,@active_min,@distance_m,
      @recovery_score,@strain_score,@spo2_avg,@stress_avg,@raw)
  `);
  const insert = db.transaction(r => { for (const x of r) stmt.run(x); });
  insert(rows);
  
  db.prepare(`INSERT INTO devices (provider, label, access_token, last_sync) 
    VALUES ('apple', 'Apple Health', 'local', datetime('now'))
    ON CONFLICT(provider) DO UPDATE SET last_sync=datetime('now')`).run();
  
  console.log('💾 Imported', rows.length, 'days');
  return rows.length;
}

function avg(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length; }

function calcSleepScore(sleep) {
  const total = sleep.deep + sleep.rem + sleep.light + sleep.awake;
  if (total < 3600) return null;
  const efficiency = (total - sleep.awake) / total;
  const deepPct = sleep.deep / total;
  const remPct = sleep.rem / total;
  const score = (efficiency * 40) + (Math.min(deepPct / 0.20, 1) * 30) + (Math.min(remPct / 0.25, 1) * 30);
  return Math.min(100, Math.round(score));
}

module.exports = { parseAppleHealthXML, importToDB };
