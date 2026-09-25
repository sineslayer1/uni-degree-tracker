import { Unit } from '../types/dashboard';
import { calculateAcademicMetrics, calculateUnitResult } from './grade-calculator';

export interface ExportDataParams {
  units: Unit[];
  isWhatIfMode: boolean;
  metricView: 'WAM' | 'SAM';
  studentName?: string;
  studentEmail?: string;
  degreeName?: string;
  targetWam?: number;
}

function escapeCsvField(field: any): string {
  if (field === null || field === undefined) return '';
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowToCsv(row: any[]): string {
  return row.map(escapeCsvField).join(',');
}

export function generateAcademicCsv({
  units,
  isWhatIfMode,
  metricView,
  studentName = 'Student',
  studentEmail = '',
  degreeName = 'Engineering Degree',
  targetWam = 75,
}: ExportDataParams): string {
  const metrics = calculateAcademicMetrics(units, isWhatIfMode);
  const dateStr = new Date().toLocaleString();

  const lines: string[] = [];

  // Title & Metadata Section
  lines.push(rowToCsv(['APEX ENGINEERING ACADEMIC RECORD & HURDLE REPORT']));
  lines.push(rowToCsv(['Generated At', dateStr]));
  lines.push(rowToCsv(['Student Name', studentName]));
  if (studentEmail) lines.push(rowToCsv(['Student Email', studentEmail]));
  lines.push(rowToCsv(['Degree Program', degreeName]));
  lines.push(rowToCsv(['Target WAM Goal', targetWam.toFixed(1)]));
  lines.push(rowToCsv(['Current Mode', isWhatIfMode ? 'What-If Simulation' : 'Actual Recorded Marks']));
  lines.push(rowToCsv(['Metric View', metricView]));
  lines.push(rowToCsv([]));

  // Key Metrics Summary
  lines.push(rowToCsv(['--- ACADEMIC PERFORMANCE SUMMARY ---']));
  lines.push(rowToCsv(['Metric', 'Actual Score', 'Projected Score', 'Academic Standing']));
  lines.push(
    rowToCsv([
      'Weighted Average Mark (WAM)',
      metrics.wam.toFixed(1),
      metrics.projectedWam.toFixed(1),
      metrics.academicStanding,
    ])
  );
  lines.push(
    rowToCsv([
      'Semester Average Mark (SAM)',
      metrics.sam.toFixed(1),
      metrics.projectedSam.toFixed(1),
      isWhatIfMode ? metrics.projectedStanding : metrics.academicStanding,
    ])
  );
  lines.push(rowToCsv(['Total Credit Points Enrolled', metrics.totalCreditPoints]));
  lines.push(rowToCsv(['Hurdles Pending Completion', metrics.pendingHurdlesCount]));
  lines.push(rowToCsv(['Hurdles Breached / Failed', metrics.failedHurdlesCount]));

  const anyHurdleRisk = metrics.unitResults.some((r) => r.hurdleFailRisk);
  lines.push(
    rowToCsv([
      'Overall Hurdle Compliance',
      anyHurdleRisk
        ? 'WARNING: Hurdle Breach Detected (Restricts Grade to UF / 45 FA)'
        : 'All Mandatory Hurdles Cleared or In Progress',
    ])
  );
  lines.push(rowToCsv([]));

  // Unit Summary Table
  lines.push(rowToCsv(['--- ENROLLED UNITS OF STUDY ---']));
  lines.push(
    rowToCsv([
      'Unit Code',
      'Unit Name',
      'Credit Points',
      'Semester',
      'Grading Scheme',
      'Current Earned Mark',
      'Projected Final Mark',
      'Completed Weight (%)',
      'Academic Status',
      'Hurdle Pass Risk',
    ])
  );

  for (const unit of units) {
    const res = calculateUnitResult(unit, isWhatIfMode);
    lines.push(
      rowToCsv([
        unit.code,
        unit.name,
        unit.creditPoints,
        unit.semester,
        unit.gradingScheme === 'foundation_plus_advanced'
          ? 'Foundation 50P + Advanced Pathway'
          : 'Standard Percentage Weighted',
        res.earnedMark,
        res.projectedFinalMark,
        `${res.completedWeight}%`,
        res.statusDisplay,
        res.hurdleFailRisk ? 'FAIL RISK (Mandatory Hurdle Unfulfilled)' : 'Clear',
      ])
    );
  }
  lines.push(rowToCsv([]));

  // Detailed Assessment Schedule
  lines.push(rowToCsv(['--- DETAILED ASSESSMENT SCHEDULE & HURDLES ---']));
  lines.push(
    rowToCsv([
      'Unit Code',
      'Assessment Title',
      'Assessment Type',
      'Weight (%)',
      'Actual Mark (%)',
      'Simulated What-If Mark (%)',
      'Is Double-Pass Hurdle',
      'Hurdle Minimum (%)',
      'Hurdle Status',
      'Due Date',
      'Completed',
      'Notes / Hurdle Policy',
    ])
  );

  for (const unit of units) {
    for (const a of unit.assessments) {
      const isCompetency = a.kind === 'competency_hurdle' || a.kind === 'foundation_requirement';
      let hurdleStatusStr = 'N/A';

      if (a.isHurdle || isCompetency) {
        if (isCompetency) {
          const isPassed = Boolean(a.isCompetencyPassed);
          const isHypo = Boolean(a.hypotheticalCompetency);
          hurdleStatusStr = isPassed
            ? 'Satisfied / Cleared'
            : isWhatIfMode && isHypo
            ? 'Simulated Cleared'
            : 'Pending Requirement';
        } else {
          const hasMark = typeof a.mark === 'number' && !isNaN(a.mark);
          const hasHypo = typeof a.hypotheticalMark === 'number' && !isNaN(a.hypotheticalMark);
          const markToCheck = hasMark
            ? a.mark!
            : isWhatIfMode && hasHypo
            ? a.hypotheticalMark!
            : null;

          if (markToCheck === null) {
            hurdleStatusStr = 'Pending Exam / Submission';
          } else if (markToCheck >= a.hurdleMinMark) {
            hurdleStatusStr = `Cleared (≥ ${a.hurdleMinMark}%)`;
          } else {
            hurdleStatusStr = `BREACHED (< ${a.hurdleMinMark}%) -> UF Risk`;
          }
        }
      }

      let typeStr = 'Standard Graded';
      if (a.kind === 'competency_hurdle') typeStr = 'Pass/Fail Competency Hurdle';
      if (a.kind === 'foundation_requirement') typeStr = 'Foundation 50P Requirement';
      if (a.kind === 'advanced_extension') typeStr = 'Advanced Extension (+Points)';

      lines.push(
        rowToCsv([
          unit.code,
          a.title,
          typeStr,
          isCompetency ? '0 (Unweighted Hurdle)' : `${a.weight}%`,
          a.mark !== null && a.mark !== undefined ? `${a.mark}%` : 'Not Entered',
          a.hypotheticalMark !== null && a.hypotheticalMark !== undefined
            ? `${a.hypotheticalMark}%`
            : 'N/A',
          a.isHurdle ? 'YES' : 'NO',
          a.isHurdle && a.hurdleMinMark > 0 ? `${a.hurdleMinMark}%` : 'N/A',
          hurdleStatusStr,
          a.dueDate || 'Unscheduled',
          a.completed ? 'YES' : 'NO',
          a.hurdleDescription || '',
        ])
      );
    }
  }

  return lines.join('\r\n');
}

/**
 * Triggers a browser download of the generated academic CSV
 */
export function downloadAcademicCsv(params: ExportDataParams) {
  const csvContent = generateAcademicCsv(params);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const cleanName = (params.studentName || 'academic_record')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_');
  const dateStamp = new Date().toISOString().split('T')[0];
  const filename = `apex_${cleanName}_wam_report_${dateStamp}.csv`;

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
