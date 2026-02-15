import { useState, useMemo } from 'react';
import { getProjects, getPunchItems, getEstimates, getSubs } from '../store';
import type { Project, PunchItem, Trade } from '../types';
import { TRADE_LABELS, STATUS_COLORS } from '../types';

type ReportTab = 'financial' | 'punch' | 'subs' | 'projects' | 'estimates';

const TABS: { key: ReportTab; label: string; icon: string }[] = [
  { key: 'financial', label: 'Financial Overview', icon: '💰' },
  { key: 'punch', label: 'Punch List Summary', icon: '📋' },
  { key: 'subs', label: 'Sub Performance', icon: '👷' },
  { key: 'projects', label: 'Project Status', icon: '📊' },
  { key: 'estimates', label: 'Estimate Conversion', icon: '📝' },
];

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const pct = (n: number, d: number) => (d === 0 ? 0 : Math.round((n / d) * 100));

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500">
      {'★'.repeat(full)}
      {half && <span className="text-amber-400">★</span>}
      <span className="text-stone-300 dark:text-stone-600">{'★'.repeat(empty)}</span>
      <span className="ml-1 text-xs text-stone-500 dark:text-stone-400">({rating.toFixed(1)})</span>
    </span>
  );
}

// ─── Financial Overview ──────────────────────────────────────────────────────

