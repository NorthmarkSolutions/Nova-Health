from rest_framework import serializers
from .models import Invoice, InvoiceItem, Payment

class InvoiceItemSerializer(serializers.ModelSerializer):
    unitPrice = serializers.DecimalField(source='unit_price', max_digits=10, decimal_places=2)

    class Meta:
        model = InvoiceItem
        fields = ['id', 'source', 'description', 'qty', 'unitPrice', 'total']

class InvoiceSerializer(serializers.ModelSerializer):
    invNo = serializers.CharField(source='invoice_number', read_only=True)
    patientName = serializers.SerializerMethodField()
    uhid = serializers.CharField(source='patient.uhid', read_only=True)
    phone = serializers.CharField(source='patient.phone_number', read_only=True)
    advanceDeducted = serializers.DecimalField(source='advance_deducted', max_digits=10, decimal_places=2)
    items = InvoiceItemSerializer(many=True, read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'invNo', 'patientName', 'uhid', 'phone', 'category',
            'date', 'subtotal', 'discount', 'tax', 'advanceDeducted',
            'total', 'paid', 'balance', 'status', 'items'
        ]

    def get_patientName(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}"

class PaymentSerializer(serializers.ModelSerializer):
    paymentNumber = serializers.CharField(source='payment_number', read_only=True)
    paymentMethod = serializers.CharField(source='payment_method')
    transactionReference = serializers.CharField(source='transaction_reference', required=False, allow_null=True)
    paymentDate = serializers.DateTimeField(source='payment_date', read_only=True)

    class Meta:
        model = Payment
        fields = ['id', 'paymentNumber', 'amount', 'paymentMethod', 'transactionReference', 'paymentDate']
