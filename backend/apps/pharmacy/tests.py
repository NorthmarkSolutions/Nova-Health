import uuid
from datetime import date, timedelta
from django.test import TestCase
from django.utils import timezone
from django.db.utils import IntegrityError
from apps.accounts.models import User, RoleType
from apps.patients.models import Patient
from apps.ipd.models import InpatientAdmission, MedicationAdministration
from apps.pharmacy.models import (
    PharmacyMedicine,
    PharmacySupplier,
    PharmacyPurchaseRequest,
    PharmacyPurchaseRequestItem,
    PharmacyPurchaseOrder,
    PharmacyPurchaseOrderItem,
    PharmacyBatch,
    PharmacyStockTransaction,
    PharmacyDispenseOrder,
    PharmacyDispenseOrderItem,
    PharmacyOTCSale,
    PharmacyOTCSaleItem,
    PharmacyReturn,
    PharmacyReturnItem,
    PharmacyControlledDrugRegister,
    PharmacyVaultReconciliation,
    PharmacyGoodsReceipt,
    PharmacyGoodsReceiptItem,
    PharmacyStockAdjustment,
    PharmacyTransferRequest,
    PharmacyDutySchedule,
    PharmacyGovernanceAuditLog,
    PharmacyDepartmentSetting,
    GoodsReceiptStatus,
    AdjustmentStatus,
    TransferStatus,
    MedicineCategory,
    PRPriority,
    PRStatus,
    POStatus,
    BatchStatus,
    StockTransactionType,
    EncounterType,
    SettlementMode,
    DispensePaymentStatus,
    DispenseOrderStatus,
    ReturnAction,
    ReturnType,
)
from apps.pharmacy.serializers import (
    PharmacyMedicineSerializer,
    PharmacyBatchSerializer,
    PharmacyDispenseOrderSerializer,
)
from apps.pharmacy.services import PharmacyStockService

class PharmacyDatabaseModelsTestCase(TestCase):
    def setUp(self):
        self.pharmacist = User.objects.create_user(
            username='pharmacist1',
            password='Password123!',
            role=RoleType.PHARMACIST,
            first_name='Sarah',
            last_name='Connor'
        )
        self.nurse = User.objects.create_user(
            username='nurse1',
            password='Password123!',
            role=RoleType.NURSE,
            first_name='Priya',
            last_name='Sharma'
        )
        self.patient = Patient.objects.create(
            uhid='UHID-TEST-0001',
            first_name='John',
            last_name='Doe',
            date_of_birth='1985-05-15',
            gender='MALE',
            phone_number='+1555123456'
        )
        self.supplier = PharmacySupplier.objects.create(
            supplier_code='SUP-TEST-01',
            name='Apex Pharma Distributors',
            phone='+1555987654',
            drug_license_number='DL-APEX-8891'
        )
        self.medicine = PharmacyMedicine.objects.create(
            item_code='MED-PAR-500',
            name='Paracetamol 500mg',
            generic_name='Paracetamol',
            category=MedicineCategory.TABLET,
            unit_price=0.50,
            cost_price=0.20,
            reorder_level=50,
            reorder_quantity=200,
            is_narcotic=False
        )

    def test_medicine_creation_and_serializer(self):
        self.assertEqual(self.medicine.item_code, 'MED-PAR-500')
        serializer = PharmacyMedicineSerializer(self.medicine)
        self.assertEqual(serializer.data['available_stock'], 0)

    def test_batch_creation_and_fefo_stock(self):
        batch = PharmacyBatch.objects.create(
            medicine=self.medicine,
            supplier=self.supplier,
            batch_number='B-2026-001',
            manufacturing_date=date.today() - timedelta(days=30),
            expiry_date=date.today() + timedelta(days=365),
            initial_quantity=100,
            available_quantity=100,
            cost_price=0.20,
            received_by=self.pharmacist
        )
        self.assertEqual(batch.available_quantity, 100)
        serializer = PharmacyMedicineSerializer(self.medicine)
        self.assertEqual(serializer.data['available_stock'], 100)

    def test_stock_transaction_audit(self):
        batch = PharmacyBatch.objects.create(
            medicine=self.medicine,
            supplier=self.supplier,
            batch_number='B-2026-002',
            manufacturing_date=date.today() - timedelta(days=30),
            expiry_date=date.today() + timedelta(days=365),
            initial_quantity=100,
            available_quantity=100,
            cost_price=0.20,
            received_by=self.pharmacist
        )
        tx = PharmacyStockTransaction.objects.create(
            medicine=self.medicine,
            batch=batch,
            transaction_type=StockTransactionType.RECEIVE_PO,
            quantity_delta=100,
            balance_after=100,
            reference_type='PURCHASE_ORDER',
            performed_by=self.pharmacist
        )
        self.assertEqual(tx.quantity_delta, 100)
        self.assertEqual(tx.balance_after, 100)

    def test_dispense_order_with_settlement_modes(self):
        batch = PharmacyBatch.objects.create(
            medicine=self.medicine,
            supplier=self.supplier,
            batch_number='B-2026-003',
            manufacturing_date=date.today() - timedelta(days=30),
            expiry_date=date.today() + timedelta(days=365),
            initial_quantity=50,
            available_quantity=50,
            cost_price=0.20,
            received_by=self.pharmacist
        )
        dispense = PharmacyDispenseOrder.objects.create(
            order_number='DSP-TEST-0001',
            patient=self.patient,
            encounter_type=EncounterType.OPD,
            settlement_mode=SettlementMode.PAY_AT_PHARMACY,
            payment_status=DispensePaymentStatus.PAID,
            total_amount=10.00,
            status=DispenseOrderStatus.DISPENSED,
            dispensed_by=self.pharmacist
        )
        item = PharmacyDispenseOrderItem.objects.create(
            dispense_order=dispense,
            medicine=self.medicine,
            batch=batch,
            prescribed_quantity=20,
            dispensed_quantity=20,
            unit_price=0.50,
            line_total=10.00
        )
        self.assertEqual(dispense.items.count(), 1)
        serializer = PharmacyDispenseOrderSerializer(dispense)
        self.assertEqual(serializer.data['patient_name'], 'John Doe')
        self.assertEqual(serializer.data['settlement_mode'], 'PAY_AT_PHARMACY')

    def test_controlled_drug_register_dual_witness(self):
        narcotic = PharmacyMedicine.objects.create(
            item_code='MED-MOR-010',
            name='Morphine 10mg/mL',
            generic_name='Morphine Sulfate',
            category=MedicineCategory.INJECTION,
            unit_price=12.00,
            cost_price=6.00,
            is_narcotic=True
        )
        batch = PharmacyBatch.objects.create(
            medicine=narcotic,
            supplier=self.supplier,
            batch_number='MOR-VAULT-01',
            manufacturing_date=date.today() - timedelta(days=60),
            expiry_date=date.today() + timedelta(days=700),
            initial_quantity=30,
            available_quantity=28,
            cost_price=6.00,
            received_by=self.pharmacist
        )
        dispense = PharmacyDispenseOrder.objects.create(
            order_number='DSP-NAR-0001',
            patient=self.patient,
            encounter_type=EncounterType.IPD,
            settlement_mode=SettlementMode.IPD_RUNNING_BILL,
            payment_status=DispensePaymentStatus.UNPAID,
            total_amount=24.00,
            status=DispenseOrderStatus.DISPENSED,
            dispensed_by=self.pharmacist
        )
        log = PharmacyControlledDrugRegister.objects.create(
            entry_number='NAR-202610-0001',
            medicine=narcotic,
            batch=batch,
            patient=self.patient,
            prescribing_doctor_name='Dr. Kevin Vance',
            doctor_license_number='MCI-SURG-88192',
            quantity_dispensed=2,
            balance_stock_after=28,
            primary_pharmacist=self.pharmacist,
            witness_staff=self.nurse,
            witness_role='ICU Head Nurse',
            dispense_order=dispense
        )
        self.assertEqual(log.quantity_dispensed, 2)
        self.assertEqual(log.witness_staff.username, 'nurse1')


from rest_framework.test import APITestCase

