// Billing · Admin — OPD revenue by doctor, from the visits the reception front desk (and online booking) creates.
// For any day: consultations, fee value, what was collected at the counter or the desk, and what is leaking.
import React, { useEffect, useState } from 'react';
import { Stethoscope } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsSection, HmsRow, HmsNotice, HmsEmpty, HmsField, INPUT } from '../../../components/hms';
import { billingService, CashierOpdVisit } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { apiError } from '../executive/executiveUi';
import { VISIT_STATUS } from '../cashier/cashierDeskData';
import { OPD_FLAG, OpdFlag, opdFlag, visitAmount } from '../supervisor/supervisorDeskData';
import { AdminDeskData, MONO, fmtDate, todayIso } from './adminDeskData';

export interface AdmOpdViewProps {
  data: AdminDeskData;
  initialFilter?: string;
  initialSelect?: string;
}

const UNMAPPED = 'Doctor not mapped';
const PILLS = ['all', 'leak', 'desk', 'nocharge'];

interface DoctorRow {
  doctor: string;
  department: string;
  visits: CashierOpdVisit[];
  by: Record<OpdFlag, CashierOpdVisit[]>;
}

const group = (visits: CashierOpdVisit[]): DoctorRow[] => {
  const m = new Map<string, DoctorRow>();
  for (const v of visits) {
    const name = v.doctor || UNMAPPED;
    let row = m.get(name);
    if (!row) {
      row = { doctor: name, department: v.department || '', visits: [], by: { leak: [], refund: [], desk: [], received: [], nocharge: [], due: [], paid: [], cancelled: [] } };
      m.set(name, row);
    }
    row.visits.push(v);
    row.by[opdFlag(v)].push(v);
  }
  return [...m.values()].sort((a, b) => b.visits.length - a.visits.length);
};

const sum = (l: CashierOpdVisit[]) => l.reduce((s, v) => s + visitAmount(v), 0);

