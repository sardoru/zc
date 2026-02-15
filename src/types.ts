export type ProjectStatus = 'planning' | 'active' | 'on-hold' | 'completed' | 'archived';
export type PunchStatus = 'open' | 'in-progress' | 'resolved' | 'verified';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type Trade = 'general' | 'electrical' | 'plumbing' | 'hvac' | 'drywall' | 'painting' | 'flooring' | 'roofing' | 'framing' | 'concrete' | 'landscaping';

export interface Project {
  id: string;
  name: string;
  client: string;
  address: string;
  status: ProjectStatus;
  type: string;
  sqFootage: number;
  startDate: string;
  endDate?: string;
  budget: number;
  spent: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface PunchItem {
  id: string;
  projectId: string;
  unit: string;
  area: string;
  description: string;
  status: PunchStatus;
  priority: Priority;
  trade: Trade;
  assignedTo: string; // sub id
  dueDate: string;
  photos: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SubContractor {
  id: string;
  name: string;
  company: string;
  trade: Trade;
  phone: string;
  email: string;
  rate: number;
  rating: number;
  completedJobs: number;
  avgResponseTime: string;
  notes: string;
}

export interface EstimateLineItem {
  id: string;
  description: string;
  trade: Trade;
  manHours: number;
  laborRate: number;
  materialCost: number;
  quantity: number;
}

export interface Estimate {
  id: string;
  projectId?: string;
  clientName: string;
  clientEmail: string;
  projectType: string;
  sqFootage: number;
  scopeItems: string[];
  lineItems: EstimateLineItem[];
  notes: string;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  signatureData?: string;
  signedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PhotoAnalysis {
  id: string;
  projectId: string;
  unit: string;
  area: string;
  photoUrl: string;
  aiNotes: string;
  issuesFound: string[];
  correctItems: string[];
  suggestedSub: string;
  trade: Trade;
  createdAt: string;
}

export interface Signature {
  id: string;
  estimateId: string;
  signerName: string;
  signerEmail: string;
  signatureData: string;
  signedAt: string;
  ipAddress: string;
}

export interface AppSettings {
  companyName: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  logo: string;
  defaultLaborRates: Record<Trade, number>;
  theme: 'light' | 'dark' | 'system';
}

export const TRADE_LABELS: Record<Trade, string> = {
  general: 'General',
  electrical: 'Electrical',
  plumbing: 'Plumbing',
  hvac: 'HVAC',
  drywall: 'Drywall',
  painting: 'Painting',
  flooring: 'Flooring',
  roofing: 'Roofing',
  framing: 'Framing',
  concrete: 'Concrete',
  landscaping: 'Landscaping',
};

export const DEFAULT_LABOR_RATES: Record<Trade, number> = {
  general: 55,
  electrical: 85,
  plumbing: 80,
  hvac: 90,
  drywall: 50,
  painting: 45,
  flooring: 60,
  roofing: 70,
  framing: 65,
  concrete: 75,
  landscaping: 50,
};

export const STATUS_COLORS: Record<ProjectStatus, string> = {
  planning: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  'on-hold': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  completed: 'bg-stone-100 text-stone-800 dark:bg-stone-800/30 dark:text-stone-300',
  archived: 'bg-stone-100 text-stone-500 dark:bg-stone-800/30 dark:text-stone-500',
};

export const PUNCH_STATUS_COLORS: Record<PunchStatus, string> = {
  open: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  'in-progress': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  resolved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  verified: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  low: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};
