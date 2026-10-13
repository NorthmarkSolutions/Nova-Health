"""
Lab permissions. Every lab endpoint requires a signed-in user; each workflow step is limited to
the roles that perform it. Reads are open to any signed-in clinician (doctors and nurses see results).
"""
from rest_framework.permissions import BasePermission, SAFE_METHODS
from apps.accounts.models import RoleType

ADMINS = {RoleType.HOSPITAL_ADMIN, RoleType.SUPER_ADMIN}
# DEPARTMENT_ADMIN is the Lab Admin login; department scoping is not modelled on User yet.
LAB_STAFF = {RoleType.LAB_TECH, RoleType.PATHOLOGIST, RoleType.DEPARTMENT_ADMIN} | ADMINS
BENCH = {RoleType.LAB_TECH, RoleType.DEPARTMENT_ADMIN} | ADMINS
SIGNERS = {RoleType.PATHOLOGIST} | ADMINS
ORDERERS = {RoleType.DOCTOR, RoleType.DOCTOR_ASSISTANT, RoleType.NURSE, RoleType.SURGEON, RoleType.WARD_MANAGER} | LAB_STAFF
COLLECTORS = {RoleType.NURSE, RoleType.LAB_TECH, RoleType.DEPARTMENT_ADMIN} | ADMINS
CRITICAL_RECEIVERS = {RoleType.DOCTOR, RoleType.DOCTOR_ASSISTANT, RoleType.NURSE, RoleType.SURGEON, RoleType.WARD_MANAGER} | LAB_STAFF


def _role_in(request, roles):
    user = request.user
    if not user or not user.is_authenticated:
        return False
    return getattr(user, 'role', None) in roles or getattr(user, 'is_superuser', False)


def role_permission(roles, read_open=True):
    """Signed-in users may read (if read_open); writes need one of `roles`."""

    class _RolePermission(BasePermission):
        message = 'Your role cannot perform this lab action.'

        def has_permission(self, request, view):
            if not request.user or not request.user.is_authenticated:
                return False
            if read_open and request.method in SAFE_METHODS:
                return True
            return _role_in(request, roles)

    _RolePermission.__name__ = f"RolePermission_{'_'.join(sorted(str(r) for r in roles))[:60]}"
    return _RolePermission


IsLabStaffOrReadOnly = role_permission(LAB_STAFF)
IsBenchStaff = role_permission(BENCH)
IsPathologistOrLabAdmin = role_permission(SIGNERS)
CanOrderLab = role_permission(ORDERERS)
CanCollectSample = role_permission(COLLECTORS)
CanReceiveCritical = role_permission(CRITICAL_RECEIVERS)
