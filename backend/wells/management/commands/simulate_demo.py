"""
Демо-симулятор для защиты проекта.

Распределяет 10 скважин по ролям:
- 7 скважин (101-107): стабильная работа, мелкие колебания
- 1 скважина (108): стабильная авария (обрыв штанг) — для демонстрации ремонта
- 1 скважина (109): медленный рост обводнённости — для демонстрации ПРЕДИКТИВНОГО алерта
- 1 скважина (110): редкие warning-скачки без ухода в аварию

Комиссия увидит:
1. Живую работу большинства скважин
2. Стабильную аварию для демо "Завершить ремонт"
3. Настоящий ПРЕДИКТИВНЫЙ алерт (через ~8 минут после запуска)
4. Без метаний "90% + Авария → 0%"
"""
import random
import time
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone

from wells.models import Well, TelemetryData, Alert
from wells.services.health_calculator import calculate_health_index

# Идеальные базовые значения
BASE_VALUES = {
    'current': 45.0,
    'casing_pressure': 6.5,
    'discharge_pressure': 12.0,
    'temperature': 50.0,
    'flow_rate_liquid': 80.0,
    'flow_rate_oil': 30.0,
    'water_cut': 45.0,
    'stroke_rate': 7.0,
}

# Роли скважин (по номеру)
ROLE_NORMAL = 'normal'           # 101-107: стабильная работа
ROLE_ALARM = 'alarm'             # 108: стабильная авария
ROLE_PREDICTIVE = 'predictive'   # 109: медленный рост параметра
ROLE_WOBBLE = 'wobble'           # 110: редкие warning-скачки

WELL_ROLES = {
    '101': ROLE_NORMAL,
    '102': ROLE_NORMAL,
    '103': ROLE_NORMAL,
    '104': ROLE_NORMAL,
    '105': ROLE_NORMAL,
    '106': ROLE_NORMAL,
    '107': ROLE_NORMAL,
    '108': ROLE_ALARM,
    '109': ROLE_PREDICTIVE,
    '110': ROLE_WOBBLE,
}

# Параметр для предиктивного тренда у скважины 109
PREDICTIVE_PARAM = 'water_cut'
PREDICTIVE_START = 50.0    # начинаем с 50%
PREDICTIVE_STEP = 0.35     # рост на 0.35% каждые 5 секунд
PREDICTIVE_CRITICAL = 97.0 # критический порог (примерно через 22 минуты)
PREDICTIVE_WARNING = 90.0  # warning порог (примерно через 19 минут)


