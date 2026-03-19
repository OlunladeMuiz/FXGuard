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
 * Uses Frankfurter API for real market data
 */

// Flag to enable mock mode (set to true for development without backend)
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true' || false;

// Frankfurter API base URL (free, no API key needed)
const FRANKFURTER_API = 'https://api.frankfurter.dev/v1';

const FRANKFURTER_SUPPORTED_CURRENCIES = new Set([
  'AUD', 'BRL', 'CAD', 'CHF', 'CNY', 'CZK', 'DKK', 'EUR', 'GBP', 'HKD',
  'HUF', 'IDR', 'ILS', 'INR', 'ISK', 'JPY', 'KRW', 'MXN', 'MYR', 'NOK',
  'NZD', 'PHP', 'PLN', 'RON', 'SEK', 'SGD', 'THB', 'TRY', 'USD', 'ZAR',
]);

const FALLBACK_USD_REFERENCE_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.91,
  GBP: 0.79,
  NGN: 1550,
  CAD: 1.35,
  AUD: 1.52,
};

interface FrankfurterSnapshot {
  date: string;
  rates: Record<string, number>;
}

function buildFrankfurterUrl(path: string, base: string, symbols: string[]): string {
  const url = new URL(`${FRANKFURTER_API}/${path}`);
  url.searchParams.set('base', base);
  if (symbols.length > 0) {
    url.searchParams.set('symbols', symbols.join(','));
  }
  return url.toString();
}

function getFallbackSnapshot(base: string, quotes: string[]): FrankfurterSnapshot | null {
  const baseReferenceRate = FALLBACK_USD_REFERENCE_RATES[base];
  if (!baseReferenceRate) {
    return null;
  }

  const rates = quotes.reduce<Record<string, number>>((acc, quote) => {
    const quoteReferenceRate = FALLBACK_USD_REFERENCE_RATES[quote];
    if (!quoteReferenceRate) {
      return acc;
    }

    acc[quote] = quoteReferenceRate / baseReferenceRate;
    return acc;
  }, {});

  if (Object.keys(rates).length !== quotes.length) {
    return null;
  }

  return {
    date: new Date().toISOString().slice(0, 10),
    rates,
  };
}

async function fetchFrankfurterSnapshot(
  base: string,
  quotes: string[],
  path = 'latest',
): Promise<FrankfurterSnapshot> {
  const normalizedBase = base.toUpperCase();
  const normalizedQuotes = quotes.map((quote) => quote.toUpperCase());
  const hasUnsupportedCurrency = [normalizedBase, ...normalizedQuotes].some(
    (currency) => !FRANKFURTER_SUPPORTED_CURRENCIES.has(currency),
  );

  if (hasUnsupportedCurrency) {
    const fallback = getFallbackSnapshot(normalizedBase, normalizedQuotes);
    if (fallback) {
      return fallback;
    }

    throw new Error(`Unsupported Frankfurter currency pair: ${normalizedBase}/${normalizedQuotes.join(',')}`);
  }

  const response = await fetch(buildFrankfurterUrl(path, normalizedBase, normalizedQuotes));

  if (!response.ok) {
    throw new Error(`Frankfurter API error: ${response.status}`);
  }

  const data = await response.json();

  return {
    date: data.date ?? new Date().toISOString().slice(0, 10),
    rates: data.rates ?? {},
  };
}

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

/**
 * Fetch REAL FX history from Frankfurter API
 * @param base - Base currency (e.g., 'USD')
 * @param quote - Quote currency (e.g., 'EUR')
 * @param period - Time period: '1d' | '7d' | '30d' | '90d' | '1y'
 * @returns Real FX history data with statistics
 */
