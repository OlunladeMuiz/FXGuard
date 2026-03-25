'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/fx-analytics',
  '/invoice-generator',
  '/settings',
  '/transactions',
  '/wallet',
] as const;

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

interface ProtectedRouteGateProps {
  children: React.ReactNode;
}

export function ProtectedRouteGate({ children }: ProtectedRouteGateProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(() => !isProtectedPath(pathname));

  useEffect(() => {
    if (!isProtectedPath(pathname)) {
      setIsAuthorized(true);
      return;
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
      setIsAuthorized(false);
      router.replace('/login');
      return;
    }

    setIsAuthorized(true);
  }, [pathname, router]);

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
