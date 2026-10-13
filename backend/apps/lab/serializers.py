"""
Lab serializers. Field names are camelCase for the frontend. No invented values: when data is
missing the field is null (never a placeholder patient age, doctor or signature).
"""
import re
from datetime import date
from rest_framework import serializers
from .models import (
    QcRun,
    SampleRejection,
    CriticalCallback,
    LabReportAmendment,
    LabTestRangeVersion,
    RangeVersionStatus,
    LabTest,
    LabOrder,
    LabOrderItem,
    LabResult,
    LabReport,
    Equipment,
    EquipmentMaintenanceLog,
)


def full_name(user):
    if not user:
        return None
    name = user.get_full_name().strip() if hasattr(user, 'get_full_name') else ''
    return name or getattr(user, 'username', None)


def patient_age(patient):
    """Age in whole years from date_of_birth (stored as text); None if it cannot be parsed."""
    dob = getattr(patient, 'date_of_birth', None)
    m = re.match(r'^(\d{4})-(\d{1,2})-(\d{1,2})', str(dob or ''))
    if not m:
        return None
    try:
        born = date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
    except ValueError:
        return None
    today = date.today()
    return today.year - born.year - ((today.month, today.day) < (born.month, born.day))


def gender_code(patient):
    g = str(getattr(patient, 'gender', '') or '').upper()
    return {'MALE': 'M', 'FEMALE': 'F', 'M': 'M', 'F': 'F'}.get(g, 'Other' if g else None)


class LabRangeVersionSerializer(serializers.ModelSerializer):
    createdByName = serializers.SerializerMethodField()
    publishedByName = serializers.SerializerMethodField()
    publishedAt = serializers.DateTimeField(source='published_at', allow_null=True)
    updatedAt = serializers.DateTimeField(source='updated_at')
    retiredAt = serializers.DateTimeField(source='retired_at', allow_null=True)

    class Meta:
        model = LabTestRangeVersion
        fields = ['id', 'version', 'status', 'ranges', 'notes', 'createdByName', 'updatedAt', 'publishedByName', 'publishedAt', 'retiredAt']

    def get_createdByName(self, obj):
        return full_name(obj.created_by)

    def get_publishedByName(self, obj):
        return full_name(obj.published_by)


class LabTestSerializer(serializers.ModelSerializer):
    testCode = serializers.CharField(source='test_code', required=False)
    sampleType = serializers.CharField(source='sample_type', required=False)
    specimenType = serializers.CharField(source='specimen_type', required=False)
    containerType = serializers.CharField(source='container_type', required=False)
    containerColor = serializers.CharField(source='container_color', required=False)
    turnaroundHours = serializers.IntegerField(source='turnaround_hours', required=False)
    tatMinutes = serializers.IntegerField(source='tat_minutes', required=False)
    tpaPrice = serializers.DecimalField(source='tpa_price', max_digits=10, decimal_places=2, required=False)
    statSurcharge = serializers.CharField(source='stat_surcharge', required=False)
    isActive = serializers.BooleanField(source='is_active', required=False)
    normalRanges = serializers.JSONField(source='normal_ranges', required=False)
    parametersSchema = serializers.JSONField(source='parameters_schema', required=False)
    statTatMinutes = serializers.IntegerField(source='stat_tat_minutes', required=False, allow_null=True)
    publishedRanges = serializers.SerializerMethodField()
    draftRanges = serializers.SerializerMethodField()
    versionHistory = serializers.SerializerMethodField()

    class Meta:
        model = LabTest
        fields = [
            'id', 'testCode', 'name', 'category', 'department', 'sampleType', 'specimenType',
            'containerType', 'containerColor', 'turnaroundHours', 'tatMinutes', 'statTatMinutes', 'price', 'tpaPrice',
            'statSurcharge', 'isActive', 'normalRanges', 'parametersSchema', 'publishedRanges', 'draftRanges',
            'versionHistory', 'created_at', 'updated_at',
        ]

    def _versions(self, obj):
        cache = getattr(obj, '_range_versions_cache', None)
        if cache is None:
            cache = list(obj.range_versions.select_related('created_by', 'published_by').all())
            obj._range_versions_cache = cache
        return cache

    def get_publishedRanges(self, obj):
        v = next((x for x in self._versions(obj) if x.status == RangeVersionStatus.PUBLISHED), None)
        return LabRangeVersionSerializer(v).data if v else None

    def get_draftRanges(self, obj):
        v = next((x for x in self._versions(obj) if x.status == RangeVersionStatus.DRAFT), None)
        return LabRangeVersionSerializer(v).data if v else None

    def get_versionHistory(self, obj):
        return [
            {'version': v.version, 'status': v.status, 'publishedAt': v.published_at, 'publishedByName': full_name(v.published_by), 'retiredAt': v.retired_at, 'notes': v.notes}
            for v in self._versions(obj)
            if v.status != RangeVersionStatus.DRAFT
        ]


