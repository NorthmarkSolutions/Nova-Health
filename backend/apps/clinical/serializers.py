from rest_framework import serializers
from .models import Consultation, Prescription, PrescriptionItem
from apps.patients.serializers import PatientSerializer
from apps.accounts.serializers import DoctorProfileSerializer

class PrescriptionItemSerializer(serializers.ModelSerializer):
    medicationName = serializers.CharField(source='medication_name')
    genericName = serializers.CharField(source='generic_name', required=False, allow_null=True)
    durationDays = serializers.IntegerField(source='duration_days')

    class Meta:
        model = PrescriptionItem
        fields = ['id', 'medicationName', 'genericName', 'dosage', 'frequency', 'durationDays', 'route', 'instructions']

class PrescriptionSerializer(serializers.ModelSerializer):
    prescriptionNumber = serializers.CharField(source='prescription_number')
    followUpInstructions = serializers.CharField(source='follow_up_instructions', required=False, allow_null=True)
    items = PrescriptionItemSerializer(many=True, read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = Prescription
        fields = ['id', 'prescriptionNumber', 'instructions', 'followUpInstructions', 'status', 'items', 'createdAt']

class ConsultationSerializer(serializers.ModelSerializer):
    appointmentId = serializers.UUIDField(source='appointment_id', required=False, allow_null=True)
    patientId = serializers.UUIDField(source='patient_id')
    doctorId = serializers.UUIDField(source='doctor_id', required=False, allow_null=True)
    chiefComplaint = serializers.CharField(source='chief_complaint')
    historyOfPresentIllness = serializers.CharField(source='history_of_present_illness', required=False, allow_null=True)
    physicalExamination = serializers.CharField(source='physical_examination', required=False, allow_null=True)
    provisionalDiagnosis = serializers.CharField(source='provisional_diagnosis')
    icd10Codes = serializers.ListField(source='icd10_codes', required=False, default=list)
    clinicalNotes = serializers.CharField(source='clinical_notes', required=False, allow_null=True)
    followUpDate = serializers.DateField(source='follow_up_date', required=False, allow_null=True)
    prescription = PrescriptionSerializer(read_only=True)
    medications = PrescriptionItemSerializer(many=True, write_only=True, required=False)

    class Meta:
        model = Consultation
        fields = [
            'id', 'appointmentId', 'patientId', 'doctorId',
            'chiefComplaint', 'historyOfPresentIllness', 'physicalExamination',
            'provisionalDiagnosis', 'icd10Codes', 'clinicalNotes',
            'followUpDate', 'prescription', 'medications'
        ]
