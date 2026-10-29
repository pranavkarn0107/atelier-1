import {
  ALL_BUDGET_CATEGORIES,
  ALL_DIETARY_RESTRICTIONS,
  ALL_TASK_PHASES,
  BUDGET_TIERS,
  CATEGORY_COLORS,
  CATEGORY_SHORT_LABELS,
  GUEST_LIMITS,
  NOTIFICATION_CONSTANTS,
  READINESS_THRESHOLDS,
  ReadinessStatus,
  TIMELINE_CONSTANTS,
  VALIDATION_LIMITS,
} from '../constants';
import {
  BudgetCategory,
  BudgetItem,
  BudgetToastAction,
  CelebrationEvent,
  DietaryRestriction,
  EventTask,
  Guest,
  ScheduleItem,
  TaskPhase,
  ToastNotification,
  ToastVariant,
} from '../types/event';

export interface GuestMetrics {
  totalInvitedEntries: number;
  confirmedGuestsOnly: number;
  confirmedPlusOnes: number;
  confirmedHeadcount: number;
  pendingHeadcount: number;
  declinedEntries: number;
  rsvpResponseRate: number;
  dietaryBreakdown: Record<DietaryRestriction, number>;
  tableCounts: Record<number, number>;
}

export interface ComputedBudgetLine extends BudgetItem {
  effectiveEstimated: number;
  effectiveActual: number;
  variance: number;
  overrunPercent: number;
  isExceedingProjectedBy10Pct: boolean;
}

export interface CategoryBudgetSummary {
  category: BudgetCategory;
  estimated: number;
  actual: number;
  paid: number;
  shareOfActualPercent: number;
  overrunPercent: number;
  isExceedingProjectedBy10Pct: boolean;
}

export interface BudgetMetrics {
  targetBudget: number;
  confirmedHeadcount: number;
  lines: ComputedBudgetLine[];
  totalEstimated: number;
  totalActual: number;
  totalPaid: number;
  remainingBalanceToPay: number;
  remainingBudget: number;
  varianceFromEstimate: number;
  utilizationPercent: number;
  costPerConfirmedGuest: number;
  fixedActualTotal: number;
  variablePerGuestActualTotal: number;
  variablePerGuestRateSum: number;
  contingencyRatePercent: number;
  contingencyReserveAmount: number;
  totalCommittedWithContingency: number;
  isOverBudget: boolean;
  categories: CategoryBudgetSummary[];
}

export interface PhaseTaskSummary {
  phase: TaskPhase;
  total: number;
  completed: number;
  percent: number;
}

export interface TaskMetrics {
  total: number;
  completed: number;
  inProgress: number;
  todo: number;
  completionPercent: number;
  urgentOpenTasks: EventTask[];
  phases: PhaseTaskSummary[];
}

export interface ComputedScheduleBlock extends ScheduleItem {
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
  bufferBeforeMinutes: number | null;
  hasTightBuffer: boolean;
  hasConflict: boolean;
  conflictingWithTitles: string[];
}

export interface TimelineMetrics {
  blocks: ComputedScheduleBlock[];
  totalDurationMinutes: number;
  conflictCount: number;
  tightBufferCount: number;
  recommendedBufferMinutes: number;
  readyOrCompletedCount: number;
  readinessPercent: number;
}

export interface VendorVerificationCheckpoint {
  id: string;
  label: string;
  category: BudgetCategory;
  verified: boolean;
  statusNote: string;
}

export interface ReadinessSummary {
  overallScore: number;
  statusLabel: 'On Track' | 'Needs Attention' | 'Action Required';
  daysUntilEvent: number;
}

/**
 * Formats an ISO date string (YYYY-MM-DD) into a human-readable date label (e.g., "Nov 14, 2026"),
 * returning a safe fallback label when the input is empty or malformed.
 */
export function formatEventDate(dateStr: string): string {
  const trimmed = (dateStr || '').trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) {
    return TIMELINE_CONSTANTS.FALLBACK_DATE_LABEL;
  }
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, monthIndex, day));
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== monthIndex ||
    parsed.getUTCDate() !== day
  ) {
    return TIMELINE_CONSTANTS.FALLBACK_DATE_LABEL;
  }
  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ] as const;
  return `${monthNames[monthIndex]} ${day}, ${year}`;
}

/**
 * Aggregates confirmed headcount, plus-ones, RSVP response rate, dietary counts, and table capacities.
 */