class LabResultSerializer(serializers.ModelSerializer):
    paramName = serializers.CharField(source='parameter_name')
    observedValue = serializers.CharField(source='observed_value')
    referenceRange = serializers.CharField(source='reference_range')
    criticalLow = serializers.FloatField(source='critical_low', allow_null=True)
    criticalHigh = serializers.FloatField(source='critical_high', allow_null=True)
    isAbnormal = serializers.BooleanField(source='is_abnormal')
    isDeltaFlagged = serializers.BooleanField(source='is_delta_flagged')
    rangeVersion = serializers.IntegerField(source='range_version', allow_null=True)
    previousValue = serializers.CharField(source='previous_value', allow_null=True)
    previousDate = serializers.DateTimeField(source='previous_date', allow_null=True)
    enteredAt = serializers.DateTimeField(source='entered_at')
    enteredByName = serializers.SerializerMethodField()

    class Meta:
        model = LabResult
        fields = [
            'id', 'paramName', 'group', 'unit', 'low', 'high', 'criticalLow', 'criticalHigh',
            'observedValue', 'referenceRange', 'flag', 'isAbnormal', 'isDeltaFlagged', 'rangeVersion',
            'previousValue', 'previousDate', 'enteredAt', 'enteredByName',
        ]

    def get_enteredByName(self, obj):
        return full_name(obj.entered_by)


class LabReportSummarySerializer(serializers.ModelSerializer):
    reportNumber = serializers.CharField(source='report_number', allow_null=True)
    signedByName = serializers.SerializerMethodField()
    approvedAt = serializers.DateTimeField(source='approved_at', allow_null=True)
    remarks = serializers.CharField(source='pathologist_remarks', allow_null=True)
    signature = serializers.CharField(source='digital_signature', allow_null=True)
    isAmended = serializers.BooleanField(source='is_amended')
    amendmentReason = serializers.CharField(source='amendment_reason', allow_null=True)
    amendedAt = serializers.DateTimeField(source='amended_at', allow_null=True)
    amendedByName = serializers.SerializerMethodField()

    class Meta:
        model = LabReport
        fields = ['id', 'reportNumber', 'signedByName', 'approvedAt', 'remarks', 'signature', 'isAmended', 'amendmentReason', 'amendedAt', 'amendedByName']

    def get_signedByName(self, obj):
        return obj.signed_by_name or full_name(obj.approved_by)

    def get_amendedByName(self, obj):
        return full_name(obj.amended_by)


