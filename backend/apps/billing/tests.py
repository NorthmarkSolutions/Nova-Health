import uuid
from datetime import timedelta
from decimal import Decimal
from django.utils import timezone
from django.test import TestCase
from rest_framework.test import APITestCase
from apps.accounts.models import User, RoleType, DoctorProfile
from apps.patients.models import Patient
from apps.ipd.models import InpatientAdmission
from apps.billing.models import (
    BillingCounter, CounterShift, ShiftStatus,
    Invoice, InvoiceItem, InvoiceCategory, InvoiceStatus,
    Payment, TenderMode, PatientDeposit, DepositStatus,
    RefundRequest, RefundStatus, TariffMaster, ServicePackage,
    CorporateAccount, FinancialDischargeClearance, DischargeClearanceStatus,
    BillableChargeItem, ChargeItemStatus, BillingReceipt, ReceiptType, CreditNote,
    DepartmentChargeEvent, DepartmentChargeEventStatus, DepartmentGatingRule, GatingAction,
    SupervisorApprovalRequest, ApprovalStatus, CashDenominationTally, BillingAuditEvent, AuditEventType,
    TariffChangeRequest, TariffRevisionLog, EmergencyMarkupSchedule,
    ApprovalMatrixTier, TierLevel, MatrixActionType,
    BillingPolicyRule, PolicyCategory,
    CounterHardwareRegistry, HardwareStatus,
    BillingStaffRoster, StaffShiftType, RosterStatus,
    TPAClaimRecord, CorporateCreditVoucher, PreAuthStatus, ClaimLifecycleStatus,
    IPDRunningLedger, IPDRunningLedgerItemType, InterimDepositDemand, InterimDemandStatus,
    RevenueLeakageAlert, RevenueLeakageType, RevenueLeakageStatus,
    FraudRiskSignal, FraudRiskSignalSeverity,
    RevenueInvestigationCase, RevenueInvestigationStatus,
    FinancialPeriodLock, FinancialPeriodLocked, DailyRevenueSnapshot,
    GeneralLedgerJournalEntry, GeneralLedgerLineItem
)
from apps.billing.serializers import (
    BillingCounterSerializer, CounterShiftSerializer,
    InvoiceSerializer, PaymentSerializer, PatientDepositSerializer,
    RefundRequestSerializer, TariffMasterSerializer,
    FinancialDischargeClearanceSerializer,
    BillableChargeItemSerializer, BillingReceiptSerializer,
    CreditNoteSerializer, PatientLedgerSerializer,
    DepartmentChargeEventSerializer, DepartmentGatingRuleSerializer,
    TPAClaimRecordSerializer, CorporateCreditVoucherSerializer,
    IPDRunningLedgerSerializer, InterimDepositDemandSerializer
)
from apps.billing.services import (
    TariffPricingService, BillingCoreService, CounterClosingService,
    RefundWorkflowService, DepartmentChargeIntegrationService, CashierWorkspaceService,
    CounterShiftControlService, SupervisorGovernanceService, BillingAdminGovernanceService,
    TPACorporateBillingService, CorporateCreditLimitExceeded,
    IPDRunningLedgerService, RevenueIntegrityScannerService,
    BillingReportingService, GeneralLedgerIntegrationService
)
from apps.organization.models import Bed
from apps.lab.models import LabTest, LabOrder, LabOrderPriority, LabOrderStatus
from apps.appointments.models import Appointment, AppointmentType, AppointmentStatus
from apps.pharmacy.models import PharmacyDispenseOrder, DispenseOrderStatus


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


class TariffPricingAndApiTestCase(APITestCase):
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
        self.assertEqual(self.client.get('/api/v1/billing/tariffs?department=CARDIOLOGY').status_code, 401)
        cashier = User.objects.create_user(username='pricing_cashier', password='Password123!', role=RoleType.CASHIER)
        self.client.force_authenticate(user=cashier)
        # Cashiers may read tariffs but never edit them (Billing Admin and above)
        self.assertEqual(self.client.post('/api/v1/billing/tariffs', data={
            'code': 'X-1', 'name': 'X', 'department': 'GENERAL', 'base_price': '1.00'
        }, format='json').status_code, 403)

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
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        quote = resp.json()
        self.assertEqual(float(quote['gross_total']), 1200.00) # 2 * (500 + 100 markup)
        self.assertEqual(float(quote['total_tax']), 60.00) # 5% of 1200
        self.assertEqual(float(quote['net_payable']), 1260.00)


class Phase3CashierAndPOSServiceTestCase(APITestCase):
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
        summary = CounterClosingService.get_active_shift_summary(cashier=self.cashier, counter_code='COUNTER-01')
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
        summary_after = CounterClosingService.get_active_shift_summary(cashier=self.cashier, counter_code='COUNTER-01')
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

        # Billing data is never served anonymously
        self.assertEqual(self.client.get('/api/v1/billing/cashier/queue').status_code, 401)
        self.assertEqual(self.client.post('/api/v1/billing/payments/multi-tender', data={
            'invoice_id': str(inv.id), 'split_payments': [{'tender_mode': 'CASH', 'amount': 450.00}]
        }, format='json').status_code, 401)
        self.client.force_authenticate(user=self.cashier)
        from apps.billing.services import CounterShiftControlService
        CounterShiftControlService.open_shift(self.cashier, 'COUNTER-01', Decimal('5000.00'))

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
        }, format='json')
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


class Phase1CoreBillingTestCase(APITestCase):
    def setUp(self):
        self.cashier = User.objects.create_user(
            username='cashier_raj',
            password='Password123!',
            first_name='Raj',
            last_name='Malhotra',
            role=RoleType.CASHIER
        )
        self.supervisor = User.objects.create_user(
            username='supervisor_priya',
            password='Password123!',
            first_name='Priya',
            last_name='Nair',
            role=RoleType.BILLING_SUPERVISOR
        )
        self.billing_admin = User.objects.create_user(
            username='admin_suresh',
            password='Password123!',
            first_name='Suresh',
            last_name='Menon',
            role=RoleType.BILLING_ADMIN
        )
        self.doctor = User.objects.create_user(
            username='dr_sharma',
            password='Password123!',
            first_name='Anand',
            last_name='Sharma',
            role=RoleType.DOCTOR
        )
        self.patient = Patient.objects.create(
            first_name='Rohan',
            last_name='Kapoor',
            gender='MALE',
            date_of_birth='1990-04-12',
            uhid='NH-2026-9001',
            phone_number='9811223344'
        )
        self.counter = BillingCounter.objects.create(
            code='COUNTER-01',
            name='Central OPD Desk',
            station_location='OPD_LOBBY',
            is_active=True
        )
        # Phase 4 shift guard: money only moves through the acting user's own open shift
        from apps.billing.services import CounterShiftControlService
        self.cashier_shift = CounterShiftControlService.open_shift(self.cashier, 'COUNTER-01', Decimal('5000.00'))
        self.supervisor_shift = CounterShiftControlService.open_shift(self.supervisor, 'COUNTER-SUP', Decimal('5000.00'))

    def test_billable_charge_item_lifecycle(self):
        self.client.force_authenticate(user=self.cashier)

        # 1. Create charge item via API
        resp = self.client.post('/api/v1/billing/charges/', data={
            'patient': str(self.patient.id),
            'department': 'OPD',
            'service_code': 'OPD-CONS-GEN',
            'service_name': 'General Consultation',
            'unit_price': 500.00,
            'quantity': 1,
            'discount_amount': 50.00,
            'tax_rate': 0.00,
            'total_amount': 450.00,
            'source_reference_id': 'APPT-1001'
        }, content_type='application/json')
        self.assertEqual(resp.status_code, 201)
        charge_data = resp.json()
        self.assertEqual(charge_data['status'], 'PENDING')
        self.assertEqual(charge_data['service_name'], 'General Consultation')
        self.assertEqual(charge_data['uhid'], 'NH-2026-9001')

        # 2. Query charge items by UHID
        get_resp = self.client.get(f'/api/v1/billing/charges/?uhid={self.patient.uhid}')
        self.assertEqual(get_resp.status_code, 200)
        self.assertEqual(len(get_resp.json()), 1)

    def test_consolidate_charges_to_invoice(self):
        # Create 2 pending charges
        c1 = BillableChargeItem.objects.create(
            patient=self.patient,
            department='OPD',
            service_code='CONS-01',
            service_name='Specialist OPD',
            unit_price=Decimal('800.00'),
            quantity=1,
            discount_amount=Decimal('0.00'),
            tax_rate=Decimal('0.00'),
            tax_amount=Decimal('0.00'),
            total_amount=Decimal('800.00'),
            status=ChargeItemStatus.PENDING
        )
        c2 = BillableChargeItem.objects.create(
            patient=self.patient,
            department='LAB',
            service_code='LAB-CBC',
            service_name='Complete Blood Count',
            unit_price=Decimal('450.00'),
            quantity=1,
            discount_amount=Decimal('50.00'),
            tax_rate=Decimal('5.00'),
            tax_amount=Decimal('20.00'),
            total_amount=Decimal('420.00'),
            status=ChargeItemStatus.PENDING
        )

        self.client.force_authenticate(user=self.cashier)
        resp = self.client.post('/api/v1/billing/invoices/', data={
            'patient': str(self.patient.id),
            'charge_ids': [str(c1.id), str(c2.id)],
            'encounter_type': 'OPD'
        }, content_type='application/json')

        self.assertEqual(resp.status_code, 201)
        inv_data = resp.json()
        self.assertEqual(inv_data['status'], 'UNPAID')
        # subtotal: 800 + 450 = 1250, discount: 50, tax: 20, total: 1220
        self.assertEqual(float(inv_data['total']), 1220.00)

        # Charges should now be INVOICED
        c1.refresh_from_db()
        c2.refresh_from_db()
        self.assertEqual(c1.status, ChargeItemStatus.INVOICED)
        self.assertEqual(c2.status, ChargeItemStatus.INVOICED)
        self.assertEqual(c1.invoice.invoice_number, inv_data['invoice_number'])

        # Attempting to re-invoice already invoiced charges raises error
        resp2 = self.client.post('/api/v1/billing/invoices/', data={
            'patient': str(self.patient.id),
            'charge_ids': [str(c1.id)],
        }, content_type='application/json')
        self.assertEqual(resp2.status_code, 400)

    def test_multi_tender_payment_math_and_receipt_generation(self):
        invoice = Invoice.objects.create(
            invoice_number='INV-202610-00999',
            patient=self.patient,
            category='OPD',
            date='2026-10-05',
            subtotal=Decimal('1000.00'),
            total=Decimal('1000.00'),
            paid=Decimal('0.00'),
            balance=Decimal('1000.00'),
            status='UNPAID'
        )

        self.client.force_authenticate(user=self.cashier)
        resp = self.client.post('/api/v1/billing/payments/multi-tender/', data={
            'invoice_id': str(invoice.id),
            'split_payments': [
                {'tender_mode': 'CASH', 'amount': 400.00},
                {'tender_mode': 'UPI', 'amount': 300.00, 'upi_vpa': 'patient@okhdfcbank'},
                {'tender_mode': 'CARD', 'amount': 300.00, 'card_last_four': '4321', 'card_network': 'VISA'}
            ]
        }, content_type='application/json')

        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data['status'], 'PAID')
        self.assertEqual(data['remaining_balance'], 0.0)
        self.assertEqual(len(data['payments']), 3)

        # Verify BillingReceipt record created
        receipt = BillingReceipt.objects.filter(invoice=invoice).first()
        self.assertIsNotNone(receipt)
        self.assertTrue(receipt.receipt_number.startswith('RCP-'))
        self.assertTrue(receipt.qr_verification_token.startswith('NORTH_HOSPITAL|'))
        self.assertEqual(receipt.patient, self.patient)

        # Verify receipt query API
        rcpt_resp = self.client.get(f'/api/v1/billing/receipts/?invoice_id={invoice.id}')
        self.assertEqual(rcpt_resp.status_code, 200)
        self.assertEqual(len(rcpt_resp.json()), 1)

    def test_patient_deposit_lifecycle_and_overdraft_validation(self):
        self.client.force_authenticate(user=self.cashier)

        # 1. Record Advance Deposit of ₹3,000
        dep_resp = self.client.post('/api/v1/billing/deposits/', data={
            'patient': str(self.patient.id),
            'amount': 3000.00,
            'tender_mode': 'CASH',
            'notes': 'Pre-admission advance'
        }, content_type='application/json')
        self.assertEqual(dep_resp.status_code, 201)
        dep_data = dep_resp.json()
        self.assertEqual(float(dep_data['available_balance']), 3000.00)
        self.assertEqual(dep_data['status'], 'ACTIVE')

        # 2. Create invoice of ₹4,000
        invoice = Invoice.objects.create(
            invoice_number='INV-202610-00888',
            patient=self.patient,
            category='IPD',
            date='2026-10-05',
            subtotal=Decimal('4000.00'),
            total=Decimal('4000.00'),
            paid=Decimal('0.00'),
            balance=Decimal('4000.00'),
            status='UNPAID'
        )

        # 3. Test Overdraft: Attempt to deduct ₹3,500 from ₹3,000 deposit
        overdraft_resp = self.client.post('/api/v1/billing/payments/multi-tender/', data={
            'invoice_id': str(invoice.id),
            'split_payments': [
                {'tender_mode': 'DEPOSIT_DEDUCTION', 'amount': 3500.00}
            ]
        }, content_type='application/json')
        self.assertEqual(overdraft_resp.status_code, 400)
        self.assertIn('Insufficient patient deposit balance', overdraft_resp.json()['error'])

        # 4. Valid settlement: Deduct ₹2,000 from deposit + ₹2,000 Cash
        valid_pay_resp = self.client.post('/api/v1/billing/payments/multi-tender/', data={
            'invoice_id': str(invoice.id),
            'split_payments': [
                {'tender_mode': 'DEPOSIT_DEDUCTION', 'amount': 2000.00},
                {'tender_mode': 'CASH', 'amount': 2000.00}
            ]
        }, content_type='application/json')
        self.assertEqual(valid_pay_resp.status_code, 200)

        # Check deposit state
        deposit = PatientDeposit.objects.get(id=dep_data['id'])
        self.assertEqual(deposit.utilized_amount, Decimal('2000.00'))
        self.assertEqual(deposit.available_balance, Decimal('1000.00'))
        self.assertEqual(deposit.status, DepositStatus.PARTIALLY_UTILIZED)

    def test_patient_ledger_endpoint(self):
        # Create deposit
        PatientDeposit.objects.create(
            deposit_number='DEP-202610-00001',
            patient=self.patient,
            deposit_amount=Decimal('5000.00'),
            utilized_amount=Decimal('1500.00'),
            available_balance=Decimal('3500.00'),
            status=DepositStatus.PARTIALLY_UTILIZED
        )
        # Create invoice
        inv = Invoice.objects.create(
            invoice_number='INV-202610-00100',
            patient=self.patient,
            category='OPD',
            date='2026-10-05',
            subtotal=Decimal('1500.00'),
            total=Decimal('1500.00'),
            paid=Decimal('1500.00'),
            balance=Decimal('0.00'),
            status='PAID'
        )
        Payment.objects.create(
            invoice=inv,
            patient=self.patient,
            payment_number='PAY-20261005-0001',
            amount=Decimal('1500.00'),
            payment_status='SUCCESS',
            cashier=self.cashier
        )

        self.client.force_authenticate(user=self.cashier)
        resp = self.client.get(f'/api/v1/billing/patients/{self.patient.uhid}/ledger/')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data['patient']['uhid'], self.patient.uhid)
        self.assertEqual(float(data['total_invoiced']), 1500.00)
        self.assertEqual(float(data['total_paid']), 1500.00)
        self.assertEqual(float(data['available_deposit_balance']), 3500.00)
        self.assertEqual(float(data['net_outstanding_balance']), 0.00)

    def test_refund_workflow_and_credit_note_generation(self):
        invoice = Invoice.objects.create(
            invoice_number='INV-202610-00777',
            patient=self.patient,
            category='OPD',
            date='2026-10-05',
            subtotal=Decimal('800.00'),
            total=Decimal('800.00'),
            paid=Decimal('800.00'),
            balance=Decimal('0.00'),
            status='PAID'
        )
        Payment.objects.create(
            invoice=invoice,
            patient=self.patient,
            payment_number='PAY-20261005-0777',
            amount=Decimal('800.00'),
            tender_mode='CASH',
            payment_status='SUCCESS',
            cashier=self.cashier
        )

        self.client.force_authenticate(user=self.cashier)

        # 1. Attempt refund exceeding paid amount (₹1,000 > ₹800) -> should fail
        fail_resp = self.client.post('/api/v1/billing/refunds/request/', data={
            'invoice_id': str(invoice.id),
            'amount': 1000.00,
            'reason': 'Overcharge claim'
        }, content_type='application/json')
        self.assertEqual(fail_resp.status_code, 400)
        self.assertIn('exceeds eligible settled balance', fail_resp.json()['error'])

        # 2. Cashier initiates eligible refund of ₹300
        req_resp = self.client.post('/api/v1/billing/refunds/request/', data={
            'invoice_id': str(invoice.id),
            'amount': 300.00,
            'reason': 'Cancelled service consultation',
            'clinical_justification': 'Consultant was called into emergency surgery'
        }, content_type='application/json')
        self.assertEqual(req_resp.status_code, 201)
        ref_data = req_resp.json()
        self.assertEqual(ref_data['status'], 'PENDING')
        refund_id = ref_data['id']

        # 3. Doctor/Non-billing user attempts to approve -> 403 Forbidden
        self.client.force_authenticate(user=self.doctor)
        doc_resp = self.client.post(f'/api/v1/billing/refunds/{refund_id}/approve/', data={})
        self.assertEqual(doc_resp.status_code, 403)

        # 4. Supervisor approves refund -> Disburses & creates CreditNote
        self.client.force_authenticate(user=self.supervisor)
        app_resp = self.client.post(f'/api/v1/billing/refunds/{refund_id}/approve/', data={
            'disbursed_tender': 'CASH'
        }, content_type='application/json')
        self.assertEqual(app_resp.status_code, 200)
        app_data = app_resp.json()
        self.assertEqual(app_data['refund_request']['status'], 'DISBURSED')
        self.assertTrue(app_data['credit_note']['credit_note_number'].startswith('CN-'))
        self.assertEqual(float(app_data['credit_note']['amount']), 300.00)

        # Invoice paid amount adjusted
        invoice.refresh_from_db()
        self.assertEqual(invoice.paid, Decimal('500.00'))
        self.assertEqual(invoice.balance, Decimal('300.00'))

    def test_rbac_access_controls(self):
        # Doctor role should not be able to write charges or deposits
        self.client.force_authenticate(user=self.doctor)
        resp1 = self.client.post('/api/v1/billing/deposits/', data={
            'patient': str(self.patient.id),
            'amount': 100.00
        }, content_type='application/json')
        self.assertEqual(resp1.status_code, 403)

        # Cashier role should be allowed
        self.client.force_authenticate(user=self.cashier)
        resp2 = self.client.post('/api/v1/billing/deposits/', data={
            'patient': str(self.patient.id),
            'amount': 100.00,
            'tender_mode': 'CASH'
        }, content_type='application/json')
        self.assertEqual(resp2.status_code, 201)


