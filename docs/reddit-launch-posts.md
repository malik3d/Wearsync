# WearSync — Reddit Launch Posts

---

## r/Garmin  (and r/GarminWatches)

**Title:**
I built an open source dashboard that combines Garmin + Whoop + Apple Health + Oura data in one place — free, local, no subscription

**Post:**
Hey r/Garmin,

Like many of you I wear multiple devices — Garmin for GPS accuracy and activity tracking, Whoop for recovery, and I export Apple Health on top. The problem: three different apps, three different dashboards, no way to compare HRV from Garmin vs Whoop side by side.

Commercial solutions like Terra API cost $400+/month. So I built WearSync — an open source alternative that connects directly to each manufacturer's free developer API.

**What it does:**
- Unified dashboard: HRV, sleep, recovery, steps, SpO₂ — all devices in one view
- Device comparison: Garmin vs Whoop for the same metric, same date range
- Historical charts: 7/30/90 day trends
- Apple Health XML import (export from iPhone → drag and drop)
- CSV/JSON export of all your normalized data
- Nightly auto-sync at 3am
- 100% local — SQLite, runs on your machine, no cloud

**Supported right now:** Garmin, Whoop, Fitbit, Withings, Amazfit/Zepp, Oura Ring, Apple Health

**Setup:**
```bash
git clone https://github.com/[your-username]/wearsync
cp .env.example .env   # add your free Garmin developer API key
docker compose up       # done
```

GitHub: [link]

Would love feedback from people who run Garmin alongside other devices. What metrics do you wish you could compare?

---

## r/whoop

**Title:**
Built an open source app that puts Whoop recovery + Garmin/Oura data on one dashboard — local, free, no Terra API costs

**Post:**
Hey Whoop community,

The frustration: Whoop is incredible for recovery and HRV but doesn't track steps. Garmin/Apple Watch covers the activity side but their recovery scores use completely different algorithms. I wanted to see both on one screen and compare.

Built WearSync — open source, runs locally on your machine. It connects to Whoop's official API (free developer access), Garmin, Oura, Apple Health, and others, normalizes everything into the same schema, and shows it all on one dashboard.

**Key features for Whoop users:**
- See Whoop recovery score + HRV next to Garmin/Oura on the same day
- Compare sleep scores across devices (Whoop often scores differently than Oura for the same night)
- Export your full Whoop history as CSV
- No Whoop subscription price increase affects this — it hits the free developer API directly

Quick note on Whoop's API: they recently opened it up which is great. Sleep minute-by-minute HR isn't available yet but recovery score, HRV, strain, and sleep stages all work.

GitHub: [link]

---

## r/QuantifiedSelf

**Title:**
WearSync — open source multi-wearable aggregator: Garmin + Whoop + Oura + Apple Health + Fitbit in one local dashboard

**Post:**
Hey QS community — this sub is exactly the right audience for this.

**The problem I kept hitting:**
Power users who wear multiple devices (common here) have no good way to aggregate data. Terra API is the professional solution but costs $400+/month. Apple Health aggregates some things but the analysis is limited and Whoop/Garmin don't fully sync there.

**WearSync** is my answer: open source, runs locally, hits each manufacturer's free developer API directly.

**Normalized data schema** — everything maps to:
```json
{
  "device": "garmin",
  "date": "2026-03-23",
  "hrv_ms": 52,
  "resting_hr": 52,
  "sleep_score": 79,
  "recovery_score": 72,
  "spo2_avg": 97.2,
  "steps": 11240,
  ...
}
```

**Tech stack:** Node.js + Express backend, React frontend, SQLite (local), Docker Compose. Fully hackable.

**Devices:** Garmin · Whoop · Fitbit · Withings · Amazfit/Zepp · Oura Ring · Apple Health (XML import)

**For researchers / self-experimenters:**
- Full CSV/JSON export
- Raw JSON blob preserved for device-specific fields
- Easy to extend with new devices (one file per integration)

GitHub: [link]

Looking especially for feedback from people who:
1. Wear 2+ devices simultaneously
2. Have noticed discrepancies between device scores for the same metric
3. Want to add a device integration (Polar, COROS, Samsung, CGM data)

What data sources do you wish you could correlate?

---

## r/selfhosted

**Title:**
WearSync — self-hosted wearable data aggregator (Garmin, Whoop, Oura, Apple Health) — Docker, SQLite, open source

**Post:**
Hey r/selfhosted,

Built a self-hosted dashboard for aggregating smartwatch/wearable data from multiple devices. Runs entirely locally.

**Stack:**
- Backend: Node.js + Express
- Database: SQLite (single file, easy backup)
- Frontend: React + Vite
- Deploy: Docker Compose (one command)

**Data stays 100% on your machine** — no telemetry, no cloud sync, no accounts. Your health data is yours.

**Supported devices:** Garmin, Whoop, Fitbit, Withings, Amazfit/Zepp, Oura Ring, Apple Health XML import

**Setup:**
```bash
git clone https://github.com/[your-username]/wearsync
cp .env.example .env
# Add free API keys from each manufacturer's dev portal
docker compose up
# Open http://localhost:3000
```

Nightly auto-sync built in (runs at 3am). SQLite database at `./data/wearsync.db` — easy to back up with your normal backup solution.

GitHub: [link]

PRs welcome — especially for additional device integrations.
