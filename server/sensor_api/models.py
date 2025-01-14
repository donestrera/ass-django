from django.db import models
from django.utils import timezone
from datetime import timedelta

# Create your models here.

class MotionHistory(models.Model):
    timestamp = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)  # To track if motion event is still ongoing
    temperature = models.FloatField(null=True)
    humidity = models.FloatField(null=True)
    
    def __str__(self):
        return f"Motion detected at {self.timestamp}"
    
    @classmethod
    def can_create_new_entry(cls, debounce_seconds=2):
        """Check if enough time has passed since the last entry to create a new one"""
        latest_entry = cls.objects.order_by('-timestamp').first()
        if not latest_entry:
            return True
        
        time_threshold = timezone.now() - timedelta(seconds=debounce_seconds)
        return latest_entry.timestamp < time_threshold
