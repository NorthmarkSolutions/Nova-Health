// Billing · Cashier — quick walk-in bill (health certificate, rapid test …) for a new or registered patient with no
// queued clinical charges; settles in one call through the payment dialog.
import React, { useEffect, useState } from 'react';
import { Search, Trash2, Banknote } from 'lucide-react';
import { HmsModal, HmsButton, HmsField, HmsNotice, HmsSection, HmsRow, INPUT, HMS } from '../../../components/hms';
import { billingService, CashierPatientWorkspace, TariffItem } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { apiError } from '../executive/executiveUi';
import { computeBillPreview, tariffLine } from '../executive/cashierMath';
import { CashierPayTarget } from './CashierPaymentModal';
import { deptName } from './cashierDeskData';

const SCHEMES: Record<string, [number, string]> = { '0': [0, ''], '5': [5, 'Senior Citizen scheme'], '5s': [5, 'Staff Family scheme'] };

export const CashierWalkinModal: React.FC<{
  shiftOpen: boolean;
  onClose: () => void;
  /** Hands the bill to the payment dialog. */
  onCollect: (target: CashierPayTarget, patientName: string, uhid: string) => void;
}> = ({ shiftOpen, onClose, onCollect }) => {
  const { format } = useCurrency();
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('OTHER');
  const [uhid, setUhid] = useState('');
  const [found, setFound] = useState<CashierPatientWorkspace | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lines, setLines] = useState<{ tariff: TariffItem; qty: number }[]>([]);
  const [scheme, setScheme] = useState('0');
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<TariffItem[]>([]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    let cancelled = false;
    const t = window.setTimeout(() => {
      billingService.getTariffs({ search: term, is_active: true }).then(
        (l) => !cancelled && setHits((l || []).slice(0, 8)),
        () => !cancelled && setHits([])
      );
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [q]);

  const [pct, reason] = SCHEMES[scheme];
  const bill = computeBillPreview(lines.map((l) => tariffLine(l.tariff.base_price, l.tariff.gst_rate, l.qty)), pct);
  const add = (t: TariffItem) => {
    setLines((ls) => (ls.some((l) => l.tariff.code === t.code) ? ls.map((l) => (l.tariff.code === t.code ? { ...l, qty: Math.min(99, l.qty + 1) } : l)) : [...ls, { tariff: t, qty: 1 }]));
    setQ('');
    setHits([]);
  };

  const lookup = async () => {
    setLookupError(null);
    setFound(null);
    try {
      setFound(await billingService.getCashierPatientWorkspace(uhid.trim()));
    } catch (e) {
      setLookupError(apiError(e, 'No patient with that UHID.'));
    }
  };

  let blocker = '';
  if (!shiftOpen) blocker = 'Open your counter shift to take money';
  else if (mode === 'existing' && !found) blocker = 'Find the patient by UHID';
  else if (mode === 'new' && name.trim().length < 2) blocker = 'Enter the patient’s name';
  else if (mode === 'new' && !/^\d{10}$/.test(phone)) blocker = 'Enter a 10-digit mobile number';
  else if (!lines.length) blocker = 'Add at least one service';

  const collect = () =>
    onCollect(
      {
        kind: 'walkin',
        net: bill.net,
        items: lines.map((l) => ({ service_code: l.tariff.code, qty: l.qty })),
        patient: mode === 'existing' ? found!.patient.id : undefined,
        patientName: mode === 'new' ? name.trim() : undefined,
        phone: mode === 'new' ? phone : undefined,
        gender: mode === 'new' ? gender : undefined,
        discountPercent: pct || undefined,
        discountReason: reason || undefined,
      },
      mode === 'existing' ? found!.patient.name : name.trim(),
      mode === 'existing' ? found!.patient.uhid : 'New walk-in'
    );

  return (
    <HmsModal
      title="Walk-in bill"
      description="Counter services for someone with nothing in the queue. A new walk-in is registered with a UHID on payment."
      onClose={onClose}
      width={640}
      footer={
        <>
          <span style={{ marginRight: 'auto', fontSize: '13px', color: blocker ? '#b45309' : HMS.textSecondary }}>{blocker || `${lines.length} service${lines.length === 1 ? '' : 's'}`}</span>
          <HmsButton onClick={onClose}>Cancel</HmsButton>
          <HmsButton variant="primary" icon={Banknote} disabled={!!blocker} onClick={collect}>
            Collect {format(bill.net)}
          </HmsButton>
        </>
      }
    >
      <HmsField label="Patient">
        <div role="radiogroup" aria-label="Patient" style={{ display: 'flex', gap: '8px' }}>
          {(['new', 'existing'] as const).map((m) => (
            <HmsButton key={m} role="radio" aria-checked={mode === m} variant={mode === m ? 'primary' : 'secondary'} onClick={() => setMode(m)}>
              {m === 'new' ? 'New walk-in' : 'Registered patient'}
            </HmsButton>
          ))}
        </div>
      </HmsField>
      {mode === 'new' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.4fr 1fr', gap: '12px' }}>
          <HmsField label="Name" required>
            <input style={INPUT} value={name} onChange={(e) => setName(e.target.value)} />
          </HmsField>
          <HmsField label="Mobile" required>
            <input style={INPUT} inputMode="numeric" maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} />
          </HmsField>
          <HmsField label="Gender">
            <select style={INPUT} value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="FEMALE">Female</option>
              <option value="MALE">Male</option>
              <option value="OTHER">Other</option>
            </select>
          </HmsField>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'end' }}>
            <HmsField label="UHID" required>
              <input style={INPUT} value={uhid} onChange={(e) => setUhid(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && lookup()} />
            </HmsField>
            <HmsButton icon={Search} onClick={lookup} disabled={!uhid.trim()}>
              Find
            </HmsButton>
          </div>
          {lookupError && <HmsNotice tone="red">{lookupError}</HmsNotice>}
          {found && (
            <HmsNotice tone="green">
              {found.patient.name} · {found.patient.age_sex} · {found.patient.mobile}
              {found.unbilled_charges.length ? ` — also has ${found.unbilled_charges.length} unbilled charge(s) in the queue` : ''}
            </HmsNotice>
          )}
        </>
      )}
      <HmsField label="Add a service">
        <input style={INPUT} placeholder="Search the Tariff Master" value={q} onChange={(e) => {
          setQ(e.target.value);
          if (e.target.value.trim().length < 2) setHits([]);
        }} />
      </HmsField>
      {hits.length > 0 && q.trim().length >= 2 && (
        <HmsSection title="Matching services">
          {hits.map((t, i) => (
            <HmsRow
              key={t.code}
              last={i === hits.length - 1}
              label={t.name}
              hint={`${t.code} · ${deptName(t.department)}`}
              value={
                <HmsButton size="sm" onClick={() => add(t)}>
                  Add · {format(Number(t.base_price))}
                </HmsButton>
              }
            />
          ))}
        </HmsSection>
      )}
      {lines.length > 0 && (
        <HmsSection title="Bill">
          {lines.map((l) => (
            <HmsRow
              key={l.tariff.code}
              label={l.tariff.name}
              hint={`${l.tariff.code} · ${format(Number(l.tariff.base_price))} each`}
              value={
                <span style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                  <input aria-label={`Quantity of ${l.tariff.name}`} inputMode="numeric" style={{ ...INPUT, width: '64px' }} value={l.qty} onChange={(e) => setLines((ls) => ls.map((x) => (x.tariff.code === l.tariff.code ? { ...x, qty: Math.max(1, Math.min(99, parseInt(e.target.value) || 1)) } : x)))} />
                  <HmsButton size="sm" variant="ghost" icon={Trash2} aria-label={`Remove ${l.tariff.name}`} onClick={() => setLines((ls) => ls.filter((x) => x.tariff.code !== l.tariff.code))} />
                </span>
              }
            />
          ))}
          <HmsRow
            label="Discount"
            value={
              <select style={{ ...INPUT, width: '220px' }} value={scheme} onChange={(e) => setScheme(e.target.value)} aria-label="Discount scheme">
                <option value="0">No discount</option>
                <option value="5">Senior Citizen · 5%</option>
                <option value="5s">Staff Family · 5%</option>
              </select>
            }
          />
          <HmsRow label="Gross · discount · GST" value={`${format(bill.gross)} · − ${format(bill.discount)} · ${format(bill.tax)}`} />
          <HmsRow label={<strong>Net payable</strong>} value={<strong>{format(bill.net)}</strong>} last />
        </HmsSection>
      )}
    </HmsModal>
  );
};
