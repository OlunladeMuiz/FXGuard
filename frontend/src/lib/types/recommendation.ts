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

/**
 * Recommendation entity schema
 */
export const RecommendationSchema = z.object({
  invoiceId: z.string().uuid(),
  action: RecommendationActionSchema,
  confidence: z.number().min(0).max(1),
  explanation: z.string(),
  riskScore: z.number().min(0).max(1),
  factors: z.array(z.object({
    name: z.string(),
    impact: z.enum(['positive', 'negative', 'neutral']),
    description: z.string(),
  })).optional(),
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
  createdAt: z.string().datetime(),
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
