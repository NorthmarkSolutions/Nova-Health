from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.utils import timezone
from django.db.models import Q
from .models import (
    Invoice, InvoiceItem, Payment,
    BillingCounter, CounterShift, PatientDeposit,
    RefundRequest, TariffMaster, ServicePackage,
    CorporateAccount, FinancialDischargeClearance,
    BillableChargeItem, BillingReceipt, CreditNote,
    ChargeItemStatus, ReceiptType,
    DepartmentChargeEvent, DepartmentChargeEventStatus,
    DepartmentGatingRule, GatingAction,
    SupervisorApprovalRequest, ApprovalStatus, ShiftStatus, BillingAuditEvent,
    TariffChangeRequest, TariffChangeStatus, TariffRevisionLog, EmergencyMarkupSchedule,
    TPAClaimRecord, PreAuthStatus, ClaimLifecycleStatus, CorporateCreditVoucher,
    IPDRunningLedger, InterimDepositDemand,
    RevenueLeakageAlert, RevenueLeakageType, RevenueLeakageStatus,
    FraudRiskSignal, FraudRiskSignalSeverity,
    RevenueInvestigationCase, RevenueInvestigationStatus,
    FinancialPeriodLock, AuditEventType, AuditSeverity
)
from .serializers import (
    InvoiceSerializer, PaymentSerializer,
    BillingCounterSerializer, CounterShiftSerializer,
    PatientDepositSerializer, RefundRequestSerializer,
    TariffMasterSerializer, ServicePackageSerializer,
    CorporateAccountSerializer, FinancialDischargeClearanceSerializer,
    BillableChargeItemSerializer, BillingReceiptSerializer,
    CreditNoteSerializer, PatientLedgerSerializer,
    DepartmentChargeEventSerializer, DepartmentGatingRuleSerializer,
    SupervisorApprovalRequestSerializer,
    ApprovalMatrixTierSerializer, BillingPolicyRuleSerializer,
    CounterHardwareRegistrySerializer, BillingStaffRosterSerializer,
    BillingCounterAdminSerializer,
    TPAClaimRecordSerializer, CorporateCreditVoucherSerializer,
    IPDRunningLedgerSerializer, InterimDepositDemandSerializer,
    RevenueLeakageAlertSerializer, FraudRiskSignalSerializer,
    RevenueInvestigationCaseSerializer,
    GeneralLedgerJournalEntrySerializer, GeneralLedgerLineItemSerializer
)
from .services import (
    TariffPricingService, BillingCoreService, CounterClosingService,
    RefundWorkflowService, DepartmentChargeIntegrationService,
    CashierWorkspaceService, DiscountApprovalRequired,
    CounterShiftControlService, NoActiveShift, next_document_number,
    SupervisorGovernanceService, TariffGovernanceService, PackageGovernanceService, MarkupScheduleService,
    BillingAdminGovernanceService,
    TPACorporateBillingService, CorporateCreditLimitExceeded,
    IPDRunningLedgerService, RevenueIntegrityScannerService,
    BillingReportingService, FinancialPeriodCloseService, BillingAuditLogService, next_journal_reference,
    GeneralLedgerIntegrationService
)
from .permissions import (
    IsCashierOrAbove, IsBillingSupervisorOrAbove,
    IsBillingAdminOrAbove, IsBillingStaffOrReadOnly,
    IsHospitalStaff, IsStaffReadAdminWrite,
    IsInsuranceCoordinatorOrAbove
)
from apps.patients.models import Patient
from apps.ipd.models import InpatientAdmission

# --- INVOICE & PAYMENT VIEWS ---

class InvoiceListCreateView(APIView):
    permission_classes = [IsCashierOrAbove]

    def get(self, request):
        status_param = request.query_params.get('status')
        uhid_param = request.query_params.get('uhid')
        category_param = request.query_params.get('category')
        start_date = request.query_params.get('start_date') or request.query_params.get('startDate')
        end_date = request.query_params.get('end_date') or request.query_params.get('endDate')

        qs = Invoice.objects.select_related('patient', 'counter', 'cashier').prefetch_related('items', 'payments').all()
        if status_param:
            qs = qs.filter(status=status_param)
        if uhid_param:
            qs = qs.filter(patient__uhid=uhid_param)
        if category_param:
            qs = qs.filter(category=category_param)
        if start_date:
            qs = qs.filter(date__gte=start_date)
        if end_date:
            qs = qs.filter(date__lte=end_date)
        return Response(InvoiceSerializer(qs, many=True).data)

    def post(self, request):
        data = request.data
        patient_id = data.get('patientId') or data.get('patient')
        patient = Patient.objects.filter(id=patient_id).first() if patient_id else Patient.objects.first()
        try:
            shift = _acting_shift(request)
        except NoActiveShift as nas:
            return _no_shift_response(nas)

        charge_ids = data.get('charge_ids') or data.get('chargeIds')
        if charge_ids:
            try:
                # Phase 3: discretionary discount guard (cashier ceiling 5%)
                charges = BillableChargeItem.objects.filter(id__in=charge_ids, patient=patient, status=ChargeItemStatus.PENDING)
                gross = sum((c.unit_price * c.quantity for c in charges), Decimal('0.00'))
                guard = CashierWorkspaceService.enforce_discount_guard(
                    request.user, gross,
                    discount_amount=data.get('discount') or None,
                    discount_percent=data.get('discount_percent'),
                    approval_request_id=data.get('approval_request_id') or data.get('approvalRequestId'),
                    patient=patient
                )
                invoice = BillingCoreService.consolidate_charges_to_invoice(
                    patient=patient,
                    charge_ids=charge_ids,
                    cashier=request.user if request.user.is_authenticated else None,
                    counter=shift.counter,
                    shift=shift,
                    discount=Decimal(str(guard['discount_amount'])),
                    discount_reason=data.get('discount_reason', ''),
                    advance_deducted=Decimal(str(data.get('advanceDeducted', 0.0))),
                    category=data.get('category'),
                    encounter_type=data.get('encounter_type', 'OPD')
                )
                CashierWorkspaceService._stamp_discount_approval(invoice, guard)
                return Response(InvoiceSerializer(invoice).data, status=status.HTTP_201_CREATED)
            except DiscountApprovalRequired as dar:
                return _approval_required_response(dar)
            except ValueError as ve:
                return Response({'error': str(ve)}, status=status.HTTP_400_BAD_REQUEST)

        today = timezone.now().strftime('%Y-%m-%d')
        inv_num = next_document_number('INV')

        subtotal = Decimal(str(data.get('subtotal', 0.0)))
        discount = Decimal(str(data.get('discount', 0.0)))
        tax = Decimal(str(data.get('tax', 0.0)))
        advance = Decimal(str(data.get('advanceDeducted', 0.0)))
        total = Decimal(str(data.get('total', subtotal - discount + tax - advance)))
        paid = Decimal(str(data.get('paid', 0.0)))
        balance = total - paid
        inv_status = 'PAID' if balance <= 0 else ('PARTIALLY_PAID' if paid > 0 else 'UNPAID')

        invoice = Invoice.objects.create(
            invoice_number=inv_num,
            patient=patient,
            category=data.get('category', 'OPD'),
            encounter_type=data.get('encounter_type', data.get('category', 'OPD')),
            date=today,
            subtotal=subtotal,
            discount=discount,
            tax=tax,
            advance_deducted=advance,
            total=total,
            paid=paid,
            balance=balance,
            status=inv_status,
            settlement_mode=data.get('settlement_mode'),
            token_slip_number=data.get('token_slip_number'),
            tpa_claim_reference=data.get('tpa_claim_reference'),
            corporate_reference=data.get('corporate_reference'),
            discount_reason=data.get('discount_reason', ''),
            cashier=request.user if request.user.is_authenticated else None
        )

        items_data = data.get('items', [])
        for item in items_data:
            InvoiceItem.objects.create(
                invoice=invoice,
                source=item.get('source', 'Consultation'),
                department=item.get('department', 'GENERAL'),
                service_code=item.get('service_code', ''),
                description=item.get('description', 'Service Charge'),
                qty=int(item.get('qty', 1)),
                unit_price=Decimal(str(item.get('unitPrice') or item.get('unit_price', 0.0))),
                discount_percent=Decimal(str(item.get('discount_percent', 0.0))),
                discount_amount=Decimal(str(item.get('discount_amount', 0.0))),
                tax_rate=Decimal(str(item.get('tax_rate', 0.0))),
                tax_amount=Decimal(str(item.get('tax_amount', 0.0))),
                total=Decimal(str(item.get('total', 0.0))),
                source_reference_id=item.get('source_reference_id')
            )

        return Response(InvoiceSerializer(invoice).data, status=status.HTTP_201_CREATED)

class InvoiceDetailView(APIView):
    permission_classes = [IsBillingStaffOrReadOnly]

    def get(self, request, pk):
        try:
            if '-' in pk and len(pk) == 36:
                invoice = Invoice.objects.select_related('patient', 'counter', 'cashier').prefetch_related('items', 'payments').get(pk=pk)
            else:
                invoice = Invoice.objects.select_related('patient', 'counter', 'cashier').prefetch_related('items', 'payments').get(invoice_number=pk)
        except Invoice.DoesNotExist:
            return Response({'error': 'Invoice not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(InvoiceSerializer(invoice).data)

class PaymentCreateView(APIView):
    permission_classes = [IsCashierOrAbove]

    def post(self, request):
        data = request.data
        inv_id = data.get('invoiceId') or data.get('invoice')
        try:
            invoice = Invoice.objects.get(pk=inv_id)
        except Invoice.DoesNotExist:
            return Response({'error': 'Invoice not found'}, status=status.HTTP_404_NOT_FOUND)

        try:
            shift = _acting_shift(request)
        except NoActiveShift as nas:
            return _no_shift_response(nas)

        amount = Decimal(str(data.get('amount', 0.0)))
        today_str = timezone.now().strftime('%Y%m%d')
        count = Payment.objects.count() + 1
        p_num = f"PAY-{today_str}-{str(count).zfill(4)}"

        payment = Payment.objects.create(
            invoice=invoice,
            patient=invoice.patient,
            payment_number=p_num,
            amount=amount,
            payment_method=data.get('paymentMethod', data.get('tenderMode', 'CASH')),
            tender_mode=data.get('tenderMode', data.get('paymentMethod', 'CASH')),
            transaction_reference=data.get('transactionReference'),
            card_network=data.get('card_network'),
            card_last_four=data.get('card_last_four'),
            auth_code=data.get('auth_code'),
            upi_vpa=data.get('upi_vpa'),
            cheque_number=data.get('cheque_number'),
            cheque_bank=data.get('cheque_bank'),
            cashier=request.user if request.user.is_authenticated else None,
            counter=shift.counter,
            shift=shift,
        )

        invoice.paid += amount
        invoice.balance = invoice.total - invoice.paid
        if invoice.balance <= 0:
            invoice.status = 'PAID'
            invoice.balance = Decimal('0.00')
        else:
            invoice.status = 'PARTIALLY_PAID'
        invoice.save()

        return Response({
            'payment': PaymentSerializer(payment).data,
            'invoice': InvoiceSerializer(invoice).data,
        }, status=status.HTTP_201_CREATED)

# --- PHASE 2: TARIFF & PRICING VIEWS ---

def _is_billing_admin(user) -> bool:
    return SupervisorGovernanceService.tier(user) == 'ADMIN'


def _bad_request(exc):
    return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)


def _tariff_rows(tariffs) -> list:
    """Tariff list rows with owner, the next scheduled price and any change waiting for review."""
    ids = [t.id for t in tariffs]
    scheduled = {}
    for log in TariffRevisionLog.objects.filter(tariff_id__in=ids, applied_at__isnull=True).order_by('effective_from'):
        scheduled.setdefault(log.tariff_id, log)
    pending = {r.service_code: r.request_number for r in TariffChangeRequest.objects.filter(
        service_code__in=[t.code for t in tariffs], status=TariffChangeStatus.PENDING)}
    rows = []
    for t in tariffs:
        row = TariffMasterSerializer(t).data
        nxt = scheduled.get(t.id)
        row['owner'] = TariffGovernanceService.owner_of(t)
        row['scheduled_change'] = {'base_price': float(nxt.new_base_price), 'effective_from': nxt.effective_from.isoformat()} if nxt else None
        row['pending_request'] = pending.get(t.code)
        row['status'] = 'ACTIVE' if t.is_active else ('SCHEDULED' if nxt else 'INACTIVE')
        rows.append(row)
    return rows


class TariffListCreateView(APIView):
    """Hospital tariff (every staff member reads; billing admins add services with a justification)."""
    permission_classes = [IsStaffReadAdminWrite]

    def get(self, request):
        TariffGovernanceService.sync_due_versions()
        dept = request.query_params.get('department')
        search = request.query_params.get('search')
        is_active = request.query_params.get('is_active')

        qs = TariffMaster.objects.all()
        if dept and dept.upper() != 'ALL':
            depts = [d.strip().upper() for d in dept.split(',') if d.strip()]
            if len(depts) == 1:
                qs = qs.filter(department=depts[0])
            elif len(depts) > 1:
                qs = qs.filter(department__in=depts)
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(code__icontains=search))
        if is_active is not None:
            active_bool = is_active.lower() in ['true', '1']
            qs = qs.filter(is_active=active_bool)
        qs = qs.order_by('department', 'name')
        return Response(_tariff_rows(list(qs)))

    def post(self, request):
        try:
            tariff = TariffGovernanceService.create_tariff(request.user, request.data, request.data.get('justification', ''))
            return Response(_tariff_rows([tariff])[0], status=status.HTTP_201_CREATED)
        except ValueError as ve:
            return _bad_request(ve)


