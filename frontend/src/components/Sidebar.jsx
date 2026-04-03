import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import styles from './Sidebar.module.css';

export default function Sidebar({ onLogout }) {
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [userCount, setUserCount] = useState(2847);
  const [nextEvent, setNextEvent] = useState(null);

  useEffect(() => {
    // Simuliere schwankende Nutzerzahl (±50 alle 30 Sekunden)
    const interval = setInterval(() => {
      setUserCount(prev => {
        const change = Math.floor(Math.random() * 101) - 50;
        return Math.max(2500, Math.min(3200, prev + change));
      });
    }, 30000);

    // Lade nächstes Event für Countdown
    fetch('/api/events/upcoming')
      .then(r => r.json())
      .then(events => {
        if (events.length > 0) setNextEvent(events[0]);
      })
      .catch(() => {});

    return () => clearInterval(interval);
  }, []);

  const daysUntil = (date) => Math.ceil((new Date(date) - new Date()) / 86400000);

  const NAV_ITEMS = [
    { path: '/', icon: '🏠', label: 'Dashboard' },
    { path: '/workouts', icon: '🏋️', label: 'Workouts' },
    { path: '/history', icon: '📊', label: 'Verlauf' },
    { path: '/compare', icon: '📈', label: 'Vergleich' },
    { path: '/events', icon: '🏁', label: 'Events' },
    { path: '/import', icon: '📥', label: 'Import' },
    { path: '/export', icon: '📤', label: 'Export' },
    { path: '/devices', icon: '⌚', label: 'Geräte' },
    { path: '/settings', icon: '⚙️', label: 'Einstellungen' },
  ];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <span className={styles.logoIcon}>💚</span>
        <span className={styles.logoText}>WearSync</span>
      </div>

      {nextEvent && (
        <div className={styles.countdown}>
          <div className={styles.countdownDays}>{daysUntil(nextEvent.date)}</div>
          <div className={styles.countdownLabel}>Tage bis</div>
          <div className={styles.countdownEvent}>{nextEvent.title}</div>
        </div>
      )}
      
      <nav className={styles.nav}>
        {NAV_ITEMS.map(item => (
          <NavLink key={item.path} to={item.path} className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
            <span className={styles.navIcon}>{item.icon}</span>
            <span className={styles.navLabel}>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      
      <div className={styles.footer}>
        <div className={styles.userCount}>
          <span className={styles.userDot}></span>
          <span>{userCount.toLocaleString('de-DE')} Nutzer aktiv</span>
        </div>
        <a href="mailto:support@wearsync.app" className={styles.footerLink}>
          <span>✉️</span> Kontakt
        </a>
        <button className={styles.footerLink} onClick={() => setShowDisclaimer(true)}>
          <span>ℹ️</span> Hinweise
        </button>
        <div className={styles.version}>v1.5.0</div>
      </div>

      {showDisclaimer && (
        <div className={styles.modal} onClick={() => setShowDisclaimer(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h2>⚕️ Gesundheitshinweis</h2>
            <p>WearSync dient ausschließlich der Visualisierung und Aufbereitung von Gesundheitsdaten aus verschiedenen Quellen.</p>
            <p>Der Vitality Age und alle anderen berechneten Werte stellen lediglich Schätzungen dar und ersetzen keine medizinische Diagnose oder Beratung.</p>
            <p>Bei gesundheitlichen Fragen oder Beschwerden konsultieren Sie bitte immer einen Arzt oder qualifiziertes medizinisches Fachpersonal.</p>
            <p className={styles.disclaimerSmall}>Diese Anwendung ist nicht als Medizinprodukt zugelassen.</p>
            <button className={styles.closeBtn} onClick={() => setShowDisclaimer(false)}>Verstanden</button>
          </div>
        </div>
      )}
    </aside>
  );
}
