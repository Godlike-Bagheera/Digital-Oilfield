import React, { useEffect, useState } from 'react';

function getColor(value) {
  if (value >= 90) return '#22c55e';   // зелёный
  if (value >= 60) return '#eab308';   // жёлтый
  if (value >= 30) return '#f97316';   // оранжевый
  return '#ef4444';                    // красный
}

export default function HealthGauge({ value = 0, size = 100 }) {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    // Анимация заполнения при монтировании
    const target = Math.max(0, Math.min(100, value));
    const duration = 800;
    const start = performance.now();
    let raf;
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      setAnimatedValue(Math.round(target * progress));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - animatedValue / 100);
  const color = getColor(value);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Внешний круг (фон) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#d1d5db"
          strokeWidth={stroke}
          className="dark:opacity-0"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#374151"
          strokeWidth={stroke}
          className="hidden dark:block"
        />
        {/* Дуга прогресса */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span
        className="absolute font-bold text-xl"
        style={{ color }}
      >
        {Math.round(value)}%
      </span>
    </div>
  );
}
