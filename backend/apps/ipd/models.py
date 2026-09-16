import uuid
from django.db import models
from apps.patients.models import Patient
from apps.accounts.models import DoctorProfile
from apps.organization.models import Bed

class AdmissionStatus(models.TextChoices):
    ADMITTED = 'ADMITTED', 'Admitted'
    POST_OP = 'POST_OP', 'Post-Op'
    OBSERVATION = 'OBSERVATION', 'Observation'
    DISCHARGE_INITIATED = 'DISCHARGE_INITIATED', 'Discharge Initiated'
    DISCHARGED = 'DISCHARGED', 'Discharged'

class InpatientAdmission(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    admission_number = models.CharField(max_length=50, unique=True, db_index=True)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='admissions')
    admitting_doctor = models.ForeignKey(DoctorProfile, on_delete=models.SET_NULL, null=True, blank=True)
    bed = models.ForeignKey(Bed, on_delete=models.SET_NULL, null=True, blank=True)
    ward_name = models.CharField(max_length=100, default='General Ward')
    admission_date = models.DateTimeField(auto_now_add=True)
    discharge_date = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=50, choices=AdmissionStatus.choices, default=AdmissionStatus.ADMITTED)
    admitting_diagnosis = models.TextField(blank=True, null=True)
    discharge_summary = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'inpatient_admissions'
        ordering = ['-admission_date']

    def __str__(self):
        return f"Admission {self.admission_number} - {self.patient.first_name} {self.patient.last_name}"

class MedicationAdministration(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    admission = models.ForeignKey(InpatientAdmission, on_delete=models.CASCADE, related_name='mar_records')
    medication_name = models.CharField(max_length=200)
    dosage = models.CharField(max_length=100)
    scheduled_time = models.CharField(max_length=50)
    administered_time = models.DateTimeField(null=True, blank=True)
    is_given = models.BooleanField(default=False)
    remarks = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'medication_administrations'

    def __str__(self):
        return f"{self.medication_name} ({'Given' if self.is_given else 'Pending'})"
