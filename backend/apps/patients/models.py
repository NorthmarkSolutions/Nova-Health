import uuid
from django.db import models
from django.utils import timezone

class Gender(models.TextChoices):
    MALE = 'MALE', 'Male'
    FEMALE = 'FEMALE', 'Female'
    OTHER = 'OTHER', 'Other'

class Patient(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    uhid = models.CharField(max_length=32, unique=True, db_index=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    date_of_birth = models.CharField(max_length=20)
    gender = models.CharField(max_length=20, choices=Gender.choices, default=Gender.OTHER)
    blood_group = models.CharField(max_length=10, blank=True, null=True)
    phone_number = models.CharField(max_length=20, db_index=True)
    email = models.EmailField(blank=True, null=True)
    emergency_contact_name = models.CharField(max_length=100, blank=True, null=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    allergies = models.JSONField(default=list, blank=True)
    chronic_conditions = models.JSONField(default=list, blank=True)
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'patients'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.uhid})"

    @staticmethod
    def generate_uhid():
        now = timezone.now()
        prefix = f"UHID-{now.strftime('%Y%m')}-"
        count = Patient.objects.filter(uhid__startswith=prefix).count() + 1
        return f"{prefix}{str(count).zfill(5)}"
