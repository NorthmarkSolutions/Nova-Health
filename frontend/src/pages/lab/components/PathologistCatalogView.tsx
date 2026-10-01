import React, { useState, useMemo, useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  Activity,
  Layers,
  Search,
  Plus,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import { KpiRow, KpiCard } from '../../../components/workspace';
import {
  LabDataStore,
  CatalogTestItem,
} from '../data/labDataStore';

interface Props {
  onShowToast?: (msg: string) => void;
}

export const PathologistCatalogView: React.FC<Props> = ({ onShowToast }) => {
  const [catalog, setCatalog] = useState<CatalogTestItem[]>(() => LabDataStore.getCatalog());
  const [selectedTestCode, setSelectedTestCode] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSegment, setActiveSegment] = useState<'adultMale' | 'adultFemale' | 'child'>('adultMale');

  // Modals
  const [showAddTestModal, setShowAddTestModal] = useState(false);
  const [newTestName, setNewTestName] = useState('');
  const [newTestCode, setNewTestCode] = useState('');
  const [newTestSection, setNewTestSection] = useState('Biochemistry');
  const [newTestSample, setNewTestSample] = useState('Serum · Gold top SST');
  const [newTestTat, setNewTestTat] = useState('4 h');

  const currentTest = useMemo(() => {
    if (!selectedTestCode) return null;
    return catalog.find((t) => t.code === selectedTestCode) || null;
  }, [catalog, selectedTestCode]);

  // Close drawer on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedTestCode(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filtered catalog
  const filteredCatalog = useMemo(() => {
    return catalog.filter((t) => {
      if (activeFilter !== 'all' && t.section !== activeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          t.name.toLowerCase().includes(q) ||
          t.code.toLowerCase().includes(q) ||
          t.section.toLowerCase().includes(q) ||
          t.sampleType.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [catalog, activeFilter, searchQuery]);

  const handleCreateTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTestName.trim() || !newTestCode.trim()) return;

    const newTest: CatalogTestItem = {
      code: newTestCode.trim().toUpperCase(),
      name: newTestName.trim(),
      section: newTestSection,
      sampleType: newTestSample,
      container: 'Gold top SST tube',
      paramsCount: 1,
      tatTarget: newTestTat,
      tatStat: '1 h',
      status: 'Active',
      version: 1,
      lastPublished: 'Today',
      ranges: {
        adultMale: [
          { name: 'Primary Parameter', unit: 'mg/dL', low: 70, high: 100, criticalLow: 40, criticalHigh: 400 },
        ],
        adultFemale: [
          { name: 'Primary Parameter', unit: 'mg/dL', low: 70, high: 100, criticalLow: 40, criticalHigh: 400 },
        ],
        child: [
          { name: 'Primary Parameter', unit: 'mg/dL', low: 60, high: 95, criticalLow: 35, criticalHigh: 350 },
        ],
      },
      recentQc: [{ level: 'Normal', meta: 'Run 1', time: '10:00', result: 'Pass', pass: true }],
    };

    const updated = [newTest, ...catalog];
    LabDataStore.saveCatalog(updated);
    setCatalog(updated);
    setShowAddTestModal(false);
    setNewTestName('');
    setNewTestCode('');
    onShowToast?.(`✓ New test protocol ${newTest.code} added to master diagnostic catalog.`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. KPI CARDS ROW (§ 9) */}
      <KpiRow>
        <KpiCard
          label="Active Test Protocols"
          value={86}
          trend="Orderable in EHR"
          trendColor="var(--success)"
          iconBg="var(--success-light)"
          iconColor="var(--success)"
          icon={<CheckCircle2 size={18} />}
        />
        <KpiCard
          label="Draft Protocols"
          value={catalog.filter((t) => t.status === 'Draft').length || 3}
          trend="Validation Phase"
          trendColor="var(--warning)"
          iconBg="var(--warning-light)"
          iconColor="var(--warning)"
          icon={<Clock size={18} />}
        />
        <KpiCard
          label="Daily QC Checks"
          value={42}
          trend="Analyzers Verified"
          trendColor="var(--primary)"
          iconBg="var(--primary-light)"
          iconColor="var(--primary)"
          icon={<Activity size={18} />}
        />
        <KpiCard
          label="TAT Compliance"
          value="93%"
          trend="Within SLA Target"
          trendColor="var(--success)"
          iconBg="var(--success-light)"
          iconColor="var(--success)"
          icon={<Layers size={18} />}
        />
      </KpiRow>

      {/* 2. PRIMARY CONTENT: CATALOG TABLE (§ 8 & § 10) */}
      <div className="card" style={{ padding: '20px' }}>
        {/* Filter and Action Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: `All Sections (${catalog.length})` },
              { id: 'Biochemistry', label: 'Biochemistry' },
              { id: 'Hematology', label: 'Hematology' },
              { id: 'Immunoassay', label: 'Immunoassay' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFilter(f.id)}
                className={`btn btn-sm ${activeFilter === f.id ? 'btn-primary' : 'btn-secondary'}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="search-input-box" style={{ width: '260px' }}>
              <Search size={16} color="var(--text-light)" />
              <input
                type="text"
                placeholder="Search test name or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => setShowAddTestModal(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={15} />
              <span>Add Protocol</span>
            </button>
          </div>
        </div>

        {/* 100% Full-Width Catalog Table */}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: '120px' }}>Code</th>
                <th>Test Protocol</th>
                <th>Section</th>
                <th>Specimen & Container</th>
                <th style={{ width: '100px' }}>TAT</th>
                <th style={{ width: '110px' }}>Parameters</th>
                <th style={{ width: '100px' }}>Status</th>
                <th style={{ width: '140px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCatalog.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      textAlign: 'center',
                      padding: '48px 24px',
                      color: 'var(--text-muted)',
                      fontSize: '14px',
                    }}
                  >
                    No tests found matching this search or filter.
                  </td>
                </tr>
              ) : (
                filteredCatalog.map((t) => (
                  <tr
                    key={t.code}
                    onClick={() => setSelectedTestCode(t.code)}
                    style={{ height: '56px', cursor: 'pointer' }}
                  >
                    <td>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)' }}>
                        {t.code}
                      </span>
                    </td>

                    <td>
                      <strong style={{ color: 'var(--secondary)', fontSize: '14px' }}>
                        {t.name}
                      </strong>
                    </td>

                    <td>
                      <span style={{ fontSize: '13px', color: 'var(--secondary)' }}>
                        {t.section}
                      </span>
                    </td>

                    <td>
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        {t.sampleType} ({t.container})
                      </span>
                    </td>

                    <td>
                      <span style={{ fontSize: '13px', color: 'var(--secondary)', fontWeight: 600 }}>
                        {t.tatTarget}
                      </span>
                    </td>

                    <td>
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        {t.paramsCount} parameter{t.paramsCount > 1 ? 's' : ''}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`badge ${
                          t.status === 'Active' ? 'badge-success' : 'badge-warning'
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTestCode(t.code);
                        }}
                      >
                        View Ranges
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. SLIDE-OUT TEST DETAILS & RANGES DRAWER */}
      {currentTest && (
        <>
          <div
            onClick={() => setSelectedTestCode(null)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(17, 24, 39, 0.45)',
              backdropFilter: 'blur(2px)',
              zIndex: 9998,
            }}
          />

          <div
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: '600px',
              maxWidth: '94vw',
              backgroundColor: '#ffffff',
              boxShadow: 'var(--shadow-xl, -4px 0 32px rgba(0,0,0,0.15))',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box',
              overflowY: 'auto',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'sticky',
                top: 0,
                backgroundColor: '#ffffff',
                zIndex: 10,
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)' }}>
                    {currentTest.code}
                  </span>
                  <span className="badge badge-success">{currentTest.status}</span>
                </div>
                <h3 style={{ margin: '4px 0 2px 0', fontSize: '18px', fontWeight: 700, color: 'var(--secondary)' }}>
                  {currentTest.name}
                </h3>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  {currentTest.section} • {currentTest.sampleType} ({currentTest.container}) • Standard TAT: {currentTest.tatTarget}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTestCode(null)}
                style={{
                  border: 'none',
                  background: 'var(--gray-100)',
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
              {/* Cohort Segment Switcher */}
              <div
                style={{
                  display: 'flex',
                  backgroundColor: 'var(--gray-100)',
                  borderRadius: '10px',
                  padding: '3px',
                  border: '1px solid var(--border-color)',
                }}
              >
                {[
                  { id: 'adultMale', label: 'Adult Male' },
                  { id: 'adultFemale', label: 'Adult Female' },
                  { id: 'child', label: 'Pediatric' },
                ].map((seg) => (
                  <button
                    key={seg.id}
                    type="button"
                    onClick={() => setActiveSegment(seg.id as any)}
                    style={{
                      flex: 1,
                      border: 'none',
                      backgroundColor: activeSegment === seg.id ? '#ffffff' : 'transparent',
                      color: activeSegment === seg.id ? 'var(--secondary)' : 'var(--text-muted)',
                      fontWeight: activeSegment === seg.id ? 600 : 500,
                      fontSize: '13px',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      boxShadow: activeSegment === seg.id ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    }}
                  >
                    {seg.label}
                  </button>
                ))}
              </div>

              {/* Reference Range Table */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '15px', fontWeight: 700, color: 'var(--secondary)' }}>
                  Parameter Reference Thresholds
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(currentTest.ranges[activeSegment] || []).map((param) => {

                    return (
                      <div
                        key={param.name}
                        style={{
                          padding: '14px',
                          borderRadius: '10px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: '#ffffff',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <strong style={{ fontSize: '14px', color: 'var(--secondary)' }}>
                            {param.name}
                          </strong>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            Unit: <strong>{param.unit}</strong>
                          </span>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            gap: '12px',
                            backgroundColor: 'var(--gray-50)',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ color: 'var(--text-muted)' }}>Normal Low</div>
                            <strong style={{ color: 'var(--secondary)' }}>{param.low} {param.unit}</strong>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ color: 'var(--text-muted)' }}>Normal High</div>
                            <strong style={{ color: 'var(--secondary)' }}>{param.high} {param.unit}</strong>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ color: 'var(--danger)' }}>Critical Panic Low</div>
                            <strong style={{ color: 'var(--danger)' }}>{param.criticalLow ?? '—'}</strong>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ color: 'var(--danger)' }}>Critical Panic High</div>
                            <strong style={{ color: 'var(--danger)' }}>{param.criticalHigh ?? '—'}</strong>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                gap: '10px',
                justifyContent: 'flex-end',
                position: 'sticky',
                bottom: 0,
                backgroundColor: '#ffffff',
                zIndex: 10,
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedTestCode(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  onShowToast?.(`✓ Reference range settings updated for ${currentTest.code}`);
                  setSelectedTestCode(null);
                }}
              >
                Save Protocol Changes
              </button>
            </div>
          </div>
        </>
      )}

      {/* Add Protocol Modal */}
      {showAddTestModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div className="card" style={{ width: '460px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Add Diagnostic Test Protocol</h3>
              <button
                type="button"
                onClick={() => setShowAddTestModal(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTest}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Test Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Thyroid Stimulating Hormone (TSH)"
                  value={newTestName}
                  onChange={(e) => setNewTestName(e.target.value)}
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                    Billing / Lab Code
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. IMM-TSH-01"
                    value={newTestCode}
                    onChange={(e) => setNewTestCode(e.target.value)}
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                    Section
                  </label>
                  <select
                    value={newTestSection}
                    onChange={(e) => setNewTestSection(e.target.value)}
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="Biochemistry">Biochemistry</option>
                    <option value="Hematology">Hematology</option>
                    <option value="Immunoassay">Immunoassay</option>
                    <option value="Coagulation">Coagulation</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                    Sample / Container
                  </label>
                  <input
                    type="text"
                    value={newTestSample}
                    onChange={(e) => setNewTestSample(e.target.value)}
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                    Target TAT
                  </label>
                  <input
                    type="text"
                    value={newTestTat}
                    onChange={(e) => setNewTestTat(e.target.value)}
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddTestModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Test Protocol
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
