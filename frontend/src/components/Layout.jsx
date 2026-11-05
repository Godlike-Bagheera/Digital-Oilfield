import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';

// Пункт «Скважины» убран — дублировал Дашборд (список скважин виден на главной)
const NAV_ITEMS = [
  { to: '/', label: 'Дашборд' },
  { to: '/map', label: 'Карта' },
  { to: '/alerts', label: 'Алерты' },
  { to: '/reports', label: 'Отчёты' },
];

export default function Layout({ children }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-[#09090b] flex min-h-screen text-zinc-50">
      {/* Левая панель (Sidebar) */}
      <aside className="bg-[#09090b] fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-zinc-800">
        {/* Логотип — ЕДИНСТВЕННОЕ место названия продукта */}
        <div className="flex items-center gap-3 px-6 py-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-[#09090b]/60 shadow-lg ring-1 ring-white/5">
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
          <p className="px-4 pb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">Навигация</p>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-500/15 text-blue-400 border-l-2 border-blue-500'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Ссылка на Django-админку — над блоком статуса системы */}
        <div className="px-4 pb-2">
          <a
            href="/admin/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-lg px-4 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800/50 hover:text-zinc-100"
          >
            Админ-панель
            <span className="text-xs text-zinc-600">Django</span>
          </a>
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
