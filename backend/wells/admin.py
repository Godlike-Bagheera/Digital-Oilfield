from django.contrib import admin
from django.contrib import messages
from django.utils import timezone
from django.utils.html import format_html
from unfold.admin import ModelAdmin

from .models import Well, TelemetryData, Alert, TrainingTip


@admin.register(Well)
class WellAdmin(ModelAdmin):
    list_display = ['number', 'cdng', 'well_type', 'pump_type', 'colored_status', 'is_active']
    # 'maintenance' уже попадает в фильтр через поле status (все статусы доступны для фильтрации)
    list_filter = ['cdng', 'well_type', 'pump_type', 'status', 'is_active']
    search_fields = ['number', 'cdng']
    # colored_status убран из list_editable (HTML-бейдж нельзя редактировать в списке);
    # is_active остаётся редактируемым, статус меняется через action/repair/API
    list_editable = ['is_active']
    readonly_fields = ['created_at', 'updated_at']
    actions = ['restart_wells']

    @admin.display(description='Статус')
    def colored_status(self, obj):
        """Цветной бейдж статуса скважины в списке админки"""
        colors = {
            'online': '#10b981',      # green-500
            'warning': '#f59e0b',     # amber-500
            'alarm': '#ef4444',       # red-500
            'maintenance': '#f97316', # orange-500
            'offline': '#6b7280',     # gray-500
        }
        color = colors.get(obj.status, '#6b7280')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 4px 10px; '
            'border-radius: 12px; font-size: 12px; font-weight: 600; '
            'display: inline-block; min-width: 80px; text-align: center;">{}</span>',
            color, obj.get_status_display()
        )

    @admin.action(description='Перезапустить выбранные скважины (завершить ремонт)')
    def restart_wells(self, request, queryset):
        """
        Завершить ремонт для выбранных скважин (ручное вмешательство оператора).
        КРИТИЧЕСКИЙ БИЗНЕС-БАГ (исправлен): скважины в alarm/maintenance чинятся
        только здесь (или через POST /api/wells/{id}/repair/), а не автоматически.
        """
        restarted_count = 0
        closed_alerts_count = 0

        for well in queryset:
            # Меняем статус на online
            well.status = Well.Status.ONLINE
            well.save(update_fields=['status'])

            # Закрываем активные алерты
            closed = Alert.objects.filter(
                well=well,
                is_active=True,
            ).update(is_active=False, resolved_at=timezone.now())

            restarted_count += 1
            closed_alerts_count += closed

        messages.success(
            request,
            f'Перезапущено скважин: {restarted_count}. Закрыто алертов: {closed_alerts_count}'
        )


@admin.register(TelemetryData)
class TelemetryDataAdmin(ModelAdmin):
    list_display = [
        'well', 'timestamp', 'current', 'casing_pressure', 'temperature',
        'flow_rate_oil', 'water_cut', 'health_index',
    ]
    list_filter = ['well', 'timestamp']
    search_fields = ['well__number']
    readonly_fields = ['timestamp']
    date_hierarchy = 'timestamp'
    list_per_page = 50  # Крупная страница для телеметрии


@admin.register(Alert)
class AlertAdmin(ModelAdmin):
    list_display = [
        'well', 'alert_type', 'parameter', 'message', 'value', 'is_active', 'created_at',
    ]
    list_filter = ['alert_type', 'is_active', 'well']
    search_fields = ['well__number', 'message']
    list_editable = ['is_active']
    readonly_fields = ['created_at']


@admin.register(TrainingTip)
class TrainingTipAdmin(ModelAdmin):
    list_display = ['parameter', 'title', 'normal_range']
    search_fields = ['parameter', 'title']
