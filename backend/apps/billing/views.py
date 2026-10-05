from decimal import Decimal
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
    CorporateAccount, FinancialDischargeClearance
)
from .serializers import (
    InvoiceSerializer, PaymentSerializer,
    BillingCounterSerializer, CounterShiftSerializer,
    PatientDepositSerializer, RefundRequestSerializer,
    TariffMasterSerializer, ServicePackageSerializer,
    CorporateAccountSerializer, FinancialDischargeClearanceSerializer
)
from .services import TariffPricingService, BillingCoreService, CounterClosingService
from apps.patients.models import Patient

# --- INVOICE & PAYMENT VIEWS ---

class InvoiceListCreateView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        status_param = request.query_params.get('status')
        uhid_param = request.query_params.get('uhid')
        category_param = request.query_params.get('category')
        qs = Invoice.objects.select_related('patient', 'counter', 'cashier').prefetch_related('items', 'payments').all()
        if status_param:
            qs = qs.filter(status=status_param)
        if uhid_param:
            qs = qs.filter(patient__uhid=uhid_param)
        if category_param:
            qs = qs.filter(category=category_param)
        return Response(InvoiceSerializer(qs, many=True).data)

    def post(self, request):
        data = request.data
        patient_id = data.get('patientId') or data.get('patient')
        patient = Patient.objects.filter(id=patient_id).first() if patient_id else Patient.objects.first()

        today = timezone.now().strftime('%Y-%m-%d')
        today_code = timezone.now().strftime('%Y%m')
        count = Invoice.objects.count() + 1
        inv_num = f"INV-{today_code}-{str(count).zfill(5)}"

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
    permission_classes = [AllowAny]

    def get(self, request, pk):
        try:
            invoice = Invoice.objects.select_related('patient', 'counter', 'cashier').prefetch_related('items', 'payments').get(pk=pk)
        except Invoice.DoesNotExist:
            return Response({'error': 'Invoice not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(InvoiceSerializer(invoice).data)

class PaymentCreateView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        inv_id = data.get('invoiceId') or data.get('invoice')
        try:
            invoice = Invoice.objects.get(pk=inv_id)
        except Invoice.DoesNotExist:
            return Response({'error': 'Invoice not found'}, status=status.HTTP_404_NOT_FOUND)

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

class TariffListCreateView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        dept = request.query_params.get('department')
        search = request.query_params.get('search')
        is_active = request.query_params.get('is_active')

        qs = TariffMaster.objects.all()
        if dept and dept.upper() != 'ALL':
            qs = qs.filter(department=dept.upper())
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(code__icontains=search))
        if is_active is not None:
            active_bool = is_active.lower() in ['true', '1']
            qs = qs.filter(is_active=active_bool)

        return Response(TariffMasterSerializer(qs, many=True).data)

    def post(self, request):
        serializer = TariffMasterSerializer(data=request.data)
        if serializer.is_valid():
            tariff = serializer.save()
            return Response(TariffMasterSerializer(tariff).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class TariffDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        tariff = TariffMaster.objects.filter(Q(id=pk) | Q(code=pk)).first()
        if not tariff:
            return Response({'error': 'Tariff not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(TariffMasterSerializer(tariff).data)

    def patch(self, request, pk):
        tariff = TariffMaster.objects.filter(Q(id=pk) | Q(code=pk)).first()
        if not tariff:
            return Response({'error': 'Tariff not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = TariffMasterSerializer(tariff, data=request.data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            return Response(TariffMasterSerializer(updated).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        tariff = TariffMaster.objects.filter(Q(id=pk) | Q(code=pk)).first()
        if not tariff:
            return Response({'error': 'Tariff not found'}, status=status.HTTP_404_NOT_FOUND)
        tariff.is_active = False
        tariff.save()
        return Response({'message': f'Tariff {tariff.code} deactivated successfully'})

class ServicePackageListCreateView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        dept = request.query_params.get('department')
        search = request.query_params.get('search')
        qs = ServicePackage.objects.all()
        if dept and dept.upper() != 'ALL':
            qs = qs.filter(department=dept.upper())
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(code__icontains=search))
        return Response(ServicePackageSerializer(qs, many=True).data)

    def post(self, request):
        serializer = ServicePackageSerializer(data=request.data)
        if serializer.is_valid():
            pkg = serializer.save()
            return Response(ServicePackageSerializer(pkg).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ServicePackageDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        pkg = ServicePackage.objects.filter(Q(id=pk) | Q(code=pk)).first()
        if not pkg:
            return Response({'error': 'Package not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(ServicePackageSerializer(pkg).data)

    def patch(self, request, pk):
        pkg = ServicePackage.objects.filter(Q(id=pk) | Q(code=pk)).first()
        if not pkg:
            return Response({'error': 'Package not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = ServicePackageSerializer(pkg, data=request.data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            return Response(ServicePackageSerializer(updated).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class CorporateAccountListCreateView(APIView):
    permission_classes = [AllowAny]

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
    permission_classes = [AllowAny]

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
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        items = data.get('items', [])
        encounter_type = data.get('encounter_type', 'OPD')
        patient_category = data.get('patient_category', 'GENERAL')
        is_emergency = bool(data.get('is_emergency', False))
        corporate_account_id = data.get('corporate_account_id')

        quote = TariffPricingService.calculate_quote(
            items=items,
            encounter_type=encounter_type,
            patient_category=patient_category,
            is_emergency=is_emergency,
            corporate_account_id=corporate_account_id
        )
        return Response(quote, status=status.HTTP_200_OK)


# --- PHASE 3: CASHIER WORKSPACE & POS VIEWS ---

class CashierQueueView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        dept = request.query_params.get('department')
        search = request.query_params.get('search')
        queue_items = CounterClosingService.get_unbilled_queue(department=dept, search=search)
        return Response(queue_items, status=status.HTTP_200_OK)


class MultiTenderPaymentView(APIView):
    permission_classes = [AllowAny]

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

        counter = BillingCounter.objects.filter(code=counter_code).first()
        active_shift = CounterShift.objects.filter(counter=counter, status='OPEN').first() if counter else None
        cashier = request.user if request.user.is_authenticated else None

        try:
            result = BillingCoreService.process_multi_tender_payment(
                invoice_id=inv_id,
                cashier=cashier,
                split_payments=split_payments,
                counter=counter,
                shift=active_shift,
                notes=notes
            )
            return Response({
                'invoice': InvoiceSerializer(result['invoice']).data,
                'payments': PaymentSerializer(result['payments'], many=True).data,
                'total_paid_now': float(result['total_paid_now']),
                'remaining_balance': float(result['remaining_balance']),
                'receipt_token': result['receipt_token'],
                'status': result['status']
            }, status=status.HTTP_200_OK)
        except Invoice.DoesNotExist:
            return Response({'error': 'Invoice not found'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as ve:
            return Response({'error': str(ve)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ShiftOpenView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        counter_code = data.get('counter_code', 'COUNTER-01')
        opening_float = Decimal(str(data.get('opening_float', '5000.00')))
        cashier = request.user if request.user.is_authenticated else None

        if not cashier:
            from apps.accounts.models import User
            cashier = User.objects.filter(role__in=['HOSPITAL_ADMIN', 'DEPARTMENT_ADMIN', 'SUPER_ADMIN']).first() or User.objects.first()

        shift = CounterClosingService.open_shift(
            cashier=cashier,
            counter_code=counter_code,
            opening_float=opening_float
        )
        return Response(CounterShiftSerializer(shift).data, status=status.HTTP_201_CREATED)


class ShiftCurrentView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        counter_code = request.query_params.get('counter_code')
        cashier = request.user if request.user.is_authenticated else None
        summary = CounterClosingService.get_active_shift_summary(cashier=cashier, counter_code=counter_code)
        return Response(summary, status=status.HTTP_200_OK)


class ShiftCloseView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        shift_id = data.get('shift_id') or data.get('shiftId')
        physical_cash = Decimal(str(data.get('physical_cash_count', 0.0)))
        notes = data.get('notes', '')
        denominations = data.get('denominations', {})

        if not shift_id:
            active = CounterShift.objects.filter(status='OPEN').first()
            if active:
                shift_id = str(active.id)
            else:
                return Response({'error': 'No active shift to close'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            closed_shift = CounterClosingService.close_shift(
                shift_id=shift_id,
                physical_cash_count=physical_cash,
                notes=notes,
                denominations=denominations
            )
            return Response(CounterShiftSerializer(closed_shift).data, status=status.HTTP_200_OK)
        except CounterShift.DoesNotExist:
            return Response({'error': 'Shift not found'}, status=status.HTTP_404_NOT_FOUND)


class InvoiceReceiptDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        details = BillingCoreService.get_receipt_details(pk)
        if not details:
            return Response({'error': 'Invoice receipt not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(details, status=status.HTTP_200_OK)

