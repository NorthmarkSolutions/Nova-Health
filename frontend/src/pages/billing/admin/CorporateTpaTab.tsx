import React, { useState, useEffect } from 'react';
import {
  Building2, Shield, Plus, Search, Edit2, CheckCircle,
  AlertCircle, RefreshCw, X, TrendingUp, DollarSign
} from 'lucide-react';
import { billingService, CorporateAccount } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { PricingQuotationSimulator } from './PricingQuotationSimulator';

export const CorporateTpaTab: React.FC = () => {
  const { format: formatMoney } = useCurrency();
  const [accounts, setAccounts] = useState<CorporateAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAcc, setEditingAcc] = useState<CorporateAccount | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    account_type: 'CORPORATE' as 'CORPORATE' | 'TPA_INSURANCE',
    credit_limit: '500000.00',
    co_pay_percentage: '10.00',
    deductible_amount: '0.00',
    room_rent_ceiling: '5000.00',
    is_active: true
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const data = await billingService.getCorporateAccounts({
        type: filterType !== 'ALL' ? filterType : undefined
      });
      setAccounts(data);
    } catch (err) {
      console.error('Failed to fetch corporate accounts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [filterType]);

  const handleOpenAdd = () => {
    setEditingAcc(null);
    setFormData({
      code: '',
      name: '',
      account_type: 'CORPORATE',
      credit_limit: '500000.00',
      co_pay_percentage: '10.00',
      deductible_amount: '0.00',
      room_rent_ceiling: '5000.00',
      is_active: true
    });
    setFormError('');
    setShowAddModal(true);
  };

  const handleOpenEdit = (acc: CorporateAccount) => {
    setEditingAcc(acc);
    setFormData({
      code: acc.code,
      name: acc.name,
      account_type: acc.account_type,
      credit_limit: String(acc.credit_limit),
      co_pay_percentage: String(acc.co_pay_percentage),
      deductible_amount: String(acc.deductible_amount),
      room_rent_ceiling: String(acc.room_rent_ceiling),
      is_active: acc.is_active
    });
    setFormError('');
    setShowAddModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.name) {
      setFormError('Entity code and name are required.');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      if (editingAcc) {
        await billingService.updateCorporateAccount(editingAcc.id, {
          name: formData.name.trim(),
          account_type: formData.account_type,
          credit_limit: Number(formData.credit_limit),
          co_pay_percentage: Number(formData.co_pay_percentage),
          deductible_amount: Number(formData.deductible_amount),
          room_rent_ceiling: Number(formData.room_rent_ceiling),
          is_active: formData.is_active
        });
      } else {
        await billingService.createCorporateAccount({
          code: formData.code.toUpperCase().trim(),
          name: formData.name.trim(),
          account_type: formData.account_type,
          credit_limit: Number(formData.credit_limit),
          co_pay_percentage: Number(formData.co_pay_percentage),
          deductible_amount: Number(formData.deductible_amount),
          room_rent_ceiling: Number(formData.room_rent_ceiling),
          is_active: formData.is_active
        });
      }
      setShowAddModal(false);
      fetchAccounts();
    } catch (err: any) {
      setFormError(err.response?.data?.code?.[0] || err.response?.data?.error || 'Failed to save account.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header & Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                filterType === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Entities
            </button>
            <button
              onClick={() => setFilterType('CORPORATE')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                filterType === 'CORPORATE' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Corporate Tie-ups
            </button>
            <button
              onClick={() => setFilterType('TPA_INSURANCE')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                filterType === 'TPA_INSURANCE' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              TPA / Insurers
            </button>
          </div>

          <button
            onClick={fetchAccounts}
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
          <span>Add Corporate / TPA Partner</span>
        </button>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
          <span className="text-sm text-slate-500">Loading partner accounts...</span>
        </div>
      ) : accounts.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
          <Building2 className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          <span className="text-sm text-slate-500">No partner accounts configured yet.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {accounts.map((acc) => {
            const limit = Number(acc.credit_limit) || 0;
            const utilized = Number(acc.utilized_credit) || 0;
            const pct = limit > 0 ? Math.min(100, Math.round((utilized / limit) * 100)) : 0;

            return (
              <div
                key={acc.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {acc.code}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                          acc.account_type === 'TPA_INSURANCE'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {acc.account_type === 'TPA_INSURANCE' ? 'TPA Insurance' : 'Corporate Credit'}
                      </span>
                      <button
                        onClick={() => handleOpenEdit(acc)}
                        className="p-1 text-slate-400 hover:text-blue-600 rounded transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h4 className="font-bold text-slate-900 text-base mb-3">
                    {acc.name}
                  </h4>

                  {/* Credit Utilization Bar */}
                  <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-500 font-medium">Credit Limit</span>
                      <span className="font-mono font-bold text-slate-800">{formatMoney(limit)}</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-1.5">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pct > 85 ? 'bg-rose-500' : pct > 60 ? 'bg-amber-500' : 'bg-blue-600'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>Utilized: {formatMoney(utilized)} ({pct}%)</span>
                      <span className="font-semibold text-emerald-700">
                        Avail: {formatMoney(limit - utilized)}
                      </span>
                    </div>
                  </div>

                  {/* Terms Tags */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-slate-50 rounded border border-slate-100">
                      <span className="text-slate-400 text-[10px] block">Patient Co-Pay</span>
                      <span className="font-bold text-slate-800">{acc.co_pay_percentage}%</span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded border border-slate-100">
                      <span className="text-slate-400 text-[10px] block">Room Rent Cap</span>
                      <span className="font-bold text-slate-800">{formatMoney(Number(acc.room_rent_ceiling))} / day</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Billing Gate:</span>
                  <span className={`font-semibold ${acc.is_active ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {acc.is_active ? 'Active Cashless Desk' : 'Suspended'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Embedded Quotation Simulator */}
      <PricingQuotationSimulator />

      {/* Add / Edit Partner Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Building2 className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">
                  {editingAcc ? `Edit Partner: ${editingAcc.code}` : 'Add Corporate / TPA Partner'}
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
                    Entity Code *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingAcc}
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="CORP-TATA"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Agreement Type *
                  </label>
                  <select
                    value={formData.account_type}
                    onChange={(e) => setFormData({ ...formData, account_type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="CORPORATE">Corporate Tie-up</option>
                    <option value="TPA_INSURANCE">TPA Cashless Insurance</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Entity Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Star Health & Allied Insurance Co Ltd"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Credit Limit (₹) *
                  </label>
                  <input
                    type="number"
                    step="1000"
                    min="0"
                    required
                    value={formData.credit_limit}
                    onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Co-Pay % *
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    required
                    value={formData.co_pay_percentage}
                    onChange={(e) => setFormData({ ...formData, co_pay_percentage: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Room Rent Cap (₹)
                  </label>
                  <input
                    type="number"
                    step="100"
                    min="0"
                    value={formData.room_rent_ceiling}
                    onChange={(e) => setFormData({ ...formData, room_rent_ceiling: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="corpActive"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="corpActive" className="text-xs font-semibold text-slate-700">
                  Active Agreement for Cashless Billing Desks
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
                  {saving ? 'Saving...' : editingAcc ? 'Update Partner' : 'Save Partner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
