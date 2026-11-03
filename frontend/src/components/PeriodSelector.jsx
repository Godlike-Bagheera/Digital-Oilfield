import React from 'react';

const PERIODS = [
  { value: '1h', label: '1 час' },
  { value: '6h', label: '6 часов' },
  { value: '24h', label: '24 часа' },
  { value: '7d', label: '7 дней' },
];

export default function PeriodSelector({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PERIODS.map((p) => (
        <button
          key={p.value}
          type="button"
          onClick={() => onChange(p.value)}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            value === p.value
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
