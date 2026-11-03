import React, { useState, useRef, useEffect } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';

function formatTime(ts, period) {
  const d = new Date(ts);
  if (period === '7d') {
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function CustomTooltip({ active, payload, period }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-gray-600 bg-gray-900/95 px-3 py-2 shadow-xl">
      <p className="text-sm font-semibold text-white">{Number(p.value).toFixed(2)}</p>
      <p className="text-xs text-gray-400">{new Date(p.timestamp).toLocaleString('ru-RU')}</p>
    </div>
  );
}

export default function TelemetryChart({ title, unit, data, color, trainingMode, trainingTip, icon, period = '24h' }) {
  const [showTip, setShowTip] = useState(false);
  const tipRef = useRef(null);

  useEffect(() => {
    if (!showTip) return;
    const handler = (e) => {
      if (tipRef.current && !tipRef.current.contains(e.target)) setShowTip(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showTip]);

  const current = data && data.length ? data[data.length - 1].value : null;

  return (
    <div className="relative rounded-xl bg-gray-800 p-4 shadow-md transition-shadow hover:shadow-lg">
      {/* Заголовок */}
      <div className="mb-1 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-semibold text-gray-100">
          <span>{icon}</span> {title}
        </h3>
        {trainingMode && trainingTip && (
          <button
            type="button"
            aria-label="Подсказка"
            onMouseEnter={() => setShowTip(true)}
            onMouseLeave={() => setShowTip(false)}
            onClick={() => setShowTip((v) => !v)}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-blue-400 text-sm font-bold text-blue-300 hover:bg-blue-500/20"
          >
            ?
          </button>
        )}
      </div>

      {/* Текущее значение */}
      <p className="mb-2 text-2xl font-bold" style={{ color }}>
        {current !== null ? Number(current).toFixed(1) : '—'}{' '}
        <span className="text-sm font-normal text-gray-400">{unit}</span>
      </p>

      {/* График */}
      {data && data.length ? (
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={(ts) => formatTime(ts, period)}
              stroke="#6b7280"
              fontSize={11}
              minTickGap={40}
            />
            <YAxis stroke="#6b7280" fontSize={11} domain={['auto', 'auto']} unit={` ${unit}`} tickFormatter={(v) => Number(v).toFixed(0)} />
            <Tooltip content={<CustomTooltip period={period} />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={true}
              animationDuration={800}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-[250px] items-center justify-center text-gray-500">Нет данных за период</div>
      )}

      {/* Карточка обучающей подсказки */}
      {trainingMode && trainingTip && showTip && (
        <div
          ref={tipRef}
          className="absolute right-3 top-12 z-50 w-72 rounded-lg border border-gray-500 bg-gray-700 p-4 shadow-2xl"
        >
          <p className="mb-2 text-sm font-bold text-white">{trainingTip.title}</p>
          <p className="mb-2 text-xs text-gray-200">
            <span className="font-semibold text-green-400">Норма:</span> {trainingTip.normal_range}
          </p>
          <p className="mb-2 text-xs text-gray-300">{trainingTip.description}</p>
          <p className="mb-2 text-xs font-medium text-red-400">
            <span className="font-bold">⚠ Признаки опасности:</span> {trainingTip.danger_signs}
          </p>
          <p className="text-xs text-gray-200">
            <span className="font-semibold text-blue-300">Действия оператора:</span> {trainingTip.actions}
          </p>
        </div>
      )}
    </div>
  );
}