class Phase2DepartmentIntegrationTestCase(APITestCase):
    def setUp(self):
        # 1. Create users
        self.cashier = User.objects.create_user(
            username='cashier_ph2',
            password='Password123!',
            first_name='Anita',
            last_name='Deshmukh',
            role=RoleType.CASHIER
        )
        self.supervisor = User.objects.create_user(
            username='sup_ph2',
            password='Password123!',
            first_name='Kailash',
            last_name='Nath',
            role=RoleType.BILLING_SUPERVISOR
        )
        self.doctor_user = User.objects.create_user(
            username='dr_ph2_arun',
            password='Password123!',
            first_name='Arun',
            last_name='Verma',
            role=RoleType.DOCTOR
        )
        self.doctor_profile = DoctorProfile.objects.create(
            user=self.doctor_user,
            department='Cardiology',
            license_number='DOC-CARD-009',
            qualification='MD, DM (Cardiology)',
            consultation_fee=Decimal('800.00')
        )
        self.lab_tech = User.objects.create_user(
            username='lab_tech_ph2',
            password='Password123!',
            first_name='Sunil',
            last_name='Gowda',
            role=RoleType.LAB_TECH
        )
        # 2. Create patient
        self.patient = Patient.objects.create(
            first_name='Mohan',
            last_name='Lal',
            gender='MALE',
            date_of_birth='1985-02-20',
            uhid='NH-2026-PH2-01',
            phone_number='9876543299'
        )
        # 3. Create counter & shift
        self.counter = BillingCounter.objects.create(
            code='CNT-PH2-01',
            name='Central Billing Desk',
            station_location='OPD_LOBBY',
            is_active=True
        )
        self.shift = CounterShift.objects.create(
            counter=self.counter,
            cashier=self.cashier,
            opening_float=Decimal('5000.00'),
            status=ShiftStatus.OPEN
        )
        # 4. Tariffs
        self.tariff_cardio, _ = TariffMaster.objects.get_or_create(
            code='OPD-CONS-CARD',
            defaults={
                'name': 'Cardiology Specialist Consultation',
                'department': 'OPD',
                'base_price': Decimal('800.00'),
                'gst_rate': Decimal('0.00'),
                'is_active': True
            }
        )
        self.tariff_cbc, _ = TariffMaster.objects.get_or_create(
            code='LAB-CBC-01',
            defaults={
                'name': 'Complete Blood Count (CBC)',
                'department': 'LAB',
                'base_price': Decimal('350.00'),
                'gst_rate': Decimal('0.00'),
                'is_active': True
            }
        )
        # 5. Lab test catalog
        self.lab_test = LabTest.objects.create(
            test_code='LAB-CBC-01',
            name='Complete Blood Count (CBC)',
            department='Diagnostic Lab',
            category='Hematology',
            price=Decimal('350.00'),
            is_active=True
        )
        # 6. Gating rule
        self.gating_rule, _ = DepartmentGatingRule.objects.get_or_create(
            gating_action=GatingAction.LAB_SAMPLE_COLLECTION,
            defaults={
                'department': 'LAB',
                'is_hard_gate': True,
                'description': 'Bill Unsettled at Cash Counter. Please pay before sample collection.'
            }
        )


    def test_opd_consultation_charge_emission(self):
        appointment = Appointment.objects.create(
            appointment_number='APT-202610-0901',
            patient=self.patient,
            doctor=self.doctor_profile,
            appointment_date='2026-10-05',
            token_number=1,
            type=AppointmentType.WALK_IN,
            status=AppointmentStatus.WAITING
        )

        res = DepartmentChargeIntegrationService.emit_opd_consultation_charge(appointment)
        self.assertFalse(res['already_existed'])
        charge_item = res['charge_item']
        charge_event = res['charge_event']

        self.assertEqual(charge_item.department, 'OPD')
        self.assertEqual(charge_item.service_code, 'OPD-CONS-CARD')
        self.assertEqual(charge_item.unit_price, Decimal('800.00'))
        self.assertEqual(charge_item.total_amount, Decimal('800.00'))
        self.assertEqual(charge_item.status, ChargeItemStatus.PENDING)
        self.assertEqual(charge_item.priority, 'ROUTINE')

        self.assertEqual(charge_event.status, DepartmentChargeEventStatus.QUEUED)
        self.assertEqual(charge_event.source_department, 'OPD')
        self.assertEqual(charge_event.tariff_code, 'OPD-CONS-CARD')

        # Idempotency check: emitting second time should not duplicate
        res2 = DepartmentChargeIntegrationService.emit_opd_consultation_charge(appointment)
        self.assertTrue(res2['already_existed'])
        self.assertEqual(BillableChargeItem.objects.filter(source_reference_id=str(appointment.id)).count(), 1)

    def test_opd_emergency_consultation_priority_stat(self):
        appointment = Appointment.objects.create(
            appointment_number='APT-202610-0902',
            patient=self.patient,
            doctor=self.doctor_profile,
            appointment_date='2026-10-05',
            token_number=2,
            type=AppointmentType.EMERGENCY,
            status=AppointmentStatus.WAITING
        )

        res = DepartmentChargeIntegrationService.emit_opd_consultation_charge(appointment)
        charge_item = res['charge_item']
        self.assertEqual(charge_item.priority, 'STAT')

    def test_lab_charges_emission_and_tariff_integrity(self):
        order = LabOrder.objects.create(
            order_number='LAB-202610-0901',
            patient=self.patient,
            test=self.lab_test,
            doctor=self.doctor_profile,
            priority=LabOrderPriority.ROUTINE,
            status=LabOrderStatus.ORDERED
        )

        charges = DepartmentChargeIntegrationService.emit_lab_test_charges(order)
        self.assertEqual(len(charges), 1)
        charge_item = charges[0]['charge_item']
        charge_event = charges[0]['charge_event']

        self.assertEqual(charge_item.department, 'LAB')
        self.assertEqual(charge_item.service_code, 'LAB-CBC-01')
        self.assertEqual(charge_item.unit_price, Decimal('350.00'))
        self.assertEqual(charge_item.total_amount, Decimal('350.00'))
        self.assertEqual(charge_item.status, ChargeItemStatus.PENDING)
        self.assertEqual(charge_item.priority, 'ROUTINE')

        self.assertEqual(charge_event.source_department, 'LAB')
        self.assertEqual(charge_event.encounter_type, 'DIAGNOSTICS')

    def test_lab_hard_gate_unpaid_blocks_sample_collection(self):
        order = LabOrder.objects.create(
            order_number='LAB-202610-0902',
            patient=self.patient,
            test=self.lab_test,
            doctor=self.doctor_profile,
            priority=LabOrderPriority.ROUTINE,
            status=LabOrderStatus.ORDERED
        )
        DepartmentChargeIntegrationService.emit_lab_test_charges(order)

        # 1. Direct Service clearance check
        clearance = DepartmentChargeIntegrationService.is_lab_sample_collection_allowed(order.id)
        self.assertFalse(clearance['allowed'])
        self.assertTrue(clearance['is_hard_gate'])
        self.assertEqual(clearance['pending_amount'], 350.0)
        self.assertEqual(clearance['reason'], 'Bill Unsettled at Cash Counter')

        # 2. Phlebotomist API invocation check -> Must fail with HTTP 402 Payment Required
        self.client.force_authenticate(user=self.lab_tech)
        resp = self.client.post(f'/api/v1/lab/orders/{order.id}/collect-sample/', data={})
        self.assertEqual(resp.status_code, 402)
        err_data = resp.json()
        self.assertIn('Sample collection blocked: Bill Unsettled at Cash Counter', err_data['error'])

        # Invariant check: Status must remain ORDERED
        order.refresh_from_db()
        self.assertEqual(order.status, LabOrderStatus.ORDERED)
        self.assertIsNone(order.collected_at)

    def test_lab_hard_gate_unlocks_on_settlement(self):
        order = LabOrder.objects.create(
            order_number='LAB-202610-0903',
            patient=self.patient,
            test=self.lab_test,
            doctor=self.doctor_profile,
            priority=LabOrderPriority.ROUTINE,
            status=LabOrderStatus.ORDERED
        )
        charges = DepartmentChargeIntegrationService.emit_lab_test_charges(order)
        charge_item = charges[0]['charge_item']

        # Cashier consolidates bill and records settlement
        invoice = BillingCoreService.consolidate_charges_to_invoice(
            patient=self.patient,
            charge_ids=[charge_item.id],
            cashier=self.cashier,
            counter=self.counter,
            shift=self.shift
        )
        BillingCoreService.process_multi_tender_payment(
            invoice_id=str(invoice.id),
            cashier=self.cashier,
            counter=self.counter,
            shift=self.shift,
            split_payments=[{'amount': invoice.total, 'tender_mode': 'CASH'}]
        )

        # 1. Clearance check should now pass
        clearance = DepartmentChargeIntegrationService.is_lab_sample_collection_allowed(order.id)
        self.assertTrue(clearance['allowed'])

        # 2. Phlebotomist API invocation now succeeds
        self.client.force_authenticate(user=self.lab_tech)
        resp = self.client.post(f'/api/v1/lab/orders/{order.id}/collect-sample/', data={})
        self.assertEqual(resp.status_code, 200)

        # Invariant check: Status transitioned to SAMPLE_COLLECTED
        order.refresh_from_db()
        self.assertEqual(order.status, LabOrderStatus.SAMPLE_COLLECTED)
        self.assertIsNotNone(order.collected_at)

    def test_lab_hard_gate_ipd_patient_bypasses(self):
        # Create active Inpatient Admission
        admission = InpatientAdmission.objects.create(
            admission_number='ADM-202610-0088',
            patient=self.patient,
            status='ADMITTED',
            ward_name='ICU'
        )

        order = LabOrder.objects.create(
            order_number='LAB-202610-0904',
            patient=self.patient,
            test=self.lab_test,
            priority=LabOrderPriority.STAT,
            status=LabOrderStatus.ORDERED
        )
        DepartmentChargeIntegrationService.emit_lab_test_charges(order)

        # Inpatients accrue charges to IPD ledger, so sample collection is allowed immediately
        clearance = DepartmentChargeIntegrationService.is_lab_sample_collection_allowed(order.id)
        self.assertTrue(clearance['allowed'])
        self.assertTrue(clearance.get('is_ipd', False))
        self.assertEqual(clearance.get('admission_number'), 'ADM-202610-0088')

        # Phlebotomist can collect sample without prior counter payment
        self.client.force_authenticate(user=self.lab_tech)
        resp = self.client.post(f'/api/v1/lab/orders/{order.id}/collect-sample/', data={})
        self.assertEqual(resp.status_code, 200)
        order.refresh_from_db()
        self.assertEqual(order.status, LabOrderStatus.SAMPLE_COLLECTED)

    def test_pharmacy_dispense_charge_delegation(self):
        dispense_order = PharmacyDispenseOrder.objects.create(
            order_number='DISP-202610-0901',
            patient=self.patient,
            total_amount=Decimal('625.50'),
            status=DispenseOrderStatus.PENDING
        )

        res = DepartmentChargeIntegrationService.emit_pharmacy_dispense_charge(
            dispense_order,
            routing='PAY_AT_RECEPTION'
        )
        self.assertFalse(res['already_existed'])
        charge_item = res['charge_item']
        charge_event = res['charge_event']

        self.assertEqual(charge_item.department, 'PHARMACY')
        self.assertEqual(charge_item.service_code, 'PHARM-DISP')
        self.assertEqual(charge_item.total_amount, Decimal('625.50'))
        self.assertEqual(charge_item.status, ChargeItemStatus.PENDING)

        self.assertEqual(charge_event.source_department, 'PHARMACY')
        self.assertEqual(charge_event.status, DepartmentChargeEventStatus.QUEUED)
        self.assertEqual(charge_event.metadata.get('routing'), 'PAY_AT_RECEPTION')

    def test_charge_cancellation(self):
        appointment = Appointment.objects.create(
            appointment_number='APT-202610-0903',
            patient=self.patient,
            doctor=self.doctor_profile,
            appointment_date='2026-10-05',
            status=AppointmentStatus.WAITING
        )
        res = DepartmentChargeIntegrationService.emit_opd_consultation_charge(appointment)
        charge_item = res['charge_item']
        charge_event = res['charge_event']

        cancel_res = DepartmentChargeIntegrationService.cancel_charge_event(
            source_reference_id=str(appointment.id),
            department='OPD',
            reason='Patient cancelled consultation at reception'
        )
        self.assertTrue(cancel_res['success'])

        charge_item.refresh_from_db()
        charge_event.refresh_from_db()
        self.assertEqual(charge_item.status, ChargeItemStatus.CANCELLED)
        self.assertEqual(charge_event.status, DepartmentChargeEventStatus.CANCELLED)

    def test_unbilled_charges_queue_api(self):
        # Stage charges across OPD and LAB
        apt = Appointment.objects.create(
            appointment_number='APT-202610-0904',
            patient=self.patient,
            doctor=self.doctor_profile,
            appointment_date='2026-10-05',
            type=AppointmentType.EMERGENCY
        )
        DepartmentChargeIntegrationService.emit_opd_consultation_charge(apt)

        lab_ord = LabOrder.objects.create(
            order_number='LAB-202610-0905',
            patient=self.patient,
            test=self.lab_test,
            priority=LabOrderPriority.ROUTINE
        )
        DepartmentChargeIntegrationService.emit_lab_test_charges(lab_ord)

        self.client.force_authenticate(user=self.cashier)
        resp = self.client.get('/api/v1/billing/charges/queue/?department=ALL')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertIsInstance(data, list)
        self.assertGreaterEqual(len(data), 2)
        stat_items = [i for i in data if i.get('is_stat')]
        self.assertGreaterEqual(len(stat_items), 1)  # emergency appointment emitted STAT priority

        # Filter by department LAB
        resp_lab = self.client.get('/api/v1/billing/charges/queue/?department=LAB')
        self.assertEqual(resp_lab.status_code, 200)
        lab_data = resp_lab.json()
        self.assertIsInstance(lab_data, list)
        self.assertGreaterEqual(len(lab_data), 1)
        for item in lab_data:
            self.assertEqual(item['department'], 'LAB')


    def test_gating_rule_override_toggle(self):
        # Disable hard gate policy
        self.gating_rule.is_hard_gate = False
        self.gating_rule.save()

        order = LabOrder.objects.create(
            order_number='LAB-202610-0906',
            patient=self.patient,
            test=self.lab_test,
            priority=LabOrderPriority.ROUTINE
        )
        DepartmentChargeIntegrationService.emit_lab_test_charges(order)

        clearance = DepartmentChargeIntegrationService.is_lab_sample_collection_allowed(order.id)
        self.assertTrue(clearance['allowed'])
        self.assertFalse(clearance['is_hard_gate'])


