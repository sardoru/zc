import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, X, Pencil, Trash2, MapPin, Calendar, DollarSign, Ruler } from 'lucide-react';
import { getProjects, addProject, updateProject, deleteProject, uid } from '../store';
import type { Project, ProjectStatus } from '../types';
import { STATUS_COLORS } from '../types';

const STATUS_OPTIONS: { value: 'all' | ProjectStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'on-hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

const STATUS_SELECT_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'on-hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

const currencyFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const numberFmt = new Intl.NumberFormat('en-US');

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface ProjectFormData {
  name: string;
  client: string;
  address: string;
  type: string;
  sqFootage: string;
  status: ProjectStatus;
  startDate: string;
  endDate: string;
  budget: string;
  notes: string;
}

const emptyForm: ProjectFormData = {
  name: '',
  client: '',
  address: '',
  type: '',
  sqFootage: '',
  status: 'planning',
  startDate: '',
  endDate: '',
  budget: '',
  notes: '',
};

function formFromProject(p: Project): ProjectFormData {
  return {
    name: p.name,
    client: p.client,
    address: p.address,
    type: p.type,
    sqFootage: String(p.sqFootage),
    status: p.status,
    startDate: p.startDate,
    endDate: p.endDate ?? '',
    budget: String(p.budget),
    notes: p.notes,
  };
}

export default function Projects() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjectsList] = useState<Project[]>(() => getProjects());
  const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProjectFormData>(emptyForm);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const refreshProjects = useCallback(() => {
    setProjectsList(getProjects());
  }, []);

  // Auto-open form when ?new=true
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setEditingId(null);
      setForm(emptyForm);
      setPanelOpen(true);
      // Clear the param so refresh doesn't re-open
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const openNewForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setPanelOpen(true);
  };

  const openEditForm = (project: Project) => {
    setEditingId(project.id);
    setForm(formFromProject(project));
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSave = () => {
    const trimmedName = form.name.trim();
    if (!trimmedName) return;

    const now = new Date().toISOString();
    const sqFootage = parseInt(form.sqFootage, 10) || 0;
    const budget = parseFloat(form.budget) || 0;

    if (editingId) {
      // Update existing
      const existing = projects.find((p) => p.id === editingId);
      if (!existing) return;
      const updated: Project = {
        ...existing,
        name: trimmedName,
        client: form.client.trim(),
        address: form.address.trim(),
        type: form.type.trim(),
        sqFootage,
        status: form.status,
        startDate: form.startDate,
        endDate: form.endDate || undefined,
        budget,
        notes: form.notes.trim(),
        updatedAt: now,
      };
      updateProject(updated);
    } else {
      // Create new
      const newProject: Project = {
        id: uid(),
        name: trimmedName,
        client: form.client.trim(),
        address: form.address.trim(),
        type: form.type.trim(),
        sqFootage,
        status: form.status,
        startDate: form.startDate,
        endDate: form.endDate || undefined,
        budget,
        spent: 0,
        notes: form.notes.trim(),
        createdAt: now,
        updatedAt: now,
      };
      addProject(newProject);
    }

    refreshProjects();
    closePanel();
  };

  const handleDelete = (id: string) => {
    deleteProject(id);
    refreshProjects();
    setConfirmDeleteId(null);
  };

  const updateField = <K extends keyof ProjectFormData>(field: K, value: ProjectFormData[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Filtered projects
  const filtered = projects.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.client.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Projects</h1>
        <button
          onClick={openNewForm}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-medium text-sm rounded-lg transition-colors min-h-[44px] shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {/* Filter bar */}
      <div className="space-y-3">
        {/* Status pills */}
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors min-h-[44px] sm:min-h-0 ${
                statusFilter === opt.value
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search by project name or client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 min-h-[44px]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Project cards grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-stone-400 dark:text-stone-500 text-sm">
            {projects.length === 0
              ? 'No projects yet. Create your first project to get started.'
              : 'No projects match your current filters.'}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((project) => {
            const budgetPct = project.budget > 0 ? Math.min((project.spent / project.budget) * 100, 100) : 0;
            const isOverBudget = project.spent > project.budget && project.budget > 0;

            return (
              <div
                key={project.id}
                className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-5 flex flex-col gap-3 hover:shadow-md transition-shadow"
              >
                {/* Top row: name + status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-stone-900 dark:text-stone-100 truncate">
                      {project.name}
                    </h3>
                    <p className="text-sm text-stone-500 dark:text-stone-400 truncate">
                      {project.client}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[project.status]}`}
                  >
                    {project.status === 'on-hold' ? 'On Hold' : project.status}
                  </span>
                </div>

                {/* Address */}
                {project.address && (
                  <div className="flex items-center gap-1.5 text-sm text-stone-500 dark:text-stone-400">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{project.address}</span>
                  </div>
                )}

                {/* Type and sq footage */}
                <div className="flex items-center gap-3 text-sm text-stone-600 dark:text-stone-400">
                  {project.type && (
                    <span className="bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded text-xs font-medium">
                      {project.type}
                    </span>
                  )}
                  {project.sqFootage > 0 && (
                    <span className="flex items-center gap-1 text-xs">
                      <Ruler className="w-3.5 h-3.5" />
                      {numberFmt.format(project.sqFootage)} sq ft
                    </span>
                  )}
                </div>

                {/* Budget progress bar */}
                {project.budget > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-stone-500 dark:text-stone-400 flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        Budget
                      </span>
                      <span
                        className={`font-medium ${
                          isOverBudget
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-stone-700 dark:text-stone-300'
                        }`}
                      >
                        {currencyFmt.format(project.spent)} / {currencyFmt.format(project.budget)}
                      </span>
                    </div>
                    <div className="h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isOverBudget ? 'bg-red-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${budgetPct}%` }}
                      />
                    </div>
                    <div className="text-right text-xs text-stone-400 dark:text-stone-500">
                      {budgetPct.toFixed(0)}% spent
                    </div>
                  </div>
                )}

                {/* Dates */}
                <div className="flex items-center gap-4 text-xs text-stone-500 dark:text-stone-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Started {formatDate(project.startDate)}
                  </span>
                  {project.endDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Ended {formatDate(project.endDate)}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-stone-100 dark:border-stone-800 mt-auto">
                  <button
                    onClick={() => openEditForm(project)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors min-h-[44px]"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  {confirmDeleteId === project.id ? (
                    <div className="flex items-center gap-2 ml-auto">
                      <span className="text-xs text-red-600 dark:text-red-400">Delete?</span>
                      <button
                        onClick={() => handleDelete(project.id)}
                        className="px-3 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors min-h-[44px]"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-3 py-2 text-sm font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors min-h-[44px]"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(project.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors min-h-[44px] ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Slide-over Panel */}
      {panelOpen && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 transition-opacity"
            onClick={closePanel}
          />

          {/* Panel */}
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-lg bg-white dark:bg-stone-900 shadow-2xl flex flex-col animate-slide-in-right">
            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800">
              <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                {editingId ? 'Edit Project' : 'New Project'}
              </h2>
              <button
                onClick={closePanel}
                className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Panel body (scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="e.g. Riverside Apartments Renovation"
                  className="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 min-h-[44px]"
                />
              </div>

              {/* Client */}
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                  Client
                </label>
                <input
                  type="text"
                  value={form.client}
                  onChange={(e) => updateField('client', e.target.value)}
                  placeholder="Client name"
                  className="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 min-h-[44px]"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                  Address
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  placeholder="Project address"
                  className="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 min-h-[44px]"
                />
              </div>

              {/* Type and Sq Footage row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                    Type
                  </label>
                  <input
                    type="text"
                    value={form.type}
                    onChange={(e) => updateField('type', e.target.value)}
                    placeholder="e.g. Renovation, Remodel"
                    className="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                    Sq Footage
                  </label>
                  <input
                    type="number"
                    value={form.sqFootage}
                    onChange={(e) => updateField('sqFootage', e.target.value)}
                    placeholder="0"
                    min="0"
                    className="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 min-h-[44px]"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => updateField('status', e.target.value as ProjectStatus)}
                  className="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 min-h-[44px]"
                >
                  {STATUS_SELECT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dates row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => updateField('startDate', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => updateField('endDate', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 min-h-[44px]"
                  />
                </div>
              </div>

              {/* Budget */}
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                  Budget
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="number"
                    value={form.budget}
                    onChange={(e) => updateField('budget', e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="100"
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 min-h-[44px]"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                  Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  placeholder="Additional project notes..."
                  rows={4}
                  className="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 resize-vertical"
                />
              </div>
            </div>

            {/* Panel footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-stone-200 dark:border-stone-800">
              <button
                onClick={closePanel}
                className="px-4 py-2.5 text-sm font-medium text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg transition-colors min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!form.name.trim()}
                className="px-5 py-2.5 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors min-h-[44px] shadow-sm"
              >
                {editingId ? 'Save Changes' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline keyframes for slide-in animation */}
      <style>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.25s ease-out;
        }
      `}</style>
    </div>
  );
}
