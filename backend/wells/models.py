from django.db import models


class Well(models.Model):
    """Скважина с телеметрическим оборудованием."""

    class WellType(models.TextChoices):
        PRODUCING = 'producing', 'Добывающая'
        INJECTION = 'injection', 'Нагнетательная'

    class PumpType(models.TextChoices):
        ESP = 'esp', 'ЭЦН'
        SRP = 'srp', 'ШСН'
        PROGRESSIVE = 'progressive', 'Винтовой'

    class Status(models.TextChoices):
        ONLINE = 'online', 'Онлайн'
        WARNING = 'warning', 'Внимание'
        ALARM = 'alarm', 'Авария'
        OFFLINE = 'offline', 'Офлайн'

    number = models.CharField(
        max_length=20, unique=True, verbose_name="Номер скважины"
    )
    cdng = models.CharField(max_length=50, verbose_name="ЦДНГ")
    well_type = models.CharField(
        max_length=20,
        choices=WellType.choices,
        default=WellType.PRODUCING,
        verbose_name="Тип скважины",
    )
    pump_type = models.CharField(
        max_length=30,
        choices=PumpType.choices,
        default=PumpType.SRP,
        verbose_name="Тип насоса",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ONLINE,
        verbose_name="Статус",
    )
    commission_date = models.DateField(verbose_name="Дата ввода")
    latitude = models.FloatField(null=True, blank=True, verbose_name="Широта")
    longitude = models.FloatField(null=True, blank=True, verbose_name="Долгота")
    is_active = models.BooleanField(default=True, verbose_name="Активна")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Скважина №{self.number} ({self.cdng})"

    class Meta:
        verbose_name = "Скважина"
        verbose_name_plural = "Скважины"
        ordering = ['number']


class TelemetryData(models.Model):
    """Телеметрические измерения скважины."""

    well = models.ForeignKey(
        Well,
        on_delete=models.CASCADE,
        related_name='telemetry',
        verbose_name="Скважина",
    )
    timestamp = models.DateTimeField(auto_now_add=True, verbose_name="Время измерения")
    current = models.FloatField(verbose_name="Ток двигателя, А")
    casing_pressure = models.FloatField(verbose_name="Давление затрубное, МПа")
    discharge_pressure = models.FloatField(verbose_name="Давление нагнетательное, МПа")
    temperature = models.FloatField(verbose_name="Температура, °C")
    flow_rate_liquid = models.FloatField(verbose_name="Дебит жидкости, м³/сут")
    flow_rate_oil = models.FloatField(verbose_name="Дебит нефти, т/сут")
    water_cut = models.FloatField(verbose_name="Обводнённость, %")
    stroke_rate = models.FloatField(verbose_name="Число качаний, кач/мин")
    health_index = models.FloatField(default=100, verbose_name="Индекс здоровья")

    def __str__(self):
        return f"{self.well.number} - {self.timestamp}"

    class Meta:
        verbose_name = "Телеметрия"
        verbose_name_plural = "Телеметрия"
        ordering = ['-timestamp']
        indexes = [models.Index(fields=['well', 'timestamp'])]


class Alert(models.Model):
    """Алерт (предупреждение/авария) по параметру скважины."""

    class AlertType(models.TextChoices):
        CRITICAL = 'critical', 'Критический'
        WARNING = 'warning', 'Предупреждение'
        PREDICTIVE = 'predictive', 'Предиктивный'

    well = models.ForeignKey(
        Well,
        on_delete=models.CASCADE,
        related_name='alerts',
        verbose_name="Скважина",
    )
    alert_type = models.CharField(
        max_length=20, choices=AlertType.choices, verbose_name="Тип алерта"
    )
    parameter = models.CharField(max_length=50, verbose_name="Параметр")
    message = models.TextField(verbose_name="Сообщение")
    value = models.FloatField(verbose_name="Значение")
    threshold = models.FloatField(verbose_name="Порог срабатывания")
    is_active = models.BooleanField(default=True, verbose_name="Активен")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Время создания")
    resolved_at = models.DateTimeField(
        null=True, blank=True, verbose_name="Время закрытия"
    )

    def __str__(self):
        return f"{self.well.number} - {self.get_alert_type_display()} - {self.parameter}"

    class Meta:
        verbose_name = "Алерт"
        verbose_name_plural = "Алерты"
        ordering = ['-created_at']


class TrainingTip(models.Model):
    """Обучающая подсказка для оператора по параметру телеметрии."""

    parameter = models.CharField(
        max_length=50,
        unique=True,
        verbose_name="Параметр",
        help_text="Например: current, casing_pressure, temperature",
    )
    title = models.CharField(max_length=100, verbose_name="Заголовок")
    normal_range = models.CharField(max_length=50, verbose_name="Норма")
    description = models.TextField(verbose_name="Описание")
    danger_signs = models.TextField(verbose_name="Признаки опасности")
    actions = models.TextField(verbose_name="Действия оператора")

    def __str__(self):
        return f"{self.parameter} - {self.title}"

    class Meta:
        verbose_name = "Обучающая подсказка"
        verbose_name_plural = "Обучающие подсказки"
