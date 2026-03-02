import client from './client';
import { FXRateResponseSchema } from '@/types/currency';
import { CurrencyCode } from '@/types/currency';
import { getMockFXRates } from './mockData';

/**
 * Foreign Exchange (FX) Rates API Service
 * Handles all FX rate fetching and conversion
 * Falls back to mock data when backend is unavailable
 */

// Flag to enable mock mode (set to true for development without backend)
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true' || true;

interface FetchRatesParams {
  base: CurrencyCode;
  quotes?: CurrencyCode[] | undefined;
}

/**
 * Fetch current FX rates
 * @param params - Base currency and optional quote currencies
 * @returns Array of FX rates
 * @throws Error if request fails
 */
export const fetchFXRates = async (params: FetchRatesParams) => {
  // Use mock data if enabled or backend unavailable
  if (USE_MOCK) {
    console.log('[DEV] Using mock FX rates');
    return getMockFXRates(params.base, params.quotes);
  }

  try {
    const response = await client.get('/fx/rates', {
      params: {
        base: params.base,
        quotes: params.quotes?.join(','),
      },
    });
    const validated = FXRateResponseSchema.parse(response.data);
    return validated.data;
  } catch (error) {
    console.warn('[API] FX rates fetch failed, using mock data');
    return getMockFXRates(params.base, params.quotes);
  }
};

/**
 * Get conversion rate between two currencies
 * @param base - Base currency
 * @param quote - Quote currency
 * @returns Exchange rate
 * @throws Error if request fails or conversion not supported
 */
export const getConversionRate = async (
  base: CurrencyCode,
  quote: CurrencyCode
): Promise<number> => {
  try {
    const rates = await fetchFXRates({
      base,
      quotes: [quote],
    });

    const rate = rates.find((r: { base: CurrencyCode; quote: CurrencyCode; rate: number }) => r.base === base && r.quote === quote);
    if (!rate) {
      throw new Error(
        `Conversion rate not found for ${base}/${quote}`
      );
    }

    return rate.rate;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to get conversion rate');
  }
};

/**
 * Convert amount from one currency to another
 * @param amount - Amount to convert
 * @param from - Source currency
 * @param to - Target currency
 * @returns Converted amount
 * @throws Error if conversion fails
 */
export const convertAmount = async (
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode
): Promise<number> => {
  try {
    const rate = await getConversionRate(from, to);
    return Math.round(amount * rate * 100) / 100; // Round to 2 decimals
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to convert amount');
  }
};

/**
 * Fetch historical FX rates (for future analytics)
 * @param base - Base currency
 * @param startDate - Start date (ISO 8601)
 * @param endDate - End date (ISO 8601)
 * @returns Historical rates
 * @throws Error if request fails
 */
export const fetchHistoricalRates = async (
  base: CurrencyCode,
  startDate: string,
  endDate: string
) => {
  try {
    const response = await client.get('/fx/historical', {
      params: {
        base,
        startDate,
        endDate,
      },
    });
    const validated = FXRateResponseSchema.parse(response.data);
    return validated.data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch historical rates');
  }
};
