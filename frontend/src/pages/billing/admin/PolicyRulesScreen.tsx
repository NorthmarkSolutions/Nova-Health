import React, { useEffect, useState, useCallback } from 'react';
import {
  FileText, ShieldCheck, CheckCircle2, ToggleLeft, ToggleRight,
  RefreshCw, Settings, AlertTriangle, Key, Sliders
} from 'lucide-react';
import { billingService, PolicyRuleItem } from '../../../services/billingService';
import { Btn, C, Callout, Empty, PageHeader, card, mono, inputStyle, apiError } from '../executive/executiveUi';

export const PolicyRulesScreen: React.FC = () => {
  const [policies, setPolicies] = useState<PolicyRuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savingCode, setSavingCode] = useState<string | null>(null);

  const loadPolicies = useCallback(async () => {
    try {
      setError(null);
      const res = await billingService.getPolicyRules();
      setPolicies(res);
    } catch (err) {
      setError(apiError(err, 'Failed to load policy rules.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPolicies();
  }, [loadPolicies]);

  const handleUpdateParameter = (ruleCode: string, paramKey: string, val: any) => {
    setPolicies((prev) =>
      prev.map((p) => {
        if (p.rule_code === ruleCode) {
          return {
            ...p,
            parameter_value: {
              ...p.parameter_value,
              [paramKey]: val
            }
          };
        }
        return p;
      })
    );
  };

  const handleToggleActive = async (policy: PolicyRuleItem) => {
    setSavingCode(policy.rule_code);
    setError(null);
    try {
      await billingService.updatePolicyRule(policy.rule_code, { is_active: !policy.is_active });
      setNotice(`Policy ${policy.rule_code} ${!policy.is_active ? 'activated' : 'disabled'}.`);
      loadPolicies();
    } catch (err) {
      setError(apiError(err, 'Failed to update policy status.'));
    } finally {
      setSavingCode(null);
    }
  };

  const handleSavePolicy = async (policy: PolicyRuleItem) => {
    setSavingCode(policy.rule_code);
    setError(null);
    setNotice(null);
    try {
      await billingService.updatePolicyRule(policy.rule_code, {
        rule_name: policy.rule_name,
        parameter_value: policy.parameter_value,
        description: policy.description,
        is_active: policy.is_active
      });
      setNotice(`Policy rule ${policy.rule_code} updated and audited.`);
      loadPolicies();
    } catch (err) {
      setError(apiError(err, 'Failed to save policy rule.'));
    } finally {
      setSavingCode(null);
    }
  };

  return (
    <div style={{ paddingBottom: 40 }}>
      <PageHeader
        title="Hospital Financial Policy Rules Engine (A-16)"
        subtitle="Manage hospital-wide discount discretion ceilings, dual-authorization gates, cash drawer limits and terminal lockdown"
        actions={
          <Btn variant="secondary" onClick={loadPolicies}>
            <RefreshCw size={14} style={{ marginRight: 6 }} /> Refresh Policies
          </Btn>
        }
      />

      {error && <Callout tone="red">{error}</Callout>}
      {notice && <Callout tone="green">{notice}</Callout>}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <RefreshCw size={24} className="animate-spin" color={C.primary} />
        </div>
      ) : policies.length === 0 ? (
        <Empty text="No financial policy rules registered." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 18 }}>
          {policies.map((p) => (
            <div
              key={p.rule_code}
              style={{
                ...card,
                padding: 20,
                border: p.is_active ? `1px solid ${C.border}` : `1px dashed ${C.border}`,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.primaryDark, ...mono }}>
                        {p.rule_code}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 999,
                          background: p.is_active ? C.greenSoft : '#F3F4F6',
                          color: p.is_active ? C.green : C.muted
                        }}
                      >
                        {p.is_active ? 'ACTIVE' : 'DISABLED'}
                      </span>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginTop: 4 }}>
                      {p.rule_name}
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleActive(p)}
                    disabled={savingCode === p.rule_code}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: p.is_active ? C.green : C.muted
                    }}
                    title={p.is_active ? 'Disable rule' : 'Enable rule'}
                  >
                    {p.is_active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                  </button>
                </div>

                {/* Natural language description */}
                <p style={{ margin: '0 0 16px', fontSize: 13, color: C.textSub, lineHeight: 1.4 }}>
                  {p.description}
                </p>

                {/* Parameter Editor Box */}
                <div style={{ padding: 14, background: C.bg, borderRadius: 8, marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sliders size={13} /> RULE PARAMETERS
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {Object.entries(p.parameter_value || {}).map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: C.textSub, ...mono }}>{k}:</span>
                        {typeof v === 'boolean' ? (
                          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12 }}>
                            <input
                              type="checkbox"
                              checked={v}
                              onChange={(e) => handleUpdateParameter(p.rule_code, k, e.target.checked)}
                            />
                            <span>{v ? 'Enforced' : 'Disabled'}</span>
                          </label>
                        ) : (
                          <input
                            type="number"
                            value={v}
                            onChange={(e) => handleUpdateParameter(p.rule_code, k, Number(e.target.value))}
                            style={{
                              width: 100,
                              padding: '4px 8px',
                              fontSize: 12,
                              border: `1px solid ${C.border}`,
                              borderRadius: 6,
                              background: C.surface,
                              ...mono
                            }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 11, color: C.muted }}>
                  Category: <strong>{p.categoryDisplay || p.category}</strong>
                </span>
                <Btn
                  variant="primary"
                  style={{ height: 32, fontSize: 13, padding: '0 10px' }}
                  onClick={() => handleSavePolicy(p)}
                  disabled={savingCode === p.rule_code}
                >
                  {savingCode === p.rule_code ? 'Saving...' : 'Save Parameters'}
                </Btn>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
