from rest_framework import serializers
from .models import Patient

class PatientSerializer(serializers.ModelSerializer):
    firstName = serializers.CharField(source='first_name')
    lastName = serializers.CharField(source='last_name')
    dateOfBirth = serializers.CharField(source='date_of_birth')
    bloodGroup = serializers.CharField(source='blood_group', required=False, allow_null=True, allow_blank=True)
    phoneNumber = serializers.CharField(source='phone_number')
    emergencyContactName = serializers.CharField(source='emergency_contact_name', required=False, allow_null=True, allow_blank=True)
    emergencyContactPhone = serializers.CharField(source='emergency_contact_phone', required=False, allow_null=True, allow_blank=True)
    chronicConditions = serializers.ListField(source='chronic_conditions', required=False, default=list)
    allergies = serializers.ListField(required=False, default=list)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    uhid = serializers.CharField(required=False)

    class Meta:
        model = Patient
        fields = [
            'id', 'uhid', 'firstName', 'lastName', 'dateOfBirth',
            'gender', 'bloodGroup', 'phoneNumber', 'email',
            'emergencyContactName', 'emergencyContactPhone', 'address',
            'allergies', 'chronicConditions', 'createdAt'
        ]

    def create(self, validated_data):
        if not validated_data.get('uhid'):
            validated_data['uhid'] = Patient.generate_uhid()
        return super().create(validated_data)
