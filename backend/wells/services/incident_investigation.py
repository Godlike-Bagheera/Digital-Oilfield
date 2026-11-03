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

    anomalies = detect_anomalies(telemetry_24h)

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


def detect_anomalies(telemetry_data):
    """Обнаружение аномалий в телеметрических данных (z-score > 2)"""
    if len(telemetry_data) < 5:
        return []

    anomalies = []
    parameters = ['current', 'casing_pressure', 'temperature', 'flow_rate_oil', 'water_cut']

    for param in parameters:
        values = [record[param] for record in telemetry_data if record.get(param) is not None]
        if len(values) < 5:
            continue

        mean_val = np.mean(values)
        std_val = np.std(values)

        if std_val == 0:
            continue

        for record in telemetry_data:
            value = record.get(param)
            if value is None:
                continue

            z_score = abs((value - mean_val) / std_val)

            if z_score > 2:
                anomalies.append({
                    'timestamp': record['timestamp'],
                    'parameter': param,
                    'value': value,
                    'mean': float(mean_val),
                    'std': float(std_val),
                    'z_score': float(z_score)
                })

    return anomalies
