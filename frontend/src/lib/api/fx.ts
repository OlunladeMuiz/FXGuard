import { z } from 'zod';

import client from './client';
import { getMockFXRates } from './mockData';
import { CurrencyCode, FXRateResponseSchema } from '@/types/currency';
import {
  FXHistoryPoint,
  FXHistoryResponse,
  FXHistoryResponseSchema,
  FXStatistics,
} from '@/types/fx';
import { calculateVolatility } from '@/utils/calculations';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true' || false;

type HistoryPeriod = '1d' | '7d' | '30d' | '90d' | '1y';
type CandleInterval = '1min' | '5min' | '15min' | '30min' | '1h' | '4h' | '1day' | '1week';

const RawFXRateItemSchema = z.object({
  base: z.string().length(3),
  quote: z.string().length(3),
  rate: z.number().positive(),
  timestamp: z.string().datetime(),
  observed_on: z.string(),
  source: z.string(),
  is_synthetic: z.boolean(),
});

const RawFXRatesResponseSchema = z.object({
  data: z.array(RawFXRateItemSchema),
  timestamp: z.string().datetime(),
});

const RawFXHistoryResponseSchema = z.object({
  pair: z.string(),
  base: z.string().length(3),
  quote: z.string().length(3),
  period: z.enum(['1d', '7d', '30d', '90d', '1y']),
  data: z.array(z.object({
    date: z.string(),
    rate: z.number().positive(),
  })),
  stats: z.object({
    min: z.number().positive(),
    max: z.number().positive(),
    avg: z.number().positive(),
    volatility: z.number().min(0).max(1),
    standard_deviation: z.number().nonnegative(),
  }),
  data_points: z.number().int().positive(),
  real_data_points: z.number().int().nonnegative(),
  synthetic_data_points: z.number().int().nonnegative(),
  contains_synthetic: z.boolean(),
  source: z.string(),
});

const RawFXCandlesResponseSchema = z.object({
  pair: z.string(),
  base: z.string().length(3),
  quote: z.string().length(3),
  range: z.enum(['1d', '7d', '30d', '90d', '1y']),
  interval: z.enum(['1min', '5min', '15min', '30min', '1h', '4h', '1day', '1week']),
  data: z.array(z.object({
    timestamp: z.string().datetime(),
    open: z.number().positive(),
    high: z.number().positive(),
    low: z.number().positive(),
    close: z.number().positive(),
    source: z.string(),
  })),
  stats: z.object({
    min: z.number().positive(),
    max: z.number().positive(),
    avg: z.number().positive(),
    volatility: z.number().min(0).max(1),
    standard_deviation: z.number().nonnegative(),
    change_percent: z.number(),
  }),
  data_points: z.number().int().positive(),
  source: z.string(),
});

interface BackendRateSnapshot {
  date: string;
  rates: Record<string, number>;
}

interface FetchRatesParams {
  base: CurrencyCode;
  quotes?: CurrencyCode[] | undefined;
}

const normalizeHistoryPoint = (point: z.infer<typeof RawFXHistoryResponseSchema>['data'][number]): FXHistoryPoint => ({
  date: new Date(`${point.date}T00:00:00.000Z`).toISOString(),
  rate: point.rate,
  open: point.rate,
  high: point.rate,
  low: point.rate,
  close: point.rate,
});

const mapHistoryResponse = (
  raw: z.infer<typeof RawFXHistoryResponseSchema>,
): FXHistoryResponse => {
  const normalized = {
    pair: raw.pair,
    base: raw.base,
    quote: raw.quote,
    period: raw.period,
    data: raw.data.map(normalizeHistoryPoint),
    statistics: {
      min: raw.stats.min,
      max: raw.stats.max,
      average: raw.stats.avg,
      volatility: raw.stats.volatility,
      standardDeviation: raw.stats.standard_deviation,
    },
    dataPoints: raw.data_points,
    realDataPoints: raw.real_data_points,
    syntheticDataPoints: raw.synthetic_data_points,
    containsSynthetic: raw.contains_synthetic,
    source: raw.source,
  };

  return FXHistoryResponseSchema.parse(normalized);
};

const mapCandleResponse = (
  raw: z.infer<typeof RawFXCandlesResponseSchema>,
): FXHistoryResponse => {
  const normalized = {
    pair: raw.pair,
    base: raw.base,
    quote: raw.quote,
    period: raw.range,
    data: raw.data.map((item) => ({
      date: item.timestamp,
      rate: item.close,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
    })),
    statistics: {
      min: raw.stats.min,
      max: raw.stats.max,
      average: raw.stats.avg,
      volatility: raw.stats.volatility,
      standardDeviation: raw.stats.standard_deviation,
    },
    dataPoints: raw.data_points,
    realDataPoints: raw.data_points,
    syntheticDataPoints: 0,
    containsSynthetic: false,
    source: raw.source,
  };

  return FXHistoryResponseSchema.parse(normalized);
};

