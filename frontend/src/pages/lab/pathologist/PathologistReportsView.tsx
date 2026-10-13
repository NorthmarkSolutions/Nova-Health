// Pathologist · Signed reports — released reports, delivery status, print and addenda.
import React, { useState } from 'react';
import { FileText, Printer, FilePlus2, Download, ShieldCheck } from 'lucide-react';
import {
  HmsMasterDetail,
  HmsListRow,
  HmsBadge,
  HmsButton,
  HmsDetailHeader,
  HmsStatStrip,
  HmsDetailBody,
  HmsSection,
  HmsRow,
  HmsNotice,
  HmsEmpty,
  HmsModal,
  HmsField,
  TEXTAREA,
  HMS,
} from '../../../components/hms';
import { LabDataStore, SignedReportItem, ageSex } from '../data/labDataStore';
import { fmtMinutes } from '../data/labAdminStore';
import { signedToday, signerOf, reviewMinutes, awaitingAck, paramFlag } from '../data/pathologistStore';
import { PathologistViewProps, FlagBadge } from './pathologistUi';
import { FLAG_COLOR, printReport, fmtRange } from './pathologistFormat';
import { downloadCsv } from '../admin/labAdminUi';
import { LabApi } from '../../../services/labService';

const DELIVERY: Record<SignedReportItem['deliveryStatus'], { label: string; tone: 'green' | 'amber' | 'blue' }> = {
  acknowledged: { label: 'Acknowledged', tone: 'green' },
  pending: { label: 'Awaiting read-back', tone: 'amber' },
  sent: { label: 'Sent', tone: 'blue' },
};

