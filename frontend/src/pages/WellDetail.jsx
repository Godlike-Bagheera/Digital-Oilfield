import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import TelemetryChart from '../components/TelemetryChart';
import AlertList from '../components/AlertList';
import PeriodSelector from '../components/PeriodSelector';
import HealthGauge from '../components/HealthGauge';
import PredictiveAlert from '../components/PredictiveAlert';
import InvestigationModal from '../components/InvestigationModal';
import ConfirmModal from '../components/ConfirmModal';
import toast from 'react-hot-toast';
import { checkAllPredictions } from '../utils/predictions';
import { Zap, Gauge, Activity, Thermometer, Droplet, Fuel, Waves, RotateCw, Wrench, TrendingUp, FileSpreadsheet, FileText, ArrowLeft, Loader2 } from 'lucide-react';
import * as api from '../services/api';

const STATUS_BADGE = {
  online: { text: 'Онлайн', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  warning: { text: 'Внимание', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  alarm: { text: 'Авария', cls: 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse-alert' },
  maintenance: { text: 'В ремонте', cls: 'bg-orange-500/10 text-orange-400 border-orange-500/20 animate-pulse-alert' },
  offline: { text: 'Офлайн', cls: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
};

export default function WellDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [well, setWell] = useState(null);
  const [telemetry, setTelemetry] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [trainingTips, setTrainingTips] = useState({});
  const [period, setPeriod] = useState('24h');
  const [trainingMode, setTrainingMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [predictions, setPredictions] = useState([]);
  // Выбранный алерт для модалки расследования (null — модалка закрыта)
  const [selectedAlert, setSelectedAlert] = useState(null);
  // Фильтрация и пагинация алертов: 'active' | 'history'
  const [alertFilter, setAlertFilter] = useState('active');
  const [visibleAlertsCount, setVisibleAlertsCount] = useState(5);
  // Фильтр по дате для вкладки «Вся история» (пустая строка — без фильтра)
  const [alertDate, setAlertDate] = useState('');
  // Состояния загрузки: подтверждение и выполнение ремонта, экспорт (ключ — тип отчёта)
  const [showRepairConfirm, setShowRepairConfirm] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [isExporting, setIsExporting] = useState({});

  const fetchTelemetry = useCallback(async (wellId, prd) => {
    try {
      const data = await api.getTelemetry(wellId, { period: prd });
      const list = Array.isArray(data) ? data : data.results || [];
      setTelemetry(list);
      // Предиктивный анализ по полученной телеметрии
      const preds = checkAllPredictions(list);
      setPredictions(preds);
    } catch (e) {
      console.error('Ошибка загрузки телеметрии:', e);
    }
  }, []);

  const fetchAlerts = useCallback(async (wellId) => {
    try {
      // /wells/{id}/alerts/ отдаёт ВСЕ алерты скважины без пагинации
      const data = await api.getWellAlerts(wellId);
      setAlerts(Array.isArray(data) ? data : data.results || []);
    } catch (e) {
      console.error('Ошибка загрузки алертов:', e);
    }
  }, []);

  const fetchWell = useCallback(async (wellId) => {
    try {
      setError(null);
      const data = await api.getWell(wellId);
      setWell(data);
      fetchTelemetry(wellId, period);
      fetchAlerts(wellId);
    } catch (e) {
      setError(`Не удалось загрузить скважину: ${e.message}`);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchTelemetry, fetchAlerts]);

  const fetchTrainingTips = useCallback(async () => {
    try {
      const data = await api.getTrainingTips();
      const list = Array.isArray(data) ? data : data.results || [];
      const map = {};
      list.forEach((tip) => { map[tip.parameter] = tip; });
      setTrainingTips(map);
    } catch (e) {
      console.error('Ошибка загрузки подсказок:', e);
    }
  }, []);

  // Монтирование / смена id скважины
  useEffect(() => {
    setLoading(true);
    fetchWell(id);
    fetchTrainingTips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Автообновление данных каждые 5 секунд (зависит от id И period).
  // ВАЖНО: вызывает fetchWell — чтобы health_index и статус скважины
  // обновлялись с сервера без F5 (фикс рассинхронизации состояния).
  useEffect(() => {
    if (!id) return;
    const interval = setInterval(async () => {
      try {
        const data = await api.getWell(id);
        setWell(data);
      } catch (e) {
        console.error('Ошибка автообновления скважины:', e);
      }
      await fetchTelemetry(id, period);
      await fetchAlerts(id);
    }, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, period]);

  // Мгновенное обновление при смене периода
  useEffect(() => {
    if (well) fetchTelemetry(well.id, period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  if (loading) {
    return (
 <div className="animate-fade-in">
        {/* Skeleton шапки */}
 <div className="mb-6 flex items-center justify-between rounded-2xl border border-zinc-800/80 bg-[#121215] p-6 shadow-lg">
 <div className="space-y-3">
 <div className="h-8 w-48 animate-pulse rounded-xl border border-zinc-800/80 bg-[#121215]" />
 <div className="h-4 w-64 animate-pulse rounded-xl border border-zinc-800/80 bg-[#121215]" />
          </div>
 <div className="h-28 w-28 animate-pulse rounded-full border border-zinc-800/80 bg-[#121215]" />
        </div>
        {/* Skeleton графиков */}
 <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {[...Array(8)].map((_, i) => (
 <div key={i} className="rounded-2xl border border-zinc-800/80 bg-[#121215] p-6 shadow-lg">
 <div className="mb-4 h-6 w-1/3 animate-pulse rounded-xl border border-zinc-800/80 bg-[#121215]" />
 <div className="h-[300px] animate-pulse rounded-xl border border-zinc-800/80 bg-[#121215]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
 <div className="mx-auto mt-10 max-w-lg rounded-xl border border-rose-500/20 bg-rose-500/10 p-6 text-center">
 <p className="mb-4 text-sm text-rose-400">{error}</p>
        <button
          type="button"
          onClick={() => { setLoading(true); fetchWell(id); }}
 className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-500"
        >
          Повторить
        </button>
      </div>
    );
  }

  if (!well) {
    return (
 <div className="mt-10 text-center text-zinc-400">
 <p className="mb-4 text-xl">Скважина не найдена</p>
 <button type="button" onClick={() => navigate('/')} className="text-blue-400 underline-offset-4 hover:underline">
          <ArrowLeft size={14} className="mr-1 inline" />Назад к списку
        </button>
      </div>
    );
  }

  const badge = STATUS_BADGE[well.status] || STATUS_BADGE.offline;
  const latest = well.latest_telemetry;
  const healthIndex = latest ? latest.health_index : null;

  // Завершение ремонта: вызывает POST /api/wells/{id}/repair/ и подтягивает
  // СВЕЖИЕ данные с сервера (без перезагрузки страницы и без локального setWell)
  const handleRepair = async () => {
    if (isRepairing) return;
    setIsRepairing(true);
    try {
      const response = await fetch(`/api/wells/${well.id}/repair/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();

      // ВАЖНО: подтягиваем СВЕЖИЕ данные с сервера вместо локального setWell
      await fetchWell(well.id);
      await fetchTelemetry(well.id, period);
      await fetchAlerts(well.id);

      // Очищаем предиктивные алерты до следующего обновления телеметрии
      setPredictions([]);

      toast.success(data.message || 'Скважина перезапущена после ремонта');
    } catch (err) {
      console.error('Repair error:', err);
      toast.error('Ошибка ремонта: ' + err.message);
    } finally {
      setIsRepairing(false);
    }
  };

  const chartData = (key) => telemetry.map((t) => ({ timestamp: t.timestamp, value: t[key] }));

  // Общая логика скачивания отчёта: POST на эндпоинт экспорта -> blob -> файл
  const downloadReport = async (key, endpoint, body, filename) => {
    if (isExporting[key]) return;
    setIsExporting((prev) => ({ ...prev, [key]: true }));
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(`Файл ${filename} скачан`);
    } catch (error) {
      toast.error('Ошибка экспорта: ' + error.message);
    } finally {
      setIsExporting((prev) => ({ ...prev, [key]: false }));
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const exportActions = [
    { key: 'telemetryExcel', label: 'Экспорт в Excel', Icon: FileSpreadsheet,
      run: () => downloadReport('telemetryExcel', '/api/wells/export/telemetry/', { well_id: well.id, period }, `telemetry_well_${well.number}_${period}.xlsx`) },
    { key: 'telemetryPdf', label: 'Телеметрия PDF', Icon: FileText,
      run: () => downloadReport('telemetryPdf', '/api/wells/export/telemetry-pdf/', { well_id: well.id, period }, `telemetry_well_${well.number}_${period}.pdf`) },
    { key: 'shiftExcel', label: 'Сменный отчёт Excel', Icon: FileSpreadsheet,
      run: () => downloadReport('shiftExcel', '/api/wells/export/shift-report/', { date: today }, `shift_report_${today}.xlsx`) },
    { key: 'shiftPdf', label: 'Сменный отчёт PDF', Icon: FileText,
      run: () => downloadReport('shiftPdf', '/api/wells/export/shift-report-pdf/', { date: today }, `shift_report_${today}.pdf`) },
  ];

  const charts = [
    { title: 'Ток двигателя', unit: 'А', color: '#3b82f6', icon: <Zap size={18} />, key: 'current', tip: 'current' },
    { title: 'Давление затрубное', unit: 'МПа', color: '#ef4444', icon: <Gauge size={18} />, key: 'casing_pressure', tip: 'casing_pressure' },
    { title: 'Давление нагнетательное', unit: 'МПа', color: '#f97316', icon: <Activity size={18} />, key: 'discharge_pressure', tip: null },
    { title: 'Температура', unit: '°C', color: '#eab308', icon: <Thermometer size={18} />, key: 'temperature', tip: 'temperature' },
    { title: 'Дебит жидкости', unit: 'м³/сут', color: '#8b5cf6', icon: <Droplet size={18} />, key: 'flow_rate_liquid', tip: null },
    { title: 'Дебит нефти', unit: 'т/сут', color: '#22c55e', icon: <Fuel size={18} />, key: 'flow_rate_oil', tip: 'flow_rate_oil' },
    { title: 'Обводнённость', unit: '%', color: '#06b6d4', icon: <Waves size={18} />, key: 'water_cut', tip: 'water_cut' },
    { title: 'Число качаний', unit: 'кач/мин', color: '#ec4899', icon: <RotateCw size={18} />, key: 'stroke_rate', tip: null },
  ];

  // Фильтрация алертов по табам, дате (вкладка «История») и пагинация (5 записей + «Показать ещё»)
  const filteredAlerts = alerts.filter(a => {
    // 1. Фильтр по табу (активные/история)
    if (alertFilter === 'active' && !a.is_active) return false;

    // 2. Фильтр по дате (только если выбрана дата и мы в истории)
    if (alertFilter === 'history' && alertDate && a.created_at) {
      const alertDateStr = new Date(a.created_at).toISOString().split('T')[0];
      if (alertDateStr !== alertDate) return false;
    }

    return true;
  });
  const displayedAlerts = filteredAlerts.slice(0, visibleAlertsCount);

  return (
    <div className="animate-fade-in mx-auto max-w-7xl">
      {/* Хлебные крошки */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-zinc-500">
        <Link to="/" className="transition-colors hover:text-zinc-300">Главная</Link>
        <span className="text-zinc-700">/</span>
        <span className="hover:text-zinc-300">{well.cdng}</span>
        <span className="text-zinc-700">/</span>
        <span className="font-medium text-zinc-300">Скважина {well.number}</span>
      </nav>

      {/* Шапка страницы */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-2xl border border-zinc-800/80 bg-[#121215] p-6 shadow-2xl ring-1 ring-white/5 backdrop-blur-md">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-zinc-50">
              Скважина №{well.number}
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              {well.cdng} · {well.pump_type_display || well.pump_type} · Введена {well.commission_date}
            </p>
            <span className={`mt-3 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
              well.status === 'online' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
              well.status === 'warning' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
              well.status === 'alarm' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse-alert' :
              well.status === 'maintenance' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20 animate-pulse-alert' :
              'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
            }`}>
              {badge.text}
            </span>
            {/* Кнопка ремонта: видна только если скважина в аварии или на ремонте */}
            {(well.status === 'alarm' || well.status === 'maintenance') && (
              <div>
                <button
                  onClick={() => setShowRepairConfirm(true)}
                  disabled={isRepairing}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-rose-900/30 transition-colors hover:bg-rose-500 active:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500/50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRepairing ? <Loader2 size={16} className="animate-spin" /> : <Wrench size={16} />}
                  {isRepairing ? 'Перезапуск скважины...' : 'Завершить ремонт и перезапустить скважину'}
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-6">
            {healthIndex !== null && <HealthGauge value={healthIndex} size={120} />}
            {/* Переключатель режима обучения */}
            <label className="flex cursor-pointer select-none items-center gap-3">
              <span className="text-sm text-zinc-400">Режим обучения</span>
              <button
                type="button"
                role="switch"
                aria-checked={trainingMode}
                onClick={() => setTrainingMode((v) => !v)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  trainingMode ? 'bg-blue-600' : 'bg-zinc-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    trainingMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>
          </div>
        </div>
      </div>

      {/* Переключатель периода */}
 <div className="mb-6">
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Предиктивные алерты */}
      {predictions.length > 0 && (
 <div className="mb-6">
 <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold tracking-tight text-zinc-50"><TrendingUp size={20} className="text-blue-400" /> Предиктивные алерты</h2>
          {predictions.map((pred, idx) => (
            <PredictiveAlert key={idx} prediction={pred} />
          ))}
        </div>
      )}

      {/* Сетка графиков */}
 <div className="mb-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {charts.map((c) => (
          <TelemetryChart
            key={c.key}
            title={c.title}
            unit={c.unit}
            color={c.color}
            icon={c.icon}
            data={chartData(c.key)}
            trainingMode={trainingMode}
            trainingTip={c.tip ? trainingTips[c.tip] : null}
            period={period}
          />
        ))}
      </div>

      {/* Алерты: активные / история + пагинация */}
 <section className="mb-8">
 <h2 className="mb-4 text-xl font-semibold tracking-tight text-zinc-50">Алерты</h2>
        {/* Табы: Активные / Вся история + календарь фильтрации истории */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setAlertFilter('active'); setAlertDate(''); setVisibleAlertsCount(5); }}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                alertFilter === 'active'
                  ? 'border-blue-500/30 bg-blue-500/20 text-blue-400'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              Активные ({alerts.filter((a) => a.is_active).length})
            </button>
            <button
              type="button"
              onClick={() => { setAlertFilter('history'); setVisibleAlertsCount(5); }}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                alertFilter === 'history'
                  ? 'border-blue-500/30 bg-blue-500/20 text-blue-400'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              Вся история ({alerts.length})
            </button>
          </div>

          {alertFilter === 'history' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={alertDate}
                onChange={(e) => { setAlertDate(e.target.value); setVisibleAlertsCount(5); }}
                className="rounded-lg border border-zinc-800 bg-[#09090b] px-3 py-1.5 text-sm text-zinc-300 focus:outline-none focus:border-zinc-600 [color-scheme:dark]"
              />
              {alertDate && (
                <button
                  type="button"
                  onClick={() => setAlertDate('')}
                  className="text-xs text-blue-400 transition hover:text-blue-300 hover:underline"
                >
                  Сбросить
                </button>
              )}
            </div>
          )}
        </div>
        {/* Клик по «Расследовать» в списке алертов открывает модалку с данными этого алерта */}
        <AlertList alerts={displayedAlerts} onInvestigate={(alert) => setSelectedAlert(alert)} />
        {filteredAlerts.length > visibleAlertsCount && (
          <button
            type="button"
            onClick={() => setVisibleAlertsCount((v) => v + 5)}
            className="mt-4 w-full rounded-lg border border-zinc-700/50 bg-zinc-800/50 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800"
          >
            Показать еще ({filteredAlerts.length - visibleAlertsCount} скрыто)
          </button>
        )}
      </section>

      {/* Действия */}
 <section className="mb-8">
 <h2 className="mb-4 text-xl font-semibold tracking-tight text-zinc-50">Действия</h2>
 <div className="flex flex-wrap gap-3">
          {exportActions.map(({ key, label, Icon, run }) => (
            <button
              key={key}
              type="button"
              onClick={run}
              disabled={!!isExporting[key]}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isExporting[key] ? <Loader2 size={16} className="animate-spin" /> : <Icon size={16} />}
              {isExporting[key] ? 'Формирование...' : label}
            </button>
          ))}
        </div>
      </section>

      <ConfirmModal
        isOpen={showRepairConfirm}
        onClose={() => setShowRepairConfirm(false)}
        onConfirm={handleRepair}
        title="Завершить ремонт"
        message={`Перезапустить скважину №${well.number}? Активные алерты будут закрыты, параметры сброшены к эталонным значениям.`}
        confirmLabel="Перезапустить"
        danger
      />

      {/* Модалка расследования — открывается кнопкой «Расследовать» в AlertList */}
      <InvestigationModal
        isOpen={!!selectedAlert}
        onClose={() => setSelectedAlert(null)}
        wellId={selectedAlert?.well?.id || selectedAlert?.well || well?.id}
        alertId={selectedAlert?.id}
      />
    </div>
  );
}
