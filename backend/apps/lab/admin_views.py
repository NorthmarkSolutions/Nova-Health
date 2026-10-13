"""
Lab Admin API (Phase 4). `GET /lab/admin/state/` returns the whole Lab Admin picture in the shape the
Lab Admin screens read; every change has its own endpoint, checks the Lab Admin role and writes an
audit entry (entity "LabAdmin"), which is the screen's change history.

Prices are not changed here directly: Billing's tariff master is the price authority, so submitting a
price raises a Billing tariff change request that Billing approves (segregation of duties).
"""
import datetime
import re
import uuid
from decimal import Decimal, InvalidOperation

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import RoleType, User
from apps.audit.models import AuditLog
from .models import (
    Equipment,
    EquipmentMaintenanceLog,
    EquipmentStatus,
    LabPriceDraft,
    LabPurchaseRequest,
    LabRosterCell,
    LabRosterWeek,
    LabSettings,
    LabStaffCategory,
    LabStaffProfile,
    LabStaffRequest,
    LabStockItem,
    LabTest,
    PurchaseStatus,
)
from .serializers import full_name

LAB_ADMINS = {RoleType.DEPARTMENT_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.SUPER_ADMIN}
STAFF_ROLES = (RoleType.LAB_TECH, RoleType.PATHOLOGIST, RoleType.NURSE)
SHIFT_CODES = ('M', 'D', 'E', 'N', 'OC', 'L', 'O')
FINANCE_THRESHOLD = Decimal('50000')  # purchase requests above this go to Finance


class IsLabAdmin(BasePermission):
    message = 'Only the Lab Admin can make this change.'

    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and (getattr(u, 'role', None) in LAB_ADMINS or u.is_superuser))


# --------------------------------------------------------------------------- helpers

def log(request, area, text, **details):
    AuditLog.objects.create(
        action=f'LAB_ADMIN_{area.upper()}', entity_name='LabAdmin', entity_id=area,
        performed_by=request.user, details={'area': area, 'text': text, **details},
    )


def monday(day=None):
    day = day or timezone.localdate()
    return day - datetime.timedelta(days=day.weekday())


def active_week():
    """The roster being worked on: the newest week that is not in the past (created for this week if none)."""
    week = LabRosterWeek.objects.filter(week_start__gte=monday()).order_by('-week_start').first()
    if not week:
        week = LabRosterWeek.objects.filter(week_start__lt=monday()).order_by('-week_start').first()
    if not week:
        week = LabRosterWeek.objects.create(week_start=monday())
    return week


def parse_date(value, field):
    if value in (None, ''):
        return None
    try:
        return datetime.date.fromisoformat(str(value)[:10])
    except ValueError:
        raise ValidationError({'error': f'{field} must be a date (YYYY-MM-DD).'})


def money(value, field):
    try:
        v = Decimal(str(value))
    except (InvalidOperation, TypeError):
        raise ValidationError({'error': f'{field} must be a number.'})
    if v < 0:
        raise ValidationError({'error': f'{field} cannot be negative.'})
    return v.quantize(Decimal('0.01'))


def iso(value):
    return value.isoformat() if value else None


def minutes_from_text(text, default):
    m = re.search(r'([\d.]+)\s*(h|m)', str(text or ''), re.I)
    if not m:
        return default
    n = float(m.group(1))
    return int(n * 60 if m.group(2).lower() == 'h' else n)


def critical_ack_minutes(default=15):
    """Read-back window from the department settings (e.g. "15 minutes")."""
    data = LabSettings.current().data or {}
    return minutes_from_text(data.get('criticalAckWindow'), default)


# --------------------------------------------------------------------------- snapshot

def staff_json(p):
    u = p.user
    return {
        'id': str(p.id), 'userId': str(u.id), 'name': full_name(u), 'code': p.code, 'role': p.role_title,
        'category': p.category, 'section': p.section, 'qualification': p.qualification,
        'licenceNumber': p.licence_number or None, 'credentialName': p.credential_name,
        'credentialExpiry': iso(p.credential_expiry), 'nablTrained': p.nabl_trained,
        'phone': getattr(u, 'phone_number', None) or None, 'email': u.email or None, 'bench': p.bench or None,
        'joinedOn': iso(p.joined_on), 'suspended': p.suspended, 'accountRole': u.role,
    }


