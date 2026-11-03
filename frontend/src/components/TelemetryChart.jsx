import React, { useState, useRef, useEffect } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, Area, ComposedChart,
} from 'recharts';

function formatTime(ts, period) {
  const d = new Date(ts);
  if (period === '7d') {
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  return (
 <div className="rounded-lg border /95 px-3 py-2 shadow-xl border-gray-600 bg-gray-900/95">
 <p className="text-sm font-semibold text-white">{Number(p.value).toFixed(2)}</p>
 <p className="text-xs text-gray-500 text-gray-400">{new Date(p.timestamp).toLocaleString('ru-RU')}</p>
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
 <div className="animate-fade-in relative rounded-2xl border p-6 shadow-lg transition-all duration-300 hover:shadow-xl border-gray-700 bg-gray-800">
      {/* Заголовок */}
 <div className="mb-1 flex items-center justify-between">
 <div className="flex items-center gap-3">
 <span className="text-3xl">{icon}</span>
          <div>
 <h3 className="text-lg font-bold text-white">{title}</h3>
            {current !== null && (
 <p className="text-2xl font-bold" style={{ color }}>
                {Number(current).toFixed(1)}{' '}
 <span className="text-sm font-normal text-gray-500 text-gray-400">{unit}</span>
              </p>
            )}
          </div>
        </div>
        {trainingMode && trainingTip && (
          <button
            type="button"
            aria-label="Подсказка"
            onMouseEnter={() => setShowTip(true)}
            onMouseLeave={() => setShowTip(false)}
            onClick={() => setShowTip((v) => !v)}
 className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 font-bold text-white transition hover:bg-blue-600"
          >
            ?
          </button>
        )}
      </div>

      {/* Текущее значение крупно (если заголовок не показал) */}
      {current === null && (
 <p className="mb-2 text-2xl font-bold text-gray-400">— <span className="text-sm font-normal">{unit}</span></p>
      )}

      {/* Карточка обучающей подсказки */}
      {trainingMode && trainingTip && showTip && (
        <div
          ref={tipRef}
 className="absolute right-3 top-16 z-50 w-72 rounded-lg border border-blue-200 p-4 shadow-2xl border-blue-800 bg-gray-700"
        >
 <p className="mb-2 text-sm font-bold text-white">{trainingTip.title}</p>
 <p className="mb-2 text-xs text-gray-200">
 <span className="font-semibold text-green-600 text-green-400">Норма:</span> {trainingTip.normal_range}
          </p>
 <p className="mb-2 text-xs text-gray-600 text-gray-300">{trainingTip.description}</p>
 <p className="mb-2 text-xs font-medium text-red-600 text-red-400">
 <span className="font-bold">⚠ Признаки опасности:</span> {trainingTip.danger_signs}
          </p>
 <p className="text-xs text-gray-200">
 <span className="font-semibold text-blue-600 text-blue-300">Действия оператора:</span> {trainingTip.actions}
          </p>
        </div>
      )}

      {/* График */}
      {data && data.length ? (
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#9ca3af" opacity={0.25} />
            <XAxis
              dataKey="timestamp"
              tickFormatter={(ts) => formatTime(ts, period)}
              stroke="#9ca3af"
              fontSize={11}
              minTickGap={40}
            />
            <YAxis
              stroke="#9ca3af"
              fontSize={11}
              domain={['auto', 'auto']}
              unit={` ${unit}`}
              tickFormatter={(v) => Number(v).toFixed(0)}
            />
            <Tooltip content={<CustomTooltip period={period} />} />
            <ReferenceLine y={current ?? undefined} stroke={color} strokeDasharray="4 4" strokeOpacity={0.4} />
            <Area
              dataKey="value"
              fill={`url(#gradient-${color.replace('#', '')})`}
              stroke="none"
              isAnimationActive={true}
              animationDuration={1000}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={3}
              dot={false}
              isAnimationActive={true}
              animationDuration={1000}
            />
          </ComposedChart>
        </ResponsiveContainer>
      ) : (
 <div className="flex h-[300px] items-center justify-center text-gray-500 text-gray-400">
          Нет данных за период
        </div>
      )}
    </div>
  );
}
