# Generated by Django 3.2.16 on 2023-06-23 11:16

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('stop_reasons', '0003_auto_20230126_1617'),
    ]

    operations = [
        migrations.AddField(
            model_name='machine',
            name='sensor',
            field=models.BooleanField(default=False, help_text='Set to true if running status is based on a sensor value'),
        ),
    ]
