import {
  IntegrationConnectionPayload,
  IntegrationConnectionPayloadSchema,
  IntegrationProvider,
  IntegrationRecord,
  IntegrationRecordSchema,
} from '@/types/settings';

const INTEGRATIONS_STORAGE_KEY = 'fxguard:settings:integrations';

const DEFAULT_INTEGRATIONS: IntegrationRecord[] = [
  {
    provider: 'paystack',
    name: 'Paystack',
    description: 'Accept card and bank payments across Africa and settle into your payout account.',
    status: 'not_connected',
    connectedAt: null,
  },
  {
    provider: 'flutterwave',
    name: 'Flutterwave',
    description: 'Process multi-currency collections and route settlement for cross-border invoices.',
    status: 'not_connected',
    connectedAt: null,
  },
  {
    provider: 'interswitch',
    name: 'Interswitch',
    description: 'Generate enterprise-grade payment links and local payout rails for African SMEs.',
    status: 'not_connected',
    connectedAt: null,
  },
];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function readStoredIntegrations(): IntegrationRecord[] {
  if (typeof window === 'undefined') {
    return DEFAULT_INTEGRATIONS;
  }

  const rawValue = window.localStorage.getItem(INTEGRATIONS_STORAGE_KEY);
  if (!rawValue) {
    return DEFAULT_INTEGRATIONS;
  }

  try {
    const parsed = JSON.parse(rawValue);
    const result = IntegrationRecordSchema.array().safeParse(parsed);
    return result.success ? result.data : DEFAULT_INTEGRATIONS;
  } catch {
    return DEFAULT_INTEGRATIONS;
  }
}

function persistIntegrations(records: IntegrationRecord[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(INTEGRATIONS_STORAGE_KEY, JSON.stringify(records));
}

export async function getIntegrations(): Promise<IntegrationRecord[]> {
  return readStoredIntegrations();
}

export async function connectIntegration(
  payload: IntegrationConnectionPayload,
): Promise<IntegrationRecord[]> {
  const validationResult = IntegrationConnectionPayloadSchema.safeParse(payload);
  if (!validationResult.success) {
    throw new Error(validationResult.error.issues.map((issue) => issue.message).join(' '));
  }

  const validatedPayload = validationResult.data;
  const currentRecords = readStoredIntegrations();
  const nextRecords = currentRecords.map((record) => (
    record.provider === validatedPayload.provider
      ? IntegrationRecordSchema.parse({
          ...record,
          status: 'connected',
          connectedAt: new Date().toISOString(),
        })
      : record
  ));

  if (typeof window !== 'undefined') {
    await delay(900);
    persistIntegrations(nextRecords);
  }

  return nextRecords;
}

export async function hasConnectedIntegration(): Promise<boolean> {
  const records = await getIntegrations();
  return records.some((record) => record.status === 'connected');
}

export function getProviderDisplayName(provider: IntegrationProvider): string {
  return DEFAULT_INTEGRATIONS.find((record) => record.provider === provider)?.name ?? provider;
}
