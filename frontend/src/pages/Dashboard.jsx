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
  { key: 'steps', label: 'Steps', unit: '', icon: '👟', good: v => v >= 10000, warn: v => v < 5000, fmt: v => v?.toLocaleString() },
  { key: 'calories_total', label: 'Calories', unit: 'kcal', icon: '🔥', good: () => false, warn: () => false, fmt: v => v?.toLocaleString() },
  { key: 'spo2_avg', label: 'SpO₂', unit: '%', icon: '🫁', good: v => v >= 97, warn: v => v < 95 },
  { key: 'distance_m', label: 'Distance', unit: 'km', icon: '📍', good: () => false, warn: () => false, fmt: v => (v/1000).toFixed(1) },
];

const CHART_METRICS = [
  { key: 'hr_avg', label: 'HR', color: '#ff6b6b' },
  { key: 'resting_hr', label: 'Resting', color: '#f06595' },
  { key: 'hrv_ms', label: 'HRV', color: '#cc5de8' },
  { key: 'steps', label: 'Steps', color: '#4ade80' },
  { key: 'sleep_duration_s', label: 'Sleep', color: '#339af0', transform: v => v ? +(v/3600).toFixed(1) : null },
  { key: 'vo2_max', label: 'VO₂ Max', color: '#00d4ff' },
];

