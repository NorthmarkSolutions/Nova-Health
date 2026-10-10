from rest_framework import serializers
from .models import (
    ChartOfAccount, CostCenter, BankAccount, DelegationLimit,
    FinancialEvent, Journal, JournalLine, GLEntry, GLBalance,
    ApprovalRequest, ApprovalStep, Escalation, AccountTask,
    PeriodLock, AccountAuditLog, AccountDocument, Refund, EventMapping,
    IPDUnbilledTracker, ConsultantShareBatch, ConsultantShareItem,
    OTImplantUsageRegister, OTImplantConsignmentMatch
)

class ChartOfAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChartOfAccount
        fields = '__all__'

class CostCenterSerializer(serializers.ModelSerializer):
    class Meta:
        model = CostCenter
        fields = '__all__'

class BankAccountSerializer(serializers.ModelSerializer):
    gl_account_name = serializers.CharField(source='gl_account.name', read_only=True)

    class Meta:
        model = BankAccount
        fields = '__all__'

class DelegationLimitSerializer(serializers.ModelSerializer):
    class Meta:
        model = DelegationLimit
        fields = '__all__'

class PeriodLockSerializer(serializers.ModelSerializer):
    class Meta:
        model = PeriodLock
        fields = '__all__'

class JournalLineSerializer(serializers.ModelSerializer):
    account_code = serializers.CharField(source='account.code', read_only=True)
    account_name = serializers.CharField(source='account.name', read_only=True)
    cost_center_code = serializers.CharField(source='cost_center.code', read_only=True)

    class Meta:
        model = JournalLine
        fields = '__all__'

class JournalSerializer(serializers.ModelSerializer):
    lines = JournalLineSerializer(many=True, read_only=True)
    maker_name = serializers.SerializerMethodField()

    class Meta:
        model = Journal
        fields = '__all__'

    def get_maker_name(self, obj):
        if obj.maker:
            return obj.maker.get_full_name() or obj.maker.username
        return 'System'

class ApprovalStepSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = ApprovalStep
        fields = '__all__'

    def get_actor_name(self, obj):
        return obj.actor.get_full_name() or obj.actor.username

class ApprovalRequestSerializer(serializers.ModelSerializer):
    steps = ApprovalStepSerializer(many=True, read_only=True)
    maker_name = serializers.SerializerMethodField()

    class Meta:
        model = ApprovalRequest
        fields = '__all__'

    def get_maker_name(self, obj):
        return obj.maker.get_full_name() or obj.maker.username

class EscalationSerializer(serializers.ModelSerializer):
    raised_by_name = serializers.CharField(source='raised_by.username', read_only=True)
    raised_by_full_name = serializers.SerializerMethodField()

    def get_raised_by_full_name(self, obj):
        return obj.raised_by.get_full_name() or obj.raised_by.username

    class Meta:
        model = Escalation
        fields = '__all__'

class AccountTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccountTask
        fields = '__all__'

class AccountAuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccountAuditLog
        fields = '__all__'

class AccountDocumentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.username', read_only=True)

    class Meta:
        model = AccountDocument
        fields = '__all__'

class FinancialEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinancialEvent
        fields = '__all__'


# =============================================================================
# Phase 2 Serializers (Receivables, Payables, Bank, Expense, GST)
# =============================================================================

from .models import (
    Receivable, Receipt, CollectionCase, CollectionFollowup, PromiseToPay, WriteOffRequest,
    VendorBill, VendorBillItem, ThreeWayMatch, BankStatement, BankTransaction, ReconciliationMatch,
    ExpenseRequest, GSTBatch, GSTBatchLine, GSTException, DailyCloseRun, CloseChecklistItem
)

class ReceivableSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)

    class Meta:
        model = Receivable
        fields = '__all__'

class ReceiptSerializer(serializers.ModelSerializer):
    class Meta:
        model = Receipt
        fields = '__all__'

