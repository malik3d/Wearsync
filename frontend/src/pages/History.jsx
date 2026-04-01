import React, { useState, useEffect } from 'react';
import styles from './History.module.css';

const METRICS = [
  { key: 'hr_avg', label: 'Avg HR', unit: 'bpm' },
  { key: 'resting_hr', label: 'Resting HR', unit: 'bpm' },
  { key: 'hrv_ms', label: 'HRV', unit: 'ms' },
  { key: 'sleep_duration_s', label: 'Sleep', unit: 'h', fmt: v => (v/3600).toFixed(1) },
  { key: 'steps', label: 'Steps', unit: '', fmt: v => v?.toLocaleString() },
  { key: 'calories_total', label: 'Calories', unit: 'kcal' },
  { key: 'spo2_avg', label: 'SpO₂', unit: '%' },
  { key: 'weight_kg', label: 'Weight', unit: 'kg', fmt: v => v?.toFixed(1) },
  { key: 'fat_ratio', label: 'Body Fat', unit: '%', fmt: v => v?.toFixed(1) },
];

export default function History() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(14);

  useEffect(() => { loadData(); }, [range]);

  async function loadData() {
    setLoading(true);
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - range * 86400000).toISOString().slice(0, 10);
    try {
      const res = await fetch(`/api/metrics/range?from=${from}&to=${to}`);
      const rows = await res.json();
      setData(rows.sort((a, b) => b.date.localeCompare(a.date)));
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>History</h1>
        <select value={range} onChange={e => setRange(+e.target.value)} className={styles.select}>
          <option value={7}>7 Tage</option>
          <option value={14}>14 Tage</option>
          <option value={30}>30 Tage</option>
          <option value={90}>90 Tage</option>
        </select>
      </div>
      {loading ? <p>Laden...</p> : data.length === 0 ? (
        <p>Keine Daten. <a href="/import">Daten importieren →</a></p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Datum</th>
                <th>Device</th>
                {METRICS.map(m => <th key={m.key}>{m.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.map(row => (
                <tr key={row.date + row.device}>
                  <td>{new Date(row.date).toLocaleDateString('de-DE')}</td>
                  <td><span className={styles.device}>{row.device}</span></td>
                  {METRICS.map(m => (
                    <td key={m.key}>{row[m.key] != null ? (m.fmt ? m.fmt(row[m.key]) : row[m.key]) + (m.unit ? ` ${m.unit}` : '') : '-'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
