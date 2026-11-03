import React from 'react';
import { Link } from 'react-router-dom';
import HealthGauge from './HealthGauge.jsx';

const WellCard = ({ well }) => {
  const telemetry = well.latest_telemetry;
  const health = telemetry?.health_index || 0;

  const statusConfig = {
    online: { color: 'from-green-500 to-emerald-600', text: 'В работе', glow: 'shadow-green-500/30' },
    warning: { color: 'from-yellow-500 to-amber-600', text: 'Внимание', glow: 'shadow-yellow-500/30' },
    alarm: { color: 'from-red-500 to-rose-600', text: 'Авария', glow: 'shadow-red-500/30' },
    offline: { color: 'from-gray-500 to-slate-600', text: 'Офлайн', glow: 'shadow-gray-500/30' }
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
 <Link to={`/well/${well.id}`} className="group relative">
 <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 hover:border-cyan-500/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-cyan-500/20 overflow-hidden">
        {/* Фоновое свечение при hover */}
 <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 via-blue-500/0 to-purple-500/0 group-hover:from-cyan-500/10 group-hover:via-blue-500/5 group-hover:to-purple-500/10 transition-all duration-500 pointer-events-none"></div>

 <div className="relative z-10">
          {/* Заголовок */}
 <div className="flex items-start justify-between mb-4">
            <div>
 <h3 className="text-xl font-bold text-white mb-1">
                Скважина №{well.number}
              </h3>
 <p className="text-sm text-slate-400">{well.cdng}</p>
            </div>
 <div className={`px-3 py-1 bg-gradient-to-r ${status.color} rounded-full text-xs font-semibold text-white shadow-lg ${status.glow} ${well.status === 'alarm' ? 'animate-pulse' : ''}`}>
              {status.text}
            </div>
          </div>

          {/* Индикатор здоровья */}
 <div className="flex justify-center my-4">
            <HealthGauge value={health} />
          </div>

          {/* Параметры */}
          {telemetry ? (
 <div className="space-y-2 mt-4">
 <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/30">
 <div className="flex items-center gap-2">
 <span className="text-xl">⚡</span>
 <span className="text-xs text-slate-400">Ток</span>
                </div>
 <span className="font-bold text-cyan-400">{Number(telemetry.current).toFixed(1)} А</span>
              </div>
 <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/30">
 <div className="flex items-center gap-2">
 <span className="text-xl">🛢️</span>
 <span className="text-xs text-slate-400">Дебит</span>
                </div>
 <span className="font-bold text-emerald-400">{Number(telemetry.flow_rate_oil).toFixed(1)} т/сут</span>
              </div>
 <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/30">
 <div className="flex items-center gap-2">
 <span className="text-xl">💧</span>
 <span className="text-xs text-slate-400">Обводн.</span>
                </div>
 <span className="font-bold text-purple-400">{Number(telemetry.water_cut).toFixed(1)}%</span>
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
