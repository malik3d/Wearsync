import { subDays, format } from 'date-fns';

const DEVICE_COLORS = {
  garmin:   '#00c8c8',
  whoop:    '#ff3860',
  fitbit:   '#00b0b9',
  withings: '#7c5cbf',
  zepp:     '#ff7c2a',
};

function rand(min, max, decimals = 0) {
  const v = Math.random() * (max - min) + min;
  return decimals ? parseFloat(v.toFixed(decimals)) : Math.round(v);
}

function wave(i, period, amplitude, base) {
  return base + Math.sin((i / period) * Math.PI * 2) * amplitude + rand(-amplitude * 0.3, amplitude * 0.3, 1);
}

export function generateDemoDevices() {
  return [
    { provider: 'garmin',   label: 'Garmin',   connected: true,  last_sync: new Date().toISOString() },
    { provider: 'whoop',    label: 'Whoop',    connected: true,  last_sync: new Date().toISOString() },
    { provider: 'fitbit',   label: 'Fitbit',   connected: false, last_sync: null },
    { provider: 'withings', label: 'Withings', connected: false, last_sync: null },
    { provider: 'zepp',     label: 'Amazfit',  connected: false, last_sync: null },
  ];
}

export function generateDemoToday() {
  return [
    {
      device: 'garmin',
      date: format(new Date(), 'yyyy-MM-dd'),
      hr_avg: 68, hr_min: 44, hr_max: 142,
      hrv_ms: 52,
      resting_hr: 52,
      sleep_duration_s: 25920, // 7.2h
      sleep_score: 79,
      sleep_deep_s: 5400,
      sleep_rem_s: 7200,
      steps: 11240,
      calories_total: 2680,
      active_min: 54,
      recovery_score: 72,
      spo2_avg: 97.2,
      distance_m: 8700,
    },
    {
      device: 'whoop',
      date: format(new Date(), 'yyyy-MM-dd'),
      hr_avg: 66, hr_min: 42, hr_max: 138,
      hrv_ms: 58,
      resting_hr: 50,
      sleep_duration_s: 26460, // 7.35h
      sleep_score: 83,
      sleep_deep_s: 6120,
      sleep_rem_s: 7560,
      steps: null,
      calories_total: 2590,
      active_min: 51,
      recovery_score: 81,
      strain_score: 14.2,
      spo2_avg: 98.1,
    },
  ];
}

export function generateDemoRange(days = 30) {
  const result = [];
  const devices = ['garmin', 'whoop'];
  for (let i = days; i >= 0; i--) {
    const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
    for (const device of devices) {
      const offset = device === 'whoop' ? 5 : 0;
      result.push({
        device, date,
        hr_avg:       wave(i, 7, 4, 68 + offset),
        hrv_ms:       wave(i, 14, 12, 52 + offset),
        resting_hr:   wave(i, 7, 3, 52 - offset * 0.5),
        sleep_score:  Math.min(100, Math.max(40, wave(i, 10, 12, 76 + offset))),
        sleep_duration_s: wave(i, 7, 3600, 25920),
        steps:        device === 'garmin' ? rand(6000, 15000) : null,
        calories_total: rand(2200, 3200),
        recovery_score: Math.min(100, Math.max(10, wave(i, 10, 18, 70 + offset))),
        strain_score:  device === 'whoop' ? parseFloat(wave(i, 5, 4, 12).toFixed(1)) : null,
        spo2_avg:     parseFloat(wave(i, 20, 1.5, 97.5).toFixed(1)),
        active_min:   rand(20, 90),
      });
    }
  }
  return result;
}

export { DEVICE_COLORS };
