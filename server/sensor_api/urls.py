from django.urls import path
from . import views
from . import auth
from rest_framework_simplejwt.views import TokenRefreshView
from .views import ImageUploadView
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('sensor-data/', views.SensorDataView.as_view(), name='sensor-data'),
    path('clear-motion-history/', views.clear_motion_history, name='clear-motion-history'),
    path('control-pir/', views.control_pir, name='control-pir'),
    path('auth/register/', auth.register, name='register'),
    path('auth/login/', auth.MyTokenObtainPairView.as_view(), name='login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('upload-image/', ImageUploadView.as_view(), name='upload-image'),
    path('person-detected/', views.person_detected, name='person-detected'),
    path('captured-images/', views.captured_images, name='captured-images'),
    path('motion-history/', views.motion_history, name='motion-history'),
    path('delete-image/<str:filename>/', views.delete_captured_image, name='delete-image'),
    path('delete-multiple-images/', views.delete_multiple_images, name='delete-multiple-images'),
] 