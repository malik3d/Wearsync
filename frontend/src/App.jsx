import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import Devices from './pages/Devices';
import Import from './pages/Import';
import Setup from './pages/Setup';
import Login from './pages/Login';
import './App.css';

function AppContent() {
  const [authState, setAuthState] = useState('loading'); // loading, setup, login, authenticated
  const [profileId, setProfileId] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      // Check if profiles exist
      const res = await fetch('/api/profiles/exists');
      const { exists } = await res.json();
      
      if (!exists) {
        setAuthState('setup');
        return;
      }

      // Check if already logged in
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
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard profileId={profileId} />} />
          <Route path="/history" element={<History />} />
          <Route path="/devices" element={<Devices />} />
          <Route path="/import" element={<Import />} />
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
