import React from 'react';

function getTimeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'только что';
  if (diff < 3600) return `${Math.floor(diff / 60)} минут назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} часов назад`;
  return new Date(iso).toLocaleDateString('ru-RU');
}

const TYPE_META = {
  critical: { bar: '#f43f5e', icon: '●', label: 'Критический' },
  warning: { bar: '#f59e0b', icon: '●', label: 'Предупреждение' },
  predictive: { bar: '#3b82f6', icon: '●', label: 'Предиктивный' },
};

export default function AlertList({ alerts }) {
  if (!alerts || alerts.length === 0) {
    return (
 <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
 <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-lg font-bold text-emerald-400 ring-1 ring-emerald-500/20">✓</span>
 <p className="text-sm text-emerald-400">Нет активных алертов</p>
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
 className="flex overflow-hidden rounded-xl border border-zinc-800/80 bg-[#121215] shadow-lg ring-1 ring-white/5 transition-colors hover:border-zinc-700"
          >
 <div className="w-1.5 shrink-0" style={{ backgroundColor: meta.bar }} />
 <div className="flex-1 p-4">
 <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-zinc-50">
                <span style={{ color: meta.bar }}>{meta.icon}</span> {alert.message}
              </p>
 <p className="mb-2 text-xs text-zinc-400">
 Параметр: <span className="font-medium text-zinc-300">{alert.parameter}</span> ·
 Значение: <span className="font-medium text-zinc-300">{alert.value}</span> (порог {alert.threshold}) ·
 Сработал: <span className="font-medium text-zinc-300">{getTimeAgo(alert.created_at)}</span>
              </p>
              <button
                type="button"
                onClick={() => console.log('Расследование алерта:', alert)}
 className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-sm font-medium text-blue-400 transition-colors hover:bg-blue-500/20"
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
