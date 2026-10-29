import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBudgetChartData,
  calculateBudgetMetrics,
  calculateGuestMetrics,
  calculateTaskMetrics,
  calculateTimelineMetrics,
  canUserAccessEvent,
  canUserEditEvent,
  computeEventReadiness,
  evaluateVendorCheckpoints,
  parseTimeToMinutes,
  validateBudgetInput,
  validateCollaboratorInvite,
  validateGuestInput,
  validateScheduleInput,
  validateTaskInput,
  validateTemplateInput,
} from './utils/eventCalculations';
import { BudgetItem, EventTask, Guest, ScheduleItem } from './types/event';

test('Budget Calculations: fixed & per-guest scaling, >10% overrun warnings, and dynamic 5-10% contingency margin', () => {
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

  // 15000 fixed + (150 * 50 = 7500) = 22500 estimated
  assert.equal(metrics.totalEstimated, 22500);
  // 15000 fixed + (180 * 50 = 9000) = 24000 actual
  assert.equal(metrics.totalActual, 24000);
  assert.equal(metrics.fixedActualTotal, 15000);
  assert.equal(metrics.variablePerGuestActualTotal, 9000);
  assert.equal(metrics.remainingBudget, 16000);
  assert.equal(metrics.remainingBalanceToPay, 5000);
  assert.equal(metrics.costPerConfirmedGuest, 480);
  assert.equal(metrics.isOverBudget, false);

  // Because Catering & Beverage exceeds projected by +20% (>10%), dynamic contingency escalates to 10%
  assert.equal(metrics.contingencyRatePercent, 10);
  assert.equal(metrics.contingencyReserveAmount, 2400);
  assert.equal(metrics.totalCommittedWithContingency, 26400);

  const chart = buildBudgetChartData(metrics);
  assert.equal(chart.exceedingCategories.length, 1);
  assert.equal(chart.exceedingCategories[0].name, 'Catering & Beverage');
  assert.equal(chart.exceedingCategories[0].overrunPercent, 20);
  assert.equal(chart.exceedingCategories[0].isExceedingProjectedBy10Pct, true);
});

test('Budget Calculations (Edge Cases): zero guests, negative inputs, and 5% vs 7.5% contingency tiers', () => {
  const items: BudgetItem[] = [
    {
      id: 'b-edge',
      title: 'String Quartet',
      vendor: 'Meridian Strings',
      category: 'Entertainment & AV',
      costType: 'fixed',
      unitEstimated: 2000,
      unitActual: 2100, // +5% overrun (not > 10%)
      paidAmount: 2100,
      paymentStatus: 'paid',
    },
  ];

  // Small event (25 guests, no >10% overrun) -> 5% contingency margin
  const smallMetrics = calculateBudgetMetrics(items, 10000, 25);
  assert.equal(smallMetrics.contingencyRatePercent, 5);
  assert.equal(smallMetrics.contingencyReserveAmount, 105);
  assert.equal(smallMetrics.totalCommittedWithContingency, 2205);

  // Medium event (50 guests, no >10% overrun) -> 7.5% contingency margin
  const mediumMetrics = calculateBudgetMetrics(items, 10000, 50);
  assert.equal(mediumMetrics.contingencyRatePercent, 7.5);
  assert.equal(mediumMetrics.contingencyReserveAmount, 157.5);

  // Zero target budget and negative guest count clamped safely
  const zeroTargetMetrics = calculateBudgetMetrics(items, -500, -10);
  assert.equal(zeroTargetMetrics.targetBudget, 0);
  assert.equal(zeroTargetMetrics.confirmedHeadcount, 0);
  assert.equal(zeroTargetMetrics.costPerConfirmedGuest, 0);
  assert.equal(zeroTargetMetrics.utilizationPercent, 0);
  assert.equal(zeroTargetMetrics.isOverBudget, true);
});

