import { z } from 'zod';
import { CurrencyCodeSchema } from './currency';

/**
 * Target currencies supported for invoice conversion
 */
export const TargetCurrencySchema = z.enum(['NGN', 'GBP', 'EUR']);
export type TargetCurrency = z.infer<typeof TargetCurrencySchema>;

/**
 * Invoice status enum
 */
export const InvoiceStatusSchema = z.enum([
  'pending',
  'paid',
  'overdue',
  'cancelled',
]);
export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>;

/**
 * Invoice creation payload schema
 */
export const CreateInvoiceSchema = z.object({
  clientName: z
    .string()
    .min(1, 'Client name is required')
    .max(100, 'Client name must be 100 characters or less'),
  amount: z
    .number()
    .positive('Amount must be positive')
    .min(0.01, 'Minimum amount is 0.01'),
  baseCurrency: z.literal('USD'),
  targetCurrency: TargetCurrencySchema,
  dueDate: z.string().datetime({ message: 'Invalid date format' }),
});

export type CreateInvoicePayload = z.infer<typeof CreateInvoiceSchema>;

/**
 * Invoice entity schema
 */
export const InvoiceSchema = z.object({
  id: z.string().uuid(),
  clientName: z.string(),
  amount: z.number().positive(),
  baseCurrency: CurrencyCodeSchema,
  targetCurrency: CurrencyCodeSchema,
  dueDate: z.string().datetime(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
  status: InvoiceStatusSchema.default('pending'),
  convertedAmount: z.number().optional(),
  conversionRate: z.number().optional(),
});

export type Invoice = z.infer<typeof InvoiceSchema>;

/**
 * Invoice list response schema
 */
export const InvoiceListResponseSchema = z.object({
  data: z.array(InvoiceSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});

export type InvoiceListResponse = z.infer<typeof InvoiceListResponseSchema>;

/**
 * Single invoice response schema
 */
export const InvoiceResponseSchema = z.object({
  data: InvoiceSchema,
});

export type InvoiceResponse = z.infer<typeof InvoiceResponseSchema>;

/**
 * Invoice form data (for frontend form handling)
 */
export interface InvoiceFormData {
  clientName: string;
  amount: string;
  baseCurrency: 'USD';
  targetCurrency: TargetCurrency;
  dueDate: string;
}

/**
 * Convert form data to API payload
 */
export const formDataToPayload = (formData: InvoiceFormData): CreateInvoicePayload => ({
  clientName: formData.clientName.trim(),
  amount: parseFloat(formData.amount),
  baseCurrency: formData.baseCurrency,
  targetCurrency: formData.targetCurrency,
  dueDate: new Date(formData.dueDate).toISOString(),
});
