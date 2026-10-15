"""OPD visit services: the state machine, who may do what, and the cross-department hand-offs.

Doctor-level actions may be done by the doctor or by a doctor assistant assigned to that doctor; the assistant's
writes record performed_by = assistant and on_behalf_of = the doctor.
"""
import re
from datetime import date as date_cls
from decimal import Decimal, InvalidOperation

from django.db import transaction, IntegrityError
from django.db.models import Max
from django.utils import timezone
from rest_framework.exceptions import APIException, PermissionDenied, ValidationError

from apps.accounts.models import RoleType, DoctorProfile
from apps.appointments.models import Appointment, VitalSign
from apps.patients.models import Patient
from .models import (
    OpdVisit, OpdVisitEvent, VisitStatus, VisitType, VisitPriority, FeeStatus, TriageAssessment,
    TriageCategory, AssistantAssignment, CLOSED_STATUSES,
)

S = VisitStatus


class Conflict(APIException):
    """The visit changed under you (someone else acted first) or the action clashes with an open visit: 409."""
    status_code = 409
    default_detail = 'This visit was changed by someone else. Refresh and try again.'
    default_code = 'conflict'
RECEPTION = {RoleType.RECEPTIONIST, RoleType.RECEPTION_SUPERVISOR}
ADMINS = {RoleType.DEPARTMENT_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.SUPER_ADMIN}
DOCTORS = {RoleType.DOCTOR, RoleType.SURGEON}
DOCTOR_LEVEL = DOCTORS | {RoleType.DOCTOR_ASSISTANT}
NURSE = {RoleType.NURSE}
WAITING_STATES = {S.WAITING, S.CALLED_TRIAGE, S.IN_TRIAGE, S.READY_FOR_DOCTOR, S.CALLED_IN}

# action -> (allowed from-states, to-state, roles, doctor-level?, reason required?)
TRANSITIONS = {
    'call_triage': ({S.WAITING}, S.CALLED_TRIAGE, NURSE | ADMINS, False, False),
    'start_triage': ({S.WAITING, S.CALLED_TRIAGE}, S.IN_TRIAGE, NURSE | ADMINS, False, False),
    'skip_triage': ({S.WAITING, S.CALLED_TRIAGE, S.IN_TRIAGE}, S.READY_FOR_DOCTOR, NURSE | DOCTOR_LEVEL, False, True),
    'call_in': ({S.READY_FOR_DOCTOR}, S.CALLED_IN, DOCTOR_LEVEL | NURSE | RECEPTION, True, False),
    'seat': ({S.CALLED_IN}, S.IN_CONSULTATION, DOCTOR_LEVEL | NURSE, True, False),
    'hold': (WAITING_STATES, S.ON_HOLD, RECEPTION | NURSE | DOCTOR_LEVEL, False, True),
    'resume': ({S.ON_HOLD}, None, RECEPTION | NURSE | DOCTOR_LEVEL, False, False),
    'no_show': (WAITING_STATES | {S.ON_HOLD}, S.NO_SHOW, RECEPTION | NURSE | DOCTOR_LEVEL, False, True),
    'cancel': (WAITING_STATES | {S.ON_HOLD}, S.CANCELLED, RECEPTION | ADMINS, False, True),
    # Late arrival after a no-show: back in the queue; an open fee review is withdrawn (the consultation happens)
    'reopen': ({S.NO_SHOW}, S.WAITING, RECEPTION | NURSE | DOCTOR_LEVEL, False, False),
}
TIMESTAMP = {S.IN_TRIAGE: 'triage_started_at', S.READY_FOR_DOCTOR: 'triaged_at', S.CALLED_IN: 'called_at',
             S.IN_CONSULTATION: 'seated_at', S.COMPLETED: 'completed_at', S.CHECKED_OUT: 'checked_out_at'}
# visit status -> the Appointment status Billing / legacy screens read
APPOINTMENT_STATUS = {S.WAITING: 'WAITING', S.CALLED_TRIAGE: 'WAITING', S.IN_TRIAGE: 'WAITING', S.ON_HOLD: 'WAITING',
                      S.READY_FOR_DOCTOR: 'TRIAGED', S.CALLED_IN: 'TRIAGED', S.IN_CONSULTATION: 'IN_CONSULTATION',
                      S.AWAITING_REPORTS: 'IN_CONSULTATION', S.COMPLETED: 'COMPLETED', S.CHECKED_OUT: 'COMPLETED',
                      S.NO_SHOW: 'CANCELLED', S.CANCELLED: 'CANCELLED'}
CHECKOUT_ROUTES = {'PHARMACY', 'LAB', 'BILLING', 'RADIOLOGY', 'TREATMENT_ROOM', 'DAYCARE', 'HOME', 'ADMISSION', 'FOLLOW_UP', 'REFERRAL'}


def _role(user):
    return getattr(user, 'role', '')


def _is_admin(user):
    return _role(user) in ADMINS or getattr(user, 'is_superuser', False)


def _money(value, field='fee'):
    try:
        return Decimal(str(value if value not in (None, '') else '0')).quantize(Decimal('0.01'))
    except (InvalidOperation, ValueError):
        raise ValidationError({field: 'Enter a valid amount.'})


def doctor_authority(user, doctor):
    """Who this doctor-level action is on behalf of. Doctor -> None (themself); assigned assistant -> the doctor's
    user. Anyone else -> 403."""
    role = _role(user)
    if _is_admin(user):
        return None
    if role in DOCTORS:
        if doctor and doctor.user_id != user.id:
            raise PermissionDenied('This patient is with another doctor.')
        return None
    if role == RoleType.DOCTOR_ASSISTANT:
        if not doctor or not AssistantAssignment.objects.filter(assistant=user, doctor=doctor, active=True).exists():
            raise PermissionDenied('You are not assigned to this doctor.')
        return doctor.user
    raise PermissionDenied('Only the doctor or their assistant can do this.')


def log(visit, action, user, from_status='', to_status='', on_behalf_of=None, payload=None):
    return OpdVisitEvent.objects.create(
        visit=visit, action=action, from_status=from_status, to_status=to_status, performed_by=user,
        on_behalf_of=on_behalf_of, role=_role(user), payload=payload or {},
    )


def _mirror_appointment(visit):
    apt = visit.appointment
    if apt:
        new = APPOINTMENT_STATUS.get(visit.status, apt.status)
        if apt.status != new:
            apt.status = new
            apt.save(update_fields=['status', 'updated_at'])


def _set_status(visit, to_status):
    visit.status = to_status
    field = TIMESTAMP.get(to_status)
    if field and not getattr(visit, field):
        setattr(visit, field, timezone.now())


def _release_pending_charge(visit):
    from apps.billing.models import BillableChargeItem, ChargeItemStatus
    if not visit.appointment_id:
        return 0
    return BillableChargeItem.objects.filter(department='OPD', source_reference_id=str(visit.appointment_id),
                                             status=ChargeItemStatus.PENDING).update(status=ChargeItemStatus.CANCELLED)


def resolve_doctor(ref):
    """Doctor by DoctorProfile id, staff id ('stf-1') or desk label ('Dr. Sarah Jenkins (Internal Medicine)')."""
    if not ref:
        return None
    ref = str(ref).strip()
    qs = DoctorProfile.objects.select_related('user')
    hit = qs.filter(staff_ref=ref).first()
    if hit:
        return hit
    if re.fullmatch(r'[0-9a-fA-F-]{32,36}', ref):
        hit = qs.filter(id=ref).first()
        if hit:
            return hit
    name = re.sub(r'\(.*?\)', '', ref).replace('Dr.', '').replace('Dr ', '').strip()
    parts = name.split()
    if len(parts) > 1:
        hit = qs.filter(user__first_name__iexact=parts[0], user__last_name__iexact=' '.join(parts[1:])).first()
    return hit or (qs.filter(user__last_name__iexact=parts[-1]).first() if parts else None)


# --------------------------------------------------------------------------- issue

def _next_token(day):
    return (OpdVisit.objects.filter(visit_date=day).aggregate(m=Max('token_number'))['m'] or 0) + 1


def _visit_number(day):
    prefix = f"OPV-{day:%Y%m%d}-"
    n = OpdVisit.objects.filter(visit_number__startswith=prefix).count() + 1
    while OpdVisit.objects.filter(visit_number=f"{prefix}{n:04d}").exists():
        n += 1
    return f"{prefix}{n:04d}"


@transaction.atomic
def issue_visit(*, user, patient, doctor, visit_type=VisitType.NEW, priority=VisitPriority.NORMAL, fee=None,
                fee_paid=False, payment_mode='', receipt='', chamber='', token_number=None, appointment=None,
                source_ref=None, day=None, from_booking=False):
    """Reception issues a token. Creates the Appointment Billing keys on (unless checking in a booking), the visit,
    the consultation charge (fee not yet paid) or the Accounts posting (fee taken at the desk)."""
    from apps.billing.services import DepartmentChargeIntegrationService
    from apps.billing.accounts_bridge import publish_desk_fee

    if _role(user) not in RECEPTION and not _is_admin(user):
        raise PermissionDenied('Only reception can issue OPD tokens.')
    if not patient:
        raise ValidationError({'patient': 'Select a registered patient.'})
    if not doctor:
        raise ValidationError({'doctor': 'Select an OPD doctor.'})
    day = day or timezone.localdate()
    open_visit = OpdVisit.objects.filter(patient=patient, visit_date=day).exclude(status__in=CLOSED_STATUSES).first()
    if open_visit:
        raise Conflict({'patient': f'This patient already holds token {open_visit.token_number} today.'})
    warnings = admission_checks(patient, doctor, visit_type, day, from_booking=from_booking or bool(appointment))
    # The OPD fee master on the server prices the visit; the desk quote is only used until it is published
    quoted = quote_fee(patient, doctor, visit_type)
    fee_amount = quoted if quoted is not None else _money(fee if fee not in (None, '') else doctor.consultation_fee)
    token = int(token_number) if token_number else _next_token(day)
    if not appointment:
        appointment = Appointment.objects.create(
            source='OPD', external_ref=source_ref or '', patient=patient, doctor=doctor,
            appointment_number=f"OPA-{day:%Y%m%d}-{token:03d}-{patient.uhid}"[-50:],
            appointment_date=day.isoformat(), token_number=token,
            type={'FOLLOW_UP': 'FOLLOW_UP', 'EMERGENCY': 'EMERGENCY'}.get(visit_type, 'WALK_IN'),
            desk_payment={'paid': bool(fee_paid), 'quoted_fee': str(fee_amount), 'mode': payment_mode, 'receipt': receipt},
        )
    visit = OpdVisit.objects.create(
        visit_number=_visit_number(day), token_number=token, visit_date=day, patient=patient, doctor=doctor,
        chamber=chamber or '', appointment=appointment, visit_type=visit_type, priority=priority,
        fee_amount=fee_amount, source_ref=source_ref or None, created_by=user,
        fee_status=FeeStatus.NONE if fee_amount <= 0 else (FeeStatus.PAID if fee_paid else FeeStatus.UNPAID),
    )
    credit = take_fee_credit(patient, visit) if (fee_amount > 0 and not fee_paid) else None
    if credit:
        # Fee already taken on the missed visit: no new charge, no new revenue
        visit.fee_status = FeeStatus.PAID
        visit.save(update_fields=['fee_status'])
        appointment.desk_payment = {**(appointment.desk_payment or {}), 'paid': True, 'mode': 'CREDIT', 'receipt': f'CREDIT-{credit.visit.visit_number}'}
        appointment.save(update_fields=['desk_payment'])
    elif fee_amount > 0 and not fee_paid:
        DepartmentChargeIntegrationService.emit_opd_consultation_charge(appointment, fee=fee_amount)
    elif fee_amount > 0 and fee_paid:
        publish_desk_fee(visit, mode=payment_mode, receipt=receipt)
    log(visit, 'ISSUED', user, '', visit.status, payload={'fee': str(fee_amount), 'fee_status': visit.fee_status,
                                                          'doctor': str(doctor.id), 'token': token, 'warnings': warnings})
    visit.warnings = warnings
    return visit


