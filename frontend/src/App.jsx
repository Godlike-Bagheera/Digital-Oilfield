import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import WellDetail from './pages/WellDetail.jsx';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="border-b border-gray-700 bg-gray-800">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold tracking-tight">
            🛢️ Цифровое месторождение
          </Link>
          <nav className="space-x-4 text-gray-300">
            <Link to="/" className="hover:text-white transition-colors">
              Мониторинг
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/well/:id" element={<WellDetail />} />
        </Routes>
      </main>

      <footer className="mx-auto max-w-6xl px-4 py-6 text-center text-sm text-gray-500">
        Digital Oilfield — веб-дашборд мониторинга телеметрии скважин
      </footer>
    </div>
  );
}
