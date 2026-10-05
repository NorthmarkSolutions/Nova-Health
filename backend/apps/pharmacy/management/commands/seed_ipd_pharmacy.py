from datetime import date, timedelta
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.accounts.models import User, RoleType
from apps.patients.models import Patient
from apps.ipd.models import InpatientAdmission, MedicationAdministration
from apps.pharmacy.models import (
    PharmacyMedicine,
    PharmacySupplier,
    PharmacyBatch,
    PharmacyDispenseOrder,
    PharmacyDispenseOrderItem,
    PharmacyReturn,
    PharmacyReturnItem,
    PharmacyControlledDrugRegister,
    PharmacyStockTransaction,
    MedicineCategory,
    EncounterType,
    SettlementMode,
    DispensePaymentStatus,
    DispenseOrderStatus,
    ReturnAction,
    ReturnType,
    StockTransactionType,
)


class Command(BaseCommand):
    help = 'Seeds realistic IPD ward requests and returns for Phase 6 IPD Pharmacist Workspace.'

    def handle(self, *args, **options):
        self.stdout.write("Seeding IPD Pharmacist Workspace records...")

        # 1. IPD Pharmacist User
        pharmacist, _ = User.objects.get_or_create(
            username='sneha_nair',
            defaults={
                'first_name': 'Sneha',
                'last_name': 'Nair',
                'role': RoleType.PHARMACIST,
                'email': 'sneha.nair@northhospital.com'
            }
        )
        if not pharmacist.check_password('Password123!'):
            pharmacist.set_password('Password123!')
            pharmacist.save()

        # 2. Supplier
        supplier, _ = PharmacySupplier.objects.get_or_create(
            supplier_code='SUP-IPD-01',
            defaults={
                'name': 'Central Hospital Supply Corp',
                'phone': '+919811223344',
                'drug_license_number': 'DL-IPD-CENTRAL-01'
            }
        )

        # 3. Formulary Medicines & FEFO Batches
        meds_data = [
            ('NOR', 'Noradrenaline 4 mg/4 ml ampoule', MedicineCategory.INJECTION, 62.0, False, 'NOR2408', '2027-02-01', 40, False, None),
            ('MER', 'Meropenem 1 g vial', MedicineCategory.INJECTION, 540.0, False, 'MER2410', '2027-08-01', 30, False, None),
            ('CEF', 'Ceftriaxone 1 g vial', MedicineCategory.INJECTION, 58.0, False, 'CEF2409', '2027-05-01', 120, False, None),
            ('PAN', 'Pantoprazole 40 mg injection', MedicineCategory.INJECTION, 48.0, False, 'PNI2408', '2027-03-01', 60, False, None),
            ('PCI', 'Paracetamol 1 g IV infusion', MedicineCategory.IV_FLUID, 95.0, False, 'PCI2408', '2027-01-01', 0, False, None),  # Out of stock
            ('INR', 'Insulin regular 100 IU/ml vial', MedicineCategory.INJECTION, 165.0, False, 'INR2409', '2027-01-01', 14, True, None),
            ('ENX', 'Enoxaparin 40 mg syringe', MedicineCategory.INJECTION, 310.0, False, 'ENX2407', '2026-12-01', 3, False, None),  # Partial stock (3 avail)
            ('MOR', 'Morphine 10 mg/ml ampoule', MedicineCategory.INJECTION, 38.0, True, 'MOR2408', '2027-04-01', 50, False, None),
            ('OND', 'Ondansetron 4 mg injection', MedicineCategory.INJECTION, 22.0, False, 'OND2409', '2027-06-01', 90, False, None),
            ('AMI', 'Amiodarone 150 mg ampoule', MedicineCategory.INJECTION, 74.0, False, 'AMI2407', '2027-01-01', 12, False, None),
            ('PTZ', 'Piperacillin + Tazobactam 4.5 g vial', MedicineCategory.INJECTION, 410.0, False, 'PTZ2408', '2027-03-01', 24, False, ['Penicillin']),
            ('ATV', 'Atorvastatin 20 mg tablet', MedicineCategory.TABLET, 4.2, False, 'ATV2410', '2027-09-01', 150, False, None),
            ('MTP', 'Metoprolol 25 mg tablet', MedicineCategory.TABLET, 2.6, False, 'MTP2409', '2027-07-01', 200, False, None),
            ('HEP', 'Heparin 5,000 IU/ml vial', MedicineCategory.INJECTION, 85.0, False, 'HEP2409', '2027-04-01', 40, False, None),
            ('PCT', 'Paracetamol 650 mg tablet', MedicineCategory.TABLET, 2.1, False, 'PCM2408A', '2027-03-01', 120, False, None),
            ('DAL', 'Dalteparin 5,000 IU syringe', MedicineCategory.INJECTION, 290.0, False, 'DAL2408', '2027-02-01', 12, False, None),
        ]

        medicine_map = {}
        for code, name, cat, price, is_narcotic, b_no, exp_str, qty, cold, allergens in meds_data:
            med, _ = PharmacyMedicine.objects.update_or_create(
                item_code=code,
                defaults={
                    'name': name,
                    'generic_name': name.split(' ')[0],
                    'category': cat,
                    'unit_price': Decimal(str(price)),
                    'cost_price': Decimal(str(price * 0.7)),
                    'is_narcotic': is_narcotic,
                    'known_allergens': allergens or [],
                    'reorder_level': 10,
                    'reorder_quantity': 50,
                }
            )
            medicine_map[code] = med

            if qty > 0:
                PharmacyBatch.objects.update_or_create(
                    medicine=med,
                    batch_number=b_no,
                    defaults={
                        'supplier': supplier,
                        'manufacturing_date': date(2024, 6, 1),
                        'expiry_date': date.fromisoformat(exp_str),
                        'initial_quantity': qty + 20,
                        'available_quantity': qty,
                        'cost_price': Decimal(str(price * 0.7)),
                        'mrp_price': Decimal(str(price)),
                        'storage_location': 'Cold Chain Refrigerator (2-8 C)' if cold else 'Central IPD Rack',
                        'received_by': pharmacist,
                    }
                )

        # 4. Patients & Inpatient Admissions
        patients_data = [
            ('UHID-IPD-001', 'Fatima', 'Zahra', '1968-05-12', 'FEMALE', 'ADM-2609-0091', 'ICU', 'Bed 3', 'Dr. Elena Morgan', 'Rina Thomas', 'ADMITTED', []),
            ('UHID-IPD-002', 'Noah', 'Williams', '1960-03-24', 'MALE', 'ADM-2610-0004', 'HDU', 'Bed 2', 'Dr. Michael Chang', 'Kiran Das', 'ADMITTED', []),
            ('UHID-IPD-003', 'Samuel', 'Okoro', '1979-08-11', 'MALE', 'ADM-2609-0118', 'Ward 4B', 'Bed 12', 'Dr. Alisha Patel', 'Anita Joseph', 'ADMITTED', []),
            ('UHID-IPD-004', 'Ritu', 'Sharma', '1987-11-05', 'FEMALE', 'ADM-2609-0102', 'Ward 4B', 'Bed 9', 'Dr. Alisha Patel', 'Anita Joseph', 'ADMITTED', ['Penicillin']),
            ('UHID-IPD-005', 'Daniel', 'Costa', '1954-01-19', 'MALE', 'ADM-2609-0087', 'Ward 2A', 'Bed 7', 'Dr. Michael Chang', 'Joseph Mathew', 'ADMITTED', []),
            ('UHID-IPD-006', 'Maya', 'Chen', '1975-09-14', 'FEMALE', 'ADM-2609-0110', 'Ward 3C', 'Bed 4', 'Dr. Vikram Rao', 'Leena P', 'ADMITTED', []),
            ('UHID-IPD-007', 'Grace', 'Mensah', '1957-04-20', 'FEMALE', 'ADM-2609-0059', 'Ward 3C', 'Bed 6', 'Dr. Vikram Rao', 'Leena P', 'DISCHARGED', []),
            ('UHID-IPD-008', 'Arun', 'Pillai', '1963-07-30', 'MALE', 'ADM-2609-0064', 'Ward 2A', 'Bed 3', 'Dr. Sarah Jenkins', 'Joseph Mathew', 'ADMITTED', []),
            ('UHID-IPD-009', 'Lakshmi', 'Iyer', '1946-02-15', 'FEMALE', 'ADM-2609-0051', 'Ward 3C', 'Bed 1', 'Dr. Vikram Rao', 'Leena P', 'ADMITTED', []),
            ('UHID-IPD-010', 'Imran', 'Qureshi', '1982-12-08', 'MALE', 'ADM-2609-0077', 'ICU', 'Bed 5', 'Dr. Elena Morgan', 'Rina Thomas', 'ADMITTED', []),
        ]

        patient_map = {}
        admission_map = {}

        for uhid, fn, ln, dob, gen, adm_no, ward, bed, doc, nurse, adm_status, allergies in patients_data:
            pat, _ = Patient.objects.update_or_create(
                uhid=uhid,
                defaults={
                    'first_name': fn,
                    'last_name': ln,
                    'date_of_birth': dob,
                    'gender': gen,
                    'phone_number': '9876543210',
                    'allergies': allergies,
                }
            )
            patient_map[uhid] = pat

            disch_time = timezone.now() - timedelta(minutes=45) if adm_status == 'DISCHARGED' else None
            adm, _ = InpatientAdmission.objects.update_or_create(
                admission_number=adm_no,
                defaults={
                    'patient': pat,
                    'ward_name': ward,
                    'status': adm_status,
                    'discharge_date': disch_time,
                }
            )
            admission_map[adm_no] = adm

        now = timezone.now()

        # 5. Seed Inpatient Ward Requisitions
        requests_config = [
            {
                'order_num': 'WR-5521', 'uhid': 'UHID-IPD-001', 'adm_no': 'ADM-2609-0091',
                'ward': 'ICU', 'bed': 'Bed 3', 'prio': 'STAT', 'nurse': 'Rina Thomas', 'doctor': 'Dr. Elena Morgan',
                'mins_ago': 4, 'step': 1, 'status': DispenseOrderStatus.PENDING,
                'items': [('NOR', '8 mcg/min infusion · titrate', 6), ('MER', '1 g IV 8-hourly', 6)],
            },
            {
                'order_num': 'WR-5514', 'uhid': 'UHID-IPD-002', 'adm_no': 'ADM-2610-0004',
                'ward': 'HDU', 'bed': 'Bed 2', 'prio': 'STAT', 'nurse': 'Kiran Das', 'doctor': 'Dr. Michael Chang',
                'mins_ago': 11, 'step': 1, 'status': DispenseOrderStatus.PENDING,
                'items': [('AMI', '150 mg IV over 10 min, then infusion', 2)],
            },
            {
                'order_num': 'WR-5519', 'uhid': 'UHID-IPD-003', 'adm_no': 'ADM-2609-0118',
                'ward': 'Ward 4B', 'bed': 'Bed 12', 'prio': 'URGENT', 'nurse': 'Anita Joseph', 'doctor': 'Dr. Alisha Patel',
                'mins_ago': 22, 'step': 1, 'status': DispenseOrderStatus.PENDING,
                'items': [('CEF', '1 g IV 12-hourly', 4), ('PAN', '40 mg IV once daily', 2), ('PCI', '1 g IV 6-hourly if fever', 4)],
            },
            {
                'order_num': 'WR-5512', 'uhid': 'UHID-IPD-004', 'adm_no': 'ADM-2609-0102',
                'ward': 'Ward 4B', 'bed': 'Bed 9', 'prio': 'URGENT', 'nurse': 'Anita Joseph', 'doctor': 'Dr. Alisha Patel',
                'mins_ago': 37, 'step': 2, 'status': DispenseOrderStatus.UNDER_REVIEW,
                'items': [('PTZ', '4.5 g IV 8-hourly', 6)],
            },
            {
                'order_num': 'WR-5517', 'uhid': 'UHID-IPD-005', 'adm_no': 'ADM-2609-0087',
                'ward': 'Ward 2A', 'bed': 'Bed 7', 'prio': 'ROUTINE', 'nurse': 'Joseph Mathew', 'doctor': 'Dr. Michael Chang',
                'mins_ago': 44, 'step': 3, 'status': DispenseOrderStatus.UNDER_REVIEW,
                'items': [('INR', 'Sliding scale SC before meals', 1), ('ENX', '40 mg SC once daily', 5)],
            },
            {
                'order_num': 'WR-5516', 'uhid': 'UHID-IPD-006', 'adm_no': 'ADM-2609-0110',
                'ward': 'Ward 3C', 'bed': 'Bed 4', 'prio': 'ROUTINE', 'nurse': 'Leena P', 'doctor': 'Dr. Vikram Rao',
                'mins_ago': 50, 'step': 4, 'status': DispenseOrderStatus.UNDER_REVIEW,
                'items': [('MOR', '2.5 mg IV 4-hourly PRN pain', 4), ('OND', '4 mg IV 8-hourly PRN', 4)],
                'ipd_data': {'cancelled_lines': ['OND']}
            },
            {
                'order_num': 'WR-5508', 'uhid': 'UHID-IPD-007', 'adm_no': 'ADM-2609-0059',
                'ward': 'Ward 3C', 'bed': 'Bed 6', 'prio': 'ROUTINE', 'nurse': 'Leena P', 'doctor': 'Dr. Vikram Rao',
                'mins_ago': 57, 'step': 4, 'status': DispenseOrderStatus.UNDER_REVIEW,
                'items': [('PAN', '40 mg IV once daily', 2)],
            },
            {
                'order_num': 'WR-5510', 'uhid': 'UHID-IPD-008', 'adm_no': 'ADM-2609-0064',
                'ward': 'Ward 2A', 'bed': 'Bed 3', 'prio': 'DISCHARGE', 'nurse': 'Joseph Mathew', 'doctor': 'Dr. Sarah Jenkins',
                'mins_ago': 62, 'step': 4, 'status': DispenseOrderStatus.UNDER_REVIEW,
                'items': [('ATV', '20 mg at night · 30 days', 30), ('MTP', '25 mg twice daily · 30 days', 60)],
            },
            {
                'order_num': 'WR-5506', 'uhid': 'UHID-IPD-009', 'adm_no': 'ADM-2609-0051',
                'ward': 'Ward 3C', 'bed': 'Bed 1', 'prio': 'ROUTINE', 'nurse': 'Leena P', 'doctor': 'Dr. Vikram Rao',
                'mins_ago': 120, 'step': 6, 'status': DispenseOrderStatus.DISPENSED,
                'dispensed_by': pharmacist, 'received_by': 'Leena P',
                'items': [('CEF', '1 g IV 12-hourly', 4), ('OND', '4 mg IV PRN', 2)],
            },
            {
                'order_num': 'WR-5503', 'uhid': 'UHID-IPD-010', 'adm_no': 'ADM-2609-0077',
                'ward': 'ICU', 'bed': 'Bed 5', 'prio': 'STAT', 'nurse': 'Rina Thomas', 'doctor': 'Dr. Elena Morgan',
                'mins_ago': 150, 'step': 6, 'status': DispenseOrderStatus.DISPENSED,
                'is_emergency': True, 'emergency_reason': 'Post-op pain crisis · verbal order Dr. Morgan',
                'dispensed_by': pharmacist, 'received_by': 'Rina Thomas',
                'items': [('MOR', 'Infusion 1–3 mg/h', 5)],
            },
        ]

        for cfg in requests_config:
            created_time = now - timedelta(minutes=cfg['mins_ago'])
            pat = patient_map[cfg['uhid']]
            adm = admission_map[cfg['adm_no']]

            total_amt = Decimal('0.00')
            for c, _, q in cfg['items']:
                total_amt += medicine_map[c].unit_price * q

            order, _ = PharmacyDispenseOrder.objects.update_or_create(
                order_number=cfg['order_num'],
                defaults={
                    'patient': pat,
                    'admission': adm,
                    'encounter_type': EncounterType.IPD,
                    'ward_name': cfg['ward'],
                    'bed_number': cfg['bed'],
                    'doctor_name': cfg['doctor'],
                    'nurse_name': cfg['nurse'],
                    'priority': cfg['prio'],
                    'step': cfg['step'],
                    'status': cfg['status'],
                    'settlement_mode': SettlementMode.IPD_RUNNING_BILL,
                    'total_amount': total_amt,
                    'is_emergency': cfg.get('is_emergency', False),
                    'emergency_reason': cfg.get('emergency_reason', ''),
                    'dispensed_by': cfg.get('dispensed_by'),
                    'dispensed_at': created_time + timedelta(minutes=10) if cfg['status'] == DispenseOrderStatus.DISPENSED else None,
                    'received_by_nurse': cfg.get('received_by', ''),
                    'received_at': created_time + timedelta(minutes=15) if cfg['status'] == DispenseOrderStatus.DISPENSED else None,
                    'ipd_data': cfg.get('ipd_data', {}),
                }
            )
            # Update created_at
            PharmacyDispenseOrder.objects.filter(id=order.id).update(created_at=created_time)

            for c, dose, q in cfg['items']:
                med = medicine_map[c]
                batch = PharmacyBatch.objects.filter(medicine=med).first()
                PharmacyDispenseOrderItem.objects.update_or_create(
                    dispense_order=order,
                    medicine=med,
                    defaults={
                        'prescribed_quantity': q,
                        'dispensed_quantity': q if cfg['status'] == DispenseOrderStatus.DISPENSED else 0,
                        'unit_price': med.unit_price,
                        'line_total': med.unit_price * q,
                        'dosage_instruction': dose,
                        'batch': batch,
                        'is_picked': cfg['status'] == DispenseOrderStatus.DISPENSED,
                    }
                )

        # 6. Seed Ward Returns
        returns_data = [
            ('RW-031', 'Samuel Okoro', 'ADM-2609-0118', 'Ward 4B', 'Bed 12', 'Anita Joseph', 'CEF', 2, 'Medication changed', 'Antibiotic changed by doctor', 'Requested', 25),
            ('RW-029', 'Daniel Costa', 'ADM-2609-0087', 'Ward 2A', 'Bed 7', 'Joseph Mathew', 'INR', 1, 'Damaged', 'Vial dropped · cracked', 'Requested', 35),
            ('RW-030', 'Imran Qureshi', 'ADM-2609-0077', 'ICU', 'Bed 5', 'Rina Thomas', 'MOR', 1, 'Unused', 'Opened, partially used ampoule', 'Requested', 45),
            ('RW-027', 'Ward imprest stock', 'Ward 3C imprest', 'Ward 3C', 'Imprest', 'Leena P', 'OND', 5, 'Expired', 'Expired in ward imprest cupboard', 'Received', 65),
            ('RW-028', 'Arun Pillai', 'ADM-2609-0064', 'Ward 2A', 'Bed 3', 'Joseph Mathew', 'PAN', 3, 'Discharged', 'Patient discharged', 'Credited', 85),
        ]

        for r_no, c_name, adm_no, ward, bed, nurse, med_code, q, itype, reason, st, mins_ago in returns_data:
            med = medicine_map[med_code]
            batch = PharmacyBatch.objects.filter(medicine=med).first()
            ret_time = now - timedelta(minutes=mins_ago)

            ret, _ = PharmacyReturn.objects.update_or_create(
                return_number=r_no,
                defaults={
                    'customer_name': c_name,
                    'admission': admission_map.get(adm_no),
                    'ward_name': ward,
                    'bed_number': bed,
                    'nurse_name': nurse,
                    'item_type': itype,
                    'return_type': ReturnType.WARD_IPD,
                    'status': st,
                    'reason': reason,
                    'total_refund_amount': med.unit_price * q,
                    'notes': f"{st} at {ret_time.strftime('%H:%M')}",
                    'disposition': 'restock' if st == 'Credited' else None,
                }
            )
            PharmacyReturn.objects.filter(id=ret.id).update(created_at=ret_time)

            if batch:
                PharmacyReturnItem.objects.update_or_create(
                    pharmacy_return=ret,
                    medicine=med,
                    defaults={
                        'batch': batch,
                        'quantity_returned': q,
                        'refund_unit_price': med.unit_price,
                        'line_refund_total': med.unit_price * q,
                        'action': ReturnAction.RESTOCK if st == 'Credited' else ReturnAction.QUARANTINE,
                    }
                )

        self.stdout.write("Successfully seeded Phase 6 IPD Pharmacist Workspace records!")