def sync_from_desk(appointment, token: dict, user=None):
    """Front-desk sync bridge (until the reception screen calls POST /opd/visits/ directly): make sure the token has a
    server visit. The desk owns only issue, fee, no-show and cancel; clinical statuses are owned by the visit."""
    from apps.billing.accounts_bridge import publish_desk_fee
    visit = OpdVisit.objects.filter(appointment=appointment).first()
    desk_paid = bool((appointment.desk_payment or {}).get('paid'))
    fee = (appointment.desk_payment or {}).get('quoted_fee')
    if not visit:
        if not appointment.doctor:
            return None
        day = date_cls.fromisoformat(str(appointment.appointment_date)[:10])
        if OpdVisit.objects.filter(patient=appointment.patient, visit_date=day).exclude(status__in=CLOSED_STATUSES).exists():
            return None
        try:
            with transaction.atomic():
                visit = OpdVisit.objects.create(
                    visit_number=_visit_number(day), token_number=appointment.token_number, visit_date=day,
                    patient=appointment.patient, doctor=appointment.doctor, appointment=appointment,
                    chamber=str(token.get('room') or ''), source_ref=appointment.external_ref or None,
                    visit_type={'FOLLOW_UP': 'FOLLOW_UP', 'EMERGENCY': 'EMERGENCY'}.get(appointment.type, 'NEW'),
                    priority=VisitPriority.EMERGENCY if str(token.get('status', '')).upper() == 'EMERGENCY' else VisitPriority.NORMAL,
                    fee_amount=_money(fee), created_by=user if getattr(user, 'is_authenticated', False) else None,
                    fee_status=FeeStatus.PAID if desk_paid else FeeStatus.UNPAID,
                )
                log(visit, 'ISSUED', user if getattr(user, 'is_authenticated', False) else None, '', visit.status,
                    payload={'source': 'front_desk_sync', 'token_ref': appointment.external_ref})
        except IntegrityError:
            return None
    desk_status = str(token.get('status') or '').upper()
    if desk_status in ('NO_SHOW', 'CANCELLED') and visit.status in WAITING_STATES | {S.ON_HOLD}:
        prev = visit.status
        visit.status = S.NO_SHOW if desk_status == 'NO_SHOW' else S.CANCELLED
        visit.save(update_fields=['status', 'updated_at'])
        log(visit, desk_status, user if getattr(user, 'is_authenticated', False) else None, prev, visit.status,
            payload={'source': 'front_desk_sync'})
        open_fee_review(visit)
    if desk_paid and visit.fee_status != FeeStatus.PAID:
        visit.fee_status = FeeStatus.PAID
        visit.fee_amount = _money(fee) or visit.fee_amount
        visit.save(update_fields=['fee_status', 'fee_amount', 'updated_at'])
    if desk_paid and visit.fee_amount > 0:
        publish_desk_fee(visit, mode=(appointment.desk_payment or {}).get('mode') or '',
                         receipt=(appointment.desk_payment or {}).get('receipt') or '')
    return visit


# --------------------------------------------------------------------------- transitions

@transaction.atomic
def transition(visit_id, action, user, reason=''):
    visit = OpdVisit.objects.select_for_update().select_related('doctor__user', 'appointment').get(id=visit_id)
    if action == 'prioritize':
        if _role(user) not in RECEPTION | NURSE | DOCTOR_LEVEL and not _is_admin(user):
            raise PermissionDenied('Your role cannot change the queue priority.')
        if visit.status not in WAITING_STATES | {S.ON_HOLD}:
            raise ValidationError({'status': 'Only a waiting patient can be moved up.'})
        if visit.priority in (VisitPriority.NORMAL,):
            prev = visit.priority
            visit.priority = VisitPriority.URGENT
            visit.save(update_fields=['priority', 'updated_at'])
            log(visit, 'PRIORITIZED', user, visit.status, visit.status, payload={'from_priority': prev, 'reason': reason})
        return visit
    if action == 'mark_emergency':
        if _role(user) not in RECEPTION | NURSE | DOCTOR_LEVEL and not _is_admin(user):
            raise PermissionDenied('Your role cannot mark an emergency.')
        prev = visit.priority
        visit.priority = VisitPriority.EMERGENCY
        visit.save(update_fields=['priority', 'updated_at'])
        log(visit, 'MARKED_EMERGENCY', user, visit.status, visit.status, payload={'from_priority': prev, 'reason': reason})
        return visit
    if action not in TRANSITIONS:
        raise ValidationError({'action': f"Unknown action '{action}'."})
    from_states, to_status, roles, doctor_level, needs_reason = TRANSITIONS[action]
    if _role(user) not in roles and not _is_admin(user):
        raise PermissionDenied('Your role cannot do this.')
    if visit.status not in from_states:
        raise Conflict({'status': f"Cannot {action.replace('_', ' ')} a visit that is {visit.get_status_display().lower()}."})
    if needs_reason and not (reason or '').strip():
        raise ValidationError({'reason': 'A reason is required.'})
    if action == 'cancel' and _role(user) == RoleType.RECEPTIONIST and (visit.status != S.WAITING or visit.events.exclude(action='ISSUED').exists()):
        raise PermissionDenied('Once the patient has been seen, only the reception supervisor can cancel the visit.')
    on_behalf_of = doctor_authority(user, visit.doctor) if (doctor_level and _role(user) in DOCTOR_LEVEL) else None
    if to_status == S.CALLED_IN:
        busy = OpdVisit.objects.filter(doctor=visit.doctor, visit_date=visit.visit_date,
                                       status__in=[S.CALLED_IN, S.IN_CONSULTATION]).exclude(id=visit.id).first()
        if busy:
            raise Conflict({'status': f"The doctor already has token {busy.token_number} in the chamber."})
    if action == 'resume':
        last_hold = visit.events.filter(action='HOLD').order_by('-at').first()
        to_status = (last_hold.from_status if last_hold else '') or S.WAITING
    prev = visit.status
    _set_status(visit, to_status)
    visit.hold_reason = reason if to_status == S.ON_HOLD else ''
    # compare-and-set: only one of two simultaneous actions on the same visit wins (SQLite has no row locks)
    try:
        with transaction.atomic():
            if not OpdVisit.objects.filter(id=visit.id, status=prev).update(status=visit.status):
                raise Conflict({'status': 'Someone else changed this visit a moment ago. Refresh and try again.'})
            visit.save()
    except IntegrityError:
        raise Conflict({'status': 'The doctor already has a patient in the chamber.'})
    if to_status in (S.NO_SHOW, S.CANCELLED):
        _release_pending_charge(visit)
    _mirror_appointment(visit)
    log(visit, action.upper(), user, prev, visit.status, on_behalf_of, {'reason': reason} if reason else {})
    if to_status in (S.NO_SHOW, S.CANCELLED):
        open_fee_review(visit)
    if action == 'reopen':
        from .models import OpdFeeReview
        OpdFeeReview.objects.filter(visit=visit, status='PENDING').delete()
        if visit.fee_status == FeeStatus.UNPAID and visit.fee_amount > 0 and visit.appointment_id:
            from apps.billing.models import BillableChargeItem, ChargeItemStatus
            # the released consultation charge goes back to the cashier
            BillableChargeItem.objects.filter(department='OPD', source_reference_id=str(visit.appointment_id),
                                              status=ChargeItemStatus.CANCELLED).update(status=ChargeItemStatus.PENDING)
    return visit


# --------------------------------------------------------------------------- triage

VITAL_INT = ['systolic_bp', 'diastolic_bp', 'pulse_rate', 'spo2', 'respiratory_rate', 'rbs']
VITAL_DEC = ['temperature', 'height_cm', 'weight_kg']
VITAL_KEYS = {'bpSys': 'systolic_bp', 'bpDia': 'diastolic_bp', 'pulse': 'pulse_rate', 'spo2': 'spo2', 'rr': 'respiratory_rate',
              'rbs': 'rbs', 'temp': 'temperature', 'height': 'height_cm', 'weight': 'weight_kg'}
RANGES = {'systolic_bp': (50, 260), 'diastolic_bp': (30, 160), 'pulse_rate': (25, 250), 'spo2': (50, 100),
          'respiratory_rate': (4, 60), 'temperature': (90, 110), 'rbs': (20, 800)}


def _clean_vitals(raw):
    raw = raw or {}
    out = {}
    for k, v in raw.items():
        field = VITAL_KEYS.get(k, k)
        if field not in VITAL_INT + VITAL_DEC or v in (None, ''):
            continue
        try:
            out[field] = int(float(v)) if field in VITAL_INT else Decimal(str(v)).quantize(Decimal('0.1'))
        except (ValueError, InvalidOperation):
            raise ValidationError({k: 'Enter a number.'})
        lo, hi = RANGES.get(field, (0, 10 ** 6))
        if not lo <= float(out[field]) <= hi:
            raise ValidationError({k: f"Out of range ({lo}–{hi})."})
    for k in ('avpu',):
        if raw.get(k):
            out[k] = str(raw[k])[:1].upper()
    if 'on_oxygen' in raw or 'onOxygen' in raw:
        out['on_oxygen'] = bool(raw.get('on_oxygen', raw.get('onOxygen')))
    if out.get('height_cm') and out.get('weight_kg'):
        m = float(out['height_cm']) / 100
        out['bmi'] = Decimal(str(round(float(out['weight_kg']) / (m * m), 1))) if m > 0 else None
    return out


