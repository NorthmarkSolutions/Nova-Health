from datetime import date, timedelta
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.accounts.models import User, RoleType
from apps.patients.models import Patient
from apps.clinical.models import Prescription, PrescriptionItem
from apps.pharmacy.models import (
    PharmacyMedicine,
    PharmacySupplier,
    PharmacyBatch,
    PharmacyDispenseOrder,
    PharmacyDispenseOrderItem,
    PharmacyOTCSale,
    PharmacyOTCSaleItem,
    PharmacyReturn,
    PharmacyReturnItem,
    PharmacyControlledDrugRegister,
    PharmacyStockTransaction,
    PharmacyCounterShift,
    MedicineCategory,
    EncounterType,
    SettlementMode,
    DispensePaymentStatus,
    DispenseOrderStatus,
    ReturnAction,
    ReturnType,
    StockTransactionType,
    ShiftType,
)


class Command(BaseCommand):
    help = 'Seeds realistic OPD prescriptions, OTC sales, completed dispenses, and returns for Phase 4 OPD Pharmacist Workspace.'

    def handle(self, *args, **options):
        self.stdout.write("Seeding OPD Pharmacist Workspace records...")

        # 1. Pharmacist Users
        pharmacist, _ = User.objects.get_or_create(
            username='arjun_varma',
            defaults={
                'first_name': 'Arjun',
                'last_name': 'Varma',
                'role': RoleType.PHARMACIST,
                'email': 'arjun.varma@northhospital.com'
            }
        )
        if not pharmacist.check_password('Password123!'):
            pharmacist.set_password('Password123!')
            pharmacist.save()

        witness, _ = User.objects.get_or_create(
            username='pooja_shah',
            defaults={
                'first_name': 'Pooja',
                'last_name': 'Shah',
                'role': RoleType.PHARMACIST,
                'email': 'pooja.shah@northhospital.com'
            }
        )
        if not witness.check_password('Password123!'):
            witness.set_password('Password123!')
            witness.save()

        # 2. Key Formulary Medicines
        supplier = PharmacySupplier.objects.first()
        if not supplier:
            supplier = PharmacySupplier.objects.create(
                supplier_code='SUP-001',
                name='MedSource Healthcare Solutions',
                phone='9876543210',
                drug_license_number='DL-2026-MED1'
            )

        med_defs = [
            ('SAL100', 'Salbutamol 100 mcg inhaler', 'Salbutamol', 'INHALER', 'H', 145.00, 110.00, False, False, []),
            ('PRD5', 'Prednisolone 5 mg tablet', 'Prednisolone', 'TABLET', 'H', 0.90, 0.60, False, False, []),
            ('AMC625', 'Amoxicillin + Clavulanic acid 625 mg tablet', 'Co-amoxiclav', 'TABLET', 'H', 18.40, 14.00, False, False, ['Penicillin']),
            ('PCM500', 'Paracetamol 500 mg tablet', 'Paracetamol', 'TABLET', 'OTC', 1.20, 0.80, False, False, []),
            ('PCM650', 'Paracetamol 650 mg tablet', 'Paracetamol', 'TABLET', 'OTC', 2.10, 1.50, False, False, []),
            ('AZI500', 'Azithromycin 500 mg tablet', 'Azithromycin', 'TABLET', 'H', 22.00, 16.50, False, False, []),
            ('INSG', 'Insulin glargine 100 IU/mL pen', 'Insulin glargine', 'INJECTION', 'H', 780.00, 620.00, False, True, []),
            ('GLM1', 'Glimepiride 1 mg tablet', 'Glimepiride', 'TABLET', 'H', 3.10, 2.20, False, False, []),
            ('CTZ10', 'Cetirizine 10 mg tablet', 'Cetirizine', 'TABLET', 'OTC', 1.80, 1.10, False, False, []),
            ('PAN40', 'Pantoprazole 40 mg tablet', 'Pantoprazole', 'TABLET', 'H', 6.50, 4.50, False, False, []),
            ('MET500', 'Metformin 500 mg SR tablet', 'Metformin', 'TABLET', 'H', 1.90, 1.30, False, False, []),
            ('ATV20', 'Atorvastatin 20 mg tablet', 'Atorvastatin', 'TABLET', 'H', 4.20, 2.90, False, False, []),
            ('TRM50', 'Tramadol 50 mg capsule', 'Tramadol', 'CAPSULE', 'H1', 4.60, 3.10, True, False, []),
            ('DCG30', 'Diclofenac 1% gel 30 g', 'Diclofenac', 'OINTMENT', 'OTC', 95.00, 65.00, False, False, []),
            ('CIP500', 'Ciprofloxacin 500 mg tablet', 'Ciprofloxacin', 'TABLET', 'H', 5.40, 3.80, False, False, []),
            ('ANT170', 'Antacid gel 170 ml', 'Aluminium + Magnesium hydroxide', 'SYRUP', 'OTC', 112.00, 78.00, False, False, []),
            ('MTK10', 'Montelukast 10 mg tablet', 'Montelukast', 'TABLET', 'H', 9.50, 6.80, False, False, []),
            ('LEV75', 'Levothyroxine 75 mcg tablet', 'Levothyroxine', 'TABLET', 'H', 1.60, 1.00, False, False, []),
            ('ORS21', 'ORS sachet 21 g', 'Oral rehydration salts', 'OTHER', 'OTC', 21.00, 14.00, False, False, []),
            ('VTC500', 'Vitamin C 500 mg chewable tablet', 'Ascorbic acid', 'TABLET', 'OTC', 2.50, 1.60, False, False, []),
            ('ANS100', 'Antiseptic solution 100 ml', 'Chloroxylenol', 'DROPS', 'OTC', 64.00, 42.00, False, False, []),
        ]

        meds = {}
        for code, name, generic, cat, sched, price, cost, narc, cold, allergens in med_defs:
            m, _ = PharmacyMedicine.objects.update_or_create(
                item_code=code,
                defaults={
                    'name': name,
                    'generic_name': generic,
                    'category': cat,
                    'schedule': sched,
                    'unit_price': Decimal(str(price)),
                    'cost_price': Decimal(str(cost)),
                    'is_narcotic': narc,
                    'is_cold_chain': cold,
                    'known_allergens': allergens,
                    'requires_prescription': sched != 'OTC',
                    'default_supplier': supplier,
                    'is_active': True
                }
            )
            meds[code] = m

            # Ensure active batch exists
            if code not in ['LEV75']: # leave LEV75 out of stock to demonstrate hold & alternatives
                PharmacyBatch.objects.get_or_create(
                    medicine=m,
                    batch_number=f"B-{code}-24",
                    defaults={
                        'supplier': supplier,
                        'manufacturing_date': date(2024, 6, 1),
                        'expiry_date': date(2027, 8, 1),
                        'initial_quantity': 300,
                        'available_quantity': 250,
                        'cost_price': Decimal(str(cost)),
                        'received_by': pharmacist
                    }
                )

        # 3. Seed Patients & Prescriptions
        pat_defs = [
            ('UHID-202610-00144', 'Ananya', 'Das', 9, 'F', 'Acute asthma exacerbation, mild', 'STAT', 'Dr. Kavitha Menon', 'OPD Room 105 · Paediatrics', []),
            ('UHID-202608-00412', 'Meera', 'Iyer', 70, 'F', 'Acute bacterial sinusitis', 'URGENT', 'Dr. R. Kulkarni', 'OPD Room 104 · ENT', ['Penicillin']),
            ('UHID-202603-00190', 'Kavya', 'Reddy', 45, 'F', 'Type 2 diabetes · poor glycaemic control', 'URGENT', 'Dr. Michael Chang', 'OPD Room 103 · Endocrinology', ['Sulfonamides']),
            ('UHID-202609-00031', 'Aarav', 'Sharma', 34, 'M', 'Acute viral URTI', 'ROUTINE', 'Dr. Sarah Jenkins', 'OPD Room 101 · General Medicine', []),
            ('UHID-202511-00877', 'Rohan', 'Mehta', 61, 'M', 'Type 2 diabetes · dyslipidaemia', 'ROUTINE', 'Dr. Alisha Patel', 'OPD Room 102 · Endocrinology', []),
            ('UHID-202609-00118', 'Salman', 'Khan', 32, 'M', 'Acute lumbar strain', 'ROUTINE', 'Dr. Vikram Rao', 'OPD Room 106 · Orthopaedics', []),
            ('UHID-202402-00733', 'Priya', 'Nair', 28, 'F', 'Uncomplicated UTI', 'ROUTINE', 'Dr. Sarah Jenkins', 'OPD Room 101 · General Medicine', []),
            ('UHID-202609-00092', 'Rahul', 'C', 32, 'M', 'Acute bronchitis', 'ROUTINE', 'Dr. Michael Chang', 'OPD Room 103 · General Medicine', []),
            ('UHID-202407-00561', 'Neha', 'Gupta', 52, 'F', 'Hypothyroidism', 'ROUTINE', 'Dr. Alisha Patel', 'OPD Room 102 · Endocrinology', []),
        ]

        patients = {}
        for uhid, fn, ln, age, gender, dx, prio, doc, room, allergies in pat_defs:
            dob = date(2026 - age, 6, 15)
            p, _ = Patient.objects.update_or_create(
                uhid=uhid,
                defaults={
                    'first_name': fn,
                    'last_name': ln,
                    'gender': gender,
                    'date_of_birth': dob,
                    'allergies': allergies,
                    'phone_number': '98765' + uhid[-5:]
                }
            )
            patients[uhid] = p

        # 4. Prescription Queue Orders
        # 1. Ananya Das (STAT)
        p1 = patients['UHID-202610-00144']
        o1, _ = PharmacyDispenseOrder.objects.update_or_create(
            order_number='RX-24125',
            defaults={
                'patient': p1,
                'encounter_type': EncounterType.OPD,
                'priority': 'STAT',
                'status': DispenseOrderStatus.PENDING,
                'doctor_name': 'Dr. Kavitha Menon',
                'diagnosis': 'Acute asthma exacerbation, mild',
                'settlement_mode': SettlementMode.PAY_AT_PHARMACY,
                'payment_status': DispensePaymentStatus.UNPAID,
                'step': 1
            }
        )
        o1.items.all().delete()
        PharmacyDispenseOrderItem.objects.create(dispense_order=o1, medicine=meds['SAL100'], prescribed_quantity=1, unit_price=meds['SAL100'].unit_price, line_total=meds['SAL100'].unit_price, dosage_instruction='2 puffs via spacer every 4–6 h · 5 days')
        PharmacyDispenseOrderItem.objects.create(dispense_order=o1, medicine=meds['PRD5'], prescribed_quantity=10, unit_price=meds['PRD5'].unit_price, line_total=meds['PRD5'].unit_price * 10, dosage_instruction='2 tablets once daily after breakfast · 5 days')
        o1.total_amount = sum(it.line_total for it in o1.items.all())
        o1.save()

        # 2. Meera Iyer (Allergy alert: Penicillin)
        p2 = patients['UHID-202608-00412']
        o2, _ = PharmacyDispenseOrder.objects.update_or_create(
            order_number='RX-24116',
            defaults={
                'patient': p2,
                'encounter_type': EncounterType.OPD,
                'priority': 'URGENT',
                'status': DispenseOrderStatus.PENDING,
                'doctor_name': 'Dr. R. Kulkarni',
                'diagnosis': 'Acute bacterial sinusitis',
                'settlement_mode': SettlementMode.INSURANCE,
                'payment_status': DispensePaymentStatus.INSURANCE_PENDING,
                'has_allergy_warning': True,
                'allergy_warning_details': [{'medicine_name': 'Co-amoxiclav', 'matched_allergen': 'Penicillin', 'warning': 'Known Penicillin allergy rash on record'}],
                'step': 1
            }
        )
        o2.items.all().delete()
        PharmacyDispenseOrderItem.objects.create(dispense_order=o2, medicine=meds['AMC625'], prescribed_quantity=10, unit_price=meds['AMC625'].unit_price, line_total=meds['AMC625'].unit_price * 10, dosage_instruction='1-0-1 after food · 5 days', has_allergy_conflict=True, allergy_conflict_note='Contains Penicillin derivative')
        PharmacyDispenseOrderItem.objects.create(dispense_order=o2, medicine=meds['PCM500'], prescribed_quantity=9, unit_price=meds['PCM500'].unit_price, line_total=meds['PCM500'].unit_price * 9, dosage_instruction='1-1-1 if fever · 3 days')
        o2.total_amount = sum(it.line_total for it in o2.items.all())
        o2.payer_covered_amount = o2.total_amount * Decimal('0.80')
        o2.co_pay_amount = o2.total_amount * Decimal('0.20')
        o2.save()

        # 3. Salman Khan (CD/Narcotic: Tramadol)
        p3 = patients['UHID-202609-00118']
        o3, _ = PharmacyDispenseOrder.objects.update_or_create(
            order_number='RX-24121',
            defaults={
                'patient': p3,
                'encounter_type': EncounterType.OPD,
                'priority': 'ROUTINE',
                'status': DispenseOrderStatus.PENDING,
                'doctor_name': 'Dr. Vikram Rao',
                'diagnosis': 'Acute lumbar strain',
                'settlement_mode': SettlementMode.PAY_AT_PHARMACY,
                'payment_status': DispensePaymentStatus.UNPAID,
                'step': 1
            }
        )
        o3.items.all().delete()
        PharmacyDispenseOrderItem.objects.create(dispense_order=o3, medicine=meds['TRM50'], prescribed_quantity=10, unit_price=meds['TRM50'].unit_price, line_total=meds['TRM50'].unit_price * 10, dosage_instruction='1-0-1 if severe pain · 5 days')
        PharmacyDispenseOrderItem.objects.create(dispense_order=o3, medicine=meds['DCG30'], prescribed_quantity=1, unit_price=meds['DCG30'].unit_price, line_total=meds['DCG30'].unit_price, dosage_instruction='Apply locally 3 times a day')
        PharmacyDispenseOrderItem.objects.create(dispense_order=o3, medicine=meds['PAN40'], prescribed_quantity=5, unit_price=meds['PAN40'].unit_price, line_total=meds['PAN40'].unit_price * 5, dosage_instruction='1-0-0 before breakfast · 5 days')
        o3.total_amount = sum(it.line_total for it in o3.items.all())
        o3.save()

        # 4. Priya Nair (Drug interaction: Ciprofloxacin + Antacid)
        p4 = patients['UHID-202402-00733']
        o4, _ = PharmacyDispenseOrder.objects.update_or_create(
            order_number='RX-24123',
            defaults={
                'patient': p4,
                'encounter_type': EncounterType.OPD,
                'priority': 'ROUTINE',
                'status': DispenseOrderStatus.PENDING,
                'doctor_name': 'Dr. Sarah Jenkins',
                'diagnosis': 'Uncomplicated UTI',
                'settlement_mode': SettlementMode.PAY_AT_PHARMACY,
                'payment_status': DispensePaymentStatus.UNPAID,
                'step': 1
            }
        )
        o4.items.all().delete()
        PharmacyDispenseOrderItem.objects.create(dispense_order=o4, medicine=meds['CIP500'], prescribed_quantity=10, unit_price=meds['CIP500'].unit_price, line_total=meds['CIP500'].unit_price * 10, dosage_instruction='1-0-1 · 5 days')
        PharmacyDispenseOrderItem.objects.create(dispense_order=o4, medicine=meds['ANT170'], prescribed_quantity=1, unit_price=meds['ANT170'].unit_price, line_total=meds['ANT170'].unit_price, dosage_instruction='10 ml after meals')
        o4.total_amount = sum(it.line_total for it in o4.items.all())
        o4.save()

        # 5. Neha Gupta (On hold awaiting stock)
        p5 = patients['UHID-202407-00561']
        o5, _ = PharmacyDispenseOrder.objects.update_or_create(
            order_number='RX-24097',
            defaults={
                'patient': p5,
                'encounter_type': EncounterType.OPD,
                'priority': 'ROUTINE',
                'status': DispenseOrderStatus.AWAITING_STOCK,
                'doctor_name': 'Dr. Alisha Patel',
                'diagnosis': 'Hypothyroidism',
                'settlement_mode': SettlementMode.PAY_AT_PHARMACY,
                'payment_status': DispensePaymentStatus.UNPAID,
                'hold_reason': 'Levothyroxine 75 mcg out of stock · awaiting central warehouse transfer',
                'step': 2
            }
        )
        o5.items.all().delete()
        PharmacyDispenseOrderItem.objects.create(dispense_order=o5, medicine=meds['LEV75'], prescribed_quantity=30, unit_price=meds['LEV75'].unit_price, line_total=meds['LEV75'].unit_price * 30, dosage_instruction='1-0-0 empty stomach · 30 days')
        o5.total_amount = sum(it.line_total for it in o5.items.all())
        o5.save()

        # 5. Completed Dispenses Today
        d_pats = [
            ('DSP-1046', 'Anil Kumar', 'UHID-202609-00012', 'Dr. Sarah Jenkins', SettlementMode.PAY_AT_PHARMACY, [('CTZ10', 5), ('PCM650', 10)]),
            ('DSP-1045', 'Fatima Sheikh', 'UHID-202512-00304', 'Dr. R. Kulkarni', SettlementMode.PAY_AT_RECEPTION, [('AMC625', 15), ('PCM500', 10)]),
            ('DSP-1044', 'Vijay Menon', 'UHID-202406-00219', 'Dr. Michael Chang', SettlementMode.INSURANCE, [('INSG', 1)]),
            ('DSP-1042', 'Imran Qureshi', 'UHID-202601-00087', 'Dr. Vikram Rao', SettlementMode.PAY_AT_PHARMACY, [('TRM50', 10)]),
        ]

        now = timezone.now()
        for idx, (dsp_no, name, uhid, doc, mode, items) in enumerate(d_pats):
            dp, _ = Patient.objects.get_or_create(
                uhid=uhid,
                defaults={'first_name': name.split()[0], 'last_name': name.split()[1], 'gender': 'M', 'date_of_birth': date(1980, 1, 1)}
            )
            d_order, _ = PharmacyDispenseOrder.objects.update_or_create(
                order_number=dsp_no,
                defaults={
                    'patient': dp,
                    'encounter_type': EncounterType.OPD,
                    'settlement_mode': mode,
                    'payment_status': DispensePaymentStatus.PAID,
                    'status': DispenseOrderStatus.DISPENSED,
                    'dispensed_by': pharmacist,
                    'dispensed_at': now - timedelta(minutes=25 * (idx + 1)),
                    'doctor_name': doc,
                    'step': 7
                }
            )
            d_order.items.all().delete()
            for code, qty in items:
                m = meds[code]
                b = PharmacyBatch.objects.filter(medicine=m).first()
                PharmacyDispenseOrderItem.objects.create(
                    dispense_order=d_order,
                    medicine=m,
                    batch=b,
                    prescribed_quantity=qty,
                    dispensed_quantity=qty,
                    unit_price=m.unit_price,
                    line_total=m.unit_price * qty
                )
            d_order.total_amount = sum(it.line_total for it in d_order.items.all())
            d_order.save()

        # 6. Completed OTC Sales Today
        otc_records = [
            ('INV-OTC-0584', 'Walk-in Customer', '—', 'Cash', [('ORS21', 5), ('PCM500', 10)]),
            ('INV-OTC-0583', 'Deepa M', '9845021121', 'UPI', [('CTZ10', 10)]),
            ('INV-OTC-0582', 'Walk-in Customer', '—', 'Card', [('DCG30', 1), ('ANS100', 1)]),
            ('INV-OTC-0581', 'Walk-in Customer', '—', 'UPI', [('VTC500', 20)]),
            ('INV-OTC-0579', 'Ravi K', '9900187420', 'Cash', [('ORS21', 10)]),
        ]

        for s_no, c_name, c_phone, p_mode, lines in otc_records:
            otc, _ = PharmacyOTCSale.objects.update_or_create(
                sale_number=s_no,
                defaults={
                    'customer_name': c_name,
                    'customer_phone': c_phone if c_phone != '—' else '',
                    'payment_mode': p_mode,
                    'sold_by': pharmacist,
                    'created_at': now - timedelta(minutes=15)
                }
            )
            otc.items.all().delete()
            tot = Decimal('0.00')
            for code, qty in lines:
                m = meds[code]
                b = PharmacyBatch.objects.filter(medicine=m).first()
                lt = m.unit_price * qty
                tot += lt
                PharmacyOTCSaleItem.objects.create(
                    otc_sale=otc,
                    medicine=m,
                    batch=b or PharmacyBatch.objects.first(),
                    quantity=qty,
                    unit_price=m.unit_price,
                    tax_rate=Decimal('12.00'),
                    line_total=lt
                )
            otc.subtotal_amount = tot * Decimal('0.88')
            otc.tax_amount = tot * Decimal('0.12')
            otc.total_amount = tot
            otc.save()

        # 7. Returns & Refunds
        disp_1046 = PharmacyDispenseOrder.objects.filter(order_number='DSP-1046').first()
        disp_1045 = PharmacyDispenseOrder.objects.filter(order_number='DSP-1045').first()
        disp_1044 = PharmacyDispenseOrder.objects.filter(order_number='DSP-1044').first()

        # Return 1: RET-0211 (Requested)
        if disp_1046:
            r1, _ = PharmacyReturn.objects.update_or_create(
                return_number='RET-0211',
                defaults={
                    'original_dispense_order': disp_1046,
                    'patient': disp_1046.patient,
                    'customer_name': 'Anil Kumar',
                    'status': 'Requested',
                    'reason': 'Duplicate — patient already has stock',
                    'refund_route': 'Refund at pharmacy counter',
                    'total_refund_amount': Decimal('9.00'),
                    'processed_by': pharmacist
                }
            )
            r1.items.all().delete()
            PharmacyReturnItem.objects.create(
                pharmacy_return=r1,
                dispense_order_item=disp_1046.items.first(),
                medicine=meds['CTZ10'],
                batch=PharmacyBatch.objects.filter(medicine=meds['CTZ10']).first(),
                quantity_returned=5,
                refund_unit_price=meds['CTZ10'].unit_price,
                line_refund_total=Decimal('9.00')
            )

        # Return 2: RET-0210 (Inspected, Restock)
        if disp_1045:
            r2, _ = PharmacyReturn.objects.update_or_create(
                return_number='RET-0210',
                defaults={
                    'original_dispense_order': disp_1045,
                    'patient': disp_1045.patient,
                    'customer_name': 'Fatima Sheikh',
                    'status': 'Inspected',
                    'disposition': 'restock',
                    'inspection_checks': {'sealed': True, 'batch_matches': True, 'expiry_ok': True, 'storage_ok': True},
                    'reason': 'Prescription changed by doctor',
                    'refund_route': 'Refund via reception cashier',
                    'total_refund_amount': Decimal('28.80'),
                    'processed_by': pharmacist
                }
            )
            r2.items.all().delete()
            PharmacyReturnItem.objects.create(
                pharmacy_return=r2,
                dispense_order_item=disp_1045.items.first(),
                medicine=meds['AMC625'],
                batch=PharmacyBatch.objects.filter(medicine=meds['AMC625']).first(),
                quantity_returned=6,
                refund_unit_price=meds['AMC625'].unit_price,
                line_refund_total=Decimal('28.80')
            )

        # Return 3: RET-0209 (Cold Chain, Rejected)
        if disp_1044:
            r3, _ = PharmacyReturn.objects.update_or_create(
                return_number='RET-0209',
                defaults={
                    'original_dispense_order': disp_1044,
                    'patient': disp_1044.patient,
                    'customer_name': 'Vijay Menon',
                    'status': 'Rejected',
                    'reason': 'Patient no longer requires',
                    'non_returnable_note': 'Cold-chain item — integrity cannot be verified once it has left the pharmacy.',
                    'rejection_reason': 'Cold-chain item — integrity cannot be verified once it has left the pharmacy.',
                    'refund_route': 'Claim reversal to TPA',
                    'total_refund_amount': Decimal('780.00'),
                    'processed_by': pharmacist
                }
            )
            r3.items.all().delete()
            PharmacyReturnItem.objects.create(
                pharmacy_return=r3,
                dispense_order_item=disp_1044.items.first(),
                medicine=meds['INSG'],
                batch=PharmacyBatch.objects.filter(medicine=meds['INSG']).first() or PharmacyBatch.objects.first(),
                quantity_returned=1,
                refund_unit_price=meds['INSG'].unit_price,
                line_refund_total=Decimal('780.00'),
                action=ReturnAction.QUARANTINE
            )

        # 8. Seed Active Counter Shift for Counter 2
        today = timezone.now().date()
        shift, _ = PharmacyCounterShift.objects.update_or_create(
            counter_name='Counter 2 · Main OPD',
            shift_date=today,
            is_closed=False,
            defaults={
                'pharmacist': pharmacist,
                'shift_type': ShiftType.MORNING,
                'opening_float': Decimal('2000.00'),
                'cash_collected': Decimal('1420.00'),
                'card_collected': Decimal('850.00'),
                'upi_collected': Decimal('620.00'),
                'refunds_paid': Decimal('0.00'),
            }
        )

        self.stdout.write(self.style.SUCCESS("Successfully seeded OPD Pharmacist Workspace records & Counter Shift!"))
