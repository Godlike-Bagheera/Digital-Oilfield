"""
Management command: симулятор телеметрии скважин.

Генерирует реалистичные данные телеметрии (плавные отклонения от
предыдущих значений), рассчитывает индекс здоровья, проверяет пороги
и создаёт алерты.

Примеры:
    python manage.py simulate_telemetry --once
    python manage.py simulate_telemetry --continuous --with-anomalies
"""

import random
import time

from django.core.management.base import BaseCommand

from wells.models import TelemetryData, Well
from wells.services.alert_generator import check_and_create_alerts
from wells.services.health_calculator import calculate_health_index

# Базовые значения и амплитуда случайного блуждания
BASE_VALUES = {
    'current':            {'base': 45.0,  'step': 5.0},
    'casing_pressure':    {'base': 6.0,   'step': 1.0},
    'discharge_pressure': {'base': 12.0,  'step': 2.0},
    'temperature':        {'base': 50.0,  'step': 5.0},
    'flow_rate_liquid':   {'base': 80.0,  'step': 10.0},
    'flow_rate_oil':      {'base': 30.0,  'step': 5.0},
    'water_cut':          {'base': 60.0,  'step': 5.0},
    'stroke_rate':        {'base': 8.0,   'step': 1.0},
}

# Аномалии: name -> dict изменений параметров
ANOMALIES = {
    'Обрыв штанг':        {'current': 0.0, 'flow_rate_oil': 0.0},
    'Перегрев':           {'temperature': 97.0},
    'Падение дебита':     {'flow_rate_oil': 2.0},
    'Рост обводнённости': {'water_cut': 98.0},
}


def _next_value(previous, cfg):
    """Следующее значение — небольшое случайное отклонение от предыдущего."""
    if previous is None:
        return round(cfg['base'] + random.uniform(-cfg['step'], cfg['step']), 2)
    delta = random.gauss(0, cfg['step'] * 0.3)
    # Возврат к базовому значению (mean reversion), чтобы не было дрейфа
    pull = (cfg['base'] - previous) * 0.1
    value = previous + delta + pull
    return round(max(0.0, value), 2)


