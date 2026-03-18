import api from './api';
import { Store } from '../types/store.types';
import { PaginatedResponse } from '../types/common.types';

export const storesApi = {
  getAll: async (params?: { search?: string; region?: string; isActive?: boolean; page?: number; limit?: number }) => {
    const { data } = await api.get<PaginatedResponse<Store>>('/stores', { params });
    return data;
  },

  getOne: async (storeId: string) => {
    const { data } = await api.get<Store>(`/stores/${storeId}`);
    return data;
  },
};
