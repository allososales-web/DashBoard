import api from './api';
import { Quote, CreateQuoteDto, UpdateQuoteDto, QuoteListQuery } from '../types/quote.types';
import { PaginatedResponse } from '../types/common.types';

export const quotesApi = {
  getAll: async (storeId: string, params?: QuoteListQuery) => {
    const { data } = await api.get<PaginatedResponse<Quote>>(`/stores/${storeId}/quotes`, { params });
    return data;
  },

  getOne: async (storeId: string, id: string) => {
    const { data } = await api.get<Quote>(`/stores/${storeId}/quotes/${id}`);
    return data;
  },

  create: async (storeId: string, dto: CreateQuoteDto) => {
    const { data } = await api.post<Quote>(`/stores/${storeId}/quotes`, dto);
    return data;
  },

  update: async (storeId: string, id: string, dto: UpdateQuoteDto) => {
    const { data } = await api.put<Quote>(`/stores/${storeId}/quotes/${id}`, dto);
    return data;
  },

  remove: async (storeId: string, id: string) => {
    await api.delete(`/stores/${storeId}/quotes/${id}`);
  },
};
