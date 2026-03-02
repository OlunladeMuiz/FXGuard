'use client';

import { useState, useEffect, useCallback } from 'react';
import { Wallet } from '@/types/wallet';
import { fetchWallet, convertCurrency } from '@/api/wallet';

interface UseWalletState {
  wallet: Wallet | null;
  loading: boolean;
  error: Error | null;
}

interface UseWalletReturn extends UseWalletState {
  refetch: () => Promise<void>;
  convertCurrency: (
    fromCurrency: string,
    toCurrency: string,
    amount: number
  ) => Promise<Wallet>;
}

/**
 * Custom hook for managing wallet data
 * Handles fetching, loading, and error states
 *
 * @param walletId - The wallet ID to fetch
 * @returns Wallet data, loading state, error, and actions
 */
export const useWallet = (walletId: string): UseWalletReturn => {
  const [state, setState] = useState<UseWalletState>({
    wallet: null,
    loading: true,
    error: null,
  });

  const fetchWalletData = useCallback(async () => {
    if (!walletId) {
      setState({
        wallet: null,
        loading: false,
        error: new Error('Wallet ID is required'),
      });
      return;
    }

    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const data = await fetchWallet({ walletId });
      setState({
        wallet: data,
        loading: false,
        error: null,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      setState({
        wallet: null,
        loading: false,
        error: err,
      });
    }
  }, [walletId]);

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  const handleConvertCurrency = useCallback(
    async (
      fromCurrency: string,
      toCurrency: string,
      amount: number
    ): Promise<Wallet> => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        const updatedWallet = await convertCurrency(
          walletId,
          fromCurrency,
          toCurrency,
          amount
        );
        setState({
          wallet: updatedWallet,
          loading: false,
          error: null,
        });
        return updatedWallet;
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Conversion failed');
        setState({
          wallet: state.wallet,
          loading: false,
          error: err,
        });
        throw err;
      }
    },
    [walletId, state.wallet]
  );

  return {
    ...state,
    refetch: fetchWalletData,
    convertCurrency: handleConvertCurrency,
  };
};