class TariffDetailView(APIView):
    permission_classes = [IsStaffReadAdminWrite]

    def _get(self, pk):
        return TariffMaster.objects.filter(Q(code=pk) | Q(id=pk)).first() if len(str(pk)) == 36 else TariffMaster.objects.filter(code=pk).first()

    def get(self, request, pk):
        TariffGovernanceService.sync_due_versions()
        tariff = self._get(pk)
        if not tariff:
            return Response({'error': 'Tariff not found'}, status=status.HTTP_404_NOT_FOUND)
        row = _tariff_rows([tariff])[0]
        row['history'] = TariffGovernanceService.price_history(tariff)
        return Response(row)

    def patch(self, request, pk):
        tariff = self._get(pk)
        if not tariff:
            return Response({'error': 'Tariff not found'}, status=status.HTTP_404_NOT_FOUND)
        try:
            updated = TariffGovernanceService.direct_update(tariff, request.user, request.data, request.data.get('justification', ''))
        except ValueError as ve:
            return _bad_request(ve)
        row = _tariff_rows([updated])[0]
        row['history'] = TariffGovernanceService.price_history(updated)
        return Response(row)

    def delete(self, request, pk):
        tariff = self._get(pk)
        if not tariff:
            return Response({'error': 'Tariff not found'}, status=status.HTTP_404_NOT_FOUND)
        tariff.is_active = False
        tariff.save()
        TariffGovernanceService._audit('Tariff service deactivated', f'{tariff.code} {tariff.name}', request.user, tariff.code)
        return Response({'message': f'Tariff {tariff.code} deactivated successfully'})


class TariffChangeRequestView(APIView):
    """Departments propose a price change or a new service; billing admins see the whole queue."""
    permission_classes = [IsHospitalStaff]

    def get(self, request):
        mine = request.query_params.get('mine') in ('1', 'true', 'True') or not (
            _is_billing_admin(request.user) or getattr(request.user, 'role', None) == 'FINANCE_MANAGER')
        return Response(TariffGovernanceService.change_queue(request.user, mine_only=mine))

    def post(self, request):
        try:
            req = TariffGovernanceService.propose_change(request.user, request.data)
            return Response(TariffGovernanceService.change_row(req, request.user), status=status.HTTP_201_CREATED)
        except ValueError as ve:
            return _bad_request(ve)


