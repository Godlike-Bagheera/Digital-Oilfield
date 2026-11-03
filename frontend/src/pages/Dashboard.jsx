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

  // Skeleton при загрузке — убирает layout shift (дергание)
  if (loading) {
    return (
 <div className="p-6 animate-pulse">
 <div className="h-8 bg-gray-800 rounded w-1/3 mb-6"></div>
 <div className="grid grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
 <div key={i} className="h-32 bg-gray-800 rounded-xl"></div>
          ))}
        </div>
 <div className="grid grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
 <div key={i} className="h-64 bg-gray-800 rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
 <div className="animate-fade-in">
      {/* Заголовок страницы */}
 <div className="mb-8">
 <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent mb-2">
          Панель мониторинга
        </h1>
 <p className="text-slate-400">
          Контроль нефтепромыслового оборудования в режиме реального времени
        </p>
      </div>

      {/* Баннер активных алертов */}
      <AlertBanner alerts={alerts} />

      {/* Статистика (4 градиентные карточки) */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Всего скважин', value: wells.length, color: 'from-blue-500 to-cyan-500', icon: '🏭', glow: 'shadow-blue-500/30' },
          { label: 'В норме', value: normalCount, color: 'from-emerald-500 to-green-500', icon: '✅', glow: 'shadow-emerald-500/30' },
          { label: 'Внимание', value: warningCount, color: 'from-amber-500 to-yellow-500', icon: '⚠️', glow: 'shadow-amber-500/30' },
          { label: 'Аварийные', value: alarmCount, color: 'from-rose-500 to-red-500', icon: '🚨', glow: 'shadow-rose-500/30' }
        ].map((stat, idx) => (
 <div key={idx} className={`relative bg-gradient-to-br ${stat.color} rounded-2xl p-6 shadow-xl ${stat.glow} overflow-hidden group hover:scale-105 transition-all duration-300 animate-fade-in`} style={{animationDelay: `${idx * 0.1}s`}}>
 <div className="absolute -top-4 -right-4 text-6xl opacity-20 group-hover:opacity-40 transition-opacity duration-300">{stat.icon}</div>
 <div className="relative z-10">
 <p className="text-white/80 text-sm font-medium mb-1">{stat.label}</p>
 <p className="text-white text-4xl font-bold">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Панель фильтров */}
 <div className="mb-8 rounded-2xl bg-slate-800/60 backdrop-blur-sm p-6 shadow-lg ring-1 ring-slate-700/50">
 <div className="flex flex-wrap gap-4">
 <div className="min-w-[200px] flex-1">
 <label className="mb-2 block text-sm font-medium text-slate-300">🔍 Поиск</label>
            <input
              type="text"
              placeholder="Номер скважины..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full rounded-lg border border-slate-600 bg-slate-700/70 px-4 py-2 text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
            />
          </div>

 <div className="min-w-[150px] flex-1">
 <label className="mb-2 block text-sm font-medium text-slate-300">ЦДНГ</label>
            <select
              value={filters.cdng}
              onChange={(e) => setFilters((f) => ({ ...f, cdng: e.target.value }))}
 className="w-full rounded-lg border border-slate-600 bg-slate-700/70 px-4 py-2 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
            >
              <option value="all">Все</option>
              {uniqueCdngs.map((cdng) => (
                <option key={cdng} value={cdng}>{cdng}</option>
              ))}
            </select>
          </div>

 <div className="min-w-[150px] flex-1">
 <label className="mb-2 block text-sm font-medium text-slate-300">Статус</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
 className="w-full rounded-lg border border-slate-600 bg-slate-700/70 px-4 py-2 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
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
 className="rounded-lg bg-slate-700 px-6 py-2 text-slate-200 transition hover:bg-slate-600"
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
      {filteredWells.length === 0 ? (
 <div className="py-20 text-center text-slate-500">Нет скважин</div>
      ) : (
 <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredWells.map((well) => (
            <WellCard key={well.id} well={well} />
          ))}
        </div>
      )}

 <p className="mt-8 text-center text-xs text-slate-500">
        Данные обновляются каждые 3 секунды
      </p>
    </div>
  );
}
