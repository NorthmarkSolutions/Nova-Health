import re
import uuid
from decimal import Decimal
from datetime import datetime, date, timedelta
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import action

from apps.accounts.models import RoleType
from .models import (
    ChartOfAccount, CostCenter, BankAccount, DelegationLimit,
    FinancialEvent, Journal, JournalLine, GLEntry, GLBalance,
    ApprovalRequest, ApprovalStep, Escalation, AccountTask,
    PeriodLock, AccountAuditLog, AccountDocument, EventStatus,
    ApprovalStatus, EventValidation, DailyCloseRun, CloseChecklistItem,
    Receivable, Receipt, CollectionCase, CollectionFollowup,
    WriteOffRequest, VendorBill, BankTransaction, ReconciliationMatch,
    ExpenseRequest, GSTBatch, FinancialException, WeeklyFinancialReview, Budget
)
from .serializers import (
    ChartOfAccountSerializer, CostCenterSerializer, BankAccountSerializer,
    DelegationLimitSerializer, PeriodLockSerializer, JournalSerializer,
    ApprovalRequestSerializer, EscalationSerializer, AccountTaskSerializer,
    AccountAuditLogSerializer, AccountDocumentSerializer, FinancialEventSerializer,
    ReceivableSerializer, ReceiptSerializer, CollectionFollowupSerializer,
    CollectionCaseSerializer, VendorBillSerializer, BankTransactionSerializer,
    ReconciliationMatchSerializer, ExpenseRequestSerializer, GSTBatchSerializer,
    WriteOffRequestSerializer, DailyCloseRunSerializer, CloseChecklistItemSerializer,
    BudgetSerializer, FinancialExceptionSerializer, WeeklyFinancialReviewSerializer
)
from .services import (
    NumberSequenceService, AuditService, PeriodService,
    ApprovalEngineService, JournalService, EventInboxService,
    VendorBillService, BankReconciliationService, ReceivablesService,
    GSTService, DailyCloseService, SupervisorService,
    TeamPerformanceService, EscalationService,
    ReceivablesControlService, PayablesControlService,
    CashflowProjectionService, HighValueTransactionService,
    BudgetControlService, FinancialExceptionService,
    WeeklyFinancialReviewService, MonthEndReadinessService,
    CostCenterAnalyticsService, ManagerDashboardService,
    FinanceControllerService, BillingIntegrationService,
    PharmacyIntegrationService, ClinicalIntegrationService, LabIntegrationService,
    AuditComplianceService, EndToEndSimulationService
)
from .models import (
    IPDUnbilledTracker, ConsultantShareBatch, ConsultantShareItem,
    OTImplantUsageRegister, OTImplantConsignmentMatch
)
from .serializers import (
    IPDUnbilledTrackerSerializer, ConsultantShareBatchSerializer,
    ConsultantShareItemSerializer, OTImplantUsageRegisterSerializer,
    OTImplantConsignmentMatchSerializer
)
from .exceptions import AccountingDomainError, CommentRequiredError


def error_response(exc: AccountingDomainError):
    return Response(
        {
            'error': {
                'code': exc.code,
                'message': exc.message,
                'details': exc.details
            }
        },
        status=exc.status_code
    )


# =============================================================================
# 1. Workload & Dashboard Views
# =============================================================================

class WorkloadView(APIView):
    """Sidebar badge counts for caller's role"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        role = getattr(user, 'role', RoleType.ACCOUNTS_EXECUTIVE)

        pending_approvals = ApprovalRequest.objects.filter(status=ApprovalStatus.PENDING)
        role_pending = pending_approvals.filter(current_approver_role=role).count()
        my_requests = ApprovalRequest.objects.filter(maker=user, status=ApprovalStatus.PENDING).count()
        pending_events = FinancialEvent.objects.filter(status=EventStatus.PENDING_VALIDATION).count()
        draft_journals = Journal.objects.filter(maker=user, status='draft').count()
        open_escalations = Escalation.objects.filter(status='open').count()
        open_tasks = AccountTask.objects.filter(assignee=user, status='open').count()

        queues = {
            'journals_pending': draft_journals,
            'approvals_pending': role_pending,
            'my_requests_pending': my_requests,
            'events_pending_validation': pending_events,
            'escalations_open': open_escalations,
            'tasks_open': open_tasks,
            'total_actionable': role_pending + draft_journals + pending_events + open_tasks
        }
        return Response({'queues': queues})


class ExecutiveDashboardView(APIView):
    """KPI summary and task queues for Accounts Executive"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        drafts_count = Journal.objects.filter(maker=user, status='draft').count()
        submitted_today = Journal.objects.filter(
            maker=user,
            created_at__date=timezone.now().date(),
            status__in=['in_approval', 'posted']
        ).count()
        pending_validation = FinancialEvent.objects.filter(status=EventStatus.PENDING_VALIDATION).count()
        my_requests_pending = ApprovalRequest.objects.filter(maker=user, status=ApprovalStatus.PENDING).count()

        kpis = [
            {
                'code': 'DRAFT_JOURNALS',
                'label': 'Draft Journals',
                'value': str(drafts_count),
                'display': f"{drafts_count} In Preparation",
                'trend_text': 'Awaiting submit',
                'tone': 'blue',
                'icon': 'BookOpen',
                'link_screen': 'journals'
            },
            {
                'code': 'SUBMITTED_TODAY',
                'label': 'Submitted Today',
                'value': str(submitted_today),
                'display': f"{submitted_today} Vouchers",
                'trend_text': 'Active in approval',
                'tone': 'green',
                'icon': 'CheckCircle2',
                'link_screen': 'my_requests'
            },
            {
                'code': 'EVENTS_PENDING',
                'label': 'Incoming Events',
                'value': str(pending_validation),
                'display': f"{pending_validation} Bills/Receipts",
                'trend_text': 'Source departments',
                'tone': 'amber',
                'icon': 'Inbox',
                'link_screen': 'events'
            },
            {
                'code': 'MY_REQUESTS',
                'label': 'My Requests Pending',
                'value': str(my_requests_pending),
                'display': f"{my_requests_pending} In Review",
                'trend_text': 'With supervisor/manager',
                'tone': 'violet',
                'icon': 'Clock',
                'link_screen': 'my_requests'
            }
        ]

        recent_activity = AccountAuditLog.objects.filter(actor_user=user).order_by('-occurred_at')[:8]
        act_data = AccountAuditLogSerializer(recent_activity, many=True).data

        tasks = AccountTask.objects.filter(assignee=user, status='open').order_by('due_at')[:5]
        task_data = AccountTaskSerializer(tasks, many=True).data

        return Response({
            'kpis': kpis,
            'tasks': task_data,
            'activity': act_data,
            'alerts': []
        })


# =============================================================================
# 2. Master Data Views
# =============================================================================

class COAListView(APIView):
    """Chart of Accounts query endpoint"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        postable_only = request.query_params.get('postable', '').lower() == 'true'
        q = request.query_params.get('q', '').strip()

        qs = ChartOfAccount.objects.filter(active=True)
        if postable_only:
            qs = qs.filter(is_postable=True)
        if q:
            qs = qs.filter(name__icontains=q) | qs.filter(code__icontains=q)

        serializer = ChartOfAccountSerializer(qs.order_by('code'), many=True)
        return Response(serializer.data)


class CostCenterListView(APIView):
    """Cost Centers query endpoint"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = CostCenter.objects.filter(active=True).order_by('code')
        serializer = CostCenterSerializer(qs, many=True)
        return Response(serializer.data)


class DelegationLimitsView(APIView):
    """Current Delegation of Financial Authority (DoFA) rules"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = DelegationLimit.objects.all().order_by('document_type', 'role')
        serializer = DelegationLimitSerializer(qs, many=True)
        return Response(serializer.data)


class PeriodListView(APIView):
    """Fiscal and monthly period status query"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = PeriodLock.objects.all().order_by('period_key')
        serializer = PeriodLockSerializer(qs, many=True)
        return Response(serializer.data)


# =============================================================================
# 3. Journal ViewSet
# =============================================================================

class JournalViewSet(viewsets.ModelViewSet):
    """Full lifecycle management for journal vouchers"""
    permission_classes = [IsAuthenticated]
    serializer_class = JournalSerializer
    queryset = Journal.objects.all().order_by('-created_at')

    def retrieve(self, request, *args, **kwargs):
        journal = self.get_object()
        # Payroll journals are restricted reports: every read is recorded
        if journal.entry_type == 'payroll' or 'salar' in (journal.description or '').lower():
            AuditService.log_read(request.user, 'payroll_journal', reference_no=journal.reference_no, entity_id=str(journal.id))
        return Response(self.get_serializer(journal).data)

    def get_queryset(self):
        qs = super().get_queryset()
        status_param = self.request.query_params.get('status')
        maker_param = self.request.query_params.get('maker')
        period_param = self.request.query_params.get('period')
        q = self.request.query_params.get('q', '').strip()

        if status_param:
            qs = qs.filter(status=status_param)
        if maker_param == 'me':
            qs = qs.filter(maker=self.request.user)
        if period_param:
            qs = qs.filter(posting_period=period_param)
        if q:
            qs = qs.filter(reference_no__icontains=q) | qs.filter(description__icontains=q)
        return qs

    def create(self, request, *args, **kwargs):
        try:
            data = request.data
            journal_date_str = data.get('journal_date')
            j_date = datetime.strptime(journal_date_str, '%Y-%m-%d').date() if journal_date_str else timezone.now().date()
            description = data.get('description', '')
            lines = data.get('lines', [])
            entry_type = data.get('entry_type', 'revenue_adjustment')
            external_reference = data.get('external_reference', '')

            journal = JournalService.create_draft_journal(
                maker=request.user,
                journal_date=j_date,
                description=description,
                lines=lines,
                entry_type=entry_type,
                external_reference=external_reference
            )
            return Response(JournalSerializer(journal).data, status=status.HTTP_201_CREATED)
        except AccountingDomainError as exc:
            return error_response(exc)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        try:
            version = int(request.data.get('version', 1))
            app_req = JournalService.submit_journal(journal_id=pk, user=request.user, version=version)
            journal = Journal.objects.get(id=pk)
            return Response({
                'message': 'Journal submitted successfully for approval',
                'journal': JournalSerializer(journal).data,
                'approval_request_id': str(app_req.id),
                'assigned_role': app_req.current_approver_role
            })
        except AccountingDomainError as exc:
            return error_response(exc)

    @action(detail=True, methods=['post'])
    def reverse(self, request, pk=None):
        try:
            rev_date_str = request.data.get('reversal_date')
            rev_date = datetime.strptime(rev_date_str, '%Y-%m-%d').date() if rev_date_str else timezone.now().date()
            reason = request.data.get('reason', 'Correction/Reversal')
            rev_j = JournalService.reverse_journal(
                journal_id=pk,
                user=request.user,
                reversal_date=rev_date,
                reason=reason
            )
            return Response(JournalSerializer(rev_j).data, status=status.HTTP_201_CREATED)
        except AccountingDomainError as exc:
            return error_response(exc)


# =============================================================================
# 4. Approval Request ViewSet
# =============================================================================

