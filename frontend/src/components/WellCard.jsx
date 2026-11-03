import React from 'react';
import { Link } from 'react-router-dom';
import HealthGauge from './HealthGauge';

const WellCard = ({ well }) => {
  const telemetry = well.latest_telemetry;
  const health = telemetry?.health_index || 0;

  const statusConfig = {
    online: { color: 'from-emerald-500 to-green-600', text: 'В работе', glow: 'shadow-emerald-500/30' },
    warning: { color: 'from-amber-500 to-yellow-600', text: 'Внимание', glow: 'shadow-amber-500/30' },
    alarm: { color: 'from-rose-500 to-red-600', text: 'Авария', glow: 'shadow-rose-500/30 animate-pulse-alert' },
    offline: { color: 'from-slate-500 to-gray-600', text: 'Офлайн', glow: 'shadow-slate-500/30' }
  };
  const status = statusConfig[well.status] || statusConfig.offline;

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return 'нет данных';
    const diff = Math.floor((new Date() - new Date(timestamp)) / 1000);
    if (diff < 60) return 'только что';
    if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
    return new Date(timestamp).toLocaleDateString('ru-RU');
  };

  return (
    <Link to={`/well/${well.id}`} className="group relative block animate-fade-in-up">
      <div className="relative h-full overflow-hidden rounded-2xl border border-zinc-800/80 bg-[#121215] p-6 shadow-2xl ring-1 ring-white/5 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-zinc-700 hover:bg-[#16161a] hover:shadow-2xl hover:ring-white/10">
        {/* Фоновое свечение при наведении */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/0 via-transparent to-emerald-500/0 opacity-0 transition-all duration-500 group-hover:from-blue-500/5 group-hover:to-emerald-500/5 group-hover:opacity-100"></div>

        <div className="relative z-10">
          {/* Заголовок */}
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h3 className="text-xl font-semibold tracking-tight text-zinc-50 transition-colors group-hover:text-white">
                Скважина №{well.number}
              </h3>
              <p className="mt-0.5 text-sm text-zinc-400">{well.cdng}</p>
            </div>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              well.status === 'online' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
              well.status === 'warning' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
              well.status === 'alarm' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse-alert' :
              'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
            }`}>
              {status.text}
            </span>
          </div>

          {/* Индикатор здоровья */}
          <div className="my-4 flex justify-center">
            <div className="transition-transform duration-300 group-hover:scale-105">
              <HealthGauge value={health} />
            </div>
          </div>

          {/* Параметры */}
          {telemetry ? (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between rounded-lg border border-zinc-800/80 bg-[#09090b]/50 p-3 transition-colors hover:border-zinc-700">
                <span className="text-xs text-zinc-400">Ток</span>
                <span className="text-sm font-semibold text-zinc-50">{telemetry.current?.toFixed(1)} А</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-zinc-800/80 bg-[#09090b]/50 p-3 transition-colors hover:border-zinc-700">
                <span className="text-xs text-zinc-400">Дебит нефти</span>
                <span className="text-sm font-semibold text-zinc-50">{telemetry.flow_rate_oil?.toFixed(1)} т/сут</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-zinc-800/80 bg-[#09090b]/50 p-3 transition-colors hover:border-zinc-700">
                <span className="text-xs text-zinc-400">Обводнённость</span>
                <span className="text-sm font-semibold text-zinc-50">{telemetry.water_cut?.toFixed(1)}%</span>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-zinc-500">
              <p className="text-sm">Нет данных телеметрии</p>
            </div>
          )}

          {/* Время обновления */}
          <div className="mt-4 flex items-center justify-center gap-2 border-t border-zinc-800/80 pt-4 text-xs text-zinc-500">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500"></span>
            Обновлено: {getTimeAgo(telemetry?.timestamp)}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default WellCard;