function getCandleIntervalForRange(range: HistoryPeriod): CandleInterval {
  switch (range) {
    case '1d':
      return '1h';
    case '7d':
      return '4h';
    case '30d':
    case '90d':
    case '1y':
      return '1day';
    default:
      return '1day';
  }
}

const generateMockFXHistory = (
  base: CurrencyCode,
  quote: CurrencyCode,
  period: Exclude<HistoryPeriod, '1d'> | '1d',
): FXHistoryResponse => {
  const periodDays: Record<HistoryPeriod, number> = {
    '1d': 1,
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365,
  };

  const baseRates: Record<string, number> = {
    'USD-NGN': 1550,
    'USD-EUR': 0.91,
    'USD-GBP': 0.79,
    'EUR-USD': 1.1,
    'GBP-USD': 1.27,
  };

  const pairKey = `${base}-${quote}`;
  const baseRate = baseRates[pairKey] || 1;
  const days = periodDays[period];
  const volatilityFactor = quote === 'NGN' ? 0.05 : 0.02;

  const data: FXHistoryPoint[] = [];
  const rates: number[] = [];
  const now = new Date();

  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(now);
    date.setDate(date.getDate() - index);

    const trendFactor = 1 + ((days - index) / Math.max(days, 1)) * 0.02;
    const randomFactor = 1 + (Math.random() - 0.5) * volatilityFactor * 2;
    const rate = baseRate * trendFactor * randomFactor;

    rates.push(rate);
    data.push({
      date: date.toISOString(),
      rate: Math.round(rate * 10000) / 10000,
      open: Math.round(rate * 10000) / 10000,
      high: Math.round(rate * 10000) / 10000,
      low: Math.round(rate * 10000) / 10000,
      close: Math.round(rate * 10000) / 10000,
    });
  }

  const average = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
  const squaredDiffs = rates.map((rate) => Math.pow(rate - average, 2));
  const avgSquaredDiff = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / rates.length;
  const standardDeviation = Math.sqrt(avgSquaredDiff);

  return FXHistoryResponseSchema.parse({
    pair: `${base}/${quote}`,
    base,
    quote,
    period,
    data,
    statistics: {
      min: Math.min(...rates),
      max: Math.max(...rates),
      average,
      volatility: calculateVolatility(rates),
      standardDeviation,
    },
    dataPoints: data.length,
    realDataPoints: 0,
    syntheticDataPoints: data.length,
    containsSynthetic: true,
    source: 'mock',
  });
};

export const fetchFXRates = async (params: FetchRatesParams) => {
  if (USE_MOCK) {
    return getMockFXRates(params.base, params.quotes);
  }

  try {
    const response = await client.get('/fx/rates', {
      params: {
        base: params.base,
        quotes: params.quotes?.join(','),
      },
    });

    const raw = RawFXRatesResponseSchema.parse(response.data);
    const normalized = {
      data: raw.data.map((item) => ({
        base: item.base as CurrencyCode,
        quote: item.quote as CurrencyCode,
        rate: item.rate,
        timestamp: item.timestamp,
      })),
      timestamp: raw.timestamp,
    };

    return FXRateResponseSchema.parse(normalized).data;
  } catch (error) {
    console.warn('[API] FX rates fetch failed, using mock data', error);
    return getMockFXRates(params.base, params.quotes);
  }
};

export const getConversionRate = async (
  base: CurrencyCode,
  quote: CurrencyCode,
): Promise<number> => {
  const rates = await fetchFXRates({
    base,
    quotes: [quote],
  });

  const rate = rates.find((item) => item.base === base && item.quote === quote);
  if (!rate) {
    throw new Error(`Conversion rate not found for ${base}/${quote}`);
  }

  return rate.rate;
};

export const convertAmount = async (
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
): Promise<number> => {
  const rate = await getConversionRate(from, to);
  return Math.round(amount * rate * 100) / 100;
};

export const fetchHistoricalRates = async (
  base: CurrencyCode,
  startDate: string,
  endDate: string,
) => {
  void startDate;
  void endDate;
  return fetchFXRates({ base });
};

export const fetchFXHistory = async (
  base: CurrencyCode,
  quote: CurrencyCode,
  period: HistoryPeriod = '30d',
): Promise<FXHistoryResponse> => {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return generateMockFXHistory(base, quote, period);
  }

  try {
    const response = await client.get('/fx/history', {
      params: { base, quote, period },
    });
    const raw = RawFXHistoryResponseSchema.parse(response.data);
    return mapHistoryResponse(raw);
  } catch (error) {
    console.warn('[API] FX history fetch failed, using mock data', error);
    return generateMockFXHistory(base, quote, period);
  }
};

