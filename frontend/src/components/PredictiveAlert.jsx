import React from 'react';
import { TrendingUp, TrendingDown, Clock } from 'lucide-react';

const PARAMETERS = {
  current: { name: 'Ток двигателя', unit: 'А' },
  casing_pressure: { name: 'Давление затрубное', unit: 'МПа' },
  temperature: { name: 'Температура', unit: '°C' },
  flow_rate_oil: { name: 'Дебит нефти', unit: 'т/сут' },
  water_cut: { name: 'Обводнённость', unit: '%' },
};

const CONFIDENCE = {
  high: { label: 'Высокая', cls: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  medium: { label: 'Средняя', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  low: { label: 'Низкая', cls: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
};

function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} мин`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} ч ${m} мин` : `${h} ч`;
}

const PredictiveAlert = ({ prediction }) => {
  const param = PARAMETERS[prediction.parameter] || { name: prediction.parameter, unit: '' };
  const confidence = CONFIDENCE[prediction.confidence] || CONFIDENCE.low;
  const TrendIcon = prediction.current_trend === 'down' ? TrendingDown : TrendingUp;
  const minutesLeft = prediction.estimated_time
    ? Math.max(0, Math.round((prediction.estimated_time - new Date()) / 60000))
    : null;
  const fmt = (v) => Number(v).toFixed(1);

  return (
    <div className="mb-4 flex gap-4 rounded-xl border border-blue-500/20 bg-blue-500/5 p-5 shadow-lg ring-1 ring-white/5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-blue-500/20 bg-blue-500/10 text-blue-400">
        <TrendIcon size={20} />
      </div>
      <div className="flex-1">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-zinc-50">{param.name}: прогноз выхода за критический порог</h3>
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${confidence.cls}`}>
            Уверенность: {confidence.label}
          </span>
        </div>
        <p className="text-sm text-zinc-300">
          Сейчас <span className="font-semibold text-zinc-50">{fmt(prediction.current_value)} {param.unit}</span>
          {' → через '}{prediction.horizon_hours} ч ожидается{' '}
          <span className="font-semibold text-blue-400">{fmt(prediction.predicted_value)} {param.unit}</span>
          {' '}(порог {prediction.critical_value} {param.unit})
        </p>
        {minutesLeft !== null && (
          <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-amber-400">
            <Clock size={14} />
            Критическое значение будет достигнуто примерно через {formatDuration(minutesLeft)}
          </p>
        )}
      </div>
    </div>
  );
};

export default PredictiveAlert;
