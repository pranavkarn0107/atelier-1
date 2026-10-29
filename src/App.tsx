/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  Calendar,
  Compass,
  Download,
  LayoutTemplate,
  LogIn,
  LogOut,
  RotateCcw,
  Users,
} from 'lucide-react';
import {
  DEFAULT_USER,
  SEED_EVENTS,
  SEED_TEMPLATES,
  SEED_THEMES,
} from './data/seedEvents';
import {
  auth,
  signOutFirebase,
  syncEventToFirestore,
  syncTemplateToFirestore,
} from './firebase';
import {
  BudgetItem,
  CelebrationEvent,
  CollaboratorRole,
  DashboardTheme,
  EventCollaborator,
  EventTask,
  EventTemplate,
  Guest,
  PaymentStatus,
  RsvpStatus,
  ScheduleItem,
  ScheduleStatus,
  TaskStatus,
  UserProfile,
} from './types/event';
import {
  calculateBudgetMetrics,
  calculateGuestMetrics,
  calculateTaskMetrics,
  calculateTimelineMetrics,
  canUserAccessEvent,
  canUserEditEvent,
  computeEventReadiness,
} from './utils/eventCalculations';
import { OverviewTab } from './components/OverviewTab';
import { TasksTab } from './components/TasksTab';
import { BudgetTab } from './components/BudgetTab';
import { GuestsTab } from './components/GuestsTab';
import { TimelineTab } from './components/TimelineTab';
import { MarketplaceTab } from './components/MarketplaceTab';
import { IntelligenceTab } from './components/IntelligenceTab';
import { NewEventModal } from './components/NewEventModal';
import { AuthModal } from './components/AuthModal';
import { CollaboratorsModal } from './components/CollaboratorsModal';

export type ActiveTab =
  | 'overview'
  | 'tasks'
  | 'budget'
  | 'guests'
  | 'timeline'
  | 'marketplace'
  | 'intelligence';

