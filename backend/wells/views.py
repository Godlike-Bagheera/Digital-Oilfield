"""Представления (ViewSet'ы) приложения wells для REST API."""
from datetime import timedelta

from django.utils import timezone
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet

from wells.models import Alert, TrainingTip, Well
from wells.serializers import (
    AlertSerializer,
    TelemetryDataSerializer,
    TrainingTipSerializer,
    WellDetailSerializer,
    WellListSerializer,
)

PERIOD_MAP = {
    '1h': timedelta(hours=1),
    '6h': timedelta(hours=6),
    '24h': timedelta(hours=24),
    '7d': timedelta(days=7),
}


class WellViewSet(ModelViewSet):
    """Скважины: список с последней телеметрией, детали, графики и алерты."""

    queryset = Well.objects.filter(is_active=True).order_by('number')

    def get_serializer_class(self):
        if self.action == 'list':
            return WellListSerializer
        return WellDetailSerializer

    @action(detail=True, methods=['get'], url_path='telemetry')
    def telemetry(self, request, pk=None):
        """История телеметрии скважины за период (?period=1h|6h|24h|7d)."""
        well = self.get_object()
        period = request.query_params.get('period', '24h')
        delta = PERIOD_MAP.get(period, PERIOD_MAP['24h'])
        since = timezone.now() - delta
        records = (
            well.telemetry.filter(timestamp__gte=since)
            .order_by('-timestamp')
        )
        serializer = TelemetryDataSerializer(records, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='alerts')
    def alerts(self, request, pk=None):
        """Все алерты скважины, отсортированные по времени создания."""
        well = self.get_object()
        alerts = well.alerts.order_by('-created_at')
        serializer = AlertSerializer(alerts, many=True)
        return Response(serializer.data)


class AlertViewSet(ModelViewSet):
    """Алерты с фильтрацией ?is_active=true|false и ?well=<id>."""

    queryset = Alert.objects.order_by('-created_at')
    serializer_class = AlertSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() in ('true', '1'))
        well_id = self.request.query_params.get('well')
        if well_id is not None:
            qs = qs.filter(well_id=well_id)
        return qs


class TrainingTipViewSet(ReadOnlyModelViewSet):
    """Обучающие подсказки (только чтение)."""

    queryset = TrainingTip.objects.all()
    serializer_class = TrainingTipSerializer
