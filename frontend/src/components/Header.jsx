import React, { useEffect, useState, useContext } from 'react';
import { Link } from 'react-router-dom';
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
    <header className="glass fixed top-0 left-0 right-0 z-50 border-b border-gray-200 shadow-lg transition-colors duration-300 dark:border-gray-700/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Логотип и название */}
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/25">
            <span className="text-lg font-bold text-white">Ц</span>
          </div>
          <h1 className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 bg-clip-text text-lg font-bold tracking-tight text-transparent md:text-xl">
            Цифровое месторождение
          </h1>
        </Link>

        {/* Время + переключатель темы */}
        <div className="flex items-center gap-4">
          <span className="hidden items-center gap-1.5 font-mono text-sm tabular-nums text-gray-600 dark:text-gray-300 sm:flex">
            <span className="opacity-60">🕐</span>
            {timeString}
          </span>
          <button
            onClick={toggleTheme}
            title={dark ? 'Включить светлую тему' : 'Включить тёмную тему'}
            aria-label="Переключить тему"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-gray-700 transition-all hover:scale-110 hover:border-blue-500 hover:text-blue-500 dark:border-gray-600 dark:text-gray-200 dark:hover:border-blue-400 dark:hover:text-blue-400"
          >
            {dark ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
    </header>
  );
}
