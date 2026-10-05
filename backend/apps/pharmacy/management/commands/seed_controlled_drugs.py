from datetime import date, timedelta
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.accounts.models import User, RoleType
from apps.patients.models import Patient
from apps.pharmacy.models import (
    PharmacyMedicine,
    PharmacySupplier,
    PharmacyBatch,
    PharmacyControlledDrugRegister,
    PharmacyVaultReconciliation,
    PharmacyStockTransaction,
    MedicineCategory,
    StockTransactionType,
)


class Command(BaseCommand):
    help = 'Seeds Schedule X & Narcotic Controlled Drug Formulary, Vault Stock, Register Entries & Audits.'

    def handle(self, *args, **options):
        self.stdout.write("Seeding Controlled Drug & Narcotic System records...")

        # 1. Staff Users
        pharmacist_arjun, _ = User.objects.get_or_create(
            username='arjun_varma',
            defaults={
                'first_name': 'Arjun',
                'last_name': 'Varma',
                'role': RoleType.PHARMACIST,
                'email': 'arjun.varma@northhospital.com'
            }
        )
        if not pharmacist_arjun.check_password('Password123!'):
            pharmacist_arjun.set_password('Password123!')
            pharmacist_arjun.save()

        pharmacist_sneha, _ = User.objects.get_or_create(
            username='sneha_nair',
            defaults={
                'first_name': 'Sneha',
                'last_name': 'Nair',
                'role': RoleType.PHARMACIST,
                'email': 'sneha.nair@northhospital.com'
            }
        )
        if not pharmacist_sneha.check_password('Password123!'):
            pharmacist_sneha.set_password('Password123!')
            pharmacist_sneha.save()

        nurse_priya, _ = User.objects.get_or_create(
            username='nurse_priya',
            defaults={
                'first_name': 'Priya',
                'last_name': 'Sharma',
                'role': RoleType.NURSE,
                'email': 'priya.sharma@northhospital.com'
            }
        )
        if not nurse_priya.check_password('Password123!'):
            nurse_priya.set_password('Password123!')
            nurse_priya.save()

        nurse_maria, _ = User.objects.get_or_create(
            username='nurse',
            defaults={
                'first_name': 'Maria',
                'last_name': 'Nurse',
                'role': RoleType.NURSE,
                'email': 'nurse@northhospital.com'
            }
        )
        if not nurse_maria.check_password('Password123!'):
            nurse_maria.set_password('Password123!')
            nurse_maria.save()

        # 2. Supplier
        supplier, _ = PharmacySupplier.objects.get_or_create(
            supplier_code='SUP-NC-NARCOTIC',
            defaults={
                'name': 'Narcotics Control Depot & Government Opium Factory',
                'category': 'Controlled drugs',
                'phone': '+911123456789',
                'email': 'narcotics.depot@gov.in',
                'drug_license_number': 'NDPS-CENTRAL-MANUF-001'
            }
        )

        # 3. Controlled Medicines
        meds_data = [
            {
                'item_code': 'MED-CD-MOR10',
                'name': 'Morphine Sulfate 10mg/mL Injection',
                'generic_name': 'Morphine Sulfate',
                'category': MedicineCategory.INJECTION,
                'strength': '10mg/mL (1mL ampoule)',
                'unit_of_measure': 'AMPOULE',
                'unit_price': Decimal('32.50'),
                'cost_price': Decimal('16.00'),
                'reorder_level': 15,
                'is_narcotic': True,
                'schedule': 'Schedule X',
                'batches': [
                    {'batch_number': 'MOR-VLT-901', 'qty': 28, 'loc': 'Vault Safe A (Dual Key Locked)'},
                    {'batch_number': 'MOR-VLT-902', 'qty': 50, 'loc': 'Vault Safe A (Dual Key Locked)'},
                ]
            },
            {
                'item_code': 'MED-CD-FEN50',
                'name': 'Fentanyl Citrate 50mcg/mL Ampoule',
                'generic_name': 'Fentanyl Citrate',
                'category': MedicineCategory.INJECTION,
                'strength': '50mcg/mL (2mL ampoule)',
                'unit_of_measure': 'AMPOULE',
                'unit_price': Decimal('85.00'),
                'cost_price': Decimal('42.00'),
                'reorder_level': 20,
                'is_narcotic': True,
                'schedule': 'Schedule X',
                'batches': [
                    {'batch_number': 'FEN-VLT-881', 'qty': 24, 'loc': 'Vault Safe A (Dual Key Locked)'},
                ]
            },
            {
                'item_code': 'MED-CD-KET50',
                'name': 'Ketamine Hydrochloride 50mg/mL Vial',
                'generic_name': 'Ketamine HCl',
                'category': MedicineCategory.INJECTION,
                'strength': '50mg/mL (10mL vial)',
                'unit_of_measure': 'VIAL',
                'unit_price': Decimal('145.00'),
                'cost_price': Decimal('75.00'),
                'reorder_level': 10,
                'is_narcotic': True,
                'schedule': 'Schedule X',
                'batches': [
                    {'batch_number': 'KET-VLT-771', 'qty': 18, 'loc': 'Vault Safe A (Dual Key Locked)'},
                ]
            },
            {
                'item_code': 'MED-CD-MID05',
                'name': 'Midazolam 5mg/mL Injection',
                'generic_name': 'Midazolam Hydrochloride',
                'category': MedicineCategory.INJECTION,
                'strength': '5mg/mL (1mL ampoule)',
                'unit_of_measure': 'AMPOULE',
                'unit_price': Decimal('42.00'),
                'cost_price': Decimal('21.00'),
                'reorder_level': 25,
                'is_narcotic': False,
                'schedule': 'Schedule H1',
                'batches': [
                    {'batch_number': 'MID-BIO-441', 'qty': 65, 'loc': 'Vault Safe B (Bio-Secure Shelf)'},
                ]
            },
            {
                'item_code': 'MED-CD-ALP05',
                'name': 'Alprazolam 0.5mg Strip',
                'generic_name': 'Alprazolam',
                'category': MedicineCategory.TABLET,
                'strength': '0.5mg',
                'unit_of_measure': 'STRIP',
                'unit_price': Decimal('28.00'),
                'cost_price': Decimal('12.00'),
                'reorder_level': 30,
                'is_narcotic': False,
                'schedule': 'Schedule H1',
                'batches': [
                    {'batch_number': 'ALP-BIO-332', 'qty': 120, 'loc': 'Vault Safe B (Bio-Secure Shelf)'},
                ]
            },
            {
                'item_code': 'MED-CD-CLO02',
                'name': 'Clonazepam 2mg Tablet',
                'generic_name': 'Clonazepam',
                'category': MedicineCategory.TABLET,
                'strength': '2mg',
                'unit_of_measure': 'TABLET',
                'unit_price': Decimal('15.50'),
                'cost_price': Decimal('7.00'),
                'reorder_level': 20,
                'is_narcotic': False,
                'schedule': 'Schedule H1',
                'batches': [
                    {'batch_number': 'CLO-BIO-221', 'qty': 85, 'loc': 'Vault Safe B (Bio-Secure Shelf)'},
                ]
            },
            {
                'item_code': 'MED-CD-TRM50',
                'name': 'Tramadol Hydrochloride 50mg Capsule',
                'generic_name': 'Tramadol HCl',
                'category': MedicineCategory.CAPSULE,
                'strength': '50mg',
                'unit_of_measure': 'CAPSULE',
                'unit_price': Decimal('18.00'),
                'cost_price': Decimal('8.50'),
                'reorder_level': 40,
                'is_narcotic': False,
                'schedule': 'Schedule H1',
                'batches': [
                    {'batch_number': 'TRM-BIO-119', 'qty': 150, 'loc': 'Vault Safe B (Bio-Secure Shelf)'},
                ]
            },
        ]

        created_meds = {}
        created_batches = {}

        for mdata in meds_data:
            batches_info = mdata.pop('batches')
            med, _ = PharmacyMedicine.objects.update_or_create(
                item_code=mdata['item_code'],
                defaults={
                    'name': mdata['name'],
                    'generic_name': mdata['generic_name'],
                    'category': mdata['category'],
                    'strength': mdata['strength'],
                    'unit_of_measure': mdata['unit_of_measure'],
                    'unit_price': mdata['unit_price'],
                    'cost_price': mdata['cost_price'],
                    'reorder_level': mdata['reorder_level'],
                    'reorder_quantity': mdata['reorder_level'] * 3,
                    'requires_prescription': True,
                    'is_high_risk': True,
                    'is_narcotic': mdata['is_narcotic'],
                    'schedule': mdata['schedule'],
                    'default_supplier': supplier,
                    'is_active': True,
                }
            )
            created_meds[med.item_code] = med

            for binfo in batches_info:
                batch, _ = PharmacyBatch.objects.update_or_create(
                    medicine=med,
                    batch_number=binfo['batch_number'],
                    defaults={
                        'supplier': supplier,
                        'manufacturing_date': date.today() - timedelta(days=90),
                        'expiry_date': date.today() + timedelta(days=600),
                        'initial_quantity': binfo['qty'] + 20,
                        'available_quantity': binfo['qty'],
                        'cost_price': med.cost_price,
                        'mrp_price': med.unit_price,
                        'storage_location': binfo['loc'],
                        'received_by': pharmacist_arjun
                    }
                )
                created_batches[batch.batch_number] = batch

        # 4. Patients
        p1, _ = Patient.objects.get_or_create(
            uhid='UHID-202601-00087',
            defaults={
                'first_name': 'Imran',
                'last_name': 'Qureshi',
                'gender': 'MALE',
                'phone_number': '+919876500087',
                'date_of_birth': '1982-04-15',
            }
        )
        p2, _ = Patient.objects.get_or_create(
            uhid='UHID-202601-00042',
            defaults={
                'first_name': 'Maya',
                'last_name': 'Rao',
                'gender': 'FEMALE',
                'phone_number': '+919876500042',
                'date_of_birth': '1975-11-23',
            }
        )
        p3, _ = Patient.objects.get_or_create(
            uhid='UHID-202601-00015',
            defaults={
                'first_name': 'Robert',
                'last_name': 'Patient',
                'gender': 'MALE',
                'phone_number': '+919876500015',
                'date_of_birth': '1968-08-10',
            }
        )

        # 5. Statutory Controlled Drug Register Entries (Continuous non-gapped sequence)
        entries_data = [
            {
                'entry_number': 'CDR-2610-0001',
                'med_code': 'MED-CD-MOR10',
                'batch_no': 'MOR-VLT-901',
                'patient': p3,
                'doctor': 'Dr. Elena Morgan',
                'license': 'KMC 48211/2014',
                'rx_number': 'RX-ICU-8821',
                'qty': 2,
                'bal': 28,
                'primary': pharmacist_arjun,
                'witness': nurse_priya,
                'witness_role': 'ICU Charge Staff Nurse (Priya Sharma)',
                'remarks': 'Post-thoracotomy analgesia protocol · physical Rx sighted & patient wristband verified',
                'loc': 'Vault Safe A (Dual Key Locked)',
                'days_ago': 2,
            },
            {
                'entry_number': 'CDR-2610-0002',
                'med_code': 'MED-CD-FEN50',
                'batch_no': 'FEN-VLT-881',
                'patient': p1,
                'doctor': 'Dr. Kevin Vance',
                'license': 'MCI-ANES-44120',
                'rx_number': 'RX-OT-1049',
                'qty': 4,
                'bal': 24,
                'primary': pharmacist_sneha,
                'witness': nurse_maria,
                'witness_role': 'OT Head Nurse (Maria Nurse)',
                'remarks': 'Intra-operative cardiac bypass anesthesia · dual lock vault key released by shift incharge',
                'loc': 'Vault Safe A (Dual Key Locked)',
                'days_ago': 2,
            },
            {
                'entry_number': 'CDR-2610-0003',
                'med_code': 'MED-CD-KET50',
                'batch_no': 'KET-VLT-771',
                'patient': p2,
                'doctor': 'Dr. Sarah Jenkins',
                'license': 'KMC 31849/2016',
                'rx_number': 'RX-EMRG-0912',
                'qty': 1,
                'bal': 18,
                'primary': pharmacist_arjun,
                'witness': nurse_priya,
                'witness_role': 'Emergency Staff Nurse (Priya Sharma)',
                'remarks': 'Procedural sedation for complex polytrauma reduction · verbal stat confirmed in writing',
                'loc': 'Vault Safe A (Dual Key Locked)',
                'days_ago': 1,
            },
            {
                'entry_number': 'CDR-2610-0004',
                'med_code': 'MED-CD-MID05',
                'batch_no': 'MID-BIO-441',
                'patient': p3,
                'doctor': 'Dr. Arthur Vance',
                'license': 'KMC 99182/2011',
                'rx_number': 'RX-CCU-4412',
                'qty': 2,
                'bal': 65,
                'primary': pharmacist_sneha,
                'witness': nurse_maria,
                'witness_role': 'CCU Telemetry Nurse (Maria Nurse)',
                'remarks': 'Pre-cardioversion sedation · patient identity bracelet scanned',
                'loc': 'Vault Safe B (Bio-Secure Shelf)',
                'days_ago': 1,
            },
            {
                'entry_number': 'CDR-2610-0005',
                'med_code': 'MED-CD-ALP05',
                'batch_no': 'ALP-BIO-332',
                'patient': p1,
                'doctor': 'Dr. Sarah Jenkins',
                'license': 'KMC 31849/2016',
                'rx_number': 'RX-OPD-7721',
                'qty': 10,
                'bal': 120,
                'primary': pharmacist_arjun,
                'witness': pharmacist_sneha,
                'witness_role': 'Senior Clinical Pharmacist (Sneha Nair)',
                'remarks': 'Dispensed with statutory addiction warning counseling · Schedule H1 register countersigned',
                'loc': 'Vault Safe B (Bio-Secure Shelf)',
                'days_ago': 0,
            },
            {
                'entry_number': 'CDR-2610-0006',
                'med_code': 'MED-CD-TRM50',
                'batch_no': 'TRM-BIO-119',
                'patient': p2,
                'doctor': 'Dr. Kevin Vance',
                'license': 'MCI-ANES-44120',
                'rx_number': 'RX-OPD-9104',
                'qty': 10,
                'bal': 150,
                'primary': pharmacist_sneha,
                'witness': nurse_priya,
                'witness_role': 'OPD Triage Staff Nurse (Priya Sharma)',
                'remarks': 'Post-operative orthopedic analgesia course · photo ID verified at dispensing counter',
                'loc': 'Vault Safe B (Bio-Secure Shelf)',
                'days_ago': 0,
            },
        ]

        for ed in entries_data:
            med = created_meds[ed['med_code']]
            batch = created_batches[ed['batch_no']]
            created_time = timezone.now() - timedelta(days=ed['days_ago'], hours=ed.get('qty', 1) * 2)

            reg, created = PharmacyControlledDrugRegister.objects.update_or_create(
                entry_number=ed['entry_number'],
                defaults={
                    'medicine': med,
                    'batch': batch,
                    'patient': ed['patient'],
                    'prescribing_doctor_name': ed['doctor'],
                    'doctor_license_number': ed['license'],
                    'rx_number': ed['rx_number'],
                    'quantity_dispensed': ed['qty'],
                    'balance_stock_after': ed['bal'],
                    'primary_pharmacist': ed['primary'],
                    'witness_staff': ed['witness'],
                    'witness_role': ed['witness_role'],
                    'remarks': ed['remarks'],
                    'vault_location': ed['loc'],
                    'discrepancy_noted': False,
                }
            )
            if created:
                reg.created_at = created_time
                reg.save()

        # 6. Physical Vault Shelf Reconciliations (1 Reconciled, 1 Discrepancy)
        m_mor = created_meds['MED-CD-MOR10']
        b_mor = created_batches['MOR-VLT-901']
        rec1, _ = PharmacyVaultReconciliation.objects.update_or_create(
            reconciliation_number='VR-2610-0001',
            defaults={
                'medicine': m_mor,
                'batch': b_mor,
                'register_balance': 28,
                'physical_count': 28,
                'variance': 0,
                'status': 'Reconciled',
                'discrepancy_reason': 'Routine morning shift audit · ampoule blister seals verified intact',
                'vault_location': 'Vault Safe A (Dual Key Locked)',
                'performed_by': pharmacist_arjun,
                'witness_staff': nurse_priya,
                'witness_role': 'Shift Incharge Nurse (Priya Sharma)'
            }
        )

        m_ket = created_meds['MED-CD-KET50']
        b_ket = created_batches['KET-VLT-771']
        rec2, _ = PharmacyVaultReconciliation.objects.update_or_create(
            reconciliation_number='VR-2610-0002',
            defaults={
                'medicine': m_ket,
                'batch': b_ket,
                'register_balance': 19,
                'physical_count': 18,
                'variance': -1,
                'status': 'Discrepancy',
                'discrepancy_reason': '1 vial cracked in transport tray · broken glass logged for quarantine and write-off',
                'vault_location': 'Vault Safe A (Dual Key Locked)',
                'performed_by': pharmacist_sneha,
                'witness_staff': nurse_maria,
                'witness_role': 'Head Nurse (Maria Nurse)'
            }
        )

        # Flagged discrepancy entry in register
        PharmacyControlledDrugRegister.objects.update_or_create(
            entry_number='DISC-2610-0001',
            defaults={
                'medicine': m_ket,
                'batch': b_ket,
                'prescribing_doctor_name': 'Incident Audit Investigation',
                'doctor_license_number': 'AUDIT-NC-881',
                'rx_number': 'INCIDENT-8841',
                'quantity_dispensed': 1,
                'balance_stock_after': 18,
                'primary_pharmacist': pharmacist_sneha,
                'witness_staff': nurse_maria,
                'witness_role': 'Head Nurse (Maria Nurse)',
                'remarks': 'Damaged vial incident during OT tray transfer · quarantined for supervised neutralization',
                'vault_location': 'Vault Safe A (Dual Key Locked)',
                'discrepancy_noted': True,
                'discrepancy_notes': '1 vial cracked in transport tray · variance -1',
            }
        )

        self.stdout.write(self.style.SUCCESS(
            "Successfully seeded Controlled Drug System (7 medicines, vault batches, 7 register entries, and 2 reconciliations)."
        ))
