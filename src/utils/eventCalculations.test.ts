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
  validateBudgetInput,
  validateCollaboratorInvite,
  validateGuestInput,
  validateTaskInput,
  validateTemplateInput,
} from './eventCalculations';
import { BudgetItem, EventTask, Guest, ScheduleItem } from '../types/event';

test('calculateGuestMetrics aggregates confirmed headcount, plus-ones, dietary, and tables accurately', () => {
  const guests: Guest[] = [
    {
      id: 'g1',
      fullName: 'Clara Vance',
      email: 'clara@example.com',
      group: 'Executive Board',
      rsvpStatus: 'confirmed',
      plusOnes: 1,
      dietary: 'Vegetarian',
      tableNumber: 1,
    },
    {
      id: 'g2',
      fullName: 'Marcus Sterling',
      email: 'marcus@example.com',
      group: 'Host Family',
      rsvpStatus: 'confirmed',
      plusOnes: 2,
      dietary: 'Standard',
      tableNumber: 1,
    },
    {
      id: 'g3',
      fullName: 'Elena Rostova',
      email: 'elena@example.com',
      group: 'Keynote',
      rsvpStatus: 'pending',
      plusOnes: 1,
      dietary: 'Vegan',
      tableNumber: 2,
    },
    {
      id: 'g4',
      fullName: 'David Kim',
      email: 'david@example.com',
      group: 'Friends',
      rsvpStatus: 'declined',
      plusOnes: 0,
      dietary: 'Standard',
      tableNumber: null,
    },
  ];

  const metrics = calculateGuestMetrics(guests);
  assert.equal(metrics.totalInvitedEntries, 4);
  assert.equal(metrics.confirmedGuestsOnly, 2);
  assert.equal(metrics.confirmedPlusOnes, 3);
  assert.equal(metrics.confirmedHeadcount, 5);
  assert.equal(metrics.pendingHeadcount, 2);
  assert.equal(metrics.declinedEntries, 1);
  assert.equal(metrics.rsvpResponseRate, 75);
  assert.equal(metrics.dietaryBreakdown.Vegetarian, 2);
  assert.equal(metrics.dietaryBreakdown.Standard, 3);
  assert.equal(metrics.dietaryBreakdown.Vegan, 0);
  assert.equal(metrics.tableCounts[1], 5);
});

test('calculateBudgetMetrics scales per-guest items dynamically with confirmedHeadcount', () => {
  const items: BudgetItem[] = [
    {
      id: 'b1',
      title: 'Grand Conservatory Hall Rental',
      vendor: 'Botanical Trust',
      category: 'Venue & Rentals',
      costType: 'fixed',
      unitEstimated: 12000,
      unitActual: 12000,
      paidAmount: 6000,
      paymentStatus: 'deposit-paid',
    },
    {
      id: 'b2',
      title: 'Three-Course Plated Dinner & Wine Pairing',
      vendor: 'Lumina Culinary',
      category: 'Catering & Beverage',
      costType: 'per-guest',
      unitEstimated: 150,
      unitActual: 160,
      paidAmount: 4000,
      paymentStatus: 'deposit-paid',
    },
  ];

  const m50 = calculateBudgetMetrics(items, 25000, 50);
  assert.equal(m50.totalEstimated, 19500);
  assert.equal(m50.totalActual, 20000);
  assert.equal(m50.remainingBudget, 5000);
  assert.equal(m50.costPerConfirmedGuest, 400);
  assert.equal(m50.isOverBudget, false);

  const m100 = calculateBudgetMetrics(items, 25000, 100);
  assert.equal(m100.totalActual, 28000);
  assert.equal(m100.remainingBudget, -3000);
  assert.equal(m100.isOverBudget, true);
  assert.equal(m100.costPerConfirmedGuest, 280);
});

test('calculateTaskMetrics computes phase progress and sorts urgent open tasks', () => {
  const tasks: EventTask[] = [
    {
      id: 't1',
      title: 'Sign venue contract',
      phase: 'Pre-Event',
      status: 'completed',
      priority: 'high',
      dueDate: '2026-10-01',
      assignee: 'Elena',
    },
    {
      id: 't2',
      title: 'Finalize floral mockups',
      phase: 'Venue & Catering',
      status: 'todo',
      priority: 'medium',
      dueDate: '2026-11-05',
      assignee: 'Elena',
    },
    {
      id: 't3',
      title: 'Confirm allergen seating chart',
      phase: 'Guest Experience',
      status: 'in-progress',
      priority: 'high',
      dueDate: '2026-11-01',
      assignee: 'Marcus',
    },
  ];

  const metrics = calculateTaskMetrics(tasks);
  assert.equal(metrics.total, 3);
  assert.equal(metrics.completed, 1);
  assert.equal(metrics.completionPercent, 33);
  assert.equal(metrics.urgentOpenTasks.length, 2);
  assert.equal(metrics.urgentOpenTasks[0].id, 't3');
});

test('calculateTimelineMetrics detects overlapping schedule blocks and calculates durations', () => {
  const schedule: ScheduleItem[] = [
    {
      id: 's1',
      startTime: '17:00',
      endTime: '18:30',
      title: 'Cocktail Reception',
      location: 'North Atrium',
      leadContact: 'A. Mercer',
      status: 'ready',
    },
    {
      id: 's2',
      startTime: '18:00',
      endTime: '19:30',
      title: 'Soundcheck & Keynote Prep',
      location: 'Main Hall',
      leadContact: 'J. Chen',
      status: 'scheduled',
    },
  ];

  const timeline = calculateTimelineMetrics(schedule);
  assert.equal(timeline.blocks.length, 2);
  assert.equal(timeline.blocks[0].durationMinutes, 90);
  assert.equal(timeline.conflictCount, 1);
  assert.equal(timeline.blocks[0].hasConflict, true);
  assert.equal(timeline.blocks[1].hasConflict, true);
});

