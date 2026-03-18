import api from './api';
import {
  Contract,
  CreateContractDto,
  CancelContractDto,
  ContractListQuery,
} from '../types/contract.types';
import { PaginatedResponse } from '../types/common.types';

export const contractsApi = {
  getAll: async (storeId: string, params?: ContractListQuery) => {
    const { data } = await api.get<PaginatedResponse<Contract>>(`/stores/${storeId}/contracts`, { params });
    return data;
  },

  getOne: async (storeId: string, id: string) => {
    const { data } = await api.get<Contract>(`/stores/${storeId}/contracts/${id}`);
    return data;
  },

  create: async (storeId: string, dto: CreateContractDto) => {
    const { data } = await api.post<Contract>(`/stores/${storeId}/contracts`, dto);
    return data;
  },

  update: async (storeId: string, id: string, dto: Partial<CreateContractDto>) => {
    const { data } = await api.put<Contract>(`/stores/${storeId}/contracts/${id}`, dto);
    return data;
  },

  cancel: async (storeId: string, id: string, dto: CancelContractDto) => {
    const { data } = await api.post<Contract>(`/stores/${storeId}/contracts/${id}/cancel`, dto);
    return data;
  },
};
