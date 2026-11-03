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
      console.log('Обновление дашборда', new Date().toISOString());
      fetchWells();
      fetchAlerts();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchWells, fetchAlerts]);

  // Уникальные ЦДНГ из данных (Set гарантирует отсутствие дубликатов)
  const uniqueCdngs = [...new Set(wells.map((w) => w.cdng))].sort();

  // Фильтрация
  const filteredWells = wells.filter((well) => {
    if (filters.cdng !== 'all' && well.cdng !== filters.cdng) return false;
    if (filters.status !== 'all' && well.status !== filters.status) return false;
    if (searchQuery && !String(well.number).includes(searchQuery.trim())) return false;
    return true;
  });

  // Статистика по индексу здоровья
  const withHi = wells.filter((w) => w.latest_telemetry);
  const normalCount = withHi.filter((w) => w.latest_telemetry.health_index >= 90).length;
  const warningCount = withHi.filter(
    (w) => w.latest_telemetry.health_index >= 60 && w.latest_telemetry.health_index < 90
  ).length;
  const alarmCount = withHi.filter((w) => w.latest_telemetry.health_index < 60).length;

  const resetFilters = () => {
    setFilters({ cdng: 'all', status: 'all' });
    setSearchQuery('');
  };

  return (
    <div className="animate-fade-in">
      {/* Заголовок страницы */}
      <div className="mb-8">
        <h1 className="mb-2 bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-4xl font-bold text-transparent">
          🛢️ Цифровое месторождение
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Мониторинг нефтепромыслового оборудования в реальном времени
        </p>
      </div>

      {/* Баннер активных алертов */}
      <AlertBanner alerts={alerts} />

      {/* Статистика (4 карточки в ряд) */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-100">Всего скважин</p>
              <p className="text-4xl font-bold">{wells.length}</p>
            </div>
            <div className="text-5xl opacity-50">🏭</div>
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-green-500 to-green-600 p-6 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-100">В норме (≥90)</p>
              <p className="text-4xl font-bold">{normalCount}</p>
            </div>
            <div className="text-5xl opacity-50">✅</div>
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-yellow-500 to-yellow-600 p-6 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-100">Внимание (60–89)</p>
              <p className="text-4xl font-bold">{warningCount}</p>
            </div>
            <div className="text-5xl opacity-50">⚠️</div>
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-red-500 to-red-600 p-6 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-100">Аварийные (&lt;60)</p>
              <p className="text-4xl font-bold">{alarmCount}</p>
            </div>
            <div className="text-5xl opacity-50">🚨</div>
          </div>
        </div>
      </div>

      {/* Панель фильтров */}
      <div className="mb-8 rounded-2xl bg-gray-50 p-6 shadow-lg ring-1 ring-gray-200 transition-colors dark:bg-gray-800 dark:ring-gray-700">
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[200px] flex-1">
            <label className="mb-2 block text-sm font-medium">🔍 Поиск</label>
            <input
              type="text"
              placeholder="Номер скважины..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="min-w-[150px] flex-1">
            <label className="mb-2 block text-sm font-medium">ЦДНГ</label>
            <select
              value={filters.cdng}
              onChange={(e) => setFilters((f) => ({ ...f, cdng: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">Все</option>
              {uniqueCdngs.map((cdng) => (
                <option key={cdng} value={cdng}>{cdng}</option>
              ))}
            </select>
          </div>

          <div className="min-w-[150px] flex-1">
            <label className="mb-2 block text-sm font-medium">Статус</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">Все</option>
              <option value="online">Онлайн</option>
              <option value="warning">Внимание</option>
              <option value="alarm">Авария</option>
              <option value="offline">Офлайн</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={resetFilters}
              className="rounded-lg bg-gray-200 px-6 py-2 transition hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              Сбросить
            </button>
          </div>
        </div>
      </div>

      {/* Ошибки */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-700 bg-red-900/50 p-3 text-red-300">
          {error}
        </div>
      )}

      {/* Список скважин */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500"></div>
          <p className="text-gray-500 dark:text-gray-400">Загрузка данных телеметрии...</p>
        </div>
      ) : filteredWells.length === 0 ? (
        <div className="py-20 text-center text-gray-500 dark:text-gray-400">Нет скважин</div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredWells.map((well) => (
            <WellCard key={well.id} well={well} />
          ))}
        </div>
      )}

      <p className="mt-8 text-center text-xs text-gray-500 dark:text-gray-400">
        Данные обновляются каждые 5 секунд
      </p>
    </div>
  );
}
