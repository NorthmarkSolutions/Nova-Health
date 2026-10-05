from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.accounts.models import User, RoleType
from apps.pharmacy.models import (
    PharmacyMedicine,
    PharmacySupplier,
    PharmacyPurchaseRequest,
    PharmacyPurchaseRequestItem,
    PharmacyPurchaseOrder,
    PharmacyPurchaseOrderItem,
    PharmacyBatch,
    PharmacyStockTransaction,
    PharmacyGoodsReceipt,
    PharmacyGoodsReceiptItem,
    PharmacyStockAdjustment,
    PharmacyTransferRequest,
    PharmacyControlledDrugRegister,
    MedicineCategory,
    PRPriority,
    PRStatus,
    POStatus,
    BatchStatus,
    StockTransactionType,
    GoodsReceiptStatus,
    AdjustmentStatus,
    TransferStatus,
)


class Command(BaseCommand):
    help = 'Seeds initial pharmacy inventory, suppliers, batches, and procurement records matching the UI spec.'

    def handle(self, *args, **options):
        self.stdout.write("Seeding pharmacy inventory records...")

        # 1. Ensure Inventory Manager User exists
        im_user, _ = User.objects.get_or_create(
            username='inventory_manager',
            defaults={
                'first_name': 'Rajesh',
                'last_name': 'Kumar',
                'role': RoleType.INVENTORY_MANAGER,
                'email': 'rajesh.kumar@northhospital.com'
            }
        )
        if not im_user.check_password('Password123!'):
            im_user.set_password('Password123!')
            im_user.save()

        # Ensure Pharmacy Admin User exists
        admin_user, _ = User.objects.get_or_create(
            username='pharmacy_admin',
            defaults={
                'first_name': 'Pooja',
                'last_name': 'Shah',
                'role': RoleType.HOSPITAL_ADMIN,
                'email': 'dr.pooja.shah@northhospital.com'
            }
        )
        if not admin_user.check_password('Password123!'):
            admin_user.set_password('Password123!')
            admin_user.save()

        # 2. Suppliers
        suppliers_data = {
            'S1': {'name': 'MedLine Distributors', 'cat': 'General formulary', 'lead': 3, 'ontime': 96.0, 'status': 'Active', 'gst': '29AABCM1182K1Z2', 'phone': '+91 80 2345 6789'},
            'S2': {'name': 'Apex Pharma', 'cat': 'Antibiotics · injectables', 'lead': 5, 'ontime': 88.0, 'status': 'Active', 'gst': '29AACCA4410H1Z9', 'phone': '+91 80 8765 4321'},
            'S3': {'name': 'ColdCare Biologics', 'cat': 'Insulin · vaccines · cold chain', 'lead': 2, 'ontime': 99.0, 'status': 'Active', 'gst': '29AADCC7731P1Z4', 'phone': '+91 80 5544 3322'},
            'S4': {'name': 'Sunrise Generics', 'cat': 'Oral generics', 'lead': 7, 'ontime': 71.0, 'status': 'Under review', 'gst': '29AAFCS2290M1Z1', 'phone': '+91 80 9988 7766'},
            'S5': {'name': 'Narcotics Control Depot', 'cat': 'Controlled drugs (licensed)', 'lead': 10, 'ontime': 92.0, 'status': 'Active', 'gst': 'Govt. licence NDPS-KA-114', 'phone': '+91 80 1122 3344'},
        }

        suppliers_map = {}
        for code, info in suppliers_data.items():
            sup, _ = PharmacySupplier.objects.update_or_create(
                supplier_code=code,
                defaults={
                    'name': info['name'],
                    'category': info['cat'],
                    'lead_time_days': info['lead'],
                    'on_time_delivery_rate': info['ontime'],
                    'status': info['status'],
                    'tax_number': info['gst'],
                    'drug_license_number': info['gst'],
                    'phone': info['phone'],
                }
            )
            suppliers_map[code] = sup

        # 3. Medicines & Batches
        today = timezone.now().date()

        medicines_data = [
            ('PCM650', 'Paracetamol 650 mg tablet', 'Paracetamol', 'OTC', MedicineCategory.TABLET, 'Analgesic', 2.1, 1.6, 100, False, False, 'S1', [
                ('PCM2408A', today + timedelta(days=150), 120, 'S1', 'GRN-2608-022'),
                ('PCM2411C', today + timedelta(days=390), 400, 'S1', 'GRN-2609-039'),
            ]),
            ('CTZ10', 'Cetirizine 10 mg tablet', 'Cetirizine', 'OTC', MedicineCategory.TABLET, 'Antihistamine', 1.8, 1.2, 50, False, False, 'S4', [
                ('CTZ2406', today + timedelta(days=60), 40, 'S4', 'GRN-2606-011'),
                ('CTZ2501', today + timedelta(days=240), 200, 'S4', 'GRN-2609-033'),
            ]),
            ('MET500', 'Metformin 500 mg SR tablet', 'Metformin', 'H', MedicineCategory.TABLET, 'Antidiabetic', 1.9, 1.3, 100, False, False, 'S1', [
                ('MET2405', today + timedelta(days=45), 30, 'S4', 'GRN-2605-008'),
            ]),
            ('AMC625', 'Amoxicillin + Clavulanic acid 625 mg', 'Co-amoxiclav', 'H', MedicineCategory.TABLET, 'Antibiotic', 18.4, 15.0, 40, False, False, 'S2', [
                ('AMC2407', today + timedelta(days=110), 60, 'S2', 'GRN-2607-017'),
            ]),
            ('CEF1G', 'Ceftriaxone 1 g vial', 'Ceftriaxone', 'H', MedicineCategory.INJECTION, 'Antibiotic', 58.0, 45.0, 80, False, False, 'S2', [
                ('CEF2409', today + timedelta(days=220), 120, 'S2', 'GRN-2609-034'),
            ]),
            ('MER1G', 'Meropenem 1 g vial', 'Meropenem', 'H', MedicineCategory.INJECTION, 'Antibiotic', 540.0, 420.0, 20, False, False, 'S2', [
                ('MER2406', today + timedelta(days=60), 8, 'S2', 'GRN-2606-012'),
                ('MER2410', today + timedelta(days=300), 30, 'S2', 'GRN-2609-036'),
            ]),
            ('INSG', 'Insulin glargine 100 IU/mL pen', 'Insulin glargine', 'H', MedicineCategory.INJECTION, 'Insulin', 780.0, 600.0, 10, True, False, 'S3', []),
            ('INR', 'Insulin regular 100 IU/ml vial', 'Insulin regular', 'H', MedicineCategory.INJECTION, 'Insulin', 165.0, 120.0, 20, True, False, 'S3', [
                ('INR2409', today + timedelta(days=110), 14, 'S3', 'GRN-2609-035'),
            ]),
            ('ENX40', 'Enoxaparin 40 mg syringe', 'Enoxaparin', 'H', MedicineCategory.INJECTION, 'Anticoagulant', 310.0, 240.0, 15, True, False, 'S3', [
                ('ENX2407', today + timedelta(days=60), 3, 'S3', 'GRN-2607-019'),
            ]),
            ('SAL100', 'Salbutamol 100 mcg inhaler', 'Salbutamol', 'H', MedicineCategory.INHALER, 'Respiratory', 145.0, 110.0, 20, False, False, 'S1', [
                ('SAL2408', today + timedelta(days=190), 18, 'S1', 'GRN-2608-024'),
            ]),
            ('ANT170', 'Antacid gel 170 ml', 'Al + Mg hydroxide', 'OTC', MedicineCategory.SYRUP, 'Gastro', 112.0, 85.0, 15, False, False, 'S4', [
                ('ANT2405', today + timedelta(days=60), 12, 'S4', 'GRN-2605-009'),
            ]),
            ('CAL100', 'Calamine lotion 100 ml', 'Calamine', 'OTC', MedicineCategory.OINTMENT, 'Dermatology', 78.0, 55.0, 10, False, False, 'S4', [
                ('CAL2405', today + timedelta(days=45), 9, 'S4', 'GRN-2605-009'),
            ]),
            ('LEV75', 'Levothyroxine 75 mcg tablet', 'Levothyroxine', 'H', MedicineCategory.TABLET, 'Thyroid', 1.6, 1.1, 60, False, False, 'S1', []),
            ('TRM50', 'Tramadol 50 mg capsule', 'Tramadol', 'H1', MedicineCategory.CAPSULE, 'Analgesic', 4.6, 3.2, 40, False, True, 'S5', [
                ('TRM2407', today + timedelta(days=140), 80, 'S5', 'GRN-2607-018'),
            ]),
            ('ALP025', 'Alprazolam 0.25 mg tablet', 'Alprazolam', 'H1', MedicineCategory.TABLET, 'Anxiolytic', 4.2, 2.8, 40, False, True, 'S5', [
                ('ALP2409', today + timedelta(days=260), 90, 'S5', 'GRN-2609-032'),
            ]),
            ('MOR10', 'Morphine 10 mg/ml ampoule', 'Morphine', 'X', MedicineCategory.INJECTION, 'Opioid', 38.0, 26.0, 30, False, True, 'S5', [
                ('MOR2408', today + timedelta(days=190), 45, 'S5', 'GRN-2608-025'),
                ('MOR2311', today + timedelta(days=15), 4, 'S5', 'GRN-2311-090'),
            ]),
        ]

        meds_map = {}
        for code, name, gen, sched, cat, th, price, cost, par, cold, cd, sup_k, b_list in medicines_data:
            med, _ = PharmacyMedicine.objects.update_or_create(
                item_code=code,
                defaults={
                    'name': name,
                    'generic_name': gen,
                    'schedule': sched,
                    'category': cat,
                    'therapeutic_class': th,
                    'unit_price': price,
                    'cost_price': cost,
                    'reorder_level': par,
                    'reorder_quantity': par * 3,
                    'is_cold_chain': cold,
                    'is_narcotic': cd,
                    'default_supplier': suppliers_map[sup_k],
                    'is_active': True
                }
            )
            meds_map[code] = med

            for b_num, exp, qty, b_sup, grn_ref in b_list:
                PharmacyBatch.objects.update_or_create(
                    medicine=med,
                    batch_number=b_num,
                    defaults={
                        'supplier': suppliers_map[b_sup],
                        'manufacturing_date': exp - timedelta(days=730),
                        'expiry_date': exp,
                        'initial_quantity': qty,
                        'available_quantity': qty,
                        'cost_price': cost,
                        'mrp_price': price,
                        'is_quarantined': False,
                        'status': BatchStatus.ACTIVE,
                        'grn_reference': grn_ref,
                        'received_by': im_user
                    }
                )

        # 4. Purchase Requests & Linked POs / GRNs
        prs_data = [
            ('PR-0420', 'LEV75', 300, 'S1', PRStatus.DRAFT, 2, 'Out of stock · 1 OPD Rx on hold', {'0': '09:40', '1': '10:05', '2': '10:05'}, '', ''),
            ('PR-0418', 'MET500', 300, 'S1', PRStatus.PENDING_APPROVAL, 3, 'Below reorder level · partial dispenses', {'0': '30 Sep 16:50', '1': '30 Sep 17:05', '2': '30 Sep 17:10'}, '', ''),
            ('PR-0419', 'ENX40', 30, 'S3', PRStatus.APPROVED, 4, 'Below reorder level · Ward 2A short', {'0': '07:55', '1': '08:10', '2': '08:15', '3': '09:02'}, '', ''),
            ('PR-0417', 'INSG', 20, 'S3', PRStatus.RECEIVING, 6, 'Out of stock', {'0': '29 Sep', '1': '29 Sep', '2': '29 Sep', '3': '29 Sep', '4': '30 Sep', '5': '01 Oct 09:05'}, 'PO-1186', 'GRN-2610-041'),
            ('PR-0416', 'AMC625', 120, 'S2', PRStatus.RECEIVING, 6, 'Below reorder level', {'0': '28 Sep', '1': '28 Sep', '2': '28 Sep', '3': '28 Sep', '4': '29 Sep', '5': '01 Oct 10:20'}, 'PO-1188', 'GRN-2610-042'),
            ('PR-0414', 'CTZ10', 200, 'S4', PRStatus.REJECTED, 3, 'Seasonal demand', {'0': '27 Sep', '1': '27 Sep', '2': '27 Sep', '3': '27 Sep'}, '', ''),
            ('PR-0412', 'PCM650', 400, 'S1', PRStatus.CLOSED, 8, 'Reorder level reached', {'0': '26 Sep', '1': '26 Sep', '2': '26 Sep', '3': '26 Sep', '4': '27 Sep', '5': '30 Sep', '6': '30 Sep', '7': '30 Sep 16:40'}, 'PO-1179', 'GRN-2609-039'),
        ]

        prs_map = {}
        for pr_no, med_k, qty, sup_k, st, stage, note, hist, po_no, grn_no in prs_data:
            pr, _ = PharmacyPurchaseRequest.objects.update_or_create(
                pr_number=pr_no,
                defaults={
                    'requested_by': im_user,
                    'supplier': suppliers_map[sup_k],
                    'priority': PRPriority.ROUTINE,
                    'status': st,
                    'workflow_stage': stage,
                    'notes': note,
                    'purchase_order_number': po_no,
                    'goods_receipt_number': grn_no,
                    'history_timestamps': hist
                }
            )
            prs_map[pr_no] = pr

            PharmacyPurchaseRequestItem.objects.update_or_create(
                purchase_request=pr,
                medicine=meds_map[med_k],
                defaults={
                    'requested_quantity': qty,
                    'estimated_unit_cost': meds_map[med_k].cost_price
                }
            )

        # 5. Goods Receipts (GRN)
        grns_data = [
            ('GRN-2610-042', 'S2', 'PO-1188', 'PR-0416', 'APX/INV/77412', GoodsReceiptStatus.PENDING_QC, False, [('AMC625', 'AMC2410', today + timedelta(days=340), 120, 15.9)], {}),
            ('GRN-2610-041', 'S3', 'PO-1186', 'PR-0417', 'CCB/5521', GoodsReceiptStatus.PENDING_QC, True, [('INSG', 'INS2410', today + timedelta(days=160), 20, 690.0)], {}),
            ('GRN-2609-039', 'S1', 'PO-1179', 'PR-0412', 'MLD/22981', GoodsReceiptStatus.POSTED, False, [('PCM650', 'PCM2411C', today + timedelta(days=400), 400, 1.6)], {'0': True, '1': True, '2': True, '3': True}),
        ]

        for grn_no, sup_k, po_no, pr_no, inv_no, st, cold, lines, checks in grns_data:
            grn, _ = PharmacyGoodsReceipt.objects.update_or_create(
                grn_number=grn_no,
                defaults={
                    'supplier': suppliers_map[sup_k],
                    'purchase_request': prs_map.get(pr_no),
                    'invoice_number': inv_no,
                    'is_cold_chain': cold,
                    'status': st,
                    'qc_checks': checks,
                    'received_by': im_user
                }
            )
            for m_code, b_no, exp, qty, cost in lines:
                PharmacyGoodsReceiptItem.objects.update_or_create(
                    goods_receipt=grn,
                    medicine=meds_map[m_code],
                    batch_number=b_no,
                    defaults={
                        'expiry_date': exp,
                        'received_quantity': qty,
                        'unit_cost': cost
                    }
                )

        # 6. Adjustments
        adjs_data = [
            ('ADJ-0231', 'ENX40', 'ENX2407', -4, 'Damage', AdjustmentStatus.POSTED, '4 syringes broken in transit'),
            ('ADJ-0230', 'MOR10', 'MOR2311', -1, 'Physical count', AdjustmentStatus.PENDING_APPROVAL, 'Register 5 · shelf 4'),
            ('ADJ-0228', 'CAL100', 'CAL2405', -2, 'Damage', AdjustmentStatus.POSTED, 'Leaking bottles'),
        ]

        for adj_no, m_code, b_no, delta, reason, st, note in adjs_data:
            b = PharmacyBatch.objects.filter(batch_number=b_no).first()
            if b:
                PharmacyStockAdjustment.objects.update_or_create(
                    adjustment_number=adj_no,
                    defaults={
                        'medicine': meds_map[m_code],
                        'batch': b,
                        'quantity_delta': delta,
                        'reason': reason,
                        'status': st,
                        'note': note,
                        'adjusted_by': im_user
                    }
                )

        # 7. Transfers
        transfers_data = [
            ('TR-0087', 'SAL100', 6, 'OPD Counter 2', TransferStatus.REQUESTED),
            ('TR-0086', 'CEF1G', 20, 'IPD store', TransferStatus.DISPATCHED),
            ('TR-0084', 'PCM650', 100, 'OPD Counter 1', TransferStatus.RECEIVED),
        ]

        for tr_no, m_code, qty, dest, st in transfers_data:
            PharmacyTransferRequest.objects.update_or_create(
                transfer_number=tr_no,
                defaults={
                    'medicine': meds_map[m_code],
                    'quantity': qty,
                    'destination': dest,
                    'requested_by': im_user,
                    'status': st
                }
            )

        # 8. Controlled Drug Register
        cd_data = [
            ('CDR-0914', 'TRM50', 'TRM2407', 10, 80, 'Dr. Pooja Shah', 'RX-24121 · Salman Khan'),
            ('CDR-0913', 'MOR10', 'MOR2408', 1, 45, 'Rina Thomas (ICU)', 'RW-030 · ICU Bed 5'),
            ('CDR-0912', 'MOR10', 'MOR2408', 5, 44, 'Rina Thomas (ICU)', 'WR-5503 · Imran Qureshi'),
            ('CDR-0911', 'ALP025', 'ALP2409', 10, 90, 'Karthik N', 'DSP-1042 · Imran Qureshi'),
            ('CDR-0910', 'ALP025', 'ALP2409', 100, 100, 'Dr. Pooja Shah', 'GRN-2609-032'),
        ]

        for cd_no, m_code, b_no, qty, bal, wit, ref in cd_data:
            b = PharmacyBatch.objects.filter(batch_number=b_no).first()
            if b:
                PharmacyControlledDrugRegister.objects.update_or_create(
                    entry_number=cd_no,
                    defaults={
                        'medicine': meds_map[m_code],
                        'batch': b,
                        'patient': None,
                        'prescribing_doctor_name': ref,
                        'doctor_license_number': 'REG-HOSP-AUTH',
                        'quantity_dispensed': qty,
                        'balance_stock_after': bal,
                        'primary_pharmacist': im_user,
                        'witness_staff': admin_user,
                        'witness_role': f"Witness · {wit}",
                        'dispense_order': None
                    }
                )

        self.stdout.write(self.style.SUCCESS("Successfully seeded pharmacy inventory records!"))
