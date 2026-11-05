import React, { useEffect } from 'react';

/**
 * Модалка подтверждения действия в стиле интерфейса (вместо window.confirm).
 * Закрывается по Esc, клику по фону и кнопке «Отмена».
 */
export default function ConfirmModal({
  isOpen, onClose, onConfirm, title, message, confirmLabel = 'Подтвердить', danger = false,
}) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div className="mx-4 w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
        <h3 className="mb-2 text-lg font-bold text-zinc-50">{title}</h3>
        <p className="mb-6 text-sm text-zinc-400">{message}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
          >
            Отмена
          </button>
          <button
            type="button"
            autoFocus
            onClick={() => { onConfirm(); onClose(); }}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors focus:outline-none focus:ring-2 ${
              danger ? 'bg-rose-600 hover:bg-rose-500 focus:ring-rose-500/50' : 'bg-blue-600 hover:bg-blue-500 focus:ring-blue-500/50'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