function calculateFitnessLevel(averages, vo2) {
  let score = 50;
  const avg = averages?.month30 || {};
  
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
  
  const vo2val = vo2?.value || avg.vo2_max;
  if (vo2val) {
    if (vo2val > 50) score += 35;
    else if (vo2val > 45) score += 25;
    else if (vo2val > 40) score += 15;
    else if (vo2val > 35) score += 5;
    else score -= 10;
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
  return { score: Math.round(score), fitnessAge: Math.round(fitnessAge) };
}

function MetricCard({ def, value }) {
  if (value == null) return null;
  const color = def.good(value) ? '#4ade80' : def.warn(value) ? '#ef4444' : '#fbbf24';
  const display = def.fmt ? def.fmt(value) : (typeof value === 'number' ? (Number.isInteger(value) ? value : value.toFixed(1)) : value);
  return (
    <div className={styles.metricCard}>
      <div className={styles.metricHeader}>
        <span className={styles.metricIcon}>{def.icon}</span>
        <span className={styles.metricLabel}>{def.label.toUpperCase()}</span>
      </div>
      <div className={styles.metricValue} style={{ color }}>{display}<span className={styles.metricUnit}>{def.unit}</span></div>
    </div>
  );
}

function Vo2Card({ vo2Info }) {
  if (!vo2Info?.value) return null;
  const val = vo2Info.value;
  const color = val > 45 ? '#4ade80' : val > 35 ? '#fbbf24' : '#ef4444';
  const daysAgo = Math.floor((Date.now() - new Date(vo2Info.date)) / 86400000);
  const label = daysAgo === 0 ? 'heute' : daysAgo === 1 ? 'gestern' : `vor ${daysAgo}d`;
  
  return (
    <div className={styles.metricCard}>
      <div className={styles.metricHeader}>
        <span className={styles.metricIcon}>🫀</span>
        <span className={styles.metricLabel}>VO₂ MAX</span>
      </div>
      <div className={styles.metricValue} style={{ color }}>{val.toFixed(1)}<span className={styles.metricUnit}>mL/kg</span></div>
      <div className={styles.metricSub}>{label}</div>
    </div>
  );
}

function TrendsChart({ history, chartMetric, setChartMetric }) {
  const cm = CHART_METRICS.find(c => c.key === chartMetric);
  const data = history.map(h => ({
    date: h.date?.slice(5) || '',
    value: cm?.transform ? cm.transform(h[chartMetric]) : h[chartMetric]
  })).filter(d => d.value != null).reverse();

  return (
    <div className={styles.trendsCard}>
      <div className={styles.trendsHeader}>
        <h3>📈 Trends</h3>
        <div className={styles.chartTabs}>
          {CHART_METRICS.map(m => (
            <button key={m.key} className={chartMetric === m.key ? styles.active : ''} onClick={() => setChartMetric(m.key)}>{m.label}</button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data}>
          <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={cm?.color} stopOpacity={0.3}/><stop offset="95%" stopOpacity={0}/></linearGradient></defs>
          <XAxis dataKey="date" stroke="#666" fontSize={11} tickLine={false} />
          <YAxis stroke="#666" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: 8 }} />
          <Area type="monotone" dataKey="value" stroke={cm?.color} fill="url(#cg)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function AveragesGrid({ averages, vo2Info }) {
  if (!averages) return null;
  const items = [
    { key: 'hr_avg', label: 'Avg HR' },
    { key: 'resting_hr', label: 'Resting' },
    { key: 'hrv_ms', label: 'HRV' },
    { key: 'sleep_duration_s', label: 'Sleep', fmt: v => (v/3600).toFixed(1) },
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
            <div className={styles.avgRow}><span className={styles.avgVal}>{fmt(averages.week7?.[m.key], m)}</span><span className={styles.avgPeriod}>7d</span></div>
            <div className={styles.avgRow}><span className={styles.avgVal}>{fmt(averages.month30?.[m.key], m)}</span><span className={styles.avgPeriod}>30d</span></div>
          </div>
        ))}
        {vo2Info?.value && (
          <div className={styles.avgItem}>
            <div className={styles.avgLabel}>VO₂ Max</div>
            <div className={styles.avgRow}><span className={styles.avgVal}>{vo2Info.value.toFixed(1)}</span><span className={styles.avgPeriod}>latest</span></div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard({ profileId }) {
  const [date, setDate] = useState(new Date());
  const [metrics, setMetrics] = useState(null);
  const [history, setHistory] = useState([]);
  const [averages, setAverages] = useState(null);
  const [vo2Info, setVo2Info] = useState(null);
  const [chartMetric, setChartMetric] = useState('hr_avg');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [date]);

  async function loadData() {
    setLoading(true);
    const dateStr = date.toISOString().slice(0, 10);
    try {
      const [mRes, hRes, aRes] = await Promise.all([
        fetch(`/api/metrics?date=${dateStr}`),
        fetch(`/api/metrics?days=30`),
        fetch(`/api/metrics/averages`)
      ]);
      const mData = await mRes.json();
      const merged = Array.isArray(mData) ? mData.reduce((acc, m) => { Object.keys(m).forEach(k => { if (m[k] != null && acc[k] == null) acc[k] = m[k]; }); return acc; }, {}) : mData;
      setMetrics(merged);
      setHistory(await hRes.json());
      const avgData = await aRes.json();
      setAverages(avgData);
      setVo2Info(avgData.vo2_max_info);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  const fitness = calculateFitnessLevel(averages, vo2Info);
  const navDate = (dir) => { const d = new Date(date); d.setDate(d.getDate() + dir); if (d <= new Date()) setDate(d); };

  if (loading && !metrics) return <div className={styles.loading}><div className={styles.spinner} /></div>;

  return (
    <div className={styles.container}>
      <div className={styles.dateNav}>
        <button onClick={() => navDate(-1)} className={styles.navBtn}>‹</button>
        <DatePicker selected={date} onChange={setDate} maxDate={new Date()} dateFormat="EEE, d. MMM" className={styles.datePicker} />
        <button onClick={() => navDate(1)} className={styles.navBtn} disabled={date.toDateString() === new Date().toDateString()}>›</button>
      </div>
      <VitalityCore score={fitness.score} fitnessAge={fitness.fitnessAge} />
      <div className={styles.metricsGrid}>
        {METRIC_DEFS.map(def => <MetricCard key={def.key} def={def} value={metrics?.[def.key]} />)}
        <Vo2Card vo2Info={vo2Info} />
      </div>
      <div className={styles.chartsRow}>
        <TrendsChart history={history} chartMetric={chartMetric} setChartMetric={setChartMetric} />
        <AveragesGrid averages={averages} vo2Info={vo2Info} />
      </div>
    </div>
  );
}
