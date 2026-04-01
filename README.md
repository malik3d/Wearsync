# ⚡ WearSync

Self-hosted wearable data aggregator. Collect, unify, and visualize health metrics from multiple devices in one beautiful dashboard.

![WearSync Dashboard](docs/dashboard-screenshot.png)

## ✨ Features

- **Multi-Device Support**: Apple Health, Garmin, Whoop, Oura, Fitbit, Withings, Amazfit, Renpho
- **Vitality Age**: Unique animated fitness score based on your health metrics
- **Trend Analysis**: 30-day charts for HR, HRV, Steps, Sleep
- **Profile System**: PIN-protected user profiles
- **Privacy First**: 100% self-hosted, your data stays with you
- **Modern UI**: Dark theme, responsive design, smooth animations

## 🏃 Supported Metrics

| Metric | Apple Health | Garmin | Whoop | Oura | Fitbit |
|--------|:------------:|:------:|:-----:|:----:|:------:|
| Heart Rate | ✅ | ✅ | ✅ | ✅ | ✅ |
| Resting HR | ✅ | ✅ | ✅ | ✅ | ✅ |
| HRV | ✅ | ✅ | ✅ | ✅ | ✅ |
| Sleep | ✅ | ✅ | ✅ | ✅ | ✅ |
| Steps | ✅ | ✅ | ✅ | ✅ | ✅ |
| SpO₂ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Weight | ✅ | ✅ | - | ✅ | ✅ |
| Body Fat | ✅ | - | - | - | ✅ |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- SQLite3

### Installation
```bash
git clone https://github.com/malik3d/Wearsync.git
cd Wearsync

# Backend
cd backend
npm install
cp .env.example .env
npm start

# Frontend (new terminal)
cd frontend
npm install
npm run build
```

Access at `http://localhost:3000`

## 📱 Importing Data

### Apple Health
1. Open Health app → Profile → Export All Health Data
2. Upload the `Export.xml` file in WearSync → Import

### Garmin
1. Go to [Garmin Account](https://www.garmin.com/account)
2. Export your data as ZIP
3. Upload in WearSync → Import

## 🔧 Configuration
```env
PORT=3000
JWT_SECRET=your-secret-key
DATABASE_PATH=./data/wearsync.db
```

## 📊 Vitality Age Calculation

Your Vitality Age is calculated from:
- **Resting Heart Rate**: Lower is better (athletes: <50 bpm)
- **HRV**: Higher is better (>50ms is excellent)
- **Daily Steps**: 10k+ steps optimal
- **Sleep Duration**: 7-9 hours optimal

## 🛣️ Roadmap

- [x] Apple Health Import (Streaming XML Parser)
- [x] Garmin ZIP Import
- [x] Profile System with PIN
- [x] Vitality Age Animation
- [x] Responsive Dashboard
- [ ] Withings OAuth Integration
- [ ] Whoop OAuth Integration
- [ ] Daily/Weekly Reports
- [ ] Export to CSV/PDF

## 📄 License

MIT © [malik3d](https://github.com/malik3d)

## ☕ Support

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-ffdd00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/malik3d)
