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
              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
              : 'border border-zinc-800/80 bg-[#09090b]/50 text-zinc-400 hover:bg-[#121215]/60 hover:text-zinc-200'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
