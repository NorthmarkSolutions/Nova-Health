import React, { useState, useEffect } from 'react';
import {
  Package, Search, Plus, Calendar, AlertTriangle, CheckCircle,
  FileText, Edit2, RefreshCw, X
} from 'lucide-react';
import { billingService, ServicePackage } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';

export const PackageManagementTab: React.FC = () => {
  const { format: formatMoney } = useCurrency();
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPkg, setEditingPkg] = useState<ServicePackage | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    package_price: '',
    department: 'SURGERY',
    inclusions_description: '',
    exclusions_description: '',
    validity_days: '7',
    is_active: true
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const data = await billingService.getPackages({
        department: selectedDept !== 'ALL' ? selectedDept : undefined,
        search: searchQuery || undefined
      });
      setPackages(data);
    } catch (err) {
      console.error('Failed to fetch packages', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, [selectedDept, searchQuery]);

  const handleOpenAdd = () => {
    setEditingPkg(null);
    setFormData({
      code: '',
      name: '',
      package_price: '',
      department: 'SURGERY',
      inclusions_description: '',
      exclusions_description: '',
      validity_days: '7',
      is_active: true
    });
    setFormError('');
    setShowAddModal(true);
  };

  const handleOpenEdit = (pkg: ServicePackage) => {
    setEditingPkg(pkg);
    setFormData({
      code: pkg.code,
      name: pkg.name,
      package_price: String(pkg.package_price),
      department: pkg.department,
      inclusions_description: pkg.inclusions_description,
      exclusions_description: pkg.exclusions_description,
      validity_days: String(pkg.validity_days),
      is_active: pkg.is_active
    });
    setFormError('');
    setShowAddModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.name || !formData.package_price) {
      setFormError('Code, name, and package price are required.');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      if (editingPkg) {
        await billingService.updatePackage(editingPkg.id, {
          name: formData.name.trim(),
          department: formData.department,
          package_price: Number(formData.package_price),
          inclusions_description: formData.inclusions_description,
          exclusions_description: formData.exclusions_description,
          validity_days: Number(formData.validity_days),
          is_active: formData.is_active
        });
      } else {
        await billingService.createPackage({
          code: formData.code.toUpperCase().trim(),
          name: formData.name.trim(),
          department: formData.department,
          package_price: Number(formData.package_price),
          inclusions_description: formData.inclusions_description,
          exclusions_description: formData.exclusions_description,
          validity_days: Number(formData.validity_days),
          is_active: formData.is_active
        });
      }
      setShowAddModal(false);
      fetchPackages();
    } catch (err: any) {
      setFormError(err.response?.data?.code?.[0] || err.response?.data?.error || 'Failed to save package.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search surgery or procedure packages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <button
            onClick={fetchPackages}
            className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-blue-700 transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Create Service Package</span>
        </button>
      </div>

      {/* Package Cards Grid */}
      {loading ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
          <span className="text-sm text-slate-500">Loading surgical packages...</span>
        </div>
      ) : packages.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
          <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          <span className="text-sm text-slate-500">No procedure packages configured yet.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {pkg.code}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      {pkg.department}
                    </span>
                    <button
                      onClick={() => handleOpenEdit(pkg)}
                      className="p-1 text-slate-400 hover:text-blue-600 rounded transition"
                      title="Edit Package"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h4 className="font-bold text-slate-900 text-base mb-1">
                  {pkg.name}
                </h4>

                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-2xl font-black text-slate-900">
                    {formatMoney(Number(pkg.package_price))}
                  </span>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Valid {pkg.validity_days} days
                  </span>
                </div>

                {/* Inclusions Box */}
                {pkg.inclusions_description && (
                  <div className="mb-3 p-3 bg-emerald-50/70 border border-emerald-100 rounded-lg text-xs text-emerald-950">
                    <div className="flex items-center gap-1 font-semibold text-emerald-800 mb-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Package Inclusions:
                    </div>
                    <p className="leading-relaxed text-[11px]">
                      {pkg.inclusions_description}
                    </p>
                  </div>
                )}

                {/* Exclusions Box */}
                {pkg.exclusions_description && (
                  <div className="mb-2 p-3 bg-amber-50/70 border border-amber-100 rounded-lg text-xs text-amber-950">
                    <div className="flex items-center gap-1 font-semibold text-amber-800 mb-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Billable Exclusions / Add-ons:
                    </div>
                    <p className="leading-relaxed text-[11px]">
                      {pkg.exclusions_description}
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Coverage Status:</span>
                <span className={`font-semibold ${pkg.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {pkg.is_active ? 'Active for Admissions' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Package Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Package className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">
                  {editingPkg ? `Edit Package: ${editingPkg.code}` : 'Create Procedure Package'}
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Package Code *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingPkg}
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="PKG-MATERNITY-01"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Department *
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="SURGERY">SURGERY</option>
                    <option value="OBGYN">OBGYN</option>
                    <option value="CARDIOLOGY">CARDIOLOGY</option>
                    <option value="ORTHOPEDICS">ORTHOPEDICS</option>
                    <option value="OPHTHALMOLOGY">OPHTHALMOLOGY</option>
                    <option value="GENERAL">GENERAL</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Package Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Normal Delivery Maternity Care Package"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Composite Package Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.package_price}
                    onChange={(e) => setFormData({ ...formData, package_price: e.target.value })}
                    placeholder="45000.00"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Validity (Days) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.validity_days}
                    onChange={(e) => setFormData({ ...formData, validity_days: e.target.value })}
                    placeholder="7"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Itemized Inclusions (Comma-separated or bullet list)
                </label>
                <textarea
                  rows={2}
                  value={formData.inclusions_description}
                  onChange={(e) => setFormData({ ...formData, inclusions_description: e.target.value })}
                  placeholder="3 days general ward, pediatrician round, surgeon charges, routine lab"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Non-Covered Exclusions (Billed as separate add-ons)
                </label>
                <textarea
                  rows={2}
                  value={formData.exclusions_description}
                  onChange={(e) => setFormData({ ...formData, exclusions_description: e.target.value })}
                  placeholder="Blood transfusion, NICU stay, emergency vacuum delivery, high-cost implants"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="pkgActive"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="pkgActive" className="text-xs font-semibold text-slate-700">
                  Active Package for IPD Ingestion
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {saving ? 'Saving...' : editingPkg ? 'Update Package' : 'Save Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
