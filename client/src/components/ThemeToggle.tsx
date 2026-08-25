import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === 'dark';
  return <button
    type="button"
    className="btn-secondary"
    onClick={toggleTheme}
    title={dark ? 'Use light mode' : 'Use dark mode'}
    aria-label={dark ? 'Use light mode' : 'Use dark mode'}
  >
    {dark ? <Sun size={18} /> : <Moon size={18} />}
    {!compact && <span className="hidden sm:inline">{dark ? 'Light' : 'Dark'}</span>}
  </button>;
}
