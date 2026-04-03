import { useState, useEffect } from 'react';
import { translations, getLanguage, setLanguage } from './translations';

export function useTranslation() {
  const [lang, setLang] = useState(getLanguage());
  
  useEffect(() => {
    const handler = () => setLang(getLanguage());
    window.addEventListener('languagechange', handler);
    return () => window.removeEventListener('languagechange', handler);
  }, []);
  
  const t = (key) => translations[lang]?.[key] || translations['de'][key] || key;
  
  return { t, lang, setLanguage };
}
