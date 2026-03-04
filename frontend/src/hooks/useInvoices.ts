'use client';

import { useState, useEffect, useCallback } from 'react';
import { Invoice } from '@/types/invoice';
import { fetchInvoices, deleteInvoice } from '@/api/invoices';

interface UseInvoicesState {
  invoices: Invoice[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  error: Error | null;
}

interface UseInvoicesReturn extends UseInvoicesState {
  refetch: () => Promise<void>;
  setPage: (page: number) => void;
  removeInvoice: (id: string) => Promise<void>;
}

/**
 * Custom hook for managing invoice list
 * Handles fetching, pagination, and deletion
 *
 * @param initialPage - Initial page number
 * @param initialPageSize - Items per page
 * @returns Invoice list data and utilities
 */
export const useInvoices = (
  initialPage: number = 1,
  initialPageSize: number = 20
): UseInvoicesReturn => {
  const [state, setState] = useState<UseInvoicesState>({
    invoices: [],
    total: 0,
    page: initialPage,
    pageSize: initialPageSize,
    loading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const response = await fetchInvoices(state.page, state.pageSize);
      setState((prev) => ({
        ...prev,
        invoices: response.data,
        total: response.total,
        loading: false,
        error: null,
      }));
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to fetch invoices');
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err,
      }));
    }
  }, [state.page, state.pageSize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const setPage = useCallback((page: number) => {
    setState((prev) => ({ ...prev, page }));
  }, []);

  const removeInvoice = useCallback(async (id: string) => {
    try {
      await deleteInvoice(id);
      setState((prev) => ({
        ...prev,
        invoices: prev.invoices.filter((inv) => inv.id !== id),
        total: prev.total - 1,
      }));
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to delete invoice');
      throw err;
    }
  }, []);

  return {
    ...state,
    refetch: fetchData,
    setPage,
    removeInvoice,
  };
};

export default useInvoices;
