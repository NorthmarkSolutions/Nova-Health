"""Cross-department workflow runner (plan §9). Drives the LIVE server over HTTP with the real logins, one actor per
step, and checks the database after every step. Rows are left in place for inspection — back up the DB first.

    python manage.py opd_workflow --case wf1          # normal OPD visit, doctor does the consultation
    python manage.py opd_workflow --case wf1a         # same, the doctor assistant does the doctor's work
"""
import json
import time
import urllib.error
import urllib.request
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db.models import Sum
from django.utils import timezone


def Patient_id(uhid):
    from apps.patients.models import Patient
    return Patient.objects.get(uhid=uhid).id

PASSWORD = 'Password123!'
LOGINS = {
    'reception': 'reception@northhospital.com', 'nurse': 'nurse@northhospital.com',
    'doctor': 'doctor@northhospital.com', 'assistant': 'assistant@northhospital.com',
    'other_doctor': 'alisha.patel@northhospital.com', 'pharmacist': 'pharmacy@northhospital.com',
    'cashier': 'cashier@northhospital.com', 'supervisor': 'billing.supervisor@northhospital.com',
    'accountant': 'accounts.admin@northhospital.com', 'lab_tech': 'lab@northhospital.com',
    'pathologist': 'pathologist@northhospital.com', 'rec_supervisor': 'reception.supervisor@northhospital.com',
    'opd_admin': 'opd.admin@northhospital.com',
}
LAB_TESTS = [
    {'code': 'HEM-CBC-01', 'analyzer': 'Sysmex CA-600',
     'values': {'Hemoglobin': '12.1', 'WBC Count': '32.5', 'Platelet Count': '210', 'RBC Count': '4.6'}},  # WBC critical
    {'code': 'BIO-LFT-01', 'analyzer': 'Beckman AU680',
     'values': {'Total Bilirubin': '0.9', 'SGOT (AST)': '32', 'SGPT (ALT)': '38', 'Alkaline Phosphatase': '96'}},
]
MEDICINES = [
    {'name': 'Azithromycin 500 mg tablet', 'dose': '1 tab', 'frequency': 'OD', 'days': 3, 'timing': 'After food'},
    {'name': 'Amoxicillin + Clavulanic acid 625 mg tablet', 'dose': '1 tab', 'frequency': '1-0-1', 'days': 5, 'timing': 'After food'},
]


class Fail(Exception):
    pass