class LabOrderSerializer(serializers.ModelSerializer):
    """Read shape for every lab screen (technician, pathologist, admin) and the doctor/nurse views."""

    orderNumber = serializers.CharField(source='order_number')
    patient = serializers.SerializerMethodField()
    test = serializers.SerializerMethodField()
    doctorName = serializers.SerializerMethodField()
    location = serializers.CharField(source='ordering_location')
    clinicalNotes = serializers.CharField(source='clinical_notes', allow_null=True)
    orderedAt = serializers.DateTimeField(source='ordered_at')
    collectedAt = serializers.DateTimeField(source='collected_at', allow_null=True)
    collectedByName = serializers.SerializerMethodField()
    receivedAt = serializers.DateTimeField(source='received_at', allow_null=True)
    receivedByName = serializers.SerializerMethodField()
    rejectedReason = serializers.CharField(source='sample_rejected_reason', allow_null=True)
    rejectedAt = serializers.DateTimeField(source='rejected_at', allow_null=True)
    analyzerName = serializers.CharField(source='analyzer_name')
    processingAt = serializers.DateTimeField(source='processing_at', allow_null=True)
    processingByName = serializers.SerializerMethodField()
    resultsEnteredAt = serializers.DateTimeField(source='results_entered_at', allow_null=True)
    resultsEnteredByName = serializers.SerializerMethodField()
    isFlaggedAbnormal = serializers.BooleanField(source='is_flagged_abnormal')
    isFlaggedCritical = serializers.BooleanField(source='is_flagged_critical')
    criticalAcknowledgedAt = serializers.DateTimeField(source='critical_acknowledged_at', allow_null=True)
    criticalAcknowledgedByName = serializers.SerializerMethodField()
    isRetest = serializers.BooleanField(source='is_retest')
    retestReason = serializers.CharField(source='retest_reason', allow_null=True)
    retestRequestedByName = serializers.SerializerMethodField()
    technicianNote = serializers.CharField(source='technician_note', allow_null=True)
    pathologistRemarks = serializers.CharField(source='pathologist_remarks', allow_null=True)
    results = LabResultSerializer(many=True)
    report = serializers.SerializerMethodField()
    billing = serializers.SerializerMethodField()
    analyzer = serializers.SerializerMethodField()
    rejections = serializers.SerializerMethodField()

    class Meta:
        model = LabOrder
        fields = [
            'id', 'orderNumber', 'barcode', 'priority', 'status', 'patient', 'test', 'doctorName', 'location',
            'clinicalNotes', 'encounter_id', 'orderedAt', 'collectedAt', 'collectedByName', 'receivedAt',
            'receivedByName', 'rejectedReason', 'rejectedAt', 'analyzerName', 'processingAt', 'processingByName',
            'resultsEnteredAt', 'resultsEnteredByName', 'isFlaggedAbnormal', 'isFlaggedCritical',
            'criticalAcknowledgedAt', 'criticalAcknowledgedByName', 'isRetest', 'retestReason',
            'retestRequestedByName', 'technicianNote', 'pathologistRemarks', 'results', 'report', 'billing', 'analyzer', 'rejections',
            'updated_at',
        ]

    def get_patient(self, obj):
        p = obj.patient
        return {
            'id': str(p.id),
            'uhid': p.uhid,
            'name': f"{p.first_name} {p.last_name}".strip(),
            'age': patient_age(p),
            'gender': gender_code(p),
        }

    def get_test(self, obj):
        t = obj.test
        if not t:
            return None
        schema, range_version = t.schema_for(obj.patient)
        return {
            'id': str(t.id),
            'code': t.test_code,
            'name': t.name,
            'category': t.category,
            'sampleType': t.sample_type,
            'container': t.container_type,
            'tatMinutes': t.tat_minutes,
            'price': float(t.price),
            'statTatMinutes': t.stat_tat_minutes,
            'parametersSchema': schema,
            'rangeVersion': range_version,
        }

    def get_analyzer(self, obj):
        eq = obj.analyzer
        if not eq:
            return None
        return {'id': str(eq.id), 'code': eq.code, 'name': eq.name, 'status': eq.status, 'qcStatus': eq.qc_status(), 'blockReason': eq.block_reason()}

    def get_rejections(self, obj):
        return [
            {'reasonCode': r.reason_code, 'reason': r.reason, 'stage': r.stage, 'rejectedAt': r.rejected_at, 'rejectedByName': full_name(r.rejected_by), 'collectedByName': full_name(r.collected_by)}
            for r in obj.rejections.all()
        ]

    def get_doctorName(self, obj):
        return f"Dr. {full_name(obj.doctor.user)}" if obj.doctor and obj.doctor.user else None

    def get_collectedByName(self, obj):
        return full_name(obj.sample_collector)

    def get_receivedByName(self, obj):
        return full_name(obj.received_by)

    def get_processingByName(self, obj):
        return full_name(obj.processing_by)

    def get_resultsEnteredByName(self, obj):
        return full_name(obj.results_entered_by)

    def get_criticalAcknowledgedByName(self, obj):
        return full_name(obj.critical_acknowledged_by)

    def get_retestRequestedByName(self, obj):
        return full_name(obj.retest_requested_by)

    def get_report(self, obj):
        try:
            return LabReportSummarySerializer(obj.report).data
        except LabReport.DoesNotExist:
            return None

    def get_billing(self, obj):
        """Collection clearance from Billing, only for orders still waiting for a sample."""
        if obj.status != 'ORDERED' or not self.context.get('with_billing', True):
            return None
        try:
            from apps.billing.services import DepartmentChargeIntegrationService
            c = DepartmentChargeIntegrationService.is_lab_sample_collection_allowed(obj.id)
            return {'collectionAllowed': bool(c.get('allowed')), 'reason': c.get('reason'), 'pendingAmount': c.get('pending_amount')}
        except Exception as exc:  # billing unavailable: report it, never assume paid
            return {'collectionAllowed': False, 'reason': f'Billing check failed: {exc}', 'pendingAmount': None}