class Phase3CashierWorkspaceTestCase(APITestCase):
    def setUp(self):
        self.cashier = User.objects.create_user(
            username='cashier_ph3', password='Password123!',
            first_name='Ritu', last_name='Verma', role=RoleType.CASHIER
        )
        self.supervisor = User.objects.create_user(
            username='sup_ph3', password='Password123!',
            first_name='Vikramaditya', last_name='Rao', role=RoleType.BILLING_SUPERVISOR
        )
        self.doctor = User.objects.create_user(
            username='dr_ph3', password='Password123!',
            first_name='Meera', last_name='Iyer', role=RoleType.DOCTOR
        )
        self.patient = Patient.objects.create(
            first_name='Sunita', last_name='Rao', gender='FEMALE',
            date_of_birth='1958-03-11', uhid='NH-2026-PH3-01', phone_number='9820011223'
        )
        self.counter = BillingCounter.objects.create(code='CNT-PH3', name='Counter 1', station_location='OPD_LOBBY')
        self.shift = CounterShift.objects.create(
            counter=self.counter, cashier=self.cashier,
            opening_float=Decimal('5000.00'), status=ShiftStatus.OPEN
        )
        self.tariff_cbc = TariffMaster.objects.create(
            code='LAB-CBC-01', name='Complete Blood Count', department='LAB',
            base_price=Decimal('400.00'), gst_rate=Decimal('0.00')
        )
        self.tariff_cert = TariffMaster.objects.create(
            code='GEN-CERT-01', name='Medical Fitness Certificate', department='GENERAL',
            base_price=Decimal('250.00'), gst_rate=Decimal('0.00')
        )
        self.lab_test = LabTest.objects.create(
            test_code='LAB-CBC-01', name='Complete Blood Count', price=Decimal('999.00')
        )
        DepartmentGatingRule.objects.get_or_create(
            gating_action=GatingAction.LAB_SAMPLE_COLLECTION,
            defaults={'department': 'LAB', 'is_hard_gate': True}
        )

    def _stage_charge(self, amount='1000.00', dept='OPD', priority='ROUTINE', code='OPD-CONS'):
        return BillableChargeItem.objects.create(
            patient=self.patient, department=dept, service_code=code,
            service_name=f'{dept} service', unit_price=Decimal(amount), quantity=1,
            total_amount=Decimal(amount), priority=priority, status=ChargeItemStatus.PENDING
        )

    # --- Discount ceiling ---
    def test_cashier_discount_above_ceiling_requires_supervisor(self):
        charge = self._stage_charge('1000.00')
        self.client.force_authenticate(user=self.cashier)
        resp = self.client.post('/api/v1/billing/cashier/bill-and-collect/', data={
            'patient': self.patient.uhid, 'charge_ids': [str(charge.id)], 'discount_percent': 10
        }, format='json')
        self.assertEqual(resp.status_code, 403)
        self.assertEqual(resp.json()['error'], 'Supervisor Approval Required')
        self.assertTrue(resp.json()['requires_approval'])
        # No invoice raised, charge still pending
        charge.refresh_from_db()
        self.assertEqual(charge.status, ChargeItemStatus.PENDING)
        self.assertFalse(Invoice.objects.filter(patient=self.patient).exists())

    def test_legacy_invoice_endpoint_also_enforces_ceiling(self):
        charge = self._stage_charge('1000.00')
        self.client.force_authenticate(user=self.cashier)
        resp = self.client.post('/api/v1/billing/invoices/', data={
            'patientId': str(self.patient.id), 'charge_ids': [str(charge.id)], 'discount': 150
        }, format='json')
        self.assertEqual(resp.status_code, 403)

    def test_cashier_discount_within_ceiling_allowed(self):
        charge = self._stage_charge('1000.00')
        self.client.force_authenticate(user=self.cashier)
        resp = self.client.post('/api/v1/billing/cashier/bill-and-collect/', data={
            'patient': self.patient.uhid, 'charge_ids': [str(charge.id)],
            'discount_percent': 5, 'discount_reason': 'Senior Citizen scheme'
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        inv = Invoice.objects.get(patient=self.patient)
        self.assertEqual(inv.discount, Decimal('50.00'))
        self.assertEqual(inv.total, Decimal('950.00'))
        self.assertIsNone(inv.discount_approved_by)

    def test_supervisor_can_apply_higher_discount_directly(self):
        charge = self._stage_charge('1000.00')
        CounterShiftControlService.open_shift(self.supervisor, 'CNT-SUP', Decimal('5000.00'))
        self.client.force_authenticate(user=self.supervisor)
        resp = self.client.post('/api/v1/billing/cashier/bill-and-collect/', data={
            'patient': self.patient.uhid, 'charge_ids': [str(charge.id)], 'discount_percent': 20
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        inv = Invoice.objects.get(patient=self.patient)
        self.assertEqual(inv.discount, Decimal('200.00'))
        self.assertEqual(inv.discount_approved_by, self.supervisor)

    # --- Approval workflow ---
    def test_discount_approval_four_eyes_and_single_use(self):
        charge = self._stage_charge('1000.00')
        self.client.force_authenticate(user=self.cashier)
        req = self.client.post('/api/v1/billing/approvals/', data={
            'patient': self.patient.uhid, 'bill_gross': 1000, 'discount_percent': 15,
            'reason': 'Financial hardship', 'notes': 'Daily wage worker'
        }, format='json')
        self.assertEqual(req.status_code, 201)
        req_id = req.json()['id']
        self.assertEqual(req.json()['status'], 'PENDING')
        self.assertEqual(float(req.json()['discount_amount']), 150.0)

        # Cashier cannot decide
        self.assertEqual(self.client.post(f'/api/v1/billing/approvals/{req_id}/decide/', data={'decision': 'APPROVE'}, format='json').status_code, 403)

        # Pending approval cannot be used
        blocked = self.client.post('/api/v1/billing/cashier/bill-and-collect/', data={
            'patient': self.patient.uhid, 'charge_ids': [str(charge.id)],
            'discount_percent': 15, 'approval_request_id': req_id
        }, format='json')
        self.assertEqual(blocked.status_code, 403)

        self.client.force_authenticate(user=self.supervisor)
        dec = self.client.post(f'/api/v1/billing/approvals/{req_id}/decide/', data={'decision': 'APPROVE'}, format='json')
        self.assertEqual(dec.status_code, 200)
        self.assertEqual(dec.json()['status'], 'APPROVED')

        self.client.force_authenticate(user=self.cashier)
        ok = self.client.post('/api/v1/billing/cashier/bill-and-collect/', data={
            'patient': self.patient.uhid, 'charge_ids': [str(charge.id)],
            'discount_percent': 15, 'approval_request_id': req_id
        }, format='json')
        self.assertEqual(ok.status_code, 201)
        inv = Invoice.objects.get(patient=self.patient)
        self.assertEqual(inv.discount, Decimal('150.00'))
        self.assertEqual(inv.discount_approved_by, self.supervisor)
        self.assertEqual(str(SupervisorApprovalRequest.objects.get(id=req_id).invoice_id), str(inv.id))

        # Reusing a consumed approval on a new bill is rejected
        charge2 = self._stage_charge('1000.00')
        reuse = self.client.post('/api/v1/billing/cashier/bill-and-collect/', data={
            'patient': self.patient.uhid, 'charge_ids': [str(charge2.id)],
            'discount_percent': 15, 'approval_request_id': req_id
        }, format='json')
        self.assertEqual(reuse.status_code, 403)

    def test_supervisor_cannot_approve_own_request(self):
        req = CashierWorkspaceService.request_discount_approval(
            requested_by=self.supervisor, patient=self.patient, bill_gross=1000,
            discount_percent=12, reason='Staff referral'
        )
        self.client.force_authenticate(user=self.supervisor)
        resp = self.client.post(f'/api/v1/billing/approvals/{req.id}/decide/', data={'decision': 'APPROVE'}, format='json')
        self.assertEqual(resp.status_code, 403)
        self.assertIn('Four-eyes', resp.json()['error'])

    def test_rejection_requires_reason(self):
        req = CashierWorkspaceService.request_discount_approval(
            requested_by=self.cashier, patient=self.patient, bill_gross=1000,
            discount_percent=12, reason='Staff referral'
        )
        self.client.force_authenticate(user=self.supervisor)
        self.assertEqual(self.client.post(f'/api/v1/billing/approvals/{req.id}/decide/', data={'decision': 'REJECT'}, format='json').status_code, 400)
        ok = self.client.post(f'/api/v1/billing/approvals/{req.id}/decide/', data={
            'decision': 'REJECT', 'rejection_reason': 'Not eligible under policy'
        }, format='json')
        self.assertEqual(ok.status_code, 200)
        self.assertEqual(ok.json()['status'], 'REJECTED')

    # --- Tender maths ---
    def test_tender_split_and_change_assistant(self):
        split = CashierWorkspaceService.validate_tender_split(1850, [
            {'tender_mode': 'CASH', 'amount': 500},
            {'tender_mode': 'CARD', 'amount': 1000},
            {'tender_mode': 'UPI', 'amount': 350},
        ])
        self.assertTrue(split['is_balanced'])
        self.assertEqual(split['difference'], 0.0)

        short = CashierWorkspaceService.validate_tender_split(1850, [{'tender_mode': 'CASH', 'amount': 1000}])
        self.assertFalse(short['is_balanced'])
        self.assertEqual(short['difference'], 850.0)

        over = CashierWorkspaceService.validate_tender_split(100, [{'tender_mode': 'BITCOIN', 'amount': 200}])
        self.assertTrue(over['is_over_allocated'])
        self.assertTrue(over['errors'])

        change = CashierWorkspaceService.calculate_cash_change(1270, 2000)
        self.assertEqual(change['change_due'], 730.0)
        self.assertEqual(
            [(d['denomination'], d['count']) for d in change['denominations']],
            [(500, 1), (200, 1), (20, 1), (10, 1)]
        )
        insufficient = CashierWorkspaceService.calculate_cash_change(500, 200)
        self.assertFalse(insufficient['sufficient'])
        self.assertEqual(insufficient['shortfall'], 300.0)

        self.client.force_authenticate(user=self.cashier)
        resp = self.client.post('/api/v1/billing/cashier/tender-calculator/', data={
            'total': 1270, 'split_payments': [{'tender_mode': 'CASH', 'amount': 1270}], 'cash_received': 2000
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.json()['split']['is_balanced'])
        self.assertEqual(resp.json()['change']['change_due'], 730.0)

    # --- Bill & collect -> clinical unlock ---
    def test_bill_and_collect_settles_and_unlocks_lab_gate(self):
        order = LabOrder.objects.create(
            order_number='LAB-PH3-0001', patient=self.patient, test=self.lab_test, priority=LabOrderPriority.ROUTINE
        )
        emitted = DepartmentChargeIntegrationService.emit_lab_test_charges(order)
        charge = emitted[0]['charge_item']
        # Tariff integrity: TariffMaster (400) wins over the lab catalogue price (999)
        self.assertEqual(charge.total_amount, Decimal('400.00'))
        self.assertFalse(DepartmentChargeIntegrationService.is_lab_sample_collection_allowed(order.id)['allowed'])

        self.client.force_authenticate(user=self.cashier)
        resp = self.client.post('/api/v1/billing/cashier/bill-and-collect/', data={
            'patient': self.patient.uhid, 'charge_ids': [str(charge.id)], 'counter_code': 'CNT-PH3',
            'split_payments': [{'tender_mode': 'CASH', 'amount': 200}, {'tender_mode': 'UPI', 'amount': 200, 'transaction_reference': '123456789012'}]
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        body = resp.json()
        self.assertEqual(body['payment']['status'], 'PAID')
        self.assertEqual(body['payment']['remaining_balance'], 0.0)
        self.assertEqual(len(body['clinical_unlocks']), 1)
        self.assertEqual(body['clinical_unlocks'][0]['gating_action'], 'LAB_SAMPLE_COLLECTION')

        ev = DepartmentChargeEvent.objects.get(charge_item=charge)
        self.assertEqual(ev.status, DepartmentChargeEventStatus.INVOICED)
        self.assertTrue(ev.metadata.get('clinical_unlocked'))
        self.assertTrue(DepartmentChargeIntegrationService.is_lab_sample_collection_allowed(order.id)['allowed'])

        # Payments are attributed to the open shift
        self.assertEqual(Payment.objects.filter(shift=self.shift).count(), 2)

    def test_bill_and_collect_matches_frontend_preview_with_four_tenders(self):
        """The cashier UI previews net = gross - max(discount, line discounts) + tax and allocates tenders to it
        exactly; the server must arrive at the same balance so the split is accepted and settles to zero."""
        consult = self._stage_charge('500.00')
        lab = BillableChargeItem.objects.create(
            patient=self.patient, department='LAB', service_code='LAB-LIPID', service_name='Lipid Profile',
            unit_price=Decimal('350.00'), quantity=2, tax_rate=Decimal('9.00'), tax_amount=Decimal('63.00'),
            total_amount=Decimal('763.00'), status=ChargeItemStatus.PENDING
        )
        BillingCoreService.create_patient_deposit(patient=self.patient, amount=Decimal('100.00'), cashier=self.cashier)

        self.client.force_authenticate(user=self.cashier)
        # gross 1200, 5% scheme -> 60, GST 63 -> net 1203 (as computed by cashierMath.computeBillPreview)
        resp = self.client.post('/api/v1/billing/cashier/bill-and-collect/', data={
            'patient': str(self.patient.id), 'charge_ids': [str(consult.id), str(lab.id)],
            'discount_percent': 5, 'discount_reason': 'Senior Citizen scheme', 'counter_code': 'CNT-PH3',
            'split_payments': [
                {'tender_mode': 'CASH', 'amount': 500},
                {'tender_mode': 'CARD', 'amount': 400.5, 'transaction_reference': 'EDC-01', 'auth_code': '123456'},
                {'tender_mode': 'UPI', 'amount': 202.5, 'transaction_reference': '123456789012'},
                {'tender_mode': 'DEPOSIT_DEDUCTION', 'amount': 100}
            ]
        }, format='json')
        self.assertEqual(resp.status_code, 201, resp.content)
        body = resp.json()
        self.assertEqual(Decimal(str(body['invoice']['total'])), Decimal('1203.00'))
        self.assertEqual(body['payment']['status'], 'PAID')
        self.assertEqual(body['payment']['remaining_balance'], 0.0)
        self.assertEqual(Payment.objects.filter(invoice_id=body['invoice']['id']).count(), 4)
        card = Payment.objects.get(invoice_id=body['invoice']['id'], tender_mode='CARD')
        self.assertEqual(card.auth_code, '123456')
        self.assertEqual(PatientDeposit.objects.get(patient=self.patient).available_balance, Decimal('0.00'))

    def test_bill_and_collect_rejects_over_allocated_tender(self):
        charge = self._stage_charge('500.00')
        self.client.force_authenticate(user=self.cashier)
        resp = self.client.post('/api/v1/billing/cashier/bill-and-collect/', data={
            'patient': self.patient.uhid, 'charge_ids': [str(charge.id)],
            'split_payments': [{'tender_mode': 'CASH', 'amount': 900}]
        }, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertTrue(resp.json()['tender_check']['is_over_allocated'])
        self.assertFalse(Payment.objects.filter(patient=self.patient).exists())

    # --- Dashboard / queue / workspace ---
    def test_dashboard_kpis(self):
        self._stage_charge('300.00', priority='STAT')
        self.client.force_authenticate(user=self.cashier)
        resp = self.client.get('/api/v1/billing/cashier/dashboard/')
        self.assertEqual(resp.status_code, 200)
        kpis = resp.json()['kpis']
        self.assertEqual(kpis['pending_queue_patients'], 1)
        self.assertEqual(kpis['pending_queue_stat'], 1)
        self.assertEqual(kpis['pending_queue_amount'], 300.0)
        self.assertTrue(resp.json()['shift']['has_active_shift'])

    def test_live_queue_groups_by_patient_stat_first(self):
        other = Patient.objects.create(
            first_name='Arjun', last_name='Mehta', gender='MALE',
            date_of_birth='1990-01-01', uhid='NH-2026-PH3-02', phone_number='9000000002'
        )
        self._stage_charge('500.00', dept='OPD')
        self._stage_charge('400.00', dept='LAB', code='LAB-CBC-01')
        BillableChargeItem.objects.create(
            patient=other, department='LAB', service_code='LAB-X', service_name='Troponin',
            unit_price=Decimal('900.00'), total_amount=Decimal('900.00'), priority='STAT'
        )
        self.client.force_authenticate(user=self.cashier)
        data = self.client.get('/api/v1/billing/cashier/live-queue/').json()
        self.assertEqual(data['total_patients'], 2)
        self.assertEqual(data['rows'][0]['uhid'], 'NH-2026-PH3-02')  # STAT first
        sunita = next(r for r in data['rows'] if r['uhid'] == self.patient.uhid)
        self.assertEqual(sunita['items_count'], 2)
        self.assertEqual(sunita['amount'], 900.0)
        self.assertCountEqual(sunita['sources'], ['OPD', 'LAB'])
        self.assertEqual(data['department_counts']['LAB'], 2)

        lab_only = self.client.get('/api/v1/billing/cashier/live-queue/?department=LAB').json()
        self.assertTrue(all(r['sources'] == ['LAB'] for r in lab_only['rows']))

    def test_patient_workspace_360(self):
        self._stage_charge('700.00')
        PatientDeposit.objects.create(
            deposit_number='DEP-PH3-1', patient=self.patient, deposit_amount=Decimal('2000.00'),
            available_balance=Decimal('2000.00'), status=DepositStatus.ACTIVE
        )
        self.client.force_authenticate(user=self.cashier)
        resp = self.client.get(f'/api/v1/billing/cashier/patient-workspace/{self.patient.uhid}/')
        self.assertEqual(resp.status_code, 200)
        ws = resp.json()
        self.assertEqual(ws['patient']['name'], 'Sunita Rao')
        self.assertTrue(ws['patient']['age_sex'].endswith('F'))
        self.assertEqual(len(ws['unbilled_charges']), 1)
        self.assertEqual(ws['unbilled_total'], 700.0)
        self.assertEqual(ws['deposit_balance'], 2000.0)
        self.assertEqual(ws['coverage']['cashier_discount_ceiling_percent'], 5.0)
        self.assertEqual(self.client.get('/api/v1/billing/cashier/patient-workspace/NOPE-123/').status_code, 404)

    # --- Quick walk-in ---
    def test_quick_walkin_uses_tariff_prices(self):
        self.client.force_authenticate(user=self.cashier)
        resp = self.client.post('/api/v1/billing/cashier/quick-walkin/', data={
            'patient_name': 'Rahul Nair', 'phone': '9876500000', 'counter_code': 'CNT-PH3',
            # client-sent unit_price must be ignored
            'items': [{'service_code': 'GEN-CERT-01', 'qty': 2, 'unit_price': 1}],
            'split_payments': [{'tender_mode': 'CASH', 'amount': 500}]
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        body = resp.json()
        self.assertEqual(body['status'], 'PAID')
        inv = Invoice.objects.get(invoice_number=body['invoice']['invNo'] if 'invNo' in body['invoice'] else body['invoice']['invoice_number'])
        self.assertEqual(inv.total, Decimal('500.00'))
        self.assertTrue(Patient.objects.filter(first_name='Rahul', last_name='Nair').exists())

    def test_quick_walkin_unknown_tariff(self):
        self.client.force_authenticate(user=self.cashier)
        resp = self.client.post('/api/v1/billing/cashier/quick-walkin/', data={
            'patient_name': 'X Y', 'items': [{'service_code': 'NOPE'}]
        }, format='json')
        self.assertEqual(resp.status_code, 400)

    # --- RBAC ---
    def test_clinical_roles_cannot_use_cashier_workspace(self):
        charge = self._stage_charge('100.00')
        self.client.force_authenticate(user=self.doctor)
        self.assertEqual(self.client.get('/api/v1/billing/cashier/dashboard/').status_code, 403)
        self.assertEqual(self.client.post('/api/v1/billing/cashier/bill-and-collect/', data={
            'patient': self.patient.uhid, 'charge_ids': [str(charge.id)]
        }, format='json').status_code, 403)
        self.assertEqual(self.client.post('/api/v1/billing/cashier/add-service/', data={
            'patient': self.patient.uhid, 'service_code': 'GEN-CERT-01'
        }, format='json').status_code, 403)
        self.assertEqual(self.client.post('/api/v1/billing/cashier/drafts/', data={
            'patient': self.patient.uhid, 'charge_ids': [str(charge.id)]
        }, format='json').status_code, 403)


class Phase3CashierGapClosureTestCase(APITestCase):
    """Add service from Tariff Master, quick walk-in billing and draft invoices."""
    # Reuse the Phase 3 fixtures without re-running the Phase 3 tests themselves
    setUp = Phase3CashierWorkspaceTestCase.setUp
    _stage_charge = Phase3CashierWorkspaceTestCase._stage_charge

    # --- Add service from Tariff Master ---
    def test_add_service_prices_from_tariff_master(self):
        TariffMaster.objects.create(code='RAD-XR-01', name='X-Ray Chest PA', department='RADIOLOGY',
                                    base_price=Decimal('600.00'), gst_rate=Decimal('5.00'))
        self.client.force_authenticate(user=self.cashier)
        resp = self.client.post('/api/v1/billing/cashier/add-service/', data={
            'patient': self.patient.uhid, 'service_code': 'RAD-XR-01', 'qty': 2, 'unit_price': 1, 'total_amount': 1
        }, format='json')
        self.assertEqual(resp.status_code, 201, resp.content)
        charge = BillableChargeItem.objects.get(id=resp.json()['id'])
        self.assertEqual(charge.unit_price, Decimal('600.00'))
        self.assertEqual(charge.tax_amount, Decimal('60.00'))
        self.assertEqual(charge.total_amount, Decimal('1260.00'))
        self.assertEqual(charge.department, 'RADIOLOGY')
        self.assertTrue(charge.source_reference_id.startswith('COUNTER-'))
        ws = self.client.get(f'/api/v1/billing/cashier/patient-workspace/{self.patient.uhid}/').json()
        self.assertIn(str(charge.id), [c['id'] for c in ws['unbilled_charges']])

    def test_add_service_rejects_unknown_inactive_and_bad_qty(self):
        TariffMaster.objects.create(code='OLD-01', name='Retired', base_price=Decimal('10.00'), is_active=False)
        self.client.force_authenticate(user=self.cashier)
        for payload in ({'service_code': 'NOPE'}, {'service_code': 'OLD-01'}, {'service_code': 'GEN-CERT-01', 'qty': 0}):
            resp = self.client.post('/api/v1/billing/cashier/add-service/', data={'patient': self.patient.uhid, **payload}, format='json')
            self.assertEqual(resp.status_code, 400, payload)
        self.assertFalse(BillableChargeItem.objects.filter(patient=self.patient).exists())

    def test_remove_only_counter_added_pending_lines(self):
        self.client.force_authenticate(user=self.cashier)
        added = self.client.post('/api/v1/billing/cashier/add-service/', data={
            'patient': self.patient.uhid, 'service_code': 'GEN-CERT-01'}, format='json').json()
        resp = self.client.post(f"/api/v1/billing/cashier/add-service/{added['id']}/remove/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(BillableChargeItem.objects.get(id=added['id']).status, ChargeItemStatus.CANCELLED)

        clinical = self._stage_charge('300.00', dept='LAB', code='LAB-CBC-01')
        clinical.source_reference_id = 'LAB-ORD-1'
        clinical.save()
        self.assertEqual(self.client.post(f'/api/v1/billing/cashier/add-service/{clinical.id}/remove/').status_code, 403)
        self.assertEqual(BillableChargeItem.objects.get(id=clinical.id).status, ChargeItemStatus.PENDING)

    # --- Draft invoices ---
    def _save_draft(self, charge_ids, **extra):
        return self.client.post('/api/v1/billing/cashier/drafts/', data={
            'patient': self.patient.uhid, 'charge_ids': [str(c) for c in charge_ids], 'counter_code': 'CNT-PH3', **extra
        }, format='json')

    def test_save_draft_is_non_fiscal_and_visible(self):
        charge = self._stage_charge('1000.00')
        self.client.force_authenticate(user=self.cashier)
        resp = self._save_draft([charge.id], discount_percent=5, discount_reason='Senior Citizen scheme')
        self.assertEqual(resp.status_code, 201, resp.content)
        draft = Invoice.objects.get(id=resp.json()['id'])
        self.assertEqual(draft.status, InvoiceStatus.DRAFT)
        self.assertTrue(draft.invoice_number.startswith('DRF-'))
        self.assertEqual(draft.total, Decimal('950.00'))
        self.assertEqual(BillableChargeItem.objects.get(id=charge.id).status, ChargeItemStatus.INVOICED)

        ws = self.client.get(f'/api/v1/billing/cashier/patient-workspace/{self.patient.uhid}/').json()
        self.assertEqual([d['id'] for d in ws['draft_invoices']], [str(draft.id)])
        self.assertEqual(ws['open_invoices'], [])
        queue = self.client.get('/api/v1/billing/cashier/live-queue/').json()
        self.assertEqual(queue['draft_count'], 1)
        self.assertEqual(queue['rows'][0]['status'], 'DRAFT')
        self.assertEqual(self.client.get('/api/v1/billing/cashier/dashboard/').json()['kpis']['invoices_today'], 0)
        # The generic payment endpoint must not settle a draft directly
        pay = self.client.post('/api/v1/billing/payments/multi-tender/', data={
            'invoice_id': str(draft.id), 'split_payments': [{'tender_mode': 'CASH', 'amount': 950}]}, format='json')
        self.assertEqual(pay.status_code, 400)
        self.assertFalse(Payment.objects.filter(invoice=draft).exists())

    def test_draft_respects_discount_ceiling_and_rolls_back(self):
        charge = self._stage_charge('1000.00')
        self.client.force_authenticate(user=self.cashier)
        resp = self._save_draft([charge.id], discount_percent=10)
        self.assertEqual(resp.status_code, 403)
        self.assertTrue(resp.json()['requires_approval'])
        self.assertEqual(BillableChargeItem.objects.get(id=charge.id).status, ChargeItemStatus.PENDING)
        self.assertFalse(Invoice.objects.filter(patient=self.patient).exists())

    def test_collect_draft_finalises_and_unlocks_lab(self):
        order = LabOrder.objects.create(order_number='LAB-PH3-DRF', patient=self.patient, test=self.lab_test, priority=LabOrderPriority.ROUTINE)
        charge = DepartmentChargeIntegrationService.emit_lab_test_charges(order)[0]['charge_item']
        self.client.force_authenticate(user=self.cashier)
        draft_id = self._save_draft([charge.id]).json()['id']
        self.assertFalse(DepartmentChargeIntegrationService.is_lab_sample_collection_allowed(order.id)['allowed'])

        over = self.client.post(f'/api/v1/billing/cashier/drafts/{draft_id}/collect/', data={
            'split_payments': [{'tender_mode': 'CASH', 'amount': 900}]}, format='json')
        self.assertEqual(over.status_code, 400)
        self.assertEqual(Invoice.objects.get(id=draft_id).status, InvoiceStatus.DRAFT)

        resp = self.client.post(f'/api/v1/billing/cashier/drafts/{draft_id}/collect/', data={
            'counter_code': 'CNT-PH3',
            'split_payments': [{'tender_mode': 'UPI', 'amount': 400, 'transaction_reference': '123456789012'}]}, format='json')
        self.assertEqual(resp.status_code, 200, resp.content)
        body = resp.json()
        self.assertTrue(body['invoice']['invoice_number'].startswith('INV-'))
        self.assertEqual(body['payment']['status'], 'PAID')
        self.assertEqual(body['clinical_unlocks'][0]['gating_action'], 'LAB_SAMPLE_COLLECTION')
        self.assertTrue(DepartmentChargeIntegrationService.is_lab_sample_collection_allowed(order.id)['allowed'])
        self.assertEqual(self.client.post(f'/api/v1/billing/cashier/drafts/{draft_id}/discard/').status_code, 400)

    def test_discard_draft_releases_charges_and_keeps_approval(self):
        charge = self._stage_charge('1000.00')
        req = SupervisorApprovalRequest.objects.create(
            request_number='APR-T-1', patient=self.patient, discount_percent=Decimal('10.00'),
            discount_amount=Decimal('100.00'), bill_gross=Decimal('1000.00'), reason='Financial hardship',
            requested_by=self.cashier, approved_by=self.supervisor, status=ApprovalStatus.APPROVED
        )
        self.client.force_authenticate(user=self.cashier)
        draft_id = self._save_draft([charge.id], discount_percent=10, approval_request_id=str(req.id)).json()['id']
        req.refresh_from_db()
        self.assertEqual(str(req.invoice_id), draft_id)

        resp = self.client.post(f'/api/v1/billing/cashier/drafts/{draft_id}/discard/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()['released_charges'], 1)
        self.assertFalse(Invoice.objects.filter(id=draft_id).exists())
        self.assertEqual(BillableChargeItem.objects.get(id=charge.id).status, ChargeItemStatus.PENDING)
        req.refresh_from_db()
        self.assertIsNone(req.invoice_id)  # not cascade-deleted, reusable on the real bill
        again = self._save_draft([charge.id], discount_percent=10, approval_request_id=str(req.id))
        self.assertEqual(again.status_code, 201)

    def test_invoice_numbers_never_collide_after_discarded_drafts(self):
        self.client.force_authenticate(user=self.cashier)
        first = self.client.post('/api/v1/billing/cashier/bill-and-collect/', data={
            'patient': self.patient.uhid, 'charge_ids': [str(self._stage_charge('100.00').id)]}, format='json').json()['invoice']
        draft_id = self._save_draft([self._stage_charge('200.00').id]).json()['id']
        self.client.post(f'/api/v1/billing/cashier/drafts/{draft_id}/discard/')
        second = self.client.post('/api/v1/billing/cashier/bill-and-collect/', data={
            'patient': self.patient.uhid, 'charge_ids': [str(self._stage_charge('300.00').id)]}, format='json')
        self.assertEqual(second.status_code, 201, second.content)
        n1 = int(first['invoice_number'].rsplit('-', 1)[-1])
        n2 = int(second.json()['invoice']['invoice_number'].rsplit('-', 1)[-1])
        self.assertEqual(n2, n1 + 1)  # gap-free: the discarded draft never consumed an INV number

    # --- Quick walk-in ---
    def test_quick_walkin_existing_patient_with_scheme_and_split(self):
        self.client.force_authenticate(user=self.cashier)
        resp = self.client.post('/api/v1/billing/cashier/quick-walkin/', data={
            'patient': self.patient.uhid, 'counter_code': 'CNT-PH3', 'discount_percent': 5,
            'discount_reason': 'Senior Citizen scheme',
            'items': [{'service_code': 'GEN-CERT-01', 'qty': 1}, {'service_code': 'LAB-CBC-01', 'qty': 1}],
            'split_payments': [{'tender_mode': 'CASH', 'amount': 300},
                               {'tender_mode': 'CARD', 'amount': 317.5, 'transaction_reference': 'EDC-01', 'auth_code': '654321'}]
        }, format='json')
        self.assertEqual(resp.status_code, 201, resp.content)
        body = resp.json()
        self.assertEqual(body['patient_uhid'], self.patient.uhid)
        self.assertEqual(body['status'], 'PAID')
        self.assertEqual(Decimal(str(body['invoice']['total'])), Decimal('617.50'))  # (250 + 400) - 5%

    def test_quick_walkin_over_ceiling_is_atomic(self):
        self.client.force_authenticate(user=self.cashier)
        before = Patient.objects.count()
        resp = self.client.post('/api/v1/billing/cashier/quick-walkin/', data={
            'patient_name': 'Ghost Walkin', 'discount_percent': 20,
            'items': [{'service_code': 'GEN-CERT-01'}], 'split_payments': [{'tender_mode': 'CASH', 'amount': 200}]
        }, format='json')
        self.assertEqual(resp.status_code, 403)
        self.assertEqual(Patient.objects.count(), before)
        self.assertFalse(BillableChargeItem.objects.filter(service_code='GEN-CERT-01').exists())







class BillingAccessControlTestCase(APITestCase):
    """Billing data requires login; Finance Manager is read-only; masters are admin-write; clinicians may emit."""
    setUp = Phase3CashierWorkspaceTestCase.setUp
    _stage_charge = Phase3CashierWorkspaceTestCase._stage_charge

    def test_anonymous_requests_are_refused_everywhere(self):
        charge = self._stage_charge('100.00')
        reads = ['/api/v1/billing/cashier/dashboard/', '/api/v1/billing/cashier/live-queue/',
                 f'/api/v1/billing/cashier/patient-workspace/{self.patient.uhid}/', '/api/v1/billing/invoices/',
                 f'/api/v1/billing/patients/{self.patient.uhid}/ledger/', '/api/v1/billing/receipts/',
                 '/api/v1/billing/tariffs/', '/api/v1/billing/shifts/current/', '/api/v1/billing/gates/rules/',
                 '/api/v1/billing/gates/check-clearance/?action=LAB_SAMPLE_COLLECTION&order_id=x']
        for url in reads:
            self.assertEqual(self.client.get(url).status_code, 401, url)
        writes = [('/api/v1/billing/payments/multi-tender/', {'invoice_id': 'x', 'split_payments': []}),
                  ('/api/v1/billing/shifts/open/', {'opening_float': 1}),
                  ('/api/v1/billing/tariffs/', {'code': 'Z', 'name': 'Z', 'base_price': '1'}),
                  ('/api/v1/billing/charges/emit/', {'department': 'LAB'}),
                  ('/api/v1/billing/cashier/bill-and-collect/', {'patient': self.patient.uhid, 'charge_ids': [str(charge.id)]})]
        for url, body in writes:
            self.assertEqual(self.client.post(url, data=body, format='json').status_code, 401, url)

    def test_finance_manager_is_read_only(self):
        fm = User.objects.create_user(username='fin_mgr', password='Password123!', role=RoleType.FINANCE_MANAGER)
        charge = self._stage_charge('100.00')
        self.client.force_authenticate(user=fm)
        for url in ('/api/v1/billing/cashier/dashboard/', '/api/v1/billing/cashier/live-queue/',
                    f'/api/v1/billing/cashier/patient-workspace/{self.patient.uhid}/', '/api/v1/billing/invoices/',
                    '/api/v1/billing/tariffs/'):
            self.assertEqual(self.client.get(url).status_code, 200, url)
        self.assertEqual(self.client.post('/api/v1/billing/cashier/bill-and-collect/', data={
            'patient': self.patient.uhid, 'charge_ids': [str(charge.id)]}, format='json').status_code, 403)
        self.assertEqual(self.client.post('/api/v1/billing/tariffs/', data={
            'code': 'FM-1', 'name': 'x', 'base_price': '1'}, format='json').status_code, 403)
        self.assertEqual(BillableChargeItem.objects.get(id=charge.id).status, ChargeItemStatus.PENDING)

    def test_tariff_masters_are_admin_write(self):
        admin = User.objects.create_user(username='bill_admin', password='Password123!', role=RoleType.BILLING_ADMIN)
        for user, expected in ((self.cashier, 403), (self.supervisor, 403), (admin, 201)):
            self.client.force_authenticate(user=user)
            resp = self.client.post('/api/v1/billing/tariffs/', data={
                'code': f'ADM-{user.username}', 'name': 'Admin tariff', 'department': 'GENERAL', 'base_price': '10.00',
                'justification': 'New counter service'
            }, format='json')
            self.assertEqual(resp.status_code, expected, user.username)

    def test_clinical_staff_reach_gates_but_not_cashier_data(self):
        lab = User.objects.create_user(username='lab_tech_acl', password='Password123!', role=RoleType.LAB_TECH)
        pt_user = User.objects.create_user(username='patient_acl', password='Password123!', role=RoleType.PATIENT)
        self.client.force_authenticate(user=lab)
        self.assertEqual(self.client.get('/api/v1/billing/gates/check-clearance/?action=LAB_SAMPLE_COLLECTION&order_id=x').status_code, 200)
        self.assertEqual(self.client.get('/api/v1/billing/cashier/dashboard/').status_code, 403)
        self.client.force_authenticate(user=pt_user)
        self.assertEqual(self.client.get('/api/v1/billing/gates/check-clearance/?action=LAB_SAMPLE_COLLECTION&order_id=x').status_code, 403)
        self.assertEqual(self.client.post('/api/v1/billing/charges/emit/', data={'department': 'LAB'}, format='json').status_code, 403)


class Phase4CounterShiftCashControlTestCase(APITestCase):
    """Phase 4: shift guard, denomination tallies, drawer variance, pickups, supervisor sign-off, vault custody."""

    def setUp(self):
        self.cashier = User.objects.create_user(username='ph4_cashier', password='Password123!', role=RoleType.CASHIER,
                                                first_name='Ritu', last_name='Verma')
        self.cashier2 = User.objects.create_user(username='ph4_cashier2', password='Password123!', role=RoleType.CASHIER)
        self.supervisor = User.objects.create_user(username='ph4_sup', password='Password123!', role=RoleType.BILLING_SUPERVISOR,
                                                   first_name='Vikram', last_name='Rao')
        self.patient = Patient.objects.create(first_name='Asha', last_name='Iyer', gender='FEMALE', date_of_birth='1980-01-01',
                                              uhid='NH-PH4-01', phone_number='9000000401')
        BillingCounter.objects.create(code='C1', name='Counter 1', station_location='OPD_LOBBY')
        BillingCounter.objects.create(code='C2', name='Counter 2', station_location='DIAGNOSTICS')

    def _charge(self, amount='1000.00'):
        return BillableChargeItem.objects.create(
            patient=self.patient, department='OPD', service_code='OPD-CONS', service_name='Consultation',
            unit_price=Decimal(amount), quantity=1, total_amount=Decimal(amount), status=ChargeItemStatus.PENDING)

    def _collect(self, user, amount='1000.00', tenders=None):
        charge = self._charge(amount)
        self.client.force_authenticate(user=user)
        return self.client.post('/api/v1/billing/cashier/bill-and-collect/', data={
            'patient': self.patient.uhid, 'charge_ids': [str(charge.id)],
            'split_payments': tenders or [{'tender_mode': 'CASH', 'amount': float(amount)}]}, format='json')

    def _open(self, user=None, counter='C1', denominations=None, opening_float=None):
        self.client.force_authenticate(user=user or self.cashier)
        body = {'counter_code': counter}
        if denominations is not None:
            body['denominations'] = denominations
        if opening_float is not None:
            body['opening_float'] = opening_float
        return self.client.post('/api/v1/billing/shifts/open/', data=body, format='json')

    def _submitted(self, cash_count=None, note=''):
        CounterShiftControlService.open_shift(self.cashier, 'C1', Decimal('5000.00'))
        return CounterShiftControlService.submit_closing(
            self.cashier, denominations=cash_count if cash_count is not None else {'500': 10}, note=note)

    # --- Shift Transaction Guard (plan test) ---
    def test_no_active_shift_blocks_every_money_movement(self):
        self.client.force_authenticate(user=self.cashier)
        inv = BillingCoreService.consolidate_charges_to_invoice(self.patient, [self._charge().id])
        attempts = [
            ('/api/v1/billing/cashier/bill-and-collect/', {'patient': self.patient.uhid, 'charge_ids': [str(self._charge().id)]}),
            ('/api/v1/billing/payments/multi-tender/', {'invoice_id': str(inv.id), 'split_payments': [{'tender_mode': 'CASH', 'amount': 1000}]}),
            ('/api/v1/billing/payments/', {'invoice': str(inv.id), 'amount': 1000}),
            ('/api/v1/billing/deposits/', {'patient': str(self.patient.id), 'amount': 500}),
            ('/api/v1/billing/cashier/quick-walkin/', {'patient_name': 'X Y', 'items': [{'service_code': 'NONE'}]}),
            ('/api/v1/billing/invoices/', {'patient': str(self.patient.id), 'charge_ids': [str(self._charge().id)]}),
        ]
        for url, body in attempts:
            resp = self.client.post(url, data=body, format='json')
            self.assertEqual(resp.status_code, 400, url)
            self.assertEqual(resp.json()['error'], 'No Active Shift', url)
        self.assertFalse(Payment.objects.exists())
        self.assertFalse(PatientDeposit.objects.exists())

    def test_payments_post_to_own_shift_not_another_cashiers(self):
        self._open(self.cashier2, 'C2')
        self.assertEqual(self._collect(self.cashier).status_code, 400)  # C2 being open does not let cashier 1 collect
        self._open(self.cashier, 'C1')
        self.assertEqual(self._collect(self.cashier).status_code, 201)
        self.assertEqual(Payment.objects.get().shift.cashier, self.cashier)
        self.client.force_authenticate(user=self.cashier2)
        cur = self.client.get('/api/v1/billing/shifts/current/').json()
        self.assertEqual(cur['counter_code'], 'C2')
        self.assertEqual(cur['cash_collected'], 0.0)

    # --- Denomination Math (plan test) ---
    def test_denomination_math_500x10_200x5_is_6000(self):
        resp = self._open(denominations={'500': 10, '200': 5})
        self.assertEqual(resp.status_code, 201, resp.content)
        self.assertEqual(resp.json()['opening_float'], 6000.0)
        tally = CashDenominationTally.objects.get(tally_type='OPENING_FLOAT')
        self.assertEqual((tally.count_500, tally.count_200, tally.total_amount), (10, 5, Decimal('6000.00')))
        counts = CounterShiftControlService.parse_denominations({'2000': 1, '10': 3, 'coins': '7.50'})
        self.assertEqual(CounterShiftControlService.denomination_total(counts), Decimal('2037.50'))

    def test_opening_rules(self):
        self.assertEqual(self._open(denominations={'500': 10}, opening_float=4000).status_code, 400)  # declared != counted
        self.assertEqual(self._open(opening_float=5000).status_code, 201)
        self.assertEqual(self._open(counter='C2').status_code, 400)          # one open shift per cashier
        self.assertEqual(self._open(self.cashier2, 'C1').status_code, 400)   # counter already occupied
        self.assertEqual(self._open(self.cashier2, 'C2').status_code, 201)
        neg = User.objects.create_user(username='neg_counts', password='x', role=RoleType.CASHIER)
        self.assertEqual(self._open(neg, 'C3', denominations={'500': -1}).status_code, 400)

    # --- Variance Detection (plan test) ---
    def test_expected_cash_formula_and_variance_tagging(self):
        shift = CounterShiftControlService.open_shift(self.cashier, 'C1', Decimal('5000.00'))
        self.assertEqual(self._collect(self.cashier, '1000.00').status_code, 201)
        upi = [{'tender_mode': 'UPI', 'amount': 400, 'transaction_reference': '123456789012'}]
        self.assertEqual(self._collect(self.cashier, '400.00', upi).status_code, 201)
        self.client.post('/api/v1/billing/deposits/', data={'patient': str(self.patient.id), 'amount': 500, 'tender_mode': 'CASH'}, format='json')
        inv = Invoice.objects.filter(payments__tender_mode='CASH').first()
        refund = RefundWorkflowService.initiate_refund_request(str(inv.id), Decimal('300.00'), 'Service not rendered', requested_by=self.cashier)
        RefundWorkflowService.approve_and_disburse_refund(str(refund.id), self.supervisor, 'CASH', disbursed_shift=shift)
        voucher = CounterShiftControlService.execute_cash_pickup(self.supervisor, shift.id, amount='2000')
        self.assertTrue(voucher.voucher_number.startswith('PCK-'))

        # Variance = physical - (5000 float + 1000 cash + 500 cash deposit - 300 cash refund - 2000 pickup)
        reg = CounterShiftControlService.compute_register(shift)
        self.assertEqual(reg['expected_cash'], Decimal('4200.00'))
        self.assertEqual(reg['expected_upi'], Decimal('400.00'))
        match = CounterShiftControlService.compute_drawer_variance(shift, '4200')
        self.assertEqual((match['variance'], match['variance_status']), (Decimal('0.00'), 'GREEN_MATCH'))
        short = CounterShiftControlService.compute_drawer_variance(shift, '4100')
        self.assertEqual((short['variance'], short['variance_status']), (Decimal('-100.00'), 'RED_VARIANCE'))

        self.client.force_authenticate(user=self.cashier)
        cur = self.client.get('/api/v1/billing/shifts/current/').json()
        self.assertEqual(cur['expected_cash_in_drawer'], 4200.0)
        self.assertEqual({r['kind'] for r in cur['register']}, {'PAYMENT', 'DEPOSIT', 'REFUND', 'PICKUP'})

    # --- Closing ---
    def test_matched_closing_is_green_and_blocks_further_collection(self):
        self._open(denominations={'500': 10})
        self._collect(self.cashier, '1000.00')
        resp = self.client.post('/api/v1/billing/shifts/close/', data={
            'denominations': {'500': 12}, 'card_total': 0, 'upi_total': 0}, format='json')
        self.assertEqual(resp.status_code, 200, resp.content)
        body = resp.json()
        self.assertEqual(body['status'], 'PENDING_APPROVAL')
        self.assertEqual(body['closing']['variance_status'], 'GREEN_MATCH')
        self.assertEqual(body['closing']['net_variance'], 0.0)
        self.assertEqual(self._collect(self.cashier).status_code, 400)  # drawer counted out: no more collections

    def test_variance_requires_explanation(self):
        self._open(opening_float=5000)
        card = [{'tender_mode': 'CARD', 'amount': 1000, 'auth_code': '123456', 'transaction_reference': 'EDC-1'}]
        self._collect(self.cashier, '1000.00', card)
        body = {'denominations': {'500': 9, '100': 4}, 'card_total': 900, 'upi_total': 0}  # cash -100, card -100
        resp = self.client.post('/api/v1/billing/shifts/close/', data=body, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('explanation', resp.json()['error'])
        resp = self.client.post('/api/v1/billing/shifts/close/', data={**body, 'notes': 'Short 100 cash; one EDC slip missing'}, format='json')
        self.assertEqual(resp.status_code, 200, resp.content)
        closing = resp.json()['closing']
        self.assertEqual(closing['variance_status'], 'RED_VARIANCE')
        self.assertEqual({t['tender']: t['variance'] for t in closing['tenders']}, {'CASH': -100.0, 'CARD': -100.0, 'UPI': 0.0})

    def test_only_the_shift_cashier_can_submit_closing(self):
        shift = CounterShiftControlService.open_shift(self.cashier, 'C1', Decimal('5000.00'))
        self.client.force_authenticate(user=self.cashier2)
        resp = self.client.post('/api/v1/billing/shifts/close/', data={'shift_id': str(shift.id), 'denominations': {'500': 10}}, format='json')
        self.assertEqual(resp.status_code, 403)

    # --- Supervisor sign-off ---
    def test_signoff_matched_and_four_eyes(self):
        shift = self._submitted()
        self.client.force_authenticate(user=self.cashier)
        url = f'/api/v1/billing/shifts/{shift.id}/supervisor-signoff/'
        self.assertEqual(self.client.post(url, data={'action': 'SIGN_OFF'}, format='json').status_code, 403)
        sup_shift = CounterShiftControlService.open_shift(self.supervisor, 'C2', Decimal('1000.00'))
        CounterShiftControlService.submit_closing(self.supervisor, denominations={'500': 2})
        self.client.force_authenticate(user=self.supervisor)
        own = f'/api/v1/billing/shifts/{sup_shift.id}/supervisor-signoff/'
        self.assertEqual(self.client.post(own, data={'action': 'SIGN_OFF'}, format='json').status_code, 403)
        resp = self.client.post(url, data={'action': 'SIGN_OFF'}, format='json')
        self.assertEqual(resp.status_code, 200, resp.content)
        shift.refresh_from_db()
        self.assertEqual((shift.status, shift.supervisor_sign_off_by), ('CLOSED', self.supervisor))
        self.assertFalse(shift.closed_with_variance)

    def test_variance_signoff_paths(self):
        shift = self._submitted({'500': 9, '100': 4}, note='Short by 100, counted twice')
        self.client.force_authenticate(user=self.supervisor)
        url = f'/api/v1/billing/shifts/{shift.id}/supervisor-signoff/'
        self.assertEqual(self.client.post(url, data={'action': 'SIGN_OFF'}, format='json').status_code, 400)
        self.assertEqual(self.client.post(url, data={'action': 'INVESTIGATE', 'finding': 'x'}, format='json').status_code, 400)
        resp = self.client.post(url, data={'action': 'INVESTIGATE', 'finding': 'CCTV review requested'}, format='json')
        self.assertEqual(resp.status_code, 200)
        shift.refresh_from_db()
        self.assertEqual(shift.status, 'UNDER_INVESTIGATION')
        self.assertTrue(shift.investigation_number.startswith('INQ-'))
        resp = self.client.post(url, data={'action': 'SIGN_OFF_WITH_VARIANCE', 'finding': 'Shortage confirmed and recovered'}, format='json')
        self.assertEqual(resp.status_code, 200)
        shift.refresh_from_db()
        self.assertEqual(shift.status, 'CLOSED')
        self.assertTrue(shift.closed_with_variance)
        self.assertEqual(self.client.post(url, data={'action': 'SIGN_OFF'}, format='json').status_code, 400)

    # --- Cash pickup ---
    def test_cash_pickup_request_and_supervisor_execution(self):
        shift = CounterShiftControlService.open_shift(self.cashier, 'C1', Decimal('5000.00'))
        self._collect(self.cashier, '40000.00')
        self.client.force_authenticate(user=self.cashier)
        cur = self.client.get('/api/v1/billing/shifts/current/').json()
        self.assertEqual(cur['utilization_percent'], 90.0)
        self.assertTrue(cur['pickup_due'])
        req = self.client.post('/api/v1/billing/shifts/cash-pickup/', data={}, format='json')
        self.assertEqual(req.status_code, 201)
        self.assertEqual((req.json()['status'], req.json()['amount'], req.json()['reason']),
                         ('REQUESTED', 40000.0, 'THRESHOLD_LIMIT_EXCEEDED'))
        # A cashier cannot execute the pickup themselves
        self.assertEqual(self.client.post('/api/v1/billing/shifts/cash-pickup/', data={'shift_id': str(shift.id)}, format='json').status_code, 403)

        self.client.force_authenticate(user=self.supervisor)
        board = self.client.get('/api/v1/billing/shifts/supervisor-board/').json()
        self.assertEqual(board['live_counters'][0]['pending_pickup']['voucher_number'], req.json()['voucher_number'])
        too_much = {'shift_id': str(shift.id), 'amount': 99999}
        self.assertEqual(self.client.post('/api/v1/billing/shifts/cash-pickup/', data=too_much, format='json').status_code, 400)
        done = self.client.post('/api/v1/billing/shifts/cash-pickup/', data={'shift_id': str(shift.id)}, format='json')
        self.assertEqual(done.status_code, 201)
        self.assertEqual((done.json()['status'], done.json()['voucher_number']), ('COMPLETED', req.json()['voucher_number']))
        self.assertEqual(CounterShiftControlService.compute_register(shift)['expected_cash'], Decimal('5000.00'))

    # --- Refund drawer attribution ---
    def test_cash_refund_needs_disburser_shift(self):
        CounterShiftControlService.open_shift(self.cashier, 'C1', Decimal('5000.00'))
        self._collect(self.cashier, '1000.00')
        inv = Invoice.objects.get()
        r1 = RefundWorkflowService.initiate_refund_request(str(inv.id), Decimal('100.00'), 'Duplicate', requested_by=self.cashier)
        self.client.force_authenticate(user=self.supervisor)
        resp = self.client.post(f'/api/v1/billing/refunds/{r1.id}/approve/', data={'disbursed_tender': 'CASH'}, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.json()['error'], 'No Active Shift')
        self.assertEqual(self.client.post(f'/api/v1/billing/refunds/{r1.id}/approve/', data={'disbursed_tender': 'UPI'}, format='json').status_code, 200)
        sup_shift = CounterShiftControlService.open_shift(self.supervisor, 'C2', Decimal('2000.00'))
        r2 = RefundWorkflowService.initiate_refund_request(str(inv.id), Decimal('50.00'), 'Duplicate', requested_by=self.cashier)
        self.assertEqual(self.client.post(f'/api/v1/billing/refunds/{r2.id}/approve/', data={'disbursed_tender': 'CASH'}, format='json').status_code, 200)
        self.assertEqual(CounterShiftControlService.compute_register(sup_shift)['expected_cash'], Decimal('1950.00'))

    # --- Vault ---
    def test_vault_handover_of_signed_bags(self):
        shift = self._submitted({'500': 10})
        self.client.force_authenticate(user=self.supervisor)
        self.assertEqual(self.client.post('/api/v1/billing/shifts/vault-handover/', data={}, format='json').status_code, 400)
        self.client.post(f'/api/v1/billing/shifts/{shift.id}/supervisor-signoff/', data={'action': 'SIGN_OFF'}, format='json')
        board = self.client.get('/api/v1/billing/shifts/supervisor-board/').json()
        self.assertEqual((board['kpis']['awaiting_vault'], board['kpis']['cash_to_vault']), (1, 5000.0))
        resp = self.client.post('/api/v1/billing/shifts/vault-handover/', data={}, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(resp.json()['handover_number'].startswith('VLT-'))
        self.assertEqual(resp.json()['total_cash'], 5000.0)
        self.assertEqual(self.client.post('/api/v1/billing/shifts/vault-handover/', data={}, format='json').status_code, 400)

    def test_cashier_cannot_reach_supervisor_endpoints(self):
        shift = self._submitted()
        self.client.force_authenticate(user=self.cashier2)
        self.assertEqual(self.client.get('/api/v1/billing/shifts/supervisor-board/').status_code, 403)
        self.assertEqual(self.client.post('/api/v1/billing/shifts/vault-handover/', data={}, format='json').status_code, 403)
        url = f'/api/v1/billing/shifts/{shift.id}/supervisor-signoff/'
        self.assertEqual(self.client.post(url, data={'action': 'SIGN_OFF'}, format='json').status_code, 403)


class Phase5SupervisorGovernanceTestCase(APITestCase):
    """Phase 5: approval limits, self-approval block, SLA escalation, refunds review, voids, counter mode, audit stream."""

    setUp_base = Phase3CashierWorkspaceTestCase.setUp
    _stage_charge = Phase3CashierWorkspaceTestCase._stage_charge

    def setUp(self):
        self.setUp_base()
        self.supervisor2 = User.objects.create_user(username='sup2_ph5', password='Password123!', role=RoleType.BILLING_SUPERVISOR,
                                                    first_name='Kavya', last_name='Menon')
        self.admin = User.objects.create_user(username='admin_ph5', password='Password123!', role=RoleType.BILLING_ADMIN,
                                              first_name='Anita', last_name='Desai')

    # ---------- helpers ----------
    def _request(self, user, pct, gross=1000):
        return CashierWorkspaceService.request_discount_approval(
            requested_by=user, patient=self.patient, bill_gross=gross, discount_percent=pct, reason='Financial hardship')

    def _act(self, user, req_id, action, **extra):
        self.client.force_authenticate(user=user)
        return self.client.post(f'/api/v1/billing/supervisor/approvals/{req_id}/action/', data={'action': action, **extra}, format='json')

    def _paid_invoice(self, amount='1000.00', tender='CASH', dept='OPD', ref=None):
        charge = self._stage_charge(amount, dept=dept)
        if ref is not None:
            charge.source_reference_id = ref
            charge.save()
        self.client.force_authenticate(user=self.cashier)
        resp = self.client.post('/api/v1/billing/cashier/bill-and-collect/', data={
            'patient': self.patient.uhid, 'charge_ids': [str(charge.id)],
            'split_payments': [{'tender_mode': tender, 'amount': float(amount)}]}, format='json')
        self.assertEqual(resp.status_code, 201, resp.content)
        return Invoice.objects.get(id=resp.json()['invoice']['id'])

    def _refund(self, invoice, amount):
        self.client.force_authenticate(user=self.cashier)
        item_ids = [str(i.id) for i in invoice.items.all()]
        resp = self.client.post('/api/v1/billing/refunds/request/', data={
            'invoice_id': str(invoice.id), 'amount': amount, 'reason': 'Test cancelled by doctor', 'item_ids': item_ids}, format='json')
        self.assertEqual(resp.status_code, 201, resp.content)
        return resp.json()['id']

    def _refund_act(self, user, refund_id, action='APPROVE', note=''):
        self.client.force_authenticate(user=user)
        return self.client.post(f'/api/v1/billing/supervisor/refunds/{refund_id}/disburse/', data={'action': action, 'note': note}, format='json')

    # ---------- self-approval block ----------
    def test_supervisor_request_routes_to_admin_and_cannot_be_self_approved(self):
        req = self._request(self.supervisor, 12)
        self.assertEqual(req.status, ApprovalStatus.ESCALATED)
        self.assertEqual(req.escalation_reason, 'SELF_RAISED')
        # Self-approval prevention: the requester can never decide
        resp = self._act(self.supervisor, req.id, 'APPROVE')
        self.assertEqual(resp.status_code, 403)
        self.assertIn('Four-eyes', resp.json()['error'])
        # A peer supervisor cannot decide it either - it skipped a level to Billing Admin
        self.assertEqual(self._act(self.supervisor2, req.id, 'APPROVE').status_code, 403)
        ok = self._act(self.admin, req.id, 'APPROVE')
        self.assertEqual(ok.status_code, 200, ok.content)
        self.assertEqual(ok.json()['status'], 'APPROVED')

    def test_cashier_cannot_reach_supervisor_endpoints(self):
        req = self._request(self.cashier, 10)
        self.assertEqual(self._act(self.cashier, req.id, 'APPROVE').status_code, 403)
        self.client.force_authenticate(user=self.cashier)
        for url in ('/api/v1/billing/supervisor/dashboard/', '/api/v1/billing/supervisor/approvals/',
                    '/api/v1/billing/supervisor/refunds/', '/api/v1/billing/supervisor/audit-stream/'):
            self.assertEqual(self.client.get(url).status_code, 403, url)

    # ---------- limits, modification, rejection, escalation ----------
    def test_supervisor_limit_and_lowering_the_discount(self):
        req = self._request(self.cashier, 25)
        self.assertEqual(req.status, ApprovalStatus.PENDING)
        above = self._act(self.supervisor, req.id, 'APPROVE')
        self.assertEqual(above.status_code, 400)
        self.assertIn('limit', above.json()['error'])
        self.assertEqual(self._act(self.supervisor, req.id, 'APPROVE', approved_percent=30).status_code, 400)
        ok = self._act(self.supervisor, req.id, 'APPROVE', approved_percent=15, note='Lowered to 15%')
        self.assertEqual(ok.status_code, 200, ok.content)
        req.refresh_from_db()
        self.assertEqual(req.discount_percent, Decimal('15.00'))
        self.assertEqual(req.discount_amount, Decimal('150.00'))
        self.assertEqual(req.requested_discount_percent, Decimal('25.00'))
        self.assertEqual(ok.json()['review_notes'], 'Lowered to 15%')

    def test_reject_needs_a_note_and_escalate_hands_to_admin(self):
        req = self._request(self.cashier, 25)
        self.assertEqual(self._act(self.supervisor, req.id, 'REJECT', note='no').status_code, 400)
        esc = self._act(self.supervisor, req.id, 'ESCALATE', note='Hardship above my limit')
        self.assertEqual(esc.status_code, 200)
        self.assertEqual(esc.json()['status'], 'ESCALATED')
        self.assertEqual(esc.json()['escalation_reason'], 'ABOVE_LIMIT')
        self.assertEqual(self._act(self.supervisor2, req.id, 'APPROVE').status_code, 403)
        ok = self._act(self.admin, req.id, 'APPROVE')
        self.assertEqual(ok.status_code, 200)
        self.assertEqual(ok.json()['discount_percent'], 25.0)

    def test_supervisor_direct_discount_is_capped_at_limit(self):
        CounterShiftControlService.open_shift(self.supervisor, 'CNT-SUP', Decimal('5000.00'))
        self.client.force_authenticate(user=self.supervisor)
        over = self.client.post('/api/v1/billing/cashier/bill-and-collect/', data={
            'patient': self.patient.uhid, 'charge_ids': [str(self._stage_charge('1000.00').id)], 'discount_percent': 25}, format='json')
        self.assertEqual(over.status_code, 403)
        within = self.client.post('/api/v1/billing/cashier/bill-and-collect/', data={
            'patient': self.patient.uhid, 'charge_ids': [str(self._stage_charge('1000.00').id)], 'discount_percent': 20}, format='json')
        self.assertEqual(within.status_code, 201)

    # ---------- SLA ----------
    def test_sla_badge_then_auto_escalation_to_admin(self):
        req = self._request(self.cashier, 10)
        SupervisorApprovalRequest.objects.filter(id=req.id).update(created_at=timezone.now() - timedelta(minutes=20))
        self.client.force_authenticate(user=self.supervisor)
        queue = self.client.get('/api/v1/billing/supervisor/approvals/').json()
        row = next(r for r in queue['pending'] if r['id'] == str(req.id))
        self.assertTrue(row['sla_breached'])
        self.assertEqual(queue['kpis']['past_sla'], 1)
        dash = self.client.get('/api/v1/billing/supervisor/dashboard/').json()
        self.assertTrue(any(a['kind'] == 'SLA' for a in dash['alerts']))

        SupervisorApprovalRequest.objects.filter(id=req.id).update(created_at=timezone.now() - timedelta(minutes=61))
        queue = self.client.get('/api/v1/billing/supervisor/approvals/').json()
        self.assertFalse(any(r['id'] == str(req.id) for r in queue['pending']))
        req.refresh_from_db()
        self.assertEqual(req.status, ApprovalStatus.ESCALATED)
        self.assertEqual(req.escalation_reason, 'SLA_BREACH')
        self.assertTrue(BillingAuditEvent.objects.filter(reference=req.request_number, event_type='APPROVAL_ESCALATED').exists())
        self.client.force_authenticate(user=self.admin)
        admin_queue = self.client.get('/api/v1/billing/supervisor/approvals/').json()
        self.assertTrue(any(r['id'] == str(req.id) and r['can_decide'] for r in admin_queue['pending']))

    # ---------- counter mode ----------
    def test_counter_mode_assist_tags_assisted_by_and_receipt_footer(self):
        self.client.force_authenticate(user=self.supervisor)
        enter = self.client.post('/api/v1/billing/supervisor/counter-mode/', data={'shift_id': str(self.shift.id), 'action': 'ENTER'}, format='json')
        self.assertEqual(enter.status_code, 200, enter.content)
        self.assertIn('Assisting on Ritu Verma', enter.json()['banner'])
        hdr = {'HTTP_X_BILLING_ASSIST_SHIFT': str(self.shift.id)}

        dash = self.client.get('/api/v1/billing/cashier/dashboard/', **hdr).json()
        self.assertTrue(dash['shift']['has_active_shift'])
        self.assertEqual(dash['assist']['cashier_name'], 'Ritu Verma')

        charge = self._stage_charge('1000.00')
        resp = self.client.post('/api/v1/billing/cashier/bill-and-collect/', data={
            'patient': self.patient.uhid, 'charge_ids': [str(charge.id)],
            'split_payments': [{'tender_mode': 'CASH', 'amount': 1000}]}, format='json', **hdr)
        self.assertEqual(resp.status_code, 201, resp.content)
        inv = Invoice.objects.get(id=resp.json()['invoice']['id'])
        self.assertEqual(inv.shift_id, self.shift.id)
        self.assertEqual(inv.assisted_by, self.supervisor)
        self.assertEqual(resp.json()['invoice']['assistedByName'], 'Vikramaditya Rao')
        self.assertTrue(all(p.assisted_by_id == self.supervisor.id for p in inv.payments.all()))
        receipt = BillingCoreService.get_receipt_details(str(inv.id))
        self.assertEqual(receipt['assisted_by'], 'Vikramaditya Rao')
        self.assertEqual(receipt['assisted_on_shift_of'], 'Ritu Verma')
        # The cash lands in the assisted cashier's drawer
        self.assertEqual(CounterShiftControlService.compute_register(self.shift)['expected_cash'], Decimal('6000.00'))

        # Counter mode removes the supervisor's direct-discount privilege
        blocked = self.client.post('/api/v1/billing/cashier/bill-and-collect/', data={
            'patient': self.patient.uhid, 'charge_ids': [str(self._stage_charge('1000.00').id)], 'discount_percent': 10}, format='json', **hdr)
        self.assertEqual(blocked.status_code, 403)

        # A cashier cannot use the assist header
        self.client.force_authenticate(user=self.cashier)
        nope = self.client.post('/api/v1/billing/cashier/bill-and-collect/', data={
            'patient': self.patient.uhid, 'charge_ids': [str(self._stage_charge('100.00').id)]}, format='json', **hdr)
        self.assertEqual(nope.status_code, 400)
        self.assertEqual(nope.json()['error'], 'No Active Shift')

        self.client.force_authenticate(user=self.supervisor)
        self.client.post('/api/v1/billing/supervisor/counter-mode/', data={'shift_id': str(self.shift.id), 'action': 'EXIT'}, format='json')
        titles = set(BillingAuditEvent.objects.filter(event_type='COUNTER_MODE').values_list('title', flat=True))
        self.assertEqual(titles, {'Entered counter mode', 'Returned from counter mode'})

    def test_counter_mode_needs_an_open_shift_on_another_cashier(self):
        self.client.force_authenticate(user=self.supervisor)
        own = CounterShiftControlService.open_shift(self.supervisor, 'CNT-SUP', Decimal('5000.00'))
        self.assertEqual(self.client.post('/api/v1/billing/supervisor/counter-mode/', data={'shift_id': str(own.id), 'action': 'ENTER'}, format='json').status_code, 400)
        CounterShift.objects.filter(id=self.shift.id).update(status=ShiftStatus.PENDING_APPROVAL)
        self.assertEqual(self.client.post('/api/v1/billing/supervisor/counter-mode/', data={'shift_id': str(self.shift.id), 'action': 'ENTER'}, format='json').status_code, 400)

    # ---------- refunds ----------
    def test_refund_verification_blocks_delivered_lab_test_then_cash_payout(self):
        doctor_profile = DoctorProfile.objects.create(user=self.doctor, department='Pathology', license_number='DOC-PH5-01')
        order = LabOrder.objects.create(order_number='LAB-PH5-0001', patient=self.patient, test=self.lab_test,
                                        doctor=doctor_profile, priority=LabOrderPriority.ROUTINE, status=LabOrderStatus.SAMPLE_COLLECTED)
        inv = self._paid_invoice('550.00', dept='LAB', ref=str(order.id))
        refund_id = self._refund(inv, 550)

        self.client.force_authenticate(user=self.supervisor)
        row = next(r for r in self.client.get('/api/v1/billing/supervisor/refunds/').json()['pending'] if r['id'] == refund_id)
        self.assertFalse(row['verified'])
        self.assertEqual(row['original_tender'], 'CASH')
        blocked = self._refund_act(self.supervisor, refund_id)
        self.assertEqual(blocked.status_code, 400)
        self.assertIn('already delivered', blocked.json()['error'])

        order.status = LabOrderStatus.CANCELLED
        order.save()
        ok = self._refund_act(self.supervisor, refund_id, note='Cancelled by doctor')
        self.assertEqual(ok.status_code, 200, ok.content)
        self.assertEqual(ok.json()['refund']['status'], 'APPROVED')
        self.assertTrue(ok.json()['refund']['awaiting_cash'])
        self.assertIsNone(ok.json()['credit_note'])

        # The cashier pays it out from their own drawer
        self.client.force_authenticate(user=self.cashier)
        paid = self.client.post(f'/api/v1/billing/refunds/{refund_id}/disburse-cash/', format='json')
        self.assertEqual(paid.status_code, 200, paid.content)
        refund = RefundRequest.objects.get(id=refund_id)
        self.assertEqual(refund.status, RefundStatus.DISBURSED)
        self.assertEqual(refund.disbursed_shift_id, self.shift.id)
        self.assertTrue(refund.credit_note_number.startswith('CN-'))
        self.assertEqual(CounterShiftControlService.compute_register(self.shift)['cash_refunds'], Decimal('550.00'))
        self.assertEqual(self.client.post(f'/api/v1/billing/refunds/{refund_id}/disburse-cash/', format='json').status_code, 400)

    def test_card_refund_reverses_immediately_with_credit_note(self):
        inv = self._paid_invoice('700.00', tender='UPI', ref='COUNTER-TEST')
        refund_id = self._refund(inv, 700)
        ok = self._refund_act(self.supervisor, refund_id)
        self.assertEqual(ok.status_code, 200, ok.content)
        self.assertEqual(ok.json()['refund']['status'], 'DISBURSED')
        self.assertTrue(ok.json()['credit_note']['credit_note_number'].startswith('CN-'))
        refund = RefundRequest.objects.get(id=refund_id)
        self.assertEqual(refund.disbursed_tender, 'UPI')
        self.assertIsNone(refund.disbursed_shift_id)
        inv.refresh_from_db()
        self.assertEqual(inv.status, InvoiceStatus.REFUNDED)

    def test_refund_limit_four_eyes_and_reject_note(self):
        inv = self._paid_invoice('12000.00', tender='CARD', ref='COUNTER-BIG')
        refund_id = self._refund(inv, 12000)
        over = self._refund_act(self.supervisor, refund_id)
        self.assertEqual(over.status_code, 400)
        self.assertIn('refund limit', over.json()['error'])
        self.assertEqual(self._refund_act(self.supervisor, refund_id, 'REJECT', note='no').status_code, 400)
        self.assertEqual(self._refund_act(self.supervisor, refund_id, 'ESCALATE').status_code, 200)
        self.assertEqual(self._refund_act(self.supervisor2, refund_id).status_code, 403)
        self.assertEqual(self._refund_act(self.admin, refund_id).status_code, 200)

        inv2 = self._paid_invoice('300.00', tender='UPI', ref='COUNTER-SMALL')
        own = RefundWorkflowService.initiate_refund_request(str(inv2.id), Decimal('300.00'), 'Duplicate', requested_by=self.supervisor)
        resp = self._refund_act(self.supervisor, own.id)
        self.assertEqual(resp.status_code, 403)

    # ---------- voids ----------
    def test_void_unpaid_invoice_returns_charges_to_queue(self):
        charge = self._stage_charge('800.00')
        self.client.force_authenticate(user=self.cashier)
        inv = self.client.post('/api/v1/billing/cashier/bill-and-collect/', data={
            'patient': self.patient.uhid, 'charge_ids': [str(charge.id)]}, format='json').json()['invoice']
        self.assertEqual(inv['status'], 'UNPAID')
        req = self.client.post(f"/api/v1/billing/invoices/{inv['id']}/void-request/", data={'reason': 'Wrong patient'}, format='json')
        self.assertEqual(req.status_code, 201, req.content)
        self.assertEqual(req.json()['request_type'], 'INVOICE_VOID')
        self.assertEqual(self.client.post(f"/api/v1/billing/invoices/{inv['id']}/void-request/", data={'reason': 'again'}, format='json').status_code, 400)

        ok = self._act(self.supervisor, req.json()['id'], 'APPROVE')
        self.assertEqual(ok.status_code, 200, ok.content)
        invoice = Invoice.objects.get(id=inv['id'])
        self.assertEqual(invoice.status, InvoiceStatus.CANCELLED)
        self.assertEqual(invoice.cancelled_by, self.supervisor)
        charge.refresh_from_db()
        self.assertEqual(charge.status, ChargeItemStatus.PENDING)
        self.assertIsNone(charge.invoice_id)

        paid = self._paid_invoice('500.00')
        self.client.force_authenticate(user=self.cashier)
        self.assertEqual(self.client.post(f'/api/v1/billing/invoices/{paid.id}/void-request/', data={'reason': 'Wrong patient'}, format='json').status_code, 400)

    # ---------- dashboard & audit ----------
    def test_dashboard_counters_and_audit_stream_review(self):
        self._paid_invoice('45000.00')
        self.client.force_authenticate(user=self.supervisor)
        dash = self.client.get('/api/v1/billing/supervisor/dashboard/').json()
        counter = next(c for c in dash['counters'] if c['counter_code'] == 'CNT-PH3')
        self.assertEqual(counter['status'], 'OPEN')
        self.assertEqual(counter['cashier_name'], 'Ritu Verma')
        self.assertEqual(counter['expected_cash_in_drawer'], 50000.0)
        self.assertGreaterEqual(dash['kpis']['collections_today'], 45000.0)
        self.assertTrue(any(a['kind'] == 'PICKUP' or a['kind'] == 'DRAWER' for a in dash['alerts']) or counter['pickup_due'])

        stream = self.client.get('/api/v1/billing/supervisor/audit-stream/').json()
        high = next(e for e in stream['rows'] if e['title'] == 'High-value cash receipt')
        self.assertEqual(high['severity'], 'HIGH')
        self.assertEqual(stream['unreviewed_high'], 1)
        rev = self.client.post(f"/api/v1/billing/supervisor/audit-stream/{high['id']}/review/", format='json')
        self.assertEqual(rev.status_code, 200)
        self.assertEqual(self.client.get('/api/v1/billing/supervisor/audit-stream/?unreviewed=1').json()['unreviewed_high'], 0)


class Phase6TariffPricingGovernanceTestCase(APITestCase):
    """Phase 6: tariff versions & revision log, department change requests, emergency markup schedules,
    structured packages and package-aware quotes."""

    def setUp(self):
        self.admin = User.objects.create_user(username='ph6_admin', password='Password123!', role=RoleType.BILLING_ADMIN,
                                              first_name='Anita', last_name='Desai')
        self.admin2 = User.objects.create_user(username='ph6_admin2', password='Password123!', role=RoleType.HOSPITAL_ADMIN)
        self.lab = User.objects.create_user(username='ph6_lab', password='Password123!', role=RoleType.LAB_TECH,
                                            first_name='K', last_name='Rao')
        self.cashier = User.objects.create_user(username='ph6_cashier', password='Password123!', role=RoleType.CASHIER)
        self.patient = Patient.objects.create(first_name='Nirmala', last_name='Shetty', gender='FEMALE', date_of_birth='1960-01-01',
                                              uhid='NH-PH6-01', phone_number='9000000601')
        self.cbc = TariffMaster.objects.create(code='LAB-CBC', name='Complete Blood Count', department='LAB', base_price=Decimal('400.00'))
        self.lft = TariffMaster.objects.create(code='LAB-LFT', name='Liver Function Test', department='LAB', base_price=Decimal('650.00'))
        self.xray = TariffMaster.objects.create(code='RAD-XR-KNEE', name='X-Ray Knee', department='RADIOLOGY', base_price=Decimal('750.00'),
                                                gst_rate=Decimal('5.00'))
        self.er = TariffMaster.objects.create(code='ER-CONS', name='Emergency consultation', department='EMERGENCY',
                                              base_price=Decimal('1000.00'), emergency_markup_percent=Decimal('10.00'))
        self.lab_test = LabTest.objects.create(test_code='LAB-CBC', name='Complete Blood Count', price=Decimal('999.00'))

    def _local(self, hour, minute=0, day=6):
        # 2026-10-06 is a Tuesday; 2026-10-10 a Saturday
        from datetime import datetime
        return timezone.make_aware(datetime(2026, 10, day, hour, minute))

    def _propose(self, code='LAB-CBC', price='420.00', effective=None, user=None, **extra):
        self.client.force_authenticate(user=user or self.lab)
        return self.client.post('/api/v1/billing/tariffs/change-requests/', data={
            'service_code': code, 'proposed_price': price, 'effective_from': (effective or timezone.localdate()).isoformat(),
            'justification': 'Reagent cost up 11% from supplier', **extra}, format='json')

    def _decide(self, req_id, action='APPROVE', user=None, **extra):
        self.client.force_authenticate(user=user or self.admin)
        return self.client.post(f'/api/v1/billing/tariffs/change-requests/{req_id}/decide/', data={'action': action, **extra}, format='json')

    # ---------- effective rate ----------
    def test_effective_rate_adds_night_emergency_surcharge(self):
        EmergencyMarkupSchedule.objects.create(label='Night surcharge', department='ALL', markup_percentage=Decimal('50.00'),
                                               applies_from_time='22:00', applies_to_time='06:00')
        night = TariffPricingService.get_effective_tariff('ER-CONS', 'EMERGENCY', is_emergency=True, at=self._local(23, 30))
        self.assertEqual(night['markup_amount'], Decimal('500.00'))
        self.assertIn('Night surcharge', night['markup_source'])
        early = TariffPricingService.get_effective_tariff('ER-CONS', is_emergency=True, at=self._local(5, 59))
        self.assertEqual(early['markup_amount'], Decimal('500.00'))
        day = TariffPricingService.get_effective_tariff('ER-CONS', is_emergency=True, at=self._local(14, 0))
        self.assertEqual(day['markup_amount'], Decimal('100.00'))  # flat tariff emergency markup by day
        opd = TariffPricingService.get_effective_tariff('ER-CONS', 'OPD', is_emergency=False, at=self._local(23, 30))
        self.assertEqual(opd['markup_amount'], Decimal('0.00'))

        EmergencyMarkupSchedule.objects.create(label='Weekend', department='EMERGENCY', markup_percentage=Decimal('25.00'),
                                               applies_from_time='08:00', applies_to_time='09:00', is_weekend_active=True)
        saturday = TariffPricingService.get_effective_tariff('ER-CONS', is_emergency=True, at=self._local(14, 0, day=10))
        self.assertEqual(saturday['markup_amount'], Decimal('250.00'))

        self.client.force_authenticate(user=self.cashier)
        quote = self.client.post('/api/v1/billing/pricing/calculate-quote/', data={
            'items': [{'service_code': 'ER-CONS', 'qty': 1}], 'is_emergency': True, 'at': '2026-10-06T23:30:00'}, format='json').json()
        self.assertEqual(float(quote['net_payable']), 1500.0)

    # ---------- packages ----------
    def _knee_package(self, publish=True):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post('/api/v1/billing/packages/', data={
            'code': 'PKG-ORT-014', 'name': 'Total Knee Replacement', 'department': 'ORTHOPAEDICS', 'package_price': 185000,
            'length_of_stay_days': 4, 'overrun_rule': 'Extra days at Private bed tariff.',
            'items': [
                {'service_code': 'LAB-CBC', 'max_quantity_covered': 2, 'is_mandatory': True},
                {'service_name': 'Private bed × 4 days', 'max_quantity_covered': 4},
                {'service_code': 'RAD-XR-KNEE', 'inclusion_type': 'EXCLUDED'},
            ]}, format='json')
        self.assertEqual(resp.status_code, 201, resp.content)
        self.assertEqual(resp.json()['status'], 'DRAFT')
        if publish:
            self.assertEqual(self.client.post('/api/v1/billing/packages/PKG-ORT-014/publish/', format='json').status_code, 200)
        return resp.json()

    def test_package_inclusions_absorb_covered_cbc(self):
        self._knee_package()
        self.client.force_authenticate(user=self.cashier)
        quote = self.client.post('/api/v1/billing/pricing/calculate-quote/', data={
            'package_code': 'PKG-ORT-014',
            'items': [{'service_code': 'LAB-CBC', 'qty': 3}, {'service_code': 'LAB-LFT', 'qty': 1}, {'service_code': 'RAD-XR-KNEE', 'qty': 1}]
        }, format='json')
        self.assertEqual(quote.status_code, 200, quote.content)
        q = quote.json()
        cbc = [l for l in q['items'] if l['service_code'] == 'LAB-CBC']
        covered = next(l for l in cbc if l['covered_by_package'])
        self.assertEqual((covered['qty'], float(covered['total'])), (2, 0.0))  # covered CBC charges ₹0
        extra = next(l for l in cbc if not l['covered_by_package'])
        self.assertEqual((extra['qty'], float(extra['total'])), (1, 400.0))  # beyond allowance at tariff
        lft = next(l for l in q['items'] if l['service_code'] == 'LAB-LFT')
        self.assertFalse(lft['covered_by_package'])
        self.assertEqual(float(lft['total']), 650.0)  # not included: standard tariff
        xray = next(l for l in q['items'] if l['service_code'] == 'RAD-XR-KNEE')
        self.assertEqual(float(xray['total']), 787.5)  # excluded: billed separately with GST
        self.assertIn('excluded', xray['coverage_note'])
        self.assertEqual(float(q['net_payable']), 185000 + 400 + 650 + 787.5)
        self.assertEqual(float(q['package']['absorbed_value']), 800.0)

        cov = self.client.get('/api/v1/billing/packages/PKG-ORT-014/coverage/?service_code=LAB-CBC&consumed=2').json()
        self.assertFalse(cov['covered'])
        self.assertTrue(TariffPricingService.is_service_covered_by_package('PKG-ORT-014', 'LAB-CBC', 1)['covered'])

    def test_package_lifecycle_and_validation(self):
        self.client.force_authenticate(user=self.admin)
        self.client.post('/api/v1/billing/packages/', data={'code': 'PKG-EMPTY', 'name': 'Empty'}, format='json')
        self.assertEqual(self.client.post('/api/v1/billing/packages/PKG-EMPTY/publish/', format='json').status_code, 400)
        pkg = self._knee_package(publish=False)
        future = (timezone.localdate() + timedelta(days=20)).isoformat()
        self.client.patch('/api/v1/billing/packages/PKG-ORT-014/', data={'effective_from': future}, format='json')
        pub = self.client.post('/api/v1/billing/packages/PKG-ORT-014/publish/', format='json').json()
        self.assertEqual(pub['status'], 'SCHEDULED')
        self.client.force_authenticate(user=self.cashier)
        self.assertEqual(self.client.post('/api/v1/billing/pricing/calculate-quote/', data={
            'package_code': 'PKG-ORT-014', 'items': []}, format='json').status_code, 400)
        self.assertEqual(self.client.post('/api/v1/billing/packages/PKG-ORT-014/retire/', format='json').status_code, 403)
        ServicePackage.objects.filter(code='PKG-ORT-014').update(effective_from=timezone.localdate())
        self.assertEqual(self.client.get('/api/v1/billing/packages/PKG-ORT-014/').json()['status'], 'SCHEDULED')
        listed = self.client.get('/api/v1/billing/packages/').json()  # list read brings due packages live
        self.assertEqual(next(p for p in listed if p['code'] == 'PKG-ORT-014')['status'], 'ACTIVE')
        self.client.force_authenticate(user=self.admin)
        self.assertEqual(self.client.post('/api/v1/billing/packages/PKG-ORT-014/retire/', format='json').json()['status'], 'RETIRED')
        self.assertFalse(ServicePackage.objects.get(code='PKG-ORT-014').is_active)
        self.assertEqual(self.client.patch('/api/v1/billing/packages/PKG-ORT-014/', data={'package_price': 1}, format='json').status_code, 400)
        self.assertEqual(len(pkg['inclusions']), 2)
        self.assertEqual(len(pkg['exclusions']), 1)

    # ---------- revision log ----------
    def test_tariff_revision_creates_immutable_log(self):
        self.client.force_authenticate(user=self.admin)
        self.assertEqual(self.client.patch('/api/v1/billing/tariffs/LAB-LFT/', data={'base_price': 700}, format='json').status_code, 400)
        resp = self.client.patch('/api/v1/billing/tariffs/LAB-LFT/', data={'base_price': 700, 'justification': 'Annual revision'}, format='json')
        self.assertEqual(resp.status_code, 200, resp.content)
        self.assertEqual(resp.json()['base_price'], '700.00')
        log = TariffRevisionLog.objects.get(tariff=self.lft)
        self.assertEqual((log.old_base_price, log.new_base_price, log.revised_by), (Decimal('650.00'), Decimal('700.00'), self.admin))
        self.assertIsNotNone(log.applied_at)
        self.assertEqual(resp.json()['history'][0]['revised_by'], 'Anita Desai')
        log.justification = 'tampered'
        with self.assertRaises(ValueError):
            log.save()
        with self.assertRaises(ValueError):
            log.delete()
        # Name-only edits need no justification and write no price version
        self.assertEqual(self.client.patch('/api/v1/billing/tariffs/LAB-LFT/', data={'name': 'LFT panel'}, format='json').status_code, 200)
        self.assertEqual(TariffRevisionLog.objects.filter(tariff=self.lft).count(), 1)
        self.client.force_authenticate(user=self.cashier)
        self.assertEqual(self.client.patch('/api/v1/billing/tariffs/LAB-LFT/', data={'base_price': 1, 'justification': 'nope nope'}, format='json').status_code, 403)
        self.assertEqual(self.client.get('/api/v1/billing/tariffs/').status_code, 200)

    # ---------- department change requests ----------
    def test_change_request_publish_now_syncs_lab_catalogue(self):
        resp = self._propose()
        self.assertEqual(resp.status_code, 201, resp.content)
        req = resp.json()
        self.assertEqual((req['owner'], req['current_price'], req['change_percent']), ('Laboratory', 400.0, 5.0))
        self.assertIn('charge(s) in the last 30 days', req['impact_note'])
        self.assertEqual(self._propose().status_code, 400)  # one open request per service
        self.assertEqual(self._decide(req['id'], user=self.cashier).status_code, 403)
        ok = self._decide(req['id'], note='Reagent invoice checked')
        self.assertEqual(ok.status_code, 200, ok.content)
        self.assertEqual(ok.json()['status'], 'PUBLISHED')
        self.cbc.refresh_from_db()
        self.assertEqual(self.cbc.base_price, Decimal('420.00'))
        self.lab_test.refresh_from_db()
        self.assertEqual(self.lab_test.price, Decimal('420.00'))  # Tariff Published event reached the Lab catalogue
        self.assertEqual(TariffRevisionLog.objects.get(change_request_id=req['id']).source, 'CHANGE_REQUEST')

    def test_proposer_cannot_publish_own_change(self):
        req = self._propose(user=self.admin).json()
        self.assertEqual(self._decide(req['id'], user=self.admin).status_code, 403)
        self.assertEqual(self._decide(req['id'], user=self.admin2).status_code, 200)

    def test_scheduled_change_goes_live_on_effective_date_and_open_charges_keep_price(self):
        charge = CashierWorkspaceService.add_counter_service(self.cashier, self.patient, 'LAB-CBC')
        future = timezone.localdate() + timedelta(days=10)
        req = self._propose(effective=future).json()
        ok = self._decide(req['id'])
        self.assertEqual(ok.json()['status'], 'APPROVED')
        self.cbc.refresh_from_db()
        self.assertEqual(self.cbc.base_price, Decimal('400.00'))  # not live yet
        self.client.force_authenticate(user=self.cashier)
        row = next(t for t in self.client.get('/api/v1/billing/tariffs/?search=LAB-CBC').json() if t['code'] == 'LAB-CBC')
        self.assertEqual(row['scheduled_change'], {'base_price': 420.0, 'effective_from': future.isoformat()})

        TariffRevisionLog.objects.filter(change_request_id=req['id']).update(effective_from=timezone.localdate())
        new_charge = CashierWorkspaceService.add_counter_service(self.cashier, self.patient, 'LAB-CBC')
        self.assertEqual(new_charge.unit_price, Decimal('420.00'))
        charge.refresh_from_db()
        self.assertEqual(charge.unit_price, Decimal('400.00'))  # price at time of charge
        self.assertEqual(TariffChangeRequest.objects.get(id=req['id']).status, 'PUBLISHED')

    def test_change_above_fifteen_percent_needs_cfo_and_notes(self):
        req = self._propose(price='500.00').json()
        self.assertTrue(req['needs_cfo'])
        self.assertEqual(self._decide(req['id']).status_code, 400)
        self.assertEqual(self._decide(req['id'], cfo_confirmed=True).status_code, 400)  # confirmation must be recorded
        self.assertEqual(self._decide(req['id'], cfo_confirmed=True, note='CFO approved by email 05 Oct').status_code, 200)

        req2 = self._propose(code='LAB-LFT', price='700.00').json()
        self.assertEqual(self._decide(req2['id'], 'REVISION').status_code, 400)
        rev = self._decide(req2['id'], 'REVISION', note='Propose a phased increase')
        self.assertEqual(rev.json()['status'], 'REVISION')
        self.assertEqual(self._propose(code='LAB-LFT', price='680.00').status_code, 201)  # department resubmits
        past = timezone.localdate() - timedelta(days=1)
        self.assertEqual(self._propose(code='RAD-XR-KNEE', price='800.00', effective=past).status_code, 400)

    def test_new_service_proposal_creates_tariff_on_approval(self):
        resp = self._propose(code='LAB-GEN-090', price='8500.00', service_name='Genetic carrier screen', department='LAB')
        self.assertEqual(resp.status_code, 201, resp.content)
        self.assertTrue(resp.json()['is_new_service'])
        self.assertFalse(TariffMaster.objects.filter(code='LAB-GEN-090').exists())  # invisible until approved
        self.assertEqual(self._decide(resp.json()['id']).json()['status'], 'PUBLISHED')
        t = TariffMaster.objects.get(code='LAB-GEN-090')
        self.assertTrue(t.is_active)
        self.assertEqual(t.base_price, Decimal('8500.00'))

    # ---------- batch import ----------
    def test_batch_import_preview_then_all_or_nothing(self):
        self.client.force_authenticate(user=self.admin)
        bad = 'code,name,department,base_price,gst_rate\nLAB-CBC,,LAB,450,\nLAB-NEW-1,Vitamin D,LAB,1200,\nLAB-LFT,,LAB,abc,\n'
        preview = self.client.post('/api/v1/billing/tariffs/batch-import/', data={'csv': bad}, format='json')
        self.assertEqual(preview.status_code, 200, preview.content)
        self.assertEqual(preview.json()['summary'], {'CREATE': 1, 'UPDATE': 1, 'UNCHANGED': 0, 'ERROR': 1})
        apply_bad = self.client.post('/api/v1/billing/tariffs/batch-import/', data={'csv': bad, 'dry_run': False, 'justification': 'FY revision'}, format='json')
        self.assertEqual(apply_bad.status_code, 400)
        self.cbc.refresh_from_db()
        self.assertEqual(self.cbc.base_price, Decimal('400.00'))
        good = bad.replace('LAB-LFT,,LAB,abc,', 'LAB-LFT,,LAB,650,')
        applied = self.client.post('/api/v1/billing/tariffs/batch-import/', data={'csv': good, 'dry_run': False, 'justification': 'FY revision'}, format='json')
        self.assertEqual(applied.status_code, 201, applied.content)
        self.assertEqual(applied.json()['summary']['UNCHANGED'], 1)
        self.cbc.refresh_from_db()
        self.assertEqual(self.cbc.base_price, Decimal('450.00'))
        self.assertEqual(TariffRevisionLog.objects.get(tariff=self.cbc).source, 'BATCH_IMPORT')
        self.assertTrue(TariffMaster.objects.get(code='LAB-NEW-1').is_active)
        self.client.force_authenticate(user=self.cashier)
        self.assertEqual(self.client.post('/api/v1/billing/tariffs/batch-import/', data={'csv': good}, format='json').status_code, 403)

    def test_markup_schedules_are_admin_managed(self):
        self.client.force_authenticate(user=self.cashier)
        self.assertEqual(self.client.post('/api/v1/billing/pricing/markup-schedules/', data={
            'markup_percentage': 50, 'applies_from_time': '22:00', 'applies_to_time': '06:00'}, format='json').status_code, 403)
        self.client.force_authenticate(user=self.admin)
        made = self.client.post('/api/v1/billing/pricing/markup-schedules/', data={
            'label': 'Night', 'markup_percentage': 50, 'applies_from_time': '22:00', 'applies_to_time': '06:00'}, format='json')
        self.assertEqual(made.status_code, 201, made.content)
        self.assertEqual(self.client.post('/api/v1/billing/pricing/markup-schedules/', data={
            'markup_percentage': 50, 'applies_from_time': '25:00', 'applies_to_time': '06:00'}, format='json').status_code, 400)
        off = self.client.patch(f"/api/v1/billing/pricing/markup-schedules/{made.json()['id']}/", data={'is_active': False}, format='json')
        self.assertFalse(off.json()['is_active'])


class Phase7BillingAdminTestCase(APITestCase):
    """Phase 7: Billing Admin Core & Governance.
    - 4-Tier escalation ladder enforcement & routing simulation.
    - Hardware terminal registry and IP lockdown.
    - Staff duty roster overlap prevention & publication.
    - Revenue Command executive dashboard KPIs and metrics.
    - Financial policy rules engine CRUD.
    """
    def setUp(self):
        self.admin = User.objects.create_user(
            username='billing_admin_p7',
            password='Password123!',
            first_name='Kavita',
            last_name='Nair',
            role=RoleType.BILLING_ADMIN
        )
        self.manager = User.objects.create_user(
            username='billing_mgr_p7',
            password='Password123!',
            first_name='Anil',
            last_name='Kapoor',
            role=RoleType.BILLING_MANAGER
        )
        self.supervisor = User.objects.create_user(
            username='supervisor_p7',
            password='Password123!',
            first_name='Vikram',
            last_name='Bose',
            role=RoleType.BILLING_SUPERVISOR
        )
        self.cashier1 = User.objects.create_user(
            username='cashier1_p7',
            password='Password123!',
            first_name='Priya',
            last_name='Sharma',
            role=RoleType.CASHIER
        )
        self.cashier2 = User.objects.create_user(
            username='cashier2_p7',
            password='Password123!',
            first_name='Rahul',
            last_name='Mehta',
            role=RoleType.CASHIER
        )
        self.patient = Patient.objects.create(
            first_name='Sunita',
            last_name='Rao',
            gender='FEMALE',
            date_of_birth='1988-05-12',
            phone_number='9876543210'
        )
        self.counter1 = BillingCounter.objects.create(
            code='CNT-P7-01',
            name='OPD Main Station',
            station_location='OPD_LOBBY',
            is_active=True
        )
        self.counter2 = BillingCounter.objects.create(
            code='CNT-P7-02',
            name='IPD Station',
            station_location='IPD_BILLING',
            is_active=True
        )

    def test_approval_matrix_tier_escalation(self):
        """Supervisor cannot approve discount exceeding 20%; auto-routes to Admin/Manager."""
        BillingAdminGovernanceService.ensure_default_matrix()
        self.assertGreaterEqual(ApprovalMatrixTier.objects.count(), 24)

        # Cashier creates a 25% discount request on a 10,000 bill (discount = 2,500)
        req = SupervisorApprovalRequest.objects.create(
            request_number='APR-TEST-001',
            request_type='DISCOUNT',
            patient=self.patient,
            bill_gross=Decimal('10000.00'),
            discount_percent=Decimal('25.00'),
            discount_amount=Decimal('2500.00'),
            reason='Special hardship concession',
            requested_by=self.cashier1,
            counter=self.counter1
        )

        # Supervisor attempts to approve directly - rejected due to limit
        self.client.force_authenticate(user=self.supervisor)
        resp = self.client.post(f'/api/v1/billing/approvals/{req.id}/decide/', data={'action': 'APPROVE'}, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('limit', resp.json()['error'].lower())

        # Supervisor escalates to Billing Admin
        resp_esc = self.client.post(f'/api/v1/billing/approvals/{req.id}/decide/', data={
            'action': 'ESCALATE', 'note': 'Exceeds 20% limit - routing to Admin'
        }, format='json')
        self.assertEqual(resp_esc.status_code, 200)

        req.refresh_from_db()
        self.assertEqual(req.status, ApprovalStatus.ESCALATED)

        # Supervisor cannot approve once escalated (forbidden)
        resp_sup2 = self.client.post(f'/api/v1/billing/approvals/{req.id}/decide/', data={'action': 'APPROVE'}, format='json')
        self.assertEqual(resp_sup2.status_code, 403)

        # Billing Admin approves the escalated request
        self.client.force_authenticate(user=self.admin)
        resp_admin = self.client.post(f'/api/v1/billing/approvals/{req.id}/decide/', data={'action': 'APPROVE'}, format='json')
        self.assertEqual(resp_admin.status_code, 200)
        req.refresh_from_db()
        self.assertEqual(req.status, ApprovalStatus.APPROVED)
        self.assertEqual(req.approved_by, self.admin)

    def test_route_request_simulation(self):
        """Simulation endpoint tests escalation ladder routing."""
        self.client.force_authenticate(user=self.admin)
        # Case 1: 15% discount (within Supervisor 20% limit)
        sim1 = self.client.post('/api/v1/billing/admin/approval-matrix/test-route/', data={
            'action_type': 'DISCOUNT', 'amount': 2000, 'percentage': 15
        }, format='json')
        self.assertEqual(sim1.status_code, 200)
        self.assertEqual(sim1.json()['target_tier'], 'SUPERVISOR')
        self.assertFalse(sim1.json()['auto_escalated'])

        # Case 2: 25% discount (exceeds Supervisor 20%, within Manager 35% and ₹25,000)
        sim2 = self.client.post('/api/v1/billing/admin/approval-matrix/test-route/', data={
            'action_type': 'DISCOUNT', 'amount': 15000, 'percentage': 25
        }, format='json')
        self.assertEqual(sim2.status_code, 200)
        self.assertEqual(sim2.json()['target_tier'], 'MANAGER')
        self.assertTrue(sim2.json()['auto_escalated'])

        # Case 3: 45% discount (exceeds Manager, routes to Admin)
        sim3 = self.client.post('/api/v1/billing/admin/approval-matrix/test-route/', data={
            'action_type': 'DISCOUNT', 'amount': 45000, 'percentage': 45
        }, format='json')
        self.assertEqual(sim3.status_code, 200)
        self.assertEqual(sim3.json()['target_tier'], 'ADMIN')

    def test_hardware_terminal_lock_rejects_unapproved_ip(self):
        """Counter with terminal lock active rejects shift open from unregistered IP."""
        reg, _ = CounterHardwareRegistry.objects.get_or_create(
            counter=self.counter1,
            defaults={
                'ip_address': '192.168.1.188',
                'is_terminal_lock_enabled': True
            }
        )
        reg.ip_address = '192.168.1.188'
        reg.is_terminal_lock_enabled = True
        reg.save()

        self.client.force_authenticate(user=self.cashier1)
        resp = self.client.post('/api/v1/billing/shifts/open/', data={
            'counter_code': self.counter1.code,
            'opening_float': 5000,
            'client_ip': '192.168.1.250'
        }, format='json')
        self.assertEqual(resp.status_code, 403)
        self.assertIn('terminal lockdown violation', resp.json()['error'].lower())
        self.assertTrue(BillingAuditEvent.objects.filter(counter=self.counter1, event_type=AuditEventType.HARDWARE_LOCK).exists())

    def test_hardware_terminal_lock_allows_approved_ip(self):
        """Counter with terminal lock active allows shift open from registered IP."""
        reg, _ = CounterHardwareRegistry.objects.get_or_create(
            counter=self.counter1,
            defaults={
                'ip_address': '192.168.1.188',
                'is_terminal_lock_enabled': True
            }
        )
        reg.ip_address = '192.168.1.188'
        reg.is_terminal_lock_enabled = True
        reg.save()

        self.client.force_authenticate(user=self.cashier1)
        resp = self.client.post('/api/v1/billing/shifts/open/', data={
            'counter_code': self.counter1.code,
            'opening_float': 5000,
            'client_ip': '192.168.1.188'
        }, format='json')
        self.assertEqual(resp.status_code, 201, resp.content)
        self.assertTrue(CounterShift.objects.filter(counter=self.counter1, cashier=self.cashier1, status=ShiftStatus.OPEN).exists())

    def test_staff_roster_overlap_prevention(self):
        """Duty roster prevents concurrent shifts on same counter or double-booking cashier."""
        self.client.force_authenticate(user=self.admin)
        roster_date = '2026-10-20'

        # Schedule cashier 1 on counter 1
        resp1 = self.client.post('/api/v1/billing/admin/staff-roster/', data={
            'assignments': [{
                'counter_id': str(self.counter1.id),
                'staff_id': str(self.cashier1.id),
                'roster_date': roster_date,
                'shift_type': StaffShiftType.MORNING
            }]
        }, format='json')
        self.assertEqual(resp1.status_code, 200, resp1.content)

        # Conflict 1: Schedule cashier 2 on counter 1 during the same shift
        resp_conflict1 = self.client.post('/api/v1/billing/admin/staff-roster/', data={
            'assignments': [{
                'counter_id': str(self.counter1.id),
                'staff_id': str(self.cashier2.id),
                'roster_date': roster_date,
                'shift_type': StaffShiftType.MORNING
            }]
        }, format='json')
        self.assertEqual(resp_conflict1.status_code, 400)
        self.assertIn('already scheduled', resp_conflict1.json()['error'].lower())

        # Conflict 2: Schedule cashier 1 on counter 2 during the same shift
        resp_conflict2 = self.client.post('/api/v1/billing/admin/staff-roster/', data={
            'assignments': [{
                'counter_id': str(self.counter2.id),
                'staff_id': str(self.cashier1.id),
                'roster_date': roster_date,
                'shift_type': StaffShiftType.MORNING
            }]
        }, format='json')
        self.assertEqual(resp_conflict2.status_code, 400)
        self.assertIn('already assigned', resp_conflict2.json()['error'].lower())

        # Publish weekly roster
        pub_resp = self.client.post('/api/v1/billing/admin/staff-roster/publish/', data={
            'week_start': '2026-10-19'
        }, format='json')
        self.assertEqual(pub_resp.status_code, 200)
        self.assertTrue(pub_resp.json()['published'])
        self.assertTrue(BillingAuditEvent.objects.filter(event_type=AuditEventType.ROSTER_PUBLISHED).exists())

    def test_admin_overview_metrics(self):
        """Revenue Command executive overview endpoint returns complete metric payload."""
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get('/api/v1/billing/admin/overview/')
        self.assertEqual(resp.status_code, 200)
        d = resp.json()
        self.assertIn('revenue_today', d)
        self.assertEqual(d['daily_budget'], 1550000.0)
        self.assertIn('budget_achievement_pct', d)
        self.assertIn('mtd_revenue', d)
        self.assertIn('active_counters_count', d)
        self.assertIn('drawer_cash_held', d)
        self.assertIn('leakage_at_risk_amount', d)
        self.assertIn('receivables_aging', d)
        self.assertIn('trend_30_days', d)
        self.assertIn('department_revenue', d)
        self.assertIn('sync_center', d)

    def test_policies_and_matrix_crud(self):
        """Admins can retrieve and update policies and approval matrix tiers."""
        self.client.force_authenticate(user=self.admin)

        # Policies
        pol_resp = self.client.get('/api/v1/billing/admin/policies/')
        self.assertEqual(pol_resp.status_code, 200)
        self.assertGreaterEqual(len(pol_resp.json()), 5)

        patch_resp = self.client.patch('/api/v1/billing/admin/policies/RULE_DRAWER_LIMIT/', data={
            'parameter_value': {'drawer_limit': 75000.0}
        }, format='json')
        self.assertEqual(patch_resp.status_code, 200)
        self.assertEqual(patch_resp.json()['parameter_value']['drawer_limit'], 75000.0)
        self.assertTrue(BillingAuditEvent.objects.filter(event_type=AuditEventType.POLICY_CHANGE).exists())

        # Matrix
        mat_resp = self.client.get('/api/v1/billing/admin/approval-matrix/')
        self.assertEqual(mat_resp.status_code, 200)
        self.assertGreaterEqual(len(mat_resp.json()), 24)

        sup_disc = next(t for t in mat_resp.json() if t['tier_level'] == 'SUPERVISOR' and t['action_type'] == 'DISCOUNT')
        put_mat = self.client.put('/api/v1/billing/admin/approval-matrix/', data={
            'tiers': [{'id': sup_disc['id'], 'max_percentage': 22.0}]
        }, format='json')
        self.assertEqual(put_mat.status_code, 200)
        self.assertTrue(BillingAuditEvent.objects.filter(event_type=AuditEventType.MATRIX_CHANGE).exists())


class Phase8TPACorporateTestCase(APITestCase):
    """
    Phase 8: Comprehensive tests for Insurance/TPA claims and Corporate Credit Governance.
    - Cashless claim pre-auth lifecycle tracking & GOP letter recording.
    - Mathematical invariant verification: Insurer Cashless + Patient Co-Pay == Total Bill.
    - Corporate credit limit headroom check & over-limit transaction block.
    - Claim dossier aggregation.
    - Corporate employee voucher verification.
    """
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin_phase8',
            password='Password123!',
            first_name='Ananya',
            last_name='Deshmukh',
            role=RoleType.BILLING_MANAGER,
            is_staff=True
        )
        self.cashier = User.objects.create_user(
            username='cashier_phase8',
            password='Password123!',
            first_name='Pooja',
            last_name='Nair',
            role=RoleType.CASHIER
        )
        self.patient = Patient.objects.create(
            first_name='Rohan',
            last_name='Kapoor',
            gender='MALE',
            date_of_birth='1988-05-15',
            uhid='NH-2026-PH8-001',
            phone_number='9876543210'
        )
        self.payer = CorporateAccount.objects.create(
            name='Star Health Allied Insurance',
            code='star_health_ph8',
            account_type='TPA_INSURANCE',
            credit_limit=Decimal('10000000.00'),
            utilized_credit=Decimal('2500000.00'),
            co_pay_percentage=Decimal('10.00'),
            settlement_tat_days=25,
            contract_reference='STAR-MOU-2026',
            tariff_discount_percent=Decimal('8.00'),
            is_active=True
        )
        self.corporate = CorporateAccount.objects.create(
            name='Infosys Limited',
            code='INF_PH8',
            account_type='CORPORATE',
            credit_limit=Decimal('100000.00'),
            utilized_credit=Decimal('80000.00'),
            co_pay_percentage=Decimal('0.00'),
            settlement_tat_days=30,
            contract_reference='INF-CORP-2026',
            tariff_discount_percent=Decimal('10.00'),
            is_active=True
        )

    def test_copay_split_calculation_engine_math_invariant(self):
        """
        Verify Co-Pay split: Patient Co-Pay = (Admissible * CoPay%) + NonMedical + RoomRentExcess + Shortfall.
        And Insurer Cashless + Patient Co-Pay == Total Bill always.
        """
        split = TPACorporateBillingService.calculate_copay_split(
            total_bill=Decimal('100000.00'),
            approved_gop=Decimal('80000.00'),
            non_medical_deductibles=Decimal('5000.00'),
            room_rent_excess=Decimal('5000.00'),
            copay_percent=Decimal('10.00')
        )
        # Admissible = 100000 - 5000 - 5000 = 90000
        self.assertEqual(split['admissible_amount'], Decimal('90000.00'))
        # 10% co-pay on admissible = 9000
        self.assertEqual(split['copay_amount'], Decimal('9000.00'))
        # Calculated insurer share = 90000 - 9000 = 81000; Approved GOP = 80000 -> capped at 80000
        self.assertEqual(split['insurer_payable'], Decimal('80000.00'))
        self.assertEqual(split['gop_shortfall'], Decimal('1000.00'))
        # Patient co-pay = 9000 (copay) + 5000 (non-med) + 5000 (room excess) + 1000 (shortfall) = 20000
        self.assertEqual(split['patient_copay'], Decimal('20000.00'))
        # Invariant check
        self.assertEqual(split['insurer_payable'] + split['patient_copay'], Decimal('100000.00'))

    def test_copay_split_endpoint(self):
        """API endpoint /api/v1/billing/insurance/calculate-split computes split and returns float JSON."""
        self.client.force_authenticate(user=self.cashier)
        resp = self.client.post('/api/v1/billing/insurance/calculate-split', data={
            'total_bill': 120000,
            'approved_gop': 95000,
            'copay_percent': 10,
            'non_medical_deductibles': 8000,
            'room_rent_excess': 4000
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data['total_bill'], 120000.0)
        self.assertEqual(data['insurer_payable'] + data['patient_copay'], 120000.0)

    def test_corporate_credit_limit_check_and_block(self):
        """
        Corporate credit headroom is checked; exceeding the credit limit raises
        CorporateCreditLimitExceeded and logs a CREDIT_CAP_BLOCKED audit event.
        """
        # Limit is 100,000, used is 80,000 -> headroom is 20,000
        avail = TPACorporateBillingService.check_corporate_credit_availability(self.corporate, Decimal('15000.00'))
        self.assertTrue(avail['allowed'])
        self.assertEqual(avail['available_credit'], 20000.0)

        # Request exceeding headroom (25,000 > 20,000)
        with self.assertRaises(CorporateCreditLimitExceeded):
            TPACorporateBillingService.check_corporate_credit_availability(self.corporate, Decimal('25000.00'), raise_exception=True)

        # Confirm audit event was recorded
        self.assertTrue(BillingAuditEvent.objects.filter(event_type=AuditEventType.CREDIT_CAP_BLOCKED).exists())

    def test_corporate_credit_charge_commit(self):
        """Recording corporate credit atomically commits the charge and increases utilized credit."""
        inv = Invoice.objects.create(
            patient=self.patient,
            category=InvoiceCategory.OPD,
            total=Decimal('5000.00'),
            paid=Decimal('0.00'),
            balance=Decimal('5000.00'),
            status=InvoiceStatus.DRAFT
        )
        TPACorporateBillingService.record_corporate_credit_charge(
            corporate_account_id=self.corporate,
            amount=Decimal('5000.00'),
            reference=str(inv.id),
            user=self.admin
        )
        self.corporate.refresh_from_db()
        self.assertEqual(self.corporate.utilized_credit, Decimal('85000.00'))
        self.assertEqual(self.corporate.available_credit, Decimal('15000.00'))

    def test_pre_auth_registration_and_update_lifecycle(self):
        """Registering pre-auth generates CLM reference, and updating records GOP approval and logs audit event."""
        claim = TPACorporateBillingService.register_pre_auth(
            patient=self.patient,
            corporate_account=self.payer,
            requested_amount=Decimal('75000.00'),
            policy_number='POL-STAR-778899',
            tpa_member_id='TPA-MEM-001',
            copay_percent=Decimal('10.00'),
            created_by=self.cashier
        )
        self.assertTrue(claim.claim_number.startswith('CLM-'))
        self.assertEqual(claim.pre_auth_status, PreAuthStatus.PENDING)

        # Update with GOP approval
        updated = TPACorporateBillingService.update_pre_auth(
            claim_record=claim,
            status=PreAuthStatus.APPROVED,
            approved_amount=Decimal('65000.00'),
            gop_letter_number='GOP-2026-STAR-01',
            updated_by=self.admin,
            note='Initial cashless GOP issued'
        )
        self.assertEqual(updated.pre_auth_status, PreAuthStatus.APPROVED)
        self.assertEqual(updated.pre_auth_amount, Decimal('65000.00'))
        self.assertEqual(updated.gop_letter_number, 'GOP-2026-STAR-01')
        self.assertEqual(len(updated.tracking_notes), 2)
        self.assertTrue(BillingAuditEvent.objects.filter(event_type=AuditEventType.GOP_APPROVED).exists())

    def test_claim_dossier_compilation(self):
        """Claim dossier compiles bills, charges, and pre-auth into itemized packet."""
        claim = TPACorporateBillingService.register_pre_auth(
            patient=self.patient,
            corporate_account=self.payer,
            requested_amount=Decimal('50000.00'),
            created_by=self.cashier
        )
        # Stage a charge item for patient
        BillableChargeItem.objects.create(
            patient=self.patient,
            department='IPD',
            service_code='IPD-BED-DELUXE',
            service_name='Deluxe Room Accommodation',
            unit_price=Decimal('5000.00'),
            quantity=2,
            total_amount=Decimal('10000.00'),
            status=ChargeItemStatus.PENDING
        )
        dossier = TPACorporateBillingService.compile_claim_dossier(claim)
        self.assertEqual(dossier['claim_number'], claim.claim_number)
        self.assertEqual(dossier['patient_uhid'], self.patient.uhid)
        self.assertGreaterEqual(len(dossier['charges']), 1)
        self.assertEqual(dossier['charges'][0]['code'], 'IPD-BED-DELUXE')

    def test_corporate_voucher_issuance_and_verification(self):
        """Corporate vouchers can be issued and verified for billing validity."""
        valid_until = (timezone.now() + timedelta(days=30)).date()
        voucher = TPACorporateBillingService.issue_corporate_voucher(
            corporate_account=self.corporate,
            employee_id='EMP-INF-9901',
            employee_name='Sunil Verma',
            patient=self.patient,
            approved_credit_ceiling=Decimal('15000.00'),
            validity_date=valid_until,
            relationship='SELF',
            issued_by=self.admin
        )
        self.assertTrue(voucher.voucher_number.startswith('CORP-VOUCH-'))

        # Verify voucher via API endpoint
        self.client.force_authenticate(user=self.cashier)
        verify_resp = self.client.post('/api/v1/billing/corporate/vouchers/verify', data={
            'voucher_number': voucher.voucher_number
        }, format='json')
        self.assertEqual(verify_resp.status_code, 200)
        vdata = verify_resp.json()
        self.assertTrue(vdata['is_valid'])
        self.assertEqual(vdata['voucher']['employee_name'], 'Sunil Verma')

        # Over-limit voucher verification test
        # Headroom is 20,000; check amount of 25,000 -> invalid
        verify_over = self.client.post('/api/v1/billing/corporate/vouchers/verify', data={
            'voucher_number': voucher.voucher_number,
            'amount': 25000
        }, format='json')
        self.assertEqual(verify_over.status_code, 200)
        self.assertFalse(verify_over.json()['is_valid'])
        self.assertIn('ceiling', verify_over.json()['reason'].lower())

    def test_insurance_and_corporate_overview_apis(self):
        """Overview endpoints return summary KPIs and lists for Admin and Cashier."""
        self.client.force_authenticate(user=self.admin)
        ins_resp = self.client.get('/api/v1/billing/insurance/claims')
        self.assertEqual(ins_resp.status_code, 200)
        self.assertIn('claims', ins_resp.json())
        self.assertIn('pending_count', ins_resp.json())

        corp_resp = self.client.get('/api/v1/billing/corporate/accounts')
        self.assertEqual(corp_resp.status_code, 200)
        self.assertIn('total_corporate_accounts', corp_resp.json())
        self.assertIn('accounts', corp_resp.json())


# =====================================================================
# PHASE 9: IPD BILLING & DISCHARGE CLEARANCE TEST SUITE
# =====================================================================

class Phase9IPDBillingTestCase(APITestCase):
    """Verifies Phase 9 IPD running charges, midnight bed accrual cron,
    interim deposit demands, final bill consolidation, and the
    mandatory zero-balance Financial Discharge Clearance Gate invariant.
    """

    def setUp(self):
        self.patient = Patient.objects.create(
            first_name='Anand',
            last_name='Deshmukh',
            uhid='NH-IPD-9901',
            date_of_birth='1980-05-15',
            gender='M',
            phone_number='9822099999'
        )

        self.doctor_user = User.objects.create_user(
            username='dr.menon.ipd', password='password123',
            role=RoleType.DOCTOR, first_name='Anil', last_name='Menon'
        )
        self.doctor_profile = DoctorProfile.objects.create(
            user=self.doctor_user, license_number='MCI-9901', department='General Medicine'
        )

        self.cashier = User.objects.create_user(
            username='cashier.ipd', password='password123',
            role=RoleType.CASHIER, first_name='Suresh', last_name='Patil'
        )
        self.supervisor = User.objects.create_user(
            username='supervisor.ipd', password='password123',
            role=RoleType.BILLING_SUPERVISOR, first_name='Vikramaditya', last_name='Rao'
        )
        self.admin = User.objects.create_user(
            username='admin.ipd', password='password123',
            role=RoleType.BILLING_ADMIN, first_name='Meenakshi', last_name='Sundaram'
        )
        self.security_guard = User.objects.create_user(
            username='security.gate', password='password123',
            role=RoleType.NURSE, first_name='Ward', last_name='Nurse'
        )

        self.bed = Bed.objects.create(
            bed_number='GW-101',
            bed_type='GENERAL',
            daily_tariff=Decimal('1500.00')
        )

        self.admission = InpatientAdmission.objects.create(
            admission_number='IP-26-0099',
            patient=self.patient,
            bed=self.bed,
            ward_name='General Ward - GW-101',
            admitting_doctor=self.doctor_profile,
            status='ADMITTED'
        )

        self.deposit = PatientDeposit.objects.create(
            deposit_number='DEP-2610-0099',
            patient=self.patient,
            ipd_admission=self.admission,
            deposit_amount=Decimal('25000.00'),
            available_balance=Decimal('25000.00'),
            tender_mode=TenderMode.CASH,
            status=DepositStatus.ACTIVE
        )

    def test_midnight_bed_accrual_cron_and_idempotency(self):
        """Midnight cron accrues BED_TARIFF, NURSING_CARE, and RESIDENT_ROUNDS for all admitted patients.
        Rerunning for the same target date does not create duplicates.
        """
        target_d = '2026-10-08'
        res1 = IPDRunningLedgerService.accrue_daily_bed_tariffs(target_date=target_d, user=self.admin)
        self.assertGreaterEqual(res1['admissions_processed'], 1)
        self.assertGreaterEqual(res1['total_accrued_entries'], 3)

        entries = IPDRunningLedger.objects.filter(admission=self.admission, date=target_d)
        self.assertEqual(entries.count(), 3)

        types = set(entries.values_list('item_type', flat=True))
        self.assertIn(IPDRunningLedgerItemType.BED_TARIFF, types)
        self.assertIn(IPDRunningLedgerItemType.NURSING_CARE, types)
        self.assertIn(IPDRunningLedgerItemType.RESIDENT_ROUNDS, types)

        bed_entry = entries.get(item_type=IPDRunningLedgerItemType.BED_TARIFF)
        self.assertEqual(bed_entry.amount, Decimal('1500.00'))

        nursing_entry = entries.get(item_type=IPDRunningLedgerItemType.NURSING_CARE)
        self.assertEqual(nursing_entry.amount, Decimal('500.00'))

        rounds_entry = entries.get(item_type=IPDRunningLedgerItemType.RESIDENT_ROUNDS)
        self.assertEqual(rounds_entry.amount, Decimal('600.00'))

        # Idempotency check: run again for same date
        res2 = IPDRunningLedgerService.accrue_daily_bed_tariffs(target_date=target_d, user=self.admin)
        self.assertEqual(res2['total_accrued_entries'], 0)
        self.assertGreaterEqual(res2['admissions_skipped'], 1)
        self.assertEqual(IPDRunningLedger.objects.filter(admission=self.admission, date=target_d).count(), 3)

        # Audit event created
        self.assertTrue(BillingAuditEvent.objects.filter(event_type=AuditEventType.DAILY_TARIFF_ACCRUED).exists())

    def test_running_bill_summary_and_deposit_utilization_meter(self):
        """Running bill calculates itemized splits, compares against deposits, and triggers 80% threshold flag."""
        # Day 1 charges (Bed 1500 + Nursing 500 + Doctor 600 = 2600)
        IPDRunningLedgerService.accrue_daily_bed_tariffs(target_date='2026-10-01')
        summary = IPDRunningLedgerService.get_running_bill_summary(self.admission.id)

        self.assertEqual(summary['ledger_total'], Decimal('2600.00'))
        self.assertEqual(summary['total_deposit_balance'], Decimal('25000.00'))
        self.assertEqual(summary['utilization_percent'], 10.4)
        self.assertFalse(summary['is_over_threshold'])
        self.assertEqual(summary['net_balance'], Decimal('-22400.00'))  # excess deposit

        # Add major OT procedure to exceed 80% threshold
        IPDRunningLedgerService.add_running_charge(
            admission_id_or_number=self.admission.id,
            item_type='OT_PROCEDURE',
            description='Laparoscopic Cholecystectomy',
            amount=Decimal('20000.00'),
            service_code='SURG-LAP-01'
        )

        summary2 = IPDRunningLedgerService.get_running_bill_summary(self.admission.id)
        self.assertEqual(summary2['ledger_total'], Decimal('22600.00'))
        self.assertEqual(summary2['utilization_percent'], 90.4)
        self.assertTrue(summary2['is_over_threshold'])  # > 80%

    def test_interim_deposit_demand_issuance(self):
        """When ledger exceeds deposit buffer, cashier issues an interim demand notice."""
        # Accrue enough to trigger threshold
        IPDRunningLedgerService.add_running_charge(
            admission_id_or_number=self.admission.id,
            item_type='OT_PROCEDURE',
            description='Emergency Surgery',
            amount=Decimal('22000.00')
        )

        demand = IPDRunningLedgerService.issue_interim_demand(
            admission_id_or_number=self.admission.id,
            demanded_amount=Decimal('10000.00'),
            notes='High utilization alert for patient attendant',
            user=self.cashier
        )

        self.assertTrue(demand.demand_number.startswith('DM-'))
        self.assertEqual(demand.status, InterimDemandStatus.PENDING)
        self.assertEqual(demand.demanded_amount, Decimal('10000.00'))
        self.assertEqual(demand.running_total, Decimal('22000.00'))

        # Check audit event
        self.assertTrue(BillingAuditEvent.objects.filter(
            event_type=AuditEventType.INTERIM_DEMAND_ISSUED,
            reference=demand.demand_number
        ).exists())

    def test_discharge_clearance_gate_hard_invariant_blocked_on_positive_balance(self):
        """Discharge Clearance Gate strictly blocks issuance if patient has an outstanding balance (> ₹0.00)."""
        # Post ₹30,000 charges against ₹25,000 deposit -> net balance = ₹5,000.00
        IPDRunningLedgerService.add_running_charge(
            admission_id_or_number=self.admission.id,
            item_type='OT_PROCEDURE',
            description='Complex Procedure',
            amount=Decimal('30000.00')
        )

        # Attempting clearance without override MUST raise ValueError
        with self.assertRaises(ValueError) as ctx:
            IPDRunningLedgerService.issue_financial_discharge_clearance(
                admission_id_or_number=self.admission.id,
                cashier=self.cashier
            )

        self.assertIn('Financial Discharge Clearance Gate BLOCKED', str(ctx.exception))
        self.assertIn('5,000.00', str(ctx.exception))

        # API endpoint returns 400 with gate_blocked: True
        self.client.force_authenticate(user=self.cashier)
        resp = self.client.post('/api/v1/billing/ipd/discharge-clearance/issue', data={
            'admission': str(self.admission.id)
        }, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertTrue(resp.json().get('gate_blocked'))

    def test_discharge_clearance_gate_supervisor_override(self):
        """Supervisor may override positive balance with mandatory audited justification reason."""
        IPDRunningLedgerService.add_running_charge(
            admission_id_or_number=self.admission.id,
            item_type='OT_PROCEDURE',
            description='Procedure',
            amount=Decimal('28000.00')  # Balance = ₹3,000
        )

        clearance = IPDRunningLedgerService.issue_financial_discharge_clearance(
            admission_id_or_number=self.admission.id,
            cashier=self.supervisor,
            override_reason='Charity discharge approved by Medical Superintendent'
        )

        self.assertEqual(clearance.clearance_status, DischargeClearanceStatus.OVERRIDDEN)
        self.assertTrue(clearance.qr_verification_token.startswith('FDP-'))
        self.assertEqual(clearance.override_reason, 'Charity discharge approved by Medical Superintendent')

        # Security gate allows exit on OVERRIDDEN pass
        v_res = IPDRunningLedgerService.verify_discharge_clearance_token(clearance.qr_verification_token)
        self.assertTrue(v_res['is_valid'])
        self.assertTrue(v_res['is_override'])
        self.assertEqual(v_res['clearance_status'], 'OVERRIDDEN')

    def test_discharge_clearance_gate_zero_balance_settlement_success(self):
        """When balance is exactly ₹0.00 or fully settled, clearance pass is generated immediately."""
        # Charges = ₹20,000, Deposit = ₹25,000 -> Balance <= 0 (excess deposit)
        IPDRunningLedgerService.add_running_charge(
            admission_id_or_number=self.admission.id,
            item_type='OT_PROCEDURE',
            description='Bedside Procedure',
            amount=Decimal('20000.00')
        )

        clearance = IPDRunningLedgerService.issue_financial_discharge_clearance(
            admission_id_or_number=self.admission.id,
            cashier=self.cashier
        )

        self.assertEqual(clearance.clearance_status, DischargeClearanceStatus.CLEARED)
        self.assertTrue(clearance.qr_verification_token.startswith('FDP-'))
        self.assertIsNotNone(clearance.cleared_at)

        # Audit event created
        self.assertTrue(BillingAuditEvent.objects.filter(
            event_type=AuditEventType.DISCHARGE_CLEARED,
            reference=clearance.qr_verification_token
        ).exists())

    def test_security_gate_verification_endpoint(self):
        """Security Guard verifies QR token at exit: valid pass passes; fake/invalid pass fails."""
        # Create cleared pass
        IPDRunningLedgerService.add_running_charge(
            admission_id_or_number=self.admission.id,
            item_type='OT_PROCEDURE',
            description='Minor Dressing',
            amount=Decimal('2000.00')
        )
        clearance = IPDRunningLedgerService.issue_financial_discharge_clearance(
            admission_id_or_number=self.admission.id,
            cashier=self.cashier
        )

        self.client.force_authenticate(user=self.security_guard)

        # 1. Valid token check
        valid_resp = self.client.get(f"/api/v1/billing/ipd/discharge-clearance/{clearance.qr_verification_token}/verify")
        self.assertEqual(valid_resp.status_code, 200)
        v_data = valid_resp.json()
        self.assertTrue(v_data['is_valid'])
        self.assertEqual(v_data['admission_number'], 'IP-26-0099')
        self.assertEqual(v_data['patient_name'], 'Anand Deshmukh')
        self.assertEqual(v_data['bed_number'], 'GW-101')

        # 2. Fake / non-existent token check
        fake_resp = self.client.get("/api/v1/billing/ipd/discharge-clearance/FDP-FAKE-99999/verify")
        self.assertEqual(fake_resp.status_code, 400)
        self.assertFalse(fake_resp.json()['is_valid'])
        self.assertIn('prohibited', fake_resp.json()['message'].lower())

    def test_ipd_admissions_overview_and_consolidation_apis(self):
        """API endpoints for E-04 IPD Running Bills view and Final Bill consolidation."""
        self.client.force_authenticate(user=self.cashier)

        # 1. Overview API
        overview_resp = self.client.get('/api/v1/billing/ipd/admissions')
        self.assertEqual(overview_resp.status_code, 200)
        ov = overview_resp.json()
        self.assertIn('kpis', ov)
        self.assertIn('admissions', ov)
        self.assertGreaterEqual(ov['kpis']['admitted'], 1)

        # 2. Running Bill Detail API
        detail_resp = self.client.get(f"/api/v1/billing/ipd/admissions/{self.admission.id}/running-bill")
        self.assertEqual(detail_resp.status_code, 200)
        det = detail_resp.json()
        self.assertEqual(det['admission_number'], 'IP-26-0099')
        self.assertIn('checklist', det)

        # 3. Checklist toggle API
        chk_resp = self.client.post(f"/api/v1/billing/ipd/admissions/{self.admission.id}/checklist", data={
            'checklist': {'pending_labs': True, 'pharmacy_returns': True}
        }, format='json')
        self.assertEqual(chk_resp.status_code, 200)
        self.assertTrue(chk_resp.json()['checklist']['pending_labs'])

        # 4. Final Bill Consolidation API
        IPDRunningLedgerService.add_running_charge(
            admission_id_or_number=self.admission.id,
            item_type='OT_PROCEDURE',
            description='Consolidated Procedure',
            amount=Decimal('12000.00')
        )
        cons_resp = self.client.post('/api/v1/billing/ipd/final-bill/consolidate', data={
            'admission': str(self.admission.id),
            'discount_percent': 5
        }, format='json')
        self.assertEqual(cons_resp.status_code, 200)
        cdata = cons_resp.json()
        self.assertIn('invoice_number', cdata)
        self.assertEqual(Decimal(str(cdata['gross_amount'])), Decimal('12000.00'))
        self.assertEqual(Decimal(str(cdata['discount_amount'])), Decimal('600.00'))
        self.assertEqual(Decimal(str(cdata['deposit_applied'])), Decimal('11400.00'))


class Phase10RevenueIntegrityTestCase(APITestCase):
    """Phase 10: Revenue Integrity, Leakage Detection, Behavioral Risk Signals, and Investigations."""

    def setUp(self):
        self.admin_user = User.objects.create_user(
            username='admin_integrity', role=RoleType.BILLING_ADMIN, password='pass'
        )
        self.cashier = User.objects.create_user(
            username='cashier_risk', role=RoleType.CASHIER, password='pass'
        )
        self.patient = Patient.objects.create(
            first_name='Ananya', last_name='Roy', uhid='UHID-REV-001',
            date_of_birth='1990-05-15', gender='FEMALE'
        )
        self.doctor = DoctorProfile.objects.create(
            user=User.objects.create_user(username='dr_int', role=RoleType.DOCTOR),
            license_number='DOC-INT-01', department='Internal Medicine'
        )
        self.bed = Bed.objects.create(
            bed_number='B-01', bed_type='GENERAL', daily_tariff=Decimal('1500.00')
        )
        self.admission = InpatientAdmission.objects.create(
            admission_number='IP-REV-0001', patient=self.patient,
            admitting_doctor=self.doctor, ward_name='General Ward', bed=self.bed,
            status='DISCHARGED', discharge_date=timezone.now() - timedelta(hours=3)
        )
        self.client.force_authenticate(user=self.admin_user)

    def test_leakage_scanner_detects_unbilled_orders_and_discharged_patients(self):
        """Scanner flags unbilled charge items > 24 hours and medically discharged patients without clearance."""
        old_charge = BillableChargeItem.objects.create(
            patient=self.patient,
            department='LAB',
            service_code='CBC-01',
            service_name='Complete Blood Count',
            unit_price=Decimal('550.00'),
            total_amount=Decimal('550.00'),
            status=ChargeItemStatus.PENDING
        )
        # Backdate charge creation
        BillableChargeItem.objects.filter(id=old_charge.id).update(
            created_at=timezone.now() - timedelta(hours=26)
        )

        res = RevenueIntegrityScannerService.scan_revenue_leakage()
        self.assertGreaterEqual(res['new_alerts_count'], 2)

        # Verify alerts created
        alert_charge = RevenueLeakageAlert.objects.filter(
            leakage_type=RevenueLeakageType.UNBILLED_ORDER_24H,
            source_event_reference=str(old_charge.id)
        ).first()
        self.assertIsNotNone(alert_charge)
        self.assertEqual(alert_charge.estimated_amount, Decimal('550.00'))
        self.assertEqual(alert_charge.department, 'LAB')

        alert_disch = RevenueLeakageAlert.objects.filter(
            leakage_type=RevenueLeakageType.DISCHARGED_NOT_BILLED,
            source_event_reference=self.admission.admission_number
        ).first()
        self.assertIsNotNone(alert_disch)
        self.assertEqual(alert_disch.department, 'IPD')

        # Verify audit trail
        self.assertTrue(
            BillingAuditEvent.objects.filter(event_type=AuditEventType.REVENUE_LEAKAGE).exists()
        )

    def test_fraud_risk_signal_detector_three_refunds(self):
        """Anomaly detector flags HIGH severity signal when a cashier executes 3+ refunds in 24 hours."""
        inv = Invoice.objects.create(
            invoice_number='INV-RISK-001',
            patient=self.patient,
            subtotal=Decimal('3000.00'),
            total=Decimal('3000.00'),
            paid=Decimal('3000.00'),
            balance=Decimal('0.00'),
            status=InvoiceStatus.PAID
        )
        for i in range(3):
            RefundRequest.objects.create(
                refund_number=f"REF-RISK-{i+1}",
                invoice=inv,
                patient=self.patient,
                requested_amount=Decimal('1000.00'),
                reason=f"Patient cancelled test {i+1}",
                initiated_by=self.cashier,
                status=RefundStatus.PENDING
            )

        res = RevenueIntegrityScannerService.scan_fraud_risk_signals()
        self.assertGreaterEqual(res['new_signals_count'], 1)

        sig = FraudRiskSignal.objects.filter(
            signal_code='MULTIPLE_REFUNDS_SAME_SHIFT',
            target_user=self.cashier
        ).first()
        self.assertIsNotNone(sig)
        self.assertEqual(sig.severity, FraudRiskSignalSeverity.HIGH)
        self.assertEqual(sig.occurrences_count, 3)

        self.assertTrue(
            BillingAuditEvent.objects.filter(event_type=AuditEventType.FRAUD_SIGNAL).exists()
        )

    def test_convert_leakage_to_billable_charge(self):
        """Converting verified leakage creates live BillableChargeItem in pending queue."""
        alert = RevenueLeakageAlert.objects.create(
            leakage_type=RevenueLeakageType.UNBILLED_ORDER_24H,
            department='RADIOLOGY',
            patient=self.patient,
            estimated_amount=Decimal('2400.00'),
            risk_score=70,
            status=RevenueLeakageStatus.OPEN,
            source_event_reference='XRAY-CHEST-99'
        )

        updated = RevenueIntegrityScannerService.convert_leakage_to_charge(alert.id, self.admin_user)
        self.assertEqual(updated.status, RevenueLeakageStatus.CONVERTED_TO_CHARGE)
        self.assertIsNotNone(updated.converted_charge)
        self.assertEqual(updated.converted_charge.total_amount, Decimal('2400.00'))
        self.assertEqual(updated.converted_charge.department, 'RADIOLOGY')
        self.assertEqual(updated.converted_charge.priority, 'URGENT')
        self.assertEqual(updated.converted_charge.status, ChargeItemStatus.PENDING)

        # Audit log verification
        self.assertTrue(
            BillingAuditEvent.objects.filter(event_type=AuditEventType.LEAKAGE_RECOVERED).exists()
        )

        # Second conversion should fail
        with self.assertRaises(ValueError):
            RevenueIntegrityScannerService.convert_leakage_to_charge(alert.id, self.admin_user)

    def test_dismiss_leakage_false_positive_requires_reason(self):
        """Dismissal without minimum 5 chars reason is blocked; succeeds with valid audit trail."""
        alert = RevenueLeakageAlert.objects.create(
            leakage_type=RevenueLeakageType.UNBILLED_ORDER_24H,
            department='LAB',
            patient=self.patient,
            estimated_amount=Decimal('800.00'),
            status=RevenueLeakageStatus.OPEN
        )

        # Empty reason blocked
        with self.assertRaises(ValueError):
            RevenueIntegrityScannerService.dismiss_leakage_alert(alert.id, 'bad', self.admin_user)

        # Valid dismissal
        dismissed = RevenueIntegrityScannerService.dismiss_leakage_alert(
            alert.id, 'Duplicate sample order cancelled by doctor', self.admin_user
        )
        self.assertEqual(dismissed.status, RevenueLeakageStatus.FALSE_POSITIVE)
        self.assertIn('Duplicate sample order', dismissed.dismissal_reason)

        self.assertTrue(
            BillingAuditEvent.objects.filter(event_type=AuditEventType.LEAKAGE_DISMISSED).exists()
        )

    def test_investigation_docket_lifecycle_and_recovered_amount(self):
        """Opens investigation docket with INV-CASE-YYYYMM-XXXXX, logs findings, and updates recovered funds."""
        alert = RevenueLeakageAlert.objects.create(
            leakage_type=RevenueLeakageType.DISCHARGED_NOT_BILLED,
            department='IPD',
            patient=self.patient,
            estimated_amount=Decimal('15000.00'),
            status=RevenueLeakageStatus.OPEN
        )

        case = RevenueIntegrityScannerService.open_investigation_case(
            actor=self.admin_user,
            subject='Unbilled Bed Charges for Ananya Roy',
            leakage_alert_id=str(alert.id),
            initial_findings='Ward nurse dispatched patient without financial clearance stamp.'
        )
        self.assertTrue(case.case_number.startswith('INV-CASE-'))
        self.assertEqual(case.status, RevenueInvestigationStatus.OPEN)

        # Alert status should become INVESTIGATING
        alert.refresh_from_db()
        self.assertEqual(alert.status, RevenueLeakageStatus.INVESTIGATING)

        # Update and resolve docket
        resolved = RevenueIntegrityScannerService.update_investigation_case(
            case_id=str(case.id),
            actor=self.admin_user,
            status=RevenueInvestigationStatus.RESOLVED,
            findings='Attendant summoned; settled outstanding bill via UPI.',
            recovered_amount=Decimal('15000.00')
        )
        self.assertEqual(resolved.status, RevenueInvestigationStatus.RESOLVED)
        self.assertEqual(resolved.recovered_amount, Decimal('15000.00'))

        self.assertTrue(
            BillingAuditEvent.objects.filter(event_type=AuditEventType.INVESTIGATION_EVENT).exists()
        )

    def test_acknowledge_risk_signal(self):
        """Risk signals can be formally acknowledged by supervisor/admin."""
        signal = FraudRiskSignal.objects.create(
            signal_code='EXCESSIVE_VOIDS_PEER_RATIO',
            target_user=self.cashier,
            severity=FraudRiskSignalSeverity.HIGH,
            description='Cashier void ratio is 3.5x peer average.'
        )
        self.assertFalse(signal.is_acknowledged)

        ack = RevenueIntegrityScannerService.acknowledge_risk_signal(signal.id, self.admin_user)
        self.assertTrue(ack.is_acknowledged)
        self.assertEqual(ack.acknowledged_by, self.admin_user)

    def test_revenue_integrity_overview_kpis(self):
        """Overview KPIs accurately aggregate amount at risk and recovered MTD."""
        RevenueLeakageAlert.objects.create(
            leakage_type=RevenueLeakageType.UNBILLED_ORDER_24H,
            department='LAB',
            patient=self.patient,
            estimated_amount=Decimal('5000.00'),
            status=RevenueLeakageStatus.OPEN
        )
        RevenueLeakageAlert.objects.create(
            leakage_type=RevenueLeakageType.MISSED_BED_DAY,
            department='IPD',
            patient=self.patient,
            estimated_amount=Decimal('3500.00'),
            status=RevenueLeakageStatus.CONVERTED_TO_CHARGE
        )

        data = RevenueIntegrityScannerService.get_revenue_integrity_overview()
        self.assertIn('kpis', data)
        self.assertEqual(data['kpis']['amount_at_risk'], 5000.0)
        self.assertGreaterEqual(data['kpis']['open_leakage_items'], 1)
        self.assertEqual(data['kpis']['recovered_mtd'], 3500.0)

    def test_revenue_integrity_api_endpoints(self):
        """End-to-end REST API verification for A-03 Revenue Integrity endpoints."""
        alert = RevenueLeakageAlert.objects.create(
            leakage_type=RevenueLeakageType.UNBILLED_ORDER_24H,
            department='PHARMACY',
            patient=self.patient,
            estimated_amount=Decimal('1200.00'),
            status=RevenueLeakageStatus.OPEN
        )

        # 1. Overview API
        resp = self.client.get('/api/v1/billing/integrity/overview')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('kpis', resp.json())

        # 2. Leakage list API
        resp = self.client.get('/api/v1/billing/integrity/leakages')
        self.assertEqual(resp.status_code, 200)
        self.assertGreaterEqual(len(resp.json()), 1)

        # 3. Leakage scan API
        resp = self.client.post('/api/v1/billing/integrity/leakages/scan')
        self.assertEqual(resp.status_code, 200)

        # 4. Convert charge API
        resp = self.client.post(f'/api/v1/billing/integrity/leakages/{alert.id}/convert-charge')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()['status'], 'CONVERTED_TO_CHARGE')

        # 5. Dismiss API with fresh alert
        alert2 = RevenueLeakageAlert.objects.create(
            leakage_type=RevenueLeakageType.UNBILLED_ORDER_24H,
            department='LAB',
            patient=self.patient,
            estimated_amount=Decimal('400.00'),
            status=RevenueLeakageStatus.OPEN
        )
        resp = self.client.post(f'/api/v1/billing/integrity/leakages/{alert2.id}/dismiss', data={
            'reason': 'Cancelled requisition confirmed with lab supervisor'
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()['status'], 'FALSE_POSITIVE')

        # 6. Risk signals list API
        resp = self.client.get('/api/v1/billing/integrity/risk-signals')
        self.assertEqual(resp.status_code, 200)

        # 7. Investigations create and list API
        resp = self.client.post('/api/v1/billing/integrity/investigations', data={
            'subject': 'Pharmacy Medication Dispense Reconciliation',
            'leakage_alert_id': str(alert.id),
            'initial_findings': 'Preliminary inventory discrepancy noted.'
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        case_id = resp.json()['id']

        resp = self.client.get('/api/v1/billing/integrity/investigations')
        self.assertEqual(resp.status_code, 200)

        # 8. Investigation detail & update API
        resp = self.client.get(f'/api/v1/billing/integrity/investigations/{case_id}')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()['subject'], 'Pharmacy Medication Dispense Reconciliation')

        resp = self.client.post(f'/api/v1/billing/integrity/investigations/{case_id}/update', data={
            'status': 'RESOLVED',
            'recovered_amount': '1200.00',
            'findings': 'Discrepancy recovered through staff collection.'
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()['status'], 'RESOLVED')
        self.assertEqual(resp.json()['recovered_amount'], '1200.00')


class Phase11ReportsPeriodCloseAuditTestCase(APITestCase):
    """Phase 11: period locks, GST accuracy, AR aging, journal, snapshots, tamper-evident audit log, role scopes."""

    def setUp(self):
        mk = lambda u, r: User.objects.create_user(username=u, password='Password123!', role=r, first_name=u.split('_')[1].title(), last_name='P11')
        self.cashier = mk('p11_cashier', RoleType.CASHIER)
        self.supervisor = mk('p11_sup', RoleType.BILLING_SUPERVISOR)
        self.manager = mk('p11_mgr', RoleType.BILLING_MANAGER)
        self.admin = mk('p11_admin', RoleType.BILLING_ADMIN)
        self.cfo = mk('p11_cfo', RoleType.FINANCE_MANAGER)
        self.auditor = mk('p11_audit', RoleType.INTERNAL_AUDITOR)
        self.patient = Patient.objects.create(first_name='Ravi', last_name='Kumar', gender='MALE', date_of_birth='1970-01-01',
                                              uhid='NH-P11-01', phone_number='9000001101')
        self.today = timezone.localdate()
        self.yesterday = self.today - timedelta(days=1)
        self.seq = 0

    def _invoice(self, day, lines, status=InvoiceStatus.PAID, discount='0.00', **extra):
        """lines: [(department, unit_price, qty, tax_rate)]"""
        self.seq += 1
        subtotal = sum(Decimal(str(u)) * q for _, u, q, _ in lines)
        taxes = [(Decimal(str(u)) * q * Decimal(str(r)) / 100).quantize(Decimal('0.01')) for _, u, q, r in lines]
        tax = sum(taxes, Decimal('0.00'))
        total = subtotal - Decimal(discount) + tax
        inv = Invoice.objects.create(
            invoice_number=f'INV-P11-{self.seq:04d}', patient=self.patient, category=lines[0][0], date=day.isoformat(),
            subtotal=subtotal, discount=Decimal(discount), tax=tax, total=total,
            paid=total if status == InvoiceStatus.PAID else Decimal('0.00'),
            balance=Decimal('0.00') if status == InvoiceStatus.PAID else total, status=status, **extra)
        for (dept, u, q, r), t in zip(lines, taxes):
            InvoiceItem.objects.create(invoice=inv, department=dept, description=f'{dept} line', qty=q, unit_price=Decimal(str(u)),
                                       tax_rate=Decimal(str(r)), tax_amount=t, total=Decimal(str(u)) * q + t)
        return inv

    def _get(self, user, url):
        self.client.force_authenticate(user=user)
        return self.client.get(url)

    # ---------- period lock guard ----------
    def test_period_lock_guard_refuses_entries_with_403(self):
        FinancialPeriodLock.objects.create(period_name='today', period_type='DAILY', start_date=self.today, end_date=self.today, status='LOCKED')
        counter = BillingCounter.objects.create(code='CNT-P11', name='Counter P11')
        CounterShift.objects.create(counter=counter, cashier=self.cashier, opening_float=Decimal('5000.00'), status=ShiftStatus.OPEN)
        charge = BillableChargeItem.objects.create(patient=self.patient, department='OPD', service_code='OPD-CONS', service_name='Consult',
                                                   unit_price=Decimal('500.00'), quantity=1, total_amount=Decimal('500.00'))
        self.client.force_authenticate(user=self.cashier)
        resp = self.client.post('/api/v1/billing/cashier/bill-and-collect/', data={
            'patient': self.patient.uhid, 'charge_ids': [str(charge.id)], 'split_payments': [{'tender_mode': 'CASH', 'amount': 500}]}, format='json')
        self.assertEqual(resp.status_code, 403, resp.content)
        self.assertEqual(resp.json()['error'], 'Financial Period Locked')
        charge.refresh_from_db()
        self.assertEqual(charge.status, ChargeItemStatus.PENDING)  # nothing half-posted
        self.assertFalse(Invoice.objects.filter(patient=self.patient).exists())
        self.assertTrue(BillingAuditEvent.objects.filter(event_type='PERIOD_LOCK_DENIED', actor=self.cashier).exists())

    def test_closed_day_freezes_ledger_but_allows_current_period_payments(self):
        inv = self._invoice(self.yesterday, [('OPD', '1000.00', 1, 0)], status=InvoiceStatus.UNPAID)
        old_pay = Payment.objects.create(invoice=inv, patient=self.patient, payment_number='PAY-P11-OLD', amount=Decimal('100.00'))
        Payment.objects.filter(pk=old_pay.pk).update(payment_date=timezone.now() - timedelta(days=1))
        self.client.force_authenticate(user=self.manager)
        closed = self.client.post('/api/v1/billing/period-close/', data={'period_type': 'DAILY', 'date': self.yesterday.isoformat()}, format='json')
        self.assertEqual(closed.status_code, 201, closed.content)
        self.assertEqual(closed.json()['status'], 'LOCKED')
        self.assertTrue(closed.json()['journal_reference'].startswith('JV-'))

        inv.refresh_from_db()
        inv.discount = Decimal('50.00')
        with self.assertRaises(FinancialPeriodLocked):
            inv.save()  # editing a posted invoice in a locked period
        inv.refresh_from_db()
        inv.status = InvoiceStatus.CANCELLED
        with self.assertRaises(FinancialPeriodLocked):
            inv.save()  # voiding it
        old_pay.refresh_from_db()
        old_pay.amount = Decimal('90.00')
        with self.assertRaises(FinancialPeriodLocked):
            old_pay.save()  # editing a payment in a closed period
        # Settling the old invoice today is a current-period transaction
        inv.refresh_from_db()
        Payment.objects.create(invoice=inv, patient=self.patient, payment_number='PAY-P11-NEW', amount=Decimal('900.00'))
        inv.paid, inv.balance, inv.status = Decimal('1000.00'), Decimal('0.00'), InvoiceStatus.PAID
        inv.save()
        self.assertEqual(Invoice.objects.get(pk=inv.pk).status, InvoiceStatus.PAID)
        # A back-dated invoice into the locked day is refused
        with self.assertRaises(FinancialPeriodLocked):
            self._invoice(self.yesterday, [('LAB', '200.00', 1, 0)])

    def test_close_checklist_roles_reopen_and_expiry(self):
        self._invoice(self.yesterday, [('OPD', '500.00', 1, 0)])
        self.client.force_authenticate(user=self.cashier)
        self.assertEqual(self.client.post('/api/v1/billing/period-close/', data={'period_type': 'DAILY'}, format='json').status_code, 403)
        self.client.force_authenticate(user=self.cfo)
        self.assertEqual(self.client.post('/api/v1/billing/period-close/', data={'period_type': 'DAILY'}, format='json').status_code, 403)  # day close is the Manager's
        # A refund still pending blocks the close
        inv = self._invoice(self.yesterday, [('LAB', '300.00', 1, 0)])
        refund = RefundRequest.objects.create(refund_number='REF-P11-1', invoice=inv, patient=self.patient, requested_amount=Decimal('100.00'),
                                              reason='Test', initiated_by=self.cashier)
        RefundRequest.objects.filter(pk=refund.pk).update(created_at=timezone.now() - timedelta(days=1))
        self.client.force_authenticate(user=self.manager)
        blocked = self.client.post('/api/v1/billing/period-close/', data={'period_type': 'DAILY', 'date': self.yesterday.isoformat()}, format='json')
        self.assertEqual(blocked.status_code, 400)
        self.assertIn('Refunds decided', blocked.json()['error'])
        RefundRequest.objects.filter(pk=refund.pk).update(status=RefundStatus.REJECTED)
        # Unbilled charges over 24h block unless carried forward with a reason
        stale = BillableChargeItem.objects.create(patient=self.patient, department='LAB', service_name='CBC', unit_price=Decimal('400.00'), total_amount=Decimal('400.00'))
        BillableChargeItem.objects.filter(pk=stale.pk).update(created_at=timezone.now() - timedelta(days=2))
        self.assertEqual(self.client.post('/api/v1/billing/period-close/', data={'period_type': 'DAILY', 'date': self.yesterday.isoformat()}, format='json').status_code, 400)
        lock = self.client.post('/api/v1/billing/period-close/', data={'period_type': 'DAILY', 'date': self.yesterday.isoformat(),
                                                                       'carry_forward_note': 'CBC awaiting lab confirmation, carried to 07 Oct'}, format='json')
        self.assertEqual(lock.status_code, 201, lock.content)
        lock_id = lock.json()['id']
        self.assertEqual(self.client.post('/api/v1/billing/period-close/', data={'period_type': 'DAILY', 'date': self.yesterday.isoformat()}, format='json').status_code, 400)

        # Month cannot close while it is running
        self.client.force_authenticate(user=self.admin)
        self.assertEqual(self.client.post('/api/v1/billing/period-close/', data={'period_type': 'MONTHLY', 'date': self.today.isoformat()}, format='json').status_code, 400)

        # Reopen: reason required, CFO approves, time-boxed, auto-relock
        self.client.force_authenticate(user=self.manager)
        self.assertEqual(self.client.post(f'/api/v1/billing/period-close/{lock_id}/reopen-request/', data={'reason': 'late'}, format='json').status_code, 400)
        self.assertEqual(self.client.post(f'/api/v1/billing/period-close/{lock_id}/reopen-request/', data={'reason': 'Late OT consumables posting OT-2240'}, format='json').status_code, 200)
        self.assertEqual(self.client.post(f'/api/v1/billing/period-close/{lock_id}/reopen-decision/', data={'approve': True}, format='json').status_code, 403)
        self.client.force_authenticate(user=self.cfo)
        ok = self.client.post(f'/api/v1/billing/period-close/{lock_id}/reopen-decision/', data={'approve': True, 'hours': 2}, format='json')
        self.assertEqual(ok.status_code, 200, ok.content)
        self.assertEqual(ok.json()['status'], 'REOPENED')
        self._invoice(self.yesterday, [('OPD', '250.00', 1, 0)])  # allowed while reopened
        FinancialPeriodLock.objects.filter(id=lock_id).update(reopen_expires_at=timezone.now() - timedelta(minutes=1))
        with self.assertRaises(FinancialPeriodLocked):
            self._invoice(self.yesterday, [('OPD', '250.00', 1, 0)])
        self.assertEqual(FinancialPeriodLock.objects.get(id=lock_id).status, 'LOCKED')

    def test_month_and_year_close_need_every_child_period(self):
        import calendar
        last_month_end = self.today.replace(day=1) - timedelta(days=1)
        start = last_month_end.replace(day=1)
        self.client.force_authenticate(user=self.admin)
        blocked = self.client.post('/api/v1/billing/period-close/', data={'period_type': 'MONTHLY', 'date': start.isoformat()}, format='json')
        self.assertEqual(blocked.status_code, 400)
        self.assertIn('days closed', blocked.json()['error'])
        for i in range(calendar.monthrange(start.year, start.month)[1]):
            d = start + timedelta(days=i)
            FinancialPeriodLock.objects.create(period_name=str(d), period_type='DAILY', start_date=d, end_date=d, status='LOCKED')
        closed = self.client.post('/api/v1/billing/period-close/', data={'period_type': 'MONTHLY', 'date': start.isoformat()}, format='json')
        self.assertEqual(closed.status_code, 201, closed.content)
        self.assertEqual(closed.json()['period_name'], start.strftime('%B %Y'))
        self.assertEqual(self.client.post('/api/v1/billing/period-close/', data={'period_type': 'ANNUAL', 'date': start.isoformat()}, format='json').status_code, 403)

    # ---------- GST ----------
    def test_gst_totals_match_itemised_lines(self):
        a = self._invoice(self.today, [('OPD', '800.00', 1, 0), ('PHARMACY', '333.33', 3, 12)])
        b = self._invoice(self.today, [('PHARMACY', '104.20', 2, 5), ('IPD', '6200.00', 1, 18), ('LAB', '450.00', 1, 0)], discount='100.00')
        items = list(InvoiceItem.objects.filter(invoice__in=[a, b]))
        self.client.force_authenticate(user=self.admin)
        g = self.client.get(f'/api/v1/billing/reports/tax-gst/?date_from={self.today}&date_to={self.today}&month={self.today:%Y-%m}').json()
        self.assertTrue(g['reconciles_to_invoices'])
        self.assertAlmostEqual(g['totals']['total_tax'], float(sum(i.tax_amount for i in items)), places=2)
        self.assertAlmostEqual(g['totals']['cgst'] + g['totals']['sgst'], g['totals']['total_tax'], places=2)
        slab12 = next(s for s in g['slabs'] if s['rate'] == 12.0)
        self.assertAlmostEqual(slab12['taxable_value'], 999.99, places=2)
        self.assertAlmostEqual(slab12['total_tax'], 120.0, places=2)
        exempt = next(s for s in g['slabs'] if s['rate'] == 0.0)
        self.assertAlmostEqual(exempt['taxable_value'], 1250.0, places=2)
        self.assertEqual(g['totals']['exempt_value'], 1250.0)
        self.assertEqual(g['returns'][0]['return'], 'GSTR-1')
        self.assertEqual(g['returns'][0]['total_tax'], g['totals']['total_tax'])

    # ---------- AR aging ----------
    def test_aging_buckets(self):
        self.assertEqual([BillingReportingService.bucket_for(d) for d in (0, 30, 31, 45, 60, 61, 90, 91)],
                         ['0-30', '0-30', '31-60', '31-60', '31-60', '61-90', '61-90', '90+'])
        self._invoice(self.today - timedelta(days=45), [('OPD', '1000.00', 1, 0)], status=InvoiceStatus.UNPAID)
        self._invoice(self.today - timedelta(days=95), [('IPD', '5000.00', 1, 0)], status=InvoiceStatus.UNPAID, corporate_reference='MOU-ONGC')
        self._invoice(self.today - timedelta(days=10), [('IPD', '7000.00', 1, 0)], status=InvoiceStatus.INSURANCE_PENDING, tpa_claim_reference='CLM-1')
        self._invoice(self.today - timedelta(days=50), [('LAB', '300.00', 1, 0)])  # paid: not receivable
        a = self._get(self.auditor, '/api/v1/billing/reports/aging-ar/').json()
        rows = {r['payer_type']: r for r in a['rows']}
        self.assertEqual(rows['SELF_PAY']['31-60'], 1000.0)  # 45 days old -> 31-60 bucket
        self.assertEqual(rows['CORPORATE']['90+'], 5000.0)
        self.assertEqual(rows['INSURANCE']['0-30'], 7000.0)
        self.assertEqual(a['totals']['total'], 13000.0)

    # ---------- department revenue, snapshots, journal, collections ----------
    def test_department_revenue_snapshot_journal_and_collections(self):
        inv = self._invoice(self.yesterday, [('OPD', '1000.00', 1, 0), ('LAB', '1000.00', 1, 0)], discount='200.00')
        Payment.objects.create(invoice=inv, patient=self.patient, payment_number='PAY-P11-A', amount=Decimal('1000.00'), tender_mode='UPI', cashier=self.cashier)
        Payment.objects.create(invoice=inv, patient=self.patient, payment_number='PAY-P11-B', amount=Decimal('800.00'), tender_mode='CASH', cashier=self.cashier)
        PatientDeposit.objects.create(deposit_number='DEP-P11-1', patient=self.patient, deposit_amount=Decimal('5000.00'),
                                      available_balance=Decimal('5000.00'), tender_mode='CARD', cashier=self.cashier)
        self.client.force_authenticate(user=self.admin)
        live = self.client.get(f'/api/v1/billing/reports/department-revenue/?date_from={self.yesterday}&date_to={self.yesterday}').json()
        opd = next(r for r in live['rows'] if r['department'] == 'OPD')
        self.assertEqual((opd['gross'], opd['discounts'], opd['net']), (1000.0, 100.0, 900.0))  # invoice discount spread by share
        self.assertEqual(live['final_days'], 0)

        self.client.force_authenticate(user=self.manager)
        self.assertEqual(self.client.post('/api/v1/billing/period-close/', data={'period_type': 'DAILY', 'date': self.yesterday.isoformat()}, format='json').status_code, 201)
        self.assertTrue(DailyRevenueSnapshot.objects.filter(snapshot_date=self.yesterday, department='OPD', is_final=True).exists())
        self.client.force_authenticate(user=self.admin)
        snap = self.client.get(f'/api/v1/billing/reports/department-revenue/?date_from={self.yesterday}&date_to={self.yesterday}').json()
        self.assertEqual(snap['final_days'], 1)
        self.assertEqual(snap['totals'], live['totals'])

        journal = BillingReportingService.settlement_journal(self.yesterday, self.today)
        self.assertTrue(journal['balanced'])
        accounts = {r['account']: r for r in journal['rows']}
        self.assertEqual(accounts['4100 · Patient service revenue']['credit'], 1800.0)
        self.assertEqual(accounts['2310 · Patient deposits']['credit'], 5000.0)

        col = self.client.get(f'/api/v1/billing/reports/daily-collections/?date_from={self.today}&date_to={self.today}').json()
        self.assertEqual(col['gross_collected'], 6800.0)
        self.assertEqual({t['tender'] for t in col['tenders']}, {'UPI', 'CASH', 'CARD'})
        self.assertEqual(col['cashiers'][0]['total'], 6800.0)
        csv_resp = self.client.get(f'/api/v1/billing/reports/run/journal/?date_from={self.yesterday}&date_to={self.today}&export=csv')
        self.assertEqual(csv_resp.status_code, 200)
        self.assertIn('text/csv', csv_resp['Content-Type'])
        self.assertTrue(BillingAuditEvent.objects.filter(event_type='REPORT_EXPORTED').exists())
        analytics = self.client.get('/api/v1/billing/reports/revenue-analytics/').json()
        self.assertEqual(len(analytics['monthly_trend']), 12)
        self.assertIn('collection_efficiency_percent', analytics['kpis'])

    # ---------- audit log ----------
    def test_audit_log_is_tamper_evident_and_immutable(self):
        for i in range(3):
            SupervisorGovernanceService.audit('POLICY_CHANGE', f'Policy {i}', 'limit changed', 'LOW', self.admin, None, f'GOV-{i}')
        data = self._get(self.auditor, '/api/v1/billing/audit-logs/?category=Policy').json()
        self.assertEqual(data['total'], 3)
        self.assertEqual(data['rows'][0]['category'], 'Policy')
        self.assertTrue(self._get(self.auditor, '/api/v1/billing/audit-logs/verify/').json()['intact'])
        ev = BillingAuditEvent.objects.get(reference='GOV-1')
        ev.detail = 'edited'
        with self.assertRaises(ValueError):
            ev.save()
        with self.assertRaises(ValueError):
            ev.delete()
        BillingAuditEvent.objects.filter(reference='GOV-1').update(detail='limit changed to 99%')  # tamper behind the model
        broken = self._get(self.auditor, '/api/v1/billing/audit-logs/verify/').json()
        self.assertFalse(broken['intact'])
        self.assertEqual(broken['broken_at_sequence'], ev.sequence)
        self.assertEqual(self._get(self.cashier, '/api/v1/billing/audit-logs/').status_code, 403)

    # ---------- role scopes ----------
    def test_report_role_scopes(self):
        self._invoice(self.today, [('OPD', '500.00', 1, 0)])
        self.assertEqual(self._get(self.auditor, '/api/v1/billing/reports/tax-gst/').status_code, 200)
        self.assertEqual(self._get(self.cfo, '/api/v1/billing/period-close/').status_code, 200)
        self.client.force_authenticate(user=self.auditor)
        self.assertEqual(self.client.post('/api/v1/billing/period-close/', data={'period_type': 'DAILY'}, format='json').status_code, 403)
        self.assertEqual(self._get(self.cashier, '/api/v1/billing/reports/catalogue/').status_code, 403)
        # Supervisors: current-shift reports only, always today
        cat = self._get(self.supervisor, '/api/v1/billing/reports/catalogue/').json()
        self.assertEqual({r['key'] for r in cat['reports']}, {'tender', 'productivity', 'refunds'})
        self.assertEqual(self._get(self.supervisor, '/api/v1/billing/reports/run/gst/').status_code, 403)
        self.assertEqual(self._get(self.supervisor, '/api/v1/billing/reports/tax-gst/').status_code, 403)
        r = self._get(self.supervisor, f'/api/v1/billing/reports/run/tender/?date_from={self.today - timedelta(days=30)}').json()
        self.assertEqual(r['period'], {'from': self.today.isoformat(), 'to': self.today.isoformat()})


# ==============================================================================
# PHASE 3: REAL-TIME GENERAL LEDGER (GL) BRIDGE & ACCOUNTS DEPARTMENT TESTS
# ==============================================================================

class Phase3GeneralLedgerBridgeTestCase(APITestCase):
    def setUp(self):
        self.today = timezone.localdate()
        self.patient = Patient.objects.create(
            uhid='UHID-GL-001', first_name='John', last_name='Doe',
            date_of_birth='1988-06-15', gender='MALE', phone_number='9876543210'
        )
        self.cashier = User.objects.create_user(
            username='cashier_gl', email='cashier_gl@hospital.com',
            role=RoleType.CASHIER, password='pass'
        )
        self.finance_user = User.objects.create_user(
            username='finance_cfo', email='cfo@hospital.com',
            role=RoleType.BILLING_ADMIN, password='pass'
        )
        self.counter = BillingCounter.objects.create(
            code='CNT-GL-01', name='Main Counter', station_location='OPD_GROUND_FLOOR'
        )
        self.shift = CounterShift.objects.create(
            counter=self.counter, cashier=self.cashier, opening_float=Decimal('2000.00'), status=ShiftStatus.OPEN
        )
        self.tariff = TariffMaster.objects.create(
            code='OPD-CONS-CARD', name='Cardiology Consultation',
            department='OPD', base_price=Decimal('800.00'), is_active=True
        )

    def test_cashier_multi_tender_settlement_creates_balanced_gl_journal(self):
        """Settling a bill with OPD, Lab, and Pharmacy items creates a balanced General Ledger journal entry."""
        # 1. Stage charges across OPD, Lab, and Pharmacy
        opd_charge = BillableChargeItem.objects.create(
            patient=self.patient, department='OPD', service_code='DOC-CONS', service_name='Dr Consultation',
            unit_price=Decimal('500.00'), quantity=1, total_amount=Decimal('500.00')
        )
        lab_charge = BillableChargeItem.objects.create(
            patient=self.patient, department='LAB', service_code='LAB-CBC', service_name='Complete Blood Count',
            unit_price=Decimal('400.00'), quantity=1, total_amount=Decimal('400.00')
        )
        pharm_charge = BillableChargeItem.objects.create(
            patient=self.patient, department='PHARMACY', service_code='MED-PARA', service_name='Paracetamol 650mg',
            unit_price=Decimal('100.00'), quantity=1, tax_rate=Decimal('12.00'), tax_amount=Decimal('12.00'), total_amount=Decimal('112.00')
        )

        # 2. Consolidate to invoice
        invoice = CashierWorkspaceService.consolidate_with_guard(
            self.cashier, self.patient,
            [str(opd_charge.id), str(lab_charge.id), str(pharm_charge.id)],
            counter=self.counter, shift=self.shift
        )
        self.assertEqual(invoice.total, Decimal('1012.00'))

        # 3. Pay via multi-tender split: ₹512 Cash + ₹500 UPI
        split_payments = [
            {'tender_mode': 'CASH', 'amount': 512.00},
            {'tender_mode': 'UPI', 'amount': 500.00, 'upi_vpa': 'john@upi'}
        ]
        result = BillingCoreService.process_multi_tender_payment(
            invoice_id=str(invoice.id),
            cashier=self.cashier,
            split_payments=split_payments,
            counter=self.counter,
            shift=self.shift
        )
        self.assertEqual(result['invoice'].status, 'PAID')

        # 4. Verify GeneralLedgerJournalEntry was automatically generated
        gl_entry = GeneralLedgerJournalEntry.objects.filter(invoice=invoice).first()
        self.assertIsNotNone(gl_entry)
        self.assertTrue(gl_entry.journal_reference.startswith('JV-'))
        self.assertTrue(gl_entry.is_balanced)
        self.assertEqual(gl_entry.total_debit, Decimal('1012.00'))
        self.assertEqual(gl_entry.total_credit, Decimal('1012.00'))

        # 5. Check Line Items double-entry mapping
        lines = {l.account_code: l for l in gl_entry.lines.all()}

        # Debits (Tenders):
        self.assertIn('1110', lines)  # Cash
        self.assertEqual(lines['1110'].debit_amount, Decimal('512.00'))
        self.assertIn('1130', lines)  # UPI
        self.assertEqual(lines['1130'].debit_amount, Decimal('500.00'))

        # Credits (Revenue & Tax):
        self.assertIn('4110', lines)  # OPD Consultation Revenue
        self.assertEqual(lines['4110'].credit_amount, Decimal('500.00'))
        self.assertEqual(lines['4110'].department, 'OPD')

        self.assertIn('4120', lines)  # Diagnostic Lab Revenue
        self.assertEqual(lines['4120'].credit_amount, Decimal('400.00'))
        self.assertEqual(lines['4120'].department, 'LAB')

        self.assertIn('4140', lines)  # Pharmacy Drug Sales Revenue
        self.assertEqual(lines['4140'].credit_amount, Decimal('100.00'))
        self.assertEqual(lines['4140'].department, 'PHARMACY')

        self.assertIn('2410', lines)  # Output GST Payable
        self.assertEqual(lines['2410'].credit_amount, Decimal('12.00'))

    def test_partial_settlement_books_receivable_and_subsequent_payment_clears_it(self):
        """Partial payment debits 1300 Patient Receivable, and subsequent payment settles it."""
        opd_charge = BillableChargeItem.objects.create(
            patient=self.patient, department='OPD', service_code='DOC-SPEC', service_name='Cardiology Consult',
            unit_price=Decimal('1000.00'), quantity=1, total_amount=Decimal('1000.00')
        )
        invoice = CashierWorkspaceService.consolidate_with_guard(
            self.cashier, self.patient, [str(opd_charge.id)], counter=self.counter, shift=self.shift
        )

        # Pay ₹600 Cash only, leaving ₹400 balance
        BillingCoreService.process_multi_tender_payment(
            invoice_id=str(invoice.id),
            cashier=self.cashier,
            split_payments=[{'tender_mode': 'CASH', 'amount': 600.00}],
            counter=self.counter, shift=self.shift
        )
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, 'PARTIALLY_PAID')
        self.assertEqual(invoice.balance, Decimal('400.00'))

        initial_jv = GeneralLedgerJournalEntry.objects.filter(invoice=invoice).first()
        self.assertTrue(initial_jv.is_balanced)
        init_lines = {l.account_code: l for l in initial_jv.lines.all()}
        self.assertEqual(init_lines['1110'].debit_amount, Decimal('600.00'))  # Cash
        self.assertEqual(init_lines['1300'].debit_amount, Decimal('400.00'))  # Receivable
        self.assertEqual(init_lines['4110'].credit_amount, Decimal('1000.00'))  # OPD Revenue

        # Subsequent payment: Pay remaining ₹400 via Card
        BillingCoreService.process_multi_tender_payment(
            invoice_id=str(invoice.id),
            cashier=self.cashier,
            split_payments=[{'tender_mode': 'CARD', 'amount': 400.00}],
            counter=self.counter, shift=self.shift
        )
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, 'PAID')

        all_jvs = list(GeneralLedgerJournalEntry.objects.filter(invoice=invoice).order_by('created_at'))
        self.assertEqual(len(all_jvs), 2)
        second_jv = all_jvs[1]
        self.assertTrue(second_jv.is_balanced)
        sec_lines = {l.account_code: l for l in second_jv.lines.all()}
        self.assertEqual(sec_lines['1120'].debit_amount, Decimal('400.00'))  # Card
        self.assertEqual(sec_lines['1300'].credit_amount, Decimal('400.00'))  # Cleared Receivable

    def test_live_journal_stream_and_department_summary_apis(self):
        """Endpoints GET /reports/journal/live-stream/ and /reports/department-revenue/live-summary/ respond with accurate data."""
        # Create walk-in settlement
        CashierWorkspaceService.quick_walkin_settlement(
            cashier=self.cashier,
            items=[{'service_code': 'OPD-CONS-CARD', 'qty': 1}],
            split_payments=[{'tender_mode': 'CASH', 'amount': 800.00}],
            counter_code='CNT-GL-01', shift=self.shift
        )

        self.client.force_authenticate(user=self.finance_user)

        # 1. Live stream endpoint
        stream_resp = self.client.get('/api/v1/billing/reports/journal/live-stream/')
        self.assertEqual(stream_resp.status_code, 200)
        self.assertGreaterEqual(stream_resp.json()['count'], 1)
        first_entry = stream_resp.json()['entries'][0]
        self.assertTrue(first_entry['journal_reference'].startswith('JV-'))
        self.assertTrue(first_entry['is_balanced'])
        self.assertGreater(len(first_entry['lines']), 0)

        # 2. Live summary endpoint
        summary_resp = self.client.get('/api/v1/billing/reports/department-revenue/live-summary/')
        self.assertEqual(summary_resp.status_code, 200)
        data = summary_resp.json()
        self.assertIn('departments', data)
        self.assertIn('OPD', data['departments'])
        self.assertIn('LAB', data['departments'])
        self.assertIn('PHARMACY', data['departments'])
        self.assertGreaterEqual(data['totals']['total_collected'], 800.00)

