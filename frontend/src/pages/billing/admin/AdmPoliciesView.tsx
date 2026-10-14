// Billing · Admin — financial policy rules: cashier discount discretion, dual authorisation, drawer cash limits,
// discharge gates and other hospital-wide switches. Edit a rule's parameters, enable or disable it; every save is audited.
import React, { useCallback, useEffect, useState } from 'react';
import { Sliders, Save, Power, Undo2 } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsNotice, HmsEmpty, HmsField, HmsToggle, INPUT, TEXTAREA } from '../../../components/hms';
import { billingService, PolicyRuleItem } from '../../../services/billingService';
import { apiError } from '../executive/executiveUi';
import { MONO, fmtWhen, titleCase } from './adminDeskData';

export interface AdmPoliciesViewProps {
  notify: (message: string, tone?: 'success' | 'error') => void;
  initialFilter?: string;
  initialSelect?: string;
}

const CATEGORIES = ['DISCOUNT', 'REFUND', 'CASH_DRAWER', 'DISCHARGE', 'GENERAL'];
type ParamValue = string | number | boolean;

export const AdmPoliciesView: React.FC<AdmPoliciesViewProps> = ({ notify, initialFilter, initialSelect }) => {
  const [rules, setRules] = useState<PolicyRuleItem[] | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && (initialFilter === 'all' || initialFilter === 'off' || CATEGORIES.includes(initialFilter)) ? initialFilter : 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect ? `r:${initialSelect}` : null);
  const [edits, setEdits] = useState<Record<string, { params: Record<string, ParamValue>; description: string }>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setRules(await billingService.getPolicyRules());
      setFailed(null);
    } catch (e) {
      setFailed(apiError(e, 'Policy rules could not be loaded.'));
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  const list = [...(rules || [])].sort((a, b) => a.priority - b.priority);
  const match = (r: PolicyRuleItem, p: string) => (p === 'all' ? true : p === 'off' ? !r.is_active : r.category === p);
  const q = search.trim().toLowerCase();
  const visible = list.filter((r) => match(r, pill) && (!q || [r.rule_name, r.rule_code, r.description].some((v) => (v || '').toLowerCase().includes(q))));
  const rows: HmsListRow[] = visible.map((r) => ({
    key: `r:${r.rule_code}`,
    title: r.rule_name,
    badge: edits[r.rule_code] ? <HmsBadge tone="amber">Edited</HmsBadge> : r.is_active ? <HmsBadge tone="green">On</HmsBadge> : <HmsBadge tone="gray">Off</HmsBadge>,
    sub: (
      <>
        <span style={MONO}>{r.rule_code}</span> · {r.categoryDisplay || titleCase(r.category)}
      </>
    ),
    metaLeft: Object.entries(r.parameter_value || {})
      .slice(0, 2)
      .map(([k, v]) => `${titleCase(k)}: ${typeof v === 'boolean' ? (v ? 'yes' : 'no') : v}`)
      .join(' · '),
  }));

  const save = async (r: PolicyRuleItem, patch: Partial<PolicyRuleItem>, msg: string) => {
    setBusy(true);
    try {
      await billingService.updatePolicyRule(r.rule_code, patch);
      notify(msg);
      setEdits((x) => {
        const n = { ...x };
        delete n[r.rule_code];
        return n;
      });
      await load();
    } catch (e) {
      notify(apiError(e, 'The policy could not be saved'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const renderDetail = (key: string | null) => {
    if (!rules && !failed) return <HmsEmpty>Loading policy rules…</HmsEmpty>;
    if (failed) return <HmsEmpty>{failed}</HmsEmpty>;
    const r = list.find((x) => `r:${x.rule_code}` === key);
    if (!r) return <HmsEmpty>{list.length ? 'Select a rule from the list.' : 'No policy rules registered.'}</HmsEmpty>;
    const e = edits[r.rule_code] || { params: { ...(r.parameter_value || {}) } as Record<string, ParamValue>, description: r.description };
    const setE = (patch: Partial<typeof e>) => setEdits((x) => ({ ...x, [r.rule_code]: { ...e, ...patch } }));
    const params = Object.entries(e.params);
    const dirty = !!edits[r.rule_code];
    return (
      <>
        <HmsDetailHeader icon={Sliders} title={r.rule_name} badge={r.is_active ? <HmsBadge tone="green">On</HmsBadge> : <HmsBadge tone="gray">Off</HmsBadge>} subtitle={<><span style={MONO}>{r.rule_code}</span> · {r.categoryDisplay || titleCase(r.category)}</>} />
        <HmsStatStrip
          items={[
            { label: 'Status', value: r.is_active ? 'Enforced' : 'Not enforced', tone: r.is_active ? 'green' : 'amber' },
            { label: 'Priority', value: r.priority, note: 'Lower runs first' },
            { label: 'Parameters', value: params.length },
            { label: 'Last changed', value: fmtWhen(r.updated_at || r.created_at) },
          ]}
        />
        <HmsDetailBody>
          {!r.is_active && <HmsNotice tone="amber">This rule is off: counters are not held to it.</HmsNotice>}
          {dirty && <HmsNotice tone="amber">Unsaved changes.</HmsNotice>}
          <HmsSection title="Parameters" padded>
            {params.length === 0 ? (
              <span style={{ fontSize: '13px', color: '#6b7280' }}>This rule has no parameters; it is simply on or off.</span>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' }}>
                {params.map(([k, v]) =>
                  typeof v === 'boolean' ? (
                    <div key={k} style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '8px' }}>
                      <HmsToggle checked={v} onChange={(nv) => setE({ params: { ...e.params, [k]: nv } })} label={titleCase(k)} showLabel />
                    </div>
                  ) : (
                    <HmsField key={k} label={titleCase(k)} htmlFor={`pol-${r.rule_code}-${k}`}>
                      <input
                        id={`pol-${r.rule_code}-${k}`}
                        style={INPUT}
                        inputMode={typeof v === 'number' ? 'decimal' : undefined}
                        value={String(v)}
                        onChange={(ev) => setE({ params: { ...e.params, [k]: typeof v === 'number' ? (ev.target.value === '' ? 0 : Number(ev.target.value)) : ev.target.value } })}
                      />
                    </HmsField>
                  )
                )}
              </div>
            )}
          </HmsSection>
          <HmsSection title="What the rule does" padded>
            <HmsField label="Description" htmlFor={`pol-desc-${r.rule_code}`}>
              <textarea id={`pol-desc-${r.rule_code}`} style={TEXTAREA} value={e.description} onChange={(ev) => setE({ description: ev.target.value })} />
            </HmsField>
          </HmsSection>
        </HmsDetailBody>
        <HmsDetailFooter>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px' }}>
            <HmsButton variant={r.is_active ? 'danger' : 'primary'} icon={Power} block disabled={busy || dirty} title={dirty ? 'Save or discard changes first' : undefined} onClick={() => save(r, { is_active: !r.is_active }, `${r.rule_name} ${r.is_active ? 'turned off' : 'turned on'}`)}>
              {r.is_active ? 'Turn off' : 'Turn on'}
            </HmsButton>
            <HmsButton icon={Undo2} block disabled={busy || !dirty} onClick={() => setEdits((x) => { const n = { ...x }; delete n[r.rule_code]; return n; })}>
              Discard
            </HmsButton>
            <HmsButton variant="primary" icon={Save} block disabled={busy || !dirty} onClick={() => save(r, { rule_name: r.rule_name, parameter_value: e.params, description: e.description, is_active: r.is_active }, `${r.rule_name} saved · recorded in the audit log`)}>
              Save rule
            </HmsButton>
          </div>
        </HmsDetailFooter>
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="adm-policies"
      title="Policy rules"
      description="Hospital-wide billing rules the counters are held to."
      total={list.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search rule, code or description"
      pills={[
        { key: 'all', label: 'All', count: list.length },
        ...CATEGORIES.filter((c) => list.some((r) => r.category === c)).map((c) => ({ key: c, label: titleCase(c), count: list.filter((r) => r.category === c).length })),
        { key: 'off', label: 'Off', count: list.filter((r) => !r.is_active).length, tone: 'amber' as const },
      ]}
      activePill={pill}
      onPill={(k) => {
        setPill(k);
        setSelected(null);
      }}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="edit rule"
      detailLabel="Policy rule"
      emptyText="No rules match this search or filter."
      renderDetail={renderDetail}
    />
  );
};