@transaction.atomic
def save_triage(visit_id, user, data, submit=False):
    # The nurse triages; the doctor or assistant may record basic vitals when the nurse could not
    if (_role(user) not in NURSE | DOCTOR_LEVEL or (submit and _role(user) not in NURSE)) and not _is_admin(user):
        raise PermissionDenied('Only the nurse sends a triage to the doctor.' if submit else 'Your role cannot record vitals.')
    visit = OpdVisit.objects.select_for_update().select_related('patient', 'appointment').get(id=visit_id)
    if visit.status in CLOSED_STATUSES:
        raise ValidationError({'status': 'This visit is closed.'})
    triage, _ = TriageAssessment.objects.get_or_create(visit=visit)
    vitals = _clean_vitals(data.get('vitals'))
    if vitals:
        if not triage.vitals:
            triage.vitals = VitalSign.objects.create(patient=visit.patient, recorded_by=user, context='TRIAGE', **vitals)
        else:
            for k, v in vitals.items():
                setattr(triage.vitals, k, v)
            triage.vitals.recorded_by = user
            triage.vitals.save()
    for field in ('chief_complaint', 'nurse_notes', 'pregnancy'):
        if field in data:
            setattr(triage, field, str(data.get(field) or '').strip())
    for field in ('allergies', 'conditions', 'current_medications'):
        if field in data:
            setattr(triage, field, [str(x).strip() for x in (data.get(field) or []) if str(x).strip()])
    if 'fall_risk' in data:
        triage.fall_risk = bool(data.get('fall_risk'))
    if data.get('pain_score') not in (None, ''):
        triage.pain_score = max(0, min(10, int(data['pain_score'])))
    if data.get('triage_category'):
        if data['triage_category'] not in TriageCategory.values:
            raise ValidationError({'triage_category': 'Unknown triage category.'})
        triage.triage_category = data['triage_category']
    if data.get('news2') not in (None, ''):
        triage.news2 = int(data['news2'])
        if triage.vitals:
            triage.vitals.news2 = triage.news2
            triage.vitals.save(update_fields=['news2'])
    if submit:
        v = triage.vitals
        missing = [label for label, ok in [
            ('BP', v and v.systolic_bp and v.diastolic_bp), ('pulse', v and v.pulse_rate),
            ('temperature', v and v.temperature), ('SpO2', v and v.spo2),
            ('triage category', triage.triage_category), ('allergies (or NKDA)', triage.allergies),
        ] if not ok]
        if missing:
            raise ValidationError({'triage': 'Record ' + ', '.join(missing) + ' before sending to the doctor.'})
        if visit.status not in (S.WAITING, S.CALLED_TRIAGE, S.IN_TRIAGE, S.READY_FOR_DOCTOR, S.ON_HOLD):
            raise ValidationError({'status': f"The visit is already {visit.get_status_display().lower()}."})
        triage.submitted = True
        triage.triaged_by = user
        triage.triaged_at = timezone.now()
        # Allergies and conditions are the patient's, not just this visit's
        patient = visit.patient
        known = [a for a in triage.allergies if a.upper() != 'NKDA']
        patient.allergies = sorted(set(patient.allergies or []) | set(known)) if known else (patient.allergies or [])
        if triage.conditions:
            patient.chronic_conditions = sorted(set(patient.chronic_conditions or []) | set(triage.conditions))
        patient.save(update_fields=['allergies', 'chronic_conditions', 'updated_at'])
        prev = visit.status
        if prev != S.READY_FOR_DOCTOR:
            _set_status(visit, S.READY_FOR_DOCTOR)
            visit.save()
            _mirror_appointment(visit)
        if triage.triage_category in (TriageCategory.IMMEDIATE, TriageCategory.VERY_URGENT) and visit.priority != VisitPriority.EMERGENCY:
            visit.priority = VisitPriority.URGENT
            visit.save(update_fields=['priority', 'updated_at'])
        log(visit, 'TRIAGED', user, prev, visit.status, payload={'category': triage.triage_category, 'news2': triage.news2})
    triage.save()
    return visit


# --------------------------------------------------------------------------- consultation

# Given in the clinic (treatment room), not taken home: same rule as the nurse's treatment list
CLINIC_ITEM = re.compile(r'^(inj\b|inj\.|injection|iv\b|i\.v\.|infusion|neb\b|neb\.|nebul)', re.I)
CLINIC_HINT = re.compile(r'\b(stat|in clinic|in opd|before leaving)\b', re.I)


def is_clinic_dose(m):
    return bool(m.get('clinic_dose')) or bool(CLINIC_ITEM.match(str(m.get('name') or '').strip())) or \
        bool(CLINIC_HINT.search(f"{m.get('instructions') or ''} {m.get('timing') or ''} {m.get('frequency') or ''}"))


FREQ_OK = re.compile(r'^(\d-\d-\d(-\d)?|OD|BD|BID|TDS|TID|QID|HS|SOS|PRN|STAT|Q\d+H|ONCE|TWICE|THRICE)$', re.I)


@transaction.atomic
def complete_visit(visit_id, user, data, idempotency_key=''):
    """One transaction: Consultation + Prescription(+items) + pharmacy hand-off + visit COMPLETED.
    Idempotent: a second call on a completed visit returns the existing records."""
    from apps.clinical.models import Consultation, Prescription, PrescriptionItem
    from apps.pharmacy.services import PharmacyClinicalHandoffService

    visit = OpdVisit.objects.select_for_update().select_related('doctor__user', 'patient', 'appointment').get(id=visit_id)
    on_behalf_of = doctor_authority(user, visit.doctor)
    if visit.status in (S.COMPLETED, S.CHECKED_OUT) and hasattr(visit, 'consultation'):
        # a retry (same Idempotency-Key, or a resend after a lost response) gets the saved result, never a second copy
        done = visit.events.filter(action='COMPLETED').first()
        key = (done.payload or {}).get('idempotency_key') if done else ''
        if idempotency_key and key and key != idempotency_key:
            raise Conflict({'status': 'This consultation was already completed by another request.'})
        return visit
    if visit.status != S.IN_CONSULTATION:
        raise ValidationError({'status': 'Seat the patient before completing the consultation.'})
    diagnosis = str(data.get('diagnosis') or '').strip()
    if not diagnosis:
        raise ValidationError({'diagnosis': 'Enter a diagnosis.'})
    meds = data.get('medicines') or []
    for i, m in enumerate(meds):
        if not str(m.get('name') or '').strip():
            raise ValidationError({f'medicines[{i}]': 'Medicine name is required.'})
        if not FREQ_OK.match(str(m.get('frequency') or '').strip()):
            raise ValidationError({f'medicines[{i}]': 'Enter a frequency such as 1-0-1, BD or SOS.'})
        if int(m.get('days') or 0) <= 0 and str(m.get('frequency')).upper() not in ('STAT', 'SOS', 'PRN'):
            raise ValidationError({f'medicines[{i}]': 'Enter the number of days.'})
    allergies = {a.lower() for a in (visit.patient.allergies or [])}
    clash = [m['name'] for m in meds if any(a and a in str(m.get('name', '')).lower() for a in allergies)]
    if clash and not data.get('allergy_override_reason'):
        raise ValidationError({'allergy': f"{', '.join(clash)} matches a recorded allergy. Confirm with a reason to continue."})

    consultation = Consultation.objects.create(
        visit=visit, appointment=visit.appointment, patient=visit.patient, doctor=visit.doctor,
        chief_complaint=str(data.get('chief_complaint') or getattr(getattr(visit, 'triage', None), 'chief_complaint', '') or '—'),
        history_of_present_illness=data.get('history') or '', physical_examination=data.get('examination') or '',
        provisional_diagnosis=diagnosis, icd10_codes=data.get('icd10_codes') or [], clinical_notes=data.get('notes') or '',
        advice=data.get('advice') or '', referral=data.get('referral') or None,
        follow_up_date=data.get('follow_up_date') or None, status='FINAL', performed_by=user, on_behalf_of=on_behalf_of,
    )
    prescription, dispense = None, None
    if meds:
        prescription = Prescription.objects.create(
            consultation=consultation, visit=visit, patient=visit.patient, doctor=visit.doctor,
            prescription_number=f"RX-{visit.visit_number}", instructions=data.get('advice') or '',
            performed_by=user, on_behalf_of=on_behalf_of,
        )
        for n, m in enumerate(meds):
            PrescriptionItem.objects.create(
                prescription=prescription, line_no=n, medication_name=str(m['name']).strip(), generic_name=m.get('generic') or '',
                dosage=m.get('dose') or '1', frequency=str(m['frequency']).strip(), duration_days=int(m.get('days') or 1),
                route=(m.get('route') or 'ORAL').upper(), instructions=m.get('instructions') or '',
                timing=m.get('timing') or '', is_clinic_dose=is_clinic_dose(m),
            )
        if any(not is_clinic_dose(m) for m in meds):
            dispense = PharmacyClinicalHandoffService.create_dispense_order_from_prescription(prescription)
    lab_orders = _create_lab_orders(visit, user, data['tests'], on_behalf_of) if data.get('tests') else []
    follow_up = create_follow_up(visit, user, on_behalf_of, data['follow_up_date'], data.get('follow_up_reason') or diagnosis,
                                 data.get('notes') or '') if data.get('follow_up_date') else None
    if visit.referral is None and data.get('referral'):
        visit.referral = data['referral']
    prev = visit.status
    _set_status(visit, S.COMPLETED)
    visit.save()
    _mirror_appointment(visit)
    from .models import ConsultationDraft
    ConsultationDraft.objects.filter(visit=visit).delete()
    log(visit, 'COMPLETED', user, prev, visit.status, on_behalf_of, {
        'consultation': str(consultation.id), 'prescription': prescription.prescription_number if prescription else '',
        'dispense_order': dispense.order_number if dispense else '', 'lab_orders': [o.order_number for o in lab_orders],
        'follow_up': follow_up.due_date.isoformat() if follow_up else '',
        'allergy_override': data.get('allergy_override_reason') or '', 'idempotency_key': idempotency_key or '',
    })
    return visit


@transaction.atomic
def checkout(visit_id, user, routes, note=''):
    if _role(user) not in DOCTOR_LEVEL | RECEPTION | NURSE and not _is_admin(user):
        raise PermissionDenied('Your role cannot check a patient out.')
    visit = OpdVisit.objects.select_for_update().get(id=visit_id)
    if visit.status != S.COMPLETED:
        raise ValidationError({'status': 'Only a completed consultation can be checked out.'})
    routes = [str(r).upper() for r in (routes or [])]
    bad = [r for r in routes if r not in CHECKOUT_ROUTES]
    if bad:
        raise ValidationError({'routes': f"Unknown route: {', '.join(bad)}."})
    visit.checkout_routes = routes or ['HOME']
    prev = visit.status
    _set_status(visit, S.CHECKED_OUT)
    visit.save()
    _mirror_appointment(visit)
    log(visit, 'CHECKED_OUT', user, prev, visit.status, payload={'routes': visit.checkout_routes, 'note': (note or '').strip()[:300]})
    return visit


