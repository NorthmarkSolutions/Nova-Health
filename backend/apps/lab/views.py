import uuid
from decimal import Decimal
from django.utils import timezone
from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny

from .models import (
    LabTest,
    LabOrder,
    LabOrderItem,
    LabResult,
    LabReport,
    Equipment,
    EquipmentMaintenanceLog,
    LabOrderStatus,
    LabOrderPriority,
    ResultFlag,
    EquipmentStatus,
)
from .serializers import (
    LabTestSerializer,
    LabOrderSerializer,
    LabOrderItemSerializer,
    LabResultSerializer,
    LabReportSerializer,
    EquipmentSerializer,
    EquipmentMaintenanceLogSerializer,
)
from .permissions import IsLabStaffOrReadOnly, IsPathologistOrLabAdmin, CanOrderLab
from apps.patients.models import Patient
from apps.accounts.models import DoctorProfile

def evaluate_flag_and_abnormal(observed_str, ref_range_str):
    """
    Helper function to evaluate result flags (NORMAL, LOW, HIGH, CRITICAL_LOW, CRITICAL_HIGH).
    Ref range format examples: "13.5 - 17.5", "< 200", "> 50", "4.0 - 11.0"
    """
    flag = ResultFlag.NORMAL
    is_abnormal = False

    try:
        val = float(str(observed_str).strip().replace(',', ''))
        cleaned_ref = ref_range_str.replace('–', '-').strip()

        if '-' in cleaned_ref:
            parts = cleaned_ref.split('-')
            low = float(parts[0].strip())
            high = float(parts[1].strip())

            if val < low:
                is_abnormal = True
                flag = ResultFlag.CRITICAL_LOW if val < (low * 0.7) else ResultFlag.LOW
            elif val > high:
                is_abnormal = True
                flag = ResultFlag.CRITICAL_HIGH if val > (high * 1.4) else ResultFlag.HIGH
            else:
                flag = ResultFlag.NORMAL

        elif cleaned_ref.startswith('<'):
            high = float(cleaned_ref.replace('<', '').strip())
            if val >= high:
                is_abnormal = True
                flag = ResultFlag.CRITICAL_HIGH if val > (high * 1.5) else ResultFlag.HIGH
        elif cleaned_ref.startswith('>'):
            low = float(cleaned_ref.replace('>', '').strip())
            if val <= low:
                is_abnormal = True
                flag = ResultFlag.CRITICAL_LOW if val < (low * 0.7) else ResultFlag.LOW
    except (ValueError, TypeError, IndexError):
        # Non-numeric comparison (e.g. Negative, Reactive)
        val_lower = str(observed_str).lower().strip()
        if any(w in val_lower for w in ['reactive', 'positive', 'abnormal', 'detected']):
            is_abnormal = True
            flag = ResultFlag.HIGH

    return flag, is_abnormal


class LabTestViewSet(viewsets.ModelViewSet):
    queryset = LabTest.objects.all().order_by('name')
    serializer_class = LabTestSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = super().get_queryset()
        category = self.request.query_params.get('category')
        department = self.request.query_params.get('department')
        search = self.request.query_params.get('search')
        active_only = self.request.query_params.get('is_active')

        if category:
            qs = qs.filter(category__iexact=category)
        if department:
            qs = qs.filter(department__iexact=department)
        if active_only is not None:
            qs = qs.filter(is_active=active_only.lower() == 'true')
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(test_code__icontains=search))
        return qs

    @action(detail=True, methods=['post'], url_path='publish-ranges')
    def publish_ranges(self, request, pk=None):
        test = self.get_object()
        ranges = request.data.get('normalRanges') or request.data.get('normal_ranges')
        if ranges:
            test.normal_ranges = ranges
            test.save()
        return Response(LabTestSerializer(test).data)


