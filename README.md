# Zacher Construction Management App

> Bespoke construction management platform built for **Zacher Construction LLC**. Designed for a solo operator running subcontractors — fast, mobile-first, and built to eliminate admin overhead.

---

## 🎯 Problem

Running a one-man construction operation means wearing every hat: estimating jobs, coordinating subs, tracking punch lists, chasing signatures, invoicing clients, and documenting everything — often from the cab of a truck. Existing tools are either enterprise bloatware or too basic to be useful.

**This app is Ryan's second brain.** It handles the mundane so he can focus on the work.

---

## ✨ Features

### 📋 Estimate Builder
- **Quick intake form** — project type, sq footage, scope checkboxes → ballpark estimate in seconds
- **Market-rate pricing engine** — auto-calculates man-hours per trade at current market rates
- **Line-item breakdowns** — labor, materials, subtotals, margins
- **Estimate templates** — save common job types, clone & tweak per project
- **PDF export** — branded, professional quotes ready to send to clients

### ✍️ E-Signatures
- **Touch-friendly signing** — works on phone, tablet, desktop
- **Sign estimates, contracts, change orders** in-app
- **Audit trail** — timestamped signature records for every document
- **Client signing** — shareable link, no account required

### 🏗️ Project Management
- **Project dashboard** — one screen shows what needs attention *today*
- **Per-project, per-unit punch lists** — create, assign to subs, track status
- **Status workflow** — Open → In Progress → Resolved → Verified
- **Photo attachments** per punch item with before/after support
- **Due dates & priority levels** — never lose track of what's overdue
- **Filter by trade, status, unit** — find anything instantly

### 🤖 AI Photo Analysis
- **Snap a photo on-site** → AI analyzes the work
- **Flags what's correct** and what needs attention
- **Identifies which subcontractor** should review/fix the issue
- **Auto-generates inspection notes** — no typing required
- **Photos tagged** to project → unit → room/area for full traceability

### 👷 Sub Coordination
- **Assign punch items to subs** with one tap
- **Shareable links** — subs view their tasks without needing an account
- **Text/email notifications** when items are assigned or updated
- **Subs mark complete + upload photo proof** — close the loop without phone calls
- **Sub performance tracking** — response times, completion rates

### 💰 QuickBooks Integration
- **Direct sync** with QuickBooks Online (or CSV/IIF export for Desktop)
- **Auto-generate invoices** from approved estimates
- **Expense tracking per project** — know your real margins
- **P&L per project** — profitability at a glance

### 📄 PDF Reports & Exports
- **Branded estimate/quote PDFs** — Zacher Construction logo, colors, professional layout
- **Project progress reports** — timeline, completion %, photos
- **Punch list reports** — per project or per unit, filterable
- **Photo documentation reports** — AI analysis included
- **Financial summaries** — cost vs. estimate, margins, change order impact

---

## 📱 Design Philosophy

Built for someone who works with their hands, not at a desk.

| Principle | Implementation |
|-----------|---------------|
| **Mobile-first** | Every feature works great on a phone in one hand |
| **Thumb-friendly** | 44px minimum tap targets, bottom-anchored actions |
| **Fast capture** | Photo → AI notes, voice-to-text, one-tap templates |
| **Minimal data entry** | Smart defaults, autofill, clone from previous jobs |
| **Dark + Light mode** | Toggle with persistence; light = warm off-white with strong contrast, dark = deep blacks with glass morphism |
| **Responsive** | Fluid layouts from 375px → 1440px using CSS clamp() |
| **Offline-capable** | Core features work without signal (sync when connected) |

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React + Vite + TypeScript |
| **UI Framework** | Tailwind CSS + shadcn/ui |
| **Backend** | Node.js + Express (or Next.js API routes) |
| **Database** | PostgreSQL (via Supabase) |
| **Auth** | Supabase Auth (email + magic link) |
| **AI Vision** | OpenAI Vision API / Google Gemini |
| **PDF Generation** | React-PDF / Puppeteer (server-side) |
| **E-Signatures** | Custom canvas signature component |
| **QuickBooks** | Intuit QuickBooks Online API (OAuth 2.0) |
| **File Storage** | Supabase Storage (photos, documents) |
| **Notifications** | Twilio (SMS) + SendGrid (email) |
| **Hosting** | Vercel (frontend) + Railway/Supabase (backend) |
| **PWA** | Service worker for offline support |

---

## 📁 Project Structure

```
zc/
├── README.md
├── docs/
│   ├── features.md          # Detailed feature specifications
│   ├── database-schema.md   # Full DB schema + relationships
│   ├── api-design.md        # REST API endpoints
│   ├── ui-wireframes.md     # Screen-by-screen wireframes
│   └── ai-analysis.md       # AI photo analysis architecture
├── app/
│   ├── public/
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   │   ├── ui/          # shadcn/ui base components
│   │   │   ├── estimates/   # Estimate builder components
│   │   │   ├── projects/    # Project management views
│   │   │   ├── punch/       # Punch list components
│   │   │   ├── photos/      # Photo capture + AI analysis
│   │   │   └── signatures/  # E-signature components
│   │   ├── pages/           # Route-level page components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Utilities, helpers, constants
│   │   ├── ai/              # AI photo analysis module
│   │   ├── integrations/    # QuickBooks, SMS, email
│   │   └── styles/          # Global styles, theme config
│   ├── supabase/
│   │   ├── migrations/      # Database migrations
│   │   └── functions/       # Edge functions (AI, PDF, etc.)
│   └── ...
├── scripts/                 # Build, deploy, seed scripts
└── .github/
    └── workflows/           # CI/CD
```

---

## 🗺️ Roadmap

### Phase 1 — Foundation
- [ ] Database schema design
- [ ] UI wireframes & design system
- [ ] Auth + user management
- [ ] Project CRUD (create, view, edit, archive)
- [ ] Dark/light mode + responsive layout

### Phase 2 — Core Features
- [ ] Estimate builder + templates
- [ ] PDF export (estimates/quotes)
- [ ] Punch lists (per project, per unit)
- [ ] Photo upload + tagging

### Phase 3 — Intelligence
- [ ] AI photo analysis integration
- [ ] Market-rate pricing engine
- [ ] Man-hours calculator by trade
- [ ] Auto-generated inspection notes

### Phase 4 — Coordination
- [ ] Sub contractor management
- [ ] Shareable punch list links (no login)
- [ ] SMS/email notifications
- [ ] Sub completion + photo proof flow

### Phase 5 — Business
- [ ] E-signature flow
- [ ] QuickBooks Online integration
- [ ] Financial reports (P&L per project)
- [ ] Offline/PWA support

---

## 🚀 Getting Started

```bash
# Clone the repo
git clone https://github.com/sardoru/zc.git
cd zc

# Install dependencies (once app is scaffolded)
cd app && npm install

# Set up environment variables
cp .env.example .env.local

# Run development server
npm run dev
```

---

## 📝 License

Private — Built exclusively for Zacher Construction LLC.

---

*Built with ☕ and purpose.*
