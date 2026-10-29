import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  UserCredential,
} from 'firebase/auth';
import {
  doc,
  getDocFromServer,
  getFirestore,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import {
  BUDGET_TIERS,
  GUEST_LIMITS,
  VALIDATION_LIMITS,
} from './constants';
import { CelebrationEvent, EventTemplate } from './types/event';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

/**
 * Formats and throws a structured JSON error payload when a Firestore security rule or operation fails.
 */
export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection().catch((): void => {
  // Handled inside testConnection
});

/**
 * Authenticates the user with Google OAuth via a Firebase popup window.
 */
export async function signInWithGooglePopup(): Promise<UserCredential> {
  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unable to complete Google sign-in in this browser context.';
    throw new Error(message);
  }
}

/**
 * Signs out the active Firebase Authentication user session.
 */
export async function signOutFirebase(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unable to sign out of Firebase session.';
    throw new Error(message);
  }
}

/**
 * Persists an Event document to Firestore when a verified Firebase Auth user is active,
 * strictly enforcing the volumetric and schema constraints in firebase-blueprint.json.
 */
export async function syncEventToFirestore(
  event: CelebrationEvent
): Promise<void> {
  if (!auth.currentUser || !auth.currentUser.emailVerified) {
    return;
  }
  const safeId = event.id
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, VALIDATION_LIMITS.MAX_FIRESTORE_ID_LENGTH);
  const path = `events/${safeId}`;
  const payload = {
    name: event.name.slice(0, VALIDATION_LIMITS.MAX_TITLE_LENGTH),
    category: event.category.slice(0, VALIDATION_LIMITS.MAX_CATEGORY_LENGTH),
    date: event.date.slice(0, 10),
    venueName: event.venueName.slice(0, VALIDATION_LIMITS.MAX_VENUE_LENGTH),
    city: event.city.slice(0, VALIDATION_LIMITS.MAX_CATEGORY_LENGTH),
    targetBudget: Math.min(
      BUDGET_TIERS.MAX_EVENT_BUDGET,
      Math.max(BUDGET_TIERS.MIN_BUDGET, Number(event.targetBudget) || 0)
    ),
    expectedGuests: Math.min(
      GUEST_LIMITS.MAX_EXPECTED_GUESTS,
      Math.max(
        GUEST_LIMITS.MIN_EXPECTED_GUESTS,
        Number(event.expectedGuests) || GUEST_LIMITS.MIN_EXPECTED_GUESTS
      )
    ),
    leadPlanner: event.leadPlanner.slice(
      0,
      VALIDATION_LIMITS.MAX_ASSIGNEE_LENGTH
    ),
    ownerId: auth.currentUser.uid,
    ownerEmail: (auth.currentUser.email || event.ownerEmail).slice(
      0,
      VALIDATION_LIMITS.MAX_EMAIL_LENGTH
    ),
    collaboratorEmails: (event.collaboratorEmails || [])
      .slice(0, GUEST_LIMITS.MAX_COLLABORATORS)
      .map((e): string =>
        e.trim().toLowerCase().slice(0, VALIDATION_LIMITS.MAX_EMAIL_LENGTH)
      ),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'events', safeId), payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Persists a reusable EventTemplate blueprint to Firestore when a verified Firebase Auth user is active.
 */
export async function syncTemplateToFirestore(
  template: EventTemplate
): Promise<void> {
  if (!auth.currentUser || !auth.currentUser.emailVerified) {
    return;
  }
  const safeId = template.id
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, VALIDATION_LIMITS.MAX_FIRESTORE_ID_LENGTH);
  const path = `templates/${safeId}`;
  const payload = {
    title: template.title.slice(0, VALIDATION_LIMITS.MAX_TITLE_LENGTH),
    description: template.description.slice(
      0,
      VALIDATION_LIMITS.MAX_DESCRIPTION_LENGTH
    ),
    category: template.category.slice(0, VALIDATION_LIMITS.MAX_CATEGORY_LENGTH),
    visibility: template.visibility,
    targetBudget: Math.min(
      BUDGET_TIERS.MAX_EVENT_BUDGET,
      Math.max(BUDGET_TIERS.MIN_BUDGET, Number(template.targetBudget) || 0)
    ),
    expectedGuests: Math.min(
      GUEST_LIMITS.MAX_EXPECTED_GUESTS,
      Math.max(
        GUEST_LIMITS.MIN_EXPECTED_GUESTS,
        Number(template.expectedGuests) || GUEST_LIMITS.MIN_EXPECTED_GUESTS
      )
    ),
    authorId: auth.currentUser.uid,
    authorName: template.authorName.slice(
      0,
      VALIDATION_LIMITS.MAX_ASSIGNEE_LENGTH
    ),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'templates', safeId), payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
