// Front Desk — today's OPD token queue. Call a patient to the chamber, recall, mark priority, move to another doctor,
// collect the fee, print the token slip, mark a no-show (and restore it), check the patient out. Long waits are flagged.
import React, { useState } from 'react';
import { Ticket, Megaphone, Banknote, Shuffle, Printer, UserX, LogOut, RotateCcw, Siren, Trash2, ClipboardCheck } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsRow, HmsNotice, HmsEmpty  } from '../../components/hms';
import { patientJourneyService, SharedQueueToken } from '../../services/patientJourneyService';
import { opdActions } from '../../services/opdActions';
import { useCurrency } from '../../config/currency';
import { ReasonModal } from './ReceptionModals';
import { DeskActions, ReceptionData, LONG_WAIT_MIN, MONO, feeDue, fmtWait, isCancelled, isDone, isWaiting, isWithDoctor, nowTime, printSlip, statusOf, tokenLabel, waitMinutes } from './receptionData';

export interface RecQueueViewProps {
  data: ReceptionData;
  act: DeskActions;
  initialFilter?: string;
  initialSelect?: string;
}

const PILLS = ['all', 'priority', 'waiting', 'doctor', 'unpaid', 'done'];
const rank = (t: SharedQueueToken) => (t.priority === 'EMERGENCY' || t.status === 'EMERGENCY' ? 0 : t.priority === 'URGENT' || t.priority === 'VIP' ? 1 : 2);

