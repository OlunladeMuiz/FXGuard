'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { formatApiError } from '@/lib/api/errors';
import { connectIntegration, getIntegrations } from '@/lib/api/integrations';
import {
  IntegrationConnectionPayload,
  IntegrationProvider,
  IntegrationRecord,
} from '@/types/settings';

interface UseIntegrationsResult {
  integrations: IntegrationRecord[];
  loading: boolean;
  connectingProvider: IntegrationProvider | null;
  error: string | null;
  successMessage: string | null;
  hasConnectedProvider: boolean;
  connect: (payload: IntegrationConnectionPayload) => Promise<void>;
  refresh: () => Promise<void>;
  clearMessages: () => void;
}

export function useIntegrations(): UseIntegrationsResult {
  const [integrations, setIntegrations] = useState<IntegrationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingProvider, setConnectingProvider] = useState<IntegrationProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getIntegrations();
      setIntegrations(response);
    } catch (loadError) {
      setError(formatApiError(loadError, 'Unable to load payment integrations.'));
      setIntegrations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const connect = useCallback(async (payload: IntegrationConnectionPayload) => {
    setConnectingProvider(payload.provider);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await connectIntegration(payload);
      setIntegrations(response);
      const providerName = response.find((record) => record.provider === payload.provider)?.name ?? payload.provider;
      setSuccessMessage(`${providerName} connected successfully`);
    } catch (connectError) {
      setError(formatApiError(connectError, 'Unable to connect payment provider.'));
    } finally {
      setConnectingProvider(null);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setError(null);
    setSuccessMessage(null);
  }, []);

  const hasConnectedProvider = useMemo(
    () => integrations.some((record) => record.status === 'connected'),
    [integrations],
  );

  return {
    integrations,
    loading,
    connectingProvider,
    error,
    successMessage,
    hasConnectedProvider,
    connect,
    refresh,
    clearMessages,
  };
}
