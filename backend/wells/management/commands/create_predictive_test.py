"""
Создаёт телеметрию с РАСТУЩИМ трендом тока для первой скважины, чтобы на её
странице гарантированно появился предиктивный алерт (PredictiveAlert).

Фронтенд берёт телеметрию по period=24h, а API возвращает последние N записей,
поэтому создаётся ~300 точек с шагом 1 минута и устойчивым ростом тока
от 55 до 80 А (~5 А/ч, порог current_max = 85),
чтобы прогноз проходил проверку стабильности тренда (не более 10% в час).
"""
import random
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from wells.models import Well, TelemetryData

POINTS = 300
BASE_CURRENT = 55.0
END_CURRENT = 80.0


class Command(BaseCommand):
    help = 'Создаёт телеметрию с растущим трендом тока для демонстрации предиктивного алерта'

    def handle(self, *args, **options):
        well = Well.objects.order_by('number').first()
        if not well:
            self.stdout.write(self.style.ERROR(
                'Нет скважин в БД! Запусти: python manage.py create_test_data'
            ))
            return

        deleted, _ = TelemetryData.objects.filter(well=well).delete()
        self.stdout.write(f'Удалена старая телеметрия скважины №{well.number} ({deleted} записей)')

        now = timezone.now()
        rng = random.Random(42)
        records = []
        for i in range(POINTS - 1, -1, -1):
            progress = (POINTS - 1 - i) / (POINTS - 1)
            current = BASE_CURRENT + (END_CURRENT - BASE_CURRENT) * progress
            current += rng.uniform(-0.4, 0.4)
            records.append(
                TelemetryData(
                    well=well,
                    timestamp=now - timedelta(minutes=i),
                    current=current,
                    casing_pressure=6.0 + rng.uniform(-0.2, 0.2),
                    discharge_pressure=8.0 + rng.uniform(-0.2, 0.2),
                    temperature=50 + rng.uniform(-1, 1),
                    flow_rate_liquid=30 + rng.uniform(-1, 1),
                    flow_rate_oil=25 + rng.uniform(-1, 1),
                    water_cut=60 + rng.uniform(-1, 1),
                    stroke_rate=8 + rng.uniform(-0.2, 0.2),
                    health_index=max(5.0, 95 - progress * 60),
                )
            )
        timestamps = [r.timestamp for r in records]
        created = TelemetryData.objects.bulk_create(records)
        # timestamp объявлен с auto_now_add, поэтому bulk_create перезаписывает его текущим
        # временем; восстанавливаем реальную шкалу времени (шаг 1 минута) через bulk_update.
        for record, ts in zip(created, timestamps):
            record.timestamp = ts
        TelemetryData.objects.bulk_update(created, ['timestamp'])

        self.stdout.write(self.style.SUCCESS(
            f'Создано {len(records)} записей телеметрии для скважины №{well.number}: '
            f'ток {BASE_CURRENT} → {round(records[-1].current, 1)} А (порог 85). '
            f'Открой http://localhost:5173/well/{well.id}'
        ))