class PharmacyInventoryManagerAPITestCase(APITestCase):
    def setUp(self):
        self.im_user = User.objects.create_user(
            username='inventory_mgr_test',
            password='Password123!',
            role=RoleType.INVENTORY_MANAGER,
            first_name='Rajesh',
            last_name='Kumar'
        )
        self.client.force_authenticate(user=self.im_user)

        self.supplier = PharmacySupplier.objects.create(
            supplier_code='SUP-01',
            name='MedLine Distributors',
            phone='+91 80 12345678',
            drug_license_number='DL-MED-01',
            lead_time_days=3,
            on_time_delivery_rate=96.0
        )
        self.medicine = PharmacyMedicine.objects.create(
            item_code='PCM650',
            name='Paracetamol 650 mg tablet',
            generic_name='Paracetamol',
            category=MedicineCategory.TABLET,
            schedule='OTC',
            unit_price=2.10,
            cost_price=1.60,
            reorder_level=100,
            reorder_quantity=300,
            default_supplier=self.supplier
        )
        self.batch = PharmacyBatch.objects.create(
            medicine=self.medicine,
            supplier=self.supplier,
            batch_number='PCM2408A',
            manufacturing_date=date.today() - timedelta(days=90),
            expiry_date=date.today() + timedelta(days=180),
            initial_quantity=50,
            available_quantity=50,
            cost_price=1.60,
            mrp_price=2.10,
            received_by=self.im_user,
            status=BatchStatus.ACTIVE
        )

    def test_inventory_kpis_endpoint(self):
        response = self.client.get('/api/pharmacy/inventory/kpis/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['total_skus'], 1)
        self.assertEqual(response.data['low_stock_count'], 1) # 50 < 100 par
        self.assertEqual(response.data['stock_valuation'], 80.0) # 50 * 1.60

    def test_medicines_list_endpoint(self):
        response = self.client.get('/api/pharmacy/medicines/?pill=low')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['item_code'], 'PCM650')

    def test_bulk_reorder_endpoint(self):
        response = self.client.post('/api/pharmacy/purchase-requests/bulk-reorder/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(PharmacyPurchaseRequest.objects.count(), 1)
        pr = PharmacyPurchaseRequest.objects.first()
        self.assertEqual(pr.status, 'Draft')

    def test_pr_workflow_transitions(self):
        pr_response = self.client.post('/api/pharmacy/purchase-requests/', {
            'medicine_id': str(self.medicine.id),
            'quantity': 250,
            'supplier_id': str(self.supplier.id),
            'notes': 'Urgent requirement'
        })
        self.assertEqual(pr_response.status_code, 201)
        pr_id = pr_response.data['id']

        # 1. Submit for approval
        sub_resp = self.client.post(f'/api/pharmacy/purchase-requests/{pr_id}/transition/', {'action': 'submit'})
        self.assertEqual(sub_resp.data['status'], 'Pending approval')

        # 2. Approve
        app_resp = self.client.post(f'/api/pharmacy/purchase-requests/{pr_id}/transition/', {'action': 'approve'})
        self.assertEqual(app_resp.data['status'], 'Approved')

        # 3. Issue PO
        po_resp = self.client.post(f'/api/pharmacy/purchase-requests/{pr_id}/transition/', {'action': 'issue_po'})
        self.assertEqual(po_resp.data['status'], 'PO issued')
        self.assertTrue(PharmacyPurchaseOrder.objects.filter(purchase_request_id=pr_id).exists())

        # 4. Record Delivery
        rec_resp = self.client.post(f'/api/pharmacy/purchase-requests/{pr_id}/transition/', {'action': 'record_delivery'})
        self.assertEqual(rec_resp.data['status'], 'Receiving')
        self.assertTrue(PharmacyGoodsReceipt.objects.filter(purchase_request_id=pr_id).exists())

    def test_goods_receipt_posting(self):
        grn = PharmacyGoodsReceipt.objects.create(
            grn_number='GRN-TEST-001',
            supplier=self.supplier,
            invoice_number='INV-TEST-01',
            received_by=self.im_user,
            status=GoodsReceiptStatus.PENDING_QC
        )
        PharmacyGoodsReceiptItem.objects.create(
            goods_receipt=grn,
            medicine=self.medicine,
            batch_number='PCM2501X',
            expiry_date=date.today() + timedelta(days=365),
            received_quantity=200,
            unit_cost=1.60
        )

        post_resp = self.client.post(f'/api/pharmacy/goods-receipts/{grn.id}/post/', {
            'checks': {'quantities_match': True, 'batches_captured': True, 'packaging_intact': True}
        }, format='json')
        self.assertEqual(post_resp.status_code, 200)
        self.assertEqual(post_resp.data['status'], 'Posted')

        # Verify batch was created and live
        new_batch = PharmacyBatch.objects.get(batch_number='PCM2501X')
        self.assertEqual(new_batch.available_quantity, 200)
        self.assertEqual(new_batch.status, 'Active')
        self.assertEqual(PharmacyStockService.get_medicine_stock(self.medicine.id), 250) # 50 + 200

    def test_stock_adjustment_creation(self):
        # Small non-CD adjustment should auto-post
        adj_resp = self.client.post('/api/pharmacy/stock-adjustments/', {
            'medicine_id': str(self.medicine.id),
            'batch_id': str(self.batch.id),
            'quantity_delta': -5,
            'reason': 'Damage',
            'note': 'Broken foil'
        })
        self.assertEqual(adj_resp.status_code, 201)
        self.assertEqual(adj_resp.data['status'], 'Posted')
        self.batch.refresh_from_db()
        self.assertEqual(self.batch.available_quantity, 45) # 50 - 5

    def test_transfer_request_dispatch_and_receive(self):
        tr_resp = self.client.post('/api/pharmacy/transfers/', {
            'medicine_id': str(self.medicine.id),
            'quantity': 10,
            'destination': 'OPD Counter 1'
        })
        self.assertEqual(tr_resp.status_code, 201)
        tr_id = tr_resp.data['id']

        disp_resp = self.client.post(f'/api/pharmacy/transfers/{tr_id}/dispatch/')
        self.assertEqual(disp_resp.status_code, 200)
        self.assertEqual(disp_resp.data['status'], 'Dispatched')
        self.batch.refresh_from_db()
        self.assertEqual(self.batch.available_quantity, 40) # 50 - 10

        recv_resp = self.client.post(f'/api/pharmacy/transfers/{tr_id}/receive/')
        self.assertEqual(recv_resp.status_code, 200)
        self.assertEqual(recv_resp.data['status'], 'Received')

    def test_controlled_drug_verify_count(self):
        resp = self.client.post('/api/pharmacy/controlled-drugs/verify-count/', {
            'batch_id': str(self.batch.id),
            'physical_count': 50
        })
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data['matches'])
        self.assertEqual(resp.data['difference'], 0)


class Phase3DoctorPharmacyIntegrationTestCase(APITestCase):
    def setUp(self):
        self.doctor_user = User.objects.create_user(
            username='doctor_test',
            password='Password123!',
            role=RoleType.DOCTOR,
            first_name='Marcus',
            last_name='Welby'
        )
        self.pharmacist = User.objects.create_user(
            username='pharmacist_test',
            password='Password123!',
            role=RoleType.PHARMACIST,
            first_name='Lisa',
            last_name='Cuddy'
        )
        self.patient_penicillin_allergic = Patient.objects.create(
            uhid='UHID-2026-P3001',
            first_name='John',
            last_name='Doe',
            date_of_birth='1985-05-15',
            gender='MALE',
            phone_number='9876543210',
            allergies=['Penicillin', 'Dust']
        )
        self.patient_aspirin_allergic = Patient.objects.create(
            uhid='UHID-2026-P3002',
            first_name='Jane',
            last_name='Smith',
            date_of_birth='1990-08-20',
            gender='FEMALE',
            phone_number='9876543211',
            allergies=['Aspirin']
        )
        self.patient_no_allergies = Patient.objects.create(
            uhid='UHID-2026-P3003',
            first_name='Bob',
            last_name='Johnson',
            date_of_birth='1975-01-10',
            gender='MALE',
            phone_number='9876543212',
            allergies=[]
        )

        # Formularies
        self.amoxicillin = PharmacyMedicine.objects.create(
            item_code='MED-AMOX-500',
            name='Amoxicillin 500mg Capsule',
            generic_name='Amoxicillin',
            category=MedicineCategory.CAPSULE,
            therapeutic_class='Penicillin Antibiotic',
            unit_price=12.50,
            cost_price=8.00,
            reorder_level=50,
            reorder_quantity=200,
            known_allergens=['Penicillin', 'Beta-lactam'],
            requires_prescription=True,
            is_active=True
        )
        self.batch_amox = PharmacyBatch.objects.create(
            medicine=self.amoxicillin,
            batch_number='AMX-2026-01',
            manufacturing_date=date.today() - timedelta(days=60),
            expiry_date=date.today() + timedelta(days=365),
            initial_quantity=500,
            available_quantity=500,
            cost_price=8.00,
            mrp_price=15.00,
            received_by=self.pharmacist,
            status=BatchStatus.ACTIVE
        )

        self.ibuprofen = PharmacyMedicine.objects.create(
            item_code='MED-IBU-400',
            name='Ibuprofen 400mg Tablet',
            generic_name='Ibuprofen',
            category=MedicineCategory.TABLET,
            therapeutic_class='NSAID / Analgesic',
            unit_price=6.00,
            cost_price=4.00,
            reorder_level=50,
            reorder_quantity=200,
            known_allergens=['NSAIDs'],
            requires_prescription=False,
            is_active=True
        )
        self.batch_ibu = PharmacyBatch.objects.create(
            medicine=self.ibuprofen,
            batch_number='IBU-2026-01',
            manufacturing_date=date.today() - timedelta(days=30),
            expiry_date=date.today() + timedelta(days=400),
            initial_quantity=300,
            available_quantity=300,
            cost_price=4.00,
            mrp_price=8.00,
            received_by=self.pharmacist,
            status=BatchStatus.ACTIVE
        )

        self.client.force_authenticate(user=self.doctor_user)

    def test_allergy_direct_and_cross_reactivity(self):
        from apps.pharmacy.services import PharmacyAllergyService

        # 1. Direct match: Patient allergic to Penicillin -> Prescribed Amoxicillin (known_allergen: Penicillin)
        res1 = PharmacyAllergyService.check_allergy(self.patient_penicillin_allergic, self.amoxicillin)
        self.assertTrue(res1['has_conflict'])
        self.assertEqual(res1['severity'], 'CRITICAL')
        self.assertIn('Penicillin', res1['matched_allergen'])

        # 2. Cross-reactivity: Patient allergic to Aspirin -> Prescribed Ibuprofen (NSAID cross-reactivity)
        res2 = PharmacyAllergyService.check_allergy(self.patient_aspirin_allergic, self.ibuprofen)
        self.assertTrue(res2['has_conflict'])
        self.assertEqual(res2['severity'], 'HIGH_CROSS_REACTIVITY')

        # 3. No conflict: Patient with no allergies
        res3 = PharmacyAllergyService.check_allergy(self.patient_no_allergies, self.amoxicillin)
        self.assertFalse(res3['has_conflict'])

    def test_prescription_handoff_strict_read_only_invariant(self):
        from apps.clinical.models import Prescription, PrescriptionItem
        from apps.pharmacy.services import PharmacyClinicalHandoffService

        # Record initial stock quantities and transaction counts
        initial_amox_stock = self.batch_amox.available_quantity
        initial_tx_count = PharmacyStockTransaction.objects.count()

        # Doctor creates prescription
        rx = Prescription.objects.create(
            patient=self.patient_penicillin_allergic,
            prescription_number='RX-2026-TEST-001',
            instructions='Take after food',
            status='ACTIVE'
        )
        PrescriptionItem.objects.create(
            prescription=rx,
            medication_name='Amoxicillin 500mg Capsule',
            dosage='500mg',
            frequency='1-0-1',
            duration_days=5
        )

        # Handoff to Pharmacy Queue
        dispense_order = PharmacyClinicalHandoffService.create_dispense_order_from_prescription(rx)

        # 1. Verify queue order was created with correct header fields
        self.assertIsNotNone(dispense_order)
        self.assertEqual(dispense_order.status, DispenseOrderStatus.PENDING)
        self.assertEqual(dispense_order.encounter_type, EncounterType.OPD)
        self.assertEqual(dispense_order.items.count(), 1)

        item = dispense_order.items.first()
        self.assertEqual(item.medicine, self.amoxicillin)
        self.assertEqual(item.prescribed_quantity, 10)  # 5 days * 2 = 10
        self.assertEqual(item.dispensed_quantity, 0)
        self.assertIsNone(item.batch)  # READ-ONLY INVARIANT: no batch allocated!

        # 2. Verify Allergy Alert was flagged on the queue order
        self.assertTrue(dispense_order.has_allergy_warning)
        self.assertEqual(len(dispense_order.allergy_warning_details), 1)

        # 3. CRITICAL READ-ONLY INVARIANT CHECKS:
        # Batch stock must be COMPLETELY UNCHANGED
        self.batch_amox.refresh_from_db()
        self.assertEqual(self.batch_amox.available_quantity, initial_amox_stock)

        # Zero stock transactions created
        self.assertEqual(PharmacyStockTransaction.objects.count(), initial_tx_count)

        # Zero billing invoices created
        self.assertIsNone(dispense_order.billing_invoice)

    def test_clinical_handoff_api_endpoint(self):
        resp = self.client.post('/api/v1/pharmacy/prescriptions/handoff/', {
            'uhid': self.patient_no_allergies.uhid,
            'encounter_type': 'OPD',
            'doctor_name': 'Dr. Marcus Welby',
            'priority': 'URGENT',
            'diagnosis': 'Acute Bacterial Pharyngitis',
            'instructions': 'Complete 5-day course',
            'medications': [
                {
                    'medicationName': 'Amoxicillin 500mg Capsule',
                    'dosage': '500mg (1 Cap)',
                    'frequency': '1-0-1',
                    'durationDays': 5
                },
                {
                    'medicationName': 'Ibuprofen 400mg Tablet',
                    'dosage': '400mg (1 Tab)',
                    'frequency': '1-0-0 SOS',
                    'durationDays': 3
                }
            ]
        }, format='json')

        self.assertEqual(resp.status_code, 201)
        self.assertTrue(resp.data['success'])
        self.assertTrue(resp.data['read_only_verified'])
        self.assertFalse(resp.data['inventory_mutated'])
        self.assertFalse(resp.data['billing_mutated'])

        order_data = resp.data['dispense_order']
        self.assertEqual(order_data['status'], 'PENDING')
        self.assertEqual(order_data['priority'], 'URGENT')
        self.assertEqual(len(order_data['items']), 2)

        # Verify items have suggested_fefo_batch (read-only) but batch is None
        for itm in order_data['items']:
            self.assertIsNone(itm['batch'])
            self.assertEqual(itm['dispensed_quantity'], 0)
            self.assertIsNotNone(itm['suggested_fefo_batch'])

    def test_allergy_check_api_endpoint(self):
        resp = self.client.post('/api/v1/pharmacy/prescriptions/check-allergies/', {
            'uhid': self.patient_penicillin_allergic.uhid,
            'medications': [
                {'name': 'Amoxicillin 500mg Capsule'},
                {'name': 'Ibuprofen 400mg Tablet'}
            ]
        }, format='json')

        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data['has_allergy_conflict'])
        amox_result = next(m for m in resp.data['medications'] if 'Amoxicillin' in m['medicine_name'])
        self.assertTrue(amox_result['has_allergy_conflict'])
        self.assertEqual(amox_result['severity'], 'CRITICAL')
        self.assertIn('Penicillin', amox_result['matched_allergen'])

    def test_pharmacy_queue_claim_and_override_allergy(self):
        from apps.clinical.models import Prescription, PrescriptionItem
        from apps.pharmacy.services import PharmacyClinicalHandoffService

        rx = Prescription.objects.create(
            patient=self.patient_penicillin_allergic,
            prescription_number='RX-2026-CLAIM-001',
            status='ACTIVE'
        )
        PrescriptionItem.objects.create(
            prescription=rx,
            medication_name='Amoxicillin 500mg Capsule',
            dosage='500mg',
            frequency='1-0-1',
            duration_days=5
        )
        order = PharmacyClinicalHandoffService.create_dispense_order_from_prescription(rx)

        # Pharmacist logs in
        self.client.force_authenticate(user=self.pharmacist)

        # 1. Claim order
        claim_resp = self.client.post(f'/api/v1/pharmacy/dispense-queue/{order.id}/claim/')
        self.assertEqual(claim_resp.status_code, 200)
        self.assertEqual(claim_resp.data['status'], 'UNDER_REVIEW')

        # 2. Override allergy with mandatory justification
        override_resp = self.client.post(f'/api/v1/pharmacy/dispense-queue/{order.id}/override-allergy/', {
            'reason': 'Patient confirmed previous mild childhood rash only; physician consulted and advised proceeding with desensitization observation.'
        }, format='json')
        self.assertEqual(override_resp.status_code, 200)
        self.assertIn('rash only', override_resp.data['allergy_override_reason'])


