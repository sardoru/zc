# Zacher Construction — Management App

A bespoke construction management application built for **Zacher Construction LLC**, a solo-operator general contractor who coordinates subcontractors across residential and commercial projects.

Designed as a **"second brain"** — mobile-first, thumb-friendly, and built to minimize admin overhead so the operator can focus on the jobsite.

## Live Demo

Deployed via Vercel from [sardoru/zacher-construction](https://github.com/sardoru/zacher-construction).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript 5.9 |
| Build | Vite 7 |
| Styling | Tailwind CSS 4 (Vite plugin) |
| Routing | React Router 7 |
| Icons | Lucide React |
| Storage | localStorage (offline-first, zero backend) |
| Deployment | Vercel (static export) |

## Features

### 1. Dashboard (`/`)
At-a-glance overview of the entire operation:
- **Summary cards** — active projects, open punch items, pending estimates, total subs
- **Attention needed** — urgent/high-priority or overdue punch items, sorted by severity
- **Quick actions** — one-tap shortcuts to create projects, estimates, or punch items
- **Active projects** — budget progress bars with color-coded utilization (green/amber/red)

### 2. Projects (`/projects`)
Full project lifecycle management:
- Status filter pills (Planning → Active → On Hold → Completed → Archived)
- Search by project name or client
- Card grid with budget progress, dates, type, and square footage
- Slide-over panel for create/edit with full validation
- Supports `?new=true` query param for deep-link project creation

### 3. Estimates (`/estimates`)
Client-facing estimate builder with line-item granularity:
- **Quick Estimator** — ballpark pricing from square footage and selected trades
- **Full estimate form** — client info, project details, scope of work (trade checkboxes auto-generate line items)
- **Line items** — per-item: description, trade, man-hours, labor rate, material cost, quantity
- **Auto-calculated totals** — labor subtotal, materials subtotal, grand total
- Status workflow: Draft → Sent → Approved / Rejected

### 4. Punch Lists (`/punch-lists`)
Issue tracking per project, unit, and area:
- Multi-filter: project, status, priority, trade, search
- Grouped by project with expandable cards
- Status workflow buttons: Open → In Progress → Resolved → Verified
- Overdue detection with visual indicators
- Assigned subcontractor (auto-filtered by trade)

### 5. Photo Analysis (`/photos`)
AI-powered jobsite photo inspection (mock):
- Drag-and-drop or file picker upload
- Simulated AI analysis with progress bar
- Results: correct items (green), issues found (amber), suggested subcontractor
- Analysis history with expandable detail cards

### 6. Subcontractors (`/subs`)
Subcontractor rolodex with performance tracking:
- Filter by trade, search by name/company
- Contact links (tap-to-call, tap-to-email)
- Performance stats: hourly rate, star rating, completed jobs, response time
- Active punch item count per sub
- Modal form for create/edit with star rating selector

### 7. E-Signatures (`/signatures`)
Digital signature capture for estimates:
- Pending signatures queue (all "sent" estimates)
- Full estimate summary preview before signing
- Canvas-based signature pad (mouse + touch)
- Signed documents archive with audit trail (signer, timestamp, IP)

### 8. PDF Export (`/export`)
Print-ready document generation:
- **Estimate/Quote PDF** — company header, line items, totals, terms, signature
- **Project Report** — timeline, financials, budget progress, punch list summary
- **Punch List Report** — filterable table with status/priority/trade breakdown
- **Financial Summary** — overview cards, per-project breakdown, budget utilization bars
- Uses `window.print()` for native PDF save

### 9. Reports (`/reports`)
Analytics dashboard with five report tabs:
- **Financial Overview** — total budget, spent, remaining, per-project utilization
- **Punch List Summary** — status distribution, overdue count, avg resolution time, by-trade breakdown
- **Sub Performance** — sortable table with ratings, active items, completion stats
- **Project Status** — status counts, project timelines
- **Estimate Conversion** — conversion rate, value pipeline, status breakdown

### 10. Settings (`/settings`)
Application configuration:
- Company info (name, owner, phone, email, address, logo)
- Theme toggle (Light / Dark / System) with localStorage persistence
- Default labor rates per trade (11 trades, reset to defaults)
- Data management: storage usage, JSON export/import, clear all data

## Design System

- **Color palette** — Amber accent (`amber-500`/`amber-600`) on Stone neutrals
- **Dark mode** — Full dark mode with `dark:` variants, togglable from sidebar or settings
- **Mobile-first** — All layouts reflow for phone screens; 44px minimum touch targets
- **Typography** — System font stack with `-apple-system` and font smoothing
- **Components** — Rounded cards (`rounded-xl`), subtle shadows, border separations

## Data Model

All data persists to `localStorage` with a `zc_` prefix. Key entities:

| Entity | Key Fields |
|--------|-----------|
| **Project** | name, client, address, status, type, sqFootage, budget, spent |
| **PunchItem** | projectId, unit, area, description, status, priority, trade, assignedTo, dueDate |
| **SubContractor** | name, company, trade, phone, email, rate, rating, completedJobs |
| **Estimate** | clientName, clientEmail, projectType, sqFootage, scopeItems[], lineItems[], status |
| **PhotoAnalysis** | projectId, unit, area, photoUrl, aiNotes, issuesFound[], correctItems[] |
| **Signature** | estimateId, signerName, signerEmail, signatureData, signedAt |
| **AppSettings** | companyName, ownerName, phone, email, defaultLaborRates, theme |

### Supported Trades (11)
General, Electrical, Plumbing, HVAC, Drywall, Painting, Flooring, Roofing, Framing, Concrete, Landscaping

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The app seeds demo data on first load (4 projects, 5 punch items, 5 subs, 1 estimate). Clear from Settings → Data Management.

## Project Structure

```
src/
├── main.tsx                 # Entry point
├── App.tsx                  # Router setup + seed initialization
├── index.css                # Tailwind v4 + theme variables
├── types.ts                 # TypeScript interfaces & constants
├── store.ts                 # localStorage CRUD + seed data
├── hooks/
│   └── useTheme.ts          # Light/dark/system theme management
├── components/
│   └── Layout.tsx           # Sidebar + mobile nav + content shell
└── pages/
    ├── Dashboard.tsx         # Overview dashboard
    ├── Projects.tsx          # Project CRUD
    ├── Estimates.tsx         # Estimate builder
    ├── PunchLists.tsx        # Punch list management
    ├── PhotoAnalysis.tsx     # AI photo inspection (mock)
    ├── SubContractors.tsx    # Sub rolodex
    ├── ESignatures.tsx       # Digital signatures
    ├── PDFExport.tsx         # Print/PDF generation
    ├── Reports.tsx           # Analytics dashboard
    └── Settings.tsx          # App configuration
```

## Roadmap

- [ ] QuickBooks Online integration (invoices, expense sync)
- [ ] Real AI photo analysis (GPT-4 Vision / Claude)
- [ ] Shareable subcontractor links (punch items view without login)
- [ ] Push notifications for overdue items
- [ ] Supabase backend (multi-device sync, auth)
- [ ] Quick intake quote form (public-facing, embeddable)

## License

Private — built for Zacher Construction LLC.
