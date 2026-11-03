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
        high: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
        medium: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
        low: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
    };

    const confidenceLabels = {
        high: 'Высокая',
        medium: 'Средняя',
        low: 'Низкая'
    };

    const trendIcons = {
        up: '↗',
        down: '↘',
        stable: '→'
    };

    const timeUntilCritical = prediction.estimated_time
        ? Math.round((prediction.estimated_time - new Date()) / (1000 * 60))
        : null;

    return (
 <div className="mb-4 rounded-xl border border-blue-500/20 bg-blue-500/10 p-5 text-blue-300 shadow-lg ring-1 ring-white/5 backdrop-blur-md transition-colors">
 <div className="flex items-center justify-between mb-2">
 <div className="flex items-center gap-2">
 <span className="text-lg text-blue-400">◆</span>
 <h3 className="text-base font-semibold tracking-tight text-primary">Прогноз аварии</h3>
                </div>
 <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${confidenceColors[prediction.confidence]}`}>
                    Уверенность: {confidenceLabels[prediction.confidence]}
                </span>
            </div>

 <div className="mb-2 text-sm font-medium text-zinc-200">
                <strong>{parameterNames[prediction.parameter]}</strong> {trendIcons[prediction.current_trend]}
            </div>

 <div className="mb-3 text-sm text-blue-400">
                Прогнозируемое значение: {prediction.predicted_value.toFixed(2)}
            </div>

            {timeUntilCritical && timeUntilCritical > 0 && (
 <div className="mb-3 text-sm font-semibold text-amber-400">
                    Критическое значение через ~{timeUntilCritical} минут
                </div>
            )}

            <button
                onClick={() => console.log('Prevent action for', prediction.parameter)}
 className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-400 transition-colors hover:bg-blue-500/20"
            >
                Предотвратить
            </button>
        </div>
    );
};

export default PredictiveAlert;
