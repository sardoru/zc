import { useState, useEffect, useRef } from 'react';
import { getSettings, setSettings } from '../store';
import type { AppSettings, Trade } from '../types';
import { TRADE_LABELS, DEFAULT_LABOR_RATES } from '../types';
import { useTheme } from '../hooks/useTheme';

const TRADES = Object.keys(TRADE_LABELS) as Trade[];

const inputClass =
  'w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 ' +
  'px-3 py-2.5 min-h-[44px] text-stone-900 dark:text-stone-100 placeholder:text-stone-400 ' +
  'dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 ' +
  'focus:border-amber-500 transition-colors';

const cardClass =
  'bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-6';

const labelClass = 'block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5';

const btnPrimary =
  'inline-flex items-center gap-2 rounded-lg bg-amber-600 hover:bg-amber-700 active:bg-amber-800 ' +
  'text-white font-medium px-5 py-2.5 min-h-[44px] transition-colors focus:outline-none ' +
  'focus:ring-2 focus:ring-amber-500/40 focus:ring-offset-2 dark:focus:ring-offset-stone-900';

const btnSecondary =
  'inline-flex items-center gap-2 rounded-lg border border-stone-300 dark:border-stone-700 ' +
  'bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-700 ' +
  'dark:text-stone-300 font-medium px-5 py-2.5 min-h-[44px] transition-colors focus:outline-none ' +
  'focus:ring-2 focus:ring-amber-500/40 focus:ring-offset-2 dark:focus:ring-offset-stone-900';

const btnDanger =
  'inline-flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 active:bg-red-800 ' +
  'text-white font-medium px-5 py-2.5 min-h-[44px] transition-colors focus:outline-none ' +
  'focus:ring-2 focus:ring-red-500/40 focus:ring-offset-2 dark:focus:ring-offset-stone-900';

