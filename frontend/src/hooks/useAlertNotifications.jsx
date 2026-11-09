import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';
import { humanizeMessage } from '../utils/parameters';

/**
 * Глобальные toast-уведомления о новых алертах (подключены в App — работают на всех страницах).
 * Правила:
 *  1. Не более MAX_VISIBLE_TOASTS тостов за цикл — иначе один сводный тост.
 *  2. Несколько алертов по одной скважине за цикл — один тост со списком.
 *  3. Алерты, созданные до открытия страницы, не показываются.
 *  4. Пока вкладка неактивна, проверки не выполняются.
 */
const MAX_VISIBLE_TOASTS = 3;
const SUMMARY_TOAST_ID = 'alerts-summary';

const wellNumberOf = (alert) => alert.well?.number || alert.well;

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/**
 * Универсальная обертка для контента тоста с кнопкой закрытия.
 */
function ToastContent({ title, message, time, toastId, isList = false, items = [] }) {
  return (
    <div className="flex w-full items-start justify-between gap-3">
      <div className="flex-1">
        <div className="mb-1 font-semibold text-sm">{title}</div>
        {isList ? (
          <ul className="list-disc space-y-0.5 pl-4 text-sm opacity-90">
            {items.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        ) : (
          <div className="text-sm opacity-90">{message}</div>
        )}
        {time && <div className="mt-1 text-xs opacity-60">{time}</div>}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          toast.dismiss(toastId);
        }}
        className="shrink-0 rounded-md p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
        title="Закрыть"
      >
        <X size={16} />
      </button>
    </div>
  );
}

function showSingleToast(alert) {
  const isCritical = alert.alert_type === 'critical';
  const toastFn = isCritical ? toast.error : toast;
  const toastId = `alert-${alert.id}`;

  toastFn(
    <ToastContent
      title={`${isCritical ? 'Критическая авария' : 'Предупреждение'} · Скважина №${wellNumberOf(alert)}`}
      message={humanizeMessage(alert.message)}
      time={formatTime(alert.created_at)}
      toastId={toastId}
    />,
    { id: toastId, duration: isCritical ? 8000 : 5000 }
  );
}

function showWellGroupToast(wellNum, alerts) {
  const hasCritical = alerts.some((a) => a.alert_type === 'critical');
  const toastFn = hasCritical ? toast.error : toast;
  const toastId = `well-${wellNum}`;

  toastFn(
    <ToastContent
      title={`Скважина №${wellNum}: ${alerts.length} проблемы`}
      isList={true}
      items={alerts.map(a => humanizeMessage(a.message))}
      toastId={toastId}
    />,
    { id: toastId, duration: 8000 }
  );
}

function showSummaryToast(count) {
  const toastId = SUMMARY_TOAST_ID;
  toast.error(
    <ToastContent
      title="Массовая авария"
      message={`Зафиксировано ${count} новых алертов. Подробности на странице «Алерты».`}
      toastId={toastId}
    />,
    { id: toastId, duration: 8000 }
  );
}

export default function useAlertNotifications(interval = 10000) {
  const shownAlertsRef = useRef(new Set());
  // Запоминаем время открытия страницы
  const pageLoadTimeRef = useRef(new Date());

  useEffect(() => {
    let cancelled = false;

    const checkNewAlerts = async () => {
      // Пропускаем проверку, если вкладка не активна
      if (document.hidden) return;
      try {
        const response = await fetch('/api/alerts/?is_active=true&page_size=1000');
        if (!response.ok || cancelled) return;
        const data = await response.json();
        const alerts = data.results || data;

        const newAlerts = [];
        alerts.forEach((alert) => {
          if (shownAlertsRef.current.has(alert.id)) return;
          shownAlertsRef.current.add(alert.id);
          // Показываем тост только если алерт создан ПОСЛЕ открытия страницы
          if (new Date(alert.created_at) < pageLoadTimeRef.current) return;
          newAlerts.push(alert);
        });
        if (newAlerts.length === 0) return;

        // Группируем алерты по скважине
        const byWell = {};
        newAlerts.forEach((a) => {
          const wellNum = wellNumberOf(a);
          if (!byWell[wellNum]) byWell[wellNum] = [];
          byWell[wellNum].push(a);
        });
        const groups = Object.entries(byWell);

        if (groups.length > MAX_VISIBLE_TOASTS) {
          // Один сводный тост вместо спама
          showSummaryToast(newAlerts.length);
          return;
        }
        groups.forEach(([wellNum, wellAlerts]) => {
          if (wellAlerts.length === 1) showSingleToast(wellAlerts[0]);
          else showWellGroupToast(wellNum, wellAlerts);
        });
      } catch (err) {
        console.error('Error checking alerts:', err);
      }
    };

    checkNewAlerts();
    const timer = setInterval(checkNewAlerts, interval);
    // При возврате на вкладку проверяем сразу, не дожидаясь следующего тика
    const onVisibility = () => { if (!document.hidden) checkNewAlerts(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [interval]);
}
