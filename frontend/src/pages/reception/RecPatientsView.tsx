// Front Desk — patient master (UHID). Find a patient by name, UHID or mobile; see contact, payer, medical alerts,
// today's visit, upcoming appointments and visit history; issue a token, book, edit details or print the UHID card.
import React, { useState } from 'react';
import { UserRound, Ticket, CalendarPlus, Pencil, IdCard, UserPlus } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsRow, HmsNotice, HmsEmpty } from '../../components/hms';
import { SharedPatient } from '../../services/patientJourneyService';
import { useCurrency } from '../../config/currency';
import { DeskActions, ReceptionData, MONO, fmtDate, isCancelled, isDone, patientName, printSlip, statusOf, todayIso, tokenLabel } from './receptionData';

export interface RecPatientsViewProps {
  data: ReceptionData;
  act: DeskActions;
  initialFilter?: string;
  initialSelect?: string;
}

const PILLS = ['all', 'today', 'booked', 'dues', 'alerts'];

export const RecPatientsView: React.FC<RecPatientsViewProps> = ({ data, act, initialFilter, initialSelect }) => {
  const { format } = useCurrency();
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect ? `p:${initialSelect}` : null);

  const todayTok = (p: SharedPatient) => data.queue.find((t) => t.uhid === p.uhid);
  const upcoming = (p: SharedPatient) => data.appointments.filter((a) => a.uhid === p.uhid && a.status === 'BOOKED' && a.date >= todayIso());
  const match = (p: SharedPatient, f: string) =>
    f === 'all' ? true : f === 'today' ? !!todayTok(p) : f === 'booked' ? upcoming(p).length > 0 : f === 'dues' ? (p.outstandingDue || 0) > 0 : (p.allergies || []).length > 0 || (p.chronicConditions || []).length > 0;
  const q = search.trim().toLowerCase();
  const digits = q.replace(/\D/g, '');
  const list = data.patients.filter((p) => match(p, pill) && (!q || patientName(p).toLowerCase().includes(q) || p.uhid.toLowerCase().includes(q) || (p.idNumber || '').toLowerCase().includes(q) || (digits.length >= 4 && (p.phone || '').replace(/\D/g, '').includes(digits))));
  const rows: HmsListRow[] = list.map((p) => {
    const t = todayTok(p);
    return {
      key: `p:${p.uhid}`,
      title: patientName(p),
      badge: (p.outstandingDue || 0) > 0 ? <HmsBadge tone="red">Due</HmsBadge> : t ? <HmsBadge tone={statusOf(t).tone}>{`Token ${tokenLabel(t.token)}`}</HmsBadge> : upcoming(p).length ? <HmsBadge tone="blue">Booked</HmsBadge> : undefined,
      sub: (
        <>
          <span style={MONO}>{p.uhid}</span> · {p.age ? `${p.age} y` : 'age —'} · {p.gender ? String(p.gender).charAt(0).toUpperCase() + String(p.gender).slice(1).toLowerCase() : '—'}
        </>
      ),
      metaLeft: p.phone || 'No phone',
      metaRight: p.insurance || 'Self pay',
    };
  });

  const card = (p: SharedPatient) => {
    const ok = printSlip('Patient UHID card', [
      ['Name', patientName(p)],
      ['UHID', p.uhid],
      ['Age / gender', `${p.age || '—'} / ${p.gender || '—'}`],
      ['Blood group', p.bloodGroup || '—'],
      ['Mobile', p.phone || '—'],
      ['Emergency contact', p.emergencyContact || '—'],
      ['Allergies', (p.allergies || []).join(', ') || 'None recorded'],
    ], p.uhid);
    if (!ok) act.notify('Allow pop-ups to print the card', 'error');
  };

  const renderDetail = (key: string | null) => {
    const p = data.patients.find((x) => `p:${x.uhid}` === key);
    if (!p) return <HmsEmpty>{search ? 'No patient matches. Register them with Alt+N.' : 'Select a patient from the list.'}</HmsEmpty>;
    const t = todayTok(p);
    const upc = upcoming(p);
    const visits = (p.recentVisits || []) as Array<{ date?: string; doctor?: string; dept?: string; diagnosis?: string }>;
    const active = t && !isDone(t) && !isCancelled(t);
    return (
      <>
        <HmsDetailHeader icon={UserRound} title={patientName(p)} badge={t ? <HmsBadge tone={statusOf(t).tone}>{`Today · ${statusOf(t).label}`}</HmsBadge> : undefined} subtitle={<><span style={MONO}>{p.uhid}</span> · {p.age ? `${p.age} y` : 'age —'} · {String(p.gender || '—').toLowerCase()} · blood {p.bloodGroup || '—'}</>} actions={<HmsButton icon={Pencil} onClick={() => act.editPatient(p)}>Edit</HmsButton>} />
        <HmsStatStrip
          items={[
            { label: 'Mobile', value: p.phone || '—' },
            { label: 'Visits', value: p.visitsCount || visits.length || 0 },
            { label: 'Outstanding', value: format(p.outstandingDue || 0), tone: (p.outstandingDue || 0) > 0 ? 'red' : 'default' },
            { label: 'Payer', value: (p.insurance || 'Self pay').split('·')[0].trim(), note: p.insurance?.includes('·') ? p.insurance.split('·').slice(1).join('·').trim() : undefined },
          ]}
        />
        <HmsDetailBody>
          {(p.allergies || []).length > 0 && <HmsNotice tone="red">Allergies: {(p.allergies || []).join(', ')}</HmsNotice>}
          {(p.outstandingDue || 0) > 0 && <HmsNotice tone="amber">{format(p.outstandingDue)} outstanding from earlier visits — send the patient to the billing counter.</HmsNotice>}
          {active && <HmsNotice tone="green">In today’s queue as token {tokenLabel(t.token)} with {t.doctor.replace(/\s*\(.*\)$/, '')}.</HmsNotice>}
          <HmsSection title="Contact & identity">
            <HmsRow label="Emergency contact" value={p.emergencyContact || '—'} />
            <HmsRow label="ID" value={p.idNumber ? `${p.idType || 'ID'} · ${p.idNumber}` : '—'} />
            <HmsRow label="Date of birth" value={p.dob ? fmtDate(p.dob) : '—'} />
            <HmsRow label="Long-term conditions" value={(p.chronicConditions || []).join(', ') || '—'} last />
          </HmsSection>
          <HmsSection title={`Upcoming appointments · ${upc.length}`}>
            {upc.length === 0 && <HmsRow label="None booked" last />}
            {upc.map((a, i) => (
              <HmsRow key={a.id} label={`${fmtDate(a.date)} · ${a.slot}`} hint={`${a.doctor} · ${a.ref}`} last={i === upc.length - 1} />
            ))}
          </HmsSection>
          <HmsSection title={`Visit history · ${visits.length}`} defaultOpen={visits.length > 0}>
            {visits.length === 0 && <HmsRow label="No earlier visits recorded" last />}
            {visits.slice(0, 8).map((v, i, arr) => (
              <HmsRow key={i} label={v.date ? fmtDate(v.date) : '—'} hint={v.diagnosis} value={[v.doctor, v.dept].filter(Boolean).join(' · ') || '—'} last={i === arr.length - 1} />
            ))}
          </HmsSection>
        </HmsDetailBody>
        <HmsDetailFooter>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px' }}>
            <HmsButton icon={IdCard} block onClick={() => card(p)}>
              Print UHID card
            </HmsButton>
            <HmsButton icon={CalendarPlus} block onClick={() => act.book({ uhid: p.uhid })}>
              Book
            </HmsButton>
            <HmsButton variant="primary" icon={Ticket} block disabled={!!active} title={active ? 'Already in today’s queue' : 'Issue a token now'} onClick={() => act.walkIn(p.uhid)}>
              Issue token
            </HmsButton>
          </div>
        </HmsDetailFooter>
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="rec-patients"
      title="Patient directory"
      description="Every registered patient (UHID). Search before registering to avoid duplicate records."
      total={data.patients.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search name, UHID, mobile or ID number"
      headerAction={
        <HmsButton size="sm" icon={UserPlus} onClick={() => act.register(search)} title="Register a new patient (Alt+N)" aria-keyshortcuts="Alt+N">
          Register
        </HmsButton>
      }
      pills={[
        { key: 'all', label: 'All', count: data.patients.length },
        { key: 'today', label: 'Visiting today', count: data.patients.filter((p) => !!todayTok(p)).length },
        { key: 'booked', label: 'Booked', count: data.patients.filter((p) => upcoming(p).length > 0).length },
        { key: 'dues', label: 'Dues', count: data.patients.filter((p) => (p.outstandingDue || 0) > 0).length, tone: 'red' },
        { key: 'alerts', label: 'Medical alerts', count: data.patients.filter((p) => match(p, 'alerts')).length, tone: 'amber' },
      ]}
      activePill={pill}
      onPill={(k) => {
        setPill(k);
        setSelected(null);
      }}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="edit"
      onPrimary={(k) => {
        const p = data.patients.find((x) => `p:${x.uhid}` === k);
        if (p) act.editPatient(p);
      }}
      detailLabel="Patient"
      emptyText="No patient matches. Press Alt+N to register."
      renderDetail={renderDetail}
    />
  );
};
