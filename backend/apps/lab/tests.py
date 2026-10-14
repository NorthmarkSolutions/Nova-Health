"""
Lab Phase 1 API tests: the doctor -> lab -> billing order flow, role checks, and the fixes for
silent fallbacks (unknown patient/test/order never resolves to "the first one").
"""
from decimal import Decimal
from rest_framework.test import APITestCase

from apps.accounts.models import DoctorProfile, RoleType, User
from apps.audit.models import AuditLog
from apps.billing.models import BillableChargeItem
from apps.ipd.models import InpatientAdmission
from apps.patients.models import Patient
from .models import CriticalCallback, Equipment, LabOrder, LabOrderStatus, LabReport, LabResult, LabTest, LabTestRangeVersion, QcRun, SampleRejection

CBC_SCHEMA = [
    {'group': 'RED CELLS', 'name': 'Hemoglobin', 'unit': 'g/dL', 'low': 13.5, 'high': 17.5, 'criticalLow': 7.0, 'criticalHigh': 20.0},
    {'group': 'WHITE CELLS', 'name': 'WBC Count', 'unit': '10^3/uL', 'low': 4.0, 'high': 11.0, 'criticalLow': 2.0, 'criticalHigh': 30.0},
]


CBC_SCHEMA_ROWS = [{k: v for k, v in p.items() if k != 'group'} for p in CBC_SCHEMA]


def user(username, role, first='Test', last='User'):
    return User.objects.create_user(username=username, password='Password123!', first_name=first, last_name=last, role=role)


class LabTestBase(APITestCase):
    def setUp(self):
        self.doctor = user('lab_t_doctor', RoleType.DOCTOR, 'Arun', 'Verma')
        self.doctor_profile = DoctorProfile.objects.create(user=self.doctor, department='Medicine', license_number='L-1', qualification='MD')
        self.nurse = user('lab_t_nurse', RoleType.NURSE, 'Clara', 'Adams')
        self.tech = user('lab_t_tech', RoleType.LAB_TECH, 'Sunil', 'Gowda')
        self.path = user('lab_t_path', RoleType.PATHOLOGIST, 'Kavitha', 'Menon')
        self.cashier = user('lab_t_cashier', RoleType.CASHIER)
        self.patient = Patient.objects.create(first_name='Mohan', last_name='Lal', gender='MALE', date_of_birth='1985-02-20', uhid='NH-LAB-T-01', phone_number='9000000001')
        self.test = LabTest.objects.create(test_code='HEM-CBC-T1', name='Complete Blood Count (Test)', category='Hematology', price=Decimal('350.00'), parameters_schema=CBC_SCHEMA)
        self.xn = Equipment.objects.create(code='an-xn-t', name='Sysmex XN-T', serial_number='SX-T-1', section='Hematology', status='RUNNING')
        self.backup = Equipment.objects.create(code='an-xn-b', name='Sysmex XN-B', serial_number='SX-T-2', section='Hematology', status='READY')
        for eq in (self.xn, self.backup):
            QcRun.objects.create(equipment=eq, level='Level 2', lot='8822', passed=True, performed_by=self.tech)

    def order(self, **extra):
        self.client.force_authenticate(self.doctor)
        body = {'uhid': self.patient.uhid, 'testCode': self.test.test_code, 'priority': 'STAT', 'location': 'OPD Room 101', **extra}
        return self.client.post('/api/v1/lab/orders/', body, format='json')

    def admit(self):
        # Admitted patients accrue to the IPD running bill, so collection is not blocked on payment
        InpatientAdmission.objects.create(admission_number='ADM-LAB-T-1', patient=self.patient, status='ADMITTED', ward_name='4B')


