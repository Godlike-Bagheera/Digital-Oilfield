import React from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import WellDetail from './pages/WellDetail.jsx';

export default function App() {
  return (
    <ThemeProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/well/:id" element={<WellDetail />} />
        </Routes>
      </Layout>
    </ThemeProvider>
  );
}
