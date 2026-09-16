import uuid
from django.db import models
from django.utils import timezone
from apps.patients.models import Patient
from apps.accounts.models import User, DoctorProfile

class AppointmentStatus(models.TextChoices):
    WAITING = 'WAITING', 'Waiting'
    TRIAGED = 'TRIAGED', 'Triaged'
    IN_CONSULTATION = 'IN_CONSULTATION', 'In Consultation'
    COMPLETED = 'COMPLETED', 'Completed'
    CANCELLED = 'CANCELLED', 'Cancelled'

class AppointmentType(models.TextChoices):
    WALK_IN = 'WALK_IN', 'Walk In'
    ONLINE = 'ONLINE', 'Online'
    FOLLOW_UP = 'FOLLOW_UP', 'Follow Up'
    EMERGENCY = 'EMERGENCY', 'Emergency'

class Appointment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    appointment_number = models.CharField(max_length=50, unique=True, db_index=True)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='appointments')
    doctor = models.ForeignKey(DoctorProfile, on_delete=models.SET_NULL, null=True, blank=True, related_name='appointments')
    appointment_date = models.CharField(max_length=20)
    slot_start_time = models.CharField(max_length=20, default='09:00:00')
    slot_end_time = models.CharField(max_length=20, default='09:15:00')
    token_number = models.IntegerField(default=1)
    type = models.CharField(max_length=20, choices=AppointmentType.choices, default=AppointmentType.WALK_IN)
    status = models.CharField(max_length=30, choices=AppointmentStatus.choices, default=AppointmentStatus.WAITING)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'appointments'
        ordering = ['appointment_date', 'token_number']

    def __str__(self):
        return f"Token #{self.token_number} - {self.patient.first_name} {self.patient.last_name} ({self.status})"

class VitalSign(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    appointment = models.OneToOneField(Appointment, on_delete=models.CASCADE, related_name='vitals', null=True, blank=True)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='vitals')
    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    systolic_bp = models.IntegerField(default=120)
    diastolic_bp = models.IntegerField(default=80)
    pulse_rate = models.IntegerField(default=72)
    temperature = models.DecimalField(max_digits=5, decimal_places=1, default=98.6)
    spo2 = models.IntegerField(default=98)
    height_cm = models.DecimalField(max_digits=5, decimal_places=1, default=170.0)
    weight_kg = models.DecimalField(max_digits=5, decimal_places=1, default=70.0)
    bmi = models.DecimalField(max_digits=4, decimal_places=1, default=24.2)
    triage_notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'vital_signs'

    def __str__(self):
        return f"Vitals for {self.patient.uhid}: {self.systolic_bp}/{self.diastolic_bp} mmHg"
