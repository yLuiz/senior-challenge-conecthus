import api from './axios';
import { AuthResponse, User } from '../types';

export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post<AuthResponse>('/auth/register', data).then((r) => r.data),

  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', data).then((r) => r.data),

  getMe: () => api.get<User>('/auth/me').then((r) => r.data),

  logout: (refreshToken: string) =>
    api.post('/auth/logout', undefined, { headers: { Authorization: `Bearer ${refreshToken}` } }),
};
