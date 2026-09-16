import uuid
from django.db import models
from apps.patients.models import Patient
from apps.accounts.models import DoctorProfile

class SurgeryStatus(models.TextChoices):
    PLANNED = 'PLANNED', 'Planned'
    IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
    POST_OP_RECOVERY = 'POST_OP_RECOVERY', 'Post-Op Recovery'
    TRANSFERRED_TO_IPD = 'TRANSFERRED_TO_IPD', 'Transferred to IPD'
    COMPLETED = 'COMPLETED', 'Completed'
    CANCELLED = 'CANCELLED', 'Cancelled'

class SurgeryBooking(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking_number = models.CharField(max_length=50, unique=True, db_index=True)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='surgeries')
    primary_surgeon = models.ForeignKey(DoctorProfile, on_delete=models.SET_NULL, null=True, blank=True, related_name='surgeries')
    procedure_name = models.CharField(max_length=200)
    ot_room = models.CharField(max_length=50, default='OT-1')
    scheduled_start = models.DateTimeField(null=True, blank=True)
    scheduled_end = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=50, choices=SurgeryStatus.choices, default=SurgeryStatus.PLANNED)
    pre_op_diagnosis = models.TextField(blank=True, null=True)
    post_op_notes = models.TextField(blank=True, null=True)
    equipment_used = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'surgery_bookings'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.procedure_name} ({self.booking_number})"
