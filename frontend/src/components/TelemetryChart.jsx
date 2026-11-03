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
    <div
      style={{
        backgroundColor: '#18181b',
        borderColor: '#27272a',
        borderRadius: '8px',
        color: '#f4f4f5',
      }}
      className="border px-3 py-2 shadow-xl"
    >
      <p className="text-sm font-semibold">{Number(p.value).toFixed(2)}</p>
      <p className="text-xs text-zinc-400">{new Date(p.timestamp).toLocaleString('ru-RU')}</p>
    </div>
  );
}

export default function TelemetryChart({ title, unit, data, color, trainingMode, trainingTip, icon, period = '24h' }) {
  const [showTip, setShowTip] = useState(false);
  const tipRef = useRef(null);

  useEffect(() => {
    if (!showTip) return;
    const handler = (e) => {
      // не закрывать при клике по самой кнопке "?" (кнопка ререндерится и вылетает из DOM)
      if (e.target && e.target.closest && e.target.closest('button[aria-label="Подсказка"]')) return;
      if (tipRef.current && !tipRef.current.contains(e.target)) setShowTip(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showTip]);

  const current = data && data.length ? data[data.length - 1].value : null;

  return (
    <div className="animate-fade-in-up relative rounded-2xl border border-zinc-800/80 bg-[#121215] p-6 shadow-lg ring-1 ring-white/5 backdrop-blur-md transition-all duration-300 hover:border-zinc-700 hover:shadow-2xl hover:ring-white/10">
      {/* Заголовок */}
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base"
            style={{ color, backgroundColor: `${color}1a`, border: `1px solid ${color}33` }}
          >
            {icon}
          </span>
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-zinc-50">{title}</h3>
            {current !== null && (
              <p className="mt-0.5 text-2xl font-semibold tracking-tight" style={{ color }}>
                {Number(current).toFixed(1)}{' '}
                <span className="text-sm font-normal text-zinc-400">{unit}</span>
              </p>
            )}
          </div>
        </div>
        {trainingMode && trainingTip && (
          <button
            type="button"
            aria-label="Подсказка"
            onMouseEnter={() => { if (window.matchMedia('(hover: hover)').matches) setShowTip(true); }}
            onMouseLeave={() => { if (window.matchMedia('(hover: hover)').matches) setShowTip(false); }}
            onClick={() => setShowTip((v) => !v)}
 className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 font-bold text-white transition hover:bg-blue-600"
          >
            ?
          </button>
        )}
      </div>

      {/* Текущее значение крупно (если заголовок не показал) */}
      {current === null && (
        <p className="mb-2 text-2xl font-semibold text-zinc-500">— <span className="text-sm font-normal">{unit}</span></p>
      )}

      {/* Карточка обучающей подсказки */}
      {trainingMode && trainingTip && showTip && (
        <div
          ref={tipRef}
          className="absolute right-3 top-16 z-50 w-72 rounded-xl border border-blue-500/20 bg-[#18181b]/95 p-4 shadow-2xl ring-1 ring-white/5 backdrop-blur-md"
        >
          <p className="mb-2 text-sm font-semibold text-zinc-50">{trainingTip.title}</p>
          <p className="mb-2 text-xs text-zinc-300">
            <span className="font-semibold text-emerald-400">Норма:</span> {trainingTip.normal_range}
          </p>
          <p className="mb-2 text-xs text-zinc-400">{trainingTip.description}</p>
          <p className="mb-2 text-xs font-medium text-rose-400">
            <span className="font-bold">Признаки опасности:</span> {trainingTip.danger_signs}
          </p>
          <p className="text-xs text-zinc-300">
            <span className="font-semibold text-blue-400">Действия оператора:</span> {trainingTip.actions}
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
            <CartesianGrid vertical={false} stroke="#27272a" strokeDasharray="4 4" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={(ts) => formatTime(ts, period)}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#71717a', fontSize: 12 }}
              minTickGap={40}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#71717a', fontSize: 12 }}
              domain={['auto', 'auto']}
              unit={` ${unit}`}
              tickFormatter={(v) => Number(v).toFixed(0)}
            />
            <Tooltip
              content={<CustomTooltip period={period} />}
              cursor={{ stroke: '#3f3f46', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            <ReferenceLine y={current ?? undefined} stroke={color} strokeDasharray="4 4" strokeOpacity={0.4} />
            <Area
              type="monotone"
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
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              isAnimationActive={true}
              animationDuration={1000}
            />
          </ComposedChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-[300px] items-center justify-center text-sm text-zinc-500">
          Нет данных за период
        </div>
      )}
    </div>
  );
}
