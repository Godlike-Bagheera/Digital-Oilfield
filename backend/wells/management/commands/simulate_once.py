"""
Обёртка над simulate_telemetry --once: одна генерация данных для всех скважин.
"""

from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Однократная генерация телеметрии для всех активных скважин'

    def handle(self, *args, **options):
        call_command('simulate_telemetry', '--once')
