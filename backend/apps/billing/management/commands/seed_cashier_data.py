from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.accounts.models import User, RoleType
from apps.patients.models import Patient
from apps.billing.models import (
    BillingCounter, CounterShift, ShiftStatus,
    Invoice, InvoiceItem, InvoiceCategory, InvoiceStatus,
    Payment, TenderMode, PatientDeposit, DepositStatus,
    BillableChargeItem, ChargeItemStatus, DepartmentChargeEvent
)
from apps.billing.services import BillingCoreService, CounterClosingService

class Command(BaseCommand):
    help = "Seed realistic data for Cashier Workspace, POS, and Shifts for all roles"

    def handle(self, *args, **kwargs):
        self.stdout.write("Seeding Billing & Accounts Users, Counters, Shifts, and Live Queues...")

        # 1. Billing & Accounts Users with Universal Password
        users_to_ensure = [
            {
                'username': 'billing_admin',
                'email': 'billing.admin@northhospital.com',
                'first_name': 'Anita',
                'last_name': 'Desai',
                'role': RoleType.BILLING_ADMIN,
                'is_staff': True,
            },
            {
                'username': 'billing_supervisor',
                'email': 'billing.supervisor@northhospital.com',
                'first_name': 'Vikramaditya',
                'last_name': 'Rao',
                'role': RoleType.BILLING_SUPERVISOR,
                'is_staff': True,
            },
            {
                'username': 'cashier',
                'email': 'cashier@northhospital.com',
                'first_name': 'Ritu',
                'last_name': 'Verma',
                'role': RoleType.CASHIER,
                'is_staff': True,
            },
            {
                'username': 'billing_tpa',
                'email': 'billing@northhospital.com',
                'first_name': 'David',
                'last_name': 'Miller',
                'role': RoleType.CASHIER,
                'is_staff': True,
            },
            {
                'username': 'accounts_admin',
                'email': 'accounts.admin@northhospital.com',
                'first_name': 'Kavita',
                'last_name': 'Sundaram',
                'role': RoleType.FINANCE_MANAGER,
                'is_staff': True,
            },
            {
                'username': 'internal_auditor',
                'email': 'auditor@northhospital.com',
                'first_name': 'Arun',
                'last_name': 'Mehta',
                'role': RoleType.INTERNAL_AUDITOR,
                'is_staff': True,
            },
        ]

        created_users = {}
        for u in users_to_ensure:
            usr, created = User.objects.get_or_create(
                email=u['email'],
                defaults={
                    'username': u['username'],
                    'first_name': u['first_name'],
                    'last_name': u['last_name'],
                    'role': u['role'],
                    'is_staff': u.get('is_staff', True),
                }
            )
            # Ensure attributes and password
            usr.role = u['role']
            usr.first_name = u['first_name']
            usr.last_name = u['last_name']
            usr.is_staff = True
            usr.set_password('Password123!')
            usr.save()
            created_users[u['email']] = usr
            self.stdout.write(f"  [+] Configured staff user: {usr.email} ({usr.role})")

        cashier_user = created_users['cashier@northhospital.com']
        tpa_user = created_users['billing@northhospital.com']

        # 2. Billing Counters
        counter_opd, _ = BillingCounter.objects.get_or_create(
            code='COUNTER-01',
            defaults={
                'name': 'Counter 1 - Main Lobby OPD',
                'station_location': 'OPD_LOBBY',
                'is_active': True
            }
        )
        counter_tpa, _ = BillingCounter.objects.get_or_create(
            code='COUNTER-02',
            defaults={
                'name': 'Counter 2 - IPD & TPA Insurance Desk',
                'station_location': 'IPD_DESK',
                'is_active': True
            }
        )
        self.stdout.write(f"  [+] Counters active: {counter_opd.code}, {counter_tpa.code}")

        # 3. Active Shifts for both Cashier and IPD/TPA
        shift_opd = CounterShift.objects.filter(counter=counter_opd, status=ShiftStatus.OPEN).first()
        if not shift_opd:
            shift_opd = CounterClosingService.open_shift(
                cashier=cashier_user,
                counter_code=counter_opd.code,
                opening_float=Decimal('5000.00')
            )
            self.stdout.write(f"  [+] Opened active shift on {counter_opd.code} for {cashier_user.first_name}")

        shift_tpa = CounterShift.objects.filter(counter=counter_tpa, status=ShiftStatus.OPEN).first()
        if not shift_tpa:
            shift_tpa = CounterClosingService.open_shift(
                cashier=tpa_user,
                counter_code=counter_tpa.code,
                opening_float=Decimal('3000.00')
            )
            self.stdout.write(f"  [+] Opened active shift on {counter_tpa.code} for {tpa_user.first_name}")

        # 4. Patients
        patients = list(Patient.objects.all()[:6])
        if len(patients) < 4:
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
            p3 = Patient.objects.create(
                first_name='Robert', last_name='Fox',
                gender='MALE', date_of_birth='1978-11-04',
                uhid='UHID-2026-IPD03', phone_number='9876500003'
            )
            p4 = Patient.objects.create(
                first_name='Meera', last_name='Iyer',
                gender='FEMALE', date_of_birth='1996-03-18',
                uhid='UHID-2026-TPA04', phone_number='9876500004'
            )
            patients = [p1, p2, p3, p4]

        p1 = patients[0]
        p2 = patients[1] if len(patients) > 1 else p1
        p3 = patients[2] if len(patients) > 2 else p1
        p4 = patients[3] if len(patients) > 3 else p2

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
                'cashier': cashier_user,
                'status': DepositStatus.ACTIVE,
                'notes': 'Advance deposit for OPD procedures'
            }
        )

        # 6. Seed Pending BillableChargeItems so Live Queue is POPULATED
        # Clear existing unlinked pending items to avoid duplicates
        BillableChargeItem.objects.filter(status=ChargeItemStatus.PENDING).delete()

        charges_data = [
            {
                'patient': p1,
                'department': 'OPD',
                'service_code': 'CONS-OPD-01',
                'service_name': 'Comprehensive Physician Consultation (Dr. Sarah Jenkins)',
                'unit_price': Decimal('800.00'),
                'quantity': 1,
                'total_amount': Decimal('800.00'),
                'priority': 'ROUTINE',
                'source_reference_id': 'APT-2026-0014',
                'meta': {'token_number': 14, 'doctor': 'Dr. Sarah Jenkins'}
            },
            {
                'patient': p1,
                'department': 'LAB',
                'service_code': 'LAB-CBC-01',
                'service_name': 'Complete Blood Count (CBC) with Automated Differential',
                'unit_price': Decimal('450.00'),
                'quantity': 1,
                'total_amount': Decimal('450.00'),
                'priority': 'STAT',
                'source_reference_id': 'LAB-ORD-9912',
                'meta': {'order_number': 'LAB-9912', 'stat': True}
            },
            {
                'patient': p2,
                'department': 'LAB',
                'service_code': 'LAB-LIPID-01',
                'service_name': 'Comprehensive Lipid Profile & Liver Panel',
                'unit_price': Decimal('1250.00'),
                'quantity': 1,
                'total_amount': Decimal('1250.00'),
                'priority': 'ROUTINE',
                'source_reference_id': 'LAB-ORD-9915',
                'meta': {'order_number': 'LAB-9915'}
            },
            {
                'patient': p2,
                'department': 'RADIOLOGY',
                'service_code': 'RAD-XRAY-01',
                'service_name': 'Chest X-Ray Digital PA View (High Resolution)',
                'unit_price': Decimal('750.00'),
                'quantity': 1,
                'total_amount': Decimal('750.00'),
                'priority': 'ROUTINE',
                'source_reference_id': 'RAD-ORD-4401',
                'meta': {'order_number': 'RAD-4401'}
            },
            {
                'patient': p3,
                'department': 'IPD',
                'service_code': 'IPD-BED-DELUXE',
                'service_name': 'Single Deluxe Room Bed Charges (Day 1)',
                'unit_price': Decimal('3500.00'),
                'quantity': 1,
                'total_amount': Decimal('3500.00'),
                'priority': 'ROUTINE',
                'source_reference_id': 'ADM-2026-0042',
                'meta': {'admission_number': 'ADM-2026-0042', 'ward': 'Ward 4B Room 412'}
            },
            {
                'patient': p3,
                'department': 'PHARMACY',
                'service_code': 'RX-DISP-01',
                'service_name': 'Inpatient Medication Kit & IV Infusion Fluids',
                'unit_price': Decimal('1450.00'),
                'quantity': 1,
                'total_amount': Decimal('1450.00'),
                'priority': 'ROUTINE',
                'source_reference_id': 'RX-2026-9910',
                'meta': {'order_number': 'RX-9910'}
            },
            {
                'patient': p4,
                'department': 'EMERGENCY',
                'service_code': 'EMG-CRIT-01',
                'service_name': 'Emergency Resuscitation & Trauma Observation',
                'unit_price': Decimal('2800.00'),
                'quantity': 1,
                'total_amount': Decimal('2800.00'),
                'priority': 'STAT',
                'source_reference_id': 'EMG-2026-0081',
                'meta': {'token_slip_number': 'EMG-STAT-081', 'stat': True}
            },
        ]

        for item in charges_data:
            meta = item.pop('meta', {})
            charge = BillableChargeItem.objects.create(
                patient=item['patient'],
                department=item['department'],
                service_code=item['service_code'],
                service_name=item['service_name'],
                unit_price=item['unit_price'],
                quantity=item['quantity'],
                total_amount=item['total_amount'],
                priority=item['priority'],
                status=ChargeItemStatus.PENDING,
                source_reference_id=item['source_reference_id']
            )
            DepartmentChargeEvent.objects.create(
                patient=item['patient'],
                source_department=item['department'],
                service_name=item['service_name'],
                quantity=item['quantity'],
                unit_price=item['unit_price'],
                total_amount=item['total_amount'],
                charge_item=charge,
                metadata=meta
            )

        self.stdout.write(f"  [+] Seeded {len(charges_data)} unbilled pending charges across OPD, LAB, RAD, IPD & EMG")

        # 7. Seed paid transactions for today's cashier shift collections
        inv_paid = BillingCoreService.create_invoice_from_charges(
            patient=p1,
            items=[
                {'service_code': 'PHARM-MEDS-01', 'description': 'Prescription Medicines Pack (OPD Dispense)', 'qty': 1, 'unit_price': 1250.00}
            ],
            category=InvoiceCategory.PHARMACY,
            cashier=cashier_user,
            counter=counter_opd,
            shift=shift_opd
        )
        BillingCoreService.process_multi_tender_payment(
            invoice_id=str(inv_paid.id),
            cashier=cashier_user,
            split_payments=[
                {'tender_mode': 'CASH', 'amount': 750.00},
                {'tender_mode': 'UPI', 'amount': 500.00, 'transaction_reference': 'UPI-REF-99887766'}
            ],
            counter=counter_opd,
            shift=shift_opd,
            notes='Settled at counter via split cash + UPI'
        )
        self.stdout.write("  [+] Seeded paid transaction in shift collections (Cash: Rs. 750, UPI: Rs. 500)")
        self.stdout.write(self.style.SUCCESS("All Cashier & Live Queue data successfully seeded!"))