class ApprovalRequestViewSet(viewsets.ReadOnlyModelViewSet):
    """Maker-Checker queue and multi-tier approval decision processing"""
    permission_classes = [IsAuthenticated]
    serializer_class = ApprovalRequestSerializer
    queryset = ApprovalRequest.objects.all().order_by('-submitted_at')

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        maker_param = self.request.query_params.get('maker')
        role_param = self.request.query_params.get('approver_role')
        status_param = self.request.query_params.get('status', 'pending')
        doc_type = self.request.query_params.get('type')

        if maker_param == 'me':
            return qs.filter(maker=user)
        if role_param:
            qs = qs.filter(current_approver_role=role_param)
        if status_param and status_param != 'all':
            qs = qs.filter(status__in=[s.strip() for s in status_param.split(',') if s.strip()])
        if doc_type:
            qs = qs.filter(document_type=doc_type)
        return qs

    @action(detail=True, methods=['post'])
    def decision(self, request, pk=None):
        try:
            data = request.data
            decision_type = data.get('decision')
            comment = data.get('comment', '')
            reason_code = data.get('reason_code', '')
            acknowledgements = data.get('acknowledgements', [])
            version = int(data.get('version', 1))

            result = ApprovalEngineService.process_decision(
                approval_request_id=pk,
                user=request.user,
                decision=decision_type,
                comment=comment,
                reason_code=reason_code,
                acknowledgements=acknowledgements,
                version=version
            )
            return Response(result, status=status.HTTP_200_OK)
        except AccountingDomainError as exc:
            return error_response(exc)


# =============================================================================
# 5. Audit & Integrity Views
# =============================================================================

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Audit trail query and hash-chain integrity verification"""
    permission_classes = [IsAuthenticated]
    serializer_class = AccountAuditLogSerializer
    queryset = AccountAuditLog.objects.all().order_by('-occurred_at')

    @action(detail=False, methods=['get'])
    def activity(self, request):
        user = request.user
        logs = AccountAuditLog.objects.filter(actor_user=user).order_by('-occurred_at')[:50]
        return Response(AccountAuditLogSerializer(logs, many=True).data)

    @action(detail=False, methods=['get'])
    def recent(self, request):
        """Department-wide trail for the last N days (Manager Audit Trail, Screen 3.16)"""
        try:
            days = max(1, min(92, int(request.query_params.get('days', 31))))
        except ValueError:
            days = 31
        since = timezone.now() - timedelta(days=days)
        logs = AccountAuditLog.objects.filter(occurred_at__gte=since).order_by('-occurred_at')[:500]
        return Response(AccountAuditLogSerializer(logs, many=True).data)

    @action(detail=False, methods=['get'])
    def integrity(self, request):
        result = AuditService.verify_integrity()
        return Response(result)


# =============================================================================
# 6. Supporting Documents ViewSet
# =============================================================================

class AccountDocumentViewSet(viewsets.ModelViewSet):
    """Document attachments with validation workflow"""
    permission_classes = [IsAuthenticated]
    serializer_class = AccountDocumentSerializer
    queryset = AccountDocument.objects.all().order_by('-created_at')

    def create(self, request, *args, **kwargs):
        doc = AccountDocument.objects.create(
            entity_type=request.data.get('entity_type', 'journal'),
            entity_id=request.data.get('entity_id', ''),
            doc_type=request.data.get('doc_type', 'invoice'),
            file_name=request.data.get('file_name', 'attachment.pdf'),
            file_url=request.data.get('file_url', ''),
            uploaded_by=request.user
        )
        return Response(AccountDocumentSerializer(doc).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def validate(self, request, pk=None):
        doc = self.get_object()
        valid = bool(request.data.get('valid', True))
        doc.validated = valid
        doc.validated_by = request.user
        doc.rejection_reason = request.data.get('reason', '') if not valid else ''
        doc.save()
        return Response(AccountDocumentSerializer(doc).data)


# =============================================================================
# 7. Inbound Financial Event Integration Endpoint
# =============================================================================

class InboundFinancialEventView(APIView):
    """Consumes departmental financial events into accounts inbox with idempotency"""
    permission_classes = [AllowAny]  # Or internal service-account token

    def post(self, request):
        res = EventInboxService.process_incoming_event(request.data)
        if res.get('status') == 'duplicate_ignored':
            return Response(res, status=status.HTTP_200_OK)
        if res.get('status') in [EventStatus.REJECTED_BUSINESS, 'rejected_business']:
            return Response(res, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
        return Response(res, status=status.HTTP_201_CREATED)


# =============================================================================
# Phase 2 ViewSets (Events, Vendor Bills, Bank, Receivables, Expenses, GST)
# =============================================================================

from .models import (
    Receivable, Receipt, CollectionCase, CollectionFollowup, PromiseToPay, WriteOffRequest,
    VendorBill, BankTransaction, ReconciliationMatch, ExpenseRequest, GSTBatch, GSTBatchLine
)
from .serializers import (
    ReceivableSerializer, ReceiptSerializer, CollectionCaseSerializer, CollectionFollowupSerializer,
    VendorBillSerializer, BankTransactionSerializer, ReconciliationMatchSerializer,
    ExpenseRequestSerializer, GSTBatchSerializer
)
from .services import (
    VendorBillService, BankReconciliationService, ReceivablesService, GSTService
)

class FinancialEventViewSet(viewsets.ModelViewSet):
    """Event inbox management for Accounts Executive (Screen 1.2)"""
    permission_classes = [IsAuthenticated]
    serializer_class = FinancialEventSerializer
    queryset = FinancialEvent.objects.all().order_by('-created_at')

    def get_queryset(self):
        qs = super().get_queryset()
        st = self.request.query_params.get('status')
        source = self.request.query_params.get('source')
        if st:
            qs = qs.filter(status=st)
        if source:
            qs = qs.filter(source_department=source)
        return qs

    @action(detail=True, methods=['post'])
    def validate(self, request, pk=None):
        evt = self.get_object()
        evt.status = EventStatus.VALIDATED
        evt.save(update_fields=['status'])
        EventValidation.objects.create(
            event=evt,
            validated_by=request.user,
            decision='validated',
            checks=request.data.get('checks', {'party': True, 'period': True, 'amount': True}),
            comment=request.data.get('comment', 'Validated by executive')
        )
        return Response({'status': 'validated', 'event_id': evt.event_id})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        evt = self.get_object()
        evt.status = EventStatus.REJECTED_BUSINESS
        evt.rejection_reason = request.data.get('comment', 'Rejected by executive')
        evt.save(update_fields=['status', 'rejection_reason'])
        EventValidation.objects.create(
            event=evt,
            validated_by=request.user,
            decision='rejected',
            comment=evt.rejection_reason
        )
        return Response({'status': 'rejected_business', 'event_id': evt.event_id})


class VendorBillViewSet(viewsets.ModelViewSet):
    """Vendor bills entry, 3-way match, duplicate detection (Screen 1.4)"""
    permission_classes = [IsAuthenticated]
    serializer_class = VendorBillSerializer
    queryset = VendorBill.objects.all().order_by('-created_at')

    def get_queryset(self):
        qs = super().get_queryset()
        st = self.request.query_params.get('status')
        if st:
            qs = qs.filter(status=st)
        return qs

    def create(self, request, *args, **kwargs):
        try:
            bill = VendorBillService.create_vendor_bill(request.user, request.data)
            return Response(VendorBillSerializer(bill).data, status=status.HTTP_201_CREATED)
        except AccountingDomainError as exc:
            return error_response(exc)

    @action(detail=False, methods=['get'], url_path='duplicate-check')
    def duplicate_check(self, request):
        vendor_id = request.query_params.get('vendor_id')
        inv_no = request.query_params.get('invoice_no', '')
        amt = Decimal(str(request.query_params.get('amount', 0)))
        d_str = request.query_params.get('invoice_date')
        inv_d = datetime.strptime(d_str, '%Y-%m-%d').date() if d_str else timezone.now().date()
        res = VendorBillService.check_duplicates(vendor_id, inv_no, amt, inv_d)
        return Response(res)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        try:
            version = int(request.data.get('version', 1))
            ack_dup = bool(request.data.get('ack_duplicate', False))
            app_req = VendorBillService.submit_vendor_bill(pk, request.user, version=version, ack_duplicate=ack_dup)
            return Response({
                'message': 'Vendor bill submitted for approval',
                'approval_request_id': str(app_req.id),
                'reference_no': app_req.reference_no
            })
        except AccountingDomainError as exc:
            return error_response(exc)

    @action(detail=True, methods=['patch', 'post'], url_path='payment-priority')
    def payment_priority(self, request, pk=None):
        priority = request.data.get('priority') or request.data.get('prio', 'Normal')
        res = PayablesControlService.set_priority(str(pk), priority, request.user)
        return Response(res or {'status': 'updated'})

    @action(detail=True, methods=['post'], url_path='decision')
    def decision(self, request, pk=None):
        dec = request.data.get('decision', 'approve')
        comment = request.data.get('comment', '')
        res = PayablesControlService.decide_bill(str(pk), dec, request.user, comment)
        return Response(res)

    @action(detail=True, methods=['post'], url_path='escalate-vendor')
    def escalate_vendor(self, request, pk=None):
        reason = request.data.get('reason', '') or request.data.get('comment', 'Vendor dispute escalated to Procurement')
        from .models import Escalation
        esc = Escalation.objects.create(
            reference_no=NumberSequenceService.get_next_number('ESC'),
            type='vendor_issue',
            reason='vendor_dispute',
            entity_type='vendor_bill',
            entity_id=uuid.uuid4(),
            raised_by=request.user,
            raised_to='procurement',
            amount=Decimal('0.00'),
            status='open',
            notes=[{'who': request.user.get_full_name() or request.user.username, 'when': timezone.now().strftime('%d %b, %H:%M'), 't': reason}]
        )
        AuditService.log_action(actor_user=request.user, module='payables', action='escalate_vendor', entity_type='vendor_bill', entity_id=str(pk), reference_no=str(pk), reason=reason)
        return Response({'status': 'escalated', 'escalation_id': str(esc.id)})


class BankTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    """Bank statement lines and matching (Screen 1.5)"""
    permission_classes = [IsAuthenticated]
    serializer_class = BankTransactionSerializer
    queryset = BankTransaction.objects.all().order_by('-txn_date')

    def get_queryset(self):
        qs = super().get_queryset()
        st = self.request.query_params.get('status')
        if st:
            qs = qs.filter(match_status=st)
        return qs

    @action(detail=True, methods=['get'])
    def suggestions(self, request, pk=None):
        suggs = BankReconciliationService.suggest_matches(pk)
        return Response({'suggestions': suggs})

    @action(detail=True, methods=['post'])
    def flag(self, request, pk=None):
        txn = self.get_object()
        txn.match_status = 'for_review'
        txn.save(update_fields=['match_status'])
        return Response({'match_status': 'for_review'})


class ReconciliationMatchViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ReconciliationMatchSerializer
    queryset = ReconciliationMatch.objects.all().order_by('-created_at')

    def create(self, request, *args, **kwargs):
        match = ReconciliationMatch.objects.create(
            bank_transaction_id=request.data['bank_transaction_id'],
            matched_type=request.data.get('matched_type', 'receipt'),
            matched_id=str(request.data.get('matched_id', '')),
            confidence=int(request.data.get('confidence', 90)),
            method=request.data.get('method', 'manual'),
            proposed_by=request.user,
            status='proposed'
        )
        BankTransaction.objects.filter(id=match.bank_transaction_id).update(match_status='matched')
        return Response(ReconciliationMatchSerializer(match).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def decision(self, request, pk=None):
        match = self.get_object()
        dec = request.data.get('decision', 'approve')
        comment = request.data.get('comment', '')
        if dec == 'approve':
            match.status = 'confirmed'
            match.confirmed_by = request.user
            match.confirmed_at = timezone.now()
            match.save()
            BankTransaction.objects.filter(id=match.bank_transaction_id).update(match_status='matched')
            AuditService.log_action(
                actor_user=request.user, module='reconciliation', action='approve_match',
                entity_type='reconciliation_match', entity_id=str(match.id),
                reference_no=str(match.bank_transaction_id), reason=comment or 'Match approved'
            )
            return Response({'status': 'confirmed', 'message': 'Reconciliation match approved'})
        elif dec in ['return', 'reject']:
            match.status = 'rejected'
            match.save()
            BankTransaction.objects.filter(id=match.bank_transaction_id).update(match_status='unmatched')
            AuditService.log_action(
                actor_user=request.user, module='reconciliation', action='return_match',
                entity_type='reconciliation_match', entity_id=str(match.id),
                reference_no=str(match.bank_transaction_id), reason=comment or 'Match returned for review'
            )
            return Response({'status': 'rejected', 'message': 'Reconciliation match returned for review'})
        return Response({'status': match.status})


class ReceivableViewSet(viewsets.ModelViewSet):
    """Receivables ledger & aging buckets (Screen 1.7)"""
    permission_classes = [IsAuthenticated]
    serializer_class = ReceivableSerializer
    queryset = Receivable.objects.all().order_by('-invoice_date')

    def get_queryset(self):
        ReceivablesService.recalculate_aging_buckets()
        qs = super().get_queryset()
        b = self.request.query_params.get('aging_bucket')
        st = self.request.query_params.get('status')
        if b:
            qs = qs.filter(aging_bucket=b)
        if st:
            qs = qs.filter(status=st)
        return qs

    @action(detail=True, methods=['post'])
    def followups(self, request, pk=None):
        rec = self.get_object()
        f = CollectionFollowup.objects.create(
            receivable=rec,
            channel=request.data.get('channel', 'call'),
            contact_person=request.data.get('contact_person', ''),
            outcome=request.data.get('outcome', ''),
            notes=request.data.get('notes', ''),
            next_action_on=request.data.get('next_action_on'),
            logged_by=request.user
        )
        rec.last_followup_at = timezone.now()
        rec.save(update_fields=['last_followup_at'])
        return Response(CollectionFollowupSerializer(f).data, status=status.HTTP_201_CREATED)


class CollectionPipelineView(APIView):
    """Collection Pipeline stages (Screen 1.8)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cases = CollectionCase.objects.all().order_by('-outstanding_amount')
        return Response(CollectionCaseSerializer(cases, many=True).data)


class WriteOffRequestViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = WriteOffRequestSerializer
    queryset = WriteOffRequest.objects.all().order_by('-created_at')

    def create(self, request, *args, **kwargs):
        ref = NumberSequenceService.get_next_number('WO')
        amount = Decimal(str(request.data.get('amount', 0)))
        wo = WriteOffRequest.objects.create(
            reference_no=ref,
            receivable_id=request.data.get('receivable_id'),
            amount=amount,
            reason=request.data.get('reason', ''),
            category=request.data.get('category', 'disallowance'),
            status='pending'
        )
        app_req = ApprovalEngineService.submit_for_approval(
            document_type='write_off',
            document_id=wo.id,
            reference_no=wo.reference_no,
            amount=amount,
            maker=request.user,
            priority='high' if amount > Decimal('50000.00') else 'medium'
        )
        wo.approval_request = app_req
        wo.save(update_fields=['approval_request'])
        return Response({'reference_no': wo.reference_no, 'status': 'pending'}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def decision(self, request, pk=None):
        wo = self.get_object()
        dec = request.data.get('decision', 'approve')
        comment = request.data.get('comment', '')
        user = request.user
        role_str = str(getattr(user, 'role', '')).lower()
        is_manager = 'manager' in role_str or getattr(user, 'role', '') == RoleType.ACCOUNTS_MANAGER

        if dec == 'approve':
            limit = Decimal('100000.00') if is_manager else Decimal('10000.00')
            forward_role = 'Finance Controller' if is_manager else 'Accounts Manager'
            action_name = 'forward_to_controller' if is_manager else 'forward_to_manager'

            if wo.amount > limit:
                wo.status = 'forwarded'
                wo.save(update_fields=['status'])
                AuditService.log_action(
                    actor_user=user, module='write_off', action=action_name,
                    entity_type='write_off', entity_id=str(wo.id), reference_no=wo.reference_no,
                    reason=f"Above ₹{limit:,.2f} limit ({wo.amount}) - forwarded to {forward_role}"
                )
                return Response({'status': 'forwarded', 'message': f'Write-off of ₹{wo.amount} forwarded to {forward_role}'})
            else:
                wo.status = 'approved'
                wo.save(update_fields=['status'])
                if wo.receivable:
                    wo.receivable.outstanding_amount = max(Decimal('0.00'), wo.receivable.outstanding_amount - wo.amount)
                    wo.receivable.written_off_amount += wo.amount
                    if wo.receivable.outstanding_amount == Decimal('0.00'):
                        wo.receivable.status = 'written_off'
                    wo.receivable.save(update_fields=['outstanding_amount', 'written_off_amount', 'status'])
                AuditService.log_action(
                    actor_user=user, module='write_off', action='approve',
                    entity_type='write_off', entity_id=str(wo.id), reference_no=wo.reference_no,
                    reason=comment or 'Write-off approved'
                )
                return Response({'status': 'approved', 'message': f'Write-off of ₹{wo.amount} approved'})
        elif dec == 'reject':
            wo.status = 'rejected'
            wo.save(update_fields=['status'])
            AuditService.log_action(
                actor_user=user, module='write_off', action='reject',
                entity_type='write_off', entity_id=str(wo.id), reference_no=wo.reference_no,
                reason=comment or 'Write-off rejected'
            )
            return Response({'status': 'rejected', 'message': 'Write-off request rejected'})
        return Response({'status': wo.status})


class ExpenseRequestViewSet(viewsets.ModelViewSet):
    """Departmental expense requests (Screen 1.6)"""
    permission_classes = [IsAuthenticated]
    serializer_class = ExpenseRequestSerializer
    queryset = ExpenseRequest.objects.all().order_by('-created_at')

    def create(self, request, *args, **kwargs):
        ref = NumberSequenceService.get_next_number('EXP')
        amount = Decimal(str(request.data.get('amount', 0)))
        exp = ExpenseRequest.objects.create(
            reference_no=ref,
            department_id=request.data.get('department_id', 'general'),
            requested_by_staff=request.data.get('requested_by_staff', request.user.username),
            expense_type=request.data.get('expense_type', 'medical_consumables'),
            amount=amount,
            business_reason=request.data.get('business_reason', ''),
            budget_available_at_submit=Decimal('100000.00'),
            status='draft',
            maker=request.user
        )
        return Response(ExpenseRequestSerializer(exp).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        exp = self.get_object()
        exp.status = 'in_approval'
        exp.save(update_fields=['status'])
        app_req = ApprovalEngineService.submit_for_approval(
            document_type='expense',
            document_id=exp.id,
            reference_no=exp.reference_no,
            amount=exp.amount,
            maker=request.user
        )
        exp.approval_request = app_req
        exp.save(update_fields=['approval_request'])
        return Response({'message': 'Expense submitted', 'approval_request_id': str(app_req.id)})


class GSTBatchViewSet(viewsets.ModelViewSet):
    """GST Preparation batches (Screen 1.9)"""
    permission_classes = [IsAuthenticated]
    serializer_class = GSTBatchSerializer
    queryset = GSTBatch.objects.all().order_by('-created_at')

    @action(detail=False, methods=['post'], url_path='validate-gstin')
    def validate_gstin(self, request):
        gstin = request.data.get('gstin', '')
        return Response(GSTService.validate_gstin(gstin))

    def create(self, request, *args, **kwargs):
        ref = f"GST-{datetime.now().strftime('%b').upper()}-W1"
        batch = GSTBatch.objects.create(
            reference_no=ref,
            direction=request.data.get('direction', 'outward'),
            period_from=request.data.get('period_from', timezone.now().date()),
            period_to=request.data.get('period_to', timezone.now().date()),
            prepared_by=request.user,
            status='draft'
        )
        return Response(GSTBatchSerializer(batch).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        batch = self.get_object()
        batch.status = 'submitted'
        batch.save(update_fields=['status'])
        return Response({'status': 'submitted', 'reference_no': batch.reference_no})

    @action(detail=True, methods=['post'])
    def decision(self, request, pk=None):
        batch = self.get_object()
        dec = request.data.get('decision', 'approve')
        comment = request.data.get('comment', '')
        if dec == 'approve':
            batch.status = 'approved'
            batch.save(update_fields=['status'])
            AuditService.log_action(
                actor_user=request.user, module='gst', action='approve_batch',
                entity_type='gst_batch', entity_id=str(batch.id),
                reference_no=batch.reference_no, reason=comment or 'GST batch approved'
            )
            return Response({'status': 'approved', 'message': 'GST Batch approved for filing review'})
        elif dec in ['return', 'reject']:
            batch.status = 'returned'
            batch.save(update_fields=['status'])
            AuditService.log_action(
                actor_user=request.user, module='gst', action='return_batch',
                entity_type='gst_batch', entity_id=str(batch.id),
                reference_no=batch.reference_no, reason=comment or 'GST batch returned for correction'
            )
            return Response({'status': 'returned', 'message': 'GST Batch returned for corrections'})
        return Response({'status': batch.status})

    @action(detail=True, methods=['post'], url_path='review-exceptions')
    def review_exceptions(self, request, pk=None):
        batch = self.get_object()
        batch.reviewed_by_manager = True
        batch.save(update_fields=['reviewed_by_manager'])
        AuditService.log_action(
            actor_user=request.user, module='gst', action='review_exceptions',
            entity_type='gst_batch', entity_id=str(batch.id),
            reference_no=batch.reference_no, reason=request.data.get('comment', 'Exceptions reviewed by Manager')
        )
        return Response({'status': 'reviewed', 'reviewed_by_manager': True})

    @action(detail=True, methods=['post'], url_path='escalate')
    def escalate(self, request, pk=None):
        batch = self.get_object()
        batch.status = 'escalated'
        batch.save(update_fields=['status'])
        comment = request.data.get('comment', 'GST issue escalated to Finance Controller')
        Escalation.objects.create(
            reference_no=NumberSequenceService.get_next_number('ESC'),
            type='gst_issue',
            reason='compliance_risk',
            entity_type='gst_batch',
            entity_id=batch.id,
            raised_by=request.user,
            raised_to='finance_controller',
            amount=batch.tax_value,
            status='forwarded',
            notes=[{'who': request.user.get_full_name() or request.user.username, 'when': timezone.now().strftime('%d %b, %H:%M'), 't': comment}]
        )
        AuditService.log_action(
            actor_user=request.user, module='gst', action='escalate_gst',
            entity_type='gst_batch', entity_id=str(batch.id),
            reference_no=batch.reference_no, reason=comment
        )
        return Response({'status': 'escalated', 'message': f"{batch.reference_no} escalated to Finance Controller"})


# =============================================================================
# Phase 3 Views: Collections Owner, Escalations, Daily Close & Team Performance
# =============================================================================

class CollectionCaseViewSet(viewsets.ModelViewSet):
    """Payer-level recovery pipeline cases (Screen 2.9)"""
    permission_classes = [IsAuthenticated]
    serializer_class = CollectionCaseSerializer
    queryset = CollectionCase.objects.all().order_by('-outstanding_amount')

    @action(detail=True, methods=['patch', 'post'], url_path='owner')
    def reassign_owner(self, request, pk=None):
        case = self.get_object()
        new_owner_name = request.data.get('owner') or request.data.get('owner_user_id')
        user = None
        from django.contrib.auth import get_user_model
        User = get_user_model()
        if new_owner_name:
            user = User.objects.filter(username__iexact=new_owner_name).first()
            if not user:
                for u in User.objects.all():
                    if new_owner_name.lower() in (u.get_full_name() or '').lower() or new_owner_name.lower() in u.username.lower():
                        user = u
                        break
        if user:
            case.owner_user = user
            case.save(update_fields=['owner_user'])
        AuditService.log_action(
            actor_user=request.user, module='collections', action='reassign_owner',
            entity_type='collection_case', entity_id=str(case.id),
            reference_no=case.customer.name if case.customer else 'Collection Case',
            reason=f"Reassigned to {new_owner_name}"
        )
        return Response({'status': 'reassigned', 'owner': user.get_full_name() if user else new_owner_name})


class EscalationViewSet(viewsets.ModelViewSet):
    """Supervisory escalations to Accounts Manager (Screen 2.8)"""
    permission_classes = [IsAuthenticated]
    serializer_class = EscalationSerializer
    queryset = Escalation.objects.all().order_by('-created_at')

    def get_queryset(self):
        qs = super().get_queryset()
        st = self.request.query_params.get('status')
        if st and st != 'All':
            if st == 'Open':
                qs = qs.filter(status='open')
            elif st == 'With Manager':
                qs = qs.filter(status='with_manager')
            else:
                qs = qs.filter(status=st.lower().replace(' ', '_'))
        return qs

    @action(detail=True, methods=['post'])
    def notes(self, request, pk=None):
        esc = self.get_object()
        note = request.data.get('note', '') or request.data.get('comment', '')
        if len(note.strip()) < 3:
            return Response({'error': 'Note must be at least 3 characters.'}, status=400)
        esc = EscalationService.add_note(esc.id, request.user, note)
        return Response(EscalationSerializer(esc).data)

    @action(detail=True, methods=['post'])
    def forward(self, request, pk=None):
        esc = self.get_object()
        cmt = request.data.get('comment', '')
        esc = EscalationService.forward_to_manager(esc.id, request.user, cmt)
        return Response(EscalationSerializer(esc).data)

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        esc = self.get_object()
        esc.status = 'resolved'
        esc.resolution = request.data.get('resolution', 'Resolved by supervisor')
        esc.save(update_fields=['status', 'resolution'])
        return Response(EscalationSerializer(esc).data)

    @action(detail=True, methods=['post'])
    def transition(self, request, pk=None):
        """Accounts Manager actions: investigate | forward_to_controller | resolve (Screen 3.15)"""
        esc = self.get_object()
        try:
            esc = EscalationService.transition(
                esc.id, request.user, request.data.get('action', ''), request.data.get('comment', '')
            )
        except AccountingDomainError as exc:
            return error_response(exc)
        return Response(EscalationSerializer(esc).data)


class SupervisorDashboardView(APIView):
    """Aggregates metrics, priority approval queues, team activity, exceptions and alerts (Screen 2.1)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        dash = SupervisorService.get_dashboard(request.user)
        return Response(dash)


class DailyCloseDetailView(APIView):
    """Fetch 3-point checklist, section completion and blockers (Screen 2.10)"""
    permission_classes = [IsAuthenticated]

    def get(self, request, date=None):
        try:
            b_date = datetime.strptime(date, '%Y-%m-%d').date() if date and date != 'today' else timezone.now().date()
        except ValueError:
            b_date = timezone.now().date()
        res = DailyCloseService.get_daily_close_status(b_date)
        return Response(res)


class DailyCloseRunView(APIView):
    """Run Daily Close validation (Screen 2.10)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, date=None):
        try:
            b_date = datetime.strptime(date, '%Y-%m-%d').date() if date and date != 'today' else timezone.now().date()
        except ValueError:
            b_date = timezone.now().date()
        try:
            res = DailyCloseService.run_daily_close(b_date, request.user)
            return Response(res)
        except AccountingDomainError as exc:
            return error_response(exc)


class DailyCloseLockView(APIView):
    """Lock daily operations (Screen 2.10)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, date=None):
        try:
            b_date = datetime.strptime(date, '%Y-%m-%d').date() if date and date != 'today' else timezone.now().date()
        except ValueError:
            b_date = timezone.now().date()
        try:
            res = DailyCloseService.lock_daily_operations(b_date, request.user)
            return Response(res)
        except AccountingDomainError as exc:
            return error_response(exc)


class DailyCloseEscalateView(APIView):
    """Escalate incomplete daily close (Screen 2.10)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, date=None):
        try:
            b_date = datetime.strptime(date, '%Y-%m-%d').date() if date and date != 'today' else timezone.now().date()
        except ValueError:
            b_date = timezone.now().date()
        comment = request.data.get('comment', 'Incomplete close escalated by supervisor')
        res = DailyCloseService.escalate_incomplete_close(b_date, request.user, comment)
        return Response(res)


class TeamPerformanceView(APIView):
    """Team throughput, quality and leaderboards (Screen 2.11 & 3.13)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        level = request.query_params.get('level', 'executive')
        metrics = TeamPerformanceService.get_performance(level=level)
        return Response(metrics)


# =============================================================================
# Phase 4 Views: Accounts Manager (Operations Control, Budgets, Cash Flow)
# =============================================================================

class ManagerDashboardView(APIView):
    """Financial Command Center dashboard metrics, alerts, queues and trends (Screen 3.1)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        dash = ManagerDashboardService.get_dashboard(request.user)
        return Response(dash)


class AnalyticsTrendsView(APIView):
    """Multi-metric 8-week financial trends for AR, AP, Cash Flow and Spend (Screen 3.1)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        dash = ManagerDashboardService.get_dashboard(request.user)
        return Response(dash['trends'])


class ReceivablesSummaryView(APIView):
    """Grouped summary of receivables by payer, department or aging (Screen 3.2)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        group_by = request.query_params.get('group_by', 'payer').lower()
        summary = ReceivablesControlService.get_summary(group_by=group_by)
        return Response(summary)


class ReceivablesPayersView(APIView):
    """Payer-level receivables list with aging and recovery status (Screen 3.2)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        payers = ReceivablesControlService.get_payers()
        return Response(payers)


class ReceivablePriorityView(APIView):
    """Update payer recovery priority (Screen 3.2)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        prio = request.data.get('priority') or request.data.get('prio', 'Medium')
        res = ReceivablesControlService.set_priority(str(pk), prio, request.user)
        return Response(res or {'status': 'updated'})


class ReceivableEscalateCollectionView(APIView):
    """Escalate collection to Recovery Desk (Screen 3.2)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        reason = request.data.get('reason', '') or request.data.get('comment', 'Collection delay escalated')
        res = ReceivablesControlService.escalate_collection(str(pk), request.user, reason)
        return Response(res)


class ReceivableWriteOffDecisionView(APIView):
    """Approve or reject a payer's pending write-off request within the ₹1 L Manager limit (Screen 3.2)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        decision = request.data.get('decision', '')
        comment = request.data.get('comment', '')
        if decision not in ('approve', 'reject'):
            return error_response(AccountingDomainError("Decision must be 'approve' or 'reject'.", code='VALIDATION_FAILED', status_code=422))
        if decision == 'reject' and len(comment.strip()) < 5:
            return error_response(CommentRequiredError('A comment (minimum 5 characters) is required to reject a write-off.'))
        res = ReceivablesControlService.decide_write_off(str(pk), request.user, decision, comment)
        if res.get('status') == 'not_found':
            return Response({'error': {'code': 'NOT_FOUND', 'message': res['message'], 'details': []}}, status=status.HTTP_404_NOT_FOUND)
        if res.get('status') == 'already_decided':
            return Response({'error': {'code': 'ALREADY_DECIDED', 'message': res['message'], 'details': []}}, status=status.HTTP_409_CONFLICT)
        return Response(res)


class PayablesSummaryView(APIView):
    """Grouped summary of payables by vendor, department or category (Screen 3.3)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        group_by = request.query_params.get('group_by', 'vendor').lower()
        summary = PayablesControlService.get_summary(group_by=group_by)
        return Response(summary)


class PayablesBillsView(APIView):
    """Vendor bill rows behind the payables summary (Screen 3.3)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(PayablesControlService.get_bills())


class CashflowProjectionView(APIView):
    """7, 30, and 90-day cash flow projections and liquidity buffer monitor (Screen 3.4)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        days = int(request.query_params.get('days', 30))
        buf = float(request.query_params.get('buffer_cr', 5.0))
        res = CashflowProjectionService.get_projection(days=days, buffer_cr=buf)
        return Response(res)


class HighValueTransactionsView(APIView):
    """Unified feed of high-value transactions >= ₹1 L (Screen 3.6)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        min_amt = float(request.query_params.get('min', 100000))
        txns = HighValueTransactionService.get_transactions(min_amount=min_amt)
        return Response(txns)


class HighValueFlagView(APIView):
    """Flag high-value transaction for review (creates exception) (Screen 3.6)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        reason = request.data.get('reason', '') or request.data.get('comment', 'Flagged for review')
        res = HighValueTransactionService.flag_for_review(str(pk), request.user, reason)
        return Response(res)


class HighValueDecisionView(APIView):
    """Approve, hold or forward a high-value refund, expense or adjustment within Manager DoFA (Screen 3.6)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        decision = request.data.get('decision', '')
        comment = request.data.get('comment', '')
        if decision in ('hold', 'forward') and len(comment.strip()) < 5:
            return error_response(CommentRequiredError(f"A comment (minimum 5 characters) is required to {decision}."))
        res = HighValueTransactionService.decide(str(pk), decision, request.user, comment) or {}
        codes = {'not_found': status.HTTP_404_NOT_FOUND, 'already_decided': status.HTTP_409_CONFLICT,
                 'invalid': status.HTTP_422_UNPROCESSABLE_ENTITY}
        if res.get('status') in codes:
            return Response({'error': {'code': res['status'].upper(), 'message': res['message'], 'details': []}},
                            status=codes[res['status']])
        return Response(res)


class DepartmentBudgetsView(APIView):
    """Department FY27 YTD budget vs actuals vs commitments (Screen 3.7)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        fy = request.query_params.get('fy', 'FY2026-27')
        budgets = BudgetControlService.get_budgets(fy=fy)
        return Response(budgets)


class BudgetExplanationRequestView(APIView):
    """Request explanation from HOD for budget consumption (Screen 3.7)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        comment = request.data.get('comment', '') or request.data.get('message', 'Explanation requested')
        res = BudgetControlService.request_explanation(str(pk), request.user, comment)
        return Response(res)


class BudgetEscalateOverrunView(APIView):
    """Escalate department budget overrun to Finance Controller (Screen 3.7)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        comment = request.data.get('comment', '') or request.data.get('message', 'Overrun escalated to Finance Controller')
        res = BudgetControlService.escalate_overrun(str(pk), request.user, comment)
        return Response(res)


class CostCenterAnalyticsView(APIView):
    """Monthly/Quarterly/Yearly cost center spend, mix, and variance trends (Screen 3.8)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        period = request.query_params.get('period', 'Monthly')
        res = CostCenterAnalyticsService.get_analysis(period=period)
        return Response(res)


class FinancialExceptionViewSet(viewsets.ModelViewSet):
    """Financial exceptions central register and lifecycle actions (Screen 3.10)"""
    permission_classes = [IsAuthenticated]
    serializer_class = FinancialExceptionSerializer
    queryset = FinancialException.objects.all().order_by('-created_at')

    def list(self, request, *args, **kwargs):
        excs = FinancialExceptionService.list_exceptions()
        return Response(excs)

    @action(detail=True, methods=['patch', 'post'], url_path='action')
    def perform_action(self, request, pk=None):
        act = request.data.get('action') or request.data.get('kind', 'investigate')
        owner = request.data.get('owner') or request.data.get('owner_name', '')
        comment = request.data.get('comment', '')
        try:
            res = FinanceControllerService.act_exception(str(pk), act, owner, comment, request.user)
            return Response(res)
        except AccountingDomainError as exc:
            return error_response(exc)


class WeeklyFinancialReviewView(APIView):
    """Weekly command center review and comparison (Screen 3.11)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        week_key = request.query_params.get('week', 'This Week')
        res = WeeklyFinancialReviewService.get_review(week_key=week_key)
        return Response(res)


class WeeklyFinancialReviewShareView(APIView):
    """Share weekly financial review with Finance Controller (Screen 3.11)"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        week_key = request.data.get('week', 'This Week')
        res = WeeklyFinancialReviewService.share_summary(week_key, request.user)
        return Response(res)


class MonthEndReadinessView(APIView):
    """5-item Month-End readiness calculator (Screen 3.12)"""
    permission_classes = [IsAuthenticated]

    def get(self, request, period='2026-09'):
        res = MonthEndReadinessService.get_readiness(period=period)
        return Response(res)


class MonthEndChecklistOwnerView(APIView):
    """Reassign month-end checklist item owner (Screen 3.12)"""
    permission_classes = [IsAuthenticated]

    def patch(self, request, period='2026-09', code=None):
        owner = request.data.get('owner', '')
        res = MonthEndReadinessService.reassign_owner(code, owner, request.user)
        return Response(res or {'status': 'updated'})


class MonthEndEscalateDelaysView(APIView):
    """Escalate delayed month-end checklist tasks to Controller (Screen 3.12)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, period='2026-09'):
        res = MonthEndReadinessService.escalate_delays(period, request.user)
        return Response(res)


class DepartmentPerformanceView(APIView):
    """September 2026 clinical department revenue, expense, profit, margin & AR (Screen 3.14)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        depts = [
            {'dept': 'OPD', 'revenue': 31200000, 'expense': 21400000, 'profit': 9800000, 'margin_pct': 31.4, 'growth_pct': 4.7, 'ar': 3374950},
            {'dept': 'IPD', 'revenue': 104600000, 'expense': 80200000, 'profit': 24400000, 'margin_pct': 23.3, 'growth_pct': 3.4, 'ar': 37233000},
            {'dept': 'Laboratory', 'revenue': 18800000, 'expense': 12100000, 'profit': 6700000, 'margin_pct': 35.6, 'growth_pct': -1.6, 'ar': 3110000},
            {'dept': 'Radiology', 'revenue': 22600000, 'expense': 16400000, 'profit': 6200000, 'margin_pct': 27.4, 'growth_pct': 5.6, 'ar': 3566000},
            {'dept': 'Pharmacy', 'revenue': 41000000, 'expense': 33800000, 'profit': 7200000, 'margin_pct': 17.6, 'growth_pct': 2.0, 'ar': 0}
        ]
        tot_rev = sum(d['revenue'] for d in depts)
        tot_exp = sum(d['expense'] for d in depts)
        tot_prof = tot_rev - tot_exp
        return Response({
            'period': 'September 2026',
            'total_revenue': tot_rev,
            'total_expense': tot_exp,
            'total_profit': tot_prof,
            'profitability_pct': round(tot_prof / tot_rev * 100, 1),
            'growth_pct': 3.1,
            'departments': depts
        })


# =============================================================================
# Phase 5: Finance Controller Views (Integrity, Period Close, Payment Release)
# =============================================================================

class ControllerDashboardView(APIView):
    """Financial Integrity Dashboard (Screen 4.1)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        dash = FinanceControllerService.get_dashboard(request.user)
        return Response(dash)


class MonthEndCloseView(APIView):
    """Month-End Close 9-item checklist & status (Screen 4.2)"""
    permission_classes = [IsAuthenticated]

    def get(self, request, period='2026-09'):
        res = FinanceControllerService.get_month_end_close(period=period)
        return Response(res)


class MonthEndCloseApproveView(APIView):
    """Approve Month-End Close (Screen 4.2)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, period='2026-09'):
        try:
            res = FinanceControllerService.approve_month_end_close(period, request.user)
            return Response(res)
        except AccountingDomainError as exc:
            return error_response(exc)


