# Phase 3 data migration:
# - analyzer codes, reagent levels, tests covered and open faults/calibrations from the lab's existing
#   analyzer register (the values the Technician and Lab Admin screens already showed)
# - existing orders linked to their analyzer by name
# - rejections recorded in the audit log become SampleRejection rows
# No QC runs are created: every analyzer starts "QC due" until the bench logs today's QC.
from django.db import migrations

REGISTER = {
    'Bio-Rad D-10': {'code': 'an-d10', 'reagent': 64, 'tests': 'HbA1c', 'alert': ('Pump pressure fault · E-214', 'Ticket SR-3391 · Engineer ETA 13:30'), 'ticket': 'SR-3391', 'eta': '13:30'},
    'Radiometer ABL800': {'code': 'an-abl800', 'reagent': 55, 'tests': 'ABG, lactate', 'alert': ('Scheduled calibration', 'STAT ABGs go to the ICU point-of-care unit'), 'ticket': '', 'eta': ''},
    'Sysmex CA-600': {'code': 'an-ca600', 'reagent': 47, 'tests': 'PT/INR, aPTT'},
    'Sysmex XN-1000': {'code': 'an-xn1000', 'reagent': 72, 'tests': 'CBC, retic, diff'},
    'Beckman AU680': {'code': 'an-au680', 'reagent': 41, 'tests': 'RFT, LFT, lipid, electrolytes'},
    'Erba Chem-7': {'code': 'an-chem7', 'reagent': 16, 'tests': 'Glucose, urea, creatinine'},
    'Roche Cobas e411': {'code': 'an-e411', 'reagent': 88, 'tests': 'Thyroid, troponin, ferritin'},
}

REASON_CODES = {
    'haemolysed': 'HAEMOLYSED',
    'clotted': 'CLOTTED',
    'insufficient': 'INSUFFICIENT',
    'wrong container': 'WRONG_CONTAINER',
    'label': 'LABEL',
    'leaked': 'LEAKED',
}


def reason_code(text):
    t = (text or '').lower()
    return next((code for key, code in REASON_CODES.items() if key in t), 'OTHER')


def forwards(apps, schema_editor):
    Equipment = apps.get_model('lab', 'Equipment')
    LabOrder = apps.get_model('lab', 'LabOrder')
    SampleRejection = apps.get_model('lab', 'SampleRejection')
    AuditLog = apps.get_model('audit', 'AuditLog')

    for eq in Equipment.objects.all():
        info = REGISTER.get(eq.name)
        if not info:
            continue
        eq.code = info['code']
        eq.reagent_percent = info['reagent']
        eq.tests_covered = info['tests']
        if info.get('alert'):
            eq.alert_title, eq.alert_body = info['alert']
            eq.service_ticket = info.get('ticket', '')
            eq.engineer_eta = info.get('eta', '')
        eq.save()

    by_name = {eq.name: eq for eq in Equipment.objects.all()}
    for order in LabOrder.objects.exclude(analyzer_name=''):
        eq = by_name.get(order.analyzer_name)
        if eq:
            order.analyzer = eq
            order.save(update_fields=['analyzer'])

    for log in AuditLog.objects.filter(entity_name='LabOrder', action='SAMPLE_REJECTED'):
        order = LabOrder.objects.filter(id=log.entity_id).first()
        if not order:
            continue
        reason = str((log.details or {}).get('reason', '')) or 'Not recorded'
        SampleRejection.objects.create(order=order, reason_code=reason_code(reason), reason=reason, stage='UNKNOWN', rejected_by=log.performed_by, rejected_at=log.created_at)


class Migration(migrations.Migration):
    dependencies = [('lab', '0007_phase3_technician'), ('audit', '0001_initial')]
    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
