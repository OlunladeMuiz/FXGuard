import Link from 'next/link';
import styles from './page.module.css';

export const metadata = {
  title: 'Privacy Policy - FXGuard',
  description: 'FXGuard Privacy Policy',
};

export default function PrivacyPage() {
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
        <h1 className={styles.title}>Privacy Policy</h1>
        <span className={styles.dateline}>Last updated: September 9, 2026</span>

        <p className={styles.intro}>
          FXGuard (&quot;we,&quot; &quot;us,&quot; &quot;our&quot;) provides a foreign exchange decision-intelligence platform for businesses. This policy explains what information we collect, how we use it, and your rights regarding it.
        </p>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>1. Information We Collect</h2>
          <ul className={styles.list}>
            <li>
              <strong>Account information:</strong> email address, company name, and other profile details you provide, either directly or via Google Sign-In (in which case we receive your name, email, and Google account identifier from Google).
            </li>
            <li>
              <strong>Business data:</strong> invoice details, transaction amounts, currency pairs, and related financial records you enter into the platform.
            </li>
            <li>
              <strong>Usage data:</strong> log data, device/browser information, and how you interact with the platform, collected automatically.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>2. How We Use Your Information</h2>
          <ul className={styles.list}>
            <li>To provide the core service: FX rate tracking, conversion recommendations, and invoice management.</li>
            <li>To authenticate your account and maintain your session.</li>
            <li>To communicate with you about your account or service changes.</li>
            <li>To improve and maintain the platform&apos;s reliability and security.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>3. Third-Party Services</h2>
          <p className={styles.paragraph}>
            We rely on the following third-party providers to operate FXGuard, each of which processes data on our behalf under their own privacy and security terms:
          </p>
          <ul className={styles.list}>
            <li>Google (Sign-In authentication)</li>
            <li>Neon (database hosting)</li>
            <li>Render (backend hosting)</li>
            <li>Vercel (frontend hosting)</li>
            <li>ExchangeRate-API and other market-data providers (for FX rate data)</li>
          </ul>
          <p className={styles.paragraph}>
            We do not sell your personal information to third parties.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>4. Data Retention</h2>
          <p className={styles.paragraph}>
            We retain your account and business data for as long as your account is active, or as needed to provide the service. You may request deletion of your account and associated data by contacting us.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>5. Your Rights</h2>
          <p className={styles.paragraph}>
            Depending on your location, you may have rights to access, correct, export, or delete your personal data. Contact us at <a href="mailto:muiz.olunlade.9@gmail.com" className={styles.backLink}>muiz.olunlade.9@gmail.com</a> to exercise these rights.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>6. Security</h2>
          <p className={styles.paragraph}>
            We use industry-standard measures (encrypted connections, access controls) to protect your data, but no system is completely secure.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>7. Changes to This Policy</h2>
          <p className={styles.paragraph}>
            We may update this policy periodically. Continued use of FXGuard after changes constitutes acceptance of the updated policy.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>8. Contact</h2>
          <p className={styles.paragraph}>
            Questions about this policy: <a href="mailto:muiz.olunlade.9@gmail.com" className={styles.backLink}>muiz.olunlade.9@gmail.com</a>
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
