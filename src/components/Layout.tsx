import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, FolderKanban, Calculator, ClipboardList,
  Camera, Users, PenTool, FileDown, BarChart3, Settings,
  Menu, X, Sun, Moon, HardHat,
} from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '../hooks/useTheme';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/estimates', label: 'Estimates', icon: Calculator },
  { to: '/punch-lists', label: 'Punch Lists', icon: ClipboardList },
  { to: '/photos', label: 'Photo Analysis', icon: Camera },
  { to: '/subs', label: 'Subcontractors', icon: Users },
  { to: '/signatures', label: 'E-Signatures', icon: PenTool },
  { to: '/export', label: 'PDF Export', icon: FileDown },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const;

function NavItem({ to, label, icon: Icon, onClick }: { to: string; label: string; icon: React.ComponentType<{ className?: string }>; onClick?: () => void }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
          isActive
            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
            : 'text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800'
        }`
      }
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span>{label}</span>
    </NavLink>
  );
}

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { resolved, setTheme } = useTheme();

  return (
    <div className="flex h-screen overflow-hidden bg-stone-50 dark:bg-stone-950">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-stone-200 dark:border-stone-800">
          <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center">
            <HardHat className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-sm leading-tight">Zacher Construction</div>
            <div className="text-xs text-stone-500 dark:text-stone-400">Management</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {NAV.map(n => <NavItem key={n.to} {...n} />)}
        </nav>
        <div className="p-3 border-t border-stone-200 dark:border-stone-800">
          <button
            onClick={() => setTheme(resolved === 'dark' ? 'light' : 'dark')}
            className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors min-h-[44px]"
          >
            {resolved === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            {resolved === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white dark:bg-stone-900 shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center">
                  <HardHat className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-sm">Zacher Construction</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
              {NAV.map(n => <NavItem key={n.to} {...n} onClick={() => setMobileOpen(false)} />)}
            </nav>
            <div className="p-3 border-t border-stone-200 dark:border-stone-800">
              <button
                onClick={() => setTheme(resolved === 'dark' ? 'light' : 'dark')}
                className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors min-h-[44px]"
              >
                {resolved === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                {resolved === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
          <button onClick={() => setMobileOpen(true)} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-amber-500 flex items-center justify-center">
              <HardHat className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm">Zacher Construction</span>
          </div>
          <button
            onClick={() => setTheme(resolved === 'dark' ? 'light' : 'dark')}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            {resolved === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
