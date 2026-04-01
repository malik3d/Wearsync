import React, { useState, useEffect } from 'react';
import styles from './Devices.module.css';

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDevices(); }, []);

  async function loadDevices() {
    try {
      const res = await fetch('/api/devices');
      setDevices(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  return (
    <div className={styles.container}>
      <h1>Devices</h1>
      {loading ? <p>Laden...</p> : devices.length === 0 ? (
        <p className={styles.empty}>Keine Geräte verbunden. <a href="/import">Daten importieren →</a></p>
      ) : (
        <div className={styles.grid}>
          {devices.map(d => (
            <div key={d.provider} className={styles.card}>
              <h3>{d.label || d.provider}</h3>
              <p className={styles.provider}>{d.provider}</p>
              {d.last_sync && <p className={styles.sync}>Zuletzt: {new Date(d.last_sync).toLocaleString('de-DE')}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
