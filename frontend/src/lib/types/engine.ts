import { z } from 'zod';

export const EnginePeriodSchema = z.enum(['30d', '90d', 'all_time']);
export type EnginePeriod = z.infer<typeof EnginePeriodSchema>;

export const SpreadRiskLevelSchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export type SpreadRiskLevel = z.infer<typeof SpreadRiskLevelSchema>;

export const SpreadResponseSchema = z.object({
  official_rate: z.number().nullable(),
  parallel_rate: z.number().nullable(),
  bdc_rate: z.number().nullable(),
  spread_ngn: z.number().nullable(),
  spread_pct: z.number().nullable(),
  spread_direction: z.string().nullable(),
  risk_level: SpreadRiskLevelSchema.nullable(),
  risk_message: z.string(),
  official_source: z.string().nullable().optional(),
  parallel_source: z.string().nullable().optional(),
  bdc_source: z.string().nullable().optional(),
  recorded_at: z.string().nullable(),
});
export type SpreadResponse = z.infer<typeof SpreadResponseSchema>;

export const BrentSignalSchema = z.object({
  current_price: z.number().nullable(),
  weekly_change_pct: z.number().nullable(),
  signal: z.enum(['POSITIVE', 'NEGATIVE', 'NEUTRAL']),
  risk_flag: z.boolean(),
  message: z.string(),
});
export type BrentSignal = z.infer<typeof BrentSignalSchema>;

export const SourceHealthItemSchema = z.object({
  source: z.string(),
  last_recorded_at: z.string().nullable(),
  is_stale: z.boolean(),
  rate_count_24h: z.number().int().nonnegative(),
  is_configured: z.boolean().default(true),
  note: z.string().nullable().optional(),
});
export type SourceHealthItem = z.infer<typeof SourceHealthItemSchema>;

export const SourceHealthResponseSchema = z.object({
  sources: z.array(SourceHealthItemSchema),
  checked_at: z.string(),
});
export type SourceHealthResponse = z.infer<typeof SourceHealthResponseSchema>;

export const SimulatorRequestSchema = z.object({
  base_currency: z.string().trim().length(3),
  quote_currency: z.string().trim().length(3),
  amount: z.number().positive(),
  lookback_days: z.number().int().min(7).max(365).default(30),
  rate_source: z.string().default('market'),
});
export type SimulatorRequest = z.infer<typeof SimulatorRequestSchema>;

export const SimulatorWaitWindowSchema = z.object({
  horizon_days: z.number().int(),
  eligible_samples: z.number().int(),
  better_rate_probability_pct: z.number().nullable(),
});
export type SimulatorWaitWindow = z.infer<typeof SimulatorWaitWindowSchema>;

export const SimulatorWaitInsightSchema = z.object({
  available: z.boolean(),
  comparable_sample_size: z.number().int(),
  rate_tolerance_pct: z.number().nullable(),
  avg_days_to_better: z.number().nullable(),
  median_days_to_better: z.number().nullable(),
  windows: z.array(SimulatorWaitWindowSchema),
  note: z.string(),
});
export type SimulatorWaitInsight = z.infer<typeof SimulatorWaitInsightSchema>;

export const SimulatorResultSchema = z.object({
  data_available: z.boolean(),
  base_currency: z.string().optional(),
  quote_currency: z.string().optional(),
  amount: z.number().optional(),
  lookback_days: z.number().int().optional(),
  data_points: z.number().int().optional(),
  real_data_points: z.number().int().optional(),
  synthetic_data_points: z.number().int().optional(),
  comparison_data_points: z.number().int().optional(),
  history_quality: z.string().optional(),
  current_rate_source: z.string().optional(),
  current_rate_as_of: z.string().optional(),
  today_rate: z.number().optional(),
  today_converted: z.number().optional(),
  best_rate: z.number().optional(),
  best_rate_date: z.string().optional(),
  best_converted: z.number().optional(),
  worst_rate: z.number().optional(),
  worst_rate_date: z.string().optional(),
  worst_converted: z.number().optional(),
  avg_rate: z.number().optional(),
  avg_converted: z.number().optional(),
  opportunity_cost_vs_best: z.number().optional(),
  opportunity_saved_vs_worst: z.number().optional(),
  opportunity_cost_pct: z.number().optional(),
  current_rate_percentile: z.number().optional(),
  recommendation: z.string().optional(),
  recommendation_reason: z.string().optional(),
  spread_risk: z.string().optional(),
  brent_signal: z.string().optional(),
  quality_note: z.string().optional(),
  wait_insight: SimulatorWaitInsightSchema.optional(),
  error: z.string().optional(),
});
export type SimulatorResult = z.infer<typeof SimulatorResultSchema>;

