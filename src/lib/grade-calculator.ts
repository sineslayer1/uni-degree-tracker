import {
  Unit,
  Assessment,
  CalculatedUnitResult,
  AcademicMetrics,
  AcademicStanding,
} from '../types/dashboard';

export function getGradeLabel(mark: number, hurdleFailed: boolean = false, failureReason?: string): string {
  if (hurdleFailed) {
    return failureReason || 'UF (Hurdle Fail)';
  }
  if (mark >= 85) return '85+ HD (High Distinction)';
  if (mark >= 75) return '75+ D (Distinction)';
  if (mark >= 65) return '65+ CR (Credit)';
  if (mark >= 50) return '50+ P (Pass)';
  return 'FA (Fail)';
}

export function getAcademicStanding(wam: number): AcademicStanding {
  if (wam >= 85) return 'High Distinction (85+)';
  if (wam >= 75) return 'Distinction (75 - 84.9)';
  if (wam >= 65) return 'Credit (65 - 74.9)';
  if (wam >= 50) return 'Pass (50 - 64.9)';
  return 'Fail / Incomplete (< 50)';
}

// Backward-compatible alias
export const getHonoursClassification = getAcademicStanding;

/**
 * Calculates required average mark on remaining assessment weight to achieve target.
 */
export function calculateRequiredMark(
  currentEarned: number,
  completedWeight: number,
  targetMark: number = 75
): {
  requiredMark: number;
  isPossible: boolean;
  message: string;
} {
  const remainingWeight = 100 - completedWeight;
  if (remainingWeight <= 0) {
    return {
      requiredMark: 0,
      isPossible: currentEarned >= targetMark,
      message: currentEarned >= targetMark ? 'Target achieved!' : 'Completed below target',
    };
  }

  const markNeeded = targetMark - currentEarned;
  if (markNeeded <= 0) {
    return {
      requiredMark: 0,
      isPossible: true,
      message: 'Already locked in!',
    };
  }

  const requiredMark = Math.round(((markNeeded / remainingWeight) * 100) * 10) / 10;
  const isPossible = requiredMark <= 100;

  return {
    requiredMark,
    isPossible,
    message: isPossible ? `Need ~${requiredMark}% avg in remaining tasks` : 'Mathematically out of reach',
  };
}

/**
 * Calculates grade, hurdles, and foundation status for a unit.
 * Supports:
 * 1. Standard percentage weighted units.
 * 2. Foundation + Advanced units (e.g. INFO1110): Foundation unlocks 50 P; Advanced adds up to +50 points.
 * 3. Ungraded / Pass-Fail competency hurdles (e.g. ELEC1601 Lab Competency) required to get a P.
 */
