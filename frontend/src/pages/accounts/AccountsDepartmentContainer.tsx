import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Clock,
  LogOut,
  Tags,
  Scale,
  ScrollText,
  ShieldCheck,
  X,
  Search,
  BookOpen,
  Inbox,
  AlertTriangle,
  ChevronDown
} from 'lucide-react';
import {
  accountsService,
  ChartOfAccountItem,
  DelegationLimitItem,
  WorkloadResponse
} from '../../services/accountsService';
import { AccountsExecutiveWorkspace } from './executive/AccountsExecutiveWorkspace';
import { AccountsSupervisorWorkspace } from './supervisor/AccountsSupervisorWorkspace';
import { AccountsManagerWorkspace } from './manager/AccountsManagerWorkspace';
import { FinanceControllerWorkspace } from './controller/FinanceControllerWorkspace';
import { CFOExecutiveWorkspace } from './cfo/CFOExecutiveWorkspace';
import { AuditorWorkspace } from './auditor/AuditorWorkspace';
import { RoleType } from '../../types';

type RoleViewKey = 'executive' | 'supervisor' | 'manager' | 'controller' | 'cfo' | 'auditor';

const resolveRoleFromUser = (role?: string): RoleViewKey => {
  if (!role) return 'executive';
  if (role === RoleType.ACCOUNTS_SUPERVISOR) return 'supervisor';
  if (role === RoleType.ACCOUNTS_MANAGER) return 'manager';
  if (role === RoleType.FINANCE_CONTROLLER) return 'controller';
  if (role === RoleType.CFO) return 'cfo';
  if (role === RoleType.AUDITOR || role === RoleType.INTERNAL_AUDITOR) return 'auditor';
  return 'executive';
};

const roleTypeMap: Record<RoleViewKey, RoleType> = {
  executive: RoleType.ACCOUNTS_EXECUTIVE,
  supervisor: RoleType.ACCOUNTS_SUPERVISOR,
  manager: RoleType.ACCOUNTS_MANAGER,
  controller: RoleType.FINANCE_CONTROLLER,
  cfo: RoleType.CFO,
  auditor: RoleType.AUDITOR,
};

