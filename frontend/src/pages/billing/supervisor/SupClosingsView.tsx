// Billing · Supervisor — counter closings: compare counted against expected per tender, sign off matched counters,
// investigate or accept a variance with a finding, then hand the sealed cash to the vault.
import React, { useEffect, useState } from 'react';
import { Scale, Vault, Check, Search as SearchIcon } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsRow, HmsNotice, HmsEmpty, HmsField, HmsModal, HmsTone, TEXTAREA } from '../../../components/hms';
import { ClosingSubmission, billingService } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { apiError } from '../executive/executiveUi';
import { SupervisorDeskData, MONO, TENDER_NAME, fmtClock } from './supervisorDeskData';

export interface SupClosingsViewProps {
  data: SupervisorDeskData;
  notify: (message: string, tone?: 'success' | 'error') => void;
  initialFilter?: string;
  initialSelect?: string;
  vaultRequest: boolean;
  onVaultConsumed: () => void;
}

const MIN_NOTE = 5;
type Stage = 'review' | 'investigating' | 'signed' | 'vault';
const stageOf = (r: ClosingSubmission): Stage =>
  r.vault_handover ? 'vault' : r.status === 'CLOSED' ? 'signed' : r.status === 'UNDER_INVESTIGATION' ? 'investigating' : 'review';
const STAGE: Record<Stage, { label: string; tone: HmsTone }> = {
  review: { label: 'To review', tone: 'blue' },
  investigating: { label: 'Investigating', tone: 'red' },
  signed: { label: 'Signed · to vault', tone: 'amber' },
  vault: { label: 'In vault', tone: 'gray' },
};
const PILLS = ['all', 'review', 'investigating', 'signed', 'vault'];
const isZero = (v: number | null | undefined) => v == null || Math.abs(v) < 0.005;

