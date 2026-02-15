import { useState, useRef, useCallback } from 'react';
import { getPhotoAnalyses, addPhotoAnalysis, getProjects, getSubs, uid } from '../store';
import type { PhotoAnalysis as PhotoAnalysisType, Trade } from '../types';
import { TRADE_LABELS } from '../types';

/* ------------------------------------------------------------------ */
/*  Mock AI inspection data organized by trade                        */
/* ------------------------------------------------------------------ */

const CORRECT_BY_TRADE: Record<Trade, string[]> = {
  general: [
    'Framing aligned and plumb within tolerance',
    'Fire blocking installed per code at all penetrations',
    'Proper fastener spacing on structural connections',
    'Access panels installed where required',
    'Work area clean and debris removed',
    'Safety signage posted at entry points',
  ],
  electrical: [
    'Electrical boxes properly recessed to finished wall plane',
    'Wire gauge matches circuit breaker amperage rating',
    'GFCI outlets installed within 6 feet of water sources',
    'Junction boxes covered and accessible',
    'Panel directory labeling complete and accurate',
    'Conduit straps fastened at correct intervals',
  ],
  plumbing: [
    'Supply lines properly supported with hangers at 4-foot intervals',
    'Drain slope verified at 1/4 inch per foot minimum',
    'Shut-off valves accessible and operational',
    'P-traps installed on all drain connections',
    'Water heater T&P valve discharge pipe routed correctly',
    'Pipe insulation applied on hot water lines in unconditioned spaces',
  ],
  hvac: [
    'Ductwork sealed at all joints with mastic',
    'Thermostat wiring connected and tested',
    'Condensate drain line routed to proper termination',
    'Return air grilles properly sized for room volume',
    'Refrigerant line insulation intact and sealed',
    'Equipment clearance meets manufacturer spec',
  ],
  drywall: [
    'Drywall tape joints properly finished to Level 4',
    'Corner bead installed straight with no visible waviness',
    'Screw pattern at 12 inches on center on field, 8 on edges',
    'Moisture-resistant board used in wet areas',
    'Joints staggered from framing joints properly',
    'No visible nail pops or fastener dimples unfilled',
  ],
  painting: [
    'Paint coverage even and consistent across all surfaces',
    'Cut lines clean at ceiling-wall transitions',
    'Primer applied on all new drywall before finish coat',
    'Caulk lines smooth at trim-to-wall junctions',
    'No visible brush marks or roller texture inconsistencies',
    'Correct sheen applied per specification (eggshell walls, semi-gloss trim)',
  ],
  flooring: [
    'Subfloor leveled within 3/16 inch over 10 feet',
    'Expansion gaps maintained at perimeter walls',
    'Transition strips installed flush at doorways',
    'Underlayment moisture barrier correctly overlapped',
    'Plank stagger pattern meets minimum 6-inch offset',
    'Floor registers cut cleanly and fitted tight',
  ],
  roofing: [
    'Shingle courses aligned and properly offset',
    'Flashing installed at all wall-roof intersections',
    'Ridge vent continuous and properly capped',
    'Drip edge installed at eaves and rakes',
    'Ice and water shield applied in valleys and at eaves',
    'Nail placement in the manufacturer nailing zone',
  ],
  framing: [
    'Studs plumb within 1/8 inch per 8 feet',
    'Header sizes correct for span per engineering',
    'Double top plates lapped at corners and intersections',
    'Cripple studs installed at window and door openings',
    'Hold-down anchors bolted per structural plans',
    'Blocking installed for future fixture mounting',
  ],
  concrete: [
    'Rebar placement matches structural drawings',
    'Concrete surface finished to specified texture',
    'Control joints cut at proper spacing and depth',
    'Anchor bolts set plumb and at correct embedment',
    'Curing compound applied within specified timeframe',
    'Grade and slope direct water away from foundation',
  ],
  landscaping: [
    'Grade slopes away from building at 6 inches in 10 feet minimum',
    'Irrigation heads provide full coverage with no dry spots',
    'Mulch depth at 3 inches and kept 6 inches from siding',
    'Root ball depth correct — crown at grade level',
    'Edging installed between lawn and planting beds',
    'Drainage swales direct runoff to designated areas',
  ],
};

