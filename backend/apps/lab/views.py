import uuid
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.utils import timezone
from .models import LabTest, LabOrder, LabResult
from .serializers import LabTestSerializer, LabOrderSerializer
from apps.patients.models import Patient

class LabTestListCreateView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        tests = LabTest.objects.filter(is_active=True).order_by('name')
        return Response(LabTestSerializer(tests, many=True).data)

    def post(self, request):
        serializer = LabTestSerializer(data=request.data)
        if serializer.is_valid():
            test = serializer.save()
            return Response(LabTestSerializer(test).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LabOrderListCreateView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        orders = LabOrder.objects.select_related('patient', 'test', 'doctor__user').prefetch_related('results').all()
        return Response(LabOrderSerializer(orders, many=True).data)

    def post(self, request):
        data = request.data
        patient_id = data.get('patientId')
        test_id = data.get('testId')

        patient = Patient.objects.filter(id=patient_id).first() if patient_id else Patient.objects.first()
        test = LabTest.objects.filter(id=test_id).first() if test_id else LabTest.objects.first()

        today_str = timezone.now().strftime('%Y%m%d')
        count = LabOrder.objects.count() + 1
        order_num = f"LAB-{today_str}-{str(count).zfill(4)}"

        order = LabOrder.objects.create(
            order_number=order_num,
            patient=patient,
            test=test,
            barcode=f"BAR-{str(uuid.uuid4())[:8].upper()}",
            status=data.get('stage', 'COLLECTED'),
        )
        return Response(LabOrderSerializer(order).data, status=status.HTTP_201_CREATED)

class LabOrderStatusView(APIView):
    permission_classes = [AllowAny]

    def patch(self, request, pk):
        try:
            order = LabOrder.objects.get(pk=pk)
        except LabOrder.DoesNotExist:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

        if 'stage' in request.data:
            order.status = request.data['stage']
        if 'technicianNote' in request.data:
            order.technician_note = request.data['technicianNote']
        if 'pathologistRemarks' in request.data:
            order.pathologist_remarks = request.data['pathologistRemarks']

        order.save()
        return Response(LabOrderSerializer(order).data)