from rest_framework.test import APITestCase

class PharmacyOPDPharmacistPhase4TestCase(APITestCase):
    def setUp(self):
        self.pharmacist = User.objects.create_user(
            username='pharmacist_opd',
            password='Password123!',
            role=RoleType.PHARMACIST,
            first_name='Arjun',
            last_name='Varma'
        )
        self.witness = User.objects.create_user(
            username='pharmacist_witness',
            password='Password123!',
            role=RoleType.PHARMACIST,
            first_name='Pooja',
            last_name='Shah'
        )
        self.patient = Patient.objects.create(
            first_name='Anil',
            last_name='Kumar',
            uhid='UHID-202610-00101',
            date_of_birth=date(1985, 5, 20),
            gender='M',
            phone_number='9876543210'
        )
        self.supplier = PharmacySupplier.objects.create(
            supplier_code='SUP-001',
            name='Standard Pharma Ltd',
            phone='9876543210',
            drug_license_number='DL-2026-001'
        )
        self.pcm650 = PharmacyMedicine.objects.create(
            item_code='PCM650',
            name='Paracetamol 650 mg tablet',
            generic_name='Paracetamol',
            category=MedicineCategory.TABLET,
            unit_price=2.10,
            cost_price=1.50,
            schedule='OTC',
            requires_prescription=False
        )
        self.batch_pcm1 = PharmacyBatch.objects.create(
            batch_number='PCM2408A',
            medicine=self.pcm650,
            supplier=self.supplier,
            manufacturing_date=date(2024, 8, 1),
            expiry_date=date(2027, 3, 1), # earlier expiry
            initial_quantity=200,
            available_quantity=100,
            cost_price=1.50,
            received_by=self.pharmacist
        )
        self.batch_pcm2 = PharmacyBatch.objects.create(
            batch_number='PCM2411C',
            medicine=self.pcm650,
            supplier=self.supplier,
            manufacturing_date=date(2024, 11, 1),
            expiry_date=date(2027, 11, 1), # later expiry
            initial_quantity=500,
            available_quantity=400,
            cost_price=1.50,
            received_by=self.pharmacist
        )
        self.tramadol = PharmacyMedicine.objects.create(
            item_code='TRM50',
            name='Tramadol 50 mg capsule',
            generic_name='Tramadol',
            category=MedicineCategory.CAPSULE,
            unit_price=4.60,
            cost_price=3.00,
            schedule='H1',
            is_narcotic=True,
            requires_prescription=True
        )
        self.batch_trm = PharmacyBatch.objects.create(
            batch_number='TRM2407',
            medicine=self.tramadol,
            supplier=self.supplier,
            manufacturing_date=date(2024, 7, 1),
            expiry_date=date(2027, 2, 1),
            initial_quantity=100,
            available_quantity=80,
            cost_price=3.00,
            received_by=self.pharmacist
        )

    def test_opd_kpis_endpoint(self):
        resp = self.client.get('/api/v1/pharmacy/opd/kpis/')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('pending_verification', resp.data)
        self.assertIn('stat_count', resp.data)
        self.assertIn('otc_sales_today', resp.data)
        self.assertIn('otc_revenue_today', resp.data)
        self.assertIn('pending_returns', resp.data)
        self.assertIn('refund_requests_due', resp.data)
        self.assertIn('cd_entries_today', resp.data)

    def test_queue_sorting_stat_always_first(self):
        # Create routine, urgent, and STAT orders
        order_routine = PharmacyDispenseOrder.objects.create(
            order_number='PH-DISP-ROUTINE',
            patient=self.patient,
            priority='ROUTINE',
            encounter_type='OPD',
            status='PENDING'
        )
        order_urgent = PharmacyDispenseOrder.objects.create(
            order_number='PH-DISP-URGENT',
            patient=self.patient,
            priority='URGENT',
            encounter_type='OPD',
            status='PENDING'
        )
        order_stat = PharmacyDispenseOrder.objects.create(
            order_number='PH-DISP-STAT',
            patient=self.patient,
            priority='STAT',
            encounter_type='OPD',
            status='PENDING'
        )

        resp = self.client.get('/api/v1/pharmacy/dispense-queue/?encounter_type=OPD')
        self.assertEqual(resp.status_code, 200)
        items = resp.data['results'] if 'results' in resp.data else resp.data
        order_numbers = [item['order_number'] for item in items]
        
        # STAT must appear before URGENT, and URGENT before ROUTINE
        stat_idx = order_numbers.index('PH-DISP-STAT')
        urgent_idx = order_numbers.index('PH-DISP-URGENT')
        routine_idx = order_numbers.index('PH-DISP-ROUTINE')
        self.assertLess(stat_idx, urgent_idx)
        self.assertLess(urgent_idx, routine_idx)

    def test_payment_recording_and_receipt_verification(self):
        self.client.force_authenticate(user=self.pharmacist)
        order = PharmacyDispenseOrder.objects.create(
            order_number='PH-DISP-PAY-001',
            patient=self.patient,
            total_amount=100.00,
            settlement_mode='PAY_AT_PHARMACY',
            payment_status='UNPAID',
            encounter_type='OPD',
            status='UNDER_REVIEW'
        )

        # 1. Counter payment recording
        pay_resp = self.client.post(f'/api/v1/pharmacy/dispense-queue/{order.id}/record-payment/', {
            'method': 'UPI',
            'amount_received': 100.00,
            'reference': 'UPI-REF-9988'
        }, format='json')
        self.assertEqual(pay_resp.status_code, 200)
        self.assertEqual(pay_resp.data['payment_status'], 'PAID')
        self.assertEqual(pay_resp.data['payment_method'], 'UPI')

        # 2. Reception receipt verification
        order2 = PharmacyDispenseOrder.objects.create(
            order_number='PH-DISP-REC-002',
            patient=self.patient,
            total_amount=75.00,
            settlement_mode='PAY_AT_RECEPTION',
            payment_status='UNPAID',
            encounter_type='OPD',
            status='UNDER_REVIEW'
        )
        rec_resp = self.client.post(f'/api/v1/pharmacy/dispense-queue/{order2.id}/verify-receipt/', {
            'receipt_no': 'RCP-2610-0988'
        }, format='json')
        self.assertEqual(rec_resp.status_code, 200)
        self.assertEqual(rec_resp.data['payment_status'], 'PAID')
        self.assertEqual(rec_resp.data['payment_reference'], 'RCP-2610-0988')

    def test_atomic_dispense_order_fefo_and_cd_register(self):
        self.client.force_authenticate(user=self.pharmacist)

        # Create order with Tramadol (Narcotic/CD)
        order = PharmacyDispenseOrder.objects.create(
            order_number='PH-DISP-CD-001',
            patient=self.patient,
            total_amount=46.00,
            settlement_mode='PAY_AT_PHARMACY',
            payment_status='PAID',
            encounter_type='OPD',
            status='UNDER_REVIEW',
            doctor_name='Dr. Vikram Rao'
        )
        item = PharmacyDispenseOrderItem.objects.create(
            dispense_order=order,
            medicine=self.tramadol,
            prescribed_quantity=10,
            dispensed_quantity=0,
            unit_price=4.60,
            line_total=46.00
        )

        initial_batch_qty = self.batch_trm.available_quantity # 80

        # Execute dispense
        disp_resp = self.client.post(f'/api/v1/pharmacy/dispense-queue/{order.id}/dispense/', {
            'counseling': {'dosage': True, 'timing': True, 'side_effects': True, 'storage': True, 'language': 'English'},
            'cd_data': {'witness_id': str(self.witness.id), 'rx_sighted': True, 'photo_id': True, 'remarks': 'Severe lumbar strain, ID verified'}
        }, format='json')

        self.assertEqual(disp_resp.status_code, 200)
        self.assertEqual(disp_resp.data['status'], 'DISPENSED')

        # Verify batch stock decremented
        self.batch_trm.refresh_from_db()
        self.assertEqual(self.batch_trm.available_quantity, initial_batch_qty - 10)

        # Verify stock transaction logged
        tx = PharmacyStockTransaction.objects.filter(reference_id=order.id, transaction_type='DISPENSE_OPD').first()
        self.assertIsNotNone(tx)
        self.assertEqual(tx.quantity_delta, -10)

        # Verify Controlled Drug Register entry created
        cd_entry = PharmacyControlledDrugRegister.objects.filter(dispense_order=order).first()
        self.assertIsNotNone(cd_entry)
        self.assertEqual(cd_entry.quantity_dispensed, 10)
        self.assertEqual(cd_entry.primary_pharmacist, self.pharmacist)
        self.assertEqual(cd_entry.witness_staff, self.witness)

    def test_otc_sale_execution(self):
        self.client.force_authenticate(user=self.pharmacist)
        init_pcm1_qty = self.batch_pcm1.available_quantity # 100

        # 1. Successful OTC sale of Paracetamol
        sale_resp = self.client.post('/api/v1/pharmacy/otc-sales/', {
            'customer_name': 'Ravi K',
            'customer_phone': '9900187420',
            'payment_mode': 'Cash',
            'items': [
                {'medicine_id': str(self.pcm650.id), 'quantity': 10, 'discount_percent': 0}
            ]
        }, format='json')

        self.assertEqual(sale_resp.status_code, 201)
        self.assertIn('sale_number', sale_resp.data)
        self.assertEqual(float(sale_resp.data['total_amount']), 21.00)

        # Verify FEFO batch decremented
        self.batch_pcm1.refresh_from_db()
        self.assertEqual(self.batch_pcm1.available_quantity, init_pcm1_qty - 10)

        # 2. Block Schedule H1 medicine without prescription
        fail_resp = self.client.post('/api/v1/pharmacy/otc-sales/', {
            'customer_name': 'Walk-in Customer',
            'payment_mode': 'Cash',
            'items': [
                {'medicine_id': str(self.tramadol.id), 'quantity': 5, 'prescription_verified': False}
            ]
        }, format='json')
        self.assertEqual(fail_resp.status_code, 400)
        self.assertIn('requires prescription', fail_resp.data['error'])

    def test_return_and_refund_workflow(self):
        self.client.force_authenticate(user=self.pharmacist)

        # 1. Create completed dispense order
        order = PharmacyDispenseOrder.objects.create(
            order_number='PH-DISP-RET-001',
            patient=self.patient,
            total_amount=21.00,
            settlement_mode='PAY_AT_PHARMACY',
            payment_status='PAID',
            encounter_type='OPD',
            status='DISPENSED'
        )
        item = PharmacyDispenseOrderItem.objects.create(
            dispense_order=order,
            medicine=self.pcm650,
            batch=self.batch_pcm1,
            prescribed_quantity=10,
            dispensed_quantity=10,
            unit_price=2.10,
            line_total=21.00
        )

        # 2. Initiate return request
        ret_resp = self.client.post('/api/v1/pharmacy/returns/', {
            'dispense_order_id': str(order.id),
            'order_item_id': str(item.id),
            'quantity': 5,
            'reason': 'Patient no longer requires'
        }, format='json')
        self.assertEqual(ret_resp.status_code, 201)
        ret_id = ret_resp.data['id']
        self.assertEqual(ret_resp.data['status'], 'Requested')

        # 3. Inspect return
        insp_resp = self.client.post(f'/api/v1/pharmacy/returns/{ret_id}/inspect/', {
            'checks': {'sealed': True, 'batch_matches': True, 'expiry_ok': True, 'storage_ok': True},
            'disposition': 'restock'
        }, format='json')
        self.assertEqual(insp_resp.status_code, 200)
        self.assertEqual(insp_resp.data['status'], 'Inspected')
        self.assertEqual(insp_resp.data['disposition'], 'restock')

        # 4. Process refund & restock
        curr_batch_qty = self.batch_pcm1.available_quantity
        refund_resp = self.client.post(f'/api/v1/pharmacy/returns/{ret_id}/process-refund/')
        self.assertEqual(refund_resp.status_code, 200)
        self.assertEqual(refund_resp.data['status'], 'Refunded')

        # Verify batch stock restored
        self.batch_pcm1.refresh_from_db()
        self.assertEqual(self.batch_pcm1.available_quantity, curr_batch_qty + 5)


