import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import RouteMap from '../components/RouteMap';
import styles from './WorkoutDetail.module.css';

const ICONS = { Running: '🏃', Cycling: '🚴', Swimming: '🏊', Walking: '🚶', Hiking: '🥾', Yoga: '🧘', Strength: '🏋️', Other: '🏅' };
const ZONE_COLORS = ['#3b82f6', '#22c55e', '#eab308', '#f97316', '#ef4444'];

function fmt(s) { if (!s) return '-'; const h=Math.floor(s/3600),m=Math.floor((s%3600)/60); return h>0?`${h}:${String(m).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`:`${m}:${String(s%60).padStart(2,'0')}`; }

export default function WorkoutDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [workout, setWorkout] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/workouts/${id}`).then(r => r.json()).then(d => {
      if (d.raw && typeof d.raw === 'string') try { d.raw = JSON.parse(d.raw); } catch(e) {}
      if (d.route_gpx && typeof d.route_gpx === 'string') try { d.route_gpx = JSON.parse(d.route_gpx); } catch(e) {}
      if (d.hr_zones && typeof d.hr_zones === 'string') try { d.hr_zones = JSON.parse(d.hr_zones); } catch(e) {}
      setWorkout(d); setNotes(d.notes || ''); setLoading(false);
    });
  }, [id]);

  if (loading) return <div className={styles.container}><div className={styles.spinner}/></div>;
  if (!workout) return <div className={styles.container}><p>Nicht gefunden</p></div>;

  const route = Array.isArray(workout.route_gpx) ? workout.route_gpx : null;
  const elev = workout.raw?.elevation_profile || null;
  const hrChart = workout.raw?.hr_chart || null;
  const zones = workout.hr_zones || [];

  return (
    <div className={styles.container}>
      <button className={styles.back} onClick={() => navigate('/workouts')}>← Zurück</button>
      <div className={styles.header}>
        <span className={styles.icon}>{ICONS[workout.workout_type] || '🏅'}</span>
        <div><h1>{workout.workout_type}</h1><p>{new Date(workout.date).toLocaleDateString('de-DE', {weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p></div>
      </div>
      <div className={styles.stats}>
        <div className={styles.stat}><span>⏱️</span><span>{fmt(workout.duration_s)}</span></div>
        {workout.distance_m > 0 && <div className={styles.stat}><span>📏</span><span>{(workout.distance_m/1000).toFixed(2)} km</span></div>}
        {workout.calories > 0 && <div className={styles.stat}><span>🔥</span><span>{workout.calories} kcal</span></div>}
        {workout.hr_avg > 0 && <div className={styles.stat}><span>❤️</span><span>{workout.hr_avg} bpm</span></div>}
        {workout.elevation_m > 0 && <div className={styles.stat}><span>⛰️</span><span>{Math.round(workout.elevation_m)} m</span></div>}
      </div>
      {hrChart && hrChart.length > 0 && (
        <div className={styles.chart}><h3>❤️ HR-Verlauf</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={hrChart}><defs><linearGradient id="hr" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ff6b6b" stopOpacity={0.4}/><stop offset="100%" stopColor="#ff6b6b" stopOpacity={0}/></linearGradient></defs>
              <XAxis dataKey="time" stroke="#444" fontSize={10} tickFormatter={t=>`${Math.floor(t/60)}m`}/>
              <YAxis stroke="#444" fontSize={10}/>
              <Tooltip contentStyle={{background:'#1a1a1a',border:'1px solid #333',borderRadius:8}}/>
              <Area type="monotone" dataKey="hr" stroke="#ff6b6b" fill="url(#hr)"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      {zones.length > 0 && (
        <div className={styles.chart}><h3>📊 HR-Zonen</h3>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={zones.map((m,i)=>({name:`Z${i+1}`,min:m}))} layout="vertical">
              <XAxis type="number" stroke="#444" fontSize={10}/>
              <YAxis type="category" dataKey="name" stroke="#444" fontSize={10} width={30}/>
              <Bar dataKey="min">{zones.map((_,i)=><Cell key={i} fill={ZONE_COLORS[i]}/>)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className={styles.map}><h3>🗺️ Strecke</h3>
        {route && route.length > 1 ? <RouteMap route={route} elevationProfile={elev} height={300}/> : <p className={styles.noData}>Keine GPS-Daten</p>}
      </div>
      <div className={styles.notes}><h3>📝 Notizen</h3>
        <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Notizen..."/>
        <button onClick={()=>fetch(`/api/workouts/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({notes})})}>Speichern</button>
      </div>
    </div>
  );
}
