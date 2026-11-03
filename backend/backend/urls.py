"""backend URL Configuration"""
from django.contrib import admin
from django.urls import path, include

# ВАЖНО: НЕ заменяем admin.site на UnfoldAdminSite вручную — это ломает
# регистрацию моделей (создаётся новый пустой объект админки).
# Тема Unfold подхватывается автоматически из INSTALLED_APPS и UNFOLD настроек.

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('wells.urls')),
]

from django.conf import settings
from django.conf.urls.static import static

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
