from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.accounts.models import User, DoctorProfile, RoleType
from apps.organization.models import HospitalProfile, Department, Room, Bed
from apps.patients.models import Patient
from apps.appointments.models import Appointment, VitalSign, AppointmentStatus, AppointmentType
from apps.clinical.models import Consultation, Prescription, PrescriptionItem
from apps.lab.models import LabTest, LabOrder, LabResult
from apps.ot.models import SurgeryBooking
from apps.ipd.models import InpatientAdmission, MedicationAdministration
from apps.billing.models import Invoice, InvoiceItem

class Command(BaseCommand):
    help = 'Seeds North Hospital enterprise database with 10 role accounts and clinical demo data'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("[*] Seeding North Hospital Enterprise database..."))

        # 1. Seed Hospital Profile
        profile, _ = HospitalProfile.objects.get_or_create(
            id='00000000-0000-0000-0000-000000000001',
            defaults={
                'name': 'North Hospital Clinical Enterprise',
                'tagline': 'Excellence in Tertiary Patient Care & Research',
                'email': 'contact@northhospital.com',
                'phone': '+1 (555) 019-2834',
                'emergency_phone': '+1 (555) 911-0000',
                'address': '100 Medical Center Way',
                'city': 'Metropolis',
                'state': 'NY',
                'postal_code': '10001',
                'country': 'USA',
                'tax_id': 'TX-998822-US',
                'accreditation': 'JCI Accredited, Level 1 Trauma Center',
                'currency': 'USD',
                'timezone': 'America/New_York',
            }
        )

        # 2. Seed 10 Department Demo Users
        users_data = [
            {
                'username': 'admin',
                'email': 'admin@northhospital.com',
                'first_name': 'Harsh',
                'last_name': 'Director',
                'role': RoleType.HOSPITAL_ADMIN,
                'is_staff': True,
                'is_superuser': True,
            },
            {
                'username': 'reception',
                'email': 'reception@northhospital.com',
                'first_name': 'Emma',
                'last_name': 'FrontDesk',
                'role': RoleType.RECEPTIONIST,
                'is_staff': True,
            },
            {
                'username': 'dr.sarah',
                'email': 'doctor@northhospital.com',
                'first_name': 'Sarah',
                'last_name': 'Jenkins',
                'role': RoleType.DOCTOR,
                'is_staff': True,
                'doctor_info': {
                    'license_number': 'MED-98421',
                    'department': 'Internal Medicine',
                    'qualification': 'MBBS, MD',
                    'consultation_fee': Decimal('100.00'),
                }
            },
            {
                'username': 'lab',
                'email': 'lab@northhospital.com',
                'first_name': 'David',
                'last_name': 'Technician',
                'role': RoleType.LAB_TECH,
                'is_staff': True,
            },
            {
                'username': 'surgeon',
                'email': 'surgeon@northhospital.com',
                'first_name': 'Michael',
                'last_name': 'Chang',
                'role': RoleType.SURGEON,
                'is_staff': True,
                'doctor_info': {
                    'license_number': 'SURG-11029',
                    'department': 'General & Laparoscopic Surgery',
                    'qualification': 'MS, FACS',
                    'consultation_fee': Decimal('150.00'),
                }
            },
            {
                'username': 'ipd',
                'email': 'ipd@northhospital.com',
                'first_name': 'Clara',
                'last_name': 'WardManager',
                'role': RoleType.WARD_MANAGER,
                'is_staff': True,
            },
            {
                'username': 'billing',
                'email': 'billing@northhospital.com',
                'first_name': 'Rachel',
                'last_name': 'Cashier',
                'role': RoleType.CASHIER,
                'is_staff': True,
            },
            {
                'username': 'nurse',
                'email': 'nurse@northhospital.com',
                'first_name': 'Maria',
                'last_name': 'Nurse',
                'role': RoleType.NURSE,
                'is_staff': True,
            },
            {
                'username': 'pharmacy',
                'email': 'pharmacy@northhospital.com',
                'first_name': 'Alex',
                'last_name': 'Pharmacist',
                'role': RoleType.PHARMACIST,
                'is_staff': True,
            },
            {
                'username': 'patient',
                'email': 'patient@northhospital.com',
                'first_name': 'Robert',
                'last_name': 'Patient',
                'role': RoleType.PATIENT,
                'is_staff': False,
            },
        ]

        created_users = {}
        for udata in users_data:
            doc_info = udata.pop('doctor_info', None)
            user, created = User.objects.get_or_create(
                email=udata['email'],
                defaults={
                    'username': udata['username'],
                    'first_name': udata['first_name'],
                    'last_name': udata['last_name'],
                    'role': udata['role'],
                    'is_staff': udata.get('is_staff', False),
                    'is_superuser': udata.get('is_superuser', False),
                }
            )
            # Universal demo password
            user.set_password('Password123!')
            user.save()
            created_users[udata['email']] = user

            if doc_info:
                DoctorProfile.objects.update_or_create(
                    user=user,
                    defaults=doc_info
                )

        self.stdout.write(self.style.SUCCESS("  [+] 10 Department Demo Users configured with 'Password123!'"))

        # 3. Seed Departments & Rooms & Beds
        dep_med, _ = Department.objects.get_or_create(
            code='INTERNAL_MED',
            defaults={'name': 'Internal Medicine', 'department_type': 'CLINICAL', 'room_number': '201', 'floor_number': 2}
        )
        dep_surg, _ = Department.objects.get_or_create(
            code='SURGERY',
            defaults={'name': 'General Surgery', 'department_type': 'CLINICAL', 'room_number': '301', 'floor_number': 3}
        )
        dep_ipd, _ = Department.objects.get_or_create(
            code='IPD_WARD',
            defaults={'name': 'Inpatient Care Wards', 'department_type': 'INPATIENT', 'room_number': '101', 'floor_number': 1}
        )

        room_101, _ = Room.objects.get_or_create(
            room_number='101',
            defaults={'department': dep_ipd, 'room_type': 'GENERAL_WARD', 'max_occupancy': 5}
        )
        room_201, _ = Room.objects.get_or_create(
            room_number='201',
            defaults={'department': dep_ipd, 'room_type': 'ICU', 'max_occupancy': 2}
        )

        beds_data = [
            {'bed_number': '101-A', 'room': room_101, 'daily_tariff': Decimal('150.00'), 'status': 'AVAILABLE'},
            {'bed_number': '101-B', 'room': room_101, 'daily_tariff': Decimal('150.00'), 'status': 'AVAILABLE'},
            {'bed_number': '101-C', 'room': room_101, 'daily_tariff': Decimal('150.00'), 'status': 'AVAILABLE'},
            {'bed_number': '101-D', 'room': room_101, 'daily_tariff': Decimal('150.00'), 'status': 'AVAILABLE'},
            {'bed_number': '101-E', 'room': room_101, 'daily_tariff': Decimal('150.00'), 'status': 'AVAILABLE'},
            {'bed_number': '201-A', 'room': room_201, 'daily_tariff': Decimal('450.00'), 'status': 'AVAILABLE', 'bed_type': 'ICU'},
            {'bed_number': '201-B', 'room': room_201, 'daily_tariff': Decimal('450.00'), 'status': 'AVAILABLE', 'bed_type': 'ICU'},
        ]
        for bdata in beds_data:
            Bed.objects.get_or_create(bed_number=bdata['bed_number'], defaults=bdata)

        # 4. Seed Patients
        patient1, _ = Patient.objects.get_or_create(
            uhid='UHID-202609-00001',
            defaults={
                'first_name': 'Robert',
                'last_name': 'Fox',
                'date_of_birth': '1988-04-12',
                'gender': 'MALE',
                'blood_group': 'O+',
                'phone_number': '+1 555-019-2834',
                'email': 'robert.fox@example.com',
                'allergies': ['Penicillin'],
                'chronic_conditions': ['Hypertension'],
                'address': '742 Evergreen Terrace, Springfield',
            }
        )

        patient2, _ = Patient.objects.get_or_create(
            uhid='UHID-202609-00002',
            defaults={
                'first_name': 'Eleanor',
                'last_name': 'Vance',
                'date_of_birth': '1995-11-23',
                'gender': 'FEMALE',
                'blood_group': 'A+',
                'phone_number': '+1 555-014-9821',
                'email': 'eleanor.vance@example.com',
                'allergies': [],
                'chronic_conditions': [],
                'address': '12 Hill House Lane',
            }
        )

        self.stdout.write(self.style.SUCCESS("  [+] Demo Patients Robert Fox and Eleanor Vance created"))

        # 5. Seed Lab Catalog
        tests_data = [
            {'test_code': 'LAB-CBC-001', 'name': 'Complete Blood Count (CBC)', 'department': 'Hematology', 'sample_type': 'Whole Blood', 'container_type': 'Lavender EDTA', 'price': Decimal('50.00')},
            {'test_code': 'LAB-CMP-002', 'name': 'Comprehensive Metabolic Panel (CMP)', 'department': 'Biochemistry', 'sample_type': 'Serum', 'container_type': 'Gold SST', 'price': Decimal('85.00')},
            {'test_code': 'LAB-LIP-003', 'name': 'Lipid Profile', 'department': 'Biochemistry', 'sample_type': 'Serum', 'container_type': 'Gold SST', 'price': Decimal('60.00')},
            {'test_code': 'LAB-LFT-004', 'name': 'Liver Function Test (LFT)', 'department': 'Biochemistry', 'sample_type': 'Serum', 'container_type': 'Gold SST', 'price': Decimal('75.00')},
            {'test_code': 'LAB-TSH-005', 'name': 'Thyroid Stimulating Hormone (TSH)', 'department': 'Endocrinology', 'sample_type': 'Serum', 'container_type': 'Red Top', 'price': Decimal('45.00')},
        ]
        created_tests = {}
        for tdata in tests_data:
            test_obj, _ = LabTest.objects.get_or_create(test_code=tdata['test_code'], defaults=tdata)
            created_tests[tdata['test_code']] = test_obj

        # 6. Seed Appointment with Vitals for Robert Fox
        doc_sarah = DoctorProfile.objects.filter(user__username='dr.sarah').first()
        today = timezone.now().strftime('%Y-%m-%d')
        today_code = timezone.now().strftime('%Y%m%d')

        apt, created_apt = Appointment.objects.get_or_create(
            appointment_number=f"APT-{today_code}-0001",
            defaults={
                'patient': patient1,
                'doctor': doc_sarah,
                'appointment_date': today,
                'slot_start_time': '09:00:00',
                'slot_end_time': '09:15:00',
                'token_number': 1,
                'type': AppointmentType.WALK_IN,
                'status': AppointmentStatus.IN_CONSULTATION,
                'notes': 'Follow up for seasonal allergy and mild fever',
            }
        )

        VitalSign.objects.get_or_create(
            appointment=apt,
            defaults={
                'patient': patient1,
                'recorded_by': created_users['admin@northhospital.com'],
                'systolic_bp': 120,
                'diastolic_bp': 80,
                'pulse_rate': 74,
                'temperature': Decimal('98.4'),
                'spo2': 99,
                'height_cm': Decimal('178.0'),
                'weight_kg': Decimal('76.0'),
                'bmi': Decimal('24.0'),
                'triage_notes': 'Mild sore throat and dry cough.',
            }
        )

        # 7. Seed Lab Order for Robert Fox
        cbc_test = created_tests.get('LAB-CBC-001')
        lab_order, _ = LabOrder.objects.get_or_create(
            order_number=f"LAB-{today_code}-0001",
            defaults={
                'patient': patient1,
                'test': cbc_test,
                'doctor': doc_sarah,
                'priority': 'ROUTINE',
                'status': 'COLLECTED',
                'barcode': 'BAR-99881122',
                'technician_note': 'Sample drawn via venipuncture, no hemolysis.',
            }
        )
        LabResult.objects.get_or_create(
            lab_order=lab_order,
            parameter_name='Hemoglobin',
            defaults={'observed_value': '14.2', 'reference_range': '13.5 - 17.5', 'unit': 'g/dL', 'is_abnormal': False}
        )
        LabResult.objects.get_or_create(
            lab_order=lab_order,
            parameter_name='WBC Count',
            defaults={'observed_value': '7.8', 'reference_range': '4.5 - 11.0', 'unit': 'x10^3/uL', 'is_abnormal': False}
        )

        # 8. Seed Sample Invoice
        inv, _ = Invoice.objects.get_or_create(
            invoice_number=f"INV-{timezone.now().strftime('%Y%m')}-00001",
            defaults={
                'patient': patient1,
                'category': 'OPD',
                'date': today,
                'subtotal': Decimal('150.00'),
                'discount': Decimal('0.00'),
                'tax': Decimal('7.50'),
                'advance_deducted': Decimal('0.00'),
                'total': Decimal('157.50'),
                'paid': Decimal('0.00'),
                'balance': Decimal('157.50'),
                'status': 'UNPAID',
            }
        )
        InvoiceItem.objects.get_or_create(
            invoice=inv,
            description='OPD Doctor Consultation Fee (Internal Medicine)',
            defaults={'source': 'Consultation', 'qty': 1, 'unit_price': Decimal('100.00'), 'total': Decimal('100.00')}
        )
        InvoiceItem.objects.get_or_create(
            invoice=inv,
            description='Complete Blood Count (CBC) Panel',
            defaults={'source': 'Laboratory', 'qty': 1, 'unit_price': Decimal('50.00'), 'total': Decimal('50.00')}
        )

        self.stdout.write(self.style.SUCCESS("[OK] North Hospital Enterprise HMS database successfully seeded!"))
