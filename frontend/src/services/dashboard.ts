import api from './api';
import { MetricsResponse } from '../types/dashboard.types';

export const dashboardApi = {
  getMetrics: async (storeId: string, year?: number, month?: number) => {
    const { data } = await api.get<MetricsResponse>(`/stores/${storeId}/metrics`, {
      params: { year, month },
    });
    return data;
  },

  getMetricsByMonth: async (storeId: string, year: number, month: number) => {
    const { data } = await api.get<MetricsResponse>(`/stores/${storeId}/metrics/${year}/${month}`);
    return data;
  },

  recalculate: async (storeId: string, year?: number, month?: number) => {
    const { data } = await api.post(`/stores/${storeId}/metrics/recalculate`, null, {
      params: { year, month },
    });
    return data;
  },

  getKpiSummary: async (storeId: string, months?: number) => {
    const { data } = await api.get(`/stores/${storeId}/kpi/summary`, {
      params: { months },
    });
    return data;
  },
};
