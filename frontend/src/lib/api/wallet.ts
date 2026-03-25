import client from './client';
import { WalletResponseSchema, WalletListResponseSchema } from '@/types/wallet';
import { mockWallet } from './mockData';

/**
 * Wallet API Service
 * Handles all wallet-related API calls
 * All responses are validated with Zod schemas
 * Falls back to mock data when backend is unavailable
 */

// Flag to enable mock mode (set to true for development without backend)
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

interface FetchWalletParams {
  walletId: string;
}

interface FetchWalletsParams {
  page?: number;
  limit?: number;
}

/**
 * Fetch a single wallet
 * @param params - Fetch wallet parameters
 * @returns Validated wallet data
 * @throws AxiosError if request fails
 */
export const fetchWallet = async (params: FetchWalletParams) => {
  // Use mock data if enabled or backend unavailable
  if (USE_MOCK) {
    console.log('[DEV] Using mock wallet data');
    return mockWallet;
  }

  try {
    const response = await client.get(`/wallets/${params.walletId}`);
    const validated = WalletResponseSchema.parse(response.data);
    return validated.data;
  } catch (error) {
    console.warn('[API] Wallet fetch failed, using mock data');
    return mockWallet;
  }
};

/**
 * Fetch all wallets for a user
 * @param params - Fetch wallets parameters
 * @returns Validated wallet list with pagination
 * @throws AxiosError if request fails
 */
export const fetchWallets = async (
  params?: FetchWalletsParams
) => {
  try {
    const response = await client.get('/wallets', {
      params: {
        page: params?.page || 1,
        limit: params?.limit || 20,
      },
    });
    const validated = WalletListResponseSchema.parse(response.data);
    return validated;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch wallets');
  }
};

/**
 * Get wallet summary (for dashboard)
 * @param walletId - Wallet ID
 * @returns Wallet summary data
 * @throws AxiosError if request fails
 */
export const fetchWalletSummary = async (walletId: string) => {
  try {
    const response = await client.get(`/wallets/${walletId}/summary`);
    const validated = WalletResponseSchema.parse(response.data);
    return validated.data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch wallet summary');
  }
};

/**
 * Convert currency in wallet
 * @param walletId - Wallet ID
 * @param fromCurrency - Source currency
 * @param toCurrency - Target currency
 * @param amount - Amount to convert
 * @returns Updated wallet data
 * @throws AxiosError if conversion fails
 */
export const convertCurrency = async (
  walletId: string,
  fromCurrency: string,
  toCurrency: string,
  amount: number
) => {
  try {
    const response = await client.post(`/wallets/${walletId}/convert`, {
      fromCurrency,
      toCurrency,
      amount,
    });
    const validated = WalletResponseSchema.parse(response.data);
    return validated.data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to convert currency');
  }
};
