import { z } from 'zod';

/**
 * Recommendation action enum
 */
export const RecommendationActionSchema = z.enum([
  'convert_now',
  'wait',
  'hedge',
  'split_conversion',
]);

export type RecommendationAction = z.infer<typeof RecommendationActionSchema>;

/**
 * Risk level enum
 */
export const RiskLevelSchema = z.enum(['low', 'medium', 'high']);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export const RecommendationFactorSchema = z.object({
  name: z.string(),
  impact: z.enum(['positive', 'negative', 'neutral']),
  description: z.string(),
});

export const RecommendationIndicatorsSchema = z.object({
  currentRate: z.number().positive(),
  avg30Day: z.number().positive(),
  sma7: z.number().positive(),
  sma20: z.number().positive(),
  volatilityPercent: z.number().nonnegative(),
  change7dPercent: z.number(),
  change30dPercent: z.number(),
  rsi14: z.number().min(0).max(100),
  rangePositionPercent: z.number().min(0).max(100),
  trend: z.enum(['upward', 'downward', 'sideways']),
  periodMin: z.number().positive(),
  periodMax: z.number().positive(),
  isNearHigh: z.boolean(),
  isNearLow: z.boolean(),
  isOverbought: z.boolean(),
  isOversold: z.boolean(),
  dataSource: z.enum(['stored_history', 'same_currency', 'candle_history']),
  analyticsMode: z.enum(['insufficient', 'limited', 'full', 'provisional']),
});

/**
 * Recommendation entity schema
 */
export const RecommendationSchema = z.object({
  invoiceId: z.string().uuid().optional(),
  base: z.string().length(3),
  quote: z.string().length(3),
  amount: z.number().positive(),
  status: z.enum(['ready', 'limited_data', 'insufficient_data', 'provisional_data']),
  historyQuality: z.enum(['full', 'mixed', 'seeded', 'same_currency', 'candle_fallback']),
  action: RecommendationActionSchema,
  confidence: z.number().min(0).max(1),
  explanation: z.string(),
  riskScore: z.number().min(0).max(1),
  factors: z.array(RecommendationFactorSchema).optional(),
  optimalWindow: z.string(),
  indicators: RecommendationIndicatorsSchema,
  dataPoints: z.number().int().positive(),
  realDataPoints: z.number().int().nonnegative(),
  syntheticDataPoints: z.number().int().nonnegative(),
  containsSynthetic: z.boolean(),
  generatedAt: z.string().datetime(),
  alternativeActions: z.array(z.object({
    action: RecommendationActionSchema,
    confidence: z.number().min(0).max(1),
    reason: z.string(),
  })).optional(),
  marketConditions: z.object({
    volatility: z.number().min(0).max(1),
    trend: z.enum(['up', 'down', 'stable']),
    momentum: z.number(),
  }).optional(),
  createdAt: z.string().datetime().optional(),
});

export type Recommendation = z.infer<typeof RecommendationSchema>;

/**
 * Recommendation response schema
 */
export const RecommendationResponseSchema = z.object({
  data: RecommendationSchema,
});

export type RecommendationResponse = z.infer<typeof RecommendationResponseSchema>;

/**
 * Get risk level from score
 */
export const getRiskLevelFromScore = (score: number): RiskLevel => {
  if (score <= 0.3) return 'low';
  if (score <= 0.7) return 'medium';
  return 'high';
};

/**
 * Get action display text
 */
export const getActionDisplayText = (action: RecommendationAction): string => {
  const displayMap: Record<RecommendationAction, string> = {
    convert_now: 'Convert Now',
    wait: 'Wait for Better Rate',
    hedge: 'Consider Hedging',
    split_conversion: 'Split Conversion',
  };
  return displayMap[action];
};

/**
 * Get confidence display text
 */
export const getConfidenceDisplayText = (confidence: number): string => {
  if (confidence >= 0.8) return 'Very High';
  if (confidence >= 0.6) return 'High';
  if (confidence >= 0.4) return 'Medium';
  if (confidence >= 0.2) return 'Low';
  return 'Very Low';
};
