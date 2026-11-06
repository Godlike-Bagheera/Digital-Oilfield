// Человекочитаемые названия и единицы измерения параметров телеметрии
export const PARAMETER_LABELS = {
  current: { label: 'Ток двигателя', unit: 'А' },
  casing_pressure: { label: 'Затрубное давление', unit: 'МПа' },
  discharge_pressure: { label: 'Давление на выкиде', unit: 'МПа' },
  temperature: { label: 'Температура устья', unit: '°C' },
  flow_rate_oil: { label: 'Дебит нефти', unit: 'т/сут' },
  flow_rate_liquid: { label: 'Дебит жидкости', unit: 'т/сут' },
  water_cut: { label: 'Обводнённость', unit: '%' },
  stroke_rate: { label: 'Число качаний', unit: 'кач/мин' },
  health_index: { label: 'Индекс здоровья', unit: '%' },
};

/** Название параметра: 'water_cut' → 'Обводнённость' */
export function getParameterLabel(key) {
  return PARAMETER_LABELS[key]?.label || key;
}

/** Значение с единицей: ('water_cut', 98) → '98.00 %' */
export function formatParameterValue(key, value, digits = 2) {
  if (value === null || value === undefined) return '—';
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (Number.isNaN(num)) return '—';
  const unit = PARAMETER_LABELS[key]?.unit || '';
  return unit ? `${num.toFixed(digits)} ${unit}` : num.toFixed(digits);
}

/**
 * Подменяет сырые ключи в готовых текстах сообщений.
 * Работает даже для СТАРЫХ алертов в БД.
 * 'water_cut = 98.0 (порог 97)' → 'Обводнённость = 98.0 (порог 97)'
 */
export function humanizeMessage(message) {
  if (typeof message !== 'string') return message;
  let result = message;
  // Сортируем по длине убывания, чтобы flow_rate_oil не матчился как rate_oil
  const keys = Object.keys(PARAMETER_LABELS).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    result = result.split(key).join(PARAMETER_LABELS[key].label);
  }
  return result;
}
