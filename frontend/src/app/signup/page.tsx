'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';
import { register } from '@/lib/api/auth';
import { formatApiError } from '@/lib/api/errors';

export default function SignupPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!termsAccepted || !privacyAccepted) {
      setError('Please accept the Terms of Service and Privacy Policy');
      return;
    }

    if (password !== passwordConfirmation) {
      setError('Passwords do not match');
      return;
    }

    const normalizedCompanyName = companyName.trim();
    if (!normalizedCompanyName) {
      setError('Company name is required');
      return;
    }

    setLoading(true);
    try {
      await register({
        company_name: normalizedCompanyName,
        email: email.trim(),
        password,
        password_confirmation: passwordConfirmation,
      }); 
      // Redirect to OTP verification page
      router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
    } catch (err: unknown) {
      setError(formatApiError(err, 'Registration failed. Please try again.'));
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
        <h1>Create your account</h1>
        <p className={styles.subtitle}>Start optimizing your cross-border payments today</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          {error && <div className={styles.error}>{error}</div>}

          <label>Company Name<span className={styles.required}>*</span></label>
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
              placeholder="Your company name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
          </div>

          <label>Business Email<span className={styles.required}>*</span></label>
          <div className={styles.inputRow}>
            <span className={styles.icon}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16v16H4z" />
                <path d="m22 6-10 7L2 6" />
              </svg>
            </span>
            <input 
              type="email"
              placeholder="you@company.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <span className={styles.helper}>Use your business email address</span>

          <label>Password<span className={styles.required}>*</span></label>
          <div className={styles.inputRow}>
            <span className={styles.icon}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Create a strong password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className={styles.visibilityToggle}
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
            >
              {showPassword ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          <ul className={styles.requirements}>
            <li>At least 8 characters</li>
            <li>Include numbers and special characters</li>
          </ul>

          <label>Confirm Password<span className={styles.required}>*</span></label>
          <div className={styles.inputRow}>
            <span className={styles.icon}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            <input
              type={showPasswordConfirmation ? 'text' : 'password'}
              placeholder="Re-enter your password" 
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              required
            />
            <button
              type="button"
              className={styles.visibilityToggle}
              onClick={() => setShowPasswordConfirmation((current) => !current)}
              aria-label={showPasswordConfirmation ? 'Hide confirm password' : 'Show confirm password'}
              aria-pressed={showPasswordConfirmation}
            >
              {showPasswordConfirmation ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>

          <label>Referral Code <span className={styles.optional}>(Optional)</span></label>
          <div className={styles.inputRow}>
            <span className={styles.icon}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7h18v10H3z" />
                <path d="M7 7V5h10v2" />
              </svg>
            </span>
            <input placeholder="Enter referral code" />
          </div>
          <span className={styles.helper}>Get 3 months free with a valid referral code</span>

          <div className={styles.checkboxGroup}>
            <label className={styles.checkbox}>
              <input 
                type="checkbox" 
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
              />
              I agree to the <span>Terms of Service*</span>
            </label>
            <label className={styles.checkbox}>
              <input 
                type="checkbox" 
                checked={privacyAccepted}
                onChange={(e) => setPrivacyAccepted(e.target.checked)}
              />
              I acknowledge the <span>Privacy Policy*</span>
            </label>
            <label className={styles.checkbox}>
              <input type="checkbox" />
              I want to receive product updates and special offers
            </label>
          </div>

          <button type="submit" className={styles.primary} disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>

          <div className={styles.divider}><span>Or sign up with</span></div>
          <div className={styles.socials}>
            <button type="button" className={styles.socialBtn} onClick={() => alert('Google sign-up coming soon!')}>Google</button>
            <button type="button" className={styles.socialBtn} onClick={() => alert('Microsoft sign-up coming soon!')}>Microsoft</button>
          </div>

          <p className={styles.footerText}>
            Already have an account? <Link href="/login">Sign in</Link>
          </p>
        </form>
      </div>

      <div className={styles.trustCard}>
        <div className={styles.trustIcon}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l7 4v6c0 5-3.5 9-7 10-3.5-1-7-5-7-10V6l7-4z" />
          </svg>
        </div>
        <div>
          <strong>Your data is secure</strong>
          <p>We use bank-grade 256-bit SSL encryption and are SOC 2 compliant.</p>
          <div className={styles.badges}>
            <span>FCA Regulated</span>
            <span>GDPR Compliant</span>
            <span>ISO 27001</span>
          </div>
        </div>
      </div>

      <p className={styles.legal}>
        By creating an account, you agree to receive essential service emails. You can
        unsubscribe from marketing communications at any time.
      </p>
    </div>
  );
}
