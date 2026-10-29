import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBudgetChartData,
  buildBudgetPersistenceToast,
  calculateBudgetMetrics,
  calculateGuestMetrics,
  calculateTaskMetrics,
  calculateTimelineMetrics,
  canUserAccessEvent,
  canUserEditEvent,
  computeEventReadiness,
  evaluateVendorCheckpoints,
  formatEventDate,
  isSignificantBudgetItem,
  parseTimeToMinutes,
  sanitizeInputText,
  validateBudgetInput,
  validateCollaboratorInvite,
  validateGuestInput,
  validateScheduleInput,
  validateTaskInput,
  validateTemplateInput,
} from './utils/eventCalculations';
import { BudgetItem, EventTask, Guest, ScheduleItem } from './types/event';

test('1. Budget Calculation Edge Cases: zero/negative inputs, per-guest scaling, >10% overrun alerts, and dynamic 5–10% contingency tiers', (): void => {
  const items: BudgetItem[] = [
    {
      id: 'b1',
      title: 'Conservatory Hall Buyout',
      vendor: 'Botanical Trust',
      category: 'Venue & Rentals',
      costType: 'fixed',
      unitEstimated: 15000,
      unitActual: 15000,
      paidAmount: 15000,
      paymentStatus: 'paid',
    },
    {
      id: 'b2',
      title: 'Plated Autumn Tasting & Sommelier Pairing',
      vendor: 'Maison Verbena',
      category: 'Catering & Beverage',
      costType: 'per-guest',
      unitEstimated: 150,
      unitActual: 180, // +20% overrun (> 10% threshold)
      paidAmount: 4000,
      paymentStatus: 'deposit-paid',
    },
  ];

  const metrics = calculateBudgetMetrics(items, 40000, 50);
  assert.equal(metrics.totalEstimated, 22500);
  assert.equal(metrics.totalActual, 24000);
  assert.equal(metrics.contingencyRatePercent, 10);
  assert.equal(metrics.contingencyReserveAmount, 2400);
  assert.equal(metrics.totalCommittedWithContingency, 26400);

  const chart = buildBudgetChartData(metrics);
  assert.equal(chart.exceedingCategories.length, 1);
  assert.equal(chart.exceedingCategories[0].name, 'Catering & Beverage');
  assert.equal(chart.exceedingCategories[0].isExceedingProjectedBy10Pct, true);

  // Edge Case: negative target budget and negative headcount safely clamp to 0
  const clamped = calculateBudgetMetrics(items, -500, -10);
  assert.equal(clamped.targetBudget, 0);
  assert.equal(clamped.confirmedHeadcount, 0);
  assert.equal(clamped.variablePerGuestActualTotal, 0);
  assert.equal(clamped.costPerConfirmedGuest, 0);
  assert.equal(clamped.isOverBudget, true);
});

test('2. Empty Input Handling: empty arrays, blank form strings, and missing fields degrade gracefully', (): void => {
  const emptyBudget = calculateBudgetMetrics([], 0, 0);
  assert.equal(emptyBudget.totalActual, 0);
  assert.equal(emptyBudget.contingencyRatePercent, 5);
  assert.equal(emptyBudget.categories.length, 0);

  const emptyGuests = calculateGuestMetrics([]);
  assert.equal(emptyGuests.confirmedHeadcount, 0);
  assert.equal(emptyGuests.rsvpResponseRate, 0);

  const emptyTasks = calculateTaskMetrics([]);
  assert.equal(emptyTasks.total, 0);
  assert.equal(emptyTasks.completionPercent, 0);

  const emptyTimeline = calculateTimelineMetrics([]);
  assert.equal(emptyTimeline.blocks.length, 0);
  assert.equal(emptyTimeline.readinessPercent, 100);

  // Empty form validation inputs must return structured validation errors
  assert.equal(
    validateTaskInput({ title: '', dueDate: '', assignee: '' }).valid,
    false
  );
  assert.equal(
    validateBudgetInput({
      title: '',
      vendor: '',
      unitEstimated: '',
      unitActual: '',
    }).valid,
    false
  );
  assert.equal(
    validateGuestInput({ fullName: '', email: '', plusOnes: '' }).valid,
    false
  );
  assert.equal(
    validateScheduleInput({
      title: '',
      startTime: '',
      endTime: '',
      location: '',
    }).valid,
    false
  );
  assert.equal(
    validateTemplateInput({ title: '', description: '', category: '' }).valid,
    false
  );
  assert.equal(validateCollaboratorInvite('', [], '').valid, false);
});

