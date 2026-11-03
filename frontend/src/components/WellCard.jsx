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
    <Link to={`/well/${well.id}`} className="group relative block animate-fade-in">
      <div className="relative glass-card rounded-2xl p-6 overflow-hidden h-full">
        {/* Фоновое свечение */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 via-blue-500/0 to-purple-500/0 group-hover:from-cyan-500/10 group-hover:via-blue-500/5 group-hover:to-purple-500/10 transition-all duration-500 pointer-events-none"></div>

        <div className="relative z-10">
          {/* Заголовок */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-white mb-1 group-hover:text-cyan-400 transition-colors">
                Скважина №{well.number}
              </h3>
              <p className="text-sm text-slate-400">{well.cdng}</p>
            </div>
            <div className={`px-3 py-1 bg-gradient-to-r ${status.color} rounded-full text-xs font-semibold text-white shadow-lg ${status.glow}`}>
              {status.text}
            </div>
          </div>

          {/* Индикатор здоровья */}
          <div className="flex justify-center my-4">
            <div className="transform group-hover:scale-110 transition-transform duration-300">
              <HealthGauge value={health} />
            </div>
          </div>

          {/* Параметры */}
          {telemetry ? (
            <div className="space-y-2 mt-4">
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/30 hover:border-cyan-500/30 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⚡</span>
                  <span className="text-xs text-slate-400">Ток</span>
                </div>
                <span className="font-bold text-cyan-400">{telemetry.current?.toFixed(1)} А</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/30 hover:border-emerald-500/30 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🛢️</span>
                  <span className="text-xs text-slate-400">Дебит</span>
                </div>
                <span className="font-bold text-emerald-400">{telemetry.flow_rate_oil?.toFixed(1)} т/сут</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/30 hover:border-purple-500/30 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-xl">💧</span>
                  <span className="text-xs text-slate-400">Обводн.</span>
                </div>
                <span className="font-bold text-purple-400">{telemetry.water_cut?.toFixed(1)}%</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <span className="text-3xl">📡</span>
              <p className="text-sm mt-2">Нет данных</p>
            </div>
          )}

          {/* Время обновления */}
          <div className="mt-4 pt-4 border-t border-slate-700/50 flex items-center justify-center gap-2 text-xs text-slate-500">
            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"></span>
            Обновлено: {getTimeAgo(telemetry?.timestamp)}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default WellCard;
