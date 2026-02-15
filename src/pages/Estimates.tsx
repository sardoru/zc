import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getEstimates, addEstimate, updateEstimate, deleteEstimate, uid } from '../store';
import type { Estimate, EstimateLineItem, Trade } from '../types';
import { TRADE_LABELS, DEFAULT_LABOR_RATES } from '../types';
import {
  Plus, X, Trash2, Calculator, ChevronDown, ChevronUp,
  FileText, Save, Zap, ArrowLeft,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PROJECT_TYPES = [
  'Renovation',
  'Remodel',
  'New Construction',
  'Commercial Build-Out',
  'Addition',
] as const;

const ESTIMATE_STATUSES = ['draft', 'sent', 'approved', 'rejected'] as const;

const STATUS_BADGE: Record<Estimate['status'], string> = {
  draft: 'bg-stone-100 text-stone-700 dark:bg-stone-700 dark:text-stone-200',
  sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const TRADES = Object.keys(TRADE_LABELS) as Trade[];

/** Simple rate factor used by the Quick Estimator (rate * sqft / 100). */
const QUICK_RATE_FACTOR: Record<Trade, number> = {
  general: 3.5,
  electrical: 6.0,
  plumbing: 5.5,
  hvac: 7.0,
  drywall: 3.0,
  painting: 2.5,
  flooring: 4.5,
  roofing: 5.0,
  framing: 4.0,
  concrete: 5.5,
  landscaping: 3.0,
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmt(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtFull(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function lineTotal(li: EstimateLineItem): number {
  return li.manHours * li.laborRate * li.quantity + li.materialCost * li.quantity;
}

function laborSubtotal(items: EstimateLineItem[]): number {
  return items.reduce((s, li) => s + li.manHours * li.laborRate * li.quantity, 0);
}

function materialSubtotal(items: EstimateLineItem[]): number {
  return items.reduce((s, li) => s + li.materialCost * li.quantity, 0);
}

function grandTotal(items: EstimateLineItem[]): number {
  return items.reduce((s, li) => s + lineTotal(li), 0);
}

function blankEstimate(): Estimate {
  const now = new Date().toISOString();
  return {
    id: uid(),
    clientName: '',
    clientEmail: '',
    projectType: PROJECT_TYPES[0],
    sqFootage: 0,
    scopeItems: [],
    lineItems: [],
    notes: '',
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  };
}

function defaultLineItem(trade: Trade): EstimateLineItem {
  return {
    id: uid(),
    description: `${TRADE_LABELS[trade]} work`,
    trade,
    manHours: 8,
    laborRate: DEFAULT_LABOR_RATES[trade],
    materialCost: 0,
    quantity: 1,
  };
}

/* ------------------------------------------------------------------ */
/*  Quick Estimator Banner                                             */
/* ------------------------------------------------------------------ */

function QuickEstimator() {
  const [sqft, setSqft] = useState<number>(0);
  const [selectedTrades, setSelectedTrades] = useState<Trade[]>([]);
  const [open, setOpen] = useState(false);

  function toggleTrade(t: Trade) {
    setSelectedTrades(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  }

  const estimate = useMemo(() => {
    if (!sqft || selectedTrades.length === 0) return 0;
    return selectedTrades.reduce((sum, t) => sum + sqft * QUICK_RATE_FACTOR[t], 0);
  }, [sqft, selectedTrades]);

  return (
    <div className="bg-gradient-to-r from-amber-500 to-orange-500 dark:from-amber-600 dark:to-orange-600 rounded-xl p-4 md:p-6 text-white mb-6 shadow-md">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-left min-h-[44px]"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg leading-tight">Quick Estimator</h3>
            <p className="text-amber-100 text-sm">Get an instant ballpark number for your next project</p>
          </div>
        </div>
        {open ? <ChevronUp className="w-5 h-5 shrink-0" /> : <ChevronDown className="w-5 h-5 shrink-0" />}
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          {/* Square footage */}
          <div>
            <label className="block text-sm font-medium text-amber-100 mb-1">Square Footage</label>
            <input
              type="number"
              min={0}
              value={sqft || ''}
              onChange={e => setSqft(Number(e.target.value))}
              placeholder="e.g. 2000"
              className="w-full md:w-60 rounded-lg border border-white/30 bg-white/20 placeholder:text-white/60 text-white px-3 py-2.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-white/50"
            />
          </div>

          {/* Scope checkboxes */}
          <div>
            <label className="block text-sm font-medium text-amber-100 mb-2">Scope of Work</label>
            <div className="flex flex-wrap gap-2">
              {TRADES.map(t => (
                <button
                  key={t}
                  onClick={() => toggleTrade(t)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors min-h-[44px] ${
                    selectedTrades.includes(t)
                      ? 'bg-white text-amber-700'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  {TRADE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Result */}
          {estimate > 0 && (
            <div className="bg-white/20 rounded-lg p-4 flex items-center justify-between">
              <div>
                <div className="text-amber-100 text-sm">Ballpark Estimate</div>
                <div className="text-3xl font-bold tracking-tight">{fmt(estimate)}</div>
              </div>
              <div className="text-amber-100 text-xs text-right max-w-[200px]">
                Based on {sqft.toLocaleString()} sq ft with {selectedTrades.length} trade{selectedTrades.length !== 1 ? 's' : ''}. Actual pricing may vary.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Estimate Card                                                      */
/* ------------------------------------------------------------------ */

function EstimateCard({ est, onEdit, onDelete }: { est: Estimate; onEdit: () => void; onDelete: () => void }) {
  const total = grandTotal(est.lineItems);

  return (
    <div
      className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-4 md:p-5 cursor-pointer hover:shadow-md transition-shadow"
      onClick={onEdit}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onEdit(); }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-stone-900 dark:text-stone-100 truncate">{est.clientName || 'Unnamed Client'}</h3>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">{est.projectType} &middot; {est.sqFootage.toLocaleString()} sq ft</p>
        </div>
        <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_BADGE[est.status]}`}>
          {est.status}
        </span>
      </div>

      <div className="mt-3 flex items-end justify-between">
        <div>
          <div className="text-2xl font-bold text-stone-900 dark:text-stone-100">{fmt(total)}</div>
          <div className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
            {new Date(est.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-stone-400 hover:text-red-500 dark:text-stone-500 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
          title="Delete estimate"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Estimate Form                                                      */
/* ------------------------------------------------------------------ */

function EstimateForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Estimate;
  onSave: (e: Estimate) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Estimate>({ ...initial, lineItems: initial.lineItems.map(li => ({ ...li })) });

  /* Convenience updaters */
  function patch(fields: Partial<Estimate>) {
    setForm(prev => ({ ...prev, ...fields }));
  }

  /* Scope toggle: also auto-generates / removes line items */
  function toggleScope(trade: Trade) {
    const label = TRADE_LABELS[trade];
    const has = form.scopeItems.includes(label);
    let nextScope: string[];
    let nextLines: EstimateLineItem[];

    if (has) {
      nextScope = form.scopeItems.filter(s => s !== label);
      nextLines = form.lineItems.filter(li => li.trade !== trade);
    } else {
      nextScope = [...form.scopeItems, label];
      // Only add a default line item if none exist for this trade
      const alreadyHas = form.lineItems.some(li => li.trade === trade);
      nextLines = alreadyHas ? form.lineItems : [...form.lineItems, defaultLineItem(trade)];
    }
    setForm(prev => ({ ...prev, scopeItems: nextScope, lineItems: nextLines }));
  }

  /* Line item helpers */
  function updateLine(id: string, fields: Partial<EstimateLineItem>) {
    setForm(prev => ({
      ...prev,
      lineItems: prev.lineItems.map(li => li.id === id ? { ...li, ...fields } : li),
    }));
  }

  function removeLine(id: string) {
    setForm(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter(li => li.id !== id),
    }));
  }

  function addLine() {
    setForm(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, { id: uid(), description: '', trade: 'general', manHours: 0, laborRate: DEFAULT_LABOR_RATES.general, materialCost: 0, quantity: 1 }],
    }));
  }

  function handleSave() {
    onSave({ ...form, updatedAt: new Date().toISOString() });
  }

  const labor = laborSubtotal(form.lineItems);
  const materials = materialSubtotal(form.lineItems);
  const total = labor + materials;

  return (
    <div className="space-y-6">
      {/* Back / title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onCancel}
          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-stone-500 dark:text-stone-400"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
          {initial.clientName ? 'Edit Estimate' : 'New Estimate'}
        </h2>
      </div>

      {/* Client Info */}
      <section className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-4 md:p-6 space-y-4">
        <h3 className="font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
          <FileText className="w-4 h-4 text-amber-500" /> Client Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1">Client Name</label>
            <input
              type="text"
              value={form.clientName}
              onChange={e => patch({ clientName: e.target.value })}
              placeholder="Full name or company"
              className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2.5 min-h-[44px] text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1">Client Email</label>
            <input
              type="email"
              value={form.clientEmail}
              onChange={e => patch({ clientEmail: e.target.value })}
              placeholder="email@example.com"
              className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2.5 min-h-[44px] text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
            />
          </div>
        </div>
      </section>

      {/* Project Info */}
      <section className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-4 md:p-6 space-y-4">
        <h3 className="font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
          <Calculator className="w-4 h-4 text-amber-500" /> Project Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1">Project Type</label>
            <select
              value={form.projectType}
              onChange={e => patch({ projectType: e.target.value })}
              className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2.5 min-h-[44px] text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
            >
              {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1">Square Footage</label>
            <input
              type="number"
              min={0}
              value={form.sqFootage || ''}
              onChange={e => patch({ sqFootage: Number(e.target.value) })}
              placeholder="0"
              className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2.5 min-h-[44px] text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
            />
          </div>
        </div>
      </section>

      {/* Scope of Work */}
      <section className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-4 md:p-6 space-y-4">
        <h3 className="font-semibold text-stone-900 dark:text-stone-100">Scope of Work</h3>
        <div className="flex flex-wrap gap-2">
          {TRADES.map(t => {
            const checked = form.scopeItems.includes(TRADE_LABELS[t]);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleScope(t)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors min-h-[44px] border ${
                  checked
                    ? 'bg-amber-500 border-amber-500 text-white'
                    : 'bg-white dark:bg-stone-800 border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-400'
                }`}
              >
                {TRADE_LABELS[t]}
              </button>
            );
          })}
        </div>
      </section>

      {/* Line Items */}
      <section className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-stone-900 dark:text-stone-100">Line Items</h3>
          <button
            onClick={addLine}
            className="flex items-center gap-1.5 text-sm font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 min-h-[44px] px-2 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Row
          </button>
        </div>

        {form.lineItems.length === 0 ? (
          <p className="text-sm text-stone-400 dark:text-stone-500 py-4 text-center">No line items yet. Check scope items above or add a row manually.</p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-stone-500 dark:text-stone-400 border-b border-stone-200 dark:border-stone-700">
                    <th className="pb-2 pr-2 font-medium">Description</th>
                    <th className="pb-2 pr-2 font-medium w-28">Trade</th>
                    <th className="pb-2 pr-2 font-medium w-20 text-right">Hours</th>
                    <th className="pb-2 pr-2 font-medium w-24 text-right">Rate</th>
                    <th className="pb-2 pr-2 font-medium w-28 text-right">Materials</th>
                    <th className="pb-2 pr-2 font-medium w-16 text-right">Qty</th>
                    <th className="pb-2 pr-2 font-medium w-28 text-right">Total</th>
                    <th className="pb-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {form.lineItems.map(li => (
                    <tr key={li.id} className="group">
                      <td className="py-2 pr-2">
                        <input
                          type="text"
                          value={li.description}
                          onChange={e => updateLine(li.id, { description: e.target.value })}
                          className="w-full bg-transparent border-0 p-0 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-0 placeholder:text-stone-400"
                          placeholder="Description"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <select
                          value={li.trade}
                          onChange={e => updateLine(li.id, { trade: e.target.value as Trade, laborRate: DEFAULT_LABOR_RATES[e.target.value as Trade] })}
                          className="w-full bg-transparent border-0 p-0 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-0"
                        >
                          {TRADES.map(t => <option key={t} value={t}>{TRADE_LABELS[t]}</option>)}
                        </select>
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min={0}
                          value={li.manHours || ''}
                          onChange={e => updateLine(li.id, { manHours: Number(e.target.value) })}
                          className="w-full bg-transparent border-0 p-0 text-right text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-0"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={li.laborRate || ''}
                          onChange={e => updateLine(li.id, { laborRate: Number(e.target.value) })}
                          className="w-full bg-transparent border-0 p-0 text-right text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-0"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={li.materialCost || ''}
                          onChange={e => updateLine(li.id, { materialCost: Number(e.target.value) })}
                          className="w-full bg-transparent border-0 p-0 text-right text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-0"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min={1}
                          value={li.quantity || ''}
                          onChange={e => updateLine(li.id, { quantity: Number(e.target.value) })}
                          className="w-full bg-transparent border-0 p-0 text-right text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-0"
                        />
                      </td>
                      <td className="py-2 pr-2 text-right font-medium text-stone-900 dark:text-stone-100 whitespace-nowrap">
                        {fmtFull(lineTotal(li))}
                      </td>
                      <td className="py-2">
                        <button
                          onClick={() => removeLine(li.id)}
                          className="p-1 min-h-[44px] min-w-[44px] flex items-center justify-center text-stone-400 hover:text-red-500 dark:text-stone-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity rounded"
                          title="Remove row"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards for line items */}
            <div className="md:hidden space-y-3">
              {form.lineItems.map(li => (
                <div key={li.id} className="bg-stone-50 dark:bg-stone-800 rounded-lg p-3 space-y-3 relative">
                  <button
                    onClick={() => removeLine(li.id)}
                    className="absolute top-2 right-2 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-stone-400 hover:text-red-500 dark:text-stone-500 dark:hover:text-red-400 transition-colors"
                    title="Remove"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div>
                    <label className="text-xs text-stone-500 dark:text-stone-400">Description</label>
                    <input
                      type="text"
                      value={li.description}
                      onChange={e => updateLine(li.id, { description: e.target.value })}
                      className="w-full rounded-md border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 px-2.5 py-2 min-h-[44px] text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                      placeholder="Description"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-stone-500 dark:text-stone-400">Trade</label>
                      <select
                        value={li.trade}
                        onChange={e => updateLine(li.id, { trade: e.target.value as Trade, laborRate: DEFAULT_LABOR_RATES[e.target.value as Trade] })}
                        className="w-full rounded-md border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 px-2.5 py-2 min-h-[44px] text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                      >
                        {TRADES.map(t => <option key={t} value={t}>{TRADE_LABELS[t]}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-stone-500 dark:text-stone-400">Qty</label>
                      <input
                        type="number"
                        min={1}
                        value={li.quantity || ''}
                        onChange={e => updateLine(li.id, { quantity: Number(e.target.value) })}
                        className="w-full rounded-md border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 px-2.5 py-2 min-h-[44px] text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-stone-500 dark:text-stone-400">Hours</label>
                      <input
                        type="number"
                        min={0}
                        value={li.manHours || ''}
                        onChange={e => updateLine(li.id, { manHours: Number(e.target.value) })}
                        className="w-full rounded-md border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 px-2.5 py-2 min-h-[44px] text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-stone-500 dark:text-stone-400">Rate</label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={li.laborRate || ''}
                        onChange={e => updateLine(li.id, { laborRate: Number(e.target.value) })}
                        className="w-full rounded-md border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 px-2.5 py-2 min-h-[44px] text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-stone-500 dark:text-stone-400">Materials</label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={li.materialCost || ''}
                        onChange={e => updateLine(li.id, { materialCost: Number(e.target.value) })}
                        className="w-full rounded-md border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 px-2.5 py-2 min-h-[44px] text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                      />
                    </div>
                  </div>
                  <div className="text-right font-semibold text-stone-900 dark:text-stone-100 text-sm">
                    Line Total: {fmtFull(lineTotal(li))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Totals */}
      <section className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-4 md:p-6">
        <div className="max-w-xs ml-auto space-y-2 text-sm">
          <div className="flex justify-between text-stone-600 dark:text-stone-400">
            <span>Subtotal (Labor)</span>
            <span className="font-medium text-stone-900 dark:text-stone-100">{fmtFull(labor)}</span>
          </div>
          <div className="flex justify-between text-stone-600 dark:text-stone-400">
            <span>Subtotal (Materials)</span>
            <span className="font-medium text-stone-900 dark:text-stone-100">{fmtFull(materials)}</span>
          </div>
          <div className="border-t border-stone-200 dark:border-stone-700 pt-2 flex justify-between font-bold text-base text-stone-900 dark:text-stone-100">
            <span>Grand Total</span>
            <span>{fmtFull(total)}</span>
          </div>
        </div>
      </section>

      {/* Notes & Status */}
      <section className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-4 md:p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={e => patch({ notes: e.target.value })}
            rows={3}
            placeholder="Additional notes, exclusions, terms..."
            className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2.5 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 resize-y"
          />
        </div>
        <div className="max-w-xs">
          <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1">Status</label>
          <select
            value={form.status}
            onChange={e => patch({ status: e.target.value as Estimate['status'] })}
            className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2.5 min-h-[44px] text-stone-900 dark:text-stone-100 capitalize focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
          >
            {ESTIMATE_STATUSES.map(s => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
      </section>

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-3 pb-4">
        <button
          onClick={onCancel}
          className="px-5 py-2.5 min-h-[44px] rounded-lg text-sm font-medium text-stone-600 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-lg text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 transition-colors shadow-sm"
        >
          <Save className="w-4 h-4" /> Save Estimate
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function Estimates() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [estimates, setEstimatesState] = useState<Estimate[]>(() => getEstimates());
  const [editing, setEditing] = useState<Estimate | null>(null);
  const [isNew, setIsNew] = useState(false);

  /* Check ?new=true on mount */
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setEditing(blankEstimate());
      setIsNew(true);
      // Clean the param so refreshing does not re-open
      setSearchParams({}, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function refresh() {
    setEstimatesState(getEstimates());
  }

  function handleNew() {
    setEditing(blankEstimate());
    setIsNew(true);
  }

  function handleEdit(est: Estimate) {
    setEditing(est);
    setIsNew(false);
  }

  function handleSave(est: Estimate) {
    if (isNew) {
      addEstimate(est);
    } else {
      updateEstimate(est);
    }
    refresh();
    setEditing(null);
    setIsNew(false);
  }

  function handleDelete(id: string) {
    if (!window.confirm('Delete this estimate? This cannot be undone.')) return;
    deleteEstimate(id);
    refresh();
  }

  function handleCancel() {
    setEditing(null);
    setIsNew(false);
  }

  /* If editing, show the form full-page */
  if (editing) {
    return (
      <EstimateForm
        key={editing.id}
        initial={editing}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Estimates</h1>
        <button
          onClick={handleNew}
          className="flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> New Estimate
        </button>
      </div>

      {/* Quick Estimator */}
      <QuickEstimator />

      {/* Estimate cards */}
      {estimates.length === 0 ? (
        <div className="text-center py-16">
          <Calculator className="w-12 h-12 mx-auto text-stone-300 dark:text-stone-600 mb-3" />
          <h3 className="text-lg font-semibold text-stone-600 dark:text-stone-400">No estimates yet</h3>
          <p className="text-sm text-stone-400 dark:text-stone-500 mt-1 mb-4">Create your first estimate to get started.</p>
          <button
            onClick={handleNew}
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Estimate
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {estimates.map(est => (
            <EstimateCard
              key={est.id}
              est={est}
              onEdit={() => handleEdit(est)}
              onDelete={() => handleDelete(est.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
