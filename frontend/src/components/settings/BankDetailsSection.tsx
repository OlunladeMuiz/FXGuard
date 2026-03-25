import styles from '@/app/settings/page.module.css';
import { BankDetails, BankDetailsDraft } from '@/types/settings';

interface BankDetailsSectionProps {
  bankDetails: BankDetailsDraft;
  lastSavedRecord: BankDetails | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  successMessage: string | null;
  updateField: <Key extends keyof BankDetailsDraft>(field: Key, value: BankDetailsDraft[Key]) => void;
  save: () => Promise<void>;
}

function formatUpdatedAt(value: string | null | undefined): string {
  if (!value) {
    return 'Not updated yet';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getTime() === 0) {
    return 'Not updated yet';
  }

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function BankDetailsSection({
  bankDetails,
  lastSavedRecord,
  loading,
  saving,
  error,
  successMessage,
  updateField,
  save,
}: BankDetailsSectionProps) {
  return (
    <section className={styles.card}>
      <div className={styles.sectionHeader}>
        <div>
          <span className={styles.sectionEyebrow}>Bank Details</span>
          <h3>Payout configuration</h3>
          <p>Converted funds and payment-link settlements route to the payout account configured here.</p>
        </div>
        <div className={styles.metaPill}>Last updated: {formatUpdatedAt(lastSavedRecord?.updatedAt)}</div>
      </div>

      {successMessage && <div className={styles.successBanner}>{successMessage}</div>}
      {error && <div className={styles.errorBanner}>{error}</div>}

      {loading ? (
        <div className={styles.emptyState}>Loading payout account...</div>
      ) : (
        <>
          <div className={styles.gridTwo}>
            <div>
              <label className={styles.formLabel}>Bank Name</label>
              <input
                className={styles.formInput}
                value={bankDetails.bankName}
                onChange={(event) => updateField('bankName', event.target.value)}
                placeholder="e.g. Access Bank"
                disabled={saving}
              />
            </div>
            <div>
              <label className={styles.formLabel}>Account Name</label>
              <input
                className={styles.formInput}
                value={bankDetails.accountName}
                onChange={(event) => updateField('accountName', event.target.value)}
                placeholder="FXGuard SME Collections"
                disabled={saving}
              />
            </div>
            <div>
              <label className={styles.formLabel}>Account Number</label>
              <input
                className={styles.formInput}
                inputMode="numeric"
                value={bankDetails.accountNumber}
                onChange={(event) => updateField('accountNumber', event.target.value.replace(/\D/g, ''))}
                placeholder="0123456789"
                maxLength={18}
                disabled={saving}
              />
            </div>
            <div>
              <label className={styles.formLabel}>Settlement Currency</label>
              <select
                className={styles.formSelect}
                value={bankDetails.currency}
                onChange={(event) => updateField('currency', event.target.value as BankDetailsDraft['currency'])}
                disabled={saving}
              >
                <option value="NGN">NGN - Nigerian Naira</option>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
              </select>
            </div>
          </div>

          <div className={styles.contextBanner}>
            <strong>Settlement note</strong>
            <p>
              FXGuard recommendations optimize conversion timing. This payout account determines where
              completed collections and converted funds are finally settled.
            </p>
          </div>

          <div className={styles.cardFooter}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => void save()}
              disabled={saving}
            >
              {saving ? 'Saving payout account...' : 'Save Payout Account'}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
