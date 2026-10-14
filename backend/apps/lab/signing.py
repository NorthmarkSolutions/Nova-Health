"""
Report signatures. A signature is a SHA-256 over a canonical record of what was released (patient,
test, every result with its limits and range version, the interpretation), the signer and the time.
Verifying recomputes it from the database: any later change to the released content or signer
breaks the match. This is tamper evidence inside the HMS, not a PKI / Aadhaar e-sign.
"""
import hashlib
import json

from django.conf import settings


def _canonical(payload):
    return json.dumps(payload, sort_keys=True, separators=(',', ':'), default=str)


def _digest(payload):
    secret = getattr(settings, 'SECRET_KEY', '')
    return hashlib.sha256((secret + _canonical(payload)).encode('utf-8')).hexdigest()


def report_payload(report):
    order = report.order
    results = [
        {
            'name': r.parameter_name,
            'value': r.observed_value,
            'unit': r.unit,
            'low': r.low,
            'high': r.high,
            'criticalLow': r.critical_low,
            'criticalHigh': r.critical_high,
            'flag': r.flag,
            'rangeVersion': r.range_version,
        }
        for r in order.results.order_by('parameter_name')
    ]
    return {
        'reportNumber': report.report_number,
        'orderNumber': order.order_number,
        'patientUhid': order.patient.uhid,
        'testCode': order.test.test_code if order.test else None,
        'results': results,
        'remarks': report.pathologist_remarks,
        'signer': str(report.approved_by_id) if report.approved_by_id else None,
        'signerName': report.signed_by_name,
        'signedAt': report.approved_at.isoformat() if report.approved_at else None,
    }


def amendment_payload(amendment):
    return {
        'reportNumber': amendment.report.report_number,
        'number': amendment.number,
        'text': amendment.text,
        'reportSignature': amendment.report.signature_hash,
        'signer': str(amendment.signed_by_id) if amendment.signed_by_id else None,
        'signedAt': amendment.signed_at.isoformat() if amendment.signed_at else None,
    }


def sign_report(report):
    report.signature_hash = _digest(report_payload(report))
    return report.signature_hash


def sign_amendment(amendment):
    amendment.signature_hash = _digest(amendment_payload(amendment))
    return amendment.signature_hash


def verify_report(report):
    """{'status': 'VALID' | 'TAMPERED' | 'UNSIGNED', ...} for the report and each addendum."""
    if not report.signature_hash:
        return {'status': 'UNSIGNED', 'message': 'Released before report signatures were recorded.', 'amendments': []}
    ok = report.signature_hash == _digest(report_payload(report))
    amendments = []
    for a in report.amendments.all():
        amendments.append({
            'number': a.number,
            'status': 'UNSIGNED' if not a.signature_hash else ('VALID' if a.signature_hash == _digest(amendment_payload(a)) else 'TAMPERED'),
        })
    return {
        'status': 'VALID' if ok else 'TAMPERED',
        'message': 'Report content matches its signature.' if ok else 'Report content or signer changed after signing.',
        'amendments': amendments,
    }
