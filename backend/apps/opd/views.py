"""OPD API (/api/v1/opd/). Every endpoint needs a signed-in user; role rules live in services.py."""
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import DoctorProfile
from apps.patients.models import Patient
from . import services
from .models import OpdVisit, AssistantAssignment


def _name(user):
    return (user.get_full_name() or user.username) if user else ''


def _vitals(v):
    if not v:
        return None
    return {k: (float(getattr(v, k)) if getattr(v, k) is not None and k in ('temperature', 'height_cm', 'weight_kg', 'bmi')
                else getattr(v, k))
            for k in ('systolic_bp', 'diastolic_bp', 'pulse_rate', 'temperature', 'spo2', 'respiratory_rate', 'rbs', 'avpu',
                      'on_oxygen', 'news2', 'height_cm', 'weight_kg', 'bmi')}


def visit_dict(v: OpdVisit, full=False):
    p, d = v.patient, v.doctor
    out = {
        'id': str(v.id), 'visitNumber': v.visit_number, 'token': v.token_number, 'date': v.visit_date.isoformat(),
        'status': v.status, 'visitType': v.visit_type, 'priority': v.priority, 'holdReason': v.hold_reason,
        'patient': {'id': str(p.id), 'uhid': p.uhid, 'name': f"{p.first_name} {p.last_name}".strip(), 'gender': p.gender,
                    'dob': p.date_of_birth, 'bloodGroup': p.blood_group or '',
                    'phone': p.phone_number, 'allergies': p.allergies or [], 'conditions': p.chronic_conditions or []},
        'doctor': {'id': str(d.id), 'staffRef': d.staff_ref, 'name': f"Dr. {_name(d.user)}", 'department': d.department} if d else None,
        'chamber': v.chamber, 'appointmentId': str(v.appointment_id) if v.appointment_id else None,
        'fee': float(v.fee_amount), 'feeStatus': v.fee_status, 'createdBy': _name(v.created_by),
        'deskPayment': (v.appointment.desk_payment if v.appointment_id and v.appointment else {}) or {}, 'checkoutRoutes': v.checkout_routes, 'sourceRef': v.source_ref,
        'holdFrom': (v.events.filter(action='HOLD').order_by('-at').values_list('from_status', flat=True).first() or '') if v.status == 'ON_HOLD' else '',
        'timeline': {k: (getattr(v, k).isoformat() if getattr(v, k) else None) for k in (
            'issued_at', 'triage_started_at', 'triaged_at', 'called_at', 'seated_at', 'completed_at', 'checked_out_at')},
    }
    if full:
        t = getattr(v, 'triage', None)
        out['triage'] = t and {
            'chiefComplaint': t.chief_complaint, 'painScore': t.pain_score, 'category': t.triage_category, 'news2': t.news2,
            'allergies': t.allergies, 'conditions': t.conditions, 'currentMedications': t.current_medications,
            'fallRisk': t.fall_risk, 'pregnancy': t.pregnancy, 'notes': t.nurse_notes, 'submitted': t.submitted,
            'triagedBy': _name(t.triaged_by), 'triagedAt': t.triaged_at.isoformat() if t.triaged_at else None,
            'vitals': _vitals(t.vitals),
        }
        c = getattr(v, 'consultation', None)
        out['consultation'] = c and {
            'id': str(c.id), 'diagnosis': c.provisional_diagnosis, 'chiefComplaint': c.chief_complaint, 'advice': c.advice,
            'status': c.status, 'enteredBy': _name(c.performed_by), 'onBehalfOf': _name(c.on_behalf_of),
            'coSignedBy': _name(c.co_signed_by), 'coSignedAt': c.co_signed_at.isoformat() if c.co_signed_at else None,
        }
        out['prescriptions'] = [{
            'number': rx.prescription_number, 'date': rx.created_at.date().isoformat(),
            'doctor': f"Dr. {_name(rx.doctor.user)}" if rx.doctor else '', 'diagnosis': c.provisional_diagnosis if c else '',
            'advice': rx.instructions or '',
            'items': [{'line': i.line_no, 'name': i.medication_name, 'dose': i.dosage, 'frequency': i.frequency, 'days': i.duration_days,
                       'route': i.route, 'timing': i.timing, 'instructions': i.instructions or '', 'clinicDose': i.is_clinic_dose}
                      for i in sorted(rx.items.all(), key=lambda i: i.line_no)],
            'dispenseOrders': [{'number': o.order_number, 'status': o.status, 'total': float(o.total_amount),
                                'paymentStatus': o.payment_status} for o in rx.dispense_orders.all()],
        } for rx in v.prescriptions.all()]
        lines = {i.id: i.line_no for rx in v.prescriptions.all() for i in rx.items.all()}
        out['procedures'] = [{**procedure_dict(p), 'rxItem': lines.get(p.prescription_item_id)} for p in v.procedures.all()]
        from apps.lab.models import LabOrder
        out['labOrders'] = [{
            'id': str(o.id), 'number': o.order_number, 'test': o.test.name if o.test else '', 'code': o.test.test_code if o.test else '',
            'status': o.status, 'priority': o.priority, 'abnormal': o.is_flagged_abnormal, 'critical': o.is_flagged_critical,
            'criticalAcknowledged': bool(o.critical_acknowledged_at),
            'results': [{'name': r.parameter_name, 'value': r.observed_value, 'unit': r.unit, 'flag': r.flag} for r in o.results.all()]
            if o.status == 'REPORT_APPROVED' else [],
        } for o in LabOrder.objects.select_related('test').filter(encounter_id=str(v.id)).order_by('ordered_at')]
        d = getattr(v, 'draft', None)
        out['draft'] = d.data if d else None
        out['events'] = [{'action': e.action, 'from': e.from_status, 'to': e.to_status, 'by': _name(e.performed_by),
                          'onBehalfOf': _name(e.on_behalf_of), 'role': e.role, 'payload': e.payload, 'at': e.at.isoformat()}
                         for e in v.events.select_related('performed_by', 'on_behalf_of')]
    return out


