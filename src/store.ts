import type { Project, PunchItem, SubContractor, Estimate, PhotoAnalysis, Signature, AppSettings } from './types';
import { DEFAULT_LABOR_RATES } from './types';

const PREFIX = 'zc_';

function get<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function set<T>(key: string, value: T): void {
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Projects
export function getProjects(): Project[] { return get<Project[]>('projects', []); }
export function setProjects(p: Project[]): void { set('projects', p); }
export function addProject(p: Project): void { setProjects([...getProjects(), p]); }
export function updateProject(p: Project): void {
  setProjects(getProjects().map(x => x.id === p.id ? p : x));
}
export function deleteProject(id: string): void {
  setProjects(getProjects().filter(x => x.id !== id));
}

// Punch Items
export function getPunchItems(): PunchItem[] { return get<PunchItem[]>('punchItems', []); }
export function setPunchItems(p: PunchItem[]): void { set('punchItems', p); }
export function addPunchItem(p: PunchItem): void { setPunchItems([...getPunchItems(), p]); }
export function updatePunchItem(p: PunchItem): void {
  setPunchItems(getPunchItems().map(x => x.id === p.id ? p : x));
}
export function deletePunchItem(id: string): void {
  setPunchItems(getPunchItems().filter(x => x.id !== id));
}

// Sub Contractors
export function getSubs(): SubContractor[] { return get<SubContractor[]>('subs', []); }
export function setSubs(s: SubContractor[]): void { set('subs', s); }
export function addSub(s: SubContractor): void { setSubs([...getSubs(), s]); }
export function updateSub(s: SubContractor): void {
  setSubs(getSubs().map(x => x.id === s.id ? s : x));
}
export function deleteSub(id: string): void {
  setSubs(getSubs().filter(x => x.id !== id));
}

// Estimates
export function getEstimates(): Estimate[] { return get<Estimate[]>('estimates', []); }
export function setEstimates(e: Estimate[]): void { set('estimates', e); }
export function addEstimate(e: Estimate): void { setEstimates([...getEstimates(), e]); }
export function updateEstimate(e: Estimate): void {
  setEstimates(getEstimates().map(x => x.id === e.id ? e : x));
}
export function deleteEstimate(id: string): void {
  setEstimates(getEstimates().filter(x => x.id !== id));
}

// Photo Analyses
export function getPhotoAnalyses(): PhotoAnalysis[] { return get<PhotoAnalysis[]>('photoAnalyses', []); }
export function setPhotoAnalyses(p: PhotoAnalysis[]): void { set('photoAnalyses', p); }
export function addPhotoAnalysis(p: PhotoAnalysis): void { setPhotoAnalyses([...getPhotoAnalyses(), p]); }

// Signatures
export function getSignatures(): Signature[] { return get<Signature[]>('signatures', []); }
export function setSignatures(s: Signature[]): void { set('signatures', s); }
export function addSignature(s: Signature): void { setSignatures([...getSignatures(), s]); }

// Settings
const defaultSettings: AppSettings = {
  companyName: 'Zacher Construction LLC',
  ownerName: 'Ryan Zacher',
  phone: '(555) 123-4567',
  email: 'ryan@zacherconstruction.com',
  address: '123 Builder Lane, Construction City, ST 12345',
  logo: '',
  defaultLaborRates: { ...DEFAULT_LABOR_RATES },
  theme: 'system',
};

export function getSettings(): AppSettings { return get<AppSettings>('settings', defaultSettings); }
export function setSettings(s: AppSettings): void { set('settings', s); }

// Seed data
export function seedIfEmpty(): void {
  if (getProjects().length > 0) return;

  const now = new Date().toISOString();
  const subs: SubContractor[] = [
    { id: uid(), name: 'Mike Torres', company: 'Torres Electric', trade: 'electrical', phone: '(555) 234-5678', email: 'mike@torreselectric.com', rate: 85, rating: 4.8, completedJobs: 23, avgResponseTime: '2h', notes: 'Very reliable, licensed master electrician' },
    { id: uid(), name: 'Dave Plumbing', company: 'Dave\'s Plumbing Co', trade: 'plumbing', phone: '(555) 345-6789', email: 'dave@davesplumbing.com', rate: 80, rating: 4.5, completedJobs: 18, avgResponseTime: '4h', notes: 'Good work, sometimes runs late' },
    { id: uid(), name: 'Sarah Kim', company: 'Kim HVAC Solutions', trade: 'hvac', phone: '(555) 456-7890', email: 'sarah@kimhvac.com', rate: 90, rating: 4.9, completedJobs: 31, avgResponseTime: '1h', notes: 'Top tier, handles commercial and residential' },
    { id: uid(), name: 'Carlos Vega', company: 'Vega Drywall', trade: 'drywall', phone: '(555) 567-8901', email: 'carlos@vegadrywall.com', rate: 50, rating: 4.3, completedJobs: 42, avgResponseTime: '3h', notes: 'Fast, clean finishes' },
    { id: uid(), name: 'Jim Lawson', company: 'Lawson Painting', trade: 'painting', phone: '(555) 678-9012', email: 'jim@lawsonpainting.com', rate: 45, rating: 4.6, completedJobs: 35, avgResponseTime: '2h', notes: 'Great color matching, detail oriented' },
  ];
  setSubs(subs);

  const projects: Project[] = [
    { id: uid(), name: 'Riverside Apartments Renovation', client: 'Riverside Property Group', address: '450 River Rd, Suite 200', status: 'active', type: 'Renovation', sqFootage: 12000, startDate: '2026-01-15', budget: 285000, spent: 142000, notes: '24-unit complex, Phase 1 of 3', createdAt: now, updatedAt: now },
    { id: uid(), name: 'Oak Street Kitchen Remodel', client: 'Jennifer & Mark Thompson', address: '822 Oak Street', status: 'active', type: 'Remodel', sqFootage: 350, startDate: '2026-02-01', budget: 45000, spent: 18000, notes: 'Full kitchen gut and rebuild, client wants modern farmhouse style', createdAt: now, updatedAt: now },
    { id: uid(), name: 'Downtown Office Build-Out', client: 'TechStart Inc', address: '100 Main St, 3rd Floor', status: 'planning', type: 'Commercial Build-Out', sqFootage: 5000, startDate: '2026-03-01', budget: 180000, spent: 0, notes: 'Open floor plan with 4 private offices, server room needs dedicated HVAC', createdAt: now, updatedAt: now },
    { id: uid(), name: 'Maple Heights Bathroom', client: 'Robert Chen', address: '1544 Maple Heights Dr', status: 'completed', type: 'Remodel', sqFootage: 120, startDate: '2025-11-01', endDate: '2026-01-10', budget: 22000, spent: 21200, notes: 'Master bath remodel, walk-in shower conversion', createdAt: now, updatedAt: now },
  ];
  setProjects(projects);

  const punchItems: PunchItem[] = [
    { id: uid(), projectId: projects[0].id, unit: 'Unit 4B', area: 'Kitchen', description: 'Cabinet doors not aligned properly', status: 'open', priority: 'medium', trade: 'general', assignedTo: subs[3].id, dueDate: '2026-02-20', photos: [], createdAt: now, updatedAt: now },
    { id: uid(), projectId: projects[0].id, unit: 'Unit 4B', area: 'Bathroom', description: 'Shower valve leaking behind wall', status: 'in-progress', priority: 'urgent', trade: 'plumbing', assignedTo: subs[1].id, dueDate: '2026-02-16', photos: [], createdAt: now, updatedAt: now },
    { id: uid(), projectId: projects[0].id, unit: 'Unit 5A', area: 'Living Room', description: 'Outlet not wired — no power on east wall', status: 'open', priority: 'high', trade: 'electrical', assignedTo: subs[0].id, dueDate: '2026-02-18', photos: [], createdAt: now, updatedAt: now },
    { id: uid(), projectId: projects[1].id, unit: 'Main', area: 'Kitchen', description: 'Backsplash grout cracking near window', status: 'open', priority: 'medium', trade: 'general', assignedTo: '', dueDate: '2026-02-25', photos: [], createdAt: now, updatedAt: now },
    { id: uid(), projectId: projects[0].id, unit: 'Unit 3A', area: 'Hallway', description: 'Paint touch-up needed at drywall seams', status: 'resolved', priority: 'low', trade: 'painting', assignedTo: subs[4].id, dueDate: '2026-02-15', photos: [], createdAt: now, updatedAt: now },
  ];
  setPunchItems(punchItems);

  const estimates: Estimate[] = [
    {
      id: uid(), clientName: 'TechStart Inc', clientEmail: 'cfo@techstart.com', projectType: 'Commercial Build-Out', sqFootage: 5000,
      scopeItems: ['Framing', 'Electrical', 'HVAC', 'Drywall', 'Painting', 'Flooring'],
      lineItems: [
        { id: uid(), description: 'Metal stud framing', trade: 'framing', manHours: 120, laborRate: 65, materialCost: 8500, quantity: 1 },
        { id: uid(), description: 'Electrical rough-in & finish', trade: 'electrical', manHours: 80, laborRate: 85, materialCost: 12000, quantity: 1 },
        { id: uid(), description: 'HVAC ductwork & units', trade: 'hvac', manHours: 60, laborRate: 90, materialCost: 25000, quantity: 1 },
        { id: uid(), description: 'Drywall & finishing', trade: 'drywall', manHours: 100, laborRate: 50, materialCost: 6000, quantity: 1 },
        { id: uid(), description: 'Interior painting', trade: 'painting', manHours: 60, laborRate: 45, materialCost: 3500, quantity: 1 },
        { id: uid(), description: 'Commercial flooring', trade: 'flooring', manHours: 40, laborRate: 60, materialCost: 15000, quantity: 1 },
      ],
      notes: 'Estimate for full 3rd floor build-out. Does not include furniture or IT infrastructure.', status: 'sent', createdAt: now, updatedAt: now,
    },
  ];
  setEstimates(estimates);
}
