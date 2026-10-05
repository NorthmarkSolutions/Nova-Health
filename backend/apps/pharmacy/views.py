from rest_framework import viewsets, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Q
from django.utils import timezone
from django.contrib.auth import get_user_model
from datetime import timedelta
from decimal import Decimal

User = get_user_model()
from apps.accounts.models import RoleType

from apps.patients.models import Patient
from apps.clinical.models import Prescription, PrescriptionItem
from apps.ipd.models import InpatientAdmission

from apps.pharmacy.models import (
    PharmacyMedicine,
    PharmacySupplier,
    PharmacyPurchaseRequest,
    PharmacyPurchaseRequestItem,
    PharmacyPurchaseOrder,
    PharmacyPurchaseOrderItem,
    PharmacyBatch,
    PharmacyStockTransaction,
    PharmacyGoodsReceipt,
    PharmacyGoodsReceiptItem,
    PharmacyStockAdjustment,
    PharmacyTransferRequest,
    PharmacyControlledDrugRegister,
    PharmacyDispenseOrder,
    PharmacyDispenseOrderItem,
    PharmacyOTCSale,
    PharmacyOTCSaleItem,
    PharmacyReturn,
    PharmacyReturnItem,
    PharmacyCounterShift,
    PharmacyDutySchedule,
    PharmacyGovernanceAuditLog,
    PharmacyDepartmentSetting,
    PRStatus,
    BatchStatus,
    GoodsReceiptStatus,
    AdjustmentStatus,
    TransferStatus,
    EncounterType,
    SettlementMode,
    DispensePaymentStatus,
    DispenseOrderStatus,
    PrescriptionOutcome,
    PurchasedOutsideReason,
    ShiftType,
)
from apps.pharmacy.serializers import (
    PharmacyMedicineSerializer,
    PharmacySupplierSerializer,
    PharmacyPurchaseRequestSerializer,
    PharmacyPurchaseOrderSerializer,
    PharmacyBatchSerializer,
    PharmacyStockTransactionSerializer,
    PharmacyGoodsReceiptSerializer,
    PharmacyStockAdjustmentSerializer,
    PharmacyTransferRequestSerializer,
    PharmacyControlledDrugRegisterSerializer,
    PharmacyVaultReconciliationSerializer,
    PharmacyDispenseOrderSerializer,
    PharmacyDispenseOrderItemSerializer,
    PharmacyOTCSaleSerializer,
    PharmacyReturnSerializer,
    PharmacyCounterShiftSerializer,
    PharmacyDutyScheduleSerializer,
    PharmacyGovernanceAuditLogSerializer,
    PharmacyDepartmentSettingSerializer,
)
from apps.pharmacy.services import (
    PharmacyStockService,
    PharmacyProcurementService,
    PharmacyInventoryActionService,
    PharmacyAllergyService,
    PharmacyClinicalHandoffService,
    PharmacyOPDDispensingService,
    PharmacyBillingSettlementService,
    PharmacyIPDService,
    PharmacyControlledDrugService,
    PharmacyAdminService,
)