function FinancialOverview({ projects }: { projects: Project[] }) {
  const activeProjects = projects.filter((p) => p.status === 'active' || p.status === 'planning');
  const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
  const totalSpent = projects.reduce((s, p) => s + p.spent, 0);
  const totalRemaining = totalBudget - totalSpent;
  const utilization = pct(totalSpent, totalBudget);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Budget" value={currency.format(totalBudget)} color="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800" />
        <StatCard label="Total Spent" value={currency.format(totalSpent)} color="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800" />
        <StatCard label="Remaining" value={currency.format(totalRemaining)} color="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" />
        <StatCard label="Active Projects" value={String(activeProjects.length)} color="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800" />
      </div>

      {/* Budget Utilization */}
      <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700 p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300 uppercase tracking-wide">
            Budget Utilization
          </h3>
          <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{utilization}%</span>
        </div>
        <div className="w-full h-5 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              utilization > 90 ? 'bg-red-500' : utilization > 70 ? 'bg-amber-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(utilization, 100)}%` }}
          />
        </div>
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
          {currency.format(totalSpent)} of {currency.format(totalBudget)} used across all projects
        </p>
      </div>

      {/* Per-project Breakdown */}
      <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-700">
          <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300 uppercase tracking-wide">
            Per-Project Breakdown
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 dark:bg-stone-800/50 text-left text-stone-600 dark:text-stone-400 text-xs uppercase tracking-wide">
                <th className="px-6 py-3 font-semibold">Project</th>
                <th className="px-6 py-3 font-semibold text-right">Budget</th>
                <th className="px-6 py-3 font-semibold text-right">Spent</th>
                <th className="px-6 py-3 font-semibold text-right">Remaining</th>
                <th className="px-6 py-3 font-semibold text-right">% Used</th>
                <th className="px-6 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {projects.map((p, i) => {
                const used = pct(p.spent, p.budget);
                return (
                  <tr
                    key={p.id}
                    className={`${
                      i % 2 === 0 ? 'bg-white dark:bg-stone-900' : 'bg-stone-50/50 dark:bg-stone-800/30'
                    } hover:bg-amber-50/50 dark:hover:bg-amber-900/10 transition-colors`}
                  >
                    <td className="px-6 py-3 font-medium text-stone-800 dark:text-stone-200">{p.name}</td>
                    <td className="px-6 py-3 text-right text-stone-600 dark:text-stone-400">{currency.format(p.budget)}</td>
                    <td className="px-6 py-3 text-right text-stone-600 dark:text-stone-400">{currency.format(p.spent)}</td>
                    <td className="px-6 py-3 text-right text-stone-600 dark:text-stone-400">
                      {currency.format(p.budget - p.spent)}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-2 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              used > 90 ? 'bg-red-500' : used > 70 ? 'bg-amber-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(used, 100)}%` }}
                          />
                        </div>
                        <span className="text-stone-600 dark:text-stone-400 w-10 text-right">{used}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status]}`}>
                        {p.status.replace('-', ' ')}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {projects.length === 0 && (
          <p className="text-center text-stone-400 dark:text-stone-500 py-8">No projects found.</p>
        )}
      </div>
    </div>
  );
}

// ─── Punch List Summary ──────────────────────────────────────────────────────

function PunchListSummary({ punchItems }: { punchItems: PunchItem[] }) {
  const counts = {
    open: punchItems.filter((p) => p.status === 'open').length,
    'in-progress': punchItems.filter((p) => p.status === 'in-progress').length,
    resolved: punchItems.filter((p) => p.status === 'resolved').length,
    verified: punchItems.filter((p) => p.status === 'verified').length,
  };
  const total = punchItems.length || 1;

  const today = new Date().toISOString().split('T')[0];
  const overdueCount = punchItems.filter(
    (p) => (p.status === 'open' || p.status === 'in-progress') && p.dueDate < today
  ).length;

  // By trade breakdown
  const trades = Array.from(new Set(punchItems.map((p) => p.trade)));
  const tradeBreakdown = trades.map((trade) => {
    const items = punchItems.filter((p) => p.trade === trade);
    return {
      trade,
      open: items.filter((p) => p.status === 'open' || p.status === 'in-progress').length,
      resolved: items.filter((p) => p.status === 'resolved' || p.status === 'verified').length,
      total: items.length,
    };
  });

  const barSegments: { key: string; count: number; color: string; label: string }[] = [
    { key: 'open', count: counts.open, color: 'bg-red-500', label: 'Open' },
    { key: 'in-progress', count: counts['in-progress'], color: 'bg-amber-500', label: 'In Progress' },
    { key: 'resolved', count: counts.resolved, color: 'bg-blue-500', label: 'Resolved' },
    { key: 'verified', count: counts.verified, color: 'bg-green-500', label: 'Verified' },
  ];

  return (
    <div className="space-y-6">
      {/* Status Counts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {barSegments.map((s) => (
          <div
            key={s.key}
            className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700 p-4 text-center"
          >
            <div className={`inline-flex items-center justify-center w-3 h-3 rounded-full ${s.color} mb-2`} />
            <p className="text-2xl font-bold text-stone-800 dark:text-stone-100 ml-2 inline">{s.count}</p>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 uppercase tracking-wide">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Horizontal Stacked Bar (Donut simulation) */}
      <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700 p-6">
        <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300 uppercase tracking-wide mb-4">
          Status Distribution
        </h3>
        <div className="w-full h-8 rounded-full overflow-hidden flex">
          {barSegments.map((s) =>
            s.count > 0 ? (
              <div
                key={s.key}
                className={`${s.color} h-full transition-all duration-500 relative group`}
                style={{ width: `${(s.count / total) * 100}%` }}
              >
                <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                  {s.count}
                </span>
              </div>
            ) : null
          )}
        </div>
        <div className="flex flex-wrap gap-4 mt-3">
          {barSegments.map((s) => (
            <div key={s.key} className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-400">
              <span className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
              {s.label}: {s.count} ({pct(s.count, punchItems.length || 1)}%)
            </div>
          ))}
        </div>
      </div>

      {/* Overdue + Avg Resolution */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700 p-6">
          <p className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-1">Overdue Items</p>
          <p className={`text-3xl font-bold ${overdueCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
            {overdueCount}
          </p>
          <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
            Items past due date still open or in progress
          </p>
        </div>
        <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700 p-6">
          <p className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-1">Avg Resolution Time</p>
          <p className="text-3xl font-bold text-stone-800 dark:text-stone-100">3.2 days</p>
          <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
            Average time from open to resolved (placeholder)
          </p>
        </div>
      </div>

      {/* By Trade Breakdown */}
      <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-700">
          <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300 uppercase tracking-wide">
            Breakdown by Trade
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 dark:bg-stone-800/50 text-left text-stone-600 dark:text-stone-400 text-xs uppercase tracking-wide">
                <th className="px-6 py-3 font-semibold">Trade</th>
                <th className="px-6 py-3 font-semibold text-right">Open</th>
                <th className="px-6 py-3 font-semibold text-right">Resolved</th>
                <th className="px-6 py-3 font-semibold text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {tradeBreakdown.map((row, i) => (
                <tr
                  key={row.trade}
                  className={`${
                    i % 2 === 0 ? 'bg-white dark:bg-stone-900' : 'bg-stone-50/50 dark:bg-stone-800/30'
                  }`}
                >
                  <td className="px-6 py-3 font-medium text-stone-800 dark:text-stone-200">
                    {TRADE_LABELS[row.trade as Trade]}
                  </td>
                  <td className="px-6 py-3 text-right text-red-600 dark:text-red-400 font-medium">{row.open}</td>
                  <td className="px-6 py-3 text-right text-green-600 dark:text-green-400 font-medium">{row.resolved}</td>
                  <td className="px-6 py-3 text-right text-stone-600 dark:text-stone-400">{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {tradeBreakdown.length === 0 && (
          <p className="text-center text-stone-400 dark:text-stone-500 py-8">No punch items found.</p>
        )}
      </div>
    </div>
  );
}

