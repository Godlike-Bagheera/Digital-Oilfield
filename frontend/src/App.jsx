import React from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header.jsx';
import Dashboard from './pages/Dashboard.jsx';
import WellDetail from './pages/WellDetail.jsx';

export default function App() {
  return (
    <ThemeProvider>
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900 text-gray-100">
      {/* Фиксированная шапка на всех страницах */}
      <Header />

      {/* Отступ сверху под фиксированную шапку + min-height против layout shift */}
      <main className="pt-16 min-h-[calc(100vh-4rem)]">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/well/:id" element={<WellDetail />} />
          </Routes>
        </div>
      </main>

      <footer className="mx-auto max-w-6xl px-4 py-6 text-center text-sm text-slate-500">
        Digital Oilfield — веб-дашборд мониторинга телеметрии скважин
      </footer>
    </div>
    </ThemeProvider>
  );
}
