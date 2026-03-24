const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || './data/wearsync.db';

// Ensure data directory exists
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

let db;

function getDB() {
  if (!db) db = new Database(DB_PATH);
  return db;
}

function initDB() {
  const db = getDB();

  // Connected devices / OAuth tokens
  db.exec(`
    CREATE TABLE IF NOT EXISTS devices (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      provider    TEXT NOT NULL UNIQUE,  -- 'garmin' | 'fitbit' | 'whoop' | 'withings' | 'zepp'
      label       TEXT,
      access_token  TEXT,
      refresh_token TEXT,
      token_expires INTEGER,
      connected_at  TEXT DEFAULT (datetime('now')),
      last_sync     TEXT
    );
  `);

  // Normalized metrics — one row per device per day
  db.exec(`
    CREATE TABLE IF NOT EXISTS metrics (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      device     TEXT NOT NULL,
      date       TEXT NOT NULL,           -- YYYY-MM-DD
      synced_at  TEXT DEFAULT (datetime('now')),

      -- Heart
      hr_avg     REAL,
      hr_min     REAL,
      hr_max     REAL,
      hrv_ms     REAL,
      resting_hr REAL,

      -- Sleep
      sleep_duration_s  INTEGER,
      sleep_score       REAL,
      sleep_deep_s      INTEGER,
      sleep_rem_s       INTEGER,
      sleep_light_s     INTEGER,
      sleep_awake_s     INTEGER,

      -- Activity
      steps          INTEGER,
      calories_total INTEGER,
      calories_active INTEGER,
      active_min     INTEGER,
      distance_m     REAL,

      -- Recovery / Readiness
      recovery_score REAL,
      strain_score   REAL,
      spo2_avg       REAL,
      stress_avg     REAL,

      -- Raw JSON blob for device-specific extras
      raw JSON,

      UNIQUE(device, date)
    );
  `);

  // Intraday heart rate (high-res)
  db.exec(`
    CREATE TABLE IF NOT EXISTS heartrate_intraday (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      device    TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      bpm       REAL NOT NULL,
      UNIQUE(device, timestamp)
    );
  `);

  console.log('📦 Database initialized at', DB_PATH);
}

module.exports = { getDB, initDB };
