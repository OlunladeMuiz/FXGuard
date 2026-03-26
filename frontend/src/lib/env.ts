const REQUIRED_VARS = ['NEXT_PUBLIC_API_URL'] as const;

REQUIRED_VARS.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
});

export const API_URL = process.env.NEXT_PUBLIC_API_URL!;
