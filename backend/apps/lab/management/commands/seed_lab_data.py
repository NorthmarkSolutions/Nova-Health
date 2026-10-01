import uuid
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.lab.models import (
    LabTest,
    LabOrder,
    LabOrderItem,
    LabResult,
    LabReport,
    Equipment,
    EquipmentMaintenanceLog,
    LabOrderStatus,
    LabOrderPriority,
    ResultFlag,
    EquipmentStatus,
)
from apps.patients.models import Patient
from apps.accounts.models import User, RoleType, DoctorProfile

class Command(BaseCommand):
    help = "Seed rich Lab tests, equipment, orders, and results for demo & development"

    def handle(self, *args, **options):
        self.stdout.write("Seeding Lab Department data...")

        # 1. Ensure a patient exists
        patient = Patient.objects.first()
        if not patient:
            patient = Patient.objects.create(
                uhid="NH-2026-0042",
                first_name="Ramesh",
                last_name="Sharma",
                phone_number="+91 98765 43210",
                gender="MALE",
                date_of_birth="1974-05-12",
                blood_group="B+",
            )

        patient2 = Patient.objects.filter(uhid="NH-2026-0089").first()
        if not patient2:
            patient2 = Patient.objects.create(
                uhid="NH-2026-0089",
                first_name="Priya",
                last_name="Nair",
                phone_number="+91 98450 12345",
                gender="FEMALE",
                date_of_birth="1992-08-23",
                blood_group="O+",
            )

        # 2. Ensure Lab Staff / Pathologist exists
        pathologist_user, _ = User.objects.get_or_create(
            username="pathologist",
            defaults={
                "first_name": "Kavitha",
                "last_name": "Menon",
                "email": "kavitha.menon@northhospital.com",
                "role": RoleType.PATHOLOGIST,
            }
        )

        lab_tech_user, _ = User.objects.get_or_create(
            username="labtech",
            defaults={
                "first_name": "Ananya",
                "last_name": "Deshmukh",
                "email": "ananya.d@northhospital.com",
                "role": RoleType.LAB_TECH,
            }
        )

        lab_admin_user, _ = User.objects.get_or_create(
            username="labadmin",
            defaults={
                "first_name": "Dr. Marcus",
                "last_name": "Vance",
                "email": "lab.admin@northhospital.com",
                "role": RoleType.DEPARTMENT_ADMIN,
            }
        )

        # 3. Seed Tests
        tests_data = [
            {
                "test_code": "HEM-CBC-01",
                "name": "Complete Blood Count (CBC)",
                "category": "Hematology",
                "sample_type": "Whole Blood (EDTA)",
                "container_type": "Lavender Top Tube",
                "container_color": "Lavender",
                "turnaround_hours": 1,
                "tat_minutes": 45,
                "price": Decimal("350.00"),
                "tpa_price": Decimal("300.00"),
                "stat_surcharge": "+50%",
                "normal_ranges": {
                    "adult_male": {"hemoglobin": "13.5 - 17.5 g/dL", "wbc": "4.0 - 11.0 10^3/uL", "platelets": "150 - 450 10^3/uL"},
                    "adult_female": {"hemoglobin": "12.0 - 15.5 g/dL", "wbc": "4.0 - 11.0 10^3/uL", "platelets": "150 - 450 10^3/uL"},
                },
                "parameters_schema": [
                    {"name": "Hemoglobin", "unit": "g/dL", "ref": "13.5 - 17.5"},
                    {"name": "WBC Count", "unit": "10^3/uL", "ref": "4.0 - 11.0"},
                    {"name": "Platelet Count", "unit": "10^3/uL", "ref": "150 - 450"},
                    {"name": "RBC Count", "unit": "10^6/uL", "ref": "4.5 - 5.9"},
                ]
            },
            {
                "test_code": "BIO-RFT-01",
                "name": "Renal Function Panel (RFT)",
                "category": "Biochemistry",
                "sample_type": "Serum (SST)",
                "container_type": "Gold Top Tube",
                "container_color": "Gold",
                "turnaround_hours": 2,
                "tat_minutes": 52,
                "price": Decimal("650.00"),
                "tpa_price": Decimal("560.00"),
                "stat_surcharge": "+50%",
                "normal_ranges": {
                    "adult": {"creatinine": "0.7 - 1.3 mg/dL", "urea": "15 - 45 mg/dL", "bun": "7 - 20 mg/dL"}
                },
                "parameters_schema": [
                    {"name": "Serum Creatinine", "unit": "mg/dL", "ref": "0.7 - 1.3"},
                    {"name": "Blood Urea", "unit": "mg/dL", "ref": "15 - 45"},
                    {"name": "Blood Urea Nitrogen", "unit": "mg/dL", "ref": "7 - 20"},
                ]
            },
            {
                "test_code": "BIO-LFT-01",
                "name": "Liver Function Test (LFT)",
                "category": "Biochemistry",
                "sample_type": "Serum (SST)",
                "container_type": "Gold Top Tube",
                "container_color": "Gold",
                "turnaround_hours": 2,
                "tat_minutes": 55,
                "price": Decimal("700.00"),
                "tpa_price": Decimal("620.00"),
                "stat_surcharge": "+50%",
                "normal_ranges": {
                    "adult": {"bilirubin_total": "0.2 - 1.2 mg/dL", "sgot": "10 - 40 U/L", "sgpt": "10 - 45 U/L"}
                },
                "parameters_schema": [
                    {"name": "Total Bilirubin", "unit": "mg/dL", "ref": "0.2 - 1.2"},
                    {"name": "SGOT (AST)", "unit": "U/L", "ref": "10 - 40"},
                    {"name": "SGPT (ALT)", "unit": "U/L", "ref": "10 - 45"},
                    {"name": "Alkaline Phosphatase", "unit": "U/L", "ref": "44 - 147"},
                ]
            },
            {
                "test_code": "IMM-TRP-01",
                "name": "Troponin I High Sensitivity",
                "category": "Immunoassay",
                "sample_type": "Heparin Plasma",
                "container_type": "Green Top Tube",
                "container_color": "Green",
                "turnaround_hours": 1,
                "tat_minutes": 30,
                "price": Decimal("1200.00"),
                "tpa_price": Decimal("1050.00"),
                "stat_surcharge": "Incl.",
                "normal_ranges": {
                    "adult": {"troponin_i": "< 0.04 ng/mL"}
                },
                "parameters_schema": [
                    {"name": "Troponin I (hs)", "unit": "ng/mL", "ref": "< 0.04"}
                ]
            },
            {
                "test_code": "BIO-A1C-01",
                "name": "Glycated Hemoglobin (HbA1c)",
                "category": "Biochemistry",
                "sample_type": "Whole Blood (EDTA)",
                "container_type": "Lavender Top Tube",
                "container_color": "Lavender",
                "turnaround_hours": 2,
                "tat_minutes": 120,
                "price": Decimal("480.00"),
                "tpa_price": Decimal("420.00"),
                "stat_surcharge": "—",
                "normal_ranges": {
                    "adult": {"hba1c": "< 5.7 %"}
                },
                "parameters_schema": [
                    {"name": "HbA1c", "unit": "%", "ref": "< 5.7"},
                    {"name": "Estimated Avg Glucose", "unit": "mg/dL", "ref": "< 117"}
                ]
            },
        ]

        created_tests = {}
        for td in tests_data:
            code = td["test_code"]
            t_obj, _ = LabTest.objects.update_or_create(test_code=code, defaults=td)
            created_tests[code] = t_obj

        # 4. Seed Equipment
        eq_data = [
            {"name": "Sysmex XN-1000", "serial_number": "SX-XN1-1188", "section": "Hematology", "status": EquipmentStatus.RUNNING, "service_contract": "Sysmex India · AMC to Mar 2027"},
            {"name": "Beckman AU680", "serial_number": "BC-AU6-3021", "section": "Chemistry", "status": EquipmentStatus.RUNNING, "service_contract": "Beckman Coulter · AMC to Jun 2027"},
            {"name": "Bio-Rad D-10", "serial_number": "BR-D10-0417", "section": "HbA1c", "status": EquipmentStatus.OFFLINE, "service_contract": "Bio-Rad · SR-3391 open", "error_code": "E-401 Optical Alignment"},
            {"name": "Radiometer ABL800", "serial_number": "RM-ABL-2210", "section": "Blood gas", "status": EquipmentStatus.MAINTENANCE, "service_contract": "Radiometer · CMC"},
            {"name": "Roche Cobas e411", "serial_number": "RC-E41-7730", "section": "Immunoassay", "status": EquipmentStatus.READY, "service_contract": "Roche · AMC renewal due"},
            {"name": "Sysmex CA-600", "serial_number": "SX-CA6-0932", "section": "Coagulation", "status": EquipmentStatus.RUNNING, "service_contract": "Sysmex India · AMC"},
            {"name": "Erba Chem-7", "serial_number": "ER-CH7-0552", "section": "Chemistry backup", "status": EquipmentStatus.RUNNING, "service_contract": "Transasia · warranty"},
        ]

        for ed in eq_data:
            sn = ed["serial_number"]
            Equipment.objects.update_or_create(serial_number=sn, defaults=ed)

        # 5. Seed Realistic Orders
        cbc_test = created_tests["HEM-CBC-01"]
        rft_test = created_tests["BIO-RFT-01"]
        trop_test = created_tests["IMM-TRP-01"]

        # Order 1: STAT Troponin with Critical Flag
        order_stat, _ = LabOrder.objects.update_or_create(
            order_number="LAB-2609-0012",
            defaults={
                "patient": patient,
                "test": trop_test,
                "priority": LabOrderPriority.STAT,
                "status": LabOrderStatus.RESULTS_ENTERED,
                "barcode": "BAR-TRP-9901",
                "is_flagged_critical": True,
                "is_flagged_abnormal": True,
                "technician_note": "Serum was slightly lipemic. Checked on secondary channel.",
                "ordered_at": timezone.now() - timezone.timedelta(minutes=45),
                "collected_at": timezone.now() - timezone.timedelta(minutes=35),
            }
        )
        LabResult.objects.update_or_create(
            lab_order=order_stat,
            parameter_name="Troponin I (hs)",
            defaults={
                "observed_value": "0.85",
                "measured_value": "0.85",
                "reference_range": "< 0.04",
                "unit": "ng/mL",
                "flag": ResultFlag.CRITICAL_HIGH,
                "is_abnormal": True,
                "is_delta_flagged": True,
                "previous_value": "0.02",
                "previous_date": timezone.now() - timezone.timedelta(days=14),
            }
        )

        # Order 2: Routine CBC in In Analysis
        order_cbc, _ = LabOrder.objects.update_or_create(
            order_number="LAB-2609-0018",
            defaults={
                "patient": patient2,
                "test": cbc_test,
                "priority": LabOrderPriority.ROUTINE,
                "status": LabOrderStatus.IN_ANALYSIS,
                "barcode": "BAR-CBC-1002",
                "ordered_at": timezone.now() - timezone.timedelta(minutes=25),
                "collected_at": timezone.now() - timezone.timedelta(minutes=15),
            }
        )

        # Order 3: Approved Report
        order_approved, _ = LabOrder.objects.update_or_create(
            order_number="LAB-2609-0005",
            defaults={
                "patient": patient,
                "test": rft_test,
                "priority": LabOrderPriority.ROUTINE,
                "status": LabOrderStatus.REPORT_APPROVED,
                "barcode": "BAR-RFT-0050",
                "pathologist_remarks": "Renal parameters within normal physiological limits.",
                "ordered_at": timezone.now() - timezone.timedelta(hours=3),
                "collected_at": timezone.now() - timezone.timedelta(hours=2, minutes=45),
            }
        )
        LabResult.objects.update_or_create(
            lab_order=order_approved,
            parameter_name="Serum Creatinine",
            defaults={
                "observed_value": "0.95",
                "measured_value": "0.95",
                "reference_range": "0.7 - 1.3",
                "unit": "mg/dL",
                "flag": ResultFlag.NORMAL,
                "is_abnormal": False,
            }
        )
        LabResult.objects.update_or_create(
            lab_order=order_approved,
            parameter_name="Blood Urea",
            defaults={
                "observed_value": "24",
                "measured_value": "24",
                "reference_range": "15 - 45",
                "unit": "mg/dL",
                "flag": ResultFlag.NORMAL,
                "is_abnormal": False,
            }
        )
        LabReport.objects.update_or_create(
            order=order_approved,
            defaults={
                "approved_by": pathologist_user,
                "approved_at": timezone.now() - timezone.timedelta(hours=1),
                "pathologist_remarks": "Renal parameters within normal physiological limits.",
                "digital_signature": "Electronically signed by Dr. Kavitha Menon, MD (Pathology) · NABL MC-4418",
            }
        )

        self.stdout.write(self.style.SUCCESS("Successfully seeded Lab Department test catalog, equipment, and orders!"))
