import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  getDocs,
  collection,
  onSnapshot,
  deleteDoc,
  query,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with specific database ID (Critical as per skill)
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

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

// MAX 5 USERS ANTI-SPAM REGISTRY LOGIC
export const MAX_ALLOWED_USERS = 5;

export interface RegisteredUserRecord {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  registeredAt: string;
}

/**
 * Validates whether the user is eligible under the 5-user capacity cap.
 * If user already exists in /registered_users, access is granted.
 * If new user and total registered < 5, they are registered and granted access.
 * If new user and total registered >= 5, throws anti-spam quota error.
 */
export async function verifyAndRegisterUserCapacity(
  user: FirebaseUser
): Promise<{ allowed: boolean; registeredCount: number; message?: string }> {
  const userDocRef = doc(db, 'registered_users', user.uid);

  try {
    const existingSnap = await getDoc(userDocRef);
    if (existingSnap.exists()) {
      // User is already registered as one of the authorized slots
      const allDocs = await getDocs(collection(db, 'registered_users'));
      return { allowed: true, registeredCount: allDocs.size };
    }

    // Check current count of registered users
    const allUsersSnap = await getDocs(collection(db, 'registered_users'));
    const currentCount = allUsersSnap.size;

    if (currentCount >= MAX_ALLOWED_USERS) {
      // Exceeded limit: Block spam
      await signOut(auth);
      return {
        allowed: false,
        registeredCount: currentCount,
        message: `System Capacity Capped (${currentCount}/${MAX_ALLOWED_USERS} slots filled). Registration is currently restricted to 5 users to protect system integrity and prevent spam.`,
      };
    }

    // Capacity available: Register this new user slot
    await setDoc(userDocRef, {
      uid: user.uid,
      email: user.email || 'unknown@google.com',
      displayName: user.displayName || 'Engineering Student',
      photoURL: user.photoURL || '',
      registeredAt: new Date().toISOString(),
    });

    // Also initialize their profile document
    await setDoc(
      doc(db, 'users', user.uid),
      {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || 'Engineering Student',
        photoURL: user.photoURL || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return { allowed: true, registeredCount: currentCount + 1 };
  } catch (error) {
    console.error('Error verifying user capacity:', error);
    // If permission or network issue, bubble context
    return {
      allowed: false,
      registeredCount: 0,
      message: error instanceof Error ? error.message : 'Capacity verification failed',
    };
  }
}

/**
 * Sign in using official Google OAuth popup
 */
export async function signInWithGoogleOAuth(): Promise<{
  success: boolean;
  user?: FirebaseUser;
  error?: string;
  slotsRemaining?: number;
}> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Verify 5-user capacity & spam prevention
    const capacityCheck = await verifyAndRegisterUserCapacity(user);
    if (!capacityCheck.allowed) {
      return {
        success: false,
        error: capacityCheck.message,
        slotsRemaining: Math.max(0, MAX_ALLOWED_USERS - capacityCheck.registeredCount),
      };
    }

    return {
      success: true,
      user,
      slotsRemaining: Math.max(0, MAX_ALLOWED_USERS - capacityCheck.registeredCount),
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
