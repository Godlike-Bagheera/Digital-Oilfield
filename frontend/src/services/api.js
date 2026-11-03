import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Получить список скважин (с учётом пагинации DRF)
export const getWells = async (params = {}) => {
  const response = await api.get('/wells/', { params });
  return response.data; // { count, results, ... }
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

// Получить список алертов (с фильтрами, например { is_active: 'true', well: 1 })
// Возвращает массив results (учитывая пагинацию DRF)
export const getAlerts = async (params = {}) => {
  const response = await api.get('/alerts/', { params });
  return response.data.results || response.data;
};

// Получить обучающие подсказки
export const getTrainingTips = async (params = {}) => {
  const response = await api.get('/training-tips/', { params });
  return response.data.results || response.data;
};

export default api;
