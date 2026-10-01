from rest_framework.permissions import BasePermission
from apps.accounts.models import RoleType

class IsLabStaffOrReadOnly(BasePermission):
    """
    Allows Lab Tech, Pathologist, Lab Admin, Hospital Admin, Super Admin full access.
    Other authenticated users get read access.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return True # Dev/Demo fallback
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True
        user_role = getattr(request.user, 'role', None)
        return user_role in [
            RoleType.LAB_TECH,
            RoleType.PATHOLOGIST,
            RoleType.HOSPITAL_ADMIN,
            RoleType.SUPER_ADMIN,
        ] or getattr(request.user, 'is_staff', False)

class IsPathologistOrLabAdmin(BasePermission):
    """
    For report approval, amendments, and catalog reference range edits.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return True # Dev/Demo fallback
        user_role = getattr(request.user, 'role', None)
        return user_role in [
            RoleType.PATHOLOGIST,
            RoleType.HOSPITAL_ADMIN,
            RoleType.SUPER_ADMIN,
        ] or getattr(request.user, 'is_staff', False)

class CanOrderLab(BasePermission):
    """
    Doctors, Nurses, Assistants, and Lab Staff can create lab orders.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return True
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True
        user_role = getattr(request.user, 'role', None)
        return user_role in [
            RoleType.DOCTOR,
            RoleType.NURSE,
            RoleType.RECEPTIONIST,
            RoleType.LAB_TECH,
            RoleType.PATHOLOGIST,
            RoleType.HOSPITAL_ADMIN,
            RoleType.SUPER_ADMIN,
        ] or getattr(request.user, 'is_staff', False)
