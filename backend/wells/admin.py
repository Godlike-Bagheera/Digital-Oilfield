"""
Админ-панель Django для проекта «Цифровое месторождение».
Адаптировано под тему Unfold (крупный шрифт, темная тема, удобные фильтры).
"""
from django.contrib import admin, messages
from django.utils.html import format_html
from django.utils import timezone
from django.db.models import OuterRef, Subquery

# Импорты Unfold
from unfold.admin import ModelAdmin
from unfold.decorators import display
from unfold.contrib.filters.admin import (
    RangeDateFilter, ChoicesDropdownFilter, RelatedDropdownFilter
)

from .models import Well, TelemetryData, Alert, TrainingTip

# ==================== Действия массовых операций ====================

@admin.action(description="🗑 Удалить ВСЕ записи телеметрии (всей БД)")
def delete_all_telemetry(modeladmin, request, queryset):
    count = TelemetryData.objects.count()
    TelemetryData.objects.all().delete()
    messages.success(request, f"✅ Удалено {count} записей телеметрии.")

@admin.action(description="✅ Закрыть все активные алерты")
def close_all_alerts(modeladmin, request, queryset):
    count = Alert.objects.filter(is_active=True).update(
        is_active=False,
        resolved_at=timezone.now()
    )
    messages.success(request, f"✅ Закрыто {count} активных алертов.")

@admin.action(description="🔄 Сбросить все скважины в статус 'online'")
def reset_all_wells_to_online(modeladmin, request, queryset):
    Well.objects.update(status=Well.Status.ONLINE)
    Alert.objects.filter(is_active=True).update(
        is_active=False, resolved_at=timezone.now()
    )
    messages.success(request, "✅ Все скважины переведены в статус 'online'.")

@admin.action(description="🔧 Перезапустить выбранные скважины (завершить ремонт)")
def restart_wells(modeladmin, request, queryset):
    from wells.models import TelemetryData
    from wells.services.health_calculator import calculate_health_index
    
    restarted_count = 0
    for well in queryset:
        well.status = Well.Status.ONLINE
        well.save(update_fields=['status'])
        Alert.objects.filter(well=well, is_active=True).update(
            is_active=False, resolved_at=timezone.now()
        )
        perfect_data = {
            'current': 45.0, 'casing_pressure': 6.5, 'discharge_pressure': 12.0,
            'temperature': 50.0, 'flow_rate_liquid': 80.0, 'flow_rate_oil': 30.0,
            'water_cut': 45.0, 'stroke_rate': 7.0,
        }
        health = calculate_health_index(perfect_data)
        TelemetryData.objects.create(well=well, health_index=health['health_index'], **perfect_data)
        restarted_count += 1
    
    messages.success(request, f"✅ Перезапущено скважин: {restarted_count}")

# ==================== Хелперы для бейджей ====================

def health_badge(obj):
    """Цветной бейдж индекса здоровья."""
    if not hasattr(obj, 'health_index'): return '—'
    hi = int(obj.health_index)
    if hi >= 80:
        color = '#10b981'
    elif hi >= 50:
        color = '#f59e0b'
    elif hi >= 20:
        color = '#f97316'
    else:
        color = '#ef4444'
    return format_html(
        '<span style="color: {}; font-weight: 700; font-size: 15px;">{}%</span>',
        color, hi
    )
health_badge.short_description = "Health"

# ==================== Админ-классы ====================

@admin.register(Well)
class WellAdmin(ModelAdmin):
    list_display = ['number', 'cdng', 'well_type', 'pump_type', 'status_badge', 'latest_health', 'is_active']
    
    # Unfold фильтры (красивые выпадающие списки и календарь)
    list_filter = [
        'status', 'cdng', 'well_type', 'pump_type', 'is_active',
        ('commission_date', RangeDateFilter),
    ]
    search_fields = ['number', 'cdng']
    list_per_page = 20
    list_display_links = ['number']
    list_select_related = True
    ordering = ['number']
    actions = [restart_wells, reset_all_wells_to_online]
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('number', 'cdng', 'well_type', 'pump_type', 'status', 'is_active'),
            'classes': ('wide',),
        }),
        ('Координаты', {
            'fields': ('latitude', 'longitude'),
            'classes': ('collapse',),
        }),
        ('Даты', {
            'fields': ('commission_date', 'created_at', 'updated_at'),
        }),
    )
    readonly_fields = ['created_at', 'updated_at']
    
    @display(description="Статус", label=True)
    def status_badge(self, obj):
        """Возвращает кортеж (текст, цвет) для встроенных бейджей Unfold."""
        colors = {
            'online': 'green',
            'warning': 'yellow',
            'alarm': 'red',
            'maintenance': 'orange',
            'offline': 'gray',
        }
        return (obj.get_status_display(), colors.get(obj.status, 'gray'))
    
    @display(description="Health")
    def latest_health(self, obj):
        """Последний Health Index скважины."""
        last = obj.latest_telemetry
        if last:
            hi = int(last.health_index)
            color = '#10b981' if hi >= 80 else '#f59e0b' if hi >= 50 else '#ef4444'
            return format_html(
                '<span style="color: {}; font-weight: 700; font-size: 15px;">{}%</span>',
                color, hi
            )
        return '—'


@admin.register(TelemetryData)
class TelemetryDataAdmin(ModelAdmin):
    list_display = ['well', 'timestamp', 'current', 'temperature', 'flow_rate_oil', 'water_cut', health_badge]
    list_filter = [
        ('well', RelatedDropdownFilter),
        ('timestamp', RangeDateFilter),
    ]
    search_fields = ['well__number']
    list_per_page = 50
    date_hierarchy = 'timestamp'
    list_select_related = ['well']
    ordering = ['-timestamp']
    actions = [delete_all_telemetry, 'delete_selected']
    
    readonly_fields = ['timestamp']
    fieldsets = (
        ('Скважина', {'fields': ('well', 'timestamp', 'health_index')}),
        ('Электрика', {'fields': ('current', 'stroke_rate')}),
        ('Давление', {'fields': ('casing_pressure', 'discharge_pressure')}),
        ('Добыча', {'fields': ('flow_rate_liquid', 'flow_rate_oil', 'water_cut')}),
        ('Температура', {'fields': ('temperature',)}),
    )


@admin.register(Alert)
class AlertAdmin(ModelAdmin):
    list_display = ['well', 'alert_type_badge', 'parameter', 'short_message', 'active_badge', 'created_at']
    list_filter = [
        'alert_type', 'is_active', 'parameter',
        ('well', RelatedDropdownFilter),
        ('created_at', RangeDateFilter),
    ]
    search_fields = ['well__number', 'message', 'parameter']
    list_per_page = 30
    list_select_related = ['well']
    date_hierarchy = 'created_at'
    ordering = ['-created_at']
    actions = [close_all_alerts, 'delete_selected']
    
    @display(description="Тип", label=True)
    def alert_type_badge(self, obj):
        colors = {'critical': 'red', 'warning': 'yellow', 'predictive': 'blue'}
        return (obj.get_alert_type_display(), colors.get(obj.alert_type, 'gray'))
    
    @display(description="Активен?", label=True)
    def active_badge(self, obj):
        return ("Активен", "red") if obj.is_active else ("Закрыт", "gray")
    
    @display(description="Сообщение")
    def short_message(self, obj):
        msg = obj.message or ''
        return msg[:80] + '...' if len(msg) > 80 else msg


@admin.register(TrainingTip)
class TrainingTipAdmin(ModelAdmin):
    list_display = ['parameter', 'title', 'normal_range']
    search_fields = ['parameter', 'title']
    list_per_page = 50
