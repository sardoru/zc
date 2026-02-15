import { useState } from 'react';
import {
  Plus,
  Search,
  Phone,
  Mail,
  Star,
  Pencil,
  Trash2,
  X,
  HardHat,
  ClipboardList,
  Clock,
  DollarSign,
  Briefcase,
  ChevronDown,
} from 'lucide-react';
import { getSubs, addSub, updateSub, deleteSub, getPunchItems, uid } from '../store';
import type { SubContractor, Trade } from '../types';
import { TRADE_LABELS } from '../types';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const ALL_TRADES = Object.keys(TRADE_LABELS) as Trade[];

const TRADE_BADGE_COLORS: Record<Trade, string> = {
  general: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
  electrical: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  plumbing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  hvac: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  drywall: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
  painting: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  flooring: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  roofing: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  framing: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  concrete: 'bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  landscaping: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + '\u2026';
}

/* ------------------------------------------------------------------ */
/*  Star Rating Display                                                */
/* ------------------------------------------------------------------ */

function StarRating({ rating }: { rating: number }) {
  const stars: React.ReactNode[] = [];
  for (let i = 1; i <= 5; i++) {
    if (i <= Math.floor(rating)) {
      stars.push(
        <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
      );
    } else if (i - rating < 1) {
      // partial star - we show a half via clipping
      stars.push(
        <span key={i} className="relative inline-block w-4 h-4">
          <Star className="absolute inset-0 w-4 h-4 text-stone-300 dark:text-stone-600" />
          <span className="absolute inset-0 overflow-hidden" style={{ width: `${(rating % 1) * 100}%` }}>
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          </span>
        </span>
      );
    } else {
      stars.push(
        <Star key={i} className="w-4 h-4 text-stone-300 dark:text-stone-600" />
      );
    }
  }
  return (
    <span className="inline-flex items-center gap-0.5">
      {stars}
      <span className="ml-1 text-xs font-medium text-stone-600 dark:text-stone-400">
        {rating.toFixed(1)}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Star Rating Selector (for form)                                    */
/* ------------------------------------------------------------------ */

function StarSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value;

  return (
    <span className="inline-flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          type="button"
          key={i}
          className="p-0.5 min-w-[44px] min-h-[44px] flex items-center justify-center"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(null)}
          onClick={() => onChange(i)}
        >
          <Star
            className={`w-6 h-6 transition-colors ${
              i <= display
                ? 'fill-amber-400 text-amber-400'
                : 'text-stone-300 dark:text-stone-600'
            }`}
          />
        </button>
      ))}
      <span className="ml-1 text-sm text-stone-500 dark:text-stone-400">{value}/5</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty State                                                        */
/* ------------------------------------------------------------------ */

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="text-center py-16">
      <HardHat className="w-12 h-12 mx-auto mb-3 text-stone-300 dark:text-stone-600" />
      <h3 className="text-lg font-semibold text-stone-700 dark:text-stone-300 mb-1">
        No subcontractors yet
      </h3>
      <p className="text-sm text-stone-500 dark:text-stone-400 mb-4 max-w-sm mx-auto">
        Add your first subcontractor to start managing your team.
      </p>
      <button
        onClick={onAdd}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium transition-colors min-h-[44px]"
      >
        <Plus className="w-5 h-5" />
        Add Subcontractor
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Form (modal/slide-over)                                            */
/* ------------------------------------------------------------------ */

interface FormData {
  name: string;
  company: string;
  trade: Trade;
  phone: string;
  email: string;
  rate: number;
  rating: number;
  notes: string;
}

const blankForm: FormData = {
  name: '',
  company: '',
  trade: 'general',
  phone: '',
  email: '',
  rate: 0,
  rating: 3,
  notes: '',
};

function SubForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: FormData;
  onSave: (data: FormData) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FormData>(initial);

  function handleChange(field: keyof FormData, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(form);
  }

  const isEditing = initial.name !== '';

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex items-start justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 my-8 sm:my-0 bg-white dark:bg-stone-900 rounded-xl shadow-xl border border-stone-200 dark:border-stone-800 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800 sticky top-0 bg-white dark:bg-stone-900 z-10 rounded-t-xl">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
            {isEditing ? 'Edit Subcontractor' : 'New Subcontractor'}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g. Mike Torres"
              className="w-full px-3 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition min-h-[44px]"
            />
          </div>

          {/* Company */}
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
              Company <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.company}
              onChange={(e) => handleChange('company', e.target.value)}
              placeholder="e.g. Torres Electric"
              className="w-full px-3 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition min-h-[44px]"
            />
          </div>

          {/* Trade */}
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
              Trade <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={form.trade}
                onChange={(e) => handleChange('trade', e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent appearance-none transition min-h-[44px]"
              >
                {ALL_TRADES.map((t) => (
                  <option key={t} value={t}>
                    {TRADE_LABELS[t]}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            </div>
          </div>

          {/* Phone & Email row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="(555) 234-5678"
                className="w-full px-3 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="mike@torreselectric.com"
                className="w-full px-3 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition min-h-[44px]"
              />
            </div>
          </div>

          {/* Hourly Rate */}
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
              Hourly Rate ($)
            </label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={form.rate || ''}
              onChange={(e) => handleChange('rate', parseFloat(e.target.value) || 0)}
              placeholder="85.00"
              className="w-full px-3 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition min-h-[44px]"
            />
          </div>

          {/* Rating */}
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
              Rating
            </label>
            <StarSelector
              value={form.rating}
              onChange={(v) => handleChange('rating', v)}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={3}
              placeholder="Add any notes about this subcontractor..."
              className="w-full px-3 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-y transition"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 font-medium transition-colors min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium transition-colors min-h-[44px]"
            >
              {isEditing ? 'Save Changes' : 'Add Subcontractor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub Card                                                           */
/* ------------------------------------------------------------------ */

function SubCard({
  sub,
  activePunchCount,
  onEdit,
  onDelete,
}: {
  sub: SubContractor;
  activePunchCount: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  // Completion rate: completedJobs / (completedJobs + activePunchCount) as a rough proxy
  const totalEffort = sub.completedJobs + activePunchCount;
  const completionRate = totalEffort > 0 ? Math.round((sub.completedJobs / totalEffort) * 100) : 100;

  function completionBarColor(rate: number): string {
    if (rate >= 80) return 'bg-green-500';
    if (rate >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  }

  return (
    <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 flex flex-col">
      {/* Card header */}
      <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 truncate">
            {sub.name}
          </h3>
          <p className="text-sm text-stone-500 dark:text-stone-400 truncate">
            {sub.company}
          </p>
        </div>
        <span
          className={`flex-shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${TRADE_BADGE_COLORS[sub.trade]}`}
        >
          {TRADE_LABELS[sub.trade]}
        </span>
      </div>

      {/* Contact info */}
      <div className="px-5 pb-3 space-y-1.5">
        {sub.phone && (
          <a
            href={`tel:${sub.phone}`}
            className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors min-h-[32px]"
          >
            <Phone className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{sub.phone}</span>
          </a>
        )}
        {sub.email && (
          <a
            href={`mailto:${sub.email}`}
            className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors min-h-[32px]"
          >
            <Mail className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{sub.email}</span>
          </a>
        )}
      </div>

      {/* Divider */}
      <div className="mx-5 border-t border-stone-100 dark:border-stone-800" />

      {/* Stats grid */}
      <div className="px-5 py-3 grid grid-cols-2 gap-x-4 gap-y-2">
        {/* Hourly Rate */}
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-stone-400 dark:text-stone-500 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-stone-500 dark:text-stone-400">Rate</p>
            <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              {formatCurrency(sub.rate)}/hr
            </p>
          </div>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-stone-400 dark:text-stone-500 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-stone-500 dark:text-stone-400">Rating</p>
            <StarRating rating={sub.rating} />
          </div>
        </div>

        {/* Completed Jobs */}
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-stone-400 dark:text-stone-500 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-stone-500 dark:text-stone-400">Jobs Done</p>
            <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              {sub.completedJobs}
            </p>
          </div>
        </div>

        {/* Avg Response Time */}
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-stone-400 dark:text-stone-500 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-stone-500 dark:text-stone-400">Avg Response</p>
            <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              {sub.avgResponseTime || '\u2014'}
            </p>
          </div>
        </div>

        {/* Active Punch Items */}
        <div className="flex items-center gap-2 col-span-2">
          <ClipboardList className="w-4 h-4 text-stone-400 dark:text-stone-500 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-stone-500 dark:text-stone-400">Active Punch Items</p>
            <p className={`text-sm font-semibold ${activePunchCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-stone-900 dark:text-stone-100'}`}>
              {activePunchCount}
            </p>
          </div>
        </div>
      </div>

      {/* Performance section */}
      <div className="mx-5 border-t border-stone-100 dark:border-stone-800" />
      <div className="px-5 py-3">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-medium text-stone-500 dark:text-stone-400">Completion Rate</p>
          <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">{completionRate}%</p>
        </div>
        <div className="w-full h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${completionBarColor(completionRate)}`}
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>

      {/* Notes */}
      {sub.notes && (
        <>
          <div className="mx-5 border-t border-stone-100 dark:border-stone-800" />
          <div className="px-5 py-3">
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {truncate(sub.notes, 100)}
            </p>
          </div>
        </>
      )}

      {/* Actions */}
      <div className="mt-auto mx-5 border-t border-stone-100 dark:border-stone-800" />
      <div className="px-5 py-3 flex items-center justify-end gap-2">
        <button
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors min-h-[44px] min-w-[44px] justify-center"
        >
          <Pencil className="w-4 h-4" />
          Edit
        </button>
        <button
          onClick={onDelete}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors min-h-[44px] min-w-[44px] justify-center"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page Component                                                */
/* ------------------------------------------------------------------ */

export default function SubContractors() {
  const [subs, setSubs] = useState<SubContractor[]>(() => getSubs());
  const [punchItems] = useState(() => getPunchItems());

  const [tradeFilter, setTradeFilter] = useState<Trade | 'all'>('all');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<SubContractor | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Re-read subs from store
  function refresh() {
    setSubs(getSubs());
  }

  // Compute active punch items per sub (open or in-progress)
  function getActivePunchCount(subId: string): number {
    return punchItems.filter(
      (pi) =>
        pi.assignedTo === subId &&
        (pi.status === 'open' || pi.status === 'in-progress')
    ).length;
  }

  // Filtered subs
  const filtered = subs.filter((s) => {
    if (tradeFilter !== 'all' && s.trade !== tradeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !s.name.toLowerCase().includes(q) &&
        !s.company.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  // Handlers
  function handleAdd() {
    setEditing(null);
    setShowForm(true);
  }

  function handleEdit(sub: SubContractor) {
    setEditing(sub);
    setShowForm(true);
  }

  function handleDelete(sub: SubContractor) {
    if (!window.confirm(`Delete ${sub.name}? This cannot be undone.`)) return;
    deleteSub(sub.id);
    refresh();
  }

  function handleSave(data: FormData) {
    if (editing) {
      // Update existing
      updateSub({
        ...editing,
        name: data.name,
        company: data.company,
        trade: data.trade,
        phone: data.phone,
        email: data.email,
        rate: data.rate,
        rating: data.rating,
        notes: data.notes,
      });
    } else {
      // Create new
      addSub({
        id: uid(),
        name: data.name,
        company: data.company,
        trade: data.trade,
        phone: data.phone,
        email: data.email,
        rate: data.rate,
        rating: data.rating,
        completedJobs: 0,
        avgResponseTime: '\u2014',
        notes: data.notes,
      });
    }
    setShowForm(false);
    setEditing(null);
    refresh();
  }

  function handleCancel() {
    setShowForm(false);
    setEditing(null);
  }

  // Build initial form data for the modal
  const formInitial: FormData = editing
    ? {
        name: editing.name,
        company: editing.company,
        trade: editing.trade,
        phone: editing.phone,
        email: editing.email,
        rate: editing.rate,
        rating: editing.rating,
        notes: editing.notes,
      }
    : { ...blankForm };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100">
            Subcontractors
          </h1>
          <p className="mt-1 text-stone-500 dark:text-stone-400">
            Manage your subcontractor team
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium transition-colors min-h-[44px] self-start sm:self-auto"
        >
          <Plus className="w-5 h-5" />
          Add Subcontractor
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Trade filter */}
        <div className="relative">
          <select
            value={tradeFilter}
            onChange={(e) => setTradeFilter(e.target.value as Trade | 'all')}
            className="w-full sm:w-48 px-3 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent appearance-none transition min-h-[44px] pr-9"
          >
            <option value="all">All Trades</option>
            {ALL_TRADES.map((t) => (
              <option key={t} value={t}>
                {TRADE_LABELS[t]}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or company..."
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition min-h-[44px]"
          />
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 && subs.length === 0 ? (
        <EmptyState onAdd={handleAdd} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Search className="w-10 h-10 mx-auto mb-2 text-stone-300 dark:text-stone-600" />
          <p className="text-stone-500 dark:text-stone-400">
            No subcontractors match your filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((sub) => (
            <SubCard
              key={sub.id}
              sub={sub}
              activePunchCount={getActivePunchCount(sub.id)}
              onEdit={() => handleEdit(sub)}
              onDelete={() => handleDelete(sub)}
            />
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <SubForm
          key={editing?.id ?? 'new'}
          initial={formInitial}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
