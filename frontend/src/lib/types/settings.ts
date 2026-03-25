import { z } from 'zod';

import { CurrencyCodeSchema } from './currency';

export const SettingsSectionSchema = z.enum([
  'profile',
  'business',
  'bank',
  'notifications',
  'integrations',
]);

export type SettingsSection = z.infer<typeof SettingsSectionSchema>;

export const BusinessDetailsSchema = z.object({
  businessName: z.string(),
  ownerFirstName: z.string(),
  ownerLastName: z.string(),
  ownerName: z.string(),
  email: z.string().email(),
  phoneNumber: z.string(),
  country: z.string(),
  defaultCurrency: CurrencyCodeSchema,
  businessType: z.string(),
  registrationDate: z.string(),
  hasMissingFields: z.boolean(),
});

export type BusinessDetails = z.infer<typeof BusinessDetailsSchema>;

export const BusinessDetailsDraftSchema = z.object({
  businessName: z.string().trim().min(2, 'Business name must be at least 2 characters long.'),
  ownerFirstName: z.string().trim().min(2, 'Owner first name must be at least 2 characters long.'),
  ownerLastName: z.string().trim().min(2, 'Owner last name must be at least 2 characters long.'),
  email: z.string().trim().email('Enter a valid business email address.'),
  phoneNumber: z.string().trim().min(7, 'Enter a valid phone number.'),
  country: z.string().trim().min(2, 'Country must be at least 2 characters long.'),
  defaultCurrency: CurrencyCodeSchema,
  businessType: z.string().trim().min(2, 'Business type must be at least 2 characters long.'),
});

export type BusinessDetailsDraft = z.infer<typeof BusinessDetailsDraftSchema>;

export const BankDetailsSchema = z.object({
  bankName: z.string().trim().min(2, 'Bank name must be at least 2 characters long.'),
  accountName: z.string().trim().min(2, 'Account name must be at least 2 characters long.'),
  accountNumber: z.string().trim().regex(/^\d{10,18}$/, 'Account number must be 10 to 18 digits.'),
  currency: CurrencyCodeSchema,
  updatedAt: z.string().datetime(),
});

export type BankDetails = z.infer<typeof BankDetailsSchema>;

export const BankDetailsDraftSchema = BankDetailsSchema.omit({
  updatedAt: true,
});

export type BankDetailsDraft = z.infer<typeof BankDetailsDraftSchema>;

export const NotificationTypeSchema = z.enum(['info', 'warning', 'success']);
export type NotificationType = z.infer<typeof NotificationTypeSchema>;

export const SettingsNotificationSchema = z.object({
  id: z.string(),
  title: z.string(),
  message: z.string(),
  type: NotificationTypeSchema,
  timestamp: z.string().datetime(),
  source: z.enum(['fx_recommendation', 'volatility', 'rate_movement', 'system']),
});

export type SettingsNotification = z.infer<typeof SettingsNotificationSchema>;

export const IntegrationProviderSchema = z.enum(['paystack', 'flutterwave', 'interswitch']);
export type IntegrationProvider = z.infer<typeof IntegrationProviderSchema>;

export const IntegrationStatusSchema = z.enum(['connected', 'not_connected']);
export type IntegrationStatus = z.infer<typeof IntegrationStatusSchema>;

export const IntegrationRecordSchema = z.object({
  provider: IntegrationProviderSchema,
  name: z.string(),
  description: z.string(),
  status: IntegrationStatusSchema,
  connectedAt: z.string().datetime().nullable(),
});

export type IntegrationRecord = z.infer<typeof IntegrationRecordSchema>;

export const IntegrationConnectionPayloadSchema = z.object({
  provider: IntegrationProviderSchema,
  credential: z.string().trim().min(6, 'Enter a valid API key or connection token.'),
});

export type IntegrationConnectionPayload = z.infer<typeof IntegrationConnectionPayloadSchema>;
