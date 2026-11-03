from datetime import timedelta
from django.utils import timezone
from wells.models import Well, TelemetryData, Alert
import numpy as np


def get_incident_data(well_id, alert_timestamp):
    """Получить данные для расследования инцидента"""
    well = Well.objects.get(id=well_id)

    start_time = alert_timestamp - timedelta(hours=24)
    end_time = alert_timestamp

    telemetry_24h = list(TelemetryData.objects.filter(
        well=well,
        timestamp__range=(start_time, end_time)
    ).order_by('timestamp').values())

    alerts_24h = list(Alert.objects.filter(
        well=well,
        created_at__range=(start_time, end_time)
    ).order_by('created_at').values())

    # ПРОРЕЖИВАНИЕ (downsampling): если записей больше 300, берем каждую N-ю точку,
    # чтобы график в модалке расследования не вешал браузер тысячами точек.
    # Аномалии (detect_anomalies) считаем по ПОЛНЫМ данным ДО прореживания.
    anomalies = detect_anomalies(telemetry_24h)

    original_count = len(telemetry_24h)
    if len(telemetry_24h) > 300:
        step = len(telemetry_24h) // 300
        telemetry_24h = telemetry_24h[::step]
        print(f"✅ Downsampled telemetry: {len(telemetry_24h)} points (was {original_count})")

    return {
        'well': {
            'id': well.id,
            'number': well.number,
            'cdng': well.cdng,
            'pump_type': well.pump_type,
            'status': well.status
        },
        'telemetry_24h': telemetry_24h,
        'alerts_24h': alerts_24h,
        'anomalies': anomalies
    }


def detect_anomalies(telemetry_data, threshold_z=2.0, merge_minutes=10):
    """
    Обнаружение аномалий (z-score > threshold_z) с группировкой в интервалы.

    Вместо возврата 300+ отдельных точек возвращает список событий (интервалов):
    две аномальные точки склеиваются в одно событие, если между ними <= merge_minutes.

    Формат события:
    {
        'parameter': 'current',
        'start_time': datetime,   # ISO при сериализации JSON
        'end_time': datetime,
        'duration_minutes': 5.0,
        'min_value': 0.0,
        'max_value': 12.5,
        'count': 15,
        'z_score_max': 3.42,
        'mean': float, 'std': float,
    }
    """
    if len(telemetry_data) < 5:
        return []

    events = []
    parameters = ['current', 'casing_pressure', 'temperature', 'flow_rate_oil', 'water_cut']

    for param in parameters:
        values = [record[param] for record in telemetry_data if record.get(param) is not None]
        if len(values) < 5:
            continue

        mean_val = np.mean(values)
        std_val = np.std(values)

        if std_val == 0:
            continue

        # 1. Находим все аномальные точки по параметру
        anomaly_points = []
        for record in telemetry_data:
            value = record.get(param)
            if value is None:
                continue
            z_score = abs((value - mean_val) / std_val)
            if z_score > threshold_z:
                anomaly_points.append({
                    'timestamp': record['timestamp'],
                    'value': value,
                    'z_score': float(z_score),
                })

        if not anomaly_points:
            continue

        # Сортируем по времени
        anomaly_points.sort(key=lambda x: x['timestamp'])

        # 2. ГРУППИРУЕМ аномалии в интервалы (события)
        current_group = []
        for point in anomaly_points:
            if not current_group:
                current_group.append(point)
            else:
                last_time = current_group[-1]['timestamp']
                time_diff = (point['timestamp'] - last_time).total_seconds() / 60
                if time_diff <= merge_minutes:
                    current_group.append(point)
                else:
                    events.append(_create_event(param, current_group, mean_val, std_val))
                    current_group = [point]

        if current_group:
            events.append(_create_event(param, current_group, mean_val, std_val))

    # События сортируем по времени начала для удобства фронтенда
    events.sort(key=lambda e: e['start_time'])
    return events


def _create_event(parameter, group, mean_val, std_val):
    """Создаёт событие (интервал) из группы аномальных точек."""
    start_time = group[0]['timestamp']
    end_time = group[-1]['timestamp']
    duration = (end_time - start_time).total_seconds() / 60

    return {
        'parameter': parameter,
        'start_time': start_time,
        'end_time': end_time,
        'duration_minutes': round(duration, 1),
        'min_value': min(p['value'] for p in group),
        'max_value': max(p['value'] for p in group),
        'count': len(group),
        'z_score_max': max(p['z_score'] for p in group),
        'mean': float(mean_val),
        'std': float(std_val),
    }
