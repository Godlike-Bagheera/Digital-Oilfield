import React, { useEffect, useState } from 'react';
import api from '../services/api';

// Страница активных алертов — данные через axios (единый api-клиент проекта)
export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await api.get('/alerts/?is_active=true');
        setAlerts(response.data.results || response.data);
      } catch (err) {
        console.error('Error fetching alerts:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAlerts();
  }, []);

  if (loading) {
    // Скелетон загрузки
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-zinc-800 rounded w-1/3"></div>
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-zinc-800 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <h1 className="text-3xl font-bold mb-6 text-zinc-50">Активные алерты</h1>
      <div className="space-y-3">
        {alerts.length === 0 && (
          <div className="text-center py-12 rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
            <div className="text-5xl mb-3">✅</div>
            <p className="text-emerald-400 text-lg">Нет активных алертов</p>
            <p className="text-zinc-500 text-sm mt-2">Все системы работают нормально</p>
          </div>
        )}
        {alerts.map(alert => (
          <div key={alert.id} className="rounded-xl border border-zinc-800/80 bg-[#121215] p-4 shadow-lg ring-1 ring-white/5 hover:border-zinc-700 transition-colors">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-bold text-zinc-50 mb-1">{alert.message}</h3>
                <p className="text-sm text-zinc-400">
                  Скважина №{alert.well?.number || '?'} • {alert.parameter}: {alert.value?.toFixed(2)}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  {new Date(alert.created_at).toLocaleString('ru-RU')}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                alert.alert_type === 'critical' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                alert.alert_type === 'warning' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                'bg-blue-500/10 text-blue-400 border border-blue-500/20'
              }`}>
                {alert.alert_type}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
