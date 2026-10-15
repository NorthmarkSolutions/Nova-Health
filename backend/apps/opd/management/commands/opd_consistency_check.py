"""Cross-department consistency report for one day (plan §9). Prints each check and the offending records; exits with
an error when any check fails.

    python manage.py opd_consistency_check                 # today
    python manage.py opd_consistency_check --date 2026-10-15
"""
from collections import defaultdict
from datetime import date as date_cls
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db.models import Sum
from django.utils import timezone


class Command(BaseCommand):
    help = 'Check that OPD, Lab, Pharmacy, Billing and Accounts agree for a day.'

    def add_arguments(self, parser):
        parser.add_argument('--date', default=None)

    def handle(self, *args, **opts):
        day = date_cls.fromisoformat(opts['date']) if opts['date'] else timezone.localdate()
        self.failed = 0
        self.stdout.write(f'\nOPD consistency check · {day}\n')
        self.check_clinical(day)
        self.check_charges(day)
        self.check_money(day)
        self.check_revenue(day)
        self.check_gates(day)
        self.check_audit(day)
        if self.failed:
            raise CommandError(f'{self.failed} check(s) failed')
        self.stdout.write(self.style.SUCCESS('\nAll checks passed'))

    def report(self, name, problems, ok_note=''):
        if problems:
            self.failed += 1
            self.stdout.write(self.style.ERROR(f'  FAIL  {name}'))
            for p in problems[:20]:
                self.stdout.write(f'          - {p}')
            if len(problems) > 20:
                self.stdout.write(f'          … {len(problems) - 20} more')
        else:
            self.stdout.write(self.style.SUCCESS(f'  PASS  {name}') + (f'  — {ok_note}' if ok_note else ''))

    # 1
    def check_clinical(self, day):
        from apps.opd.models import OpdVisit
        from apps.clinical.models import Prescription
        visits = OpdVisit.objects.filter(visit_date=day, status__in=['COMPLETED', 'CHECKED_OUT'])
        missing = [v.visit_number for v in visits if not hasattr(v, 'consultation')]
        self.report('every completed visit has a consultation', missing, f'{visits.count()} completed')
        rx = Prescription.objects.filter(visit__visit_date=day)
        no_order = [r.prescription_number for r in rx if r.items.filter(is_clinic_dose=False).exists() and not r.dispense_orders.exists()]
        self.report('every prescription with take-home items has a pharmacy order', no_order, f'{rx.count()} prescriptions')

    # 2
    def check_charges(self, day):
        from apps.billing.models import BillableChargeItem
        from apps.opd.models import OpdVisit
        from apps.lab.models import LabOrder
        problems = []
        charges = BillableChargeItem.objects.filter(created_at__date=day)
        for ch in charges.filter(status='INVOICED'):
            if not ch.invoice_id:
                problems.append(f'{ch.service_code} {ch.total_amount} marked invoiced without an invoice')
        apt_ids = set(str(a) for a in OpdVisit.objects.filter(visit_date=day).values_list('appointment_id', flat=True) if a)
        for ch in charges.filter(department='OPD', service_code__startswith='DOC-'):
            if ch.source_reference_id not in apt_ids:
                problems.append(f'consultation charge {ch.id} is not on an OPD visit')
        visit_ids = set(str(v) for v in OpdVisit.objects.filter(visit_date=day).values_list('id', flat=True))
        for o in LabOrder.objects.filter(ordered_at__date=day).exclude(status='CANCELLED'):
            if not BillableChargeItem.objects.filter(source_reference_id__in=[str(o.id), o.order_number]).exists():
                problems.append(f'lab order {o.order_number} has no charge')
            if o.encounter_id and o.encounter_id not in visit_ids and not OpdVisit.objects.filter(id=o.encounter_id).exists():
                problems.append(f'lab order {o.order_number} points to a missing visit {o.encounter_id}')
        self.report('every charge is invoiced properly and traces to its visit / order', problems, f'{charges.count()} charges')

    # 3
    def check_money(self, day):
        from apps.accounting.services import DailyCloseService
        rec = DailyCloseService.billing_reconciliation(day)
        bad = [] if rec['difference'] == 0 else [f"Billing collected {rec['billing_collected']} but Accounts posted {rec['accounts_posted']}"]
        self.report('Billing payments = Accounts receipts', bad, f"{rec['billing_collected']} both sides"
                    + (f" · front desk {rec['front_desk_posted']}" if rec['front_desk_posted'] else ''))

    # 4
    def check_revenue(self, day):
        from apps.billing.models import Invoice
        from apps.accounting.models import FinancialEvent
        billing, accounts = defaultdict(Decimal), defaultdict(Decimal)
        posted = set(FinancialEvent.objects.filter(event_type='billing.invoice.created', source_department='billing', status='posted')
                     .values_list('source_reference', flat=True))
        for inv in Invoice.objects.filter(created_at__date=day).exclude(status__in=['DRAFT', 'CANCELLED']):
            if inv.paid > 0 or inv.invoice_number in posted:
                billing[inv.category] += inv.total
        for e in FinancialEvent.objects.filter(event_type='billing.invoice.created', source_department='billing', status='posted', business_date=day):
            accounts[(e.payload or {}).get('category') or 'OPD'] += e.amount
        bad = [f'{cat}: Billing {billing[cat]} vs Accounts {accounts[cat]}' for cat in set(billing) | set(accounts) if billing[cat] != accounts[cat]]
        self.report('revenue by department: Accounts = Billing', bad, ' · '.join(f'{k} {v}' for k, v in sorted(billing.items())) or 'no revenue')

    # 5
    def check_gates(self, day):
        from apps.lab.models import LabOrder
        from apps.billing.models import BillableChargeItem, Payment
        from apps.pharmacy.models import PharmacyDispenseOrder
        problems = []
        for o in LabOrder.objects.filter(collected_at__date=day):
            ch = BillableChargeItem.objects.filter(source_reference_id__in=[str(o.id), o.order_number]).select_related('invoice').first()
            paid_at = Payment.objects.filter(invoice=ch.invoice).order_by('payment_date').values_list('payment_date', flat=True).first() if ch and ch.invoice_id else None
            if not paid_at or paid_at > o.collected_at:
                problems.append(f'lab sample {o.order_number} collected before its charge was paid')
        for d in PharmacyDispenseOrder.objects.filter(dispensed_at__date=day, settlement_mode='PAY_AT_PHARMACY'):
            if d.payment_status != 'PAID':
                problems.append(f'{d.order_number} dispensed at the pharmacy counter without payment')
        self.report('no sample collected or counter dispense while unpaid', problems)

    # 6
    def check_audit(self, day):
        from apps.opd.models import OpdVisit
        from apps.clinical.models import Consultation
        problems = []
        for v in OpdVisit.objects.filter(visit_date=day):
            status_events = [e for e in v.events.all() if e.to_status]
            if not status_events or status_events[-1].to_status != v.status:
                problems.append(f'{v.visit_number} is {v.status} but its last recorded change says {status_events[-1].to_status if status_events else "nothing"}')
        for c in Consultation.objects.filter(visit__visit_date=day, performed_by__role='DOCTOR_ASSISTANT', on_behalf_of__isnull=True):
            problems.append(f'consultation for {c.visit.visit_number} entered by an assistant without on-behalf-of')
        self.report('every status change logged; every assistant action on behalf of a doctor', problems)
