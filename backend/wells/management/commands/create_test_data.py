from datetime import date

from django.core.management.base import BaseCommand

from wells.models import Well, TrainingTip


class Command(BaseCommand):
    help = 'Создаёт тестовые данные: 10 скважин (ЦДНГ-1) и 5 обучающих подсказок'

    def handle(self, *args, **options):
        pump_types = ['srp', 'esp', 'progressive']
        created_wells = 0
        for i, num in enumerate(range(101, 111)):
            well, created = Well.objects.get_or_create(
                number=str(num),
                defaults={
                    'cdng': 'ЦДНГ-1',
                    'well_type': 'producing',
                    'pump_type': pump_types[i % len(pump_types)],
                    'status': 'online',
                    'commission_date': date(2020, 1, 1),
                    'is_active': True,
                },
            )
            if created:
                created_wells += 1
        self.stdout.write(self.style.SUCCESS(
            f'Скважины: создано {created_wells}, всего в БД {Well.objects.count()}'
        ))

        tips = [
            {
                'parameter': 'current',
                'title': 'Ток двигателя',
                'normal_range': '30-60 А',
                'description': (
                    'Электрический ток двигателя насоса. Отражает нагрузку на оборудование '
                    'и состояние подземного фонда скважины.'
                ),
                'danger_signs': (
                    'Падение тока до 0 — обрыв штанг или отключение насоса; '
                    'резкий рост тока — механическая перегрузка.'
                ),
                'actions': 'Остановить станок, провести диагностику оборудования, вызвать бригаду.',
            },
            {
                'parameter': 'casing_pressure',
                'title': 'Давление затрубное',
                'normal_range': '2-10 МПа',
                'description': (
                    'Давление в затрубном пространстве скважины. Косвенно характеризует '
                    'герметичность обсадной колонны и работу пласта.'
                ),
                'danger_signs': 'Превышение 15 МПа — риск разгерметизации, нештатная работа скважины.',
                'actions': 'Проверить герметичность устья и обсадной колонны, сбросить давление при необходимости.',
            },
            {
                'parameter': 'temperature',
                'title': 'Температура',
                'normal_range': '20-80 °C',
                'description': (
                    'Температура перекачиваемой среды / оборудования. Контроль теплового '
                    'режима работы насоса.'
                ),
                'danger_signs': 'Выше 95 °C — перегрев оборудования, риск отказа.',
                'actions': 'Проверить систему охлаждения, снизить нагрузку, при необходимости остановить.',
            },
            {
                'parameter': 'flow_rate_oil',
                'title': 'Дебит нефти',
                'normal_range': '10-50 т/сут',
                'description': (
                    'Суточный объём добычи нефти по скважине. Основной показатель '
                    'продуктивности.'
                ),
                'danger_signs': 'Падение ниже 5 т/сут — снижение продуктивности или отказ насоса.',
                'actions': 'Проверить насос и оборудование, проанализировать динамику, рассмотреть ГТМ.',
            },
            {
                'parameter': 'water_cut',
                'title': 'Обводнённость',
                'normal_range': 'до 80%',
                'description': (
                    'Доля воды в добываемой жидкости. Важный показатель состояния '
                    'водонефтяного контакта пласта.'
                ),
                'danger_signs': 'Выше 95% — сильное обводнение, падение дебита нефти.',
                'actions': 'Провести ГТМ (геолого-технические мероприятия), изолировать водоприток.',
            },
        ]
        created_tips = 0
        for tip in tips:
            _, created = TrainingTip.objects.get_or_create(
                parameter=tip['parameter'], defaults=tip
            )
            if created:
                created_tips += 1
        self.stdout.write(self.style.SUCCESS(
            f'Подсказки: создано {created_tips}, всего в БД {TrainingTip.objects.count()}'
        ))
