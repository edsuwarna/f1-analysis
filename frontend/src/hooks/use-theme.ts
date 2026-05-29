import { useState, useEffect } from 'react';

export function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('f1-theme');
      if (stored === 'light' || stored === 'dark') return stored;
    }
    return 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
    localStorage.setItem('f1-theme', theme);
  }, [theme]);

  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  return { theme, toggle };
}