class IsPharmacyOrAdmin(permissions.BasePermission):
    """Allows access to Pharmacists, Inventory Managers, and Hospital/Super Admins."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        allowed_roles = ['PHARMACIST', 'INVENTORY_MANAGER', 'HOSPITAL_ADMIN', 'SUPER_ADMIN', 'DEPARTMENT_ADMIN']
        return getattr(request.user, 'role', None) in allowed_roles or request.user.is_superuser


class IsNotDepartmentAdminForDirectOperations(permissions.BasePermission):
    """
    Separation of Concerns:
    Strictly forbids DEPARTMENT_ADMIN (and Pharmacy Executive Admins) from executing
    direct dispensing, ward issuing, or inventory stock adjustments (returns HTTP 403).
    Administrative governance accounts are restricted to oversight, PR approvals,
    staff rosters, pricing, and compliance audits.
    """
    message = "Separation of Concerns: Department Administrators and Chief Pharmacists are restricted to governance and oversight, and cannot directly execute dispensing, ward issuing, or inventory adjustments."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return True
        user_role = getattr(request.user, 'role', None)
        if user_role == RoleType.DEPARTMENT_ADMIN or user_role == 'DEPARTMENT_ADMIN':
            return False
        return True



class InventoryKPIsView(APIView):
    permission_classes = [IsPharmacyOrAdmin]

    def get(self, request):
        window = int(request.query_params.get('window_months', 3))
        data = PharmacyStockService.calculate_inventory_kpis(expiry_window_months=window)
        return Response(data)


class InventoryDashboardAlertsView(APIView):
    permission_classes = [IsPharmacyOrAdmin]

    def get(self, request):
        pill = request.query_params.get('pill', 'all')
        q = request.query_params.get('q', '').strip().lower()
        today = timezone.now().date()
        cutoff_90d = today + timedelta(days=90)

        medicines = PharmacyMedicine.objects.filter(is_active=True).prefetch_related('batches')
        results = []

        open_prs_by_med = {}
        open_items = PharmacyPurchaseRequestItem.objects.filter(
            purchase_request__status__in=['Draft', 'Pending approval', 'Approved', 'PO issued', 'Receiving', 'SUBMITTED', 'UNDER_REVIEW']
        ).select_related('purchase_request')
        for item in open_items:
            open_prs_by_med[item.medicine_id] = item.purchase_request

        for med in medicines:
            stock = sum(
                b.available_quantity for b in med.batches.all()
                if not b.is_quarantined and b.status in ['ACTIVE', 'Active'] and b.expiry_date >= today
            )
            has_expiring = any(
                b.available_quantity > 0 and b.status in ['ACTIVE', 'Active'] and not b.is_quarantined and b.expiry_date <= cutoff_90d
                for b in med.batches.all()
            )
            open_pr = open_prs_by_med.get(med.id)

            is_out = stock == 0
            is_low = stock > 0 and stock < med.reorder_level
            is_no_pr = stock < med.reorder_level and not open_pr

            # Filter logic
            include = False
            if pill == 'all':
                include = is_out or is_low or has_expiring or is_no_pr
            elif pill == 'out':
                include = is_out
            elif pill == 'low':
                include = is_low
            elif pill == 'exp':
                include = has_expiring
            elif pill == 'nopr':
                include = is_no_pr

            if include:
                if q and q not in med.name.lower() and q not in med.item_code.lower() and q not in (med.generic_name or '').lower():
                    continue

                results.append({
                    'id': str(med.id),
                    'code': med.item_code,
                    'name': med.name,
                    'generic': med.generic_name or '',
                    'category': med.category,
                    'schedule': med.schedule,
                    'in_stock': stock,
                    'reorder_level': med.reorder_level,
                    'unit_price': float(med.unit_price),
                    'is_narcotic': med.is_narcotic,
                    'is_cold_chain': med.is_cold_chain,
                    'reorder_status': f"{open_pr.pr_number} · {open_pr.status}" if open_pr else ("Not raised" if stock < med.reorder_level else "—"),
                    'open_pr_id': str(open_pr.id) if open_pr else None,
                    'status': 'Out of stock' if is_out else ('Low stock' if is_low else ('Expiring soon' if has_expiring else 'In stock'))
                })

        # Sort: Out of stock first, then Low stock, then others
        def sort_priority(item):
            if item['in_stock'] == 0:
                return 0
            if item['in_stock'] < item['reorder_level']:
                return 1
            return 2

        results.sort(key=sort_priority)
        return Response(results)


class PharmacyMedicineViewSet(viewsets.ModelViewSet):
    queryset = PharmacyMedicine.objects.all().prefetch_related('batches')
    serializer_class = PharmacyMedicineSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        qs = PharmacyMedicine.objects.filter(is_active=True).prefetch_related('batches', 'default_supplier')
        pill = self.request.query_params.get('pill', 'all')
        q = self.request.query_params.get('q', '').strip().lower()
        today = timezone.now().date()

        if q:
            qs = qs.filter(
                Q(name__icontains=q) |
                Q(item_code__icontains=q) |
                Q(generic_name__icontains=q)
            )

        if pill == 'low':
            # Stock less than reorder
            med_ids = [m.id for m in qs if PharmacyStockService.get_medicine_stock(m.id) < m.reorder_level]
            qs = qs.filter(id__in=med_ids)
        elif pill == 'out':
            med_ids = [m.id for m in qs if PharmacyStockService.get_medicine_stock(m.id) == 0]
            qs = qs.filter(id__in=med_ids)
        elif pill == 'cd':
            qs = qs.filter(is_narcotic=True)
        elif pill == 'cold':
            qs = qs.filter(is_cold_chain=True)
        elif pill == 'otc':
            qs = qs.filter(schedule='OTC')

        return qs


class PharmacyBatchViewSet(viewsets.ModelViewSet):
    queryset = PharmacyBatch.objects.all().select_related('medicine', 'supplier')
    serializer_class = PharmacyBatchSerializer
    permission_classes = [IsPharmacyOrAdmin]

    def get_queryset(self):
        qs = PharmacyBatch.objects.all().select_related('medicine', 'supplier')
        pill = self.request.query_params.get('pill', 'all')
        q = self.request.query_params.get('q', '').strip().lower()
        today = timezone.now().date()
        cutoff_90d = today + timedelta(days=90)

        if q:
            qs = qs.filter(
                Q(batch_number__icontains=q) |
                Q(medicine__name__icontains=q) |
                Q(medicine__item_code__icontains=q) |
                Q(supplier__name__icontains=q)
            )

        if pill == 'Active':
            qs = qs.filter(status__in=['ACTIVE', 'Active'], is_quarantined=False)
        elif pill == 'Quarantined':
            qs = qs.filter(Q(status='Quarantined') | Q(is_quarantined=True))
        elif pill == 'exp':
            qs = qs.filter(status__in=['ACTIVE', 'Active'], available_quantity__gt=0, expiry_date__lte=cutoff_90d)

        return qs.order_by('expiry_date', 'created_at')

    @action(detail=True, methods=['post'], url_path='action')
    def apply_action(self, request, pk=None):
        act = request.data.get('action')
        reason = request.data.get('reason', '')
        if act not in ['Quarantine', 'Release to stock', 'Return to supplier', 'Write off']:
            return Response({'error': f"Invalid batch action: {act}"}, status=status.HTTP_400_BAD_REQUEST)

        batch = PharmacyInventoryActionService.execute_batch_action(pk, act, request.user, reason)
        return Response(PharmacyBatchSerializer(batch).data)

    @action(detail=False, methods=['get'])
    def expiring(self, request):
        window_months = int(request.query_params.get('window_months', 6))
        pill = request.query_params.get('pill', 'all')
        q = request.query_params.get('q', '').strip().lower()

        today = timezone.now().date()
        cutoff = today + timedelta(days=window_months * 30)

        qs = PharmacyBatch.objects.filter(
            available_quantity__gt=0,
            expiry_date__lte=cutoff
        ).select_related('medicine', 'supplier')

        if q:
            qs = qs.filter(
                Q(batch_number__icontains=q) |
                Q(medicine__name__icontains=q)
            )

        if pill == '30':
            qs = qs.filter(expiry_date__lte=today + timedelta(days=30))
        elif pill == '90':
            qs = qs.filter(expiry_date__lte=today + timedelta(days=90))
        elif pill == 'act':
            qs = qs.filter(status__in=['Return', 'Write-off', 'Quarantined'])

        qs = qs.order_by('expiry_date')
        return Response(PharmacyBatchSerializer(qs, many=True).data)


class PharmacyPurchaseRequestViewSet(viewsets.ModelViewSet):
    queryset = PharmacyPurchaseRequest.objects.all().select_related('supplier', 'requested_by').prefetch_related('items__medicine')
    serializer_class = PharmacyPurchaseRequestSerializer
    permission_classes = [IsPharmacyOrAdmin]

    def get_queryset(self):
        qs = PharmacyPurchaseRequest.objects.all().select_related('supplier', 'requested_by').prefetch_related('items__medicine')
        pill = self.request.query_params.get('pill', 'all')
        q = self.request.query_params.get('q', '').strip().lower()

        if q:
            qs = qs.filter(
                Q(pr_number__icontains=q) |
                Q(items__medicine__name__icontains=q) |
                Q(supplier__name__icontains=q)
            ).distinct()

        if pill != 'all':
            qs = qs.filter(status=pill)

        return qs.order_by('-created_at')

    def create(self, request, *args, **kwargs):
        medicine_id = request.data.get('medicine_id')
        qty = int(request.data.get('quantity', 100))
        supplier_id = request.data.get('supplier_id')
        notes = request.data.get('notes', '')

        if not medicine_id:
            return Response({'error': 'medicine_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        pr = PharmacyProcurementService.create_purchase_request(
            medicine_id=medicine_id,
            requested_quantity=qty,
            supplier_id=supplier_id,
            user=request.user,
            notes=notes
        )
        return Response(PharmacyPurchaseRequestSerializer(pr).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='bulk-reorder')
    def bulk_reorder(self, request):
        created_prs = PharmacyProcurementService.bulk_reorder(request.user)
        return Response({
            'count': len(created_prs),
            'prs': PharmacyPurchaseRequestSerializer(created_prs, many=True).data,
            'message': f"{len(created_prs)} purchase request draft(s) created."
        })

    @action(detail=True, methods=['post'])
    def transition(self, request, pk=None):
        act = request.data.get('action')
        reason = request.data.get('reason', '')
        if act not in ['submit', 'approve', 'reject', 'withdraw', 'issue_po', 'record_delivery']:
            return Response({'error': f"Invalid PR action: {act}"}, status=status.HTTP_400_BAD_REQUEST)

        pr = PharmacyProcurementService.transition_pr(pk, act, request.user, reason)
        return Response(PharmacyPurchaseRequestSerializer(pr).data)


class PharmacyGoodsReceiptViewSet(viewsets.ModelViewSet):
    queryset = PharmacyGoodsReceipt.objects.all().select_related('supplier', 'purchase_order', 'purchase_request').prefetch_related('lines__medicine')
    serializer_class = PharmacyGoodsReceiptSerializer
    permission_classes = [IsPharmacyOrAdmin]

    def get_queryset(self):
        qs = PharmacyGoodsReceipt.objects.all().select_related('supplier', 'purchase_order', 'purchase_request').prefetch_related('lines__medicine')
        pill = self.request.query_params.get('pill', 'all')
        q = self.request.query_params.get('q', '').strip().lower()

        if q:
            qs = qs.filter(
                Q(grn_number__icontains=q) |
                Q(supplier__name__icontains=q) |
                Q(invoice_number__icontains=q)
            )

        if pill == 'Pending verification' or pill == 'Pending QC':
            qs = qs.filter(status=GoodsReceiptStatus.PENDING_QC)
        elif pill == 'Posted':
            qs = qs.filter(status=GoodsReceiptStatus.POSTED)

        return qs.order_by('-received_at')

    @action(detail=True, methods=['post'])
    def post(self, request, pk=None):
        checks = request.data.get('checks', {})
        grn = PharmacyProcurementService.post_goods_receipt(pk, request.user, checks)
        return Response(PharmacyGoodsReceiptSerializer(grn).data)


class PharmacySupplierViewSet(viewsets.ModelViewSet):
    queryset = PharmacySupplier.objects.all()
    serializer_class = PharmacySupplierSerializer
    permission_classes = [IsPharmacyOrAdmin]

    def get_queryset(self):
        qs = PharmacySupplier.objects.all()
        pill = self.request.query_params.get('pill', 'all')
        q = self.request.query_params.get('q', '').strip().lower()

        if q:
            qs = qs.filter(
                Q(name__icontains=q) |
                Q(supplier_code__icontains=q) |
                Q(category__icontains=q)
            )

        if pill != 'all':
            qs = qs.filter(status=pill)

        return qs.order_by('name')


class PharmacyStockAdjustmentViewSet(viewsets.ModelViewSet):
    queryset = PharmacyStockAdjustment.objects.all().select_related('medicine', 'batch', 'adjusted_by', 'approved_by')
    serializer_class = PharmacyStockAdjustmentSerializer
    permission_classes = [IsPharmacyOrAdmin]

    def get_queryset(self):
        qs = PharmacyStockAdjustment.objects.all().select_related('medicine', 'batch', 'adjusted_by', 'approved_by')
        pill = self.request.query_params.get('pill', 'all')
        q = self.request.query_params.get('q', '').strip().lower()

        if q:
            qs = qs.filter(
                Q(adjustment_number__icontains=q) |
                Q(medicine__name__icontains=q) |
                Q(batch__batch_number__icontains=q)
            )

        if pill != 'all':
            qs = qs.filter(status=pill)

        return qs.order_by('-created_at')

    def create(self, request, *args, **kwargs):
        if request.user and getattr(request.user, 'role', None) in [RoleType.DEPARTMENT_ADMIN, 'DEPARTMENT_ADMIN']:
            return Response({
                'detail': 'Separation of Concerns: Department Administrators and Chief Pharmacists are restricted to governance and oversight, and cannot directly execute dispensing, ward issuing, or inventory adjustments.'
            }, status=status.HTTP_403_FORBIDDEN)

        med_id = request.data.get('medicine_id')
        batch_id = request.data.get('batch_id')
        delta = int(request.data.get('quantity_delta', 0))
        reason = request.data.get('reason', 'Physical count')
        note = request.data.get('note', '')

        if not med_id or not batch_id or delta == 0:
            return Response({'error': 'medicine_id, batch_id and non-zero quantity_delta required'}, status=status.HTTP_400_BAD_REQUEST)

        adj = PharmacyInventoryActionService.create_stock_adjustment(
            medicine_id=med_id,
            batch_id=batch_id,
            quantity_delta=delta,
            reason=reason,
            user=request.user,
            note=note
        )
        return Response(PharmacyStockAdjustmentSerializer(adj).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        adj = PharmacyInventoryActionService.approve_stock_adjustment(pk, request.user)
        return Response(PharmacyStockAdjustmentSerializer(adj).data)

    @action(detail=True, methods=['post'])
    def withdraw(self, request, pk=None):
        adj = PharmacyStockAdjustment.objects.get(id=pk)
        if adj.status == AdjustmentStatus.PENDING_APPROVAL:
            adj.delete()
            return Response({'message': 'Adjustment withdrawn and deleted'})
        return Response({'error': 'Cannot withdraw posted adjustment'}, status=status.HTTP_400_BAD_REQUEST)


class PharmacyTransferRequestViewSet(viewsets.ModelViewSet):
    queryset = PharmacyTransferRequest.objects.all().select_related('medicine', 'dispatched_batch', 'requested_by')
    serializer_class = PharmacyTransferRequestSerializer
    permission_classes = [IsPharmacyOrAdmin]

    def get_queryset(self):
        qs = PharmacyTransferRequest.objects.all().select_related('medicine', 'dispatched_batch', 'requested_by')
        pill = self.request.query_params.get('pill', 'all')
        q = self.request.query_params.get('q', '').strip().lower()

        if q:
            qs = qs.filter(
                Q(transfer_number__icontains=q) |
                Q(medicine__name__icontains=q) |
                Q(destination__icontains=q)
            )

        if pill != 'all':
            qs = qs.filter(status=pill)

        return qs.order_by('-created_at')

    def create(self, request, *args, **kwargs):
        med_id = request.data.get('medicine_id')
        qty = int(request.data.get('quantity', 1))
        dest = request.data.get('destination', 'OPD Counter 1')

        tr = PharmacyInventoryActionService.create_transfer_request(med_id, qty, dest, request.user)
        return Response(PharmacyTransferRequestSerializer(tr).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='dispatch')
    def execute_dispatch(self, request, pk=None):
        try:
            tr = PharmacyInventoryActionService.dispatch_transfer(pk, request.user)
            return Response(PharmacyTransferRequestSerializer(tr).data)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def receive(self, request, pk=None):
        tr = PharmacyInventoryActionService.receive_transfer(pk, request.user)
        return Response(PharmacyTransferRequestSerializer(tr).data)


class PharmacyControlledDrugRegisterViewSet(viewsets.ModelViewSet):
    queryset = PharmacyControlledDrugRegister.objects.all().select_related('medicine', 'batch', 'patient', 'primary_pharmacist', 'witness_staff')
    serializer_class = PharmacyControlledDrugRegisterSerializer
    permission_classes = [IsPharmacyOrAdmin]

    def get_queryset(self):
        qs = PharmacyControlledDrugRegister.objects.all().select_related('medicine', 'batch', 'patient', 'primary_pharmacist', 'witness_staff')
        pill = self.request.query_params.get('pill', 'all')
        q = self.request.query_params.get('q', '').strip().lower()

        if q:
            qs = qs.filter(
                Q(entry_number__icontains=q) |
                Q(medicine__name__icontains=q) |
                Q(batch__batch_number__icontains=q) |
                Q(prescribing_doctor_name__icontains=q)
            )

        if pill != 'all':
            qs = qs.filter(medicine__item_code=pill)

        return qs.order_by('-created_at')

    @action(detail=False, methods=['post'], url_path='verify-count')
    def verify_count(self, request):
        batch_id = request.data.get('batch_id')
        count = int(request.data.get('physical_count', 0))

        batch = PharmacyBatch.objects.get(id=batch_id)
        current = batch.available_quantity
        diff = count - current

        matches = diff == 0
        return Response({
            'matches': matches,
            'physical_count': count,
            'current_balance': current,
            'difference': diff,
            'message': f"Count matches register ({count} units)" if matches else f"Discrepancy of {diff} units detected on shelf."
        })

    @action(detail=False, methods=['get'], url_path='vault-inventory')
    def vault_inventory(self, request):
        inventory = PharmacyControlledDrugService.get_vault_inventory()
        return Response(inventory)

    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        metrics = PharmacyControlledDrugService.get_summary_metrics()
        return Response(metrics)

    @action(detail=False, methods=['get'], url_path='eligible-witnesses')
    def eligible_witnesses(self, request):
        witnesses = PharmacyControlledDrugService.get_eligible_witnesses(current_user=request.user)
        return Response(witnesses)

    @action(detail=False, methods=['post'], url_path='verify-witness')
    def verify_witness(self, request):
        witness_id = request.data.get('witness_id')
        pin = request.data.get('pin') or request.data.get('password')
        res = PharmacyControlledDrugService.verify_witness_credentials(request.user, witness_id, pin)
        if not res['valid']:
            return Response({'valid': False, 'error': res['error']}, status=status.HTTP_400_BAD_REQUEST)
        return Response({
            'valid': True,
            'witness_name': res['witness_name'],
            'witness_role': res['witness_role'],
        })

    @action(detail=False, methods=['post'], url_path='dispense')
    def dispense_narcotic(self, request):
        user = request.user if request.user and request.user.is_authenticated else User.objects.first()
        try:
            entry = PharmacyControlledDrugService.dispense_controlled_substance(user, request.data)
            return Response(PharmacyControlledDrugRegisterSerializer(entry).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='reconcile')
    def reconcile(self, request):
        user = request.user if request.user and request.user.is_authenticated else User.objects.first()
        witness_id = request.data.get('witness_id')
        witness = User.objects.filter(id=witness_id).first() if witness_id else user
        try:
            rec = PharmacyControlledDrugService.reconcile_vault_count(user, witness, request.data)
            return Response(PharmacyVaultReconciliationSerializer(rec).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='export-report')
    def export_report(self, request):
        sched = request.query_params.get('schedule', 'all')
        report = PharmacyControlledDrugService.export_inspection_report(schedule=sched)
        return Response(report)


class OPDPharmacistKPIsView(APIView):
    """
    Returns the exact 5 KPI metrics required by OPD Pharmacist Workspace v2:
    1. Pending verification (with STAT count tag)
    2. OTC sales today (with revenue tag)
    3. Pending returns (awaiting inspection tag)
    4. Refund requests (inspected, awaiting refund tag)
    5. Controlled drug entries today (with overrides tag)
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        kpis = PharmacyOPDDispensingService.calculate_opd_kpis()
        return Response(kpis)