@transaction.atomic
def cosign(consultation_id, user):
    from apps.clinical.models import Consultation
    c = Consultation.objects.select_for_update().select_related('doctor').get(id=consultation_id)
    if _role(user) not in DOCTORS or not c.doctor or c.doctor.user_id != user.id:
        raise PermissionDenied('Only the consulting doctor can co-sign.')
    if not c.on_behalf_of_id:
        raise ValidationError({'consultation': 'This consultation was entered by the doctor; nothing to co-sign.'})
    if not c.co_signed_at:
        c.co_signed_by, c.co_signed_at = user, timezone.now()
        c.save(update_fields=['co_signed_by', 'co_signed_at', 'updated_at'])
        if c.visit_id:
            log(c.visit, 'CO_SIGNED', user, c.visit.status, c.visit.status, payload={'consultation': str(c.id)})
    return c


# --------------------------------------------------------------------------- no-show / cancelled fee review

SUPERVISORS = {RoleType.RECEPTION_SUPERVISOR} | ADMINS


def open_fee_review(visit):
    """A paid visit ended as no-show/cancelled: the fee waits for the reception supervisor (refund, carry, retain)."""
    from .models import OpdFeeReview
    if visit.fee_status != FeeStatus.PAID or visit.fee_amount <= 0 or visit.status not in (S.NO_SHOW, S.CANCELLED):
        return None
    desk = bool((getattr(visit.appointment, 'desk_payment', None) or {}).get('paid'))
    review, _ = OpdFeeReview.objects.get_or_create(visit=visit, defaults={
        'amount': visit.fee_amount, 'paid_at': 'FRONT_DESK' if desk else 'CASHIER', 'outcome': visit.status})
    return review


@transaction.atomic
def decide_fee_review(review_id, user, decision, reason, note='', refund_mode='CASH'):
    from .models import OpdFeeReview, FeeDecision, FeeReviewReason
    from apps.billing.accounts_bridge import publish_desk_refund
    if _role(user) not in SUPERVISORS and not _is_admin(user):
        raise PermissionDenied('Only the reception supervisor decides no-show fees.')
    review = OpdFeeReview.objects.select_for_update().select_related('visit__patient', 'visit__appointment').get(id=review_id)
    if review.status != 'PENDING':
        raise ValidationError({'status': 'This fee has already been decided.'})
    if decision not in FeeDecision.values:
        raise ValidationError({'decision': 'Choose refund, reschedule or retain.'})
    if reason not in FeeReviewReason.values:
        raise ValidationError({'reason': 'Choose why the patient did not attend.'})
    if decision != FeeDecision.RETAIN and not (note or '').strip():
        raise ValidationError({'note': 'Add a note for the refund / reschedule.'})
    if reason == FeeReviewReason.BILLING_ERROR and decision != FeeDecision.REFUND:
        raise ValidationError({'decision': 'A billing error is corrected by a refund.'})
    review.decision, review.reason, review.note = decision, reason, (note or '').strip()
    review.decided_by, review.decided_at, review.status = user, timezone.now(), 'DECIDED'
    visit = review.visit
    if decision == FeeDecision.REFUND:
        review.refund_mode = (refund_mode or 'CASH').upper()
        if review.paid_at == 'FRONT_DESK':
            res = publish_desk_refund(review, 'requested')
            review.refund_reference = res.get('refund_reference', '')
        else:
            from apps.billing.services import RefundWorkflowService
            from apps.billing.models import BillableChargeItem
            charge = BillableChargeItem.objects.filter(department='OPD', source_reference_id=str(visit.appointment_id)).exclude(invoice=None).first()
            if not charge:
                raise ValidationError({'decision': 'No cashier invoice found for this fee.'})
            rr = RefundWorkflowService.initiate_refund_request(str(charge.invoice_id), review.amount, f'OPD {review.outcome}: {review.note}', requested_by=user)
            review.refund_reference = getattr(rr, 'refund_number', '') or str(rr.id)
        visit.fee_status = FeeStatus.REFUNDED
    elif decision == FeeDecision.RESCHEDULE:
        visit.fee_status = FeeStatus.CREDITED
    review.save()
    visit.save(update_fields=['fee_status', 'updated_at'])
    log(visit, f'FEE_{decision}', user, visit.status, visit.status,
        payload={'reason': reason, 'note': review.note, 'amount': str(review.amount), 'refund_reference': review.refund_reference})
    return review


@transaction.atomic
def mark_refund_paid(review_id, user):
    from .models import OpdFeeReview
    from apps.billing.accounts_bridge import publish_desk_refund
    if _role(user) not in SUPERVISORS and not _is_admin(user):
        raise PermissionDenied('Only the reception supervisor hands back desk refunds.')
    review = OpdFeeReview.objects.select_for_update().select_related('visit__patient').get(id=review_id)
    if review.decision != 'REFUND' or review.status != 'DECIDED' or review.paid_at != 'FRONT_DESK':
        raise ValidationError({'status': 'Nothing to hand back for this fee.'})
    from apps.accounting.models import Refund
    acc = Refund.objects.filter(source_bill_no=review.visit.visit_number).first()
    if acc and acc.status not in ('approved', 'APPROVED'):
        raise ValidationError({'status': f'Accounts has not approved refund {acc.reference_no} yet ({acc.status}).'})
    publish_desk_refund(review, 'paid')
    review.status, review.refund_paid_by, review.refund_paid_at = 'REFUND_PAID', user, timezone.now()
    review.save()
    log(review.visit, 'FEE_REFUND_PAID', user, review.visit.status, review.visit.status, payload={'amount': str(review.amount)})
    return review


def take_fee_credit(patient, new_visit):
    """Use the patient's oldest unused rescheduled-fee credit for a new visit. Returns the review or None."""
    from .models import OpdFeeReview
    review = OpdFeeReview.objects.select_for_update().filter(
        visit__patient=patient, decision='RESCHEDULE', status='DECIDED', credit_used_by__isnull=True).order_by('created_at').first()
    if review:
        review.credit_used_by, review.status = new_visit, 'CREDIT_USED'
        review.save(update_fields=['credit_used_by', 'status'])
        log(new_visit, 'FEE_CREDIT_APPLIED', None, new_visit.status, new_visit.status,
            payload={'from_visit': review.visit.visit_number, 'amount': str(review.amount)})
    return review


# --------------------------------------------------------------------------- consultation draft & lab

@transaction.atomic
def save_draft(visit_id, user, data):
    from .models import ConsultationDraft
    visit = OpdVisit.objects.select_related('doctor').get(id=visit_id)
    doctor_authority(user, visit.doctor)
    if visit.status in CLOSED_STATUSES:
        raise ValidationError({'status': 'This visit is closed.'})
    draft, _ = ConsultationDraft.objects.get_or_create(visit=visit)
    draft.data, draft.updated_by = data or {}, user
    draft.save()
    return draft


def _create_lab_orders(visit, user, tests, on_behalf_of=None):
    """Lab orders for this visit through the lab's own catalog and numbering; each emits its Billing charge."""
    from apps.lab.models import LabOrder, LabOrderItem, LabOrderStatus, LabOrderPriority
    from apps.lab.views import next_number, resolve_test
    from apps.billing.services import DepartmentChargeIntegrationService
    import uuid as _uuid
    orders = []
    for i, t in enumerate(tests):
        test = resolve_test({'testCode': t.get('code'), 'testName': t.get('name'), 'testId': t.get('id')})
        if not test:
            raise ValidationError({f'tests[{i}]': f"'{t.get('code') or t.get('name')}' is not in the lab catalog."})
        priority = str(t.get('priority') or 'ROUTINE').upper()
        if priority not in LabOrderPriority.values:
            raise ValidationError({f'tests[{i}]': f"Priority must be one of {', '.join(LabOrderPriority.values)}."})
        if LabOrder.objects.filter(encounter_id=str(visit.id), test=test).exclude(status=LabOrderStatus.CANCELLED).exists():
            raise ValidationError({f'tests[{i}]': f'{test.name} is already ordered for this visit.'})
        order = LabOrder.objects.create(
            order_number=next_number(LabOrder, 'order_number', f"LAB-{timezone.now():%y%m}-"), patient=visit.patient,
            test=test, doctor=visit.doctor, encounter_id=str(visit.id), priority=priority, status=LabOrderStatus.ORDERED,
            clinical_notes=(t.get('notes') or '') + (f" [entered by {user.get_full_name()} for the doctor]" if on_behalf_of else ''),
            ordering_location=f"OPD · {visit.chamber or 'chamber'} · token {visit.token_number}"[:150],
            barcode=f"SPM-{_uuid.uuid4().hex[:8].upper()}", ordered_at=timezone.now(),
        )
        LabOrderItem.objects.create(order=order, test=test, status='ORDERED')
        DepartmentChargeIntegrationService.emit_lab_test_charges(order)
        orders.append(order)
    return orders


@transaction.atomic
def send_for_tests(visit_id, user, tests, draft=None):
    visit = OpdVisit.objects.select_for_update().select_related('doctor__user', 'patient').get(id=visit_id)
    on_behalf_of = doctor_authority(user, visit.doctor)
    if visit.status != S.IN_CONSULTATION:
        raise ValidationError({'status': 'Tests are sent from an ongoing consultation.'})
    if not tests:
        raise ValidationError({'tests': 'Choose at least one test.'})
    orders = _create_lab_orders(visit, user, tests, on_behalf_of)
    if draft is not None:
        save_draft(visit.id, user, draft)
    prev = visit.status
    _set_status(visit, S.AWAITING_REPORTS)
    visit.save()
    _mirror_appointment(visit)
    log(visit, 'SENT_FOR_TESTS', user, prev, visit.status, on_behalf_of, {'orders': [o.order_number for o in orders]})
    return visit


def on_lab_report_signed(order):
    """Lab -> OPD: when every lab order of a waiting visit is signed, the patient goes back to the doctor's queue."""
    from apps.lab.models import LabOrder, LabOrderStatus
    if not order.encounter_id:
        return None
    visit = OpdVisit.objects.filter(id=order.encounter_id).first() if re.fullmatch(r'[0-9a-fA-F-]{36}', str(order.encounter_id)) else None
    if not visit or visit.status != S.AWAITING_REPORTS:
        return visit
    open_orders = LabOrder.objects.filter(encounter_id=str(visit.id)).exclude(status__in=[LabOrderStatus.REPORT_APPROVED, LabOrderStatus.CANCELLED])
    if open_orders.exists():
        return visit
    prev = visit.status
    _set_status(visit, S.READY_FOR_DOCTOR)
    visit.save()
    _mirror_appointment(visit)
    log(visit, 'REPORTS_READY', None, prev, visit.status, payload={'last_report_order': order.order_number,
                                                                    'critical': bool(order.is_flagged_critical)})
    return visit


