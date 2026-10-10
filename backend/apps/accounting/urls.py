from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    WorkloadView, ExecutiveDashboardView, COAListView, CostCenterListView,
    DelegationLimitsView, PeriodListView, JournalViewSet,
    ApprovalRequestViewSet, AuditLogViewSet, AccountDocumentViewSet,
    FinancialEventViewSet, VendorBillViewSet, BankTransactionViewSet,
    ReconciliationMatchViewSet, ReceivableViewSet, CollectionPipelineView,
    WriteOffRequestViewSet, ExpenseRequestViewSet, GSTBatchViewSet,
    CollectionCaseViewSet, EscalationViewSet, SupervisorDashboardView,
    DailyCloseDetailView, DailyCloseRunView, DailyCloseLockView,
    DailyCloseEscalateView, TeamPerformanceView,
    ManagerDashboardView, AnalyticsTrendsView, ReceivablesSummaryView,
    ReceivablesPayersView, ReceivablePriorityView, ReceivableEscalateCollectionView,
    ReceivableWriteOffDecisionView, PayablesBillsView, HighValueDecisionView,
    PayablesSummaryView, CashflowProjectionView, HighValueTransactionsView,
    HighValueFlagView, DepartmentBudgetsView, BudgetExplanationRequestView,
    BudgetEscalateOverrunView, CostCenterAnalyticsView, FinancialExceptionViewSet,
    WeeklyFinancialReviewView, WeeklyFinancialReviewShareView,
    MonthEndReadinessView, MonthEndChecklistOwnerView, MonthEndEscalateDelaysView,
    DepartmentPerformanceView,
    # Phase 5: Finance Controller Views
    ControllerDashboardView, MonthEndCloseView, MonthEndCloseApproveView,
    MonthEndCloseDelayView, MonthEndCloseEscalateView,
    QuarterEndCloseView, QuarterEndItemReviewView, QuarterEndCloseApproveView, QuarterEndCloseLockView,
    YearEndCloseView, YearEndCloseActView,
    PeriodLockActionView, PeriodReopenDecisionView,
    PaymentBatchListView, PaymentBatchChecksView, PaymentBatchReleaseView,
    PaymentBatchHoldView, PaymentBatchReturnView, PaymentBatchCosignView,
    BankAccountListView, BankAccountFreezeView,
    BankReconciliationListView, BankReconciliationApproveView, BankReconciliationReturnView,
    FinancialStatementDetailView, FinancialStatementFlagView, FinancialStatementApproveView,
    TaxReturnsListView, TaxReturnApproveView, TaxReturnReturnView, TaxReturnEscalateView, TaxReturnExportView,
    ControlViolationsListView, ControlViolationActionView,
    HighRiskItemsListView, HighRiskItemDecisionView,
    PoliciesListView, PolicyChangeDecisionView, PolicyReviewView,
    AuditRequestsListView, AuditRequestReadyView, AuditRequestShareView, AuditRequestEvidenceView,
    AuditObservationsListView, AuditObservationActView,
    # Phase 6: Chief Financial Officer (CFO) Strategy Views
    CfoDashboardView, CfoProfitLossView, CfoCashFlowView, CfoBalanceSheetView,
    CfoDeptProfitabilityView, CfoTurnaroundPlanView, CfoServiceLinesView,
    CfoBudgetStrategyView, CfoBudgetStrategyDecisionView, CfoForecastView,
    CfoCapexListView, CfoCapexDecisionView, CfoStrategicApprovalsView,
    CfoStrategicApprovalDecisionView, CfoGrowthOpportunitiesView,
    CfoGrowthOpportunityDecisionView, CfoStrategicRisksView,
    CfoStrategicRiskDecisionView, CfoExecutiveAlertsView, CfoExecutiveAlertActView,
    CfoBoardReportView, CfoBoardReportApproveView, CfoBoardReportExportView,
    CfoBoardSectionToggleView, CfoExecutiveDecisionsView,
    # Phase 7: Billing Integration Views
    RefundViewSet, DayEndReconciliationView,
    # Phase 8: Pharmacy Integration Views
    PharmacyReconciliationView, PharmacyValuationView,
    PharmacyWriteOffDecisionView, VendorBankVerificationView,
    # Phase 9: Clinical Integration Views
    UnbilledRevenueSummaryView, UnbilledAccrualGenerateView,
    AutoReversalAccrualView, ConsultantShareBatchViewSet,
    OTImplantMatchingView,
    # Phase 10: Lab Integration Views
    LabAccrualBatchView, LabPartnerInvoiceMatchView, LabServiceLineFeedView,
    LabGLReconciliationView, OutsourcedTestAccrualListView,
    # Phase 11: Audit & Compliance Views
    AuditorMeView, AuditorPBCListView, AuditorPBCEvidenceView, AuditorControlsView, AuditorLogsView,
    AuditorIntegrityView, AuditorLedgerView, AuditorJournalTraceView, AuditEngagementsView,
    AuditorGrantView, AuditorGrantRevokeView, AuditRequestAttachEvidenceView, AuditChainVerifyView,
    AuditWormExportView, ControlMonitorRunView, RetentionStatusView,
    # Phase 12: Simulation & Acceptance Views
    MonthReplaySimulationView, MonthCloseSequenceView,
    AcceptanceInvariantsView, OutageReplaySimulationView, UATSignOffReportView
)


