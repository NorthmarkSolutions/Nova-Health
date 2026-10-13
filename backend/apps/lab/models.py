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
    stat_tat_minutes = models.IntegerField(null=True, blank=True)
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

    def published_range_version(self):
        return self.range_versions.filter(status=RangeVersionStatus.PUBLISHED).order_by('-version').first()

    def schema_for(self, patient=None, age=None):
        """Parameter list with the published limits for this patient's group (child / adult female / adult male)."""
        published = self.published_range_version()
        if not published:
            return list(self.parameters_schema or []), None
        segment = range_segment(patient, age)
        rows = (published.ranges or {}).get(segment) or (published.ranges or {}).get('adultMale') or []
        groups = {str(p.get('name', '')).lower(): p.get('group') for p in (self.parameters_schema or []) if isinstance(p, dict)}
        schema = [
            {
                'name': r.get('name'),
                'unit': r.get('unit', ''),
                'group': r.get('group') or groups.get(str(r.get('name', '')).lower()) or (self.category or 'Results').upper(),
                'low': r.get('low'),
                'high': r.get('high'),
                'criticalLow': r.get('criticalLow'),
                'criticalHigh': r.get('criticalHigh'),
            }
            for r in rows
        ]
        return schema, published.version


def range_segment(patient=None, age=None):
    """Which reference group applies: under 18 -> child, female -> adultFemale, otherwise adultMale."""
    if age is None and patient is not None:
        from .serializers import patient_age  # local import: serializers import models
        age = patient_age(patient)
    if age is not None and age < 18:
        return 'child'
    gender = str(getattr(patient, 'gender', '') or '').upper()
    return 'adultFemale' if gender in ('FEMALE', 'F') else 'adultMale'


class RangeVersionStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Draft'
    PUBLISHED = 'PUBLISHED', 'Published'
    RETIRED = 'RETIRED', 'Retired'


