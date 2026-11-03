export function analyzeTrend(telemetryData, parameter) {
    if (!telemetryData || telemetryData.length < 10) {
        return { has_prediction: false };
    }

    const recentData = telemetryData.slice(-50);
    const values = recentData.map(d => d[parameter]);
    const times = recentData.map(d => new Date(d.timestamp).getTime());

    const n = values.length;
    const sumX = times.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = times.reduce((acc, x, i) => acc + x * values[i], 0);
    const sumXX = times.reduce((acc, x) => acc + x * x, 0);

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

    const futureTime = lastTime + (4 * 60 * 60 * 1000);
    const predictedValue = slope * futureTime + intercept;

    let has_prediction = false;
    let estimated_time = null;
    let confidence = 'low';

    if (threshold.critical_min !== undefined && predictedValue < threshold.critical_min) {
        has_prediction = true;
        estimated_time = (threshold.critical_min - intercept) / slope;
        confidence = Math.abs(slope) > 0.01 ? 'high' : 'medium';
    } else if (threshold.critical_max !== undefined && predictedValue > threshold.critical_max) {
        has_prediction = true;
        estimated_time = (threshold.critical_max - intercept) / slope;
        confidence = Math.abs(slope) > 0.01 ? 'high' : 'medium';
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
