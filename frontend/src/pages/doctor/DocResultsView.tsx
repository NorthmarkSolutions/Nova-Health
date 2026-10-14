// Doctor — results of the tests you ordered: critical values not yet acknowledged first, then abnormal, normal and
// still pending. Full values for the doctor; acknowledge critical results into the lab's audit trail.
import React, { useState } from 'react';
import { FileText, ShieldCheck, Printer } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsNotice, HmsEmpty, HmsModal, HmsField, HmsToggle, INPUT, HMS } from '../../components/hms';
import { patientJourneyService } from '../../services/patientJourneyService';
import { MONO, printSlip, tokenLabel } from '../reception/receptionData';
import { AstLabOrder } from '../assistant/assistantData';
import { DoctorActions, DoctorData } from './doctorData';

export interface DocResultsViewProps {
  data: DoctorData;
  act: DoctorActions;
  initialFilter?: string;
}

const PILLS = ['critical', 'abnormal', 'normal', 'pending', 'all'];
const TH: React.CSSProperties = { textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: HMS.label, borderBottom: `1px solid ${HMS.border}` };
const TD: React.CSSProperties = { padding: '8px 12px', fontSize: '13px', borderBottom: `1px solid ${HMS.divider}` };

export const DocResultsView: React.FC<DocResultsViewProps> = ({ data, act, initialFilter }) => {
  const orders = data.labOrders.filter((o) => !o.cancelled);
  const ready = (o: AstLabOrder) => o.stage === 'REPORT_GENERATED';
  const critOpen = (o: AstLabOrder) => ready(o) && !!o.isFlaggedCritical && !o.criticalAcknowledged;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : orders.some(critOpen) ? 'critical' : 'abnormal');
  const [selected, setSelected] = useState<string | null>(null);
  const [ack, setAck] = useState<AstLabOrder | null>(null);
  const [note, setNote] = useState('');
  const [ok, setOk] = useState(false);

  const match: Record<string, (o: AstLabOrder) => boolean> = {
    critical: (o) => ready(o) && !!o.isFlaggedCritical,
    abnormal: (o) => ready(o) && !o.isFlaggedCritical && o.isFlaggedAbnormal,
    normal: (o) => ready(o) && !o.isFlaggedCritical && !o.isFlaggedAbnormal,
    pending: (o) => !ready(o),
    all: () => true,
  };
  const q = search.trim().toLowerCase();
  const list = orders.filter((o) => match[pill](o) && (!q || [o.patientName, o.uhid, o.testName, o.orderNo].some((v) => (v || '').toLowerCase().includes(q)))).sort((a, b) => Number(critOpen(b)) - Number(critOpen(a)));
  const flag = (o: AstLabOrder) => (!ready(o) ? <HmsBadge tone="blue">Pending</HmsBadge> : o.isFlaggedCritical ? (o.criticalAcknowledged ? <HmsBadge tone="dark">Critical · acknowledged</HmsBadge> : <HmsBadge tone="red">Critical</HmsBadge>) : o.isFlaggedAbnormal ? <HmsBadge tone="amber">Abnormal</HmsBadge> : <HmsBadge tone="green">Normal</HmsBadge>);
  const rows: HmsListRow[] = list.map((o) => ({
    key: `r:${o.id}`,
    title: `${o.patientName} · ${o.testName}`,
    badge: flag(o),
    sub: <><span style={MONO}>{o.uhid}</span> · {o.orderNo}</>,
    metaLeft: ready(o) ? `Signed ${o.approvedAt || ''}`.trim() : o.stage.replace(/_/g, ' ').toLowerCase(),
    metaRight: ready(o) ? `${o.parameters.filter((p) => p.isAbnormal || p.isCritical).length} out of range` : o.priority,
  }));

  const renderDetail = (key: string | null) => {
    const o = orders.find((x) => `r:${x.id}` === key);
    if (!o) return <HmsEmpty>{orders.length ? 'Select a result from the list.' : 'No tests ordered by you yet.'}</HmsEmpty>;
    const inClinic = data.mine.find((t) => t.uhid === o.uhid && !['COMPLETED', 'NO_SHOW', 'CANCELLED'].includes(t.status));
    return (
      <>
        <HmsDetailHeader icon={FileText} title={`${o.testName} · ${o.patientName}`} badge={flag(o)} subtitle={<><span style={MONO}>{o.uhid}</span> · {o.age ? `${o.age} y` : '—'} · {o.gender || '—'} · {o.orderNo}</>} />
        <HmsStatStrip
          items={[
            { label: 'Status', value: ready(o) ? 'Signed' : o.stage.replace(/_/g, ' ').toLowerCase() },
            { label: 'Signed by', value: o.approvedBy || '—', note: o.approvedAt },
            { label: 'Priority', value: (o.priority || 'ROUTINE').toLowerCase(), tone: o.priority === 'STAT' ? 'red' : 'default' },
            { label: 'Patient now', value: inClinic ? tokenLabel(inClinic.token) : 'Not in clinic' },
          ]}
        />
        <HmsDetailBody>
          {critOpen(o) && <HmsNotice tone="red">Critical value — acknowledge it and record what you did.</HmsNotice>}
          {o.criticalAcknowledged && <HmsNotice tone="green">Acknowledged{o.criticalAcknowledgedBy ? ` by ${o.criticalAcknowledgedBy}` : ''}{o.criticalAcknowledgedAt ? ` at ${o.criticalAcknowledgedAt}` : ''}.</HmsNotice>}
          {!ready(o) ? (
            <HmsNotice tone="blue">Not reported yet.{o.collectedAt ? ` Sample collected ${o.collectedAt}.` : ' Sample not collected yet.'}</HmsNotice>
          ) : (
            <HmsSection title="Results">
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Test', 'Result', 'Unit', 'Reference', 'Flag'].map((h) => (
                        <th key={h} scope="col" style={TH}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {o.parameters.map((p) => (
                      <tr key={p.paramName} style={{ background: p.isCritical ? '#fef2f2' : p.isAbnormal ? '#fffbeb' : undefined }}>
                        <td style={TD}>{p.paramName}</td>
                        <td style={{ ...TD, fontWeight: p.isAbnormal || p.isCritical ? 700 : 500, color: p.isCritical ? '#dc2626' : p.isAbnormal ? '#b45309' : HMS.text }}>{p.observedValue || '—'}</td>
                        <td style={{ ...TD, color: HMS.textSecondary }}>{p.unit || '—'}</td>
                        <td style={{ ...TD, color: HMS.textSecondary }}>{p.referenceRange || '—'}</td>
                        <td style={TD}>{p.isCritical ? <HmsBadge tone="red">Critical</HmsBadge> : p.isAbnormal ? <HmsBadge tone="amber">Abnormal</HmsBadge> : <HmsBadge tone="green">Normal</HmsBadge>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </HmsSection>
          )}
          {o.pathologistRemarks && (
            <HmsSection title="Pathologist's comment">
              <div style={{ padding: '12px 16px', fontSize: '14px', lineHeight: 1.5 }}>{o.pathologistRemarks}</div>
            </HmsSection>
          )}
        </HmsDetailBody>
        {ready(o) && (
          <HmsDetailFooter>
            <div style={{ display: 'grid', gridTemplateColumns: critOpen(o) ? 'repeat(2, minmax(0, 1fr))' : '1fr', gap: '10px', width: '100%' }}>
              {critOpen(o) && (
                <HmsButton variant="primary" icon={ShieldCheck} block onClick={() => { setAck(o); setNote(''); setOk(false); }}>
                  Acknowledge critical
                </HmsButton>
              )}
              <HmsButton
                icon={Printer}
                block
                onClick={() => {
                  const done = printSlip(`Lab report · ${o.testName}`, [['Patient', `${o.patientName} (${o.uhid})`], ['Order', o.orderNo], ...o.parameters.map((p) => [p.paramName, `${p.observedValue} ${p.unit}${p.isCritical ? ' (CRITICAL)' : p.isAbnormal ? ' (abnormal)' : ''}`.trim()] as [string, string]), ['Signed by', `${o.approvedBy || '—'} ${o.approvedAt || ''}`.trim()]]);
                  if (!done) act.notify('Allow pop-ups to print', 'error');
                }}
              >
                Print
              </HmsButton>
            </div>
          </HmsDetailFooter>
        )}
      </>
    );
  };

  return (
    <>
      <HmsMasterDetail
        listId="doc-results"
        title="Lab results"
        description="Tests you ordered. Unacknowledged critical values come first."
        total={orders.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search patient, UHID, test or order"
        pills={[
          { key: 'critical', label: 'Critical', count: orders.filter(match.critical).length, tone: orders.some(critOpen) ? 'red' : undefined },
          { key: 'abnormal', label: 'Abnormal', count: orders.filter(match.abnormal).length, tone: 'amber' },
          { key: 'normal', label: 'Normal', count: orders.filter(match.normal).length },
          { key: 'pending', label: 'Pending', count: orders.filter(match.pending).length },
          { key: 'all', label: 'All', count: orders.length },
        ]}
        activePill={pill}
        onPill={(k) => {
          setPill(k);
          setSelected(null);
        }}
        selectedKey={selected}
        onSelect={setSelected}
        primaryLabel="open result"
        detailLabel="Result"
        emptyText="No results match this search or filter."
        renderDetail={renderDetail}
      />
      {ack && (
        <HmsModal
          title={`Acknowledge critical · ${ack.testName}`}
          description={`${ack.patientName} · ${ack.orderNo}`}
          onClose={() => setAck(null)}
          footer={
            <>
              <HmsButton onClick={() => setAck(null)}>Cancel</HmsButton>
              <HmsButton
                variant="primary"
                icon={ShieldCheck}
                disabled={!ok || note.trim().length < 5}
                onClick={() => {
                  patientJourneyService.acknowledgeCriticalLabOrder(ack.id, data.doctor?.name || act.userName, note.trim());
                  const name = ack.testName;
                  setAck(null);
                  data.reload();
                  act.notify(`Critical ${name} acknowledged`);
                }}
              >
                Acknowledge
              </HmsButton>
            </>
          }
        >
          <HmsNotice tone="red">{ack.parameters.filter((p) => p.isCritical).map((p) => `${p.paramName} ${p.observedValue} ${p.unit}`.trim()).join(' · ') || 'Critical flag set by the lab'}</HmsNotice>
          <HmsField label="Action taken" htmlFor="dr-ack" required>
            <input id="dr-ack" style={INPUT} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Patient called back, treatment started" />
          </HmsField>
          <HmsToggle checked={ok} onChange={setOk} label="I have reviewed the critical value" showLabel />
        </HmsModal>
      )}
    </>
  );
};
