/**
 * WearSync Data Normalizer
 *
 * Each device speaks a different dialect.
 * This module translates everything into our unified schema
 * before it hits the database.
 */

// ─── GARMIN ──────────────────────────────────────────────────────────────────
function normalizeGarmin(date, daily, sleep, heartRate) {
  return {
    device: 'garmin',
    date,
    hr_avg:            daily?.averageHeartRateInBeatsPerMinute ?? null,
    hr_min:            daily?.minHeartRateInBeatsPerMinute ?? null,
    hr_max:            daily?.maxHeartRateInBeatsPerMinute ?? null,
    hrv_ms:            daily?.averageStressLevel ?? null,   // Garmin uses stress, HRV via separate endpoint
    resting_hr:        daily?.restingHeartRateInBeatsPerMinute ?? null,

    sleep_duration_s:  sleep?.durationInSeconds ?? null,
    sleep_score:       sleep?.sleepScores?.overall?.value ?? null,
    sleep_deep_s:      sleep?.deepSleepDurationInSeconds ?? null,
    sleep_rem_s:       sleep?.remSleepInSeconds ?? null,
    sleep_light_s:     sleep?.lightSleepDurationInSeconds ?? null,
    sleep_awake_s:     sleep?.awakeDurationInSeconds ?? null,

    steps:             daily?.totalSteps ?? null,
    calories_total:    daily?.totalKilocalories ?? null,
    calories_active:   daily?.activeKilocalories ?? null,
    active_min:        daily?.moderateIntensityMinutes ?? null,
    distance_m:        daily?.totalDistanceInMeters ?? null,

    recovery_score:    null,   // Garmin doesn't expose this directly
    strain_score:      null,
    spo2_avg:          daily?.averageSpO2 ?? null,
    stress_avg:        daily?.averageStressLevel ?? null,

    raw: JSON.stringify({ daily, sleep, heartRate }),
  };
}

// ─── FITBIT ───────────────────────────────────────────────────────────────────
function normalizeFitbit(date, summary, sleep, hrv) {
  const s = summary?.activities?.summary || {};
  const sl = sleep?.sleep?.[0] || {};
  return {
    device: 'fitbit',
    date,
    hr_avg:            s.heartRateZones?.find(z => z.name === 'Fat Burn')?.minutes ?? null,
    hr_min:            null,
    hr_max:            null,
    hrv_ms:            hrv?.hrv?.[0]?.value?.dailyRmssd ?? null,
    resting_hr:        s.restingHeartRate ?? null,

    sleep_duration_s:  sl.duration ? sl.duration / 1000 : null,
    sleep_score:       sleep?.sleep?.[0]?.efficiency ?? null,
    sleep_deep_s:      sl.levels?.summary?.deep?.minutes ? sl.levels.summary.deep.minutes * 60 : null,
    sleep_rem_s:       sl.levels?.summary?.rem?.minutes  ? sl.levels.summary.rem.minutes  * 60 : null,
    sleep_light_s:     sl.levels?.summary?.light?.minutes ? sl.levels.summary.light.minutes * 60 : null,
    sleep_awake_s:     sl.levels?.summary?.wake?.minutes  ? sl.levels.summary.wake.minutes  * 60 : null,

    steps:             s.steps ?? null,
    calories_total:    s.caloriesOut ?? null,
    calories_active:   s.activityCalories ?? null,
    active_min:        (s.fairlyActiveMinutes ?? 0) + (s.veryActiveMinutes ?? 0),
    distance_m:        s.distances?.find(d => d.activity === 'total')?.distance
                         ? s.distances.find(d => d.activity === 'total').distance * 1000 : null,

    recovery_score:    null,
    strain_score:      null,
    spo2_avg:          null,
    stress_avg:        null,

    raw: JSON.stringify({ summary, sleep, hrv }),
  };
}

