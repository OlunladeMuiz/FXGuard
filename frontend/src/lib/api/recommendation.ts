import { z } from 'zod';

import client from './client';
import {
  Recommendation,
  RecommendationActionSchema,
} from '@/types/recommendation';

const RawRecommendationSchema = z.object({
  base: z.string().length(3),
  quote: z.string().length(3),
  amount: z.number().positive(),
  status: z.enum(['ready', 'limited_data', 'insufficient_data', 'provisional_data']),
  history_quality: z.enum(['full', 'mixed', 'seeded', 'same_currency', 'candle_fallback']),
  action: RecommendationActionSchema,
  confidence: z.number().min(0).max(1),
  explanation: z.string(),
  risk_score: z.number().min(0).max(1),
  factors: z.array(z.object({
    name: z.string(),
    impact: z.enum(['positive', 'negative', 'neutral']),
    description: z.string(),
  })),
  optimal_window: z.string(),
  indicators: z.object({
    current_rate: z.number().positive(),
    avg_30_day: z.number().positive(),
    sma_7: z.number().positive(),
    sma_20: z.number().positive(),
    volatility_percent: z.number().nonnegative(),
    change_7d_percent: z.number(),
    change_30d_percent: z.number(),
    rsi_14: z.number().min(0).max(100),
    range_position_percent: z.number().min(0).max(100),
    trend: z.enum(['upward', 'downward', 'sideways']),
    period_min: z.number().positive(),
    period_max: z.number().positive(),
    is_near_high: z.boolean(),
    is_near_low: z.boolean(),
    is_overbought: z.boolean(),
    is_oversold: z.boolean(),
    data_source: z.enum(['stored_history', 'same_currency', 'candle_history']),
    analytics_mode: z.enum(['insufficient', 'limited', 'full', 'provisional']),
  }),
  data_points: z.number().int().positive(),
  real_data_points: z.number().int().nonnegative(),
  synthetic_data_points: z.number().int().nonnegative(),
  contains_synthetic: z.boolean(),
  generated_at: z.string().datetime(),
});

const mapRecommendationResponse = (
  raw: z.infer<typeof RawRecommendationSchema>,
): Recommendation => {
  const normalizedVolatility = Math.min(raw.indicators.volatility_percent / 5, 1);
  const marketTrend =
    raw.indicators.trend === 'upward'
      ? 'up'
      : raw.indicators.trend === 'downward'
        ? 'down'
        : 'stable';

  return {
    base: raw.base,
    quote: raw.quote,
    amount: raw.amount,
    status: raw.status,
    historyQuality: raw.history_quality,
    action: raw.action,
    confidence: raw.confidence,
    explanation: raw.explanation,
    riskScore: raw.risk_score,
    factors: raw.factors,
    optimalWindow: raw.optimal_window,
    indicators: {
      currentRate: raw.indicators.current_rate,
      avg30Day: raw.indicators.avg_30_day,
      sma7: raw.indicators.sma_7,
      sma20: raw.indicators.sma_20,
      volatilityPercent: raw.indicators.volatility_percent,
      change7dPercent: raw.indicators.change_7d_percent,
      change30dPercent: raw.indicators.change_30d_percent,
      rsi14: raw.indicators.rsi_14,
      rangePositionPercent: raw.indicators.range_position_percent,
      trend: raw.indicators.trend,
      periodMin: raw.indicators.period_min,
      periodMax: raw.indicators.period_max,
      isNearHigh: raw.indicators.is_near_high,
      isNearLow: raw.indicators.is_near_low,
      isOverbought: raw.indicators.is_overbought,
      isOversold: raw.indicators.is_oversold,
      dataSource: raw.indicators.data_source,
      analyticsMode: raw.indicators.analytics_mode,
    },
    dataPoints: raw.data_points,
    realDataPoints: raw.real_data_points,
    syntheticDataPoints: raw.synthetic_data_points,
    containsSynthetic: raw.contains_synthetic,
    generatedAt: raw.generated_at,
    createdAt: raw.generated_at,
    marketConditions: {
      volatility: normalizedVolatility,
      trend: marketTrend,
      momentum: raw.indicators.change_7d_percent / 100,
    },
  };
};

export const fetchRecommendation = async (
  base: string,
  quote: string,
  amount: number = 10000,
): Promise<Recommendation> => {
  const response = await client.get(`/recommendation/${base}/${quote}`, {
    params: { amount },
  });
  return mapRecommendationResponse(RawRecommendationSchema.parse(response.data));
};

export const refreshRecommendation = async (
  base: string,
  quote: string,
  amount: number = 10000,
): Promise<Recommendation> => {
  return fetchRecommendation(base, quote, amount);
};
