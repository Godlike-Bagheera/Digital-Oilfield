import React, { useEffect, useState, useCallback } from 'react';
import WellCard from '../components/WellCard.jsx';
import AlertBanner from '../components/AlertBanner.jsx';
import { getWells, getAlerts } from '../services/api.js';

export default function Dashboard() {
  const [wells, setWells] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ cdng: 'all', status: 'all' });
  const [searchQuery, setSearchQuery] = useState('');

  const fetchWells = useCallback(async () => {
    try {
      const data = await getWells();
      setWells(data.results || []);
      setError('');
    } catch (e) {
      setError('Не удалось загрузить список скважин');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const data = await getAlerts({ is_active: 'true' });
      setAlerts(data.results || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchWells();
    fetchAlerts();
    // Автообновление каждые 5 секунд
    const interval = setInterval(() => {
      fetchWells();
      fetchAlerts();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchWells, fetchAlerts]);

  // Уникальные ЦДНГ из данных
  const cdngList = [...new Set(wells.map((w) => w.cdng))].sort();

  // Фильтрация
  const filteredWells = wells.filter((w) => {
    if (searchQuery && !String(w.number).includes(searchQuery.trim())) return false;
    if (filters.cdng !== 'all' && w.cdng !== filters.cdng) return false;
    if (filters.status !== 'all' && w.status !== filters.status) return false;
    return true;
  });

  // Статистика по индексу здоровья
  const withHi = wells.filter((w) => w.latest_telemetry);
  const stats = {
    total: wells.length,
    normal: withHi.filter((w) => w.latest_telemetry.health_index >= 90).length,
    attention: withHi.filter(
      (w) => w.latest_telemetry.health_index >= 60 && w.latest_telemetry.health_index < 90
    ).length,
    emergency: withHi.filter((w) => w.latest_telemetry.health_index < 60).length,
  };

  const resetFilters = () => {
    setFilters({ cdng: 'all', status: 'all' });
    setSearchQuery('');
  };

  return (
    <div>
      {/* Баннер активных алертов */}
      <AlertBanner alerts={alerts} />

      {/* Панель фильтров */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center bg-gray-800 rounded-xl p-4 border border-gray-700">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по номеру скважины..."
            className="w-full pl-10 pr-3 py-2 rounded-lg bg-gray-900 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <select
          value={filters.cdng}
          onChange={(e) => setFilters((f) => ({ ...f, cdng: e.target.value }))}
          className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 text-white focus:outline-none focus:border-emerald-500"
        >
          <option value="all">Все ЦДНГ</option>
          {cdngList.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 text-white focus:outline-none focus:border-emerald-500"
        >
          <option value="all">Все статусы</option>
          <option value="online">Онлайн</option>
          <option value="warning">Внимание</option>
          <option value="alarm">Авария</option>
        </select>
        <button
          onClick={resetFilters}
          className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm font-medium transition-colors"
        >
          Сбросить фильтры
        </button>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
          <p className="text-3xl font-bold">{stats.total}</p>
          <p className="text-sm text-gray-400">Всего скважин</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
          <p className="text-3xl font-bold text-green-500">{stats.normal}</p>
          <p className="text-sm text-gray-400">В норме (≥90)</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
          <p className="text-3xl font-bold text-yellow-500">{stats.attention}</p>
          <p className="text-sm text-gray-400">Требуют внимания (60–89)</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
          <p className="text-3xl font-bold text-red-500">{stats.emergency}</p>
          <p className="text-sm text-gray-400">Аварийные (&lt;60)</p>
        </div>
      </div>

      {/* Ошибки */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-900/50 border border-red-700 text-red-300">
          {error}
        </div>
      )}

      {/* Список скважин */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mb-4"></div>
          <p className="text-gray-400">Загрузка данных телеметрии...</p>
        </div>
      ) : filteredWells.length === 0 ? (
        <div className="text-center py-20 text-gray-500">Нет скважин</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredWells.map((well) => (
            <WellCard key={well.id} well={well} />
          ))}
        </div>
      )}

      <p className="mt-8 text-center text-xs text-gray-500">
        Данные обновляются каждые 5 секунд
      </p>
    </div>
  );
}
