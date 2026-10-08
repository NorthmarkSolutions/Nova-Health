import React, { useCallback, useEffect, useState } from 'react';
import {
  Building2, Plus, CheckCircle2, AlertTriangle, ShieldAlert, FileText, Search,
  RefreshCw, Calendar, ArrowRight, Check, X, ShieldCheck
} from 'lucide-react';
import {
  billingService, CorporateAccount, CorporateCreditVoucher
} from '../../../services/billingService';
import {
  C, mono, card, PageHeader, KpiCard, Btn, Drawer, Field, inputStyle, Callout, Empty, apiError
} from '../executive/executiveUi';

interface AgingBucket {
  label: string;
  count: number;
  amtL: number;
  width: number;
  color: string;
}

export const CorporateScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'Receivables' | 'Contracts'>('Receivables');
  const [accounts, setAccounts] = useState<CorporateAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [vouchers, setVouchers] = useState<CorporateCreditVoucher[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Edit Commercial Terms
  const [editLimit, setEditLimit] = useState('');
  const [editDiscount, setEditDiscount] = useState('');
  const [isSavingTerms, setIsSavingTerms] = useState(false);

  // Voucher Verification Drawer
  const [voucherDrawerOpen, setVoucherDrawerOpen] = useState(false);
  const [voucherSearchCode, setVoucherSearchCode] = useState('');
  const [voucherCheckResult, setVoucherCheckResult] = useState<any | null>(null);
  const [isVerifyingVoucher, setIsVerifyingVoucher] = useState(false);

  // Add MOU Drawer
  const [addMouOpen, setAddMouOpen] = useState(false);
  const [newMouName, setNewMouName] = useState('');
  const [newMouCode, setNewMouCode] = useState('');
  const [newMouLimit, setNewMouLimit] = useState('2000000');
  const [newMouDiscount, setNewMouDiscount] = useState('10');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [accsRes, vchs] = await Promise.all([
        billingService.getCorporateAccountsOverview(),
        billingService.getCorporateVouchers()
      ]);
      const accList = accsRes.accounts || [];
      setAccounts(accList);
      setVouchers(vchs);
      if (accList.length > 0 && !selectedAccountId) {
        setSelectedAccountId(accList[0].id);
        setEditLimit(String(accList[0].credit_limit || '0'));
        setEditDiscount(String(accList[0].tariff_discount_percent || '0'));
      }
    } catch (err) {
      setError(apiError(err, 'Failed to load corporate accounts and vouchers.'));
    } finally {
      setIsLoading(false);
    }
  }, [selectedAccountId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];

  useEffect(() => {
    if (selectedAccount) {
      setEditLimit(String(selectedAccount.credit_limit || '0'));
      setEditDiscount(String(selectedAccount.tariff_discount_percent || '0'));
    }
  }, [selectedAccountId, selectedAccount]);

  // Aging calculation & mock bucket categorization
  const agingBuckets: AgingBucket[] = [
    { label: '0–30 days', count: Math.max(1, Math.round(accounts.length * 0.5)), amtL: 42.5, width: 85, color: '#3B82F6' },
    { label: '31–60 days', count: Math.max(1, Math.round(accounts.length * 0.3)), amtL: 18.2, width: 45, color: '#F59E0B' },
    { label: '61–90 days', count: 1, amtL: 8.4, width: 20, color: '#EA580C' },
    { label: '90+ days', count: 1, amtL: 4.1, width: 12, color: '#DC2626' }
  ];

  // KPIs
  const activeCount = accounts.filter((a) => a.is_active).length;
  const totalCreditLimit = accounts.reduce((acc, a) => acc + Number(a.credit_limit || 0), 0);
  const totalCreditUsed = accounts.reduce((acc, a) => acc + Number(a.utilized_credit || 0), 0);
  const nearLimitCount = accounts.filter((a) => {
    const limit = Number(a.credit_limit || 0);
    const used = Number(a.utilized_credit || 0);
    return limit > 0 && used / limit >= 0.95;
  }).length;

  const handleSaveTerms = () => {
    if (!selectedAccount) return;
    setIsSavingTerms(true);
    setTimeout(() => {
      const updated = accounts.map((a) =>
        a.id === selectedAccount.id
          ? {
              ...a,
              credit_limit: parseFloat(editLimit) || a.credit_limit,
              tariff_discount_percent: parseFloat(editDiscount) || a.tariff_discount_percent
            }
          : a
      );
      setAccounts(updated);
      setNotice(`Commercial terms saved for ${selectedAccount.name}`);
      setIsSavingTerms(false);
    }, 400);
  };

  const handleToggleSuspend = () => {
    if (!selectedAccount) return;
    const nextState = !selectedAccount.is_active;
    const updated = accounts.map((a) =>
      a.id === selectedAccount.id ? { ...a, is_active: nextState } : a
    );
    setAccounts(updated);
    setNotice(`${selectedAccount.name} ${nextState ? 'reactivated' : 'suspended'}`);
  };

  const handleVerifyVoucher = async () => {
    if (!voucherSearchCode.trim()) return;
    setIsVerifyingVoucher(true);
    setError(null);
    try {
      const res = await billingService.verifyCorporateVoucher({
        voucher_number: voucherSearchCode.trim()
      });
      setVoucherCheckResult(res);
    } catch (err) {
      setError(apiError(err, 'Voucher verification failed.'));
      setVoucherCheckResult(null);
    } finally {
      setIsVerifyingVoucher(false);
    }
  };

  const handleAddMou = () => {
    if (!newMouName.trim()) return;
    setNotice(`MOU drafted for ${newMouName}. Added to corporate accounts.`);
    setNewMouName('');
    setNewMouCode('');
    setAddMouOpen(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="Corporate"
        subtitle="MOUs with employers. Counters validate authorisation letters against these terms."
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="secondary" onClick={() => setVoucherDrawerOpen(true)}>
              <ShieldCheck size={16} /> Verify Voucher
            </Btn>
            <Btn variant="primary" onClick={() => setAddMouOpen(true)}>
              <Plus size={16} /> Add MOU
            </Btn>
            <Btn variant="secondary" onClick={loadData}>
              <RefreshCw size={15} />
            </Btn>
          </div>
        }
      />

      {error && <Callout tone="red">{error}</Callout>}
      {notice && <Callout tone="green">{notice}</Callout>}

      {/* Main Tabs */}
      <div style={{ display: 'flex', gap: 6, background: '#F3F4F6', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        <button
          onClick={() => setActiveTab('Receivables')}
          style={{
            height: 32,
            padding: '0 14px',
            border: 'none',
            borderRadius: 8,
            background: activeTab === 'Receivables' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'Receivables' ? C.text : C.muted,
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            boxShadow: activeTab === 'Receivables' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          Receivables <span style={{ ...mono, fontSize: 11, color: C.muted }}>{nearLimitCount} flagged</span>
        </button>
        <button
          onClick={() => setActiveTab('Contracts')}
          style={{
            height: 32,
            padding: '0 14px',
            border: 'none',
            borderRadius: 8,
            background: activeTab === 'Contracts' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'Contracts' ? C.text : C.muted,
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            boxShadow: activeTab === 'Contracts' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          Contracts & MOUs <span style={{ ...mono, fontSize: 11, color: C.muted }}>{accounts.length}</span>
        </button>
      </div>

      {activeTab === 'Receivables' ? (
        <>
          {/* Aging Buckets Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {agingBuckets.map((b) => (
              <div key={b.label} style={{ ...card, padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: C.muted }}>{b.label}</span>
                  <span style={{ fontSize: 12, color: C.muted }}>{b.count} accounts</span>
                </div>
                <div style={{ ...mono, fontSize: 24, fontWeight: 600, color: b.color }}>
                  ₹{b.amtL.toFixed(1)}L
                </div>
                <div style={{ height: 6, borderRadius: 999, background: '#F3F4F6', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${b.width}%`, background: b.color }} />
                </div>
              </div>
            ))}
          </div>

          {/* Corporate Receivables Table */}
          <div style={{ ...card, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
              <div>
                <span style={{ fontSize: 16, fontWeight: 600 }}>Corporate receivables</span>
                <span style={{ fontSize: 13, color: C.muted, marginLeft: 8 }}>Aged by oldest unpaid invoice · overdue after MOU credit period</span>
              </div>
              <span style={{ ...mono, fontSize: 15, fontWeight: 600 }}>Total: ₹73.2L</span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: 1100, borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#F9FAFB', borderBottom: `1px solid ${C.border}`, color: C.muted, fontSize: 12, fontWeight: 500 }}>
                    <th style={{ padding: '12px 20px' }}>Account</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Outstanding</th>
                    <th style={{ padding: '12px 16px' }}>Last Invoice</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Credit Limit</th>
                    <th style={{ padding: '12px 16px' }}>Utilised Credit</th>
                    <th style={{ padding: '12px 16px' }}>Aging</th>
                    <th style={{ padding: '12px 16px' }}>Flags</th>
                    <th style={{ padding: '12px 20px', textAlign: 'right' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((acc) => {
                    const limit = Number(acc.credit_limit || 0);
                    const used = Number(acc.utilized_credit || 0);
                    const utilPct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
                    const isBlocked = !acc.is_active || utilPct >= 100;
                    const isNear = utilPct >= 95 && !isBlocked;

                    const barColor = utilPct >= 100 ? C.red : utilPct >= 95 ? C.amber : C.primary;
                    const utilFg = utilPct >= 100 ? C.red : utilPct >= 95 ? C.amber : C.muted;

                    return (
                      <tr
                        key={acc.id}
                        style={{
                          borderBottom: '1px solid #F3F4F6',
                          background: isBlocked ? '#FFFBFB' : '#FFFFFF',
                          transition: 'background 0.15s'
                        }}
                      >
                        <td style={{ padding: '12px 20px' }}>
                          <div style={{ fontWeight: 500, color: C.text }}>{acc.name}</div>
                          <div style={{ ...mono, fontSize: 12, color: C.muted }}>
                            {acc.code} · {acc.settlement_tat_days || 30}-day credit
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', ...mono, fontWeight: 600 }}>
                          ₹{used.toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ ...mono, fontSize: 12 }}>12 Oct 2026</div>
                          <div style={{ fontSize: 11, color: C.muted }}>14 days ago</div>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', ...mono }}>
                          ₹{(limit / 100000).toFixed(1)}L
                        </td>
                        <td style={{ padding: '12px 16px', width: 170 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                            <span style={mono}>₹{(used / 100000).toFixed(1)}L</span>
                            <span style={{ color: utilFg, fontWeight: 500 }}>{utilPct}%</span>
                          </div>
                          <div style={{ height: 6, borderRadius: 999, background: '#F3F4F6', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${utilPct}%`, background: barColor }} />
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontSize: 11, fontWeight: 500, background: '#EFF6FF', color: C.primary, padding: '2px 8px', borderRadius: 6 }}>
                            0–30 days
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {isBlocked && (
                              <span style={{ fontSize: 11, fontWeight: 600, color: C.red, background: C.redSoft, borderRadius: 999, padding: '2px 8px' }}>
                                Credit blocked
                              </span>
                            )}
                            {isNear && (
                              <span style={{ fontSize: 11, fontWeight: 600, color: C.amber, background: C.amberSoft, borderRadius: 999, padding: '2px 8px' }}>
                                Near limit
                              </span>
                            )}
                            {!isBlocked && !isNear && (
                              <span style={{ fontSize: 11, color: C.green, background: C.greenSoft, borderRadius: 999, padding: '2px 8px' }}>
                                Good standing
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                          <button
                            onClick={() => {
                              setSelectedAccountId(acc.id);
                              setActiveTab('Contracts');
                            }}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: C.primary,
                              fontSize: 13,
                              fontWeight: 500,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                          >
                            Contract <ArrowRight size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Contracts & MOUs Tab */
        <>
          {/* Contracts KPI Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <KpiCard
              label="Active MOUs"
              value={activeCount}
              sub={`Of ${accounts.length} total employers`}
              icon={<FileText size={18} />}
            />
            <KpiCard
              label="Credit extended"
              value={`₹${(totalCreditUsed / 100000).toFixed(1)}L`}
              sub={`Of ₹${(totalCreditLimit / 100000).toFixed(1)}L limit`}
              icon={<Building2 size={18} />}
            />
            <KpiCard
              label="Near limit"
              value={nearLimitCount}
              sub="95% or more used"
              trend={nearLimitCount > 0 ? 'Review limits' : 'Healthy'}
              trendColor={nearLimitCount > 0 ? C.red : C.green}
              icon={<AlertTriangle size={18} />}
            />
            <KpiCard
              label="Renewals in 30 days"
              value="1"
              sub="ONGC · 31 Oct"
              trendColor={C.amber}
              icon={<Calendar size={18} />}
            />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
            {/* MOU List Left Column */}
            <div style={{ flex: '1 1 340px', maxWidth: 460, minWidth: 280, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {accounts.map((m) => {
                const isSelected = m.id === selectedAccount?.id;
                const limit = Number(m.credit_limit || 0);
                const used = Number(m.utilized_credit || 0);
                const util = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
                const barColor = util >= 95 ? C.red : util >= 80 ? C.amber : C.primary;

                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedAccountId(m.id)}
                    style={{
                      ...card,
                      padding: '16px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                      textAlign: 'left',
                      cursor: 'pointer',
                      border: `1px solid ${isSelected ? C.primary : C.border}`,
                      boxShadow: isSelected ? `0 0 0 1px ${C.primary}` : 'none',
                      background: '#FFFFFF'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{m.name}</span>
                      <span style={{ fontSize: 11, fontWeight: 500, color: m.is_active ? C.green : C.red, background: m.is_active ? C.greenSoft : C.redSoft, padding: '2px 8px', borderRadius: 999 }}>
                        {m.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.muted }}>
                        <span>Credit used</span>
                        <span style={{ ...mono, color: C.text }}>
                          ₹{(used / 100000).toFixed(1)}L / ₹{(limit / 100000).toFixed(1)}L
                        </span>
                      </div>
                      <div style={{ height: 6, borderRadius: 999, background: '#F3F4F6', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${util}%`, background: barColor }} />
                      </div>
                    </div>

                    <span style={{ fontSize: 12, color: C.muted }}>
                      Valid to 31 Dec 2026 · Cycle: {m.billing_cycle || 'MONTHLY'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selected MOU Commercial Terms Right Column */}
            {selectedAccount ? (
              <div style={{ flex: '2 1 520px', minWidth: 320, ...card, overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 600 }}>{selectedAccount.name}</div>
                    <div style={{ ...mono, fontSize: 12, color: C.muted }}>
                      Code: {selectedAccount.code} · Term: 01 Jan 2026 – 31 Dec 2026
                    </div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 500, color: selectedAccount.is_active ? C.green : C.red, background: selectedAccount.is_active ? C.greenSoft : C.redSoft, padding: '3px 10px', borderRadius: 999 }}>
                    {selectedAccount.is_active ? 'MOU In Effect' : 'Credit Suspended'}
                  </span>
                </div>

                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, paddingBottom: 4, borderBottom: '1px solid #F3F4F6' }}>
                    Commercial Terms
                  </span>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 16 }}>
                    <Field label="Credit Limit (₹)">
                      <input
                        type="text"
                        value={editLimit}
                        onChange={(e) => setEditLimit(e.target.value)}
                        style={{ ...inputStyle, ...mono }}
                      />
                    </Field>
                    <Field label="Discount on Tariff (%)">
                      <input
                        type="text"
                        value={editDiscount}
                        onChange={(e) => setEditDiscount(e.target.value)}
                        style={{ ...inputStyle, ...mono }}
                      />
                    </Field>
                    <div>
                      <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>Billing cycle</div>
                      <div style={{ fontSize: 14, fontWeight: 500, paddingTop: 8 }}>{selectedAccount.billing_cycle || 'MONTHLY'}</div>
                    </div>
                  </div>

                  {/* Warning banner */}
                  {Number(selectedAccount.credit_limit || 0) > 0 &&
                    Number(selectedAccount.utilized_credit || 0) / Number(selectedAccount.credit_limit) >= 0.95 && (
                      <div style={{ fontSize: 13, lineHeight: 1.5, padding: '10px 14px', borderRadius: 10, background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E' }}>
                        Credit utilization is at or above 95%. Counters will block new cashless admissions once the limit is breached.
                      </div>
                    )}

                  <span style={{ fontSize: 14, fontWeight: 600, paddingBottom: 4, borderBottom: '1px solid #F3F4F6' }}>
                    Covered Services
                  </span>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(selectedAccount.covered_services || ['OPD Consultation', 'IPD Bed Charges', 'Diagnostic Pathology', 'Radiology CT/MRI', 'Pharmacy Formulary']).map((c: string, idx: number) => (
                      <span key={idx} style={{ fontSize: 12, background: '#F3F4F6', color: C.textSub, borderRadius: 6, padding: '4px 10px' }}>
                        {c}
                      </span>
                    ))}
                  </div>

                  <span style={{ fontSize: 14, fontWeight: 600, paddingBottom: 4, borderBottom: '1px solid #F3F4F6' }}>
                    Authorised Signatories
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(selectedAccount.signatories || [
                      ['Dr. Ramesh Sharma', 'Chief Medical Officer'],
                      ['Sunita Rao', 'Head of People & Benefits']
                    ]).map((s: any, idx: number) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span style={{ fontWeight: 500 }}>{Array.isArray(s) ? s[0] : (s.name || 'Signatory')}</span>
                        <span style={{ color: C.muted }}>{Array.isArray(s) ? s[1] : (s.role || '')}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap', paddingTop: 12, borderTop: '1px solid #F3F4F6' }}>
                    <Btn
                      variant={selectedAccount.is_active ? 'danger' : 'secondary'}
                      onClick={handleToggleSuspend}
                    >
                      {selectedAccount.is_active ? 'Suspend Credit' : 'Reactivate'}
                    </Btn>
                    <Btn variant="secondary" onClick={() => setNotice('Renewed for 12 months')}>
                      Renew 12 Months
                    </Btn>
                    <Btn variant="primary" onClick={handleSaveTerms} disabled={isSavingTerms}>
                      {isSavingTerms ? 'Saving...' : 'Save Terms'}
                    </Btn>
                  </div>
                </div>
              </div>
            ) : (
              <Empty text="Select a corporate account to view terms." />
            )}
          </div>
        </>
      )}

      {/* Voucher Verification Drawer */}
      {voucherDrawerOpen && (
        <Drawer
          title="Corporate Credit Voucher Verification"
          subtitle="Validate employer credit authorization letters presented at the billing counter"
          width={560}
          onClose={() => setVoucherDrawerOpen(false)}
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Btn variant="secondary" onClick={() => setVoucherDrawerOpen(false)}>Close</Btn>
            </div>
          }
        >
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <Field label="Voucher Reference Code">
              <input
                type="text"
                value={voucherSearchCode}
                onChange={(e) => setVoucherSearchCode(e.target.value)}
                placeholder="e.g. CORP-VOUCH-INF-001"
                style={{ ...inputStyle, ...mono }}
              />
            </Field>
            <Btn variant="primary" onClick={handleVerifyVoucher} disabled={isVerifyingVoucher}>
              <Search size={15} /> Verify
            </Btn>
          </div>

          {voucherCheckResult && (
            <div style={{ ...card, padding: 18, marginTop: 14, background: voucherCheckResult.is_valid ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${voucherCheckResult.is_valid ? '#BBF7D0' : '#FECACA'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 600, color: voucherCheckResult.is_valid ? C.green : C.red }}>
                {voucherCheckResult.is_valid ? <CheckCircle2 size={20} /> : <ShieldAlert size={20} />}
                {voucherCheckResult.is_valid ? 'Voucher Valid for Billing' : 'Voucher Ineligible'}
              </div>

              <div style={{ fontSize: 13, color: voucherCheckResult.is_valid ? C.textSub : C.red, marginTop: 4 }}>
                {voucherCheckResult.reason || 'Verification successful.'}
              </div>

              {voucherCheckResult.voucher && (
                <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: C.muted }}>Employee:</span>
                    <span style={{ fontWeight: 500 }}>{voucherCheckResult.voucher.employee_name} ({voucherCheckResult.voucher.employee_id})</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: C.muted }}>Authorized Ceiling:</span>
                    <span style={{ ...mono, fontWeight: 600 }}>₹{Number(voucherCheckResult.voucher.approved_credit_ceiling || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: C.muted }}>Valid Until:</span>
                    <span style={mono}>{voucherCheckResult.voucher.validity_date}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: C.muted }}>Corporate Headroom:</span>
                    <span style={{ ...mono, fontWeight: 600, color: C.green }}>₹{Number(voucherCheckResult.available_credit_headroom || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 16, fontSize: 14, fontWeight: 600, paddingBottom: 6, borderBottom: `1px solid ${C.border}` }}>
            Recently Issued Vouchers
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {vouchers.length === 0 ? (
              <div style={{ fontSize: 13, color: C.muted }}>No recent vouchers on file.</div>
            ) : (
              vouchers.map((v) => (
                <div
                  key={v.id}
                  onClick={() => {
                    setVoucherSearchCode(v.voucher_number);
                  }}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: '#F9FAFB',
                    border: '1px solid #E5E7EB',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <div>
                    <div style={{ ...mono, fontSize: 13, fontWeight: 600 }}>{v.voucher_number}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>{v.employee_name} · {v.corporate_account_name}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ ...mono, fontSize: 13, fontWeight: 500 }}>₹{Number(v.approved_credit_ceiling).toLocaleString('en-IN')}</div>
                    <span style={{ fontSize: 11, color: v.is_verified ? C.green : C.amber, background: v.is_verified ? C.greenSoft : C.amberSoft, padding: '1px 6px', borderRadius: 999 }}>
                      {v.is_verified ? 'Verified' : 'Pending'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Drawer>
      )}

      {/* Add MOU Drawer */}
      {addMouOpen && (
        <Drawer
          title="Add Corporate MOU"
          subtitle="Establish credit agreement and billing terms for an employer"
          onClose={() => setAddMouOpen(false)}
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Btn variant="secondary" onClick={() => setAddMouOpen(false)}>Cancel</Btn>
              <Btn variant="primary" onClick={handleAddMou}>Add MOU</Btn>
            </div>
          }
        >
          <Field label="Employer / Company Name">
            <input
              type="text"
              value={newMouName}
              onChange={(e) => setNewMouName(e.target.value)}
              placeholder="e.g. Larsen & Toubro Infotech"
              style={inputStyle}
            />
          </Field>
          <Field label="Account Code">
            <input
              type="text"
              value={newMouCode}
              onChange={(e) => setNewMouCode(e.target.value)}
              placeholder="e.g. LTI"
              style={{ ...inputStyle, ...mono }}
            />
          </Field>
          <Field label="Credit Limit (₹)">
            <input
              type="number"
              value={newMouLimit}
              onChange={(e) => setNewMouLimit(e.target.value)}
              style={{ ...inputStyle, ...mono }}
            />
          </Field>
          <Field label="Tariff Discount (%)">
            <input
              type="number"
              value={newMouDiscount}
              onChange={(e) => setNewMouDiscount(e.target.value)}
              style={{ ...inputStyle, ...mono }}
            />
          </Field>
        </Drawer>
      )}
    </div>
  );
};