export const getFXStatistics = async (
  base: CurrencyCode,
  quote: CurrencyCode,
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

export const fetchRealFXHistory = async (
  base: string,
  quote: string,
  period: HistoryPeriod = '7d',
): Promise<FXHistoryResponse> => {
  const normalizedBase = base.toUpperCase() as CurrencyCode;
  const normalizedQuote = quote.toUpperCase() as CurrencyCode;
  return fetchFXHistory(normalizedBase, normalizedQuote, period);
};

export const fetchRealFXCandles = async (
  base: string,
  quote: string,
  range: HistoryPeriod = '7d',
): Promise<FXHistoryResponse> => {
  const normalizedBase = base.toUpperCase() as CurrencyCode;
  const normalizedQuote = quote.toUpperCase() as CurrencyCode;

  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return generateMockFXHistory(normalizedBase, normalizedQuote, range);
  }

  const response = await client.get('/fx/candles', {
    params: {
      base: normalizedBase,
      quote: normalizedQuote,
      range,
      interval: getCandleIntervalForRange(range),
    },
  });
  const raw = RawFXCandlesResponseSchema.parse(response.data);
  return mapCandleResponse(raw);
};

const fetchSnapshotRates = async (
  base: string,
  quotes: string[],
  date?: string,
): Promise<z.infer<typeof RawFXRatesResponseSchema>> => {
  if (USE_MOCK) {
    const mockRates = getMockFXRates(
      base.toUpperCase() as CurrencyCode,
      quotes.map((quote) => quote.toUpperCase() as CurrencyCode),
    );
    const observedOn = date ?? new Date().toISOString().slice(0, 10);
    return RawFXRatesResponseSchema.parse({
      data: [
        {
          base: base.toUpperCase(),
          quote: base.toUpperCase(),
          rate: 1,
          timestamp: new Date(`${observedOn}T00:00:00.000Z`).toISOString(),
          observed_on: observedOn,
          source: 'mock',
          is_synthetic: false,
        },
        ...mockRates.map((rate) => ({
          base: rate.base,
          quote: rate.quote,
          rate: rate.rate,
          timestamp: rate.timestamp,
          observed_on: observedOn,
          source: 'mock',
          is_synthetic: false,
        })),
      ],
      timestamp: new Date().toISOString(),
    });
  }

  const response = await client.get('/fx/rates', {
    params: {
      base: base.toUpperCase(),
      quotes: quotes.map((quote) => quote.toUpperCase()).join(','),
      ...(date ? { date } : {}),
    },
  });
  return RawFXRatesResponseSchema.parse(response.data);
};

export const fetchRealFXRate = async (
  base: string,
  quote: string,
): Promise<{ rate: number; date: string }> => {
  const normalizedQuote = quote.toUpperCase();
  const snapshot = await fetchSnapshotRates(base, [normalizedQuote]);
  const rate = snapshot.data.find((item) => item.quote === normalizedQuote)?.rate;
  const observedOn = snapshot.data.find((item) => item.quote === normalizedQuote)?.observed_on;

  if (rate === undefined || !observedOn) {
    throw new Error(`Conversion rate not found for ${base}/${quote}`);
  }

  return {
    rate,
    date: observedOn,
  };
};

export const fetchRealFXRateOnDate = async (
  base: string,
  quote: string,
  date: string,
): Promise<{ rate: number; date: string }> => {
  const normalizedQuote = quote.toUpperCase();
  const snapshot = await fetchSnapshotRates(base, [normalizedQuote], date);
  const rate = snapshot.data.find((item) => item.quote === normalizedQuote)?.rate;
  const observedOn = snapshot.data.find((item) => item.quote === normalizedQuote)?.observed_on;

  if (rate === undefined || !observedOn) {
    throw new Error(`Conversion rate not found for ${base}/${quote} on ${date}`);
  }

  return {
    rate,
    date: observedOn,
  };
};

export const fetchRealFXSnapshot = async (
  base: string,
  quotes: string[],
  date = 'latest',
): Promise<BackendRateSnapshot> => {
  const snapshot = await fetchSnapshotRates(base, quotes, date === 'latest' ? undefined : date);
  const rateMap = snapshot.data.reduce<Record<string, number>>((acc, item) => {
    if (item.quote !== item.base) {
      acc[item.quote] = item.rate;
    }
    return acc;
  }, {});

  const firstObservedOn = snapshot.data.find((item) => item.quote !== item.base)?.observed_on
    ?? new Date().toISOString().slice(0, 10);

  return {
    date: firstObservedOn,
    rates: rateMap,
  };
};
