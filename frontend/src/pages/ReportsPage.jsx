import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, FileText, Info } from 'lucide-react';

// Страница отчётов: выбор скважины + периода и скачивание Excel/PDF
export default function ReportsPage() {
  const [wells, setWells] = useState([]);
  const [selectedWellId, setSelectedWellId] = useState('');
  const [period, setPeriod] = useState('24h');
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Загружаем список скважин при монтировании
  useEffect(() => {
    const fetchWells = async () => {
      try {
        const response = await fetch('/api/wells/');
        if (!response.ok) throw new Error('Не удалось загрузить скважины');
        const data = await response.json();
        const list = data.results || data;
        setWells(list);
        if (list.length > 0) setSelectedWellId(String(list[0].id));
      } catch (err) {
        console.error('Error fetching wells:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchWells();
  }, []);

  // Скачивание файла через POST на готовые эндпоинты экспорта
  const handleExport = async (type) => {
    if (!selectedWellId) return alert('Выберите скважину');
    const endpoint = type === 'excel'
      ? '/api/wells/export/telemetry/'
      : '/api/wells/export/telemetry-pdf/';
    try {
      setIsExporting(true);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ well_id: selectedWellId, period }),
      });
      if (!response.ok) throw new Error('Ошибка экспорта');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${selectedWellId}_${period}.${type === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const selectCls =
    'w-full rounded-xl border border-zinc-800/80 bg-[#09090b] px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="animate-fade-in-up">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-50 tracking-tight">Отчёты</h1>
        <p className="text-sm text-zinc-400 mt-1">Выгрузка телеметрии скважин в Excel и PDF</p>
      </div>

      {/* Форма формирования отчёта */}
      <div className="rounded-2xl border border-zinc-800/80 bg-[#121215] p-6 shadow-lg ring-1 ring-white/5">
        <h2 className="mb-1 text-lg font-semibold text-zinc-50">Экспорт телеметрии</h2>
        <p className="mb-6 text-sm text-zinc-400">
          Выберите скважину и период, чтобы скачать отчёт в Excel или PDF
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-500">
              Скважина
            </label>
            {isLoading ? (
              <div className="h-10 animate-pulse rounded-xl border border-zinc-800/80 bg-[#121215]" />
            ) : (
              <select
                value={selectedWellId}
                onChange={(e) => setSelectedWellId(e.target.value)}
                className={selectCls}
              >
                {wells.map((well) => (
                  <option key={well.id} value={well.id}>
                    №{well.number} · {well.cdng} ({well.status})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-500">
              Период
            </label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className={selectCls}
            >
              <option value="1h">Последний час</option>
              <option value="6h">6 часов</option>
              <option value="24h">24 часа</option>
              <option value="7d">7 дней</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => handleExport('excel')}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet size={16} />
            Скачать Excel
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 hover:border-zinc-700 active:bg-zinc-900 text-zinc-200 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText size={16} />
            Скачать PDF
          </button>
        </div>
      </div>

      {/* Подсказка */}
      <div className="mt-6 flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-sm text-blue-300">
        <Info size={18} className="mt-0.5 shrink-0" />
        Отчёты формируются на сервере по реальным данным телеметрии за выбранный период.
      </div>
    </div>
  );
}
