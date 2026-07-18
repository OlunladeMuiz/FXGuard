'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Navbar } from '@/components/layout/Navbar/Navbar';

export function ConditionalNavbar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Dynamically toggle the dark theme class on document.body
  useEffect(() => {
    if (!mounted) return;
    const isDarkTheme = pathname === '/dashboard' || pathname === '/internal/health';
    if (isDarkTheme) {
      document.body.classList.add('theme-dark');
    } else {
      document.body.classList.remove('theme-dark');
    }
  }, [pathname, mounted]);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return null;
  }

  // Hide the layout Navbar on home page - page.tsx has its own navbar
  if (pathname === '/') {
    return null;
  }

  return <Navbar />;
}
