import React, { useEffect, useState, useContext } from 'react';
import { ThemeContext } from '../contexts/ThemeContext.jsx';

export default function Header() {
  const [now, setNow] = useState(new Date());
  const { theme, toggleTheme } = useContext(ThemeContext);
  const dark = theme === 'dark';

  // Обновление времени каждую секунду
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = now.toLocaleTimeString('ru-RU');

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200 bg-white shadow-lg backdrop-blur transition-colors duration-300 dark:border-gray-700 dark:bg-gray-800">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        {/* Логотип и название */}
        <a href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight md:text-2xl">
          <span className="text-2xl">🛢️</span>
          <span className="bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
            Цифровое месторождение
          </span>
        </a>

        {/* Время + переключатель темы */}
        <div className="flex items-center gap-4">
          <span className="hidden font-mono text-sm tabular-nums text-gray-600 dark:text-gray-300 sm:inline">
            🕒 {timeString}
          </span>
          <button
            onClick={toggleTheme}
            title={dark ? 'Включить светлую тему' : 'Включить тёмную тему'}
            aria-label="Переключить тему"
            className="rounded-full border border-gray-300 p-2 text-xl transition-transform hover:scale-110 dark:border-gray-600"
          >
            {dark ? '🌙' : '☀️'}
          </button>
        </div>
      </div>
    </header>
  );
}
