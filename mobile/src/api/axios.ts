import axios, { InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://172.25.96.1:3000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// Interceptor-free instance used only to call the refresh endpoint — avoids
// triggering the response interceptor on a refresh call that also gets 401
const refreshAxios = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

let isRefreshing = false;
type QueueEntry = { resolve: (token: string) => void; reject: (err: unknown) => void };
let failedQueue: QueueEntry[] = [];

// Callbacks registered by AuthContext to react to auth state changes
let onSessionExpiredCb: (() => void) | null = null;
let onTokenRefreshedCb: ((newToken: string) => void) | null = null;

export function registerAuthCallbacks(callbacks: {
  onSessionExpired?: () => void;
  onTokenRefreshed?: (newToken: string) => void;
}): void {
  if (callbacks.onSessionExpired) onSessionExpiredCb = callbacks.onSessionExpired;
  if (callbacks.onTokenRefreshed) onTokenRefreshedCb = callbacks.onTokenRefreshed;
}

function processQueue(error: unknown, newToken: string | null): void {
  failedQueue.forEach(({ resolve, reject }) => {
    error ? reject(error) : resolve(newToken!);
  });
  failedQueue = [];
}

async function clearAuthStorage(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem('token'),
    AsyncStorage.removeItem('refreshToken'),
    AsyncStorage.removeItem('user'),
  ]);
  onSessionExpiredCb?.();
}

// Only set Authorization if not already present — preserves the refresh/logout
// token set explicitly by authApi.refresh() and authApi.logout().
// Uses AxiosHeaders.get() for reliable case-insensitive lookup.
api.interceptors.request.use(async (config) => {
  if (!config.headers.get('Authorization')) {
    const token = await AsyncStorage.getItem('token');
    if (token) config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status !== 401) return Promise.reject(error);

    const url = originalRequest.url ?? '';
    const isAuthEndpoint =
      url.includes('v1/auth/refresh') || url.includes('v1/auth/logout');

    // Do not attempt refresh for the refresh/logout endpoints themselves,
    // or if this request has already been retried once
    if (isAuthEndpoint || originalRequest._retry) {
      await clearAuthStorage();
      return Promise.reject(error);
    }

    // A refresh is already in flight — queue this request
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((newToken) => {
          originalRequest.headers.set('Authorization', `Bearer ${newToken}`);
          return api(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    isRefreshing = true;
    originalRequest._retry = true;

    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');

      if (!refreshToken) {
        await clearAuthStorage();
        processQueue(error, null);
        return Promise.reject(error);
      }

      const { data } = await refreshAxios.post('v1/auth/refresh', null, {
        headers: { Authorization: `Bearer ${refreshToken}` },
      });

      const authData = data.data;

      await Promise.all([
        AsyncStorage.setItem('token', authData.access_token),
        AsyncStorage.setItem('refreshToken', authData.refresh_token),
        AsyncStorage.setItem('user', JSON.stringify(authData.user)),
      ]);

      originalRequest.headers.set('Authorization', `Bearer ${authData.access_token}`);
      onTokenRefreshedCb?.(authData.access_token);
      processQueue(null, authData.access_token);
      return api(originalRequest);
    } catch (refreshError) {
      await clearAuthStorage();
      processQueue(refreshError, null);
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;