export const AdmOpdView: React.FC<AdmOpdViewProps> = ({ data, initialFilter, initialSelect }) => {
  const { format } = useCurrency();
  const [date, setDate] = useState(todayIso());
  const [other, setOther] = useState<{ date: string; visits: CashierOpdVisit[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect ? `d:${initialSelect}` : null);

  const isToday = date === todayIso();
  useEffect(() => {
    if (isToday) return;
    let stale = false;
    billingService
      .getCashierOpdVisits(date)
      .then((r) => {
        if (stale) return;
        setOther({ date, visits: r.visits });
        setErr(null);
      })
      .catch((e) => !stale && setErr(apiError(e, 'Visits for that day could not be loaded.')));
    return () => {
      stale = true;
    };
  }, [date, isToday]);

  const visits = isToday ? data.visits : other?.date === date ? other.visits : [];
  const loadingDay = !isToday && other?.date !== date && !err;
  const doctors = group(visits);

  const match = (d: DoctorRow, p: string) => (p === 'all' ? true : p === 'leak' ? d.by.leak.length > 0 : p === 'desk' ? d.by.desk.length > 0 : d.by.nocharge.length > 0);
  const q = search.trim().toLowerCase();
  const visible = doctors.filter((d) => match(d, pill) && (!q || [d.doctor, d.department, ...d.visits.map((v) => v.patient_name)].some((x) => (x || '').toLowerCase().includes(q))));
  const rows: HmsListRow[] = visible.map((d) => {
    const fee = sum(d.visits.filter((v) => v.status !== 'CANCELLED'));
    const collected = sum([...d.by.paid, ...d.by.received, ...d.by.desk]);
    return {
      key: `d:${d.doctor}`,
      title: d.doctor,
      badge: d.by.leak.length ? <HmsBadge tone="red">{`${d.by.leak.length} unpaid`}</HmsBadge> : d.by.desk.length ? <HmsBadge tone="amber">Desk cash</HmsBadge> : <HmsBadge tone="green">Clear</HmsBadge>,
      sub: `${d.department || 'Department not set'} · ${d.visits.length} visit${d.visits.length === 1 ? '' : 's'}`,
      metaLeft: `${d.by.cancelled.length + d.by.refund.length} cancelled / no-show`,
      metaRight: `${format(collected)} of ${format(fee)}`,
      progress: fee > 0 ? { pct: (collected / fee) * 100, doneLabel: 'Fully collected', tone: d.by.leak.length ? 'red' : 'blue' } : undefined,
    };
  });

  const renderDetail = (key: string | null) => {
    if ((data.loading && isToday && !visits.length) || loadingDay) return <HmsEmpty>Loading OPD visits…</HmsEmpty>;
    if (err && !isToday) return <HmsEmpty>{err}</HmsEmpty>;
    const d = doctors.find((x) => `d:${x.doctor}` === key);
    if (!d) return <HmsEmpty>{visits.length ? 'Select a doctor from the list.' : `No OPD visits on ${fmtDate(date)}. Tokens issued at the reception front desk appear here.`}</HmsEmpty>;
    const live = d.visits.filter((v) => v.status !== 'CANCELLED');
    const fee = sum(live);
    const atCounter = sum(d.by.paid);
    const deskIn = sum(d.by.received);
    const deskOut = sum(d.by.desk);
    const atRisk = sum(d.by.leak) + sum(d.by.due);
    const seen = d.visits.filter((v) => v.status === 'COMPLETED' || v.status === 'IN_CONSULTATION').length;
    return (
      <>
        <HmsDetailHeader icon={Stethoscope} title={d.doctor} badge={d.by.leak.length ? <HmsBadge tone="red">Leakage</HmsBadge> : <HmsBadge tone="green">Clear</HmsBadge>} subtitle={`${d.department || 'Department not set'} · ${fmtDate(date)}`} />
        <HmsStatStrip
          items={[
            { label: 'Visits', value: d.visits.length, note: `${seen} seen · ${d.by.cancelled.length + d.by.refund.length} cancelled` },
            { label: 'Fee value', value: format(fee), note: 'Live visits' },
            { label: 'Collected', value: format(atCounter + deskIn + deskOut), note: fee ? `${Math.round(((atCounter + deskIn + deskOut) / fee) * 100)}% of fee value` : '—', tone: 'green' },
            { label: 'At risk', value: format(atRisk), note: `${d.by.leak.length} seen & unpaid`, tone: d.by.leak.length ? 'red' : atRisk ? 'amber' : 'default' },
          ]}
        />
        <HmsDetailBody>
          {d.doctor === UNMAPPED && <HmsNotice tone="amber">The front desk named a doctor billing does not know, so no consultation charge could be raised. Add the doctor to the staff master or correct the token.</HmsNotice>}
          {d.by.leak.length > 0 && <HmsNotice tone="red">{d.by.leak.length} patient{d.by.leak.length === 1 ? ' was' : 's were'} seen without paying ({format(sum(d.by.leak))}). Ask the cashier to collect before they leave.</HmsNotice>}
          <HmsSection title="Where the money is">
            <HmsRow label="Paid at the billing counter" value={format(atCounter)} hint={`${d.by.paid.length} visit${d.by.paid.length === 1 ? '' : 's'}`} />
            <HmsRow label="Paid at the front desk · handed to billing" value={format(deskIn)} hint={`${d.by.received.length} visit${d.by.received.length === 1 ? '' : 's'}`} />
            <HmsRow label="Paid at the front desk · not yet handed over" value={format(deskOut)} hint="The supervisor receives it under OPD reconciliation" />
            <HmsRow label="Fee waiting at the counter" value={format(sum(d.by.due))} hint={`${d.by.due.length} visit${d.by.due.length === 1 ? '' : 's'}`} />
            <HmsRow label="Seen · not paid" value={format(sum(d.by.leak))} hint={`${d.by.leak.length} visit${d.by.leak.length === 1 ? '' : 's'}`} />
            <HmsRow label="No charge raised" value={d.by.nocharge.length} hint="Doctor without a consultation tariff" />
            <HmsRow label="Refund due (cancelled after desk payment)" value={format(sum(d.by.refund))} last />
          </HmsSection>
          <HmsSection title={`Visits · ${d.visits.length}`}>
            {d.visits.map((v, i) => {
              const f = OPD_FLAG[opdFlag(v)];
              return (
                <HmsRow
                  key={v.id}
                  label={`#${v.token} · ${v.patient_name}`}
                  hint={
                    <>
                      <span style={MONO}>{v.uhid}</span> · {VISIT_STATUS[v.status] || v.status} · {v.source === 'FRONT_DESK' ? 'front desk' : 'online'}
                    </>
                  }
                  value={
                    <span style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                      <span style={MONO}>{visitAmount(v) ? format(visitAmount(v)) : '—'}</span>
                      <HmsBadge tone={f.tone}>{f.label}</HmsBadge>
                    </span>
                  }
                  last={i === d.visits.length - 1}
                />
              );
            })}
          </HmsSection>
        </HmsDetailBody>
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="adm-opd"
      title="OPD revenue"
      description="Consultations by doctor from the reception front desk and online booking, with what was collected and what is leaking."
      total={doctors.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search doctor, department or patient"
      pills={[
        { key: 'all', label: 'All doctors', count: doctors.length },
        { key: 'leak', label: 'Seen · not paid', count: doctors.filter((d) => d.by.leak.length).length, tone: 'red' },
        { key: 'desk', label: 'Desk cash', count: doctors.filter((d) => d.by.desk.length).length, tone: 'amber' },
        { key: 'nocharge', label: 'No charge', count: doctors.filter((d) => d.by.nocharge.length).length, tone: 'amber' },
      ]}
      activePill={pill}
      onPill={(k) => {
        setPill(k);
        setSelected(null);
      }}
      leftExtra={
        <HmsField label="Day" htmlFor="adm-opd-date">
          <input
            id="adm-opd-date"
            type="date"
            max={todayIso()}
            style={INPUT}
            value={date}
            onChange={(e) => {
              setDate(e.target.value || todayIso());
              setSelected(null);
              setErr(null);
            }}
          />
        </HmsField>
      }
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open doctor"
      detailLabel="Doctor OPD revenue"
      emptyText="No doctors match this search or filter."
      renderDetail={renderDetail}
    />
  );
};
