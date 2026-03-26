const apiUrl = process.env.NEXT_PUBLIC_API_URL;

if (!apiUrl) {
  throw new Error('Missing required env var: NEXT_PUBLIC_API_URL');
}

export const API_URL = apiUrl;
