// Accounts · foundation masters opened from every role's sidebar (route /accounts/coa | dofa | audit).
// One HMS dialog (role, focus, Esc) per master; every figure comes from the API — no fallback tables.
import React, { useEffect, useMemo, useState } from 'react';
import { HmsModal, HmsButton, HmsSection, HmsRow, HmsNotice, HmsBadge, HmsEmpty, HmsTone, INPUT, HMS } from '../../components/hms';
import { accountsService, AuditIntegrity, ChartOfAccountItem, DelegationLimitItem } from '../../services/accountsService';

export type MasterKey = 'coa' | 'dofa' | 'audit';

const TITLE: Record<MasterKey, { title: string; description: string }> = {
  coa: { title: 'Chart of accounts', description: 'Double-entry accounts with their control sub-ledgers.' },
  dofa: { title: 'DoFA matrix', description: 'Delegation of financial authority — approval limit per role and document type.' },
  audit: { title: 'Audit hash chain', description: 'SHA-256 forward-chained audit log and its verification.' },
};

const TYPE_TONE: Record<string, HmsTone> = { asset: 'blue', liability: 'amber', equity: 'gray', revenue: 'green', expense: 'red' };
const ROLE_ORDER = ['supervisor', 'manager', 'controller', 'cfo'];
const ROLE_LABEL: Record<string, string> = { supervisor: 'Accounts Supervisor', manager: 'Accounts Manager', controller: 'Finance Controller', cfo: 'CFO' };
const humanize = (s: string) => (s ? s.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()) : '—');
const inr = (v: string | number | null) => (v == null ? 'No limit' : `₹ ${Number(v).toLocaleString('en-IN')}`);

/* ------------------------------------------------------------------ */

export const CoaBody: React.FC<{ list: ChartOfAccountItem[] | null; failed: boolean }> = ({ list, failed }) => {
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  if (!list) return <HmsEmpty>{failed ? 'The chart of accounts is unavailable.' : 'Loading accounts…'}</HmsEmpty>;
  const types = ['all', 'asset', 'liability', 'equity', 'revenue', 'expense'];
  const s = q.trim().toLowerCase();
  const visible = list.filter((a) => (type === 'all' || a.type === type) && (!s || [a.code, a.name, a.sub_type].some((v) => (v || '').toLowerCase().includes(s))));
  return (
    <>
      <input style={INPUT} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search code, name or classification" aria-label="Search accounts" />
      <div role="group" aria-label="Account type" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {types.map((t) => (
          <HmsButton key={t} size="sm" variant={type === t ? 'primary' : 'secondary'} aria-pressed={type === t} onClick={() => setType(t)}>
            {t === 'all' ? `All · ${list.length}` : `${humanize(t)} · ${list.filter((a) => a.type === t).length}`}
          </HmsButton>
        ))}
      </div>
      <HmsSection title={`Accounts (${visible.length})`}>
        {visible.length ? (
          visible.map((a, i) => (
            <HmsRow
              key={a.id}
              last={i === visible.length - 1}
              label={`${a.code} · ${a.name}`}
              hint={[humanize(a.sub_type), a.is_control_account ? `Control account${a.control_for ? ` for ${a.control_for}` : ''}` : '', a.is_postable === false ? 'Header — not postable' : ''].filter(Boolean).join(' · ') || undefined}
              value={
                <span style={{ display: 'inline-flex', gap: '6px' }}>
                  <HmsBadge tone={TYPE_TONE[a.type] || 'gray'}>{humanize(a.type)}</HmsBadge>
                  {!a.active && <HmsBadge tone="gray">Inactive</HmsBadge>}
                </span>
              }
            />
          ))
        ) : (
          <div style={{ padding: '12px 14px', fontSize: '13px', color: HMS.textSecondary }}>Nothing matches this search or filter.</div>
        )}
      </HmsSection>
    </>
  );
};