test('collaboration access control and invite validation enforce owner and co-planner permissions', () => {
  const sampleEvent = {
    ownerId: 'uid-owner-1',
    ownerEmail: 'camille@atelier-events.io',
    collaboratorEmails: ['julian@atelier-events.io', 'viewer@atelier-events.io'],
    collaborators: [
      {
        id: 'col-1',
        email: 'julian@atelier-events.io',
        role: 'co-planner' as const,
        invitedByEmail: 'camille@atelier-events.io',
        status: 'active' as const,
        addedAt: '2026-10-20',
      },
      {
        id: 'col-2',
        email: 'viewer@atelier-events.io',
        role: 'viewer' as const,
        invitedByEmail: 'camille@atelier-events.io',
        status: 'invited' as const,
        addedAt: '2026-10-21',
      },
    ],
  };

  assert.equal(canUserAccessEvent(sampleEvent, 'camille@atelier-events.io'), true);
  assert.equal(canUserAccessEvent(sampleEvent, 'julian@atelier-events.io'), true);
  assert.equal(canUserAccessEvent(sampleEvent, 'stranger@example.com'), false);

  assert.equal(canUserEditEvent(sampleEvent, 'camille@atelier-events.io'), true);
  assert.equal(canUserEditEvent(sampleEvent, 'julian@atelier-events.io'), true);
  assert.equal(canUserEditEvent(sampleEvent, 'viewer@atelier-events.io'), false);

  // Invite validation
  assert.equal(
    validateCollaboratorInvite(
      'camille@atelier-events.io',
      sampleEvent.collaboratorEmails,
      sampleEvent.ownerEmail
    ).valid,
    false
  );
  assert.equal(
    validateCollaboratorInvite(
      'julian@atelier-events.io',
      sampleEvent.collaboratorEmails,
      sampleEvent.ownerEmail
    ).valid,
    false
  );
  assert.equal(
    validateCollaboratorInvite(
      'sora@atelier-events.io',
      sampleEvent.collaboratorEmails,
      sampleEvent.ownerEmail
    ).valid,
    true
  );
});

test('form and template validators enforce blueprint limits', () => {
  assert.equal(
    validateTaskInput({ title: '', dueDate: '2026-11-10', assignee: 'Claire' }).valid,
    false
  );
  assert.equal(
    validateBudgetInput({ title: 'AV Rig', vendor: '', unitEstimated: 500, unitActual: 500 }).valid,
    false
  );
  assert.equal(
    validateGuestInput({ fullName: 'Aria Lin', email: 'aria@lin.org', plusOnes: 2 }).valid,
    true
  );
  assert.equal(
    validateTemplateInput({
      title: ' Conservatory Gala Blueprint ',
      description: 'Full run-of-show and catering budget for 80-guest botanical gala.',
      category: 'Black-Tie Gala',
    }).valid,
    true
  );
  assert.equal(
    validateTemplateInput({
      title: 'A',
      description: 'Valid description',
      category: 'Gala',
    }).valid,
    false
  );
});

test('buildBudgetChartData computes total Projected vs. Actual progress and category pie chart shares', () => {
  const items: BudgetItem[] = [
    {
      id: 'b1',
      title: 'Conservatory Rental',
      vendor: 'Botanical Trust',
      category: 'Venue & Rentals',
      costType: 'fixed',
      unitEstimated: 10000,
      unitActual: 12000,
      paidAmount: 6000,
      paymentStatus: 'deposit-paid',
    },
    {
      id: 'b2',
      title: 'Plated Banquet',
      vendor: 'Lumina Culinary',
      category: 'Catering & Beverage',
      costType: 'per-guest',
      unitEstimated: 200,
      unitActual: 180,
      paidAmount: 9000,
      paymentStatus: 'paid',
    },
  ];

  const metrics = calculateBudgetMetrics(items, 30000, 50);
  const chartData = buildBudgetChartData(metrics);

  // Projected: 10000 + (200 * 50) = 20000
  // Actual: 12000 + (180 * 50) = 21000
  assert.equal(chartData.projectedTotal, 20000);
  assert.equal(chartData.actualTotal, 21000);
  assert.equal(chartData.deltaAmount, 1000);
  assert.equal(chartData.isActualOverProjected, true);
  assert.equal(chartData.actualVsProjectedPercent, 105);
  assert.equal(chartData.categories.length, 2);
  assert.equal(chartData.categories[0].name, 'Venue & Rentals');
  assert.equal(chartData.categories[0].projected, 10000);
  assert.equal(chartData.categories[0].actual, 12000);
  assert.equal(chartData.categories[0].shareOfProjectedPercent, 50);
  assert.equal(chartData.categories[0].overrunPercent, 20);
  assert.equal(chartData.categories[0].isExceedingProjectedBy10Pct, true);
  assert.equal(chartData.categories[1].isExceedingProjectedBy10Pct, false);
  assert.equal(chartData.exceedingCategories.length, 1);
  assert.equal(chartData.exceedingCategories[0].name, 'Venue & Rentals');
});

