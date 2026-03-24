import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { generateDemoDevices, DEVICE_COLORS } from '../utils/demo.js';
import styles from './Devices.module.css';

const DEVICE_INFO = {
  garmin:   { label: 'Garmin',        desc: 'Garmin Health API — activity, sleep, HRV, SpO₂',    docsUrl: 'https://developer.garmin.com/health-api/' },
  whoop:    { label: 'Whoop',         desc: 'Whoop Developer API — recovery, strain, sleep',      docsUrl: 'https://developer.whoop.com/' },
  fitbit:   { label: 'Fitbit',        desc: 'Fitbit Web API — activity, heart rate, HRV',        docsUrl: 'https://dev.fitbit.com/' },
  withings: { label: 'Withings',      desc: 'Withings Health API — weight, sleep, heart',        docsUrl: 'https://developer.withings.com/' },
  zepp:     { label: 'Amazfit/Zepp',  desc: 'Zepp Health API — activity, heart rate, sleep',     docsUrl: 'https://developer.zepp.com/' },
};

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const [isDemo, setIsDemo]   = useState(false);
  const [loading, setLoading] = useState({});

  useEffect(() => {
    fetch('/api/devices')
      .then(r => r.json())
      .then(d => { setDevices(d); setIsDemo(false); })
      .catch(() => { setDevices(generateDemoDevices()); setIsDemo(true); });
  }, []);

  async function connect(provider) {
    window.location.href = `/api/auth/${provider}`;
  }

  async function disconnect(provider) {
    setLoading(l => ({ ...l, [provider]: true }));
    try {
      await fetch(`/api/devices/${provider}`, { method: 'DELETE' });
      setDevices(d => d.map(dev => dev.provider === provider ? { ...dev, connected: false, last_sync: null } : dev));
    } catch (e) { console.error(e); }
    setLoading(l => ({ ...l, [provider]: false }));
  }

  const connected    = devices.filter(d => d.connected);
  const disconnected = devices.filter(d => !d.connected);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Devices</h1>
        <p className={styles.subtitle}>Connect your wearables — all APIs are free developer tier</p>
      </div>

      {isDemo && (
        <div className={styles.demoBanner}>
          ℹ Backend not running. Start the backend server and add your API keys to <code>.env</code> to connect real devices.
        </div>
      )}

      {connected.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionTitle}>Connected ({connected.length})</div>
          <div className={styles.deviceList}>
            {connected.map(d => {
              const info = DEVICE_INFO[d.provider] || {};
              return (
                <div key={d.provider} className={styles.deviceCard}>
                  <div className={styles.deviceLeft}>
                    <div className={styles.deviceDot} style={{ background: DEVICE_COLORS[d.provider] }} />
                    <div>
                      <div className={styles.deviceName}>{info.label || d.label}</div>
                      <div className={styles.deviceDesc}>{info.desc}</div>
                      {d.last_sync && <div className={styles.lastSync}>Last synced {format(new Date(d.last_sync), 'MMM d, HH:mm')}</div>}
                    </div>
                  </div>
                  <div className={styles.deviceRight}>
                    <div className={styles.connectedBadge}>● Connected</div>
                    <button className={styles.disconnectBtn} onClick={() => disconnect(d.provider)} disabled={loading[d.provider]}>
                      {loading[d.provider] ? '...' : 'Disconnect'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className={styles.section}>
        <div className={styles.sectionTitle}>Available Devices</div>
        <div className={styles.deviceList}>
          {disconnected.map(d => {
            const info = DEVICE_INFO[d.provider] || {};
            return (
              <div key={d.provider} className={`${styles.deviceCard} ${styles.disconnected}`}>
                <div className={styles.deviceLeft}>
                  <div className={styles.deviceDot} style={{ background: DEVICE_COLORS[d.provider], opacity: 0.4 }} />
                  <div>
                    <div className={styles.deviceName}>{info.label || d.label}</div>
                    <div className={styles.deviceDesc}>{info.desc}</div>
                    <a href={info.docsUrl} target="_blank" rel="noreferrer" className={styles.docsLink}>Get API key →</a>
                  </div>
                </div>
                <button className={styles.connectBtn} onClick={() => connect(d.provider)} style={{ borderColor: DEVICE_COLORS[d.provider] + '55', color: DEVICE_COLORS[d.provider] }}>
                  Connect
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
