/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  translations,
  type Language,
} from '../../locales/translations.js';

/**
 * Localization & RTL/LTR Direction Provider.
 *
 * Manages the active language (`'ar'` with RTL direction or `'en'` with LTR direction),
 * persists the user's preference in `localStorage`, and updates the `<html lang="..." dir="...">`
 * attributes so CSS logical properties and flexbox layouts automatically mirror between RTL and LTR.
 */

type Dictionary = (typeof translations)[Language];

interface LanguageContextValue {
  lang: Language;
  dir: 'rtl' | 'ltr';
  isRtl: boolean;
  t: Dictionary;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
}

const LANG_STORAGE_KEY = 'fuel_wallet_lang';

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined,
);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'ar' || saved === 'en') {
      return saved;
    }
    return 'ar';
  });

  const dir: 'rtl' | 'ltr' = lang === 'ar' ? 'rtl' : 'ltr';
  const isRtl = dir === 'rtl';

  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = dir;
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  }, [lang, dir]);

  const toggleLang = () => {
    setLang((prev) => (prev === 'ar' ? 'en' : 'ar'));
  };

  return (
    <LanguageContext.Provider
      value={{
        lang,
        dir,
        isRtl,
        t: translations[lang],
        setLang,
        toggleLang,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a <LanguageProvider>');
  }
  return context;
}
