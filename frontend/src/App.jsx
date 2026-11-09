import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout.jsx';

// Code splitting: каждая страница — отдельный чанк, загружается при первом переходе
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const WellDetail = lazy(() => import('./pages/WellDetail.jsx'));
const WellsPage = lazy(() => import('./pages/WellsPage.jsx'));
const AlertsPage = lazy(() => import('./pages/AlertsPage.jsx'));
const ReportsPage = lazy(() => import('./pages/ReportsPage.jsx'));
const MapPage = lazy(() => import('./pages/MapPage.jsx'));

function LoadingFallback() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-b-blue-500" />
    </div>
  );
}
import useAlertNotifications from './hooks/useAlertNotifications';

// Внутренний компонент: здесь доступны хуки роутера и глобальные уведомления.
// Хук подключён именно в App (а не в Dashboard) — тосты работают на ВСЕХ страницах.
export default function App() {
  // Активируем глобальные уведомления (работают на ВСЕХ страницах)
  useAlertNotifications(10000);

  return (
    <>
      <Layout>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/wells" element={<WellsPage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/well/:id" element={<WellDetail />} />
          </Routes>
        </Suspense>
      </Layout>
      <Toaster
        position="top-right"
        containerStyle={{ zIndex: 9999 }}
        toastOptions={{
          duration: 5000,
          // ВКЛЮЧАЕМ ВСТРОЕННЫЙ КРЕСТИК
          closeButton: true,
          style: {
            background: '#18181b',
            color: '#f4f4f5',
            border: '1px solid #27272a',
            borderRadius: '12px',
            // Отступ справа, чтобы текст не залезал под крестик
            padding: '14px 36px 14px 18px',
            fontSize: '14px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            maxWidth: '400px',
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#f4f4f5' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#f4f4f5' },
            style: {
              background: '#7f1d1d',
              border: '1px solid #dc2626',
              padding: '14px 36px 14px 18px',
            },
            duration: 8000,
          },
        }}
      />
    </>
  );
}
