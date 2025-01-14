from django.urls import path
from .views import SensorDataView

urlpatterns = [
    path('sensor-data/', SensorDataView.as_view(), name='sensor-data'),
] 