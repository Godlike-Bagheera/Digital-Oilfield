# Цифровое месторождение (Digital Oilfield)

Веб-дашборд для мониторинга нефтепромыслового оборудования в режиме реального времени.
Проект разработан в рамках производственной практики.

[![Python](https://img.shields.io/badge/Python-3.10+-blue)](https://python.org)
[![Django](https://img.shields.io/badge/Django-5.0-green)](https://djangoproject.com)
[![React](https://img.shields.io/badge/React-18-61dafb)](https://react.dev)

---

## 📋 Содержание

- [🎯 О проекте](#-о-проекте)
- [🛠 Технологии](#-технологии)
- [📁 Структура проекта](#-структура-проекта)
- [🚀 Быстрый старт](#-быстрый-старт)
- [✨ Функционал](#-функционал)
- [🌐 API эндпоинты](#-api-эндпоинты)
- [🤖 Симулятор телеметрии](#-симулятор-телеметрии)
- [🧪 Тестирование](#-тестирование)
- [❓ Возможные проблемы](#-возможные-проблемы)
- [📞 Контакты](#-контакты)

---

## 🎯 О проекте

**«Цифровое месторождение»** — промышленный веб-дашборд для операторов нефтепромыслового
оборудования (ЦДНГ). Система в реальном времени отслеживает телеметрию **10 скважин**:
ток, затрубное и нагнетательное давление, температуру, дебит жидкости и нефти, обводнённость
и частоту качаний.

**Ключевые возможности:**

- 📡 Real-time графики телеметрии с автообновлением каждые 3 секунды
- 🏥 Индекс здоровья скважины (Health Index 0–100) по каждому параметру и сводный
- 🔔 Трёхуровневая система алертов: critical / warning / predictive
- 🔮 Предиктивная аналитика — прогноз аварии по тренду (линейная регрессия)
- 🔍 Расследование инцидентов: срез данных за 24 часа до аварии с графиками
- 🎓 Обучающий режим с подсказками для молодых специалистов

---

## 🛠 Технологии

### Backend

| Технология | Назначение |
|---|---|
| Python 3.10+ | Язык |
| Django 5.0 + DRF | REST API |
| SQLite | База данных (для разработки) |
| django-unfold | Красивая тёмная админка |
| openpyxl | Экспорт в Excel |
| reportlab | Экспорт в PDF |
| numpy | Расчёты health index и регрессии |

### Frontend

| Технология | Назначение |
|---|---|
| React 18 + Vite | SPA-фреймворк и сборка |
| Tailwind CSS | Дизайн-система (тёмная тема) |
| Recharts | Графики телеметрии |
| React Router | Навигация |
| Axios | HTTP-клиент |

---

## 📁 Структура проекта

```
digital-oilfield/
├── backend/
│   ├── backend/                    # Настройки Django (settings.py, urls.py)
│   ├── static/admin/css/           # Кастомный CSS для админки
│   ├── wells/                      # Основное приложение
│   │   ├── models.py               # Well, TelemetryData, Alert, TrainingTip
│   │   ├── views.py                # REST API (ViewSet + /repair/)
│   │   ├── admin.py                # Админка с цветными бейджами статусов
│   │   ├── services/               # health_calculator, alert_generator,
│   │   │                           # excel_export, pdf_export, prediction
│   │   └── management/commands/    # simulate_telemetry, simulate_once,
│   │                               # create_test_data, create_superuser
│   ├── manage.py
│   ├── fix_cdng.py                 # Утилита распределения скважин по ЦДНГ
│   ├── test_system.py              # Тесты бэкенда
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/             # 9 компонентов (WellCard, TelemetryChart,
│   │   │                           # InvestigationModal, HealthGauge и др.)
│   │   ├── pages/                  # Dashboard, WellDetail, AlertsPage, ReportsPage
│   │   └── services/               # api.js (axios + endpoints)
│   ├── test_frontend.js            # Статическая проверка фронтенда
│   └── package.json
├── screenshots/                    # Скриншоты интерфейса
├── test_all.py                     # Комплексная проверка всего проекта
└── README.md
```

---

## 🚀 Быстрый старт

### Требования

- **Python 3.10+** — [скачать](https://python.org)
- **Node.js 18+** — [скачать](https://nodejs.org)
- **Git** — [скачать](https://git-scm.com)

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
python manage.py create_superuser      # Логин: admin / admin123
python manage.py create_test_data      # Создаст 10 скважин + подсказки
python manage.py simulate_once         # Первая порция телеметрии
python manage.py runserver             # http://127.0.0.1:8000
```

### 3. Frontend (React)

```bash
# В НОВОМ терминале
cd frontend
npm install
npm run dev                            # http://localhost:5173
```

### 4. Открыть сайт

| Ссылка | Что там |
|---|---|
| 🌐 **http://localhost:5173** | Основной интерфейс (дашборд) |
| 🔐 **http://127.0.0.1:8000/admin/** | Админка (admin / admin123) |

> 💡 Чтобы данные «жили» постоянно, в третьем терминале запустите
> `python manage.py simulate_telemetry --continuous` (см. раздел про симулятор).

---

## ✨ Функционал

- 📊 **Дашборд** со списком из 10 скважин, KPI-карточками и фильтрами по ЦДНГ и статусу
- 📈 **Детальная страница скважины** с 8 графиками телеметрии (обновление каждые 3 сек)
- ❤️ **Индекс здоровья** (0–100) — gauge-диаграмма по каждому параметру
- 🔔 **Система алертов** (critical / warning / predictive) с автозакрытием нормальных событий;
  аварийные скважины НЕ «чинятся» сами — только ручным перезапуском
- 🔍 **Модальное окно расследования** инцидентов: срез за 24 ч, графики с ReferenceLine аномалий
- 🎓 **Обучающий режим** с подсказками для молодых специалистов (toggle «?»)
- 🔮 **Предиктивные алерты** — прогноз приближающейся аварии через линейную регрессию
- 📥 **Экспорт** телеметрии и сменных отчётов в **Excel** и **PDF**
- 🔧 **Ручной перезапуск** скважин после ремонта (кнопка UI, API `/repair/`, action в админке)
- 🗂 **Админка Unfold**: тёмная тема, цветные бейджи статусов, сайдбар «Мониторинг / Обучение»

---

## 🌐 API эндпоинты

Базовый URL: `http://127.0.0.1:8000/api/`

| Метод | URL | Описание |
|---|---|---|
| GET | `/wells/` | Список скважин (`?status=alarm&cdng=ЦДНГ-2`) |
| GET | `/wells/{id}/` | Детали скважины |
| GET | `/wells/{id}/telemetry/?period=24h` | Телеметрия (1h / 6h / 24h / 7d) |
| GET | `/wells/{id}/alerts/` | Алерты скважины |
| GET | `/wells/{id}/investigate/?alert_id=N` | Данные для расследования инцидента |
| POST | `/wells/{id}/repair/` | Завершить ремонт (перезапуск + закрытие алертов) |
| POST | `/wells/export/telemetry/` | Экспорт телеметрии в Excel |
| POST | `/wells/export/telemetry-pdf/` | Экспорт телеметрии в PDF |
| POST | `/wells/export/shift-report/` | Сменный отчёт Excel |
| POST | `/wells/export/shift-report-pdf/` | Сменный отчёт PDF |
| GET | `/alerts/` | Все алерты (`?is_active=true`) |
| GET | `/training-tips/` | Обучающие подсказки |

Пример:

```bash
curl -X POST http://127.0.0.1:8000/api/wells/1/repair/
# {"status":"success","message":"Скважина №101 перезапущена после ремонта",...}
```

---

## 🤖 Симулятор телеметрии

Генерирует реалистичные данные телеметрии, считает health index и создаёт алерты.

```bash
cd backend

# Однократная генерация для всех скважин
python manage.py simulate_once
# то же самое:
python manage.py simulate_telemetry --once

# Непрерывный режим (новая порция данных каждые 5 секунд)
python manage.py simulate_telemetry --continuous

# С аномалиями (обрыв штанг, перегрев — 5% шанс на цикл)
python manage.py simulate_telemetry --continuous --with-anomalies

# Генерация с «мёртвыми» данными для скважин в аварии/ремонте
# (команда всегда проходит по всем активным скважинам: is_active=True)
python manage.py simulate_telemetry --once
```

Особенности бизнес-логики:

- Скважина в статусе `alarm` / `maintenance` получает **«мёртвые» данные**
  (ток = 0, дебит = 0, health_index = 0) и **не чинится автоматически**;
- Возврат в `online` — только вручную: кнопка «🔧 Завершить ремонт»,
  `POST /api/wells/{id}/repair/` или action в админке.

---

## 🧪 Тестирование

```bash
# Комплексная проверка всего проекта (из корня)
python test_all.py
# Ожидаемый финал: 🎉 ВСЕ КОМПОНЕНТЫ РАБОТАЮТ КОРРЕКТНО

# Только backend
cd backend && python test_system.py

# Только frontend (статический анализ исходников)
cd frontend && node test_frontend.js

# Сборка фронтенда
cd frontend && npm run build          # должно быть "✓ built"

# Проверка Django
cd backend && python manage.py check  # "System check identified no issues"
```

---

## ❓ Возможные проблемы

### 1. PowerShell: «выполнение сценариев отключено»

```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
```

Или используйте CMD вместо PowerShell.

### 2. «npm не распознано как команда»

Node.js не в PATH. Добавьте:

```cmd
set PATH=C:\Program Files\nodejs;%PATH%
```

или переустановите Node.js с галочкой «Add to PATH».

### 3. «Address already in use» на порту 8000

```cmd
:: Windows
taskkill /F /IM python.exe
```

```bash
# Linux/Mac
pkill -f "manage.py runserver"
```

### 4. Белая страница в браузере

Откройте DevTools (F12) → Console. Чаще всего не запущен backend
(`python manage.py runserver`) или база пуста — выполните `create_test_data`
и `simulate_once`.

### 5. Скважины все в ЦДНГ-1

Запустите утилиту распределения:

```bash
cd backend
python fix_cdng.py
```

или одной командой:

```bash
python manage.py shell -c "from wells.models import Well; Well.objects.filter(number__in=['105','106','107']).update(cdng='ЦДНГ-2'); Well.objects.filter(number__in=['108','109','110']).update(cdng='ЦДНГ-3')"
```

### 6. Кнопка «Завершить ремонт» возвращает 403

Убедитесь, что вы на актуальной версии (`git pull`) — эндпоинт `/repair/`
работает без авторизации (`permission_classes=[AllowAny]`).

---

## 📞 Контакты

Разработчик: студент-практикант  
Практика: Татнефть / Альметьевский государственный нефтяной институт  
Дата: Ноябрь 2026

## 📄 Лицензия

Учебный проект. Все права защищены.

---

**Сделано с ❤️ для цифровизации нефтепромыслов**
