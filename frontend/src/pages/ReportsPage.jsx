import React from 'react';

// Страница отчётов — раздел в разработке
export default function ReportsPage() {
  return (
    <div className="p-8 animate-fade-in-up">
      <h1 className="text-3xl font-bold mb-6 text-zinc-50">Отчёты</h1>
      <div className="rounded-2xl border border-zinc-800/80 bg-[#121215] p-8 text-center shadow-lg">
        <div className="text-6xl mb-4">📊</div>
        <h2 className="text-xl font-semibold text-white mb-2">Раздел в разработке</h2>
        <p className="text-zinc-400">Здесь будут: сменные отчёты и аналитика по скважинам</p>
      </div>
    </div>
  );
}
