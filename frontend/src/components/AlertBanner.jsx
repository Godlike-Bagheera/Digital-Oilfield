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
      className="cursor-pointer bg-red-600 text-white px-4 py-2 flex items-center justify-between shadow-md"
    >
      <div className="flex items-center gap-2 font-semibold">
        <span className="animate-pulse-slow">⚠️</span>
        <span>Активных алертов: {count}</span>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setVisible(false);
        }}
        className="text-white/80 hover:text-white text-xl leading-none px-2"
        title="Закрыть"
      >
        ✕
      </button>
    </div>
  );
}
