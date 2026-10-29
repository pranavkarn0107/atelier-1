export type TaskPhase =
  | 'Pre-Event'
  | 'Venue & Catering'
  | 'Guest Experience'
  | 'Day-Of Execution';

export type TaskStatus = 'todo' | 'in-progress' | 'completed';
export type TaskPriority = 'high' | 'medium' | 'low';

export interface EventTask {
  id: string;
  title: string;
  phase: TaskPhase;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string; // YYYY-MM-DD
  assignee: string;
  notes?: string;
}

export type BudgetCategory =
  | 'Venue & Rentals'
  | 'Catering & Beverage'
  | 'Floral & Production'
  | 'Entertainment & AV'
  | 'Attire & Stationery'
  | 'Logistics & Staffing';

export type CostType = 'fixed' | 'per-guest';
export type PaymentStatus = 'planned' | 'deposit-paid' | 'paid';

export interface BudgetItem {
  id: string;
  title: string;
  vendor: string;
  category: BudgetCategory;
  costType: CostType;
  unitEstimated: number;
  unitActual: number;
  paidAmount: number;
  paymentStatus: PaymentStatus;
}

export type RsvpStatus = 'confirmed' | 'pending' | 'declined';
export type DietaryRestriction =
  | 'Standard'
  | 'Vegetarian'
  | 'Vegan'
  | 'Gluten-Free';

export interface Guest {
  id: string;
  fullName: string;
  email: string;
  group: string;
  rsvpStatus: RsvpStatus;
  plusOnes: number;
  dietary: DietaryRestriction;
  tableNumber: number | null;
}

export type ScheduleStatus = 'scheduled' | 'ready' | 'completed';

export interface ScheduleItem {
  id: string;
  startTime: string; // HH:MM (24h)
  endTime: string;   // HH:MM (24h)
  title: string;
  location: string;
  leadContact: string;
  status: ScheduleStatus;
  notes?: string;
}

export type CollaboratorRole = 'co-planner' | 'viewer';

export interface EventCollaborator {
  id: string;
  email: string;
  role: CollaboratorRole;
  invitedByEmail: string;
  status: 'invited' | 'active';
  addedAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  authProvider: 'google' | 'account';
}

export interface CelebrationEvent {
  id: string;
  name: string;
  category: string;
  date: string; // YYYY-MM-DD
  venueName: string;
  city: string;
  targetBudget: number;
  expectedGuests: number;
  leadPlanner: string;
  ownerId: string;
  ownerEmail: string;
  collaboratorEmails: string[];
  collaborators: EventCollaborator[];
  lastSyncedAt: string;
  tasks: EventTask[];
  budgetItems: BudgetItem[];
  guests: Guest[];
  schedule: ScheduleItem[];
}

export interface EventTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  visibility: 'public' | 'private';
  authorId: string;
  authorName: string;
  authorEmail: string;
  targetBudget: number;
  expectedGuests: number;
  createdAt: string;
  templatePayload: {
    tasks: Omit<EventTask, 'id'>[];
    budgetItems: Omit<BudgetItem, 'id'>[];
    schedule: Omit<ScheduleItem, 'id'>[];
  };
}

export interface DashboardTheme {
  id: string;
  name: string;
  description: string;
  isCustom?: boolean;
  authorEmail?: string;
  canvasBg: string;
  surfaceBg: string;
  primaryAccent: string;
  heroBg: string;
  borderHex: string;
}

export interface VendorRecommendation {
  id: string;
  category: 'Venue' | 'Caterer' | 'Photographer' | 'Decoration' | 'Entertainment';
  name: string;
  specialty: string;
  estimatedCost: number;
  costType: CostType;
  rationale: string;
  location: string;
  rating: string;
  sourceLabel?: string;
}

export interface GroundingCitation {
  title: string;
  uri: string;
}

export interface SearchAgentMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: GroundingCitation[];
  timestamp: string;
  mode?: 'discussion' | 'fact-check' | 'news';
}

export type ToastVariant = 'significant' | 'success' | 'warning' | 'info';

export type BudgetToastAction =
  | 'created'
  | 'updated'
  | 'payment-updated'
  | 'target-updated';

export interface ToastNotification {
  id: string;
  title: string;
  message: string;
  variant: ToastVariant;
  isSignificant: boolean;
  effectiveAmount: number;
  category: BudgetCategory;
  action: BudgetToastAction;
  persistedAt: string;
  persistenceChannel: string;
}