export function calculateGuestMetrics(guests: Guest[]): GuestMetrics {
  let confirmedGuestsOnly = 0;
  let confirmedPlusOnes = 0;
  let pendingHeadcount = 0;
  let declinedEntries = 0;

  const dietaryBreakdown: Record<DietaryRestriction, number> = {
    Standard: 0,
    Vegetarian: 0,
    Vegan: 0,
    'Gluten-Free': 0,
  };

  const tableCounts: Record<number, number> = {};

  for (const guest of guests) {
    const partySize =
      1 + Math.max(GUEST_LIMITS.MIN_PLUS_ONES, guest.plusOnes || 0);
    if (guest.rsvpStatus === 'confirmed') {
      confirmedGuestsOnly += 1;
      confirmedPlusOnes += Math.max(
        GUEST_LIMITS.MIN_PLUS_ONES,
        guest.plusOnes || 0
      );
      const diet = ALL_DIETARY_RESTRICTIONS.includes(guest.dietary)
        ? guest.dietary
        : 'Standard';
      dietaryBreakdown[diet] += partySize;

      if (guest.tableNumber !== null && guest.tableNumber > 0) {
        tableCounts[guest.tableNumber] =
          (tableCounts[guest.tableNumber] || 0) + partySize;
      }
    } else if (guest.rsvpStatus === 'pending') {
      pendingHeadcount += partySize;
    } else if (guest.rsvpStatus === 'declined') {
      declinedEntries += 1;
    }
  }

  const confirmedHeadcount = confirmedGuestsOnly + confirmedPlusOnes;
  const respondedEntries = confirmedGuestsOnly + declinedEntries;
  const rsvpResponseRate =
    guests.length > 0
      ? Math.round((respondedEntries / guests.length) * 100)
      : 0;

  return {
    totalInvitedEntries: guests.length,
    confirmedGuestsOnly,
    confirmedPlusOnes,
    confirmedHeadcount,
    pendingHeadcount,
    declinedEntries,
    rsvpResponseRate,
    dietaryBreakdown,
    tableCounts,
  };
}

/**
 * Computes fixed and per-guest budget line totals, >10% category overrun alerts, and dynamic 5–10% contingency margins.
 */
export function calculateBudgetMetrics(
  items: BudgetItem[],
  targetBudget: number,
  confirmedHeadcount: number
): BudgetMetrics {
  const safeHeadcount = Math.max(BUDGET_TIERS.MIN_BUDGET, confirmedHeadcount);
  const safeTarget = Math.max(BUDGET_TIERS.MIN_BUDGET, targetBudget);

  let totalEstimated = 0;
  let totalActual = 0;
  let totalPaid = 0;
  let fixedActualTotal = 0;
  let variablePerGuestActualTotal = 0;
  let variablePerGuestRateSum = 0;

  const lines: ComputedBudgetLine[] = items.map(
    (item): ComputedBudgetLine => {
      const multiplier = item.costType === 'per-guest' ? safeHeadcount : 1;
      const effectiveEstimated =
        Math.round(item.unitEstimated * multiplier * 100) / 100;
      const effectiveActual =
        Math.round(item.unitActual * multiplier * 100) / 100;
      const variance =
        Math.round((effectiveEstimated - effectiveActual) * 100) / 100;
      const overrunPercent =
        effectiveEstimated > 0
          ? Math.round(
              ((effectiveActual - effectiveEstimated) / effectiveEstimated) *
                1000
            ) / 10
          : 0;
      const isExceedingProjectedBy10Pct =
        effectiveEstimated > 0 &&
        effectiveActual >
          effectiveEstimated * BUDGET_TIERS.OVERRUN_WARNING_MULTIPLIER;

      totalEstimated += effectiveEstimated;
      totalActual += effectiveActual;
      totalPaid += item.paidAmount;

      if (item.costType === 'per-guest') {
        variablePerGuestActualTotal += effectiveActual;
        variablePerGuestRateSum += item.unitActual;
      } else {
        fixedActualTotal += effectiveActual;
      }

      return {
        ...item,
        effectiveEstimated,
        effectiveActual,
        variance,
        overrunPercent,
        isExceedingProjectedBy10Pct,
      };
    }
  );

  const remainingBalanceToPay = Math.max(
    BUDGET_TIERS.MIN_BUDGET,
    Math.round((totalActual - totalPaid) * 100) / 100
  );
  const remainingBudget = Math.round((safeTarget - totalActual) * 100) / 100;
  const varianceFromEstimate =
    Math.round((totalEstimated - totalActual) * 100) / 100;
  const utilizationPercent =
    safeTarget > 0 ? Math.round((totalActual / safeTarget) * 1000) / 10 : 0;
  const costPerConfirmedGuest =
    safeHeadcount > 0
      ? Math.round((totalActual / safeHeadcount) * 100) / 100
      : 0;

  const categories: CategoryBudgetSummary[] = ALL_BUDGET_CATEGORIES.map(
    (category): CategoryBudgetSummary => {
      const catLines = lines.filter(
        (l): boolean => l.category === category
      );
      const estimated = catLines.reduce(
        (acc, l): number => acc + l.effectiveEstimated,
        0
      );
      const actual = catLines.reduce(
        (acc, l): number => acc + l.effectiveActual,
        0
      );
      const paid = catLines.reduce((acc, l): number => acc + l.paidAmount, 0);
      const shareOfActualPercent =
        totalActual > 0 ? Math.round((actual / totalActual) * 100) : 0;
      const overrunPercent =
        estimated > 0
          ? Math.round(((actual - estimated) / estimated) * 1000) / 10
          : 0;
      const isExceedingProjectedBy10Pct =
        estimated > 0 &&
        actual > estimated * BUDGET_TIERS.OVERRUN_WARNING_MULTIPLIER;

      return {
        category,
        estimated,
        actual,
        paid,
        shareOfActualPercent,
        overrunPercent,
        isExceedingProjectedBy10Pct,
      };
    }
  ).filter((c): boolean => c.estimated > 0 || c.actual > 0);

  const hasCategoryOverrun = categories.some(
    (c): boolean => c.isExceedingProjectedBy10Pct
  );
  const contingencyRatePercent =
    hasCategoryOverrun ||
    safeHeadcount >= BUDGET_TIERS.HIGH_CONTINGENCY_GUEST_THRESHOLD
      ? BUDGET_TIERS.HIGH_CONTINGENCY_PERCENT
      : safeHeadcount >= BUDGET_TIERS.MID_CONTINGENCY_GUEST_THRESHOLD
      ? BUDGET_TIERS.MID_CONTINGENCY_PERCENT
      : BUDGET_TIERS.LOW_CONTINGENCY_PERCENT;
  const contingencyReserveAmount =
    Math.round(totalActual * (contingencyRatePercent / 100) * 100) / 100;
  const totalCommittedWithContingency =
    Math.round((totalActual + contingencyReserveAmount) * 100) / 100;

  return {
    targetBudget: safeTarget,
    confirmedHeadcount: safeHeadcount,
    lines,
    totalEstimated,
    totalActual,
    totalPaid,
    remainingBalanceToPay,
    remainingBudget,
    varianceFromEstimate,
    utilizationPercent,
    costPerConfirmedGuest,
    fixedActualTotal,
    variablePerGuestActualTotal,
    variablePerGuestRateSum,
    contingencyRatePercent,
    contingencyReserveAmount,
    totalCommittedWithContingency,
    isOverBudget: totalActual > safeTarget,
    categories,
  };
}

