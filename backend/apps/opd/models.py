"""OPD visit core: the encounter that ties reception, nurse, doctor, lab, pharmacy, billing and accounts together.

One OpdVisit per token per day. Every status change writes an OpdVisitEvent (who did it, and on whose behalf when the
doctor assistant acts for the doctor). The visit links one-to-one to the Appointment that Billing keys its
consultation charge on, so cashier flows are unchanged.
"""
import uuid
from django.db import models
from django.db.models import Q

from apps.accounts.models import User, DoctorProfile
from apps.patients.models import Patient
from apps.appointments.models import Appointment, VitalSign


class VisitStatus(models.TextChoices):
    WAITING = 'WAITING', 'Waiting'
    CALLED_TRIAGE = 'CALLED_TRIAGE', 'Called to triage'
    IN_TRIAGE = 'IN_TRIAGE', 'In triage'
    READY_FOR_DOCTOR = 'READY_FOR_DOCTOR', 'Ready for doctor'
    CALLED_IN = 'CALLED_IN', 'Called in'
    IN_CONSULTATION = 'IN_CONSULTATION', 'In consultation'
    AWAITING_REPORTS = 'AWAITING_REPORTS', 'Awaiting reports'
    ON_HOLD = 'ON_HOLD', 'On hold'
    COMPLETED = 'COMPLETED', 'Completed'
    CHECKED_OUT = 'CHECKED_OUT', 'Checked out'
    NO_SHOW = 'NO_SHOW', 'No show'
    CANCELLED = 'CANCELLED', 'Cancelled'


CLOSED_STATUSES = [VisitStatus.COMPLETED, VisitStatus.CHECKED_OUT, VisitStatus.NO_SHOW, VisitStatus.CANCELLED]


class VisitType(models.TextChoices):
    NEW = 'NEW', 'New'
    FOLLOW_UP = 'FOLLOW_UP', 'Follow-up'
    EMERGENCY = 'EMERGENCY', 'Emergency'
    REVIEW = 'REVIEW', 'Review'


class VisitPriority(models.TextChoices):
    NORMAL = 'NORMAL', 'Normal'
    URGENT = 'URGENT', 'Urgent'
    VIP = 'VIP', 'VIP'
    EMERGENCY = 'EMERGENCY', 'Emergency'


class FeeStatus(models.TextChoices):
    UNPAID = 'UNPAID', 'Unpaid'
    PAID = 'PAID', 'Paid'
    WAIVED = 'WAIVED', 'Waived'
    NONE = 'NONE', 'No fee'
    REFUNDED = 'REFUNDED', 'Refunded'
    CREDITED = 'CREDITED', 'Carried to next visit'