export const SupClosingsView: React.FC<SupClosingsViewProps> = ({ data, notify, initialFilter, initialSelect, vaultRequest, onVaultConsumed }) => {
  const { format } = useCurrency();
  const board = data.board;
  const closings = board?.closings || [];
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect ? `s:${initialSelect}` : null);
  const [finding, setFinding] = useState('');
  const [busy, setBusy] = useState(false);
  const [vaultOpen, setVaultOpen] = useState(false);
  // Alt+V from the workspace opens the handover dialog
  useEffect(() => {
    if (!vaultRequest) return;
    Promise.resolve().then(() => {
      setVaultOpen(true);
      onVaultConsumed();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vaultRequest]);

  const varText = (v: number | null | undefined) => (v == null ? '—' : isZero(v) ? format(0) : `${v > 0 ? '+' : '−'}${format(Math.abs(v))}`);
  const toVault = closings.filter((r) => stageOf(r) === 'signed');
  const vaultCash = board?.kpis.cash_to_vault ?? 0;

  const q = search.trim().toLowerCase();
  const visible = closings.filter((r) => (pill === 'all' || stageOf(r) === pill) && (!q || [r.counter_name, r.counter_code, r.cashier_name, r.investigation_number].some((v) => (v || '').toLowerCase().includes(q))));
  const rows: HmsListRow[] = visible.map((r) => {
    const s = STAGE[stageOf(r)];
    const matched = r.variance_status === 'GREEN_MATCH';
    return {
      key: `s:${r.shift_id}`,
      title: `${r.counter_name} · ${r.cashier_name}`,
      badge: <HmsBadge tone={s.tone}>{s.label}</HmsBadge>,
      sub: `Submitted ${fmtClock(r.submitted_at)}${r.investigation_number ? ` · ${r.investigation_number}` : ''}`,
      metaLeft: matched ? 'All tenders match' : `Variance ${varText(r.net_variance)}`,
      metaRight: r.tenders.find((t) => t.tender === 'CASH')?.counted != null ? `Cash ${format(r.tenders.find((t) => t.tender === 'CASH')!.counted || 0)}` : '—',
    };
  });

  const run = async (action: () => Promise<string>) => {
    setBusy(true);
    try {
      notify(await action());
      setFinding('');
      await data.reload();
    } catch (e) {
      notify(apiError(e, 'The action failed'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const handover = () =>
    run(async () => {
      const v = await billingService.vaultHandover();
      setVaultOpen(false);
      return `Vault handover ${v.handover_number} · ${format(v.total_cash)} from ${v.shift_count} counter(s)`;
    });

  const renderDetail = (key: string | null) => {
    if (data.loading && !board) return <HmsEmpty>Loading closings…</HmsEmpty>;
    const sel = closings.find((r) => `s:${r.shift_id}` === key);
    if (!sel) return <HmsEmpty>{closings.length ? 'Select a closing from the list.' : `No closings submitted yet${board?.kpis.open_counters ? ` · ${board.kpis.open_counters} counter(s) still open` : ''}.`}</HmsEmpty>;
    const stage = stageOf(sel);
    const matched = sel.variance_status === 'GREEN_MATCH';
    const cash = sel.tenders.find((t) => t.tender === 'CASH');
    const short = finding.trim().length < MIN_NOTE;
    const actionable = stage === 'review' || stage === 'investigating';

    return (
      <>
        <HmsDetailHeader
          icon={Scale}
          title={`${sel.counter_name} · ${sel.cashier_name}`}
          badge={<HmsBadge tone={STAGE[stage].tone}>{STAGE[stage].label}</HmsBadge>}
          subtitle={`${sel.counter_location || sel.counter_code} · submitted ${fmtClock(sel.submitted_at)}${sel.investigation_number ? ` · ${sel.investigation_number}` : ''}`}
        />
        <HmsStatStrip
          items={sel.tenders
            .map((t) => ({ label: TENDER_NAME[t.tender] || t.tender, value: varText(t.variance), note: `Counted ${t.counted == null ? '—' : format(t.counted)}`, tone: (isZero(t.variance) ? 'green' : 'red') as 'green' | 'red' }))
            .concat([{ label: 'Net variance', value: varText(sel.net_variance), note: 'Counted − expected', tone: isZero(sel.net_variance) ? 'green' : 'red' }])
            .slice(0, 4)}
        />
        <HmsDetailBody>
          {stage === 'review' && matched && <HmsNotice tone="green">Every tender matches. Sign off to seal the cash bag of {format(cash?.counted || 0)}.</HmsNotice>}
          {actionable && !matched && <HmsNotice tone="red">Variance of {varText(sel.net_variance)}. Recount with the cashier, then investigate or sign off with your finding.</HmsNotice>}

          <HmsSection title="Expected vs counted">
            {sel.tenders.map((t) => (
              <HmsRow
                key={t.tender}
                label={TENDER_NAME[t.tender] || t.tender}
                hint={`Expected ${t.expected == null ? '—' : format(t.expected)} · counted ${t.counted == null ? '—' : format(t.counted)}`}
                value={<strong style={{ color: isZero(t.variance) ? '#15803d' : '#dc2626' }}>{varText(t.variance)}</strong>}
              />
            ))}
            <HmsRow label="Denominations" value={<span style={MONO}>{sel.denominations?.text || '—'}</span>} last />
          </HmsSection>

          {(sel.cashier_note || sel.supervisor_finding) && (
            <HmsSection title="Notes">
              {sel.cashier_note && <HmsRow label="Cashier" value={`“${sel.cashier_note}”`} last={!sel.supervisor_finding} />}
              {sel.supervisor_finding && <HmsRow label="Supervisor finding" value={sel.supervisor_finding} last />}
            </HmsSection>
          )}

          {actionable && !matched && (
            <HmsSection title="Your finding" padded>
              <HmsField label="Supervisor finding" htmlFor="sup-closing-finding" hint="Required before acting on a variance (at least 5 characters).">
                <textarea id="sup-closing-finding" style={TEXTAREA} placeholder="What you checked and found" value={finding} onChange={(e) => setFinding(e.target.value)} />
              </HmsField>
            </HmsSection>
          )}

          {stage === 'signed' && <HmsNotice tone="amber">Signed off by {sel.signed_off_by}{sel.closed_with_variance ? ` with variance ${varText(sel.net_variance)}` : ' · matched'}. Awaiting vault handover.</HmsNotice>}
          {stage === 'vault' && <HmsNotice tone="green">Cash handed to the vault under {sel.vault_handover}.</HmsNotice>}
        </HmsDetailBody>
        {stage === 'review' && matched && (
          <HmsDetailFooter>
            <HmsButton
              variant="primary"
              icon={Check}
              block
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await billingService.signOffShift(sel.shift_id, 'SIGN_OFF');
                  return `${sel.counter_name} signed off · cash bag ${format(cash?.counted || 0)} sealed`;
                })
              }
            >
              Sign off · cash bag {format(cash?.counted || 0)}
            </HmsButton>
          </HmsDetailFooter>
        )}
        {actionable && !matched && (
          <HmsDetailFooter>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stage === 'review' ? 2 : 1}, minmax(0, 1fr))`, gap: '10px' }}>
              {stage === 'review' && (
                <HmsButton
                  variant="danger"
                  icon={SearchIcon}
                  block
                  disabled={busy || short}
                  onClick={() =>
                    run(async () => {
                      const s = await billingService.signOffShift(sel.shift_id, 'INVESTIGATE', finding.trim());
                      return `Investigation ${s.closing?.investigation_number || ''} opened for ${sel.counter_name}`;
                    })
                  }
                >
                  Open investigation
                </HmsButton>
              )}
              <HmsButton
                variant="primary"
                icon={Check}
                block
                disabled={busy || short}
                onClick={() =>
                  run(async () => {
                    await billingService.signOffShift(sel.shift_id, 'SIGN_OFF_WITH_VARIANCE', finding.trim());
                    return `${sel.counter_name} closed with variance ${varText(sel.net_variance)}`;
                  })
                }
              >
                Sign off with variance
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
        listId="sup-closings"
        title="Closings & vault"
        description="Sign off matched counters, investigate variances, then hand the cash to the vault."
        total={closings.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search counter, cashier or investigation"
        headerAction={
          <HmsButton size="sm" icon={Vault} disabled={!toVault.length} onClick={() => setVaultOpen(true)} title={toVault.length ? 'Hand signed-off cash to the vault (Alt+V)' : 'No signed-off cash waiting'}>
            Vault
          </HmsButton>
        }
        pills={[
          { key: 'all', label: 'All', count: closings.length },
          { key: 'review', label: 'To review', count: closings.filter((r) => stageOf(r) === 'review').length },
          { key: 'investigating', label: 'Investigating', count: closings.filter((r) => stageOf(r) === 'investigating').length, tone: 'red' },
          { key: 'signed', label: 'To vault', count: toVault.length, tone: 'amber' },
          { key: 'vault', label: 'In vault', count: closings.filter((r) => stageOf(r) === 'vault').length },
        ]}
        activePill={pill}
        onPill={(k) => {
          setPill(k);
          setSelected(null);
          setFinding('');
        }}
        selectedKey={selected}
        onSelect={(k) => {
          if (k !== selected) setFinding('');
          setSelected(k);
        }}
        primaryLabel="review closing"
        detailLabel="Counter closing"
        emptyText="No closings match this search or filter."
        renderDetail={renderDetail}
      />
      {vaultOpen && (
        <HmsModal
          title={toVault.length ? `Hand ${format(vaultCash)} to the vault?` : 'Nothing to hand over'}
          description={toVault.length ? `${toVault.length} signed-off counter(s). The sealed cash bags move to the vault under one handover number.` : 'Sign off at least one counter closing first.'}
          onClose={() => setVaultOpen(false)}
          busy={busy}
          footer={
            <>
              <HmsButton onClick={() => setVaultOpen(false)} data-autofocus>
                Cancel
              </HmsButton>
              {toVault.length > 0 && (
                <HmsButton variant="primary" icon={Vault} onClick={handover} disabled={busy}>
                  {busy ? 'Handing over…' : 'Confirm handover'}
                </HmsButton>
              )}
            </>
          }
        >
          {toVault.map((r) => (
            <HmsRow key={r.shift_id} label={`${r.counter_name} · ${r.cashier_name}`} hint={r.closed_with_variance ? `Closed with variance ${varText(r.net_variance)}` : 'Matched'} value={format(r.tenders.find((t) => t.tender === 'CASH')?.counted || 0)} />
          ))}
        </HmsModal>
      )}
    </>
  );
};