def _qs():
    return OpdVisit.objects.select_related('patient', 'doctor__user')


class VisitListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _qs().filter(visit_date=request.query_params.get('date') or timezone.localdate())
        if request.query_params.get('doctor'):
            doc = services.resolve_doctor(request.query_params['doctor'])
            qs = qs.filter(doctor=doc)
        if request.query_params.get('status'):
            qs = qs.filter(status__in=request.query_params['status'].split(','))
        full = request.query_params.get('full') in ('1', 'true')
        if full:
            qs = qs.select_related('triage__vitals', 'triage__triaged_by', 'appointment', 'created_by').prefetch_related('events', 'prescriptions__items')
        return Response({'visits': [visit_dict(v, full=full) for v in qs]})

    def post(self, request):
        d = request.data
        patient = Patient.objects.filter(uhid__iexact=str(d.get('uhid') or '')).first() if d.get('uhid') else \
            Patient.objects.filter(id=d.get('patient_id')).first() if d.get('patient_id') else None
        if not patient and d.get('uhid') and d.get('patient_name'):
            # registered at the desk moments ago and not on the server yet: same rule as the desk sync
            from apps.billing.opd_sync import OpdFrontDeskSyncService
            patient = OpdFrontDeskSyncService._patient({'uhid': d['uhid'], 'patient': d['patient_name'], 'gender': d.get('gender'),
                                                         'phone': d.get('phone'), 'bloodGroup': d.get('blood_group')})
        visit = services.issue_visit(
            user=request.user, patient=patient, doctor=services.doctor_from(d),
            visit_type=d.get('visit_type') or 'NEW', priority=d.get('priority') or 'NORMAL', fee=d.get('fee'),
            fee_paid=bool(d.get('fee_paid')), payment_mode=d.get('payment_mode') or '', receipt=d.get('receipt') or '',
            chamber=d.get('chamber') or '', source_ref=d.get('source_ref') or None,
            token_number=d.get('token') or None,
        )
        out = visit_dict(visit, full=True)
        out['warnings'] = getattr(visit, 'warnings', [])
        return Response(out, status=status.HTTP_201_CREATED)


class VisitDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        return Response(visit_dict(get_object_or_404(_qs(), id=pk), full=True))


class VisitTransitionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        get_object_or_404(OpdVisit, id=pk)
        v = services.transition(pk, str(request.data.get('action') or ''), request.user, request.data.get('reason') or '')
        return Response(visit_dict(_qs().get(id=v.id), full=True))


class TriageView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        get_object_or_404(OpdVisit, id=pk)
        v = services.save_triage(pk, request.user, request.data, submit=False)
        return Response(visit_dict(_qs().get(id=v.id), full=True))


class TriageSubmitView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        get_object_or_404(OpdVisit, id=pk)
        v = services.save_triage(pk, request.user, request.data, submit=True)
        return Response(visit_dict(_qs().get(id=v.id), full=True))


class CompleteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        get_object_or_404(OpdVisit, id=pk)
        from django.db import IntegrityError
        try:
            v = services.complete_visit(pk, request.user, request.data, request.headers.get('Idempotency-Key') or '')
        except IntegrityError:
            # a simultaneous duplicate lost the race: answer with what the first request saved
            v = OpdVisit.objects.get(id=pk)
            if v.status not in ('COMPLETED', 'CHECKED_OUT'):
                raise services.Conflict({'status': 'This consultation is being saved by another request.'})
        return Response(visit_dict(_qs().get(id=v.id), full=True))


class CheckoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        get_object_or_404(OpdVisit, id=pk)
        v = services.checkout(pk, request.user, request.data.get('routes') or [], request.data.get('note') or '')
        return Response(visit_dict(_qs().get(id=v.id), full=True))


class CosignView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        c = services.cosign(pk, request.user)
        return Response({'id': str(c.id), 'coSignedBy': _name(c.co_signed_by), 'coSignedAt': c.co_signed_at.isoformat()})


class CosignQueueView(APIView):
    """Consultations an assistant entered for the signed-in doctor that are not co-signed yet."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.clinical.models import Consultation
        qs = Consultation.objects.select_related('patient', 'performed_by', 'visit').filter(
            doctor__user=request.user, on_behalf_of__isnull=False, co_signed_at__isnull=True).order_by('created_at')
        return Response({'items': [{
            'id': str(c.id), 'visitId': str(c.visit_id) if c.visit_id else None,
            'visitNumber': c.visit.visit_number if c.visit else '', 'patient': f"{c.patient.first_name} {c.patient.last_name}",
            'uhid': c.patient.uhid, 'diagnosis': c.provisional_diagnosis, 'enteredBy': _name(c.performed_by),
            'at': c.created_at.isoformat()} for c in qs]})


class MyDoctorsView(APIView):
    """Doctors the signed-in user can act for: a doctor -> themself; an assistant -> their assigned doctors."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role == 'DOCTOR_ASSISTANT':
            docs = [a.doctor for a in AssistantAssignment.objects.select_related('doctor__user').filter(assistant=request.user, active=True)]
        else:
            docs = list(DoctorProfile.objects.select_related('user').filter(user=request.user))
        return Response({'doctors': [{'id': str(d.id), 'staffRef': d.staff_ref, 'name': f"Dr. {_name(d.user)}",
                                      'department': d.department, 'fee': float(d.consultation_fee)} for d in docs]})


def fee_review_dict(r):
    v = r.visit
    return {'id': str(r.id), 'visitId': str(v.id), 'visitNumber': v.visit_number, 'date': v.visit_date.isoformat(),
            'patient': f"{v.patient.first_name} {v.patient.last_name}".strip(), 'uhid': v.patient.uhid,
            'doctor': f"Dr. {_name(v.doctor.user)}" if v.doctor else '', 'amount': float(r.amount), 'paidAt': r.paid_at,
            'outcome': r.outcome, 'reason': r.reason, 'status': r.status, 'decision': r.decision, 'note': r.note,
            'refundMode': r.refund_mode, 'refundReference': r.refund_reference, 'decidedBy': _name(r.decided_by),
            'decidedAt': r.decided_at.isoformat() if r.decided_at else None,
            'creditUsedBy': r.credit_used_by.visit_number if r.credit_used_by else None}


class FeeReviewListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .models import OpdFeeReview
        qs = OpdFeeReview.objects.select_related('visit__patient', 'visit__doctor__user', 'decided_by', 'credit_used_by')
        if request.query_params.get('status'):
            qs = qs.filter(status__in=request.query_params['status'].split(','))
        return Response({'reviews': [fee_review_dict(r) for r in qs[:200]]})


class FeeReviewDecideView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        d = request.data
        r = services.decide_fee_review(pk, request.user, d.get('decision'), d.get('reason'), d.get('note') or '', d.get('refund_mode') or 'CASH')
        return Response(fee_review_dict(r))


class FeeReviewRefundPaidView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        return Response(fee_review_dict(services.mark_refund_paid(pk, request.user)))


class DraftView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        get_object_or_404(OpdVisit, id=pk)
        services.save_draft(pk, request.user, request.data)
        return Response({'saved': True})


class SendForTestsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        get_object_or_404(OpdVisit, id=pk)
        v = services.send_for_tests(pk, request.user, request.data.get('tests') or [], request.data.get('draft'))
        return Response(visit_dict(_qs().get(id=v.id), full=True))


class DeskFeeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        get_object_or_404(OpdVisit, id=pk)
        d = request.data
        v = services.record_desk_fee(pk, request.user, d.get('mode') or 'CASH', d.get('receipt') or '', d.get('amount'))
        return Response(visit_dict(_qs().get(id=v.id), full=True))


class ReassignView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        get_object_or_404(OpdVisit, id=pk)
        v = services.reassign(pk, request.user, services.doctor_from(request.data), request.data.get('chamber'))
        return Response(visit_dict(_qs().get(id=v.id), full=True))