// ─── Subcontractor Performance ───────────────────────────────────────────────

function SubPerformance({ punchItems }: { punchItems: PunchItem[] }) {
  const subs = getSubs();
  const [sortBy, setSortBy] = useState<'rating' | 'active'>('rating');

  const subsWithStats = useMemo(() => {
    return subs
      .map((sub) => {
        const assigned = punchItems.filter((p) => p.assignedTo === sub.id);
        const activeItems = assigned.filter((p) => p.status === 'open' || p.status === 'in-progress').length;
        return { ...sub, activeItems };
      })
      .sort((a, b) =>
        sortBy === 'rating' ? b.rating - a.rating : b.activeItems - a.activeItems
      );
  }, [subs, punchItems, sortBy]);

  return (
    <div className="space-y-6">
      {/* Sort Controls */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wide font-semibold">Sort by:</span>
        <button
          onClick={() => setSortBy('rating')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            sortBy === 'rating'
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
              : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
          }`}
        >
          Rating
        </button>
        <button
          onClick={() => setSortBy('active')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            sortBy === 'active'
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
              : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
          }`}
        >
          Active Items
        </button>
      </div>

      {/* Subs Table */}
      <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 dark:bg-stone-800/50 text-left text-stone-600 dark:text-stone-400 text-xs uppercase tracking-wide">
                <th className="px-6 py-3 font-semibold">Name</th>
                <th className="px-6 py-3 font-semibold">Company</th>
                <th className="px-6 py-3 font-semibold">Trade</th>
                <th className="px-6 py-3 font-semibold">Rating</th>
                <th className="px-6 py-3 font-semibold text-right">Completed</th>
                <th className="px-6 py-3 font-semibold text-right">Active</th>
                <th className="px-6 py-3 font-semibold text-right">Avg Response</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {subsWithStats.map((sub, i) => {
                const isTop = sub.rating >= 4.5;
                return (
                  <tr
                    key={sub.id}
                    className={`${
                      i % 2 === 0 ? 'bg-white dark:bg-stone-900' : 'bg-stone-50/50 dark:bg-stone-800/30'
                    } hover:bg-amber-50/50 dark:hover:bg-amber-900/10 transition-colors`}
                  >
                    <td className="px-6 py-3 font-medium text-stone-800 dark:text-stone-200">
                      <span className="flex items-center gap-1.5">
                        {isTop && <span className="text-amber-500 text-base" title="Top Performer">&#9733;</span>}
                        {sub.name}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-stone-600 dark:text-stone-400">{sub.company}</td>
                    <td className="px-6 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                        {TRADE_LABELS[sub.trade]}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <StarRating rating={sub.rating} />
                    </td>
                    <td className="px-6 py-3 text-right text-stone-600 dark:text-stone-400">{sub.completedJobs}</td>
                    <td className="px-6 py-3 text-right">
                      <span
                        className={`inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 rounded-full text-xs font-bold ${
                          sub.activeItems > 0
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                            : 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-500'
                        }`}
                      >
                        {sub.activeItems}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right text-stone-600 dark:text-stone-400">{sub.avgResponseTime}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {subs.length === 0 && (
          <p className="text-center text-stone-400 dark:text-stone-500 py-8">No subcontractors found.</p>
        )}
      </div>
    </div>
  );
}

// ─── Project Status Overview ─────────────────────────────────────────────────

function ProjectStatusOverview({ projects }: { projects: Project[] }) {
  const statusGroups: { key: Project['status']; label: string; color: string; countColor: string }[] = [
    { key: 'planning', label: 'Planning', color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800', countColor: 'text-blue-700 dark:text-blue-300' },
    { key: 'active', label: 'Active', color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800', countColor: 'text-green-700 dark:text-green-300' },
    { key: 'on-hold', label: 'On Hold', color: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800', countColor: 'text-yellow-700 dark:text-yellow-300' },
    { key: 'completed', label: 'Completed', color: 'bg-stone-50 dark:bg-stone-800/30 border-stone-200 dark:border-stone-700', countColor: 'text-stone-700 dark:text-stone-300' },
    { key: 'archived', label: 'Archived', color: 'bg-stone-50 dark:bg-stone-800/30 border-stone-300 dark:border-stone-700', countColor: 'text-stone-500 dark:text-stone-500' },
  ];

  const sortedByDate = [...projects].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );

  return (
    <div className="space-y-6">
      {/* Status Count Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {statusGroups.map((sg) => {
          const count = projects.filter((p) => p.status === sg.key).length;
          return (
            <div
              key={sg.key}
              className={`rounded-xl border p-4 text-center ${sg.color}`}
            >
              <p className={`text-3xl font-bold ${sg.countColor}`}>{count}</p>
              <p className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wide mt-1">{sg.label}</p>
            </div>
          );
        })}
      </div>

      {/* Project Timeline */}
      <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-700">
          <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300 uppercase tracking-wide">
            Project Timeline
          </h3>
        </div>
        <div className="divide-y divide-stone-100 dark:divide-stone-800">
          {sortedByDate.map((p) => (
            <div
              key={p.id}
              className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 hover:bg-stone-50/50 dark:hover:bg-stone-800/30 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-stone-800 dark:text-stone-200 truncate">{p.name}</p>
                <p className="text-xs text-stone-500 dark:text-stone-400">{p.client}</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400 flex-shrink-0">
                <span>
                  {new Date(p.startDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                  {p.endDate &&
                    ` - ${new Date(p.endDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}`}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status]}`}>
                  {p.status.replace('-', ' ')}
                </span>
              </div>
            </div>
          ))}
          {projects.length === 0 && (
            <p className="text-center text-stone-400 dark:text-stone-500 py-8">No projects found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Estimate Conversion ─────────────────────────────────────────────────────

function EstimateConversion() {
  const estimates = getEstimates();

  const byStatus = {
    draft: estimates.filter((e) => e.status === 'draft'),
    sent: estimates.filter((e) => e.status === 'sent'),
    approved: estimates.filter((e) => e.status === 'approved'),
    rejected: estimates.filter((e) => e.status === 'rejected'),
  };

  const estimateTotal = (e: { lineItems: { manHours: number; laborRate: number; materialCost: number; quantity: number }[] }) =>
    e.lineItems.reduce((s, li) => s + (li.manHours * li.laborRate + li.materialCost) * li.quantity, 0);

  const totalValue = estimates.reduce((s, e) => s + estimateTotal(e), 0);
  const approvedValue = byStatus.approved.reduce((s, e) => s + estimateTotal(e), 0);
  const denominator = byStatus.approved.length + byStatus.rejected.length;
  const conversionRate = denominator === 0 ? 0 : Math.round((byStatus.approved.length / denominator) * 100);

  const statusCards: { key: string; label: string; count: number; color: string; countColor: string }[] = [
    { key: 'draft', label: 'Draft', count: byStatus.draft.length, color: 'bg-stone-50 dark:bg-stone-800/30 border-stone-200 dark:border-stone-700', countColor: 'text-stone-600 dark:text-stone-400' },
    { key: 'sent', label: 'Sent', count: byStatus.sent.length, color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800', countColor: 'text-blue-700 dark:text-blue-300' },
    { key: 'approved', label: 'Approved', count: byStatus.approved.length, color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800', countColor: 'text-green-700 dark:text-green-300' },
    { key: 'rejected', label: 'Rejected', count: byStatus.rejected.length, color: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800', countColor: 'text-red-700 dark:text-red-300' },
  ];

  return (
    <div className="space-y-6">
      {/* Status Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statusCards.map((sc) => (
          <div key={sc.key} className={`rounded-xl border p-4 text-center ${sc.color}`}>
            <p className={`text-3xl font-bold ${sc.countColor}`}>{sc.count}</p>
            <p className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wide mt-1">{sc.label}</p>
          </div>
        ))}
      </div>

      {/* Conversion Rate */}
      <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700 p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300 uppercase tracking-wide">
            Conversion Rate
          </h3>
          <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {denominator === 0 ? 'N/A' : `${conversionRate}%`}
          </span>
        </div>
        <div className="w-full h-5 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-amber-500 transition-all duration-700"
            style={{ width: `${conversionRate}%` }}
          />
        </div>
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-2">
          Approved / (Approved + Rejected) = {byStatus.approved.length} / {denominator}{' '}
          {denominator > 0 && `= ${conversionRate}%`}
        </p>
      </div>

      {/* Value Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Estimates"
          value={String(estimates.length)}
          color="bg-stone-50 dark:bg-stone-800/30 border-stone-200 dark:border-stone-700"
        />
        <StatCard
          label="Total Estimated Value"
          value={currency.format(totalValue)}
          color="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
        />
        <StatCard
          label="Approved Value"
          value={currency.format(approvedValue)}
          color="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
        />
      </div>

      {/* Estimates Table */}
      <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-700">
          <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300 uppercase tracking-wide">
            All Estimates
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 dark:bg-stone-800/50 text-left text-stone-600 dark:text-stone-400 text-xs uppercase tracking-wide">
                <th className="px-6 py-3 font-semibold">Client</th>
                <th className="px-6 py-3 font-semibold">Type</th>
                <th className="px-6 py-3 font-semibold text-right">Value</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold text-right">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {estimates.map((est, i) => {
                const val = estimateTotal(est);
                const statusColor: Record<string, string> = {
                  draft: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-400',
                  sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
                  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
                  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
                };
                return (
                  <tr
                    key={est.id}
                    className={`${
                      i % 2 === 0 ? 'bg-white dark:bg-stone-900' : 'bg-stone-50/50 dark:bg-stone-800/30'
                    } hover:bg-amber-50/50 dark:hover:bg-amber-900/10 transition-colors`}
                  >
                    <td className="px-6 py-3 font-medium text-stone-800 dark:text-stone-200">{est.clientName}</td>
                    <td className="px-6 py-3 text-stone-600 dark:text-stone-400">{est.projectType}</td>
                    <td className="px-6 py-3 text-right text-stone-600 dark:text-stone-400">{currency.format(val)}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[est.status]}`}>
                        {est.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right text-stone-500 dark:text-stone-400">
                      {new Date(est.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {estimates.length === 0 && (
          <p className="text-center text-stone-400 dark:text-stone-500 py-8">No estimates found.</p>
        )}
      </div>
    </div>
  );
}

// ─── Shared Components ───────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`rounded-xl border p-5 ${color}`}>
      <p className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wide font-semibold mb-1">{label}</p>
      <p className="text-2xl font-bold text-stone-800 dark:text-stone-100">{value}</p>
    </div>
  );
}

// ─── Main Reports Page ───────────────────────────────────────────────────────

export default function Reports() {
  const [activeTab, setActiveTab] = useState<ReportTab>('financial');
  const projects = getProjects();
  const punchItems = getPunchItems();

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100">Reports</h1>
          <p className="text-stone-500 dark:text-stone-400 mt-1">Business intelligence and analytics</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                    : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-700 hover:bg-amber-50 dark:hover:bg-amber-900/10 hover:text-amber-700 dark:hover:text-amber-400 hover:border-amber-300 dark:hover:border-amber-700'
                }`}
              >
                <span className="mr-1.5">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'financial' && <FinancialOverview projects={projects} />}
        {activeTab === 'punch' && <PunchListSummary punchItems={punchItems} />}
        {activeTab === 'subs' && <SubPerformance punchItems={punchItems} />}
        {activeTab === 'projects' && <ProjectStatusOverview projects={projects} />}
        {activeTab === 'estimates' && <EstimateConversion />}
      </div>
    </div>
  );
}
