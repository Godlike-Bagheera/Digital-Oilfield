from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
from wells.models import Well, TelemetryData, Alert
import os
import io

# --- FIX: поддержка кириллицы в PDF ---
# ReportLab по умолчанию использует Helvetica (Windows-1252), из-за чего
# русские текст в таблицах отображается чёрными квадратами/кракозябрами.
# Регистрируем DejaVu Sans с кириллицей и делаем его шрифтом по умолчанию.
_FONT_CANDIDATES = [
    ('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'),
    ('DejaVuSans-Bold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'),
]


def _register_cyrillic_fonts():
    """Регистрирует шрифты с поддержкой кириллицы. Возвращает (regular, bold)."""
    regular, bold = 'Helvetica', 'Helvetica-Bold'
    for name, path in _FONT_CANDIDATES:
        if os.path.exists(path):
            try:
                pdfmetrics.registerFont(TTFont(name, path))
                if name == 'DejaVuSans':
                    regular = name
                else:
                    bold = name
            except Exception:
                pass
    if regular != 'Helvetica' and bold != 'Helvetica':
        try:
            pdfmetrics.registerFontFamily(
                'DejaVuSans', normal='DejaVuSans', bold='DejaVuSans-Bold',
                italic='DejaVuSans', boldItalic='DejaVuSans-Bold',
            )
        except Exception:
            pass
    return regular, bold


FONT_REGULAR, FONT_BOLD = _register_cyrillic_fonts()


def _apply_base_styles(styles):
    """Ставит кириллический шрифт в базовые стили getSampleStyleSheet()."""
    for style_name in ('Normal', 'Title', 'Heading1', 'Heading2', 'Heading3'):
        if style_name in styles.byName:
            styles[style_name].fontName = FONT_BOLD if style_name.startswith('Heading') or style_name == 'Title' else FONT_REGULAR
    return styles


def create_telemetry_pdf(well_id, period='24h'):
    """Создание PDF отчёта по телеметрии скважины"""
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

    telemetry = list(TelemetryData.objects.filter(
        well=well,
        timestamp__gte=start_time
    ).order_by('timestamp'))

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
                            rightMargin=2*cm, leftMargin=2*cm,
                            topMargin=2*cm, bottomMargin=2*cm)

    styles = _apply_base_styles(getSampleStyleSheet())
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#1f2937'),
        spaceAfter=12,
        alignment=1
    )
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#374151'),
        spaceAfter=8,
        spaceBefore=12
    )

    elements = []

    # Заголовок
    elements.append(Paragraph("Отчёт по телеметрии", title_style))
    elements.append(Paragraph(f"Скважина №{well.number} | ЦДНГ: {well.cdng}", heading_style))
    elements.append(Spacer(1, 0.3*cm))

    # Информация о скважине
    info_data = [
        ['Параметр', 'Значение'],
        ['Тип скважины', well.get_well_type_display()],
        ['Тип насоса', well.get_pump_type_display()],
        ['Статус', well.get_status_display()],
        ['Период отчёта', f'{period}'],
        ['Дата формирования', now.strftime('%d.%m.%Y %H:%M')],
        ['Количество записей', str(len(telemetry))]
    ]

    info_table = Table(info_data, colWidths=[6*cm, 8*cm])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3b82f6')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), FONT_BOLD),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f3f4f6')])
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 0.5*cm))

    # Статистические показатели
    if telemetry:
        elements.append(Paragraph("Статистические показатели", heading_style))

        avg_current = sum(t.current for t in telemetry) / len(telemetry)
        avg_pressure = sum(t.casing_pressure for t in telemetry) / len(telemetry)
        avg_temp = sum(t.temperature for t in telemetry) / len(telemetry)
        avg_flow = sum(t.flow_rate_oil for t in telemetry) / len(telemetry)
        avg_water_cut = sum(t.water_cut for t in telemetry) / len(telemetry)
        avg_health = sum(t.health_index for t in telemetry) / len(telemetry)

        stats_data = [
            ['Параметр', 'Среднее', 'Мин', 'Макс', 'Ед. изм.'],
            ['Ток двигателя', f'{avg_current:.1f}', f'{min(t.current for t in telemetry):.1f}', f'{max(t.current for t in telemetry):.1f}', 'А'],
            ['Давление затрубное', f'{avg_pressure:.2f}', f'{min(t.casing_pressure for t in telemetry):.2f}', f'{max(t.casing_pressure for t in telemetry):.2f}', 'МПа'],
            ['Температура', f'{avg_temp:.1f}', f'{min(t.temperature for t in telemetry):.1f}', f'{max(t.temperature for t in telemetry):.1f}', '°C'],
            ['Дебит нефти', f'{avg_flow:.1f}', f'{min(t.flow_rate_oil for t in telemetry):.1f}', f'{max(t.flow_rate_oil for t in telemetry):.1f}', 'т/сут'],
            ['Обводнённость', f'{avg_water_cut:.1f}', f'{min(t.water_cut for t in telemetry):.1f}', f'{max(t.water_cut for t in telemetry):.1f}', '%'],
            ['Индекс здоровья', f'{avg_health:.0f}', f'{min(t.health_index for t in telemetry):.0f}', f'{max(t.health_index for t in telemetry):.0f}', '%']
        ]

        stats_table = Table(stats_data, colWidths=[4*cm, 2.5*cm, 2.5*cm, 2.5*cm, 2*cm])
        stats_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#10b981')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), FONT_BOLD),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f3f4f6')])
        ]))
        elements.append(stats_table)
        elements.append(Spacer(1, 0.5*cm))

    # Таблица телеметрии (последние 20 записей)
    elements.append(Paragraph("Данные телеметрии (последние записи)", heading_style))

    telemetry_data = [['Время', 'Ток (А)', 'Давл. (МПа)', 'Темп. (°C)', 'Дебит (т/сут)', 'Обводн. (%)', 'HI']]

    for record in telemetry[-20:]:
        telemetry_data.append([
            record.timestamp.strftime('%d.%m %H:%M'),
            f'{record.current:.1f}',
            f'{record.casing_pressure:.2f}',
            f'{record.temperature:.1f}',
            f'{record.flow_rate_oil:.1f}',
            f'{record.water_cut:.1f}',
            f'{record.health_index:.0f}'
        ])

    telemetry_table = Table(telemetry_data, colWidths=[2.5*cm, 2*cm, 2*cm, 2*cm, 2*cm, 2*cm, 1.5*cm])
    telemetry_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#6366f1')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), FONT_BOLD),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')])
    ]))
    elements.append(telemetry_table)

    # Подвал
    elements.append(Spacer(1, 1*cm))
    footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=colors.grey, alignment=1)
    elements.append(Paragraph(f"Сформировано автоматически системой 'Цифровое месторождение' | {now.strftime('%d.%m.%Y %H:%M:%S')}", footer_style))

    # Генерация PDF
    doc.build(elements)

    # Сохранение файла
    filename = f"telemetry_well_{well.number}_{period}_{now.strftime('%Y%m%d_%H%M%S')}.pdf"
    filepath = os.path.join(settings.MEDIA_ROOT, 'exports', filename)
    os.makedirs(os.path.dirname(filepath), exist_ok=True)

    with open(filepath, 'wb') as f:
        f.write(buffer.getvalue())

    return filepath


