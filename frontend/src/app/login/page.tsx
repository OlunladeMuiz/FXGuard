'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';
import { login, setAuthTokens, setUser } from '@/lib/api/auth';
import { formatApiError } from '@/lib/api/errors';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login({ email: email.trim(), password });
      setAuthTokens(response.access_token, response.refresh_token);
      setUser(response.user);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(formatApiError(err, 'Login failed. Please check your credentials.'));
    } finally {
      setLoading(false);
    }
  };

  const isVerificationError = error.toLowerCase().includes('not verified') || error.toLowerCase().includes('verify');

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
        <h1>Welcome back</h1>
        <p className={styles.subtitle}>Sign in to your FXFlow account</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          {error && (
            <div className={styles.error}>
              {error}
              {isVerificationError && (
                <Link href={`/verify-otp?email=${encodeURIComponent(email)}`} className={styles.verifyLink}>
                  Click here to verify your email
                </Link>
              )}
            </div>
          )}
          
          <label>Email address</label>
          <div className={styles.inputRow}>
            <span className={styles.icon}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16v16H4z" />
                <path d="m22 6-10 7L2 6" />
              </svg>
            </span>
            <input 
              type="email"
              placeholder="Enter your email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <label>Password</label>
          <div className={styles.inputRow}>
            <span className={styles.icon}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            <input 
              type={showPassword ? 'text' : 'password'} 
              placeholder="Enter your password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <span className={styles.iconRight} onClick={() => setShowPassword(!showPassword)} style={{ cursor: 'pointer' }}>
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
            </span>
          </div>

          <div className={styles.row}>
            <label className={styles.checkbox}>
              <input type="checkbox" />
              Remember me
            </label>
            <Link href="#" className={styles.link} onClick={(e) => { e.preventDefault(); alert('Password reset coming soon!'); }}>Forgot password?</Link>
          </div>

          <button type="submit" className={styles.primary} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

          <div className={styles.divider}><span>Or continue with</span></div>

          <div className={styles.socials}>
            <button type="button" className={styles.socialBtn} onClick={() => alert('Google sign-in coming soon!')}>Google</button>
            <button type="button" className={styles.socialBtn} onClick={() => alert('Microsoft sign-in coming soon!')}>Microsoft</button>
          </div>

          <p className={styles.footerText}>
            Don&apos;t have an account? <Link href="/signup">Create account</Link>
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
          </div>
        </div>
      </div>

      <p className={styles.legal}>
        By signing in, you agree to our Terms of Service and Privacy Policy.
        We&apos;ll remember this device for 30 days for your convenience.
      </p>
    </div>
  );
}
