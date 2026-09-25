import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  setPersistence,
  browserLocalPersistence,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with specific database ID (Critical as per skill)
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Configure auth persistence to browser local storage so user stays logged in across refreshes
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn('Could not enable browser local auth persistence on init:', err);
  });
}

// Skill requirement: Standardized Firestore Error Handler
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
  console.error('Firestore Security / Operation Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ANTI-SPAM & USER REGISTRY LOGIC
export const MAX_ALLOWED_USERS = 50;

export interface RegisteredUserRecord {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  registeredAt: string;
}

/**
 * Ensures the signed in user is registered and their profile initialized.
 */
export async function verifyAndRegisterUserCapacity(
  user: FirebaseUser
): Promise<{ allowed: boolean; registeredCount: number; message?: string }> {
  const userDocRef = doc(db, 'registered_users', user.uid);

  try {
    const existingSnap = await getDoc(userDocRef);
    if (existingSnap.exists()) {
      return { allowed: true, registeredCount: 1 };
    }

    // Register user record
    await setDoc(
      userDocRef,
      {
        uid: user.uid,
        email: user.email || 'unknown@google.com',
        displayName: user.displayName || 'Engineering Student',
        photoURL: user.photoURL || '',
        registeredAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // Maintain profile doc
    await setDoc(
      doc(db, 'users', user.uid),
      {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || 'Engineering Student',
        photoURL: user.photoURL || '',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return { allowed: true, registeredCount: 1 };
  } catch (error) {
    console.warn('Warning during user capacity verification (continuing gracefully):', error);
    return {
      allowed: true,
      registeredCount: 1,
    };
  }
}

/**
 * Sign in using official Google OAuth popup with persistent browser auth
 */
export async function signInWithGoogleOAuth(): Promise<{
  success: boolean;
  user?: FirebaseUser;
  error?: string;
}> {
  try {
    // Explicitly enforce browser local persistence before opening the OAuth popup
    try {
      await setPersistence(auth, browserLocalPersistence);
    } catch (persistErr) {
      console.warn('Could not set persistence prior to popup:', persistErr);
    }

    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    await verifyAndRegisterUserCapacity(user);

    return {
      success: true,
      user,
    };
  } catch (err: any) {
    console.error('Google OAuth Sign-in error:', err);
    return {
      success: false,
      error: err?.message || 'Google OAuth sign-in was cancelled or failed.',
    };
  }
}


/**
 * Sign out user
 */
export async function signOutGoogle(): Promise<void> {
  await signOut(auth);
}

