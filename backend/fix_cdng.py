"""Одноразовый скрипт: распределение существующих скважин по ЦДНГ."""
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()
from wells.models import Well

# СНАЧАЛА проверим тип поля и что скважины существуют
first_well = Well.objects.first()
if not first_well:
    print("❌ Нет скважин в БД!")
    exit(1)

print(f"Тип поля number: {type(first_well.number).__name__}")
print(f"Пример значения: {first_well.number}")

# Определяем тип (строка или число)
is_string = isinstance(first_well.number, str)

# Обновляем ЦДНГ
if is_string:
    Well.objects.filter(number__in=['101','102','103','104']).update(cdng='ЦДНГ-1')
    Well.objects.filter(number__in=['105','106','107']).update(cdng='ЦДНГ-2')
    Well.objects.filter(number__in=['108','109','110']).update(cdng='ЦДНГ-3')
else:
    Well.objects.filter(number__in=[101,102,103,104]).update(cdng='ЦДНГ-1')
    Well.objects.filter(number__in=[105,106,107]).update(cdng='ЦДНГ-2')
    Well.objects.filter(number__in=[108,109,110]).update(cdng='ЦДНГ-3')

# Проверяем результат
for cdng in ['ЦДНГ-1', 'ЦДНГ-2', 'ЦДНГ-3']:
    count = Well.objects.filter(cdng=cdng).count()
    print(f"{cdng}: {count} скважин")

print("✅ ЦДНГ обновлены!")
