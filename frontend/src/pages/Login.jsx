import React, { useState, useEffect } from 'react';
import styles from './Login.module.css';

export default function Login({ onLogin, onCreateNew }) {
  const [profiles, setProfiles] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/profiles')
      .then(r => r.json())
      .then(data => {
        setProfiles(data);
        if (data.length === 1) setSelectedId(data[0].id);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleLogin = async () => {
    if (!pin) return setError('PIN eingeben');
    setError('');
    
    try {
      const res = await fetch(`/api/profiles/${selectedId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (data.valid) {
        localStorage.setItem('profile_id', selectedId);
        onLogin(selectedId);
      } else {
        setError('Falscher PIN');
        setPin('');
      }
    } catch (e) {
      setError('Verbindungsfehler');
    }
  };

  const calculateAge = (birthDate) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  if (loading) return <div className={styles.container}><div className={styles.loading}>Laden...</div></div>;

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logo}>⚡ WearSync</div>
        
        {!selectedId ? (
          <>
            <h2>Wer bist du?</h2>
            <div className={styles.profiles}>
              {profiles.map(p => (
                <button key={p.id} className={styles.profile} onClick={() => setSelectedId(p.id)}>
                  <div className={styles.avatar}>{p.name.charAt(0).toUpperCase()}</div>
                  <div className={styles.profileInfo}>
                    <div className={styles.profileName}>{p.name}</div>
                    <div className={styles.profileAge}>{calculateAge(p.birth_date)} Jahre</div>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={onCreateNew} className={styles.newBtn}>+ Neues Profil</button>
          </>
        ) : (
          <>
            <div className={styles.selectedProfile}>
              <div className={styles.avatarLarge}>
                {profiles.find(p => p.id === selectedId)?.name.charAt(0).toUpperCase()}
              </div>
              <div className={styles.selectedName}>
                {profiles.find(p => p.id === selectedId)?.name}
              </div>
            </div>
            
            <div className={styles.pinInput}>
              <input
                type="password"
                placeholder="PIN eingeben"
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                className={styles.input}
                inputMode="numeric"
                maxLength={6}
                autoFocus
              />
            </div>
            
            {error && <div className={styles.error}>{error}</div>}
            
            <button onClick={handleLogin} className={styles.btn}>Anmelden</button>
            
            {profiles.length > 1 && (
              <button onClick={() => { setSelectedId(null); setPin(''); setError(''); }} className={styles.backBtn}>
                Anderes Profil
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
