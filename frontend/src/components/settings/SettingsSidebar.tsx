import styles from '@/app/settings/page.module.css';
import { SettingsSection } from '@/types/settings';

import { SETTINGS_NAV_ITEMS } from './navigation';

interface SettingsSidebarProps {
  activeSection: SettingsSection;
  onSelect: (section: SettingsSection) => void;
}

export function SettingsSidebar({ activeSection, onSelect }: SettingsSidebarProps) {
  return (
    <aside className={styles.sidebar} aria-label="Settings menu">
      <div className={styles.sidebarHeader}>
        <span className={styles.sidebarEyebrow}>Financial Control Center</span>
        <strong>Settings</strong>
      </div>
      <div className={styles.sidebarNav}>
        {SETTINGS_NAV_ITEMS.map((item) => (
          <button
            key={item.section}
            type="button"
            onClick={() => onSelect(item.section)}
            className={`${styles.menuItem} ${
              activeSection === item.section ? styles.active : ''
            }`}
            aria-current={activeSection === item.section ? 'page' : undefined}
          >
            <span className={styles.menuIcon} aria-hidden>
              {item.icon}
            </span>
            <span className={styles.menuLabel}>{item.label}</span>
          </button>
        ))}
      </div>
      <div className={styles.sidebarFooter}>
        <span className={styles.sidebarFooterLabel}>Why it matters</span>
        <p>
          Business identity, payout rails, live FX alerts, and provider connections
          all shape how FXGuard executes cross-border settlement.
        </p>
      </div>
    </aside>
  );
}
