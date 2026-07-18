import styles from '@/app/settings/page.module.css';
import { EngineNotification } from '@/types/engine';

interface NotificationsSectionProps {
  notifications: EngineNotification[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  unreadCount: number;
  markRead: (notificationId: string) => Promise<void> | void;
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

function getSourceLabel(type: string): string {
  switch (type) {
    case 'RATE_ALERT':
      return 'Rate alert';
    case 'RECOMMENDATION_CHANGE':
      return 'Recommendation';
    default:
      return 'System';
  }
}

function getToneClass(type: string): string {
  switch (type) {
    case 'RATE_ALERT':
      return styles.feedWarning ?? '';
    case 'RECOMMENDATION_CHANGE':
      return styles.feedSuccess ?? '';
    default:
      return styles.feedInfo ?? '';
  }
}

export function NotificationsSection({
  notifications,
  loading,
  error,
  refresh,
  unreadCount,
  markRead,
}: NotificationsSectionProps) {
  return (
    <section className={styles.card}>
      <div className={styles.sectionHeader}>
        <div>
          <span className={styles.sectionEyebrow}>Notifications</span>
          <h3 className={styles.sectionTitle}>Engine activity feed</h3>
          <p className={styles.sectionDescription}>Monitor triggered rate alerts, recommendation changes, and system readiness in one timeline.</p>
        </div>
        <div className={styles.feedActions}>
          <span className={styles.readPill}>{unreadCount} unread</span>
          <button type="button" className={styles.inlineButton} onClick={() => void refresh()}>
            Refresh Feed
          </button>
        </div>
      </div>

      {loading ? (
        <div className={styles.emptyState}>Loading engine notifications...</div>
      ) : error ? (
        <div className={styles.errorBanner}>{error}</div>
      ) : notifications.length === 0 ? (
        <div className={styles.emptyState}>
          No engine notifications yet. Triggered alerts and in-app notices will appear here.
        </div>
      ) : (
        <div className={styles.feedList}>
          {notifications.map((notification) => (
            <article
              key={notification.id}
              className={`${styles.feedItem} ${getToneClass(notification.type)} ${notification.is_read ? styles.feedRead : ''}`}
            >
              <div className={styles.feedHeader}>
                <div>
                  <span className={styles.feedSource}>{getSourceLabel(notification.type)}</span>
                  <h4 className={styles.feedTitle}>{notification.title}</h4>
                </div>
                <div className={styles.feedMeta}>
                  <span className={styles.feedTimestamp}>{formatTimestamp(notification.created_at)}</span>
                  {!notification.is_read && (
                    <button
                      type="button"
                      className={styles.readButton}
                      onClick={() => void markRead(notification.id)}
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
              <p className={styles.feedMessage}>{notification.body}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
