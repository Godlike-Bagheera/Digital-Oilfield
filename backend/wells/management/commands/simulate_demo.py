"""
Демо-симулятор для защиты проекта.
"""
import random
import time
from django.core.management.base import BaseCommand
from django.utils import timezone

from wells.models import Well, TelemetryData, Alert
from wells.services.health_calculator import calculate_health_index

BASE_VALUES = {
    'current': 45.0, 'casing_pressure': 6.5, 'discharge_pressure': 12.0,
    'temperature': 50.0, 'flow_rate_liquid': 80.0, 'flow_rate_oil': 30.0,
    'water_cut': 45.0, 'stroke_rate': 7.0,
}

WELL_ROLES = {
    '101': 'normal', '102': 'normal', '103': 'normal', '104': 'normal',
    '105': 'normal', '106': 'normal', '107': 'normal',
    '108': 'alarm',      # стабильная авария
    '109': 'predictive', # растущая обводнённость
    '110': 'wobble',     # редкие warning-скачки
}

PREDICTIVE_START = 50.0
PREDICTIVE_STEP_PER_MIN = 4.2  # ~22 минуты до 97%
PREDICTIVE_CRITICAL = 97.0
PREDICTIVE_WARNING = 90.0


class Command(BaseCommand):
    help = 'Демо-симулятор'

    def add_arguments(self, parser):
        parser.add_argument('--init-alarm', action='store_true')
        parser.add_argument('--reset-predictive', action='store_true')

    def handle(self, *args, **options):
        if options.get('init_alarm'):
            self._init_alarm()
            return
        if options.get('reset_predictive'):
            self._reset_predictive()
            return

        self.stdout.write(self.style.SUCCESS(
            'Демо-симулятор запущен:\n'
            '  • 101-107 — норма\n'
            '  • 108 — авария (обрыв штанг)\n'
            '  • 109 — предиктивный алерт (~8 мин)\n'
            '  • 110 — редкие warning\n'
        ))

        start = timezone.now()
        try:
            while True:
                mins = (timezone.now() - start).total_seconds() / 60
                self._cycle(mins)
                time.sleep(5)
        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING('\nОстановлен'))

    def _init_alarm(self):
        well = Well.objects.get(number='108')
        well.status = 'alarm'
        well.save(update_fields=['status'])
        Alert.objects.filter(well=well, is_active=True).update(is_active=False, resolved_at=timezone.now())
        Alert.objects.create(
            well=well, alert_type='critical', parameter='current',
            message='Критическое падение тока двигателя (обрыв штанг?): Ток двигателя = 0.0 А (порог 5 А)',
            value=0.0, threshold=5.0, is_active=True,
        )
        self.stdout.write(self.style.SUCCESS('✓ Скважина 108 в аварии'))

    def _reset_predictive(self):
        well = Well.objects.get(number='109')
        well.status = 'online'
        well.save(update_fields=['status'])
        Alert.objects.filter(well=well, is_active=True).update(is_active=False, resolved_at=timezone.now())
        self.stdout.write(self.style.SUCCESS('✓ Скважина 109 сброшена'))

    def _cycle(self, mins):
        for well in Well.objects.filter(is_active=True):
            role = WELL_ROLES.get(well.number, 'normal')

            if role == 'alarm':
                # Скважина 108: ВСЕГДА в аварии, ВСЕГДА пишет мёртвые данные
                well.status = 'alarm'
                well.save(update_fields=['status'])
                TelemetryData.objects.create(
                    well=well, health_index=0,
                    current=0.0, casing_pressure=0.1, discharge_pressure=0.1,
                    temperature=15.0, flow_rate_liquid=0.0, flow_rate_oil=0.0,
                    water_cut=0.0, stroke_rate=0.0,
                )
                continue

            # Остальные скважины
            if role == 'predictive':
                data = {k: round(v + random.uniform(-v*0.03, v*0.03), 2) for k, v in BASE_VALUES.items()}
                growth = mins * PREDICTIVE_STEP_PER_MIN
                data['water_cut'] = round(min(PREDICTIVE_START + growth, PREDICTIVE_CRITICAL) + random.uniform(-0.5, 0.5), 2)
            elif role == 'wobble':
                data = {k: round(v + random.uniform(-v*0.03, v*0.03), 2) for k, v in BASE_VALUES.items()}
                if int(mins * 12) % 36 < 3:
                    data['temperature'] = round(85.0 + random.uniform(0, 3), 2)
            else:
                data = {k: round(v + random.uniform(-v*0.03, v*0.03), 2) for k, v in BASE_VALUES.items()}

            health = calculate_health_index(data)
            TelemetryData.objects.create(well=well, health_index=health['health_index'], **data)

            # Статус по Health Index (главный арбитр)
            hi = health['health_index']
            if hi < 30:
                new_status = 'alarm'
            elif hi < 60:
                new_status = 'warning'
            elif role == 'predictive' and data['water_cut'] >= PREDICTIVE_CRITICAL:
                new_status = 'alarm'
            elif role == 'predictive' and data['water_cut'] >= PREDICTIVE_WARNING:
                new_status = 'warning'
            elif role == 'wobble' and data['temperature'] >= 85:
                new_status = 'warning'
            else:
                new_status = 'online'

            if well.status != new_status:
                well.status = new_status
                well.save(update_fields=['status'])
