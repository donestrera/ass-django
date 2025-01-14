from django.urls import path
from . import views
from . import auth
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('sensor-data/', views.SensorDataView.as_view(), name='sensor-data'),
    path('clear-motion-history/', views.clear_motion_history, name='clear-motion-history'),
    path('control-pir/', views.control_pir, name='control-pir'),
    path('auth/register/', auth.register, name='register'),
    path('auth/login/', auth.MyTokenObtainPairView.as_view(), name='login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
] 