def create_shift_report_pdf(well_ids=None, date=None):
    """Создание PDF сменного отчёта"""
    if date is None:
        date = timezone.now().date()

    if well_ids is None:
        wells = Well.objects.filter(is_active=True)
    else:
        wells = Well.objects.filter(id__in=well_ids, is_active=True)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(A4),
                            rightMargin=1.5*cm, leftMargin=1.5*cm,
                            topMargin=1.5*cm, bottomMargin=1.5*cm)

    styles = _apply_base_styles(getSampleStyleSheet())
    title_style = ParagraphStyle('CustomTitle', parent=styles['Heading1'], fontSize=20, textColor=colors.HexColor('#1f2937'), spaceAfter=12, alignment=1)
    heading_style = ParagraphStyle('CustomHeading', parent=styles['Heading2'], fontSize=14, textColor=colors.HexColor('#374151'), spaceAfter=8, spaceBefore=12)

    elements = []

    # Заголовок
    elements.append(Paragraph("Сменный отчёт", title_style))
    elements.append(Paragraph(f"Дата: {date.strftime('%d.%m.%Y')}", heading_style))
    elements.append(Spacer(1, 0.5*cm))

    # Сводная таблица по скважинам
    summary_data = [['№', 'Скважина', 'ЦДНГ', 'Статус', 'Индекс здоровья', 'Алертов за смену']]

    for idx, well in enumerate(wells, start=1):
        last_telemetry = TelemetryData.objects.filter(well=well).order_by('-timestamp').first()
        health = f'{last_telemetry.health_index:.0f}%' if last_telemetry else 'N/A'
        alert_count = Alert.objects.filter(well=well, created_at__date=date).count()

        summary_data.append([str(idx), f'№{well.number}', well.cdng, well.get_status_display(), health, str(alert_count)])

    summary_table = Table(summary_data, colWidths=[1.5*cm, 3*cm, 3*cm, 3*cm, 3*cm, 3*cm])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3b82f6')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), FONT_BOLD),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f3f4f6')])
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 0.5*cm))

    # Таблица алертов за смену
    alerts = Alert.objects.filter(created_at__date=date).order_by('-created_at')

    if alerts.exists():
        elements.append(Paragraph(f"Алерты за смену: {alerts.count()}", heading_style))

        alerts_data = [['Время', 'Скважина', 'Тип', 'Параметр', 'Сообщение', 'Значение']]

        for alert in alerts[:30]:
            alerts_data.append([
                alert.created_at.strftime('%H:%M:%S'),
                f'№{alert.well.number}',
                alert.get_alert_type_display(),
                alert.parameter,
                alert.message[:50] + '...' if len(alert.message) > 50 else alert.message,
                f'{alert.value:.2f}'
            ])

        alerts_table = Table(alerts_data, colWidths=[2.5*cm, 2.5*cm, 3*cm, 3*cm, 6*cm, 2.5*cm])
        alerts_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#ef4444')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), FONT_BOLD),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#fef2f2')])
        ]))
        elements.append(alerts_table)

    # Подвал
    elements.append(Spacer(1, 1*cm))
    footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=colors.grey, alignment=1)
    now = timezone.now()
    elements.append(Paragraph(f"Сформировано автоматически системой 'Цифровое месторождение' | {now.strftime('%d.%m.%Y %H:%M:%S')}", footer_style))

    # Генерация PDF
    doc.build(elements)

    # Сохранение файла
    filename = f"shift_report_{date.strftime('%Y%m%d')}.pdf"
    filepath = os.path.join(settings.MEDIA_ROOT, 'exports', filename)
    os.makedirs(os.path.dirname(filepath), exist_ok=True)

    with open(filepath, 'wb') as f:
        f.write(buffer.getvalue())

    return filepath