export const PathologistReportsView: React.FC<PathologistViewProps> = ({ data, by, notify, onNavigateTab, initialFilter }) => {
  const { reports, orders } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'all');
  const [selected, setSelected] = useState<string | null>(null);
  const [amendFor, setAmendFor] = useState<SignedReportItem | null>(null);
  const [amendNote, setAmendNote] = useState('');
  const [error, setError] = useState('');

  const filters: Record<string, (r: SignedReportItem) => boolean> = {
    all: () => true,
    today: signedToday,
    critical: (r) => r.flag === 'Critical',
    abnormal: (r) => r.flag === 'Abnormal',
    amended: (r) => !!r.isAmended,
    pending: awaitingAck,
  };
  const q = search.trim().toLowerCase();
  const visible = reports.filter((r) => (filters[pill] || filters.all)(r) && (!q || [r.patientName, r.uhid, r.reportNumber, r.orderNumber, r.testName, r.doctorName].some((v) => v.toLowerCase().includes(q))));

  const pills = [
    { key: 'all', label: 'All', count: reports.length },
    { key: 'today', label: 'Today', count: reports.filter(signedToday).length },
    { key: 'critical', label: 'Critical', count: reports.filter(filters.critical).length, tone: 'red' as const },
    { key: 'abnormal', label: 'Abnormal', count: reports.filter(filters.abnormal).length, tone: 'amber' as const },
    { key: 'pending', label: 'Awaiting read-back', count: reports.filter(awaitingAck).length, tone: 'red' as const },
    { key: 'amended', label: 'Amended', count: reports.filter(filters.amended).length },
  ];

  const rows: HmsListRow[] = visible.map((r) => ({
    key: r.id,
    title: r.patientName,
    badge: <FlagBadge flag={r.flag} />,
    sub: (
      <>
        <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{r.reportNumber}</span> · {r.testName}
      </>
    ),
    metaLeft: `${r.signedAt}${r.isAmended ? ' · amended' : ''}`,
    metaRight: <span style={{ color: r.deliveryStatus === 'pending' ? '#b45309' : undefined, fontWeight: r.deliveryStatus === 'pending' ? 600 : undefined }}>{DELIVERY[r.deliveryStatus].label}</span>,
  }));

  const exportCsv = () => {
    downloadCsv(
      `signed-reports-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Report', 'Order', 'Patient', 'UHID', 'Test', 'Signed', 'Signed by', 'Flag', 'Delivery', 'Amended'],
      visible.map((r) => [r.reportNumber, r.orderNumber, r.patientName, r.uhid, r.testName, r.signedAt, signerOf(r) || '', r.flag, r.deliveryText, r.isAmended ? 'Yes' : 'No'])
    );
    notify(`${visible.length} report${visible.length === 1 ? '' : 's'} exported to CSV.`);
  };

  const [verifying, setVerifying] = useState<string | null>(null);
  const verify = async (r: SignedReportItem) => {
    setVerifying(r.id);
    const v = await LabApi.verifyReport(r.id);
    setVerifying(null);
    if (!v) return;
    const addenda = v.amendments.length ? ` Addenda: ${v.amendments.map((a) => `#${a.number} ${a.status.toLowerCase()}`).join(', ')}.` : '';
    notify(`${r.reportNumber}: ${v.message}${addenda}`, v.status === 'VALID' ? 'success' : 'error');
  };

  const saveAddendum = () => {
    if (!amendFor) return;
    if (amendNote.trim().length < 10) return setError('Describe the correction or addition (at least 10 characters).');
    LabDataStore.issueAmendment(amendFor.id, amendNote.trim(), by);
    notify(`Addendum added to ${amendFor.reportNumber}. ${amendFor.doctorName} sees the amended report.`);
    setAmendFor(null);
    setAmendNote('');
    setError('');
  };

  const renderDetail = (key: string | null) => {
    const r = reports.find((x) => x.id === key);
    if (!r) return <HmsEmpty>Select a report to see its findings and delivery.</HmsEmpty>;
    const order = orders.find((o) => o.orderNumber === r.orderNumber);
    const signer = signerOf(r);
    const review = reviewMinutes(r);
    return (
      <>
        <HmsDetailHeader
          icon={FileText}
          title={r.patientName}
          badge={<FlagBadge flag={r.flag} />}
          subtitle={`${r.reportNumber} · ${r.uhid} · ${ageSex(r.age, r.gender)} · ${r.location}`}
          actions={
            <>
              <HmsButton icon={Printer} onClick={() => (printReport(r, order) ? undefined : notify('The print dialog could not open in this browser.', 'error'))}>
                Print
              </HmsButton>
              <HmsButton variant="primary" icon={FilePlus2} onClick={() => setAmendFor(r)}>
                Issue addendum
              </HmsButton>
            </>
          }
        />
        <HmsStatStrip
          items={[
            { label: 'Test', value: r.testName, note: `${r.testCode} · ${r.section}` },
            { label: 'Signed', value: r.signedAt, note: signer ? `By ${signer}` : 'Signer not recorded' },
            { label: 'Review time', value: fmtMinutes(review), note: review !== null ? 'Result entry to sign-off' : 'Today’s reports only' },
            { label: 'Delivery', value: <HmsBadge tone={DELIVERY[r.deliveryStatus].tone}>{DELIVERY[r.deliveryStatus].label}</HmsBadge>, note: r.doctorName },
          ]}
        />
        <HmsDetailBody>
          {r.isAmended && <HmsNotice tone="amber">Amended: {r.amendmentReason}</HmsNotice>}
          {awaitingAck(r) && (
            <HmsNotice tone="red" action={<HmsButton size="sm" onClick={() => onNavigateTab('callbacks', 'pending')}>Open call-back</HmsButton>}>
              Critical result not yet acknowledged by the ward.
            </HmsNotice>
          )}

          <HmsSection title="Key findings" padded>
            <div style={{ fontSize: '14px', color: HMS.text, lineHeight: 1.6 }}>{r.keyFindings}</div>
          </HmsSection>

          <HmsSection title="Interpretation" padded>
            <div style={{ fontSize: '14px', color: HMS.text, lineHeight: 1.6 }}>{r.interpretation}</div>
          </HmsSection>

          {order && order.parameters.length > 0 && (
            <HmsSection title="Results as reported" defaultOpen={false}>
              {order.parameters.map((p, idx) => {
                const f = paramFlag(p);
                return (
                  <HmsRow
                    key={p.name}
                    last={idx === order.parameters.length - 1}
                    label={p.name}
                    hint={`Ref ${fmtRange(p.low, p.high, p.unit)}`}
                    value={<span style={{ fontWeight: 700, color: FLAG_COLOR[f] }}>{p.observedValue ?? '—'} {p.unit}</span>}
                  />
                );
              })}
            </HmsSection>
          )}

          {r.signature && (
            <HmsSection
              title={`Digital signature · version ${r.signature.version}`}
              right={
                <HmsButton size="sm" icon={ShieldCheck} onClick={() => verify(r)} disabled={verifying === r.id}>
                  {verifying === r.id ? 'Checking…' : 'Verify signature'}
                </HmsButton>
              }
            >
              <HmsRow label="Signed by" hint={r.signature.designation || 'Designation not recorded'} value={signer || '—'} />
              <HmsRow
                label="Fingerprint"
                hint="SHA-256 of the released results, interpretation, signer and time"
                value={
                  <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '12px', color: HMS.textSecondary }}>
                    {r.signature.hash ? `${r.signature.hash.slice(0, 16)}…` : 'Signed before fingerprints were recorded'}
                  </span>
                }
                last={r.signature.amendments.length === 0}
              />
              {r.signature.amendments.map((a, idx) => (
                <HmsRow
                  key={a.number}
                  last={idx === r.signature!.amendments.length - 1}
                  label={`Addendum ${a.number}`}
                  hint={`${a.text} — ${a.signedByName || 'signer not recorded'}`}
                  value={<span style={{ fontSize: '13px', color: HMS.textSecondary }}>{new Date(a.signedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
                />
              ))}
            </HmsSection>
          )}

          <HmsSection title="Audit trail">
            {r.auditTrail.map((a, idx) => (
              <HmsRow key={a.id} last={idx === r.auditTrail.length - 1} label={a.title} hint={a.by} value={<span style={{ fontSize: '13px', color: HMS.textSecondary }}>{a.time}</span>} />
            ))}
          </HmsSection>
        </HmsDetailBody>
      </>
    );
  };

  return (
    <>
      <HmsMasterDetail
        listId="path-reports"
        title="Signed reports"
        description="Reports released with a pathologist signature, newest first."
        total={reports.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search patient, UHID, report, test or doctor"
        pills={pills}
        activePill={pill}
        onPill={setPill}
        selectedKey={selected}
        onSelect={setSelected}
        primaryLabel="print"
        onPrimary={(key) => {
          const r = reports.find((x) => x.id === key);
          if (r) printReport(r, orders.find((o) => o.orderNumber === r.orderNumber));
        }}
        headerAction={
          <HmsButton icon={Download} onClick={exportCsv} disabled={!visible.length} title="Export the reports shown to CSV">
            Export
          </HmsButton>
        }
        detailLabel="Signed report"
        renderDetail={renderDetail}
      />

      {amendFor && (
        <HmsModal
          title="Issue addendum"
          description={`${amendFor.reportNumber} · ${amendFor.testName} · ${amendFor.patientName}. The original stays in the audit trail.`}
          onClose={() => {
            setAmendFor(null);
            setError('');
          }}
          footer={
            <>
              <HmsButton onClick={() => setAmendFor(null)}>Cancel</HmsButton>
              <HmsButton variant="primary" icon={FilePlus2} onClick={saveAddendum}>
                Sign & add addendum
              </HmsButton>
            </>
          }
        >
          <HmsField label="Addendum" required hint={`Signed as ${by}. ${amendFor.doctorName} is shown the amended report.`}>
            <textarea style={TEXTAREA} rows={4} className={error ? 'hms-invalid' : undefined} value={amendNote} onChange={(e) => setAmendNote(e.target.value)} placeholder="Corrected value, additional comment or revised interpretation" />
          </HmsField>
          {error && <HmsNotice tone="red">{error}</HmsNotice>}
        </HmsModal>
      )}
    </>
  );
};

export default PathologistReportsView;
