![Python](https://img.shields.io/badge/Python-3.11-blue)
![Django](https://img.shields.io/badge/Django-5.0-green)
![React](https://img.shields.io/badge/React-18.2-61dafb)
![Vite](https://img.shields.io/badge/Vite-5.0-purple)

# Цифровое месторождение (Digital Oilfield)

Веб-дашборд для мониторинга нефтепромыслового оборудования в режиме реального времени с бизнес-логикой ручного ремонта скважин (SCADA-подход) и адаптивным интерфейсом для мобильных устройств.

Проект разработан в рамках производственной практики в ООО «ТатИТнефть» (дочерняя ИТ-компания ПАО «Татнефть»).

## Содержание

- [О проекте](#о-проекте)
- [Технологии](#технологии)
- [Быстрый старт](#быстрый-старт-10-минут)
- [Развёртывание через Docker](#развёртывание-через-docker)
- [Ключевые фичи](#ключевые-фичи)
- [API эндпоинты](#api-эндпоинты)
- [Симулятор телеметрии](#симулятор-телеметрии)
- [Структура проекта](#структура-проекта)
- [Тестирование](#тестирование)
- [Возможные проблемы](#возможные-проблемы)
- [Контакты](#контакты)

## О проекте

Система предназначена для операторов нефтедобычи и инженеров. Позволяет:
- В реальном времени отслеживать состояние 10 скважин
- Получать алерты при отклонениях параметров от нормы
- Проводить расследование инцидентов с группировкой аномалий
- Получать предиктивные алерты о будущих авариях (линейная регрессия)
- Управлять циклом жизни скважины: **работа → авария → ремонт → перезапуск**
- Экспортировать отчёты в Excel и PDF
- Визуализировать расположение скважин на карте Ромашкинского месторождения
- Работать с телефона: адаптивная вёрстка, свайп и кнопка закрытия уведомлений

### Бизнес-логика

В отличие от учебных проектов, реализована **реальная SCADA-логика**:
- Скважина после аварии **НЕ чинится автоматически**
- Требуется ручное вмешательство оператора (кнопка «Завершить ремонт»)
- Во время аварии симулятор генерирует «мёртвые» данные (ток = 0)
- После ремонта параметры сбрасываются к идеальным значениям (health_index = 100)

## Технологии

### Backend
- Python 3.10–3.12, Django 5.0 + Django REST Framework
- SQLite (разработка и демо-стенд)
- django-unfold (админка с тёмной темой и цветными бейджами)
- openpyxl (экспорт в Excel), reportlab (экспорт в PDF с кириллицей)
- numpy (математические расчёты)

### Frontend
- React 18 + Vite, React Router, Axios
- Tailwind CSS (тёмная тема в стиле Vercel/Linear)
- Recharts (графики телеметрии с downsampling)
- Leaflet + OpenStreetMap (карта месторождения)
- react-hot-toast (глобальные уведомления)
- lucide-react (иконки)

### Инфраструктура
- Docker + Docker Compose, Nginx (reverse proxy)
- Git + GitHub

## Быстрый старт (10 минут)

Для работы сайта нужны **три терминала**: backend, frontend и симулятор телеметрии. Без симулятора данных нет — сайт будет «пустым».

### Требования
- Python 3.10–3.12
- Node.js 18+
- Git

### Шаг 1. Клонирование

```bash
git clone https://github.com/Godlike-Bagheera/Digital-Oilfield.git
cd Digital-Oilfield
```

### Шаг 2. Backend (терминал 1)

Windows PowerShell:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py create_superuser
python manage.py create_test_data
python manage.py runserver
```

Windows CMD:

```cmd
cd backend
python -m venv venv
venv\Scripts\activate.bat
pip install -r requirements.txt
python manage.py migrate
python manage.py create_superuser
python manage.py create_test_data
python manage.py runserver
```

Linux / macOS:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py create_superuser
python manage.py create_test_data
python manage.py runserver
```

Команды `create_superuser` (логин `admin`, пароль `admin123`) и `create_test_data` (10 скважин по 3 ЦДНГ) выполняются один раз.

### Шаг 3. Frontend (терминал 2)

```bash
cd frontend
npm install
npm run dev
```

### Шаг 4. Симулятор телеметрии (терминал 3)

Windows PowerShell:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python manage.py simulate_demo
```

Windows CMD:

```cmd
cd backend
venv\Scripts\activate.bat
python manage.py simulate_demo
```

`simulate_demo` — демонстрационный сценарий: через 15 секунд скважина №108 уходит в аварию с уведомлением, затем скважина №109 проходит цепочку warning → предиктивный алерт → авария. Для «честной» случайной телеметрии вместо него запустите:

```bash
python manage.py simulate_telemetry --continuous --with-anomalies
```

### Шаг 5. Открыть в браузере

- http://localhost:5173 — основной интерфейс
- http://localhost:5173/admin/ — админка (admin / admin123)

## Развёртывание через Docker

Тестовый стенд разворачивается на любом Linux-сервере (Ubuntu, Debian) без установки Python и Node.js — всё упаковано в контейнеры.

### Требования
- Docker Engine 20.10+
- Docker Compose V2

### Запуск

```bash
git clone https://github.com/Godlike-Bagheera/Digital-Oilfield.git
cd Digital-Oilfield
docker compose up -d --build
docker compose exec backend python manage.py create_test_data
docker compose exec backend python manage.py create_superuser
docker compose exec -d backend python manage.py simulate_demo
```

### Доступ
- Интерфейс: `http://<IP_СЕРВЕРА>:8080`
- API: `http://<IP_СЕРВЕРА>:8080/api/`
- Админка: `http://<IP_СЕРВЕРА>:8080/admin/`

### Остановка и перезапуск

```bash
docker compose stop    # пауза с сохранением данных
docker compose start   # продолжить работу
docker compose down    # удалить контейнеры (данные БД сбрасываются!)
```

## Ключевые фичи

1. **Мониторинг 10 скважин** с фильтрами по 3 ЦДНГ, статусу и поиском по номеру
2. **8 графиков телеметрии** в реальном времени (обновление каждые 5 сек)
3. **Health Index (0–100%)** с весовыми коэффициентами параметров
4. **Предиктивная аналитика** — синие алерты о будущих авариях (линейная регрессия)
5. **Расследование инцидентов** с группировкой аномалий и ReferenceArea на графиках
6. **Ручной перезапуск** после ремонта с мгновенным сбросом к идеальным параметрам
7. **Табы «Активные» / «Вся история»** алертов с пагинацией и фильтром по дате
8. **Экспорт телеметрии** в Excel и PDF с поддержкой кириллицы (Arial/DejaVu)
9. **Сменные отчёты** (Excel/PDF) с повтором шапки на каждой странице
10. **Unfold-админка** с тёмной темой, цветными бейджами и массовыми действиями
11. **Симулятор телеметрии** с режимами continuous и генерации аномалий
12. **Демо-режим `simulate_demo`** — управляемый сценарий аварий для показа
13. **Обучающий режим** с подсказками для молодых специалистов
14. **Автогенерация алертов** с защитой от дубликатов
15. **Оптимизация производительности**: N+1-запросы, downsampling до 240 точек, React.memo
16. **Интерактивная карта** Ромашкинского месторождения (Leaflet + OSM) с реальными координатами кустов скважин
17. **Глобальные toast-уведомления** на всех страницах: закрытие крестиком и свайпом
18. **Адаптивная вёрстка**: бургер-меню, перестройка сеток, мобильные панели на телефонах
19. **Локализованные названия параметров** в интерфейсе («Обводнённость» вместо water_cut)

## API эндпоинты

| Метод | URL | Описание |
|-------|-----|----------|
| GET | /api/wells/ | Список скважин |
| GET | /api/wells/{id}/ | Детали скважины |
| GET | /api/wells/{id}/telemetry/?period=24h | Телеметрия за период |
| GET | /api/wells/{id}/alerts/ | Алерты скважины |
| GET | /api/wells/{id}/investigate/?alert_id=N | Данные для расследования |
| POST | /api/wells/{id}/repair/ | Завершить ремонт |
| GET | /api/alerts/ | Все алерты |
| GET | /api/training-tips/ | Обучающие подсказки |
| POST | /api/wells/export/telemetry/ | Экспорт телеметрии в Excel |
| POST | /api/wells/export/telemetry-pdf/ | Экспорт телеметрии в PDF |
| POST | /api/wells/export/shift-report/ | Сменный отчёт (Excel) |
| POST | /api/wells/export/shift-report-pdf/ | Сменный отчёт (PDF) |

## Симулятор телеметрии

| Команда | Назначение |
|---------|------------|
| `python manage.py simulate_once` | Однократная генерация данных |
| `python manage.py simulate_telemetry --continuous` | Непрерывный режим (каждые 5 сек) |
| `python manage.py simulate_telemetry --continuous --with-anomalies` | Непрерывный + случайные аномалии (5%) |
| `python manage.py simulate_demo` | Демо-сценарий для защиты |
| `python manage.py create_predictive_test` | Демо-тренд тока для предиктивного алерта |

### Тайминг демо-сценария `simulate_demo`
- 0–15 сек — все скважины в штатном режиме
- 15 сек — скважина №108: АВАРИЯ (обрыв штанг) + toast
- ~3 мин — скважина №109: WARNING (обводнённость 90%)
- ~5 мин — скважина №109: ПРЕДИКТИВНЫЙ алерт
- ~8 мин — скважина №109: АВАРИЯ (обводнённость 97%)
- скважина №110 — периодические warning-скачки температуры

### Быстрый тест предиктивной аналитики

Если нужно показать предиктивный алерт **мгновенно** (без ожидания 5 минут как в `simulate_demo`):

```bash
python manage.py create_predictive_test
```

Команда создаёт растущий тренд тока для **скважины №101** (55А → 80А, порог 85А).
Откройте страницу скважины №101 (`http://localhost:5173/well/101`) — над графиками появится **синий блок предиктивного алерта** «Ток двигателя превысит норму через N часов».

## Структура проекта

```
Digital-Oilfield/
├── backend/
│   ├── backend/                 # Настройки Django (settings, urls, wsgi)
│   ├── wells/                   # Основное приложение
│   │   ├── models.py            # Well, TelemetryData, Alert, TrainingTip
│   │   ├── views.py             # REST API ViewSet'ы
│   │   ├── serializers.py       # DRF-сериализаторы
│   │   ├── admin.py             # Админка: бейджи, массовые действия
│   │   ├── constants.py         # Словарь названий параметров
│   │   ├── services/            # Бизнес-логика
│   │   │   ├── health_calculator.py
│   │   │   ├── alert_generator.py
│   │   │   ├── incident_investigation.py
│   │   │   ├── excel_export.py
│   │   │   └── pdf_export.py
│   │   └── management/commands/ # create_test_data, simulate_*, ...
│   ├── static/admin/css/        # Кастомные стили админки
│   ├── Dockerfile
│   ├── manage.py
│   ├── test_system.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/          # WellCard, TelemetryChart, InvestigationModal...
│   │   ├── pages/               # Dashboard, WellDetail, AlertsPage, ReportsPage, MapPage
│   │   ├── hooks/               # useAlertNotifications.js
│   │   ├── services/            # api.js
│   │   ├── utils/               # parameters.js, downsample.js, predictions.js
│   │   └── App.jsx
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── vite.config.js
│   └── package.json
├── docker-compose.yml
├── test_all.py
└── README.md
```

## Тестирование

```bash
# Комплексный тест (из корня проекта)
python test_all.py

# Только backend
cd backend && python test_system.py

# Только frontend (сборка без ошибок)
cd frontend && npm run build
```

## Возможные проблемы

### 1. PowerShell: «выполнение сценариев отключено»
Выполните один раз в текущей сессии или используйте CMD:
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
```

### 2. Чёрные квадраты вместо русского текста в PDF
В `pdf_export.py` в списке `font_candidates` должен быть путь к шрифту с кириллицей: `C:\Windows\Fonts\arial.ttf` (Windows) или DejaVuSans (Linux). В Docker-контейнере шрифты DejaVu устанавливаются автоматически.

### 3. Белый экран в браузере (React crash)
Откройте консоль DevTools (F12). Историческая причина — обращение к старым полям аномалий (`a.z_score` вместо `a.z_score_max`); в актуальной версии исправлено.

### 4. npm не найдена в Windows
Если Node.js установлен в нестандартную папку, добавьте её в PATH сессии:
```cmd
set PATH=D:\node;%PATH%
```

## Контакты

**Разработчик:** студент Альметьевского политехнического техникума (АПТ)
**Место практики:** ООО «ТатИТнефть» — дочерняя ИТ-компания ПАО «Татнефть»
**Руководитель практики от предприятия:** Махалов Роман Дмитриевич
**Дата:** ноябрь 2026

## Лицензия

Учебный проект. Все права защищены.
## Лицензия

Учебный проект. Все права защищены.
