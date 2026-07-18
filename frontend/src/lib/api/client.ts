import axios, { AxiosInstance, AxiosError } from 'axios';
import { API_CONFIG } from '@/constants/config';

const AUTH_USER_UPDATED_EVENT = 'fxguard:user-updated';
const AUTH_ROUTE_PREFIX = '/auth/';

let isRedirectingToLogin = false;
let isRefreshing = false;
let refreshSubscribers: Array<(error: Error | null, token: string | null) => void> = [];

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((callback) => callback(null, token));
  refreshSubscribers = [];
};

const onRefreshFailed = (error: Error) => {
  refreshSubscribers.forEach((callback) => callback(error, null));
  refreshSubscribers = [];
};

const addRefreshSubscriber = (callback: (error: Error | null, token: string | null) => void) => {
  refreshSubscribers.push(callback);
};

function clearStoredAuthState(): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  window.dispatchEvent(new CustomEvent(AUTH_USER_UPDATED_EVENT, { detail: null }));
}

function shouldRedirectToLogin(error: AxiosError): boolean {
  if (typeof window === 'undefined' || error.response?.status !== 401) {
    return false;
  }

  const requestUrl = error.config?.url ?? '';
  if (requestUrl.startsWith(AUTH_ROUTE_PREFIX)) {
    return false;
  }

  const pathname = window.location.pathname;
  return !pathname.startsWith('/login')
    && !pathname.startsWith('/signup')
    && !pathname.startsWith('/verify-otp');
}

/**
 * Centralized Axios instance for all API calls
 * Handles base configuration, headers, and future interceptors
 */

const client: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: API_CONFIG.HEADERS,
});

/**
 * Request interceptor
 * Add authentication token if available
 */
client.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor
 * Handle common error scenarios
 */
client.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    if (error.response?.status === 401) {
      if (originalRequest.url?.includes('/auth/refresh')) {
        clearStoredAuthState();
        if (!isRedirectingToLogin) {
          isRedirectingToLogin = true;
          window.location.replace('/login');
        }
        return Promise.reject(error);
      }

      if (shouldRedirectToLogin(error)) {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          if (!isRefreshing) {
            isRefreshing = true;

            try {
              const response = await axios.post(`${API_CONFIG.BASE_URL}/auth/refresh`, {
                refresh_token: refreshToken
              });

              const newToken = response.data.access_token;
              localStorage.setItem('access_token', newToken);

              onRefreshed(newToken);
              isRefreshing = false;

              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return client(originalRequest);
            } catch (refreshError: any) {
              isRefreshing = false;
              onRefreshFailed(refreshError);
              clearStoredAuthState();
              if (!isRedirectingToLogin) {
                isRedirectingToLogin = true;
                window.location.replace('/login');
              }
              return Promise.reject(refreshError);
            }
          } else {
            return new Promise((resolve, reject) => {
              addRefreshSubscriber((err: Error | null, token: string | null) => {
                if (err) {
                  reject(err);
                } else if (token) {
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                  resolve(client(originalRequest));
                }
              });
            });
          }
        } else {
          clearStoredAuthState();
          if (!isRedirectingToLogin) {
            isRedirectingToLogin = true;
            window.location.replace('/login');
          }
        }
      }
    }

    if (error.response?.status === 403) {
      // Future: Handle authorization failure
    }

    return Promise.reject(error);
  }
);

export default client;