class CollectionFollowupSerializer(serializers.ModelSerializer):
    logged_by_name = serializers.CharField(source='logged_by.username', read_only=True)

    class Meta:
        model = CollectionFollowup
        fields = '__all__'

class CollectionCaseSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    followups = CollectionFollowupSerializer(many=True, read_only=True)

    class Meta:
        model = CollectionCase
        fields = '__all__'

class VendorBillItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorBillItem
        fields = '__all__'

class ThreeWayMatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = ThreeWayMatch
        fields = '__all__'

class VendorBillSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source='vendor.name', read_only=True)
    items = VendorBillItemSerializer(many=True, read_only=True)
    three_way_match = ThreeWayMatchSerializer(read_only=True)
    maker_name = serializers.CharField(source='maker.username', read_only=True)

    class Meta:
        model = VendorBill
        fields = '__all__'

class BankTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankTransaction
        fields = '__all__'

class ReconciliationMatchSerializer(serializers.ModelSerializer):
    proposed_by_name = serializers.CharField(source='proposed_by.username', read_only=True)

    class Meta:
        model = ReconciliationMatch
        fields = '__all__'

class ExpenseRequestSerializer(serializers.ModelSerializer):
    maker_name = serializers.CharField(source='maker.username', read_only=True)
    cost_center_code = serializers.CharField(source='cost_center.code', read_only=True)

    class Meta:
        model = ExpenseRequest
        fields = '__all__'

class GSTBatchLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = GSTBatchLine
        fields = '__all__'

class GSTExceptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = GSTException
        fields = '__all__'

class GSTBatchSerializer(serializers.ModelSerializer):
    lines = GSTBatchLineSerializer(many=True, read_only=True)
    exceptions = GSTExceptionSerializer(many=True, read_only=True)
    prepared_by_name = serializers.SerializerMethodField()
    reviewed_by_name = serializers.SerializerMethodField()

    def get_prepared_by_name(self, obj):
        return obj.prepared_by.get_full_name() or obj.prepared_by.username

    def get_reviewed_by_name(self, obj):
        return (obj.reviewed_by.get_full_name() or obj.reviewed_by.username) if obj.reviewed_by else ''

    class Meta:
        model = GSTBatch
        fields = '__all__'


class WriteOffRequestSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    receivable_ref = serializers.CharField(source='receivable.reference_no', read_only=True)

    class Meta:
        model = WriteOffRequest
        fields = '__all__'


class DailyCloseRunSerializer(serializers.ModelSerializer):
    run_by_name = serializers.CharField(source='run_by.username', read_only=True)
    locked_by_name = serializers.CharField(source='locked_by.username', read_only=True)

    class Meta:
        model = DailyCloseRun
        fields = '__all__'


class CloseChecklistItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = CloseChecklistItem
        fields = '__all__'


# =============================================================================
# Phase 4 Serializers (Manager, Budgets, Exceptions, Reviews)
# =============================================================================

from .models import Budget, FinancialException, WeeklyFinancialReview

class BudgetSerializer(serializers.ModelSerializer):
    cost_center_code = serializers.CharField(source='cost_center.code', read_only=True)

    class Meta:
        model = Budget
        fields = '__all__'


class FinancialExceptionSerializer(serializers.ModelSerializer):
    owner_user_name = serializers.CharField(source='owner_user.username', read_only=True)

    class Meta:
        model = FinancialException
        fields = '__all__'


class WeeklyFinancialReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = WeeklyFinancialReview
        fields = '__all__'


# =============================================================================
# Phase 5 Serializers (Finance Controller: Periods, Payments, Bank, Statements, Tax, Controls, Policies, Audit)
# =============================================================================

from .models import (
    PeriodReopenRequest, PaymentBatch, BankReconciliation, FinancialStatement,
    StatementLine, StatementFlag, TaxReturn, ControlViolation, PolicyMaster,
    AuditRequest, AuditObservation, QuarterCloseItem, HighRiskItem
)

class PeriodReopenRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = PeriodReopenRequest
        fields = '__all__'


class PaymentBatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentBatch
        fields = '__all__'


class BankReconciliationSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankReconciliation
        fields = '__all__'


class StatementLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = StatementLine
        fields = '__all__'


class FinancialStatementSerializer(serializers.ModelSerializer):
    lines = StatementLineSerializer(many=True, read_only=True)

    class Meta:
        model = FinancialStatement
        fields = '__all__'


class StatementFlagSerializer(serializers.ModelSerializer):
    class Meta:
        model = StatementFlag
        fields = '__all__'


class TaxReturnSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaxReturn
        fields = '__all__'


class ControlViolationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ControlViolation
        fields = '__all__'


class PolicyMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = PolicyMaster
        fields = '__all__'


class AuditRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditRequest
        fields = '__all__'


class AuditObservationSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditObservation
        fields = '__all__'


class QuarterCloseItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuarterCloseItem
        fields = '__all__'


class HighRiskItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = HighRiskItem
        fields = '__all__'


# =============================================================================
# Phase 6 Serializers (Chief Financial Officer / Strategy)
# =============================================================================

from .models import (
    DebtFacility, DebtSchedule, ServiceLineMetric,
    FinancialForecast, ForecastLine, CapexRequest,
    StrategicApproval, GrowthOpportunity, StrategicRisk,
    ExecutiveAlert, BoardReport, ExecutiveDecision,
    CfoDirective, BudgetStrategyProposal
)


class DebtScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = DebtSchedule
        fields = '__all__'


class DebtFacilitySerializer(serializers.ModelSerializer):
    schedules = DebtScheduleSerializer(many=True, read_only=True)

    class Meta:
        model = DebtFacility
        fields = '__all__'


class ServiceLineMetricSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceLineMetric
        fields = '__all__'


class ForecastLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = ForecastLine
        fields = '__all__'


class FinancialForecastSerializer(serializers.ModelSerializer):
    lines = ForecastLineSerializer(many=True, read_only=True)

    class Meta:
        model = FinancialForecast
        fields = '__all__'


class CapexRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = CapexRequest
        fields = '__all__'


class StrategicApprovalSerializer(serializers.ModelSerializer):
    class Meta:
        model = StrategicApproval
        fields = '__all__'


class GrowthOpportunitySerializer(serializers.ModelSerializer):
    class Meta:
        model = GrowthOpportunity
        fields = '__all__'


class StrategicRiskSerializer(serializers.ModelSerializer):
    rating = serializers.CharField(read_only=True)

    class Meta:
        model = StrategicRisk
        fields = '__all__'


class ExecutiveAlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExecutiveAlert
        fields = '__all__'


class BoardReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = BoardReport
        fields = '__all__'


class ExecutiveDecisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExecutiveDecision
        fields = '__all__'


class CfoDirectiveSerializer(serializers.ModelSerializer):
    class Meta:
        model = CfoDirective
        fields = '__all__'


class BudgetStrategyProposalSerializer(serializers.ModelSerializer):
    class Meta:
        model = BudgetStrategyProposal
        fields = '__all__'


class RefundSerializer(serializers.ModelSerializer):
    class Meta:
        model = Refund
        fields = '__all__'


class EventMappingSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventMapping
        fields = '__all__'


class IPDUnbilledTrackerSerializer(serializers.ModelSerializer):
    class Meta:
        model = IPDUnbilledTracker
        fields = '__all__'


class ConsultantShareItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConsultantShareItem
        fields = '__all__'


class ConsultantShareBatchSerializer(serializers.ModelSerializer):
    items = ConsultantShareItemSerializer(many=True, read_only=True)

    class Meta:
        model = ConsultantShareBatch
        fields = '__all__'


class OTImplantUsageRegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = OTImplantUsageRegister
        fields = '__all__'


class OTImplantConsignmentMatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = OTImplantConsignmentMatch
        fields = '__all__'






