#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Автоматическая проверка работоспособности бэкенда проекта "Цифровое месторождение".

Запуск из папки backend/:
    python test_system.py
"""

import os
import sys
import time
import json
import subprocess
from datetime import datetime, timedelta

# --- Инициализация Django вне manage.py ---
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

import django  # noqa: E402
django.setup()

try:
    import requests  # noqa: E402
except ImportError:
    print("ПРЕДУПРЕЖДЕНИЕ: модуль 'requests' не найден. Установите: pip install requests")
    requests = None

from wells.models import Well, TelemetryData, Alert, TrainingTip  # noqa: E402


# ---------------------------------------------------------------------------
# Вспомогательные функции
# ---------------------------------------------------------------------------

def _ok(msg):
    print(f"  ✅ {msg}")


def _fail(msg):
    print(f"  ❌ {msg}")


def _make_normal_telemetry():
    """Тестовые данные с нормальными значениями."""
    return {
        'current': 45.0,
        'casing_pressure': 6.0,
        'temperature': 50.0,
        'flow_rate_oil': 30.0,
        'water_cut': 45.0,
        'stroke_rate': 7.0,
    }


def _make_critical_telemetry():
    """Тестовые данные с критическими значениями."""
    return {
        'current': 0.0,          # обрыв штанг
        'casing_pressure': 18.0,  # превышение
        'temperature': 98.0,      # перегрев
        'flow_rate_oil': 0.0,     # нет дебита
        'water_cut': 99.0,        # почти вода
        'stroke_rate': 14.0,      # слишком быстро
    }


# ---------------------------------------------------------------------------
# ТЕСТ 1: Модели базы данных
# ---------------------------------------------------------------------------

def test_models():
    print("\n[1/5] Проверка моделей базы данных...")

    wells_count = Well.objects.count()
    if wells_count == 10:
        _ok(f"Количество скважин: {wells_count} (ожидалось 10)")
    else:
        _fail(f"Количество скважин: {wells_count}, ожидалось 10")
        return False

    tips_count = TrainingTip.objects.count()
    if tips_count == 5:
        _ok(f"Количество обучающих подсказок: {tips_count} (ожидалось 5)")
    else:
        _fail(f"Количество обучающих подсказок: {tips_count}, ожидалось 5")
        return False

    telemetry_count = TelemetryData.objects.count()
    if telemetry_count > 0:
        _ok(f"Записей телеметрии: {telemetry_count}")
    else:
        _fail("Нет записей телеметрии в базе")
        return False

    # Проверка структуры моделей (существование полей)
    well_fields = ['number', 'cdng', 'well_type', 'pump_type', 'status',
                   'commission_date', 'latitude', 'longitude', 'is_active',
                   'created_at', 'updated_at']
    missing = [f for f in well_fields if not hasattr(Well, f)]
    if missing:
        _fail(f"У модели Well отсутствуют поля: {missing}")
        return False
    _ok(f"Структура модели Well корректна ({len(well_fields)} полей)")

    tele_fields = ['well', 'timestamp', 'current', 'casing_pressure',
                   'discharge_pressure', 'temperature', 'flow_rate_liquid',
                   'flow_rate_oil', 'water_cut', 'stroke_rate', 'health_index']
    missing = [f for f in tele_fields if not hasattr(TelemetryData, f)]
    if missing:
        _fail(f"У модели TelemetryData отсутствуют поля: {missing}")
        return False
    _ok(f"Структура модели TelemetryData корректна ({len(tele_fields)} полей)")

    alert_fields = ['well', 'alert_type', 'parameter', 'message', 'value',
                    'threshold', 'is_active', 'created_at', 'resolved_at']
    missing = [f for f in alert_fields if not hasattr(Alert, f)]
    if missing:
        _fail(f"У модели Alert отсутствуют поля: {missing}")
        return False
    _ok(f"Структура модели Alert корректна ({len(alert_fields)} полей)")

    tip_fields = ['parameter', 'title', 'normal_range', 'description',
                  'danger_signs', 'actions']
    missing = [f for f in tip_fields if not hasattr(TrainingTip, f)]
    if missing:
        _fail(f"У модели TrainingTip отсутствуют поля: {missing}")
        return False
    _ok(f"Структура модели TrainingTip корректна ({len(tip_fields)} полей)")

    return True


# ---------------------------------------------------------------------------
# ТЕСТ 2: Расчёт индекса здоровья
# ---------------------------------------------------------------------------

def test_health_calculator():
    print("\n[2/5] Проверка расчёта индекса здоровья...")

    try:
        from wells.services.health_calculator import calculate_health_index
    except Exception as e:
        _fail(f"Не удалось импортировать calculate_health_index: {e}")
        return False

    ok = True

    # Нормальные значения
    result = calculate_health_index(_make_normal_telemetry())
    hi = result['health_index']
    if 90 <= hi <= 100:
        _ok(f"Нормальные значения -> health_index = {hi} (статус: {result['status']})")
    else:
        _fail(f"Нормальные значения -> health_index = {hi}, ожидалось 90-100")
        ok = False

    if not isinstance(result.get('parameter_scores'), dict):
        _fail("В ответе отсутствует словарь parameter_scores")
        ok = False
    else:
        _ok(f"parameter_scores содержит {len(result['parameter_scores'])} параметров")

    # Критические значения
    result_crit = calculate_health_index(_make_critical_telemetry())
    hi_crit = result_crit['health_index']
    if hi_crit < 30:
        _ok(f"Критические значения -> health_index = {hi_crit} (статус: {result_crit['status']})")
    else:
        _fail(f"Критические значения -> health_index = {hi_crit}, ожидалось < 30")
        ok = False

    return ok


# ---------------------------------------------------------------------------
# ТЕСТ 3: Генерация алертов
# ---------------------------------------------------------------------------

def test_alert_generator():
    print("\n[3/5] Проверка генерации алертов...")

    try:
        from wells.services.alert_generator import check_and_create_alerts
    except Exception as e:
        _fail(f"Не удалось импортировать check_and_create_alerts: {e}")
        return False

    well = Well.objects.filter(is_active=True).first()
    if well is None:
        _fail("Нет активных скважин для теста алертов")
        return False

    alerts_before = Alert.objects.filter(well=well, is_active=True).count()

    created_alerts, new_status = check_and_create_alerts(well, _make_critical_telemetry())

    ok = True
    if len(created_alerts) > 0:
        _ok(f"При критических значениях создано алертов: {len(created_alerts)}")
    else:
        _fail("При критических значениях алерты НЕ созданы")
        ok = False

    types = {a.alert_type for a in created_alerts}
    if 'critical' in types:
        _ok("Созданы алерты типа 'critical'")
    else:
        _fail("Не найдены алерты типа 'critical'")
        ok = False

    if new_status in ('alarm', 'critical'):
        _ok(f"Статус скважины обновлён: '{new_status}'")
    else:
        _fail(f"Ожидался статус alarm/critical, получен: '{new_status}'")
        ok = False

    # Возврат к норме — алерты должны закрыться, статус вернуться в online
    created_ok, restored_status = check_and_create_alerts(well, _make_normal_telemetry())
    active_after = Alert.objects.filter(well=well, is_active=True).count()
    if active_after == 0 and restored_status == 'online':
        _ok("После возврата к норме активные алерты закрыты, статус: 'online'")
    else:
        _fail(f"После возврата к норме: активных алертов {active_after}, статус '{restored_status}'")
        ok = False

    return ok


# ---------------------------------------------------------------------------
# ТЕСТ 4: API эндпоинты
# ---------------------------------------------------------------------------

def test_api_endpoints():
    print("\n[4/5] Проверка REST API эндпоинтов...")

    if requests is None:
        _fail("Модуль 'requests' не установлен, невозможно проверить API")
        return False

    # Запуск development server в отдельном процессе
    server_proc = subprocess.Popen(
        [sys.executable, 'manage.py', 'runserver', '127.0.0.1:8000', '--noreload'],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    time.sleep(3)  # ждём запуска сервера

    ok = True
    try:
        endpoints = [
            '/api/wells/',
            '/api/alerts/',
            '/api/training-tips/',
        ]
        wells_data = None
        for ep in endpoints:
            url = f'http://localhost:8000{ep}'
            try:
                resp = requests.get(url, timeout=10)
            except Exception as e:
                _fail(f"{ep}: запрос не выполнен ({e})")
                ok = False
                continue

            if resp.status_code != 200:
                _fail(f"{ep}: статус-код {resp.status_code}, ожидалось 200")
                ok = False
                continue

            try:
                data = resp.json()
            except (json.JSONDecodeError, ValueError) as e:
                _fail(f"{ep}: ответ не является валидным JSON ({e})")
                ok = False
                continue

            # Проверка структуры пагинации DRF
            if 'results' not in data or 'count' not in data:
                _fail(f"{ep}: в ответе отсутствуют поля 'results'/'count' (пагинация)")
                ok = False
                continue

            _ok(f"{ep}: 200 OK, JSON валиден, count={data['count']}")

            if ep == '/api/wells/':
                wells_data = data

        # Телеметрия по первой доступной скважине
        if wells_data and wells_data['results']:
            well_id = wells_data['results'][0]['id']
            url = f'http://localhost:8000/api/wells/{well_id}/telemetry/?period=24h'
            try:
                resp = requests.get(url, timeout=10)
                if resp.status_code == 200:
                    payload = resp.json()
                    count = len(payload) if isinstance(payload, list) else payload.get('count', 0)
                    _ok(f"/api/wells/{well_id}/telemetry/?period=24h: 200 OK, записей: {count}")
                else:
                    _fail(f"/api/wells/{well_id}/telemetry/: статус-код {resp.status_code}")
                    ok = False
            except Exception as e:
                _fail(f"/api/wells/{well_id}/telemetry/: запрос не выполнен ({e})")
                ok = False
        else:
            _fail("Список скважин пуст — невозможно проверить эндпоинт телеметрии")
            ok = False
    finally:
        server_proc.terminate()
        try:
            server_proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server_proc.kill()
        print("  Development server остановлен.")

    return ok


# ---------------------------------------------------------------------------
# ТЕСТ 5: Симулятор телеметрии
# ---------------------------------------------------------------------------

def test_simulator():
    print("\n[5/5] Проверка симулятора телеметрии...")

    count_before = TelemetryData.objects.count()

    result = subprocess.run(
        [sys.executable, 'manage.py', 'simulate_once'],
        capture_output=True, text=True,
    )

    if result.returncode != 0:
        _fail(f"Команда simulate_once завершилась с кодом {result.returncode}")
        print(result.stderr[-1000:] if result.stderr else result.stdout[-1000:])
        return False

    count_after = TelemetryData.objects.count()
    if count_after > count_before:
        _ok(f"simulate_once отработал успешно (код 0), записей телеметрии: "
            f"{count_before} -> {count_after} (+{count_after - count_before})")
        return True

    _fail(f"Количество записей телеметрии не увеличилось ({count_before} -> {count_after})")
    return False


# ---------------------------------------------------------------------------
# Итоговый отчёт
# ---------------------------------------------------------------------------

def run_all_tests():
    tests = [
        ('Модели базы данных', test_models),
        ('Расчёт индекса здоровья', test_health_calculator),
        ('Генерация алертов', test_alert_generator),
        ('API эндпоинты', test_api_endpoints),
        ('Симулятор телеметрии', test_simulator),
    ]

    results = {}
    for name, func in tests:
        try:
            results[name] = func()
        except Exception as e:
            _fail(f"Исключение при выполнении теста '{name}': {e}")
            results[name] = False

    print("\n====================")
    print("ОТЧЁТ О ТЕСТИРОВАНИИ")
    print("====================")
    all_passed = True
    for name, passed in results.items():
        status = 'OK' if passed else 'ПРОВАЛЕН'
        icon = '✅' if passed else '❌'
        print(f"{icon} {name}: {status}")
        if not passed:
            all_passed = False
    print("====================")
    if all_passed:
        print("ВСЕ ТЕСТЫ ПРОЙДЕНЫ")
    else:
        failed = [n for n, p in results.items() if not p]
        print(f"ПРОВАЛЕНЫ ТЕСТЫ: {', '.join(failed)}")
    print("====================")

    return all_passed


if __name__ == '__main__':
    success = run_all_tests()
    sys.exit(0 if success else 1)