test('Date & Timeline Parsing: chronological sorting, conflict detection, and 15-minute buffer intervals', () => {
  assert.equal(parseTimeToMinutes('00:00'), 0);
  assert.equal(parseTimeToMinutes('17:30'), 1050);
  assert.equal(parseTimeToMinutes('invalid'), 0);

  const schedule: ScheduleItem[] = [
    {
      id: 's2',
      startTime: '18:05', // Only 5 min buffer after 18:00 -> tight buffer (<15 min)
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
    {
      id: 's3',
      startTime: '18:45', // Overlaps with s2 (18:05 - 19:00)
      endTime: '19:30',
      title: 'Acoustic Soundcheck',
      location: 'Main Hall',
      leadContact: 'AV Lead',
      status: 'scheduled',
    },
    {
      id: 's4',
      startTime: '23:30',
      endTime: '00:30', // Crosses midnight (60 min duration)
      title: 'Late-Night Digestif & Load-Out',
      location: 'Terrace',
      leadContact: 'Ops Lead',
      status: 'ready',
    },
  ];

  const timeline = calculateTimelineMetrics(schedule);
  assert.equal(timeline.blocks[0].id, 's1');
  assert.equal(timeline.blocks[1].id, 's2');
  assert.equal(timeline.blocks[1].bufferBeforeMinutes, 5);
  assert.equal(timeline.blocks[1].hasTightBuffer, true);
  assert.equal(timeline.tightBufferCount, 1);
  assert.equal(timeline.recommendedBufferMinutes, 15);
  assert.equal(timeline.conflictCount, 1);
  assert.equal(timeline.blocks[3].durationMinutes, 60);
  assert.equal(timeline.readinessPercent, 75);
});

test('Event Checklist & Form Validation: normal and boundary/edge-case inputs', () => {
  const tasks: EventTask[] = [
    {
      id: 't1',
      title: 'Submit municipal permit',
      phase: 'Pre-Event',
      status: 'completed',
      priority: 'high',
      dueDate: '2026-11-01',
      assignee: 'Camille Laurent',
    },
    {
      id: 't2',
      title: 'Confirm catering allergen line',
      phase: 'Venue & Catering',
      status: 'todo',
      priority: 'medium',
      dueDate: '2026-11-05',
      assignee: 'Julian Vance',
    },
    {
      id: 't3',
      title: 'Verify stage pyrotechnics',
      phase: 'Day-Of Execution',
      status: 'in-progress',
      priority: 'high',
      dueDate: '2026-11-02',
      assignee: 'Sora Takahashi',
    },
  ];

  const taskMetrics = calculateTaskMetrics(tasks);
  assert.equal(taskMetrics.total, 3);
  assert.equal(taskMetrics.completed, 1);
  assert.equal(taskMetrics.completionPercent, 33);
  // Urgent open tasks sorted by high priority first, then earliest due date
  assert.equal(taskMetrics.urgentOpenTasks[0].id, 't3');
  assert.equal(taskMetrics.urgentOpenTasks[1].id, 't2');

  // Task validation normal vs invalid
  assert.equal(
    validateTaskInput({
      title: 'Confirm Sommelier Pairing',
      dueDate: '2026-11-10',
      assignee: 'Camille Laurent',
    }).valid,
    true
  );
  assert.equal(
    validateTaskInput({ title: 'A', dueDate: '2026-11-10', assignee: 'Camille' })
      .valid,
    false
  );
  assert.equal(
    validateTaskInput({
      title: 'Valid Task',
      dueDate: '11/10/2026',
      assignee: 'Camille',
    }).valid,
    false
  );

  // Budget validation normal vs invalid
  assert.equal(
    validateBudgetInput({
      title: 'Floral Canopy',
      vendor: 'Atelier Flora',
      unitEstimated: 4500,
      unitActual: 4600,
    }).valid,
    true
  );
  assert.equal(
    validateBudgetInput({
      title: 'Floral Canopy',
      vendor: 'Atelier Flora',
      unitEstimated: -10,
      unitActual: 4600,
    }).valid,
    false
  );

  // Guest & Schedule validation
  assert.equal(
    validateGuestInput({
      fullName: 'Dr. Helena Vance',
      email: 'helena@stanford.edu',
      plusOnes: 2,
    }).valid,
    true
  );
  assert.equal(
    validateGuestInput({
      fullName: 'Dr. Helena Vance',
      email: 'invalid-email',
      plusOnes: 2,
    }).valid,
    false
  );
  assert.equal(
    validateScheduleInput({
      title: 'Welcome Toast',
      startTime: '18:00',
      endTime: '18:30',
      location: 'Grand Foyer',
    }).valid,
    true
  );
  assert.equal(
    validateScheduleInput({
      title: 'Welcome Toast',
      startTime: '6pm',
      endTime: '18:30',
      location: 'Grand Foyer',
    }).valid,
    false
  );

  // Collaborator & Template validation
  assert.equal(
    validateCollaboratorInvite(
      'marcus@atelier-events.io',
      ['julian@atelier-events.io'],
      'camille@atelier-events.io'
    ).valid,
    true
  );
  assert.equal(
    validateCollaboratorInvite(
      'camille@atelier-events.io',
      [],
      'camille@atelier-events.io'
    ).valid,
    false
  );
  assert.equal(
    validateTemplateInput({
      title: 'Gala Blueprint',
      description: 'Full production schedule and budget.',
      category: 'Black-Tie Gala',
    }).valid,
    true
  );
});

test('Vendor Verification Checkpoints, RBAC Access, and Event Readiness Score', () => {
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

  const checkpoints = evaluateVendorCheckpoints(tasks, budgetItems);
  assert.equal(checkpoints.length, 3);
  assert.equal(checkpoints[0].id, 'chk-venue-coi');
  assert.equal(checkpoints[0].verified, true);
  assert.equal(checkpoints[1].verified, false);

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

  // RBAC permissions check
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
