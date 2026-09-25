import { calculateAcademicMetrics, calculateUnitResult, getAcademicStanding } from '../src/lib/grade-calculator';
import { Unit } from '../src/types/dashboard';

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  message?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, suite: string, name: string, message?: string) {
  if (condition) {
    results.push({ suite, name, passed: true });
    console.log(`  ✓ [${suite}] ${name}`);
  } else {
    results.push({ suite, name, passed: false, message });
    console.error(`  ✗ [${suite}] ${name}: ${message || 'Assertion failed'}`);
  }
}

async function runAllTests() {
  console.log('\n=============================================');
  console.log('  RUNNING APEX DASHBOARD CAPABILITY TESTS');
  console.log('=============================================\n');

  // -------------------------------------------------------------
  // SUITE 1: WAM & SAM CALCULATION ENGINE
  // -------------------------------------------------------------
  console.log('--- SUITE 1: WAM & SAM Calculation Engine ---');

  // Test 1.1: Standard WAM with credit point weights
  const unit1: Unit = {
    id: 'u1',
    code: 'ELEC1601',
    name: 'Intro to Computer Systems',
    creditPoints: 6,
    semester: 'Semester 1, 2026',
    year: 2026,
    status: 'finished',
    finalMark: 80,
    assessments: [],
  };

  const unit2: Unit = {
    id: 'u2',
    code: 'MATH1061',
    name: 'Mathematics 1A',
    creditPoints: 6,
    semester: 'Semester 1, 2026',
    year: 2026,
    status: 'finished',
    finalMark: 70,
    assessments: [],
  };

  const unitThesis: Unit = {
    id: 'u3',
    code: 'ENGG4000',
    name: 'Honours Capstone',
    creditPoints: 12,
    semester: 'Semester 1, 2026',
    year: 2026,
    status: 'finished',
    finalMark: 90,
    assessments: [],
  };

  // Expected WAM: (80*6 + 70*6 + 90*12) / (6 + 6 + 12) = (480 + 420 + 1080) / 24 = 1980 / 24 = 82.5
  const metrics1 = calculateAcademicMetrics([unit1, unit2, unitThesis], false, 'Semester 1, 2026');
  assert(metrics1.wam === 82.5, 'WAM Calculation', 'Weighted CP formula: 6 CP + 6 CP + 12 CP', `Expected 82.5, got ${metrics1.wam}`);

  // Test 1.2: Academic Standing classification
  assert(getAcademicStanding(86) === 'High Distinction (85+)', 'Academic Standing', '86 -> High Distinction (85+)');
  assert(getAcademicStanding(76) === 'Distinction (75 - 84.9)', 'Academic Standing', '76 -> Distinction (75 - 84.9)');
  assert(getAcademicStanding(68) === 'Credit (65 - 74.9)', 'Academic Standing', '68 -> Credit (65 - 74.9)');
  assert(getAcademicStanding(52) === 'Pass (50 - 64.9)', 'Academic Standing', '52 -> Pass (50 - 64.9)');
  assert(getAcademicStanding(45) === 'Fail / Incomplete (< 50)', 'Academic Standing', '45 -> Fail / Incomplete (< 50)');

  // -------------------------------------------------------------
  // SUITE 2: DOUBLE-PASS EXAM HURDLE AND UF AUTO-FAIL
  // -------------------------------------------------------------
  console.log('\n--- SUITE 2: Double-Pass Hurdle & UF Policy ---');

  const hurdleUnit: Unit = {
    id: 'u-hurdle',
    code: 'ELEC2104',
    name: 'Electronic Devices & Circuits',
    creditPoints: 6,
    semester: 'Semester 1, 2026',
    year: 2026,
    status: 'active',
    syllabusUploaded: true,
    assessments: [
      {
        id: 'a1',
        unitId: 'u-hurdle',
        title: 'Assignments & Labs',
        weight: 50,
        mark: 90,
        completed: true,
        isHurdle: false,
        hurdleMinMark: 0,
        hypotheticalMark: null,
      },
      {
        id: 'a2',
        unitId: 'u-hurdle',
        title: 'Final Exam (45% Hurdle)',
        weight: 50,
        mark: 35,
        completed: true,
        isHurdle: true,
        hurdleMinMark: 45,
        hypotheticalMark: null,
      },
    ],
  };

  const hurdleResult = calculateUnitResult(hurdleUnit, false);
  assert(hurdleResult.hurdleFailRisk === true, 'Hurdle Engine', 'Exam hurdle breach detected when mark < 45%', `Expected hurdleFailRisk true`);
  assert(hurdleResult.statusDisplay.includes('UF'), 'Hurdle Engine', 'Grade display indicates UF on hurdle failure', `Got ${hurdleResult.statusDisplay}`);

  // Test 2.2: Passing the hurdle clears hurdle risk
  const passingHurdleUnit: Unit = {
    ...hurdleUnit,
    assessments: [
      hurdleUnit.assessments[0],
      {
        ...hurdleUnit.assessments[1],
        mark: 50, // Passed hurdle
      },
    ],
  };
  const passResult = calculateUnitResult(passingHurdleUnit, false);
  assert(passResult.hurdleFailRisk === false, 'Hurdle Engine', 'Hurdle cleared with mark >= 45%', `Expected hurdleFailRisk false`);
  assert(!passResult.statusDisplay.includes('UF'), 'Hurdle Engine', 'Grade is non-UF when hurdle passed', `Got ${passResult.statusDisplay}`);

  // -------------------------------------------------------------
  // SUITE 3: WHAT-IF PREDICTION & GRADE SLIDERS
  // -------------------------------------------------------------
  console.log('\n--- SUITE 3: What-If Prediction & Grade Sliders ---');

  const partialUnit: Unit = {
    id: 'u-whatif',
    code: 'AMME2500',
    name: 'Engineering Dynamics',
    creditPoints: 6,
    semester: 'Semester 1, 2026',
    year: 2026,
    status: 'active',
    syllabusUploaded: true,
    assessments: [
      {
        id: 'a1',
        unitId: 'u-whatif',
        title: 'Midterm Exam',
        weight: 30,
        mark: 70, // 21 earned
        completed: true,
        isHurdle: false,
        hurdleMinMark: 0,
        hypotheticalMark: null,
      },
      {
        id: 'a2',
        unitId: 'u-whatif',
        title: 'Final Exam',
        weight: 70,
        mark: null, // Not completed
        completed: false,
        isHurdle: true,
        hurdleMinMark: 45,
        hypotheticalMark: 80, // What-if: 80% on final -> 56 marks
      },
    ],
  };

  const actualResult = calculateUnitResult(partialUnit, false);
  const whatIfResult = calculateUnitResult(partialUnit, true);

  // Earned so far: 21% out of 30% completed -> 70% current percentage
  assert(actualResult.earnedMark === 21, 'What-If Engine', 'Actual earned mark accounts only for completed items', `Got ${actualResult.earnedMark}`);
  // Projected final mark: 21 + (70 * 0.8) = 21 + 56 = 77
  assert(whatIfResult.projectedFinalMark === 77, 'What-If Engine', 'What-If projected mark includes hypothetical slider (77)', `Got ${whatIfResult.projectedFinalMark}`);

  // -------------------------------------------------------------
  // SUITE 4: SEMESTER SEPARATION & SAM ISOLATION
  // -------------------------------------------------------------
  console.log('\n--- SUITE 4: Semester Separation & SAM Isolation ---');

  const sem1Unit: Unit = {
    id: 's1',
    code: 'MECH2400',
    name: 'Mechanical Design 1',
    creditPoints: 6,
    semester: 'Semester 1, 2026',
    year: 2026,
    status: 'active',
    syllabusUploaded: true,
    assessments: [
      {
        id: 'a1',
        unitId: 's1',
        title: 'Project',
        weight: 100,
        mark: 80,
        completed: true,
        isHurdle: false,
        hurdleMinMark: 0,
        hypotheticalMark: null,
      },
    ],
  };

  const sem2Unit: Unit = {
    id: 's2',
    code: 'MECH3400',
    name: 'Mechanical Design 2',
    creditPoints: 6,
    semester: 'Semester 2, 2026',
    year: 2026,
    status: 'active',
    syllabusUploaded: true,
    assessments: [
      {
        id: 'a2',
        unitId: 's2',
        title: 'Project',
        weight: 100,
        mark: 60,
        completed: true,
        isHurdle: false,
        hurdleMinMark: 0,
        hypotheticalMark: null,
      },
    ],
  };

  const upcomingUnit: Unit = {
    id: 'up1',
    code: 'AMME4111',
    name: 'Future Planned Capstone',
    creditPoints: 6,
    semester: 'Semester 1, 2027',
    year: 2027,
    status: 'upcoming',
    syllabusUploaded: false,
    assessments: [],
  };

  // When viewing Semester 1, 2026: SAM should be 80.0
  const sem1Metrics = calculateAcademicMetrics([sem1Unit, sem2Unit, upcomingUnit], false, 'Semester 1, 2026');
  assert(sem1Metrics.sam === 80, 'SAM Isolation', 'Semester 1 SAM calculates only Sem 1 units (80)', `Expected 80, got ${sem1Metrics.sam}`);

  // When viewing Semester 2, 2026: SAM should be 60.0
  const sem2Metrics = calculateAcademicMetrics([sem1Unit, sem2Unit, upcomingUnit], false, 'Semester 2, 2026');
  assert(sem2Metrics.sam === 60, 'SAM Isolation', 'Semester 2 SAM calculates only Sem 2 units (60)', `Expected 60, got ${sem2Metrics.sam}`);

  // Upcoming unit does NOT contribute to active units
  assert(sem1Metrics.activeUnitsCount === 2, 'Unit Categorization', 'Upcoming units excluded from active unit count (2 active)', `Got ${sem1Metrics.activeUnitsCount}`);

  // -------------------------------------------------------------
  // SUITE 5: FOUNDATION UNITS (50 PASS REQUIREMENT)
  // -------------------------------------------------------------
  console.log('\n--- SUITE 5: Foundation Units (50P Requirement) ---');

  const foundationUnitFail: Unit = {
    id: 'fn1',
    code: 'INFO1110',
    name: 'Introduction to Programming',
    creditPoints: 6,
    semester: 'Semester 1, 2026',
    year: 2026,
    status: 'active',
    gradingScheme: 'foundation_plus_advanced',
    assessments: [
      {
        id: 'f1',
        unitId: 'fn1',
        title: 'Foundation Quizzes (Requires 50%)',
        weight: 50,
        mark: 40, // 40% < 50% foundation threshold
        completed: true,
        kind: 'foundation_requirement',
        isHurdle: true,
        hurdleMinMark: 50,
        hypotheticalMark: null,
      },
      {
        id: 'f2',
        unitId: 'fn1',
        title: 'Advanced Projects',
        weight: 50,
        mark: 100, // Advanced work
        completed: true,
        kind: 'standard',
        isHurdle: false,
        hurdleMinMark: 0,
        hypotheticalMark: null,
      },
    ],
  };

  const fnResultFail = calculateUnitResult(foundationUnitFail, false);
  assert(fnResultFail.hurdleFailRisk === true, 'Foundation Engine', 'Foundation fail triggers hurdle risk when foundation < 50%', `Expected hurdle risk`);

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log('\n=============================================');
  console.log(`  CAPABILITY TEST SUMMARY: ${passed}/${total} PASSED`);
  if (failed > 0) {
    console.log(`  FAILED: ${failed}`);
  }
  console.log('=============================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
