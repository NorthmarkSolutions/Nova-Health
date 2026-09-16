from rest_framework import serializers
from .models import InpatientAdmission, MedicationAdministration

class MedicationAdministrationSerializer(serializers.ModelSerializer):
    medicationName = serializers.CharField(source='medication_name')
    scheduledTime = serializers.CharField(source='scheduled_time')
    administeredTime = serializers.DateTimeField(source='administered_time', required=False, allow_null=True)
    isGiven = serializers.BooleanField(source='is_given')

    class Meta:
        model = MedicationAdministration
        fields = ['id', 'medicationName', 'dosage', 'scheduledTime', 'administeredTime', 'isGiven', 'remarks']

class InpatientAdmissionSerializer(serializers.ModelSerializer):
    admissionNumber = serializers.CharField(source='admission_number', read_only=True)
    patientName = serializers.SerializerMethodField()
    uhid = serializers.CharField(source='patient.uhid', read_only=True)
    wardName = serializers.CharField(source='ward_name')
    bedNumber = serializers.SerializerMethodField()
    doctor = serializers.SerializerMethodField()
    admissionDate = serializers.DateTimeField(source='admission_date', read_only=True)
    dischargeDate = serializers.DateTimeField(source='discharge_date', read_only=True)
    admittingDiagnosis = serializers.CharField(source='admitting_diagnosis', required=False, allow_null=True)
    dischargeSummary = serializers.CharField(source='discharge_summary', required=False, allow_null=True)
    marRecords = MedicationAdministrationSerializer(source='mar_records', many=True, read_only=True)

    class Meta:
        model = InpatientAdmission
        fields = [
            'id', 'admissionNumber', 'patientName', 'uhid', 'wardName',
            'bedNumber', 'doctor', 'status', 'admissionDate', 'dischargeDate',
            'admittingDiagnosis', 'dischargeSummary', 'marRecords'
        ]

    def get_patientName(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}"

    def get_bedNumber(self, obj):
        return obj.bed.bed_number if obj.bed else "101-A"

    def get_doctor(self, obj):
        return f"Dr. {obj.admitting_doctor.user.get_full_name()}" if obj.admitting_doctor and obj.admitting_doctor.user else "Dr. Sarah Jenkins"