class MonthEndCloseDelayView(APIView):
    """Delay Month-End Close target date with reason (Screen 4.2)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, period='2026-09'):
        delay_to = request.data.get('delay_to') or request.data.get('new_date')
        reason = request.data.get('reason') or request.data.get('comment', '')
        try:
            res = FinanceControllerService.delay_month_end_close(period, delay_to, reason, request.user)
            return Response(res)
        except AccountingDomainError as exc:
            return error_response(exc)


class MonthEndCloseEscalateView(APIView):
    """Escalate Month-End Close blocker to CFO (Screen 4.2)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, period='2026-09'):
        reason = request.data.get('reason') or request.data.get('comment', '')
        try:
            res = FinanceControllerService.escalate_month_end_close(period, reason, request.user)
            return Response(res)
        except AccountingDomainError as exc:
            return error_response(exc)


class QuarterEndCloseView(APIView):
    """Quarter-End Close status, provisions and schedule checklist (Screen 4.3)"""
    permission_classes = [IsAuthenticated]

    def get(self, request, q='FY27-Q2'):
        res = FinanceControllerService.get_quarter_end_close(q=q)
        return Response(res)


class QuarterEndItemReviewView(APIView):
    """Review individual Quarter-End checklist provision (Screen 4.3)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, q='FY27-Q2', item_id=None):
        try:
            res = FinanceControllerService.review_quarter_item(item_id, request.user)
            return Response(res)
        except AccountingDomainError as exc:
            return error_response(exc)


class QuarterEndCloseApproveView(APIView):
    """Approve Quarter-End Close (Screen 4.3)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, q='FY27-Q2'):
        try:
            res = FinanceControllerService.approve_quarter(q, request.user)
            return Response(res)
        except AccountingDomainError as exc:
            return error_response(exc)


