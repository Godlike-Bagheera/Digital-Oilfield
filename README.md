# Цифровое месторождение (Digital Oilfield)

Веб-дашборд для мониторинга нефтепромыслового оборудования в режиме реального времени с бизнес-логикой ручного ремонта скважин (SCADA-подход).

Проект разработан в рамках производственной практики.

## Содержание

- [О проекте](#о-проекте)
- [Технологии](#технологии)
- [Быстрый старт](#быстрый-старт)
- [Ключевые фичи](#ключевые-фичи)
- [API эндпоинты](#api-эндпоинты)
- [Симулятор телеметрии](#симулятор-телеметрии)
- [Структура проекта](#структура-проекта)
- [Тестирование](#тестирование)
- [Возможные проблемы](#возможные-проблемы)

## О проекте

Система предназначена для операторов нефтедобычи и инженеров. Позволяет:
- В реальном времени отслеживать состояние 10 скважин
- Получать алерты при отклонениях параметров от нормы
- Проводить расследование инцидентов с группировкой аномалий
- Получать предиктивные алерты о будущих авариях (линейная регрессия)
- Управлять циклом жизни скважины: **работа → авария → ремонт → перезапуск**
- Экспортировать отчёты в Excel и PDF

### Бизнес-логика

В отличие от учебных проектов, реализована **реальная SCADA-логика**:
- Скважина после аварии **НЕ чинится автоматически**
- Требуется ручное вмешательство оператора (кнопка «Завершить ремонт»)
- Во время ремонта симулятор генерирует «мёртвые» данные (ток=0)
- После ремонта параметры сбрасываются к идеальным значениям (health_index=100)

## Технологии

### Backend
- Python 3.10+
- Django 5.0 + Django REST Framework
- SQLite (для разработки)
- django-unfold (современная админка с тёмной темой)
- openpyxl (экспорт в Excel)
- reportlab (экспорт в PDF с поддержкой кириллицы)
- numpy (математические расчёты)

### Frontend
- React 18 + Vite
- Tailwind CSS (тёмная тема в стиле Vercel/Linear)
- Recharts (графики телеметрии)
- React Router
- Axios

## Быстрый старт

### Требования
- Python 3.10+ ([скачать](https://python.org))
- Node.js 18+ ([скачать](https://nodejs.org))
- Git

### 1. Клонирование
```bash
git clone https://github.com/Godlike-Bagheera/Digital-Oilfield.git
cd Digital-Oilfield
```

### 2. Backend (Django)
```bash
cd backend
python -m venv venv

# Windows (CMD):
venv\Scripts\activate.bat
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Linux/Mac:
source venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py create_superuser    # Логин: admin / admin123
python manage.py create_test_data    # Создаст 10 скважин по 3 ЦДНГ
python manage.py simulate_once       # Первая порция данных
python manage.py runserver           # http://127.0.0.1:8000
```

### 3. Frontend (React)
```bash
# В НОВОМ терминале
cd frontend
npm install
npm run dev                          # http://localhost:5173
```

### 4. Открыть сайт
- http://localhost:5173 — основной интерфейс
- http://127.0.0.1:8000/admin/ — админка (admin / admin123)

## Ключевые фичи

1. **Мониторинг 10 скважин** с фильтрами по 3 ЦДНГ и статусу
2. **8 графиков телеметрии** в реальном времени (обновление каждые 5 сек)
3. **Health Index (0-100%)** с весовыми коэффициентами параметров
4. **Предиктивная аналитика** — синие алерты о будущих авариях (линейная регрессия)
5. **Расследование инцидентов** с группировкой аномалий и ReferenceArea на графиках
6. **Ручной перезапуск** после ремонта с мгновенным сбросом к идеальным параметрам
7. **Табы «Активные» / «Вся история»** алертов с пагинацией
8. **Фильтр алертов по дате** (календарь)
9. **Экспорт телеметрии** в Excel и PDF с поддержкой кириллицы (Arial/DejaVu)
10. **Сменные отчёты** (Excel/PDF) с повтором шапки на каждой странице
11. **Unfold админка** с тёмной темой и цветными бейджами статусов
12. **Симулятор телеметрии** с режимом генерации аномалий
13. **Обучающий режим** с подсказками для молодых специалистов
14. **Автоматическая генерация алертов** с защитой от дубликатов
15. **N+1 оптимизация** запросов к БД и downsampling телеметрии

## API эндпоинты

| Метод | URL | Описание |
|-------|-----|----------|
| GET | /api/wells/ | Список скважин |
| GET | /api/wells/{id}/ | Детали скважины |
| GET | /api/wells/{id}/telemetry/?period=24h | Телеметрия |
| GET | /api/wells/{id}/alerts/ | Алерты скважины |
| POST | /api/wells/{id}/repair/ | Завершить ремонт |
| GET | /api/alerts/ | Все алерты |
| GET | /api/training-tips/ | Обучающие подсказки |
| POST | /api/wells/export/telemetry/ | Экспорт в Excel |
| POST | /api/wells/export/telemetry-pdf/ | Экспорт в PDF |

## Симулятор телеметрии

```bash
# Однократная генерация
python manage.py simulate_once

# Непрерывный режим (данные каждые 5 сек)
python manage.py simulate_telemetry --continuous

# С аномалиями (обрыв штанг, перегрев)
python manage.py simulate_telemetry --continuous --with-anomalies
```

**Важно:** скважины в статусе alarm или maintenance генерируют только «мёртвые» данные (ток=0) до ручного перезапуска.

## Структура проекта

```
Digital-Oilfield/
├── backend/
│   ├── backend/                 # Настройки Django
│   │   ├── settings.py          # UNFOLD конфиг, БД
│   │   ├── urls.py              # Маршруты API
│   │   └── wsgi.py
│   ├── wells/                   # Основное приложение
│   │   ├── models.py            # Well, TelemetryData, Alert, TrainingTip
│   │   ├── views.py             # REST API ViewSet
│   │   ├── serializers.py       # DRF сериализаторы
│   │   ├── admin.py             # Админка с цветными бейджами
│   │   ├── services/
│   │   │   ├── health_calculator.py
│   │   │   ├── alert_generator.py
│   │   │   ├── excel_export.py
│   │   │   ├── pdf_export.py
│   │   │   └── incident_investigation.py
│   │   └── management/commands/
│   │       ├── simulate_telemetry.py
│   │       ├── create_test_data.py
│   │       └── create_superuser.py
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/          # WellCard, TelemetryChart, InvestigationModal
│   │   ├── pages/               # Dashboard, WellDetail, AlertsPage, ReportsPage
│   │   ├── services/            # api.js
│   │   ├── utils/               # predictions.js
│   │   └── App.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── test_all.py                  # Комплексный тест
└── README.md
```

## Тестирование

```bash
# Из корня проекта
python test_all.py

# Только backend
cd backend && python test_system.py

# Только frontend
cd frontend && npm run build
```

## Возможные проблемы

### 1. PowerShell: «выполнение сценариев отключено»
**Решение:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
```
Или используйте CMD вместо PowerShell.

### 2. 403 Forbidden на /api/wells/{id}/repair/
**Решение:** добавьте в декоратор метода:
```python
@action(..., permission_classes=[AllowAny], authentication_classes=[])
```

### 3. Чёрные квадраты вместо русского текста в PDF
**Решение:** проверьте в pdf_export.py что в font_candidates есть путь к C:\Windows\Fonts\arial.ttf (Windows) или DejaVuSans.ttf (Linux).

### 4. 404 на /favicon.ico
**Решение:** добавьте inline SVG в index.html:
```html
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>ЦМ</text></svg>">
```

### 5. Белый экран в браузере (React crash)
**Решение:** проверьте консоль DevTools (F12). Обычно проблема в обращении к старым полям аномалий (a.z_score вместо a.z_score_max).

### 6. Все скважины в ЦДНГ-1
**Решение:** запустите:
```bash
cd backend
python manage.py shell -c "from wells.models import Well; Well.objects.filter(number__in=[105,106,107]).update(cdng='ЦДНГ-2'); Well.objects.filter(number__in=[108,109,110]).update(cdng='ЦДНГ-3')"
```

## Контакты

Разработчик: студент Альметьевского государственного нефтяного института  
Практика: ПАО «Татнефть»  
Дата: Ноябрь 2026

## Лицензия

Учебный проект. Все права защищены.
