from decimal import Decimal
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.utils import timezone
from .models import Invoice, InvoiceItem, Payment
from .serializers import InvoiceSerializer, PaymentSerializer
from apps.patients.models import Patient

class InvoiceListCreateView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        status_param = request.query_params.get('status')
        qs = Invoice.objects.select_related('patient').prefetch_related('items').all()
        if status_param:
            qs = qs.filter(status=status_param)
        return Response(InvoiceSerializer(qs, many=True).data)

    def post(self, request):
        data = request.data
        patient_id = data.get('patientId')
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
            date=today,
            subtotal=subtotal,
            discount=discount,
            tax=tax,
            advance_deducted=advance,
            total=total,
            paid=paid,
            balance=balance,
            status=inv_status
        )

        items_data = data.get('items', [])
        for item in items_data:
            InvoiceItem.objects.create(
                invoice=invoice,
                source=item.get('source', 'Consultation'),
                description=item.get('description', 'Service Charge'),
                qty=int(item.get('qty', 1)),
                unit_price=Decimal(str(item.get('unitPrice', 0.0))),
                total=Decimal(str(item.get('total', 0.0)))
            )

        return Response(InvoiceSerializer(invoice).data, status=status.HTTP_201_CREATED)

class InvoiceDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        try:
            invoice = Invoice.objects.select_related('patient').prefetch_related('items').get(pk=pk)
        except Invoice.DoesNotExist:
            return Response({'error': 'Invoice not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(InvoiceSerializer(invoice).data)

class PaymentCreateView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        inv_id = data.get('invoiceId')
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
            payment_number=p_num,
            amount=amount,
            payment_method=data.get('paymentMethod', 'CASH'),
            transaction_reference=data.get('transactionReference', ''),
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