def pricing_snapshot():
    """Live Billing prices (TariffMaster) for lab tests, plus price changes waiting in Billing."""
    from apps.billing.models import TariffChangeRequest, TariffChangeStatus, TariffMaster, TariffRevisionLog

    tests = {t.test_code: t for t in LabTest.objects.filter(is_active=True)}
    tariffs, pending = {}, {}
    for t in TariffMaster.objects.filter(department='LAB').exclude(code__istartswith='RAD'):
        test = tests.get(t.code)
        name = test.name if test else t.name
        last = TariffRevisionLog.objects.filter(tariff=t, applied_at__isnull=False).order_by('-effective_from').first()
        tariffs[name] = {
            'testName': name, 'code': t.code, 'basePrice': float(t.base_price),
            'tpaPrice': float(test.tpa_price) if test else float(t.base_price),
            'statSurcharge': (test.stat_surcharge if test else '') or 'Not offered',
            'effectiveDate': iso(last.effective_from) if last else iso(t.updated_at.date() if hasattr(t, 'updated_at') and t.updated_at else None),
            'active': t.is_active,
        }
    for r in TariffChangeRequest.objects.filter(department='LAB', status__in=[TariffChangeStatus.PENDING, TariffChangeStatus.APPROVED]).order_by('-created_at'):
        test = tests.get(r.service_code)
        name = test.name if test else r.service_name
        if name not in pending:
            pending[name] = {
                'requestNumber': r.request_number, 'code': r.service_code, 'proposedPrice': float(r.proposed_price),
                'currentPrice': float(r.current_price), 'effectiveFrom': iso(r.effective_from), 'status': r.status,
                'statusLabel': r.get_status_display(),
            }
    return {'tariffs': tariffs, 'pending': pending}


def build_state():
    week = active_week()
    staff = list(LabStaffProfile.objects.select_related('user'))
    cells = {str(p.id): ['O'] * 7 for p in staff}
    for c in LabRosterCell.objects.filter(week=week):
        cells.setdefault(str(c.staff_id), ['O'] * 7)[c.day] = c.code

    equipment = {}
    for e in Equipment.objects.prefetch_related('maintenance_logs__performed_by'):
        if not e.code:
            continue
        equipment[e.code] = {
            'lastPm': iso(e.last_pm_date) or '', 'nextPm': iso(e.next_pm_date) or '', 'contract': e.service_contract or '',
            'contractEnds': iso(e.contract_ends),
            'log': [{'at': iso(l.date), 'text': l.notes or l.log_type, 'by': full_name(l.performed_by) or '—'} for l in e.maintenance_logs.all()[:50]],
        }

    settings = LabSettings.current()
    events = [
        {'at': iso(a.created_at), 'by': full_name(a.performed_by) or 'System', 'text': (a.details or {}).get('text', a.action), 'area': (a.details or {}).get('area', 'settings')}
        for a in AuditLog.objects.filter(entity_name='LabAdmin').select_related('performed_by').order_by('-created_at')[:200]
    ]
    return {
        'staff': [staff_json(p) for p in staff],
        'roster': {
            'weekStart': iso(week.week_start), 'cells': cells, 'published': week.published,
            'publishedAt': iso(week.published_at), 'editedAt': iso(week.edited_at),
        },
        'requests': [
            {
                'id': str(r.id), 'staffId': str(r.staff_id), 'type': r.type, 'days': r.days, 'reason': r.reason,
                'withStaffId': str(r.with_staff_id) if r.with_staff_id else None, 'status': r.status,
                'raisedAt': iso(r.raised_at), 'decidedAt': iso(r.decided_at),
            }
            for r in LabStaffRequest.objects.filter(week=week)
        ],
        'equipment': equipment,
        'stock': [
            {
                'id': str(i.id), 'name': i.name, 'category': i.category, 'unit': i.unit, 'onHand': i.on_hand,
                'reorderAt': i.reorder_at, 'maxLevel': i.max_level, 'expiry': iso(i.expiry), 'lot': i.lot or None, 'supplier': i.supplier or None,
            }
            for i in LabStockItem.objects.all()
        ],
        'purchases': [
            {
                'id': str(p.id), 'code': p.code, 'stockId': str(p.stock_item_id) if p.stock_item_id else None, 'item': p.item,
                'qty': p.qty, 'unit': p.unit, 'estCost': float(p.est_cost), 'status': p.status, 'raisedAt': iso(p.raised_at),
                'raisedBy': full_name(p.raised_by) or '—', 'decidedAt': iso(p.decided_at),
            }
            for p in LabPurchaseRequest.objects.select_related('raised_by')
        ],
        'priceDrafts': {
            d.test.name: {
                'testName': d.test.name, 'code': d.test.test_code, 'basePrice': float(d.base_price), 'tpaPrice': float(d.tpa_price),
                'statSurcharge': d.stat_surcharge, 'effectiveDate': iso(d.effective_date), 'savedAt': iso(d.saved_at),
            }
            for d in LabPriceDraft.objects.select_related('test')
        },
        'settings': {**(settings.data or {}), 'savedAt': iso(settings.saved_at), 'savedBy': full_name(settings.saved_by)},
        'events': events,
    }


