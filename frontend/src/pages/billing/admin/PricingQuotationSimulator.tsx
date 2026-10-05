import React, { useState, useEffect } from 'react';
import {
  Calculator, Plus, Trash2, ArrowRight, ShieldCheck,
  AlertCircle, CheckCircle, Sparkles, Building2
} from 'lucide-react';
import {
  billingService, TariffItem, CorporateAccount, QuotationResult, QuoteItemRequest
} from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';

export const PricingQuotationSimulator: React.FC = () => {
  const { format: formatMoney } = useCurrency();
  const [tariffs, setTariffs] = useState<TariffItem[]>([]);
  const [corporateAccounts, setCorporateAccounts] = useState<CorporateAccount[]>([]);
  
  // Quotation inputs
  const [encounterType, setEncounterType] = useState('OPD');
  const [patientCategory, setPatientCategory] = useState('GENERAL');
  const [isEmergency, setIsEmergency] = useState(false);
  const [selectedCorpId, setSelectedCorpId] = useState('');
  
  // Line items
  const [lineItems, setLineItems] = useState<{ service_code: string; description: string; qty: number; unit_price: number }[]>([
    { service_code: '', description: '', qty: 1, unit_price: 0 }
  ]);

  const [loading, setLoading] = useState(false);
  const [quoteResult, setQuoteResult] = useState<QuotationResult | null>(null);

  useEffect(() => {
    billingService.getTariffs({ is_active: true }).then(setTariffs).catch(console.error);
    billingService.getCorporateAccounts().then(setCorporateAccounts).catch(console.error);
  }, []);

  const handleServiceSelect = (index: number, code: string) => {
    const tariff = tariffs.find((t) => t.code === code);
    const updated = [...lineItems];
    if (tariff) {
      updated[index] = {
        service_code: tariff.code,
        description: tariff.name,
        qty: updated[index].qty || 1,
        unit_price: Number(tariff.base_price)
      };
    } else {
      updated[index] = {
        service_code: code,
        description: '',
        qty: 1,
        unit_price: 0
      };
    }
    setLineItems(updated);
  };

  const handleQtyChange = (index: number, qty: number) => {
    const updated = [...lineItems];
    updated[index].qty = Math.max(1, qty);
    setLineItems(updated);
  };

  const handleAddLine = () => {
    setLineItems([...lineItems, { service_code: '', description: '', qty: 1, unit_price: 0 }]);
  };

  const handleRemoveLine = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const handleCalculate = async () => {
    const validItems: QuoteItemRequest[] = lineItems
      .filter((i) => i.service_code || i.unit_price > 0)
      .map((i) => ({
        service_code: i.service_code || undefined,
        description: i.description,
        qty: i.qty,
        unit_price: i.unit_price
      }));

    if (validItems.length === 0) {
      alert('Please select at least one service item.');
      return;
    }

    setLoading(true);
    try {
      const res = await billingService.calculateQuote({
        items: validItems,
        encounter_type: encounterType,
        patient_category: patientCategory,
        is_emergency: isEmergency,
        corporate_account_id: patientCategory !== 'GENERAL' ? selectedCorpId || undefined : undefined
      });
      setQuoteResult(res);
    } catch (err) {
      console.error('Calculation error', err);
      alert('Failed to calculate pricing quote.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              Dynamic Pricing & Co-Pay Calculator
            </h3>
            <p className="text-xs text-slate-500">
              Simulate OPD/IPD invoices with emergency markups, GST slabs, and corporate/TPA co-pay splits.
            </p>
          </div>
        </div>
      </div>

      {/* Simulator Parameters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Encounter Type
          </label>
          <select
            value={encounterType}
            onChange={(e) => setEncounterType(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="OPD">OPD Consultation & Diagnostics</option>
            <option value="IPD">Inpatient (IPD) Admission</option>
            <option value="EMERGENCY">Emergency Room (ER)</option>
            <option value="DAYCARE">Daycare Procedure</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Coverage Category
          </label>
          <select
            value={patientCategory}
            onChange={(e) => setPatientCategory(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="GENERAL">General / Self-Pay</option>
            <option value="CORPORATE">Corporate Tie-up Credit</option>
            <option value="TPA">TPA Cashless Insurance</option>
            <option value="STAFF">Hospital Staff / Dependent</option>
          </select>
        </div>

        {patientCategory !== 'GENERAL' ? (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Corporate / TPA Entity
            </label>
            <select
              value={selectedCorpId}
              onChange={(e) => setSelectedCorpId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="">-- Choose Account --</option>
              {corporateAccounts.map((corp) => (
                <option key={corp.id} value={corp.id}>
                  {corp.name} ({corp.co_pay_percentage}% Co-pay)
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex items-center pt-5">
            <span className="text-xs text-slate-500 italic">No corporate co-pay deduction applies</span>
          </div>
        )}

        <div className="flex items-center gap-2 pt-5">
          <input
            type="checkbox"
            id="emergencyToggle"
            checked={isEmergency}
            onChange={(e) => setIsEmergency(e.target.checked)}
            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="emergencyToggle" className="text-xs font-semibold text-slate-800 cursor-pointer">
            Night / Emergency Markups
          </label>
        </div>
      </div>

      {/* Item Selection Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Billable Items & Tariff Codes
          </span>
          <button
            type="button"
            onClick={handleAddLine}
            className="flex items-center gap-1 text-xs text-blue-600 font-semibold hover:text-blue-700"
          >
            <Plus className="w-3.5 h-3.5" /> Add Another Line
          </button>
        </div>

        <div className="space-y-2">
          {lineItems.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="flex-1">
                <select
                  value={item.service_code}
                  onChange={(e) => handleServiceSelect(idx, e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                >
                  <option value="">-- Select Master Tariff Service --</option>
                  {tariffs.map((t) => (
                    <option key={t.id} value={t.code}>
                      [{t.code}] {t.name} - {formatMoney(Number(t.base_price))} ({t.department})
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-24">
                <input
                  type="number"
                  min="1"
                  value={item.qty}
                  onChange={(e) => handleQtyChange(idx, parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-center font-bold"
                  placeholder="Qty"
                />
              </div>

              <div className="w-32 text-right font-mono font-bold text-xs text-slate-800">
                {formatMoney(item.unit_price * item.qty)}
              </div>

              <button
                type="button"
                onClick={() => handleRemoveLine(idx)}
                disabled={lineItems.length === 1}
                className="p-2 text-slate-400 hover:text-rose-600 disabled:opacity-30 rounded"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={handleCalculate}
            disabled={loading}
            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-lg text-xs font-bold hover:bg-slate-800 shadow-sm transition"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>{loading ? 'Calculating Tariff...' : 'Generate Quote Simulation'}</span>
          </button>
        </div>
      </div>

      {/* Calculated Breakdown Display */}
      {quoteResult && (
        <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl shadow-lg space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span className="font-bold text-sm tracking-wide">
                Simulated Quotation Breakdown
              </span>
            </div>
            {quoteResult.corporate_name && (
              <span className="text-xs bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full border border-blue-400/30 flex items-center gap-1 font-medium">
                <Building2 className="w-3.5 h-3.5" />
                {quoteResult.corporate_name}
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-700/60 text-slate-400 uppercase text-[10px]">
                  <th className="py-2 text-left">Service Item</th>
                  <th className="py-2 text-center">Qty</th>
                  <th className="py-2 text-right">Base</th>
                  <th className="py-2 text-right">Emergency Surcharge</th>
                  <th className="py-2 text-right">GST</th>
                  <th className="py-2 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {quoteResult.items.map((line, idx) => (
                  <tr key={idx}>
                    <td className="py-2 text-white font-medium">
                      <span className="text-blue-400 font-mono mr-1.5">{line.service_code}</span>
                      {line.description}
                    </td>
                    <td className="py-2 text-center text-slate-200 font-bold">{line.qty}</td>
                    <td className="py-2 text-right font-mono">{formatMoney(Number(line.unit_price) * line.qty)}</td>
                    <td className="py-2 text-right font-mono text-amber-300">
                      {Number(line.markup_amount) > 0 ? `+${formatMoney(Number(line.markup_amount) * line.qty)}` : '—'}
                    </td>
                    <td className="py-2 text-right font-mono text-slate-300">{formatMoney(Number(line.tax_amount))}</td>
                    <td className="py-2 text-right font-mono font-bold text-white">{formatMoney(Number(line.total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-3 border-t border-slate-700/60 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-white/5 rounded-lg border border-white/10">
              <span className="text-[11px] text-slate-400 block mb-0.5">Gross Subtotal</span>
              <span className="font-mono font-bold text-sm text-white">
                {formatMoney(Number(quoteResult.subtotal))}
              </span>
            </div>
            <div className="p-3 bg-white/5 rounded-lg border border-white/10">
              <span className="text-[11px] text-slate-400 block mb-0.5">Total GST (Tax)</span>
              <span className="font-mono font-bold text-sm text-slate-300">
                {formatMoney(Number(quoteResult.total_tax))}
              </span>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <span className="text-[11px] text-emerald-300 block mb-0.5">Patient Responsibility</span>
              <span className="font-mono font-extrabold text-base text-emerald-400">
                {formatMoney(Number(quoteResult.patient_responsibility))}
              </span>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <span className="text-[11px] text-blue-300 block mb-0.5">Corporate / TPA Covered</span>
              <span className="font-mono font-extrabold text-base text-blue-400">
                {formatMoney(Number(quoteResult.sponsor_responsibility))}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