class QuarterEndCloseLockView(APIView):
    """Lock Quarter-End Close (Screen 4.3)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, q='FY27-Q2'):
        try:
            res = FinanceControllerService.lock_quarter(q, request.user)
            return Response(res)
        except AccountingDomainError as exc:
            return error_response(exc)


class YearEndCloseView(APIView):
    """Year-End Close audit observations and calendar (Screen 4.4)"""
    permission_classes = [IsAuthenticated]

    def get(self, request, fy='FY2026-27'):
        res = FinanceControllerService.get_year_end_close(fy=fy)
        return Response(res)


class YearEndCloseActView(APIView):
    """Remediate observation or approve plan for Year-End Close (Screen 4.4)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, fy='FY2026-27', obs_id=None):
        try:
            res = FinanceControllerService.act_year_end_item(obs_id, request.user)
            return Response(res)
        except AccountingDomainError as exc:
            return error_response(exc)


class PeriodLockActionView(APIView):
    """Lock or reopen a period (Screen 4.5)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None, action=None):
        comment = request.data.get('comment', '')
        ack = request.data.get('acknowledgement', False) or request.data.get('ack', False)
        try:
            if action == 'lock':
                res = FinanceControllerService.lock_period(str(pk), request.user)
            elif action == 'reopen':
                res = FinanceControllerService.reopen_period(str(pk), request.user, comment, ack=ack)
            else:
                return Response({'error': {'code': 'INVALID_ACTION', 'message': f'Unknown action {action}'}}, status=400)
            return Response(res)
        except AccountingDomainError as exc:
            return error_response(exc)


class PeriodReopenDecisionView(APIView):
    """Approve or reject period reopen request (Screen 4.5)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None, rid=None):
        decision = request.data.get('decision', 'approve')
        comment = request.data.get('comment', '')
        try:
            res = FinanceControllerService.decide_reopen_request(str(pk), str(rid), decision, comment, request.user)
            return Response(res)
        except AccountingDomainError as exc:
            return error_response(exc)


class PaymentBatchListView(APIView):
    """Payment batches awaiting release list (Screen 4.6)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        status_filter = request.query_params.get('status')
        batches = FinanceControllerService.list_payment_batches(status_filter=status_filter)
        return Response(batches)


class PaymentBatchChecksView(APIView):
    """Evaluate control checks on payment batch (Screen 4.6)"""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk=None):
        checks = FinanceControllerService.get_batch_checks(str(pk))
        return Response({'passed': all(c.get('ok') for c in checks), 'checks': checks})


class PaymentBatchReleaseView(APIView):
    """Release payment batch with control checks & co-sign guard (Screen 4.6)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        ack = request.data.get('acknowledgement', False) or request.data.get('ack', False) or bool(request.data.get('acknowledgements'))
        try:
            res = FinanceControllerService.release_batch(str(pk), ack, request.user)
            return Response(res)
        except AccountingDomainError as exc:
            return error_response(exc)


class PaymentBatchHoldView(APIView):
    """Put payment batch on hold (Screen 4.6)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        comment = request.data.get('comment', '')
        try:
            res = FinanceControllerService.hold_batch(str(pk), comment, request.user)
            return Response(res)
        except AccountingDomainError as exc:
            return error_response(exc)


class PaymentBatchReturnView(APIView):
    """Return payment batch to Accounts Manager (Screen 4.6)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        comment = request.data.get('comment', '')
        try:
            res = FinanceControllerService.return_batch(str(pk), comment, request.user)
            return Response(res)
        except AccountingDomainError as exc:
            return error_response(exc)


class PaymentBatchCosignView(APIView):
    """CFO co-sign payment batch above ₹ 1 Cr (Screen 4.6)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        comment = request.data.get('comment', '')
        try:
            res = FinanceControllerService.cosign_batch(str(pk), comment, request.user)
            return Response(res)
        except AccountingDomainError as exc:
            return error_response(exc)


class BankAccountListView(APIView):
    """Bank accounts balances & status (Screen 4.7)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        accounts = FinanceControllerService.list_bank_accounts()
        return Response(accounts)


class BankAccountFreezeView(APIView):
    """Freeze or unfreeze outgoing payments on bank account (Screen 4.7)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        comment = request.data.get('comment', '')
        try:
            res = FinanceControllerService.freeze_bank_account(str(pk), comment, request.user)
            return Response(res)
        except AccountingDomainError as exc:
            return error_response(exc)


class BankReconciliationListView(APIView):
    """Bank reconciliations sign-off queue (Screen 4.7)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        recs = FinanceControllerService.list_reconciliations()
        return Response(recs)


