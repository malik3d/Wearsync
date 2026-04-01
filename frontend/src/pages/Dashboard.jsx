import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import VitalityCore from '../components/VitalityCore';
import styles from './Dashboard.module.css';

const METRIC_DEFS = [
  { key: 'hr_avg', label: 'Avg HR', unit: 'bpm', icon: '❤️', good: v => v < 75, warn: v => v > 90 },
  { key: 'resting_hr', label: 'Resting HR', unit: 'bpm', icon: '💗', good: v => v < 60, warn: v => v > 75 },
  { key: 'hrv_ms', label: 'HRV', unit: 'ms', icon: '📈', good: v => v > 50, warn: v => v < 30 },
  { key: 'sleep_duration_s', label: 'Sleep', unit: 'h', icon: '😴', good: v => v >= 25200, warn: v => v < 21600, fmt: v => (v/3600).toFixed(1) },
  { key: 'steps', label: 'Steps', unit: '', icon: '👟', good: v => v >= 10000, warn: v => v < 5000, fmt: v => v?.toLocaleString() },
  { key: 'calories_total', label: 'Calories', unit: 'kcal', icon: '🔥', good: () => false, warn: () => false, fmt: v => v?.toLocaleString() },
  { key: 'spo2_avg', label: 'SpO₂', unit: '%', icon: '🫁', good: v => v >= 97, warn: v => v < 95 },
  { key: 'distance_m', label: 'Distance', unit: 'km', icon: '📍', good: () => false, warn: () => false, fmt: v => (v/1000).toFixed(1) },
  { key: 'weight_kg', label: 'Weight', unit: 'kg', icon: '⚖️', good: () => false, warn: () => false, fmt: v => v?.toFixed(1) },
  { key: 'fat_ratio', label: 'Body Fat', unit: '%', icon: '📊', good: v => v < 20, warn: v => v > 30 },
];

const CHART_METRICS = [
  { key: 'hr_avg', label: 'HR', color: '#ff6b6b' },
  { key: 'resting_hr', label: 'Resting', color: '#f06595' },
  { key: 'hrv_ms', label: 'HRV', color: '#cc5de8' },
  { key: 'steps', label: 'Steps', color: '#4ade80' },
  { key: 'sleep_duration_s', label: 'Sleep', color: '#339af0', transform: v => v ? +(v/3600).toFixed(1) : null },
];

function calculateFitnessLevel(averages) {
  if (!averages?.month30) return null;
  let score = 50;
  const avg = averages.month30;
  
  if (avg.resting_hr) {
    if (avg.resting_hr < 50) score += 40;
    else if (avg.resting_hr < 55) score += 35;
    else if (avg.resting_hr < 60) score += 30;
    else if (avg.resting_hr < 65) score += 20;
    else if (avg.resting_hr < 70) score += 10;
    else if (avg.resting_hr > 80) score -= 10;
  }
  
  if (avg.hrv_ms) {
    if (avg.hrv_ms > 60) score += 30;
    else if (avg.hrv_ms > 50) score += 25;
    else if (avg.hrv_ms > 40) score += 15;
    else if (avg.hrv_ms > 30) score += 5;
    else score -= 5;
  }
  
  if (avg.steps) {
    if (avg.steps > 15000) score += 20;
    else if (avg.steps > 10000) score += 15;
    else if (avg.steps > 7500) score += 10;
    else if (avg.steps > 5000) score += 5;
  }
  
  if (avg.sleep_duration_s) {
    const hours = avg.sleep_duration_s / 3600;
    if (hours >= 7 && hours <= 9) score += 10;
    else if (hours >= 6) score += 5;
  }
  
  const fitnessAge = Math.max(18, Math.min(80, 65 - (score - 50) * 0.5));
  const level = score >= 90 ? 'Elite' : score >= 75 ? 'Excellent' : score >= 60 ? 'Good' : score >= 45 ? 'Fair' : 'Needs Work';
  
  return { score: Math.round(score), fitnessAge: Math.round(fitnessAge), level };
}

function MetricCard({ def, value }) {
  if (value == null) return null;
  const color = def.good(value) ? '#4ade80' : def.warn(value) ? '#ef4444' : '#fbbf24';
  const display = def.fmt ? def.fmt(value) : value;
  
  return (
    <div className={styles.metricCard}>
      <div className={styles.metricHeader}>
        <span className={styles.metricIcon}>{def.icon}</span>
        <span className={styles.metricLabel}>{def.label}</span>
      </div>
      <div className={styles.metricValue} style={{ color }}>
        {display}
        <span className={styles.metricUnit}>{def.unit}</span>
      </div>
    </div>
  );
}

