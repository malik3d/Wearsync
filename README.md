# WearSync 🩺

**Open Source Wearable Data Aggregator** — bring all your smartwatch data into one place.

> Apple Watch · Garmin · Whoop · Fitbit · Withings · Amazfit — unified, local, free.

![WearSync Dashboard](docs/screenshot.png)

## Why WearSync?

Commercial solutions like Terra API cost $400+/month. WearSync connects directly to each manufacturer's **free developer API**, normalizes all data into a single schema, and runs entirely on your machine. No cloud. No subscription. No middleman.

## Features

- 📊 **Live Dashboard** — Heart Rate, HRV, Sleep, Activity, Recovery Score
- 📈 **Historical Charts** — Compare trends across weeks/months
- ⚖️ **Device Comparison** — Garmin vs Whoop side-by-side, same metric
- 📤 **Export** — Full data export as CSV or JSON
- 🔒 **100% Local** — SQLite database, your data stays on your machine
- 🐳 **One-command setup** via Docker Compose

## Supported Devices (v1.0)

| Device | API | Status |
|--------|-----|--------|
| Garmin | [Garmin Health API](https://developer.garmin.com/health-api/) | ✅ |
| Fitbit | [Fitbit Web API](https://dev.fitbit.com/) | ✅ |
| Whoop | [Whoop API v1](https://developer.whoop.com/) | ✅ |
| Withings | [Withings Health API](https://developer.withings.com/) | ✅ |
| Amazfit/Zepp | [Zepp Health API](https://developer.zepp.com/) | ✅ |
| Apple Health | Local JSON export import | ✅ |

## Quick Start

### Option A: Docker (recommended)

```bash
git clone https://github.com/yourusername/wearsync
cd wearsync
cp .env.example .env
# Fill in your API keys in .env
docker compose up
```

Open http://localhost:3000

### Option B: Manual

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

## Getting API Keys (all free)

### Garmin
1. Go to https://developer.garmin.com/health-api/
2. Create a developer account
3. Register your app → get `GARMIN_CLIENT_ID` + `GARMIN_CLIENT_SECRET`

### Fitbit
1. Go to https://dev.fitbit.com/apps/new
2. Register app (Personal use) → get `FITBIT_CLIENT_ID` + `FITBIT_CLIENT_SECRET`

### Whoop
1. Go to https://developer.whoop.com/
2. Apply for API access (free, usually approved within a day)
3. Create app → get `WHOOP_CLIENT_ID` + `WHOOP_CLIENT_SECRET`

### Withings
1. Go to https://developer.withings.com/
2. Create account → register app → get keys

## Architecture

```
wearsync/
├── backend/          # Node.js + Express API server
│   └── src/
│       ├── routes/   # API endpoints
│       ├── services/ # Per-device OAuth + data fetching
│       ├── models/   # Normalized data schema
│       └── utils/    # Data normalization helpers
├── frontend/         # React + Vite dashboard
│   └── src/
│       ├── components/
│       ├── pages/
│       └── hooks/
└── docker-compose.yml
```

## Normalized Data Schema

All device data is normalized before storage:

```json
{
  "device": "garmin",
  "user_id": "local",
  "timestamp": "2026-03-23T08:00:00Z",
  "metrics": {
    "heart_rate": { "avg": 62, "min": 48, "max": 120, "unit": "bpm" },
    "hrv": { "value": 58, "unit": "ms" },
    "sleep": { "duration": 27480, "score": 82, "unit": "seconds" },
    "activity": { "steps": 9400, "calories": 2340, "active_minutes": 48 },
    "recovery": { "score": 76, "unit": "percent" }
  }
}
```

## Contributing

PRs welcome! See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — free forever.