class LabAdminStateView(APIView):
    """Everything the Lab Admin screens read. Lab staff may read it (roster, settings); only Lab Admin changes it."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(build_state())


class LabPricingView(APIView):
    """Live lab prices from Billing (readable by every signed-in user: doctors see them when ordering)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(pricing_snapshot())


# --------------------------------------------------------------------------- staff & roster

class StaffCandidatesView(APIView):
    """User accounts that can join the lab team and are not on it yet (accounts are created by Hospital Admin)."""
    permission_classes = [IsLabAdmin]

    def get(self, request):
        users = User.objects.filter(role__in=STAFF_ROLES, is_active=True, lab_profile__isnull=True).order_by('first_name')
        return Response([
            {'id': str(u.id), 'name': full_name(u), 'username': u.username, 'email': u.email, 'phone': getattr(u, 'phone_number', None), 'role': u.role, 'roleLabel': u.get_role_display()}
            for u in users
        ])


def apply_profile_fields(p, data):
    if 'code' in data:
        code = str(data['code'] or '').strip().upper()
        if not code:
            raise ValidationError({'error': 'Employee code is required.'})
        if LabStaffProfile.objects.filter(code__iexact=code).exclude(id=p.id).exists():
            raise ValidationError({'error': f'Employee code {code} is already used.'})
        p.code = code
    if 'role' in data:
        p.role_title = str(data['role'] or '')[:80]
    if 'category' in data:
        if data['category'] not in LabStaffCategory.values:
            raise ValidationError({'error': 'Category must be Pathologist, Technologist or Phlebotomist.'})
        p.category = data['category']
    for field, key in (('section', 'section'), ('qualification', 'qualification'), ('licence_number', 'licenceNumber'), ('credential_name', 'credentialName'), ('bench', 'bench')):
        if key in data:
            setattr(p, field, str(data[key] or '')[:120])
    if 'credentialExpiry' in data:
        p.credential_expiry = parse_date(data['credentialExpiry'], 'Credential expiry')
    if 'joinedOn' in data:
        p.joined_on = parse_date(data['joinedOn'], 'Joined on')
    if 'nablTrained' in data:
        p.nabl_trained = bool(data['nablTrained'])
    if 'suspended' in data:
        p.suspended = bool(data['suspended'])


class StaffView(APIView):
    permission_classes = [IsLabAdmin]

    def post(self, request):
        data = request.data
        try:
            user = User.objects.get(id=uuid.UUID(str(data.get('userId'))))
        except (User.DoesNotExist, ValueError, TypeError):
            raise ValidationError({'error': 'Choose the staff member\'s user account.'})
        if LabStaffProfile.objects.filter(user=user).exists():
            raise ValidationError({'error': f'{full_name(user)} is already on the lab team.'})
        p = LabStaffProfile(user=user, code=str(data.get('code') or user.username).upper(), role_title='', category=LabStaffCategory.TECHNOLOGIST)
        apply_profile_fields(p, {**data, 'code': data.get('code') or user.username})
        if not p.role_title:
            raise ValidationError({'error': 'Role is required.'})
        default_shift = str(data.get('defaultShift') or 'M')
        if default_shift not in SHIFT_CODES:
            raise ValidationError({'error': 'Unknown default shift.'})
        with transaction.atomic():
            p.save()
            week = active_week()
            for day in range(7):
                LabRosterCell.objects.update_or_create(week=week, staff=p, day=day, defaults={'code': default_shift if day < 5 else 'O'})
            week.published, week.edited_at = False, timezone.now()
            week.save()
        log(request, 'staff', f'Added {full_name(user)} ({p.role_title})', staffId=str(p.id))
        return Response(staff_json(p), status=status.HTTP_201_CREATED)


