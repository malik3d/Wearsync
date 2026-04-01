import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { path: '/', icon: '◈', label: 'Dashboard' },
  { path: '/history', icon: '◷', label: 'History' },
  { path: '/devices', icon: '◉', label: 'Devices' },
  { path: '/import', icon: '↑', label: 'Import' },
];

export default function Sidebar({ onLogout }) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === 'true');

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', collapsed);
  }, [collapsed]);

  return (
    <nav className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.header}>
        {!collapsed && <span className={styles.logo}>⚡ WearSync</span>}
        <button onClick={() => setCollapsed(!collapsed)} className={styles.toggle}>
          {collapsed ? '›' : '‹'}
        </button>
      </div>
      
      <ul className={styles.nav}>
        {NAV_ITEMS.map(item => (
          <li key={item.path}>
            <NavLink to={item.path} className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>
              <span className={styles.icon}>{item.icon}</span>
              {!collapsed && <span className={styles.label}>{item.label}</span>}
            </NavLink>
          </li>
        ))}
      </ul>
      
      <div className={styles.footer}>
        <button onClick={onLogout} className={styles.logoutBtn} title="Abmelden">
          <span className={styles.icon}>⏻</span>
          {!collapsed && <span className={styles.label}>Abmelden</span>}
        </button>
        {!collapsed && <span className={styles.version}>v1.2.0</span>}
      </div>
    </nav>
  );
}