class Command(BaseCommand):
    help = 'Run an OPD cross-department workflow case against the live server and check the database.'

    def add_arguments(self, parser):
        parser.add_argument('--case', default='wf1', choices=['wf1', 'wf1a', 'wf2', 'wf3', 'wf4', 'wf5', 'wf6', 'wf7', 'wf8', 'noshow'])
        parser.add_argument('--base', default='http://localhost:8000/api/v1')

    # ------------------------------------------------------------------ plumbing
    def api(self, who, method, path, body=None, expect=(200, 201)):
        req = urllib.request.Request(self.base + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                                     headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {self.token(who)}'})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                code, data = r.status, json.loads(r.read() or b'{}')
        except urllib.error.HTTPError as e:
            code, raw = e.code, e.read()
            try:
                data = json.loads(raw or b'{}')
            except ValueError:
                data = {'raw': raw[:300].decode(errors='ignore')}
        if code not in (expect if isinstance(expect, tuple) else (expect,)):
            raise Fail(f"{who} {method} {path} -> {code} {json.dumps(data)[:400]}")
        return data

    def token(self, who):
        if who not in self._tokens:
            req = urllib.request.Request(self.base + '/auth/login', method='POST', headers={'Content-Type': 'application/json'},
                                         data=json.dumps({'emailOrUsername': LOGINS[who], 'password': PASSWORD}).encode())
            with urllib.request.urlopen(req, timeout=30) as r:
                self._tokens[who] = json.loads(r.read())['accessToken']
        return self._tokens[who]

    def expect(self, cond, msg):
        if not cond:
            raise Fail(msg)

    def step(self, n, actor, action, fn):
        t = time.time()
        try:
            detail = fn() or ''
            self.rows.append((n, actor, action, 'PASS', detail))
            self.stdout.write(self.style.SUCCESS(f"  PASS  {n:<4} {actor:<11} {action}") + (f"  — {detail}" if detail else '') + f"  ({time.time() - t:.1f}s)")
        except Fail as e:
            self.rows.append((n, actor, action, 'FAIL', str(e)))
            self.stdout.write(self.style.ERROR(f"  FAIL  {n:<4} {actor:<11} {action}  — {e}"))
            raise

    # ------------------------------------------------------------------ case
    def handle(self, *args, **opts):
        self.base, self._tokens, self.rows, self.ctx = opts['base'].rstrip('/'), {}, [], {}
        case = opts['case']
        clinician = 'assistant' if case == 'wf1a' else 'doctor'
        title = {'wf1': 'normal OPD visit, consultation by the doctor', 'wf1a': 'normal OPD visit, consultation by the assistant',
                 'wf2': 'OPD visit with lab tests', 'wf3': 'OPD visit with treatment-room doses', 'wf4': 'OPD visit with day-care observation', 'wf5': 'follow-up: advised, booked, checked in', 'wf6': 'emergency token, Code Blue, doctor attends', 'wf7': 'OPD admin configuration takes effect', 'wf8': 'negative and integrity cases', 'noshow': 'paid visits that end as no-show (supervisor fee decisions)'}[case]
        self.stdout.write(f"\n{case.upper()} — {title}\n")
        try:
            if case == 'noshow':
                self.run_noshow()
            elif case == 'wf3':
                self.run_wf3()
            elif case == 'wf4':
                self.run_wf4()
            elif case == 'wf5':
                self.run_wf5()
            elif case == 'wf6':
                self.run_wf6()
            elif case == 'wf7':
                self.run_wf7()
            elif case == 'wf8':
                self.run_wf8()
            else:
                self.run_wf1(clinician, lab=(case == 'wf2'))
        except Fail:
            self.stdout.write(self.style.ERROR(f"\n{case.upper()} FAILED"))
            raise CommandError('workflow failed')
        self.stdout.write(self.style.SUCCESS(f"\n{case.upper()} PASSED — all {len(self.rows)} steps and consistency checks"))

    def run_wf1(self, clinician, lab=False):
        from apps.patients.models import Patient
        from apps.opd.models import OpdVisit, TriageAssessment
        from apps.billing.models import BillableChargeItem, Invoice, Payment, CounterShift
        from apps.clinical.models import Consultation, Prescription
        from apps.pharmacy.models import PharmacyDispenseOrder, PharmacyStockTransaction
        from apps.accounting.models import FinancialEvent, Journal
        c = self.ctx
        stamp = timezone.now().strftime('%H%M%S')
        c['start'] = timezone.now()

        def s1():
            p = self.api('reception', 'POST', '/patients/', {
                'firstName': 'Wf', 'lastName': f'Patient{stamp}', 'dateOfBirth': '1988-04-12', 'gender': 'FEMALE',
                'phoneNumber': f'98{stamp}00', 'allergies': [], 'chronicConditions': []})
            c['uhid'] = p['uhid']
            pat = Patient.objects.filter(uhid=c['uhid'])
            self.expect(pat.count() == 1, 'patient row missing or UHID not unique')
            c['patient'] = pat.first()
            return f"UHID {c['uhid']}"
        self.step('1', 'reception', 'register patient', s1)

        def s2():
            v = self.api('reception', 'POST', '/opd/visits/', {'uhid': c['uhid'], 'doctor': 'stf-1', 'visit_type': 'NEW'})
            c['visit_id'] = v['id']
            visit = OpdVisit.objects.get(id=v['id'])
            self.expect(visit.status == 'WAITING' and visit.fee_status == 'UNPAID', f'visit {visit.status}/{visit.fee_status}')
            charge = BillableChargeItem.objects.get(department='OPD', source_reference_id=str(visit.appointment_id))
            self.expect(charge.total_amount == visit.fee_amount, f'charge {charge.total_amount} != visit fee {visit.fee_amount}')
            c['consult_charge'] = charge
            # cashier collects the consultation fee on the open shift
            pay = self.api('cashier', 'POST', '/billing/cashier/bill-and-collect/', {
                'uhid': c['uhid'], 'charge_ids': [str(charge.id)], 'encounter_type': 'OPD',
                'split_payments': [{'tender_mode': 'CASH', 'amount': str(charge.total_amount)}]})
            charge.refresh_from_db()
            inv = charge.invoice
            self.expect(inv and inv.status == 'PAID', f'consultation invoice not PAID ({inv and inv.status})')
            self.expect(Payment.objects.filter(invoice=inv, shift__status='OPEN').exists(), 'payment not on an open counter shift')
            c['consult_invoice'] = inv
            return f"{visit.visit_number} token {visit.token_number} · fee {visit.fee_amount} · {inv.invoice_number} PAID"
        self.step('2', 'reception', 'issue walk-in token; cashier collects fee', s2)

        def s2b():
            from apps.opd.models import OpdVisit as V
            visit = V.objects.get(id=c['visit_id'])
            # the visit mirrors billing: fee collected at the cashier
            inv = c['consult_invoice']
            self.expect(FinancialEvent.objects.filter(idempotency_key=f'billing.invoice.created:{inv.invoice_number}', status='posted').exists(),
                       'Accounts did not receive the consultation invoice')
            return 'Accounts journals posted for consultation invoice + receipt'
        self.step('2b', 'accounts', 'consultation revenue reaches Accounts', s2b)

        def s3():
            self.api('nurse', 'POST', f"/opd/visits/{c['visit_id']}/transition/", {'action': 'call_triage'})
            self.api('nurse', 'POST', f"/opd/visits/{c['visit_id']}/transition/", {'action': 'start_triage'})
            # incomplete triage must be refused
            self.api('nurse', 'POST', f"/opd/visits/{c['visit_id']}/triage/submit/", {'vitals': {'bpSys': 128}}, expect=400)
            self.api('nurse', 'POST', f"/opd/visits/{c['visit_id']}/triage/submit/", {
                'chief_complaint': 'Fever and sore throat for 3 days', 'pain_score': 3, 'triage_category': 'STANDARD',
                'allergies': ['Sulfa drugs'], 'conditions': ['Hypothyroidism'],
                'vitals': {'bpSys': 128, 'bpDia': 82, 'pulse': 96, 'temp': 100.8, 'spo2': 98, 'rr': 18, 'height': 162, 'weight': 60}})
            visit = OpdVisit.objects.get(id=c['visit_id'])
            t = TriageAssessment.objects.get(visit=visit)
            self.expect(visit.status == 'READY_FOR_DOCTOR', f'visit {visit.status}')
            self.expect(t.submitted and t.vitals and t.vitals.systolic_bp == 128 and float(t.vitals.temperature) == 100.8, 'vitals not stored')
            self.expect(t.vitals.bmi is not None, 'BMI not computed')
            c['patient'].refresh_from_db()
            self.expect('Sulfa drugs' in c['patient'].allergies, 'allergy not written to the patient record')
            self.expect(visit.appointment.status == 'TRIAGED', 'appointment status not mirrored')
            return f"vitals 128/82, T 100.8, BMI {t.vitals.bmi}; allergy on patient record"
        self.step('3', 'nurse', 'call, triage, record vitals, send to doctor', s3)

        def s4():
            vid = c['visit_id']
            if clinician == 'assistant':
                # an assistant may not act for a doctor they are not assigned to
                other = OpdVisit.objects.get(id=vid)
                from apps.accounts.models import DoctorProfile
                original = other.doctor
                other.doctor = DoctorProfile.objects.get(staff_ref='stf-5')
                other.save(update_fields=['doctor'])
                self.api('assistant', 'POST', f'/opd/visits/{vid}/transition/', {'action': 'call_in'}, expect=403)
                other.doctor = original
                other.save(update_fields=['doctor'])
            # another doctor cannot take this patient
            self.api('other_doctor', 'POST', f'/opd/visits/{vid}/transition/', {'action': 'call_in'}, expect=403)
            self.api(clinician, 'POST', f'/opd/visits/{vid}/transition/', {'action': 'call_in'})
            self.api(clinician, 'POST', f'/opd/visits/{vid}/transition/', {'action': 'seat'})
            if lab:
                self.lab_round(vid)
                self.api(clinician, 'POST', f'/opd/visits/{vid}/transition/', {'action': 'call_in'})
                self.api(clinician, 'POST', f'/opd/visits/{vid}/transition/', {'action': 'seat'})
                draft = OpdVisit.objects.get(id=vid).draft.data
                self.expect(draft.get('diagnosis') == 'Suspected bacterial infection', 'draft not kept while patient was at the lab')
            # completing without a diagnosis is refused
            self.api(clinician, 'POST', f'/opd/visits/{vid}/complete/', {'medicines': MEDICINES}, expect=400)
            body = {'diagnosis': 'Acute pharyngitis', 'advice': 'Warm saline gargles, plenty of fluids', 'medicines': MEDICINES}
            self.api(clinician, 'POST', f'/opd/visits/{vid}/complete/', body)
            self.api(clinician, 'POST', f'/opd/visits/{vid}/complete/', body)  # replay: idempotent
            visit = OpdVisit.objects.get(id=vid)
            self.expect(visit.status == 'COMPLETED', f'visit {visit.status}')
            cons = Consultation.objects.filter(visit=visit)
            self.expect(cons.count() == 1, f'{cons.count()} consultations (expected exactly 1)')
            cons = cons.first()
            self.expect(cons.doctor.staff_ref == 'stf-1', 'consultation not under Dr. Jenkins')
            rx = Prescription.objects.filter(visit=visit)
            self.expect(rx.count() == 1 and rx.first().items.count() == 2, 'prescription / 2 items missing')
            order = PharmacyDispenseOrder.objects.filter(prescription=rx.first()).first()
            self.expect(order and order.status == 'PENDING', 'pharmacy dispense order not queued')
            c['order'] = order
            if clinician == 'assistant':
                self.expect(cons.performed_by.email == LOGINS['assistant'] and cons.on_behalf_of.email == LOGINS['doctor'],
                           'performed_by / on_behalf_of not recorded')
                q = self.api('doctor', 'GET', '/opd/cosign-queue/')
                self.expect(any(i['id'] == str(cons.id) for i in q['items']), "not in the doctor's co-sign queue")
                self.api('assistant', 'POST', f'/opd/consultations/{cons.id}/cosign/', expect=403)
                self.api('doctor', 'POST', f'/opd/consultations/{cons.id}/cosign/')
                cons.refresh_from_db()
                self.expect(cons.co_signed_by and cons.co_signed_by.email == LOGINS['doctor'], 'co-sign not stored')
                return f"entered by assistant for Dr. Jenkins · co-signed · {order.order_number} ({order.total_amount})"
            self.expect(cons.on_behalf_of is None, 'doctor entry wrongly marked as on-behalf')
            return f"{rx.first().prescription_number} · 2 items · {order.order_number} total {order.total_amount}"
        self.step('4', clinician, 'call in, seat, consult, prescribe 2, complete', s4)

        def s5():
            self.api('assistant', 'POST', f"/opd/visits/{c['visit_id']}/checkout/", {'routes': ['PHARMACY']})
            visit = OpdVisit.objects.get(id=c['visit_id'])
            self.expect(visit.status == 'CHECKED_OUT' and visit.checkout_routes == ['PHARMACY'], f'{visit.status} {visit.checkout_routes}')
            return 'checked out → pharmacy'
        self.step('5', 'assistant', 'checkout to pharmacy', s5)

        def s6():
            order = c['order']
            before = {i.medicine_id: (i.medicine.batches.aggregate(s=Sum('available_quantity'))['s'] or 0) for i in order.items.select_related('medicine')}
            self.api('pharmacist', 'POST', f'/pharmacy/dispense-orders/{order.id}/dispense/',
                     {'settlement': {'settlement_mode': 'PAY_AT_RECEPTION'}})
            order.refresh_from_db()
            self.expect(order.status == 'DISPENSED', f'order {order.status}')
            for it in order.items.select_related('medicine'):
                now = it.medicine.batches.aggregate(s=Sum('available_quantity'))['s'] or 0
                self.expect(before[it.medicine_id] - now == it.prescribed_quantity, f'stock for {it.medicine.name} moved {before[it.medicine_id] - now}, expected {it.prescribed_quantity}')
            self.expect(PharmacyStockTransaction.objects.filter(reference_id=order.id).count() >= 2, 'stock transactions missing')
            charge = BillableChargeItem.objects.filter(patient=c['patient'], department='PHARMACY', status='PENDING').first()
            self.expect(charge and charge.total_amount == order.total_amount, f'pharmacy charge {charge and charge.total_amount} != order {order.total_amount}')
            c['pharm_charge'] = charge
            return f"stock deducted · charge {charge.total_amount} sent to the cashier"
        self.step('6', 'pharmacist', 'dispense (pay at billing counter)', s6)

        def s7():
            ch = c['pharm_charge']
            self.api('cashier', 'POST', '/billing/cashier/bill-and-collect/', {
                'uhid': c['uhid'], 'charge_ids': [str(ch.id)], 'encounter_type': 'OPD', 'category': 'PHARMACY',
                'split_payments': [{'tender_mode': 'UPI', 'amount': str(ch.total_amount), 'reference': f'UPI{stamp}'}]})
            ch.refresh_from_db()
            inv = ch.invoice
            self.expect(inv and inv.status == 'PAID', f'pharmacy invoice {inv and inv.status}')
            c['pharm_invoice'] = inv
            return f"{inv.invoice_number} PAID by UPI"
        self.step('7', 'cashier', 'collect pharmacy bill', s7)

        def s8a():
            from apps.billing.services import CounterShiftControlService
            shift = c['consult_invoice'].payments.first().shift
            reg = CounterShiftControlService.compute_register(shift)
            self.api('cashier', 'POST', '/billing/shifts/close', {'shift_id': str(shift.id), 'physical_cash_count': str(reg['expected_cash'])})
            self.api('cashier', 'POST', f'/billing/shifts/{shift.id}/supervisor-signoff', {'action': 'SIGN_OFF'}, expect=(400, 403))
            self.api('supervisor', 'POST', f'/billing/shifts/{shift.id}/supervisor-signoff', {'action': 'SIGN_OFF'})
            shift.refresh_from_db()
            self.expect(shift.variance_status == 'GREEN_MATCH', f'shift variance {shift.variance_status}')
            self.expect(shift.status not in ('OPEN', 'PENDING_APPROVAL'), f'shift {shift.status}')
            self.expect(reg['expected_upi'] >= c['pharm_charge'].total_amount, 'UPI collection missing from the shift register')
            return f"shift {shift.status.lower()} · cash {reg['expected_cash']} / UPI {reg['expected_upi']} matched · four-eyes enforced"
        self.step('8a', 'cashier', 'close shift; supervisor signs off', s8a)

        def s8():
            day = timezone.localdate().isoformat()
            invs = [c['consult_invoice'], c['pharm_invoice']] + ([c['lab_invoice']] if lab else [])
            evs = FinancialEvent.objects.filter(correlation_id__in=[i.invoice_number for i in invs])
            self.expect(evs.count() == 2 * len(invs), f'{evs.count()} Accounts events for {len(invs)} invoices (expected invoice + receipt each)')
            self.expect(not evs.exclude(status='posted').exists(), 'an Accounts event is not posted')
            for e in evs:
                lines = list(e.journal.lines.all())
                self.expect(sum(l.debit for l in lines) == sum(l.credit for l in lines) == e.amount, f'journal for {e.event_type} unbalanced')
            detail = self.api('accountant', 'GET', f'/accounts/close/daily/{day}')
            jsec = next((x for x in detail['sections'] if x['screen'] == 'journals'), None)
            self.expect(jsec and jsec['done'] == jsec['total'], f'day close shows journals incomplete: {jsec}')
            run = self.api('accountant', 'POST', f'/accounts/close/daily/{day}/run', {}, expect=(200, 201, 422))
            err = (run.get('error') or {})
            if err:
                self.expect(err.get('code') == 'BLOCKED_BY_DEPENDENCY', f'day close error {err}')
                unrelated = all(not any(k in d.lower() for k in ('journal', 'billing', 'event')) for d in err.get('details', []))
                self.expect(unrelated, f'day close blocked by this workflow: {err.get("details")}')
                return f"{evs.count()} balanced journals · day close lists them complete; close held by other open items: {'; '.join(err.get('details', []))}"
            return f'{evs.count()} balanced journals · day close run'
        self.step('8', 'accountant', 'Accounts journals + day-close run', s8)

        # ------------------------------------------------------------ consistency
        def cons():
            visit = OpdVisit.objects.get(id=c['visit_id'])
            paid = Payment.objects.filter(patient=c['patient']).aggregate(s=Sum('amount'))['s'] or Decimal('0')
            expected = c['consult_charge'].total_amount + c['pharm_charge'].total_amount + (c['lab_total'] if lab else 0)
            self.expect(paid == expected, f'payments {paid} != consultation + pharmacy {expected}')
            # every record traces back to the one visit
            self.expect(Consultation.objects.get(visit=visit).appointment_id == visit.appointment_id, 'consultation not on the visit appointment')
            self.expect(c['order'].prescription.visit_id == visit.id, 'dispense order not traceable to the visit')
            self.expect(c['consult_charge'].source_reference_id == str(visit.appointment_id), 'consultation charge not on the visit')
            ev = list(visit.events.values_list('action', flat=True))
            want = ['ISSUED', 'CALL_TRIAGE', 'START_TRIAGE', 'TRIAGED', 'CALL_IN', 'SEAT'] + \
                (['SENT_FOR_TESTS', 'REPORTS_READY', 'CALL_IN', 'SEAT'] if lab else []) + ['COMPLETED', 'CHECKED_OUT']
            self.expect([a for a in ev if a in want] == want, f'timeline gaps: {ev}')
            tl = [visit.issued_at, visit.triage_started_at, visit.triaged_at, visit.called_at, visit.seated_at, visit.completed_at, visit.checked_out_at]
            self.expect(all(tl) and tl == sorted(tl), 'visit timestamps missing or out of order')
            if lab:
                from apps.lab.models import LabOrder
                orders = LabOrder.objects.filter(encounter_id=str(visit.id))
                self.expect(orders.count() == 2 and not orders.exclude(status='REPORT_APPROVED').exists(), 'lab orders not all signed')
                for o in orders:
                    self.expect(BillableChargeItem.objects.filter(department='LAB', source_reference_id__in=[str(o.id), o.order_number]).exists(),
                                f'{o.order_number} has no charge')
                    self.expect(o.collected_at and c['lab_invoice'].payments.order_by('payment_date').first().payment_date <= o.collected_at,
                                f'{o.order_number} collected before its charge was paid')
            invs = [c['consult_invoice'], c['pharm_invoice']] + ([c['lab_invoice']] if lab else [])
            acc = FinancialEvent.objects.filter(correlation_id__in=[i.invoice_number for i in invs],
                                                event_type='billing.payment.collected').aggregate(s=Sum('amount'))['s']
            self.expect(acc == paid, f'Accounts receipts {acc} != Billing payments {paid}')
            return f"paid {paid} = Billing = Accounts; 1 visit → consult, Rx, dispense{', 2 lab reports' if lab else ''}, {len(invs)} invoices; timeline complete"
        self.step('C', 'check', 'consistency: money, links, timeline', cons)

    # ------------------------------------------------------------------ WF-2 lab round (inside the doctor step)
    def lab_round(self, vid):
        from apps.opd.models import OpdVisit
        from apps.lab.models import LabOrder
        from apps.billing.models import BillableChargeItem
        c = self.ctx
        self.api('doctor', 'POST', f'/opd/visits/{vid}/send-for-tests/', {
            'tests': [{'code': t['code'], 'priority': 'ROUTINE', 'notes': 'Fever 3 days'} for t in LAB_TESTS],
            'draft': {'diagnosis': 'Suspected bacterial infection', 'notes': 'Review CBC/LFT'}})
        visit = OpdVisit.objects.get(id=vid)
        self.expect(visit.status == 'AWAITING_REPORTS', f'visit {visit.status} after send-for-tests')
        orders = list(LabOrder.objects.filter(encounter_id=str(vid)).select_related('test').order_by('ordered_at'))
        self.expect(len(orders) == 2 and all(o.status == 'ORDERED' for o in orders), 'two ORDERED lab orders expected')
        charges = list(BillableChargeItem.objects.filter(patient=c['patient'], department='LAB', status='PENDING'))
        self.expect(len(charges) == 2, f'{len(charges)} lab charges (expected 2)')
        c['lab_total'] = sum(ch.total_amount for ch in charges)
        # nurse cannot collect before the bill is paid
        self.api('nurse', 'POST', f'/lab/orders/{orders[0].id}/collect-sample/', {}, expect=402)
        orders[0].refresh_from_db()
        self.expect(orders[0].status == 'ORDERED', 'order moved although unpaid')
        self.api('cashier', 'POST', '/billing/cashier/bill-and-collect/', {
            'uhid': c['uhid'], 'charge_ids': [str(ch.id) for ch in charges], 'encounter_type': 'OPD', 'category': 'LAB',
            'split_payments': [{'tender_mode': 'CARD', 'amount': str(c['lab_total']), 'card_last_four': '4242', 'auth_code': 'A1B2C3'}]})
        charges[0].refresh_from_db()
        c['lab_invoice'] = charges[0].invoice
        self.expect(c['lab_invoice'].status == 'PAID', 'lab invoice not paid')
        by_code = {t['code']: t for t in LAB_TESTS}
        from apps.lab.models import Equipment
        for t in LAB_TESTS:  # morning QC on each analyzer, as the technician does before patient samples
            eq = Equipment.objects.get(name=t['analyzer'])
            self.api('lab_tech', 'POST', f'/lab/equipment/{eq.id}/qc/', {'level': 'Level 1 (normal)', 'lot': 'QC-2610-A', 'passed': True})
        for o in orders:
            self.api('nurse', 'POST', f'/lab/orders/{o.id}/collect-sample/', {})
            self.api('lab_tech', 'POST', f'/lab/orders/{o.id}/receive-sample/', {})
            t = by_code[o.test.test_code]
            self.api('lab_tech', 'POST', f'/lab/orders/{o.id}/start-analysis/', {'analyzerName': t['analyzer']})
            self.api('lab_tech', 'POST', f'/lab/orders/{o.id}/results/', {
                'submit': True, 'parameters': [{'paramName': k, 'observedValue': v} for k, v in t['values'].items()]})
        visit.refresh_from_db()
        self.expect(visit.status == 'AWAITING_REPORTS', 'visit left AWAITING_REPORTS before reports were signed')
        cbc = next(o for o in orders if o.test.test_code == 'HEM-CBC-01')
        lft = next(o for o in orders if o.test.test_code == 'BIO-LFT-01')
        self.api('pathologist', 'POST', '/lab/reports/approve/', {'orderId': str(lft.id), 'remarks': ''})
        visit.refresh_from_db()
        self.expect(visit.status == 'AWAITING_REPORTS', 'visit returned to the doctor with one report still unsigned')
        self.api('pathologist', 'POST', '/lab/reports/approve/', {'orderId': str(cbc.id), 'remarks': 'Marked leucocytosis, likely bacterial infection. Clinical correlation advised.'})
        cbc.refresh_from_db()
        self.expect(cbc.is_flagged_critical and hasattr(cbc, 'critical_callback'), 'critical WBC did not raise a call-back')
        self.api('doctor', 'POST', f'/lab/orders/{cbc.id}/acknowledge-critical/', {'readBack': True})
        cbc.refresh_from_db()
        self.expect(cbc.critical_acknowledged_at and cbc.critical_acknowledged_by.email == LOGINS['doctor'], 'critical ack not stored')
        visit.refresh_from_db()
        self.expect(visit.status == 'READY_FOR_DOCTOR', f'visit {visit.status} after all reports signed')
        detail = self.api('doctor', 'GET', f'/opd/visits/{vid}/')
        self.expect(len(detail['labOrders']) == 2 and all(o['results'] for o in detail['labOrders']), 'doctor cannot see the results')
        self.stdout.write(f"        lab: 2 orders · {c['lab_total']} paid by card · samples collected after payment · WBC critical acknowledged · back to doctor")

    # ------------------------------------------------------------------ no-show fee decisions
    def run_noshow(self):
        from apps.opd.models import OpdVisit, OpdFeeReview
        from apps.billing.models import BillableChargeItem
        from apps.accounting.models import FinancialEvent, Refund
        stamp = timezone.now().strftime('%H%M%S')
        c = self.ctx

        def reg(tag):
            p = self.api('reception', 'POST', '/patients/', {'firstName': 'Ns', 'lastName': f'{tag}{stamp}', 'dateOfBirth': '1979-02-02',
                                                             'gender': 'MALE', 'phoneNumber': f'97{stamp}{len(tag)}0'})
            return p['uhid']

        def s1():
            for tag in ('Refund', 'Resched'):
                uhid = reg(tag)
                v = self.api('reception', 'POST', '/opd/visits/', {'uhid': uhid, 'doctor': 'stf-1', 'fee_paid': True,
                                                                   'payment_mode': 'CASH', 'receipt': f'RCP-{tag}-{stamp}'})
                c[tag] = {'uhid': uhid, 'visit': v['id'], 'number': v['visitNumber']}
                self.expect(v['feeStatus'] == 'PAID', 'desk-paid visit not PAID')
                self.expect(FinancialEvent.objects.filter(correlation_id=v['visitNumber'], status='posted').count() == 2,
                            'desk fee not posted to Accounts')
            return f"{c['Refund']['number']}, {c['Resched']['number']} paid at desk · posted to Accounts"
        self.step('1', 'reception', 'two walk-ins pay 75 at the desk', s1)

        def s2():
            for tag in ('Refund', 'Resched'):
                self.api('reception', 'POST', f"/opd/visits/{c[tag]['visit']}/transition/", {'action': 'no_show'}, expect=400)  # reason required
                self.api('reception', 'POST', f"/opd/visits/{c[tag]['visit']}/transition/", {'action': 'no_show', 'reason': 'Not present when called three times'})
                r = OpdFeeReview.objects.filter(visit_id=c[tag]['visit']).first()
                self.expect(r and r.status == 'PENDING' and r.paid_at == 'FRONT_DESK' and r.amount == 75, 'fee review not opened')
                c[tag]['review'] = str(r.id)
            q = self.api('rec_supervisor', 'GET', '/opd/fee-reviews/?status=PENDING')
            self.expect({c['Refund']['review'], c['Resched']['review']} <= {x['id'] for x in q['reviews']}, 'reviews missing from the supervisor list')
            return 'both no-shows waiting in the supervisor fee list'
        self.step('2', 'reception', 'mark no-show (reason required)', s2)

        def s3():
            rid = c['Refund']['review']
            self.api('reception', 'POST', f'/opd/fee-reviews/{rid}/decide/', {'decision': 'REFUND', 'reason': 'ADVANCE_NOTICE', 'note': 'x'}, expect=403)
            self.api('rec_supervisor', 'POST', f'/opd/fee-reviews/{rid}/decide/', {'decision': 'REFUND', 'reason': 'ADVANCE_NOTICE'}, expect=400)  # note required
            self.api('rec_supervisor', 'POST', f'/opd/fee-reviews/{rid}/decide/', {
                'decision': 'REFUND', 'reason': 'ADVANCE_NOTICE', 'note': 'Called at 09:10 to cancel', 'refund_mode': 'CASH'})
            acc = Refund.objects.filter(source_bill_no=c['Refund']['number']).first()
            self.expect(acc and acc.status == 'pending' and acc.amount == 75, 'Accounts refund request not created')
            self.expect(OpdVisit.objects.get(id=c['Refund']['visit']).fee_status == 'REFUNDED', 'visit fee status not REFUNDED')
            self.api('rec_supervisor', 'POST', f'/opd/fee-reviews/{rid}/refund-paid/', expect=400)  # not approved yet
            self.api('rec_supervisor', 'POST', f'/opd/fee-reviews/{rid}/decide/', {'decision': 'RETAIN', 'reason': 'NO_NOTICE'}, expect=400)  # decided once
            return f"refund {acc.reference_no} waiting for Accounts manager approval; cash cannot go out before it"
        self.step('3', 'supervisor', 'informed in advance → refund', s3)

        def s4():
            rid = c['Resched']['review']
            self.api('rec_supervisor', 'POST', f'/opd/fee-reviews/{rid}/decide/', {
                'decision': 'RESCHEDULE', 'reason': 'EMERGENCY', 'note': 'Family emergency, rebooked'})
            before = FinancialEvent.objects.count()
            v = self.api('reception', 'POST', '/opd/visits/', {'uhid': c['Resched']['uhid'], 'doctor': 'stf-1'})
            self.expect(v['feeStatus'] == 'PAID', f"new visit fee {v['feeStatus']} (credit not applied)")
            visit = OpdVisit.objects.get(id=v['id'])
            self.expect(not BillableChargeItem.objects.filter(department='OPD', source_reference_id=str(visit.appointment_id)).exists(),
                        'patient charged again')
            self.expect(FinancialEvent.objects.count() == before, 'revenue posted twice for the carried fee')
            r = OpdFeeReview.objects.get(id=rid)
            self.expect(r.status == 'CREDIT_USED' and r.credit_used_by_id == visit.id, 'credit not linked to the new visit')
            return f"{v['visitNumber']} issued against the carried fee · no new charge, no new revenue"
        self.step('4', 'supervisor', 'emergency → carry fee to rescheduled visit', s4)

    # ------------------------------------------------------------------ WF-3 treatment room
    def run_wf3(self):
        from apps.opd.models import OpdVisit, OpdProcedure
        from apps.billing.models import BillableChargeItem, Payment
        from apps.pharmacy.models import PharmacyDispenseOrder
        from apps.accounting.models import FinancialEvent
        c = self.ctx
        stamp = timezone.now().strftime('%H%M%S')

        def s1():
            p = self.api('reception', 'POST', '/patients/', {'firstName': 'Tr', 'lastName': f'Room{stamp}', 'dateOfBirth': '1992-03-03',
                                                             'gender': 'FEMALE', 'phoneNumber': f'94{stamp}00'})
            c['uhid'] = p['uhid']
            v = self.api('reception', 'POST', '/opd/visits/', {'uhid': p['uhid'], 'doctor': 'stf-1', 'fee_paid': True, 'payment_mode': 'CASH', 'receipt': f'RCP-T{stamp}'})
            c['vid'] = v['id']
            vid = v['id']
            self.api('nurse', 'POST', f'/opd/visits/{vid}/transition/', {'action': 'skip_triage', 'reason': 'Vomiting, doctor asked to see directly'})
            self.api('doctor', 'POST', f'/opd/visits/{vid}/transition/', {'action': 'call_in'})
            self.api('doctor', 'POST', f'/opd/visits/{vid}/transition/', {'action': 'seat'})
            d = self.api('doctor', 'POST', f'/opd/visits/{vid}/complete/', {'diagnosis': 'Acute gastroenteritis', 'medicines': [
                {'name': 'Inj. Ondansetron 4 mg', 'dose': '4 mg IV', 'frequency': 'STAT', 'days': 1},
                {'name': 'Azithromycin 500 mg tablet', 'dose': '1 tab', 'frequency': 'OD', 'days': 3},
                {'name': 'Inj. Pantoprazole 40 mg', 'dose': '40 mg IV', 'frequency': 'STAT', 'days': 1}]})
            rx = d['prescriptions'][0]
            c['rx'] = rx['number']
            clinic = [i['line'] for i in rx['items'] if i['clinicDose']]
            self.expect(clinic == [0, 2], f'clinic doses flagged {clinic} (expected lines 0 and 2)')
            order = PharmacyDispenseOrder.objects.get(prescription__prescription_number=rx['number'])
            names = [i.medicine.name for i in order.items.all()]
            self.expect(len(names) == 1 and 'Azithromycin' in names[0], f'pharmacy order should hold only the take-home medicine: {names}')
            return f"{rx['number']} · 2 clinic doses for the treatment room · pharmacy gets 1 take-home item"
        self.step('1', 'doctor', 'prescribe 2 clinic doses + 1 take-home', s1)

        def s2():
            base = {'rx_no': c['rx'], 'kind': 'INJECTION', 'detail': 'Inj. Ondansetron 4 mg', 'route': 'IV', 'site': 'Left forearm', 'batch_no': 'OND2604'}
            self.api('nurse', 'POST', '/opd/procedures/', {**base, 'rx_item': 0, 'status': 'GIVEN'}, expect=400)  # five rights
            self.api('doctor', 'POST', '/opd/procedures/', {**base, 'rx_item': 0, 'status': 'GIVEN', 'five_rights': True}, expect=403)
            self.api('nurse', 'POST', '/opd/procedures/', {**base, 'rx_item': 1, 'detail': 'Azithromycin', 'status': 'GIVEN', 'five_rights': True}, expect=400)  # home medicine
            r = self.api('nurse', 'POST', '/opd/procedures/', {**base, 'rx_item': 0, 'status': 'GIVEN', 'five_rights': True})
            self.api('nurse', 'POST', '/opd/procedures/', {**base, 'rx_item': 0, 'status': 'GIVEN', 'five_rights': True}, expect=400)  # twice
            codes = sorted(ch['code'] for ch in r['charges'])
            self.expect(codes == ['OND', 'OPD-PROC-INJECTION'], f'charges {codes}')
            c['charges'] = list(BillableChargeItem.objects.filter(source_reference_id=f"OPD-PROC-{r['id']}"))
            return 'given with five rights · ' + ' + '.join(f"{ch['name']} {ch['amount']}" for ch in r['charges'])
        self.step('2', 'nurse', 'give Inj. Ondansetron (five rights)', s2)

        def s3():
            self.api('nurse', 'POST', '/opd/procedures/', {'rx_no': c['rx'], 'rx_item': 2, 'kind': 'INJECTION', 'detail': 'Inj. Pantoprazole 40 mg', 'status': 'REFUSED'}, expect=400)
            r = self.api('nurse', 'POST', '/opd/procedures/', {'rx_no': c['rx'], 'rx_item': 2, 'kind': 'INJECTION', 'detail': 'Inj. Pantoprazole 40 mg',
                                                               'status': 'REFUSED', 'note': 'Patient declined second injection; doctor informed'})
            self.expect(r['charges'] == [], 'a refused dose was charged')
            return 'refusal recorded with reason · no charge'
        self.step('3', 'nurse', 'Inj. Pantoprazole refused', s3)

        def s4():
            total = sum(ch.total_amount for ch in c['charges'])
            self.api('cashier', 'POST', '/billing/cashier/bill-and-collect/', {
                'uhid': c['uhid'], 'charge_ids': [str(ch.id) for ch in c['charges']], 'encounter_type': 'OPD', 'category': 'OPD',
                'split_payments': [{'tender_mode': 'CASH', 'amount': str(total)}]})
            for ch in c['charges']:
                ch.refresh_from_db()
            inv = c['charges'][0].invoice
            self.expect(inv and inv.status == 'PAID', 'procedure invoice not paid')
            evs = FinancialEvent.objects.filter(correlation_id=inv.invoice_number, status='posted')
            self.expect(evs.count() == 2, f'{evs.count()} Accounts events for the procedure invoice')
            c['inv'] = inv
            return f"{inv.invoice_number} {total} PAID · posted to Accounts"
        self.step('4', 'cashier', 'collect treatment-room charges', s4)

        def cons():
            v = OpdVisit.objects.get(id=c['vid'])
            procs = OpdProcedure.objects.filter(visit=v)
            self.expect(procs.count() == 2 and procs.filter(status='GIVEN').count() == 1, 'procedure records wrong')
            self.expect(not procs.filter(status='REFUSED').first().charges.exists(), 'refused dose has charges')
            ev = list(v.events.values_list('action', flat=True))
            self.expect('PROCEDURE_GIVEN' in ev and 'PROCEDURE_REFUSED' in ev, f'timeline {ev}')
            paid = Payment.objects.filter(invoice=c['inv']).aggregate(s=Sum('amount'))['s']
            self.expect(paid == sum(ch.total_amount for ch in c['charges']), 'paid != charges')
            return '1 given (charged) + 1 refused (not charged) on the visit; money = Billing = Accounts'
        self.step('C', 'check', 'consistency', cons)

    # ------------------------------------------------------------------ WF-4 day-care observation
    def run_wf4(self):
        from datetime import timedelta
        from apps.opd.models import OpdVisit, DaycareStay
        from apps.opd.services import daycare_bill
        from apps.billing.models import BillableChargeItem
        from apps.accounting.models import FinancialEvent
        c = self.ctx
        stamp = timezone.now().strftime('%H%M%S')
        bed = f'wf4-bed-{stamp}'

        def s1():
            p = self.api('reception', 'POST', '/patients/', {'firstName': 'Dc', 'lastName': f'Obs{stamp}', 'dateOfBirth': '1958-07-07',
                                                             'gender': 'MALE', 'phoneNumber': f'92{stamp}00'})
            c['uhid'] = p['uhid']
            v = self.api('reception', 'POST', '/opd/visits/', {'uhid': p['uhid'], 'doctor': 'stf-1', 'fee_paid': True, 'payment_mode': 'CASH', 'receipt': f'R{stamp}'})
            c['vid'] = v['id']
            self.api('reception', 'POST', '/opd/daycare/stays/', {'uhid': p['uhid'], 'bed_ref': bed, 'reason': 'x'}, expect=400)
            st = self.api('reception', 'POST', '/opd/daycare/stays/', {'uhid': p['uhid'], 'bed_ref': bed, 'bed_label': 'DC-A1', 'ward_name': 'OPD Day-care A',
                                                                         'reason': 'IV fluids for dehydration', 'nurse': 'Maria Nurse'})
            c['stay'] = st['id']
            self.expect(st['visitId'] == v['id'] and st['doctor'] and 'Jenkins' in st['doctor']['name'], 'stay not linked to the visit/doctor')
            q = self.api('reception', 'POST', '/patients/', {'firstName': 'Dc', 'lastName': f'Two{stamp}', 'dateOfBirth': '1960-01-01', 'gender': 'FEMALE', 'phoneNumber': f'92{stamp}11'})
            self.api('reception', 'POST', '/opd/daycare/stays/', {'uhid': q['uhid'], 'bed_ref': bed, 'reason': 'Observation'}, expect=400)  # bed taken
            self.api('reception', 'POST', '/opd/daycare/stays/', {'uhid': p['uhid'], 'bed_ref': bed + 'b', 'reason': 'Observation'}, expect=400)  # one bed each
            return f"{st['stayNumber']} on DC-A1 · linked to {v['visitNumber']} · double booking refused"
        self.step('1', 'reception', 'allocate day-care bed', s1)

        def s2():
            sid = c['stay']
            self.api('nurse', 'POST', f'/opd/daycare/stays/{sid}/chart/', {'kind': 'READING', 'bp': '110/70', 'pulse': 98}, expect=400)
            r1 = self.api('nurse', 'POST', f'/opd/daycare/stays/{sid}/chart/', {'kind': 'READING', 'bp': '108/70', 'pulse': 96, 'spo2': 97, 'temp': 99.1, 'respiratory_rate': 18, 'avpu': 'A', 'news2': 2})
            r2 = self.api('nurse', 'POST', f'/opd/daycare/stays/{sid}/chart/', {'kind': 'READING', 'bp': '100/64', 'pulse': 108, 'spo2': 95, 'temp': 99.8, 'respiratory_rate': 21, 'avpu': 'A', 'news2': 4})
            r3 = self.api('nurse', 'POST', f'/opd/daycare/stays/{sid}/chart/', {'kind': 'READING', 'bp': '88/56', 'pulse': 124, 'spo2': 92, 'temp': 101.2, 'respiratory_rate': 26, 'avpu': 'A', 'news2': 8})
            self.expect(not r1['autoEscalation'] and not r2['autoEscalation'] and r3['autoEscalation'], 'NEWS2 escalation rule wrong')
            esc = [e for e in r3['chart'] if e['kind'] == 'ESCALATION']
            self.expect(len(esc) == 1 and esc[0]['automatic'] and 'Jenkins' in esc[0]['escalatedTo'], f'escalation {esc}')
            return '3 readings (NEWS2 2, 4, 8) · NEWS2 8 escalated to Dr. Jenkins automatically'
        self.step('2', 'nurse', 'chart 3 readings', s2)

        def s3():
            sid = c['stay']
            self.api('other_doctor', 'POST', f'/opd/daycare/stays/{sid}/rounds/', {'note': 'Seen'}, expect=403)
            self.api('doctor', 'POST', f'/opd/daycare/stays/{sid}/rounds/', {'note': 'Hypotension responding to fluids; second litre NS, repeat obs hourly', 'plan': 'CONTINUE'})
            r = self.api('assistant', 'POST', f'/opd/daycare/stays/{sid}/rounds/', {'note': 'BP 112/72 after 2 L, tolerating orally. Discharge advised.', 'plan': 'DISCHARGE'})
            last = r['rounds'][-1]
            self.expect(len(r['rounds']) == 2 and last['onBehalfOf'] == 'Sarah Jenkins', 'assistant round not on behalf of the doctor')
            return '2 round notes (doctor + assistant for the doctor) · other doctor refused'
        self.step('3', 'doctor', 'round notes', s3)

        def s4():
            sid = c['stay']
            DaycareStay.objects.filter(id=sid).update(admitted_at=timezone.now() - timedelta(hours=3, minutes=20))
            r = self.api('nurse', 'POST', f'/opd/daycare/stays/{sid}/discharge/', {'outcome': 'Improved', 'note': 'Home with ORS'})
            ch = r['charges']
            self.expect(len(ch) == 1 and ch[0]['code'] == 'OPD-DAYCARE-HR' and ch[0]['qty'] == 4 and ch[0]['amount'] == 80.0, f'bed charge {ch}')
            _, lines7 = daycare_bill(timezone.now() - timedelta(hours=6, minutes=10), timezone.now())
            self.expect([(t.code, q) for t, q in lines7] == [('OPD-DAYCARE-DAY', 1)], 'day cap not applied for a 7 h stay')
            q = self.api('reception', 'POST', '/patients/', {'firstName': 'Dc', 'lastName': f'Three{stamp}', 'dateOfBirth': '1970-01-01', 'gender': 'MALE', 'phoneNumber': f'92{stamp}22'})
            self.api('reception', 'POST', '/opd/daycare/stays/', {'uhid': q['uhid'], 'bed_ref': bed, 'reason': 'Observation'}, expect=400)  # not cleaned
            self.api('reception', 'POST', f'/opd/daycare/stays/{sid}/cleaned/', {'cleaner': 'Housekeeping - Ravi'})
            nxt = self.api('reception', 'POST', '/opd/daycare/stays/', {'uhid': q['uhid'], 'bed_ref': bed, 'reason': 'Observation'})
            self.api('nurse', 'POST', f"/opd/daycare/stays/{nxt['id']}/discharge/", {'outcome': 'Not required'})
            self.api('reception', 'POST', f"/opd/daycare/stays/{nxt['id']}/cleaned/", {})
            c['charge'] = BillableChargeItem.objects.get(source_reference_id=f"OPD-DC-{r['stayNumber']}")
            return 'discharged after 3 h 20 m → 4 h × 20 = 80 (7 h would cap at the 120 day rate) · bed held until housekeeping cleaned it'
        self.step('4', 'nurse', 'discharge, bed charge, housekeeping', s4)

        def s5():
            ch = c['charge']
            self.api('cashier', 'POST', '/billing/cashier/bill-and-collect/', {'uhid': c['uhid'], 'charge_ids': [str(ch.id)], 'encounter_type': 'OPD', 'category': 'OPD',
                                                                               'split_payments': [{'tender_mode': 'UPI', 'amount': str(ch.total_amount)}]})
            ch.refresh_from_db()
            inv = ch.invoice
            self.expect(inv and inv.status == 'PAID', 'bed invoice not paid')
            self.expect(FinancialEvent.objects.filter(correlation_id=inv.invoice_number, status='posted').count() == 2, 'not posted to Accounts')
            return f'{inv.invoice_number} {ch.total_amount} PAID by UPI · posted to Accounts'
        self.step('5', 'cashier', 'collect bed charge', s5)

        def cons():
            v = OpdVisit.objects.get(id=c['vid'])
            ev = list(v.events.values_list('action', flat=True))
            for a in ['DAYCARE_ADMITTED', 'DAYCARE_READING', 'DAYCARE_ROUND', 'DAYCARE_DISCHARGED']:
                self.expect(a in ev, f'{a} missing from the visit timeline')
            st = DaycareStay.objects.get(id=c['stay'])
            self.expect(st.chart.filter(kind='READING').count() == 3 and st.rounds.count() == 2 and st.cleaned_at, 'stay record incomplete')
            return 'stay, chart, rounds, discharge and cleaning on the visit timeline; charge = invoice = Accounts'
        self.step('C', 'check', 'consistency', cons)

    # ------------------------------------------------------------------ WF-5 follow-up
    def run_wf5(self):
        from datetime import timedelta
        from apps.opd.models import OpdVisit, OpdFollowUp, OpdBooking
        from apps.billing.models import BillableChargeItem
        c = self.ctx
        stamp = timezone.now().strftime('%H%M%S')
        due = (timezone.localdate() + timedelta(days=7)).isoformat()

        def s1():
            p = self.api('reception', 'POST', '/patients/', {'firstName': 'Fu', 'lastName': f'Visit{stamp}', 'dateOfBirth': '1975-05-05', 'gender': 'FEMALE', 'phoneNumber': f'90{stamp}00'})
            c['uhid'] = p['uhid']
            v = self.api('reception', 'POST', '/opd/visits/', {'uhid': p['uhid'], 'doctor': 'stf-1', 'fee_paid': True, 'payment_mode': 'CASH', 'receipt': f'R{stamp}'})
            vid = v['id']
            self.api('nurse', 'POST', f'/opd/visits/{vid}/transition/', {'action': 'skip_triage', 'reason': 'Report review only'})
            self.api('assistant', 'POST', f'/opd/visits/{vid}/transition/', {'action': 'call_in'})
            self.api('assistant', 'POST', f'/opd/visits/{vid}/transition/', {'action': 'seat'})
            self.api('assistant', 'POST', f'/opd/visits/{vid}/complete/', {'diagnosis': 'Hypertension, newly diagnosed', 'follow_up_date': timezone.localdate().isoformat()}, expect=400)
            self.api('assistant', 'POST', f'/opd/visits/{vid}/complete/', {'diagnosis': 'Hypertension, newly diagnosed', 'follow_up_date': due,
                                                                          'follow_up_reason': 'BP review after starting medication',
                                                                          'medicines': [{'name': 'Amlodipine 5 mg tablet', 'dose': '1 tab', 'frequency': 'OD', 'days': 7}]})
            self.api('assistant', 'POST', f'/opd/visits/{vid}/checkout/', {'routes': ['FOLLOW_UP', 'PHARMACY']})
            fu = OpdFollowUp.objects.get(patient__uhid=p['uhid'])
            self.expect(fu.status == 'PENDING_BOOKING' and fu.due_date.isoformat() == due and fu.on_behalf_of.email == LOGINS['doctor'], 'follow-up not stored')
            lst = self.api('reception', 'GET', '/opd/follow-ups/?status=PENDING_BOOKING')
            self.expect(any(f['id'] == str(fu.id) for f in lst['followUps']), 'not in the reception to-book list')
            c['fu'] = str(fu.id)
            return f'follow-up due {due} (entered by assistant for Dr. Jenkins) · same-day date refused'
        self.step('1', 'assistant', 'consult sets a 7-day follow-up', s1)

        def s2():
            other = self.api('reception', 'POST', '/patients/', {'firstName': 'Fu', 'lastName': f'Other{stamp}', 'dateOfBirth': '1980-01-01', 'gender': 'MALE', 'phoneNumber': f'90{stamp}11'})
            self.api('reception', 'POST', '/opd/bookings/', {'uhid': other['uhid'], 'doctor': 'stf-1', 'date': due, 'slot': '10:00 AM', 'fee': 75})
            self.api('assistant', 'POST', '/opd/bookings/', {'uhid': c['uhid'], 'doctor': 'stf-1', 'date': due, 'slot': '10:00 AM', 'follow_up_id': c['fu']}, expect=400)  # slot taken
            b = self.api('assistant', 'POST', '/opd/bookings/', {'uhid': c['uhid'], 'doctor': 'stf-1', 'date': due, 'slot': '10:15 AM', 'follow_up_id': c['fu'], 'fee': 45})
            self.expect(b['visitType'] == 'FOLLOW_UP' and b['fee'] == 45.0, f"booking {b['visitType']} {b['fee']}")
            self.expect(OpdFollowUp.objects.get(id=c['fu']).status == 'BOOKED', 'follow-up not BOOKED')
            b2 = self.api('reception', 'PUT', f"/opd/bookings/{b['id']}/", {'slot': '10:30 AM'})
            self.expect(b2['slot'] == '10:30 AM' and b2['ref'] == b['ref'], 'reschedule failed')
            c['booking'] = b['id']
            return f"{b['ref']} {due} 10:30 AM (rescheduled from 10:15) · follow-up fee 45 · taken slot refused"
        self.step('2', 'assistant', 'book the follow-up', s2)

        def s3():
            self.api('reception', 'POST', f"/opd/bookings/{c['booking']}/check-in/", {}, expect=400)  # not the day yet
            OpdBooking.objects.filter(id=c['booking']).update(date=timezone.localdate())  # ... a week later
            v = self.api('reception', 'POST', f"/opd/bookings/{c['booking']}/check-in/", {})
            self.expect(v['visitType'] == 'FOLLOW_UP' and v['fee'] == 45.0 and v['feeStatus'] == 'UNPAID', f"visit {v['visitType']} {v['fee']} {v['feeStatus']}")
            visit = OpdVisit.objects.get(id=v['id'])
            charge = BillableChargeItem.objects.get(department='OPD', source_reference_id=str(visit.appointment_id))
            self.expect(charge.total_amount == 45, f'follow-up charge {charge.total_amount}')
            fu = OpdFollowUp.objects.get(id=c['fu'])
            self.expect(fu.status == 'COMPLETED' and fu.completed_visit_id == visit.id, 'follow-up not completed')
            self.expect(OpdBooking.objects.get(id=c['booking']).status == 'CHECKED_IN', 'booking not checked in')
            return f"{v['visitNumber']} token {v['token']} · follow-up fee 45 to the cashier · follow-up COMPLETED"
        self.step('3', 'reception', 'check in on the day', s3)

        def s4():
            p = self.api('reception', 'POST', '/patients/', {'firstName': 'Fu', 'lastName': f'Miss{stamp}', 'dateOfBirth': '1970-01-01', 'gender': 'MALE', 'phoneNumber': f'90{stamp}22'})
            fu = OpdFollowUp.objects.create(patient_id=Patient_id(p['uhid']), due_date=timezone.localdate() + timedelta(days=2), reason='Wound check')
            b = self.api('reception', 'POST', '/opd/bookings/', {'uhid': p['uhid'], 'doctor': 'stf-1', 'date': (timezone.localdate() + timedelta(days=2)).isoformat(), 'slot': '11:00 AM', 'follow_up_id': str(fu.id)})
            self.api('reception', 'POST', f"/opd/bookings/{b['id']}/cancel/", {'reason': ''}, expect=400)
            self.api('reception', 'POST', f"/opd/bookings/{b['id']}/cancel/", {'reason': 'Patient travelling'})
            fu.refresh_from_db()
            self.expect(fu.status == 'PENDING_BOOKING', 'cancelled booking did not free the follow-up')
            b = self.api('reception', 'POST', '/opd/bookings/', {'uhid': p['uhid'], 'doctor': 'stf-1', 'date': (timezone.localdate() + timedelta(days=2)).isoformat(), 'slot': '11:00 AM', 'follow_up_id': str(fu.id)})
            self.api('reception', 'POST', f"/opd/bookings/{b['id']}/cancel/", {'no_show': True}, expect=400)  # slot not passed
            OpdBooking.objects.filter(id=b['id']).update(date=timezone.localdate() - timedelta(days=1))
            self.api('reception', 'POST', f"/opd/bookings/{b['id']}/cancel/", {'no_show': True})
            fu.refresh_from_db()
            self.expect(fu.status == 'MISSED', f'no-show left follow-up {fu.status}')
            return 'cancel (reason required) → back to book · no-show (only after the slot) → follow-up MISSED, still bookable'
        self.step('4', 'reception', 'cancel and no-show rules', s4)

    # ------------------------------------------------------------------ WF-6 emergency
    def run_wf6(self):
        from apps.opd.models import OpdVisit, OpdEmergencyAlert
        from apps.billing.models import BillableChargeItem
        c = self.ctx
        stamp = timezone.now().strftime('%H%M%S')

        def reg(tag):
            return self.api('reception', 'POST', '/patients/', {'firstName': 'Em', 'lastName': f'{tag}{stamp}', 'dateOfBirth': '1966-06-06',
                                                                'gender': 'MALE', 'phoneNumber': f'88{stamp}{len(tag)}0'})['uhid']

        def s1():
            u1, u2 = reg('Walkin'), reg('Chest')
            normal = self.api('reception', 'POST', '/opd/visits/', {'uhid': u1, 'doctor': 'stf-1'})
            em = self.api('reception', 'POST', '/opd/visits/', {'uhid': u2, 'doctor': 'stf-1', 'visit_type': 'EMERGENCY', 'priority': 'EMERGENCY', 'fee': 112})
            self.expect(em['visitType'] == 'EMERGENCY' and em['priority'] == 'EMERGENCY', 'emergency token not flagged')
            ch = BillableChargeItem.objects.get(department='OPD', source_reference_id=str(OpdVisit.objects.get(id=em['id']).appointment_id))
            self.expect(ch.total_amount == 112 and ch.priority == 'STAT', f'emergency charge {ch.total_amount} {ch.priority}')
            c.update(normal=normal['id'], em=em['id'], u2=u2)
            return f"{em['visitNumber']} EMERGENCY · emergency fee 112 (STAT) to the cashier"
        self.step('1', 'reception', 'issue emergency token', s1)

        def s2():
            self.api('nurse', 'POST', f"/opd/visits/{c['normal']}/transition/", {'action': 'mark_emergency', 'reason': 'Sudden breathlessness in the waiting area'})
            v = OpdVisit.objects.get(id=c['normal'])
            self.expect(v.priority == 'EMERGENCY', 'nurse could not mark emergency')
            return 'waiting patient moved to EMERGENCY priority'
        self.step('2', 'nurse', 'mark a waiting patient as emergency', s2)

        def s3():
            self.api('nurse', 'POST', '/opd/emergency-alerts/', {'kind': 'CODE_BLUE', 'location': 'x', 'condition': 'y'}, expect=400)
            a = self.api('nurse', 'POST', '/opd/emergency-alerts/', {'kind': 'CODE_BLUE', 'priority': 'RED_IMMEDIATE', 'uhid': c['u2'],
                                                                     'location': 'OPD waiting area, row 3', 'condition': 'Collapsed, not responsive, no pulse'})
            self.expect(a['visitNumber'] and a['status'] == 'ACTIVE', 'alert not linked to the visit')
            seen = self.api('doctor', 'GET', '/opd/emergency-alerts/')
            self.expect(any(x['id'] == a['id'] for x in seen['alerts']), 'doctor desk does not see the alert')
            self.expect(any(x['id'] == a['id'] for x in self.api('other_doctor', 'GET', '/opd/emergency-alerts/')['alerts']), 'other doctor does not see it')
            c['alert'] = a['id']
            return 'Code Blue raised with the patient and visit · visible on every doctor desk'
        self.step('3', 'nurse', 'Code Blue', s3)

        def s4():
            aid = c['alert']
            self.api('assistant', 'POST', f'/opd/emergency-alerts/{aid}/attend/', {'outcome': 'x x x'}, expect=403)
            r = self.api('other_doctor', 'POST', f'/opd/emergency-alerts/{aid}/attend/', {'outcome': 'CPR 2 cycles, ROSC; shifted to ER resus bay'})
            self.api('doctor', 'POST', f'/opd/emergency-alerts/{aid}/attend/', {'outcome': 'also there'}, expect=400)
            a = OpdEmergencyAlert.objects.get(id=aid)
            self.expect(r['status'] == 'ATTENDED' and a.attended_by.email == LOGINS['other_doctor'], 'attend not recorded')
            ev = list(OpdVisit.objects.get(id=c['em']).events.values_list('action', flat=True))
            self.expect('ALERT_CODE_BLUE' in ev and 'ALERT_ATTENDED' in ev, f'visit timeline {ev}')
            return f"attended by Dr. Alisha Patel in {round((a.attended_at - a.raised_at).total_seconds() / 60, 1)} min · assistant refused · second attend refused"
        self.step('4', 'doctor', 'doctor attends the alert', s4)

        def s5():
            vid = c['em']
            self.api('nurse', 'POST', f'/opd/visits/{vid}/transition/', {'action': 'skip_triage', 'reason': 'Patient too unwell to wait — doctor informed'})
            self.api('doctor', 'POST', f'/opd/visits/{vid}/transition/', {'action': 'call_in'})
            self.api('doctor', 'POST', f'/opd/visits/{vid}/transition/', {'action': 'seat'})
            v = self.api('doctor', 'POST', f'/opd/visits/{vid}/complete/', {'diagnosis': 'Cardiac arrest, revived', 'referral': {'department': 'ER / Cardiology', 'reason': 'Post-ROSC care'}})
            self.api('assistant', 'POST', f'/opd/visits/{vid}/checkout/', {'routes': ['ADMISSION']})
            self.expect(OpdVisit.objects.get(id=vid).status == 'CHECKED_OUT', 'visit not closed')
            return 'visit continues: seen first, completed with referral, checked out to admission'
        self.step('5', 'doctor', 'visit proceeds as WF-1', s5)

    # ------------------------------------------------------------------ WF-7 admin configuration
    def run_wf7(self):
        from apps.opd.models import OpdVisit, OpdAdminAudit
        from apps.billing.models import BillableChargeItem, TariffMaster
        c = self.ctx
        stamp = timezone.now().strftime('%H%M%S')
        tariff = {'departmentId': '1', 'currency': 'INR', 'intakeRegistrationFee': 15, 'triageVitalsFee': 10, 'updatedAt': '',
                  'doctorTariffs': [{'doctorId': 'stf-1', 'staffId': 'stf-1', 'doctorName': 'Dr. Sarah Jenkins', 'employeeCode': 'DOC-101',
                                     'designation': '', 'specialization': '', 'standardFee': 90, 'followUpFee': 54, 'emergencyFee': 135}],
                  'wardTariffs': [], 'roomTariffs': [],
                  'bedCategoryTariffs': [{'id': 'bed-cat-daycare', 'categoryName': 'OPD Daycare Observation Bed', 'dailyRate': 150, 'hourlyRate': 25}]}
        workspace = {'id': '1', 'config': {'isWalkInAllowed': True, 'dailyCapacity': 100}}

        def reg(tag):
            return self.api('reception', 'POST', '/patients/', {'firstName': 'Ad', 'lastName': f'{tag}{stamp}', 'dateOfBirth': '1980-08-08',
                                                                'gender': 'FEMALE', 'phoneNumber': f'86{stamp}{len(tag)}0'})['uhid']

        def charge_of(v):
            return BillableChargeItem.objects.get(department='OPD', source_reference_id=str(OpdVisit.objects.get(id=v['id']).appointment_id))

        def s1():
            old = self.api('reception', 'POST', '/opd/visits/', {'uhid': reg('Before'), 'doctor': 'stf-1', 'fee': 75})
            c['old_charge'] = charge_of(old).total_amount
            self.api('reception', 'PUT', '/opd/config/tariff/', {'data': tariff}, expect=403)
            r = self.api('opd_admin', 'PUT', '/opd/config/tariff/', {'data': tariff})
            self.api('opd_admin', 'PUT', '/opd/config/workspace/', {'data': workspace})
            self.expect(any('90' in ch for ch in r['changes']), f"fee change not applied: {r['changes']}")
            self.expect(TariffMaster.objects.get(code='OPD-DAYCARE-HR').base_price == 25, 'day-care hourly rate not applied')
            return f"fees 90 / 54 / 135, triage 10, registration 15, day-care 25/h published · reception refused"
        self.step('1', 'opd_admin', 'publish fee master', s1)

        def s2():
            u = reg('New')
            v1 = self.api('reception', 'POST', '/opd/visits/', {'uhid': u, 'doctor': 'stf-1', 'fee': 75})
            self.expect(v1['fee'] == 115.0 and charge_of(v1).total_amount == 115, f"first visit fee {v1['fee']} (expected 90 + 10 + 15)")
            self.expect(c['old_charge'] == 75, 'an earlier charge changed')
            self.api('reception', 'POST', f"/opd/visits/{v1['id']}/transition/", {'action': 'cancel', 'reason': 'Issued in error'})
            v2 = self.api('reception', 'POST', '/opd/visits/', {'uhid': u, 'doctor': 'stf-1', 'visit_type': 'EMERGENCY', 'priority': 'EMERGENCY'})
            self.expect(v2['fee'] == 160.0, f"emergency fee {v2['fee']} (expected 135 + 10 + 15: the cancelled token was not a visit)")
            c['em_visit'] = v2['id']
            return 'next token 115 (90 + triage 10 + registration 15) · after cancelling it, emergency 160 still carries registration · earlier charge 75 unchanged'
        self.step('2', 'reception', 'next token charges the new fee', s2)

        def s3():
            today = timezone.localdate().isoformat()
            self.api('reception', 'POST', '/opd/doctor-blocks/', {'doctor': 'stf-1', 'date': today, 'all_day': True, 'reason': 'x'}, expect=400)
            self.api('other_doctor', 'POST', '/opd/doctor-blocks/', {'doctor': 'stf-1', 'date': today, 'reason': 'Conference'}, expect=403)
            b = self.api('opd_admin', 'POST', '/opd/doctor-blocks/', {'doctor': 'stf-1', 'date': today, 'all_day': True, 'reason': 'Medical conference'})
            self.api('reception', 'POST', '/opd/visits/', {'uhid': reg('Blocked'), 'doctor': 'stf-1'}, expect=400)
            em = self.api('reception', 'POST', '/opd/visits/', {'uhid': reg('BlkEm'), 'doctor': 'stf-1', 'visit_type': 'EMERGENCY', 'priority': 'EMERGENCY'})
            self.api('reception', 'POST', '/opd/bookings/', {'uhid': reg('BlkBook'), 'doctor': 'stf-1', 'date': today, 'slot': '11:30 PM'}, expect=400)
            self.api('opd_admin', 'DELETE', f"/opd/doctor-blocks/{b['id']}/", expect=204)
            self.api('reception', 'POST', '/opd/visits/', {'uhid': reg('Unblocked'), 'doctor': 'stf-1'})
            return 'blocked doctor: token and booking refused, emergency allowed · unblocked: tokens again'
        self.step('3', 'opd_admin', 'block a doctor today', s3)

        def s4():
            self.api('opd_admin', 'PUT', '/opd/config/workspace/', {'data': {'id': '1', 'config': {'isWalkInAllowed': False, 'dailyCapacity': 100}}})
            self.api('reception', 'POST', '/opd/visits/', {'uhid': reg('WalkOff'), 'doctor': 'stf-1'}, expect=400)
            self.api('reception', 'POST', '/opd/visits/', {'uhid': reg('WalkEm'), 'doctor': 'stf-1', 'visit_type': 'EMERGENCY', 'priority': 'EMERGENCY'})
            u = reg('Booked')
            bk = self.api('reception', 'POST', '/opd/bookings/', {'uhid': u, 'doctor': 'stf-1', 'date': timezone.localdate().isoformat(), 'slot': '11:45 PM'})
            v = self.api('reception', 'POST', f"/opd/bookings/{bk['id']}/check-in/", {})
            self.expect(v['fee'] == 115.0 and bk['fee'] == 90.0, f"booking fee {bk['fee']} / check-in fee {v['fee']}")
            self.api('opd_admin', 'PUT', '/opd/config/workspace/', {'data': {'id': '1', 'config': {'isWalkInAllowed': True, 'dailyCapacity': 100}}})
            return 'walk-ins off: walk-in refused, emergency and booked check-in allowed (booking priced from the fee master)'
        self.step('4', 'opd_admin', 'turn walk-ins off', s4)

        def s5():
            n = OpdVisit.objects.filter(visit_date=timezone.localdate()).exclude(status='CANCELLED').count()
            self.api('opd_admin', 'PUT', '/opd/config/workspace/', {'data': {'id': '1', 'config': {'isWalkInAllowed': True, 'dailyCapacity': n}}})
            v = self.api('reception', 'POST', '/opd/visits/', {'uhid': reg('Over'), 'doctor': 'stf-1'})
            self.expect(any('capacity' in w for w in v.get('warnings', [])), f"no capacity warning: {v.get('warnings')}")
            return f"capacity {n} reached → token issued with warning: {v['warnings'][0]}"
        self.step('5', 'opd_admin', 'capacity reached', s5)

        def s6():
            self.api('doctor', 'PUT', '/opd/doctor-status/', {'doctor': 'stf-1', 'status': 'ROUNDS', 'until': '12:30'})
            self.api('assistant', 'PUT', '/opd/doctor-status/', {'doctor': 'stf-1', 'status': 'IN'})
            self.api('other_doctor', 'PUT', '/opd/doctor-status/', {'doctor': 'stf-1', 'status': 'OUT'}, expect=403)
            st = self.api('reception', 'GET', '/opd/doctor-status/')['statuses']
            self.expect(any(x['staffRef'] == 'stf-1' and x['status'] == 'IN' for x in st), 'status not stored')
            kinds = set(OpdAdminAudit.objects.values_list('kind', flat=True))
            self.expect({'TARIFF', 'POLICY', 'DOCTOR'} <= kinds, f'audit kinds {kinds}')
            return f'doctor status set by doctor and assistant, other doctor refused · audit has {OpdAdminAudit.objects.count()} entries ({", ".join(sorted(kinds))})'
        self.step('6', 'doctor', 'doctor status + audit trail', s6)

    # ------------------------------------------------------------------ WF-8 negative & integrity
    def api_raw(self, who, method, path, body=None, headers=None):
        req = urllib.request.Request(self.base + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                                     headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {self.token(who)}', **(headers or {})})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.status, json.loads(r.read() or b'{}')
        except urllib.error.HTTPError as e:
            try:
                return e.code, json.loads(e.read() or b'{}')
            except ValueError:
                return e.code, {}

    def together(self, calls):
        """Fire requests at the same instant; returns their status codes in order."""
        import threading
        from concurrent.futures import ThreadPoolExecutor
        for who, *_ in calls:
            self.token(who)  # log in first so only the action itself races
        gate = threading.Barrier(len(calls))

        def go(call):
            gate.wait()
            return self.api_raw(*call)[0]
        with ThreadPoolExecutor(len(calls)) as pool:
            return list(pool.map(go, calls))

    def run_wf8(self):
        from apps.opd.models import OpdVisit, OpdFeeReview
        from apps.clinical.models import Consultation, Prescription
        from apps.pharmacy.models import PharmacyDispenseOrder
        from apps.accounting.models import FinancialEvent
        from apps.billing.models import BillableChargeItem
        from django.core.management import call_command
        c = self.ctx
        stamp = timezone.now().strftime('%H%M%S')

        def reg(tag):
            return self.api('reception', 'POST', '/patients/', {'firstName': 'Ng', 'lastName': f'{tag}{stamp}', 'dateOfBirth': '1985-03-03',
                                                                'gender': 'MALE', 'phoneNumber': f'84{stamp}{len(tag) % 10}{len(tag) // 10}'})['uhid']

        def ready(uhid, paid=True):
            v = self.api('reception', 'POST', '/opd/visits/', {'uhid': uhid, 'doctor': 'stf-1', 'fee_paid': paid, 'payment_mode': 'CASH', 'receipt': f'R{uhid[-5:]}'})
            self.api('nurse', 'POST', f"/opd/visits/{v['id']}/transition/", {'action': 'skip_triage', 'reason': 'Report review only'})
            return v

        def s1():
            u = reg('Dup')
            ready(u)
            code, body = self.api_raw('reception', 'POST', '/opd/visits/', {'uhid': u, 'doctor': 'stf-5'})
            self.expect(code == 409 and 'token' in json.dumps(body), f'second token -> {code} {body}')
            return '409 · "This patient already holds token …"'
        self.step('1', 'reception', 'second active token same day', s1)

        def s2():
            v = ready(reg('NoDx'))
            self.api('doctor', 'POST', f"/opd/visits/{v['id']}/transition/", {'action': 'call_in'})
            self.api('doctor', 'POST', f"/opd/visits/{v['id']}/transition/", {'action': 'seat'})
            code, body = self.api_raw('doctor', 'POST', f"/opd/visits/{v['id']}/complete/", {'medicines': []})
            self.expect(code == 400 and 'diagnosis' in body, f'{code} {body}')
            c['nodx'] = v['id']
            return '400 · "Enter a diagnosis."'
        self.step('2', 'doctor', 'complete without diagnosis', s2)

        def s3():
            vid = c['nodx']
            body = {'diagnosis': 'Tension headache', 'medicines': [{'name': 'Azithromycin 500 mg tablet', 'dose': '1 tab', 'frequency': 'OD', 'days': 3}]}
            codes = self.together([('doctor', 'POST', f'/opd/visits/{vid}/complete/', body, {'Idempotency-Key': 'k-1'}),
                                   ('doctor', 'POST', f'/opd/visits/{vid}/complete/', body, {'Idempotency-Key': 'k-1'})])
            again = self.api_raw('doctor', 'POST', f'/opd/visits/{vid}/complete/', body, {'Idempotency-Key': 'k-1'})[0]
            other = self.api_raw('doctor', 'POST', f'/opd/visits/{vid}/complete/', body, {'Idempotency-Key': 'k-2'})[0]
            counts = (Consultation.objects.filter(visit_id=vid).count(), Prescription.objects.filter(visit_id=vid).count(),
                      PharmacyDispenseOrder.objects.filter(prescription__visit_id=vid).count())
            self.expect(sorted(codes) == [200, 200] and again == 200 and other == 409, f'codes {codes} retry {again} other-key {other}')
            self.expect(counts == (1, 1, 1), f'duplicates: consultations/prescriptions/orders {counts}')
            return f'2 simultaneous + 1 retry with the same key → 200, one consultation / prescription / pharmacy order · different key → 409'
        self.step('3', 'doctor', 'retry complete with the same Idempotency-Key', s3)

        def s4():
            v = ready(reg('Race'))
            codes = self.together([('doctor', 'POST', f"/opd/visits/{v['id']}/transition/", {'action': 'call_in'}),
                                   ('assistant', 'POST', f"/opd/visits/{v['id']}/transition/", {'action': 'call_in'})])
            self.expect(sorted(codes) == [200, 409], f'same visit, two callers: {codes}')
            self.api('doctor', 'POST', f"/opd/visits/{v['id']}/transition/", {'action': 'hold', 'reason': 'Stepped out'})
            a, b = ready(reg('RaceA')), ready(reg('RaceB'))
            codes2 = self.together([('doctor', 'POST', f"/opd/visits/{a['id']}/transition/", {'action': 'call_in'}),
                                    ('assistant', 'POST', f"/opd/visits/{b['id']}/transition/", {'action': 'call_in'})])
            inside = OpdVisit.objects.filter(doctor__staff_ref='stf-1', visit_date=timezone.localdate(), status__in=['CALLED_IN', 'IN_CONSULTATION']).count()
            self.expect(sorted(codes2) == [200, 409] and inside == 1, f'two patients into one chamber: {codes2}, inside={inside}')
            return 'same visit called by doctor + assistant at once → 200 / 409 · two patients into one chamber at once → only one gets in'
        self.step('4', 'doctor', "two calls at the same instant", s4)

        def s5():
            v = self.api('reception', 'POST', '/opd/visits/', {'uhid': reg('PaidCancel'), 'doctor': 'stf-5', 'fee_paid': True, 'payment_mode': 'CASH', 'receipt': f'RC{stamp}'})
            self.api('reception', 'POST', f"/opd/visits/{v['id']}/transition/", {'action': 'cancel', 'reason': 'Wrong doctor chosen'})
            visit = OpdVisit.objects.get(id=v['id'])
            r = OpdFeeReview.objects.filter(visit=visit).first()
            self.expect(visit.status == 'CANCELLED' and r and r.status == 'PENDING' and r.amount == visit.fee_amount, 'paid cancel did not open a refund review')
            self.expect(FinancialEvent.objects.filter(correlation_id=visit.visit_number, status='posted').count() == 2, 'the collected fee vanished from Accounts')
            return 'visit kept as CANCELLED · fee waits in the supervisor refund list · Accounts posting untouched'
        self.step('5', 'reception', 'cancel a visit with a paid fee', s5)

        def s6():
            day = timezone.localdate().isoformat()
            v = self.api('reception', 'POST', '/opd/visits/', {'uhid': reg('Unposted'), 'doctor': 'stf-5'})
            ch = BillableChargeItem.objects.get(department='OPD', source_reference_id=str(OpdVisit.objects.get(id=v['id']).appointment_id))
            # the Accounts bridge is down while the cashier collects (simulated outage): Billing has the money, Accounts does not
            from apps.billing import accounts_bridge
            from apps.billing.services import BillingCoreService
            from apps.accounts.models import User
            real = accounts_bridge.publish_invoice_settlement
            accounts_bridge.publish_invoice_settlement = lambda *a, **k: []
            try:
                from apps.billing.services import CashierWorkspaceService, CounterShiftControlService
                cashier = User.objects.get(email=LOGINS['cashier'])
                shift = CounterShiftControlService.get_open_shift(cashier)
                inv = CashierWorkspaceService.consolidate_with_guard(cashier, ch.patient, [str(ch.id)], counter=shift.counter, shift=shift, encounter_type='OPD')
                BillingCoreService.process_multi_tender_payment(invoice_id=str(inv.id), cashier=cashier, counter=shift.counter, shift=shift,
                                                               split_payments=[{'tender_mode': 'CASH', 'amount': str(inv.balance)}])
            finally:
                accounts_bridge.publish_invoice_settlement = real
            ch.refresh_from_db()
            detail = self.api('accountant', 'GET', f'/accounts/close/daily/{day}')
            blocked = any('Billing collected' in b for b in detail['blockers'])
            out = self.api_raw('accountant', 'POST', f'/accounts/close/daily/{day}/run', {})
            self.expect(blocked and out[0] == 422, f"day close not blocked: {detail['blockers']} / {out[0]}")
            from io import StringIO
            buf = StringIO()
            try:
                call_command('opd_consistency_check', stdout=buf)
                flagged = False
            except Exception:
                flagged = 'Billing payments = Accounts receipts' in buf.getvalue() and 'FAIL' in buf.getvalue()
            self.expect(flagged, 'consistency check did not flag the missing posting')
            call_command('accounts_backfill_billing', '--apply', stdout=StringIO())
            detail = self.api('accountant', 'GET', f'/accounts/close/daily/{day}')
            self.expect(not any('Billing collected' in b for b in detail['blockers']), 'backfill did not clear the blocker')
            return f'unposted {ch.total_amount}: day close blocked (422) and consistency check FAIL · backfill reposts it → blocker cleared'
        self.step('6', 'accountant', 'day close with an unposted payment', s6)

        def s7():
            from io import StringIO
            buf = StringIO()
            try:
                call_command('opd_consistency_check', stdout=buf)
                ok = True
            except Exception:
                ok = False
            lines = [l.strip() for l in buf.getvalue().splitlines() if 'PASS' in l or 'FAIL' in l or l.strip().startswith('-')]
            self.expect(ok, 'consistency report failed:\n' + '\n'.join(lines))
            return f"{sum('PASS' in l for l in lines)} consistency checks pass for today"
        self.step('C', 'check', 'opd_consistency_check', s7)