class StaffDetailView(APIView):
    permission_classes = [IsLabAdmin]

    def patch(self, request, pk):
        p = LabStaffProfile.objects.select_related('user').filter(id=pk).first()
        if not p:
            raise NotFound({'error': 'Staff member not found.'})
        apply_profile_fields(p, request.data)
        p.save()
        log(request, 'staff', f"{'Suspended' if request.data.get('suspended') is True else 'Updated'} {full_name(p.user)}", staffId=str(p.id))
        return Response(staff_json(p))


class RosterShiftView(APIView):
    permission_classes = [IsLabAdmin]

    def post(self, request):
        p = LabStaffProfile.objects.select_related('user').filter(id=request.data.get('staffId')).first()
        day, code = request.data.get('day'), str(request.data.get('code') or '')
        if not p or not isinstance(day, int) or not 0 <= day <= 6 or code not in SHIFT_CODES:
            raise ValidationError({'error': 'staffId, day (0–6) and a shift code are required.'})
        week = active_week()
        LabRosterCell.objects.update_or_create(week=week, staff=p, day=day, defaults={'code': code})
        week.published, week.edited_at = False, timezone.now()
        week.save()
        log(request, 'roster', f"{full_name(p.user)} · {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][day]} set to {code}")
        return Response(build_state()['roster'])


class RosterPublishView(APIView):
    permission_classes = [IsLabAdmin]

    def post(self, request):
        week = active_week()
        week.published, week.published_at, week.published_by = True, timezone.now(), request.user
        week.save()
        log(request, 'roster', f'Published the roster for the week of {week.week_start:%d %b}')
        return Response(build_state()['roster'])


class RosterNextWeekView(APIView):
    """Start next week as a draft with the same pattern."""
    permission_classes = [IsLabAdmin]

    def post(self, request):
        week = active_week()
        nxt, created = LabRosterWeek.objects.get_or_create(week_start=week.week_start + datetime.timedelta(days=7))
        if created:
            LabRosterCell.objects.bulk_create([LabRosterCell(week=nxt, staff_id=c.staff_id, day=c.day, code=c.code) for c in week.cells.all()])
        nxt.edited_at = timezone.now()
        nxt.save()
        log(request, 'roster', f'Started the week of {nxt.week_start:%d %b} from the previous pattern')
        return Response(build_state()['roster'])