@transaction.atomic
def record_desk_fee(visit_id, user, mode='CASH', receipt='', amount=None):
    """Reception took the consultation fee after issuing the token: the cashier charge is released and Accounts gets
    the desk posting."""
    from apps.billing.models import BillableChargeItem, ChargeItemStatus
    from apps.billing.accounts_bridge import publish_desk_fee
    if _role(user) not in RECEPTION and not _is_admin(user):
        raise PermissionDenied('Only reception collects the desk fee.')
    visit = OpdVisit.objects.select_for_update().select_related('appointment', 'patient').get(id=visit_id)
    if visit.fee_status == FeeStatus.PAID:
        return visit
    if visit.status in (S.NO_SHOW, S.CANCELLED):
        raise ValidationError({'status': 'This visit is closed.'})
    charges = BillableChargeItem.objects.filter(department='OPD', source_reference_id=str(visit.appointment_id))
    if charges.exclude(status__in=[ChargeItemStatus.PENDING, ChargeItemStatus.CANCELLED]).exists():
        raise ValidationError({'fee': 'The cashier has already billed this fee.'})
    if amount not in (None, ''):
        visit.fee_amount = _money(amount)
    charges.filter(status=ChargeItemStatus.PENDING).update(status=ChargeItemStatus.CANCELLED)
    visit.fee_status = FeeStatus.PAID
    visit.save(update_fields=['fee_status', 'fee_amount', 'updated_at'])
    apt = visit.appointment
    if apt:
        apt.desk_payment = {**(apt.desk_payment or {}), 'paid': True, 'quoted_fee': str(visit.fee_amount), 'mode': mode, 'receipt': receipt}
        apt.save(update_fields=['desk_payment'])
    publish_desk_fee(visit, mode=mode, receipt=receipt)
    log(visit, 'FEE_COLLECTED_AT_DESK', user, visit.status, visit.status, payload={'amount': str(visit.fee_amount), 'mode': mode, 'receipt': receipt})
    return visit


@transaction.atomic
def reassign(visit_id, user, doctor, chamber=None):
    if _role(user) not in RECEPTION | ADMINS and not _is_admin(user):
        raise PermissionDenied('Only reception or the OPD admin can move a patient to another doctor.')
    visit = OpdVisit.objects.select_for_update().select_related('doctor__user', 'appointment').get(id=visit_id)
    if not doctor:
        raise ValidationError({'doctor': 'Select an OPD doctor.'})
    if visit.status not in WAITING_STATES | {S.ON_HOLD}:
        raise ValidationError({'status': 'The patient is already with the doctor.'})
    prev = visit.doctor
    visit.doctor = doctor
    if chamber is not None:
        visit.chamber = chamber
    if visit.status == S.CALLED_IN:
        visit.status = S.READY_FOR_DOCTOR
    visit.save()
    if visit.appointment:
        visit.appointment.doctor = doctor
        visit.appointment.save(update_fields=['doctor', 'updated_at'])
    log(visit, 'REASSIGNED', user, visit.status, visit.status,
        payload={'from': f"Dr. {prev.user.get_full_name()}" if prev else '', 'to': f"Dr. {doctor.user.get_full_name()}", 'chamber': visit.chamber})
    return visit



# --------------------------------------------------------------------------- treatment room (WF-3)

PROCEDURE_TARIFFS = {  # default fees, editable by the billing admin in TariffMaster
    'INJECTION': ('OPD-PROC-INJECTION', 'Injection administration (OPD treatment room)', '50.00'),
    'IV_FLUID': ('OPD-PROC-IV_FLUID', 'IV infusion set-up & monitoring (OPD)', '150.00'),
    'NEBULISATION': ('OPD-PROC-NEBULISATION', 'Nebulisation (OPD treatment room)', '100.00'),
    'DRESSING': ('OPD-PROC-DRESSING', 'Wound dressing (OPD treatment room)', '120.00'),
    'ECG': ('OPD-PROC-ECG', 'ECG (12-lead, OPD)', '200.00'),
    'OTHER': ('OPD-PROC-OTHER', 'Minor procedure (OPD treatment room)', '100.00'),
}
MEDICINE_KINDS = {'INJECTION', 'IV_FLUID', 'NEBULISATION'}


def procedure_tariff(kind):
    from apps.billing.models import TariffMaster
    code, name, price = PROCEDURE_TARIFFS[kind]
    t, _ = TariffMaster.objects.get_or_create(code=code, defaults={
        'name': name, 'department': 'OPD', 'base_price': Decimal(price), 'gst_rate': Decimal('0.00'), 'is_active': True})
    return t if t.is_active else None


def _drug_tariff(detail):
    """The drug's own price for a clinic dose: the Pharmacy tariff whose name matches the dose."""
    from apps.billing.models import TariffMaster
    words = re.sub(r'^(inj\.?|injection|iv|i\.v\.|infusion|neb\.?|nebulisation)\s+', '', detail.strip(), flags=re.I).split()
    if not words:
        return None
    qs = TariffMaster.objects.filter(department='PHARMACY', is_active=True, name__icontains=words[0])
    if len(words) > 1 and qs.filter(name__icontains=words[1]).exists():
        qs = qs.filter(name__icontains=words[1])
    return qs.order_by('base_price').first()


@transaction.atomic
def record_procedure(user, data):
    """Nurse records a treatment-room dose/procedure. GIVEN stages its charges for the cashier; REFUSED charges nothing."""
    from apps.clinical.models import PrescriptionItem
    from apps.billing.services import CashierWorkspaceService
    from .models import OpdProcedure, ProcedureKind
    if _role(user) not in NURSE and not _is_admin(user):
        raise PermissionDenied('Only the nurse records treatment-room procedures.')
    kind = str(data.get('kind') or '').upper()
    if kind not in ProcedureKind.values:
        raise ValidationError({'kind': 'Choose the procedure type.'})
    status = str(data.get('status') or 'GIVEN').upper()
    if status not in ('GIVEN', 'REFUSED'):
        raise ValidationError({'status': 'Given or refused.'})
    detail = str(data.get('detail') or '').strip()
    if len(detail) < 3:
        raise ValidationError({'detail': 'Describe what was given or done.'})
    note = str(data.get('note') or '').strip()
    if status == 'REFUSED' and len(note) < 3:
        raise ValidationError({'note': 'Record why the patient refused.'})
    five = bool(data.get('five_rights'))
    if status == 'GIVEN' and kind in MEDICINE_KINDS and not five:
        raise ValidationError({'five_rights': 'Confirm the five rights before giving a medicine.'})

    item = None
    if data.get('rx_no'):
        try:
            line = int(data.get('rx_item'))
        except (TypeError, ValueError):
            line = -1
        item = PrescriptionItem.objects.select_related('prescription__visit').filter(
            prescription__prescription_number=data['rx_no'], line_no=line).first()
        if not item:
            raise ValidationError({'rx_item': 'That prescription line was not found.'})
        if not item.is_clinic_dose:
            raise ValidationError({'rx_item': 'This medicine is for home use, not a clinic dose.'})
        if OpdProcedure.objects.filter(prescription_item_id=item.id).exists():
            raise ValidationError({'rx_item': 'This dose has already been recorded.'})
        visit = item.prescription.visit
    else:
        visit = OpdVisit.objects.filter(patient__uhid__iexact=str(data.get('uhid') or ''), visit_date=timezone.localdate()) \
            .exclude(status__in=[S.CANCELLED, S.NO_SHOW]).order_by('-token_number').first()
    if not visit:
        raise ValidationError({'patient': 'The patient has no OPD visit today.'})
    if visit.status in (S.CANCELLED, S.NO_SHOW):
        raise ValidationError({'status': 'This visit is closed.'})

    proc = OpdProcedure.objects.create(
        visit=visit, patient=visit.patient, kind=kind, detail=detail[:255],
        prescription_item_id=item.id if item else None, prescription_number=item.prescription.prescription_number if item else '',
        ordered_by=str(data.get('ordered_by') or (f"Dr. {visit.doctor.user.get_full_name()}" if visit.doctor else ''))[:150],
        route=str(data.get('route') or '')[:40], site=str(data.get('site') or '')[:60], batch_no=str(data.get('batch_no') or '')[:60],
        status=status, five_rights=five, note=note, given_by=user,
    )
    charged = []
    if status == 'GIVEN':
        fee = procedure_tariff(kind)
        if fee:
            charged.append(CashierWorkspaceService._charge_from_tariff(visit.patient, fee, 1, f"OPD-PROC-{proc.id}"))
        drug = _drug_tariff(detail) if kind in MEDICINE_KINDS else None
        if drug:
            charged.append(CashierWorkspaceService._charge_from_tariff(visit.patient, drug, 1, f"OPD-PROC-{proc.id}"))
        proc.charges.set(charged)
    log(visit, f'PROCEDURE_{status}', user, visit.status, visit.status, payload={
        'procedure': str(proc.id), 'kind': kind, 'detail': detail, 'rx': proc.prescription_number,
        'charges': [f"{c.service_code} {c.total_amount}" for c in charged], 'note': note})
    return proc



# --------------------------------------------------------------------------- day-care observation (WF-4)

DAYCARE_TARIFFS = {  # from the OPD fee master: OPD Daycare Observation Bed (hourly / daily)
    'HR': ('OPD-DAYCARE-HR', 'Day-care observation bed (per hour)', '20.00'),
    'DAY': ('OPD-DAYCARE-DAY', 'Day-care observation bed (per day)', '120.00'),
}
BED_STAFF = RECEPTION | NURSE | ADMINS


def _daycare_tariff(key):
    from apps.billing.models import TariffMaster
    code, name, price = DAYCARE_TARIFFS[key]
    t, _ = TariffMaster.objects.get_or_create(code=code, defaults={
        'name': name, 'department': 'OPD', 'base_price': Decimal(price), 'gst_rate': Decimal('0.00'), 'is_active': True})
    return t


@transaction.atomic
def allocate_bed(user, data):
    from .models import DaycareStay
    if _role(user) not in BED_STAFF and not _is_admin(user):
        raise PermissionDenied('Reception or the nurse allocates day-care beds.')
    patient = Patient.objects.filter(uhid__iexact=str(data.get('uhid') or '')).first()
    if not patient:
        raise ValidationError({'uhid': 'Select a registered patient.'})
    bed_ref = str(data.get('bed_ref') or '').strip()
    if not bed_ref:
        raise ValidationError({'bed_ref': 'Choose a bed.'})
    reason = str(data.get('reason') or '').strip()
    if len(reason) < 3:
        raise ValidationError({'reason': 'Enter the reason / procedure.'})
    if DaycareStay.objects.filter(bed_ref=bed_ref, status='OCCUPIED').exists():
        raise ValidationError({'bed_ref': 'This bed is occupied.'})
    last = DaycareStay.objects.filter(bed_ref=bed_ref).order_by('-admitted_at').first()
    if last and last.status == 'DISCHARGED' and not last.cleaned_at:
        raise ValidationError({'bed_ref': 'This bed is waiting for housekeeping.'})
    if DaycareStay.objects.filter(patient=patient, status='OCCUPIED').exists():
        raise ValidationError({'uhid': 'This patient already has a day-care bed.'})
    visit = OpdVisit.objects.filter(patient=patient, visit_date=timezone.localdate()).exclude(
        status__in=[S.CANCELLED, S.NO_SHOW]).order_by('-token_number').first()
    doctor = resolve_doctor(data.get('doctor')) or (visit.doctor if visit else None)
    n = DaycareStay.objects.filter(admitted_at__date=timezone.localdate()).count() + 1
    stay = DaycareStay.objects.create(
        stay_number=f"DC-{timezone.localdate():%Y%m%d}-{n:03d}", visit=visit, patient=patient, doctor=doctor, bed_ref=bed_ref,
        bed_label=str(data.get('bed_label') or '')[:60], ward_name=str(data.get('ward_name') or '')[:120],
        nurse_name=str(data.get('nurse') or '')[:120], reason=reason[:255], admitted_by=user,
    )
    if visit:
        log(visit, 'DAYCARE_ADMITTED', user, visit.status, visit.status, payload={'stay': stay.stay_number, 'bed': stay.bed_label, 'reason': reason})
    return stay


