import uuid
from decimal import Decimal
from django.test import TestCase
from django.utils import timezone
from apps.accounts.models import User, RoleType, DoctorProfile
from apps.patients.models import Patient
from apps.clinical.models import Prescription, PrescriptionItem, Consultation
from apps.pharmacy.models import (
    PharmacyMedicine,
    PharmacyBatch,
    PharmacyDispenseOrder,
    PharmacyDispenseOrderItem,
    DispenseOrderStatus,
    PrescriptionOutcome,
    PurchasedOutsideReason,
    PharmacyStockTransaction,
    StockTransactionType,
    MedicineCategory,
)
from apps.pharmacy.services import PharmacyOPDDispensingService, PharmacyClinicalHandoffService


class OPDPharmacyWorkflowImprovementsTestCase(TestCase):
    def setUp(self):
        # 1. Create Pharmacist User
        self.pharmacist = User.objects.create_user(
            username='opd_pharm_01',
            email='pharm@north.test',
            first_name='Arjun',
            last_name='Varma',
            role=RoleType.PHARMACIST,
        )

        # 2. Create Doctor User & Profile
        self.doctor_user = User.objects.create_user(
            username='dr_kulkarni',
            email='kulkarni@north.test',
            first_name='R.',
            last_name='Kulkarni',
            role=RoleType.DOCTOR,
        )
        self.doctor = DoctorProfile.objects.create(
            user=self.doctor_user,
            license_number='KMC-48211',
            department='General Medicine',
            qualification='MBBS, MD',
            consultation_fee=Decimal('500.00'),
        )

        # 3. Create Patient
        self.patient = Patient.objects.create(
            first_name='Rahul',
            last_name='Sharma',
            uhid='UHID-OPD-TEST-001',
            gender='M',
            date_of_birth='1990-05-15',
            allergies=['Penicillin'],
        )

        # 4. Create Medicines
        self.med_antibiotic = PharmacyMedicine.objects.create(
            item_code='MED-AB-01',
            name='Amoxicillin + Clavulanic Acid 625mg',
            category=MedicineCategory.TABLET,
            unit_price=Decimal('25.00'),
        )
        self.med_vitd = PharmacyMedicine.objects.create(
            item_code='MED-VD-02',
            name='Vitamin D3 60k IU Capsule',
            category=MedicineCategory.CAPSULE,
            unit_price=Decimal('15.00'),
        )
        self.med_para = PharmacyMedicine.objects.create(
            item_code='MED-PCM-03',
            name='Paracetamol 650mg Tablet',
            category=MedicineCategory.TABLET,
            unit_price=Decimal('2.50'),
        )

        # 5. Create FEFO Batches
        today = timezone.now().date()
        self.batch_ab = PharmacyBatch.objects.create(
            medicine=self.med_antibiotic,
            batch_number='B-AB-101',
            manufacturing_date=today - timezone.timedelta(days=30),
            expiry_date=today + timezone.timedelta(days=365),
            initial_quantity=100,
            available_quantity=100,
            cost_price=Decimal('15.00'),
            mrp_price=Decimal('25.00'),
            received_by=self.pharmacist,
        )
        self.batch_vd = PharmacyBatch.objects.create(
            medicine=self.med_vitd,
            batch_number='B-VD-201',
            manufacturing_date=today - timezone.timedelta(days=30),
            expiry_date=today + timezone.timedelta(days=400),
            initial_quantity=100,
            available_quantity=100,
            cost_price=Decimal('10.00'),
            mrp_price=Decimal('15.00'),
            received_by=self.pharmacist,
        )
        self.batch_para = PharmacyBatch.objects.create(
            medicine=self.med_para,
            batch_number='B-PCM-301',
            manufacturing_date=today - timezone.timedelta(days=30),
            expiry_date=today + timezone.timedelta(days=500),
            initial_quantity=200,
            available_quantity=200,
            cost_price=Decimal('1.20'),
            mrp_price=Decimal('2.50'),
            received_by=self.pharmacist,
        )

    def test_01_prescription_synchronization_creates_queue_without_stock_or_billing_movement(self):
        """Req 6 & 7: Doctor signs prescription -> Queue order created with doctor details and allergies, NO stock reduction, NO invoice."""
        consultation = Consultation.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            chief_complaint='Cough and high fever',
            provisional_diagnosis='Acute Bronchitis with fever',
            clinical_notes='Review in 5 days',
        )
        rx = Prescription.objects.create(
            consultation=consultation,
            prescription_number='RX-OPD-TEST-101',
            patient=self.patient,
            doctor=self.doctor,
            instructions='Take after meals',
            status='ACTIVE',
        )
        PrescriptionItem.objects.create(
            prescription=rx,
            medication_name=self.med_antibiotic.name,
            dosage='625mg',
            frequency='1-0-1',
            duration_days=7,
        )
        PrescriptionItem.objects.create(
            prescription=rx,
            medication_name=self.med_vitd.name,
            dosage='60k IU',
            frequency='Once weekly',
            duration_days=28,
        )

        order = PharmacyClinicalHandoffService.create_dispense_order_from_prescription(rx)

        # Invariants:
        self.assertIsNotNone(order)
        self.assertEqual(order.status, DispenseOrderStatus.PENDING)
        self.assertEqual(order.patient.first_name, 'Rahul')
        self.assertEqual(order.patient.uhid, 'UHID-OPD-TEST-001')
        self.assertEqual(order.doctor_name, 'Dr. R. Kulkarni')
        self.assertEqual(order.diagnosis, 'Acute Bronchitis with fever')
        self.assertTrue(order.has_allergy_warning)  # Penicillin allergy detected
        self.assertEqual(order.items.count(), 2)

        # Stock must NOT have reduced
        self.batch_ab.refresh_from_db()
        self.batch_vd.refresh_from_db()
        self.assertEqual(self.batch_ab.available_quantity, 100)
        self.assertEqual(self.batch_vd.available_quantity, 100)

        # No stock transaction created
        tx_count = PharmacyStockTransaction.objects.filter(reference_id=str(order.id)).count()
        self.assertEqual(tx_count, 0)

    def test_02_partial_dispense_only_dispenses_and_bills_selected_medicines(self):
        """Req 2: Patient selects Antibiotics only. Antibiotic dispensed, stock deducted, invoice created.
        Vitamin D & Paracetamol remain for future collection. Status becomes PARTIALLY_DISPENSED.
        """
        # Create dispense order with 3 items
        order = PharmacyDispenseOrder.objects.create(
            order_number='PH-DISP-TEST-002',
            patient=self.patient,
            encounter_type='OPD',
            settlement_mode='PAY_AT_PHARMACY',
            payment_status='UNPAID',
            total_amount=Decimal('435.00'),  # (14*25) + (4*15) + (10*2.5) = 350 + 60 + 25 = 435
            status=DispenseOrderStatus.PENDING,
            priority='ROUTINE',
            doctor_name='Dr. R. Kulkarni',
            diagnosis='Acute Bronchitis',
        )

        item1 = PharmacyDispenseOrderItem.objects.create(
            dispense_order=order,
            medicine=self.med_antibiotic,
            prescribed_quantity=14,
            unit_price=Decimal('25.00'),
            line_total=Decimal('350.00'),
        )
        item2 = PharmacyDispenseOrderItem.objects.create(
            dispense_order=order,
            medicine=self.med_vitd,
            prescribed_quantity=4,
            unit_price=Decimal('15.00'),
            line_total=Decimal('60.00'),
        )
        item3 = PharmacyDispenseOrderItem.objects.create(
            dispense_order=order,
            medicine=self.med_para,
            prescribed_quantity=10,
            unit_price=Decimal('2.50'),
            line_total=Decimal('25.00'),
        )

        counseling_data = {
            'dosage': True,
            'timing': True,
            'side_effects': True,
            'storage': True,
            'language': 'English',
        }

        # Patient chooses ONLY item 1 (Antibiotic)
        dispensed_order = PharmacyOPDDispensingService.dispense_order(
            order=order,
            user=self.pharmacist,
            counseling_data=counseling_data,
            picks={str(item1.id): True},
            cd_data=None,
            settlement_data={
                'settlement_mode': 'PAY_AT_PHARMACY',
                'payment_method': 'CASH',
                'amount_tendered': Decimal('350.00'),
                'billable_amount': Decimal('350.00'),
            },
            selected_item_ids=[str(item1.id)],
        )

        # 1. Order Status is PARTIALLY_DISPENSED and outcome is PARTIAL_PURCHASE
        self.assertEqual(dispensed_order.status, DispenseOrderStatus.PARTIALLY_DISPENSED)
        self.assertEqual(dispensed_order.prescription_outcome, PrescriptionOutcome.PARTIAL_PURCHASE)

        # 2. Item 1 is marked dispensed, Items 2 and 3 remain unfulfilled
        item1.refresh_from_db()
        item2.refresh_from_db()
        item3.refresh_from_db()
        self.assertTrue(item1.is_dispensed)
        self.assertEqual(item1.dispensed_quantity, 14)

        self.assertFalse(item2.is_dispensed)
        self.assertEqual(item2.dispensed_quantity, 0)

        self.assertFalse(item3.is_dispensed)
        self.assertEqual(item3.dispensed_quantity, 0)

        # 3. Stock reduced ONLY for item 1 (Antibiotic -14), NOT for Vit D or Paracetamol
        self.batch_ab.refresh_from_db()
        self.batch_vd.refresh_from_db()
        self.batch_para.refresh_from_db()
        self.assertEqual(self.batch_ab.available_quantity, 86)  # 100 - 14 = 86
        self.assertEqual(self.batch_vd.available_quantity, 100) # unchanged!
        self.assertEqual(self.batch_para.available_quantity, 200) # unchanged!

        # 4. Invoice was generated ONLY for billable amount (350.00)
        self.assertIsNotNone(dispensed_order.billing_invoice)
        self.assertEqual(dispensed_order.billing_invoice.total, Decimal('350.00'))

    def test_03_purchased_outside_closes_prescription_with_audit_and_no_stock_or_billing(self):
        """Req 3: Mark as Purchased Outside closes prescription, records reason, creates audit entry,
        zero stock movement, zero billing.
        """
        order = PharmacyDispenseOrder.objects.create(
            order_number='PH-DISP-TEST-003',
            patient=self.patient,
            encounter_type='OPD',
            settlement_mode='PAY_AT_PHARMACY',
            payment_status='UNPAID',
            total_amount=Decimal('250.00'),
            status=DispenseOrderStatus.PENDING,
            priority='ROUTINE',
            doctor_name='Dr. R. Kulkarni',
        )
        PharmacyDispenseOrderItem.objects.create(
            dispense_order=order,
            medicine=self.med_antibiotic,
            prescribed_quantity=10,
            unit_price=Decimal('25.00'),
            line_total=Decimal('250.00'),
        )

        closed_order = PharmacyOPDDispensingService.mark_purchased_outside(
            order=order,
            user=self.pharmacist,
            reason=PurchasedOutsideReason.PRICE_CONCERN,
            notes='Patient preferred generic store outside campus',
        )

        # Verify prescription closed with PURCHASED_OUTSIDE
        self.assertEqual(closed_order.status, DispenseOrderStatus.PURCHASED_OUTSIDE)
        self.assertEqual(closed_order.prescription_outcome, PrescriptionOutcome.PURCHASED_OUTSIDE)
        self.assertEqual(closed_order.purchased_outside_reason, PurchasedOutsideReason.PRICE_CONCERN)
        self.assertEqual(closed_order.purchased_outside_notes, 'Patient preferred generic store outside campus')
        self.assertEqual(closed_order.purchased_outside_by, self.pharmacist)
        self.assertIsNotNone(closed_order.purchased_outside_at)

        # Invariant: No billing invoice
        self.assertIsNone(closed_order.billing_invoice)

        # Invariant: Stock untouched
        self.batch_ab.refresh_from_db()
        self.assertEqual(self.batch_ab.available_quantity, 100)

        # Audit ledger recorded
        audit_tx = PharmacyStockTransaction.objects.filter(
            reference_type='PURCHASED_OUTSIDE',
            reference_id=closed_order.id,
        ).first()
        self.assertIsNotNone(audit_tx)
        self.assertEqual(audit_tx.quantity_delta, 0)
