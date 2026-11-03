import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Получить список скважин
export const getWells = async (params = {}) => {
  const response = await api.get('/wells/', { params });
  return response.data;
};

// Получить данные одной скважины
export const getWell = async (id) => {
  const response = await api.get(`/wells/${id}/`);
  return response.data;
};

// Получить телеметрию скважины
export const getTelemetry = async (wellId, params = {}) => {
  const response = await api.get(`/wells/${wellId}/telemetry/`, { params });
  return response.data;
};

// Получить список алертов
export const getAlerts = async (params = {}) => {
  const response = await api.get('/alerts/', { params });
  return response.data;
};

export default api;
