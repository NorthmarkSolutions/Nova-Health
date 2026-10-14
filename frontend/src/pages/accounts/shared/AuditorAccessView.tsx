// Accounts · Auditor access (Finance Controller and CFO).
// Engagements and their time-boxed auditor grants; grant 1 / 7 / 15 / 30 days (capped at fieldwork end),
// revoke with confirmation, add auditor logins and new engagements. Every change is recorded server-side.
import React, { useState } from 'react';
import { ShieldCheck, UserPlus, KeyRound, Ban, Plus, Copy, CalendarPlus } from 'lucide-react';
import {
  HmsMasterDetail,
  HmsListRow,
  HmsBadge,
  HmsButton,
  HmsDetailHeader,
  HmsStatStrip,
  HmsDetailBody,
  HmsDetailFooter,
  HmsSection,
  HmsRow,
  HmsNotice,
  HmsEmpty,
  HmsModal,
  HmsField,
  HmsToggle,
  HmsTone,
  INPUT,
  HMS,
} from '../../../components/hms';
import { accountsService, AuditEngagementItem, AuditGrantItem } from '../../../services/accountsService';
import { apiError } from '../executive/executiveData';
import { AUDIT_TYPES, GRANT_DAYS, GrantDays, engagementPhase, fmtDateTime, fmtDay, grantEnd, useAuditAccessData } from './auditorAccessData';

export interface AuditorAccessViewProps {
  notify: (message: string, tone?: 'success' | 'error') => void;
  initialFilter?: string;
  initialSelect?: string;
}

const GRANT_TONE: Record<AuditGrantItem['status'], HmsTone> = { active: 'green', scheduled: 'blue', expired: 'gray', revoked: 'red' };
const PHASE: Record<string, { label: string; tone: HmsTone }> = { live: { label: 'Fieldwork live', tone: 'green' }, upcoming: { label: 'Upcoming', tone: 'blue' }, ended: { label: 'Ended', tone: 'gray' } };
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const has = (q: string, values: (string | undefined)[]) => !q || values.some((v) => (v || '').toLowerCase().includes(q));
const isLiveGrant = (g: AuditGrantItem) => g.status === 'active' || g.status === 'scheduled';

