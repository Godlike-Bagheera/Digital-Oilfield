import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import WellDetail from './pages/WellDetail.jsx';
import WellsPage from './pages/WellsPage.jsx';
import AlertsPage from './pages/AlertsPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import MapPage from './pages/MapPage.jsx';
import useAlertNotifications from './hooks/useAlertNotifications';

// Внутренний компонент: здесь доступны хуки роутера и глобальные уведомления.
// Хук подключён именно в App (а не в Dashboard) — тосты работают на ВСЕХ страницах.
export default function App() {
  // Активируем глобальные уведомления (работают на ВСЕХ страницах)
  useAlertNotifications(10000);

  return (
    <>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/wells" element={<WellsPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/well/:id" element={<WellDetail />} />
        </Routes>
      </Layout>
      <Toaster
        position="top-right"
        containerStyle={{ zIndex: 9999 }}  /* ВАЖНО: тосты поверх всего */
        toastOptions={{
          duration: 5000,
          style: {
            background: '#18181b',
            color: '#f4f4f5',
            border: '1px solid #27272a',
            borderRadius: '12px',
            padding: '14px 18px',
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
            },
            duration: 8000,
          },
        }}
      />
    </>
  );
}
