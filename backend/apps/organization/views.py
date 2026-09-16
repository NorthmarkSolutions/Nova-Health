from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from .models import HospitalProfile, Department, Bed
from .serializers import HospitalProfileSerializer, DepartmentSerializer, BedSerializer

class ProfileView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        profile = HospitalProfile.objects.first()
        if not profile:
            profile = HospitalProfile.objects.create()
        return Response(HospitalProfileSerializer(profile).data)

    def put(self, request):
        profile = HospitalProfile.objects.first()
        if not profile:
            profile = HospitalProfile.objects.create()
        serializer = HospitalProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class BedsListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        beds = Bed.objects.all().order_by('bed_number')
        return Response(BedSerializer(beds, many=True).data)

    def post(self, request):
        serializer = BedSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class BedStatusView(APIView):
    permission_classes = [AllowAny]

    def patch(self, request, pk):
        try:
            bed = Bed.objects.get(pk=pk)
        except Bed.DoesNotExist:
            return Response({'error': 'Bed not found'}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get('status')
        if new_status:
            bed.status = new_status
            if new_status == 'AVAILABLE':
                bed.current_patient_uhid = None
                bed.current_patient_name = None
            elif 'currentPatientUhid' in request.data:
                bed.current_patient_uhid = request.data.get('currentPatientUhid')
                bed.current_patient_name = request.data.get('currentPatientName')
            bed.save()
        return Response(BedSerializer(bed).data)

class DepartmentsListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        deps = Department.objects.all().order_by('name')
        return Response(DepartmentSerializer(deps, many=True).data)
