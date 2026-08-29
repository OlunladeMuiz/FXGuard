'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, type User } from '@/lib/api/auth';
import { ingestReserves } from '@/lib/api/admin';
import { useSourceHealth } from '@/hooks/useEngine';
import { type SourceHealthItem } from '@/lib/types/engine';
import styles from './page.module.css';

const SOURCE_LABELS: Record<string, string> = {
  exchange_rate_api: 'Market FX',
  cbn_official: 'CBN official',
  abokifx_parallel: 'AbokiFX parallel',
  nairatoday_parallel: 'Nairatoday parallel',
  nairatoday_bdc: 'Nairatoday BDC',
  alpha_vantage: 'Brent oil',
};

function getHealthStatus(source: SourceHealthItem) {
  if (!source.is_configured) return 'error';
  return source.is_stale ? 'stale' : 'live';
}

function formatHealthTimestamp(value: string | null) {
  if (!value) return 'No recent record';
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? value : timestamp.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'health' | 'ingestion'>('health');
  
  // Ingestion State
  const [weekOf, setWeekOf] = useState('');
  const [reserves, setReserves] = useState('');
  const [loadingForm, setLoadingForm] = useState(false);
  const [message, setMessage] = useState('');

  // Health State
  const { health, loading: healthLoading, error: healthError } = useSourceHealth();

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser?.is_admin) router.replace('/dashboard');
    else setUser(currentUser);
  }, [router]);

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingForm(true);
    setMessage('');
    try {
      await ingestReserves(weekOf, parseFloat(reserves));
      setMessage('Successfully ingested CBN reserves data.');
      setWeekOf('');
      setReserves('');
    } catch (err: any) {
      setMessage(err.response?.data?.detail || 'Failed to ingest data.');
    } finally {
      setLoadingForm(false);
    }
  };

  if (!user) return <main style={{ padding: '2rem' }}>Verifying authorization...</main>;

  const healthItems = health?.sources ?? [];
  const blockedSource = healthItems.find((item) => !item.is_configured) ?? null;

  return (
    <main className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Admin Control Center</h1>
        <p className={styles.subtitle}>Administrative view of backend services and data feeds.</p>
      </div>

      <div className={styles.tabs}>
        <button className={activeTab === 'health' ? `${styles.tab} ${styles.tabActive}` : styles.tab} onClick={() => setActiveTab('health')}>
          System Health
        </button>
        <button className={activeTab === 'ingestion' ? `${styles.tab} ${styles.tabActive}` : styles.tab} onClick={() => setActiveTab('ingestion')}>
          Macro Ingestion
        </button>
      </div>

      <section className={styles.panel}>
        {activeTab === 'health' && (
          <div>
            {blockedSource && (
              <div className={styles.alertBanner}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <div>
                  <strong style={{ display: 'block', marginBottom: '4px' }}>Credential needed</strong>
                  <span>{blockedSource.note ?? 'Add the missing key to bring this feed online.'}</span>
                </div>
              </div>
            )}
            <div className={styles.feedList}>
              {healthLoading ? <p>Checking feed health...</p> : healthError ? <p>{healthError}</p> : healthItems.map((item) => {
                const status = getHealthStatus(item);
                const statusClass = status === 'live' ? styles.badgeLive : status === 'stale' ? styles.badgeStale : styles.badgeError;
                const dotClass = status === 'live' ? styles.dotLive : status === 'stale' ? styles.dotStale : styles.dotError;
                return (
                  <article key={item.source} className={styles.feedCard}>
                    <div className={styles.feedInfo}>
                      <h3>{SOURCE_LABELS[item.source] ?? item.source}</h3>
                      <p className={styles.feedDesc}>{item.note ?? `${item.rate_count_24h} records in the last 24 hours.`}</p>
                      <div className={styles.feedMeta}>Last seen: {formatHealthTimestamp(item.last_recorded_at)}</div>
                    </div>
                    <div className={`${styles.badge} ${statusClass}`}>
                      <span className={`${styles.dot} ${dotClass}`} />
                      {status === 'error' ? 'Needs key' : status}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'ingestion' && (
          <form onSubmit={handleIngest} style={{ maxWidth: '500px' }}>
            {message && <div className={styles.message}>{message}</div>}
            <div className={styles.formGroup}>
              <label htmlFor="weekOf" className={styles.label}>Week Of (YYYY-MM-DD)</label>
              <input id="weekOf" type="date" value={weekOf} onChange={(e) => setWeekOf(e.target.value)} required className={styles.input} />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="reserves" className={styles.label}>Reserves (USD Billions)</label>
              <input id="reserves" type="number" step="0.1" min="0" value={reserves} onChange={(e) => setReserves(e.target.value)} required placeholder="e.g., 32.5" className={styles.input} />
            </div>
            <button type="submit" disabled={loadingForm} className={styles.submitBtn}>
              {loadingForm ? 'Ingesting...' : 'Ingest Reserves Data'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
