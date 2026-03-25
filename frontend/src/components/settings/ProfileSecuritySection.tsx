import styles from '@/app/settings/page.module.css';
import { ProfileSettingsForm } from '@/hooks/useProfileSettings';

interface ProfileSecuritySectionProps {
  form: ProfileSettingsForm;
  loading: boolean;
  saving: boolean;
  error: string | null;
  successMessage: string | null;
  setField: <Key extends keyof ProfileSettingsForm>(field: Key, value: ProfileSettingsForm[Key]) => void;
  save: () => Promise<void>;
}

const preferredCurrencyOptions = [
  { code: 'NGN', label: 'NGN - Nigerian Naira' },
  { code: 'USD', label: 'USD - US Dollar' },
  { code: 'EUR', label: 'EUR - Euro' },
  { code: 'GBP', label: 'GBP - British Pound' },
] as const;

const timeZoneOptions = [
  'Africa/Lagos',
  'Africa/Nairobi',
  'Europe/London',
  'America/New_York',
] as const;

const profileIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15V7a2 2 0 0 0-2-2h-3l-2-2H10L8 5H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const shieldIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const desktopIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M8 20h8" />
    <path d="M12 16v4" />
  </svg>
);

const mobileIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="7" y="2" width="10" height="20" rx="2" />
    <path d="M12 18h.01" />
  </svg>
);

export function ProfileSecuritySection({
  form,
  loading,
  saving,
  error,
  successMessage,
  setField,
  save,
}: ProfileSecuritySectionProps) {
  return (
    <>
      <section className={styles.card}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionEyebrow}>Profile & Security</span>
            <h3>Operator profile</h3>
            <p>Keep your operator identity and default settlement preferences current.</p>
          </div>
        </div>

        <div className={styles.photoRow}>
          <div className={styles.profileAvatar}>FG</div>
          <div className={styles.photoMeta}>
            <button type="button" className={styles.photoButton}>
              {profileIcon}
              Update Avatar
            </button>
            <p className={styles.photoHint}>Profile identity is used across invoice review and payment operations.</p>
          </div>
        </div>

        {successMessage && <div className={styles.successBanner}>{successMessage}</div>}
        {error && <div className={styles.errorBanner}>{error}</div>}

        <div className={styles.gridTwo}>
          <div>
            <label className={styles.formLabel}>First Name</label>
            <input
              className={styles.formInput}
              value={form.firstName}
              onChange={(event) => setField('firstName', event.target.value)}
              placeholder="Enter first name"
              disabled={loading || saving}
            />
          </div>
          <div>
            <label className={styles.formLabel}>Last Name</label>
            <input
              className={styles.formInput}
              value={form.lastName}
              onChange={(event) => setField('lastName', event.target.value)}
              placeholder="Enter last name"
              disabled={loading || saving}
            />
          </div>
          <div>
            <label className={styles.formLabel}>Email Address</label>
            <input
              className={styles.formInput}
              type="email"
              value={form.email}
              onChange={(event) => setField('email', event.target.value)}
              placeholder="finance@company.com"
              disabled={loading || saving}
            />
          </div>
          <div>
            <label className={styles.formLabel}>Phone Number</label>
            <input
              className={styles.formInput}
              value={form.phone}
              onChange={(event) => setField('phone', event.target.value)}
              placeholder="+234 801 234 5678"
              disabled={loading || saving}
            />
          </div>
          <div>
            <label className={styles.formLabel}>Time Zone</label>
            <select
              className={styles.formSelect}
              value={form.timeZone}
              onChange={(event) => setField('timeZone', event.target.value)}
              disabled={loading || saving}
            >
              {timeZoneOptions.map((timeZone) => (
                <option key={timeZone} value={timeZone}>
                  {timeZone}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={styles.formLabel}>Default Settlement Currency</label>
            <select
              className={styles.formSelect}
              value={form.preferredCurrency}
              onChange={(event) => setField('preferredCurrency', event.target.value as ProfileSettingsForm['preferredCurrency'])}
              disabled={loading || saving}
            >
              {preferredCurrencyOptions.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.cardFooter}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => void save()}
            disabled={loading || saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionEyebrow}>Security</span>
            <h3>Access controls</h3>
            <p>Protect the operators who can adjust FX settings, payouts, and payment execution rails.</p>
          </div>
        </div>

        <div className={styles.securityPanel}>
          <div className={styles.securityRow}>
            <div className={styles.securityMeta}>
              <span className={styles.securityIcon}>{shieldIcon}</span>
              <div>
                <strong>Two-Factor Authentication</strong>
                <p>Authentication app protection is enabled for finance operations.</p>
              </div>
            </div>
            <span className={styles.statusSuccess}>Enabled</span>
          </div>

          <div className={styles.securityRow}>
            <div className={styles.securityMeta}>
              <span className={styles.securityIcon}>{desktopIcon}</span>
              <div>
                <strong>Desktop Session</strong>
                <p>Current session on secure browser access.</p>
              </div>
            </div>
            <span className={styles.statusNeutral}>Current</span>
          </div>

          <div className={styles.securityRow}>
            <div className={styles.securityMeta}>
              <span className={styles.securityIcon}>{mobileIcon}</span>
              <div>
                <strong>Mobile Review Session</strong>
                <p>Last verified 2 hours ago for approval visibility.</p>
              </div>
            </div>
            <button type="button" className={styles.inlineButton}>Revoke</button>
          </div>
        </div>
      </section>
    </>
  );
}
