from django.db import models
from django.utils.html import format_html


class Machine(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=60)
    sensor = models.BooleanField(default=False,help_text="Set to true if running status is based on a sensor value")

    def __str__(self):
        return self.name


class Category(models.Model):
    id = models.BigAutoField(primary_key=True)
    text = models.CharField(max_length=60)
    hexcolor = models.CharField(max_length=7, default='#ff0000')

    def __str__(self):
        return self.text
    
    class Meta:
        verbose_name_plural = "categories"


class Reason(models.Model):
    id = models.BigAutoField(primary_key=True)
    text = models.CharField(max_length=60)
    machine_mapping = models.ManyToManyField(Machine, through='MachineReasonMap',
                                             related_name="reason_mapping")
    category = models.ForeignKey(Category, on_delete=models.CASCADE, blank=True, null=True)

    def __str__(self):
        return self.text


class MachineReasonMap(models.Model):
    id = models.BigAutoField(primary_key=True)
    reason = models.ForeignKey(Reason, on_delete=models.CASCADE)
    machine = models.ForeignKey(Machine, on_delete=models.CASCADE)
