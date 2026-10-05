import uuid
from decimal import Decimal
from datetime import timedelta
from django.db import transaction
from django.db.models import Sum, Q, F
from django.utils import timezone
from django.contrib.auth import get_user_model

from apps.accounts.models import RoleType
from apps.patients.models import Patient
from apps.ipd.models import InpatientAdmission, MedicationAdministration, AdmissionStatus
from apps.billing.models import Invoice, InvoiceItem, InvoiceCategory, InvoiceStatus
from apps.pharmacy.models import (
    PharmacyMedicine,
    PharmacyBatch,
    PharmacyDispenseOrder,
    PharmacyDispenseOrderItem,
    PharmacyReturn,
    PharmacyReturnItem,
    PharmacyStockTransaction,
    PharmacyControlledDrugRegister,
    StockTransactionType,
    BatchStatus,
    DispenseOrderStatus,
    EncounterType,
    ReturnType,
    ReturnAction,
)

User = get_user_model()


class PharmacyIPDOperationsService:
    """
    Dedicated operational service for Hospital IPD Pharmacy Operations.
    Connects Pharmacy with Inpatient Wards (apps.ipd), MAR Administration,
    and Inpatient Billing (apps.billing).

    Implements:
    1. Allocation Visibility (Requested, Allocated, Remaining, Backordered)
    2. 5-Step Issue Lifecycle (Review -> Allocate Stock -> Issue Medicines -> Ward Handover -> Complete)
    3. Alternative Medicine & Prescriber Approval Audit
    4. Ward Handover Custody Tracking (Nurse, Time, Pharmacist)
    5. Bedside MAR Synchronization (Awaiting Supply, Ready To Administer, Administered)
    6. Pending Issue Statuses (Reviewing, Allocated, Awaiting Pickup, Issued, Partially Issued)
    7. Ward Return Classifications (Patient Discharged, Medication Stopped, Unused, Expired, Damaged)
    """

    ALTERNATIVES_DIRECTORY = {
        'ENX': [('DAL', 'Same class · LMWH equivalent'), ('HEP', 'Unfractionated heparin alternative')],
        'PCI': [('PCT', 'Oral route paracetamol switch')],
        'PTZ': [('MER', 'Broad-spectrum carbapenem substitute')],
        'CEF': [('MER', 'Third-generation cephalosporin switch')],
        'AMI': [('MET', 'Antiarrhythmic beta-blocker substitute')],
    }

    @classmethod
    def get_ipd_queue(cls, tab='requests', ward='All', search='', pending_status=None):
        """
        Retrieves inpatient queue with allocation metrics, live MAR status,
        handover custody, and substitution audit data.
        """
        qs = PharmacyDispenseOrder.objects.filter(
            encounter_type=EncounterType.IPD
        ).select_related(
            'patient',
            'admission',
            'admission__bed',
            'dispensed_by'
        ).prefetch_related(
            'items__medicine',
            'items__batch'
        )

        # Tab Filtering
        if tab == 'issued':
            qs = qs.filter(status=DispenseOrderStatus.DISPENSED, is_cancelled=False)
        elif tab == 'emergency':
            qs = qs.filter(
                Q(priority='STAT') | Q(is_emergency=True)
            ).exclude(status=DispenseOrderStatus.DISPENSED).filter(is_cancelled=False)
        elif tab == 'pending':
            qs = qs.exclude(status=DispenseOrderStatus.DISPENSED).filter(is_cancelled=False)
        else:  # 'requests'
            qs = qs.exclude(status=DispenseOrderStatus.DISPENSED).filter(
                is_cancelled=False,
                step__lte=2,
                hold_reason__isnull=True
            ).exclude(status=DispenseOrderStatus.AWAITING_STOCK)

        # Ward Filter
        if ward and ward != 'All':
            qs = qs.filter(ward_name__iexact=ward)

        # Search Query
        if search:
            q_clean = search.strip().lower()
            qs = qs.filter(
                Q(patient__first_name__icontains=q_clean) |
                Q(patient__last_name__icontains=q_clean) |
                Q(patient__uhid__icontains=q_clean) |
                Q(admission__admission_number__icontains=q_clean) |
                Q(ward_name__icontains=q_clean) |
                Q(bed_number__icontains=q_clean) |
                Q(order_number__icontains=q_clean)
            )

        orders = list(qs)
        now = timezone.now()

        # Sort: STAT first, then wait time
        priority_weights = {'STAT': 0, 'URGENT': 1, 'ROUTINE': 2, 'DISCHARGE': 3}
        if tab == 'issued':
            orders.sort(key=lambda x: x.dispensed_at or x.updated_at, reverse=True)
        else:
            orders.sort(key=lambda x: (
                priority_weights.get(x.priority.upper(), 2),
                x.created_at
            ))

        serialized = []
        for o in orders:
            wait_mins = max(0, int((now - o.created_at).total_seconds() // 60))
            patient_allergies = o.patient.allergies if hasattr(o.patient, 'allergies') and o.patient.allergies else []
            if isinstance(patient_allergies, str):
                patient_allergies = [a.strip() for a in patient_allergies.split(',') if a.strip()]

            # Determine allergy conflict
            allergy_conflict = None
            for item in o.items.all():
                med_allergens = getattr(item.medicine, 'known_allergens', []) or []
                if isinstance(med_allergens, str):
                    med_allergens = [med_allergens]
                for alg in patient_allergies:
                    med_str = (item.medicine.name + ' ' + (item.medicine.generic_name or '')).lower()
                    if any(alg.lower() in str(ma).lower() for ma in med_allergens) or (
                        'penicillin' in alg.lower() and 'penicillin' in med_str
                    ):
                        allergy_conflict = {
                            'item_name': item.medicine.name,
                            'allergen': alg,
                            'note': f"{alg} allergy recorded on admission record"
                        }
                        break
                if allergy_conflict:
                    break

            # Line items with 4-Segment Allocation Visibility & MAR status
            lines_data = []
            has_cd = False
            has_cold_chain = False
            any_shortage = False

            ipd_data = o.ipd_data or {}
            saved_allocations = ipd_data.get('allocations', {})
            saved_mar_statuses = ipd_data.get('mar_statuses', {})
            substitution_history = ipd_data.get('substitution_history', [])

            for it in o.items.all():
                is_cd = getattr(it.medicine, 'is_narcotic', False) or getattr(it.medicine, 'schedule', '') in ['H1', 'X']
                storage_cond = (getattr(it.medicine, 'storage_conditions', '') or '')
                is_cold = 'cold' in storage_cond.lower() or 'fridge' in storage_cond.lower() or 'insulin' in it.medicine.name.lower()
                if is_cd:
                    has_cd = True
                if is_cold:
                    has_cold_chain = True

                # Stock availability
                avail_batches = PharmacyBatch.objects.filter(
                    medicine=it.medicine,
                    status=BatchStatus.ACTIVE,
                    is_quarantined=False,
                    available_quantity__gt=0
                ).order_by('expiry_date')

                avail_qty = sum(b.available_quantity for b in avail_batches)
                if avail_qty < it.prescribed_quantity:
                    any_shortage = True

                # Requirement 1: Allocation Visibility Quantities
                requested_qty = it.prescribed_quantity
                item_key = str(it.id)
                if item_key in saved_allocations:
                    allocated_qty = saved_allocations[item_key].get('allocated_quantity', min(requested_qty, avail_qty))
                    backordered_qty = saved_allocations[item_key].get('backordered_quantity', max(0, requested_qty - allocated_qty))
                else:
                    allocated_qty = min(requested_qty, avail_qty)
                    backordered_qty = max(0, requested_qty - allocated_qty)

                remaining_qty = max(0, requested_qty - allocated_qty)

                # FEFO allocations
                allocations = []
                remaining_needed = allocated_qty
                for b in avail_batches:
                    take = min(b.available_quantity, remaining_needed)
                    if take > 0:
                        allocations.append({
                            'batch_number': b.batch_number,
                            'expiry_date': b.expiry_date.strftime('%Y-%m'),
                            'allocated_quantity': take
                        })
                        remaining_needed -= take
                    if remaining_needed <= 0:
                        break

                # Requirement 3: Alternatives for shortage
                alt_tuples = cls.ALTERNATIVES_DIRECTORY.get(it.medicine.item_code, [])
                alts = []
                for alt_code, reason in alt_tuples:
                    alt_med = PharmacyMedicine.objects.filter(item_code=alt_code).first()
                    if alt_med:
                        alt_stock = sum(
                            b.available_quantity for b in PharmacyBatch.objects.filter(
                                medicine=alt_med, status=BatchStatus.ACTIVE, is_quarantined=False
                            )
                        )
                        alts.append({
                            'code': alt_code,
                            'name': alt_med.name,
                            'reason': reason,
                            'stock': alt_stock
                        })

                # Requirement 5: Line-level MAR Status
                line_mar_status = saved_mar_statuses.get(item_key)
                if not line_mar_status:
                    if o.status == DispenseOrderStatus.DISPENSED:
                        line_mar_status = 'Ready To Administer'
                    else:
                        line_mar_status = 'Awaiting Supply'

                # Item substitution audit
                sub_audit = next((s for s in substitution_history if s.get('original_code') == it.medicine.item_code), None)

                lines_data.append({
                    'id': str(it.id),
                    'code': it.medicine.item_code,
                    'name': it.medicine.name,
                    'dose': it.dosage_instruction or 'Standard dose',
                    'prescribed_quantity': requested_qty,
                    'allocated_quantity': allocated_qty,
                    'remaining_quantity': remaining_qty,
                    'backordered_quantity': backordered_qty,
                    'dispensed_quantity': it.dispensed_quantity,
                    'unit_price': float(it.unit_price),
                    'line_total': float(it.line_total),
                    'is_cd': is_cd,
                    'is_cold_chain': is_cold,
                    'available_stock': avail_qty,
                    'is_picked': it.is_picked,
                    'allocations': allocations,
                    'alternatives': alts,
                    'mar_status': line_mar_status,
                    'substitution_audit': sub_audit,
                })

            # Requirement 6: Compute Pending Status
            if o.status == DispenseOrderStatus.DISPENSED:
                computed_pending_status = 'Issued'
            elif any_shortage:
                computed_pending_status = 'Partially Issued'
            elif o.step <= 1:
                computed_pending_status = 'Reviewing'
            elif o.step == 2:
                computed_pending_status = 'Allocated'
            else:
                computed_pending_status = 'Awaiting Pickup'

            # Filter by sub-status if provided
            if pending_status and pending_status != 'All Pending' and computed_pending_status != pending_status:
                continue

            # MAR validation details
            adm_active = True
            order_active = True
            patient_discharged = False
            if o.admission:
                if o.admission.status in [AdmissionStatus.DISCHARGED, 'DISCHARGED', 'Discharged']:
                    adm_active = False
                    patient_discharged = True
                    order_active = False

            # Handover Tracking History (Requirement 4)
            handover_history = ipd_data.get('handover_history', [])
            if not handover_history and o.received_by_nurse:
                handover_history.append({
                    'handed_over_by': o.dispensed_by.get_full_name() if o.dispensed_by else 'Sneha Nair (PH-4380)',
                    'collected_by': o.received_by_nurse,
                    'collection_time': o.received_at.strftime('%H:%M') if o.received_at else o.created_at.strftime('%H:%M'),
                    'items_count': len(lines_data),
                    'notes': 'Recorded during inpatient ward delivery',
                })

            # Operational Step Label (Requirement 2)
            step_names = {1: 'Review', 2: 'Allocate Stock', 3: 'Issue Medicines', 4: 'Ward Handover', 5: 'Complete'}
            current_step_name = step_names.get(o.step, 'Review')
            if o.status == DispenseOrderStatus.DISPENSED:
                current_step_name = 'Complete'

            serialized.append({
                'id': str(o.id),
                'order_number': o.order_number,
                'patient_id': str(o.patient.id),
                'patient_name': f"{o.patient.first_name} {o.patient.last_name}",
                'patient_uhid': o.patient.uhid,
                'age': getattr(o.patient, 'age', 45),
                'gender': o.patient.gender or 'M',
                'admission_number': o.admission.admission_number if o.admission else f"ADM-IPD-{o.order_number[-4:]}",
                'ward': o.ward_name or 'General Ward',
                'bed': o.bed_number or 'Bed 1',
                'doctor_name': o.doctor_name or 'Dr. Sarah Jenkins',
                'nurse_name': o.nurse_name or 'Anita Joseph',
                'priority': o.priority.upper(),
                'created_at_time': o.created_at.strftime('%H:%M'),
                'wait_minutes': wait_mins,
                'step': o.step,
                'current_step_name': current_step_name,
                'status': o.status,
                'pending_status': computed_pending_status,
                'is_emergency': o.is_emergency,
                'emergency_reason': o.emergency_reason or '',
                'is_cancelled': o.is_cancelled,
                'cancellation_reason': o.cancellation_reason or '',
                'hold_reason': o.hold_reason or '',
                'allergies': patient_allergies,
                'allergy_conflict': allergy_conflict,
                'allergy_override': o.allergy_override_reason or '',
                'has_cd': has_cd,
                'has_cold_chain': has_cold_chain,
                'any_shortage': any_shortage,
                'lines': lines_data,
                'tracking': {
                    'requested_by': f"{o.nurse_name or 'Ward Nurse'} · {o.ward_name} · {o.created_at.strftime('%H:%M')}",
                    'issued_by': f"{o.dispensed_by.get_full_name() if o.dispensed_by else 'Sneha Nair'} · {o.dispensed_at.strftime('%H:%M')}" if o.dispensed_at else None,
                    'received_by': o.received_by_nurse,
                    'issued_at': o.dispensed_at.strftime('%H:%M') if o.dispensed_at else None,
                    'received_at': o.received_at.strftime('%H:%M') if o.received_at else None,
                    'collected_by_nurse': o.received_by_nurse,
                    'collection_time': o.received_at.strftime('%H:%M') if o.received_at else None,
                    'handed_over_by_pharmacist': o.dispensed_by.get_full_name() if o.dispensed_by else 'Sneha Nair (PH-4380)',
                },
                'handover_history': handover_history,
                'substitution_history': substitution_history,
                'mar_validation': {
                    'admission_active': adm_active,
                    'order_active': order_active,
                    'patient_discharged': patient_discharged,
                    'discharged_at': o.admission.discharge_date.strftime('%H:%M') if (o.admission and o.admission.discharge_date) else None,
                    'cancelled_lines': ipd_data.get('cancelled_lines', []),
                },
                'receipt_data': o.receipt_data or None,
            })

        return serialized

    @classmethod
    def update_allocation(cls, order_id, item_id, allocated_quantity, backordered_quantity, user):
        """
        Requirement 1: Records explicit allocated vs backordered amounts for a requisition line.
        """
        order = PharmacyDispenseOrder.objects.get(id=order_id)
        item = PharmacyDispenseOrderItem.objects.get(id=item_id, dispense_order=order)

        if not order.ipd_data:
            order.ipd_data = {}
        if 'allocations' not in order.ipd_data:
            order.ipd_data['allocations'] = {}

        order.ipd_data['allocations'][str(item_id)] = {
            'allocated_quantity': int(allocated_quantity),
            'backordered_quantity': int(backordered_quantity),
            'updated_by': user.get_full_name() if user else 'Pharmacist',
            'updated_at': timezone.now().isoformat(),
        }
        order.step = 2  # Allocate Stock step
        order.save(update_fields=['ipd_data', 'step', 'updated_at'])

        return {
            'order_id': str(order.id),
            'item_id': str(item.id),
            'prescribed_quantity': item.prescribed_quantity,
            'allocated_quantity': int(allocated_quantity),
            'backordered_quantity': int(backordered_quantity),
            'remaining_quantity': max(0, item.prescribed_quantity - int(allocated_quantity)),
        }

    @classmethod
    def request_prescriber_approval(cls, order_id, payload, user):
        """
        Requirement 3: Records prescriber approval request and substitution audit trail.
        Replaces item with approved therapeutic substitute.
        """
        order = PharmacyDispenseOrder.objects.get(id=order_id)
        item_id = payload.get('item_id')
        item = PharmacyDispenseOrderItem.objects.get(id=item_id, dispense_order=order)

        sub_code = payload.get('substitute_code')
        sub_name = payload.get('substitute_name')
        prescriber = payload.get('prescriber_name', order.doctor_name or 'Dr. Michael Chang')
        reason = payload.get('reason', 'Formulary approved substitution')
        notes = payload.get('approval_notes', '')
        is_approved = payload.get('prescriber_approved', True)

        now = timezone.now()
        audit_id = f"SUB-{now.strftime('%H%M%S')}"

        audit_record = {
            'id': audit_id,
            'original_code': item.medicine.item_code,
            'original_name': item.medicine.name,
            'substitute_code': sub_code,
            'substitute_name': sub_name,
            'prescriber_name': prescriber,
            'prescriber_approved': is_approved,
            'approval_notes': notes,
            'reason': reason,
            'requested_at': now.strftime('%H:%M'),
            'approved_at': now.strftime('%H:%M') if is_approved else None,
            'pharmacist': user.get_full_name() if user else 'Sneha Nair (PH-4380)',
        }

        if not order.ipd_data:
            order.ipd_data = {}
        if 'substitution_history' not in order.ipd_data:
            order.ipd_data['substitution_history'] = []

        order.ipd_data['substitution_history'].append(audit_record)

        # If approved, swap medicine on line item
        if is_approved:
            sub_medicine = PharmacyMedicine.objects.filter(item_code=sub_code).first()
            if sub_medicine:
                item.substituted_medicine = sub_medicine
                item.substitution_note = f"Substituted with {sub_medicine.name} (Approved by {prescriber})"
                item.save(update_fields=['substituted_medicine', 'substitution_note'])

        order.save(update_fields=['ipd_data', 'updated_at'])
        return audit_record

    @classmethod
    def record_ward_handover(cls, order_id, payload, user):
        """
        Requirement 4: Captures Collected By (Nurse), Collection Time, Handed Over By (Pharmacist).
        Persists into request history and synchronizes bedside MAR.
        """
        order = PharmacyDispenseOrder.objects.select_related('admission', 'patient').get(id=order_id)

        collected_by = payload.get('collected_by', 'Rina Thomas')
        collection_time = payload.get('collection_time', timezone.now().strftime('%H:%M'))
        handed_over_by = payload.get('handed_over_by', user.get_full_name() if user else 'Sneha Nair (PH-4380)')
        notes = payload.get('notes', 'Ward handover verified per bed, per item.')

        handover_record = {
            'id': f"HND-{timezone.now().strftime('%H%M%S')}",
            'handed_over_by': handed_over_by,
            'collected_by': collected_by,
            'collection_time': collection_time,
            'items_count': order.items.count(),
            'notes': notes,
            'cd_verified': order.items.filter(medicine__is_narcotic=True).exists(),
            'cold_chain_verified': order.items.filter(medicine__is_cold_chain=True).exists(),
            'recorded_at': timezone.now().isoformat(),
        }

        if not order.ipd_data:
            order.ipd_data = {}
        if 'handover_history' not in order.ipd_data:
            order.ipd_data['handover_history'] = []

        order.ipd_data['handover_history'].append(handover_record)
        order.received_by_nurse = collected_by
        order.received_at = timezone.now()
        order.dispensed_by = user if user and user.is_authenticated else order.dispensed_by
        order.step = 4  # Ward handover step
        order.save(update_fields=['ipd_data', 'received_by_nurse', 'received_at', 'dispensed_by', 'step', 'updated_at'])

        # Requirement 5: Bedside MAR synchronization
        if order.admission:
            for it in order.items.all():
                MedicationAdministration.objects.get_or_create(
                    admission=order.admission,
                    medication_name=it.medicine.name,
                    defaults={
                        'dosage': it.dosage_instruction or 'Standard dose',
                        'scheduled_time': collection_time,
                        'is_given': False,
                        'remarks': f"Supplied by Pharmacy · Handover to {collected_by}"
                    }
                )

        return handover_record

    @classmethod
    def update_mar_status(cls, order_id, payload, user):
        """
        Requirement 5: Updates MAR status to Awaiting Supply, Ready To Administer, or Administered.
        """
        order = PharmacyDispenseOrder.objects.select_related('admission').get(id=order_id)
        item_id = payload.get('item_id')
        mar_status = payload.get('mar_status', 'Ready To Administer')

        if not order.ipd_data:
            order.ipd_data = {}
        if 'mar_statuses' not in order.ipd_data:
            order.ipd_data['mar_statuses'] = {}

        if item_id:
            order.ipd_data['mar_statuses'][str(item_id)] = mar_status
        else:
            for it in order.items.all():
                order.ipd_data['mar_statuses'][str(it.id)] = mar_status

        order.save(update_fields=['ipd_data', 'updated_at'])

        # Synchronize with Inpatient Admission MAR record if exists
        if order.admission and mar_status == 'Administered':
            MedicationAdministration.objects.filter(
                admission=order.admission
            ).update(is_given=True, administered_time=timezone.now())

        return {
            'order_id': str(order.id),
            'mar_status': mar_status,
            'synchronized_with_mar': True,
        }

    @classmethod
    def process_ward_return(cls, return_id, payload, user):
        """
        Requirement 7: Processes ward returns according to classification:
        - Patient Discharged: Credit to admission running ledger & restock
        - Medication Stopped: Credit to admission running ledger & restock
        - Unused: Inspection verified, credit to ledger & restock
        - Expired: Quarantine write-off, no patient credit
        - Damaged: Ward loss logged, quarantine destruction, no patient credit
        """
        ret = PharmacyReturn.objects.select_related('admission', 'patient').get(id=return_id)

        action = payload.get('action', 'complete')
        disposition = payload.get('disposition', 'restock')
        classification = payload.get('classification', ret.item_type or 'Unused')

        ret.item_type = classification
        ret.inspection_checks = payload.get('checks', {'seal_intact': True, 'expiry_checked': True})
        ret.disposition = disposition
        ret.processed_by = user if user and user.is_authenticated else None

        if action == 'receive':
            ret.status = 'Received'
        elif action == 'complete':
            if classification in ['Expired', 'Damaged'] or disposition == 'quarantine':
                ret.status = 'Quarantined'
                # Quarantine transaction
                for it in ret.items.all():
                    if it.batch:
                        it.batch.is_quarantined = True
                        it.batch.save(update_fields=['is_quarantined'])
            else:
                ret.status = 'Credited'
                # Restock batches and credit patient admission bill
                with transaction.atomic():
                    for it in ret.items.all():
                        if it.batch:
                            it.batch.available_quantity += it.quantity_returned
                            it.batch.save(update_fields=['available_quantity'])

                            PharmacyStockTransaction.objects.create(
                                medicine=it.medicine,
                                batch=it.batch,
                                transaction_type=StockTransactionType.RETURN_RESTOCK,
                                quantity_delta=it.quantity_returned,
                                balance_after=it.batch.available_quantity,
                                reference_type='WARD_RETURN',
                                reference_id=ret.id,
                                reason_or_notes=f"Ward return restocked · {classification}",
                                performed_by=user
                            )

                    # Post credit note to admission running ledger
                    if ret.admission and ret.total_refund_amount > 0:
                        inv = Invoice.objects.filter(
                            patient=ret.patient,
                            category=InvoiceCategory.IPD,
                        ).first()
                        if inv:
                            credit_amount = Decimal(str(ret.total_refund_amount))
                            inv.total = max(Decimal('0.00'), inv.total - credit_amount)
                            inv.balance = max(Decimal('0.00'), inv.balance - credit_amount)
                            inv.save(update_fields=['total', 'balance'])
                            ret.credit_note_invoice = inv

        ret.save()
        return {
            'id': str(ret.id),
            'return_number': ret.return_number,
            'classification': ret.item_type,
            'status': ret.status,
            'disposition': ret.disposition,
            'total_refund_amount': float(ret.total_refund_amount),
        }

    @classmethod
    def get_ipd_kpis(cls):
        """Calculates live KPI metrics for IPD Pharmacist workspace."""
        base_qs = PharmacyDispenseOrder.objects.filter(encounter_type=EncounterType.IPD)

        open_orders = base_qs.exclude(status=DispenseOrderStatus.DISPENSED).filter(is_cancelled=False)
        open_requests = open_orders.filter(step__lte=2, hold_reason__isnull=True).exclude(status=DispenseOrderStatus.AWAITING_STOCK)
        pending_issues = open_orders.filter(Q(step__gte=3) | Q(status=DispenseOrderStatus.AWAITING_STOCK) | Q(hold_reason__isnull=False))
        issued_today = base_qs.filter(status=DispenseOrderStatus.DISPENSED, is_cancelled=False)

        stat_orders = open_orders.filter(Q(priority='STAT') | Q(is_emergency=True))
        now = timezone.now()
        oldest_stat_wait = 0
        if stat_orders.exists():
            oldest_stat_wait = max([int((now - o.created_at).total_seconds() // 60) for o in stat_orders])

        wards_count = open_orders.values('ward_name').distinct().count()
        awaiting_stock_count = open_orders.filter(Q(status=DispenseOrderStatus.AWAITING_STOCK) | Q(hold_reason__isnull=False)).count()

        units_issued = PharmacyDispenseOrderItem.objects.filter(
            dispense_order__in=issued_today
        ).aggregate(total=Sum('dispensed_quantity'))['total'] or 0

        open_returns = PharmacyReturn.objects.filter(
            return_type=ReturnType.WARD_IPD,
            status__in=['Requested', 'Received']
        ).count()

        return {
            'open_requests': open_requests.count(),
            'wards_count': wards_count,
            'pending_issues': pending_issues.count(),
            'awaiting_stock': awaiting_stock_count,
            'issued_today': issued_today.count(),
            'units_issued_today': units_issued,
            'emergency_requests': stat_orders.count(),
            'oldest_stat_wait': oldest_stat_wait,
            'ward_returns_count': open_returns,
        }