class TariffChangeDecideView(APIView):
    """APPROVE (publishes now or schedules for the effective date), REJECT or REVISION, with a note."""
    permission_classes = [IsBillingAdminOrAbove]

    def post(self, request, pk):
        data = request.data
        try:
            req = TariffGovernanceService.decide_change(
                pk, request.user, data.get('action'), note=data.get('note', ''),
                cfo_confirmed=str(data.get('cfo_confirmed', '')).lower() in ('true', '1')
            )
            return Response(TariffGovernanceService.change_row(req, request.user))
        except TariffChangeRequest.DoesNotExist:
            return Response({'error': 'Change request not found'}, status=status.HTTP_404_NOT_FOUND)
        except PermissionError as pe:
            return Response({'error': str(pe)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as ve:
            return _bad_request(ve)


class TariffBatchImportView(APIView):
    """CSV tariff revision. dry_run (default) previews; dry_run=false applies all rows or none."""
    permission_classes = [IsBillingAdminOrAbove]

    def post(self, request):
        data = request.data
        upload = request.FILES.get('file') if hasattr(request, 'FILES') else None
        csv_text = upload.read().decode('utf-8-sig') if upload else (data.get('csv') or '')
        dry_run = str(data.get('dry_run', 'true')).lower() not in ('false', '0')
        try:
            result = TariffGovernanceService.batch_import(
                request.user, csv_text, data.get('justification', ''), data.get('effective_from'), dry_run=dry_run)
            return Response(result, status=status.HTTP_200_OK if dry_run else status.HTTP_201_CREATED)
        except ValueError as ve:
            return _bad_request(ve)


class ServicePackageListCreateView(APIView):
    permission_classes = [IsStaffReadAdminWrite]

    def get(self, request):
        TariffGovernanceService.sync_due_versions()
        dept = request.query_params.get('department')
        search = request.query_params.get('search')
        pkg_status = request.query_params.get('status')
        qs = ServicePackage.objects.prefetch_related('items').select_related('published_by')
        if dept and dept.upper() != 'ALL':
            qs = qs.filter(department=dept.upper())
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(code__icontains=search))
        if pkg_status:
            qs = qs.filter(status=pkg_status.upper())
        return Response([PackageGovernanceService.package_dict(p) for p in qs])

    def post(self, request):
        try:
            pkg = PackageGovernanceService.save_package(request.user, request.data)
            return Response(PackageGovernanceService.package_dict(pkg), status=status.HTTP_201_CREATED)
        except (ValueError, TypeError) as ve:
            return _bad_request(ve)


class ServicePackageDetailView(APIView):
    permission_classes = [IsStaffReadAdminWrite]

    def get(self, request, pk):
        pkg = PackageGovernanceService.resolve(pk)
        if not pkg:
            return Response({'error': 'Package not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(PackageGovernanceService.package_dict(pkg))

    def patch(self, request, pk):
        pkg = PackageGovernanceService.resolve(pk)
        if not pkg:
            return Response({'error': 'Package not found'}, status=status.HTTP_404_NOT_FOUND)
        try:
            pkg = PackageGovernanceService.save_package(request.user, request.data, package=pkg)
            return Response(PackageGovernanceService.package_dict(pkg))
        except (ValueError, TypeError) as ve:
            return _bad_request(ve)


class ServicePackageLifecycleView(APIView):
    """POST /packages/{id}/publish (now, or scheduled for effective_from) and /packages/{id}/retire."""
    permission_classes = [IsBillingAdminOrAbove]

    def post(self, request, pk, action):
        pkg = PackageGovernanceService.resolve(pk)
        if not pkg:
            return Response({'error': 'Package not found'}, status=status.HTTP_404_NOT_FOUND)
        try:
            pkg = PackageGovernanceService.publish(request.user, pkg) if action == 'publish' else PackageGovernanceService.retire(request.user, pkg)
            return Response(PackageGovernanceService.package_dict(pkg))
        except ValueError as ve:
            return _bad_request(ve)


class ServicePackageCoverageView(APIView):
    """GET /packages/{id}/coverage?service_code=LAB-CBC&consumed=1 — would one more unit be absorbed?"""
    permission_classes = [IsStaffReadAdminWrite]

    def get(self, request, pk):
        try:
            consumed = int(request.query_params.get('consumed') or 0)
            return Response(TariffPricingService.is_service_covered_by_package(pk, request.query_params.get('service_code', ''), consumed))
        except ValueError as ve:
            return Response({'error': str(ve)}, status=status.HTTP_404_NOT_FOUND)


class MarkupScheduleListCreateView(APIView):
    permission_classes = [IsStaffReadAdminWrite]

    def get(self, request):
        return Response([MarkupScheduleService.as_dict(x) for x in EmergencyMarkupSchedule.objects.all()])

    def post(self, request):
        try:
            return Response(MarkupScheduleService.as_dict(MarkupScheduleService.save(request.user, request.data)), status=status.HTTP_201_CREATED)
        except (ValueError, ArithmeticError) as ve:
            return _bad_request(ve)


class MarkupScheduleDetailView(APIView):
    permission_classes = [IsStaffReadAdminWrite]

    def patch(self, request, pk):
        sch = EmergencyMarkupSchedule.objects.filter(id=pk).first()
        if not sch:
            return Response({'error': 'Schedule not found'}, status=status.HTTP_404_NOT_FOUND)
        try:
            return Response(MarkupScheduleService.as_dict(MarkupScheduleService.save(request.user, request.data, schedule=sch)))
        except (ValueError, ArithmeticError) as ve:
            return _bad_request(ve)

class CorporateAccountListCreateView(APIView):
    permission_classes = [IsStaffReadAdminWrite]

    def get(self, request):
        account_type = request.query_params.get('type')
        qs = CorporateAccount.objects.all()
        if account_type:
            qs = qs.filter(account_type=account_type.upper())
        return Response(CorporateAccountSerializer(qs, many=True).data)

    def post(self, request):
        serializer = CorporateAccountSerializer(data=request.data)
        if serializer.is_valid():
            corp = serializer.save()
            return Response(CorporateAccountSerializer(corp).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class CorporateAccountDetailView(APIView):
    permission_classes = [IsStaffReadAdminWrite]

    def get(self, request, pk):
        corp = CorporateAccount.objects.filter(Q(id=pk) | Q(code=pk)).first()
        if not corp:
            return Response({'error': 'Corporate Account not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(CorporateAccountSerializer(corp).data)

    def patch(self, request, pk):
        corp = CorporateAccount.objects.filter(Q(id=pk) | Q(code=pk)).first()
        if not corp:
            return Response({'error': 'Corporate Account not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = CorporateAccountSerializer(corp, data=request.data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            return Response(CorporateAccountSerializer(updated).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PricingQuoteCalculateView(APIView):
    permission_classes = [IsCashierOrAbove]

    def post(self, request):
        data = request.data
        items = data.get('items', [])
        encounter_type = data.get('encounter_type', 'OPD')
        patient_category = data.get('patient_category', 'GENERAL')
        is_emergency = bool(data.get('is_emergency', False))
        corporate_account_id = data.get('corporate_account_id')
        at = None
        if data.get('at'):
            from django.utils.dateparse import parse_datetime
            at = parse_datetime(str(data['at']))
            if at is None:
                return _bad_request(ValueError('at must be an ISO date-time.'))
            if timezone.is_naive(at):
                at = timezone.make_aware(at)
        try:
            quote = TariffPricingService.calculate_quote(
                items=items,
                encounter_type=encounter_type,
                patient_category=patient_category,
                is_emergency=is_emergency,
                corporate_account_id=corporate_account_id,
                package_code=data.get('package_code') or None,
                at=at
            )
        except ValueError as ve:
            return _bad_request(ve)
        return Response(quote, status=status.HTTP_200_OK)


# --- PHASE 3: CASHIER WORKSPACE & POS VIEWS ---

class CashierQueueView(APIView):
    permission_classes = [IsCashierOrAbove]

    def get(self, request):
        dept = request.query_params.get('department')
        search = request.query_params.get('search')
        queue_items = CounterClosingService.get_unbilled_queue(department=dept, search=search)
        return Response(queue_items, status=status.HTTP_200_OK)


class MultiTenderPaymentView(APIView):
    permission_classes = [IsCashierOrAbove]

    def post(self, request):
        data = request.data
        inv_id = data.get('invoice_id') or data.get('invoiceId')
        split_payments = data.get('split_payments') or data.get('splits', [])
        counter_code = data.get('counter_code', 'COUNTER-01')
        notes = data.get('notes', '')

        if not inv_id:
            return Response({'error': 'invoice_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        if not split_payments:
            return Response({'error': 'At least one tender payment split is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            active_shift = _acting_shift(request)
        except NoActiveShift as nas:
            return _no_shift_response(nas)
        counter = active_shift.counter
        cashier = request.user

        try:
            result = BillingCoreService.process_multi_tender_payment(
                invoice_id=inv_id,
                cashier=cashier,
                split_payments=split_payments,
                counter=counter,
                shift=active_shift,
                notes=notes
            )
            unlocks = CashierWorkspaceService.emit_clinical_unlocks(result['invoice'])
            return Response({
                'invoice': InvoiceSerializer(result['invoice']).data,
                'payments': PaymentSerializer(result['payments'], many=True).data,
                'total_paid_now': float(result['total_paid_now']),
                'remaining_balance': float(result['remaining_balance']),
                'receipt_token': result['receipt_token'],
                'status': result['status'],
                'clinical_unlocks': unlocks
            }, status=status.HTTP_200_OK)
        except Invoice.DoesNotExist:
            return Response({'error': 'Invoice not found'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as ve:
            return Response({'error': str(ve)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ShiftOpenView(APIView):
    """Cashier opens their counter by declaring the float (denomination breakdown preferred)."""
    permission_classes = [IsCashierOrAbove]

    def post(self, request):
        data = request.data
        client_ip = request.META.get('HTTP_X_FORWARDED_FOR')
        if client_ip:
            client_ip = client_ip.split(',')[0].strip()
        else:
            client_ip = request.META.get('REMOTE_ADDR')
        if not client_ip or client_ip == '127.0.0.1':
            client_ip = data.get('client_ip') or client_ip
        try:
            shift = CounterShiftControlService.open_shift(
                cashier=request.user,
                counter_code=data.get('counter_code'),
                opening_float=data.get('opening_float'),
                denominations=data.get('denominations') or None,
                client_ip=client_ip
            )
            return Response(CounterShiftControlService.shift_summary(shift), status=status.HTTP_201_CREATED)
        except PermissionError as pe:
            return Response({'error': str(pe)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as ve:
            return Response({'error': str(ve)}, status=status.HTTP_400_BAD_REQUEST)


class ShiftCurrentView(APIView):
    """The caller's own shift: register summary, expected drawer cash, utilisation and recent transactions."""
    permission_classes = [IsCashierOrAbove]

    def get(self, request):
        if _assist_shift_id(request):
            try:
                shift = _acting_shift(request)
            except NoActiveShift as nas:
                return Response({**CounterShiftControlService.shift_summary(None), 'counters': [], 'history': [],
                                 'assist': {'active': False, 'ended': True, 'detail': str(nas)}}, status=status.HTTP_200_OK)
            data = CounterShiftControlService.shift_summary(shift)
            data['assist'] = SupervisorGovernanceService.assist_context(shift, request.user)
            data['counters'], data['history'] = [], []
            return Response(data, status=status.HTTP_200_OK)
        shift = CounterShiftControlService.get_open_shift(request.user)
        if not shift:
            # After submitting, the cashier still sees the closing awaiting sign-off
            shift = CounterShift.objects.filter(
                cashier=request.user, status__in=[ShiftStatus.PENDING_APPROVAL, ShiftStatus.UNDER_INVESTIGATION]
            ).select_related('counter').order_by('-closing_time').first()
        data = CounterShiftControlService.shift_summary(shift)
        occupied = {
            sh.counter_id: CounterShiftControlService._name(sh.cashier)
            for sh in CounterShift.objects.filter(status=ShiftStatus.OPEN).select_related('cashier')
        }
        data['counters'] = [
            {'code': c.code, 'name': c.name, 'location': c.get_station_location_display(), 'occupied_by': occupied.get(c.id)}
            for c in BillingCounter.objects.filter(is_active=True)
        ]
        data['history'] = CounterShiftControlService.shift_history(request.user)
        return Response(data, status=status.HTTP_200_OK)


class ShiftCloseView(APIView):
    """Cashier submits the closing count (denominations + EDC/UPI batch totals) for supervisor sign-off."""
    permission_classes = [IsCashierOrAbove]

    def post(self, request):
        data = request.data
        try:
            shift = CounterShiftControlService.submit_closing(
                request.user,
                shift_id=data.get('shift_id') or data.get('shiftId'),
                denominations=data.get('denominations') or None,
                physical_cash=data.get('physical_cash_count'),
                card_total=data.get('card_total', data.get('edc_total')),
                upi_total=data.get('upi_total'),
                note=data.get('notes') or data.get('variance_note') or ''
            )
            return Response(CounterShiftControlService.shift_summary(shift), status=status.HTTP_200_OK)
        except NoActiveShift as nas:
            return _no_shift_response(nas)
        except PermissionError as pe:
            return Response({'error': str(pe)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as ve:
            return Response({'error': str(ve)}, status=status.HTTP_400_BAD_REQUEST)


class ShiftCashPickupView(APIView):
    """Cashier: request a pickup for their own drawer. Supervisor: execute a pickup on another cashier's drawer."""
    permission_classes = [IsCashierOrAbove]

    def post(self, request):
        data = request.data
        shift_id = data.get('shift_id')
        try:
            if shift_id:
                if not CashierWorkspaceService.is_supervisor(request.user):
                    return Response({'error': 'Only a Billing Supervisor or Billing Admin can collect a cash pickup.'},
                                    status=status.HTTP_403_FORBIDDEN)
                voucher = CounterShiftControlService.execute_cash_pickup(
                    request.user, shift_id, amount=data.get('amount'), reason=data.get('reason'), notes=data.get('notes', '')
                )
            else:
                voucher = CounterShiftControlService.request_pickup(request.user, notes=data.get('notes', ''))
            return Response({
                'id': str(voucher.id), 'voucher_number': voucher.voucher_number, 'shift_id': str(voucher.shift_id),
                'amount': float(voucher.amount), 'reason': voucher.reason, 'status': voucher.status,
                'supervisor': CounterShiftControlService._name(voucher.supervisor) or None
            }, status=status.HTTP_201_CREATED)
        except CounterShift.DoesNotExist:
            return Response({'error': 'Shift not found'}, status=status.HTTP_404_NOT_FOUND)
        except NoActiveShift as nas:
            return _no_shift_response(nas)
        except PermissionError as pe:
            return Response({'error': str(pe)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as ve:
            return Response({'error': str(ve)}, status=status.HTTP_400_BAD_REQUEST)


class ShiftSupervisorSignoffView(APIView):
    """Supervisor reviews a submitted closing: SIGN_OFF (matched), SIGN_OFF_WITH_VARIANCE or INVESTIGATE."""
    permission_classes = [IsBillingSupervisorOrAbove]

    def post(self, request, pk):
        try:
            shift = CounterShiftControlService.supervisor_signoff(
                request.user, pk, request.data.get('action'), request.data.get('finding', '')
            )
            return Response(CounterShiftControlService.shift_summary(shift, include_register=False), status=status.HTTP_200_OK)
        except CounterShift.DoesNotExist:
            return Response({'error': 'Shift not found'}, status=status.HTTP_404_NOT_FOUND)
        except PermissionError as pe:
            return Response({'error': str(pe)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as ve:
            return Response({'error': str(ve)}, status=status.HTTP_400_BAD_REQUEST)


class ShiftSupervisorBoardView(APIView):
    """Live drawers (utilisation vs the drawer limit) and closing submissions for supervisor reconciliation."""
    permission_classes = [IsBillingSupervisorOrAbove]

    def get(self, request):
        return Response(CounterShiftControlService.supervisor_board(), status=status.HTTP_200_OK)


class VaultHandoverView(APIView):
    """Vault Transfer Event: signed-off cash bags move to the central treasury ledger."""
    permission_classes = [IsBillingSupervisorOrAbove]

    def post(self, request):
        try:
            handover = CounterShiftControlService.vault_handover(
                request.user, shift_ids=request.data.get('shift_ids') or None, notes=request.data.get('notes', '')
            )
            return Response({
                'handover_number': handover.handover_number, 'total_cash': float(handover.total_cash),
                'shift_count': handover.shifts.count(), 'supervisor': CounterShiftControlService._name(handover.supervisor)
            }, status=status.HTTP_201_CREATED)
        except ValueError as ve:
            return Response({'error': str(ve)}, status=status.HTTP_400_BAD_REQUEST)


class InvoiceReceiptDetailView(APIView):
    permission_classes = [IsCashierOrAbove]

    def get(self, request, pk):
        details = BillingCoreService.get_receipt_details(pk)
        if not details:
            return Response({'error': 'Invoice receipt not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(details, status=status.HTTP_200_OK)


# --- PHASE 1: CHARGE QUEUE, ADVANCE DEPOSITS, LEDGER & REFUNDS ---

def _resolve_patient(identifier):
    if not identifier:
        return None
    try:
        import uuid
        uuid.UUID(str(identifier))
        return Patient.objects.filter(Q(id=identifier) | Q(uhid=identifier)).first()
    except (ValueError, AttributeError):
        return Patient.objects.filter(uhid=identifier).first()


class BillableChargeItemListCreateView(APIView):
    permission_classes = [IsCashierOrAbove]

    def get(self, request):
        patient_id = request.query_params.get('patient') or request.query_params.get('patient_id')
        uhid = request.query_params.get('uhid')
        dept = request.query_params.get('department')
        item_status = request.query_params.get('status')

        qs = BillableChargeItem.objects.select_related('patient', 'invoice').all()
        if patient_id:
            qs = qs.filter(patient_id=patient_id)
        if uhid:
            qs = qs.filter(patient__uhid=uhid)
        if dept:
            qs = qs.filter(department=dept.upper())
        if item_status:
            qs = qs.filter(status=item_status.upper())

        return Response(BillableChargeItemSerializer(qs, many=True).data)

    def post(self, request):
        data = request.data
        patient_id = data.get('patient') or data.get('patient_id') or data.get('patientId')
        patient = _resolve_patient(patient_id)
        if not patient:
            return Response({'error': 'Valid patient ID or UHID is required'}, status=status.HTTP_400_BAD_REQUEST)

        unit_price = Decimal(str(data.get('unit_price') or data.get('unitPrice', 0.0)))
        qty = int(data.get('quantity') or data.get('qty', 1))
        discount_amount = Decimal(str(data.get('discount_amount') or data.get('discountAmount', 0.0)))
        tax_rate = Decimal(str(data.get('tax_rate') or data.get('taxRate', 0.0)))

        line_base = unit_price * qty
        line_sub = max(Decimal('0.00'), line_base - discount_amount)
        tax_amount = (line_sub * tax_rate / Decimal('100.00')).quantize(Decimal('0.01'))
        total_amount = Decimal(str(data.get('total_amount') or data.get('totalAmount') or (line_sub + tax_amount)))

        charge = BillableChargeItem.objects.create(
            patient=patient,
            department=data.get('department', 'GENERAL').upper(),
            service_code=data.get('service_code') or data.get('serviceCode', ''),
            service_name=data.get('service_name') or data.get('serviceName') or data.get('description', 'Service Charge'),
            unit_price=unit_price,
            quantity=qty,
            discount_amount=discount_amount,
            tax_rate=tax_rate,
            tax_amount=tax_amount,
            total_amount=total_amount,
            source_reference_id=data.get('source_reference_id') or data.get('sourceReferenceId'),
            status=ChargeItemStatus.PENDING
        )
        return Response(BillableChargeItemSerializer(charge).data, status=status.HTTP_201_CREATED)


class PatientDepositListCreateView(APIView):
    permission_classes = [IsCashierOrAbove]

    def get(self, request):
        patient_id = request.query_params.get('patient') or request.query_params.get('patient_id')
        uhid = request.query_params.get('uhid')
        dep_status = request.query_params.get('status')

        qs = PatientDeposit.objects.select_related('patient', 'counter', 'cashier').all()
        if patient_id:
            qs = qs.filter(patient_id=patient_id)
        if uhid:
            qs = qs.filter(patient__uhid=uhid)
        if dep_status:
            qs = qs.filter(status=dep_status.upper())

        return Response(PatientDepositSerializer(qs, many=True).data)

    def post(self, request):
        data = request.data
        patient_id = data.get('patient') or data.get('patient_id') or data.get('patientId')
        patient = _resolve_patient(patient_id)
        if not patient:
            return Response({'error': 'Valid patient ID or UHID is required'}, status=status.HTTP_400_BAD_REQUEST)

        amount = Decimal(str(data.get('amount') or data.get('deposit_amount') or 0.0))
        tender_mode = data.get('tender_mode') or data.get('tenderMode', 'CASH')
        notes = data.get('notes', '')
        txn_ref = data.get('transaction_reference') or data.get('transactionReference')
        try:
            shift = _acting_shift(request)
        except NoActiveShift as nas:
            return _no_shift_response(nas)

        try:
            deposit = BillingCoreService.create_patient_deposit(
                patient=patient,
                amount=amount,
                tender_mode=tender_mode,
                cashier=request.user,
                counter=shift.counter,
                notes=notes,
                transaction_reference=txn_ref,
                shift=shift
            )
            return Response(PatientDepositSerializer(deposit).data, status=status.HTTP_201_CREATED)
        except ValueError as ve:
            return Response({'error': str(ve)}, status=status.HTTP_400_BAD_REQUEST)


class PatientLedgerDetailView(APIView):
    permission_classes = [IsBillingStaffOrReadOnly]

    def get(self, request, uhid):
        try:
            ledger_data = BillingCoreService.get_patient_ledger(uhid)
            return Response(PatientLedgerSerializer(ledger_data).data, status=status.HTTP_200_OK)
        except ValueError as ve:
            return Response({'error': str(ve)}, status=status.HTTP_404_NOT_FOUND)


class RefundRequestCreateView(APIView):
    permission_classes = [IsCashierOrAbove]

    def get(self, request):
        invoice_id = request.query_params.get('invoice') or request.query_params.get('invoice_id')
        refund_status = request.query_params.get('status')
        qs = RefundRequest.objects.select_related('invoice', 'patient', 'initiated_by', 'approved_by').all()
        if invoice_id:
            qs = qs.filter(invoice_id=invoice_id)
        if refund_status:
            qs = qs.filter(status=refund_status.upper())
        return Response(RefundRequestSerializer(qs, many=True).data)

    def post(self, request):
        data = request.data
        invoice_id = data.get('invoice_id') or data.get('invoiceId') or data.get('invoice')
        amount = Decimal(str(data.get('amount') or data.get('requested_amount') or 0.0))
        reason = data.get('reason', '')
        clinical_justification = data.get('clinical_justification') or data.get('clinicalJustification', '')
        payment_id = data.get('payment_id') or data.get('paymentId')

        if not invoice_id:
            return Response({'error': 'invoice_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        if not reason:
            return Response({'error': 'Refund reason is mandatory'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            refund = RefundWorkflowService.initiate_refund_request(
                invoice_id=invoice_id,
                amount=amount,
                reason=reason,
                clinical_justification=clinical_justification,
                payment_id=payment_id,
                requested_by=request.user if request.user.is_authenticated else None,
                item_ids=data.get('item_ids') or data.get('itemIds') or None,
                shift=_optional_acting_shift(request)
            )
            return Response(RefundRequestSerializer(refund).data, status=status.HTTP_201_CREATED)
        except Invoice.DoesNotExist:
            return Response({'error': 'Invoice not found'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as ve:
            return Response({'error': str(ve)}, status=status.HTTP_400_BAD_REQUEST)


class RefundApproveDisburseView(APIView):
    permission_classes = [IsBillingSupervisorOrAbove]

    def post(self, request, pk):
        data = request.data
        disbursed_tender = data.get('disbursed_tender', 'CASH')
        supervisor = request.user if request.user.is_authenticated else None

        try:
            result = RefundWorkflowService.approve_and_disburse_refund(
                refund_id=pk,
                supervisor=supervisor,
                disbursed_tender=disbursed_tender,
                disbursed_shift=_optional_acting_shift(request)
            )
            return Response({
                'refund_request': RefundRequestSerializer(result['refund_request']).data,
                'credit_note': CreditNoteSerializer(result['credit_note']).data,
                'invoice': InvoiceSerializer(result['invoice']).data
            }, status=status.HTTP_200_OK)
        except RefundRequest.DoesNotExist:
            return Response({'error': 'Refund request not found'}, status=status.HTTP_404_NOT_FOUND)
        except NoActiveShift as nas:
            return _no_shift_response(nas)
        except PermissionError as pe:
            return Response({'error': str(pe)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as ve:
            return Response({'error': str(ve)}, status=status.HTTP_400_BAD_REQUEST)


class BillingReceiptListView(APIView):
    permission_classes = [IsBillingStaffOrReadOnly]

    def get(self, request):
        invoice_id = request.query_params.get('invoice_id')
        receipt_number = request.query_params.get('receipt_number')
        uhid = request.query_params.get('uhid')

        qs = BillingReceipt.objects.select_related('invoice', 'patient', 'payment', 'issued_by').all()
        if invoice_id:
            qs = qs.filter(invoice_id=invoice_id)
        if receipt_number:
            qs = qs.filter(receipt_number=receipt_number)
        if uhid:
            qs = qs.filter(patient__uhid=uhid)

        return Response(BillingReceiptSerializer(qs, many=True).data)


class CreditNoteListView(APIView):
    permission_classes = [IsBillingStaffOrReadOnly]

    def get(self, request):
        invoice_id = request.query_params.get('invoice_id')
        credit_note_number = request.query_params.get('credit_note_number')

        qs = CreditNote.objects.select_related('invoice', 'refund_request', 'patient', 'issued_by').all()
        if invoice_id:
            qs = qs.filter(invoice_id=invoice_id)
        if credit_note_number:
            qs = qs.filter(credit_note_number=credit_note_number)

        return Response(CreditNoteSerializer(qs, many=True).data)


# --- PHASE 2: DEPARTMENT CHARGE INTEGRATION & GATING VIEWS ---

class DepartmentChargeEmitView(APIView):
    permission_classes = [IsHospitalStaff]

    def post(self, request):
        data = request.data
        dept = (data.get('department') or data.get('source_department') or '').upper()

        if dept == 'OPD' and (data.get('appointment_id') or data.get('appointmentId')):
            apt_id = data.get('appointment_id') or data.get('appointmentId')
            try:
                res = DepartmentChargeIntegrationService.emit_opd_consultation_charge(apt_id)
                return Response({
                    'charge_item': BillableChargeItemSerializer(res['charge_item']).data,
                    'charge_event': DepartmentChargeEventSerializer(res['charge_event']).data if res.get('charge_event') else None,
                    'already_existed': res.get('already_existed', False)
                }, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        elif dept == 'LAB' and (data.get('lab_order_id') or data.get('order_id') or data.get('labOrderId')):
            order_id = data.get('lab_order_id') or data.get('order_id') or data.get('labOrderId')
            try:
                results = DepartmentChargeIntegrationService.emit_lab_test_charges(order_id)
                serialized = [
                    {
                        'charge_item': BillableChargeItemSerializer(r['charge_item']).data,
                        'charge_event': DepartmentChargeEventSerializer(r['charge_event']).data if r.get('charge_event') else None,
                        'already_existed': r.get('already_existed', False)
                    }
                    for r in results
                ]
                return Response({'items': serialized}, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        elif dept == 'PHARMACY' and (data.get('dispense_order_id') or data.get('dispenseOrderId') or data.get('order_id')):
            order_id = data.get('dispense_order_id') or data.get('dispenseOrderId') or data.get('order_id')
            routing = data.get('routing', 'PAY_AT_RECEPTION')
            try:
                res = DepartmentChargeIntegrationService.emit_pharmacy_dispense_charge(order_id, routing=routing)
                return Response({
                    'charge_item': BillableChargeItemSerializer(res['charge_item']).data,
                    'charge_event': DepartmentChargeEventSerializer(res['charge_event']).data if res.get('charge_event') else None,
                    'already_existed': res.get('already_existed', False)
                }, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # Generic items emission payload
        patient_id = data.get('patient') or data.get('patient_id') or data.get('patientId')
        patient = _resolve_patient(patient_id)
        if not patient:
            return Response({'error': 'Valid patient or patient_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        items_data = data.get('items', [])
        encounter_type = data.get('encounter_type') or data.get('encounterType', 'OPD')
        encounter_id = data.get('encounter_id') or data.get('encounterId', '')
        source_dept = dept or 'GENERAL'

        if not items_data:
            items_data = [data]

        created_items = []
        for raw in items_data:
            code = raw.get('service_code') or raw.get('serviceCode', '')
            name = raw.get('service_name') or raw.get('serviceName') or raw.get('description', 'Clinical Service')
            unit_price = Decimal(str(raw.get('unit_price') or raw.get('unitPrice', 0.0)))
            qty = int(raw.get('quantity') or raw.get('qty', 1))
            disc_amt = Decimal(str(raw.get('discount_amount') or raw.get('discountAmount', 0.0)))
            tax_rate = Decimal(str(raw.get('tax_rate') or raw.get('taxRate', 0.0)))
            tax_amt = (unit_price * qty * tax_rate / Decimal('100.00')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            total = (unit_price * qty) - disc_amt + tax_amt
            priority = raw.get('priority') or ('STAT' if raw.get('is_stat') else 'ROUTINE')

            c_item = BillableChargeItem.objects.create(
                patient=patient,
                department=source_dept,
                service_code=code,
                service_name=name,
                unit_price=unit_price,
                quantity=qty,
                discount_amount=disc_amt,
                tax_rate=tax_rate,
                tax_amount=tax_amt,
                total_amount=total,
                source_reference_id=str(encounter_id) if encounter_id else None,
                priority=priority,
                status=ChargeItemStatus.PENDING
            )

            c_event = DepartmentChargeEvent.objects.create(
                source_department=source_dept,
                patient=patient,
                encounter_type=encounter_type,
                encounter_id=str(encounter_id) if encounter_id else None,
                tariff_code=code,
                service_name=name,
                quantity=qty,
                unit_price=unit_price,
                total_amount=total,
                status=DepartmentChargeEventStatus.QUEUED,
                charge_item=c_item,
                metadata=raw.get('metadata', {})
            )
            created_items.append({
                'charge_item': BillableChargeItemSerializer(c_item).data,
                'charge_event': DepartmentChargeEventSerializer(c_event).data
            })

        return Response({'items': created_items}, status=status.HTTP_201_CREATED)


class DepartmentChargeQueueView(APIView):
    permission_classes = [IsCashierOrAbove]

    def get(self, request):
        dept = request.query_params.get('department')
        uhid = request.query_params.get('uhid')
        urgency = request.query_params.get('urgency') or request.query_params.get('priority')
        search = request.query_params.get('search')

        queue = DepartmentChargeIntegrationService.get_unbilled_charges_queue(
            department=dept,
            uhid=uhid,
            urgency=urgency,
            search=search
        )
        return Response(queue, status=status.HTTP_200_OK)


class ClinicalGatingClearanceCheckView(APIView):
    permission_classes = [IsHospitalStaff]

    def get(self, request):
        action = request.query_params.get('action') or GatingAction.LAB_SAMPLE_COLLECTION
        ref_id = (
            request.query_params.get('order_id') or
            request.query_params.get('orderId') or
            request.query_params.get('reference_id') or
            request.query_params.get('referenceId')
        )
        dept = request.query_params.get('department')

        if not ref_id:
            return Response({'error': 'reference_id or order_id parameter is required'}, status=status.HTTP_400_BAD_REQUEST)

        clearance = DepartmentChargeIntegrationService.check_clinical_clearance(
            action=action,
            reference_id=ref_id,
            department=dept
        )
        return Response(clearance, status=status.HTTP_200_OK)


class DepartmentChargeCancelView(APIView):
    permission_classes = [IsHospitalStaff]

    def post(self, request):
        data = request.data
        source_ref = (
            data.get('source_reference_id') or
            data.get('sourceReferenceId') or
            data.get('order_id') or
            data.get('orderId')
        )
        dept = data.get('department')
        reason = data.get('reason', '')

        if not source_ref:
            return Response({'error': 'source_reference_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        result = DepartmentChargeIntegrationService.cancel_charge_event(
            source_reference_id=str(source_ref),
            department=dept,
            reason=reason
        )
        return Response(result, status=status.HTTP_200_OK)


class DepartmentGatingRuleListUpdateView(APIView):
    permission_classes = [IsStaffReadAdminWrite]

    def get(self, request):
        rules = DepartmentGatingRule.objects.all().order_by('department', 'gating_action')
        return Response(DepartmentGatingRuleSerializer(rules, many=True).data)

    def post(self, request):
        data = request.data
        action = data.get('gating_action')
        is_hard_gate = bool(data.get('is_hard_gate', True))
        dept = data.get('department', 'LAB')
        desc = data.get('description', '')

        if not action:
            return Response({'error': 'gating_action is required'}, status=status.HTTP_400_BAD_REQUEST)

        rule, created = DepartmentGatingRule.objects.update_or_create(
            gating_action=action,
            defaults={
                'department': dept,
                'is_hard_gate': is_hard_gate,
                'description': desc
            }
        )
        return Response(DepartmentGatingRuleSerializer(rule).data, status=status.HTTP_200_OK)


# --- PHASE 3: BILLING EXECUTIVE / CASHIER WORKSPACE VIEWS ---

def _approval_required_response(exc):
    guard = dict(exc.guard or {})
    guard.pop('approved_by', None)
    return Response({
        'error': 'Supervisor Approval Required',
        'detail': guard.get('reason'),
        'requires_approval': True,
        'guard': guard
    }, status=status.HTTP_403_FORBIDDEN)


def _no_shift_response(exc):
    return Response({'error': 'No Active Shift', 'detail': str(exc), 'requires_shift': True}, status=status.HTTP_400_BAD_REQUEST)


ASSIST_HEADER = 'X-Billing-Assist-Shift'


def _assist_shift_id(request):
    return request.headers.get(ASSIST_HEADER) or None


def _acting_shift(request):
    """Phase 4 shift guard: money only moves through the acting user's own OPEN shift (raises NoActiveShift).
    Phase 5 counter mode: a supervisor sending X-Billing-Assist-Shift posts to that cashier's open shift instead
    (the transaction is tagged assisted_by on save)."""
    assist = _assist_shift_id(request)
    if assist:
        try:
            return SupervisorGovernanceService.resolve_assist_shift(request.user, assist)
        except PermissionError as pe:
            raise NoActiveShift(str(pe))
    return CounterShiftControlService.validate_active_shift(request.user)


def _optional_acting_shift(request):
    """Shift context for actions that do not move money (drafts, requests): the assisted or own open shift, if any."""
    try:
        return _acting_shift(request)
    except NoActiveShift:
        return None


def _counter_and_shift(request):
    shift = _acting_shift(request)
    return shift.counter, shift


class CashierDashboardView(APIView):
    permission_classes = [IsCashierOrAbove]

    def get(self, request):
        data = CashierWorkspaceService.get_dashboard(
            cashier=request.user,
            counter_code=request.query_params.get('counter_code')
        )
        if _assist_shift_id(request):
            try:
                shift = _acting_shift(request)
                data['shift'] = CounterShiftControlService.shift_summary(shift, include_register=False)
                data['assist'] = SupervisorGovernanceService.assist_context(shift, request.user)
            except NoActiveShift as nas:
                data['shift'] = CounterShiftControlService.shift_summary(None)
                data['assist'] = {'active': False, 'ended': True, 'detail': str(nas)}
        return Response(data, status=status.HTTP_200_OK)


class CashierLiveQueueView(APIView):
    permission_classes = [IsCashierOrAbove]

    def get(self, request):
        data = CashierWorkspaceService.get_live_queue(
            department=request.query_params.get('department'),
            search=request.query_params.get('search'),
            urgency=request.query_params.get('urgency') or request.query_params.get('priority')
        )
        return Response(data, status=status.HTTP_200_OK)


class CashierPatientWorkspaceView(APIView):
    permission_classes = [IsCashierOrAbove]

    def get(self, request, uhid):
        try:
            return Response(CashierWorkspaceService.get_patient_workspace(uhid), status=status.HTTP_200_OK)
        except ValueError as ve:
            return Response({'error': str(ve)}, status=status.HTTP_404_NOT_FOUND)


class CashierBillAndCollectView(APIView):
    """Consolidate selected unbilled charges into an invoice (discount-guarded) and optionally settle it in one step."""
    permission_classes = [IsCashierOrAbove]

    def post(self, request):
        data = request.data
        patient = _resolve_patient(data.get('patient') or data.get('patient_id') or data.get('uhid'))
        if not patient:
            return Response({'error': 'Valid patient ID or UHID is required'}, status=status.HTTP_400_BAD_REQUEST)
        charge_ids = data.get('charge_ids') or data.get('chargeIds') or []
        if not charge_ids:
            return Response({'error': 'Select at least one unbilled charge.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            counter, shift = _counter_and_shift(request)
        except NoActiveShift as nas:
            return _no_shift_response(nas)
        split_payments = data.get('split_payments') or []
        try:
            invoice = CashierWorkspaceService.consolidate_with_guard(
                request.user, patient, charge_ids,
                discount_amount=data.get('discount_amount'),
                discount_percent=data.get('discount_percent'),
                discount_reason=data.get('discount_reason', ''),
                approval_request_id=data.get('approval_request_id'),
                counter=counter, shift=shift,
                category=data.get('category'),
                encounter_type=data.get('encounter_type', 'OPD')
            )
            response = {'invoice': InvoiceSerializer(invoice).data, 'payment': None, 'clinical_unlocks': []}
            if split_payments:
                check = CashierWorkspaceService.validate_tender_split(invoice.balance, split_payments)
                if check['errors'] or check['is_over_allocated']:
                    return Response({
                        'error': 'Invalid tender allocation.',
                        'tender_check': check,
                        'invoice': response['invoice']
                    }, status=status.HTTP_400_BAD_REQUEST)
                result = BillingCoreService.process_multi_tender_payment(
                    invoice_id=str(invoice.id), cashier=request.user,
                    split_payments=split_payments, counter=counter, shift=shift
                )
                response['invoice'] = InvoiceSerializer(result['invoice']).data
                response['payment'] = {
                    'payments': PaymentSerializer(result['payments'], many=True).data,
                    'total_paid_now': float(result['total_paid_now']),
                    'remaining_balance': float(result['remaining_balance']),
                    'receipt_token': result['receipt_token'],
                    'status': result['status']
                }
                response['clinical_unlocks'] = CashierWorkspaceService.emit_clinical_unlocks(result['invoice'])
            return Response(response, status=status.HTTP_201_CREATED)
        except DiscountApprovalRequired as dar:
            return _approval_required_response(dar)
        except ValueError as ve:
            return Response({'error': str(ve)}, status=status.HTTP_400_BAD_REQUEST)


class CashierQuickWalkinView(APIView):
    permission_classes = [IsCashierOrAbove]

    def post(self, request):
        data = request.data
        patient = None
        patient_ref = data.get('patient') or data.get('patient_id')
        if patient_ref:
            patient = _resolve_patient(patient_ref)
        try:
            _, shift = _counter_and_shift(request)
        except NoActiveShift as nas:
            return _no_shift_response(nas)
        try:
            result = CashierWorkspaceService.quick_walkin_settlement(
                cashier=request.user,
                items=data.get('items') or [],
                split_payments=data.get('split_payments') or [],
                patient=patient,
                patient_data={
                    'name': data.get('patient_name') or data.get('name'),
                    'uhid': data.get('uhid'),
                    'phone': data.get('phone') or data.get('mobile'),
                    'gender': data.get('gender'),
                    'date_of_birth': data.get('date_of_birth')
                },
                discount_amount=data.get('discount_amount'),
                discount_percent=data.get('discount_percent'),
                discount_reason=data.get('discount_reason', ''),
                approval_request_id=data.get('approval_request_id'),
                counter_code=data.get('counter_code'),
                shift=shift
            )
            pr = result['payment_result']
            return Response({
                'invoice': InvoiceSerializer(result['invoice']).data,
                'patient_uhid': result['patient'].uhid,
                'receipt_token': pr['receipt_token'],
                'total_paid_now': float(pr['total_paid_now']),
                'remaining_balance': float(pr['remaining_balance']),
                'status': pr['status']
            }, status=status.HTTP_201_CREATED)
        except DiscountApprovalRequired as dar:
            return _approval_required_response(dar)
        except ValueError as ve:
            return Response({'error': str(ve)}, status=status.HTTP_400_BAD_REQUEST)


class CashierAddServiceView(APIView):
    """Add a service to a patient's unbilled account at the counter. Price always comes from TariffMaster."""
    permission_classes = [IsCashierOrAbove]

    def post(self, request):
        data = request.data
        patient = _resolve_patient(data.get('patient') or data.get('patient_id') or data.get('uhid'))
        if not patient:
            return Response({'error': 'Valid patient ID or UHID is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            charge = CashierWorkspaceService.add_counter_service(
                request.user, patient, data.get('service_code') or data.get('code'),
                data.get('qty', data.get('quantity', 1))
            )
            return Response(BillableChargeItemSerializer(charge).data, status=status.HTTP_201_CREATED)
        except (ValueError, TypeError) as ve:
            return Response({'error': str(ve)}, status=status.HTTP_400_BAD_REQUEST)


class CashierRemoveServiceView(APIView):
    permission_classes = [IsCashierOrAbove]

    def post(self, request, pk):
        try:
            charge = CashierWorkspaceService.remove_counter_service(pk)
            return Response(BillableChargeItemSerializer(charge).data, status=status.HTTP_200_OK)
        except PermissionError as pe:
            return Response({'error': str(pe)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as ve:
            return Response({'error': str(ve)}, status=status.HTTP_400_BAD_REQUEST)


class CashierDraftCreateView(APIView):
    """Save selected charges as a non-fiscal DRAFT on the patient's account (discount-guarded)."""
    permission_classes = [IsCashierOrAbove]

    def post(self, request):
        data = request.data
        patient = _resolve_patient(data.get('patient') or data.get('patient_id') or data.get('uhid'))
        if not patient:
            return Response({'error': 'Valid patient ID or UHID is required'}, status=status.HTTP_400_BAD_REQUEST)
        charge_ids = data.get('charge_ids') or []
        if not charge_ids:
            return Response({'error': 'Select at least one unbilled charge.'}, status=status.HTTP_400_BAD_REQUEST)
        shift = _optional_acting_shift(request)
        counter = shift.counter if shift else None
        try:
            draft = CashierWorkspaceService.save_draft(
                request.user, patient, charge_ids,
                discount_amount=data.get('discount_amount'),
                discount_percent=data.get('discount_percent'),
                discount_reason=data.get('discount_reason', ''),
                approval_request_id=data.get('approval_request_id'),
                counter=counter, shift=shift,
                encounter_type=data.get('encounter_type', 'OPD')
            )
            return Response(InvoiceSerializer(draft).data, status=status.HTTP_201_CREATED)
        except DiscountApprovalRequired as dar:
            return _approval_required_response(dar)
        except ValueError as ve:
            return Response({'error': str(ve)}, status=status.HTTP_400_BAD_REQUEST)


class CashierDraftDiscardView(APIView):
    permission_classes = [IsCashierOrAbove]

    def post(self, request, pk):
        try:
            released = CashierWorkspaceService.discard_draft(pk)
            return Response({'released_charges': released, 'status': 'DISCARDED'}, status=status.HTTP_200_OK)
        except ValueError as ve:
            return Response({'error': str(ve)}, status=status.HTTP_400_BAD_REQUEST)


class CashierDraftCollectView(APIView):
    """Finalise a draft into a fiscal invoice and settle it in one atomic step."""
    permission_classes = [IsCashierOrAbove]

    def post(self, request, pk):
        data = request.data
        try:
            counter, shift = _counter_and_shift(request)
        except NoActiveShift as nas:
            return _no_shift_response(nas)
        try:
            result = CashierWorkspaceService.collect_draft(
                request.user, pk, data.get('split_payments') or [], counter=counter, shift=shift
            )
        except ValueError as ve:
            return Response({'error': str(ve)}, status=status.HTTP_400_BAD_REQUEST)
        pr = result['payment_result']
        return Response({
            'invoice': InvoiceSerializer(result['invoice']).data,
            'payment': {
                'payments': PaymentSerializer(pr['payments'], many=True).data,
                'total_paid_now': float(pr['total_paid_now']),
                'remaining_balance': float(pr['remaining_balance']),
                'receipt_token': pr['receipt_token'],
                'status': pr['status']
            } if pr else None,
            'clinical_unlocks': result['clinical_unlocks']
        }, status=status.HTTP_200_OK)


class CashierTenderCalculatorView(APIView):
    """Stateless helper: validates Cash + Card + UPI + Deposit = Total and computes change in notes."""
    permission_classes = [IsCashierOrAbove]

    def post(self, request):
        data = request.data
        total = data.get('total') or data.get('amount_due') or 0
        result = {'split': CashierWorkspaceService.validate_tender_split(total, data.get('split_payments') or [])}
        if data.get('cash_received') not in (None, ''):
            cash_due = data.get('cash_due')
            if cash_due in (None, ''):
                cash_due = sum(
                    float(s.get('amount') or 0) for s in (data.get('split_payments') or [])
                    if str(s.get('tender_mode', '')).upper() == 'CASH'
                ) or total
            result['change'] = CashierWorkspaceService.calculate_cash_change(cash_due, data.get('cash_received'))
        return Response(result, status=status.HTTP_200_OK)


class DiscountGuardCheckView(APIView):
    permission_classes = [IsCashierOrAbove]

    def post(self, request):
        data = request.data
        patient = _resolve_patient(data.get('patient') or data.get('uhid')) if (data.get('patient') or data.get('uhid')) else None
        guard = CashierWorkspaceService.evaluate_discount_guard(
            request.user, data.get('gross') or 0,
            discount_amount=data.get('discount_amount'),
            discount_percent=data.get('discount_percent'),
            approval_request_id=data.get('approval_request_id'),
            patient=patient
        )
        guard.pop('approved_by', None)
        return Response(guard, status=status.HTTP_200_OK)


class ApprovalRequestListCreateView(APIView):
    permission_classes = [IsCashierOrAbove]

    def get(self, request):
        qs = SupervisorApprovalRequest.objects.select_related('patient', 'invoice', 'requested_by', 'approved_by')
        req_status = request.query_params.get('status')
        mine = request.query_params.get('mine')
        uhid = request.query_params.get('uhid')
        if req_status:
            qs = qs.filter(status=req_status.upper())
        if uhid:
            qs = qs.filter(patient__uhid=uhid)
        if mine in ('1', 'true', 'True') or not CashierWorkspaceService.is_supervisor(request.user):
            qs = qs.filter(requested_by=request.user)
        return Response(SupervisorApprovalRequestSerializer(qs[:100], many=True).data)

    def post(self, request):
        data = request.data
        patient = _resolve_patient(data.get('patient') or data.get('uhid'))
        invoice = Invoice.objects.filter(id=data.get('invoice_id')).first() if data.get('invoice_id') else None
        if not patient and not invoice:
            return Response({'error': 'patient (or invoice_id) is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            req = CashierWorkspaceService.request_discount_approval(
                requested_by=request.user,
                patient=patient,
                bill_gross=data.get('bill_gross') or (invoice.subtotal if invoice else 0),
                discount_percent=data.get('discount_percent'),
                discount_amount=data.get('discount_amount'),
                reason=data.get('reason', ''),
                notes=data.get('notes', ''),
                invoice=invoice,
                shift=_optional_acting_shift(request)
            )
            return Response(SupervisorApprovalRequestSerializer(req).data, status=status.HTTP_201_CREATED)
        except ValueError as ve:
            return Response({'error': str(ve)}, status=status.HTTP_400_BAD_REQUEST)


class ApprovalRequestDecideView(APIView):
    permission_classes = [IsBillingSupervisorOrAbove]

    def post(self, request, pk):
        decision = str(request.data.get('decision') or request.data.get('action') or '').upper()
        if decision not in ('APPROVE', 'REJECT', 'ESCALATE'):
            return Response({'error': "decision must be 'APPROVE', 'REJECT' or 'ESCALATE'"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            req = SupervisorGovernanceService.decide_approval(
                pk, request.user, decision,
                note=request.data.get('rejection_reason') or request.data.get('note') or '',
                approved_percent=request.data.get('approved_percent')
            )
            return Response(SupervisorApprovalRequestSerializer(req).data, status=status.HTTP_200_OK)
        except SupervisorApprovalRequest.DoesNotExist:
            return Response({'error': 'Approval request not found'}, status=status.HTTP_404_NOT_FOUND)
        except PermissionError as pe:
            return Response({'error': str(pe)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as ve:
            return Response({'error': str(ve)}, status=status.HTTP_400_BAD_REQUEST)


# --- PHASE 5: BILLING SUPERVISOR ---

def _governance_error(exc):
    if isinstance(exc, PermissionError):
        return Response({'error': str(exc)}, status=status.HTTP_403_FORBIDDEN)
    if isinstance(exc, NoActiveShift):
        return _no_shift_response(exc)
    return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class SupervisorDashboardView(APIView):
    """Live counters, oldest approvals, pending refunds and alerts across all counters."""
    permission_classes = [IsBillingSupervisorOrAbove]

    def get(self, request):
        return Response(SupervisorGovernanceService.dashboard(request.user), status=status.HTTP_200_OK)


class SupervisorApprovalQueueView(APIView):
    """Pending (SLA-ordered) and decided-today approval requests with invoice context and limit policy."""
    permission_classes = [IsBillingSupervisorOrAbove]

    def get(self, request):
        return Response(SupervisorGovernanceService.approvals_queue(request.user), status=status.HTTP_200_OK)


class SupervisorApprovalActionView(APIView):
    """APPROVE (optionally at a lower percent), REJECT (note required) or ESCALATE to Billing Admin."""
    permission_classes = [IsBillingSupervisorOrAbove]

    def post(self, request, pk):
        data = request.data
        try:
            req = SupervisorGovernanceService.decide_approval(
                pk, request.user, data.get('action'), note=data.get('note', ''),
                approved_percent=data.get('approved_percent')
            )
            return Response(SupervisorGovernanceService.approval_row(req, request.user), status=status.HTTP_200_OK)
        except SupervisorApprovalRequest.DoesNotExist:
            return Response({'error': 'Approval request not found'}, status=status.HTTP_404_NOT_FOUND)
        except (PermissionError, ValueError) as exc:
            return _governance_error(exc)


class SupervisorRefundQueueView(APIView):
    """Refund requests with the original tender, refunded lines and service-delivery verification."""
    permission_classes = [IsBillingSupervisorOrAbove]

    def get(self, request):
        return Response(SupervisorGovernanceService.refunds_queue(request.user), status=status.HTTP_200_OK)


class SupervisorRefundActionView(APIView):
    """Approve (card/UPI reverse now with a credit note; cash waits for drawer payout), reject or escalate."""
    permission_classes = [IsBillingSupervisorOrAbove]

    def post(self, request, pk):
        data = request.data
        try:
            result = SupervisorGovernanceService.decide_refund(pk, request.user, data.get('action', 'APPROVE'), note=data.get('note', ''))
            refund = RefundRequest.objects.select_related(
                'invoice', 'payment', 'patient', 'initiated_by', 'approved_by', 'requested_shift', 'requested_shift__counter'
            ).get(id=result['refund_request'].id)
            return Response({
                'refund': SupervisorGovernanceService.refund_row(refund, request.user),
                'credit_note': CreditNoteSerializer(result['credit_note']).data if result['credit_note'] else None
            }, status=status.HTTP_200_OK)
        except RefundRequest.DoesNotExist:
            return Response({'error': 'Refund request not found'}, status=status.HTTP_404_NOT_FOUND)
        except (PermissionError, ValueError) as exc:
            return _governance_error(exc)


class RefundCashDisburseView(APIView):
    """Cashier pays an approved cash refund from their own (or the assisted) open drawer."""
    permission_classes = [IsCashierOrAbove]

    def post(self, request, pk):
        try:
            result = SupervisorGovernanceService.pay_cash_refund(pk, request.user, _acting_shift(request))
            return Response({
                'refund_request': RefundRequestSerializer(result['refund_request']).data,
                'credit_note': CreditNoteSerializer(result['credit_note']).data,
                'invoice': InvoiceSerializer(result['invoice']).data
            }, status=status.HTTP_200_OK)
        except RefundRequest.DoesNotExist:
            return Response({'error': 'Refund request not found'}, status=status.HTTP_404_NOT_FOUND)
        except (NoActiveShift, PermissionError, ValueError) as exc:
            return _governance_error(exc)


class InvoiceVoidRequestView(APIView):
    """Cashier asks a supervisor to void an unpaid invoice (charges return to the queue on approval)."""
    permission_classes = [IsCashierOrAbove]

    def post(self, request, pk):
        try:
            req = SupervisorGovernanceService.request_void(
                request.user, pk, request.data.get('reason', ''), notes=request.data.get('notes', ''),
                shift=_optional_acting_shift(request)
            )
            return Response(SupervisorApprovalRequestSerializer(req).data, status=status.HTTP_201_CREATED)
        except Invoice.DoesNotExist:
            return Response({'error': 'Invoice not found'}, status=status.HTTP_404_NOT_FOUND)
        except (PermissionError, ValueError) as exc:
            return _governance_error(exc)


class SupervisorCounterModeView(APIView):
    """Enter or leave counter mode (assisting another cashier's open shift); both are written to the audit stream."""
    permission_classes = [IsBillingSupervisorOrAbove]

    def post(self, request):
        try:
            ctx = SupervisorGovernanceService.counter_mode(request.user, request.data.get('shift_id'), request.data.get('action'))
            return Response(ctx, status=status.HTTP_200_OK)
        except (NoActiveShift, PermissionError, ValueError) as exc:
            return _governance_error(exc)


class SupervisorAuditStreamView(APIView):
    """Flagged financial events (high cash, voids, overrides, refunds, closings, counter mode) for review."""
    permission_classes = [IsBillingSupervisorOrAbove]

    def get(self, request):
        unreviewed = request.query_params.get('unreviewed') in ('1', 'true', 'True')
        return Response(SupervisorGovernanceService.audit_stream(
            counter_code=request.query_params.get('counter') or None, unreviewed_only=unreviewed
        ), status=status.HTTP_200_OK)


class SupervisorAuditReviewView(APIView):
    permission_classes = [IsBillingSupervisorOrAbove]

    def post(self, request, pk):
        try:
            event = SupervisorGovernanceService.mark_reviewed(pk, request.user)
            return Response({'id': str(event.id), 'reviewed': True,
                             'reviewed_at': timezone.localtime(event.reviewed_at).isoformat()}, status=status.HTTP_200_OK)
        except BillingAuditEvent.DoesNotExist:
            return Response({'error': 'Audit event not found'}, status=status.HTTP_404_NOT_FOUND)
        except PermissionError as exc:
            return _governance_error(exc)


# --- PHASE 7: BILLING ADMIN CORE & GOVERNANCE VIEWS ---

class BillingAdminOverviewView(APIView):
    """Revenue Command executive financial dashboard metrics (A-01)."""
    permission_classes = [IsBillingAdminOrAbove]

    def get(self, request):
        ref_date = request.query_params.get('date')
        if ref_date:
            try:
                from datetime import datetime
                ref_date = datetime.strptime(ref_date[:10], '%Y-%m-%d').date()
            except ValueError:
                ref_date = None
        data = BillingAdminGovernanceService.get_revenue_command_overview(ref_date=ref_date)
        return Response(data, status=status.HTTP_200_OK)


class BillingAdminCountersView(APIView):
    """Counters Directory (A-14) listing and new station registration."""
    permission_classes = [IsBillingAdminOrAbove]

    def get(self, request):
        return Response(BillingAdminGovernanceService.list_counters(), status=status.HTTP_200_OK)

    def post(self, request):
        try:
            counter = BillingAdminGovernanceService.create_or_update_counter(request.user, request.data)
            return Response(BillingCounterAdminSerializer(counter).data, status=status.HTTP_201_CREATED)
        except ValueError as ve:
            return Response({'error': str(ve)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class BillingAdminCounterDetailView(APIView):
    """Update counter, toggle active status or hardware bindings (A-14)."""
    permission_classes = [IsBillingAdminOrAbove]

    def patch(self, request, pk):
        try:
            if 'is_active' in request.data and len(request.data) == 1:
                counter = BillingAdminGovernanceService.toggle_counter_status(request.user, pk, request.data['is_active'])
            else:
                data = {**request.data, 'id': pk}
                counter = BillingAdminGovernanceService.create_or_update_counter(request.user, data)
            return Response(BillingCounterAdminSerializer(counter).data, status=status.HTTP_200_OK)
        except BillingCounter.DoesNotExist:
            return Response({'error': 'Counter not found'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as ve:
            return Response({'error': str(ve)}, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, pk):
        return self.patch(request, pk)


class BillingAdminStaffRosterView(APIView):
    """Duty roster weekly grid and shift assignments (A-19)."""
    permission_classes = [IsBillingAdminOrAbove]

    def get(self, request):
        week_start = request.query_params.get('week_start')
        shift_type = request.query_params.get('shift_type')
        data = BillingAdminGovernanceService.get_staff_roster(week_start=week_start, shift_type=shift_type)
        return Response(data, status=status.HTTP_200_OK)

    def post(self, request):
        raw = request.data
        assignments = raw.get('assignments') if isinstance(raw, dict) and 'assignments' in raw else (raw if isinstance(raw, list) else [raw])
        try:
            saved = BillingAdminGovernanceService.assign_roster(request.user, assignments)
            return Response(BillingStaffRosterSerializer(saved, many=True).data, status=status.HTTP_200_OK)
        except ValueError as ve:
            return Response({'error': str(ve)}, status=status.HTTP_400_BAD_REQUEST)


class BillingAdminStaffRosterPublishView(APIView):
    """Publish weekly roster to enforce cashier workstation access (A-19)."""
    permission_classes = [IsBillingAdminOrAbove]

    def post(self, request):
        week_start = request.data.get('week_start')
        count = BillingAdminGovernanceService.publish_roster(request.user, week_start=week_start)
        return Response({'published': True, 'count': count}, status=status.HTTP_200_OK)


class BillingAdminApprovalMatrixView(APIView):
    """Approval Matrix 4-Tier configuration (A-15)."""
    permission_classes = [IsBillingAdminOrAbove]

    def get(self, request):
        matrix = BillingAdminGovernanceService.get_matrix()
        return Response(ApprovalMatrixTierSerializer(matrix, many=True).data, status=status.HTTP_200_OK)

    def put(self, request):
        raw = request.data
        updates = raw.get('tiers') if isinstance(raw, dict) and 'tiers' in raw else (raw if isinstance(raw, list) else [raw])
        try:
            updated = BillingAdminGovernanceService.update_matrix(request.user, updates)
            return Response(ApprovalMatrixTierSerializer(updated, many=True).data, status=status.HTTP_200_OK)
        except ValueError as ve:
            return Response({'error': str(ve)}, status=status.HTTP_400_BAD_REQUEST)


class BillingAdminApprovalMatrixTestRouteView(APIView):
    """Simulate escalation route for financial threshold exceptions (A-15)."""
    permission_classes = [IsBillingAdminOrAbove]

    def post(self, request):
        data = request.data
        action_type = data.get('action_type', 'DISCOUNT')
        amount = data.get('amount', 0)
        percent = data.get('percentage', data.get('percent', 0))
        res = BillingAdminGovernanceService.test_route_request(action_type=action_type, amount=amount, percent=percent)
        return Response(res, status=status.HTTP_200_OK)


class BillingAdminPoliciesView(APIView):
    """Hospital financial policy rules engine (A-16)."""
    permission_classes = [IsBillingAdminOrAbove]

    def get(self, request):
        policies = BillingAdminGovernanceService.get_policies()
        return Response(BillingPolicyRuleSerializer(policies, many=True).data, status=status.HTTP_200_OK)


class BillingAdminPolicyDetailView(APIView):
    """Update financial policy rule parameter values and active state (A-16)."""
    permission_classes = [IsBillingAdminOrAbove]

    def patch(self, request, rule_code):
        try:
            rule = BillingAdminGovernanceService.update_policy(request.user, rule_code, request.data)
            return Response(BillingPolicyRuleSerializer(rule).data, status=status.HTTP_200_OK)
        except ValueError as ve:
            return Response({'error': str(ve)}, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, rule_code):
        return self.patch(request, rule_code)


# --- PHASE 8: INSURANCE / TPA & CORPORATE VIEWS ---

class TPAClaimsListView(APIView):
    """Active cashless claims queue and pre-auth creation (A-07)."""
    permission_classes = [IsCashierOrAbove]

    def get(self, request):
        qs = TPAClaimRecord.objects.select_related('patient', 'corporate_account', 'admission').all()

        payer = request.query_params.get('payer') or request.query_params.get('corporate_account_id')
        if payer:
            qs = qs.filter(Q(corporate_account_id=payer) | Q(corporate_account__code__iexact=payer) | Q(corporate_account__name__icontains=payer))

        pre_auth_status = request.query_params.get('status') or request.query_params.get('pre_auth_status')
        if pre_auth_status and pre_auth_status.upper() != 'ALL':
            qs = qs.filter(pre_auth_status=pre_auth_status.upper())

        claim_status = request.query_params.get('claim_status')
        if claim_status and claim_status.upper() != 'ALL':
            qs = qs.filter(claim_status=claim_status.upper())

        search = request.query_params.get('search')
        if search:
            s = search.strip()
            qs = qs.filter(
                Q(claim_number__icontains=s) |
                Q(policy_number__icontains=s) |
                Q(tpa_member_id__icontains=s) |
                Q(patient__first_name__icontains=s) |
                Q(patient__last_name__icontains=s) |
                Q(patient__uhid__icontains=s)
            )

        pending_only = request.query_params.get('pending_only')
        if pending_only in ('true', '1', True):
            qs = qs.filter(pre_auth_status__in=['PENDING', 'QUERY_RAISED', 'PARTIAL'])

        claims = list(qs[:100])
        # Summary metrics
        total_requested = sum((c.requested_amount for c in claims), Decimal('0.00'))
        total_approved = sum((c.pre_auth_amount for c in claims), Decimal('0.00'))
        pending_count = sum((1 for c in claims if c.pre_auth_status in ['PENDING', 'QUERY_RAISED', 'PARTIAL']))

        return Response({
            'count': len(claims),
            'total_requested': float(total_requested),
            'total_approved': float(total_approved),
            'pending_count': pending_count,
            'claims': TPAClaimRecordSerializer(claims, many=True).data
        }, status=status.HTTP_200_OK)

    def post(self, request):
        data = request.data
        try:
            claim = TPACorporateBillingService.register_pre_auth(
                patient_id=data.get('patient') or data.get('patient_id'),
                corporate_account_id=data.get('corporate_account') or data.get('corporate_account_id'),
                policy_number=data.get('policy_number', ''),
                tpa_member_id=data.get('tpa_member_id', ''),
                requested_amount=Decimal(str(data.get('requested_amount', 0))),
                admission_id=data.get('admission') or data.get('admission_id'),
                source=data.get('source', 'IPD'),
                plan_name=data.get('plan_name', ''),
                non_medical_deductibles=Decimal(str(data.get('non_medical_deductibles', 0))),
                copay_percent=Decimal(str(data.get('copay_percent', 0))),
                room_rent_cap=Decimal(str(data['room_rent_cap'])) if data.get('room_rent_cap') else None,
                user=request.user
            )
            return Response(TPAClaimRecordSerializer(claim).data, status=status.HTTP_201_CREATED)
        except (Patient.DoesNotExist, ValueError) as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class TPAClaimPreAuthDetailView(APIView):
    """Retrieve and update cashless pre-authorization records (A-07 drawerPa)."""
    permission_classes = [IsCashierOrAbove]

    def get(self, request, pk):
        claim = TPAClaimRecord.objects.select_related('patient', 'corporate_account', 'admission').filter(id=pk).first()
        if not claim:
            return Response({'error': 'Claim record not found'}, status=status.HTTP_404_NOT_FOUND)

        data = TPAClaimRecordSerializer(claim).data
        # Include real-time co-pay split breakdown
        split = TPACorporateBillingService.calculate_copay_split(
            total_bill=claim.requested_amount,
            approved_gop=claim.pre_auth_amount,
            non_medical_deductibles=claim.non_medical_deductibles,
            copay_percent=claim.copay_percent,
            room_rent_excess=Decimal('0.00')
        )
        data['split_calculation'] = split
        return Response(data, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        try:
            data = request.data
            claim = TPACorporateBillingService.update_pre_auth(
                claim_id=pk,
                status=data.get('status') or data.get('pre_auth_status'),
                approved_amount=data.get('approved_amount') or data.get('pre_auth_amount'),
                enhancement_amount=data.get('enhancement_amount'),
                gop_letter_number=data.get('gop_letter_number', ''),
                non_medical_deductibles=data.get('non_medical_deductibles'),
                denial_reason=data.get('denial_reason', ''),
                note=data.get('note', ''),
                user=request.user
            )
            return Response(TPAClaimRecordSerializer(claim).data, status=status.HTTP_200_OK)
        except TPAClaimRecord.DoesNotExist:
            return Response({'error': 'Claim record not found'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as ve:
            return Response({'error': str(ve)}, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, pk):
        return self.patch(request, pk)


class TPAClaimDossierView(APIView):
    """Compile and export digital claims pack (invoices, lab reports, discharge summary)."""
    permission_classes = [IsCashierOrAbove]

    def get(self, request, pk):
        claim = TPAClaimRecord.objects.filter(id=pk).first()
        if not claim:
            return Response({'error': 'Claim record not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(claim.dossier_data or {}, status=status.HTTP_200_OK)

    def post(self, request, pk):
        try:
            dossier = TPACorporateBillingService.compile_claim_dossier(pk, user=request.user)
            return Response(dossier, status=status.HTTP_200_OK)
        except TPAClaimRecord.DoesNotExist:
            return Response({'error': 'Claim record not found'}, status=status.HTTP_404_NOT_FOUND)


class TPACoPaySplitCalculateView(APIView):
    """Interactive sandbox calculating patient co-pay vs TPA cashless approved balance."""
    permission_classes = [IsCashierOrAbove]

    def post(self, request):
        data = request.data
        total_bill = data.get('total_bill', 0)
        approved_gop = data.get('approved_gop', 0)
        non_medical = data.get('non_medical_deductibles', 0)
        copay_pct = data.get('copay_percent', 0)
        room_excess = data.get('room_rent_excess', 0)

        res = TPACorporateBillingService.calculate_copay_split(
            total_bill=total_bill,
            approved_gop=approved_gop,
            non_medical_deductibles=non_medical,
            copay_percent=copay_pct,
            room_rent_excess=room_excess
        )
        return Response(res, status=status.HTTP_200_OK)


class InsurancePayersListView(APIView):
    """Insurance plans & TPA rate contracts directory (A-07)."""
    permission_classes = [IsCashierOrAbove]

    def get(self, request):
        TPACorporateBillingService.seed_default_payers_and_mous()
        payers = CorporateAccount.objects.filter(account_type='TPA_INSURANCE', is_active=True).order_by('name')

        result = []
        for p in payers:
            claims_qs = TPAClaimRecord.objects.filter(corporate_account=p)
            open_claims = claims_qs.exclude(claim_status__in=['SETTLED', 'DENIED']).count()
            total_recv = sum((c.pre_auth_amount for c in claims_qs if c.claim_status in ['APPROVED', 'CLAIM_FILED']), Decimal('0.00'))

            serializer_data = CorporateAccountSerializer(p).data
            serializer_data['open_claims_count'] = open_claims
            serializer_data['receivable_amount'] = float(total_recv)
            serializer_data['plans_count'] = len(p.plans_data) if p.plans_data else 1
            result.append(serializer_data)

        return Response(result, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = CorporateAccountSerializer(data=request.data)
        if serializer.is_valid():
            p = serializer.save(account_type='TPA_INSURANCE')
            return Response(CorporateAccountSerializer(p).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CorporateAccountsOverviewView(APIView):
    """Corporate client registry with credit limit utilization meters & aging (A-08)."""
    permission_classes = [IsCashierOrAbove]

    def get(self, request):
        TPACorporateBillingService.seed_default_payers_and_mous()
        corps = CorporateAccount.objects.filter(account_type='CORPORATE').order_by('name')

        result = []
        total_credit_granted = Decimal('0.00')
        total_credit_used = Decimal('0.00')

        for c in corps:
            total_credit_granted += c.credit_limit
            total_credit_used += c.utilized_credit
            headroom = c.available_credit
            util_pct = c.utilization_percentage

            data = CorporateAccountSerializer(c).data
            data['available_headroom'] = float(headroom)
            data['utilization_pct'] = util_pct
            data['warning_flag'] = util_pct >= 85.0 or not c.is_active
            result.append(data)

        return Response({
            'total_corporate_accounts': len(corps),
            'total_credit_granted': float(total_credit_granted),
            'total_credit_utilized': float(total_credit_used),
            'overall_utilization_pct': round(float((total_credit_used / total_credit_granted) * 100), 1) if total_credit_granted > Decimal('0.00') else 0.0,
            'accounts': result
        }, status=status.HTTP_200_OK)


class CorporateVouchersListView(APIView):
    """Corporate credit authorization vouchers list and creation."""
    permission_classes = [IsCashierOrAbove]

    def get(self, request):
        corp_id = request.query_params.get('corporate_account_id') or request.query_params.get('corporate_code')
        qs = CorporateCreditVoucher.objects.select_related('corporate_account', 'patient', 'verified_by').all()
        if corp_id:
            qs = qs.filter(Q(corporate_account_id=corp_id) | Q(corporate_account__code__iexact=corp_id))
        return Response(CorporateCreditVoucherSerializer(qs[:100], many=True).data, status=status.HTTP_200_OK)

    def post(self, request):
        data = request.data
        try:
            voucher = TPACorporateBillingService.issue_corporate_voucher(
                corporate_account_id=data.get('corporate_account') or data.get('corporate_account_id'),
                employee_id=data.get('employee_id', ''),
                employee_name=data.get('employee_name', ''),
                patient_id=data.get('patient') or data.get('patient_id'),
                relationship=data.get('relationship', 'SELF'),
                approved_credit_ceiling=Decimal(str(data.get('approved_credit_ceiling', 0))),
                validity_date=data.get('validity_date') or (timezone.now().date() + timedelta(days=90)),
                notes=data.get('notes', ''),
                user=request.user
            )
            return Response(CorporateCreditVoucherSerializer(voucher).data, status=status.HTTP_201_CREATED)
        except (Patient.DoesNotExist, ValueError) as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class CorporateVoucherVerifyView(APIView):
    """Validate employee entitlement voucher at registration (A-08)."""
    permission_classes = [IsCashierOrAbove]

    def post(self, request):
        data = request.data
        v_num = data.get('voucher_number')
        emp_id = data.get('employee_id')
        corp_code = data.get('corporate_code') or data.get('corporate_account_code')
        amt = Decimal(str(data.get('amount') or data.get('charge_amount') or 0))

        res = TPACorporateBillingService.verify_corporate_voucher(
            voucher_number=v_num,
            employee_id=emp_id,
            corporate_code=corp_code,
            charge_amount=amt,
            user=request.user
        )
        return Response(res, status=status.HTTP_200_OK)


# --- PHASE 9: IPD BILLING & DISCHARGE CLEARANCE VIEWS ---

class IPDAdmissionsOverviewView(APIView):
    """E-04 IPD Running Bills: Real-time overview of active admissions with ledger,
    deposit cover, utilization percentage, and discharge clearance status.
    """
    permission_classes = [IsCashierOrAbove]

    def get(self, request):
        data = IPDRunningLedgerService.list_ipd_admissions_overview()
        return Response(data, status=status.HTTP_200_OK)


class IPDRunningBillDetailView(APIView):
    """Detailed ledger view for a specific admission with category breakdown and deposits."""
    permission_classes = [IsCashierOrAbove]

    def get(self, request, pk):
        try:
            summary = IPDRunningLedgerService.get_running_bill_summary(pk)
            # Also attach itemized entries
            adm = IPDRunningLedgerService._resolve_admission(pk)
            entries = IPDRunningLedger.objects.filter(admission=adm).order_by('-date', '-created_at')
            summary['entries'] = IPDRunningLedgerSerializer(entries, many=True).data
            return Response(summary, status=status.HTTP_200_OK)
        except InpatientAdmission.DoesNotExist:
            return Response({'error': f"Admission '{pk}' not found"}, status=status.HTTP_404_NOT_FOUND)


class IPDRunningChargeAddView(APIView):
    """Add a manual or department procedure line to the running ledger."""
    permission_classes = [IsCashierOrAbove]

    def post(self, request, pk):
        data = request.data
        try:
            entry = IPDRunningLedgerService.add_running_charge(
                admission_id_or_number=pk,
                item_type=data.get('item_type', 'OT_PROCEDURE'),
                description=data.get('description', ''),
                amount=Decimal(str(data.get('amount', 0))),
                service_code=data.get('service_code', ''),
                quantity=int(data.get('quantity', 1)),
                unit_price=Decimal(str(data.get('unit_price'))) if data.get('unit_price') is not None else None,
                entry_date=data.get('date'),
                user=request.user
            )
            return Response(IPDRunningLedgerSerializer(entry).data, status=status.HTTP_201_CREATED)
        except InpatientAdmission.DoesNotExist:
            return Response({'error': f"Admission '{pk}' not found"}, status=status.HTTP_404_NOT_FOUND)
        except (ValueError, TypeError) as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class IPDDischargeChecklistUpdateView(APIView):
    """Update medical discharge checklist flags for an inpatient admission."""
    permission_classes = [IsCashierOrAbove]

    def post(self, request, pk):
        try:
            checklist = request.data.get('checklist', request.data)
            updated = IPDRunningLedgerService.update_discharge_checklist(pk, checklist, user=request.user)
            return Response({'checklist': updated}, status=status.HTTP_200_OK)
        except InpatientAdmission.DoesNotExist:
            return Response({'error': f"Admission '{pk}' not found"}, status=status.HTTP_404_NOT_FOUND)


class IPDDailyTariffAccrualCronView(APIView):
    """Midnight cron trigger: scans active admissions and accrues bed tariff,
    nursing care, and doctor rounds.
    """
    permission_classes = [IsCashierOrAbove]

    def post(self, request):
        target_date = request.data.get('target_date')
        res = IPDRunningLedgerService.accrue_daily_bed_tariffs(target_date=target_date, user=request.user)
        return Response(res, status=status.HTTP_200_OK)


class IPDInterimDemandView(APIView):
    """Issue interim deposit demand letter when running charges exceed deposit threshold."""
    permission_classes = [IsCashierOrAbove]

    def post(self, request):
        data = request.data
        adm_id = data.get('admission') or data.get('admission_id') or data.get('admission_number')
        if not adm_id:
            return Response({'error': 'admission is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            demanded = Decimal(str(data.get('demanded_amount'))) if data.get('demanded_amount') is not None else None
            demand = IPDRunningLedgerService.issue_interim_demand(
                admission_id_or_number=adm_id,
                demanded_amount=demanded,
                notes=data.get('notes', ''),
                user=request.user
            )
            return Response(InterimDepositDemandSerializer(demand).data, status=status.HTTP_201_CREATED)
        except InpatientAdmission.DoesNotExist:
            return Response({'error': f"Admission '{adm_id}' not found"}, status=status.HTTP_404_NOT_FOUND)
        except (ValueError, TypeError) as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class IPDFinalBillConsolidateView(APIView):
    """Consolidate running bill, adjust patient deposits, compute net balance."""
    permission_classes = [IsCashierOrAbove]

    def post(self, request):
        data = request.data
        adm_id = data.get('admission') or data.get('admission_id') or data.get('admission_number')
        if not adm_id:
            return Response({'error': 'admission is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            disc_pct = Decimal(str(data.get('discount_percent', 0)))
            res = IPDRunningLedgerService.consolidate_final_discharge_bill(
                admission_id_or_number=adm_id,
                cashier=request.user,
                discount_percent=disc_pct,
                notes=data.get('notes', '')
            )
            return Response(res, status=status.HTTP_200_OK)
        except InpatientAdmission.DoesNotExist:
            return Response({'error': f"Admission '{adm_id}' not found"}, status=status.HTTP_404_NOT_FOUND)
        except (ValueError, TypeError) as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class IPDDischargeClearanceIssueView(APIView):
    """Financial Discharge Clearance Gate:
    Strictly verifies zero balance before issuing QR-coded gate pass. Rejects if balance > 0
    unless an audited supervisor override reason is provided.
    """
    permission_classes = [IsCashierOrAbove]

    def post(self, request):
        data = request.data
        adm_id = data.get('admission') or data.get('admission_id') or data.get('admission_number')
        if not adm_id:
            return Response({'error': 'admission is required'}, status=status.HTTP_400_BAD_REQUEST)
        override = data.get('override_reason', '')
        checklist = data.get('checklist_confirmed')
        notes = data.get('notes', '')

        try:
            clearance = IPDRunningLedgerService.issue_financial_discharge_clearance(
                admission_id_or_number=adm_id,
                cashier=request.user,
                override_reason=override,
                checklist_confirmed=checklist,
                notes=notes
            )
            return Response(FinancialDischargeClearanceSerializer(clearance).data, status=status.HTTP_200_OK)
        except InpatientAdmission.DoesNotExist:
            return Response({'error': f"Admission '{adm_id}' not found"}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'error': str(e), 'gate_blocked': True}, status=status.HTTP_400_BAD_REQUEST)


class IPDDischargeClearanceVerifyView(APIView):
    """Security gate and ward nursing exit pass token verification."""
    permission_classes = [IsHospitalStaff]

    def get(self, request, token):
        res = IPDRunningLedgerService.verify_discharge_clearance_token(token, verifier_user=request.user)
        http_status = status.HTTP_200_OK if res['is_valid'] else status.HTTP_400_BAD_REQUEST
        return Response(res, status=http_status)


# --- PHASE 10: REVENUE INTEGRITY & GOVERNANCE VIEWS ---

class RevenueIntegrityOverviewView(APIView):
    """A-03 Revenue Integrity executive overview and high-level KPIs."""
    permission_classes = [IsBillingSupervisorOrAbove]

    def get(self, request):
        data = RevenueIntegrityScannerService.get_revenue_integrity_overview()
        return Response(data, status=status.HTTP_200_OK)


class RevenueLeakageListView(APIView):
    """Filterable stream of open revenue leakage items."""
    permission_classes = [IsBillingSupervisorOrAbove]

    def get(self, request):
        qs = RevenueLeakageAlert.objects.select_related('patient', 'admission', 'assigned_to', 'converted_charge').all()
        status_filter = request.query_params.get('status')
        type_filter = request.query_params.get('leakage_type')
        dept_filter = request.query_params.get('department')
        search = request.query_params.get('search')

        if status_filter:
            qs = qs.filter(status=status_filter)
        if type_filter:
            qs = qs.filter(leakage_type=type_filter)
        if dept_filter:
            qs = qs.filter(department=dept_filter)
        if search:
            qs = qs.filter(
                Q(source_event_reference__icontains=search) |
                Q(notes__icontains=search) |
                Q(patient__first_name__icontains=search) |
                Q(patient__last_name__icontains=search) |
                Q(patient__uhid__icontains=search)
            )

        serializer = RevenueLeakageAlertSerializer(qs[:100], many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class RevenueLeakageScanView(APIView):
    """Triggers background / manual scan for revenue leakage."""
    permission_classes = [IsBillingAdminOrAbove]

    def post(self, request):
        res = RevenueIntegrityScannerService.scan_revenue_leakage()
        return Response(res, status=status.HTTP_200_OK)


class RevenueLeakageConvertChargeView(APIView):
    """Converts a verified leakage alert into an active billable charge."""
    permission_classes = [IsBillingAdminOrAbove]

    def post(self, request, alert_id):
        try:
            alert = RevenueIntegrityScannerService.convert_leakage_to_charge(alert_id, request.user)
            return Response(RevenueLeakageAlertSerializer(alert).data, status=status.HTTP_200_OK)
        except RevenueLeakageAlert.DoesNotExist:
            return Response({'error': f"Leakage alert '{alert_id}' not found."}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class RevenueLeakageDismissView(APIView):
    """Marks a leakage alert as false positive with mandatory audit reasoning."""
    permission_classes = [IsBillingAdminOrAbove]

    def post(self, request, alert_id):
        reason = request.data.get('reason', '')
        try:
            alert = RevenueIntegrityScannerService.dismiss_leakage_alert(alert_id, reason, request.user)
            return Response(RevenueLeakageAlertSerializer(alert).data, status=status.HTTP_200_OK)
        except RevenueLeakageAlert.DoesNotExist:
            return Response({'error': f"Leakage alert '{alert_id}' not found."}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class RevenueLeakageAssignView(APIView):
    """Assigns an alert to a specific team member for follow-up."""
    permission_classes = [IsBillingAdminOrAbove]

    def post(self, request, alert_id):
        user_id = request.data.get('user_id')
        from apps.accounts.models import User
        assignee = User.objects.filter(id=user_id).first() if user_id else None
        try:
            alert = RevenueIntegrityScannerService.assign_leakage_alert(alert_id, assignee, request.user)
            return Response(RevenueLeakageAlertSerializer(alert).data, status=status.HTTP_200_OK)
        except RevenueLeakageAlert.DoesNotExist:
            return Response({'error': f"Leakage alert '{alert_id}' not found."}, status=status.HTTP_404_NOT_FOUND)


class FraudRiskSignalListView(APIView):
    """Cashier and counter behavioral anomaly signals."""
    permission_classes = [IsBillingSupervisorOrAbove]

    def get(self, request):
        qs = FraudRiskSignal.objects.select_related('target_user', 'counter', 'acknowledged_by').all()
        severity = request.query_params.get('severity')
        is_ack = request.query_params.get('is_acknowledged')

        if severity:
            qs = qs.filter(severity=severity)
        if is_ack is not None:
            qs = qs.filter(is_acknowledged=is_ack.lower() in ['true', '1'])

        serializer = FraudRiskSignalSerializer(qs[:100], many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class FraudRiskSignalScanView(APIView):
    """Triggers behavioral anomaly detection scan."""
    permission_classes = [IsBillingAdminOrAbove]

    def post(self, request):
        res = RevenueIntegrityScannerService.scan_fraud_risk_signals()
        return Response(res, status=status.HTTP_200_OK)


class FraudRiskSignalAcknowledgeView(APIView):
    """Acknowledges a fraud risk signal."""
    permission_classes = [IsBillingAdminOrAbove]

    def post(self, request, signal_id):
        try:
            signal_obj = RevenueIntegrityScannerService.acknowledge_risk_signal(signal_id, request.user)
            return Response(FraudRiskSignalSerializer(signal_obj).data, status=status.HTTP_200_OK)
        except FraudRiskSignal.DoesNotExist:
            return Response({'error': f"Risk signal '{signal_id}' not found."}, status=status.HTTP_404_NOT_FOUND)


class RevenueInvestigationListCreateView(APIView):
    """Investigation docket list and creation endpoint."""
    permission_classes = [IsBillingSupervisorOrAbove]

    def get(self, request):
        qs = RevenueInvestigationCase.objects.select_related('owner', 'leakage_alert', 'risk_signal').all()
        status_filter = request.query_params.get('status')
        search = request.query_params.get('search')

        if status_filter:
            qs = qs.filter(status=status_filter)
        if search:
            qs = qs.filter(
                Q(case_number__icontains=search) |
                Q(subject__icontains=search) |
                Q(findings__icontains=search)
            )

        serializer = RevenueInvestigationCaseSerializer(qs[:100], many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        subject = request.data.get('subject', '')
        leakage_alert_id = request.data.get('leakage_alert_id')
        risk_signal_id = request.data.get('risk_signal_id')
        initial_findings = request.data.get('initial_findings', '')

        try:
            case = RevenueIntegrityScannerService.open_investigation_case(
                actor=request.user,
                subject=subject,
                leakage_alert_id=leakage_alert_id,
                risk_signal_id=risk_signal_id,
                initial_findings=initial_findings
            )
            return Response(RevenueInvestigationCaseSerializer(case).data, status=status.HTTP_201_CREATED)
        except (ValueError, RevenueLeakageAlert.DoesNotExist, FraudRiskSignal.DoesNotExist) as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class RevenueInvestigationDetailUpdateView(APIView):
    """Single investigation docket detail and resolution updates."""
    permission_classes = [IsBillingSupervisorOrAbove]

    def get(self, request, case_id):
        try:
            case = RevenueInvestigationCase.objects.select_related('owner', 'leakage_alert', 'risk_signal').get(id=case_id)
            return Response(RevenueInvestigationCaseSerializer(case).data, status=status.HTTP_200_OK)
        except RevenueInvestigationCase.DoesNotExist:
            return Response({'error': f"Investigation case '{case_id}' not found."}, status=status.HTTP_404_NOT_FOUND)

    def post(self, request, case_id):
        case_status = request.data.get('status')
        findings = request.data.get('findings')
        recovered_amount = request.data.get('recovered_amount')

        try:
            case = RevenueIntegrityScannerService.update_investigation_case(
                case_id=case_id,
                actor=request.user,
                status=case_status,
                findings=findings,
                recovered_amount=recovered_amount
            )
            return Response(RevenueInvestigationCaseSerializer(case).data, status=status.HTTP_200_OK)
        except RevenueInvestigationCase.DoesNotExist:
            return Response({'error': f"Investigation case '{case_id}' not found."}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


# --- PHASE 11: REPORTS, PERIOD CLOSE & AUDIT ---

from django.http import HttpResponse
from .permissions import IsFinanceReportViewer, IsShiftReportViewer, IsPeriodCloseUser


def _csv_response(text: str, filename: str, request, label: str):
    SupervisorGovernanceService.audit(AuditEventType.REPORT_EXPORTED, 'Report exported', f'{label} · CSV', AuditSeverity.LOW,
                                      request.user, None, filename[:60])
    resp = HttpResponse('﻿' + text, content_type='text/csv; charset=utf-8')
    resp['Content-Disposition'] = f'attachment; filename="{filename}"'
    return resp


def _range(request, default='MTD'):
    """(start, end) from date_from/date_to. Billing Supervisors only ever see today's shift reports."""
    if getattr(request.user, 'role', None) == 'BILLING_SUPERVISOR' and not request.user.is_superuser:
        today = timezone.localdate()
        return today, today
    return BillingReportingService.parse_range(request.query_params.get('date_from'), request.query_params.get('date_to'), default)


SUPERVISOR_REPORT_KEYS = {'tender', 'productivity', 'refunds'}


class ReportCatalogueView(APIView):
    permission_classes = [IsShiftReportViewer]

    def get(self, request):
        supervisor = getattr(request.user, 'role', None) == 'BILLING_SUPERVISOR'
        return Response({'reports': [{'key': k, 'name': v[0], 'description': v[1]} for k, v in BillingReportingService.REPORTS.items()
                                     if not supervisor or k in SUPERVISOR_REPORT_KEYS],
                         'shift_only': supervisor})


class ReportRunView(APIView):
    """GET /reports/run/{key}/?date_from=&date_to=&export=csv"""
    permission_classes = [IsShiftReportViewer]

    def get(self, request, key):
        if getattr(request.user, 'role', None) == 'BILLING_SUPERVISOR' and key not in SUPERVISOR_REPORT_KEYS:
            return Response({'error': 'Supervisors can view current-shift reports only.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            start, end = _range(request)
            report = BillingReportingService.run_report(key, start, end)
        except ValueError as ve:
            return _bad_request(ve)
        if request.query_params.get('export') == 'csv':
            return _csv_response(BillingReportingService.to_csv(report), f'{key}-{start}-{end}.csv', request, report['name'])
        return Response(report)


class RevenueAnalyticsView(APIView):
    permission_classes = [IsFinanceReportViewer]

    def get(self, request):
        try:
            return Response(BillingReportingService.revenue_analytics(request.query_params.get('period')))
        except ValueError as ve:
            return _bad_request(ve)


class DailyCollectionsReportView(APIView):
    permission_classes = [IsShiftReportViewer]

    def get(self, request):
        try:
            start, end = _range(request, 'TODAY')
        except ValueError as ve:
            return _bad_request(ve)
        data = BillingReportingService.daily_collections(start, end)
        data['period'] = {'from': start.isoformat(), 'to': end.isoformat()}
        data['lock_state'] = BillingReportingService.lock_state(start, end)
        return Response(data)


class DepartmentRevenueReportView(APIView):
    permission_classes = [IsFinanceReportViewer]

    def get(self, request):
        try:
            start, end = _range(request)
        except ValueError as ve:
            return _bad_request(ve)
        data = BillingReportingService.department_revenue(start, end)
        data['period'] = {'from': start.isoformat(), 'to': end.isoformat()}
        data['lock_state'] = BillingReportingService.lock_state(start, end)
        return Response(data)


class TaxGstReportView(APIView):
    """GST by rate slab with CGST/SGST/IGST split; ?month=YYYY-MM adds filing-ready return summaries."""
    permission_classes = [IsFinanceReportViewer]

    def get(self, request):
        try:
            start, end = _range(request)
            data = BillingReportingService.tax_gst(start, end)
            month = request.query_params.get('month')
            if month:
                from datetime import date as date_cls
                y, m = (int(x) for x in month.split('-')[:2])
                data['returns'] = BillingReportingService.gst_returns(date_cls(y, m, 1))
        except (ValueError, TypeError) as ve:
            return _bad_request(ve)
        data['period'] = {'from': start.isoformat(), 'to': end.isoformat()}
        data['lock_state'] = BillingReportingService.lock_state(start, end)
        return Response(data)


class AgingReportView(APIView):
    permission_classes = [IsFinanceReportViewer]

    def get(self, request):
        try:
            as_of = BillingReportingService.parse_range(request.query_params.get('as_of'), None, 'TODAY')[0] \
                if request.query_params.get('as_of') else timezone.localdate()
        except ValueError as ve:
            return _bad_request(ve)
        return Response(BillingReportingService.aging_ar(as_of))


class CashierProductivityReportView(APIView):
    permission_classes = [IsShiftReportViewer]

    def get(self, request):
        try:
            start, end = _range(request)
        except ValueError as ve:
            return _bad_request(ve)
        data = BillingReportingService.cashier_productivity(start, end)
        data['period'] = {'from': start.isoformat(), 'to': end.isoformat()}
        return Response(data)


class SettlementJournalPostView(APIView):
    """Post the balanced settlement journal for a range to the ERP feed (recorded with a JV reference)."""
    permission_classes = [IsBillingAdminOrAbove]

    def post(self, request):
        try:
            start, end = BillingReportingService.parse_range(request.data.get('date_from'), request.data.get('date_to'), 'TODAY')
        except ValueError as ve:
            return _bad_request(ve)
        dept_flag = bool(request.data.get('departmental', False))
        journal = BillingReportingService.settlement_journal(start, end, departmentalized=dept_flag)
        if not journal['balanced']:
            return _bad_request(ValueError('The journal does not balance; nothing was posted.'))
        ref = next_journal_reference()
        SupervisorGovernanceService.audit(AuditEventType.ERP_JOURNAL, 'Settlement journal posted to ERP',
                                          f'{start} to {end} · ₹{journal["total_debit"]:,.2f}', AuditSeverity.LOW, request.user, None, ref)
        return Response({'journal_reference': ref, **journal}, status=status.HTTP_201_CREATED)


class LiveJournalStreamView(APIView):
    """
    Real-Time General Ledger Journal Voucher Stream (Phase 3).
    GET /api/v1/billing/reports/journal/live-stream/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD&department=OPD|LAB|PHARMACY|ALL&limit=50
    """
    permission_classes = [IsFinanceReportViewer]

    def get(self, request):
        try:
            start, end = _range(request, 'TODAY')
        except ValueError as ve:
            return _bad_request(ve)

        dept = request.query_params.get('department')
        try:
            limit = min(200, max(1, int(request.query_params.get('limit', 50))))
        except (ValueError, TypeError):
            limit = 50

        entries = GeneralLedgerIntegrationService.get_live_journal_stream(
            date_from=start,
            date_to=end,
            department=dept,
            limit=limit
        )
        return Response({
            'period': {'from': start.isoformat(), 'to': end.isoformat()},
            'department_filter': dept or 'ALL',
            'count': len(entries),
            'entries': entries
        })


class LiveDepartmentRevenueSummaryView(APIView):
    """
    Live Departmental Revenue & Tender Collections Summary (Phase 3).
    GET /api/v1/billing/reports/department-revenue/live-summary/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
    """
    permission_classes = [IsFinanceReportViewer]

    def get(self, request):
        try:
            start, end = _range(request, 'TODAY')
        except ValueError as ve:
            return _bad_request(ve)

        data = GeneralLedgerIntegrationService.get_departmental_revenue_summary(
            date_from=start,
            date_to=end
        )
        return Response(data)


class PeriodCloseView(APIView):
    """GET: calendar strip, checklist for ?selected=YYYY-MM-DD, months, year, reopen requests.
    POST {period_type: DAILY|MONTHLY|ANNUAL, date, carry_forward_note}: close and lock the period."""
    permission_classes = [IsPeriodCloseUser]

    def get(self, request):
        try:
            sel = request.query_params.get('selected')
            selected = BillingReportingService.parse_range(sel, None, 'TODAY')[0] if sel else None
        except ValueError as ve:
            return _bad_request(ve)
        return Response(FinancialPeriodCloseService.overview(request.user, selected))

    def post(self, request):
        data = request.data
        try:
            ref = BillingReportingService.parse_range(data.get('date'), None, 'TODAY')[0] if data.get('date') else timezone.localdate() - timedelta(days=1)
            lock = FinancialPeriodCloseService.close_period(request.user, data.get('period_type', 'DAILY'), ref, data.get('carry_forward_note', ''))
            return Response(FinancialPeriodCloseService.lock_dict(lock), status=status.HTTP_201_CREATED)
        except PermissionError as pe:
            return Response({'error': str(pe)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as ve:
            return _bad_request(ve)


class PeriodCloseActionView(APIView):
    """POST /period-close/{id}/(reopen-request|reopen-decision|relock)/"""
    permission_classes = [IsPeriodCloseUser]

    def post(self, request, pk, action):
        data = request.data
        try:
            if action == 'reopen-request':
                lock = FinancialPeriodCloseService.request_reopen(request.user, pk, data.get('reason', ''))
            elif action == 'reopen-decision':
                lock = FinancialPeriodCloseService.decide_reopen(
                    request.user, pk, str(data.get('approve', '')).lower() in ('true', '1'), data.get('note', ''), data.get('hours'))
            else:
                lock = FinancialPeriodCloseService.relock(request.user, pk)
            return Response(FinancialPeriodCloseService.lock_dict(lock))
        except FinancialPeriodLock.DoesNotExist:
            return Response({'error': 'Period not found'}, status=status.HTTP_404_NOT_FOUND)
        except PermissionError as pe:
            return Response({'error': str(pe)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as ve:
            return _bad_request(ve)


class PeriodJournalView(APIView):
    """GET /period-close/{id}/journal/?export=csv — the ERP journal feed frozen at close."""
    permission_classes = [IsFinanceReportViewer]

    def get(self, request, pk):
        lock = FinancialPeriodLock.objects.filter(id=pk).first()
        if not lock:
            return Response({'error': 'Period not found'}, status=status.HTTP_404_NOT_FOUND)
        if request.query_params.get('export') == 'csv':
            import csv, io
            buf = io.StringIO()
            w = csv.writer(buf)
            w.writerow(['Journal', lock.journal_reference, lock.period_name, f'{lock.start_date} to {lock.end_date}'])
            w.writerow(['Ledger account', 'Debit', 'Credit'])
            for r in lock.journal:
                w.writerow([r['account'], r['debit'], r['credit']])
            return _csv_response(buf.getvalue(), f'{lock.journal_reference}.csv', request, f'ERP journal {lock.journal_reference}')
        return Response({'journal_reference': lock.journal_reference, 'period': lock.period_name, 'rows': lock.journal})


class BillingAuditLogView(APIView):
    """A-21 Audit Log: ?category=&search=&user=&reference=&date_from=&date_to=&export=csv"""
    permission_classes = [IsFinanceReportViewer]

    def get(self, request):
        q = request.query_params
        data = BillingAuditLogService.query(q.get('category'), q.get('search'), q.get('user'), q.get('reference'),
                                            q.get('date_from'), q.get('date_to'))
        if q.get('export') == 'csv':
            return _csv_response(BillingAuditLogService.to_csv(data), f'billing-audit-log-{timezone.localdate()}.csv', request, 'Audit log')
        return Response(data)


class BillingAuditChainVerifyView(APIView):
    permission_classes = [IsFinanceReportViewer]

    def get(self, request):
        return Response(BillingAuditLogService.verify_chain())
