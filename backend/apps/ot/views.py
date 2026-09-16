from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.utils import timezone
from .models import SurgeryBooking
from .serializers import SurgeryBookingSerializer
from apps.patients.models import Patient

class SurgeryListCreateView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        status_param = request.query_params.get('status')
        qs = SurgeryBooking.objects.select_related('patient', 'primary_surgeon__user').all()
        if status_param:
            qs = qs.filter(status=status_param)
        return Response(SurgeryBookingSerializer(qs, many=True).data)

    def post(self, request):
        data = request.data
        patient_id = data.get('patientId')
        patient = Patient.objects.filter(id=patient_id).first() if patient_id else Patient.objects.first()

        today_str = timezone.now().strftime('%Y%m%d')
        count = SurgeryBooking.objects.count() + 1
        b_num = f"SURG-{today_str}-{str(count).zfill(4)}"

        booking = SurgeryBooking.objects.create(
            booking_number=b_num,
            patient=patient,
            procedure_name=data.get('procedureName', 'Diagnostic Laparoscopy'),
            ot_room=data.get('otRoom', 'OT-1'),
            scheduled_start=data.get('scheduledStart'),
            status=data.get('status', 'PLANNED'),
            pre_op_diagnosis=data.get('preOpDiagnosis', ''),
        )
        return Response(SurgeryBookingSerializer(booking).data, status=status.HTTP_201_CREATED)

class SurgeryDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        try:
            booking = SurgeryBooking.objects.select_related('patient', 'primary_surgeon__user').get(pk=pk)
        except SurgeryBooking.DoesNotExist:
            return Response({'error': 'Surgery not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(SurgeryBookingSerializer(booking).data)

class SurgeryStatusView(APIView):
    permission_classes = [AllowAny]

    def patch(self, request, pk):
        try:
            booking = SurgeryBooking.objects.get(pk=pk)
        except SurgeryBooking.DoesNotExist:
            return Response({'error': 'Surgery not found'}, status=status.HTTP_404_NOT_FOUND)

        if 'status' in request.data:
            booking.status = request.data['status']
            booking.save()
        return Response(SurgeryBookingSerializer(booking).data)

class SurgeryNotesView(APIView):
    permission_classes = [AllowAny]

    def patch(self, request, pk):
        try:
            booking = SurgeryBooking.objects.get(pk=pk)
        except SurgeryBooking.DoesNotExist:
            return Response({'error': 'Surgery not found'}, status=status.HTTP_404_NOT_FOUND)

        if 'postOpNotes' in request.data:
            booking.post_op_notes = request.data['postOpNotes']
            booking.save()
        return Response(SurgeryBookingSerializer(booking).data)
