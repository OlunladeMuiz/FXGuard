'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Calculate default based on route to minimize hydration flash on first load
  const isDarkRoute = pathname?.startsWith('/dashboard') || pathname?.startsWith('/internal/health');
  const routeDefaultTheme = isDarkRoute ? 'dark' : 'light';
  
  const [theme, setRawTheme] = useState<Theme>(routeDefaultTheme);
  const [isManualOverride, setIsManualOverride] = useState(false);

  // Mount effect: read from localStorage to hydrate user preference
  useEffect(() => {
    const storedTheme = localStorage.getItem('fxguard-theme');
    if (storedTheme === 'light' || storedTheme === 'dark') {
      setIsManualOverride(true);
      setRawTheme(storedTheme);
    }
  }, []);

  // Route-change effect: switch only if the user hasn't manually overridden it
  useEffect(() => {
    if (!isManualOverride) {
      setRawTheme(routeDefaultTheme);
    }
  }, [routeDefaultTheme, isManualOverride]);

  // Apply theme to the HTML tag as expected by globals.css
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Wrap setTheme to persist selection and lock in manual override state
  const setTheme = (newTheme: Theme) => {
    setIsManualOverride(true);
    setRawTheme(newTheme);
    localStorage.setItem('fxguard-theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme: theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
