import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus, Search, X, Pencil, Trash2,
  Calendar, AlertCircle, CheckCircle2, Clock, ShieldCheck,
  ArrowRight, Filter,
} from 'lucide-react';
import {
  getPunchItems, addPunchItem, updatePunchItem, deletePunchItem,
  getProjects, getSubs, uid,
} from '../store';
import type {
  PunchItem, PunchStatus, Priority, Trade,
} from '../types';
import {
  TRADE_LABELS, PUNCH_STATUS_COLORS, PRIORITY_COLORS,
} from '../types';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ALL_STATUSES: PunchStatus[] = ['open', 'in-progress', 'resolved', 'verified'];
const ALL_PRIORITIES: Priority[] = ['low', 'medium', 'high', 'urgent'];
const ALL_TRADES: Trade[] = [
  'general', 'electrical', 'plumbing', 'hvac', 'drywall',
  'painting', 'flooring', 'roofing', 'framing', 'concrete', 'landscaping',
];

const STATUS_LABELS: Record<PunchStatus, string> = {
  open: 'Open',
  'in-progress': 'In Progress',
  resolved: 'Resolved',
  verified: 'Verified',
};

const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

const STATUS_ICONS: Record<PunchStatus, React.ComponentType<{ className?: string }>> = {
  open: AlertCircle,
  'in-progress': Clock,
  resolved: CheckCircle2,
  verified: ShieldCheck,
};

const PRIORITY_DOTS: Record<Priority, string> = {
  low: 'bg-stone-400',
  medium: 'bg-blue-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
};

/** Status workflow: each status maps to its next status (or null if terminal). */
const NEXT_STATUS: Record<PunchStatus, PunchStatus | null> = {
  open: 'in-progress',
  'in-progress': 'resolved',
  resolved: 'verified',
  verified: null,
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isOverdue(dueDate: string, status: PunchStatus): boolean {
  if (!dueDate) return false;
  if (status === 'verified' || status === 'resolved') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + 'T00:00:00');
  return due < today;
}

