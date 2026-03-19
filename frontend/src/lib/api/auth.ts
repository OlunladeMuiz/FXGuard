import client from './client';

export const AUTH_USER_UPDATED_EVENT = 'fxguard:user-updated';
const USER_STORAGE_KEY = 'user';

export interface RegisterPayload {
  company_name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface VerifyOtpPayload {
  email: string;
  otp: number;
}

export interface ResendOtpPayload {
  email: string;
}

export interface User {
  id: string;
  email: string;
  company_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  time_zone?: string | null;
  verification_code?: number | null;
}

function titleCase(value: string): string {
  if (!value) {
    return '';
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function getUserDisplayName(user: User | null): string {
  if (!user) {
    return 'User';
  }

  const firstName = user.first_name?.trim() ?? '';
  const lastName = user.last_name?.trim() ?? '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

  if (fullName) {
    return fullName;
  }

  const emailPrefix = user.email.split('@')[0] || '';
  const nameParts = emailPrefix.split(/[._-]/).filter(Boolean);

  if (nameParts.length >= 2) {
    return `${titleCase(nameParts[0] ?? '')} ${titleCase(nameParts[1] ?? '')}`.trim();
  }

  if (emailPrefix) {
    return titleCase(emailPrefix);
  }

  return 'User';
}

export interface RegisterResponse {
  message: string;
  user: User;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface MessageResponse {
  message: string;
  user?: User;
}

export interface OTPResponse {
  otp: number;
  message: string;
}

/**
 * Register a new user
 */
export async function register(payload: RegisterPayload): Promise<RegisterResponse> {
  const response = await client.post<RegisterResponse>('/auth/register', payload);
  return response.data;
}

/**
 * Login user
 */
export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const response = await client.post<LoginResponse>('/auth/login', payload);
  return response.data;
}

/**
 * Verify OTP code
 */
export async function verifyOtp(payload: VerifyOtpPayload): Promise<MessageResponse> {
  const response = await client.post<MessageResponse>('/auth/verify-otp', payload);
  return response.data;
}

/**
 * Resend OTP code
 */
export async function resendOtp(payload: ResendOtpPayload): Promise<OTPResponse> {
  const response = await client.post<OTPResponse>('/auth/resend-otp', payload);
  return response.data;
}

/**
 * Store auth tokens in localStorage
 */
export function setAuthTokens(accessToken: string, refreshToken: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  }
}

/**
 * Get access token from localStorage
 */
export function getAccessToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('access_token');
  }
  return null;
}

/**
 * Clear auth tokens
 */
export function clearAuthTokens(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem(USER_STORAGE_KEY);
  }
}

/**
 * Store user data in localStorage
 */
export function setUser(user: User): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    window.dispatchEvent(new CustomEvent(AUTH_USER_UPDATED_EVENT, { detail: user }));
  }
}

/**
 * Get user data from localStorage
 */
export function getUser(): User | null {
  if (typeof window !== 'undefined') {
    const userData = localStorage.getItem(USER_STORAGE_KEY);
    if (userData) {
      try {
        return JSON.parse(userData) as User;
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getAccessToken() !== null;
}
