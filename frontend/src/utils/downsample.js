/**
 * Прореживание временного ряда до maxPoints точек с сохранением пиков.
 * Алгоритм оконный: ряд делится на окна, из каждого окна берутся точки
 * с минимальным и максимальным значением, поэтому провалы аварий
 * (ток = 0) НЕ исчезают с графика, в отличие от простого "каждая N-я".
 *
 * @param {Array<Object>} data - точки, отсортированные по времени
 * @param {number} maxPoints - целевое число точек (по умолчанию 240)
 * @param {string} valueKey - поле значения для поиска min/max
 * @returns {Array<Object>} прореженный массив в хронологическом порядке
 */
export function downsample(data, maxPoints = 240, valueKey = 'value') {
  if (!Array.isArray(data) || data.length <= maxPoints) return data || [];

  const windowSize = Math.max(1, Math.floor(data.length / maxPoints));
  const result = [];

  for (let i = 0; i < data.length; i += windowSize) {
    const win = data.slice(i, i + windowSize);
    if (win.length === 0) continue;
    if (win.length === 1) {
      result.push(win[0]);
      continue;
    }

    let minIdx = 0;
    let maxIdx = 0;
    for (let j = 1; j < win.length; j++) {
      if (win[j][valueKey] < win[minIdx][valueKey]) minIdx = j;
      if (win[j][valueKey] > win[maxIdx][valueKey]) maxIdx = j;
    }

    // Добавляем в хронологическом порядке внутри окна
    if (minIdx <= maxIdx) {
      result.push(win[minIdx]);
      if (maxIdx !== minIdx) result.push(win[maxIdx]);
    } else {
      result.push(win[maxIdx]);
      if (minIdx !== maxIdx) result.push(win[minIdx]);
    }
  }

  return result;
}

export default downsample;
