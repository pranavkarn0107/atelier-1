import React, { useState } from 'react';
import { Minus, Plus, Search, Trash2, UserPlus } from 'lucide-react';
import {
  DietaryRestriction,
  Guest,
  RsvpStatus,
} from '../types/event';
import {
  GuestMetrics,
  validateGuestInput,
} from '../utils/eventCalculations';

interface GuestsTabProps {
  guests: Guest[];
  guestMetrics: GuestMetrics;
  expectedGuests: number;
  perGuestCostRate: number;
  onAddGuest: (guest: Omit<Guest, 'id'>) => void;
  onUpdateRsvp: (guestId: string, status: RsvpStatus) => void;
  onUpdatePlusOnes: (guestId: string, plusOnes: number) => void;
  onUpdateTable: (guestId: string, tableNumber: number | null) => void;
  onDeleteGuest: (guestId: string) => void;
}

export const GuestsTab: React.FC<GuestsTabProps> = ({
  guests,
  guestMetrics,
  expectedGuests,
  perGuestCostRate,
  onAddGuest,
  onUpdateRsvp,
  onUpdatePlusOnes,
  onUpdateTable,
  onDeleteGuest,
}) => {
  const [rsvpFilter, setRsvpFilter] = useState<'all' | RsvpStatus>('all');
  const [dietaryFilter, setDietaryFilter] = useState<'All' | DietaryRestriction>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // New Guest Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [group, setGroup] = useState('Patron Circle');
  const [rsvpStatus, setRsvpStatus] = useState<RsvpStatus>('confirmed');
  const [plusOnes, setPlusOnes] = useState('0');
  const [dietary, setDietary] = useState<DietaryRestriction>('Standard');
  const [tableNumber, setTableNumber] = useState('1');
  const [formError, setFormError] = useState<string | null>(null);

  const filteredGuests = guests.filter((g) => {
    if (rsvpFilter !== 'all' && g.rsvpStatus !== rsvpFilter) return false;
    if (dietaryFilter !== 'All' && g.dietary !== dietaryFilter) return false;
    if (
      searchQuery.trim() !== '' &&
      !g.fullName.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !g.email.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !g.group.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateGuestInput({ fullName, email, plusOnes });
    if (!validation.valid) {
      setFormError(validation.error || 'Please check required guest fields.');
      return;
    }
    setFormError(null);
    const parsedTable = Number(tableNumber);
    onAddGuest({
      fullName: fullName.trim(),
      email: email.trim(),
      group: group.trim() || 'General',
      rsvpStatus,
      plusOnes: Math.max(0, Number(plusOnes) || 0),
      dietary,
      tableNumber:
        !Number.isNaN(parsedTable) && parsedTable > 0 ? parsedTable : null,
    });
    setFullName('');
    setEmail('');
    setPlusOnes('0');
  };

  return (
    <div className="space-y-6">
      {/* Guest & Dietary Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="text-xs text-slate-500 mb-1">
            Confirmed Headcount (Incl. Plus-Ones)
          </div>
          <div
            data-testid="guests-confirmed-headcount"
            className="text-2xl font-bold font-mono tabular-nums text-slate-900"
          >
            {guestMetrics.confirmedHeadcount}{' '}
            <span className="text-sm font-normal text-slate-400">
              / {expectedGuests} capacity
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-1.5 font-mono tabular-nums">
            {guestMetrics.confirmedGuestsOnly} primary +{' '}
            {guestMetrics.confirmedPlusOnes} companions
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="text-xs text-slate-500 mb-1">
            RSVP Response Rate
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {guestMetrics.rsvpResponseRate}%
          </div>
          <div className="text-xs text-slate-500 mt-1.5 font-mono tabular-nums">
            {guestMetrics.pendingHeadcount} headcount awaiting reply ·{' '}
            {guestMetrics.declinedEntries} declined
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="text-xs text-slate-500 mb-1">
            Confirmed Dietary Breakdown
          </div>
          <div className="text-sm font-semibold font-mono tabular-nums text-slate-900 mt-1 space-x-2">
            <span>Std: {guestMetrics.dietaryBreakdown.Standard}</span>
            <span>·</span>
            <span>Veg: {guestMetrics.dietaryBreakdown.Vegetarian}</span>
            <span>·</span>
            <span>Vgn: {guestMetrics.dietaryBreakdown.Vegan}</span>
            <span>·</span>
            <span>GF: {guestMetrics.dietaryBreakdown['Gluten-Free']}</span>
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Synced with catering kitchen manifest
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="text-xs text-slate-500 mb-1">
            Variable Catering Impact
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            ${(guestMetrics.confirmedHeadcount * perGuestCostRate).toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 mt-1.5 font-mono tabular-nums">
            @${perGuestCostRate}/confirmed guest across variable items
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Cols: Guest List Table */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Guest Directory &amp; Seating Manifest
              </h2>
              <p className="text-xs text-slate-500">
                Updating RSVP status or plus-ones immediately recalculates variable event budgets.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search guest, email, or group..."
                aria-label="Search guests"
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
            <div
              role="group"
              aria-label="Filter guests by RSVP status"
              className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg"
            >
              {(['all', 'confirmed', 'pending', 'declined'] as const).map(
                (st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setRsvpFilter(st)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      rsvpFilter === st
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {st === 'all'
                      ? 'All RSVPs'
                      : st.charAt(0).toUpperCase() + st.slice(1)}
                  </button>
                )
              )}
            </div>

            <div
              role="group"
              aria-label="Filter guests by dietary requirement"
              className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg"
            >
              {(
                [
                  'All',
                  'Standard',
                  'Vegetarian',
                  'Vegan',
                  'Gluten-Free',
                ] as const
              ).map((dt) => (
                <button
                  key={dt}
                  type="button"
                  onClick={() => setDietaryFilter(dt)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    dietaryFilter === dt
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {dt}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="py-2.5 pr-4 font-medium">Guest &amp; Group</th>
                  <th className="py-2.5 px-3 font-medium">RSVP Status</th>
                  <th className="py-2.5 px-3 font-medium">Plus-Ones</th>
                  <th className="py-2.5 px-3 font-medium">Dietary</th>
                  <th className="py-2.5 px-3 font-medium">Table</th>
                  <th className="py-2.5 pl-2 font-medium text-right">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredGuests.map((guest) => (
                  <tr
                    key={guest.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3 pr-4">
                      <div className="font-medium text-slate-900">
                        {guest.fullName}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <span>{guest.group}</span>
                        <span aria-hidden="true">·</span>
                        <span>{guest.email}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <select
                        aria-label={`RSVP status for ${guest.fullName}`}
                        value={guest.rsvpStatus}
                        onChange={(e) =>
                          onUpdateRsvp(guest.id, e.target.value as RsvpStatus)
                        }
                        className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer"
                      >
                        <option value="confirmed">Confirmed</option>
                        <option value="pending">Pending</option>
                        <option value="declined">Declined</option>
                      </select>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 font-mono tabular-nums text-xs">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdatePlusOnes(
                              guest.id,
                              Math.max(0, guest.plusOnes - 1)
                            )
                          }
                          aria-label={`Decrease plus-ones for ${guest.fullName}`}
                          className="w-6 h-6 rounded border border-slate-200 flex items-center justify-center hover:bg-slate-100 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center font-semibold">
                          +{guest.plusOnes}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdatePlusOnes(guest.id, guest.plusOnes + 1)
                          }
                          aria-label={`Increase plus-ones for ${guest.fullName}`}
                          className="w-6 h-6 rounded border border-slate-200 flex items-center justify-center hover:bg-slate-100 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-700 whitespace-nowrap">
                      {guest.dietary}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <select
                        aria-label={`Table assignment for ${guest.fullName}`}
                        value={guest.tableNumber ?? ''}
                        onChange={(e) =>
                          onUpdateTable(
                            guest.id,
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                        className="text-xs font-mono border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer"
                      >
                        <option value="">Unassigned</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                          <option key={num} value={num}>
                            Table {num}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 pl-2 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onDeleteGuest(guest.id)}
                        aria-label={`Remove guest ${guest.fullName}`}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 4 Cols: Add Guest Form */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-base font-bold text-slate-900 mb-1">
            Add Guest &amp; Party
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Register an invitee, party size, and dietary preference.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {formError && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium"
              >
                {formError}
              </div>
            )}

            <div>
              <label
                htmlFor="guest-fullname"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Guest Full Name
              </label>
              <input
                id="guest-fullname"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g.,Professor Alistair Finch"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="guest-email"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Email Address
              </label>
              <input
                id="guest-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alistair@oxford.ac.uk"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="guest-group"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Affiliation / Group
                </label>
                <input
                  id="guest-group"
                  type="text"
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label
                  htmlFor="guest-rsvp"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Initial RSVP Status
                </label>
                <select
                  id="guest-rsvp"
                  value={rsvpStatus}
                  onChange={(e) => setRsvpStatus(e.target.value as RsvpStatus)}
                  className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="confirmed">Confirmed</option>
                  <option value="pending">Pending</option>
                  <option value="declined">Declined</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label
                  htmlFor="guest-plusones"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Plus-Ones
                </label>
                <input
                  id="guest-plusones"
                  type="number"
                  min={0}
                  max={10}
                  value={plusOnes}
                  onChange={(e) => setPlusOnes(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label
                  htmlFor="guest-dietary"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Dietary
                </label>
                <select
                  id="guest-dietary"
                  value={dietary}
                  onChange={(e) =>
                    setDietary(e.target.value as DietaryRestriction)
                  }
                  className="w-full px-2 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="Standard">Standard</option>
                  <option value="Vegetarian">Vegetarian</option>
                  <option value="Vegan">Vegan</option>
                  <option value="Gluten-Free">Gluten-Free</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="guest-table"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Table #
                </label>
                <input
                  id="guest-table"
                  type="number"
                  min={1}
                  max={20}
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              Add Guest to Manifest
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
