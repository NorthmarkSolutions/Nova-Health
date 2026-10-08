import logging
from django.db.models.signals import post_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)

@receiver(post_save, sender='accounts.DoctorProfile')
def sync_doctor_tariff_signal(sender, instance, **kwargs):
    """
    Auto-syncs Doctor consultation fees to TariffMaster whenever
    a DoctorProfile is created or updated.
    """
    try:
        from apps.billing.services import DepartmentTariffSyncService
        DepartmentTariffSyncService.sync_doctor_tariff(instance)
    except Exception as exc:
        logger.warning("Failed to auto-sync DoctorProfile tariff: %s", exc)

@receiver(post_save, sender='lab.LabTest')
def sync_lab_test_tariff_signal(sender, instance, **kwargs):
    """
    Auto-syncs Laboratory diagnostic test prices to TariffMaster
    whenever a LabTest is created or updated.
    """
    try:
        from apps.billing.services import DepartmentTariffSyncService
        DepartmentTariffSyncService.sync_lab_test_tariff(instance)
    except Exception as exc:
        logger.warning("Failed to auto-sync LabTest tariff: %s", exc)

@receiver(post_save, sender='pharmacy.PharmacyMedicine')
def sync_pharmacy_medicine_tariff_signal(sender, instance, **kwargs):
    """
    Auto-syncs Pharmacy formulary medicine prices to TariffMaster
    whenever a PharmacyMedicine is created or updated.
    """
    try:
        from apps.billing.services import DepartmentTariffSyncService
        DepartmentTariffSyncService.sync_pharmacy_medicine_tariff(instance)
    except Exception as exc:
        logger.warning("Failed to auto-sync PharmacyMedicine tariff: %s", exc)
