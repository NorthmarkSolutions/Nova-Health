import React, { useState } from 'react';
import {
  Coins,
  Receipt,
  Package,
  ShieldCheck,
  CreditCard,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Percent,
} from 'lucide-react';

export const FinancialSetup: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<
    'billingHeads' | 'taxes' | 'packages' | 'insurancePlans' | 'paymentMethods'
  >('billingHeads');

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<string>('');
  const [formData, setFormData] = useState<any>({});

  // Billing Heads State
  const [billingHeads, setBillingHeads] = useState([
    { id: '1', code: 'BH-CONS', name: 'Doctor OPD Consultation', dept: 'Clinical OPD', tax: '0% (Exempt)', defaultCharge: '$75.00', status: 'ACTIVE' },
    { id: '2', code: 'BH-BED-ICU', name: 'ICU Critical Care Bed Tariff', dept: 'Inpatient IPD', tax: '0% (Exempt)', defaultCharge: '$1,200.00/day', status: 'ACTIVE' },
    { id: '3', code: 'BH-NURS', name: 'Daily Inpatient Nursing Care', dept: 'Nursing Desk', tax: '0% (Exempt)', defaultCharge: '$120.00/day', status: 'ACTIVE' },
    { id: '4', code: 'BH-LAB', name: 'Pathology & Diagnostic Investigation', dept: 'Pathology Lab', tax: '0% (Exempt)', defaultCharge: 'Itemized', status: 'ACTIVE' },
    { id: '5', code: 'BH-PHARM', name: 'Pharmacy Medication & Consumables', dept: 'Central Pharmacy', tax: '5% - 12% GST', defaultCharge: 'Itemized (MRP)', status: 'ACTIVE' },
    { id: '6', code: 'BH-OT', name: 'Operation Theatre & Anesthesia Charges', dept: 'Surgery & OT', tax: '0% (Exempt)', defaultCharge: '$650.00/hr', status: 'ACTIVE' },
  ]);

  // Taxes State
  const [taxes, setTaxes] = useState([
    { id: '1', name: 'Healthcare Services Tax (Exempt)', rate: '0.0%', cgst: '0%', sgst: '0%', appliesTo: 'Doctor Visits, Inpatient Beds, Surgeries', status: 'ACTIVE' },
    { id: '2', name: 'Essential Life-Saving Drugs', rate: '5.0%', cgst: '2.5%', sgst: '2.5%', appliesTo: 'Prescription Pharma, Vaccines, Insulin', status: 'ACTIVE' },
    { id: '3', name: 'Diagnostic Reagents & Medical Devices', rate: '12.0%', cgst: '6.0%', sgst: '6.0%', appliesTo: 'Lab Kits, Orthopedic Implants, Syringes', status: 'ACTIVE' },
    { id: '4', name: 'Luxury Inpatient Room Surcharge', rate: '18.0%', cgst: '9.0%', sgst: '9.0%', appliesTo: 'Deluxe Suites & VIP Amenities (> $500/day)', status: 'ACTIVE' },
  ]);

  // Packages State
  const [packages, setPackages] = useState([
    {
      id: '1',
      code: 'PKG-EXEC-01',
      name: 'Executive Whole Body Wellness Screening',
      items: 'CBC, Lipid, LFT, KFT, HbA1c, ECG, Chest X-Ray, Phys. Consult',
      originalPrice: '$420.00',
      pkgPrice: '$249.00',
      discount: '40% OFF',
      status: 'ACTIVE',
    },
    {
      id: '2',
      code: 'PKG-CARD-02',
      name: 'Comprehensive Cardiac Health Package',
      items: 'Echo 2D, TMT Treadmill, Lipid Profile, Troponin, Cardio Consult',
      originalPrice: '$550.00',
      pkgPrice: '$349.00',
      discount: '36% OFF',
      status: 'ACTIVE',
    },
    {
      id: '3',
      code: 'PKG-MATERN-03',
      name: 'Standard Normal Delivery Maternity Bundle',
      items: '3-Day Ward, Normal Delivery OT, Neonatal Care, Routine Labs',
      originalPrice: '$3,200.00',
      pkgPrice: '$2,200.00',
      discount: '31% OFF',
      status: 'ACTIVE',
    },
  ]);

  // Insurance Plans State
  const [insurancePlans, setInsurancePlans] = useState([
    { id: '1', code: 'INS-STAR', name: 'Star Health & Allied Insurance', tpa: 'Direct Empanelment', preAuthLimit: '$15,000', cashless: 'YES', contact: '1800-425-2255' },
    { id: '2', code: 'INS-HDFC', name: 'HDFC ERGO General Health', tpa: 'Medi Assist TPA', preAuthLimit: '$20,000', cashless: 'YES', contact: '1800-2666' },
    { id: '3', code: 'INS-ICICI', name: 'ICICI Lombard Health Care', tpa: 'Paramount TPA', preAuthLimit: '$18,000', cashless: 'YES', contact: '1800-266-7780' },
    { id: '4', code: 'INS-CGHS', name: 'Central Govt Health Scheme (CGHS)', tpa: 'Govt Portal Desk', preAuthLimit: '$50,000', cashless: 'YES', contact: '011-2306-1234' },
  ]);

  // Payment Methods State
  const [paymentMethods, setPaymentMethods] = useState([
    { id: '1', name: 'Cash Counter Payment', channel: 'Offline Cash Desk', feePercent: '0.0%', status: 'ACTIVE' },
    { id: '2', name: 'Instant UPI / Dynamic QR Code', channel: 'NPCI / Razorpay / PhonePe', feePercent: '0.0%', status: 'ACTIVE' },
    { id: '3', name: 'Credit / Debit Card (POS Machine)', channel: 'Visa / MasterCard / Amex POS', feePercent: '1.2%', status: 'ACTIVE' },
    { id: '4', name: 'Net Banking & Wire Transfer', channel: 'RTGS / NEFT / IMPS', feePercent: '0.0%', status: 'ACTIVE' },
    { id: '5', name: 'Insurance & TPA Cashless Credit', channel: 'Corporate Pre-Auth Desk', feePercent: '0.0%', status: 'ACTIVE' },
  ]);

  const handleOpenAddModal = (type: string) => {
    setModalType(type);
    setFormData({});
    setIsModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    const id = Date.now().toString();
    if (modalType === 'billingHead') {
      setBillingHeads([...billingHeads, { ...formData, id, status: 'ACTIVE' }]);
    } else if (modalType === 'tax') {
      setTaxes([...taxes, { ...formData, id, status: 'ACTIVE' }]);
    } else if (modalType === 'package') {
      setPackages([...packages, { ...formData, id, status: 'ACTIVE' }]);
    } else if (modalType === 'insurance') {
      setInsurancePlans([...insurancePlans, { ...formData, id, cashless: 'YES' }]);
    } else if (modalType === 'payment') {
      setPaymentMethods([...paymentMethods, { ...formData, id, status: 'ACTIVE' }]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (type: string, id: string) => {
    if (type === 'billingHead') setBillingHeads(billingHeads.filter(b => b.id !== id));
    if (type === 'tax') setTaxes(taxes.filter(t => t.id !== id));
    if (type === 'package') setPackages(packages.filter(p => p.id !== id));
    if (type === 'insurance') setInsurancePlans(insurancePlans.filter(i => i.id !== id));
    if (type === 'payment') setPaymentMethods(paymentMethods.filter(p => p.id !== id));
  };

  return (
    <div>
      {/* Subtabs Pill Bar */}
      <div className="subtab-bar" style={{ marginBottom: '1.5rem' }}>
        <button
          className={`subtab-pill ${activeSubTab === 'billingHeads' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('billingHeads')}
        >
          <Coins size={16} /> Billing Heads ({billingHeads.length})
        </button>
        <button
          className={`subtab-pill ${activeSubTab === 'taxes' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('taxes')}
        >
          <Percent size={16} /> Taxes & GST ({taxes.length})
        </button>
        <button
          className={`subtab-pill ${activeSubTab === 'packages' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('packages')}
        >
          <Package size={16} /> Health Packages ({packages.length})
        </button>
        <button
          className={`subtab-pill ${activeSubTab === 'insurancePlans' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('insurancePlans')}
        >
          <ShieldCheck size={16} /> Insurance & TPA ({insurancePlans.length})
        </button>
        <button
          className={`subtab-pill ${activeSubTab === 'paymentMethods' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('paymentMethods')}
        >
          <CreditCard size={16} /> Payment Methods ({paymentMethods.length})
        </button>
      </div>

      {/* 1. Billing Heads */}
      {activeSubTab === 'billingHeads' && (
        <div>
          <div className="filter-bar">
            <div className="search-input-box">
              <Search size={16} color="var(--text-muted)" />
              <input
                placeholder="Search billing heads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" onClick={() => handleOpenAddModal('billingHead')}>
              <Plus size={16} /> + Add Billing Head
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Billing Head Name</th>
                  <th>Department / Revenue Center</th>
                  <th>Default Tax %</th>
                  <th>Base Default Charge</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {billingHeads
                  .filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((head) => (
                    <tr key={head.id}>
                      <td><strong>{head.code}</strong></td>
                      <td><strong>{head.name}</strong></td>
                      <td>{head.dept}</td>
                      <td><span className="badge badge-secondary">{head.tax}</span></td>
                      <td><span style={{ fontWeight: 700, color: 'var(--teal)' }}>{head.defaultCharge}</span></td>
                      <td><span className="badge badge-success">{head.status}</span></td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.375rem' }}>
                          <button className="action-btn edit" title="Edit"><Edit2 size={14} /></button>
                          <button className="action-btn delete" onClick={() => handleDelete('billingHead', head.id)} title="Delete"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Taxes */}
      {activeSubTab === 'taxes' && (
        <div>
          <div className="filter-bar">
            <div className="search-input-box">
              <Search size={16} color="var(--text-muted)" />
              <input
                placeholder="Search tax rules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" onClick={() => handleOpenAddModal('tax')}>
              <Plus size={16} /> + Add Tax Rate
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Tax Slab Name</th>
                  <th>Total Rate</th>
                  <th>CGST</th>
                  <th>SGST</th>
                  <th>Applies To Scope</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {taxes
                  .filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((tax) => (
                    <tr key={tax.id}>
                      <td><strong>{tax.name}</strong></td>
                      <td><span className="badge badge-info" style={{ fontSize: '0.875rem' }}>{tax.rate}</span></td>
                      <td>{tax.cgst}</td>
                      <td>{tax.sgst}</td>
                      <td><span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{tax.appliesTo}</span></td>
                      <td><span className="badge badge-success">{tax.status}</span></td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.375rem' }}>
                          <button className="action-btn edit" title="Edit"><Edit2 size={14} /></button>
                          <button className="action-btn delete" onClick={() => handleDelete('tax', tax.id)} title="Delete"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Packages */}
      {activeSubTab === 'packages' && (
        <div>
          <div className="filter-bar">
            <div className="search-input-box">
              <Search size={16} color="var(--text-muted)" />
              <input
                placeholder="Search health packages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" onClick={() => handleOpenAddModal('package')}>
              <Plus size={16} /> + Create Health Package
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Package Code</th>
                  <th>Package Title</th>
                  <th>Bundled Clinical Items</th>
                  <th>Original MRP</th>
                  <th>Package Price</th>
                  <th>Discount Benefit</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {packages
                  .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((pkg) => (
                    <tr key={pkg.id}>
                      <td><code>{pkg.code}</code></td>
                      <td><strong>{pkg.name}</strong></td>
                      <td><span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{pkg.items}</span></td>
                      <td><del style={{ color: 'var(--text-light)' }}>{pkg.originalPrice}</del></td>
                      <td><span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1rem' }}>{pkg.pkgPrice}</span></td>
                      <td><span className="badge badge-success">{pkg.discount}</span></td>
                      <td><span className="badge badge-success">{pkg.status}</span></td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.375rem' }}>
                          <button className="action-btn edit" title="Edit"><Edit2 size={14} /></button>
                          <button className="action-btn delete" onClick={() => handleDelete('package', pkg.id)} title="Delete"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Insurance Plans */}
      {activeSubTab === 'insurancePlans' && (
        <div>
          <div className="filter-bar">
            <div className="search-input-box">
              <Search size={16} color="var(--text-muted)" />
              <input
                placeholder="Search insurance / TPA..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" onClick={() => handleOpenAddModal('insurance')}>
              <Plus size={16} /> + Empanel Insurance / TPA
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Insurance Company / Scheme</th>
                  <th>Assigned TPA Provider</th>
                  <th>Max Pre-Auth Auto Limit</th>
                  <th>Cashless Facility</th>
                  <th>Direct Desk Helpline</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {insurancePlans
                  .filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((ins) => (
                    <tr key={ins.id}>
                      <td><strong>{ins.code}</strong></td>
                      <td><strong>{ins.name}</strong></td>
                      <td><span className="badge badge-info">{ins.tpa}</span></td>
                      <td><span style={{ fontWeight: 700, color: 'var(--teal)' }}>{ins.preAuthLimit}</span></td>
                      <td><span className="badge badge-success">{ins.cashless}</span></td>
                      <td>{ins.contact}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.375rem' }}>
                          <button className="action-btn edit" title="Edit"><Edit2 size={14} /></button>
                          <button className="action-btn delete" onClick={() => handleDelete('insurance', ins.id)} title="Delete"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Payment Methods */}
      {activeSubTab === 'paymentMethods' && (
        <div>
          <div className="filter-bar">
            <div className="search-input-box">
              <Search size={16} color="var(--text-muted)" />
              <input
                placeholder="Search payment channels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" onClick={() => handleOpenAddModal('payment')}>
              <Plus size={16} /> + Add Payment Gateway
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Payment Method</th>
                  <th>Processing Channel / Gateway</th>
                  <th>Processing Surcharge / MDR</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paymentMethods
                  .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((pm) => (
                    <tr key={pm.id}>
                      <td><strong>{pm.name}</strong></td>
                      <td>{pm.channel}</td>
                      <td><span className="badge badge-secondary">{pm.feePercent}</span></td>
                      <td><span className="badge badge-success">{pm.status}</span></td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.375rem' }}>
                          <button className="action-btn edit" title="Edit"><Edit2 size={14} /></button>
                          <button className="action-btn delete" onClick={() => handleDelete('payment', pm.id)} title="Delete"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Add {modalType.toUpperCase()} Configuration</h3>
              <button className="action-btn" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveModal} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {modalType === 'billingHead' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Billing Code</label>
                    <input className="form-input" placeholder="e.g. BH-XRAY" onChange={(e) => setFormData({ ...formData, code: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Head Title</label>
                    <input className="form-input" placeholder="e.g. Digital X-Ray Chest" onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <input className="form-input" placeholder="e.g. Radiology" onChange={(e) => setFormData({ ...formData, dept: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Base Charge</label>
                    <input className="form-input" placeholder="e.g. $40.00" onChange={(e) => setFormData({ ...formData, defaultCharge: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Default Tax</label>
                    <input className="form-input" placeholder="e.g. 0% (Exempt)" onChange={(e) => setFormData({ ...formData, tax: e.target.value })} />
                  </div>
                </>
              )}

              {modalType === 'tax' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Tax Name</label>
                    <input className="form-input" placeholder="e.g. Medical Device GST" onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Rate Percentage</label>
                    <input className="form-input" placeholder="e.g. 18.0%" onChange={(e) => setFormData({ ...formData, rate: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">CGST & SGST Split</label>
                    <input className="form-input" placeholder="e.g. 9% / 9%" onChange={(e) => setFormData({ ...formData, cgst: '9%', sgst: '9%' })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Applies To Scope</label>
                    <input className="form-input" placeholder="e.g. Implants & Luxury Rooms" onChange={(e) => setFormData({ ...formData, appliesTo: e.target.value })} />
                  </div>
                </>
              )}

              {modalType === 'package' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Package Code</label>
                    <input className="form-input" placeholder="e.g. PKG-DIAB-01" onChange={(e) => setFormData({ ...formData, code: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Package Title</label>
                    <input className="form-input" placeholder="e.g. Annual Diabetes Care Plan" onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Bundled Inclusions</label>
                    <input className="form-input" placeholder="e.g. 4 Consults, 4 HbA1c, Eye Check" onChange={(e) => setFormData({ ...formData, items: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Original Price</label>
                    <input className="form-input" placeholder="e.g. $300.00" onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Package Price</label>
                    <input className="form-input" placeholder="e.g. $199.00" onChange={(e) => setFormData({ ...formData, pkgPrice: e.target.value })} required />
                  </div>
                </>
              )}

              {modalType === 'insurance' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Insurer Code</label>
                    <input className="form-input" placeholder="e.g. INS-BAJAJ" onChange={(e) => setFormData({ ...formData, code: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Insurer Name</label>
                    <input className="form-input" placeholder="e.g. Bajaj Allianz General Insurance" onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">TPA Provider</label>
                    <input className="form-input" placeholder="e.g. Vidal Health TPA" onChange={(e) => setFormData({ ...formData, tpa: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pre-Auth Auto Limit</label>
                    <input className="form-input" placeholder="e.g. $10,000" onChange={(e) => setFormData({ ...formData, preAuthLimit: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Helpline</label>
                    <input className="form-input" placeholder="e.g. 1800-209-5858" onChange={(e) => setFormData({ ...formData, contact: e.target.value })} />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Financial Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