class BankReconciliationApproveView(APIView):
    """Approve bank reconciliation (Screen 4.7)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        ack = request.data.get('acknowledgement', False) or request.data.get('ack', False) or bool(request.data.get('acknowledgement_text'))
        try:
            res = FinanceControllerService.approve_reconciliation(str(pk), ack, request.user)
            return Response(res)
        except AccountingDomainError as exc:
            return error_response(exc)


class BankReconciliationReturnView(APIView):
    """Return bank reconciliation to Accounts Manager (Screen 4.7)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        comment = request.data.get('comment', '')
        try:
            res = FinanceControllerService.return_reconciliation(str(pk), comment, request.user)
            return Response(res)
        except AccountingDomainError as exc:
            return error_response(exc)


class FinancialStatementDetailView(APIView):
    """Financial statement P&L, BS, CF with lines and variance flags (Screen 4.8)"""
    permission_classes = [IsAuthenticated]

    def get(self, request, st_type=None):
        period = request.query_params.get('period', '2026-09')
        try:
            st = FinanceControllerService.get_statement(st_type, period=period)
            return Response(st)
        except AccountingDomainError as exc:
            return error_response(exc)


class FinancialStatementFlagView(APIView):
    """Flag statement line variance for investigation (Screen 4.8)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, st_type=None):
        line_key = request.data.get('line_key', '')
        query = request.data.get('query', '')
        try:
            res = FinanceControllerService.flag_statement_variance(st_type, line_key, query, request.user)
            return Response(res)
        except AccountingDomainError as exc:
            return error_response(exc)


class FinancialStatementApproveView(APIView):
    """Approve financial statement (Screen 4.8)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, st_type=None):
        ack = request.data.get('acknowledgement', False) or request.data.get('ack', False)
        try:
            res = FinanceControllerService.approve_statement(st_type, ack, request.user)
            return Response(res)
        except AccountingDomainError as exc:
            return error_response(exc)


class TaxReturnsListView(APIView):
    """Tax returns register (GSTR-1, 3B, 26Q, 9) (Screen 4.9)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        returns = FinanceControllerService.list_tax_returns()
        return Response(returns)


class TaxReturnApproveView(APIView):
    """Approve tax return for filing (Screen 4.9)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        ack = request.data.get('acknowledgement', False) or request.data.get('ack', False) or bool(request.data.get('acknowledgements'))
        try:
            res = FinanceControllerService.approve_tax_return(str(pk), ack, request.user)
            return Response(res)
        except AccountingDomainError as exc:
            return error_response(exc)


class TaxReturnReturnView(APIView):
    """Return tax return to Accounts Manager (Screen 4.9)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        comment = request.data.get('comment', '')
        try:
            res = FinanceControllerService.return_tax_return(str(pk), comment, request.user)
            return Response(res)
        except AccountingDomainError as exc:
            return error_response(exc)


class TaxReturnEscalateView(APIView):
    """Escalate tax return to CFO (Screen 4.9)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        comment = request.data.get('comment', '')
        try:
            res = FinanceControllerService.escalate_tax_return(str(pk), comment, request.user)
            return Response(res)
        except AccountingDomainError as exc:
            return error_response(exc)


class TaxReturnExportView(APIView):
    """Export tax return JSON for filing portal (Screen 4.9)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        return Response({'status': 'exported', 'file_name': f"return_{pk}_portal_export.json"})


class ControlViolationsListView(APIView):
    """Internal control violations register IC-01..IC-07 (Screen 4.11)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        status_filter = request.query_params.get('status')
        sev_filter = request.query_params.get('severity')
        violations = FinanceControllerService.list_control_violations(status_filter=status_filter, sev_filter=sev_filter)
        return Response(violations)


class ControlViolationActionView(APIView):
    """Act on control violation (remediate, escalate, close) (Screen 4.11)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        action = request.data.get('action') or request.data.get('kind', 'remediate')
        owner = request.data.get('owner', '')
        comment = request.data.get('comment', '')
        try:
            res = FinanceControllerService.act_control_violation(str(pk), action, owner, comment, request.user)
            return Response(res)
        except AccountingDomainError as exc:
            return error_response(exc)


class HighRiskItemsListView(APIView):
    """High-Risk review queue for transactions above Manager limit (Screen 4.12)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        status_filter = request.query_params.get('status')
        items = FinanceControllerService.list_high_risk_items(status_filter=status_filter)
        return Response(items)


class HighRiskItemDecisionView(APIView):
    """Decide high-risk transaction (approve, forward_to_cfo, return, reject) (Screen 4.12)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        decision = request.data.get('decision') or request.data.get('kind', 'approve')
        comment = request.data.get('comment', '')
        ack = request.data.get('acknowledgement', False) or request.data.get('ack', False)
        try:
            res = FinanceControllerService.decide_high_risk_item(str(pk), decision, comment, ack, request.user)
            return Response(res)
        except AccountingDomainError as exc:
            return error_response(exc)


class PoliciesListView(APIView):
    """Financial Policies POL-01..POL-07 register (Screen 4.14)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        policies = FinanceControllerService.list_policies()
        return Response(policies)


class PolicyChangeDecisionView(APIView):
    """Approve or reject proposed policy change (Screen 4.14)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None, cid=None):
        decision = request.data.get('decision', 'approve')
        comment = request.data.get('comment', '')
        try:
            res = FinanceControllerService.decide_policy_change(str(pk), decision, comment, request.user)
            return Response(res)
        except AccountingDomainError as exc:
            return error_response(exc)


class PolicyReviewView(APIView):
    """Complete routine policy review and extend next review date (Screen 4.14)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        try:
            res = FinanceControllerService.review_policy(str(pk), request.user)
            return Response(res)
        except AccountingDomainError as exc:
            return error_response(exc)


class AuditRequestsListView(APIView):
    """Auditor PBC requests list (Screen 4.10)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        pbc = FinanceControllerService.list_audit_requests()
        return Response(pbc)


class AuditRequestReadyView(APIView):
    """Mark auditor PBC item ready with evidence (Screen 4.10)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        try:
            res = FinanceControllerService.mark_audit_request_ready(str(pk), request.user)
            return Response(res)
        except AccountingDomainError as exc:
            return error_response(exc)


class AuditRequestShareView(APIView):
    """Share ready PBC item with external auditor (Screen 4.10)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        try:
            res = FinanceControllerService.share_audit_request(str(pk), request.user, request.data.get('engagement_no', ''))
            return Response(res)
        except AccountingDomainError as exc:
            return error_response(exc)


class AuditRequestEvidenceView(APIView):
    """Request evidence from department owner for PBC item (Screen 4.10)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        owner = request.data.get('owner', '')
        try:
            res = FinanceControllerService.request_audit_evidence(str(pk), owner, request.user)
            return Response(res)
        except AccountingDomainError as exc:
            return error_response(exc)


class AuditObservationsListView(APIView):
    """Prior-year statutory audit observations (Screen 4.4)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        obs = FinanceControllerService.list_audit_observations()
        return Response(obs)


class AuditObservationActView(APIView):
    """Remediate observation or approve year-end plan (Screen 4.4)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        try:
            res = FinanceControllerService.act_audit_observation(str(pk), request.user)
            return Response(res)
        except AccountingDomainError as exc:
            return error_response(exc)


# =============================================================================
# Phase 6: Chief Financial Officer (CFO) Strategy Views
# =============================================================================

from .services import CfoStrategyService


class CfoDashboardView(APIView):
    """10-Question Executive Dashboard and high-level KPIs (Screen 6.1)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        dash = CfoStrategyService.get_cfo_dashboard()
        return Response(dash)


class CfoProfitLossView(APIView):
    """Executive Profit & Loss statement with trends (Screen 6.2)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        period = request.query_params.get('period', 'Month')
        res = CfoStrategyService.get_profit_loss(period=period)
        return Response(res)


class CfoCashFlowView(APIView):
    """12-month and daily cash flow projections with buffer and runway (Screen 6.3)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        view = request.query_params.get('view', '30 Days')
        buf = float(request.query_params.get('buffer_cr', 5.0))
        res = CfoStrategyService.get_cash_flow_projections(view=view, buffer_cr=buf)
        return Response(res)


class CfoBalanceSheetView(APIView):
    """Assets, Liabilities, and Pro Forma Debt Capacity (Screen 6.4)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        res = CfoStrategyService.get_balance_sheet()
        return Response(res)


class CfoDeptProfitabilityView(APIView):
    """Clinical department profitability, margins and overhead (Screen 6.5)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        rank = request.query_params.get('rank', 'Most Profitable')
        res = CfoStrategyService.get_department_profitability(rank=rank)
        return Response(res)


class CfoTurnaroundPlanView(APIView):
    """Issue turnaround plan directive to clinical department (Screen 6.5)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, dept=None):
        message = request.data.get('message', '') or request.data.get('comment', '')
        try:
            res = CfoStrategyService.request_turnaround_plan(dept, request.user, message)
            return Response(res)
        except AccountingDomainError as exc:
            return error_response(exc)


class CfoServiceLinesView(APIView):
    """Clinical service lines volume, margin and growth analytics (Screen 6.6)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sort_by = request.query_params.get('sort', 'Growth')
        res = CfoStrategyService.get_service_lines(sort_by=sort_by)
        return Response(res)


class CfoBudgetStrategyView(APIView):
    """Budget performance and FY28 proposal (Screen 6.7)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        view = request.query_params.get('view', 'Department')
        res = CfoStrategyService.get_budget_strategy(view=view)
        return Response(res)


class CfoBudgetStrategyDecisionView(APIView):
    """Approve or request revision of FY28 budget strategy (Screen 6.7)"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        decision = request.data.get('decision', 'approve')
        comment = request.data.get('comment', '')
        try:
            res = CfoStrategyService.decide_budget_strategy(decision, request.user, comment=comment)
            return Response(res)
        except AccountingDomainError as exc:
            return error_response(exc)


class CfoForecastView(APIView):
    """Forward financial forecast across 3 scenarios and 4 horizons (Screen 6.8)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        horizon = request.query_params.get('horizon', '12 Months')
        scenario = request.query_params.get('scenario', 'Expected')
        buf = float(request.query_params.get('buffer_cr', 5.0))
        res = CfoStrategyService.get_financial_forecast(horizon=horizon, scenario=scenario, buffer_cr=buf)
        return Response(res)


class CfoCapexListView(APIView):
    """Capital projects evaluation register (Screen 6.9)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        filter_status = request.query_params.get('status', 'Awaiting')
        res = CfoStrategyService.get_capex_requests(filter_status=filter_status)
        return Response(res)


class CfoCapexDecisionView(APIView):
    """CapEx decision engine (approve <=25 Cr, board, reject, analysis) (Screen 6.9)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        action = request.data.get('action') or request.data.get('decision', 'approve')
        comment = request.data.get('comment', '')
        try:
            res = CfoStrategyService.decide_capex(str(pk), action, request.user, comment=comment)
            return Response(res)
        except AccountingDomainError as exc:
            return error_response(exc)


class CfoStrategicApprovalsView(APIView):
    """Strategic approvals register (Screen 6.10)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        filter_status = request.query_params.get('status', 'Awaiting')
        res = CfoStrategyService.get_strategic_approvals(filter_status=filter_status)
        return Response(res)


class CfoStrategicApprovalDecisionView(APIView):
    """Decide strategic contract, loan or expansion (Screen 6.10)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        action = request.data.get('action') or request.data.get('decision', 'approve')
        comment = request.data.get('comment', '')
        try:
            res = CfoStrategyService.decide_strategic_approval(str(pk), action, request.user, comment=comment)
            return Response(res)
        except AccountingDomainError as exc:
            return error_response(exc)


