"""
Сервис генерации алертов на основе пороговых значений телеметрии.

Проверяет параметры последней телеметрии скважины, создаёт Alert-записи
(critical / warning), обновляет статус скважины (worst case wins) и
закрывает активные алерты, если все параметры пришли в норму.
"""

from django.utils import timezone

from wells.models import Alert, Well

# КРИТИЧЕСКИЕ пороги: (параметр, сообщение-шаблон, значение порога)
CRITICAL_RULES = [
    ('current', lambda v: v < 5, 5, 'Критическое падение тока двигателя (обрыв штанг?)'),
    ('current', lambda v: v > 85, 85, 'Критический рост тока двигателя (заклинивание?)'),
    ('casing_pressure', lambda v: v > 16, 16, 'Критическое превышение затрубного давления'),
    ('casing_pressure', lambda v: v < 0.5, 0.5, 'Критически низкое затрубное давление'),
    ('temperature', lambda v: v > 95, 95, 'Критический перегрев оборудования'),
    ('flow_rate_oil', lambda v: v < 1, 1, 'Критическое падение дебита нефти'),
    ('water_cut', lambda v: v > 97, 97, 'Критическая обводнённость продукции'),
]

# ПРЕДУПРЕЖДАЮЩИЕ пороги
WARNING_RULES = [
    ('current', lambda v: v < 20, 20, 'Низкий ток двигателя'),
    ('current', lambda v: v > 75, 75, 'Повышенный ток двигателя'),
    ('casing_pressure', lambda v: v > 12, 12, 'Повышенное затрубное давление'),
    ('temperature', lambda v: v > 85, 85, 'Повышенная температура оборудования'),
    ('flow_rate_oil', lambda v: v < 5, 5, 'Снижение дебита нефти'),
    ('water_cut', lambda v: v > 90, 90, 'Рост обводнённости продукции'),
]

# Худший случай побеждает: alarm/maintenance > warning > online
# maintenance (в ремонте) по приоритету равен alarm — скважина стоит до ручного перезапуска
_STATUS_PRIORITY = {
    'offline': 0,
    'alarm': 3,
    'maintenance': 3,
    'warning': 2,
    'online': 1,
}


def check_and_create_alerts(well, telemetry_data):
    """
    Проверяет пороговые значения и создаёт алерты.

    :param well: экземпляр Well
    :param telemetry_data: dict с параметрами телеметрии
    :return: (created_alerts: list[Alert], new_status: str)
    """
    created_alerts = []
    triggered_severity = None  # 'critical' | 'warning' | None

    def _check(rules, alert_type):
        nonlocal triggered_severity
        for param, condition, threshold, msg_tpl in rules:
            value = telemetry_data.get(param)
            if value is None:
                continue
            if condition(value):
                alert = Alert.objects.create(
                    well=well,
                    alert_type=alert_type,
                    parameter=param,
                    message=f'{msg_tpl}: {param} = {round(value, 2)} (порог {threshold})',
                    value=value,
                    threshold=threshold,
                    is_active=True,
                )
                created_alerts.append(alert)
                if alert_type == 'critical':
                    triggered_severity = 'critical'
                elif triggered_severity != 'critical':
                    triggered_severity = 'warning'

    _check(CRITICAL_RULES, 'critical')
    _check(WARNING_RULES, 'warning')

    if triggered_severity is None:
        # АВТОМАТИЧЕСКОЕ закрытие алертов ТОЛЬКО если скважина НЕ в аварии/ремонте.
        # КРИТИЧЕСКИЙ БИЗНЕС-БАГ (исправлен): в реальности скважина с обрывом штанг
        # уходит в ремонт и стоит, пока оператор вручную не нажмёт "Завершить ремонт"
        # (через POST /api/wells/{id}/repair/ или action в админке).
        # Если скважина уже в alarm/maintenance — она остаётся в этом статусе,
        # даже если телеметрия "вернулась в норму".
        if well.status not in [Well.Status.ALARM, Well.Status.MAINTENANCE]:
            active = Alert.objects.filter(well=well, is_active=True)
            if active.exists():
                active.update(is_active=False, resolved_at=timezone.now())
            new_status = 'online'
        else:
            # Статусы из _STATUS_PRIORITY равны (3 >= 3), поэтому ниже ничего не изменится
            new_status = well.status
    else:
        new_status = 'alarm' if triggered_severity == 'critical' else 'warning'
        # КРИТИЧЕСКИЙ БИЗНЕС-БАГ (защита): скважина, уже стоящая в ремонте (maintenance),
        # НЕ должна "спонтанно" перевестись в alarm из-за новых данных — ремонт всё равно
        # завершается только вручную оператором. Для online/warning работает worst case wins.
        if well.status == Well.Status.MAINTENANCE:
            new_status = well.status

    # Обновляем статус скважины (не трогаем offline вручную установленный? worst case wins)
    current_priority = _STATUS_PRIORITY.get(well.status, 0)
    new_priority = _STATUS_PRIORITY.get(new_status, 0)
    if well.status != 'offline':
        if new_priority >= current_priority or triggered_severity is None:
            if well.status != new_status:
                well.status = new_status
                well.save(update_fields=['status'])

    return created_alerts, well.status
