'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  createRateAlert,
  deleteRateAlert,
  getBrentSignal,
  getCurrentSpread,
  getGarchRisk,
  getInterventionSignal,
  getLostRevenueReport,
  getMonthlySavingsReport,
  getMultiCurrencyExposure,
  getNewsSignal,
  getReservesSignal,
  getSeasonalitySignal,
  getSourceHealth,
  listEngineNotifications,
  listRateAlerts,
  markNotificationRead,
  runSimulator,
} from '@/lib/api/engine';
import { formatApiError } from '@/lib/api/errors';
import {
  BrentSignal,
  GarchRiskItem,
  EngineNotification,
  EnginePeriod,
  InterventionSignalResponse,
  LostRevenueReport,
  MonthlySavingsReport,
  MultiCurrencyExposureResponse,
  NewsSignalResponse,
  RateAlertCreate,
  RateAlertResponse,
  ReservesSignalResponse,
  SeasonalityResponse,
  SimulatorRequest,
  SimulatorResult,
  SourceHealthResponse,
  SpreadResponse,
} from '@/types/engine';

const SPREAD_AUTO_REFRESH_MS = 60_000;

export function useSpread() {
  const [spread, setSpread] = useState<SpreadResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);
  const isRefreshingRef = useRef(false);

  const refreshWithMode = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (isRefreshingRef.current) {
      return;
    }

    isRefreshingRef.current = true;
    if (!silent || !hasLoadedRef.current) {
      setLoading(true);
    }
    setError(null);

    try {
      setSpread(await getCurrentSpread());
      hasLoadedRef.current = true;
    } catch (err) {
      setError(formatApiError(err, 'Unable to load spread data.'));
      if (!silent || !hasLoadedRef.current) {
        setSpread(null);
      }
    } finally {
      setLoading(false);
      isRefreshingRef.current = false;
    }
  }, []);

  const refresh = useCallback(async () => {
    await refreshWithMode();
  }, [refreshWithMode]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const refreshSilently = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      void refreshWithMode({ silent: true });
    };

    const intervalId = window.setInterval(refreshSilently, SPREAD_AUTO_REFRESH_MS);
    window.addEventListener('focus', refreshSilently);
    document.addEventListener('visibilitychange', refreshSilently);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshSilently);
      document.removeEventListener('visibilitychange', refreshSilently);
    };
  }, [refreshWithMode]);

  return { spread, loading, error, refresh };
}

