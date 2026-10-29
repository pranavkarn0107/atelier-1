import {
  BudgetCategory,
  DietaryRestriction,
  TaskPhase,
} from './types/event';

/**
 * Standard HTTP status codes used by the Express API server.
 */
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  INTERNAL_SERVER_ERROR = 500,
}

/**
 * Server and Gemini AI runtime configuration constants.
 */
export const SERVER_CONFIG = {
  DEFAULT_PORT: 3000,
  HOST: '0.0.0.0',
  JSON_BODY_LIMIT: '2mb',
  GEMINI_MODEL: 'gemini-3.8-flash',
  PLACEHOLDER_API_KEY: 'MY_GEMINI_API_KEY',
  USER_AGENT: 'aistudio-build',
  HEALTH_SERVICE_NAME: 'atelier-cloud-sync',
  CURATED_ENGINE_ID: 'atelier-curated-engine',
  CURATED_FALLBACK_ID: 'atelier-curated-fallback',
} as const;

/**
 * Browser localStorage persistence keys.
 */
export const STORAGE_KEYS = {
  EVENTS: 'atelier_celebration_events_v2',
  USER: 'atelier_current_user_v2',
  TEMPLATES: 'atelier_templates_v2',
  THEMES: 'atelier_themes_v2',
  ACTIVE_THEME: 'atelier_active_theme_id_v2',
} as const;

/**
 * Event budget tiers, contingency reserve percentages, and allocation ratios.
 */
export const BUDGET_TIERS = {
  MIN_BUDGET: 0,
  MAX_LINE_ITEM_COST: 10_000_000,
  MAX_EVENT_BUDGET: 100_000_000,
  DEFAULT_TARGET_BUDGET: 50_000,
  FALLBACK_ITEM_COST: 1_500,
  OVERRUN_WARNING_MULTIPLIER: 1.1,
  DEPOSIT_PAYMENT_RATIO: 0.5,
  LOW_CONTINGENCY_PERCENT: 5,
  MID_CONTINGENCY_PERCENT: 7.5,
  HIGH_CONTINGENCY_PERCENT: 10,
  MID_CONTINGENCY_GUEST_THRESHOLD: 40,
  HIGH_CONTINGENCY_GUEST_THRESHOLD: 80,
  VENUE_ALLOCATION_SHARE: 0.26,
  CATERING_ALLOCATION_SHARE: 0.34,
  PHOTO_ALLOCATION_SHARE: 0.09,
  DECOR_ALLOCATION_SHARE: 0.12,
  ENTERTAINMENT_ALLOCATION_SHARE: 0.08,
  MIN_CATERING_PER_GUEST: 95,
  MAX_CATERING_PER_GUEST: 320,
  MIN_CATERING_GUEST_DIVISOR: 20,
} as const;

/**
 * Guest headcount, plus-one, and collaboration capacity limits.
 */
export const GUEST_LIMITS = {
  MIN_EXPECTED_GUESTS: 1,
  MAX_EXPECTED_GUESTS: 100_000,
  DEFAULT_EXPECTED_GUESTS: 80,
  MIN_PLUS_ONES: 0,
  MAX_PLUS_ONES: 10,
  MAX_COLLABORATORS: 10,
  SIMULATOR_MIN_GUESTS: 10,
  SIMULATOR_MAX_GUESTS: 200,
} as const;

/**
 * Timeline, buffer interval, and date calculation constants.
 */
export const TIMELINE_CONSTANTS = {
  RECOMMENDED_STAGE_BUFFER_MINUTES: 15,
  MINUTES_PER_HOUR: 60,
  HOURS_PER_DAY: 24,
  MINUTES_PER_DAY: 1440,
  MS_PER_DAY: 86_400_000,
  DEFAULT_REFERENCE_DATE: '2026-10-23',
  FALLBACK_DATE_LABEL: 'Date TBD',
} as const;

/**
 * Event readiness scoring weights and status thresholds.
 */
