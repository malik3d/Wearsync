import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import styles from './Dashboard.module.css';

const METRIC_DEFS = [
  { key: 'hr_avg', label: 'Avg HR', unit: 'bpm', icon: '❤️', good: v => v < 75, warn: v => v > 90 },
  { key: 'resting_hr', label: 'Resting HR', unit: 'bpm', icon: '💗', good: v => v < 60, warn: v => v > 75 },
  { key: 'hrv_ms', label: 'HRV', unit: 'ms', icon: '📈', good: v => v > 50, warn: v => v < 30 },
  { key: 'sleep_duration_s', label: 'Sleep', unit: 'h', icon: '😴', good: v => v >= 25200, warn: v => v < 21600, fmt: v => (v/3600).toFixed(1) },
  { key: 'sleep_score', label: 'Sleep Score', unit: '', icon: '🌙', good: v => v >= 80, warn: v => v < 60 },
  { key: 'steps', label: 'Steps', unit: '', icon: '👟', good: v => v >= 10000, warn: v => v < 5000, fmt: v => v?.toLocaleString() },
  { key: 'calories_total', label: 'Calories', unit: 'kcal', icon: '🔥', good: () => false, warn: () => false, fmt: v => v?.toLocaleString() },
  { key: 'active_min', label: 'Active Min', unit: 'min', icon: '🏃', good: v => v >= 30, warn: v => v < 15 },
  { key: 'spo2_avg', label: 'SpO₂', unit: '%', icon: '🫁', good: v => v >= 97, warn: v => v < 95 },
  { key: 'distance_m', label: 'Distance', unit: 'km', icon: '📍', good: () => false, warn: () => false, fmt: v => (v/1000).toFixed(1) },
];

const CHART_METRICS = [
  { key: 'hr_avg', label: 'Avg HR', color: '#ff6b6b', unit: 'bpm' },
  { key: 'resting_hr', label: 'Resting HR', color: '#f06595', unit: 'bpm' },
  { key: 'hrv_ms', label: 'HRV', color: '#cc5de8', unit: 'ms' },
  { key: 'steps', label: 'Steps', color: '#4ade80', unit: '' },
  { key: 'sleep_duration_s', label: 'Sleep', color: '#339af0', unit: 'h', transform: v => v ? (v/3600).toFixed(1) : null },
];

const COLORS = { apple: '#ff6b6b', garmin: '#4ecdc4', whoop: '#ffe66d', fitbit: '#45b7d1' };

function MetricCard({ def, value, device }) {
  if (value == null) return null;
  const color = def.good(value) ? '#4ade80' : def.warn(value) ? '#ef4444' : '#fbbf24';
  const display = def.fmt ? def.fmt(value) : value;
  return (
    <div className={styles.metricCard}>
      <div className={styles.metricIcon}>{def.icon}</div>
      <div className={styles.metricLabel}>{def.label}</div>
      <div className={styles.metricValue} style={{ color }}>{display}<span className={styles.unit}>{def.unit}</span></div>
      <div className={styles.deviceTag} style={{ background: COLORS[device] || '#666' }}>{device}</div>
    </div>
  );
}

