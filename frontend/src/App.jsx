import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import History   from './pages/History.jsx';
import Compare   from './pages/Compare.jsx';
import Devices   from './pages/Devices.jsx';
import Export    from './pages/Export.jsx';
import styles    from './App.module.css';

const NAV = [
  { path: '/',        label: 'Dashboard', icon: '◈' },
  { path: '/history', label: 'History',   icon: '◷' },
  { path: '/compare', label: 'Compare',   icon: '⊞' },
  { path: '/devices', label: 'Devices',   icon: '◉' },
  { path: '/export',  label: 'Export',    icon: '↗' },
];

function Sidebar() {
  return (
    <nav className={styles.sidebar}>
      <div className={styles.logo}>
        <span className={styles.logoIcon}>⌁</span>
        <span className={styles.logoText}>WearSync</span>
      </div>
      <ul className={styles.navList}>
        {NAV.map(({ path, label, icon }) => (
          <li key={path}>
            <NavLink
              to={path}
              end={path === '/'}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <span className={styles.navIcon}>{icon}</span>
              <span className={styles.navLabel}>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
      <div className={styles.sidebarFooter}>
        <span className={styles.version}>v1.0.0 · OSS</span>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className={styles.layout}>
        <Sidebar />
        <main className={styles.main}>
          <Routes>
            <Route path="/"        element={<Dashboard />} />
            <Route path="/history" element={<History />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/devices" element={<Devices />} />
            <Route path="/export"  element={<Export />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
