"""Idempotent OPD seed: every OPD doctor on the department master gets a server DoctorProfile linked by staff id,
and the doctor assistant is assigned to the doctor they work for. Safe to re-run on a live database."""
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.accounts.models import User, DoctorProfile, RoleType
from apps.opd.models import AssistantAssignment

# staff id on the OPD master -> server login. Fees match the department master default (OPD Admin edits them there).
OPD_DOCTORS = [
    {'staff_ref': 'stf-1', 'username': 'dr.sarah', 'email': 'doctor@northhospital.com', 'first_name': 'Sarah',
     'last_name': 'Jenkins', 'role': RoleType.DOCTOR, 'license_number': 'MED-98421',
     'department': 'Internal Medicine', 'qualification': 'MD, FACP (Internal Medicine)'},
    {'staff_ref': 'stf-4', 'username': 'surgeon', 'email': 'surgeon@northhospital.com', 'first_name': 'Michael',
     'last_name': 'Chang', 'role': RoleType.SURGEON, 'license_number': 'MCI-CARD-99214',
     'department': 'Cardiology', 'qualification': 'MD, DM (Cardiology), FACC'},
    {'staff_ref': 'stf-5', 'username': 'dr.alisha', 'email': 'alisha.patel@northhospital.com', 'first_name': 'Alisha',
     'last_name': 'Patel', 'role': RoleType.DOCTOR, 'license_number': 'MCI-OBG-55120',
     'department': 'Obstetrics & Gynaecology', 'qualification': 'MS (OBGYN), DGO, FICOG'},
]
DEFAULT_FEE = Decimal('75.00')
ASSISTANT_FOR = {'assistant@northhospital.com': ['stf-1']}


class Command(BaseCommand):
    help = 'Link OPD doctors to the department master and assign the doctor assistant.'

    @transaction.atomic
    def handle(self, *args, **options):
        for d in OPD_DOCTORS:
            user = User.objects.filter(email=d['email']).first()
            if not user:
                user = User.objects.create(username=d['username'], email=d['email'], first_name=d['first_name'],
                                           last_name=d['last_name'], role=d['role'], is_staff=True)
                user.set_password('Password123!')
                user.save()
                self.stdout.write(f"  + login {d['email']}")
            profile, created = DoctorProfile.objects.get_or_create(user=user, defaults={
                'license_number': d['license_number'], 'department': d['department'],
                'qualification': d['qualification'], 'consultation_fee': DEFAULT_FEE,
            })
            profile.staff_ref = d['staff_ref']
            profile.department = d['department']
            profile.qualification = d['qualification']
            profile.consultation_fee = DEFAULT_FEE
            profile.save()
            self.stdout.write(f"  {'+' if created else '='} Dr. {user.get_full_name()} -> {d['staff_ref']} ({profile.department}, {profile.consultation_fee})")

        for email, refs in ASSISTANT_FOR.items():
            assistant = User.objects.filter(email=email).first()
            if not assistant:
                continue
            for ref in refs:
                doctor = DoctorProfile.objects.filter(staff_ref=ref).first()
                if doctor:
                    AssistantAssignment.objects.update_or_create(assistant=assistant, doctor=doctor, defaults={'active': True})
                    self.stdout.write(f"  = {assistant.get_full_name()} assists Dr. {doctor.user.get_full_name()}")
        self.stdout.write(self.style.SUCCESS('OPD seed done.'))
