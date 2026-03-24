import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { generateDemoToday, generateDemoDevices, DEVICE_COLORS } from '../utils/demo.js';
import styles from './Dashboard.module.css';

const METRIC_DEFS = [
  { key: 'resting_hr',      label: 'Resting HR',   unit: 'bpm',  icon: '♥',  good: v => v < 60,  warn: v => v > 75 },
  { key: 'hrv_ms',          label: 'HRV',           unit: 'ms',   icon: '〜',  good: v => v > 55,  warn: v => v < 35 },
  { key: 'sleep_score',     label: 'Sleep Score',   unit: '',     icon: '☽',  good: v => v >= 80, warn: v => v < 60 },
  { key: 'sleep_duration_s',label: 'Sleep',         unit: 'h',    icon: '⏾',  good: v => v >= 25200, warn: v => v < 21600, fmt: v => (v/3600).toFixed(1) },
  { key: 'steps',           label: 'Steps',         unit: '',     icon: '◦',  good: v => v >= 10000, warn: v => v < 5000, fmt: v => v?.toLocaleString() },
  { key: 'recovery_score',  label: 'Recovery',      unit: '%',    icon: '◎',  good: v => v >= 67, warn: v => v < 34 },
  { key: 'spo2_avg',        label: 'SpO₂',          unit: '%',    icon: '○',  good: v => v >= 97, warn: v => v < 95 },
  { key: 'calories_total',  label: 'Calories',      unit: 'kcal', icon: '◈',  good: () => false,  warn: () => false, fmt: v => v?.toLocaleString() },
  { key: 'active_min',      label: 'Active Min',    unit: 'min',  icon: '▷',  good: v => v >= 30, warn: v => v < 15 },
  { key: 'strain_score',    label: 'Strain',        unit: '',     icon: '⚡', good: v => v >= 10 && v <= 18, warn: v => v > 20 },
];

function scoreColor(val, def) {
  if (val == null) return 'var(--text-dim)';
  if (def.good(val)) return 'var(--green)';
  if (def.warn(val)) return 'var(--red)';
  return 'var(--yellow)';
}

function MetricCard({ def, devices }) {
  const values = devices.map(d => ({
    device: d.device,
    value: d[def.key],
    label: d.device.charAt(0).toUpperCase() + d.device.slice(1),
  })).filter(d => d.value != null);

  if (!values.length) return null;

  return (
    <div className={styles.metricCard}>
      <div className={styles.metricHeader}>
        <span className={styles.metricIcon}>{def.icon}</span>
        <span className={styles.metricLabel}>{def.label}</span>
      </div>
      <div className={styles.metricValues}>
        {values.map(({ device, value, label }) => (
          <div key={device} className={styles.metricRow}>
            <span className={styles.deviceDot} style={{ background: DEVICE_COLORS[device] }} />
            <span className={styles.deviceName}>{label}</span>
            <span className={styles.metricValue} style={{ color: scoreColor(value, def) }}>
              {def.fmt ? def.fmt(value) : value}
              {def.unit && <span className={styles.metricUnit}> {def.unit}</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SyncButton({ onSync, syncing }) {
  return (
    <button className={`${styles.syncBtn} ${syncing ? styles.syncing : ''}`} onClick={onSync} disabled={syncing}>
      <span className={styles.syncIcon}>↻</span>
      {syncing ? 'Syncing...' : 'Sync Now'}
    </button>
  );
}

export default function Dashboard() {
  const [data, setData]       = useState([]);
  const [devices, setDevices] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [isDemo, setIsDemo]   = useState(false);
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [d, dev] = await Promise.all([
        fetch('/api/metrics/today').then(r => r.json()),
        fetch('/api/devices').then(r => r.json()),
      ]);
      if (!d.length) { setData(generateDemoToday()); setDevices(generateDemoDevices()); setIsDemo(true); }
      else { setData(d); setDevices(dev); setIsDemo(false); }
    } catch {
      setData(generateDemoToday());
      setDevices(generateDemoDevices());
      setIsDemo(true);
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      await fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: today }) });
      await loadData();
    } catch (e) { console.error(e); }
    setSyncing(false);
  }

  const connectedCount = devices.filter(d => d.connected).length;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <div className={styles.subtitle}>
            {format(new Date(), 'EEEE, MMMM d')}
            {isDemo && <span className={styles.demoBadge}>DEMO MODE</span>}
          </div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.deviceCount}>
            <span className={styles.dcDot} />
            {connectedCount} device{connectedCount !== 1 ? 's' : ''} connected
          </div>
          <SyncButton onSync={handleSync} syncing={syncing} />
        </div>
      </div>

      {isDemo && (
        <div className={styles.demoBanner}>
          ⚡ Running in demo mode — no devices connected. Go to <strong>Devices</strong> to connect your wearables.
        </div>
      )}

      <div className={styles.deviceBar}>
        {devices.filter(d => d.connected).map(d => (
          <div key={d.provider} className={styles.deviceChip}>
            <span className={styles.deviceChipDot} style={{ background: DEVICE_COLORS[d.provider] }} />
            {d.label}
            {d.last_sync && <span className={styles.lastSync}>synced {format(new Date(d.last_sync), 'HH:mm')}</span>}
          </div>
        ))}
      </div>

      <div className={styles.grid}>
        {METRIC_DEFS.map(def => (
          <MetricCard key={def.key} def={def} devices={data} />
        ))}
      </div>
    </div>
  );
}