class DoctorsView(APIView):
    """OPD doctors on the server (id, staff id, name, fee) so screens can map the department master to them."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        docs = DoctorProfile.objects.select_related('user').exclude(staff_ref='')
        return Response({'doctors': [{'id': str(d.id), 'staffRef': d.staff_ref, 'name': f"Dr. {_name(d.user)}",
                                      'department': d.department, 'fee': float(d.consultation_fee)} for d in docs]})



def procedure_dict(p):
    return {'id': str(p.id), 'visitId': str(p.visit_id), 'uhid': p.patient.uhid, 'patient': f"{p.patient.first_name} {p.patient.last_name}".strip(),
            'token': p.visit.token_number, 'kind': p.kind, 'detail': p.detail, 'orderedBy': p.ordered_by, 'rxNo': p.prescription_number,
            'rxItem': None, 'route': p.route, 'site': p.site, 'batchNo': p.batch_no, 'status': p.status, 'note': p.note,
            'at': p.given_at.isoformat(), 'by': _name(p.given_by),
            'charges': [{'code': c.service_code, 'name': c.service_name, 'amount': float(c.total_amount), 'status': c.status} for c in p.charges.all()]}


class ProcedureListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .models import OpdProcedure
        from apps.clinical.models import PrescriptionItem
        qs = OpdProcedure.objects.select_related('patient', 'visit', 'given_by').prefetch_related('charges').filter(
            given_at__date=request.query_params.get('date') or timezone.localdate())
        lines = dict(PrescriptionItem.objects.filter(id__in=[p.prescription_item_id for p in qs if p.prescription_item_id]).values_list('id', 'line_no'))
        out = []
        for p in qs:
            d = procedure_dict(p)
            d['rxItem'] = lines.get(p.prescription_item_id)
            out.append(d)
        return Response({'procedures': out})

    def post(self, request):
        p = services.record_procedure(request.user, request.data)
        d = procedure_dict(p)
        d['rxItem'] = request.data.get('rx_item')
        return Response(d, status=status.HTTP_201_CREATED)



def _who(u):
    return (u.get_full_name() or u.username) if u else ''


def stay_dict(s):
    d = s.doctor
    return {
        'id': str(s.id), 'stayNumber': s.stay_number, 'visitId': str(s.visit_id) if s.visit_id else None,
        'patient': {'uhid': s.patient.uhid, 'name': f"{s.patient.first_name} {s.patient.last_name}".strip(), 'gender': s.patient.gender,
                    'dob': s.patient.date_of_birth},
        'doctor': {'id': str(d.id), 'name': f"Dr. {_who(d.user)}", 'department': d.department} if d else None,
        'bedRef': s.bed_ref, 'bedLabel': s.bed_label, 'ward': s.ward_name, 'nurse': s.nurse_name, 'reason': s.reason,
        'status': s.status, 'admittedAt': s.admitted_at.isoformat(), 'admittedBy': _who(s.admitted_by),
        'dischargedAt': s.discharged_at.isoformat() if s.discharged_at else None, 'dischargedBy': _who(s.discharged_by),
        'outcome': s.discharge_outcome, 'dischargeNote': s.discharge_note,
        'cleanedAt': s.cleaned_at.isoformat() if s.cleaned_at else None, 'cleanedBy': s.cleaned_by,
        'charges': [{'code': c.service_code, 'name': c.service_name, 'qty': c.quantity, 'amount': float(c.total_amount), 'status': c.status} for c in s.charges.all()],
        'chart': [{'id': str(e.id), 'kind': e.kind, 'at': e.at.isoformat(), 'by': _who(e.by),
                   'bp': f"{e.systolic_bp}/{e.diastolic_bp or ''}" if e.systolic_bp else None, 'pulse': e.pulse,
                   'temp': float(e.temperature) if e.temperature is not None else None, 'spo2': e.spo2, 'respiratoryRate': e.respiratory_rate,
                   'avpu': e.avpu or None, 'onOxygen': e.on_oxygen, 'pain': e.pain, 'news2': e.news2, 'escalatedTo': e.escalated_to,
                   'automatic': e.automatic, 'note': e.note} for e in s.chart.all()],
        'rounds': [{'id': str(r.id), 'at': r.at.isoformat(), 'note': r.note, 'plan': r.plan, 'by': _who(r.performed_by),
                    'onBehalfOf': _who(r.on_behalf_of)} for r in s.rounds.all()],
    }


def _stays():
    from .models import DaycareStay
    return DaycareStay.objects.select_related('patient', 'doctor__user', 'admitted_by', 'discharged_by').prefetch_related(
        'charges', 'chart__by', 'rounds__performed_by', 'rounds__on_behalf_of')


class StayListView(APIView):
    """Open stays, plus beds discharged and still waiting for housekeeping, plus today's discharges."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.db.models import Q
        qs = _stays().filter(Q(status='OCCUPIED') | Q(cleaned_at__isnull=True) | Q(discharged_at__date=timezone.localdate()))
        return Response({'stays': [stay_dict(s) for s in qs]})

    def post(self, request):
        s = services.allocate_bed(request.user, request.data)
        return Response(stay_dict(_stays().get(id=s.id)), status=status.HTTP_201_CREATED)


class StayChartView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        _, auto = services.chart_entry(pk, request.user, request.data)
        out = stay_dict(_stays().get(id=pk))
        out['autoEscalation'] = bool(auto)
        return Response(out, status=status.HTTP_201_CREATED)


class StayRoundView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        services.round_note(pk, request.user, request.data.get('note') or '', request.data.get('plan') or '')
        return Response(stay_dict(_stays().get(id=pk)), status=status.HTTP_201_CREATED)


class StayDischargeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        services.discharge_bed(pk, request.user, request.data.get('outcome') or '', request.data.get('note') or '')
        return Response(stay_dict(_stays().get(id=pk)))


class StayCleanedView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        services.mark_bed_cleaned(pk, request.user, request.data.get('cleaner') or '')
        return Response(stay_dict(_stays().get(id=pk)))


class StayTransferView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        d = request.data
        services.transfer_bed(pk, request.user, str(d.get('bed_ref') or ''), d.get('bed_label') or '', d.get('ward_name') or '')
        return Response(stay_dict(_stays().get(id=pk)))