class Command(BaseCommand):
    help = 'Демо-симулятор: стабильные скважины + одна авария + один предиктивный алерт'

    def add_arguments(self, parser):
        parser.add_argument('--init-alarm', action='store_true',
                            help='Один раз создать критический алерт для скважины 108 (обрыв штанг)')
        parser.add_argument('--reset-predictive', action='store_true',
                            help='Сбросить скважину 109 в норму (обнулить тренд обводнённости)')

    def handle(self, *args, **options):
        if options.get('init_alarm'):
            self._init_alarm_well()
            return
        if options.get('reset_predictive'):
            self._reset_predictive_well()
            return

        self.stdout.write(self.style.SUCCESS(
            'Демо-симулятор запущен (тик каждые 5 сек):\n'
            '  • 101-107 — стабильная работа\n'
            '  • 108 — авария (обрыв штанг)\n'
            '  • 109 — растущая обводнённость (предиктивный алерт через ~8 мин)\n'
            '  • 110 — редкие warning-колебания\n'
            'Нажмите Ctrl+C для остановки.\n'
        ))

        start_time = timezone.now()
        try:
            while True:
                elapsed_minutes = (timezone.now() - start_time).total_seconds() / 60
                self._generate_cycle(elapsed_minutes)
                time.sleep(5)
        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING('\nСимулятор остановлен'))

    def _init_alarm_well(self):
        """Создаёт критический алерт для скважины 108 и переводит её в alarm."""
        try:
            well = Well.objects.get(number='108')
        except Well.DoesNotExist:
            self.stdout.write(self.style.ERROR('Скважина 108 не найдена. Сначала: python manage.py create_test_data'))
            return

        # Меняем статус
        well.status = Well.Status.ALARM
        well.save(update_fields=['status'])

        # Создаём критический алерт обрыва штанг
        Alert.objects.create(
            well=well,
            alert_type='critical',
            parameter='current',
            message='Критическое падение тока двигателя (обрыв штанг?): Ток двигателя = 0.0 А (порог 5 А)',
            value=0.0,
            threshold=5.0,
            is_active=True,
        )

        # Записываем мёртвую телеметрию
        TelemetryData.objects.create(
            well=well,
            health_index=0,
            current=0.0,
            casing_pressure=0.1,
            discharge_pressure=0.1,
            temperature=15.0,
            flow_rate_liquid=0.0,
            flow_rate_oil=0.0,
            water_cut=0.0,
            stroke_rate=0.0,
        )

        self.stdout.write(self.style.SUCCESS('✓ Скважина 108 переведена в аварию (обрыв штанг)'))

    def _reset_predictive_well(self):
        """Сбрасывает скважину 109 в норму — для перезапуска демо предиктивного алерта."""
        try:
            well = Well.objects.get(number='109')
        except Well.DoesNotExist:
            self.stdout.write(self.style.ERROR('Скважина 109 не найдена'))
            return

        well.status = Well.Status.ONLINE
        well.save(update_fields=['status'])
        # Закрываем все активные алерты
        Alert.objects.filter(well=well, is_active=True).update(
            is_active=False, resolved_at=timezone.now()
        )
        # Удаляем старую телеметрию обводнённости чтобы тренд начался заново
        # (оставляем только последнюю точку)
        latest = well.telemetry.order_by('-timestamp').first()
        if latest:
            well.telemetry.exclude(id=latest.id).delete()
        self.stdout.write(self.style.SUCCESS('✓ Скважина 109 сброшена, тренд начнётся заново'))

    def _generate_cycle(self, elapsed_minutes):
        wells = Well.objects.filter(is_active=True)
        for well in wells:
            role = WELL_ROLES.get(well.number, ROLE_NORMAL)

            if role == ROLE_ALARM:
                data = self._alarm_data()
            elif role == ROLE_PREDICTIVE:
                data = self._predictive_data(elapsed_minutes)
            elif role == ROLE_WOBBLE:
                data = self._wobble_data(elapsed_minutes)
            else:
                data = self._normal_data()

            health = calculate_health_index(data)
            TelemetryData.objects.create(
                well=well,
                health_index=health['health_index'],
                **data
            )

            # Обновляем статус только для "живых" скважин
            if role != ROLE_ALARM:
                new_status = self._status_from_data(data, role)
                if well.status != new_status:
                    well.status = new_status
                    well.save(update_fields=['status'])

    def _normal_data(self):
        """Стабильные значения с мелкими колебаниями ±3%."""
        return {
            k: round(v + random.uniform(-v * 0.03, v * 0.03), 2)
            for k, v in BASE_VALUES.items()
        }

    def _alarm_data(self):
        """Мёртвые значения для скважины в аварии."""
        return {
            'current': 0.0,
            'casing_pressure': 0.1,
            'discharge_pressure': 0.1,
            'temperature': 15.0,
            'flow_rate_liquid': 0.0,
            'flow_rate_oil': 0.0,
            'water_cut': 0.0,
            'stroke_rate': 0.0,
        }

    def _predictive_data(self, elapsed_minutes):
        """
        Медленный линейный рост обводнённости от 50% до 97% за ~22 минуты.
        Остальные параметры в норме. Это даст устойчивый тренд
        для предиктивной аналитики (линейная регрессия его поймает).
        """
        data = self._normal_data()
        # Линейный рост с небольшим шумом
        growth = elapsed_minutes * (PREDICTIVE_STEP * 12)  # 12 тиков в минуту
        new_value = min(PREDICTIVE_START + growth, PREDICTIVE_CRITICAL)
        data['water_cut'] = round(new_value + random.uniform(-0.5, 0.5), 2)
        return data

    def _wobble_data(self, elapsed_minutes):
        """Редкие warning-скачки без ухода в критическую аварию."""
        data = self._normal_data()
        # Каждые ~3 минуты (36 тиков) — кратковременный скачок температуры
        if int(elapsed_minutes * 12) % 36 < 3:
            data['temperature'] = round(85.0 + random.uniform(0, 3), 2)  # warning, но не critical
        return data

    def _status_from_data(self, data, role):
        """Определяет статус по данным. Упрощённо — без генерации алертов."""
        if role == ROLE_PREDICTIVE:
            if data['water_cut'] >= PREDICTIVE_CRITICAL:
                return Well.Status.ALARM
            if data['water_cut'] >= PREDICTIVE_WARNING:
                return Well.Status.WARNING
        if role == ROLE_WOBBLE:
            if data['temperature'] >= 85:
                return Well.Status.WARNING
        return Well.Status.ONLINE