/**
 * Calculates overall and phase-by-phase task completion metrics and sorts open priority tasks.
 */
export function calculateTaskMetrics(tasks: EventTask[]): TaskMetrics {
  const total = tasks.length;
  const completed = tasks.filter((t): boolean => t.status === 'completed').length;
  const inProgress = tasks.filter(
    (t): boolean => t.status === 'in-progress'
  ).length;
  const todo = tasks.filter((t): boolean => t.status === 'todo').length;
  const completionPercent =
    total > 0 ? Math.round((completed / total) * 100) : 0;

  const urgentOpenTasks = tasks
    .filter((t): boolean => t.status !== 'completed')
    .sort((a, b): number => {
      const priorityRank = { high: 0, medium: 1, low: 2 };
      if (priorityRank[a.priority] !== priorityRank[b.priority]) {
        return priorityRank[a.priority] - priorityRank[b.priority];
      }
      return a.dueDate.localeCompare(b.dueDate);
    });

  const phases: PhaseTaskSummary[] = ALL_TASK_PHASES.map(
    (phase): PhaseTaskSummary => {
      const phaseTasks = tasks.filter((t): boolean => t.phase === phase);
      const phaseCompleted = phaseTasks.filter(
        (t): boolean => t.status === 'completed'
      ).length;
      return {
        phase,
        total: phaseTasks.length,
        completed: phaseCompleted,
        percent:
          phaseTasks.length > 0
            ? Math.round((phaseCompleted / phaseTasks.length) * 100)
            : 0,
      };
    }
  );

  return {
    total,
    completed,
    inProgress,
    todo,
    completionPercent,
    urgentOpenTasks,
    phases,
  };
}

/**
 * Parses a 24-hour time string (HH:MM) into total minutes since midnight (00:00).
 */
export function parseTimeToMinutes(timeStr: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec((timeStr || '').trim());
  if (!match) return 0;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours * TIMELINE_CONSTANTS.MINUTES_PER_HOUR + minutes;
}

/**
 * Sorts run-of-show schedule blocks chronologically, detects overlapping conflicts, and evaluates 15-minute transition buffers.
 */
