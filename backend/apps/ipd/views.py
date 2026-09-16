from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.utils import timezone
from .models import InpatientAdmission, MedicationAdministration
from .serializers import InpatientAdmissionSerializer, MedicationAdministrationSerializer
from apps.patients.models import Patient
from apps.organization.models import Bed

class AdmissionListCreateView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        status_param = request.query_params.get('status')
        qs = InpatientAdmission.objects.select_related('patient', 'bed', 'admitting_doctor__user').prefetch_related('mar_records').all()
        if status_param:
            qs = qs.filter(status=status_param)
        return Response(InpatientAdmissionSerializer(qs, many=True).data)

    def post(self, request):
        data = request.data
        patient_id = data.get('patientId')
        patient = Patient.objects.filter(id=patient_id).first() if patient_id else Patient.objects.first()

        bed_id = data.get('bedId')
        bed = Bed.objects.filter(id=bed_id).first() if bed_id else Bed.objects.first()

        today_str = timezone.now().strftime('%Y%m%d')
        count = InpatientAdmission.objects.count() + 1
        adm_num = f"IPD-{today_str}-{str(count).zfill(4)}"

        admission = InpatientAdmission.objects.create(
            admission_number=adm_num,
            patient=patient,
            bed=bed,
            ward_name=data.get('wardName', 'General Ward'),
            status=data.get('status', 'ADMITTED'),
            admitting_diagnosis=data.get('admittingDiagnosis', 'Observation'),
        )

        if bed:
            bed.status = 'OCCUPIED'
            bed.current_patient_uhid = patient.uhid if patient else None
            bed.current_patient_name = f"{patient.first_name} {patient.last_name}" if patient else None
            bed.save()

        return Response(InpatientAdmissionSerializer(admission).data, status=status.HTTP_201_CREATED)

class AdmissionDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        try:
            adm = InpatientAdmission.objects.select_related('patient', 'bed', 'admitting_doctor__user').prefetch_related('mar_records').get(pk=pk)
        except InpatientAdmission.DoesNotExist:
            return Response({'error': 'Admission not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(InpatientAdmissionSerializer(adm).data)

class AdmissionStatusView(APIView):
    permission_classes = [AllowAny]

    def patch(self, request, pk):
        try:
            adm = InpatientAdmission.objects.get(pk=pk)
        except InpatientAdmission.DoesNotExist:
            return Response({'error': 'Admission not found'}, status=status.HTTP_404_NOT_FOUND)

        if 'status' in request.data:
            adm.status = request.data['status']
            adm.save()
        return Response(InpatientAdmissionSerializer(adm).data)

class AdmissionDischargeView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, pk):
        try:
            adm = InpatientAdmission.objects.get(pk=pk)
        except InpatientAdmission.DoesNotExist:
            return Response({'error': 'Admission not found'}, status=status.HTTP_404_NOT_FOUND)

        adm.status = 'DISCHARGED'
        adm.discharge_date = timezone.now()
        adm.discharge_summary = request.data.get('dischargeSummary', 'Discharged in stable condition.')
        adm.save()

        if adm.bed:
            adm.bed.status = 'AVAILABLE'
            adm.bed.current_patient_uhid = None
            adm.bed.current_patient_name = None
            adm.bed.save()

        return Response(InpatientAdmissionSerializer(adm).data)

class MARListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        try:
            adm = InpatientAdmission.objects.get(pk=pk)
        except InpatientAdmission.DoesNotExist:
            return Response({'error': 'Admission not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(MedicationAdministrationSerializer(adm.mar_records.all(), many=True).data)

    def post(self, request):
        data = request.data
        admission_id = data.get('admissionId')
        adm = InpatientAdmission.objects.filter(id=admission_id).first() if admission_id else InpatientAdmission.objects.first()
        record = MedicationAdministration.objects.create(
            admission=adm,
            medication_name=data.get('medicationName', 'Paracetamol 500mg'),
            dosage=data.get('dosage', '1 tab'),
            scheduled_time=data.get('scheduledTime', '14:00'),
            is_given=data.get('isGiven', False),
            remarks=data.get('remarks', ''),
        )
        return Response(MedicationAdministrationSerializer(record).data, status=status.HTTP_201_CREATED)

class MARToggleView(APIView):
    permission_classes = [AllowAny]

    def patch(self, request, pk):
        try:
            record = MedicationAdministration.objects.get(pk=pk)
        except MedicationAdministration.DoesNotExist:
            return Response({'error': 'MAR Record not found'}, status=status.HTTP_404_NOT_FOUND)

        record.is_given = not record.is_given
        record.administered_time = timezone.now() if record.is_given else None
        record.save()
        return Response(MedicationAdministrationSerializer(record).data)
