import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  ClipboardList,
  FileText,
  HardHat,
  AlertTriangle,
  ArrowRight,
  Plus,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import { getProjects, getPunchItems, getEstimates, getSubs } from '../store';
import type { Project, PunchItem } from '../types';
import { STATUS_COLORS, PRIORITY_COLORS } from '../types';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso: string): string {
  const date = new Date(iso + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isOverdue(dueDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + 'T00:00:00');
  return due < today;
}

function getProjectName(projectId: string, projects: Project[]): string {
  const project = projects.find((p) => p.id === projectId);
  return project?.name ?? 'Unknown Project';
}

interface SummaryCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  accent?: string;
}

function SummaryCard({ icon, value, label, accent = 'text-amber-600 dark:text-amber-400' }: SummaryCardProps) {
  return (
    <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-5 flex items-center gap-4 min-h-[88px]">
      <div className={`flex-shrink-0 w-12 h-12 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center ${accent}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-stone-900 dark:text-stone-100 leading-tight">
          {value}
        </p>
        <p className="text-sm text-stone-500 dark:text-stone-400 truncate">{label}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [projects] = useState<Project[]>(() => getProjects());
  const [punchItems] = useState<PunchItem[]>(() => getPunchItems());
  const [estimates] = useState(() => getEstimates());
  const [subs] = useState(() => getSubs());

  // Derived data
  const activeProjects = projects.filter((p) => p.status === 'active');
  const openPunchItems = punchItems.filter((pi) => pi.status === 'open' || pi.status === 'in-progress');
  const pendingEstimates = estimates.filter((e) => e.status === 'draft' || e.status === 'sent');

  // Attention-needed punch items: overdue or urgent/high priority, still open/in-progress
  const attentionItems = punchItems
    .filter((pi) => {
      if (pi.status === 'resolved' || pi.status === 'verified') return false;
      if (pi.priority === 'urgent' || pi.priority === 'high') return true;
      if (isOverdue(pi.dueDate)) return true;
      return false;
    })
    .sort((a, b) => {
      // Sort: urgent first, then high, then by due date ascending
      const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
      const pa = priorityOrder[a.priority] ?? 3;
      const pb = priorityOrder[b.priority] ?? 3;
      if (pa !== pb) return pa - pb;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    })
    .slice(0, 5);

  // Budget progress percentage clamped to 0-100
  function budgetPercent(project: Project): number {
    if (project.budget <= 0) return 0;
    return Math.min(100, Math.round((project.spent / project.budget) * 100));
  }

  function budgetBarColor(percent: number): string {
    if (percent >= 90) return 'bg-red-500';
    if (percent >= 75) return 'bg-amber-500';
    return 'bg-green-500';
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100">
          Dashboard
        </h1>
        <p className="mt-1 text-stone-500 dark:text-stone-400">
          Overview of your projects and tasks
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={<FolderKanban className="w-6 h-6" />}
          value={activeProjects.length}
          label="Active Projects"
        />
        <SummaryCard
          icon={<ClipboardList className="w-6 h-6" />}
          value={openPunchItems.length}
          label="Open Punch Items"
        />
        <SummaryCard
          icon={<FileText className="w-6 h-6" />}
          value={pendingEstimates.length}
          label="Pending Estimates"
        />
        <SummaryCard
          icon={<HardHat className="w-6 h-6" />}
          value={subs.length}
          label="Total Subs"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attention Needed - spans 2 cols on large screens */}
        <div className="lg:col-span-2 bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800">
          <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                Attention Needed
              </h2>
            </div>
            <Link
              to="/punch-lists"
              className="text-sm font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 flex items-center gap-1 min-h-[44px] min-w-[44px] justify-end"
            >
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {attentionItems.length === 0 ? (
            <div className="px-5 py-10 text-center text-stone-400 dark:text-stone-500">
              <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>No urgent items right now. Nice work!</p>
            </div>
          ) : (
            <ul className="divide-y divide-stone-100 dark:divide-stone-800">
              {attentionItems.map((item) => (
                <li key={item.id}>
                  <Link
                    to="/punch-lists"
                    className="flex items-start sm:items-center gap-3 px-5 py-3.5 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors min-h-[56px]"
                  >
                    {/* Priority badge */}
                    <span
                      className={`flex-shrink-0 mt-0.5 sm:mt-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${PRIORITY_COLORS[item.priority]}`}
                    >
                      {item.priority}
                    </span>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
                        {item.description}
                      </p>
                      <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
                        {getProjectName(item.projectId, projects)}
                        {item.unit ? ` \u00B7 ${item.unit}` : ''}
                        {item.area ? ` \u00B7 ${item.area}` : ''}
                      </p>
                    </div>

                    {/* Due date */}
                    <div className="flex-shrink-0 flex items-center gap-1 text-xs">
                      <Calendar className="w-3.5 h-3.5" />
                      <span
                        className={
                          isOverdue(item.dueDate)
                            ? 'text-red-600 dark:text-red-400 font-medium'
                            : 'text-stone-500 dark:text-stone-400'
                        }
                      >
                        {isOverdue(item.dueDate) ? 'Overdue: ' : ''}
                        {formatDate(item.dueDate)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800">
          <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800">
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
              Quick Actions
            </h2>
          </div>
          <div className="p-5 space-y-3">
            <button
              onClick={() => navigate('/projects?new=true')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-300 dark:hover:border-amber-700 transition-colors text-left min-h-[48px]"
            >
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Plus className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
                  New Project
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Start tracking a new job
                </p>
              </div>
            </button>

            <button
              onClick={() => navigate('/estimates?new=true')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-300 dark:hover:border-amber-700 transition-colors text-left min-h-[48px]"
            >
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
                  New Estimate
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Create a client estimate
                </p>
              </div>
            </button>

            <button
              onClick={() => navigate('/punch-lists?new=true')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-300 dark:hover:border-amber-700 transition-colors text-left min-h-[48px]"
            >
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
                  New Punch Item
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Log an issue to resolve
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Active Projects */}
      <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
              Active Projects
            </h2>
          </div>
          <Link
            to="/projects"
            className="text-sm font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 flex items-center gap-1 min-h-[44px] min-w-[44px] justify-end"
          >
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {activeProjects.length === 0 ? (
          <div className="px-5 py-10 text-center text-stone-400 dark:text-stone-500">
            <FolderKanban className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>No active projects yet.</p>
            <button
              onClick={() => navigate('/projects?new=true')}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              Create Your First Project
            </button>
          </div>
        ) : (
          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {activeProjects.map((project) => {
              const percent = budgetPercent(project);
              return (
                <Link
                  key={project.id}
                  to="/projects"
                  className="block px-5 py-4 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2.5">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 truncate">
                        {project.name}
                      </h3>
                      <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
                        {project.client}
                      </p>
                    </div>
                    <span
                      className={`self-start inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize whitespace-nowrap ${STATUS_COLORS[project.status]}`}
                    >
                      {project.status}
                    </span>
                  </div>

                  {/* Budget progress */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                      <span>
                        {formatCurrency(project.spent)} of {formatCurrency(project.budget)}
                      </span>
                      <span className="font-medium">{percent}%</span>
                    </div>
                    <div className="w-full h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${budgetBarColor(percent)}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
