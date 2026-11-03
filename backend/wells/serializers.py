"""Сериализаторы приложения wells для REST API."""
from rest_framework import serializers

from wells.models import Alert, TelemetryData, TrainingTip, Well


class TrainingTipSerializer(serializers.ModelSerializer):
    """Обучающие подсказки (полный набор полей)."""

    class Meta:
        model = TrainingTip
        fields = '__all__'


class WellMinimalSerializer(serializers.ModelSerializer):
    """Минимальное представление скважины для вложенных объектов."""

    class Meta:
        model = Well
        fields = ['id', 'number', 'cdng']


class TelemetryDataSerializer(serializers.ModelSerializer):
    """Запись телеметрии. timestamp отдаётся в ISO 8601 (строка)."""

    timestamp = serializers.DateTimeField(format='iso-8601')

    class Meta:
        model = TelemetryData
        fields = [
            'id', 'timestamp', 'current', 'casing_pressure',
            'discharge_pressure', 'temperature', 'flow_rate_liquid',
            'flow_rate_oil', 'water_cut', 'stroke_rate', 'health_index',
        ]


class AlertSerializer(serializers.ModelSerializer):
    """Алерт со вложенной информацией о скважине."""

    well = WellMinimalSerializer(read_only=True)

    class Meta:
        model = Alert
        fields = [
            'id', 'well', 'alert_type', 'parameter', 'message', 'value',
            'threshold', 'is_active', 'created_at', 'resolved_at',
        ]


class WellListSerializer(serializers.ModelSerializer):
    """Скважина для главного дашборда + последняя телеметрия."""

    latest_telemetry = serializers.SerializerMethodField()

    class Meta:
        model = Well
        fields = [
            'id', 'number', 'cdng', 'well_type', 'pump_type', 'status',
            'is_active', 'latest_telemetry',
        ]

    def get_latest_telemetry(self, obj):
        # N+1 фикс: используем property latest_telemetry с явным
        # order_by('-timestamp').first() (ORDER BY ... LIMIT 1 — один запрос)
        latest = obj.latest_telemetry
        if latest is None:
            return None
        return TelemetryDataSerializer(latest).data


class WellDetailSerializer(serializers.ModelSerializer):
    """Детальное представление скважины: все поля модели + последняя телеметрия."""

    latest_telemetry = serializers.SerializerMethodField()

    class Meta:
        model = Well
        fields = '__all__'

    def get_latest_telemetry(self, obj):
        latest = obj.latest_telemetry
        if latest is None:
            return None
        return TelemetryDataSerializer(latest).data
