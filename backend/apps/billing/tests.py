import uuid
from decimal import Decimal
from django.test import TestCase
from apps.accounts.models import User, RoleType
from apps.patients.models import Patient
from apps.ipd.models import InpatientAdmission
from apps.billing.models import (
    BillingCounter, CounterShift, ShiftStatus,
    Invoice, InvoiceItem, InvoiceCategory, InvoiceStatus,
    Payment, TenderMode, PatientDeposit, DepositStatus,
    RefundRequest, RefundStatus, TariffMaster, ServicePackage,
    CorporateAccount, FinancialDischargeClearance, DischargeClearanceStatus
)
from apps.billing.serializers import (
    BillingCounterSerializer, CounterShiftSerializer,
    InvoiceSerializer, PaymentSerializer, PatientDepositSerializer,
    RefundRequestSerializer, TariffMasterSerializer,
    FinancialDischargeClearanceSerializer
)

class BillingModelAndSerializerTestCase(TestCase):
    def setUp(self):
        # Create cashier user
        self.cashier = User.objects.create_user(
            username='cashier_test',
            password='Password123!',
            first_name='Ritu',
            last_name='Verma',
            role=RoleType.CASHIER
        )
        # Create supervisor user
        self.supervisor = User.objects.create_user(
            username='supervisor_test',
            password='Password123!',
            first_name='Vikramaditya',
            last_name='Rao',
            role=RoleType.BILLING_SUPERVISOR
        )
        # Create patient
        self.patient = Patient.objects.create(
            first_name='Anita',
            last_name='Roy',
            gender='FEMALE',
            date_of_birth='1988-06-15',
            uhid='NH-2026-0099',
            phone_number='9876543210'
        )

    def test_billing_counter_and_shift(self):
        counter = BillingCounter.objects.create(
            code='CNT-01',
            name='Counter 1 - Main Lobby OPD',
            station_location='OPD_LOBBY',
            is_active=True
        )
        self.assertEqual(str(counter), 'CNT-01 - Counter 1 - Main Lobby OPD (Main OPD Lobby)')

        shift = CounterShift.objects.create(
            counter=counter,
            cashier=self.cashier,
            opening_float=Decimal('5000.00'),
            status=ShiftStatus.OPEN
        )
        self.assertEqual(shift.opening_float, Decimal('5000.00'))
        self.assertEqual(shift.status, ShiftStatus.OPEN)

        # Serializer test
        serializer = CounterShiftSerializer(shift)
        self.assertEqual(serializer.data['counterCode'], 'CNT-01')
        self.assertEqual(serializer.data['cashierName'], 'Ritu Verma')

    def test_patient_deposit_lifecycle(self):
        counter = BillingCounter.objects.create(
            code='CNT-02',
            name='Counter 2 - IPD Desk',
            station_location='IPD_DESK'
        )
        deposit = PatientDeposit.objects.create(
            deposit_number='DEP-202610-0001',
            patient=self.patient,
            deposit_amount=Decimal('25000.00'),
            utilized_amount=Decimal('0.00'),
            available_balance=Decimal('25000.00'),
            tender_mode=TenderMode.CASH,
            counter=counter,
            cashier=self.cashier,
            status=DepositStatus.ACTIVE
        )
        self.assertEqual(deposit.available_balance, Decimal('25000.00'))
        self.assertTrue(deposit.deposit_number.startswith('DEP-'))

        serializer = PatientDepositSerializer(deposit)
        self.assertEqual(serializer.data['depositNumber'], 'DEP-202610-0001')
        self.assertEqual(serializer.data['patientName'], 'Anita Roy')

    def test_invoice_and_multi_tender_payment(self):
        counter = BillingCounter.objects.create(
            code='CNT-03',
            name='Counter 3 - Diagnostics',
            station_location='DIAGNOSTICS'
        )
        invoice = Invoice.objects.create(
            invoice_number='INV-202610-0001',
            patient=self.patient,
            category=InvoiceCategory.OPD,
            date='2026-10-03',
            subtotal=Decimal('3500.00'),
            discount=Decimal('0.00'),
            tax=Decimal('0.00'),
            total=Decimal('3500.00'),
            paid=Decimal('0.00'),
            balance=Decimal('3500.00'),
            status=InvoiceStatus.UNPAID,
            counter=counter,
            cashier=self.cashier
        )
        # Add item
        item = InvoiceItem.objects.create(
            invoice=invoice,
            source='Consultation',
            department='OPD',
            service_code='CONS-SPEC-01',
            description='Cardiology Consultation Fee',
            qty=1,
            unit_price=Decimal('3500.00'),
            total=Decimal('3500.00')
        )
        # Add payments: Split tender (₹1,500 Cash + ₹2,000 UPI)
        p1 = Payment.objects.create(
            invoice=invoice,
            patient=self.patient,
            payment_number='RCP-202610-0001',
            amount=Decimal('1500.00'),
            tender_mode=TenderMode.CASH,
            payment_status='SUCCESS',
            counter=counter,
            cashier=self.cashier
        )
        p2 = Payment.objects.create(
            invoice=invoice,
            patient=self.patient,
            payment_number='RCP-202610-0002',
            amount=Decimal('2000.00'),
            tender_mode=TenderMode.UPI,
            upi_vpa='patient@okaxis',
            payment_status='SUCCESS',
            counter=counter,
            cashier=self.cashier
        )
        invoice.paid = p1.amount + p2.amount
        invoice.balance = invoice.total - invoice.paid
        invoice.status = InvoiceStatus.PAID
        invoice.save()

        self.assertEqual(invoice.paid, Decimal('3500.00'))
        self.assertEqual(invoice.balance, Decimal('0.00'))
        self.assertEqual(invoice.status, InvoiceStatus.PAID)

        serializer = InvoiceSerializer(invoice)
        self.assertEqual(len(serializer.data['items']), 1)
        self.assertEqual(len(serializer.data['payments']), 2)
        self.assertEqual(serializer.data['patientName'], 'Anita Roy')

    def test_refund_request_workflow(self):
        invoice = Invoice.objects.create(
            invoice_number='INV-202610-0002',
            patient=self.patient,
            category=InvoiceCategory.LAB,
            date='2026-10-03',
            subtotal=Decimal('1200.00'),
            total=Decimal('1200.00'),
            paid=Decimal('1200.00'),
            balance=Decimal('0.00'),
            status=InvoiceStatus.PAID
        )
        refund = RefundRequest.objects.create(
            refund_number='RFD-202610-0001',
            invoice=invoice,
            patient=self.patient,
            requested_amount=Decimal('1200.00'),
            reason='Patient test cancelled prior to sample collection',
            clinical_justification='Consultant changed clinical protocol to MRI',
            status=RefundStatus.PENDING,
            initiated_by=self.cashier
        )
        self.assertEqual(refund.status, RefundStatus.PENDING)
        serializer = RefundRequestSerializer(refund)
        self.assertEqual(serializer.data['initiatedByName'], 'Ritu Verma')

    def test_tariff_master_and_packages(self):
        tariff = TariffMaster.objects.create(
            code='LAB-CBC-01',
            name='Complete Blood Count (CBC) with ESR',
            department='LAB',
            base_price=Decimal('650.00'),
            gst_rate=Decimal('0.00'),
            is_active=True
        )
        self.assertEqual(tariff.base_price, Decimal('650.00'))

        package = ServicePackage.objects.create(
            code='PKG-MATERNITY-01',
            name='Normal Delivery Maternity Package',
            package_price=Decimal('45000.00'),
            department='OBGYN',
            inclusions_description='3 days general ward, pediatrician round, delivery charges',
            exclusions_description='Blood transfusion, emergency vacuum extraction',
            validity_days=5
        )
        self.assertEqual(package.package_price, Decimal('45000.00'))

    def test_financial_discharge_clearance(self):
        admission = InpatientAdmission.objects.create(
            admission_number='ADM-202610-0001',
            patient=self.patient,
            ward_name='ICU'
        )
        invoice = Invoice.objects.create(
            invoice_number='INV-202610-0003',
            patient=self.patient,
            category=InvoiceCategory.IPD,
            date='2026-10-03',
            subtotal=Decimal('54000.00'),
            total=Decimal('54000.00'),
            paid=Decimal('54000.00'),
            balance=Decimal('0.00'),
            status=InvoiceStatus.PAID
        )
        clearance = FinancialDischargeClearance.objects.create(
            admission=admission,
            final_invoice=invoice,
            clearance_status=DischargeClearanceStatus.CLEARED,
            net_payable=Decimal('54000.00'),
            deposit_applied=Decimal('20000.00'),
            insurance_covered=Decimal('25000.00'),
            patient_paid=Decimal('9000.00'),
            cleared_by=self.cashier,
            qr_verification_token='CLR-TOKEN-202610-998877'
        )
        self.assertEqual(clearance.clearance_status, DischargeClearanceStatus.CLEARED)
        serializer = FinancialDischargeClearanceSerializer(clearance)
        self.assertEqual(serializer.data['admissionNumber'], 'ADM-202610-0001')
        self.assertEqual(serializer.data['qr_verification_token'], 'CLR-TOKEN-202610-998877')


