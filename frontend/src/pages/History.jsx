import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { format, subDays } from 'date-fns';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { generateDemoRange, DEVICE_COLORS } from '../utils/demo.js';
import styles from './History.module.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const METRICS = [
  { key: 'hrv_ms',          label: 'HRV',           unit: 'ms' },
  { key: 'resting_hr',      label: 'Resting HR',    unit: 'bpm' },
  { key: 'sleep_score',     label: 'Sleep Score',   unit: '' },
  { key: 'recovery_score',  label: 'Recovery',      unit: '%' },
  { key: 'steps',           label: 'Steps',         unit: '' },
  { key: 'spo2_avg',        label: 'SpO₂',          unit: '%' },
  { key: 'calories_total',  label: 'Calories',      unit: 'kcal' },
  { key: 'active_min',      label: 'Active Minutes', unit: 'min' },

  // Withings/body composition
  { key: 'weight_kg',       label: 'Weight',        unit: 'kg' },
  { key: 'fat_ratio',       label: 'Body Fat',      unit: '%' },
  { key: 'fat_mass_kg',     label: 'Fat Mass',      unit: 'kg' },
  { key: 'hydration_kg',    label: 'Body Water',    unit: 'kg' },
  { key: 'muscle_mass_kg',  label: 'Muscle Mass',   unit: 'kg' },
  { key: 'bone_mass_kg',    label: 'Bone Mass',     unit: 'kg' },
  { key: 'systolic_bp',     label: 'Systolic BP',   unit: 'mmHg' },
  { key: 'diastolic_bp',    label: 'Diastolic BP',  unit: 'mmHg' },
];

const RANGES = [
  { label: '7d',  days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];

function buildChartData(rows, metric) {
  const byDevice = {};
  for (const row of rows) {
    if (!byDevice[row.device]) byDevice[row.device] = {};
    if (row[metric] != null) byDevice[row.device][row.date] = row[metric];
  }

  const allDates = [...new Set(rows.map(r => r.date))].sort();
  const labels   = allDates.map(d => format(new Date(d + 'T12:00:00'), 'MMM d'));

  const datasets = Object.entries(byDevice)
    .filter(([, vals]) => Object.keys(vals).length > 0)
    .map(([device, vals]) => ({
      label: device.charAt(0).toUpperCase() + device.slice(1),
      data: allDates.map(d => vals[d] ?? null),
      borderColor: DEVICE_COLORS[device],
      backgroundColor: DEVICE_COLORS[device] + '18',
      borderWidth: 2,
      pointRadius: 2,
      pointHoverRadius: 5,
      tension: 0.35,
      spanGaps: true,
      fill: false,
    }));

  return { labels, datasets };
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: {
      labels: {
        color: '#6b6b80',
        font: { family: "'DM Sans', sans-serif", size: 12 },
        boxWidth: 10,
        boxHeight: 10,
        usePointStyle: true,
      },
    },
    tooltip: {
      backgroundColor: '#18181f',
      borderColor: 'rgba(255,255,255,0.07)',
      borderWidth: 1,
      titleColor: '#e8e8f0',
      bodyColor: '#a0a0b8',
      padding: 10,
    },
  },
  scales: {
    x: {
      grid: { color: 'rgba(255,255,255,0.04)' },
      ticks: { color: '#6b6b80', font: { size: 11 }, maxTicksLimit: 10 },
    },
    y: {
      grid: { color: 'rgba(255,255,255,0.04)' },
      ticks: { color: '#6b6b80', font: { size: 11 } },
    },
  },
};

export default function History() {
  const [rows, setRows]       = useState([]);
  const [metric, setMetric]   = useState('hrv_ms');
  const [range, setRange]     = useState(30);

  useEffect(() => {
    const from = format(subDays(new Date(), range), 'yyyy-MM-dd');
    const to   = format(new Date(), 'yyyy-MM-dd');
    fetch(`/api/metrics/range?from=${from}&to=${to}`)
      .then(r => r.json())
      .then(d => { if (!d.length) setRows(generateDemoRange(range)); else setRows(d); })
      .catch(() => setRows(generateDemoRange(range)));
  }, [range]);

  const chartData = buildChartData(rows, metric);
  const metricDef = METRICS.find(m => m.key === metric);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>History</h1>
          <p className={styles.subtitle}>Trends over time across all devices</p>
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.metricPicker}>
          {METRICS.map(m => (
            <button
              key={m.key}
              className={`${styles.pill} ${metric === m.key ? styles.pillActive : ''}`}
              onClick={() => setMetric(m.key)}
            >{m.label}</button>
          ))}
        </div>
        <div className={styles.rangePicker}>
          {RANGES.map(r => (
            <button
              key={r.days}
              className={`${styles.rangePill} ${range === r.days ? styles.rangePillActive : ''}`}
              onClick={() => setRange(r.days)}
            >{r.label}</button>
          ))}
        </div>
      </div>

      <div className={styles.chartWrap}>
        <div className={styles.chartTitle}>
          {metricDef?.label}{metricDef?.unit && <span className={styles.chartUnit}> ({metricDef.unit})</span>}
        </div>
        <div className={styles.chart}>
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      <div className={styles.statsGrid}>
        {[...new Set(rows.map(r => r.device))].map(device => {
          const vals = rows.filter(r => r.device === device && r[metric] != null).map(r => r[metric]);
          if (!vals.length) return null;
          const avg = (vals.reduce((a,b) => a+b, 0) / vals.length);
          const min = Math.min(...vals);
          const max = Math.max(...vals);
          return (
            <div key={device} className={styles.statCard}>
              <div className={styles.statDevice}>
                <span className={styles.statDot} style={{ background: DEVICE_COLORS[device] }} />
                {device.charAt(0).toUpperCase() + device.slice(1)}
              </div>
              <div className={styles.statRow}>
                <div className={styles.stat}><span className={styles.statLabel}>AVG</span><span className={styles.statVal}>{avg.toFixed(1)}</span></div>
                <div className={styles.stat}><span className={styles.statLabel}>MIN</span><span className={styles.statVal}>{min.toFixed(1)}</span></div>
                <div className={styles.stat}><span className={styles.statLabel}>MAX</span><span className={styles.statVal}>{max.toFixed(1)}</span></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
