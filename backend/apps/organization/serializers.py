from rest_framework import serializers
from .models import HospitalProfile, Department, Room, Bed

class HospitalProfileSerializer(serializers.ModelSerializer):
    emergencyPhone = serializers.CharField(source='emergency_phone', required=False, allow_blank=True, default='')
    postalCode = serializers.CharField(source='postal_code', required=False, allow_blank=True, default='')
    taxId = serializers.CharField(source='tax_id', required=False, allow_blank=True, default='')
    logoUrl = serializers.CharField(source='logo_url', required=False, allow_null=True, allow_blank=True)

    class Meta:
        model = HospitalProfile
        fields = [
            'id', 'name', 'tagline', 'email', 'phone', 'emergencyPhone',
            'address', 'city', 'state', 'postalCode', 'country',
            'taxId', 'accreditation', 'currency', 'timezone', 'logoUrl'
        ]

class DepartmentSerializer(serializers.ModelSerializer):
    departmentType = serializers.CharField(source='department_type')
    headOfDepartment = serializers.CharField(source='head_of_department', allow_null=True, required=False)
    roomNumber = serializers.CharField(source='room_number', allow_null=True, required=False)
    floorNumber = serializers.IntegerField(source='floor_number')
    isActive = serializers.BooleanField(source='is_active')

    class Meta:
        model = Department
        fields = ['id', 'code', 'name', 'departmentType', 'headOfDepartment', 'roomNumber', 'floorNumber', 'isActive']

class BedSerializer(serializers.ModelSerializer):
    bedNumber = serializers.CharField(source='bed_number')
    bedType = serializers.CharField(source='bed_type')
    dailyTariff = serializers.DecimalField(source='daily_tariff', max_digits=10, decimal_places=2)
    currentPatientUhid = serializers.CharField(source='current_patient_uhid', allow_null=True, required=False)
    currentPatientName = serializers.CharField(source='current_patient_name', allow_null=True, required=False)

    class Meta:
        model = Bed
        fields = ['id', 'bedNumber', 'bedType', 'status', 'dailyTariff', 'currentPatientUhid', 'currentPatientName', 'notes']
