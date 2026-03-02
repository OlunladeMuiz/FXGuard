/**
 * Application Configuration
 * Centralized configuration for the dashboard
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  TIMEOUT: 30000, // 30 seconds
  HEADERS: {
    'Content-Type': 'application/json',
  },
};

export const APP_CONFIG = {
  // App metadata
  NAME: 'FXNexus',
  VERSION: '1.0.0',

  // Pagination defaults
  ITEMS_PER_PAGE: 20,
  MAX_ITEMS_PER_PAGE: 100,

  // Refresh intervals (in milliseconds)
  WALLET_REFRESH_INTERVAL: 30000, // 30 seconds
  FX_RATES_REFRESH_INTERVAL: 60000, // 1 minute
  TRANSACTIONS_REFRESH_INTERVAL: 15000, // 15 seconds

  // Retry configuration
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
};

export const VALIDATION_CONFIG = {
  // Amount validation
  MIN_AMOUNT: 0.01,
  MAX_AMOUNT: 999999999.99,
  DECIMAL_PLACES: 8,

  // String validation
  MIN_USERNAME_LENGTH: 3,
  MAX_USERNAME_LENGTH: 50,

  // Reference/ID patterns
  UUID_PATTERN:
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
};