def follow_up_dict(f):
    b = next((x for x in f.bookings.all() if x.status in ('BOOKED', 'CHECKED_IN')), None)
    return {'id': str(f.id), 'uhid': f.patient.uhid, 'patient': f"{f.patient.first_name} {f.patient.last_name}".strip(), 'phone': f.patient.phone_number,
            'doctor': f"Dr. {_who(f.doctor.user)}" if f.doctor else '', 'prescribedOn': f.created_at.date().isoformat(),
            'dueDate': f.due_date.isoformat(), 'reason': f.reason, 'clinicalNote': f.clinical_note, 'status': f.status,
            'bookedSlot': f"{b.date.isoformat()} {b.slot}" if b else None, 'bookingId': str(b.id) if b else None,
            'originVisit': f.origin_visit.visit_number if f.origin_visit else None,
            'enteredBy': _who(f.performed_by), 'onBehalfOf': _who(f.on_behalf_of)}


def booking_dict(b):
    p = b.patient
    return {'id': str(b.id), 'ref': b.ref, 'date': b.date.isoformat(), 'slot': b.slot, 'uhid': p.uhid,
            'patient': f"{p.first_name} {p.last_name}".strip(), 'phone': p.phone_number, 'gender': p.gender, 'dob': p.date_of_birth,
            'doctor': f"Dr. {_who(b.doctor.user)}", 'doctorStaffRef': b.doctor.staff_ref, 'specialty': b.doctor.department, 'room': b.room,
            'visitType': b.visit_type, 'fee': float(b.fee), 'status': b.status, 'followUpId': str(b.follow_up_id) if b.follow_up_id else None,
            'notes': b.notes, 'cancelReason': b.cancel_reason, 'bookedBy': _who(b.booked_by), 'bookedAt': b.booked_at.isoformat(),
            'visitId': str(b.visit_id) if b.visit_id else None, 'token': b.visit.token_number if b.visit_id else None}


class FollowUpListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .models import OpdFollowUp
        qs = OpdFollowUp.objects.select_related('patient', 'doctor__user', 'origin_visit', 'performed_by', 'on_behalf_of').prefetch_related('bookings')
        if request.query_params.get('status'):
            qs = qs.filter(status__in=request.query_params['status'].split(','))
        return Response({'followUps': [follow_up_dict(f) for f in qs[:500]]})


def _bookings():
    from .models import OpdBooking
    return OpdBooking.objects.select_related('patient', 'doctor__user', 'booked_by', 'visit')


class BookingListView(APIView):
    """Bookings from 7 days back onwards (?from=YYYY-MM-DD to change)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from datetime import timedelta
        start = request.query_params.get('from') or (timezone.localdate() - timedelta(days=7)).isoformat()
        return Response({'bookings': [booking_dict(b) for b in _bookings().filter(date__gte=start)[:1000]]})

    def post(self, request):
        b = services.book(request.user, request.data)
        return Response(booking_dict(_bookings().get(id=b.id)), status=status.HTTP_201_CREATED)


class BookingDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        b = services.book(request.user, request.data, booking_id=pk)
        return Response(booking_dict(_bookings().get(id=b.id)))


class BookingCancelView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        b = services.cancel_booking(pk, request.user, request.data.get('reason') or '', no_show=bool(request.data.get('no_show')))
        return Response(booking_dict(_bookings().get(id=b.id)))


class BookingCheckInView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        d = request.data
        v = services.check_in(pk, request.user, d.get('fee'), bool(d.get('fee_paid')), d.get('payment_mode') or '', d.get('receipt') or '')
        return Response(visit_dict(_qs().get(id=v.id), full=True), status=status.HTTP_201_CREATED)



def alert_dict(a):
    return {'id': str(a.id), 'kind': a.kind, 'priority': a.priority, 'location': a.location, 'patientName': a.patient_name,
            'uhid': a.patient.uhid if a.patient_id else None, 'age': a.age, 'gender': a.gender, 'condition': a.condition,
            'escalatedTo': a.escalated_to, 'automatic': a.automatic, 'status': a.status, 'raisedBy': _who(a.raised_by),
            'raisedAt': a.raised_at.isoformat(), 'attendedBy': _who(a.attended_by),
            'attendedAt': a.attended_at.isoformat() if a.attended_at else None, 'outcome': a.outcome,
            'visitNumber': a.visit.visit_number if a.visit_id else None}


class AlertListView(APIView):
    """Active alerts plus today's attended ones."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.db.models import Q
        from .models import OpdEmergencyAlert
        qs = OpdEmergencyAlert.objects.select_related('patient', 'visit', 'raised_by', 'attended_by').filter(
            Q(status='ACTIVE') | Q(raised_at__date=timezone.localdate()))
        return Response({'alerts': [alert_dict(a) for a in qs[:200]]})

    def post(self, request):
        a = services.raise_alert(request.user, request.data)
        return Response(alert_dict(a), status=status.HTTP_201_CREATED)