class TariffPricingAndApiTestCase(TestCase):
    def setUp(self):
        self.tariff_ecg = TariffMaster.objects.create(
            code='CARD-ECG-01',
            name='12-Lead Electrocardiogram (ECG)',
            department='CARDIOLOGY',
            base_price=Decimal('500.00'),
            emergency_markup_percent=Decimal('20.00'),
            gst_rate=Decimal('5.00'),
            is_active=True
        )
        self.tariff_echo = TariffMaster.objects.create(
            code='CARD-ECHO-01',
            name='2D Echocardiography with Color Doppler',
            department='CARDIOLOGY',
            base_price=Decimal('2500.00'),
            emergency_markup_percent=Decimal('15.00'),
            gst_rate=Decimal('0.00'),
            is_active=True
        )
        self.pkg_cardiac = ServicePackage.objects.create(
            code='PKG-ANGIO-01',
            name='Coronary Angiography Daycare Package',
            package_price=Decimal('18500.00'),
            department='CARDIOLOGY',
            inclusions_description='Procedure, Cath Lab consumables, Daycare bed, 12-lead ECG, Post-op observation',
            exclusions_description='Stent placement, Emergency IABP, Blood components',
            validity_days=2
        )
        self.corp_ongc = CorporateAccount.objects.create(
            code='CORP-ONGC',
            name='Oil and Natural Gas Corporation (ONGC)',
            account_type='CORPORATE',
            credit_limit=Decimal('500000.00'),
            utilized_credit=Decimal('50000.00'),
            co_pay_percentage=Decimal('10.00'),
            deductible_amount=Decimal('0.00'),
            is_active=True
        )

    def test_effective_tariff_calculation(self):
        from apps.billing.services import TariffPricingService
        
        # Standard OPD rate
        opd_calc = TariffPricingService.get_effective_tariff('CARD-ECG-01', encounter_type='OPD', is_emergency=False)
        self.assertIsNotNone(opd_calc)
        self.assertEqual(opd_calc['base_price'], Decimal('500.00'))
        self.assertEqual(opd_calc['markup_amount'], Decimal('0.00'))
        self.assertEqual(opd_calc['gst_rate'], Decimal('5.00'))
        self.assertEqual(opd_calc['tax_amount'], Decimal('25.00'))
        self.assertEqual(opd_calc['net_price'], Decimal('525.00'))

        # Emergency 20% markup rate
        emg_calc = TariffPricingService.get_effective_tariff('CARD-ECG-01', encounter_type='EMERGENCY', is_emergency=True)
        self.assertIsNotNone(emg_calc)
        self.assertEqual(emg_calc['base_price'], Decimal('500.00'))
        self.assertEqual(emg_calc['markup_amount'], Decimal('100.00')) # 20% of 500
        self.assertEqual(emg_calc['subtotal'], Decimal('600.00'))
        self.assertEqual(emg_calc['tax_amount'], Decimal('30.00')) # 5% of 600
        self.assertEqual(emg_calc['net_price'], Decimal('630.00'))

    def test_quotation_calculator_and_corporate_copay(self):
        from apps.billing.services import TariffPricingService

        items_payload = [
            {'service_code': 'CARD-ECG-01', 'qty': 1},
            {'service_code': 'CARD-ECHO-01', 'qty': 1}
        ]

        # General OPD quote
        quote = TariffPricingService.calculate_quote(
            items=items_payload,
            encounter_type='OPD',
            patient_category='GENERAL'
        )
        self.assertEqual(quote['gross_total'], Decimal('3000.00'))
        self.assertEqual(quote['total_tax'], Decimal('25.00'))
        self.assertEqual(quote['net_payable'], Decimal('3025.00'))
        self.assertEqual(quote['patient_responsibility'], Decimal('3025.00'))
        self.assertEqual(quote['sponsor_responsibility'], Decimal('0.00'))

        # Corporate ONGC quote (10% co-pay)
        corp_quote = TariffPricingService.calculate_quote(
            items=items_payload,
            encounter_type='OPD',
            patient_category='CORPORATE',
            corporate_account_id=str(self.corp_ongc.id)
        )
        self.assertEqual(corp_quote['net_payable'], Decimal('3025.00'))
        self.assertEqual(corp_quote['patient_responsibility'], Decimal('302.50')) # 10% co-pay
        self.assertEqual(corp_quote['sponsor_responsibility'], Decimal('2722.50')) # 90% corporate

    def test_package_coverage_check(self):
        from apps.billing.services import TariffPricingService
        
        # Covered item
        is_covered = TariffPricingService.check_package_coverage('PKG-ANGIO-01', '12-lead ECG')
        self.assertTrue(is_covered)

        # Excluded item
        is_stent_covered = TariffPricingService.check_package_coverage('PKG-ANGIO-01', 'Drug Eluting Stent')
        self.assertFalse(is_stent_covered)

    def test_pricing_apis(self):
        # 1. Tariff list API
        resp = self.client.get('/api/v1/billing/tariffs?department=CARDIOLOGY')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()), 2)

        # 2. Package list API
        resp = self.client.get('/api/v1/billing/packages?department=CARDIOLOGY')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()), 1)

        # 3. Dynamic Quote Calculate API
        resp = self.client.post('/api/v1/billing/pricing/calculate-quote', data={
            'items': [{'service_code': 'CARD-ECG-01', 'qty': 2}],
            'encounter_type': 'EMERGENCY',
            'is_emergency': True
        }, content_type='application/json')
        self.assertEqual(resp.status_code, 200)
        quote = resp.json()
        self.assertEqual(float(quote['gross_total']), 1200.00) # 2 * (500 + 100 markup)
        self.assertEqual(float(quote['total_tax']), 60.00) # 5% of 1200
        self.assertEqual(float(quote['net_payable']), 1260.00)