from decimal import Decimal
from rest_framework.test import APITestCase
from apps.billing.models import Invoice, InvoiceItem, Payment, InvoiceCategory, InvoiceStatus
from apps.pharmacy.models import PharmacyCounterShift, ShiftType

class PharmacyBillingSettlementEnginesTestCase(APITestCase):
    """
    Comprehensive test suite for Phase 5: The 6 Pharmacy Billing Settlement Engines & Shift Drawer.
    """
    def setUp(self):
        self.pharmacist = User.objects.create_user(
            username='pharm_settle_user',
            password='Password123!',
            role=RoleType.PHARMACIST,
            first_name='Anjali',
            last_name='Deshmukh'
        )
        self.cashier = User.objects.create_user(
            username='cashier_user',
            password='Password123!',
            role=RoleType.RECEPTIONIST,
            first_name='Rohan',
            last_name='Verma'
        )
        self.patient = Patient.objects.create(
            uhid='UHID-SETTLE-001',
            first_name='Amitabh',
            last_name='Bachchan',
            date_of_birth='1960-01-01',
            gender='MALE',
            phone_number='+919820011223'
        )
        self.supplier = PharmacySupplier.objects.create(
            supplier_code='SUP-SETTLE-01',
            name='MedSupply Global',
            phone='+919800000000',
            drug_license_number='DL-SETTLE-01'
        )
        self.med = PharmacyMedicine.objects.create(
            item_code='MED-AZI-500',
            name='Azithromycin 500mg',
            generic_name='Azithromycin',
            category=MedicineCategory.TABLET,
            unit_price=Decimal('15.00'),
            cost_price=Decimal('9.00'),
            reorder_level=20,
            reorder_quantity=100
        )
        self.batch = PharmacyBatch.objects.create(
            medicine=self.med,
            supplier=self.supplier,
            batch_number='AZI-B26-001',
            manufacturing_date=date.today() - timedelta(days=30),
            expiry_date=date.today() + timedelta(days=365),
            initial_quantity=500,
            available_quantity=500,
            cost_price=Decimal('9.00'),
            mrp_price=Decimal('18.00'),
            received_by=self.pharmacist
        )

    def _create_pending_order(self, order_num='PH-ORD-SETTLE-01', qty=10):
        total = Decimal(str(qty)) * Decimal('15.00')
        order = PharmacyDispenseOrder.objects.create(
            order_number=order_num,
            patient=self.patient,
            total_amount=total,
            settlement_mode=SettlementMode.PAY_AT_PHARMACY,
            payment_status=DispensePaymentStatus.UNPAID,
            encounter_type=EncounterType.OPD,
            status=DispenseOrderStatus.UNDER_REVIEW,
            step=4
        )
        PharmacyDispenseOrderItem.objects.create(
            dispense_order=order,
            medicine=self.med,
            prescribed_quantity=qty,
            dispensed_quantity=qty,
            unit_price=Decimal('15.00'),
            line_total=total
        )
        return order

    def test_engine_1_pay_at_pharmacy_cash_and_shift_drawer(self):
        self.client.force_authenticate(user=self.pharmacist)
        order = self._create_pending_order('PH-SETTLE-E1-01', qty=10) # Total 150.00

        resp = self.client.post(f'/api/v1/pharmacy/dispense-queue/{order.id}/dispense/', {
            'settlement': {
                'settlement_mode': 'PAY_AT_PHARMACY',
                'payment_method': 'CASH',
                'amount_tendered': 200.0,
                'payment_reference': 'POS-CASH-001'
            }
        }, format='json')

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['status'], 'DISPENSED')
        self.assertEqual(resp.data['payment_status'], 'PAID')
        self.assertEqual(resp.data['payment_method'], 'CASH')
        self.assertEqual(resp.data['receipt_data']['change_due'], 50.0)
        self.assertEqual(resp.data['receipt_data']['amount_paid'], 150.0)

        # Verify billing invoice
        inv = Invoice.objects.filter(patient=self.patient, category=InvoiceCategory.PHARMACY).last()
        self.assertIsNotNone(inv)
        self.assertEqual(inv.status, InvoiceStatus.PAID)
        self.assertEqual(inv.total, Decimal('150.00'))
        self.assertEqual(inv.paid, Decimal('150.00'))

        # Verify payment
        pay = Payment.objects.filter(invoice=inv).first()
        self.assertIsNotNone(pay)
        self.assertEqual(pay.amount, Decimal('150.00'))
        self.assertEqual(pay.payment_method, 'CASH')

        # Verify batch decremented
        self.batch.refresh_from_db()
        self.assertEqual(self.batch.available_quantity, 490)

        # Verify shift drawer credited
        shift = PharmacyCounterShift.objects.filter(is_closed=False).first()
        self.assertIsNotNone(shift)
        self.assertEqual(shift.cash_collected, Decimal('150.00'))

    def test_engine_2_pay_at_reception_and_cashier_webhook(self):
        self.client.force_authenticate(user=self.pharmacist)
        order = self._create_pending_order('PH-SETTLE-E2-01', qty=10)

        resp = self.client.post(f'/api/v1/pharmacy/dispense-queue/{order.id}/dispense/', {
            'settlement': {
                'settlement_mode': 'PAY_AT_RECEPTION',
                'handover_policy': 'PRE_PAID'
            }
        }, format='json')

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['status'], 'DISPENSED')
        self.assertEqual(resp.data['payment_status'], 'UNPAID')
        token_slip = resp.data['token_slip_number']
        self.assertTrue(token_slip.startswith('PH-'))
        self.assertEqual(resp.data['receipt_data']['type'], 'RECEPTION_TOKEN_SLIP')

        # Billing owns the invoice: pharmacy only queues a charge carrying the token slip (no Invoice yet)
        from apps.billing.models import BillableChargeItem, DepartmentChargeEvent
        self.assertFalse(Invoice.objects.filter(token_slip_number=token_slip).exists())
        charge = BillableChargeItem.objects.get(department='PHARMACY', source_reference_id=str(order.id))
        self.assertEqual(charge.status, 'PENDING')
        self.assertEqual(charge.total_amount, Decimal('150.00'))
        self.assertEqual(DepartmentChargeEvent.objects.get(charge_item=charge).metadata['token_slip_number'], token_slip)

        # The webhook cannot mark the token paid before Billing has settled it
        self.client.force_authenticate(user=self.cashier)
        early = self.client.post('/api/v1/pharmacy/billing/reception-webhook/', {
            'token_slip_number': token_slip, 'receipt_number': 'RCP-CENTRAL-8842', 'amount_paid': 150.00
        }, format='json')
        self.assertEqual(early.status_code, 400)
        order.refresh_from_db()
        self.assertEqual(order.payment_status, 'UNPAID')

        # Central cashier (Billing CASHIER role; receptionists cannot collect) settles through the Billing workspace
        billing_cashier = User.objects.create_user(username='central_cashier', password='Password123!', role=RoleType.CASHIER)
        from apps.billing.services import CounterShiftControlService
        CounterShiftControlService.open_shift(billing_cashier, 'CNT-CENTRAL', Decimal('5000.00'))
        self.client.force_authenticate(user=billing_cashier)
        bill = self.client.post('/api/v1/billing/cashier/bill-and-collect/', {
            'patient': str(order.patient.id), 'charge_ids': [str(charge.id)],
            'split_payments': [{'tender_mode': 'CASH', 'amount': 150}]
        }, format='json')
        self.assertEqual(bill.status_code, 201, bill.content)
        self.assertEqual(bill.json()['clinical_unlocks'][0]['gating_action'], 'PHARMACY_MEDICINE_RELEASE')

        order.refresh_from_db()
        self.assertEqual(order.payment_status, 'PAID')
        inv = order.billing_invoice
        self.assertIsNotNone(inv)
        self.assertEqual(inv.status, InvoiceStatus.PAID)
        self.assertEqual(inv.paid, Decimal('150.00'))
        self.assertEqual(inv.balance, Decimal('0.00'))
        self.assertEqual(Payment.objects.filter(invoice=inv).count(), 1)

        # Webhook now just confirms the Billing settlement (no second payment)
        wh_resp = self.client.post('/api/v1/pharmacy/billing/reception-webhook/', {
            'token_slip_number': token_slip, 'receipt_number': 'RCP-CENTRAL-8842', 'amount_paid': 150.00
        }, format='json')
        self.assertEqual(wh_resp.status_code, 200)
        self.assertEqual(wh_resp.data['order']['payment_status'], 'PAID')
        self.assertEqual(Payment.objects.filter(invoice=inv).count(), 1)

    def test_engine_3_insurance_copay_split(self):
        self.client.force_authenticate(user=self.pharmacist)
        order = self._create_pending_order('PH-SETTLE-E3-01', qty=10) # 150.00

        resp = self.client.post(f'/api/v1/pharmacy/dispense-queue/{order.id}/dispense/', {
            'settlement': {
                'settlement_mode': 'INSURANCE',
                'insurance_data': {
                    'tpa_name': 'Star Health & Allied Insurance',
                    'policy_number': 'SH-POL-99214',
                    'preauth_code': 'AUTH-STAR-998',
                    'cover_rate': 0.8,
                    'copay_settled_at_counter': True,
                    'copay_tender_mode': 'CARD'
                }
            }
        }, format='json')

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['payment_status'], 'INSURANCE_PENDING')
        self.assertEqual(float(resp.data['payer_covered_amount']), 120.00) # 80%
        self.assertEqual(float(resp.data['co_pay_amount']), 30.00) # 20%
        self.assertEqual(resp.data['receipt_data']['type'], 'TPA_DISPENSE_CERTIFICATE')

        # Check invoice
        inv = Invoice.objects.filter(tpa_claim_reference='AUTH-STAR-998').first()
        self.assertIsNotNone(inv)
        self.assertEqual(inv.status, InvoiceStatus.INSURANCE_PENDING)
        self.assertEqual(inv.paid, Decimal('30.00'))
        self.assertEqual(inv.balance, Decimal('120.00'))

        # Check drawer credited with Card co-pay
        shift = PharmacyCounterShift.objects.filter(is_closed=False).first()
        self.assertEqual(shift.card_collected, Decimal('30.00'))

    def test_engine_4_corporate_schedule_discount(self):
        self.client.force_authenticate(user=self.pharmacist)
        order = self._create_pending_order('PH-SETTLE-E4-01', qty=10) # 150.00

        resp = self.client.post(f'/api/v1/pharmacy/dispense-queue/{order.id}/dispense/', {
            'settlement': {
                'settlement_mode': 'CORPORATE',
                'corporate_data': {
                    'corporate_name': 'Indian Railways (Western Zone)',
                    'employee_badge_id': 'WR-EMP-7712',
                    'auth_letter_ref': 'AUTH-LET-2026-09',
                    'discount_rate': 0.15
                }
            }
        }, format='json')

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['payment_status'], 'CORPORATE_PENDING')
        self.assertEqual(resp.data['corporate_data']['discount_pct'], 15.0)
        self.assertEqual(resp.data['corporate_data']['discount_amount'], 22.50)
        self.assertEqual(resp.data['corporate_data']['net_amount'], 127.50)
        self.assertEqual(resp.data['receipt_data']['type'], 'B2B_CORPORATE_VOUCHER')

        # Check invoice
        inv = Invoice.objects.filter(patient=self.patient, category=InvoiceCategory.PHARMACY, status=InvoiceStatus.CORPORATE_PENDING).last()
        self.assertIsNotNone(inv)
        self.assertEqual(inv.discount, Decimal('22.50'))
        self.assertEqual(inv.total, Decimal('127.50'))

    def test_engine_5_hospital_credit_facility(self):
        self.client.force_authenticate(user=self.pharmacist)
        order = self._create_pending_order('PH-SETTLE-E5-01', qty=10)

        # 1. Invalid PIN should be rejected
        bad_pin_resp = self.client.post(f'/api/v1/pharmacy/dispense-queue/{order.id}/dispense/', {
            'settlement': {
                'settlement_mode': 'CREDIT',
                'credit_data': {
                    'account_name': 'Dr. Sarah Jenkins (Senior Consultant)',
                    'account_category': 'STAFF_HEALTHCARE_ALLOWANCE',
                    'authorizer_pin': '9999' # wrong pin
                }
            }
        }, format='json')
        self.assertEqual(bad_pin_resp.status_code, 400)
        self.assertIn('Invalid Authorizer PIN', bad_pin_resp.data['error'])

        # 2. Valid PIN 4412 succeeds
        resp = self.client.post(f'/api/v1/pharmacy/dispense-queue/{order.id}/dispense/', {
            'settlement': {
                'settlement_mode': 'CREDIT',
                'credit_data': {
                    'account_name': 'Dr. Sarah Jenkins (Senior Consultant)',
                    'account_category': 'STAFF_HEALTHCARE_ALLOWANCE',
                    'authorizer_name': 'Dr. Sarah Jenkins - Medical Superintendent',
                    'authorizer_pin': '4412',
                    'justification_note': 'Approved staff monthly healthcare entitlement'
                }
            }
        }, format='json')

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['payment_status'], 'CREDIT_AUTHORIZED')
        self.assertEqual(resp.data['receipt_data']['type'], 'CREDIT_AUTHORIZATION_SLIP')

        inv = Invoice.objects.filter(patient=self.patient, category=InvoiceCategory.PHARMACY, status=InvoiceStatus.CREDIT_AUTHORIZED).last()
        self.assertIsNotNone(inv)
        self.assertEqual(inv.total, Decimal('150.00'))

    def test_engine_6_ipd_running_bill_and_mar_handoff(self):
        self.client.force_authenticate(user=self.pharmacist)
        order = self._create_pending_order('PH-SETTLE-E6-01', qty=10)

        resp = self.client.post(f'/api/v1/pharmacy/dispense-queue/{order.id}/dispense/', {
            'settlement': {
                'settlement_mode': 'IPD_RUNNING_BILL'
            }
        }, format='json')

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['payment_status'], 'UNPAID')
        self.assertEqual(resp.data['ipd_data']['mar_status'], 'READY_TO_ADMINISTER')
        self.assertEqual(resp.data['receipt_data']['type'], 'IPD_WARD_ISSUE_SLIP')

        inv = Invoice.objects.filter(patient=self.patient, category=InvoiceCategory.IPD).last()
        self.assertIsNotNone(inv)
        self.assertEqual(inv.total, Decimal('150.00'))

    def test_directory_endpoints_and_shift_drawer(self):
        self.client.force_authenticate(user=self.pharmacist)

        # 1. TPA Directory
        tpa_resp = self.client.get('/api/v1/pharmacy/billing/tpa-directory/')
        self.assertEqual(tpa_resp.status_code, 200)
        self.assertTrue(len(tpa_resp.data) >= 4)
        tpa_names = [t['name'] for t in tpa_resp.data]
        self.assertTrue(any('Star Health' in n for n in tpa_names))

        # 2. Corporate Directory
        corp_resp = self.client.get('/api/v1/pharmacy/billing/corporate-directory/')
        self.assertEqual(corp_resp.status_code, 200)
        self.assertTrue(len(corp_resp.data) >= 4)
        corp_names = [c['name'] for c in corp_resp.data]
        self.assertTrue(any('Railways' in n for n in corp_names))

        # 3. Credit Accounts Directory
        cr_resp = self.client.get('/api/v1/pharmacy/billing/credit-accounts/')
        self.assertEqual(cr_resp.status_code, 200)
        self.assertTrue(len(cr_resp.data) >= 3)

        # 4. IPD Admission Status Lookup
        ipd_resp = self.client.get(f'/api/v1/pharmacy/billing/ipd-admission-status/?uhid={self.patient.uhid}')
        self.assertEqual(ipd_resp.status_code, 200)
        self.assertIn('deposit_utilization_pct', ipd_resp.data)

        # 5. Shift Drawer Summary & Close Action
        drawer_resp = self.client.get('/api/v1/pharmacy/billing/shift-drawer/')
        self.assertEqual(drawer_resp.status_code, 200)
        self.assertIn('net_drawer_cash', drawer_resp.data)

        close_resp = self.client.post('/api/v1/pharmacy/billing/shift-drawer/', {'action': 'close'}, format='json')
        self.assertEqual(close_resp.status_code, 200)
        self.assertTrue(close_resp.data['shift']['is_closed'])