export const DofaBody: React.FC<{ list: DelegationLimitItem[] | null; failed: boolean }> = ({ list, failed }) => {
  if (!list) return <HmsEmpty>{failed ? 'The DoFA matrix is unavailable.' : 'Loading limits…'}</HmsEmpty>;
  if (!list.length) return <HmsEmpty>No delegation limits are configured on the server.</HmsEmpty>;
  const docTypes = Array.from(new Set(list.map((l) => l.document_type))).sort();
  const versions = Array.from(new Set(list.map((l) => l.policy_version_id).filter(Boolean)));
  return (
    <>
      <HmsNotice tone="amber">
        Maker-checker applies to every document: nobody approves their own entry, and an amount above a role's limit moves to the next level.
        {versions.length ? ` Policy ${versions.join(', ')}.` : ''}
      </HmsNotice>
      {docTypes.map((dt) => {
        const rows = list.filter((l) => l.document_type === dt).sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role));
        return (
          <HmsSection key={dt} title={humanize(dt)}>
            {rows.map((l, i) => (
              <HmsRow
                key={l.id}
                last={i === rows.length - 1}
                label={ROLE_LABEL[l.role] || humanize(l.role)}
                hint={l.requires_cosign_role ? `Co-sign by ${humanize(l.requires_cosign_role)}${l.cosign_above_amount ? ` above ${inr(l.cosign_above_amount)}` : ''}` : undefined}
                value={<strong>{Number(l.max_amount) === 0 && l.max_amount != null ? 'Cannot approve' : inr(l.max_amount)}</strong>}
              />
            ))}
          </HmsSection>
        );
      })}
    </>
  );
};

export const AuditBody: React.FC<{ data: AuditIntegrity | null; failed: boolean }> = ({ data, failed }) => {
  if (!data) return <HmsEmpty>{failed ? 'The integrity check is unavailable.' : 'Verifying the hash chain…'}</HmsEmpty>;
  const days = data.days || [];
  return (
    <>
      <HmsNotice tone={data.valid ? 'green' : 'red'}>
        {data.valid ? `Hash chain verified — ${data.total_records.toLocaleString('en-IN')} records, every entry linked to the one before.` : `Hash chain broken${data.broken_at_sequence ? ` at sequence ${data.broken_at_sequence}` : ''}${data.error ? `: ${data.error}` : ''}. Tell the Finance Controller.`}
      </HmsNotice>
      <HmsSection title="Chain">
        <HmsRow label="Status" value={<HmsBadge tone={data.valid ? 'green' : 'red'}>{humanize(data.status)}</HmsBadge>} />
        <HmsRow label="Records verified" value={data.total_records.toLocaleString('en-IN')} />
        <HmsRow label="Last sequence" value={data.last_sequence != null ? `#${data.last_sequence}` : '—'} />
        <HmsRow label="Head hash" value={<span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '12px', wordBreak: 'break-all' }}>{data.head_hash || '—'}</span>} last />
      </HmsSection>
      <HmsSection title={`Verification by day (${days.length})`}>
        {days.length ? (
          [...days].reverse().map((d, i) => <HmsRow key={d.date} last={i === days.length - 1} label={d.date} hint={`${d.records} records`} value={<HmsBadge tone={d.valid ? 'green' : 'red'}>{d.valid ? 'Verified' : 'Broken'}</HmsBadge>} />)
        ) : (
          <div style={{ padding: '12px 14px', fontSize: '13px', color: HMS.textSecondary }}>No daily breakdown returned.</div>
        )}
      </HmsSection>
    </>
  );
};

/* ------------------------------------------------------------------ */

export const AccountsMastersModal: React.FC<{ master: MasterKey; onClose: () => void }> = ({ master, onClose }) => {
  const [coa, setCoa] = useState<ChartOfAccountItem[] | null>(null);
  const [dofa, setDofa] = useState<DelegationLimitItem[] | null>(null);
  const [audit, setAudit] = useState<AuditIntegrity | null>(null);
  const [failed, setFailed] = useState<Record<MasterKey, boolean>>({ coa: false, dofa: false, audit: false });

  // Load each master when it is first opened (and re-verify the chain every time it is opened)
  useEffect(() => {
    let live = true;
    const fail = () => live && setFailed((f) => ({ ...f, [master]: true }));
    if (master === 'coa' && !coa) accountsService.getCOA().then((d) => live && setCoa(d)).catch(fail);
    if (master === 'dofa' && !dofa) accountsService.getDelegationLimits().then((d) => live && setDofa(d)).catch(fail);
    if (master === 'audit') accountsService.getAuditIntegrity().then((d) => live && setAudit(d)).catch(fail);
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [master]);

  const meta = TITLE[master];
  const body = useMemo(
    () => (master === 'coa' ? <CoaBody list={coa} failed={failed.coa} /> : master === 'dofa' ? <DofaBody list={dofa} failed={failed.dofa} /> : <AuditBody data={audit} failed={failed.audit} />),
    [master, coa, dofa, audit, failed]
  );

  return (
    <HmsModal title={meta.title} description={meta.description} onClose={onClose} width={820} footer={<HmsButton onClick={onClose}>Close</HmsButton>}>
      {body}
    </HmsModal>
  );
};

export default AccountsMastersModal;
