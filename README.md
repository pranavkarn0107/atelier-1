# Atelier — Celebration & Event Planner

**Atelier** is a full-stack Celebration & Event Planner web application designed for executive event architects, wedding planners, and production teams. It combines a real-time client-side dashboard for milestone task tracking, automated per-guest/fixed budget ledger calculations, Recharts financial analytics, guest RSVP & dietary management, and run-of-show conflict detection with **Firebase Authentication**, **Cloud Firestore** multi-user collaboration, a **Template & Theme Marketplace**, and a **Gemini AI Recommendation & Google Search Grounding Concierge**.

---

## Key Features

### 1. Executive Dashboard & Live Headcount-to-Budget Modeling (`Overview`)
- **Readiness Score & KPI Strip**: Real-time calculation of overall event execution readiness (`0–100%`), task completion progress across 4 production phases, committed budget vs. target ceiling, confirmed headcount, and run-of-show schedule blocks.
- **Interactive Headcount-to-Budget Simulator**: Live slider that models how changes in guest count dynamically affect variable per-guest line items (catering, sommelier pairings, stationery) alongside fixed venue and production costs.
- **Priority Action Queue & Dietary Breakdown**: Instant visibility into high-priority open tasks and confirmed guest dietary requirements (*Standard*, *Vegetarian*, *Vegan*, *Gluten-Free*).

### 2. Automated Cost Ledger, Recharts Analytics & Overrun Alerts (`Budget`)
- **Fixed vs. Per-Guest Automated Scaling**: Line items configured as `per-guest` automatically multiply by the confirmed guest headcount (`confirmedGuests + confirmedPlusOnes`), while `fixed` fees remain constant.
- **Recharts Projected vs. Actual Visualizations**:
  - **Total Projected vs. Actual Progress Bar**: Dual-track progress bar comparing **Projected (Estimated)** baseline against **Actual (Committed)** spend with a live **Disbursed / Paid** overlay and **Actual / Projected Ratio**.
  - **Category Comparison BarChart (`recharts`)**: Grouped bar chart comparing Projected vs. Actual spending across *Venue & Rentals*, *Catering & Beverage*, *Floral & Production*, *Entertainment & AV*, *Attire & Stationery*, and *Logistics & Staffing*.
  - **Category Spending Donut PieChart (`recharts`)**: Interactive pie chart with a mode toggle (**Actual Spend** vs. **Projected**) and click-to-filter category slices.
- **>10% Projected Overrun Warning System**: Automatically detects any budget category or line item exceeding its projected amount by more than 10% (`actual > projected * 1.1`), rendering a top-level variance alert banner, highlighting affected bars and rows in amber, and placing exclamation icons (`AlertCircle`) next to flagged categories and ledger items.

### 3. Dynamic Milestone Task Checklist (`Tasks`)
- **4-Phase Production Workflow**: Organize tasks across *Pre-Event*, *Venue & Catering*, *Guest Experience*, and *Day-Of Execution*.
- **Search, Filter & Inline Status Updates**: Filter by phase or status (`todo`, `in-progress`, `completed`), search by keyword or assignee, and add validated task milestones.

### 4. Guest RSVP, Plus-One & Table Assignment Manager (`Guests`)
- **Real-Time Headcount Aggregation**: Updating a guest's RSVP status (`confirmed`, `pending`, `declined`) or adjusting their plus-one count (`+` / `-`) immediately recalculates the confirmed headcount and updates all per-guest budget items across the app.
- **Dietary & Table Tracking**: Filter guests by RSVP status or dietary restriction and assign seating table numbers.

### 5. Chronological Run-of-Show & Overlap Conflict Detection (`Timeline`)
- **Automatic Schedule Sorting & Conflict Detection**: Sorts cue blocks chronologically (`HH:MM`) and automatically flags overlapping time windows (`hasConflict`) with the names of conflicting activities.

### 6. Authentication & Multi-User Co-Planner Collaboration
- **Firebase Authentication**: Supports Email/Password Sign Up & Log In, Google OAuth Sign-In (`signInWithPopup`), and quick demo workspace switching.
- **Email Co-Planner Invitations**: Event owners can invite collaborators via email with granular role permissions:
  - `co-planner`: Full permission to view and edit event details, tasks, and budgets.
  - `viewer`: Read-only access to the event dashboard.

