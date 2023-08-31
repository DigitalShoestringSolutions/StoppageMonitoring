from django.contrib import admin
from . import models


class MachineReasonMapInline(admin.TabularInline):
    model = models.MachineReasonMap
    extra = 1


@admin.register(models.Machine)
class MachineAdmin(admin.ModelAdmin):
    list_display = ('name','sensor')
    fields = ('id', 'name','sensor')
    readonly_fields = ('id',)
    inlines = (MachineReasonMapInline,)


@admin.register(models.Reason)
class ReasonAdmin(admin.ModelAdmin):
    list_display = ('text',)
    fields = ('id', 'text', 'category')
    readonly_fields = ('id',)
    inlines = (MachineReasonMapInline,)


@admin.register(models.Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('text',)
    fields = ('id', 'text', 'hexcolor')
    readonly_fields = ('id',)
    # inlines = (CategoryReasonMapInline,)

