// Chamber desk — outside reports on the patient's file: what the patient brought from other labs, hospitals or
// doctors, with the scan when one was attached. Mark each one once it has been put in front of the doctor.
import React, { useState } from 'react';
import { FileText, FileUp, Eye, ExternalLink } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsRow, HmsEmpty, HMS } from '../../components/hms';
import { patientJourneyService, PatientDocument } from '../../services/patientJourneyService';
import { MONO, sameDoctor } from '../reception/receptionData';
import { AssistantActions, AssistantData } from './assistantData';

export interface AstDocumentsViewProps {
  data: AssistantData;
  act: AssistantActions;
  initialFilter?: string;
}

const PILLS = ['toshow', 'shown', 'all'];
const CAT: Record<PatientDocument['category'], string> = { LAB: 'Lab report', RADIOLOGY: 'X-ray / scan', PRESCRIPTION: 'Old prescription', DISCHARGE: 'Discharge summary', REFERRAL: 'Referral letter', OTHER: 'Other' };

const openFile = async (d: PatientDocument) => {
  if (!d.dataUrl) return false;
  const blob = await (await fetch(d.dataUrl)).blob();
  const w = window.open(URL.createObjectURL(blob), '_blank');
  return !!w;
};

export const AstDocumentsView: React.FC<AstDocumentsViewProps> = ({ data, act, initialFilter }) => {
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : 'toshow');
  const [selected, setSelected] = useState<string | null>(null);

  const myUhids = new Set(data.mine.map((t) => t.uhid));
  const docs = data.documents.filter((d) => (data.doctor && d.doctor && sameDoctor(d.doctor, data.doctor.name)) || myUhids.has(d.uhid));
  const match: Record<string, (d: PatientDocument) => boolean> = { toshow: (d) => !d.shownToDoctorAt, shown: (d) => !!d.shownToDoctorAt, all: () => true };
  const q = search.trim().toLowerCase();
  const list = docs.filter((d) => match[pill](d) && (!q || [d.patientName, d.uhid, d.title, d.source].some((v) => (v || '').toLowerCase().includes(q))));
  const rows: HmsListRow[] = list.map((d) => ({
    key: `d:${d.id}`,
    title: `${d.patientName} · ${d.title}`,
    badge: d.shownToDoctorAt ? <HmsBadge tone="green">Shown</HmsBadge> : <HmsBadge tone="amber">To show</HmsBadge>,
    sub: <><span style={MONO}>{d.uhid}</span> · {CAT[d.category]}</>,
    metaLeft: `${d.source} · ${d.reportDate}`,
    metaRight: d.fileName ? 'Scan attached' : 'No scan',
  }));

  const renderDetail = (key: string | null) => {
    const d = data.documents.find((x) => `d:${x.id}` === key);
    if (!d) return <HmsEmpty>{docs.length ? 'Select a document from the list.' : 'No outside reports yet. Attach what patients bring with "Attach report".'}</HmsEmpty>;
    const isImage = d.dataUrl && (d.fileType || '').startsWith('image/');
    return (
      <>
        <HmsDetailHeader icon={FileText} title={d.title} badge={d.shownToDoctorAt ? <HmsBadge tone="green">Shown to doctor</HmsBadge> : <HmsBadge tone="amber">To show</HmsBadge>} subtitle={<>{d.patientName} · <span style={MONO}>{d.uhid}</span></>} />
        <HmsStatStrip
          items={[
            { label: 'Type', value: CAT[d.category] },
            { label: 'From', value: d.source },
            { label: 'Report date', value: d.reportDate },
            { label: 'Attached', value: new Date(d.uploadedAt).toLocaleDateString(), note: d.uploadedBy },
          ]}
        />
        <HmsDetailBody>
          {d.note && (
            <HmsSection title="Note">
              <div style={{ padding: '12px 16px', fontSize: '14px' }}>{d.note}</div>
            </HmsSection>
          )}
          <HmsSection title="Scan">
            {isImage ? (
              <img src={d.dataUrl} alt={d.title} style={{ display: 'block', maxWidth: '100%', maxHeight: '480px', margin: '0 auto' }} />
            ) : d.dataUrl ? (
              <HmsRow label={d.fileName || 'Attached file'} value="PDF — open to view" last />
            ) : (
              <div style={{ padding: '16px', fontSize: '14px', color: HMS.textSecondary }}>No scan attached — the paper copy is with the patient.</div>
            )}
          </HmsSection>
          {d.shownToDoctorAt && (
            <HmsSection title="Shown to the doctor">
              <HmsRow label="When" value={new Date(d.shownToDoctorAt).toLocaleString()} last />
            </HmsSection>
          )}
        </HmsDetailBody>
        <HmsDetailFooter>
          <div style={{ display: 'grid', gridTemplateColumns: d.dataUrl ? 'repeat(2, minmax(0, 1fr))' : '1fr', gap: '10px', width: '100%' }}>
            {d.dataUrl && (
              <HmsButton icon={ExternalLink} block onClick={async () => { if (!(await openFile(d))) act.notify('Allow pop-ups to open the file', 'error'); }}>
                Open file
              </HmsButton>
            )}
            {!d.shownToDoctorAt ? (
              <HmsButton variant="primary" icon={Eye} block onClick={() => { patientJourneyService.updatePatientDocument(d.id, { shownToDoctorAt: new Date().toISOString() }); data.reload(); act.notify(`${d.title} marked as shown to the doctor`); }}>
                Shown to doctor
              </HmsButton>
            ) : (
              <HmsButton icon={FileUp} block onClick={() => act.attach(d.uhid)}>
                Attach another for {d.patientName.split(' ')[0]}
              </HmsButton>
            )}
          </div>
        </HmsDetailFooter>
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="ast-docs"
      title="Outside reports"
      description="Reports patients brought from outside, kept on their file for the doctor."
      total={docs.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search patient, UHID, title or source"
      headerAction={
        <HmsButton variant="primary" icon={FileUp} onClick={() => act.attach()} title="Attach report (Alt+A)" aria-keyshortcuts="Alt+A">
          Attach
        </HmsButton>
      }
      pills={[
        { key: 'toshow', label: 'To show doctor', count: docs.filter(match.toshow).length, tone: 'amber' },
        { key: 'shown', label: 'Shown', count: docs.filter(match.shown).length },
        { key: 'all', label: 'All', count: docs.length },
      ]}
      activePill={pill}
      onPill={(k) => {
        setPill(k);
        setSelected(null);
      }}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open document"
      detailLabel="Document"
      emptyText="No documents match this search or filter."
      renderDetail={renderDetail}
    />
  );
};
