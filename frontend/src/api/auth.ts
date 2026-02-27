import api from './axios';
import { ApiResponse, AuthResponse, User } from '../types';

export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post<ApiResponse<AuthResponse>>('v1/auth/register', data).then((r) => r.data.data),

  login: (data: { email: string; password: string }) =>
    api.post<ApiResponse<AuthResponse>>('v1/auth/login', data).then((r) => r.data.data),

  getMe: () => api.get<ApiResponse<User>>('v1/auth/me').then((r) => r.data.data),

  logout: (refreshToken: string, accessToken?: string) =>
    api.post('v1/auth/logout', { access_token: accessToken }, { headers: { Authorization: `Bearer ${refreshToken}` } }),
};
