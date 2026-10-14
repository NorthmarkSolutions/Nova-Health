// Billing · Admin — approval matrix: how far each tier (Supervisor → Manager → Admin → CFO) may go on discounts,
// refunds, voids, write-offs, credit discharges and corporate overrides, and how fast it must decide. Requests above a
// tier's ceiling escalate automatically. A route tester shows where any request would land.
import React, { useCallback, useEffect, useState } from 'react';
import { Layers, Save, Route, Undo2 } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsRow, HmsNotice, HmsEmpty, HmsModal, HmsField, HmsToggle, INPUT } from '../../../components/hms';
import { ApprovalMatrixTierItem, billingService, TestRouteResult } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { apiError } from '../executive/executiveUi';

export interface AdmMatrixViewProps {
  notify: (message: string, tone?: 'success' | 'error') => void;
  initialSelect?: string;
  testSignal: number;
}

const TIERS = [
  { key: 'SUPERVISOR', role: 'Billing Supervisor' },
  { key: 'MANAGER', role: 'Billing Manager' },
  { key: 'ADMIN', role: 'Billing Admin / Hospital Admin' },
  { key: 'CFO', role: 'Finance Manager / CFO' },
] as const;
const ACTIONS: Record<string, string> = { DISCOUNT: 'Discount', REFUND: 'Refund', VOID: 'Void invoice', WRITE_OFF: 'Write-off', CREDIT_DISCHARGE: 'Credit discharge', CORPORATE_OVERRIDE: 'Corporate override' };

