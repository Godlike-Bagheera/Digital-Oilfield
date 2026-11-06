"""
Демо-симулятор для защиты проекта.
ОДНА команда: python manage.py simulate_demo

Сценарий:
- 0-15 сек: все скважины работают нормально
- 15 сек: скв. 108 → АВАРИЯ (обрыв штанг) + алерт + уведомление
- ~3 мин: скв. 109 → warning (обводнённость 90%)
- ~5 мин: скв. 109 → ПРЕДИКТИВНЫЙ алерт (накопился тренд)
- ~8 мин: скв. 109 → АВАРИЯ (обводнённость 97%)
- 110: каждые 2 мин warning-скачки температуры
"""
import random
import time
from django.core.management.base import BaseCommand
from django.utils import timezone

from wells.models import Well, TelemetryData, Alert
from wells.services.health_calculator import calculate_health_index
from wells.services.alert_generator import check_and_create_alerts

BASE_VALUES = {
    'current': 45.0, 'casing_pressure': 6.5, 'discharge_pressure': 12.0,
    'temperature': 50.0, 'flow_rate_liquid': 80.0, 'flow_rate_oil': 30.0,
    'water_cut': 45.0, 'stroke_rate': 7.0,
}

ALARM_WELL = '108'
PREDICTIVE_WELL = '109'
WOBBLE_WELL = '110'

WC_WARNING = 90.0
WC_CRITICAL = 97.0
# Рост от 45% до 97% за 8 минут (480 сек), но начинаем с 0 сек
WC_GROWTH_PER_SEC = (WC_CRITICAL - 45.0) / (8 * 60)


class Command(BaseCommand):
    help = 'Демо-симулятор: одна команда, всё работает само'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS(
            '🚀 Демо-симулятор запущен:\n'
            '  • 0-15 сек: все скважины работают\n'
            '  • 15 сек: скв. 108 → АВАРИЯ (обрыв штанг)\n'
            '  • ~3 мин: скв. 109 → warning (обводнённость 90%)\n'
            '  • ~5 мин: скв. 109 → ПРЕДИКТИВНЫЙ алерт\n'
            '  • ~8 мин: скв. 109 → АВАРИЯ (обводнённость 97%)\n'
            '  • 110: редкие warning-скачки\n'
            'Ctrl+C для остановки.\n'
        ))

        self._reset_all()

        start = time.time()
        try:
            while True:
                elapsed = time.time() - start
                self._tick(elapsed)
                time.sleep(5)
        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING('\n⏹ Остановлен'))

    def _reset_all(self):
        for well in Well.objects.filter(is_active=True):
            well.status = 'online'
            well.save(update_fields=['status'])
            Alert.objects.filter(well=well, is_active=True).update(
                is_active=False, resolved_at=timezone.now()
            )
        self.stdout.write('✓ Все скважины сброшены в online')

    def _tick(self, elapsed):
        for well in Well.objects.filter(is_active=True):
            num = well.number
            if num == ALARM_WELL:
                self._alarm_well(well, elapsed)
            elif num == PREDICTIVE_WELL:
                self._predictive_well(well, elapsed)
            elif num == WOBBLE_WELL:
                self._wobble_well(well, elapsed)
            else:
                self._normal_well(well)

    def _normal_well(self, well):
        data = {k: round(v + random.uniform(-v*0.03, v*0.03), 2) for k, v in BASE_VALUES.items()}
        health = calculate_health_index(data)
        TelemetryData.objects.create(well=well, health_index=health['health_index'], **data)
        if well.status != 'online':
            well.status = 'online'
            well.save(update_fields=['status'])

    def _alarm_well(self, well, elapsed):
        if elapsed < 15:
            data = {k: round(v + random.uniform(-v*0.03, v*0.03), 2) for k, v in BASE_VALUES.items()}
            health = calculate_health_index(data)
            TelemetryData.objects.create(well=well, health_index=health['health_index'], **data)
            if well.status != 'online':
                well.status = 'online'
                well.save(update_fields=['status'])
        else:
            data = {
                'current': 0.0, 'casing_pressure': 0.1, 'discharge_pressure': 0.1,
                'temperature': 15.0, 'flow_rate_liquid': 0.0, 'flow_rate_oil': 0.0,
                'water_cut': 0.0, 'stroke_rate': 0.0,
            }
            TelemetryData.objects.create(well=well, health_index=0, **data)
            if well.status != 'alarm':
                well.status = 'alarm'
                well.save(update_fields=['status'])
                if not Alert.objects.filter(well=well, parameter='current', alert_type='critical', is_active=True).exists():
                    Alert.objects.create(
                        well=well, alert_type='critical', parameter='current',
                        message='Критическое падение тока двигателя (обрыв штанг?): Ток двигателя = 0.0 А (порог 5 А)',
                        value=0.0, threshold=5.0, is_active=True,
                    )
                    self.stdout.write(self.style.WARNING(f'  ⚠ Скважина {well.number}: АВАРИЯ (обрыв штанг)'))

    def _predictive_well(self, well, elapsed):
        data = {k: round(v + random.uniform(-v*0.03, v*0.03), 2) for k, v in BASE_VALUES.items()}
        growth = elapsed * WC_GROWTH_PER_SEC
        new_wc = min(45.0 + growth, WC_CRITICAL)
        data['water_cut'] = round(new_wc + random.uniform(-0.3, 0.3), 2)

        health = calculate_health_index(data)
        TelemetryData.objects.create(well=well, health_index=health['health_index'], **data)

        wc = data['water_cut']
        if wc >= WC_CRITICAL:
            new_status = 'alarm'
        elif wc >= WC_WARNING:
            new_status = 'warning'
        else:
            new_status = 'online'

        if well.status != new_status:
            well.status = new_status
            well.save(update_fields=['status'])
            check_and_create_alerts(well, data, health['health_index'])
            if new_status == 'alarm':
                self.stdout.write(self.style.ERROR(f'  🚨 Скважина {well.number}: АВАРИЯ (обводнённость {wc:.1f}%)'))
            elif new_status == 'warning':
                self.stdout.write(self.style.WARNING(f'  ⚠ Скважина {well.number}: WARNING (обводнённость {wc:.1f}%)'))

    def _wobble_well(self, well, elapsed):
        data = {k: round(v + random.uniform(-v*0.03, v*0.03), 2) for k, v in BASE_VALUES.items()}
        cycle_pos = int(elapsed) % 120
        if cycle_pos < 30:
            data['temperature'] = round(86.0 + random.uniform(0, 4), 2)

        health = calculate_health_index(data)
        TelemetryData.objects.create(well=well, health_index=health['health_index'], **data)

        new_status = 'warning' if data['temperature'] >= 85 else 'online'
        if well.status != new_status:
            well.status = new_status
            well.save(update_fields=['status'])
            if new_status == 'warning':
                check_and_create_alerts(well, data, health['health_index'])
