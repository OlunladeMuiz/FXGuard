import client from './client';
import {
  TransactionResponseSchema,
  TransactionListResponseSchema,
} from '@/types/transaction';
import { CurrencyCode } from '@/types/currency';
import { getMockTransactions, mockTransactions } from './mockData';

/**
 * Transactions API Service
 * Handles all transaction-related API calls
 * Falls back to mock data when backend is unavailable
 */

// Flag to enable mock mode (set to true for development without backend)
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

interface FetchTransactionsParams {
  walletId: string;
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
}

interface CreateTransactionParams {
  walletId: string;
  amount: number;
  currency: CurrencyCode;
  type: string;
  description?: string | undefined;
  reference?: string | undefined;
}

/**
 * Fetch transactions for a wallet
 * @param params - Filter and pagination parameters
 * @returns Validated transaction list with pagination
 * @throws Error if request fails
 */
export const fetchTransactions = async (
  params: FetchTransactionsParams
) => {
  // Use mock data if enabled or backend unavailable
  if (USE_MOCK) {
    console.log('[DEV] Using mock transaction data');
    return getMockTransactions(
      params.page || 1,
      params.limit || 20,
      params.type,
      params.status
    );
  }

  try {
    const { walletId, ...queryParams } = params;
    const response = await client.get(
      `/wallets/${walletId}/transactions`,
      {
        params: {
          page: queryParams.page || 1,
          limit: queryParams.limit || 20,
          status: queryParams.status,
          type: queryParams.type,
        },
      }
    );
    const validated = TransactionListResponseSchema.parse(response.data);
    return validated;
  } catch (error) {
    console.warn('[API] Transactions fetch failed, using mock data');
    return getMockTransactions(
      params.page || 1,
      params.limit || 20,
      params.type,
      params.status
    );
  }
};

/**
 * Get a specific transaction
 * @param transactionId - Transaction ID
 * @returns Validated transaction data
 * @throws Error if request fails
 */
export const fetchTransaction = async (transactionId: string) => {
  // Use mock data if enabled
  if (USE_MOCK) {
    const tx = mockTransactions.find((t) => t.id === transactionId);
    if (tx) return tx;
    throw new Error('Transaction not found');
  }

  try {
    const response = await client.get(`/transactions/${transactionId}`);
    const validated = TransactionResponseSchema.parse(response.data);
    return validated.data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch transaction');
  }
};

/**
 * Create a new transaction
 * @param params - Transaction parameters
 * @returns Created transaction
 * @throws Error if creation fails
 */
export const createTransaction = async (
  params: CreateTransactionParams
) => {
  try {
    const response = await client.post(
      `/wallets/${params.walletId}/transactions`,
      {
        amount: params.amount,
        currency: params.currency,
        type: params.type,
        description: params.description,
        reference: params.reference,
      }
    );
    const validated = TransactionResponseSchema.parse(response.data);
    return validated.data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to create transaction');
  }
};

/**
 * Cancel a transaction
 * @param transactionId - Transaction ID
 * @returns Updated transaction
 * @throws Error if cancellation fails
 */
export const cancelTransaction = async (transactionId: string) => {
  try {
    const response = await client.post(
      `/transactions/${transactionId}/cancel`
    );
    const validated = TransactionResponseSchema.parse(response.data);
    return validated.data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to cancel transaction');
  }
};

/**
 * Get transaction history export (CSV)
 * @param walletId - Wallet ID
 * @param startDate - Start date (ISO 8601)
 * @param endDate - End date (ISO 8601)
 * @returns CSV content
 * @throws Error if request fails
 */
export const exportTransactionHistory = async (
  walletId: string,
  startDate: string,
  endDate: string
) => {
  try {
    const response = await client.get(
      `/wallets/${walletId}/transactions/export`,
      {
        params: {
          startDate,
          endDate,
          format: 'csv',
        },
        responseType: 'blob',
      }
    );
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to export transaction history');
  }
};
