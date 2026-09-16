from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db.models import Q
from .models import Patient
from .serializers import PatientSerializer

class PatientListCreateView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        uhid = request.query_params.get('uhid', '').strip()
        phone = request.query_params.get('phone', '').strip()

        qs = Patient.objects.filter(is_deleted=False)

        if uhid:
            qs = qs.filter(uhid__icontains=uhid)
        elif phone:
            qs = qs.filter(phone_number__icontains=phone)
        elif query:
            qs = qs.filter(
                Q(uhid__icontains=query) |
                Q(first_name__icontains=query) |
                Q(last_name__icontains=query) |
                Q(phone_number__icontains=query)
            )

        serializer = PatientSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = PatientSerializer(data=request.data)
        if serializer.is_valid():
            patient = serializer.save()
            return Response(PatientSerializer(patient).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PatientDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        try:
            patient = Patient.objects.get(Q(id=pk) | Q(uhid=pk), is_deleted=False)
        except Patient.DoesNotExist:
            return Response({'error': 'Patient not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(PatientSerializer(patient).data)

    def put(self, request, pk):
        try:
            patient = Patient.objects.get(Q(id=pk) | Q(uhid=pk), is_deleted=False)
        except Patient.DoesNotExist:
            return Response({'error': 'Patient not found'}, status=status.HTTP_404_NOT_FOUND)

        serializer = PatientSerializer(patient, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
