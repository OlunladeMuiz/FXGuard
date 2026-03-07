'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './page.module.css';
import { getUser } from '@/lib/api/auth';

const icons = {
  user: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21a7 7 0 0 0-14 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  business: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
  bank: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10h18" />
      <path d="M5 10V7l7-4 7 4v3" />
      <path d="M4 21h16" />
      <path d="M7 10v11" />
      <path d="M12 10v11" />
      <path d="M17 10v11" />
    </svg>
  ),
  bell: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  plug: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22v-5" />
      <path d="M9 8V2" />
      <path d="M15 8V2" />
      <path d="M7 8h10" />
      <path d="M7 8v4a5 5 0 0 0 10 0V8" />
    </svg>
  ),
  photo: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15V7a2 2 0 0 0-2-2h-3l-2-2H10L8 5H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  shield: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  desktop: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8" />
      <path d="M12 16v4" />
    </svg>
  ),
  phone: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <path d="M12 18h.01" />
    </svg>
  ),
} as const;

const menu = [
  { key: 'profile', label: 'Profile & Security', icon: icons.user },
  { key: 'business', label: 'Business Details', icon: icons.business },
  { key: 'bank', label: 'Bank Details', icon: icons.bank },
  { key: 'notifications', label: 'Notifications', icon: icons.bell },
  { key: 'integrations', label: 'Integrations', icon: icons.plug },
] as const;

type MenuKey = (typeof menu)[number]['key'];

function titleCase(value: string) {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function SettingsPage() {
  const [active, setActive] = useState<MenuKey>('profile');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    const userData = getUser();
    if (!userData?.email) return;

    setEmail(userData.email);
    const emailPrefix = userData.email.split('@')[0] ?? '';
    const nameParts = emailPrefix.split(/[._-]/).filter(Boolean);

    if (nameParts.length >= 2) {
      setFirstName(titleCase(nameParts[0] ?? ''));
      setLastName(titleCase(nameParts[1] ?? ''));
      return;
    }

    setFirstName(titleCase(emailPrefix));
    setLastName('');
  }, []);

  const activeLabel = useMemo(
    () => menu.find((m) => m.key === active)?.label ?? 'Settings',
    [active]
  );

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Settings</h1>
          <p>
            Manage your profile, security, business details, and platform
            preferences
          </p>
        </header>

        <div className={styles.layout}>
          <aside className={styles.sidebar} aria-label="Settings menu">
            {menu.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setActive(item.key)}
                className={`${styles.menuItem} ${
                  active === item.key ? styles.active : ''
                }`}
                aria-current={active === item.key ? 'page' : undefined}
              >
                <span className={styles.menuIcon} aria-hidden>
                  {item.icon}
                </span>
                <span className={styles.menuLabel}>{item.label}</span>
              </button>
            ))}
          </aside>

          <div className={styles.main}>
            {active === 'profile' ? (
              <>
                <section className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h3>Profile Information</h3>
                  </div>

                  <div className={styles.photoRow}>
                    <img
                      src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=96&q=80"
                      alt="Profile"
                    />
                    <div className={styles.photoMeta}>
                      <button type="button" className={styles.photoButton}>
                        {icons.photo}
                        Change Photo
                      </button>
                      <p className={styles.photoHint}>JPG, PNG up to 5MB</p>
                    </div>
                  </div>

                  <div className={styles.gridTwo}>
                    <div>
                      <label className={styles.formLabel}>First Name</label>
                      <input
                        className={styles.formInput}
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Enter first name"
                      />
                    </div>
                    <div>
                      <label className={styles.formLabel}>Last Name</label>
                      <input
                        className={styles.formInput}
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Enter last name"
                      />
                    </div>
                    <div>
                      <label className={styles.formLabel}>Email Address</label>
                      <input
                        className={styles.formInput}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        type="email"
                        placeholder="john.smith@company.com"
                      />
                    </div>
                    <div>
                      <label className={styles.formLabel}>Phone Number</label>
                      <input
                        className={styles.formInput}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                    <div className={styles.fullWidth}>
                      <label className={styles.formLabel}>Time Zone</label>
                      <select className={styles.formSelect}>
                        <option>UTC-5 (Eastern Time)</option>
                      </select>
                    </div>
                  </div>

                  <div className={styles.cardFooter}>
                    <button className={styles.save} type="button">
                      Save Changes
                    </button>
                  </div>
                </section>

                <section className={styles.card}>
                  <h3>Security Settings</h3>

                  <div className={styles.block}>
                    <div className={styles.blockTitle}>Change Password</div>
                    <div className={styles.gridTwo}>
                      <div>
                        <label className={styles.formLabel}>
                          Current Password
                        </label>
                        <input className={styles.formInput} type="password" />
                      </div>
                      <div>
                        <label className={styles.formLabel}>New Password</label>
                        <input className={styles.formInput} type="password" />
                      </div>
                    </div>
                  </div>

                  <div className={styles.divider} />

                  <div className={styles.block}>
                    <div className={styles.blockTitle}>
                      Two-Factor Authentication
                    </div>
                    <div className={styles.twoFaRow}>
                      <div className={styles.twoFaLeft}>
                        <span className={styles.twoFaIcon} aria-hidden>
                          {icons.shield}
                        </span>
                        <div>
                          <div className={styles.twoFaTitle}>2FA Enabled</div>
                          <div className={styles.twoFaSub}>
                            Using authenticator app
                          </div>
                        </div>
                      </div>
                      <button type="button" className={styles.manage}>
                        Manage
                      </button>
                    </div>
                  </div>

                  <div className={styles.divider} />

                  <div className={styles.block}>
                    <div className={styles.blockTitle}>Active Sessions</div>

                    <div className={styles.sessionItem}>
                      <div className={styles.sessionLeft}>
                        <span className={styles.sessionIcon} aria-hidden>
                          {icons.desktop}
                        </span>
                        <div>
                          <div className={styles.sessionTitle}>
                            Desktop - Chrome
                          </div>
                          <div className={styles.sessionMeta}>
                            New York, NY • Current session
                          </div>
                        </div>
                      </div>
                      <span className={styles.badge}>Active</span>
                    </div>

                    <div className={styles.sessionItem}>
                      <div className={styles.sessionLeft}>
                        <span className={styles.sessionIcon} aria-hidden>
                          {icons.phone}
                        </span>
                        <div>
                          <div className={styles.sessionTitle}>
                            iPhone - Safari
                          </div>
                          <div className={styles.sessionMeta}>
                            New York, NY • 2 hours ago
                          </div>
                        </div>
                      </div>
                      <button type="button" className={styles.revoke}>
                        Revoke
                      </button>
                    </div>
                  </div>
                </section>
              </>
            ) : (
              <section className={styles.card}>
                <h3>{activeLabel}</h3>
                <p className={styles.comingSoon}>This section is coming soon.</p>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