const ISSUES_BY_TRADE: Record<Trade, string[]> = {
  general: [
    'Fire caulk missing at electrical penetration through rated wall',
    'Debris and construction waste not cleared from work area',
    'Temporary shoring still in place — verify before removal',
    'Access panel label missing on utility chase cover',
    'Safety railing on second floor opening not installed',
    'Permit card not posted at main entrance',
  ],
  electrical: [
    'Outlet cover plate missing on south wall',
    'Wire splice found outside junction box in ceiling cavity',
    'Dedicated circuit for kitchen dishwasher not pulled',
    'Ground wire not bonded to metal box at panel',
    'Romex not stapled within 12 inches of box entry',
    'Arc-fault breaker missing on bedroom circuit per 2023 NEC',
  ],
  plumbing: [
    'Slow drain detected at kitchen sink — possible venting issue',
    'Supply line fitting dripping at hot water angle stop',
    'Cleanout access blocked by framing member',
    'Pressure test shows 2 PSI drop over 15 minutes',
    'Toilet flange set too low — will need extension ring',
    'Hose bibb missing vacuum breaker per code',
  ],
  hvac: [
    'Return air duct pulling from garage — code violation',
    'Condensate pan rusted and needs replacement',
    'Filter access door does not seal properly',
    'Airflow at master bedroom register below designed CFM',
    'Refrigerant line kinked at 90-degree bend near condenser',
    'Thermostat placed on exterior wall causing ghost readings',
  ],
  drywall: [
    'Visible seam ridge on living room north wall at eye level',
    'Screw pop on ceiling near light fixture location',
    'Gap between drywall and door frame exceeds 1/4 inch',
    'Moisture damage detected on lower 8 inches of wall',
    'Inside corner tape bubbling on hallway intersection',
    'Electrical box cutout oversized — gap visible around outlet',
  ],
  painting: [
    'Paint drip on window frame casing — needs sanding and recoat',
    'Color mismatch between north wall and adjacent hallway',
    'Holidays visible on ceiling second coat — missed spots',
    'Caulk cracking at baseboard on west wall',
    'Overspray on hardwood floor near baseboard',
    'Primer bleed-through at drywall repair patch',
  ],
  flooring: [
    'Gap between baseboard and floor exceeds 1/4 inch',
    'Plank click joint not fully engaged — visible seam row 3',
    'Transition strip height change is a trip hazard',
    'Scratch marks on new LVP from construction traffic',
    'Tile lippage exceeds 1/32 inch at shower floor',
    'Grout line width inconsistent — varies from 1/8 to 1/4 inch',
  ],
  roofing: [
    'Exposed nail head on third course — seal or re-nail',
    'Step flashing overlapped in wrong direction at chimney',
    'Shingle overhang at eave exceeds 3/4 inch',
    'Boot flashing cracked around plumbing vent',
    'Ridge cap shingle not sealed — lifting in wind',
    'Gutter downspout not connected to underground drain',
  ],
  framing: [
    'Stud bowed more than 1/4 inch — replace before drywall',
    'Missing cripple stud under window rough opening',
    'Top plate splice does not fall over a stud',
    'Notch in load-bearing stud exceeds 25% of depth',
    'Joist hanger nail count short by 2 nails',
    'Shear wall nailing pattern at 4 inches instead of specified 3',
  ],
  concrete: [
    'Surface scaling on north side of foundation wall',
    'Control joint not cut — random cracking has started',
    'Anchor bolt off-layout by 1 inch — conflicts with sill plate',
    'Honeycombing visible on form-stripped wall face',
    'Insufficient slope on garage slab — water pooling at center',
    'Vapor barrier punctured during pour — patch required',
  ],
  landscaping: [
    'Irrigation overspray hitting building siding',
    'Negative grade at southwest corner directing water to foundation',
    'Compacted soil in planting bed — roots cannot establish',
    'Mulch piled against wood siding — moisture concern',
    'Downspout splash block directing water toward sidewalk',
    'Tree planted too close to foundation — minimum 10 feet required',
  ],
};

const AI_NOTE_TEMPLATES: string[] = [
  'Overall the {area} in {unit} is in {condition} condition. {issue_summary} Recommended trade for follow-up: {trade}. {extra}',
  'Inspection of the {area} ({unit}) reveals {condition} workmanship. {issue_summary} The {trade} scope should be reviewed. {extra}',
  'Site walk of {unit} — {area}: {condition} progress noted. {issue_summary} Suggest assigning {trade} crew for corrections. {extra}',
  '{area} inspection complete for {unit}. Work is {condition}. {issue_summary} Primary trade involved: {trade}. {extra}',
];

