import React, { useMemo, useState } from 'react';
import { AlertCircle, Plus, Trash2 } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BudgetCategory,
  BudgetItem,
  CostType,
  PaymentStatus,
} from '../types/event';
import {
  BudgetMetrics,
  buildBudgetChartData,
  validateBudgetInput,
} from '../utils/eventCalculations';

interface BudgetTabProps {
  budgetMetrics: BudgetMetrics;
  onAddBudgetItem: (item: Omit<BudgetItem, 'id'>) => void;
  onUpdatePaymentStatus: (itemId: string, status: PaymentStatus) => void;
  onDeleteBudgetItem: (itemId: string) => void;
  onUpdateTargetBudget: (target: number) => void;
}

const CATEGORIES: ('All' | BudgetCategory)[] = [
  'All',
  'Venue & Rentals',
  'Catering & Beverage',
  'Floral & Production',
  'Entertainment & AV',
  'Attire & Stationery',
  'Logistics & Staffing',
];

export const BudgetTab: React.FC<BudgetTabProps> = ({
  budgetMetrics,
  onAddBudgetItem,
  onUpdatePaymentStatus,
  onDeleteBudgetItem,
  onUpdateTargetBudget,
}) => {
  const [selectedCategory, setSelectedCategory] =
    useState<'All' | BudgetCategory>('All');
  const [pieMetricMode, setPieMetricMode] = useState<'actual' | 'projected'>(
    'actual'
  );
  const [editingTarget, setEditingTarget] = useState(
    String(budgetMetrics.targetBudget)
  );

  // New Budget Line Form State
  const [title, setTitle] = useState('');
  const [vendor, setVendor] = useState('');
  const [category, setCategory] = useState<BudgetCategory>('Catering & Beverage');
  const [costType, setCostType] = useState<CostType>('fixed');
  const [unitEstimated, setUnitEstimated] = useState('');
  const [unitActual, setUnitActual] = useState('');
  const [paidAmount, setPaidAmount] = useState('0');
  const [formError, setFormError] = useState<string | null>(null);

  const chartData = useMemo(
    () => buildBudgetChartData(budgetMetrics),
    [budgetMetrics]
  );

  const exceedingCategorySet = useMemo(
    () => new Set(chartData.exceedingCategories.map((c) => c.name)),
    [chartData.exceedingCategories]
  );

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);

  const filteredLines = budgetMetrics.lines.filter((line) =>
    selectedCategory === 'All' ? true : line.category === selectedCategory
  );

  const handleTargetBlur = () => {
    const parsed = Number(editingTarget);
    if (!Number.isNaN(parsed) && parsed >= 1000) {
      onUpdateTargetBudget(parsed);
    } else {
      setEditingTarget(String(budgetMetrics.targetBudget));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateBudgetInput({
      title,
      vendor,
      unitEstimated,
      unitActual,
    });
    if (!validation.valid) {
      setFormError(validation.error || 'Please check required budget fields.');
      return;
    }
    setFormError(null);
    const est = Number(unitEstimated);
    const act = Number(unitActual);
    const paid = Math.max(0, Number(paidAmount) || 0);
    const effectiveTotal =
      costType === 'per-guest'
        ? act * budgetMetrics.confirmedHeadcount
        : act;

    let paymentStatus: PaymentStatus = 'planned';
    if (paid >= effectiveTotal && effectiveTotal > 0) {
      paymentStatus = 'paid';
    } else if (paid > 0) {
      paymentStatus = 'deposit-paid';
    }

    onAddBudgetItem({
      title: title.trim(),
      vendor: vendor.trim(),
      category,
      costType,
      unitEstimated: est,
      unitActual: act,
      paidAmount: paid,
      paymentStatus,
    });

    setTitle('');
    setVendor('');
    setUnitEstimated('');
    setUnitActual('');
    setPaidAmount('0');
  };

  const maxScaleDenominator = Math.max(
    1,
    chartData.targetBudget,
    chartData.projectedTotal,
    chartData.actualTotal
  );
  const projectedBarWidth = Math.min(
    100,
    Math.round((chartData.projectedTotal / maxScaleDenominator) * 100)
  );
  const actualBarWidth = Math.min(
    100,
    Math.round((chartData.actualTotal / maxScaleDenominator) * 100)
  );
  const paidBarWidth = Math.min(
    100,
    Math.round((chartData.paidTotal / maxScaleDenominator) * 100)
  );

  return (
    <div className="space-y-6">
      {/* Top Financial Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <label
            htmlFor="target-budget-input"
            className="block text-xs text-slate-500 mb-1"
          >
            Target Event Budget (Editable)
          </label>
          <div className="flex items-center gap-2">
            <span className="text-lg font-mono text-slate-400">$</span>
            <input
              id="target-budget-input"
              type="number"
              min={1000}
              step={500}
              value={editingTarget}
              onChange={(e) => setEditingTarget(e.target.value)}
              onBlur={handleTargetBlur}
              className="w-full text-xl font-bold font-mono tabular-nums text-slate-900 border-b border-slate-200 focus:border-slate-900 focus:outline-none py-0.5"
            />
          </div>
          <div className="text-xs text-slate-500 mt-1.5 font-mono tabular-nums">
            Projected baseline: {formatCurrency(budgetMetrics.totalEstimated)}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="text-xs text-slate-500 mb-1">
            Total Committed (Fixed + {budgetMetrics.confirmedHeadcount} Guests)
          </div>
          <div
            data-testid="budget-total-committed"
            className="text-2xl font-bold font-mono tabular-nums text-slate-900"
          >
            {formatCurrency(budgetMetrics.totalActual)}
          </div>
          <div className="text-xs text-slate-500 mt-1.5 font-mono tabular-nums">
            Fixed: {formatCurrency(budgetMetrics.fixedActualTotal)} · Variable:{' '}
            {formatCurrency(budgetMetrics.variablePerGuestActualTotal)}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="text-xs text-slate-500 mb-1">
            Remaining Budget Margin
          </div>
          <div
            className={`text-2xl font-bold font-mono tabular-nums ${
              budgetMetrics.isOverBudget ? 'text-red-600' : 'text-emerald-700'
            }`}
          >
            {budgetMetrics.isOverBudget
              ? `-${formatCurrency(Math.abs(budgetMetrics.remainingBudget))}`
              : formatCurrency(budgetMetrics.remainingBudget)}
          </div>
          <div className="text-xs text-slate-500 mt-1.5 font-mono tabular-nums">
            {budgetMetrics.utilizationPercent}% of target ceiling utilized
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="text-xs text-slate-500 mb-1">
            Disbursed Payments vs Balance
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {formatCurrency(budgetMetrics.totalPaid)}
          </div>
          <div className="text-xs text-slate-500 mt-1.5 font-mono tabular-nums">
            Balance due: {formatCurrency(budgetMetrics.remainingBalanceToPay)}
          </div>
        </div>
      </div>

      {/* Visual Warning Banner for Categories Exceeding Projected Amount by > 10% */}
      {chartData.exceedingCategories.length > 0 && (
        <div
          role="alert"
          data-testid="budget-overrun-warning"
          className="bg-amber-50/90 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle
              className="w-4 h-4 text-amber-600 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div className="space-y-1">
              <div className="text-xs font-bold text-amber-950">
                Projected Spending Variance Alert (&gt;10% Overrun Detected)
              </div>
              <p className="text-xs text-amber-900">
                {chartData.exceedingCategories.length}{' '}
                {chartData.exceedingCategories.length === 1
                  ? 'budget category exceeds'
                  : 'budget categories exceed'}{' '}
                its projected estimate by more than 10%:{' '}
                {chartData.exceedingCategories.map((cat, idx) => (
                  <span key={cat.name} className="font-semibold">
                    {idx > 0 ? ' · ' : ''}
                    {cat.name} (+{cat.overrunPercent}% /{' '}
                    {formatCurrency(cat.actual - cat.projected)} over)
                  </span>
                ))}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            {chartData.exceedingCategories.map((cat) => (
              <button
                key={cat.name}
                type="button"
                onClick={() =>
                  setSelectedCategory((prev) =>
                    prev === cat.name ? 'All' : cat.name
                  )
                }
                className="px-2.5 py-1 text-xs font-semibold text-amber-950 bg-amber-100/90 hover:bg-amber-200/80 border border-amber-300/80 rounded-lg transition-colors inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
              >
                <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                {cat.shortName} (+{cat.overrunPercent}%)
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recharts Visual Analytics: Projected vs. Actual Total Progress & Category Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 7 Cols: Total Projected vs. Actual Progress Bar + Recharts Category Comparison BarChart */}
        <div
          data-testid="budget-projected-actual-progress"
          className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between space-y-5"
        >
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Projected vs. Actual Spending Progress
                </h2>
                <p className="text-xs text-slate-500">
                  Total progression and category-level variance across{' '}
                  {budgetMetrics.confirmedHeadcount} confirmed guests
                </p>
              </div>
              <div className="text-left sm:text-right font-mono tabular-nums">
                <div className="text-xs text-slate-500">
                  Actual / Projected Ratio
                </div>
                <div
                  className={`text-base font-bold ${
                    chartData.isActualOverProjected
                      ? 'text-amber-700'
                      : 'text-emerald-700'
                  }`}
                >
                  {chartData.actualVsProjectedPercent}% (
                  {chartData.deltaAmount > 0 ? '+' : ''}
                  {formatCurrency(chartData.deltaAmount)})
                </div>
              </div>
            </div>

            {/* Total Progress Bar Strip */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="grid grid-cols-3 gap-3 text-xs font-mono tabular-nums">
                <div>
                  <div className="text-slate-500 font-sans">
                    Projected (Estimated)
                  </div>
                  <div className="text-sm font-bold text-slate-700 mt-0.5">
                    {formatCurrency(chartData.projectedTotal)}
                  </div>
                  <div className="text-slate-500">
                    {chartData.projectedVsTargetPercent}% of target
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 font-sans">
                    Actual (Committed)
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {formatCurrency(chartData.actualTotal)}
                  </div>
                  <div className="text-slate-500">
                    {chartData.actualVsTargetPercent}% of target
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-slate-500 font-sans">Target Ceiling</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {formatCurrency(chartData.targetBudget)}
                  </div>
                  <div className="text-slate-500">
                    Paid: {formatCurrency(chartData.paidTotal)}
                  </div>
                </div>
              </div>

              {/* Dual-Track Progress Bars: Projected vs Actual */}
              <div className="space-y-2 pt-1">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                    <span>Projected Baseline</span>
                    <span className="font-mono tabular-nums">
                      {formatCurrency(chartData.projectedTotal)} ({projectedBarWidth}%)
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label="Projected spending progress"
                    aria-valuenow={projectedBarWidth}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden"
                  >
                    <div
                      className="h-full bg-slate-400 rounded-full transition-all duration-200"
                      style={{ width: `${projectedBarWidth}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs text-slate-700 font-medium mb-1">
                    <span>Actual Committed Spend (with Paid Overlay)</span>
                    <span className="font-mono tabular-nums font-semibold text-slate-900">
                      {formatCurrency(chartData.actualTotal)} ({actualBarWidth}%)
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label="Actual committed spending progress"
                    aria-valuenow={actualBarWidth}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="relative w-full h-3 bg-slate-200 rounded-full overflow-hidden"
                  >
                    <div
                      className={`h-full rounded-full transition-all duration-200 ${
                        budgetMetrics.isOverBudget
                          ? 'bg-red-600'
                          : chartData.isActualOverProjected
                          ? 'bg-amber-600'
                          : 'bg-slate-900'
                      }`}
                      style={{ width: `${actualBarWidth}%` }}
                    />
                    <div
                      title={`Disbursed / Paid: ${formatCurrency(chartData.paidTotal)}`}
                      className="absolute inset-y-0 left-0 bg-emerald-500/80 rounded-l-full transition-all duration-200"
                      style={{ width: `${paidBarWidth}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recharts Grouped BarChart: Projected vs Actual by Category */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium text-slate-700">
                Category Comparison — Projected vs. Actual ($)
              </span>
              <div className="flex items-center gap-4">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-slate-300 inline-block" />
                  Projected
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-slate-900 inline-block" />
                  Actual
                </span>
              </div>
            </div>

            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData.categories}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  barGap={4}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#E2E8F0"
                  />
                  <XAxis
                    dataKey="shortName"
                    tick={{ fontSize: 11, fill: '#475569' }}
                    axisLine={{ stroke: '#CBD5E1' }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v: number) =>
                      v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`
                    }
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    axisLine={false}
                    tickLine={false}
                    width={46}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      formatCurrency(Number(value ?? 0)),
                      String(name) === 'projected'
                        ? 'Projected (Estimated)'
                        : 'Actual (Committed)',
                    ]}
                    labelFormatter={(label, payload) => {
                      const item = payload?.[0]?.payload as
                        | { name?: string }
                        | undefined;
                      return item?.name || String(label ?? '');
                    }}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#E2E8F0',
                      borderRadius: '0.5rem',
                      fontSize: '12px',
                    }}
                  />
                  <Bar
                    dataKey="projected"
                    name="projected"
                    fill="#CBD5E1"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="actual"
                    name="actual"
                    fill="#0F172A"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  >
                    {chartData.categories.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={
                          entry.isExceedingProjectedBy10Pct
                            ? '#D97706'
                            : '#0F172A'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Category-Based Recharts Pie Chart + Interactive Breakdown */}
        <div
          data-testid="budget-category-pie-card"
          className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Category Spending Pie Chart
              </h2>
              <p className="text-xs text-slate-500">
                Click any slice or category row to filter the ledger
              </p>
            </div>

            <div
              role="group"
              aria-label="Select pie chart spending metric"
              className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start"
            >
              <button
                type="button"
                onClick={() => setPieMetricMode('actual')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  pieMetricMode === 'actual'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Actual Spend
              </button>
              <button
                type="button"
                onClick={() => setPieMetricMode('projected')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  pieMetricMode === 'projected'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Projected
              </button>
            </div>
          </div>

          {/* Recharts Donut PieChart */}
          <div className="relative h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData.categories}
                  dataKey={pieMetricMode === 'actual' ? 'actual' : 'projected'}
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={54}
                  outerRadius={84}
                  paddingAngle={2}
                  isAnimationActive={false}
                  onClick={(entry) => {
                    if (entry?.name) {
                      setSelectedCategory((prev) =>
                        prev === entry.name ? 'All' : (entry.name as BudgetCategory)
                      );
                    }
                  }}
                >
                  {chartData.categories.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={entry.color}
                      stroke="#FFFFFF"
                      strokeWidth={selectedCategory === entry.name ? 3 : 1}
                      style={{ cursor: 'pointer' }}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, _name, props) => {
                    const payload = props?.payload as
                      | {
                          shareOfActualPercent?: number;
                          shareOfProjectedPercent?: number;
                        }
                      | undefined;
                    const share =
                      pieMetricMode === 'actual'
                        ? payload?.shareOfActualPercent
                        : payload?.shareOfProjectedPercent;
                    return [
                      `${formatCurrency(Number(value ?? 0))} (${share ?? 0}%)`,
                      pieMetricMode === 'actual'
                        ? 'Actual Spend'
                        : 'Projected Spend',
                    ];
                  }}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E2E8F0',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Center Donut Metric Summary */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[11px] text-slate-500">
                {pieMetricMode === 'actual' ? 'Total Actual' : 'Total Projected'}
              </span>
              <span className="text-sm font-bold font-mono tabular-nums text-slate-900">
                {formatCurrency(
                  pieMetricMode === 'actual'
                    ? chartData.actualTotal
                    : chartData.projectedTotal
                )}
              </span>
            </div>
          </div>

          {/* Interactive Category Legend Table (Projected vs Actual + Share) */}
          <div className="space-y-1.5 border-t border-slate-100 pt-3">
            <div className="grid grid-cols-12 text-[11px] text-slate-500 pb-1">
              <span className="col-span-5">Category</span>
              <span className="col-span-3 text-right">Projected</span>
              <span className="col-span-4 text-right">Actual (Variance)</span>
            </div>
            {chartData.categories.map((cat) => {
              const isSelected = selectedCategory === cat.name;
              const isExceeding = cat.isExceedingProjectedBy10Pct;
              return (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() =>
                    setSelectedCategory((prev) =>
                      prev === cat.name ? 'All' : cat.name
                    )
                  }
                  className={`w-full grid grid-cols-12 items-center text-xs py-1.5 px-2 rounded-md transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white font-semibold'
                      : isExceeding
                      ? 'bg-amber-50/90 border border-amber-200/80 text-amber-950 font-medium hover:bg-amber-100/70'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="col-span-5 flex items-center gap-1.5 text-left truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-xs shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="truncate">{cat.name}</span>
                    {isExceeding && (
                      <AlertCircle
                        aria-label={`${cat.name} exceeds projected amount by ${cat.overrunPercent}%`}
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isSelected ? 'text-amber-300' : 'text-amber-600'
                        }`}
                      />
                    )}
                  </span>
                  <span
                    className={`col-span-3 text-right font-mono tabular-nums ${
                      isSelected ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {formatCurrency(cat.projected)}
                  </span>
                  <span
                    className={`col-span-4 text-right font-mono tabular-nums ${
                      isSelected
                        ? 'text-white'
                        : isExceeding
                        ? 'text-amber-900 font-semibold'
                        : 'text-slate-900'
                    }`}
                  >
                    {formatCurrency(cat.actual)}{' '}
                    {isExceeding
                      ? `(+${cat.overrunPercent}%)`
                      : `(${cat.shareOfActualPercent}%)`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Cols: High-Density Expense Ledger Table */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Automated Event Cost Ledger
              </h2>
              <p className="text-xs text-slate-500">
                Per-guest items automatically multiply by confirmed headcount (
                <span className="font-mono tabular-nums font-semibold text-slate-700">
                  {budgetMetrics.confirmedHeadcount} guests
                </span>
                ). Items exceeding projected estimates by &gt;10% are flagged.
              </p>
            </div>
          </div>

          {/* Category Filter Segmented Control */}
          <div
            role="group"
            aria-label="Filter budget by category"
            className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg"
          >
            {CATEGORIES.map((cat) => {
              const isCatExceeding =
                cat !== 'All' && exceedingCategorySet.has(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1 cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-white text-slate-900 shadow-xs'
                      : isCatExceeding
                      ? 'text-amber-900 hover:bg-amber-50/70'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isCatExceeding && (
                    <AlertCircle
                      className="w-3.5 h-3.5 text-amber-600 shrink-0"
                      aria-hidden="true"
                    />
                  )}
                  <span>{cat}</span>
                </button>
              );
            })}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="py-2.5 pr-4 font-medium">Line Item &amp; Vendor</th>
                  <th className="py-2.5 px-3 font-medium">Rate Model</th>
                  <th className="py-2.5 px-3 font-medium text-right">Estimated</th>
                  <th className="py-2.5 px-3 font-medium text-right">Actual Total</th>
                  <th className="py-2.5 px-3 font-medium">Payment Status</th>
                  <th className="py-2.5 pl-2 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredLines.map((line) => {
                  const isCategoryExceeding = exceedingCategorySet.has(
                    line.category
                  );
                  const isFlagged =
                    line.isExceedingProjectedBy10Pct || isCategoryExceeding;
                  return (
                    <tr
                      key={line.id}
                      className={`transition-colors ${
                        isFlagged
                          ? 'bg-amber-50/60 hover:bg-amber-50'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="py-3 pr-4">
                        <div className="font-medium text-slate-900 flex items-center gap-1.5">
                          {isFlagged && (
                            <AlertCircle
                              aria-label="Exceeds projected amount by more than 10%"
                              className="w-4 h-4 text-amber-600 shrink-0"
                            />
                          )}
                          <span>{line.title}</span>
                        </div>
                        <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5 mt-0.5">
                          <span>{line.vendor}</span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={
                              isCategoryExceeding
                                ? 'text-amber-800 font-semibold'
                                : undefined
                            }
                          >
                            {line.category}
                          </span>
                          {line.isExceedingProjectedBy10Pct && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-amber-800 font-mono tabular-nums font-medium">
                                +{line.overrunPercent}% over projected
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-600 font-mono tabular-nums whitespace-nowrap">
                        {line.costType === 'per-guest'
                          ? `${formatCurrency(line.unitActual)} × ${budgetMetrics.confirmedHeadcount} guests`
                          : 'Fixed Fee'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-xs text-slate-500 whitespace-nowrap">
                        {formatCurrency(line.effectiveEstimated)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold whitespace-nowrap">
                        <span
                          className={`inline-flex items-center justify-end gap-1 ${
                            isFlagged ? 'text-amber-900' : 'text-slate-900'
                          }`}
                        >
                          {isFlagged && (
                            <AlertCircle
                              className="w-3.5 h-3.5 text-amber-600 shrink-0"
                              aria-hidden="true"
                            />
                          )}
                          {formatCurrency(line.effectiveActual)}
                        </span>
                      </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <select
                        aria-label={`Payment status for "${line.title}"`}
                        value={line.paymentStatus}
                        onChange={(e) =>
                          onUpdatePaymentStatus(
                            line.id,
                            e.target.value as PaymentStatus
                          )
                        }
                        className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer"
                      >
                        <option value="planned">Planned</option>
                        <option value="deposit-paid">Deposit Paid</option>
                        <option value="paid">Paid in Full</option>
                      </select>
                    </td>
                    <td className="py-3 pl-2 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onDeleteBudgetItem(line.id)}
                        aria-label={`Remove budget item "${line.title}"`}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 4 Cols: Add Expense Line Item Form */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-base font-bold text-slate-900 mb-1">
            Add Budget Line Item
          </h3>
          <p id="budget-form-help" className="text-xs text-slate-500 mb-4">
            Choose Fixed Fee or Per-Guest Variable scaling.
          </p>

          <form
            onSubmit={handleSubmit}
            aria-describedby="budget-form-help"
            className="space-y-4"
            noValidate
          >
            {formError && (
              <div
                id="budget-form-error"
                role="alert"
                className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium"
              >
                {formError}
              </div>
            )}

            <div>
              <label
                htmlFor="budget-item-title"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Expense Description
              </label>
              <input
                id="budget-item-title"
                type="text"
                value={title}
                aria-label="Expense description"
                aria-describedby="budget-form-help"
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Late-Night Espresso Cart"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="budget-item-vendor"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Vendor Name
                </label>
                <input
                  id="budget-item-vendor"
                  type="text"
                  value={vendor}
                  aria-label="Vendor name"
                  aria-describedby="budget-form-help"
                  onChange={(e) => setVendor(e.target.value)}
                  placeholder="e.g., Linea Roasters"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label
                  htmlFor="budget-item-category"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Category
                </label>
                <select
                  id="budget-item-category"
                  value={category}
                  aria-label="Budget category"
                  aria-describedby="budget-form-help"
                  onChange={(e) =>
                    setCategory(e.target.value as BudgetCategory)
                  }
                  className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="Venue & Rentals">Venue &amp; Rentals</option>
                  <option value="Catering & Beverage">
                    Catering &amp; Beverage
                  </option>
                  <option value="Floral & Production">
                    Floral &amp; Production
                  </option>
                  <option value="Entertainment & AV">
                    Entertainment &amp; AV
                  </option>
                  <option value="Attire & Stationery">
                    Attire &amp; Stationery
                  </option>
                  <option value="Logistics & Staffing">
                    Logistics &amp; Staffing
                  </option>
                </select>
              </div>
            </div>

            <div>
              <span
                id="cost-calc-mode-label"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Cost Calculation Mode
              </span>
              <div
                role="group"
                aria-labelledby="cost-calc-mode-label"
                className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg"
              >
                <button
                  type="button"
                  aria-label="Use Fixed Flat Fee calculation mode"
                  aria-pressed={costType === 'fixed'}
                  onClick={() => setCostType('fixed')}
                  className={`py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    costType === 'fixed'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Fixed Flat Fee
                </button>
                <button
                  type="button"
                  aria-label="Use Per Confirmed Guest calculation mode"
                  aria-pressed={costType === 'per-guest'}
                  onClick={() => setCostType('per-guest')}
                  className={`py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    costType === 'per-guest'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Per Confirmed Guest
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="budget-item-estimated"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  {costType === 'per-guest'
                    ? 'Est. Rate / Guest ($)'
                    : 'Estimated Cost ($)'}
                </label>
                <input
                  id="budget-item-estimated"
                  type="number"
                  min={0}
                  value={unitEstimated}
                  aria-label="Estimated unit cost in dollars"
                  aria-describedby="budget-form-help"
                  onChange={(e) => setUnitEstimated(e.target.value)}
                  placeholder={costType === 'per-guest' ? '45' : '1500'}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label
                  htmlFor="budget-item-actual"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  {costType === 'per-guest'
                    ? 'Actual Rate / Guest ($)'
                    : 'Actual Cost ($)'}
                </label>
                <input
                  id="budget-item-actual"
                  type="number"
                  min={0}
                  value={unitActual}
                  aria-label="Actual unit cost in dollars"
                  aria-describedby="budget-form-help"
                  onChange={(e) => setUnitActual(e.target.value)}
                  placeholder={costType === 'per-guest' ? '45' : '1500'}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            {costType === 'per-guest' && Number(unitActual) > 0 && (
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 font-mono tabular-nums">
                Auto-calculated total for {budgetMetrics.confirmedHeadcount}{' '}
                confirmed guests:{' '}
                <strong className="text-slate-900">
                  {formatCurrency(
                    Number(unitActual) * budgetMetrics.confirmedHeadcount
                  )}
                </strong>
              </div>
            )}

            <button
              type="submit"
              aria-label="Add expense line item to event budget"
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Expense Line Item
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
