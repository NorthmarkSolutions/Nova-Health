import uuid
from django.db import models
from django.utils import timezone
from apps.patients.models import Patient
from apps.accounts.models import DoctorProfile, User

class LabTest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    test_code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=150)
    category = models.CharField(max_length=100, default='Hematology')
    department = models.CharField(max_length=100, default='Diagnostic Lab')
    sample_type = models.CharField(max_length=100, default='Whole Blood (EDTA)')
    specimen_type = models.CharField(max_length=100, default='Whole Blood')
    container_type = models.CharField(max_length=100, default='Lavender Top Tube')
    container_color = models.CharField(max_length=50, default='Lavender')
    turnaround_hours = models.IntegerField(default=4)
    tat_minutes = models.IntegerField(default=240)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=50.00)
    tpa_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    stat_surcharge = models.CharField(max_length=50, default='Not offered')
    is_active = models.BooleanField(default=True)
    normal_ranges = models.JSONField(default=dict, blank=True)
    parameters_schema = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'lab_tests'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.test_code})"

class LabOrderPriority(models.TextChoices):
    ROUTINE = 'ROUTINE', 'Routine'
    URGENT = 'URGENT', 'Urgent'
    STAT = 'STAT', 'STAT'

class LabOrderStatus(models.TextChoices):
    ORDERED = 'ORDERED', 'Ordered'
    SAMPLE_COLLECTED = 'SAMPLE_COLLECTED', 'Sample Collected'
    IN_ANALYSIS = 'IN_ANALYSIS', 'In Analysis'
    RESULTS_ENTERED = 'RESULTS_ENTERED', 'Results Entered'
    REPORT_APPROVED = 'REPORT_APPROVED', 'Report Approved'
    CANCELLED = 'CANCELLED', 'Cancelled'
    # Backwards compatibility with older statuses
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
    encounter_id = models.CharField(max_length=100, blank=True, null=True)
    clinical_notes = models.TextField(blank=True, null=True)
    priority = models.CharField(max_length=20, choices=LabOrderPriority.choices, default=LabOrderPriority.ROUTINE)
    status = models.CharField(max_length=30, choices=LabOrderStatus.choices, default=LabOrderStatus.ORDERED)
    barcode = models.CharField(max_length=50, blank=True, null=True)
    ordered_at = models.DateTimeField(default=timezone.now)
    collected_at = models.DateTimeField(null=True, blank=True)
    sample_collector = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='collected_lab_orders')
    is_flagged_abnormal = models.BooleanField(default=False)
    is_flagged_critical = models.BooleanField(default=False)
    critical_acknowledged_at = models.DateTimeField(null=True, blank=True)
    critical_acknowledged_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='acknowledged_critical_orders')
    is_retest = models.BooleanField(default=False)
    retest_reason = models.TextField(blank=True, null=True)
    retest_routing = models.CharField(max_length=50, blank=True, null=True)
    technician_note = models.TextField(blank=True, null=True)
    pathologist_remarks = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'lab_orders'
        ordering = ['-created_at']

    def __str__(self):
        return f"Order #{self.order_number} ({self.status})"

class LabOrderItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(LabOrder, on_delete=models.CASCADE, related_name='items')
    test = models.ForeignKey(LabTest, on_delete=models.CASCADE, related_name='order_items')
    status = models.CharField(max_length=30, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'lab_order_items'

    def __str__(self):
        return f"{self.order.order_number} - {self.test.name}"

class ResultFlag(models.TextChoices):
    NORMAL = 'NORMAL', 'Normal'
    LOW = 'LOW', 'Low'
    HIGH = 'HIGH', 'High'
    CRITICAL_LOW = 'CRITICAL_LOW', 'Critical Low'
    CRITICAL_HIGH = 'CRITICAL_HIGH', 'Critical High'

class LabResult(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lab_order = models.ForeignKey(LabOrder, on_delete=models.CASCADE, related_name='results')
    order_item = models.ForeignKey(LabOrderItem, on_delete=models.SET_NULL, null=True, blank=True, related_name='results')
    parameter_name = models.CharField(max_length=100)
    observed_value = models.CharField(max_length=50)
    measured_value = models.CharField(max_length=50, blank=True, null=True)
    reference_range = models.CharField(max_length=100)
    unit = models.CharField(max_length=30)
    flag = models.CharField(max_length=20, choices=ResultFlag.choices, default=ResultFlag.NORMAL)
    is_abnormal = models.BooleanField(default=False)
    technician_notes = models.TextField(blank=True, null=True)
    entered_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='entered_lab_results')
    entered_at = models.DateTimeField(default=timezone.now)
    is_delta_flagged = models.BooleanField(default=False)
    previous_value = models.CharField(max_length=100, blank=True, null=True)
    previous_date = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'lab_results'

    def __str__(self):
        return f"{self.parameter_name}: {self.observed_value} {self.unit} ({self.flag})"

    def save(self, *args, **kwargs):
        if not self.measured_value:
            self.measured_value = self.observed_value
        if self.flag in [ResultFlag.LOW, ResultFlag.HIGH, ResultFlag.CRITICAL_LOW, ResultFlag.CRITICAL_HIGH]:
            self.is_abnormal = True
        super().save(*args, **kwargs)

class LabReport(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.OneToOneField(LabOrder, on_delete=models.CASCADE, related_name='report')
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_lab_reports')
    approved_at = models.DateTimeField(null=True, blank=True)
    pathologist_remarks = models.TextField(blank=True, null=True)
    report_pdf = models.TextField(blank=True, null=True) # Data URL or document path
    digital_signature = models.CharField(max_length=255, blank=True, null=True)
    is_amended = models.BooleanField(default=False)
    amendment_reason = models.TextField(blank=True, null=True)
    amended_at = models.DateTimeField(null=True, blank=True)
    amended_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='amended_lab_reports')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'lab_reports'

    def __str__(self):
        return f"Report for #{self.order.order_number}"

class EquipmentStatus(models.TextChoices):
    RUNNING = 'RUNNING', 'Running'
    OFFLINE = 'OFFLINE', 'Offline'
    MAINTENANCE = 'MAINTENANCE', 'Maintenance'
    READY = 'READY', 'Ready'

class Equipment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150)
    serial_number = models.CharField(max_length=100, unique=True)
    model = models.CharField(max_length=100, blank=True, null=True)
    section = models.CharField(max_length=100, default='Hematology')
    status = models.CharField(max_length=30, choices=EquipmentStatus.choices, default=EquipmentStatus.RUNNING)
    last_pm_date = models.DateField(null=True, blank=True)
    next_pm_date = models.DateField(null=True, blank=True)
    service_contract = models.CharField(max_length=200, blank=True, null=True)
    error_code = models.CharField(max_length=50, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'lab_equipment'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.serial_number}) - {self.status}"

class EquipmentMaintenanceLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    equipment = models.ForeignKey(Equipment, on_delete=models.CASCADE, related_name='maintenance_logs')
    log_type = models.CharField(max_length=50, default='PREVENTIVE') # PREVENTIVE, CALIBRATION, BREAKDOWN, SERVICE_TICKET
    performed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    notes = models.TextField(blank=True, null=True)
    date = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'lab_equipment_maintenance_logs'
        ordering = ['-date']

    def __str__(self):
        return f"{self.log_type} for {self.equipment.name} on {self.date.strftime('%Y-%m-%d')}"