test('3. Date Formatting & Timeline Parsing: ISO date formatting, invalid date fallbacks, and 15-minute buffer intervals', (): void => {
  assert.equal(formatEventDate('2026-11-14'), 'Nov 14, 2026');
  assert.equal(formatEventDate('2027-01-05'), 'Jan 5, 2027');
  assert.equal(formatEventDate(''), 'Date TBD');
  assert.equal(formatEventDate('2026-02-30'), 'Date TBD');
  assert.equal(formatEventDate('invalid-date'), 'Date TBD');

  assert.equal(parseTimeToMinutes('00:00'), 0);
  assert.equal(parseTimeToMinutes('17:30'), 1050);
  assert.equal(parseTimeToMinutes(''), 0);

  const schedule: ScheduleItem[] = [
    {
      id: 's2',
      startTime: '18:05',
      endTime: '19:00',
      title: 'Keynote Welcome Address',
      location: 'Main Hall',
      leadContact: 'Julian Vance',
      status: 'ready',
    },
    {
      id: 's1',
      startTime: '17:00',
      endTime: '18:00',
      title: 'VIP Arrival & Check-In',
      location: 'Atrium',
      leadContact: 'Camille Laurent',
      status: 'completed',
    },
  ];

  const timeline = calculateTimelineMetrics(schedule);
  assert.equal(timeline.blocks[0].id, 's1');
  assert.equal(timeline.blocks[1].id, 's2');
  assert.equal(timeline.blocks[1].bufferBeforeMinutes, 5);
  assert.equal(timeline.blocks[1].hasTightBuffer, true);
  assert.equal(timeline.tightBufferCount, 1);
});

test('4. Vendor Verification Checkpoints, RBAC Access, and Event Readiness Score', (): void => {
  const tasks: EventTask[] = [
    {
      id: 't1',
      title: 'Sign venue COI & fire permit',
      phase: 'Pre-Event',
      status: 'completed',
      priority: 'high',
      dueDate: '2026-10-15',
      assignee: 'Camille',
    },
  ];
  const budgetItems: BudgetItem[] = [
    {
      id: 'b1',
      title: 'Venue Buyout',
      vendor: 'Conservatory',
      category: 'Venue & Rentals',
      costType: 'fixed',
      unitEstimated: 12000,
      unitActual: 12000,
      paidAmount: 12000,
      paymentStatus: 'paid',
    },
  ];
  const guests: Guest[] = [
    {
      id: 'g1',
      fullName: 'Clara Chen',
      email: 'clara@example.com',
      group: 'VIP',
      rsvpStatus: 'confirmed',
      plusOnes: 1,
      dietary: 'Vegan',
      tableNumber: 1,
    },
  ];
  const schedule: ScheduleItem[] = [
    {
      id: 's1',
      startTime: '18:00',
      endTime: '19:00',
      title: 'Reception',
      location: 'Atrium',
      leadContact: 'Camille',
      status: 'ready',
    },
  ];

  const checkpoints = evaluateVendorCheckpoints(tasks, budgetItems);
  assert.equal(checkpoints.length, 3);
  assert.equal(checkpoints[0].verified, true);
  assert.equal(checkpoints[1].verified, false);

  const readiness = computeEventReadiness(
    calculateTaskMetrics(tasks),
    calculateBudgetMetrics(budgetItems, 25000, 2),
    calculateGuestMetrics(guests),
    calculateTimelineMetrics(schedule),
    '2026-11-14',
    '2026-10-23'
  );
  assert.equal(readiness.overallScore, 100);
  assert.equal(readiness.statusLabel, 'On Track');
  assert.equal(readiness.daysUntilEvent, 22);

  const sampleEvent = {
    ownerId: 'u1',
    ownerEmail: 'owner@atelier.io',
    collaboratorEmails: ['coplanner@atelier.io', 'viewer@atelier.io'],
    collaborators: [
      {
        id: 'c1',
        email: 'coplanner@atelier.io',
        role: 'co-planner' as const,
        invitedByEmail: 'owner@atelier.io',
        status: 'active' as const,
        addedAt: '2026-10-10',
      },
      {
        id: 'c2',
        email: 'viewer@atelier.io',
        role: 'viewer' as const,
        invitedByEmail: 'owner@atelier.io',
        status: 'active' as const,
        addedAt: '2026-10-10',
      },
    ],
  };

  assert.equal(canUserAccessEvent(sampleEvent, 'viewer@atelier.io'), true);
  assert.equal(canUserEditEvent(sampleEvent, 'coplanner@atelier.io'), true);
  assert.equal(canUserEditEvent(sampleEvent, 'viewer@atelier.io'), false);
});

