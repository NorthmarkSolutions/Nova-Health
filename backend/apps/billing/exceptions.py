from rest_framework.views import exception_handler


def billing_exception_handler(exc, context):
    """DRF handler: a write refused by a financial period lock is a 403 and is recorded on the audit stream."""
    from .models import FinancialPeriodLocked, BillingAuditEvent, AuditEventType, AuditSeverity
    response = exception_handler(exc, context)
    if isinstance(exc, FinancialPeriodLocked) and response is not None:
        request = context.get('request')
        user = getattr(request, 'user', None)
        try:
            BillingAuditEvent.objects.create(
                event_type=AuditEventType.PERIOD_LOCK_DENIED, severity=AuditSeverity.HIGH,
                title='Entry refused in locked period', detail=str(exc.detail)[:500],
                actor=user if getattr(user, 'is_authenticated', False) else None,
                reference=(request.path if request else '')[:60])
        except Exception:  # the refusal itself must never fail because auditing did
            pass
        response.data = {'error': 'Financial Period Locked', 'detail': str(exc.detail)}
    return response
