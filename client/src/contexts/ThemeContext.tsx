import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Theme = 'light' | 'dark';
const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void } | null>(null);

function initialTheme(): Theme {
  const saved = localStorage.getItem('ape-kade-theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem('ape-kade-theme', theme);
  }, [theme]);
  return <ThemeContext.Provider value={{
    theme,
    toggleTheme: () => setTheme(value => value === 'dark' ? 'light' : 'dark'),
  }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
}
