import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

type ThemeContextValue = { theme: 'dark' | 'light'; toggle: () => void };

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'dark' | 'light'>(
    () => (localStorage.getItem('theme') ?? 'dark') as 'dark' | 'light',
  );

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('light', theme === 'light');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue | null {
  return useContext(ThemeContext);
}
