import { z } from 'zod';
import { CurrencyCodeSchema } from './currency';

/**
 * Wallet balance for a single currency
 */
export const BalanceSchema = z.object({
  currency: CurrencyCodeSchema,
  amount: z.number().nonnegative('Balance cannot be negative'),
  locked: z.number().nonnegative('Locked amount cannot be negative').optional(),
});

export type Balance = z.infer<typeof BalanceSchema>;

/**
 * Multi-currency wallet
 */
export const WalletSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  balances: z.array(BalanceSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  status: z.enum(['active', 'suspended', 'closed']),
});

export type Wallet = z.infer<typeof WalletSchema>;

/**
 * Wallet response from API
 */
export const WalletResponseSchema = z.object({
  data: WalletSchema,
  status: z.literal('success'),
});

export type WalletResponse = z.infer<typeof WalletResponseSchema>;

/**
 * Multiple wallets response (for future use)
 */
export const WalletListResponseSchema = z.object({
  data: z.array(WalletSchema),
  status: z.literal('success'),
  pagination: z
    .object({
      total: z.number().int(),
      page: z.number().int(),
      limit: z.number().int(),
    })
    .optional(),
});

export type WalletListResponse = z.infer<typeof WalletListResponseSchema>;
