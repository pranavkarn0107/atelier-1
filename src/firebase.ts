import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  doc,
  getDocFromServer,
  getFirestore,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
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

async function testConnection() {
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

void testConnection();

export async function signInWithGooglePopup() {
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
  const safeId = event.id.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  const path = `events/${safeId}`;
  const payload = {
    name: event.name.slice(0, 120),
    category: event.category.slice(0, 80),
    date: event.date.slice(0, 10),
    venueName: event.venueName.slice(0, 120),
    city: event.city.slice(0, 80),
    targetBudget: Math.min(
      100000000,
      Math.max(0, Number(event.targetBudget) || 0)
    ),
    expectedGuests: Math.min(
      100000,
      Math.max(1, Number(event.expectedGuests) || 1)
    ),
    leadPlanner: event.leadPlanner.slice(0, 80),
    ownerId: auth.currentUser.uid,
    ownerEmail: (auth.currentUser.email || event.ownerEmail).slice(0, 160),
    collaboratorEmails: (event.collaboratorEmails || [])
      .slice(0, 10)
      .map((e) => e.trim().toLowerCase().slice(0, 160)),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'events', safeId), payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncTemplateToFirestore(
  template: EventTemplate
): Promise<void> {
  if (!auth.currentUser || !auth.currentUser.emailVerified) {
    return;
  }
  const safeId = template.id.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  const path = `templates/${safeId}`;
  const payload = {
    title: template.title.slice(0, 120),
    description: template.description.slice(0, 400),
    category: template.category.slice(0, 80),
    visibility: template.visibility,
    targetBudget: Math.min(
      100000000,
      Math.max(0, Number(template.targetBudget) || 0)
    ),
    expectedGuests: Math.min(
      100000,
      Math.max(1, Number(template.expectedGuests) || 1)
    ),
    authorId: auth.currentUser.uid,
    authorName: template.authorName.slice(0, 80),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'templates', safeId), payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
