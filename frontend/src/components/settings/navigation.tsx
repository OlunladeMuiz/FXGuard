import type { ReactNode } from 'react';

import { SettingsSection } from '@/types/settings';

export interface SettingsNavItem {
  section: SettingsSection;
  label: string;
  icon: ReactNode;
}

export const SETTINGS_NAV_ITEMS: SettingsNavItem[] = [
  {
    section: 'profile',
    label: 'Profile & Security',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M19 21a7 7 0 0 0-14 0" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    section: 'business',
    label: 'Business Details',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 21h18" />
        <path d="M5 21V7l8-4 6 4v14" />
        <path d="M9 9v.01" />
        <path d="M9 12v.01" />
        <path d="M9 15v.01" />
        <path d="M13 9v.01" />
        <path d="M13 12v.01" />
        <path d="M13 15v.01" />
      </svg>
    ),
  },
  {
    section: 'bank',
    label: 'Bank Details',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 10h18" />
        <path d="M5 10V7l7-4 7 4v3" />
        <path d="M4 21h16" />
        <path d="M7 10v11" />
        <path d="M12 10v11" />
        <path d="M17 10v11" />
      </svg>
    ),
  },
  {
    section: 'notifications',
    label: 'Notifications',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
  {
    section: 'integrations',
    label: 'Integrations',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22v-5" />
        <path d="M9 8V2" />
        <path d="M15 8V2" />
        <path d="M7 8h10" />
        <path d="M7 8v4a5 5 0 0 0 10 0V8" />
      </svg>
    ),
  },
];
