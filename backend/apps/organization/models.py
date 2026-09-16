import uuid
from django.db import models

class HospitalProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, default='North Hospital Clinical Enterprise')
    tagline = models.CharField(max_length=255, default='Excellence in Tertiary Patient Care & Research')
    email = models.EmailField(default='contact@northhospital.com')
    phone = models.CharField(max_length=50, default='+1 (555) 019-2834')
    emergency_phone = models.CharField(max_length=50, default='+1 (555) 911-0000')
    address = models.TextField(default='100 Medical Center Way')
    city = models.CharField(max_length=100, default='Metropolis')
    state = models.CharField(max_length=100, default='NY')
    postal_code = models.CharField(max_length=20, default='10001')
    country = models.CharField(max_length=100, default='USA')
    tax_id = models.CharField(max_length=100, default='TX-998822-US')
    accreditation = models.CharField(max_length=100, default='JCI Accredited, Level 1 Trauma Center')
    currency = models.CharField(max_length=10, default='USD')
    timezone = models.CharField(max_length=50, default='America/New_York')
    logo_url = models.CharField(max_length=500, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'hospital_profile'

class Department(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=100)
    department_type = models.CharField(max_length=50, default='CLINICAL')
    head_of_department = models.CharField(max_length=100, blank=True, null=True)
    room_number = models.CharField(max_length=50, blank=True, null=True)
    floor_number = models.IntegerField(default=1)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'departments'

    def __str__(self):
        return f"{self.name} ({self.code})"

class Room(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room_number = models.CharField(max_length=50, unique=True)
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, related_name='rooms')
    room_type = models.CharField(max_length=50, default='GENERAL_WARD')
    max_occupancy = models.IntegerField(default=4)
    current_occupancy = models.IntegerField(default=0)
    is_clean = models.BooleanField(default=True)
    is_operational = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'rooms'

    def __str__(self):
        return f"Room {self.room_number}"

class BedStatus(models.TextChoices):
    AVAILABLE = 'AVAILABLE', 'Available'
    OCCUPIED = 'OCCUPIED', 'Occupied'
    RESERVED = 'RESERVED', 'Reserved'
    MAINTENANCE = 'MAINTENANCE', 'Maintenance'

class Bed(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    bed_number = models.CharField(max_length=50, unique=True)
    room = models.ForeignKey(Room, on_delete=models.SET_NULL, null=True, blank=True, related_name='beds')
    bed_type = models.CharField(max_length=50, default='STANDARD')
    status = models.CharField(max_length=50, choices=BedStatus.choices, default=BedStatus.AVAILABLE)
    daily_tariff = models.DecimalField(max_digits=10, decimal_places=2, default=150.00)
    current_patient_uhid = models.CharField(max_length=50, blank=True, null=True)
    current_patient_name = models.CharField(max_length=100, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'beds'

    def __str__(self):
        return f"Bed {self.bed_number} ({self.status})"