export const RateAlertDirectionSchema = z.enum(['ABOVE', 'BELOW']);
export type RateAlertDirection = z.infer<typeof RateAlertDirectionSchema>;

export const RateAlertCreateSchema = z.object({
  pair: z.string().trim().min(3),
  target_rate: z.number().positive(),
  direction: RateAlertDirectionSchema,
  rate_source: z.string().default('any'),
  channels: z.array(z.string()).default(['email', 'in_app']),
});
export type RateAlertCreate = z.infer<typeof RateAlertCreateSchema>;

export const RateAlertResponseSchema = z.object({
  id: z.string(),
  pair: z.string(),
  target_rate: z.number().positive(),
  direction: RateAlertDirectionSchema,
  rate_source: z.string(),
  channels: z.string(),
  is_active: z.boolean(),
  is_triggered: z.boolean(),
  triggered_at: z.string().nullable(),
  triggered_rate: z.number().nullable(),
  created_at: z.string(),
});
export type RateAlertResponse = z.infer<typeof RateAlertResponseSchema>;

export const EngineNotificationSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  body: z.string(),
  is_read: z.boolean(),
  created_at: z.string(),
});
export type EngineNotification = z.infer<typeof EngineNotificationSchema>;

export const ConversionLogCreateSchema = z.object({
  base_currency: z.string().trim().length(3),
  quote_currency: z.string().trim().length(3),
  base_amount: z.number().positive(),
  rate_used: z.number().positive(),
  quote_amount: z.number().positive().optional(),
  source: z.string().default('manual'),
  converted_at: z.string().optional(),
  followed_recommendation: z.boolean().optional(),
  notes: z.string().optional(),
});
export type ConversionLogCreate = z.infer<typeof ConversionLogCreateSchema>;

export const ConversionLogRecordSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  pair: z.string(),
  base_currency: z.string(),
  quote_currency: z.string(),
  base_amount: z.number(),
  quote_amount: z.number(),
  rate_used: z.number(),
  source: z.string(),
  converted_at: z.string(),
  followed_recommendation: z.boolean().nullable(),
  optimal_rate_7d: z.number().nullable(),
  optimal_amount_7d: z.number().nullable(),
  lost_amount_7d: z.number().nullable(),
  notes: z.string().nullable(),
  created_at: z.string(),
}).passthrough();
export type ConversionLogRecord = z.infer<typeof ConversionLogRecordSchema>;

export const LostRevenueConversionSchema = z.object({
  id: z.string(),
  date: z.string(),
  base_amount: z.number(),
  rate_used: z.number(),
  optimal_rate: z.number().nullable(),
  difference: z.number(),
  lost_amount: z.number().nullable(),
  outcome: z.enum(['SAVED', 'LOST', 'UNKNOWN']),
  source: z.string(),
});
export type LostRevenueConversion = z.infer<typeof LostRevenueConversionSchema>;

export const LostRevenueReportSchema = z.object({
  user_id: z.string(),
  period: EnginePeriodSchema,
  total_base_converted: z.number(),
  total_quote_received: z.number(),
  total_optimal_quote: z.number(),
  net_position_quote: z.number(),
  avg_rate_used: z.number().optional(),
  avg_optimal_rate: z.number().optional(),
  total_lost_to_timing: z.number().optional(),
  recommendations_followed: z.number().int(),
  recommendations_ignored: z.number().int(),
  conversions: z.array(LostRevenueConversionSchema),
});
export type LostRevenueReport = z.infer<typeof LostRevenueReportSchema>;