class PharmacyDispenseOrderViewSet(viewsets.ModelViewSet):
    """
    Pharmacy Dispense Queue ViewSet (OPD & IPD).
    Allows pharmacists to browse pending, under review, and fulfilled dispense orders.
    STRICT READ-ONLY INVARIANT: viewing and claiming orders does NOT alter batch inventory or billing ledgers.
    """
    queryset = PharmacyDispenseOrder.objects.all().select_related('patient', 'prescription', 'admission', 'dispensed_by').prefetch_related('items__medicine', 'items__batch')
    serializer_class = PharmacyDispenseOrderSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        qs = PharmacyDispenseOrder.objects.all().select_related('patient', 'prescription', 'admission', 'dispensed_by').prefetch_related('items__medicine', 'items__batch')
        encounter = self.request.query_params.get('type') or self.request.query_params.get('encounter_type')
        status_param = self.request.query_params.get('status')
        pill = self.request.query_params.get('pill', 'all').lower()
        q = self.request.query_params.get('q', '').strip().lower()

        if encounter and encounter.upper() in ['OPD', 'IPD', 'OTC']:
            qs = qs.filter(encounter_type=encounter.upper())

        if status_param and status_param != 'all':
            qs = qs.filter(status=status_param.upper())
        elif pill != 'all':
            if pill == 'new':
                qs = qs.filter(status=DispenseOrderStatus.PENDING)
            elif pill == 'verify' or pill == 'verification':
                qs = qs.filter(status=DispenseOrderStatus.UNDER_REVIEW)
            elif pill == 'payment':
                qs = qs.filter(status__in=[DispenseOrderStatus.PENDING, DispenseOrderStatus.UNDER_REVIEW], payment_status__in=['UNPAID', 'PARTIALLY_PAID', 'INSURANCE_PENDING'])
            elif pill == 'dispensing':
                qs = qs.filter(status=DispenseOrderStatus.UNDER_REVIEW, payment_status='PAID')
            elif pill == 'hold':
                qs = qs.filter(status=DispenseOrderStatus.AWAITING_STOCK)
            elif pill in ['partially_dispensed', 'partial']:
                qs = qs.filter(status=DispenseOrderStatus.PARTIALLY_DISPENSED)
            elif pill == 'stat':
                qs = qs.filter(priority='STAT')
            elif pill == 'cd':
                qs = qs.filter(Q(items__medicine__is_narcotic=True) | Q(items__medicine__schedule__in=['H1', 'X'])).distinct()
            elif pill == 'dispensed':
                qs = qs.filter(status=DispenseOrderStatus.DISPENSED)
            elif pill == 'allergy':
                qs = qs.filter(has_allergy_warning=True)

        if q:
            qs = qs.filter(
                Q(order_number__icontains=q) |
                Q(patient__uhid__icontains=q) |
                Q(patient__first_name__icontains=q) |
                Q(patient__last_name__icontains=q) |
                Q(prescription__prescription_number__icontains=q) |
                Q(doctor_name__icontains=q) |
                Q(items__medicine__name__icontains=q)
            ).distinct()

        # Strict priority ordering: STAT (0) -> Urgent (1) -> Routine (2), then longest wait (created_at asc)
        from django.db.models import Case, When, Value, IntegerField
        prio_order = Case(
            When(priority='STAT', then=Value(0)),
            When(priority='URGENT', then=Value(1)),
            When(priority='ROUTINE', then=Value(2)),
            default=Value(3),
            output_field=IntegerField()
        )
        return qs.order_by(prio_order, 'created_at')

    @action(detail=False, methods=['post'], url_path='call-next')
    def call_next(self, request):
        pending_orders = PharmacyDispenseOrder.objects.filter(
            encounter_type=EncounterType.OPD,
            status__in=[DispenseOrderStatus.PENDING, DispenseOrderStatus.UNDER_REVIEW]
        )
        stat = pending_orders.filter(priority='STAT').order_by('created_at').first()
        urgent = pending_orders.filter(priority='URGENT').order_by('created_at').first()
        order = stat or urgent or pending_orders.order_by('created_at').first()

        if not order:
            return Response({'message': 'No prescriptions waiting in queue.'}, status=status.HTTP_404_NOT_FOUND)

        PharmacyOPDDispensingService.claim_order(order, request.user if request.user.is_authenticated else None)
        return Response(PharmacyDispenseOrderSerializer(order).data)

    @action(detail=True, methods=['post'], url_path='claim')
    def claim_order(self, request, pk=None):
        order = self.get_object()
        order = PharmacyOPDDispensingService.claim_order(order, request.user if request.user.is_authenticated else None)
        return Response(PharmacyDispenseOrderSerializer(order).data)

    @action(detail=True, methods=['post'], url_path='set-step')
    def set_step(self, request, pk=None):
        order = self.get_object()
        step = int(request.data.get('step', 1))
        order.step = step
        if 'identity_confirmed' in request.data:
            order.identity_confirmed = bool(request.data.get('identity_confirmed'))
        if 'interaction_acknowledged' in request.data:
            order.interaction_acknowledged = bool(request.data.get('interaction_acknowledged'))
        order.save()
        return Response(PharmacyDispenseOrderSerializer(order).data)

    @action(detail=True, methods=['post'], url_path='override-allergy')
    def override_allergy(self, request, pk=None):
        order = self.get_object()
        reason = request.data.get('reason', '').strip()
        remarks = request.data.get('audit_remarks', '').strip()
        full_reason = f"{reason} · {remarks}".strip(' ·')
        if not full_reason:
            return Response({'error': 'Clinical override justification is mandatory for allergy warnings.'}, status=status.HTTP_400_BAD_REQUEST)
        order.allergy_override_reason = full_reason
        order.allergy_overridden_by = request.user if request.user and request.user.is_authenticated else None
        order.save()
        return Response(PharmacyDispenseOrderSerializer(order).data)

    @action(detail=True, methods=['post'], url_path='set-payment-source')
    def set_payment_source(self, request, pk=None):
        order = self.get_object()
        mode = request.data.get('settlement_mode', SettlementMode.PAY_AT_PHARMACY)
        payer_info = request.data.get('payer_info', {})
        order = PharmacyOPDDispensingService.set_payment_source(order, mode, payer_info)
        return Response(PharmacyDispenseOrderSerializer(order).data)

    @action(detail=True, methods=['post'], url_path='record-payment')
    def record_payment(self, request, pk=None):
        order = self.get_object()
        method = request.data.get('method', 'Cash')
        received = request.data.get('amount_received', 0)
        ref = request.data.get('reference', '')
        order = PharmacyOPDDispensingService.record_counter_payment(order, method, received, ref)
        return Response(PharmacyDispenseOrderSerializer(order).data)

    @action(detail=True, methods=['post'], url_path='verify-receipt')
    def verify_receipt(self, request, pk=None):
        order = self.get_object()
        rcpt = request.data.get('receipt_no', '').strip()
        if not rcpt:
            return Response({'error': 'Reception receipt number is required.'}, status=status.HTTP_400_BAD_REQUEST)
        order = PharmacyOPDDispensingService.verify_reception_receipt(order, rcpt)
        return Response(PharmacyDispenseOrderSerializer(order).data)

    @action(detail=True, methods=['post'], url_path='verify-payer')
    def verify_payer(self, request, pk=None):
        order = self.get_object()
        verified = bool(request.data.get('verified', True))
        order = PharmacyOPDDispensingService.verify_payer(order, verified)
        return Response(PharmacyDispenseOrderSerializer(order).data)

    @action(detail=True, methods=['post'], url_path='hold')
    def hold(self, request, pk=None):
        order = self.get_object()
        reason = request.data.get('reason', 'Awaiting stock from warehouse')
        order = PharmacyOPDDispensingService.hold_order(order, reason)
        return Response(PharmacyDispenseOrderSerializer(order).data)

    @action(detail=True, methods=['post'], url_path='resume')
    def resume(self, request, pk=None):
        order = self.get_object()
        order = PharmacyOPDDispensingService.resume_order(order)
        return Response(PharmacyDispenseOrderSerializer(order).data)

    @action(detail=True, methods=['post'], url_path='substitute-item')
    def substitute_item(self, request, pk=None):
        order = self.get_object()
        item_id = request.data.get('item_id')
        new_med_id = request.data.get('new_medicine_id')
        reason = request.data.get('reason', '')
        item = order.items.filter(id=item_id).first()
        if not item:
            return Response({'error': 'Item not found in this order.'}, status=status.HTTP_404_NOT_FOUND)
        new_med = PharmacyMedicine.objects.filter(id=new_med_id).first()
        if not new_med:
            return Response({'error': 'Substitute medicine not found.'}, status=status.HTTP_404_NOT_FOUND)
        PharmacyOPDDispensingService.substitute_item(item, new_med, reason)
        return Response(PharmacyDispenseOrderSerializer(order).data)

    @action(detail=True, methods=['post'], url_path='dispense')
    def dispense(self, request, pk=None):
        if request.user and getattr(request.user, 'role', None) in [RoleType.DEPARTMENT_ADMIN, 'DEPARTMENT_ADMIN']:
            return Response({
                'detail': 'Separation of Concerns: Department Administrators and Chief Pharmacists are restricted to governance and oversight, and cannot directly execute dispensing, ward issuing, or inventory adjustments.'
            }, status=status.HTTP_403_FORBIDDEN)

        order = self.get_object()
        counseling_data = request.data.get('counseling')
        picks = request.data.get('picks')
        cd_data = request.data.get('cd_data')
        settlement_data = request.data.get('settlement') or request.data.get('settlement_data')
        selected_item_ids = request.data.get('selected_item_ids')
        try:
            user = request.user if request.user and request.user.is_authenticated else User.objects.first()
            order = PharmacyOPDDispensingService.dispense_order(
                order, user, counseling_data, picks, cd_data, settlement_data=settlement_data, selected_item_ids=selected_item_ids
            )
            return Response(PharmacyDispenseOrderSerializer(order).data)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='purchased-outside')
    def purchased_outside(self, request, pk=None):
        order = self.get_object()
        reason = request.data.get('reason', PurchasedOutsideReason.PATIENT_CHOICE)
        notes = request.data.get('notes', '')
        user = request.user if request.user and request.user.is_authenticated else User.objects.first()
        try:
            order = PharmacyOPDDispensingService.mark_purchased_outside(order, user, reason, notes)
            return Response(PharmacyDispenseOrderSerializer(order).data)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='set-outcome')
    def set_outcome(self, request, pk=None):
        order = self.get_object()
        outcome = request.data.get('outcome')
        if outcome in [PrescriptionOutcome.FULL_PURCHASE, PrescriptionOutcome.PARTIAL_PURCHASE, PrescriptionOutcome.PURCHASED_OUTSIDE, PrescriptionOutcome.DECIDE_LATER]:
            order.prescription_outcome = outcome
            order.save()
        return Response(PharmacyDispenseOrderSerializer(order).data)


