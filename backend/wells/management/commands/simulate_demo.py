"""
Демо-симулятор для защиты проекта.
ОДНА команда: python manage.py simulate_demo

ВСЕ события имеют toast-уведомления!
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

ALARM_WELL = '108'
PREDICTIVE_WELL = '109'
WOBBLE_WELL = '110'

WC_WARNING = 90.0
WC_CRITICAL = 97.0
WC_GROWTH_PER_SEC = (WC_CRITICAL - 45.0) / (8 * 60)


class Command(BaseCommand):
    help = 'Демо-симулятор: все события с уведомлениями'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS(
            ' Демо-симулятор запущен:\n'
            '  • 0-15 сек: все скважины работают\n'
            '  • 15 сек: скв. 108 → АВАРИЯ (обрыв штанг) 🔔\n'
            '  • ~3 мин: скв. 109 → WARNING (обводнённость 90%) 🔔\n'
            '  • ~5 мин: скв. 109 → ПРЕДИКТИВНЫЙ алерт 🔔\n'
            '  • ~8 мин: скв. 109 → АВАРИЯ (обводнённость 97%) 🔔\n'
            '  • 110: редкие warning-скачки 🔔\n'
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

    def _create_alert(self, well, alert_type, parameter, message, value, threshold):
        """Создаёт алерт с УНИКАЛЬНЫМ параметром чтобы фронтенд показал toast"""
        # Закрываем все старые активные алерты этой скважины
        Alert.objects.filter(well=well, is_active=True).update(
            is_active=False, resolved_at=timezone.now()
        )
        # Создаём НОВЫЙ алерт (уникальный timestamp)
        return Alert.objects.create(
            well=well,
            alert_type=alert_type,
            parameter=parameter,
            message=message,
            value=value,
            threshold=threshold,
            is_active=True,
        )

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
                self._create_alert(
                    well, 'critical', 'current',
                    'Критическое падение тока двигателя (обрыв штанг?): Ток двигателя = 0.0 А (порог 5 А)',
                    0.0, 5.0
                )
                self.stdout.write(self.style.WARNING(f'  ⚠ Скважина {well.number}: АВАРИЯ (обрыв штанг) 🔔'))

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
            if well.status != 'alarm':
                well.status = 'alarm'
                well.save(update_fields=['status'])
                self._create_alert(
                    well, 'critical', 'water_cut_critical',
                    f'Критическая обводнённость продукции: Обводнённость = {wc:.1f}% (порог {WC_CRITICAL}%)',
                    wc, WC_CRITICAL
                )
                self.stdout.write(self.style.ERROR(f'  🚨 Скважина {well.number}: АВАРИЯ (обводнённость {wc:.1f}%) 🔔'))
        elif wc >= WC_WARNING:
            new_status = 'warning'
            if well.status != 'warning':
                well.status = 'warning'
                well.save(update_fields=['status'])
                self._create_alert(
                    well, 'warning', 'water_cut_warning',
                    f'Рост обводнённости продукции: Обводнённость = {wc:.1f}% (порог {WC_WARNING}%)',
                    wc, WC_WARNING
                )
                self.stdout.write(self.style.WARNING(f'   Скважина {well.number}: WARNING (обводнённость {wc:.1f}%) 🔔'))

    def _wobble_well(self, well, elapsed):
        data = {k: round(v + random.uniform(-v*0.03, v*0.03), 2) for k, v in BASE_VALUES.items()}
        cycle_pos = int(elapsed) % 120
        if cycle_pos < 30:
            data['temperature'] = round(86.0 + random.uniform(0, 4), 2)

        health = calculate_health_index(data)
        TelemetryData.objects.create(well=well, health_index=health['health_index'], **data)

        if data['temperature'] >= 85 and well.status != 'warning':
            well.status = 'warning'
            well.save(update_fields=['status'])
            self._create_alert(
                well, 'warning', f'temp_{int(elapsed)}',
                f'Повышенная температура оборудования: Температура = {data["temperature"]:.1f}°C (порог 85°C)',
                data['temperature'], 85.0
            )
            self.stdout.write(self.style.WARNING(f'  ⚠ Скважина {well.number}: WARNING (температура {data["temperature"]:.1f}°C) 🔔'))
        elif data['temperature'] < 85 and well.status == 'warning':
            well.status = 'online'
            well.save(update_fields=['status'])
