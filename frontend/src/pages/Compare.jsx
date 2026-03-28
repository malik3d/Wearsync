// pages/Compare.jsx
import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { format, subDays } from 'date-fns';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { generateDemoRange, DEVICE_COLORS } from '../utils/demo.js';
import styles from './Compare.module.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const METRICS = [
  { key: 'hrv_ms',         label: 'HRV',          unit: 'ms' },
  { key: 'resting_hr',     label: 'Resting HR',   unit: 'bpm' },
  { key: 'sleep_score',    label: 'Sleep Score',  unit: '' },
  { key: 'recovery_score', label: 'Recovery',     unit: '%' },
  { key: 'spo2_avg',       label: 'SpO₂',         unit: '%' },

  // Withings/body composition
  { key: 'weight_kg',      label: 'Weight',       unit: 'kg' },
  { key: 'fat_ratio',      label: 'Body Fat',     unit: '%' },
  { key: 'hydration_kg',   label: 'Body Water',   unit: 'kg' },
  { key: 'muscle_mass_kg', label: 'Muscle Mass',  unit: 'kg' },
  { key: 'systolic_bp',    label: 'Systolic BP',  unit: 'mmHg' },
  { key: 'diastolic_bp',   label: 'Diastolic BP', unit: 'mmHg' },
];

export default function Compare() {
  const [rows, setRows]     = useState([]);
  const [metric, setMetric] = useState('hrv_ms');

  useEffect(() => {
    const from = format(subDays(new Date(), 30), 'yyyy-MM-dd');
    const to   = format(new Date(), 'yyyy-MM-dd');
    fetch(`/api/metrics/range?from=${from}&to=${to}`)
      .then(r => r.json())
      .then(d => setRows(d.length ? d : generateDemoRange(30)))
      .catch(() => setRows(generateDemoRange(30)));
  }, []);

  // Compute per-device averages for selected metric
  const deviceStats = {};
  for (const row of rows) {
    if (row[metric] == null) continue;
    if (!deviceStats[row.device]) deviceStats[row.device] = [];
    deviceStats[row.device].push(row[metric]);
  }

  const devices  = Object.keys(deviceStats);
  const averages = devices.map(d => parseFloat((deviceStats[d].reduce((a,b)=>a+b,0)/deviceStats[d].length).toFixed(1)));
  const def      = METRICS.find(m => m.key === metric);

  const barData = {
    labels: devices.map(d => d.charAt(0).toUpperCase() + d.slice(1)),
    datasets: [{
      label: def?.label,
      data: averages,
      backgroundColor: devices.map(d => DEVICE_COLORS[d] + 'bb'),
      borderColor: devices.map(d => DEVICE_COLORS[d]),
      borderWidth: 2,
      borderRadius: 8,
    }],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#18181f',
        borderColor: 'rgba(255,255,255,0.07)',
        borderWidth: 1,
        titleColor: '#e8e8f0',
        bodyColor: '#a0a0b8',
        callbacks: { label: ctx => ` ${ctx.parsed.y} ${def?.unit}` },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#6b6b80' } },
      y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#6b6b80' } },
    },
  };

  // Delta table
  const sorted = devices.map((d,i) => ({ device: d, avg: averages[i] })).sort((a,b) => b.avg - a.avg);
  const best   = sorted[0]?.avg || 1;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Device Compare</h1>
        <p className={styles.subtitle}>30-day averages across connected devices</p>
      </div>

      <div className={styles.metricPicker}>
        {METRICS.map(m => (
          <button key={m.key} className={`${styles.pill} ${metric===m.key ? styles.pillActive:''}`} onClick={()=>setMetric(m.key)}>
            {m.label}
          </button>
        ))}
      </div>

      <div className={styles.chartWrap}>
        <div style={{ height: 260 }}>
          <Bar data={barData} options={barOptions} />
        </div>
      </div>

      <div className={styles.table}>
        <div className={styles.tableHeader}>
          <span>Device</span>
          <span>30d Avg</span>
          <span>vs Best</span>
          <span>Data Points</span>
        </div>
        {sorted.map(({ device, avg }) => {
          const delta = avg - best;
          const pct   = ((avg / best) * 100).toFixed(1);
          return (
            <div key={device} className={styles.tableRow}>
              <span className={styles.tableDevice}>
                <span className={styles.tableDot} style={{ background: DEVICE_COLORS[device] }} />
                {device.charAt(0).toUpperCase() + device.slice(1)}
              </span>
              <span className={styles.tableVal}>{avg} <span className={styles.unit}>{def?.unit}</span></span>
              <span className={`${styles.tableDelta} ${delta < 0 ? styles.negative : styles.positive}`}>
                {delta === 0 ? '—' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)}`}
              </span>
              <span className={styles.tableCount}>{deviceStats[device].length} days</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
