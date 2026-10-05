from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response

from apps.pharmacy.inventory_services import PharmacyInventoryService


class InventoryExtendedKPIsView(APIView):
    """
    Returns 10 comprehensive operational KPIs (2 rows x 5 cards)
    including stock health, dead-stock capital lockup, and pending requisitions.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        window_months = int(request.query_params.get('window_months', 3))
        kpis = PharmacyInventoryService.get_extended_kpis(window_months=window_months)
        return Response(kpis, status=status.HTTP_200_OK)


class InventoryDemandQueueView(APIView):
    """
    Real-time demand indent queue from OPD Counters, IPD Wards, and Emergency STAT.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        pill = request.query_params.get('pill', 'all')
        q = request.query_params.get('q', '')
        demands = PharmacyInventoryService.get_department_demand_queue(filter_pill=pill, query=q)
        return Response(demands, status=status.HTTP_200_OK)


class InventoryDemandFulfillView(APIView):
    """
    Dispatches a 1-click internal transfer to fulfill a ward/counter demand.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        demand_id = request.data.get('demand_id')
        batch_id = request.data.get('batch_id')
        quantity = int(request.data.get('quantity', 1))
        notes = request.data.get('notes')

        result = PharmacyInventoryService.fulfill_demand_transfer(
            demand_id=demand_id,
            batch_id=batch_id,
            quantity=quantity,
            user=request.user,
            notes=notes
        )
        return Response(result, status=status.HTTP_200_OK)


class InventoryDeadStockView(APIView):
    """
    Identifies medicines and batches with zero consumption over 180 days.
    Provides total valuation and AI recommendations (SUBSTITUTE, NETWORK_TRANSFER, BUYBACK_RETURN).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        pill = request.query_params.get('pill', 'all')
        q = request.query_params.get('q', '')
        dead_stock = PharmacyInventoryService.get_dead_stock_analytics(filter_pill=pill, query=q)
        return Response(dead_stock, status=status.HTTP_200_OK)


class InventoryForecastingView(APIView):
    """
    Computes 30-day run-rate burn, days of cover, projected stockout date, and suggested reorder quantities.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        pill = request.query_params.get('pill', 'all')
        q = request.query_params.get('q', '')
        analytics = PharmacyInventoryService.get_forecasting_analytics(filter_pill=pill, query=q)
        return Response(analytics, status=status.HTTP_200_OK)


class InventoryReconciliationView(APIView):
    """
    Physical stock cycle count reconciliation.
    Variances > ₹1,000 or involving Schedule X/Narcotics are routed for Pharmacy Admin approval.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        pill = request.query_params.get('pill', 'all')
        q = request.query_params.get('q', '')
        reconciliations = PharmacyInventoryService.get_stock_reconciliations(filter_pill=pill, query=q)
        return Response(reconciliations, status=status.HTTP_200_OK)

    def post(self, request):
        medicine_id = request.data.get('medicine_id')
        batch_id = request.data.get('batch_id')
        physical_count = int(request.data.get('physical_count', 0))
        reason_code = request.data.get('reason_code', 'COUNT_VERIFIED')
        notes = request.data.get('notes', '')

        if not medicine_id:
            return Response({'detail': 'medicine_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        result = PharmacyInventoryService.submit_stock_reconciliation(
            medicine_id=medicine_id,
            batch_id=batch_id,
            physical_count=physical_count,
            reason_code=reason_code,
            user=request.user,
            notes=notes
        )
        return Response(result, status=status.HTTP_201_CREATED)


class PharmacyMedicineArchiveView(APIView):
    """
    Archives a medicine from the active hospital formulary catalog.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        result = PharmacyInventoryService.archive_medicine(medicine_id=pk)
        return Response(result, status=status.HTTP_200_OK)


class PharmacyMedicineRestoreView(APIView):
    """
    Restores an archived medicine back to the active formulary.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        result = PharmacyInventoryService.restore_medicine(medicine_id=pk)
        return Response(result, status=status.HTTP_200_OK)


class PharmacyBatchQuarantineView(APIView):
    """
    Quarantines a compromised or expiring batch, moving it to quarantine lockbox and blocking dispensing.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        reason = request.data.get('reason', 'Quality excursion or near-expiry containment')
        result = PharmacyInventoryService.quarantine_batch(batch_id=pk, reason=reason, user=request.user)
        return Response(result, status=status.HTTP_200_OK)


class PharmacyBatchVendorReturnView(APIView):
    """
    Issues a Return-to-Vendor (RTV) debit note claim with supplier for credit or refund.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        supplier_name = request.data.get('supplier_name', 'Vendor')
        debit_note = request.data.get('debit_note') or request.data.get('debit_note_number', 'DN-PENDING')
        quantity = int(request.data.get('quantity', 1))
        reason = request.data.get('reason', 'Vendor return')

        result = PharmacyInventoryService.return_batch_to_vendor(
            batch_id=pk,
            supplier_name=supplier_name,
            debit_note=debit_note,
            quantity=quantity,
            reason=reason,
            user=request.user
        )
        return Response(result, status=status.HTTP_200_OK)


class PharmacyBatchDestroyView(APIView):
    """
    Logs hazardous pharmaceutical bio-medical waste destruction with witness certificate.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        certificate_id = request.data.get('certificate_id') or request.data.get('cert_id', 'BM-SCRAP')
        witness_name = request.data.get('witness_name', 'Dr. Pooja Shah (Pharmacy Admin)')
        method = request.data.get('method', 'High-Temperature Incineration (CPCB Authorized)')

        result = PharmacyInventoryService.destroy_batch(
            batch_id=pk,
            certificate_id=certificate_id,
            witness_name=witness_name,
            method=method,
            user=request.user
        )
        return Response(result, status=status.HTTP_200_OK)
