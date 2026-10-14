// Nurse — lab results. Signed reports for OPD patients, critical values first. The nurse reads a critical value
// back to the lab and records which doctor was told; the lab's call-back log closes on the server.
import React, { useState } from 'react';
import { FileText, PhoneCall, Printer } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsNotice, HmsEmpty, HmsField, INPUT, HMS } from '../../components/hms';
import { MONO, printSlip, tokenLabel } from '../reception/receptionData';
import { ReadBackModal } from './NurseModals';
import { NurseActions, NurseData, NurseLabOrder, criticalOpen, isOpdOrder, isResult } from './nurseData';

export interface NurseResultsViewProps {
  data: NurseData;
  act: NurseActions;
  initialFilter?: string;
}

const PILLS = ['critical', 'abnormal', 'normal', 'all'];
const TH: React.CSSProperties = { textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: HMS.label, borderBottom: `1px solid ${HMS.border}` };
const TD: React.CSSProperties = { padding: '8px 12px', fontSize: '13px', borderBottom: `1px solid ${HMS.divider}` };

export const NurseResultsView: React.FC<NurseResultsViewProps> = ({ data, act, initialFilter }) => {
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState<'opd' | 'all'>('opd');
  const results = data.labOrders.filter((o) => isResult(o) && (scope === 'all' || isOpdOrder(o)));
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : results.some(criticalOpen) ? 'critical' : 'all');
  const [selected, setSelected] = useState<string | null>(null);
  const [readBack, setReadBack] = useState<NurseLabOrder | null>(null);

  const match: Record<string, (o: NurseLabOrder) => boolean> = {
    critical: (o) => !!o.isFlaggedCritical,
    abnormal: (o) => !o.isFlaggedCritical && o.isFlaggedAbnormal,
    normal: (o) => !o.isFlaggedCritical && !o.isFlaggedAbnormal,
    all: () => true,
  };
  const q = search.trim().toLowerCase();
  const list = results.filter((o) => match[pill](o) && (!q || [o.patientName, o.uhid, o.testName, o.orderNo, o.doctor].some((v) => (v || '').toLowerCase().includes(q)))).sort((a, b) => Number(criticalOpen(b)) - Number(criticalOpen(a)));
  const flag = (o: NurseLabOrder) => (o.isFlaggedCritical ? (o.criticalAcknowledged ? <HmsBadge tone="dark">Critical · read back</HmsBadge> : <HmsBadge tone="red">Critical</HmsBadge>) : o.isFlaggedAbnormal ? <HmsBadge tone="amber">Abnormal</HmsBadge> : <HmsBadge tone="green">Normal</HmsBadge>);
  const rows: HmsListRow[] = list.map((o) => ({
    key: `r:${o.id}`,
    title: `${o.patientName} · ${o.testName}`,
    badge: flag(o),
    sub: <><span style={MONO}>{o.uhid}</span> · {o.doctor || '—'}</>,
    metaLeft: o.approvedAt ? `Signed ${o.approvedAt}` : 'Signed',
    metaRight: o.orderNo,
  }));

  const renderDetail = (key: string | null) => {
    const o = data.labOrders.find((x) => `r:${x.id}` === key);
    if (!o) return <HmsEmpty>{results.length ? 'Select a report from the list.' : 'No signed lab reports yet.'}</HmsEmpty>;
    const inClinic = data.queue.find((t) => t.uhid === o.uhid && !['COMPLETED', 'NO_SHOW', 'CANCELLED'].includes(t.status));
    const abnormal = o.parameters.filter((p) => p.isAbnormal || p.isCritical).length;
    return (
      <>
        <HmsDetailHeader icon={FileText} title={`${o.testName} · ${o.patientName}`} badge={flag(o)} subtitle={<><span style={MONO}>{o.uhid}</span> · {o.age ? `${o.age} y` : '—'} · {o.gender || '—'} · {o.orderNo}</>} />
        <HmsStatStrip
          items={[
            { label: 'Parameters', value: o.parameters.length, note: abnormal ? `${abnormal} out of range` : 'All in range', tone: abnormal ? 'amber' : 'default' },
            { label: 'Signed by', value: o.approvedBy || '—', note: o.approvedAt },
            { label: 'Ordered by', value: o.doctor || '—' },
            { label: 'Patient now', value: inClinic ? tokenLabel(inClinic.token) : 'Not in clinic', note: inClinic ? inClinic.doctor : undefined },
          ]}
        />
        <HmsDetailBody>
          {criticalOpen(o) && <HmsNotice tone="red">Critical value not yet acknowledged. Read it back to the lab and tell the doctor now.</HmsNotice>}
          {o.criticalAcknowledged && <HmsNotice tone="green">Critical value acknowledged{o.criticalAcknowledgedBy ? ` by ${o.criticalAcknowledgedBy}` : ''}{o.criticalAcknowledgedAt ? ` at ${o.criticalAcknowledgedAt}` : ''}.</HmsNotice>}
          <HmsSection title="Results">
            {o.parameters.length === 0 ? (
              <div style={{ padding: '16px', fontSize: '14px', color: HMS.textSecondary }}>No parameter values on this report.</div>
            ) : (
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
            )}
          </HmsSection>
          {o.pathologistRemarks && (
            <HmsSection title="Pathologist's comment">
              <div style={{ padding: '12px 16px', fontSize: '14px', lineHeight: 1.5 }}>{o.pathologistRemarks}</div>
            </HmsSection>
          )}
        </HmsDetailBody>
        <HmsDetailFooter>
          <div style={{ display: 'grid', gridTemplateColumns: criticalOpen(o) ? 'repeat(2, minmax(0, 1fr))' : '1fr', gap: '10px', width: '100%' }}>
            {criticalOpen(o) && (
              <HmsButton variant="primary" icon={PhoneCall} block onClick={() => setReadBack(o)}>
                Record read-back
              </HmsButton>
            )}
            <HmsButton
              icon={Printer}
              block
              onClick={() => {
                const ok = printSlip(`Lab report · ${o.testName}`, [['Patient', `${o.patientName} (${o.uhid})`], ['Order', o.orderNo], ...o.parameters.map((p) => [p.paramName, `${p.observedValue} ${p.unit}${p.isCritical ? ' (CRITICAL)' : p.isAbnormal ? ' (abnormal)' : ''}`.trim()] as [string, string]), ['Signed by', `${o.approvedBy || '—'} ${o.approvedAt || ''}`.trim()]]);
                if (!ok) act.notify('Allow pop-ups to print', 'error');
              }}
            >
              Print for the patient
            </HmsButton>
          </div>
        </HmsDetailFooter>
      </>
    );
  };

  return (
    <>
      <HmsMasterDetail
        listId="nurse-results"
        title="Lab results"
        description="Signed reports. Critical values that nobody has acknowledged come first."
        total={results.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search patient, UHID, test, order or doctor"
        pills={[
          { key: 'critical', label: 'Critical', count: results.filter(match.critical).length, tone: results.some(criticalOpen) ? 'red' : undefined },
          { key: 'abnormal', label: 'Abnormal', count: results.filter(match.abnormal).length },
          { key: 'normal', label: 'Normal', count: results.filter(match.normal).length },
          { key: 'all', label: 'All', count: results.length },
        ]}
        activePill={pill}
        onPill={(k) => {
          setPill(k);
          setSelected(null);
        }}
        leftExtra={
          <HmsField label="Show" htmlFor="res-scope">
            <select id="res-scope" style={INPUT} value={scope} onChange={(e) => { setScope(e.target.value as 'opd' | 'all'); setSelected(null); }}>
              <option value="opd">OPD reports</option>
              <option value="all">All locations (incl. IPD wards)</option>
            </select>
          </HmsField>
        }
        selectedKey={selected}
        onSelect={setSelected}
        primaryLabel="open report"
        detailLabel="Report"
        emptyText="No reports match this search or filter."
        renderDetail={renderDetail}
      />
      {readBack && (
        <ReadBackModal
          order={readBack}
          data={data}
          userName={act.userName}
          onClose={() => setReadBack(null)}
          onDone={(doctor) => {
            setReadBack(null);
            data.reload();
            act.notify(`Read-back recorded · ${doctor} informed`);
          }}
        />
      )}
    </>
  );
};
