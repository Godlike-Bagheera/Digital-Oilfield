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
  ReferenceArea,
  Area,
  AreaChart,
} from 'recharts';
import { Search, X, AlertTriangle } from 'lucide-react';
import { getParameterLabel, formatParameterValue, humanizeMessage } from '../utils/parameters';

const PARAM_OPTIONS = [
  { key: 'current', label: 'Ток (А)', color: '#3b82f6' },
  { key: 'casing_pressure', label: 'Затрубное (МПа)', color: '#ef4444' },
  { key: 'temperature', label: 'Температура (°C)', color: '#eab308' },
  { key: 'flow_rate_oil', label: 'Дебит нефти (т/сут)', color: '#22c55e' },
  { key: 'water_cut', label: 'Обводнённость (%)', color: '#06b6d4' },
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

/* Группировка дублирующихся алертов: одинаковый alert_type+parameter,
   идущие подряд с интервалом < 10 минут, склеиваются в одну запись "×N" */
const groupAlerts = (alerts) => {
  if (!alerts || alerts.length === 0) return [];

  const sorted = [...alerts].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const groups = [];
  let currentGroup = null;

  for (const alert of sorted) {
    const key = `${alert.alert_type}-${alert.parameter}`;

    if (!currentGroup || currentGroup.key !== key) {
      if (currentGroup) groups.push(currentGroup);
      currentGroup = {
        key,
        alert_type: alert.alert_type,
        parameter: alert.parameter,
        message: alert.message,
        value: alert.value,
        threshold: alert.threshold,
        is_active: alert.is_active,
        start_time: alert.created_at,
        end_time: alert.created_at,
        count: 1
      };
    } else {
      // Склеиваем, если разница во времени меньше 10 минут
      const timeDiff = (new Date(alert.created_at) - new Date(currentGroup.end_time)) / 1000 / 60;
      if (timeDiff <= 10) {
        currentGroup.count++;
        currentGroup.end_time = alert.created_at;
        currentGroup.value = alert.value; // Берем последнее значение
      } else {
        groups.push(currentGroup);
        currentGroup = {
          key,
          alert_type: alert.alert_type,
          parameter: alert.parameter,
          message: alert.message,
          value: alert.value,
          threshold: alert.threshold,
          is_active: alert.is_active,
          start_time: alert.created_at,
          end_time: alert.created_at,
          count: 1
        };
      }
    }
  }
  if (currentGroup) groups.push(currentGroup);
  return groups;
};

/* Кастомный Tooltip с информацией об аномалиях (событиях-интервалах) */
const AnomalyTooltip = ({ active, payload, anomalies, paramKey }) => {
  if (!active || !payload || !payload.length) return null;
  const point = payload[0];
  const ts = point.payload?.timestampFull || point.payload?.timestamp;
  // Точка попадает в событие, если её timestamp внутри интервала [start_time, end_time]
  const pointAnomalies = (anomalies || []).filter((a) => {
    if (a.parameter !== paramKey || !a.start_time || !a.end_time) return false;
    return new Date(ts) >= new Date(a.start_time) && new Date(ts) <= new Date(a.end_time);
  });
  return (
 <div className="max-w-xs rounded-lg border border-zinc-800 bg-[#18181b] p-3 text-sm shadow-xl">
 <p className="text-zinc-400 mb-1">{formatTime(ts)}</p>
 <p className="font-bold" style={{ color: point.color || '#fff' }}>
        {paramKey}: {Number(point.value).toFixed(2)}
      </p>
      {pointAnomalies.map((a, i) => (
 <div key={i} className="mt-2 pt-2 border-t border-red-900/60 text-red-400">
 <p className="font-semibold">Аномалия (макс z-score: {Number(a.z_score_max ?? 0).toFixed(2)})</p>
 <p className="text-xs text-zinc-300">
            Значения: {Number(a.min_value ?? 0).toFixed(2)}–{Number(a.max_value ?? 0).toFixed(2)} | Длительность: {a.duration_minutes || 0} мин. | Точек: {a.count || 0}
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

  // События-интервалы аномалий по выбранному параметру (для ReferenceArea)
  const anomalyEvents = useMemo(
    () => anomalies.filter((a) => a.parameter === selectedParam),
    [anomalies, selectedParam]
  );
  // Быстрый lookup: timestamp точки -> событие (для подсветки точек на графике)
  const eventByTs = useMemo(() => {
    const map = {};
    anomalyEvents.forEach((ev) => {
      map[ev.start_time] = ev;
      map[ev.end_time] = ev;
    });
    return map;
  }, [anomalyEvents]);

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
 <div className="flex justify-between items-start mb-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-blue-500/20 bg-blue-500/10 text-blue-400">
              <Search size={20} />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-50">Расследование инцидента</h2>
              <p className="mt-1 text-sm text-zinc-400">Данные на момент инцидента (срез за 24 часа до аварии)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
            aria-label="Закрыть"
          >
            <X size={20} />
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
                  const eventCount = anomalies.filter((a) => a.parameter === p.key).length;
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
                      {eventCount > 0 && (
 <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                          {eventCount}
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
                  {currentOption?.label} — последние 24 часа
                </h3>
 <span className="text-sm text-red-400">
                  {anomalyEvents.length > 0
                    ? `Событий аномалий: ${anomalyEvents.length} (красные зоны)`
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
                  {/* Красные ЗОНЫ (ReferenceArea) для событий-интервалов аномалий.
                      Одна зона = одно событие вместо 300 ReferenceLine — резает число
                      компонентов Recharts с сотен до единиц и убирает лаги модалки. */}
                  {anomalyEvents.map((ev, idx) => (
                    <ReferenceArea
                      key={`${ev.start_time}-${idx}`}
                      x1={ev.start_time}
                      x2={ev.end_time === ev.start_time ? ev.start_time : ev.end_time}
                      fill="#ef4444"
                      fillOpacity={0.2}
                      stroke="#ef4444"
                      strokeOpacity={0.3}
                      label={
                        ev.duration_minutes >= 1
                          ? {
                              value: `Аномалия ${Math.round(ev.duration_minutes)}м`,
                              position: 'insideTop',
                              fill: '#ef4444',
                              fontSize: 10,
                              fontWeight: 'bold',
                            }
                          : undefined
                      }
                    />
                  ))}
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={currentOption?.color || '#3b82f6'}
                    strokeWidth={2}
                    dot={(props) => {
                      const { cx, cy, payload, index } = props;
                      // Подсветка только границ событий (не 300 точек)
                      const ev = eventByTs[payload.timestampFull];
                      if (ev) {
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
 <h3 className="font-bold mb-3">Индекс здоровья за 24 часа</h3>
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

            {/* Сводка по событиям-аномалиям (интервалы, а не 300 точек) */}
 <div className="mb-6">
 <h3 className="font-bold mb-2">
                Обнаруженные события аномалий (|z| &gt; 2): {anomalies.length}
              </h3>
              {anomalyEvents.length > 0 ? (
 <div className="space-y-2 max-h-48 overflow-y-auto">
                  {anomalyEvents.map((ev, idx) => (
                    <div
                      key={idx}
 className="p-2 bg-yellow-900/40 border border-yellow-800 rounded text-sm flex justify-between items-center"
                    >
                      <span>
                        <strong>{PARAM_OPTIONS.find((p) => p.key === ev.parameter)?.label || ev.parameter}</strong>: {' '}
                        от {formatTime(ev.start_time)} до {formatTime(ev.end_time)} ({ev.duration_minutes} мин),
                        значения {Number(ev.min_value ?? 0).toFixed(2)}–{Number(ev.max_value ?? 0).toFixed(2)},
                        точек: {ev.count ?? 0}
                        {(typeof ev.mean === 'number' && typeof ev.std === 'number') && (
                          <span className="text-zinc-400 ml-2">
                            (среднее: {ev.mean.toFixed(2)}, СКО: {ev.std.toFixed(2)})
                          </span>
                        )}
                      </span>
 <span
 className={`font-mono text-xs px-2 py-0.5 rounded ${
                          Number(ev.z_score_max ?? 0) > 3 ? 'bg-red-600 text-white' : 'bg-yellow-600 text-black'
                        }`}
 >
                        z={Number(ev.z_score_max ?? 0).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
 <p className="text-zinc-400">Аномалий по выбранному параметру не обнаружено</p>
              )}
            </div>

            {/* Алерты за 24 часа */}
 <div className="mb-4">
 <h3 className="font-bold mb-2">
                Алерты за 24 часа: {(data.alerts_24h || []).length}
              </h3>
              {(data.alerts_24h || []).length > 0 ? (
 <div className="space-y-2 max-h-56 overflow-y-auto">
                  {groupAlerts(data.alerts_24h || []).map((group, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border-l-4 text-sm transition ${
                        group.alert_type === 'critical'
                          ? 'bg-red-900/40 border-red-500 hover:bg-red-900/30'
                          : group.alert_type === 'warning'
                          ? 'bg-yellow-900/40 border-yellow-500'
                          : 'bg-blue-900/40 border-blue-500'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">
                              <span className={`mr-2 inline-block h-2 w-2 rounded-full ${
                                group.alert_type === 'critical' ? 'bg-rose-500' : group.alert_type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                              }`} />
                              {humanizeMessage(group.message)}
                            </span>
                            {group.count > 1 && (
                              <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full font-medium border border-red-500/30 whitespace-nowrap">
                                ×{group.count}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-400">
                            {getParameterLabel(group.parameter)}: {formatParameterValue(group.parameter, group.value)} (порог:{' '}
                            {formatParameterValue(group.parameter, group.threshold)})
                            {!group.is_active && <span className="ml-2 text-emerald-500">закрыт</span>}
                          </p>
                        </div>
                        <div className="text-right text-xs text-zinc-500 whitespace-nowrap">
                          <p>{formatTime(group.start_time)}</p>
                          {group.count > 1 && (
                            <p className="text-zinc-600">— {formatTime(group.end_time)}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
 <p className="text-zinc-400">Нет алертов за период</p>
              )}
            </div>

            {/* Телеметрия — итоговая строка */}
 <div className="text-sm text-zinc-400 border-t border-zinc-800/80 pt-3">
              Телеметрия за 24 часа: {chartData.length} записей
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