class LabOrderFlowTests(LabTestBase):
    # ---- fixes for silent fallbacks / open access -----------------------------------------
    def test_requires_login(self):
        self.assertEqual(self.client.get('/api/v1/lab/orders/').status_code, 401)
        self.assertEqual(self.client.post('/api/v1/lab/orders/', {'uhid': self.patient.uhid}, format='json').status_code, 401)

    def test_unknown_patient_or_test_is_rejected_not_defaulted(self):
        self.client.force_authenticate(self.doctor)
        r = self.client.post('/api/v1/lab/orders/', {'uhid': 'NO-SUCH-UHID', 'testCode': self.test.test_code}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('not registered', r.data['error'])
        r = self.client.post('/api/v1/lab/orders/', {'uhid': self.patient.uhid, 'testName': 'Unicorn assay'}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('not in the lab catalog', r.data['error'])
        self.assertEqual(LabOrder.objects.count(), 0)

    def test_unknown_order_is_404_not_first_order(self):
        self.order()
        self.client.force_authenticate(self.tech)
        self.assertEqual(self.client.get('/api/v1/lab/orders/LAB-0000-9999/').status_code, 404)

    def test_order_numbers_are_unique_and_sequential(self):
        a = self.order().data['orderNumber']
        b = self.order().data['orderNumber']
        self.assertNotEqual(a, b)
        self.assertEqual(int(b.split('-')[-1]), int(a.split('-')[-1]) + 1)

    def test_roles_are_enforced(self):
        self.client.force_authenticate(self.cashier)
        r = self.client.post('/api/v1/lab/orders/', {'uhid': self.patient.uhid, 'testCode': self.test.test_code}, format='json')
        self.assertEqual(r.status_code, 403)
        oid = self.order().data['id']
        self.client.force_authenticate(self.nurse)
        self.assertEqual(self.client.post(f'/api/v1/lab/orders/{oid}/receive-sample/').status_code, 403)
        self.client.force_authenticate(self.tech)
        self.assertEqual(self.client.post('/api/v1/lab/reports/approve/', {'orderId': oid}, format='json').status_code, 403)

    # ---- doctor -> billing --------------------------------------------------------------------
    def test_order_stages_a_billing_charge_and_unpaid_blocks_collection(self):
        r = self.order()
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data['patient']['uhid'], self.patient.uhid)
        self.assertEqual(r.data['doctorName'], 'Dr. Arun Verma')
        self.assertEqual(r.data['location'], 'OPD Room 101')
        self.assertTrue(BillableChargeItem.objects.filter(department='LAB', source_reference_id=r.data['id']).exists())
        self.assertFalse(r.data['billing']['collectionAllowed'])

        self.client.force_authenticate(self.nurse)
        c = self.client.post(f"/api/v1/lab/orders/{r.data['id']}/collect-sample/")
        self.assertEqual(c.status_code, 402)
        self.assertEqual(LabOrder.objects.get(id=r.data['id']).status, LabOrderStatus.ORDERED)

    # ---- the full bench + sign-off flow ------------------------------------------------------
    def test_full_flow_with_critical_result(self):
        self.admit()
        oid = self.order().data['id']

        self.client.force_authenticate(self.nurse)
        self.assertEqual(self.client.post(f'/api/v1/lab/orders/{oid}/collect-sample/').status_code, 200)

        self.client.force_authenticate(self.tech)
        self.assertEqual(self.client.post(f'/api/v1/lab/orders/{oid}/receive-sample/').status_code, 200)
        # Results before the sample is on an analyzer are refused
        self.assertEqual(self.client.post(f'/api/v1/lab/orders/{oid}/results/', {'parameters': [{'paramName': 'Hemoglobin', 'observedValue': '6'}]}, format='json').status_code, 400)
        self.assertEqual(self.client.post(f'/api/v1/lab/orders/{oid}/start-analysis/', {'analyzerId': 'an-xn-t'}, format='json').status_code, 200)

        params = [{**p, 'paramName': p['name']} for p in CBC_SCHEMA]
        draft = [{**params[0], 'observedValue': '6.2'}, {**params[1], 'observedValue': ''}]
        r = self.client.post(f'/api/v1/lab/orders/{oid}/results/', {'parameters': draft, 'technicianNote': 'Re-run confirms'}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['status'], LabOrderStatus.IN_ANALYSIS)  # draft stays on the bench
        # Submit needs every value
        self.assertEqual(self.client.post(f'/api/v1/lab/orders/{oid}/results/', {'parameters': draft, 'submit': True}, format='json').status_code, 400)
        full = [{**params[0], 'observedValue': '6.2'}, {**params[1], 'observedValue': '7.5'}]
        r = self.client.post(f'/api/v1/lab/orders/{oid}/results/', {'parameters': full, 'submit': True}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['status'], LabOrderStatus.RESULTS_ENTERED)
        self.assertTrue(r.data['isFlaggedCritical'])  # 6.2 < critical low 7.0
        self.assertEqual(r.data['resultsEnteredByName'], 'Sunil Gowda')
        hb = next(x for x in r.data['results'] if x['paramName'] == 'Hemoglobin')
        self.assertEqual(hb['flag'], 'CRITICAL_LOW')

        self.client.force_authenticate(self.path)
        d = self.client.post(f'/api/v1/lab/orders/{oid}/interpretation-draft/', {'remarks': 'Draft note'}, format='json')
        self.assertEqual(d.data['pathologistRemarks'], 'Draft note')
        self.assertEqual(self.client.post(f'/api/v1/lab/orders/{oid}/log-call/', {'note': 'no answer'}, format='json').status_code, 400)
        # A critical result needs an interpretation
        self.assertEqual(self.client.post('/api/v1/lab/reports/approve/', {'orderId': oid}, format='json').status_code, 400)
        r = self.client.post('/api/v1/lab/reports/approve/', {'orderId': oid, 'remarks': 'Severe anaemia; transfuse per protocol.'}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data['reportNumber'].startswith('RPT-'))
        self.assertEqual(r.data['signedByName'], 'Kavitha Menon')
        self.assertEqual(LabOrder.objects.get(id=oid).status, LabOrderStatus.REPORT_APPROVED)

        self.assertEqual(self.client.post(f'/api/v1/lab/orders/{oid}/log-call/', {'note': 'no answer from ward'}, format='json').status_code, 200)
        # Doctor acknowledges the critical value in the app (must confirm the read-back); pathologist amends
        self.client.force_authenticate(self.doctor)
        self.assertEqual(self.client.post(f'/api/v1/lab/orders/{oid}/acknowledge-critical/', {'notes': 'Read back'}, format='json').status_code, 400)
        self.assertEqual(self.client.post(f'/api/v1/lab/orders/{oid}/acknowledge-critical/', {'notes': 'Read back', 'readBack': True}, format='json').status_code, 200)
        self.client.force_authenticate(self.path)
        a = self.client.post('/api/v1/lab/reports/amend/', {'orderId': oid, 'amendmentReason': 'Added transfusion advice.'}, format='json')
        self.assertEqual(a.status_code, 200)
        self.assertTrue(a.data['isAmended'])

        actions = list(AuditLog.objects.filter(entity_id=oid).order_by('created_at').values_list('action', flat=True))
        self.assertEqual(actions, ['LAB_ORDERED', 'SAMPLE_COLLECTED', 'SAMPLE_RECEIVED', 'ANALYSIS_STARTED', 'RESULTS_DRAFT_SAVED', 'RESULTS_SUBMITTED', 'REPORT_SIGNED', 'CRITICAL_CALL_ATTEMPT', 'CRITICAL_ACKNOWLEDGED', 'REPORT_AMENDED'])
        self.assertEqual(len(a.data['auditTrail']), 10)

    def test_reject_and_retest(self):
        self.admit()
        oid = self.order().data['id']
        self.client.force_authenticate(self.nurse)
        self.client.post(f'/api/v1/lab/orders/{oid}/collect-sample/')
        self.client.force_authenticate(self.tech)
        r = self.client.post(f'/api/v1/lab/orders/{oid}/reject-sample/', {'reason': 'Haemolysed'}, format='json')
        self.assertEqual(r.data['status'], LabOrderStatus.ORDERED)
        self.assertEqual(r.data['rejectedReason'], 'Haemolysed')
        self.assertIsNone(r.data['collectedAt'])

        self.client.force_authenticate(self.nurse)
        self.client.post(f'/api/v1/lab/orders/{oid}/collect-sample/')
        self.client.force_authenticate(self.tech)
        self.client.post(f'/api/v1/lab/orders/{oid}/receive-sample/')
        self.client.post(f'/api/v1/lab/orders/{oid}/start-analysis/', {'analyzerId': 'an-xn-t'}, format='json')
        params = [{**p, 'paramName': p['name'], 'observedValue': v} for p, v in zip(CBC_SCHEMA, ['14', '7'])]
        self.client.post(f'/api/v1/lab/orders/{oid}/results/', {'parameters': params, 'submit': True}, format='json')

        self.client.force_authenticate(self.path)
        r = self.client.post(f'/api/v1/lab/orders/{oid}/request-retest/', {'reason': 'Delta check failure'}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['status'], LabOrderStatus.IN_ANALYSIS)
        self.assertTrue(r.data['isRetest'])
        self.assertEqual(r.data['retestRequestedByName'], 'Kavitha Menon')
        # Normal result signs off without a remark
        self.client.force_authenticate(self.tech)
        self.client.post(f'/api/v1/lab/orders/{oid}/results/', {'parameters': params, 'submit': True}, format='json')
        self.client.force_authenticate(self.path)
        r = self.client.post('/api/v1/lab/reports/approve/', {'orderId': oid}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(LabReport.objects.get(order_id=oid).pathologist_remarks, 'All parameters within reference range.')

    def test_reports_list_for_signed_reports_screen(self):
        self.test_full_flow_with_critical_result()
        r = self.client.get('/api/v1/lab/reports/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data), 1)
        self.assertEqual(r.data[0]['order']['patient']['name'], 'Mohan Lal')


RANGES_V2 = {
    'adultMale': [
        {'name': 'Hemoglobin', 'unit': 'g/dL', 'low': 13.0, 'high': 17.0, 'criticalLow': 7.0, 'criticalHigh': 20.0},
        {'name': 'WBC Count', 'unit': '10^3/uL', 'low': 4.0, 'high': 11.0, 'criticalLow': 2.0, 'criticalHigh': 30.0},
    ],
    'adultFemale': [
        {'name': 'Hemoglobin', 'unit': 'g/dL', 'low': 12.0, 'high': 15.5, 'criticalLow': 8.0, 'criticalHigh': 20.0},
        {'name': 'WBC Count', 'unit': '10^3/uL', 'low': 4.0, 'high': 11.0, 'criticalLow': 2.0, 'criticalHigh': 30.0},
    ],
    'child': [
        {'name': 'Hemoglobin', 'unit': 'g/dL', 'low': 11.5, 'high': 14.5, 'criticalLow': 7.0, 'criticalHigh': 18.0},
    ],
}


class PathologistPhase2Tests(LabTestBase):
    """Versioned ranges, critical call-backs and report signatures."""

    def publish_v1(self):
        self.client.force_authenticate(self.path)
        return self.client.post(f'/api/v1/lab/tests/{self.test.id}/publish-ranges/', {'ranges': {'adultMale': CBC_SCHEMA_ROWS, 'adultFemale': CBC_SCHEMA_ROWS, 'child': CBC_SCHEMA_ROWS}}, format='json')

    def run_to_review(self, values, patient=None):
        """Order -> collect -> receive -> analyze -> submit; returns order id."""
        patient = patient or self.patient
        InpatientAdmission.objects.get_or_create(admission_number=f'ADM-{patient.uhid}', defaults={'patient': patient, 'status': 'ADMITTED', 'ward_name': '4B'})
        self.client.force_authenticate(self.doctor)
        oid = self.client.post('/api/v1/lab/orders/', {'uhid': patient.uhid, 'testCode': self.test.test_code, 'priority': 'STAT'}, format='json').data['id']
        self.client.force_authenticate(self.nurse)
        self.client.post(f'/api/v1/lab/orders/{oid}/collect-sample/')
        self.client.force_authenticate(self.tech)
        self.client.post(f'/api/v1/lab/orders/{oid}/receive-sample/')
        self.client.post(f'/api/v1/lab/orders/{oid}/start-analysis/', {'analyzerId': 'an-xn-t'}, format='json')
        # The screen sends deliberately wrong limits: the server must use the published ones
        params = [{'paramName': n, 'observedValue': v, 'low': 0, 'high': 1000} for n, v in values.items()]
        r = self.client.post(f'/api/v1/lab/orders/{oid}/results/', {'parameters': params, 'submit': True}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        return oid

    # ---- versioned ranges ------------------------------------------------------------------
    def test_range_versions_draft_publish_retire(self):
        self.assertEqual(self.publish_v1().data['publishedRanges']['version'], 1)

        self.client.force_authenticate(self.tech)
        self.assertEqual(self.client.post(f'/api/v1/lab/tests/{self.test.id}/range-draft/', {'ranges': RANGES_V2}, format='json').status_code, 403)

        self.client.force_authenticate(self.path)
        bad = {'adultMale': [{'name': 'Hemoglobin', 'unit': 'g/dL', 'low': 17, 'high': 13, 'criticalLow': 15}]}
        r = self.client.post(f'/api/v1/lab/tests/{self.test.id}/range-draft/', {'ranges': bad}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('low must be below high', r.data['error'])

        r = self.client.post(f'/api/v1/lab/tests/{self.test.id}/range-draft/', {'ranges': RANGES_V2}, format='json')
        self.assertEqual(r.data['draftRanges']['status'], 'DRAFT')
        self.assertEqual(r.data['publishedRanges']['version'], 1)  # draft is not live yet

        r = self.client.post(f'/api/v1/lab/tests/{self.test.id}/publish-ranges/', {}, format='json')
        self.assertEqual(r.data['publishedRanges']['version'], 2)
        self.assertIsNone(r.data['draftRanges'])
        statuses = dict(LabTestRangeVersion.objects.filter(test=self.test).values_list('version', 'status'))
        self.assertEqual(statuses, {1: 'RETIRED', 2: 'PUBLISHED'})
        self.assertEqual([h['version'] for h in r.data['versionHistory']], [2, 1])
        self.assertEqual(self.client.post(f'/api/v1/lab/tests/{self.test.id}/publish-ranges/', {}, format='json').status_code, 400)

    def test_results_flagged_against_published_ranges_for_patient_group(self):
        self.client.force_authenticate(self.path)
        self.client.post(f'/api/v1/lab/tests/{self.test.id}/publish-ranges/', {'ranges': RANGES_V2}, format='json')
        woman = Patient.objects.create(first_name='Asha', last_name='Rao', gender='FEMALE', date_of_birth='1990-05-01', uhid='NH-LAB-T-02', phone_number='9000000002')

        # Order serializer gives each patient their group's limits
        self.client.force_authenticate(self.doctor)
        o = self.client.post('/api/v1/lab/orders/', {'uhid': woman.uhid, 'testCode': self.test.test_code}, format='json').data
        hb = next(p for p in o['test']['parametersSchema'] if p['name'] == 'Hemoglobin')
        self.assertEqual((hb['low'], hb['criticalLow'], o['test']['rangeVersion']), (12.0, 8.0, 1))

        # 7.5 is critical for a woman (critical low 8.0) but only low for a man (critical low 7.0)
        her = self.run_to_review({'Hemoglobin': '7.5', 'WBC Count': '6'}, patient=woman)
        him = self.run_to_review({'Hemoglobin': '7.5', 'WBC Count': '6'})
        self.assertEqual(LabResult.objects.get(lab_order_id=her, parameter_name='Hemoglobin').flag, 'CRITICAL_LOW')
        self.assertEqual(LabResult.objects.get(lab_order_id=him, parameter_name='Hemoglobin').flag, 'LOW')
        self.assertEqual(LabResult.objects.get(lab_order_id=him, parameter_name='Hemoglobin').range_version, 1)

    def test_pathologist_creates_test_as_draft(self):
        self.client.force_authenticate(self.tech)
        body = {'testCode': 'IMM-TSH-01', 'name': 'TSH', 'category': 'Immunoassay', 'tatMinutes': 240, 'statTatMinutes': 60,
                'ranges': {'adultMale': [{'name': 'TSH', 'unit': 'uIU/mL', 'low': 0.4, 'high': 4.0}]}}
        self.assertEqual(self.client.post('/api/v1/lab/tests/', body, format='json').status_code, 403)
        self.client.force_authenticate(self.path)
        r = self.client.post('/api/v1/lab/tests/', body, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertIsNone(r.data['publishedRanges'])
        self.assertEqual(r.data['draftRanges']['ranges']['adultMale'][0]['name'], 'TSH')
        self.assertEqual(self.client.post('/api/v1/lab/tests/', body, format='json').status_code, 400)  # duplicate code

    # ---- call-backs ------------------------------------------------------------------------
    def test_critical_callback_lifecycle(self):
        self.publish_v1()
        oid = self.run_to_review({'Hemoglobin': '6.1', 'WBC Count': '6'})
        self.client.force_authenticate(self.path)
        self.client.post('/api/v1/lab/reports/approve/', {'orderId': oid, 'remarks': 'Severe anaemia, transfuse.'}, format='json')

        cb = CriticalCallback.objects.get(order_id=oid)
        self.assertEqual((cb.status, cb.ack_window_minutes), ('PENDING', 15))
        self.assertEqual(cb.critical_values[0]['name'], 'Hemoglobin')

        pending = self.client.get('/api/v1/lab/callbacks/', {'status': 'PENDING'}).data
        self.assertEqual([c['order']['id'] for c in pending], [oid])

        self.client.post(f'/api/v1/lab/orders/{oid}/log-call/', {'outcome': 'NO_ANSWER', 'note': 'ward line busy'}, format='json')
        # Lab staff must name the receiver and confirm the read-back
        self.assertEqual(self.client.post(f'/api/v1/lab/orders/{oid}/acknowledge-critical/', {'readBack': True}, format='json').status_code, 400)
        self.assertEqual(self.client.post(f'/api/v1/lab/orders/{oid}/acknowledge-critical/', {'receivedByName': 'Dr. Iyer'}, format='json').status_code, 400)
        r = self.client.post(f'/api/v1/lab/orders/{oid}/acknowledge-critical/', {'receivedByName': 'Dr. Iyer', 'receivedByRole': 'Resident on duty', 'readBack': True}, format='json')
        self.assertEqual(r.status_code, 200)
        cb.refresh_from_db()
        self.assertEqual((cb.status, cb.received_by_name, cb.received_by_role, cb.read_back_confirmed), ('ACKNOWLEDGED', 'Dr. Iyer', 'Resident on duty', True))
        self.assertEqual(cb.attempts.count(), 1)
        self.assertEqual(self.client.post(f'/api/v1/lab/orders/{oid}/acknowledge-critical/', {'receivedByName': 'Dr. X', 'readBack': True}, format='json').status_code, 400)
        report = self.client.get('/api/v1/lab/reports/').data[0]
        self.assertEqual(report['callback']['receivedByName'], 'Dr. Iyer')
        self.assertEqual(len(report['callback']['attempts']), 1)

    # ---- signatures ------------------------------------------------------------------------
    def test_signature_verify_tamper_and_addenda(self):
        self.publish_v1()
        oid = self.run_to_review({'Hemoglobin': '14', 'WBC Count': '6'})
        self.client.force_authenticate(self.path)
        rep = self.client.post('/api/v1/lab/reports/approve/', {'orderId': oid}, format='json').data
        self.assertRegex(rep['signatureHash'], r'^[0-9a-f]{64}$')
        self.assertEqual(rep['signerDesignation'], 'Pathologist')
        self.assertEqual(self.client.get(f"/api/v1/lab/reports/{rep['id']}/verify/").data['status'], 'VALID')

        for text in ['First addendum text here.', 'Second addendum text here.']:
            self.client.post('/api/v1/lab/reports/amend/', {'orderId': oid, 'amendmentReason': text}, format='json')
        detail = self.client.get(f"/api/v1/lab/reports/{rep['id']}/").data
        self.assertEqual([a['number'] for a in detail['amendments']], [1, 2])
        self.assertEqual(detail['version'], 3)
        v = self.client.get(f"/api/v1/lab/reports/{rep['id']}/verify/").data
        self.assertEqual((v['status'], [a['status'] for a in v['amendments']]), ('VALID', ['VALID', 'VALID']))

        # Changing a released value directly in the database breaks the signature
        LabResult.objects.filter(lab_order_id=oid, parameter_name='Hemoglobin').update(observed_value='9.9')
        self.assertEqual(self.client.get(f"/api/v1/lab/reports/{rep['id']}/verify/").data['status'], 'TAMPERED')


class TechnicianPhase3Tests(LabTestBase):
    """QC runs, analyzer assignment and sample rejection."""

    def to_bench(self):
        self.admit()
        oid = self.order().data['id']
        self.client.force_authenticate(self.nurse)
        self.client.post(f'/api/v1/lab/orders/{oid}/collect-sample/')
        self.client.force_authenticate(self.tech)
        self.client.post(f'/api/v1/lab/orders/{oid}/receive-sample/')
        return oid

    def load(self, oid, code):
        return self.client.post(f'/api/v1/lab/orders/{oid}/start-analysis/', {'analyzerId': code}, format='json')

    def submit(self, oid):
        params = [{**p, 'paramName': p['name'], 'observedValue': v} for p, v in zip(CBC_SCHEMA, ['14', '7'])]
        return self.client.post(f'/api/v1/lab/orders/{oid}/results/', {'parameters': params, 'submit': True}, format='json')

    def qc(self, code, passed, note=''):
        return self.client.post(f'/api/v1/lab/equipment/{code}/qc/', {'level': 'Level 2', 'lot': '8822', 'passed': passed, 'note': note}, format='json')

    def test_qc_due_blocks_loading_until_a_pass(self):
        fresh = Equipment.objects.create(code='an-new', name='New Analyzer', serial_number='N-1', section='Hematology', status='READY')
        oid = self.to_bench()
        r = self.load(oid, 'an-new')
        self.assertEqual(r.status_code, 400)
        self.assertIn('QC is due', r.data['error'])
        self.assertEqual(self.client.get('/api/v1/lab/equipment/an-new/').data['qcStatus'], 'DUE')
        self.assertEqual(self.qc('an-new', True).status_code, 200)
        r = self.load(oid, 'an-new')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['analyzer']['code'], 'an-new')
        self.assertEqual(self.client.get('/api/v1/lab/equipment/an-new/').data['queuedCount'], 1)
        fresh.refresh_from_db()
        self.assertEqual(fresh.qc_status(), 'OK')

    def test_failed_qc_holds_results_and_needs_a_note(self):
        oid = self.to_bench()
        self.load(oid, 'an-xn-t')
        self.assertEqual(self.qc('an-xn-t', False).status_code, 400)  # failure needs a description
        r = self.qc('an-xn-t', False, '1-3s violation on level 2')
        self.assertEqual(r.data['qcStatus'], 'FAILED')
        self.assertTrue(r.data['alertTitle'].startswith('QC failed'))
        s = self.submit(oid)
        self.assertEqual(s.status_code, 400)
        self.assertIn('QC failed', s.data['error'])
        # Moving the sample to an analyzer in control releases it
        self.assertEqual(self.load(oid, 'an-xn-b').status_code, 200)
        self.assertEqual(self.submit(oid).status_code, 200)
        # A pass clears the hold and the alert
        r = self.qc('an-xn-t', True)
        self.assertEqual((r.data['qcStatus'], r.data['alertTitle']), ('OK', ''))
        self.client.force_authenticate(self.nurse)
        self.assertEqual(self.qc('an-xn-t', True).status_code, 403)

    def test_fault_then_return_to_service_requires_qc(self):
        oid = self.to_bench()
        self.load(oid, 'an-xn-t')
        r = self.client.post('/api/v1/lab/equipment/an-xn-t/report-fault/', {'description': 'Aspiration error E-31'}, format='json')
        self.assertEqual(r.data['status'], 'OFFLINE')
        order = self.client.get(f'/api/v1/lab/orders/{oid}/').data
        self.assertIn('offline', order['analyzer']['blockReason'])
        self.assertIn('offline', self.submit(oid).data['error'])
        self.assertEqual(self.qc('an-xn-t', True).status_code, 400)  # no QC while offline

        r = self.client.post('/api/v1/lab/equipment/an-xn-t/return-to-service/')
        self.assertEqual((r.data['status'], r.data['qcStatus']), ('READY', 'DUE'))
        self.assertEqual(self.client.post('/api/v1/lab/equipment/an-xn-t/return-to-service/').status_code, 400)
        self.qc('an-xn-t', True)
        self.assertEqual(self.submit(oid).status_code, 200)

    def test_sample_rejection_history(self):
        oid = self.to_bench()
        self.client.force_authenticate(self.nurse)
        self.assertEqual(self.client.post(f'/api/v1/lab/orders/{oid}/reject-sample/', {'reason': 'Haemolysed'}, format='json').status_code, 403)
        self.client.force_authenticate(self.tech)
        self.assertEqual(self.client.post(f'/api/v1/lab/orders/{oid}/reject-sample/', {'reasonCode': 'OTHER', 'reason': 'odd'}, format='json').status_code, 400)
        r = self.client.post(f'/api/v1/lab/orders/{oid}/reject-sample/', {'reasonCode': 'HAEMOLYSED', 'reason': 'Haemolysed — visible after spin'}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['status'], 'ORDERED')
        self.assertEqual(r.data['rejections'][0]['reasonCode'], 'HAEMOLYSED')
        self.assertEqual(r.data['rejections'][0]['stage'], 'SAMPLE_RECEIVED')
        self.assertEqual(r.data['rejections'][0]['collectedByName'], 'Clara Adams')
        self.assertEqual(SampleRejection.objects.filter(order_id=oid).count(), 1)


class LabAdminPhase4Tests(LabTestBase):
    """Staff linked to accounts, roster, requests, equipment register, stock, pricing via Billing, settings."""

    def setUp(self):
        super().setUp()
        self.admin = user('lab_t_admin', RoleType.DEPARTMENT_ADMIN, 'Marcus', 'Vance')
        self.billing_admin = user('lab_t_billing', RoleType.BILLING_ADMIN, 'Rhea', 'Kapoor')
        self.client.force_authenticate(self.admin)

    def add_tech(self):
        r = self.client.post('/api/v1/lab/admin/staff/', {'userId': str(self.tech.id), 'code': 'EMP-L-0001', 'role': 'Lab Technologist', 'category': 'Technologist', 'defaultShift': 'M'}, format='json')
        self.assertEqual(r.status_code, 201, r.data)
        return r.data['id']

    def test_staff_must_be_an_account_and_only_admin_changes(self):
        self.client.force_authenticate(self.tech)
        self.assertEqual(self.client.post('/api/v1/lab/admin/staff/', {'userId': str(self.tech.id), 'role': 'x'}, format='json').status_code, 403)
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.post('/api/v1/lab/admin/staff/', {'role': 'Lab Technologist'}, format='json').status_code, 400)
        candidates = [c['id'] for c in self.client.get('/api/v1/lab/admin/staff/candidates/').data]
        self.assertIn(str(self.tech.id), candidates)
        sid = self.add_tech()
        self.assertNotIn(str(self.tech.id), [c['id'] for c in self.client.get('/api/v1/lab/admin/staff/candidates/').data])
        state = self.client.get('/api/v1/lab/admin/state/').data
        member = next(x for x in state['staff'] if x['id'] == sid)
        self.assertEqual((member['name'], member['code']), ('Sunil Gowda', 'EMP-L-0001'))  # name from the account
        self.assertEqual(state['roster']['cells'][sid], ['M', 'M', 'M', 'M', 'M', 'O', 'O'])
        self.assertEqual(self.client.post('/api/v1/lab/admin/staff/', {'userId': str(self.tech.id), 'role': 'x', 'category': 'Technologist'}, format='json').status_code, 400)
        r = self.client.patch(f'/api/v1/lab/admin/staff/{sid}/', {'credentialName': 'State lab licence', 'credentialExpiry': '2027-01-31', 'suspended': True}, format='json')
        self.assertEqual((r.data['credentialExpiry'], r.data['suspended']), ('2027-01-31', True))

    def test_roster_shift_publish_next_week_and_requests(self):
        sid = self.add_tech()
        self.client.post('/api/v1/lab/admin/roster/shift/', {'staffId': sid, 'day': 2, 'code': 'N'}, format='json')
        r = self.client.post('/api/v1/lab/admin/roster/publish/')
        self.assertTrue(r.data['published'])
        self.assertEqual(r.data['cells'][sid][2], 'N')

        # The technician raises leave for themselves, not for others
        self.client.force_authenticate(self.tech)
        self.assertEqual(self.client.post('/api/v1/lab/admin/requests/', {'staffId': sid, 'type': 'Leave', 'days': [3, 4], 'reason': 'Family function'}, format='json').status_code, 201)
        self.client.force_authenticate(self.nurse)
        self.assertEqual(self.client.post('/api/v1/lab/admin/requests/', {'staffId': sid, 'type': 'Leave', 'days': [1], 'reason': 'x y z'}, format='json').status_code, 403)

        self.client.force_authenticate(self.admin)
        req = self.client.get('/api/v1/lab/admin/state/').data['requests'][0]
        state = self.client.post(f"/api/v1/lab/admin/requests/{req['id']}/decide/", {'approve': True}, format='json').data
        self.assertEqual(state['roster']['cells'][sid][3:5], ['L', 'L'])
        self.assertFalse(state['roster']['published'])  # changed after publishing
        self.assertEqual(self.client.post(f"/api/v1/lab/admin/requests/{req['id']}/decide/", {'approve': False}, format='json').status_code, 400)

        nxt = self.client.post('/api/v1/lab/admin/roster/next-week/').data
        self.assertEqual(nxt['cells'][sid], state['roster']['cells'][sid])
        self.assertGreater(nxt['weekStart'], state['roster']['weekStart'])

    def test_equipment_register_and_service_log(self):
        r = self.client.post('/api/v1/lab/admin/analyzers/', {'name': 'Mindray BC-6800', 'serial': 'MR-6800-01', 'section': 'Hematology', 'contract': 'Mindray AMC'}, format='json')
        code = r.data['code']
        eq = Equipment.objects.get(code=code)
        self.assertEqual((eq.status, eq.qc_status()), ('READY', 'DUE'))
        self.assertEqual(self.client.post('/api/v1/lab/admin/analyzers/', {'name': 'Dup', 'serial': 'MR-6800-01'}, format='json').status_code, 400)
        meta = self.client.post(f'/api/v1/lab/admin/equipment/{code}/log/', {'text': 'Quarterly PM done', 'kind': 'pm'}, format='json').data
        self.assertEqual(meta['log'][0]['text'], 'Quarterly PM done')
        self.assertTrue(meta['nextPm'] > meta['lastPm'])

    def test_stock_and_purchase_workflow(self):
        item = self.client.post('/api/v1/lab/admin/stock/', {'name': 'CBC lyse', 'unit': 'L', 'onHand': 2, 'reorderAt': 4, 'maxLevel': 20}, format='json').data['id']
        small = self.client.post('/api/v1/lab/admin/purchases/', {'stockId': item, 'qty': 10, 'estCost': 12000}, format='json').data
        big = self.client.post('/api/v1/lab/admin/purchases/', {'stockId': item, 'qty': 100, 'estCost': 90000}, format='json').data
        self.assertEqual((small['status'], big['status']), ('Awaiting approval', 'Awaiting Finance'))
        self.assertNotEqual(small['code'], big['code'])
        self.assertEqual(self.client.post(f"/api/v1/lab/admin/purchases/{small['id']}/status/", {'status': 'Delivered'}, format='json').status_code, 400)
        self.client.post(f"/api/v1/lab/admin/purchases/{small['id']}/status/", {'status': 'Ordered'}, format='json')
        self.client.post(f"/api/v1/lab/admin/purchases/{small['id']}/status/", {'status': 'Delivered'}, format='json')
        stock = next(x for x in self.client.get('/api/v1/lab/admin/state/').data['stock'] if x['id'] == item)
        self.assertEqual(stock['onHand'], 12)

    def test_price_goes_through_billing_approval(self):
        from apps.billing.models import TariffMaster, TariffChangeRequest
        from apps.billing.services import TariffGovernanceService
        # Billing creates the tariff when a lab test is saved; make the starting price explicit
        TariffMaster.objects.update_or_create(code=self.test.test_code, defaults={'name': self.test.name, 'department': 'LAB', 'owner_department': 'LAB', 'base_price': Decimal('350.00'), 'is_active': True})
        bad = self.client.post('/api/v1/lab/admin/pricing/draft/', {'code': self.test.test_code, 'basePrice': 300, 'tpaPrice': 320}, format='json')
        self.assertEqual(bad.status_code, 400)
        self.client.post('/api/v1/lab/admin/pricing/draft/', {'code': self.test.test_code, 'basePrice': 380, 'tpaPrice': 330, 'statSurcharge': 'Rs. 200'}, format='json')
        r = self.client.post('/api/v1/lab/admin/pricing/submit/', {}, format='json')
        self.assertEqual(r.data['errors'], [])
        number = r.data['submitted'][0]['requestNumber']
        pending = r.data['pricing']['pending'][self.test.name]
        self.assertEqual((pending['proposedPrice'], pending['status']), (380.0, 'PENDING'))
        self.assertEqual(r.data['pricing']['tariffs'][self.test.name]['basePrice'], 350.0)  # unchanged until Billing approves
        self.assertEqual(self.client.get('/api/v1/lab/admin/state/').data['priceDrafts'], {})
        self.test.refresh_from_db()
        self.assertEqual((self.test.tpa_price, self.test.stat_surcharge), (Decimal('330.00'), 'Rs. 200'))

        # Lab Admin cannot approve their own change; Billing can
        req = TariffChangeRequest.objects.get(request_number=number)
        with self.assertRaises(PermissionError):
            TariffGovernanceService.decide_change(req.id, self.admin, 'APPROVE')
        TariffGovernanceService.decide_change(req.id, self.billing_admin, 'APPROVE')
        TariffGovernanceService.sync_due_versions()
        live = self.client.get('/api/v1/lab/admin/pricing/').data
        self.assertEqual(live['tariffs'][self.test.name]['basePrice'], 380.0)
        self.assertNotIn(self.test.name, live['pending'])

    def test_settings_drive_the_critical_read_back_window(self):
        self.assertEqual(self.client.post('/api/v1/lab/admin/settings/', {'settings': {'criticalAckWindow': 'soon'}}, format='json').status_code, 400)
        self.assertEqual(self.client.post('/api/v1/lab/admin/settings/', {'settings': {'bogus': 1}}, format='json').status_code, 400)
        r = self.client.post('/api/v1/lab/admin/settings/', {'settings': {'criticalAckWindow': '30 minutes', 'hod': 'Dr. K. Menon'}}, format='json')
        self.assertEqual((r.data['criticalAckWindow'], r.data['savedBy']), ('30 minutes', 'Marcus Vance'))

        # A critical report signed now opens a call-back with the new window
        self.admit()
        oid = self.order().data['id']
        self.client.force_authenticate(self.nurse)
        self.client.post(f'/api/v1/lab/orders/{oid}/collect-sample/')
        self.client.force_authenticate(self.tech)
        self.client.post(f'/api/v1/lab/orders/{oid}/receive-sample/')
        self.client.post(f'/api/v1/lab/orders/{oid}/start-analysis/', {'analyzerId': 'an-xn-t'}, format='json')
        params = [{**p, 'paramName': p['name'], 'observedValue': v} for p, v in zip(CBC_SCHEMA, ['6', '7'])]
        self.client.post(f'/api/v1/lab/orders/{oid}/results/', {'parameters': params, 'submit': True}, format='json')
        self.client.force_authenticate(self.path)
        self.client.post('/api/v1/lab/reports/approve/', {'orderId': oid, 'remarks': 'Severe anaemia, transfuse.'}, format='json')
        self.assertEqual(CriticalCallback.objects.get(order_id=oid).ack_window_minutes, 30)
        events = self.client.get('/api/v1/lab/admin/state/').data['events']
        self.assertTrue(any('criticalAckWindow' in e['text'] for e in events))
