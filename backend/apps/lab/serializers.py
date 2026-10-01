from rest_framework import serializers
from .models import (
    LabTest,
    LabOrder,
    LabOrderItem,
    LabResult,
    LabReport,
    Equipment,
    EquipmentMaintenanceLog,
)
from apps.accounts.models import User

class LabTestSerializer(serializers.ModelSerializer):
    testCode = serializers.CharField(source='test_code', required=False)
    sampleType = serializers.CharField(source='sample_type', required=False)
    specimenType = serializers.CharField(source='specimen_type', required=False)
    containerType = serializers.CharField(source='container_type', required=False)
    containerColor = serializers.CharField(source='container_color', required=False)
    turnaroundHours = serializers.IntegerField(source='turnaround_hours', required=False)
    tatMinutes = serializers.IntegerField(source='tat_minutes', required=False)
    tpaPrice = serializers.DecimalField(source='tpa_price', max_digits=10, decimal_places=2, required=False)
    statSurcharge = serializers.CharField(source='stat_surcharge', required=False)
    isActive = serializers.BooleanField(source='is_active', required=False)
    normalRanges = serializers.JSONField(source='normal_ranges', required=False)
    parametersSchema = serializers.JSONField(source='parameters_schema', required=False)

    class Meta:
        model = LabTest
        fields = [
            'id', 'test_code', 'testCode', 'name', 'category', 'department',
            'sample_type', 'sampleType', 'specimen_type', 'specimenType',
            'container_type', 'containerType', 'container_color', 'containerColor',
            'turnaround_hours', 'turnaroundHours', 'tat_minutes', 'tatMinutes',
            'price', 'tpa_price', 'tpaPrice', 'stat_surcharge', 'statSurcharge',
            'is_active', 'isActive', 'normal_ranges', 'normalRanges',
            'parameters_schema', 'parametersSchema', 'created_at', 'updated_at'
        ]

class LabResultSerializer(serializers.ModelSerializer):
    paramName = serializers.CharField(source='parameter_name', required=False)
    observedValue = serializers.CharField(source='observed_value', required=False)
    measuredValue = serializers.CharField(source='measured_value', required=False, allow_blank=True, allow_null=True)
    referenceRange = serializers.CharField(source='reference_range', required=False)
    isAbnormal = serializers.BooleanField(source='is_abnormal', required=False)
    technicianNotes = serializers.CharField(source='technician_notes', required=False, allow_blank=True, allow_null=True)
    isDeltaFlagged = serializers.BooleanField(source='is_delta_flagged', required=False)
    previousValue = serializers.CharField(source='previous_value', required=False, allow_blank=True, allow_null=True)
    previousDate = serializers.DateTimeField(source='previous_date', required=False, allow_null=True)
    enteredByName = serializers.SerializerMethodField()

    class Meta:
        model = LabResult
        fields = [
            'id', 'lab_order', 'order_item', 'parameter_name', 'paramName',
            'observed_value', 'observedValue', 'measured_value', 'measuredValue',
            'reference_range', 'referenceRange', 'unit', 'flag', 'is_abnormal', 'isAbnormal',
            'technician_notes', 'technicianNotes', 'entered_by', 'enteredByName',
            'entered_at', 'is_delta_flagged', 'isDeltaFlagged', 'previous_value', 'previousValue',
            'previous_date', 'previousDate'
        ]

    def get_enteredByName(self, obj):
        return obj.entered_by.get_full_name() if obj.entered_by else None

class LabOrderItemSerializer(serializers.ModelSerializer):
    test_details = LabTestSerializer(source='test', read_only=True)

    class Meta:
        model = LabOrderItem
        fields = ['id', 'order', 'test', 'test_details', 'status', 'created_at']

class LabReportSerializer(serializers.ModelSerializer):
    approvedByName = serializers.SerializerMethodField()
    amendedByName = serializers.SerializerMethodField()
    orderNumber = serializers.CharField(source='order.order_number', read_only=True)

    class Meta:
        model = LabReport
        fields = [
            'id', 'order', 'orderNumber', 'approved_by', 'approvedByName', 'approved_at',
            'pathologist_remarks', 'report_pdf', 'digital_signature', 'is_amended',
            'amendment_reason', 'amended_at', 'amended_by', 'amendedByName',
            'created_at', 'updated_at'
        ]

    def get_approvedByName(self, obj):
        return f"Dr. {obj.approved_by.get_full_name()}" if obj.approved_by else None

    def get_amendedByName(self, obj):
        return f"Dr. {obj.amended_by.get_full_name()}" if obj.amended_by else None

