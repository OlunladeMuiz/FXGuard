'use client';

import { useState } from 'react';
import styles from './page.module.css';
import client from '@/lib/api/client';
import { formatApiError } from '@/lib/api/errors';

export default function CurrencySettingsPage() {
  const [bvn, setBvn] = useState('');
  const [bvnVerified, setBvnVerified] = useState(false);
  const [bvnLoading, setBvnLoading] = useState(false);
  const [bvnError, setBvnError] = useState('');

  const handleVerifyBvn = async () => {
    if (bvn.length !== 11 || !bvn.match(/^\d+$/)) {
      setBvnError('BVN must be exactly 11 digits.');
      return;
    }

    setBvnLoading(true);
    setBvnError('');

    try {
      await client.post('/invoices/verify-bvn', { bvn });
      setBvnVerified(true);
    } catch (err: unknown) {
      setBvnError(formatApiError(err, 'BVN verification failed. Please check the number and try again.'));
    } finally {
      setBvnLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.brand}>FXGuard</div>
          <h1>Currency Settings</h1>
          <p>Configure your currency preferences and FX optimization settings</p>
          <div className={styles.stepper}>
            <span className={styles.stepDone}>1</span>
            <span className={styles.stepLine} />
            <span className={styles.stepActive}>2</span>
          </div>
        </header>

        <div className={styles.card}>
          <section>
            <h3>Base Currency</h3>
            <label className={styles.label}>Primary Business Currency *</label>
            <select className={styles.select}>
              <option>Select your base currency</option>
            </select>
            <p className={styles.helper}>This will be your default accounting and reporting currency</p>
          </section>

          <section>
            <h3>Identity Verification</h3>
            <label className={styles.label}>Bank Verification Number (BVN) *</label>
            {bvnVerified ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-3)',
                padding: 'var(--spacing-3)',
                background: 'var(--color-success-light)',
                border: '1px solid var(--color-success)',
                borderRadius: 10,
                color: 'var(--color-success)',
                fontWeight: 'var(--font-weight-semibold)',
                marginTop: 'var(--spacing-2)',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                BVN Verified Successfully
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 'var(--spacing-2)', marginTop: 'var(--spacing-2)' }}>
                  <input
                    className={styles.input}
                    placeholder="Enter your 11-digit BVN"
                    value={bvn}
                    onChange={(e) => setBvn(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    maxLength={11}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className={styles.primary}
                    onClick={handleVerifyBvn}
                    disabled={bvnLoading || bvn.length !== 11}
                  >
                    {bvnLoading ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
                {bvnError && (
                  <p style={{
                    color: 'var(--color-error)',
                    fontSize: 'var(--font-size-xs)',
                    marginTop: 'var(--spacing-2)',
                  }}>
                    {bvnError}
                  </p>
                )}
                <p style={{
                  color: 'var(--text-secondary)',
                  fontSize: 'var(--font-size-xs)',
                  marginTop: 'var(--spacing-2)',
                }}>
                  Your BVN is required for regulatory compliance. It is verified securely via Interswitch and never stored.
                </p>
              </>
            )}
          </section>

          <section>
            <h3>Invoice Currencies</h3>
            <div className={styles.currencyGrid}>
              {['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'].map((code) => (
                <label key={code} className={styles.currencyTile}>
                  <input type="checkbox" className={styles.input} />
                  <span>{code}</span>
                  <small>{code}</small>
                </label>
              ))}
            </div>
          </section>

          <section>
            <h3>Settlement Currencies</h3>
            <label className={styles.label}>Preferred Settlement Currencies *</label>
            <input className={styles.input} placeholder="Primary settlement currency" />
            <input className={styles.input} placeholder="Secondary settlement currency (optional)" />
          </section>

          <section>
            <h3>FX Alert Thresholds</h3>
            <div className={styles.gridTwo}>
              <div>
                <label className={styles.label}>Volatility Alert Threshold</label>
                <input className={styles.input} defaultValue="2.0" />
              </div>
              <div>
                <label className={styles.label}>Favorable Rate Alert</label>
                <input className={styles.input} defaultValue="1.5" />
              </div>
            </div>
          </section>

          <section>
            <h3>Rounding Rules</h3>
            <div className={styles.gridTwo}>
              <div>
                <label className={styles.label}>Amount Rounding</label>
                <input className={styles.input} defaultValue="2 decimal places (0.01)" />
              </div>
              <div>
                <label className={styles.label}>Exchange Rate Precision</label>
                <input className={styles.input} defaultValue="4 decimal places (0.0001)" />
              </div>
            </div>
          </section>

          <section className={styles.integration}>
            <div>
              <h3>Accounting Integration</h3>
              <p>Import existing currency settings and transaction history</p>
            </div>
            <button className={styles.primary}>Import</button>
          </section>
        </div>
      </div>
    </div>
  );
}
