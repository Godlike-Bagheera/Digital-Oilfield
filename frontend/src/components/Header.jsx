import React, { useEffect, useState } from 'react';

export default function Header() {
  const [now, setNow] = useState(new Date());
  const [dark, setDark] = useState(true);

  // Обновление времени каждую секунду
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Переключатель темы
  useEffect(() => {
    document.documentElement.classList.toggle('light', !dark);
    document.body.style.backgroundColor = dark ? '#111827' : '#f3f4f6';
    document.body.style.color = dark ? '#ffffff' : '#111827';
  }, [dark]);

  const timeString = now.toLocaleTimeString('ru-RU');

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-gray-800 border-b border-gray-700 shadow-lg">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
        {/* Логотип и название */}
        <a href="/" className="flex items-center gap-2 text-xl md:text-2xl font-bold tracking-tight">
          <span className="text-2xl">🛢️</span>
          <span>Цифровое месторождение</span>
        </a>

        {/* Время + переключатель темы */}
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline text-sm text-gray-300 font-mono tabular-nums">
            🕒 {timeString}
          </span>
          <button
            onClick={() => setDark((d) => !d)}
            title={dark ? 'Включить светлую тему' : 'Включить тёмную тему'}
            className="text-xl hover:scale-110 transition-transform p-1"
          >
            {dark ? '🌙' : '☀️'}
          </button>
        </div>
      </div>
    </header>
  );
}
