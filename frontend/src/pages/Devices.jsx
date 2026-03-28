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

const SYNC_JOB_KEY = (provider) => `wearsync_sync_job_${provider}`;

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const [isDemo, setIsDemo]   = useState(false);
  const [loading, setLoading] = useState({});
  const [syncProgress, setSyncProgress] = useState({});

  useEffect(() => {
    fetch('/api/devices')
      .then(r => r.json())
      .then(d => { setDevices(d); setIsDemo(false); })
      .catch(() => { setDevices(generateDemoDevices()); setIsDemo(true); });
  }, []);

  // Restore and poll running sync jobs so progress survives page navigation
  useEffect(() => {
    const providers = ['withings', 'garmin', 'fitbit', 'whoop', 'zepp'];

    async function pollOnce(provider, jobId) {
      try {
        const r = await fetch(`/api/sync/${provider}/status?jobId=${encodeURIComponent(jobId)}`);
        if (!r.ok) return null;
        const s = await r.json();
        setSyncProgress(p => ({ ...p, [provider]: s }));
        return s;
      } catch {
        return null;
      }
    }

    // initial restore
    providers.forEach(async (provider) => {
      const jobId = localStorage.getItem(SYNC_JOB_KEY(provider));
      if (!jobId) return;
      const s = await pollOnce(provider, jobId);
      if (!s || ['done', 'error', 'aborted_disconnected', 'aborted_cancelled'].includes(s.status)) {
        localStorage.removeItem(SYNC_JOB_KEY(provider));
      }
    });

    const t = setInterval(async () => {
      for (const provider of providers) {
        const jobId = localStorage.getItem(SYNC_JOB_KEY(provider));
        if (!jobId) continue;
        const s = await pollOnce(provider, jobId);
        if (!s) continue;

        // make imported data visible quickly while syncing
        if (provider === 'withings' && s.status === 'running') {
          fetch('/api/devices')
            .then(r => r.json())
            .then(d => setDevices(d))
            .catch(() => {});
        }

        if (['done', 'error', 'aborted_disconnected', 'aborted_cancelled'].includes(s.status)) {
          localStorage.removeItem(SYNC_JOB_KEY(provider));
          setLoading(l => ({ ...l, [provider + '_sync']: false }));
          fetch('/api/devices')
            .then(r => r.json())
            .then(d => setDevices(d))
            .catch(() => {});
        }
      }
    }, 2500);

    return () => clearInterval(t);
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

  async function syncAll(provider) {
    const sp = syncProgress[provider];
    const activeJobId = localStorage.getItem(SYNC_JOB_KEY(provider));

    // If running, button works as STOP
    if (sp?.status === 'running' && activeJobId) {
      try {
        await fetch(`/api/sync/${provider}/stop?jobId=${encodeURIComponent(activeJobId)}`, { method: 'POST' });
      } catch (e) { console.error(e); }
      return;
    }

    if (loading[provider + '_sync']) return;

    setLoading(l => ({ ...l, [provider + '_sync']: true }));

    try {
      // Testing range requirement: today backwards to 2024-01-01
      const from = '2024-01-01';
      const to = new Date().toISOString().slice(0, 10);

      const r = await fetch(`/api/sync/${provider}?all=true&from=${from}&to=${to}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'sync start failed');

      if (j.jobId) {
        localStorage.setItem(SYNC_JOB_KEY(provider), j.jobId);
        setSyncProgress(p => ({
          ...p,
          [provider]: {
            provider,
            status: 'running',
            pct: 0,
            from,
            to,
            jobId: j.jobId,
          }
        }));
      }
    } catch (e) {
      console.error(e);
      setLoading(l => ({ ...l, [provider + '_sync']: false }));
    }
  }

  async function deleteData(provider) {
    if (!confirm(`Are you sure you want to delete all local data for ${provider}?`)) return;
    setLoading(l => ({ ...l, [provider + '_del']: true }));
    try {
      await fetch(`/api/metrics/${provider}`, { method: 'DELETE' });
      alert(`Deleted all local data for ${provider}`);
      setDevices(d => d.map(dev => dev.provider === provider ? { ...dev, last_sync: null } : dev));
    } catch (e) { console.error(e); }
    setLoading(l => ({ ...l, [provider + '_del']: false }));
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
              const sp = syncProgress[d.provider];
              const pct = sp?.pct ?? null;
              const syncBusy = loading[d.provider + '_sync'] || (sp && sp.status === 'running');

              return (
                <div key={d.provider} className={styles.deviceCard}>
                  <div className={styles.deviceLeft}>
                    <div className={styles.deviceDot} style={{ background: DEVICE_COLORS[d.provider] }} />
                    <div>
                      <div className={styles.deviceName}>{info.label || d.label}</div>
                      <div className={styles.deviceDesc}>{info.desc}</div>
                      {d.last_sync && <div className={styles.lastSync}>Last synced {format(new Date(d.last_sync), 'MMM d, HH:mm')}</div>}
                      {sp && (
                        <div className={styles.lastSync}>
                          Sync status: {sp.status}{typeof pct === 'number' ? ` · ${pct}%` : ''}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={styles.deviceRight}>
                    <div className={styles.connectedBadge}>● Connected</div>
                    <button className={styles.connectBtn} style={{ borderColor: DEVICE_COLORS[d.provider] + '55', color: DEVICE_COLORS[d.provider], marginRight: '8px' }} onClick={() => syncAll(d.provider)}>
                      {syncBusy ? `Stop sync${typeof pct === 'number' ? ` (${pct}%)` : ''}` : 'Sync all (2024→today)'}
                    </button>
                    <button className={styles.disconnectBtn} style={{marginRight: '8px'}} onClick={() => deleteData(d.provider)} disabled={loading[d.provider + '_del'] || syncBusy}>
                      {loading[d.provider + '_del'] ? '...' : 'Delete data'}
                    </button>
                    <button className={styles.disconnectBtn} onClick={() => disconnect(d.provider)} disabled={loading[d.provider] || syncBusy}>
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
