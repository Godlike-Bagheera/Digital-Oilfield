import React, { useState, useEffect, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ThemeContext } from '../contexts/ThemeContext';

// Пункт «Скважины» убран — дублировал Дашборд (список скважин виден на главной)
const NAV_ITEMS = [
  { to: '/', label: 'Дашборд', icon: '▦' },
  { to: '/alerts', label: 'Алерты', icon: '▲' },
  { to: '/reports', label: 'Отчеты', icon: '▤' },
];

export default function Layout({ children }) {
  const location = useLocation();
  const [time, setTime] = useState(new Date());
  // Кастомизация интерфейса: тема и шрифт из глобального контекста
  const { theme, setTheme, font, setFont } = useContext(ThemeContext);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isActive = (to) => {
    if (to === '/') return location.pathname === '/';
    return location.pathname.startsWith(to);
  };

  return (
    <div className="bg-base flex min-h-screen text-mainx">
      {/* Левая панель (Sidebar) */}
      <aside className="bg-base fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-zinc-800">
        {/* Логотип — ЕДИНСТВЕННОЕ место названия продукта */}
        <div className="flex items-center gap-3 px-6 py-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/60 shadow-lg ring-1 ring-white/5">
            <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-xl font-bold text-transparent">
              Ц
            </span>
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-zinc-50">
              Цифровое месторождение
            </h1>
            <p className="text-xs text-zinc-500">Мониторинг телеметрии</p>
          </div>
        </div>

        {/* Навигация */}
        <nav className="mt-2 flex-1 space-y-1 px-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive(item.to)
                  ? 'bg-zinc-800/50 text-white'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
              }`}
            >
              <span className="text-base leading-none text-zinc-500">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Ссылка на Django-админку — над блоком статуса системы */}
        <div className="px-4 pb-2">
          <a
            href="http://localhost:8000/admin/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-200"
          >
            <span className="text-base leading-none text-zinc-500">⚙</span>
            Админ-панель
          </a>
        </div>

        {/* Панель настроек UI: 3 тёмные темы + 3 шрифта, сохраняются в localStorage */}
      <div className="px-4 pb-2">
        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-200"
        >
          <span className="text-base">🎨</span>
          Настройки UI
        </button>

        {settingsOpen && (
          <div className="mt-2 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
            <p className="mb-2 text-xs text-zinc-500">Цветовая тема</p>
            <div className="mb-3 flex gap-2">
              {[
                { id: 'zinc', color: 'bg-zinc-800', name: 'Цинк' },
                { id: 'slate', color: 'bg-slate-700', name: 'Синяя' },
                { id: 'emerald', color: 'bg-emerald-800', name: 'Зелёная' }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`h-8 w-8 rounded-full border-2 transition-all ${t.color} ${
                    theme === t.id ? 'border-blue-400' : 'border-zinc-700'
                  }`}
                  title={t.name}
                />
              ))}
            </div>

            <p className="mb-2 text-xs text-zinc-500">Шрифт</p>
            <div className="flex gap-1">
              {[
                { id: 'inter', label: 'Inter' },
                { id: 'manrope', label: 'Manrope' },
                { id: 'mono', label: 'Mono' }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFont(f.id)}
                  className={`flex-1 rounded border px-2 py-1.5 text-xs transition-colors ${
                    font === f.id
                      ? 'border-blue-500/30 bg-blue-500/20 text-blue-400'
                      : 'border-zinc-700 bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Нижний блок статуса */}
        <div className="border-t border-zinc-800 px-6 py-5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            <span className="text-xs font-medium text-zinc-400">Система активна</span>
          </div>
          <p className="mt-2 font-mono text-xs text-zinc-500">
            {time.toLocaleTimeString('ru-RU')}
          </p>
        </div>
      </aside>

      {/* Правая часть — скроллируемая */}
      <div className="ml-64 flex min-h-screen flex-1 flex-col">
        <main className="flex-1 overflow-x-hidden p-8">{children}</main>
        <footer className="border-t border-zinc-800/80 px-8 py-5 text-center text-xs text-zinc-600">
          Digital Oilfield — веб-дашборд мониторинга телеметрии скважин
        </footer>
      </div>
    </div>
  );
}
