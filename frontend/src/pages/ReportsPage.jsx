import React, { useState, useEffect } from 'react';

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
    'w-full rounded-xl border border-border/80 bg-base px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="animate-fade-in-up">
      <h1 className="text-3xl font-bold mb-6 text-primary">Отчёты</h1>

      {/* Форма формирования отчёта */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-lg ring-1 ring-white/5">
        <h2 className="mb-1 text-lg font-semibold text-primary">Экспорт телеметрии</h2>
        <p className="mb-6 text-sm text-secondary">
          Выберите скважину и период, чтобы скачать отчёт в Excel или PDF
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-500">
              Скважина
            </label>
            {isLoading ? (
              <div className="h-10 animate-pulse rounded-xl border border-border/80 bg-card" />
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
            className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all hover:from-emerald-500 hover:to-teal-500 hover:shadow-emerald-500/50 disabled:opacity-50"
          >
            📥 Скачать Excel
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={isExporting}
            className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all hover:from-emerald-500 hover:to-teal-500 hover:shadow-emerald-500/50 disabled:opacity-50"
          >
            📄 Скачать PDF
          </button>
        </div>
      </div>

      {/* Подсказка */}
      <div className="mt-6 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-5 text-sm text-blue-300">
        ℹ️ Отчёты формируются на сервере по реальным данным телеметрии за выбранный период.
      </div>
    </div>
  );
}