export const RecQueueView: React.FC<RecQueueViewProps> = ({ data, act, initialFilter, initialSelect }) => {
  const { format } = useCurrency();
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : 'waiting');
  const [selected, setSelected] = useState<string | null>(initialSelect ? `t:${initialSelect}` : null);
  const [cancelling, setCancelling] = useState<SharedQueueToken | null>(null);
  const now = data.lastSync.getTime();

  const match = (t: SharedQueueToken, p: string) =>
    p === 'waiting' ? isWaiting(t) || (t.callingStatus === 'CALLING' && !isDone(t) && !isWithDoctor(t)) : p === 'doctor' ? isWithDoctor(t) : p === 'unpaid' ? feeDue(t) : p === 'priority' ? rank(t) < 2 && !isDone(t) && !isCancelled(t) : p === 'done' ? isDone(t) || isCancelled(t) : true;
  const q = search.trim().toLowerCase();
  const list = data.queue
    .filter((t) => match(t, pill) && (!q || [t.patient, t.uhid, t.doctor, t.room, t.phone, String(t.token), tokenLabel(t.token)].some((v) => (v || '').toLowerCase().includes(q))))
    .sort((a, b) => (pill === 'waiting' ? rank(a) - rank(b) || a.token - b.token : b.token - a.token));
  const rows: HmsListRow[] = list.map((t) => {
    const st = statusOf(t);
    const w = waitMinutes(t, now);
    const long = isWaiting(t) && w !== null && w > LONG_WAIT_MIN;
    return {
      key: `t:${t.token}`,
      title: `${tokenLabel(t.token)} · ${t.patient}`,
      badge: rank(t) === 0 && !isDone(t) ? <HmsBadge tone="red">Emergency</HmsBadge> : long ? <HmsBadge tone="red">{`Waiting ${fmtWait(w)}`}</HmsBadge> : <HmsBadge tone={st.tone}>{st.label}</HmsBadge>,
      sub: (
        <>
          <span style={MONO}>{t.uhid}</span> · {t.doctor.replace(/\s*\(.*\)$/, '')}
        </>
      ),
      metaLeft: `${t.room} · ${t.time}${rank(t) === 1 && !isDone(t) ? ' · priority' : ''}`,
      metaRight: feeDue(t) ? `${format(t.totalFee || 0)} due` : t.feePaid ? `Paid · ${t.paymentMode || ''}` : '—',
    };
  });

  const run = (p: Promise<boolean>, msg: string) =>
    void p.then((done) => {
      data.reload();
      if (done) act.notify(msg);
    });

  const printToken = (t: SharedQueueToken) => {
    const ok = printSlip('OPD token', [
      ['Patient', t.patient],
      ['UHID', t.uhid],
      ['Doctor', t.doctor],
      ['Room', t.room],
      ['Time', t.time],
      ['Fee', t.feePaid ? `Paid (${t.paymentMode})` : `${format(t.totalFee || 0)} due at the desk`],
    ], tokenLabel(t.token));
    if (!ok) act.notify('Allow pop-ups to print the slip', 'error');
  };

  const renderDetail = (key: string | null) => {
    const t = data.queue.find((x) => `t:${x.token}` === key);
    if (!t) return <HmsEmpty>{data.queue.length ? 'Select a token from the list.' : 'No tokens yet today. Issue a walk-in token (Alt+W) or check in a booked patient.'}</HmsEmpty>;
    const st = statusOf(t);
    const w = waitMinutes(t, now);
    const waiting = isWaiting(t);
    const calling = t.callingStatus === 'CALLING' && !isDone(t);
    const ahead = waiting ? data.queue.filter((x) => isWaiting(x) && x.doctor === t.doctor && (rank(x) < rank(t) || (rank(x) === rank(t) && x.token < t.token))).length : null;
    const allergies = t.allergies?.length ? t.allergies : t.assessment?.allergies || [];
    return (
      <>
        <HmsDetailHeader icon={Ticket} title={`Token ${tokenLabel(t.token)} · ${t.patient}`} badge={<HmsBadge tone={st.tone}>{st.label}</HmsBadge>} subtitle={<><span style={MONO}>{t.uhid}</span> · {t.age ? `${t.age} y` : 'age —'} · {t.gender ? String(t.gender).toLowerCase() : '—'} · {t.phone || 'no phone'}</>} />
        <HmsStatStrip
          items={[
            { label: 'Waiting', value: waiting || calling ? fmtWait(w) : '—', note: waiting && ahead !== null ? `${ahead} ahead with this doctor` : t.checkoutTime ? `Out ${t.checkoutTime}` : undefined, tone: waiting && w !== null && w > LONG_WAIT_MIN ? 'red' : 'default' },
            { label: 'Doctor', value: t.doctor.replace(/\s*\(.*\)$/, ''), note: t.room },
            { label: 'Fee', value: format(t.totalFee || 0), note: t.feePaid ? `Paid · ${t.paymentMode}` : 'Not paid', tone: feeDue(t) ? 'amber' : t.feePaid ? 'green' : 'default' },
            { label: 'Visit', value: (t.type || 'WALK_IN').replace(/_/g, ' ').toLowerCase(), note: t.time },
          ]}
        />
        <HmsDetailBody>
          {calling && <HmsNotice tone="green">Called to {t.room}. The lobby screen is showing this token.</HmsNotice>}
          {waiting && w !== null && w > LONG_WAIT_MIN && <HmsNotice tone="red">Waiting {fmtWait(w)} — longer than the {LONG_WAIT_MIN}-minute standard. Update the patient, or move them to a doctor with a shorter queue.</HmsNotice>}
          {feeDue(t) && !isDone(t) && <HmsNotice tone="amber">Fee of {format(t.totalFee || 0)} not paid yet. Collect it before the consultation, or the cashier will collect it.</HmsNotice>}
          {allergies.length > 0 && <HmsNotice tone="red">Allergies: {allergies.join(', ')}</HmsNotice>}
          <HmsSection title="Visit">
            <HmsRow label="Appointment / visit no." value={<span style={MONO}>{t.aptNo}</span>} />
            <HmsRow label="Reason" value={t.triageNotes || t.assessment?.chiefComplaint || '—'} />
            {t.assessment?.triageCategory && <HmsRow label="Triage category" value={t.assessment.triageCategory.replace(/_/g, ' ').toLowerCase()} hint={t.assessment.triagedBy ? `by ${t.assessment.triagedBy}` : undefined} />}
            {t.vitals && <HmsRow label="Vitals (from triage)" value={[t.vitals.bp && `BP ${t.vitals.bp}`, t.vitals.pulse && `pulse ${t.vitals.pulse}`, t.vitals.spo2 && `SpO₂ ${t.vitals.spo2}%`].filter(Boolean).join(' · ') || '—'} />}
            <HmsRow label="Invoice" value={<span style={MONO}>{t.invoiceNo || '—'}</span>} last />
          </HmsSection>
        </HmsDetailBody>
        <HmsDetailFooter>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
            {waiting && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', width: '100%' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <HmsButton variant="primary" icon={Megaphone} block onClick={() => act.callToken(t)}>
                    Call to room
                  </HmsButton>
                </div>
                {feeDue(t) && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <HmsButton icon={Banknote} block onClick={() => act.collectFee(t)}>
                      Collect {format(t.totalFee || 0)}
                    </HmsButton>
                  </div>
                )}
                <HmsButton icon={Shuffle} block onClick={() => act.reassign(t)}>
                  Change doctor
                </HmsButton>
                <HmsButton icon={Printer} block onClick={() => printToken(t)}>
                  Print slip
                </HmsButton>
                <HmsButton icon={Siren} block disabled={rank(t) < 2} title={rank(t) < 2 ? 'Already a priority patient' : undefined} onClick={() => run(opdActions.prioritize(t), `${tokenLabel(t.token)} moved up as priority`)}>
                  Priority
                </HmsButton>
                {!opdActions.server() && (
                  <HmsButton icon={ClipboardCheck} block disabled={t.status === 'TRIAGED' || t.status === 'READY_FOR_DOCTOR'} title="When the nurse confirms vitals are done" onClick={() => run(opdActions.saveTriage(t, { status: 'TRIAGED' }, false), `${tokenLabel(t.token)} marked triaged`)}>
                    Triaged
                  </HmsButton>
                )}
                <HmsButton variant="danger" icon={UserX} block onClick={() => run(opdActions.noShow(t, 'Not present at the desk when called'), `${tokenLabel(t.token)} marked no-show`)}>
                  No-show
                </HmsButton>
                {act.supervisor && (
                  <HmsButton variant="danger" icon={Trash2} block title="Cancel a token issued in error (supervisor)" onClick={() => setCancelling(t)}>
                    Cancel token
                  </HmsButton>
                )}
              </div>
            )}
            {t.awaitingReports && (
              <HmsButton icon={Printer} block onClick={() => printToken(t)}>
                Print slip
              </HmsButton>
            )}
            {(calling || isWithDoctor(t)) && !t.awaitingReports && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px' }}>
                <HmsButton icon={Megaphone} block onClick={() => act.callToken(t)}>
                  Call again
                </HmsButton>
                {feeDue(t) ? (
                  <HmsButton icon={Banknote} block onClick={() => act.collectFee(t)}>
                    Collect {format(t.totalFee || 0)}
                  </HmsButton>
                ) : (
                  <HmsButton icon={Printer} block onClick={() => printToken(t)}>
                    Print slip
                  </HmsButton>
                )}
                <HmsButton variant="primary" icon={LogOut} block onClick={() => run(opdActions.receptionCheckout(t, nowTime()), `${t.patient} checked out`)}>
                  Check out
                </HmsButton>
              </div>
            )}
            {isDone(t) && (
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${feeDue(t) ? 2 : 1}, minmax(0, 1fr))`, gap: '10px' }}>
                {feeDue(t) && (
                  <HmsButton variant="primary" icon={Banknote} block onClick={() => act.collectFee(t)}>
                    Collect {format(t.totalFee || 0)}
                  </HmsButton>
                )}
                <HmsButton icon={Printer} block onClick={() => printToken(t)}>
                  Print visit slip
                </HmsButton>
              </div>
            )}
            {isCancelled(t) && (
              <HmsButton icon={RotateCcw} block onClick={() => run(opdActions.reopen(t), `${tokenLabel(t.token)} back in the queue`)}>
                Patient arrived — back to the queue
              </HmsButton>
            )}
          </div>
        </HmsDetailFooter>
      </>
    );
  };

  return (
    <>
      <HmsMasterDetail
        listId="rec-queue"
        title="Live queue"
        description="Today’s OPD tokens. Emergency and priority patients sort to the top of the waiting list."
        total={data.queue.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search token, patient, UHID, phone or doctor"
        headerAction={
          <HmsButton size="sm" icon={Ticket} onClick={() => act.walkIn()} title="Issue a walk-in token (Alt+W)">
            Token
          </HmsButton>
        }
        pills={[
          { key: 'all', label: 'All', count: data.queue.length },
          { key: 'priority', label: 'Priority', count: data.queue.filter((t) => match(t, 'priority')).length, tone: 'red' },
          { key: 'waiting', label: 'Waiting', count: data.queue.filter((t) => match(t, 'waiting')).length },
          { key: 'doctor', label: 'With doctor', count: data.queue.filter(isWithDoctor).length },
          { key: 'unpaid', label: 'Fees due', count: data.queue.filter(feeDue).length, tone: 'amber' },
          { key: 'done', label: 'Done', count: data.queue.filter((t) => isDone(t) || isCancelled(t)).length },
        ]}
        activePill={pill}
        onPill={(k) => {
          setPill(k);
          setSelected(null);
        }}
        selectedKey={selected}
        onSelect={setSelected}
        primaryLabel="call to room"
        onPrimary={(k) => {
          const t = data.queue.find((x) => `t:${x.token}` === k);
          if (t && (isWaiting(t) || t.callingStatus === 'CALLING')) act.callToken(t);
        }}
        detailLabel="Token"
        emptyText="No tokens match this search or filter."
        renderDetail={renderDetail}
      />
      {cancelling && (
        <ReasonModal
          title={`Cancel token ${tokenLabel(cancelling.token)}?`}
          description={`${cancelling.patient}. The token leaves the queue and its consultation charge is released at the cashier.`}
          label="Reason"
          confirm="Cancel token"
          danger
          options={['Issued in error', 'Duplicate token', 'Patient left before registration', 'Wrong patient selected']}
          onClose={() => setCancelling(null)}
          onConfirm={(reason) => {
            const t = cancelling;
            setCancelling(null);
            void opdActions.cancel(t, reason).then((done) => {
              data.reload();
              if (!done) return;
              act.notify(`${tokenLabel(t.token)} cancelled · ${reason}`);
              setSelected(null);
            });
          }}
        />
      )}
    </>
  );
};
