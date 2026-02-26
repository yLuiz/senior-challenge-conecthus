import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { AuthResponse } from '../types';

type RetriableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  const hasAuthorizationHeader = Boolean(config.headers?.Authorization) || Boolean(config.headers?.authorization);
  if (token && !hasAuthorizationHeader) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const clearSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refresh_token');
};

const redirectToLogin = () => {
  window.location.href = '/login';
};

let refreshPromise: Promise<string> | null = null;

const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) {
    throw new Error('Missing refresh token');
  }

  const response = await api.post<AuthResponse>(
    '/auth/refresh',
    undefined,
    { headers: { Authorization: `Bearer ${refreshToken}` } },
  );

  localStorage.setItem('token', response.data.access_token);
  localStorage.setItem('refresh_token', response.data.refresh_token);
  return response.data.access_token;
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;
    const status = error.response?.status;
    const requestUrl = String(originalRequest?.url ?? '');
    const isLoginRequest = requestUrl.includes('/auth/login');
    const isLogoutRequest = requestUrl.includes('/auth/logout');
    const isRefreshRequest = requestUrl.includes('/auth/refresh');

    if (status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    // Keep login errors in the form, and avoid refresh loops for auth endpoints.
    if (isLoginRequest || isLogoutRequest) {
      return Promise.reject(error);
    }

    if (isRefreshRequest || originalRequest._retry) {
      clearSession();
      redirectToLogin();
      return Promise.reject(error);
    }

    const storedRefreshToken = localStorage.getItem('refresh_token');
    if (!storedRefreshToken) {
      clearSession();
      redirectToLogin();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }

      const newAccessToken = await refreshPromise;
      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      clearSession();
      redirectToLogin();
      return Promise.reject(refreshError);
    }
  },
);

export default api;
