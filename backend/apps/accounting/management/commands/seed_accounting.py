import uuid
from decimal import Decimal
from datetime import date
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.accounts.models import RoleType
from apps.accounting.models import (
    ChartOfAccount, CostCenter, BankAccount, DelegationLimit,
    PeriodLock, PeriodLockStatus, AccountType, ControlAccountType
)

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds Chart of Accounts, Cost Centers, DoFA matrix, Bank Accounts, FY2026-27 periods and accounts staff'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("==> Seeding Accounts Department Master Data & Roles..."))

        # 1. Staff Users
        staff_data = [
            ('accounts_exec', 'priya.nair@northhospital.com', 'Priya', 'Nair', RoleType.ACCOUNTS_EXECUTIVE, 'Accounts Executive (AE-01 · Maker)'),
            ('accounts_sup', 'rahul.menon@northhospital.com', 'Rahul', 'Menon', RoleType.ACCOUNTS_SUPERVISOR, 'Accounts Supervisor (AS-01 · First Checker)'),
            ('accounts_mgr', 'kavita.shah@northhospital.com', 'Kavita', 'Shah', RoleType.ACCOUNTS_MANAGER, 'Accounts Manager (AM-01 · Operations Owner)'),
            ('finance_ctrl', 'anil.verma@northhospital.com', 'Anil', 'Verma', RoleType.FINANCE_CONTROLLER, 'Finance Controller (FC-01 · Integrity & Close)'),
            ('cfo_user', 'meera.rao@northhospital.com', 'Meera', 'Rao', RoleType.CFO, 'Chief Financial Officer (CFO-01 · Strategy)'),
            ('auditor_ext', 'auditor@northhospital.com', 'Arun', 'Mehta', RoleType.AUDITOR, 'External Statutory Auditor (AUD-01)'),
        ]

        for username, email, first_name, last_name, role, designation in staff_data:
            user = User.objects.filter(email__iexact=email).first() or User.objects.filter(username__iexact=username).first()
            if not user:
                user = User.objects.create(
                    username=username,
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    role=role
                )
            else:
                user.username = username
                user.email = email
                user.first_name = first_name
                user.last_name = last_name
                user.role = role
            user.set_password('Password123!')
            user.save()
            self.stdout.write(self.style.SUCCESS(f"  + Synced User: {username} ({role})"))

        # 2. Chart of Accounts (COA)
        coa_masters = [
            # ASSETS (1000s)
            ('1000', 'Cash in Hand (Cashier Counters)', AccountType.ASSET, 'current_asset', True, ControlAccountType.NONE),
            ('1010', 'HDFC Bank - Collections Account (••4417)', AccountType.ASSET, 'bank', True, ControlAccountType.BANK),
            ('1020', 'ICICI Bank - Operating Account (••8820)', AccountType.ASSET, 'bank', True, ControlAccountType.BANK),
            ('1100', 'Patient Accounts Receivable Subledger', AccountType.ASSET, 'receivable', True, ControlAccountType.RECEIVABLE),
            ('1110', 'Insurance & TPA Claims Receivable', AccountType.ASSET, 'receivable', True, ControlAccountType.RECEIVABLE),
            ('1120', 'Corporate Credit Accounts Receivable', AccountType.ASSET, 'receivable', True, ControlAccountType.RECEIVABLE),
            ('1200', 'Pharmacy Inventory & Medical Stock', AccountType.ASSET, 'inventory', True, ControlAccountType.NONE),
            # LIABILITIES (2000s)
            ('2000', 'Trade Creditors (Accounts Payable)', AccountType.LIABILITY, 'payable', True, ControlAccountType.PAYABLE),
            ('2100', 'Output CGST Payable Account', AccountType.LIABILITY, 'statutory', True, ControlAccountType.GST_OUTPUT),
            ('2110', 'Output SGST Payable Account', AccountType.LIABILITY, 'statutory', True, ControlAccountType.GST_OUTPUT),
            ('2200', 'TDS Withholding Tax Payable', AccountType.LIABILITY, 'statutory', True, ControlAccountType.TDS),
            ('2300', 'Patient Advance Deposits Liability', AccountType.LIABILITY, 'current_liability', True, ControlAccountType.NONE),
            # EQUITY (3000s)
            ('3000', 'Hospital Capital Fund & Reserves', AccountType.EQUITY, 'capital', True, ControlAccountType.NONE),
            # REVENUE (4000s)
            ('4000', 'Outpatient Consultation Fee Revenue', AccountType.REVENUE, 'operating_revenue', True, ControlAccountType.NONE),
            ('4100', 'Laboratory & Pathology Investigations Revenue', AccountType.REVENUE, 'operating_revenue', True, ControlAccountType.NONE),
            ('4200', 'Pharmacy Medicine & Consumables Sales', AccountType.REVENUE, 'operating_revenue', True, ControlAccountType.NONE),
            ('4300', 'Inpatient Bed & Room Charges Revenue', AccountType.REVENUE, 'operating_revenue', True, ControlAccountType.NONE),
            ('4400', 'Operation Theatre & Surgical Procedure Fees', AccountType.REVENUE, 'operating_revenue', True, ControlAccountType.NONE),
            # EXPENSES (5000s)
            ('5000', 'Clinical Staff Salaries & Medical Honoraria', AccountType.EXPENSE, 'payroll', True, ControlAccountType.NONE),
            ('5100', 'Pharmacy Cost of Goods Sold (COGS)', AccountType.EXPENSE, 'cost_of_sales', True, ControlAccountType.NONE),
            ('5200', 'Diagnostic Lab Reagents & Consumables Expense', AccountType.EXPENSE, 'operating_expense', True, ControlAccountType.NONE),
            ('5300', 'Hospital Power & Utility Maintenance', AccountType.EXPENSE, 'administrative', True, ControlAccountType.NONE),
        ]

        for code, name, acc_type, sub_type, is_post, ctrl in coa_masters:
            obj, created = ChartOfAccount.objects.update_or_create(
                hospital_id='HOSP-NORTH-01',
                code=code,
                defaults={
                    'name': name,
                    'type': acc_type,
                    'sub_type': sub_type,
                    'is_postable': is_post,
                    'is_control_account': ctrl != ControlAccountType.NONE,
                    'control_for': ctrl,
                    'active': True
                }
            )
        self.stdout.write(self.style.SUCCESS(f"  + Seeded {len(coa_masters)} Chart of Accounts entries."))

        # 3. Cost Centers
        cc_masters = [
            ('CC-100', 'Outpatient Department (OPD)', 'opd'),
            ('CC-200', 'Inpatient Wards & Nursing (IPD)', 'ipd'),
            ('CC-210', 'Intensive Care Unit (ICU)', 'ipd'),
            ('CC-300', 'Diagnostic Pathology Laboratory', 'lab'),
            ('CC-400', 'Central Hospital Pharmacy', 'pharmacy'),
            ('CC-500', 'Hospital Administration & Accounts', 'finance'),
        ]
        for code, name, dept in cc_masters:
            CostCenter.objects.update_or_create(
                hospital_id='HOSP-NORTH-01',
                code=code,
                defaults={'name': name, 'department_id': dept, 'active': True}
            )
        self.stdout.write(self.style.SUCCESS(f"  + Seeded {len(cc_masters)} Cost Centers."))

        # 4. Bank Accounts
        bank_hdfc = ChartOfAccount.objects.get(code='1010')
        bank_icici = ChartOfAccount.objects.get(code='1020')
        BankAccount.objects.update_or_create(
            hospital_id='HOSP-NORTH-01',
            account_no_masked='••4417',
            ifsc='HDFC0001234',
            defaults={
                'bank_name': 'HDFC Bank',
                'purpose': 'collections',
                'gl_account': bank_hdfc,
                'book_balance': Decimal('4850000.00'),
                'statement_balance': Decimal('4850000.00'),
                'frozen': False
            }
        )
        BankAccount.objects.update_or_create(
            hospital_id='HOSP-NORTH-01',
            account_no_masked='••8820',
            ifsc='ICIC0005678',
            defaults={
                'bank_name': 'ICICI Bank',
                'purpose': 'payments',
                'gl_account': bank_icici,
                'book_balance': Decimal('3250000.00'),
                'statement_balance': Decimal('3250000.00'),
                'frozen': False
            }
        )
        self.stdout.write(self.style.SUCCESS("  + Seeded Hospital Bank Accounts."))

        # 5. Delegation of Financial Authority (DoFA POL-01 v3.2)
        dofa_matrix = [
            # Journals
            ('supervisor', 'journal', Decimal('50000.00')),
            ('manager', 'journal', Decimal('500000.00')),
            ('controller', 'journal', Decimal('5000000.00')),
            ('cfo', 'journal', None),
            # Vendor bills
            ('supervisor', 'vendor_bill', Decimal('100000.00')),
            ('manager', 'vendor_bill', Decimal('1000000.00')),
            ('controller', 'vendor_bill', Decimal('5000000.00')),
            ('cfo', 'vendor_bill', None),
            # Expense requests
            ('supervisor', 'expense', Decimal('25000.00')),
            ('manager', 'expense', Decimal('200000.00')),
            ('controller', 'expense', Decimal('5000000.00')),
            ('cfo', 'expense', None),
            # Refunds & adjustments
            ('supervisor', 'refund', Decimal('0.00')),
            ('manager', 'refund', Decimal('500000.00')),
            ('controller', 'refund', Decimal('5000000.00')),
            ('cfo', 'refund', None),
            # Write-offs
            ('supervisor', 'write_off', Decimal('10000.00')),
            ('manager', 'write_off', Decimal('100000.00')),
            ('controller', 'write_off', Decimal('1000000.00')),
            ('cfo', 'write_off', None),
            # CapEx
            ('controller', 'capex', Decimal('0.00')),
            ('cfo', 'capex', Decimal('250000000.00')),  # 25 Cr
        ]

        for role, doc_type, limit in dofa_matrix:
            DelegationLimit.objects.update_or_create(
                policy_version_id='POL-01-v3.2',
                role=role,
                document_type=doc_type,
                defaults={'max_amount': limit}
            )
        self.stdout.write(self.style.SUCCESS("  + Seeded Delegation of Authority (DoFA) rules."))

        # 6. Fiscal Periods (FY 2026-27: 2026-04 through 2027-03)
        months = [
            ('2026-04', PeriodLockStatus.LOCKED),
            ('2026-05', PeriodLockStatus.LOCKED),
            ('2026-06', PeriodLockStatus.LOCKED),
            ('2026-07', PeriodLockStatus.LOCKED),
            ('2026-08', PeriodLockStatus.LOCKED),
            ('2026-09', PeriodLockStatus.LOCKED),
            ('2026-10', PeriodLockStatus.OPEN),     # Current active period
            ('2026-11', PeriodLockStatus.OPEN),
            ('2026-12', PeriodLockStatus.OPEN),
            ('2027-01', PeriodLockStatus.OPEN),
            ('2027-02', PeriodLockStatus.OPEN),
            ('2027-03', PeriodLockStatus.OPEN),
        ]
        for period_key, status in months:
            PeriodLock.objects.update_or_create(
                branch_id='MAIN',
                period_type='month',
                period_key=period_key,
                defaults={'status': status}
            )
        self.stdout.write(self.style.SUCCESS("  + Seeded FY 2026-27 Fiscal Periods (2026-09 locked, 2026-10 open)."))

        # 7. Phase 2: Financial Events for Executive Inbox
        from apps.accounting.models import (
            FinancialEvent, EventStatus, Journal, JournalLine, VendorBill,
            ThreeWayMatch, BankStatement, BankTransaction, Receivable,
            CollectionCase, CollectionFollowup, ExpenseRequest, GSTBatch, GSTBatchLine
        )
        exec_user = User.objects.get(username='accounts_exec')

        events_data = [
            ('EVT-2026-001', 'billing', 'BILL-IPD-8891', 'BILLING_INVOICE_GENERATED', Decimal('84500.00'), 'Discharge invoice for patient Priya Sharma (IPD-402)'),
            ('EVT-2026-002', 'pharmacy', 'PHARM-SALE-4402', 'PHARMACY_SALE', Decimal('3250.00'), 'Counter dispense for OPD prescription Rx-9912'),
            ('EVT-2026-003', 'lab', 'LAB-REQ-7781', 'LAB_ORDER_FULFILLED', Decimal('4800.00'), 'Comprehensive Metabolic Panel + Lipid Profile'),
            ('EVT-2026-004', 'billing', 'RCPT-CASH-1002', 'BILLING_PAYMENT_COLLECTED', Decimal('25000.00'), 'Initial cash advance deposit collected at IPD counter'),
        ]
        for eid, src_dept, sref, etype, amt, desc in events_data:
            FinancialEvent.objects.update_or_create(
                event_id=eid,
                defaults={
                    'source_department': src_dept,
                    'source_reference': sref,
                    'event_type': etype,
                    'idempotency_key': f"IDEMP-{eid}",
                    'business_date': timezone.now().date(),
                    'payload': {'description': desc, 'patient_uhid': 'UHID-2026-0199', 'amount': str(amt)},
                    'amount': amt,
                    'status': EventStatus.PENDING_VALIDATION
                }
            )
        self.stdout.write(self.style.SUCCESS(f"  + Seeded {len(events_data)} incoming financial events."))

        # 8. Phase 2: Draft Journals
        j1, _ = Journal.objects.update_or_create(
            reference_no='JV-2026-001',
            defaults={
                'entry_type': 'revenue_adjustment',
                'journal_date': timezone.now().date(),
                'posting_period': '2026-10',
                'status': 'draft',
                'description': 'Quarterly pharmacy inventory adjustment write-down',
                'total_debit': Decimal('4500.00'),
                'total_credit': Decimal('4500.00'),
                'maker': exec_user
            }
        )
        JournalLine.objects.update_or_create(
            journal=j1,
            line_no=1,
            defaults={
                'account': ChartOfAccount.objects.get(code='5100'),
                'debit': Decimal('4500.00'),
                'credit': Decimal('0.00'),
                'narration': 'Inventory write-off'
            }
        )
        JournalLine.objects.update_or_create(
            journal=j1,
            line_no=2,
            defaults={
                'account': ChartOfAccount.objects.get(code='1200'),
                'debit': Decimal('0.00'),
                'credit': Decimal('4500.00'),
                'narration': 'Adjustment of damaged stock'
            }
        )
        self.stdout.write(self.style.SUCCESS("  + Seeded sample draft journal voucher."))

        # 9. Phase 2: Vendor Mirrors, Bills & 3-Way Match
        from apps.accounting.models import VendorMirror, CustomerMirror
        vm1, _ = VendorMirror.objects.update_or_create(
            source_vendor_id='VEND-001',
            defaults={
                'name': 'MedEquip Biomedical Solutions Ltd',
                'gstin': '27AABCM8812R1Z2',
                'pan': 'AABCM8812R',
                'payment_terms_days': 30
            }
        )
        vm2, _ = VendorMirror.objects.update_or_create(
            source_vendor_id='VEND-002',
            defaults={
                'name': 'Sun Pharma Distributors',
                'gstin': '27SUNPH1122R1Z8',
                'pan': 'SUNPH1122R',
                'payment_terms_days': 30
            }
        )

        b1, _ = VendorBill.objects.update_or_create(
            reference_no='VB-2026-001',
            defaults={
                'vendor': vm1,
                'invoice_no': 'ME-INV-8891',
                'invoice_date': date(2026, 10, 2),
                'due_date': date(2026, 11, 2),
                'po_no': 'PO-2026-081',
                'taxable_amount': Decimal('125000.00'),
                'cgst': Decimal('11250.00'),
                'sgst': Decimal('11250.00'),
                'tds_amount': Decimal('2500.00'),
                'total_amount': Decimal('147500.00'),
                'net_payable': Decimal('145000.00'),
                'status': 'draft',
                'maker': exec_user
            }
        )
        ThreeWayMatch.objects.update_or_create(
            bill=b1,
            defaults={
                'po_no': 'PO-2026-081',
                'grn_no': 'GRN-2026-044',
                'result': 'matched',
                'variance_amount': Decimal('0.00'),
                'variance_pct': Decimal('0.00')
            }
        )

        b2, _ = VendorBill.objects.update_or_create(
            reference_no='VB-2026-002',
            defaults={
                'vendor': vm2,
                'invoice_no': 'SPD-99201',
                'invoice_date': date(2026, 10, 5),
                'due_date': date(2026, 11, 5),
                'po_no': '',
                'taxable_amount': Decimal('48500.00'),
                'cgst': Decimal('2910.00'),
                'sgst': Decimal('2910.00'),
                'tds_amount': Decimal('0.00'),
                'total_amount': Decimal('54320.00'),
                'net_payable': Decimal('54320.00'),
                'status': 'draft',
                'maker': exec_user
            }
        )
        ThreeWayMatch.objects.update_or_create(
            bill=b2,
            defaults={
                'po_no': '',
                'grn_no': '',
                'result': 'missing_po',
                'variance_amount': Decimal('0.00'),
                'variance_pct': Decimal('0.00')
            }
        )

        b3, _ = VendorBill.objects.update_or_create(
            reference_no='VB-2026-003',
            defaults={
                'vendor': vm1,
                'invoice_no': 'ME-INV-8891-DUP',
                'invoice_date': date(2026, 10, 6),
                'due_date': date(2026, 11, 6),
                'po_no': 'PO-2026-081',
                'taxable_amount': Decimal('125000.00'),
                'cgst': Decimal('11250.00'),
                'sgst': Decimal('11250.00'),
                'tds_amount': Decimal('2500.00'),
                'total_amount': Decimal('147500.00'),
                'net_payable': Decimal('145000.00'),
                'status': 'draft',
                'duplicate_score': 95,
                'maker': exec_user
            }
        )
        self.stdout.write(self.style.SUCCESS("  + Seeded 3 Vendor Bills (1 matched, 1 missing PO, 1 duplicate warning)."))

        # 10. Phase 2: Bank Statement & Bank Transactions
        hdfc_acc = BankAccount.objects.get(account_no_masked='••4417')
        bstmt, _ = BankStatement.objects.update_or_create(
            bank_account=hdfc_acc,
            defaults={
                'period_from': date(2026, 10, 1),
                'period_to': date(2026, 10, 8),
                'opening_balance': Decimal('4500000.00'),
                'closing_balance': Decimal('4850000.00'),
                'imported_by': exec_user,
                'line_count': 4
            }
        )

        BankTransaction.objects.update_or_create(
            bank_account=hdfc_acc,
            bank_reference='TXN-HDFC-001',
            defaults={
                'statement': bstmt,
                'txn_date': date(2026, 10, 3),
                'value_date': date(2026, 10, 3),
                'narration': 'NEFT CR-STAR HEALTH AND ALLIED INS CLAIMS SETTL',
                'amount': Decimal('240000.00'),
                'direction': 'credit',
                'type': 'neft',
                'match_status': 'unmatched'
            }
        )
        BankTransaction.objects.update_or_create(
            bank_account=hdfc_acc,
            bank_reference='TXN-HDFC-002',
            defaults={
                'statement': bstmt,
                'txn_date': date(2026, 10, 5),
                'value_date': date(2026, 10, 5),
                'narration': 'UPI/CR/261005112233/PATIENT ADVANCE COUNTER',
                'amount': Decimal('25000.00'),
                'direction': 'credit',
                'type': 'upi',
                'match_status': 'unmatched'
            }
        )
        BankTransaction.objects.update_or_create(
            bank_account=hdfc_acc,
            bank_reference='TXN-HDFC-003',
            defaults={
                'statement': bstmt,
                'txn_date': date(2026, 10, 6),
                'value_date': date(2026, 10, 6),
                'narration': 'RTGS DR-MEDEQUIP BIOMEDICAL SETTLEMENT',
                'amount': Decimal('145000.00'),
                'direction': 'debit',
                'type': 'neft',
                'match_status': 'matched'
            }
        )
        BankTransaction.objects.update_or_create(
            bank_account=hdfc_acc,
            bank_reference='TXN-HDFC-004',
            defaults={
                'statement': bstmt,
                'txn_date': date(2026, 10, 7),
                'value_date': date(2026, 10, 7),
                'narration': 'CHQ CR-INFOSYS TECHNOLOGIES CORP SETTL-9901',
                'amount': Decimal('88000.00'),
                'direction': 'credit',
                'type': 'cheque',
                'match_status': 'for_review'
            }
        )
        self.stdout.write(self.style.SUCCESS("  + Seeded Bank Statement and 4 Transactions."))

        # 11. Phase 2: Receivables Aging & Collections Pipeline
        today = timezone.now().date()
        rec_data = [
            ('REC-2026-001', 'insurance', 'Star Health & Allied Insurance', 'Priya Sharma (UHID-0199)', Decimal('240000.00'), today, today),
            ('REC-2026-002', 'insurance', 'Care Health Insurance Ltd', 'Anand Kulkarni (UHID-0210)', Decimal('115000.00'), today - timezone.timedelta(days=35), today - timezone.timedelta(days=5)),
            ('REC-2026-003', 'corporate', 'Infosys Health Services', 'Rahul Desai (UHID-0233)', Decimal('88000.00'), today - timezone.timedelta(days=70), today - timezone.timedelta(days=40)),
            ('REC-2026-004', 'patient', 'Self-Pay Cash Patient', 'Ramesh Sharma (IPD-901)', Decimal('45000.00'), today - timezone.timedelta(days=110), today - timezone.timedelta(days=80)),
        ]
        for rno, stype, pname, ptname, tot, idate, ddate in rec_data:
            cust, _ = CustomerMirror.objects.update_or_create(
                source_type=stype,
                source_id=f"PAYER-{rno[-3:]}",
                defaults={'name': pname}
            )
            days = (today - idate).days
            if days <= 30:
                b = '0_30'
            elif days <= 60:
                b = '31_60'
            elif days <= 90:
                b = '61_90'
            else:
                b = '90_plus'

            rec, _ = Receivable.objects.update_or_create(
                reference_no=rno,
                defaults={
                    'customer': cust,
                    'patient_name': ptname,
                    'invoice_date': idate,
                    'due_date': ddate,
                    'original_amount': tot,
                    'settled_amount': Decimal('0.00'),
                    'disallowed_amount': Decimal('0.00'),
                    'written_off_amount': Decimal('0.00'),
                    'outstanding_amount': tot,
                    'aging_bucket': b,
                    'status': 'open'
                }
            )

            # Collection cases
            if b in ['31_60', '61_90', '90_plus']:
                case_stage = 'followup_required' if b == '31_60' else ('due_today' if b == '61_90' else 'escalated')
                cc, _ = CollectionCase.objects.update_or_create(
                    customer=cust,
                    defaults={
                        'stage': case_stage,
                        'outstanding_amount': tot,
                        'owner_user': exec_user,
                        'next_action': f"Executive follow-up call with {pname}"
                    }
                )
                CollectionFollowup.objects.get_or_create(
                    case=cc,
                    receivable=rec,
                    defaults={
                        'channel': 'call',
                        'contact_person': 'Senior Claims Desk',
                        'outcome': 'Promised payment within 5 business days',
                        'notes': f"Follow-up logged by Executive for {pname}",
                        'logged_by': exec_user
                    }
                )
        self.stdout.write(self.style.SUCCESS("  + Seeded 4 Receivables across aging buckets with collection cases."))

        # 12. Phase 2: Expense Requests
        ExpenseRequest.objects.update_or_create(
            reference_no='EXP-2026-001',
            defaults={
                'department_id': 'opd',
                'requested_by_staff': 'Sister Mary (OPD Lead)',
                'expense_type': 'medical_consumables',
                'amount': Decimal('18500.00'),
                'business_reason': 'Urgent requirement of sterile examination gloves and PPE kits for OPD',
                'budget_available_at_submit': Decimal('150000.00'),
                'status': 'draft',
                'maker': exec_user
            }
        )
        ExpenseRequest.objects.update_or_create(
            reference_no='EXP-2026-002',
            defaults={
                'department_id': 'lab',
                'requested_by_staff': 'Dr. Alok Verma (Pathology)',
                'expense_type': 'medical_consumables',
                'amount': Decimal('42000.00'),
                'business_reason': 'Biochemistry reagent replenishment batch #B-99',
                'budget_available_at_submit': Decimal('220000.00'),
                'status': 'in_approval',
                'maker': exec_user
            }
        )
        self.stdout.write(self.style.SUCCESS("  + Seeded 2 Expense Requests."))

        # 13. Phase 2: GST Batch
        gb, _ = GSTBatch.objects.update_or_create(
            reference_no='GST-OCT-2026-W1',
            defaults={
                'direction': 'outward',
                'period_from': date(2026, 10, 1),
                'period_to': date(2026, 10, 7),
                'invoice_count': 1,
                'taxable_value': Decimal('845000.00'),
                'tax_value': Decimal('152100.00'),
                'status': 'draft',
                'prepared_by': exec_user
            }
        )
        GSTBatchLine.objects.update_or_create(
            batch=gb,
            invoice_no='INV-OCT-001',
            defaults={
                'invoice_date': date(2026, 10, 2),
                'gstin': '27AABCU9603R1ZM',
                'customer_or_vendor_id': 'CUST-001',
                'taxable_value': Decimal('845000.00'),
                'cgst': Decimal('76050.00'),
                'sgst': Decimal('76050.00'),
                'hsn_sac': '999312'
            }
        )
        self.stdout.write(self.style.SUCCESS("  + Seeded 1 GST Outward Batch with line item."))

        # 14. Phase 3: Supervisory Approval Queue Seed Items
        from apps.accounting.models import ApprovalRequest, ApprovalLevel, ApprovalStatus, Escalation, DailyCloseRun, WriteOffRequest
        sup_user = User.objects.filter(role=RoleType.ACCOUNTS_SUPERVISOR).first()

        # Approval Request 1: Payroll Journal (Above limit ₹18.4L)
        app_jv1, _ = ApprovalRequest.objects.get_or_create(
            reference_no='JV-2610-0150',
            defaults={
                'document_type': 'journal',
                'document_id': uuid.uuid4(),
                'amount': Decimal('1842600.00'),
                'maker': exec_user,
                'current_level': ApprovalLevel.SUPERVISOR,
                'current_approver_role': RoleType.ACCOUNTS_SUPERVISOR,
                'priority': 'high',
                'risk_flags': ['missing_documents'],
                'status': ApprovalStatus.PENDING,
                'version': 1
            }
        )

        # Approval Request 2: Doctor fee accrual (Above limit ₹4.18L)
        app_jv2, _ = ApprovalRequest.objects.get_or_create(
            reference_no='JV-2610-0144',
            defaults={
                'document_type': 'journal',
                'document_id': uuid.uuid4(),
                'amount': Decimal('418000.00'),
                'maker': exec_user,
                'current_level': ApprovalLevel.SUPERVISOR,
                'current_approver_role': RoleType.ACCOUNTS_SUPERVISOR,
                'priority': 'high',
                'risk_flags': [],
                'status': ApprovalStatus.PENDING,
                'version': 1
            }
        )

        # Approval Request 3: Reclass OPD Consumables (Within limit ₹28,600)
        app_jv3, _ = ApprovalRequest.objects.get_or_create(
            reference_no='JV-2610-0153',
            defaults={
                'document_type': 'journal',
                'document_id': uuid.uuid4(),
                'amount': Decimal('28600.00'),
                'maker': exec_user,
                'current_level': ApprovalLevel.SUPERVISOR,
                'current_approver_role': RoleType.ACCOUNTS_SUPERVISOR,
                'priority': 'medium',
                'risk_flags': [],
                'status': ApprovalStatus.PENDING,
                'version': 1
            }
        )

        # Approval Request 4: Vendor Bill Duplicate Warning (₹2,08,768)
        app_vb, _ = ApprovalRequest.objects.get_or_create(
            reference_no='VB-2610-0090',
            defaults={
                'document_type': 'vendor_bill',
                'document_id': uuid.uuid4(),
                'amount': Decimal('208768.00'),
                'maker': exec_user,
                'current_level': ApprovalLevel.SUPERVISOR,
                'current_approver_role': RoleType.ACCOUNTS_SUPERVISOR,
                'priority': 'high',
                'risk_flags': ['duplicate_warning'],
                'status': ApprovalStatus.PENDING,
                'version': 1
            }
        )

        # Approval Request 5: Expense Request Budget Overrun (₹42,800)
        app_exp, _ = ApprovalRequest.objects.get_or_create(
            reference_no='EXP-2610-029',
            defaults={
                'document_type': 'expense',
                'document_id': uuid.uuid4(),
                'amount': Decimal('42800.00'),
                'maker': exec_user,
                'current_level': ApprovalLevel.SUPERVISOR,
                'current_approver_role': RoleType.ACCOUNTS_SUPERVISOR,
                'priority': 'high',
                'risk_flags': ['budget_exceeded'],
                'status': ApprovalStatus.PENDING,
                'version': 1
            }
        )

        # 15. Phase 3: Supervisory Escalations
        Escalation.objects.get_or_create(
            reference_no='ESC-2610-001',
            defaults={
                'type': 'approval',
                'reason': 'high_amount',
                'entity_type': 'vendor_bill',
                'entity_id': uuid.uuid4(),
                'raised_by': sup_user or exec_user,
                'raised_to': 'manager',
                'amount': Decimal('486160.00'),
                'status': 'open',
                'notes': [{'who': 'Rahul Menon', 'when': '06 Oct, 17:20', 't': 'AMC renewal 18% higher than last year — needs Manager sign-off.'}]
            }
        )
        Escalation.objects.get_or_create(
            reference_no='ESC-2610-002',
            defaults={
                'type': 'approval',
                'reason': 'budget_violation',
                'entity_type': 'expense',
                'entity_id': uuid.uuid4(),
                'raised_by': sup_user or exec_user,
                'raised_to': 'manager',
                'amount': Decimal('148000.00'),
                'status': 'open',
                'notes': [{'who': 'Rahul Menon', 'when': '06 Oct, 16:40', 't': 'Campaign spend exceeds quarterly budget.'}]
            }
        )
        Escalation.objects.get_or_create(
            reference_no='ESC-2610-003',
            defaults={
                'type': 'reconciliation',
                'reason': 'compliance_risk',
                'entity_type': 'bank_match',
                'entity_id': uuid.uuid4(),
                'raised_by': sup_user or exec_user,
                'raised_to': 'manager',
                'amount': Decimal('218940.00'),
                'status': 'with_manager',
                'notes': [{'who': 'Rahul Menon', 'when': '07 Oct, 08:45', 't': 'Card POS settlement short vs MDR schedule.'}]
            }
        )

        # 16. Phase 3: Write-Off Requests
        cust = CustomerMirror.objects.first()
        rec1 = Receivable.objects.first()
        WriteOffRequest.objects.get_or_create(
            reference_no='WO-2610-001',
            defaults={
                'customer': cust,
                'receivable': rec1,
                'amount': Decimal('8600.00'),
                'reason': 'Hardship — patient has paid ₹30,000 in instalments; Billing recommends waiving the balance.',
                'category': 'hardship',
                'status': 'pending'
            }
        )
        WriteOffRequest.objects.get_or_create(
            reference_no='WO-2610-002',
            defaults={
                'customer': cust,
                'receivable': rec1,
                'amount': Decimal('18000.00'),
                'reason': 'TPA disallowance for non-payable consumables — upheld after appeal.',
                'category': 'disallowance',
                'status': 'pending'
            }
        )

        # 17. Phase 3: Daily Close Run
        today = timezone.now().date()
        DailyCloseRun.objects.get_or_create(
            branch_id='MAIN',
            business_date=today,
            defaults={
                'status': 'open',
                'blockers': ['4 pending approvals across queues', '2 escalations not yet forwarded to Accounts Manager']
            }
        )

        self.stdout.write(self.style.SUCCESS("  + Seeded 5 Supervisor Approval Items, 3 Escalations, 2 Write-offs, and Daily Close run."))
        self.stdout.write(self.style.SUCCESS("==> Accounts Master, Phase 2 & Phase 3 Data Seeding Complete!"))