class LabOrderSerializer(serializers.ModelSerializer):
    orderNo = serializers.CharField(source='order_number', read_only=True)
    patientName = serializers.SerializerMethodField()
    patientAge = serializers.SerializerMethodField()
    patientGender = serializers.SerializerMethodField()
    uhid = serializers.CharField(source='patient.uhid', read_only=True)
    testName = serializers.SerializerMethodField()
    category = serializers.SerializerMethodField()
    sampleType = serializers.SerializerMethodField()
    container = serializers.SerializerMethodField()
    containerColor = serializers.SerializerMethodField()
    doctor = serializers.SerializerMethodField()
    stage = serializers.CharField(source='status')
    price = serializers.SerializerMethodField()
    isFlaggedAbnormal = serializers.BooleanField(source='is_flagged_abnormal', read_only=True)
    isFlaggedCritical = serializers.BooleanField(source='is_flagged_critical', read_only=True)
    isRetest = serializers.BooleanField(source='is_retest', read_only=True)
    parameters = LabResultSerializer(source='results', many=True, read_only=True)
    report = LabReportSerializer(read_only=True)
    technicianNote = serializers.CharField(source='technician_note', required=False, allow_null=True, allow_blank=True)
    pathologistRemarks = serializers.CharField(source='pathologist_remarks', required=False, allow_null=True, allow_blank=True)

    class Meta:
        model = LabOrder
        fields = [
            'id', 'order_number', 'orderNo', 'patient', 'patientName', 'patientAge', 'patientGender',
            'uhid', 'test', 'testName', 'category', 'sampleType', 'container', 'containerColor',
            'doctor', 'barcode', 'priority', 'status', 'stage', 'clinical_notes', 'encounter_id',
            'ordered_at', 'collected_at', 'sample_collector', 'price',
            'is_flagged_abnormal', 'isFlaggedAbnormal', 'is_flagged_critical', 'isFlaggedCritical',
            'critical_acknowledged_at', 'critical_acknowledged_by',
            'is_retest', 'isRetest', 'retest_reason', 'retest_routing',
            'technician_note', 'technicianNote', 'pathologist_remarks', 'pathologistRemarks',
            'parameters', 'report', 'created_at', 'updated_at'
        ]

    def get_patientName(self, obj):
        if not obj.patient:
            return "Walk-in Patient"
        return f"{obj.patient.first_name} {obj.patient.last_name}".strip()

    def get_patientAge(self, obj):
        return getattr(obj.patient, 'age', 35) if obj.patient else 35

    def get_patientGender(self, obj):
        return getattr(obj.patient, 'gender', 'Other') if obj.patient else 'Other'

    def get_testName(self, obj):
        return obj.test.name if obj.test else "Diagnostic Investigation"

    def get_category(self, obj):
        return obj.test.category if obj.test else (obj.test.department if obj.test else "General Pathology")

    def get_sampleType(self, obj):
        return obj.test.sample_type if obj.test else "Blood"

    def get_container(self, obj):
        return obj.test.container_type if obj.test else "Lavender Top"

    def get_containerColor(self, obj):
        return obj.test.container_color if obj.test else "Lavender"

    def get_doctor(self, obj):
        if obj.doctor and obj.doctor.user:
            return f"Dr. {obj.doctor.user.get_full_name()}"
        return "Dr. Sarah Jenkins"

    def get_price(self, obj):
        return float(obj.test.price) if obj.test else 50.0

class EquipmentMaintenanceLogSerializer(serializers.ModelSerializer):
    performedByName = serializers.SerializerMethodField()

    class Meta:
        model = EquipmentMaintenanceLog
        fields = ['id', 'equipment', 'log_type', 'performed_by', 'performedByName', 'notes', 'date']

    def get_performedByName(self, obj):
        return obj.performed_by.get_full_name() if obj.performed_by else None

class EquipmentSerializer(serializers.ModelSerializer):
    serialNumber = serializers.CharField(source='serial_number', required=False)
    lastPmDate = serializers.DateField(source='last_pm_date', required=False, allow_null=True)
    nextPmDate = serializers.DateField(source='next_pm_date', required=False, allow_null=True)
    serviceContract = serializers.CharField(source='service_contract', required=False, allow_blank=True, allow_null=True)
    errorCode = serializers.CharField(source='error_code', required=False, allow_blank=True, allow_null=True)
    isActive = serializers.BooleanField(source='is_active', required=False)
    maintenanceLogs = EquipmentMaintenanceLogSerializer(source='maintenance_logs', many=True, read_only=True)

    class Meta:
        model = Equipment
        fields = [
            'id', 'name', 'serial_number', 'serialNumber', 'model', 'section',
            'status', 'last_pm_date', 'lastPmDate', 'next_pm_date', 'nextPmDate',
            'service_contract', 'serviceContract', 'error_code', 'errorCode',
            'is_active', 'isActive', 'maintenanceLogs', 'created_at', 'updated_at'
        ]