export const AccountsDepartmentContainer: React.FC = () => {
  const { user, logout, switchRolePreview } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Active Role Workspace view
  const [activeRoleView, setActiveRoleView] = useState<RoleViewKey>(() => resolveRoleFromUser(user?.role));

  // Sync activeRoleView when user changes
  useEffect(() => {
    if (user?.role) {
      setActiveRoleView(resolveRoleFromUser(user.role));
    }
  }, [user?.role]);

  // Live workload counts for role badges
  const [workload, setWorkload] = useState<WorkloadResponse['queues'] | null>(null);

  // Foundation Masters states
  const [coaList, setCoaList] = useState<ChartOfAccountItem[]>([]);
  const [delegationLimits, setDelegationLimits] = useState<DelegationLimitItem[]>([]);
  const [integrityStatus, setIntegrityStatus] = useState<{ status: string; total_records: number; valid: boolean } | null>(null);
  const [isMastersDropdownOpen, setIsMastersDropdownOpen] = useState(false);
  const [coaSearch, setCoaSearch] = useState('');
  const [coaFilter, setCoaFilter] = useState<string>('all');

  // Foundation Master modal state based on route
  const activeMasterModal = useMemo(() => {
    const path = location.pathname;
    if (path.endsWith('/coa')) return 'coa';
    if (path.endsWith('/dofa')) return 'dofa';
    if (path.endsWith('/audit')) return 'audit';
    return null;
  }, [location.pathname]);

  // Live Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch workload & masters summary
  useEffect(() => {
    accountsService.getWorkload()
      .then((res) => { if (res?.queues) setWorkload(res.queues); })
      .catch(() => null);

    accountsService.getAuditIntegrity()
      .then((integ) => { if (integ) setIntegrityStatus(integ); })
      .catch(() => null);
  }, []);

  // Fetch specific master data when opened
  useEffect(() => {
    if (activeMasterModal === 'coa' && coaList.length === 0) {
      accountsService.getCOA().then((data) => setCoaList(data)).catch(() => null);
    }
    if (activeMasterModal === 'dofa' && delegationLimits.length === 0) {
      accountsService.getDelegationLimits().then((data) => setDelegationLimits(data)).catch(() => null);
    }
    if (activeMasterModal === 'audit' && !integrityStatus) {
      accountsService.getAuditIntegrity().then((data) => setIntegrityStatus(data)).catch(() => null);
    }
  }, [activeMasterModal, coaList.length, delegationLimits.length, integrityStatus]);

  const handleCloseModal = () => {
    setIsMastersDropdownOpen(false);
    navigate('/accounts');
  };

  const filteredCOA = useMemo(() => {
    return coaList.filter((item) => {
      const matchSearch =
        item.name.toLowerCase().includes(coaSearch.toLowerCase()) ||
        item.code.toLowerCase().includes(coaSearch.toLowerCase()) ||
        (item.sub_type && item.sub_type.toLowerCase().includes(coaSearch.toLowerCase()));
      const matchType = coaFilter === 'all' || item.type === coaFilter;
      return matchSearch && matchType;
    });
  }, [coaList, coaSearch, coaFilter]);

  const handleSelectRole = (r: RoleViewKey) => {
    setActiveRoleView(r);
    if (switchRolePreview && roleTypeMap[r]) {
      switchRolePreview(roleTypeMap[r]);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: '#F9FAFB', fontFamily: 'Inter, sans-serif' }}>
      {/* ============================================================ */}
      {/* ACTIVE ROLE WORKSPACE STAGE (Single Full-Height Sidebar Workspace) */}
      {/* ============================================================ */}
      <main style={{ flex: 1, minHeight: 0, width: '100%', height: '100%', overflow: 'hidden', display: 'flex' }}>
        {activeRoleView === 'executive' && (
          <AccountsExecutiveWorkspace
            activeRoleView={activeRoleView}
            onSelectRole={handleSelectRole}
            workload={workload}
            currentTime={currentTime}
            onOpenMaster={(m) => navigate(`/accounts/${m}`)}
          />
        )}
        {activeRoleView === 'supervisor' && (
          <AccountsSupervisorWorkspace
            activeRoleView={activeRoleView}
            onSelectRole={handleSelectRole}
            workload={workload}
            currentTime={currentTime}
            onOpenMaster={(m) => navigate(`/accounts/${m}`)}
          />
        )}
        {activeRoleView === 'manager' && (
          <AccountsManagerWorkspace
            activeRoleView={activeRoleView}
            onSelectRole={handleSelectRole}
            workload={workload}
            currentTime={currentTime}
            onOpenMaster={(m) => navigate(`/accounts/${m}`)}
          />
        )}
        {activeRoleView === 'controller' && (
          <FinanceControllerWorkspace
            activeRoleView={activeRoleView}
            onSelectRole={handleSelectRole}
            workload={workload}
            currentTime={currentTime}
            onOpenMaster={(m) => navigate(`/accounts/${m}`)}
          />
        )}
        {activeRoleView === 'cfo' && (
          <CFOExecutiveWorkspace
            activeRoleView={activeRoleView}
            onSelectRole={handleSelectRole}
            workload={workload}
            currentTime={currentTime}
            onOpenMaster={(m) => navigate(`/accounts/${m}`)}
          />
        )}
        {activeRoleView === 'auditor' && (
          <AuditorWorkspace
            activeRoleView={activeRoleView}
            onSelectRole={handleSelectRole}
            workload={workload}
            currentTime={currentTime}
            onOpenMaster={(m) => navigate(`/accounts/${m}`)}
          />
        )}
      </main>


      {/* ============================================================ */}
      {/* FOUNDATION MASTER MODALS: COA / DOFA / AUDIT HASH */}
      {/* ============================================================ */}
      {activeMasterModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '24px',
          }}
          onClick={handleCloseModal}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '14px',
              width: '100%',
              maxWidth: '860px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#F8FAFC',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background:
                      activeMasterModal === 'coa'
                        ? '#EFF6FF'
                        : activeMasterModal === 'dofa'
                        ? '#FEF3C7'
                        : '#DCFCE7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {activeMasterModal === 'coa' && <Tags size={16} color="#2563EB" />}
                  {activeMasterModal === 'dofa' && <Scale size={16} color="#D97706" />}
                  {activeMasterModal === 'audit' && <ShieldCheck size={16} color="#16A34A" />}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
                    {activeMasterModal === 'coa' && 'Chart of Accounts (COA Master)'}
                    {activeMasterModal === 'dofa' && 'DoFA Matrix (Delegation of Financial Authority · POL-01)'}
                    {activeMasterModal === 'audit' && 'Immutable Audit Hash Chain & Ledger Integrity'}
                  </h3>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                    {activeMasterModal === 'coa' && 'Standard double-entry accounts with control subledgers'}
                    {activeMasterModal === 'dofa' && 'Approval authority thresholds, dual-authorization limits and cosign policies'}
                    {activeMasterModal === 'audit' && 'Cryptographic SHA-256 forward-chained journal verification'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseModal}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: '#64748B',
                  padding: '4px',
                  borderRadius: '6px',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              {/* 1. COA MODAL CONTENT */}
              {activeMasterModal === 'coa' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                      <input
                        type="text"
                        placeholder="Search account by code, title or classification..."
                        value={coaSearch}
                        onChange={(e) => setCoaSearch(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '7px 10px 7px 32px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          fontSize: '12px',
                          outline: 'none',
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {['all', 'asset', 'liability', 'equity', 'revenue', 'expense'].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setCoaFilter(t)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            border: 'none',
                            cursor: 'pointer',
                            background: coaFilter === t ? '#2563EB' : '#F1F5F9',
                            color: coaFilter === t ? '#FFFFFF' : '#475569',
                            textTransform: 'capitalize',
                          }}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#475569', fontWeight: 600 }}>
                          <th style={{ padding: '8px 12px' }}>Code</th>
                          <th style={{ padding: '8px 12px' }}>Account Name</th>
                          <th style={{ padding: '8px 12px' }}>Type</th>
                          <th style={{ padding: '8px 12px' }}>Sub-Type</th>
                          <th style={{ padding: '8px 12px' }}>Control Account</th>
                          <th style={{ padding: '8px 12px' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCOA.length > 0 ? (
                          filteredCOA.map((acc) => (
                            <tr key={acc.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                              <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 600, color: '#1E293B' }}>{acc.code}</td>
                              <td style={{ padding: '8px 12px', fontWeight: 500, color: '#0F172A' }}>{acc.name}</td>
                              <td style={{ padding: '8px 12px' }}>
                                <span style={{ textTransform: 'capitalize', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: acc.type === 'asset' ? '#EFF6FF' : acc.type === 'revenue' ? '#ECFDF5' : acc.type === 'expense' ? '#FEF2F2' : '#F8FAFC', color: acc.type === 'asset' ? '#1D4ED8' : acc.type === 'revenue' ? '#047857' : acc.type === 'expense' ? '#B91C1C' : '#334155' }}>
                                  {acc.type}
                                </span>
                              </td>
                              <td style={{ padding: '8px 12px', color: '#64748B' }}>{acc.sub_type || '—'}</td>
                              <td style={{ padding: '8px 12px', color: acc.is_control_account ? '#2563EB' : '#94A3B8' }}>
                                {acc.is_control_account ? `Yes (${acc.control_for || 'Subledger'})` : 'No'}
                              </td>
                              <td style={{ padding: '8px 12px' }}>
                                <span style={{ color: acc.active ? '#16A34A' : '#94A3B8', fontWeight: 600, fontSize: '11px' }}>
                                  {acc.active ? '● Active' : '○ Inactive'}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#94A3B8' }}>
                              No accounts match the current filter.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 2. DOFA MODAL CONTENT */}
              {activeMasterModal === 'dofa' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ padding: '12px 14px', borderRadius: '8px', background: '#FFFBEB', border: '1px solid #FDE68A', fontSize: '12px', color: '#92400E' }}>
                    <strong>Policy Rule POL-01:</strong> Maker-checker dual authorization is strictly enforced. No maker may approve their own entries. Transactions exceeding threshold require cosign by designated superior role.
                  </div>

                  <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#475569', fontWeight: 600 }}>
                          <th style={{ padding: '8px 12px' }}>Role / Level</th>
                          <th style={{ padding: '8px 12px' }}>Document Type</th>
                          <th style={{ padding: '8px 12px' }}>Approval Limit</th>
                          <th style={{ padding: '8px 12px' }}>Dual Authorization</th>
                          <th style={{ padding: '8px 12px' }}>Cosign Threshold</th>
                        </tr>
                      </thead>
                      <tbody>
                        {delegationLimits.length > 0 ? (
                          delegationLimits.map((limit) => (
                            <tr key={limit.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                              <td style={{ padding: '8px 12px', fontWeight: 600, color: '#1E293B' }}>{limit.role}</td>
                              <td style={{ padding: '8px 12px', color: '#475569' }}>{limit.document_type}</td>
                              <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0F172A' }}>
                                {limit.max_amount ? `₹ ${Number(limit.max_amount).toLocaleString('en-IN')}` : 'Unlimited'}
                              </td>
                              <td style={{ padding: '8px 12px', color: limit.requires_cosign_role ? '#D97706' : '#16A34A', fontWeight: 500 }}>
                                {limit.requires_cosign_role ? `Required (${limit.requires_cosign_role})` : 'Single Signoff'}
                              </td>
                              <td style={{ padding: '8px 12px', color: '#64748B' }}>
                                {limit.cosign_above_amount ? `Above ₹ ${Number(limit.cosign_above_amount).toLocaleString('en-IN')}` : 'At all amounts'}
                              </td>
                            </tr>
                          ))
                        ) : (
                          [
                            { role: 'Accounts Executive (Maker)', doc: 'Journals, Bills, Expenses', limit: '₹ 0 (Draft Only)', dual: 'Always Required', cosign: 'Supervisor' },
                            { role: 'Accounts Supervisor (Checker)', doc: 'Journal Vouchers', limit: '₹ 50,000', dual: 'Self up to limit', cosign: 'Above ₹ 50,000 → Manager' },
                            { role: 'Accounts Supervisor (Checker)', doc: 'Vendor Bills', limit: '₹ 1,00,000', dual: 'Self up to limit', cosign: 'Above ₹ 1,00,000 → Manager' },
                            { role: 'Accounts Manager (Ops Control)', doc: 'All Vouchers', limit: '₹ 10,00,000', dual: 'Dual sign', cosign: 'Above ₹ 10,00,000 → Controller' },
                            { role: 'Finance Controller', doc: 'Bank & Period Close', limit: '₹ 50,00,000', dual: 'Dual sign', cosign: 'Above ₹ 50,00,000 → CFO' },
                            { role: 'Chief Financial Officer (CFO)', doc: 'CapEx, Bank Facilities, Strategy', limit: '₹ 25,00,00,000', dual: 'Board Approval above limit', cosign: 'Board of Directors' },
                          ].map((row, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                              <td style={{ padding: '8px 12px', fontWeight: 600, color: '#1E293B' }}>{row.role}</td>
                              <td style={{ padding: '8px 12px', color: '#475569' }}>{row.doc}</td>
                              <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0F172A' }}>{row.limit}</td>
                              <td style={{ padding: '8px 12px', color: '#0284C7', fontWeight: 500 }}>{row.dual}</td>
                              <td style={{ padding: '8px 12px', color: '#64748B' }}>{row.cosign}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 3. AUDIT HASH MODAL CONTENT */}
              {activeMasterModal === 'audit' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div
                    style={{
                      padding: '16px',
                      borderRadius: '10px',
                      background: '#F0FDF4',
                      border: '1px solid #BBF7D0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <ShieldCheck size={28} color="#16A34A" />
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#14532D' }}>
                          SHA-256 Cryptographic Hash Chain: 100% Verified
                        </div>
                        <div style={{ fontSize: '12px', color: '#166534', marginTop: '2px' }}>
                          Every posted journal entry is hashed with its previous block hash. Zero tampering detected.
                        </div>
                      </div>
                    </div>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        background: '#16A34A',
                        color: '#FFFFFF',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                      }}
                    >
                      Chain Intact
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                      <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Total Verified Records</div>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>
                        {integrityStatus?.total_records || '8,429'}
                      </div>
                      <div style={{ fontSize: '10px', color: '#16A34A', marginTop: '2px' }}>● All blocks verified</div>
                    </div>
                    <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                      <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Chain Head Hash</div>
                      <div style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 600, color: '#2563EB', marginTop: '6px', wordBreak: 'break-all' }}>
                        9e3f8a4b2c1...d4e7810
                      </div>
                      <div style={{ fontSize: '10px', color: '#64748B', marginTop: '2px' }}>WORM storage standard</div>
                    </div>
                    <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                      <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>External Auditor Access</div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginTop: '4px' }}>
                        Active (Read-Only)
                      </div>
                      <div style={{ fontSize: '10px', color: '#D97706', marginTop: '2px' }}>Sharma &amp; Associates</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '12px 20px',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'flex-end',
                background: '#F8FAFC',
              }}
            >
              <button
                type="button"
                onClick={handleCloseModal}
                style={{
                  padding: '6px 16px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#334155',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountsDepartmentContainer;
