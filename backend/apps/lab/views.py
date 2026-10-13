"""
Lab API. One endpoint per workflow step; each step checks the order's current status, the user's
role, and writes an audit entry. Orders never fall back to "the first patient/test/doctor":
anything that cannot be resolved is rejected with a clear message.

Workflow:  ORDERED -> SAMPLE_COLLECTED -> SAMPLE_RECEIVED -> IN_ANALYSIS -> RESULTS_ENTERED -> REPORT_APPROVED
           (reject-sample returns the order to ORDERED; request-retest returns it to IN_ANALYSIS)
"""
import re
import uuid
from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.models import DoctorProfile
from apps.audit.models import AuditLog
from apps.patients.models import Patient
from .models import (
    QcRun,
    RejectionReason,
    SampleRejection,
    CallbackStatus,
    CriticalCallAttempt,
    CriticalCallback,
    LabReportAmendment,
    LabTestRangeVersion,
    RangeVersionStatus,
    Equipment,
    EquipmentMaintenanceLog,
    EquipmentStatus,
    LabOrder,
    LabOrderItem,
    LabOrderPriority,
    LabOrderStatus,
    LabReport,
    LabResult,
    LabTest,
    ResultFlag,
)
from .permissions import (
    CanCollectSample,
    CanOrderLab,
    CanReceiveCritical,
    IsBenchStaff,
    IsLabStaffOrReadOnly,
    IsPathologistOrLabAdmin,
)
from .serializers import (
    EquipmentMaintenanceLogSerializer,
    EquipmentSerializer,
    LabOrderSerializer,
    LabReportSerializer,
    LabTestSerializer,
    CriticalCallbackSerializer,
    LabRangeVersionSerializer,
    QcRunSerializer,
    full_name,
)
from .signing import sign_amendment, sign_report, verify_report

DELTA_LIMIT = 0.2  # 20% change from the previous result is flagged for review


# --------------------------------------------------------------------------- helpers

def audit(request, action_name, order, **details):
    AuditLog.objects.create(
        action=action_name,
        entity_name='LabOrder',
        entity_id=str(order.id),
        performed_by=request.user if request.user.is_authenticated else None,
        details={'orderNumber': order.order_number, **details},
    )


def audit_entity(request, action_name, entity_name, entity_id, **details):
    AuditLog.objects.create(
        action=action_name,
        entity_name=entity_name,
        entity_id=str(entity_id),
        performed_by=request.user if request.user.is_authenticated else None,
        details=details,
    )


def ack_window_minutes():
    """Critical read-back window from Lab Admin's department settings (server default if not set)."""
    from .admin_views import critical_ack_minutes
    return critical_ack_minutes(int(getattr(settings, 'LAB_CRITICAL_ACK_MINUTES', 15)))


def designation_of(user):
    profile = getattr(user, 'doctor_profile', None)
    if profile and profile.qualification:
        return f"{profile.qualification}, {profile.department}".strip(', ')
    return user.get_role_display() if hasattr(user, 'get_role_display') else str(getattr(user, 'role', ''))


SEGMENTS = ('adultMale', 'adultFemale', 'child')


def validate_ranges(ranges):
    """Clean {segment: [{name, unit, low, high, criticalLow, criticalHigh}]}; raises with every problem found."""
    if not isinstance(ranges, dict):
        raise ValidationError({'error': 'ranges must be an object with adultMale, adultFemale and child lists.'})
    errors, clean = [], {}
    for seg in SEGMENTS:
        rows = ranges.get(seg) or []
        if not isinstance(rows, list):
            raise ValidationError({'error': f'{seg} must be a list.'})
        out = []
        for r in rows:
            name = str((r or {}).get('name') or '').strip()
            if not name:
                errors.append(f'{seg}: every parameter needs a name.')
                continue
            low, high = to_float(r.get('low')), to_float(r.get('high'))
            cl, ch = to_float(r.get('criticalLow')), to_float(r.get('criticalHigh'))
            label = f'{seg} · {name}'
            if low is None or high is None:
                errors.append(f'{label}: enter both low and high limits.')
            elif low >= high:
                errors.append(f'{label}: low must be below high.')
            if cl is not None and low is not None and cl >= low:
                errors.append(f'{label}: critical low must be below the reference low.')
            if ch is not None and high is not None and ch <= high:
                errors.append(f'{label}: critical high must be above the reference high.')
            out.append({'name': name, 'unit': str(r.get('unit') or ''), 'low': low, 'high': high, 'criticalLow': cl, 'criticalHigh': ch})
        clean[seg] = out
    if not any(clean[s] for s in SEGMENTS):
        errors.append('Add at least one parameter.')
    if errors:
        raise ValidationError({'error': ' '.join(errors[:6]) + (f' (+{len(errors) - 6} more)' if len(errors) > 6 else ''), 'errors': errors})
    return clean


def resolve_equipment(value):
    value = str(value or '').strip()
    if not value:
        return None
    try:
        return Equipment.objects.filter(id=uuid.UUID(value)).first()
    except ValueError:
        return Equipment.objects.filter(Q(code__iexact=value) | Q(name__iexact=value)).first()


def require_status(order, *allowed):
    if order.status not in allowed:
        raise ValidationError({'error': f"Order {order.order_number} is '{order.status}'; this step needs {' or '.join(allowed)}."})


