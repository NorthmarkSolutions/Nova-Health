import React, { useState, useEffect } from 'react';
import {
  Search, Plus, Tag, Percent, AlertCircle, CheckCircle,
  Edit2, Trash2, RefreshCw, X, ShieldAlert
} from 'lucide-react';
import { billingService, TariffItem } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';

const DEPARTMENTS = [
  'ALL', 'OPD', 'LAB', 'PHARMACY', 'CARDIOLOGY', 'RADIOLOGY', 'SURGERY', 'EMERGENCY', 'GENERAL'
];

export const TariffMasterTab: React.FC = () => {
  const { format: formatMoney } = useCurrency();
  const [tariffs, setTariffs] = useState<TariffItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTariff, setEditingTariff] = useState<TariffItem | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    department: 'OPD',
    base_price: '',
    emergency_markup_percent: '0.00',
    gst_rate: '0.00',
    is_active: true
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchTariffs = async () => {
    setLoading(true);
    try {
      const data = await billingService.getTariffs({
        department: selectedDept !== 'ALL' ? selectedDept : undefined,
        search: searchQuery || undefined
      });
      setTariffs(data);
    } catch (err) {
      console.error('Failed to fetch tariffs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTariffs();
  }, [selectedDept, searchQuery]);

  const handleOpenAdd = () => {
    setEditingTariff(null);
    setFormData({
      code: '',
      name: '',
      department: selectedDept !== 'ALL' ? selectedDept : 'OPD',
      base_price: '',
      emergency_markup_percent: '0.00',
      gst_rate: '0.00',
      is_active: true
    });
    setFormError('');
    setShowAddModal(true);
  };

  const handleOpenEdit = (t: TariffItem) => {
    setEditingTariff(t);
    setFormData({
      code: t.code,
      name: t.name,
      department: t.department,
      base_price: String(t.base_price),
      emergency_markup_percent: String(t.emergency_markup_percent),
      gst_rate: String(t.gst_rate),
      is_active: t.is_active
    });
    setFormError('');
    setShowAddModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.name || !formData.base_price) {
      setFormError('Code, service name, and base price are required.');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      if (editingTariff) {
        await billingService.updateTariff(editingTariff.id, {
          name: formData.name,
          department: formData.department,
          base_price: Number(formData.base_price),
          emergency_markup_percent: Number(formData.emergency_markup_percent),
          gst_rate: Number(formData.gst_rate),
          is_active: formData.is_active
        });
      } else {
        await billingService.createTariff({
          code: formData.code.toUpperCase().trim(),
          name: formData.name.trim(),
          department: formData.department,
          base_price: Number(formData.base_price),
          emergency_markup_percent: Number(formData.emergency_markup_percent),
          gst_rate: Number(formData.gst_rate),
          is_active: formData.is_active
        });
      }
      setShowAddModal(false);
      fetchTariffs();
    } catch (err: any) {
      setFormError(err.response?.data?.code?.[0] || err.response?.data?.error || 'Failed to save tariff item.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: string, code: string) => {
    if (window.confirm(`Are you sure you want to deactivate tariff service ${code}?`)) {
      try {
        await billingService.deactivateTariff(id);
        fetchTariffs();
      } catch (err) {
        alert('Failed to deactivate tariff');
      }
    }
  };

  // Preview calculations
  const previewBase = Number(formData.base_price) || 0;
  const previewEmergencyPct = Number(formData.emergency_markup_percent) || 0;
  const previewGstPct = Number(formData.gst_rate) || 0;
  const previewStandardTax = (previewBase * previewGstPct) / 100;
  const previewStandardTotal = previewBase + previewStandardTax;
  const previewEmergencyBase = previewBase * (1 + previewEmergencyPct / 100);
  const previewEmergencyTotal = previewEmergencyBase * (1 + previewGstPct / 100);

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by code or service name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <button
            onClick={fetchTariffs}
            className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-blue-700 transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add Tariff Service</span>
        </button>
      </div>

      {/* Department Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {DEPARTMENTS.map((dept) => (
          <button
            key={dept}
            onClick={() => setSelectedDept(dept)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedDept === dept
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {dept}
          </button>
        ))}
      </div>

      {/* Tariff Catalog Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Service Description</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4 text-right">Base Price</th>
                <th className="py-3 px-4 text-center">Emergency Markup</th>
                <th className="py-3 px-4 text-center">GST Rate</th>
                <th className="py-3 px-4 text-right">Standard Net</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                    <span>Loading tariffs...</span>
                  </td>
                </tr>
              ) : tariffs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <Tag className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <span>No tariff services found for this filter.</span>
                  </td>
                </tr>
              ) : (
                tariffs.map((t) => {
                  const base = Number(t.base_price) || 0;
                  const gst = Number(t.gst_rate) || 0;
                  const stdNet = base * (1 + gst / 100);
                  const markup = Number(t.emergency_markup_percent) || 0;

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-700 text-xs">
                        {t.code}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {t.name}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {t.department}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900">
                        {formatMoney(base)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {markup > 0 ? (
                          <span className="inline-flex items-center gap-1 text-amber-700 font-medium text-xs bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            +{markup}%
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {gst > 0 ? (
                          <span className="text-slate-700 text-xs font-medium">
                            {gst}%
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">Exempt</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {formatMoney(stdNet)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {t.is_active ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle className="w-3 h-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-700 text-xs font-semibold bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(t)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                            title="Edit Service"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {t.is_active && (
                            <button
                              onClick={() => handleDeactivate(t.id, t.code)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                              title="Deactivate Service"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Tariff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Tag className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">
                  {editingTariff ? `Edit Tariff: ${editingTariff.code}` : 'Add New Tariff Service'}
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
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Service Code *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingTariff}
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. CARD-ECG-01"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-100"
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
                    {DEPARTMENTS.filter((d) => d !== 'ALL').map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Service Description *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. 12-Lead Electrocardiogram with Automated Rhythm Analysis"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Base Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.base_price}
                    onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                    placeholder="500.00"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Emergency Markup %
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.emergency_markup_percent}
                    onChange={(e) => setFormData({ ...formData, emergency_markup_percent: e.target.value })}
                    placeholder="20.00"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    GST Rate %
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.gst_rate}
                    onChange={(e) => setFormData({ ...formData, gst_rate: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Live Price Simulation Card */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Standard Rate (Inc. GST):</span>
                  <span className="font-bold text-slate-900">{formatMoney(previewStandardTotal)}</span>
                </div>
                {previewEmergencyPct > 0 && (
                  <div className="flex justify-between text-amber-700 font-medium">
                    <span>Emergency Rate (+{previewEmergencyPct}%):</span>
                    <span className="font-bold">{formatMoney(previewEmergencyTotal)}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="tariffActive"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="tariffActive" className="text-xs font-semibold text-slate-700">
                  Active & Available for OPD / IPD Order Entry
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
                  {saving ? 'Saving...' : editingTariff ? 'Update Tariff' : 'Save Tariff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