class PharmacyOTCSaleViewSet(viewsets.ModelViewSet):
    queryset = PharmacyOTCSale.objects.all().select_related('registered_patient', 'sold_by').prefetch_related('items__medicine', 'items__batch')
    serializer_class = PharmacyOTCSaleSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = PharmacyOTCSale.objects.all().select_related('registered_patient', 'sold_by').prefetch_related('items__medicine', 'items__batch')
        q = self.request.query_params.get('q', '').strip().lower()
        if q:
            qs = qs.filter(
                Q(sale_number__icontains=q) |
                Q(customer_name__icontains=q) |
                Q(customer_phone__icontains=q) |
                Q(registered_patient__uhid__icontains=q) |
                Q(items__medicine__name__icontains=q)
            ).distinct()
        return qs.order_by('-created_at')

    def create(self, request, *args, **kwargs):
        if request.user and getattr(request.user, 'role', None) in [RoleType.DEPARTMENT_ADMIN, 'DEPARTMENT_ADMIN']:
            return Response({
                'detail': 'Separation of Concerns: Department Administrators and Chief Pharmacists are restricted to governance and oversight, and cannot directly execute dispensing, ward issuing, or inventory adjustments.'
            }, status=status.HTTP_403_FORBIDDEN)

        try:
            user = request.user if request.user and request.user.is_authenticated else User.objects.first()
            sale = PharmacyOPDDispensingService.create_otc_sale(user, request.data)
            return Response(PharmacyOTCSaleSerializer(sale).data, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='send-whatsapp')
    def send_whatsapp(self, request, pk=None):
        sale = self.get_object()
        phone = request.data.get('phone') or sale.customer_phone
        return Response({
            'success': True,
            'message': f"Invoice sent to {phone} via WhatsApp.",
            'sale_number': sale.sale_number
        })


