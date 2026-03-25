import styles from '@/app/settings/page.module.css';
import { BusinessDetailsDraft } from '@/types/settings';

interface BusinessDetailsSectionProps {
  businessDetails: {
    businessName: string;
    ownerName: string;
    defaultCurrency: string;
    registrationDate: string;
    hasMissingFields: boolean;
  } | null;
  form: BusinessDetailsDraft;
  loading: boolean;
  saving: boolean;
  error: string | null;
  successMessage: string | null;
  setField: <Key extends keyof BusinessDetailsDraft>(field: Key, value: BusinessDetailsDraft[Key]) => void;
  save: () => Promise<void>;
}

const defaultCurrencyOptions = [
  { code: 'NGN', label: 'NGN - Nigerian Naira' },
  { code: 'USD', label: 'USD - US Dollar' },
  { code: 'EUR', label: 'EUR - Euro' },
  { code: 'GBP', label: 'GBP - British Pound' },
] as const;

function formatRegistrationDate(value: string | undefined): string {
  if (!value) {
    return 'Registration date unavailable';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getTime() === 0) {
    return 'Registration date unavailable';
  }

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function BusinessDetailsSection({
  businessDetails,
  form,
  loading,
  saving,
  error,
  successMessage,
  setField,
  save,
}: BusinessDetailsSectionProps) {
  const ownerName = [form.ownerFirstName.trim(), form.ownerLastName.trim()].filter(Boolean).join(' ');
  const registrationDate = formatRegistrationDate(businessDetails?.registrationDate);

  if (loading && !businessDetails && !form.email) {
    return (
      <section className={styles.card}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionEyebrow}>Business Details</span>
            <h3>Business identity</h3>
            <p>Loading the verified business profile used for invoicing and cross-border execution.</p>
          </div>
        </div>
        <div className={styles.emptyState}>Loading business identity...</div>
      </section>
    );
  }

  return (
    <section className={styles.card}>
      <div className={styles.sectionHeader}>
        <div>
          <span className={styles.sectionEyebrow}>Business Details</span>
          <h3>Business identity</h3>
          <p>Update the legal and operational details FXGuard uses for invoices, settlement defaults, and transaction review.</p>
        </div>
      </div>

      <div className={styles.identityHero}>
        <div>
          <span className={styles.identityEyebrow}>Editable business profile</span>
          <h4>{form.businessName.trim() || businessDetails?.businessName || 'Business identity'}</h4>
          <p>{ownerName || businessDetails?.ownerName || 'Add the owner/operator name used for finance approvals.'}</p>
        </div>
        <div className={styles.identityChips}>
          <span className={styles.identityChip}>{form.defaultCurrency} default</span>
          <span className={styles.identityChipSecondary}>{registrationDate}</span>
        </div>
      </div>

      {businessDetails?.hasMissingFields && !successMessage && (
        <div className={styles.warningBanner}>
          Complete your business identity so invoice currency defaults, recipient settlement, and FX monitoring remain accurate.
        </div>
      )}
      {successMessage && <div className={styles.successBanner}>{successMessage}</div>}
      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.gridTwo}>
        <div>
          <label className={styles.formLabel}>Business Name</label>
          <input
            className={styles.formInput}
            value={form.businessName}
            onChange={(event) => setField('businessName', event.target.value)}
            placeholder="FXGuard Logistics Limited"
            disabled={loading || saving}
          />
        </div>
        <div>
          <label className={styles.formLabel}>Business Type</label>
          <input
            className={styles.formInput}
            value={form.businessType}
            onChange={(event) => setField('businessType', event.target.value)}
            placeholder="Import & Export"
            disabled={loading || saving}
          />
        </div>
        <div>
          <label className={styles.formLabel}>Owner First Name</label>
          <input
            className={styles.formInput}
            value={form.ownerFirstName}
            onChange={(event) => setField('ownerFirstName', event.target.value)}
            placeholder="Mariam"
            disabled={loading || saving}
          />
        </div>
        <div>
          <label className={styles.formLabel}>Owner Last Name</label>
          <input
            className={styles.formInput}
            value={form.ownerLastName}
            onChange={(event) => setField('ownerLastName', event.target.value)}
            placeholder="Adebayo"
            disabled={loading || saving}
          />
        </div>
        <div>
          <label className={styles.formLabel}>Business Email</label>
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
            value={form.phoneNumber}
            onChange={(event) => setField('phoneNumber', event.target.value)}
            placeholder="+234 801 234 5678"
            disabled={loading || saving}
          />
        </div>
        <div>
          <label className={styles.formLabel}>Country</label>
          <input
            className={styles.formInput}
            value={form.country}
            onChange={(event) => setField('country', event.target.value)}
            placeholder="Nigeria"
            disabled={loading || saving}
          />
        </div>
        <div>
          <label className={styles.formLabel}>Default Currency</label>
          <select
            className={styles.formSelect}
            value={form.defaultCurrency}
            onChange={(event) => setField('defaultCurrency', event.target.value as BusinessDetailsDraft['defaultCurrency'])}
            disabled={loading || saving}
          >
            {defaultCurrencyOptions.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.identityGrid}>
        <div className={styles.identityField}>
          <span>Registration Date</span>
          <strong>{registrationDate}</strong>
        </div>
        <div className={styles.identityField}>
          <span>FX Context</span>
          <strong>{form.defaultCurrency} settlement baseline for invoice and payout workflows.</strong>
        </div>
      </div>

      <div className={styles.contextBanner}>
        <strong>Why this matters</strong>
        <p>
          Business identity feeds invoice ownership, payout destination reviews, and the default
          currency lens used by FXGuard recommendations.
        </p>
      </div>

      <div className={styles.cardFooter}>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={() => void save()}
          disabled={loading || saving}
        >
          {saving ? 'Saving...' : 'Save Business Details'}
        </button>
      </div>
    </section>
  );
}
