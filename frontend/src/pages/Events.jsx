import React, { useState, useEffect } from 'react';
import styles from './Events.module.css';

const EVENT_TYPES = [
  { value: 'race', label: '🏃 Race', color: '#ff6b6b' },
  { value: 'marathon', label: '🏃‍♂️ Marathon', color: '#f06595' },
  { value: 'triathlon', label: '🏊 Triathlon', color: '#cc5de8' },
  { value: 'cycling', label: '🚴 Cycling', color: '#4ade80' },
  { value: 'swimming', label: '🏊‍♂️ Swimming', color: '#339af0' },
  { value: 'other', label: '📅 Other', color: '#888' },
];

export default function Events() {
  const [events, setEvents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [form, setForm] = useState({ title: '', type: 'race', date: '', location: '', target_time: '', notes: '' });

  useEffect(() => { loadEvents(); }, []);

  async function loadEvents() {
    try {
      const res = await fetch('/api/events');
      setEvents(await res.json());
    } catch (e) { console.error(e); }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const method = editingEvent ? 'PUT' : 'POST';
    const url = editingEvent ? `/api/events/${editingEvent.id}` : '/api/events';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setShowForm(false);
    setEditingEvent(null);
    setForm({ title: '', type: 'race', date: '', location: '', target_time: '', notes: '' });
    loadEvents();
  }

  async function handleDelete(id) {
    if (!confirm('Event löschen?')) return;
    await fetch(`/api/events/${id}`, { method: 'DELETE' });
    loadEvents();
  }

  function openEdit(event) {
    setForm(event);
    setEditingEvent(event);
    setShowForm(true);
  }

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const past = events.filter(e => e.date < today).sort((a, b) => b.date.localeCompare(a.date));

  const daysUntil = (date) => Math.ceil((new Date(date) - new Date()) / 86400000);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>🏁 Race Calendar</h1>
        <button className={styles.addBtn} onClick={() => { setShowForm(true); setEditingEvent(null); setForm({ title: '', type: 'race', date: '', location: '', target_time: '', notes: '' }); }}>+ Event</button>
      </div>

      {upcoming.length > 0 && (
        <section className={styles.section}>
          <h2>Anstehend</h2>
          <div className={styles.eventList}>
            {upcoming.map(ev => {
              const type = EVENT_TYPES.find(t => t.value === ev.type) || EVENT_TYPES[5];
              const days = daysUntil(ev.date);
              return (
                <div key={ev.id} className={styles.eventCard} style={{ borderLeftColor: type.color }}>
                  <div className={styles.eventMain}>
                    <div className={styles.eventType}>{type.label}</div>
                    <div className={styles.eventTitle}>{ev.title}</div>
                    <div className={styles.eventMeta}>
                      <span>📍 {ev.location || '-'}</span>
                      <span>📅 {new Date(ev.date).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      {ev.target_time && <span>🎯 {ev.target_time}</span>}
                    </div>
                  </div>
                  <div className={styles.eventRight}>
                    <div className={styles.countdown} style={{ color: type.color }}>
                      <span className={styles.countdownNum}>{days}</span>
                      <span className={styles.countdownLabel}>Tage</span>
                    </div>
                    <div className={styles.eventActions}>
                      <button onClick={() => openEdit(ev)}>✏️</button>
                      <button onClick={() => handleDelete(ev.id)}>🗑️</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {upcoming.length === 0 && (
        <div className={styles.empty}>
          <span>🏁</span>
          <p>Keine anstehenden Events</p>
          <button onClick={() => setShowForm(true)}>Event hinzufügen</button>
        </div>
      )}

      {past.length > 0 && (
        <section className={styles.section}>
          <h2>Vergangene Events</h2>
          <div className={styles.eventList}>
            {past.slice(0, 5).map(ev => {
              const type = EVENT_TYPES.find(t => t.value === ev.type) || EVENT_TYPES[5];
              return (
                <div key={ev.id} className={`${styles.eventCard} ${styles.past}`} style={{ borderLeftColor: type.color }}>
                  <div className={styles.eventMain}>
                    <div className={styles.eventTitle}>{ev.title}</div>
                    <div className={styles.eventMeta}>
                      <span>📅 {new Date(ev.date).toLocaleDateString('de-DE')}</span>
                      {ev.result_time && <span>✅ {ev.result_time}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {showForm && (
        <div className={styles.modal} onClick={() => setShowForm(false)}>
          <form className={styles.form} onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
            <h2>{editingEvent ? 'Event bearbeiten' : 'Neues Event'}</h2>
            <input placeholder="Titel" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
            <input placeholder="Ort" value={form.location || ''} onChange={e => setForm({ ...form, location: e.target.value })} />
            <input placeholder="Zielzeit (z.B. 3:30:00)" value={form.target_time || ''} onChange={e => setForm({ ...form, target_time: e.target.value })} />
            <div className={styles.formActions}>
              <button type="button" onClick={() => setShowForm(false)}>Abbrechen</button>
              <button type="submit" className={styles.primary}>{editingEvent ? 'Speichern' : 'Erstellen'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