### 7. Template & Theme Marketplace (`Marketplace`)
- **Publish & Share Templates**: Save any active event plan (tasks, budget items, and run-of-show schedule) as a **Public Marketplace** or **Private Vault** blueprint.
- **Import & Merge Blueprints**: Browse community templates, spin up a new event from a template (**Import as New Event**), or merge a template's tasks and budget items into your active event (**Merge into Current**).
- **Custom UI Theme Studio**: Switch between curated workspace palettes (*Atelier Warm Alabaster*, *Botanical Conservatory Sage*, *Symphony Midnight Indigo*) or create and apply custom UI themes with canvas, hero, and accent color pickers.

### 8. AI Recommendation Engine & Real-Time Google Search Concierge (`AI & Search`)
- **Tailored Vendor, Décor & Entertainment Engine (`POST /api/ai/recommend`)**: Powered by `@google/genai` (`gemini-3.8-flash`) with structured JSON schema output, suggesting **Venues**, **Caterers**, **Photographers**, **Decorations**, and **Entertainment** calibrated to the event's category, date, city, guest count, and target budget—complete with 1-click **Add to Budget** and **Add Task** actions.
- **Google Search Grounded Research & Fact-Check Agent (`POST /api/ai/search-agent`)**: Uses `gemini-3.8-flash` with `tools: [{ googleSearch: {} }]` to discuss current events, cite recent news, and fact-check claims with clickable web citations extracted from `groundingMetadata.groundingChunks`.

---

## Architecture & Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4 (`@tailwindcss/vite`), Recharts (`recharts`), Lucide Icons (`lucide-react`).
- **Backend**: Node.js + Express (`server.ts`) with Vite middleware in development and static asset serving in production (`port 3000`).
- **Cloud & Persistence**:
  - **Firebase Authentication** & **Cloud Firestore** (`src/firebase.ts`, `firestore.rules`, `firebase-blueprint.json`).
  - **REST API & Local Storage Sync**: Automatic dual-persistence across Firestore, Express memory store, and browser `localStorage`.
- **AI Integration**: Server-side `@google/genai` SDK (`gemini-3.8-flash`) for structured vendor recommendations and real-time Google Search grounding.

---

## Project Structure

```text
├── firebase-applet-config.json      # Provisioned Firebase project & Firestore database config
├── firebase-blueprint.json          # Firestore schema blueprint for events, collaborators & templates
├── firestore.rules                  # Hardened Firestore security rules (RBAC & schema validation)
├── security_spec.md                 # Security specification & access control invariants
├── server.ts                        # Express + Vite server & @google/genai API routes (/api/*)
├── src/
│   ├── App.tsx                      # Root workspace shell, navigation, auth & state orchestration
│   ├── firebase.ts                  # Firebase Auth + Firestore initialization & error handling
│   ├── components/
│   │   ├── OverviewTab.tsx          # Executive summary, KPIs & live headcount-to-budget slider
│   │   ├── BudgetTab.tsx            # Recharts Projected vs. Actual charts, >10% warnings & ledger
│   │   ├── TasksTab.tsx             # 4-phase milestone checklist & task creation form
│   │   ├── GuestsTab.tsx            # RSVP manager, plus-one steppers & dietary breakdown
│   │   ├── TimelineTab.tsx          # Run-of-show cue sheet & overlap conflict detector
│   │   ├── MarketplaceTab.tsx       # Public/private template marketplace & Custom Theme Studio
│   │   ├── IntelligenceTab.tsx      # AI Vendor Recommendations & Google Search Grounded Agent
│   │   ├── AuthModal.tsx            # Sign Up, Log In, Google Auth & demo account switcher
│   │   └── CollaboratorsModal.tsx   # Co-planner email invitations & event detail editor
│   ├── data/
│   │   └── seedEvents.ts            # Deterministic seed events, templates & dashboard themes
│   ├── types/
│   │   └── event.ts                 # TypeScript interfaces for events, tasks, budgets & themes
│   └── utils/
│       ├── eventCalculations.ts     # Pure calculation & validation engine
│       └── eventCalculations.test.ts# Unit test suite (node:test + node:assert/strict)
└── package.json
```

---

## Getting Started

### 1. Environment Variables
Copy `.env.example` to `.env` and configure your Gemini API key:

```bash
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
APP_URL="http://localhost:3000"
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run the Development Server
Starts the full-stack Express + Vite server on `http://localhost:3000`:

```bash
npm run dev
```

### 4. Run Unit Tests
Pure business logic and validators in `src/utils/eventCalculations.ts` are tested using Node's built-in test runner via `tsx`:

```bash
npx --yes tsx --test src/utils/eventCalculations.test.ts
```

### 5. Production Build
```bash
npm run build
```
