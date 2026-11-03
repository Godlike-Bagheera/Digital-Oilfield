import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import TelemetryChart from '../components/TelemetryChart';
import AlertList from '../components/AlertList';
import PeriodSelector from '../components/PeriodSelector';
import HealthGauge from '../components/HealthGauge';
import PredictiveAlert from '../components/PredictiveAlert';
import InvestigationModal from '../components/InvestigationModal';
import { checkAllPredictions } from '../utils/predictions';
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

  const fetchTelemetry = useCallback(async (wellId, prd) => {
    try {
      const data = await api.getTelemetry(wellId, { period: prd });
      const list = Array.isArray(data) ? data : data.results || [];
      setTelemetry(list);
      // Предиктивный анализ по полученной телеметрии
      const preds = checkAllPredictions(list);
      setPredictions(preds);
      // Лог для проверки в консоли браузера (F12)
      console.log('🔮 Предиктивные алерты:', preds);
    } catch (e) {
      console.error('Ошибка загрузки телеметрии:', e);
    }
  }, []);

  const fetchAlerts = useCallback(async (wellId) => {
    try {
      const data = await api.getAlerts({ well: wellId });
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

  // Автообновление данных каждые 3 секунды (зависит от id И period)
  useEffect(() => {
    if (!id) return;
    const interval = setInterval(() => {
      fetchTelemetry(id, period);
      fetchAlerts(id);
      console.log('🔄 Обновлено:', new Date().toLocaleTimeString());
    }, 3000);
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
          ← Назад к списку
        </button>
      </div>
    );
  }

  const badge = STATUS_BADGE[well.status] || STATUS_BADGE.offline;
  const latest = well.latest_telemetry;
  const healthIndex = latest ? latest.health_index : null;

  // Завершение ремонта: вызывает POST /api/wells/{id}/repair/ и обновляет
  // состояние БЕЗ перезагрузки страницы (window.location.reload не используем)
  const handleRepair = async () => {
    if (!window.confirm(`Завершить ремонт скважины №${well.number}?`)) return;
    try {
      const response = await fetch(`/api/wells/${well.id}/repair/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Repair failed');
      const data = await response.json();

      // Обновляем статус скважины локально — без перезагрузки страницы
      setWell({ ...well, status: 'online' });

      // Перезагружаем алерты, чтобы увидеть закрытые
      await fetchAlerts(well.id);

      alert(data.message || 'Скважина перезапущена');
    } catch (err) {
      alert('Ошибка: ' + err.message);
    }
  };

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
    { title: 'Дебит нефти', unit: 'т/сут', color: '#22c55e', icon: '●', key: 'flow_rate_oil', tip: 'flow_rate_oil' },
    { title: 'Обводнённость', unit: '%', color: '#06b6d4', icon: '💦', key: 'water_cut', tip: 'water_cut' },
    { title: 'Число качаний', unit: 'кач/мин', color: '#ec4899', icon: '⚙️', key: 'stroke_rate', tip: null },
  ];

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
                  onClick={handleRepair}
                  className="mt-4 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-rose-500/30 hover:shadow-rose-500/50 transition-all"
                >
                  🔧 Завершить ремонт и перезапустить скважину
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
 <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold tracking-tight text-zinc-50"><span className="text-blue-400">◆</span> Предиктивные алерты</h2>
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
 <h2 className="mb-4 text-xl font-semibold tracking-tight text-zinc-50">Активные алерты</h2>
        {/* Клик по «Расследовать» в списке алертов открывает модалку с данными этого алерта */}
        <AlertList alerts={alerts} onInvestigate={(alert) => setSelectedAlert(alert)} />
      </section>

      {/* Действия */}
 <section className="mb-8">
 <h2 className="mb-4 text-xl font-semibold tracking-tight text-zinc-50">Действия</h2>
 <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleExportTelemetry}
 className="rounded-lg border border-zinc-800 bg-[#09090b] px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-[#121215] hover:text-zinc-50"
          >
            Экспорт в Excel
          </button>
          <button
            type="button"
            onClick={handleExportTelemetryPdf}
 className="flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-400 transition-colors hover:bg-blue-500/20"
          >
            Телеметрия PDF
          </button>
          <button
            type="button"
            onClick={handleExportShiftReport}
 className="rounded-lg border border-zinc-800 bg-[#09090b] px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-[#121215] hover:text-zinc-50"
          >
            Сменный отчёт Excel
          </button>
          <button
            type="button"
            onClick={handleExportShiftReportPdf}
 className="flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-400 transition-colors hover:bg-blue-500/20"
          >
            Сменный отчёт PDF
          </button>
          
        </div>
      </section>

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