export function calculateTimelineMetrics(
  schedule: ScheduleItem[]
): TimelineMetrics {
  const sorted = [...schedule].sort(
    (a, b): number =>
      parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime)
  );

  const blocks: ComputedScheduleBlock[] = sorted.map(
    (item): ComputedScheduleBlock => {
      const startMinutes = parseTimeToMinutes(item.startTime);
      let endMinutes = parseTimeToMinutes(item.endTime);
      if (endMinutes <= startMinutes) {
        endMinutes += TIMELINE_CONSTANTS.MINUTES_PER_DAY;
      }
      const durationMinutes = Math.max(0, endMinutes - startMinutes);
      return {
        ...item,
        startMinutes,
        endMinutes,
        durationMinutes,
        bufferBeforeMinutes: null,
        hasTightBuffer: false,
        hasConflict: false,
        conflictingWithTitles: [],
      };
    }
  );

  let conflictCount = 0;
  for (let i = 0; i < blocks.length; i++) {
    if (i > 0) {
      const prev = blocks[i - 1];
      const curr = blocks[i];
      const gap = curr.startMinutes - prev.endMinutes;
      curr.bufferBeforeMinutes = gap;
      if (
        gap >= 0 &&
        gap < TIMELINE_CONSTANTS.RECOMMENDED_STAGE_BUFFER_MINUTES
      ) {
        curr.hasTightBuffer = true;
      }
    }
    for (let j = i + 1; j < blocks.length; j++) {
      const a = blocks[i];
      const b = blocks[j];
      if (a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes) {
        a.hasConflict = true;
        b.hasConflict = true;
        if (!a.conflictingWithTitles.includes(b.title)) {
          a.conflictingWithTitles.push(b.title);
        }
        if (!b.conflictingWithTitles.includes(a.title)) {
          b.conflictingWithTitles.push(a.title);
        }
        conflictCount += 1;
      }
    }
  }

  const tightBufferCount = blocks.filter((b): boolean => b.hasTightBuffer).length;
  const totalDurationMinutes = blocks.reduce(
    (acc, b): number => acc + b.durationMinutes,
    0
  );
  const readyOrCompletedCount = blocks.filter(
    (b): boolean => b.status === 'ready' || b.status === 'completed'
  ).length;
  const readinessPercent =
    blocks.length > 0
      ? Math.round((readyOrCompletedCount / blocks.length) * 100)
      : 100;

  return {
    blocks,
    totalDurationMinutes,
    conflictCount,
    tightBufferCount,
    recommendedBufferMinutes:
      TIMELINE_CONSTANTS.RECOMMENDED_STAGE_BUFFER_MINUTES,
    readyOrCompletedCount,
    readinessPercent,
  };
}

/**
 * Evaluates mandatory vendor verification checkpoints (COI insurance, permits, allergen lines, and acoustic compliance).
 */
export function evaluateVendorCheckpoints(
  tasks: EventTask[],
  budgetItems: BudgetItem[]
): VendorVerificationCheckpoint[] {
  const hasVenueDeposit = budgetItems.some(
    (b): boolean =>
      b.category === 'Venue & Rentals' &&
      (b.paymentStatus === 'deposit-paid' || b.paymentStatus === 'paid')
  );
  const hasCateringDeposit = budgetItems.some(
    (b): boolean =>
      b.category === 'Catering & Beverage' &&
      (b.paymentStatus === 'deposit-paid' || b.paymentStatus === 'paid')
  );
  const hasCompletedPreEventTask = tasks.some(
    (t): boolean => t.phase === 'Pre-Event' && t.status === 'completed'
  );
  const hasCompletedVenueCateringTask = tasks.some(
    (t): boolean => t.phase === 'Venue & Catering' && t.status === 'completed'
  );
  const hasEntertainmentBooked = budgetItems.some(
    (b): boolean =>
      b.category === 'Entertainment & AV' &&
      (b.paymentStatus === 'deposit-paid' || b.paymentStatus === 'paid')
  );

  return [
    {
      id: 'chk-venue-coi',
      label: 'Venue Liability COI & Municipal Permit Checkpoint',
      category: 'Venue & Rentals',
      verified: hasVenueDeposit && hasCompletedPreEventTask,
      statusNote:
        hasVenueDeposit && hasCompletedPreEventTask
          ? 'COI & venue contract deposit verified'
          : 'Awaiting signed COI or Pre-Event permit milestone',
    },
    {
      id: 'chk-catering-health',
      label: 'Catering Health Permit & Allergen Kitchen Line',
      category: 'Catering & Beverage',
      verified: hasCateringDeposit || hasCompletedVenueCateringTask,
      statusNote:
        hasCateringDeposit || hasCompletedVenueCateringTask
          ? 'Dietary manifest & kitchen retainer verified'
          : 'Confirm catering deposit & dietary separation protocol',
    },
    {
      id: 'chk-av-acoustic',
      label: 'AV Rigging & Decibel Limit Compliance Checkpoint',
      category: 'Entertainment & AV',
      verified: hasEntertainmentBooked,
      statusNote: hasEntertainmentBooked
        ? 'AV/Ensemble contract & technical rider verified'
        : 'Pending AV/Entertainment deposit & soundcheck sign-off',
    },
  ];
}

/**
 * Computes the composite event execution readiness score (0–100%), status classification, and countdown days.
 */
