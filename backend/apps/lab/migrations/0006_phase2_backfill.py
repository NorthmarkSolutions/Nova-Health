# Phase 2 data migration:
# - each test with a parameter schema gets published range version 1 (same limits for every group;
#   the pathologist can then publish group-specific ranges as v2)
# - critical reports released in Phase 1 get a call-back record (attempts copied from the audit log)
# - existing amendments become numbered, signed addenda
# Reports signed before Phase 2 keep an empty signature hash: it is not reconstructed after the fact.
from django.db import migrations


def forwards(apps, schema_editor):
    LabTest = apps.get_model('lab', 'LabTest')
    LabTestRangeVersion = apps.get_model('lab', 'LabTestRangeVersion')
    LabReport = apps.get_model('lab', 'LabReport')
    LabReportAmendment = apps.get_model('lab', 'LabReportAmendment')
    CriticalCallback = apps.get_model('lab', 'CriticalCallback')
    CriticalCallAttempt = apps.get_model('lab', 'CriticalCallAttempt')
    AuditLog = apps.get_model('audit', 'AuditLog')

    for test in LabTest.objects.all():
        rows = [
            {
                'name': p.get('name'),
                'unit': p.get('unit', ''),
                'low': p.get('low'),
                'high': p.get('high'),
                'criticalLow': p.get('criticalLow'),
                'criticalHigh': p.get('criticalHigh'),
            }
            for p in (test.parameters_schema or [])
            if isinstance(p, dict) and p.get('name')
        ]
        if rows and not LabTestRangeVersion.objects.filter(test=test).exists():
            LabTestRangeVersion.objects.create(
                test=test,
                version=1,
                status='PUBLISHED',
                ranges={'adultMale': rows, 'adultFemale': [dict(r) for r in rows], 'child': [dict(r) for r in rows]},
                notes='Imported from the catalog parameter list',
                published_at=test.updated_at,
            )

    for report in LabReport.objects.exclude(approved_at__isnull=True).select_related('order', 'amended_by', 'order__critical_acknowledged_by'):
        order = report.order
        if order.is_flagged_critical and not CriticalCallback.objects.filter(order=order).exists():
            ack_by = order.critical_acknowledged_by
            # Phase 1 kept the receiver only in the audit note ("Name (Role) · read back"); prefer it over the recorder
            ack_log = AuditLog.objects.filter(entity_name='LabOrder', entity_id=str(order.id), action='CRITICAL_ACKNOWLEDGED').order_by('-created_at').first()
            note = str((ack_log.details or {}).get('note', '')) if ack_log else ''
            receiver = note.split(' · ')[0].split(' (')[0].strip() if note else ''
            role = note.split(' (')[1].split(')')[0] if ' (' in note.split(' · ')[0] else ''
            cb = CriticalCallback.objects.create(
                order=order,
                report=report,
                status='ACKNOWLEDGED' if order.critical_acknowledged_at else 'PENDING',
                released_at=report.approved_at,
                acknowledged_at=order.critical_acknowledged_at,
                received_by_name=receiver or ((f"{ack_by.first_name} {ack_by.last_name}".strip() or ack_by.username) if ack_by else ''),
                received_by_role=role,
                notes='Opened before call-back records existed (Phase 1)',
            )
            for log in AuditLog.objects.filter(entity_name='LabOrder', entity_id=str(order.id), action='CRITICAL_CALL_ATTEMPT').order_by('created_at'):
                CriticalCallAttempt.objects.create(callback=cb, at=log.created_at, note=str((log.details or {}).get('note', ''))[:300], by=log.performed_by)
        if report.is_amended and report.amendment_reason and not LabReportAmendment.objects.filter(report=report).exists():
            by = report.amended_by
            LabReportAmendment.objects.create(
                report=report,
                number=1,
                text=report.amendment_reason,
                signed_by=by,
                signed_by_name=(f"{by.first_name} {by.last_name}".strip() or by.username) if by else '',
                signed_at=report.amended_at or report.approved_at,
            )
            report.version = 2
            report.save(update_fields=['version'])


class Migration(migrations.Migration):
    dependencies = [('lab', '0005_phase2_pathologist'), ('audit', '0001_initial')]
    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
