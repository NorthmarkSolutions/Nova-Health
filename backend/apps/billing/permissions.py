from rest_framework.permissions import BasePermission, SAFE_METHODS
from apps.accounts.models import RoleType

# Every billing endpoint requires an authenticated user: billing data is patient financial data and is never
# served anonymously. Superusers and Django staff accounts pass every check.

CASHIER_OR_ABOVE_ROLES = [
    RoleType.CASHIER,
    RoleType.BILLING_SUPERVISOR,
    RoleType.BILLING_ADMIN,
    RoleType.BILLING_MANAGER,
    RoleType.HOSPITAL_ADMIN,
    RoleType.SUPER_ADMIN,
]

SUPERVISOR_OR_ABOVE_ROLES = [
    RoleType.BILLING_SUPERVISOR,
    RoleType.BILLING_ADMIN,
    RoleType.BILLING_MANAGER,
    RoleType.HOSPITAL_ADMIN,
    RoleType.SUPER_ADMIN,
]

ADMIN_OR_ABOVE_ROLES = [
    RoleType.BILLING_ADMIN,
    RoleType.BILLING_MANAGER,
    RoleType.HOSPITAL_ADMIN,
    RoleType.SUPER_ADMIN,
]

# Finance and internal audit oversight: may read billing data but never collect, discount, refund or change masters.
READ_ONLY_BILLING_ROLES = [
    RoleType.FINANCE_MANAGER,
    RoleType.INTERNAL_AUDITOR,
]


def _authenticated(request) -> bool:
    return bool(request.user and request.user.is_authenticated)


def _is_platform_staff(user) -> bool:
    return user.is_superuser or getattr(user, 'is_staff', False)


def _role_allowed(request, write_roles) -> bool:
    if not _authenticated(request):
        return False
    if _is_platform_staff(request.user):
        return True
    role = getattr(request.user, 'role', None)
    if role in write_roles:
        return True
    return request.method in SAFE_METHODS and role in READ_ONLY_BILLING_ROLES


class IsCashierOrAbove(BasePermission):
    """
    Cashiers, Supervisors, Billing Admins/Managers, Hospital/Super Admins. Finance Manager: read-only.
    Allows creating invoices, collecting payments, recording deposits, requesting refunds.
    """
    def has_permission(self, request, view):
        return _role_allowed(request, CASHIER_OR_ABOVE_ROLES)


class IsBillingSupervisorOrAbove(BasePermission):
    """
    Billing Supervisor, Billing Admin/Manager, Hospital Admin, Super Admin. Finance Manager: read-only.
    Authorizes refunds, voiding unpaid invoices, signing off on shifts.
    """
    def has_permission(self, request, view):
        return _role_allowed(request, SUPERVISOR_OR_ABOVE_ROLES)


class IsBillingAdminOrAbove(BasePermission):
    """
    Billing Admin, Billing Manager, Hospital Admin, Super Admin. Finance Manager: read-only.
    Used for modifying tariff masters, packages, corporate accounts, policies.
    """
    def has_permission(self, request, view):
        return _role_allowed(request, ADMIN_OR_ABOVE_ROLES)


class IsBillingStaffOrReadOnly(BasePermission):
    """
    Any logged-in hospital staff may read (e.g. clinicians checking an invoice or ledger);
    writes are restricted to Cashiers and Billing management.
    """
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return IsHospitalStaff().has_permission(request, view)
        return _role_allowed(request, CASHIER_OR_ABOVE_ROLES)


class IsHospitalStaff(BasePermission):
    """Any authenticated hospital employee (patients excluded). Used where clinical departments call Billing:
    charge emission/cancellation and clinical gate clearance checks."""
    def has_permission(self, request, view):
        if not _authenticated(request):
            return False
        return _is_platform_staff(request.user) or getattr(request.user, 'role', None) != RoleType.PATIENT


class IsStaffReadAdminWrite(BasePermission):
    """Pricing masters and gating policy: readable by hospital staff, editable by Billing Admin and above."""
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return IsHospitalStaff().has_permission(request, view)
        return _role_allowed(request, ADMIN_OR_ABOVE_ROLES)


INSURANCE_COORDINATOR_OR_ABOVE_ROLES = [
    RoleType.INSURANCE_COORDINATOR,
    RoleType.BILLING_SUPERVISOR,
    RoleType.BILLING_ADMIN,
    RoleType.BILLING_MANAGER,
    RoleType.HOSPITAL_ADMIN,
    RoleType.SUPER_ADMIN,
]


class IsInsuranceCoordinatorOrAbove(BasePermission):
    """Insurance Coordinator, Billing Supervisor/Admin/Manager, Hospital/Super Admin."""
    def has_permission(self, request, view):
        return _role_allowed(request, INSURANCE_COORDINATOR_OR_ABOVE_ROLES)


# --- Phase 11: reports, period close & audit ---

FINANCE_REPORT_ROLES = [
    RoleType.BILLING_ADMIN,
    RoleType.BILLING_MANAGER,
    RoleType.HOSPITAL_ADMIN,
    RoleType.SUPER_ADMIN,
    RoleType.FINANCE_MANAGER,
    RoleType.INTERNAL_AUDITOR,
]

PERIOD_CLOSE_ROLES = [
    RoleType.BILLING_MANAGER,
    RoleType.BILLING_ADMIN,
    RoleType.HOSPITAL_ADMIN,
    RoleType.SUPER_ADMIN,
    RoleType.FINANCE_MANAGER,
]


def _role_in(request, roles) -> bool:
    return _authenticated(request) and (_is_platform_staff(request.user) or getattr(request.user, 'role', None) in roles)


class IsFinanceReportViewer(BasePermission):
    """Hospital-wide reports, tax and audit logs: Billing Admin/Manager, Finance (CFO), Internal Auditor (read-only)."""
    def has_permission(self, request, view):
        return request.method in SAFE_METHODS and _role_in(request, FINANCE_REPORT_ROLES)


class IsShiftReportViewer(BasePermission):
    """Finance report viewers, plus Billing Supervisors (the view restricts them to today's shift reports)."""
    def has_permission(self, request, view):
        return request.method in SAFE_METHODS and _role_in(request, FINANCE_REPORT_ROLES + [RoleType.BILLING_SUPERVISOR])


class IsPeriodCloseUser(BasePermission):
    """Period close screen: auditors read; closers (per period type, checked in the service) act."""
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return _role_in(request, FINANCE_REPORT_ROLES)
        return _role_in(request, PERIOD_CLOSE_ROLES)
