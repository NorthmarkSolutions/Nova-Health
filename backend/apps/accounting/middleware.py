from django.http import JsonResponse

PROTECTED_PREFIXES = ('/api/v1/accounts', '/api/v1/integration')
AUDITOR_PREFIX = '/api/v1/accounts/auditor'
SAFE_METHODS = ('GET', 'HEAD', 'OPTIONS')


class AuditorReadOnlyMiddleware:
    """Auditors are read-only and confined to the auditor endpoints (Phase 11).

    JWT authentication happens inside DRF views, so the token is resolved here as well. Requests
    without a valid token pass through untouched and the view's own authentication rejects them.
    The auditor views then enforce the time-boxed grant and audit every read.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith(PROTECTED_PREFIXES):
            denial = self._deny(request)
            if denial:
                return denial
        return self.get_response(request)

    def _deny(self, request):
        from apps.accounting.services import AuditComplianceService
        user = self._jwt_user(request)
        if not user:
            forced = getattr(request, '_force_auth_user', None) or getattr(request, 'user', None)
            if forced and getattr(forced, 'is_authenticated', False):
                user = forced
        if not AuditComplianceService.is_auditor(user):
            return None
        if request.method not in SAFE_METHODS:
            return self._error('READ_ONLY_ROLE', 'Auditors have read-only access.')
        if not request.path.startswith(AUDITOR_PREFIX):
            return self._error('AUDITOR_SCOPE', 'Auditors can only use the auditor workspace endpoints.')
        return None

    @staticmethod
    def _jwt_user(request):
        if not request.META.get('HTTP_AUTHORIZATION'):
            return None
        try:
            from rest_framework_simplejwt.authentication import JWTAuthentication
            result = JWTAuthentication().authenticate(request)
        except Exception:
            return None
        return result[0] if result else None

    @staticmethod
    def _error(code, message):
        return JsonResponse({'error': {'code': code, 'message': message, 'details': []}}, status=403)
