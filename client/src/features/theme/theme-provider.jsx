import { useEffect, useState } from 'react';
import { ThemeProviderContext } from './theme-provider-context';

export function ThemeProvider({
  children,
  defaultTheme = 'device',
  storageKey = 'dex-token-exchange-theme',
  ...props
}) {
  const [theme, setTheme] = useState(localStorage[storageKey] ?? defaultTheme);

  useEffect(() => {
    const html = window.document.documentElement;
    html.classList.remove('light', 'dark');

    if (theme === 'device') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light';

      html.classList.add(systemTheme);
      return;
    }

    html.classList.add(theme);
  }, [theme]);

  const value = {
    theme,
    setTheme: (theme) => {
      localStorage[storageKey] = theme;
      setTheme(theme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}