class OpdVisit(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    visit_number = models.CharField(max_length=40, unique=True, db_index=True)
    token_number = models.IntegerField()
    visit_date = models.DateField(db_index=True)
    patient = models.ForeignKey(Patient, on_delete=models.PROTECT, related_name='opd_visits')
    doctor = models.ForeignKey(DoctorProfile, on_delete=models.PROTECT, null=True, blank=True, related_name='opd_visits')
    chamber = models.CharField(max_length=60, blank=True, default='')
    appointment = models.OneToOneField(Appointment, on_delete=models.SET_NULL, null=True, blank=True, related_name='opd_visit')
    visit_type = models.CharField(max_length=20, choices=VisitType.choices, default=VisitType.NEW)
    priority = models.CharField(max_length=20, choices=VisitPriority.choices, default=VisitPriority.NORMAL)
    status = models.CharField(max_length=30, choices=VisitStatus.choices, default=VisitStatus.WAITING, db_index=True)
    hold_reason = models.TextField(blank=True, default='')
    issued_at = models.DateTimeField(auto_now_add=True)
    triage_started_at = models.DateTimeField(null=True, blank=True)
    triaged_at = models.DateTimeField(null=True, blank=True)
    called_at = models.DateTimeField(null=True, blank=True)
    seated_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    checked_out_at = models.DateTimeField(null=True, blank=True)
    fee_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    fee_status = models.CharField(max_length=10, choices=FeeStatus.choices, default=FeeStatus.UNPAID)
    checkout_routes = models.JSONField(default=list, blank=True)
    referral = models.JSONField(null=True, blank=True)
    source_ref = models.CharField(max_length=64, unique=True, null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'opd_visits'
        ordering = ['visit_date', 'token_number']
        indexes = [
            models.Index(fields=['visit_date', 'status']),
            models.Index(fields=['visit_date', 'doctor']),
            models.Index(fields=['patient', 'visit_date']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['patient', 'visit_date'], condition=~Q(status__in=CLOSED_STATUSES),
                name='opd_one_active_visit_per_patient_per_day',
            ),
            # one patient in a doctor's chamber at a time, even when two desks call in at the same instant
            models.UniqueConstraint(
                fields=['doctor', 'visit_date'], condition=Q(status__in=['CALLED_IN', 'IN_CONSULTATION']),
                name='opd_one_patient_in_chamber_per_doctor',
            ),
        ]

    def __str__(self):
        return f"{self.visit_number} · token {self.token_number}"


class OpdVisitEvent(models.Model):
    """Immutable audit trail: every status change and doctor-level action."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    visit = models.ForeignKey(OpdVisit, on_delete=models.CASCADE, related_name='events')
    action = models.CharField(max_length=40)
    from_status = models.CharField(max_length=30, blank=True, default='')
    to_status = models.CharField(max_length=30, blank=True, default='')
    performed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    on_behalf_of = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    role = models.CharField(max_length=50, blank=True, default='')
    payload = models.JSONField(default=dict, blank=True)
    at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'opd_visit_events'
        ordering = ['at']


class TriageCategory(models.TextChoices):
    IMMEDIATE = 'IMMEDIATE', 'Immediate'
    VERY_URGENT = 'VERY_URGENT', 'Very urgent'
    URGENT = 'URGENT', 'Urgent'
    STANDARD = 'STANDARD', 'Standard'
    NON_URGENT = 'NON_URGENT', 'Non-urgent'


class TriageAssessment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    visit = models.OneToOneField(OpdVisit, on_delete=models.CASCADE, related_name='triage')
    vitals = models.OneToOneField(VitalSign, on_delete=models.SET_NULL, null=True, blank=True, related_name='triage')
    chief_complaint = models.TextField(blank=True, default='')
    pain_score = models.PositiveSmallIntegerField(null=True, blank=True)
    triage_category = models.CharField(max_length=20, choices=TriageCategory.choices, blank=True, default='')
    news2 = models.PositiveSmallIntegerField(null=True, blank=True)
    allergies = models.JSONField(default=list, blank=True)
    conditions = models.JSONField(default=list, blank=True)
    current_medications = models.JSONField(default=list, blank=True)
    fall_risk = models.BooleanField(default=False)
    pregnancy = models.CharField(max_length=20, blank=True, default='')
    nurse_notes = models.TextField(blank=True, default='')
    submitted = models.BooleanField(default=False)
    triaged_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    triaged_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'opd_triage_assessments'


class AssistantAssignment(models.Model):
    """Which doctors a doctor assistant may act for. Server-checked on every doctor-level write."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    assistant = models.ForeignKey(User, on_delete=models.CASCADE, related_name='assistant_assignments')
    doctor = models.ForeignKey(DoctorProfile, on_delete=models.CASCADE, related_name='assistant_assignments')
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'opd_assistant_assignments'
        constraints = [models.UniqueConstraint(fields=['assistant', 'doctor'], name='opd_assistant_doctor_unique')]


class FeeReviewReason(models.TextChoices):
    ADVANCE_NOTICE = 'ADVANCE_NOTICE', 'Patient informed in advance'
    NO_NOTICE = 'NO_NOTICE', 'Missed without notice'
    EMERGENCY = 'EMERGENCY', 'Medical emergency / exceptional'
    BILLING_ERROR = 'BILLING_ERROR', 'Duplicate payment / billing error'
    OTHER = 'OTHER', 'Other'


class FeeDecision(models.TextChoices):
    REFUND = 'REFUND', 'Refund'
    RESCHEDULE = 'RESCHEDULE', 'Carry fee to a rescheduled visit'
    RETAIN = 'RETAIN', 'Retain under no-show policy'


class OpdFeeReview(models.Model):
    """A paid visit that ended as no-show / cancelled waits here for the reception supervisor's decision."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    visit = models.OneToOneField(OpdVisit, on_delete=models.CASCADE, related_name='fee_review')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    paid_at = models.CharField(max_length=20, default='FRONT_DESK')  # FRONT_DESK | CASHIER
    outcome = models.CharField(max_length=20)  # NO_SHOW | CANCELLED
    reason = models.CharField(max_length=20, choices=FeeReviewReason.choices, blank=True, default='')
    status = models.CharField(max_length=20, default='PENDING')  # PENDING | DECIDED | REFUND_PAID | CREDIT_USED
    decision = models.CharField(max_length=20, choices=FeeDecision.choices, blank=True, default='')
    note = models.TextField(blank=True, default='')
    refund_mode = models.CharField(max_length=10, blank=True, default='')
    refund_reference = models.CharField(max_length=40, blank=True, default='')
    credit_used_by = models.OneToOneField(OpdVisit, on_delete=models.SET_NULL, null=True, blank=True, related_name='fee_credit_from')
    decided_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    decided_at = models.DateTimeField(null=True, blank=True)
    refund_paid_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    refund_paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'opd_fee_reviews'
        ordering = ['-created_at']


class ConsultationDraft(models.Model):
    """Doctor's work in progress for a visit (autosave, kept while the patient is away for tests)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    visit = models.OneToOneField(OpdVisit, on_delete=models.CASCADE, related_name='draft')
    data = models.JSONField(default=dict, blank=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'opd_consultation_drafts'


class ProcedureKind(models.TextChoices):
    INJECTION = 'INJECTION', 'Injection'
    IV_FLUID = 'IV_FLUID', 'IV fluid'
    NEBULISATION = 'NEBULISATION', 'Nebulisation'
    DRESSING = 'DRESSING', 'Dressing'
    ECG = 'ECG', 'ECG'
    OTHER = 'OTHER', 'Procedure'


class OpdProcedure(models.Model):
    """Treatment-room record: a clinic dose or procedure given (charged) or refused (not charged)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    visit = models.ForeignKey(OpdVisit, on_delete=models.PROTECT, related_name='procedures')
    patient = models.ForeignKey(Patient, on_delete=models.PROTECT, related_name='opd_procedures')
    kind = models.CharField(max_length=20, choices=ProcedureKind.choices)
    detail = models.CharField(max_length=255)
    # clinical.PrescriptionItem id (no FK: clinical already depends on this app)
    prescription_item_id = models.UUIDField(null=True, blank=True, unique=True)
    prescription_number = models.CharField(max_length=60, blank=True, default='')
    ordered_by = models.CharField(max_length=150, blank=True, default='')
    route = models.CharField(max_length=40, blank=True, default='')
    site = models.CharField(max_length=60, blank=True, default='')
    batch_no = models.CharField(max_length=60, blank=True, default='')
    status = models.CharField(max_length=10)  # GIVEN | REFUSED
    five_rights = models.BooleanField(default=False)
    note = models.TextField(blank=True, default='')
    given_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    given_at = models.DateTimeField(auto_now_add=True)
    charges = models.ManyToManyField('billing.BillableChargeItem', blank=True, related_name='opd_procedures')

    class Meta:
        db_table = 'opd_procedures'
        ordering = ['-given_at']


class DaycareStay(models.Model):
    """A day-care / observation bed stay. The bed itself is the campus bed (bed_ref = campus bed id)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    stay_number = models.CharField(max_length=30, unique=True)
    visit = models.ForeignKey(OpdVisit, on_delete=models.SET_NULL, null=True, blank=True, related_name='daycare_stays')
    patient = models.ForeignKey(Patient, on_delete=models.PROTECT, related_name='daycare_stays')
    doctor = models.ForeignKey(DoctorProfile, on_delete=models.SET_NULL, null=True, blank=True, related_name='daycare_stays')
    bed_ref = models.CharField(max_length=60, db_index=True)
    bed_label = models.CharField(max_length=60, blank=True, default='')
    ward_name = models.CharField(max_length=120, blank=True, default='')
    nurse_name = models.CharField(max_length=120, blank=True, default='')
    reason = models.CharField(max_length=255)
    status = models.CharField(max_length=12, default='OCCUPIED')  # OCCUPIED | DISCHARGED
    admitted_at = models.DateTimeField(auto_now_add=True)
    admitted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    discharged_at = models.DateTimeField(null=True, blank=True)
    discharged_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    discharge_outcome = models.CharField(max_length=30, blank=True, default='')
    discharge_note = models.TextField(blank=True, default='')
    cleaned_at = models.DateTimeField(null=True, blank=True)
    cleaned_by = models.CharField(max_length=120, blank=True, default='')
    charges = models.ManyToManyField('billing.BillableChargeItem', blank=True, related_name='daycare_stays')

    class Meta:
        db_table = 'opd_daycare_stays'
        ordering = ['-admitted_at']
        constraints = [
            models.UniqueConstraint(fields=['bed_ref'], condition=Q(status='OCCUPIED'), name='opd_daycare_one_patient_per_bed'),
            models.UniqueConstraint(fields=['patient'], condition=Q(status='OCCUPIED'), name='opd_daycare_one_bed_per_patient'),
        ]


class NursingChartEntry(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    stay = models.ForeignKey(DaycareStay, on_delete=models.CASCADE, related_name='chart')
    kind = models.CharField(max_length=12)  # READING | ESCALATION | NOTE
    systolic_bp = models.IntegerField(null=True, blank=True)
    diastolic_bp = models.IntegerField(null=True, blank=True)
    pulse = models.IntegerField(null=True, blank=True)
    temperature = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    spo2 = models.IntegerField(null=True, blank=True)
    respiratory_rate = models.IntegerField(null=True, blank=True)
    avpu = models.CharField(max_length=1, blank=True, default='')
    on_oxygen = models.BooleanField(default=False)
    pain = models.PositiveSmallIntegerField(null=True, blank=True)
    news2 = models.PositiveSmallIntegerField(null=True, blank=True)
    escalated_to = models.CharField(max_length=120, blank=True, default='')
    automatic = models.BooleanField(default=False)
    note = models.TextField(blank=True, default='')
    by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'opd_nursing_chart'
        ordering = ['at']


class DaycareRoundNote(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    stay = models.ForeignKey(DaycareStay, on_delete=models.CASCADE, related_name='rounds')
    note = models.TextField()
    plan = models.CharField(max_length=40, blank=True, default='')
    performed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    on_behalf_of = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'opd_daycare_rounds'
        ordering = ['at']


class OpdFollowUp(models.Model):
    """The doctor's follow-up instruction: waits to be booked, then completed when the patient checks in."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(Patient, on_delete=models.PROTECT, related_name='opd_follow_ups')
    origin_visit = models.ForeignKey(OpdVisit, on_delete=models.SET_NULL, null=True, blank=True, related_name='follow_ups')
    doctor = models.ForeignKey(DoctorProfile, on_delete=models.SET_NULL, null=True, blank=True, related_name='opd_follow_ups')
    due_date = models.DateField()
    reason = models.CharField(max_length=255, blank=True, default='')
    clinical_note = models.TextField(blank=True, default='')
    status = models.CharField(max_length=20, default='PENDING_BOOKING')  # PENDING_BOOKING | BOOKED | COMPLETED | MISSED | CANCELLED
    completed_visit = models.ForeignKey(OpdVisit, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    performed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    on_behalf_of = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'opd_follow_ups'
        ordering = ['due_date']


class OpdBooking(models.Model):
    """An advance OPD appointment (a slot with a doctor). Becomes an OpdVisit when the patient checks in."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ref = models.CharField(max_length=30, unique=True)
    date = models.DateField(db_index=True)
    slot = models.CharField(max_length=20)
    patient = models.ForeignKey(Patient, on_delete=models.PROTECT, related_name='opd_bookings')
    doctor = models.ForeignKey(DoctorProfile, on_delete=models.PROTECT, related_name='opd_bookings')
    room = models.CharField(max_length=60, blank=True, default='')
    visit_type = models.CharField(max_length=20, default='NEW')  # NEW | FOLLOW_UP | SECOND_OPINION
    fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(max_length=12, default='BOOKED')  # BOOKED | CHECKED_IN | CANCELLED | NO_SHOW
    follow_up = models.ForeignKey(OpdFollowUp, on_delete=models.SET_NULL, null=True, blank=True, related_name='bookings')
    visit = models.OneToOneField(OpdVisit, on_delete=models.SET_NULL, null=True, blank=True, related_name='booking')
    notes = models.TextField(blank=True, default='')
    cancel_reason = models.CharField(max_length=255, blank=True, default='')
    booked_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    booked_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'opd_bookings'
        ordering = ['date', 'slot']
        constraints = [models.UniqueConstraint(fields=['doctor', 'date', 'slot'], condition=Q(status__in=['BOOKED', 'CHECKED_IN']),
                                               name='opd_booking_one_patient_per_slot')]


class OpdEmergencyAlert(models.Model):
    """Code Blue / nurse escalation shown on every doctor desk until a doctor attends."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    kind = models.CharField(max_length=12, default='CODE_BLUE')  # CODE_BLUE | ESCALATION
    priority = models.CharField(max_length=15, default='RED_IMMEDIATE')  # RED_IMMEDIATE | YELLOW_URGENT
    location = models.CharField(max_length=150)
    patient = models.ForeignKey(Patient, on_delete=models.SET_NULL, null=True, blank=True, related_name='opd_alerts')
    patient_name = models.CharField(max_length=150, default='Unknown person')
    age = models.PositiveSmallIntegerField(default=0)
    gender = models.CharField(max_length=20, blank=True, default='')
    visit = models.ForeignKey(OpdVisit, on_delete=models.SET_NULL, null=True, blank=True, related_name='alerts')
    stay = models.ForeignKey('DaycareStay', on_delete=models.SET_NULL, null=True, blank=True, related_name='alerts')
    condition = models.TextField()
    escalated_to = models.CharField(max_length=150, blank=True, default='')
    automatic = models.BooleanField(default=False)
    status = models.CharField(max_length=10, default='ACTIVE')  # ACTIVE | ATTENDED
    raised_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    raised_at = models.DateTimeField(auto_now_add=True)
    attended_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    attended_at = models.DateTimeField(null=True, blank=True)
    outcome = models.TextField(blank=True, default='')

    class Meta:
        db_table = 'opd_emergency_alerts'
        ordering = ['status', '-raised_at']


class OpdConfigDoc(models.Model):
    """OPD admin configuration documents (department settings, doctors, chambers, roster, fee master), shared by every
    browser. Fees, policy and capacities are applied from them on the server."""
    KINDS = ('workspace', 'doctors', 'rooms', 'schedules', 'tariff')
    kind = models.CharField(max_length=20, primary_key=True)
    data = models.JSONField(default=dict)
    version = models.PositiveIntegerField(default=0)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'opd_config_docs'


class OpdDoctorBlock(models.Model):
    """Time a doctor is not available (leave, OT, conference). An all-day block today refuses new tokens."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.ForeignKey(DoctorProfile, on_delete=models.CASCADE, related_name='opd_blocks')
    date = models.DateField(db_index=True)
    all_day = models.BooleanField(default=True)
    from_slot = models.CharField(max_length=20, blank=True, default='')
    to_slot = models.CharField(max_length=20, blank=True, default='')
    reason = models.CharField(max_length=255)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'opd_doctor_blocks'
        ordering = ['date']


class OpdDoctorStatus(models.Model):
    doctor = models.OneToOneField(DoctorProfile, on_delete=models.CASCADE, primary_key=True, related_name='opd_status')
    status = models.CharField(max_length=10, default='IN')  # IN | BREAK | ROUNDS | OT | LATE | OUT
    until = models.CharField(max_length=10, blank=True, default='')
    note = models.CharField(max_length=255, blank=True, default='')
    set_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    since = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'opd_doctor_status'


class OpdAdminAudit(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    kind = models.CharField(max_length=10)  # DOCTOR | ROOM | STAFF | ROSTER | TARIFF | POLICY | LIVE
    subject = models.CharField(max_length=200)
    change = models.TextField()
    before = models.TextField(blank=True, default='')
    after = models.TextField(blank=True, default='')
    by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'opd_admin_audit'
        ordering = ['-at']
