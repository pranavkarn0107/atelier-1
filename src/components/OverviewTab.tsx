import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  MapPin,
  Sliders,
  Users,
} from 'lucide-react';
import { CelebrationEvent, EventTask } from '../types/event';
import {
  BudgetMetrics,
  GuestMetrics,
  ReadinessSummary,
  TaskMetrics,
  TimelineMetrics,
} from '../utils/eventCalculations';

interface OverviewTabProps {
  event: CelebrationEvent;
  taskMetrics: TaskMetrics;
  budgetMetrics: BudgetMetrics;
  guestMetrics: GuestMetrics;
  timelineMetrics: TimelineMetrics;
  readiness: ReadinessSummary;
  heroBg?: string;
  onToggleTaskStatus: (taskId: string) => void;
  onNavigateTab: (tab: 'overview' | 'tasks' | 'budget' | 'guests' | 'timeline') => void;
  onUpdateTargetBudget: (newTarget: number) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  event,
  taskMetrics,
  budgetMetrics,
  guestMetrics,
  timelineMetrics,
  readiness,
  heroBg = '#0F172A',
  onToggleTaskStatus,
  onNavigateTab,
}) => {
  // Interactive What-If Headcount Simulator state (defaults to current confirmed headcount)
  const [simulatedHeadcount, setSimulatedHeadcount] = useState<number | null>(null);
  const activeSimGuests =
    simulatedHeadcount !== null ? simulatedHeadcount : guestMetrics.confirmedHeadcount;

  const projectedVariableCost =
    Math.round(budgetMetrics.variablePerGuestRateSum * activeSimGuests * 100) / 100;
  const projectedTotalCost =
    Math.round((budgetMetrics.fixedActualTotal + projectedVariableCost) * 100) / 100;
  const projectedRemaining =
    Math.round((budgetMetrics.targetBudget - projectedTotalCost) * 100) / 100;
  const projectedPerGuest =
    activeSimGuests > 0 ? Math.round(projectedTotalCost / activeSimGuests) : 0;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);

  return (
    <div className="space-y-8">
      {/* Architectural Venue Banner & Event Readiness Summary */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div
          style={{ backgroundColor: heroBg }}
          className="lg:col-span-8 text-white rounded-xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden border border-slate-800 transition-colors duration-200"
        >
          {/* Subtle architectural grid SVG backdrop */}
          <svg
            className="absolute right-0 top-0 h-full w-1/2 text-slate-800/40 pointer-events-none"
            viewBox="0 0 400 240"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M20 240 L20 80 Q200 10 380 80 L380 240"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M60 240 L60 105 Q200 45 340 105 L340 240"
              stroke="currentColor"
              strokeWidth="1"
            />
            <line x1="200" y1="25" x2="200" y2="240" stroke="currentColor" strokeWidth="1" />
            <line x1="110" y1="65" x2="110" y2="240" stroke="currentColor" strokeWidth="1" />
            <line x1="290" y1="65" x2="290" y2="240" stroke="currentColor" strokeWidth="1" />
            <line x1="20" y1="150" x2="380" y2="150" stroke="currentColor" strokeWidth="1" />
          </svg>

          <div className="relative z-10 space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
              <span>{event.category}</span>
              <span aria-hidden="true">·</span>
              <span>Lead Architect: {event.leadPlanner}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{readiness.daysUntilEvent} days until event</span>
            </div>
            <h1
              className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display"
              style={{ textWrap: 'balance' }}
            >
              {event.name}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300 pt-1">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-mono tabular-nums">{event.date}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  {event.venueName}, {event.city}
                </span>
              </span>
            </div>
          </div>

          <div className="relative z-10 pt-6 mt-6 border-t border-slate-800/90 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div>
                <div className="text-xs text-slate-400">Execution Readiness</div>
                <div className="text-xl font-bold font-mono tabular-nums text-white">
                  {readiness.overallScore}% — {readiness.statusLabel}
                </div>
              </div>
              <div className="h-8 w-px bg-slate-800 hidden sm:block" />
              <div>
                <div className="text-xs text-slate-400">Per-Guest Cost Rate</div>
                <div className="text-xl font-bold font-mono tabular-nums text-amber-300">
                  {formatCurrency(budgetMetrics.costPerConfirmedGuest)}
                  <span className="text-xs font-normal text-slate-400 ml-1">/ confirmed guest</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigateTab('tasks')}
                className="px-4 py-2 text-xs font-semibold bg-white text-slate-900 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Manage Tasks
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('budget')}
                className="px-4 py-2 text-xs font-semibold bg-slate-800 text-slate-100 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Inspect Budget
              </button>
            </div>
          </div>
        </div>

        {/* Phase Completion Card */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900">Milestone Phases</h2>
              <span className="text-xs font-mono tabular-nums text-slate-500">
                {taskMetrics.completed}/{taskMetrics.total} done
              </span>
            </div>
            <div className="space-y-3.5">
              {taskMetrics.phases.map((p) => (
                <div key={p.phase} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{p.phase}</span>
                    <span className="font-mono tabular-nums text-slate-500">
                      {p.completed}/{p.total} ({p.percent}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-900 transition-all duration-200"
                      style={{ width: `${p.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>{taskMetrics.urgentOpenTasks.length} open tasks remaining</span>
            <button
              type="button"
              onClick={() => onNavigateTab('tasks')}
              className="font-semibold text-slate-900 hover:underline inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
            >
              View Checklist
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* 4-Column Full-Width Real-Time KPI Strip */}
      <section
        aria-label="Key Event Metrics"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Task Completion</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div
            data-testid="kpi-task-completion"
            className="text-2xl font-bold font-mono tabular-nums text-slate-900"
          >
            {taskMetrics.completionPercent}%
          </div>
          <div className="mt-1 text-xs text-slate-500 flex items-center gap-1.5">
            <span className="font-mono tabular-nums">{taskMetrics.completed} completed</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{taskMetrics.inProgress} active</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{taskMetrics.todo} queued</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Total Committed Budget</span>
            <DollarSign className="w-4 h-4 text-slate-700" />
          </div>
          <div
            data-testid="kpi-total-actual"
            className="text-2xl font-bold font-mono tabular-nums text-slate-900"
          >
            {formatCurrency(budgetMetrics.totalActual)}
          </div>
          <div className="mt-1 text-xs flex items-center gap-1.5">
            <span
              className={
                budgetMetrics.isOverBudget
                  ? 'text-red-600 font-medium font-mono tabular-nums'
                  : 'text-emerald-700 font-medium font-mono tabular-nums'
              }
            >
              {budgetMetrics.isOverBudget
                ? `${formatCurrency(Math.abs(budgetMetrics.remainingBudget))} over target`
                : `${formatCurrency(budgetMetrics.remainingBudget)} under target`}
            </span>
            <span aria-hidden="true" className="text-slate-400">
              ·
            </span>
            <span className="text-slate-500 font-mono tabular-nums">
              {budgetMetrics.utilizationPercent}% of {formatCurrency(budgetMetrics.targetBudget)}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Confirmed Headcount</span>
            <Users className="w-4 h-4 text-slate-700" />
          </div>
          <div
            data-testid="kpi-confirmed-headcount"
            className="text-2xl font-bold font-mono tabular-nums text-slate-900"
          >
            {guestMetrics.confirmedHeadcount}{' '}
            <span className="text-sm font-normal text-slate-500">
              / {event.expectedGuests} target
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-500 flex items-center gap-1.5">
            <span className="font-mono tabular-nums">
              {guestMetrics.confirmedGuestsOnly} primary + {guestMetrics.confirmedPlusOnes} guests
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{guestMetrics.pendingHeadcount} pending</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Run-of-Show Timeline</span>
            <Clock className="w-4 h-4 text-slate-700" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {timelineMetrics.blocks.length} blocks
          </div>
          <div className="mt-1 text-xs flex items-center gap-1.5">
            <span className="text-slate-500 font-mono tabular-nums">
              {(timelineMetrics.totalDurationMinutes / 60).toFixed(1)} hrs total
            </span>
            <span aria-hidden="true" className="text-slate-400">
              ·
            </span>
            {timelineMetrics.conflictCount > 0 ? (
              <span className="text-amber-700 font-medium inline-flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {timelineMetrics.conflictCount} overlap
              </span>
            ) : (
              <span className="text-emerald-700 font-medium">Zero conflicts</span>
            )}
          </div>
        </div>
      </section>

      {/* Main Two-Column Operational Workspace */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Urgent Tasks + Run-of-Show Preview */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Priority Action Queue
                </h2>
                <p className="text-xs text-slate-500">
                  Check off tasks to dynamically update overall event readiness
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('tasks')}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                All Tasks ({taskMetrics.total})
              </button>
            </div>

            {taskMetrics.urgentOpenTasks.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">
                All scheduled tasks are complete. Add new milestones in the Tasks tab.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {taskMetrics.urgentOpenTasks.slice(0, 5).map((task: EventTask) => (
                  <div
                    key={task.id}
                    className="py-3 flex items-start justify-between gap-4 hover:bg-slate-50/70 px-2 -mx-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id={`overview-task-${task.id}`}
                        checked={task.status === 'completed'}
                        onChange={() => onToggleTaskStatus(task.id)}
                        aria-label={`Complete task "${task.title}"`}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                      />
                      <div>
                        <label
                          htmlFor={`overview-task-${task.id}`}
                          className="text-sm font-medium text-slate-900 cursor-pointer block"
                        >
                          {task.title}
                        </label>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <span>{task.phase}</span>
                          <span aria-hidden="true">·</span>
                          <span>Assignee: {task.assignee}</span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={
                              task.priority === 'high'
                                ? 'text-red-600 font-medium'
                                : 'text-slate-500'
                            }
                          >
                            {task.priority === 'high'
                              ? 'High priority'
                              : task.priority === 'medium'
                              ? 'Medium priority'
                              : 'Low priority'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs font-mono tabular-nums text-slate-500 whitespace-nowrap shrink-0">
                      Due {task.dueDate}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dietary & Table Snapshot */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Confirmed Catering &amp; Dietary Counts
                </h2>
                <p className="text-xs text-slate-500">
                  Automatically tallied from confirmed RSVPs and plus-one party sizes
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('guests')}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Manage Guest List
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(
                ['Standard', 'Vegetarian', 'Vegan', 'Gluten-Free'] as const
              ).map((diet) => (
                <div
                  key={diet}
                  className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80"
                >
                  <div className="text-xs text-slate-500">{diet}</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                    {guestMetrics.dietaryBreakdown[diet]}
                  </div>
                  <div className="text-xs text-slate-400 font-mono tabular-nums">
                    plates confirmed
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Automated Budget Simulator & Category Breakdown */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-slate-700" />
                <h2 className="text-base font-bold text-slate-900">
                  Live Headcount-to-Budget Calculator
                </h2>
              </div>
              {simulatedHeadcount !== null &&
                simulatedHeadcount !== guestMetrics.confirmedHeadcount && (
                  <button
                    type="button"
                    onClick={() => setSimulatedHeadcount(null)}
                    className="text-xs font-medium text-slate-600 hover:text-slate-900 underline cursor-pointer"
                  >
                    Reset to Actual ({guestMetrics.confirmedHeadcount})
                  </button>
                )}
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Slide to model how guest count changes affect per-person catering, beverage, and stationery line items.
            </p>

            <div className="space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-200/80">
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <label
                    htmlFor="headcount-simulator-range"
                    className="font-medium text-slate-700"
                  >
                    Simulated Guest Headcount
                  </label>
                  <span className="font-mono tabular-nums font-bold text-slate-900">
                    {activeSimGuests} guests
                  </span>
                </div>
                <input
                  id="headcount-simulator-range"
                  type="range"
                  min={10}
                  max={200}
                  step={1}
                  value={activeSimGuests}
                  onChange={(e) => setSimulatedHeadcount(Number(e.target.value))}
                  className="w-full accent-slate-900 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] font-mono tabular-nums text-slate-400 mt-1">
                  <span>10 guests</span>
                  <span>Current Confirmed: {guestMetrics.confirmedHeadcount}</span>
                  <span>200 guests</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/80 text-xs">
                <div>
                  <span className="text-slate-500 block">Fixed Venue/Prod Costs</span>
                  <span className="font-mono tabular-nums font-semibold text-slate-900 text-sm">
                    {formatCurrency(budgetMetrics.fixedActualTotal)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">
                    Variable Per-Guest ({formatCurrency(budgetMetrics.variablePerGuestRateSum)}/ea)
                  </span>
                  <span className="font-mono tabular-nums font-semibold text-slate-900 text-sm">
                    {formatCurrency(projectedVariableCost)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Projected Total Spend</span>
                  <span className="font-mono tabular-nums font-bold text-slate-900 text-base">
                    {formatCurrency(projectedTotalCost)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Projected Variance vs Target</span>
                  <span
                    className={`font-mono tabular-nums font-bold text-base ${
                      projectedRemaining < 0 ? 'text-red-600' : 'text-emerald-700'
                    }`}
                  >
                    {projectedRemaining < 0
                      ? `-${formatCurrency(Math.abs(projectedRemaining))}`
                      : `+${formatCurrency(projectedRemaining)}`}
                  </span>
                </div>
              </div>
              <div className="text-xs text-slate-500 pt-1 flex items-center justify-between">
                <span>All-in blended cost per guest:</span>
                <span className="font-mono tabular-nums font-semibold text-slate-800">
                  {formatCurrency(projectedPerGuest)} / guest
                </span>
              </div>
            </div>
          </div>

          {/* Spend by Category */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900">
                Budget Allocation by Category
              </h2>
              <button
                type="button"
                onClick={() => onNavigateTab('budget')}
                className="text-xs font-semibold text-slate-900 hover:underline cursor-pointer"
              >
                Edit Ledger
              </button>
            </div>
            <div className="space-y-3.5">
              {budgetMetrics.categories.map((cat) => (
                <div key={cat.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{cat.category}</span>
                    <span className="font-mono tabular-nums text-slate-600">
                      {formatCurrency(cat.actual)}{' '}
                      <span className="text-slate-400">({cat.shareOfActualPercent}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-800"
                      style={{ width: `${Math.min(100, cat.shareOfActualPercent)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
