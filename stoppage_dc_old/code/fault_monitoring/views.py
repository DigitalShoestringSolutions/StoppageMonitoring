from django.http import HttpResponse
from django.shortcuts import render, redirect
from django.conf import settings
from .models import Machine, Category
import json


# def display_machines(request):
#     machines = Machine.objects.all()
#     serialised_machines = [{'id': machine.id, 'name': machine.name} for machine in machines]
#     print(serialised_machines)
#     return render(request, 'list.html', {'machines': serialised_machines})


def get_machines(request):
    machines = Machine.objects.all()
    serialised_machines = [{'id': machine.id, 'name': machine.name} for machine in machines]
    return HttpResponse(json.dumps(serialised_machines), content_type="application/json")


def get_reasons(request, machine_id):
    try:
        machine = Machine.objects.get(id=machine_id)
        reasons = machine.reason_mapping.all()

        reason_set = {}
        for reason in reasons:
            pk = "none"
            if reason.category:
                pk = reason.category.pk
            if reason_set.get(pk) is None:
                reason_set[pk] = []
            reason_set[pk].append({'id': reason.id, 'text': reason.text})

        output = []
        for category_key, cat_reasons in reason_set.items():
            if category_key == "none":
                output.append({'category_id': category_key, 'category_name': "No Category", 'colour':'#DCDCDC','reasons':cat_reasons})
            else:
                category = Category.objects.get(pk=category_key)
                output.append({'category_id': category_key, 'category_name': category.text, 'colour': category.hexcolor,'reasons': cat_reasons})

        return HttpResponse(json.dumps(output), content_type="application/json")
    except Machine.DoesNotExist:
        return HttpResponse(status=404)


def render_app(request):
    return render(
        request,
        'index.html',
        {}
    )
