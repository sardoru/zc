import { useState, useMemo } from 'react';
import {
  FileText,
  FolderKanban,
  ClipboardList,
  DollarSign,
  Printer,
  ChevronDown,
  Eye,
  Building2,
} from 'lucide-react';
import { getProjects, getEstimates, getPunchItems, getSettings, getSubs } from '../store';
import type { Project, Estimate } from '../types';
import { TRADE_LABELS, PUNCH_STATUS_COLORS } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(iso: string): string {
  if (!iso) return '---';
  const date = new Date(iso + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function todayFormatted(): string {
  return new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ExportType = 'estimate' | 'project' | 'punch' | 'financial';
type PunchStatusFilter = 'all' | 'open' | 'in-progress' | 'resolved' | 'verified';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PDFExport() {
  const projects = useMemo(() => getProjects(), []);
  const estimates = useMemo(() => getEstimates(), []);
  const punchItems = useMemo(() => getPunchItems(), []);
  const settings = useMemo(() => getSettings(), []);
  const subs = useMemo(() => getSubs(), []);

  const [exportType, setExportType] = useState<ExportType | null>(null);
  const [selectedEstimateId, setSelectedEstimateId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [punchProjectFilter, setPunchProjectFilter] = useState<string>('all');
  const [punchStatusFilter, setPunchStatusFilter] = useState<PunchStatusFilter>('all');

  // Derived data
  const selectedEstimate = estimates.find((e) => e.id === selectedEstimateId) ?? null;
  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;

  const filteredPunchItems = useMemo(() => {
    let items = punchItems;
    if (punchProjectFilter !== 'all') {
      items = items.filter((pi) => pi.projectId === punchProjectFilter);
    }
    if (punchStatusFilter !== 'all') {
      items = items.filter((pi) => pi.status === punchStatusFilter);
    }
    return items;
  }, [punchItems, punchProjectFilter, punchStatusFilter]);

  const showPreview =
    (exportType === 'estimate' && selectedEstimate) ||
    (exportType === 'project' && selectedProject) ||
    exportType === 'punch' ||
    exportType === 'financial';

  function handlePrint() {
    window.print();
  }

  function getSubName(subId: string): string {
    const sub = subs.find((s) => s.id === subId);
    return sub ? sub.name : 'Unassigned';
  }

  function getProjectName(projectId: string): string {
    const project = projects.find((p) => p.id === projectId);
    return project?.name ?? 'Unknown Project';
  }

  // Compute line item totals for an estimate
  function lineItemTotal(item: { manHours: number; laborRate: number; materialCost: number; quantity: number }): number {
    return (item.manHours * item.laborRate + item.materialCost) * item.quantity;
  }

  function estimateSubtotalLabor(est: Estimate): number {
    return est.lineItems.reduce((sum, li) => sum + li.manHours * li.laborRate * li.quantity, 0);
  }

  function estimateSubtotalMaterials(est: Estimate): number {
    return est.lineItems.reduce((sum, li) => sum + li.materialCost * li.quantity, 0);
  }

  function estimateGrandTotal(est: Estimate): number {
    return est.lineItems.reduce((sum, li) => sum + lineItemTotal(li), 0);
  }

  // ---------------------------------------------------------------------------
  // Shared print-ready company header
  // ---------------------------------------------------------------------------
  function CompanyHeader({ title }: { title: string }) {
    return (
      <div className="mb-8">
        <div className="flex items-start justify-between border-b-2 border-stone-800 pb-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">{settings.companyName}</h1>
            <p className="text-sm text-stone-600 mt-1">{settings.address}</p>
            <p className="text-sm text-stone-600">
              {settings.phone} &nbsp;|&nbsp; {settings.email}
            </p>
          </div>
          {settings.logo && (
            <img src={settings.logo} alt="Company Logo" className="h-14 w-auto object-contain" />
          )}
        </div>
        <h2 className="text-xl font-bold text-stone-900 tracking-wide uppercase text-center">
          {title}
        </h2>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Estimate PDF Preview
  // ---------------------------------------------------------------------------
  function EstimatePreview({ estimate }: { estimate: Estimate }) {
    const totalHours = estimate.lineItems.reduce((s, li) => s + li.manHours * li.quantity, 0);
    return (
      <div>
        <CompanyHeader title="Estimate" />

        {/* Meta row */}
        <div className="flex flex-wrap justify-between text-sm mb-6">
          <div>
            <p className="text-stone-500">Estimate #</p>
            <p className="font-semibold text-stone-900">{estimate.id.toUpperCase()}</p>
          </div>
          <div>
            <p className="text-stone-500">Date</p>
            <p className="font-semibold text-stone-900">{formatDate(estimate.createdAt.split('T')[0])}</p>
          </div>
          <div>
            <p className="text-stone-500">Status</p>
            <p className="font-semibold text-stone-900 capitalize">{estimate.status}</p>
          </div>
        </div>

        {/* Client info */}
        <div className="bg-stone-50 rounded-lg p-4 mb-6 border border-stone-200">
          <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Bill To</h3>
          <p className="font-semibold text-stone-900">{estimate.clientName}</p>
          <p className="text-sm text-stone-600">{estimate.clientEmail}</p>
          <p className="text-sm text-stone-600 mt-1">
            Project Type: {estimate.projectType} &nbsp;|&nbsp; {estimate.sqFootage.toLocaleString()} sq ft
          </p>
        </div>

        {/* Line items table */}
        <table className="w-full text-sm border-collapse mb-6">
          <thead>
            <tr className="bg-stone-800 text-white">
              <th className="text-left px-3 py-2 font-semibold">#</th>
              <th className="text-left px-3 py-2 font-semibold">Description</th>
              <th className="text-left px-3 py-2 font-semibold">Trade</th>
              <th className="text-right px-3 py-2 font-semibold">Hours</th>
              <th className="text-right px-3 py-2 font-semibold">Rate</th>
              <th className="text-right px-3 py-2 font-semibold">Materials</th>
              <th className="text-right px-3 py-2 font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {estimate.lineItems.map((li, idx) => (
              <tr key={li.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-stone-50'}>
                <td className="px-3 py-2 border-b border-stone-200 text-stone-600">{idx + 1}</td>
                <td className="px-3 py-2 border-b border-stone-200 text-stone-900 font-medium">{li.description}</td>
                <td className="px-3 py-2 border-b border-stone-200 text-stone-600">{TRADE_LABELS[li.trade]}</td>
                <td className="px-3 py-2 border-b border-stone-200 text-right text-stone-700">{(li.manHours * li.quantity).toLocaleString()}</td>
                <td className="px-3 py-2 border-b border-stone-200 text-right text-stone-700">{formatCurrency(li.laborRate)}</td>
                <td className="px-3 py-2 border-b border-stone-200 text-right text-stone-700">{formatCurrency(li.materialCost * li.quantity)}</td>
                <td className="px-3 py-2 border-b border-stone-200 text-right font-semibold text-stone-900">{formatCurrency(lineItemTotal(li))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-72">
            <div className="flex justify-between py-1.5 text-sm">
              <span className="text-stone-500">Total Labor ({totalHours.toLocaleString()} hrs)</span>
              <span className="font-medium text-stone-800">{formatCurrency(estimateSubtotalLabor(estimate))}</span>
            </div>
            <div className="flex justify-between py-1.5 text-sm">
              <span className="text-stone-500">Total Materials</span>
              <span className="font-medium text-stone-800">{formatCurrency(estimateSubtotalMaterials(estimate))}</span>
            </div>
            <div className="flex justify-between py-2 text-base border-t-2 border-stone-800 mt-1">
              <span className="font-bold text-stone-900">Grand Total</span>
              <span className="font-bold text-stone-900">{formatCurrency(estimateGrandTotal(estimate))}</span>
            </div>
          </div>
        </div>

        {/* Scope */}
        {estimate.scopeItems.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-stone-700 mb-2">Scope of Work</h3>
            <ul className="list-disc list-inside text-sm text-stone-600 space-y-0.5">
              {estimate.scopeItems.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Notes */}
        {estimate.notes && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-stone-700 mb-1">Notes</h3>
            <p className="text-sm text-stone-600">{estimate.notes}</p>
          </div>
        )}

        {/* Signature */}
        {estimate.signatureData && (
          <div className="mb-6 border border-stone-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-stone-700 mb-2">Signature</h3>
            <img
              src={estimate.signatureData}
              alt="Client Signature"
              className="h-16 object-contain"
            />
            {estimate.signedAt && (
              <p className="text-xs text-stone-500 mt-1">
                Signed on {formatDate(estimate.signedAt.split('T')[0])}
              </p>
            )}
          </div>
        )}

        {/* Terms */}
        <div className="border-t border-stone-300 pt-4 mt-8">
          <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Terms &amp; Conditions</h3>
          <ol className="text-xs text-stone-500 space-y-1 list-decimal list-inside">
            <li>This estimate is valid for 30 days from the date issued.</li>
            <li>A 50% deposit is required before work commences.</li>
            <li>Final payment is due upon completion and client walkthrough.</li>
            <li>Any changes to the scope of work may result in additional charges.</li>
            <li>All work is guaranteed for 1 year from date of completion.</li>
            <li>Permits and inspection fees are not included unless explicitly listed.</li>
          </ol>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Project Report Preview
  // ---------------------------------------------------------------------------
  function ProjectReportPreview({ project }: { project: Project }) {
    const projectPunchItems = punchItems.filter((pi) => pi.projectId === project.id);
    const openCount = projectPunchItems.filter((pi) => pi.status === 'open').length;
    const inProgressCount = projectPunchItems.filter((pi) => pi.status === 'in-progress').length;
    const resolvedCount = projectPunchItems.filter((pi) => pi.status === 'resolved').length;
    const verifiedCount = projectPunchItems.filter((pi) => pi.status === 'verified').length;
    const budgetPercent = project.budget > 0 ? Math.round((project.spent / project.budget) * 100) : 0;
    const remaining = project.budget - project.spent;

    return (
      <div>
        <CompanyHeader title="Project Report" />

        {/* Project info */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-stone-50 border border-stone-200 rounded-lg p-4">
            <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Project Details</h3>
            <p className="text-lg font-bold text-stone-900">{project.name}</p>
            <p className="text-sm text-stone-600">{project.client}</p>
            <p className="text-sm text-stone-600">{project.address}</p>
            <p className="text-sm text-stone-600 mt-1 capitalize">
              Type: {project.type} &nbsp;|&nbsp; Status: {project.status}
            </p>
            <p className="text-sm text-stone-600">
              {project.sqFootage.toLocaleString()} sq ft
            </p>
          </div>
          <div className="bg-stone-50 border border-stone-200 rounded-lg p-4">
            <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Timeline</h3>
            <p className="text-sm text-stone-700">
              <span className="font-medium">Start:</span> {formatDate(project.startDate)}
            </p>
            {project.endDate && (
              <p className="text-sm text-stone-700">
                <span className="font-medium">End:</span> {formatDate(project.endDate)}
              </p>
            )}
            <p className="text-sm text-stone-700 mt-2">
              <span className="font-medium">Report Date:</span> {todayFormatted()}
            </p>
          </div>
        </div>

        {/* Financial summary */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-stone-700 mb-3">Financial Summary</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center bg-stone-50 border border-stone-200 rounded-lg p-3">
              <p className="text-xs text-stone-500 uppercase">Budget</p>
              <p className="text-lg font-bold text-stone-900">{formatCurrency(project.budget)}</p>
            </div>
            <div className="text-center bg-stone-50 border border-stone-200 rounded-lg p-3">
              <p className="text-xs text-stone-500 uppercase">Spent</p>
              <p className="text-lg font-bold text-stone-900">{formatCurrency(project.spent)}</p>
            </div>
            <div className="text-center bg-stone-50 border border-stone-200 rounded-lg p-3">
              <p className="text-xs text-stone-500 uppercase">Remaining</p>
              <p className={`text-lg font-bold ${remaining >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatCurrency(remaining)}
              </p>
            </div>
          </div>
          {/* Budget bar */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-stone-500 mb-1">
              <span>Budget Utilization</span>
              <span className="font-medium">{budgetPercent}%</span>
            </div>
            <div className="w-full h-3 bg-stone-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${budgetPercent >= 90 ? 'bg-red-500' : budgetPercent >= 75 ? 'bg-amber-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min(100, budgetPercent)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Punch list summary */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-stone-700 mb-3">Punch List Summary</h3>
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="text-center bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs text-red-600 uppercase font-medium">Open</p>
              <p className="text-xl font-bold text-red-700">{openCount}</p>
            </div>
            <div className="text-center bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-600 uppercase font-medium">In Progress</p>
              <p className="text-xl font-bold text-amber-700">{inProgressCount}</p>
            </div>
            <div className="text-center bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-600 uppercase font-medium">Resolved</p>
              <p className="text-xl font-bold text-blue-700">{resolvedCount}</p>
            </div>
            <div className="text-center bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-xs text-green-600 uppercase font-medium">Verified</p>
              <p className="text-xl font-bold text-green-700">{verifiedCount}</p>
            </div>
          </div>
          <p className="text-sm text-stone-600">
            Total items: {projectPunchItems.length}
          </p>
        </div>

        {/* Notes */}
        {project.notes && (
          <div className="border-t border-stone-300 pt-4">
            <h3 className="text-sm font-semibold text-stone-700 mb-1">Project Notes</h3>
            <p className="text-sm text-stone-600 whitespace-pre-line">{project.notes}</p>
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Punch List Report Preview
  // ---------------------------------------------------------------------------
  function PunchListPreview() {
    const projectLabel =
      punchProjectFilter === 'all' ? 'All Projects' : getProjectName(punchProjectFilter);

    const openCount = filteredPunchItems.filter((pi) => pi.status === 'open').length;
    const inProgressCount = filteredPunchItems.filter((pi) => pi.status === 'in-progress').length;
    const resolvedCount = filteredPunchItems.filter((pi) => pi.status === 'resolved').length;
    const verifiedCount = filteredPunchItems.filter((pi) => pi.status === 'verified').length;

    return (
      <div>
        <CompanyHeader title="Punch List Report" />

        <div className="flex flex-wrap justify-between text-sm mb-6">
          <div>
            <p className="text-stone-500">Project</p>
            <p className="font-semibold text-stone-900">{projectLabel}</p>
          </div>
          <div>
            <p className="text-stone-500">Filter</p>
            <p className="font-semibold text-stone-900 capitalize">
              {punchStatusFilter === 'all' ? 'All Statuses' : punchStatusFilter}
            </p>
          </div>
          <div>
            <p className="text-stone-500">Report Date</p>
            <p className="font-semibold text-stone-900">{todayFormatted()}</p>
          </div>
          <div>
            <p className="text-stone-500">Total Items</p>
            <p className="font-semibold text-stone-900">{filteredPunchItems.length}</p>
          </div>
        </div>

        {filteredPunchItems.length === 0 ? (
          <div className="text-center py-12 text-stone-400">
            <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>No punch items match your filters.</p>
          </div>
        ) : (
          <table className="w-full text-xs border-collapse mb-6">
            <thead>
              <tr className="bg-stone-800 text-white">
                <th className="text-left px-2 py-2 font-semibold">#</th>
                <th className="text-left px-2 py-2 font-semibold">Unit</th>
                <th className="text-left px-2 py-2 font-semibold">Area</th>
                <th className="text-left px-2 py-2 font-semibold">Description</th>
                <th className="text-left px-2 py-2 font-semibold">Status</th>
                <th className="text-left px-2 py-2 font-semibold">Priority</th>
                <th className="text-left px-2 py-2 font-semibold">Trade</th>
                <th className="text-left px-2 py-2 font-semibold">Assigned To</th>
                <th className="text-left px-2 py-2 font-semibold">Due Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredPunchItems.map((pi, idx) => (
                <tr key={pi.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-stone-50'}>
                  <td className="px-2 py-1.5 border-b border-stone-200 text-stone-500">{idx + 1}</td>
                  <td className="px-2 py-1.5 border-b border-stone-200 text-stone-700">{pi.unit || '---'}</td>
                  <td className="px-2 py-1.5 border-b border-stone-200 text-stone-700">{pi.area || '---'}</td>
                  <td className="px-2 py-1.5 border-b border-stone-200 text-stone-900 font-medium max-w-[200px]">{pi.description}</td>
                  <td className="px-2 py-1.5 border-b border-stone-200">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold capitalize ${PUNCH_STATUS_COLORS[pi.status]}`}>
                      {pi.status}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 border-b border-stone-200 text-stone-700 capitalize">{pi.priority}</td>
                  <td className="px-2 py-1.5 border-b border-stone-200 text-stone-700">{TRADE_LABELS[pi.trade]}</td>
                  <td className="px-2 py-1.5 border-b border-stone-200 text-stone-700">{pi.assignedTo ? getSubName(pi.assignedTo) : 'Unassigned'}</td>
                  <td className="px-2 py-1.5 border-b border-stone-200 text-stone-700">{formatDate(pi.dueDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Summary counts */}
        <div className="border-t border-stone-300 pt-4">
          <h3 className="text-sm font-semibold text-stone-700 mb-2">Summary</h3>
          <div className="grid grid-cols-4 gap-3 text-center text-sm">
            <div>
              <span className="font-bold text-red-700">{openCount}</span>
              <span className="text-stone-500 ml-1">Open</span>
            </div>
            <div>
              <span className="font-bold text-amber-700">{inProgressCount}</span>
              <span className="text-stone-500 ml-1">In Progress</span>
            </div>
            <div>
              <span className="font-bold text-blue-700">{resolvedCount}</span>
              <span className="text-stone-500 ml-1">Resolved</span>
            </div>
            <div>
              <span className="font-bold text-green-700">{verifiedCount}</span>
              <span className="text-stone-500 ml-1">Verified</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Financial Summary Preview
  // ---------------------------------------------------------------------------
  function FinancialSummaryPreview() {
    const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
    const totalSpent = projects.reduce((s, p) => s + p.spent, 0);
    const totalRemaining = totalBudget - totalSpent;

    return (
      <div>
        <CompanyHeader title="Financial Summary" />

        <div className="flex justify-between text-sm mb-6">
          <div>
            <p className="text-stone-500">Report Date</p>
            <p className="font-semibold text-stone-900">{todayFormatted()}</p>
          </div>
          <div>
            <p className="text-stone-500">Total Projects</p>
            <p className="font-semibold text-stone-900">{projects.length}</p>
          </div>
        </div>

        {/* Overview cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center bg-stone-50 border border-stone-200 rounded-lg p-4">
            <p className="text-xs text-stone-500 uppercase font-medium">Total Budget</p>
            <p className="text-xl font-bold text-stone-900 mt-1">{formatCurrency(totalBudget)}</p>
          </div>
          <div className="text-center bg-stone-50 border border-stone-200 rounded-lg p-4">
            <p className="text-xs text-stone-500 uppercase font-medium">Total Spent</p>
            <p className="text-xl font-bold text-stone-900 mt-1">{formatCurrency(totalSpent)}</p>
          </div>
          <div className="text-center bg-stone-50 border border-stone-200 rounded-lg p-4">
            <p className="text-xs text-stone-500 uppercase font-medium">Total Remaining</p>
            <p className={`text-xl font-bold mt-1 ${totalRemaining >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {formatCurrency(totalRemaining)}
            </p>
          </div>
        </div>

        {/* Projects table */}
        <table className="w-full text-sm border-collapse mb-6">
          <thead>
            <tr className="bg-stone-800 text-white">
              <th className="text-left px-3 py-2 font-semibold">Project</th>
              <th className="text-left px-3 py-2 font-semibold">Client</th>
              <th className="text-left px-3 py-2 font-semibold">Status</th>
              <th className="text-right px-3 py-2 font-semibold">Budget</th>
              <th className="text-right px-3 py-2 font-semibold">Spent</th>
              <th className="text-right px-3 py-2 font-semibold">Remaining</th>
              <th className="text-right px-3 py-2 font-semibold">Used %</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p, idx) => {
              const remaining = p.budget - p.spent;
              const pct = p.budget > 0 ? Math.round((p.spent / p.budget) * 100) : 0;
              return (
                <tr key={p.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-stone-50'}>
                  <td className="px-3 py-2 border-b border-stone-200 text-stone-900 font-medium">{p.name}</td>
                  <td className="px-3 py-2 border-b border-stone-200 text-stone-600">{p.client}</td>
                  <td className="px-3 py-2 border-b border-stone-200 text-stone-600 capitalize">{p.status}</td>
                  <td className="px-3 py-2 border-b border-stone-200 text-right text-stone-700">{formatCurrency(p.budget)}</td>
                  <td className="px-3 py-2 border-b border-stone-200 text-right text-stone-700">{formatCurrency(p.spent)}</td>
                  <td className={`px-3 py-2 border-b border-stone-200 text-right font-medium ${remaining >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {formatCurrency(remaining)}
                  </td>
                  <td className="px-3 py-2 border-b border-stone-200 text-right">
                    <span className={`font-semibold ${pct >= 90 ? 'text-red-700' : pct >= 75 ? 'text-amber-700' : 'text-green-700'}`}>
                      {pct}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-stone-100 font-bold">
              <td className="px-3 py-2 text-stone-900" colSpan={3}>Totals</td>
              <td className="px-3 py-2 text-right text-stone-900">{formatCurrency(totalBudget)}</td>
              <td className="px-3 py-2 text-right text-stone-900">{formatCurrency(totalSpent)}</td>
              <td className={`px-3 py-2 text-right ${totalRemaining >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatCurrency(totalRemaining)}
              </td>
              <td className="px-3 py-2 text-right text-stone-900">
                {totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0}%
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Per-project budget bars */}
        <div>
          <h3 className="text-sm font-semibold text-stone-700 mb-3">Budget Utilization</h3>
          <div className="space-y-3">
            {projects.map((p) => {
              const pct = p.budget > 0 ? Math.round((p.spent / p.budget) * 100) : 0;
              return (
                <div key={p.id}>
                  <div className="flex justify-between text-xs text-stone-600 mb-1">
                    <span className="font-medium truncate mr-4">{p.name}</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-stone-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${pct >= 90 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Export option cards config
  // ---------------------------------------------------------------------------
  const exportOptions: {
    type: ExportType;
    icon: React.ReactNode;
    title: string;
    description: string;
  }[] = [
    {
      type: 'estimate',
      icon: <FileText className="w-6 h-6" />,
      title: 'Estimate / Quote PDF',
      description: 'Generate a professional estimate document for your client',
    },
    {
      type: 'project',
      icon: <FolderKanban className="w-6 h-6" />,
      title: 'Project Report',
      description: 'Progress summary with budget and punch list overview',
    },
    {
      type: 'punch',
      icon: <ClipboardList className="w-6 h-6" />,
      title: 'Punch List Report',
      description: 'Export punch items filtered by project and status',
    },
    {
      type: 'financial',
      icon: <DollarSign className="w-6 h-6" />,
      title: 'Financial Summary',
      description: 'Overview of all project budgets versus spending',
    },
  ];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <>
      {/* Print-specific styles */}
      <style>{`
        @media print {
          /* Hide everything except the preview */
          body * {
            visibility: hidden;
          }
          #pdf-preview, #pdf-preview * {
            visibility: visible;
          }
          #pdf-preview {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
          }
          /* Force white background and black text for printing */
          #pdf-preview {
            background: white !important;
            color: black !important;
          }
          #pdf-preview * {
            color-adjust: exact;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          /* Hide the print button itself */
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="space-y-8 print:hidden">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100">
            PDF Export
          </h1>
          <p className="mt-1 text-stone-500 dark:text-stone-400">
            Generate professional documents
          </p>
        </div>

        {/* Export Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {exportOptions.map((opt) => {
            const isActive = exportType === opt.type;
            return (
              <button
                key={opt.type}
                onClick={() => {
                  setExportType(opt.type);
                  // Reset selections when switching type
                  setSelectedEstimateId('');
                  setSelectedProjectId('');
                  setPunchProjectFilter('all');
                  setPunchStatusFilter('all');
                }}
                className={`text-left p-5 rounded-xl border transition-all min-h-[120px] ${
                  isActive
                    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 ring-2 ring-amber-400/30'
                    : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-amber-300 dark:hover:border-amber-700 hover:bg-amber-50/50 dark:hover:bg-amber-900/10'
                } shadow-sm`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                  isActive
                    ? 'bg-amber-200 dark:bg-amber-800/40 text-amber-700 dark:text-amber-300'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400'
                }`}>
                  {opt.icon}
                </div>
                <h3 className={`text-sm font-semibold mb-1 ${
                  isActive ? 'text-amber-800 dark:text-amber-200' : 'text-stone-900 dark:text-stone-100'
                }`}>
                  {opt.title}
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {opt.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Selection Controls */}
        {exportType && (
          <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-5">
            <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-300 mb-4 flex items-center gap-2">
              <ChevronDown className="w-4 h-4" />
              Select Data
            </h2>

            {exportType === 'estimate' && (
              <div className="max-w-md">
                <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1.5">
                  Choose Estimate
                </label>
                <select
                  value={selectedEstimateId}
                  onChange={(e) => setSelectedEstimateId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none min-h-[44px]"
                >
                  <option value="">-- Select an estimate --</option>
                  {estimates.map((est) => (
                    <option key={est.id} value={est.id}>
                      {est.clientName} - {est.projectType} ({est.status})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {exportType === 'project' && (
              <div className="max-w-md">
                <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1.5">
                  Choose Project
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none min-h-[44px]"
                >
                  <option value="">-- Select a project --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.status})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {exportType === 'punch' && (
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 max-w-xs">
                  <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1.5">
                    Project
                  </label>
                  <select
                    value={punchProjectFilter}
                    onChange={(e) => setPunchProjectFilter(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none min-h-[44px]"
                  >
                    <option value="all">All Projects</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 max-w-xs">
                  <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1.5">
                    Status
                  </label>
                  <select
                    value={punchStatusFilter}
                    onChange={(e) => setPunchStatusFilter(e.target.value as PunchStatusFilter)}
                    className="w-full px-3 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none min-h-[44px]"
                  >
                    <option value="all">All Statuses</option>
                    <option value="open">Open</option>
                    <option value="in-progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="verified">Verified</option>
                  </select>
                </div>
              </div>
            )}

            {exportType === 'financial' && (
              <p className="text-sm text-stone-500 dark:text-stone-400 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Financial summary will include all {projects.length} project{projects.length !== 1 ? 's' : ''}.
              </p>
            )}
          </div>
        )}

        {/* Preview / Print Area */}
        {showPreview && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Eye className="w-5 h-5 text-amber-500" />
                Document Preview
              </h2>
              <button
                onClick={handlePrint}
                className="no-print inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-medium text-sm transition-colors shadow-sm min-h-[44px]"
              >
                <Printer className="w-4 h-4" />
                Print / Save as PDF
              </button>
            </div>

            {/* The printable document */}
            <div
              id="pdf-preview"
              className="bg-white rounded-xl shadow-lg border border-stone-200 dark:border-stone-700 p-8 sm:p-12 max-w-4xl mx-auto"
              style={{ color: '#1c1917' }}
            >
              {exportType === 'estimate' && selectedEstimate && (
                <EstimatePreview estimate={selectedEstimate} />
              )}
              {exportType === 'project' && selectedProject && (
                <ProjectReportPreview project={selectedProject} />
              )}
              {exportType === 'punch' && <PunchListPreview />}
              {exportType === 'financial' && <FinancialSummaryPreview />}
            </div>

            {/* Bottom print button for long documents */}
            <div className="flex justify-center">
              <button
                onClick={handlePrint}
                className="no-print inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium text-sm transition-colors min-h-[44px]"
              >
                <Printer className="w-4 h-4" />
                Print / Save as PDF
              </button>
            </div>
          </div>
        )}

        {/* Empty state when no export type selected */}
        {!exportType && (
          <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-3 text-stone-300 dark:text-stone-600" />
            <p className="text-stone-500 dark:text-stone-400 text-sm">
              Select a document type above to get started.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