export function computeEventReadiness(
  taskMetrics: TaskMetrics,
  budgetMetrics: BudgetMetrics,
  guestMetrics: GuestMetrics,
  timelineMetrics: TimelineMetrics,
  eventDateStr: string,
  referenceDateStr: string = TIMELINE_CONSTANTS.DEFAULT_REFERENCE_DATE
): ReadinessSummary {
  const budgetHealth = budgetMetrics.isOverBudget
    ? Math.max(
        0,
        READINESS_THRESHOLDS.MAX_SCORE -
          (budgetMetrics.utilizationPercent - READINESS_THRESHOLDS.MAX_SCORE) *
            READINESS_THRESHOLDS.OVER_BUDGET_PENALTY_MULTIPLIER
      )
    : READINESS_THRESHOLDS.MAX_SCORE;

  const scheduleHealth =
    timelineMetrics.conflictCount === 0
      ? timelineMetrics.readinessPercent
      : Math.max(
          READINESS_THRESHOLDS.MIN_SCHEDULE_HEALTH,
          timelineMetrics.readinessPercent -
            timelineMetrics.conflictCount *
              READINESS_THRESHOLDS.CONFLICT_PENALTY_POINTS
        );

  const overallScore = Math.round(
    taskMetrics.completionPercent * READINESS_THRESHOLDS.TASK_WEIGHT +
      budgetHealth * READINESS_THRESHOLDS.BUDGET_WEIGHT +
      guestMetrics.rsvpResponseRate * READINESS_THRESHOLDS.GUEST_WEIGHT +
      scheduleHealth * READINESS_THRESHOLDS.SCHEDULE_WEIGHT
  );

  let statusLabel: ReadinessSummary['statusLabel'] = ReadinessStatus.ON_TRACK;
  if (
    budgetMetrics.isOverBudget ||
    timelineMetrics.conflictCount > 0 ||
    overallScore < READINESS_THRESHOLDS.ACTION_REQUIRED_SCORE
  ) {
    statusLabel = ReadinessStatus.ACTION_REQUIRED;
  } else if (overallScore < READINESS_THRESHOLDS.NEEDS_ATTENTION_SCORE) {
    statusLabel = ReadinessStatus.NEEDS_ATTENTION;
  }

  const eventMs = new Date(`${eventDateStr}T00:00:00Z`).getTime();
  const refMs = new Date(`${referenceDateStr}T00:00:00Z`).getTime();
  const daysUntilEvent = Number.isNaN(eventMs - refMs)
    ? 0
    : Math.max(
        0,
        Math.round((eventMs - refMs) / TIMELINE_CONSTANTS.MS_PER_DAY)
      );

  return {
    overallScore,
    statusLabel,
    daysUntilEvent,
  };
}

/**
 * Checks whether a user (by email or UID) is authorized to view an event plan.
 */
export function canUserAccessEvent(
  event: Pick<
    CelebrationEvent,
    'ownerId' | 'ownerEmail' | 'collaboratorEmails'
  >,
  userEmail: string,
  userUid?: string
): boolean {
  const normalizedEmail = (userEmail || '').trim().toLowerCase();
  if (!normalizedEmail) return false;
  if (userUid && event.ownerId === userUid) return true;
  if (event.ownerEmail.trim().toLowerCase() === normalizedEmail) return true;
  return (event.collaboratorEmails || []).some(
    (email): boolean => email.trim().toLowerCase() === normalizedEmail
  );
}

/**
 * Checks whether a user (by email or UID) has owner or co-planner edit privileges on an event plan.
 */