export function useBrentSignal() {
  const [signal, setSignal] = useState<BrentSignal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setSignal(await getBrentSignal());
    } catch (err) {
      setError(formatApiError(err, 'Unable to load the Brent signal.'));
      setSignal(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { signal, loading, error, refresh };
}

export function useSourceHealth() {
  const [health, setHealth] = useState<SourceHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setHealth(await getSourceHealth());
    } catch (err) {
      setError(formatApiError(err, 'Unable to load source health.'));
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { health, loading, error, refresh };
}

export function useSimulator() {
  const [result, setResult] = useState<SimulatorResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestRequestIdRef = useRef(0);

  const run = useCallback(async (payload: SimulatorRequest) => {
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;
    setLoading(true);
    setError(null);

    try {
      const nextResult = await runSimulator(payload);
      if (requestId === latestRequestIdRef.current) {
        setResult(nextResult);
      }
      return nextResult;
    } catch (err) {
      const message = formatApiError(err, 'Simulator request failed.');
      if (requestId === latestRequestIdRef.current) {
        setError(message);
        setResult(null);
      }
      throw new Error(message);
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const clear = useCallback(() => {
    latestRequestIdRef.current += 1;
    setLoading(false);
    setResult(null);
    setError(null);
  }, []);

  return { result, loading, error, run, clear };
}

export function useRateAlerts() {
  const [alerts, setAlerts] = useState<RateAlertResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setAlerts(await listRateAlerts());
    } catch (err) {
      setError(formatApiError(err, 'Unable to load alerts.'));
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(async (payload: RateAlertCreate) => {
    setCreating(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const alert = await createRateAlert(payload);
      setAlerts((prev) => [alert, ...prev]);
      setSuccessMessage(`Alert saved for ${alert.pair.replace('_', '/')} ${alert.direction}.`);
      return alert;
    } catch (err) {
      const message = formatApiError(err, 'Failed to create alert.');
      setError(message);
      throw new Error(message);
    } finally {
      setCreating(false);
    }
  }, []);

  const remove = useCallback(async (alertId: string) => {
    setError(null);

    try {
      await deleteRateAlert(alertId);
      setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
    } catch (err) {
      const message = formatApiError(err, 'Failed to delete alert.');
      setError(message);
      throw new Error(message);
    }
  }, []);

  return {
    alerts,
    loading,
    creating,
    error,
    successMessage,
    refresh,
    create,
    remove,
  };
}

export function useEngineNotifications() {
  const [notifications, setNotifications] = useState<EngineNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setNotifications(await listEngineNotifications());
    } catch (err) {
      setError(formatApiError(err, 'Unable to load notifications.'));
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const markRead = useCallback(async (notificationId: string) => {
    try {
      await markNotificationRead(notificationId);
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId
            ? { ...notification, is_read: true }
            : notification,
        ),
      );
    } catch (err) {
      setError(formatApiError(err, 'Unable to update the notification.'));
    }
  }, []);

  const unreadCount = notifications.filter((notification) => !notification.is_read).length;

  return { notifications, loading, error, refresh, markRead, unreadCount };
}

export function useLostRevenue(period: EnginePeriod = '30d') {
  const [report, setReport] = useState<LostRevenueReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setReport(await getLostRevenueReport(period));
    } catch (err) {
      setError(formatApiError(err, 'Unable to load the lost revenue report.'));
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { report, loading, error, refresh };
}

export function useGarchRisk(pairs = 'USD/NGN,EUR/NGN,GBP/NGN', windowDays = 60) {
  const [data, setData] = useState<GarchRiskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getGarchRisk(pairs, windowDays));
    } catch (err) {
      setError(formatApiError(err, 'Unable to load GARCH risk levels.'));
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [pairs, windowDays]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useSeasonalitySignal() {
  const [signal, setSignal] = useState<SeasonalityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSignal(await getSeasonalitySignal());
    } catch (err) {
      setError(formatApiError(err, 'Unable to load seasonality signal.'));
      setSignal(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { signal, loading, error, refresh };
}

export function useNewsSignal() {
  const [signal, setSignal] = useState<NewsSignalResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSignal(await getNewsSignal());
    } catch (err) {
      setError(formatApiError(err, 'Unable to load news sentiment.'));
      setSignal(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { signal, loading, error, refresh };
}

export function useReservesSignal() {
  const [signal, setSignal] = useState<ReservesSignalResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSignal(await getReservesSignal());
    } catch (err) {
      setError(formatApiError(err, 'Unable to load reserves signal.'));
      setSignal(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { signal, loading, error, refresh };
}

export function useInterventionSignal() {
  const [signal, setSignal] = useState<InterventionSignalResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSignal(await getInterventionSignal());
    } catch (err) {
      setError(formatApiError(err, 'Unable to load intervention signal.'));
      setSignal(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { signal, loading, error, refresh };
}

export function useMultiCurrencyExposure(reportingCurrency = 'NGN') {
  const [data, setData] = useState<MultiCurrencyExposureResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getMultiCurrencyExposure(reportingCurrency));
    } catch (err) {
      setError(formatApiError(err, 'Unable to load exposure data.'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [reportingCurrency]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useMonthlySavingsReport(year?: number, month?: number) {
  const [report, setReport] = useState<MonthlySavingsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReport(await getMonthlySavingsReport(year, month));
    } catch (err) {
      setError(formatApiError(err, 'Unable to load monthly savings report.'));
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { report, loading, error, refresh };
}
