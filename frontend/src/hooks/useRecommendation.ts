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
 * Custom hook for managing pair-based FX recommendations.
 */
export const useRecommendation = (
  base: string | null,
  quote: string | null,
  amount: number | null,
): UseRecommendationReturn => {
  const [state, setState] = useState<UseRecommendationState>({
    recommendation: null,
    loading: false,
    error: null,
    lastUpdated: null,
  });

  const fetchData = useCallback(async () => {
    if (!base || !quote || amount === null || amount <= 0) {
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
      const data = await fetchRecommendation(base, quote, amount);
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
  }, [amount, base, quote]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(async () => {
    if (!base || !quote || amount === null || amount <= 0) return;

    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const data = await refreshRecommendation(base, quote, amount);
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
  }, [amount, base, quote]);

  return {
    ...state,
    refetch: fetchData,
    refresh,
  };
};

export default useRecommendation;
