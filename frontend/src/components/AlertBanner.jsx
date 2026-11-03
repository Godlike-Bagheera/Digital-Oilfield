import React from 'react';

export default function AlertBanner({ alerts }) {
  const [visible, setVisible] = React.useState(true);

  if (!alerts || alerts.length === 0 || !visible) return null;

  const count = alerts.length;

  const handleClick = () => {
    // Пока просто пишем в консоль (позже — скролл к списку алертов или модалка)
    console.log('Активные алерты:', alerts);
  };

  return (
    <div
      onClick={handleClick}
 className="mb-6 flex cursor-pointer items-center justify-between rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 shadow-lg text-rose-400"
    >
 <div className="flex items-center gap-2 text-sm font-semibold">
 <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500"></span>
        <span>Активных алертов: {count}</span>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setVisible(false);
        }}
 className="px-2 text-lg leading-none text-rose-400/70 transition-colors hover:text-rose-300"
        title="Закрыть"
      >
        ✕
      </button>
    </div>
  );
}
