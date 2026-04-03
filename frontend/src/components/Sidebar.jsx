import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import styles from './Sidebar.module.css';

export default function Sidebar({ onLogout }) {
  const [showDisclaimer, setShowDisclaimer] = useState(false);

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
          <span>2.847 Nutzer aktiv</span>
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
