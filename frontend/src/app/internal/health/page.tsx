'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUser, type User } from '@/lib/api/auth';
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
  synthetic_official: 'Seeded official',
  synthetic_parallel: 'Seeded parallel',
  synthetic_bdc: 'Seeded BDC',
};

function getHealthTone(source: SourceHealthItem): 'live' | 'stale' | 'blocked' {
  if (!source.is_configured) {
    return 'blocked';
  }
  return source.is_stale ? 'stale' : 'live';
}

function getHealthStatusLabel(source: SourceHealthItem): string {
  if (!source.is_configured) {
    return 'Needs key';
  }
  return source.is_stale ? 'Stale' : 'Live';
}

function formatHealthTimestamp(value: string | null): string {
  if (!value) {
    return 'No recent record';
  }

  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return value;
  }

  return timestamp.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function InternalHealthPage() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) {
      router.replace('/login');
    } else if (!currentUser.is_admin) {
      router.replace('/dashboard');
    } else {
      setUser(currentUser);
    }
  }, [router]);

  const { health, loading, error } = useSourceHealth();

  if (!user || !user.is_admin) {
    return null; // Will redirect shortly
  }

  const healthItems = health?.sources ?? [];
  const blockedSource = healthItems.find((item) => !item.is_configured) ?? null;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/dashboard" className={styles.backLink}>
          &larr; Back to Dashboard
        </Link>
        <h1 className={styles.title}>System Health</h1>
        <p className={styles.subtitle}>Administrative view of backend services and data feeds.</p>
      </div>

      <section className={styles.deck}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>Feed Health</h3>
            <p className={styles.panelSubtitle}>Coverage and latency overview</p>
          </div>

          {blockedSource && (
            <div className={styles.systemNotice}>
              <strong>Credential needed</strong>
              <p>{blockedSource.note ?? 'Add the missing key to bring this feed online.'}</p>
            </div>
          )}

          <div className={styles.healthList}>
            {loading ? (
              <div className={styles.emptyState}>Checking feed health...</div>
            ) : healthItems.length === 0 ? (
              <div className={styles.emptyState}>{error ?? 'Feed health will appear once the engine responds.'}</div>
            ) : (
              healthItems.map((item) => (
                <article key={item.source} className={styles.healthRow}>
                  <div className={styles.healthRowTop}>
                    <div className={styles.healthIdentity}>
                      <span className={`${styles.healthDot} ${styles[getHealthTone(item)]}`} />
                      <strong>{SOURCE_LABELS[item.source] ?? item.source}</strong>
                    </div>
                    <span className={`${styles.healthStatus} ${styles[getHealthTone(item)]}`}>
                      {getHealthStatusLabel(item)}
                    </span>
                  </div>

                  <p className={styles.healthNote}>
                    {item.note ?? `${item.rate_count_24h} record${item.rate_count_24h === 1 ? '' : 's'} in the last 24 hours.`}
                  </p>

                  <div className={styles.healthMeta}>
                    <span>Last seen {formatHealthTimestamp(item.last_recorded_at)}</span>
                    <span>{item.rate_count_24h} in 24h</span>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
