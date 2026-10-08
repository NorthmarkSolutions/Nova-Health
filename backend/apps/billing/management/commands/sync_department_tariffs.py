from django.core.management.base import BaseCommand
from apps.billing.services import DepartmentTariffSyncService

class Command(BaseCommand):
    help = 'Synchronizes Doctor consultation fees (OPD), Lab test prices (LAB), and Pharmacy medicine prices (PHARMACY) into TariffMaster.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Starting bulk synchronization of department tariffs...'))
        res = DepartmentTariffSyncService.bulk_sync_all()
        self.stdout.write(self.style.SUCCESS(
            f"Successfully synchronized:\n"
            f"  - OPD Doctors: {res['opd_synced']}\n"
            f"  - Lab Tests: {res['lab_synced']}\n"
            f"  - Pharmacy Medicines: {res['pharmacy_synced']}\n"
            f"  Total Services Synced: {res['total_synced']}"
        ))
