import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { Unit, Assessment, MicroTask, AssessmentKind, UnitGradingScheme } from '../types/dashboard';

/**
 * Strips undefined values and converts them to null or primitive values safe for Firestore.
 */
function sanitizeData<T extends Record<string, any>>(data: T): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(data)) {
    if (val === undefined) {
      clean[key] = null;
    } else if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      clean[key] = sanitizeData(val);
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

/**
 * Loads all units and nested assessments belonging to this user from Firestore.
 * Optimizations:
 * 1. Checks for embedded assessments array on unit doc for instant 1-query loading.
 * 2. Uses parallel Promise.all across all unit docs instead of serial loop.
 */
export async function loadUserUnitsFromFirestore(userId: string): Promise<Unit[]> {
  try {
    const unitsSnap = await getDocs(collection(db, 'users', userId, 'units'));
    if (unitsSnap.empty) return [];

    const units: Unit[] = await Promise.all(
      unitsSnap.docs.map(async (unitDoc) => {
        const unitData = unitDoc.data();

        // Ultra-fast path: embedded assessments directly on the unit document
        if (Array.isArray(unitData.assessments) && unitData.assessments.length > 0) {
          const assessments: Assessment[] = unitData.assessments.map((aData: any) => ({
            id: aData.id || `a-${Math.random().toString(36).substring(2, 6)}`,
            unitId: unitDoc.id,
            title: aData.title || 'Assessment',
            weight: typeof aData.weight === 'number' ? aData.weight : 0,
            mark: typeof aData.mark === 'number' ? aData.mark : null,
            isHurdle: Boolean(aData.isHurdle),
            hurdleMinMark: typeof aData.hurdleMinMark === 'number' ? aData.hurdleMinMark : 0,
            hurdleDescription: aData.hurdleDescription || '',
            dueDate: aData.dueDate || '',
            completed: Boolean(aData.completed),
            hypotheticalMark: typeof aData.hypotheticalMark === 'number' ? aData.hypotheticalMark : null,
            kind: (aData.kind as AssessmentKind) || 'standard',
            isCompetencyPassed: Boolean(aData.isCompetencyPassed),
            hypotheticalCompetency:
              typeof aData.hypotheticalCompetency === 'boolean' ? aData.hypotheticalCompetency : null,
            pointsAwarded: typeof aData.pointsAwarded === 'number' ? aData.pointsAwarded : null,
          }));

          assessments.sort((a, b) => a.title.localeCompare(b.title));

          return {
            id: unitDoc.id,
            code: unitData.code || 'ENGG1000',
            name: unitData.name || 'Engineering Unit',
            creditPoints: unitData.creditPoints || 6,
            level: unitData.level || 1000,
            semester: unitData.semester || 'Semester 1, 2026',
            year: unitData.year || 2026,
            gradingScheme: (unitData.gradingScheme as UnitGradingScheme) || 'standard',
            status: unitData.status || 'active',
            finalMark: typeof unitData.finalMark === 'number' ? unitData.finalMark : null,
            syllabusUploaded: Boolean(unitData.syllabusUploaded),
            assessments,
          };
        }

        // Parallel fallback: fetch subcollection if not embedded
        try {
          const assessSnap = await getDocs(
            collection(db, 'users', userId, 'units', unitDoc.id, 'assessments')
          );

          const assessments: Assessment[] = assessSnap.docs.map((aDoc) => {
            const aData = aDoc.data();
            return {
              id: aDoc.id,
              unitId: unitDoc.id,
              title: aData.title || 'Assessment',
              weight: typeof aData.weight === 'number' ? aData.weight : 0,
              mark: typeof aData.mark === 'number' ? aData.mark : null,
              isHurdle: Boolean(aData.isHurdle),
              hurdleMinMark: typeof aData.hurdleMinMark === 'number' ? aData.hurdleMinMark : 0,
              hurdleDescription: aData.hurdleDescription || '',
              dueDate: aData.dueDate || '',
              completed: Boolean(aData.completed),
              hypotheticalMark: typeof aData.hypotheticalMark === 'number' ? aData.hypotheticalMark : null,
              kind: (aData.kind as AssessmentKind) || 'standard',
              isCompetencyPassed: Boolean(aData.isCompetencyPassed),
              hypotheticalCompetency:
                typeof aData.hypotheticalCompetency === 'boolean' ? aData.hypotheticalCompetency : null,
              pointsAwarded: typeof aData.pointsAwarded === 'number' ? aData.pointsAwarded : null,
            };
          });

          assessments.sort((a, b) => a.title.localeCompare(b.title));

          return {
            id: unitDoc.id,
            code: unitData.code || 'ENGG1000',
            name: unitData.name || 'Engineering Unit',
            creditPoints: unitData.creditPoints || 6,
            level: unitData.level || 1000,
            semester: unitData.semester || 'Semester 1, 2026',
            year: unitData.year || 2026,
            gradingScheme: (unitData.gradingScheme as UnitGradingScheme) || 'standard',
            status: unitData.status || 'active',
            finalMark: typeof unitData.finalMark === 'number' ? unitData.finalMark : null,
            syllabusUploaded: Boolean(unitData.syllabusUploaded),
            assessments,
          };
        } catch {
          return {
            id: unitDoc.id,
            code: unitData.code || 'ENGG1000',
            name: unitData.name || 'Engineering Unit',
            creditPoints: unitData.creditPoints || 6,
            level: unitData.level || 1000,
            semester: unitData.semester || 'Semester 1, 2026',
            year: unitData.year || 2026,
            gradingScheme: (unitData.gradingScheme as UnitGradingScheme) || 'standard',
            status: unitData.status || 'active',
            finalMark: typeof unitData.finalMark === 'number' ? unitData.finalMark : null,
            syllabusUploaded: Boolean(unitData.syllabusUploaded),
            assessments: [],
          };
        }
      })
    );

    units.sort((a, b) => a.code.localeCompare(b.code));
    return units;
  } catch (error) {
    console.error('Error loading units from Firestore:', error);
    return [];
  }
}

/**
 * Loads all micro-tasks belonging to this user.
 */
export async function loadUserTasksFromFirestore(userId: string): Promise<MicroTask[]> {
  try {
    const tasksSnap = await getDocs(collection(db, 'users', userId, 'tasks'));
    return tasksSnap.docs.map((tDoc) => {
      const d = tDoc.data();
      return {
        id: tDoc.id,
        unitCode: d.unitCode || 'GENERAL',
        title: d.title || '',
        dueDate: d.dueDate || '',
        completed: Boolean(d.completed),
        tag: d.tag || 'general',
      };
    });
  } catch (error) {
    console.error('Error loading tasks from Firestore:', error);
    return [];
  }
}

/**
 * Saves a unit and its assessments into the user's isolated Firestore subcollection.
 */
export async function saveUnitToFirestore(userId: string, unit: Unit): Promise<void> {
  try {
    const batch = writeBatch(db);
    const unitRef = doc(db, 'users', userId, 'units', unit.id);

    batch.set(
      unitRef,
      sanitizeData({
        id: unit.id,
        userId,
        code: unit.code,
        name: unit.name,
        creditPoints: unit.creditPoints,
        level: unit.level,
        semester: unit.semester,
        year: unit.year,
        gradingScheme: unit.gradingScheme || 'standard',
        status: unit.status || 'active',
        finalMark: typeof unit.finalMark === 'number' ? unit.finalMark : null,
        syllabusUploaded: Boolean(unit.syllabusUploaded),
        assessments: unit.assessments || [],
        updatedAt: new Date().toISOString(),
      }),
      { merge: true }
    );

    for (const a of unit.assessments) {
      const assessRef = doc(db, 'users', userId, 'units', unit.id, 'assessments', a.id);
      batch.set(
        assessRef,
        sanitizeData({
          id: a.id,
          unitId: unit.id,
          userId,
          title: a.title,
          weight: a.weight,
          mark: a.mark ?? null,
          isHurdle: Boolean(a.isHurdle),
          hurdleMinMark: a.hurdleMinMark ?? 0,
          hurdleDescription: a.hurdleDescription ?? '',
          dueDate: a.dueDate ?? '',
          completed: Boolean(a.completed),
          hypotheticalMark: a.hypotheticalMark ?? null,
          kind: a.kind ?? 'standard',
          isCompetencyPassed: Boolean(a.isCompetencyPassed),
          hypotheticalCompetency: a.hypotheticalCompetency ?? null,
          pointsAwarded: a.pointsAwarded ?? null,
          updatedAt: new Date().toISOString(),
        }),
        { merge: true }
      );
    }

    await batch.commit();
  } catch (error) {
    console.error('Error saving unit to Firestore:', error);
  }
}

/**
 * Updates an assessment mark in Firestore.
 */
export async function updateAssessmentMarkInFirestore(
  userId: string,
  unitId: string,
  assessmentId: string,
  mark: number | null
): Promise<void> {
  try {
    const assessRef = doc(db, 'users', userId, 'units', unitId, 'assessments', assessmentId);
    await setDoc(
      assessRef,
      sanitizeData({
        mark: mark ?? null,
        completed: mark !== null && !isNaN(mark),
        updatedAt: new Date().toISOString(),
      }),
      { merge: true }
    );
  } catch (error) {
    console.error('Error updating mark in Firestore:', error);
  }
}

/**
 * Updates competency pass status in Firestore.
 */
export async function toggleCompetencyInFirestore(
  userId: string,
  unitId: string,
  assessmentId: string,
  isCompetencyPassed: boolean
): Promise<void> {
  try {
    const assessRef = doc(db, 'users', userId, 'units', unitId, 'assessments', assessmentId);
    await setDoc(
      assessRef,
      sanitizeData({
        isCompetencyPassed,
        completed: isCompetencyPassed,
        updatedAt: new Date().toISOString(),
      }),
      { merge: true }
    );
  } catch (error) {
    console.error('Error toggling competency in Firestore:', error);
  }
}

/**
 * Updates hypothetical mark in Firestore.
 */
export async function updateHypotheticalMarkInFirestore(
  userId: string,
  unitId: string,
  assessmentId: string,
  hypotheticalMark: number | null
): Promise<void> {
  try {
    const assessRef = doc(db, 'users', userId, 'units', unitId, 'assessments', assessmentId);
    await setDoc(
      assessRef,
      sanitizeData({
        hypotheticalMark: hypotheticalMark ?? null,
        updatedAt: new Date().toISOString(),
      }),
      { merge: true }
    );
  } catch (error) {
    console.error('Error updating hypothetical mark in Firestore:', error);
  }
}

/**
 * Updates hypothetical competency in Firestore.
 */
export async function updateHypotheticalCompetencyInFirestore(
  userId: string,
  unitId: string,
  assessmentId: string,
  hypotheticalCompetency: boolean | null
): Promise<void> {
  try {
    const assessRef = doc(db, 'users', userId, 'units', unitId, 'assessments', assessmentId);
    await setDoc(
      assessRef,
      sanitizeData({
        hypotheticalCompetency: hypotheticalCompetency ?? null,
        updatedAt: new Date().toISOString(),
      }),
      { merge: true }
    );
  } catch (error) {
    console.error('Error updating hypothetical competency in Firestore:', error);
  }
}

/**
 * Deletes a unit from Firestore.
 */
export async function deleteUnitFromFirestore(userId: string, unitId: string): Promise<void> {
  try {
    const assessSnap = await getDocs(
      collection(db, 'users', userId, 'units', unitId, 'assessments')
    );
    const batch = writeBatch(db);
    for (const aDoc of assessSnap.docs) {
      batch.delete(aDoc.ref);
    }
    batch.delete(doc(db, 'users', userId, 'units', unitId));
    await batch.commit();
  } catch (error) {
    console.error('Error deleting unit from Firestore:', error);
  }
}

/**
 * Saves a micro-task to Firestore.
 */
export async function saveTaskToFirestore(userId: string, task: MicroTask): Promise<void> {
  try {
    await setDoc(
      doc(db, 'users', userId, 'tasks', task.id),
      sanitizeData({
        ...task,
        userId,
        updatedAt: new Date().toISOString(),
      }),
      { merge: true }
    );
  } catch (error) {
    console.error('Error saving task to Firestore:', error);
  }
}

/**
 * Toggles a micro-task in Firestore.
 */
export async function toggleTaskInFirestore(
  userId: string,
  taskId: string,
  completed: boolean
): Promise<void> {
  try {
    await setDoc(
      doc(db, 'users', userId, 'tasks', taskId),
      sanitizeData({
        completed,
        updatedAt: new Date().toISOString(),
      }),
      { merge: true }
    );
  } catch (error) {
    console.error('Error toggling task in Firestore:', error);
  }
}

/**
 * Deletes a micro-task in Firestore.
 */
export async function deleteTaskFromFirestore(userId: string, taskId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'users', userId, 'tasks', taskId));
  } catch (error) {
    console.error('Error deleting task from Firestore:', error);
  }
}
