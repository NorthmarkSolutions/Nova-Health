import uuid
from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import RoleType
from apps.patients.models import Patient
from apps.organization.models import Bed, Room, Department
from apps.ipd.models import InpatientAdmission, MedicationAdministration, AdmissionStatus
from apps.billing.models import Invoice, InvoiceCategory, InvoiceStatus
from apps.pharmacy.models import (
    PharmacyMedicine,
    PharmacyBatch,
    PharmacyDispenseOrder,
    PharmacyDispenseOrderItem,
    PharmacyReturn,
    PharmacyReturnItem,
    BatchStatus,
    DispenseOrderStatus,
    EncounterType,
    ReturnType,
)
from apps.pharmacy.ipd_services import PharmacyIPDOperationsService

User = get_user_model()


class PharmacyIPDOperationsTest(TestCase):
    def setUp(self):
        self.pharmacist = User.objects.create_user(
            username='sneha.ph',
            email='sneha@hospital.com',
            password='password123',
            role=RoleType.PHARMACIST,
            first_name='Sneha',
            last_name='Nair'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.pharmacist)

        self.patient = Patient.objects.create(
            first_name='Noah',
            last_name='Williams',
            gender='M',
            uhid='UHID-IPD-001',
            date_of_birth='1960-05-15',
            allergies=['Penicillin']
        )

        self.dept = Department.objects.create(name='Inpatient HDU', code='HDU')
        self.room = Room.objects.create(room_number='HDU-101', department=self.dept)
        self.bed = Bed.objects.create(bed_number='Bed 2', room=self.room)

        self.admission = InpatientAdmission.objects.create(
            admission_number='ADM-2010-0004',
            patient=self.patient,
            bed=self.bed,
            ward_name='HDU',
            status=AdmissionStatus.ADMITTED
        )

        # Medicines
        self.med_amiodarone = PharmacyMedicine.objects.create(
            item_code='AMI',
            name='Amiodarone 150 mg ampoule',
            generic_name='Amiodarone',
            category='INJECTION',
            schedule='H',
            unit_price=Decimal('120.00'),
            cost_price=Decimal('85.00'),
            is_active=True
        )

        self.med_piperacillin = PharmacyMedicine.objects.create(
            item_code='PTZ',
            name='Piperacillin + Tazobactam 4.5g',
            generic_name='Piperacillin Tazobactam',
            category='INJECTION',
            schedule='H',
            known_allergens=['Penicillin'],
            unit_price=Decimal('450.00'),
            cost_price=Decimal('320.00'),
            is_active=True
        )

        self.med_meropenem = PharmacyMedicine.objects.create(
            item_code='MER',
            name='Meropenem 1g IV',
            generic_name='Meropenem',
            category='INJECTION',
            schedule='H',
            unit_price=Decimal('550.00'),
            cost_price=Decimal('400.00'),
            is_active=True
        )

        # Batches
        self.batch_amio = PharmacyBatch.objects.create(
            medicine=self.med_amiodarone,
            batch_number='BATCH-AMI-01',
            manufacturing_date=timezone.now().date() - timedelta(days=30),
            expiry_date=timezone.now().date() + timedelta(days=365),
            initial_quantity=50,
            available_quantity=20,
            cost_price=Decimal('85.00'),
            received_by=self.pharmacist,
            status=BatchStatus.ACTIVE
        )

        self.batch_mero = PharmacyBatch.objects.create(
            medicine=self.med_meropenem,
            batch_number='BATCH-MER-01',
            manufacturing_date=timezone.now().date() - timedelta(days=30),
            expiry_date=timezone.now().date() + timedelta(days=365),
            initial_quantity=30,
            available_quantity=25,
            cost_price=Decimal('400.00'),
            received_by=self.pharmacist,
            status=BatchStatus.ACTIVE
        )

        # IPD Dispense Order
        self.order = PharmacyDispenseOrder.objects.create(
            order_number='WR-5514',
            encounter_type=EncounterType.IPD,
            patient=self.patient,
            admission=self.admission,
            ward_name='HDU',
            bed_number='Bed 2',
            nurse_name='Kiran Das',
            doctor_name='Dr. Michael Chang',
            priority='STAT',
            status=DispenseOrderStatus.PENDING,
            step=1
        )

        self.item_amio = PharmacyDispenseOrderItem.objects.create(
            dispense_order=self.order,
            medicine=self.med_amiodarone,
            prescribed_quantity=2,
            dispensed_quantity=0,
            unit_price=Decimal('120.00'),
            line_total=Decimal('240.00'),
            dosage_instruction='150 mg IV over 10 min, then infusion'
        )

    def test_allocation_visibility_in_queue(self):
        """
        Requirement 1: Verify Requested, Allocated, Remaining, and Backordered quantities are returned.
        """
        response = self.client.get('/api/pharmacy/ipd/queue/?tab=requests')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)

        order_data = next((o for o in response.data if o['id'] == str(self.order.id)), None)
        self.assertIsNotNone(order_data)
        line = order_data['lines'][0]
        self.assertEqual(line['prescribed_quantity'], 2)  # Requested
        self.assertEqual(line['allocated_quantity'], 2)   # Allocated
        self.assertEqual(line['remaining_quantity'], 0)   # Remaining
        self.assertEqual(line['backordered_quantity'], 0) # Backordered

    def test_update_allocation_endpoint(self):
        """
        Requirement 1: Verify updating line allocation amounts via API.
        """
        payload = {
            'order_id': str(self.order.id),
            'item_id': str(self.item_amio.id),
            'allocated_quantity': 1,
            'backordered_quantity': 1,
        }
        response = self.client.post('/api/pharmacy/ipd/allocation/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['allocated_quantity'], 1)
        self.assertEqual(response.data['backordered_quantity'], 1)
        self.assertEqual(response.data['remaining_quantity'], 1)

        # Verify saved in order ipd_data
        self.order.refresh_from_db()
        self.assertIn('allocations', self.order.ipd_data)
        self.assertEqual(self.order.ipd_data['allocations'][str(self.item_amio.id)]['allocated_quantity'], 1)

    def test_alternative_medicine_prescriber_approval(self):
        """
        Requirement 3: Verify requesting prescriber approval and recording substitution audit.
        """
        payload = {
            'order_id': str(self.order.id),
            'item_id': str(self.item_amio.id),
            'substitute_code': 'MER',
            'substitute_name': 'Meropenem 1g IV',
            'prescriber_name': 'Dr. Michael Chang',
            'reason': 'Formulary approved therapeutic substitute due to stock shortage',
            'approval_notes': 'Verbal confirmation Dr. Chang at 08:30 AM',
            'prescriber_approved': True
        }
        response = self.client.post('/api/pharmacy/ipd/substitute-approval/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['audit']['substitute_name'], 'Meropenem 1g IV')
        self.assertTrue(response.data['audit']['prescriber_approved'])

        # Verify item substitution note recorded
        self.item_amio.refresh_from_db()
        self.assertIsNotNone(self.item_amio.substituted_medicine)
        self.assertEqual(self.item_amio.substituted_medicine.item_code, 'MER')

    def test_ward_handover_tracking(self):
        """
        Requirement 4: Verify capturing Collected By (Nurse), Collection Time, Handed Over By.
        """
        payload = {
            'order_id': str(self.order.id),
            'collected_by': 'Rina Thomas',
            'collection_time': '08:45',
            'handed_over_by': 'Sneha Nair (PH-4380)',
            'notes': 'All items counted with ward nurse and signed'
        }
        response = self.client.post('/api/pharmacy/ipd/handover-tracking/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['handover']['collected_by'], 'Rina Thomas')
        self.assertEqual(response.data['handover']['collection_time'], '08:45')

        # Verify order received_by_nurse updated
        self.order.refresh_from_db()
        self.assertEqual(self.order.received_by_nurse, 'Rina Thomas')
        self.assertEqual(self.order.step, 4)

    def test_mar_status_update(self):
        """
        Requirement 5: Verify MAR status update to Ready To Administer and Administered.
        """
        payload = {
            'order_id': str(self.order.id),
            'mar_status': 'Administered'
        }
        response = self.client.post('/api/pharmacy/ipd/mar-status/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['mar_status'], 'Administered')

        # Verify in ipd_data
        self.order.refresh_from_db()
        self.assertEqual(self.order.ipd_data['mar_statuses'][str(self.item_amio.id)], 'Administered')

    def test_pending_status_filtering(self):
        """
        Requirement 6: Verify pending status categories (Reviewing, Allocated, Awaiting Pickup, Issued).
        """
        # Step 1 is Reviewing
        res_reviewing = self.client.get('/api/pharmacy/ipd/queue/?tab=pending&pending_status=Reviewing')
        self.assertEqual(res_reviewing.status_code, status.HTTP_200_OK)
        self.assertTrue(any(o['id'] == str(self.order.id) for o in res_reviewing.data))

        # Advance to step 2 (Allocated)
        self.order.step = 2
        self.order.save()
        res_allocated = self.client.get('/api/pharmacy/ipd/queue/?tab=pending&pending_status=Allocated')
        self.assertEqual(res_allocated.status_code, status.HTTP_200_OK)
        self.assertTrue(any(o['id'] == str(self.order.id) for o in res_allocated.data))

    def test_ward_return_classification_and_processing(self):
        """
        Requirement 7: Verify return classifications (Patient Discharged, Expired, Damaged, Unused).
        """
        ret = PharmacyReturn.objects.create(
            return_number='RET-4001',
            return_type=ReturnType.WARD_IPD,
            patient=self.patient,
            admission=self.admission,
            ward_name='HDU',
            bed_number='Bed 2',
            nurse_name='Anita Joseph',
            item_type='Patient Discharged',
            status='Received',
            total_refund_amount=Decimal('240.00'),
            reason='Patient discharged home with oral medication'
        )
        PharmacyReturnItem.objects.create(
            pharmacy_return=ret,
            medicine=self.med_amiodarone,
            batch=self.batch_amio,
            quantity_returned=2,
            refund_unit_price=Decimal('120.00'),
            line_refund_total=Decimal('240.00')
        )

        # Create active Inpatient Invoice
        inv = Invoice.objects.create(
            invoice_number='INV-IPD-001',
            date='2026-10-04',
            patient=self.patient,
            category=InvoiceCategory.IPD,
            status=InvoiceStatus.UNPAID,
            total=Decimal('1500.00'),
            balance=Decimal('1500.00')
        )

        payload = {
            'action': 'complete',
            'disposition': 'restock',
            'classification': 'Patient Discharged',
            'checks': {'seal_intact': True, 'condition_verified': True}
        }
        response = self.client.post(f'/api/pharmacy/ipd/returns/{ret.id}/process/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['return']['status'], 'Credited')

        # Verify invoice credit applied
        inv.refresh_from_db()
        self.assertEqual(inv.total, Decimal('1260.00'))
        self.assertEqual(inv.balance, Decimal('1260.00'))

        # Verify batch restocked
        self.batch_amio.refresh_from_db()
        self.assertEqual(self.batch_amio.available_quantity, 22)