class LabReportSerializer(serializers.ModelSerializer):
    """Signed report with its order (for the Signed reports and Critical call-backs screens)."""

    reportNumber = serializers.CharField(source='report_number', allow_null=True)
    signedByName = serializers.SerializerMethodField()
    approvedAt = serializers.DateTimeField(source='approved_at', allow_null=True)
    remarks = serializers.CharField(source='pathologist_remarks', allow_null=True)
    isAmended = serializers.BooleanField(source='is_amended')
    amendmentReason = serializers.CharField(source='amendment_reason', allow_null=True)
    amendedAt = serializers.DateTimeField(source='amended_at', allow_null=True)
    order = serializers.SerializerMethodField()
    auditTrail = serializers.SerializerMethodField()
    signerDesignation = serializers.CharField(source='signer_designation')
    signatureHash = serializers.CharField(source='signature_hash')
    amendments = serializers.SerializerMethodField()
    callback = serializers.SerializerMethodField()

    class Meta:
        model = LabReport
        fields = [
            'id', 'reportNumber', 'version', 'signedByName', 'signerDesignation', 'signatureHash', 'approvedAt', 'remarks',
            'isAmended', 'amendmentReason', 'amendedAt', 'amendments', 'callback', 'order', 'auditTrail',
        ]

    def get_amendments(self, obj):
        return [
            {'number': a.number, 'text': a.text, 'signedByName': a.signed_by_name, 'signedAt': a.signed_at, 'signatureHash': a.signature_hash}
            for a in obj.amendments.all()
        ]

    def get_callback(self, obj):
        cb = CriticalCallback.objects.filter(order_id=obj.order_id).prefetch_related('attempts__by').first()
        return CriticalCallbackSerializer(cb, context={'nested': True}).data if cb else None

    def get_signedByName(self, obj):
        return obj.signed_by_name or full_name(obj.approved_by)

    def get_order(self, obj):
        return LabOrderSerializer(obj.order, context={**self.context, 'with_billing': False}).data

    def get_auditTrail(self, obj):
        from apps.audit.models import AuditLog
        logs = AuditLog.objects.filter(entity_name='LabOrder', entity_id=str(obj.order_id)).select_related('performed_by').order_by('created_at')
        return [
            {'id': str(l.id), 'at': l.created_at, 'action': l.action, 'by': full_name(l.performed_by), 'details': l.details}
            for l in logs
        ]


class LabOrderItemSerializer(serializers.ModelSerializer):
    test_details = LabTestSerializer(source='test', read_only=True)

    class Meta:
        model = LabOrderItem
        fields = ['id', 'order', 'test', 'test_details', 'status', 'created_at']


class EquipmentMaintenanceLogSerializer(serializers.ModelSerializer):
    performedByName = serializers.SerializerMethodField()

    class Meta:
        model = EquipmentMaintenanceLog
        fields = ['id', 'equipment', 'log_type', 'performed_by', 'performedByName', 'notes', 'date']

    def get_performedByName(self, obj):
        return full_name(obj.performed_by)


class QcRunSerializer(serializers.ModelSerializer):
    performedByName = serializers.SerializerMethodField()
    performedAt = serializers.DateTimeField(source='performed_at')

    class Meta:
        model = QcRun
        fields = ['id', 'level', 'lot', 'passed', 'note', 'performedByName', 'performedAt']

    def get_performedByName(self, obj):
        return full_name(obj.performed_by)


