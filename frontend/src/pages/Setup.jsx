import React, { useState } from 'react';
import styles from './Setup.module.css';

export default function Setup({ onComplete }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '',
    birth_date: '',
    gender: '',
    height_cm: '',
    pin: '',
    pinConfirm: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const updateForm = (key, value) => setForm({ ...form, [key]: value });

  const nextStep = () => {
    setError('');
    if (step === 1 && !form.name.trim()) return setError('Name eingeben');
    if (step === 2 && !form.birth_date) return setError('Geburtsdatum eingeben');
    if (step === 3 && !form.gender) return setError('Geschlecht auswählen');
    if (step === 4 && (!form.height_cm || form.height_cm < 100 || form.height_cm > 250)) return setError('Gültige Größe eingeben (100-250 cm)');
    if (step === 5) {
      if (form.pin.length < 4 || form.pin.length > 6 || !/^\d+$/.test(form.pin)) return setError('PIN muss 4-6 Ziffern sein');
      if (form.pin !== form.pinConfirm) return setError('PINs stimmen nicht überein');
    }
    if (step < 5) setStep(step + 1);
    else handleSubmit();
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          birth_date: form.birth_date,
          gender: form.gender,
          height_cm: parseInt(form.height_cm),
          pin: form.pin,
        }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('profile_id', data.id);
        onComplete(data.id);
      } else {
        setError(data.error || 'Fehler beim Erstellen');
      }
    } catch (e) {
      setError('Verbindungsfehler');
    }
    setLoading(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logo}>⚡ WearSync</div>
        <div className={styles.progress}>
          {[1,2,3,4,5].map(s => (
            <div key={s} className={`${styles.dot} ${s <= step ? styles.active : ''}`} />
          ))}
        </div>

        {step === 1 && (
          <div className={styles.stepContent}>
            <h2>Wie heißt du?</h2>
            <input
              type="text"
              placeholder="Name oder Nickname"
              value={form.name}
              onChange={e => updateForm('name', e.target.value)}
              className={styles.input}
              autoFocus
            />
          </div>
        )}

        {step === 2 && (
          <div className={styles.stepContent}>
            <h2>Wann bist du geboren?</h2>
            <input
              type="date"
              value={form.birth_date}
              onChange={e => updateForm('birth_date', e.target.value)}
              className={styles.input}
              max={new Date().toISOString().slice(0, 10)}
            />
          </div>
        )}

        {step === 3 && (
          <div className={styles.stepContent}>
            <h2>Geschlecht</h2>
            <div className={styles.options}>
              {[{ v: 'm', l: '♂ Männlich' }, { v: 'f', l: '♀ Weiblich' }].map(o => (
                <button
                  key={o.v}
                  className={`${styles.option} ${form.gender === o.v ? styles.selected : ''}`}
                  onClick={() => updateForm('gender', o.v)}
                >
                  {o.l}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className={styles.stepContent}>
            <h2>Wie groß bist du?</h2>
            <div className={styles.inputGroup}>
              <input
                type="number"
                placeholder="175"
                value={form.height_cm}
                onChange={e => updateForm('height_cm', e.target.value)}
                className={styles.input}
                min="100"
                max="250"
              />
              <span className={styles.unit}>cm</span>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className={styles.stepContent}>
            <h2>Sichere dein Profil</h2>
            <p className={styles.hint}>4-6 stelliger PIN</p>
            <input
              type="password"
              placeholder="PIN"
              value={form.pin}
              onChange={e => updateForm('pin', e.target.value.replace(/\D/g, '').slice(0, 6))}
              className={styles.input}
              inputMode="numeric"
              maxLength={6}
            />
            <input
              type="password"
              placeholder="PIN bestätigen"
              value={form.pinConfirm}
              onChange={e => updateForm('pinConfirm', e.target.value.replace(/\D/g, '').slice(0, 6))}
              className={styles.input}
              inputMode="numeric"
              maxLength={6}
            />
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}

        <button onClick={nextStep} className={styles.btn} disabled={loading}>
          {loading ? 'Wird erstellt...' : step === 5 ? 'Profil erstellen' : 'Weiter'}
        </button>

        {step > 1 && (
          <button onClick={() => setStep(step - 1)} className={styles.backBtn}>
            Zurück
          </button>
        )}
      </div>
    </div>
  );
}
