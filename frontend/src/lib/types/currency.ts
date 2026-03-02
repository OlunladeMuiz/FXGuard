import { z } from 'zod';

/**
 * Currency codes supported by the platform
 * Keep this in sync with backend
 */
export const CurrencyCodeSchema = z.enum([
  'USD',
  'EUR',
  'GBP',
  'NGN',
  'CAD',
  'AUD',
  'JPY',
  'INR',
]);

export type CurrencyCode = z.infer<typeof CurrencyCodeSchema>;

/**
 * FX Rate pair for currency conversion
 */
export const FXRateSchema = z.object({
  base: CurrencyCodeSchema,
  quote: CurrencyCodeSchema,
  rate: z.number().positive('Rate must be positive'),
  timestamp: z.string().datetime(),
});

export type FXRate = z.infer<typeof FXRateSchema>;

/**
 * FX Rate for foreign exchange rates
 */
export const FXRateResponseSchema = z.object({
  data: FXRateSchema.array(),
  timestamp: z.string().datetime(),
});

export type FXRateResponse = z.infer<typeof FXRateResponseSchema>;

/**
 * Currency Display Info
 */
export const CurrencyInfoSchema = z.object({
  code: CurrencyCodeSchema,
  name: z.string(),
  symbol: z.string(),
  decimalPlaces: z.number().int().min(0).max(8),
});

export type CurrencyInfo = z.infer<typeof CurrencyInfoSchema>;
