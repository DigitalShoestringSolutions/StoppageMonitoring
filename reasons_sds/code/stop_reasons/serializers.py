from rest_framework import serializers

from . import models


class ReasonSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Reason
        fields = ('id', 'text', 'category')

class MachineSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Machine
        fields = ('id', 'name','sensor')

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Category
        fields = ('id', 'text', 'hexcolor')
