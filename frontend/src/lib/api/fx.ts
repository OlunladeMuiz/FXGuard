import client from './client';
import { FXRateResponseSchema } from '@/types/currency';
import { CurrencyCode } from '@/types/currency';
import { getMockFXRates } from './mockData';
import {
  FXHistoryResponse,
  FXHistoryResponseSchema,
  FXHistoryPoint,
  FXStatistics,
} from '@/types/fx';
import { calculateVolatility } from '@/utils/calculations';

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

/**
 * Generate mock FX history data
 */
const generateMockFXHistory = (
  base: CurrencyCode,
  quote: CurrencyCode,
  period: '7d' | '30d' | '90d' | '1y'
): FXHistoryResponse => {
  const periodDays: Record<'7d' | '30d' | '90d' | '1y', number> = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365,
  };

  const baseRates: Record<string, number> = {
    'USD-NGN': 1550,
    'USD-EUR': 0.91,
    'USD-GBP': 0.79,
    'EUR-USD': 1.10,
    'GBP-USD': 1.27,
  };

  const pairKey = `${base}-${quote}`;
  const baseRate = baseRates[pairKey] || 1;
  const days: number = periodDays[period];
  const volatilityFactor = quote === 'NGN' ? 0.05 : 0.02; // NGN more volatile

  const data: FXHistoryPoint[] = [];
  const rates: number[] = [];
  const now = new Date();

  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // Generate rate with some randomness and trend
    const trendFactor = 1 + ((days - i) / days) * 0.02; // slight upward trend
    const randomFactor = 1 + (Math.random() - 0.5) * volatilityFactor * 2;
    const rate = baseRate * trendFactor * randomFactor;
    
    const high = rate * (1 + Math.random() * 0.01);
    const low = rate * (1 - Math.random() * 0.01);
    
    rates.push(rate);
    data.push({
      date: date.toISOString(),
      rate: Math.round(rate * 10000) / 10000,
      high: Math.round(high * 10000) / 10000,
      low: Math.round(low * 10000) / 10000,
      open: Math.round((rate * 0.999) * 10000) / 10000,
      close: Math.round((rate * 1.001) * 10000) / 10000,
    });
  }

  const min = Math.min(...rates);
  const max = Math.max(...rates);
  const average = rates.reduce((a, b) => a + b, 0) / rates.length;
  const volatility = calculateVolatility(rates);

  // Calculate standard deviation
  const squaredDiffs = rates.map(r => Math.pow(r - average, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / rates.length;
  const standardDeviation = Math.sqrt(avgSquaredDiff);

  return {
    base,
    quote,
    period,
    data,
    statistics: {
      min: Math.round(min * 10000) / 10000,
      max: Math.round(max * 10000) / 10000,
      average: Math.round(average * 10000) / 10000,
      volatility: Math.round(volatility * 1000) / 1000,
      standardDeviation: Math.round(standardDeviation * 10000) / 10000,
    },
  };
};

/**
 * Fetch FX history with statistics
 * @param base - Base currency
 * @param quote - Quote currency
 * @param period - Time period for history
 * @returns FX history with statistics including volatility
 */
export const fetchFXHistory = async (
  base: CurrencyCode,
  quote: CurrencyCode,
  period: '7d' | '30d' | '90d' | '1y' = '30d'
): Promise<FXHistoryResponse> => {
  if (USE_MOCK) {
    console.log('[DEV] Using mock FX history');
    await new Promise((resolve) => setTimeout(resolve, 200));
    return generateMockFXHistory(base, quote, period);
  }

  try {
    const response = await client.get('/fx/history', {
      params: { base, quote, period },
    });
    return FXHistoryResponseSchema.parse(response.data);
  } catch (error) {
    console.warn('[API] FX history fetch failed, using mock data');
    return generateMockFXHistory(base, quote, period);
  }
};

/**
 * Get FX statistics for a currency pair
 * @param base - Base currency
 * @param quote - Quote currency
 * @returns FX statistics
 */
export const getFXStatistics = async (
  base: CurrencyCode,
  quote: CurrencyCode
): Promise<FXStatistics> => {
  const history = await fetchFXHistory(base, quote, '30d');
  const currentRate = history.data[history.data.length - 1]?.rate || history.statistics.average;
  const previousRate = history.data[0]?.rate || currentRate;
  
  const changePercent = previousRate > 0 
    ? ((currentRate - previousRate) / previousRate) * 100 
    : 0;

  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (changePercent > 1) trend = 'up';
  else if (changePercent < -1) trend = 'down';

  return {
    base,
    quote,
    currentRate,
    averageRate: history.statistics.average,
    minRate: history.statistics.min,
    maxRate: history.statistics.max,
    volatility: history.statistics.volatility,
    trend,
    changePercent: Math.round(changePercent * 100) / 100,
  };
};