// ─── WHOOP ────────────────────────────────────────────────────────────────────
function normalizeWhoop(date, recovery, sleep, workout) {
  const r = recovery?.score || {};
  const sl = sleep?.score || {};
  return {
    device: 'whoop',
    date,
    hr_avg:            null,
    hr_min:            null,
    hr_max:            null,
    hrv_ms:            r.hrv_rmssd_milli ?? null,
    resting_hr:        r.resting_heart_rate ?? null,

    sleep_duration_s:  sleep?.start && sleep?.end
                         ? (new Date(sleep.end) - new Date(sleep.start)) / 1000 : null,
    sleep_score:       sl.sleep_performance_percentage ?? null,
    sleep_deep_s:      sl.stage_summary?.total_slow_wave_sleep_time_milli
                         ? sl.stage_summary.total_slow_wave_sleep_time_milli / 1000 : null,
    sleep_rem_s:       sl.stage_summary?.total_rem_sleep_time_milli
                         ? sl.stage_summary.total_rem_sleep_time_milli / 1000 : null,
    sleep_light_s:     sl.stage_summary?.total_light_sleep_time_milli
                         ? sl.stage_summary.total_light_sleep_time_milli / 1000 : null,
    sleep_awake_s:     sl.stage_summary?.total_awake_time_milli
                         ? sl.stage_summary.total_awake_time_milli / 1000 : null,

    steps:             null,   // Whoop doesn't track steps
    calories_total:    workout?.score?.calorie ?? null,
    calories_active:   null,
    active_min:        null,
    distance_m:        null,

    recovery_score:    r.recovery_score ?? null,
    strain_score:      workout?.score?.strain ?? null,
    spo2_avg:          r.spo2_percentage ?? null,
    stress_avg:        null,

    raw: JSON.stringify({ recovery, sleep, workout }),
  };
}

// ─── WITHINGS ─────────────────────────────────────────────────────────────────
function normalizeWithings(date, activity, sleep, heart, body = {}) {
  const a = activity?.body?.activities?.[0] || {};
  const sl = sleep?.body?.series?.[0] || {};
  return {
    device: 'withings',
    date,
    hr_avg:            body.heart_rate ?? heart?.body?.series?.[0]?.heart_rate?.average ?? null,
    hr_min:            heart?.body?.series?.[0]?.heart_rate?.min ?? null,
    hr_max:            heart?.body?.series?.[0]?.heart_rate?.max ?? null,
    hrv_ms:            null,
    resting_hr:        null,

    sleep_duration_s:  sl.data?.durationtosleep ?? null,
    sleep_score:       sl.score ?? null,
    sleep_deep_s:      sl.data?.deepsleepduration ?? null,
    sleep_rem_s:       sl.data?.remsleepduration ?? null,
    sleep_light_s:     sl.data?.lightsleepduration ?? null,
    sleep_awake_s:     sl.data?.wakeupduration ?? null,

    steps:             a.steps ?? null,
    calories_total:    a.totalcalories ?? null,
    calories_active:   a.calories ?? null,
    active_min:        a.active ?? null,
    distance_m:        a.distance ?? null,

    recovery_score:    null,
    strain_score:      null,
    spo2_avg:          body.spo2 ?? null,
    stress_avg:        null,

    // Body composition (mainly Withings)
    weight_kg:         body.weight_kg ?? null,
    fat_ratio:         body.fat_ratio ?? null,
    fat_mass_kg:       body.fat_mass_kg ?? null,
    hydration_kg:      body.hydration_kg ?? null,
    muscle_mass_kg:    body.muscle_mass_kg ?? null,
    bone_mass_kg:      body.bone_mass_kg ?? null,
    systolic_bp:       body.systolic_bp ?? null,
    diastolic_bp:      body.diastolic_bp ?? null,
    pulse_wave_velocity: body.pulse_wave_velocity ?? null,

    raw: JSON.stringify({ activity, sleep, heart, body }),
  };
}

module.exports = {
  normalizeGarmin,
  normalizeFitbit,
  normalizeWhoop,
  normalizeWithings,
};
