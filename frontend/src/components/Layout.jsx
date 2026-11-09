import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', label: 'Дашборд' },
  { to: '/map', label: 'Карта' },
  { to: '/alerts', label: 'Алерты' },
  { to: '/reports', label: 'Отчёты' },
];

export default function Layout({ children }) {
  const [time, setTime] = useState(new Date());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Закрываем меню при переходе на другую страницу
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="bg-[#09090b] flex min-h-screen text-zinc-50">
      
      {/* Мобильная шапка (видна только на телефонах, скрыта на ПК) */}
      <header className="fixed top-0 z-50 flex h-16 w-full items-center justify-between border-b border-zinc-800 bg-[#09090b] px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-[#121215]">
            <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-lg font-bold text-transparent">Ц</span>
          </div>
          <span className="text-sm font-semibold tracking-tight text-zinc-50">Цифровое месторождение</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Затемнение фона при открытом меню на телефоне */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Левая панель (Sidebar) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-zinc-800 bg-[#09090b] transition-transform duration-300 ease-in-out lg:z-40 lg:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Логотип (на телефоне скрыт, так как есть в шапке) */}
        <div className="hidden items-center gap-3 px-6 py-6 lg:flex">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-[#09090b]/60 shadow-lg ring-1 ring-white/5">
            <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-xl font-bold text-transparent">Ц</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-zinc-50">Цифровое месторождение</h1>
            <p className="text-xs text-zinc-500">Мониторинг телеметрии</p>
          </div>
        </div>

        {/* Отступ на телефоне под шапку */}
        <div className="h-16 lg:hidden" />

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

        {/* Ссылка на админку */}
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

        {/* Статус системы */}
        <div className="border-t border-zinc-800 px-6 py-5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            <span className="text-xs font-medium text-zinc-400">Система активна</span>
          </div>
          <p className="mt-2 font-mono text-xs text-zinc-500">{time.toLocaleTimeString('ru-RU')}</p>
        </div>
      </aside>

      {/* Правая часть с контентом */}
      <div className="flex min-h-screen flex-1 flex-col lg:ml-64">
        <main className="flex-1 overflow-x-hidden p-4 pt-20 md:p-8 lg:pt-8">
          {children}
        </main>
        <footer className="border-t border-zinc-800/80 px-4 py-5 text-center text-xs text-zinc-600 md:px-8">
          Digital Oilfield — веб-дашборд мониторинга телеметрии скважин
        </footer>
      </div>
    </div>
  );
}