export function canUserEditEvent(
  event: Pick<
    CelebrationEvent,
    'ownerId' | 'ownerEmail' | 'collaboratorEmails' | 'collaborators'
  >,
  userEmail: string,
  userUid?: string
): boolean {
  const normalizedEmail = (userEmail || '').trim().toLowerCase();
  if (!normalizedEmail) return false;
  if (userUid && event.ownerId === userUid) return true;
  if (event.ownerEmail.trim().toLowerCase() === normalizedEmail) return true;

  const collabRecord = (event.collaborators || []).find(
    (c): boolean => c.email.trim().toLowerCase() === normalizedEmail
  );
  if (collabRecord) {
    return collabRecord.role === 'co-planner';
  }
  return (event.collaboratorEmails || []).some(
    (email): boolean => email.trim().toLowerCase() === normalizedEmail
  );
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a collaborator invitation email against format, duplicate, owner, and capacity rules.
 */
export function validateCollaboratorInvite(
  inviteEmail: string,
  existingEmails: string[],
  ownerEmail: string
): ValidationResult {
  const trimmed = (inviteEmail || '').trim().toLowerCase();
  if (
    !trimmed ||
    trimmed.length < VALIDATION_LIMITS.MIN_EMAIL_LENGTH ||
    trimmed.length > VALIDATION_LIMITS.MAX_EMAIL_LENGTH ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
  ) {
    return { valid: false, error: 'Please enter a valid email address.' };
  }
  if (trimmed === (ownerEmail || '').trim().toLowerCase()) {
    return {
      valid: false,
      error: 'The event owner is already the primary architect of this event.',
    };
  }
  if (
    existingEmails.some((e): boolean => e.trim().toLowerCase() === trimmed)
  ) {
    return {
      valid: false,
      error: 'This collaborator has already been invited to co-plan this event.',
    };
  }
  if (existingEmails.length >= GUEST_LIMITS.MAX_COLLABORATORS) {
    return {
      valid: false,
      error: `Maximum of ${GUEST_LIMITS.MAX_COLLABORATORS} collaborators reached for this event.`,
    };
  }
  return { valid: true };
}

/**
 * Validates marketplace template title, description, and category lengths.
 */
export function validateTemplateInput(input: {
  title: string;
  description: string;
  category: string;
}): ValidationResult {
  const title = (input.title || '').trim();
  const desc = (input.description || '').trim();
  const cat = (input.category || '').trim();
  if (
    title.length < VALIDATION_LIMITS.MIN_TEXT_LENGTH ||
    title.length > VALIDATION_LIMITS.MAX_TITLE_LENGTH
  ) {
    return {
      valid: false,
      error: 'Template title must be between 2 and 120 characters.',
    };
  }
  if (
    desc.length < VALIDATION_LIMITS.MIN_TEXT_LENGTH ||
    desc.length > VALIDATION_LIMITS.MAX_DESCRIPTION_LENGTH
  ) {
    return {
      valid: false,
      error: 'Template description must be between 2 and 400 characters.',
    };
  }
  if (
    cat.length < VALIDATION_LIMITS.MIN_TEXT_LENGTH ||
    cat.length > VALIDATION_LIMITS.MAX_CATEGORY_LENGTH
  ) {
    return {
      valid: false,
      error: 'Category must be between 2 and 80 characters.',
    };
  }
  return { valid: true };
}

/**
 * Validates task checklist item input fields (title, YYYY-MM-DD due date, and assignee).
 */
export function validateTaskInput(input: {
  title: string;
  dueDate: string;
  assignee: string;
}): ValidationResult {
  if (
    !input.title ||
    input.title.trim().length < VALIDATION_LIMITS.MIN_TEXT_LENGTH ||
    input.title.trim().length > VALIDATION_LIMITS.MAX_TASK_TITLE_LENGTH
  ) {
    return {
      valid: false,
      error: 'Task title is required (2–200 characters).',
    };
  }
  if (!input.dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate.trim())) {
    return { valid: false, error: 'Valid due date (YYYY-MM-DD) is required.' };
  }
  if (
    !input.assignee ||
    input.assignee.trim().length < VALIDATION_LIMITS.MIN_TEXT_LENGTH ||
    input.assignee.trim().length > VALIDATION_LIMITS.MAX_ASSIGNEE_LENGTH
  ) {
    return {
      valid: false,
      error: 'Assignee name is required (2–80 characters).',
    };
  }
  return { valid: true };
}

/**
 * Validates budget line item input fields (title, vendor, and non-negative numeric costs).
 */
export function validateBudgetInput(input: {
  title: string;
  vendor: string;
  unitEstimated: string | number;
  unitActual: string | number;
}): ValidationResult {
  if (
    !input.title ||
    input.title.trim().length < VALIDATION_LIMITS.MIN_TEXT_LENGTH ||
    input.title.trim().length > VALIDATION_LIMITS.MAX_SCHEDULE_TITLE_LENGTH
  ) {
    return {
      valid: false,
      error: 'Line item description is required (2–160 characters).',
    };
  }
  if (
    !input.vendor ||
    input.vendor.trim().length < VALIDATION_LIMITS.MIN_TEXT_LENGTH ||
    input.vendor.trim().length > VALIDATION_LIMITS.MAX_VENUE_LENGTH
  ) {
    return {
      valid: false,
      error: 'Vendor or provider name is required (2–120 characters).',
    };
  }
  const est = Number(input.unitEstimated);
  const act = Number(input.unitActual);
  if (
    input.unitEstimated === '' ||
    Number.isNaN(est) ||
    est < BUDGET_TIERS.MIN_BUDGET ||
    est > BUDGET_TIERS.MAX_LINE_ITEM_COST
  ) {
    return {
      valid: false,
      error: 'Estimated cost must be between $0 and $10,000,000.',
    };
  }
  if (
    input.unitActual === '' ||
    Number.isNaN(act) ||
    act < BUDGET_TIERS.MIN_BUDGET ||
    act > BUDGET_TIERS.MAX_LINE_ITEM_COST
  ) {
    return {
      valid: false,
      error: 'Actual cost must be between $0 and $10,000,000.',
    };
  }
  return { valid: true };
}

/**
 * Validates guest RSVP entry fields (full name, email format, and plus-one count bounds).
 */
export function validateGuestInput(input: {
  fullName: string;
  email: string;
  plusOnes: string | number;
}): ValidationResult {
  if (
    !input.fullName ||
    input.fullName.trim().length < VALIDATION_LIMITS.MIN_TEXT_LENGTH ||
    input.fullName.trim().length > VALIDATION_LIMITS.MAX_TITLE_LENGTH
  ) {
    return { valid: false, error: 'Guest full name is required.' };
  }
  if (
    !input.email ||
    input.email.trim().length > VALIDATION_LIMITS.MAX_EMAIL_LENGTH ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())
  ) {
    return { valid: false, error: 'A valid email address is required.' };
  }
  const plus = Number(input.plusOnes);
  if (
    Number.isNaN(plus) ||
    plus < GUEST_LIMITS.MIN_PLUS_ONES ||
    plus > GUEST_LIMITS.MAX_PLUS_ONES
  ) {
    return { valid: false, error: 'Plus-ones must be between 0 and 10.' };
  }
  return { valid: true };
}