export function calculateUnitResult(unit: Unit, isWhatIfMode: boolean): CalculatedUnitResult {
  const isFoundationScheme = unit.gradingScheme === 'foundation_plus_advanced';
  const hurdleDetails: CalculatedUnitResult['hurdles'] = [];

  let allHurdlesCleared = true;
  let anyHurdleFailed = false;
  let hurdleFailureReason = '';

  // Edge case: unit has no assessments yet (e.g. newly added unit or placeholder with finalMark)
  if (!unit.assessments || unit.assessments.length === 0) {
    const fallbackMark =
      typeof unit.finalMark === 'number' && !isNaN(unit.finalMark) ? Math.max(0, Math.min(100, unit.finalMark)) : 0;
    return {
      unit,
      earnedMark: fallbackMark,
      completedWeight: typeof unit.finalMark === 'number' ? 100 : 0,
      currentPercentage: fallbackMark,
      projectedFinalMark: fallbackMark,
      isPassing: fallbackMark >= 50,
      hurdles: [],
      allHurdlesCleared: true,
      hurdleFailRisk: false,
      statusDisplay: getGradeLabel(fallbackMark),
      gradingScheme: unit.gradingScheme || 'standard',
    };
  }

  // 1. Process Pass/Fail Competency & Standard Hurdles
  for (const a of unit.assessments) {
    if (a.kind === 'competency_hurdle' || a.isHurdle) {
      const isCompetency = a.kind === 'competency_hurdle';

      let isPassed = false;
      let isPending = false;
      let markToCheck: number | null = null;

      if (isCompetency) {
        const passedActual = Boolean(a.isCompetencyPassed);
        const passedHypo = Boolean(a.hypotheticalCompetency);
        isPassed =
          isWhatIfMode && a.hypotheticalCompetency !== null && a.hypotheticalCompetency !== undefined
            ? passedHypo
            : passedActual;
        isPending = !isPassed;
        if (!isPassed && !isWhatIfMode) {
          anyHurdleFailed = true;
          allHurdlesCleared = false;
          hurdleFailureReason = `UF (${a.title} Competency Required for P)`;
        }
      } else {
        const hasActualMark = typeof a.mark === 'number' && !isNaN(a.mark);
        const hasHypothetical = typeof a.hypotheticalMark === 'number' && !isNaN(a.hypotheticalMark);
        markToCheck =
          isWhatIfMode && hasHypothetical
            ? a.hypotheticalMark!
            : hasActualMark
            ? a.mark!
            : null;

        isPassed = markToCheck !== null && markToCheck >= a.hurdleMinMark;
        isPending = markToCheck === null;
        const isFailed = markToCheck !== null && markToCheck < a.hurdleMinMark;

        if (isFailed) {
          anyHurdleFailed = true;
          allHurdlesCleared = false;
          hurdleFailureReason = `UF (${a.title} Hurdle Missed < ${a.hurdleMinMark}%)`;
        } else if (isPending) {
          allHurdlesCleared = false;
        }
      }

      hurdleDetails.push({
        assessmentId: a.id,
        title: a.title,
        minMark: a.hurdleMinMark,
        actualMark: markToCheck,
        isPassed,
        isPending,
        isCompetency,
      });
    }
  }

  // 2. Foundation + Advanced Scheme (e.g. INFO1110)
  if (isFoundationScheme) {
    const foundationTasks = unit.assessments.filter((a) => a.kind === 'foundation_requirement');
    const advancedTasks = unit.assessments.filter((a) => a.kind === 'advanced_extension');

    let allFoundationCleared = foundationTasks.length > 0;
    for (const f of foundationTasks) {
      const actualCleared = Boolean(f.isCompetencyPassed);
      const hypoCleared = Boolean(f.hypotheticalCompetency);
      const isCleared =
        isWhatIfMode && f.hypotheticalCompetency !== null && f.hypotheticalCompetency !== undefined
          ? hypoCleared
          : actualCleared;
      if (!isCleared) {
        allFoundationCleared = false;
        break;
      }
    }

    let actualAdvancedSum = 0;
    let projectedAdvancedSum = 0;
    let completedAdvancedWeight = 0;

    for (const adv of advancedTasks) {
      const hasActualMark = typeof adv.mark === 'number' && !isNaN(adv.mark);
      const hasHypo = typeof adv.hypotheticalMark === 'number' && !isNaN(adv.hypotheticalMark);

      if (hasActualMark) {
        const gained = (adv.mark! * adv.weight) / 100;
        actualAdvancedSum += gained;
        completedAdvancedWeight += adv.weight;
      }

      if (isWhatIfMode && hasHypo) {
        projectedAdvancedSum += (adv.hypotheticalMark! * adv.weight) / 100;
      } else if (hasActualMark) {
        projectedAdvancedSum += (adv.mark! * adv.weight) / 100;
      }
    }

    const currentPercentage = allFoundationCleared
      ? 50 + actualAdvancedSum
      : actualAdvancedSum > 0
      ? 45 // Held at 45 UF until foundation is cleared
      : 0;

    const projectedFinalMark = allFoundationCleared
      ? Math.min(100, Math.round((50 + projectedAdvancedSum) * 10) / 10)
      : Math.min(45, Math.round(projectedAdvancedSum * 10) / 10);

    const isPassing = allFoundationCleared && projectedFinalMark >= 50;

    return {
      unit,
      earnedMark: allFoundationCleared ? 50 + actualAdvancedSum : actualAdvancedSum,
      completedWeight: foundationTasks.length > 0 ? 50 + completedAdvancedWeight : completedAdvancedWeight,
      currentPercentage: Math.round(currentPercentage * 10) / 10,
      projectedFinalMark,
      isPassing,
      hurdles: hurdleDetails,
      allHurdlesCleared: allFoundationCleared && allHurdlesCleared,
      hurdleFailRisk: !allFoundationCleared,
      statusDisplay: !allFoundationCleared
        ? 'UF (Foundation Prerequisite Pending)'
        : getGradeLabel(projectedFinalMark, anyHurdleFailed, hurdleFailureReason),
      foundationUnlocked: allFoundationCleared,
      gradingScheme: 'foundation_plus_advanced',
    };
  }

  // 3. Standard Percentage Weighted Unit
  let earnedMarkComponent = 0;
  let completedWeight = 0;
  let projectedComponent = 0;

  for (const a of unit.assessments) {
    if (a.kind === 'competency_hurdle' || a.kind === 'foundation_requirement') {
      continue;
    }

    const hasActualMark = typeof a.mark === 'number' && !isNaN(a.mark);
    const hasHypothetical = typeof a.hypotheticalMark === 'number' && !isNaN(a.hypotheticalMark);

    if (hasActualMark) {
      const contribution = (a.mark! * a.weight) / 100;
      earnedMarkComponent += contribution;
      completedWeight += a.weight;
    }

    if (isWhatIfMode && hasHypothetical) {
      projectedComponent += (a.hypotheticalMark! * a.weight) / 100;
    } else if (hasActualMark) {
      projectedComponent += (a.mark! * a.weight) / 100;
    }
  }

  const currentPercentage = completedWeight > 0 ? (earnedMarkComponent / completedWeight) * 100 : 0;
  const projectedFinalMark = Math.min(100, Math.round(projectedComponent * 10) / 10);

  const hurdleFailRisk = anyHurdleFailed && projectedFinalMark >= 50;
  const isPassing = projectedFinalMark >= 50 && !anyHurdleFailed;

  return {
    unit,
    earnedMark: Math.round(earnedMarkComponent * 10) / 10,
    completedWeight,
    currentPercentage: Math.round(currentPercentage * 10) / 10,
    projectedFinalMark,
    isPassing,
    hurdles: hurdleDetails,
    allHurdlesCleared,
    hurdleFailRisk,
    statusDisplay: getGradeLabel(projectedFinalMark, anyHurdleFailed, hurdleFailureReason),
    gradingScheme: 'standard',
  };
}

