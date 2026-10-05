import React from 'react';
import { CashierReceiptModal } from './CashierReceiptModal';

export interface ReceiptThermalPreviewModalProps {
  invoiceId: string;
  receiptToken?: string;
  onClose: () => void;
}

export const ReceiptThermalPreviewModal: React.FC<ReceiptThermalPreviewModalProps> = ({
  invoiceId,
  onClose
}) => {
  return <CashierReceiptModal invoiceId={invoiceId} onClose={onClose} />;
};