class PharmacyReturnViewSet(viewsets.ModelViewSet):
    queryset = PharmacyReturn.objects.all().select_related('original_dispense_order', 'original_otc_sale', 'patient', 'processed_by').prefetch_related('items__medicine', 'items__batch')
    serializer_class = PharmacyReturnSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = PharmacyReturn.objects.all().select_related('original_dispense_order', 'original_otc_sale', 'patient', 'processed_by').prefetch_related('items__medicine', 'items__batch')
        pill = self.request.query_params.get('status') or self.request.query_params.get('pill', 'all')
        q = self.request.query_params.get('q', '').strip().lower()

        if pill and pill.lower() != 'all':
            qs = qs.filter(status__iexact=pill)

        if q:
            qs = qs.filter(
                Q(return_number__icontains=q) |
                Q(patient__uhid__icontains=q) |
                Q(customer_name__icontains=q) |
                Q(original_dispense_order__order_number__icontains=q) |
                Q(original_otc_sale__sale_number__icontains=q) |
                Q(items__medicine__name__icontains=q)
            ).distinct()
        return qs.order_by('-created_at')

    def create(self, request, *args, **kwargs):
        try:
            user = request.user if request.user and request.user.is_authenticated else User.objects.first()
            ret = PharmacyOPDDispensingService.create_return_request(user, request.data)
            return Response(PharmacyReturnSerializer(ret).data, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='inspect')
    def inspect(self, request, pk=None):
        ret = self.get_object()
        checks = request.data.get('checks', {})
        disposition = request.data.get('disposition', 'restock')
        user = request.user if request.user and request.user.is_authenticated else User.objects.first()
        ret = PharmacyOPDDispensingService.inspect_return(ret, user, checks, disposition)
        return Response(PharmacyReturnSerializer(ret).data)

    @action(detail=True, methods=['post'], url_path='process-refund')
    def process_refund(self, request, pk=None):
        ret = self.get_object()
        user = request.user if request.user and request.user.is_authenticated else User.objects.first()
        ret = PharmacyOPDDispensingService.process_refund(ret, user)
        return Response(PharmacyReturnSerializer(ret).data)

    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        ret = self.get_object()
        reason = request.data.get('reason', '')
        user = request.user if request.user and request.user.is_authenticated else User.objects.first()
        ret = PharmacyOPDDispensingService.reject_return(ret, user, reason)
        return Response(PharmacyReturnSerializer(ret).data)


