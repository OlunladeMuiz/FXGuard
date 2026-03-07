'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar/Sidebar';

// Pages that should NOT show sidebar
const noSidebarPaths = ['/', '/login', '/signup', '/verify-otp', '/currency-settings'];

export function ConditionalSidebar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return null;
  }

  // Hide sidebar on marketing, auth, and setup pages
  const shouldHide = noSidebarPaths.some(path => 
    pathname === path || pathname.startsWith('/login') || pathname.startsWith('/signup')
  );

  if (shouldHide) {
    return null;
  }

  return <Sidebar />;
}