class PharmacyIPDWorkflowsTestCase(APITestCase):
    """
    Phase 6: Inpatient Ward Supply, MAR Sync & 6-Step Right Panel Wizard Integration Tests
    """
    def setUp(self):
        self.supplier = PharmacySupplier.objects.create(
            name="Apex IPD Pharmaceuticals",
            supplier_code="APEX-IPD",
            contact_person="Ramesh Gupta",
            email="ramesh@apexipd.com",
            phone="9876543210"
        )
        self.patient = Patient.objects.create(
            uhid="UHID-IPD-001",
            first_name="Fatima",
            last_name="Zahra",
            date_of_birth="1968-04-12",
            gender="FEMALE",
            phone_number="9876543210",
            allergies=["Penicillin"]
        )
        self.doctor_user = User.objects.create_user(
            username='dr_morgan',
            email='morgan@northhospital.com',
            password='Password123!',
            first_name='Elena',
            last_name='Morgan',
            role=RoleType.DOCTOR
        )
        self.pharmacist = User.objects.create_user(
            username='sneha_nair',
            email='sneha.nair@northhospital.com',
            password='Password123!',
            first_name='Sneha',
            last_name='Nair',
            role=RoleType.PHARMACIST
        )
        self.admission = InpatientAdmission.objects.create(
            admission_number="ADM-2609-0091",
            patient=self.patient,
            ward_name="ICU",
            status="ADMITTED"
        )
        # Normal Med
        self.med_meropenem = PharmacyMedicine.objects.create(
            item_code="MER",
            name="Meropenem 1 g vial",
            category=MedicineCategory.INJECTION,
            unit_price=Decimal("540.00"),
            is_narcotic=False
        )
        self.batch_mer = PharmacyBatch.objects.create(
            medicine=self.med_meropenem,
            supplier=self.supplier,
            batch_number="MER2410",
            manufacturing_date=date(2024, 10, 1),
            expiry_date=date(2027, 8, 1),
            initial_quantity=50,
            available_quantity=30,
            cost_price=Decimal("400.00"),
            mrp_price=Decimal("540.00"),
            received_by=self.pharmacist
        )
        # Controlled Drug (Morphine)
        self.med_morphine = PharmacyMedicine.objects.create(
            item_code="MOR",
            name="Morphine 10 mg/ml ampoule",
            category=MedicineCategory.INJECTION,
            unit_price=Decimal("38.00"),
            is_narcotic=True
        )
        self.batch_mor = PharmacyBatch.objects.create(
            medicine=self.med_morphine,
            supplier=self.supplier,
            batch_number="MOR2408",
            manufacturing_date=date(2024, 8, 1),
            expiry_date=date(2027, 4, 1),
            initial_quantity=60,
            available_quantity=50,
            cost_price=Decimal("25.00"),
            mrp_price=Decimal("38.00"),
            received_by=self.pharmacist
        )

    def _create_ipd_order(self, order_num, med, qty=6, prio='ROUTINE', is_stat=False):
        order = PharmacyDispenseOrder.objects.create(
            order_number=order_num,
            patient=self.patient,
            admission=self.admission,
            encounter_type=EncounterType.IPD,
            ward_name="ICU",
            bed_number="Bed 3",
            doctor_name="Dr. Elena Morgan",
            nurse_name="Rina Thomas",
            priority=prio,
            is_emergency=is_stat,
            settlement_mode=SettlementMode.IPD_RUNNING_BILL,
            total_amount=med.unit_price * qty
        )
        PharmacyDispenseOrderItem.objects.create(
            dispense_order=order,
            medicine=med,
            prescribed_quantity=qty,
            unit_price=med.unit_price,
            line_total=med.unit_price * qty,
            dosage_instruction="1 g IV 8-hourly"
        )
        return order

    def test_ipd_kpis_and_queue_filtering(self):
        self.client.force_authenticate(user=self.pharmacist)

        self._create_ipd_order("WR-TEST-01", self.med_meropenem, qty=4, prio='ROUTINE')
        self._create_ipd_order("WR-TEST-02", self.med_meropenem, qty=2, prio='STAT', is_stat=True)

        # 1. KPIs endpoint
        kpi_resp = self.client.get('/api/v1/pharmacy/ipd/kpis/')
        self.assertEqual(kpi_resp.status_code, 200)
        self.assertGreaterEqual(kpi_resp.data['open_requests'], 1)
        self.assertGreaterEqual(kpi_resp.data['emergency_requests'], 1)

        # 2. Queue Requests Tab
        q_resp = self.client.get('/api/v1/pharmacy/ipd/queue/?tab=requests')
        self.assertEqual(q_resp.status_code, 200)
        req_numbers = [r['order_number'] for r in q_resp.data]
        self.assertIn("WR-TEST-01", req_numbers)

        # 3. Emergency Tab
        em_resp = self.client.get('/api/v1/pharmacy/ipd/queue/?tab=emergency')
        self.assertEqual(em_resp.status_code, 200)
        em_numbers = [r['order_number'] for r in em_resp.data]
        self.assertIn("WR-TEST-02", em_numbers)

        # 4. Ward filter
        ward_resp = self.client.get('/api/v1/pharmacy/ipd/queue/?tab=requests&ward=ICU')
        self.assertEqual(ward_resp.status_code, 200)
        self.assertTrue(all(r['ward'] == 'ICU' for r in ward_resp.data))

    def test_ipd_standard_issue_to_ward(self):
        self.client.force_authenticate(user=self.pharmacist)
        order = self._create_ipd_order("WR-ISSUE-01", self.med_meropenem, qty=6)

        initial_batch_qty = self.batch_mer.available_quantity # 30

        resp = self.client.post(f'/api/v1/pharmacy/ipd/issue/{order.id}/', {
            'received_by': 'Rina Thomas'
        }, format='json')

        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data['success'])

        # Verify Order Updated
        order.refresh_from_db()
        self.assertEqual(order.status, DispenseOrderStatus.DISPENSED)
        self.assertEqual(order.step, 6)
        self.assertEqual(order.received_by_nurse, 'Rina Thomas')
        self.assertEqual(order.settlement_mode, SettlementMode.IPD_RUNNING_BILL)

        # Verify FEFO Batch Decrement
        self.batch_mer.refresh_from_db()
        self.assertEqual(self.batch_mer.available_quantity, initial_batch_qty - 6)

        # Verify Stock Transaction
        tx = PharmacyStockTransaction.objects.filter(reference_id=order.id).first()
        self.assertIsNotNone(tx)
        self.assertEqual(tx.quantity_delta, -6)
        self.assertEqual(tx.reference_type, 'IPD_WARD_ISSUE')

        # Verify Admission Ledger Invoice
        inv = Invoice.objects.filter(patient=self.patient, category=InvoiceCategory.PHARMACY).first()
        self.assertIsNotNone(inv)
        self.assertEqual(inv.total, Decimal("3240.00")) # 6 * 540
        self.assertEqual(inv.status, InvoiceStatus.PAID)
        self.assertEqual(inv.settlement_mode, SettlementMode.IPD_RUNNING_BILL)

        # Verify MAR Synchronized
        mar = MedicationAdministration.objects.filter(admission=self.admission).first()
        self.assertIsNotNone(mar)
        self.assertIn("ISSUED_TO_WARD", mar.remarks)

    def test_ipd_controlled_drug_issue_dual_sign(self):
        self.client.force_authenticate(user=self.pharmacist)
        order = self._create_ipd_order("WR-CD-01", self.med_morphine, qty=4)

        resp = self.client.post(f'/api/v1/pharmacy/ipd/issue/{order.id}/', {
            'received_by': 'Rina Thomas',
            'cd_remarks': 'Schedule X post-op severe pain analgesia'
        }, format='json')

        self.assertEqual(resp.status_code, 200)

        # Verify Statutory CD Register entry created
        cd_entry = PharmacyControlledDrugRegister.objects.filter(dispense_order=order).first()
        self.assertIsNotNone(cd_entry)
        self.assertEqual(cd_entry.quantity_dispensed, 4)
        self.assertEqual(cd_entry.medicine, self.med_morphine)
        self.assertEqual(cd_entry.primary_pharmacist, self.pharmacist)
        self.assertIn("Rina Thomas", cd_entry.witness_role)

    def test_ipd_emergency_stat_release(self):
        self.client.force_authenticate(user=self.pharmacist)
        order = self._create_ipd_order("WR-EMERG-01", self.med_meropenem, qty=2, prio='STAT', is_stat=True)

        resp = self.client.post(f'/api/v1/pharmacy/ipd/emergency-release/{order.id}/', {
            'reason': 'Arrhythmia and severe sepsis shock in ICU Bed 3',
            'received_by': 'Rina Thomas'
        }, format='json')

        self.assertEqual(resp.status_code, 200)
        order.refresh_from_db()
        self.assertTrue(order.is_emergency)
        self.assertIn("Arrhythmia", order.emergency_reason)
        self.assertEqual(order.status, DispenseOrderStatus.DISPENSED)

    def test_ipd_query_and_cancel_workflows(self):
        self.client.force_authenticate(user=self.pharmacist)
        order = self._create_ipd_order("WR-QUERY-01", self.med_meropenem, qty=2)

        # Query prescriber
        q_resp = self.client.post(f'/api/v1/pharmacy/ipd/query-prescriber/{order.id}/', {
            'reason': 'Possible interaction with current ICU nephrotoxic regimen'
        }, format='json')
        self.assertEqual(q_resp.status_code, 200)
        order.refresh_from_db()
        self.assertIn("Query sent to", order.hold_reason)

        # Cancel request
        c_resp = self.client.post(f'/api/v1/pharmacy/ipd/cancel/{order.id}/', {
            'reason': 'Patient transferred to OT; prescription superseded'
        }, format='json')
        self.assertEqual(c_resp.status_code, 200)
        order.refresh_from_db()
        self.assertTrue(order.is_cancelled)
        self.assertEqual(order.status, DispenseOrderStatus.CANCELLED)

    def test_ipd_ward_returns_and_restock(self):
        self.client.force_authenticate(user=self.pharmacist)

        ret = PharmacyReturn.objects.create(
            return_number="RW-TEST-01",
            patient=self.patient,
            admission=self.admission,
            ward_name="ICU",
            bed_number="Bed 3",
            nurse_name="Rina Thomas",
            item_type="Unused",
            return_type=ReturnType.WARD_IPD,
            status="Requested",
            total_refund_amount=Decimal("1080.00"),
            reason="Unopened ampoules unused during ICU stay"
        )
        PharmacyReturnItem.objects.create(
            pharmacy_return=ret,
            medicine=self.med_meropenem,
            batch=self.batch_mer,
            quantity_returned=2,
            refund_unit_price=Decimal("540.00"),
            line_refund_total=Decimal("1080.00"),
            action=ReturnAction.RESTOCK
        )

        initial_stock = self.batch_mer.available_quantity

        # Process return: complete with restock
        resp = self.client.post(f'/api/v1/pharmacy/ipd/returns/{ret.id}/process/', {
            'action': 'complete',
            'disposition': 'restock'
        }, format='json')

        self.assertEqual(resp.status_code, 200)
        ret.refresh_from_db()
        self.assertEqual(ret.status, 'Credited')

        self.batch_mer.refresh_from_db()
        self.assertEqual(self.batch_mer.available_quantity, initial_stock + 2)

        # The routed endpoint (IPDWardReturnClassificationView -> PharmacyIPDOperationsService) records the restock as
        # a RETURN_RESTOCK movement referenced to this ward return.
        tx = PharmacyStockTransaction.objects.filter(
            reference_type='WARD_RETURN', reference_id=ret.id, transaction_type=StockTransactionType.RETURN_RESTOCK
        ).first()
        self.assertIsNotNone(tx)
        self.assertEqual(tx.quantity_delta, 2)