def next_number(model, field, prefix):
    """Next PREFIX-NNNN for this month. Callers retry on IntegrityError (two people at once)."""
    last = 0
    for value in model.objects.filter(**{f'{field}__startswith': prefix}).values_list(field, flat=True):
        m = re.match(rf'^{re.escape(prefix)}(\d+)$', value or '')
        if m:
            last = max(last, int(m.group(1)))
    return f'{prefix}{last + 1:04d}'


def to_float(value):
    if value is None or value == '':
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def flag_for(value, low, high, crit_low, crit_high):
    """Flag from explicit limits only — no guessed critical thresholds."""
    v = to_float(value)
    if v is None:
        return ResultFlag.NORMAL, False
    if crit_low is not None and v < crit_low:
        return ResultFlag.CRITICAL_LOW, True
    if crit_high is not None and v > crit_high:
        return ResultFlag.CRITICAL_HIGH, True
    if low is not None and v < low:
        return ResultFlag.LOW, True
    if high is not None and v > high:
        return ResultFlag.HIGH, True
    return ResultFlag.NORMAL, False


def range_text(low, high, unit):
    if low is not None and high is not None:
        return f'{low:g} - {high:g}'
    if high is not None:
        return f'< {high:g}'
    if low is not None:
        return f'> {low:g}'
    return ''


def resolve_test(data):
    test_id = data.get('testId') or data.get('test')
    code = (data.get('testCode') or '').strip()
    name = (data.get('testName') or '').strip()
    qs = LabTest.objects.filter(is_active=True)
    if test_id:
        try:
            return qs.filter(id=uuid.UUID(str(test_id))).first()
        except ValueError:
            pass
    if code:
        t = qs.filter(test_code__iexact=code).first()
        if t:
            return t
    if name:
        # Exact name first, then a name that contains the requested one (e.g. "CBC" ordering text)
        exact = list(qs.filter(name__iexact=name))
        if exact:
            # Duplicate catalog names: prefer the entry that defines its parameters
            return next((t for t in exact if t.parameters_schema), exact[0])
        matches = list(qs.filter(Q(name__icontains=name) | Q(test_code__icontains=name)))
        if len(matches) == 1:
            return matches[0]
        # Prefer the catalog test that has a parameter schema when names collide
        with_schema = [t for t in matches if t.parameters_schema]
        if len(with_schema) == 1:
            return with_schema[0]
    return None


# --------------------------------------------------------------------------- tests

class LabTestViewSet(viewsets.ModelViewSet):
    queryset = LabTest.objects.all().order_by('name')
    serializer_class = LabTestSerializer
    permission_classes = [IsLabStaffOrReadOnly]
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_queryset(self):
        qs = super().get_queryset()
        p = self.request.query_params
        if p.get('category'):
            qs = qs.filter(category__iexact=p['category'])
        if p.get('department'):
            qs = qs.filter(department__iexact=p['department'])
        if p.get('is_active') is not None:
            qs = qs.filter(is_active=p['is_active'].lower() == 'true')
        if p.get('search'):
            qs = qs.filter(Q(name__icontains=p['search']) | Q(test_code__icontains=p['search']))
        return qs

    def get_permissions(self):
        if self.action in ('create', 'save_range_draft', 'publish_ranges', 'discard_draft'):
            return [IsPathologistOrLabAdmin()]
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        """New catalog test. Its ranges start as a draft and are not used until published as v1."""
        data = request.data
        code = str(data.get('testCode') or '').strip().upper()
        name = str(data.get('name') or '').strip()
        if not code or not name:
            raise ValidationError({'error': 'testCode and name are required.'})
        if LabTest.objects.filter(test_code__iexact=code).exists():
            raise ValidationError({'error': f'{code} is already in the catalog.'})
        ranges = validate_ranges(data.get('ranges') or {})
        tat = int(data.get('tatMinutes') or 240)
        test = LabTest.objects.create(
            test_code=code,
            name=name,
            category=str(data.get('category') or 'Biochemistry'),
            sample_type=str(data.get('sampleType') or ''),
            specimen_type=str(data.get('sampleType') or ''),
            container_type=str(data.get('containerType') or ''),
            tat_minutes=tat,
            turnaround_hours=max(1, round(tat / 60)),
            stat_tat_minutes=int(data['statTatMinutes']) if data.get('statTatMinutes') else None,
            price=0,
            is_active=True,
            parameters_schema=[],
        )
        LabTestRangeVersion.objects.create(test=test, ranges=ranges, created_by=request.user, notes='New test')
        audit_entity(request, 'TEST_CREATED', 'LabTest', test.id, testCode=code, name=name)
        return Response(LabTestSerializer(test).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='range-versions')
    def range_versions(self, request, pk=None):
        test = self.get_object()
        return Response(LabRangeVersionSerializer(test.range_versions.select_related('created_by', 'published_by'), many=True).data)

    @action(detail=True, methods=['post'], url_path='range-draft')
    def save_range_draft(self, request, pk=None):
        test = self.get_object()
        ranges = validate_ranges(request.data.get('ranges'))
        draft = test.range_versions.filter(status=RangeVersionStatus.DRAFT).first()
        if draft:
            draft.ranges = ranges
            draft.created_by = request.user
            draft.notes = str(request.data.get('notes') or draft.notes)
            draft.save()
        else:
            draft = LabTestRangeVersion.objects.create(test=test, ranges=ranges, created_by=request.user, notes=str(request.data.get('notes') or ''))
        audit_entity(request, 'RANGES_DRAFT_SAVED', 'LabTest', test.id, testCode=test.test_code)
        return Response(LabTestSerializer(test).data)

    @action(detail=True, methods=['post'], url_path='discard-draft')
    def discard_draft(self, request, pk=None):
        test = self.get_object()
        deleted, _ = test.range_versions.filter(status=RangeVersionStatus.DRAFT).delete()
        if deleted:
            audit_entity(request, 'RANGES_DRAFT_DISCARDED', 'LabTest', test.id, testCode=test.test_code)
        return Response(LabTestSerializer(test).data)

    @action(detail=True, methods=['post'], url_path='publish-ranges')
    def publish_ranges(self, request, pk=None):
        """Publish the draft (optionally replacing its ranges first) as the next version; the old one retires."""
        test = self.get_object()
        with transaction.atomic():
            draft = test.range_versions.select_for_update().filter(status=RangeVersionStatus.DRAFT).first()
            if request.data.get('ranges') is not None:
                ranges = validate_ranges(request.data.get('ranges'))
                if draft:
                    draft.ranges = ranges
                else:
                    draft = LabTestRangeVersion(test=test, ranges=ranges, created_by=request.user)
            if not draft:
                raise ValidationError({'error': f'{test.test_code} has no draft ranges to publish.'})
            validate_ranges(draft.ranges)
            current = test.range_versions.filter(status=RangeVersionStatus.PUBLISHED).first()
            last = test.range_versions.exclude(status=RangeVersionStatus.DRAFT).order_by('-version').first()
            if current:
                current.status = RangeVersionStatus.RETIRED
                current.retired_at = timezone.now()
                current.save()
            draft.version = (last.version if last else 0) + 1
            draft.status = RangeVersionStatus.PUBLISHED
            draft.published_by = request.user
            draft.published_at = timezone.now()
            draft.save()
            # Keep the flat schema (used by older callers) in step with the adult male ranges
            groups = {str(p.get('name', '')).lower(): p.get('group') for p in (test.parameters_schema or []) if isinstance(p, dict)}
            test.parameters_schema = [{**r, 'group': groups.get(r['name'].lower()) or (test.category or 'Results').upper()} for r in draft.ranges.get('adultMale', [])]
            test.save(update_fields=['parameters_schema', 'updated_at'])
        audit_entity(request, 'RANGES_PUBLISHED', 'LabTest', test.id, testCode=test.test_code, version=draft.version, retired=current.version if current else None)
        return Response(LabTestSerializer(test).data)


