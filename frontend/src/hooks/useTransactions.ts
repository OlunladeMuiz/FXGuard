'use client';

import { useState, useEffect, useCallback } from 'react';
import { Transaction } from '@/types/transaction';
import {
  fetchTransactions,
  createTransaction,
  cancelTransaction,
} from '@/api/transactions';
import { CurrencyCode } from '@/types/currency';
import { APP_CONFIG } from '@/constants/config';

interface UseTransactionsState {
  transactions: Transaction[];
  loading: boolean;
  error: Error | null;
  total: number;
  page: number;
  lastUpdated: Date | null;
}

interface UseTransactionsReturn extends UseTransactionsState {
  refetch: () => Promise<void>;
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (page: number) => void;
  create: (
    amount: number,
    currency: CurrencyCode,
    type: string,
    description?: string
  ) => Promise<Transaction>;
  cancel: (transactionId: string) => Promise<Transaction>;
}

/**
 * Custom hook for managing wallet transactions
 * Handles fetching, pagination, filtering, and transaction operations
 *
 * @param walletId - The wallet ID to fetch transactions for
 * @param limit - Number of transactions per page
 * @returns Transactions data, pagination, and transaction actions
 */
export const useTransactions = (
  walletId: string,
  limit: number = APP_CONFIG.ITEMS_PER_PAGE
): UseTransactionsReturn => {
  const [state, setState] = useState<UseTransactionsState>({
    transactions: [],
    loading: true,
    error: null,
    total: 0,
    page: 1,
    lastUpdated: null,
  });

  const fetchTransactionsList = useCallback(async (pageNum: number) => {
    if (!walletId) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: new Error('Wallet ID is required'),
      }));
      return;
    }

    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const data = await fetchTransactions({
        walletId,
        page: pageNum,
        limit,
      });
      setState({
        transactions: data.data,
        loading: false,
        error: null,
        total: data.pagination?.total || 0,
        page: pageNum,
        lastUpdated: new Date(),
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to fetch transactions');
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err,
      }));
    }
  }, [walletId, limit]);

  useEffect(() => {
    fetchTransactionsList(1);

    // Auto-refresh transactions at configured interval
    const interval = setInterval(
      () => fetchTransactionsList(state.page),
      APP_CONFIG.TRANSACTIONS_REFRESH_INTERVAL
    );

    return () => clearInterval(interval);
  }, [fetchTransactionsList, state.page]);

  const handleNextPage = useCallback(() => {
    setState((prev) => ({ ...prev, page: prev.page + 1 }));
  }, []);

  const handlePrevPage = useCallback(() => {
    setState((prev) => ({
      ...prev,
      page: Math.max(1, prev.page - 1),
    }));
  }, []);

  const goToPage = useCallback((pageNum: number) => {
    setState((prev) => ({
      ...prev,
      page: Math.max(1, pageNum),
    }));
  }, []);

  const create = useCallback(
    async (
      amount: number,
      currency: CurrencyCode,
      type: string,
      description?: string
    ): Promise<Transaction> => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        const newTransaction = await createTransaction({
          walletId,
          amount,
          currency,
          type,
          description,
        });
        await fetchTransactionsList(1);
        return newTransaction;
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Failed to create transaction');
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err,
        }));
        throw err;
      }
    },
    [walletId, fetchTransactionsList]
  );

  const cancel = useCallback(
    async (transactionId: string): Promise<Transaction> => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        const cancelled = await cancelTransaction(transactionId);
        await fetchTransactionsList(state.page);
        return cancelled;
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Failed to cancel transaction');
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err,
        }));
        throw err;
      }
    },
    [fetchTransactionsList, state.page]
  );

  return {
    ...state,
    refetch: () => fetchTransactionsList(state.page),
    nextPage: handleNextPage,
    prevPage: handlePrevPage,
    goToPage,
    create,
    cancel,
  };
};
