"""
Создание тестовых данных с РАСТУЩИМ трендом тока, чтобы на странице скважины
гарантированно появился предиктивный алерт (PredictiveAlert).

ВАЖНО: фронтенд берёт телеметрию по period=24h (по умолчанию), а API возвращает
последние N записей. Симулятор пишет точку каждые 5 секунд, поэтому 25 точек «за
часы» из ТЗ не дали бы алерт — здесь создаётся ~300 точек с шагом 1 минуту и
устойчивым ростом тока от 40 до ~86 А (критический порог current_max = 85).

Запуск: cd backend && python create_predictive_test.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from datetime import timedelta

import random

from django.utils import timezone

from wells.models import Well, TelemetryData

print("=== Создание тестовых данных с трендом ===")

well = Well.objects.first()
if not well:
    print("❌ Нет скважин в БД! Запусти: python manage.py create_test_data")
    exit(1)

# Удаляем старую телеметрию выбранной скважины, чтобы тренд был чистым
deleted, _ = TelemetryData.objects.filter(well=well).delete()
print(f"Удалена старая телеметрия скважины №{well.number} ({deleted} записей)")

now = timezone.now()
POINTS = 300          # 300 точек по 1 минуте = последние 5 часов
base_current = 40.0   # старт тока
end_current = 86.0    # финал тока (выше критического порога 85)

random.seed(42)       # воспроизводимость

records = []
for i in range(POINTS - 1, -1, -1):
    timestamp = now - timedelta(minutes=i)
    progress = (POINTS - 1 - i) / (POINTS - 1)  # 0 -> 1
    current = base_current + (end_current - base_current) * progress
    current += random.uniform(-0.4, 0.4)  # небольшой шум, тренд остаётся значимым (R² > 0.5)

    records.append(
        TelemetryData(
            well=well,
            timestamp=timestamp,
            current=current,
            casing_pressure=6.0 + random.uniform(-0.2, 0.2),
            discharge_pressure=8.0 + random.uniform(-0.2, 0.2),
            temperature=50 + random.uniform(-1, 1),
            flow_rate_liquid=30 + random.uniform(-1, 1),
            flow_rate_oil=25 + random.uniform(-1, 1),
            water_cut=60 + random.uniform(-1, 1),
            stroke_rate=8 + random.uniform(-0.2, 0.2),
            health_index=max(5.0, 95 - progress * 60),
        )
    )

TelemetryData.objects.bulk_create(records)

last = records[-1]
print(f"✅ Создано {len(records)} записей телеметрии (шаг 1 минута)")
print(f"📈 Ток вырос с {base_current} до {round(last.current, 1)} А (критический порог — 85)")
print(f"🔮 Открой http://localhost:5173/well/{well.id} — должен появиться предиктивный алерт")
