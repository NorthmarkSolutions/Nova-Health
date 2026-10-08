import React, { useState } from 'react';
import { Minus, Plus, Trash2, UserPlus, UserSearch } from 'lucide-react';
import { billingService, CashierPatientWorkspace, TariffItem } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { computeBillPreview, tariffLine } from './cashierMath';
import { TariffServicePicker } from './TariffServicePicker';
import { PaymentCollectionDrawer, PaymentTarget, SettlementResult, SettlementResultModal } from './PaymentCollectionDrawer';
import { Btn, C, Callout, Drawer, Empty, Field, PillTabs, Row, apiError, card, deptLabel, inputStyle, mono } from './executiveUi';

interface WalkinLine {
  tariff: TariffItem;
  qty: number;
}

const SCHEMES: Record<string, [number, string]> = {
  '0': [0, ''],
  '5': [5, 'Senior Citizen scheme'],
  '5s': [5, 'Staff Family scheme']
};

/**
 * Quick walk-in billing: ad-hoc counter services (health certificate, rapid test…) for a patient with
 * no queued clinical charges. Settles in one atomic call to POST /cashier/quick-walkin.
 */
export const WalkinBillDrawer: React.FC<{ counterCode?: string; shiftOpen?: boolean; onClose: () => void; onSettled: () => void }> = ({ counterCode, shiftOpen = true, onClose, onSettled }) => {
  const { format: fmt } = useCurrency();
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('OTHER');
  const [uhid, setUhid] = useState('');
  const [found, setFound] = useState<CashierPatientWorkspace | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);
  const [lines, setLines] = useState<WalkinLine[]>([]);
  const [scheme, setScheme] = useState('0');
  const [payTarget, setPayTarget] = useState<PaymentTarget | null>(null);
  const [result, setResult] = useState<SettlementResult | null>(null);

  const [discountPercent, discountReason] = SCHEMES[scheme];
  const bill = computeBillPreview(lines.map((l) => tariffLine(l.tariff.base_price, l.tariff.gst_rate, l.qty)), discountPercent);

  const add = (t: TariffItem) =>
    setLines((ls) => (ls.some((l) => l.tariff.code === t.code) ? ls.map((l) => (l.tariff.code === t.code ? { ...l, qty: Math.min(99, l.qty + 1) } : l)) : [...ls, { tariff: t, qty: 1 }]));
  const setQty = (code: string, qty: number) => setLines((ls) => ls.map((l) => (l.tariff.code === code ? { ...l, qty: Math.max(1, Math.min(99, qty)) } : l)));
  const remove = (code: string) => setLines((ls) => ls.filter((l) => l.tariff.code !== code));

  const lookup = async () => {
    setLooking(true);
    setLookupError(null);
    setFound(null);
    try {
      setFound(await billingService.getCashierPatientWorkspace(uhid.trim()));
    } catch (err) {
      setLookupError(apiError(err, 'Patient not found.'));
    } finally {
      setLooking(false);
    }
  };

  let blocker = '';
  if (!shiftOpen) blocker = 'Open your counter shift to collect';
  else if (mode === 'existing' && !found) blocker = 'Find the patient by UHID';
  else if (mode === 'new' && name.trim().length < 2) blocker = 'Enter the walk-in patient name';
  else if (mode === 'new' && !/^\d{10}$/.test(phone)) blocker = 'Enter a 10-digit mobile number';
  else if (!lines.length) blocker = 'Add at least one service';

  const collect = () =>
    setPayTarget({
      kind: 'walkin',
      net: bill.net,
      items: lines.map((l) => ({ service_code: l.tariff.code, qty: l.qty })),
      patient: mode === 'existing' ? found!.patient.id : undefined,
      patientName: mode === 'new' ? name.trim() : undefined,
      phone: mode === 'new' ? phone : undefined,
      gender: mode === 'new' ? gender : undefined,
      discountPercent: discountPercent || undefined,
      discountReason: discountReason || undefined
    });

  if (result) {
    return (
      <SettlementResultModal
        result={result}
        onDone={() => {
          onSettled();
          onClose();
        }}
      />
    );
  }

  const patientLabel = mode === 'existing' ? found?.patient.name || 'Existing patient' : name.trim() || 'Walk-in';

  return (
    <>
      <Drawer
        title="Walk-in bill"
        subtitle="Ad-hoc counter services · priced from Tariff Master · settled immediately"
        onClose={onClose}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: blocker ? C.amber : C.muted }}>{blocker || `${lines.length} service(s)`}</span>
            <Btn variant="primary" disabled={!!blocker} onClick={collect}>
              Collect {fmt(bill.net)}
            </Btn>
          </div>
        }
      >
        <PillTabs
          tabs={[
            { key: 'new', label: 'New walk-in' },
            { key: 'existing', label: 'Registered patient' }
          ]}
          active={mode}
          onPick={(k) => setMode(k as 'new' | 'existing')}
        />

        {mode === 'new' ? (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Field label="Name">
              <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
            </Field>
            <Field label="Mobile">
              <input style={{ ...inputStyle, ...mono }} inputMode="numeric" maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} placeholder="10 digits" />
            </Field>
            <Field label="Gender">
              <select style={inputStyle} value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="FEMALE">Female</option>
                <option value="MALE">Male</option>
                <option value="OTHER">Other</option>
              </select>
            </Field>
            <span style={{ fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 6 }}>
              <UserPlus size={14} /> A UHID is created on payment. Use “Registered patient” for anyone already registered.
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <Field label="UHID">
                <input
                  style={{ ...inputStyle, ...mono }}
                  value={uhid}
                  onChange={(e) => {
                    setUhid(e.target.value);
                    setFound(null);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && uhid.trim() && lookup()}
                  placeholder="NH-…"
                />
              </Field>
              <Btn onClick={lookup} disabled={!uhid.trim() || looking}>
                <UserSearch size={16} /> {looking ? 'Finding…' : 'Find'}
              </Btn>
            </div>
            {lookupError && <Callout tone="red">{lookupError}</Callout>}
            {found && (
              <Callout tone="green" title={found.patient.name}>
                {found.patient.uhid} · {found.patient.age_sex} · {found.patient.mobile}
                {found.unbilled_total > 0 ? ` · ${fmt(found.unbilled_total)} already queued (bill it from the Invoice Queue)` : ''}
              </Callout>
            )}
          </div>
        )}

        <section style={{ ...card }}>
          <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Services</span>
            <TariffServicePicker onPick={add} placeholder="Search Tariff Master (e.g. certificate, rapid test)" />
          </div>
          {lines.length === 0 && <Empty text="No services added yet." />}
          {lines.map((l) => {
            const line = tariffLine(l.tariff.base_price, l.tariff.gst_rate, l.qty);
            return (
              <div key={l.tariff.code} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 10, alignItems: 'center', padding: '10px 14px', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  <span style={{ fontSize: 14 }}>{l.tariff.name}</span>
                  <span style={{ fontSize: 12, color: C.muted, ...mono }}>
                    {l.tariff.code} · {deptLabel(l.tariff.department)} · {fmt(line.unit_price)}
                    {line.tax_amount ? ` + GST ${fmt(line.tax_amount)}` : ''}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button aria-label="Decrease quantity" onClick={() => setQty(l.tariff.code, l.qty - 1)} style={{ border: `1px solid ${C.border}`, background: C.surface, borderRadius: 6, width: 26, height: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Minus size={12} />
                  </button>
                  <span style={{ minWidth: 22, textAlign: 'center', fontSize: 14, ...mono }}>{l.qty}</span>
                  <button aria-label="Increase quantity" onClick={() => setQty(l.tariff.code, l.qty + 1)} style={{ border: `1px solid ${C.border}`, background: C.surface, borderRadius: 6, width: 26, height: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Plus size={12} />
                  </button>
                </div>
                <span style={{ fontSize: 14, ...mono }}>{fmt(line.total_amount)}</span>
                <button aria-label={`Remove ${l.tariff.name}`} onClick={() => remove(l.tariff.code)} style={{ border: 'none', background: 'transparent', color: C.muted, cursor: 'pointer', display: 'flex' }}>
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })}
          {lines.length > 0 && (
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Field label="Discount" hint="Higher discounts need a supervisor-approved request on a registered patient's bill.">
                <select style={inputStyle} value={scheme} onChange={(e) => setScheme(e.target.value)}>
                  <option value="0">No discount</option>
                  <option value="5">Senior Citizen scheme · 5%</option>
                  <option value="5s">Staff Family scheme · 5%</option>
                </select>
              </Field>
              <Row label="Gross" value={fmt(bill.gross)} />
              <Row label={`Discount${bill.discountPercent ? ` (${bill.discountPercent}%)` : ''}`} value={`− ${fmt(bill.discount)}`} />
              <Row label="GST" value={fmt(bill.tax)} />
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
                <Row label="Net payable" value={fmt(bill.net)} strong />
              </div>
            </div>
          )}
        </section>
      </Drawer>

      {payTarget && (
        <PaymentCollectionDrawer
          target={payTarget}
          patientName={patientLabel}
          uhid={mode === 'existing' ? found?.patient.uhid || '' : 'New UHID on payment'}
          depositBalance={mode === 'existing' ? found?.deposit_balance || 0 : 0}
          counterCode={counterCode}
          onClose={() => setPayTarget(null)}
          onSettled={(r) => {
            setPayTarget(null);
            setResult(r);
          }}
        />
      )}
    </>
  );
};
