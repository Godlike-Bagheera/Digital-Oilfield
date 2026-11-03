# Жёсткое обновление распределения скважин по ЦДНГ в БД
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()
from wells.models import Well

print("=== ДО ИЗМЕНЕНИЙ ===")
for cdng in Well.objects.values_list('cdng', flat=True).distinct():
    count = Well.objects.filter(cdng=cdng).count()
    print(f"  {cdng}: {count} скважин")

# Определяем тип поля number (строка или число)
first = Well.objects.first()
if not first:
    print("❌ Нет скважин в БД! Запусти create_test_data")
    exit(1)

is_string = isinstance(first.number, str)
print(f"\nТип поля number: {'строка' if is_string else 'число'}")

# Обновляем
if is_string:
    Well.objects.filter(number__in=['101','102','103','104']).update(cdng='ЦДНГ-1')
    Well.objects.filter(number__in=['105','106','107']).update(cdng='ЦДНГ-2')
    Well.objects.filter(number__in=['108','109','110']).update(cdng='ЦДНГ-3')
else:
    Well.objects.filter(number__in=[101,102,103,104]).update(cdng='ЦДНГ-1')
    Well.objects.filter(number__in=[105,106,107]).update(cdng='ЦДНГ-2')
    Well.objects.filter(number__in=[108,109,110]).update(cdng='ЦДНГ-3')

print("\n=== ПОСЛЕ ИЗМЕНЕНИЙ ===")
for cdng in ['ЦДНГ-1', 'ЦДНГ-2', 'ЦДНГ-3']:
    count = Well.objects.filter(cdng=cdng).count()
    print(f"  {cdng}: {count} скважин")
print("✅ Готово!")
