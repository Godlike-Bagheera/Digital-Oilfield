import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()
from wells.models import Well

COORDS = {
    '101': (54.9050, 52.2950), '102': (54.9080, 52.2980),
    '103': (54.9030, 52.3020), '104': (54.9070, 52.3050),
    '105': (54.9150, 52.2850), '106': (54.9180, 52.2880),
    '107': (54.9130, 52.2920), '108': (54.8850, 52.3150),
    '109': (54.8880, 52.3180), '110': (54.8830, 52.3220),
}

print("=== Обновление координат ===")
first = Well.objects.first()
is_string = isinstance(first.number, str) if first else False

for num, (lat, lng) in COORDS.items():
    if is_string:
        updated = Well.objects.filter(number=num).update(latitude=lat, longitude=lng)
    else:
        updated = Well.objects.filter(number=int(num)).update(latitude=lat, longitude=lng)
    print(f"№{num}: обновлено {updated}")

print("\n=== Итоговые координаты ===")
for w in Well.objects.all().order_by('number'):
    print(f"№{w.number} ({w.cdng}): {w.latitude}, {w.longitude}")
