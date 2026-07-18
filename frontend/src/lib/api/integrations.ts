import client from './client';
import {
  IntegrationConnectionPayload,
  IntegrationConnectionPayloadSchema,
  IntegrationProvider,
  IntegrationRecord,
  IntegrationRecordSchema,
} from '@/types/settings';

function normalizeIntegration(record: any): IntegrationRecord {
  const rawConnectedAt = record.connected_at ?? record.connectedAt ?? null;
  let connectedAt: string | null = null;
  if (typeof rawConnectedAt === 'string' && rawConnectedAt.trim()) {
    const parsed = Date.parse(rawConnectedAt);
    connectedAt = Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
  }

  return IntegrationRecordSchema.parse({
    provider: record.provider,
    name: record.name,
    description: record.description,
    status: record.status,
    connectedAt,
    credentialHint: record.credential_hint ?? record.credentialHint ?? null,
  });
}

export async function getIntegrations(): Promise<IntegrationRecord[]> {
  const response = await client.get('/integrations');
  const payload = Array.isArray(response.data) ? response.data : [];
  return payload.map((record) => normalizeIntegration(record));
}

export async function connectIntegration(
  payload: IntegrationConnectionPayload,
): Promise<IntegrationRecord[]> {
  const validationResult = IntegrationConnectionPayloadSchema.safeParse(payload);
  if (!validationResult.success) {
    throw new Error(validationResult.error.issues.map((issue) => issue.message).join(' '));
  }

  const response = await client.post('/integrations/connect', validationResult.data);
  const updated = normalizeIntegration(response.data);
  const current = await getIntegrations();
  return current.map((record) => (record.provider === updated.provider ? updated : record));
}

export async function hasConnectedIntegration(): Promise<boolean> {
  const records = await getIntegrations();
  return records.some((record) => record.status === 'connected');
}

export function getProviderDisplayName(provider: IntegrationProvider): string {
  const labelMap: Record<IntegrationProvider, string> = {
    paystack: 'Paystack',
    stripe: 'Stripe',
    paypal: 'PayPal',
    interswitch: 'Interswitch',
  };
  return labelMap[provider] ?? provider;
}
