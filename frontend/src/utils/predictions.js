// Предиктивная аналитика: линейная регрессия по последним точкам телеметрии
// с защитами от выбросов, нестабильных данных и физически невозможных прогнозов.

const MIN_POINTS = 10;
const WINDOW = 50;
const HORIZON_HOURS = 4;
const HOUR_MS = 60 * 60 * 1000;

// Физически возможные пределы параметров
export const PHYSICAL_LIMITS = {
  current: { min: 0, max: 200 },           // ток двигателя, А
  casing_pressure: { min: 0, max: 30 },    // затрубное давление, МПа
  discharge_pressure: { min: 0, max: 40 }, // давление на выкиде, МПа
  temperature: { min: -20, max: 150 },     // температура, °C
  flow_rate_oil: { min: 0, max: 500 },     // дебит нефти, т/сут
  flow_rate_liquid: { min: 0, max: 1000 }, // дебит жидкости, т/сут
  water_cut: { min: 0, max: 100 },         // обводнённость, %
  stroke_rate: { min: 0, max: 30 },        // число качаний
};

const THRESHOLDS = {
  current: { min: 20, max: 75, critical_min: 10, critical_max: 85 },
  casing_pressure: { min: 2, max: 12, critical_min: 0.5, critical_max: 16 },
  temperature: { min: 20, max: 80, critical_max: 95 },
  flow_rate_oil: { min: 10, critical_min: 5 },
  water_cut: { max: 80, critical_max: 97 },
};

const NO_PREDICTION = { has_prediction: false };

function median(sortedValues) {
  return sortedValues[Math.floor(sortedValues.length / 2)];
}

// Отбрасываем выбросы через MAD (median absolute deviation).
// Работает с точками { x, y }, чтобы сохранить привязку к времени.
export function removeOutliers(points) {
  if (points.length < 5) return points;
  const med = median(points.map(p => p.y).sort((a, b) => a - b));
  const mad = median(points.map(p => Math.abs(p.y - med)).sort((a, b) => a - b));
  if (mad === 0) return points;
  return points.filter(p => Math.abs(p.y - med) / mad < 3.5);
}

function linearRegression(points) {
  const n = points.length;
  const meanX = points.reduce((a, p) => a + p.x, 0) / n;
  const meanY = points.reduce((a, p) => a + p.y, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (const p of points) {
    sxy += (p.x - meanX) * (p.y - meanY);
    sxx += (p.x - meanX) ** 2;
    syy += (p.y - meanY) ** 2;
  }
  if (sxx === 0) return null;
  const slope = sxy / sxx;
  const intercept = meanY - slope * meanX;
  const rSquared = syy > 0 ? (sxy * sxy) / (sxx * syy) : 0;
  return { slope, intercept, rSquared };
}

export function analyzeTrend(telemetryData, parameter) {
  const threshold = THRESHOLDS[parameter];
  if (!threshold || !telemetryData) return NO_PREDICTION;

  const dataPoints = telemetryData
    .slice(-WINDOW)
    .map(d => ({ t: new Date(d.timestamp).getTime(), y: Number(d[parameter]) }))
    .filter(p => Number.isFinite(p.t) && Number.isFinite(p.y));

  // Защита 4: минимальное количество данных
  if (dataPoints.length < MIN_POINTS) return NO_PREDICTION;

  // x — время в часах от первой точки, поэтому slope измеряется в единицах параметра за час
  const t0 = dataPoints[0].t;
  const points = dataPoints.map(p => ({ x: (p.t - t0) / HOUR_MS, y: p.y }));

  // Защита 1: отбрасывание выбросов перед регрессией
  const cleaned = removeOutliers(points);
  if (cleaned.length < MIN_POINTS) return NO_PREDICTION;

  const regression = linearRegression(cleaned);
  if (!regression) return NO_PREDICTION;
  const { slope, rSquared } = regression;

  // Тренд должен быть статистически значимым, а не шумом
  if (rSquared < 0.5) return NO_PREDICTION;

  // Защита 2: ограничение наклона — не более 10% от базового значения за час
  const baseValue = median(cleaned.map(p => p.y).sort((a, b) => a - b));
  const maxSlopePerHour = Math.abs(baseValue) * 0.10;
  if (Math.abs(slope) > maxSlopePerHour) {
    return NO_PREDICTION; // данные нестабильны, прогноз не показываем
  }

  const currentValue = cleaned[cleaned.length - 1].y;
  const lastTime = dataPoints[dataPoints.length - 1].t;
  let predictedValue = currentValue + slope * HORIZON_HOURS;

  // Защита 3: ограничение прогноза физическими пределами
  const limit = PHYSICAL_LIMITS[parameter];
  if (limit) {
    predictedValue = Math.min(Math.max(predictedValue, limit.min), limit.max);
  }

  // Защита 5: прогноз не должен отличаться от текущего значения более чем в 3 раза
  if (Math.abs(predictedValue) > Math.abs(currentValue) * 3 + 50) {
    return NO_PREDICTION;
  }

  let criticalValue = null;
  if (threshold.critical_min !== undefined && slope < 0 && predictedValue < threshold.critical_min) {
    criticalValue = threshold.critical_min;
  } else if (threshold.critical_max !== undefined && slope > 0 && predictedValue > threshold.critical_max) {
    criticalValue = threshold.critical_max;
  }
  if (criticalValue === null) return NO_PREDICTION;

  const hoursToCritical = Math.max(0, (criticalValue - currentValue) / slope);

  return {
    has_prediction: true,
    estimated_time: new Date(lastTime + hoursToCritical * HOUR_MS),
    confidence: rSquared > 0.9 ? 'high' : 'medium',
    current_trend: slope > 0 ? 'up' : 'down',
    current_value: currentValue,
    predicted_value: predictedValue,
    critical_value: criticalValue,
    horizon_hours: HORIZON_HOURS,
    slope,
  };
}

export function checkAllPredictions(telemetryData) {
  const parameters = Object.keys(THRESHOLDS);
  const predictions = [];
  for (const param of parameters) {
    const prediction = analyzeTrend(telemetryData, param);
    if (prediction.has_prediction) {
      predictions.push({ parameter: param, ...prediction });
    }
  }
  return predictions;
}
