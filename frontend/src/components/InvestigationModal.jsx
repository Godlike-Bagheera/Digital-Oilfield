import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from 'recharts';

const PARAM_OPTIONS = [
  { key: 'current', label: '⚡ Ток (А)', color: '#3b82f6' },
  { key: 'casing_pressure', label: '📊 Затрубное (МПа)', color: '#ef4444' },
  { key: 'temperature', label: '🌡️ Температура (°C)', color: '#eab308' },
  { key: 'flow_rate_oil', label: 'Дебит нефти (т/сут)', color: '#22c55e' },
  { key: 'water_cut', label: '💦 Обводнённость (%)', color: '#06b6d4' },
];

const STATUS_LABELS = {
  online: 'Онлайн',
  warning: 'Внимание',
  alarm: 'Авария',
  maintenance: 'В ремонте',
  offline: 'Офлайн',
};

const formatTime = (iso) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/* Кастомный Tooltip с информацией об аномалиях */
const AnomalyTooltip = ({ active, payload, anomalies, paramKey }) => {
  if (!active || !payload || !payload.length) return null;
  const point = payload[0];
  const ts = point.payload?.timestampFull || point.payload?.timestamp;
  const pointAnomalies = (anomalies || []).filter(
    (a) => a.timestamp === ts && a.parameter === paramKey
  );
  return (
 <div className="max-w-xs rounded-lg border border-zinc-800 bg-[#18181b] p-3 text-sm shadow-xl">
 <p className="text-zinc-400 mb-1">{formatTime(ts)}</p>
 <p className="font-bold" style={{ color: point.color || '#fff' }}>
        {paramKey}: {Number(point.value).toFixed(2)}
      </p>
      {pointAnomalies.map((a, i) => (
 <div key={i} className="mt-2 pt-2 border-t border-red-900/60 text-red-400">
 <p className="font-semibold">⚠️ Аномалия (z-score: {a.z_score.toFixed(2)})</p>
 <p className="text-xs text-zinc-300">
            Среднее: {a.mean.toFixed(2)} | СКО: {a.std.toFixed(2)}
          </p>
        </div>
      ))}
    </div>
  );
};

const HITooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0];
  return (
 <div className="rounded-lg border border-zinc-800 bg-[#18181b] p-2 text-sm shadow-xl">
 <p className="text-zinc-400">{formatTime(p.payload?.timestampFull)}</p>
 <p className="font-bold text-green-400">Индекс здоровья: {Number(p.value).toFixed(0)}%</p>
    </div>
  );
};

