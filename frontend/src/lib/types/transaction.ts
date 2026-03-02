import { z } from 'zod';
import { CurrencyCodeSchema } from './currency';

/**
 * Transaction type
 */
export const TransactionTypeSchema = z.enum([
  'transfer',
  'conversion',
  'deposit',
  'withdrawal',
  'fee',
  'reversal',
]);

export type TransactionType = z.infer<typeof TransactionTypeSchema>;

/**
 * Transaction status
 */
export const TransactionStatusSchema = z.enum([
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled',
]);

export type TransactionStatus = z.infer<typeof TransactionStatusSchema>;

/**
 * Individual transaction
 */
export const TransactionSchema = z.object({
  id: z.string().uuid(),
  walletId: z.string().uuid(),
  type: TransactionTypeSchema,
  status: TransactionStatusSchema,
  amount: z.number().positive('Amount must be positive'),
  currency: CurrencyCodeSchema,
  description: z.string().optional(),
  reference: z.string().optional(),
  fee: z.number().nonnegative().optional(),
  relatedTransactionId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Transaction = z.infer<typeof TransactionSchema>;

/**
 * Transaction response
 */
export const TransactionResponseSchema = z.object({
  data: TransactionSchema,
  status: z.literal('success'),
});

export type TransactionResponse = z.infer<typeof TransactionResponseSchema>;

/**
 * Multiple transactions response
 */
export const TransactionListResponseSchema = z.object({
  data: z.array(TransactionSchema),
  status: z.literal('success'),
  pagination: z.object({
    total: z.number().int(),
    page: z.number().int(),
    limit: z.number().int(),
  }),
});

export type TransactionListResponse = z.infer<
  typeof TransactionListResponseSchema
>;
