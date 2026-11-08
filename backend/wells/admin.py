"""
Админ-панель Django для проекта «Цифровое месторождение».
Цветные бейджи статусов + действия массового удаления/закрытия.
"""
from django.contrib import admin, messages
from django.utils.html import format_html
from django.utils import timezone
from .models import Well, TelemetryData, Alert, TrainingTip


# ==================== Действия массовых операций ====================

@admin.action(description="🗑 Удалить ВСЕ записи телеметрии (всей БД)")
def delete_all_telemetry(modeladmin, request, queryset):
    """Удаляет ВСЕ записи телеметрии из базы, а не только выделенные."""
    count = TelemetryData.objects.count()
    TelemetryData.objects.all().delete()
    messages.success(request, f"✅ Удалено {count} записей телеметрии.")


@admin.action(description="✅ Закрыть все активные алерты")
def close_all_alerts(modeladmin, request, queryset):
    """Закрывает все активные алерты одним кликом."""
    count = Alert.objects.filter(is_active=True).update(
        is_active=False,
        resolved_at=timezone.now()
    )
    messages.success(request, f"✅ Закрыто {count} активных алертов.")


@admin.action(description="🔄 Сбросить все скважины в статус 'online'")
def reset_all_wells_to_online(modeladmin, request, queryset):
    """Сбрасывает все скважины в online и закрывает алерты."""
    Well.objects.update(status=Well.Status.ONLINE)
    Alert.objects.filter(is_active=True).update(
        is_active=False, resolved_at=timezone.now()
    )
    messages.success(request, "✅ Все скважины переведены в статус 'online'.")


# ==================== Хелперы для цветных бейджей ====================

STATUS_COLORS = {
    'online': '#10b981',       # зелёный — в работе
    'warning': '#f59e0b',      # жёлтый — внимание
    'alarm': '#ef4444',        # красный — авария
    'maintenance': '#f97316',  # оранжевый — в ремонте
    'offline': '#6b7280',      # серый — офлайн
}

ALERT_TYPE_COLORS = {
    'critical': '#ef4444',
    'warning': '#f59e0b',
    'predictive': '#3b82f6',
}


def status_badge(obj):
    """Красивый цветной бейдж статуса."""
    color = STATUS_COLORS.get(obj.status, '#6b7280')
    label = dict(Well.Status.choices).get(obj.status, obj.status)
    return format_html(
        '<span style="background-color: {}; color: white; padding: 4px 12px; '
        'border-radius: 8px; font-size: 13px; font-weight: 600; '
        'min-width: 80px; display: inline-block; text-align: center;">'
        '{}</span>',
        color, label
    )
status_badge.short_description = "Статус"


def alert_type_badge(obj):
    """Цветной бейдж типа алерта."""
    color = ALERT_TYPE_COLORS.get(obj.alert_type, '#6b7280')
    label = dict(Alert.AlertType.choices).get(obj.alert_type, obj.alert_type)
    return format_html(
        '<span style="background-color: {}; color: white; padding: 4px 12px; '
        'border-radius: 8px; font-size: 13px; font-weight: 600; '
        'min-width: 100px; display: inline-block; text-align: center;">'
        '{}</span>',
        color, label
    )
alert_type_badge.short_description = "Тип алерта"


def active_badge(obj):
    """Бейдж активности алерта."""
    if obj.is_active:
        return format_html(
            '<span style="background-color: #ef4444; color: white; padding: '
            '4px 10px; border-radius: 8px; font-size: 12px; font-weight: 600;">'
            '● АКТИВЕН</span>'
        )
    return format_html(
        '<span style="background-color: #6b7280; color: white; padding: '
        '4px 10px; border-radius: 8px; font-size: 12px; font-weight: 600;">'
        '● Закрыт</span>'
    )
active_badge.short_description = "Статус"


def health_badge(obj):
    """Цветной бейдж индекса здоровья."""
    hi = obj.health_index
    if hi >= 80:
        color = '#10b981'
    elif hi >= 50:
        color = '#f59e0b'
    elif hi >= 20:
        color = '#f97316'
    else:
        color = '#ef4444'
    return format_html(
        '<span style="color: {}; font-weight: 700; font-size: 14px;">'
        '{:.0f}%</span>',
        color, hi
    )
health_badge.short_description = "Health"


# ==================== Админ-классы ====================

@admin.register(Well)
class WellAdmin(admin.ModelAdmin):
    list_display = ['number', 'cdng', status_badge, 'well_type', 'pump_type',
                    'latest_health', 'is_active']
    list_filter = ['status', 'cdng', 'well_type', 'pump_type', 'is_active']
    search_fields = ['number', 'cdng']
    list_per_page = 50
    list_display_links = ['number']
    actions = [reset_all_wells_to_online]
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('number', 'cdng', 'well_type', 'pump_type', 'status')
        }),
        ('Координаты', {
            'fields': ('latitude', 'longitude'),
            'classes': ('collapse',)
        }),
        ('Даты', {
            'fields': ('commission_date', 'is_active')
        }),
    )
    
    def latest_health(self, obj):
        """Последний Health Index скважины."""
        last = obj.latest_telemetry
        if last:
            hi = last.health_index
            color = '#10b981' if hi >= 80 else '#f59e0b' if hi >= 50 else '#ef4444'
            return format_html(
                '<span style="color: {}; font-weight: 700;">{:.0f}%</span>',
                color, hi
            )
        return '—'
    latest_health.short_description = "Health"


@admin.register(TelemetryData)
class TelemetryDataAdmin(admin.ModelAdmin):
    list_display = ['well', 'timestamp', 'current', 'temperature',
                    'flow_rate_oil', 'water_cut', health_badge]
    list_filter = ['well', 'timestamp']
    search_fields = ['well__number']
    list_per_page = 1000  # увеличено с 50 до 1000
    date_hierarchy = 'timestamp'
    list_select_related = ['well']
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
class AlertAdmin(admin.ModelAdmin):
    list_display = ['well', alert_type_badge, 'parameter', 'short_message',
                    active_badge, 'created_at']
    list_filter = ['alert_type', 'is_active', 'well', 'parameter', 'created_at']
    search_fields = ['well__number', 'message', 'parameter']
    list_per_page = 100
    list_select_related = ['well']
    date_hierarchy = 'created_at'
    actions = [close_all_alerts, 'delete_selected']
    
    def short_message(self, obj):
        """Укороченное сообщение для списка."""
        msg = obj.message or ''
        return msg[:80] + '...' if len(msg) > 80 else msg
    short_message.short_description = "Сообщение"


@admin.register(TrainingTip)
class TrainingTipAdmin(admin.ModelAdmin):
    list_display = ['parameter', 'title', 'normal_range']
    search_fields = ['parameter', 'title']
    list_per_page = 50
