import React from 'react';
import { useParams, Link } from 'react-router-dom';

export default function WellDetail() {
  const { id } = useParams();

  return (
    <section className="rounded-lg border border-gray-700 bg-gray-800 p-8">
      <h1 className="text-3xl font-semibold mb-4">Скважина №{id}</h1>
      <p className="text-gray-400 mb-6">Детальная страница в разработке</p>
      <Link to="/" className="text-blue-400 hover:text-blue-300 underline">
        ← Вернуться к списку скважин
      </Link>
    </section>
  );
}
