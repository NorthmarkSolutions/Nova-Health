from rest_framework import serializers
from .models import LabTest, LabOrder, LabResult

class LabTestSerializer(serializers.ModelSerializer):
    testCode = serializers.CharField(source='test_code')
    sampleType = serializers.CharField(source='sample_type')
    containerType = serializers.CharField(source='container_type')
    turnaroundHours = serializers.IntegerField(source='turnaround_hours')
    isActive = serializers.BooleanField(source='is_active')

    class Meta:
        model = LabTest
        fields = ['id', 'testCode', 'name', 'department', 'sampleType', 'containerType', 'turnaroundHours', 'price', 'isActive']

class LabResultSerializer(serializers.ModelSerializer):
    paramName = serializers.CharField(source='parameter_name')
    observedValue = serializers.CharField(source='observed_value')
    referenceRange = serializers.CharField(source='reference_range')
    isAbnormal = serializers.BooleanField(source='is_abnormal')

    class Meta:
        model = LabResult
        fields = ['id', 'paramName', 'observedValue', 'referenceRange', 'unit', 'isAbnormal']

class LabOrderSerializer(serializers.ModelSerializer):
    orderNo = serializers.CharField(source='order_number', read_only=True)
    patientName = serializers.SerializerMethodField()
    uhid = serializers.CharField(source='patient.uhid', read_only=True)
    testName = serializers.SerializerMethodField()
    category = serializers.SerializerMethodField()
    sampleType = serializers.SerializerMethodField()
    container = serializers.SerializerMethodField()
    doctor = serializers.SerializerMethodField()
    stage = serializers.CharField(source='status')
    price = serializers.SerializerMethodField()
    isFlaggedAbnormal = serializers.BooleanField(source='is_flagged_abnormal', read_only=True)
    parameters = LabResultSerializer(source='results', many=True, read_only=True)
    technicianNote = serializers.CharField(source='technician_note', required=False, allow_null=True, allow_blank=True)
    pathologistRemarks = serializers.CharField(source='pathologist_remarks', required=False, allow_null=True, allow_blank=True)

    class Meta:
        model = LabOrder
        fields = [
            'id', 'orderNo', 'patientName', 'uhid', 'testName', 'category',
            'sampleType', 'container', 'doctor', 'barcode', 'stage',
            'price', 'isFlaggedAbnormal', 'parameters', 'technicianNote', 'pathologistRemarks'
        ]

    def get_patientName(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}"

    def get_testName(self, obj):
        return obj.test.name if obj.test else "Investigation Panel"

    def get_category(self, obj):
        return obj.test.department if obj.test else "General Pathology"

    def get_sampleType(self, obj):
        return obj.test.sample_type if obj.test else "Blood"

    def get_container(self, obj):
        return obj.test.container_type if obj.test else "Lavender Top"

    def get_doctor(self, obj):
        return f"Dr. {obj.doctor.user.get_full_name()}" if obj.doctor and obj.doctor.user else "Dr. Sarah Jenkins"

    def get_price(self, obj):
        return float(obj.test.price) if obj.test else 50.0
