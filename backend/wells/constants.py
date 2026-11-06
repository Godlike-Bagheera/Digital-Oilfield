"""
Человекочитаемые названия и единицы измерения параметров телеметрии.
Единый источник истины для бэкенда (alert_generator) и фронтенда.
"""

PARAMETER_LABELS = {
    'current': {'label': 'Ток двигателя', 'unit': 'А'},
    'casing_pressure': {'label': 'Затрубное давление', 'unit': 'МПа'},
    'discharge_pressure': {'label': 'Давление на выкиде', 'unit': 'МПа'},
    'temperature': {'label': 'Температура устья', 'unit': '°C'},
    'flow_rate_oil': {'label': 'Дебит нефти', 'unit': 'т/сут'},
    'flow_rate_liquid': {'label': 'Дебит жидкости', 'unit': 'т/сут'},
    'water_cut': {'label': 'Обводнённость', 'unit': '%'},
    'stroke_rate': {'label': 'Число качаний', 'unit': 'кач/мин'},
    'health_index': {'label': 'Индекс здоровья', 'unit': '%'},
}


def get_parameter_label(key):
    """Возвращает человекочитаемое название параметра."""
    return PARAMETER_LABELS.get(key, {}).get('label', key)


def get_parameter_unit(key):
    """Возвращает единицу измерения параметра."""
    return PARAMETER_LABELS.get(key, {}).get('unit', '')
