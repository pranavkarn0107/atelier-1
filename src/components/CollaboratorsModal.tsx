import React, { useState } from 'react';
import { Mail, Save, Trash2, UserPlus, Users, X } from 'lucide-react';
import {
  CelebrationEvent,
  CollaboratorRole,
  UserProfile,
} from '../types/event';
import { validateCollaboratorInvite } from '../utils/eventCalculations';

interface CollaboratorsModalProps {
  isOpen: boolean;
  event: CelebrationEvent;
  currentUser: UserProfile | null;
  canEdit: boolean;
  onClose: () => void;
  onInviteCollaborator: (email: string, role: CollaboratorRole) => void;
  onRemoveCollaborator: (email: string) => void;
  onUpdateEventDetails: (details: {
    name: string;
    category: string;
    date: string;
    venueName: string;
    city: string;
    targetBudget: number;
    expectedGuests: number;
  }) => void;
}

export const CollaboratorsModal: React.FC<CollaboratorsModalProps> = ({
  isOpen,
  event,
  currentUser,
  canEdit,
  onClose,
  onInviteCollaborator,
  onRemoveCollaborator,
  onUpdateEventDetails,
}) => {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<CollaboratorRole>('co-planner');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // Co-Planner Editable Event Details State
  const [name, setName] = useState(event.name);
  const [category, setCategory] = useState(event.category);
  const [date, setDate] = useState(event.date);
  const [venueName, setVenueName] = useState(event.venueName);
  const [city, setCity] = useState(event.city);
  const [targetBudget, setTargetBudget] = useState(String(event.targetBudget));
  const [expectedGuests, setExpectedGuests] = useState(
    String(event.expectedGuests)
  );
  const [detailsSavedMsg, setDetailsSavedMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const isOwner =
    currentUser?.email.toLowerCase() === event.ownerEmail.toLowerCase() ||
    currentUser?.uid === event.ownerId;

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInviteSuccess(null);
    const validation = validateCollaboratorInvite(
      inviteEmail,
      event.collaboratorEmails || [],
      event.ownerEmail
    );
    if (!validation.valid) {
      setInviteError(validation.error || 'Invalid collaborator email.');
      return;
    }
    setInviteError(null);
    const normalized = inviteEmail.trim().toLowerCase();
    onInviteCollaborator(normalized, inviteRole);
    setInviteEmail('');
    setInviteSuccess(
      `Invited ${normalized} as ${
        inviteRole === 'co-planner' ? 'Co-Planner (Can View & Edit)' : 'Viewer'
      }.`
    );
  };

  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    if (name.trim().length < 2 || venueName.trim().length < 2) return;
    onUpdateEventDetails({
      name: name.trim(),
      category: category.trim(),
      date,
      venueName: venueName.trim(),
      city: city.trim(),
      targetBudget: Math.max(1000, Number(targetBudget) || event.targetBudget),
      expectedGuests: Math.max(1, Number(expectedGuests) || event.expectedGuests),
    });
    setDetailsSavedMsg('Event details updated for all co-planners.');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="collab-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-xl border border-slate-200 max-w-2xl w-full p-6 shadow-xl space-y-6 my-8">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-slate-800" />
            <div>
              <h2
                id="collab-modal-title"
                className="text-lg font-bold text-slate-900"
              >
                Co-Planners &amp; Event Settings
              </h2>
              <p className="text-xs text-slate-500">
                Owner: <span className="font-mono">{event.ownerEmail}</span> ·
                Your Role:{' '}
                <span className="font-semibold text-slate-800">
                  {isOwner
                    ? 'Event Owner'
                    : canEdit
                    ? 'Co-Planner (Edit Access)'
                    : 'Viewer'}
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close collaboration modal"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Invite Co-Planner via Email Section */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Invite Collaborator via Email
            </h3>
            <p className="text-xs text-slate-500">
              Invited Co-Planners have permission to view and edit event details, tasks, and budgets.
            </p>
          </div>

          {inviteError && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium"
            >
              {inviteError}
            </div>
          )}

          {inviteSuccess && (
            <div
              role="status"
              className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium"
            >
              {inviteSuccess}
            </div>
          )}

          <form
            onSubmit={handleInviteSubmit}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
            noValidate
          >
            <div className="relative flex-1">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Enter colleague email (e.g., marcus@atelier-events.io)"
                aria-label="Collaborator email address"
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <select
              aria-label="Collaborator permission role"
              value={inviteRole}
              onChange={(e) =>
                setInviteRole(e.target.value as CollaboratorRole)
              }
              className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="co-planner">Co-Planner (View &amp; Edit)</option>
              <option value="viewer">Viewer (Read Only)</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Send Invite
            </button>
          </form>

          {/* Current Collaborators List */}
          <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
            <div className="px-4 py-2.5 flex items-center justify-between text-xs bg-slate-50">
              <div>
                <span className="font-semibold text-slate-900">
                  {event.ownerEmail}
                </span>
                <span className="text-slate-500 ml-2">
                  · Primary Owner ({event.leadPlanner})
                </span>
              </div>
              <span className="font-mono text-slate-500">Full Control</span>
            </div>

            {(event.collaborators || []).map((col) => (
              <div
                key={col.id}
                className="px-4 py-2.5 flex items-center justify-between gap-2 text-xs"
              >
                <div>
                  <span className="font-semibold text-slate-900 font-mono">
                    {col.email}
                  </span>
                  <span className="text-slate-500 ml-2">
                    ·{' '}
                    {col.role === 'co-planner'
                      ? 'Co-Planner (Can View & Edit)'
                      : 'Viewer (Read Only)'}{' '}
                    · Added {col.addedAt}
                  </span>
                </div>
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => onRemoveCollaborator(col.email)}
                    aria-label={`Remove collaborator ${col.email}`}
                    className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Editable Event Details Section (Available to Owner & Co-Planners) */}
        <form
          onSubmit={handleSaveDetails}
          className="pt-4 border-t border-slate-200 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Shared Event Details
              </h3>
              <p className="text-xs text-slate-500">
                Editable by the event owner and invited Co-Planners
              </p>
            </div>
            {detailsSavedMsg && (
              <span className="text-xs font-medium text-emerald-700">
                {detailsSavedMsg}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="edit-event-name"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Event Title
              </label>
              <input
                id="edit-event-name"
                type="text"
                disabled={!canEdit}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-50"
              />
            </div>

            <div>
              <label
                htmlFor="edit-event-venue"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Venue Name
              </label>
              <input
                id="edit-event-venue"
                type="text"
                disabled={!canEdit}
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-50"
              />
            </div>

            <div>
              <label
                htmlFor="edit-event-city"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                City &amp; State
              </label>
              <input
                id="edit-event-city"
                type="text"
                disabled={!canEdit}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-50"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label
                  htmlFor="edit-event-budget"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Target Budget ($)
                </label>
                <input
                  id="edit-event-budget"
                  type="number"
                  disabled={!canEdit}
                  value={targetBudget}
                  onChange={(e) => setTargetBudget(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-50"
                />
              </div>

              <div>
                <label
                  htmlFor="edit-event-guests"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Expected Guests
                </label>
                <input
                  id="edit-event-guests"
                  type="number"
                  disabled={!canEdit}
                  value={expectedGuests}
                  onChange={(e) => setExpectedGuests(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-50"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg cursor-pointer"
            >
              Done
            </button>
            {canEdit && (
              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                Save Event Details
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
