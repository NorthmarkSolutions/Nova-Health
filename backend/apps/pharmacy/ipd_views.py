from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.contrib.auth import get_user_model

from apps.accounts.models import RoleType
from apps.pharmacy.ipd_services import PharmacyIPDOperationsService

User = get_user_model()


class IPDOperationsQueueView(APIView):
    """
    Returns filtered, categorized Inpatient Ward Medication Requisitions.
    Supports tab ('requests', 'pending', 'issued', 'emergency'),
    pending_status sub-filter ('All Pending', 'Reviewing', 'Allocated', 'Awaiting Pickup', 'Issued', 'Partially Issued'),
    ward filter, and text search.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        tab = request.query_params.get('tab', 'requests').lower()
        ward = request.query_params.get('ward', 'All')
        q = request.query_params.get('q', '').strip()
        pending_status = request.query_params.get('pending_status', None)

        queue = PharmacyIPDOperationsService.get_ipd_queue(
            tab=tab,
            ward=ward,
            search=q,
            pending_status=pending_status
        )
        return Response(queue)


class IPDOperationsKPIsView(APIView):
    """Returns the 5 KPI metric cards for IPD Pharmacist workspace."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        kpis = PharmacyIPDOperationsService.get_ipd_kpis()
        return Response(kpis)


class IPDAllocationUpdateView(APIView):
    """
    Requirement 1: Updates Requested, Allocated, Remaining, and Backordered quantities.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk=None):
        order_id = pk or request.data.get('order_id')
        item_id = request.data.get('item_id')
        allocated_quantity = request.data.get('allocated_quantity', 0)
        backordered_quantity = request.data.get('backordered_quantity', 0)

        if not order_id or not item_id:
            return Response({'error': 'order_id and item_id are required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user if request.user and request.user.is_authenticated else User.objects.filter(role='PHARMACIST').first()
        try:
            res = PharmacyIPDOperationsService.update_allocation(
                order_id=order_id,
                item_id=item_id,
                allocated_quantity=allocated_quantity,
                backordered_quantity=backordered_quantity,
                user=user
            )
            return Response(res, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class IPDPrescriberApprovalView(APIView):
    """
    Requirement 3: Requests Prescriber Approval & Records Substitution Audit.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk=None):
        order_id = pk or request.data.get('order_id')
        if not order_id:
            return Response({'error': 'Order ID is required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user if request.user and request.user.is_authenticated else User.objects.filter(role='PHARMACIST').first()
        try:
            audit = PharmacyIPDOperationsService.request_prescriber_approval(
                order_id=order_id,
                payload=request.data,
                user=user
            )
            return Response({
                'success': True,
                'audit': audit,
                'message': f"Substitution with {audit['substitute_name']} authorized by {audit['prescriber_name']}."
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class IPDWardHandoverTrackingView(APIView):
    """
    Requirement 4: Captures Collected By (Nurse), Collection Time, Handed Over By (Pharmacist).
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk=None):
        order_id = pk or request.data.get('order_id')
        if not order_id:
            return Response({'error': 'Order ID is required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user if request.user and request.user.is_authenticated else User.objects.filter(role='PHARMACIST').first()
        try:
            handover = PharmacyIPDOperationsService.record_ward_handover(
                order_id=order_id,
                payload=request.data,
                user=user
            )
            return Response({
                'success': True,
                'handover': handover,
                'message': f"Ward handover recorded to Nurse {handover['collected_by']} at {handover['collection_time']}."
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class IPDMARStatusUpdateView(APIView):
    """
    Requirement 5: Updates live MAR status (Awaiting Supply, Ready To Administer, Administered).
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk=None):
        order_id = pk or request.data.get('order_id')
        if not order_id:
            return Response({'error': 'Order ID is required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user if request.user and request.user.is_authenticated else User.objects.filter(role='PHARMACIST').first()
        try:
            res = PharmacyIPDOperationsService.update_mar_status(
                order_id=order_id,
                payload=request.data,
                user=user
            )
            return Response(res, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class IPDWardReturnClassificationView(APIView):
    """
    Requirement 7: Processes ward returns with operational classifications
    (Patient Discharged, Medication Stopped, Unused, Expired, Damaged).
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk=None):
        return_id = pk or request.data.get('return_id')
        if not return_id:
            return Response({'error': 'Return ID is required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user if request.user and request.user.is_authenticated else User.objects.filter(role='PHARMACIST').first()
        try:
            res = PharmacyIPDOperationsService.process_ward_return(
                return_id=return_id,
                payload=request.data,
                user=user
            )
            return Response({
                'success': True,
                'return': res,
                'message': f"Return {res['return_number']} processed with classification {res['classification']}."
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
