import styles from '@/app/settings/page.module.css';
import { SettingsNotification } from '@/types/settings';

interface NotificationsSectionProps {
  notifications: SettingsNotification[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getSourceLabel(source: SettingsNotification['source']): string {
  switch (source) {
    case 'fx_recommendation':
      return 'AI recommendation';
    case 'volatility':
      return 'Volatility alert';
    case 'rate_movement':
      return 'Rate movement';
    default:
      return 'System';
  }
}

export function NotificationsSection({
  notifications,
  loading,
  error,
  refresh,
}: NotificationsSectionProps) {
  return (
    <section className={styles.card}>
      <div className={styles.sectionHeader}>
        <div>
          <span className={styles.sectionEyebrow}>Notifications</span>
          <h3>FX intelligence feed</h3>
          <p>Monitor rate signals, volatility warnings, and system readiness in one timeline.</p>
        </div>
        <button type="button" className={styles.inlineButton} onClick={() => void refresh()}>
          Refresh Feed
        </button>
      </div>

      {loading ? (
        <div className={styles.emptyState}>Loading FX intelligence feed...</div>
      ) : error ? (
        <div className={styles.errorBanner}>{error}</div>
      ) : (
        <div className={styles.feedList}>
          {notifications.map((notification) => (
            <article
              key={notification.id}
              className={`${styles.feedItem} ${
                notification.type === 'warning'
                  ? styles.feedWarning
                  : notification.type === 'success'
                    ? styles.feedSuccess
                    : styles.feedInfo
              }`}
            >
              <div className={styles.feedHeader}>
                <div>
                  <span className={styles.feedSource}>{getSourceLabel(notification.source)}</span>
                  <h4>{notification.title}</h4>
                </div>
                <span className={styles.feedTimestamp}>{formatTimestamp(notification.timestamp)}</span>
              </div>
              <p>{notification.message}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
