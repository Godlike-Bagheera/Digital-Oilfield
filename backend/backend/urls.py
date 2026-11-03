"""backend URL Configuration"""
from django.contrib import admin
from django.urls import path, include
from unfold.sites import UnfoldAdminSite

# Заменяем стандартный AdminSite на Unfold (красивая тема админки)
admin.site = UnfoldAdminSite()
admin.site.site_header = "Цифровое месторождение - Администрирование"
admin.site.site_title = "Цифровое месторождение"
admin.site.index_title = "Панель управления"

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('wells.urls')),
]

from django.conf import settings
from django.conf.urls.static import static

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
