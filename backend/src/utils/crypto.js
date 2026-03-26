const { getDB }            = require('../models/database');
const { encrypt, decrypt } = require('./crypto');

function saveTokens(provider, label, accessToken, refreshToken, expiresIn) {
  const db = getDB();
  db.prepare(`
    INSERT INTO devices (provider, label, access_token, refresh_token, token_expires)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(provider) DO UPDATE SET
      access_token=excluded.access_token,
      refresh_token=excluded.refresh_token,
      token_expires=excluded.token_expires
  `).run(
    provider,
    label,
    encrypt(accessToken),
    refreshToken ? encrypt(refreshToken) : null,
    Date.now() + (expiresIn || 3600) * 1000
  );
}

function getTokens(provider) {
  const db     = getDB();
  const device = db.prepare('SELECT * FROM devices WHERE provider=?').get(provider);
  if (!device) return null;
  return {
    ...device,
    access_token:  decrypt(device.access_token),
    refresh_token: device.refresh_token ? decrypt(device.refresh_token) : null,
  };
}

function updateLastSync(provider) {
  const db = getDB();
  db.prepare("UPDATE devices SET last_sync=datetime('now') WHERE provider=?").run(provider);
}

module.exports = { saveTokens, getTokens, updateLastSync };
```

---

Commit message:
```
security: fix #3 — encrypted token store for all services