router = DefaultRouter()
router.register(r'journals', JournalViewSet, basename='accounts-journal')
router.register(r'approval-requests', ApprovalRequestViewSet, basename='accounts-approval')
router.register(r'audit', AuditLogViewSet, basename='accounts-audit')
router.register(r'documents', AccountDocumentViewSet, basename='accounts-documents')
router.register(r'events', FinancialEventViewSet, basename='accounts-events')
router.register(r'vendor-bills', VendorBillViewSet, basename='accounts-vendor-bills')
router.register(r'bank-transactions', BankTransactionViewSet, basename='accounts-bank-transactions')
router.register(r'reconciliation/matches', ReconciliationMatchViewSet, basename='accounts-recon-matches')
router.register(r'receivables', ReceivableViewSet, basename='accounts-receivables')
router.register(r'write-offs', WriteOffRequestViewSet, basename='accounts-write-offs')
router.register(r'refunds', RefundViewSet, basename='accounts-refunds')
router.register(r'expense-requests', ExpenseRequestViewSet, basename='accounts-expense-requests')
router.register(r'gst/batches', GSTBatchViewSet, basename='accounts-gst-batches')
router.register(r'escalations', EscalationViewSet, basename='accounts-escalations')
router.register(r'collections', CollectionCaseViewSet, basename='accounts-collections')
router.register(r'exceptions', FinancialExceptionViewSet, basename='accounts-exceptions')
router.register(r'consultant-batches', ConsultantShareBatchViewSet, basename='accounts-consultant-batches')


def route(pattern, view, name, kwargs=None):
    """Matches the route with or without a trailing slash (APPEND_SLASH is off, the SPA client adds one)."""
    kw = kwargs or {}
    return [path(pattern, view, kw, name=name), path(f'{pattern}/', view, kw)]


