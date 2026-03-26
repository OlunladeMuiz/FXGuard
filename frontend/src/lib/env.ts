const rawApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

if (!rawApiUrl) {
  throw new Error('Missing required env var: NEXT_PUBLIC_API_URL');
}

// Remove trailing slash only — do NOT append /api
// Routes already include /api prefix (e.g. /api/auth/login)
export const API_URL = rawApiUrl.replace(/\/+$/, '');