const CONDITIONS = ['satisfactory', 'good', 'mostly acceptable', 'fair', 'above average'];
const EXTRAS = [
  'No safety concerns observed.',
  'Recommend re-inspection in 48 hours.',
  'Client walkthrough can proceed for this area.',
  'Minor touch-ups expected before final sign-off.',
  'Area is near completion — punch list items should be minimal.',
  'Consider scheduling this area for final cleaning.',
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function randomTrade(): Trade {
  const trades: Trade[] = ['electrical', 'plumbing', 'hvac', 'drywall', 'painting', 'flooring', 'roofing', 'framing', 'concrete', 'general'];
  return trades[Math.floor(Math.random() * trades.length)];
}

function generateMockAnalysis(
  projectId: string,
  unit: string,
  area: string,
): PhotoAnalysisType {
  const trade = randomTrade();
  const correctCount = 2 + Math.floor(Math.random() * 3); // 2-4
  const issueCount = 1 + Math.floor(Math.random() * 3);   // 1-3
  const correctItems = pickRandom(CORRECT_BY_TRADE[trade], correctCount);
  const issuesFound = pickRandom(ISSUES_BY_TRADE[trade], issueCount);

  const subs = getSubs().filter(s => s.trade === trade);
  const suggestedSub = subs.length > 0
    ? `${subs[0].name} (${subs[0].company})`
    : `No ${TRADE_LABELS[trade]} subcontractor on file`;

  const condition = CONDITIONS[Math.floor(Math.random() * CONDITIONS.length)];
  const extra = EXTRAS[Math.floor(Math.random() * EXTRAS.length)];
  const issueSummary = issuesFound.length === 1
    ? '1 issue was identified that requires attention.'
    : `${issuesFound.length} issues were identified that require attention.`;

  const template = AI_NOTE_TEMPLATES[Math.floor(Math.random() * AI_NOTE_TEMPLATES.length)];
  const aiNotes = template
    .replace('{area}', area || 'work area')
    .replace('{unit}', unit || 'unit')
    .replace(/\{condition\}/g, condition)
    .replace('{issue_summary}', issueSummary)
    .replace('{trade}', TRADE_LABELS[trade])
    .replace('{extra}', extra);

  return {
    id: uid(),
    projectId,
    unit: unit || 'Unspecified',
    area: area || 'General',
    photoUrl: '',
    aiNotes,
    issuesFound,
    correctItems,
    suggestedSub,
    trade,
    createdAt: new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/*  Icons (inline SVG)                                                */
/* ------------------------------------------------------------------ */

function CameraIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.04l-.821 1.315Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
    </svg>
  );
}

function CheckCircleIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function ExclamationTriangleIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  );
}

function SparklesIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
  );
}

function ChevronDownIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function UserIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  );
}

