from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import Well, TelemetryData, Alert, TrainingTip


@admin.register(Well)
class WellAdmin(ModelAdmin):
    list_display = ['number', 'cdng', 'well_type', 'pump_type', 'status', 'is_active']
    list_filter = ['cdng', 'well_type', 'pump_type', 'status', 'is_active']
    search_fields = ['number', 'cdng']
    list_editable = ['status', 'is_active']
    readonly_fields = ['created_at', 'updated_at']


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
