'use client';

import React from 'react';
import styles from './Navbar.module.css';

/**
 * Navbar Component
 * Main navigation header for the application
 */
export const Navbar: React.FC = () => {
  return (
    <header className={styles.navbar}>
      <div className={styles.navbarContent}>
        <div className={styles.navbarBrand}>
          <a href="/" className={styles.logo}>
            <span className={styles.logoIcon}>FX</span>
            <span className={styles.logoText}>Nexus</span>
          </a>
        </div>

        <nav className={styles.navbarMenu}>
          <a href="/dashboard" className={styles.navLink}>
            Dashboard
          </a>
          <a href="/wallet" className={styles.navLink}>
            Wallet
          </a>
        </nav>

        <div className={styles.navbarActions}>
          <button className={styles.notificationBtn} aria-label="Notifications">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>
          <div className={styles.userAvatar}>
            <span className={styles.avatarText}>U</span>
          </div>
        </div>
      </div>
    </header>
  );
};