/**
 * Calculates academic metrics without level multipliers or HWAM.
 * WAM is calculated purely as: Σ(CP × Mark) / Σ(CP).
 */
export function calculateAcademicMetrics(
  units: Unit[],
  isWhatIfMode: boolean,
  currentSemester?: string
): AcademicMetrics {
  // Only active and finished units contribute to WAM / SAM. Upcoming units are planned future units.
  const gradedUnits = (units || []).filter((u) => u && u.status !== 'upcoming');
  const unitResults = gradedUnits.map((u) => calculateUnitResult(u, isWhatIfMode));

  let totalWamCP = 0;
  let totalWeightedActualProduct = 0;
  let totalWeightedProjectedProduct = 0;

  let totalSamCP = 0;
  let totalSamActualProduct = 0;
  let totalSamProjectedProduct = 0;

  let pendingHurdlesCount = 0;
  let failedHurdlesCount = 0;

  for (const result of unitResults) {
    const u = result.unit;
    const cp = Number(u.creditPoints) > 0 ? Number(u.creditPoints) : 6;
    const isFinished = u.status === 'finished';

    // Finished units have a definitive final mark.
    // Active units rely on assessment-derived results, unless they have zero assessments and a manual finalMark.
    const hasManualFinalMark = typeof u.finalMark === 'number' && !isNaN(u.finalMark);
    const finalEarnedMark =
      isFinished && hasManualFinalMark
        ? Math.max(0, Math.min(100, u.finalMark!))
        : (!u.assessments || u.assessments.length === 0) && hasManualFinalMark
        ? Math.max(0, Math.min(100, u.finalMark!))
        : result.completedWeight > 0
        ? result.currentPercentage
        : 0;

    const projectedMark =
      isFinished && hasManualFinalMark
        ? Math.max(0, Math.min(100, u.finalMark!))
        : (!u.assessments || u.assessments.length === 0) && hasManualFinalMark
        ? Math.max(0, Math.min(100, u.finalMark!))
        : result.projectedFinalMark;

    // Cumulative WAM encompasses both finished and active units
    totalWamCP += cp;
    totalWeightedActualProduct += finalEarnedMark * cp;
    totalWeightedProjectedProduct += projectedMark * cp;

    // SAM (Semester Average Mark) is for units in the currently selected active semester
    if (!isFinished) {
      const matchesSemester = currentSemester
        ? (!u.semester || u.semester.trim() === currentSemester.trim())
        : true;

      if (matchesSemester) {
        totalSamCP += cp;
        totalSamActualProduct += finalEarnedMark * cp;
        totalSamProjectedProduct += projectedMark * cp;

        // Only active units in this semester contribute to pending/at-risk hurdles
        for (const h of result.hurdles) {
          if (h.isPending) pendingHurdlesCount++;
          if (h.actualMark !== null && !h.isPassed) failedHurdlesCount++;
        }
      }
    }
  }

  const wam = totalWamCP > 0 ? Math.round((totalWeightedActualProduct / totalWamCP) * 10) / 10 : 0;
  const projectedWam =
    totalWamCP > 0 ? Math.round((totalWeightedProjectedProduct / totalWamCP) * 10) / 10 : 0;

  const sam =
    totalSamCP > 0
      ? Math.round((totalSamActualProduct / totalSamCP) * 10) / 10
      : (totalWamCP > 0 ? wam : 0);
  const projectedSam =
    totalSamCP > 0
      ? Math.round((totalSamProjectedProduct / totalSamCP) * 10) / 10
      : (totalWamCP > 0 ? projectedWam : 0);

  const standing = getAcademicStanding(wam);
  const projStanding = getAcademicStanding(projectedWam);

  return {
    wam: isNaN(wam) ? 0 : wam,
    projectedWam: isNaN(projectedWam) ? 0 : projectedWam,
    sam: isNaN(sam) ? 0 : sam,
    projectedSam: isNaN(projectedSam) ? 0 : projectedSam,
    totalCreditPoints: totalWamCP,
    completedUnitsCount: (units || []).filter(
      (u) => u && (u.status === 'finished' || (u.assessments && u.assessments.length > 0 && u.assessments.every((a) => a.completed)))
    ).length,
    activeUnitsCount: (units || []).filter((u) => u && u.status !== 'finished' && u.status !== 'upcoming').length,
    academicStanding: standing,
    projectedStanding: projStanding,
    honoursClass: standing,
    projectedHonoursClass: projStanding,
    pendingHurdlesCount,
    failedHurdlesCount,
    unitResults,
  };
}