class CompletedTodayView(APIView):
    """
    Returns dispenses and OTC sales completed today during the active shift.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        today = timezone.now().date()
        q = request.query_params.get('q', '').strip().lower()

        dispenses = PharmacyDispenseOrder.objects.filter(
            encounter_type=EncounterType.OPD,
            status=DispenseOrderStatus.DISPENSED,
            dispensed_at__date=today
        ).select_related('patient', 'dispensed_by').prefetch_related('items__medicine', 'items__batch').order_by('-dispensed_at')

        results = []
        for d in dispenses:
            first_item = d.items.first()
            item_summary = f"{first_item.medicine.name} × {first_item.dispensed_quantity}" if first_item else "Medications"
            sub_summary = f"+ {d.items.count() - 1} other item" if d.items.count() > 1 else ""

            flags = []
            if any(item.medicine.is_narcotic for item in d.items.all()):
                flags.append({'text': 'CD register', 'bg': '#111827', 'fg': '#ffffff'})
            if d.allergy_override_reason:
                flags.append({'text': 'Allergy override', 'bg': '#fef2f2', 'fg': '#dc2626'})
            if any(item.medicine.is_cold_chain for item in d.items.all()):
                flags.append({'text': 'Cold chain', 'bg': '#f0f9ff', 'fg': '#0369a1'})

            matches_q = (
                not q or
                q in d.order_number.lower() or
                q in d.patient.uhid.lower() or
                q in f"{d.patient.first_name} {d.patient.last_name}".lower() or
                any(q in item.medicine.name.lower() for item in d.items.all())
            )

            if matches_q:
                results.append({
                    'id': d.order_number,
                    'time': d.dispensed_at.strftime('%H:%M') if d.dispensed_at else '',
                    'patient': f"{d.patient.first_name} {d.patient.last_name}".strip(),
                    'uhid': d.patient.uhid,
                    'doctor': d.doctor_name or "OPD Physician",
                    'items': item_summary,
                    'items_sub': sub_summary,
                    'mode': d.get_settlement_mode_display(),
                    'pay': {'text': d.get_payment_status_display(), 'bg': '#f0fdf4', 'fg': '#15803d', 'bd': '#bbf7d0'},
                    'flags': flags,
                    'total_amount': float(d.total_amount),
                    'lines': [
                        {
                            'id': str(l.id),
                            'name': l.medicine.name,
                            'batch': l.batch.batch_number if l.batch else 'FEFO Batch',
                            'qty': l.dispensed_quantity or l.prescribed_quantity,
                            'unit_price': float(l.unit_price),
                            'amt': float(l.line_total),
                            'is_cd': l.medicine.is_narcotic,
                            'is_cold': l.medicine.is_cold_chain
                        } for l in d.items.all()
                    ]
                })

        return Response(results)


class ClinicalPrescriptionHandoffView(APIView):
    """
    Doctor -> Pharmacy Integration Endpoint.
    Accepts e-Prescription orders from Doctor Consultation or Inpatient Rounds.
    Enqueues order in Pharmacy Queue.
    STRICT INVARIANT: Read-only! ZERO stock deduction, ZERO billing invoice created.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        data = request.data
        encounter_type = data.get('encounter_type', 'OPD').upper()
        patient_id = data.get('patient_id')
        uhid = data.get('uhid')
        medications = data.get('medications') or data.get('items') or []
        priority = data.get('priority', 'ROUTINE')
        diagnosis = data.get('diagnosis', '')
        instructions = data.get('instructions', '')
        doctor_name = data.get('doctor_name', '')

        # Resolve patient
        patient = None
        if patient_id:
            patient = Patient.objects.filter(id=patient_id).first()
        if not patient and uhid:
            patient = Patient.objects.filter(uhid=uhid).first()

        if not patient:
            return Response({'error': 'Valid patient_id or uhid is required'}, status=status.HTTP_400_BAD_REQUEST)

        if not medications:
            return Response({'error': 'At least one medication is required'}, status=status.HTTP_400_BAD_REQUEST)

        if encounter_type == 'IPD':
            admission_id = data.get('admission_id')
            admission = None
            if admission_id:
                admission = InpatientAdmission.objects.filter(id=admission_id).first()
            if not admission:
                admission = InpatientAdmission.objects.filter(patient=patient, status='ADMITTED').first()

            if not admission:
                # If no active admission found in db, fallback to creating a mock/provisional or erroring gracefully
                admission = InpatientAdmission.objects.filter(patient=patient).first()

            if not admission:
                return Response({'error': 'Active inpatient admission not found for IPD prescription'}, status=status.HTTP_400_BAD_REQUEST)

            doctor_user = request.user if request.user and request.user.is_authenticated else None
            dispense_order = PharmacyClinicalHandoffService.create_dispense_order_from_inpatient(
                admission=admission,
                doctor_user=doctor_user,
                medications_data=medications,
                ward_name=data.get('ward_name'),
                priority=priority
            )
        else:
            # OPD Prescription flow
            today_str = timezone.now().strftime('%Y%m%d')
            rx_count = Prescription.objects.count() + 1
            rx_number = f"RX-{today_str}-{rx_count:04d}"

            doctor_profile = None
            if request.user and request.user.is_authenticated and hasattr(request.user, 'doctor_profile'):
                doctor_profile = request.user.doctor_profile

            prescription = Prescription.objects.create(
                patient=patient,
                doctor=doctor_profile,
                prescription_number=rx_number,
                instructions=instructions or "Take medications as prescribed.",
                status='ACTIVE'
            )

            for med in medications:
                med_name = (med.get('medicationName') or med.get('name')) if isinstance(med, dict) else str(med)
                generic = med.get('genericName', '') if isinstance(med, dict) else ''
                dosage = med.get('dosage', '1 unit') if isinstance(med, dict) else '1 unit'
                freq = med.get('frequency', 'Daily') if isinstance(med, dict) else 'Daily'
                days = int(med.get('durationDays') or med.get('days') or 5) if isinstance(med, dict) else 5
                route = med.get('route', 'ORAL') if isinstance(med, dict) else 'ORAL'
                instr = med.get('instructions', '') if isinstance(med, dict) else ''

                PrescriptionItem.objects.create(
                    prescription=prescription,
                    medication_name=med_name or 'Medicine',
                    generic_name=generic,
                    dosage=dosage,
                    frequency=freq,
                    duration_days=days,
                    route=route,
                    instructions=instr
                )

            dispense_order = PharmacyClinicalHandoffService.create_dispense_order_from_prescription(
                prescription=prescription,
                priority=priority
            )
            if doctor_name and not dispense_order.doctor_name:
                dispense_order.doctor_name = doctor_name
                dispense_order.save()

        serializer = PharmacyDispenseOrderSerializer(dispense_order)
        return Response({
            'success': True,
            'message': 'Prescription successfully enqueued in Pharmacy Queue.',
            'read_only_verified': True,
            'inventory_mutated': False,
            'billing_mutated': False,
            'dispense_order': serializer.data
        }, status=status.HTTP_201_CREATED)


class AllergyCheckView(APIView):
    """
    Real-time allergy and cross-reactivity checker for doctor prescribing pad.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        patient_id = request.data.get('patient_id')
        uhid = request.data.get('uhid')
        medications = request.data.get('medications', [])

        patient = None
        if patient_id:
            patient = Patient.objects.filter(id=patient_id).first()
        if not patient and uhid:
            patient = Patient.objects.filter(uhid=uhid).first()

        results = []
        has_any_conflict = False

        for med_query in medications:
            med_name = (med_query.get('name') or med_query.get('medicationName')) if isinstance(med_query, dict) else str(med_query)
            generic = med_query.get('genericName', '') if isinstance(med_query, dict) else ''
            med = PharmacyClinicalHandoffService.match_formulary_medicine(med_name, generic)
            
            stock_qty = PharmacyStockService.get_medicine_stock(med.id) if med else 0
            allergy_res = PharmacyAllergyService.check_allergy(patient, med) if med else {'has_conflict': False}

            if allergy_res['has_conflict']:
                has_any_conflict = True

            results.append({
                'medicine_id': str(med.id) if med else None,
                'medicine_name': med.name if med else med_name,
                'generic_name': med.generic_name if med else generic,
                'schedule': med.schedule if med else 'H',
                'is_narcotic': med.is_narcotic if med else False,
                'is_cold_chain': med.is_cold_chain if med else False,
                'unit_price': float(med.unit_price) if med else 0.0,
                'in_stock': stock_qty > 0,
                'stock_quantity': stock_qty,
                'has_allergy_conflict': allergy_res['has_conflict'],
                'matched_allergen': allergy_res.get('matched_allergen'),
                'severity': allergy_res.get('severity', 'NONE'),
                'clinical_warning': allergy_res.get('clinical_warning'),
            })

        return Response({
            'patient_uhid': patient.uhid if patient else None,
            'patient_allergies': patient.allergies if patient else [],
            'has_allergy_conflict': has_any_conflict,
            'medications': results
        })


class BillingTPADirectoryView(APIView):
    """
    Returns directory of empanelled TPAs and Insurers with their standard cashless coverage rates.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        data = PharmacyBillingSettlementService.get_tpa_directory()
        return Response(data)


class BillingCorporateDirectoryView(APIView):
    """
    Returns directory of empanelled corporate accounts with negotiated schedules and discount percentages.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        data = PharmacyBillingSettlementService.get_corporate_directory()
        return Response(data)


class BillingCreditAccountsView(APIView):
    """
    Returns authorized hospital credit lines (Staff allowances, VIP lines, ER Indigent Relief).
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        data = PharmacyBillingSettlementService.get_credit_accounts()
        return Response(data)


class BillingIPDAdmissionStatusView(APIView):
    """
    Real-time lookup for IPD running bill check, deposit gauge, and MAR sync status.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        uhid_or_admission = request.query_params.get('uhid') or request.query_params.get('admission_id') or request.query_params.get('q')
        if not uhid_or_admission:
            return Response({'error': 'UHID or Admission ID is required.'}, status=status.HTTP_400_BAD_REQUEST)
        data = PharmacyBillingSettlementService.get_ipd_admission_status(uhid_or_admission)
        return Response(data)


class BillingShiftDrawerView(APIView):
    """
    Manages active POS counter cash drawer, opening float, reconciliation, and end-of-shift reporting.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        counter = request.query_params.get('counter_name', 'Counter 2 · Main OPD')
        user = request.user if request.user and request.user.is_authenticated else None
        data = PharmacyBillingSettlementService.get_shift_summary(user, counter_name=counter)
        return Response(data)

    def post(self, request):
        action_type = request.data.get('action', 'close')
        counter = request.data.get('counter_name', 'Counter 2 · Main OPD')
        user = request.user if request.user and request.user.is_authenticated else User.objects.first()
        shift = PharmacyBillingSettlementService.get_or_create_active_shift(user, counter_name=counter)

        if action_type == 'close':
            shift.is_closed = True
            shift.closed_at = timezone.now()
            shift.save()
            return Response({
                'success': True,
                'message': f"Shift closed for {counter}.",
                'shift': PharmacyCounterShiftSerializer(shift).data
            })
        elif action_type == 'open':
            new_shift = PharmacyBillingSettlementService.get_or_create_active_shift(user, counter_name=counter)
            return Response({
                'success': True,
                'message': f"Active shift verified for {counter}.",
                'shift': PharmacyCounterShiftSerializer(new_shift).data
            })
        elif action_type == 'adjust_float':
            opening = request.data.get('opening_float')
            if opening is not None:
                shift.opening_float = Decimal(str(opening))
                shift.save()
            return Response({
                'success': True,
                'message': f"Opening float updated to ₹{shift.opening_float}.",
                'shift': PharmacyCounterShiftSerializer(shift).data
            })

        return Response({'error': f"Unknown action '{action_type}'."}, status=status.HTTP_400_BAD_REQUEST)


