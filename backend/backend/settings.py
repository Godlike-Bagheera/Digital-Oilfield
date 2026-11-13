"""
Django settings for backend project (Цифровое месторождение).
"""
from pathlib import Path
from django.templatetags.static import static

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = 'django-insecure-o1f3ld-digital-oilfield-dev-key-change-me'
DEBUG = True
ALLOWED_HOSTS = ['*']

INSTALLED_APPS = [
    'unfold',                  # ОБЯЗАТЕЛЬНО ПЕРЕД admin
    'unfold.contrib.filters',
    'unfold.contrib.forms',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third-party
    'rest_framework',
    'corsheaders',
    # Local
    'wells',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'backend.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'ru-ru'
TIME_ZONE = 'Europe/Moscow'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
# ВАЖНО: указываем папку со статикой проекта, чтобы Django нашел наш CSS
STATICFILES_DIRS = [
    BASE_DIR / 'wells' / 'static',
]

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

CORS_ALLOWED_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173']
CORS_ALLOW_ALL_ORIGINS = True

# ВАЖНО: фикс 403 (CSRF). Разрешаем запросы с фронтенда (Vite)


CSRF_TRUSTED_ORIGINS = [
    'http://localhost:8084',
    'http://127.0.0.1:8084',
    'http://localhost:5173',
    'http://localhost:8000',
]

REST_FRAMEWORK = {
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# ==================== UNFOLD НАСТРОЙКИ ====================
UNFOLD = {
    "SITE_TITLE": "Цифровое месторождение",
    "SITE_HEADER": "Цифровое месторождение",
    "SITE_SYMBOL": "oil_barrel",
    "SHOW_HISTORY": True,
    "SHOW_VIEW_ON_SITE": False,
    "DARK_MODE": True,
    "BORDER_RADIUS": "10px",
    "STYLES": [
        # Подключаем наш кастомный CSS
        lambda request: static("admin/css/custom_admin.css"),
    ],
    "COLORS": {
        "base": {
            "50": "244 244 245", "100": "228 228 231", "200": "212 212 216",
            "300": "161 161 170", "400": "113 113 122", "500": "82 82 91",
            "600": "63 63 70", "700": "39 39 42", "800": "24 24 27",
            "900": "18 18 21", "950": "9 9 11",
        },
        "primary": {
            "50": "239 246 255", "100": "219 234 254", "200": "191 219 254",
            "300": "147 197 253", "400": "96 165 250", "500": "59 130 246",
            "600": "37 99 235", "700": "29 78 216", "800": "30 64 175",
            "900": "30 58 138", "950": "23 37 84",
        },
    },
    "SIDEBAR": {
        "show_search": True,
        "show_all_applications": False,
        "navigation": [
            {
                "title": "Мониторинг",
                "separator": True,
                "items": [
                    {"title": "Скважины", "icon": "oil_barrel", "link": "/admin/wells/well/"},
                    {"title": "Телеметрия", "icon": "monitoring", "link": "/admin/wells/telemetrydata/"},
                    {"title": "Алерты", "icon": "warning", "link": "/admin/wells/alert/"},
                ],
            },
            {
                "title": "Обучение",
                "separator": True,
                "items": [
                    {"title": "Подсказки", "icon": "school", "link": "/admin/wells/trainingtip/"},
                ],
            },
        ],
    },
}
