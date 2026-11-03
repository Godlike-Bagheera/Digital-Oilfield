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

const WellCard = ({ well }) => {
  const telemetry = well.latest_telemetry;
  const healthIndex = telemetry?.health_index || 0;

  const getStatusColor = (status) => {
    const colors = {
      online: 'bg-green-500',
      warning: 'bg-yellow-500',
      alarm: 'bg-red-500 animate-pulse',
      offline: 'bg-gray-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  const getStatusText = (status) => {
    const texts = {
      online: 'Онлайн',
      warning: 'Внимание',
      alarm: 'Авария',
      offline: 'Офлайн'
    };
    return texts[status] || 'Неизвестно';
  };

  return (
    <Link to={`/well/${well.id}`} className="block group">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl dark:border-gray-700 dark:bg-gray-800">
        {/* Заголовок */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="mb-1 text-xl font-bold text-gray-900 dark:text-white">
              Скважина №{well.number}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{well.cdng}</p>
          </div>
          <span className={`${getStatusColor(well.status)} rounded-full px-3 py-1 text-xs font-medium text-white`}>
            {getStatusText(well.status)}
          </span>
        </div>

        {/* Индекс здоровья */}
        <div className="mb-4 flex items-center justify-center">
          <HealthGauge value={healthIndex} />
        </div>

        {/* Параметры */}
        {telemetry ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
              <span className="text-2xl">⚡</span>
              <div className="text-right">
                <p className="text-xs text-gray-600 dark:text-gray-400">Ток</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {Number(telemetry.current).toFixed(1)} А
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
              <span className="text-2xl">🛢️</span>
              <div className="text-right">
                <p className="text-xs text-gray-600 dark:text-gray-400">Дебит</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {Number(telemetry.flow_rate_oil).toFixed(1)} т/сут
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-purple-50 p-3 dark:bg-purple-900/20">
              <span className="text-2xl">💧</span>
              <div className="text-right">
                <p className="text-xs text-gray-600 dark:text-gray-400">Обводн.</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {Number(telemetry.water_cut).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">
            Нет данных
          </div>
        )}

        {/* Время обновления */}
        <div className="mt-4 border-t border-gray-200 pt-4 text-center text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Обновлено: {getTimeAgo(telemetry?.timestamp)}
        </div>
      </div>
    </Link>
  );
};

export default WellCard;