function TrendChart({ data, selectedMetric, onSelectMetric }) {
  if (!data?.length) return null;
  const metric = CHART_METRICS.find(m => m.key === selectedMetric) || CHART_METRICS[0];
  
  const chartData = data.map(row => ({
    date: row.date.slice(5),
    value: metric.transform ? metric.transform(row[metric.key]) : row[metric.key],
  })).filter(d => d.value != null);

  return (
    <div className={styles.chartSection}>
      <div className={styles.chartHeader}>
        <h3>📈 Trends</h3>
        <div className={styles.chartTabs}>
          {CHART_METRICS.map(m => (
            <button 
              key={m.key}
              className={`${styles.chartTab} ${selectedMetric === m.key ? styles.active : ''}`}
              onClick={() => onSelectMetric(m.key)}
              style={{ '--color': m.color }}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${metric.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={metric.color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={metric.color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" stroke="#444" fontSize={10} tickLine={false} axisLine={false} />
          <YAxis stroke="#444" fontSize={10} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, fontSize: 12 }} />
          <Area type="monotone" dataKey="value" stroke={metric.color} strokeWidth={2} fill={`url(#grad-${metric.key})`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function AveragesGrid({ averages }) {
  if (!averages) return null;
  const items = [
    { key: 'hr_avg', label: 'Avg HR', unit: 'bpm' },
    { key: 'resting_hr', label: 'Resting', unit: 'bpm' },
    { key: 'hrv_ms', label: 'HRV', unit: 'ms' },
    { key: 'sleep_duration_s', label: 'Sleep', unit: 'h', fmt: v => (v/3600).toFixed(1) },
    { key: 'steps', label: 'Steps', fmt: v => (v/1000).toFixed(1) + 'k' },
  ];
  const fmt = (v, m) => v == null ? '-' : (m.fmt ? m.fmt(v) : v.toFixed(0));

  return (
    <div className={styles.avgSection}>
      <h3>📊 Averages</h3>
      <div className={styles.avgGrid}>
        {items.map(m => (
          <div key={m.key} className={styles.avgItem}>
            <div className={styles.avgLabel}>{m.label}</div>
            <div className={styles.avgRow}>
              <span className={styles.avgVal}>{fmt(averages.week7?.[m.key], m)}</span>
              <span className={styles.avgPeriod}>7d</span>
            </div>
            <div className={styles.avgRow}>
              <span className={styles.avgVal}>{fmt(averages.month30?.[m.key], m)}</span>
              <span className={styles.avgPeriod}>30d</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [averages, setAverages] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState('hr_avg');
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => { loadData(); }, [currentDate]);
  useEffect(() => { loadAverages(); loadTrends(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const date = currentDate.toISOString().slice(0, 10);
      const res = await fetch(`/api/metrics?date=${date}`);
      setData(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function loadAverages() {
    try { setAverages(await (await fetch('/api/metrics/averages')).json()); } catch (e) { console.error(e); }
  }

  async function loadTrends() {
    try {
      const to = new Date().toISOString().slice(0, 10);
      const from = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      setTrendData((await (await fetch(`/api/metrics/range?from=${from}&to=${to}`)).json()).sort((a, b) => a.date.localeCompare(b.date)));
    } catch (e) { console.error(e); }
  }

  const prevDay = () => setCurrentDate(new Date(currentDate.getTime() - 86400000));
  const nextDay = () => { if (new Date(currentDate.getTime() + 86400000) <= new Date()) setCurrentDate(new Date(currentDate.getTime() + 86400000)); };
  const isToday = currentDate.toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10);
  
  const row = data[0] || {};
  const fitness = calculateFitnessLevel(averages);
  const activeMetrics = METRIC_DEFS.filter(d => row[d.key] != null);

  return (
    <div className={styles.container}>
      {/* Date Navigation */}
      <div className={styles.dateNav}>
        <button onClick={prevDay} className={styles.navBtn}>‹</button>
        <button onClick={() => setShowCalendar(!showCalendar)} className={styles.dateBtn}>
          {currentDate.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })}
        </button>
        <button onClick={nextDay} className={styles.navBtn} disabled={isToday}>›</button>
        {showCalendar && (
          <div className={styles.calendarPopup}>
            <DatePicker selected={currentDate} onChange={d => { setCurrentDate(d); setShowCalendar(false); }} maxDate={new Date()} inline />
          </div>
        )}
      </div>

      {loading ? (
        <div className={styles.loading}><div className={styles.spinner} /></div>
      ) : data.length === 0 ? (
        <div className={styles.empty}>Keine Daten für diesen Tag.<br/><a href="/import">Daten importieren →</a></div>
      ) : (
        <>
          {/* Hero: Vitality Core */}
          {fitness && (
            <div className={styles.hero}>
              <VitalityCore score={fitness.score} fitnessAge={fitness.fitnessAge} level={fitness.level} />
            </div>
          )}

          {/* Metrics Grid */}
          <div className={styles.metricsGrid}>
            {activeMetrics.map(def => <MetricCard key={def.key} def={def} value={row[def.key]} />)}
          </div>

          {/* Bottom: Charts & Averages */}
          <div className={styles.bottomGrid}>
            <TrendChart data={trendData} selectedMetric={selectedMetric} onSelectMetric={setSelectedMetric} />
            <AveragesGrid averages={averages} />
          </div>
        </>
      )}

      <a href="https://buymeacoffee.com/malik3d" target="_blank" rel="noopener noreferrer" className={styles.coffeeBtn}>
        ☕ Support
      </a>
    </div>
  );
}