/**
 * Validates run-of-show schedule cue input fields (title, HH:MM start/end times, and location).
 */
export function validateScheduleInput(input: {
  title: string;
  startTime: string;
  endTime: string;
  location: string;
}): ValidationResult {
  if (
    !input.title ||
    input.title.trim().length < VALIDATION_LIMITS.MIN_TEXT_LENGTH ||
    input.title.trim().length > VALIDATION_LIMITS.MAX_SCHEDULE_TITLE_LENGTH
  ) {
    return { valid: false, error: 'Schedule activity title is required.' };
  }
  if (
    !/^\d{2}:\d{2}$/.test(input.startTime) ||
    !/^\d{2}:\d{2}$/.test(input.endTime)
  ) {
    return {
      valid: false,
      error: 'Valid start and end times (HH:MM) are required.',
    };
  }
  if (
    !input.location ||
    input.location.trim().length < VALIDATION_LIMITS.MIN_TEXT_LENGTH ||
    input.location.trim().length > VALIDATION_LIMITS.MAX_VENUE_LENGTH
  ) {
    return { valid: false, error: 'Location or room name is required.' };
  }
  return { valid: true };
}

export interface CategoryChartDatum {
  name: BudgetCategory;
  shortName: string;
  projected: number;
  actual: number;
  paid: number;
  variance: number;
  overrunPercent: number;
  isExceedingProjectedBy10Pct: boolean;
  shareOfActualPercent: number;
  shareOfProjectedPercent: number;
  color: string;
}

export interface BudgetChartBreakdown {
  projectedTotal: number;
  actualTotal: number;
  targetBudget: number;
  paidTotal: number;
  actualVsProjectedPercent: number;
  actualVsTargetPercent: number;
  projectedVsTargetPercent: number;
  deltaAmount: number;
  isActualOverProjected: boolean;
  totalComparisonBars: {
    label: string;
    projected: number;
    actual: number;
    target: number;
  }[];
  categories: CategoryChartDatum[];
  exceedingCategories: CategoryChartDatum[];
}

/**
 * Transforms computed budget metrics into Recharts-ready bar and pie chart data structures.
 */
export function buildBudgetChartData(
  metrics: BudgetMetrics
): BudgetChartBreakdown {
  const projectedTotal = Math.max(
    BUDGET_TIERS.MIN_BUDGET,
    metrics.totalEstimated
  );
  const actualTotal = Math.max(BUDGET_TIERS.MIN_BUDGET, metrics.totalActual);
  const targetBudget = Math.max(BUDGET_TIERS.MIN_BUDGET, metrics.targetBudget);
  const paidTotal = Math.max(BUDGET_TIERS.MIN_BUDGET, metrics.totalPaid);

  const actualVsProjectedPercent =
    projectedTotal > 0
      ? Math.round((actualTotal / projectedTotal) * 1000) / 10
      : 0;
  const actualVsTargetPercent =
    targetBudget > 0 ? Math.round((actualTotal / targetBudget) * 1000) / 10 : 0;
  const projectedVsTargetPercent =
    targetBudget > 0
      ? Math.round((projectedTotal / targetBudget) * 1000) / 10
      : 0;

  const deltaAmount = Math.round((actualTotal - projectedTotal) * 100) / 100;
  const isActualOverProjected = actualTotal > projectedTotal;

  const categories: CategoryChartDatum[] = metrics.categories.map(
    (cat): CategoryChartDatum => {
      const shareOfProjectedPercent =
        projectedTotal > 0
          ? Math.round((cat.estimated / projectedTotal) * 100)
          : 0;
      const variance = Math.round((cat.estimated - cat.actual) * 100) / 100;
      return {
        name: cat.category,
        shortName: CATEGORY_SHORT_LABELS[cat.category] || cat.category,
        projected: cat.estimated,
        actual: cat.actual,
        paid: cat.paid,
        variance,
        overrunPercent: cat.overrunPercent,
        isExceedingProjectedBy10Pct: cat.isExceedingProjectedBy10Pct,
        shareOfActualPercent: cat.shareOfActualPercent,
        shareOfProjectedPercent,
        color: CATEGORY_COLORS[cat.category] || '#334155',
      };
    }
  );

  const exceedingCategories = categories.filter(
    (c): boolean => c.isExceedingProjectedBy10Pct
  );

  return {
    projectedTotal,
    actualTotal,
    targetBudget,
    paidTotal,
    actualVsProjectedPercent,
    actualVsTargetPercent,
    projectedVsTargetPercent,
    deltaAmount,
    isActualOverProjected,
    totalComparisonBars: [
      {
        label: 'Total Event Spend',
        projected: projectedTotal,
        actual: actualTotal,
        target: targetBudget,
      },
    ],
    categories,
    exceedingCategories,
  };
}

