import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom'; // Ссылки на страницы скважин
import api from '../services/api';
import InvestigationModal from '../components/InvestigationModal';
import { Inbox, Search } from 'lucide-react';
import { getParameterLabel, formatParameterValue, humanizeMessage } from '../utils/parameters';

// Страница активных алертов — данные через axios (единый api-клиент проекта)
export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  // Выбранный алерт для модалки расследования
  const [selectedAlert, setSelectedAlert] = useState(null);

  // Подтягиваем id скважин (в сериализаторе алертов id может отсутствовать, только number)
  const fetchWellsMap = async () => {
    try {
      const data = await api.getWells();
      const results = data.results || data;
      const map = {};
      results.forEach((w) => { map[w.number] = w.id; });
      return map;
    } catch (err) {
      console.error('Error fetching wells map:', err);
      return {};
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [wellsMap, response] = await Promise.all([
          fetchWellsMap(),
          api.get('/alerts/?is_active=true&page_size=1000'),
        ]);
        const list = response.data.results || response.data;
        // Добавляем каждой записи wellId по номеру скважины
        setAlerts(list.map((a) => ({ ...a, wellId: wellsMap[a.well?.number] ?? a.well?.id })));
      } catch (err) {
        console.error('Error fetching alerts:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    // Тёмные скелетоны загрузки (без белых квадратов)
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 rounded-xl border border-zinc-800/80 bg-[#121215] w-1/3"></div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl border border-zinc-800/80 bg-[#121215]"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-50 tracking-tight">Активные алерты</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Незакрытые аварии и предупреждения по всем скважинам · {alerts.length} шт.
        </p>
      </div>
      <div className="space-y-3">
        {alerts.length === 0 && (
          <div className="text-center py-12 text-zinc-500 rounded-2xl border border-dashed border-zinc-800">
            <Inbox size={36} className="mx-auto mb-3 text-zinc-600" />
            <p className="text-sm text-zinc-300">Активных алертов нет</p>
            <p className="text-xs text-zinc-600 mt-1">Все скважины работают в штатном режиме</p>
          </div>
        )}
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`rounded-xl border border-zinc-800/80 border-l-4 bg-[#121215] p-4 shadow-lg ring-1 ring-white/5 transition-all duration-200 hover:border-zinc-700 hover:shadow-xl ${
              alert.alert_type === 'critical' ? 'border-l-status-alarm' : alert.alert_type === 'warning' ? 'border-l-status-warning' : 'border-l-blue-500'
            }`}
          >
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <h3 className="font-bold text-zinc-50 mb-1">{humanizeMessage(alert.message)}</h3>
                <p className="text-sm text-zinc-400">
                  {/* Кликабельный переход на страницу скважины */}
                  {alert.wellId ? (
                    <Link to={`/well/${alert.wellId}`} className="text-blue-400 hover:underline">
                      Скважина №{alert.well?.number || '?'}
                    </Link>
                  ) : (
                    <span>Скважина №{alert.well?.number || '?'}</span>
                  )}
                  {' • '}
                  {getParameterLabel(alert.parameter)}: {formatParameterValue(alert.parameter, alert.value)}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  {new Date(alert.created_at).toLocaleString('ru-RU')}
                </p>
              </div>
              <div className="flex flex-col items-end gap-3">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    alert.alert_type === 'critical'
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      : alert.alert_type === 'warning'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  }`}
                >
                  {alert.alert_type === 'critical' ? 'Критический' : alert.alert_type === 'warning' ? 'Предупреждение' : 'Предиктивный'}
                </span>
                {/* Кнопка открывает модалку расследования для конкретного алерта */}
                <button
                  onClick={() => setSelectedAlert(alert)}
                  disabled={!alert.wellId}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Search size={14} />
                  Расследовать
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Модалка расследования — переиспользуем существующий компонент */}
      <InvestigationModal
        isOpen={!!selectedAlert}
        onClose={() => setSelectedAlert(null)}
        wellId={selectedAlert?.wellId}
        alertId={selectedAlert?.id}
      />
    </div>
  );
}
