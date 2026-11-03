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
    <div className="bg-base flex min-h-screen text-primary">
      {/* Левая панель (Sidebar) */}
      <aside className="bg-base fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border">
        {/* Логотип — ЕДИНСТВЕННОЕ место названия продукта */}
        <div className="flex items-center gap-3 px-6 py-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-base/60 shadow-lg ring-1 ring-white/5">
            <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-xl font-bold text-transparent">
              Ц
            </span>
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-primary">
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
                  ? 'bg-card/50 text-white'
                  : 'text-secondary hover:bg-base hover:text-zinc-200'
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
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-secondary transition-colors hover:bg-base hover:text-zinc-200"
          >
            <span className="text-base leading-none text-zinc-500">⚙</span>
            Админ-панель
          </a>
        </div>

        {/* Панель настроек UI: 3 тёмные темы + 3 шрифта, сохраняются в localStorage */}
      <div className="px-4 pb-2">
        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-secondary transition-colors hover:bg-base hover:text-zinc-200"
        >
          <span className="text-base">🎨</span>
          Настройки UI
        </button>

        {settingsOpen && (
          <div className="mt-2 rounded-lg border border-border bg-base p-3">
            <p className="mb-2 text-xs text-zinc-500">Цветовая тема</p>
            <div className="mb-3 flex gap-2">
              {[
                { id: 'zinc', bg: 'bg-zinc-900', name: 'Цинк' },
                { id: 'navy', bg: 'bg-slate-800', name: 'Морской' },
                { id: 'forest', bg: 'bg-emerald-900', name: 'Лес' }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`h-8 w-8 rounded-full border-2 transition-all ${t.bg} ${
                    theme === t.id ? 'border-accent ring-2 ring-accent/30' : 'border-border'
                  }`}
                  title={t.name}
                />
              ))}
            </div>

            <p className="mb-2 text-xs text-zinc-500">Шрифт</p>
            <div className="flex gap-1">
              {[
                { id: 'sans', label: 'Без засечек', sample: 'Aa' },
                { id: 'serif', label: 'С засечками', sample: 'Aa', fontFamily: 'Lora' },
                { id: 'mono', label: 'Моно', sample: 'Aa', fontFamily: 'JetBrains Mono' }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFont(f.id)}
                  style={f.fontFamily ? { fontFamily: f.fontFamily } : {}}
                  className={`flex-1 rounded border px-2 py-1.5 text-xs transition-colors ${
                    font === f.id
                      ? 'border-accent/30 bg-accent/20 text-accent'
                      : 'border-zinc-700 bg-card text-secondary'
                  }`}
                >
                  <span style={f.fontFamily ? { fontFamily: f.fontFamily } : {}}>{f.sample}</span>
                  <div className="mt-0.5 text-[10px]">{f.label}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Нижний блок статуса */}
        <div className="border-t border-border px-6 py-5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            <span className="text-xs font-medium text-secondary">Система активна</span>
          </div>
          <p className="mt-2 font-mono text-xs text-zinc-500">
            {time.toLocaleTimeString('ru-RU')}
          </p>
        </div>
      </aside>

      {/* Правая часть — скроллируемая */}
      <div className="ml-64 flex min-h-screen flex-1 flex-col">
        <main className="flex-1 overflow-x-hidden p-8">{children}</main>
        <footer className="border-t border-border/80 px-8 py-5 text-center text-xs text-zinc-600">
          Digital Oilfield — веб-дашборд мониторинга телеметрии скважин
        </footer>
      </div>
    </div>
  );
}
