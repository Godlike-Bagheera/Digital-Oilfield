import os

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill
from django.utils import timezone
from datetime import timedelta
from wells.models import Well, TelemetryData, Alert


def export_telemetry_to_excel(well_id, period='24h'):
    """Экспорт телеметрии скважины в Excel"""
    well = Well.objects.get(id=well_id)

    now = timezone.now()
    periods = {
        '1h': timedelta(hours=1),
        '6h': timedelta(hours=6),
        '24h': timedelta(hours=24),
        '7d': timedelta(days=7)
    }
    delta = periods.get(period, timedelta(hours=24))
    start_time = now - delta

    telemetry = TelemetryData.objects.filter(
        well=well,
        timestamp__gte=start_time
    ).order_by('timestamp')

    wb = Workbook()
    ws = wb.active
    ws.title = "Телеметрия"

    ws['A1'] = f"Скважина №{well.number}"
    ws['A1'].font = Font(size=14, bold=True)
    ws['A2'] = f"ЦДНГ: {well.cdng}"
    ws['A3'] = f"Период: {period}"
    ws['A4'] = f"Дата экспорта: {now.strftime('%Y-%m-%d %H:%M')}"

    headers = ['Время', 'Ток (А)', 'Давление затрубное (МПа)', 'Давление нагнетательное (МПа)',
               'Температура (°C)', 'Дебит жидкости (м³/сут)', 'Дебит нефти (т/сут)',
               'Обводнённость (%)', 'Число качаний (кач/мин)', 'Индекс здоровья']

    for col, header in enumerate(headers, start=1):
        cell = ws.cell(row=6, column=col, value=header)
        cell.font = Font(bold=True)
        cell.fill = PatternFill(start_color="CCCCCC", end_color="CCCCCC", fill_type="solid")

    for row, record in enumerate(telemetry, start=7):
        ws.cell(row=row, column=1, value=record.timestamp.strftime('%Y-%m-%d %H:%M:%S'))
        ws.cell(row=row, column=2, value=record.current)
        ws.cell(row=row, column=3, value=record.casing_pressure)
        ws.cell(row=row, column=4, value=record.discharge_pressure)
        ws.cell(row=row, column=5, value=record.temperature)
        ws.cell(row=row, column=6, value=record.flow_rate_liquid)
        ws.cell(row=row, column=7, value=record.flow_rate_oil)
        ws.cell(row=row, column=8, value=record.water_cut)
        ws.cell(row=row, column=9, value=record.stroke_rate)
        ws.cell(row=row, column=10, value=record.health_index)

    filename = f"telemetry_well_{well.number}_{period}_{now.strftime('%Y%m%d_%H%M%S')}.xlsx"
    from django.conf import settings
    filepath = os.path.join(str(settings.MEDIA_ROOT), 'exports', filename)
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    wb.save(filepath)

    return filepath


def export_shift_report_to_excel(well_ids=None, date=None):
    """Экспорт сменного отчёта"""
    if date is None:
        date = timezone.now().date()

    if well_ids is None:
        wells = Well.objects.filter(is_active=True)
    else:
        wells = Well.objects.filter(id__in=well_ids, is_active=True)

    wb = Workbook()

    ws1 = wb.active
    ws1.title = "Сводка"
    ws1['A1'] = f"Сменный отчёт за {date}"
    ws1['A1'].font = Font(size=14, bold=True)

    headers = ['№', 'Скважина', 'ЦДНГ', 'Статус', 'Индекс здоровья', 'Алертов за смену']
    for col, header in enumerate(headers, start=1):
        cell = ws1.cell(row=3, column=col, value=header)
        cell.font = Font(bold=True)

    for row, well in enumerate(wells, start=4):
        ws1.cell(row=row, column=1, value=row - 3)
        ws1.cell(row=row, column=2, value=well.number)
        ws1.cell(row=row, column=3, value=well.cdng)
        ws1.cell(row=row, column=4, value=well.status)

        last_telemetry = TelemetryData.objects.filter(well=well).order_by('-timestamp').first()
        health = last_telemetry.health_index if last_telemetry else 'N/A'
        ws1.cell(row=row, column=5, value=health)

        alert_count = Alert.objects.filter(
            well=well,
            created_at__date=date
        ).count()
        ws1.cell(row=row, column=6, value=alert_count)

    ws2 = wb.create_sheet("Алерты")
    alerts = Alert.objects.filter(created_at__date=date).order_by('-created_at')

    headers = ['Время', 'Скважина', 'Тип', 'Параметр', 'Сообщение', 'Значение']
    for col, header in enumerate(headers, start=1):
        cell = ws2.cell(row=1, column=col, value=header)
        cell.font = Font(bold=True)

    for row, alert in enumerate(alerts, start=2):
        ws2.cell(row=row, column=1, value=alert.created_at.strftime('%H:%M:%S'))
        ws2.cell(row=row, column=2, value=alert.well.number)
        ws2.cell(row=row, column=3, value=alert.alert_type)
        ws2.cell(row=row, column=4, value=alert.parameter)
        ws2.cell(row=row, column=5, value=alert.message)
        ws2.cell(row=row, column=6, value=alert.value)

    filename = f"shift_report_{date.strftime('%Y%m%d')}.xlsx"
    from django.conf import settings
    filepath = os.path.join(str(settings.MEDIA_ROOT), 'exports', filename)
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    wb.save(filepath)

    return filepath
