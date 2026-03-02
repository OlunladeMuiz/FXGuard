/**
 * Mock data for development/demo mode
 * Used when backend API is not available
 */

import type { Wallet } from '@/types/wallet';
import type { FXRate, CurrencyCode } from '@/types/currency';
import type { Transaction } from '@/types/transaction';

// ============================================
// MOCK WALLET DATA
// ============================================
export const mockWallet: Wallet = {
  id: 'wallet-123',
  userId: 'user-456',
  status: 'active',
  createdAt: '2024-01-15T10:30:00Z',
  updatedAt: new Date().toISOString(),
  balances: [
    { currency: 'USD', amount: 12500.5 },
    { currency: 'EUR', amount: 8750.25 },
    { currency: 'GBP', amount: 5200.0 },
    { currency: 'NGN', amount: 2500000.0 },
    { currency: 'JPY', amount: 150000 },
    { currency: 'CAD', amount: 3200.75 },
  ],
};

// ============================================
// MOCK FX RATES DATA
// ============================================
const generateMockRates = (base: CurrencyCode): FXRate[] => {
  const rates: Record<CurrencyCode, Record<CurrencyCode, number>> = {
    USD: { USD: 1, EUR: 0.92, GBP: 0.79, NGN: 1550, JPY: 149.5, CAD: 1.36, AUD: 1.53, INR: 83.12 },
    EUR: { USD: 1.09, EUR: 1, GBP: 0.86, NGN: 1685, JPY: 162.5, CAD: 1.48, AUD: 1.66, INR: 90.4 },
    GBP: { USD: 1.27, EUR: 1.16, GBP: 1, NGN: 1962, JPY: 189.2, CAD: 1.72, AUD: 1.94, INR: 105.3 },
    NGN: { USD: 0.00065, EUR: 0.00059, GBP: 0.00051, NGN: 1, JPY: 0.096, CAD: 0.00088, AUD: 0.00099, INR: 0.054 },
    JPY: { USD: 0.0067, EUR: 0.0062, GBP: 0.0053, NGN: 10.4, JPY: 1, CAD: 0.0091, AUD: 0.010, INR: 0.556 },
    CAD: { USD: 0.74, EUR: 0.68, GBP: 0.58, NGN: 1140, JPY: 110, CAD: 1, AUD: 1.13, INR: 61.2 },
    AUD: { USD: 0.65, EUR: 0.60, GBP: 0.52, NGN: 1012, JPY: 97.4, CAD: 0.89, AUD: 1, INR: 54.3 },
    INR: { USD: 0.012, EUR: 0.011, GBP: 0.0095, NGN: 18.6, JPY: 1.8, CAD: 0.016, AUD: 0.018, INR: 1 },
  };

  const baseRates = rates[base];
  const timestamp = new Date().toISOString();

  return Object.entries(baseRates)
    .filter(([quote]) => quote !== base)
    .map(([quote, rate]) => ({
      base,
      quote: quote as CurrencyCode,
      rate: rate * (1 + (Math.random() * 0.002 - 0.001)), // Add small variance
      timestamp,
    }));
};

export const getMockFXRates = (base: CurrencyCode, quotes?: CurrencyCode[]): FXRate[] => {
  const allRates = generateMockRates(base);
  if (quotes && quotes.length > 0) {
    return allRates.filter((r) => quotes.includes(r.quote));
  }
  return allRates;
};

// ============================================
// MOCK TRANSACTIONS DATA
// ============================================
export const mockTransactions: Transaction[] = [
  {
    id: 'tx-001',
    walletId: 'wallet-123',
    type: 'deposit',
    status: 'completed',
    amount: 5000,
    currency: 'USD',
    description: 'Bank transfer deposit',
    createdAt: '2026-03-01T14:30:00Z',
    updatedAt: '2026-03-01T14:32:00Z',
  },
  {
    id: 'tx-002',
    walletId: 'wallet-123',
    type: 'conversion',
    status: 'completed',
    amount: 1000,
    currency: 'USD',
    description: 'USD to EUR conversion',
    metadata: {
      fromCurrency: 'USD',
      toCurrency: 'EUR',
      fromAmount: 1000,
      toAmount: 920,
      rate: 0.92,
    },
    createdAt: '2026-03-01T10:15:00Z',
    updatedAt: '2026-03-01T10:15:30Z',
  },
  {
    id: 'tx-003',
    walletId: 'wallet-123',
    type: 'withdrawal',
    status: 'completed',
    amount: 500,
    currency: 'GBP',
    description: 'ATM withdrawal',
    createdAt: '2026-02-28T16:45:00Z',
    updatedAt: '2026-02-28T16:47:00Z',
  },
  {
    id: 'tx-004',
    walletId: 'wallet-123',
    type: 'transfer',
    status: 'pending',
    amount: 250,
    currency: 'EUR',
    description: 'Transfer to John Doe',
    reference: 'REF-2026-0228',
    createdAt: '2026-02-28T09:20:00Z',
    updatedAt: '2026-02-28T09:20:00Z',
  },
  {
    id: 'tx-005',
    walletId: 'wallet-123',
    type: 'conversion',
    status: 'completed',
    amount: 500000,
    currency: 'NGN',
    description: 'NGN to USD conversion',
    metadata: {
      fromCurrency: 'NGN',
      toCurrency: 'USD',
      fromAmount: 500000,
      toAmount: 322.58,
      rate: 0.000645,
    },
    createdAt: '2026-02-27T11:30:00Z',
    updatedAt: '2026-02-27T11:30:45Z',
  },
  {
    id: 'tx-006',
    walletId: 'wallet-123',
    type: 'deposit',
    status: 'completed',
    amount: 2000000,
    currency: 'NGN',
    description: 'Local bank deposit',
    createdAt: '2026-02-26T08:00:00Z',
    updatedAt: '2026-02-26T08:05:00Z',
  },
  {
    id: 'tx-007',
    walletId: 'wallet-123',
    type: 'transfer',
    status: 'failed',
    amount: 100,
    currency: 'USD',
    description: 'Transfer to invalid account',
    createdAt: '2026-02-25T15:00:00Z',
    updatedAt: '2026-02-25T15:01:00Z',
  },
  {
    id: 'tx-008',
    walletId: 'wallet-123',
    type: 'conversion',
    status: 'completed',
    amount: 2000,
    currency: 'EUR',
    description: 'EUR to GBP conversion',
    metadata: {
      fromCurrency: 'EUR',
      toCurrency: 'GBP',
      fromAmount: 2000,
      toAmount: 1720,
      rate: 0.86,
    },
    createdAt: '2026-02-24T13:45:00Z',
    updatedAt: '2026-02-24T13:46:00Z',
  },
];

export const getMockTransactions = (
  page: number = 1,
  limit: number = 20,
  type?: string,
  status?: string
) => {
  let filtered = [...mockTransactions];

  if (type && type !== 'all') {
    filtered = filtered.filter((tx) => tx.type === type);
  }

  if (status && status !== 'all') {
    filtered = filtered.filter((tx) => tx.status === status);
  }

  const start = (page - 1) * limit;
  const end = start + limit;
  const paginated = filtered.slice(start, end);

  return {
    data: paginated,
    status: 'success' as const,
    pagination: {
      total: filtered.length,
      page,
      limit,
    },
  };
};