def _int(v):
    try:
        return None if v in (None, '') else int(float(v))
    except (TypeError, ValueError):
        raise ValidationError({'reading': 'Enter numbers for the readings.'})


@transaction.atomic
def chart_entry(stay_id, user, data):
    """Nurse charts a reading, an escalation or a note. A reading with NEWS2 >= 7 raises an automatic escalation."""
    from .models import DaycareStay, NursingChartEntry
    if _role(user) not in NURSE | DOCTOR_LEVEL and not _is_admin(user):
        raise PermissionDenied('Only clinical staff chart observations.')
    stay = DaycareStay.objects.select_for_update().select_related('doctor__user').get(id=stay_id)
    if stay.status != 'OCCUPIED':
        raise ValidationError({'stay': 'The patient has been discharged.'})
    kind = str(data.get('kind') or 'READING').upper()
    if kind not in ('READING', 'ESCALATION', 'NOTE'):
        raise ValidationError({'kind': 'Reading, escalation or note.'})
    note = str(data.get('note') or '').strip()
    e = NursingChartEntry(stay=stay, kind=kind, note=note, by=user, escalated_to=str(data.get('escalated_to') or '')[:120])
    if kind == 'READING':
        sys_bp, _, dia_bp = str(data.get('bp') or '').partition('/')
        e.systolic_bp, e.diastolic_bp = _int(sys_bp), _int(dia_bp)
        e.pulse, e.spo2, e.respiratory_rate = _int(data.get('pulse')), _int(data.get('spo2')), _int(data.get('respiratory_rate'))
        e.pain, e.news2 = _int(data.get('pain')), _int(data.get('news2'))
        e.temperature = Decimal(str(data['temp'])) if data.get('temp') not in (None, '') else None
        e.avpu, e.on_oxygen = str(data.get('avpu') or '')[:1].upper(), bool(data.get('on_oxygen'))
        if not (e.systolic_bp and e.pulse and e.spo2):
            raise ValidationError({'reading': 'BP, pulse and SpO2 are required.'})
    elif kind == 'ESCALATION' and (len(note) < 3 or not e.escalated_to):
        raise ValidationError({'escalation': 'Say who was called and why.'})
    elif kind == 'NOTE' and len(note) < 3:
        raise ValidationError({'note': 'Write the note.'})
    e.save()
    auto = None
    if kind == 'READING' and (e.news2 or 0) >= 7:
        to = f"Dr. {stay.doctor.user.get_full_name()}" if stay.doctor else 'Duty doctor'
        auto = NursingChartEntry.objects.create(stay=stay, kind='ESCALATION', automatic=True, by=user, escalated_to=to,
                                                note=f'NEWS2 {e.news2}: urgent review requested (automatic)')
        raise_alert(user, {'kind': 'ESCALATION', 'priority': 'RED_IMMEDIATE', 'stay_id': str(stay.id), 'escalated_to': to,
                           'location': f'{stay.ward_name} · {stay.bed_label}'.strip(' ·') or 'Day-care',
                           'condition': f'NEWS2 {e.news2} on day-care observation — urgent review'}, automatic=True)
    if stay.visit_id:
        log(stay.visit, f'DAYCARE_{kind}', user, stay.visit.status, stay.visit.status,
            payload={'stay': stay.stay_number, 'news2': e.news2, 'auto_escalation': bool(auto)})
    return e, auto


@transaction.atomic
def round_note(stay_id, user, note, plan=''):
    from .models import DaycareStay, DaycareRoundNote
    stay = DaycareStay.objects.select_related('doctor__user').get(id=stay_id)
    on_behalf_of = doctor_authority(user, stay.doctor)
    if stay.status != 'OCCUPIED':
        raise ValidationError({'stay': 'The patient has been discharged.'})
    if len((note or '').strip()) < 3:
        raise ValidationError({'note': 'Write the round note.'})
    r = DaycareRoundNote.objects.create(stay=stay, note=note.strip(), plan=str(plan or '')[:40], performed_by=user, on_behalf_of=on_behalf_of)
    if stay.visit_id:
        log(stay.visit, 'DAYCARE_ROUND', user, stay.visit.status, stay.visit.status, on_behalf_of, {'stay': stay.stay_number, 'plan': r.plan})
    return r


def daycare_bill(admitted_at, discharged_at):
    """Hours (rounded up, minimum 1) at the hourly rate, never more than the day rate per started day."""
    import math
    hours = max(1, math.ceil((discharged_at - admitted_at).total_seconds() / 3600))
    days, rem = divmod(hours, 24)
    hr, day = _daycare_tariff('HR'), _daycare_tariff('DAY')
    lines = []
    if days:
        lines.append((day, days))
    if rem:
        lines.append((hr, rem) if rem * hr.base_price < day.base_price else (day, 1))
    return hours, lines


@transaction.atomic
def discharge_bed(stay_id, user, outcome, note=''):
    from .models import DaycareStay
    from apps.billing.services import CashierWorkspaceService
    if _role(user) not in BED_STAFF | DOCTOR_LEVEL and not _is_admin(user):
        raise PermissionDenied('Your role cannot discharge a day-care patient.')
    stay = DaycareStay.objects.select_for_update().get(id=stay_id)
    if stay.status != 'OCCUPIED':
        raise ValidationError({'stay': 'Already discharged.'})
    if len(str(outcome or '').strip()) < 3:
        raise ValidationError({'outcome': 'Record the discharge outcome.'})
    stay.status, stay.discharged_at, stay.discharged_by = 'DISCHARGED', timezone.now(), user
    stay.discharge_outcome, stay.discharge_note = str(outcome).strip()[:30], (note or '').strip()
    stay.save()
    hours, lines = daycare_bill(stay.admitted_at, stay.discharged_at)
    charges = [CashierWorkspaceService._charge_from_tariff(stay.patient, t, q, f'OPD-DC-{stay.stay_number}') for t, q in lines]
    stay.charges.set(charges)
    if stay.visit_id:
        log(stay.visit, 'DAYCARE_DISCHARGED', user, stay.visit.status, stay.visit.status, payload={
            'stay': stay.stay_number, 'hours': hours, 'outcome': stay.discharge_outcome,
            'charges': [f'{c.service_code} x{c.quantity} {c.total_amount}' for c in charges]})
    return stay


@transaction.atomic
def mark_bed_cleaned(stay_id, user, cleaner=''):
    from .models import DaycareStay
    if _role(user) not in BED_STAFF and not _is_admin(user):
        raise PermissionDenied('Your role cannot release a bed.')
    stay = DaycareStay.objects.select_for_update().get(id=stay_id)
    if stay.status != 'DISCHARGED' or stay.cleaned_at:
        raise ValidationError({'stay': 'Nothing to clean on this bed.'})
    stay.cleaned_at, stay.cleaned_by = timezone.now(), (cleaner or user.get_full_name() or user.username)[:120]
    stay.save(update_fields=['cleaned_at', 'cleaned_by'])
    return stay


@transaction.atomic
def transfer_bed(stay_id, user, bed_ref, bed_label='', ward_name=''):
    """Move the patient to another day-care bed; the old bed goes to housekeeping. Billing time continues."""
    from .models import DaycareStay
    if _role(user) not in BED_STAFF and not _is_admin(user):
        raise PermissionDenied('Reception or the nurse moves day-care patients.')
    stay = DaycareStay.objects.select_for_update().get(id=stay_id)
    if stay.status != 'OCCUPIED':
        raise ValidationError({'stay': 'The patient has been discharged.'})
    if not bed_ref or bed_ref == stay.bed_ref:
        raise ValidationError({'bed_ref': 'Choose another bed.'})
    if DaycareStay.objects.filter(bed_ref=bed_ref, status='OCCUPIED').exists():
        raise ValidationError({'bed_ref': 'That bed is occupied.'})
    last = DaycareStay.objects.filter(bed_ref=bed_ref).order_by('-admitted_at').first()
    if last and last.status == 'DISCHARGED' and not last.cleaned_at:
        raise ValidationError({'bed_ref': 'That bed is waiting for housekeeping.'})
    old = (stay.bed_ref, stay.bed_label)
    # the vacated bed is recorded as a closed zero-length stay so housekeeping sees it
    DaycareStay.objects.create(
        stay_number=f"{stay.stay_number}-MV{DaycareStay.objects.filter(stay_number__startswith=stay.stay_number).count()}",
        patient=stay.patient, doctor=stay.doctor, visit=stay.visit, bed_ref=old[0], bed_label=old[1], ward_name=stay.ward_name,
        reason=f'Moved to {bed_label or bed_ref}', status='DISCHARGED', discharged_at=timezone.now(), discharged_by=user,
        discharge_outcome='Moved', admitted_by=user)
    stay.bed_ref, stay.bed_label = bed_ref, (bed_label or '')[:60]
    if ward_name:
        stay.ward_name = ward_name[:120]
    stay.save()
    if stay.visit_id:
        log(stay.visit, 'DAYCARE_MOVED', user, stay.visit.status, stay.visit.status, payload={'from': old[1], 'to': stay.bed_label})
    return stay


# --------------------------------------------------------------------------- follow-ups & bookings (WF-5)

BOOKERS = RECEPTION | DOCTOR_LEVEL | ADMINS
VISIT_KINDS = {'NEW', 'FOLLOW_UP', 'SECOND_OPINION'}


def _date(v, field='date'):
    try:
        return date_cls.fromisoformat(str(v)[:10])
    except (TypeError, ValueError):
        raise ValidationError({field: 'Enter a valid date.'})


def create_follow_up(visit, user, on_behalf_of, due, reason, note=''):
    from .models import OpdFollowUp
    due = _date(due, 'follow_up_date')
    if due <= visit.visit_date:
        raise ValidationError({'follow_up_date': 'The follow-up must be after today.'})
    return OpdFollowUp.objects.create(patient=visit.patient, origin_visit=visit, doctor=visit.doctor, due_date=due,
                                      reason=(reason or '').strip()[:255], clinical_note=note or '', performed_by=user, on_behalf_of=on_behalf_of)


