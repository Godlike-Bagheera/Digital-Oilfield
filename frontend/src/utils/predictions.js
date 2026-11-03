export function analyzeTrend(telemetryData, parameter) {
    if (!telemetryData || telemetryData.length < 10) {
        return { has_prediction: false };
    }

    const recentData = telemetryData.slice(-50);
    const values = recentData.map(d => d[parameter]);
    const times = recentData.map(d => new Date(d.timestamp).getTime());

    const n = values.length;
    // Регрессия по индексу точки (0..n-1): slope = изменение параметра за один шаг телеметрии.
    // Устойчиво к шуму и не даёт взрывного экстраполирования при малом интервале между точками.
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((acc, y, i) => acc + i * y, 0);
    const sumXX = ((n - 1) * n * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const thresholds = {
        current: { min: 20, max: 75, critical_min: 10, critical_max: 85 },
        casing_pressure: { min: 2, max: 12, critical_min: 0.5, critical_max: 16 },
        temperature: { min: 20, max: 80, critical_max: 95 },
        flow_rate_oil: { min: 10, critical_min: 5 },
        water_cut: { max: 80, critical_max: 97 }
    };

    const threshold = thresholds[parameter];
    if (!threshold) {
        return { has_prediction: false };
    }

    const lastValue = values[values.length - 1];
    const lastTime = times[times.length - 1];

    // Горизонт прогноза: 4 часа, выраженные в шагах телеметрии.
    // slope/intercept считаются по индексу точки (значение за шаг), поэтому прогноз
    // и время согласованны и не взрываются при малом интервале между точками.
    const medianStepMs = n > 1 ? (times[n - 1] - times[0]) / (n - 1) : 5000;
    const horizonSteps = (4 * 60 * 60 * 1000) / medianStepMs;

    // Защита от ложных срабатываний на шуму: тренд должен быть статистически значимым —
    // линейная составляющая должна превышать остаточный разброс данных (критерий R²).
    const fitted = values.map((_, i) => slope * i + intercept);
    const residuals = values.map((y, i) => y - fitted[i]);
    const stdResid = Math.sqrt(residuals.reduce((a, r) => a + r * r, 0) / n);
    const meanY = sumY / n;
    const varY = values.reduce((a, y) => a + (y - meanY) * (y - meanY), 0) / n;
    const rSquared = varY > 0 ? 1 - (stdResid * stdResid) / varY : 0;
    if (rSquared < 0.5) {
        return { has_prediction: false };
    }

    let has_prediction = false;
    let estimated_time = null;
    let confidence = 'low';
    // Прогноз значения на горизонте 4 часа (в шагах телеметрии от конца окна)
    const predictedValue = slope * (n - 1 + horizonSteps) + intercept;

    if (threshold.critical_min !== undefined && slope < 0 && predictedValue < threshold.critical_min) {
        has_prediction = true;
        const minutesToCritical = (threshold.critical_min - lastValue) / slope * medianStepMs;
        estimated_time = lastTime + minutesToCritical;
        confidence = rSquared > 0.9 ? 'high' : 'medium';
    } else if (threshold.critical_max !== undefined && slope > 0 && predictedValue > threshold.critical_max) {
        has_prediction = true;
        const minutesToCritical = (threshold.critical_max - lastValue) / slope * medianStepMs;
        estimated_time = lastTime + minutesToCritical;
        confidence = rSquared > 0.9 ? 'high' : 'medium';
    }

    return {
        has_prediction,
        estimated_time: estimated_time ? new Date(estimated_time) : null,
        confidence,
        current_trend: slope > 0.001 ? 'up' : slope < -0.001 ? 'down' : 'stable',
        predicted_value: predictedValue,
        slope
    };
}

export function checkAllPredictions(telemetryData) {
    const parameters = ['current', 'casing_pressure', 'temperature', 'flow_rate_oil', 'water_cut'];
    const predictions = [];

    for (const param of parameters) {
        const prediction = analyzeTrend(telemetryData, param);
        if (prediction.has_prediction) {
            predictions.push({
                parameter: param,
                ...prediction
            });
        }
    }

    return predictions;
}