export const AdmMatrixView: React.FC<AdmMatrixViewProps> = ({ notify, initialSelect, testSignal }) => {
  const { format } = useCurrency();
  const [server, setServer] = useState<ApprovalMatrixTierItem[] | null>(null);
  const [tiers, setTiers] = useState<ApprovalMatrixTierItem[]>([]);
  const [failed, setFailed] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(initialSelect ? `t:${initialSelect}` : null);
  const [busy, setBusy] = useState(false);
  const [test, setTest] = useState<null | { action: string; amount: string; pct: string; result: TestRouteResult | null }>(null);
  const [seen, setSeen] = useState(testSignal);

  if (testSignal !== seen) {
    setSeen(testSignal);
    setTest({ action: 'DISCOUNT', amount: '15000', pct: '25', result: null });
  }

  const load = useCallback(async () => {
    try {
      const r = await billingService.getApprovalMatrix();
      setServer(r);
      setTiers(r);
      setFailed(null);
    } catch (e) {
      setFailed(apiError(e, 'The approval matrix could not be loaded.'));
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  const dirty = !!server && JSON.stringify(server) !== JSON.stringify(tiers);
  const of = (tier: string) => tiers.filter((t) => t.tier_level === tier);
  const q = search.trim().toLowerCase();
  const rows: HmsListRow[] = TIERS.filter((t) => !q || `${t.key} ${t.role}`.toLowerCase().includes(q)).map((t) => {
    const list = of(t.key);
    const disc = list.find((x) => x.action_type === 'DISCOUNT');
    const changed = server && JSON.stringify(server.filter((x) => x.tier_level === t.key)) !== JSON.stringify(list);
    return {
      key: `t:${t.key}`,
      title: t.role,
      badge: changed ? <HmsBadge tone="amber">Edited</HmsBadge> : <HmsBadge tone="gray">{`${list.filter((x) => x.is_active).length} rules`}</HmsBadge>,
      sub: t.key.charAt(0) + t.key.slice(1).toLowerCase() + ' tier',
      metaLeft: disc ? `Discount up to ${disc.max_percentage ?? '∞'}%${disc.max_amount != null ? ` / ${format(disc.max_amount)}` : ''}` : 'No discount rule',
      metaRight: disc ? `SLA ${disc.sla_minutes} min` : undefined,
    };
  });

  const setRule = (id: string, patch: Partial<ApprovalMatrixTierItem>) => setTiers((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const numOrNull = (v: string) => (v.trim() === '' ? null : Number(v));

  const save = async () => {
    setBusy(true);
    try {
      await billingService.updateApprovalMatrix(tiers);
      notify('Approval matrix saved · recorded in the audit log');
      await load();
    } catch (e) {
      notify(apiError(e, 'The matrix could not be saved'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const runTest = async () => {
    if (!test) return;
    setBusy(true);
    try {
      const r = await billingService.testRouteRequest({ action_type: test.action, amount: Number(test.amount) || 0, percentage: Number(test.pct) || 0 });
      setTest({ ...test, result: r });
    } catch (e) {
      notify(apiError(e, 'The route test failed'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const renderDetail = (key: string | null) => {
    if (!server && !failed) return <HmsEmpty>Loading the approval matrix…</HmsEmpty>;
    if (failed) return <HmsEmpty>{failed}</HmsEmpty>;
    const tier = TIERS.find((t) => `t:${t.key}` === key);
    if (!tier) return <HmsEmpty>Select a tier from the list.</HmsEmpty>;
    const list = of(tier.key);
    const get = (a: string) => list.find((x) => x.action_type === a);
    return (
      <>
        <HmsDetailHeader icon={Layers} title={tier.role} badge={<HmsBadge tone="blue">{tier.key}</HmsBadge>} subtitle="Ceilings this tier may approve; anything above escalates to the next tier." />
        <HmsStatStrip
          items={[
            { label: 'Discount', value: get('DISCOUNT') ? `${get('DISCOUNT')!.max_percentage ?? '∞'}%` : '—', note: get('DISCOUNT')?.max_amount != null ? format(get('DISCOUNT')!.max_amount!) : 'No amount cap' },
            { label: 'Refund', value: get('REFUND')?.max_amount != null ? format(get('REFUND')!.max_amount!) : get('REFUND') ? 'No cap' : '—' },
            { label: 'Void', value: get('VOID')?.max_amount != null ? format(get('VOID')!.max_amount!) : get('VOID') ? 'No cap' : '—' },
            { label: 'Decision SLA', value: get('DISCOUNT') ? `${get('DISCOUNT')!.sla_minutes} min` : '—', note: 'Then auto-escalates' },
          ]}
        />
        <HmsDetailBody>
          {dirty && <HmsNotice tone="amber">Unsaved changes to the matrix. Save to apply them at every counter.</HmsNotice>}
          {list.length === 0 && <HmsNotice tone="blue">No rules for this tier.</HmsNotice>}
          {list.map((r) => (
            <HmsSection key={r.id} title={r.actionTypeDisplay || ACTIONS[r.action_type] || r.action_type} right={<HmsToggle checked={r.is_active} onChange={(v) => setRule(r.id, { is_active: v })} label={`${ACTIONS[r.action_type] || r.action_type} rule active`} />} padded>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '16px', opacity: r.is_active ? 1 : 0.55 }}>
                <HmsField label="Up to (%)" htmlFor={`mx-p-${r.id}`} hint="Blank = no percent cap">
                  <input id={`mx-p-${r.id}`} style={INPUT} inputMode="decimal" value={r.max_percentage ?? ''} onChange={(e) => setRule(r.id, { max_percentage: numOrNull(e.target.value) })} />
                </HmsField>
                <HmsField label="Up to (amount)" htmlFor={`mx-a-${r.id}`} hint="Blank = no amount cap">
                  <input id={`mx-a-${r.id}`} style={INPUT} inputMode="decimal" value={r.max_amount ?? ''} onChange={(e) => setRule(r.id, { max_amount: numOrNull(e.target.value) })} />
                </HmsField>
                <HmsField label="Decide within (min)" htmlFor={`mx-s-${r.id}`}>
                  <input id={`mx-s-${r.id}`} style={INPUT} inputMode="numeric" value={r.sla_minutes} onChange={(e) => setRule(r.id, { sla_minutes: parseInt(e.target.value, 10) || 0 })} />
                </HmsField>
              </div>
            </HmsSection>
          ))}
        </HmsDetailBody>
        <HmsDetailFooter>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
            <HmsButton icon={Undo2} block disabled={busy || !dirty} onClick={() => server && setTiers(server)}>
              Discard changes
            </HmsButton>
            <HmsButton variant="primary" icon={Save} block disabled={busy || !dirty} onClick={save}>
              Save matrix
            </HmsButton>
          </div>
        </HmsDetailFooter>
      </>
    );
  };

  return (
    <>
      <HmsMasterDetail
        listId="adm-matrix"
        title="Approval matrix"
        description="Four approval tiers and their ceilings. Requests above a ceiling escalate automatically."
        total={TIERS.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search tier or role"
        headerAction={
          <HmsButton size="sm" icon={Route} onClick={() => setTest({ action: 'DISCOUNT', amount: '15000', pct: '25', result: null })} title="Test where a request is routed (Alt+T)">
            Test
          </HmsButton>
        }
        selectedKey={selected}
        onSelect={setSelected}
        primaryLabel="edit ceilings"
        detailLabel="Approval tier"
        emptyText="No tiers match this search."
        renderDetail={renderDetail}
      />
      {test && (
        <HmsModal
          title="Where would this request go?"
          description="Routes a hypothetical request through the saved matrix."
          onClose={() => setTest(null)}
          busy={busy}
          footer={
            <>
              <HmsButton onClick={() => setTest(null)}>Close</HmsButton>
              <HmsButton variant="primary" icon={Route} disabled={busy} onClick={runTest}>
                Route it
              </HmsButton>
            </>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '16px' }}>
            <HmsField label="Request" htmlFor="rt-action">
              <select id="rt-action" autoFocus style={INPUT} value={test.action} onChange={(e) => setTest({ ...test, action: e.target.value, result: null })}>
                {Object.entries(ACTIONS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </HmsField>
            <HmsField label="Amount" htmlFor="rt-amt">
              <input id="rt-amt" style={INPUT} inputMode="decimal" value={test.amount} onChange={(e) => setTest({ ...test, amount: e.target.value, result: null })} />
            </HmsField>
            <HmsField label="Percent" htmlFor="rt-pct">
              <input id="rt-pct" style={INPUT} inputMode="decimal" value={test.pct} onChange={(e) => setTest({ ...test, pct: e.target.value, result: null })} />
            </HmsField>
          </div>
          {test.result && (
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <HmsNotice tone={test.result.auto_escalated ? 'amber' : 'green'}>
                Goes to {test.result.required_role} ({test.result.target_tier}) · decide within {test.result.sla_minutes} min{test.result.auto_escalated ? ' · escalated past lower tiers' : ''}
              </HmsNotice>
              <HmsSection title="Escalation ladder">
                {test.result.ladder.map((l, i, arr) => (
                  <HmsRow
                    key={l.tier}
                    label={l.role}
                    hint={`Up to ${l.max_percentage ?? '∞'}%${l.max_amount != null ? ` / ${format(l.max_amount)}` : ''} · ${l.sla_minutes} min`}
                    value={<HmsBadge tone={l.tier === test.result!.target_tier ? 'blue' : l.eligible ? 'green' : 'gray'}>{l.tier === test.result!.target_tier ? 'Decides' : l.eligible ? 'Could decide' : 'Over ceiling'}</HmsBadge>}
                    last={i === arr.length - 1}
                  />
                ))}
              </HmsSection>
            </div>
          )}
        </HmsModal>
      )}
    </>
  );
};
