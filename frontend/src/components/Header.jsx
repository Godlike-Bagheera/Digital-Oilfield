import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function Header() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 glass z-50 border-b border-slate-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-cyan-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300">
              <span className="text-white font-bold text-lg">ЦМ</span>
            </div>
            <div>
              <h1 className="text-lg font-bold gradient-text">
                Цифровое месторождение
              </h1>
              <p className="text-xs text-slate-400">Мониторинг в реальном времени</p>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-4 py-2 glass rounded-lg">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
              <span className="text-sm text-slate-300">Система активна</span>
            </div>
            <div className="px-4 py-2 glass rounded-lg">
              <span className="text-sm font-mono text-cyan-400">
                {time.toLocaleTimeString('ru-RU')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
