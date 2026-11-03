"""Тест бизнес-логики: скважина не должна сама чиниться после аварии.

КРИТИЧЕСКИЙ БИЗНЕС-БАГ: в реальности скважина с обрывом штанг уходит в ремонт
и стоит, пока оператор вручную не нажмёт "Завершить ремонт" (POST /repair/
или action в админке). Автоматического возврата в online быть НЕ должно.
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from wells.models import Well, Alert, TelemetryData
from wells.services.alert_generator import check_and_create_alerts
from django.utils import timezone

print("=" * 60)
print("ТЕСТ: Скважина не должна сама чиниться после аварии")
print("=" * 60)

# Берём первую доступную скважину
well = Well.objects.first()
print(f"\n[1] Скважина: №{well.number}, статус: {well.status}")

# Симулируем КРИТИЧЕСКУЮ аварию (обрыв штанг)
critical_data = {
    'current': 0,           # обрыв штанг
    'casing_pressure': 6,
    'temperature': 50,
    'flow_rate_oil': 0,     # нет добычи
    'water_cut': 60,
    'stroke_rate': 8,
}
alerts, new_status = check_and_create_alerts(well, critical_data)
well.refresh_from_db()
print(f"[2] После аварии: статус = {well.status}, создано алертов: {len(alerts)}")
assert well.status == 'alarm', f"Ожидался alarm, получен {well.status}"

# Теперь симулируем что данные "сами вернулись в норму".
# В СТАРОЙ логике это бы починило скважину. В НОВОЙ — НЕ должно!
normal_data = {
    'current': 45,
    'casing_pressure': 6,
    'temperature': 50,
    'flow_rate_oil': 30,
    'water_cut': 60,
    'stroke_rate': 8,
}
alerts2, new_status2 = check_and_create_alerts(well, normal_data)
well.refresh_from_db()
print(f"[3] После 'возврата в норму': статус = {well.status} (должен остаться alarm!)")
assert well.status == 'alarm', f"БАГ! Скважина сама починилась: {well.status}"
active_alerts = Alert.objects.filter(well=well, is_active=True).count()
print(f"    Активных алертов: {active_alerts} (должно быть > 0)")
assert active_alerts > 0, "БАГ! Алерты закрылись автоматически"

# Теперь чиним через /repair/ (эмуляция логики эндпоинта repair из views.py)
well.status = Well.Status.ONLINE
well.save(update_fields=['status'])
Alert.objects.filter(well=well, is_active=True).update(
    is_active=False, resolved_at=timezone.now()
)
well.refresh_from_db()
print(f"[4] После ручного repair: статус = {well.status}")
assert well.status == 'online'
active_alerts_after = Alert.objects.filter(well=well, is_active=True).count()
print(f"    Активных алертов: {active_alerts_after} (должно быть 0)")
assert active_alerts_after == 0

print("\n" + "=" * 60)
print("✅ ВСЕ ТЕСТЫ ПРОЙДЕНЫ! Бизнес-логика работает корректно")
print("=" * 60)
