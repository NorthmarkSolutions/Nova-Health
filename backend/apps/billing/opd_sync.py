"""OPD front desk → billing bridge.

The reception desk issues OPD tokens. Each token is mirrored as a server Appointment so the consultation charge
reaches the cashier queue; a fee the front desk already collected is recorded on the visit (never charged twice),
and a cancelled or no-show visit releases its pending charge.
"""
import re
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import DoctorProfile
from apps.patients.models import Patient
from .models import BillableChargeItem, ChargeItemStatus, InvoiceStatus

# Front-desk queue status → appointment status
STATUS_MAP = {
    'WAITING': 'WAITING', 'HOLD': 'WAITING', 'EMERGENCY': 'WAITING', 'IN_TRIAGE': 'WAITING',
    'TRIAGED': 'TRIAGED', 'READY_FOR_DOCTOR': 'TRIAGED',
    'IN_CONSULTATION': 'IN_CONSULTATION', 'COMPLETED': 'COMPLETED',
    'NO_SHOW': 'CANCELLED', 'CANCELLED': 'CANCELLED',
}
TYPE_MAP = {'WALK_IN': 'WALK_IN', 'SCHEDULED': 'ONLINE', 'ONLINE': 'ONLINE', 'FOLLOW_UP': 'FOLLOW_UP', 'EMERGENCY': 'EMERGENCY'}
GENDER_MAP = {'M': 'MALE', 'MALE': 'MALE', 'F': 'FEMALE', 'FEMALE': 'FEMALE'}


