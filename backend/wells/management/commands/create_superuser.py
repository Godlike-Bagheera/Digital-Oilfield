from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Создаёт суперпользователя admin (admin / admin123), если его ещё нет'

    def handle(self, *args, **options):
        User = get_user_model()
        if not User.objects.filter(username='admin').exists():
            User.objects.create_superuser('admin', 'admin@digital-oilfield.local', 'admin123')
            self.stdout.write(self.style.SUCCESS('Суперпользователь создан: admin / admin123'))
        else:
            self.stdout.write(self.style.WARNING('Суперпользователь уже существует'))