export const fetchRealFXHistory = async (
  base: string,
  quote: string,
  period: '1d' | '7d' | '30d' | '90d' | '1y' = '7d'
): Promise<FXHistoryResponse> => {
  const normalizedBase = base.toUpperCase();
  const normalizedQuote = quote.toUpperCase();
  const periodDays: Record<string, number> = {
    '1d': 1,
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365,
  };

  const days = periodDays[period] || 7;
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);

  const formatDate = (d: Date) => d.toISOString().slice(0, 10);

  try {
    // Fetch historical rates from Frankfurter API
    const url = buildFrankfurterUrl(
      `${formatDate(startDate)}..${formatDate(endDate)}`,
      normalizedBase,
      [normalizedQuote],
    );
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Frankfurter API error: ${response.status}`);
    }

    const data = await response.json();
    const rates: FXHistoryPoint[] = [];
    const rateValues: number[] = [];

    // Parse the response - Frankfurter returns { rates: { "2024-01-01": { EUR: 0.91 }, ... } }
    if (data.rates) {
      const sortedDates = Object.keys(data.rates).sort();
      
      for (const dateStr of sortedDates) {
        const rate = data.rates[dateStr][normalizedQuote];
        if (rate !== undefined) {
          rateValues.push(rate);
          
          // Generate realistic OHLC from the close rate
          const variance = rate * 0.002; // 0.2% variance for high/low
          rates.push({
            date: new Date(dateStr).toISOString(),
            rate: Math.round(rate * 100000) / 100000,
            open: Math.round((rate - variance * 0.5) * 100000) / 100000,
            high: Math.round((rate + variance) * 100000) / 100000,
            low: Math.round((rate - variance) * 100000) / 100000,
            close: Math.round(rate * 100000) / 100000,
          });
        }
      }
    }

    // Calculate statistics
    const min = Math.min(...rateValues);
    const max = Math.max(...rateValues);
    const average = rateValues.reduce((a, b) => a + b, 0) / rateValues.length;
    const volatility = calculateVolatility(rateValues);
    
    const squaredDiffs = rateValues.map(r => Math.pow(r - average, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / rateValues.length;
    const standardDeviation = Math.sqrt(avgSquaredDiff);

    return {
      base: normalizedBase as CurrencyCode,
      quote: normalizedQuote as CurrencyCode,
      period: period as '7d' | '30d' | '90d' | '1y',
      data: rates,
      statistics: {
        min: Math.round(min * 100000) / 100000,
        max: Math.round(max * 100000) / 100000,
        average: Math.round(average * 100000) / 100000,
        volatility: Math.round(volatility * 1000) / 1000,
        standardDeviation: Math.round(standardDeviation * 100000) / 100000,
      },
    };
  } catch (error) {
    console.error('[Frankfurter API] Error fetching FX history:', error);
    // Fallback to mock data if API fails
    return generateMockFXHistory(normalizedBase as CurrencyCode, normalizedQuote as CurrencyCode, period === '1d' ? '7d' : period as '7d' | '30d' | '90d' | '1y');
  }
};

/**
 * Fetch current REAL FX rate from Frankfurter API
 * @param base - Base currency
 * @param quote - Quote currency
 * @returns Current exchange rate
 */
export const fetchRealFXRate = async (
  base: string,
  quote: string
): Promise<{ rate: number; date: string }> => {
  const normalizedQuote = quote.toUpperCase();
  try {
    const data = await fetchFrankfurterSnapshot(base, [quote]);
    return {
      rate: data.rates[normalizedQuote],
      date: data.date,
    };
  } catch (error) {
    console.error('[Frankfurter API] Error fetching current rate:', error);
    throw error;
  }
};

export const fetchRealFXRateOnDate = async (
  base: string,
  quote: string,
  date: string,
): Promise<{ rate: number; date: string }> => {
  const normalizedQuote = quote.toUpperCase();
  try {
    const data = await fetchFrankfurterSnapshot(base, [quote], date);
    return {
      rate: data.rates[normalizedQuote],
      date: data.date,
    };
  } catch (error) {
    console.error('[Frankfurter API] Error fetching dated rate:', error);
    throw error;
  }
};

export const fetchRealFXSnapshot = async (
  base: string,
  quotes: string[],
  date = 'latest',
): Promise<FrankfurterSnapshot> => {
  try {
    return await fetchFrankfurterSnapshot(base, quotes, date);
  } catch (error) {
    console.error('[Frankfurter API] Error fetching snapshot:', error);
    throw error;
  }
};
