import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser

class RoleType(models.TextChoices):
    SUPER_ADMIN = 'SUPER_ADMIN', 'Super Admin'
    HOSPITAL_ADMIN = 'HOSPITAL_ADMIN', 'Hospital Admin'
    RECEPTIONIST = 'RECEPTIONIST', 'Receptionist'
    RECEPTION_SUPERVISOR = 'RECEPTION_SUPERVISOR', 'Reception Supervisor'
    DOCTOR = 'DOCTOR', 'Doctor'
    NURSE = 'NURSE', 'Nurse'
    LAB_TECH = 'LAB_TECH', 'Lab Technician'
    PATHOLOGIST = 'PATHOLOGIST', 'Pathologist'
    SURGEON = 'SURGEON', 'Surgeon'
    ANESTHETIST = 'ANESTHETIST', 'Anesthetist'
    OT_MANAGER = 'OT_MANAGER', 'OT Manager'
    WARD_MANAGER = 'WARD_MANAGER', 'Ward Manager'
    PHARMACIST = 'PHARMACIST', 'Pharmacist'
    CASHIER = 'CASHIER', 'Cashier'
    PATIENT = 'PATIENT', 'Patient'

class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.CharField(max_length=50, choices=RoleType.choices, default=RoleType.RECEPTIONIST)
    phone_number = models.CharField(max_length=20, blank=True, null=True)

    class Meta:
        db_table = 'users'

    def __str__(self):
        return f"{self.username} ({self.role})"

class DoctorProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='doctor_profile')
    license_number = models.CharField(max_length=50)
    department = models.CharField(max_length=100)
    qualification = models.CharField(max_length=100)
    consultation_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'doctor_profiles'

    def __str__(self):
        return f"Dr. {self.user.get_full_name()} ({self.department})"
