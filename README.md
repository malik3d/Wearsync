# WearSync 🩺

**Open Source Wearable Data Aggregator** — bring all your smartwatch data into one place.

> Apple Watch · Garmin · Whoop · Oura · Fitbit · Withings · Amazfit — unified, local, free.

## Why WearSync?

Commercial solutions like Terra API cost $400+/month. WearSync connects directly to each manufacturer's API, normalizes everything into a single schema, and runs entirely on your machine. No cloud. No subscription. No middleman.

## Features

- 📊 **Live Dashboard** — HRV, Sleep, Recovery, Steps, SpO₂ — all devices in one view
- 📈 **Historical Charts** — 7/30/90 day trends per device
- ⚖️ **Device Comparison** — Garmin vs Whoop side-by-side, same metric, same date
- 📤 **Export** — Full CSV or JSON export of all normalized data
- 📱 **Apple Health Import** — drag & drop your iPhone export.xml
- 🔒 **100% Local** — SQLite, your data never leaves your machine
- 🐳 **One-command setup** via Docker Compose
- ⏰ **Nightly auto-sync** at 03:00

## Supported Devices

| Device | Access | Notes |
|--------|--------|-------|
| **Whoop** | ✅ Free developer API | [developer.whoop.com](https://developer.whoop.com) — apply for free access |
| **Oura Ring** | ✅ Free Personal Access Token | [cloud.ouraring.com/personal-access-tokens](https://cloud.ouraring.com/personal-access-tokens) — instant, no approval needed |
| **Fitbit** | ✅ Free developer API | [dev.fitbit.com](https://dev.fitbit.com/apps/new) — personal use account |
| **Withings** | ✅ Free developer API | [developer.withings.com](https://developer.withings.com) |
| **Amazfit/Zepp** | ✅ Free developer API | [developer.zepp.com](https://developer.zepp.com) |
| **Apple Health** | ✅ Local XML import | No API key needed — export from iPhone |
| **Garmin** | ⚠️ See note below | Health API requires business account — use FIT file import instead |

### ⚠️ Garmin — Important Note

Garmin's official Health API requires a **business/enterprise account** and is not available for personal developer use. Two alternatives:

**Option 1 — FIT File Import (recommended for personal use):**
1. Open Garmin Connect on your phone or web
2. Any activity → Export → `.fit` file
3. Or bulk export: Garmin Connect Web → Profile → Account → Data Export
4. Upload `.fit` files to WearSync — all metrics extracted automatically

**Option 2 — Garmin Connect Unofficial:**
Some community projects have reverse-engineered the Garmin Connect session API. Not officially supported and may break at any time. Use at your own risk.

> Native FIT file parser is on the roadmap so Garmin users get full access without any API key. PRs welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

## Quick Start

### Option A: Docker (recommended)
```bash
git clone https://github.com/malik3d/Wearsync
cd Wearsync
cp .env.example .env
# Fill in your API keys — see below
docker compose up
```

Open **http://localhost:3000**

### Option B: Manual
```bash
# Backend
cd backend && npm install && npm run dev

# Frontend (new terminal)
cd frontend && npm install && npm run dev
```

## Getting API Keys

### Whoop (free, ~1 day approval)
1. Go to [developer.whoop.com](https://developer.whoop.com)
2. Apply for developer access
3. Create app → get `WHOOP_CLIENT_ID` + `WHOOP_CLIENT_SECRET`

### Oura Ring (free, instant — easiest)
1. Go to [cloud.ouraring.com/personal-access-tokens](https://cloud.ouraring.com/personal-access-tokens)
2. Generate a Personal Access Token
3. Paste it in WearSync → Devices → Oura → PAT — no OAuth needed

### Fitbit (free)
1. Go to [dev.fitbit.com/apps/new](https://dev.fitbit.com/apps/new)
2. Register as **Personal** app
3. Get `FITBIT_CLIENT_ID` + `FITBIT_CLIENT_SECRET`

### Withings (free)
1. Go to [developer.withings.com](https://developer.withings.com)
2. Create account → register app → get keys

### Apple Health (no key needed)
1. iPhone → **Settings → Health → your name → Export All Health Data**
2. Unzip `export.zip` → you get `export.xml`
3. WearSync → Devices → Apple Health → drag & drop `export.xml`

## Architecture
```
Wearsync/
├── backend/              # Node.js + Express
│   └── src/
│       ├── routes/       # REST API endpoints
│       ├── services/     # Per-device OAuth + data fetching
│       │   ├── whoop.js
│       │   ├── oura.js
│       │   ├── fitbit.js
│       │   ├── withings.js
│       │   ├── zepp.js
│       │   └── apple.js  # XML parser
│       ├── models/       # SQLite schema
│       └── utils/
│           ├── normalizer.js  # All devices → unified schema
│           └── cron.js        # Nightly auto-sync
├── frontend/             # React + Vite
│   └── src/
│       └── pages/        # Dashboard, History, Compare, Devices, Export
└── docker-compose.yml
```

## Normalized Data Schema

Every device maps to the same fields before hitting the database:
```json
{
  "device": "whoop",
  "date": "2026-03-23",
  "hr_avg": 66,
  "hrv_ms": 58,
  "resting_hr": 50,
  "sleep_duration_s": 26460,
  "sleep_score": 83,
  "sleep_deep_s": 6120,
  "sleep_rem_s": 7560,
  "steps": null,
  "calories_total": 2590,
  "active_min": 51,
  "recovery_score": 81,
  "strain_score": 14.2,
  "spo2_avg": 98.1
}
```

## Roadmap

- [ ] Native FIT file parser for Garmin (no API key needed)
- [ ] Polar API integration
- [ ] COROS integration
- [ ] Samsung Health
- [ ] Continuous Glucose Monitor (CGM) — Libre, Dexcom
- [ ] WearSync Cloud (optional hosted version)

## Contributing

PRs welcome — especially for new device integrations. Each integration is a single file in `backend/src/services/`. See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

MIT — free forever.
```

---

Commit message unten:
```
docs: honest Garmin API note, FIT file import alternative, fix device access info
