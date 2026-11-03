"""Маршруты REST API приложения wells."""
from rest_framework.routers import DefaultRouter

from wells.views import AlertViewSet, TrainingTipViewSet, WellViewSet

router = DefaultRouter()
router.register(r'wells', WellViewSet, basename='well')
router.register(r'alerts', AlertViewSet, basename='alert')
router.register(r'training-tips', TrainingTipViewSet, basename='training-tip')

urlpatterns = router.urls
