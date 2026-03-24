# WearSync Launch Checklist

## 1. GitHub Setup (30 Minuten)

```bash
# Repository erstellen auf github.com → "New repository"
# Name: wearsync
# Description: Open source multi-wearable data aggregator — Garmin, Whoop, Oura, Apple Health & more in one local dashboard
# Public ✅  |  Add README ❌ (haben wir schon)  |  MIT License ✅

cd /path/to/wearsync
git init
git add .
git commit -m "feat: initial release v1.0.0"
git branch -M main
git remote add origin https://github.com/DEIN-USERNAME/wearsync.git
git push -u origin main

# Ersten Release taggen → löst GitHub Actions release.yml aus
git tag v1.0.0
git push origin v1.0.0
```

## 2. GitHub Repository Settings

- [ ] **About**: Description + Tags setzen: `wearable`, `garmin`, `whoop`, `oura`, `apple-health`, `health-data`, `self-hosted`, `quantified-self`
- [ ] **Topics** hinzufügen (rechts im Repo)
- [ ] **Releases**: v1.0.0 manuell erstellen falls CI nicht greift
- [ ] **Discussions** aktivieren (für Community-Fragen)
- [ ] **Issues** → Templates erstellen: Bug Report, Feature Request, New Device Integration

## 3. GitHub Secrets (für Docker Hub Publishing)

Settings → Secrets → New:
- `DOCKERHUB_USERNAME` = dein Docker Hub Username
- `DOCKERHUB_TOKEN`    = Docker Hub Access Token

## 4. README Badge aktualisieren

```markdown
![CI](https://github.com/DEIN-USERNAME/wearsync/actions/workflows/ci.yml/badge.svg)
![License](https://img.shields.io/badge/license-MIT-green)
![Devices](https://img.shields.io/badge/devices-7-blue)
```

## 5. Apple Health Import — Frontend ergänzen

Füge einen Upload-Button in die Devices-Seite ein:

```jsx
// In Devices.jsx
<div className={styles.appleImport}>
  <div className={styles.appleTitle}>Apple Health Import</div>
  <p>1. iPhone → Einstellungen → Gesundheit → Daten exportieren</p>
  <p>2. export.zip entpacken → export.xml hier hochladen</p>
  <input type="file" accept=".xml" onChange={handleAppleImport} />
</div>
```

## 6. Reddit Posts abschicken

Reihenfolge und Timing:
- **Montag 09:00 UTC** → r/Garmin
- **Montag 11:00 UTC** → r/whoop  
- **Montag 13:00 UTC** → r/QuantifiedSelf  ← wichtigste Community
- **Montag 15:00 UTC** → r/selfhosted

Regeln beachten:
- r/Garmin: Self-promotion erlaubt wenn nützlich, kein Spam
- r/whoop: Community-Projekt okay, kein kommerzieller Pitch
- r/QuantifiedSelf: Sehr willkommen, möglichst viel technischer Kontext
- r/selfhosted: Docker + self-hosted Aspekte betonen

## 7. Begleitend

- [ ] Hacker News "Show HN" post (Dienstag Morgen UTC)
- [ ] Twitter/X: kurzer Thread mit Screenshots
- [ ] GitHub Sponsors aktivieren sobald erste Stars kommen

## 8. Oura PAT Setup (für Nutzer ohne OAuth)

Einfachster Weg für Oura-Nutzer:
1. https://cloud.ouraring.com/personal-access-tokens
2. Token erstellen
3. In WearSync: Devices → Oura → "PAT eingeben"

```bash
# oder direkt via curl:
curl -X POST http://localhost:4000/auth/oura/pat \
  -H "Content-Type: application/json" \
  -d '{"token": "DEIN_OURA_PAT"}'
```

## Milestones

| Milestone | Ziel |
|-----------|------|
| Launch    | GitHub live, Reddit Posts |
| 100 Stars | Issues triagen, erste PRs mergen |
| 500 Stars | WearSync Cloud Beta starten |
| 1k Stars  | GitHub Sponsors / Product Hunt |
| 5k Stars  | Team/Coach Dashboard (Monetarisierung) |
