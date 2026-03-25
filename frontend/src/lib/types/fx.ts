import { z } from 'zod';
import { CurrencyCodeSchema } from './currency';

/**
 * Historical FX rate data point
 */
export const FXHistoryPointSchema = z.object({
  date: z.string(),
  rate: z.number().positive(),
  high: z.number().positive().optional(),
  low: z.number().positive().optional(),
  open: z.number().positive().optional(),
  close: z.number().positive().optional(),
});

export type FXHistoryPoint = z.infer<typeof FXHistoryPointSchema>;

/**
 * FX History response schema
 */
export const FXHistoryResponseSchema = z.object({
  pair: z.string(),
  base: CurrencyCodeSchema,
  quote: CurrencyCodeSchema,
  period: z.enum(['1d', '7d', '30d', '90d', '1y']),
  data: z.array(FXHistoryPointSchema),
  statistics: z.object({
    min: z.number().positive(),
    max: z.number().positive(),
    average: z.number().positive(),
    volatility: z.number().min(0).max(1),
    standardDeviation: z.number().nonnegative(),
  }),
  dataPoints: z.number().int().positive(),
  realDataPoints: z.number().int().nonnegative(),
  syntheticDataPoints: z.number().int().nonnegative(),
  containsSynthetic: z.boolean(),
  source: z.string(),
});

export type FXHistoryResponse = z.infer<typeof FXHistoryResponseSchema>;

/**
 * FX Statistics for a currency pair
 */
export const FXStatisticsSchema = z.object({
  base: CurrencyCodeSchema,
  quote: CurrencyCodeSchema,
  currentRate: z.number().positive(),
  averageRate: z.number().positive(),
  minRate: z.number().positive(),
  maxRate: z.number().positive(),
  volatility: z.number().min(0).max(1),
  trend: z.enum(['up', 'down', 'stable']),
  changePercent: z.number(),
});

export type FXStatistics = z.infer<typeof FXStatisticsSchema>;

/**
 * Volatility level enum
 */
export type VolatilityLevel = 'low' | 'medium' | 'high';

/**
 * Get volatility level from numeric value
 */
export const getVolatilityLevel = (volatility: number): VolatilityLevel => {
  if (volatility <= 0.3) return 'low';
  if (volatility <= 0.7) return 'medium';
  return 'high';
};

/**
 * FX conversion result
 */
export const FXConversionResultSchema = z.object({
  fromAmount: z.number().positive(),
  toAmount: z.number().positive(),
  fromCurrency: CurrencyCodeSchema,
  toCurrency: CurrencyCodeSchema,
  rate: z.number().positive(),
  timestamp: z.string().datetime(),
});

export type FXConversionResult = z.infer<typeof FXConversionResultSchema>;

/**
 * Best rate comparison data
 */
export interface BestRateComparisonData {
  currentRate: number;
  bestRate: number;
  bestRateDate: string;
  amountAtCurrentRate: number;
  amountAtBestRate: number;
  difference: number;
  percentageDifference: number;
}

/**
 * Savings estimate data
 */
export interface SavingsEstimate {
  amount: number;
  currentRate: number;
  averageRate: number;
  currentConversion: number;
  averageConversion: number;
  savings: number;
  savingsPercentage: number;
  isPositiveSavings: boolean;
}
