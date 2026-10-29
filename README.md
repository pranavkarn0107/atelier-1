# Atelier — Celebration & Event Planner

**Atelier** is a full-stack Celebration & Event Planner web application designed for executive event architects, wedding planners, and production teams. It combines a real-time client-side dashboard for milestone task tracking, automated per-guest/fixed budget ledger calculations, Recharts financial analytics, guest RSVP & dietary management, and run-of-show conflict detection with **Firebase Authentication**, **Cloud Firestore** multi-user collaboration, a **Template & Theme Marketplace**, and a **Gemini AI Recommendation & Google Search Grounding Concierge**.

---

## Project Architecture

### System Overview
- **Frontend SPA (`src/`)**: React 19, TypeScript (`strict: true`, `noImplicitAny: true`, `noUnusedLocals: true`, `noUnusedParameters: true`), Tailwind CSS v4 (`@tailwindcss/vite`), Recharts (`recharts`), and Lucide Icons (`lucide-react`).
- **Centralized Domain Constants (`src/constants.ts`)**: Strongly-typed enums and `as const` objects defining HTTP status codes (`HttpStatus`), event budget tiers and dynamic contingency reserve rates (`BUDGET_TIERS`), guest headcount & collaborator limits (`GUEST_LIMITS`), run-of-show transition buffer thresholds (`TIMELINE_CONSTANTS`), readiness weights (`READINESS_THRESHOLDS`), and input validation boundaries (`VALIDATION_LIMITS`).
- **Pure Business Logic Engine (`src/utils/eventCalculations.ts`)**: Decoupled, deterministic calculation and validation functions with full JSDoc documentation covering guest headcount aggregation, fixed vs. per-guest cost scaling, >10% category overrun detection, dynamic 5–10% contingency reserves, 15-minute stage transition buffer checks, vendor verification checkpoints, and RBAC access control.
- **Backend Server (`server.ts`)**: Node.js + Express server (`port 3000`) mounting Vite middleware in development and serving static production assets, exposing REST endpoints (`/api/events`, `/api/templates`, `/api/themes`, `/api/ai/recommend`, `/api/ai/search-agent`).
- **Real-Time Budget Notification & Persistence Confirmation (`src/components/ToastContainer.tsx`, `src/components/BudgetTab.tsx`)**:
  - Alerts the user in real time via an accessible ARIA `role="status"` / `aria-live="polite"` toast notification stack and inline ledger confirmation banner whenever a budget item is created, updated via inline edit mode, or has its payment status / target ceiling modified.
  - Automatically flags **Significant Budget Items** (`>= $1,000` effective commitment or `>= 5%` of the event's target budget ceiling) and confirms persistence across `localStorage`, Express `/api/events/:id`, and **Cloud Firestore**.
- **Cloud & Persistence (`src/firebase.ts`, `firestore.rules`, `firebase-blueprint.json`)**:
  - **Firebase Authentication** (Google OAuth popup + Email/Account profiles) and **Cloud Firestore** (`ai-studio-ateliercelebrati-88c5042e-beeb-4cec-a2ec-8330edfae850`).
  - Dual-persistence across Firestore, Express server state, and browser `localStorage`.

### Directory Layout
```text
├── eslint.config.mjs                # Flat ESLint config (explicit return types, no floating promises & Firestore rules)
├── firebase-applet-config.json      # Provisioned Firebase project & Firestore database config
├── firebase-blueprint.json          # Firestore schema blueprint for events, collaborators & templates
├── firestore.rules                  # Hardened Firestore security rules (RBAC & schema validation)
├── tsconfig.json                    # Strict TypeScript compiler configuration
├── server.ts                        # Express + Vite server & @google/genai API routes (/api/*)
├── src/
│   ├── App.tsx                      # Root workspace shell, navigation, auth, toast stack & state orchestration
│   ├── constants.ts                 # Centralized enums & const objects (budget tiers, notification thresholds, security headers)
│   ├── firebase.ts                  # Firebase Auth + Firestore initialization & structured error handling
│   ├── planner.test.ts              # Primary unit test suite (budget edge cases, toast persistence, empty inputs, date formatting)
│   ├── components/
│   │   ├── OverviewTab.tsx          # Executive summary, KPIs, vendor checkpoints & headcount simulator
│   │   ├── BudgetTab.tsx            # Recharts Projected vs. Actual charts, >10% warnings, inline editor & ledger
│   │   ├── ToastContainer.tsx       # Real-time accessible toast notification stack for budget persistence
│   │   ├── TasksTab.tsx             # 4-phase milestone checklist & task creation form
│   │   ├── GuestsTab.tsx            # RSVP manager, plus-one steppers & dietary breakdown
│   │   ├── TimelineTab.tsx          # Run-of-show cue sheet, overlap conflict & 15m buffer detector
│   │   ├── MarketplaceTab.tsx       # Public/private template marketplace & Custom Theme Studio
│   │   ├── IntelligenceTab.tsx      # AI Vendor Recommendations & Google Search Grounded Agent
│   │   ├── NewEventModal.tsx        # New event creation modal
│   │   ├── AuthModal.tsx            # Sign Up, Log In, Google Auth & demo account switcher
│   │   └── CollaboratorsModal.tsx   # Co-planner email invitations & event detail editor
│   ├── data/
│   │   └── seedEvents.ts            # Deterministic seed events, templates & dashboard themes
│   ├── types/
│   │   └── event.ts                 # TypeScript interfaces for events, tasks, budgets, toasts & themes
│   └── utils/
│       ├── eventCalculations.ts     # Pure calculation, significant budget detection, toast builder & validation engine
│       └── eventCalculations.test.ts# Extended unit test suite
└── package.json
```

---

## Gemini Prompt Schema & Production Guardrails

All Gemini interactions are executed server-side in `server.ts` using the official `@google/genai` SDK (`gemini-3.8-flash`).

### 1. System Instruction Guardrails (`PLANNER_SYSTEM_GUARDRAILS`)
Both AI endpoints enforce three domain guardrails:
1. **Realistic Buffer Intervals**: All event timelines and vendor load-in/strike schedules include realistic **15–30 minute transition buffer intervals** between event stages.
2. **Dynamic Contingency Budget Margins (5–10%)**: Preserves a dynamic **5–10% contingency budget reserve** (`5%` for intimate gatherings, `7.5%` for 40+ guest receptions, `10%` for 80+ guest galas or categories exceeding projected spend by >10%).
3. **Vendor Verification Checkpoints**: Requires explicit checkpoints for **Certificate of Insurance (COI)**, municipal/fire permits, dedicated allergen kitchen lines, and contract deposit milestones.

### 2. Structured Vendor Recommendation Schema (`POST /api/ai/recommend`)
Requests are sent to `ai.models.generateContent` with `responseMimeType: "application/json"` and the following strict `Type.ARRAY` `responseSchema`:

```json
{
  "type": "ARRAY",
  "items": {
    "type": "OBJECT",
    "properties": {
      "category": {
        "type": "STRING",
        "description": "Must be one of: Venue, Caterer, Photographer, Decoration, Entertainment"
      },
      "name": { "type": "STRING" },
      "specialty": { "type": "STRING" },
      "estimatedCost": { "type": "NUMBER" },
      "costType": {
        "type": "STRING",
        "description": "Must be fixed or per-guest"
      },
      "rationale": { "type": "STRING" },
      "location": { "type": "STRING" },
      "rating": { "type": "STRING" }
    },
    "required": [
      "category",
      "name",
      "specialty",
      "estimatedCost",
      "costType",
      "rationale",
      "location",
      "rating"
    ]
  }
}
```

### 3. Real-Time Google Search Grounding Schema (`POST /api/ai/search-agent`)
Uses `gemini-3.8-flash` with `tools: [{ googleSearch: {} }]` to discuss current events, cite recent news, or fact-check claims. Web citations are extracted from `response.candidates[0].groundingMetadata.groundingChunks` into `{ title: string; uri: string }[]`.

---

## Getting Started & Test Execution Instructions

### 1. Environment Variables
Copy `.env.example` to `.env` and configure your Gemini API key:
```bash
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
APP_URL="http://localhost:3000"
```

### 2. Install Dependencies & Start Dev Server
```bash
npm install
npm run dev
```

### 3. Execute Unit Tests
Run the automated unit test suites (`src/planner.test.ts` and `src/utils/eventCalculations.test.ts`) using Node's test runner via `tsx`:
```bash
npm test
```
Or invoke `src/planner.test.ts` directly:
```bash
npx --yes tsx --test src/planner.test.ts
```

### 4. TypeScript Strict Check & Production Build
```bash
npm run lint
npm run build
```
