'use client';

import { useState, useEffect, useCallback } from 'react';
import { Recommendation } from '@/types/recommendation';
import { fetchRecommendation, refreshRecommendation } from '@/api/recommendation';

interface UseRecommendationState {
  recommendation: Recommendation | null;
  loading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
}

interface UseRecommendationReturn extends UseRecommendationState {
  refetch: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Custom hook for managing invoice recommendations
 * Handles fetching and refreshing AI-powered recommendations
 *
 * @param invoiceId - Invoice ID to get recommendation for
 * @returns Recommendation data and utilities
 */
export const useRecommendation = (invoiceId: string | null): UseRecommendationReturn => {
  const [state, setState] = useState<UseRecommendationState>({
    recommendation: null,
    loading: false,
    error: null,
    lastUpdated: null,
  });

  const fetchData = useCallback(async () => {
    if (!invoiceId) {
      setState({
        recommendation: null,
        loading: false,
        error: null,
        lastUpdated: null,
      });
      return;
    }

    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const data = await fetchRecommendation(invoiceId);
      setState({
        recommendation: data,
        loading: false,
        error: null,
        lastUpdated: new Date(),
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to fetch recommendation');
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err,
      }));
    }
  }, [invoiceId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(async () => {
    if (!invoiceId) return;

    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const data = await refreshRecommendation(invoiceId);
      setState({
        recommendation: data,
        loading: false,
        error: null,
        lastUpdated: new Date(),
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to refresh recommendation');
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err,
      }));
    }
  }, [invoiceId]);

  return {
    ...state,
    refetch: fetchData,
    refresh,
  };
};

export default useRecommendation;
