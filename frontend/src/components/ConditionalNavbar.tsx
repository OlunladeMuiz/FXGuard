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
