const rawApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

if (!rawApiUrl) {
  throw new Error('Missing required env var: NEXT_PUBLIC_API_URL');
}

function normalizeApiUrl(value: string): string {
  const trimmedValue = value.replace(/\/+$/, '');

  try {
    const url = new URL(trimmedValue);
    const pathname = url.pathname.replace(/\/+$/, '');

    if (!pathname || pathname === '/') {
      url.pathname = '/api';
    } else if (pathname !== '/api' && !pathname.endsWith('/api')) {
      url.pathname = `${pathname}/api`;
    } else {
      url.pathname = pathname;
    }

    return url.toString().replace(/\/+$/, '');
  } catch {
    if (trimmedValue.endsWith('/api')) {
      return trimmedValue;
    }

    return `${trimmedValue}/api`;
  }
}

export const API_URL = normalizeApiUrl(rawApiUrl);