class Phase3CashierAndPOSServiceTestCase(TestCase):
    def setUp(self):
        self.cashier = User.objects.create_user(
            username='cashier_pos',
            password='Password123!',
            first_name='Sunita',
            last_name='Nair',
            role=RoleType.CASHIER
        )
        self.patient = Patient.objects.create(
            first_name='Rohan',
            last_name='Mehra',
            gender='MALE',
            date_of_birth='1990-08-20',
            uhid='NH-2026-0888',
            phone_number='9811122233'
        )

    def test_shift_open_summary_and_close(self):
        from apps.billing.services import CounterClosingService, BillingCoreService

        # 1. Open shift
        shift = CounterClosingService.open_shift(
            cashier=self.cashier,
            counter_code='COUNTER-01',
            opening_float=Decimal('5000.00')
        )
        self.assertIsNotNone(shift.id)
        self.assertEqual(shift.status, ShiftStatus.OPEN)
        self.assertEqual(shift.opening_float, Decimal('5000.00'))

        # 2. Check summary with no transactions yet
        summary = CounterClosingService.get_active_shift_summary(counter_code='COUNTER-01')
        self.assertTrue(summary['has_active_shift'])
        self.assertEqual(summary['cash_collected'], 0.0)
        self.assertEqual(summary['expected_cash_in_drawer'], 5000.0)

        # 3. Create invoice and collect payment in this shift
        inv = BillingCoreService.create_invoice_from_charges(
            patient=self.patient,
            items=[
                {'service_code': 'CONS-OPD-01', 'description': 'Senior Consultant Consultation', 'qty': 1, 'unit_price': 1000.00}
            ],
            category='OPD',
            cashier=self.cashier,
            counter=shift.counter,
            shift=shift
        )
        self.assertEqual(inv.total, Decimal('1000.00'))
        self.assertEqual(inv.status, 'UNPAID')

        # Pay 600 cash + 400 UPI
        pay_res = BillingCoreService.process_multi_tender_payment(
            invoice_id=str(inv.id),
            cashier=self.cashier,
            split_payments=[
                {'tender_mode': 'CASH', 'amount': 600.00},
                {'tender_mode': 'UPI', 'amount': 400.00, 'transaction_reference': 'UPI-TEST-1234'}
            ],
            counter=shift.counter,
            shift=shift
        )
        self.assertEqual(pay_res['status'], 'PAID')
        self.assertEqual(pay_res['remaining_balance'], Decimal('0.00'))
        self.assertEqual(len(pay_res['payments']), 2)

        # 4. Check summary after transaction
        summary_after = CounterClosingService.get_active_shift_summary(counter_code='COUNTER-01')
        self.assertEqual(summary_after['cash_collected'], 600.0)
        self.assertEqual(summary_after['upi_collected'], 400.0)
        self.assertEqual(summary_after['total_collected'], 1000.0)
        self.assertEqual(summary_after['expected_cash_in_drawer'], 5600.0) # 5000 float + 600 cash

        # 5. Close shift with physical cash count
        closed = CounterClosingService.close_shift(
            shift_id=str(shift.id),
            physical_cash_count=Decimal('5600.00'),
            notes='All matched perfectly'
        )
        self.assertEqual(closed.cash_variance, Decimal('0.00'))
        self.assertEqual(closed.status, ShiftStatus.PENDING_APPROVAL)

    def test_deposit_deduction_in_multi_tender(self):
        from apps.billing.services import BillingCoreService
        from apps.billing.models import PatientDeposit, DepositStatus

        # Setup active deposit of Rs 2000
        deposit = PatientDeposit.objects.create(
            deposit_number='DEP-TEST-001',
            patient=self.patient,
            deposit_amount=Decimal('2000.00'),
            utilized_amount=Decimal('0.00'),
            available_balance=Decimal('2000.00'),
            tender_mode=TenderMode.CASH,
            cashier=self.cashier,
            status=DepositStatus.ACTIVE
        )

        inv = BillingCoreService.create_invoice_from_charges(
            patient=self.patient,
            items=[{'description': 'Ultrasound Abdomen', 'qty': 1, 'unit_price': 2500.00}],
            category='RADIOLOGY'
        )

        # Pay Rs 1500 from deposit + Rs 1000 cash
        res = BillingCoreService.process_multi_tender_payment(
            invoice_id=str(inv.id),
            cashier=self.cashier,
            split_payments=[
                {'tender_mode': 'DEPOSIT_DEDUCTION', 'amount': 1500.00},
                {'tender_mode': 'CASH', 'amount': 1000.00}
            ]
        )
        self.assertEqual(res['status'], 'PAID')

        deposit.refresh_from_db()
        self.assertEqual(deposit.utilized_amount, Decimal('1500.00'))
        self.assertEqual(deposit.available_balance, Decimal('500.00'))
        self.assertEqual(deposit.status, DepositStatus.PARTIALLY_UTILIZED)

    def test_cashier_queue_and_receipt_apis(self):
        from apps.billing.services import BillingCoreService

        inv = BillingCoreService.create_invoice_from_charges(
            patient=self.patient,
            items=[{'description': 'Complete Blood Count', 'qty': 1, 'unit_price': 450.00}],
            category='LAB'
        )

        # 1. Test queue API
        q_resp = self.client.get('/api/v1/billing/cashier/queue')
        self.assertEqual(q_resp.status_code, 200)
        items = q_resp.json()
        self.assertTrue(any(i['invoice_id'] == str(inv.id) for i in items))

        # 2. Test multi-tender payment API
        pay_resp = self.client.post('/api/v1/billing/payments/multi-tender', data={
            'invoice_id': str(inv.id),
            'split_payments': [
                {'tender_mode': 'CASH', 'amount': 450.00}
            ]
        }, content_type='application/json')
        self.assertEqual(pay_resp.status_code, 200)
        self.assertEqual(pay_resp.json()['status'], 'PAID')

        # 3. Test receipt details API
        rcpt_resp = self.client.get(f'/api/v1/billing/invoices/{inv.id}/receipt')
        self.assertEqual(rcpt_resp.status_code, 200)
        rcpt = rcpt_resp.json()
        self.assertEqual(rcpt['hospital']['name'], 'NORTH HOSPITAL & MEDICAL RESEARCH CENTRE')
        self.assertEqual(rcpt['invoice']['invoice_number'], inv.invoice_number)
        self.assertEqual(rcpt['patient']['uhid'], self.patient.uhid)
        self.assertEqual(len(rcpt['payments']), 1)
        self.assertEqual(rcpt['payments'][0]['tender_mode'], 'CASH')