class LabTestRangeVersion(models.Model):
    """One version of a test's reference and critical limits. One PUBLISHED and at most one DRAFT per test."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    test = models.ForeignKey(LabTest, on_delete=models.CASCADE, related_name='range_versions')
    version = models.PositiveIntegerField(default=0)  # 0 while a draft; numbered when published
    status = models.CharField(max_length=20, choices=RangeVersionStatus.choices, default=RangeVersionStatus.DRAFT)
    # {"adultMale": [{name, unit, low, high, criticalLow, criticalHigh}], "adultFemale": [...], "child": [...]}
    ranges = models.JSONField(default=dict)
    notes = models.TextField(blank=True, default='')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='drafted_range_versions')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    published_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='published_range_versions')
    published_at = models.DateTimeField(null=True, blank=True)
    retired_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'lab_test_range_versions'
        ordering = ['test', '-version', '-created_at']

    def __str__(self):
        return f"{self.test.test_code} ranges v{self.version} ({self.status})"

class LabOrderPriority(models.TextChoices):
    ROUTINE = 'ROUTINE', 'Routine'
    URGENT = 'URGENT', 'Urgent'
    STAT = 'STAT', 'STAT'

class LabOrderStatus(models.TextChoices):
    ORDERED = 'ORDERED', 'Ordered'
    SAMPLE_COLLECTED = 'SAMPLE_COLLECTED', 'Sample Collected'
    SAMPLE_RECEIVED = 'SAMPLE_RECEIVED', 'Sample Received in Lab'
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
    # Where the order came from (e.g. "OPD Room 101", "IPD Ward 4B, Bed 12")
    ordering_location = models.CharField(max_length=150, blank=True, default='')
    # Sample intake in the lab
    received_at = models.DateTimeField(null=True, blank=True)
    received_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='received_lab_orders')
    sample_rejected_reason = models.TextField(blank=True, null=True)
    rejected_at = models.DateTimeField(null=True, blank=True)
    rejected_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='rejected_lab_orders')
    # Analyzer run
    analyzer = models.ForeignKey('Equipment', on_delete=models.SET_NULL, null=True, blank=True, related_name='lab_orders')
    analyzer_name = models.CharField(max_length=150, blank=True, default='')
    processing_at = models.DateTimeField(null=True, blank=True)
    processing_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='processed_lab_orders')
    # Results released to the pathologist (draft results keep status IN_ANALYSIS)
    results_entered_at = models.DateTimeField(null=True, blank=True)
    results_entered_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='submitted_lab_orders')
    retest_requested_at = models.DateTimeField(null=True, blank=True)
    retest_requested_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='retest_requested_lab_orders')
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
    group = models.CharField(max_length=100, blank=True, default='')
    low = models.FloatField(null=True, blank=True)
    high = models.FloatField(null=True, blank=True)
    critical_low = models.FloatField(null=True, blank=True)
    critical_high = models.FloatField(null=True, blank=True)
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
    # Range version the result was flagged against (null = no published version; limits came with the result)
    range_version = models.PositiveIntegerField(null=True, blank=True)
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
    report_number = models.CharField(max_length=50, unique=True, null=True, blank=True)
    signed_by_name = models.CharField(max_length=150, blank=True, default='')
    signer_designation = models.CharField(max_length=150, blank=True, default='')
    # SHA-256 over the released content, signer and time; recomputed by the verify endpoint
    signature_hash = models.CharField(max_length=64, blank=True, default='')
    version = models.PositiveIntegerField(default=1)  # +1 per addendum
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
    # Stable short code used across the lab screens (e.g. "an-xn1000")
    code = models.CharField(max_length=50, unique=True, null=True, blank=True)
    name = models.CharField(max_length=150)
    serial_number = models.CharField(max_length=100, unique=True)
    model = models.CharField(max_length=100, blank=True, null=True)
    section = models.CharField(max_length=100, default='Hematology')
    status = models.CharField(max_length=30, choices=EquipmentStatus.choices, default=EquipmentStatus.RUNNING)
    last_pm_date = models.DateField(null=True, blank=True)
    next_pm_date = models.DateField(null=True, blank=True)
    service_contract = models.CharField(max_length=200, blank=True, null=True)
    contract_ends = models.DateField(null=True, blank=True)
    error_code = models.CharField(max_length=50, blank=True, null=True)
    tests_covered = models.CharField(max_length=255, blank=True, default='')
    reagent_percent = models.PositiveSmallIntegerField(null=True, blank=True)
    alert_title = models.CharField(max_length=150, blank=True, default='')
    alert_body = models.TextField(blank=True, default='')
    service_ticket = models.CharField(max_length=50, blank=True, default='')
    engineer_eta = models.CharField(max_length=50, blank=True, default='')
    # Daily QC: a passing run within this many hours is required before patient samples
    qc_interval_hours = models.PositiveSmallIntegerField(default=24)
    # Set when the analyzer returns from a fault: QC must pass again after this moment
    qc_required_after = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'lab_equipment'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.serial_number}) - {self.status}"

    def last_qc(self):
        return self.qc_runs.order_by('-performed_at').first()

    def qc_status(self, now=None):
        """OK / DUE / FAILED — computed from the QC runs, never set by hand."""
        last = self.last_qc()
        if last and not last.passed:
            return 'FAILED'
        if not last:
            return 'DUE'
        now = now or timezone.now()
        if self.qc_required_after and last.performed_at < self.qc_required_after:
            return 'DUE'
        if (now - last.performed_at).total_seconds() > self.qc_interval_hours * 3600:
            return 'DUE'
        return 'OK'

    def block_reason(self):
        """Why patient samples cannot run here now (None = usable)."""
        if not self.is_active:
            return f'{self.name} is not in service.'
        if self.status in (EquipmentStatus.OFFLINE, EquipmentStatus.MAINTENANCE):
            return f"{self.name} is {'offline' if self.status == EquipmentStatus.OFFLINE else 'in maintenance'}."
        qc = self.qc_status()
        if qc == 'FAILED':
            return f'QC failed on {self.name}. Results are held until QC passes.'
        if qc == 'DUE':
            return f'QC is due on {self.name}. Run QC before loading patient samples.'
        return None

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


class LabReportAmendment(models.Model):
    """Signed addendum to a released report. The original report content is never overwritten."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    report = models.ForeignKey(LabReport, on_delete=models.CASCADE, related_name='amendments')
    number = models.PositiveIntegerField()
    text = models.TextField()
    signed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='signed_lab_amendments')
    signed_by_name = models.CharField(max_length=150, blank=True, default='')
    signed_at = models.DateTimeField(default=timezone.now)
    signature_hash = models.CharField(max_length=64, blank=True, default='')

    class Meta:
        db_table = 'lab_report_amendments'
        ordering = ['report', 'number']
        unique_together = [('report', 'number')]


class CallbackStatus(models.TextChoices):
    PENDING = 'PENDING', 'Awaiting read-back'
    ACKNOWLEDGED = 'ACKNOWLEDGED', 'Acknowledged'