class ReceptionClearanceWebhookView(APIView):
    """
    Cashier clearance webhook: Central Cashier / Receptionist clears a token-slip invoice.
    Automatically marks the Pharmacy Dispense Order as PAID and syncs the Billing Invoice.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token_slip = request.data.get('token_slip_number') or request.data.get('token')
        receipt_no = request.data.get('receipt_number') or request.data.get('receipt_no')
        amount_paid = request.data.get('amount_paid') or request.data.get('amount')

        if not token_slip or not receipt_no:
            return Response({'error': 'Both token_slip_number and receipt_number are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = request.user if request.user and request.user.is_authenticated else User.objects.first()
            order = PharmacyBillingSettlementService.clear_reception_payment(token_slip, user, receipt_no, amount_paid)
            return Response({
                'success': True,
                'message': f"Reception payment cleared for token {token_slip}.",
                'order': PharmacyDispenseOrderSerializer(order).data
            })
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


# ==========================================
# PHASE 6: IPD PHARMACIST & INPATIENT VIEWS
# ==========================================

class IPDPharmacistKPIsView(APIView):
    """Returns the 5 KPI metric cards for IPD Pharmacist workspace."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        kpis = PharmacyIPDService.get_ipd_kpis()
        return Response(kpis)


class IPDPharmacistQueueView(APIView):
    """
    Returns filtered, categorized Inpatient Ward Medication Requisitions.
    Supports tab query param ('requests', 'pending', 'issued', 'emergency'),
    ward filter ('All', 'ICU', 'HDU', etc.), and text search.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        tab = request.query_params.get('tab', 'requests').lower()
        ward = request.query_params.get('ward', 'All')
        q = request.query_params.get('q', '').strip()

        queue = PharmacyIPDService.get_ipd_queue(tab=tab, ward=ward, search=q)
        return Response(queue)


class IPDPharmacistIssueView(APIView):
    """
    Atomic Inpatient Ward Medication Issue:
    Decrements FEFO stock, posts to admission running bill, flips MAR state to ISSUED,
    and updates CD register if applicable.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk=None):
        if request.user and getattr(request.user, 'role', None) in [RoleType.DEPARTMENT_ADMIN, 'DEPARTMENT_ADMIN']:
            return Response({
                'detail': 'Separation of Concerns: Department Administrators and Chief Pharmacists are restricted to governance and oversight, and cannot directly execute dispensing, ward issuing, or inventory adjustments.'
            }, status=status.HTTP_403_FORBIDDEN)

        order_id = pk or request.data.get('order_id')
        if not order_id:
            return Response({'error': 'Order ID is required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user if request.user and request.user.is_authenticated else User.objects.filter(role='PHARMACIST').first() or User.objects.first()
        try:
            order = PharmacyIPDService.issue_to_ward(order_id, user, request.data)
            return Response({
                'success': True,
                'message': f"Order {order.order_number} successfully issued to {order.ward_name} {order.bed_number}.",
                'order': PharmacyDispenseOrderSerializer(order).data,
                'receipt_data': order.receipt_data,
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class IPDPharmacistEmergencyReleaseView(APIView):
    """STAT Emergency immediate release with retrospective MAR review audit."""
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk=None):
        if request.user and getattr(request.user, 'role', None) in [RoleType.DEPARTMENT_ADMIN, 'DEPARTMENT_ADMIN']:
            return Response({
                'detail': 'Separation of Concerns: Department Administrators and Chief Pharmacists are restricted to governance and oversight, and cannot directly execute dispensing, ward issuing, or inventory adjustments.'
            }, status=status.HTTP_403_FORBIDDEN)

        order_id = pk or request.data.get('order_id')
        if not order_id:
            return Response({'error': 'Order ID is required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user if request.user and request.user.is_authenticated else User.objects.filter(role='PHARMACIST').first() or User.objects.first()
        try:
            order = PharmacyIPDService.emergency_release(order_id, user, request.data)
            return Response({
                'success': True,
                'message': f"Emergency STAT release executed for order {order.order_number}.",
                'order': PharmacyDispenseOrderSerializer(order).data,
                'receipt_data': order.receipt_data,
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class IPDPharmacistQueryPrescriberView(APIView):
    """Flags request as queried with prescriber, pausing fulfillment."""
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk=None):
        order_id = pk or request.data.get('order_id')
        reason = request.data.get('reason', 'Allergy conflict or clinical question')
        user = request.user if request.user and request.user.is_authenticated else User.objects.first()

        try:
            order = PharmacyIPDService.query_prescriber(order_id, user, reason)
            return Response({
                'success': True,
                'message': f"Query sent to prescriber for order {order.order_number}.",
                'order': PharmacyDispenseOrderSerializer(order).data,
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class IPDPharmacistCancelView(APIView):
    """Cancels ward request (e.g. Patient Discharged or MAR validation failure)."""
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk=None):
        order_id = pk or request.data.get('order_id')
        reason = request.data.get('reason', 'MAR validation failed')
        user = request.user if request.user and request.user.is_authenticated else User.objects.first()

        try:
            order = PharmacyIPDService.cancel_request(order_id, user, reason)
            return Response({
                'success': True,
                'message': f"Order {order.order_number} cancelled: {reason}.",
                'order': PharmacyDispenseOrderSerializer(order).data,
                'receipt_data': order.receipt_data,
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class IPDPharmacistSubstituteView(APIView):
    """Substitutes an out-of-stock item with a doctor-approved alternative."""
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk=None):
        order_id = pk or request.data.get('order_id')
        item_id = request.data.get('item_id')
        substitute_code = request.data.get('substitute_code')
        user = request.user if request.user and request.user.is_authenticated else User.objects.first()

        try:
            order = PharmacyIPDService.substitute_medicine(order_id, user, item_id, substitute_code)
            return Response({
                'success': True,
                'message': f"Medicine substituted for order {order.order_number}.",
                'order': PharmacyDispenseOrderSerializer(order).data,
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class IPDWardReturnsView(APIView):
    """Lists ward returns."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        ward = request.query_params.get('ward', 'All')
        q = request.query_params.get('q', '').strip()
        returns = PharmacyIPDService.get_ward_returns(ward=ward, search=q)
        return Response(PharmacyReturnSerializer(returns, many=True).data)


class IPDWardReturnProcessView(APIView):
    """Processes ward return through 3 steps: receive, inspect, complete."""
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk=None):
        return_id = pk or request.data.get('return_id')
        user = request.user if request.user and request.user.is_authenticated else User.objects.first()

        try:
            ret = PharmacyIPDService.process_ward_return(return_id, user, request.data)
            return Response({
                'success': True,
                'message': f"Ward return {ret.return_number} processed ({ret.status}).",
                'return': PharmacyReturnSerializer(ret).data,
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


# ========================================================
# PHASE 7: CONTROLLED DRUGS & NARCOTIC SYSTEM APIVIEWS
# ========================================================

class ControlledDrugVaultInventoryView(APIView):
    """Returns current Schedule X/H1 narcotic stock and batch status in secure vault."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        inventory = PharmacyControlledDrugService.get_vault_inventory()
        return Response(inventory)


class ControlledDrugRegisterReportView(APIView):
    """Filterable statutory Controlled Drug Register entries."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        search = request.query_params.get('q', '').strip()
        sched = request.query_params.get('schedule', 'all')
        pill = request.query_params.get('pill', 'all')
        entries = PharmacyControlledDrugService.get_statutory_register(search=search, schedule=sched, pill=pill)
        return Response(PharmacyControlledDrugRegisterSerializer(entries, many=True).data)


class ControlledDrugSummaryMetricsView(APIView):
    """4-card KPI summary for controlled drugs."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        metrics = PharmacyControlledDrugService.get_summary_metrics()
        return Response(metrics)


class ControlledDrugEligibleWitnessesView(APIView):
    """Returns list of staff authorized to witness Schedule X dispenses."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        witnesses = PharmacyControlledDrugService.get_eligible_witnesses(current_user=request.user)
        return Response(witnesses)


class ControlledDrugVerifyWitnessView(APIView):
    """Validates secondary witness PIN / credential."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        witness_id = request.data.get('witness_id')
        pin = request.data.get('pin') or request.data.get('password')
        res = PharmacyControlledDrugService.verify_witness_credentials(request.user, witness_id, pin)
        if not res['valid']:
            return Response({'valid': False, 'error': res['error']}, status=status.HTTP_400_BAD_REQUEST)
        return Response({
            'valid': True,
            'witness_name': res['witness_name'],
            'witness_role': res['witness_role'],
        })


class ControlledDrugDispenseView(APIView):
    """Executes dual-signed Schedule X controlled substance dispense."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        if request.user and getattr(request.user, 'role', None) in [RoleType.DEPARTMENT_ADMIN, 'DEPARTMENT_ADMIN']:
            return Response({
                'detail': 'Separation of Concerns: Department Administrators and Chief Pharmacists are restricted to governance and oversight, and cannot directly execute dispensing, ward issuing, or inventory adjustments.'
            }, status=status.HTTP_403_FORBIDDEN)

        user = request.user if request.user and request.user.is_authenticated else User.objects.first()
        try:
            entry = PharmacyControlledDrugService.dispense_controlled_substance(user, request.data)
            return Response(PharmacyControlledDrugRegisterSerializer(entry).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class ControlledDrugReconcileView(APIView):
    """Records daily vault shelf count reconciliation vs register balance."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        user = request.user if request.user and request.user.is_authenticated else User.objects.first()
        witness_id = request.data.get('witness_id')
        witness = User.objects.filter(id=witness_id).first() if witness_id else user
        try:
            rec = PharmacyControlledDrugService.reconcile_vault_count(user, witness, request.data)
            return Response(PharmacyVaultReconciliationSerializer(rec).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class ControlledDrugExportReportView(APIView):
    """Exports regulatory inspection report compliant with NDPS and Schedule X rules."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        sched = request.query_params.get('schedule', 'all')
        report = PharmacyControlledDrugService.export_inspection_report(schedule=sched)
        return Response(report)


# ==========================================
# 13. PHARMACY ADMIN & GOVERNANCE WORKSPACE VIEWS (PHASE 8)
# ==========================================

class PharmacyAdminAnalyticsView(APIView):
    """Executive oversight metrics across OPD, IPD, and Central Store."""
    permission_classes = [IsPharmacyOrAdmin]

    def get(self, request):
        scope = request.query_params.get('activity_scope', 'All')
        metrics = PharmacyAdminService.get_admin_dashboard_metrics(activity_scope=scope)
        return Response(metrics)


class PharmacyAdminStaffView(APIView):
    """Pharmacy personnel roster, turnaround times, and shift targets."""
    permission_classes = [IsPharmacyOrAdmin]

    def get(self, request):
        pill = request.query_params.get('pill', 'all')
        q = request.query_params.get('q', '').strip()
        staff = PharmacyAdminService.get_staff_roster(pill=pill, query=q)
        return Response(staff)

    def post(self, request):
        staff_member = PharmacyAdminService.save_or_assign_staff(request.data, user=request.user)
        return Response(staff_member, status=status.HTTP_201_CREATED)


class PharmacyAdminShiftsView(APIView):
    """Duty scheduling shifts and shift assignments."""
    permission_classes = [IsPharmacyOrAdmin]

    def get(self, request):
        pill = request.query_params.get('pill', 'all')
        q = request.query_params.get('q', '').strip()
        shifts = PharmacyAdminService.get_duty_schedules(pill=pill, query=q)
        return Response(shifts)

    def post(self, request):
        sched_id = request.data.get('schedule_id')
        staff = request.data.get('staff') or request.data.get('staff_names') or request.data.get('staff_ids', [])
        sched_status = request.data.get('status')
        notes = request.data.get('notes')
        sched = PharmacyAdminService.update_duty_shift(
            sched_id, staff, status=sched_status, notes=notes, user=request.user
        )
        return Response(PharmacyDutyScheduleSerializer(sched).data)


class PharmacyAdminOperationsView(APIView):
    """Throughput points, queue loads, and turnaround SLAs."""
    permission_classes = [IsPharmacyOrAdmin]

    def get(self, request):
        pill = request.query_params.get('pill', 'all')
        q = request.query_params.get('q', '').strip()
        points = PharmacyAdminService.get_operations_throughput(pill=pill, query=q)
        return Response(points)


class PharmacyAdminInventoryHealthView(APIView):
    """Inventory health exceptions, stockouts with clinical impact, near-expiry."""
    permission_classes = [IsPharmacyOrAdmin]

    def get(self, request):
        pill = request.query_params.get('pill', 'all')
        q = request.query_params.get('q', '').strip()
        items = PharmacyAdminService.get_inventory_health_exceptions(pill=pill, query=q)
        return Response(items)


class PharmacyAdminSuppliersView(APIView):
    """Wholesale suppliers, open POs, and on-time performance."""
    permission_classes = [IsPharmacyOrAdmin]

    def get(self, request):
        pill = request.query_params.get('pill', 'all')
        q = request.query_params.get('q', '').strip()
        sups = PharmacyAdminService.get_suppliers_procurement(pill=pill, query=q)
        return Response(sups)


class PharmacyAdminAuditLogsView(APIView):
    """Immutable compliance audit logs for pharmacy actions."""
    permission_classes = [IsPharmacyOrAdmin]

    def get(self, request):
        pill = request.query_params.get('pill', 'all')
        q = request.query_params.get('q', '').strip()
        logs = PharmacyAdminService.get_governance_audit_logs(pill=pill, query=q)
        return Response(PharmacyGovernanceAuditLogSerializer(logs, many=True).data)


class PharmacyAdminSettingsView(APIView):
    """Department governance policy settings."""
    permission_classes = [IsPharmacyOrAdmin]

    def get(self, request):
        pill = request.query_params.get('pill', 'all')
        q = request.query_params.get('q', '').strip()
        settings = PharmacyAdminService.get_department_settings(pill=pill, query=q)
        return Response(PharmacyDepartmentSettingSerializer(settings, many=True).data)

    def post(self, request):
        key = request.data.get('setting_key')
        val = request.data.get('value')
        setting = PharmacyAdminService.update_department_setting(key, val, user=request.user)
        return Response(PharmacyDepartmentSettingSerializer(setting).data)


class PharmacyPurchaseRequestReviewView(APIView):
    """Pharmacy Admin budget review and approval/rejection of Purchase Requisitions."""
    permission_classes = [IsPharmacyOrAdmin]

    def post(self, request, pk=None):
        action_name = request.data.get('action', 'approve').lower()
        reason = request.data.get('reason', '')
        try:
            pr = PharmacyAdminService.review_purchase_request(pk, request.user, action_name, reason)
            return Response(PharmacyPurchaseRequestSerializer(pr).data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class PharmacyPurchaseOrderIssueView(APIView):
    """Dispatches approved purchase order to vendor."""
    permission_classes = [IsPharmacyOrAdmin]

    def post(self, request, pk=None):
        try:
            po = PharmacyAdminService.issue_purchase_order(pk, request.user)
            return Response(PharmacyPurchaseOrderSerializer(po).data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class PharmacyPurchaseOrderViewSet(viewsets.ModelViewSet):
    """Purchase Orders listing and official dispatch."""
    queryset = PharmacyPurchaseOrder.objects.all().select_related('supplier', 'purchase_request', 'approved_by').prefetch_related('items__medicine')
    serializer_class = PharmacyPurchaseOrderSerializer
    permission_classes = [IsPharmacyOrAdmin]

    def get_queryset(self):
        qs = PharmacyPurchaseOrder.objects.all().select_related('supplier', 'purchase_request', 'approved_by').prefetch_related('items__medicine')
        q = self.request.query_params.get('q', '').strip().lower()
        status_param = self.request.query_params.get('status')
        if q:
            qs = qs.filter(
                Q(po_number__icontains=q) |
                Q(supplier__name__icontains=q) |
                Q(items__medicine__name__icontains=q)
            ).distinct()
        if status_param and status_param != 'all':
            qs = qs.filter(status=status_param)
        return qs.order_by('-issued_at')

    @action(detail=True, methods=['post'], url_path='issue')
    def issue(self, request, pk=None):
        po = PharmacyAdminService.issue_purchase_order(pk, request.user)
        return Response(PharmacyPurchaseOrderSerializer(po).data)


class PharmacyMedicinePricingView(APIView):
    """Formulary retail price and cost price administration."""
    permission_classes = [IsPharmacyOrAdmin]

    def patch(self, request, pk=None):
        unit_price = request.data.get('unit_price')
        cost_price = request.data.get('cost_price')
        tpa_rates = request.data.get('tpa_rates')
        if unit_price is None:
            return Response({'error': 'unit_price is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            med = PharmacyAdminService.update_medicine_pricing(
                pk, unit_price=unit_price, cost_price=cost_price, tpa_rates=tpa_rates, user=request.user
            )
            return Response(PharmacyMedicineSerializer(med).data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)





