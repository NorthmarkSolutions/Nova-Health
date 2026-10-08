import React, { useEffect, useState, useCallback } from 'react';
import {
  Monitor, Lock, Unlock, Plus, RefreshCw, Printer, CreditCard,
  CheckCircle2, XCircle, Edit, MapPin, DollarSign, UserCheck
} from 'lucide-react';
import { billingService, AdminCounterItem } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { Btn, C, Callout, Empty, Field, PageHeader, card, mono, inputStyle, apiError } from '../executive/executiveUi';

const LOCATIONS = [
  { value: 'OPD_LOBBY', label: 'Main OPD Lobby' },
  { value: 'IPD_BILLING', label: 'IPD Discharge Desk' },
  { value: 'EMERGENCY', label: 'Emergency Admissions' },
  { value: 'PHARMACY_DESK', label: 'Pharmacy Cash Desk' },
  { value: 'LAB_COLLECTION', label: 'Laboratory Collection Desk' },
  { value: 'DAY_CARE', label: 'Day Care Billing' },
];

export const CountersDirectoryScreen: React.FC = () => {
  const { format: fmt } = useCurrency();
  const [counters, setCounters] = useState<AdminCounterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCounter, setEditingCounter] = useState<AdminCounterItem | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('OPD_LOBBY');
  const [isActive, setIsActive] = useState(true);
  const [ipAddress, setIpAddress] = useState('');
  const [macAddress, setMacAddress] = useState('');
  const [printerName, setPrinterName] = useState('');
  const [posTid, setPosTid] = useState('');
  const [upiVpa, setUpiVpa] = useState('');
  const [terminalLock, setTerminalLock] = useState(false);

  const loadCounters = useCallback(async () => {
    try {
      setError(null);
      const res = await billingService.getAdminCounters();
      setCounters(res);
    } catch (err) {
      setError(apiError(err, 'Failed to load billing counters.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCounters();
  }, [loadCounters]);

  const openCreateModal = () => {
    setEditingCounter(null);
    setCode(`COUNTER-0${counters.length + 1}`);
    setName(`Counter 0${counters.length + 1} Station`);
    setLocation('OPD_LOBBY');
    setIsActive(true);
    setIpAddress('192.168.1.10' + (counters.length + 1));
    setMacAddress('');
    setPrinterName('EPSON-TM-T82III');
    setPosTid('HDFC-POS-' + (88000 + counters.length));
    setUpiVpa('northhospital@hdfcbank');
    setTerminalLock(true);
    setModalOpen(true);
  };

  const openEditModal = (c: AdminCounterItem) => {
    setEditingCounter(c);
    setCode(c.code);
    setName(c.name);
    setLocation(c.station_location || 'OPD_LOBBY');
    setIsActive(c.is_active);
    setIpAddress(c.hardware?.ip_address || c.ip_terminal_binding || '');
    setMacAddress(c.hardware?.mac_address || '');
    setPrinterName(c.hardware?.thermal_printer_name || '');
    setPosTid(c.hardware?.pos_terminal_tid || '');
    setUpiVpa(c.hardware?.upi_vpa || '');
    setTerminalLock(c.hardware?.is_terminal_lock_enabled || false);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: Partial<AdminCounterItem> = {
        code,
        name,
        station_location: location,
        is_active: isActive,
        ip_terminal_binding: ipAddress,
        hardware: {
          ip_address: ipAddress,
          mac_address: macAddress,
          thermal_printer_name: printerName,
          pos_terminal_tid: posTid,
          upi_vpa: upiVpa,
          is_terminal_lock_enabled: terminalLock,
          status: 'ONLINE'
        }
      };

      if (editingCounter) {
        await billingService.updateAdminCounter(editingCounter.id, payload);
      } else {
        await billingService.createAdminCounter(payload);
      }
      setModalOpen(false);
      loadCounters();
    } catch (err) {
      setError(apiError(err, 'Failed to save billing counter station.'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (c: AdminCounterItem) => {
    try {
      await billingService.updateAdminCounter(c.id, { is_active: !c.is_active });
      loadCounters();
    } catch (err) {
      setError(apiError(err, 'Could not toggle counter state.'));
    }
  };

  return (
    <div style={{ paddingBottom: 40 }}>
      <PageHeader
        title="Billing Counters & Hardware Directory"
        subtitle="Manage physical cash collection stations, hardware MAC/IP bindings and terminal security lockdown"
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="secondary" onClick={loadCounters}>
              <RefreshCw size={14} style={{ marginRight: 6 }} /> Refresh
            </Btn>
            <Btn variant="primary" onClick={openCreateModal}>
              <Plus size={14} style={{ marginRight: 6 }} /> Add Counter
            </Btn>
          </div>
        }
      />

      {error && <Callout tone="red">{error}</Callout>}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <RefreshCw size={24} className="animate-spin" color={C.primary} />
        </div>
      ) : counters.length === 0 ? (
        <Empty text="No billing counters registered yet." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
          {counters.map((c) => (
            <div
              key={c.id}
              style={{
                ...card,
                padding: 18,
                border: c.is_active ? `1px solid ${C.border}` : `1px dashed ${C.border}`,
                opacity: c.is_active ? 1 : 0.75,
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
                      <span style={{ fontSize: 15, fontWeight: 700, color: C.text, ...mono }}>{c.code}</span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 999,
                          background: c.shift_status === 'OPEN' ? C.greenSoft : '#F3F4F6',
                          color: c.shift_status === 'OPEN' ? C.green : C.muted
                        }}
                      >
                        {c.shift_status === 'OPEN' ? 'SHIFT OPEN' : 'CLOSED'}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: C.textSub, marginTop: 2 }}>{c.name}</div>
                  </div>
                  <button
                    onClick={() => openEditModal(c)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: C.muted,
                      cursor: 'pointer',
                      padding: 4,
                      borderRadius: 4
                    }}
                    title="Edit station configuration"
                  >
                    <Edit size={16} />
                  </button>
                </div>

                {/* Location & Cashier info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.textSub }}>
                    <MapPin size={13} color={C.muted} />
                    <span>{c.station_location_display || c.station_location}</span>
                  </div>

                  {c.shift_status === 'OPEN' ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: C.greenSoft, borderRadius: 6, fontSize: 12 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.green, fontWeight: 600 }}>
                        <UserCheck size={13} /> {c.active_cashier || 'Cashier on duty'}
                      </span>
                      <span style={{ fontWeight: 700, color: C.green, ...mono }}>
                        {fmt(c.drawer_cash)} in drawer
                      </span>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: C.muted, padding: '4px 0' }}>
                      Drawer idle · Shift closed
                    </div>
                  )}
                </div>

                {/* Hardware Bindings Panel */}
                <div style={{ padding: 10, background: C.bg, borderRadius: 8, fontSize: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Monitor size={12} /> IP Binding:
                    </span>
                    <span style={{ fontWeight: 600, color: C.text, ...mono }}>
                      {c.hardware?.ip_address || c.ip_terminal_binding || 'Unbound'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Printer size={12} /> Thermal Printer:
                    </span>
                    <span style={{ color: C.textSub }}>{c.hardware?.thermal_printer_name || 'Standard'}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CreditCard size={12} /> POS Terminal TID:
                    </span>
                    <span style={{ color: C.textSub, ...mono }}>{c.hardware?.pos_terminal_tid || 'None'}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4, borderTop: `1px solid ${C.border}` }}>
                    <span style={{ color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {c.hardware?.is_terminal_lock_enabled ? (
                        <Lock size={12} color={C.indigo} />
                      ) : (
                        <Unlock size={12} color={C.muted} />
                      )}
                      Terminal Lock:
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: c.hardware?.is_terminal_lock_enabled ? C.indigo : C.muted
                      }}
                    >
                      {c.hardware?.is_terminal_lock_enabled ? 'STRICT LOCK' : 'OPEN'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 12, color: c.is_active ? C.green : C.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {c.is_active ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                  {c.is_active ? 'Active Station' : 'Deactivated'}
                </span>
                <Btn
                  variant={c.is_active ? 'secondary' : 'primary'}
                  style={{ height: 32, fontSize: 13, padding: '0 10px' }}
                  onClick={() => handleToggleActive(c)}
                >
                  {c.is_active ? 'Deactivate' : 'Activate'}
                </Btn>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Add / Edit Counter */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16
          }}
        >
          <div style={{ ...card, width: '100%', maxWidth: 520, padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: C.text }}>
              {editingCounter ? `Configure Station ${editingCounter.code}` : 'Register Physical Billing Counter'}
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: C.muted }}>
              Bind workstation IP, MAC, receipt printers and set terminal lockdown policy.
            </p>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Counter Code">
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    style={{ ...inputStyle, ...mono }}
                    required
                  />
                </Field>
                <Field label="Location">
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    style={inputStyle}
                  >
                    {LOCATIONS.map((loc) => (
                      <option key={loc.value} value={loc.value}>{loc.label}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Display Name">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={inputStyle}
                  required
                />
              </Field>

              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                <h4 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: C.textSub }}>
                  Hardware & Terminal Bindings
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="Registered IP Address">
                    <input
                      type="text"
                      placeholder="e.g. 192.168.1.101"
                      value={ipAddress}
                      onChange={(e) => setIpAddress(e.target.value)}
                      style={{ ...inputStyle, ...mono }}
                    />
                  </Field>
                  <Field label="Station MAC Address">
                    <input
                      type="text"
                      placeholder="e.g. 00:1B:44:11:3A:B7"
                      value={macAddress}
                      onChange={(e) => setMacAddress(e.target.value)}
                      style={{ ...inputStyle, ...mono }}
                    />
                  </Field>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Thermal Printer">
                  <input
                    type="text"
                    placeholder="e.g. EPSON-TM-T82III"
                    value={printerName}
                    onChange={(e) => setPrinterName(e.target.value)}
                    style={inputStyle}
                  />
                </Field>
                <Field label="POS Terminal TID">
                  <input
                    type="text"
                    placeholder="e.g. HDFC-POS-88219"
                    value={posTid}
                    onChange={(e) => setPosTid(e.target.value)}
                    style={{ ...inputStyle, ...mono }}
                  />
                </Field>
              </div>

              <Field label="UPI Merchant VPA">
                <input
                  type="text"
                  placeholder="e.g. northhospital@hdfcbank"
                  value={upiVpa}
                  onChange={(e) => setUpiVpa(e.target.value)}
                  style={inputStyle}
                />
              </Field>

              <div style={{ padding: 12, background: C.bg, borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={terminalLock}
                    onChange={(e) => setTerminalLock(e.target.checked)}
                  />
                  <span>Enforce Strict Hardware Terminal Lockdown</span>
                </label>
                <p style={{ margin: 0, fontSize: 11, color: C.muted }}>
                  If enabled, cashiers can only open shifts from the registered IP address. Mismatched IPs will be rejected with a security audit breach.
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                <Btn variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>
                  Cancel
                </Btn>
                <Btn variant="primary" type="submit" disabled={saving}>
                  {saving ? 'Saving...' : editingCounter ? 'Save Changes' : 'Create Station'}
                </Btn>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
