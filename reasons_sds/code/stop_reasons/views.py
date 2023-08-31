from django.db.models import Q
from django.http import HttpResponse
from django.conf import settings
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes, renderer_classes
from rest_framework.permissions import IsAuthenticatedOrReadOnly, AllowAny
from rest_framework.renderers import JSONRenderer, BrowsableAPIRenderer
from rest_framework.response import Response

from . import models
from . import serializers

@api_view(('GET',))
@renderer_classes((JSONRenderer,BrowsableAPIRenderer))
def getMachines(request):
    operations_qs = models.Machine.objects.all()
    serializer = serializers.MachineSerializer(operations_qs,many=True)
    return Response(serializer.data)

@api_view(('GET',))
@renderer_classes((JSONRenderer,BrowsableAPIRenderer))
def getMachineReasons(request,machine_id):
    machine = models.Machine.objects.get(id=machine_id)
    reasons_qs = machine.reason_mapping.all()

    serializer = serializers.ReasonSerializer(reasons_qs,many=True)
    reasons = serializer.data #[{"category":<>,"id":<>,"text":<>},...]
    
    reason_set = {}
    output = []
    for reason in reasons:
        key = reason['category'] if reason['category'] else 'none'
        
        if reason_set.get(key) is None:
            reason_set[key] = []

            if key=="none":
                output.append({"category_id":"none","category_name":"No Category", 'colour':'#DCDCDC'})
            else:
                category = models.Category.objects.get(pk=key)
                output.append({"category_id":key,"category_name":category.text, 'colour':category.hexcolor}) 

        reason_set[key].append(reason)

    for item in output:
        item['reasons'] = reason_set[item['category_id']]
            
    return Response(output)


