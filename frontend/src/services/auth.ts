import api from './api';
import { LoginRequest, TokenResponse, RefreshResponse, UserInfo } from '../types/auth.types';

export const authApi = {
  login: async (dto: LoginRequest): Promise<TokenResponse> => {
    const { data } = await api.post<TokenResponse>('/auth/login', dto);
    return data;
  },

  refresh: async (refreshToken: string): Promise<RefreshResponse> => {
    const { data } = await api.post<RefreshResponse>('/auth/refresh', { refreshToken });
    return data;
  },

  logout: async (refreshToken: string): Promise<void> => {
    await api.post('/auth/logout', { refreshToken });
  },

  getMe: async (): Promise<UserInfo> => {
    const { data } = await api.get<UserInfo>('/auth/me');
    return data;
  },
};