class CfoGrowthOpportunitiesView(APIView):
    """Growth opportunities pipeline (Screen 6.12)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        filter_stage = request.query_params.get('stage', 'All')
        res = CfoStrategyService.get_growth_opportunities(filter_stage=filter_stage)
        return Response(res)


class CfoGrowthOpportunityDecisionView(APIView):
    """Advance stage, refer to board, park or reject growth opportunity (Screen 6.12)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        action = request.data.get('action') or request.data.get('decision', 'advance')
        comment = request.data.get('comment', '')
        try:
            res = CfoStrategyService.decide_growth_opportunity(str(pk), action, request.user, comment=comment)
            return Response(res)
        except AccountingDomainError as exc:
            return error_response(exc)


class CfoStrategicRisksView(APIView):
    """Strategic risks matrix and register (Screen 6.13)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        filter_level = request.query_params.get('level', 'All')
        res = CfoStrategyService.get_strategic_risks(filter_level=filter_level)
        return Response(res)


class CfoStrategicRiskDecisionView(APIView):
    """Direct mitigation, accept or escalate risk to Board (Screen 6.13)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        action = request.data.get('action') or request.data.get('decision', 'mitigate')
        comment = request.data.get('comment', '')
        try:
            res = CfoStrategyService.decide_strategic_risk(str(pk), action, request.user, comment=comment)
            return Response(res)
        except AccountingDomainError as exc:
            return error_response(exc)


class CfoExecutiveAlertsView(APIView):
    """Executive-level alerts (Screen 6.14)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        filter_status = request.query_params.get('status', 'Open')
        buf = float(request.query_params.get('buffer_cr', 5.0))
        res = CfoStrategyService.get_executive_alerts(filter_status=filter_status, buffer_cr=buf)
        return Response(res)


class CfoExecutiveAlertActView(APIView):
    """Acknowledge, assign or add alert to Board pack (Screen 6.14)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        action = request.data.get('action') or request.data.get('kind', 'ack')
        owner = request.data.get('owner') or request.data.get('assigned_to', '')
        note = request.data.get('note') or request.data.get('comment', '')
        try:
            res = CfoStrategyService.act_executive_alert(str(pk), action, request.user, owner=owner, note=note)
            return Response(res)
        except AccountingDomainError as exc:
            return error_response(exc)


class CfoBoardReportView(APIView):
    """Auto-generated Board pack and 5 thematic sections (Screen 6.11)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        res = CfoStrategyService.get_board_report()
        AuditService.log_read(request.user, 'board_pack', reference_no='BOARD-PACK')
        return Response(res)


class CfoBoardReportApproveView(APIView):
    """Approve Board pack for circulation (Screen 6.11)"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        comment = request.data.get('comment', '')
        try:
            res = CfoStrategyService.approve_board_report(request.user, comment=comment)
            return Response(res)
        except AccountingDomainError as exc:
            return error_response(exc)


class CfoBoardReportExportView(APIView):
    """Export Board pack (PDF, PPT, PACK) (Screen 6.11)"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        export_type = request.data.get('type') or request.data.get('export_type', 'pdf')
        try:
            res = CfoStrategyService.export_board_report(export_type, request.user)
            AuditService.log_read(request.user, 'board_pack_export', reference_no='BOARD-PACK', detail=f'format={export_type}')
            return Response(res)
        except AccountingDomainError as exc:
            return error_response(exc)


class CfoBoardSectionToggleView(APIView):
    """Include or exclude section from Board pack (Screen 6.11)"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        section_key = request.data.get('section')
        included = request.data.get('included', True)
        res = CfoStrategyService.toggle_board_section(section_key, included)
        return Response(res)


class CfoExecutiveDecisionsView(APIView):
    """Audit history of strategic CFO decisions (Screen 6.15)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cat = request.query_params.get('category', 'All')
        res = CfoStrategyService.list_executive_decisions(filter_category=cat)
        return Response(res)


# =============================================================================
# Phase 7 Views (Refunds & Billing Day-End Reconciliation)
# =============================================================================

from .models import Refund, RefundStatus
from .serializers import RefundSerializer
from .services import BillingIntegrationService

class RefundViewSet(viewsets.ModelViewSet):
    """Refunds raised by Billing requiring Accounts maker-checker DoFA approval"""
    queryset = Refund.objects.all().order_by('-created_at')
    serializer_class = RefundSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        st = self.request.query_params.get('status')
        if st:
            qs = qs.filter(status=st)
        uhid = self.request.query_params.get('patient_uhid')
        if uhid:
            qs = qs.filter(patient_uhid=uhid)
        bill_no = self.request.query_params.get('source_bill_no')
        if bill_no:
            qs = qs.filter(source_bill_no=bill_no)
        q = self.request.query_params.get('q')
        if q:
            qs = qs.filter(
                models.Q(reference_no__icontains=q) |
                models.Q(patient_uhid__icontains=q) |
                models.Q(patient_name__icontains=q) |
                models.Q(source_bill_no__icontains=q)
            )
        return qs

    def perform_create(self, serializer):
        refund = serializer.save(maker=self.request.user)
        from .models import ApprovalRequest, ApprovalLevel
        from apps.accounts.models import RoleType
        amt = refund.amount
        if amt <= Decimal('500000.00'):
            lvl = ApprovalLevel.MANAGER
            role = RoleType.ACCOUNTS_MANAGER
        elif amt <= Decimal('5000000.00'):
            lvl = ApprovalLevel.CONTROLLER
            role = RoleType.FINANCE_CONTROLLER
        else:
            lvl = ApprovalLevel.CFO
            role = RoleType.CFO

        app_req = ApprovalRequest.objects.create(
            document_type='refund',
            document_id=refund.id,
            reference_no=refund.reference_no,
            amount=refund.amount,
            maker=self.request.user,
            current_level=lvl,
            current_approver_role=role,
            priority='high' if amt > Decimal('50000.00') else 'medium',
            status='pending',
            version=1
        )
        refund.approval_request = app_req
        refund.save(update_fields=['approval_request'])

    @action(detail=True, methods=['post'])
    def decision(self, request, pk=None):
        """Processes approver decision (approve / reject) with DoFA validation"""
        action_name = request.data.get('action') or request.data.get('decision')
        comment = request.data.get('comment', '')
        try:
            res = BillingIntegrationService.decide_refund(pk, request.user, action_name, comment)
            return Response(res, status=status.HTTP_200_OK)
        except AccountingDomainError as exc:
            return error_response(exc)

    @action(detail=True, methods=['post'])
    def execute(self, request, pk=None):
        """Cashier executes payout and posts GL disbursement journal"""
        payout_mode = request.data.get('payout_mode', 'cash')
        bank_account_id = request.data.get('bank_account_id')
        try:
            res = BillingIntegrationService.execute_refund_payout(pk, request.user, payout_mode, bank_account_id)
            return Response(res, status=status.HTTP_200_OK)
        except AccountingDomainError as exc:
            return error_response(exc)


class DayEndReconciliationView(APIView):
    """Calculates Billing Day Close Total vs Accounts Posted Revenue with variance report"""
    permission_classes = [AllowAny]

    def get(self, request):
        date_str = request.query_params.get('date')
        target_date = datetime.strptime(date_str, '%Y-%m-%d').date() if date_str else timezone.now().date()
        res = BillingIntegrationService.reconcile_day_end(target_date)
        return Response(res, status=status.HTTP_200_OK)


class PharmacyReconciliationView(APIView):
    """Calculates Pharmacy Stock vs General Ledger account 1300 balance reconciliation"""
    permission_classes = [AllowAny]

    def get(self, request):
        date_str = request.query_params.get('date')
        target_date = datetime.strptime(date_str, '%Y-%m-%d').date() if date_str else None
        tol_str = request.query_params.get('tolerance', '0.5')
        try:
            tolerance = Decimal(tol_str)
        except Exception:
            tolerance = Decimal('0.5')
        res = PharmacyIntegrationService.reconcile_pharmacy_stock_vs_gl(target_date, tolerance)
        return Response(res, status=status.HTTP_200_OK)


class PharmacyValuationView(APIView):
    """Calculates active FEFO pharmacy batch stock valuation"""
    permission_classes = [AllowAny]

    def get(self, request):
        date_str = request.query_params.get('date')
        target_date = datetime.strptime(date_str, '%Y-%m-%d').date() if date_str else None
        res = PharmacyIntegrationService.get_pharmacy_inventory_valuation(target_date)
        return Response(res, status=status.HTTP_200_OK)


class PharmacyWriteOffDecisionView(APIView):
    """Processes approver decision on pharmacy inventory expiry write-off"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        decision = request.data.get('decision') or request.data.get('action')
        comment = request.data.get('comment', '')
        req_id = pk or request.data.get('approval_request_id')
        try:
            res = PharmacyIntegrationService.decide_writeoff(req_id, request.user, decision, comment)
            return Response(res, status=status.HTTP_200_OK)
        except AccountingDomainError as exc:
            return error_response(exc)


class VendorBankVerificationView(APIView):
    """Verifies vendor bank account change to clear cooling-off period payment lock"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        vendor_id = pk or request.data.get('vendor_id')
        notes = request.data.get('notes', '')
        try:
            res = PharmacyIntegrationService.verify_vendor_bank_change(vendor_id, request.user, notes)
            return Response(res, status=status.HTTP_200_OK)
        except AccountingDomainError as exc:
            return error_response(exc)


# =============================================================================
# Phase 9: OPD & IPD Integration Views
# =============================================================================

class UnbilledRevenueSummaryView(APIView):
    """Calculates running unbilled IPD revenue across all in-house patients"""
    permission_classes = [AllowAny]

    def get(self, request):
        date_str = request.query_params.get('date')
        target_date = datetime.strptime(date_str, '%Y-%m-%d').date() if date_str else None
        res = ClinicalIntegrationService.calculate_in_house_unbilled_revenue(target_date)
        return Response(res, status=status.HTTP_200_OK)


class UnbilledAccrualGenerateView(APIView):
    """Generates month-end unbilled revenue accrual journal with scheduled auto-reversal"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        date_str = request.data.get('date') or request.query_params.get('date')
        as_of_date = datetime.strptime(date_str, '%Y-%m-%d').date() if date_str else None
        res = ClinicalIntegrationService.generate_month_end_unbilled_revenue_accrual(as_of_date, request.user)
        return Response(res, status=status.HTTP_201_CREATED if res.get('status') == 'accrual_created' else status.HTTP_200_OK)


