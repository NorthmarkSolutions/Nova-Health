import React, { useEffect, useState, useCallback } from 'react';
import {
  ShieldCheck, ArrowRight, Play, RefreshCw, CheckCircle2,
  XCircle, Clock, Zap, AlertTriangle, HelpCircle
} from 'lucide-react';
import {
  billingService, ApprovalMatrixTierItem, TestRouteResult
} from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { Btn, C, Callout, Field, PageHeader, card, mono, inputStyle, apiError } from '../executive/executiveUi';

const TIER_ORDER = ['SUPERVISOR', 'MANAGER', 'ADMIN', 'CFO'] as const;

export const ApprovalMatrixScreen: React.FC = () => {
  const { format: fmt } = useCurrency();
  const [tiers, setTiers] = useState<ApprovalMatrixTierItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Simulator state
  const [simAction, setSimAction] = useState<string>('DISCOUNT');
  const [simAmount, setSimAmount] = useState<number>(15000);
  const [simPercent, setSimPercent] = useState<number>(25);
  const [simResult, setSimResult] = useState<TestRouteResult | null>(null);
  const [simulating, setSimulating] = useState(false);

  const loadMatrix = useCallback(async () => {
    try {
      setError(null);
      const res = await billingService.getApprovalMatrix();
      setTiers(res);
    } catch (err) {
      setError(apiError(err, 'Failed to load approval matrix.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMatrix();
  }, [loadMatrix]);

  const handleUpdateTier = (id: string, field: keyof ApprovalMatrixTierItem, val: any) => {
    setTiers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: val } : t))
    );
  };

  const handleSaveMatrix = async () => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await billingService.updateApprovalMatrix(tiers);
      setNotice('Approval matrix thresholds updated and audited.');
      loadMatrix();
    } catch (err) {
      setError(apiError(err, 'Failed to update approval matrix.'));
    } finally {
      setSaving(false);
    }
  };

  const handleRunSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimulating(true);
    setError(null);
    try {
      const res = await billingService.testRouteRequest({
        action_type: simAction,
        amount: Number(simAmount) || 0,
        percentage: Number(simPercent) || 0
      });
      setSimResult(res);
    } catch (err) {
      setError(apiError(err, 'Simulation failed.'));
    } finally {
      setSimulating(false);
    }
  };

  // Group tiers by tier_level
  const groupedTiers = TIER_ORDER.map((tl) => {
    const list = tiers.filter((t) => t.tier_level === tl);
    const disc = list.find((t) => t.action_type === 'DISCOUNT');
    const ref = list.find((t) => t.action_type === 'REFUND');
    const voidAction = list.find((t) => t.action_type === 'VOID');
    const writeOff = list.find((t) => t.action_type === 'WRITE_OFF');
    const credit = list.find((t) => t.action_type === 'CREDIT_DISCHARGE');

    const roleName =
      tl === 'SUPERVISOR'
        ? 'Billing Supervisor'
        : tl === 'MANAGER'
        ? 'Billing Manager'
        : tl === 'ADMIN'
        ? 'Billing Admin / Hospital Admin'
        : 'Finance Manager / CFO';

    return {
      tier_level: tl,
      role: roleName,
      sla_minutes: disc?.sla_minutes || 60,
      discount: disc,
      refund: ref,
      voidAction,
      writeOff,
      credit
    };
  });

  return (
    <div style={{ paddingBottom: 40 }}>
      <PageHeader
        title="Financial Approval Matrix (A-15)"
        subtitle="Configure 4-tier threshold ceilings and simulate automatic request escalation ladders"
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="secondary" onClick={loadMatrix}>
              <RefreshCw size={14} style={{ marginRight: 6 }} /> Reset
            </Btn>
            <Btn variant="primary" onClick={handleSaveMatrix} disabled={saving}>
              {saving ? 'Saving...' : 'Save Matrix'}
            </Btn>
          </div>
        }
      />

      {error && <Callout tone="red">{error}</Callout>}
      {notice && <Callout tone="green">{notice}</Callout>}

      {/* Matrix Table */}
      <div style={{ ...card, padding: 0, overflowX: 'auto', marginBottom: 28 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: C.bg, borderBottom: `1px solid ${C.border}`, textAlign: 'left' }}>
              <th style={{ padding: '12px 16px', fontWeight: 700, color: C.text }}>Escalation Tier</th>
              <th style={{ padding: '12px 14px', fontWeight: 600, color: C.textSub }}>Authorized Role</th>
              <th style={{ padding: '12px 14px', fontWeight: 600, color: C.textSub }}>Max Discount %</th>
              <th style={{ padding: '12px 14px', fontWeight: 600, color: C.textSub }}>Max Discount (₹)</th>
              <th style={{ padding: '12px 14px', fontWeight: 600, color: C.textSub }}>Max Refund (₹)</th>
              <th style={{ padding: '12px 14px', fontWeight: 600, color: C.textSub }}>Max Void (₹)</th>
              <th style={{ padding: '12px 14px', fontWeight: 600, color: C.textSub }}>SLA Target</th>
            </tr>
          </thead>
          <tbody>
            {groupedTiers.map((g) => (
              <tr key={g.tier_level} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: '14px 16px', fontWeight: 700, color: C.text }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ShieldCheck
                      size={18}
                      color={
                        g.tier_level === 'SUPERVISOR'
                          ? '#15803D'
                          : g.tier_level === 'MANAGER'
                          ? '#2563EB'
                          : g.tier_level === 'ADMIN'
                          ? '#7C3AED'
                          : '#DC2626'
                      }
                    />
                    <span>{g.tier_level}</span>
                  </div>
                </td>
                <td style={{ padding: '14px 14px', color: C.textSub }}>{g.role}</td>

                {/* Discount % */}
                <td style={{ padding: '10px 14px' }}>
                  {g.discount ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input
                        type="number"
                        value={g.discount.max_percentage ?? ''}
                        disabled={g.tier_level === 'CFO'}
                        onChange={(e) =>
                          handleUpdateTier(g.discount!.id, 'max_percentage', e.target.value ? Number(e.target.value) : null)
                        }
                        style={{
                          width: 70,
                          padding: '4px 8px',
                          border: `1px solid ${C.border}`,
                          borderRadius: 6,
                          ...mono
                        }}
                      />
                      <span>%</span>
                    </div>
                  ) : (
                    '—'
                  )}
                </td>

                {/* Discount Amount */}
                <td style={{ padding: '10px 14px' }}>
                  {g.discount ? (
                    g.tier_level === 'CFO' ? (
                      <span style={{ color: C.green, fontWeight: 600 }}>Uncapped</span>
                    ) : (
                      <input
                        type="number"
                        value={g.discount.max_amount ?? ''}
                        onChange={(e) =>
                          handleUpdateTier(g.discount!.id, 'max_amount', e.target.value ? Number(e.target.value) : null)
                        }
                        style={{
                          width: 110,
                          padding: '4px 8px',
                          border: `1px solid ${C.border}`,
                          borderRadius: 6,
                          ...mono
                        }}
                      />
                    )
                  ) : (
                    '—'
                  )}
                </td>

                {/* Refund Amount */}
                <td style={{ padding: '10px 14px' }}>
                  {g.refund ? (
                    g.tier_level === 'CFO' ? (
                      <span style={{ color: C.green, fontWeight: 600 }}>Uncapped</span>
                    ) : (
                      <input
                        type="number"
                        value={g.refund.max_amount ?? ''}
                        onChange={(e) =>
                          handleUpdateTier(g.refund!.id, 'max_amount', e.target.value ? Number(e.target.value) : null)
                        }
                        style={{
                          width: 110,
                          padding: '4px 8px',
                          border: `1px solid ${C.border}`,
                          borderRadius: 6,
                          ...mono
                        }}
                      />
                    )
                  ) : (
                    '—'
                  )}
                </td>

                {/* Void Amount */}
                <td style={{ padding: '10px 14px' }}>
                  {g.voidAction ? (
                    g.tier_level === 'CFO' ? (
                      <span style={{ color: C.green, fontWeight: 600 }}>Uncapped</span>
                    ) : (
                      <input
                        type="number"
                        value={g.voidAction.max_amount ?? ''}
                        onChange={(e) =>
                          handleUpdateTier(g.voidAction!.id, 'max_amount', e.target.value ? Number(e.target.value) : null)
                        }
                        style={{
                          width: 110,
                          padding: '4px 8px',
                          border: `1px solid ${C.border}`,
                          borderRadius: 6,
                          ...mono
                        }}
                      />
                    )
                  ) : (
                    '—'
                  )}
                </td>

                {/* SLA Minutes */}
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      type="number"
                      value={g.discount?.sla_minutes || 60}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (g.discount) handleUpdateTier(g.discount.id, 'sla_minutes', val);
                        if (g.refund) handleUpdateTier(g.refund.id, 'sla_minutes', val);
                      }}
                      style={{
                        width: 60,
                        padding: '4px 8px',
                        border: `1px solid ${C.border}`,
                        borderRadius: 6,
                        ...mono
                      }}
                    />
                    <span style={{ fontSize: 11, color: C.muted }}>mins</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Simulator Section */}
      <div style={{ ...card, padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <Zap size={20} color="#D97706" />
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text }}>
            Simulate Escalation Route & Limit Breaches
          </h3>
        </div>
        <p style={{ margin: '0 0 18px', fontSize: 13, color: C.muted }}>
          Test threshold combinations to verify how frontline exceptions traverse the 4-tier approval ladder.
        </p>

        <form onSubmit={handleRunSimulation} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, alignItems: 'flex-end', marginBottom: 20 }}>
          <Field label="Exception Type">
            <select
              value={simAction}
              onChange={(e) => setSimAction(e.target.value)}
              style={inputStyle}
            >
              <option value="DISCOUNT">Discount Override</option>
              <option value="REFUND">Refund Request</option>
              <option value="VOID">Invoice Void</option>
              <option value="WRITE_OFF">Bad Debt Write-off</option>
              <option value="CREDIT_DISCHARGE">Credit Discharge Limit</option>
            </select>
          </Field>

          <Field label="Exception Amount (₹)">
            <input
              type="number"
              value={simAmount}
              onChange={(e) => setSimAmount(Number(e.target.value))}
              style={{ ...inputStyle, ...mono }}
            />
          </Field>

          {simAction === 'DISCOUNT' && (
            <Field label="Discount Percentage (%)">
              <input
                type="number"
                value={simPercent}
                onChange={(e) => setSimPercent(Number(e.target.value))}
                style={{ ...inputStyle, ...mono }}
              />
            </Field>
          )}

          <div>
            <Btn variant="primary" type="submit" disabled={simulating} style={{ width: '100%' }}>
              <Play size={14} style={{ marginRight: 6 }} />
              {simulating ? 'Routing...' : 'Simulate Route'}
            </Btn>
          </div>
        </form>

        {/* Simulation Output Ladder */}
        {simResult && (
          <div style={{ padding: 18, background: C.bg, borderRadius: 10, border: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>SIMULATED ROUTE TARGET:</span>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.primaryDark, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{simResult.target_tier}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: C.textSub }}>({simResult.required_role})</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: C.muted }}>TARGET SLA:</span>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.text, ...mono }}>
                  {simResult.sla_minutes} Minutes
                </div>
              </div>
            </div>

            {/* Ladder Steps */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10, marginTop: 12 }}>
              {simResult.ladder.map((step, idx) => (
                <div
                  key={step.tier}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    background: step.eligible ? C.surface : '#FEE2E2',
                    border: step.tier === simResult.target_tier ? `2px solid ${C.primary}` : `1px solid ${C.border}`,
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>
                      {idx + 1}. {step.tier}
                    </span>
                    {step.eligible ? (
                      <CheckCircle2 size={15} color={C.green} />
                    ) : (
                      <XCircle size={15} color={C.red} />
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: C.textSub, marginBottom: 4 }}>{step.role}</div>
                  <div style={{ fontSize: 11, color: C.muted, ...mono }}>
                    Limit: {step.max_amount ? fmt(step.max_amount) : 'Uncapped'}
                    {step.max_percentage ? ` / ${step.max_percentage}%` : ''}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 11, fontWeight: 600, color: step.eligible ? C.green : C.red }}>
                    {step.eligible ? (step.tier === simResult.target_tier ? '★ Assigned Approver' : 'Eligible') : 'Breached Limit'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
