from decimal import Decimal, ROUND_HALF_UP
from django.db import transaction, models
from django.utils import timezone
from .models import (
    TariffMaster, ServicePackage, CorporateAccount,
    Invoice, InvoiceItem, Payment, TenderMode,
    PatientDeposit, BillingCounter, CounterShift, ShiftStatus
)

class TariffPricingService:
    @staticmethod
    def get_effective_tariff(service_code: str, encounter_type: str = 'OPD', patient_category: str = 'GENERAL', is_emergency: bool = False):
        tariff = TariffMaster.objects.filter(code=service_code, is_active=True).first()
        if not tariff:
            return None

        base_price = Decimal(str(tariff.base_price))
        markup_amount = Decimal('0.00')

        if is_emergency or encounter_type == 'EMERGENCY':
            markup_pct = Decimal(str(tariff.emergency_markup_percent))
            if markup_pct > Decimal('0.00'):
                markup_amount = (base_price * markup_pct / Decimal('100.00')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

        subtotal_before_tax = base_price + markup_amount

        # GST calculation
        gst_rate = Decimal(str(tariff.gst_rate))
        tax_amount = Decimal('0.00')
        if gst_rate > Decimal('0.00'):
            tax_amount = (subtotal_before_tax * gst_rate / Decimal('100.00')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

        net_price = subtotal_before_tax + tax_amount

        return {
            'code': tariff.code,
            'name': tariff.name,
            'department': tariff.department,
            'base_price': base_price,
            'markup_percent': tariff.emergency_markup_percent,
            'markup_amount': markup_amount,
            'subtotal': subtotal_before_tax,
            'gst_rate': gst_rate,
            'tax_amount': tax_amount,
            'net_price': net_price
        }

    @staticmethod
    def calculate_quote(
        items: list,
        encounter_type: str = 'OPD',
        patient_category: str = 'GENERAL',
        is_emergency: bool = False,
        corporate_account_id: str = None
    ) -> dict:
        calculated_items = []
        gross_total = Decimal('0.00')
        total_tax = Decimal('0.00')
        total_discount = Decimal('0.00')

        corporate = None
        if corporate_account_id:
            corporate = CorporateAccount.objects.filter(id=corporate_account_id, is_active=True).first()

        for raw_item in items:
            code = raw_item.get('service_code') or raw_item.get('code')
            qty = Decimal(str(raw_item.get('qty', 1)))
            custom_unit_price = raw_item.get('unit_price') or raw_item.get('unitPrice')

            tariff_info = TariffPricingService.get_effective_tariff(
                service_code=code,
                encounter_type=encounter_type,
                patient_category=patient_category,
                is_emergency=is_emergency
            ) if code else None

            if tariff_info:
                name = raw_item.get('description') or raw_item.get('name') or tariff_info['name']
                dept = raw_item.get('department') or tariff_info['department']
                unit_price = Decimal(str(custom_unit_price)) if custom_unit_price is not None else tariff_info['base_price']
                markup = tariff_info['markup_amount']
                tax_rate = tariff_info['gst_rate']
            else:
                name = raw_item.get('description') or raw_item.get('name', 'Custom Hospital Service')
                dept = raw_item.get('department', 'GENERAL')
                unit_price = Decimal(str(custom_unit_price or 0.0))
                markup = Decimal('0.00')
                tax_rate = Decimal(str(raw_item.get('tax_rate', 0.0)))

            line_base = (unit_price + markup) * qty
            line_discount = Decimal(str(raw_item.get('discount_amount', 0.0)))
            line_subtotal = max(Decimal('0.00'), line_base - line_discount)
            line_tax = (line_subtotal * tax_rate / Decimal('100.00')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            line_total = line_subtotal + line_tax

            calculated_items.append({
                'service_code': code or '',
                'description': name,
                'department': dept,
                'qty': int(qty),
                'unit_price': unit_price,
                'markup_amount': markup,
                'discount_amount': line_discount,
                'tax_rate': tax_rate,
                'tax_amount': line_tax,
                'total': line_total
            })

            gross_total += (unit_price + markup) * qty
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
            'is_emergency': is_emergency
        }

    @staticmethod
    def check_package_coverage(package_id_or_code: str, service_name_or_code: str) -> bool:
        package = ServicePackage.objects.filter(code=package_id_or_code).first()
        if not package:
            try:
                package = ServicePackage.objects.filter(id=package_id_or_code).first()
            except Exception:
                package = None

        if not package or not package.inclusions_description:
            return False

        inclusions = package.inclusions_description.lower()
        query = service_name_or_code.lower()
        return query in inclusions


class BillingCoreService:
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

            receipt_token = f"RCT-{timezone.now().strftime('%Y%m')}-{invoice.invoice_number.split('-')[-1]}"

            return {
                'invoice': invoice,
                'payments': created_payments,
                'total_paid_now': total_paid_now,
                'remaining_balance': invoice.balance,
                'receipt_token': receipt_token,
                'status': invoice.status
            }

    @staticmethod
    def get_receipt_details(invoice_id_or_number: str) -> dict:
        invoice = Invoice.objects.select_related('patient', 'counter', 'cashier', 'shift').prefetch_related('items', 'payments').filter(
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
            'items': items_list,
            'payments': payments_list,
            'verification_qr': f"NORTH_HOSPITAL|{invoice.invoice_number}|{patient_data['uhid']}|{invoice.total}|{invoice.status}"
        }


class CounterClosingService:
    @staticmethod
    def open_shift(cashier, counter_code: str = 'COUNTER-01', opening_float: Decimal = Decimal('5000.00')) -> CounterShift:
        counter, _ = BillingCounter.objects.get_or_create(
            code=counter_code,
            defaults={'name': f'{counter_code} Desk', 'station_location': 'OPD_LOBBY'}
        )

        active_shift = CounterShift.objects.filter(
            counter=counter,
            cashier=cashier,
            status=ShiftStatus.OPEN
        ).first()

        if active_shift:
            return active_shift

        shift = CounterShift.objects.create(
            counter=counter,
            cashier=cashier,
            opening_float=opening_float,
            status=ShiftStatus.OPEN
        )
        return shift

    @staticmethod
    def get_active_shift_summary(cashier=None, counter_code: str = None) -> dict:
        qs = CounterShift.objects.filter(status=ShiftStatus.OPEN)
        if cashier:
            qs = qs.filter(cashier=cashier)
        if counter_code:
            qs = qs.filter(counter__code=counter_code)

        shift = qs.first()
        if not shift:
            shift = CounterShift.objects.filter(status=ShiftStatus.OPEN).first()

        if not shift:
            return {
                'has_active_shift': False,
                'shift': None,
                'counter': None,
                'opening_float': 0.0,
                'cash_collected': 0.0,
                'card_collected': 0.0,
                'upi_collected': 0.0,
                'deposit_deducted': 0.0,
                'total_collected': 0.0,
                'expected_cash_in_drawer': 0.0,
                'invoices_count': 0
            }

        payments = Payment.objects.filter(shift=shift, payment_status='SUCCESS')

        cash_coll = Decimal('0.00')
        card_coll = Decimal('0.00')
        upi_coll = Decimal('0.00')
        deposit_coll = Decimal('0.00')
        other_coll = Decimal('0.00')

        for p in payments:
            amt = p.amount
            if p.tender_mode == TenderMode.CASH:
                cash_coll += amt
            elif p.tender_mode == TenderMode.CARD:
                card_coll += amt
            elif p.tender_mode == TenderMode.UPI:
                upi_coll += amt
            elif p.tender_mode == TenderMode.DEPOSIT_DEDUCTION:
                deposit_coll += amt
            else:
                other_coll += amt

        total_coll = cash_coll + card_coll + upi_coll + deposit_coll + other_coll
        expected_cash = shift.opening_float + cash_coll
        invoices_count = payments.values('invoice_id').distinct().count()

        return {
            'has_active_shift': True,
            'shift': {
                'id': str(shift.id),
                'opening_time': shift.opening_time.strftime('%Y-%m-%d %H:%M:%S'),
                'opening_float': float(shift.opening_float),
                'status': shift.status,
                'cashier_name': shift.cashier.get_full_name() or shift.cashier.username if shift.cashier else 'Cashier'
            },
            'counter': {
                'id': str(shift.counter.id),
                'code': shift.counter.code,
                'name': shift.counter.name,
                'location': shift.counter.get_station_location_display()
            },
            'opening_float': float(shift.opening_float),
            'cash_collected': float(cash_coll),
            'card_collected': float(card_coll),
            'upi_collected': float(upi_coll),
            'deposit_deducted': float(deposit_coll),
            'other_collected': float(other_coll),
            'total_collected': float(total_coll),
            'expected_cash_in_drawer': float(expected_cash),
            'invoices_count': invoices_count
        }

    @staticmethod
    def close_shift(
        shift_id: str,
        physical_cash_count: Decimal,
        notes: str = '',
        denominations: dict = None,
        supervisor=None
    ) -> CounterShift:
        shift = CounterShift.objects.get(id=shift_id)
        payments = Payment.objects.filter(shift=shift, payment_status='SUCCESS', tender_mode=TenderMode.CASH)
        cash_coll = sum([p.amount for p in payments], Decimal('0.00'))

        system_expected = shift.opening_float + cash_coll
        variance = Decimal(str(physical_cash_count)) - system_expected

        shift.physical_cash_count = Decimal(str(physical_cash_count))
        shift.system_expected_cash = system_expected
        shift.cash_variance = variance
        shift.variance_note = notes
        if denominations:
            shift.denominations_submitted = denominations
        shift.closing_time = timezone.now()
        shift.status = ShiftStatus.PENDING_APPROVAL if not supervisor else ShiftStatus.CLOSED
        if supervisor:
            shift.supervisor_sign_off_by = supervisor
            shift.supervisor_signed_at = timezone.now()
        shift.save()
        return shift

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

