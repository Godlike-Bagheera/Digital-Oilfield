import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import InvestigationModal from '../components/InvestigationModal';
import { Inbox, Search } from 'lucide-react';
import { getParameterLabel, formatParameterValue, humanizeMessage } from '../utils/parameters';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState(null);

  const fetchWellsMap = async () => {
    try {
      const data = await api.getWells();
      const results = data.results || data;
      const map = {};
      results.forEach((w) => { map[w.number] = w.id; });
      return map;
    } catch (err) { return {}; }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [wellsMap, response] = await Promise.all([
          fetchWellsMap(),
          api.get('/alerts/?is_active=true&page_size=1000'),
        ]);
        const list = response.data.results || response.data;
        setAlerts(list.map((a) => ({ ...a, wellId: wellsMap[a.well?.number] ?? a.well?.id })));
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="p-4 md:p-8 animate-pulse space-y-4">
        <div className="h-8 w-1/3 rounded-xl bg-[#121215]" />
        {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-[#121215]" />)}
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up mx-auto max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-50 tracking-tight">Активные алерты</h1>
        <p className="text-sm text-zinc-400 mt-1">Незакрытые аварии по всем скважинам · {alerts.length} шт.</p>
      </div>

      <div className="space-y-3">
        {alerts.length === 0 && (
          <div className="text-center py-12 rounded-2xl border border-dashed border-zinc-800">
            <Inbox size={36} className="mx-auto mb-3 text-zinc-600" />
            <p className="text-sm text-zinc-300">Активных алертов нет</p>
          </div>
        )}

        {alerts.map((alert) => (
          <div key={alert.id}
            className={`rounded-xl border-l-4 border-zinc-800/80 bg-[#121215] p-4 shadow-lg ${
              alert.alert_type === 'critical' ? 'border-l-rose-500' : alert.alert_type === 'warning' ? 'border-l-amber-500' : 'border-l-blue-500'
            }`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1">
                <h3 className="font-bold text-zinc-50 mb-1 text-sm sm:text-base">{humanizeMessage(alert.message)}</h3>
                <p className="text-xs text-zinc-400 sm:text-sm">
                  {alert.wellId ? (
                    <Link to={`/well/${alert.wellId}`} className="text-blue-400 hover:underline">Скважина №{alert.well?.number}</Link>
                  ) : (<span>Скважина №{alert.well?.number}</span>)}
                  {' • '}
                  {getParameterLabel(alert.parameter)}: {formatParameterValue(alert.parameter, alert.value)}
                </p>
                <p className="text-[10px] text-zinc-500 mt-1 sm:text-xs">{new Date(alert.created_at).toLocaleString('ru-RU')}</p>
              </div>
              
              <div className="flex items-center justify-between sm:flex-col sm:items-end sm:gap-3">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold sm:px-3 sm:py-1 sm:text-xs ${
                  alert.alert_type === 'critical' ? 'bg-rose-500/10 text-rose-400' : alert.alert_type === 'warning' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'
                }`}>
                  {alert.alert_type === 'critical' ? 'Критический' : alert.alert_type === 'warning' ? 'Внимание' : 'Предиктивный'}
                </span>
                <button onClick={() => setSelectedAlert(alert)} disabled={!alert.wellId}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors disabled:opacity-50">
                  <Search size={14} /> <span className="hidden sm:inline">Расследовать</span><span className="sm:hidden">Детали</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <InvestigationModal isOpen={!!selectedAlert} onClose={() => setSelectedAlert(null)} wellId={selectedAlert?.wellId} alertId={selectedAlert?.id} />
    </div>
  );
}