class CriticalCallback(models.Model):
    """Critical result call-back: opened when a critical report is released, closed by a recorded read-back."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.OneToOneField(LabOrder, on_delete=models.CASCADE, related_name='critical_callback')
    report = models.ForeignKey(LabReport, on_delete=models.SET_NULL, null=True, blank=True, related_name='callbacks')
    status = models.CharField(max_length=20, choices=CallbackStatus.choices, default=CallbackStatus.PENDING)
    released_at = models.DateTimeField(default=timezone.now)
    ack_window_minutes = models.PositiveIntegerField(default=15)
    critical_values = models.JSONField(default=list, blank=True)  # [{name, value, unit, low, high, criticalLow, criticalHigh}]
    received_by_name = models.CharField(max_length=150, blank=True, default='')
    received_by_role = models.CharField(max_length=80, blank=True, default='')
    read_back_confirmed = models.BooleanField(default=False)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='recorded_critical_callbacks')
    notes = models.TextField(blank=True, default='')

    class Meta:
        db_table = 'lab_critical_callbacks'
        ordering = ['status', '-released_at']

    def minutes_open(self, now=None):
        end = self.acknowledged_at or (now or timezone.now())
        return int((end - self.released_at).total_seconds() // 60)

    @property
    def is_overdue(self):
        return self.status == CallbackStatus.PENDING and self.minutes_open() > self.ack_window_minutes


class CriticalCallAttempt(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    callback = models.ForeignKey(CriticalCallback, on_delete=models.CASCADE, related_name='attempts')
    at = models.DateTimeField(default=timezone.now)
    outcome = models.CharField(max_length=40, default='NO_ANSWER')  # NO_ANSWER, BUSY, LEFT_MESSAGE, WRONG_CONTACT
    note = models.CharField(max_length=300, blank=True, default='')
    by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='lab_call_attempts')

    class Meta:
        db_table = 'lab_critical_call_attempts'
        ordering = ['at']


class QcRun(models.Model):
    """One QC control run on an analyzer. A failed run holds patient samples until a pass."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    equipment = models.ForeignKey(Equipment, on_delete=models.CASCADE, related_name='qc_runs')
    level = models.CharField(max_length=60)
    lot = models.CharField(max_length=60)
    passed = models.BooleanField()
    note = models.TextField(blank=True, default='')
    performed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='lab_qc_runs')
    performed_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'lab_qc_runs'
        ordering = ['-performed_at']


class RejectionReason(models.TextChoices):
    HAEMOLYSED = 'HAEMOLYSED', 'Haemolysed'
    CLOTTED = 'CLOTTED', 'Clotted'
    INSUFFICIENT = 'INSUFFICIENT', 'Insufficient volume'
    WRONG_CONTAINER = 'WRONG_CONTAINER', 'Wrong container'
    LABEL = 'LABEL', 'Unlabelled / mislabelled'
    LEAKED = 'LEAKED', 'Leaked in transit'
    OTHER = 'OTHER', 'Other'


class SampleRejection(models.Model):
    """Every rejected sample, kept for quality statistics (the order itself returns to collection)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(LabOrder, on_delete=models.CASCADE, related_name='rejections')
    reason_code = models.CharField(max_length=30, choices=RejectionReason.choices, default=RejectionReason.OTHER)
    reason = models.TextField()
    stage = models.CharField(max_length=30)  # order status when rejected
    collected_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='collected_rejected_samples')
    rejected_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='lab_sample_rejections')
    rejected_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'lab_sample_rejections'
        ordering = ['-rejected_at']


# =============================================================================
# Lab Admin (Phase 4): staff linked to user accounts, roster, stock, purchases,
# price proposals and department settings. History goes to the audit log
# (entity "LabAdmin") so it sits beside every other lab event.
# =============================================================================

class LabStaffCategory(models.TextChoices):
    PATHOLOGIST = 'Pathologist', 'Pathologist'
    TECHNOLOGIST = 'Technologist', 'Technologist'
    PHLEBOTOMIST = 'Phlebotomist', 'Phlebotomist'


class LabStaffProfile(models.Model):
    """A lab team member. Always an existing user account; name, email and phone come from the account."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='lab_profile')
    code = models.CharField(max_length=40, unique=True)
    role_title = models.CharField(max_length=80)  # e.g. "Senior Lab Technologist"
    category = models.CharField(max_length=20, choices=LabStaffCategory.choices)
    section = models.CharField(max_length=60, blank=True, default='')
    qualification = models.CharField(max_length=120, blank=True, default='')
    licence_number = models.CharField(max_length=60, blank=True, default='')
    credential_name = models.CharField(max_length=120, blank=True, default='')
    credential_expiry = models.DateField(null=True, blank=True)
    nabl_trained = models.BooleanField(default=False)
    bench = models.CharField(max_length=80, blank=True, default='')
    joined_on = models.DateField(null=True, blank=True)
    suspended = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'lab_staff_profiles'
        ordering = ['category', 'user__first_name']


