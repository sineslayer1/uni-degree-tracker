import { create } from 'zustand';
import { Unit, MicroTask, Assessment } from '../types/dashboard';
import { ParsedIcsEvent } from '../lib/ics-parser';
import {
  auth,
  db,
  signInWithGoogleOAuth,
  signOutGoogle,
  verifyAndRegisterUserCapacity,
  MAX_ALLOWED_USERS,
} from '../lib/firebase';
import {
  loadUserUnitsFromFirestore,
  loadUserTasksFromFirestore,
  saveUnitToFirestore,
  updateAssessmentMarkInFirestore,
  toggleCompetencyInFirestore,
  updateHypotheticalMarkInFirestore,
  updateHypotheticalCompetencyInFirestore,
  deleteUnitFromFirestore,
  saveTaskToFirestore,
  toggleTaskInFirestore,
  deleteTaskFromFirestore,
} from '../lib/firestore-sync';
import { loadLocalState, saveLocalState, clearLocalState } from '../lib/storage';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface DashboardState {
  units: Unit[];
  tasks: MicroTask[];
  isWhatIfMode: boolean;
  metricView: 'WAM' | 'SAM';
  userEmail: string;
  studentId: string;
  displayName: string;
  degreeName: string;
  targetWam: number;
  photoURL: string;
  userId: string | null;
  isAuthenticated: boolean;
  isOnboarded: boolean;
  isAuthLoading: boolean;
  isDataLoading: boolean;
  syncStatus: 'saved' | 'saving' | 'synced';
  canvasIcsUrl: string;
  maxUsers: number;
  activeUsersCount: number;
  authError: string | null;

  // Actions
  initAuthListener: () => () => void;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  loginDirect: (email: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  setOnboardingData: (data: {
    preferredName: string;
    degreeName: string;
    targetWam: number;
    units: Unit[];
  }) => Promise<void>;
  updateAcademicProfile: (data: {
    degreeName?: string;
    targetWam?: number;
    preferredName?: string;
  }) => Promise<void>;
  resetToStockUnits: () => void;
  toggleWhatIfMode: () => void;
  setMetricView: (view: 'WAM' | 'SAM') => void;
  updateAssessmentMark: (unitId: string, assessmentId: string, mark: number | null) => Promise<void>;
  toggleCompetencyPassed: (unitId: string, assessmentId: string) => Promise<void>;
  toggleHypotheticalCompetency: (unitId: string, assessmentId: string) => Promise<void>;
  updateHypotheticalMark: (unitId: string, assessmentId: string, mark: number | null) => Promise<void>;
  addUnit: (unit: Unit) => Promise<void>;
  updateUnit: (unit: Unit) => Promise<void>;
  deleteUnit: (unitId: string) => Promise<void>;
  addAssessment: (unitId: string, assessment: Assessment) => Promise<void>;
  deleteAssessment: (unitId: string, assessmentId: string) => Promise<void>;
  addTask: (task: Omit<MicroTask, 'id'>) => Promise<void>;
  toggleTask: (taskId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  resetWhatIfMarks: () => void;
  setCanvasIcsUrl: (url: string) => void;
  importCanvasEvents: (events: ParsedIcsEvent[]) => Promise<void>;
}

const DEFAULT_SAMPLE_UNITS: Unit[] = [
  {
    id: 'unit-info1110',
    code: 'INFO1110',
    name: 'Introduction to Programming',
    creditPoints: 6,
    level: 1000,
    semester: 'Semester 1, 2026',
    year: 2026,
    gradingScheme: 'foundation_plus_advanced',
    assessments: [
      {
        id: 'info-f1',
        unitId: 'unit-info1110',
        title: 'Foundation Programming Test',
        weight: 0,
        mark: null,
        isHurdle: true,
        hurdleMinMark: 100,
        hurdleDescription: 'Pass required to unlock the 50 P baseline mark',
        completed: true,
        dueDate: 'Week 5',
        kind: 'foundation_requirement',
        isCompetencyPassed: true,
        hypotheticalCompetency: true,
      },
      {
        id: 'info-f2',
        unitId: 'unit-info1110',
        title: 'Foundation Assignment (Core Python)',
        weight: 0,
        mark: null,
        isHurdle: true,
        hurdleMinMark: 100,
        hurdleDescription: 'Pass required to unlock the 50 P baseline mark',
        completed: false,
        dueDate: 'Week 8',
        kind: 'foundation_requirement',
        isCompetencyPassed: false,
        hypotheticalCompetency: true,
      },
      {
        id: 'info-adv1',
        unitId: 'unit-info1110',
        title: 'Advanced Assignment (Algorithms & Structs)',
        weight: 25,
        mark: null,
        isHurdle: false,
        hurdleMinMark: 0,
        hurdleDescription: 'Adds up to +25 points on top of the 50 P baseline',
        completed: false,
        dueDate: 'Week 11',
        kind: 'advanced_extension',
        hypotheticalMark: 84,
      },
      {
        id: 'info-adv2',
        unitId: 'unit-info1110',
        title: 'Advanced Final Exam (Problem Solving)',
        weight: 25,
        mark: null,
        isHurdle: false,
        hurdleMinMark: 0,
        hurdleDescription: 'Adds up to +25 points on top of the 50 P baseline',
        completed: false,
        dueDate: 'Exam Period',
        kind: 'advanced_extension',
        hypotheticalMark: 76,
      },
    ],
  },
  {
    id: 'unit-elec1601',
    code: 'ELEC1601',
    name: 'Foundations of Computer Systems',
    creditPoints: 6,
    level: 1000,
    semester: 'Semester 1, 2026',
    year: 2026,
    gradingScheme: 'standard',
    assessments: [
      {
        id: 'elec-a1',
        unitId: 'unit-elec1601',
        title: 'Weekly AVR Assembly & C Quizzes',
        weight: 15,
        mark: 94,
        isHurdle: false,
        hurdleMinMark: 0,
        completed: true,
        dueDate: 'Weekly',
        kind: 'standard',
      },
      {
        id: 'elec-c1',
        unitId: 'unit-elec1601',
        title: 'Hardware Lab Safety & Breadboard Competency',
        weight: 0,
        mark: null,
        isHurdle: true,
        hurdleMinMark: 100,
        hurdleDescription: 'No numerical grade: Mandatory laboratory competency required to get a P',
        completed: true,
        dueDate: 'Week 4',
        kind: 'competency_hurdle',
        isCompetencyPassed: true,
        hypotheticalCompetency: true,
      },
      {
        id: 'elec-a2',
        unitId: 'unit-elec1601',
        title: 'Autonomous Micro-Bug Project',
        weight: 35,
        mark: 90,
        isHurdle: false,
        hurdleMinMark: 0,
        completed: true,
        dueDate: '02 May 2026',
        kind: 'standard',
      },
      {
        id: 'elec-a3',
        unitId: 'unit-elec1601',
        title: 'Final Exam (Double-Pass Hurdle)',
        weight: 50,
        mark: null,
        isHurdle: true,
        hurdleMinMark: 45,
        hurdleDescription: 'Must achieve ≥ 45% in final exam to pass ELEC1601',
        completed: false,
        dueDate: '19 Jun 2026',
        kind: 'standard',
        hypotheticalMark: 78,
      },
    ],
  },
  {
    id: 'unit-amme3500',
    code: 'AMME3500',
    name: 'System Dynamics and Control',
    creditPoints: 6,
    level: 3000,
    semester: 'Semester 1, 2026',
    year: 2026,
    gradingScheme: 'standard',
    assessments: [
      {
        id: 'amme-a1',
        unitId: 'unit-amme3500',
        title: 'Lab 1: State Space Modeling & Root Locus',
        weight: 15,
        mark: 85,
        isHurdle: false,
        hurdleMinMark: 0,
        completed: true,
        dueDate: '18 Mar 2026',
        kind: 'standard',
      },
      {
        id: 'amme-a2',
        unitId: 'unit-amme3500',
        title: 'Mid-Semester Written Test',
        weight: 25,
        mark: 74,
        isHurdle: false,
        hurdleMinMark: 0,
        completed: true,
        dueDate: '12 Apr 2026',
        kind: 'standard',
      },
      {
        id: 'amme-a3',
        unitId: 'unit-amme3500',
        title: 'Inverted Pendulum Controller Project',
        weight: 20,
        mark: null,
        isHurdle: false,
        hurdleMinMark: 0,
        completed: false,
        dueDate: '14 May 2026',
        kind: 'standard',
        hypotheticalMark: 82,
      },
      {
        id: 'amme-a4',
        unitId: 'unit-amme3500',
        title: 'Final Examination (Double-Pass Hurdle)',
        weight: 40,
        mark: null,
        isHurdle: true,
        hurdleMinMark: 45,
        hurdleDescription: 'Double-Pass Hurdle: Must achieve ≥ 45% in final exam to pass AMME3500',
        completed: false,
        dueDate: '16 Jun 2026',
        kind: 'standard',
        hypotheticalMark: 76,
      },
    ],
  },
];

const DEFAULT_SAMPLE_TASKS: MicroTask[] = [
  {
    id: 'task-1',
    unitCode: 'INFO1110',
    title: 'Complete Foundation Practice Environment setup in Ed Workspace',
    dueDate: 'Tomorrow',
    completed: true,
    tag: 'lab',
  },
  {
    id: 'task-2',
    unitCode: 'ELEC1601',
    title: 'Review breadboard wiring layout for competency check-off',
    dueDate: 'In 2 days',
    completed: false,
    tag: 'lab',
  },
  {
    id: 'task-3',
    unitCode: 'AMME3500',
    title: 'Compile 1-page formula sheet for upcoming final exam',
    dueDate: '20 May 2026',
    completed: false,
    tag: 'reading',
  },
];

const cached = typeof window !== 'undefined' ? loadLocalState() : null;

export const useDashboardStore = create<DashboardState>((set, get) => ({
  units: cached?.units && Array.isArray(cached.units) ? cached.units : [],
  tasks: cached?.tasks && Array.isArray(cached.tasks) ? cached.tasks : [],
  isWhatIfMode: cached?.isWhatIfMode ?? true,
  metricView: cached?.metricView === 'SAM' ? 'SAM' : 'WAM',
  userEmail: '',
  studentId: '',
  displayName: cached?.displayName || '',
  degreeName: cached?.degreeName || '',
  targetWam: cached?.targetWam || 75,
  photoURL: '',
  userId: null,
  isAuthenticated: false,
  isOnboarded: Boolean(cached?.isOnboarded && cached?.degreeName),
  isAuthLoading: true,
  isDataLoading: false,
  syncStatus: 'saved',
  canvasIcsUrl: '',
  maxUsers: MAX_ALLOWED_USERS,
  activeUsersCount: 1,
  authError: null,

  initAuthListener: () => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        const local = loadLocalState(get().userId);
        if (local) {
          set({
            units: local.units || [],
            tasks: local.tasks || [],
            metricView: local.metricView || 'HWAM',
            isWhatIfMode: local.isWhatIfMode ?? true,
            displayName: local.displayName || '',
            degreeName: local.degreeName || '',
            targetWam: local.targetWam || 75,
            isOnboarded: Boolean(local.isOnboarded && local.degreeName),
            isAuthLoading: false,
          });
        } else {
          set({ isAuthLoading: false });
        }
        return;
      }

      set({ isDataLoading: true, syncStatus: 'saving', isAuthLoading: false });

      const email = firebaseUser.email || '';
      const uid = firebaseUser.uid;
      const name = firebaseUser.displayName || email.split('@')[0] || '';

      set({
        isAuthenticated: true,
        userId: uid,
        userEmail: email,
        displayName: get().displayName || name,
        photoURL: firebaseUser.photoURL || '',
        studentId: email.split('@')[0],
      });

      try {
        // Query Firestore for user profile
        const userProfileSnap = await getDoc(doc(db, 'users', uid));
        let userDegree = get().degreeName;
        let userTargetWam = get().targetWam;
        let userIsOnboarded = get().isOnboarded;
        let userName = get().displayName || name;

        if (userProfileSnap.exists()) {
          const profileData = userProfileSnap.data();
          if (profileData.degreeName) userDegree = profileData.degreeName;
          if (profileData.targetWam) userTargetWam = profileData.targetWam;
          if (profileData.displayName) userName = profileData.displayName;
          if (typeof profileData.isOnboarded === 'boolean') {
            userIsOnboarded = profileData.isOnboarded;
          }
        }

        // Query Firestore for user's units
        let userUnits = await loadUserUnitsFromFirestore(uid);
        let userTasks = await loadUserTasksFromFirestore(uid);

        set({
          units: userUnits,
          tasks: userTasks,
          displayName: userName,
          degreeName: userDegree,
          targetWam: userTargetWam,
          isOnboarded: Boolean(userIsOnboarded && userDegree),
          isDataLoading: false,
          syncStatus: 'synced',
        });

        saveLocalState(uid, userUnits, userTasks, get().metricView, get().isWhatIfMode, {
          displayName: userName,
          degreeName: userDegree,
          targetWam: userTargetWam,
          isOnboarded: Boolean(userIsOnboarded && userDegree),
        });
      } catch (err) {
        console.error('Error syncing with Firestore:', err);
        set({ isDataLoading: false, syncStatus: 'saved' });
      }
    });

    return unsubscribe;
  },

  loginWithGoogle: async () => {
    set({ isAuthLoading: true, authError: null, syncStatus: 'saving' });
    const res = await signInWithGoogleOAuth();
    if (!res.success) {
      set({ isAuthLoading: false, authError: res.error || 'Login failed' });
      return { success: false, error: res.error };
    }
    set({ isAuthLoading: false, isAuthenticated: true });
    return { success: true };
  },

  loginDirect: async (email: string, displayName?: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const uid = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
    const name = displayName || cleanEmail.split('@')[0];

    const local = loadLocalState(uid);
    const unitsToLoad = local?.units && local.units.length > 0 ? local.units : [];
    const tasksToLoad = local?.tasks && local.tasks.length > 0 ? local.tasks : get().tasks;
    const onboardedStatus = Boolean(local?.isOnboarded);

    set({
      isAuthenticated: true,
      userId: uid,
      userEmail: cleanEmail,
      studentId: cleanEmail.split('@')[0],
      displayName: name,
      degreeName: local?.degreeName || get().degreeName,
      targetWam: local?.targetWam || get().targetWam,
      isOnboarded: onboardedStatus,
      units: unitsToLoad,
      tasks: tasksToLoad,
      authError: null,
      syncStatus: 'saved',
    });

    saveLocalState(uid, unitsToLoad, tasksToLoad, get().metricView, get().isWhatIfMode, {
      displayName: name,
      degreeName: local?.degreeName || get().degreeName,
      targetWam: local?.targetWam || get().targetWam,
      isOnboarded: onboardedStatus,
    });
  },

  setOnboardingData: async ({ preferredName, degreeName, targetWam, units }) => {
    const { userId, tasks, metricView, isWhatIfMode } = get();

    set({
      displayName: preferredName,
      degreeName,
      targetWam,
      units,
      isOnboarded: true,
      syncStatus: 'saving',
    });

    saveLocalState(userId, units, tasks, metricView, isWhatIfMode, {
      displayName: preferredName,
      degreeName,
      targetWam,
      isOnboarded: true,
    });

    if (userId) {
      try {
        await setDoc(
          doc(db, 'users', userId),
          {
            displayName: preferredName,
            degreeName,
            targetWam,
            isOnboarded: true,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );

        for (const u of units) {
          await saveUnitToFirestore(userId, u);
        }
        set({ syncStatus: 'synced' });
      } catch (err) {
        console.error('Error saving onboarding data to Firestore:', err);
        set({ syncStatus: 'saved' });
      }
    } else {
      set({ syncStatus: 'saved' });
    }
  },

  updateAcademicProfile: async ({ degreeName, targetWam, preferredName }) => {
    const { userId, units, tasks, metricView, isWhatIfMode } = get();

    const newDegree = degreeName ?? get().degreeName;
    const newTarget = targetWam ?? get().targetWam;
    const newName = preferredName ?? get().displayName;

    set({
      degreeName: newDegree,
      targetWam: newTarget,
      displayName: newName,
      syncStatus: 'saving',
    });

    saveLocalState(userId, units, tasks, metricView, isWhatIfMode, {
      displayName: newName,
      degreeName: newDegree,
      targetWam: newTarget,
      isOnboarded: true,
    });

    if (userId) {
      try {
        await setDoc(
          doc(db, 'users', userId),
          {
            displayName: newName,
            degreeName: newDegree,
            targetWam: newTarget,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        set({ syncStatus: 'synced' });
      } catch {
        set({ syncStatus: 'saved' });
      }
    } else {
      set({ syncStatus: 'saved' });
    }
  },

  logout: async () => {
    try {
      await signOutGoogle();
    } catch (e) {
      console.warn('SignOutGoogle caught:', e);
    }
    set({
      isAuthenticated: false,
      userId: null,
      authError: null,
    });
  },

  resetToStockUnits: () => {
    const { userId, metricView, isWhatIfMode, degreeName, targetWam, displayName } = get();
    set({
      units: DEFAULT_SAMPLE_UNITS,
      tasks: DEFAULT_SAMPLE_TASKS,
      syncStatus: 'saved',
    });
    saveLocalState(userId, DEFAULT_SAMPLE_UNITS, DEFAULT_SAMPLE_TASKS, metricView, isWhatIfMode, {
      degreeName,
      targetWam,
      displayName,
      isOnboarded: true,
    });
    if (userId) {
      for (const u of DEFAULT_SAMPLE_UNITS) {
        saveUnitToFirestore(userId, u);
      }
    }
  },

  toggleWhatIfMode: () => {
    set((state) => {
      const nextMode = !state.isWhatIfMode;
      saveLocalState(state.userId, state.units, state.tasks, state.metricView, nextMode);
      return { isWhatIfMode: nextMode };
    });
  },

  setMetricView: (metricView) => {
    set((state) => {
      saveLocalState(state.userId, state.units, state.tasks, metricView, state.isWhatIfMode);
      return { metricView };
    });
  },

  updateAssessmentMark: async (unitId, assessmentId, mark) => {
    const { userId, metricView, isWhatIfMode } = get();

    const newUnits = get().units.map((unit) => {
      if (unit.id !== unitId) return unit;
      return {
        ...unit,
        assessments: unit.assessments.map((a) => {
          if (a.id !== assessmentId) return a;
          return {
            ...a,
            mark,
            completed: mark !== null && !isNaN(mark),
          };
        }),
      };
    });

    set({ units: newUnits, syncStatus: 'saving' });
    saveLocalState(userId, newUnits, get().tasks, metricView, isWhatIfMode);

    if (userId) {
      try {
        await updateAssessmentMarkInFirestore(userId, unitId, assessmentId, mark);
        set({ syncStatus: 'synced' });
      } catch (err) {
        console.error('Firestore save failed, preserved locally:', err);
        set({ syncStatus: 'saved' });
      }
    } else {
      set({ syncStatus: 'saved' });
    }
  },

  toggleCompetencyPassed: async (unitId, assessmentId) => {
    const { userId, metricView, isWhatIfMode } = get();
    let newStatus = false;

    const newUnits = get().units.map((unit) => {
      if (unit.id !== unitId) return unit;
      return {
        ...unit,
        assessments: unit.assessments.map((a) => {
          if (a.id !== assessmentId) return a;
          newStatus = !a.isCompetencyPassed;
          return {
            ...a,
            isCompetencyPassed: newStatus,
            completed: newStatus,
          };
        }),
      };
    });

    set({ units: newUnits, syncStatus: 'saving' });
    saveLocalState(userId, newUnits, get().tasks, metricView, isWhatIfMode);

    if (userId) {
      try {
        await toggleCompetencyInFirestore(userId, unitId, assessmentId, newStatus);
        set({ syncStatus: 'synced' });
      } catch {
        set({ syncStatus: 'saved' });
      }
    } else {
      set({ syncStatus: 'saved' });
    }
  },

  toggleHypotheticalCompetency: async (unitId, assessmentId) => {
    const { userId, metricView, isWhatIfMode } = get();
    let newStatus: boolean | null = null;

    const newUnits = get().units.map((unit) => {
      if (unit.id !== unitId) return unit;
      return {
        ...unit,
        assessments: unit.assessments.map((a) => {
          if (a.id !== assessmentId) return a;
          newStatus = !(a.hypotheticalCompetency ?? a.isCompetencyPassed);
          return {
            ...a,
            hypotheticalCompetency: newStatus,
          };
        }),
      };
    });

    set({ units: newUnits, syncStatus: 'saving' });
    saveLocalState(userId, newUnits, get().tasks, metricView, isWhatIfMode);

    if (userId && newStatus !== null) {
      try {
        await updateHypotheticalCompetencyInFirestore(userId, unitId, assessmentId, newStatus);
        set({ syncStatus: 'synced' });
      } catch {
        set({ syncStatus: 'saved' });
      }
    } else {
      set({ syncStatus: 'saved' });
    }
  },

  updateHypotheticalMark: async (unitId, assessmentId, mark) => {
    const { userId, metricView, isWhatIfMode } = get();

    const newUnits = get().units.map((unit) => {
      if (unit.id !== unitId) return unit;
      return {
        ...unit,
        assessments: unit.assessments.map((a) => {
          if (a.id !== assessmentId) return a;
          return {
            ...a,
            hypotheticalMark: mark,
          };
        }),
      };
    });

    set({ units: newUnits, syncStatus: 'saving' });
    saveLocalState(userId, newUnits, get().tasks, metricView, isWhatIfMode);

    if (userId) {
      try {
        await updateHypotheticalMarkInFirestore(userId, unitId, assessmentId, mark);
        set({ syncStatus: 'synced' });
      } catch {
        set({ syncStatus: 'saved' });
      }
    } else {
      set({ syncStatus: 'saved' });
    }
  },

  addUnit: async (unit) => {
    const { userId, metricView, isWhatIfMode } = get();
    const newUnits = [unit, ...get().units];

    set({ units: newUnits, syncStatus: 'saving' });
    saveLocalState(userId, newUnits, get().tasks, metricView, isWhatIfMode);

    if (userId) {
      try {
        await saveUnitToFirestore(userId, unit);
        set({ syncStatus: 'synced' });
      } catch {
        set({ syncStatus: 'saved' });
      }
    } else {
      set({ syncStatus: 'saved' });
    }
  },

  updateUnit: async (updatedUnit) => {
    const { userId, metricView, isWhatIfMode } = get();
    const newUnits = get().units.map((u) => (u.id === updatedUnit.id ? updatedUnit : u));

    set({ units: newUnits, syncStatus: 'saving' });
    saveLocalState(userId, newUnits, get().tasks, metricView, isWhatIfMode);

    if (userId) {
      try {
        await saveUnitToFirestore(userId, updatedUnit);
        set({ syncStatus: 'synced' });
      } catch {
        set({ syncStatus: 'saved' });
      }
    } else {
      set({ syncStatus: 'saved' });
    }
  },

  deleteUnit: async (unitId) => {
    const { userId, metricView, isWhatIfMode } = get();
    const newUnits = get().units.filter((u) => u.id !== unitId);

    set({ units: newUnits, syncStatus: 'saving' });
    saveLocalState(userId, newUnits, get().tasks, metricView, isWhatIfMode);

    if (userId) {
      try {
        await deleteUnitFromFirestore(userId, unitId);
        set({ syncStatus: 'synced' });
      } catch {
        set({ syncStatus: 'saved' });
      }
    } else {
      set({ syncStatus: 'saved' });
    }
  },

  addAssessment: async (unitId, assessment) => {
    const { userId, metricView, isWhatIfMode } = get();
    const target = get().units.find((u) => u.id === unitId);
    if (!target) return;

    const newUnit = {
      ...target,
      assessments: [...target.assessments, assessment],
    };

    const newUnits = get().units.map((u) => (u.id === unitId ? newUnit : u));
    set({ units: newUnits, syncStatus: 'saving' });
    saveLocalState(userId, newUnits, get().tasks, metricView, isWhatIfMode);

    if (userId) {
      try {
        await saveUnitToFirestore(userId, newUnit);
        set({ syncStatus: 'synced' });
      } catch {
        set({ syncStatus: 'saved' });
      }
    } else {
      set({ syncStatus: 'saved' });
    }
  },

  deleteAssessment: async (unitId, assessmentId) => {
    const { userId, metricView, isWhatIfMode } = get();
    const target = get().units.find((u) => u.id === unitId);
    if (!target) return;

    const newUnit = {
      ...target,
      assessments: target.assessments.filter((a) => a.id !== assessmentId),
    };

    const newUnits = get().units.map((u) => (u.id === unitId ? newUnit : u));
    set({ units: newUnits, syncStatus: 'saving' });
    saveLocalState(userId, newUnits, get().tasks, metricView, isWhatIfMode);

    if (userId) {
      try {
        await saveUnitToFirestore(userId, newUnit);
        set({ syncStatus: 'synced' });
      } catch {
        set({ syncStatus: 'saved' });
      }
    } else {
      set({ syncStatus: 'saved' });
    }
  },

  addTask: async (task) => {
    const { userId, metricView, isWhatIfMode } = get();
    const newTask: MicroTask = {
      ...task,
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };

    const newTasks = [newTask, ...get().tasks];
    set({ tasks: newTasks, syncStatus: 'saving' });
    saveLocalState(userId, get().units, newTasks, metricView, isWhatIfMode);

    if (userId) {
      try {
        await saveTaskToFirestore(userId, newTask);
        set({ syncStatus: 'synced' });
      } catch {
        set({ syncStatus: 'saved' });
      }
    } else {
      set({ syncStatus: 'saved' });
    }
  },

  toggleTask: async (taskId) => {
    const { userId, metricView, isWhatIfMode } = get();
    const target = get().tasks.find((t) => t.id === taskId);
    if (!target) return;

    const newStatus = !target.completed;
    const newTasks = get().tasks.map((t) => (t.id === taskId ? { ...t, completed: newStatus } : t));

    set({ tasks: newTasks, syncStatus: 'saving' });
    saveLocalState(userId, get().units, newTasks, metricView, isWhatIfMode);

    if (userId) {
      try {
        await toggleTaskInFirestore(userId, taskId, newStatus);
        set({ syncStatus: 'synced' });
      } catch {
        set({ syncStatus: 'saved' });
      }
    } else {
      set({ syncStatus: 'saved' });
    }
  },

  deleteTask: async (taskId) => {
    const { userId, metricView, isWhatIfMode } = get();
    const newTasks = get().tasks.filter((t) => t.id !== taskId);

    set({ tasks: newTasks, syncStatus: 'saving' });
    saveLocalState(userId, get().units, newTasks, metricView, isWhatIfMode);

    if (userId) {
      try {
        await deleteTaskFromFirestore(userId, taskId);
        set({ syncStatus: 'synced' });
      } catch {
        set({ syncStatus: 'saved' });
      }
    } else {
      set({ syncStatus: 'saved' });
    }
  },

  resetWhatIfMarks: () => {
    const { userId, units, metricView } = get();
    const cleanedUnits = units.map((unit) => ({
      ...unit,
      assessments: unit.assessments.map((a) => ({
        ...a,
        hypotheticalMark: null,
        hypotheticalCompetency: null,
      })),
    }));

    set({ units: cleanedUnits, syncStatus: 'saving' });
    saveLocalState(userId, cleanedUnits, get().tasks, metricView, true);

    if (userId) {
      cleanedUnits.forEach((u) => saveUnitToFirestore(userId, u));
      set({ syncStatus: 'synced' });
    } else {
      set({ syncStatus: 'saved' });
    }
  },

  setCanvasIcsUrl: (canvasIcsUrl) => set({ canvasIcsUrl }),

  importCanvasEvents: async (events) => {
    const { userId, tasks, metricView, isWhatIfMode } = get();
    const newTasks: MicroTask[] = events.map((ev) => ({
      id: `canvas-${ev.id}`,
      unitCode: ev.unitCode || 'SYNC',
      title: ev.summary,
      dueDate: ev.dueDate,
      completed: false,
      tag: ev.isAssessment ? 'quiz' : 'general',
    }));

    const combined = [...newTasks, ...tasks];
    set({ tasks: combined, syncStatus: 'saving' });
    saveLocalState(userId, get().units, combined, metricView, isWhatIfMode);

    if (userId) {
      for (const t of newTasks) {
        await saveTaskToFirestore(userId, t);
      }
      set({ syncStatus: 'synced' });
    } else {
      set({ syncStatus: 'saved' });
    }
  },
}));
