/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useEffect,
  type ReactNode,
} from 'react';

/**
 * React Concept Explanation  
 *
 * The application is locked to Light Mode (`'light'`).
 * `useEffect` guarantees that the `dark` class is always removed from `<html>`
 * (`document.documentElement`) and `localStorage` is synchronized to `'light'`.
 */

export type ThemeMode = 'light';

interface ThemeContextValue {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const THEME_STORAGE_KEY = 'fuel_wallet_theme';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme: ThemeMode = 'light';

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark');
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
  }, []);

  const toggleTheme = () => {
    // Dark mode is disabled; always remain in light mode.
  };

  const setTheme = () => {
    // Dark mode is disabled; always remain in light mode.
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a <ThemeProvider>');
  }
  return context;
}