function blankItem(): Omit<PunchItem, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    projectId: '',
    unit: '',
    area: '',
    description: '',
    status: 'open',
    priority: 'medium',
    trade: 'general',
    assignedTo: '',
    dueDate: '',
    photos: [],
  };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PunchLists() {
  const [searchParams, setSearchParams] = useSearchParams();

  /* ---- data ---- */
  const [items, setItems] = useState<PunchItem[]>([]);
  const projects = useMemo(() => getProjects(), []);
  const subs = useMemo(() => getSubs(), []);

  function reload() {
    setItems(getPunchItems());
  }
  useEffect(() => { reload(); }, []);

  /* ---- filters ---- */
  const [filterProject, setFilterProject] = useState('');
  const [filterStatus, setFilterStatus] = useState<PunchStatus | ''>('');
  const [filterPriority, setFilterPriority] = useState<Priority | ''>('');
  const [filterTrade, setFilterTrade] = useState<Trade | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  /* ---- form state ---- */
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(blankItem());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  /* Check ?new=true on mount */
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      openNew();
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- filtering ---- */
  const filtered = useMemo(() => {
    let list = items;
    if (filterProject) list = list.filter(i => i.projectId === filterProject);
    if (filterStatus) list = list.filter(i => i.status === filterStatus);
    if (filterPriority) list = list.filter(i => i.priority === filterPriority);
    if (filterTrade) list = list.filter(i => i.trade === filterTrade);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(i =>
        i.description.toLowerCase().includes(q) ||
        i.area.toLowerCase().includes(q) ||
        i.unit.toLowerCase().includes(q),
      );
    }
    // Sort: urgent first, then by due date ascending
    const priorityOrder: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
    return [...list].sort((a, b) => {
      const pa = priorityOrder[a.priority] ?? 4;
      const pb = priorityOrder[b.priority] ?? 4;
      if (pa !== pb) return pa - pb;
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });
  }, [items, filterProject, filterStatus, filterPriority, filterTrade, searchQuery]);

  /* ---- grouped by project ---- */
  const grouped = useMemo(() => {
    const map = new Map<string, PunchItem[]>();
    for (const item of filtered) {
      const key = item.projectId;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return map;
  }, [filtered]);

  /* ---- lookups ---- */
  function projectName(id: string): string {
    return projects.find(p => p.id === id)?.name ?? 'Unknown Project';
  }
  function subName(id: string): string {
    if (!id) return 'Unassigned';
    return subs.find(s => s.id === id)?.name ?? 'Unknown Sub';
  }

  /* ---- form helpers ---- */
  function openNew() {
    setEditingId(null);
    setForm(blankItem());
    setShowForm(true);
  }
  function openEdit(item: PunchItem) {
    setEditingId(item.id);
    setForm({
      projectId: item.projectId,
      unit: item.unit,
      area: item.area,
      description: item.description,
      status: item.status,
      priority: item.priority,
      trade: item.trade,
      assignedTo: item.assignedTo,
      dueDate: item.dueDate,
      photos: item.photos,
    });
    setShowForm(true);
  }
  function closeForm() {
    setShowForm(false);
    setEditingId(null);
  }
  function handleSave() {
    const now = new Date().toISOString();
    if (editingId) {
      const existing = items.find(i => i.id === editingId);
      if (!existing) return;
      updatePunchItem({
        ...existing,
        ...form,
        updatedAt: now,
      });
    } else {
      addPunchItem({
        id: uid(),
        ...form,
        createdAt: now,
        updatedAt: now,
      } as PunchItem);
    }
    reload();
    closeForm();
  }
  function handleDelete(id: string) {
    deletePunchItem(id);
    reload();
    setDeleteConfirm(null);
  }
  function advanceStatus(item: PunchItem) {
    const next = NEXT_STATUS[item.status];
    if (!next) return;
    updatePunchItem({ ...item, status: next, updatedAt: new Date().toISOString() });
    reload();
  }

  /* ---- subs filtered by trade in form ---- */
  const filteredSubs = useMemo(() => {
    if (!form.trade) return subs;
    const byTrade = subs.filter(s => s.trade === form.trade);
    return byTrade.length > 0 ? byTrade : subs;
  }, [subs, form.trade]);

  /* ---- active filter count ---- */
  const activeFilterCount = [filterProject, filterStatus, filterPriority, filterTrade, searchQuery.trim()].filter(Boolean).length;

  /* ---------------------------------------------------------------- */
  /*  RENDER                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="space-y-6">

      {/* ---- Header ---- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Punch Lists</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
            {filtered.length} item{filtered.length !== 1 ? 's' : ''}
            {activeFilterCount > 0 && ` (filtered)`}
          </p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-medium text-sm transition-colors min-h-[44px] shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Item
        </button>
      </div>

      {/* ---- Filters ---- */}
      <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-stone-400" />
          <span className="text-sm font-medium text-stone-700 dark:text-stone-300">Filters</span>
          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                setFilterProject('');
                setFilterStatus('');
                setFilterPriority('');
                setFilterTrade('');
                setSearchQuery('');
              }}
              className="ml-auto text-xs text-amber-600 dark:text-amber-400 hover:underline min-h-[44px] flex items-center"
            >
              Clear all
            </button>
          )}
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible">
          {/* Project */}
          <select
            value={filterProject}
            onChange={e => setFilterProject(e.target.value)}
            className="min-w-[160px] shrink-0 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-sm text-stone-800 dark:text-stone-200 px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          >
            <option value="">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* Status */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as PunchStatus | '')}
            className="min-w-[140px] shrink-0 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-sm text-stone-800 dark:text-stone-200 px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          >
            <option value="">All Statuses</option>
            {ALL_STATUSES.map(s => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>

          {/* Priority */}
          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value as Priority | '')}
            className="min-w-[130px] shrink-0 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-sm text-stone-800 dark:text-stone-200 px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          >
            <option value="">All Priorities</option>
            {ALL_PRIORITIES.map(p => (
              <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
            ))}
          </select>

          {/* Trade */}
          <select
            value={filterTrade}
            onChange={e => setFilterTrade(e.target.value as Trade | '')}
            className="min-w-[130px] shrink-0 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-sm text-stone-800 dark:text-stone-200 px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          >
            <option value="">All Trades</option>
            {ALL_TRADES.map(t => (
              <option key={t} value={t}>{TRADE_LABELS[t]}</option>
            ))}
          </select>

          {/* Search */}
          <div className="relative min-w-[200px] shrink-0 flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search description..."
              className="w-full pl-9 pr-8 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-sm text-stone-800 dark:text-stone-200 placeholder:text-stone-400 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ---- Empty state ---- */}
      {filtered.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-stone-400" />
          </div>
          <h3 className="text-lg font-semibold text-stone-700 dark:text-stone-300 mb-1">No punch items found</h3>
          <p className="text-sm text-stone-500 dark:text-stone-400 mb-6">
            {activeFilterCount > 0 ? 'Try adjusting your filters.' : 'Create a punch item to get started.'}
          </p>
          {activeFilterCount === 0 && (
            <button
              onClick={openNew}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium text-sm transition-colors min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              New Item
            </button>
          )}
        </div>
      )}

      {/* ---- Items grouped by project ---- */}
      {Array.from(grouped.entries()).map(([projId, groupItems]) => (
        <div key={projId} className="space-y-3">
          {/* Project group header */}
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wide">
              {projectName(projId)}
            </h2>
            <span className="text-xs text-stone-400 dark:text-stone-500">
              ({groupItems.length})
            </span>
            <div className="flex-1 h-px bg-stone-200 dark:bg-stone-800 ml-2" />
          </div>

          {/* Cards */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {groupItems.map(item => {
              const overdue = isOverdue(item.dueDate, item.status);
              const StatusIcon = STATUS_ICONS[item.status];
              const nextStatus = NEXT_STATUS[item.status];

              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-4 flex flex-col gap-3 transition-shadow hover:shadow-md"
                >
                  {/* Top row: priority dot + description */}
                  <div className="flex items-start gap-2.5">
                    <span
                      className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${PRIORITY_DOTS[item.priority]}`}
                      title={PRIORITY_LABELS[item.priority]}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-stone-900 dark:text-stone-100 leading-snug line-clamp-2">
                        {item.description}
                      </p>
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                        {item.unit}{item.unit && item.area ? ' / ' : ''}{item.area}
                      </p>
                    </div>
                  </div>

                  {/* Badges row */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Status badge */}
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${PUNCH_STATUS_COLORS[item.status]}`}>
                      <StatusIcon className="w-3 h-3" />
                      {STATUS_LABELS[item.status]}
                    </span>

                    {/* Priority badge */}
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${PRIORITY_COLORS[item.priority]}`}>
                      {PRIORITY_LABELS[item.priority]}
                    </span>

                    {/* Trade badge */}
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400">
                      {TRADE_LABELS[item.trade]}
                    </span>
                  </div>

                  {/* Info row: sub + due date */}
                  <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 gap-2">
                    <span className="truncate">
                      {item.assignedTo ? subName(item.assignedTo) : (
                        <span className="italic text-stone-400 dark:text-stone-500">Unassigned</span>
                      )}
                    </span>
                    {item.dueDate && (
                      <span className={`inline-flex items-center gap-1 shrink-0 ${overdue ? 'text-red-600 dark:text-red-400 font-medium' : ''}`}>
                        <Calendar className="w-3 h-3" />
                        {formatDate(item.dueDate)}
                        {overdue && <span className="text-[10px] uppercase font-bold tracking-wide">Overdue</span>}
                      </span>
                    )}
                  </div>

                  {/* Action row */}
                  <div className="flex items-center gap-2 pt-1 border-t border-stone-100 dark:border-stone-800">
                    {/* Advance status button */}
                    {nextStatus && (
                      <button
                        onClick={() => advanceStatus(item)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 px-2 py-1.5 rounded-md hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors min-h-[44px]"
                        title={`Move to ${STATUS_LABELS[nextStatus]}`}
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                        {STATUS_LABELS[nextStatus]}
                      </button>
                    )}
                    {!nextStatus && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400 px-2 py-1.5 min-h-[44px]">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Verified
                      </span>
                    )}

                    <div className="flex-1" />

                    {/* Edit */}
                    <button
                      onClick={() => openEdit(item)}
                      className="p-2 rounded-md text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    {/* Delete */}
                    {deleteConfirm === item.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-red-500 hover:bg-red-600 text-white transition-colors min-h-[44px]"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-2.5 py-1.5 rounded-md text-xs font-medium text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors min-h-[44px]"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(item.id)}
                        className="p-2 rounded-md text-stone-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* ================================================================ */}
      {/*  SLIDE-OVER FORM                                                 */}
      {/* ================================================================ */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeForm}
          />

          {/* Panel */}
          <div className="relative w-full max-w-lg bg-white dark:bg-stone-900 shadow-2xl flex flex-col overflow-hidden animate-slide-in-right">
            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800">
              <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                {editingId ? 'Edit Punch Item' : 'New Punch Item'}
              </h2>
              <button
                onClick={closeForm}
                className="p-2 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Project */}
              <label className="block">
                <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
                  Project <span className="text-red-500">*</span>
                </span>
                <select
                  value={form.projectId}
                  onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}
                  className="mt-1.5 w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-sm text-stone-800 dark:text-stone-200 px-3 py-2.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                >
                  <option value="">Select a project...</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </label>

              {/* Unit + Area */}
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-sm font-medium text-stone-700 dark:text-stone-300">Unit</span>
                  <input
                    type="text"
                    value={form.unit}
                    onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                    placeholder="e.g. Unit 4B"
                    className="mt-1.5 w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-sm text-stone-800 dark:text-stone-200 px-3 py-2.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-amber-500/40 placeholder:text-stone-400"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-stone-700 dark:text-stone-300">Area</span>
                  <input
                    type="text"
                    value={form.area}
                    onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
                    placeholder="e.g. Kitchen"
                    className="mt-1.5 w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-sm text-stone-800 dark:text-stone-200 px-3 py-2.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-amber-500/40 placeholder:text-stone-400"
                  />
                </label>
              </div>

              {/* Description */}
              <label className="block">
                <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
                  Description <span className="text-red-500">*</span>
                </span>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="Describe the punch item..."
                  className="mt-1.5 w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-sm text-stone-800 dark:text-stone-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500/40 placeholder:text-stone-400 resize-none"
                />
              </label>

              {/* Status + Priority */}
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-sm font-medium text-stone-700 dark:text-stone-300">Status</span>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value as PunchStatus }))}
                    className="mt-1.5 w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-sm text-stone-800 dark:text-stone-200 px-3 py-2.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  >
                    {ALL_STATUSES.map(s => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-stone-700 dark:text-stone-300">Priority</span>
                  <select
                    value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: e.target.value as Priority }))}
                    className="mt-1.5 w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-sm text-stone-800 dark:text-stone-200 px-3 py-2.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  >
                    {ALL_PRIORITIES.map(p => (
                      <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Trade */}
              <label className="block">
                <span className="text-sm font-medium text-stone-700 dark:text-stone-300">Trade</span>
                <select
                  value={form.trade}
                  onChange={e => setForm(f => ({ ...f, trade: e.target.value as Trade, assignedTo: '' }))}
                  className="mt-1.5 w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-sm text-stone-800 dark:text-stone-200 px-3 py-2.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                >
                  {ALL_TRADES.map(t => (
                    <option key={t} value={t}>{TRADE_LABELS[t]}</option>
                  ))}
                </select>
              </label>

              {/* Assigned To */}
              <label className="block">
                <span className="text-sm font-medium text-stone-700 dark:text-stone-300">Assigned To</span>
                <select
                  value={form.assignedTo}
                  onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))}
                  className="mt-1.5 w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-sm text-stone-800 dark:text-stone-200 px-3 py-2.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                >
                  <option value="">Unassigned</option>
                  {filteredSubs.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {s.company} ({TRADE_LABELS[s.trade]})
                    </option>
                  ))}
                </select>
              </label>

              {/* Due Date */}
              <label className="block">
                <span className="text-sm font-medium text-stone-700 dark:text-stone-300">Due Date</span>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                  className="mt-1.5 w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-sm text-stone-800 dark:text-stone-200 px-3 py-2.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                />
              </label>
            </div>

            {/* Panel footer */}
            <div className="flex items-center gap-3 px-6 py-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950">
              <button
                onClick={closeForm}
                className="flex-1 px-4 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!form.projectId || !form.description.trim()}
                className="flex-1 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors min-h-[44px] shadow-sm"
              >
                {editingId ? 'Save Changes' : 'Create Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline keyframe for slide-in animation */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.25s ease-out;
        }
      `}</style>
    </div>
  );
}