class AutoReversalAccrualView(APIView):
    """Executes scheduled Day 1 auto-reversal of unbilled revenue accruals"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        date_str = request.data.get('date') or request.query_params.get('date')
        target_date = datetime.strptime(date_str, '%Y-%m-%d').date() if date_str else None
        res = ClinicalIntegrationService.execute_auto_reversal_accruals(target_date, request.user)
        return Response(res, status=status.HTTP_200_OK)


class ConsultantShareBatchViewSet(viewsets.ModelViewSet):
    """Doctor and visiting consultant fee accrual batch management (Screen 1.4 / 3.4)"""
    permission_classes = [IsAuthenticated]
    serializer_class = ConsultantShareBatchSerializer
    queryset = ConsultantShareBatch.objects.all().order_by('-created_at')

    @action(detail=False, methods=['post'], url_path='generate')
    def generate_batch(self, request):
        p_from = request.data.get('period_from')
        p_to = request.data.get('period_to')
        dept = request.data.get('department_id', 'OPD')
        doctors = request.data.get('doctors')
        try:
            res = ClinicalIntegrationService.generate_consultant_share_batch(
                period_from=p_from,
                period_to=p_to,
                department_id=dept,
                doctors_data=doctors,
                user=request.user
            )
            return Response(res, status=status.HTTP_201_CREATED)
        except AccountingDomainError as exc:
            return error_response(exc)

    @action(detail=True, methods=['post'], url_path='decide')
    def decide(self, request, pk=None):
        batch = self.get_object()
        decision = request.data.get('decision', 'approved')
        comment = request.data.get('comment', '')
        if batch.approval_request:
            res = ApprovalEngineService.process_decision(
                approval_request_id=batch.approval_request.id,
                user=request.user,
                decision=decision,
                comment=comment
            )
            return Response(res, status=status.HTTP_200_OK)
        return Response({'status': 'no_approval_request'}, status=status.HTTP_400_BAD_REQUEST)


class OTImplantMatchingView(APIView):
    """Matches OT / Cath-Lab implant consignment invoices against usage register (IA-04)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        bill_id = pk or request.data.get('vendor_bill_id')
        try:
            res = ClinicalIntegrationService.match_ot_implant_consignment(bill_id)
            return Response(res, status=status.HTTP_200_OK)
        except AccountingDomainError as exc:
            return error_response(exc)


# =============================================================================
# Phase 10 Views: Laboratory & Radiology Integration
# =============================================================================

class LabAccrualBatchView(APIView):
    """Batches outsourced tests into the daily accrual journal and routes it for approval (#19)"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            res = LabIntegrationService.post_daily_accrual_batch(request.data.get('business_date'), request.user)
            return Response(res, status=status.HTTP_200_OK)
        except AccountingDomainError as exc:
            return error_response(exc)


class LabPartnerInvoiceMatchView(APIView):
    """Matches a partner-lab invoice to accrued test requisitions (count & amount)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        bill_id = pk or request.data.get('vendor_bill_id')
        try:
            res = LabIntegrationService.match_partner_invoice(
                bill_id,
                period_from=request.data.get('period_from'),
                period_to=request.data.get('period_to'),
                invoiced_count=request.data.get('invoiced_count'),
                requisition_nos=request.data.get('requisition_nos'),
                partner_lab=request.data.get('partner_lab'),
            )
            return Response(res, status=status.HTTP_200_OK)
        except VendorBill.DoesNotExist:
            return Response({'error': {'code': 'NOT_FOUND', 'message': f'Vendor bill {bill_id} not found', 'details': []}},
                            status=status.HTTP_404_NOT_FOUND)
        except AccountingDomainError as exc:
            return error_response(exc)


class LabServiceLineFeedView(APIView):
    """Runs (or re-runs) the nightly Laboratory/Radiology service-line volume feed for a date"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        return Response(LabIntegrationService.run_nightly_service_line_feed(request.data.get('business_date')))


class LabGLReconciliationView(APIView):
    """Laboratory & Radiology service-line figures vs GL for a YYYY-MM period"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        period = request.query_params.get('period') or timezone.now().strftime('%Y-%m')
        if not re.fullmatch(r'\d{4}-\d{2}', period):
            return error_response(AccountingDomainError('period must be YYYY-MM', code='VALIDATION_FAILED', status_code=422))
        return Response(LabIntegrationService.reconcile_to_gl(period))


class OutsourcedTestAccrualListView(APIView):
    """Outsourced test accruals, filterable by status and partner lab"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .models import OutsourcedTestAccrual
        qs = OutsourcedTestAccrual.objects.select_related('accrual_journal', 'vendor_bill').order_by('-business_date', 'requisition_no')
        if request.query_params.get('status'):
            qs = qs.filter(status=request.query_params['status'])
        if request.query_params.get('partner_lab'):
            qs = qs.filter(partner_lab__iexact=request.query_params['partner_lab'])
        return Response([{
            'id': str(a.id), 'requisition_no': a.requisition_no, 'partner_lab': a.partner_lab,
            'department': a.department_id, 'service_line': a.service_line, 'test_name': a.test_name,
            'cost': str(a.cost), 'business_date': str(a.business_date), 'status': a.status,
            'accrual_journal': a.accrual_journal.reference_no if a.accrual_journal else '',
            'accrual_posted': bool(a.accrual_journal and a.accrual_journal.status == 'posted'),
            'vendor_bill': a.vendor_bill.reference_no if a.vendor_bill else '',
        } for a in qs[:1000]])


# =============================================================================
# Phase 11 Views: Audit & Compliance
# =============================================================================

def _domain(fn):
    try:
        return Response(fn())
    except AccountingDomainError as exc:
        return error_response(exc)


class AuditorMeView(APIView):
    """Auditor's engagement, access window and chain status (read-only workspace header)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        def run():
            eng, grant = AuditComplianceService.auditor_scope(request.user)
            chain = AuditService.verify_integrity()
            AuditService.log_read(request.user, 'auditor_workspace', reference_no=eng.engagement_no if eng else '')
            return {
                'auditor': request.user.get_full_name() or request.user.username,
                'role': request.user.role,
                'engagement': {'engagement_no': eng.engagement_no, 'type': eng.type, 'auditor_firm': eng.auditor_firm,
                               'period_from': str(eng.period_from), 'period_to': str(eng.period_to),
                               'fieldwork_from': str(eng.fieldwork_from), 'fieldwork_to': str(eng.fieldwork_to)} if eng else None,
                'access': {'valid_from': grant.valid_from.isoformat(), 'valid_until': grant.valid_until.isoformat()} if grant else None,
                'chain': {k: chain[k] for k in ('status', 'valid', 'total_records', 'last_sequence')},
            }
        return _domain(run)


class AuditorPBCListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return _domain(lambda: AuditComplianceService.auditor_pbc_list(request.user))


class AuditorPBCEvidenceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk=None):
        return _domain(lambda: AuditComplianceService.auditor_pbc_evidence(request.user, str(pk)))


class AuditorControlsView(APIView):
    """Control violations and monitor coverage (IC-01..IC-08), read-only"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        def run():
            AuditComplianceService.auditor_scope(request.user)
            AuditService.log_read(request.user, 'controls')
            return {'coverage': AuditComplianceService.control_coverage(),
                    'violations': FinanceControllerService.list_control_violations()}
        return _domain(run)


class AuditorLogsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        keys = ('module', 'action', 'entity_type', 'entity_id', 'user', 'from', 'to', 'q')
        return _domain(lambda: AuditComplianceService.audit_logs(request.user, {k: request.query_params.get(k, '') for k in keys}))


class AuditorIntegrityView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        def run():
            AuditComplianceService.auditor_scope(request.user)
            AuditService.log_read(request.user, 'chain_integrity')
            return {'chain': AuditService.verify_integrity(), 'worm_exports': AuditComplianceService.verify_worm_exports()}
        return _domain(run)


class AuditorLedgerView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return _domain(lambda: AuditComplianceService.ledger(
            request.user, request.query_params.get('period', ''), request.query_params.get('account', '')))


class AuditorJournalTraceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk=None):
        return _domain(lambda: AuditComplianceService.trace_journal(request.user, str(pk)))


class AuditEngagementsView(APIView):
    """Finance Controller / CFO: audit engagements and auditor access grants"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .models import AuditEngagement
        def run():
            AuditComplianceService.require_governance(request.user)
            AuditComplianceService.ensure_seed_data()
            return [{'engagement_no': e.engagement_no, 'type': e.type, 'auditor_firm': e.auditor_firm, 'status': e.status,
                     'period_from': str(e.period_from), 'period_to': str(e.period_to),
                     'fieldwork_from': str(e.fieldwork_from), 'fieldwork_to': str(e.fieldwork_to),
                     'grants': [{'id': str(g.id), 'auditor': g.auditor.username, 'valid_from': g.valid_from.isoformat(),
                                 'valid_until': g.valid_until.isoformat(), 'active': g.is_active(),
                                 'revoked_at': g.revoked_at.isoformat() if g.revoked_at else ''} for g in e.grants.select_related('auditor')]}
                    for e in AuditEngagement.objects.order_by('-fieldwork_from')]
        return _domain(run)

    def post(self, request):
        def run():
            e = AuditComplianceService.create_engagement(request.user, request.data)
            return {'engagement_no': e.engagement_no, 'auditor_firm': e.auditor_firm}
        return _domain(run)


class AuditorGrantView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        def run():
            g = AuditComplianceService.grant_access(request.user, str(pk), request.data.get('auditor_username', ''))
            return {'id': str(g.id), 'auditor': g.auditor.username, 'valid_until': g.valid_until.isoformat()}
        return _domain(run)


class AuditorGrantRevokeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        return _domain(lambda: {'id': str(pk), 'revoked_at': AuditComplianceService.revoke_access(request.user, pk).revoked_at.isoformat()})


class AuditRequestAttachEvidenceView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        def run():
            d = AuditComplianceService.attach_evidence(request.user, str(pk), request.data.get('file_name', ''),
                                                       request.data.get('file_url', ''), request.data.get('checksum', ''))
            return {'document_id': str(d.id), 'file_name': d.file_name}
        return _domain(run)


class AuditChainVerifyView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        def run():
            AuditComplianceService.require_governance(request.user)
            return AuditComplianceService.run_chain_verification()
        return _domain(run)


class AuditWormExportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        def run():
            AuditComplianceService.require_governance(request.user)
            return AuditComplianceService.verify_worm_exports()
        return _domain(run)

    def post(self, request):
        def run():
            AuditComplianceService.require_governance(request.user)
            return AuditComplianceService.export_worm(request.data.get('date'), request.user)
        return _domain(run)


class ControlMonitorRunView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(AuditComplianceService.control_coverage())

    def post(self, request):
        def run():
            AuditComplianceService.require_governance(request.user)
            return AuditComplianceService.run_control_monitor()
        return _domain(run)


class RetentionStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(AuditComplianceService.retention_status())


# =============================================================================
# Phase 12: End-to-End Testing & Simulation Views
# =============================================================================

class MonthReplaySimulationView(APIView):
    """Executes full-month departmental transaction replay simulation (Sep 1-30)"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        def run():
            period = request.data.get('period', '2026-09')
            return EndToEndSimulationService.simulate_full_month_replay(period=period, user=request.user)
        return _domain(run)


class MonthCloseSequenceView(APIView):
    """Executes the 10-step month-end and quarter closing sequence (§6)"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        def run():
            user_cfo = EndToEndSimulationService.get_or_create_actor('cfo_sim', RoleType.CFO, 'Meera Rao')
            return EndToEndSimulationService.execute_month_end_closing_sequence(user_controller=request.user, user_cfo=user_cfo)
        return _domain(run)


class AcceptanceInvariantsView(APIView):
    """Verifies all 4 Core Acceptance Invariants (Double-entry, Subledger tie, Zero orphan, Audit chain)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        def run():
            period = request.query_params.get('period', '2026-09')
            return EndToEndSimulationService.verify_acceptance_invariants(period=period)
        return _domain(run)


class OutageReplaySimulationView(APIView):
    """Simulates 30-min Accounts downtime with replay and duplicate resilience (NF-03)"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        def run():
            return EndToEndSimulationService.simulate_accounts_outage_replay()
        return _domain(run)


class UATSignOffReportView(APIView):
    """Returns formal UAT sign-off matrix, defect log verification, and release readiness"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        def run():
            return EndToEndSimulationService.generate_uat_signoff_report()
        return _domain(run)


