'use client';

import { useState, useEffect, useCallback } from 'react';
import { CurrencyCode } from '@/types/currency';
import { FXHistoryResponse, FXStatistics } from '@/types/fx';
import { fetchFXHistory, getFXStatistics } from '@/api/fx';

interface UseFXHistoryState {
  history: FXHistoryResponse | null;
  statistics: FXStatistics | null;
  loading: boolean;
  error: Error | null;
}

interface UseFXHistoryReturn extends UseFXHistoryState {
  refetch: () => Promise<void>;
  changePeriod: (period: '7d' | '30d' | '90d' | '1y') => void;
}

/**
 * Custom hook for managing FX history and statistics
 * Handles fetching historical data and calculating volatility
 *
 * @param base - Base currency
 * @param quote - Quote currency
 * @param initialPeriod - Initial time period
 * @returns FX history data and utilities
 */
export const useFXHistory = (
  base: CurrencyCode,
  quote: CurrencyCode,
  initialPeriod: '7d' | '30d' | '90d' | '1y' = '30d'
): UseFXHistoryReturn => {
  const [period, setPeriod] = useState(initialPeriod);
  const [state, setState] = useState<UseFXHistoryState>({
    history: null,
    statistics: null,
    loading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      
      const [historyData, statsData] = await Promise.all([
        fetchFXHistory(base, quote, period),
        getFXStatistics(base, quote),
      ]);

      setState({
        history: historyData,
        statistics: statsData,
        loading: false,
        error: null,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to fetch FX history');
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err,
      }));
    }
  }, [base, quote, period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const changePeriod = useCallback((newPeriod: '7d' | '30d' | '90d' | '1y') => {
    setPeriod(newPeriod);
  }, []);

  return {
    ...state,
    refetch: fetchData,
    changePeriod,
  };
};

export default useFXHistory;