function UploadIcon({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function PhotoAnalysis() {
  const [analyses, setAnalyses] = useState<PhotoAnalysisType[]>(getPhotoAnalyses);
  const [projects] = useState(getProjects);

  // Upload form state
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [unit, setUnit] = useState('');
  const [area, setArea] = useState('');
  const [fileName, setFileName] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);

  // Current result state
  const [currentResult, setCurrentResult] = useState<PhotoAnalysisType | null>(null);
  const [saved, setSaved] = useState(false);

  // Expanded card tracking
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((file: File | undefined) => {
    if (file && file.type.startsWith('image/')) {
      setFileName(file.name);
      setCurrentResult(null);
      setSaved(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const startAnalysis = useCallback(() => {
    if (!fileName) return;

    setAnalyzing(true);
    setProgress(0);
    setCurrentResult(null);
    setSaved(false);

    // Simulate progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + Math.random() * 15 + 5;
      });
    }, 200);

    setTimeout(() => {
      clearInterval(interval);
      setProgress(100);
      const result = generateMockAnalysis(selectedProjectId, unit, area);
      setCurrentResult(result);
      setAnalyzing(false);
    }, 2000);
  }, [fileName, selectedProjectId, unit, area]);

  const saveAnalysis = useCallback(() => {
    if (!currentResult) return;
    addPhotoAnalysis(currentResult);
    setAnalyses(getPhotoAnalyses());
    setSaved(true);
  }, [currentResult]);

  const resetForm = useCallback(() => {
    setFileName('');
    setCurrentResult(null);
    setSaved(false);
    setProgress(0);
    setSelectedProjectId('');
    setUnit('');
    setArea('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const projectLookup = (id: string) => projects.find(p => p.id === id);

  const TRADE_BADGE_COLORS: Record<Trade, string> = {
    general: 'bg-stone-100 text-stone-700 dark:bg-stone-700 dark:text-stone-200',
    electrical: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    plumbing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    hvac: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
    drywall: 'bg-stone-100 text-stone-700 dark:bg-stone-700 dark:text-stone-300',
    painting: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
    flooring: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    roofing: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    framing: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
    concrete: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
    landscaping: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  };

  return (
    <div className="space-y-8">
      {/* ---- Header ---- */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
            <SparklesIcon className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
            Photo Analysis
          </h1>
        </div>
        <p className="text-stone-500 dark:text-stone-400 ml-14">
          AI-powered job site inspection
        </p>
      </div>

      {/* ---- Upload & Form Section ---- */}
      <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-6">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">
          Upload Site Photo
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Drop zone */}
          <div>
            <div
              className={`
                border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
                ${fileName
                  ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-600'
                  : 'border-stone-300 dark:border-stone-700 hover:border-amber-400 dark:hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-900/5'
                }
              `}
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files?.[0])}
              />
              <UploadIcon className="w-10 h-10 mx-auto mb-3 text-stone-400 dark:text-stone-500" />
              {fileName ? (
                <>
                  <p className="font-medium text-stone-800 dark:text-stone-200">{fileName}</p>
                  <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                    Click to change or drag a different photo
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium text-stone-700 dark:text-stone-300">
                    Drop a site photo here or click to browse
                  </p>
                  <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                    JPG, PNG, HEIC up to 25 MB
                  </p>
                </>
              )}
            </div>

            {/* Analyze button */}
            <button
              onClick={startAnalysis}
              disabled={!fileName || analyzing}
              className="mt-4 w-full flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-stone-300 dark:disabled:bg-stone-700 text-white disabled:text-stone-500 dark:disabled:text-stone-500 font-semibold rounded-xl transition-colors"
            >
              <SparklesIcon className="w-5 h-5" />
              {analyzing ? 'Analyzing...' : 'Run AI Analysis'}
            </button>
          </div>

          {/* Form fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                Project
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-colors"
              >
                <option value="">Select a project...</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                Unit
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g., Unit 4B, Main Floor"
                className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                Area
              </label>
              <input
                type="text"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="e.g., Kitchen, Master Bathroom"
                className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Progress bar */}
        {analyzing && (
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-stone-600 dark:text-stone-400 font-medium">
                Analyzing photo...
              </span>
              <span className="text-amber-600 dark:text-amber-400 font-semibold">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="w-full bg-stone-200 dark:bg-stone-700 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs text-stone-500 dark:text-stone-400">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Detecting surfaces, materials, and workmanship quality...
            </div>
          </div>
        )}
      </div>

      {/* ---- AI Results ---- */}
      {currentResult && (
        <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-6 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <SparklesIcon className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                AI Analysis Results
              </h2>
            </div>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${TRADE_BADGE_COLORS[currentResult.trade]}`}>
              {TRADE_LABELS[currentResult.trade]}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Photo placeholder */}
            <div className="lg:col-span-1">
              <div className="aspect-[4/3] bg-stone-100 dark:bg-stone-800 rounded-xl flex flex-col items-center justify-center text-stone-400 dark:text-stone-500 border border-stone-200 dark:border-stone-700">
                <CameraIcon className="w-12 h-12 mb-2" />
                <p className="text-sm font-medium">Photo Preview</p>
                <p className="text-xs mt-1">{fileName}</p>
              </div>
            </div>

            {/* Results details */}
            <div className="lg:col-span-2 space-y-5">
              {/* Correct items */}
              <div>
                <h3 className="text-sm font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <CheckCircleIcon className="w-4 h-4" />
                  Correct Items ({currentResult.correctItems.length})
                </h3>
                <ul className="space-y-2">
                  {currentResult.correctItems.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2.5 text-sm text-stone-700 dark:text-stone-300"
                    >
                      <CheckCircleIcon className="w-5 h-5 text-green-500 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Issues found */}
              <div>
                <h3 className="text-sm font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <ExclamationTriangleIcon className="w-4 h-4" />
                  Issues Found ({currentResult.issuesFound.length})
                </h3>
                <ul className="space-y-2">
                  {currentResult.issuesFound.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2.5 text-sm text-stone-700 dark:text-stone-300"
                    >
                      <ExclamationTriangleIcon className="w-5 h-5 text-orange-500 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Suggested sub */}
              <div className="flex items-start gap-2.5 p-3 bg-stone-50 dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700">
                <UserIcon className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide">
                    Suggested Subcontractor
                  </p>
                  <p className="text-sm font-medium text-stone-800 dark:text-stone-200 mt-0.5">
                    {currentResult.suggestedSub}
                  </p>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    Trade: {TRADE_LABELS[currentResult.trade]}
                  </p>
                </div>
              </div>

              {/* AI Notes */}
              <div className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800/30">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <SparklesIcon className="w-3.5 h-3.5" />
                  AI Notes
                </p>
                <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
                  {currentResult.aiNotes}
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 pt-2 border-t border-stone-200 dark:border-stone-800">
            {!saved ? (
              <button
                onClick={saveAnalysis}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                Save Analysis
              </button>
            ) : (
              <span className="flex items-center gap-2 px-5 py-2.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-semibold rounded-xl">
                <CheckCircleIcon className="w-5 h-5" />
                Saved
              </span>
            )}
            <button
              onClick={resetForm}
              className="px-5 py-2.5 border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 font-medium rounded-xl transition-colors"
            >
              New Analysis
            </button>
          </div>
        </div>
      )}

      {/* ---- Previous Analyses ---- */}
      <div>
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">
          Previous Analyses
          {analyses.length > 0 && (
            <span className="text-sm font-normal text-stone-500 dark:text-stone-400 ml-2">
              ({analyses.length})
            </span>
          )}
        </h2>

        {analyses.length === 0 ? (
          <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-12 text-center">
            <CameraIcon className="w-10 h-10 mx-auto mb-3 text-stone-300 dark:text-stone-600" />
            <p className="text-stone-500 dark:text-stone-400 font-medium">No analyses yet</p>
            <p className="text-sm text-stone-400 dark:text-stone-500 mt-1">
              Upload a site photo above to get started
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {[...analyses].reverse().map(a => {
              const project = projectLookup(a.projectId);
              const isExpanded = expandedId === a.id;
              const date = new Date(a.createdAt);

              return (
                <div
                  key={a.id}
                  className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden"
                >
                  {/* Card header (always visible) */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : a.id)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="flex-shrink-0 w-10 h-10 bg-stone-100 dark:bg-stone-800 rounded-lg flex items-center justify-center">
                        <CameraIcon className="w-5 h-5 text-stone-400 dark:text-stone-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-stone-900 dark:text-stone-100 truncate">
                            {project ? project.name : 'No project'}
                          </p>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${TRADE_BADGE_COLORS[a.trade]}`}>
                            {TRADE_LABELS[a.trade]}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-sm text-stone-500 dark:text-stone-400">
                          <span>{a.unit} &middot; {a.area}</span>
                          <span>&middot;</span>
                          <span>{date.toLocaleDateString()}</span>
                          <span>&middot;</span>
                          <span className={a.issuesFound.length > 0 ? 'text-orange-600 dark:text-orange-400 font-medium' : 'text-green-600 dark:text-green-400'}>
                            {a.issuesFound.length} {a.issuesFound.length === 1 ? 'issue' : 'issues'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronDownIcon
                      className={`w-5 h-5 text-stone-400 dark:text-stone-500 flex-shrink-0 ml-2 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 border-t border-stone-100 dark:border-stone-800 space-y-4">
                      {/* Correct items */}
                      <div className="mt-4">
                        <h4 className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                          <CheckCircleIcon className="w-3.5 h-3.5" />
                          Correct Items ({a.correctItems.length})
                        </h4>
                        <ul className="space-y-1.5">
                          {a.correctItems.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-stone-600 dark:text-stone-400">
                              <CheckCircleIcon className="w-4 h-4 text-green-500 dark:text-green-400 flex-shrink-0 mt-0.5" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Issues */}
                      <div>
                        <h4 className="text-xs font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                          <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                          Issues Found ({a.issuesFound.length})
                        </h4>
                        <ul className="space-y-1.5">
                          {a.issuesFound.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-stone-600 dark:text-stone-400">
                              <ExclamationTriangleIcon className="w-4 h-4 text-orange-500 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Suggested sub */}
                      <div className="flex items-start gap-2 text-sm">
                        <UserIcon className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="text-stone-500 dark:text-stone-400">Suggested Sub: </span>
                          <span className="text-stone-800 dark:text-stone-200 font-medium">{a.suggestedSub}</span>
                        </div>
                      </div>

                      {/* AI notes */}
                      <div className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800/30">
                        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                          <SparklesIcon className="w-3.5 h-3.5" />
                          AI Notes
                        </p>
                        <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                          {a.aiNotes}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
