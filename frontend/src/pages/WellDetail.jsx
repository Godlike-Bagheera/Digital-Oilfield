import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TelemetryChart from '../components/TelemetryChart';
import AlertList from '../components/AlertList';
import PeriodSelector from '../components/PeriodSelector';
import HealthGauge from '../components/HealthGauge';
import PredictiveAlert from '../components/PredictiveAlert';
import InvestigationModal from '../components/InvestigationModal';
import { checkAllPredictions } from '../utils/predictions';
import * as api from '../services/api';

const STATUS_BADGE = {
  online: { text: 'Онлайн', cls: 'bg-green-500/20 text-green-400 border-green-500' },
  warning: { text: 'Внимание', cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500' },
  alarm: { text: 'Авария', cls: 'bg-red-500/20 text-red-400 border-red-500 animate-pulse-slow' },
  offline: { text: 'Офлайн', cls: 'bg-gray-500/20 text-gray-400 border-gray-500' },
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
  const [investigationOpen, setInvestigationOpen] = useState(false);
  const [selectedAlertId, setSelectedAlertId] = useState(null);

  const fetchTelemetry = useCallback(async (wellId, prd) => {
    try {
      const data = await api.getTelemetry(wellId, { period: prd });
      const list = Array.isArray(data) ? data : data.results || [];
      setTelemetry(list);
      // Предиктивный анализ по полученной телеметрии
      setPredictions(checkAllPredictions(list));
    } catch (e) {
      console.error('Ошибка загрузки телеметрии:', e);
    }
  }, []);

  const fetchAlerts = useCallback(async (wellId) => {
    try {
      const data = await api.getAlerts({ well: wellId, is_active: 'true' });
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

  // Монтирование / смена id скважины + автообновление каждые 5 секунд
  useEffect(() => {
    setLoading(true);
    fetchWell(id);
    fetchTrainingTips();
    const interval = setInterval(() => {
      console.log('Обновление телеметрии', new Date().toISOString());
      fetchTelemetry(id, period);
      fetchAlerts(id);
    }, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Смена периода
  useEffect(() => {
    if (well) fetchTelemetry(well.id, period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto mt-10 max-w-lg rounded-xl border border-red-600 bg-red-900/30 p-6 text-center">
        <p className="mb-4 text-red-300">{error}</p>
        <button
          type="button"
          onClick={() => { setLoading(true); fetchWell(id); }}
          className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
        >
          Повторить
        </button>
      </div>
    );
  }

  if (!well) {
    return (
      <div className="mt-10 text-center text-gray-400">
        <p className="mb-4 text-xl">Скважина не найдена</p>
        <button type="button" onClick={() => navigate('/')} className="text-blue-400 hover:underline">
          ← Назад к списку
        </button>
      </div>
    );
  }

  const badge = STATUS_BADGE[well.status] || STATUS_BADGE.offline;
  const latest = well.latest_telemetry;
  const healthIndex = latest ? latest.health_index : null;

  const chartData = (key) => telemetry.map((t) => ({ timestamp: t.timestamp, value: t[key] }));

  // Экспорт телеметрии скважины в Excel
  const handleExportTelemetry = async () => {
    try {
      const response = await fetch('/api/wells/export/telemetry/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ well_id: well.id, period }),
      });
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `telemetry_well_${well.number}_${period}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert('Ошибка экспорта: ' + error.message);
    }
  };

  // Экспорт телеметрии скважины в PDF
  const handleExportTelemetryPdf = async () => {
    try {
      const response = await fetch('/api/wells/export/telemetry-pdf/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ well_id: well.id, period: period }),
      });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `telemetry_well_${well.number}_${period}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert('Ошибка экспорта PDF: ' + error.message);
    }
  };

  // Экспорт сменного отчёта в Excel
  const handleExportShiftReport = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch('/api/wells/export/shift-report/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today }),
      });
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shift_report_${today}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert('Ошибка экспорта: ' + error.message);
    }
  };

  // Экспорт сменного отчёта в PDF
  const handleExportShiftReportPdf = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch('/api/wells/export/shift-report-pdf/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today }),
      });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shift_report_${today}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert('Ошибка экспорта PDF: ' + error.message);
    }
  };

  const charts = [
    { title: 'Ток двигателя', unit: 'А', color: '#3b82f6', icon: '⚡', key: 'current', tip: 'current' },
    { title: 'Давление затрубное', unit: 'МПа', color: '#ef4444', icon: '📊', key: 'casing_pressure', tip: 'casing_pressure' },
    { title: 'Давление нагнетательное', unit: 'МПа', color: '#f97316', icon: '📈', key: 'discharge_pressure', tip: null },
    { title: 'Температура', unit: '°C', color: '#eab308', icon: '🌡️', key: 'temperature', tip: 'temperature' },
    { title: 'Дебит жидкости', unit: 'м³/сут', color: '#8b5cf6', icon: '💧', key: 'flow_rate_liquid', tip: null },
    { title: 'Дебит нефти', unit: 'т/сут', color: '#22c55e', icon: '🛢️', key: 'flow_rate_oil', tip: 'flow_rate_oil' },
    { title: 'Обводнённость', unit: '%', color: '#06b6d4', icon: '💦', key: 'water_cut', tip: 'water_cut' },
    { title: 'Число качаний', unit: 'кач/мин', color: '#ec4899', icon: '⚙️', key: 'stroke_rate', tip: null },
  ];

  return (
    <div>
      {/* Шапка страницы */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mb-4 flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-blue-600 dark:text-gray-400 dark:hover:text-white"
        >
          ← Назад к списку
        </button>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-lg transition-colors dark:border-gray-700 dark:bg-gray-800">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Скважина №{well.number}</h1>
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              {well.cdng} | {well.pump_type_display || well.pump_type} | Введена {well.commission_date}
            </p>
            <span className={`mt-3 inline-block rounded-full border px-3 py-1 text-xs font-semibold ${badge.cls}`}>
              {badge.text}
            </span>
          </div>

          <div className="flex items-center gap-6">
            {healthIndex !== null && <HealthGauge value={healthIndex} size={120} />}
            {/* Переключатель режима обучения */}
            <label className="flex cursor-pointer select-none items-center gap-3">
              <span className="text-sm text-gray-700 dark:text-gray-300">🎓 Режим обучения</span>
              <button
                type="button"
                role="switch"
                aria-checked={trainingMode}
                onClick={() => setTrainingMode((v) => !v)}
                className={`relative h-7 w-12 rounded-full transition-colors ${trainingMode ? 'bg-blue-600' : 'bg-gray-600'}`}
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${trainingMode ? 'translate-x-6' : 'translate-x-1'}`}
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
          <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">🔮 Предиктивные алерты</h2>
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

      {/* Активные алерты */}
      <section className="mb-8">
        <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">Активные алерты</h2>
        <AlertList alerts={alerts} />
      </section>

      {/* Действия */}
      <section className="mb-8">
        <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">Действия</h2>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleExportTelemetry}
            className="rounded-lg bg-gray-200 px-4 py-2.5 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
          >
            📊 Экспорт в Excel
          </button>
          <button
            type="button"
            onClick={handleExportTelemetryPdf}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition flex items-center gap-2"
          >
            📄 Телеметрия PDF
          </button>
          <button
            type="button"
            onClick={handleExportShiftReport}
            className="rounded-lg bg-gray-200 px-4 py-2.5 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
          >
            📄 Сменный отчёт Excel
          </button>
          <button
            type="button"
            onClick={handleExportShiftReportPdf}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition flex items-center gap-2"
          >
            📄 Сменный отчёт PDF
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedAlertId(alerts.length > 0 ? alerts[0].id : null);
              setInvestigationOpen(true);
            }}
            className="rounded-lg bg-gray-200 px-4 py-2.5 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
          >
            🔍 Расследовать инцидент
          </button>
        </div>
      </section>

      <InvestigationModal
        isOpen={investigationOpen}
        onClose={() => setInvestigationOpen(false)}
        wellId={well?.id}
        alertId={selectedAlertId}
      />
    </div>
  );
}