/** Single choice shown as buttons (radiogroup) — keyboard and screen-reader friendly. */
const ChoiceGroup = <T extends string | number>({ label, options, value, onChange }: { label: string; options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) => (
  <div role="radiogroup" aria-label={label} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
    {options.map((o) => (
      <HmsButton key={String(o.value)} role="radio" aria-checked={value === o.value} variant={value === o.value ? 'primary' : 'secondary'} onClick={() => onChange(o.value)}>
        {o.label}
      </HmsButton>
    ))}
  </div>
);

export const AuditorAccessView: React.FC<AuditorAccessViewProps> = ({ notify, initialFilter, initialSelect }) => {
  const data = useAuditAccessData();
  const { engagements, auditors } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && ['current', 'ended', 'auditors'].includes(initialFilter) ? initialFilter : 'current');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const [now] = useState(() => new Date());

  // Dialog state
  const [grantDraft, setGrantDraft] = useState<{ engagement: string; auditor: string; days: GrantDays; confirmed: boolean; error?: string } | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<{ grant: AuditGrantItem; engagement: string } | null>(null);
  const [auditorDraft, setAuditorDraft] = useState<{ first: string; last: string; email: string; username: string; kind: 'external' | 'internal'; error?: string; created?: { name: string; username: string; password: string }; returnToGrant?: boolean } | null>(null);
  const [engDraft, setEngDraft] = useState<{ no: string; firm: string; type: string; pFrom: string; pTo: string; fFrom: string; fTo: string; error?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const q = search.trim().toLowerCase();
  const engVisible = engagements.filter((e) => (pill === 'ended' ? engagementPhase(e, now) === 'ended' : engagementPhase(e, now) !== 'ended') && has(q, [e.engagement_no, e.auditor_firm, e.type]));
  const audVisible = auditors.filter((a) => has(q, [a.name, a.username, a.email]));
  const grantsOf = (username: string) => engagements.flatMap((e) => e.grants.filter((g) => g.auditor === username).map((g) => ({ g, e })));
  const openEngagements = engagements.filter((e) => engagementPhase(e, now) !== 'ended');

  const rows: HmsListRow[] =
    pill === 'auditors'
      ? audVisible.map((a) => ({
          key: `a:${a.username}`,
          title: a.name,
          badge: a.active_grants ? <HmsBadge tone="green">{`${a.active_grants} active`}</HmsBadge> : <HmsBadge tone="gray">No access</HmsBadge>,
          sub: `${a.username}${a.email ? ` · ${a.email}` : ''}`,
          metaLeft: a.role === 'INTERNAL_AUDITOR' ? 'Internal auditor' : 'External auditor',
          metaRight: a.last_login ? `Last login ${fmtDateTime(a.last_login)}` : 'Never logged in',
        }))
      : engVisible.map((e) => {
          const ph = PHASE[engagementPhase(e, now)];
          const live = e.grants.filter(isLiveGrant).length;
          return {
            key: `e:${e.engagement_no}`,
            title: `${e.engagement_no} · ${e.auditor_firm}`,
            badge: <HmsBadge tone={ph.tone}>{ph.label}</HmsBadge>,
            sub: `${cap(e.type)} audit · ${fmtDay(e.period_from)} → ${fmtDay(e.period_to)}`,
            metaLeft: `Fieldwork ${fmtDay(e.fieldwork_from)} → ${fmtDay(e.fieldwork_to)}`,
            metaRight: `${live} auditor${live === 1 ? '' : 's'} with access`,
          };
        });

  /* ---------------- actions ---------------- */

  const run = async (fn: () => Promise<string>) => {
    setBusy(true);
    try {
      notify(await fn());
      await data.reload();
      return true;
    } catch (e) {
      notify(apiError(e, 'The server refused the change'), 'error');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const startGrant = (engagement: string, auditor = '') => setGrantDraft({ engagement, auditor, days: 7, confirmed: false });

  const saveGrant = async () => {
    if (!grantDraft) return;
    const e = engagements.find((x) => x.engagement_no === grantDraft.engagement);
    const a = auditors.find((x) => x.username === grantDraft.auditor);
    if (!e) return setGrantDraft({ ...grantDraft, error: 'Choose the engagement.' });
    if (!a) return setGrantDraft({ ...grantDraft, error: 'Choose the auditor.' });
    if (!grantDraft.confirmed) return setGrantDraft({ ...grantDraft, error: 'Switch on the confirmation first.' });
    const ok = await run(async () => {
      const r = await accountsService.grantAuditorAccess(e.engagement_no, a.username, grantDraft.days);
      return `${a.name} has read-only access until ${fmtDateTime(r.valid_until)}`;
    });
    if (ok) setGrantDraft(null);
    else setGrantDraft((d) => (d ? { ...d, error: 'The server refused the grant — see the message above.' } : d));
  };

  const confirmRevoke = async () => {
    if (!revokeTarget) return;
    const ok = await run(async () => {
      await accountsService.revokeAuditorGrant(revokeTarget.grant.id);
      return `Access revoked for ${revokeTarget.grant.auditor_name}`;
    });
    if (ok) setRevokeTarget(null);
  };

  const saveAuditor = async () => {
    if (!auditorDraft) return;
    if (!auditorDraft.first.trim() || !auditorDraft.last.trim()) return setAuditorDraft({ ...auditorDraft, error: 'First and last name are required.' });
    setBusy(true);
    try {
      const r = await accountsService.createAuditorUser({
        first_name: auditorDraft.first.trim(),
        last_name: auditorDraft.last.trim(),
        email: auditorDraft.email.trim() || undefined,
        username: auditorDraft.username.trim() || undefined,
        kind: auditorDraft.kind,
      });
      await data.reload();
      notify(`Auditor ${r.name} added`);
      setAuditorDraft({ ...auditorDraft, error: undefined, created: { name: r.name, username: r.username, password: r.temporary_password } });
    } catch (e) {
      setAuditorDraft({ ...auditorDraft, error: apiError(e, 'Could not add the auditor') });
    } finally {
      setBusy(false);
    }
  };

  const finishAuditor = () => {
    const d = auditorDraft;
    setAuditorDraft(null);
    // Came from the grant dialog: return to it with the new auditor chosen
    if (d?.returnToGrant && d.created && grantDraft) setGrantDraft({ ...grantDraft, auditor: d.created.username, error: undefined });
  };

  const saveEngagement = async () => {
    if (!engDraft) return;
    const d = engDraft;
    if (!d.firm.trim()) return setEngDraft({ ...d, error: 'Enter the audit firm.' });
    if (!d.pFrom || !d.pTo || !d.fFrom || !d.fTo) return setEngDraft({ ...d, error: 'All four dates are required.' });
    if (d.pFrom > d.pTo) return setEngDraft({ ...d, error: 'The audited period ends before it starts.' });
    if (d.fFrom > d.fTo) return setEngDraft({ ...d, error: 'Fieldwork ends before it starts.' });
    const ok = await run(async () => {
      const r = await accountsService.createAuditEngagement({ engagement_no: d.no.trim() || undefined, auditor_firm: d.firm.trim(), type: d.type, period_from: d.pFrom, period_to: d.pTo, fieldwork_from: d.fFrom, fieldwork_to: d.fTo });
      setSelected(`e:${r.engagement_no}`);
      setPill('current');
      return `Engagement ${r.engagement_no} created`;
    });
    if (ok) setEngDraft(null);
  };

  const newEngagement = () => setEngDraft({ no: '', firm: '', type: 'statutory', pFrom: '', pTo: '', fFrom: '', fTo: '' });
  const newAuditor = (returnToGrant = false) => setAuditorDraft({ first: '', last: '', email: '', username: '', kind: 'external', returnToGrant });

  /* ---------------- detail ---------------- */

  const grantRows = (list: { g: AuditGrantItem; e: AuditEngagementItem }[], showEngagement: boolean) =>
    list.length ? (
      list.map(({ g, e }, i) => (
        <HmsRow
          key={g.id}
          last={i === list.length - 1}
          label={showEngagement ? `${e.engagement_no} · ${e.auditor_firm}` : `${g.auditor_name} (${g.auditor})`}
          hint={
            g.status === 'revoked'
              ? `Revoked ${fmtDateTime(g.revoked_at)}${g.revoked_by ? ` by ${g.revoked_by}` : ''}`
              : `${fmtDateTime(g.valid_from)} → ${fmtDateTime(g.valid_until)}${g.granted_by ? ` · granted by ${g.granted_by}` : ''}`
          }
          value={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <HmsBadge tone={GRANT_TONE[g.status]}>{cap(g.status)}</HmsBadge>
              {isLiveGrant(g) && (
                <HmsButton size="sm" variant="danger" icon={Ban} onClick={() => setRevokeTarget({ grant: g, engagement: e.engagement_no })} aria-label={`Revoke access for ${g.auditor_name}`}>
                  Revoke
                </HmsButton>
              )}
            </span>
          }
        />
      ))
    ) : (
      <div style={{ padding: '12px 14px', fontSize: '13px', color: HMS.textSecondary }}>No access has been granted yet.</div>
    );

  const renderDetail = (key: string | null) => {
    if (data.loading && !engagements.length && !auditors.length) return <HmsEmpty>Loading auditor access…</HmsEmpty>;
    if (data.failed.length && !engagements.length && !auditors.length) return <HmsEmpty>Auditor access is unavailable — only the Finance Controller and CFO can manage it.</HmsEmpty>;

    if (key?.startsWith('a:')) {
      const a = auditors.find((x) => `a:${x.username}` === key);
      if (!a) return <HmsEmpty>Select an auditor from the list.</HmsEmpty>;
      const theirs = grantsOf(a.username);
      return (
        <>
          <HmsDetailHeader avatar={a.name} title={a.name} badge={a.active_grants ? <HmsBadge tone="green">Has access</HmsBadge> : <HmsBadge tone="gray">No access</HmsBadge>} subtitle={`${a.role === 'INTERNAL_AUDITOR' ? 'Internal' : 'External'} auditor · ${a.username}${a.email ? ` · ${a.email}` : ''}`} />
          <HmsStatStrip
            items={[
              { label: 'Active access', value: a.active_grants, tone: a.active_grants ? 'green' : 'default' },
              { label: 'Grants ever', value: theirs.length },
              { label: 'Login', value: a.is_active ? 'Enabled' : 'Disabled', tone: a.is_active ? 'default' : 'red' },
              { label: 'Last login', value: a.last_login ? fmtDateTime(a.last_login) : 'Never' },
            ]}
          />
          <HmsDetailBody>
            <HmsSection title={`Access by engagement (${theirs.length})`}>{grantRows(theirs, true)}</HmsSection>
          </HmsDetailBody>
          <HmsDetailFooter>
            <HmsButton variant="primary" block icon={KeyRound} disabled={!openEngagements.length} title={openEngagements.length ? undefined : 'No engagement with fieldwork still open'} onClick={() => startGrant(openEngagements[0]?.engagement_no || '', a.username)}>
              Grant access
            </HmsButton>
          </HmsDetailFooter>
        </>
      );
    }

    const e = engagements.find((x) => `e:${x.engagement_no}` === key);
    if (!e) return <HmsEmpty>{engagements.length ? 'Select an engagement from the list.' : 'No audit engagements yet. Create one with “New engagement”.'}</HmsEmpty>;
    const phase = engagementPhase(e, now);
    const live = e.grants.filter(isLiveGrant);
    return (
      <>
        <HmsDetailHeader icon={ShieldCheck} title={`${e.engagement_no} · ${e.auditor_firm}`} badge={<HmsBadge tone={PHASE[phase].tone}>{PHASE[phase].label}</HmsBadge>} subtitle={`${cap(e.type)} audit`} />
        <HmsStatStrip
          items={[
            { label: 'Audited period', value: `${fmtDay(e.period_from)} → ${fmtDay(e.period_to)}` },
            { label: 'Fieldwork', value: `${fmtDay(e.fieldwork_from)} → ${fmtDay(e.fieldwork_to)}`, tone: phase === 'ended' ? 'amber' : 'default' },
            { label: 'Auditors with access', value: live.length, tone: live.length ? 'green' : 'default' },
            { label: 'Grants ever', value: e.grants.length },
          ]}
        />
        <HmsDetailBody>
          {phase === 'ended' ? (
            <HmsNotice tone="amber">Fieldwork ended on {fmtDay(e.fieldwork_to)}, so no new access can be granted. Create a new engagement for the next audit.</HmsNotice>
          ) : (
            <HmsNotice tone="blue">Access is read-only and never runs past the fieldwork end ({fmtDay(e.fieldwork_to)}). Every grant, revoke and auditor view is recorded in the audit trail.</HmsNotice>
          )}
          <HmsSection title={`Auditor access (${e.grants.length})`}>{grantRows(e.grants.map((g) => ({ g, e })), false)}</HmsSection>
        </HmsDetailBody>
        <HmsDetailFooter>
          <HmsButton variant="primary" block icon={KeyRound} disabled={phase === 'ended'} onClick={() => startGrant(e.engagement_no)}>
            Grant access
          </HmsButton>
        </HmsDetailFooter>
      </>
    );
  };

  /* ---------------- dialogs ---------------- */

  const grantEng = grantDraft ? engagements.find((x) => x.engagement_no === grantDraft.engagement) : undefined;
  const grantAud = grantDraft ? auditors.find((x) => x.username === grantDraft.auditor) : undefined;
  const preview = grantDraft && grantEng ? grantEnd(grantEng, grantDraft.days) : null;

  return (
    <>
      <HmsMasterDetail
        listId="audit-access"
        title="Auditor access"
        description="Engagements, auditor logins and their time-boxed read-only access."
        total={pill === 'auditors' ? auditors.length : engagements.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder={pill === 'auditors' ? 'Search auditor, username or email' : 'Search engagement or firm'}
        pills={[
          { key: 'current', label: 'Current engagements', count: openEngagements.length },
          { key: 'ended', label: 'Ended', count: engagements.length - openEngagements.length },
          { key: 'auditors', label: 'Auditors', count: auditors.length },
        ]}
        activePill={pill}
        onPill={(p) => {
          setPill(p);
          setSelected(null);
        }}
        selectedKey={selected}
        onSelect={setSelected}
        primaryLabel="open"
        headerAction={
          pill === 'auditors' ? (
            <HmsButton variant="primary" icon={UserPlus} onClick={() => newAuditor()} title="Add auditor">
              Add auditor
            </HmsButton>
          ) : (
            <HmsButton variant="primary" icon={Plus} onClick={newEngagement} title="New engagement">
              New engagement
            </HmsButton>
          )
        }
        detailLabel="Auditor access"
        renderDetail={renderDetail}
      />

      {grantDraft && (
        <HmsModal
          title="Grant auditor access"
          description="Read-only access to evidence, controls, the audit trail and the ledger for one engagement."
          onClose={() => setGrantDraft(null)}
          busy={busy}
          width={620}
          footer={
            <>
              <HmsButton onClick={() => setGrantDraft(null)} disabled={busy}>
                Cancel
              </HmsButton>
              <HmsButton variant="primary" icon={KeyRound} onClick={saveGrant} disabled={busy || !grantDraft.confirmed}>
                {busy ? 'Granting…' : 'Grant access'}
              </HmsButton>
            </>
          }
        >
          {grantDraft.error && <HmsNotice tone="red">{grantDraft.error}</HmsNotice>}
          <HmsField label="Engagement" required>
            <select style={INPUT} value={grantDraft.engagement} onChange={(e) => setGrantDraft({ ...grantDraft, engagement: e.target.value, error: undefined })}>
              <option value="">Choose engagement…</option>
              {openEngagements.map((e) => (
                <option key={e.engagement_no} value={e.engagement_no}>
                  {e.engagement_no} · {e.auditor_firm} · fieldwork to {fmtDay(e.fieldwork_to)}
                </option>
              ))}
            </select>
          </HmsField>
          <HmsField label="Auditor" required>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select style={INPUT} value={grantDraft.auditor} onChange={(e) => setGrantDraft({ ...grantDraft, auditor: e.target.value, error: undefined })}>
                <option value="">Choose auditor…</option>
                {auditors.map((a) => (
                  <option key={a.username} value={a.username}>
                    {a.name} ({a.username})
                  </option>
                ))}
              </select>
              <HmsButton icon={UserPlus} onClick={() => newAuditor(true)} title="Add a new auditor">
                New
              </HmsButton>
            </div>
          </HmsField>
          <HmsField label="Access lasts" required hint="Never longer than the engagement's fieldwork end.">
            <ChoiceGroup<number> label="Access length" options={GRANT_DAYS.map((d) => ({ value: d, label: d === 1 ? '1 day' : `${d} days` }))} value={grantDraft.days} onChange={(v) => setGrantDraft({ ...grantDraft, days: v as GrantDays, error: undefined })} />
          </HmsField>
          {preview && (
            <HmsNotice tone={preview.capped ? 'amber' : 'blue'}>
              {grantAud ? grantAud.name : 'The auditor'} gets read-only access from now until <strong>{fmtDateTime(preview.end)}</strong>
              {preview.capped ? ' — shortened to the fieldwork end.' : '.'}
            </HmsNotice>
          )}
          <HmsToggle showLabel checked={grantDraft.confirmed} onChange={(v) => setGrantDraft({ ...grantDraft, confirmed: v, error: undefined })} label="I confirm this auditor should have read-only access for this period." />
        </HmsModal>
      )}

      {revokeTarget && (
        <HmsModal
          title="Revoke auditor access?"
          description={`${revokeTarget.grant.auditor_name} · ${revokeTarget.engagement}`}
          onClose={() => setRevokeTarget(null)}
          busy={busy}
          footer={
            <>
              <HmsButton onClick={() => setRevokeTarget(null)} disabled={busy} data-autofocus>
                Cancel
              </HmsButton>
              <HmsButton variant="danger" icon={Ban} onClick={confirmRevoke} disabled={busy}>
                {busy ? 'Revoking…' : 'Revoke access'}
              </HmsButton>
            </>
          }
        >
          <HmsNotice tone="red">
            {revokeTarget.grant.auditor_name} loses access immediately — their workspace stops showing evidence, controls, the audit trail and the ledger. The revoke is recorded in the audit trail and cannot be undone; grant access again if needed.
          </HmsNotice>
          <HmsSection title="Grant">
            <HmsRow label="Valid from" value={fmtDateTime(revokeTarget.grant.valid_from)} />
            <HmsRow label="Valid until" value={fmtDateTime(revokeTarget.grant.valid_until)} />
            <HmsRow label="Granted by" value={revokeTarget.grant.granted_by || '—'} last />
          </HmsSection>
        </HmsModal>
      )}

      {auditorDraft && (
        <HmsModal
          title={auditorDraft.created ? 'Auditor added' : 'Add auditor'}
          description={auditorDraft.created ? 'Share these sign-in details with the auditor securely.' : 'Creates a read-only Auditor login. Access is granted separately, per engagement.'}
          onClose={auditorDraft.created ? finishAuditor : () => setAuditorDraft(null)}
          busy={busy}
          footer={
            auditorDraft.created ? (
              <HmsButton variant="primary" onClick={finishAuditor}>
                {auditorDraft.returnToGrant ? 'Back to grant access' : 'Done'}
              </HmsButton>
            ) : (
              <>
                <HmsButton onClick={() => setAuditorDraft(null)} disabled={busy}>
                  Cancel
                </HmsButton>
                <HmsButton variant="primary" icon={UserPlus} onClick={saveAuditor} disabled={busy}>
                  {busy ? 'Adding…' : 'Add auditor'}
                </HmsButton>
              </>
            )
          }
        >
          {auditorDraft.created ? (
            <>
              <HmsNotice tone="amber">This temporary password is shown only once. The auditor should change it after signing in.</HmsNotice>
              <HmsSection title="Sign-in details">
                <HmsRow label="Name" value={auditorDraft.created.name} />
                <HmsRow label="Username" value={<span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{auditorDraft.created.username}</span>} />
                <HmsRow
                  label="Temporary password"
                  last
                  value={
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{auditorDraft.created.password}</span>
                      <HmsButton
                        size="sm"
                        icon={Copy}
                        aria-label="Copy password"
                        onClick={() => {
                          navigator.clipboard?.writeText(auditorDraft.created!.password).then(
                            () => notify('Password copied'),
                            () => notify('Copy failed — select and copy it instead', 'error')
                          );
                        }}
                      >
                        Copy
                      </HmsButton>
                    </span>
                  }
                />
              </HmsSection>
            </>
          ) : (
            <>
              {auditorDraft.error && <HmsNotice tone="red">{auditorDraft.error}</HmsNotice>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <HmsField label="First name" required>
                  <input style={INPUT} value={auditorDraft.first} onChange={(e) => setAuditorDraft({ ...auditorDraft, first: e.target.value, error: undefined })} />
                </HmsField>
                <HmsField label="Last name" required>
                  <input style={INPUT} value={auditorDraft.last} onChange={(e) => setAuditorDraft({ ...auditorDraft, last: e.target.value, error: undefined })} />
                </HmsField>
                <HmsField label="Email">
                  <input type="email" style={INPUT} value={auditorDraft.email} onChange={(e) => setAuditorDraft({ ...auditorDraft, email: e.target.value, error: undefined })} placeholder="name@auditfirm.in" />
                </HmsField>
                <HmsField label="Username" hint="Leave blank to use first.last">
                  <input style={INPUT} value={auditorDraft.username} onChange={(e) => setAuditorDraft({ ...auditorDraft, username: e.target.value, error: undefined })} />
                </HmsField>
              </div>
              <HmsField label="Auditor type" required>
                <ChoiceGroup<'external' | 'internal'>
                  label="Auditor type"
                  options={[
                    { value: 'external', label: 'External' },
                    { value: 'internal', label: 'Internal' },
                  ]}
                  value={auditorDraft.kind}
                  onChange={(v) => setAuditorDraft({ ...auditorDraft, kind: v })}
                />
              </HmsField>
            </>
          )}
        </HmsModal>
      )}

      {engDraft && (
        <HmsModal
          title="New audit engagement"
          description="An engagement sets which period is audited and when fieldwork runs — auditor access can never outlast fieldwork."
          onClose={() => setEngDraft(null)}
          busy={busy}
          width={620}
          footer={
            <>
              <HmsButton onClick={() => setEngDraft(null)} disabled={busy}>
                Cancel
              </HmsButton>
              <HmsButton variant="primary" icon={CalendarPlus} onClick={saveEngagement} disabled={busy}>
                {busy ? 'Creating…' : 'Create engagement'}
              </HmsButton>
            </>
          }
        >
          {engDraft.error && <HmsNotice tone="red">{engDraft.error}</HmsNotice>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <HmsField label="Audit firm" required>
              <input style={INPUT} value={engDraft.firm} onChange={(e) => setEngDraft({ ...engDraft, firm: e.target.value, error: undefined })} placeholder="e.g. Sharma & Associates" />
            </HmsField>
            <HmsField label="Engagement number" hint="Leave blank to number it automatically">
              <input style={INPUT} value={engDraft.no} onChange={(e) => setEngDraft({ ...engDraft, no: e.target.value, error: undefined })} />
            </HmsField>
          </div>
          <HmsField label="Audit type" required>
            <ChoiceGroup<string> label="Audit type" options={AUDIT_TYPES.map(([v, l]) => ({ value: v, label: l }))} value={engDraft.type} onChange={(v) => setEngDraft({ ...engDraft, type: v })} />
          </HmsField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <HmsField label="Audited period from" required>
              <input type="date" style={INPUT} value={engDraft.pFrom} onChange={(e) => setEngDraft({ ...engDraft, pFrom: e.target.value, error: undefined })} />
            </HmsField>
            <HmsField label="Audited period to" required>
              <input type="date" style={INPUT} value={engDraft.pTo} onChange={(e) => setEngDraft({ ...engDraft, pTo: e.target.value, error: undefined })} />
            </HmsField>
            <HmsField label="Fieldwork from" required>
              <input type="date" style={INPUT} value={engDraft.fFrom} onChange={(e) => setEngDraft({ ...engDraft, fFrom: e.target.value, error: undefined })} />
            </HmsField>
            <HmsField label="Fieldwork to" required hint="Auditor access ends no later than this day.">
              <input type="date" style={INPUT} value={engDraft.fTo} onChange={(e) => setEngDraft({ ...engDraft, fTo: e.target.value, error: undefined })} />
            </HmsField>
          </div>
        </HmsModal>
      )}
    </>
  );
};