class EquipmentSerializer(serializers.ModelSerializer):
    serialNumber = serializers.CharField(source='serial_number', required=False)
    lastPmDate = serializers.DateField(source='last_pm_date', required=False, allow_null=True)
    nextPmDate = serializers.DateField(source='next_pm_date', required=False, allow_null=True)
    serviceContract = serializers.CharField(source='service_contract', required=False, allow_blank=True, allow_null=True)
    errorCode = serializers.CharField(source='error_code', required=False, allow_blank=True, allow_null=True)
    isActive = serializers.BooleanField(source='is_active', required=False)
    testsCovered = serializers.CharField(source='tests_covered', required=False, allow_blank=True)
    reagentPercent = serializers.IntegerField(source='reagent_percent', required=False, allow_null=True)
    alertTitle = serializers.CharField(source='alert_title', read_only=True)
    alertBody = serializers.CharField(source='alert_body', read_only=True)
    serviceTicket = serializers.CharField(source='service_ticket', read_only=True)
    engineerEta = serializers.CharField(source='engineer_eta', read_only=True)
    qcStatus = serializers.SerializerMethodField()
    blockReason = serializers.SerializerMethodField()
    lastQc = serializers.SerializerMethodField()
    qcRuns = serializers.SerializerMethodField()
    queuedCount = serializers.SerializerMethodField()
    maintenanceLogs = EquipmentMaintenanceLogSerializer(source='maintenance_logs', many=True, read_only=True)

    class Meta:
        model = Equipment
        fields = [
            'id', 'code', 'name', 'serialNumber', 'model', 'section', 'status', 'testsCovered', 'reagentPercent',
            'alertTitle', 'alertBody', 'serviceTicket', 'engineerEta', 'qcStatus', 'blockReason', 'lastQc', 'qcRuns',
            'queuedCount', 'lastPmDate', 'nextPmDate', 'serviceContract', 'errorCode', 'isActive', 'maintenanceLogs',
            'created_at', 'updated_at',
        ]

    def _runs(self, obj):
        # qc_runs is prefetched (newest first) by the viewset
        return list(obj.qc_runs.all())

    def get_qcStatus(self, obj):
        return obj.qc_status()

    def get_blockReason(self, obj):
        return obj.block_reason()

    def get_lastQc(self, obj):
        runs = self._runs(obj)
        return QcRunSerializer(runs[0]).data if runs else None

    def get_qcRuns(self, obj):
        return QcRunSerializer(self._runs(obj)[:10], many=True).data

    def get_queuedCount(self, obj):
        return obj.lab_orders.filter(status='IN_ANALYSIS').count()


class CriticalCallbackSerializer(serializers.ModelSerializer):
    releasedAt = serializers.DateTimeField(source='released_at')
    ackWindowMinutes = serializers.IntegerField(source='ack_window_minutes')
    criticalValues = serializers.JSONField(source='critical_values')
    receivedByName = serializers.CharField(source='received_by_name')
    receivedByRole = serializers.CharField(source='received_by_role')
    readBackConfirmed = serializers.BooleanField(source='read_back_confirmed')
    acknowledgedAt = serializers.DateTimeField(source='acknowledged_at', allow_null=True)
    recordedByName = serializers.SerializerMethodField()
    minutesOpen = serializers.SerializerMethodField()
    isOverdue = serializers.BooleanField(source='is_overdue')
    attempts = serializers.SerializerMethodField()
    order = serializers.SerializerMethodField()

    class Meta:
        model = CriticalCallback
        fields = [
            'id', 'status', 'releasedAt', 'ackWindowMinutes', 'criticalValues', 'receivedByName', 'receivedByRole',
            'readBackConfirmed', 'acknowledgedAt', 'recordedByName', 'minutesOpen', 'isOverdue', 'attempts', 'notes', 'order',
        ]

    def get_recordedByName(self, obj):
        return full_name(obj.recorded_by)

    def get_minutesOpen(self, obj):
        return obj.minutes_open()

    def get_attempts(self, obj):
        return [{'at': a.at, 'outcome': a.outcome, 'note': a.note, 'byName': full_name(a.by)} for a in obj.attempts.all()]

    def get_order(self, obj):
        if self.context.get('nested'):
            return None
        o = obj.order
        return {
            'id': str(o.id),
            'orderNumber': o.order_number,
            'patientName': f"{o.patient.first_name} {o.patient.last_name}".strip(),
            'uhid': o.patient.uhid,
            'testName': o.test.name if o.test else None,
            'doctorName': f"Dr. {full_name(o.doctor.user)}" if o.doctor and o.doctor.user else None,
            'location': o.ordering_location,
            'reportNumber': obj.report.report_number if obj.report else None,
        }
