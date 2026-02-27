import api from './axios';
import { AuthResponse, User } from '../types';

export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post<AuthResponse>('v1/auth/register', data).then(response => response.data),

  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>('v1/auth/login', data).then(response => response.data),

  getMe: () => api.get<User>('v1/auth/me').then(response => response.data),

  refresh: (refreshToken: string) =>
    api.post<AuthResponse>('v1/auth/refresh', null, {
      headers: { Authorization: `Bearer ${refreshToken}` },
    }).then((r) => r.data),

  logout: (refreshToken: string, accessToken?: string) =>
    api.post<void>('v1/auth/logout', { access_token: accessToken }, {
      headers: { Authorization: `Bearer ${refreshToken}` },
    }).then((r) => r.data),
};
