import { z } from 'zod';

export const AssessmentKindEnum = z.enum([
  'standard',                // Standard weighted percentage assessment
  'competency_hurdle',       // Unweighted / Pass-Fail task required to get a P (e.g. Lab Competency Exam)
  'foundation_requirement',  // Foundation requirement that unlocks the 50 P base (e.g. INFO1110 Foundation Test/Assignment)
  'advanced_extension',      // Adds points on top of the 50 P foundation base (e.g. INFO1110 Advanced Section)
]);

export const AssessmentZodSchema = z.object({
  id: z.string().min(1),
  unitId: z.string().min(1),
  title: z.string().min(1, 'Title is required').max(128),
  weight: z.number().min(0, 'Weight cannot be negative').max(100, 'Weight cannot exceed 100%'),
  mark: z.number().min(0, 'Mark cannot be negative').max(100, 'Mark cannot exceed 100%').optional().nullable(),
  isHurdle: z.boolean().default(false),
  hurdleMinMark: z.number().min(0).max(100).default(45),
  hurdleDescription: z.string().max(256).optional(),
  dueDate: z.string().optional(),
  completed: z.boolean().default(false),
  hypotheticalMark: z.number().min(0).max(100).optional().nullable(),

  kind: AssessmentKindEnum.default('standard'),
  isCompetencyPassed: z.boolean().default(false),
  hypotheticalCompetency: z.boolean().optional().nullable(),
  pointsAwarded: z.number().min(0).max(50).optional().nullable(),
});

export const UnitGradingSchemeEnum = z.enum([
  'standard',                 // Weighted average out of 100%
  'foundation_plus_advanced', // Foundation satisfies 50 P base; advanced tasks add points up to 100
]);

export const UnitZodSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1, 'Unit code is required').max(16),
  name: z.string().min(1, 'Unit name is required').max(128),
  creditPoints: z.number().min(1, 'CP must be at least 1').max(48).default(6),
  level: z.number().optional().default(1000),
  semester: z.string().default('Semester 1, 2026'),
  year: z.number().default(2026),
  gradingScheme: UnitGradingSchemeEnum.default('standard'),
  assessments: z.array(AssessmentZodSchema).refine(
    (assessments) => {
      const standardWeights = assessments
        .filter((a) => a.kind === 'standard')
        .reduce((acc, curr) => acc + curr.weight, 0);
      return Math.round(standardWeights) <= 100;
    },
    { message: 'Sum of standard assessment weights cannot exceed 100%' }
  ),
});

export const MicroTaskZodSchema = z.object({
  id: z.string().min(1),
  unitCode: z.string().optional(),
  title: z.string().min(1, 'Task title is required').max(256),
  dueDate: z.string().optional(),
  completed: z.boolean().default(false),
  tag: z.enum(['lab', 'quiz', 'tutorial', 'reading', 'general']).default('general'),
});

export type AssessmentKind = z.infer<typeof AssessmentKindEnum>;
export type UnitGradingScheme = z.infer<typeof UnitGradingSchemeEnum>;
export type MetricView = 'WAM' | 'SAM';

export interface Assessment {
  id: string;
  unitId: string;
  title: string;
  weight: number;
  mark?: number | null;
  isHurdle: boolean;
  hurdleMinMark: number;
  hurdleDescription?: string;
  dueDate?: string;
  completed: boolean;
  hypotheticalMark?: number | null;
  kind?: AssessmentKind;
  isCompetencyPassed?: boolean;
  hypotheticalCompetency?: boolean | null;
  pointsAwarded?: number | null;
}

export interface Unit {
  id: string;
  code: string;
  name: string;
  creditPoints: number;
  level?: number;
  semester: string;
  year: number;
  gradingScheme?: UnitGradingScheme;
  assessments: Assessment[];
}

export type MicroTask = z.infer<typeof MicroTaskZodSchema>;

export type AcademicStanding =
  | 'High Distinction (85+)'
  | 'Distinction (75 - 84.9)'
  | 'Credit (65 - 74.9)'
  | 'Pass (50 - 64.9)'
  | 'Fail / Incomplete (< 50)';

// Retained as alias for any backward compatibility
export type HonoursClass = AcademicStanding;

export interface CalculatedUnitResult {
  unit: Unit;
  earnedMark: number;
  completedWeight: number;
  currentPercentage: number;
  projectedFinalMark: number;
  isPassing: boolean;
  hurdles: {
    assessmentId: string;
    title: string;
    minMark: number;
    actualMark: number | null;
    isPassed: boolean;
    isPending: boolean;
    isCompetency?: boolean;
  }[];
  allHurdlesCleared: boolean;
  hurdleFailRisk: boolean;
  statusDisplay: string;
  foundationUnlocked?: boolean;
  gradingScheme: UnitGradingScheme;
}

export interface AcademicMetrics {
  wam: number;
  projectedWam: number;
  sam: number;
  projectedSam: number;
  totalCreditPoints: number;
  completedUnitsCount: number;
  activeUnitsCount: number;
  academicStanding: AcademicStanding;
  projectedStanding: AcademicStanding;
  // Backward compatibility alias:
  honoursClass: AcademicStanding;
  projectedHonoursClass: AcademicStanding;
  pendingHurdlesCount: number;
  failedHurdlesCount: number;
  unitResults: CalculatedUnitResult[];
}
