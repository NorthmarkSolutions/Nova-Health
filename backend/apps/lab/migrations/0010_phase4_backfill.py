# Phase 4 data migration:
# - a lab staff profile for every existing LAB_TECH / PATHOLOGIST user account (credentials left blank:
#   they are not known and are filled in by Lab Admin)
# - analyzer service details (last/next PM, contract) from the lab's existing register
# - the reagent and consumable list the Lab Admin stock screen already showed
# - department settings with the values the settings screen already used
# The browser roster, leave/swap requests and purchase requests named people without accounts, so
# they are not copied: the server roster starts empty for Lab Admin to fill.
import datetime
from django.db import migrations

SERVICE = {
    'an-xn1000': ('2026-08-12', '2026-11-12', 'Sysmex India · AMC', '2027-03-31'),
    'an-au680': ('2026-09-02', '2026-12-02', 'Beckman Coulter · AMC', '2027-06-30'),
    'an-d10': ('2026-06-20', '2026-12-20', 'Bio-Rad · CMC', '2027-01-31'),
    'an-abl800': ('2026-10-11', '2026-12-30', 'Radiometer · CMC', '2027-05-31'),
    'an-e411': ('2026-07-18', '2026-10-18', 'Roche · AMC', '2026-10-31'),
    'an-ca600': ('2026-09-05', '2026-12-05', 'Sysmex India · AMC', '2027-03-31'),
    'an-chem7': ('2026-03-10', '2026-10-10', 'Transasia · warranty', '2027-03-10'),
}

STOCK = [
    ('Erba Chem-7 reagent pack', 'Reagent', 'packs', 3, 4, 20, '2026-11-14', 'ER-7731', 'Transasia'),
    ('Troponin I reagent kit', 'Reagent', 'tests', 11, 50, 400, '2026-12-02', 'RC-TNI-118', 'Roche Diagnostics'),
    ('SST gold-top tubes', 'Consumable', 'tubes', 140, 200, 2000, None, '', 'BD India'),
    ('CBC diluent (Cellpack)', 'Reagent', 'L', 6, 4, 40, '2026-10-20', 'SX-CP-2209', 'Sysmex India'),
    ('EDTA lavender tubes', 'Consumable', 'tubes', 1850, 500, 5000, None, '', 'BD India'),
    ('HbA1c calibrator set', 'Calibrator', 'sets', 2, 1, 6, '2026-10-08', 'BR-A1C-77', 'Bio-Rad'),
]

SETTINGS = {
    'deptName': 'Diagnostic Lab',
    'location': 'Ground floor · Block C',
    'hod': 'Dr. Kavitha Menon',
    'intercom': '2140',
    'nablNo': 'MC-4418',
    'nablValidTo': '2027-08-31',
    'hours': {'opd': True, 'sunday': True, 'stat': True, 'home': True},
    'batchSignoff': True,
    'autoFlag': True,
    'retestRoute': 'technician_queue',
    'criticalAckWindow': '15 minutes',
    'escalateTo': 'Department HOD, then Medical Superintendent',
    'barcodeFormat': 'LAB-YYMM-#### · Code 128',
    'rejectionReasons': 'Haemolysed, clotted, QNS, mislabelled',
    'notifyCriticalInApp': True,
    'notifyCriticalSms': True,
    'notifyIpdNurse': True,
    'notifyDoctorAssistant': True,
    'reportReadySms': False,
    'reportTemplate': 'NABL standard · A4',
    'digitalSignature': 'Signing pathologist + HOD',
    'showPreviousResult': 'Last 1 result with date',
    'labelPrinter': 'Zebra ZD421 · Bench 2',
}

ROLE_PROFILE = {
    'PATHOLOGIST': ('Pathologist', 'Consultant Pathologist'),
    'LAB_TECH': ('Technologist', 'Lab Technologist'),
}


def d(text):
    return datetime.date.fromisoformat(text) if text else None


def forwards(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    LabStaffProfile = apps.get_model('lab', 'LabStaffProfile')
    Equipment = apps.get_model('lab', 'Equipment')
    LabStockItem = apps.get_model('lab', 'LabStockItem')
    LabSettings = apps.get_model('lab', 'LabSettings')

    for user in User.objects.filter(role__in=ROLE_PROFILE.keys(), is_active=True):
        if LabStaffProfile.objects.filter(user=user).exists():
            continue
        category, title = ROLE_PROFILE[user.role]
        LabStaffProfile.objects.create(user=user, code=user.username.upper()[:40], role_title=title, category=category)

    for code, (last_pm, next_pm, contract, ends) in SERVICE.items():
        Equipment.objects.filter(code=code).update(last_pm_date=d(last_pm), next_pm_date=d(next_pm), service_contract=contract, contract_ends=d(ends))

    if not LabStockItem.objects.exists():
        for name, cat, unit, on_hand, reorder, max_level, expiry, lot, supplier in STOCK:
            LabStockItem.objects.create(name=name, category=cat, unit=unit, on_hand=on_hand, reorder_at=reorder, max_level=max_level, expiry=d(expiry), lot=lot, supplier=supplier)

    settings, _ = LabSettings.objects.get_or_create(id=1)
    if not settings.data:
        settings.data = SETTINGS
        settings.save()


class Migration(migrations.Migration):
    dependencies = [('lab', '0009_phase4_lab_admin'), ('accounts', '0008_alter_user_role')]
    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
