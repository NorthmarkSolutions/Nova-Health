# Phase 1 data migration:
# - legacy order statuses -> the current workflow statuses
# - parameters_schema "ref" text ("13.5 - 17.5", "< 5.7") -> numeric low/high
# - critical limits for common parameters (Phase 2 moves ranges to versioned, pathologist-owned records)
# - report numbers for reports approved before numbering existed
import re
from django.db import migrations

LEGACY_STATUS = {
    'COLLECTED': 'SAMPLE_COLLECTED',
    'PROCESSING': 'IN_ANALYSIS',
    'RESULT_ENTERED': 'RESULTS_ENTERED',
    'VALIDATED': 'REPORT_APPROVED',
    'REPORT_GENERATED': 'REPORT_APPROVED',
}

# name keyword -> (critical_low, critical_high); None = no limit on that side
CRITICAL_LIMITS = {
    'hemoglobin': (7.0, 20.0),
    'haemoglobin': (7.0, 20.0),
    'wbc': (2.0, 30.0),
    'platelet': (50.0, 1000.0),
    'creatinine': (None, 5.0),
    'potassium': (2.8, 6.5),
    'sodium': (120.0, 160.0),
    'glucose': (40.0, 400.0),
}


def parse_ref(ref):
    text = str(ref or '').replace('–', '-').strip()
    m = re.match(r'^\s*([\d.]+)\s*-\s*([\d.]+)', text)
    if m:
        return float(m.group(1)), float(m.group(2))
    m = re.match(r'^\s*<\s*([\d.]+)', text)
    if m:
        return 0.0, float(m.group(1))
    m = re.match(r'^\s*>\s*([\d.]+)', text)
    if m:
        return float(m.group(1)), None
    return None, None


def forwards(apps, schema_editor):
    LabOrder = apps.get_model('lab', 'LabOrder')
    LabTest = apps.get_model('lab', 'LabTest')
    LabReport = apps.get_model('lab', 'LabReport')

    for old, new in LEGACY_STATUS.items():
        LabOrder.objects.filter(status=old).update(status=new)

    for test in LabTest.objects.all():
        schema = test.parameters_schema or []
        changed = False
        for p in schema:
            if not isinstance(p, dict):
                continue
            if 'low' not in p and 'high' not in p:
                low, high = parse_ref(p.get('ref'))
                p['low'], p['high'] = low, high
                changed = True
            name = str(p.get('name', '')).lower()
            for key, (cl, ch) in CRITICAL_LIMITS.items():
                if key in name and 'criticalLow' not in p and 'criticalHigh' not in p:
                    p['criticalLow'], p['criticalHigh'] = cl, ch
                    changed = True
                    break
            if 'group' not in p:
                p['group'] = (test.category or 'Results').upper()
                changed = True
        if changed:
            test.parameters_schema = schema
            test.save(update_fields=['parameters_schema'])

    for report in LabReport.objects.filter(report_number__isnull=True).select_related('order').order_by('created_at'):
        stamp = (report.approved_at or report.created_at)
        prefix = f"RPT-{stamp:%y%m}-"
        n = LabReport.objects.filter(report_number__startswith=prefix).count() + 1
        report.report_number = f"{prefix}{n:04d}"
        report.save(update_fields=['report_number'])


class Migration(migrations.Migration):
    dependencies = [('lab', '0003_phase1_sample_result_report_fields')]
    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
