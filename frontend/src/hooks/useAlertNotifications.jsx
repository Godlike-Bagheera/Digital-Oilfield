import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

/**
 * Глобальные toast-уведомления о новых авариях.
 * Показывает тост ТОЛЬКО для новых (непоказанных ранее) алертов.
 * Файл имеет расширение .jsx, т.к. содержит JSX-разметку внутри тоста.
 */
export default function useAlertNotifications(interval = 10000) {
  const shownAlertsRef = useRef(new Set());

  useEffect(() => {
    const checkNewAlerts = async () => {
      try {
        const response = await fetch('/api/alerts/?is_active=true');
        if (!response.ok) return;

        const data = await response.json();
        const alerts = data.results || data;

        alerts.forEach(alert => {
          if (!shownAlertsRef.current.has(alert.id)) {
            shownAlertsRef.current.add(alert.id);

            const isCritical = alert.alert_type === 'critical';
            const wellNumber = alert.well?.number || alert.well;
            const timestamp = new Date(alert.created_at).toLocaleTimeString('ru-RU', {
              hour: '2-digit', minute: '2-digit', second: '2-digit',
            });

            const toastFn = isCritical ? toast.error : toast.success;

            toastFn(
              <div>
                <div className="font-bold mb-1">
                  {isCritical ? 'Критическая авария!' : 'Предупреждение'}
                </div>
                <div className="text-sm opacity-90">
                  Скважина N°{wellNumber}: {alert.message}
                </div>
                <div className="text-xs opacity-60 mt-1">
                  {alert.parameter}: {alert.value?.toFixed?.(2) || alert.value}
                </div>
                <div className="text-xs opacity-50 mt-1">{timestamp}</div>
              </div>,
              { duration: isCritical ? 8000 : 5000 }
            );
          }
        });
      } catch (err) {
        console.error('Error checking alerts:', err);
      }
    };

    checkNewAlerts();
    const timer = setInterval(checkNewAlerts, interval);
    return () => clearInterval(timer);
  }, [interval]);
}