const EVENTS_STORAGE_KEY = 'atelier_celebration_events_v2';
const USER_STORAGE_KEY = 'atelier_current_user_v2';
const TEMPLATES_STORAGE_KEY = 'atelier_templates_v2';
const THEMES_STORAGE_KEY = 'atelier_themes_v2';
const ACTIVE_THEME_KEY = 'atelier_active_theme_id_v2';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(USER_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    return DEFAULT_USER;
  });

  const [events, setEvents] = useState<CelebrationEvent[]>(() => {
    try {
      const saved = localStorage.getItem(EVENTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return structuredClone(SEED_EVENTS);
  });

  const [templates, setTemplates] = useState<EventTemplate[]>(() => {
    try {
      const saved = localStorage.getItem(TEMPLATES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return structuredClone(SEED_TEMPLATES);
  });

  const [themes, setThemes] = useState<DashboardTheme[]>(() => {
    try {
      const saved = localStorage.getItem(THEMES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return structuredClone(SEED_THEMES);
  });

  const [activeThemeId, setActiveThemeId] = useState<string>(() => {
    return localStorage.getItem(ACTIVE_THEME_KEY) || SEED_THEMES[0].id;
  });

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser && fbUser.email) {
        const profile: UserProfile = {
          uid: fbUser.uid,
          email: fbUser.email.toLowerCase(),
          displayName: fbUser.displayName || fbUser.email.split('@')[0],
          authProvider: 'google',
        };
        setCurrentUser(profile);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }, [currentUser]);

  // Filter events accessible to the logged-in user (Owner OR Invited Collaborator)
  const accessibleEvents = useMemo(() => {
    if (!currentUser) return [];
    const list = events.filter((evt) =>
      canUserAccessEvent(evt, currentUser.email, currentUser.uid)
    );
    return list.length > 0 ? list : events;
  }, [events, currentUser]);

  const [selectedEventId, setSelectedEventId] = useState<string>(
    () => accessibleEvents[0]?.id || SEED_EVENTS[0].id
  );
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [isNewEventModalOpen, setIsNewEventModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCollabModalOpen, setIsCollabModalOpen] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string>(
    'Synced to account & cloud workspace'
  );

  const currentEvent = useMemo(
    () =>
      accessibleEvents.find((e) => e.id === selectedEventId) ||
      accessibleEvents[0] ||
      events[0],
    [accessibleEvents, selectedEventId, events]
  );

  const activeTheme = useMemo(
    () => themes.find((t) => t.id === activeThemeId) || themes[0],
    [themes, activeThemeId]
  );

  const canEditCurrentEvent = useMemo(() => {
    if (!currentUser) return false;
    return canUserEditEvent(currentEvent, currentUser.email, currentUser.uid);
  }, [currentEvent, currentUser]);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
    } catch {
      // ignore
    }
  }, [events]);

  useEffect(() => {
    try {
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
    } catch {
      // ignore
    }
  }, [templates]);

  useEffect(() => {
    try {
      localStorage.setItem(THEMES_STORAGE_KEY, JSON.stringify(themes));
      localStorage.setItem(ACTIVE_THEME_KEY, activeThemeId);
    } catch {
      // ignore
    }
  }, [themes, activeThemeId]);

  const syncEventToServer = async (updatedEvent: CelebrationEvent) => {
    try {
      void syncEventToFirestore(updatedEvent);
      const res = await fetch(`/api/events/${updatedEvent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedEvent),
      });
      if (res.ok) {
        setSyncNotice('Saved & synced to cloud');
      }
    } catch {
      setSyncNotice('Saved locally');
    }
  };

  const updateCurrentEvent = (
    updater: (evt: CelebrationEvent) => CelebrationEvent
  ) => {
    setEvents((prev) =>
      prev.map((evt) => {
        if (evt.id !== currentEvent.id) return evt;
        const updated = {
          ...updater(evt),
          lastSyncedAt: new Date().toISOString(),
        };
        void syncEventToServer(updated);
        return updated;
      })
    );
  };

  // Real-time derived metrics
  const guestMetrics = useMemo(
    () => calculateGuestMetrics(currentEvent.guests),
    [currentEvent.guests]
  );

  const budgetMetrics = useMemo(
    () =>
      calculateBudgetMetrics(
        currentEvent.budgetItems,
        currentEvent.targetBudget,
        guestMetrics.confirmedHeadcount
      ),
    [
      currentEvent.budgetItems,
      currentEvent.targetBudget,
      guestMetrics.confirmedHeadcount,
    ]
  );

  const taskMetrics = useMemo(
    () => calculateTaskMetrics(currentEvent.tasks),
    [currentEvent.tasks]
  );

  const timelineMetrics = useMemo(
    () => calculateTimelineMetrics(currentEvent.schedule),
    [currentEvent.schedule]
  );

  const readiness = useMemo(
    () =>
      computeEventReadiness(
        taskMetrics,
        budgetMetrics,
        guestMetrics,
        timelineMetrics,
        currentEvent.date
      ),
    [taskMetrics, budgetMetrics, guestMetrics, timelineMetrics, currentEvent.date]
  );

  // Task Handlers
  const handleToggleTaskStatus = (taskId: string) => {
    updateCurrentEvent((evt) => ({
      ...evt,
      tasks: evt.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: t.status === 'completed' ? 'todo' : 'completed',
            }
          : t
      ),
    }));
  };

  const handleUpdateTaskStatus = (taskId: string, status: TaskStatus) => {
    updateCurrentEvent((evt) => ({
      ...evt,
      tasks: evt.tasks.map((t) => (t.id === taskId ? { ...t, status } : t)),
    }));
  };

  const handleAddTask = (newTask: Omit<EventTask, 'id'>) => {
    const created: EventTask = {
      ...newTask,
      id: `tsk-${Date.now()}`,
    };
    updateCurrentEvent((evt) => ({
      ...evt,
      tasks: [created, ...evt.tasks],
    }));
  };

  const handleDeleteTask = (taskId: string) => {
    updateCurrentEvent((evt) => ({
      ...evt,
      tasks: evt.tasks.filter((t) => t.id !== taskId),
    }));
  };

  // Budget Handlers
  const handleAddBudgetItem = (item: Omit<BudgetItem, 'id'>) => {
    const created: BudgetItem = {
      ...item,
      id: `bdg-${Date.now()}`,
    };
    updateCurrentEvent((evt) => ({
      ...evt,
      budgetItems: [...evt.budgetItems, created],
    }));
  };

  const handleUpdatePaymentStatus = (
    itemId: string,
    paymentStatus: PaymentStatus
  ) => {
    updateCurrentEvent((evt) => ({
      ...evt,
      budgetItems: evt.budgetItems.map((b) => {
        if (b.id !== itemId) return b;
        const effectiveTotal =
          b.costType === 'per-guest'
            ? b.unitActual * guestMetrics.confirmedHeadcount
            : b.unitActual;
        const paidAmount =
          paymentStatus === 'paid'
            ? effectiveTotal
            : paymentStatus === 'deposit-paid'
            ? Math.round(effectiveTotal * 0.5)
            : 0;
        return { ...b, paymentStatus, paidAmount };
      }),
    }));
  };

  const handleDeleteBudgetItem = (itemId: string) => {
    updateCurrentEvent((evt) => ({
      ...evt,
      budgetItems: evt.budgetItems.filter((b) => b.id !== itemId),
    }));
  };

  const handleUpdateTargetBudget = (newTarget: number) => {
    updateCurrentEvent((evt) => ({
      ...evt,
      targetBudget: newTarget,
    }));
  };

  // Guest Handlers
  const handleAddGuest = (guest: Omit<Guest, 'id'>) => {
    const created: Guest = {
      ...guest,
      id: `gst-${Date.now()}`,
    };
    updateCurrentEvent((evt) => ({
      ...evt,
      guests: [created, ...evt.guests],
    }));
  };

  const handleUpdateRsvp = (guestId: string, rsvpStatus: RsvpStatus) => {
    updateCurrentEvent((evt) => ({
      ...evt,
      guests: evt.guests.map((g) =>
        g.id === guestId ? { ...g, rsvpStatus } : g
      ),
    }));
  };

  const handleUpdatePlusOnes = (guestId: string, plusOnes: number) => {
    updateCurrentEvent((evt) => ({
      ...evt,
      guests: evt.guests.map((g) =>
        g.id === guestId ? { ...g, plusOnes } : g
      ),
    }));
  };

  const handleUpdateTable = (guestId: string, tableNumber: number | null) => {
    updateCurrentEvent((evt) => ({
      ...evt,
      guests: evt.guests.map((g) =>
        g.id === guestId ? { ...g, tableNumber } : g
      ),
    }));
  };

  const handleDeleteGuest = (guestId: string) => {
    updateCurrentEvent((evt) => ({
      ...evt,
      guests: evt.guests.filter((g) => g.id !== guestId),
    }));
  };

  // Timeline Handlers
  const handleAddScheduleItem = (item: Omit<ScheduleItem, 'id'>) => {
    const created: ScheduleItem = {
      ...item,
      id: `sch-${Date.now()}`,
    };
    updateCurrentEvent((evt) => ({
      ...evt,
      schedule: [...evt.schedule, created],
    }));
  };

  const handleUpdateScheduleStatus = (id: string, status: ScheduleStatus) => {
    updateCurrentEvent((evt) => ({
      ...evt,
      schedule: evt.schedule.map((s) =>
        s.id === id ? { ...s, status } : s
      ),
    }));
  };

  const handleDeleteScheduleItem = (id: string) => {
    updateCurrentEvent((evt) => ({
      ...evt,
      schedule: evt.schedule.filter((s) => s.id !== id),
    }));
  };

  // Collaboration Handlers
  const handleInviteCollaborator = (email: string, role: CollaboratorRole) => {
    const normalized = email.trim().toLowerCase();
    const newCollab: EventCollaborator = {
      id: `col-${Date.now()}`,
      email: normalized,
      role,
      invitedByEmail: currentUser?.email || currentEvent.ownerEmail,
      status: 'invited',
      addedAt: new Date().toISOString().slice(0, 10),
    };
    updateCurrentEvent((evt) => ({
      ...evt,
      collaboratorEmails: [...(evt.collaboratorEmails || []), normalized],
      collaborators: [...(evt.collaborators || []), newCollab],
    }));
    setSyncNotice(`Invited ${normalized} to co-plan "${currentEvent.name}"`);
  };

  const handleRemoveCollaborator = (email: string) => {
    const normalized = email.trim().toLowerCase();
    updateCurrentEvent((evt) => ({
      ...evt,
      collaboratorEmails: (evt.collaboratorEmails || []).filter(
        (e) => e.toLowerCase() !== normalized
      ),
      collaborators: (evt.collaborators || []).filter(
        (c) => c.email.toLowerCase() !== normalized
      ),
    }));
    setSyncNotice(`Removed collaborator ${normalized}`);
  };

  const handleUpdateEventDetails = (details: {
    name: string;
    category: string;
    date: string;
    venueName: string;
    city: string;
    targetBudget: number;
    expectedGuests: number;
  }) => {
    updateCurrentEvent((evt) => ({
      ...evt,
      ...details,
    }));
    setSyncNotice('Updated shared event details');
  };

  // Template & Theme Marketplace Handlers
  const handleSaveAsTemplate = async (template: EventTemplate) => {
    setTemplates((prev) => [template, ...prev]);
    void syncTemplateToFirestore(template);
    try {
      await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template),
      });
    } catch {
      // ignore offline
    }
    setSyncNotice(`Saved template "${template.title}"`);
  };

  const handleImportTemplateAsNewEvent = (template: EventTemplate) => {
    const now = Date.now();
    const importedEvent: CelebrationEvent = {
      id: `evt-tpl-${now}`,
      name: `${template.title.replace(/ Blueprint$/i, '')}`,
      category: template.category,
      date: '2026-12-12',
      venueName: 'Conservatory & Private Pavilion',
      city: 'San Francisco, CA',
      targetBudget: template.targetBudget,
      expectedGuests: template.expectedGuests,
      leadPlanner: currentUser?.displayName || 'Camille Laurent',
      ownerId: currentUser?.uid || 'usr-camille-laurent',
      ownerEmail: currentUser?.email || 'camille@atelier-events.io',
      collaboratorEmails: [],
      collaborators: [],
      lastSyncedAt: new Date().toISOString(),
      tasks: template.templatePayload.tasks.map((t, idx) => ({
        ...t,
        id: `tsk-${now}-${idx}`,
      })),
      budgetItems: template.templatePayload.budgetItems.map((b, idx) => ({
        ...b,
        id: `bdg-${now}-${idx}`,
      })),
      guests: [
        {
          id: `gst-${now}-1`,
          fullName: currentUser?.displayName || 'Lead Host Party',
          email: currentUser?.email || 'host@atelier-events.io',
          group: 'Host Committee',
          rsvpStatus: 'confirmed',
          plusOnes: 3,
          dietary: 'Standard',
          tableNumber: 1,
        },
      ],
      schedule: template.templatePayload.schedule.map((s, idx) => ({
        ...s,
        id: `sch-${now}-${idx}`,
      })),
    };

    setEvents((prev) => [importedEvent, ...prev]);
    setSelectedEventId(importedEvent.id);
    setActiveTab('overview');
    void syncEventToServer(importedEvent);
    setSyncNotice(`Imported "${template.title}" as new event`);
  };

  const handleApplyTemplateToCurrent = (template: EventTemplate) => {
    const now = Date.now();
    updateCurrentEvent((evt) => ({
      ...evt,
      tasks: [
        ...evt.tasks,
        ...template.templatePayload.tasks.map((t, idx) => ({
          ...t,
          id: `tsk-m-${now}-${idx}`,
        })),
      ],
      budgetItems: [
        ...evt.budgetItems,
        ...template.templatePayload.budgetItems.map((b, idx) => ({
          ...b,
          id: `bdg-m-${now}-${idx}`,
        })),
      ],
    }));
    setActiveTab('overview');
    setSyncNotice(`Merged "${template.title}" into ${currentEvent.name}`);
  };

  const handleCreateCustomTheme = async (newTheme: DashboardTheme) => {
    setThemes((prev) => [...prev, newTheme]);
    setActiveThemeId(newTheme.id);
    try {
      await fetch('/api/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTheme),
      });
    } catch {
      // ignore
    }
    setSyncNotice(`Applied custom theme "${newTheme.name}"`);
  };

  // New Event & Export / Reset
  const handleCreateEvent = (newEvt: CelebrationEvent) => {
    setEvents((prev) => [newEvt, ...prev]);
    setSelectedEventId(newEvt.id);
    setActiveTab('overview');
    void syncEventToServer(newEvt);
  };

  const handleLogOut = async () => {
    try {
      await signOutFirebase();
    } catch {
      // ignore
    }
    setCurrentUser(null);
    setSyncNotice('Logged out of workspace');
  };

  const handleExportSummary = () => {
    const exportPayload = {
      event: currentEvent.name,
      owner: currentEvent.ownerEmail,
      collaborators: currentEvent.collaboratorEmails,
      date: currentEvent.date,
      venue: `${currentEvent.venueName}, ${currentEvent.city}`,
      readinessScore: `${readiness.overallScore}% (${readiness.statusLabel})`,
      metrics: {
        tasksCompleted: `${taskMetrics.completed}/${taskMetrics.total} (${taskMetrics.completionPercent}%)`,
        confirmedHeadcount: guestMetrics.confirmedHeadcount,
        dietaryBreakdown: guestMetrics.dietaryBreakdown,
        targetBudget: budgetMetrics.targetBudget,
        committedSpend: budgetMetrics.totalActual,
        remainingMargin: budgetMetrics.remainingBudget,
        perConfirmedGuestCost: budgetMetrics.costPerConfirmedGuest,
      },
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentEvent.id}-production-brief.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSyncNotice('Exported production brief JSON');
  };

  const handleResetDemo = async () => {
    const freshEvents = structuredClone(SEED_EVENTS);
    const freshTemplates = structuredClone(SEED_TEMPLATES);
    const freshThemes = structuredClone(SEED_THEMES);
    setEvents(freshEvents);
    setTemplates(freshTemplates);
    setThemes(freshThemes);
    setActiveThemeId(freshThemes[0].id);
    setSelectedEventId(freshEvents[0].id);
    try {
      await fetch('/api/events/reset', { method: 'POST' });
    } catch {
      // ignore offline
    }
    setSyncNotice('Restored default celebration portfolio');
  };

  return (
    <div
      className="min-h-screen flex flex-col text-slate-900 transition-colors duration-200 overflow-x-hidden"
      style={{ backgroundColor: activeTheme.canvasBg }}
    >
      {/* Strict 3-Zone Top Navigation Bar Contract */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200 px-4 sm:px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-8">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#overview"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('overview');
            }}
            className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 font-display whitespace-nowrap shrink-0"
          >
            Atelier Events
          </a>

          {/* Zone 2: 5 concise single-line navigation links */}
          <nav
            aria-label="Primary Workspace Navigation"
            className="flex items-center gap-4 sm:gap-7 text-xs sm:text-sm font-medium text-slate-600 overflow-x-auto min-w-0"
          >
            {(
              [
                { id: 'overview', label: 'Overview' },
                { id: 'tasks', label: 'Tasks' },
                { id: 'budget', label: 'Budget' },
                { id: 'marketplace', label: 'Marketplace' },
                { id: 'intelligence', label: 'AI & Search' },
              ] as const
            ).map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab(item.id);
                }}
                aria-current={activeTab === item.id ? 'page' : undefined}
                className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === item.id
                    ? 'border-slate-900 text-slate-900 font-semibold'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setIsNewEventModalOpen(true)}
              style={{ backgroundColor: activeTheme.primaryAccent }}
              className="px-3 sm:px-4 py-2 text-xs font-semibold text-white rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
            >
              New Event
            </button>
          </div>
        </div>
      </header>

      {/* Workspace Context Bar (Below the Top Bar): Event Switcher, Secondary Views, Collaboration & Account Auth */}
      <div className="bg-white border-b border-slate-200/80 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Left: Event Switcher + Secondary Views (Guests, Timeline, Co-Planners) */}
          <div className="flex flex-wrap items-center gap-2.5 max-w-full">
            <label
              htmlFor="active-event-switcher"
              className="text-xs font-medium text-slate-500 whitespace-nowrap"
            >
              Event:
            </label>
            <select
              id="active-event-switcher"
              value={currentEvent.id}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="max-w-[calc(100vw-5.5rem)] sm:max-w-md truncate text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer"
            >
              {accessibleEvents.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.name} ({evt.date})
                </option>
              ))}
            </select>

            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg max-w-full">
              <button
                type="button"
                onClick={() => setActiveTab('guests')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'guests'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Guests ({guestMetrics.confirmedHeadcount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('timeline')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'timeline'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Timeline ({timelineMetrics.blocks.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('marketplace')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'marketplace'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutTemplate className="w-3.5 h-3.5" />
                Templates &amp; Themes
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('intelligence')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'intelligence'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                AI &amp; Search
              </button>
            </div>
          </div>

          {/* Right: Collaboration Invite + Account Auth Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCollabModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              Co-Planners ({(currentEvent.collaboratorEmails || []).length + 1})
            </button>

            <button
              type="button"
              onClick={handleExportSummary}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>

            <button
              type="button"
              onClick={handleResetDemo}
              aria-label="Reset demo data"
              className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>

            <div className="h-4 w-px bg-slate-200 mx-0.5 hidden sm:block" />

            {currentUser ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="text-xs text-slate-700 hover:text-slate-900 font-medium px-2 py-1 rounded hover:bg-slate-100 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <span className="font-semibold">{currentUser.displayName}</span>{' '}
                  <span className="font-mono text-slate-400 hidden xl:inline">
                    ({currentUser.email})
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleLogOut}
                  aria-label="Log out of account"
                  className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Log Out
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                Log In / Sign Up
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {!currentUser ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 max-w-xl mx-auto text-center space-y-4 my-8">
            <h1 className="text-2xl font-bold text-slate-900 font-display">
              Sign In to Your Celebration Workspace
            </h1>
            <p className="text-sm text-slate-600">
              Log in or create an account to access your private celebration plans, co-planner invitations, and custom dashboard themes.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                Log In or Sign Up
              </button>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <OverviewTab
                event={currentEvent}
                taskMetrics={taskMetrics}
                budgetMetrics={budgetMetrics}
                guestMetrics={guestMetrics}
                timelineMetrics={timelineMetrics}
                readiness={readiness}
                heroBg={activeTheme.heroBg}
                onToggleTaskStatus={handleToggleTaskStatus}
                onNavigateTab={setActiveTab}
                onUpdateTargetBudget={handleUpdateTargetBudget}
              />
            )}

            {activeTab === 'tasks' && (
              <TasksTab
                tasks={currentEvent.tasks}
                taskMetrics={taskMetrics}
                onAddTask={handleAddTask}
                onUpdateTaskStatus={handleUpdateTaskStatus}
                onDeleteTask={handleDeleteTask}
              />
            )}

            {activeTab === 'budget' && (
              <BudgetTab
                budgetMetrics={budgetMetrics}
                onAddBudgetItem={handleAddBudgetItem}
                onUpdatePaymentStatus={handleUpdatePaymentStatus}
                onDeleteBudgetItem={handleDeleteBudgetItem}
                onUpdateTargetBudget={handleUpdateTargetBudget}
              />
            )}

            {activeTab === 'guests' && (
              <GuestsTab
                guests={currentEvent.guests}
                guestMetrics={guestMetrics}
                expectedGuests={currentEvent.expectedGuests}
                perGuestCostRate={budgetMetrics.variablePerGuestRateSum}
                onAddGuest={handleAddGuest}
                onUpdateRsvp={handleUpdateRsvp}
                onUpdatePlusOnes={handleUpdatePlusOnes}
                onUpdateTable={handleUpdateTable}
                onDeleteGuest={handleDeleteGuest}
              />
            )}

            {activeTab === 'timeline' && (
              <TimelineTab
                timelineMetrics={timelineMetrics}
                onAddScheduleItem={handleAddScheduleItem}
                onUpdateScheduleStatus={handleUpdateScheduleStatus}
                onDeleteScheduleItem={handleDeleteScheduleItem}
              />
            )}

            {activeTab === 'marketplace' && (
              <MarketplaceTab
                currentEvent={currentEvent}
                currentUser={currentUser}
                templates={templates}
                themes={themes}
                activeThemeId={activeTheme.id}
                onSaveAsTemplate={handleSaveAsTemplate}
                onImportTemplateAsNewEvent={handleImportTemplateAsNewEvent}
                onApplyTemplateToCurrent={handleApplyTemplateToCurrent}
                onSelectTheme={(t) => setActiveThemeId(t.id)}
                onCreateCustomTheme={handleCreateCustomTheme}
              />
            )}

            {activeTab === 'intelligence' && (
              <IntelligenceTab
                event={currentEvent}
                onAddBudgetItem={handleAddBudgetItem}
                onAddTask={handleAddTask}
              />
            )}
          </>
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 bg-white px-6 py-4 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            Atelier Celebration &amp; Event Architecture · {syncNotice}
          </span>
          <span className="font-mono tabular-nums">
            Theme: {activeTheme.name} · Active Event: {currentEvent.name} ·
            Confirmed Guests: {guestMetrics.confirmedHeadcount}
          </span>
        </div>
      </footer>

      <NewEventModal
        isOpen={isNewEventModalOpen}
        currentUser={currentUser}
        onClose={() => setIsNewEventModalOpen(false)}
        onCreateEvent={handleCreateEvent}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        currentUser={currentUser}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthenticate={(user) => {
          setCurrentUser(user);
          setSyncNotice(`Authenticated as ${user.email}`);
        }}
      />

      <CollaboratorsModal
        isOpen={isCollabModalOpen}
        event={currentEvent}
        currentUser={currentUser}
        canEdit={canEditCurrentEvent}
        onClose={() => setIsCollabModalOpen(false)}
        onInviteCollaborator={handleInviteCollaborator}
        onRemoveCollaborator={handleRemoveCollaborator}
        onUpdateEventDetails={handleUpdateEventDetails}
      />
    </div>
  );
}
