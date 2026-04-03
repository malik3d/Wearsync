import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import Devices from './pages/Devices';
import Import from './pages/Import';
import Export from './pages/Export';
import Compare from './pages/Compare';
import Workouts from './pages/Workouts';
import WorkoutDetail from './pages/WorkoutDetail';
import Settings from './pages/Settings';
import Events from './pages/Events';
import Setup from './pages/Setup';
import Login from './pages/Login';
import './index.css';

function AppContent() {
  const [authState, setAuthState] = useState('loading');
  const [profileId, setProfileId] = useState(null);

  useEffect(() => {
    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'wearsync-pro';
    document.documentElement.setAttribute('data-theme', savedTheme);
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const res = await fetch('/api/profiles/exists');
      const { exists } = await res.json();
      
      if (!exists) {
        setAuthState('setup');
        return;
      }
      const savedId = localStorage.getItem('profile_id');
      if (savedId) {
        setProfileId(parseInt(savedId));
        setAuthState('authenticated');
      } else {
        setAuthState('login');
      }
    } catch (e) {
      console.error(e);
      setAuthState('login');
    }
  }

  function handleSetupComplete(id) {
    setProfileId(id);
    setAuthState('authenticated');
  }

  function handleLogin(id) {
    setProfileId(id);
    setAuthState('authenticated');
  }

  function handleLogout() {
    localStorage.removeItem('profile_id');
    setProfileId(null);
    setAuthState('login');
  }

  if (authState === 'loading') {
    return <div className="loading-screen"><div className="spinner" /></div>;
  }

  if (authState === 'setup') {
    return <Setup onComplete={handleSetupComplete} />;
  }

  if (authState === 'login') {
    return <Login onLogin={handleLogin} onCreateNew={() => setAuthState('setup')} />;
  }

  return (
    <div className="app-layout">
      <Sidebar onLogout={handleLogout} />
      <main className="app-content">
        <Routes>
          <Route path="/" element={<Dashboard profileId={profileId} />} />
          <Route path="/workouts" element={<Workouts />} />
          <Route path="/workouts/:id" element={<WorkoutDetail />} />
          <Route path="/history" element={<History />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/import" element={<Import />} />
          <Route path="/export" element={<Export />} />
          <Route path="/devices" element={<Devices />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/events" element={<Events />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
