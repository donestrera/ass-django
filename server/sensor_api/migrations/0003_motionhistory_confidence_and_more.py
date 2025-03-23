# Generated by Django 4.2.19 on 2025-03-05 03:40

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sensor_api', '0002_motionhistory_humidity_motionhistory_temperature'),
    ]

    operations = [
        migrations.AddField(
            model_name='motionhistory',
            name='confidence',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='motionhistory',
            name='detection_type',
            field=models.CharField(choices=[('pir', 'PIR Sensor'), ('yolo', 'YOLO Detection')], default='pir', max_length=10),
        ),
    ]
