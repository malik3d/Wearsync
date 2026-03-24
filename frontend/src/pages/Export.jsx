import React, { useState } from 'react';
import { format, subDays } from 'date-fns';
import styles from './Export.module.css';

export default function Export() {
  const [from, setFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [to, setTo]     = useState(format(new Date(), 'yyyy-MM-dd'));
  const [fmt, setFmt]   = useState('csv');

  function doExport() {
    const url = `/api/export/${fmt}?from=${from}&to=${to}`;
    const a   = document.createElement('a');
    a.href    = url;
    a.download = `wearsync-${from}-${to}.${fmt}`;
    a.click();
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Export</h1>
        <p className={styles.subtitle}>Download your normalized wearable data</p>
      </div>

      <div className={styles.card}>
        <div className={styles.fieldGroup}>
          <div className={styles.field}>
            <label className={styles.label}>From</label>
            <input className={styles.input} type="date" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>To</label>
            <input className={styles.input} type="date" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Format</label>
            <div className={styles.fmtPicker}>
              <button className={`${styles.fmtBtn} ${fmt==='csv' ? styles.fmtActive:''}`} onClick={()=>setFmt('csv')}>CSV</button>
              <button className={`${styles.fmtBtn} ${fmt==='json' ? styles.fmtActive:''}`} onClick={()=>setFmt('json')}>JSON</button>
            </div>
          </div>
        </div>

        <button className={styles.exportBtn} onClick={doExport}>
          ↗ Download {fmt.toUpperCase()}
        </button>
      </div>

      <div className={styles.schemaCard}>
        <div className={styles.schemaTitle}>Exported Fields</div>
        <div className={styles.schemaGrid}>
          {['device','date','hr_avg','hr_min','hr_max','hrv_ms','resting_hr','sleep_duration_s','sleep_score','sleep_deep_s','sleep_rem_s','steps','calories_total','active_min','distance_m','recovery_score','strain_score','spo2_avg','stress_avg'].map(f => (
            <span key={f} className={styles.field2}>{f}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
