import React from 'react';

function getTimeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'только что';
  if (diff < 3600) return `${Math.floor(diff / 60)} минут назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} часов назад`;
  return new Date(iso).toLocaleDateString('ru-RU');
}

const TYPE_META = {
  critical: { bar: '#ef4444', icon: '🔴', label: 'Критический' },
  warning: { bar: '#eab308', icon: '🟡', label: 'Предупреждение' },
  predictive: { bar: '#3b82f6', icon: '🔵', label: 'Предиктивный' },
};

export default function AlertList({ alerts }) {
  if (!alerts || alerts.length === 0) {
    return (
 <div className="flex items-center gap-3 rounded-xl border border-green-700/50 bg-green-900/20 p-4">
 <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-lg font-bold text-white">✓</span>
 <p className="text-green-300">Нет активных алертов</p>
      </div>
    );
  }

  return (
 <div className="space-y-3">
      {alerts.map((alert) => {
        const meta = TYPE_META[alert.alert_type] || TYPE_META.warning;
        return (
          <div
            key={alert.id}
 className="flex overflow-hidden rounded-xl border shadow-md transition-colors border-gray-700 bg-gray-800"
          >
 <div className="w-1.5 shrink-0" style={{ backgroundColor: meta.bar }} />
 <div className="flex-1 p-4">
 <p className="mb-1 flex items-center gap-2 font-semibold text-white">
                <span>{meta.icon}</span> {alert.message}
              </p>
 <p className="mb-2 text-sm text-gray-500 text-gray-400">
 Параметр: <span className="font-medium text-gray-200">{alert.parameter}</span> ·
 Значение: <span className="font-medium text-gray-200">{alert.value}</span> (порог {alert.threshold}) ·
 Сработал: <span className="font-medium text-gray-200">{getTimeAgo(alert.created_at)}</span>
              </p>
              <button
                type="button"
                onClick={() => console.log('Расследование алерта:', alert)}
 className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-blue-700"
              >
                Расследовать
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
