# Zacher Construction Management App

**Client:** Ryan Zacher — Zacher Construction LLC
**Built by:** Sardor Umarov (bespoke software)

## Overview
Full-stack construction management platform — mobile, tablet, and desktop responsive. Estimates, e-signatures, QuickBooks integration, PDF exports, AI-powered photo analysis, punch lists, and automated quote estimation.

## Core Features

### 1. Estimates & Quotes
- Quick intake form for initial scoping (further talks, not final pricing)
- Auto-price based on market-rate man-hours per trade/task
- Labor rate database by trade (electrical, plumbing, HVAC, drywall, etc.)
- Material cost estimation
- Line-item breakdowns with subtotals
- PDF export of quotes/estimates for clients (branded, professional)

### 2. E-Signatures
- Digital signature capture on estimates, contracts, change orders
- Signature audit trail with timestamps
- Mobile-friendly touch signing

### 3. QuickBooks Integration
- Direct sync or CSV/IIF export
- Invoice generation from approved estimates
- Expense tracking per project
- P&L per project

### 4. PDF Reports & Exports
- Professional branded estimate/quote PDFs
- Project progress reports
- Punch list reports per project/unit
- Photo documentation reports
- Financial summaries

### 5. AI Photo Analysis
- Take/upload photos of job sites
- AI analyzes what was done correctly vs. issues found
- Identifies which subcontractor needs to review/fix
- Photo tagged to project → unit → room/area
- Before/after comparison support
- Generates inspection notes automatically

### 6. Punch Lists
- Per project, per unit granularity
- Assign items to subcontractors
- Status tracking (open → in progress → resolved → verified)
- Photo attachment per punch item
- Due dates and priority levels
- Filter/sort by trade, status, unit

### 7. Quote Estimator (Quick Intake)
- Simplified form: project type, sq footage, scope of work checkboxes
- Auto-generates ballpark estimate based on market rates
- Man-hours calculation per trade
- Designed as conversation starter, not final bid
- Exportable as PDF for client discussion

## Design Requirements
- **Responsive:** Mobile-first → tablet → desktop
- **Dark & Light mode:** Toggle with localStorage persistence
- Light: warm off-white, strong shadows/contrast between cards
- Dark: deep blacks, glass morphism, subtle borders
- **Professional UI/UX:** Clean typography, consistent spacing, intuitive navigation
- **Fluid typography:** clamp() for responsive font sizes
- **Touch-friendly:** 44px minimum tap targets
- **Test breakpoints:** 375px / 768px / 1024px / 1440px

## Tech Stack (TBD)
- **Frontend:** React + Vite (or Next.js for SSR)
- **UI:** Tailwind CSS + shadcn/ui (or similar component library)
- **Backend:** Node.js / Express or Next.js API routes
- **Database:** PostgreSQL (Supabase?) or Firebase
- **Auth:** Clerk / Supabase Auth / NextAuth
- **AI:** OpenAI Vision API or Google Gemini for photo analysis
- **PDF:** React-PDF or Puppeteer for server-side generation
- **E-Sign:** Custom canvas signature or DocuSign/HelloSign API
- **QuickBooks:** Intuit QuickBooks Online API (OAuth 2.0)
- **Storage:** S3 / Supabase Storage for photos
- **Hosting:** Vercel / Railway

## Project Structure
```
construction-mgmt-app/
├── README.md
├── docs/
│   ├── features.md
│   ├── database-schema.md
│   ├── api-design.md
│   └── ui-wireframes.md
├── app/                    # Main application
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── ai/            # Photo analysis module
│   │   └── integrations/  # QuickBooks, e-sign
│   └── ...
└── scripts/
```

## Status
- [x] Project initialized
- [ ] Database schema design
- [ ] UI wireframes / mockups
- [ ] Frontend scaffold
- [ ] Core CRUD (projects, units, punch lists)
- [ ] Estimate builder + PDF export
- [ ] E-signature flow
- [ ] AI photo analysis integration
- [ ] QuickBooks integration
- [ ] Testing & polish