const InvestigationModal = ({ isOpen, onClose, wellId, alertId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedParam, setSelectedParam] = useState('current');

  useEffect(() => {
    if (isOpen && wellId) {
      fetchInvestigationData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, wellId, alertId]);

  // Блокировка прокрутки фона при открытой модалке + Esc для закрытия
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  const fetchInvestigationData = async () => {
    setLoading(true);
    try {
      const url = alertId
        ? `/api/wells/${wellId}/investigate/?alert_id=${alertId}`
        : `/api/wells/${wellId}/investigate/`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching investigation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const anomalies = data?.anomalies || [];

  // Отметки anomaly timestamps по выбранному параметру — для ReferenceLine
  const anomalyTimestamps = useMemo(
    () => [...new Set(anomalies.filter((a) => a.parameter === selectedParam).map((a) => a.timestamp))],
    [anomalies, selectedParam]
  );

  const chartData = useMemo(() => {
    if (!data?.telemetry_24h) return [];
    return data.telemetry_24h.map((t) => ({
      timestamp: t.timestamp,
      timestampFull: t.timestamp,
      value: t[selectedParam],
      health_index: t.health_index,
    }));
  }, [data, selectedParam]);

  const hiData = useMemo(() => {
    if (!data?.telemetry_24h) return [];
    return data.telemetry_24h.map((t) => ({
      timestamp: t.timestamp,
      timestampFull: t.timestamp,
      health_index: t.health_index,
    }));
  }, [data]);

  if (!isOpen) return null;

  const currentOption = PARAM_OPTIONS.find((p) => p.key === selectedParam);

  return (
    <div
 className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
 <div className="w-full max-w-6xl max-h-[95vh] overflow-y-auto rounded-2xl border border-zinc-800/80 bg-[#121215]/95 p-6 shadow-2xl ring-1 ring-white/5 backdrop-blur-xl">
        {/* Заголовок модалки */}
 <div className="flex justify-between items-center mb-4">
 <h2 className="text-2xl font-bold">🔍 Расследование инцидента</h2>
                <p className="mt-1 text-sm text-zinc-400">Данные на момент инцидента (срез за 24 часа до аварии)</p>
          <button
            onClick={onClose}
 className="text-zinc-400 hover:text-white text-2xl leading-none px-2"
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

 {loading && <div className="text-center py-12 text-zinc-400">Загрузка данных...</div>}

        {data && (
          <div>
            {/* Информация о скважине */}
 <div className="mb-4 flex flex-wrap gap-x-8 gap-y-2 rounded-xl border border-zinc-800/80 bg-[#09090b]/50 p-4">
              <div>
 <span className="text-zinc-400 text-sm">Скважина</span>
 <p className="font-bold text-lg">№{data.well.number}</p>
              </div>
              <div>
 <span className="text-zinc-400 text-sm">ЦДНГ</span>
 <p className="font-semibold">{data.well.cdng}</p>
              </div>
              <div>
 <span className="text-zinc-400 text-sm">Тип насоса</span>
 <p className="font-semibold">{data.well.pump_type}</p>
              </div>
              <div>
 <span className="text-zinc-400 text-sm">Статус</span>
                <p
 className={`font-semibold ${
                    data.well.status === 'alarm'
                      ? 'text-red-400'
                      : data.well.status === 'warning'
                      ? 'text-yellow-400'
                      : 'text-green-400'
                  }`}
                >
                  {STATUS_LABELS[data.well.status] || data.well.status}
                </p>
              </div>
                {/* Пятый параметр: время инцидента из первого алерта за 24ч */}
                {data?.alerts_24h?.[0]?.created_at && (
                  <div>
                    <p className="text-xs text-zinc-500">Время инцидента</p>
                    <p className="font-semibold text-zinc-100">
                      {new Date(data.alerts_24h[0].created_at).toLocaleString('ru-RU')}
                    </p>
                  </div>
                )}
            </div>

            {/* Селектор параметра */}
 <div className="mb-3">
 <h3 className="text-sm text-zinc-400 mb-2 uppercase tracking-wide">
                Параметр для анализа
              </h3>
 <div className="flex flex-wrap gap-2">
                {PARAM_OPTIONS.map((p) => {
                  const anomalyCount = anomalies.filter((a) => a.parameter === p.key).length;
                  return (
                    <button
                      key={p.key}
                      onClick={() => setSelectedParam(p.key)}
 className={`px-3 py-1.5 rounded-lg text-sm transition flex items-center gap-1.5 ${
                        selectedParam === p.key
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-[#09090b]/50 text-zinc-400 border border-zinc-800/80 hover:bg-[#121215] transition-colors'
                      }`}
                    >
                      {p.label}
                      {anomalyCount > 0 && (
 <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                          {anomalyCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Основной график параметра с подсветкой аномалий */}
 <div className="mb-6 rounded-xl border border-zinc-800/80 bg-[#09090b]/50 p-4">
 <div className="flex justify-between items-center mb-3">
 <h3 className="font-bold">
                  📈 {currentOption?.label} — последние 24 часа
                </h3>
 <span className="text-sm text-red-400">
                  {anomalyTimestamps.length > 0
                    ? `⚠️ Аномалий: ${anomalyTimestamps.length} (красные пунктирные линии)`
                    : 'Аномалий по параметру не обнаружено'}
                </span>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={formatTime}
                    stroke="var(--text-muted)"
                    fontSize={12}
                    minTickGap={40}
                  />
                  <YAxis stroke="var(--text-muted)" fontSize={12} domain={['auto', 'auto']} />
                  <Tooltip
                    content={<AnomalyTooltip anomalies={anomalies} paramKey={selectedParam} />}
                  />
                  {/* Красные пунктирные ReferenceLine на местах аномалий */}
                  {anomalyTimestamps.map((ts, idx) => (
                    <ReferenceLine
                      key={`${ts}-${idx}`}
                      x={ts}
                      stroke="#ef4444"
                      strokeDasharray="5 5"
                      strokeWidth={2}
                      label={{
                        value: '⚠️',
                        position: 'top',
                        fill: '#ef4444',
                        fontSize: 14,
                      }}
                    />
                  ))}
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={currentOption?.color || '#3b82f6'}
                    strokeWidth={2}
                    dot={(props) => {
                      const { cx, cy, payload, index } = props;
                      const isAnomaly = anomalyTimestamps.includes(payload.timestampFull);
                      if (isAnomaly) {
                        return (
                          <circle
                            key={`anom-${index}`}
                            cx={cx}
                            cy={cy}
                            r={5}
                            fill="#ef4444"
                            stroke="#fecaca"
                            strokeWidth={2}
                          />
                        );
                      }
                      return <g key={`pt-${index}`} />;
                    }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* График индекса здоровья с порогами 90/60/30 */}
 <div className="mb-6 rounded-xl border border-zinc-800/80 bg-[#09090b]/50 p-4">
 <h3 className="font-bold mb-3">💚 Индекс здоровья за 24 часа</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={hiData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <defs>
                    <linearGradient id="hiGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={formatTime}
                    stroke="var(--text-muted)"
                    fontSize={12}
                    minTickGap={40}
                  />
                  <YAxis stroke="var(--text-muted)" fontSize={12} domain={[0, 100]} />
                  <Tooltip content={<HITooltip />} />
                  {/* Горизонтальные линии порогов: 90 / 60 / 30 */}
                  <ReferenceLine
                    y={90}
                    stroke="#22c55e"
                    strokeDasharray="6 3"
                    label={{ value: 'Норма 90', position: 'insideTopRight', fill: '#22c55e', fontSize: 11 }}
                  />
                  <ReferenceLine
                    y={60}
                    stroke="#eab308"
                    strokeDasharray="6 3"
                    label={{ value: 'Внимание 60', position: 'insideTopRight', fill: '#eab308', fontSize: 11 }}
                  />
                  <ReferenceLine
                    y={30}
                    stroke="#ef4444"
                    strokeDasharray="6 3"
                    label={{ value: 'Критично 30', position: 'insideTopRight', fill: '#ef4444', fontSize: 11 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="health_index"
                    stroke="#22c55e"
                    strokeWidth={2}
                    fill="url(#hiGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Сводка по аномалиям */}
 <div className="mb-6">
 <h3 className="font-bold mb-2">
                ⚠️ Обнаруженные аномалии (|z| &gt; 2): {anomalies.length}
              </h3>
              {anomalies.length > 0 ? (
 <div className="space-y-2 max-h-48 overflow-y-auto">
                  {anomalies.slice(0, 20).map((anomaly, idx) => (
                    <div
                      key={idx}
 className="p-2 bg-yellow-900/40 border border-yellow-800 rounded text-sm flex justify-between items-center"
                    >
                      <span>
                        <strong>{anomaly.parameter}</strong>: {anomaly.value.toFixed(2)}
 <span className="text-zinc-400 ml-2">
                          (среднее: {anomaly.mean.toFixed(2)}, СКО: {anomaly.std.toFixed(2)})
                        </span>
                      </span>
 <span className="flex items-center gap-3">
 <span className="text-xs text-zinc-400">{formatTime(anomaly.timestamp)}</span>
                        <span
 className={`font-mono text-xs px-2 py-0.5 rounded ${
                            anomaly.z_score > 3 ? 'bg-red-600 text-white' : 'bg-yellow-600 text-black'
                          }`}
                        >
                          z={anomaly.z_score.toFixed(2)}
                        </span>
                      </span>
                    </div>
                  ))}
                  {anomalies.length > 20 && (
 <p className="text-sm text-zinc-400">... и ещё {anomalies.length - 20} аномалий</p>
                  )}
                </div>
              ) : (
 <p className="text-zinc-400">Аномалий не обнаружено</p>
              )}
            </div>

            {/* Алерты за 24 часа */}
 <div className="mb-4">
 <h3 className="font-bold mb-2">
                🚨 Алерты за 24 часа: {(data.alerts_24h || []).length}
              </h3>
              {(data.alerts_24h || []).length > 0 ? (
 <div className="space-y-2 max-h-56 overflow-y-auto">
                  {(data.alerts_24h || []).slice(0, 30).map((alert) => (
                    <div
                      key={alert.id}
 className={`p-3 rounded border-l-4 text-sm ${
                        alert.alert_type === 'critical'
                          ? 'bg-red-900/40 border-red-500'
                          : alert.alert_type === 'warning'
                          ? 'bg-yellow-900/40 border-yellow-500'
                          : 'bg-blue-900/40 border-blue-500'
                      }`}
                    >
 <div className="flex justify-between">
 <span className="font-semibold">
                          {alert.alert_type === 'critical'
                            ? '🔴'
                            : alert.alert_type === 'warning'
                            ? '🟡'
                            : '🔵'}{' '}
                          {alert.message}
                        </span>
 <span className="text-xs text-zinc-400">{formatTime(alert.created_at)}</span>
                      </div>
 <p className="text-xs text-zinc-400 mt-1">
                        {alert.parameter}: {Number(alert.value).toFixed(2)} (порог:{' '}
                        {Number(alert.threshold).toFixed(2)})
 {!alert.is_active && <span className="ml-2 text-green-500">✓ закрыт</span>}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
 <p className="text-zinc-400">Нет алертов за период</p>
              )}
            </div>

            {/* Телеметрия — итоговая строка */}
 <div className="text-sm text-zinc-400 border-t border-zinc-800/80 pt-3">
              📊 Телеметрия за 24 часа: {chartData.length} записей
              {chartData.length > 0 && (
                <>
                  {' '}
                  | Период: {formatTime(chartData[0].timestamp)} —{' '}
                  {formatTime(chartData[chartData.length - 1].timestamp)}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvestigationModal;
