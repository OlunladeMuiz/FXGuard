import { CurrencyCode } from '@/types/currency';
import {
  getCurrencySymbol,
  getCurrencyDecimalPlaces,
} from '@/constants/currencyPairs';

/**
 * Format currency amount with symbol
 * @param amount - The amount to format
 * @param currency - The currency code
 * @param locale - Optional locale for number formatting
 * @returns Formatted currency string (e.g., "$1,234.56")
 */
export const formatCurrency = (
  amount: number,
  currency: CurrencyCode,
  locale: string = 'en-US'
): string => {
  try {
    const decimalPlaces = getCurrencyDecimalPlaces(currency);
    const symbol = getCurrencySymbol(currency);

    // Format number with appropriate decimal places
    const formattedAmount = new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(amount);

    return `${symbol}${formattedAmount}`;
  } catch {
    // Fallback formatting if locale is not supported
    return `${currency} ${amount.toFixed(2)}`;
  }
};

/**
 * Format currency without symbol (just the number)
 * @param amount - The amount to format
 * @param currency - The currency code
 * @param locale - Optional locale for number formatting
 * @returns Formatted number string (e.g., "1,234.56")
 */
export const formatCurrencyNumber = (
  amount: number,
  currency: CurrencyCode,
  locale: string = 'en-US'
): string => {
  try {
    const decimalPlaces = getCurrencyDecimalPlaces(currency);

    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(amount);
  } catch {
    return amount.toFixed(getCurrencyDecimalPlaces(currency));
  }
};

/**
 * Parse currency string to number
 * @param value - The currency string to parse
 * @returns Parsed number
 */
export const parseCurrencyString = (value: string): number => {
  // Remove common currency symbols and spaces, then parse
  const cleaned = value.replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);

  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Check if amount is positive
 * @param amount - The amount to check
 * @returns True if amount is positive
 */
export const isPositiveAmount = (amount: number): boolean => {
  return amount > 0;
};

/**
 * Check if amount is valid (non-negative)
 * @param amount - The amount to check
 * @returns True if amount is valid
 */
export const isValidAmount = (amount: number): boolean => {
  return amount >= 0 && isFinite(amount);
};

/**
 * Round amount to decimal places
 * @param amount - The amount to round
 * @param decimalPlaces - Number of decimal places
 * @returns Rounded amount
 */
export const roundAmount = (amount: number, decimalPlaces: number = 2): number => {
  const multiplier = Math.pow(10, decimalPlaces);
  return Math.round(amount * multiplier) / multiplier;
};

/**
 * Add two currency amounts (same currency)
 * @param amount1 - First amount
 * @param amount2 - Second amount
 * @param decimalPlaces - Decimal places for rounding
 * @returns Sum of amounts
 */
export const addAmounts = (
  amount1: number,
  amount2: number,
  decimalPlaces: number = 2
): number => {
  const sum = amount1 + amount2;
  return roundAmount(sum, decimalPlaces);
};

/**
 * Subtract two currency amounts (same currency)
 * @param amount1 - First amount
 * @param amount2 - Amount to subtract
 * @param decimalPlaces - Decimal places for rounding
 * @returns Difference of amounts
 */
export const subtractAmounts = (
  amount1: number,
  amount2: number,
  decimalPlaces: number = 2
): number => {
  const difference = amount1 - amount2;
  return roundAmount(difference, decimalPlaces);
};