class Command(BaseCommand):
    help = 'Симулятор телеметрии: генерация данных, расчёт health index, алерты'

    def add_arguments(self, parser):
        parser.add_argument('--once', action='store_true',
                          help='Сгенерировать данные один раз для всех скважин и выйти')
        parser.add_argument('--continuous', action='store_true',
                          help='Непрерывный режим: генерация каждые 5 секунд')
        parser.add_argument('--with-anomalies', action='store_true',
                          help='С вероятностью 5%% генерировать аномалии')

    def handle(self, *args, **options):
        once = options.get('once', False)
        continuous = options.get('continuous', False)
        with_anomalies = options.get('with_anomalies', False)

        if not once and not continuous:
            once = True  # поведение по умолчанию

        self.stdout.write(self.style.SUCCESS(
            f'Симулятор телеметрии запущен (режим: '
            f'{"continuous" if continuous else "once"}, '
            f'аномалии: {"вкл" if with_anomalies else "выкл"})'
        ))

        try:
            while True:
                self._generate_cycle(with_anomalies)
                if once or not continuous:
                    break
                time.sleep(5)
        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING('\nСимулятор остановлен (Ctrl+C)'))

    def _generate_cycle(self, with_anomalies):
        wells = Well.objects.filter(is_active=True)
        if not wells.exists():
            self.stdout.write(self.style.ERROR(
                'Нет активных скважин. Запустите: python manage.py create_test_data'))
            return

        for well in wells:
            # КРИТИЧЕСКИЙ БИЗНЕС-БАГ (исправлен): если скважина в аварии или на ремонте —
            # она НЕ генерирует нормальные данные и НЕ "чинится" автоматически.
            # Пишем "мёртвые" значения (обрыв штанг, скважина стоит) до ручного
            # перезапуска оператором через POST /api/wells/{id}/repair/ или админку.
            if well.status in [Well.Status.ALARM, Well.Status.MAINTENANCE]:
                dead_data = {
                    'current': 0.0,          # Ток = 0 (двигатель не работает)
                    'casing_pressure': 0.1,  # Давление падает до атмосферного
                    'discharge_pressure': 0.1,
                    'temperature': 15.0,     # Остывает до температуры среды
                    'flow_rate_liquid': 0.0, # Нет потока
                    'flow_rate_oil': 0.0,    # Нет добычи
                    'water_cut': 0.0,
                    'stroke_rate': 0.0,      # Нет качаний
                }
                # Сохраняем телеметрию с health_index = 0 (мёртвая скважина).
                # ВАЖНО: НЕ вызываем check_and_create_alerts — новые алерты для
                # мёртвых скважин не создаём (они уже в alarm), статус не меняется.
                TelemetryData.objects.create(
                    well=well,
                    health_index=0,
                    **dead_data
                )
                self.stdout.write(self.style.WARNING(
                    f'Скважина №{well.number}: статус={well.status} — '
                    f'генерируются "мёртвые" данные (ждёт ручного ремонта)'
                ))
                continue

            last = TelemetryData.objects.filter(well=well).order_by('-timestamp').first()

            # ФИКС (после ремонта): если последняя телеметрия ЭТАЛОННАЯ
            # (health_index == 100 — создана эндпоинтом /repair/), симулятор
            # отталкивается от идеальных значений, а НЕ от "памяти" об аварии.
            # Генерируем нормальные значения прямо в идеальных диапазонах.
            if last is not None and last.health_index >= 100:
                data = {
                    'current': round(45 + random.uniform(-2, 2), 2),
                    'casing_pressure': round(6.5 + random.uniform(-0.5, 0.5), 2),
                    'discharge_pressure': round(12.0 + random.uniform(-1, 1), 2),
                    'temperature': round(50 + random.uniform(-3, 3), 2),
                    'flow_rate_liquid': round(80 + random.uniform(-5, 5), 2),
                    'flow_rate_oil': round(30 + random.uniform(-2, 2), 2),
                    'water_cut': round(45 + random.uniform(-3, 3), 2),
                    'stroke_rate': round(7 + random.uniform(-0.5, 0.5), 2),
                }
                # Аномалии возможны и в пост-ремонтном режиме, иначе после первого
                # ремонта скважина навсегда остаётся «идеальной» и --with-anomalies не работает
                anomaly_name = None
                if with_anomalies and random.random() < 0.05:
                    anomaly_name, changes = random.choice(list(ANOMALIES.items()))
                    data.update(changes)
                health = calculate_health_index(data)
                record = TelemetryData.objects.create(
                    well=well, health_index=health['health_index'], **data)
                alerts, status = check_and_create_alerts(well, data)
                msg = (f'Скважина №{well.number}: HI={health["health_index"]} '
                       f'(пост-ремонтный режим, база = эталонная телеметрия)')
                if anomaly_name:
                    msg += f' [АНОМАЛИЯ: {anomaly_name}], статус={status}'
                if alerts:
                    msg += f', создано алертов: {len(alerts)}'
                self.stdout.write(msg)
                continue

            data = {}
            for param, cfg in BASE_VALUES.items():
                prev = getattr(last, param, None) if last else None
                data[param] = _next_value(prev, cfg)

            # Аномалии (5% шанс) применяются ТОЛЬКО к скважинам online/warning —
            # скважины в alarm/maintenance сюда уже не доходят (continue выше)
            anomaly_name = None
            if with_anomalies and random.random() < 0.05:
                anomaly_name, changes = random.choice(list(ANOMALIES.items()))
                data.update(changes)

            health = calculate_health_index(data)

            record = TelemetryData.objects.create(
                well=well,
                current=data['current'],
                casing_pressure=data['casing_pressure'],
                discharge_pressure=data['discharge_pressure'],
                temperature=data['temperature'],
                flow_rate_liquid=data['flow_rate_liquid'],
                flow_rate_oil=data['flow_rate_oil'],
                water_cut=data['water_cut'],
                stroke_rate=data['stroke_rate'],
                health_index=health['health_index'],
            )

            alerts, status = check_and_create_alerts(well, data)

            msg = (f'Скважина №{well.number}: HI={health["health_index"]} '
                   f'({health["status"]}), статус={status}')
            if anomaly_name:
                msg += f' [АНОМАЛИЯ: {anomaly_name}]'
            if alerts:
                msg += f', создано алертов: {len(alerts)}'
            self.stdout.write(msg)

        self.stdout.write(self.style.SUCCESS(
            f'Цикл завершён: записей телеметрии всего — {TelemetryData.objects.count()}'))