export const GarchRiskItemSchema = z.object({
  pair: z.string(),
  window_days: z.number().int(),
  garch_volatility_pct: z.number(),
  realized_volatility_pct: z.number(),
  risk_level: z.string(),
  data_points: z.number().int(),
  last_observed_at: z.string().nullable(),
});
export type GarchRiskItem = z.infer<typeof GarchRiskItemSchema>;

export const SeasonalitySignalSchema = z.object({
  key: z.string(),
  label: z.string(),
  level: z.string(),
  score: z.number(),
  message: z.string(),
});
export type SeasonalitySignal = z.infer<typeof SeasonalitySignalSchema>;

export const SeasonalityResponseSchema = z.object({
  as_of: z.string(),
  composite_score: z.number(),
  composite_level: z.string(),
  signals: z.array(SeasonalitySignalSchema),
});
export type SeasonalityResponse = z.infer<typeof SeasonalityResponseSchema>;

export const NewsHeadlineSchema = z.object({
  title: z.string(),
  source: z.string(),
  url: z.string().nullable().optional(),
  published_at: z.string(),
  sentiment: z.number().nullable().optional(),
});
export type NewsHeadline = z.infer<typeof NewsHeadlineSchema>;

export const NewsSignalResponseSchema = z.object({
  as_of: z.string(),
  headline_count: z.number().int(),
  avg_sentiment: z.number(),
  risk_flag: z.boolean(),
  top_topics: z.array(z.string()),
  headlines: z.array(NewsHeadlineSchema),
});
export type NewsSignalResponse = z.infer<typeof NewsSignalResponseSchema>;

export const ReservesSignalResponseSchema = z.object({
  as_of: z.string(),
  reserves_usd_bn: z.number().nullable(),
  signal: z.string(),
  risk_flag: z.boolean(),
  message: z.string(),
});
export type ReservesSignalResponse = z.infer<typeof ReservesSignalResponseSchema>;

export const InterventionSignalResponseSchema = z.object({
  as_of: z.string(),
  risk_score: z.number(),
  risk_level: z.string(),
  message: z.string(),
  inputs: z.record(z.string(), z.any()),
});
export type InterventionSignalResponse = z.infer<typeof InterventionSignalResponseSchema>;

export const MultiCurrencyExposureItemSchema = z.object({
  currency: z.string(),
  open_amount: z.number(),
  rate_to_reporting: z.number().nullable(),
  open_amount_in_reporting: z.number().nullable(),
});
export type MultiCurrencyExposureItem = z.infer<typeof MultiCurrencyExposureItemSchema>;

export const MultiCurrencyExposureResponseSchema = z.object({
  as_of: z.string(),
  reporting_currency: z.string(),
  total_open_in_reporting: z.number(),
  currencies: z.array(MultiCurrencyExposureItemSchema),
});
export type MultiCurrencyExposureResponse = z.infer<typeof MultiCurrencyExposureResponseSchema>;

export const MonthlySavingsConversionSchema = z.object({
  id: z.string(),
  date: z.string(),
  pair: z.string(),
  base_amount: z.number(),
  rate_used: z.number(),
  optimal_rate: z.number().nullable(),
  lost_amount: z.number().nullable(),
  source: z.string(),
});
export type MonthlySavingsConversion = z.infer<typeof MonthlySavingsConversionSchema>;

export const MonthlySavingsReportSchema = z.object({
  user_id: z.string(),
  year: z.number().int(),
  month: z.number().int(),
  total_base_converted: z.number(),
  total_quote_received: z.number(),
  total_optimal_quote: z.number(),
  total_lost_to_timing: z.number(),
  total_saved_vs_worst: z.number(),
  net_position_quote: z.number(),
  conversions: z.array(MonthlySavingsConversionSchema),
  share_token: z.string(),
});
export type MonthlySavingsReport = z.infer<typeof MonthlySavingsReportSchema>;
