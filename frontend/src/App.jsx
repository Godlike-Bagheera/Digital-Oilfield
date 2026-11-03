import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header.jsx';
import Dashboard from './pages/Dashboard.jsx';
import WellDetail from './pages/WellDetail.jsx';
import { ThemeProvider } from './contexts/ThemeContext.jsx';

export default function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gray-100 text-gray-900 transition-colors duration-300 dark:bg-gray-900 dark:text-white">
        {/* Фиксированная шапка на всех страницах */}
        <Header />

        {/* Отступ сверху под фиксированную шапку */}
        <main className="mx-auto max-w-7xl px-4 pt-24 pb-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/well/:id" element={<WellDetail />} />
          </Routes>
        </main>

        <footer className="mx-auto max-w-6xl px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Digital Oilfield — веб-дашборд мониторинга телеметрии скважин
        </footer>
      </div>
    </ThemeProvider>
  );
}
