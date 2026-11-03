import React from 'react';
import { Link } from 'react-router-dom';
import HealthGauge from './HealthGauge.jsx';

export function getTimeAgo(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);

  if (diffSec < 60) return 'только что';
  if (diffSec < 3600) {
    const mins = Math.floor(diffSec / 60);
    return `${mins} мин назад`;
  }
  if (diffSec < 86400) {
    const hours = Math.floor(diffSec / 3600);
    return `${hours} ч назад`;
  }
  return date.toLocaleDateString('ru-RU');
}

const STATUS_STYLES = {
  online: { bg: '#22c55e', label: 'Онлайн', pulse: false },
  warning: { bg: '#eab308', label: 'Внимание', pulse: false },
  alarm: { bg: '#ef4444', label: 'Авария', pulse: true },
  offline: { bg: '#6b7280', label: 'Офлайн', pulse: false },
};

export default function WellCard({ well }) {
  const status = STATUS_STYLES[well.status] || STATUS_STYLES.offline;
  const telemetry = well.latest_telemetry;

  return (
    <Link
      to={`/well/${well.id}`}
      className="relative block rounded-2xl bg-gray-800 shadow-lg p-5 transition-transform duration-200 hover:scale-105 hover:shadow-xl border border-gray-700"
    >
      {/* Статус-бейдж справа сверху */}
      <span
        className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold text-white ${status.pulse ? 'animate-pulse-slow' : ''}`}
        style={{ backgroundColor: status.bg }}
      >
        {status.label}
      </span>

      {/* Заголовок */}
      <h3 className="text-xl font-bold mb-0.5">Скважина №{well.number}</h3>
      <p className="text-sm text-gray-400 mb-3">{well.cdng}</p>

      {telemetry ? (
        <div className="flex items-center gap-4">
          {/* Индекс здоровья */}
          <HealthGauge value={telemetry.health_index ?? 0} size={100} />

          {/* Ключевые параметры */}
          <div className="flex-1 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">⚡ Ток:</span>
              <span className="font-semibold">{Number(telemetry.current).toFixed(1)} А</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">🛢️ Дебит:</span>
              <span className="font-semibold">{Number(telemetry.flow_rate_oil).toFixed(1)} т/сут</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">💧 Обводн.:</span>
              <span className="font-semibold">{Number(telemetry.water_cut).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-6 text-center text-gray-500 italic">Нет данных</div>
      )}

      {/* Время последнего обновления */}
      <p className="mt-3 text-xs text-gray-500">
        🔄 Обновлено: {telemetry ? getTimeAgo(telemetry.timestamp) : '—'}
      </p>
    </Link>
  );
}
