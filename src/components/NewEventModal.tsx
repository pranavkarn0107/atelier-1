import React, { useState } from 'react';
import { X } from 'lucide-react';
import { CelebrationEvent, UserProfile } from '../types/event';

interface NewEventModalProps {
  isOpen: boolean;
  currentUser: UserProfile | null;
  onClose: () => void;
  onCreateEvent: (newEvent: CelebrationEvent) => void;
}

export const NewEventModal: React.FC<NewEventModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  onCreateEvent,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Corporate Gala & Keynote');
  const [date, setDate] = useState('2026-12-18');
  const [venueName, setVenueName] = useState('');
  const [city, setCity] = useState('New York, NY');
  const [targetBudget, setTargetBudget] = useState('50000');
  const [expectedGuests, setExpectedGuests] = useState('75');
  const [leadPlanner, setLeadPlanner] = useState(
    currentUser?.displayName || 'Camille Laurent'
  );
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 3) {
      setError('Please enter an event title (at least 3 characters).');
      return;
    }
    if (venueName.trim().length < 2) {
      setError('Please specify a venue name.');
      return;
    }
    const parsedBudget = Number(targetBudget);
    const parsedGuests = Number(expectedGuests);
    if (Number.isNaN(parsedBudget) || parsedBudget <= 0) {
      setError('Target budget must be greater than $0.');
      return;
    }
    if (Number.isNaN(parsedGuests) || parsedGuests <= 0) {
      setError('Expected guest count must be at least 1.');
      return;
    }

    setError(null);
    const ownerId = currentUser?.uid || 'usr-camille-laurent';
    const ownerEmail = currentUser?.email || 'camille@atelier-events.io';

    const newEvt: CelebrationEvent = {
      id: `evt-${Date.now()}`,
      name: name.trim(),
      category: category.trim(),
      date,
      venueName: venueName.trim(),
      city: city.trim(),
      targetBudget: parsedBudget,
      expectedGuests: parsedGuests,
      leadPlanner: leadPlanner.trim() || currentUser?.displayName || 'Lead Coordinator',
      ownerId,
      ownerEmail,
      collaboratorEmails: [],
      collaborators: [],
      lastSyncedAt: new Date().toISOString(),
      tasks: [
        {
          id: `tsk-${Date.now()}-1`,
          title: 'Execute venue rental agreement & insurance certificate',
          phase: 'Pre-Event',
          status: 'todo',
          priority: 'high',
          dueDate: date,
          assignee: leadPlanner.trim() || 'Lead Coordinator',
        },
      ],
      budgetItems: [
        {
          id: `bdg-${Date.now()}-1`,
          title: 'Primary Venue Hall Buyout',
          vendor: venueName.trim(),
          category: 'Venue & Rentals',
          costType: 'fixed',
          unitEstimated: Math.round(parsedBudget * 0.3),
          unitActual: Math.round(parsedBudget * 0.3),
          paidAmount: 0,
          paymentStatus: 'planned',
        },
        {
          id: `bdg-${Date.now()}-2`,
          title: 'Seasonal Plated Dinner & Beverage Service (Per Guest)',
          vendor: 'House Culinary Group',
          category: 'Catering & Beverage',
          costType: 'per-guest',
          unitEstimated: 185,
          unitActual: 185,
          paidAmount: 0,
          paymentStatus: 'planned',
        },
      ],
      guests: [
        {
          id: `gst-${Date.now()}-1`,
          fullName: 'Executive Host Party',
          email: ownerEmail,
          group: 'Host Committee',
          rsvpStatus: 'confirmed',
          plusOnes: 3,
          dietary: 'Standard',
          tableNumber: 1,
        },
      ],
      schedule: [
        {
          id: `sch-${Date.now()}-1`,
          startTime: '18:00',
          endTime: '19:00',
          title: 'Welcome Reception & Guest Check-In',
          location: 'Main Foyer',
          leadContact: leadPlanner.trim() || 'Lead Coordinator',
          status: 'scheduled',
        },
      ],
    };

    onCreateEvent(newEvt);
    setName('');
    setVenueName('');
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-event-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
    >
      <div className="bg-white rounded-xl border border-slate-200 max-w-lg w-full p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <h2
            id="new-event-modal-title"
            className="text-lg font-bold text-slate-900"
          >
            Initialize New Celebration Event
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close new event modal"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4" noValidate>
          {error && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium"
            >
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="modal-event-name"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Celebration / Event Title
            </label>
            <input
              id="modal-event-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Horizon Architecture Awards Banquet"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="modal-event-category"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Event Classification
              </label>
              <input
                id="modal-event-category"
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="modal-event-date"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Event Date
              </label>
              <input
                id="modal-event-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="modal-event-venue"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Venue Name
              </label>
              <input
                id="modal-event-venue"
                type="text"
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                placeholder="e.g., The Met Cloisters Courtyard"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="modal-event-city"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                City &amp; State
              </label>
              <input
                id="modal-event-city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="modal-event-budget"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Target Budget ($)
              </label>
              <input
                id="modal-event-budget"
                type="number"
                min={1000}
                value={targetBudget}
                onChange={(e) => setTargetBudget(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="modal-event-guests"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Expected Guests
              </label>
              <input
                id="modal-event-guests"
                type="number"
                min={5}
                value={expectedGuests}
                onChange={(e) => setExpectedGuests(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="modal-event-planner"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Lead Architect
              </label>
              <input
                id="modal-event-planner"
                type="text"
                value={leadPlanner}
                onChange={(e) => setLeadPlanner(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Create Event Workspace
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
