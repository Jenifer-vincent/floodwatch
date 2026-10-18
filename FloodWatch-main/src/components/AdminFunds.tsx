import React, { useState, useEffect, useMemo } from 'react';
import { ZoneRisk, FundAllocation, FundCategory } from '../types';
import { Landmark, ClipboardCheck, Plus, AlertCircle, X } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { fundService } from '../services/funds';

// Re-export for backward compatibility with services/funds.ts
export type { FundAllocation } from '../types';

interface AdminFundsProps {
  zones: ZoneRisk[];
  availableFunds: number;
  onAllocate: (amount: number, newBalance?: number) => void;
  triggerToast: (msg: string) => void;
}

export default function AdminFunds({ zones, availableFunds, onAllocate, triggerToast }: AdminFundsProps) {
  const [allocations, setAllocations] = useState<FundAllocation[]>([]);

  useEffect(() => {
    fundService.getAllocations().then(setAllocations);
  }, []);

  const [selectedZone, setSelectedZone] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FundCategory>('Emergency Relief');
  const [amountStr, setAmountStr] = useState('');
  const [reason, setReason] = useState('');

  // Confirmation Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAllocation, setPendingAllocation] = useState<{
    zone: string;
    category: typeof selectedCategory;
    amount: number;
    remaining: number;
    reason: string;
  } | null>(null);

  // Set default zone if list is loaded
  useEffect(() => {
    if (zones.length > 0 && !selectedZone) {
      setSelectedZone(zones[0].name);
    }
  }, [zones, selectedZone]);

  // Close the confirmation modal with the Escape key
  useEffect(() => {
    if (!showConfirmModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowConfirmModal(false);
        setPendingAllocation(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showConfirmModal]);

  // Group allocations for Recharts visualization
  const chartData = useMemo(() => {
    const categories: Record<string, number> = {
      'Emergency Relief': 0,
      'Road Repair': 0,
      'Drainage': 0,
      'Medical': 0,
      'Rehabilitation': 0
    };
    allocations.forEach(alloc => {
      if (categories[alloc.category] !== undefined) {
        categories[alloc.category] += alloc.amount;
      }
    });
    return Object.keys(categories).map(cat => ({
      category: cat,
      amount: categories[cat]
    }));
  }, [allocations]);

  // Color palette for chart bars
  const colors = ['#1B4B66', '#B23B2E', '#C97A2B', '#2E7D5B', '#4A5568'];

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedAmount = parseFloat(amountStr);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      triggerToast("Invalid transaction amount.");
      return;
    }

    // Check against current available treasury
    const rawBudget = availableFunds;
    if (parsedAmount > rawBudget) {
      triggerToast("Transaction rejected: Insufficient treasury reserves.");
      return;
    }

    // Load confirmation details
    setPendingAllocation({
      zone: selectedZone,
      category: selectedCategory,
      amount: parsedAmount,
      remaining: rawBudget - parsedAmount,
      reason: reason.trim() || "Approved operational response fund disbursement."
    });
    setShowConfirmModal(true);
  };

  const handleConfirmDisbursement = async () => {
    if (!pendingAllocation) return;

    const res = await fundService.allocateFunds(
      pendingAllocation.zone,
      pendingAllocation.category,
      pendingAllocation.amount,
      pendingAllocation.reason
    );

    if (res.success) {
      const updatedAllocations = await fundService.getAllocations();
      setAllocations(updatedAllocations);
      onAllocate(pendingAllocation.amount, res.remainingBalance);
      triggerToast(`Disbursed $${pendingAllocation.amount.toLocaleString()} to ${pendingAllocation.zone}`);
    } else {
      triggerToast(res.error || "Allocation failed.");
    }

    // Reset Form & Close Modal
    setAmountStr('');
    setReason('');
    setShowConfirmModal(false);
    setPendingAllocation(null);
  };

  return (
    <div className="space-y-6 animate-fade-in" id="admin-funds-view">
      {/* Page Header */}
      <div className="border-b border-[#E2E4E1] pb-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-extrabold text-[#1A2226] uppercase tracking-wider flex items-center gap-2">
            <Landmark size={16} className="text-[#1B4B66]" />
            <span>Emergency Fund Allocation Desk</span>
          </h2>
          <p className="text-xs text-[#5B6B72] mt-1 leading-normal">
            Financial auditing controls and operational grant disbursement logs for severe flood incident areas.
          </p>
        </div>

        {/* Dynamic Treasury Reserve Display */}
        <div className="bg-[#1B4B66]/5 border border-[#1B4B66]/20 px-4 py-2.5 flex items-baseline gap-2 shrink-0">
          <span className="text-[10px] font-bold text-[#1B4B66] uppercase tracking-wider">Treasury Balance:</span>
          <span className="text-lg font-mono font-extrabold text-[#1B4B66] tracking-tight">{`$${availableFunds.toLocaleString()}`}</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Form Column */}
        <div className="lg:col-span-5 bg-white border border-[#E2E4E1] p-5 space-y-4 h-fit" id="fund-disbursement-form-card">
          <div className="border-b border-[#E2E4E1] pb-2">
            <span className="text-[10px] font-bold text-[#1A2226] uppercase tracking-wider block">
              Disburse Public Grants
            </span>
          </div>

          <form onSubmit={handlePreSubmit} className="space-y-4 text-xs">
            {/* 1. Zone Selection */}
            <div className="space-y-1">
              <label htmlFor="fund-zone-dropdown" className="font-bold text-[#5B6B72] uppercase tracking-wider text-[10px] block">
                Target Risk Zone
              </label>
              <select
                id="fund-zone-dropdown"
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
                className="w-full border border-[#E2E4E1] bg-white px-3 py-2 text-[#1A2226] focus:outline-none rounded-none"
                required
              >
                {zones.map((z) => (
                  <option key={z.id} value={z.name}>
                    {z.name} (Risk: {z.riskLevel.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Category Selection */}
            <div className="space-y-1">
              <label htmlFor="fund-category-dropdown" className="font-bold text-[#5B6B72] uppercase tracking-wider text-[10px] block">
                Allocation Category
              </label>
              <select
                id="fund-category-dropdown"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as any)}
                className="w-full border border-[#E2E4E1] bg-white px-3 py-2 text-[#1A2226] focus:outline-none rounded-none"
                required
              >
                <option value="Emergency Relief">Emergency Relief</option>
                <option value="Road Repair">Road Repair</option>
                <option value="Drainage">Drainage</option>
                <option value="Medical">Medical</option>
                <option value="Rehabilitation">Rehabilitation</option>
              </select>
            </div>

            {/* 3. Amount Field */}
            <div className="space-y-1">
              <label htmlFor="fund-amount-input" className="font-bold text-[#5B6B72] uppercase tracking-wider text-[10px] block">
                Disbursement Amount (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 transform -translate-y-1/2 font-bold text-[#5B6B72] text-[11px] font-mono">$</span>
                <input
                  id="fund-amount-input"
                  type="number"
                  min="1"
                  step="1"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="e.g. 50000"
                  className="w-full border border-[#E2E4E1] bg-white pl-7 pr-3.5 py-2 text-[#1A2226] focus:outline-none rounded-none font-mono"
                  required
                />
              </div>
            </div>

            {/* 4. Reason Textarea */}
            <div className="space-y-1">
              <label htmlFor="fund-reason-textarea" className="font-bold text-[#5B6B72] uppercase tracking-wider text-[10px] block">
                Disbursement Memorandum (Optional)
              </label>
              <textarea
                id="fund-reason-textarea"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Details of response activities funded..."
                className="w-full border border-[#E2E4E1] bg-white p-3 text-[#1A2226] focus:outline-none rounded-none resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[#1B4B66] hover:bg-[#153a4f] text-white py-2.5 font-bold uppercase tracking-wider rounded-none cursor-pointer text-center"
            >
              Authorize Fund Dispatch
            </button>
          </form>
        </div>

        {/* Transaction Log Audit Record & Charts Column */}
        <div className="lg:col-span-7 space-y-6">
          {/* Recharts Allocation visualization */}
          <div className="bg-white border border-[#E2E4E1] p-5 shadow-sm">
            <div className="border-b border-[#E2E4E1] pb-2 mb-3">
              <span className="text-[10px] font-bold text-[#1A2226] uppercase tracking-wider block">
                Grants Allocation by Category
              </span>
            </div>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E4E1" />
                  <XAxis dataKey="category" stroke="#5B6B72" fontSize={8} tickLine={false} />
                  <YAxis stroke="#5B6B72" fontSize={8} tickFormatter={(v) => `$${(v/1000)}k`} tickLine={false} />
                  <Tooltip 
                    formatter={(value: any) => [`$${value.toLocaleString()}`, 'Total Spent']}
                    contentStyle={{ fontSize: '10px', backgroundColor: '#1A2226', color: '#fff', border: 'none' }}
                  />
                  <Bar dataKey="amount" fill="#1B4B66">
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="bg-white border border-[#E2E4E1] p-5 flex flex-col justify-between shadow-sm" id="fund-audit-ledger-card">
            <div className="space-y-4">
              <div className="border-b border-[#E2E4E1] pb-2">
                <span className="text-[10px] font-bold text-[#1A2226] uppercase tracking-wider block">
                  Treasury Transaction Audit Log
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse" id="fund-audit-table">
                  <thead>
                    <tr className="border-b border-[#E2E4E1] text-[10px] font-bold text-[#5B6B72] uppercase tracking-wider">
                      <th className="pb-2">Tx ID</th>
                      <th className="pb-2">Risk Zone / Category</th>
                      <th className="pb-2 text-right">Disbursement</th>
                      <th className="pb-2 text-right">Authorized Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E4E1]/60 text-[11px]">
                    {allocations.map((alloc) => (
                      <tr key={alloc.id} className="hover:bg-[#F5F6F4]/40" id={`fund-row-${alloc.id}`}>
                        <td className="py-3 font-mono font-bold text-[#1A2226]">{alloc.id}</td>
                        <td className="py-3 space-y-0.5">
                          <div className="font-bold text-[#1A2226]">{alloc.zoneName}</div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[9px] font-bold px-1.5 py-0.2 bg-[#1B4B66]/10 text-[#1B4B66] uppercase tracking-wide border border-[#1B4B66]/20">
                              {alloc.category}
                            </span>
                            <span className="text-[10px] text-[#5B6B72] truncate max-w-[180px]" title={alloc.reason}>
                              {alloc.reason}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 text-right font-mono font-bold text-[#2E7D5B]">
                          ${alloc.amount.toLocaleString()}
                        </td>
                        <td className="py-3 text-right font-mono text-[#5B6B72]">
                          {alloc.date}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="text-[10px] text-[#5B6B72] leading-normal border-t border-[#E2E4E1] pt-3 mt-4 flex items-center gap-1.5">
              <AlertCircle size={14} className="text-[#1B4B66] shrink-0" />
              <span>
                All disbursements on this terminal are authorized by the Municipal Budget Comptroller under Active Disaster Statute (ADS-2026).
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Fund Allocation Confirmation Modal */}
      {showConfirmModal && pendingAllocation && (
        <div className="fixed inset-0 bg-[#1A2226]/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E4E1] max-w-md w-full flex flex-col shadow-2xl relative animate-fade-in text-xs" role="dialog" aria-modal="true" aria-label="Fund allocation confirmation">
            {/* Modal Header */}
            <div className="bg-[#1B4B66] text-white p-4 flex items-center justify-between border-b border-[#E2E4E1]">
              <div className="space-y-0.5">
                <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-white/75 block">
                  Treasury Auditing Protocol
                </span>
                <h3 className="text-xs font-black uppercase tracking-tight">
                  Authorization Confirmation
                </h3>
              </div>
              <button 
                onClick={() => { setShowConfirmModal(false); setPendingAllocation(null); }}
                className="text-white/70 hover:text-white hover:bg-white/10 p-1 cursor-pointer transition-colors"
                aria-label="Close fund allocation confirmation"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <div className="p-3.5 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-none leading-relaxed flex gap-2.5">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <p>
                  You are authorizing a public emergency grant disbursement. Review target details carefully before executing.
                </p>
              </div>

              <div className="space-y-2 border-b border-[#E2E4E1] pb-3">
                <div className="flex justify-between py-1 border-b border-dashed border-[#E2E4E1]">
                  <span className="font-bold text-[#5B6B72] uppercase tracking-wider text-[9px]">Target Risk Zone:</span>
                  <span className="font-bold text-[#1A2226]">{pendingAllocation.zone}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-dashed border-[#E2E4E1]">
                  <span className="font-bold text-[#5B6B72] uppercase tracking-wider text-[9px]">Allocation Category:</span>
                  <span className="font-mono font-bold text-[#1B4B66] bg-[#1B4B66]/10 px-2 py-0.2 border border-[#1B4B66]/20 uppercase">{pendingAllocation.category}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-dashed border-[#E2E4E1]">
                  <span className="font-bold text-[#5B6B72] uppercase tracking-wider text-[9px]">Grant Amount:</span>
                  <span className="font-mono font-bold text-[#2E7D5B] text-sm">${pendingAllocation.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="font-bold text-[#5B6B72] uppercase tracking-wider text-[9px]">Remaining Treasury:</span>
                  <span className="font-mono font-bold text-[#1B4B66]">${pendingAllocation.remaining.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-bold text-[#5B6B72] uppercase tracking-wider text-[9px] block">Disbursement Memorandum:</span>
                <p className="p-2.5 bg-[#F5F6F4] border border-[#E2E4E1] italic text-gray-700">
                  "{pendingAllocation.reason}"
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-[#E2E4E1] p-3.5 bg-gray-50 flex justify-end gap-2">
              <button 
                onClick={() => { setShowConfirmModal(false); setPendingAllocation(null); }}
                className="px-3.5 py-2 border border-[#E2E4E1] hover:bg-gray-100 text-gray-700 font-bold uppercase tracking-wider cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmDisbursement}
                className="px-4 py-2 bg-[#2E7D5B] hover:bg-[#235f45] text-white font-bold uppercase tracking-wider cursor-pointer"
              >
                Confirm & Disburse
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
