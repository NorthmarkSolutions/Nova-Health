from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.utils import timezone
from .models import Appointment, VitalSign
from .serializers import AppointmentSerializer, VitalSignSerializer

class AppointmentListCreateView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        date_param = request.query_params.get('date')
        status_param = request.query_params.get('status')
        doctor_param = request.query_params.get('doctorId')

        qs = Appointment.objects.select_related('patient', 'doctor', 'vitals').all()

        if date_param:
            qs = qs.filter(appointment_date=date_param)
        if status_param:
            qs = qs.filter(status=status_param)
        if doctor_param:
            qs = qs.filter(doctor_id=doctor_param)

        serializer = AppointmentSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = AppointmentSerializer(data=request.data)
        if serializer.is_valid():
            apt = serializer.save()
            return Response(AppointmentSerializer(apt).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class AppointmentDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        try:
            apt = Appointment.objects.select_related('patient', 'doctor', 'vitals').get(pk=pk)
        except Appointment.DoesNotExist:
            return Response({'error': 'Appointment not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(AppointmentSerializer(apt).data)

class AppointmentStatusView(APIView):
    permission_classes = [AllowAny]

    def put(self, request, pk):
        try:
            apt = Appointment.objects.get(pk=pk)
        except Appointment.DoesNotExist:
            return Response({'error': 'Appointment not found'}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get('status')
        if new_status:
            apt.status = new_status
            apt.save()
        return Response(AppointmentSerializer(apt).data)

class AppointmentVitalsView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, pk):
        try:
            apt = Appointment.objects.get(pk=pk)
        except Appointment.DoesNotExist:
            return Response({'error': 'Appointment not found'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data.copy()
        vitals, _ = VitalSign.objects.get_or_create(appointment=apt, patient=apt.patient)

        if 'systolicBp' in data: vitals.systolic_bp = data['systolicBp']
        if 'diastolicBp' in data: vitals.diastolic_bp = data['diastolicBp']
        if 'pulseRate' in data: vitals.pulse_rate = data['pulseRate']
        if 'temperature' in data: vitals.temperature = data['temperature']
        if 'spo2' in data: vitals.spo2 = data['spo2']
        if 'heightCm' in data: vitals.height_cm = data['heightCm']
        if 'weightKg' in data: vitals.weight_kg = data['weightKg']
        if 'bmi' in data: vitals.bmi = data['bmi']
        if 'triageNotes' in data: vitals.triage_notes = data['triageNotes']

        vitals.save()
        if apt.status == 'WAITING':
            apt.status = 'TRIAGED'
            apt.save()

        return Response(VitalSignSerializer(vitals).data, status=status.HTTP_200_OK)