# --------------------------------------------------------------------------- orders

class LabOrderViewSet(viewsets.ModelViewSet):
    serializer_class = LabOrderSerializer
    http_method_names = ['get', 'post', 'head', 'options']

    def get_queryset(self):
        qs = (
            LabOrder.objects.select_related(
                'patient', 'test', 'doctor__user', 'sample_collector', 'received_by', 'processing_by',
                'results_entered_by', 'critical_acknowledged_by', 'retest_requested_by', 'report__approved_by',
            )
            .prefetch_related('results__entered_by')
            .order_by('-ordered_at')
        )
        p = self.request.query_params
        if p.get('status') or p.get('stage'):
            qs = qs.filter(status__in=[s.strip().upper() for s in (p.get('status') or p.get('stage')).split(',')])
        if p.get('priority'):
            qs = qs.filter(priority__iexact=p['priority'])
        if p.get('patientId') or p.get('patient'):
            qs = qs.filter(patient__id=p.get('patientId') or p.get('patient'))
        if p.get('uhid'):
            qs = qs.filter(patient__uhid__iexact=p['uhid'])
        if p.get('is_flagged_critical') is not None:
            qs = qs.filter(is_flagged_critical=p['is_flagged_critical'].lower() == 'true')
        if p.get('search'):
            s = p['search']
            qs = qs.filter(
                Q(order_number__icontains=s) | Q(barcode__icontains=s) | Q(patient__first_name__icontains=s)
                | Q(patient__last_name__icontains=s) | Q(patient__uhid__icontains=s)
            )
        if p.get('since_days'):
            try:
                qs = qs.filter(ordered_at__gte=timezone.now() - timezone.timedelta(days=int(p['since_days'])))
            except ValueError:
                pass
        return qs

    def get_permissions(self):
        perms = {
            'create': CanOrderLab,
            'collect_sample': CanCollectSample,
            'acknowledge_critical': CanReceiveCritical,
            'receive_sample': IsBenchStaff,
            'reject_sample': IsBenchStaff,
            'start_analysis': IsBenchStaff,
            'enter_results': IsBenchStaff,
            'request_retest': IsPathologistOrLabAdmin,
            'interpretation_draft': IsPathologistOrLabAdmin,
            'log_call': CanReceiveCritical,
        }
        cls = perms.get(self.action)
        if cls:
            return [cls()]
        return [IsAuthenticated()]

    def get_object(self):
        val = str(self.kwargs.get('pk'))
        qs = self.get_queryset()
        try:
            order = qs.filter(id=uuid.UUID(val)).first()
        except ValueError:
            order = qs.filter(Q(order_number__iexact=val) | Q(barcode__iexact=val)).first()
        if not order:
            raise NotFound({'error': f"Lab order '{val}' was not found."})
        return order

    def _respond(self, order):
        order = self.get_queryset().get(pk=order.pk)
        return Response(LabOrderSerializer(order).data)

    # ---- create (doctor, nurse, assistant, lab) --------------------------------------------
    def create(self, request, *args, **kwargs):
        data = request.data
        patient = None
        if data.get('patientId'):
            try:
                patient = Patient.objects.filter(id=uuid.UUID(str(data['patientId']))).first()
            except ValueError:
                patient = None
        if not patient and data.get('uhid'):
            patient = Patient.objects.filter(uhid__iexact=str(data['uhid']).strip()).first()
        if not patient:
            raise ValidationError({'error': f"Patient {data.get('uhid') or data.get('patientId') or ''} is not registered on the server. Register the patient first.".replace('  ', ' ')})

        test = resolve_test(data)
        if not test:
            raise ValidationError({'error': f"Test '{data.get('testCode') or data.get('testName') or ''}' is not in the lab catalog."})

        doctor = getattr(request.user, 'doctor_profile', None) if request.user.is_authenticated else None
        if not doctor and data.get('doctorId'):
            try:
                doctor = DoctorProfile.objects.filter(id=uuid.UUID(str(data['doctorId']))).first()
            except ValueError:
                doctor = None

        priority = str(data.get('priority') or 'ROUTINE').upper()
        if priority not in LabOrderPriority.values:
            raise ValidationError({'error': f"Priority must be one of {', '.join(LabOrderPriority.values)}."})

        prefix = f"LAB-{timezone.now():%y%m}-"
        order = None
        for _ in range(5):
            try:
                with transaction.atomic():
                    order = LabOrder.objects.create(
                        order_number=next_number(LabOrder, 'order_number', prefix),
                        patient=patient,
                        test=test,
                        doctor=doctor,
                        encounter_id=data.get('encounterId') or None,
                        clinical_notes=data.get('clinicalNotes') or None,
                        ordering_location=str(data.get('location') or '')[:150],
                        priority=priority,
                        status=LabOrderStatus.ORDERED,
                        barcode=f"SPM-{uuid.uuid4().hex[:8].upper()}",
                        ordered_at=timezone.now(),
                    )
                    LabOrderItem.objects.create(order=order, test=test, status='ORDERED')
                break
            except IntegrityError:
                order = None
        if not order:
            return Response({'error': 'Could not allocate an order number; try again.'}, status=status.HTTP_409_CONFLICT)

        billing_note = None
        try:
            from apps.billing.services import DepartmentChargeIntegrationService
            DepartmentChargeIntegrationService.emit_lab_test_charges(order)
        except Exception as exc:  # the order stands; Billing staff see the missing charge in leakage checks
            billing_note = f'Charge not staged in Billing: {exc}'
        audit(request, 'LAB_ORDERED', order, test=test.test_code, priority=priority, location=order.ordering_location, billingNote=billing_note)
        resp = self._respond(order)
        resp.status_code = status.HTTP_201_CREATED
        if billing_note:
            resp.data['billingWarning'] = billing_note
        return resp

    # ---- sample ------------------------------------------------------------------------------
    @action(detail=True, methods=['get'], url_path='clearance-status')
    def clearance_status(self, request, pk=None):
        order = self.get_object()
        from apps.billing.services import DepartmentChargeIntegrationService
        return Response(DepartmentChargeIntegrationService.is_lab_sample_collection_allowed(order.id))

    @action(detail=True, methods=['post'], url_path='collect-sample')
    def collect_sample(self, request, pk=None):
        order = self.get_object()
        require_status(order, LabOrderStatus.ORDERED)
        # Hard gate: Billing must clear collection. If Billing cannot be checked, do not collect.
        try:
            from apps.billing.services import DepartmentChargeIntegrationService
            clearance = DepartmentChargeIntegrationService.is_lab_sample_collection_allowed(order.id)
        except Exception as exc:
            return Response({'error': 'Sample collection blocked: billing status could not be verified', 'detail': str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        if not clearance.get('allowed', False):
            return Response(
                {'error': 'Sample collection blocked: Bill Unsettled at Cash Counter', 'detail': clearance.get('reason'), 'clearance': clearance},
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )
        order.status = LabOrderStatus.SAMPLE_COLLECTED
        order.collected_at = timezone.now()
        order.sample_collector = request.user
        order.sample_rejected_reason = None
        if not order.barcode:
            order.barcode = f"SPM-{uuid.uuid4().hex[:8].upper()}"
        order.save()
        audit(request, 'SAMPLE_COLLECTED', order)
        return self._respond(order)

    @action(detail=True, methods=['post'], url_path='receive-sample')
    def receive_sample(self, request, pk=None):
        order = self.get_object()
        require_status(order, LabOrderStatus.SAMPLE_COLLECTED)
        order.status = LabOrderStatus.SAMPLE_RECEIVED
        order.received_at = timezone.now()
        order.received_by = request.user
        order.save()
        audit(request, 'SAMPLE_RECEIVED', order)
        return self._respond(order)

    @action(detail=True, methods=['post'], url_path='reject-sample')
    def reject_sample(self, request, pk=None):
        order = self.get_object()
        require_status(order, LabOrderStatus.SAMPLE_COLLECTED, LabOrderStatus.SAMPLE_RECEIVED, LabOrderStatus.IN_ANALYSIS)
        reason = str(request.data.get('reason') or '').strip()
        if len(reason) < 3:
            raise ValidationError({'error': 'A rejection reason is required.'})
        code = str(request.data.get('reasonCode') or '').upper()
        if code not in RejectionReason.values:
            code = RejectionReason.OTHER
        if code == RejectionReason.OTHER and len(reason) < 5:
            raise ValidationError({'error': 'Describe why the sample is rejected.'})
        SampleRejection.objects.create(order=order, reason_code=code, reason=reason, stage=order.status, collected_by=order.sample_collector, rejected_by=request.user)
        order.status = LabOrderStatus.ORDERED
        order.sample_rejected_reason = reason
        order.rejected_at = timezone.now()
        order.rejected_by = request.user
        order.collected_at = None
        order.received_at = None
        order.analyzer = None
        order.analyzer_name = ''
        order.processing_at = None
        order.save()
        audit(request, 'SAMPLE_REJECTED', order, reason=reason, reasonCode=code)
        return self._respond(order)

    @action(detail=True, methods=['post'], url_path='start-analysis')
    def start_analysis(self, request, pk=None):
        order = self.get_object()
        # IN_ANALYSIS is allowed so a sample can be moved to another analyzer
        require_status(order, LabOrderStatus.SAMPLE_RECEIVED, LabOrderStatus.SAMPLE_COLLECTED, LabOrderStatus.IN_ANALYSIS)
        equipment = resolve_equipment(request.data.get('analyzerId') or request.data.get('analyzerName'))
        if not equipment:
            raise ValidationError({'error': 'Choose an analyzer from the register.'})
        blocked = equipment.block_reason()
        if blocked:
            raise ValidationError({'error': blocked})
        analyzer = equipment.name
        moved_from = order.analyzer_name if order.status == LabOrderStatus.IN_ANALYSIS else None
        if order.status == LabOrderStatus.SAMPLE_COLLECTED and not order.received_at:
            order.received_at = timezone.now()
            order.received_by = request.user
        order.status = LabOrderStatus.IN_ANALYSIS
        order.analyzer = equipment
        order.analyzer_name = analyzer[:150]
        order.processing_at = timezone.now()
        order.processing_by = request.user
        order.save()
        audit(request, 'ANALYSIS_STARTED', order, analyzer=analyzer, movedFrom=moved_from)
        return self._respond(order)

    # ---- results -----------------------------------------------------------------------------
    @action(detail=True, methods=['post'], url_path='results')
    def enter_results(self, request, pk=None):
        """Save results. submit=false keeps a draft on the bench; submit=true sends them to the pathologist."""
        order = self.get_object()
        require_status(order, LabOrderStatus.IN_ANALYSIS)
        params = request.data.get('parameters') or []
        submit = bool(request.data.get('submit'))
        if not isinstance(params, list) or not params:
            raise ValidationError({'error': 'parameters (a non-empty list) is required.'})

        has_abnormal = has_critical = False
        missing = []
        published, range_version = (order.test.schema_for(order.patient) if order.test else ([], None))
        limits = {str(p.get('name', '')).lower(): p for p in published} if range_version else {}
        with transaction.atomic():
            for p in params:
                name = str(p.get('paramName') or '').strip()
                if not name:
                    raise ValidationError({'error': 'Every parameter needs a paramName.'})
                raw = p.get('observedValue')
                value = '' if raw is None else str(raw).strip()
                if value == '':
                    missing.append(name)
                # Published limits for the patient's group win over whatever the screen sent
                ref = limits.get(name.lower(), p)
                low, high = to_float(ref.get('low')), to_float(ref.get('high'))
                crit_low, crit_high = to_float(ref.get('criticalLow')), to_float(ref.get('criticalHigh'))
                flag, abnormal = flag_for(value, low, high, crit_low, crit_high)
                has_abnormal |= abnormal
                has_critical |= flag in (ResultFlag.CRITICAL_LOW, ResultFlag.CRITICAL_HIGH)

                prev = (
                    LabResult.objects.filter(lab_order__patient=order.patient, parameter_name=name)
                    .exclude(lab_order=order)
                    .order_by('-entered_at')
                    .first()
                )
                delta = False
                if prev and to_float(prev.observed_value) and to_float(value) is not None:
                    pv = to_float(prev.observed_value)
                    delta = abs(to_float(value) - pv) / abs(pv) > DELTA_LIMIT

                if value == '':
                    LabResult.objects.filter(lab_order=order, parameter_name=name).delete()
                    continue
                LabResult.objects.update_or_create(
                    lab_order=order,
                    parameter_name=name,
                    defaults={
                        'group': str(p.get('group') or '')[:100],
                        'low': low,
                        'high': high,
                        'critical_low': crit_low,
                        'critical_high': crit_high,
                        'observed_value': value,
                        'measured_value': value,
                        'reference_range': range_text(low, high, p.get('unit') or ''),
                        'unit': str(p.get('unit') or '')[:30],
                        'flag': flag,
                        'is_abnormal': abnormal,
                        'entered_by': request.user,
                        'entered_at': timezone.now(),
                        'is_delta_flagged': delta,
                        'previous_value': prev.observed_value if prev else None,
                        'previous_date': prev.entered_at if prev else None,
                        'range_version': range_version if name.lower() in limits else None,
                    },
                )

            if submit and missing:
                raise ValidationError({'error': f"Enter a value for: {', '.join(missing)}."})
            if submit and order.analyzer:
                eq = order.analyzer
                if eq.status in (EquipmentStatus.OFFLINE, EquipmentStatus.MAINTENANCE):
                    raise ValidationError({'error': f"{eq.name} is {'offline' if eq.status == EquipmentStatus.OFFLINE else 'in maintenance'}. Move the sample to another analyzer."})
                if eq.qc_status() == 'FAILED':
                    raise ValidationError({'error': f'QC failed on {eq.name}. Results cannot be released until QC passes; re-run or move the sample.'})

            if 'technicianNote' in request.data:
                order.technician_note = str(request.data.get('technicianNote') or '').strip() or None
            order.is_flagged_abnormal = has_abnormal
            order.is_flagged_critical = has_critical
            if submit:
                order.status = LabOrderStatus.RESULTS_ENTERED
                order.results_entered_at = timezone.now()
                order.results_entered_by = request.user
            order.save()
        audit(request, 'RESULTS_SUBMITTED' if submit else 'RESULTS_DRAFT_SAVED', order, critical=has_critical, abnormal=has_abnormal)
        return self._respond(order)

    @action(detail=True, methods=['post'], url_path='request-retest')
    def request_retest(self, request, pk=None):
        order = self.get_object()
        require_status(order, LabOrderStatus.RESULTS_ENTERED)
        reason = str(request.data.get('reason') or '').strip()
        if len(reason) < 3:
            raise ValidationError({'error': 'A re-test reason is required.'})
        order.is_retest = True
        order.retest_reason = reason
        order.retest_routing = 'technician_queue'
        order.retest_requested_at = timezone.now()
        order.retest_requested_by = request.user
        order.status = LabOrderStatus.IN_ANALYSIS
        order.save()
        audit(request, 'RETEST_REQUESTED', order, reason=reason)
        return self._respond(order)

    @action(detail=True, methods=['post'], url_path='interpretation-draft')
    def interpretation_draft(self, request, pk=None):
        """Pathologist's working interpretation; released only when the report is signed."""
        order = self.get_object()
        require_status(order, LabOrderStatus.RESULTS_ENTERED)
        order.pathologist_remarks = str(request.data.get('remarks') or '').strip() or None
        order.save(update_fields=['pathologist_remarks', 'updated_at'])
        return self._respond(order)

    @action(detail=True, methods=['post'], url_path='log-call')
    def log_call(self, request, pk=None):
        """Unanswered call-back attempt (the read-back itself is acknowledge-critical)."""
        order = self.get_object()
        callback = CriticalCallback.objects.filter(order=order).first()
        if not callback:
            raise ValidationError({'error': f'Order {order.order_number} has no open critical call-back.'})
        if callback.status != CallbackStatus.PENDING:
            raise ValidationError({'error': 'This critical result has already been acknowledged.'})
        outcome = str(request.data.get('outcome') or 'NO_ANSWER').upper()[:40]
        note = str(request.data.get('note') or '').strip()[:300]
        CriticalCallAttempt.objects.create(callback=callback, outcome=outcome, note=note, by=request.user)
        audit(request, 'CRITICAL_CALL_ATTEMPT', order, outcome=outcome, note=note or outcome.replace('_', ' ').lower())
        return self._respond(order)

    @action(detail=True, methods=['post'], url_path='acknowledge-critical')
    def acknowledge_critical(self, request, pk=None):
        """Record the read-back. Lab staff record who took the call; a clinician acknowledging in the app is the receiver."""
        order = self.get_object()
        if not order.is_flagged_critical:
            raise ValidationError({'error': f'Order {order.order_number} has no critical result to acknowledge.'})
        if not bool(request.data.get('readBack')):
            raise ValidationError({'error': 'Confirm the value was read back before recording the acknowledgement.'})
        lab_role = getattr(request.user, 'role', None) in ('LAB_TECH', 'PATHOLOGIST', 'DEPARTMENT_ADMIN')
        receiver = str(request.data.get('receivedByName') or '').strip() or (None if lab_role else full_name(request.user))
        if not receiver or len(receiver) < 3:
            raise ValidationError({'error': 'Enter the name of the person who received the result.'})
        role = str(request.data.get('receivedByRole') or '').strip() or (request.user.get_role_display() if not lab_role else '')
        now = timezone.now()
        callback, _ = CriticalCallback.objects.get_or_create(
            order=order,
            defaults={'report': getattr(order, 'report', None), 'released_at': order.results_entered_at or now, 'ack_window_minutes': ack_window_minutes()},
        )
        if callback.status == CallbackStatus.ACKNOWLEDGED:
            raise ValidationError({'error': f'Already acknowledged by {callback.received_by_name}.'})
        callback.status = CallbackStatus.ACKNOWLEDGED
        callback.received_by_name = receiver[:150]
        callback.received_by_role = role[:80]
        callback.read_back_confirmed = True
        callback.acknowledged_at = now
        callback.recorded_by = request.user
        callback.notes = str(request.data.get('notes') or '')[:500]
        callback.save()
        order.critical_acknowledged_at = now
        order.critical_acknowledged_by = request.user
        order.save()
        audit(request, 'CRITICAL_ACKNOWLEDGED', order, note=f"{receiver}{f' ({role})' if role else ''} · read back", minutesOpen=callback.minutes_open())
        return self._respond(order)


class CriticalCallbackViewSet(viewsets.ReadOnlyModelViewSet):
    """Critical call-backs, open ones first. ?status=PENDING|ACKNOWLEDGED"""
    serializer_class = CriticalCallbackSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = CriticalCallback.objects.select_related('order__patient', 'order__test', 'order__doctor__user', 'report', 'recorded_by').prefetch_related('attempts__by')
        if self.request.query_params.get('status'):
            qs = qs.filter(status=self.request.query_params['status'].upper())
        return qs.order_by('status', '-released_at')


# --------------------------------------------------------------------------- reports

class LabReportViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = LabReportSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            LabReport.objects.select_related('order__patient', 'order__test', 'order__doctor__user', 'approved_by', 'amended_by')
            .prefetch_related('order__results')
            .exclude(approved_at__isnull=True)
            .order_by('-approved_at')
        )

    def get_permissions(self):
        if self.action in ('approve_report', 'amend_report'):
            return [IsPathologistOrLabAdmin()]
        return super().get_permissions()

    @staticmethod
    def _order(request):
        order_id = request.data.get('orderId')
        try:
            order = LabOrder.objects.filter(id=uuid.UUID(str(order_id))).first()
        except (ValueError, TypeError):
            order = LabOrder.objects.filter(order_number__iexact=str(order_id or '')).first()
        if not order:
            raise NotFound({'error': f"Lab order '{order_id}' was not found."})
        return order

    @action(detail=False, methods=['post'], url_path='approve')
    def approve_report(self, request):
        """Pathologist sign-off: validates the results and releases the report."""
        order = self._order(request)
        require_status(order, LabOrderStatus.RESULTS_ENTERED)
        remarks = str(request.data.get('remarks') or '').strip()
        if (order.is_flagged_abnormal or order.is_flagged_critical) and len(remarks) < 10:
            raise ValidationError({'error': 'An interpretation is required to sign off an abnormal or critical result.'})

        signer = full_name(request.user)
        report = LabReport.objects.filter(order=order).first()
        for _ in range(5):
            try:
                with transaction.atomic():
                    if not report:
                        report = LabReport(order=order)
                    if not report.report_number:
                        report.report_number = next_number(LabReport, 'report_number', f"RPT-{timezone.now():%y%m}-")
                    report.approved_by = request.user
                    report.approved_at = timezone.now()
                    report.signed_by_name = signer
                    report.pathologist_remarks = remarks or 'All parameters within reference range.'
                    report.signer_designation = designation_of(request.user)[:150]
                    report.digital_signature = f'Electronically signed by {signer}'
                    report.save()
                break
            except IntegrityError:
                report.report_number = None

        order.status = LabOrderStatus.REPORT_APPROVED
        order.pathologist_remarks = report.pathologist_remarks
        order.save()
        sign_report(report)
        report.save(update_fields=['signature_hash', 'updated_at'])

        if order.is_flagged_critical:
            values = [
                {'name': r.parameter_name, 'value': r.observed_value, 'unit': r.unit, 'low': r.low, 'high': r.high, 'criticalLow': r.critical_low, 'criticalHigh': r.critical_high}
                for r in order.results.filter(flag__in=[ResultFlag.CRITICAL_LOW, ResultFlag.CRITICAL_HIGH])
            ]
            callback, created = CriticalCallback.objects.get_or_create(
                order=order,
                defaults={'report': report, 'released_at': report.approved_at, 'ack_window_minutes': ack_window_minutes(), 'critical_values': values},
            )
            if not created and callback.status == CallbackStatus.PENDING:
                callback.report, callback.critical_values = report, values
                callback.save(update_fields=['report', 'critical_values'])
        audit(request, 'REPORT_SIGNED', order, reportNumber=report.report_number, critical=order.is_flagged_critical, signature=report.signature_hash[:12])
        return Response(LabReportSerializer(report).data)

    @action(detail=True, methods=['get'], url_path='verify')
    def verify(self, request, pk=None):
        return Response(verify_report(self.get_object()))

    @action(detail=False, methods=['post'], url_path='amend')
    def amend_report(self, request):
        order = self._order(request)
        reason = str(request.data.get('amendmentReason') or '').strip()
        if len(reason) < 10:
            raise ValidationError({'error': 'Describe the amendment (at least 10 characters).'})
        report = LabReport.objects.filter(order=order).exclude(approved_at__isnull=True).first()
        if not report:
            raise ValidationError({'error': f'Order {order.order_number} has no signed report to amend.'})
        with transaction.atomic():
            number = report.amendments.count() + 1
            amendment = LabReportAmendment.objects.create(
                report=report, number=number, text=reason, signed_by=request.user, signed_by_name=full_name(request.user) or '', signed_at=timezone.now()
            )
            sign_amendment(amendment)
            amendment.save(update_fields=['signature_hash'])
            report.is_amended = True
            report.amendment_reason = reason
            report.amended_at = amendment.signed_at
            report.amended_by = request.user
            report.version = number + 1
            report.save()
        audit(request, 'REPORT_AMENDED', order, reportNumber=report.report_number, reason=reason, addendum=number)
        return Response(LabReportSerializer(report).data)


# --------------------------------------------------------------------------- equipment

class EquipmentViewSet(viewsets.ModelViewSet):
    serializer_class = EquipmentSerializer
    permission_classes = [IsLabStaffOrReadOnly]
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_queryset(self):
        return Equipment.objects.prefetch_related('maintenance_logs', 'qc_runs__performed_by').order_by('name')

    def get_permissions(self):
        if self.action in ('log_qc', 'report_fault', 'return_to_service'):
            return [IsBenchStaff()]
        return super().get_permissions()

    def get_object(self):
        eq = resolve_equipment(self.kwargs.get('pk'))
        if not eq:
            raise NotFound({'error': f"Analyzer '{self.kwargs.get('pk')}' was not found."})
        return eq

    def _respond(self, eq):
        return Response(EquipmentSerializer(self.get_queryset().get(pk=eq.pk)).data)

    @action(detail=True, methods=['post', 'patch'], url_path='status')
    def set_status(self, request, pk=None):
        equipment = self.get_object()
        new_status = str(request.data.get('status') or '').upper()
        if new_status not in dict(Equipment._meta.get_field('status').choices):
            raise ValidationError({'error': 'Unknown equipment status.'})
        equipment.status = new_status
        equipment.save()
        audit_entity(request, 'ANALYZER_STATUS_SET', 'Equipment', equipment.id, analyzer=equipment.name, status=new_status)
        return self._respond(equipment)

    @action(detail=True, methods=['post'], url_path='log-maintenance')
    def log_maintenance(self, request, pk=None):
        equipment = self.get_object()
        log = EquipmentMaintenanceLog.objects.create(
            equipment=equipment,
            log_type=request.data.get('logType', 'PREVENTIVE'),
            performed_by=request.user,
            notes=request.data.get('notes', ''),
        )
        equipment.last_pm_date = timezone.now().date()
        equipment.save()
        return Response({'log': EquipmentMaintenanceLogSerializer(log).data, 'equipment': EquipmentSerializer(equipment).data})

    @action(detail=True, methods=['get', 'post'], url_path='qc')
    def log_qc(self, request, pk=None):
        """GET: QC history. POST: record a QC run; a failure holds patient samples on this analyzer."""
        equipment = self.get_object()
        if request.method == 'GET':
            return Response(QcRunSerializer(equipment.qc_runs.select_related('performed_by')[:50], many=True).data)
        if equipment.status == EquipmentStatus.OFFLINE:
            raise ValidationError({'error': f'{equipment.name} is offline. Return it to service before running QC.'})
        level = str(request.data.get('level') or '').strip()
        lot = str(request.data.get('lot') or '').strip()
        if not level or len(lot) < 3:
            raise ValidationError({'error': 'Control level and lot number are required.'})
        if 'passed' not in request.data:
            raise ValidationError({'error': 'Record whether the QC run passed.'})
        passed = bool(request.data.get('passed'))
        note = str(request.data.get('note') or '').strip()
        if not passed and len(note) < 5:
            raise ValidationError({'error': 'Describe the QC failure (rule violated, value obtained).'})
        QcRun.objects.create(equipment=equipment, level=level[:60], lot=lot[:60], passed=passed, note=note, performed_by=request.user)
        if passed and equipment.alert_title.startswith('QC failed'):
            equipment.alert_title, equipment.alert_body = '', ''
        elif not passed:
            equipment.alert_title = f'QC failed · {level}'[:150]
            equipment.alert_body = note
        equipment.save()
        held = LabOrder.objects.filter(analyzer=equipment, status=LabOrderStatus.IN_ANALYSIS).count() if not passed else 0
        audit_entity(request, 'QC_PASSED' if passed else 'QC_FAILED', 'Equipment', equipment.id, analyzer=equipment.name, level=level, lot=lot, note=note, samplesHeld=held)
        return self._respond(equipment)

    @action(detail=True, methods=['post'], url_path='report-fault')
    def report_fault(self, request, pk=None):
        equipment = self.get_object()
        description = str(request.data.get('description') or '').strip()
        if len(description) < 5:
            raise ValidationError({'error': 'Describe the fault (error code, what happened).'})
        equipment.status = EquipmentStatus.OFFLINE
        equipment.alert_title = 'Fault reported at the bench'
        equipment.alert_body = f'{description} · {full_name(request.user)}'
        equipment.error_code = str(request.data.get('errorCode') or '')[:50] or equipment.error_code
        equipment.save()
        affected = LabOrder.objects.filter(analyzer=equipment, status=LabOrderStatus.IN_ANALYSIS).count()
        audit_entity(request, 'ANALYZER_FAULT', 'Equipment', equipment.id, analyzer=equipment.name, description=description, samplesToMove=affected)
        return self._respond(equipment)

    @action(detail=True, methods=['post'], url_path='return-to-service')
    def return_to_service(self, request, pk=None):
        """Back in service after a fault or maintenance; QC must pass again before patient samples."""
        equipment = self.get_object()
        if equipment.status not in (EquipmentStatus.OFFLINE, EquipmentStatus.MAINTENANCE):
            raise ValidationError({'error': f'{equipment.name} is already in service.'})
        equipment.status = EquipmentStatus.READY
        equipment.alert_title, equipment.alert_body = '', ''
        equipment.qc_required_after = timezone.now()
        equipment.save()
        audit_entity(request, 'ANALYZER_RETURNED', 'Equipment', equipment.id, analyzer=equipment.name)
        return self._respond(equipment)