function formatDate(date) {
  return date.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function dateStr(date) {
  return date.toISOString().slice(0, 10);
}

function AveragesTable({ averages }) {
  if (!averages) return null;
  
  const metrics = [
    { key: 'hr_avg', label: 'Avg HR', unit: 'bpm' },
    { key: 'resting_hr', label: 'Resting HR', unit: 'bpm' },
    { key: 'hrv_ms', label: 'HRV', unit: 'ms' },
    { key: 'sleep_duration_s', label: 'Sleep', unit: 'h', fmt: v => (v/3600).toFixed(1) },
    { key: 'steps', label: 'Steps', unit: '', fmt: v => Math.round(v).toLocaleString() },
    { key: 'calories_total', label: 'Calories', unit: 'kcal', fmt: v => Math.round(v).toLocaleString() },
    { key: 'spo2_avg', label: 'SpO₂', unit: '%' },
    { key: 'distance_m', label: 'Distance', unit: 'km', fmt: v => (v/1000).toFixed(1) },
  ];

  const format = (val, m) => {
    if (val == null) return '-';
    return m.fmt ? m.fmt(val) : val.toFixed(1);
  };

  return (
    <div className={styles.averagesSection}>
      <h2 className={styles.averagesTitle}>📊 Durchschnitte</h2>
      <div className={styles.averagesTable}>
        <div className={styles.avgHeader}>
          <div className={styles.avgMetric}>Metrik</div>
          <div className={styles.avgValue}>7 Tage</div>
          <div className={styles.avgValue}>30 Tage</div>
          <div className={styles.avgValue}>Jahr {new Date().getFullYear()}</div>
        </div>
        {metrics.map(m => (
          <div key={m.key} className={styles.avgRow}>
            <div className={styles.avgMetric}>{m.label}</div>
            <div className={styles.avgValue}>{format(averages.week7?.[m.key], m)} {m.unit}</div>
            <div className={styles.avgValue}>{format(averages.month30?.[m.key], m)} {m.unit}</div>
            <div className={styles.avgValue}>{format(averages.year?.[m.key], m)} {m.unit}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendCharts({ data, selectedMetric, onSelectMetric }) {
  if (!data || data.length === 0) return null;

  const metric = CHART_METRICS.find(m => m.key === selectedMetric) || CHART_METRICS[0];
  
  const chartData = data.map(row => ({
    date: row.date.slice(5), // MM-DD
    value: metric.transform ? parseFloat(metric.transform(row[metric.key])) : row[metric.key],
  })).filter(d => d.value != null);

  return (
    <div className={styles.chartsSection}>
      <div className={styles.chartHeader}>
        <h2 className={styles.chartTitle}>📈 Trends (30 Tage)</h2>
        <div className={styles.chartTabs}>
          {CHART_METRICS.map(m => (
            <button 
              key={m.key} 
              className={`${styles.chartTab} ${selectedMetric === m.key ? styles.active : ''}`}
              style={{ '--tab-color': m.color }}
              onClick={() => onSelectMetric(m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="date" stroke="#666" fontSize={12} />
            <YAxis stroke="#666" fontSize={12} domain={['auto', 'auto']} />
            <Tooltip 
              contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }}
              labelStyle={{ color: '#888' }}
              itemStyle={{ color: metric.color }}
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={metric.color} 
              strokeWidth={2}
              dot={{ fill: metric.color, r: 3 }}
              activeDot={{ r: 5 }}
              name={`${metric.label} ${metric.unit}`}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [lastSync, setLastSync] = useState(null);
  const [loading, setLoading] = useState(true);
  const [averages, setAverages] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState('hr_avg');

  useEffect(() => { loadData(); }, [currentDate]);
  useEffect(() => { loadAverages(); loadTrends(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const date = dateStr(currentDate);
      const [metrics, devices] = await Promise.all([
        fetch(`/api/metrics?date=${date}`).then(r => r.json()),
        fetch('/api/devices').then(r => r.json()).catch(() => [])
      ]);
      setData(metrics);
      const apple = devices.find(d => d.provider === 'apple');
      if (apple?.last_sync) setLastSync(apple.last_sync);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function loadAverages() {
    try {
      const res = await fetch('/api/metrics/averages');
      setAverages(await res.json());
    } catch (e) { console.error(e); }
  }

  async function loadTrends() {
    try {
      const to = new Date().toISOString().slice(0, 10);
      const from = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      const res = await fetch(`/api/metrics/range?from=${from}&to=${to}`);
      const rows = await res.json();
      setTrendData(rows.sort((a, b) => a.date.localeCompare(b.date)));
    } catch (e) { console.error(e); }
  }

  function prevDay() { setCurrentDate(new Date(currentDate.getTime() - 86400000)); }
  function nextDay() {
    const tomorrow = new Date(currentDate.getTime() + 86400000);
    if (tomorrow <= new Date()) setCurrentDate(tomorrow);
  }
  function goToday() { setCurrentDate(new Date()); }

  const isToday = dateStr(currentDate) === dateStr(new Date());
  const row = data[0] || {};

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.dateNav}>
          <button onClick={prevDay} className={styles.navBtn}>◀</button>
          <div className={styles.dateInfo}>
            <h1 className={styles.title}>Dashboard</h1>
            <p className={styles.date}>{formatDate(currentDate)}</p>
          </div>
          <button onClick={nextDay} className={styles.navBtn} disabled={isToday}>▶</button>
          {!isToday && <button onClick={goToday} className={styles.todayBtn}>Heute</button>}
        </div>
        {lastSync && <p className={styles.sync}>Zuletzt aktualisiert: {new Date(lastSync).toLocaleString('de-DE')}</p>}
      </div>
      
      {loading ? <p>Laden...</p> : data.length === 0 ? (
        <p className={styles.empty}>Keine Daten für diesen Tag. <a href="/import">Daten importieren →</a></p>
      ) : (
        <div className={styles.grid}>
          {METRIC_DEFS.map(def => <MetricCard key={def.key} def={def} value={row[def.key]} device={row.device} />)}
        </div>
      )}
      
      <TrendCharts data={trendData} selectedMetric={selectedMetric} onSelectMetric={setSelectedMetric} />
      <AveragesTable averages={averages} />
    </div>
  );
}
