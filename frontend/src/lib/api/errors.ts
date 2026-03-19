import axios from 'axios';

interface ApiErrorPayload {
  detail?: unknown;
  message?: unknown;
  error?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function formatLocation(location: unknown): string | null {
  if (!Array.isArray(location)) {
    return null;
  }

  const path = location
    .filter((segment) => !['body', 'query', 'path'].includes(String(segment)))
    .map((segment) => String(segment))
    .join('.');

  return path || null;
}

function formatValidationItem(item: unknown): string | null {
  if (typeof item === 'string') {
    return item;
  }

  if (!isRecord(item)) {
    return null;
  }

  const message = typeof item.msg === 'string' ? item.msg : null;
  const location = formatLocation(item.loc);

  if (message && location) {
    return `${location}: ${message}`;
  }

  if (message) {
    return message;
  }

  const nestedDetail = item.detail ?? item.message ?? item.error;
  return nestedDetail === undefined ? null : formatDetail(nestedDetail);
}

function formatDetail(detail: unknown): string | null {
  if (typeof detail === 'string') {
    return detail;
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => formatValidationItem(item))
      .filter((message): message is string => Boolean(message));

    return messages.length > 0 ? messages.join('; ') : null;
  }

  if (isRecord(detail)) {
    return formatValidationItem(detail);
  }

  return null;
}

export function formatApiError(error: unknown, fallback: string): string {
  if (axios.isAxiosError<ApiErrorPayload>(error)) {
    const payload = error.response?.data;
    const detail = payload?.detail ?? payload?.message ?? payload?.error;
    const formatted = detail === undefined ? null : formatDetail(detail);

    if (formatted) {
      return formatted;
    }

    if (typeof error.message === 'string' && error.message) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