class AlertAttendView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        return Response(alert_dict(services.attend_alert(pk, request.user, request.data.get('outcome') or '')))



class ConfigView(APIView):
    """GET all OPD configuration documents; PUT /config/<kind>/ to publish one (OPD admin)."""
    permission_classes = [IsAuthenticated]

    def get(self, request, kind=None):
        from .models import OpdConfigDoc
        return Response({'docs': {d.kind: {'data': d.data, 'version': d.version, 'updatedBy': _who(d.updated_by), 'updatedAt': d.updated_at.isoformat()}
                                  for d in OpdConfigDoc.objects.select_related('updated_by')}})

    def put(self, request, kind=None):
        doc, changes = services.save_config(kind, request.data.get('data'), request.user)
        return Response({'kind': doc.kind, 'version': doc.version, 'changes': changes})


def block_dict(b):
    return {'id': str(b.id), 'doctor': f"Dr. {_who(b.doctor.user)}", 'staffRef': b.doctor.staff_ref, 'date': b.date.isoformat(), 'allDay': b.all_day,
            'from': b.from_slot or None, 'to': b.to_slot or None, 'reason': b.reason, 'by': _who(b.created_by), 'at': b.created_at.isoformat()}


class BlockListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .models import OpdDoctorBlock
        qs = OpdDoctorBlock.objects.select_related('doctor__user', 'created_by').filter(date__gte=timezone.localdate())
        return Response({'blocks': [block_dict(b) for b in qs]})

    def post(self, request):
        return Response(block_dict(services.add_block(request.user, request.data)), status=status.HTTP_201_CREATED)


class BlockDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        services.remove_block(pk, request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class DoctorStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .models import OpdDoctorStatus
        return Response({'statuses': [{'doctor': f"Dr. {_who(s.doctor.user)}", 'staffRef': s.doctor.staff_ref, 'status': s.status, 'until': s.until or None,
                                       'note': s.note or None, 'since': s.since.isoformat(), 'by': _who(s.set_by)}
                                      for s in OpdDoctorStatus.objects.select_related('doctor__user', 'set_by')]})

    def put(self, request):
        services.set_doctor_status(request.user, request.data)
        return self.get(request)


class AuditView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .models import OpdAdminAudit
        return Response({'entries': [{'id': str(a.id), 'at': a.at.isoformat(), 'by': _who(a.by), 'kind': a.kind, 'subject': a.subject,
                                      'change': a.change, 'before': a.before or None, 'after': a.after or None}
                                     for a in OpdAdminAudit.objects.select_related('by')[:500]]})

    def post(self, request):
        if request.user.role not in ('DEPARTMENT_ADMIN', 'HOSPITAL_ADMIN', 'SUPER_ADMIN') and not request.user.is_superuser:
            return Response({'detail': 'Only the OPD admin writes to the admin log.'}, status=status.HTTP_403_FORBIDDEN)
        d = request.data
        kind = str(d.get('kind') or 'LIVE').upper()[:10]
        services.audit(request.user, kind, d.get('subject') or '', d.get('change') or '', d.get('before') or '', d.get('after') or '')
        return Response({'saved': True}, status=status.HTTP_201_CREATED)
