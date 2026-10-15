"""Billing -> Accounts bridge.

Every settled cashier invoice and every payment is handed to the Accounts
event inbox (apps.accounting EventInboxService) so the Accounts ledger, day
close and receivables see the same money Billing collected. Events are
idempotent (keyed on invoice / payment number), so replays are harmless.
"""
import logging
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)

TENDER_TO_MODE = {'CASH': 'cash', 'CARD': 'card', 'UPI': 'upi'}


def _send(event: dict) -> dict:
    from apps.accounting.services import EventInboxService
    try:
        with transaction.atomic():
            return EventInboxService.process_incoming_event(event)
    except Exception as exc:  # Accounts must never block the cashier
        logger.exception('Accounts bridge failed for %s', event.get('idempotency_key'))
        return {'status': 'bridge_error', 'error': str(exc)}


def publish_invoice_settlement(invoice, payments) -> list:
    """Publish billing.invoice.created (once per invoice) and one event per payment."""
    if not invoice or invoice.total <= Decimal('0.00'):
        return []
    patient = getattr(invoice, 'patient', None)
    created = getattr(invoice, 'created_at', None)
    common = {
        'source_department': 'billing',
        'business_date': (timezone.localdate(created) if created else timezone.localdate()).isoformat(),
        'correlation_id': invoice.invoice_number,
        'party_type': 'patient',
        'party_id': getattr(patient, 'uhid', '') or '',
    }
    results = [_send({
        **common,
        'event_type': 'billing.invoice.created',
        'idempotency_key': f'billing.invoice.created:{invoice.invoice_number}',
        'source_reference': invoice.invoice_number,
        'amount': str(invoice.total),
        'tax_amount': str(invoice.tax or Decimal('0.00')),
        'payload': {
            'invoice_no': invoice.invoice_number,
            'category': invoice.category,
            'encounter_type': invoice.encounter_type,
            'payment_type': 'cash',
        },
    })]
    for p in payments or []:
        tender = (p.tender_mode or p.payment_method or 'CASH').upper()
        if tender == 'DEPOSIT_DEDUCTION':
            event_type, mode = 'billing.advance.adjusted', 'deposit'
        else:
            event_type, mode = 'billing.payment.collected', TENDER_TO_MODE.get(tender, 'bank')
        paid_on = getattr(p, 'payment_date', None)
        results.append(_send({
            **common,
            'business_date': (timezone.localdate(paid_on) if paid_on else timezone.localdate()).isoformat(),
            'event_type': event_type,
            'idempotency_key': f'{event_type}:{p.payment_number}',
            'source_reference': invoice.invoice_number,
            'amount': str(p.amount),
            'payload': {
                'invoice_no': invoice.invoice_number,
                'payment_no': p.payment_number,
                'receipt_no': p.payment_number,
                'payment_mode': mode,
            },
        }))
    return results


def publish_desk_fee(visit, mode: str = '', receipt: str = '') -> list:
    """A consultation fee taken at the reception desk: same invoice + receipt pair in Accounts, keyed on the visit so
    a re-sync never posts it twice. (The desk never raises a Billing invoice for it, so this is the only posting.)"""
    amount = Decimal(str(visit.fee_amount or 0))
    if amount <= Decimal('0.00'):
        return []
    ref = visit.visit_number
    patient = visit.patient
    common = {
        'source_department': 'opd',
        'business_date': visit.visit_date.isoformat(),
        'correlation_id': ref,
        'party_type': 'patient',
        'party_id': getattr(patient, 'uhid', '') or '',
    }
    return [
        _send({**common, 'event_type': 'billing.invoice.created',
               'idempotency_key': f'billing.invoice.created:desk:{ref}', 'source_reference': ref,
               'amount': str(amount), 'tax_amount': '0',
               'payload': {'invoice_no': receipt or ref, 'category': 'OPD', 'encounter_type': 'OPD',
                           'encounter_id': str(visit.id), 'payment_type': 'cash', 'collected_at': 'front_desk'}}),
        _send({**common, 'event_type': 'billing.payment.collected',
               'idempotency_key': f'billing.payment.collected:desk:{ref}', 'source_reference': ref,
               'amount': str(amount),
               'payload': {'invoice_no': receipt or ref, 'receipt_no': receipt or f'DESK-{ref}',
                           'payment_mode': TENDER_TO_MODE.get((mode or 'CASH').upper(), 'bank'),
                           'encounter_id': str(visit.id), 'collected_at': 'front_desk'}}),
    ]


def publish_desk_refund(review, stage: str) -> dict:
    """Refund of a front-desk OPD fee after the supervisor's decision. stage = 'requested' (Accounts approval queue)
    or 'paid' (money handed back)."""
    visit = review.visit
    patient = visit.patient
    event_type = f'billing.refund.{stage}'
    return _send({
        'event_type': event_type, 'source_department': 'opd',
        'idempotency_key': f'{event_type}:desk:{visit.visit_number}',
        'business_date': timezone.localdate().isoformat(), 'correlation_id': visit.visit_number,
        'source_reference': visit.visit_number, 'amount': str(review.amount), 'party_type': 'patient',
        'party_id': patient.uhid,
        'payload': {'patient_uhid': patient.uhid, 'patient_name': f'{patient.first_name} {patient.last_name}'.strip(),
                    'source_bill_no': visit.visit_number, 'refund_mode': (review.refund_mode or 'cash').lower(),
                    'reason': f'OPD {review.outcome.lower().replace("_", "-")} · {review.get_reason_display()} · {review.note}'.strip(' ·'),
                    'encounter_id': str(visit.id)},
    })
