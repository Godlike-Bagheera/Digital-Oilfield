import React from 'react';
import { Link } from 'react-router-dom';
import HealthGauge from './HealthGauge';

// Цвета статусов — из единой палитры (CSS-переменные --status-*, tailwind: status.*)
const STATUS_CONFIG = {
  online: { text: 'В работе', border: 'border-l-status-online', badge: 'bg-status-online/10 text-status-online border-status-online/20', dot: 'bg-status-online' },
  warning: { text: 'Внимание', border: 'border-l-status-warning', badge: 'bg-status-warning/10 text-status-warning border-status-warning/20', dot: 'bg-status-warning' },
  alarm: { text: 'Авария', border: 'border-l-status-alarm', badge: 'bg-status-alarm/10 text-status-alarm border-status-alarm/20 animate-pulse-alert', dot: 'bg-status-alarm' },
  maintenance: { text: 'В ремонте', border: 'border-l-status-maintenance', badge: 'bg-status-maintenance/10 text-status-maintenance border-status-maintenance/20', dot: 'bg-status-maintenance' },
  offline: { text: 'Офлайн', border: 'border-l-status-offline', badge: 'bg-status-offline/10 text-zinc-400 border-status-offline/20', dot: 'bg-status-offline' },
};

const getTimeAgo = (timestamp) => {
  if (!timestamp) return 'нет данных';
  const diff = Math.floor((new Date() - new Date(timestamp)) / 1000);
  if (diff < 60) return 'только что';
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  return new Date(timestamp).toLocaleDateString('ru-RU');
};

const WellCard = ({ well }) => {
  const telemetry = well.latest_telemetry;
  const health = telemetry?.health_index || 0;
  const status = STATUS_CONFIG[well.status] || STATUS_CONFIG.offline;

  const params = telemetry
    ? [
        { label: 'Ток', value: `${telemetry.current?.toFixed(1)} А` },
        { label: 'Дебит нефти', value: `${telemetry.flow_rate_oil?.toFixed(1)} т/сут` },
        { label: 'Обводнённость', value: `${telemetry.water_cut?.toFixed(1)} %` },
      ]
    : [];

  return (
    <Link to={`/well/${well.id}`} className="group block animate-fade-in-up focus:outline-none">
      <div
        className={`h-full rounded-xl border border-zinc-800/80 border-l-4 ${status.border} bg-[#121215] p-5 shadow-lg ring-1 ring-white/5 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/40 hover:border-zinc-700 group-focus-visible:ring-2 group-focus-visible:ring-blue-500/50`}
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{well.cdng}</p>
            <h3 className="mt-1 text-2xl font-bold tracking-tight text-zinc-50">№{well.number}</h3>
          </div>
          <span className={`whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${status.badge}`}>
            {status.text}
          </span>
        </div>

        <div className="my-2 flex justify-center">
          <HealthGauge value={health} />
        </div>

        {telemetry ? (
          <dl className="mt-3 divide-y divide-zinc-800/80 rounded-lg border border-zinc-800/80 bg-[#09090b]/50">
            {params.map((p) => (
              <div key={p.label} className="flex items-center justify-between px-3 py-2">
                <dt className="text-xs text-zinc-500">{p.label}</dt>
                <dd className="text-sm font-medium tabular-nums text-zinc-200">{p.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <div className="py-8 text-center text-sm text-zinc-500">Нет данных телеметрии</div>
        )}

        <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
            {getTimeAgo(telemetry?.timestamp)}
          </span>
          <span className="text-zinc-600 transition-colors group-hover:text-blue-400">Подробнее</span>
        </div>
      </div>
    </Link>
  );
};

export default WellCard;
