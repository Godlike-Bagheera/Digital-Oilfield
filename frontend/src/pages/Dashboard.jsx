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
  // Живое время последнего обновления (доказательство автообновления каждые 3 сек)
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchWells = useCallback(async () => {
    try {
      const data = await getWells();
      setWells(data.results || []);
      setLastUpdated(new Date().toLocaleTimeString());
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
    // Автообновление каждые 3 секунды
    const interval = setInterval(() => {
      fetchWells();
      fetchAlerts();
    }, 3000);
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

  // Скелетоны загрузки — убирают layout shift (дергание)
  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-8 w-1/3 animate-pulse rounded-xl bg-zinc-800" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-zinc-800" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl bg-zinc-800" />
          ))}
        </div>
      </div>
    );
  }

  const kpiCards = [
    { label: 'Всего скважин', value: wells.length, accent: 'text-zinc-50', dot: 'bg-blue-400', ring: 'ring-blue-500/20', text: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'В норме', value: normalCount, accent: 'text-emerald-400', dot: 'bg-emerald-500', ring: 'ring-emerald-500/20', text: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Внимание', value: warningCount, accent: 'text-amber-400', dot: 'bg-amber-500', ring: 'ring-amber-500/20', text: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Аварии', value: alarmCount, accent: 'text-rose-400', dot: 'bg-rose-500', ring: 'ring-rose-500/20', text: 'text-rose-400', bg: 'bg-rose-500/10' },
  ];

  return (
    <div className="animate-fade-in mx-auto max-w-7xl">
      {/* Заголовок страницы + LIVE-индикатор */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-50">
            Панель мониторинга
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Контроль нефтепромыслового оборудования в режиме реального времени
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-zinc-800/80 bg-zinc-900/50 px-3 py-1.5 backdrop-blur-md">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          <span className="text-xs font-medium text-zinc-400">
            LIVE{lastUpdated ? ` • Обновлено в ${lastUpdated}` : ''}
          </span>
        </div>
      </div>

      {/* Баннер активных алертов */}
      <AlertBanner alerts={alerts} />

      {/* KPI-карточки с градиентной обводкой */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
        {kpiCards.map((stat, idx) => (
          <div
            key={stat.label}
            className={`kpi-card animate-fade-in-up bg-[#121215] p-6 shadow-2xl ring-1 ring-white/5 transition-all duration-300 hover:bg-[#16161a] ${stat.ring}`}
            style={{ animationDelay: `${idx * 0.1}s` }}
          >
            <div className="flex items-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full ${stat.dot}`} />
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                {stat.label}
              </p>
            </div>
            <p className={`mt-3 text-3xl font-semibold tracking-tight ${stat.accent}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Панель фильтров */}
      <div className="mb-8 rounded-2xl border border-zinc-800/80 bg-[#121215]/80 p-6 shadow-2xl ring-1 ring-white/5 backdrop-blur-md">
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[200px] flex-1">
            <label className="mb-2 block text-sm font-medium text-zinc-400">Поиск</label>
            <input
              type="text"
              placeholder="Номер скважины..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900/70 px-4 py-2 text-sm text-zinc-50 placeholder-zinc-500 outline-none transition-colors focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
            />
          </div>

          <div className="min-w-[150px] flex-1">
            <label className="mb-2 block text-sm font-medium text-zinc-400">ЦДНГ</label>
            <select
              value={filters.cdng}
              onChange={(e) => setFilters((f) => ({ ...f, cdng: e.target.value }))}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900/70 px-4 py-2 text-sm text-zinc-50 outline-none transition-colors focus:border-zinc-600"
            >
              <option value="all">Все</option>
              {uniqueCdngs.map((cdng) => (
                <option key={cdng} value={cdng}>{cdng}</option>
              ))}
            </select>
          </div>

          <div className="min-w-[150px] flex-1">
            <label className="mb-2 block text-sm font-medium text-zinc-400">Статус</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900/70 px-4 py-2 text-sm text-zinc-50 outline-none transition-colors focus:border-zinc-600"
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
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-6 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-50"
            >
              Сбросить
            </button>
          </div>
        </div>
      </div>

      {/* Ошибки */}
      {error && (
        <div className="mb-6 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-400">
          {error}
        </div>
      )}

      {/* Список скважин */}
      {filteredWells.length === 0 ? (
        <div className="py-20 text-center text-zinc-500">Нет скважин</div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredWells.map((well) => (
            <WellCard key={well.id} well={well} />
          ))}
        </div>
      )}

      <p className="mt-8 text-center text-xs text-zinc-600">
        Данные обновляются автоматически каждые 3 секунды
      </p>
    </div>
  );
}
