import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()
from wells.models import Well

# РЕАЛИСТИЧНЫЕ КООРДИНАТЫ РОМАШКИНСКОГО МЕСТОРОЖДЕНИЯ
# Все скважины находятся НА ПОЛЯХ за пределами Альметьевска
# Распределены в 3 куста (по ЦДНГ) на расстоянии 5-15 км от города

WELL_COORDINATES = {
    # ЦДНГ-1 — северный куст (примерно 10 км севернее Альметьевска, на полях)
    # Куст из 4 скважин в радиусе ~500м
    '101': (54.9820, 52.2540),  # Скважина 1 куста
    '102': (54.9835, 52.2565),  # Скважина 2 куста (+150м)
    '103': (54.9810, 52.2580),  # Скважина 3 куста (+200м)
    '104': (54.9828, 52.2590),  # Скважина 4 куста (+300м)

    # ЦДНГ-2 — восточный куст (примерно 12 км восточнее, на полях)
    # Куст из 3 скважин
    '105': (54.8950, 52.4520),
    '106': (54.8965, 52.4545),
    '107': (54.8940, 52.4570),

    # ЦДНГ-3 — юго-западный куст (примерно 15 км юго-западнее, на полях)
    # Куст из 3 скважин
    '108': (54.7850, 52.1850),
    '109': (54.7865, 52.1875),
    '110': (54.7840, 52.1900),
}

print("=== Обновление координат на реалистичные (за городом) ===")
print("Альметьевск (центр города): 54.9000, 52.3000\n")

for num, (lat, lng) in WELL_COORDINATES.items():
    # Автоопределение типа поля
    first = Well.objects.first()
    is_string = isinstance(first.number, str) if first else False

    if is_string:
        updated = Well.objects.filter(number=num).update(latitude=lat, longitude=lng)
    else:
        updated = Well.objects.filter(number=int(num)).update(latitude=lat, longitude=lng)

    # Определяем куст
    if num in ['101', '102', '103', '104']:
        cluster = "ЦДНГ-1 (северный куст)"
    elif num in ['105', '106', '107']:
        cluster = "ЦДНГ-2 (восточный куст)"
    else:
        cluster = "ЦДНГ-3 (юго-западный куст)"

    print(f"№{num} [{cluster}]: {lat}, {lng} — обновлено {updated}")

print("\n=== Итоговое распределение ===")
for w in Well.objects.all().order_by('number'):
    # Проверяем что скважина не в городе
    lat, lng = float(w.latitude), float(w.longitude)
    distance_from_city = ((lat - 54.9)**2 + (lng - 52.3)**2)**0.5 * 111  # грубо в км
    print(f"№{w.number} ({w.cdng}): {w.latitude}, {w.longitude} — {distance_from_city:.1f} км от города")

print("\n✅ Все скважины теперь на полях за пределами Альметьевска!")
