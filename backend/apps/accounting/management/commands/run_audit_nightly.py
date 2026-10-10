from datetime import datetime, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.accounting.exceptions import AccountingDomainError
from apps.accounting.services import AuditComplianceService


class Command(BaseCommand):
    help = "Nightly audit job: verify the hash chain, export yesterday's audit records (WORM) and run the control monitor (Phase 11)."

    def add_arguments(self, parser):
        parser.add_argument('--date', help='Export date YYYY-MM-DD (default: yesterday)')

    def handle(self, *args, **options):
        day = (datetime.strptime(options['date'], '%Y-%m-%d').date() if options.get('date')
               else timezone.now().date() - timedelta(days=1))
        chain = AuditComplianceService.run_chain_verification()
        self.stdout.write(f"Hash chain: {chain['status']} ({chain['total_records']} records)"
                          + (f" — {chain['error']} · {chain.get('violation_no')}" if not chain['valid'] else ''))
        try:
            export = AuditComplianceService.export_worm(day)
            self.stdout.write(f"WORM export {day}: {export['record_count']} records · sha256 {export['file_sha256'][:16]}…")
        except AccountingDomainError as exc:
            self.stdout.write(f"WORM export {day}: skipped ({exc.message})")
        monitor = AuditComplianceService.run_control_monitor()
        for c in monitor['controls']:
            self.stdout.write(f"{c['code']} {c['name']}: {c['checked']} checked · {c['findings']} findings · {c['new_violations']} new")