/**
 * Sanitizes user-supplied text by stripping HTML angle brackets, control characters,
 * and clamping the string to the specified maximum length.
 */
export function sanitizeInputText(
  raw: string,
  maxLength: number = VALIDATION_LIMITS.MAX_DESCRIPTION_LENGTH
): string {
  const cleaned = (raw || '')
    .replace(/[<>]/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.slice(0, Math.max(0, maxLength));
}

/**
 * Determines whether a budget line item qualifies as a significant financial commitment
 * (>= $1,000 effective cost or >= 5% of the event's target budget ceiling).
 */
export function isSignificantBudgetItem(
  item: Pick<BudgetItem, 'costType' | 'unitEstimated' | 'unitActual'>,
  confirmedHeadcount: number,
  targetBudget: number
): boolean {
  const safeHeadcount = Math.max(BUDGET_TIERS.MIN_BUDGET, confirmedHeadcount);
  const safeTarget = Math.max(BUDGET_TIERS.MIN_BUDGET, targetBudget);
  const multiplier = item.costType === 'per-guest' ? safeHeadcount : 1;
  const effectiveActual = Math.max(
    BUDGET_TIERS.MIN_BUDGET,
    item.unitActual * multiplier
  );
  const effectiveEstimated = Math.max(
    BUDGET_TIERS.MIN_BUDGET,
    item.unitEstimated * multiplier
  );
  const highestCommitment = Math.max(effectiveActual, effectiveEstimated);
  const relativeThreshold =
    safeTarget > 0
      ? safeTarget * NOTIFICATION_CONSTANTS.SIGNIFICANT_BUDGET_SHARE_RATIO
      : NOTIFICATION_CONSTANTS.SIGNIFICANT_BUDGET_THRESHOLD;

  return (
    highestCommitment >= NOTIFICATION_CONSTANTS.SIGNIFICANT_BUDGET_THRESHOLD ||
    (safeTarget > 0 && highestCommitment >= relativeThreshold)
  );
}

/**
 * Builds a structured real-time toast notification payload when a budget item is created or updated,
 * highlighting significant financial items, >10% variance alerts, and multi-tier data persistence confirmation.
 */
export function buildBudgetPersistenceToast(params: {
  action: BudgetToastAction;
  item: BudgetItem;
  confirmedHeadcount: number;
  targetBudget: number;
  persistenceChannel?: string;
  timestamp?: string;
}): ToastNotification {
  const safeHeadcount = Math.max(
    BUDGET_TIERS.MIN_BUDGET,
    params.confirmedHeadcount
  );
  const multiplier = params.item.costType === 'per-guest' ? safeHeadcount : 1;
  const effectiveActual =
    Math.round(params.item.unitActual * multiplier * 100) / 100;
  const effectiveEstimated =
    Math.round(params.item.unitEstimated * multiplier * 100) / 100;
  const isSignificant = isSignificantBudgetItem(
    params.item,
    safeHeadcount,
    params.targetBudget
  );
  const isExceedingBy10Pct =
    effectiveEstimated > 0 &&
    effectiveActual >
      effectiveEstimated * BUDGET_TIERS.OVERRUN_WARNING_MULTIPLIER;

  const formattedActual = `$${Math.round(effectiveActual).toLocaleString('en-US')}`;
  const shareOfTarget =
    params.targetBudget > 0
      ? Math.round((effectiveActual / params.targetBudget) * 1000) / 10
      : 0;

  let variant: ToastVariant = isSignificant ? 'significant' : 'success';
  if (isExceedingBy10Pct) {
    variant = 'warning';
  }

  const actionVerb =
    params.action === 'created'
      ? 'Created'
      : params.action === 'updated'
      ? 'Updated'
      : params.action === 'payment-updated'
      ? 'Updated Payment Status'
      : 'Updated Target Ceiling';

  const title = isSignificant
    ? `Significant Budget Item ${actionVerb} & Persisted`
    : `Budget Line Item ${actionVerb} & Persisted`;

  const overrunSuffix = isExceedingBy10Pct
    ? ` · Exceeds projected baseline by >10% ($${Math.round(effectiveEstimated).toLocaleString('en-US')} est.)`
    : '';

  const message = `"${params.item.title}" (${params.item.vendor}) committed at ${formattedActual} (${shareOfTarget}% of target budget)${overrunSuffix}. Confirmed saved to ${params.persistenceChannel || NOTIFICATION_CONSTANTS.DEFAULT_PERSISTENCE_CHANNEL}.`;

  return {
    id: `toast-${params.action}-${params.item.id}-${Date.now()}`,
    title,
    message,
    variant,
    isSignificant,
    effectiveAmount: effectiveActual,
    category: params.item.category,
    action: params.action,
    persistedAt: params.timestamp || new Date().toISOString(),
    persistenceChannel:
      params.persistenceChannel ||
      NOTIFICATION_CONSTANTS.DEFAULT_PERSISTENCE_CHANNEL,
  };
}

