'use client';

import { useState, useEffect, useCallback } from 'react';
import { FXRate, CurrencyCode } from '@/types/currency';
import { fetchFXRates, convertAmount } from '@/api/fx';
import { APP_CONFIG } from '@/constants/config';

interface UseFXRatesState {
  rates: FXRate[];
  loading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
}

interface UseFXRatesReturn extends UseFXRatesState {
  refetch: () => Promise<void>;
  getRate: (from: CurrencyCode, to: CurrencyCode) => number | null;
  convert: (amount: number, from: CurrencyCode, to: CurrencyCode) => Promise<number>;
}

/**
 * Custom hook for managing FX rates
 * Handles fetching rates, auto-refresh, and conversion calculations
 *
 * @param baseCurrency - The base currency for rate fetching
 * @param quoteCurrencies - Optional array of quote currencies to fetch
 * @returns FX rates data, loading state, error, and conversion utilities
 */
export const useFXRates = (
  baseCurrency: CurrencyCode,
  quoteCurrencies?: CurrencyCode[]
): UseFXRatesReturn => {
  const [state, setState] = useState<UseFXRatesState>({
    rates: [],
    loading: true,
    error: null,
    lastUpdated: null,
  });

  const fetchRates = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const data = await fetchFXRates({
        base: baseCurrency,
        quotes: quoteCurrencies,
      });
      setState({
        rates: data,
        loading: false,
        error: null,
        lastUpdated: new Date(),
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to fetch rates');
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err,
      }));
    }
  }, [baseCurrency, quoteCurrencies]);

  useEffect(() => {
    fetchRates();

    // Auto-refresh rates at configured interval
    const interval = setInterval(
      fetchRates,
      APP_CONFIG.FX_RATES_REFRESH_INTERVAL
    );

    return () => clearInterval(interval);
  }, [fetchRates]);

  const getRate = useCallback(
    (from: CurrencyCode, to: CurrencyCode): number | null => {
      const rate = state.rates.find((r) => r.base === from && r.quote === to);
      return rate ? rate.rate : null;
    },
    [state.rates]
  );

  const convert = useCallback(
    async (
      amount: number,
      from: CurrencyCode,
      to: CurrencyCode
    ): Promise<number> => {
      try {
        return await convertAmount(amount, from, to);
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Conversion failed');
        throw err;
      }
    },
    []
  );

  return {
    ...state,
    refetch: fetchRates,
    getRate,
    convert,
  };
};
