from datetime import datetime, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.accounting.services import LabIntegrationService


class Command(BaseCommand):
    help = "Nightly Lab/Radiology job: batch outsourced-test accruals and refresh service-line volumes (Phase 10)."

    def add_arguments(self, parser):
        parser.add_argument('--date', help='Business date YYYY-MM-DD (default: yesterday)')

    def handle(self, *args, **options):
        day = (datetime.strptime(options['date'], '%Y-%m-%d').date() if options.get('date')
               else timezone.now().date() - timedelta(days=1))
        batch = LabIntegrationService.post_daily_accrual_batch(day)
        self.stdout.write(f"Accrual batch {day}: {batch['status']} ({batch['count']} requisitions)")
        feed = LabIntegrationService.run_nightly_service_line_feed(day)
        self.stdout.write(f"Service-line feed {day}: {len(feed['lines'])} lines, metrics period {feed['metric_period']}")
