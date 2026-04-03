import React, { useState } from 'react';
import { useTranslation } from '../i18n/useTranslation';
import styles from './Settings.module.css';

export default function Settings() {
  const { t, lang, setLanguage } = useTranslation();
  const [email, setEmail] = useState('');
  const [saved, setSaved] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);

  const handleSave = () => {
    localStorage.setItem('contact-email', email);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className={styles.container}>
      <h1>⚙️ {t('settings')}</h1>

      {/* Sprache */}
      <section className={styles.section}>
        <h2>🌐 {t('language')}</h2>
        <div className={styles.langButtons}>
          <button 
            className={`${styles.langBtn} ${lang === 'de' ? styles.active : ''}`}
            onClick={() => setLanguage('de')}
          >
            🇩🇪 {t('german')}
          </button>
          <button 
            className={`${styles.langBtn} ${lang === 'en' ? styles.active : ''}`}
            onClick={() => setLanguage('en')}
          >
            🇬🇧 {t('english')}
          </button>
        </div>
      </section>

      {/* Themes */}
      <section className={styles.section}>
        <h2>🎨 {t('design')}</h2>
        <button className={styles.themeBtn} onClick={() => setShowComingSoon(true)}>
          {t('themes')}
        </button>
      </section>

      {/* Profil */}
      <section className={styles.section}>
        <h2>👤 {t('profile')}</h2>
        <div className={styles.formGroup}>
          <label>{t('emailNotifications')}</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" />
        </div>
        <button className={styles.saveBtn} onClick={handleSave}>
          {saved ? '✓' : t('save')}
        </button>
      </section>

      {/* Daten */}
      <section className={styles.section}>
        <h2>💾 {t('data')}</h2>
        <div className={styles.dataInfo}>
          <p>{t('dataInfo1')}</p>
          <p>{t('dataInfo2')}</p>
        </div>
        <a href="/api/export/json" className={styles.actionBtn}>📤 {t('exportData')}</a>
      </section>

      {/* Über */}
      <section className={styles.section}>
        <h2>ℹ️ {t('about')}</h2>
        <div className={styles.about}>
          <p><strong>{t('version')}:</strong> 1.5.0</p>
          <p><strong>GitHub:</strong> <a href="https://github.com/malik3d/Wearsync" target="_blank" rel="noreferrer">malik3d/Wearsync</a></p>
          <p className={styles.disclaimer}>{t('disclaimerText1')} {t('disclaimerText2')}</p>
        </div>
      </section>

      {showComingSoon && (
        <div className={styles.modal} onClick={() => setShowComingSoon(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <span className={styles.modalIcon}>🎨</span>
            <h2>{t('comingSoon')}</h2>
            <p>Themes coming in a future update.</p>
            <button className={styles.closeBtn} onClick={() => setShowComingSoon(false)}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}
