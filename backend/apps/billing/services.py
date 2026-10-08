import uuid
from datetime import datetime, date, timedelta
from decimal import Decimal, ROUND_HALF_UP
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction, models
from django.utils import timezone
from apps.accounts.models import User, RoleType
from apps.patients.models import Patient
from apps.ipd.models import InpatientAdmission
from .models import (
    TariffMaster, ServicePackage, CorporateAccount,
    Invoice, InvoiceItem, Payment, TenderMode,
    PatientDeposit, BillingCounter, CounterShift, ShiftStatus,
    RefundRequest, RefundStatus, InvoiceStatus, InvoiceCategory,
    BillableChargeItem, ChargeItemStatus, BillingReceipt, ReceiptType, CreditNote,
    DepartmentChargeEvent, DepartmentChargeEventStatus,
    DepartmentGatingRule, GatingAction,
    SupervisorApprovalRequest, ApprovalRequestType, ApprovalStatus,
    CashDenominationTally, CashPickupVoucher, VaultHandover,
    TallyType, VarianceStatus, PickupReason, PickupStatus,
    EscalationReason, BillingAuditEvent, AuditSeverity, AuditEventType,
    PackageStatus, TariffChangeRequest, TariffChangeStatus, TariffRevisionLog, TariffRevisionSource,
    PackageInclusionItem, InclusionType, EmergencyMarkupSchedule,
    ApprovalMatrixTier, TierLevel, MatrixActionType,
    BillingPolicyRule, PolicyCategory,
    CounterHardwareRegistry, HardwareStatus,
    BillingStaffRoster, StaffShiftType, RosterStatus,
    TPAClaimRecord, PreAuthStatus, ClaimLifecycleStatus, CorporateCreditVoucher,
    IPDRunningLedger, IPDRunningLedgerItemType, InterimDepositDemand, InterimDemandStatus,
    FinancialDischargeClearance, DischargeClearanceStatus, DepositStatus,
    RevenueLeakageAlert, RevenueLeakageType, RevenueLeakageStatus,
    FraudRiskSignal, FraudRiskSignalSeverity,
    RevenueInvestigationCase, RevenueInvestigationStatus,
    FinancialPeriodLock, PeriodType, PeriodStatus, DailyRevenueSnapshot,
    GeneralLedgerJournalEntry, GeneralLedgerLineItem, GLJournalSource
)


def next_document_number(prefix: str) -> str:
    """Next PREFIX-YYYYMM-NNNNN, continuing from the highest number issued this month (not from row count)."""
    stem = f"{prefix}-{timezone.now().strftime('%Y%m')}-"
    last = (Invoice.objects.filter(invoice_number__startswith=stem)
            .order_by('-invoice_number').values_list('invoice_number', flat=True).first())
    seq = int(last.rsplit('-', 1)[-1]) + 1 if last else 1
    return f"{stem}{str(seq).zfill(5)}"

class TariffPricingService:
    @staticmethod
    def get_effective_tariff(service_code: str, encounter_type: str = 'OPD', patient_category: str = 'GENERAL',
                             is_emergency: bool = False, at=None):
        """Live rate for a service. Emergency encounters add a markup: a matching time-based schedule (night,
        weekend) wins over the tariff's flat emergency markup."""
        TariffGovernanceService.sync_due_versions()
        tariff = TariffMaster.objects.filter(code=service_code, is_active=True).first()
        if not tariff:
            return None

        base_price = Decimal(str(tariff.base_price))
        markup_pct = Decimal('0.00')
        markup_source = None
        if is_emergency or encounter_type == 'EMERGENCY':
            schedule = MarkupScheduleService.matching(tariff.department, at)
            if schedule is not None:
                markup_pct, markup_source = schedule.markup_percentage, f'{schedule.label} (+{schedule.markup_percentage}%)'
            elif tariff.emergency_markup_percent > 0:
                markup_pct, markup_source = tariff.emergency_markup_percent, f'Emergency markup (+{tariff.emergency_markup_percent}%)'
        markup_amount = (base_price * markup_pct / Decimal('100.00')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

        subtotal_before_tax = base_price + markup_amount
        gst_rate = Decimal(str(tariff.gst_rate))
        tax_amount = (subtotal_before_tax * gst_rate / Decimal('100.00')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

        return {
            'code': tariff.code,
            'name': tariff.name,
            'department': tariff.department,
            'base_price': base_price,
            'markup_percent': markup_pct,
            'markup_amount': markup_amount,
            'markup_source': markup_source,
            'subtotal': subtotal_before_tax,
            'gst_rate': gst_rate,
            'tax_amount': tax_amount,
            'net_price': subtotal_before_tax + tax_amount
        }

    @staticmethod
    def calculate_quote(
        items: list,
        encounter_type: str = 'OPD',
        patient_category: str = 'GENERAL',
        is_emergency: bool = False,
        corporate_account_id: str = None,
        package_code: str = None,
        at=None
    ) -> dict:
        """Itemised estimate. With a package: the package price is one line, included services within their
        allowance are absorbed at ₹0, exclusions and anything beyond the allowance bill at tariff."""
        calculated_items = []
        gross_total = Decimal('0.00')
        total_tax = Decimal('0.00')
        total_discount = Decimal('0.00')

        corporate = None
        if corporate_account_id:
            corporate = CorporateAccount.objects.filter(id=corporate_account_id, is_active=True).first()

        package = PackageGovernanceService.resolve(package_code) if package_code else None
        if package_code and (package is None or package.status != PackageStatus.ACTIVE):
            raise ValueError(f'Package {package_code} is not active.')
        consumed = {}
        if package:
            calculated_items.append({
                'service_code': package.code, 'description': f'Package · {package.name}', 'department': package.department,
                'qty': 1, 'unit_price': package.package_price, 'standard_price': package.package_price,
                'markup_amount': Decimal('0.00'), 'discount_amount': Decimal('0.00'), 'tax_rate': Decimal('0.00'),
                'tax_amount': Decimal('0.00'), 'total': package.package_price, 'is_package': True,
                'covered_by_package': False, 'coverage_note': '', 'price_overridden': False,
            })
            gross_total += package.package_price

        for raw_item in items:
            code = (raw_item.get('service_code') or raw_item.get('code') or '').strip()
            qty = max(1, int(Decimal(str(raw_item.get('qty', 1) or 1))))
            custom_unit_price = raw_item.get('unit_price') if raw_item.get('unit_price') is not None else raw_item.get('unitPrice')

            tariff_info = TariffPricingService.get_effective_tariff(
                service_code=code, encounter_type=encounter_type, patient_category=patient_category,
                is_emergency=is_emergency, at=at
            ) if code else None

            if tariff_info:
                name = raw_item.get('description') or raw_item.get('name') or tariff_info['name']
                dept = raw_item.get('department') or tariff_info['department']
                unit_price = Decimal(str(custom_unit_price)) if custom_unit_price is not None else tariff_info['base_price']
                markup = tariff_info['markup_amount']
                tax_rate = tariff_info['gst_rate']
                markup_source = tariff_info['markup_source']
            else:
                name = raw_item.get('description') or raw_item.get('name', 'Custom Hospital Service')
                dept = raw_item.get('department', 'GENERAL')
                unit_price = Decimal(str(custom_unit_price or 0.0))
                markup = Decimal('0.00')
                tax_rate = Decimal(str(raw_item.get('tax_rate', 0.0)))
                markup_source = None

            # Split the line into package-absorbed units and units billed at tariff
            covered_qty, note = 0, ''
            if package and code:
                for _ in range(qty):
                    cov = PackageGovernanceService.is_service_covered_by_package(package, code, consumed.get(code.upper(), 0))
                    if not cov['covered']:
                        note = cov['reason'] if covered_qty == 0 else f'{covered_qty} included · rest billed at tariff'
                        break
                    consumed[code.upper()] = consumed.get(code.upper(), 0) + 1
                    covered_qty += 1
                else:
                    note = cov['reason']

            segments = []
            if covered_qty:
                segments.append((covered_qty, True))
            if qty - covered_qty:
                segments.append((qty - covered_qty, False))
            for seg_qty, covered in segments:
                standard = (unit_price + markup) * seg_qty
                line_base = Decimal('0.00') if covered else standard
                line_discount = Decimal('0.00') if covered else Decimal(str(raw_item.get('discount_amount', 0.0)))
                line_subtotal = max(Decimal('0.00'), line_base - line_discount)
                line_tax = (line_subtotal * tax_rate / Decimal('100.00')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                calculated_items.append({
                    'service_code': code or '',
                    'description': name,
                    'department': dept,
                    'qty': seg_qty,
                    'unit_price': Decimal('0.00') if covered else unit_price,
                    'standard_price': unit_price,
                    'markup_amount': Decimal('0.00') if covered else markup,
                    'markup_source': None if covered else markup_source,
                    'discount_amount': line_discount,
                    'tax_rate': tax_rate,
                    'tax_amount': line_tax,
                    'total': line_subtotal + line_tax,
                    'is_package': False,
                    'covered_by_package': covered,
                    'coverage_note': note,
                    'price_overridden': custom_unit_price is not None and tariff_info is not None,
                })
                gross_total += line_base
                total_discount += line_discount
                total_tax += line_tax

        subtotal = max(Decimal('0.00'), gross_total - total_discount)
        net_payable = subtotal + total_tax

        # Corporate / TPA Co-pay calculation
        patient_responsibility = net_payable
        sponsor_responsibility = Decimal('0.00')

        if corporate:
            co_pay_pct = Decimal(str(corporate.co_pay_percentage))
            if co_pay_pct >= Decimal('0.00'):
                patient_responsibility = (net_payable * co_pay_pct / Decimal('100.00')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                sponsor_responsibility = net_payable - patient_responsibility

                # Check credit limit availability
                available_credit = corporate.credit_limit - corporate.utilized_credit
                if sponsor_responsibility > available_credit:
                    excess = sponsor_responsibility - available_credit
                    sponsor_responsibility = available_credit
                    patient_responsibility += excess

        absorbed = sum(((l['standard_price'] + (l['markup_amount'] if not l['covered_by_package'] else Decimal('0.00'))) * l['qty']
                        for l in calculated_items if l['covered_by_package']), Decimal('0.00'))
        return {
            'items': calculated_items,
            'gross_total': gross_total.quantize(Decimal('0.01')),
            'total_discount': total_discount.quantize(Decimal('0.01')),
            'subtotal': subtotal.quantize(Decimal('0.01')),
            'total_tax': total_tax.quantize(Decimal('0.01')),
            'net_payable': net_payable.quantize(Decimal('0.01')),
            'patient_responsibility': patient_responsibility.quantize(Decimal('0.01')),
            'sponsor_responsibility': sponsor_responsibility.quantize(Decimal('0.01')),
            'corporate_name': corporate.name if corporate else None,
            'is_emergency': is_emergency,
            'package': {'code': package.code, 'name': package.name, 'price': package.package_price,
                        'absorbed_value': absorbed.quantize(Decimal('0.01'))} if package else None,
            'priced_at': timezone.localtime(at).isoformat() if at else timezone.localtime().isoformat(),
        }

    @staticmethod
    def is_service_covered_by_package(package_id_or_code: str, service_code: str, current_quantity: int = 0) -> dict:
        package = PackageGovernanceService.resolve(package_id_or_code)
        if package is None:
            raise ValueError(f'Package {package_id_or_code} not found.')
        return PackageGovernanceService.is_service_covered_by_package(package, service_code, current_quantity)

    @staticmethod
    def check_package_coverage(package_id_or_code: str, service_name_or_code: str) -> bool:
        package = PackageGovernanceService.resolve(package_id_or_code)
        if not package:
            return False
        if package.items.exists():
            return PackageGovernanceService.is_service_covered_by_package(package, service_name_or_code)['covered']
        # Legacy packages defined only as free text
        return bool(package.inclusions_description) and service_name_or_code.lower() in package.inclusions_description.lower()


class BillingCoreService:
    @staticmethod
    def consolidate_charges_to_invoice(
        patient,
        charge_ids: list,
        cashier=None,
        counter=None,
        shift=None,
        discount: Decimal = Decimal('0.00'),
        discount_reason: str = '',
        advance_deducted: Decimal = Decimal('0.00'),
        category: str = None,
        encounter_type: str = 'OPD'
    ) -> Invoice:
        with transaction.atomic():
            charges = list(BillableChargeItem.objects.select_for_update().filter(
                id__in=charge_ids,
                patient=patient,
                status=ChargeItemStatus.PENDING
            ))
            if len(charges) != len(charge_ids):
                raise ValueError("One or more selected charge items are invalid, already invoiced, or do not belong to this patient.")

            today_str = timezone.now().strftime('%Y-%m-%d')
            # Highest-issued + 1 (not row count): discarded drafts are deleted, so count() can repeat a number
            inv_number = next_document_number('INV')
            token_slip = f"TKN-{inv_number[-4:]}"

            subtotal = Decimal('0.00')
            total_tax = Decimal('0.00')
            total_charge_discount = Decimal('0.00')
            prepared_items = []

            for charge in charges:
                line_base = charge.unit_price * charge.quantity
                line_discount = charge.discount_amount
                line_tax = charge.tax_amount
                line_total = charge.total_amount

                subtotal += line_base
                total_charge_discount += line_discount
                total_tax += line_tax

                prepared_items.append({
                    'source': f"{charge.department} Charge",
                    'department': charge.department,
                    'service_code': charge.service_code,
                    'description': charge.service_name,
                    'qty': charge.quantity,
                    'unit_price': charge.unit_price,
                    'discount_percent': Decimal('0.00'),
                    'discount_amount': line_discount,
                    'tax_rate': charge.tax_rate,
                    'tax_amount': line_tax,
                    'total': line_total,
                    'source_reference_id': charge.source_reference_id
                })

            final_discount = max(discount, total_charge_discount)
            net_total = max(Decimal('0.00'), subtotal - final_discount + total_tax - advance_deducted)
            inv_category = category or (charges[0].department if charges else 'OPD')

            invoice = Invoice.objects.create(
                invoice_number=inv_number,
                patient=patient,
                category=inv_category,
                encounter_type=encounter_type,
                date=today_str,
                subtotal=subtotal,
                discount=final_discount,
                tax=total_tax,
                advance_deducted=advance_deducted,
                total=net_total,
                paid=Decimal('0.00'),
                balance=net_total,
                status='PAID' if net_total == Decimal('0.00') else 'UNPAID',
                token_slip_number=token_slip,
                counter=counter,
                cashier=cashier,
                shift=shift,
                discount_reason=discount_reason
            )

            for p_item in prepared_items:
                InvoiceItem.objects.create(invoice=invoice, **p_item)

            charge_obj_ids = [c.id for c in charges]
            BillableChargeItem.objects.filter(id__in=charge_obj_ids).update(
                status=ChargeItemStatus.INVOICED,
                invoice=invoice
            )

            return invoice

    @staticmethod
    def create_invoice_from_charges(
        patient,
        items: list,
        category: str = 'OPD',
        encounter_type: str = 'OPD',
        cashier=None,
        counter=None,
        shift=None,
        discount: Decimal = Decimal('0.00'),
        discount_reason: str = '',
        advance_deducted: Decimal = Decimal('0.00')
    ) -> Invoice:
        today_str = timezone.now().strftime('%Y-%m-%d')
        year_month = timezone.now().strftime('%Y%m')
        count = Invoice.objects.count() + 1
        inv_number = f"INV-{year_month}-{str(count).zfill(5)}"
        token_slip = f"TKN-{str(count).zfill(4)}"

        subtotal = Decimal('0.00')
        total_tax = Decimal('0.00')

        prepared_items = []
        for raw in items:
            code = raw.get('service_code', '')
            desc = raw.get('description') or raw.get('name', 'Hospital Service')
            dept = raw.get('department', 'GENERAL')
            qty = int(raw.get('qty', 1))
            unit_price = Decimal(str(raw.get('unit_price') or raw.get('unitPrice', 0.0)))
            disc_pct = Decimal(str(raw.get('discount_percent', 0.0)))
            disc_amt = Decimal(str(raw.get('discount_amount', 0.0)))
            tax_rate = Decimal(str(raw.get('tax_rate', 0.0)))

            line_base = unit_price * qty
            if disc_amt == Decimal('0.00') and disc_pct > Decimal('0.00'):
                disc_amt = (line_base * disc_pct / Decimal('100.00')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            line_sub = max(Decimal('0.00'), line_base - disc_amt)
            line_tax = (line_sub * tax_rate / Decimal('100.00')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            line_total = line_sub + line_tax

            subtotal += line_base
            total_tax += line_tax
            prepared_items.append({
                'source': raw.get('source', 'Counter Order'),
                'department': dept,
                'service_code': code,
                'description': desc,
                'qty': qty,
                'unit_price': unit_price,
                'discount_percent': disc_pct,
                'discount_amount': disc_amt,
                'tax_rate': tax_rate,
                'tax_amount': line_tax,
                'total': line_total,
                'source_reference_id': raw.get('source_reference_id')
            })

        net_total = max(Decimal('0.00'), subtotal - discount + total_tax - advance_deducted)

        invoice = Invoice.objects.create(
            invoice_number=inv_number,
            patient=patient,
            category=category,
            encounter_type=encounter_type,
            date=today_str,
            subtotal=subtotal,
            discount=discount,
            tax=total_tax,
            advance_deducted=advance_deducted,
            total=net_total,
            paid=Decimal('0.00'),
            balance=net_total,
            status='PAID' if net_total == Decimal('0.00') else 'UNPAID',
            token_slip_number=token_slip,
            counter=counter,
            cashier=cashier,
            shift=shift,
            discount_reason=discount_reason
        )

        for p_item in prepared_items:
            InvoiceItem.objects.create(
                invoice=invoice,
                **p_item
            )

        return invoice

    @staticmethod
    def process_multi_tender_payment(
        invoice_id: str,
        cashier,
        split_payments: list,
        counter=None,
        shift=None,
        notes: str = ''
    ) -> dict:
        with transaction.atomic():
            invoice = Invoice.objects.select_for_update().get(id=invoice_id)
            if invoice.status == InvoiceStatus.DRAFT:
                raise ValueError("Draft invoices must be finalised through the cashier draft collection flow.")
            if invoice.balance <= Decimal('0.00') and invoice.status == 'PAID':
                raise ValueError("Invoice is already fully settled.")

            created_payments = []
            total_paid_now = Decimal('0.00')
            today_code = timezone.now().strftime('%Y%m%d')

            for split in split_payments:
                amount = Decimal(str(split.get('amount', 0.0)))
                if amount <= Decimal('0.00'):
                    continue

                tender = split.get('tender_mode') or split.get('payment_method', 'CASH')

                if tender == 'DEPOSIT_DEDUCTION':
                    deposit = PatientDeposit.objects.select_for_update().filter(
                        patient=invoice.patient,
                        status__in=['ACTIVE', 'PARTIALLY_UTILIZED'],
                        available_balance__gte=amount
                    ).first()
                    if not deposit:
                        raise ValueError(f"Insufficient patient deposit balance for deduction of Rs {amount}.")
                    deposit.utilized_amount += amount
                    deposit.available_balance -= amount
                    if deposit.available_balance <= Decimal('0.00'):
                        deposit.status = 'EXHAUSTED'
                    else:
                        deposit.status = 'PARTIALLY_UTILIZED'
                    deposit.save()

                p_count = Payment.objects.count() + 1
                p_num = f"PAY-{today_code}-{str(p_count).zfill(5)}"

                payment = Payment.objects.create(
                    invoice=invoice,
                    patient=invoice.patient,
                    payment_number=p_num,
                    amount=amount,
                    payment_method=tender,
                    tender_mode=tender,
                    transaction_reference=split.get('transaction_reference') or split.get('reference'),
                    card_network=split.get('card_network'),
                    card_last_four=split.get('card_last_four'),
                    auth_code=split.get('auth_code'),
                    upi_vpa=split.get('upi_vpa'),
                    cheque_number=split.get('cheque_number'),
                    cheque_bank=split.get('cheque_bank'),
                    payment_status='SUCCESS',
                    counter=counter or invoice.counter,
                    cashier=cashier,
                    shift=shift or invoice.shift
                )
                created_payments.append(payment)
                total_paid_now += amount

            invoice.paid += total_paid_now
            invoice.balance = max(Decimal('0.00'), invoice.total - invoice.paid)
            if invoice.balance <= Decimal('0.00'):
                invoice.status = 'PAID'
                invoice.balance = Decimal('0.00')
            else:
                invoice.status = 'PARTIALLY_PAID'

            tenders_used = list(set([p.tender_mode for p in created_payments]))
            invoice.settlement_mode = " + ".join(tenders_used) if len(tenders_used) > 1 else (tenders_used[0] if tenders_used else 'CASH')
            invoice.save()

            receipt_obj = BillingCoreService.generate_billing_receipt(
                invoice=invoice,
                payment=created_payments[0] if created_payments else None,
                issued_by=cashier
            )
            receipt_token = receipt_obj.receipt_number

            # Phase 3: Post Real-Time General Ledger Journal Voucher
            gl_entry = GeneralLedgerIntegrationService.post_realtime_invoice_journal(
                invoice=invoice,
                payments=created_payments,
                cashier=cashier,
                receipt=receipt_obj
            )

            return {
                'invoice': invoice,
                'payments': created_payments,
                'total_paid_now': total_paid_now,
                'remaining_balance': invoice.balance,
                'receipt_token': receipt_token,
                'receipt': receipt_obj,
                'gl_entry': gl_entry,
                'status': invoice.status
            }

    @staticmethod
    def get_receipt_details(invoice_id_or_number: str) -> dict:
        invoice = Invoice.objects.select_related('patient', 'counter', 'cashier', 'shift', 'shift__cashier', 'assisted_by').prefetch_related('items', 'payments').filter(
            models.Q(id=invoice_id_or_number) if '-' in invoice_id_or_number and len(invoice_id_or_number) == 36 else models.Q(invoice_number=invoice_id_or_number)
        ).first()

        if not invoice:
            return None

        patient = invoice.patient
        patient_data = {
            'uhid': patient.uhid if patient else 'WALK-IN',
            'name': f"{patient.first_name} {patient.last_name}".strip() if patient else 'General Patient',
            'age': getattr(patient, 'age', 35),
            'gender': getattr(patient, 'gender', 'OTHER'),
            'phone': getattr(patient, 'phone_number', '--'),
            'address': getattr(patient, 'address', 'Navi Mumbai, Maharashtra')
        }

        items_list = []
        for it in invoice.items.all():
            items_list.append({
                'code': it.service_code or 'SRV-01',
                'description': it.description,
                'department': it.department,
                'qty': it.qty,
                'unit_price': float(it.unit_price),
                'discount': float(it.discount_amount),
                'tax_rate': float(it.tax_rate),
                'tax_amount': float(it.tax_amount),
                'total': float(it.total)
            })

        payments_list = []
        for p in invoice.payments.all():
            payments_list.append({
                'payment_number': p.payment_number,
                'tender_mode': p.tender_mode,
                'amount': float(p.amount),
                'reference': p.transaction_reference or p.auth_code or p.cheque_number or '--',
                'card_details': f"{p.card_network or 'Card'} ****{p.card_last_four}" if p.card_last_four else None,
                'upi_vpa': p.upi_vpa,
                'date': p.payment_date.strftime('%d-%b-%Y %H:%M') if p.payment_date else ''
            })

        return {
            'hospital': {
                'name': 'NORTH HOSPITAL & MEDICAL RESEARCH CENTRE',
                'address': 'Plot 42, Sector 12, Health City, Navi Mumbai, MH 400705',
                'gstin': '27AABCN1234F1Z8',
                'cin': 'U85110MH2021PTC362145',
                'phone': '+91 (022) 6900-1000',
                'email': 'billing@northhospital.com',
                'emergency': '+91 (022) 6900-1008',
                'website': 'https://northhospital.com'
            },
            'invoice': {
                'id': str(invoice.id),
                'invoice_number': invoice.invoice_number,
                'date': invoice.date,
                'created_at': invoice.created_at.strftime('%d-%b-%Y %H:%M'),
                'status': invoice.status,
                'category': invoice.category,
                'encounter_type': invoice.encounter_type,
                'settlement_mode': invoice.settlement_mode or 'CASH',
                'token_slip_number': invoice.token_slip_number or f"TKN-{invoice.invoice_number[-4:]}",
                'subtotal': float(invoice.subtotal),
                'discount': float(invoice.discount),
                'tax': float(invoice.tax),
                'advance_deducted': float(invoice.advance_deducted),
                'total': float(invoice.total),
                'paid': float(invoice.paid),
                'balance': float(invoice.balance)
            },
            'patient': patient_data,
            'cashier': {
                'name': invoice.cashier.get_full_name() or invoice.cashier.username if invoice.cashier else 'Counter Cashier',
                'counter_code': invoice.counter.code if invoice.counter else 'COUNTER-01',
                'counter_name': invoice.counter.name if invoice.counter else 'Main OPD Cash Counter'
            },
            # Phase 5 counter mode: printed in the receipt footer
            'assisted_by': (invoice.assisted_by.get_full_name() or invoice.assisted_by.username) if invoice.assisted_by else None,
            'assisted_on_shift_of': (
                (invoice.shift.cashier.get_full_name() or invoice.shift.cashier.username)
                if invoice.assisted_by and invoice.shift else None
            ),
            'items': items_list,
            'payments': payments_list,
            'verification_qr': f"NORTH_HOSPITAL|{invoice.invoice_number}|{patient_data['uhid']}|{invoice.total}|{invoice.status}"
        }

    @staticmethod
    def generate_billing_receipt(
        invoice: Invoice,
        payment: Payment = None,
        receipt_type: str = ReceiptType.A4_TAX_INVOICE,
        issued_by=None
    ) -> BillingReceipt:
        year_month = timezone.now().strftime('%Y%m')
        count = BillingReceipt.objects.count() + 1
        receipt_number = f"RCP-{year_month}-{str(count).zfill(5)}"
        uhid = invoice.patient.uhid if invoice.patient else 'WALK-IN'
        qr_verification_token = f"NORTH_HOSPITAL|{receipt_number}|{uhid}|{invoice.total}|{int(timezone.now().timestamp())}"
        receipt_payload = BillingCoreService.get_receipt_details(str(invoice.id)) or {}

        receipt = BillingReceipt.objects.create(
            receipt_number=receipt_number,
            invoice=invoice,
            patient=invoice.patient,
            payment=payment,
            receipt_type=receipt_type,
            token_slip_number=invoice.token_slip_number,
            issued_by=issued_by or invoice.cashier,
            qr_verification_token=qr_verification_token,
            receipt_payload=receipt_payload
        )
        return receipt

    @staticmethod
    def create_patient_deposit(
        patient,
        amount: Decimal,
        tender_mode: str = TenderMode.CASH,
        cashier=None,
        counter=None,
        ipd_admission=None,
        notes: str = '',
        transaction_reference: str = None,
        shift=None
    ) -> PatientDeposit:
        amount = Decimal(str(amount))
        if amount <= Decimal('0.00'):
            raise ValueError("Deposit amount must be strictly greater than zero.")

        year_month = timezone.now().strftime('%Y%m')
        count = PatientDeposit.objects.count() + 1
        dep_number = f"DEP-{year_month}-{str(count).zfill(5)}"

        deposit = PatientDeposit.objects.create(
            deposit_number=dep_number,
            patient=patient,
            ipd_admission=ipd_admission,
            deposit_amount=amount,
            utilized_amount=Decimal('0.00'),
            available_balance=amount,
            tender_mode=tender_mode,
            transaction_reference=transaction_reference,
            status='ACTIVE',
            counter=counter or (shift.counter if shift else None),
            cashier=cashier,
            notes=notes,
            shift=shift
        )
        return deposit

    @staticmethod
    def get_patient_ledger(uhid_or_patient_id: str) -> dict:
        try:
            import uuid
            uuid.UUID(str(uhid_or_patient_id))
            patient = Patient.objects.filter(models.Q(id=uhid_or_patient_id) | models.Q(uhid=uhid_or_patient_id)).first()
        except (ValueError, AttributeError):
            patient = Patient.objects.filter(uhid=uhid_or_patient_id).first()

        if not patient:
            raise ValueError(f"Patient with identifier '{uhid_or_patient_id}' not found.")

        invoices = Invoice.objects.filter(patient=patient).select_related('counter', 'cashier').prefetch_related('items', 'payments').order_by('-created_at')
        payments = Payment.objects.filter(patient=patient).select_related('counter', 'cashier').order_by('-payment_date')
        deposits = PatientDeposit.objects.filter(patient=patient).select_related('counter', 'cashier').order_by('-created_at')

        total_invoiced = sum([inv.total for inv in invoices], Decimal('0.00'))
        total_paid = sum([p.amount for p in payments if p.payment_status == 'SUCCESS'], Decimal('0.00'))
        total_advance_deposited = sum([d.deposit_amount for d in deposits], Decimal('0.00'))
        available_deposit_balance = sum([d.available_balance for d in deposits if d.status in ['ACTIVE', 'PARTIALLY_UTILIZED']], Decimal('0.00'))
        net_outstanding = max(Decimal('0.00'), total_invoiced - total_paid)

        return {
            'patient': {
                'id': str(patient.id),
                'uhid': patient.uhid,
                'name': f"{patient.first_name} {patient.last_name}".strip(),
                'phone': getattr(patient, 'phone_number', '') or '',
                'gender': getattr(patient, 'gender', 'OTHER'),
                'dob': str(getattr(patient, 'date_of_birth', ''))
            },
            'invoices': invoices,
            'payments': payments,
            'deposits': deposits,
            'total_invoiced': total_invoiced,
            'total_paid': total_paid,
            'total_advance_deposited': total_advance_deposited,
            'available_deposit_balance': available_deposit_balance,
            'net_outstanding_balance': net_outstanding
        }


class CounterClosingService:
    """Pre-Phase 4 entry points, kept for existing callers; all logic lives in CounterShiftControlService."""
    @staticmethod
    def open_shift(cashier, counter_code: str = 'COUNTER-01', opening_float: Decimal = Decimal('5000.00'), denominations: dict = None, client_ip: str = None) -> CounterShift:
        return CounterShiftControlService.open_shift(cashier, counter_code, opening_float, denominations, client_ip=client_ip)

    @staticmethod
    def get_active_shift_summary(cashier=None, counter_code: str = None) -> dict:
        """The caller's own open shift only (never another cashier's drawer)."""
        shift = CounterShiftControlService.get_open_shift(cashier)
        if shift and counter_code and shift.counter.code != counter_code:
            shift = None
        return CounterShiftControlService.shift_summary(shift)

    @staticmethod
    def close_shift(shift_id: str, physical_cash_count: Decimal, notes: str = '', denominations: dict = None,
                    supervisor=None, cashier=None, card_total=None, upi_total=None) -> CounterShift:
        shift = CounterShift.objects.get(id=shift_id)
        return CounterShiftControlService.submit_closing(
            cashier or shift.cashier, shift_id=shift_id, denominations=denominations or None,
            physical_cash=physical_cash_count, card_total=card_total, upi_total=upi_total, note=notes
        )

    @staticmethod
    def get_unbilled_queue(department: str = None, search: str = None) -> list:
        invoices = Invoice.objects.filter(status='UNPAID').select_related('patient').prefetch_related('items')
        if department and department != 'ALL':
            invoices = invoices.filter(category=department)
        if search:
            invoices = invoices.filter(
                models.Q(invoice_number__icontains=search) |
                models.Q(patient__first_name__icontains=search) |
                models.Q(patient__last_name__icontains=search) |
                models.Q(patient__uhid__icontains=search)
            )

        queue = []
        for inv in invoices[:30]:
            items_summary = [it.description for it in inv.items.all()[:3]]
            queue.append({
                'id': str(inv.id),
                'invoice_id': str(inv.id),
                'invoice_number': inv.invoice_number,
                'uhid': inv.patient.uhid if inv.patient else 'WALK-IN',
                'patient_name': f"{inv.patient.first_name} {inv.patient.last_name}".strip() if inv.patient else 'Patient',
                'encounter_type': inv.encounter_type or inv.category,
                'department': inv.category,
                'items_count': inv.items.count(),
                'items_summary': ", ".join(items_summary) if items_summary else 'Consultation / Service',
                'gross_amount': float(inv.total),
                'balance_amount': float(inv.balance),
                'created_at': inv.created_at.strftime('%H:%M'),
                'date': inv.date,
                'status': 'PENDING_BILLING'
            })
        return queue


class NoActiveShift(Exception):
    """Raised when money would move without the acting user's own OPEN counter shift."""
    def __init__(self, message: str = 'No Active Shift: open your counter shift before billing or collecting.'):
        super().__init__(message)


def next_sequence_number(model, field: str, prefix: str, width: int = 5) -> str:
    """Next PREFIX-YYYYMM-NNNNN for `model.field`, continuing from the highest issued number this month."""
    stem = f"{prefix}-{timezone.now().strftime('%Y%m')}-"
    last = (model.objects.filter(**{f'{field}__startswith': stem})
            .order_by(f'-{field}').values_list(field, flat=True).first())
    seq = int(last.rsplit('-', 1)[-1]) + 1 if last else 1
    return f"{stem}{str(seq).zfill(width)}"


class CounterShiftControlService:
    """Phase 4 — counter shift lifecycle, drawer reconciliation, cash pickups, sign-off and vault custody."""
    DRAWER_LIMIT = Decimal('50000.00')
    PICKUP_THRESHOLD_PERCENT = Decimal('80')
    DENOMINATIONS = (2000, 500, 200, 100, 50, 20, 10)
    MIN_NOTE_LENGTH = 5

    @staticmethod
    def _money(value) -> Decimal:
        return Decimal(str(value or '0')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    @staticmethod
    def _name(user) -> str:
        if not user:
            return ''
        return user.get_full_name() or user.username

    # ---------- denominations ----------
    @classmethod
    def parse_denominations(cls, raw: dict) -> dict:
        """Normalise {'500': 10, '200': '5', 'coins': '12.50'} -> {500: 10, 200: 5, ..., 'coins': Decimal}."""
        raw = raw or {}
        counts = {}
        for note in cls.DENOMINATIONS:
            value = raw.get(str(note), raw.get(note, raw.get(f'count_{note}', 0))) or 0
            try:
                count = int(value)
            except (TypeError, ValueError):
                raise ValueError(f'Count for ₹{note} must be a whole number.')
            if count < 0:
                raise ValueError(f'Count for ₹{note} cannot be negative.')
            counts[note] = count
        coins = cls._money(raw.get('coins', raw.get('coins_amount', 0)))
        if coins < 0:
            raise ValueError('Coins amount cannot be negative.')
        counts['coins'] = coins
        return counts

    @classmethod
    def denomination_total(cls, counts: dict) -> Decimal:
        total = sum((Decimal(note) * counts.get(note, 0) for note in cls.DENOMINATIONS), Decimal('0.00'))
        return cls._money(total + counts.get('coins', Decimal('0.00')))

    @classmethod
    def _save_tally(cls, shift, tally_type, counts: dict, user) -> CashDenominationTally:
        tally, _ = CashDenominationTally.objects.update_or_create(
            shift=shift, tally_type=tally_type,
            defaults={
                **{f'count_{note}': counts.get(note, 0) for note in cls.DENOMINATIONS},
                'coins_amount': counts.get('coins', Decimal('0.00')),
                'total_amount': cls.denomination_total(counts),
                'recorded_by': user if getattr(user, 'is_authenticated', False) else None,
            }
        )
        return tally

    @classmethod
    def _tally_dict(cls, tally):
        if not tally:
            return None
        return {
            'counts': {str(note): getattr(tally, f'count_{note}') for note in cls.DENOMINATIONS},
            'coins': float(tally.coins_amount),
            'total': float(tally.total_amount),
            'text': ' · '.join(
                [f"₹{note}×{getattr(tally, f'count_{note}')}" for note in cls.DENOMINATIONS if getattr(tally, f'count_{note}')]
                + ([f"coins ₹{tally.coins_amount}"] if tally.coins_amount else [])
            ) or '—'
        }

    # ---------- shift lookup & guard ----------
    @staticmethod
    def get_open_shift(user):
        if not user or not getattr(user, 'is_authenticated', False):
            return None
        return CounterShift.objects.select_related('counter', 'cashier').filter(cashier=user, status=ShiftStatus.OPEN).first()

    @classmethod
    def validate_active_shift(cls, user, counter_code: str = None) -> CounterShift:
        """A cashier cannot bill, collect or take a deposit without their own OPEN shift."""
        shift = cls.get_open_shift(user)
        if not shift:
            raise NoActiveShift()
        if counter_code and shift.counter.code != counter_code:
            raise NoActiveShift(f'Your open shift is on {shift.counter.code}, not {counter_code}.')
        return shift

    # ---------- open ----------
    @classmethod
    def open_shift(cls, cashier, counter_code: str, opening_float=None, denominations: dict = None, client_ip: str = None) -> CounterShift:
        if not cashier or not getattr(cashier, 'is_authenticated', False):
            raise PermissionError('Login required to open a counter shift.')
        if not counter_code:
            raise ValueError('Select the counter you are opening.')
        counter, _ = BillingCounter.objects.get_or_create(
            code=counter_code, defaults={'name': f'{counter_code} Desk', 'station_location': 'OPD_LOBBY'}
        )
        if not counter.is_active:
            raise ValueError(f'{counter.code} is deactivated.')
        BillingAdminGovernanceService.validate_hardware_terminal_lock(counter, client_ip)
        with transaction.atomic():
            existing = CounterShift.objects.select_for_update().filter(cashier=cashier, status=ShiftStatus.OPEN).first()
            if existing:
                if existing.counter_id == counter.id:
                    return existing
                raise ValueError(f'You already have an open shift on {existing.counter.code}. Close it first.')
            occupied = CounterShift.objects.select_for_update().filter(counter=counter, status=ShiftStatus.OPEN).select_related('cashier').first()
            if occupied:
                raise ValueError(f'{counter.code} is already open under {cls._name(occupied.cashier)}.')

            counts = cls.parse_denominations(denominations) if denominations else None
            if counts is not None:
                float_amount = cls.denomination_total(counts)
                if opening_float not in (None, '') and cls._money(opening_float) != float_amount:
                    raise ValueError(f'Declared float ₹{cls._money(opening_float)} does not match the note count ₹{float_amount}.')
            else:
                float_amount = cls._money(opening_float if opening_float not in (None, '') else '5000.00')
            if float_amount < 0:
                raise ValueError('Opening float cannot be negative.')

            shift = CounterShift.objects.create(counter=counter, cashier=cashier, opening_float=float_amount, status=ShiftStatus.OPEN)
            if counts is not None:
                cls._save_tally(shift, TallyType.OPENING_FLOAT, counts, cashier)
            return shift

    # ---------- register maths ----------
    @classmethod
    def compute_register(cls, shift) -> dict:
        payments = list(Payment.objects.filter(shift=shift, payment_status='SUCCESS').select_related('invoice', 'patient'))
        deposits = list(PatientDeposit.objects.filter(shift=shift).select_related('patient'))
        refunds = list(RefundRequest.objects.filter(disbursed_shift=shift, status=RefundStatus.DISBURSED).select_related('patient'))
        pickups = list(CashPickupVoucher.objects.filter(shift=shift, status=PickupStatus.COMPLETED))

        def total(rows, mode, attr='amount', mode_attr='tender_mode'):
            return sum((getattr(r, attr) for r in rows if getattr(r, mode_attr) == mode), Decimal('0.00'))

        by_tender = {}
        for p in payments:
            by_tender[p.tender_mode] = by_tender.get(p.tender_mode, Decimal('0.00')) + p.amount
        cash_payments = by_tender.get(TenderMode.CASH, Decimal('0.00'))
        cash_deposits = total(deposits, TenderMode.CASH, 'deposit_amount')
        cash_refunds = sum((r.requested_amount for r in refunds if (r.disbursed_tender or 'CASH') == 'CASH'), Decimal('0.00'))
        pickup_total = sum((p.amount for p in pickups), Decimal('0.00'))
        card = by_tender.get(TenderMode.CARD, Decimal('0.00')) + total(deposits, TenderMode.CARD, 'deposit_amount')
        upi = by_tender.get(TenderMode.UPI, Decimal('0.00')) + total(deposits, TenderMode.UPI, 'deposit_amount')
        expected_cash = shift.opening_float + cash_payments + cash_deposits - cash_refunds - pickup_total

        register = []
        for p in payments:
            who = f"{p.patient.first_name} {p.patient.last_name}".strip() if p.patient else ''
            register.append({'at': p.payment_date, 'ref': p.payment_number, 'kind': 'PAYMENT', 'tender': p.tender_mode,
                             'detail': f"{who} · {p.invoice.invoice_number if p.invoice else ''}".strip(' ·'), 'amount': float(p.amount)})
        for d in deposits:
            who = f"{d.patient.first_name} {d.patient.last_name}".strip() if d.patient else ''
            register.append({'at': d.created_at, 'ref': d.deposit_number, 'kind': 'DEPOSIT', 'tender': d.tender_mode,
                             'detail': f"Advance deposit · {who}", 'amount': float(d.deposit_amount)})
        for r in refunds:
            register.append({'at': r.disbursed_at or r.updated_at, 'ref': r.credit_note_number or r.refund_number, 'kind': 'REFUND',
                             'tender': r.disbursed_tender or 'CASH', 'detail': f"Refund · {r.reason}", 'amount': -float(r.requested_amount)})
        for p in pickups:
            register.append({'at': p.collected_at or p.created_at, 'ref': p.voucher_number, 'kind': 'PICKUP', 'tender': 'CASH',
                             'detail': f"Cash pickup by {cls._name(p.supervisor)}", 'amount': -float(p.amount)})
        register.sort(key=lambda r: r['at'], reverse=True)
        for r in register:
            r['at'] = timezone.localtime(r['at']).strftime('%H:%M') if r['at'] else ''

        utilization = float((expected_cash / cls.DRAWER_LIMIT * 100).quantize(Decimal('0.1'))) if cls.DRAWER_LIMIT else 0.0
        return {
            'opening_float': cls._money(shift.opening_float),
            'cash_payments': cls._money(cash_payments),
            'cash_deposits': cls._money(cash_deposits),
            'cash_refunds': cls._money(cash_refunds),
            'pickups': cls._money(pickup_total),
            'expected_cash': cls._money(expected_cash),
            'expected_card': cls._money(card),
            'expected_upi': cls._money(upi),
            'other': cls._money(sum((v for k, v in by_tender.items() if k not in (TenderMode.CASH, TenderMode.CARD, TenderMode.UPI)), Decimal('0.00'))),
            'deposit_deductions': cls._money(by_tender.get(TenderMode.DEPOSIT_DEDUCTION, Decimal('0.00'))),
            'invoices_settled': len({p.invoice_id for p in payments if p.invoice_id}),
            'transactions': len(register),
            'register': register,
            'utilization_percent': utilization,
            'over_limit': expected_cash > cls.DRAWER_LIMIT,
            'pickup_due': Decimal(str(utilization)) >= cls.PICKUP_THRESHOLD_PERCENT,
        }

    @classmethod
    def compute_drawer_variance(cls, shift, physical_cash) -> dict:
        """Variance = physical_cash - (opening_float + cash_payments + cash_deposits - cash_refunds - cash_pickups)."""
        reg = cls.compute_register(shift)
        variance = cls._money(physical_cash) - reg['expected_cash']
        return {'expected_cash': reg['expected_cash'], 'physical_cash': cls._money(physical_cash), 'variance': variance,
                'variance_status': VarianceStatus.GREEN_MATCH if variance == 0 else VarianceStatus.RED_VARIANCE}

    # ---------- summaries ----------
    @classmethod
    def shift_summary(cls, shift, include_register: bool = True) -> dict:
        if not shift:
            return {
                'has_active_shift': False, 'shift': None, 'counter': None, 'shift_id': None, 'shift_number': None,
                'counter_code': None, 'counter_name': None, 'cashier_name': None, 'started_at': None, 'status': None,
                'opening_float': 0.0, 'cash_collected': 0.0, 'card_collected': 0.0, 'upi_collected': 0.0,
                'other_collected': 0.0, 'deposit_deducted': 0.0, 'total_collected': 0.0,
                'expected_cash_in_drawer': 0.0, 'invoices_count': 0, 'invoices_settled_count': 0,
                'drawer_limit': float(cls.DRAWER_LIMIT), 'register': [], 'pending_pickup': None
            }
        reg = cls.compute_register(shift)
        opening = cls._tally_dict(shift.tallies.filter(tally_type=TallyType.OPENING_FLOAT).first())
        pending = CashPickupVoucher.objects.filter(shift=shift, status=PickupStatus.REQUESTED).first()
        cashier_name = cls._name(shift.cashier)
        started = timezone.localtime(shift.opening_time)
        total_collected = reg['cash_payments'] + reg['expected_card'] + reg['expected_upi'] + reg['cash_deposits'] + reg['other']
        data = {
            'has_active_shift': shift.status == ShiftStatus.OPEN,
            'shift_id': str(shift.id),
            'shift_number': f"{shift.counter.code} · {started.strftime('%d %b %H:%M')}",
            'counter_code': shift.counter.code,
            'counter_name': shift.counter.name,
            'counter_location': shift.counter.get_station_location_display(),
            'cashier_name': cashier_name,
            'started_at': started.isoformat(),
            'status': shift.status,
            'opening_float': float(reg['opening_float']),
            'opening_denominations': opening,
            'cash_collected': float(reg['cash_payments']),
            'cash_deposits': float(reg['cash_deposits']),
            'cash_refunds': float(reg['cash_refunds']),
            'cash_pickups': float(reg['pickups']),
            'card_collected': float(reg['expected_card']),
            'upi_collected': float(reg['expected_upi']),
            'other_collected': float(reg['other']),
            'deposit_deducted': float(reg['deposit_deductions']),
            'total_collected': float(total_collected),
            'expected_cash_in_drawer': float(reg['expected_cash']),
            'invoices_count': reg['invoices_settled'],
            'invoices_settled_count': reg['invoices_settled'],
            'transactions': reg['transactions'],
            'drawer_limit': float(cls.DRAWER_LIMIT),
            'utilization_percent': reg['utilization_percent'],
            'over_limit': reg['over_limit'],
            'pickup_due': reg['pickup_due'],
            'pending_pickup': {'id': str(pending.id), 'voucher_number': pending.voucher_number, 'amount': float(pending.amount)} if pending else None,
            # legacy nested shape (pre-Phase 4 callers)
            'shift': {'id': str(shift.id), 'opening_time': started.strftime('%Y-%m-%d %H:%M:%S'),
                      'opening_float': float(shift.opening_float), 'status': shift.status, 'cashier_name': cashier_name},
            'counter': {'id': str(shift.counter.id), 'code': shift.counter.code, 'name': shift.counter.name,
                        'location': shift.counter.get_station_location_display()},
        }
        if include_register:
            data['register'] = reg['register'][:50]
        if shift.status != ShiftStatus.OPEN:
            data['closing'] = cls.closing_detail(shift)
        return data

    @classmethod
    def closing_detail(cls, shift) -> dict:
        closing = cls._tally_dict(shift.tallies.filter(tally_type=TallyType.CLOSING_COUNT).first())
        def f(v):
            return float(v) if v is not None else None
        counted_card = (shift.system_expected_card or 0) + shift.card_variance if shift.system_expected_card is not None else None
        counted_upi = (shift.system_expected_upi or 0) + shift.upi_variance if shift.system_expected_upi is not None else None
        net = shift.cash_variance + shift.card_variance + shift.upi_variance
        return {
            'submitted_at': timezone.localtime(shift.closing_submitted_at or shift.closing_time).isoformat() if (shift.closing_submitted_at or shift.closing_time) else None,
            'tenders': [
                {'tender': 'CASH', 'expected': f(shift.system_expected_cash), 'counted': f(shift.physical_cash_count), 'variance': float(shift.cash_variance)},
                {'tender': 'CARD', 'expected': f(shift.system_expected_card), 'counted': f(counted_card), 'variance': float(shift.card_variance)},
                {'tender': 'UPI', 'expected': f(shift.system_expected_upi), 'counted': f(counted_upi), 'variance': float(shift.upi_variance)},
            ],
            'net_variance': float(net),
            'variance_status': shift.variance_status,
            'denominations': closing,
            'cashier_note': shift.variance_note,
            'supervisor_finding': shift.supervisor_finding,
            'investigation_number': shift.investigation_number,
            'closed_with_variance': shift.closed_with_variance,
            'signed_off_by': cls._name(shift.supervisor_sign_off_by),
            'signed_off_at': timezone.localtime(shift.supervisor_signed_at).isoformat() if shift.supervisor_signed_at else None,
            'vault_handover': shift.vault_handover.handover_number if shift.vault_handover else None,
        }

    @classmethod
    def shift_history(cls, cashier, limit: int = 5) -> list:
        shifts = CounterShift.objects.filter(cashier=cashier).exclude(status=ShiftStatus.OPEN).select_related(
            'counter', 'supervisor_sign_off_by', 'vault_handover').order_by('-opening_time')[:limit]
        rows = []
        for s in shifts:
            reg = cls.compute_register(s)
            rows.append({
                'shift_id': str(s.id),
                'counter_code': s.counter.code,
                'opened_at': timezone.localtime(s.opening_time).isoformat(),
                'status': s.status,
                'total_collected': float(reg['cash_payments'] + reg['expected_card'] + reg['expected_upi'] + reg['cash_deposits'] + reg['other']),
                'net_variance': float(s.cash_variance + s.card_variance + s.upi_variance),
                'closed_with_variance': s.closed_with_variance,
                'signed_off_by': cls._name(s.supervisor_sign_off_by),
            })
        return rows

    # ---------- closing ----------
    @classmethod
    def submit_closing(cls, cashier, shift_id=None, denominations: dict = None, physical_cash=None,
                       card_total=None, upi_total=None, note: str = '') -> CounterShift:
        with transaction.atomic():
            qs = CounterShift.objects.select_for_update().select_related('counter')
            shift = qs.filter(id=shift_id).first() if shift_id else qs.filter(cashier=cashier, status=ShiftStatus.OPEN).first()
            if not shift:
                raise NoActiveShift('No open shift to close.')
            if shift.cashier_id != getattr(cashier, 'id', None):
                raise PermissionError('Only the cashier who opened this shift can submit its closing count.')
            if shift.status != ShiftStatus.OPEN:
                raise ValueError(f'This shift is already {shift.get_status_display().lower()}.')

            counts = cls.parse_denominations(denominations) if denominations else None
            counted_cash = cls.denomination_total(counts) if counts is not None else cls._money(physical_cash)
            if counts is not None and physical_cash not in (None, '') and cls._money(physical_cash) != counted_cash:
                raise ValueError(f'Physical cash ₹{cls._money(physical_cash)} does not match the note count ₹{counted_cash}.')

            reg = cls.compute_register(shift)
            counted_card = cls._money(card_total) if card_total not in (None, '') else reg['expected_card']
            counted_upi = cls._money(upi_total) if upi_total not in (None, '') else reg['expected_upi']
            cash_var = counted_cash - reg['expected_cash']
            card_var = counted_card - reg['expected_card']
            upi_var = counted_upi - reg['expected_upi']
            matched = cash_var == 0 and card_var == 0 and upi_var == 0
            note = (note or '').strip()
            if not matched and len(note) < cls.MIN_NOTE_LENGTH:
                raise ValueError('Variance explanation is required when any tender does not match.')

            if counts is not None:
                cls._save_tally(shift, TallyType.CLOSING_COUNT, counts, cashier)
                shift.denominations_submitted = {str(k): (float(v) if k == 'coins' else v) for k, v in counts.items()}
            now = timezone.now()
            shift.physical_cash_count = counted_cash
            shift.system_expected_cash = reg['expected_cash']
            shift.system_expected_card = reg['expected_card']
            shift.system_expected_upi = reg['expected_upi']
            shift.cash_variance = cash_var
            shift.card_variance = card_var
            shift.upi_variance = upi_var
            shift.card_settlement_batch_total = counted_card
            shift.upi_settlement_total = counted_upi
            shift.variance_status = VarianceStatus.GREEN_MATCH if matched else VarianceStatus.RED_VARIANCE
            shift.variance_note = note
            shift.closing_time = now
            shift.closing_submitted_at = now
            shift.status = ShiftStatus.PENDING_APPROVAL
            shift.save()
            # An unexecuted pickup request is moot once the drawer is counted out
            CashPickupVoucher.objects.filter(shift=shift, status=PickupStatus.REQUESTED).delete()
            return shift

    # ---------- supervisor ----------
    @classmethod
    def _assert_not_own(cls, supervisor, shift, action: str):
        if shift.cashier_id == getattr(supervisor, 'id', None):
            raise PermissionError(f'Four-eyes principle: you cannot {action} on your own shift.')

    @classmethod
    def supervisor_signoff(cls, supervisor, shift_id, action: str, finding: str = '') -> CounterShift:
        action = (action or '').upper()
        if action not in ('SIGN_OFF', 'SIGN_OFF_WITH_VARIANCE', 'INVESTIGATE'):
            raise ValueError("action must be SIGN_OFF, SIGN_OFF_WITH_VARIANCE or INVESTIGATE.")
        with transaction.atomic():
            shift = CounterShift.objects.select_for_update().get(id=shift_id)
            cls._assert_not_own(supervisor, shift, 'sign off')
            if shift.status not in (ShiftStatus.PENDING_APPROVAL, ShiftStatus.UNDER_INVESTIGATION):
                raise ValueError(f'Shift is {shift.get_status_display().lower()}; nothing to sign off.')
            finding = (finding or '').strip()
            matched = shift.variance_status == VarianceStatus.GREEN_MATCH
            now = timezone.now()
            if action == 'SIGN_OFF':
                if not matched:
                    raise ValueError('This closing has a variance. Sign off with variance or open an investigation.')
                shift.status = ShiftStatus.CLOSED
            else:
                if matched:
                    raise ValueError('This closing matched; use a plain sign-off.')
                if len(finding) < cls.MIN_NOTE_LENGTH:
                    raise ValueError('Record what you checked and found before acting on a variance.')
                shift.supervisor_finding = finding
                if action == 'INVESTIGATE':
                    if shift.status == ShiftStatus.UNDER_INVESTIGATION:
                        raise ValueError(f'{shift.investigation_number} is already open.')
                    shift.status = ShiftStatus.UNDER_INVESTIGATION
                    shift.investigation_number = next_sequence_number(CounterShift, 'investigation_number', 'INQ', 4)
                else:
                    shift.status = ShiftStatus.CLOSED
                    shift.closed_with_variance = True
            if shift.status == ShiftStatus.CLOSED:
                shift.supervisor_sign_off_by = supervisor
                shift.supervisor_signed_at = now
            shift.save()
            net = shift.cash_variance + shift.card_variance + shift.upi_variance
            title, severity, ref = {
                'SIGN_OFF': ('Closing signed off', AuditSeverity.LOW, f'CLS-{shift.counter.code}'),
                'SIGN_OFF_WITH_VARIANCE': ('Closed with variance', AuditSeverity.HIGH, f'CLS-{shift.counter.code}'),
                'INVESTIGATE': ('Variance investigation opened', AuditSeverity.HIGH, shift.investigation_number),
            }[action]
            SupervisorGovernanceService.audit(
                AuditEventType.CLOSING, title,
                f"{shift.counter.name} · " + (f"cash ₹{shift.physical_cash_count or 0:,.2f}" if action == 'SIGN_OFF' else f"₹{net:+,.2f} · {finding}"),
                severity, supervisor, shift, ref)
            return shift

    @classmethod
    def request_pickup(cls, cashier, notes: str = '') -> CashPickupVoucher:
        shift = cls.validate_active_shift(cashier)
        existing = CashPickupVoucher.objects.filter(shift=shift, status=PickupStatus.REQUESTED).first()
        if existing:
            return existing
        reg = cls.compute_register(shift)
        suggested = max(Decimal('0.00'), reg['expected_cash'] - shift.opening_float)
        if suggested <= 0:
            raise ValueError('Nothing above the opening float to pick up.')
        return CashPickupVoucher.objects.create(
            voucher_number=next_sequence_number(CashPickupVoucher, 'voucher_number', 'PCK'),
            shift=shift, amount=suggested, requested_by=cashier, notes=notes or '',
            reason=PickupReason.THRESHOLD_LIMIT_EXCEEDED if reg['pickup_due'] else PickupReason.ROUTINE_SWEEP
        )

    @classmethod
    def execute_cash_pickup(cls, supervisor, shift_id, amount=None, reason: str = None, notes: str = '') -> CashPickupVoucher:
        """Supervisor removes cash from an OPEN drawer; it is deducted from the drawer's expected cash."""
        with transaction.atomic():
            shift = CounterShift.objects.select_for_update().get(id=shift_id)
            cls._assert_not_own(supervisor, shift, 'collect a pickup')
            if shift.status != ShiftStatus.OPEN:
                raise ValueError('Cash pickups are only taken from open drawers.')
            reg = cls.compute_register(shift)
            request = CashPickupVoucher.objects.select_for_update().filter(shift=shift, status=PickupStatus.REQUESTED).first()
            default_amount = max(Decimal('0.00'), reg['expected_cash'] - shift.opening_float)
            amount = cls._money(amount) if amount not in (None, '') else default_amount
            if amount <= 0:
                raise ValueError('Pickup amount must be greater than zero.')
            if amount > reg['expected_cash']:
                raise ValueError(f"Pickup ₹{amount} exceeds the ₹{reg['expected_cash']} expected in the drawer.")
            reason = reason or (PickupReason.THRESHOLD_LIMIT_EXCEEDED if reg['pickup_due'] else PickupReason.ROUTINE_SWEEP)
            if reason not in PickupReason.values:
                raise ValueError(f'Unknown pickup reason {reason}.')
            voucher = request or CashPickupVoucher(
                voucher_number=next_sequence_number(CashPickupVoucher, 'voucher_number', 'PCK'), shift=shift
            )
            voucher.amount = amount
            voucher.reason = reason
            voucher.status = PickupStatus.COMPLETED
            voucher.supervisor = supervisor
            voucher.collected_at = timezone.now()
            voucher.notes = notes or voucher.notes
            voucher.save()
            SupervisorGovernanceService.audit(
                AuditEventType.CASH_PICKUP, 'Cash pickup',
                f"{shift.counter.name} · ₹{amount:,.2f} moved to vault custody", AuditSeverity.LOW,
                supervisor, shift, voucher.voucher_number)
            return voucher

    @classmethod
    def vault_handover(cls, supervisor, shift_ids: list = None, notes: str = '') -> VaultHandover:
        with transaction.atomic():
            qs = CounterShift.objects.select_for_update().filter(status=ShiftStatus.CLOSED, vault_handover__isnull=True)
            if shift_ids:
                qs = qs.filter(id__in=shift_ids)
            shifts = list(qs)
            if not shifts:
                raise ValueError('No signed-off cash bags are waiting for vault handover.')
            total = sum((s.physical_cash_count or Decimal('0.00') for s in shifts), Decimal('0.00'))
            handover = VaultHandover.objects.create(
                handover_number=next_sequence_number(VaultHandover, 'handover_number', 'VLT'),
                supervisor=supervisor, total_cash=total, notes=notes or ''
            )
            CounterShift.objects.filter(id__in=[s.id for s in shifts]).update(vault_handover=handover)
            SupervisorGovernanceService.audit(
                AuditEventType.VAULT_HANDOVER, 'Vault handover',
                f"{len(shifts)} cash bag(s) · ₹{total:,.2f}", AuditSeverity.LOW, supervisor, None, handover.handover_number)
            return handover

    @classmethod
    def supervisor_board(cls) -> dict:
        """Live counters (open drawers) and closing submissions for the supervisor Counter Closing screen."""
        today = timezone.localdate()
        open_shifts = CounterShift.objects.filter(status=ShiftStatus.OPEN).select_related('counter', 'cashier')
        closing = CounterShift.objects.filter(
            models.Q(status__in=[ShiftStatus.PENDING_APPROVAL, ShiftStatus.UNDER_INVESTIGATION]) |
            models.Q(status=ShiftStatus.CLOSED, vault_handover__isnull=True) |
            models.Q(status=ShiftStatus.CLOSED, closing_time__date=today)
        ).select_related('counter', 'cashier', 'supervisor_sign_off_by', 'vault_handover').order_by('closing_submitted_at')

        live = []
        for s in open_shifts:
            summary = cls.shift_summary(s, include_register=False)
            live.append({k: summary[k] for k in (
                'shift_id', 'counter_code', 'counter_name', 'counter_location', 'cashier_name', 'started_at',
                'expected_cash_in_drawer', 'card_collected', 'upi_collected', 'total_collected', 'utilization_percent',
                'over_limit', 'pickup_due', 'pending_pickup', 'transactions')})
        rows = []
        for s in closing:
            rows.append({
                'shift_id': str(s.id), 'counter_code': s.counter.code, 'counter_name': s.counter.name,
                'counter_location': s.counter.get_station_location_display(), 'cashier_name': cls._name(s.cashier),
                'cashier_id': str(s.cashier_id), 'status': s.status, **cls.closing_detail(s)
            })
        submitted = [r for r in rows]
        awaiting_vault = [r for r in rows if r['status'] == ShiftStatus.CLOSED and not r['vault_handover']]
        return {
            'drawer_limit': float(cls.DRAWER_LIMIT),
            'pickup_threshold_percent': float(cls.PICKUP_THRESHOLD_PERCENT),
            'live_counters': live,
            'closings': rows,
            'kpis': {
                'open_counters': len(live),
                'submitted': len([r for r in submitted if r['status'] in (ShiftStatus.PENDING_APPROVAL, ShiftStatus.UNDER_INVESTIGATION)]),
                'matched': len([r for r in submitted if r['variance_status'] == VarianceStatus.GREEN_MATCH]),
                'net_variance': round(sum(r['net_variance'] for r in submitted if r['status'] != ShiftStatus.CLOSED or not r['vault_handover']), 2),
                'cash_to_vault': float(sum(Decimal(str(t['counted'] or 0)) for r in awaiting_vault for t in r['tenders'] if t['tender'] == 'CASH')),
                'awaiting_vault': len(awaiting_vault),
            }
        }


class RefundWorkflowService:
    @staticmethod
    def initiate_refund_request(
        invoice_id: str,
        amount: Decimal,
        reason: str,
        clinical_justification: str = '',
        payment_id: str = None,
        requested_by=None,
        item_ids: list = None,
        shift=None
    ) -> RefundRequest:
        with transaction.atomic():
            invoice = Invoice.objects.select_for_update().get(id=invoice_id)
            amount = Decimal(str(amount))
            if amount <= Decimal('0.00'):
                raise ValueError("Refund requested amount must be strictly greater than zero.")

            existing_refunds = RefundRequest.objects.filter(
                invoice=invoice,
                status__in=[RefundStatus.PENDING, RefundStatus.ESCALATED, RefundStatus.APPROVED, RefundStatus.DISBURSED]
            ).aggregate(total=models.Sum('requested_amount'))['total'] or Decimal('0.00')

            max_eligible = invoice.paid - existing_refunds
            if amount > max_eligible:
                raise ValueError(
                    f"Refund amount (₹{amount}) exceeds eligible settled balance. "
                    f"Total paid: ₹{invoice.paid}, Prior refunds: ₹{existing_refunds}, Max refundable: ₹{max_eligible}."
                )

            payment = None
            if payment_id:
                payment = Payment.objects.filter(id=payment_id, invoice=invoice).first()

            # Phase 5: the lines being refunded drive the supervisor's "service not delivered" verification
            items = []
            if item_ids:
                wanted = {str(i) for i in item_ids}
                rows = [it for it in InvoiceItem.objects.filter(invoice=invoice) if str(it.id) in wanted]
                if len(rows) != len(wanted):
                    raise ValueError('One or more refund items do not belong to this invoice.')
                items = [{
                    'invoice_item_id': str(it.id), 'description': it.description, 'department': it.department,
                    'service_code': it.service_code, 'source_reference_id': it.source_reference_id or '',
                    'amount': float(it.total)
                } for it in rows]
                if amount > sum((it.total for it in rows), Decimal('0.00')):
                    raise ValueError('Refund amount exceeds the value of the selected items.')

            refund_request = RefundRequest.objects.create(
                refund_number=next_sequence_number(RefundRequest, 'refund_number', 'REF'),
                invoice=invoice,
                payment=payment,
                patient=invoice.patient,
                requested_amount=amount,
                reason=reason,
                clinical_justification=clinical_justification,
                status=RefundStatus.PENDING,
                initiated_by=requested_by,
                requested_shift=shift,
                refund_items=items,
                original_tender=SupervisorGovernanceService.original_tender(invoice, payment)
            )
            SupervisorGovernanceService.audit(
                AuditEventType.REFUND_REQUESTED, 'Refund requested',
                f"{invoice.invoice_number} · ₹{amount:,.2f} · {reason}", AuditSeverity.LOW,
                requested_by, shift, refund_request.refund_number
            )
            return refund_request

    @staticmethod
    def approve_and_disburse_refund(
        refund_id: str,
        supervisor,
        disbursed_tender: str = 'CASH',
        disbursed_shift=None
    ) -> dict:
        """Legacy one-step approve-and-pay. Cash refunds are paid out of a drawer, so `disbursed_shift` (the
        disburser's own open shift) is required for CASH and is deducted from that drawer's expected cash.
        Phase 5: four-eyes and the supervisor refund limit apply here too."""
        tender = (disbursed_tender or 'CASH').upper()
        if tender == 'CASH' and disbursed_shift is None:
            raise NoActiveShift('Cash refunds are paid from a counter drawer: open your shift before disbursing in cash.')
        with transaction.atomic():
            refund_req = RefundRequest.objects.select_for_update().get(id=refund_id)
            tier = SupervisorGovernanceService.assert_reviewer(supervisor, refund_req.initiated_by_id, refund_req.status)
            if refund_req.status not in (RefundStatus.PENDING, RefundStatus.ESCALATED):
                raise ValueError(f"Refund {refund_req.refund_number} is already {refund_req.status} and cannot be processed.")
            if tier != 'ADMIN' and refund_req.requested_amount > SupervisorGovernanceService.REFUND_LIMIT_AMOUNT:
                raise ValueError(SupervisorGovernanceService.refund_limit_message())
            refund_req.approved_by = supervisor
            refund_req.approved_at = timezone.now()
            return SupervisorGovernanceService.issue_refund_credit(refund_req, supervisor, tender, disbursed_shift)



class DepartmentTariffSyncService:
    """
    Real-Time Department Tariff Synchronization Engine (Phase 1).
    Synchronizes OPD Doctor Consultation Fees, Diagnostic Laboratory Tests,
    and Pharmacy Formulary Medicines into central TariffMaster.
    """
    @staticmethod
    def _money(value) -> Decimal:
        return Decimal(str(value if value not in (None, '') else '0')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    @classmethod
    def sync_doctor_tariff(cls, doctor) -> TariffMaster:
        if not doctor:
            return None
        doc_user = getattr(doctor, 'user', None)
        doc_name = (doc_user.get_full_name() or doc_user.username) if doc_user else 'Consulting Doctor'
        code = f"DOC-{str(doctor.id)[:8].upper()}"
        fee = cls._money(getattr(doctor, 'consultation_fee', '0.00'))

        tariff, created = TariffMaster.objects.get_or_create(
            code=code,
            defaults={
                'name': f"Consultation - Dr. {doc_name}",
                'department': 'OPD',
                'owner_department': 'OPD',
                'base_price': fee,
                'gst_rate': Decimal('0.00'),
                'emergency_markup_percent': Decimal('0.00'),
                'is_active': True,
            }
        )
        if not created:
            changed = False
            expected_name = f"Consultation - Dr. {doc_name}"
            if tariff.base_price != fee:
                tariff.base_price = fee
                changed = True
            if tariff.name != expected_name:
                tariff.name = expected_name
                changed = True
            if not tariff.is_active:
                tariff.is_active = True
                changed = True
            if changed:
                tariff.save()

        return tariff

    @classmethod
    def sync_lab_test_tariff(cls, test) -> TariffMaster:
        if not test or not getattr(test, 'test_code', None):
            return None
        code = str(test.test_code).strip()
        price = cls._money(getattr(test, 'price', '0.00'))
        name = str(test.name).strip()
        is_active = getattr(test, 'is_active', True)

        tariff, created = TariffMaster.objects.get_or_create(
            code=code,
            defaults={
                'name': name,
                'department': 'LAB',
                'owner_department': 'LAB',
                'base_price': price,
                'gst_rate': Decimal('0.00'),
                'emergency_markup_percent': Decimal('0.00'),
                'is_active': is_active,
            }
        )
        if not created:
            # TariffMaster is the price authority: update descriptive fields without overriding established tariff price
            changed = False
            if tariff.name != name:
                tariff.name = name
                changed = True
            if tariff.is_active != is_active:
                tariff.is_active = is_active
                changed = True
            if changed:
                tariff.save(update_fields=['name', 'is_active', 'updated_at'])

        return tariff

    @classmethod
    def sync_pharmacy_medicine_tariff(cls, medicine) -> TariffMaster:
        if not medicine or not getattr(medicine, 'item_code', None):
            return None
        code = str(medicine.item_code).strip()
        price = cls._money(getattr(medicine, 'unit_price', '0.00'))
        strength = getattr(medicine, 'strength', None)
        name = f"{medicine.name} ({strength})".strip() if strength else str(medicine.name).strip()
        is_active = getattr(medicine, 'is_active', True)

        tariff, created = TariffMaster.objects.get_or_create(
            code=code,
            defaults={
                'name': name,
                'department': 'PHARMACY',
                'owner_department': 'PHARMACY',
                'base_price': price,
                'gst_rate': Decimal('12.00'),
                'emergency_markup_percent': Decimal('0.00'),
                'is_active': is_active,
            }
        )
        if not created:
            changed = False
            if tariff.base_price != price:
                tariff.base_price = price
                changed = True
            if tariff.name != name:
                tariff.name = name
                changed = True
            if tariff.is_active != is_active:
                tariff.is_active = is_active
                changed = True
            if changed:
                tariff.save()

        return tariff

    @classmethod
    def bulk_sync_all(cls) -> dict:
        from apps.accounts.models import DoctorProfile
        from apps.lab.models import LabTest
        from apps.pharmacy.models import PharmacyMedicine

        opd_count = 0
        lab_count = 0
        pharmacy_count = 0

        with transaction.atomic():
            for doc in DoctorProfile.objects.select_related('user').all():
                cls.sync_doctor_tariff(doc)
                opd_count += 1

            for test in LabTest.objects.all():
                cls.sync_lab_test_tariff(test)
                lab_count += 1

            for med in PharmacyMedicine.objects.all():
                cls.sync_pharmacy_medicine_tariff(med)
                pharmacy_count += 1

        return {
            'opd_synced': opd_count,
            'lab_synced': lab_count,
            'pharmacy_synced': pharmacy_count,
            'total_synced': opd_count + lab_count + pharmacy_count
        }


class DepartmentChargeIntegrationService:
    @staticmethod
    def emit_opd_consultation_charge(appointment) -> dict:
        TariffGovernanceService.sync_due_versions()
        from apps.appointments.models import Appointment
        if isinstance(appointment, (str, int)):
            appointment = Appointment.objects.select_related('patient', 'doctor__user').get(id=appointment)

        # Check for existing active charge for this appointment
        existing_charge = BillableChargeItem.objects.filter(
            department='OPD',
            source_reference_id=str(appointment.id),
            status__in=[ChargeItemStatus.PENDING, ChargeItemStatus.INVOICED]
        ).first()

        existing_event = DepartmentChargeEvent.objects.filter(
            source_department='OPD',
            encounter_id=str(appointment.id)
        ).first()

        if existing_charge:
            return {
                'charge_item': existing_charge,
                'charge_event': existing_event,
                'already_existed': True
            }

        # Resolve Doctor Consultation Tariff from TariffMaster
        doctor = getattr(appointment, 'doctor', None)
        tariff = None
        if doctor:
            dept = getattr(doctor, 'department', '') or getattr(doctor, 'specialty', '')
            if dept:
                spec_codes = [
                    f"OPD-CONS-{dept.upper()[:4]}",
                    f"OPD-CONS-{dept.upper().replace(' ', '_')[:10]}",
                    f"CONS-{dept.upper()[:4]}",
                    f"CONS-{dept.upper().replace(' ', '_')[:10]}",
                ]
                tariff = TariffMaster.objects.filter(code__in=spec_codes, is_active=True).first()

            if not tariff:
                doc_code = f"DOC-{str(doctor.id)[:8].upper()}"
                tariff = TariffMaster.objects.filter(code=doc_code, is_active=True).first()

            if not tariff:
                tariff = DepartmentTariffSyncService.sync_doctor_tariff(doctor)

        if not tariff:
            tariff = TariffMaster.objects.filter(code='OPD-CONS-GEN', is_active=True).first()

        if not tariff:
            tariff = TariffMaster.objects.filter(department='OPD', is_active=True).first()

        if not tariff:
            tariff, _ = TariffMaster.objects.get_or_create(
                code='OPD-CONS-01',
                defaults={
                    'name': 'General OPD Consultation Fee',
                    'department': 'OPD',
                    'base_price': Decimal('500.00'),
                    'gst_rate': Decimal('0.00'),
                    'is_active': True
                }
            )

        unit_price = Decimal(str(tariff.base_price))
        tax_rate = Decimal(str(tariff.gst_rate))
        tax_amount = (unit_price * tax_rate / Decimal('100.00')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        total_amount = unit_price + tax_amount

        doc_name = (doctor.user.get_full_name() or doctor.user.username) if (doctor and getattr(doctor, 'user', None)) else 'Consulting Doctor'
        service_name = f"Consultation - Dr. {doc_name}"
        is_stat = getattr(appointment, 'type', '') == 'EMERGENCY'
        priority = 'STAT' if is_stat else 'ROUTINE'

        charge_item = BillableChargeItem.objects.create(
            patient=appointment.patient,
            department='OPD',
            service_code=tariff.code,
            service_name=service_name,
            unit_price=unit_price,
            quantity=1,
            discount_amount=Decimal('0.00'),
            tax_rate=tax_rate,
            tax_amount=tax_amount,
            total_amount=total_amount,
            source_reference_id=str(appointment.id),
            priority=priority,
            status=ChargeItemStatus.PENDING
        )

        charge_event = DepartmentChargeEvent.objects.create(
            source_department='OPD',
            patient=appointment.patient,
            encounter_type='OPD',
            encounter_id=str(appointment.id),
            tariff_code=tariff.code,
            service_name=service_name,
            quantity=1,
            unit_price=unit_price,
            total_amount=total_amount,
            override_allowed=False,
            status=DepartmentChargeEventStatus.QUEUED,
            charge_item=charge_item,
            metadata={
                'appointment_number': appointment.appointment_number,
                'token_number': getattr(appointment, 'token_number', 1),
                'doctor': doc_name,
                'appointment_type': getattr(appointment, 'type', 'WALK_IN')
            }
        )

        return {
            'charge_item': charge_item,
            'charge_event': charge_event,
            'already_existed': False
        }

    @staticmethod
    def emit_lab_test_charges(lab_order) -> list:
        TariffGovernanceService.sync_due_versions()
        from apps.lab.models import LabOrder
        if isinstance(lab_order, (str, int)):
            lab_order = LabOrder.objects.select_related('patient', 'test').prefetch_related('items__test').get(id=lab_order)

        tests_to_charge = []
        if lab_order.items.exists():
            for item in lab_order.items.all():
                if item.test:
                    tests_to_charge.append(item.test)
        elif lab_order.test:
            tests_to_charge.append(lab_order.test)

        results = []
        for test in tests_to_charge:
            # Check if charge item already exists
            existing = BillableChargeItem.objects.filter(
                department='LAB',
                source_reference_id=str(lab_order.id),
                service_code=test.test_code,
                status__in=[ChargeItemStatus.PENDING, ChargeItemStatus.INVOICED]
            ).first()

            if existing:
                existing_event = DepartmentChargeEvent.objects.filter(
                    source_department='LAB',
                    encounter_id=str(lab_order.id),
                    tariff_code=test.test_code
                ).first()
                results.append({'charge_item': existing, 'charge_event': existing_event, 'already_existed': True})
                continue

            # TariffMaster is single source of truth for pricing
            tariff = DepartmentTariffSyncService.sync_lab_test_tariff(test)
            if not tariff:
                tariff = TariffMaster.objects.filter(code=test.test_code, is_active=True).first()
            if not tariff:
                tariff = TariffMaster.objects.filter(name__iexact=test.name, is_active=True).first()
            if not tariff:
                tariff, _ = TariffMaster.objects.get_or_create(
                    code=test.test_code or f"LAB-{str(test.id)[:8].upper()}",
                    defaults={
                        'name': test.name,
                        'department': 'LAB',
                        'base_price': Decimal(str(getattr(test, 'price', '250.00'))),
                        'gst_rate': Decimal('0.00'),
                        'is_active': True
                    }
                )

            unit_price = Decimal(str(tariff.base_price))
            tax_rate = Decimal(str(tariff.gst_rate))
            tax_amount = (unit_price * tax_rate / Decimal('100.00')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            total_amount = unit_price + tax_amount

            charge_item = BillableChargeItem.objects.create(
                patient=lab_order.patient,
                department='LAB',
                service_code=tariff.code,
                service_name=test.name,
                unit_price=unit_price,
                quantity=1,
                discount_amount=Decimal('0.00'),
                tax_rate=tax_rate,
                tax_amount=tax_amount,
                total_amount=total_amount,
                source_reference_id=str(lab_order.id),
                priority=lab_order.priority or 'ROUTINE',
                status=ChargeItemStatus.PENDING
            )

            charge_event = DepartmentChargeEvent.objects.create(
                source_department='LAB',
                patient=lab_order.patient,
                encounter_type='DIAGNOSTICS',
                encounter_id=str(lab_order.id),
                tariff_code=tariff.code,
                service_name=test.name,
                quantity=1,
                unit_price=unit_price,
                total_amount=total_amount,
                override_allowed=False,
                status=DepartmentChargeEventStatus.QUEUED,
                charge_item=charge_item,
                metadata={
                    'order_number': lab_order.order_number,
                    'priority': lab_order.priority,
                    'barcode': lab_order.barcode,
                    'sample_type': getattr(test, 'sample_type', '')
                }
            )

            results.append({'charge_item': charge_item, 'charge_event': charge_event, 'already_existed': False})

        return results

    @staticmethod
    def emit_pharmacy_dispense_charge(dispense_order, routing: str = 'PAY_AT_RECEPTION', amount=None) -> dict:
        """`amount` is the billable value actually dispensed (partial dispenses bill only what was handed over);
        it defaults to the order total."""
        from apps.pharmacy.models import PharmacyDispenseOrder
        if isinstance(dispense_order, (str, int)):
            dispense_order = PharmacyDispenseOrder.objects.select_related('patient').get(id=dispense_order)

        existing = BillableChargeItem.objects.filter(
            department='PHARMACY',
            source_reference_id=str(dispense_order.id),
            status__in=[ChargeItemStatus.PENDING, ChargeItemStatus.INVOICED]
        ).first()

        existing_event = DepartmentChargeEvent.objects.filter(
            source_department='PHARMACY',
            encounter_id=str(dispense_order.id)
        ).first()

        if existing:
            return {'charge_item': existing, 'charge_event': existing_event, 'already_existed': True}

        total_amount = Decimal(str(amount if amount is not None else (dispense_order.total_amount or '0.00')))

        charge_item = BillableChargeItem.objects.create(
            patient=dispense_order.patient,
            department='PHARMACY',
            service_code='PHARM-DISP',
            service_name=f"Prescription Dispense - {dispense_order.order_number}",
            unit_price=total_amount,
            quantity=1,
            discount_amount=Decimal('0.00'),
            tax_rate=Decimal('0.00'),
            tax_amount=Decimal('0.00'),
            total_amount=total_amount,
            source_reference_id=str(dispense_order.id),
            priority='ROUTINE',
            status=ChargeItemStatus.PENDING
        )

        charge_event = DepartmentChargeEvent.objects.create(
            source_department='PHARMACY',
            patient=dispense_order.patient,
            encounter_type='PHARMACY',
            encounter_id=str(dispense_order.id),
            tariff_code='PHARM-DISP',
            service_name=charge_item.service_name,
            quantity=1,
            unit_price=total_amount,
            total_amount=total_amount,
            status=DepartmentChargeEventStatus.QUEUED,
            charge_item=charge_item,
            metadata={
                'order_number': dispense_order.order_number,
                'routing': routing,
                'token_slip_number': getattr(dispense_order, 'token_slip_number', None)
            }
        )

        return {'charge_item': charge_item, 'charge_event': charge_event, 'already_existed': False}

    @staticmethod
    def is_lab_sample_collection_allowed(order_id) -> dict:
        from apps.lab.models import LabOrder
        try:
            import uuid
            uuid.UUID(str(order_id))
            order = LabOrder.objects.select_related('patient').filter(id=order_id).first()
        except (ValueError, TypeError):
            order = None

        if not order:
            order = LabOrder.objects.select_related('patient').filter(
                models.Q(order_number__iexact=str(order_id)) | models.Q(barcode__iexact=str(order_id))
            ).first()

        if not order:
            return {
                'allowed': False,
                'is_hard_gate': True,
                'reason': f"Laboratory order '{order_id}' was not found.",
                'order_id': str(order_id)
            }

        # Check DepartmentGatingRule
        rule = DepartmentGatingRule.objects.filter(gating_action=GatingAction.LAB_SAMPLE_COLLECTION).first()
        if rule and not rule.is_hard_gate:
            return {
                'allowed': True,
                'is_hard_gate': False,
                'reason': 'Sample collection hard gate is disabled in hospital policy.',
                'order_number': order.order_number
            }

        # Check Inpatient Admission: Admitted patients accrue charges to IPD running ledger
        active_admission = InpatientAdmission.objects.filter(
            patient=order.patient,
            status='ADMITTED'
        ).first()
        if active_admission:
            return {
                'allowed': True,
                'is_hard_gate': True,
                'is_ipd': True,
                'admission_number': active_admission.admission_number,
                'reason': f'Allowed: Admitted Inpatient ({active_admission.admission_number}). Charges accrued to IPD Running Bill.',
                'order_number': order.order_number
            }

        # Check charges
        charges = list(BillableChargeItem.objects.filter(
            department='LAB',
            source_reference_id=str(order.id)
        ))

        if not charges:
            # Auto-emit charges if they haven't been staged yet
            DepartmentChargeIntegrationService.emit_lab_test_charges(order)
            charges = list(BillableChargeItem.objects.filter(
                department='LAB',
                source_reference_id=str(order.id)
            ))

        pending_charges = [c for c in charges if c.status == ChargeItemStatus.PENDING]
        if pending_charges:
            pending_total = sum([c.total_amount for c in pending_charges], Decimal('0.00'))
            return {
                'allowed': False,
                'is_hard_gate': True,
                'reason': 'Bill Unsettled at Cash Counter',
                'order_number': order.order_number,
                'patient_name': f"{order.patient.first_name} {order.patient.last_name}".strip() if order.patient else 'Patient',
                'uhid': order.patient.uhid if order.patient else '',
                'pending_amount': float(pending_total),
                'action_required': 'Patient must settle laboratory charge at the Billing Counter prior to sample draw.'
            }

        # Verify associated invoices
        invoices = [c.invoice for c in charges if c.invoice]
        if not invoices:
            return {
                'allowed': False,
                'is_hard_gate': True,
                'reason': 'Bill Unsettled at Cash Counter',
                'order_number': order.order_number,
                'pending_amount': float(sum([c.total_amount for c in charges], Decimal('0.00'))),
                'action_required': 'Charges have not been invoiced or paid.'
            }

        for inv in invoices:
            if inv.status not in [InvoiceStatus.PAID, InvoiceStatus.CREDIT_AUTHORIZED]:
                return {
                    'allowed': False,
                    'is_hard_gate': True,
                    'reason': 'Bill Unsettled at Cash Counter',
                    'order_number': order.order_number,
                    'invoice_number': inv.invoice_number,
                    'invoice_status': inv.status,
                    'balance_due': float(inv.balance),
                    'action_required': f'Invoice {inv.invoice_number} is {inv.status}. Remaining balance: Rs {inv.balance}.'
                }

        return {
            'allowed': True,
            'is_hard_gate': True,
            'reason': 'Payment verified and settled',
            'order_number': order.order_number,
            'invoice_number': invoices[0].invoice_number if invoices else None
        }

    @staticmethod
    def check_clinical_clearance(action: str, reference_id: str, department: str = None) -> dict:
        if action == GatingAction.LAB_SAMPLE_COLLECTION:
            res = DepartmentChargeIntegrationService.is_lab_sample_collection_allowed(reference_id)
            return {
                'action': action,
                'reference_id': reference_id,
                'cleared': res.get('allowed', False),
                **res
            }
        elif action == GatingAction.PHARMACY_MEDICINE_RELEASE:
            from apps.pharmacy.models import PharmacyDispenseOrder
            dispense = PharmacyDispenseOrder.objects.filter(
                models.Q(id=reference_id) if '-' in str(reference_id) and len(str(reference_id)) == 36 else models.Q(order_number__iexact=str(reference_id))
            ).first()
            if not dispense:
                return {'action': action, 'reference_id': reference_id, 'cleared': False, 'reason': 'Prescription not found.'}
            if dispense.payment_status == 'PAID':
                return {'action': action, 'reference_id': reference_id, 'cleared': True, 'reason': 'Paid in full.'}
            charges = BillableChargeItem.objects.filter(department='PHARMACY', source_reference_id=str(dispense.id))
            if any(c.status == ChargeItemStatus.PENDING for c in charges):
                return {'action': action, 'reference_id': reference_id, 'cleared': False, 'reason': 'Bill Unsettled at Cash Counter.'}
            return {'action': action, 'reference_id': reference_id, 'cleared': True, 'reason': 'Clearance verified.'}
        else:
            return {'action': action, 'reference_id': reference_id, 'cleared': True, 'reason': f'Default clearance for action {action}.'}

    @staticmethod
    def cancel_charge_event(source_reference_id: str, department: str = None, reason: str = '') -> dict:
        with transaction.atomic():
            charge_qs = BillableChargeItem.objects.filter(
                source_reference_id=source_reference_id,
                status=ChargeItemStatus.PENDING
            )
            if department:
                charge_qs = charge_qs.filter(department=department.upper())
            cancelled_charges = charge_qs.update(status=ChargeItemStatus.CANCELLED)

            event_qs = DepartmentChargeEvent.objects.filter(
                encounter_id=source_reference_id,
                status=DepartmentChargeEventStatus.QUEUED
            )
            if department:
                event_qs = event_qs.filter(source_department=department.upper())
            cancelled_events = event_qs.update(status=DepartmentChargeEventStatus.CANCELLED)

            return {
                'success': True,
                'cancelled_charges_count': cancelled_charges,
                'cancelled_events_count': cancelled_events,
                'source_reference_id': source_reference_id,
                'status': 'CANCELLED',
                'reason': reason
            }


    @staticmethod
    def get_unbilled_charges_queue(department: str = None, uhid: str = None, urgency: str = None, search: str = None) -> list:
        qs = BillableChargeItem.objects.filter(status=ChargeItemStatus.PENDING).select_related('patient').order_by('-created_at')
        if department and department != 'ALL':
            qs = qs.filter(department=department.upper())
        if uhid:
            qs = qs.filter(patient__uhid__iexact=uhid)
        if urgency:
            qs = qs.filter(priority__iexact=urgency)
        if search:
            qs = qs.filter(
                models.Q(service_name__icontains=search) |
                models.Q(service_code__icontains=search) |
                models.Q(patient__first_name__icontains=search) |
                models.Q(patient__last_name__icontains=search) |
                models.Q(patient__uhid__icontains=search) |
                models.Q(source_reference_id__icontains=search)
            )

        items = []
        for c in qs[:100]:
            items.append({
                'id': str(c.id),
                'patient_id': str(c.patient.id) if c.patient else None,
                'patient_name': f"{c.patient.first_name} {c.patient.last_name}".strip() if c.patient else 'Patient',
                'uhid': c.patient.uhid if c.patient else 'WALK-IN',
                'department': c.department,
                'service_code': c.service_code,
                'service_name': c.service_name,
                'unit_price': float(c.unit_price),
                'quantity': c.quantity,
                'discount_amount': float(c.discount_amount),
                'tax_rate': float(c.tax_rate),
                'tax_amount': float(c.tax_amount),
                'total_amount': float(c.total_amount),
                'source_reference_id': c.source_reference_id,
                'priority': c.priority,
                'is_stat': c.priority == 'STAT',
                'status': c.status,
                'created_at': c.created_at.strftime('%Y-%m-%d %H:%M')
            })
        return items


# --- PHASE 3: GENERAL LEDGER BRIDGE SERVICE ---

class GeneralLedgerIntegrationService:
    """
    Real-Time Cashier Settlement to Accounts Department General Ledger (GL) Bridge (Phase 3).
    Automatically translates settled patient invoices and collections into departmentalized
    balanced double-entry General Ledger journal entries for Accounts & Finance.
    """
    COA = {
        # Asset Accounts (Debited on receipt of funds)
        '1110': {'name': 'Cash in Hand / Counter Drawer', 'type': 'ASSET', 'normal': 'DEBIT'},
        '1120': {'name': 'Card Settlement Receivable', 'type': 'ASSET', 'normal': 'DEBIT'},
        '1130': {'name': 'UPI / Payment Gateway Clearing', 'type': 'ASSET', 'normal': 'DEBIT'},
        '1140': {'name': 'Net Banking Settlement Clearing', 'type': 'ASSET', 'normal': 'DEBIT'},
        '1150': {'name': 'Cheques in Hand / Clearing', 'type': 'ASSET', 'normal': 'DEBIT'},
        '1210': {'name': 'TPA / Insurance Claims Receivable', 'type': 'ASSET', 'normal': 'DEBIT'},
        '1220': {'name': 'Corporate Accounts Receivable', 'type': 'ASSET', 'normal': 'DEBIT'},
        '1300': {'name': 'Patient Accounts Receivable', 'type': 'ASSET', 'normal': 'DEBIT'},
        # Liability Accounts
        '2310': {'name': 'Patient Advance Deposits', 'type': 'LIABILITY', 'normal': 'CREDIT'},
        '2410': {'name': 'Output GST Payable (CGST + SGST)', 'type': 'LIABILITY', 'normal': 'CREDIT'},
        # Department Revenue Accounts (Credited on bill settlement / sales)
        '4110': {'name': 'OPD Consultation Revenue', 'type': 'REVENUE', 'normal': 'CREDIT', 'department': 'OPD'},
        '4120': {'name': 'Diagnostic Laboratory Revenue', 'type': 'REVENUE', 'normal': 'CREDIT', 'department': 'LAB'},
        '4140': {'name': 'Pharmacy Drug Sales Revenue', 'type': 'REVENUE', 'normal': 'CREDIT', 'department': 'PHARMACY'},
        '4100': {'name': 'General Patient Service Revenue', 'type': 'REVENUE', 'normal': 'CREDIT', 'department': 'GENERAL'},
    }

    TENDER_ACCOUNT_MAP = {
        'CASH': ('1110', 'Cash in Hand / Counter Drawer'),
        'CARD': ('1120', 'Card Settlement Receivable'),
        'CREDIT_CARD': ('1120', 'Card Settlement Receivable'),
        'DEBIT_CARD': ('1120', 'Card Settlement Receivable'),
        'UPI': ('1130', 'UPI / Payment Gateway Clearing'),
        'QR': ('1130', 'UPI / Payment Gateway Clearing'),
        'NETBANKING': ('1140', 'Net Banking Settlement Clearing'),
        'CHEQUE': ('1150', 'Cheques in Hand / Clearing'),
        'DEPOSIT_DEDUCTION': ('2310', 'Patient Advance Deposits'),
        'INSURANCE_TPA': ('1210', 'TPA / Insurance Claims Receivable'),
        'CORPORATE_CREDIT': ('1220', 'Corporate Accounts Receivable'),
    }

    DEPARTMENT_ACCOUNT_MAP = {
        'OPD': ('4110', 'OPD Consultation Revenue'),
        'CONSULTATION': ('4110', 'OPD Consultation Revenue'),
        'LAB': ('4120', 'Diagnostic Laboratory Revenue'),
        'LABORATORY': ('4120', 'Diagnostic Laboratory Revenue'),
        'PATHOLOGY': ('4120', 'Diagnostic Laboratory Revenue'),
        'DIAGNOSTICS': ('4120', 'Diagnostic Laboratory Revenue'),
        'PHARMACY': ('4140', 'Pharmacy Drug Sales Revenue'),
        'PHARM': ('4140', 'Pharmacy Drug Sales Revenue'),
        'MEDICINE': ('4140', 'Pharmacy Drug Sales Revenue'),
        'GENERAL': ('4100', 'General Patient Service Revenue'),
    }

    @staticmethod
    def _money(value) -> Decimal:
        return Decimal(str(value or '0')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    @classmethod
    def post_realtime_invoice_journal(cls, invoice, payments=None, cashier=None, receipt=None, narration: str = ''):
        """
        Creates a balanced double-entry General Ledger journal voucher whenever an invoice is paid or settled.
        Debits tender asset accounts (1110 Cash, 1120 Card, 1130 UPI, 2310 Deposit).
        Credits departmental revenue accounts (4110 OPD, 4120 Lab, 4140 Pharmacy) and tax (2410 Output GST).
        If an invoice is partially paid, debits 1300 Patient Receivable for the remaining balance.
        """
        if not invoice or invoice.status == InvoiceStatus.DRAFT or invoice.total <= Decimal('0.00'):
            return None

        with transaction.atomic():
            existing_entry = GeneralLedgerJournalEntry.objects.filter(
                invoice=invoice,
                source_type=GLJournalSource.CASHIER_SETTLEMENT
            ).first()

            today_date = timezone.localdate()
            posted_user = cashier if (cashier and getattr(cashier, 'is_authenticated', False)) else None

            # Case A: An initial journal already exists, and this is a subsequent payment towards balance
            if existing_entry and payments:
                subsequent_paid = sum((cls._money(p.amount) for p in payments), Decimal('0.00'))
                if subsequent_paid <= Decimal('0.00'):
                    return existing_entry

                ref = next_sequence_number(GeneralLedgerJournalEntry, 'journal_reference', 'JV', 5)
                desc_text = narration or f"Settlement collection for Invoice {invoice.invoice_number}"
                entry = GeneralLedgerJournalEntry.objects.create(
                    journal_reference=ref,
                    entry_date=today_date,
                    invoice=invoice,
                    receipt=receipt,
                    source_type=GLJournalSource.CASHIER_SETTLEMENT,
                    narration=desc_text,
                    total_debit=subsequent_paid,
                    total_credit=subsequent_paid,
                    is_balanced=True,
                    posted_by=posted_user
                )
                for p in payments:
                    amt = cls._money(p.amount)
                    if amt <= Decimal('0.00'):
                        continue
                    t_mode = (p.tender_mode or p.payment_method or 'CASH').upper()
                    acct_code, acct_name = cls.TENDER_ACCOUNT_MAP.get(t_mode, ('1110', 'Cash in Hand / Counter Drawer'))
                    GeneralLedgerLineItem.objects.create(
                        journal_entry=entry,
                        account_code=acct_code,
                        account_name=acct_name,
                        debit_amount=amt,
                        credit_amount=Decimal('0.00'),
                        department='FINANCE',
                        description=f"Tender {t_mode} for Inv {invoice.invoice_number}"
                    )
                GeneralLedgerLineItem.objects.create(
                    journal_entry=entry,
                    account_code='1300',
                    account_name='Patient Accounts Receivable',
                    debit_amount=Decimal('0.00'),
                    credit_amount=subsequent_paid,
                    department='FINANCE',
                    description=f"Receivable cleared for Inv {invoice.invoice_number}"
                )
                return entry

            # Case B: Primary settlement journal entry for the invoice
            debits = []
            credits = []

            # 1. Debits: Payments tendered
            total_paid = Decimal('0.00')
            for p in (payments or []):
                amt = cls._money(p.amount)
                if amt <= Decimal('0.00'):
                    continue
                t_mode = (p.tender_mode or p.payment_method or 'CASH').upper()
                acct_code, acct_name = cls.TENDER_ACCOUNT_MAP.get(t_mode, ('1110', 'Cash in Hand / Counter Drawer'))
                debits.append({
                    'account_code': acct_code,
                    'account_name': acct_name,
                    'debit': amt,
                    'department': 'FINANCE',
                    'description': f"Payment via {t_mode}"
                })
                total_paid += amt

            # If invoice has remaining balance, debit 1300 Patient Accounts Receivable
            remaining_bal = cls._money(invoice.balance)
            if remaining_bal > Decimal('0.00'):
                debits.append({
                    'account_code': '1300',
                    'account_name': 'Patient Accounts Receivable',
                    'debit': remaining_bal,
                    'department': 'FINANCE',
                    'description': f"Unpaid balance receivable on Inv {invoice.invoice_number}"
                })

            total_debits = sum((d['debit'] for d in debits), Decimal('0.00'))

            # If total_debits doesn't equal invoice.total, default tender
            if total_debits != cls._money(invoice.total):
                diff_deb = cls._money(invoice.total) - total_debits
                if diff_deb > Decimal('0.00'):
                    if invoice.status in (InvoiceStatus.PAID, 'PAID'):
                        acct_code, acct_name = cls.TENDER_ACCOUNT_MAP.get((invoice.settlement_mode or 'CASH').upper(), ('1110', 'Cash in Hand / Counter Drawer'))
                        debits.append({
                            'account_code': acct_code,
                            'account_name': acct_name,
                            'debit': diff_deb,
                            'department': 'FINANCE',
                            'description': 'Settled counter tender'
                        })
                    else:
                        debits.append({
                            'account_code': '1300',
                            'account_name': 'Patient Accounts Receivable',
                            'debit': diff_deb,
                            'department': 'FINANCE',
                            'description': 'Receivable on billed invoice'
                        })
                    total_debits += diff_deb

            # 2. Credits: Department revenue split
            items = list(invoice.items.all())
            gross_total = sum((cls._money(it.unit_price) * it.qty for it in items), Decimal('0.00'))
            inv_discount = cls._money(invoice.discount)
            dept_totals = {}

            for it in items:
                base = cls._money(it.unit_price) * it.qty
                share = (base / gross_total) if gross_total else Decimal('0')
                disc = cls._money(inv_discount * share) if inv_discount else cls._money(it.discount_amount)
                net_line = max(Decimal('0.00'), base - disc)

                raw_dept = (it.department or invoice.category or 'GENERAL').upper()
                if raw_dept in ('OPD', 'CONSULTATION'):
                    norm_dept = 'OPD'
                elif raw_dept in ('LAB', 'LABORATORY', 'PATHOLOGY', 'DIAGNOSTICS'):
                    norm_dept = 'LAB'
                elif raw_dept in ('PHARMACY', 'PHARM', 'MEDICINE'):
                    norm_dept = 'PHARMACY'
                else:
                    norm_dept = 'GENERAL'

                dept_totals[norm_dept] = dept_totals.get(norm_dept, Decimal('0.00')) + net_line

            if not items:
                raw_dept = (invoice.category or 'GENERAL').upper()
                norm_dept = 'OPD' if raw_dept in ('OPD', 'CONSULTATION') else (
                    'LAB' if raw_dept in ('LAB', 'LABORATORY', 'PATHOLOGY') else (
                        'PHARMACY' if raw_dept in ('PHARMACY', 'PHARM') else 'GENERAL'
                    )
                )
                dept_totals[norm_dept] = max(Decimal('0.00'), cls._money(invoice.subtotal) - inv_discount)

            # Reconcile sum of dept net lines to (invoice.subtotal - invoice.discount)
            target_net = max(Decimal('0.00'), cls._money(invoice.subtotal) - inv_discount)
            sum_dept_net = sum(dept_totals.values(), Decimal('0.00'))
            dept_diff = target_net - sum_dept_net
            if dept_diff != Decimal('0.00') and dept_totals:
                largest_dept = max(dept_totals, key=lambda k: dept_totals[k])
                dept_totals[largest_dept] += dept_diff

            for dept_key, net_val in dept_totals.items():
                if net_val <= Decimal('0.00'):
                    continue
                acct_code, acct_name = cls.DEPARTMENT_ACCOUNT_MAP.get(dept_key, ('4100', 'General Patient Service Revenue'))
                credits.append({
                    'account_code': acct_code,
                    'account_name': acct_name,
                    'credit': net_val,
                    'department': dept_key,
                    'description': f"{dept_key} Revenue from Inv {invoice.invoice_number}"
                })

            # Credit Output GST Payable
            tax_val = cls._money(invoice.tax)
            if tax_val > Decimal('0.00'):
                credits.append({
                    'account_code': '2410',
                    'account_name': 'Output GST Payable (CGST + SGST)',
                    'credit': tax_val,
                    'department': 'FINANCE',
                    'description': f"Output GST on Inv {invoice.invoice_number}"
                })

            total_credits = sum((c['credit'] for c in credits), Decimal('0.00'))

            # Balanced double-entry check and exact cent reconciliation
            diff = total_debits - total_credits
            if diff != Decimal('0.00') and abs(diff) <= Decimal('0.05') and credits:
                largest_c = max(credits, key=lambda c: c['credit'])
                largest_c['credit'] += diff
                total_credits += diff

            is_balanced = (total_debits == total_credits)
            ref = next_sequence_number(GeneralLedgerJournalEntry, 'journal_reference', 'JV', 5)
            narration_text = narration or f"Settlement of Invoice {invoice.invoice_number} ({invoice.settlement_mode or 'CASH'})"

            entry = GeneralLedgerJournalEntry.objects.create(
                journal_reference=ref,
                entry_date=today_date,
                invoice=invoice,
                receipt=receipt,
                source_type=GLJournalSource.CASHIER_SETTLEMENT,
                narration=narration_text,
                total_debit=total_debits,
                total_credit=total_credits,
                is_balanced=is_balanced,
                posted_by=posted_user
            )

            for d in debits:
                GeneralLedgerLineItem.objects.create(
                    journal_entry=entry,
                    account_code=d['account_code'],
                    account_name=d['account_name'],
                    debit_amount=d['debit'],
                    credit_amount=Decimal('0.00'),
                    department=d.get('department', 'FINANCE'),
                    description=d.get('description', '')
                )

            for c in credits:
                GeneralLedgerLineItem.objects.create(
                    journal_entry=entry,
                    account_code=c['account_code'],
                    account_name=c['account_name'],
                    debit_amount=Decimal('0.00'),
                    credit_amount=c['credit'],
                    department=c.get('department', 'GENERAL'),
                    description=c.get('description', '')
                )

            return entry

    @classmethod
    def get_live_journal_stream(cls, date_from=None, date_to=None, department=None, limit: int = 50) -> list:
        """Returns recent real-time General Ledger journal vouchers with their line items."""
        qs = GeneralLedgerJournalEntry.objects.select_related('invoice', 'receipt', 'posted_by').prefetch_related('lines').all()
        if date_from:
            qs = qs.filter(entry_date__gte=date_from)
        if date_to:
            qs = qs.filter(entry_date__lte=date_to)
        if department and department != 'ALL':
            qs = qs.filter(lines__department=department.upper()).distinct()

        results = []
        for jv in qs[:limit]:
            results.append({
                'id': str(jv.id),
                'journal_reference': jv.journal_reference,
                'entry_date': jv.entry_date.isoformat(),
                'timestamp': jv.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                'invoice_number': jv.invoice.invoice_number if jv.invoice else '',
                'receipt_number': jv.receipt.receipt_number if jv.receipt else '',
                'source_type': jv.source_type,
                'narration': jv.narration,
                'total_debit': float(jv.total_debit),
                'total_credit': float(jv.total_credit),
                'is_balanced': jv.is_balanced,
                'posted_by': (jv.posted_by.get_full_name() or jv.posted_by.username) if jv.posted_by else 'System',
                'lines': [{
                    'account_code': line.account_code,
                    'account_name': line.account_name,
                    'debit_amount': float(line.debit_amount),
                    'credit_amount': float(line.credit_amount),
                    'department': line.department,
                    'description': line.description
                } for line in jv.lines.all()]
            })
        return results

    @classmethod
    def get_departmental_revenue_summary(cls, date_from=None, date_to=None) -> dict:
        """
        Calculates live departmental revenue and tender collections directly from
        real-time General Ledger line items for the Accounts Department dashboard.
        """
        today = timezone.localdate()
        date_from = date_from or today
        date_to = date_to or today

        lines = GeneralLedgerLineItem.objects.filter(
            journal_entry__entry_date__gte=date_from,
            journal_entry__entry_date__lte=date_to
        ).select_related('journal_entry')

        opd_revenue = Decimal('0.00')
        lab_revenue = Decimal('0.00')
        pharmacy_revenue = Decimal('0.00')
        general_revenue = Decimal('0.00')
        tax_output = Decimal('0.00')

        cash_collected = Decimal('0.00')
        card_collected = Decimal('0.00')
        upi_collected = Decimal('0.00')
        deposits_utilized = Decimal('0.00')
        receivables_booked = Decimal('0.00')

        journal_count = set()

        for line in lines:
            journal_count.add(line.journal_entry_id)
            code = line.account_code
            cr = line.credit_amount
            dr = line.debit_amount

            # Credits (Revenue & Tax)
            if code == '4110':
                opd_revenue += cr
            elif code == '4120':
                lab_revenue += cr
            elif code == '4140':
                pharmacy_revenue += cr
            elif code == '4100':
                general_revenue += cr
            elif code == '2410':
                tax_output += cr

            # Debits (Tenders & Receivables)
            if code == '1110':
                cash_collected += dr
            elif code == '1120':
                card_collected += dr
            elif code == '1130':
                upi_collected += dr
            elif code == '2310':
                deposits_utilized += dr
            elif code == '1300':
                receivables_booked += dr

        total_net_revenue = opd_revenue + lab_revenue + pharmacy_revenue + general_revenue
        total_billed = total_net_revenue + tax_output
        total_collected = cash_collected + card_collected + upi_collected + deposits_utilized

        return {
            'period': {'from': date_from.isoformat(), 'to': date_to.isoformat()},
            'departments': {
                'OPD': {
                    'code': '4110',
                    'name': 'OPD Consultations',
                    'revenue': float(opd_revenue),
                    'share_percent': round(float(opd_revenue / total_net_revenue * 100), 1) if total_net_revenue else 0.0
                },
                'LAB': {
                    'code': '4120',
                    'name': 'Diagnostic Laboratory',
                    'revenue': float(lab_revenue),
                    'share_percent': round(float(lab_revenue / total_net_revenue * 100), 1) if total_net_revenue else 0.0
                },
                'PHARMACY': {
                    'code': '4140',
                    'name': 'Pharmacy Formulary',
                    'revenue': float(pharmacy_revenue),
                    'share_percent': round(float(pharmacy_revenue / total_net_revenue * 100), 1) if total_net_revenue else 0.0
                },
                'GENERAL': {
                    'code': '4100',
                    'name': 'General Hospital Services',
                    'revenue': float(general_revenue),
                    'share_percent': round(float(general_revenue / total_net_revenue * 100), 1) if total_net_revenue else 0.0
                }
            },
            'tenders': {
                'cash': float(cash_collected),
                'card': float(card_collected),
                'upi': float(upi_collected),
                'deposits': float(deposits_utilized),
                'receivables': float(receivables_booked)
            },
            'totals': {
                'net_revenue': float(total_net_revenue),
                'tax_output': float(tax_output),
                'total_billed': float(total_billed),
                'total_collected': float(total_collected),
                'journal_vouchers_count': len(journal_count)
            }
        }


# --- PHASE 3: BILLING EXECUTIVE / CASHIER WORKSPACE ---

class DiscountApprovalRequired(Exception):
    """Raised when a cashier applies a discount above the self-authorised ceiling without approval."""
    def __init__(self, message: str, guard: dict = None):
        super().__init__(message)
        self.guard = guard or {}


class CashierWorkspaceService:
    CASHIER_DISCOUNT_CEILING_PERCENT = Decimal('5.00')
    TURNAROUND_SLA_MINUTES = 10
    INR_DENOMINATIONS = [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1]
    SUPERVISOR_ROLES = (
        'BILLING_SUPERVISOR', 'BILLING_ADMIN', 'BILLING_MANAGER', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'
    )
    SETTLED_STATUSES = (InvoiceStatus.PAID, InvoiceStatus.CREDIT_AUTHORIZED)

    # ---------- helpers ----------
    @staticmethod
    def _money(value) -> Decimal:
        return Decimal(str(value or '0')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    @classmethod
    def is_supervisor(cls, user) -> bool:
        if not user or not getattr(user, 'is_authenticated', False):
            return False
        if getattr(user, 'is_superuser', False):
            return True
        return getattr(user, 'role', None) in cls.SUPERVISOR_ROLES

    @staticmethod
    def _patient_name(patient) -> str:
        if not patient:
            return 'Patient'
        return f"{patient.first_name} {patient.last_name}".strip()

    @staticmethod
    def _age_sex(patient) -> str:
        if not patient:
            return ''
        age = ''
        try:
            from datetime import date
            dob = date.fromisoformat(str(patient.date_of_birth)[:10])
            today = timezone.localdate()
            age = str(today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day)))
        except (ValueError, TypeError):
            age = ''
        sex = (patient.gender or 'O')[:1].upper()
        return f"{age}{sex}" if age else sex

    @staticmethod
    def _active_admission(patient):
        if not patient:
            return None
        return InpatientAdmission.objects.filter(patient=patient, status='ADMITTED').first()

    @classmethod
    def _resolve_discount(cls, gross: Decimal, discount_amount=None, discount_percent=None):
        gross = cls._money(gross)
        amount = cls._money(discount_amount) if discount_amount not in (None, '') else Decimal('0.00')
        if amount == Decimal('0.00') and discount_percent not in (None, ''):
            amount = cls._money(gross * Decimal(str(discount_percent)) / Decimal('100.00'))
        pct = (amount / gross * Decimal('100.00')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP) if gross > 0 else Decimal('0.00')
        return amount, pct

    # ---------- discount guard ----------
    @classmethod
    def evaluate_discount_guard(
        cls, user, gross, discount_amount=None, discount_percent=None,
        approval_request_id=None, patient=None, invoice=None, assisted: bool = False
    ) -> dict:
        gross = cls._money(gross)
        amount, pct = cls._resolve_discount(gross, discount_amount, discount_percent)
        result = {
            'gross': float(gross),
            'discount_amount': float(amount),
            'discount_percent': float(pct),
            'ceiling_percent': float(cls.CASHIER_DISCOUNT_CEILING_PERCENT),
            'allowed': False,
            'requires_approval': False,
            'approved_by': None,
            'approval_request_id': None,
            'reason': ''
        }

        if amount <= Decimal('0.00'):
            result.update(allowed=True, reason='No discount applied.')
            return result
        if amount > gross:
            result.update(reason='Discount cannot exceed the bill gross amount.')
            return result
        if pct <= cls.CASHIER_DISCOUNT_CEILING_PERCENT:
            result.update(allowed=True, reason=f'Within cashier self-authorised ceiling of {cls.CASHIER_DISCOUNT_CEILING_PERCENT}%.')
            return result
        tier = SupervisorGovernanceService.tier(user)
        if tier == 'ADMIN':
            result.update(allowed=True, approved_by=user, reason='Applied directly by billing admin.')
            return result
        # Phase 5: a supervisor applies directly only within their limit and never while assisting another
        # cashier's counter (counter mode) - there the request routes to Billing Admin instead.
        if tier == 'SUPERVISOR' and not assisted and SupervisorGovernanceService.discount_within_limit(pct, amount):
            result.update(allowed=True, approved_by=user, reason='Applied directly by billing supervisor within limit.')
            return result

        if approval_request_id:
            req = SupervisorApprovalRequest.objects.select_related('approved_by').filter(
                id=approval_request_id,
                request_type=ApprovalRequestType.DISCOUNT,
                status=ApprovalStatus.APPROVED
            ).first()
            patient_ok = req is not None and (patient is None or req.patient_id == patient.id)
            # Single use: an approval may only be consumed by one invoice
            unused_ok = req is not None and (req.invoice_id is None or (invoice is not None and req.invoice_id == invoice.id))
            within_ok = req is not None and (pct <= req.discount_percent or amount <= req.discount_amount)
            if patient_ok and unused_ok and within_ok:
                result.update(
                    allowed=True,
                    approved_by=req.approved_by,
                    approval_request_id=str(req.id),
                    reason=f'Approved by supervisor under {req.request_number}.'
                )
                return result

        result.update(
            requires_approval=True,
            reason=f'Discount of {pct}% exceeds the cashier ceiling of {cls.CASHIER_DISCOUNT_CEILING_PERCENT}%. Supervisor approval required.'
        )
        return result

    @classmethod
    def enforce_discount_guard(cls, user, gross, discount_amount=None, discount_percent=None,
                               approval_request_id=None, patient=None, invoice=None, assisted: bool = False) -> dict:
        guard = cls.evaluate_discount_guard(
            user, gross, discount_amount, discount_percent, approval_request_id, patient, invoice, assisted=assisted
        )
        if guard['requires_approval']:
            raise DiscountApprovalRequired('Supervisor Approval Required', guard)
        if not guard['allowed']:
            raise ValueError(guard['reason'])
        return guard

    @classmethod
    def request_discount_approval(cls, requested_by, patient, bill_gross, discount_percent=None,
                                  discount_amount=None, reason: str = '', notes: str = '',
                                  invoice=None, shift=None) -> SupervisorApprovalRequest:
        if not reason:
            raise ValueError('A reason is required when requesting a discount approval.')
        gross = cls._money(bill_gross)
        amount, pct = cls._resolve_discount(gross, discount_amount, discount_percent)
        if amount <= Decimal('0.00'):
            raise ValueError('Requested discount must be greater than zero.')
        if amount > gross:
            raise ValueError('Requested discount cannot exceed the bill gross amount.')

        with transaction.atomic():
            req = SupervisorApprovalRequest.objects.create(
                request_number=next_sequence_number(SupervisorApprovalRequest, 'request_number', 'APR'),
                request_type=ApprovalRequestType.DISCOUNT,
                invoice=invoice,
                patient=patient or (invoice.patient if invoice else None),
                discount_percent=pct,
                discount_amount=amount,
                requested_discount_percent=pct,
                requested_amount=amount,
                bill_gross=gross,
                reason=reason,
                notes=notes or '',
                requested_by=requested_by,
                **SupervisorGovernanceService.request_context(requested_by, shift)
            )
            if pct > SupervisorGovernanceService.DISCOUNT_LIMIT_PERCENT:
                SupervisorGovernanceService.audit(
                    AuditEventType.DISCOUNT_REQUESTED, f'Discount above {SupervisorGovernanceService.DISCOUNT_LIMIT_PERCENT:.0f}% requested',
                    f"{pct}% on ₹{gross:,.2f} · {reason}", AuditSeverity.MEDIUM, requested_by, req.shift, req.request_number
                )
            SupervisorGovernanceService.route_new_request(req)
            return req

    @classmethod
    def decide_approval(cls, request_id, supervisor, approve: bool, rejection_reason: str = '') -> SupervisorApprovalRequest:
        return SupervisorGovernanceService.decide_approval(
            request_id, supervisor, 'APPROVE' if approve else 'REJECT', note=rejection_reason
        )

    # ---------- tender maths ----------
    @classmethod
    def validate_tender_split(cls, total, splits: list) -> dict:
        total = cls._money(total)
        allocated = Decimal('0.00')
        by_tender = {}
        errors = []
        valid_modes = set(TenderMode.values)
        for idx, split in enumerate(splits or []):
            mode = str(split.get('tender_mode') or split.get('payment_method') or 'CASH').upper()
            amount = cls._money(split.get('amount'))
            if mode not in valid_modes:
                errors.append(f'Line {idx + 1}: unsupported tender "{mode}".')
            if amount < Decimal('0.00'):
                errors.append(f'Line {idx + 1}: amount cannot be negative.')
            allocated += amount
            by_tender[mode] = float(cls._money(by_tender.get(mode, 0)) + amount)
        difference = total - allocated
        return {
            'total': float(total),
            'allocated': float(allocated),
            'difference': float(difference),
            'is_balanced': difference == Decimal('0.00') and not errors,
            'is_over_allocated': difference < Decimal('0.00'),
            'by_tender': by_tender,
            'errors': errors
        }

    @classmethod
    def calculate_cash_change(cls, amount_due, cash_received) -> dict:
        due = cls._money(amount_due)
        received = cls._money(cash_received)
        if received < due:
            return {
                'amount_due': float(due),
                'cash_received': float(received),
                'sufficient': False,
                'shortfall': float(due - received),
                'change_due': 0.0,
                'rounded_change': 0,
                'denominations': []
            }
        change = received - due
        remaining = int(change.to_integral_value(rounding=ROUND_HALF_UP))
        rounded = remaining
        breakdown = []
        for note in cls.INR_DENOMINATIONS:
            count, remaining = divmod(remaining, note)
            if count:
                breakdown.append({'denomination': note, 'count': count, 'kind': 'NOTE' if note >= 10 else 'COIN'})
        return {
            'amount_due': float(due),
            'cash_received': float(received),
            'sufficient': True,
            'shortfall': 0.0,
            'change_due': float(change),
            'rounded_change': rounded,
            'denominations': breakdown
        }

    # ---------- clinical unlock events ----------
    @classmethod
    def emit_clinical_unlocks(cls, invoice) -> list:
        """On settlement, mark the originating department charge events and report the clinical actions unlocked."""
        charge_ids = list(BillableChargeItem.objects.filter(invoice=invoice).values_list('id', flat=True))
        if not charge_ids:
            return []
        events = DepartmentChargeEvent.objects.filter(charge_item_id__in=charge_ids)
        events.filter(status=DepartmentChargeEventStatus.QUEUED).update(status=DepartmentChargeEventStatus.INVOICED)
        if invoice.status not in cls.SETTLED_STATUSES:
            return []

        unlocks, seen = [], set()
        now_iso = timezone.now().isoformat()
        for ev in events:
            key = (ev.source_department, ev.encounter_id)
            meta = dict(ev.metadata or {})
            meta.update({'clinical_unlocked': True, 'unlocked_at': now_iso, 'unlocked_by_invoice': invoice.invoice_number})
            ev.metadata = meta
            ev.save(update_fields=['metadata', 'updated_at'])
            if key in seen:
                continue
            seen.add(key)

            dept = ev.source_department
            if dept == 'LAB':
                action = GatingAction.LAB_SAMPLE_COLLECTION
                message = f"Lab order {meta.get('order_number') or ev.encounter_id} cleared for sample collection & barcode label printing."
            elif dept == 'OPD':
                action = GatingAction.CONSULTATION_ENTRY
                message = f"Consultation token #{meta.get('token_number', '-')} ({meta.get('doctor', 'doctor')}) is ready for consultation."
            elif dept == 'PHARMACY':
                action = GatingAction.PHARMACY_MEDICINE_RELEASE
                message = f"Pharmacy order {meta.get('order_number') or ev.encounter_id} cleared for medicine release."
                cls._mark_pharmacy_order_paid(ev.encounter_id, invoice)
            else:
                action = None
                message = f"{dept} encounter {ev.encounter_id} settled."
            unlocks.append({
                'department': dept,
                'gating_action': action,
                'encounter_id': ev.encounter_id,
                'message': message
            })
        return unlocks

    @staticmethod
    def _mark_pharmacy_order_paid(order_id, invoice):
        """Mirror a Billing settlement onto the pharmacy dispense order (Billing stays the payment system of record)."""
        from apps.pharmacy.models import PharmacyDispenseOrder, DispensePaymentStatus
        order = PharmacyDispenseOrder.objects.filter(id=order_id).first()
        if not order or order.payment_status == DispensePaymentStatus.PAID:
            return
        order.payment_status = DispensePaymentStatus.PAID
        order.payment_reference = invoice.invoice_number
        order.billing_invoice = invoice
        order.save(update_fields=['payment_status', 'payment_reference', 'billing_invoice', 'updated_at'])

    # ---------- dashboard ----------
    @classmethod
    def get_dashboard(cls, cashier=None, counter_code: str = None) -> dict:
        today = timezone.localdate()
        is_cashier = cashier is not None and getattr(cashier, 'is_authenticated', False)
        shift_summary = CounterClosingService.get_active_shift_summary(
            cashier=cashier if is_cashier else None, counter_code=counter_code
        )

        invoices_today = Invoice.objects.filter(created_at__date=today).exclude(
            status__in=[InvoiceStatus.CANCELLED, InvoiceStatus.DRAFT]
        )
        payments_today = Payment.objects.filter(payment_date__date=today, payment_status='SUCCESS')
        collections = {}
        for p in payments_today:
            collections[p.tender_mode] = collections.get(p.tender_mode, Decimal('0.00')) + p.amount
        collected_total = sum(collections.values(), Decimal('0.00'))

        pending = BillableChargeItem.objects.filter(status=ChargeItemStatus.PENDING)
        pending_patients = pending.values('patient_id').distinct().count()
        stat_patients = pending.filter(priority='STAT').values('patient_id').distinct().count()
        pending_amount = sum(pending.values_list('total_amount', flat=True), Decimal('0.00'))
        oldest = pending.order_by('created_at').first()
        oldest_wait = int((timezone.now() - oldest.created_at).total_seconds() // 60) if oldest else 0

        unpaid_invoices = Invoice.objects.filter(status__in=[InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID])
        unpaid_balance = sum(unpaid_invoices.values_list('balance', flat=True), Decimal('0.00'))

        # Turnaround: first charge staged (or invoice raised) -> final payment, for invoices settled today
        turnarounds = []
        settled = invoices_today.filter(status=InvoiceStatus.PAID).prefetch_related('payments')[:200]
        for inv in settled:
            last_pay = max((p.payment_date for p in inv.payments.all()), default=None)
            if not last_pay:
                continue
            first_charge = BillableChargeItem.objects.filter(invoice=inv).order_by('created_at').first()
            start = first_charge.created_at if first_charge else inv.created_at
            turnarounds.append(max(0.0, (last_pay - start).total_seconds() / 60.0))
        avg_tat = round(sum(turnarounds) / len(turnarounds), 1) if turnarounds else 0.0
        within_sla = round(100.0 * len([t for t in turnarounds if t <= cls.TURNAROUND_SLA_MINUTES]) / len(turnarounds), 1) if turnarounds else 100.0

        approvals = SupervisorApprovalRequest.objects.filter(status=ApprovalStatus.PENDING)
        if is_cashier and not cls.is_supervisor(cashier):
            approvals = approvals.filter(requested_by=cashier)

        return {
            'date': today.isoformat(),
            'kpis': {
                'invoices_today': invoices_today.count(),
                'invoices_paid_today': invoices_today.filter(status=InvoiceStatus.PAID).count(),
                'collected_today': float(collected_total),
                'pending_queue_patients': pending_patients,
                'pending_queue_stat': stat_patients,
                'pending_queue_amount': float(pending_amount),
                'oldest_wait_minutes': oldest_wait,
                'unpaid_invoices': unpaid_invoices.count(),
                'unpaid_balance': float(unpaid_balance),
                'avg_turnaround_minutes': avg_tat,
                'turnaround_sla_minutes': cls.TURNAROUND_SLA_MINUTES,
                'within_sla_percent': within_sla,
                'pending_approvals': approvals.count()
            },
            'collections_by_tender': {k: float(v) for k, v in collections.items()},
            'shift': shift_summary
        }

    # ---------- live queue ----------
    @classmethod
    def get_live_queue(cls, department: str = None, search: str = None, urgency: str = None) -> dict:
        base = BillableChargeItem.objects.filter(status=ChargeItemStatus.PENDING).select_related('patient')
        if search:
            base = base.filter(
                models.Q(patient__first_name__icontains=search) |
                models.Q(patient__last_name__icontains=search) |
                models.Q(patient__uhid__icontains=search) |
                models.Q(patient__phone_number__icontains=search) |
                models.Q(service_name__icontains=search) |
                models.Q(source_reference_id__icontains=search)
            )
        if urgency:
            base = base.filter(priority__iexact=urgency)

        dept_counts = {'ALL': base.values('patient_id').distinct().count()}
        for row in base.values('department').annotate(n=models.Count('patient_id', distinct=True)):
            dept_counts[row['department']] = row['n']

        qs = base
        if department and department.upper() != 'ALL':
            qs = qs.filter(department=department.upper())

        charges = list(qs.order_by('created_at'))
        events = {
            str(e.charge_item_id): e for e in DepartmentChargeEvent.objects.filter(
                charge_item_id__in=[c.id for c in charges]
            )
        }
        now = timezone.now()
        groups = {}
        for c in charges:
            g = groups.get(c.patient_id)
            if g is None:
                admission = cls._active_admission(c.patient)
                g = groups[c.patient_id] = {
                    'patient_id': str(c.patient_id),
                    'patient_name': cls._patient_name(c.patient),
                    'uhid': c.patient.uhid if c.patient else '',
                    'mobile': c.patient.phone_number if c.patient else '',
                    'age_sex': cls._age_sex(c.patient),
                    'payer_type': 'IPD' if admission else 'SELF',
                    'payer_label': f"IPD Running Bill · {admission.admission_number}" if admission else 'Self Pay',
                    'sources': [],
                    'is_stat': False,
                    'token': None,
                    'charge_ids': [],
                    'services': [],
                    'items_count': 0,
                    'amount': Decimal('0.00'),
                    'first_staged_at': c.created_at
                }
            ev = events.get(str(c.id))
            meta = ev.metadata if ev else {}
            if not g['token']:
                if c.department == 'OPD' and meta.get('token_number'):
                    g['token'] = f"OPD-{str(meta['token_number']).zfill(3)}"
                elif meta.get('token_slip_number'):
                    g['token'] = meta['token_slip_number']
                elif meta.get('order_number'):
                    g['token'] = meta['order_number']
            if c.department not in g['sources']:
                g['sources'].append(c.department)
            g['is_stat'] = g['is_stat'] or c.priority == 'STAT'
            g['charge_ids'].append(str(c.id))
            g['services'].append(c.service_name)
            g['items_count'] += 1
            g['amount'] += c.total_amount

        rows = []
        for seq, g in enumerate(groups.values(), start=1):
            wait = int((now - g.pop('first_staged_at')).total_seconds() // 60)
            g['token'] = g['token'] or f"Q-{str(seq).zfill(3)}"
            g['wait_minutes'] = wait
            g['summary'] = ', '.join(g.pop('services')[:3])
            g['amount'] = float(g['amount'])
            g['status'] = 'AWAITING_BILL'
            rows.append(g)

        # Parked drafts stay visible in the queue until they are collected or discarded
        drafts = Invoice.objects.filter(status=InvoiceStatus.DRAFT).select_related('patient').prefetch_related('items')
        if search:
            drafts = drafts.filter(
                models.Q(patient__first_name__icontains=search) |
                models.Q(patient__last_name__icontains=search) |
                models.Q(patient__uhid__icontains=search) |
                models.Q(patient__phone_number__icontains=search) |
                models.Q(invoice_number__icontains=search)
            )
        draft_rows = []
        for inv in drafts:
            items = list(inv.items.all())
            sources = list(dict.fromkeys(it.department for it in items if it.department))
            if department and department.upper() != 'ALL' and department.upper() not in sources:
                continue
            if urgency and urgency.upper() == 'STAT':
                continue
            admission = cls._active_admission(inv.patient)
            draft_rows.append({
                'patient_id': str(inv.patient_id),
                'patient_name': cls._patient_name(inv.patient),
                'uhid': inv.patient.uhid,
                'mobile': inv.patient.phone_number,
                'age_sex': cls._age_sex(inv.patient),
                'payer_type': 'IPD' if admission else 'SELF',
                'payer_label': f"IPD Running Bill · {admission.admission_number}" if admission else 'Self Pay',
                'sources': sources,
                'is_stat': False,
                'token': inv.invoice_number,
                'charge_ids': [],
                'items_count': len(items),
                'amount': float(inv.total),
                'wait_minutes': int((now - inv.created_at).total_seconds() // 60),
                'summary': ', '.join(it.description for it in items[:3]),
                'status': 'DRAFT',
                'draft_id': str(inv.id)
            })
        rows.extend(draft_rows)
        rows.sort(key=lambda r: (not r['is_stat'], -r['wait_minutes']))

        return {
            'rows': rows,
            'total_patients': len(rows),
            'total_amount': float(sum(Decimal(str(r['amount'])) for r in rows)),
            'stat_count': len([r for r in rows if r['is_stat']]),
            'draft_count': len(draft_rows),
            'department_counts': dept_counts
        }

    # ---------- patient 360 workspace ----------
    @classmethod
    def get_patient_workspace(cls, uhid_or_id: str) -> dict:
        patient = Patient.objects.filter(uhid__iexact=str(uhid_or_id)).first()
        if not patient:
            try:
                import uuid as _uuid
                _uuid.UUID(str(uhid_or_id))
                patient = Patient.objects.filter(id=uhid_or_id).first()
            except (ValueError, TypeError):
                patient = None
        if not patient:
            raise ValueError(f"Patient '{uhid_or_id}' not found.")

        admission = cls._active_admission(patient)
        pending = BillableChargeItem.objects.filter(patient=patient, status=ChargeItemStatus.PENDING).order_by('created_at')
        unbilled = [{
            'id': str(c.id),
            'department': c.department,
            'service_code': c.service_code,
            'service_name': c.service_name,
            'quantity': c.quantity,
            'unit_price': float(c.unit_price),
            'discount_amount': float(c.discount_amount),
            'tax_amount': float(c.tax_amount),
            'total_amount': float(c.total_amount),
            'priority': c.priority,
            'source_reference_id': c.source_reference_id,
            'created_at': c.created_at.isoformat()
        } for c in pending]
        unbilled_total = sum((c.total_amount for c in pending), Decimal('0.00'))

        invoices = Invoice.objects.filter(patient=patient).exclude(status=InvoiceStatus.CANCELLED).prefetch_related('items').order_by('-created_at')
        open_invoices, history, drafts = [], [], []
        for inv in invoices[:25]:
            row = {
                'id': str(inv.id),
                'invoice_number': inv.invoice_number,
                'date': inv.date,
                'category': inv.category,
                'total': float(inv.total),
                'paid': float(inv.paid),
                'balance': float(inv.balance),
                'status': inv.status,
                'summary': ', '.join([it.description for it in inv.items.all()[:2]])
            }
            if inv.status == InvoiceStatus.DRAFT:
                row['discount'] = float(inv.discount)
                row['items'] = [{
                    'description': it.description, 'department': it.department, 'qty': it.qty,
                    'unit_price': float(it.unit_price), 'tax_amount': float(it.tax_amount), 'total': float(it.total)
                } for it in inv.items.all()]
                drafts.append(row)
            elif inv.status in (InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID):
                open_invoices.append(row)
            else:
                history.append(row)

        deposits = PatientDeposit.objects.filter(patient=patient, status__in=['ACTIVE', 'PARTIALLY_UTILIZED'])
        deposit_balance = sum((d.available_balance for d in deposits), Decimal('0.00'))
        approvals = SupervisorApprovalRequest.objects.filter(patient=patient).order_by('-created_at')[:10]

        return {
            'patient': {
                'id': str(patient.id),
                'uhid': patient.uhid,
                'name': cls._patient_name(patient),
                'age_sex': cls._age_sex(patient),
                'mobile': patient.phone_number,
                'email': patient.email,
                'allergies': patient.allergies or []
            },
            'encounter': {
                'type': 'IPD' if admission else 'OPD',
                'admission_number': admission.admission_number if admission else None,
                'ward': admission.ward_name if admission else None
            },
            'coverage': {
                'payer_type': 'IPD' if admission else 'SELF',
                'payer_label': 'IPD Running Bill' if admission else 'Self Pay',
                'eligible_schemes': ['Senior Citizen · 5%', 'Staff Family · 5%'],
                'cashier_discount_ceiling_percent': float(cls.CASHIER_DISCOUNT_CEILING_PERCENT)
            },
            'unbilled_charges': unbilled,
            'unbilled_total': float(unbilled_total),
            'open_invoices': open_invoices,
            'draft_invoices': drafts,
            'invoice_history': history,
            'deposit_balance': float(deposit_balance),
            'approval_requests': [{
                'id': str(a.id),
                'request_number': a.request_number,
                'status': a.status,
                'discount_percent': float(a.discount_percent),
                'discount_amount': float(a.discount_amount),
                'reason': a.reason,
                'consumed': a.invoice_id is not None,
                'created_at': a.created_at.isoformat()
            } for a in approvals]
        }

    # ---------- bill & collect ----------
    @classmethod
    def consolidate_with_guard(cls, cashier, patient, charge_ids: list, discount_amount=None,
                               discount_percent=None, discount_reason: str = '', approval_request_id=None,
                               counter=None, shift=None, category=None, encounter_type='OPD') -> Invoice:
        charges = list(BillableChargeItem.objects.filter(id__in=charge_ids, patient=patient, status=ChargeItemStatus.PENDING))
        gross = sum((c.unit_price * c.quantity for c in charges), Decimal('0.00'))
        assisted = shift is not None and getattr(cashier, 'id', None) is not None and shift.cashier_id != cashier.id
        guard = cls.enforce_discount_guard(
            cashier, gross, discount_amount, discount_percent, approval_request_id, patient, assisted=assisted
        )
        with transaction.atomic():
            invoice = BillingCoreService.consolidate_charges_to_invoice(
                patient=patient,
                charge_ids=charge_ids,
                cashier=cashier if getattr(cashier, 'is_authenticated', False) else None,
                counter=counter,
                shift=shift,
                discount=Decimal(str(guard['discount_amount'])),
                discount_reason=discount_reason,
                category=category,
                encounter_type=encounter_type
            )
            cls._stamp_discount_approval(invoice, guard)
        return invoice

    @staticmethod
    def _stamp_discount_approval(invoice, guard: dict):
        changed = False
        if guard.get('approved_by') is not None and guard.get('discount_amount', 0) > 0:
            invoice.discount_approved_by = guard['approved_by']
            changed = True
        if changed:
            invoice.save(update_fields=['discount_approved_by', 'updated_at'])
        if guard.get('approval_request_id'):
            SupervisorApprovalRequest.objects.filter(id=guard['approval_request_id']).update(invoice=invoice)

    @classmethod
    def quick_walkin_settlement(cls, cashier, items: list, split_payments: list, patient=None,
                                patient_data: dict = None, discount_amount=None, discount_percent=None,
                                discount_reason: str = '', approval_request_id=None,
                                counter_code: str = None, shift=None) -> dict:
        TariffGovernanceService.sync_due_versions()
        if not items:
            raise ValueError('At least one tariff item is required for a walk-in bill.')

        # Tariff integrity: prices are always resolved from TariffMaster, never from the client
        resolved = []
        for raw in items:
            code = raw.get('service_code') or raw.get('code') or raw.get('tariff_code')
            tariff = TariffMaster.objects.filter(code=code, is_active=True).first()
            if not tariff:
                raise ValueError(f"Tariff '{code}' not found or inactive.")
            qty = max(1, int(raw.get('qty') or raw.get('quantity') or 1))
            resolved.append((tariff, qty))

        with transaction.atomic():
            if patient is None:
                pd = patient_data or {}
                uhid = (pd.get('uhid') or '').strip()
                patient = Patient.objects.filter(uhid__iexact=uhid).first() if uhid else None
                if patient is None:
                    full_name = (pd.get('name') or pd.get('patient_name') or 'Walk-in Guest').strip()
                    first, _, last = full_name.partition(' ')
                    patient = Patient.objects.create(
                        uhid=uhid or Patient.generate_uhid(),
                        first_name=first or 'Walk-in',
                        last_name=last or 'Guest',
                        date_of_birth=pd.get('date_of_birth') or '1990-01-01',
                        gender=(pd.get('gender') or 'OTHER').upper(),
                        phone_number=pd.get('phone') or pd.get('mobile') or '0000000000'
                    )

            ref = f"WALKIN-{timezone.now().strftime('%Y%m%d%H%M%S')}"
            charge_ids = [cls._charge_from_tariff(patient, tariff, qty, ref).id for tariff, qty in resolved]

            # Phase 4: the caller passes the cashier's own guarded shift; counter_code is informational only
            counter = shift.counter if shift else None
            invoice = cls.consolidate_with_guard(
                cashier, patient, charge_ids,
                discount_amount=discount_amount, discount_percent=discount_percent,
                discount_reason=discount_reason, approval_request_id=approval_request_id,
                counter=counter, shift=shift, category='GENERAL', encounter_type='OPD'
            )

            if not split_payments:
                split_payments = [{'tender_mode': 'CASH', 'amount': float(invoice.total)}]
            split_check = cls.validate_tender_split(invoice.balance, split_payments)
            if split_check['errors']:
                raise ValueError(' '.join(split_check['errors']))
            if split_check['is_over_allocated']:
                raise ValueError('Tender allocation exceeds the bill amount.')

            payment_result = BillingCoreService.process_multi_tender_payment(
                invoice_id=str(invoice.id),
                cashier=cashier if getattr(cashier, 'is_authenticated', False) else None,
                split_payments=split_payments,
                counter=counter,
                shift=shift
            )
        return {'patient': patient, 'invoice': payment_result['invoice'], 'payment_result': payment_result}

    # ---------- counter-added services (tariff-priced) ----------
    COUNTER_REF_PREFIX = 'COUNTER-'

    @classmethod
    def _charge_from_tariff(cls, patient, tariff, qty: int, source_reference_id: str) -> BillableChargeItem:
        """Stage a PENDING charge priced strictly from TariffMaster (never from the client)."""
        unit_price = cls._money(tariff.base_price)
        line_base = unit_price * qty
        tax_rate = Decimal(str(tariff.gst_rate))
        tax_amount = cls._money(line_base * tax_rate / Decimal('100.00'))
        return BillableChargeItem.objects.create(
            patient=patient,
            department=tariff.department or 'GENERAL',
            service_code=tariff.code,
            service_name=tariff.name,
            unit_price=unit_price,
            quantity=qty,
            discount_amount=Decimal('0.00'),
            tax_rate=tax_rate,
            tax_amount=tax_amount,
            total_amount=line_base + tax_amount,
            source_reference_id=source_reference_id,
            status=ChargeItemStatus.PENDING
        )

    @classmethod
    def add_counter_service(cls, cashier, patient, service_code: str, qty=1) -> BillableChargeItem:
        TariffGovernanceService.sync_due_versions()
        tariff = TariffMaster.objects.filter(code=service_code, is_active=True).first()
        if not tariff:
            raise ValueError(f"Tariff '{service_code}' not found or inactive.")
        try:
            qty = int(qty)
        except (TypeError, ValueError):
            raise ValueError('Quantity must be a whole number.')
        if qty < 1 or qty > 99:
            raise ValueError('Quantity must be between 1 and 99.')
        user_tag = getattr(cashier, 'username', None) or 'counter'
        ref = f"{cls.COUNTER_REF_PREFIX}{timezone.now().strftime('%Y%m%d%H%M%S')}-{user_tag}"[:100]
        return cls._charge_from_tariff(patient, tariff, qty, ref)

    @classmethod
    def remove_counter_service(cls, charge_id) -> BillableChargeItem:
        """Only lines the cashier added at the counter, and only while still unbilled, may be removed."""
        with transaction.atomic():
            charge = BillableChargeItem.objects.select_for_update().filter(id=charge_id).first()
            if not charge:
                raise ValueError('Charge not found.')
            if not (charge.source_reference_id or '').startswith(cls.COUNTER_REF_PREFIX):
                raise PermissionError('Clinical department charges cannot be removed at the counter.')
            if charge.status != ChargeItemStatus.PENDING:
                raise ValueError('Only unbilled charges can be removed.')
            charge.status = ChargeItemStatus.CANCELLED
            charge.save(update_fields=['status', 'updated_at'])
            return charge

    # ---------- draft invoices ----------
    @classmethod
    def save_draft(cls, cashier, patient, charge_ids: list, discount_amount=None, discount_percent=None,
                   discount_reason: str = '', approval_request_id=None, counter=None, shift=None,
                   encounter_type='OPD') -> Invoice:
        """Park selected charges on the patient's account as a non-fiscal DRAFT (discount guard still applies)."""
        with transaction.atomic():
            invoice = cls.consolidate_with_guard(
                cashier, patient, charge_ids,
                discount_amount=discount_amount, discount_percent=discount_percent,
                discount_reason=discount_reason, approval_request_id=approval_request_id,
                counter=counter, shift=shift, encounter_type=encounter_type
            )
            invoice.invoice_number = next_document_number('DRF')
            invoice.token_slip_number = None
            invoice.status = InvoiceStatus.DRAFT
            invoice.save(update_fields=['invoice_number', 'token_slip_number', 'status', 'updated_at'])
        return invoice

    @classmethod
    def _locked_draft(cls, draft_id) -> Invoice:
        invoice = Invoice.objects.select_for_update().filter(id=draft_id).first()
        if not invoice:
            raise ValueError('Draft not found.')
        if invoice.status != InvoiceStatus.DRAFT:
            raise ValueError(f'{invoice.invoice_number} is not a draft (status {invoice.status}).')
        return invoice

    @classmethod
    def discard_draft(cls, draft_id) -> int:
        """Return a draft's charges to the unbilled queue. Drafts are not fiscal documents, so they are removed."""
        with transaction.atomic():
            invoice = cls._locked_draft(draft_id)
            released = BillableChargeItem.objects.filter(invoice=invoice).update(
                status=ChargeItemStatus.PENDING, invoice=None
            )
            # Keep any discount approval: it becomes reusable instead of being cascade-deleted with the draft.
            SupervisorApprovalRequest.objects.filter(invoice=invoice).update(invoice=None)
            invoice.delete()
            return released

    @classmethod
    def collect_draft(cls, cashier, draft_id, split_payments: list, counter=None, shift=None) -> dict:
        """Finalise a draft into a fiscal invoice (INV- number) and settle it atomically."""
        with transaction.atomic():
            invoice = cls._locked_draft(draft_id)
            if split_payments:
                check = cls.validate_tender_split(invoice.balance, split_payments)
                if check['errors'] or check['is_over_allocated']:
                    raise ValueError(' '.join(check['errors']) or 'Tender allocation exceeds the bill amount.')
            invoice.invoice_number = next_document_number('INV')
            invoice.token_slip_number = f"TKN-{invoice.invoice_number[-4:]}"
            invoice.status = InvoiceStatus.PAID if invoice.total == Decimal('0.00') else InvoiceStatus.UNPAID
            invoice.counter = counter or invoice.counter
            invoice.shift = shift or invoice.shift
            invoice.save()
            result = None
            if split_payments and invoice.status != InvoiceStatus.PAID:
                result = BillingCoreService.process_multi_tender_payment(
                    invoice_id=str(invoice.id), cashier=cashier, split_payments=split_payments,
                    counter=counter, shift=shift
                )
                invoice = result['invoice']
            return {'invoice': invoice, 'payment_result': result, 'clinical_unlocks': cls.emit_clinical_unlocks(invoice)}


# --- PHASE 5: BILLING SUPERVISOR GOVERNANCE ---

class SupervisorGovernanceService:
    """Phase 5 - approval limits, self-approval block, SLA escalation, refund review, counter mode and audit stream."""
    SUPERVISOR_ROLES = ('BILLING_SUPERVISOR',)
    ADMIN_ROLES = ('BILLING_ADMIN', 'BILLING_MANAGER', 'HOSPITAL_ADMIN', 'SUPER_ADMIN')
    ESCALATION_TIER = 'Billing Admin'
    APPROVAL_SLA_MINUTES = 15
    AUTO_ESCALATE_MINUTES = 60
    REFUND_SLA_MINUTES = 30
    DISCOUNT_LIMIT_PERCENT = Decimal('20.00')
    DISCOUNT_LIMIT_AMOUNT = Decimal('10000.00')
    REFUND_LIMIT_AMOUNT = Decimal('10000.00')
    CREDIT_OVERRIDE_LIMIT_AMOUNT = Decimal('5000.00')
    MIN_NOTE_LENGTH = 5
    TYPE_LABELS = {
        ApprovalRequestType.DISCOUNT: 'Discount',
        ApprovalRequestType.INVOICE_VOID: 'Void',
        ApprovalRequestType.CREDIT_LIMIT_OVERRIDE: 'Corporate override',
        ApprovalRequestType.REFUND: 'Refund',
    }
    POLICY_TEXT = {
        ApprovalRequestType.DISCOUNT: '20% or ₹10,000 per bill',
        ApprovalRequestType.INVOICE_VOID: 'supervisor sign-off on any unpaid invoice',
        ApprovalRequestType.CREDIT_LIMIT_OVERRIDE: '₹5,000 over the MOU limit',
        ApprovalRequestType.REFUND: '₹10,000 per refund',
    }
    OPEN_STATUSES = (ApprovalStatus.PENDING, ApprovalStatus.ESCALATED)

    # ---------- helpers ----------
    @staticmethod
    def _money(value) -> Decimal:
        return Decimal(str(value or '0')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    @staticmethod
    def _name(user) -> str:
        if not user:
            return ''
        return user.get_full_name() or user.username

    @staticmethod
    def _patient_name(patient) -> str:
        return f"{patient.first_name} {patient.last_name}".strip() if patient else ''

    @staticmethod
    def _iso(dt):
        return timezone.localtime(dt).isoformat() if dt else None

    @staticmethod
    def age_minutes(since) -> int:
        return max(0, int((timezone.now() - since).total_seconds() // 60)) if since else 0

    @classmethod
    def tier(cls, user):
        """'ADMIN' (decides escalations, no limits), 'SUPERVISOR' (decides within limits) or None."""
        if not user or not getattr(user, 'is_authenticated', False):
            return None
        if getattr(user, 'is_superuser', False) or getattr(user, 'role', None) in cls.ADMIN_ROLES:
            return 'ADMIN'
        if getattr(user, 'role', None) in cls.SUPERVISOR_ROLES:
            return 'SUPERVISOR'
        return None

    # ---------- limits ----------
    @classmethod
    def discount_within_limit(cls, percent, amount) -> bool:
        return BillingAdminGovernanceService.is_within_tier_limit('SUPERVISOR', 'DISCOUNT', amount=amount, percent=percent)

    @classmethod
    def within_limit(cls, req) -> bool:
        if req.request_type == ApprovalRequestType.DISCOUNT:
            return cls.discount_within_limit(req.discount_percent, req.discount_amount)
        if req.request_type == ApprovalRequestType.CREDIT_LIMIT_OVERRIDE:
            return BillingAdminGovernanceService.is_within_tier_limit('SUPERVISOR', 'CREDIT_DISCHARGE', amount=req.requested_amount, percent=None)
        if req.request_type == ApprovalRequestType.REFUND:
            return BillingAdminGovernanceService.is_within_tier_limit('SUPERVISOR', 'REFUND', amount=req.requested_amount, percent=None)
        if req.request_type == ApprovalRequestType.INVOICE_VOID:
            inv_total = getattr(req.invoice, 'total', None)
            return BillingAdminGovernanceService.is_within_tier_limit('SUPERVISOR', 'VOID', amount=inv_total, percent=None)
        return True

    @classmethod
    def refund_limit_message(cls) -> str:
        return f'Above your refund limit of ₹{cls.REFUND_LIMIT_AMOUNT:,.0f}. Escalate to {cls.ESCALATION_TIER}.'

    @classmethod
    def assert_reviewer(cls, reviewer, requested_by_id, status) -> str:
        tier = cls.tier(reviewer)
        if not tier:
            raise PermissionError('Only a billing supervisor or above can decide this request.')
        if requested_by_id is not None and requested_by_id == reviewer.id:
            raise PermissionError('Four-eyes principle: you cannot approve your own request.')
        if status == ApprovalStatus.ESCALATED and tier != 'ADMIN':
            raise PermissionError(f'Escalated to {cls.ESCALATION_TIER}: only a billing admin can decide it now.')
        return tier

    # ---------- audit ----------
    @staticmethod
    def audit(event_type, title, detail='', severity=AuditSeverity.LOW, actor=None, shift=None, reference='', counter=None):
        return BillingAuditEvent.objects.create(
            event_type=event_type, severity=severity, title=title[:150], detail=(detail or '')[:500],
            counter=counter or (shift.counter if shift else None), shift=shift,
            actor=actor if getattr(actor, 'is_authenticated', False) else None,
            reference=str(reference or '')[:60]
        )

    # ---------- request routing ----------
    @classmethod
    def request_context(cls, user, shift=None) -> dict:
        shift = shift or CounterShiftControlService.get_open_shift(user)
        return {
            'shift': shift,
            'counter': shift.counter if shift else None,
            'sla_expires_at': timezone.now() + timedelta(minutes=cls.APPROVAL_SLA_MINUTES),
        }

    @classmethod
    def route_new_request(cls, req):
        """Self-approval block: a request raised by a supervisor (e.g. in counter mode) skips a level to Billing Admin."""
        if cls.tier(req.requested_by):
            cls._escalate(req, EscalationReason.SELF_RAISED, None)

    @classmethod
    def _escalate(cls, req, reason, by):
        req.status = ApprovalStatus.ESCALATED
        req.escalated_at = timezone.now()
        req.escalation_reason = reason
        req.escalated_by = by
        req.save()
        cls.audit(
            AuditEventType.APPROVAL_ESCALATED,
            f"{cls.TYPE_LABELS.get(req.request_type, 'Request')} escalated to {cls.ESCALATION_TIER}",
            f"{cls._patient_name(req.patient)} · {EscalationReason(reason).label}",
            AuditSeverity.MEDIUM, by, req.shift, req.request_number, counter=req.counter
        )

    @classmethod
    def apply_sla_escalation(cls) -> int:
        """Requests unreviewed past AUTO_ESCALATE_MINUTES move to Billing Admin (run lazily on every queue read)."""
        cutoff = timezone.now() - timedelta(minutes=cls.AUTO_ESCALATE_MINUTES)
        moved = 0
        for req_id in SupervisorApprovalRequest.objects.filter(
            status=ApprovalStatus.PENDING, created_at__lte=cutoff
        ).values_list('id', flat=True):
            with transaction.atomic():
                req = SupervisorApprovalRequest.objects.select_for_update().select_related('patient', 'shift', 'counter').get(id=req_id)
                if req.status == ApprovalStatus.PENDING:
                    cls._escalate(req, EscalationReason.SLA_BREACH, None)
                    moved += 1
        return moved

    # ---------- invoice void ----------
    @classmethod
    def request_void(cls, requested_by, invoice_id, reason: str, notes: str = '', shift=None) -> SupervisorApprovalRequest:
        reason = (reason or '').strip()
        if not reason:
            raise ValueError('A reason is required to void an invoice.')
        with transaction.atomic():
            invoice = Invoice.objects.select_for_update().select_related('patient').get(id=invoice_id)
            if invoice.status == InvoiceStatus.DRAFT:
                raise ValueError('Drafts are not fiscal documents: discard the draft instead of voiding it.')
            if invoice.status != InvoiceStatus.UNPAID or invoice.paid > Decimal('0.00'):
                raise ValueError('Only unpaid invoices can be voided. Refund the collected amount first.')
            open_req = SupervisorApprovalRequest.objects.filter(
                invoice=invoice, request_type=ApprovalRequestType.INVOICE_VOID, status__in=cls.OPEN_STATUSES
            ).first()
            if open_req:
                raise ValueError(f'{open_req.request_number} is already waiting for a decision on this invoice.')
            req = SupervisorApprovalRequest.objects.create(
                request_number=next_sequence_number(SupervisorApprovalRequest, 'request_number', 'APR'),
                request_type=ApprovalRequestType.INVOICE_VOID,
                invoice=invoice, patient=invoice.patient,
                requested_amount=invoice.total, bill_gross=invoice.subtotal,
                reason=reason[:150], notes=notes or '', requested_by=requested_by,
                **cls.request_context(requested_by, shift)
            )
            cls.audit(AuditEventType.VOID_REQUESTED, 'Void requested',
                      f"{invoice.invoice_number} · ₹{invoice.total:,.2f} · {reason}", AuditSeverity.MEDIUM,
                      requested_by, req.shift, req.request_number, counter=req.counter)
            cls.route_new_request(req)
            return req

    @classmethod
    def _apply_void(cls, req, reviewer):
        inv = Invoice.objects.select_for_update().filter(id=req.invoice_id).first()
        if inv is None:
            raise ValueError('The invoice on this request no longer exists.')
        if inv.status != InvoiceStatus.UNPAID or inv.paid > Decimal('0.00'):
            raise ValueError(f'{inv.invoice_number} is {inv.get_status_display().lower()} now; refund collections before voiding.')
        inv.status = InvoiceStatus.CANCELLED
        inv.cancellation_reason = ' — '.join(x for x in [req.reason, req.notes] if x)
        inv.cancelled_by = reviewer
        inv.save()
        released = BillableChargeItem.objects.filter(invoice=inv).update(status=ChargeItemStatus.PENDING, invoice=None)
        cls.audit(AuditEventType.INVOICE_VOIDED, 'Invoice voided',
                  f"{inv.invoice_number} · ₹{inv.total:,.2f} · {released} charge(s) back in the queue",
                  AuditSeverity.MEDIUM, reviewer, req.shift, inv.invoice_number, counter=req.counter)

    # ---------- approval decisions ----------
    @classmethod
    def _apply_discount_approval(cls, req, reviewer, tier, approved_percent):
        requested_pct = req.requested_discount_percent if req.requested_discount_percent is not None else req.discount_percent
        if approved_percent in (None, ''):
            pct, amount = req.discount_percent, req.discount_amount
        else:
            pct = cls._money(approved_percent)
            if pct <= 0:
                raise ValueError('Approved discount must be greater than zero.')
            if pct > requested_pct:
                raise ValueError(f'Cannot approve more than the requested {requested_pct}%.')
            amount = req.discount_amount if pct == requested_pct else cls._money(req.bill_gross * pct / Decimal('100'))
        if tier != 'ADMIN' and not cls.discount_within_limit(pct, amount):
            raise ValueError(
                f"Above your approval limit ({cls.POLICY_TEXT[ApprovalRequestType.DISCOUNT]}). "
                f"System auto-routed request to Billing Manager/Admin."
            )
        req.discount_percent = pct
        req.discount_amount = amount
        inv = req.invoice
        # Apply to an already-raised, untouched invoice
        if inv and inv.status == InvoiceStatus.UNPAID and inv.paid == Decimal('0.00'):
            inv.discount = amount
            inv.total = max(Decimal('0.00'), inv.subtotal - inv.discount + inv.tax - inv.advance_deducted)
            inv.balance = inv.total
            inv.discount_reason = req.reason
            inv.discount_approved_by = reviewer
            inv.save()

    @classmethod
    def decide_approval(cls, request_id, reviewer, action: str, note: str = '', approved_percent=None) -> SupervisorApprovalRequest:
        action = (action or '').upper()
        if action not in ('APPROVE', 'REJECT', 'ESCALATE'):
            raise ValueError("action must be APPROVE, REJECT or ESCALATE.")
        note = (note or '').strip()

        with transaction.atomic():
            req = SupervisorApprovalRequest.objects.select_for_update().select_related(
                'invoice', 'patient', 'shift', 'counter', 'requested_by').get(id=request_id)
            tier = cls.assert_reviewer(reviewer, req.requested_by_id, req.status)
            if req.status not in cls.OPEN_STATUSES:
                raise ValueError(f'Request {req.request_number} has already been {req.status.lower()}.')
            label = cls.TYPE_LABELS.get(req.request_type, 'Request')

            if action == 'ESCALATE':
                if req.status == ApprovalStatus.ESCALATED:
                    raise ValueError(f'{req.request_number} is already with {cls.ESCALATION_TIER}.')
                req.review_notes = note
                reason = EscalationReason.MANUAL if cls.within_limit(req) else EscalationReason.ABOVE_LIMIT
                cls._escalate(req, reason, reviewer)
                return req

            now = timezone.now()
            if action == 'REJECT':
                if len(note) < cls.MIN_NOTE_LENGTH:
                    raise ValueError('A rejection reason is required.')
                req.status = ApprovalStatus.REJECTED
                req.rejection_reason = note
            else:
                if req.request_type == ApprovalRequestType.DISCOUNT:
                    cls._apply_discount_approval(req, reviewer, tier, approved_percent)
                elif req.request_type == ApprovalRequestType.INVOICE_VOID:
                    cls._apply_void(req, reviewer)
                elif tier != 'ADMIN' and not cls.within_limit(req):
                    raise ValueError(f"Above your approval limit ({cls.POLICY_TEXT.get(req.request_type, '')}). Escalate to {cls.ESCALATION_TIER}.")
                req.status = ApprovalStatus.APPROVED
            req.approved_by = reviewer
            req.approved_at = now
            req.review_notes = note
            req.save()

            is_disc = req.request_type == ApprovalRequestType.DISCOUNT
            value = f"{req.discount_percent}% · ₹{req.discount_amount:,.2f}" if is_disc else f"₹{req.requested_amount:,.2f}"
            high = req.status == ApprovalStatus.APPROVED and is_disc and req.discount_percent > Decimal('10')
            cls.audit(AuditEventType.APPROVAL_DECIDED, f"{label} {req.status.lower()}",
                      f"{cls._patient_name(req.patient)} · {value}" + (f" · {note}" if note else ''),
                      AuditSeverity.HIGH if high else AuditSeverity.MEDIUM, reviewer, req.shift, req.request_number,
                      counter=req.counter)
            return req

    # ---------- approval rows ----------
    @classmethod
    def _approval_lines(cls, req) -> list:
        if req.invoice_id:
            return [{'label': it.description, 'amount': float(it.total)} for it in req.invoice.items.all()]
        if req.patient_id:
            charges = BillableChargeItem.objects.filter(patient_id=req.patient_id, status=ChargeItemStatus.PENDING)[:20]
            return [{'label': c.service_name, 'amount': float(c.total_amount)} for c in charges]
        return []

    @classmethod
    def can_decide(cls, reviewer, requested_by_id, status) -> bool:
        tier = cls.tier(reviewer)
        if not tier or reviewer.id == requested_by_id:
            return False
        return status == ApprovalStatus.PENDING or (status == ApprovalStatus.ESCALATED and tier == 'ADMIN')

    @classmethod
    def approval_row(cls, req, reviewer=None) -> dict:
        open_ = req.status in cls.OPEN_STATUSES
        age = cls.age_minutes(req.created_at)
        is_disc = req.request_type == ApprovalRequestType.DISCOUNT
        requested_pct = req.requested_discount_percent if req.requested_discount_percent is not None else req.discount_percent
        assisted_on = cls._name(req.shift.cashier) if req.shift and req.shift.cashier_id != req.requested_by_id else ''
        return {
            'id': str(req.id),
            'request_number': req.request_number,
            'request_type': req.request_type,
            'type_label': cls.TYPE_LABELS.get(req.request_type, req.request_type.title()),
            'status': req.status,
            'escalation_reason': req.escalation_reason or None,
            'escalation_label': EscalationReason(req.escalation_reason).label if req.escalation_reason else None,
            'patient_name': cls._patient_name(req.patient),
            'uhid': req.patient.uhid if req.patient else '',
            'invoice_number': req.invoice.invoice_number if req.invoice_id else None,
            'invoice_label': req.invoice.invoice_number if req.invoice_id else 'Unbilled charges',
            'counter_code': req.counter.code if req.counter_id else None,
            'counter_name': req.counter.name if req.counter_id else 'No counter',
            'requested_by': cls._name(req.requested_by),
            'requested_by_id': str(req.requested_by_id),
            'assisted_on': assisted_on or None,
            'self_raised': bool(cls.tier(req.requested_by)),
            'raised_at': cls._iso(req.created_at),
            'age_minutes': age,
            'sla_minutes': cls.APPROVAL_SLA_MINUTES,
            'sla_breached': open_ and age > cls.APPROVAL_SLA_MINUTES,
            'requested_percent': float(requested_pct or 0),
            'discount_percent': float(req.discount_percent),
            'discount_amount': float(req.discount_amount),
            'bill_gross': float(req.bill_gross),
            'requested_amount': float(req.requested_amount),
            'value': float(req.discount_amount if is_disc else req.requested_amount),
            'reason': req.reason,
            'notes': req.notes,
            'lines': cls._approval_lines(req),
            'within_limit': cls.within_limit(req),
            'policy': cls.POLICY_TEXT.get(req.request_type, ''),
            'can_decide': bool(reviewer) and open_ and cls.can_decide(reviewer, req.requested_by_id, req.status),
            'decided_by': cls._name(req.approved_by) or None,
            'decided_at': cls._iso(req.approved_at),
            'escalated_at': cls._iso(req.escalated_at),
            'review_notes': req.review_notes,
            'rejection_reason': req.rejection_reason,
        }

    @classmethod
    def approvals_queue(cls, reviewer) -> dict:
        cls.apply_sla_escalation()
        base = SupervisorApprovalRequest.objects.select_related(
            'patient', 'invoice', 'counter', 'shift', 'shift__cashier', 'requested_by', 'approved_by'
        ).prefetch_related('invoice__items')
        is_admin = cls.tier(reviewer) == 'ADMIN'
        pending_statuses = list(cls.OPEN_STATUSES) if is_admin else [ApprovalStatus.PENDING]
        pending = [cls.approval_row(r, reviewer) for r in base.filter(status__in=pending_statuses).order_by('created_at')]
        today = timezone.localdate()
        decided_q = models.Q(status__in=[ApprovalStatus.APPROVED, ApprovalStatus.REJECTED], approved_at__date=today)
        if not is_admin:
            decided_q |= models.Q(status=ApprovalStatus.ESCALATED)
        decided = [cls.approval_row(r, reviewer) for r in base.filter(decided_q).order_by('-updated_at')[:100]]
        disc = [r for r in pending if r['request_type'] == ApprovalRequestType.DISCOUNT]
        return {
            'sla_minutes': cls.APPROVAL_SLA_MINUTES,
            'auto_escalate_minutes': cls.AUTO_ESCALATE_MINUTES,
            'reviewer_tier': cls.tier(reviewer),
            'limits': {
                'discount_percent': float(cls.DISCOUNT_LIMIT_PERCENT), 'discount_amount': float(cls.DISCOUNT_LIMIT_AMOUNT),
                'refund_amount': float(cls.REFUND_LIMIT_AMOUNT),
            },
            'kpis': {
                'pending': len(pending),
                'counters': len({r['counter_code'] for r in pending if r['counter_code']}),
                'discounts': len(disc),
                'discount_value': round(sum(r['value'] for r in disc), 2),
                'voids': len([r for r in pending if r['request_type'] == ApprovalRequestType.INVOICE_VOID]),
                'other': len([r for r in pending if r['request_type'] not in (ApprovalRequestType.DISCOUNT, ApprovalRequestType.INVOICE_VOID)]),
                'past_sla': len([r for r in pending if r['sla_breached']]),
            },
            'pending': pending,
            'decided': decided,
        }

    # ---------- refunds ----------
    TENDER_LABELS = {'CASH': 'Cash', 'CARD': 'Card', 'UPI': 'UPI', 'NETBANKING': 'Netbanking', 'CHEQUE': 'Cheque',
                     'DEPOSIT_DEDUCTION': 'Advance deposit'}

    @staticmethod
    def original_tender(invoice, payment=None) -> str:
        if payment is not None:
            return payment.tender_mode
        largest = invoice.payments.filter(payment_status='SUCCESS').order_by('-amount').first()
        return largest.tender_mode if largest else TenderMode.CASH

    @classmethod
    def _delivery_checks(cls, department: str, reference: str, description: str) -> list:
        """Was the refunded service actually delivered? Each check passes only when it clearly was not."""
        if not reference or reference.startswith(('COUNTER-', 'WALKIN-')):
            return [{'label': description or 'Counter service', 'value': 'Counter service · no clinical order to verify', 'ok': True, 'manual': True}]
        try:
            if department == 'LAB':
                from apps.lab.models import LabOrder
                order = LabOrder.objects.filter(id=reference).first()
                if not order:
                    return [{'label': 'Lab order', 'value': 'Order not found', 'ok': False, 'manual': False}]
                cancelled = order.status == 'CANCELLED'
                not_collected = order.status in ('ORDERED', 'CANCELLED')
                return [
                    {'label': 'LIS sample status', 'value': 'Not collected' if not_collected else order.get_status_display(), 'ok': not_collected, 'manual': False},
                    {'label': 'Lab order status', 'value': 'Cancelled' if cancelled else 'Active · not cancelled', 'ok': cancelled, 'manual': False},
                ]
            if department == 'OPD':
                from apps.appointments.models import Appointment
                appt = Appointment.objects.filter(id=reference).first()
                if not appt:
                    return [{'label': 'Appointment', 'value': 'Appointment not found', 'ok': False, 'manual': False}]
                ok = appt.status == 'CANCELLED'
                return [{'label': 'Appointment status', 'value': appt.get_status_display() + ('' if ok else ' · cancel it before refunding'), 'ok': ok, 'manual': False}]
            if department == 'PHARMACY':
                from apps.pharmacy.models import PharmacyDispenseOrder, PharmacyReturn
                order = PharmacyDispenseOrder.objects.filter(id=reference).first()
                if order and order.is_cancelled:
                    return [{'label': 'Dispense order', 'value': 'Cancelled before dispensing', 'ok': True, 'manual': False}]
                ret = PharmacyReturn.objects.filter(original_dispense_order_id=reference).exclude(
                    status__in=['Requested', 'Rejected']).order_by('-created_at').first()
                return [{'label': 'Pharmacy return', 'value': f'{ret.return_number} · {ret.status}' if ret else 'No return received by pharmacy', 'ok': bool(ret), 'manual': False}]
        except (ValueError, DjangoValidationError):
            return [{'label': description or department, 'value': 'Unrecognised order reference', 'ok': False, 'manual': False}]
        return [{'label': description or f'{department.title()} service', 'value': 'No automatic check · confirm with the department', 'ok': True, 'manual': True}]

    @classmethod
    def _refund_items(cls, refund) -> list:
        if refund.refund_items:
            return refund.refund_items
        return [{'invoice_item_id': str(it.id), 'description': it.description, 'department': it.department,
                 'service_code': it.service_code, 'source_reference_id': it.source_reference_id or '', 'amount': float(it.total)}
                for it in refund.invoice.items.all()]

    @classmethod
    def refund_verification(cls, refund) -> list:
        checks, seen = [], set()
        for it in cls._refund_items(refund):
            key = ((it.get('department') or '').upper(), it.get('source_reference_id') or '')
            if key in seen:
                continue
            seen.add(key)
            checks.extend(cls._delivery_checks(key[0], key[1], it.get('description', '')))
        return checks or [{'label': 'Clinical record', 'value': 'No billed lines · confirm manually', 'ok': True, 'manual': True}]

    @classmethod
    def _payment_text(cls, refund, tender) -> str:
        p = refund.payment or refund.invoice.payments.filter(payment_status='SUCCESS', tender_mode=tender).order_by('-amount').first()
        label = cls.TENDER_LABELS.get(tender, tender.title())
        if not p:
            return label
        ref = p.transaction_reference or p.auth_code or ''
        return ' · '.join(x for x in [label, p.payment_number, ref, timezone.localtime(p.payment_date).strftime('%d %b')] if x)

    @classmethod
    def refund_row(cls, refund, reviewer=None) -> dict:
        tender = refund.original_tender or cls.original_tender(refund.invoice, refund.payment)
        open_ = refund.status in (RefundStatus.PENDING, RefundStatus.ESCALATED)
        checks = cls.refund_verification(refund) if refund.status in (RefundStatus.PENDING, RefundStatus.ESCALATED, RefundStatus.APPROVED) else []
        shift = refund.requested_shift
        counter_name = shift.counter.name if shift else 'No counter'
        cashier = cls._name(refund.initiated_by)
        cash = tender == TenderMode.CASH
        age = cls.age_minutes(refund.created_at)
        return {
            'id': str(refund.id),
            'refund_number': refund.refund_number,
            'status': refund.status,
            'patient_name': cls._patient_name(refund.patient),
            'uhid': refund.patient.uhid if refund.patient else '',
            'invoice_number': refund.invoice.invoice_number,
            'amount': float(refund.requested_amount),
            'reason': refund.reason,
            'justification': refund.clinical_justification,
            'requested_by': cashier,
            'counter_name': counter_name,
            'counter_code': shift.counter.code if shift else None,
            'raised_at': cls._iso(refund.created_at),
            'age_minutes': age,
            'sla_breached': open_ and age > cls.REFUND_SLA_MINUTES,
            'lines': [{'label': it.get('description', ''), 'amount': it.get('amount', 0)} for it in cls._refund_items(refund)],
            'original_tender': tender,
            'payment_text': cls._payment_text(refund, tender),
            'route': (f"Cash from the drawer, paid by the cashier against a signed voucher" if cash
                      else f"{cls.TENDER_LABELS.get(tender, tender.title())} reversal to the original instrument · credit note on approval"),
            'checks': checks,
            'verified': all(c['ok'] for c in checks) if checks else None,
            'within_limit': refund.requested_amount <= cls.REFUND_LIMIT_AMOUNT,
            'can_decide': bool(reviewer) and open_ and cls.can_decide(reviewer, refund.initiated_by_id, refund.status),
            'awaiting_cash': refund.status == RefundStatus.APPROVED and cash,
            'decided_by': cls._name(refund.approved_by) or None,
            'decided_at': cls._iso(refund.approved_at),
            'review_notes': refund.review_notes,
            'rejection_reason': refund.rejection_reason,
            'credit_note_number': refund.credit_note_number,
            'disbursed_at': cls._iso(refund.disbursed_at),
        }

    @classmethod
    def refunds_queue(cls, reviewer) -> dict:
        base = RefundRequest.objects.select_related(
            'invoice', 'payment', 'patient', 'initiated_by', 'approved_by', 'requested_shift', 'requested_shift__counter'
        ).prefetch_related('invoice__items', 'invoice__payments')
        is_admin = cls.tier(reviewer) == 'ADMIN'
        pending_statuses = [RefundStatus.PENDING] + ([RefundStatus.ESCALATED] if is_admin else [])
        pending = [cls.refund_row(r, reviewer) for r in base.filter(status__in=pending_statuses).order_by('created_at')]
        today = timezone.localdate()
        decided_q = models.Q(status__in=[RefundStatus.APPROVED, RefundStatus.REJECTED, RefundStatus.DISBURSED], updated_at__date=today)
        decided_q |= models.Q(status=RefundStatus.APPROVED)  # cash still to be paid out, whatever the day
        if not is_admin:
            decided_q |= models.Q(status=RefundStatus.ESCALATED)
        decided = [cls.refund_row(r, reviewer) for r in base.filter(decided_q).order_by('-updated_at')[:100]]
        notes_today = CreditNote.objects.filter(created_at__date=today).select_related('patient', 'refund_request')
        credit_notes = [{
            'credit_note_number': cn.credit_note_number, 'patient_name': cls._patient_name(cn.patient),
            'amount': float(cn.amount), 'tender': (cn.refund_request.disbursed_tender if cn.refund_request else '') or '',
            'issued_at': cls._iso(cn.created_at)
        } for cn in notes_today]
        return {
            'refund_limit': float(cls.REFUND_LIMIT_AMOUNT),
            'reviewer_tier': cls.tier(reviewer),
            'kpis': {
                'pending': len(pending),
                'failed_verification': len([r for r in pending if r['verified'] is False]),
                'value_pending': round(sum(r['amount'] for r in pending), 2),
                'approved_today': len([r for r in decided if r['status'] in (RefundStatus.APPROVED, RefundStatus.DISBURSED)]),
                'awaiting_cash': len([r for r in decided if r['awaiting_cash']]),
                'credit_notes': len(credit_notes),
                'credit_note_value': round(sum(c['amount'] for c in credit_notes), 2),
            },
            'pending': pending,
            'decided': decided,
            'credit_notes': credit_notes,
        }

    @classmethod
    def issue_refund_credit(cls, refund, issued_by, tender: str, shift=None) -> dict:
        """Pay a refund out: credit note, DISBURSED, invoice paid reduced. Caller holds the refund row lock."""
        tender = (tender or 'CASH').upper()
        invoice = Invoice.objects.select_for_update().get(id=refund.invoice_id)
        credit_note = CreditNote.objects.create(
            credit_note_number=next_sequence_number(CreditNote, 'credit_note_number', 'CN'),
            invoice=invoice, refund_request=refund, patient=invoice.patient,
            amount=refund.requested_amount, reason=refund.reason, issued_by=issued_by
        )
        now = timezone.now()
        refund.status = RefundStatus.DISBURSED
        refund.disbursed_at = now
        refund.disbursed_tender = tender
        refund.credit_note_number = credit_note.credit_note_number
        refund.disbursed_shift = shift if tender == 'CASH' else None
        if refund.approved_at is None:
            refund.approved_by, refund.approved_at = issued_by, now
        refund.save()

        invoice.paid = max(Decimal('0.00'), invoice.paid - refund.requested_amount)
        invoice.balance = max(Decimal('0.00'), invoice.total - invoice.paid)
        if invoice.paid <= Decimal('0.00'):
            invoice.status = InvoiceStatus.REFUNDED
        invoice.save()
        return {'refund_request': refund, 'credit_note': credit_note, 'invoice': invoice}

    @classmethod
    def decide_refund(cls, refund_id, reviewer, action: str, note: str = '') -> dict:
        """Approve: cash refunds wait for a cashier to pay from a drawer; card/UPI reverse to the original tender now."""
        action = (action or '').upper()
        if action not in ('APPROVE', 'REJECT', 'ESCALATE'):
            raise ValueError("action must be APPROVE, REJECT or ESCALATE.")
        note = (note or '').strip()
        with transaction.atomic():
            refund = RefundRequest.objects.select_for_update().select_related(
                'invoice', 'payment', 'patient', 'requested_shift', 'requested_shift__counter').get(id=refund_id)
            tier = cls.assert_reviewer(reviewer, refund.initiated_by_id, refund.status)
            if refund.status not in (RefundStatus.PENDING, RefundStatus.ESCALATED):
                raise ValueError(f'Refund {refund.refund_number} has already been {refund.status.lower()}.')
            result = {'refund_request': refund, 'credit_note': None}
            now = timezone.now()
            if action == 'ESCALATE':
                if refund.status == RefundStatus.ESCALATED:
                    raise ValueError(f'{refund.refund_number} is already with {cls.ESCALATION_TIER}.')
                refund.status = RefundStatus.ESCALATED
                refund.escalated_at = now
                refund.escalation_reason = (EscalationReason.ABOVE_LIMIT if refund.requested_amount > cls.REFUND_LIMIT_AMOUNT
                                            else EscalationReason.MANUAL)
                refund.review_notes = note
                refund.save()
            elif action == 'REJECT':
                if len(note) < cls.MIN_NOTE_LENGTH:
                    raise ValueError('A note is required to reject a refund.')
                refund.status = RefundStatus.REJECTED
                refund.approved_by, refund.approved_at = reviewer, now
                refund.rejection_reason = note
                refund.review_notes = note
                refund.save()
            else:
                if not all(c['ok'] for c in cls.refund_verification(refund)):
                    raise ValueError('Verification failed: the service was already delivered. Reject it, or ask the department to cancel first.')
                if tier != 'ADMIN' and refund.requested_amount > cls.REFUND_LIMIT_AMOUNT:
                    raise ValueError(cls.refund_limit_message())
                tender = refund.original_tender or cls.original_tender(refund.invoice, refund.payment)
                refund.original_tender = tender
                refund.approved_by, refund.approved_at = reviewer, now
                refund.review_notes = note
                if tender == TenderMode.CASH:
                    refund.status = RefundStatus.APPROVED
                    refund.save()
                else:
                    result = cls.issue_refund_credit(refund, reviewer, tender)
            word = {'APPROVE': 'approved', 'REJECT': 'rejected', 'ESCALATE': f'escalated to {cls.ESCALATION_TIER}'}[action]
            cls.audit(AuditEventType.REFUND_DECIDED, f'Refund {word}',
                      f"{cls._patient_name(refund.patient)} · ₹{refund.requested_amount:,.2f} · {refund.reason}",
                      AuditSeverity.MEDIUM, reviewer, refund.requested_shift, refund.refund_number)
            return result

    @classmethod
    def pay_cash_refund(cls, refund_id, cashier, shift) -> dict:
        """A cashier pays an approved cash refund out of their (or the assisted) open drawer."""
        if shift is None:
            raise NoActiveShift('Cash refunds are paid from a counter drawer: open your shift first.')
        with transaction.atomic():
            refund = RefundRequest.objects.select_for_update().select_related('patient').get(id=refund_id)
            if refund.status != RefundStatus.APPROVED:
                raise ValueError(f'Refund {refund.refund_number} is {refund.get_status_display().lower()}, not approved for cash payout.')
            if (refund.original_tender or 'CASH') != TenderMode.CASH:
                raise ValueError('Only cash refunds are paid from the drawer.')
            result = cls.issue_refund_credit(refund, cashier, 'CASH', shift)
            cls.audit(AuditEventType.REFUND_PAID, 'Cash refund paid from drawer',
                      f"{cls._patient_name(refund.patient)} · ₹{refund.requested_amount:,.2f} · {result['credit_note'].credit_note_number}",
                      AuditSeverity.MEDIUM, cashier, shift, refund.refund_number)
            return result

    # ---------- counter mode ----------
    @classmethod
    def resolve_assist_shift(cls, user, shift_id) -> CounterShift:
        if not cls.tier(user):
            raise PermissionError('Only billing supervisors can work in counter mode.')
        try:
            shift = CounterShift.objects.select_related('counter', 'cashier').filter(id=shift_id).first()
        except (ValueError, DjangoValidationError):
            shift = None
        if not shift or shift.status != ShiftStatus.OPEN:
            raise NoActiveShift('The counter you were assisting is no longer open. Return to the supervisor workspace.')
        return shift

    @classmethod
    def assist_context(cls, shift, user) -> dict:
        cashier = cls._name(shift.cashier)
        return {
            'active': True,
            'shift_id': str(shift.id),
            'counter_code': shift.counter.code,
            'counter_name': shift.counter.name,
            'counter_location': shift.counter.get_station_location_display(),
            'cashier_name': cashier,
            'supervisor_name': cls._name(user),
            'banner': f"Viewing as Billing Supervisor · {shift.counter.name} · Assisting on {cashier}’s shift",
        }

    @classmethod
    def counter_mode(cls, user, shift_id, action: str) -> dict:
        action = (action or '').upper()
        if action == 'ENTER':
            shift = cls.resolve_assist_shift(user, shift_id)
            if shift.cashier_id == user.id:
                raise ValueError('This is your own shift: counter mode is for assisting another cashier.')
            cls.audit(AuditEventType.COUNTER_MODE, 'Entered counter mode',
                      f"{shift.counter.name} · {cls._name(shift.cashier)}’s shift", AuditSeverity.LOW, user, shift,
                      f"WS-{shift.counter.code}")
            return cls.assist_context(shift, user)
        if action == 'EXIT':
            try:
                shift = CounterShift.objects.select_related('counter').filter(id=shift_id).first() if shift_id else None
            except (ValueError, DjangoValidationError):
                shift = None
            cls.audit(AuditEventType.COUNTER_MODE, 'Returned from counter mode',
                      f"{shift.counter.name if shift else 'Counter'} · back to supervisor workspace", AuditSeverity.LOW,
                      user, shift, f"WS-{shift.counter.code}" if shift else 'WS')
            return {'active': False}
        raise ValueError('action must be ENTER or EXIT.')

    # ---------- dashboard ----------
    @classmethod
    def dashboard(cls, reviewer) -> dict:
        approvals = cls.approvals_queue(reviewer)
        refunds = cls.refunds_queue(reviewer)
        board = CounterShiftControlService.supervisor_board()
        live = {c['counter_code']: c for c in board['live_counters']}
        closing = {r['counter_code']: r for r in board['closings']
                   if r['status'] in (ShiftStatus.PENDING_APPROVAL, ShiftStatus.UNDER_INVESTIGATION)}

        counters = []
        codes = list(BillingCounter.objects.filter(is_active=True).order_by('code').values_list('code', 'name', 'station_location'))
        known = {c[0] for c in codes}
        codes += [(c['counter_code'], c['counter_name'], '') for c in board['live_counters'] if c['counter_code'] not in known]
        for code, name, _ in codes:
            lv, cl = live.get(code), closing.get(code)
            state = 'OPEN' if lv else 'CLOSING' if cl else 'CLOSED'
            src = lv or cl or {}
            counters.append({
                'counter_code': code,
                'counter_name': name,
                'counter_location': src.get('counter_location') or '',
                'status': state,
                'shift_id': (lv or cl or {}).get('shift_id'),
                'cashier_name': src.get('cashier_name') or 'Not rostered',
                'expected_cash_in_drawer': lv['expected_cash_in_drawer'] if lv else None,
                'utilization_percent': lv['utilization_percent'] if lv else 0,
                'over_limit': bool(lv and lv['over_limit']),
                'pickup_due': bool(lv and lv['pickup_due']),
                'pending_pickup': lv['pending_pickup'] if lv else None,
                'total_collected': lv['total_collected'] if lv else None,
                'transactions': lv['transactions'] if lv else 0,
            })

        today = timezone.localdate()
        pay_total = Payment.objects.filter(payment_date__date=today, payment_status='SUCCESS').exclude(
            tender_mode=TenderMode.DEPOSIT_DEDUCTION).aggregate(t=models.Sum('amount'))['t'] or Decimal('0.00')
        dep_total = PatientDeposit.objects.filter(created_at__date=today).aggregate(t=models.Sum('deposit_amount'))['t'] or Decimal('0.00')

        pend = approvals['pending']
        breached = sorted([a for a in pend if a['sla_breached']], key=lambda a: -a['age_minutes'])
        alerts = []
        for c in counters:
            if c['status'] == 'OPEN' and c['over_limit']:
                alerts.append({'kind': 'DRAWER', 'tone': 'red', 'title': f"{c['counter_name']} drawer over limit",
                               'text': f"₹{c['expected_cash_in_drawer']:,.2f} in drawer · limit ₹{CounterShiftControlService.DRAWER_LIMIT:,.0f}",
                               'shift_id': c['shift_id'], 'action': 'PICKUP'})
            elif c['status'] == 'OPEN' and c['pending_pickup']:
                alerts.append({'kind': 'PICKUP', 'tone': 'amber', 'title': f"{c['counter_name']} requested a cash pickup",
                               'text': f"{c['pending_pickup']['voucher_number']} · {c['cashier_name']}", 'shift_id': c['shift_id'], 'action': 'PICKUP'})
        if breached:
            alerts.append({'kind': 'SLA', 'tone': 'amber',
                           'title': f"{len(breached)} approval{'s' if len(breached) > 1 else ''} past {cls.APPROVAL_SLA_MINUTES} min",
                           'text': f"Oldest {breached[0]['age_minutes']} min · {breached[0]['patient_name']}",
                           'request_id': breached[0]['id'], 'action': 'APPROVALS'})
        for r in board['closings']:
            if r['status'] == ShiftStatus.PENDING_APPROVAL and r['variance_status'] == VarianceStatus.RED_VARIANCE:
                alerts.append({'kind': 'VARIANCE', 'tone': 'red', 'title': f"{r['counter_name']} closing variance",
                               'text': f"₹{r['net_variance']:+,.2f} · {r['cashier_name']}", 'shift_id': r['shift_id'], 'action': 'CLOSING'})
        for r in refunds['pending']:
            if r['verified'] is False:
                alerts.append({'kind': 'REFUND_CHECK', 'tone': 'amber', 'title': 'Refund check failed',
                               'text': f"{r['refund_number']} · service already delivered", 'refund_id': r['id'], 'action': 'REFUNDS'})

        open_n = len([c for c in counters if c['status'] == 'OPEN'])
        closing_n = len([c for c in counters if c['status'] == 'CLOSING'])
        return {
            'date': today.isoformat(),
            'drawer_limit': float(CounterShiftControlService.DRAWER_LIMIT),
            'pickup_threshold_percent': float(CounterShiftControlService.PICKUP_THRESHOLD_PERCENT),
            'kpis': {
                'pending_approvals': len(pend),
                'approvals_past_sla': len(breached),
                'pending_refunds': refunds['kpis']['pending'],
                'pending_refund_value': refunds['kpis']['value_pending'],
                'refunds_failed_checks': refunds['kpis']['failed_verification'],
                'collections_today': float(pay_total + dep_total),
                'counters_open': open_n,
                'counters_closing': closing_n,
                'counters_total': len(counters),
                'closings_awaiting': board['kpis']['submitted'],
                'cash_to_vault': board['kpis']['cash_to_vault'],
            },
            'counters': counters,
            'oldest_approvals': sorted(pend, key=lambda a: -a['age_minutes'])[:4],
            'alerts': alerts,
        }

    # ---------- audit stream ----------
    @classmethod
    def audit_stream(cls, counter_code: str = None, unreviewed_only: bool = False, limit: int = 200) -> dict:
        base = BillingAuditEvent.objects.select_related('counter', 'actor', 'reviewed_by')
        unreviewed = base.filter(reviewed_at__isnull=True)
        qs = base
        if counter_code:
            qs = qs.filter(counter__code=counter_code)
        if unreviewed_only:
            qs = qs.filter(reviewed_at__isnull=True)
        rows = [{
            'id': str(e.id),
            'occurred_at': cls._iso(e.occurred_at),
            'event_type': e.event_type,
            'severity': e.severity,
            'title': e.title,
            'detail': e.detail,
            'counter_code': e.counter.code if e.counter_id else None,
            'counter_name': e.counter.name if e.counter_id else 'Back office',
            'actor': cls._name(e.actor) or 'System',
            'reference': e.reference or '—',
            'reviewed': e.reviewed_at is not None,
            'reviewed_by': cls._name(e.reviewed_by) or None,
            'reviewed_at': cls._iso(e.reviewed_at),
        } for e in qs[:limit]]
        by_counter = {}
        for code, name in unreviewed.exclude(counter__isnull=True).values_list('counter__code', 'counter__name'):
            entry = by_counter.setdefault(code, {'counter_code': code, 'counter_name': name, 'unreviewed': 0})
            entry['unreviewed'] += 1
        return {
            'rows': rows,
            'counters': sorted(by_counter.values(), key=lambda c: c['counter_code']),
            'unreviewed': unreviewed.count(),
            'unreviewed_high': unreviewed.filter(severity=AuditSeverity.HIGH).count(),
        }

    @classmethod
    def mark_reviewed(cls, event_id, reviewer) -> BillingAuditEvent:
        if not cls.tier(reviewer):
            raise PermissionError('Only a billing supervisor or above can review audit events.')
        with transaction.atomic():
            event = BillingAuditEvent.objects.select_for_update().get(id=event_id)
            if event.reviewed_at is None:
                event.reviewed_by = reviewer
                event.reviewed_at = timezone.now()
                event.save(update_fields=['reviewed_by', 'reviewed_at'])
            return event


# --- PHASE 6: TARIFF, PACKAGE & PRICING GOVERNANCE ---

class TariffGovernanceService:
    """Departments propose prices; Billing admins approve, reject or send back. Every price is an immutable
    TariffRevisionLog version live from its effective date. Charges snapshot unit_price when posted, so open
    bills keep the price at the time of charge."""
    CHANGE_ALERT_PERCENT = Decimal('15')
    MIN_NOTE_LENGTH = 5
    MIN_JUSTIFICATION_LENGTH = 10
    OPEN_STATUSES = (TariffChangeStatus.PENDING,)
    # Clinical department that owns a service definition when the tariff row does not say
    OWNER_BY_DEPARTMENT = {
        'OPD': 'OPD', 'CONSULTATION': 'OPD', 'LAB': 'Laboratory', 'PATHOLOGY': 'Laboratory', 'RADIOLOGY': 'Radiology',
        'PHARMACY': 'Pharmacy', 'OT': 'OT', 'SURGERY': 'OT', 'PROCEDURE': 'OT', 'IPD': 'IPD', 'CARDIOLOGY': 'Cardiology',
        'EMERGENCY': 'Emergency', 'DAY_CARE': 'Day Care', 'GENERAL': 'Billing',
    }

    @staticmethod
    def _money(value) -> Decimal:
        return Decimal(str(value if value not in (None, '') else '0')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    @staticmethod
    def _today():
        return timezone.localdate()

    @staticmethod
    def _name(user) -> str:
        return (user.get_full_name() or user.username) if user else ''

    @classmethod
    def owner_of(cls, tariff_or_department, owner: str = '') -> str:
        if hasattr(tariff_or_department, 'department'):
            owner = tariff_or_department.owner_department
            dept = tariff_or_department.department
        else:
            dept = tariff_or_department
        return owner or cls.OWNER_BY_DEPARTMENT.get((dept or '').upper(), (dept or 'General').title())

    @staticmethod
    def _parse_date(value, field='effective_from'):
        if value in (None, ''):
            return timezone.localdate()
        if hasattr(value, 'year'):
            return value
        from datetime import date
        try:
            return date.fromisoformat(str(value)[:10])
        except ValueError:
            raise ValueError(f'{field} must be a date (YYYY-MM-DD).')

    @staticmethod
    def _audit(title, detail, actor=None, reference='', severity=AuditSeverity.LOW, event_type=AuditEventType.TARIFF_CHANGE):
        return BillingAuditEvent.objects.create(
            event_type=event_type, severity=severity, title=title[:150], detail=(detail or '')[:500],
            actor=actor if getattr(actor, 'is_authenticated', False) else None, reference=str(reference or '')[:60]
        )

    # ---------- versions ----------
    @classmethod
    def sync_due_versions(cls) -> int:
        """Bring every scheduled version whose effective date has arrived live (tariff rows, change requests,
        scheduled packages). Cheap no-op when nothing is due; called before any price is read."""
        today = cls._today()
        due = TariffRevisionLog.objects.filter(applied_at__isnull=True, effective_from__lte=today)
        pkg_due = ServicePackage.objects.filter(status=PackageStatus.SCHEDULED, effective_from__lte=today)
        if not due.exists() and not pkg_due.exists():
            return 0
        applied = 0
        with transaction.atomic():
            for log in due.select_for_update().select_related('tariff', 'change_request').order_by('effective_from', 'created_at'):
                cls._apply_version(log)
                applied += 1
            for pkg in pkg_due.select_for_update():
                pkg.status = PackageStatus.ACTIVE
                pkg.save(update_fields=['status', 'updated_at'])
        return applied

    @classmethod
    def _apply_version(cls, log):
        tariff = TariffMaster.objects.select_for_update().get(id=log.tariff_id)
        tariff.base_price = log.new_base_price
        if log.new_gst_rate is not None:
            tariff.gst_rate = log.new_gst_rate
        if log.new_emergency_markup is not None:
            tariff.emergency_markup_percent = log.new_emergency_markup
        tariff.is_active = True
        tariff.save()
        log.applied_at = timezone.now()
        log.save(update_fields=['applied_at'])
        if log.change_request_id and log.change_request.status == TariffChangeStatus.APPROVED:
            TariffChangeRequest.objects.filter(id=log.change_request_id).update(status=TariffChangeStatus.PUBLISHED)
        cls.publish_to_departments(tariff)

    @staticmethod
    def publish_to_departments(tariff):
        """Tariff Published event: department catalogues that carry their own price copy follow the tariff."""
        try:
            from apps.lab.models import LabTest
            LabTest.objects.filter(test_code=tariff.code).update(price=tariff.base_price)
        except Exception:  # department catalogue unavailable: billing still prices from TariffMaster
            pass

    @classmethod
    def _record_version(cls, tariff, user, source, justification, new_price, effective_from, new_gst=None,
                        new_markup=None, change_request=None, apply_now=None):
        log = TariffRevisionLog.objects.create(
            tariff=tariff, change_request=change_request, source=source,
            old_base_price=None if source == TariffRevisionSource.NEW_SERVICE else tariff.base_price,
            new_base_price=new_price,
            old_gst_rate=tariff.gst_rate if new_gst is not None else None, new_gst_rate=new_gst,
            old_emergency_markup=tariff.emergency_markup_percent if new_markup is not None else None, new_emergency_markup=new_markup,
            effective_from=effective_from, revised_by=user if getattr(user, 'is_authenticated', False) else None,
            justification=justification
        )
        if apply_now if apply_now is not None else effective_from <= cls._today():
            cls._apply_version(log)
        return log

    @classmethod
    def scheduled_version(cls, tariff):
        return tariff.revisions.filter(applied_at__isnull=True).order_by('effective_from').first()

    @classmethod
    def price_history(cls, tariff) -> list:
        return [{
            'effective_from': log.effective_from.isoformat(),
            'old_base_price': float(log.old_base_price) if log.old_base_price is not None else None,
            'new_base_price': float(log.new_base_price),
            'new_gst_rate': float(log.new_gst_rate) if log.new_gst_rate is not None else None,
            'new_emergency_markup': float(log.new_emergency_markup) if log.new_emergency_markup is not None else None,
            'source': log.source,
            'source_label': TariffRevisionSource(log.source).label,
            'request_number': log.change_request.request_number if log.change_request_id else None,
            'revised_by': cls._name(log.revised_by),
            'justification': log.justification,
            'live': log.applied_at is not None,
            'recorded_at': timezone.localtime(log.created_at).isoformat(),
        } for log in tariff.revisions.select_related('revised_by', 'change_request').order_by('-effective_from', '-created_at')]

    # ---------- admin edits ----------
    @classmethod
    def _validate_rates(cls, price=None, gst=None, markup=None):
        if price is not None and price <= 0:
            raise ValueError('Price must be greater than zero.')
        if gst is not None and (gst < 0 or gst > 28):
            raise ValueError('GST rate must be between 0% and 28%.')
        if markup is not None and (markup < 0 or markup > 200):
            raise ValueError('Emergency markup must be between 0% and 200%.')

    @classmethod
    def create_tariff(cls, user, data: dict, justification: str) -> TariffMaster:
        justification = (justification or '').strip()
        if len(justification) < cls.MIN_NOTE_LENGTH:
            raise ValueError('A justification is required to add a service to the tariff.')
        code = (data.get('code') or '').strip().upper()
        name = (data.get('name') or '').strip()
        if not code or not name:
            raise ValueError('Service code and name are required.')
        if TariffMaster.objects.filter(code=code).exists():
            raise ValueError(f'Tariff code {code} already exists.')
        price = cls._money(data.get('base_price'))
        gst = cls._money(data.get('gst_rate', 0))
        markup = cls._money(data.get('emergency_markup_percent', 0))
        cls._validate_rates(price, gst, markup)
        effective = cls._parse_date(data.get('effective_from'))
        with transaction.atomic():
            tariff = TariffMaster.objects.create(
                code=code, name=name, department=(data.get('department') or 'GENERAL').upper(),
                owner_department=data.get('owner_department') or '', base_price=price, gst_rate=gst,
                emergency_markup_percent=markup, is_active=effective <= cls._today()
            )
            cls._record_version(tariff, user, TariffRevisionSource.NEW_SERVICE, justification, price, effective, gst, markup)
            cls._audit('Tariff service added', f'{code} {name} · ₹{price:,.2f}', user, code)
        return tariff

    @classmethod
    def direct_update(cls, tariff, user, data: dict, justification: str) -> TariffMaster:
        """Admin edit. Price, GST and markup changes need a justification and write a revision (live now, or
        scheduled with `effective_from`); descriptive fields change in place."""
        justification = (justification or '').strip()
        price = cls._money(data['base_price']) if data.get('base_price') not in (None, '') else None
        gst = cls._money(data['gst_rate']) if data.get('gst_rate') not in (None, '') else None
        markup = cls._money(data['emergency_markup_percent']) if data.get('emergency_markup_percent') not in (None, '') else None
        cls._validate_rates(price, gst, markup)
        rate_changed = (price is not None and price != tariff.base_price) or (gst is not None and gst != tariff.gst_rate) or \
                       (markup is not None and markup != tariff.emergency_markup_percent)
        if rate_changed and len(justification) < cls.MIN_NOTE_LENGTH:
            raise ValueError('A justification is required to change a price, GST rate or emergency markup.')
        with transaction.atomic():
            for field in ('name', 'owner_department'):
                if data.get(field) not in (None, ''):
                    setattr(tariff, field, data[field])
            if data.get('department'):
                tariff.department = str(data['department']).upper()
            if 'is_active' in data and data['is_active'] is not None:
                tariff.is_active = str(data['is_active']).lower() in ('true', '1')
            tariff.save()
            if rate_changed:
                effective = cls._parse_date(data.get('effective_from'))
                cls._record_version(tariff, user, TariffRevisionSource.DIRECT_EDIT, justification,
                                    price if price is not None else tariff.base_price, effective,
                                    gst if gst is not None and gst != tariff.gst_rate else None,
                                    markup if markup is not None and markup != tariff.emergency_markup_percent else None)
                cls._audit('Tariff edited by billing admin', f"{tariff.code} → ₹{(price or tariff.base_price):,.2f} from {effective} · {justification}",
                           user, tariff.code, AuditSeverity.MEDIUM)
            tariff.refresh_from_db()
        return tariff

    # ---------- department change requests ----------
    @classmethod
    def impact_note(cls, code: str) -> str:
        since = timezone.now() - timedelta(days=30)
        volume = BillableChargeItem.objects.filter(service_code=code, created_at__gte=since).exclude(status=ChargeItemStatus.CANCELLED).count()
        packages = PackageInclusionItem.objects.filter(service_code=code).values('package_id').distinct().count()
        parts = [f'{volume} charge(s) in the last 30 days']
        if packages:
            parts.append(f'used inside {packages} package(s)')
        return ' · '.join(parts) + '.'

    @classmethod
    def propose_change(cls, user, data: dict) -> TariffChangeRequest:
        code = (data.get('service_code') or data.get('code') or '').strip().upper()
        if not code:
            raise ValueError('service_code is required.')
        justification = (data.get('justification') or '').strip()
        if len(justification) < cls.MIN_JUSTIFICATION_LENGTH:
            raise ValueError('Explain the change (at least 10 characters) so Billing can review it.')
        proposed = cls._money(data.get('proposed_price'))
        gst = cls._money(data['proposed_gst_rate']) if data.get('proposed_gst_rate') not in (None, '') else None
        markup = cls._money(data['proposed_emergency_markup']) if data.get('proposed_emergency_markup') not in (None, '') else None
        cls._validate_rates(proposed, gst, markup)
        effective = cls._parse_date(data.get('effective_from'))
        if effective < cls._today():
            raise ValueError('The effective date cannot be in the past.')
        tariff = TariffMaster.objects.filter(code=code).first()
        if tariff is None and not (data.get('service_name') or '').strip():
            raise ValueError('A new service needs a name.')
        if tariff is not None and proposed == tariff.base_price and gst is None and markup is None:
            raise ValueError(f'{code} is already priced at ₹{proposed:,.2f}.')
        open_req = TariffChangeRequest.objects.filter(service_code=code, status__in=cls.OPEN_STATUSES).first()
        if open_req:
            raise ValueError(f'{open_req.request_number} for {code} is already waiting for review.')
        department = (tariff.department if tariff else (data.get('department') or 'GENERAL')).upper()
        req = TariffChangeRequest.objects.create(
            request_number=next_sequence_number(TariffChangeRequest, 'request_number', 'TCR', 4),
            tariff=tariff, service_code=code, service_name=tariff.name if tariff else data['service_name'].strip(),
            department=department,
            owner_department=(tariff.owner_department if tariff else '') or data.get('owner_department') or cls.owner_of(department),
            current_price=tariff.base_price if tariff else Decimal('0.00'), proposed_price=proposed,
            proposed_gst_rate=gst, proposed_emergency_markup=markup, effective_from=effective,
            justification=justification, impact_note=(data.get('impact_note') or '').strip() or cls.impact_note(code),
            requested_by=user
        )
        pct = req.change_percent
        cls._audit('Tariff change proposed', f"{code} {req.service_name} · " + (f"₹{req.current_price:,.2f} → " if tariff else 'new · ')
                   + f"₹{proposed:,.2f}" + (f" ({pct:+}%)" if pct is not None else ''), user, req.request_number,
                   AuditSeverity.MEDIUM if pct is not None and abs(pct) > cls.CHANGE_ALERT_PERCENT else AuditSeverity.LOW)
        return req

    @classmethod
    def needs_cfo(cls, req) -> bool:
        pct = req.change_percent
        return pct is not None and abs(pct) > cls.CHANGE_ALERT_PERCENT

    @classmethod
    def decide_change(cls, request_id, user, action: str, note: str = '', cfo_confirmed: bool = False) -> TariffChangeRequest:
        action = (action or '').upper()
        if action not in ('APPROVE', 'REJECT', 'REVISION'):
            raise ValueError('action must be APPROVE, REJECT or REVISION.')
        note = (note or '').strip()
        with transaction.atomic():
            req = TariffChangeRequest.objects.select_for_update().select_related('tariff').get(id=request_id)
            if req.requested_by_id == getattr(user, 'id', None):
                raise PermissionError('Segregation of duties: the proposer of a tariff change cannot publish it.')
            if req.status != TariffChangeStatus.PENDING:
                raise ValueError(f'{req.request_number} is already {req.get_status_display().lower()}.')
            if action in ('REJECT', 'REVISION') and len(note) < cls.MIN_NOTE_LENGTH:
                raise ValueError('A note to the department is required.')
            if action == 'APPROVE' and cls.needs_cfo(req):
                if not cfo_confirmed or len(note) < cls.MIN_NOTE_LENGTH:
                    raise ValueError(f'Change above {cls.CHANGE_ALERT_PERCENT}%: confirm CFO approval and record it in the note.')
            req.decided_by, req.decided_at, req.decision_note = user, timezone.now(), note
            if action == 'REJECT':
                req.status = TariffChangeStatus.REJECTED
            elif action == 'REVISION':
                req.status = TariffChangeStatus.REVISION
            else:
                req.cfo_confirmed = bool(cfo_confirmed)
                tariff = req.tariff
                if tariff is None:
                    tariff = TariffMaster.objects.filter(code=req.service_code).first() or TariffMaster.objects.create(
                        code=req.service_code, name=req.service_name, department=req.department,
                        owner_department=req.owner_department, base_price=req.proposed_price,
                        gst_rate=req.proposed_gst_rate or Decimal('0.00'),
                        emergency_markup_percent=req.proposed_emergency_markup or Decimal('0.00'),
                        is_active=False
                    )
                    req.tariff = tariff
                    source = TariffRevisionSource.NEW_SERVICE
                else:
                    source = TariffRevisionSource.CHANGE_REQUEST
                req.status = TariffChangeStatus.APPROVED
                req.save()
                log = cls._record_version(tariff, user, source, f"{req.request_number}: {req.justification}",
                                          req.proposed_price, req.effective_from, req.proposed_gst_rate,
                                          req.proposed_emergency_markup, change_request=req)
                req.refresh_from_db()
                if log.applied_at is None:
                    req.status = TariffChangeStatus.APPROVED
            req.save()
            word = {'APPROVE': 'approved and published' if req.status == TariffChangeStatus.PUBLISHED else 'approved · scheduled',
                    'REJECT': 'returned to department', 'REVISION': 'sent back for revision'}[action]
            cls._audit(f'Tariff change {word}',
                       f"{req.service_name} ₹{req.current_price:,.2f} → ₹{req.proposed_price:,.2f} from {req.effective_from}" + (f' · {note}' if note else ''),
                       user, req.request_number, AuditSeverity.MEDIUM if cls.needs_cfo(req) else AuditSeverity.LOW)
            return req

    @classmethod
    def change_row(cls, req, viewer=None) -> dict:
        pct = req.change_percent
        return {
            'id': str(req.id),
            'request_number': req.request_number,
            'service_code': req.service_code,
            'service_name': req.service_name,
            'department': req.department,
            'owner': req.owner_department or cls.owner_of(req.department),
            'current_price': float(req.current_price),
            'proposed_price': float(req.proposed_price),
            'proposed_gst_rate': float(req.proposed_gst_rate) if req.proposed_gst_rate is not None else None,
            'proposed_emergency_markup': float(req.proposed_emergency_markup) if req.proposed_emergency_markup is not None else None,
            'difference': float(req.proposed_price - req.current_price),
            'change_percent': float(pct) if pct is not None else None,
            'is_new_service': req.tariff_id is None or not req.current_price,
            'needs_cfo': cls.needs_cfo(req),
            'effective_from': req.effective_from.isoformat(),
            'publishes_immediately': req.effective_from <= cls._today(),
            'justification': req.justification,
            'impact_note': req.impact_note,
            'status': req.status,
            'status_label': req.get_status_display(),
            'requested_by': cls._name(req.requested_by),
            'requested_at': timezone.localtime(req.created_at).isoformat(),
            'age_days': (cls._today() - timezone.localtime(req.created_at).date()).days,
            'decided_by': cls._name(req.decided_by) or None,
            'decided_at': timezone.localtime(req.decided_at).isoformat() if req.decided_at else None,
            'decision_note': req.decision_note,
            'cfo_confirmed': req.cfo_confirmed,
            'can_decide': bool(viewer) and req.status == TariffChangeStatus.PENDING and req.requested_by_id != viewer.id,
        }

    @classmethod
    def change_queue(cls, viewer, mine_only: bool = False) -> dict:
        cls.sync_due_versions()
        qs = TariffChangeRequest.objects.select_related('requested_by', 'decided_by', 'tariff')
        if mine_only:
            qs = qs.filter(requested_by=viewer)
        rows = [cls.change_row(r, viewer) for r in qs[:300]]
        pending = [r for r in rows if r['status'] == TariffChangeStatus.PENDING]
        return {
            'alert_percent': float(cls.CHANGE_ALERT_PERCENT),
            'kpis': {
                'pending': len(pending),
                'above_alert': len([r for r in pending if r['needs_cfo']]),
                'pending_over_3_days': len([r for r in pending if r['age_days'] >= 3]),
                'approved_not_live': TariffRevisionLog.objects.filter(applied_at__isnull=True).values('tariff_id').distinct().count(),
                'active_services': TariffMaster.objects.filter(is_active=True).count(),
                'owning_departments': len({cls.owner_of(t) for t in TariffMaster.objects.filter(is_active=True).only('department', 'owner_department')}),
                'sent_back': len([r for r in rows if r['status'] in (TariffChangeStatus.REJECTED, TariffChangeStatus.REVISION)]),
            },
            'pending': pending,
            'revision': [r for r in rows if r['status'] == TariffChangeStatus.REVISION],
            'decided': [r for r in rows if r['status'] in (TariffChangeStatus.APPROVED, TariffChangeStatus.PUBLISHED, TariffChangeStatus.REJECTED)],
        }

    # ---------- batch import ----------
    IMPORT_COLUMNS = ('code', 'name', 'department', 'base_price', 'gst_rate', 'emergency_markup_percent')

    @classmethod
    def batch_import(cls, user, csv_text: str, justification: str, effective_from=None, dry_run: bool = True) -> dict:
        """Hospital-wide revision from CSV (code,name,department,base_price[,gst_rate,emergency_markup_percent]).
        Dry run returns the preview; a real run is all-or-nothing and writes one revision per changed row."""
        import csv, io
        justification = (justification or '').strip()
        if not dry_run and len(justification) < cls.MIN_NOTE_LENGTH:
            raise ValueError('A justification is required for a tariff import.')
        effective = cls._parse_date(effective_from)
        reader = csv.DictReader(io.StringIO((csv_text or '').strip().lstrip('﻿')))
        if not reader.fieldnames or not {'code', 'base_price'} <= {f.strip().lower() for f in reader.fieldnames}:
            raise ValueError('CSV needs a header row with at least: code, base_price (optional: name, department, gst_rate, emergency_markup_percent).')
        rows, seen = [], set()
        for n, raw in enumerate(reader, start=2):
            r = {(k or '').strip().lower(): (v or '').strip() for k, v in raw.items()}
            code = r.get('code', '').upper()
            out = {'line': n, 'code': code, 'name': r.get('name', ''), 'action': 'ERROR', 'old_price': None, 'new_price': None, 'message': ''}
            try:
                if not code:
                    raise ValueError('Missing code.')
                if code in seen:
                    raise ValueError('Duplicate code in file.')
                seen.add(code)
                price = cls._money(r.get('base_price'))
                gst = cls._money(r['gst_rate']) if r.get('gst_rate') else None
                markup = cls._money(r['emergency_markup_percent']) if r.get('emergency_markup_percent') else None
                cls._validate_rates(price, gst, markup)
                out['new_price'] = float(price)
                tariff = TariffMaster.objects.filter(code=code).first()
                if tariff is None:
                    if not r.get('name'):
                        raise ValueError('New service needs a name.')
                    out['action'] = 'CREATE'
                else:
                    out['old_price'] = float(tariff.base_price)
                    out['name'] = out['name'] or tariff.name
                    changed = price != tariff.base_price or (gst is not None and gst != tariff.gst_rate) or \
                        (markup is not None and markup != tariff.emergency_markup_percent)
                    out['action'] = 'UPDATE' if changed else 'UNCHANGED'
                    if changed and tariff.base_price:
                        pct = (price - tariff.base_price) / tariff.base_price * 100
                        if abs(pct) > cls.CHANGE_ALERT_PERCENT:
                            out['message'] = f'Change {pct:+.1f}% (above {cls.CHANGE_ALERT_PERCENT}%)'
                out['_data'] = (price, gst, markup, r)
            except (ValueError, ArithmeticError) as exc:
                out['message'] = str(exc) if not isinstance(exc, ArithmeticError) else 'Invalid number.'
            rows.append(out)
        errors = [r for r in rows if r['action'] == 'ERROR']
        summary = {a: len([r for r in rows if r['action'] == a]) for a in ('CREATE', 'UPDATE', 'UNCHANGED', 'ERROR')}
        result = {'dry_run': dry_run, 'effective_from': effective.isoformat(), 'summary': summary,
                  'rows': [{k: v for k, v in r.items() if k != '_data'} for r in rows]}
        if dry_run:
            return result
        if errors:
            raise ValueError(f'{len(errors)} row(s) have errors; nothing was imported. Fix them and retry.')
        if not rows:
            raise ValueError('The file has no data rows.')
        with transaction.atomic():
            for r in rows:
                if r['action'] == 'UNCHANGED':
                    continue
                price, gst, markup, raw = r['_data']
                if r['action'] == 'CREATE':
                    tariff = TariffMaster.objects.create(
                        code=r['code'], name=raw['name'], department=(raw.get('department') or 'GENERAL').upper(),
                        base_price=price, gst_rate=gst or Decimal('0.00'), emergency_markup_percent=markup or Decimal('0.00'),
                        is_active=effective <= cls._today()
                    )
                    cls._record_version(tariff, user, TariffRevisionSource.NEW_SERVICE, f'Batch import: {justification}', price, effective, gst, markup)
                else:
                    tariff = TariffMaster.objects.get(code=r['code'])
                    cls._record_version(tariff, user, TariffRevisionSource.BATCH_IMPORT, f'Batch import: {justification}', price, effective,
                                        gst if gst is not None and gst != tariff.gst_rate else None,
                                        markup if markup is not None and markup != tariff.emergency_markup_percent else None)
            cls._audit('Tariff batch import', f"{summary['CREATE']} new · {summary['UPDATE']} revised · from {effective} · {justification}",
                       user, f'IMPORT-{effective}', AuditSeverity.MEDIUM)
        return result


class PackageGovernanceService:
    """Fixed-price bundles: structured inclusions (absorbed up to a quantity) and exclusions (billed at tariff)."""

    @staticmethod
    def _money(value) -> Decimal:
        return Decimal(str(value if value not in (None, '') else '0')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    @staticmethod
    def resolve(package_id_or_code):
        if not package_id_or_code:
            return None
        pkg = ServicePackage.objects.filter(code=package_id_or_code).first()
        if pkg is None:
            try:
                pkg = ServicePackage.objects.filter(id=package_id_or_code).first()
            except (ValueError, DjangoValidationError):
                pkg = None
        return pkg

    @classmethod
    def _set_items(cls, pkg, items: list):
        pkg.items.all().delete()
        for idx, raw in enumerate(items or []):
            name = (raw.get('service_name') or raw.get('name') or '').strip()
            code = (raw.get('service_code') or raw.get('code') or '').strip().upper()
            if code and not name:
                tariff = TariffMaster.objects.filter(code=code).first()
                name = tariff.name if tariff else ''
            if not name:
                raise ValueError(f'Line {idx + 1}: a service name or a known tariff code is required.')
            kind = (raw.get('inclusion_type') or 'INCLUDED').upper()
            if kind not in InclusionType.values:
                raise ValueError(f'Line {idx + 1}: inclusion_type must be INCLUDED or EXCLUDED.')
            try:
                qty = int(raw.get('max_quantity_covered') or 1)
            except (TypeError, ValueError):
                raise ValueError(f'Line {idx + 1}: max quantity must be a whole number.')
            if qty < 1:
                raise ValueError(f'Line {idx + 1}: max quantity must be at least 1.')
            PackageInclusionItem.objects.create(
                package=pkg, inclusion_type=kind, service_code=code, service_name=name[:200],
                department=(raw.get('department') or '').upper(), max_quantity_covered=qty,
                is_mandatory=bool(raw.get('is_mandatory')), sort_order=idx
            )

    @classmethod
    def save_package(cls, user, data: dict, package=None) -> ServicePackage:
        if package is not None and package.status == PackageStatus.RETIRED:
            raise ValueError('Retired packages cannot be edited; create a new package instead.')
        with transaction.atomic():
            if package is None:
                code = (data.get('code') or '').strip().upper()
                if not code or not (data.get('name') or '').strip():
                    raise ValueError('Package code and name are required.')
                if ServicePackage.objects.filter(code=code).exists():
                    raise ValueError(f'Package code {code} already exists.')
                package = ServicePackage(code=code, status=PackageStatus.DRAFT, package_price=Decimal('0.00'))
            for field in ('name', 'inclusions_description', 'exclusions_description', 'overrun_rule'):
                if field in data and data[field] is not None:
                    setattr(package, field, data[field])
            if data.get('department'):
                package.department = str(data['department']).upper()
            if data.get('package_price') not in (None, ''):
                price = cls._money(data['package_price'])
                if price < 0:
                    raise ValueError('Package price cannot be negative.')
                package.package_price = price
            for field in ('length_of_stay_days', 'validity_days'):
                if data.get(field) not in (None, ''):
                    setattr(package, field, max(0, int(data[field])))
            if 'effective_from' in data:
                package.effective_from = TariffGovernanceService._parse_date(data['effective_from']) if data['effective_from'] else None
            package.save()
            if 'items' in data and data['items'] is not None:
                cls._set_items(package, data['items'])
            if package.status == PackageStatus.ACTIVE:
                TariffGovernanceService._audit('Active package revised', f'{package.code} {package.name} · ₹{package.package_price:,.2f} · applies to new admissions',
                                               user, package.code, AuditSeverity.MEDIUM, AuditEventType.PACKAGE_CHANGE)
        return package

    @classmethod
    def publish(cls, user, package) -> ServicePackage:
        if package.status == PackageStatus.RETIRED:
            raise ValueError('Retired packages cannot be republished.')
        if package.package_price <= 0:
            raise ValueError('Set the package price before publishing.')
        if not package.items.filter(inclusion_type=InclusionType.INCLUDED).exists():
            raise ValueError('Add at least one inclusion before publishing.')
        today = timezone.localdate()
        package.effective_from = package.effective_from or today
        package.status = PackageStatus.SCHEDULED if package.effective_from > today else PackageStatus.ACTIVE
        package.published_by, package.published_at = user, timezone.now()
        package.save()
        TariffGovernanceService._audit('Package published', f"{package.name} · ₹{package.package_price:,.2f} · "
                                       + ('now' if package.status == PackageStatus.ACTIVE else f'from {package.effective_from}'),
                                       user, package.code, AuditSeverity.LOW, AuditEventType.PACKAGE_CHANGE)
        return package

    @classmethod
    def retire(cls, user, package) -> ServicePackage:
        if package.status == PackageStatus.RETIRED:
            raise ValueError('Package is already retired.')
        package.status = PackageStatus.RETIRED
        package.save()
        TariffGovernanceService._audit('Package retired', f'{package.name} · existing admissions unaffected', user, package.code,
                                       AuditSeverity.LOW, AuditEventType.PACKAGE_CHANGE)
        return package

    @classmethod
    def is_service_covered_by_package(cls, package, service_code: str, current_quantity: int = 0) -> dict:
        """Is one more unit of `service_code` absorbed by the package, given `current_quantity` already consumed?"""
        code = (service_code or '').strip().upper()
        lines = list(package.items.all())
        excluded = next((l for l in lines if l.inclusion_type == InclusionType.EXCLUDED and l.service_code == code), None)
        if excluded:
            return {'covered': False, 'excluded': True, 'max_quantity': 0, 'remaining': 0,
                    'reason': f'{excluded.service_name} is excluded from {package.name} and billed separately.'}
        included = next((l for l in lines if l.inclusion_type == InclusionType.INCLUDED and l.service_code == code), None)
        if not included:
            return {'covered': False, 'excluded': False, 'max_quantity': 0, 'remaining': 0,
                    'reason': f'Not part of {package.name}: billed at tariff.'}
        remaining = max(0, included.max_quantity_covered - int(current_quantity or 0))
        if remaining <= 0:
            return {'covered': False, 'excluded': False, 'max_quantity': included.max_quantity_covered, 'remaining': 0,
                    'reason': f'Package allowance of {included.max_quantity_covered} used: extra units billed at tariff.'}
        return {'covered': True, 'excluded': False, 'max_quantity': included.max_quantity_covered, 'remaining': remaining,
                'reason': f'Included in {package.name} ({remaining} of {included.max_quantity_covered} left).'}

    @classmethod
    def package_dict(cls, pkg) -> dict:
        lines = [{
            'id': str(l.id), 'inclusion_type': l.inclusion_type, 'service_code': l.service_code, 'service_name': l.service_name,
            'department': l.department, 'max_quantity_covered': l.max_quantity_covered, 'is_mandatory': l.is_mandatory,
        } for l in pkg.items.all()]
        return {
            'id': str(pkg.id), 'code': pkg.code, 'name': pkg.name, 'department': pkg.department,
            'package_price': float(pkg.package_price), 'length_of_stay_days': pkg.length_of_stay_days,
            'validity_days': pkg.validity_days, 'status': pkg.status, 'is_active': pkg.is_active,
            'effective_from': pkg.effective_from.isoformat() if pkg.effective_from else None,
            'overrun_rule': pkg.overrun_rule, 'inclusions_description': pkg.inclusions_description,
            'exclusions_description': pkg.exclusions_description,
            'inclusions': [l for l in lines if l['inclusion_type'] == InclusionType.INCLUDED],
            'exclusions': [l for l in lines if l['inclusion_type'] == InclusionType.EXCLUDED],
            'published_by': TariffGovernanceService._name(pkg.published_by) or None,
            'published_at': timezone.localtime(pkg.published_at).isoformat() if pkg.published_at else None,
            'updated_at': timezone.localtime(pkg.updated_at).isoformat(),
        }


class MarkupScheduleService:
    @staticmethod
    def matching(department: str, at=None):
        """The highest active schedule covering this department (or ALL) at local time `at`."""
        at = timezone.localtime(at) if at else timezone.localtime()
        best = None
        for sch in EmergencyMarkupSchedule.objects.filter(is_active=True, department__in=[(department or '').upper(), 'ALL']):
            if sch.applies_at(at) and (best is None or sch.markup_percentage > best.markup_percentage):
                best = sch
        return best

    @staticmethod
    def as_dict(sch) -> dict:
        return {
            'id': str(sch.id), 'label': sch.label, 'department': sch.department,
            'markup_percentage': float(sch.markup_percentage),
            'applies_from_time': sch.applies_from_time.strftime('%H:%M'), 'applies_to_time': sch.applies_to_time.strftime('%H:%M'),
            'is_weekend_active': sch.is_weekend_active, 'is_active': sch.is_active,
        }

    @staticmethod
    def save(user, data: dict, schedule=None) -> EmergencyMarkupSchedule:
        from datetime import time as dtime
        def parse_time(v, field):
            try:
                hh, mm = str(v).split(':')[:2]
                return dtime(int(hh), int(mm))
            except (ValueError, TypeError):
                raise ValueError(f'{field} must be HH:MM.')
        sch = schedule or EmergencyMarkupSchedule(created_by=user if getattr(user, 'is_authenticated', False) else None)
        if 'label' in data and data['label']:
            sch.label = str(data['label'])[:100]
        if data.get('department'):
            sch.department = str(data['department']).upper()
        if data.get('markup_percentage') not in (None, ''):
            pct = Decimal(str(data['markup_percentage']))
            if pct <= 0 or pct > 200:
                raise ValueError('Markup must be between 0% and 200%.')
            sch.markup_percentage = pct
        if data.get('applies_from_time'):
            sch.applies_from_time = parse_time(data['applies_from_time'], 'applies_from_time')
        if data.get('applies_to_time'):
            sch.applies_to_time = parse_time(data['applies_to_time'], 'applies_to_time')
        for flag in ('is_weekend_active', 'is_active'):
            if flag in data and data[flag] is not None:
                setattr(sch, flag, str(data[flag]).lower() in ('true', '1'))
        if sch.markup_percentage is None or sch.applies_from_time is None or sch.applies_to_time is None:
            raise ValueError('markup_percentage, applies_from_time and applies_to_time are required.')
        sch.save()
        TariffGovernanceService._audit('Emergency markup schedule saved',
                                       f'{sch.label} · {sch.department} · +{sch.markup_percentage}% · {sch.applies_from_time:%H:%M}–{sch.applies_to_time:%H:%M}'
                                       + (' · weekends' if sch.is_weekend_active else '') + ('' if sch.is_active else ' · inactive'),
                                       user, f'MKP-{sch.department}')
        return sch


class BillingAdminGovernanceService:
    """Phase 7 — Billing Admin Core & Governance.
    - 4-Tier Escalation Ladder: Cashier -> Supervisor -> Manager -> Admin -> CFO.
    - Approval matrix threshold enforcement & route simulation.
    - Financial policy rules engine.
    - Hardware terminal registry and IP/MAC lockdown during shift open.
    - Counter master registry & station lifecycle.
    - Staff duty roster scheduling with conflict/overlap prevention.
    - Revenue Command executive dashboard KPIs and metrics.
    """
    DAILY_BUDGET = Decimal('1550000.00')

    DEFAULT_MATRIX = [
        # (tier_level, action_type, max_pct, max_amt, sla_minutes)
        (TierLevel.SUPERVISOR, MatrixActionType.DISCOUNT, Decimal('20.00'), Decimal('10000.00'), 30),
        (TierLevel.SUPERVISOR, MatrixActionType.REFUND, None, Decimal('10000.00'), 30),
        (TierLevel.SUPERVISOR, MatrixActionType.VOID, None, Decimal('25000.00'), 30),
        (TierLevel.SUPERVISOR, MatrixActionType.WRITE_OFF, None, Decimal('0.00'), 30),
        (TierLevel.SUPERVISOR, MatrixActionType.CREDIT_DISCHARGE, None, Decimal('5000.00'), 30),
        (TierLevel.SUPERVISOR, MatrixActionType.CORPORATE_OVERRIDE, None, Decimal('5000.00'), 30),

        (TierLevel.MANAGER, MatrixActionType.DISCOUNT, Decimal('35.00'), Decimal('25000.00'), 60),
        (TierLevel.MANAGER, MatrixActionType.REFUND, None, Decimal('25000.00'), 60),
        (TierLevel.MANAGER, MatrixActionType.VOID, None, Decimal('50000.00'), 60),
        (TierLevel.MANAGER, MatrixActionType.WRITE_OFF, None, Decimal('10000.00'), 60),
        (TierLevel.MANAGER, MatrixActionType.CREDIT_DISCHARGE, None, Decimal('25000.00'), 60),
        (TierLevel.MANAGER, MatrixActionType.CORPORATE_OVERRIDE, None, Decimal('25000.00'), 60),

        (TierLevel.ADMIN, MatrixActionType.DISCOUNT, Decimal('50.00'), Decimal('100000.00'), 120),
        (TierLevel.ADMIN, MatrixActionType.REFUND, None, Decimal('100000.00'), 120),
        (TierLevel.ADMIN, MatrixActionType.VOID, None, Decimal('200000.00'), 120),
        (TierLevel.ADMIN, MatrixActionType.WRITE_OFF, None, Decimal('50000.00'), 120),
        (TierLevel.ADMIN, MatrixActionType.CREDIT_DISCHARGE, None, Decimal('100000.00'), 120),
        (TierLevel.ADMIN, MatrixActionType.CORPORATE_OVERRIDE, None, Decimal('100000.00'), 120),

        (TierLevel.CFO, MatrixActionType.DISCOUNT, Decimal('100.00'), Decimal('999999999.00'), 240),
        (TierLevel.CFO, MatrixActionType.REFUND, None, Decimal('999999999.00'), 240),
        (TierLevel.CFO, MatrixActionType.VOID, None, Decimal('999999999.00'), 240),
        (TierLevel.CFO, MatrixActionType.WRITE_OFF, None, Decimal('999999999.00'), 240),
        (TierLevel.CFO, MatrixActionType.CREDIT_DISCHARGE, None, Decimal('999999999.00'), 240),
        (TierLevel.CFO, MatrixActionType.CORPORATE_OVERRIDE, None, Decimal('999999999.00'), 240),
    ]

    DEFAULT_POLICIES = [
        {
            'rule_code': 'RULE_DISCOUNT_DISCRETION',
            'rule_name': 'Staff Max Discretionary Discount',
            'category': PolicyCategory.DISCOUNT,
            'parameter_value': {'max_cashier_discount_pct': 5.0, 'enforce_dual_approval': True},
            'description': 'Max 5% discount at cashier level before requiring supervisor approval',
            'priority': 1
        },
        {
            'rule_code': 'RULE_REFUND_SUPERVISOR_REQ',
            'rule_name': 'Supervisor Refund Dual Authorization',
            'category': PolicyCategory.REFUND,
            'parameter_value': {'threshold_amount': 500.0, 'require_original_receipt': True},
            'description': 'All refunds exceeding ₹500 require dual authorization',
            'priority': 2
        },
        {
            'rule_code': 'RULE_DRAWER_LIMIT',
            'rule_name': 'Counter Cash Drawer Threshold',
            'category': PolicyCategory.CASH_DRAWER,
            'parameter_value': {'drawer_limit': 50000.0, 'warning_threshold_pct': 80.0},
            'description': 'Cash drawers must not exceed ₹50,000 without mid-shift drop',
            'priority': 3
        },
        {
            'rule_code': 'RULE_DISCHARGE_CLEARANCE',
            'rule_name': 'Zero Due Discharge Clearance',
            'category': PolicyCategory.DISCHARGE,
            'parameter_value': {'allowed_overdue': 0.0, 'block_discharge_on_due': True},
            'description': 'IPD discharge billing clearance blocked if outstanding balance > 0',
            'priority': 4
        },
        {
            'rule_code': 'RULE_TERMINAL_LOCK',
            'rule_name': 'Hardware Terminal Lockdown',
            'category': PolicyCategory.GENERAL,
            'parameter_value': {'enforce_lock': True, 'allow_loopback': True},
            'description': 'Billing shift open restricted to registered IP address/station MAC',
            'priority': 5
        },
    ]

    @classmethod
    def ensure_default_matrix(cls):
        """Seed default matrix tiers if not populated."""
        if ApprovalMatrixTier.objects.count() >= len(cls.DEFAULT_MATRIX):
            return
        for tier_level, action_type, max_pct, max_amt, sla in cls.DEFAULT_MATRIX:
            ApprovalMatrixTier.objects.get_or_create(
                tier_level=tier_level,
                action_type=action_type,
                defaults={
                    'max_percentage': max_pct,
                    'max_amount': max_amt,
                    'sla_minutes': sla,
                    'is_active': True
                }
            )

    @classmethod
    def get_matrix(cls):
        cls.ensure_default_matrix()
        return ApprovalMatrixTier.objects.all().order_by('action_type', 'tier_level')

    @classmethod
    def update_matrix(cls, user, updates: list) -> list:
        cls.ensure_default_matrix()
        updated_items = []
        with transaction.atomic():
            for item in updates:
                tier_id = item.get('id')
                if not tier_id:
                    tier_level = item.get('tier_level')
                    action_type = item.get('action_type')
                    tier = ApprovalMatrixTier.objects.filter(tier_level=tier_level, action_type=action_type).first()
                else:
                    tier = ApprovalMatrixTier.objects.filter(id=tier_id).first()

                if not tier:
                    continue

                if 'max_percentage' in item:
                    tier.max_percentage = Decimal(str(item['max_percentage'])) if item['max_percentage'] not in (None, '') else None
                if 'max_amount' in item:
                    tier.max_amount = Decimal(str(item['max_amount'])) if item['max_amount'] not in (None, '') else None
                if 'sla_minutes' in item:
                    tier.sla_minutes = int(item['sla_minutes'])
                if 'is_active' in item:
                    tier.is_active = bool(item['is_active'])
                tier.save()
                updated_items.append(tier)

            BillingAuditEvent.objects.create(
                event_type=AuditEventType.MATRIX_CHANGE,
                severity=AuditSeverity.MEDIUM,
                title='Approval Matrix Updated',
                detail=f"Updated {len(updated_items)} approval matrix tier thresholds",
                actor=user if getattr(user, 'is_authenticated', False) else None
            )
        return updated_items

    @classmethod
    def resolve_user_tier(cls, user_or_tier):
        if isinstance(user_or_tier, str):
            tier_str = user_or_tier.upper().strip()
            if tier_str in ('SUPERVISOR', 'BILLING_SUPERVISOR'):
                return TierLevel.SUPERVISOR
            if tier_str in ('MANAGER', 'BILLING_MANAGER'):
                return TierLevel.MANAGER
            if tier_str in ('ADMIN', 'BILLING_ADMIN', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'):
                return TierLevel.ADMIN
            if tier_str in ('CFO', 'FINANCE_MANAGER'):
                return TierLevel.CFO
            return tier_str
        if not user_or_tier or not getattr(user_or_tier, 'is_authenticated', False):
            return None
        if getattr(user_or_tier, 'is_superuser', False):
            return TierLevel.CFO
        role = getattr(user_or_tier, 'role', None)
        if role == RoleType.FINANCE_MANAGER:
            return TierLevel.CFO
        if role in (RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.BILLING_ADMIN):
            return TierLevel.ADMIN
        if role == RoleType.BILLING_MANAGER:
            return TierLevel.MANAGER
        if role == RoleType.BILLING_SUPERVISOR:
            return TierLevel.SUPERVISOR
        return None

    @classmethod
    def is_within_tier_limit(cls, tier_or_user, action_type: str, amount=None, percent=None) -> bool:
        cls.ensure_default_matrix()
        tier = cls.resolve_user_tier(tier_or_user)
        if not tier:
            return False
        if tier == TierLevel.CFO:
            return True

        action = (action_type or 'DISCOUNT').upper()
        matrix_tier = ApprovalMatrixTier.objects.filter(tier_level=tier, action_type=action, is_active=True).first()
        if not matrix_tier:
            # Fallback to default matrix definition
            for t_level, a_type, max_pct, max_amt, _ in cls.DEFAULT_MATRIX:
                if t_level == tier and a_type == action:
                    amt = Decimal(str(amount)) if amount not in (None, '') else None
                    pct = Decimal(str(percent)) if percent not in (None, '') else None
                    if max_pct is not None and pct is not None and pct > max_pct:
                        return False
                    if max_amt is not None and amt is not None and amt > max_amt:
                        return False
                    return True
            return False

        amt = Decimal(str(amount)) if amount not in (None, '') else None
        pct = Decimal(str(percent)) if percent not in (None, '') else None

        if matrix_tier.max_percentage is not None and pct is not None:
            if pct > matrix_tier.max_percentage:
                return False
        if matrix_tier.max_amount is not None and amt is not None:
            if amt > matrix_tier.max_amount:
                return False
        return True

    @classmethod
    def resolve_approval_tier(cls, action_type: str, amount=None, percent=None) -> str:
        """Finds minimum tier required to approve the request."""
        cls.ensure_default_matrix()
        tiers_order = [TierLevel.SUPERVISOR, TierLevel.MANAGER, TierLevel.ADMIN, TierLevel.CFO]
        action = (action_type or 'DISCOUNT').upper()
        amt = Decimal(str(amount)) if amount not in (None, '') else None
        pct = Decimal(str(percent)) if percent not in (None, '') else None

        for t in tiers_order:
            mt = ApprovalMatrixTier.objects.filter(tier_level=t, action_type=action, is_active=True).first()
            if not mt:
                continue
            pct_ok = True
            if mt.max_percentage is not None and pct is not None:
                pct_ok = (pct <= mt.max_percentage)
            amt_ok = True
            if mt.max_amount is not None and amt is not None:
                amt_ok = (amt <= mt.max_amount)
            if pct_ok and amt_ok:
                return t
        return TierLevel.CFO

    @classmethod
    def test_route_request(cls, action_type: str, amount=0, percent=0) -> dict:
        """Simulate escalation path ladder for testing approval threshold routing."""
        cls.ensure_default_matrix()
        action = (action_type or 'DISCOUNT').upper()
        amt = Decimal(str(amount or '0'))
        pct = Decimal(str(percent or '0'))

        target_tier = cls.resolve_approval_tier(action, amount=amt, percent=pct)
        target_obj = ApprovalMatrixTier.objects.filter(tier_level=target_tier, action_type=action, is_active=True).first()
        sla = target_obj.sla_minutes if target_obj else 60

        ladder = []
        for t in [TierLevel.SUPERVISOR, TierLevel.MANAGER, TierLevel.ADMIN, TierLevel.CFO]:
            mt = ApprovalMatrixTier.objects.filter(tier_level=t, action_type=action, is_active=True).first()
            eligible = cls.is_within_tier_limit(t, action, amount=amt, percent=pct)
            role_map = {
                TierLevel.SUPERVISOR: 'Billing Supervisor',
                TierLevel.MANAGER: 'Billing Manager',
                TierLevel.ADMIN: 'Billing Admin / Hospital Admin',
                TierLevel.CFO: 'Finance Manager / CFO'
            }
            ladder.append({
                'tier': t,
                'role': role_map.get(t, t),
                'max_percentage': float(mt.max_percentage) if mt and mt.max_percentage is not None else None,
                'max_amount': float(mt.max_amount) if mt and mt.max_amount is not None else None,
                'sla_minutes': mt.sla_minutes if mt else 60,
                'eligible': eligible
            })

        return {
            'action_type': action,
            'amount': float(amt),
            'percentage': float(pct),
            'target_tier': target_tier,
            'sla_minutes': sla,
            'required_role': ladder[[x['tier'] for x in ladder].index(target_tier)]['role'],
            'auto_escalated': target_tier != TierLevel.SUPERVISOR,
            'ladder': ladder
        }

    # ---------- Policies ----------
    @classmethod
    def ensure_default_policies(cls):
        """Seed default hospital-wide financial policies if not present."""
        for p in cls.DEFAULT_POLICIES:
            BillingPolicyRule.objects.get_or_create(
                rule_code=p['rule_code'],
                defaults={
                    'rule_name': p['rule_name'],
                    'category': p['category'],
                    'parameter_value': p['parameter_value'],
                    'description': p['description'],
                    'priority': p['priority'],
                    'is_active': True
                }
            )

    @classmethod
    def get_policies(cls):
        cls.ensure_default_policies()
        return BillingPolicyRule.objects.all().order_by('priority', 'rule_code')

    @classmethod
    def update_policy(cls, user, rule_code: str, data: dict) -> BillingPolicyRule:
        cls.ensure_default_policies()
        rule = BillingPolicyRule.objects.filter(rule_code=rule_code).first()
        if not rule:
            raise ValueError(f"Policy rule {rule_code} not found.")

        if 'rule_name' in data:
            rule.rule_name = str(data['rule_name']).strip()
        if 'parameter_value' in data:
            rule.parameter_value = data['parameter_value']
        if 'description' in data:
            rule.description = str(data['description']).strip()
        if 'is_active' in data:
            rule.is_active = bool(data['is_active'])
        if 'priority' in data:
            rule.priority = int(data['priority'])
        rule.save()

        BillingAuditEvent.objects.create(
            event_type=AuditEventType.POLICY_CHANGE,
            severity=AuditSeverity.MEDIUM,
            title=f"Policy {rule.rule_code} Updated",
            detail=f"{rule.rule_name} · {'Active' if rule.is_active else 'Disabled'}",
            actor=user if getattr(user, 'is_authenticated', False) else None
        )
        return rule

    # ---------- Hardware Terminal Lock ----------
    @classmethod
    def validate_hardware_terminal_lock(cls, counter, client_ip: str = None) -> bool:
        cls.ensure_default_policies()
        registry = getattr(counter, 'hardware_registry', None)
        rule = BillingPolicyRule.objects.filter(rule_code='RULE_TERMINAL_LOCK', is_active=True).first()
        rule_enforced = rule.parameter_value.get('enforce_lock', False) if (rule and rule.parameter_value) else False

        is_locked = (registry and registry.is_terminal_lock_enabled) or rule_enforced
        if not is_locked:
            return True

        clean_ip = (client_ip or '').strip()
        allow_loopback = rule.parameter_value.get('allow_loopback', True) if (rule and rule.parameter_value) else True

        expected_ip = ''
        if registry and registry.ip_address:
            expected_ip = registry.ip_address.strip()
        elif counter.ip_terminal_binding:
            expected_ip = counter.ip_terminal_binding.strip()

        if expected_ip:
            if clean_ip != expected_ip:
                # If loopback test and expected is also loopback
                if allow_loopback and clean_ip in ('127.0.0.1', '::1', 'localhost', 'testclient') and expected_ip in ('127.0.0.1', '::1', 'localhost', ''):
                    return True

                BillingAuditEvent.objects.create(
                    event_type=AuditEventType.HARDWARE_LOCK,
                    severity=AuditSeverity.HIGH,
                    title='Hardware Terminal Lockdown Blocked',
                    detail=f"Shift opening blocked on {counter.code}: client IP '{clean_ip}' != allowed '{expected_ip}'",
                    counter=counter
                )
                raise PermissionError(f"Terminal lockdown violation: Counter {counter.code} requires registered IP '{expected_ip}', received '{clean_ip}'.")
        return True

    # ---------- Counters Directory ----------
    @classmethod
    def list_counters(cls):
        counters = BillingCounter.objects.all().prefetch_related('hardware_registry', 'shifts').order_by('code')
        results = []
        for c in counters:
            open_shift = c.shifts.filter(status=ShiftStatus.OPEN).select_related('cashier').first()
            drawer_balance = Decimal('0.00')
            if open_shift:
                reg = CounterShiftControlService.compute_register(open_shift)
                drawer_balance = reg.get('expected_cash', Decimal('0.00'))

            registry = getattr(c, 'hardware_registry', None)
            results.append({
                'id': str(c.id),
                'code': c.code,
                'name': c.name,
                'station_location': c.station_location,
                'station_location_display': c.get_station_location_display(),
                'is_active': c.is_active,
                'ip_terminal_binding': c.ip_terminal_binding,
                'shift_status': 'OPEN' if open_shift else 'CLOSED',
                'active_cashier': (open_shift.cashier.get_full_name() or open_shift.cashier.username) if (open_shift and open_shift.cashier) else None,
                'drawer_cash': float(drawer_balance),
                'hardware': {
                    'id': str(registry.id) if registry else None,
                    'ip_address': registry.ip_address if registry else '',
                    'mac_address': registry.mac_address if registry else '',
                    'thermal_printer_name': registry.thermal_printer_name if registry else '',
                    'pos_terminal_tid': registry.pos_terminal_tid if registry else '',
                    'upi_vpa': registry.upi_vpa if registry else '',
                    'is_terminal_lock_enabled': registry.is_terminal_lock_enabled if registry else False,
                    'status': registry.status if registry else HardwareStatus.ONLINE,
                    'last_heartbeat_at': registry.last_heartbeat_at.isoformat() if (registry and registry.last_heartbeat_at) else None
                } if registry else None
            })
        return results

    @classmethod
    def create_or_update_counter(cls, user, data: dict) -> BillingCounter:
        counter_id = data.get('id')
        code = str(data.get('code', '')).strip().upper()
        name = str(data.get('name', '')).strip()

        if not code or not name:
            raise ValueError("Counter code and name are required.")

        with transaction.atomic():
            if counter_id:
                counter = BillingCounter.objects.get(id=counter_id)
                counter.code = code
                counter.name = name
            else:
                counter, _ = BillingCounter.objects.get_or_create(code=code, defaults={'name': name})
                counter.name = name

            if 'station_location' in data and data['station_location']:
                counter.station_location = data['station_location']
            if 'is_active' in data:
                counter.is_active = bool(data['is_active'])
            if 'ip_terminal_binding' in data:
                counter.ip_terminal_binding = str(data['ip_terminal_binding']).strip()
            counter.save()

            # Hardware registry
            hw_data = data.get('hardware') or {}
            reg, _ = CounterHardwareRegistry.objects.get_or_create(counter=counter)
            if 'ip_address' in hw_data:
                reg.ip_address = str(hw_data['ip_address']).strip()
                if not counter.ip_terminal_binding:
                    counter.ip_terminal_binding = reg.ip_address
                    counter.save(update_fields=['ip_terminal_binding'])
            if 'mac_address' in hw_data:
                reg.mac_address = str(hw_data['mac_address']).strip()
            if 'thermal_printer_name' in hw_data:
                reg.thermal_printer_name = str(hw_data['thermal_printer_name']).strip()
            if 'pos_terminal_tid' in hw_data:
                reg.pos_terminal_tid = str(hw_data['pos_terminal_tid']).strip()
            if 'upi_vpa' in hw_data:
                reg.upi_vpa = str(hw_data['upi_vpa']).strip()
            if 'is_terminal_lock_enabled' in hw_data:
                reg.is_terminal_lock_enabled = bool(hw_data['is_terminal_lock_enabled'])
            if 'status' in hw_data:
                reg.status = hw_data['status']
            reg.save()

        return counter

    @classmethod
    def toggle_counter_status(cls, user, counter_id: str, is_active: bool) -> BillingCounter:
        counter = BillingCounter.objects.get(id=counter_id)
        counter.is_active = bool(is_active)
        counter.save(update_fields=['is_active'])
        BillingAuditEvent.objects.create(
            event_type=AuditEventType.COUNTER_MODE,
            severity=AuditSeverity.LOW,
            title=f"Counter {counter.code} {'Activated' if counter.is_active else 'Deactivated'}",
            counter=counter,
            actor=user if getattr(user, 'is_authenticated', False) else None
        )
        return counter

    # ---------- Staff Roster ----------
    @classmethod
    def get_staff_roster(cls, week_start=None, shift_type=None) -> dict:
        if not week_start:
            today = timezone.localdate()
            week_start = today - timedelta(days=today.weekday())
        elif isinstance(week_start, str):
            week_start = datetime.strptime(week_start[:10], '%Y-%m-%d').date()

        week_dates = [week_start + timedelta(days=i) for i in range(7)]
        week_end = week_dates[-1]

        qs = BillingStaffRoster.objects.filter(
            roster_date__gte=week_start, roster_date__lte=week_end
        ).select_related('counter', 'staff_member', 'assigned_by')

        if shift_type:
            qs = qs.filter(shift_type=shift_type)

        counters = BillingCounter.objects.filter(is_active=True).order_by('code')
        staff_members = User.objects.filter(
            models.Q(role__in=[RoleType.CASHIER, RoleType.BILLING_SUPERVISOR, RoleType.BILLING_ADMIN, RoleType.BILLING_MANAGER]) |
            models.Q(is_staff=True)
        ).order_by('first_name', 'username')

        all_assignments = list(qs)
        is_published = len(all_assignments) > 0 and all(a.is_published for a in all_assignments)

        # Serialized roster
        roster_data = []
        for r in all_assignments:
            roster_data.append({
                'id': str(r.id),
                'counter_id': str(r.counter_id),
                'counter_code': r.counter.code,
                'counter_name': r.counter.name,
                'counter_location': r.counter.get_station_location_display(),
                'staff_id': str(r.staff_member_id),
                'staff_name': r.staff_member.get_full_name() or r.staff_member.username,
                'staff_role': getattr(r.staff_member, 'role', ''),
                'roster_date': r.roster_date.isoformat(),
                'shift_type': r.shift_type,
                'shift_type_display': r.get_shift_type_display(),
                'status': r.status,
                'is_published': r.is_published,
                'notes': r.notes
            })

        return {
            'week_start': week_start.isoformat(),
            'week_end': week_end.isoformat(),
            'week_dates': [d.isoformat() for d in week_dates],
            'is_published': is_published,
            'roster': roster_data,
            'counters': [{'id': str(c.id), 'code': c.code, 'name': c.name, 'location': c.get_station_location_display()} for c in counters],
            'staff': [{'id': str(u.id), 'name': u.get_full_name() or u.username, 'role': getattr(u, 'role', '')} for u in staff_members]
        }

    @classmethod
    def assign_roster(cls, user, assignments: list) -> list:
        if not assignments:
            raise ValueError("No assignments provided.")

        saved_items = []
        with transaction.atomic():
            for item in assignments:
                cid = item.get('counter_id') or item.get('counter')
                sid = item.get('staff_id') or item.get('staff_member')
                rdate = item.get('roster_date')
                stype = item.get('shift_type', StaffShiftType.MORNING)
                notes = item.get('notes', '')

                if not cid or not sid or not rdate:
                    raise ValueError("Counter, staff member, and roster date are required for each shift.")

                if isinstance(rdate, str):
                    rdate = datetime.strptime(rdate[:10], '%Y-%m-%d').date()

                counter = BillingCounter.objects.get(id=cid)
                staff = User.objects.get(id=sid)

                # Overlap Rule 1: No other staff on this counter during this shift
                existing_counter_shift = BillingStaffRoster.objects.filter(
                    counter=counter, roster_date=rdate, shift_type=stype
                ).exclude(staff_member=staff).first()
                if existing_counter_shift:
                    other_name = existing_counter_shift.staff_member.get_full_name() or existing_counter_shift.staff_member.username
                    raise ValueError(f"Counter {counter.code} is already scheduled with {other_name} for {rdate} ({stype}).")

                # Overlap Rule 2: This staff member cannot be scheduled on another counter during this shift
                existing_staff_shift = BillingStaffRoster.objects.filter(
                    staff_member=staff, roster_date=rdate, shift_type=stype
                ).exclude(counter=counter).first()
                if existing_staff_shift:
                    raise ValueError(f"Staff {staff.get_full_name() or staff.username} is already assigned to {existing_staff_shift.counter.code} on {rdate} ({stype}).")

                entry, _ = BillingStaffRoster.objects.update_or_create(
                    counter=counter, roster_date=rdate, shift_type=stype,
                    defaults={
                        'staff_member': staff,
                        'assigned_by': user if getattr(user, 'is_authenticated', False) else None,
                        'status': RosterStatus.SCHEDULED,
                        'notes': notes
                    }
                )
                saved_items.append(entry)
        return saved_items

    @classmethod
    def publish_roster(cls, user, week_start=None) -> int:
        if not week_start:
            today = timezone.localdate()
            week_start = today - timedelta(days=today.weekday())
        elif isinstance(week_start, str):
            week_start = datetime.strptime(week_start[:10], '%Y-%m-%d').date()

        week_end = week_start + timedelta(days=6)
        with transaction.atomic():
            count = BillingStaffRoster.objects.filter(
                roster_date__gte=week_start, roster_date__lte=week_end
            ).update(is_published=True, status=RosterStatus.PUBLISHED)

            BillingAuditEvent.objects.create(
                event_type=AuditEventType.ROSTER_PUBLISHED,
                severity=AuditSeverity.LOW,
                title='Billing Shift Roster Published',
                detail=f"Published {count} shift assignments for week {week_start} to {week_end}",
                actor=user if getattr(user, 'is_authenticated', False) else None
            )
        return count

    # ---------- Executive Overview (Revenue Command A-01) ----------
    @classmethod
    def get_revenue_command_overview(cls, ref_date=None) -> dict:
        cls.ensure_default_matrix()
        cls.ensure_default_policies()

        today = ref_date or timezone.localdate()
        month_start = today.replace(day=1)

        # Revenue today
        payments_today = Payment.objects.filter(payment_date__date=today, payment_status='SUCCESS')
        revenue_today = sum((p.amount for p in payments_today), Decimal('0.00'))

        invoices_today_count = Invoice.objects.filter(created_at__date=today).count()
        paid_invoices_count = Invoice.objects.filter(created_at__date=today, status=InvoiceStatus.PAID).count()

        daily_budget = cls.DAILY_BUDGET
        achievement_pct = round(float((revenue_today / daily_budget) * 100), 1) if daily_budget else 0.0

        # MTD
        payments_mtd = Payment.objects.filter(
            payment_date__date__gte=month_start, payment_date__date__lte=today, payment_status='SUCCESS'
        )
        mtd_revenue = sum((p.amount for p in payments_mtd), Decimal('0.00'))
        mtd_budget = daily_budget * Decimal(str(max(1, today.day)))
        mtd_achievement_pct = round(float((mtd_revenue / mtd_budget) * 100), 1) if mtd_budget else 0.0

        # Counters & Drawer Cash
        counters_total = BillingCounter.objects.filter(is_active=True).count()
        open_shifts = list(CounterShift.objects.filter(status=ShiftStatus.OPEN).select_related('counter', 'cashier'))
        active_counters_count = len(open_shifts)

        total_drawer_cash = Decimal('0.00')
        for s in open_shifts:
            reg = CounterShiftControlService.compute_register(s)
            total_drawer_cash += reg.get('expected_cash', Decimal('0.00'))

        # Leakage at risk
        unbilled_charges = BillableChargeItem.objects.filter(status=ChargeItemStatus.PENDING).select_related('patient')
        unbilled_charges_amt = sum((c.total_amount for c in unbilled_charges), Decimal('0.00'))

        overdue_invoices = Invoice.objects.filter(status=InvoiceStatus.UNPAID, date__lt=today).select_related('patient')
        overdue_invoices_amt = sum((i.balance for i in overdue_invoices), Decimal('0.00'))

        leakage_at_risk_amt = unbilled_charges_amt + overdue_invoices_amt

        leakage_items = []
        for c in unbilled_charges[:5]:
            leakage_items.append({
                'id': str(c.id),
                'type': 'Unbilled Charge',
                'service_name': c.service_name,
                'department': c.department,
                'patient_name': f"{c.patient.first_name} {c.patient.last_name}".strip() if c.patient else 'Unknown',
                'amount': float(c.total_amount),
                'reason': 'Clinical service completed but unbilled'
            })
        for inv in overdue_invoices[:5]:
            leakage_items.append({
                'id': str(inv.id),
                'type': 'Overdue Balance',
                'service_name': f"Invoice #{inv.invoice_number}",
                'department': inv.category,
                'patient_name': f"{inv.patient.first_name} {inv.patient.last_name}".strip() if inv.patient else 'Unknown',
                'amount': float(inv.balance),
                'reason': f"Past payment date ({inv.date})"
            })

        # Escalations pending
        escalations = SupervisorApprovalRequest.objects.filter(
            status__in=[ApprovalStatus.PENDING, ApprovalStatus.ESCALATED]
        ).select_related('patient', 'requested_by', 'invoice').order_by('-created_at')[:10]

        escalation_data = []
        for esc in escalations:
            escalation_data.append({
                'id': str(esc.id),
                'request_number': esc.request_number,
                'request_type': esc.request_type,
                'amount': float(esc.requested_amount or esc.discount_amount or 0),
                'discount_percent': float(esc.discount_percent or 0),
                'status': esc.status,
                'patient_name': f"{esc.patient.first_name} {esc.patient.last_name}".strip() if esc.patient else '',
                'requested_by_name': esc.requested_by.get_full_name() or esc.requested_by.username if esc.requested_by else '',
                'created_at': esc.created_at.isoformat(),
                'sla_expires_at': esc.sla_expires_at.isoformat() if esc.sla_expires_at else None
            })

        # Receivables Aging
        unpaid = Invoice.objects.filter(status=InvoiceStatus.UNPAID)
        aging_0_30 = Decimal('0.00')
        aging_31_60 = Decimal('0.00')
        aging_61_90 = Decimal('0.00')
        aging_90_plus = Decimal('0.00')

        for inv in unpaid:
            inv_date = inv.business_date()  # Invoice.date is a YYYY-MM-DD string
            age_days = (today - inv_date).days if inv_date else 0
            if age_days <= 30:
                aging_0_30 += inv.balance
            elif age_days <= 60:
                aging_31_60 += inv.balance
            elif age_days <= 90:
                aging_61_90 += inv.balance
            else:
                aging_90_plus += inv.balance

        # 30-Day Trend
        trend_30 = []
        for i in range(29, -1, -1):
            d = today - timedelta(days=i)
            day_payments = Payment.objects.filter(payment_date__date=d, payment_status='SUCCESS')
            day_rev = sum((p.amount for p in day_payments), Decimal('0.00'))
            trend_30.append({
                'date': d.isoformat(),
                'day': d.strftime('%d %b'),
                'revenue': float(day_rev),
                'budget': float(daily_budget)
            })

        # Department Revenue Breakdown MTD
        dept_breakdown = {}
        for p in payments_mtd.select_related('invoice'):
            dept = p.invoice.category if (p.invoice and p.invoice.category) else 'OPD'
            dept_breakdown[dept] = dept_breakdown.get(dept, Decimal('0.00')) + p.amount

        dept_data = [
            {'department': k, 'amount': float(v), 'share_percent': round(float((v / mtd_revenue) * 100), 1) if mtd_revenue else 0.0}
            for k, v in dept_breakdown.items()
        ]
        if not dept_data:
            dept_data = [
                {'department': 'OPD', 'amount': 0.0, 'share_percent': 0.0},
                {'department': 'IPD', 'amount': 0.0, 'share_percent': 0.0},
                {'department': 'PHARMACY', 'amount': 0.0, 'share_percent': 0.0},
                {'department': 'LAB', 'amount': 0.0, 'share_percent': 0.0},
            ]

        # External Sync status center
        sync_status = [
            {'system': 'HIS Clinical Core', 'status': 'ONLINE', 'last_sync': timezone.now().isoformat(), 'latency_ms': 24, 'unprocessed_records': 0},
            {'system': 'TPA Cashless Gateway', 'status': 'ONLINE', 'last_sync': (timezone.now() - timedelta(minutes=2)).isoformat(), 'latency_ms': 180, 'unprocessed_records': 3},
            {'system': 'Tally Prime ERP', 'status': 'ONLINE', 'last_sync': (timezone.now() - timedelta(minutes=10)).isoformat(), 'latency_ms': 45, 'unprocessed_records': 0},
            {'system': 'Bank POS / UPI Switch', 'status': 'ONLINE', 'last_sync': timezone.now().isoformat(), 'latency_ms': 12, 'unprocessed_records': 0},
        ]

        return {
            'as_of_date': today.isoformat(),
            'revenue_today': float(revenue_today),
            'daily_budget': float(daily_budget),
            'budget_achievement_pct': achievement_pct,
            'mtd_revenue': float(mtd_revenue),
            'mtd_budget': float(mtd_budget),
            'mtd_achievement_pct': mtd_achievement_pct,
            'invoices_today_count': invoices_today_count,
            'paid_invoices_count': paid_invoices_count,
            'active_counters_count': active_counters_count,
            'total_counters_count': counters_total,
            'drawer_cash_held': float(total_drawer_cash),
            'leakage_at_risk_amount': float(leakage_at_risk_amt),
            'leakage_items': leakage_items,
            'pending_escalations': escalation_data,
            'receivables_aging': {
                'bucket_0_30': float(aging_0_30),
                'bucket_31_60': float(aging_31_60),
                'bucket_61_90': float(aging_61_90),
                'bucket_90_plus': float(aging_90_plus),
                'total_outstanding': float(aging_0_30 + aging_31_60 + aging_61_90 + aging_90_plus)
            },
            'trend_30_days': trend_30,
            'department_revenue': dept_data,
            'sync_center': sync_status,
        }


# ==============================================================================
# PHASE 8: INSURANCE / TPA & CORPORATE BILLING SERVICE
# ==============================================================================

class CorporateCreditLimitExceeded(PermissionError):
    """Raised when an operation would cause corporate credit to exceed allowed ceiling."""
    pass


class TPACorporateBillingService:
    """Phase 8 - Insurance / TPA pre-authorization, claims dossier, co-pay split & corporate credit management."""

    @classmethod
    def calculate_copay_split(cls, total_bill, approved_gop=Decimal('0.00'),
                              non_medical_deductibles=Decimal('0.00'),
                              copay_percent=Decimal('0.00'),
                              room_rent_excess=Decimal('0.00')) -> dict:
        """
        Calculates patient co-pay vs TPA cashless approved balance:
        Patient Co-Pay = Total Bill - Approved GOP Amount + Non-Medical Deductibles.
        Segregates admissible vs non-admissible expenses with exact rounding.
        """
        total = Decimal(str(total_bill or '0.00')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        non_med = Decimal(str(non_medical_deductibles or '0.00')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        gop = Decimal(str(approved_gop or '0.00')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        copay_pct = Decimal(str(copay_percent or '0.00'))
        room_excess = Decimal(str(room_rent_excess or '0.00')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

        # Admissible portion of bill
        admissible = max(Decimal('0.00'), total - non_med - room_excess)

        # Percentage co-pay on admissible amount
        copay_amount = (admissible * copay_pct / Decimal('100.00')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

        # Base insurer liability before GOP cap
        base_insurer_liability = max(Decimal('0.00'), admissible - copay_amount)

        # Actual insurer payable capped at approved Guarantee of Payment
        insurer_payable = min(base_insurer_liability, gop)

        # GOP shortfall (amount insurer did not guarantee) shifts to patient
        gop_shortfall = max(Decimal('0.00'), base_insurer_liability - insurer_payable)

        # Total patient out-of-pocket liability
        patient_copay = (copay_amount + non_med + room_excess + gop_shortfall).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

        # Invariant reconciliation
        diff = total - (patient_copay + insurer_payable)
        if diff != Decimal('0.00'):
            patient_copay += diff

        return {
            'total_bill': float(total),
            'non_medical_deductibles': float(non_med),
            'room_rent_excess': float(room_excess),
            'admissible_amount': float(admissible),
            'copay_percent': float(copay_pct),
            'copay_amount': float(copay_amount),
            'approved_gop': float(gop),
            'insurer_payable': float(insurer_payable),
            'patient_copay': float(patient_copay),
            'gop_shortfall': float(gop_shortfall),
            'breakdown_summary': (
                f"Total ₹{total:,.2f} = Insurer Cashless ₹{insurer_payable:,.2f} + Patient Co-Pay ₹{patient_copay:,.2f} "
                f"(Non-medical ₹{non_med:,.2f}, Co-pay {copay_pct}% ₹{copay_amount:,.2f}, GOP Shortfall ₹{gop_shortfall:,.2f})"
            )
        }

    @classmethod
    def check_corporate_credit_availability(cls, corporate_account_id, requested_charge_amount=Decimal('0.00'), raise_exception: bool = False) -> dict:
        """
        Enforces corporate credit limits: blocks billing if corporate account balance exceeds credit_limit.
        """
        if isinstance(corporate_account_id, CorporateAccount):
            corp = corporate_account_id
        else:
            try:
                uuid.UUID(str(corporate_account_id))
                corp = CorporateAccount.objects.filter(models.Q(id=corporate_account_id) | models.Q(code=corporate_account_id)).first()
            except (ValueError, AttributeError):
                corp = CorporateAccount.objects.filter(code=str(corporate_account_id)).first()

        if not corp:
            raise ValueError(f"Corporate account '{corporate_account_id}' not found.")

        req_amt = Decimal(str(requested_charge_amount or '0.00')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        new_total = corp.utilized_credit + req_amt
        headroom = max(Decimal('0.00'), corp.credit_limit - corp.utilized_credit)
        allowed = (new_total <= corp.credit_limit) and corp.is_active

        util_pct = round(float((corp.utilized_credit / corp.credit_limit) * 100), 1) if corp.credit_limit > Decimal('0.00') else 100.0

        if not allowed and raise_exception:
            BillingAuditEvent.objects.create(
                event_type=AuditEventType.CREDIT_CAP_BLOCKED,
                severity=AuditSeverity.HIGH,
                title=f"Corporate Credit Limit Block · {corp.name}",
                detail=f"Charge of ₹{req_amt:,.2f} blocked. Limit: ₹{corp.credit_limit:,.2f}, Utilized: ₹{corp.utilized_credit:,.2f}, Headroom: ₹{headroom:,.2f}.",
                reference=corp.code
            )
            raise CorporateCreditLimitExceeded(
                f"Corporate credit limit exceeded for {corp.name} ({corp.code}). "
                f"Credit limit: ₹{corp.credit_limit:,.2f}, Currently utilized: ₹{corp.utilized_credit:,.2f}, "
                f"Available headroom: ₹{headroom:,.2f}, Requested: ₹{req_amt:,.2f}. Cash/co-pay collection mandatory."
            )

        return {
            'corporate_id': str(corp.id),
            'corporate_code': corp.code,
            'corporate_name': corp.name,
            'credit_limit': float(corp.credit_limit),
            'utilized_credit': float(corp.utilized_credit),
            'available_headroom': float(headroom),
            'available_credit': float(headroom),
            'requested_amount': float(req_amt),
            'allowed': allowed,
            'utilization_pct': util_pct,
            'warning_flag': util_pct >= 85.0 or not allowed
        }

    @classmethod
    def record_corporate_credit_charge(cls, corporate_account_id, amount: Decimal, reference: str = '', user=None):
        """Atomically charges an amount to corporate account utilized credit after verification."""
        with transaction.atomic():
            target_id = corporate_account_id.id if isinstance(corporate_account_id, CorporateAccount) else corporate_account_id
            try:
                uuid.UUID(str(target_id))
                lookup = models.Q(id=target_id) | models.Q(code=target_id)
            except (ValueError, AttributeError):
                lookup = models.Q(code=str(target_id))
            corp = CorporateAccount.objects.select_for_update().filter(lookup).first()
            if not corp:
                raise ValueError("Corporate account not found.")
            cls.check_corporate_credit_availability(corp, amount, raise_exception=True)
            corp.utilized_credit += Decimal(str(amount))
            corp.save(update_fields=['utilized_credit'])
            return corp

    @classmethod
    def register_pre_auth(cls, patient_id=None, corporate_account_id=None, policy_number: str = '',
                          tpa_member_id: str = '', requested_amount=Decimal('0.00'),
                          admission_id=None, source: str = 'IPD', plan_name: str = '',
                          non_medical_deductibles=Decimal('0.00'), copay_percent=Decimal('0.00'),
                          room_rent_cap=None, user=None, **kwargs) -> TPAClaimRecord:
        """Registers a new cashless insurance pre-authorization request."""
        # Support kwargs patient / corporate_account / created_by
        p_val = patient_id or kwargs.get('patient')
        c_val = corporate_account_id or kwargs.get('corporate_account')
        u_val = user or kwargs.get('created_by')

        if isinstance(p_val, Patient):
            patient = p_val
        else:
            patient = Patient.objects.get(id=p_val)

        if isinstance(c_val, CorporateAccount):
            corp = c_val
        else:
            try:
                uuid.UUID(str(c_val))
                corp = CorporateAccount.objects.filter(models.Q(id=c_val) | models.Q(code=c_val)).first()
            except (ValueError, AttributeError):
                corp = CorporateAccount.objects.filter(code=str(c_val)).first()

        if not corp:
            raise ValueError("Corporate account / Insurer not found.")

        adm = InpatientAdmission.objects.filter(id=admission_id).first() if admission_id else None

        req_num = next_document_number('CLM')
        now_str = timezone.now().strftime('%d %b %H:%M')
        user_name = (u_val.get_full_name() or u_val.username) if u_val else 'Insurance Desk'

        notes = [{
            't': now_str,
            'text': f"Registered pre-authorization request for ₹{float(requested_amount or 0):,.2f} to {corp.name}",
            'by': user_name
        }]

        claim = TPAClaimRecord.objects.create(
            claim_number=req_num,
            patient=patient,
            admission=adm,
            corporate_account=corp,
            policy_number=policy_number,
            tpa_member_id=tpa_member_id,
            requested_amount=Decimal(str(requested_amount or '0.00')),
            pre_auth_amount=Decimal('0.00'),
            pre_auth_status=PreAuthStatus.PENDING,
            source=source or 'IPD',
            plan_name=plan_name or (corp.plans_data[0]['name'] if corp.plans_data else ''),
            non_medical_deductibles=Decimal(str(non_medical_deductibles or '0.00')),
            copay_percent=Decimal(str(copay_percent or corp.co_pay_percentage or '0.00')),
            room_rent_cap=Decimal(str(room_rent_cap or corp.room_rent_ceiling)) if (room_rent_cap or corp.room_rent_ceiling) else None,
            claim_status=ClaimLifecycleStatus.PRE_AUTH,
            tracking_notes=notes
        )
        return claim

    @classmethod
    def update_pre_auth(cls, claim_id=None, status: str = None, approved_amount=None,
                        enhancement_amount=None, gop_letter_number: str = '',
                        non_medical_deductibles=None, denial_reason: str = '',
                        note: str = '', user=None, **kwargs) -> TPAClaimRecord:
        """
        Updates pre-auth status, records GOP approved amount or enhancement, and triggers audit events.
        """
        target_claim = claim_id or kwargs.get('claim_record') or kwargs.get('claim')
        c_id = target_claim.id if isinstance(target_claim, TPAClaimRecord) else target_claim
        u_val = user or kwargs.get('updated_by')

        with transaction.atomic():
            claim = TPAClaimRecord.objects.select_for_update().select_related('patient', 'corporate_account', 'admission').get(id=c_id)
            user_name = (u_val.get_full_name() or u_val.username) if u_val else 'Insurance Desk'
            now_str = timezone.now().strftime('%d %b %H:%M')

            if status:
                claim.pre_auth_status = status
            if approved_amount is not None:
                claim.pre_auth_amount = Decimal(str(approved_amount))
            if enhancement_amount is not None:
                claim.enhancement_amount = Decimal(str(enhancement_amount))
            if gop_letter_number:
                claim.gop_letter_number = gop_letter_number.strip()
            if non_medical_deductibles is not None:
                claim.non_medical_deductibles = Decimal(str(non_medical_deductibles))
            if denial_reason:
                claim.denial_reason = denial_reason.strip()

            log_text = note or f"Pre-auth status updated to {claim.get_pre_auth_status_display()}"
            if claim.pre_auth_amount > Decimal('0.00'):
                log_text += f" · Approved ₹{claim.pre_auth_amount:,.2f}"
            if claim.gop_letter_number:
                log_text += f" (GOP: {claim.gop_letter_number})"

            if claim.pre_auth_status in (PreAuthStatus.APPROVED, PreAuthStatus.PARTIAL):
                if claim.claim_status == ClaimLifecycleStatus.PRE_AUTH:
                    claim.claim_status = ClaimLifecycleStatus.APPROVED
                BillingAuditEvent.objects.create(
                    event_type=AuditEventType.GOP_APPROVED,
                    severity=AuditSeverity.MEDIUM,
                    title=f"Insurance GOP Approved · {claim.corporate_account.name}",
                    detail=f"Claim {claim.claim_number} for {claim.patient.first_name} {claim.patient.last_name}: Approved ₹{claim.pre_auth_amount:,.2f} (GOP #{claim.gop_letter_number or 'N/A'})",
                    actor=user,
                    reference=claim.claim_number
                )
            elif claim.pre_auth_status == PreAuthStatus.REJECTED:
                claim.claim_status = ClaimLifecycleStatus.DENIED
                BillingAuditEvent.objects.create(
                    event_type=AuditEventType.CLAIM_DENIED,
                    severity=AuditSeverity.HIGH,
                    title=f"Insurance Pre-Auth Denied · {claim.corporate_account.name}",
                    detail=f"Claim {claim.claim_number} for {claim.patient.first_name} {claim.patient.last_name} denied. Reason: {claim.denial_reason or 'Not specified'}.",
                    actor=user,
                    reference=claim.claim_number
                )

            current_notes = list(claim.tracking_notes or [])
            current_notes.insert(0, {'t': now_str, 'text': log_text, 'by': user_name})
            claim.tracking_notes = current_notes
            claim.save()
            return claim

    @classmethod
    def compile_claim_dossier(cls, claim_id, user=None) -> dict:
        """
        Claim Dossier Compiler: packages itemized bills, pharmacy ward issue vouchers,
        and diagnostic reports into an exportable insurance claims packet.
        """
        target_id = claim_id.id if isinstance(claim_id, TPAClaimRecord) else claim_id
        claim = TPAClaimRecord.objects.select_related('patient', 'corporate_account', 'admission').get(id=target_id)
        pt = claim.patient

        # 1. Charges and unbilled items
        charge_items = BillableChargeItem.objects.filter(patient=pt).order_by('-created_at')[:25]
        charges_data = [
            {
                'id': str(c.id),
                'code': c.service_code,
                'name': c.service_name,
                'department': c.department,
                'quantity': c.quantity,
                'unit_price': float(c.unit_price),
                'total_amount': float(c.total_amount),
                'status': c.status
            }
            for c in charge_items
        ]
        total_gross = sum((Decimal(str(c['total_amount'])) for c in charges_data), Decimal('0.00'))

        # 2. Lab & Diagnostics
        diagnostics = []
        try:
            from apps.lab.models import LabOrder
            lab_orders = LabOrder.objects.filter(patient=pt).select_related('test').order_by('-order_date')[:10]
            diagnostics = [
                {
                    'order_id': str(lo.id),
                    'order_number': lo.order_number,
                    'test_name': lo.test.name if lo.test else 'Clinical Diagnostic',
                    'status': lo.status,
                    'order_date': lo.order_date.isoformat() if lo.order_date else None
                }
                for lo in lab_orders
            ]
        except Exception:
            pass

        # 3. Clinical Summary
        clinical_summary = {
            'admission_number': claim.admission.admission_number if claim.admission else 'OPD-DIRECT',
            'ward_bed': f"{claim.admission.bed.ward.name} / {claim.admission.bed.bed_number}" if (claim.admission and claim.admission.bed and hasattr(claim.admission.bed, 'ward')) else 'General',
            'admission_date': claim.admission.admission_date.isoformat() if claim.admission else claim.created_at.isoformat(),
            'diagnosis': getattr(claim.admission, 'admitting_diagnosis', 'Clinical Inpatient Care'),
            'discharge_summary_ready': bool(claim.admission and getattr(claim.admission, 'discharge_date', None))
        }

        # 4. Financial Split
        effective_total = total_gross if total_gross > Decimal('0.00') else claim.requested_amount
        split = cls.calculate_copay_split(
            total_bill=effective_total,
            approved_gop=claim.pre_auth_amount,
            non_medical_deductibles=claim.non_medical_deductibles,
            copay_percent=claim.copay_percent
        )

        dossier = {
            'claim_number': claim.claim_number,
            'compiled_at': timezone.now().isoformat(),
            'compiled_by': (user.get_full_name() or user.username) if user else 'Insurance Coordinator',
            'patient_uhid': pt.uhid,
            'patient_name': f"{pt.first_name} {pt.last_name}".strip(),
            'payer': claim.corporate_account.name,
            'policy_number': claim.policy_number,
            'tpa_member_id': claim.tpa_member_id,
            'gop_letter_number': claim.gop_letter_number,
            'clinical_summary': clinical_summary,
            'charges_count': len(charges_data),
            'charges': charges_data,
            'diagnostics_count': len(diagnostics),
            'diagnostics': diagnostics,
            'financial_summary': split,
            'dossier_status': 'COMPILED',
            'ready_for_submission': True
        }

        claim.dossier_data = dossier
        if claim.claim_status in (ClaimLifecycleStatus.PRE_AUTH, ClaimLifecycleStatus.APPROVED):
            claim.claim_status = ClaimLifecycleStatus.CLAIM_FILED
        claim.save(update_fields=['dossier_data', 'claim_status'])
        return dossier

    @classmethod
    def verify_corporate_voucher(cls, voucher_number: str = None, employee_id: str = None,
                                 corporate_code: str = None, patient_id=None,
                                 charge_amount=Decimal('0.00'), user=None) -> dict:
        """
        Validates employee entitlement voucher at registration and checks credit headroom.
        """
        voucher = None
        if voucher_number:
            voucher = CorporateCreditVoucher.objects.select_related('corporate_account', 'patient').filter(voucher_number__iexact=voucher_number.strip()).first()
        elif employee_id and corporate_code:
            voucher = CorporateCreditVoucher.objects.select_related('corporate_account', 'patient').filter(
                employee_id__iexact=employee_id.strip(),
                corporate_account__code__iexact=corporate_code.strip()
            ).order_by('-created_at').first()

        amt = Decimal(str(charge_amount or '0.00')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        today = timezone.now().date()

        if not voucher:
            return {
                'is_valid': False,
                'reason': 'Voucher not found in corporate entitlement registry.',
                'voucher': None
            }

        corp = voucher.corporate_account
        if not corp.is_active:
            return {
                'is_valid': False,
                'reason': f"Corporate contract with {corp.name} is currently inactive or suspended.",
                'voucher': voucher.voucher_number
            }

        if voucher.validity_date < today:
            return {
                'is_valid': False,
                'reason': f"Voucher expired on {voucher.validity_date.strftime('%d %b %Y')}. Contact corporate HR.",
                'voucher': voucher.voucher_number
            }

        if not voucher.is_verified:
            return {
                'is_valid': False,
                'reason': "Voucher has not been verified by corporate coordinator.",
                'voucher': voucher.voucher_number
            }

        # Check voucher remaining ceiling
        v_headroom = voucher.remaining_headroom
        if amt > Decimal('0.00') and amt > v_headroom:
            return {
                'is_valid': False,
                'reason': f"Requested amount ₹{amt:,.2f} exceeds voucher remaining ceiling ₹{v_headroom:,.2f}.",
                'voucher': voucher.voucher_number,
                'remaining_headroom': float(v_headroom)
            }

        # Check corporate account remaining headroom
        corp_headroom = corp.available_credit
        if amt > Decimal('0.00') and amt > corp_headroom:
            return {
                'is_valid': False,
                'reason': f"Corporate credit limit exceeded for {corp.name}. Headroom ₹{corp_headroom:,.2f}.",
                'voucher': voucher.voucher_number,
                'corporate_headroom': float(corp_headroom)
            }

        BillingAuditEvent.objects.create(
            event_type=AuditEventType.VOUCHER_VERIFIED,
            severity=AuditSeverity.LOW,
            title=f"Corporate Voucher Verified · {corp.name}",
            detail=f"Voucher #{voucher.voucher_number} verified for {voucher.employee_name or voucher.employee_id} (Patient: {voucher.patient.first_name} {voucher.patient.last_name}). Ceiling: ₹{voucher.approved_credit_ceiling:,.2f}",
            actor=user,
            reference=voucher.voucher_number
        )

        v_dict = {
            'voucher_id': str(voucher.id),
            'voucher_number': voucher.voucher_number,
            'corporate_id': str(corp.id),
            'corporate_name': corp.name,
            'corporate_code': corp.code,
            'employee_id': voucher.employee_id,
            'employee_name': voucher.employee_name,
            'patient_uhid': voucher.patient.uhid,
            'patient_name': f"{voucher.patient.first_name} {voucher.patient.last_name}".strip(),
            'approved_credit_ceiling': float(voucher.approved_credit_ceiling),
            'utilized_amount': float(voucher.utilized_amount),
            'remaining_headroom': float(v_headroom),
            'corporate_available_credit': float(corp_headroom),
            'validity_date': voucher.validity_date.isoformat(),
            'discount_on_tariff_pct': float(corp.tariff_discount_percent)
        }
        return {
            'is_valid': True,
            'reason': 'Entitlement voucher valid and verified.',
            'voucher': v_dict,
            **v_dict
        }

    @classmethod
    def issue_corporate_voucher(cls, corporate_account_id=None, employee_id: str = '',
                                 patient_id=None, approved_credit_ceiling: Decimal = Decimal('0.00'),
                                 validity_date=None, employee_name: str = '',
                                 relationship: str = 'SELF', notes: str = '',
                                 user=None, **kwargs) -> CorporateCreditVoucher:
        """Issues and registers a new corporate employee entitlement voucher."""
        c_val = corporate_account_id or kwargs.get('corporate_account')
        p_val = patient_id or kwargs.get('patient')
        u_val = user or kwargs.get('issued_by')

        if isinstance(c_val, CorporateAccount):
            corp = c_val
        else:
            try:
                uuid.UUID(str(c_val))
                corp = CorporateAccount.objects.filter(models.Q(id=c_val) | models.Q(code=c_val)).first()
            except (ValueError, AttributeError):
                corp = CorporateAccount.objects.filter(code=str(c_val)).first()

        if not corp:
            raise ValueError("Corporate account not found.")

        if isinstance(p_val, Patient):
            patient = p_val
        else:
            patient = Patient.objects.get(id=p_val)

        v_num = f"CORP-VOUCH-{timezone.now().strftime('%y%m')}-{str(CorporateCreditVoucher.objects.count() + 1).zfill(4)}"

        voucher = CorporateCreditVoucher.objects.create(
            voucher_number=v_num,
            corporate_account=corp,
            employee_id=employee_id.strip(),
            employee_name=employee_name.strip(),
            patient=patient,
            relationship=relationship or 'SELF',
            approved_credit_ceiling=Decimal(str(approved_credit_ceiling)),
            validity_date=validity_date,
            is_verified=True,
            verified_by=u_val,
            notes=notes
        )
        return voucher

    @classmethod
    def seed_default_payers_and_mous(cls):
        """Seeds default insurance providers and corporate clients matching the v3 specification."""
        # 1. Star Health
        star, _ = CorporateAccount.objects.get_or_create(
            code='star',
            defaults={
                'name': 'Star Health',
                'account_type': 'TPA_INSURANCE',
                'credit_limit': Decimal('5000000.00'),
                'co_pay_percentage': Decimal('0.00'),
                'room_rent_ceiling': Decimal('5000.00'),
                'settlement_tat_days': 21,
                'contract_reference': 'Apr 2025 – Mar 2027',
                'tariff_discount_percent': Decimal('10.00'),
                'plans_data': [
                    {'name': 'Family Health Optima', 'copay': 0, 'cap': 5000, 'exc': 'Consumables, cosmetic', 'status': 'ACTIVE'},
                    {'name': 'Senior Citizen Red Carpet', 'copay': 20, 'cap': 3000, 'exc': 'Pre-existing 1st yr', 'status': 'ACTIVE'}
                ],
                'required_docs': ['Pre-auth form', 'Discharge summary', 'Itemised bill', 'Investigation reports', 'KYC'],
                'is_active': True
            }
        )

        # 2. HDFC Ergo
        hdfc, _ = CorporateAccount.objects.get_or_create(
            code='hdfc_ergo',
            defaults={
                'name': 'HDFC Ergo',
                'account_type': 'TPA_INSURANCE',
                'credit_limit': Decimal('4000000.00'),
                'co_pay_percentage': Decimal('10.00'),
                'room_rent_ceiling': Decimal('6000.00'),
                'settlement_tat_days': 14,
                'contract_reference': 'Jan 2025 – Dec 2026',
                'tariff_discount_percent': Decimal('5.00'),
                'plans_data': [
                    {'name': 'Optima Secure', 'copay': 0, 'cap': 7500, 'exc': 'Cosmetic, experimental', 'status': 'ACTIVE'},
                    {'name': 'my:health Suraksha', 'copay': 10, 'cap': 5000, 'exc': 'Vitamins, supplements', 'status': 'ACTIVE'}
                ],
                'required_docs': ['Cashless form', 'Doctor prescription', 'Diagnostic reports', 'Indoor case paper'],
                'is_active': True
            }
        )

        # 3. CGHS
        cghs, _ = CorporateAccount.objects.get_or_create(
            code='cghs',
            defaults={
                'name': 'CGHS',
                'account_type': 'TPA_INSURANCE',
                'credit_limit': Decimal('10000000.00'),
                'co_pay_percentage': Decimal('0.00'),
                'room_rent_ceiling': Decimal('3000.00'),
                'settlement_tat_days': 30,
                'contract_reference': 'Govt Empanelled 2024–2027',
                'tariff_discount_percent': Decimal('20.00'),
                'plans_data': [
                    {'name': 'Central Govt Scheme Standard', 'copay': 0, 'cap': 3000, 'exc': 'Non-formulary pharmacy', 'status': 'ACTIVE'}
                ],
                'required_docs': ['CGHS card copy', 'Permission letter', 'Original bills', 'Stent/Implant stickers'],
                'is_active': True
            }
        )

        # 4. Infosys Corporate
        inf, _ = CorporateAccount.objects.get_or_create(
            code='INF',
            defaults={
                'name': 'Infosys',
                'account_type': 'CORPORATE',
                'credit_limit': Decimal('3000000.00'),
                'utilized_credit': Decimal('1845000.00'),
                'co_pay_percentage': Decimal('10.00'),
                'settlement_tat_days': 30,
                'billing_cycle': 'Monthly · 30-day credit',
                'tariff_discount_percent': Decimal('10.00'),
                'covered_services': ['OPD consultation', 'Diagnostics', 'Annual health check', 'Pharmacy (generic)'],
                'signatories': [['R. Natarajan', 'HR Benefits Lead'], ['S. Kapoor', 'Admin Manager']],
                'is_active': True
            }
        )

        # 5. ONGC Corporate
        ong, _ = CorporateAccount.objects.get_or_create(
            code='ONG',
            defaults={
                'name': 'ONGC',
                'account_type': 'CORPORATE',
                'credit_limit': Decimal('5000000.00'),
                'utilized_credit': Decimal('4950000.00'),
                'co_pay_percentage': Decimal('0.00'),
                'settlement_tat_days': 15,
                'billing_cycle': 'Fortnightly · 15-day credit',
                'tariff_discount_percent': Decimal('15.00'),
                'covered_services': ['Emergency care', 'IPD surgeries', 'Cardiac packages', 'Diagnostics'],
                'signatories': [['D. K. Sarma', 'DGM HR'], ['P. Verma', 'Medical Officer']],
                'is_active': True
            }
        )


# =====================================================================
# PHASE 9: IPD RUNNING LEDGER & FINANCIAL DISCHARGE CLEARANCE SERVICE
# =====================================================================

class IPDRunningLedgerService:
    """Phase 9: Real-time IPD running ledger, midnight bed tariff accrual,
    interim deposit monitor, final bill consolidation, and Financial Discharge Clearance Gate.
    """

    CHECKLIST_KEYS = [
        ('pending_labs', 'Pending lab reports confirmed'),
        ('pharmacy_returns', 'Pharmacy ward returns credited'),
        ('ot_procedures', 'OT / procedure lines posted'),
        ('clock_stopped', 'Room-rent clock stopped')
    ]

    @classmethod
    def _resolve_admission(cls, admission_id_or_number) -> InpatientAdmission:
        """Resolves InpatientAdmission by UUID or admission_number."""
        if isinstance(admission_id_or_number, InpatientAdmission):
            return admission_id_or_number
        s = str(admission_id_or_number)
        adm = None
        if len(s) == 36:
            try:
                adm = InpatientAdmission.objects.filter(id=s).first()
            except Exception:
                pass
        if not adm:
            adm = InpatientAdmission.objects.filter(admission_number=s).first()
        if not adm:
            raise InpatientAdmission.DoesNotExist(f"Admission '{admission_id_or_number}' not found.")
        return adm

    @classmethod
    def accrue_daily_bed_tariffs(cls, target_date=None, user=None):
        """Midnight room cron: Scans active admissions and accrues BED_TARIFF,
        NURSING_CARE, and RESIDENT_ROUNDS for the specified target date.
        Idempotent: skips admissions that already have BED_TARIFF on target_date.
        """
        if target_date is None:
            target_date = timezone.now().date()
        elif isinstance(target_date, str):
            target_date = datetime.strptime(target_date, '%Y-%m-%d').date()

        active_admissions = InpatientAdmission.objects.filter(
            status__in=['ADMITTED', 'OBSERVATION', 'POST_OP', 'DISCHARGE_INITIATED']
        ).select_related('patient', 'bed', 'admitting_doctor')

        accrued_items = []
        skipped_count = 0

        with transaction.atomic():
            for adm in active_admissions:
                # Idempotency check: did we already charge bed tariff for this target_date?
                already_charged = IPDRunningLedger.objects.filter(
                    admission=adm,
                    date=target_date,
                    item_type=IPDRunningLedgerItemType.BED_TARIFF
                ).exists()

                if already_charged:
                    skipped_count += 1
                    continue

                # 1. BED TARIFF
                bed = adm.bed
                bed_rate = Decimal('1500.00')
                bed_code = 'BED-GEN'
                bed_desc = f"Bed Charges · {adm.ward_name}"

                if bed:
                    bed_rate = bed.daily_tariff if bed.daily_tariff and bed.daily_tariff > 0 else Decimal('1500.00')
                    bed_code = f"BED-{bed.bed_type.upper()}"
                    bed_desc = f"Bed Charges · {adm.ward_name} ({bed.bed_number})"

                # Try resolving tariff from TariffMaster if exists
                tariff = TariffMaster.objects.filter(code=bed_code, is_active=True).first()
                if tariff:
                    bed_rate = tariff.base_price

                bed_entry = IPDRunningLedger.objects.create(
                    admission=adm,
                    date=target_date,
                    item_type=IPDRunningLedgerItemType.BED_TARIFF,
                    service_code=bed_code,
                    description=bed_desc,
                    quantity=1,
                    unit_price=bed_rate,
                    amount=bed_rate
                )
                accrued_items.append(bed_entry)

                # 2. NURSING CARE
                ward_upper = adm.ward_name.upper()
                if 'ICU' in ward_upper or 'HDU' in ward_upper or (bed and 'ICU' in bed.bed_type.upper()):
                    nursing_rate = Decimal('1500.00')
                    nursing_desc = f"ICU Intensive Nursing Care & Monitoring · {adm.ward_name}"
                elif 'PRIVATE' in ward_upper or 'DELUXE' in ward_upper:
                    nursing_rate = Decimal('800.00')
                    nursing_desc = f"Specialized Nursing Care · {adm.ward_name}"
                else:
                    nursing_rate = Decimal('500.00')
                    nursing_desc = f"Daily Ward Nursing Care · {adm.ward_name}"

                nursing_entry = IPDRunningLedger.objects.create(
                    admission=adm,
                    date=target_date,
                    item_type=IPDRunningLedgerItemType.NURSING_CARE,
                    service_code='NUR-CARE-DAILY',
                    description=nursing_desc,
                    quantity=1,
                    unit_price=nursing_rate,
                    amount=nursing_rate
                )
                accrued_items.append(nursing_entry)

                # 3. RESIDENT DOCTOR ROUNDS
                rounds_rate = Decimal('600.00')
                rounds_entry = IPDRunningLedger.objects.create(
                    admission=adm,
                    date=target_date,
                    item_type=IPDRunningLedgerItemType.RESIDENT_ROUNDS,
                    service_code='DOC-RND-DAILY',
                    description=f"Resident Inpatient Clinical Rounds · {adm.ward_name}",
                    quantity=1,
                    unit_price=rounds_rate,
                    amount=rounds_rate
                )
                accrued_items.append(rounds_entry)

            # Audit event
            BillingAuditEvent.objects.create(
                event_type=AuditEventType.DAILY_TARIFF_ACCRUED,
                severity=AuditSeverity.LOW,
                title=f"Midnight Daily Tariff Accrual for {target_date}",
                detail=f"Accrued bed, nursing, and resident rounds charges for {len(accrued_items) // 3} admissions ({skipped_count} already accrued).",
                actor=user,
                reference=f"CRON-{target_date.strftime('%Y%m%d')}"
            )

        return {
            'target_date': target_date.isoformat(),
            'total_accrued_entries': len(accrued_items),
            'admissions_processed': len(accrued_items) // 3,
            'admissions_skipped': skipped_count
        }

    @classmethod
    def add_running_charge(cls, admission_id_or_number, item_type: str, description: str,
                           amount: Decimal, service_code: str = '', quantity: int = 1,
                           unit_price: Decimal = None, entry_date=None, user=None) -> IPDRunningLedger:
        """Appends a department or procedure charge to the inpatient running ledger."""
        adm = cls._resolve_admission(admission_id_or_number)
        if entry_date is None:
            entry_date = timezone.now().date()
        elif isinstance(entry_date, str):
            entry_date = datetime.strptime(entry_date, '%Y-%m-%d').date()

        amt = Decimal(str(amount))
        qty = int(quantity) if quantity else 1
        u_price = Decimal(str(unit_price)) if unit_price is not None else amt / qty

        entry = IPDRunningLedger.objects.create(
            admission=adm,
            date=entry_date,
            item_type=item_type,
            service_code=service_code or 'MISC-IPD',
            description=description,
            quantity=qty,
            unit_price=u_price,
            amount=amt
        )
        return entry

    @classmethod
    def get_running_bill_summary(cls, admission_id_or_number) -> dict:
        """Itemized ledger calculation against patient deposits and insurance approvals."""
        adm = cls._resolve_admission(admission_id_or_number)
        ledger_entries = list(IPDRunningLedger.objects.filter(admission=adm).order_by('date', 'created_at'))

        gross_ledger = sum((e.amount for e in ledger_entries), Decimal('0.00'))

        # Split by category
        cat_map = {
            'BED_TARIFF': ('Bed & nursing', Decimal('0.00')),
            'NURSING_CARE': ('Nursing care', Decimal('0.00')),
            'RESIDENT_ROUNDS': ('Doctor visits', Decimal('0.00')),
            'OT_PROCEDURE': ('OT & procedures', Decimal('0.00')),
            'LAB_TEST': ('Lab & imaging', Decimal('0.00')),
            'PHARMACY_ISSUE': ('Pharmacy', Decimal('0.00'))
        }
        for e in ledger_entries:
            key = e.item_type
            if key in cat_map:
                name, current = cat_map[key]
                cat_map[key] = (name, current + e.amount)
            else:
                cat_map[key] = (e.description, e.amount)

        split_list = [
            {'category': k, 'label': label, 'amount': float(val)}
            for k, (label, val) in cat_map.items() if val > 0
        ]

        # Calculate deposits
        deposits = PatientDeposit.objects.filter(
            models.Q(ipd_admission=adm) | models.Q(patient=adm.patient, ipd_admission__isnull=True),
            status__in=[DepositStatus.ACTIVE, DepositStatus.PARTIALLY_UTILIZED]
        )
        total_deposit_held = sum((d.available_balance for d in deposits), Decimal('0.00'))
        total_deposit_received = sum((d.deposit_amount for d in deposits), Decimal('0.00'))

        # Calculate TPA cover if present
        tpa_claim = TPAClaimRecord.objects.filter(patient=adm.patient).order_by('-created_at').first()
        preauth_amt = Decimal('0.00')
        tpa_settled_amt = Decimal('0.00')
        tpa_label = 'General'
        has_tpa = False

        if tpa_claim and tpa_claim.pre_auth_status in [PreAuthStatus.APPROVED, PreAuthStatus.ENHANCED]:
            has_tpa = True
            preauth_amt = tpa_claim.pre_auth_amount + (tpa_claim.enhancement_amount or Decimal('0.00'))
            tpa_label = f"{tpa_claim.insurance_provider} · TPA"
            if tpa_claim.claim_status == ClaimLifecycleStatus.SETTLED and tpa_claim.settled_amount:
                tpa_settled_amt = tpa_claim.settled_amount

        tpa_effective = tpa_settled_amt if tpa_settled_amt > 0 else preauth_amt
        total_cover = total_deposit_held + tpa_effective

        if total_cover > Decimal('0.00'):
            util_pct = min(Decimal('999.0'), (gross_ledger / total_cover * Decimal('100')).quantize(Decimal('0.1')))
        else:
            util_pct = Decimal('100.0') if gross_ledger > 0 else Decimal('0.0')

        # Outstanding balance (net balance)
        net_balance = (gross_ledger - total_deposit_held - (tpa_settled_amt if tpa_settled_amt > 0 else Decimal('0.00'))).quantize(Decimal('0.01'))

        # Clearance record
        clearance = FinancialDischargeClearance.objects.filter(admission=adm).first()
        is_cleared = clearance.clearance_status in [DischargeClearanceStatus.CLEARED, DischargeClearanceStatus.OVERRIDDEN] if clearance else False

        # Checklist status
        checklist_state = clearance.checklist_confirmed if clearance and clearance.checklist_confirmed else {}
        checklist_items = [
            {'key': k, 'label': label, 'done': bool(checklist_state.get(k, False))}
            for k, label in cls.CHECKLIST_KEYS
        ]
        checklist_done = all(c['done'] for c in checklist_items) if checklist_items else False

        # Active demands
        active_demands = InterimDepositDemand.objects.filter(admission=adm).order_by('-issued_at')
        last_demand = active_demands.first()

        days_admitted = max(1, (timezone.now().date() - adm.admission_date.date()).days + 1)

        return {
            'admission_id': str(adm.id),
            'admission_number': adm.admission_number,
            'patient_uhid': adm.patient.uhid,
            'patient_name': f"{adm.patient.first_name} {adm.patient.last_name}".strip(),
            'patient_gender': adm.patient.gender,
            'patient_dob': adm.patient.date_of_birth.isoformat() if hasattr(adm.patient.date_of_birth, 'isoformat') else (str(adm.patient.date_of_birth) if adm.patient.date_of_birth else None),
            'ward_name': adm.ward_name,
            'bed_number': adm.bed.bed_number if adm.bed else None,
            'consultant': (adm.admitting_doctor.user.get_full_name() or adm.admitting_doctor.user.username) if adm.admitting_doctor and adm.admitting_doctor.user else 'Treating Consultant',
            'admission_date': adm.admission_date.isoformat(),
            'discharge_date': adm.discharge_date.isoformat() if adm.discharge_date else None,
            'days_admitted': days_admitted,
            'admission_status': adm.status,
            'ledger_total': gross_ledger,
            'total_deposit_balance': total_deposit_held,
            'total_deposit_received': total_deposit_received,
            'has_tpa': has_tpa,
            'tpa_provider': tpa_label,
            'tpa_preauth_amount': preauth_amt,
            'tpa_settled_amount': tpa_settled_amt,
            'total_cover': total_cover,
            'utilization_percent': float(util_pct),
            'is_over_threshold': util_pct >= Decimal('80.0'),
            'net_balance': net_balance,
            'is_cleared': is_cleared,
            'clearance_status': clearance.clearance_status if clearance else 'NOT_INITIATED',
            'gate_pass_token': clearance.qr_verification_token if clearance and is_cleared else None,
            'cleared_at': clearance.cleared_at.isoformat() if clearance and clearance.cleared_at else None,
            'category_split': split_list,
            'items_count': len(ledger_entries),
            'checklist': checklist_items,
            'checklist_complete': checklist_done,
            'topup_demanded': bool(last_demand and last_demand.status == InterimDemandStatus.PENDING),
            'last_demand_number': last_demand.demand_number if last_demand else None
        }

    @classmethod
    def update_discharge_checklist(cls, admission_id_or_number, checklist_dict: dict, user=None):
        """Toggles checklist items for medical discharge reconciliation."""
        adm = cls._resolve_admission(admission_id_or_number)
        clearance, _ = FinancialDischargeClearance.objects.get_or_create(
            admission=adm,
            defaults={
                'qr_verification_token': f"PENDING-{uuid.uuid4().hex[:8].upper()}",
                'clearance_status': DischargeClearanceStatus.PENDING_SETTLEMENT
            }
        )
        cur = clearance.checklist_confirmed or {}
        cur.update(checklist_dict)
        clearance.checklist_confirmed = cur
        clearance.save(update_fields=['checklist_confirmed'])
        return clearance.checklist_confirmed

    @classmethod
    def issue_interim_demand(cls, admission_id_or_number, demanded_amount: Decimal = None,
                             notes: str = '', user=None) -> InterimDepositDemand:
        """Generates an interim deposit demand letter when running ledger exceeds deposit buffer."""
        adm = cls._resolve_admission(admission_id_or_number)
        summary = cls.get_running_bill_summary(adm)

        if demanded_amount is None or Decimal(str(demanded_amount)) <= Decimal('0.00'):
            # Suggest deposit to restore 125% cover over current ledger
            sugg = (summary['ledger_total'] * Decimal('1.25')) - summary['total_deposit_balance']
            demanded_amount = max(Decimal('5000.00'), sugg.quantize(Decimal('1000.00')))
        else:
            demanded_amount = Decimal(str(demanded_amount)).quantize(Decimal('0.01'))

        # Generate demand number: DM-YYYYMM-XXXXX
        stem = f"DM-{timezone.now().strftime('%Y%m')}-"
        last = (InterimDepositDemand.objects.filter(demand_number__startswith=stem)
                .order_by('-demand_number').values_list('demand_number', flat=True).first())
        seq = int(last.rsplit('-', 1)[-1]) + 1 if last else 1
        demand_no = f"{stem}{str(seq).zfill(5)}"

        demand = InterimDepositDemand.objects.create(
            admission=adm,
            demand_number=demand_no,
            running_total=summary['ledger_total'],
            deposit_balance=summary['total_deposit_balance'],
            demanded_amount=demanded_amount,
            status=InterimDemandStatus.PENDING,
            issued_by=user,
            notes=notes,
            notified_attendant=True
        )

        BillingAuditEvent.objects.create(
            event_type=AuditEventType.INTERIM_DEMAND_ISSUED,
            severity=AuditSeverity.MEDIUM,
            title=f"Interim Deposit Demand {demand_no} Issued",
            detail=f"{adm.patient.first_name} {adm.patient.last_name} ({adm.admission_number}). Ledger: ₹{summary['ledger_total']:,.2f}, Deposit: ₹{summary['total_deposit_balance']:,.2f}, Demanded: ₹{demanded_amount:,.2f}.",
            actor=user,
            reference=demand_no
        )

        return demand

    @classmethod
    def consolidate_final_discharge_bill(cls, admission_id_or_number, cashier=None,
                                         discount_percent: Decimal = Decimal('0.00'),
                                         notes: str = '', counter=None, shift=None):
        """Consolidates running ledger charges into a final invoice, consumes available deposits,
        adjusts TPA approvals, and computes net balance for patient discharge settlement.
        """
        adm = cls._resolve_admission(admission_id_or_number)
        unbilled_entries = list(IPDRunningLedger.objects.filter(admission=adm, is_interim_billed=False))
        if not unbilled_entries:
            # If all are already flagged or none exist, fetch all ledger entries
            unbilled_entries = list(IPDRunningLedger.objects.filter(admission=adm))

        gross_amount = sum((e.amount for e in unbilled_entries), Decimal('0.00'))
        disc_pct = Decimal(str(discount_percent))
        discount_amount = (gross_amount * disc_pct / Decimal('100')).quantize(Decimal('0.01'))
        net_amount = gross_amount - discount_amount

        with transaction.atomic():
            # Create Final Invoice
            inv_number = next_document_number('INV')
            invoice = Invoice.objects.create(
                invoice_number=inv_number,
                patient=adm.patient,
                category=InvoiceCategory.IPD,
                encounter_type='IPD',
                date=timezone.now().strftime('%Y-%m-%d'),
                counter=counter,
                shift=shift,
                cashier=cashier,
                subtotal=gross_amount,
                discount=discount_amount,
                total=net_amount,
                advance_deducted=Decimal('0.00'),
                balance=net_amount,
                paid=Decimal('0.00'),
                status=InvoiceStatus.UNPAID
            )

            # Create Invoice Items and link ledger
            for e in unbilled_entries:
                item = InvoiceItem.objects.create(
                    invoice=invoice,
                    source='IPD',
                    department='GENERAL',
                    description=e.description,
                    service_code=e.service_code,
                    qty=e.quantity,
                    unit_price=e.unit_price,
                    total=e.amount
                )
                e.invoice_item = item
                e.is_interim_billed = True
                e.save(update_fields=['invoice_item', 'is_interim_billed'])

            # Adjust deposits
            available_deposits = PatientDeposit.objects.filter(
                models.Q(ipd_admission=adm) | models.Q(patient=adm.patient, ipd_admission__isnull=True),
                status__in=[DepositStatus.ACTIVE, DepositStatus.PARTIALLY_UTILIZED]
            ).order_by('created_at')

            remaining_to_pay = net_amount
            total_deposit_applied = Decimal('0.00')

            for dep in available_deposits:
                if remaining_to_pay <= Decimal('0.00'):
                    break
                can_apply = min(dep.available_balance, remaining_to_pay)
                dep.utilized_amount += can_apply
                dep.available_balance -= can_apply
                if dep.available_balance <= Decimal('0.00'):
                    dep.status = DepositStatus.EXHAUSTED
                else:
                    dep.status = DepositStatus.PARTIALLY_UTILIZED
                dep.save(update_fields=['utilized_amount', 'available_balance', 'status'])
                total_deposit_applied += can_apply
                remaining_to_pay -= can_apply

            # Adjust TPA cover if present
            tpa_claim = TPAClaimRecord.objects.filter(patient=adm.patient).order_by('-created_at').first()
            tpa_covered = Decimal('0.00')
            if tpa_claim and tpa_claim.pre_auth_status in [PreAuthStatus.APPROVED, PreAuthStatus.ENHANCED]:
                approved_amt = tpa_claim.settled_amount if tpa_claim.settled_amount and tpa_claim.claim_status == ClaimLifecycleStatus.SETTLED else tpa_claim.pre_auth_amount
                tpa_covered = min(approved_amt, remaining_to_pay)
                remaining_to_pay -= tpa_covered

            invoice.advance_deducted = total_deposit_applied
            invoice.paid = total_deposit_applied
            invoice.balance = max(Decimal('0.00'), remaining_to_pay)
            if remaining_to_pay <= Decimal('0.00'):
                invoice.status = InvoiceStatus.PAID
            invoice.save(update_fields=['advance_deducted', 'paid', 'balance', 'status'])

            # Mark admission discharge timestamp (stop clock)
            if not adm.discharge_date:
                adm.discharge_date = timezone.now()
            adm.save(update_fields=['discharge_date'])

            # Update or create FinancialDischargeClearance
            clearance_status = DischargeClearanceStatus.CLEARED if remaining_to_pay <= Decimal('0.00') else DischargeClearanceStatus.PENDING_SETTLEMENT
            stem = f"FDP-{timezone.now().strftime('%Y%m')}-"
            pass_token = f"{stem}{uuid.uuid4().hex[:5].upper()}"

            clearance, _ = FinancialDischargeClearance.objects.update_or_create(
                admission=adm,
                defaults={
                    'final_invoice': invoice,
                    'clearance_status': clearance_status,
                    'net_payable': net_amount,
                    'deposit_applied': total_deposit_applied,
                    'insurance_covered': tpa_covered,
                    'patient_paid': Decimal('0.00'),
                    'cleared_by': cashier if clearance_status == DischargeClearanceStatus.CLEARED else None,
                    'cleared_at': timezone.now() if clearance_status == DischargeClearanceStatus.CLEARED else None,
                    'qr_verification_token': pass_token if clearance_status == DischargeClearanceStatus.CLEARED else f"PENDING-{uuid.uuid4().hex[:6].upper()}",
                    'notes': notes
                }
            )

        return {
            'invoice_id': str(invoice.id),
            'invoice_number': invoice.invoice_number,
            'gross_amount': float(gross_amount),
            'discount_amount': float(discount_amount),
            'net_amount': float(net_amount),
            'deposit_applied': float(total_deposit_applied),
            'insurance_covered': float(tpa_covered),
            'balance_due': float(max(Decimal('0.00'), remaining_to_pay)),
            'excess_deposit': float(max(Decimal('0.00'), -remaining_to_pay)),
            'clearance_status': clearance.clearance_status,
            'qr_verification_token': clearance.qr_verification_token if clearance.clearance_status == DischargeClearanceStatus.CLEARED else None
        }

    @classmethod
    def issue_financial_discharge_clearance(cls, admission_id_or_number, cashier,
                                            override_reason: str = '',
                                            checklist_confirmed: dict = None,
                                            notes: str = '') -> FinancialDischargeClearance:
        """FINANCIAL DISCHARGE CLEARANCE GATE:
        Hard invariant ensuring ₹0.00 balance before generating QR-coded clearance pass token.
        Strictly rejects clearance if even ₹1.00 is outstanding unless an audited supervisor
        override is provided with a mandatory justification reason.
        """
        adm = cls._resolve_admission(admission_id_or_number)
        summary = cls.get_running_bill_summary(adm)
        net_balance = summary['net_balance']

        has_override = bool(override_reason and len(override_reason.strip()) >= 5)

        # HARD INVARIANT: Block clearance if outstanding balance > 0 and no valid override
        if net_balance > Decimal('0.00') and not has_override:
            raise ValueError(
                f"Financial Discharge Clearance Gate BLOCKED: Outstanding balance is ₹{net_balance:,.2f}. "
                f"Strict hospital invariant requires ₹0.00 zero-balance settlement or an authorized supervisor "
                f"override reason (minimum 5 characters) before patient exit pass can be issued."
            )

        stem = f"FDP-{timezone.now().strftime('%Y%m')}-"
        # Find next sequential gate pass number
        last_pass = (FinancialDischargeClearance.objects.filter(qr_verification_token__startswith=stem)
                     .order_by('-qr_verification_token').values_list('qr_verification_token', flat=True).first())
        seq = int(last_pass.rsplit('-', 1)[-1]) + 1 if last_pass and last_pass.rsplit('-', 1)[-1].isdigit() else (
            int(uuid.uuid4().hex[:5], 16) % 90000 + 10000
        )
        gate_token = f"{stem}{str(seq).zfill(5)}"

        clearance_status = DischargeClearanceStatus.OVERRIDDEN if (net_balance > Decimal('0.00') and has_override) else DischargeClearanceStatus.CLEARED

        full_checklist = {
            'pending_labs': True,
            'pharmacy_returns': True,
            'ot_procedures': True,
            'clock_stopped': True
        }
        if checklist_confirmed:
            full_checklist.update(checklist_confirmed)

        with transaction.atomic():
            clearance, _ = FinancialDischargeClearance.objects.update_or_create(
                admission=adm,
                defaults={
                    'clearance_status': clearance_status,
                    'net_payable': summary['ledger_total'],
                    'deposit_applied': summary['total_deposit_balance'],
                    'insurance_covered': summary['tpa_settled_amount'] or summary['tpa_preauth_amount'],
                    'patient_paid': max(Decimal('0.00'), summary['ledger_total'] - summary['total_deposit_balance'] - (summary['tpa_settled_amount'] or Decimal('0.00')) - net_balance),
                    'cleared_by': cashier,
                    'cleared_at': timezone.now(),
                    'qr_verification_token': gate_token,
                    'override_reason': override_reason.strip() if has_override else '',
                    'checklist_confirmed': full_checklist,
                    'notes': notes
                }
            )

            # Update admission status to DISCHARGE_INITIATED if still ADMITTED
            if adm.status in ['ADMITTED', 'OBSERVATION', 'POST_OP']:
                adm.status = 'DISCHARGE_INITIATED'
                if not adm.discharge_date:
                    adm.discharge_date = timezone.now()
                adm.save(update_fields=['status', 'discharge_date'])

            # Log audit event
            BillingAuditEvent.objects.create(
                event_type=AuditEventType.DISCHARGE_CLEARED,
                severity=AuditSeverity.HIGH if clearance_status == DischargeClearanceStatus.OVERRIDDEN else AuditSeverity.LOW,
                title=f"Financial Discharge Clearance Gate Pass {gate_token} Issued",
                detail=f"Patient {adm.patient.first_name} {adm.patient.last_name} ({adm.admission_number}). Status: {clearance_status}. " +
                       (f"Audited Override Reason: '{override_reason}'." if has_override else "Zero-balance verified."),
                actor=cashier,
                reference=gate_token
            )

        return clearance

    @classmethod
    def verify_discharge_clearance_token(cls, token: str, verifier_user=None) -> dict:
        """Security and nursing gate verification endpoint. Validates QR pass token before patient exit."""
        if not token:
            return {'is_valid': False, 'message': 'Verification token is required.'}

        clean_token = token.strip()
        clearance = FinancialDischargeClearance.objects.filter(
            qr_verification_token=clean_token
        ).select_related('admission', 'admission__patient', 'admission__bed', 'cleared_by').first()

        if not clearance:
            return {
                'is_valid': False,
                'message': f"Gate pass token '{clean_token}' was NOT found in Central Billing clearance records. Patient exit is prohibited."
            }

        if clearance.clearance_status not in [DischargeClearanceStatus.CLEARED, DischargeClearanceStatus.OVERRIDDEN]:
            return {
                'is_valid': False,
                'status': clearance.clearance_status,
                'admission_number': clearance.admission.admission_number,
                'message': f"Discharge pass token is in state '{clearance.clearance_status}'. Patient has not cleared billing settlement. Exit prohibited."
            }

        # Log gate exit check audit
        BillingAuditEvent.objects.create(
            event_type=AuditEventType.DISCHARGE_GATE_VERIFIED,
            severity=AuditSeverity.LOW,
            title=f"Discharge Gate Pass {clean_token} Verified at Exit",
            detail=f"Patient {clearance.admission.patient.first_name} {clearance.admission.patient.last_name} ({clearance.admission.admission_number}) cleared for exit.",
            actor=verifier_user,
            reference=clean_token
        )

        return {
            'is_valid': True,
            'message': 'Financial clearance verified. Patient authorized for ward exit and discharge release.',
            'token': clean_token,
            'clearance_status': clearance.clearance_status,
            'admission_number': clearance.admission.admission_number,
            'patient_name': f"{clearance.admission.patient.first_name} {clearance.admission.patient.last_name}".strip(),
            'uhid': clearance.admission.patient.uhid,
            'ward_name': clearance.admission.ward_name,
            'bed_number': clearance.admission.bed.bed_number if clearance.admission.bed else None,
            'cleared_at': clearance.cleared_at.isoformat() if clearance.cleared_at else None,
            'cleared_by': clearance.cleared_by.get_full_name() or clearance.cleared_by.username if clearance.cleared_by else 'Billing Executive',
            'is_override': clearance.clearance_status == DischargeClearanceStatus.OVERRIDDEN,
            'override_reason': clearance.override_reason or '',
            'net_payable': float(clearance.net_payable),
            'deposit_applied': float(clearance.deposit_applied)
        }

    @classmethod
    def list_ipd_admissions_overview(cls) -> dict:
        """Returns KPI metrics and list of all active admissions for E-04 IPD Running Bills view."""
        active_admissions = InpatientAdmission.objects.filter(
            status__in=['ADMITTED', 'OBSERVATION', 'POST_OP', 'DISCHARGE_INITIATED']
        ).select_related('patient', 'bed', 'admitting_doctor')

        rows = []
        total_deposits_held = Decimal('0.00')
        over_80_count = 0
        discharge_today_count = 0
        awaiting_tpa_count = 0

        for adm in active_admissions:
            summary = cls.get_running_bill_summary(adm)
            total_deposits_held += summary['total_deposit_balance']

            status_val = 'RUNNING'
            if summary['is_cleared']:
                status_val = 'CLEARED'
            elif summary['has_tpa'] and summary['tpa_settled_amount'] <= 0 and adm.status == 'DISCHARGE_INITIATED':
                status_val = 'AWAITING_TPA'
                awaiting_tpa_count += 1
            elif adm.status == 'DISCHARGE_INITIATED' or adm.discharge_date is not None:
                status_val = 'MEDICALLY_DISCHARGED'
                discharge_today_count += 1

            if status_val == 'RUNNING' and summary['is_over_threshold']:
                over_80_count += 1

            # Format payer
            payer_label = 'General'
            if summary['has_tpa']:
                payer_label = f"{summary['tpa_provider']}"

            rows.append({
                'id': str(adm.id),
                'ip': adm.admission_number,
                'uhid': adm.patient.uhid,
                'name': summary['patient_name'],
                'ward': f"{adm.ward_name}" + (f" · {adm.bed.bed_number}" if adm.bed else ""),
                'day': summary['days_admitted'],
                'consultant': summary['consultant'],
                'payer': payer_label,
                'deposit': float(summary['total_deposit_balance']),
                'ledger': float(summary['ledger_total']),
                'status': status_val,
                'util': summary['utilization_percent'],
                'balance': float(summary['net_balance']),
                'preauth': float(summary['tpa_preauth_amount']),
                'tpa': float(summary['tpa_settled_amount']),
                'split': [[x['label'], x['amount']] for x in summary['category_split']],
                'checklist': [c['done'] for c in summary['checklist']],
                'topup_sent': summary['topup_demanded'],
                'pass_token': summary['gate_pass_token']
            })

        # Sort order: MEDICALLY_DISCHARGED (0), AWAITING_TPA (1), RUNNING (2), CLEARED (3)
        order = {'MEDICALLY_DISCHARGED': 0, 'AWAITING_TPA': 1, 'RUNNING': 2, 'CLEARED': 3}
        rows.sort(key=lambda x: order.get(x['status'], 99))

        return {
            'kpis': {
                'admitted': len(active_admissions),
                'over_80_deposit': over_80_count,
                'discharge_today': discharge_today_count + awaiting_tpa_count,
                'awaiting_tpa': awaiting_tpa_count,
                'deposits_held': float(total_deposits_held)
            },
            'admissions': rows
        }


# --- PHASE 10: REVENUE INTEGRITY & GOVERNANCE ---

def next_investigation_case_number() -> str:
    """Generate sequential INV-CASE-YYYYMM-XXXXX identifier."""
    stem = f"INV-CASE-{timezone.now().strftime('%Y%m')}-"
    last = (RevenueInvestigationCase.objects.filter(case_number__startswith=stem)
            .order_by('-case_number').values_list('case_number', flat=True).first())
    seq = int(last.rsplit('-', 1)[-1]) + 1 if last else 1
    return f"{stem}{str(seq).zfill(5)}"


class RevenueIntegrityScannerService:
    """Phase 10: Revenue leakage scanning, fraud anomaly detection, and investigation lifecycle."""

    @classmethod
    def scan_revenue_leakage(cls) -> dict:
        """
        Scans hospital systems for unbilled clinical events and discharge billing gaps:
        1. Lab orders / billable charge items unbilled > 24 hours.
        2. Medically discharged patients without final bill / clearance > 2 hours.
        3. Missed bed day charges on active inpatients.
        """
        now = timezone.now()
        cutoff_24h = now - timedelta(hours=24)
        cutoff_2h = now - timedelta(hours=2)
        new_alerts = []

        # 1. Unbilled Orders > 24 Hours
        # A) Billable charge items pending > 24h
        unbilled_charges = BillableChargeItem.objects.filter(
            status=ChargeItemStatus.PENDING,
            created_at__lte=cutoff_24h
        ).select_related('patient')

        for charge in unbilled_charges:
            source_ref = str(charge.id)
            if not RevenueLeakageAlert.objects.filter(
                leakage_type=RevenueLeakageType.UNBILLED_ORDER_24H,
                source_event_reference=source_ref
            ).exists():
                amount = charge.total_amount or Decimal('0.00')
                score = min(100, max(20, int(amount / Decimal('50.00')) + 35))
                alert = RevenueLeakageAlert.objects.create(
                    leakage_type=RevenueLeakageType.UNBILLED_ORDER_24H,
                    department=charge.department or 'GENERAL',
                    patient=charge.patient,
                    estimated_amount=amount,
                    risk_score=score,
                    status=RevenueLeakageStatus.OPEN,
                    source_event_reference=source_ref,
                    notes=f"Unbilled {charge.department} item '{charge.service_name}' pending > 24h"
                )
                new_alerts.append(alert)

        # B) Lab orders completed/ordered > 24h without invoice
        try:
            from apps.lab.models import LabOrder
            unbilled_lab_orders = LabOrder.objects.filter(
                order_date__lte=cutoff_24h
            ).exclude(
                status='CANCELLED'
            ).select_related('patient', 'test')

            for order in unbilled_lab_orders:
                ref_num = getattr(order, 'order_number', str(order.id))
                if not RevenueLeakageAlert.objects.filter(source_event_reference=ref_num).exists():
                    has_invoice = InvoiceItem.objects.filter(description__icontains=ref_num).exists()
                    has_charge = BillableChargeItem.objects.filter(source_reference_id=ref_num).exists()
                    if not has_invoice and not has_charge:
                        test_price = getattr(order.test, 'price', Decimal('450.00')) if hasattr(order, 'test') and order.test else Decimal('450.00')
                        score = min(100, max(30, int(test_price / Decimal('30.00')) + 25))
                        alert = RevenueLeakageAlert.objects.create(
                            leakage_type=RevenueLeakageType.UNBILLED_ORDER_24H,
                            department='LAB',
                            patient=order.patient,
                            estimated_amount=test_price,
                            risk_score=score,
                            status=RevenueLeakageStatus.OPEN,
                            source_event_reference=ref_num,
                            notes=f"Lab order {ref_num} placed > 24 hours ago with no associated charge or invoice"
                        )
                        new_alerts.append(alert)
        except Exception:
            pass

        # 2. Medically Discharged Patients without Final Bill > 2 Hours
        discharged_admissions = InpatientAdmission.objects.filter(
            status__in=['DISCHARGED', 'DISCHARGE_INITIATED']
        ).select_related('patient')

        for adm in discharged_admissions:
            clearance = FinancialDischargeClearance.objects.filter(admission=adm).first()
            if not clearance or clearance.clearance_status not in [DischargeClearanceStatus.CLEARED, DischargeClearanceStatus.OVERRIDDEN]:
                ref = adm.admission_number
                if not RevenueLeakageAlert.objects.filter(
                    leakage_type=RevenueLeakageType.DISCHARGED_NOT_BILLED,
                    source_event_reference=ref
                ).exists():
                    ledger_total = IPDRunningLedger.objects.filter(
                        admission=adm,
                        is_interim_billed=False
                    ).aggregate(models.Sum('amount'))['amount__sum'] or Decimal('0.00')

                    deposits = PatientDeposit.objects.filter(
                        models.Q(ipd_admission=adm) | models.Q(patient=adm.patient),
                        status__in=[DepositStatus.ACTIVE, DepositStatus.PARTIALLY_UTILIZED]
                    ).aggregate(models.Sum('available_balance'))['available_balance__sum'] or Decimal('0.00')

                    est_leakage = max(Decimal('0.00'), ledger_total - deposits)
                    if est_leakage == Decimal('0.00') and ledger_total > Decimal('0.00'):
                        est_leakage = ledger_total

                    alert = RevenueLeakageAlert.objects.create(
                        leakage_type=RevenueLeakageType.DISCHARGED_NOT_BILLED,
                        department='IPD',
                        patient=adm.patient,
                        admission=adm,
                        estimated_amount=est_leakage or Decimal('12500.00'),
                        risk_score=85,
                        status=RevenueLeakageStatus.OPEN,
                        source_event_reference=ref,
                        notes=f"Patient {adm.patient.first_name} {adm.patient.last_name} discharged without financial clearance > 2 hours"
                    )
                    new_alerts.append(alert)

        if new_alerts:
            BillingAuditEvent.objects.create(
                event_type=AuditEventType.REVENUE_LEAKAGE,
                severity=AuditSeverity.HIGH if any(a.risk_score >= 80 for a in new_alerts) else AuditSeverity.MEDIUM,
                title=f"Revenue leakage scanner detected {len(new_alerts)} items",
                detail=f"Scanned unbilled orders and discharge gaps. Total value at risk: ₹{sum(a.estimated_amount for a in new_alerts)}",
                reference='LEAKAGE-SCAN'
            )

        return {
            'scanned_at': now.isoformat(),
            'new_alerts_count': len(new_alerts),
            'total_open_alerts': RevenueLeakageAlert.objects.filter(status__in=[RevenueLeakageStatus.OPEN, RevenueLeakageStatus.INVESTIGATING]).count()
        }

    @classmethod
    def scan_fraud_risk_signals(cls) -> dict:
        """
        Behavioral anomaly detector across billing counters:
        1. Single cashier submitting 3+ refunds in a single shift / 24-hour window.
        2. Discounts clustered tightly below supervisor authorization threshold (e.g. 4.0% - 4.9%).
        3. Excessive invoice cancellations / voids compared to counter peers.
        """
        now = timezone.now()
        since_24h = now - timedelta(hours=24)
        new_signals = []

        # 1. Cashier with 3+ refunds in 24 hours
        from django.db.models import Count
        cashier_refunds = (
            RefundRequest.objects.filter(created_at__gte=since_24h)
            .values('initiated_by')
            .annotate(cnt=Count('id'))
            .filter(cnt__gte=3)
        )

        for cr in cashier_refunds:
            user = User.objects.filter(id=cr['initiated_by']).first()
            if user:
                sig_code = 'MULTIPLE_REFUNDS_SAME_SHIFT'
                if not FraudRiskSignal.objects.filter(
                    signal_code=sig_code,
                    target_user=user,
                    detected_at__gte=since_24h
                ).exists():
                    signal = FraudRiskSignal.objects.create(
                        signal_code=sig_code,
                        target_user=user,
                        severity=FraudRiskSignalSeverity.HIGH,
                        occurrences_count=cr['cnt'],
                        risk_score=85,
                        description=f"Cashier {user.get_full_name() or user.username} executed {cr['cnt']} refunds within 24 hours."
                    )
                    new_signals.append(signal)

        # 2. Clustered Discounts below 5% (4.0% - 4.9%)
        since_7d = now - timedelta(days=7)
        invoices_with_discount = (
            Invoice.objects.filter(
                created_at__gte=since_7d,
                subtotal__gt=0,
                discount__gt=0
            )
            .select_related('cashier')
        )
        user_near_threshold_counts = {}
        for inv in invoices_with_discount:
            discount_pct = (inv.discount / inv.subtotal) * 100
            if Decimal('4.00') <= discount_pct <= Decimal('4.99'):
                cashier_id = inv.cashier_id
                if cashier_id:
                    user_near_threshold_counts[cashier_id] = user_near_threshold_counts.get(cashier_id, 0) + 1

        for uid, count in user_near_threshold_counts.items():
            if count >= 3:
                user = User.objects.filter(id=uid).first()
                if user and not FraudRiskSignal.objects.filter(
                    signal_code='DISCOUNT_CLUSTER_BELOW_THRESHOLD',
                    target_user=user,
                    detected_at__gte=since_7d
                ).exists():
                    signal = FraudRiskSignal.objects.create(
                        signal_code='DISCOUNT_CLUSTER_BELOW_THRESHOLD',
                        target_user=user,
                        severity=FraudRiskSignalSeverity.MEDIUM,
                        occurrences_count=count,
                        risk_score=65,
                        description=f"Cashier {user.get_full_name() or user.username} issued {count} invoices with discounts clustered between 4.0% and 4.9% (just below 5% approval gate)."
                    )
                    new_signals.append(signal)

        # 3. Excessive Voids
        voids_by_user = (
            Invoice.objects.filter(
                created_at__gte=since_7d,
                status=InvoiceStatus.CANCELLED
            )
            .values('cashier')
            .annotate(cnt=Count('id'))
            .filter(cnt__gte=3)
        )
        for vu in voids_by_user:
            user = User.objects.filter(id=vu['cashier']).first()
            if user and not FraudRiskSignal.objects.filter(
                signal_code='EXCESSIVE_VOIDS_PEER_RATIO',
                target_user=user,
                detected_at__gte=since_7d
            ).exists():
                signal = FraudRiskSignal.objects.create(
                    signal_code='EXCESSIVE_VOIDS_PEER_RATIO',
                    target_user=user,
                    severity=FraudRiskSignalSeverity.HIGH,
                    occurrences_count=vu['cnt'],
                    risk_score=75,
                    description=f"Cashier {user.get_full_name() or user.username} has {vu['cnt']} invoice voids/cancellations in the past 7 days."
                )
                new_signals.append(signal)

        if new_signals:
            BillingAuditEvent.objects.create(
                event_type=AuditEventType.FRAUD_SIGNAL,
                severity=AuditSeverity.HIGH if any(s.severity in [FraudRiskSignalSeverity.HIGH, FraudRiskSignalSeverity.CRITICAL] for s in new_signals) else AuditSeverity.MEDIUM,
                title=f"Fraud anomaly detector flagged {len(new_signals)} risk signals",
                detail=f"Identified cashier behavioral outliers: {', '.join(s.signal_code for s in new_signals)}",
                reference='FRAUD-SCAN'
            )

        return {
            'scanned_at': now.isoformat(),
            'new_signals_count': len(new_signals),
            'total_active_signals': FraudRiskSignal.objects.filter(is_acknowledged=False).count()
        }

    @classmethod
    @transaction.atomic
    def convert_leakage_to_charge(cls, alert_id: str, actor: User) -> RevenueLeakageAlert:
        """Converts verified leakage alert into a live BillableChargeItem for billing."""
        alert = RevenueLeakageAlert.objects.select_for_update().get(id=alert_id)
        if alert.status == RevenueLeakageStatus.CONVERTED_TO_CHARGE:
            raise ValueError("Leakage alert has already been converted to a charge.")

        if not alert.patient:
            raise ValueError("Cannot convert leakage alert to a charge without an associated patient.")

        charge = BillableChargeItem.objects.create(
            patient=alert.patient,
            department=alert.department or 'GENERAL',
            service_code='LEAKAGE-REC',
            service_name=f"Recovered Revenue: {alert.get_leakage_type_display()} ({alert.source_event_reference or alert.id})",
            unit_price=alert.estimated_amount,
            quantity=1,
            total_amount=alert.estimated_amount,
            source_reference_id=f"LEAKAGE-{alert.id}",
            priority='URGENT',
            status=ChargeItemStatus.PENDING
        )

        alert.converted_charge = charge
        alert.status = RevenueLeakageStatus.CONVERTED_TO_CHARGE
        alert.save(update_fields=['converted_charge', 'status', 'updated_at'])

        BillingAuditEvent.objects.create(
            event_type=AuditEventType.LEAKAGE_RECOVERED,
            severity=AuditSeverity.MEDIUM,
            title=f"Leakage converted to charge: ₹{alert.estimated_amount}",
            detail=f"Alert {alert.id} ({alert.leakage_type}) converted to billable charge {charge.id} for {alert.patient.first_name} {alert.patient.last_name}",
            actor=actor,
            reference=str(alert.id)
        )

        return alert

    @classmethod
    @transaction.atomic
    def dismiss_leakage_alert(cls, alert_id: str, reason: str, actor: User) -> RevenueLeakageAlert:
        """Dismisses false positive alert with mandatory audit reasoning (≥5 chars)."""
        if not reason or len(reason.strip()) < 5:
            raise ValueError("Dismissal reason must be at least 5 characters.")

        alert = RevenueLeakageAlert.objects.select_for_update().get(id=alert_id)
        alert.status = RevenueLeakageStatus.FALSE_POSITIVE
        alert.dismissal_reason = reason.strip()
        alert.save(update_fields=['status', 'dismissal_reason', 'updated_at'])

        BillingAuditEvent.objects.create(
            event_type=AuditEventType.LEAKAGE_DISMISSED,
            severity=AuditSeverity.LOW,
            title=f"Leakage dismissed: {reason.strip()[:40]}",
            detail=f"Alert {alert.id} ({alert.leakage_type}) marked false positive by {actor.username}: {reason.strip()}",
            actor=actor,
            reference=str(alert.id)
        )

        return alert

    @classmethod
    def assign_leakage_alert(cls, alert_id: str, assignee: User, actor: User) -> RevenueLeakageAlert:
        """Assigns an alert owner for review."""
        alert = RevenueLeakageAlert.objects.get(id=alert_id)
        alert.assigned_to = assignee
        alert.save(update_fields=['assigned_to', 'updated_at'])
        return alert

    @classmethod
    @transaction.atomic
    def open_investigation_case(cls, actor: User, subject: str, leakage_alert_id: str = None,
                                risk_signal_id: str = None, initial_findings: str = '') -> RevenueInvestigationCase:
        """Opens a formal investigation docket with unique INV-CASE-YYYYMM-XXXXX number."""
        if not subject or len(subject.strip()) < 3:
            raise ValueError("Investigation subject must be at least 3 characters.")

        case_number = next_investigation_case_number()
        alert = RevenueLeakageAlert.objects.get(id=leakage_alert_id) if leakage_alert_id else None
        signal = FraudRiskSignal.objects.get(id=risk_signal_id) if risk_signal_id else None

        if alert:
            alert.status = RevenueLeakageStatus.INVESTIGATING
            alert.save(update_fields=['status', 'updated_at'])

        case = RevenueInvestigationCase.objects.create(
            case_number=case_number,
            subject=subject.strip(),
            leakage_alert=alert,
            risk_signal=signal,
            owner=actor,
            findings=initial_findings.strip(),
            status=RevenueInvestigationStatus.OPEN
        )

        BillingAuditEvent.objects.create(
            event_type=AuditEventType.INVESTIGATION_EVENT,
            severity=AuditSeverity.HIGH,
            title=f"Investigation opened: {case_number}",
            detail=f"Docket {case_number} '{case.subject}' opened by {actor.username}",
            actor=actor,
            reference=case_number
        )

        return case

    @classmethod
    @transaction.atomic
    def update_investigation_case(cls, case_id: str, actor: User, status: str = None,
                                  findings: str = None, recovered_amount: Decimal = None) -> RevenueInvestigationCase:
        """Updates case docket findings, resolution status, or recovered amount."""
        case = RevenueInvestigationCase.objects.select_for_update().get(id=case_id)
        update_fields = ['updated_at']

        if status:
            if status not in RevenueInvestigationStatus.values:
                raise ValueError(f"Invalid status: {status}")
            case.status = status
            update_fields.append('status')

        if findings is not None:
            case.findings = findings.strip()
            update_fields.append('findings')

        if recovered_amount is not None:
            case.recovered_amount = Decimal(str(recovered_amount))
            update_fields.append('recovered_amount')

        case.save(update_fields=update_fields)

        BillingAuditEvent.objects.create(
            event_type=AuditEventType.INVESTIGATION_EVENT,
            severity=AuditSeverity.MEDIUM,
            title=f"Investigation {case.case_number} updated: {case.status}",
            detail=f"Status: {case.status}, Recovered: ₹{case.recovered_amount}. Updated by {actor.username}",
            actor=actor,
            reference=case.case_number
        )

        return case

    @classmethod
    def acknowledge_risk_signal(cls, signal_id: str, actor: User) -> FraudRiskSignal:
        """Acknowledges a fraud risk signal."""
        signal = FraudRiskSignal.objects.get(id=signal_id)
        signal.is_acknowledged = True
        signal.acknowledged_by = actor
        signal.save(update_fields=['is_acknowledged', 'acknowledged_by'])
        return signal

    @classmethod
    def get_revenue_integrity_overview(cls) -> dict:
        """Returns executive KPI metrics and recent streams for A-03 Revenue Integrity."""
        open_alerts = RevenueLeakageAlert.objects.filter(
            status__in=[RevenueLeakageStatus.OPEN, RevenueLeakageStatus.INVESTIGATING]
        )
        amount_at_risk = open_alerts.aggregate(models.Sum('estimated_amount'))['estimated_amount__sum'] or Decimal('0.00')

        current_month = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        recovered_cases = RevenueInvestigationCase.objects.filter(
            updated_at__gte=current_month
        ).aggregate(models.Sum('recovered_amount'))['recovered_amount__sum'] or Decimal('0.00')

        recovered_alerts = RevenueLeakageAlert.objects.filter(
            status=RevenueLeakageStatus.CONVERTED_TO_CHARGE,
            updated_at__gte=current_month
        ).aggregate(models.Sum('estimated_amount'))['estimated_amount__sum'] or Decimal('0.00')

        recovered_mtd = recovered_cases + recovered_alerts

        high_risk_signals_count = FraudRiskSignal.objects.filter(
            severity__in=[FraudRiskSignalSeverity.HIGH, FraudRiskSignalSeverity.CRITICAL],
            is_acknowledged=False
        ).count()

        open_investigations_count = RevenueInvestigationCase.objects.filter(
            status__in=[RevenueInvestigationStatus.OPEN, RevenueInvestigationStatus.EVIDENCE_COLLECTED]
        ).count()

        return {
            'kpis': {
                'amount_at_risk': float(amount_at_risk),
                'open_leakage_items': open_alerts.count(),
                'high_risk_signals': high_risk_signals_count,
                'open_investigations': open_investigations_count,
                'recovered_mtd': float(recovered_mtd)
            }
        }


# --- PHASE 11: REPORTS, PERIOD CLOSE & AUDIT ---

def _d(value) -> Decimal:
    return Decimal(str(value or '0')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def _f(value) -> float:
    return float(_d(value))


def next_journal_reference() -> str:
    """One JV- series shared by period-close journals, real-time GL vouchers, and ad-hoc ERP postings."""
    candidates = [
        next_sequence_number(FinancialPeriodLock, 'journal_reference', 'JV', 4),
        next_sequence_number(BillingAuditEvent, 'reference', 'JV', 4),
    ]
    try:
        candidates.append(next_sequence_number(GeneralLedgerJournalEntry, 'journal_reference', 'JV', 5))
    except Exception:
        pass
    return max(candidates)


class BillingReportingService:
    """Finance reports from the billing sub-ledger. Invoices are dated by their business date (Invoice.date);
    collections by payment/deposit time; refunds by disbursal time. Locked days are read from final
    DailyRevenueSnapshot rows instead of re-aggregating transactions."""
    BILLED_EXCLUDE = (InvoiceStatus.DRAFT, InvoiceStatus.CANCELLED)
    OUTSTANDING_STATUSES = (InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.INSURANCE_PENDING,
                            InvoiceStatus.CORPORATE_PENDING, InvoiceStatus.CREDIT_AUTHORIZED)
    AGING_BUCKETS = (('0-30', 0, 30), ('31-60', 31, 60), ('61-90', 61, 90), ('90+', 91, None))
    TURNAROUND_SLA_MINUTES = 10
    REPORTS = {
        'gst': ('GST summary', 'Taxable value and GST by rate slab for GSTR-1 / GSTR-3B'),
        'department': ('Revenue by department', 'Gross, discount, tax and net revenue by clinical department'),
        'tender': ('Collections by tender', 'Counter collections split by payment mode'),
        'aging': ('Receivables aging', 'Outstanding by payer type and age'),
        'refunds': ('Refunds & credit notes', 'Refunds disbursed and credit notes issued'),
        'discounts': ('Discounts & concessions', 'Concessions by reason and approver'),
        'productivity': ('Cashier productivity', 'Throughput, turnaround and drawer accuracy per cashier'),
        'journal': ('Settlement journal', 'Revenue sub-ledger summary for the ERP (balanced)'),
    }

    # ---------- period helpers ----------
    @staticmethod
    def parse_range(date_from=None, date_to=None, default='MTD'):
        from datetime import date as date_cls
        today = timezone.localdate()

        def p(v):
            if v in (None, ''):
                return None
            try:
                return date_cls.fromisoformat(str(v)[:10])
            except ValueError:
                raise ValueError('Dates must be YYYY-MM-DD.')
        start, end = p(date_from), p(date_to)
        if start is None and end is None:
            start, end = (today, today) if default == 'TODAY' else (today.replace(day=1), today)
        start = start or end
        end = end or start
        if start > end:
            raise ValueError('date_from must be on or before date_to.')
        if (end - start).days > 400:
            raise ValueError('Report range is limited to 400 days.')
        return start, end

    @staticmethod
    def _days(start, end):
        return [start + timedelta(days=i) for i in range((end - start).days + 1)]

    @classmethod
    def lock_state(cls, start, end) -> dict:
        locks = FinancialPeriodLock.objects.filter(status=PeriodStatus.LOCKED, start_date__lte=end, end_date__gte=start)
        locked = set()
        for lk in locks:
            for d in cls._days(max(lk.start_date, start), min(lk.end_date, end)):
                locked.add(d)
        total = (end - start).days + 1
        return {'locked_days': len(locked), 'total_days': total,
                'label': 'Locked · final figures' if len(locked) == total else
                         (f'{len(locked)} of {total} days locked · open days may still change' if locked else 'Open period · figures may still change')}

    @staticmethod
    def _invoices(start, end):
        return Invoice.objects.filter(date__gte=start.isoformat(), date__lte=end.isoformat()) \
            .exclude(status__in=BillingReportingService.BILLED_EXCLUDE)

    @staticmethod
    def _payments(start, end):
        return Payment.objects.filter(payment_date__date__gte=start, payment_date__date__lte=end, payment_status='SUCCESS')

    @staticmethod
    def _deposits(start, end):
        return PatientDeposit.objects.filter(created_at__date__gte=start, created_at__date__lte=end)

    @staticmethod
    def _refunds(start, end):
        return RefundRequest.objects.filter(status=RefundStatus.DISBURSED, disbursed_at__date__gte=start, disbursed_at__date__lte=end)

    @staticmethod
    def payer_type(inv) -> str:
        if inv.tpa_claim_reference or inv.status == InvoiceStatus.INSURANCE_PENDING or inv.settlement_mode == TenderMode.INSURANCE_TPA:
            return 'INSURANCE'
        if inv.corporate_reference or inv.status == InvoiceStatus.CORPORATE_PENDING or inv.settlement_mode == TenderMode.CORPORATE_CREDIT:
            return 'CORPORATE'
        return 'SELF_PAY'

    # ---------- department revenue (snapshot-backed) ----------
    @classmethod
    def _department_live(cls, invoices) -> dict:
        """Item-level attribution; the invoice-level discount is spread over lines by their share of gross."""
        out = {}
        inv_list = list(invoices.prefetch_related('items'))
        for inv in inv_list:
            items = list(inv.items.all())
            gross_total = sum((it.unit_price * it.qty for it in items), Decimal('0.00'))
            for it in items:
                base = it.unit_price * it.qty
                share = (base / gross_total) if gross_total else Decimal('0')
                disc = _d(inv.discount * share) if inv.discount else _d(it.discount_amount)
                row = out.setdefault((it.department or inv.category or 'GENERAL').upper(), {
                    'gross_revenue': Decimal('0.00'), 'discounts': Decimal('0.00'), 'taxes_collected': Decimal('0.00'), 'invoices': set()})
                row['gross_revenue'] += base
                row['discounts'] += disc
                row['taxes_collected'] += it.tax_amount
                row['invoices'].add(inv.id)
            if not items:
                row = out.setdefault((inv.category or 'GENERAL').upper(), {
                    'gross_revenue': Decimal('0.00'), 'discounts': Decimal('0.00'), 'taxes_collected': Decimal('0.00'), 'invoices': set()})
                row['gross_revenue'] += inv.subtotal
                row['discounts'] += inv.discount
                row['taxes_collected'] += inv.tax
                row['invoices'].add(inv.id)
        return out

    @classmethod
    def build_snapshot(cls, day, final: bool = False) -> int:
        """(Re)write the snapshot rows for one day. Final rows are written at day close."""
        dept = cls._department_live(cls._invoices(day, day))
        refunds_by_dept = {}
        refunds_by_tender = {}
        for r in cls._refunds(day, day).select_related('invoice'):
            k = (r.invoice.category or 'GENERAL').upper()
            refunds_by_dept[k] = refunds_by_dept.get(k, Decimal('0.00')) + r.requested_amount
            t = (r.disbursed_tender or 'CASH').upper()
            refunds_by_tender[t] = refunds_by_tender.get(t, Decimal('0.00')) + r.requested_amount
        tender = {}
        for p in cls._payments(day, day).exclude(tender_mode=TenderMode.DEPOSIT_DEDUCTION):
            row = tender.setdefault(p.tender_mode, [Decimal('0.00'), 0])
            row[0] += p.amount
            row[1] += 1
        for dpt in cls._deposits(day, day):
            row = tender.setdefault(dpt.tender_mode, [Decimal('0.00'), 0])
            row[0] += dpt.deposit_amount
            row[1] += 1
        with transaction.atomic():
            DailyRevenueSnapshot.objects.filter(snapshot_date=day).delete()
            rows = []
            for k, v in dept.items():
                rows.append(DailyRevenueSnapshot(
                    snapshot_date=day, department=k, tender_mode='ALL', gross_revenue=_d(v['gross_revenue']),
                    discounts=_d(v['discounts']), net_revenue=_d(v['gross_revenue'] - v['discounts']),
                    taxes_collected=_d(v['taxes_collected']), refunds=_d(refunds_by_dept.get(k)), invoice_count=len(v['invoices']),
                    is_final=final))
            for k in set(refunds_by_dept) - set(dept):
                rows.append(DailyRevenueSnapshot(snapshot_date=day, department=k, tender_mode='ALL', refunds=_d(refunds_by_dept[k]), is_final=final))
            for k, (amt, n) in tender.items():
                rows.append(DailyRevenueSnapshot(snapshot_date=day, department='ALL', tender_mode=k, collected=_d(amt),
                                                 refunds=_d(refunds_by_tender.get(k)), transaction_count=n, is_final=final))
            for k in set(refunds_by_tender) - set(tender):
                rows.append(DailyRevenueSnapshot(snapshot_date=day, department='ALL', tender_mode=k, refunds=_d(refunds_by_tender[k]), is_final=final))
            DailyRevenueSnapshot.objects.bulk_create(rows)
        return len(rows)

    @classmethod
    def department_revenue(cls, start, end) -> dict:
        final_days = set(DailyRevenueSnapshot.objects.filter(snapshot_date__gte=start, snapshot_date__lte=end, is_final=True)
                         .values_list('snapshot_date', flat=True))
        agg = {}
        for s in DailyRevenueSnapshot.objects.filter(snapshot_date__in=final_days, tender_mode='ALL').exclude(department='ALL'):
            row = agg.setdefault(s.department, {'gross': Decimal('0.00'), 'discounts': Decimal('0.00'), 'tax': Decimal('0.00'), 'refunds': Decimal('0.00'), 'invoices': 0})
            row['gross'] += s.gross_revenue
            row['discounts'] += s.discounts
            row['tax'] += s.taxes_collected
            row['refunds'] += s.refunds
            row['invoices'] += s.invoice_count
        live_inv = cls._invoices(start, end).exclude(date__in=[d.isoformat() for d in final_days])
        for k, v in cls._department_live(live_inv).items():
            row = agg.setdefault(k, {'gross': Decimal('0.00'), 'discounts': Decimal('0.00'), 'tax': Decimal('0.00'), 'refunds': Decimal('0.00'), 'invoices': 0})
            row['gross'] += v['gross_revenue']
            row['discounts'] += v['discounts']
            row['tax'] += v['taxes_collected']
            row['invoices'] += len(v['invoices'])
        for r in cls._refunds(start, end).exclude(disbursed_at__date__in=final_days).select_related('invoice'):
            k = (r.invoice.category or 'GENERAL').upper()
            agg.setdefault(k, {'gross': Decimal('0.00'), 'discounts': Decimal('0.00'), 'tax': Decimal('0.00'), 'refunds': Decimal('0.00'), 'invoices': 0})['refunds'] += r.requested_amount
        rows = sorted(({
            'department': k, 'invoices': v['invoices'], 'gross': _f(v['gross']), 'discounts': _f(v['discounts']),
            'tax': _f(v['tax']), 'net': _f(v['gross'] - v['discounts']), 'refunds': _f(v['refunds']),
        } for k, v in agg.items()), key=lambda r: -r['net'])
        total_net = sum(r['net'] for r in rows) or 0
        for r in rows:
            r['share_percent'] = round(r['net'] / total_net * 100, 1) if total_net else 0.0
        return {'rows': rows, 'final_days': len(final_days),
                'totals': {k: round(sum(r[k] for r in rows), 2) for k in ('gross', 'discounts', 'tax', 'net', 'refunds')} | {'invoices': sum(r['invoices'] for r in rows)}}

    # ---------- collections ----------
    @classmethod
    def daily_collections(cls, start, end) -> dict:
        by_tender, by_cashier = {}, {}

        def add(cashier, tender, amount, kind):
            t = by_tender.setdefault(tender, {'tender': tender, 'transactions': 0, 'amount': Decimal('0.00')})
            t['transactions'] += 1
            t['amount'] += amount
            name = (cashier.get_full_name() or cashier.username) if cashier else 'Unattributed'
            c = by_cashier.setdefault(name, {'cashier': name, 'transactions': 0, 'total': Decimal('0.00'), 'deposits': Decimal('0.00')})
            c['transactions'] += 1
            c['total'] += amount
            c[tender] = c.get(tender, Decimal('0.00')) + amount
            if kind == 'DEPOSIT':
                c['deposits'] += amount

        for p in cls._payments(start, end).exclude(tender_mode=TenderMode.DEPOSIT_DEDUCTION).select_related('cashier'):
            add(p.cashier, p.tender_mode, p.amount, 'PAYMENT')
        for dpt in cls._deposits(start, end).select_related('cashier'):
            add(dpt.cashier, dpt.tender_mode, dpt.deposit_amount, 'DEPOSIT')
        refunds = Decimal('0.00')
        for r in cls._refunds(start, end):
            refunds += r.requested_amount
        total = sum((t['amount'] for t in by_tender.values()), Decimal('0.00'))
        tenders = sorted(({'tender': t['tender'], 'transactions': t['transactions'], 'amount': _f(t['amount']),
                           'share_percent': round(float(t['amount'] / total * 100), 1) if total else 0.0} for t in by_tender.values()),
                         key=lambda r: -r['amount'])
        cashiers = sorted(({k: (_f(v) if isinstance(v, Decimal) else v) for k, v in c.items()} for c in by_cashier.values()),
                          key=lambda r: -r['total'])
        return {'tenders': tenders, 'cashiers': cashiers, 'gross_collected': _f(total), 'refunds': _f(refunds),
                'net_collected': _f(total - refunds),
                'deposit_deductions': _f(cls._payments(start, end).filter(tender_mode=TenderMode.DEPOSIT_DEDUCTION)
                                         .aggregate(t=models.Sum('amount'))['t'])}

    # ---------- GST ----------
    @classmethod
    def tax_gst(cls, start, end) -> dict:
        """Taxable value and tax per rate slab, from invoice lines. Intra-state supply: CGST = SGST = half of GST.
        Credit notes reverse tax in the original invoice's period (listed as adjustments)."""
        slabs = {}
        lines = 0
        for it in InvoiceItem.objects.filter(invoice__in=cls._invoices(start, end)).select_related('invoice'):
            base = it.unit_price * it.qty - it.discount_amount
            rate = _d(it.tax_rate)
            s = slabs.setdefault(rate, {'taxable': Decimal('0.00'), 'tax': Decimal('0.00'), 'lines': 0, 'departments': set()})
            s['taxable'] += base
            s['tax'] += it.tax_amount
            s['lines'] += 1
            s['departments'].add((it.department or 'GENERAL').upper())
            lines += 1
        rows = []
        for rate in sorted(slabs):
            v = slabs[rate]
            cgst = _d(v['tax'] / 2)
            rows.append({'rate': float(rate), 'label': 'Exempt · health care services' if rate == 0 else f'GST {rate.normalize()}%',
                         'lines': v['lines'], 'taxable_value': _f(v['taxable']), 'cgst': _f(cgst), 'sgst': _f(v['tax'] - cgst),
                         'igst': 0.0, 'total_tax': _f(v['tax']), 'departments': sorted(v['departments'])})
        adjustments = []
        for cn in CreditNote.objects.filter(created_at__date__gte=start, created_at__date__lte=end).select_related('invoice', 'patient'):
            inv = cn.invoice
            ratio = (inv.tax / (inv.subtotal - inv.discount + inv.tax)) if inv and (inv.subtotal - inv.discount + inv.tax) else Decimal('0')
            adjustments.append({'credit_note_number': cn.credit_note_number, 'invoice_number': inv.invoice_number if inv else '',
                                'original_period': (inv.date or '')[:7] if inv else '', 'amount': _f(cn.amount),
                                'tax_reversed': _f(cn.amount * ratio), 'issued_on': timezone.localtime(cn.created_at).date().isoformat()})
        taxable = sum((r['taxable_value'] for r in rows if r['rate'] > 0), 0.0)
        exempt = sum((r['taxable_value'] for r in rows if r['rate'] == 0), 0.0)
        tax = sum((r['total_tax'] for r in rows), 0.0)
        invoice_tax = _f(cls._invoices(start, end).aggregate(t=models.Sum('tax'))['t'])
        return {
            'slabs': rows, 'lines': lines, 'adjustments': adjustments,
            'totals': {'taxable_value': round(taxable, 2), 'exempt_value': round(exempt, 2), 'total_tax': round(tax, 2),
                       'cgst': round(sum(r['cgst'] for r in rows), 2), 'sgst': round(sum(r['sgst'] for r in rows), 2), 'igst': 0.0,
                       'tax_reversed_by_credit_notes': round(sum(a['tax_reversed'] for a in adjustments), 2)},
            # Reconciliation: line tax must equal the tax posted on invoices
            'reconciles_to_invoices': abs(invoice_tax - round(tax, 2)) < 0.005,
            'invoice_tax': invoice_tax,
        }

    @classmethod
    def gst_returns(cls, month_start) -> list:
        """Filing-ready summaries for one month (JSON for the GST portal is produced from these)."""
        import calendar
        end = month_start.replace(day=calendar.monthrange(month_start.year, month_start.month)[1])
        gst = cls.tax_gst(month_start, end)
        t = gst['totals']
        return [
            {'return': 'GSTR-1', 'description': 'Outward supplies', 'taxable_value': t['taxable_value'], 'exempt_value': t['exempt_value'],
             'cgst': t['cgst'], 'sgst': t['sgst'], 'igst': 0.0, 'total_tax': t['total_tax']},
            {'return': 'GSTR-3B', 'description': 'Summary return (net of credit notes)', 'taxable_value': t['taxable_value'],
             'exempt_value': t['exempt_value'], 'cgst': t['cgst'], 'sgst': t['sgst'], 'igst': 0.0,
             'total_tax': round(t['total_tax'] - t['tax_reversed_by_credit_notes'], 2)},
            {'return': 'Rate summary', 'description': 'Supplies by GST rate', 'slabs': gst['slabs']},
        ]

    # ---------- AR aging ----------
    @classmethod
    def bucket_for(cls, age_days: int) -> str:
        for label, lo, hi in cls.AGING_BUCKETS:
            if age_days >= lo and (hi is None or age_days <= hi):
                return label
        return '0-30'

    @classmethod
    def aging_ar(cls, as_of=None) -> dict:
        as_of = as_of or timezone.localdate()
        payers = {k: {b[0]: Decimal('0.00') for b in cls.AGING_BUCKETS} for k in ('SELF_PAY', 'CORPORATE', 'INSURANCE')}
        accounts = {}
        detail = []
        for inv in Invoice.objects.filter(status__in=cls.OUTSTANDING_STATUSES, balance__gt=0).select_related('patient'):
            d = inv.business_date()
            if d > as_of:
                continue
            age = (as_of - d).days
            bucket = cls.bucket_for(age)
            kind = cls.payer_type(inv)
            payers[kind][bucket] += inv.balance
            name = inv.corporate_reference or inv.tpa_claim_reference or (f"{inv.patient.first_name} {inv.patient.last_name}".strip() if inv.patient else 'Patient')
            acc = accounts.setdefault((kind, name), {'payer_type': kind, 'account': name, 'outstanding': Decimal('0.00'), 'oldest_days': 0, 'invoices': 0})
            acc['outstanding'] += inv.balance
            acc['oldest_days'] = max(acc['oldest_days'], age)
            acc['invoices'] += 1
            detail.append({'invoice_number': inv.invoice_number, 'payer_type': kind, 'account': name, 'date': d.isoformat(),
                           'age_days': age, 'bucket': bucket, 'balance': _f(inv.balance)})
        labels = {'SELF_PAY': 'Patients · self pay', 'CORPORATE': 'Corporate', 'INSURANCE': 'Insurance / TPA'}
        rows = [{'payer_type': k, 'label': labels[k], **{b: _f(v[b]) for b in v}, 'total': _f(sum(v.values()))} for k, v in payers.items()]
        totals = {b[0]: round(sum(r[b[0]] for r in rows), 2) for b in cls.AGING_BUCKETS}
        totals['total'] = round(sum(totals.values()), 2)
        return {'as_of': as_of.isoformat(), 'buckets': [b[0] for b in cls.AGING_BUCKETS], 'rows': rows, 'totals': totals,
                'accounts': sorted(({**a, 'outstanding': _f(a['outstanding'])} for a in accounts.values()), key=lambda a: -a['outstanding'])[:50],
                'invoices': sorted(detail, key=lambda x: -x['age_days'])[:200]}

    # ---------- cashier productivity ----------
    @classmethod
    def cashier_productivity(cls, start, end) -> dict:
        stats = {}
        for p in cls._payments(start, end).select_related('cashier', 'invoice'):
            name = (p.cashier.get_full_name() or p.cashier.username) if p.cashier else 'Unattributed'
            s = stats.setdefault(name, {'cashier': name, 'transactions': 0, 'collected': Decimal('0.00'), 'invoices': set(), 'tat': [], 'shifts': set(), 'variance': Decimal('0.00')})
            s['transactions'] += 1
            if p.tender_mode != TenderMode.DEPOSIT_DEDUCTION:
                s['collected'] += p.amount
            if p.invoice_id:
                s['invoices'].add(p.invoice_id)
            if p.shift_id:
                s['shifts'].add(p.shift_id)
        # Turnaround: first charge staged (or invoice raised) -> last payment, per invoice settled in range
        for name, s in stats.items():
            for inv in Invoice.objects.filter(id__in=s['invoices'], status=InvoiceStatus.PAID).prefetch_related('payments'):
                last = max((p.payment_date for p in inv.payments.all()), default=None)
                first = BillableChargeItem.objects.filter(invoice=inv).order_by('created_at').values_list('created_at', flat=True).first() or inv.created_at
                if last:
                    s['tat'].append(max(0.0, (last - first).total_seconds() / 60.0))
            for sh in CounterShift.objects.filter(id__in=s['shifts']).exclude(status=ShiftStatus.OPEN):
                s['variance'] += sh.cash_variance + sh.card_variance + sh.upi_variance
        rows = []
        for s in stats.values():
            tat = s['tat']
            rows.append({'cashier': s['cashier'], 'transactions': s['transactions'], 'invoices': len(s['invoices']),
                         'collected': _f(s['collected']), 'shifts': len(s['shifts']),
                         'avg_turnaround_minutes': round(sum(tat) / len(tat), 1) if tat else None,
                         'within_sla_percent': round(100.0 * len([t for t in tat if t <= cls.TURNAROUND_SLA_MINUTES]) / len(tat), 1) if tat else None,
                         'net_variance': _f(s['variance'])})
        return {'sla_minutes': cls.TURNAROUND_SLA_MINUTES, 'rows': sorted(rows, key=lambda r: -r['collected'])}

    # ---------- refunds, discounts ----------
    @classmethod
    def refunds_report(cls, start, end) -> list:
        out = []
        for r in cls._refunds(start, end).select_related('patient', 'invoice', 'approved_by'):
            out.append({'credit_note_number': r.credit_note_number or '', 'refund_number': r.refund_number,
                        'patient': f"{r.patient.first_name} {r.patient.last_name}".strip() if r.patient else '',
                        'invoice_number': r.invoice.invoice_number, 'reason': r.reason, 'tender': r.disbursed_tender or '',
                        'approved_by': (r.approved_by.get_full_name() or r.approved_by.username) if r.approved_by else '',
                        'amount': _f(r.requested_amount)})
        return out

    @classmethod
    def discounts_report(cls, start, end) -> list:
        groups = {}
        for inv in cls._invoices(start, end).filter(discount__gt=0).select_related('discount_approved_by'):
            reason = inv.discount_reason or 'Unspecified'
            by = (inv.discount_approved_by.get_full_name() or inv.discount_approved_by.username) if inv.discount_approved_by else 'Policy · auto'
            g = groups.setdefault((reason, by), {'reason': reason, 'approved_by': by, 'count': 0, 'value': Decimal('0.00'), 'gross': Decimal('0.00')})
            g['count'] += 1
            g['value'] += inv.discount
            g['gross'] += inv.subtotal
        return sorted(({**g, 'value': _f(g['value']), 'gross': _f(g['gross']),
                        'percent_of_gross': round(float(g['value'] / g['gross'] * 100), 1) if g['gross'] else 0.0} for g in groups.values()),
                      key=lambda g: -g['value'])

    LEDGER = {
        'CASH': '1110 · Cash in vault', 'CARD': '1120 · Card settlement receivable', 'UPI': '1130 · UPI settlement receivable',
        'NETBANKING': '1140 · Bank receivable', 'CHEQUE': '1150 · Cheques in hand', 'INSURANCE_TPA': '1210 · TPA receivable',
        'CORPORATE_CREDIT': '1220 · Corporate receivable', 'RECEIVABLE': '1300 · Patient receivables',
        'DEPOSITS': '2310 · Patient deposits', 'GST': '2410 · GST output (CGST + SGST)', 'REVENUE': '4100 · Patient service revenue',
        'OPD_REVENUE': '4110 · OPD Consultation Revenue', 'LAB_REVENUE': '4120 · Diagnostic Laboratory Revenue',
        'PHARMACY_REVENUE': '4140 · Pharmacy Drug Sales Revenue', 'GENERAL_REVENUE': '4100 · General Patient Service Revenue',
    }

    @classmethod
    def settlement_journal(cls, start, end, departmentalized: bool = False) -> dict:
        """Balanced double-entry summary: billing (receivable vs revenue + GST), collections (tender vs receivable),
        deposits (tender vs liability), deposit use (liability vs receivable) and refunds (revenue vs tender).
        If departmentalized is True, revenue is broken down across OPD, Lab, and Pharmacy sub-accounts."""
        lines = {}

        def post(account, debit=Decimal('0.00'), credit=Decimal('0.00')):
            row = lines.setdefault(account, [Decimal('0.00'), Decimal('0.00')])
            row[0] += debit
            row[1] += credit

        L = cls.LEDGER
        agg = cls._invoices(start, end).aggregate(s=models.Sum('subtotal'), d=models.Sum('discount'), t=models.Sum('tax'))
        net = _d(agg['s']) - _d(agg['d'])
        tax = _d(agg['t'])
        post(L['RECEIVABLE'], debit=net + tax)

        if departmentalized:
            dept_map = cls._department_live(cls._invoices(start, end))
            dept_credits = {
                'OPD': Decimal('0.00'),
                'LAB': Decimal('0.00'),
                'PHARMACY': Decimal('0.00'),
                'GENERAL': Decimal('0.00')
            }
            for k, v in dept_map.items():
                d_net = _d(v['gross_revenue']) - _d(v['discounts'])
                k_upper = k.upper()
                if k_upper in ('OPD', 'CONSULTATION'):
                    dept_credits['OPD'] += d_net
                elif k_upper in ('LAB', 'LABORATORY', 'PATHOLOGY'):
                    dept_credits['LAB'] += d_net
                elif k_upper in ('PHARMACY', 'PHARM'):
                    dept_credits['PHARMACY'] += d_net
                else:
                    dept_credits['GENERAL'] += d_net

            tot_dept = sum(dept_credits.values(), Decimal('0.00'))
            diff = net - tot_dept
            if diff != Decimal('0.00'):
                dept_credits['GENERAL'] += diff

            if dept_credits['OPD'] > Decimal('0.00'):
                post(L['OPD_REVENUE'], credit=dept_credits['OPD'])
            if dept_credits['LAB'] > Decimal('0.00'):
                post(L['LAB_REVENUE'], credit=dept_credits['LAB'])
            if dept_credits['PHARMACY'] > Decimal('0.00'):
                post(L['PHARMACY_REVENUE'], credit=dept_credits['PHARMACY'])
            if dept_credits['GENERAL'] > Decimal('0.00'):
                post(L['GENERAL_REVENUE'], credit=dept_credits['GENERAL'])
        else:
            post(L['REVENUE'], credit=net)

        post(L['GST'], credit=tax)
        for p in cls._payments(start, end):
            if p.tender_mode == TenderMode.DEPOSIT_DEDUCTION:
                post(L['DEPOSITS'], debit=p.amount)
            else:
                post(L.get(p.tender_mode, L['CASH']), debit=p.amount)
            post(L['RECEIVABLE'], credit=p.amount)
        for dpt in cls._deposits(start, end):
            post(L.get(dpt.tender_mode, L['CASH']), debit=dpt.deposit_amount)
            post(L['DEPOSITS'], credit=dpt.deposit_amount)
        for r in cls._refunds(start, end):
            post(L['REVENUE'], debit=r.requested_amount)
            post(L.get((r.disbursed_tender or 'CASH').upper(), L['CASH']), credit=r.requested_amount)
        rows = [{'account': k, 'debit': _f(v[0]), 'credit': _f(v[1])} for k, v in sorted(lines.items()) if v[0] or v[1]]
        debit = round(sum(r['debit'] for r in rows), 2)
        credit = round(sum(r['credit'] for r in rows), 2)
        return {'rows': rows, 'total_debit': debit, 'total_credit': credit, 'balanced': abs(debit - credit) < 0.005}

    @classmethod
    def departmental_settlement_journal(cls, start, end) -> dict:
        return cls.settlement_journal(start, end, departmentalized=True)

    # ---------- analytics ----------
    @classmethod
    def _period_totals(cls, start, end) -> dict:
        agg = cls._invoices(start, end).aggregate(s=models.Sum('subtotal'), d=models.Sum('discount'), t=models.Sum('tax'))
        gross, disc, tax = _d(agg['s']), _d(agg['d']), _d(agg['t'])
        applied = _d(cls._payments(start, end).aggregate(t=models.Sum('amount'))['t'])
        refunds = _d(cls._refunds(start, end).aggregate(t=models.Sum('requested_amount'))['t'])
        return {'gross': gross, 'discounts': disc, 'tax': tax, 'net': gross - disc, 'billed': gross - disc + tax,
                'collected': applied, 'refunds': refunds}

    @classmethod
    def revenue_analytics(cls, period: str = None) -> dict:
        """period: 'YYYY-MM' (default current month) or 'FY' (financial year to date, April start)."""
        import calendar
        today = timezone.localdate()
        if period in (None, '', 'MTD'):
            start, end, label = today.replace(day=1), today, today.strftime('%B %Y')
        elif str(period).upper() == 'FY':
            fy = today.year if today.month >= 4 else today.year - 1
            start, end, label = today.replace(year=fy, month=4, day=1), today, f'FY {fy}-{str(fy + 1)[-2:]} YTD'
        else:
            try:
                y, m = (int(x) for x in str(period).split('-')[:2])
                start = today.replace(year=y, month=m, day=1)
            except (ValueError, TypeError):
                raise ValueError("period must be 'YYYY-MM' or 'FY'.")
            end = min(today, start.replace(day=calendar.monthrange(y, m)[1]))
            label = start.strftime('%B %Y')
        cur = cls._period_totals(start, end)
        try:
            ly_start, ly_end = start.replace(year=start.year - 1), end.replace(year=end.year - 1)
        except ValueError:  # 29 Feb
            ly_start, ly_end = start.replace(year=start.year - 1, day=28), end.replace(year=end.year - 1, day=28)
        ly = cls._period_totals(ly_start, ly_end)

        def pct(a, b):
            return round(float(a / b * 100), 1) if b else 0.0

        # Payer mix by billed value
        mix = {'SELF_PAY': Decimal('0.00'), 'INSURANCE': Decimal('0.00'), 'CORPORATE': Decimal('0.00')}
        for inv in cls._invoices(start, end):
            mix[cls.payer_type(inv)] += inv.subtotal - inv.discount + inv.tax
        mix_total = sum(mix.values(), Decimal('0.00'))
        payer_mix = [{'payer_type': k, 'label': {'SELF_PAY': 'Self pay', 'INSURANCE': 'Insurance / TPA', 'CORPORATE': 'Corporate'}[k],
                      'amount': _f(v), 'share_percent': pct(v, mix_total)} for k, v in mix.items()]

        # 12-month net revenue trend; the current month adds a run-rate projection to month end
        months = []
        first = today.replace(day=1)
        for i in range(11, -1, -1):
            y, m = first.year, first.month - i
            while m <= 0:
                m += 12
                y -= 1
            ms = first.replace(year=y, month=m, day=1)
            me = ms.replace(day=calendar.monthrange(y, m)[1])
            t = cls._period_totals(ms, min(me, today))
            row = {'month': ms.strftime('%Y-%m'), 'label': ms.strftime('%b'), 'net': _f(t['net']), 'projected': None}
            if ms == first and today.day < me.day:
                row['projected'] = _f(t['net'] / today.day * me.day)
            months.append(row)

        dept = cls.department_revenue(start, end)['rows']
        # Insurer performance: days from claim creation to settlement for claims settled in the period
        insurers = {}
        for c in TPAClaimRecord.objects.filter(claim_status=ClaimLifecycleStatus.SETTLED, updated_at__date__gte=start, updated_at__date__lte=end).select_related('corporate_account'):
            name = c.corporate_account.name if c.corporate_account_id else 'Unknown'
            v = insurers.setdefault(name, {'name': name, 'claims': 0, 'days': 0, 'settled': Decimal('0.00'), 'deductions': Decimal('0.00')})
            v['claims'] += 1
            v['days'] += max(0, (c.updated_at - c.created_at).days)
            v['settled'] += c.settled_amount
            v['deductions'] += c.deduction_amount
        denied = TPAClaimRecord.objects.filter(claim_status=ClaimLifecycleStatus.DENIED, updated_at__date__gte=start, updated_at__date__lte=end).count()
        decided = denied + sum(v['claims'] for v in insurers.values())
        leakage = _d(RevenueLeakageAlert.objects.filter(detected_at__date__gte=start, detected_at__date__lte=end).aggregate(t=models.Sum('estimated_amount'))['t'])
        return {
            'period': {'key': period or 'MTD', 'label': label, 'from': start.isoformat(), 'to': end.isoformat()},
            'kpis': {
                'net_revenue': _f(cur['net']), 'net_revenue_last_year': _f(ly['net']),
                'growth_vs_last_year_percent': pct(cur['net'] - ly['net'], ly['net']) if ly['net'] else None,
                'billed': _f(cur['billed']), 'collected': _f(cur['collected']),
                'collection_efficiency_percent': pct(cur['collected'], cur['billed']),
                'insurance_share_percent': next(p['share_percent'] for p in payer_mix if p['payer_type'] == 'INSURANCE'),
                'discount_percent_of_gross': pct(cur['discounts'], cur['gross']),
                'refund_percent_of_gross': pct(cur['refunds'], cur['gross']),
                'month_end_projection': months[-1]['projected'] if period in (None, '', 'MTD') else None,
            },
            'monthly_trend': months,
            'departments': dept,
            'payer_mix': payer_mix,
            'insurers': sorted(({'name': v['name'], 'claims': v['claims'], 'avg_days_to_pay': round(v['days'] / v['claims'], 1),
                                 'settled': _f(v['settled']), 'deduction_percent': pct(v['deductions'], v['settled'] + v['deductions'])}
                                for v in insurers.values()), key=lambda r: r['avg_days_to_pay']),
            'claim_denial_percent': pct(Decimal(denied), Decimal(decided)) if decided else 0.0,
            'risk': [
                {'label': 'Discounts', 'percent': pct(cur['discounts'], cur['gross'])},
                {'label': 'Refunds', 'percent': pct(cur['refunds'], cur['gross'])},
                {'label': 'Leakage found', 'percent': pct(leakage, cur['gross'])},
            ],
            'note': 'Projection is a run-rate to month end; figures reconcile to Reports for the same period.',
        }

    # ---------- report catalogue ----------
    @classmethod
    def run_report(cls, key: str, start, end) -> dict:
        if key not in cls.REPORTS:
            raise ValueError(f"Unknown report '{key}'.")
        name, desc = cls.REPORTS[key]
        M, N, T, P = 'money', 'number', 'text', 'percent'
        totals = None
        if key == 'gst':
            g = cls.tax_gst(start, end)
            cols = [('label', 'Rate slab', T), ('lines', 'Lines', N), ('taxable_value', 'Taxable value', M), ('cgst', 'CGST', M),
                    ('sgst', 'SGST', M), ('igst', 'IGST', M), ('total_tax', 'GST', M)]
            rows = g['slabs']
            totals = {'label': 'Total', 'lines': g['lines'], **{k: g['totals'][k] for k in ('cgst', 'sgst', 'igst')},
                      'taxable_value': round(g['totals']['taxable_value'] + g['totals']['exempt_value'], 2), 'total_tax': g['totals']['total_tax']}
        elif key == 'department':
            d = cls.department_revenue(start, end)
            cols = [('department', 'Department', T), ('invoices', 'Invoices', N), ('gross', 'Gross', M), ('discounts', 'Discounts', M),
                    ('tax', 'GST', M), ('net', 'Net revenue', M), ('refunds', 'Refunds', M), ('share_percent', 'Share', P)]
            rows, totals = d['rows'], {'department': 'Total', **d['totals']}
        elif key == 'tender':
            c = cls.daily_collections(start, end)
            cols = [('tender', 'Tender', T), ('transactions', 'Transactions', N), ('amount', 'Amount', M), ('share_percent', 'Share', P)]
            rows = c['tenders']
            totals = {'tender': 'Total', 'transactions': sum(r['transactions'] for r in rows), 'amount': c['gross_collected']}
        elif key == 'aging':
            a = cls.aging_ar(end)
            cols = [('label', 'Payer', T)] + [(b, f'{b} days', M) for b in a['buckets']] + [('total', 'Total', M)]
            rows, totals = a['rows'], {'label': 'Total', **a['totals']}
        elif key == 'refunds':
            rows = cls.refunds_report(start, end)
            cols = [('credit_note_number', 'Credit note', T), ('refund_number', 'Refund', T), ('patient', 'Patient', T),
                    ('invoice_number', 'Invoice', T), ('reason', 'Reason', T), ('tender', 'Tender', T), ('approved_by', 'Approved by', T), ('amount', 'Amount', M)]
            totals = {'credit_note_number': 'Total', 'amount': round(sum(r['amount'] for r in rows), 2)}
        elif key == 'discounts':
            rows = cls.discounts_report(start, end)
            cols = [('reason', 'Reason', T), ('approved_by', 'Approved by', T), ('count', 'Bills', N), ('value', 'Value', M), ('percent_of_gross', '% of gross', P)]
            totals = {'reason': 'Total', 'count': sum(r['count'] for r in rows), 'value': round(sum(r['value'] for r in rows), 2)}
        elif key == 'productivity':
            rows = cls.cashier_productivity(start, end)['rows']
            cols = [('cashier', 'Cashier', T), ('transactions', 'Transactions', N), ('invoices', 'Invoices', N), ('collected', 'Collected', M),
                    ('avg_turnaround_minutes', 'Avg turnaround (min)', N), ('within_sla_percent', 'Within SLA', P), ('net_variance', 'Drawer variance', M)]
        else:
            j = cls.settlement_journal(start, end)
            cols = [('account', 'Ledger account', T), ('debit', 'Debit', M), ('credit', 'Credit', M)]
            rows, totals = j['rows'], {'account': 'Total', 'debit': j['total_debit'], 'credit': j['total_credit']}
        return {
            'key': key, 'name': name, 'description': desc,
            'period': {'from': start.isoformat(), 'to': end.isoformat()},
            'columns': [{'key': c[0], 'label': c[1], 'type': c[2]} for c in cols],
            'rows': rows, 'totals': totals,
            'lock_state': cls.lock_state(start, end),
            'source': 'Billing sub-ledger · amounts in INR',
            'generated_at': timezone.localtime().isoformat(),
        }

    @staticmethod
    def to_csv(report: dict) -> str:
        import csv, io
        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow([f"{report['name']} · {report['period']['from']} to {report['period']['to']} · {report['lock_state']['label']}"])
        w.writerow([c['label'] for c in report['columns']])
        for r in report['rows']:
            w.writerow([r.get(c['key'], '') if r.get(c['key']) is not None else '' for c in report['columns']])
        if report.get('totals'):
            w.writerow([report['totals'].get(c['key'], '') for c in report['columns']])
        return buf.getvalue()


class FinancialPeriodCloseService:
    """Day close (Billing Manager), month close (Billing Admin / Finance) and year close (Finance / CFO).
    Locked periods refuse new or edited transactions dated inside them; reopen needs CFO approval and expires."""
    DAY_CLOSERS = ('BILLING_MANAGER', 'BILLING_ADMIN', 'HOSPITAL_ADMIN', 'SUPER_ADMIN')
    MONTH_CLOSERS = ('BILLING_ADMIN', 'HOSPITAL_ADMIN', 'SUPER_ADMIN', 'FINANCE_MANAGER')
    YEAR_CLOSERS = ('FINANCE_MANAGER', 'SUPER_ADMIN')
    CFO_ROLES = ('FINANCE_MANAGER', 'SUPER_ADMIN')
    REOPEN_HOURS = 24
    MIN_REASON = 10

    @staticmethod
    def _role(user):
        return 'SUPER_ADMIN' if getattr(user, 'is_superuser', False) else getattr(user, 'role', None)

    @staticmethod
    def _name(user):
        return (user.get_full_name() or user.username) if user else ''

    # ---------- period resolution ----------
    @staticmethod
    def bounds(period_type: str, ref):
        """(start, end, name) for the period of `ref` (a date)."""
        import calendar
        if period_type == PeriodType.DAILY:
            return ref, ref, ref.strftime('%d %b %Y')
        if period_type == PeriodType.MONTHLY:
            start = ref.replace(day=1)
            return start, start.replace(day=calendar.monthrange(ref.year, ref.month)[1]), start.strftime('%B %Y')
        fy = ref.year if ref.month >= 4 else ref.year - 1
        return ref.replace(year=fy, month=4, day=1), ref.replace(year=fy + 1, month=3, day=31), f'FY {fy}-{str(fy + 1)[-2:]}'

    @classmethod
    def get_lock(cls, period_type, start):
        return FinancialPeriodLock.objects.filter(period_type=period_type, start_date=start).first()

    # ---------- checklists ----------
    @classmethod
    def checklist(cls, period_type: str, ref, carry_forward_note: str = '') -> list:
        start, end, _ = cls.bounds(period_type, ref)
        items = []

        def item(key, label, ok, detail, blocking=True, link=None):
            items.append({'key': key, 'label': label, 'ok': bool(ok), 'detail': detail, 'blocking': blocking and not ok, 'link': link})

        today = timezone.localdate()
        item('ended', 'Period has ended', end < today,
             'Ended' if end < today else f'Runs until {end:%d %b %Y}; close it from the next day')
        shifts = CounterShift.objects.filter(opening_time__date__gte=start, opening_time__date__lte=end)
        open_shifts = shifts.exclude(status=ShiftStatus.CLOSED)
        item('shifts', 'All counter shifts closed and signed off', not open_shifts.exists(),
             f'{shifts.count()} shift(s) · all signed off' if not open_shifts.exists() else
             f'{open_shifts.count()} shift(s) open, awaiting sign-off or under investigation', link='closing')
        not_vaulted = shifts.filter(status=ShiftStatus.CLOSED, vault_handover__isnull=True)
        item('vault', 'Signed-off cash handed to the vault', not not_vaulted.exists(),
             'All cash bags in the vault' if not not_vaulted.exists() else f'{not_vaulted.count()} cash bag(s) not handed over', link='closing')
        pending_refunds = RefundRequest.objects.filter(created_at__date__lte=end, status__in=[RefundStatus.PENDING, RefundStatus.ESCALATED, RefundStatus.APPROVED])
        item('refunds', 'Refunds decided and paid out', not pending_refunds.exists(),
             'No pending refunds' if not pending_refunds.exists() else f'{pending_refunds.count()} refund(s) pending or awaiting payout', link='refunds')
        drafts = Invoice.objects.filter(status=InvoiceStatus.DRAFT, date__lte=end.isoformat())
        item('drafts', 'Draft bills finalised or discarded', not drafts.exists(),
             'No drafts' if not drafts.exists() else f'{drafts.count()} draft bill(s) still parked', blocking=False)
        cutoff = timezone.now() - timedelta(hours=24)
        unbilled = BillableChargeItem.objects.filter(status=ChargeItemStatus.PENDING, created_at__date__lte=end, created_at__lte=cutoff).count()
        leaks = RevenueLeakageAlert.objects.filter(status__in=[RevenueLeakageStatus.OPEN, RevenueLeakageStatus.INVESTIGATING], detected_at__date__lte=end).count()
        carried = len((carry_forward_note or '').strip()) >= cls.MIN_REASON
        clean = unbilled == 0 and leaks == 0
        item('unbilled', 'Unbilled items over 24h resolved or carried forward', clean or carried,
             'None open' if clean else (f'{unbilled} unbilled charge(s) · {leaks} leakage alert(s) carried forward: {carry_forward_note.strip()}' if carried
                                        else f'{unbilled} unbilled charge(s) · {leaks} leakage alert(s) open — resolve or carry forward with a reason'),
             link='integrity')
        if period_type == PeriodType.MONTHLY:
            days = (end - start).days + 1
            closed = FinancialPeriodLock.objects.filter(period_type=PeriodType.DAILY, status=PeriodStatus.LOCKED, start_date__gte=start, end_date__lte=end).count()
            item('days', 'Every day of the month closed', closed == days, f'{closed} of {days} days closed')
        if period_type == PeriodType.ANNUAL:
            closed = FinancialPeriodLock.objects.filter(period_type=PeriodType.MONTHLY, status=PeriodStatus.LOCKED, start_date__gte=start, end_date__lte=end).count()
            item('months', 'Every month of the year closed', closed == 12, f'{closed} of 12 months closed')
        if period_type != PeriodType.DAILY:
            gst = BillingReportingService.tax_gst(start, min(end, today))
            item('gst', 'GST return reconciles to invoices', gst['reconciles_to_invoices'],
                 f"GST ₹{gst['totals']['total_tax']:,.2f} on {gst['lines']} line(s)" if gst['reconciles_to_invoices']
                 else f"Line tax ₹{gst['totals']['total_tax']:,.2f} ≠ invoice tax ₹{gst['invoice_tax']:,.2f}")
        journal = BillingReportingService.settlement_journal(start, min(end, today))
        item('journal', 'Settlement journal balances', journal['balanced'],
             f"Debits = credits = ₹{journal['total_debit']:,.2f}" if journal['balanced'] else 'Journal does not balance', link='reports')
        return items

    # ---------- close ----------
    @classmethod
    def _assert_can_close(cls, user, period_type):
        allowed = {PeriodType.DAILY: cls.DAY_CLOSERS, PeriodType.MONTHLY: cls.MONTH_CLOSERS, PeriodType.ANNUAL: cls.YEAR_CLOSERS}[period_type]
        if cls._role(user) not in allowed:
            who = {PeriodType.DAILY: 'a Billing Manager or Admin', PeriodType.MONTHLY: 'a Billing Admin or Finance', PeriodType.ANNUAL: 'the CFO (Finance)'}[period_type]
            raise PermissionError(f'{PeriodType(period_type).label} close needs {who}.')

    @classmethod
    def close_period(cls, user, period_type: str, ref, carry_forward_note: str = '') -> FinancialPeriodLock:
        period_type = (period_type or '').upper()
        if period_type not in PeriodType.values:
            raise ValueError('period_type must be DAILY, MONTHLY or ANNUAL.')
        cls._assert_can_close(user, period_type)
        start, end, name = cls.bounds(period_type, ref)
        with transaction.atomic():
            lock = cls.get_lock(period_type, start)
            if lock and lock.status == PeriodStatus.LOCKED:
                raise ValueError(f'{name} is already closed.')
            checks = cls.checklist(period_type, ref, carry_forward_note)
            blockers = [c for c in checks if c['blocking']]
            if blockers:
                raise ValueError('Cannot close ' + name + ': ' + '; '.join(c['label'] + ' (' + c['detail'] + ')' for c in blockers))
            totals = BillingReportingService._period_totals(start, end)
            outstanding = _d(Invoice.objects.filter(date__gte=start.isoformat(), date__lte=end.isoformat(),
                                                    status__in=BillingReportingService.OUTSTANDING_STATUSES).aggregate(t=models.Sum('balance'))['t'])
            journal = BillingReportingService.settlement_journal(start, end)
            lock = lock or FinancialPeriodLock(period_type=period_type, start_date=start, end_date=end, period_name=name)
            lock.status = PeriodStatus.LOCKED
            lock.closed_by, lock.closed_at = user, timezone.now()
            lock.total_gross_billed, lock.total_discounts, lock.total_tax = totals['gross'], totals['discounts'], totals['tax']
            lock.total_collected, lock.total_refunded, lock.total_outstanding = totals['collected'], totals['refunds'], outstanding
            lock.checklist = checks
            lock.carry_forward_note = (carry_forward_note or '').strip()
            lock.journal = journal['rows']
            lock.journal_reference = lock.journal_reference or next_journal_reference()
            lock.reopen_expires_at = None
            lock.save()
            if period_type == PeriodType.DAILY:
                BillingReportingService.build_snapshot(start, final=True)
            SupervisorGovernanceService.audit(
                AuditEventType.PERIOD_CLOSED, f'{PeriodType(period_type).label} closed', f'{name} · locked for entries · billed ₹{totals["billed"]:,.2f}',
                AuditSeverity.MEDIUM, user, None, f'CLOSE-{start:%Y%m%d}-{period_type[0]}')
            # Period Close event: the balanced journal feed for the hospital ERP (Tally / SAP / Oracle)
            SupervisorGovernanceService.audit(
                AuditEventType.ERP_JOURNAL, 'Settlement journal ready for ERP', f'{name} · debits ₹{journal["total_debit"]:,.2f} = credits',
                AuditSeverity.LOW, user, None, lock.journal_reference)
            return lock

    # ---------- reopen ----------
    @classmethod
    def request_reopen(cls, user, lock_id, reason: str) -> FinancialPeriodLock:
        reason = (reason or '').strip()
        if len(reason) < cls.MIN_REASON:
            raise ValueError('Explain why the period must be reopened (at least 10 characters).')
        with transaction.atomic():
            lock = FinancialPeriodLock.objects.select_for_update().get(id=lock_id)
            if lock.status != PeriodStatus.LOCKED:
                raise ValueError(f'{lock.period_name} is not locked.')
            if lock.reopen_requested_at and not lock.reopen_approved_at:
                raise ValueError(f'A reopen request for {lock.period_name} is already waiting for the CFO.')
            parent = FinancialPeriodLock.objects.filter(status=PeriodStatus.LOCKED, start_date__lte=lock.start_date, end_date__gte=lock.end_date) \
                .exclude(id=lock.id).first()
            if parent:
                raise ValueError(f'{parent.period_name} is also closed: reopen it first.')
            lock.reopen_reason, lock.reopen_requested_by, lock.reopen_requested_at = reason, user, timezone.now()
            lock.reopen_approved_by = lock.reopen_approved_at = None
            lock.save()
            SupervisorGovernanceService.audit(AuditEventType.PERIOD_REOPEN, 'Period reopen requested', f'{lock.period_name} · sent to CFO · {reason}',
                                              AuditSeverity.HIGH, user, None, f'REOPEN-{lock.start_date:%Y%m%d}')
            return lock

    @classmethod
    def decide_reopen(cls, user, lock_id, approve: bool, note: str = '', hours: int = None) -> FinancialPeriodLock:
        if cls._role(user) not in cls.CFO_ROLES:
            raise PermissionError('Reopening a closed period needs CFO (Finance) approval.')
        with transaction.atomic():
            lock = FinancialPeriodLock.objects.select_for_update().get(id=lock_id)
            if not lock.reopen_requested_at or lock.reopen_approved_at or lock.status != PeriodStatus.LOCKED:
                raise ValueError(f'No reopen request is waiting for {lock.period_name}.')
            if lock.reopen_requested_by_id == user.id:
                raise PermissionError('Segregation of duties: the requester cannot approve their own reopen.')
            hours = max(1, min(int(hours or cls.REOPEN_HOURS), 72))
            if approve:
                lock.status = PeriodStatus.REOPENED
                lock.reopen_approved_by, lock.reopen_approved_at = user, timezone.now()
                lock.reopen_expires_at = timezone.now() + timedelta(hours=hours)
                title, detail = 'Period reopened', f'{lock.period_name} · open for {hours}h · {note or lock.reopen_reason}'
            else:
                if len((note or '').strip()) < 5:
                    raise ValueError('A note is required to decline a reopen.')
                lock.reopen_requested_at = lock.reopen_requested_by = None
                title, detail = 'Period reopen declined', f'{lock.period_name} · {note}'
            lock.save()
            SupervisorGovernanceService.audit(AuditEventType.PERIOD_REOPEN, title, detail, AuditSeverity.HIGH, user, None, f'REOPEN-{lock.start_date:%Y%m%d}')
            return lock

    @classmethod
    def relock(cls, user, lock_id) -> FinancialPeriodLock:
        with transaction.atomic():
            lock = FinancialPeriodLock.objects.select_for_update().get(id=lock_id)
            if lock.status != PeriodStatus.REOPENED:
                raise ValueError(f'{lock.period_name} is not reopened.')
            cls._assert_can_close(user, lock.period_type)
            return cls.close_period(user, lock.period_type, lock.start_date, lock.carry_forward_note)

    # ---------- overview ----------
    @classmethod
    def lock_dict(cls, lock) -> dict:
        return {
            'id': str(lock.id), 'period_name': lock.period_name, 'period_type': lock.period_type, 'status': lock.status,
            'start_date': lock.start_date.isoformat(), 'end_date': lock.end_date.isoformat(),
            'closed_by': cls._name(lock.closed_by) or None, 'closed_at': timezone.localtime(lock.closed_at).isoformat() if lock.closed_at else None,
            'totals': {'gross_billed': _f(lock.total_gross_billed), 'discounts': _f(lock.total_discounts), 'tax': _f(lock.total_tax),
                       'collected': _f(lock.total_collected), 'refunded': _f(lock.total_refunded), 'outstanding': _f(lock.total_outstanding)},
            'journal_reference': lock.journal_reference, 'carry_forward_note': lock.carry_forward_note,
            'reopen': {'reason': lock.reopen_reason, 'requested_by': cls._name(lock.reopen_requested_by) or None,
                       'requested_at': timezone.localtime(lock.reopen_requested_at).isoformat() if lock.reopen_requested_at else None,
                       'approved_by': cls._name(lock.reopen_approved_by) or None,
                       'expires_at': timezone.localtime(lock.reopen_expires_at).isoformat() if lock.reopen_expires_at else None,
                       'pending': bool(lock.reopen_requested_at and not lock.reopen_approved_at)},
        }

    @classmethod
    def overview(cls, viewer, selected=None, days: int = 14) -> dict:
        FinancialPeriodLock.locking(timezone.localdate())  # relock expired reopens
        today = timezone.localdate()
        locks = {(l.period_type, l.start_date): l for l in FinancialPeriodLock.objects.select_related('closed_by', 'reopen_requested_by', 'reopen_approved_by')}
        strip = []
        for i in range(days - 1, -1, -1):
            d = today - timedelta(days=i)
            lk = locks.get((PeriodType.DAILY, d))
            month_lk = locks.get((PeriodType.MONTHLY, d.replace(day=1)))
            st = 'LIVE' if d == today else (lk.status if lk else ('LOCKED' if month_lk and month_lk.status == PeriodStatus.LOCKED else 'OPEN'))
            strip.append({'date': d.isoformat(), 'label': d.strftime('%d %b'), 'status': st, 'lock_id': str(lk.id) if lk else None})
        sel = selected or (today - timedelta(days=1))
        checks = cls.checklist(PeriodType.DAILY, sel)
        months = []
        first = today.replace(day=1)
        for i in range(3, -1, -1):
            y, m = first.year, first.month - i
            while m <= 0:
                m += 12
                y -= 1
            ms = first.replace(year=y, month=m)
            lk = locks.get((PeriodType.MONTHLY, ms))
            months.append({'month': ms.strftime('%Y-%m'), 'label': ms.strftime('%B %Y'), 'status': lk.status if lk else ('LIVE' if ms == first else 'OPEN'),
                           'lock': cls.lock_dict(lk) if lk else None})
        fy_start, fy_end, fy_name = cls.bounds(PeriodType.ANNUAL, today)
        fy_lock = locks.get((PeriodType.ANNUAL, fy_start))
        not_closed = [x for x in strip if x['status'] == 'OPEN']
        last_month = next((m for m in reversed(months) if m['status'] == PeriodStatus.LOCKED), None)
        reopen = [cls.lock_dict(l) for l in locks.values() if l.reopen_requested_at or l.status == PeriodStatus.REOPENED]
        return {
            'today': today.isoformat(),
            'kpis': {
                'shifts_open': CounterShift.objects.filter(status=ShiftStatus.OPEN).count(),
                'days_not_closed': len(not_closed),
                'blocking_items': len([c for c in checks if c['blocking']]),
                'last_month_closed': last_month['label'] if last_month else None,
            },
            'days': strip,
            'selected': {'date': sel.isoformat(), 'label': sel.strftime('%d %b %Y'),
                         'lock': cls.lock_dict(locks[(PeriodType.DAILY, sel)]) if (PeriodType.DAILY, sel) in locks else None,
                         'checklist': checks, 'can_close': not any(c['blocking'] for c in checks)},
            'months': months,
            'financial_year': {'label': fy_name, 'status': fy_lock.status if fy_lock else 'OPEN', 'lock': cls.lock_dict(fy_lock) if fy_lock else None},
            'reopen_requests': sorted(reopen, key=lambda r: r['start_date'], reverse=True),
            'roles': {'can_close_day': cls._role(viewer) in cls.DAY_CLOSERS, 'can_close_month': cls._role(viewer) in cls.MONTH_CLOSERS,
                      'can_close_year': cls._role(viewer) in cls.YEAR_CLOSERS, 'can_approve_reopen': cls._role(viewer) in cls.CFO_ROLES},
        }


class BillingAuditLogService:
    """A-21 Audit Log: the billing audit stream grouped into spec categories, searchable, with a hash-chain check."""
    CATEGORY = {
        'Financial': {'HIGH_VALUE_CASH', 'DISCOUNT_REQUESTED', 'VOID_REQUESTED', 'APPROVAL_DECIDED', 'APPROVAL_ESCALATED', 'INVOICE_VOIDED',
                      'REFUND_REQUESTED', 'REFUND_DECIDED', 'REFUND_PAID', 'CASH_PICKUP', 'CLOSING', 'VAULT_HANDOVER', 'DAILY_TARIFF_ACCRUED',
                      'INTERIM_DEMAND_ISSUED', 'DISCHARGE_CLEARED', 'REVENUE_LEAKAGE', 'LEAKAGE_RECOVERED', 'LEAKAGE_DISMISSED',
                      'PERIOD_CLOSED', 'PERIOD_REOPEN', 'ERP_JOURNAL', 'FRAUD_SIGNAL', 'INVESTIGATION_EVENT'},
        'Master data': {'TARIFF_CHANGE', 'PACKAGE_CHANGE'},
        'Policy': {'POLICY_CHANGE', 'MATRIX_CHANGE', 'ROSTER_PUBLISHED'},
        'Contract': {'GOP_APPROVED', 'CLAIM_DENIED', 'VOUCHER_VERIFIED', 'CREDIT_CAP_BLOCKED'},
        'Access': {'COUNTER_MODE', 'HARDWARE_LOCK', 'PERIOD_LOCK_DENIED', 'REPORT_EXPORTED', 'DISCHARGE_GATE_VERIFIED'},
    }

    @classmethod
    def category_of(cls, event_type: str) -> str:
        return next((c for c, types in cls.CATEGORY.items() if event_type in types), 'Financial')

    @classmethod
    def query(cls, category=None, search=None, user=None, reference=None, date_from=None, date_to=None, limit: int = 500) -> dict:
        qs = BillingAuditEvent.objects.select_related('actor', 'counter', 'reviewed_by')
        if category and category != 'All':
            qs = qs.filter(event_type__in=cls.CATEGORY.get(category, set()))
        if search:
            qs = qs.filter(models.Q(title__icontains=search) | models.Q(detail__icontains=search) | models.Q(reference__icontains=search)
                           | models.Q(actor__username__icontains=search) | models.Q(actor__first_name__icontains=search)
                           | models.Q(actor__last_name__icontains=search))
        if user:
            qs = qs.filter(actor__username__iexact=user)
        if reference:
            qs = qs.filter(reference__icontains=reference)
        if date_from:
            qs = qs.filter(occurred_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(occurred_at__date__lte=date_to)
        total = qs.count()
        rows = [{
            'id': str(e.id), 'sequence': e.sequence, 'occurred_at': timezone.localtime(e.occurred_at).isoformat(),
            'category': cls.category_of(e.event_type), 'event_type': e.event_type, 'severity': e.severity,
            'title': e.title, 'change': e.detail, 'user': (e.actor.get_full_name() or e.actor.username) if e.actor else 'System',
            'counter': e.counter.name if e.counter_id else None, 'reference': e.reference or '—', 'entry_hash': e.entry_hash[:12],
        } for e in qs.order_by('-occurred_at')[:limit]]
        counts = {c: BillingAuditEvent.objects.filter(event_type__in=types).count() for c, types in cls.CATEGORY.items()}
        counts['All'] = BillingAuditEvent.objects.count()
        return {'rows': rows, 'total': total, 'counts': counts, 'retention': 'Retained 8 years · entries cannot be edited or deleted'}

    @staticmethod
    def verify_chain() -> dict:
        """Recompute every hash in sequence order; the first mismatch pinpoints a tampered or missing entry."""
        prev, checked = '', 0
        for e in BillingAuditEvent.objects.exclude(sequence__isnull=True).order_by('sequence').iterator():
            checked += 1
            if e.prev_hash != prev or e.compute_hash() != e.entry_hash or e.sequence != checked:
                return {'intact': False, 'checked': checked, 'broken_at_sequence': e.sequence,
                        'message': f'Chain broken at entry #{e.sequence}: an entry was altered, removed or inserted.'}
            prev = e.entry_hash
        return {'intact': True, 'checked': checked, 'broken_at_sequence': None, 'message': f'All {checked} entries verified.'}

    @classmethod
    def to_csv(cls, data: dict) -> str:
        import csv, io
        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(['#', 'When', 'Category', 'Event', 'User', 'Change', 'Reference', 'Hash'])
        for r in data['rows']:
            w.writerow([r['sequence'], r['occurred_at'], r['category'], r['title'], r['user'], r['change'], r['reference'], r['entry_hash']])
        return buf.getvalue()
