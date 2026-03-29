import React, { useState, useRef } from 'react';

export default function Import() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const appleRef = useRef();
  const garminRef = useRef();

  const handleUpload = async (file, endpoint, type) => {
    if (!file) return;
    setLoading(true);
    setStatus(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(endpoint, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        setStatus({ type: 'success', message: `✅ ${data.imported} Tage von ${type} importiert!` });
      } else {
        setStatus({ type: 'error', message: `❌ ${data.error}` });
      }
    } catch (err) {
      setStatus({ type: 'error', message: `❌ ${err.message}` });
    }
    setLoading(false);
  };

  const boxStyle = {
    border: '2px dashed #444',
    borderRadius: '12px',
    padding: '2rem',
    textAlign: 'center',
    cursor: 'pointer',
    background: '#1a1a1a',
    marginBottom: '1rem'
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ color: '#fff', marginBottom: '2rem' }}>📥 Daten Import</h1>

      {loading && <p style={{ color: '#4ade80' }}>⏳ Importiere...</p>}
      
      {status && (
        <div style={{
          padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem',
          background: status.type === 'success' ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)',
          color: status.type === 'success' ? '#4ade80' : '#ef4444'
        }}>{status.message}</div>
      )}

      <div style={boxStyle} onClick={() => appleRef.current.click()}>
        <input ref={appleRef} type="file" accept=".xml" style={{ display: 'none' }}
          onChange={(e) => handleUpload(e.target.files[0], '/api/import/apple-health-xml', 'Apple Health')} />
        <div style={{ fontSize: '2.5rem' }}>🍎</div>
        <h3 style={{ color: '#fff' }}>Apple Health</h3>
        <p style={{ color: '#888' }}>export.xml hochladen</p>
      </div>

      <div style={boxStyle} onClick={() => garminRef.current.click()}>
        <input ref={garminRef} type="file" accept=".zip" style={{ display: 'none' }}
          onChange={(e) => handleUpload(e.target.files[0], '/api/import/garmin-zip', 'Garmin')} />
        <div style={{ fontSize: '2.5rem' }}>⌚</div>
        <h3 style={{ color: '#fff' }}>Garmin Connect</h3>
        <p style={{ color: '#888' }}>Export ZIP hochladen</p>
      </div>

      <div style={{ marginTop: '2rem', padding: '1rem', background: '#111', borderRadius: '8px' }}>
        <h3 style={{ color: '#fff' }}>📋 Anleitung</h3>
        <p style={{ color: '#aaa', marginTop: '0.5rem' }}><strong>Apple:</strong> Health App → Profil → Alle Daten exportieren → ZIP entpacken → export.xml hochladen</p>
        <p style={{ color: '#aaa', marginTop: '0.5rem' }}><strong>Garmin:</strong> connect.garmin.com → Einstellungen → Daten exportieren → ZIP hier hochladen</p>
      </div>
    </div>
  );
}
