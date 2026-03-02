import { CurrencyCode, CurrencyInfo } from '@/types/currency';

/**
 * Supported currency pairs
 * These pairs define what conversions are possible
 * Can be extended without breaking the frontend
 */
export const SUPPORTED_CURRENCY_PAIRS = [
  'USD/EUR',
  'USD/GBP',
  'USD/NGN',
  'EUR/GBP',
  'EUR/USD',
  'GBP/USD',
  'NGN/USD',
] as const;

/**
 * Currency information map
 * Used for display, formatting, and metadata
 */
export const CURRENCY_INFO: Record<CurrencyCode, CurrencyInfo> = {
  USD: {
    code: 'USD',
    name: 'United States Dollar',
    symbol: '$',
    decimalPlaces: 2,
  },
  EUR: {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    decimalPlaces: 2,
  },
  GBP: {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    decimalPlaces: 2,
  },
  NGN: {
    code: 'NGN',
    name: 'Nigerian Naira',
    symbol: '₦',
    decimalPlaces: 2,
  },
  CAD: {
    code: 'CAD',
    name: 'Canadian Dollar',
    symbol: 'C$',
    decimalPlaces: 2,
  },
  AUD: {
    code: 'AUD',
    name: 'Australian Dollar',
    symbol: 'A$',
    decimalPlaces: 2,
  },
  JPY: {
    code: 'JPY',
    name: 'Japanese Yen',
    symbol: '¥',
    decimalPlaces: 0,
  },
  INR: {
    code: 'INR',
    name: 'Indian Rupee',
    symbol: '₹',
    decimalPlaces: 2,
  },
};

/**
 * Get currency symbol
 */
export const getCurrencySymbol = (code: CurrencyCode): string => {
  return CURRENCY_INFO[code]?.symbol || code;
};

/**
 * Get decimal places for currency
 */
export const getCurrencyDecimalPlaces = (code: CurrencyCode): number => {
  return CURRENCY_INFO[code]?.decimalPlaces || 2;
};

/**
 * Get currency name
 */
export const getCurrencyName = (code: CurrencyCode): string => {
  return CURRENCY_INFO[code]?.name || code;
};
