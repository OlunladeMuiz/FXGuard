'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { getUser, setUser, updateProfile } from '@/lib/api/auth';
import { formatApiError } from '@/lib/api/errors';

export default function CompleteProfilePage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = companyName.trim();
    if (!normalized) {
      setError('Company name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const updatedUser = await updateProfile({ company_name: normalized });
      const current = getUser();
      setUser({ ...current, ...updatedUser });
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(formatApiError(err, 'Failed to complete profile. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 18V6" />
            <path d="M20 18V6" />
            <path d="M7 13l3-3 4 4 3-3" />
          </svg>
        </div>
        <span className={styles.brand}>FXGuard</span>
      </header>

      <div className={styles.card}>
        <h1 className={styles.cardTitle}>Complete your profile</h1>
        <p className={styles.subtitle}>One more thing — what&apos;s your company name?</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          {error && <div className={styles.error}>{error}</div>}

          <label className={styles.formLabel} htmlFor="companyName">
            Company Name<span className={styles.required}>*</span>
          </label>
          <div className={styles.inputRow}>
            <span className={styles.icon}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M8 7h3" />
                <path d="M8 11h3" />
                <path d="M8 15h3" />
                <path d="M14 7h2" />
                <path d="M14 11h2" />
                <path d="M14 15h2" />
              </svg>
            </span>
            <input
              id="companyName"
              className={styles.formInput}
              type="text"
              placeholder="Your company name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <button type="submit" className={styles.primary} disabled={loading}>
            {loading ? 'Saving...' : 'Continue to Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
}