class LabRosterWeek(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    week_start = models.DateField(unique=True)  # Monday
    published = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True, blank=True)
    published_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='published_lab_rosters')
    edited_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'lab_roster_weeks'
        ordering = ['-week_start']


class LabRosterCell(models.Model):
    """One person, one day. M/D/E/N shifts, OC on call, L leave, O off."""
    week = models.ForeignKey(LabRosterWeek, on_delete=models.CASCADE, related_name='cells')
    staff = models.ForeignKey(LabStaffProfile, on_delete=models.CASCADE, related_name='roster_cells')
    day = models.PositiveSmallIntegerField()  # 0 = Monday
    code = models.CharField(max_length=2, default='O')

    class Meta:
        db_table = 'lab_roster_cells'
        unique_together = [('week', 'staff', 'day')]


class LabStaffRequest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    staff = models.ForeignKey(LabStaffProfile, on_delete=models.CASCADE, related_name='requests')
    week = models.ForeignKey(LabRosterWeek, on_delete=models.CASCADE, related_name='requests')
    type = models.CharField(max_length=20)  # Leave | Shift swap
    days = models.JSONField(default=list)
    reason = models.TextField()
    with_staff = models.ForeignKey(LabStaffProfile, on_delete=models.SET_NULL, null=True, blank=True, related_name='swap_requests')
    status = models.CharField(max_length=20, default='Pending')  # Pending | Approved | Rejected
    raised_at = models.DateTimeField(default=timezone.now)
    decided_at = models.DateTimeField(null=True, blank=True)
    decided_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='decided_lab_requests')

    class Meta:
        db_table = 'lab_staff_requests'
        ordering = ['-raised_at']


class LabStockItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150)
    category = models.CharField(max_length=20, default='Reagent')  # Reagent | Consumable | Calibrator
    unit = models.CharField(max_length=30)
    on_hand = models.IntegerField(default=0)
    reorder_at = models.IntegerField(default=0)
    max_level = models.IntegerField(default=0)
    expiry = models.DateField(null=True, blank=True)
    lot = models.CharField(max_length=60, blank=True, default='')
    supplier = models.CharField(max_length=150, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'lab_stock_items'
        ordering = ['name']


class PurchaseStatus(models.TextChoices):
    AWAITING_APPROVAL = 'Awaiting approval', 'Awaiting approval'
    AWAITING_FINANCE = 'Awaiting Finance', 'Awaiting Finance'
    ORDERED = 'Ordered', 'Ordered'
    DELIVERED = 'Delivered', 'Delivered'
    REJECTED = 'Rejected', 'Rejected'


class LabPurchaseRequest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    stock_item = models.ForeignKey(LabStockItem, on_delete=models.SET_NULL, null=True, blank=True, related_name='purchases')
    item = models.CharField(max_length=150)
    qty = models.PositiveIntegerField()
    unit = models.CharField(max_length=30)
    est_cost = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=PurchaseStatus.choices, default=PurchaseStatus.AWAITING_APPROVAL)
    raised_at = models.DateTimeField(default=timezone.now)
    raised_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='raised_lab_purchases')
    decided_at = models.DateTimeField(null=True, blank=True)
    decided_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='decided_lab_purchases')

    class Meta:
        db_table = 'lab_purchase_requests'
        ordering = ['-raised_at']


class LabPriceDraft(models.Model):
    """Lab Admin's working price for a test. Submitting it raises a Billing tariff change request."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    test = models.OneToOneField(LabTest, on_delete=models.CASCADE, related_name='price_draft')
    base_price = models.DecimalField(max_digits=10, decimal_places=2)
    tpa_price = models.DecimalField(max_digits=10, decimal_places=2)
    stat_surcharge = models.CharField(max_length=50, blank=True, default='')
    effective_date = models.DateField()
    saved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='lab_price_drafts')
    saved_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'lab_price_drafts'


class LabSettings(models.Model):
    """Department settings (single row). `data` uses the Lab Admin settings screen's field names."""
    id = models.PositiveSmallIntegerField(primary_key=True, default=1)
    data = models.JSONField(default=dict)
    saved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='saved_lab_settings')
    saved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'lab_settings'

    @classmethod
    def current(cls):
        obj, _ = cls.objects.get_or_create(id=1)
        return obj