@transaction.atomic
def book(user, data, booking_id=None):
    """Book (or reschedule) an advance appointment. One patient per doctor slot; booking a follow-up marks it BOOKED."""
    from .models import OpdBooking, OpdFollowUp
    if _role(user) not in BOOKERS and not _is_admin(user):
        raise PermissionDenied('Your role cannot book appointments.')
    existing = OpdBooking.objects.select_for_update().get(id=booking_id) if booking_id else None
    if existing and existing.status != 'BOOKED':
        raise ValidationError({'status': 'Only a booked appointment can be rescheduled.'})
    patient = existing.patient if existing else Patient.objects.filter(uhid__iexact=str(data.get('uhid') or '')).first()
    if not patient:
        raise ValidationError({'uhid': 'Select a registered patient.'})
    doctor = resolve_doctor(data.get('doctor')) or (existing.doctor if existing else None)
    if not doctor:
        raise ValidationError({'doctor': 'Select an OPD doctor.'})
    day = _date(data.get('date') or (existing and existing.date))
    if day < timezone.localdate():
        raise ValidationError({'date': 'Choose today or a later date.'})
    slot = str(data.get('slot') or (existing and existing.slot) or '').strip()
    if not slot:
        raise ValidationError({'slot': 'Choose a slot.'})
    kind = str(data.get('visit_type') or (existing and existing.visit_type) or 'NEW').upper()
    if kind not in VISIT_KINDS:
        raise ValidationError({'visit_type': 'New, follow-up or second opinion.'})
    taken = OpdBooking.objects.filter(doctor=doctor, date=day, slot=slot, status__in=['BOOKED', 'CHECKED_IN'])
    if existing:
        taken = taken.exclude(id=existing.id)
    if taken.exists():
        raise ValidationError({'slot': f'{slot} is already taken.'})
    same_day = OpdBooking.objects.filter(patient=patient, date=day, status='BOOKED')
    if (same_day.exclude(id=existing.id) if existing else same_day).exists():
        raise ValidationError({'uhid': 'This patient already has an appointment that day.'})
    fu = None
    if data.get('follow_up_id'):
        fu = OpdFollowUp.objects.select_for_update().filter(id=data['follow_up_id'], patient=patient).first()
        if not fu or fu.status not in ('PENDING_BOOKING', 'MISSED'):
            raise ValidationError({'follow_up_id': 'This follow-up is not waiting to be booked.'})
        kind = 'FOLLOW_UP'
    master = {'FOLLOW_UP': doctor.follow_up_fee}.get(kind) or doctor.consultation_fee
    fee = _money(master) if config('tariff') else _money(data.get('fee') if data.get('fee') not in (None, '') else (existing.fee if existing else doctor.consultation_fee))
    b_slot = _slot_minutes(slot)
    from .models import OpdDoctorBlock
    for blk in OpdDoctorBlock.objects.filter(doctor=doctor, date=day):
        lo, hi = _slot_minutes(blk.from_slot), _slot_minutes(blk.to_slot)
        if blk.all_day or (b_slot is not None and lo is not None and hi is not None and lo <= b_slot <= hi):
            raise ValidationError({'slot': f"Dr. {doctor.user.get_full_name()} is not available then ({blk.reason})."})
    if existing:
        before = f'{existing.date} {existing.slot} {existing.doctor_id}'
        existing.doctor, existing.date, existing.slot, existing.visit_type, existing.fee = doctor, day, slot, kind, fee
        existing.room = str(data.get('room') or existing.room)[:60]
        existing.notes = str(data.get('notes') if 'notes' in data else existing.notes)
        existing.save()
        b, action = existing, 'RESCHEDULED'
    else:
        n = OpdBooking.objects.filter(date=day).count() + 1
        ref = f"APT-{day:%Y%m%d}-{n:03d}"
        while OpdBooking.objects.filter(ref=ref).exists():
            n += 1
            ref = f"APT-{day:%Y%m%d}-{n:03d}"
        b = OpdBooking.objects.create(ref=ref, date=day, slot=slot, patient=patient, doctor=doctor, room=str(data.get('room') or '')[:60],
                                      visit_type=kind, fee=fee, follow_up=fu, notes=str(data.get('notes') or ''), booked_by=user)
        before, action = '', 'BOOKED'
    if fu:
        fu.status = 'BOOKED'
        fu.save(update_fields=['status'])
    if b.follow_up and b.follow_up.origin_visit:
        log(b.follow_up.origin_visit, f'FOLLOW_UP_{action}', user, b.follow_up.origin_visit.status, b.follow_up.origin_visit.status,
            payload={'booking': b.ref, 'slot': f'{b.date} {b.slot}', 'before': before})
    return b


@transaction.atomic
def cancel_booking(booking_id, user, reason, no_show=False):
    from .models import OpdBooking
    if _role(user) not in BOOKERS and not _is_admin(user):
        raise PermissionDenied('Your role cannot change appointments.')
    b = OpdBooking.objects.select_for_update().select_related('follow_up').get(id=booking_id)
    if b.status != 'BOOKED':
        raise ValidationError({'status': f'This appointment is already {b.status.lower().replace("_", " ")}.'})
    if not no_show and len((reason or '').strip()) < 3:
        raise ValidationError({'reason': 'Give a reason for cancelling.'})
    if no_show:
        slot_passed = b.date < timezone.localdate() or (b.date == timezone.localdate() and _slot_minutes(b.slot) is not None
                                                          and _slot_minutes(b.slot) < timezone.localtime().hour * 60 + timezone.localtime().minute)
        if not slot_passed:
            raise ValidationError({'status': 'Only after the slot has passed.'})
    b.status = 'NO_SHOW' if no_show else 'CANCELLED'
    b.cancel_reason = (reason or '').strip()[:255]
    b.save()
    if b.follow_up and b.follow_up.status == 'BOOKED':
        # cancelled: back to the to-book list; not attended: missed (still bookable)
        b.follow_up.status = 'MISSED' if no_show else 'PENDING_BOOKING'
        b.follow_up.save(update_fields=['status'])
    return b


def _slot_minutes(slot):
    m = re.match(r'^\s*(\d{1,2}):(\d{2})\s*([AaPp][Mm])?', slot or '')
    if not m:
        return None
    h, mi, ap = int(m.group(1)), int(m.group(2)), (m.group(3) or '').upper()
    if ap == 'PM' and h != 12:
        h += 12
    if ap == 'AM' and h == 12:
        h = 0
    return h * 60 + mi


@transaction.atomic
def check_in(booking_id, user, fee=None, fee_paid=False, payment_mode='', receipt=''):
    """The patient arrives for a booking: the visit is issued (follow-up type and fee for a follow-up)."""
    from .models import OpdBooking
    b = OpdBooking.objects.select_for_update().select_related('follow_up', 'patient', 'doctor').get(id=booking_id)
    if b.status != 'BOOKED':
        raise ValidationError({'status': f'This appointment is {b.status.lower().replace("_", " ")}.'})
    if b.date != timezone.localdate():
        raise ValidationError({'date': 'Patients check in on the day of the appointment.'})
    visit = issue_visit(user=user, patient=b.patient, doctor=b.doctor,
                        visit_type=VisitType.FOLLOW_UP if b.visit_type == 'FOLLOW_UP' else VisitType.NEW,
                        fee=fee if fee not in (None, '') else b.fee, fee_paid=fee_paid, payment_mode=payment_mode, receipt=receipt,
                        chamber=b.room, source_ref=None, from_booking=True)
    b.status, b.visit = 'CHECKED_IN', visit
    b.save(update_fields=['status', 'visit', 'updated_at'])
    if b.follow_up:
        b.follow_up.status, b.follow_up.completed_visit = 'COMPLETED', visit
        b.follow_up.save(update_fields=['status', 'completed_visit'])
    log(visit, 'CHECKED_IN_FROM_BOOKING', user, visit.status, visit.status,
        payload={'booking': b.ref, 'slot': b.slot, 'follow_up': str(b.follow_up_id) if b.follow_up_id else ''})
    return visit



# --------------------------------------------------------------------------- emergency alerts (WF-6)

ALERT_RAISERS = NURSE | DOCTOR_LEVEL | RECEPTION | ADMINS


@transaction.atomic
def raise_alert(user, data, automatic=False):
    from .models import OpdEmergencyAlert, DaycareStay
    if not automatic and _role(user) not in ALERT_RAISERS and not _is_admin(user):
        raise PermissionDenied('Your role cannot raise an emergency alert.')
    kind = str(data.get('kind') or 'CODE_BLUE').upper()
    priority = str(data.get('priority') or 'RED_IMMEDIATE').upper()
    if kind not in ('CODE_BLUE', 'ESCALATION') or priority not in ('RED_IMMEDIATE', 'YELLOW_URGENT'):
        raise ValidationError({'kind': 'Unknown alert type or priority.'})
    location = str(data.get('location') or '').strip()
    condition = str(data.get('condition') or '').strip()
    if len(location) < 3 or len(condition) < 3:
        raise ValidationError({'alert': 'Give the location and what is happening.'})
    stay = DaycareStay.objects.filter(id=data['stay_id']).select_related('patient', 'visit').first() if data.get('stay_id') else None
    patient = stay.patient if stay else (Patient.objects.filter(uhid__iexact=str(data.get('uhid'))).first() if data.get('uhid') else None)
    visit = (stay.visit if stay else None) or (OpdVisit.objects.filter(patient=patient, visit_date=timezone.localdate())
                                               .exclude(status__in=CLOSED_STATUSES).order_by('-token_number').first() if patient else None)
    a = OpdEmergencyAlert.objects.create(
        kind=kind, priority=priority, location=location[:150], patient=patient, visit=visit, stay=stay,
        patient_name=(f'{patient.first_name} {patient.last_name}'.strip() if patient else str(data.get('patient_name') or 'Unknown person'))[:150],
        age=int(data.get('age') or 0), gender=str(data.get('gender') or (patient.gender if patient else ''))[:20],
        condition=condition, escalated_to=str(data.get('escalated_to') or '')[:150], automatic=automatic, raised_by=user,
    )
    if visit:
        if kind == 'CODE_BLUE' and visit.priority != VisitPriority.EMERGENCY:
            visit.priority = VisitPriority.EMERGENCY
            visit.save(update_fields=['priority', 'updated_at'])
        log(visit, f'ALERT_{kind}', user, visit.status, visit.status, payload={'alert': str(a.id), 'location': a.location,
                                                                                'priority': priority, 'automatic': automatic})
    return a


@transaction.atomic
def attend_alert(alert_id, user, outcome):
    from .models import OpdEmergencyAlert
    if _role(user) not in DOCTORS and not _is_admin(user):
        raise PermissionDenied('A doctor attends emergency alerts.')
    a = OpdEmergencyAlert.objects.select_for_update().get(id=alert_id)
    if a.status != 'ACTIVE':
        raise ValidationError({'status': f'Already attended by {a.attended_by.get_full_name() if a.attended_by else "a doctor"}.'})
    # "I'm attending" is pressed on the way to the patient; the outcome can be added then or left as attending
    a.status, a.attended_by, a.attended_at, a.outcome = 'ATTENDED', user, timezone.now(), (outcome or '').strip() or 'Attending'
    a.save()
    if a.visit_id:
        log(a.visit, 'ALERT_ATTENDED', user, a.visit.status, a.visit.status,
            payload={'alert': str(a.id), 'minutes': round((a.attended_at - a.raised_at).total_seconds() / 60, 1), 'outcome': a.outcome})
    return a


