import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()
from wells.models import Well

# РЕАЛИСТИЧНЫЕ КООРДИНАТЫ - ВСЕ СКВАЖИНЫ НА ПОЛЯХ ЗА ГОРОДОМ
# ЦДНГ-1 — северный куст (10 км севернее Альметьевска)
# ЦДНГ-2 — восточный куст (12 км восточнее)
# ЦДНГ-3 — юго-западный куст (15 км юго-западнее)

WELL_COORDINATES = {
    '101': (54.9820, 52.2540), '102': (54.9835, 52.2565),
    '103': (54.9810, 52.2580), '104': (54.9828, 52.2590),
    '105': (54.8950, 52.4520), '106': (54.8965, 52.4545),
    '107': (54.8940, 52.4570), '108': (54.7850, 52.1850),
    '109': (54.7865, 52.1875), '110': (54.7840, 52.1900),
}

print("=== Обновление координат ===")
first = Well.objects.first()
is_string = isinstance(first.number, str) if first else False

for num, (lat, lng) in WELL_COORDINATES.items():
    if is_string:
        updated = Well.objects.filter(number=num).update(latitude=lat, longitude=lng)
    else:
        updated = Well.objects.filter(number=int(num)).update(latitude=lat, longitude=lng)
    print(f"№{num}: обновлено {updated}")

print("\n=== Итоговые координаты ===")
for w in Well.objects.all().order_by('number'):
    print(f"№{w.number}: {w.latitude}, {w.longitude}")
