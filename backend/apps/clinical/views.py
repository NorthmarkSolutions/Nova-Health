import uuid
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.utils import timezone
from .models import Consultation, Prescription, PrescriptionItem
from .serializers import ConsultationSerializer, PrescriptionSerializer
from apps.appointments.models import Appointment

class ConsultationCreateView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data.copy()
        medications = data.pop('medications', [])

        serializer = ConsultationSerializer(data=data)
        if serializer.is_valid():
            consultation = serializer.save()

            # If associated appointment exists, complete it
            if consultation.appointment:
                consultation.appointment.status = 'COMPLETED'
                consultation.appointment.save()

            # Create Prescription if medications provided
            if medications:
                today_str = timezone.now().strftime('%Y%m%d')
                rx_count = Prescription.objects.count() + 1
                rx_num = f"RX-{today_str}-{str(rx_count).zfill(4)}"
                prescription = Prescription.objects.create(
                    consultation=consultation,
                    patient=consultation.patient,
                    doctor=consultation.doctor,
                    prescription_number=rx_num,
                    instructions="Take medications as prescribed with water.",
                )
                for med in medications:
                    PrescriptionItem.objects.create(
                        prescription=prescription,
                        medication_name=med.get('medicationName', 'Medicine'),
                        generic_name=med.get('genericName', ''),
                        dosage=med.get('dosage', '1 tablet'),
                        frequency=med.get('frequency', 'Twice daily'),
                        duration_days=med.get('durationDays', 5),
                        route=med.get('route', 'ORAL'),
                        instructions=med.get('instructions', ''),
                    )

            return Response(ConsultationSerializer(consultation).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PrescriptionDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        try:
            rx = Prescription.objects.prefetch_related('items').get(pk=pk)
        except Prescription.DoesNotExist:
            return Response({'error': 'Prescription not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(PrescriptionSerializer(rx).data)