# --------------------------------------------------------------------------- OPD admin configuration (WF-7)

CONFIG_EDITORS = ADMINS
OPD_DEPT_ID = '1'


def audit(user, kind, subject, change, before='', after=''):
    from .models import OpdAdminAudit
    return OpdAdminAudit.objects.create(kind=kind, subject=str(subject)[:200], change=str(change), before=str(before or ''),
                                        after=str(after or ''), by=user)


def config(kind, default=None):
    from .models import OpdConfigDoc
    doc = OpdConfigDoc.objects.filter(kind=kind).first()
    return doc.data if doc else default


def _opd_items(data):
    """Doctors / rooms / schedules documents hold the OPD department's items as a list."""
    items = data if isinstance(data, list) else (data or {}).get('items', [])
    return [i for i in items if str(i.get('departmentId', OPD_DEPT_ID)) == OPD_DEPT_ID]


def _fee(v):
    try:
        return Decimal(str(v)).quantize(Decimal('0.01')) if v not in (None, '') else None
    except (InvalidOperation, ValueError):
        return None


def apply_tariff(data, user):
    """Fee master -> doctor fees (new / follow-up / emergency) and the day-care bed tariffs used by Billing."""
    from apps.billing.models import TariffMaster
    changes = []
    for t in (data or {}).get('doctorTariffs', []):
        doc = DoctorProfile.objects.filter(staff_ref__in=[str(t.get('doctorId') or ''), str(t.get('staffId') or '')]).exclude(staff_ref='').first() \
            or resolve_doctor(t.get('doctorName'))
        if not doc:
            continue
        new = {'consultation_fee': _fee(t.get('standardFee')), 'follow_up_fee': _fee(t.get('followUpFee')), 'emergency_fee': _fee(t.get('emergencyFee'))}
        for field, value in new.items():
            if value is not None and getattr(doc, field) != value:
                changes.append(f"Dr. {doc.user.get_full_name()} {field.replace('_', ' ')} {getattr(doc, field)} → {value}")
                setattr(doc, field, value)
        doc.save()
    bed = next((b for b in (data or {}).get('bedCategoryTariffs', []) if b.get('id') == 'bed-cat-daycare'), None)
    if bed:
        for key, val in (('HR', bed.get('hourlyRate')), ('DAY', bed.get('dailyRate'))):
            t = _daycare_tariff(key)
            v = _fee(val)
            if v is not None and t.base_price != v:
                changes.append(f'{t.name} {t.base_price} → {v}')
                TariffMaster.objects.filter(pk=t.pk).update(base_price=v)
    return changes


@transaction.atomic
def save_config(kind, data, user):
    from .models import OpdConfigDoc
    if kind not in OpdConfigDoc.KINDS:
        raise ValidationError({'kind': 'Unknown configuration document.'})
    if _role(user) not in CONFIG_EDITORS and not _is_admin(user):
        raise PermissionDenied('Only the OPD admin changes OPD settings.')
    doc, _ = OpdConfigDoc.objects.select_for_update().get_or_create(kind=kind)
    before = doc.data
    if before == data:
        return doc, []
    doc.data, doc.version, doc.updated_by = data, doc.version + 1, user
    doc.save()
    changes = []
    if kind == 'tariff':
        changes = apply_tariff(data, user)
        bf, af = before or {}, data or {}
        for f, label in (('triageVitalsFee', 'Triage & vitals fee'), ('intakeRegistrationFee', 'Registration fee')):
            if bf.get(f) != af.get(f):
                changes.append(f'{label} {bf.get(f)} → {af.get(f)}')
    elif kind == 'workspace':
        bc, ac = (before or {}).get('config', {}) or {}, (data or {}).get('config', {}) or {}
        for f, label in (('isWalkInAllowed', 'Walk-in tokens'), ('dailyCapacity', 'Daily capacity')):
            if bc.get(f) != ac.get(f):
                changes.append(f'{label} {bc.get(f)} → {ac.get(f)}')
    else:
        b_items = {i.get('id'): i for i in _opd_items(before)}
        a_items = {i.get('id'): i for i in _opd_items(data)}
        added = [a_items[k].get('fullName') or a_items[k].get('name') or k for k in a_items.keys() - b_items.keys()]
        removed = [b_items[k].get('fullName') or b_items[k].get('name') or k for k in b_items.keys() - a_items.keys()]
        edited = [a_items[k].get('fullName') or a_items[k].get('name') or a_items[k].get('roomNumber') or k
                  for k in a_items.keys() & b_items.keys() if a_items[k] != b_items[k]]
        changes = [f'Added {", ".join(map(str, added))}'] * bool(added) + [f'Removed {", ".join(map(str, removed))}'] * bool(removed) + \
                  [f'Changed {", ".join(map(str, edited))}'] * bool(edited)
    kind_label = {'tariff': 'TARIFF', 'workspace': 'POLICY', 'doctors': 'DOCTOR', 'rooms': 'ROOM', 'schedules': 'ROSTER'}[kind]
    if changes or kind in ('rooms', 'schedules', 'doctors'):
        audit(user, kind_label, f'OPD {kind}', '; '.join(changes) or 'Updated')
    return doc, changes


def opd_policy():
    ws = config('workspace', {}) or {}
    cfg = ws.get('config', {}) or {}
    return {'walk_in_allowed': cfg.get('isWalkInAllowed', True) is not False, 'daily_capacity': int(cfg.get('dailyCapacity') or 0)}


def doctor_capacity(doctor):
    for d in _opd_items(config('doctors', [])):
        if doctor.staff_ref and (d.get('id') == doctor.staff_ref or d.get('staffId') == doctor.staff_ref):
            return int(d.get('patientCapacityPerDay') or 0)
    return 0


def quote_fee(patient, doctor, visit_type):
    """Fee from the OPD fee master: consultation by visit type + triage fee + registration on the first visit.
    None when the fee master has not been published to the server yet (the desk quote is used then)."""
    tariff = config('tariff')
    if not tariff:
        return None
    consult = {VisitType.FOLLOW_UP: doctor.follow_up_fee, VisitType.EMERGENCY: doctor.emergency_fee}.get(visit_type) or doctor.consultation_fee
    triage = _fee(tariff.get('triageVitalsFee')) or Decimal('0')
    first = not OpdVisit.objects.filter(patient=patient).exclude(status__in=[S.CANCELLED]).exists()
    reg = (_fee(tariff.get('intakeRegistrationFee')) or Decimal('0')) if first else Decimal('0')
    return (Decimal(str(consult)) + triage + reg).quantize(Decimal('0.01'))


def block_now(doctor, day, slot_minutes=None):
    """The block that stops a new token for this doctor now (all-day, or covering the current time)."""
    from .models import OpdDoctorBlock
    now_min = slot_minutes if slot_minutes is not None else timezone.localtime().hour * 60 + timezone.localtime().minute
    for b in OpdDoctorBlock.objects.filter(doctor=doctor, date=day):
        if b.all_day:
            return b
        lo, hi = _slot_minutes(b.from_slot), _slot_minutes(b.to_slot)
        if lo is not None and hi is not None and lo <= now_min <= hi + 14:
            return b
    return None


def admission_checks(patient, doctor, visit_type, day, from_booking=False):
    """Policy for a new token. Raises on a hard stop; returns warnings (capacity) for the desk."""
    warnings = []
    if visit_type != VisitType.EMERGENCY:
        b = block_now(doctor, day)
        if b:
            raise ValidationError({'doctor': f"Dr. {doctor.user.get_full_name()} is not available ({b.reason}). Choose another doctor."})
        if not from_booking and visit_type == VisitType.NEW and not opd_policy()['walk_in_allowed']:
            raise ValidationError({'visit_type': 'Walk-in tokens are switched off by the OPD admin — book an appointment instead.'})
    pol = opd_policy()
    today = OpdVisit.objects.filter(visit_date=day).exclude(status=S.CANCELLED)
    if pol['daily_capacity'] and today.count() >= pol['daily_capacity']:
        warnings.append(f"OPD daily capacity of {pol['daily_capacity']} reached.")
    cap = doctor_capacity(doctor)
    if cap and today.filter(doctor=doctor).count() >= cap:
        warnings.append(f"Dr. {doctor.user.get_full_name()} has reached the daily limit of {cap} patients.")
    return warnings


@transaction.atomic
def add_block(user, data):
    from .models import OpdDoctorBlock
    doctor = resolve_doctor(data.get('doctor'))
    if not doctor:
        raise ValidationError({'doctor': 'Select an OPD doctor.'})
    if not (_role(user) in CONFIG_EDITORS | RECEPTION or _is_admin(user)):
        doctor_authority(user, doctor)  # a doctor (or their assistant) blocks their own time
    reason = str(data.get('reason') or '').strip()
    if len(reason) < 3:
        raise ValidationError({'reason': 'Give a reason.'})
    all_day = bool(data.get('all_day', True))
    if not all_day and (_slot_minutes(data.get('from')) is None or _slot_minutes(data.get('to')) is None):
        raise ValidationError({'from': 'Choose the time range.'})
    b = OpdDoctorBlock.objects.create(doctor=doctor, date=_date(data.get('date')), all_day=all_day, from_slot=str(data.get('from') or '')[:20],
                                      to_slot=str(data.get('to') or '')[:20], reason=reason[:255], created_by=user)
    audit(user, 'DOCTOR', f"Dr. {doctor.user.get_full_name()}", f"Blocked {b.date}{'' if all_day else f' {b.from_slot}–{b.to_slot}'}: {reason}")
    return b


@transaction.atomic
def remove_block(block_id, user):
    from .models import OpdDoctorBlock
    b = OpdDoctorBlock.objects.select_related('doctor__user').get(id=block_id)
    if not (_role(user) in CONFIG_EDITORS | RECEPTION or _is_admin(user)):
        doctor_authority(user, b.doctor)
    audit(user, 'DOCTOR', f"Dr. {b.doctor.user.get_full_name()}", f'Removed block {b.date}: {b.reason}')
    b.delete()


@transaction.atomic
def set_doctor_status(user, data):
    from .models import OpdDoctorStatus
    doctor = resolve_doctor(data.get('doctor'))
    if not doctor:
        raise ValidationError({'doctor': 'Select an OPD doctor.'})
    if not (_role(user) in CONFIG_EDITORS | RECEPTION or _is_admin(user)):
        doctor_authority(user, doctor)
    st = str(data.get('status') or '').upper()
    if st not in ('IN', 'BREAK', 'ROUNDS', 'OT', 'LATE', 'OUT'):
        raise ValidationError({'status': 'Unknown status.'})
    s, _ = OpdDoctorStatus.objects.update_or_create(doctor=doctor, defaults={
        'status': st, 'until': str(data.get('until') or '')[:10], 'note': str(data.get('note') or '')[:255], 'set_by': user})
    return s
