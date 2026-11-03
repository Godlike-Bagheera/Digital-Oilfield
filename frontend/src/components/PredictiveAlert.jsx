import React from 'react';

const PredictiveAlert = ({ prediction }) => {
    const parameterNames = {
        current: 'Ток двигателя',
        casing_pressure: 'Давление затрубное',
        temperature: 'Температура',
        flow_rate_oil: 'Дебит нефти',
        water_cut: 'Обводнённость'
    };

    const confidenceColors = {
        high: 'bg-red-600',
        medium: 'bg-orange-600',
        low: 'bg-yellow-600'
    };

    const confidenceLabels = {
        high: 'Высокая',
        medium: 'Средняя',
        low: 'Низкая'
    };

    const trendIcons = {
        up: '📈',
        down: '📉',
        stable: '➡️'
    };

    const timeUntilCritical = prediction.estimated_time
        ? Math.round((prediction.estimated_time - new Date()) / (1000 * 60))
        : null;

    return (
        <div className="mb-4 rounded-lg border-2 border-blue-500 bg-blue-50 p-4 text-gray-900 transition-colors dark:bg-blue-900 dark:text-blue-100">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">🔮</span>
                    <h3 className="text-lg font-bold text-blue-200">Прогноз аварии</h3>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm ${confidenceColors[prediction.confidence]}`}>
                    Уверенность: {confidenceLabels[prediction.confidence]}
                </span>
            </div>

            <div className="text-blue-100 mb-2">
                <strong>{parameterNames[prediction.parameter]}</strong> {trendIcons[prediction.current_trend]}
            </div>

            <div className="text-sm text-blue-300 mb-3">
                Прогнозируемое значение: {prediction.predicted_value.toFixed(2)}
            </div>

            {timeUntilCritical && timeUntilCritical > 0 && (
                <div className="text-yellow-300 font-semibold mb-3">
                    ⏱️ Критическое значение через ~{timeUntilCritical} минут
                </div>
            )}

            <button
                onClick={() => console.log('Prevent action for', prediction.parameter)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition"
            >
                🛡️ Предотвратить
            </button>
        </div>
    );
};

export default PredictiveAlert;
