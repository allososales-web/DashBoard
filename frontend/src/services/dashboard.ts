import api from './api';
import { MetricsResponse, DataMode } from '../types/dashboard.types';

export const dashboardApi = {
  getMetrics: async (storeId: string, year?: number, month?: number, dataMode?: DataMode) => {
    const { data } = await api.get<MetricsResponse>(`/stores/${storeId}/metrics`, {
      params: { year, month, dataMode },
    });
    return data;
  },

  getMetricsByMonth: async (storeId: string, year: number, month: number, dataMode?: DataMode) => {
    const { data } = await api.get<MetricsResponse>(`/stores/${storeId}/metrics/${year}/${month}`, {
      params: { dataMode },
    });
    return data;
  },

  recalculate: async (storeId: string, year?: number, month?: number, dataMode?: DataMode) => {
    const { data } = await api.post(`/stores/${storeId}/metrics/recalculate`, null, {
      params: { year, month, dataMode },
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