class PharmacyControlledDrugWorkflowsTestCase(APITestCase):
    """
    Phase 7: Controlled Drug & Narcotic System Integration Tests.
    Validates dual-credential witness authorization, statutory non-gapped register logging,
    vault physical count reconciliation, and inspection report generation.
    """

    def setUp(self):
        self.pharmacist = User.objects.create_user(
            username='arjun_rx',
            password='Password123!',
            first_name='Arjun',
            last_name='Varma',
            role=RoleType.PHARMACIST
        )
        self.second_pharmacist = User.objects.create_user(
            username='sneha_rx',
            password='Password123!',
            first_name='Sneha',
            last_name='Nair',
            role=RoleType.PHARMACIST
        )
        self.nurse_witness = User.objects.create_user(
            username='nurse_priya',
            password='Password123!',
            first_name='Priya',
            last_name='Sharma',
            role=RoleType.NURSE
        )
        self.supplier = PharmacySupplier.objects.create(
            supplier_code='SUP-TEST-NARCOTIC',
            name='Government Opium & Alkaloid Works',
            phone='+911122334455'
        )
        self.patient = Patient.objects.create(
            uhid='UHID-202610-00101',
            first_name='Kishore',
            last_name='Kumar',
            gender='MALE',
            phone_number='+919811223344',
            date_of_birth='1970-05-12'
        )

        # Schedule X Narcotic Medicine & Vault Batch
        self.med_morphine = PharmacyMedicine.objects.create(
            item_code='MED-MOR-TEST',
            name='Morphine Sulfate 10mg/mL Ampoule',
            generic_name='Morphine Sulfate',
            category=MedicineCategory.INJECTION,
            unit_price=Decimal('35.00'),
            cost_price=Decimal('15.00'),
            reorder_level=10,
            is_narcotic=True,
            schedule='Schedule X'
        )
        self.batch_morphine = PharmacyBatch.objects.create(
            medicine=self.med_morphine,
            supplier=self.supplier,
            batch_number='MOR-TEST-V01',
            manufacturing_date=date.today() - timedelta(days=60),
            expiry_date=date.today() + timedelta(days=600),
            initial_quantity=40,
            available_quantity=30,
            cost_price=Decimal('15.00'),
            mrp_price=Decimal('35.00'),
            storage_location='Vault Safe A (Dual Key Locked)',
            received_by=self.pharmacist
        )

        # Schedule H1 Medicine & Bio-Secure Batch
        self.med_midazolam = PharmacyMedicine.objects.create(
            item_code='MED-MID-TEST',
            name='Midazolam 5mg/mL Injection',
            generic_name='Midazolam',
            category=MedicineCategory.INJECTION,
            unit_price=Decimal('45.00'),
            cost_price=Decimal('20.00'),
            reorder_level=15,
            is_narcotic=False,
            schedule='Schedule H1'
        )
        self.batch_midazolam = PharmacyBatch.objects.create(
            medicine=self.med_midazolam,
            supplier=self.supplier,
            batch_number='MID-TEST-B01',
            manufacturing_date=date.today() - timedelta(days=45),
            expiry_date=date.today() + timedelta(days=500),
            initial_quantity=50,
            available_quantity=45,
            cost_price=Decimal('20.00'),
            mrp_price=Decimal('45.00'),
            storage_location='Vault Safe B (Bio-Secure Shelf)',
            received_by=self.pharmacist
        )

    def test_vault_inventory_and_kpis(self):
        """Validates that vault inventory lists Schedule X and H1 drugs with batches and KPIs."""
        self.client.force_authenticate(user=self.pharmacist)

        resp = self.client.get('/api/v1/pharmacy/controlled-drug/vault-inventory/')
        self.assertEqual(resp.status_code, 200)
        items = resp.data
        item_codes = [it['item_code'] for it in items]
        self.assertIn('MED-MOR-TEST', item_codes)
        self.assertIn('MED-MID-TEST', item_codes)

        mor = next(it for it in items if it['item_code'] == 'MED-MOR-TEST')
        self.assertEqual(mor['schedule'], 'Schedule X')
        self.assertEqual(mor['total_stock'], 30)
        self.assertIn('Vault Safe A', mor['vault_safe'])

        # Check Summary Metrics
        sum_resp = self.client.get('/api/v1/pharmacy/controlled-drug/summary/')
        self.assertEqual(sum_resp.status_code, 200)
        self.assertGreaterEqual(sum_resp.data['cd_items_tracked'], 2)
        self.assertGreaterEqual(sum_resp.data['total_vault_stock'], 75)
        self.assertEqual(sum_resp.data['dual_sign_compliance'], 100.0)

    def test_eligible_witnesses_excludes_primary_pharmacist(self):
        """Ensures dispensing pharmacist is excluded from the eligible witness list."""
        self.client.force_authenticate(user=self.pharmacist)

        resp = self.client.get('/api/v1/pharmacy/controlled-drug/eligible-witnesses/')
        self.assertEqual(resp.status_code, 200)
        witness_ids = [w['id'] for w in resp.data]
        self.assertNotIn(str(self.pharmacist.id), witness_ids)
        self.assertIn(str(self.nurse_witness.id), witness_ids)
        self.assertIn(str(self.second_pharmacist.id), witness_ids)

    def test_witness_verification_self_witness_rejected(self):
        """Validates statutory invariant: dispensing pharmacist cannot witness their own dispense."""
        self.client.force_authenticate(user=self.pharmacist)

        resp = self.client.post('/api/v1/pharmacy/controlled-drug/verify-witness/', {
            'witness_id': str(self.pharmacist.id),
            'pin': '4412'
        }, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn("cannot countersign as secondary witness", resp.data['error'])

    def test_witness_verification_valid_pin(self):
        """Validates successful witness verification with secondary staff PIN."""
        self.client.force_authenticate(user=self.pharmacist)

        resp = self.client.post('/api/v1/pharmacy/controlled-drug/verify-witness/', {
            'witness_id': str(self.nurse_witness.id),
            'pin': '4412'
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data['valid'])
        self.assertEqual(resp.data['witness_name'], 'Priya Sharma')

    def test_dual_signed_dispense_atomic_execution(self):
        """Tests that a valid dual-signed dispense decrements stock and logs in register."""
        self.client.force_authenticate(user=self.pharmacist)
        initial_stock = self.batch_morphine.available_quantity # 30

        resp = self.client.post('/api/v1/pharmacy/controlled-drug/dispense/', {
            'medicine_id': str(self.med_morphine.id),
            'batch_id': str(self.batch_morphine.id),
            'quantity': 2,
            'patient_id': str(self.patient.id),
            'prescribing_doctor_name': 'Dr. Kevin Vance',
            'doctor_license_number': 'MCI-ANES-44120',
            'rx_number': 'RX-TEST-009',
            'witness_id': str(self.nurse_witness.id),
            'witness_pin': '4412',
            'remarks': 'Post-op analgesia protocol dual verified'
        }, format='json')

        self.assertEqual(resp.status_code, 201)
        self.assertIn('CDR-', resp.data['entry_number'])
        self.assertEqual(resp.data['quantity_dispensed'], 2)
        self.assertEqual(resp.data['balance_stock_after'], initial_stock - 2)

        # Verify Batch stock decremented
        self.batch_morphine.refresh_from_db()
        self.assertEqual(self.batch_morphine.available_quantity, initial_stock - 2)

        # Verify StockTransaction logged
        tx = PharmacyStockTransaction.objects.filter(
            medicine=self.med_morphine,
            reference_type='CONTROLLED_VAULT_DISPENSE'
        ).first()
        self.assertIsNotNone(tx)
        self.assertEqual(tx.quantity_delta, -2)

        # Verify Statutory Register Row
        reg = PharmacyControlledDrugRegister.objects.filter(entry_number=resp.data['entry_number']).first()
        self.assertIsNotNone(reg)
        self.assertEqual(reg.primary_pharmacist, self.pharmacist)
        self.assertEqual(reg.witness_staff, self.nurse_witness)
        self.assertEqual(reg.doctor_license_number, 'MCI-ANES-44120')
        self.assertEqual(reg.rx_number, 'RX-TEST-009')

    def test_dispense_without_witness_rejected(self):
        """Verifies that controlled drug dispense fails without witness verification."""
        self.client.force_authenticate(user=self.pharmacist)
        initial_stock = self.batch_morphine.available_quantity

        resp = self.client.post('/api/v1/pharmacy/controlled-drug/dispense/', {
            'medicine_id': str(self.med_morphine.id),
            'batch_id': str(self.batch_morphine.id),
            'quantity': 2,
            'patient_id': str(self.patient.id),
            'prescribing_doctor_name': 'Dr. Kevin Vance',
            'doctor_license_number': 'MCI-ANES-44120',
            'witness_id': '', # Missing witness
            'witness_pin': ''
        }, format='json')

        self.assertEqual(resp.status_code, 400)
        self.batch_morphine.refresh_from_db()
        self.assertEqual(self.batch_morphine.available_quantity, initial_stock) # Zero stock moved

    def test_vault_reconciliation_variance_flagged(self):
        """Verifies physical shelf count reconciliation and variance discrepancy logging."""
        self.client.force_authenticate(user=self.pharmacist)

        # Register says 30, physical shelf count is 29 (Variance: -1)
        resp = self.client.post('/api/v1/pharmacy/controlled-drug/reconcile/', {
            'batch_id': str(self.batch_morphine.id),
            'physical_count': 29,
            'reason': 'Daily morning vault audit',
            'discrepancy_reason': '1 vial broken during shelf count',
            'witness_id': str(self.nurse_witness.id)
        }, format='json')

        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['variance'], -1)
        self.assertEqual(resp.data['status'], 'Discrepancy')

        # Check reconciliation record
        rec = PharmacyVaultReconciliation.objects.filter(reconciliation_number=resp.data['reconciliation_number']).first()
        self.assertIsNotNone(rec)
        self.assertEqual(rec.physical_count, 29)
        self.assertEqual(rec.register_balance, 30)

        # Check Discrepancy logged on Register
        disc_entry = PharmacyControlledDrugRegister.objects.filter(discrepancy_noted=True).first()
        self.assertIsNotNone(disc_entry)
        self.assertIn('Reconciliation Variance', disc_entry.remarks)

    def test_export_inspection_report(self):
        """Verifies regulatory inspection export layout compliant with NDPS rules."""
        self.client.force_authenticate(user=self.pharmacist)

        resp = self.client.get('/api/v1/pharmacy/controlled-drug/export-report/?schedule=Schedule%20X')
        self.assertEqual(resp.status_code, 200)
        data = resp.data
        self.assertEqual(data['hospital_name'], 'North Central Memorial Hospital')
        self.assertIn('DL-', data['drug_license_number'])
        self.assertIn('NDPS-', data['ndps_possession_permit'])
        self.assertIn('summary', data)
        self.assertIn('entries', data)


class PharmacyAdminGovernanceTestCase(APITestCase):
    """
    Automated test suite for Phase 8: Pharmacy Admin & Governance Workspace.
    Validates executive analytics, shift scheduling, procurement approvals,
    pricing updates, compliance audit logging, and Separation of Concerns.
    """

    def setUp(self):
        self.admin_user = User.objects.create_user(
            username='pooja.admin',
            email='dr.pooja.shah@northhospital.com',
            password='Password123!',
            first_name='Pooja',
            last_name='Shah',
            role=RoleType.DEPARTMENT_ADMIN,
        )
        self.pharmacist = User.objects.create_user(
            username='arjun.pharm',
            email='arjun.varma@northhospital.com',
            password='Password123!',
            first_name='Arjun',
            last_name='Varma',
            role=RoleType.PHARMACIST,
        )
        self.patient = Patient.objects.create(
            uhid='UHID-ADM-001',
            first_name='Praveen',
            last_name='Joshi',
            gender='MALE',
            date_of_birth=date(1985, 3, 15),
            phone_number='9876543210'
        )
        self.supplier = PharmacySupplier.objects.create(
            supplier_code='SUP-TEST-01',
            name='MedLine Distributors',
            contact_person='Mr. Mehta',
            phone='9811122233'
        )
        self.medicine = PharmacyMedicine.objects.create(
            item_code='MED-ADM-01',
            name='Paracetamol 650 mg',
            generic_name='Paracetamol',
            category=MedicineCategory.TABLET,
            unit_price=12.50,
            cost_price=7.00,
            reorder_level=50,
            reorder_quantity=200,
            default_supplier=self.supplier
        )
        self.batch = PharmacyBatch.objects.create(
            medicine=self.medicine,
            batch_number='PCM2609',
            manufacturing_date=timezone.now().date() - timedelta(days=30),
            expiry_date=timezone.now().date() + timedelta(days=365),
            initial_quantity=100,
            available_quantity=100,
            cost_price=7.00,
            received_by=self.pharmacist,
            supplier=self.supplier
        )
        self.dispense_order = PharmacyDispenseOrder.objects.create(
            order_number='DSP-ADM-001',
            patient=self.patient,
            encounter_type=EncounterType.OPD,
            doctor_name='Dr. Sanjeev Rao',
            status=DispenseOrderStatus.UNDER_REVIEW,
            payment_status=DispensePaymentStatus.PAID,
            total_amount=12.50,
        )
        PharmacyDispenseOrderItem.objects.create(
            dispense_order=self.dispense_order,
            medicine=self.medicine,
            batch=self.batch,
            prescribed_quantity=10,
            dispensed_quantity=10,
            unit_price=12.50,
            line_total=12.50
        )

    def test_admin_analytics_metrics(self):
        """Verifies admin executive analytics endpoint returns KPIs and charts."""
        self.client.force_authenticate(user=self.admin_user)
        resp = self.client.get('/api/v1/pharmacy/admin/analytics/?activity_scope=All')
        self.assertEqual(resp.status_code, 200)
        data = resp.data
        self.assertIn('kpis', data)
        self.assertIn('bars', data)
        self.assertIn('alerts', data)
        self.assertIn('inv_seg', data)
        self.assertIn('perf', data)
        self.assertIn('feed', data)
        self.assertEqual(len(data['kpis']), 5)

    def test_staff_roster_and_duty_scheduling(self):
        """Verifies staff roster and shift assignment creation / updates."""
        self.client.force_authenticate(user=self.admin_user)

        # Get staff roster
        staff_resp = self.client.get('/api/v1/pharmacy/admin/staff/')
        self.assertEqual(staff_resp.status_code, 200)
        self.assertTrue(len(staff_resp.data) >= 4)

        # Get duty shifts
        shifts_resp = self.client.get('/api/v1/pharmacy/admin/shifts/')
        self.assertEqual(shifts_resp.status_code, 200)
        self.assertTrue(len(shifts_resp.data) >= 5)

        # Update shift
        update_resp = self.client.post('/api/v1/pharmacy/admin/shifts/', {
            'schedule_id': 'SH-05',
            'staff': ['Arjun Varma'],
            'status': 'Covered',
            'notes': 'Assigned by Dr. Pooja Shah'
        }, format='json')
        self.assertEqual(update_resp.status_code, 200)
        self.assertEqual(update_resp.data['status'], 'Covered')

    def test_operations_throughput_and_inventory_exceptions(self):
        """Verifies operations throughput monitoring and inventory health exceptions."""
        self.client.force_authenticate(user=self.admin_user)

        ops_resp = self.client.get('/api/v1/pharmacy/admin/operations/')
        self.assertEqual(ops_resp.status_code, 200)
        self.assertTrue(any(p['id'] == 'OPD-C1' for p in ops_resp.data))

        invh_resp = self.client.get('/api/v1/pharmacy/admin/inventory-health/')
        self.assertEqual(invh_resp.status_code, 200)
        self.assertTrue(len(invh_resp.data) >= 4)

    def test_purchase_request_review_and_po_issue(self):
        """Verifies Pharmacy Admin PR budget review and PO formal dispatch."""
        self.client.force_authenticate(user=self.admin_user)

        # Create a pending PR
        pr = PharmacyPurchaseRequest.objects.create(
            pr_number='PR-TEST-8801',
            supplier=self.supplier,
            requested_by=self.pharmacist,
            status=PRStatus.PENDING_APPROVAL,
            priority=PRPriority.ROUTINE,
            workflow_stage=2
        )
        PharmacyPurchaseRequestItem.objects.create(
            purchase_request=pr,
            medicine=self.medicine,
            requested_quantity=100,
            estimated_unit_cost=7.00
        )

        # Review and approve PR
        rev_resp = self.client.post(f"/api/v1/pharmacy/purchase-requests/{pr.id}/review/", {
            'action': 'approve',
            'reason': 'Approved by Chief Pharmacist within quarterly allocation'
        }, format='json')
        self.assertEqual(rev_resp.status_code, 200)
        pr.refresh_from_db()
        self.assertEqual(pr.status, PRStatus.APPROVED)

        # Issue PO
        po = PharmacyPurchaseOrder.objects.create(
            po_number='PO-TEST-8801',
            purchase_request=pr,
            supplier=self.supplier,
            approved_by=self.admin_user,
            status=POStatus.DRAFT,
            total_order_amount=700.00
        )
        po_resp = self.client.post(f"/api/v1/pharmacy/purchase-orders/{po.id}/issue/", {}, format='json')
        self.assertEqual(po_resp.status_code, 200)
        po.refresh_from_db()
        self.assertEqual(po.status, POStatus.ISSUED)

    def test_medicine_pricing_update(self):
        """Verifies medicine pricing update and audit logging."""
        self.client.force_authenticate(user=self.admin_user)

        resp = self.client.patch(f"/api/v1/pharmacy/medicines/{self.medicine.id}/pricing/", {
            'unit_price': 14.00,
            'cost_price': 7.50
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        self.medicine.refresh_from_db()
        self.assertEqual(float(self.medicine.unit_price), 14.00)

        # Verify audit log recorded
        audit = PharmacyGovernanceAuditLog.objects.filter(action='Formulary Price Update').first()
        self.assertIsNotNone(audit)
        self.assertIn('14.0', audit.details)

    def test_governance_audit_logs_and_settings(self):
        """Verifies filterable audit log streams and governance policy updates."""
        self.client.force_authenticate(user=self.admin_user)

        # Audit logs
        logs_resp = self.client.get('/api/v1/pharmacy/admin/audit-logs/?pill=all')
        self.assertEqual(logs_resp.status_code, 200)
        self.assertTrue(len(logs_resp.data) >= 5)

        # Settings
        settings_resp = self.client.get('/api/v1/pharmacy/admin/settings/')
        self.assertEqual(settings_resp.status_code, 200)
        self.assertTrue(len(settings_resp.data) >= 5)

        # Toggle setting
        toggle_resp = self.client.post('/api/v1/pharmacy/admin/settings/', {
            'setting_key': 'fullPay',
            'value': True
        }, format='json')
        self.assertEqual(toggle_resp.status_code, 200)
        setting = PharmacyDepartmentSetting.objects.get(setting_key='fullPay')
        self.assertTrue(setting.boolean_val)

    def test_separation_of_concerns_enforcement(self):
        """
        CRITICAL GOVERNANCE INVARIANT:
        Department Admin accounts MUST be strictly blocked (HTTP 403 Forbidden)
        from executing physical dispensing, ward issuing, OTC sales, and stock adjustments.
        """
        self.client.force_authenticate(user=self.admin_user)

        # 1. Attempt OPD dispense as Department Admin -> HTTP 403
        disp_resp = self.client.post(
            f"/api/v1/pharmacy/dispense-orders/{self.dispense_order.id}/dispense/",
            {'counseling': {'completed': True}},
            format='json'
        )
        self.assertEqual(disp_resp.status_code, 403)
        self.assertIn('Separation of Concerns', disp_resp.data['detail'])

        # 2. Attempt IPD ward issue as Department Admin -> HTTP 403
        ipd_resp = self.client.post(
            '/api/v1/pharmacy/ipd/issue/',
            {'order_id': str(self.dispense_order.id)},
            format='json'
        )
        self.assertEqual(ipd_resp.status_code, 403)
        self.assertIn('Separation of Concerns', ipd_resp.data['detail'])

        # 3. Attempt Stock Adjustment as Department Admin -> HTTP 403
        adj_resp = self.client.post(
            '/api/v1/pharmacy/stock-adjustments/',
            {
                'medicine_id': str(self.medicine.id),
                'batch_id': str(self.batch.id),
                'quantity_delta': -2,
                'reason': 'Damaged'
            },
            format='json'
        )
        self.assertEqual(adj_resp.status_code, 403)
        self.assertIn('Separation of Concerns', adj_resp.data['detail'])

        # 4. Attempt OTC sale as Department Admin -> HTTP 403
        otc_resp = self.client.post(
            '/api/v1/pharmacy/otc-sales/',
            {
                'customer_name': 'Walk-in Customer',
                'customer_phone': '9876543210',
                'payment_mode': 'CASH',
                'tendered_amount': 50.0,
                'items': [{
                    'medicine_id': str(self.medicine.id),
                    'quantity': 1,
                    'unit_price': 12.50
                }]
            },
            format='json'
        )
        self.assertEqual(otc_resp.status_code, 403)
        self.assertIn('Separation of Concerns', otc_resp.data['detail'])

        # 5. Attempt Controlled Drug Dispense as Department Admin -> HTTP 403
        cd_resp = self.client.post(
            '/api/v1/pharmacy/controlled-drug/dispense/',
            {
                'medicine_id': str(self.medicine.id),
                'batch_id': str(self.batch.id),
                'quantity': 1,
                'witness_id': str(self.pharmacist.id),
                'witness_pin': '1234'
            },
            format='json'
        )
        self.assertEqual(cd_resp.status_code, 403)
        self.assertIn('Separation of Concerns', cd_resp.data['detail'])

    def test_admin_staff_roster_and_creation(self):
        """Test staff roster retrieval and onboarding/assignment by Pharmacy Admin."""
        self.client.force_authenticate(user=self.admin_user)

        # GET staff roster
        get_resp = self.client.get('/api/v1/pharmacy/admin/staff/')
        self.assertEqual(get_resp.status_code, 200)
        self.assertTrue(len(get_resp.data) >= 5)

        # POST new staff / partial completion assignment
        payload = {
            'name': 'Rohan Sen',
            'role': 'Clinical Pharmacist',
            'area': 'Central IPD store',
            'shift': '08:00–16:00',
            'status': 'On duty',
            'contactNumber': '+91 98765 43210',
            'licenseNumber': 'PH-REG-2026-9901',
            'servicePoint': 'IPD-01',
            'dutyShift': 'Morning (08:00 - 16:00)',
            'counselingCertified': True
        }
        post_resp = self.client.post('/api/v1/pharmacy/admin/staff/', payload, format='json')
        self.assertEqual(post_resp.status_code, 201)
        self.assertEqual(post_resp.data['name'], 'Rohan Sen')
        self.assertEqual(post_resp.data['role'], 'Clinical Pharmacist')
        self.assertEqual(post_resp.data['area'], 'Central IPD store')

        # Verify new staff is returned in roster
        get_resp2 = self.client.get('/api/v1/pharmacy/admin/staff/')
        self.assertEqual(get_resp2.status_code, 200)
        staff_names = [s['name'] for s in get_resp2.data]
        self.assertIn('Rohan Sen', staff_names)








