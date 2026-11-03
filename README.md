# Цифровое месторождение (Digital Oilfield)

Веб-дашборд для мониторинга телеметрии нефтепромыслового оборудования (скважин).

## Стек технологий

- **Backend:** Django 5.0 + Django REST Framework, django-cors-headers, SQLite
- **Frontend:** React 18 + Vite + Recharts + Tailwind CSS
- **Дополнительно:** openpyxl / reportlab (экспорт отчётов), numpy (расчёты)

## Функциональность

- 📡 Мониторинг телеметрии скважин в реальном времени (давление, дебит, температура и др.)
- ❤️ Индекс здоровья скважины (Health Index) на основе анализа показателей
- 🚨 Система алертов и предупреждений о неисправностях
- 🎓 Обучающий режим (тренажёр для операторов ДНС)
- 📤 Экспорт данных и отчётов (Excel / PDF)

## Структура проекта

```
digital-oilfield/
├── backend/          # Django приложение (API)
│   ├── backend/      # настройки проекта
│   ├── wells/        # основное приложение (скважины, телеметрия, алерты)
│   └── manage.py
├── frontend/         # React приложение (Vite)
│   └── src/
│       ├── components/
│       ├── pages/    # Dashboard, WellDetail
│       └── services/ # api.js (axios)
└── README.md
```

## Запуск Backend

```bash
cd backend

# Создание виртуального окружения
python3 -m venv venv
source venv/bin/activate        # Linux/macOS
# venv\Scripts\activate         # Windows

# Установка зависимостей
pip install -r requirements.txt

# Миграции базы данных
python manage.py migrate

# Запуск dev-сервера
python manage.py runserver      # http://localhost:8000
```

## Запуск Frontend

```bash
cd frontend

# Установка зависимостей
npm install

# Запуск dev-сервера
npm run dev                     # http://localhost:5173
```

Vite настроен с прокси: все запросы к `/api` перенаправляются на
`http://localhost:8000` (Django), поэтому фронтенд и бэкенд работают
без проблем с CORS в режиме разработки.

## Полезные ссылки

- Admin-панель Django: http://localhost:8000/admin/
- API: http://localhost:8000/api/