test('5. Significant Budget Item Detection, Real-Time Toast Persistence Payloads, and Input Sanitization', (): void => {
  // Significant item (>=$1,000 fixed)
  assert.equal(
    isSignificantBudgetItem(
      { costType: 'fixed', unitEstimated: 2500, unitActual: 2500 },
      50,
      60000
    ),
    true
  );

  // Per-guest item that scales to >=$1,000 ($45 * 30 guests = $1,350)
  assert.equal(
    isSignificantBudgetItem(
      { costType: 'per-guest', unitEstimated: 45, unitActual: 45 },
      30,
      60000
    ),
    true
  );

  // Minor item (<$1,000 and <5% of target budget)
  assert.equal(
    isSignificantBudgetItem(
      { costType: 'fixed', unitEstimated: 250, unitActual: 250 },
      50,
      60000
    ),
    false
  );

  const significantItem: BudgetItem = {
    id: 'bdg-sig-1',
    title: 'Architectural Floral Suspension',
    vendor: 'Studio Bramble',
    category: 'Floral & Production',
    costType: 'fixed',
    unitEstimated: 4000,
    unitActual: 4800, // +20% overrun
    paidAmount: 2400,
    paymentStatus: 'deposit-paid',
  };

  const createdToast = buildBudgetPersistenceToast({
    action: 'created',
    item: significantItem,
    confirmedHeadcount: 50,
    targetBudget: 60000,
    timestamp: '2026-10-29T12:00:00.000Z',
  });
  assert.equal(createdToast.isSignificant, true);
  assert.equal(createdToast.effectiveAmount, 4800);
  assert.equal(createdToast.variant, 'warning'); // >10% overrun
  assert.equal(
    createdToast.title,
    'Significant Budget Item Created & Persisted'
  );
  assert.equal(createdToast.message.includes('Studio Bramble'), true);
  assert.equal(
    createdToast.message.includes('Local Storage + Cloud Firestore Ledger'),
    true
  );

  const updatedToast = buildBudgetPersistenceToast({
    action: 'updated',
    item: { ...significantItem, unitActual: 4000 },
    confirmedHeadcount: 50,
    targetBudget: 60000,
  });
  assert.equal(updatedToast.isSignificant, true);
  assert.equal(updatedToast.variant, 'significant');
  assert.equal(
    updatedToast.title,
    'Significant Budget Item Updated & Persisted'
  );

  // Input sanitization strips angle brackets and control chars
  assert.equal(
    sanitizeInputText('  <script>alert(1)</script> Grand Ballroom  '),
    'scriptalert(1)/script Grand Ballroom'
  );
});

