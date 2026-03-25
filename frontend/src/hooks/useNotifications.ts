'use client';

import { useCallback, useEffect, useState } from 'react';

import { formatApiError } from '@/lib/api/errors';
import { getNotifications } from '@/lib/api/notifications';
import { CurrencyCode } from '@/types/currency';
import { SettingsNotification } from '@/types/settings';

interface UseNotificationsResult {
  notifications: SettingsNotification[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useNotifications(preferredCurrency: CurrencyCode): UseNotificationsResult {
  const [notifications, setNotifications] = useState<SettingsNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getNotifications(preferredCurrency);
      setNotifications(response);
    } catch (loadError) {
      setError(formatApiError(loadError, 'Unable to load FX notifications.'));
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [preferredCurrency]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    notifications,
    loading,
    error,
    refresh,
  };
}
