'use client';

import React from 'react';
import styles from './Sidebar.module.css';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
}

interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const navItems: SidebarItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="9" />
        <rect x="14" y="3" width="7" height="5" />
        <rect x="14" y="12" width="7" height="9" />
        <rect x="3" y="16" width="7" height="5" />
      </svg>
    ),
  },
  {
    id: 'wallet',
    label: 'Wallet',
    href: '/wallet',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 4H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
        <path d="M17 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
      </svg>
    ),
  },
  {
    id: 'transactions',
    label: 'Transactions',
    href: '/transactions',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="20 6 9 17 4 12" />
        <line x1="4" y1="6" x2="20" y2="6" />
        <line x1="4" y1="12" x2="9" y2="12" />
      </svg>
    ),
  },
  {
    id: 'convert',
    label: 'Convert',
    href: '/convert',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="17 1 21 5 17 9" />
        <path d="M3 11V9a4 4 0 0 1 4-4h14" />
        <polyline points="7 23 3 19 7 15" />
        <path d="M21 13v2a4 4 0 0 1-4 4H3" />
      </svg>
    ),
  },
];

/**
 * Sidebar Component
 * Navigation sidebar for the dashboard
 */
export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed = false,
  onToggleCollapse,
}) => {
  return (
    <aside className={`${styles.sidebar} ${isCollapsed ? styles['sidebar--collapsed'] : ''}`}>
      <nav className={styles.sidebarNav}>
        <ul className={styles.sidebarList}>
          {navItems.map((item) => (
            <li key={item.id} className={styles.sidebarItem}>
              <a href={item.href} className={styles.sidebarLink}>
                <span className={styles.sidebarIcon}>{item.icon}</span>
                {!isCollapsed && (
                  <span className={styles.sidebarLabel}>{item.label}</span>
                )}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className={styles.collapseBtn}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ transform: isCollapsed ? 'rotate(180deg)' : 'none' }}
          >
            <polyline points="11 17 6 12 11 7" />
            <polyline points="18 17 13 12 18 7" />
          </svg>
        </button>
      )}
    </aside>
  );
};
