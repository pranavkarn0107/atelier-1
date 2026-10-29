import {
  BudgetCategory,
  BudgetItem,
  CelebrationEvent,
  DietaryRestriction,
  EventTask,
  Guest,
  ScheduleItem,
  TaskPhase,
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
  hasConflict: boolean;
  conflictingWithTitles: string[];
}

export interface TimelineMetrics {
  blocks: ComputedScheduleBlock[];
  totalDurationMinutes: number;
  conflictCount: number;
  readyOrCompletedCount: number;
  readinessPercent: number;
}

export interface ReadinessSummary {
  overallScore: number;
  statusLabel: 'On Track' | 'Needs Attention' | 'Action Required';
  daysUntilEvent: number;
}

const ALL_DIETARY: DietaryRestriction[] = [
  'Standard',
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
];

const ALL_CATEGORIES: BudgetCategory[] = [
  'Venue & Rentals',
  'Catering & Beverage',
  'Floral & Production',
  'Entertainment & AV',
  'Attire & Stationery',
  'Logistics & Staffing',
];

const ALL_PHASES: TaskPhase[] = [
  'Pre-Event',
  'Venue & Catering',
  'Guest Experience',
  'Day-Of Execution',
];

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
    const partySize = 1 + Math.max(0, guest.plusOnes || 0);
    if (guest.rsvpStatus === 'confirmed') {
      confirmedGuestsOnly += 1;
      confirmedPlusOnes += Math.max(0, guest.plusOnes || 0);
      const diet = ALL_DIETARY.includes(guest.dietary)
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

export function calculateBudgetMetrics(
  items: BudgetItem[],
  targetBudget: number,
  confirmedHeadcount: number
): BudgetMetrics {
  const safeHeadcount = Math.max(0, confirmedHeadcount);
  const safeTarget = Math.max(0, targetBudget);

  let totalEstimated = 0;
  let totalActual = 0;
  let totalPaid = 0;
  let fixedActualTotal = 0;
  let variablePerGuestActualTotal = 0;
  let variablePerGuestRateSum = 0;

  const lines: ComputedBudgetLine[] = items.map((item) => {
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
            ((effectiveActual - effectiveEstimated) / effectiveEstimated) * 1000
          ) / 10
        : 0;
    const isExceedingProjectedBy10Pct =
      effectiveEstimated > 0 && effectiveActual > effectiveEstimated * 1.1;

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
  });

  const remainingBalanceToPay = Math.max(
    0,
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

  const categories: CategoryBudgetSummary[] = ALL_CATEGORIES.map((category) => {
    const catLines = lines.filter((l) => l.category === category);
    const estimated = catLines.reduce(
      (acc, l) => acc + l.effectiveEstimated,
      0
    );
    const actual = catLines.reduce((acc, l) => acc + l.effectiveActual, 0);
    const paid = catLines.reduce((acc, l) => acc + l.paidAmount, 0);
    const shareOfActualPercent =
      totalActual > 0 ? Math.round((actual / totalActual) * 100) : 0;
    const overrunPercent =
      estimated > 0
        ? Math.round(((actual - estimated) / estimated) * 1000) / 10
        : 0;
    const isExceedingProjectedBy10Pct =
      estimated > 0 && actual > estimated * 1.1;

    return {
      category,
      estimated,
      actual,
      paid,
      shareOfActualPercent,
      overrunPercent,
      isExceedingProjectedBy10Pct,
    };
  }).filter((c) => c.estimated > 0 || c.actual > 0);

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
    isOverBudget: totalActual > safeTarget,
    categories,
  };
}

