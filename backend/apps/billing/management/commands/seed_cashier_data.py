from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.accounts.models import User, RoleType
from apps.patients.models import Patient
from apps.billing.models import (
    BillingCounter, CounterShift, ShiftStatus,
    Invoice, InvoiceItem, InvoiceCategory, InvoiceStatus,
    Payment, TenderMode, PatientDeposit, DepositStatus
)
from apps.billing.services import BillingCoreService, CounterClosingService

class Command(BaseCommand):
    help = "Seed realistic data for Cashier Workspace, POS, and Shifts"

    def handle(self, *args, **kwargs):
        self.stdout.write("Seeding Cashier Workspace & Shift data...")

        # 1. Cashier user
        cashier, created = User.objects.get_or_create(
            username='cashier',
            defaults={
                'email': 'cashier@northhospital.com',
                'first_name': 'Ritu',
                'last_name': 'Verma',
                'role': RoleType.CASHIER,
                'is_staff': True
            }
        )
        if created:
            cashier.set_password('Password123!')
            cashier.save()
            self.stdout.write(f"Created cashier user: {cashier.username}")

        # 2. Counters
        counter_opd, _ = BillingCounter.objects.get_or_create(
            code='COUNTER-01',
            defaults={
                'name': 'Counter 1 - Main Lobby OPD',
                'station_location': 'OPD_LOBBY',
                'is_active': True
            }
        )
        counter_emg, _ = BillingCounter.objects.get_or_create(
            code='COUNTER-02',
            defaults={
                'name': 'Counter 2 - Emergency Desk',
                'station_location': 'EMERGENCY',
                'is_active': True
            }
        )
        self.stdout.write(f"Counters ensured: {counter_opd.code}, {counter_emg.code}")

        # 3. Active Shift on COUNTER-01
        active_shift = CounterShift.objects.filter(counter=counter_opd, status=ShiftStatus.OPEN).first()
        if not active_shift:
            active_shift = CounterClosingService.open_shift(
                cashier=cashier,
                counter_code=counter_opd.code,
                opening_float=Decimal('5000.00')
            )
            self.stdout.write(f"Opened active shift on {counter_opd.code} with Rs. 5,000 opening float")
        else:
            self.stdout.write(f"Active shift already open: {active_shift.id}")

        # 4. Patients
        patients = list(Patient.objects.all()[:5])
        if not patients:
            p1 = Patient.objects.create(
                first_name='Aarav', last_name='Patel',
                gender='MALE', date_of_birth='1985-04-12',
                uhid='UHID-2026-OPD01', phone_number='9876500001'
            )
            p2 = Patient.objects.create(
                first_name='Sunita', last_name='Deshmukh',
                gender='FEMALE', date_of_birth='1992-09-25',
                uhid='UHID-2026-OPD02', phone_number='9876500002'
            )
            patients = [p1, p2]

        p1 = patients[0]
        p2 = patients[1] if len(patients) > 1 else p1

        # 5. Seed Patient Deposits
        dep1, _ = PatientDeposit.objects.get_or_create(
            deposit_number='DEP-2026-001',
            defaults={
                'patient': p1,
                'deposit_amount': Decimal('5000.00'),
                'utilized_amount': Decimal('0.00'),
                'available_balance': Decimal('5000.00'),
                'tender_mode': TenderMode.CASH,
                'counter': counter_opd,
                'cashier': cashier,
                'status': DepositStatus.ACTIVE,
                'notes': 'Advance deposit for OPD procedures'
            }
        )
        self.stdout.write(f"Patient deposit ready: {dep1.deposit_number} (Rs. {dep1.available_balance})")

        # 6. Seed Unbilled Invoices in Cashier Queue
        # Queue item 1: OPD Consultation
        inv1 = BillingCoreService.create_invoice_from_charges(
            patient=p1,
            items=[
                {'service_code': 'CARD-CONS-01', 'description': 'Cardiology Senior Consultant OPD Consultation', 'qty': 1, 'unit_price': 1000.00},
                {'service_code': 'CARD-ECG-01', 'description': '12-Lead Electrocardiogram (ECG)', 'qty': 1, 'unit_price': 500.00}
            ],
            category=InvoiceCategory.OPD,
            counter=counter_opd,
            shift=active_shift
        )

        # Queue item 2: Diagnostics Lab
        inv2 = BillingCoreService.create_invoice_from_charges(
            patient=p2,
            items=[
                {'service_code': 'LAB-CBC-01', 'description': 'Complete Blood Count (CBC) with ESR', 'qty': 1, 'unit_price': 450.00},
                {'service_code': 'LAB-LIPID-01', 'description': 'Comprehensive Lipid Profile', 'qty': 1, 'unit_price': 850.00},
                {'service_code': 'LAB-LFT-01', 'description': 'Liver Function Test (LFT)', 'qty': 1, 'unit_price': 650.00}
            ],
            category=InvoiceCategory.LAB,
            counter=counter_opd,
            shift=active_shift
        )

        # Queue item 3: Radiology
        if len(patients) > 2:
            p3 = patients[2]
            inv3 = BillingCoreService.create_invoice_from_charges(
                patient=p3,
                items=[
                    {'service_code': 'RAD-USG-01', 'description': 'Ultrasound Whole Abdomen & Pelvis', 'qty': 1, 'unit_price': 2200.00}
                ],
                category=InvoiceCategory.RADIOLOGY,
                counter=counter_opd,
                shift=active_shift
            )

        # Queue item 4: Emergency Care
        if len(patients) > 3:
            p4 = patients[3]
            inv4 = BillingCoreService.create_invoice_from_charges(
                patient=p4,
                items=[
                    {'service_code': 'EMG-TRIAGE-01', 'description': 'Emergency Triage & Critical Care Level 1', 'qty': 1, 'unit_price': 1500.00},
                    {'service_code': 'EMG-WOUND-01', 'description': 'Complex Wound Debridement & Suture', 'qty': 1, 'unit_price': 1200.00}
                ],
                category=InvoiceCategory.EMERGENCY,
                counter=counter_emg,
                shift=active_shift
            )

        # 7. Seed one already paid invoice to populate cashier shift collections
        inv_paid = BillingCoreService.create_invoice_from_charges(
            patient=p1,
            items=[
                {'service_code': 'PHARM-MEDS-01', 'description': 'Prescription Medicines Pack (OPD Dispense)', 'qty': 1, 'unit_price': 1250.00}
            ],
            category=InvoiceCategory.PHARMACY,
            cashier=cashier,
            counter=counter_opd,
            shift=active_shift
        )
        BillingCoreService.process_multi_tender_payment(
            invoice_id=str(inv_paid.id),
            cashier=cashier,
            split_payments=[
                {'tender_mode': 'CASH', 'amount': 750.00},
                {'tender_mode': 'UPI', 'amount': 500.00, 'transaction_reference': 'UPI-REF-99887766'}
            ],
            counter=counter_opd,
            shift=active_shift,
            notes='Settled at counter via split cash + UPI'
        )
        self.stdout.write("Seeded paid invoice with split tender (Cash: 750, UPI: 500)")

        self.stdout.write(self.style.SUCCESS("Successfully seeded Cashier Workspace & Shift data!"))
