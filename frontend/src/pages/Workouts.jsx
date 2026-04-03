import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './Workouts.module.css';

const TYPES = [
  { value: 'all', label: 'Alle' },
  { value: 'running', label: 'Laufen' },
  { value: 'cycling', label: 'Radfahren' },
  { value: 'walking', label: 'Gehen' },
  { value: 'swimming', label: 'Schwimmen' },
  { value: 'strength', label: 'Kraft' },
];
const YEARS = ['all', '2026', '2025', '2024', '2023'];

export default function Workouts() {
  const [workouts, setWorkouts] = useState([]);
  const [stats, setStats] = useState(null);
  const [type, setType] = useState('all');
  const [year, setYear] = useState('all');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const perPage = 50;

  useEffect(() => { loadWorkouts(true); }, [type, year]);

  async function loadWorkouts(reset = false) {
    setLoading(true);
    const p = reset ? 0 : page;
    try {
      let url = `/api/workouts?limit=${perPage}&offset=${p * perPage}`;
      if (type !== 'all') url += `&type=${type}`;
      if (year !== 'all') url += `&year=${year}`;
      
      const res = await fetch(url);
      const data = await res.json();
      
      if (reset) {
        setWorkouts(data.workouts || []);
        setPage(0);
      } else {
        setWorkouts(prev => [...prev, ...(data.workouts || [])]);
      }
      setHasMore((data.workouts || []).length === perPage);
      if (data.stats) setStats(data.stats);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  function loadMore() {
    const nextPage = page + 1;
    setPage(nextPage);
    setTimeout(() => loadWorkouts(false), 0);
  }

  const fmtDuration = (s) => {
    if (!s) return '-';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const fmtDistance = (m, workoutType) => {
    if (!m) return '';
    // Schwimmen in Metern anzeigen
    if (workoutType === 'swimming') {
      return `${Math.round(m)} m`;
    }
    return `${(m / 1000).toFixed(1)} km`;
  };

  const getIcon = (t) => {
    const type = (t || '').toLowerCase();
    if (type.includes('run')) return '🏃';
    if (type.includes('cycl') || type.includes('bike')) return '🚴';
    if (type.includes('swim')) return '🏊';
    if (type.includes('walk')) return '🚶';
    if (type.includes('strength') || type.includes('weight')) return '💪';
    return '🏋️';
  };

  return (
    <div className={styles.container}>
      <h1>🏋️ Workouts</h1>

      {stats && (
        <div className={styles.statsRow}>
          <div className={styles.statBox}><span className={styles.statVal}>{stats.total}</span><span className={styles.statLabel}>Gesamt</span></div>
          <div className={styles.statBox}><span className={styles.statVal}>{fmtDuration(stats.total_duration)}</span><span className={styles.statLabel}>Trainingszeit</span></div>
          <div className={styles.statBox}><span className={styles.statVal}>{((stats.total_distance || 0) / 1000).toFixed(0)} km</span><span className={styles.statLabel}>Distanz</span></div>
          <div className={styles.statBox}><span className={styles.statVal}>{(stats.total_calories || 0).toLocaleString()}</span><span className={styles.statLabel}>Kalorien</span></div>
        </div>
      )}

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <span>Zeitraum:</span>
          {YEARS.map(y => (
            <button key={y} className={year === y ? styles.active : ''} onClick={() => setYear(y)}>
              {y === 'all' ? 'Alle' : y}
            </button>
          ))}
        </div>
        <div className={styles.filterGroup}>
          <span>Aktivität:</span>
          {TYPES.map(t => (
            <button key={t.value} className={type === t.value ? styles.active : ''} onClick={() => setType(t.value)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.list}>
        {workouts.map(w => (
          <Link key={w.id} to={`/workouts/${w.id}`} className={styles.workoutCard}>
            <div className={styles.workoutIcon}>{getIcon(w.type)}</div>
            <div className={styles.workoutMain}>
              <div className={styles.workoutTitle}>{w.name || w.type || 'Workout'}</div>
              <div className={styles.workoutMeta}>
                {new Date(w.date).toLocaleDateString('de-DE')} • {fmtDuration(w.duration_s)}
                {w.distance_m ? ` • ${fmtDistance(w.distance_m, w.type)}` : ''}
              </div>
            </div>
            <div className={styles.workoutStats}>
              {w.hr_avg && <span>❤️ {w.hr_avg}</span>}
              {w.calories && <span>🔥 {w.calories}</span>}
              {w.route_gpx ? <span>🗺️</span> : null}
            </div>
          </Link>
        ))}
      </div>

      {hasMore && (
        <button className={styles.loadMore} onClick={loadMore} disabled={loading}>
          {loading ? 'Lädt...' : 'Mehr laden'}
        </button>
      )}

      {workouts.length === 0 && !loading && (
        <div className={styles.empty}>Keine Workouts gefunden</div>
      )}
    </div>
  );
}