# Explicit routes are listed before the router so that e.g. receivables/summary/
# is not captured by the receivables detail route as pk='summary'.
urlpatterns = [
    *route('integration/reconcile-day-end', DayEndReconciliationView.as_view(), 'accounts-reconcile-day-end'),
    *route('me/workload', WorkloadView.as_view(), 'accounts-workload'),
    *route('me/dashboard', ExecutiveDashboardView.as_view(), 'accounts-dashboard-executive'),
    *route('supervisor/dashboard', SupervisorDashboardView.as_view(), 'accounts-dashboard-supervisor'),
    *route('manager/dashboard', ManagerDashboardView.as_view(), 'accounts-dashboard-manager'),
    *route('controller/dashboard', ControllerDashboardView.as_view(), 'accounts-dashboard-controller'),
    *route('coa', COAListView.as_view(), 'accounts-coa'),
    *route('cost-centers', CostCenterListView.as_view(), 'accounts-cost-centers'),
    *route('delegation-limits', DelegationLimitsView.as_view(), 'accounts-delegation-limits'),
    *route('periods', PeriodListView.as_view(), 'accounts-periods'),
    *route('collections/pipeline', CollectionPipelineView.as_view(), 'accounts-collections-pipeline'),
    *route('close/daily/<str:date>', DailyCloseDetailView.as_view(), 'accounts-daily-close-detail'),
    *route('close/daily/<str:date>/run', DailyCloseRunView.as_view(), 'accounts-daily-close-run'),
    *route('close/daily/<str:date>/lock', DailyCloseLockView.as_view(), 'accounts-daily-close-lock'),
    *route('close/daily/<str:date>/escalate', DailyCloseEscalateView.as_view(), 'accounts-daily-close-escalate'),
    *route('team/performance', TeamPerformanceView.as_view(), 'accounts-team-performance'),
    *route('analytics/trends', AnalyticsTrendsView.as_view(), 'accounts-analytics-trends'),
    *route('receivables/summary', ReceivablesSummaryView.as_view(), 'accounts-receivables-summary'),
    *route('receivables/payers', ReceivablesPayersView.as_view(), 'accounts-receivables-payers'),
    *route('receivables/<str:pk>/priority', ReceivablePriorityView.as_view(), 'accounts-receivable-priority'),
    *route('receivables/<str:pk>/escalate-collection', ReceivableEscalateCollectionView.as_view(), 'accounts-receivable-escalate'),
    *route('receivables/<str:pk>/write-off/decision', ReceivableWriteOffDecisionView.as_view(), 'accounts-receivable-write-off-decision'),
    *route('payables/summary', PayablesSummaryView.as_view(), 'accounts-payables-summary'),
    *route('payables/bills', PayablesBillsView.as_view(), 'accounts-payables-bills'),
    *route('cashflow/projection', CashflowProjectionView.as_view(), 'accounts-cashflow-projection'),
    *route('transactions/high-value', HighValueTransactionsView.as_view(), 'accounts-transactions-high-value'),
    *route('transactions/high-value/<str:pk>/flag-for-review', HighValueFlagView.as_view(), 'accounts-transactions-flag'),
    *route('transactions/high-value/<str:pk>/decision', HighValueDecisionView.as_view(), 'accounts-transactions-decision'),
    *route('budgets/departments', DepartmentBudgetsView.as_view(), 'accounts-budgets-departments'),
    *route('budgets/<str:pk>/explanation-requests', BudgetExplanationRequestView.as_view(), 'accounts-budgets-explanation'),
    *route('budgets/<str:pk>/escalate-overrun', BudgetEscalateOverrunView.as_view(), 'accounts-budgets-escalate'),
    *route('analytics/cost-centers', CostCenterAnalyticsView.as_view(), 'accounts-analytics-cost-centers'),
    *route('reviews/weekly', WeeklyFinancialReviewView.as_view(), 'accounts-reviews-weekly'),
    *route('reviews/weekly/share', WeeklyFinancialReviewShareView.as_view(), 'accounts-reviews-weekly-share'),
    *route('close/monthly/<str:period>/readiness', MonthEndReadinessView.as_view(), 'accounts-monthend-readiness'),
    *route('close/monthly/<str:period>/checklist/<str:code>/owner', MonthEndChecklistOwnerView.as_view(), 'accounts-monthend-checklist-owner'),
    *route('close/monthly/<str:period>/escalate-delays', MonthEndEscalateDelaysView.as_view(), 'accounts-monthend-escalate-delays'),
    *route('analytics/departments', DepartmentPerformanceView.as_view(), 'accounts-analytics-departments'),

    # Phase 5: Finance Controller Endpoints
    *route('close/monthly/<str:period>', MonthEndCloseView.as_view(), 'accounts-close-monthly-detail'),
    *route('close/monthly/<str:period>/approve', MonthEndCloseApproveView.as_view(), 'accounts-close-monthly-approve'),
    *route('close/monthly/<str:period>/delay', MonthEndCloseDelayView.as_view(), 'accounts-close-monthly-delay'),
    *route('close/monthly/<str:period>/escalate', MonthEndCloseEscalateView.as_view(), 'accounts-close-monthly-escalate'),

    *route('close/quarterly/<str:q>', QuarterEndCloseView.as_view(), 'accounts-close-quarterly-detail'),
    *route('close/quarterly/<str:q>/items/<str:item_id>/review', QuarterEndItemReviewView.as_view(), 'accounts-close-quarterly-item-review'),
    *route('close/quarterly/<str:q>/approve', QuarterEndCloseApproveView.as_view(), 'accounts-close-quarterly-approve'),
    *route('close/quarterly/<str:q>/lock', QuarterEndCloseLockView.as_view(), 'accounts-close-quarterly-lock'),

    *route('close/yearly/<str:fy>', YearEndCloseView.as_view(), 'accounts-close-yearly-detail'),
    *route('close/yearly/<str:fy>/observations/<str:obs_id>/act', YearEndCloseActView.as_view(), 'accounts-close-yearly-obs-act'),

    *route('periods/<str:pk>/lock', PeriodLockActionView.as_view(), 'accounts-period-lock', kwargs={'action': 'lock'}),
    *route('periods/<str:pk>/reopen', PeriodLockActionView.as_view(), 'accounts-period-reopen', kwargs={'action': 'reopen'}),
    *route('periods/<str:pk>/reopen-requests/<str:rid>/decision', PeriodReopenDecisionView.as_view(), 'accounts-period-reopen-decision'),

    *route('payment-batches', PaymentBatchListView.as_view(), 'accounts-payment-batches'),
    *route('payment-batches/<str:pk>/checks', PaymentBatchChecksView.as_view(), 'accounts-payment-batch-checks'),
    *route('payment-batches/<str:pk>/release', PaymentBatchReleaseView.as_view(), 'accounts-payment-batch-release'),
    *route('payment-batches/<str:pk>/hold', PaymentBatchHoldView.as_view(), 'accounts-payment-batch-hold'),
    *route('payment-batches/<str:pk>/return', PaymentBatchReturnView.as_view(), 'accounts-payment-batch-return'),
    *route('payment-batches/<str:pk>/cosign', PaymentBatchCosignView.as_view(), 'accounts-payment-batch-cosign'),

    *route('bank-accounts', BankAccountListView.as_view(), 'accounts-bank-accounts'),
    *route('bank-accounts/<str:pk>/freeze', BankAccountFreezeView.as_view(), 'accounts-bank-account-freeze'),

    *route('reconciliations', BankReconciliationListView.as_view(), 'accounts-reconciliations'),
    *route('reconciliations/<str:pk>/approve', BankReconciliationApproveView.as_view(), 'accounts-reconciliation-approve'),
    *route('reconciliations/<str:pk>/return', BankReconciliationReturnView.as_view(), 'accounts-reconciliation-return'),

    *route('statements/<str:st_type>', FinancialStatementDetailView.as_view(), 'accounts-statement-detail'),
    *route('statements/<str:st_type>/flags', FinancialStatementFlagView.as_view(), 'accounts-statement-flag'),
    *route('statements/<str:st_type>/approve', FinancialStatementApproveView.as_view(), 'accounts-statement-approve'),

    *route('tax/returns', TaxReturnsListView.as_view(), 'accounts-tax-returns'),
    *route('tax/returns/<str:pk>/approve', TaxReturnApproveView.as_view(), 'accounts-tax-return-approve'),
    *route('tax/returns/<str:pk>/return', TaxReturnReturnView.as_view(), 'accounts-tax-return-return'),
    *route('tax/returns/<str:pk>/escalate', TaxReturnEscalateView.as_view(), 'accounts-tax-return-escalate'),
    *route('tax/returns/<str:pk>/export', TaxReturnExportView.as_view(), 'accounts-tax-return-export'),

    *route('controls/violations', ControlViolationsListView.as_view(), 'accounts-control-violations'),
    *route('controls/violations/<str:pk>/action', ControlViolationActionView.as_view(), 'accounts-control-violation-action'),

    *route('high-risk', HighRiskItemsListView.as_view(), 'accounts-high-risk-items'),
    *route('high-risk/<str:pk>/decision', HighRiskItemDecisionView.as_view(), 'accounts-high-risk-decision'),

    *route('policies', PoliciesListView.as_view(), 'accounts-policies'),
    *route('policies/<str:pk>/changes/<str:cid>/decision', PolicyChangeDecisionView.as_view(), 'accounts-policy-change-decision'),
    *route('policies/<str:pk>/review', PolicyReviewView.as_view(), 'accounts-policy-review'),

    *route('audit/requests', AuditRequestsListView.as_view(), 'accounts-audit-requests'),
    *route('audit/requests/<str:pk>/ready', AuditRequestReadyView.as_view(), 'accounts-audit-request-ready'),
    *route('audit/requests/<str:pk>/share', AuditRequestShareView.as_view(), 'accounts-audit-request-share'),
    *route('audit/requests/<str:pk>/request-evidence', AuditRequestEvidenceView.as_view(), 'accounts-audit-request-evidence'),

    *route('audit/observations', AuditObservationsListView.as_view(), 'accounts-audit-observations'),
    *route('audit/observations/<str:pk>/act', AuditObservationActView.as_view(), 'accounts-audit-observation-act'),

    # Phase 6: Chief Financial Officer (CFO) Strategy routes
    *route('cfo/dashboard', CfoDashboardView.as_view(), 'accounts-cfo-dashboard'),
    *route('cfo/pl', CfoProfitLossView.as_view(), 'accounts-cfo-pl'),
    *route('cfo/cash-flow', CfoCashFlowView.as_view(), 'accounts-cfo-cash-flow'),
    *route('cfo/balance-sheet', CfoBalanceSheetView.as_view(), 'accounts-cfo-balance-sheet'),
    *route('cfo/departments/profitability', CfoDeptProfitabilityView.as_view(), 'accounts-cfo-dept-profitability'),
    *route('cfo/departments/<str:dept>/turnaround', CfoTurnaroundPlanView.as_view(), 'accounts-cfo-turnaround-plan'),
    *route('cfo/services', CfoServiceLinesView.as_view(), 'accounts-cfo-services'),
    *route('cfo/budgets/strategy', CfoBudgetStrategyView.as_view(), 'accounts-cfo-budgets-strategy'),
    *route('cfo/budgets/strategy/decide', CfoBudgetStrategyDecisionView.as_view(), 'accounts-cfo-budgets-strategy-decide'),
    *route('cfo/forecast', CfoForecastView.as_view(), 'accounts-cfo-forecast'),
    *route('cfo/capex', CfoCapexListView.as_view(), 'accounts-cfo-capex'),
    *route('cfo/capex/<str:pk>/decide', CfoCapexDecisionView.as_view(), 'accounts-cfo-capex-decide'),
    *route('cfo/approvals', CfoStrategicApprovalsView.as_view(), 'accounts-cfo-approvals'),
    *route('cfo/approvals/<str:pk>/decide', CfoStrategicApprovalDecisionView.as_view(), 'accounts-cfo-approvals-decide'),
    *route('cfo/growth', CfoGrowthOpportunitiesView.as_view(), 'accounts-cfo-growth'),
    *route('cfo/growth/<str:pk>/decide', CfoGrowthOpportunityDecisionView.as_view(), 'accounts-cfo-growth-decide'),
    *route('cfo/risks', CfoStrategicRisksView.as_view(), 'accounts-cfo-risks'),
    *route('cfo/risks/<str:pk>/decide', CfoStrategicRiskDecisionView.as_view(), 'accounts-cfo-risks-decide'),
    *route('cfo/alerts', CfoExecutiveAlertsView.as_view(), 'accounts-cfo-alerts'),
    *route('cfo/alerts/<str:pk>/action', CfoExecutiveAlertActView.as_view(), 'accounts-cfo-alerts-action'),
    *route('cfo/board-report', CfoBoardReportView.as_view(), 'accounts-cfo-board-report'),
    *route('cfo/board-report/approve', CfoBoardReportApproveView.as_view(), 'accounts-cfo-board-report-approve'),
    *route('cfo/board-report/export', CfoBoardReportExportView.as_view(), 'accounts-cfo-board-report-export'),
    *route('cfo/board-report/section/toggle', CfoBoardSectionToggleView.as_view(), 'accounts-cfo-board-section-toggle'),
    *route('cfo/decisions', CfoExecutiveDecisionsView.as_view(), 'accounts-cfo-decisions'),

    # Phase 8: Pharmacy Integration Routes
    *route('integration/reconcile-pharmacy-stock', PharmacyReconciliationView.as_view(), 'accounts-reconcile-pharmacy-stock'),
    *route('integration/pharmacy-valuation', PharmacyValuationView.as_view(), 'accounts-pharmacy-valuation'),
    *route('integration/writeoff-decision', PharmacyWriteOffDecisionView.as_view(), 'accounts-writeoff-decision'),
    *route('integration/writeoff-decision/<str:pk>', PharmacyWriteOffDecisionView.as_view(), 'accounts-writeoff-decision-pk'),
    *route('integration/verify-vendor-bank', VendorBankVerificationView.as_view(), 'accounts-verify-vendor-bank'),
    *route('integration/verify-vendor-bank/<str:pk>', VendorBankVerificationView.as_view(), 'accounts-verify-vendor-bank-pk'),

    # Phase 9: Clinical Integration Routes
    *route('integration/unbilled-revenue-summary', UnbilledRevenueSummaryView.as_view(), 'accounts-unbilled-revenue-summary'),
    *route('integration/generate-unbilled-accrual', UnbilledAccrualGenerateView.as_view(), 'accounts-generate-unbilled-accrual'),
    *route('integration/execute-accrual-reversal', AutoReversalAccrualView.as_view(), 'accounts-execute-accrual-reversal'),
    *route('integration/match-ot-implant', OTImplantMatchingView.as_view(), 'accounts-match-ot-implant'),
    *route('integration/match-ot-implant/<str:pk>', OTImplantMatchingView.as_view(), 'accounts-match-ot-implant-pk'),

    # Phase 10: Lab Integration Routes
    *route('integration/lab/accruals', OutsourcedTestAccrualListView.as_view(), 'accounts-lab-accruals'),
    *route('integration/lab/accrual-batch', LabAccrualBatchView.as_view(), 'accounts-lab-accrual-batch'),
    *route('integration/lab/match-invoice/<str:pk>', LabPartnerInvoiceMatchView.as_view(), 'accounts-lab-match-invoice'),
    *route('integration/lab/service-line-feed', LabServiceLineFeedView.as_view(), 'accounts-lab-service-line-feed'),
    *route('integration/lab/reconciliation', LabGLReconciliationView.as_view(), 'accounts-lab-reconciliation'),

    # Phase 11: Auditor (read-only, time-boxed) — the only Accounts routes auditors may call
    *route('auditor/me', AuditorMeView.as_view(), 'accounts-auditor-me'),
    *route('auditor/pbc', AuditorPBCListView.as_view(), 'accounts-auditor-pbc'),
    *route('auditor/pbc/<str:pk>/evidence', AuditorPBCEvidenceView.as_view(), 'accounts-auditor-pbc-evidence'),
    *route('auditor/controls', AuditorControlsView.as_view(), 'accounts-auditor-controls'),
    *route('auditor/logs', AuditorLogsView.as_view(), 'accounts-auditor-logs'),
    *route('auditor/integrity', AuditorIntegrityView.as_view(), 'accounts-auditor-integrity'),
    *route('auditor/ledger', AuditorLedgerView.as_view(), 'accounts-auditor-ledger'),
    *route('auditor/trace/<str:pk>', AuditorJournalTraceView.as_view(), 'accounts-auditor-trace'),

    # Phase 11: Audit governance (Finance Controller / CFO)
    *route('audit/engagements', AuditEngagementsView.as_view(), 'accounts-audit-engagements'),
    *route('audit/engagements/<str:pk>/grants', AuditorGrantView.as_view(), 'accounts-audit-grant'),
    *route('audit/grants/<str:pk>/revoke', AuditorGrantRevokeView.as_view(), 'accounts-audit-grant-revoke'),
    *route('audit/requests/<str:pk>/evidence', AuditRequestAttachEvidenceView.as_view(), 'accounts-audit-request-attach'),
    *route('audit/chain/verify', AuditChainVerifyView.as_view(), 'accounts-audit-chain-verify'),
    *route('audit/worm-exports', AuditWormExportView.as_view(), 'accounts-audit-worm-exports'),
    *route('controls/monitor', ControlMonitorRunView.as_view(), 'accounts-controls-monitor'),
    *route('audit/retention', RetentionStatusView.as_view(), 'accounts-audit-retention'),

    # Phase 12: End-to-End Testing & Simulation
    *route('simulation/full-month-replay', MonthReplaySimulationView.as_view(), 'accounts-sim-month-replay'),
    *route('simulation/close-sequence', MonthCloseSequenceView.as_view(), 'accounts-sim-close-sequence'),
    *route('simulation/invariants', AcceptanceInvariantsView.as_view(), 'accounts-sim-invariants'),
    *route('simulation/outage-replay', OutageReplaySimulationView.as_view(), 'accounts-sim-outage-replay'),
    *route('simulation/uat-signoff', UATSignOffReportView.as_view(), 'accounts-sim-uat-signoff'),

    path('', include(router.urls)),
]

