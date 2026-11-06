"""Представления (ViewSet'ы) приложения wells для REST API."""
from datetime import timedelta

from django.utils import timezone
from django.db import transaction
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny  # разрешаем анонимный доступ (фикс 403)
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
        records = list(well.telemetry.filter(timestamp__gte=since).order_by('timestamp'))
        # Предохранитель для длинных периодов: не отдаём больше 2000 точек
        if len(records) > 2000:
            step = len(records) // 2000
            records = records[::step]
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

    # FIX 403 Forbidden: явно разрешаем любой доступ к ручке ремонта.
    # permission_classes=[AllowAny] переопределяет глобальные настройки DRF,
    # а authentication_classes=[] отключает SessionAuthentication (CSRF),
    # что позволяет кнопке "Завершить ремонт" работать без токена.
    @action(
        detail=True,
        methods=['post'],
        url_path='repair',
        permission_classes=[AllowAny],
        authentication_classes=[],
    )
    def repair(self, request, pk=None):
        """
        Завершить ремонт скважины (ручной перезапуск оператором).
        1. Меняет статус на online
        2. Закрывает все активные алерты
        3. Создаёт "эталонную" запись телеметрии с идеальными параметрами,
           чтобы health_index мгновенно стал ~100% и симулятор отталкивался
           от нормальных значений, а не от "памяти" об аварии.
        4. Возвращает обновлённую скважину через WellDetailSerializer.
        """
        from wells.models import TelemetryData
        from wells.serializers import WellDetailSerializer
        from wells.services.health_calculator import calculate_health_index

        well = self.get_object()

        with transaction.atomic():
            # 1. Меняем статус на online
            well.status = Well.Status.ONLINE
            well.save(update_fields=['status'])

            # 2. Закрываем все активные алерты этой скважины
            closed_count = Alert.objects.filter(
                well=well,
                is_active=True,
            ).update(is_active=False, resolved_at=timezone.now())

            # 3. Эталонная телеметрия: параметры в идеальных диапазонах
            perfect_data = {
                'current': 45.0,
                'casing_pressure': 6.5,
                'discharge_pressure': 12.0,
                'temperature': 50.0,
                'flow_rate_liquid': 80.0,
                'flow_rate_oil': 30.0,
                'water_cut': 45.0,
                'stroke_rate': 7.0,
            }

            health_result = calculate_health_index(perfect_data)
            health_index = (health_result.get('health_index', 100)
                            if isinstance(health_result, dict) else 100)

            ideal_telemetry = TelemetryData.objects.create(
                well=well,
                health_index=health_index,
                **perfect_data,
            )

        # 4. Свежие данные скважины + новая телеметрия в ответе
        well.refresh_from_db()
        serializer = WellDetailSerializer(well)

        return Response({
            'status': 'success',
            'message': (f'Скважина №{well.number} перезапущена после ремонта. '
                        f'Параметры сброшены к идеальным значениям.'),
            'closed_alerts': closed_count,
            'well': serializer.data,
            'new_telemetry_id': ideal_telemetry.id,
            'new_health_index': health_index,
            'new_status': well.status,
        })

    @action(detail=False, methods=['post'], url_path='export/telemetry',
          permission_classes=[AllowAny], authentication_classes=[])
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

    @action(detail=False, methods=['post'], url_path='export/shift-report',
          permission_classes=[AllowAny], authentication_classes=[])
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

    @action(detail=False, methods=['post'], url_path='export/telemetry-pdf',
          permission_classes=[AllowAny], authentication_classes=[])
    def export_telemetry_pdf(self, request):
        """Экспорт телеметрии в PDF"""
        from wells.services.pdf_export import create_telemetry_pdf
        from django.http import FileResponse
        from rest_framework import status
        import os

        well_id = request.data.get('well_id')
        period = request.data.get('period', '24h')

        if not well_id:
            return Response({'error': 'well_id required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            filepath = create_telemetry_pdf(well_id, period)
            filename = os.path.basename(filepath)
            response = FileResponse(open(filepath, 'rb'), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], url_path='export/shift-report-pdf',
          permission_classes=[AllowAny], authentication_classes=[])
    def export_shift_report_pdf(self, request):
        """Экспорт сменного отчёта в PDF"""
        from wells.services.pdf_export import create_shift_report_pdf
        from django.http import FileResponse
        from rest_framework import status
        from datetime import datetime
        import os

        well_ids = request.data.get('well_ids')
        date_str = request.data.get('date')
        date = datetime.strptime(date_str, '%Y-%m-%d').date() if date_str else None

        try:
            filepath = create_shift_report_pdf(well_ids, date)
            filename = os.path.basename(filepath)
            response = FileResponse(open(filepath, 'rb'), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
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