export const READINESS_THRESHOLDS = {
  MAX_SCORE: 100,
  MIN_SCHEDULE_HEALTH: 20,
  CONFLICT_PENALTY_POINTS: 20,
  OVER_BUDGET_PENALTY_MULTIPLIER: 2,
  TASK_WEIGHT: 0.4,
  BUDGET_WEIGHT: 0.25,
  GUEST_WEIGHT: 0.2,
  SCHEDULE_WEIGHT: 0.15,
  ACTION_REQUIRED_SCORE: 55,
  NEEDS_ATTENTION_SCORE: 75,
} as const;

/**
 * Field length and validation boundaries for forms and Firestore documents.
 */
export const VALIDATION_LIMITS = {
  MIN_TEXT_LENGTH: 2,
  MIN_EVENT_NAME_LENGTH: 3,
  MIN_EMAIL_LENGTH: 3,
  MIN_PASSWORD_LENGTH: 6,
  MAX_CATEGORY_LENGTH: 80,
  MAX_ASSIGNEE_LENGTH: 80,
  MAX_TITLE_LENGTH: 120,
  MAX_VENUE_LENGTH: 120,
  MAX_EMAIL_LENGTH: 160,
  MAX_SCHEDULE_TITLE_LENGTH: 160,
  MAX_TASK_TITLE_LENGTH: 200,
  MAX_DESCRIPTION_LENGTH: 400,
  MAX_FIRESTORE_ID_LENGTH: 128,
} as const;

/**
 * Strongly-typed readiness status labels.
 */
export enum ReadinessStatus {
  ON_TRACK = 'On Track',
  NEEDS_ATTENTION = 'Needs Attention',
  ACTION_REQUIRED = 'Action Required',
}

/**
 * Canonical list of supported guest dietary classifications.
 */
export const ALL_DIETARY_RESTRICTIONS: readonly DietaryRestriction[] = [
  'Standard',
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
] as const;

/**
 * Canonical list of supported event budget categories.
 */
export const ALL_BUDGET_CATEGORIES: readonly BudgetCategory[] = [
  'Venue & Rentals',
  'Catering & Beverage',
  'Floral & Production',
  'Entertainment & AV',
  'Attire & Stationery',
  'Logistics & Staffing',
] as const;

/**
 * Canonical list of 4-stage event production task phases.
 */
export const ALL_TASK_PHASES: readonly TaskPhase[] = [
  'Pre-Event',
  'Venue & Catering',
  'Guest Experience',
  'Day-Of Execution',
] as const;

/**
 * Recharts palette colors mapped to each budget category.
 */
export const CATEGORY_COLORS: Readonly<Record<BudgetCategory, string>> = {
  'Venue & Rentals': '#0F172A',
  'Catering & Beverage': '#B45309',
  'Floral & Production': '#047857',
  'Entertainment & AV': '#1D4ED8',
  'Attire & Stationery': '#4338CA',
  'Logistics & Staffing': '#475569',
} as const;

/**
 * Compact chart axis labels mapped to each budget category.
 */
export const CATEGORY_SHORT_LABELS: Readonly<Record<BudgetCategory, string>> = {
  'Venue & Rentals': 'Venue',
  'Catering & Beverage': 'Catering',
  'Floral & Production': 'Floral',
  'Entertainment & AV': 'Ent. & AV',
  'Attire & Stationery': 'Stationery',
  'Logistics & Staffing': 'Logistics',
} as const;

/**
 * Real-time toast notification thresholds and display timings for budget persistence alerts.
 */
export const NOTIFICATION_CONSTANTS = {
  SIGNIFICANT_BUDGET_THRESHOLD: 1_000,
  SIGNIFICANT_BUDGET_SHARE_RATIO: 0.05,
  TOAST_AUTO_DISMISS_MS: 6_500,
  MAX_VISIBLE_TOASTS: 4,
  MIN_EDITABLE_TARGET_BUDGET: 1_000,
  TARGET_BUDGET_STEP: 500,
  DEFAULT_PERSISTENCE_CHANNEL: 'Local Storage + Cloud Firestore Ledger',
} as const;

/**
 * Standard HTTP security response headers applied by the Express server.
 */
export const SECURITY_HEADERS = {
  X_CONTENT_TYPE_OPTIONS: 'nosniff',
  X_FRAME_OPTIONS: 'SAMEORIGIN',
  REFERRER_POLICY: 'strict-origin-when-cross-origin',
} as const;

