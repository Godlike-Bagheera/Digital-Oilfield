"""
Сервис расчёта индекса здоровья скважины (Health Index).

Каждый телеметрический параметр имеет вес, идеальный диапазон,
нормальный диапазон и критическое значение. Итоговый индекс —
взвешенная сумма вкладов параметров (0-100).
"""

# Конфигурация параметров: (вес, идеально min, идеально max, норма min, норма max, крит min, крит max)
PARAMETER_CONFIG = {
    'current':          {'weight': 0.25, 'ideal': (40, 50),   'normal': (30, 60),    'critical': (10, 80)},
    'casing_pressure':  {'weight': 0.20, 'ideal': (5, 8),     'normal': (2, 10),     'critical': (0.5, 16)},
    'temperature':      {'weight': 0.10, 'ideal': (40, 60),   'normal': (20, 80),    'critical': (10, 95)},
    'flow_rate_oil':    {'weight': 0.20, 'ideal': (20, None), 'normal': (10, None),  'critical': (1, None)},
    'water_cut':        {'weight': 0.15, 'ideal': (None, 50), 'normal': (None, 80),  'critical': (None, 97)},
    'stroke_rate':      {'weight': 0.10, 'ideal': (6, 8),     'normal': (4, 10),     'critical': (2, 12)},
}


def _score_parameter(name, value):
    """
    Рассчитывает вклад одного параметра (0-100).

    - Значение в идеальном диапазоне -> 100
    - Значение в критической зоне -> 0
    - Между нормой и идеалом / между нормой и критикой -> линейная интерполяция
    """
    cfg = PARAMETER_CONFIG[name]
    ideal_min, ideal_max = cfg['ideal']
    norm_min, norm_max = cfg['normal']
    crit_min, crit_max = cfg['critical']

    if value is None:
        return 100.0

    # --- Верхняя граница (значения выше идеала) ---
    if ideal_max is not None and value >= ideal_max:
        upper_limit = norm_max if norm_max is not None else float('inf')
        crit_upper = crit_max if crit_max is not None else float('inf')

        if value <= upper_limit:
            # Между "идеально" и "норма": 100 -> 80
            if upper_limit == ideal_max:
                return 80.0
            ratio = (value - ideal_max) / (upper_limit - ideal_max)
            return 100.0 - ratio * 20.0

        if value >= crit_upper:
            return 0.0

        # Между "норма" и "критично": 80 -> 0
        ratio = (value - upper_limit) / (crit_upper - upper_limit)
        return 80.0 - ratio * 80.0

    # --- Нижняя граница (значения ниже идеала) ---
    if ideal_min is not None and value <= ideal_min:
        lower_limit = norm_min if norm_min is not None else float('-inf')
        crit_lower = crit_min if crit_min is not None else float('-inf')

        if value >= lower_limit:
            # Между "норма" и "идеально": 80 -> 100
            if lower_limit == ideal_min:
                return 80.0
            ratio = (ideal_min - value) / (ideal_min - lower_limit)
            return 100.0 - ratio * 20.0

        if value <= crit_lower:
            return 0.0

        # Между "критично" и "норма": 0 -> 80
        ratio = (value - crit_lower) / (lower_limit - crit_lower)
        return ratio * 80.0

    # Внутри идеального диапазона
    return 100.0


def _status_from_index(health_index):
    if health_index >= 90:
        return 'normal'
    if health_index >= 60:
        return 'warning'
    if health_index >= 30:
        return 'critical'
    return 'alarm'


def calculate_health_index(telemetry_data):
    """
    Принимает словарь с параметрами телеметрии и возвращает dict:
    {
        'health_index': int (0-100),
        'parameter_scores': {param: score},
        'status': 'normal' | 'warning' | 'critical' | 'alarm'
    }
    """
    parameter_scores = {}
    total = 0.0

    for name, cfg in PARAMETER_CONFIG.items():
        value = telemetry_data.get(name)
        score = _score_parameter(name, value)
        parameter_scores[name] = round(score)
        total += score * cfg['weight']

    health_index = int(round(max(0.0, min(100.0, total))))

    return {
        'health_index': health_index,
        'parameter_scores': parameter_scores,
        'status': _status_from_index(health_index),
    }
