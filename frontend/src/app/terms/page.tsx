import Link from 'next/link';
import styles from './page.module.css';

export const metadata = {
  title: 'Terms of Service - FXGuard',
  description: 'FXGuard Terms of Service',
};

export default function TermsPage() {
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

      <main className={styles.container}>
        <h1 className={styles.title}>Terms of Service</h1>
        <span className={styles.dateline}>Last updated: September 9, 2026</span>

        <p className={styles.intro}>
          Welcome to FXGuard. By accessing or using our platform, you agree to these Terms of Service (&quot;Terms&quot;). If you do not agree, please do not use FXGuard.
        </p>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>1. Who We Are</h2>
          <p className={styles.paragraph}>
            FXGuard is a foreign exchange decision-intelligence platform designed to help businesses make informed decisions about when to convert, hold, or split foreign currency invoice settlements.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>2. Eligibility</h2>
          <p className={styles.paragraph}>
            You must be at least 18 years old and have the authority to bind your business to these Terms in order to use FXGuard.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>3. Your Account</h2>
          <ul className={styles.list}>
            <li>You are responsible for maintaining the confidentiality of your account credentials, including any Google account used to sign in.</li>
            <li>You are responsible for all activity that occurs under your account.</li>
            <li>Notify us immediately at <a href="mailto:muiz.olunlade.9@gmail.com" className={styles.backLink}>muiz.olunlade.9@gmail.com</a> if you suspect unauthorized access to your account.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>4. Acceptable Use</h2>
          <p className={styles.paragraph}>You agree not to:</p>
          <ul className={styles.list}>
            <li>Use FXGuard for any unlawful purpose or in violation of any applicable regulation.</li>
            <li>Attempt to gain unauthorized access to our systems, other users&apos; accounts, or data.</li>
            <li>Interfere with or disrupt the platform&apos;s operation.</li>
            <li>Use automated means to scrape or extract data from the platform without our consent.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>5. FX Data and Recommendations — Important Disclaimer</h2>
          <p className={styles.paragraph}>
            FXGuard provides FX rate data, analytics, and conversion recommendations to support your decision-making. This is informational and does not constitute financial, legal, or investment advice. Currency markets are inherently volatile and unpredictable. You are solely responsible for your own conversion, settlement, and financial decisions, and FXGuard is not liable for any losses arising from decisions made using information from the platform.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>6. Third-Party Data Sources</h2>
          <p className={styles.paragraph}>
            FXGuard relies on third-party providers for FX rate data. While we aim for accuracy, we do not guarantee the completeness, accuracy, or timeliness of any rate data, and we are not responsible for third-party outages or data errors.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>7. Intellectual Property</h2>
          <p className={styles.paragraph}>
            FXGuard, its logo, and its underlying software are the property of FXGuard and its creators. You may not copy, modify, or redistribute the platform without our written permission.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>8. Termination</h2>
          <p className={styles.paragraph}>
            We may suspend or terminate your access to FXGuard if you violate these Terms. You may stop using FXGuard and request account deletion at any time by contacting us.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>9. Limitation of Liability</h2>
          <p className={styles.paragraph}>
            To the fullest extent permitted by law, FXGuard and its creators are not liable for any indirect, incidental, or consequential damages arising from your use of the platform, including but not limited to financial losses from currency conversion decisions.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>10. Changes to These Terms</h2>
          <p className={styles.paragraph}>
            We may modify these Terms periodically. Continued use of FXGuard following any updates constitutes acceptance of the modified Terms.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>11. Contact</h2>
          <p className={styles.paragraph}>
            Questions about these Terms: <a href="mailto:muiz.olunlade.9@gmail.com" className={styles.backLink}>muiz.olunlade.9@gmail.com</a>
          </p>
        </section>

        <div className={styles.footerNav}>
          <Link href="/" className={styles.backLink}>
            ← Back to FXGuard
          </Link>
        </div>
      </main>
    </div>
  );
}
