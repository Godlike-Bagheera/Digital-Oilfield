from django.contrib import admin
from django.contrib import messages
from django.utils import timezone
from unfold.admin import ModelAdmin

from .models import Well, TelemetryData, Alert, TrainingTip


@admin.register(Well)
class WellAdmin(ModelAdmin):
    list_display = ['number', 'cdng', 'well_type', 'pump_type', 'status', 'is_active']
    # 'maintenance' уже попадает в фильтр через поле status (все статусы доступны для фильтрации)
    list_filter = ['cdng', 'well_type', 'pump_type', 'status', 'is_active']
    search_fields = ['number', 'cdng']
    list_editable = ['status', 'is_active']
    readonly_fields = ['created_at', 'updated_at']
    actions = ['restart_wells']

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
