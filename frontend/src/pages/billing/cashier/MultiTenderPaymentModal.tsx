import React, { useState, useEffect } from 'react';
import {
  billingService,
  CashierQueueItem,
  MultiTenderPaymentResponse,
  ShiftSummary
} from '../../../services/billingService';
import { MultiTenderSettlementModal } from './MultiTenderSettlementModal';

export interface MultiTenderPaymentModalProps {
  queueItem: CashierQueueItem;
  onClose: () => void;
  onSuccess: (response: MultiTenderPaymentResponse) => void;
}

export const MultiTenderPaymentModal: React.FC<MultiTenderPaymentModalProps> = ({
  queueItem,
  onClose,
  onSuccess
}) => {
  const [shift, setShift] = useState<ShiftSummary | null>(null);

  useEffect(() => {
    billingService.getCurrentShift().then((s) => setShift(s)).catch(() => {});
  }, []);

  const invoiceAdapter = {
    id: queueItem.invoice_id || queueItem.id,
    invoice_number: queueItem.invoice_number || 'INV-TEMP',
    token_slip_number: (queueItem as any).token_slip_number || `SLIP-${queueItem.uhid}`,
    patient_name: queueItem.patient_name,
    patient_uhid: queueItem.uhid,
    encounter_type: queueItem.encounter_type,
    category: queueItem.category || queueItem.department,
    total_amount: Number(queueItem.total),
    paid_amount: Number(queueItem.amount_paid || 0),
    balance_amount: Number(queueItem.balance_due || queueItem.total),
    advance_deducted: Number(queueItem.patient_deposits_available || 0)
  };

  return (
    <MultiTenderSettlementModal
      invoice={invoiceAdapter}
      currentShift={shift}
      onClose={onClose}
      onSuccess={(invoiceId, res) => {
        if (res) {
          onSuccess(res);
        } else {
          onSuccess({
            invoice: {
              id: invoiceId,
              invNo: queueItem.invoice_number,
              patientName: queueItem.patient_name,
              uhid: queueItem.uhid,
              category: queueItem.category,
              date: new Date().toISOString(),
              subtotal: queueItem.subtotal,
              discount: 0,
              tax: 0,
              advanceDeducted: 0,
              total: queueItem.total,
              paid: queueItem.total,
              balance: 0,
              status: 'PAID',
              items: []
            },
            payments: [],
            total_paid_now: Number(queueItem.balance_due || queueItem.total),
            remaining_balance: 0,
            receipt_token: `RCPT-${Date.now()}`,
            status: 'COMPLETED'
          });
        }
      }}
    />
  );
};
