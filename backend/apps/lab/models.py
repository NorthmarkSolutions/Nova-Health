import uuid
from django.db import models
from apps.patients.models import Patient
from apps.accounts.models import DoctorProfile

class LabTest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    test_code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=150)
    department = models.CharField(max_length=100, default='Hematology')
    sample_type = models.CharField(max_length=100, default='Whole Blood (EDTA)')
    container_type = models.CharField(max_length=100, default='Lavender Top Tube')
    turnaround_hours = models.IntegerField(default=4)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=50.00)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'lab_tests'

    def __str__(self):
        return f"{self.name} ({self.test_code})"

class LabOrderStage(models.TextChoices):
    COLLECTED = 'COLLECTED', 'Collected'
    PROCESSING = 'PROCESSING', 'Processing'
    RESULT_ENTERED = 'RESULT_ENTERED', 'Result Entered'
    VALIDATED = 'VALIDATED', 'Validated'
    REPORT_GENERATED = 'REPORT_GENERATED', 'Report Generated'

class LabOrder(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order_number = models.CharField(max_length=50, unique=True, db_index=True)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='lab_orders')
    test = models.ForeignKey(LabTest, on_delete=models.SET_NULL, null=True, blank=True, related_name='orders')
    doctor = models.ForeignKey(DoctorProfile, on_delete=models.SET_NULL, null=True, blank=True)
    priority = models.CharField(max_length=20, default='ROUTINE')
    status = models.CharField(max_length=30, choices=LabOrderStage.choices, default=LabOrderStage.COLLECTED)
    barcode = models.CharField(max_length=50, blank=True, null=True)
    is_flagged_abnormal = models.BooleanField(default=False)
    technician_note = models.TextField(blank=True, null=True)
    pathologist_remarks = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'lab_orders'
        ordering = ['-created_at']

    def __str__(self):
        return f"Order #{self.order_number} ({self.status})"

class LabResult(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lab_order = models.ForeignKey(LabOrder, on_delete=models.CASCADE, related_name='results')
    parameter_name = models.CharField(max_length=100)
    observed_value = models.CharField(max_length=50)
    reference_range = models.CharField(max_length=50)
    unit = models.CharField(max_length=20)
    is_abnormal = models.BooleanField(default=False)

    class Meta:
        db_table = 'lab_results'

    def __str__(self):
        return f"{self.parameter_name}: {self.observed_value} {self.unit}"