class StaffRequestsView(APIView):
    """Raise a leave / swap request (the staff member themselves, or Lab Admin on their behalf)."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data
        p = LabStaffProfile.objects.select_related('user').filter(id=data.get('staffId')).first()
        if not p:
            raise ValidationError({'error': 'Staff member not found.'})
        is_admin = IsLabAdmin().has_permission(request, self)
        if not is_admin and p.user_id != request.user.id:
            return Response({'error': 'You can only raise requests for yourself.'}, status=status.HTTP_403_FORBIDDEN)
        rtype = data.get('type')
        days = data.get('days') or []
        if rtype not in ('Leave', 'Shift swap') or not days or not all(isinstance(d, int) and 0 <= d <= 6 for d in days):
            raise ValidationError({'error': 'type (Leave or Shift swap) and days (0–6) are required.'})
        with_staff = None
        if rtype == 'Shift swap':
            with_staff = LabStaffProfile.objects.filter(id=data.get('withStaffId')).first()
            if not with_staff:
                raise ValidationError({'error': 'A shift swap needs the colleague to swap with.'})
        reason = str(data.get('reason') or '').strip()
        if len(reason) < 3:
            raise ValidationError({'error': 'Give a reason.'})
        r = LabStaffRequest.objects.create(staff=p, week=active_week(), type=rtype, days=sorted(set(days)), reason=reason, with_staff=with_staff)
        log(request, 'staff', f'{rtype} requested for {full_name(p.user)}')
        return Response({'id': str(r.id)}, status=status.HTTP_201_CREATED)


class StaffRequestDecideView(APIView):
    permission_classes = [IsLabAdmin]

    def post(self, request, pk):
        approve = bool(request.data.get('approve'))
        with transaction.atomic():
            r = LabStaffRequest.objects.select_for_update().select_related('staff__user', 'with_staff', 'week').filter(id=pk).first()
            if not r:
                raise NotFound({'error': 'Request not found.'})
            if r.status != 'Pending':
                raise ValidationError({'error': f'This request was already {r.status.lower()}.'})
            if approve:
                def cell(staff, day):
                    c, _ = LabRosterCell.objects.get_or_create(week=r.week, staff=staff, day=day, defaults={'code': 'O'})
                    return c
                for day in r.days:
                    a = cell(r.staff, day)
                    if r.type == 'Leave':
                        a.code = 'L'
                        a.save()
                    elif r.with_staff:
                        b = cell(r.with_staff, day)
                        a.code, b.code = b.code, a.code
                        a.save()
                        b.save()
                r.week.published, r.week.edited_at = False, timezone.now()
                r.week.save()
            r.status = 'Approved' if approve else 'Rejected'
            r.decided_at, r.decided_by = timezone.now(), request.user
            r.save()
        log(request, 'staff', f"{r.status} {r.type.lower()} for {full_name(r.staff.user)}")
        return Response(build_state())


# --------------------------------------------------------------------------- equipment

class EquipmentLogView(APIView):
    permission_classes = [IsLabAdmin]

    def post(self, request, code):
        eq = Equipment.objects.filter(code=code).first()
        if not eq:
            raise NotFound({'error': f"Analyzer '{code}' was not found."})
        text = str(request.data.get('text') or '').strip()
        kind = str(request.data.get('kind') or 'pm')
        if len(text) < 3:
            raise ValidationError({'error': 'Describe the service entry.'})
        EquipmentMaintenanceLog.objects.create(equipment=eq, log_type={'pm': 'PREVENTIVE', 'calibration': 'CALIBRATION', 'ticket': 'SERVICE_TICKET'}.get(kind, 'PREVENTIVE'), performed_by=request.user, notes=text)
        if kind == 'pm':
            eq.last_pm_date = timezone.localdate()
            eq.next_pm_date = eq.last_pm_date + datetime.timedelta(days=90)
            eq.save()
        log(request, 'equipment', f'{eq.name}: {text}')
        return Response(build_state()['equipment'].get(code))


class AnalyzerRegisterView(APIView):
    permission_classes = [IsLabAdmin]

    def post(self, request):
        data = request.data
        name, serial = str(data.get('name') or '').strip(), str(data.get('serial') or '').strip()
        if not name or not serial:
            raise ValidationError({'error': 'Name and serial number are required.'})
        if Equipment.objects.filter(serial_number__iexact=serial).exists():
            raise ValidationError({'error': 'An analyzer with this serial number is already registered.'})
        base = 'an-' + re.sub(r'[^a-z0-9]+', '', name.lower())[:20]
        code, n = base, 2
        while Equipment.objects.filter(code=code).exists():
            code, n = f'{base}{n}', n + 1
        today = timezone.localdate()
        eq = Equipment.objects.create(
            code=code, name=name, serial_number=serial, section=str(data.get('section') or 'Chemistry'), status=EquipmentStatus.READY,
            tests_covered=str(data.get('testsCovered') or ''), service_contract=str(data.get('contract') or 'Warranty'),
            last_pm_date=today, next_pm_date=today + datetime.timedelta(days=90),
        )
        EquipmentMaintenanceLog.objects.create(equipment=eq, log_type='INSTALLATION', performed_by=request.user, notes='Installed and registered')
        log(request, 'equipment', f'Registered analyzer {name} ({serial})', code=code)
        return Response({'code': code}, status=status.HTTP_201_CREATED)


# --------------------------------------------------------------------------- stock & purchases

class StockView(APIView):
    permission_classes = [IsLabAdmin]

    def post(self, request):
        d = request.data
        name = str(d.get('name') or '').strip()
        if not name or not str(d.get('unit') or '').strip():
            raise ValidationError({'error': 'Name and unit are required.'})
        try:
            on_hand, reorder, max_level = int(d.get('onHand') or 0), int(d.get('reorderAt') or 0), int(d.get('maxLevel') or 0)
        except (TypeError, ValueError):
            raise ValidationError({'error': 'Quantities must be whole numbers.'})
        if min(on_hand, reorder, max_level) < 0 or (max_level and reorder > max_level):
            raise ValidationError({'error': 'Reorder level must be between 0 and the maximum level.'})
        item = LabStockItem.objects.create(
            name=name, category=str(d.get('category') or 'Reagent'), unit=str(d['unit']).strip(), on_hand=on_hand, reorder_at=reorder,
            max_level=max_level, expiry=parse_date(d.get('expiry'), 'Expiry'), lot=str(d.get('lot') or ''), supplier=str(d.get('supplier') or ''),
        )
        log(request, 'stock', f'Added stock item {name}')
        return Response({'id': str(item.id)}, status=status.HTTP_201_CREATED)


class PurchaseView(APIView):
    permission_classes = [IsLabAdmin]

    def post(self, request):
        d = request.data
        stock = LabStockItem.objects.filter(id=d.get('stockId')).first() if d.get('stockId') else None
        try:
            qty = int(d.get('qty'))
        except (TypeError, ValueError):
            qty = 0
        cost = money(d.get('estCost'), 'Estimated cost')
        if qty <= 0 or cost <= 0:
            raise ValidationError({'error': 'Enter a quantity and an estimated cost above zero.'})
        for _ in range(5):
            last = 0
            for c in LabPurchaseRequest.objects.values_list('code', flat=True):
                m = re.search(r'(\d+)$', c or '')
                last = max(last, int(m.group(1)) if m else 0)
            try:
                with transaction.atomic():
                    pr = LabPurchaseRequest.objects.create(
                        code=f'PR-LAB-{last + 1:03d}', stock_item=stock, item=str(d.get('item') or (stock.name if stock else '')).strip(),
                        qty=qty, unit=str(d.get('unit') or (stock.unit if stock else '')), est_cost=cost,
                        status=PurchaseStatus.AWAITING_FINANCE if cost > FINANCE_THRESHOLD else PurchaseStatus.AWAITING_APPROVAL,
                        raised_by=request.user,
                    )
                break
            except IntegrityError:
                pr = None
                continue
        if not pr:
            return Response({'error': 'Could not allocate a purchase request number; try again.'}, status=status.HTTP_409_CONFLICT)
        log(request, 'stock', f'Raised {pr.code} · {pr.item} × {qty} {pr.unit}', code=pr.code)
        return Response({'id': str(pr.id), 'code': pr.code, 'status': pr.status}, status=status.HTTP_201_CREATED)


ALLOWED_PURCHASE_MOVES = {
    PurchaseStatus.AWAITING_APPROVAL: {PurchaseStatus.ORDERED, PurchaseStatus.REJECTED},
    PurchaseStatus.AWAITING_FINANCE: {PurchaseStatus.ORDERED, PurchaseStatus.REJECTED},
    PurchaseStatus.ORDERED: {PurchaseStatus.DELIVERED},
}


class PurchaseStatusView(APIView):
    permission_classes = [IsLabAdmin]

    def post(self, request, pk):
        new = request.data.get('status')
        with transaction.atomic():
            pr = LabPurchaseRequest.objects.select_for_update().filter(id=pk).first()
            if not pr:
                raise NotFound({'error': 'Purchase request not found.'})
            if new not in ALLOWED_PURCHASE_MOVES.get(pr.status, set()):
                raise ValidationError({'error': f'{pr.code} is {pr.status.lower()}; it cannot be marked {str(new).lower()}.'})
            pr.status, pr.decided_at, pr.decided_by = new, timezone.now(), request.user
            pr.save()
            if new == PurchaseStatus.DELIVERED and pr.stock_item_id:
                item = LabStockItem.objects.select_for_update().get(id=pr.stock_item_id)
                item.on_hand += pr.qty
                item.save()
        log(request, 'stock', f'{pr.code} marked {new.lower()}', code=pr.code)
        return Response({'id': str(pr.id), 'status': pr.status})


# --------------------------------------------------------------------------- pricing

def test_by_code(code):
    t = LabTest.objects.filter(test_code__iexact=str(code or '')).first()
    if not t:
        raise ValidationError({'error': f"Test '{code}' is not in the lab catalog."})
    return t


class PriceDraftView(APIView):
    permission_classes = [IsLabAdmin]

    def post(self, request):
        d = request.data
        test = test_by_code(d.get('code'))
        base, tpa = money(d.get('basePrice'), 'Base price'), money(d.get('tpaPrice'), 'TPA price')
        if base <= 0 or tpa <= 0:
            raise ValidationError({'error': 'Prices must be above zero.'})
        if tpa > base:
            raise ValidationError({'error': 'TPA / panel price cannot be higher than the base price.'})
        effective = parse_date(d.get('effectiveDate'), 'Effective date') or timezone.localdate()
        if effective < timezone.localdate():
            raise ValidationError({'error': 'The effective date cannot be in the past.'})
        LabPriceDraft.objects.update_or_create(test=test, defaults={'base_price': base, 'tpa_price': tpa, 'stat_surcharge': str(d.get('statSurcharge') or '')[:50], 'effective_date': effective, 'saved_by': request.user})
        log(request, 'pricing', f'Saved draft price for {test.name}')
        return Response(build_state()['priceDrafts'])


class PriceDraftDiscardView(APIView):
    permission_classes = [IsLabAdmin]

    def post(self, request):
        test = test_by_code(request.data.get('code'))
        LabPriceDraft.objects.filter(test=test).delete()
        log(request, 'pricing', f'Discarded draft price for {test.name}')
        return Response(build_state()['priceDrafts'])


class PriceSubmitView(APIView):
    """Send drafts to Billing as tariff change requests. TPA price and STAT surcharge are lab-owned and apply now."""
    permission_classes = [IsLabAdmin]

    def post(self, request):
        from apps.billing.services import TariffGovernanceService

        codes = request.data.get('codes') or []
        drafts = LabPriceDraft.objects.select_related('test').filter(test__test_code__in=codes) if codes else LabPriceDraft.objects.select_related('test')
        submitted, errors = [], []
        for d in drafts:
            t = d.test
            note = str(request.data.get('justification') or '').strip() or f'Lab Admin price revision for {t.name} ({t.test_code})'
            try:
                with transaction.atomic():
                    req = TariffGovernanceService.propose_change(request.user, {
                        'service_code': t.test_code, 'service_name': t.name, 'department': 'LAB', 'owner_department': 'LAB',
                        'proposed_price': str(d.base_price), 'effective_from': d.effective_date.isoformat(), 'justification': note,
                    })
                    t.tpa_price, t.stat_surcharge = d.tpa_price, d.stat_surcharge or t.stat_surcharge
                    t.save(update_fields=['tpa_price', 'stat_surcharge', 'updated_at'])
                    d.delete()
                submitted.append({'testName': t.name, 'requestNumber': req.request_number})
                log(request, 'pricing', f'Sent {t.name} ₹{d.base_price:,.2f} to Billing ({req.request_number})', requestNumber=req.request_number)
            except (ValueError, PermissionError) as exc:
                errors.append({'testName': t.name, 'error': str(exc)})
        return Response({'submitted': submitted, 'errors': errors, 'pricing': pricing_snapshot()}, status=status.HTTP_200_OK)


# --------------------------------------------------------------------------- settings

SETTINGS_KEYS = {
    'deptName', 'location', 'hod', 'intercom', 'nablNo', 'nablValidTo', 'hours', 'batchSignoff', 'autoFlag', 'retestRoute',
    'criticalAckWindow', 'escalateTo', 'barcodeFormat', 'rejectionReasons', 'notifyCriticalInApp', 'notifyCriticalSms',
    'notifyIpdNurse', 'notifyDoctorAssistant', 'reportReadySms', 'reportTemplate', 'digitalSignature', 'showPreviousResult', 'labelPrinter',
}


class SettingsView(APIView):
    permission_classes = [IsLabAdmin]

    def post(self, request):
        incoming = request.data.get('settings') or {}
        if not isinstance(incoming, dict):
            raise ValidationError({'error': 'settings must be an object.'})
        unknown = set(incoming) - SETTINGS_KEYS - {'savedAt', 'savedBy'}
        if unknown:
            raise ValidationError({'error': f"Unknown settings: {', '.join(sorted(unknown))}."})
        if 'criticalAckWindow' in incoming and minutes_from_text(incoming['criticalAckWindow'], None) is None:
            raise ValidationError({'error': 'Critical acknowledgement window must be a time such as "15 minutes".'})
        s = LabSettings.current()
        before = dict(s.data or {})
        s.data = {**before, **{k: v for k, v in incoming.items() if k in SETTINGS_KEYS}}
        s.saved_by, s.saved_at = request.user, timezone.now()
        s.save()
        changed = sorted(k for k in SETTINGS_KEYS if before.get(k) != s.data.get(k))
        log(request, 'settings', f"Updated department settings{': ' + ', '.join(changed) if changed else ''}", changed=changed)
        return Response(build_state()['settings'])