export default function Settings() {
  const { theme, resolved, setTheme } = useTheme();

  const [settings, setLocal] = useState<AppSettings>(() => getSettings());
  const [toast, setToast] = useState<string | null>(null);
  const [storageUsage, setStorageUsage] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Calculate storage usage on mount
  useEffect(() => {
    calculateStorage();
  }, []);

  function calculateStorage() {
    let totalBytes = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        totalBytes += key.length * 2; // UTF-16
        totalBytes += (localStorage.getItem(key) ?? '').length * 2;
      }
    }
    if (totalBytes < 1024) {
      setStorageUsage(`${totalBytes} B`);
    } else if (totalBytes < 1024 * 1024) {
      setStorageUsage(`${(totalBytes / 1024).toFixed(1)} KB`);
    } else {
      setStorageUsage(`${(totalBytes / (1024 * 1024)).toFixed(2)} MB`);
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  }

  // --- Company Info handlers ---
  function updateField<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setLocal((prev) => ({ ...prev, [key]: value }));
  }

  function saveCompanyInfo() {
    setSettings(settings);
    showToast('Settings saved!');
  }

  // --- Labor rate handlers ---
  function updateRate(trade: Trade, value: number) {
    setLocal((prev) => ({
      ...prev,
      defaultLaborRates: { ...prev.defaultLaborRates, [trade]: value },
    }));
  }

  function resetRates() {
    setLocal((prev) => ({ ...prev, defaultLaborRates: { ...DEFAULT_LABOR_RATES } }));
  }

  function saveLaborRates() {
    setSettings(settings);
    showToast('Settings saved!');
  }

  // --- Theme handler ---
  function handleThemeChange(t: 'light' | 'dark' | 'system') {
    setTheme(t);
    setLocal((prev) => ({ ...prev, theme: t }));
  }

  // --- Data Management ---
  function handleExport() {
    const data: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('zc_')) {
        data[key] = localStorage.getItem(key) ?? '';
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zacher-construction-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Data exported successfully!');
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as Record<string, string>;
        for (const [key, value] of Object.entries(data)) {
          if (key.startsWith('zc_')) {
            localStorage.setItem(key, value);
          }
        }
        showToast('Data imported! Reloading...');
        setTimeout(() => window.location.reload(), 800);
      } catch {
        showToast('Import failed: invalid JSON file.');
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleClearAll() {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('zc_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
    setConfirmClear(false);
    showToast('All data cleared! Reloading...');
    setTimeout(() => window.location.reload(), 800);
  }

  // --- Theme button helper ---
  function themeBtn(value: 'light' | 'dark' | 'system', label: string, icon: React.ReactNode) {
    const active = theme === value;
    return (
      <button
        type="button"
        onClick={() => handleThemeChange(value)}
        className={
          'flex items-center gap-2.5 rounded-lg px-5 py-3 min-h-[44px] font-medium transition-all ' +
          (active
            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-2 border-amber-500 shadow-sm'
            : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-2 border-transparent hover:border-stone-300 dark:hover:border-stone-600')
        }
      >
        {icon}
        {label}
      </button>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3 rounded-lg bg-green-600 text-white px-5 py-3 shadow-lg">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">{toast}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100">Settings</h1>
        <p className="mt-1 text-stone-500 dark:text-stone-400">
          Manage your company profile and preferences
        </p>
      </div>

      {/* ========== Company Information ========== */}
      <section className={cardClass}>
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
              Company Information
            </h2>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Your business details used on estimates and reports
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Company Name */}
          <div>
            <label className={labelClass}>Company Name</label>
            <input
              type="text"
              className={inputClass}
              value={settings.companyName}
              onChange={(e) => updateField('companyName', e.target.value)}
              placeholder="Your Company LLC"
            />
          </div>

          {/* Owner Name */}
          <div>
            <label className={labelClass}>Owner Name</label>
            <input
              type="text"
              className={inputClass}
              value={settings.ownerName}
              onChange={(e) => updateField('ownerName', e.target.value)}
              placeholder="John Doe"
            />
          </div>

          {/* Phone */}
          <div>
            <label className={labelClass}>Phone</label>
            <input
              type="tel"
              className={inputClass}
              value={settings.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>

          {/* Email */}
          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              className={inputClass}
              value={settings.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="email@company.com"
            />
          </div>

          {/* Address */}
          <div className="md:col-span-2">
            <label className={labelClass}>Address</label>
            <textarea
              className={inputClass + ' resize-none'}
              rows={3}
              value={settings.address}
              onChange={(e) => updateField('address', e.target.value)}
              placeholder="123 Main St, City, ST 12345"
            />
          </div>

          {/* Logo URL */}
          <div className="md:col-span-2">
            <label className={labelClass}>Logo URL</label>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  className={inputClass}
                  value={settings.logo}
                  onChange={(e) => updateField('logo', e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
                <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">
                  Paste a direct image URL. Displayed on estimates and reports.
                </p>
              </div>
              <div className="flex-shrink-0 w-16 h-16 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 flex items-center justify-center overflow-hidden">
                {settings.logo ? (
                  <img
                    src={settings.logo}
                    alt="Company logo"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <svg className="w-8 h-8 text-stone-300 dark:text-stone-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button type="button" className={btnPrimary} onClick={saveCompanyInfo}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Save Company Info
          </button>
        </div>
      </section>

      {/* ========== Theme ========== */}
      <section className={cardClass}>
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Theme</h2>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Choose your preferred appearance
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {themeBtn(
            'light',
            'Light',
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
            </svg>
          )}
          {themeBtn(
            'dark',
            'Dark',
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
            </svg>
          )}
          {themeBtn(
            'system',
            'System',
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
            </svg>
          )}
        </div>

        <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">
          Currently using{' '}
          <span className="font-medium text-stone-700 dark:text-stone-300">
            {resolved === 'dark' ? 'dark' : 'light'}
          </span>{' '}
          mode
          {theme === 'system' && ' (based on system preference)'}
        </p>
      </section>

      {/* ========== Default Labor Rates ========== */}
      <section className={cardClass}>
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
              Default Labor Rates
            </h2>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Hourly rates used when creating new estimates
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TRADES.map((trade) => (
            <div
              key={trade}
              className="flex items-center gap-3 rounded-lg bg-stone-50 dark:bg-stone-800/50 p-3"
            >
              <label className="flex-1 text-sm font-medium text-stone-700 dark:text-stone-300">
                {TRADE_LABELS[trade]}
              </label>
              <div className="relative w-28">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500 text-sm pointer-events-none">
                  $
                </span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  className={
                    'w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 ' +
                    'pl-7 pr-10 py-2 min-h-[40px] text-right text-sm text-stone-900 dark:text-stone-100 ' +
                    'focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-colors'
                  }
                  value={settings.defaultLaborRates[trade]}
                  onChange={(e) =>
                    updateRate(trade, Math.max(0, parseFloat(e.target.value) || 0))
                  }
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500 text-xs pointer-events-none">
                  /hr
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button type="button" className={btnSecondary} onClick={resetRates}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
            Reset to Defaults
          </button>
          <button type="button" className={btnPrimary} onClick={saveLaborRates}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Save Rates
          </button>
        </div>
      </section>

      {/* ========== Data Management ========== */}
      <section className={cardClass}>
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
              Data Management
            </h2>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Export, import, or clear your application data
            </p>
          </div>
        </div>

        {/* Storage usage */}
        <div className="mb-6 flex items-center gap-2 rounded-lg bg-stone-50 dark:bg-stone-800/50 px-4 py-3">
          <svg className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          <span className="text-sm text-stone-600 dark:text-stone-400">
            Local storage usage:{' '}
            <span className="font-medium text-stone-800 dark:text-stone-200">
              {storageUsage}
            </span>{' '}
            of ~5 MB
          </span>
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Export */}
          <button type="button" className={btnSecondary} onClick={handleExport}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export Data
          </button>

          {/* Import */}
          <label className={btnSecondary + ' cursor-pointer'}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            Import Data
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleImport}
            />
          </label>

          {/* Clear All Data */}
          {!confirmClear ? (
            <button
              type="button"
              className={btnDanger}
              onClick={() => setConfirmClear(true)}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
              Clear All Data
            </button>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border-2 border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-2">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <span className="text-sm font-medium text-red-800 dark:text-red-300">
                Delete everything?
              </span>
              <button
                type="button"
                className="ml-2 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-3 py-1.5 transition-colors"
                onClick={handleClearAll}
              >
                Yes, clear all
              </button>
              <button
                type="button"
                className="rounded-md bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 text-sm font-medium px-3 py-1.5 transition-colors hover:bg-stone-50 dark:hover:bg-stone-700"
                onClick={() => setConfirmClear(false)}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
