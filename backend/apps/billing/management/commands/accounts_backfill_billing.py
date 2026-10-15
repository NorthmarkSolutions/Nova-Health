"""Post every settled Billing invoice and payment to Accounts that never reached it (payments taken before the
Billing -> Accounts bridge existed). Idempotent: anything already posted is skipped by its idempotency key.

    python manage.py accounts_backfill_billing            # dry run: what would be posted
    python manage.py accounts_backfill_billing --apply
"""
from collections import defaultdict
from django.core.management.base import BaseCommand
from django.db.models import Sum

from apps.accounting.models import FinancialEvent
from apps.billing.accounts_bridge import publish_invoice_settlement
from apps.billing.models import Invoice, Payment


class Command(BaseCommand):
    help = 'Backfill Billing invoices/payments into the Accounts ledger.'

    def add_arguments(self, parser):
        parser.add_argument('--apply', action='store_true')

    def handle(self, *args, **opts):
        posted = set(FinancialEvent.objects.filter(source_department='billing').values_list('idempotency_key', flat=True))
        todo = defaultdict(list)
        for p in Payment.objects.filter(payment_status='SUCCESS').select_related('invoice__patient'):
            if p.invoice and not any(k in posted for k in (f'billing.payment.collected:{p.payment_number}', f'billing.advance.adjusted:{p.payment_number}')):
                todo[p.invoice].append(p)
        total = sum(p.amount for ps in todo.values() for p in ps)
        self.stdout.write(f"{len(todo)} invoices / {sum(len(v) for v in todo.values())} payments not in Accounts ({total:,.2f})")
        if not opts['apply']:
            for inv, ps in todo.items():
                self.stdout.write(f"  {inv.invoice_number}  {inv.status:<15} {', '.join(f'{p.payment_number} {p.amount}' for p in ps)}")
            self.stdout.write('Dry run. Re-run with --apply to post.')
            return
        bad = 0
        for inv, ps in todo.items():
            for r in publish_invoice_settlement(inv, ps):
                if r.get('status') not in ('posted', 'duplicate_ignored'):
                    bad += 1
                    self.stdout.write(self.style.WARNING(f"  {inv.invoice_number}: {r.get('status')} {r.get('error', '')}"))
        self.stdout.write(self.style.SUCCESS(f"Posted. {bad} event(s) need attention."))
