/**
 * WearSync — Auto-Sync Cron Job
 *
 * Runs nightly at 03:00 local time, syncs all connected devices
 * for yesterday and today. No external deps — uses setInterval.
 *
 * For production: replace with node-cron or system crontab
 * System crontab example:
 *   0 3 * * * curl -X POST http://localhost:4000/sync -H "Content-Type: application/json" -d '{"date":"$(date +%Y-%m-%d)"}'
 */

const { getDB } = require('../models/database');

const SERVICES = {
  garmin:   () => require('./garmin'),
  fitbit:   () => require('./fitbit'),
  whoop:    () => require('./whoop'),
  withings: () => require('./withings'),
  zepp:     () => require('./zepp'),
  oura:     () => require('./oura'),
  // apple: import-only, no auto-sync
};

let syncJob = null;

function getNextRun(hour = 3) {
  const now  = new Date();
  const next = new Date();
  next.setHours(hour, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next;
}

function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

async function runSync(label = 'scheduled') {
  const db      = getDB();
  const devices = db.prepare('SELECT provider FROM devices').all().map(d => d.provider);

  if (!devices.length) {
    console.log('⏭  Auto-sync: no devices connected, skipping');
    return;
  }

  const today     = formatDate(new Date());
  const yesterday = formatDate(new Date(Date.now() - 864e5));
  const dates     = [yesterday, today];

  console.log(`\n🔄 Auto-sync [${label}] — ${devices.join(', ')} — dates: ${dates.join(', ')}`);

  const results = {};
  for (const provider of devices) {
    const svcFactory = SERVICES[provider];
    if (!svcFactory) continue;
    const svc = svcFactory();
    results[provider] = {};
    for (const date of dates) {
      try {
        await svc.fetchDaily(date);
        results[provider][date] = 'ok';
        console.log(`  ✅ ${provider} / ${date}`);
      } catch (e) {
        results[provider][date] = e.message;
        console.log(`  ❌ ${provider} / ${date}: ${e.message}`);
      }
    }
  }

  // Log sync run
  db.prepare(`
    CREATE TABLE IF NOT EXISTS sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ran_at TEXT DEFAULT (datetime('now')),
      label TEXT,
      results JSON
    )
  `).run();
  db.prepare("INSERT INTO sync_log (label, results) VALUES (?, ?)").run(label, JSON.stringify(results));

  console.log(`✅ Auto-sync complete\n`);
  return results;
}

function scheduleDailyCron() {
  const scheduleNext = () => {
    const next = getNextRun(3); // 03:00
    const ms   = next - Date.now();
    console.log(`⏰ Next auto-sync scheduled: ${next.toLocaleString()} (in ${Math.round(ms/3600000)}h)`);

    syncJob = setTimeout(async () => {
      await runSync('nightly-03:00');
      scheduleNext(); // reschedule for next night
    }, ms);
  };

  scheduleNext();
}

function stopCron() {
  if (syncJob) { clearTimeout(syncJob); syncJob = null; }
}

module.exports = { scheduleDailyCron, runSync, stopCron };