class OpdFrontDeskSyncService:

    @staticmethod
    def _doctor(label: str):
        """'Dr. Anil Menon (Cardiology)' → the matching DoctorProfile, or None when the desk names someone unknown."""
        name = re.sub(r'\(.*?\)', '', label or '').replace('Dr.', '').replace('Dr ', '').strip()
        if not name:
            return None
        parts = name.split()
        qs = DoctorProfile.objects.select_related('user')
        hit = qs.filter(user__first_name__iexact=parts[0], user__last_name__iexact=' '.join(parts[1:])).first() if len(parts) > 1 else None
        return hit or qs.filter(user__last_name__iexact=parts[-1]).first() or qs.filter(user__first_name__iexact=parts[0]).first()

    @staticmethod
    def _patient(token: dict):
        uhid = str(token.get('uhid') or '').strip()
        if not uhid:
            raise ValueError('Token has no UHID.')
        patient = Patient.objects.filter(uhid__iexact=uhid).first()
        if patient:
            return patient
        names = str(token.get('patient') or '').strip().split()
        if not names:
            raise ValueError(f'Patient {uhid} is not registered and the token has no name.')
        return Patient.objects.create(
            uhid=uhid, first_name=names[0], last_name=' '.join(names[1:]) or '-',
            date_of_birth='',  # the desk sends an age, not a date of birth — left blank rather than guessed
            gender=GENDER_MAP.get(str(token.get('gender') or '').upper(), 'OTHER'),
            phone_number=str(token.get('phone') or ''),
            blood_group=token.get('bloodGroup') or None,
        )

    @classmethod
    def sync_token(cls, token: dict, user=None) -> dict:
        from apps.appointments.models import Appointment
        from .services import DepartmentChargeIntegrationService

        ref = str(token.get('id') or token.get('aptNo') or '').strip()
        if not ref:
            raise ValueError('Token has no id.')
        today = timezone.localdate().isoformat()
        status = STATUS_MAP.get(str(token.get('status') or 'WAITING').upper(), 'WAITING')
        desk_paid = bool(token.get('feePaid'))
        with transaction.atomic():
            patient = cls._patient(token)
            apt = Appointment.objects.select_for_update().filter(source='FRONT_DESK', external_ref=ref).first()
            created = apt is None
            if created:
                apt = Appointment(
                    source='FRONT_DESK', external_ref=ref, patient=patient, doctor=cls._doctor(token.get('doctor', '')),
                    appointment_number=f"FD-{(token.get('aptNo') or ref)[-40:]}",
                    appointment_date=str(token.get('date') or today),
                    token_number=int(token.get('token') or 1),
                    type=TYPE_MAP.get(str(token.get('type') or '').upper(), 'WALK_IN'),
                )
                if Appointment.objects.filter(appointment_number=apt.appointment_number).exists():
                    apt.appointment_number = f"FD-{ref[-40:]}"
            if str(token.get('slot') or token.get('time') or ''):
                apt.slot_start_time = str(token.get('slot') or token.get('time'))[:20]
            apt.status = status
            apt.notes = f"Front desk · room {token.get('room') or '—'} · doctor {token.get('doctor') or '—'}"
            previous = apt.desk_payment or {}
            apt.desk_payment = {
                'paid': desk_paid,
                'quoted_fee': token.get('totalFee'),
                'mode': token.get('paymentMode') or '',
                'receipt': token.get('invoiceNo') or '',
            }
            if desk_paid and previous.get('reconciled'):
                # The supervisor already took this cash into billing; a re-sync from the desk never undoes that
                apt.desk_payment['reconciled'] = previous['reconciled']
            apt.save()

            pending = BillableChargeItem.objects.filter(department='OPD', source_reference_id=str(apt.id), status=ChargeItemStatus.PENDING)
            if status == 'CANCELLED' or desk_paid:
                # No-show releases the charge; a fee taken at the desk must never be collected again at the cashier
                released = pending.update(status=ChargeItemStatus.CANCELLED)
                charge_state = 'PAID_AT_DESK' if desk_paid else 'CANCELLED'
            else:
                DepartmentChargeIntegrationService.emit_opd_consultation_charge(apt)
                released = 0
                charge_state = 'TO_COLLECT'
        return {'appointment': apt.appointment_number, 'created': created, 'charge': charge_state, 'released': released}

    @classmethod
    def sync_tokens(cls, tokens: list, user=None) -> dict:
        results, errors = [], []
        for t in tokens or []:
            try:
                results.append(cls.sync_token(t, user=user))
            except Exception as exc:  # one bad token never blocks the rest of the queue
                errors.append({'token': (t or {}).get('id') or (t or {}).get('aptNo'), 'error': str(exc)})
        return {'synced': len(results), 'results': results, 'errors': errors}

    @staticmethod
    def visit_billing(apt) -> dict:
        """How this visit stands with the cashier."""
        desk = apt.desk_payment or {}
        charge = BillableChargeItem.objects.select_related('invoice').filter(department='OPD', source_reference_id=str(apt.id)).order_by('-created_at').first()
        if desk.get('paid'):
            return {'state': 'PAID_AT_DESK', 'amount': desk.get('quoted_fee'), 'invoice': desk.get('receipt') or '', 'mode': desk.get('mode') or '',
                    'reconciled': desk.get('reconciled') or None}
        if not charge:
            return {'state': 'NO_CHARGE', 'amount': None, 'invoice': '', 'mode': ''}
        amount = float(charge.total_amount)
        if charge.status == ChargeItemStatus.PENDING:
            return {'state': 'TO_COLLECT', 'amount': amount, 'invoice': '', 'mode': '', 'charge_id': str(charge.id)}
        if charge.status == ChargeItemStatus.CANCELLED:
            return {'state': 'CANCELLED', 'amount': amount, 'invoice': '', 'mode': ''}
        inv = charge.invoice
        if inv and inv.status == InvoiceStatus.PAID:
            return {'state': 'PAID', 'amount': amount, 'invoice': inv.invoice_number, 'mode': ''}
        if inv and inv.status == InvoiceStatus.DRAFT:
            return {'state': 'DRAFT', 'amount': amount, 'invoice': inv.invoice_number, 'mode': ''}
        return {'state': 'BILLED', 'amount': amount, 'invoice': inv.invoice_number if inv else '', 'mode': '', 'balance': float(inv.balance) if inv else None}

    @classmethod
    def list_visits(cls, date: str = None) -> dict:
        from apps.appointments.models import Appointment
        day = date or timezone.localdate().isoformat()
        rows = []
        qs = Appointment.objects.select_related('patient', 'doctor__user').filter(appointment_date=day).order_by('token_number', 'created_at')
        for apt in qs:
            p = apt.patient
            doc = apt.doctor
            rows.append({
                'id': str(apt.id),
                'appointment_number': apt.appointment_number,
                'token': apt.token_number,
                'source': apt.source,
                'type': apt.type,
                'status': apt.status,
                'slot': apt.slot_start_time,
                'patient_id': str(p.id), 'patient_name': f"{p.first_name} {p.last_name}".strip(), 'uhid': p.uhid, 'mobile': p.phone_number,
                'doctor': (f"Dr. {doc.user.get_full_name()}" if doc and doc.user else ''),
                'department': doc.department if doc else '',
                'quoted_fee': (apt.desk_payment or {}).get('quoted_fee'),
                'created_at': apt.created_at.isoformat(),
                'billing': cls.visit_billing(apt),
            })
        return {'date': day, 'visits': rows}

    @classmethod
    def reconcile_desk_cash(cls, appointment_ids: list, user, note: str = '') -> dict:
        """Billing supervisor confirms the fees the front desk collected were handed over to billing.

        Stamps each desk-paid visit once (who, when, note) and writes one audit event for the batch. Visits not paid at
        the desk, or already reconciled, are skipped and reported back.
        """
        from apps.appointments.models import Appointment
        from .models import AuditEventType, AuditSeverity
        from .services import SupervisorGovernanceService

        ids = [str(i) for i in (appointment_ids or []) if i][:500]
        if not ids:
            raise ValueError('Select at least one visit paid at the front desk.')
        name = (user.get_full_name() or user.username) if user else 'Supervisor'
        stamp = {'by': name, 'by_id': str(user.id) if user else '', 'at': timezone.localtime().isoformat(), 'note': (note or '').strip()[:200]}
        done, skipped, total, modes = [], [], 0.0, {}
        with transaction.atomic():
            for apt in Appointment.objects.select_for_update().filter(id__in=ids):
                desk = dict(apt.desk_payment or {})
                if not desk.get('paid') or desk.get('reconciled'):
                    skipped.append(apt.appointment_number)
                    continue
                desk['reconciled'] = stamp
                apt.desk_payment = desk
                apt.save(update_fields=['desk_payment'])
                try:
                    amount = float(desk.get('quoted_fee') or 0)
                except (TypeError, ValueError):
                    amount = 0.0
                total += amount
                mode = (desk.get('mode') or 'CASH').upper()
                modes[mode] = modes.get(mode, 0.0) + amount
                done.append(apt.appointment_number)
            if done:
                split = ' · '.join(f"{m.title()} {v:,.2f}" for m, v in sorted(modes.items()))
                SupervisorGovernanceService.audit(
                    AuditEventType.CASH_PICKUP, 'Front-desk OPD fees received',
                    f"{len(done)} visit(s) · {total:,.2f} ({split}){' · ' + stamp['note'] if stamp['note'] else ''}",
                    AuditSeverity.MEDIUM if total >= 10000 else AuditSeverity.LOW, user, reference=f"OPD-DESK-{timezone.localdate():%Y%m%d}",
                )
        return {'reconciled': done, 'skipped': skipped, 'total': round(total, 2), 'by_mode': {k: round(v, 2) for k, v in modes.items()}, 'stamp': stamp}
