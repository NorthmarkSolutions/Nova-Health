from rest_framework import serializers
from apps.patients.serializers import PatientSerializer
from apps.accounts.serializers import DoctorProfileSerializer
from .models import Appointment, VitalSign
from apps.patients.models import Patient
from apps.accounts.models import DoctorProfile

class VitalSignSerializer(serializers.ModelSerializer):
    systolicBp = serializers.IntegerField(source='systolic_bp')
    diastolicBp = serializers.IntegerField(source='diastolic_bp')
    pulseRate = serializers.IntegerField(source='pulse_rate')
    heightCm = serializers.DecimalField(source='height_cm', max_digits=5, decimal_places=1)
    weightKg = serializers.DecimalField(source='weight_kg', max_digits=5, decimal_places=1)
    triageNotes = serializers.CharField(source='triage_notes', required=False, allow_null=True, allow_blank=True)

    class Meta:
        model = VitalSign
        fields = [
            'id', 'systolicBp', 'diastolicBp', 'pulseRate', 'temperature',
            'spo2', 'heightCm', 'weightKg', 'bmi', 'triageNotes', 'created_at'
        ]

class AppointmentSerializer(serializers.ModelSerializer):
    appointmentNumber = serializers.CharField(source='appointment_number', read_only=True)
    tokenNumber = serializers.IntegerField(source='token_number', read_only=True)
    appointmentDate = serializers.CharField(source='appointment_date')
    slotStartTime = serializers.CharField(source='slot_start_time', required=False)
    slotEndTime = serializers.CharField(source='slot_end_time', required=False)
    patientId = serializers.UUIDField(write_only=True, required=False)
    doctorId = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    patient = PatientSerializer(read_only=True)
    doctor = DoctorProfileSerializer(read_only=True)
    vitals = VitalSignSerializer(read_only=True)

    class Meta:
        model = Appointment
        fields = [
            'id', 'appointmentNumber', 'tokenNumber', 'appointmentDate',
            'slotStartTime', 'slotEndTime', 'type', 'status', 'notes',
            'patientId', 'doctorId', 'patient', 'doctor', 'vitals'
        ]

    def create(self, validated_data):
        patient_id = validated_data.pop('patientId', None)
        doctor_id = validated_data.pop('doctorId', None)
        date_val = validated_data.get('appointment_date')

        if patient_id:
            validated_data['patient'] = Patient.objects.get(id=patient_id)
        if doctor_id:
            validated_data['doctor'] = DoctorProfile.objects.filter(id=doctor_id).first()

        # Generate sequential token
        count = Appointment.objects.filter(appointment_date=date_val).count() + 1
        validated_data['token_number'] = count
        date_str = date_val.replace('-', '')
        validated_data['appointment_number'] = f"APT-{date_str}-{str(count).zfill(4)}"

        return super().create(validated_data)
