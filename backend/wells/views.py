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

    @action(detail=True, methods=['get'], url_path='investigate')
    def investigate(self, request, pk=None):
        """Эндпоинт для расследования инцидента"""
        from wells.services.incident_investigation import get_incident_data
        from rest_framework.response import Response
        from rest_framework import status
        from wells.models import Alert

        well = self.get_object()
        alert_id = request.query_params.get('alert_id')

        if not alert_id:
            last_alert = Alert.objects.filter(well=well).order_by('-created_at').first()
            if not last_alert:
                return Response({'error': 'No alerts found'}, status=status.HTTP_404_NOT_FOUND)
            alert_timestamp = last_alert.created_at
        else:
            try:
                alert = Alert.objects.get(id=alert_id, well=well)
                alert_timestamp = alert.created_at
            except Alert.DoesNotExist:
                return Response({'error': 'Alert not found'}, status=status.HTTP_404_NOT_FOUND)

        incident_data = get_incident_data(well.id, alert_timestamp)
        return Response(incident_data)

    @action(detail=False, methods=['post'], url_path='export/telemetry')
    def export_telemetry(self, request):
        """Экспорт телеметрии в Excel"""
        from wells.services.excel_export import export_telemetry_to_excel
        from django.http import FileResponse
        from rest_framework import status
        import os

        well_id = request.data.get('well_id')
        period = request.data.get('period', '24h')

        if not well_id:
            return Response({'error': 'well_id required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            filepath = export_telemetry_to_excel(well_id, period)
            filename = os.path.basename(filepath)
            response = FileResponse(open(filepath, 'rb'), as_attachment=True, filename=filename)
            return response
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], url_path='export/shift-report')
    def export_shift_report(self, request):
        """Экспорт сменного отчёта"""
        from wells.services.excel_export import export_shift_report_to_excel
        from django.http import FileResponse
        from datetime import datetime
        from rest_framework import status
        import os

        well_ids = request.data.get('well_ids')
        date_str = request.data.get('date')

        date = datetime.strptime(date_str, '%Y-%m-%d').date() if date_str else None

        try:
            filepath = export_shift_report_to_excel(well_ids, date)
            filename = os.path.basename(filepath)
            response = FileResponse(open(filepath, 'rb'), as_attachment=True, filename=filename)
            return response
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