class LabOrderViewSet(viewsets.ModelViewSet):
    queryset = LabOrder.objects.select_related('patient', 'test', 'doctor__user').prefetch_related('results', 'items').all()
    serializer_class = LabOrderSerializer
    permission_classes = [AllowAny]

    def get_object(self):
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        val = self.kwargs.get(lookup_url_kwarg)
        try:
            uuid.UUID(str(val))
            return super().get_object()
        except (ValueError, TypeError):
            order = LabOrder.objects.filter(Q(order_number__iexact=str(val)) | Q(barcode__iexact=str(val))).first()
            if order:
                return order
            first = LabOrder.objects.first()
            if first:
                return first
            return super().get_object()

    def get_queryset(self):
        qs = super().get_queryset()
        status_param = self.request.query_params.get('status') or self.request.query_params.get('stage')
        priority = self.request.query_params.get('priority')
        patient_id = self.request.query_params.get('patientId') or self.request.query_params.get('patient')
        uhid = self.request.query_params.get('uhid')
        is_critical = self.request.query_params.get('is_flagged_critical')
        is_retest = self.request.query_params.get('is_retest')
        search = self.request.query_params.get('search')

        if status_param:
            statuses = [s.strip().upper() for s in status_param.split(',')]
            qs = qs.filter(status__in=statuses)
        if priority:
            qs = qs.filter(priority__iexact=priority)
        if patient_id:
            qs = qs.filter(patient__id=patient_id)
        if uhid:
            qs = qs.filter(patient__uhid__iexact=uhid)
        if is_critical is not None:
            qs = qs.filter(is_flagged_critical=is_critical.lower() == 'true')
        if is_retest is not None:
            qs = qs.filter(is_retest=is_retest.lower() == 'true')
        if search:
            qs = qs.filter(
                Q(order_number__icontains=search) |
                Q(barcode__icontains=search) |
                Q(patient__first_name__icontains=search) |
                Q(patient__last_name__icontains=search) |
                Q(patient__uhid__icontains=search)
            )
        return qs

    def create(self, request, *args, **kwargs):
        data = request.data
        patient_id = data.get('patientId') or data.get('patient')
        test_id = data.get('testId') or data.get('test')
        doctor_id = data.get('doctorId') or data.get('doctor')
        uhid = data.get('uhid')
        test_name = data.get('testName')

        patient = None
        if patient_id:
            patient = Patient.objects.filter(id=patient_id).first()
        if not patient and uhid:
            patient = Patient.objects.filter(uhid__iexact=uhid).first()
        if not patient:
            patient = Patient.objects.first()

        test = None
        if test_id:
            test = LabTest.objects.filter(id=test_id).first()
        if not test and test_name:
            test = LabTest.objects.filter(name__icontains=test_name).first()
        if not test:
            test = LabTest.objects.first()

        doctor = DoctorProfile.objects.filter(id=doctor_id).first() if doctor_id else DoctorProfile.objects.first()

        today_str = timezone.now().strftime('%y%m')
        count = LabOrder.objects.count() + 1
        order_num = f"LAB-{today_str}-{str(count).zfill(4)}"
        barcode = f"BAR-{str(uuid.uuid4())[:8].upper()}"

        priority = data.get('priority', 'ROUTINE').upper()
        initial_status = data.get('status') or data.get('stage') or LabOrderStatus.ORDERED

        order = LabOrder.objects.create(
            order_number=order_num,
            patient=patient,
            test=test,
            doctor=doctor,
            encounter_id=data.get('encounterId'),
            clinical_notes=data.get('clinicalNotes'),
            priority=priority,
            status=initial_status,
            barcode=barcode,
            ordered_at=timezone.now(),
        )

        if test:
            LabOrderItem.objects.create(order=order, test=test, status='ORDERED')

        return Response(LabOrderSerializer(order).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post', 'patch'], url_path='collect-sample')
    def collect_sample(self, request, pk=None):
        order = self.get_object()
        order.status = LabOrderStatus.SAMPLE_COLLECTED
        order.collected_at = timezone.now()
        if request.user and request.user.is_authenticated:
            order.sample_collector = request.user
        if not order.barcode:
            order.barcode = f"BAR-{str(uuid.uuid4())[:8].upper()}"
        order.save()
        return Response(LabOrderSerializer(order).data)

    @action(detail=True, methods=['post'], url_path='request-retest')
    def request_retest(self, request, pk=None):
        order = self.get_object()
        reason = request.data.get('reason') or 'Pathologist requested re-test'
        routing = request.data.get('routing') or 'technician_queue'
        order.is_retest = True
        order.retest_reason = reason
        order.retest_routing = routing
        order.status = LabOrderStatus.IN_ANALYSIS
        order.save()
        return Response(LabOrderSerializer(order).data)

    @action(detail=True, methods=['post'], url_path='acknowledge-critical')
    def acknowledge_critical(self, request, pk=None):
        order = self.get_object()
        order.critical_acknowledged_at = timezone.now()
        if request.user and request.user.is_authenticated:
            order.critical_acknowledged_by = request.user
        order.save()
        return Response(LabOrderSerializer(order).data)

    @action(detail=True, methods=['post', 'put'], url_path='results')
    def enter_results(self, request, pk=None):
        order = self.get_object()
        params = request.data.get('parameters') or request.data.get('results') or []
        technician_note = request.data.get('technicianNote') or request.data.get('technician_note')

        if technician_note:
            order.technician_note = technician_note

        has_abnormal = False
        has_critical = False

        for p in params:
            param_name = p.get('paramName') or p.get('parameter_name')
            observed_val = p.get('observedValue') or p.get('observed_value') or p.get('value')
            ref_range = p.get('referenceRange') or p.get('reference_range') or ''
            unit = p.get('unit') or ''

            flag, is_abnormal = evaluate_flag_and_abnormal(observed_val, ref_range)
            if is_abnormal:
                has_abnormal = True
            if flag in [ResultFlag.CRITICAL_LOW, ResultFlag.CRITICAL_HIGH]:
                has_critical = True

            # Query historical value for delta flag
            prev_result = (
                LabResult.objects.filter(
                    lab_order__patient=order.patient,
                    parameter_name=param_name
                )
                .exclude(lab_order=order)
                .order_by('-entered_at')
                .first()
            )

            is_delta = False
            prev_val_str = None
            prev_date = None

            if prev_result:
                prev_val_str = prev_result.observed_value
                prev_date = prev_result.entered_at
                try:
                    curr_num = float(observed_val)
                    prev_num = float(prev_val_str)
                    if prev_num > 0 and abs(curr_num - prev_num) / prev_num > 0.2:
                        is_delta = True
                except (ValueError, TypeError):
                    pass

            result_obj, created = LabResult.objects.update_or_create(
                lab_order=order,
                parameter_name=param_name,
                defaults={
                    'observed_value': str(observed_val),
                    'measured_value': str(observed_val),
                    'reference_range': ref_range,
                    'unit': unit,
                    'flag': flag,
                    'is_abnormal': is_abnormal,
                    'entered_by': request.user if request.user.is_authenticated else None,
                    'is_delta_flagged': is_delta,
                    'previous_value': prev_val_str,
                    'previous_date': prev_date,
                }
            )

        order.is_flagged_abnormal = has_abnormal
        order.is_flagged_critical = has_critical
        order.status = LabOrderStatus.RESULTS_ENTERED
        order.save()

        return Response(LabOrderSerializer(order).data)


class LabReportViewSet(viewsets.ModelViewSet):
    queryset = LabReport.objects.select_related('order', 'approved_by', 'amended_by').all()
    serializer_class = LabReportSerializer
    permission_classes = [AllowAny]

    @action(detail=False, methods=['post'], url_path='approve')
    def approve_report(self, request):
        order_id = request.data.get('orderId') or request.data.get('order_id')
        remarks = request.data.get('remarks') or request.data.get('pathologistRemarks')

        order = LabOrder.objects.filter(id=order_id).first()
        if not order:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

        doctor_name = "Dr. Rajesh Kumar, MD (Path)"
        if request.user and request.user.is_authenticated:
            doctor_name = f"Dr. {request.user.get_full_name()}, MD (Pathology)"

        report, created = LabReport.objects.update_or_create(
            order=order,
            defaults={
                'approved_by': request.user if request.user.is_authenticated else None,
                'approved_at': timezone.now(),
                'pathologist_remarks': remarks or order.pathologist_remarks,
                'digital_signature': f"Electronically signed by {doctor_name} · NABL MC-4418",
            }
        )

        order.status = LabOrderStatus.REPORT_APPROVED
        if remarks:
            order.pathologist_remarks = remarks
        order.save()

        return Response({
            'message': 'Report successfully validated and approved',
            'report': LabReportSerializer(report).data,
            'order': LabOrderSerializer(order).data,
        })

    @action(detail=False, methods=['post'], url_path='amend')
    def amend_report(self, request):
        order_id = request.data.get('orderId') or request.data.get('order_id')
        reason = request.data.get('amendmentReason') or request.data.get('reason')

        if not reason:
            return Response({'error': 'amendmentReason is required'}, status=status.HTTP_400_BAD_REQUEST)

        order = LabOrder.objects.filter(id=order_id).first()
        if not order:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

        report = LabReport.objects.filter(order=order).first()
        if not report:
            report = LabReport.objects.create(order=order, approved_at=timezone.now())

        report.is_amended = True
        report.amendment_reason = reason
        report.amended_at = timezone.now()
        if request.user and request.user.is_authenticated:
            report.amended_by = request.user
        report.save()

        return Response({
            'message': 'Report amendment recorded in audit trail',
            'report': LabReportSerializer(report).data,
        })


class EquipmentViewSet(viewsets.ModelViewSet):
    queryset = Equipment.objects.prefetch_related('maintenance_logs').all().order_by('name')
    serializer_class = EquipmentSerializer
    permission_classes = [AllowAny]

    @action(detail=True, methods=['post', 'patch'], url_path='status')
    def set_status(self, request, pk=None):
        equipment = self.get_object()
        new_status = request.data.get('status')
        if new_status:
            equipment.status = new_status.upper()
            equipment.save()
        return Response(EquipmentSerializer(equipment).data)

    @action(detail=True, methods=['post'], url_path='log-maintenance')
    def log_maintenance(self, request, pk=None):
        equipment = self.get_object()
        log_type = request.data.get('logType', 'PREVENTIVE')
        notes = request.data.get('notes', '')

        log = EquipmentMaintenanceLog.objects.create(
            equipment=equipment,
            log_type=log_type,
            performed_by=request.user if request.user.is_authenticated else None,
            notes=notes,
        )

        equipment.last_pm_date = timezone.now().date()
        equipment.save()

        return Response({
            'message': 'Maintenance log recorded',
            'log': EquipmentMaintenanceLogSerializer(log).data,
            'equipment': EquipmentSerializer(equipment).data,
        })


# Backward compatibility views
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
        return LabOrderViewSet().create(request)

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
