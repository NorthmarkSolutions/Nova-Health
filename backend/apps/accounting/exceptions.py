class AccountingDomainError(Exception):
    """Base error for accounting domain operations"""
    code = 'ACCOUNTING_ERROR'
    status_code = 400

    def __init__(self, message, code=None, status_code=None, details=None):
        super().__init__(message)
        self.message = message
        if code:
            self.code = code
        if status_code:
            self.status_code = status_code
        self.details = details or []


class JournalBalanceError(AccountingDomainError):
    code = 'VALIDATION_FAILED'
    status_code = 422


class SoDViolationError(AccountingDomainError):
    code = 'SOD_VIOLATION'
    status_code = 403


class LimitExceededError(AccountingDomainError):
    code = 'LIMIT_EXCEEDED'
    status_code = 422


class PeriodLockedError(AccountingDomainError):
    code = 'PERIOD_LOCKED'
    status_code = 422


class CommentRequiredError(AccountingDomainError):
    code = 'COMMENT_REQUIRED'
    status_code = 422


class AckRequiredError(AccountingDomainError):
    code = 'ACK_REQUIRED'
    status_code = 422


class DuplicateBillWarningError(AckRequiredError):
    code = 'DUPLICATE_WARNING'
    status_code = 422


class ReasonCodeRequiredError(AccountingDomainError):
    code = 'REASON_REQUIRED'
    status_code = 422


class VersionConflictError(AccountingDomainError):
    code = 'VERSION_CONFLICT'
    status_code = 409


class DuplicateEventError(AccountingDomainError):
    code = 'DUPLICATE'
    status_code = 409


class BlockedByDependencyError(AccountingDomainError):
    code = 'BLOCKED_BY_DEPENDENCY'
    status_code = 422
