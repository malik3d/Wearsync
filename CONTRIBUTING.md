# Contributing to WearSync

Thank you for your interest! WearSync is a community project — every contribution matters.

## Ways to Contribute

### Add a new device integration
1. Create `backend/src/services/yourdevice.js`
2. Implement `getAuthURL()`, `exchangeCode(code)`, `fetchDaily(date)`
3. Add normalization in `backend/src/utils/normalizer.js`
4. Register OAuth routes in `backend/src/routes/auth.js`
5. Add your device color in `frontend/src/utils/demo.js`

### Device wishlist (PRs welcome!)
- [ ] Polar (Polar Accesslink API)
- [ ] Oura Ring (Oura Cloud API)
- [ ] Samsung Galaxy Watch (Samsung Health SDK)
- [ ] COROS
- [ ] Suunto

### Other contributions
- Bug fixes
- UI improvements
- New chart types
- Docker / deployment improvements
- Documentation

## Dev Setup

```bash
git clone https://github.com/yourusername/wearsync
cd wearsync

# Backend
cd backend && npm install && cp ../.env.example ../.env
npm run dev

# Frontend (new terminal)
cd frontend && npm install
npm run dev
```

## Code Style
- ES modules (import/export)
- Async/await throughout
- CSS Modules for all styles
- No external UI libraries — keep it lean

## Questions?
Open an issue!
