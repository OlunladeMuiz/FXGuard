import client from './client';

export interface RegisterPayload {
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
  verification_code?: number | null;
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
    localStorage.removeItem('user');
  }
}

/**
 * Store user data in localStorage
 */
export function setUser(user: User): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('user', JSON.stringify(user));
  }
}

/**
 * Get user data from localStorage
 */
export function getUser(): User | null {
  if (typeof window !== 'undefined') {
    const userData = localStorage.getItem('user');
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
