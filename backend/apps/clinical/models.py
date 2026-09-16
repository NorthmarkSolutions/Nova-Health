import uuid
from django.db import models
from apps.patients.models import Patient
from apps.accounts.models import DoctorProfile
from apps.appointments.models import Appointment

class Consultation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    appointment = models.OneToOneField(Appointment, on_delete=models.SET_NULL, null=True, blank=True, related_name='consultation')
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='consultations')
    doctor = models.ForeignKey(DoctorProfile, on_delete=models.SET_NULL, null=True, blank=True, related_name='consultations')
    chief_complaint = models.TextField()
    history_of_present_illness = models.TextField(blank=True, null=True)
    physical_examination = models.TextField(blank=True, null=True)
    provisional_diagnosis = models.TextField()
    icd10_codes = models.JSONField(default=list, blank=True)
    clinical_notes = models.TextField(blank=True, null=True)
    follow_up_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'consultations'
        ordering = ['-created_at']

    def __str__(self):
        return f"Consultation for {self.patient.uhid} by {self.doctor}"

class Prescription(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    consultation = models.OneToOneField(Consultation, on_delete=models.CASCADE, related_name='prescription', null=True, blank=True)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='prescriptions')
    doctor = models.ForeignKey(DoctorProfile, on_delete=models.SET_NULL, null=True, blank=True)
    prescription_number = models.CharField(max_length=50, unique=True, db_index=True)
    instructions = models.TextField(blank=True, null=True)
    follow_up_instructions = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, default='ACTIVE')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'prescriptions'

    def __str__(self):
        return f"Rx {self.prescription_number} ({self.patient.uhid})"

class PrescriptionItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    prescription = models.ForeignKey(Prescription, on_delete=models.CASCADE, related_name='items')
    medication_name = models.CharField(max_length=200)
    generic_name = models.CharField(max_length=200, blank=True, null=True)
    dosage = models.CharField(max_length=100)
    frequency = models.CharField(max_length=100)
    duration_days = models.IntegerField(default=5)
    route = models.CharField(max_length=50, default='ORAL')
    instructions = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        db_table = 'prescription_items'

    def __str__(self):
        return f"{self.medication_name} {self.dosage} ({self.frequency})"