export function calculateTaskMetrics(tasks: EventTask[]): TaskMetrics {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const inProgress = tasks.filter((t) => t.status === 'in-progress').length;
  const todo = tasks.filter((t) => t.status === 'todo').length;
  const completionPercent =
    total > 0 ? Math.round((completed / total) * 100) : 0;

  const urgentOpenTasks = tasks
    .filter((t) => t.status !== 'completed')
    .sort((a, b) => {
      const priorityRank = { high: 0, medium: 1, low: 2 };
      if (priorityRank[a.priority] !== priorityRank[b.priority]) {
        return priorityRank[a.priority] - priorityRank[b.priority];
      }
      return a.dueDate.localeCompare(b.dueDate);
    });

  const phases: PhaseTaskSummary[] = ALL_PHASES.map((phase) => {
    const phaseTasks = tasks.filter((t) => t.phase === phase);
    const phaseCompleted = phaseTasks.filter(
      (t) => t.status === 'completed'
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
  });

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

export function parseTimeToMinutes(timeStr: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(timeStr.trim());
  if (!match) return 0;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours * 60 + minutes;
}

export function calculateTimelineMetrics(
  schedule: ScheduleItem[]
): TimelineMetrics {
  const sorted = [...schedule].sort(
    (a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime)
  );

  const blocks: ComputedScheduleBlock[] = sorted.map((item) => {
    const startMinutes = parseTimeToMinutes(item.startTime);
    let endMinutes = parseTimeToMinutes(item.endTime);
    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60;
    }
    const durationMinutes = Math.max(0, endMinutes - startMinutes);
    return {
      ...item,
      startMinutes,
      endMinutes,
      durationMinutes,
      hasConflict: false,
      conflictingWithTitles: [],
    };
  });

  let conflictCount = 0;
  for (let i = 0; i < blocks.length; i++) {
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

  const totalDurationMinutes = blocks.reduce(
    (acc, b) => acc + b.durationMinutes,
    0
  );
  const readyOrCompletedCount = blocks.filter(
    (b) => b.status === 'ready' || b.status === 'completed'
  ).length;
  const readinessPercent =
    blocks.length > 0
      ? Math.round((readyOrCompletedCount / blocks.length) * 100)
      : 100;

  return {
    blocks,
    totalDurationMinutes,
    conflictCount,
    readyOrCompletedCount,
    readinessPercent,
  };
}

export function computeEventReadiness(
  taskMetrics: TaskMetrics,
  budgetMetrics: BudgetMetrics,
  guestMetrics: GuestMetrics,
  timelineMetrics: TimelineMetrics,
  eventDateStr: string,
  referenceDateStr = '2026-10-23'
): ReadinessSummary {
  const budgetHealth = budgetMetrics.isOverBudget
    ? Math.max(0, 100 - (budgetMetrics.utilizationPercent - 100) * 2)
    : 100;

  const scheduleHealth =
    timelineMetrics.conflictCount === 0
      ? timelineMetrics.readinessPercent
      : Math.max(
          20,
          timelineMetrics.readinessPercent - timelineMetrics.conflictCount * 20
        );

  const overallScore = Math.round(
    taskMetrics.completionPercent * 0.4 +
      budgetHealth * 0.25 +
      guestMetrics.rsvpResponseRate * 0.2 +
      scheduleHealth * 0.15
  );

  let statusLabel: ReadinessSummary['statusLabel'] = 'On Track';
  if (
    budgetMetrics.isOverBudget ||
    timelineMetrics.conflictCount > 0 ||
    overallScore < 55
  ) {
    statusLabel = 'Action Required';
  } else if (overallScore < 75) {
    statusLabel = 'Needs Attention';
  }

  const eventMs = new Date(`${eventDateStr}T00:00:00Z`).getTime();
  const refMs = new Date(`${referenceDateStr}T00:00:00Z`).getTime();
  const daysUntilEvent = Math.max(
    0,
    Math.round((eventMs - refMs) / (1000 * 60 * 60 * 24))
  );

  return {
    overallScore,
    statusLabel,
    daysUntilEvent,
  };
}

// Multi-User Access & Collaboration Logic
export function canUserAccessEvent(
  event: Pick<CelebrationEvent, 'ownerId' | 'ownerEmail' | 'collaboratorEmails'>,
  userEmail: string,
  userUid?: string
): boolean {
  const normalizedEmail = userEmail.trim().toLowerCase();
  if (!normalizedEmail) return false;
  if (userUid && event.ownerId === userUid) return true;
  if (event.ownerEmail.trim().toLowerCase() === normalizedEmail) return true;
  return (event.collaboratorEmails || []).some(
    (email) => email.trim().toLowerCase() === normalizedEmail
  );
}

export function canUserEditEvent(
  event: Pick<
    CelebrationEvent,
    'ownerId' | 'ownerEmail' | 'collaboratorEmails' | 'collaborators'
  >,
  userEmail: string,
  userUid?: string
): boolean {
  const normalizedEmail = userEmail.trim().toLowerCase();
  if (!normalizedEmail) return false;
  if (userUid && event.ownerId === userUid) return true;
  if (event.ownerEmail.trim().toLowerCase() === normalizedEmail) return true;

  const collabRecord = (event.collaborators || []).find(
    (c) => c.email.trim().toLowerCase() === normalizedEmail
  );
  if (collabRecord) {
    return collabRecord.role === 'co-planner';
  }
  return (event.collaboratorEmails || []).some(
    (email) => email.trim().toLowerCase() === normalizedEmail
  );
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateCollaboratorInvite(
  inviteEmail: string,
  existingEmails: string[],
  ownerEmail: string
): ValidationResult {
  const trimmed = inviteEmail.trim().toLowerCase();
  if (
    !trimmed ||
    trimmed.length < 3 ||
    trimmed.length > 160 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
  ) {
    return { valid: false, error: 'Please enter a valid email address.' };
  }
  if (trimmed === ownerEmail.trim().toLowerCase()) {
    return {
      valid: false,
      error: 'The event owner is already the primary architect of this event.',
    };
  }
  if (existingEmails.some((e) => e.trim().toLowerCase() === trimmed)) {
    return {
      valid: false,
      error: 'This collaborator has already been invited to co-plan this event.',
    };
  }
  if (existingEmails.length >= 10) {
    return {
      valid: false,
      error: 'Maximum of 10 collaborators reached for this event.',
    };
  }
  return { valid: true };
}

export function validateTemplateInput(input: {
  title: string;
  description: string;
  category: string;
}): ValidationResult {
  const title = input.title.trim();
  const desc = input.description.trim();
  const cat = input.category.trim();
  if (title.length < 2 || title.length > 120) {
    return {
      valid: false,
      error: 'Template title must be between 2 and 120 characters.',
    };
  }
  if (desc.length < 2 || desc.length > 400) {
    return {
      valid: false,
      error: 'Template description must be between 2 and 400 characters.',
    };
  }
  if (cat.length < 2 || cat.length > 80) {
    return {
      valid: false,
      error: 'Category must be between 2 and 80 characters.',
    };
  }
  return { valid: true };
}

export function validateTaskInput(input: {
  title: string;
  dueDate: string;
  assignee: string;
}): ValidationResult {
  if (
    !input.title ||
    input.title.trim().length < 2 ||
    input.title.trim().length > 200
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
    input.assignee.trim().length < 2 ||
    input.assignee.trim().length > 80
  ) {
    return {
      valid: false,
      error: 'Assignee name is required (2–80 characters).',
    };
  }
  return { valid: true };
}

export function validateBudgetInput(input: {
  title: string;
  vendor: string;
  unitEstimated: string | number;
  unitActual: string | number;
}): ValidationResult {
  if (
    !input.title ||
    input.title.trim().length < 2 ||
    input.title.trim().length > 160
  ) {
    return {
      valid: false,
      error: 'Line item description is required (2–160 characters).',
    };
  }
  if (
    !input.vendor ||
    input.vendor.trim().length < 2 ||
    input.vendor.trim().length > 120
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
    est < 0 ||
    est > 10000000
  ) {
    return {
      valid: false,
      error: 'Estimated cost must be between $0 and $10,000,000.',
    };
  }
  if (
    input.unitActual === '' ||
    Number.isNaN(act) ||
    act < 0 ||
    act > 10000000
  ) {
    return {
      valid: false,
      error: 'Actual cost must be between $0 and $10,000,000.',
    };
  }
  return { valid: true };
}

export function validateGuestInput(input: {
  fullName: string;
  email: string;
  plusOnes: string | number;
}): ValidationResult {
  if (
    !input.fullName ||
    input.fullName.trim().length < 2 ||
    input.fullName.trim().length > 120
  ) {
    return { valid: false, error: 'Guest full name is required.' };
  }
  if (
    !input.email ||
    input.email.trim().length > 160 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())
  ) {
    return { valid: false, error: 'A valid email address is required.' };
  }
  const plus = Number(input.plusOnes);
  if (Number.isNaN(plus) || plus < 0 || plus > 10) {
    return { valid: false, error: 'Plus-ones must be between 0 and 10.' };
  }
  return { valid: true };
}

export function validateScheduleInput(input: {
  title: string;
  startTime: string;
  endTime: string;
  location: string;
}): ValidationResult {
  if (
    !input.title ||
    input.title.trim().length < 2 ||
    input.title.trim().length > 160
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
    input.location.trim().length < 2 ||
    input.location.trim().length > 120
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

const CATEGORY_COLORS: Record<BudgetCategory, string> = {
  'Venue & Rentals': '#0F172A',
  'Catering & Beverage': '#B45309',
  'Floral & Production': '#047857',
  'Entertainment & AV': '#1D4ED8',
  'Attire & Stationery': '#4338CA',
  'Logistics & Staffing': '#475569',
};

const CATEGORY_SHORT_LABELS: Record<BudgetCategory, string> = {
  'Venue & Rentals': 'Venue',
  'Catering & Beverage': 'Catering',
  'Floral & Production': 'Floral',
  'Entertainment & AV': 'Ent. & AV',
  'Attire & Stationery': 'Stationery',
  'Logistics & Staffing': 'Logistics',
};

export function buildBudgetChartData(
  metrics: BudgetMetrics
): BudgetChartBreakdown {
  const projectedTotal = Math.max(0, metrics.totalEstimated);
  const actualTotal = Math.max(0, metrics.totalActual);
  const targetBudget = Math.max(0, metrics.targetBudget);
  const paidTotal = Math.max(0, metrics.totalPaid);

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

  const categories: CategoryChartDatum[] = metrics.categories.map((cat) => {
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
  });

  const exceedingCategories = categories.filter(
    (c) => c.isExceedingProjectedBy10Pct
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

