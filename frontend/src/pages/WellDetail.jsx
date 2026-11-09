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
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [alertFilter, setAlertFilter] = useState('active');
  const [visibleAlertsCount, setVisibleAlertsCount] = useState(5);
  const [alertDate, setAlertDate] = useState('');
  const [showRepairConfirm, setShowRepairConfirm] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [isExporting, setIsExporting] = useState({});

  const fetchTelemetry = useCallback(async (wellId, prd) => {
    try {
      const data = await api.getTelemetry(wellId, { period: prd });
      const list = Array.isArray(data) ? data : data.results || [];
      setTelemetry(list);
      setPredictions(checkAllPredictions(list));
    } catch (e) { console.error(e); }
  }, []);

  const fetchAlerts = useCallback(async (wellId) => {
    try {
      const data = await api.getWellAlerts(wellId);
      setAlerts(Array.isArray(data) ? data : data.results || []);
    } catch (e) { console.error(e); }
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
  }, [fetchTelemetry, fetchAlerts]);

  const fetchTrainingTips = useCallback(async () => {
    try {
      const data = await api.getTrainingTips();
      const list = Array.isArray(data) ? data : data.results || [];
      const map = {};
      list.forEach((tip) => { map[tip.parameter] = tip; });
      setTrainingTips(map);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchWell(id);
    fetchTrainingTips();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const interval = setInterval(async () => {
      try {
        const data = await api.getWell(id);
        setWell(data);
      } catch (e) {}
      await fetchTelemetry(id, period);
      await fetchAlerts(id);
    }, 5000);
    return () => clearInterval(interval);
  }, [id, period]);

  useEffect(() => {
    if (well) fetchTelemetry(well.id, period);
  }, [period]);

  if (loading) return <div className="text-center mt-10 text-zinc-400 animate-pulse">Загрузка данных...</div>;
  if (error) return <div className="text-rose-400 text-center mt-10">{error}</div>;
  if (!well) return <div className="text-zinc-400 text-center mt-10">Скважина не найдена</div>;

  const badge = STATUS_BADGE[well.status] || STATUS_BADGE.offline;
  const latest = well.latest_telemetry;
  const healthIndex = latest ? latest.health_index : null;

  const handleRepair = async () => {
    if (isRepairing) return;
    setIsRepairing(true);
    try {
      const response = await fetch(`/api/wells/${well.id}/repair/`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      if (!response.ok) throw new Error('Ошибка ремонта');
      const data = await response.json();
      if (data.well) setWell(data.well);
      window.dispatchEvent(new CustomEvent('well-updated', { detail: { wellId: well.id } }));
      await fetchAlerts(well.id);
      await fetchTelemetry(well.id, period);
      setPredictions([]);
      toast.success(data.message || 'Скважина перезапущена');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsRepairing(false);
    }
  };

  const chartData = (key) => telemetry.map((t) => ({ timestamp: t.timestamp, value: t[key] }));

  const downloadReport = async (key, endpoint, body, filename) => {
    if (isExporting[key]) return;
    setIsExporting((prev) => ({ ...prev, [key]: true }));
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!response.ok) throw new Error('Ошибка');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click(); window.URL.revokeObjectURL(url);
      toast.success('Файл скачан');
    } catch (error) {
      toast.error('Ошибка экспорта');
    } finally {
      setIsExporting((prev) => ({ ...prev, [key]: false }));
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const exportActions = [
    { key: 'telemetryExcel', label: 'Excel', Icon: FileSpreadsheet, run: () => downloadReport('telemetryExcel', '/api/wells/export/telemetry/', { well_id: well.id, period }, `telemetry_${well.number}.xlsx`) },
    { key: 'telemetryPdf', label: 'PDF', Icon: FileText, run: () => downloadReport('telemetryPdf', '/api/wells/export/telemetry-pdf/', { well_id: well.id, period }, `telemetry_${well.number}.pdf`) },
    { key: 'shiftExcel', label: 'Смена Excel', Icon: FileSpreadsheet, run: () => downloadReport('shiftExcel', '/api/wells/export/shift-report/', { date: today }, `shift_${today}.xlsx`) },
    { key: 'shiftPdf', label: 'Смена PDF', Icon: FileText, run: () => downloadReport('shiftPdf', '/api/wells/export/shift-report-pdf/', { date: today }, `shift_${today}.pdf`) },
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

  const filteredAlerts = alerts.filter(a => {
    if (alertFilter === 'active' && !a.is_active) return false;
    if (alertFilter === 'history' && alertDate && a.created_at) {
      const alertDateStr = new Date(a.created_at).toISOString().split('T')[0];
      if (alertDateStr !== alertDate) return false;
    }
    return true;
  });
  const displayedAlerts = filteredAlerts.slice(0, visibleAlertsCount);

  return (
    <div className="animate-fade-in mx-auto max-w-7xl">
      <nav className="mb-4 flex items-center gap-2 text-sm text-zinc-500 md:mb-6">
        <Link to="/" className="hover:text-zinc-300">Главная</Link>
        <span className="text-zinc-700">/</span>
        <span className="hover:text-zinc-300">{well.cdng}</span>
        <span className="text-zinc-700">/</span>
        <span className="font-medium text-zinc-300">Скважина {well.number}</span>
      </nav>

      {/* Шапка скважины */}
      <div className="mb-6">
        <div className="flex flex-col gap-6 rounded-2xl border border-zinc-800/80 bg-[#121215] p-4 shadow-2xl ring-1 ring-white/5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-50 md:text-4xl">
              Скважина №{well.number}
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              {well.cdng} · {well.pump_type_display || well.pump_type}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.cls}`}>{badge.text}</span>
              {(well.status === 'alarm' || well.status === 'maintenance') && (
                <button
                  onClick={() => setShowRepairConfirm(true)}
                  disabled={isRepairing}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white shadow-lg transition-colors hover:bg-rose-500 disabled:opacity-50"
                >
                  {isRepairing ? <Loader2 size={14} className="animate-spin" /> : <Wrench size={14} />}
                  Ремонт
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            {healthIndex !== null && <HealthGauge value={healthIndex} size={100} />}
            <label className="flex cursor-pointer select-none items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2">
              <span className="text-xs text-zinc-400">Обучение</span>
              <button
                type="button"
                role="switch"
                onClick={() => setTrainingMode((v) => !v)}
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${trainingMode ? 'bg-blue-600' : 'bg-zinc-700'}`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${trainingMode ? 'translate-x-4.5' : 'translate-x-1'}`} />
              </button>
            </label>
          </div>
        </div>
      </div>

      <div className="mb-4 md:mb-6">
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {predictions.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-zinc-50 md:text-xl"><TrendingUp size={20} className="text-blue-400" /> Предиктивные алерты</h2>
          {predictions.map((pred, idx) => <PredictiveAlert key={idx} prediction={pred} />)}
        </div>
      )}

      {/* Графики */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-2">
        {charts.map((c) => (
          <TelemetryChart key={c.key} {...c} data={chartData(c.key)} trainingMode={trainingMode} trainingTip={c.tip ? trainingTips[c.tip] : null} period={period} />
        ))}
      </div>

      {/* Алерты */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-zinc-50 md:text-xl">Алерты</h2>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <button onClick={() => { setAlertFilter('active'); setAlertDate(''); setVisibleAlertsCount(5); }}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition sm:px-4 sm:py-2 sm:text-sm ${alertFilter === 'active' ? 'border-blue-500/30 bg-blue-500/20 text-blue-400' : 'border-zinc-800 bg-zinc-900 text-zinc-400'}`}>
              Активные ({alerts.filter((a) => a.is_active).length})
            </button>
            <button onClick={() => { setAlertFilter('history'); setVisibleAlertsCount(5); }}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition sm:px-4 sm:py-2 sm:text-sm ${alertFilter === 'history' ? 'border-blue-500/30 bg-blue-500/20 text-blue-400' : 'border-zinc-800 bg-zinc-900 text-zinc-400'}`}>
              История ({alerts.length})
            </button>
          </div>

          {alertFilter === 'history' && (
            <div className="flex items-center gap-2">
              <input type="date" value={alertDate} onChange={(e) => { setAlertDate(e.target.value); setVisibleAlertsCount(5); }}
                className="rounded-lg border border-zinc-800 bg-[#09090b] px-3 py-1.5 text-xs text-zinc-300 focus:outline-none [color-scheme:dark] sm:text-sm" />
              {alertDate && <button onClick={() => setAlertDate('')} className="text-xs text-blue-400 hover:underline">Сброс</button>}
            </div>
          )}
        </div>

        <AlertList alerts={displayedAlerts} onInvestigate={(alert) => setSelectedAlert(alert)} />
        {filteredAlerts.length > visibleAlertsCount && (
          <button onClick={() => setVisibleAlertsCount((v) => v + 5)}
            className="mt-4 w-full rounded-lg border border-zinc-700/50 bg-zinc-800/50 py-2.5 text-xs font-medium text-zinc-300 transition hover:bg-zinc-800 sm:text-sm">
            Показать еще ({filteredAlerts.length - visibleAlertsCount})
          </button>
        )}
      </section>

      {/* Экспорт - сетка 2х2 на телефоне */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-zinc-50 md:text-xl">Действия</h2>
        <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:gap-3">
          {exportActions.map(({ key, label, Icon, run }) => (
            <button key={key} onClick={run} disabled={!!isExporting[key]}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-800 disabled:opacity-50 md:px-4 md:text-sm">
              {isExporting[key] ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />}
              <span className="truncate">{isExporting[key] ? '...' : label}</span>
            </button>
          ))}
        </div>
      </section>

      <ConfirmModal isOpen={showRepairConfirm} onClose={() => setShowRepairConfirm(false)} onConfirm={handleRepair} title="Завершить ремонт" message={`Перезапустить скважину №${well.number}?`} confirmLabel="Перезапустить" danger />
      <InvestigationModal isOpen={!!selectedAlert} onClose={() => setSelectedAlert(null)} wellId={selectedAlert?.well?.id || selectedAlert?.well || well?.id} alertId={selectedAlert?.id} />
    </div>
  );
}
