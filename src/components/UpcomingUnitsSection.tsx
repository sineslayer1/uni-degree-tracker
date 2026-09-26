import React, { useState } from 'react';
import { useDashboardStore } from '../store/useDashboardStore';
import { Unit } from '../types/dashboard';
import { STANDARD_SEMESTERS } from '../lib/semesters';
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  FileUp,
  ArrowRight,
  Plus,
  Trash2,
  Sparkles,
  BookMarked,
  CheckCircle2,
  Clock,
} from 'lucide-react';

interface UpcomingUnitsSectionProps {
  onOpenDegreePlanModal: () => void;
  onOpenSyllabusModal: () => void;
  onOpenAddUnitModal: () => void;
}

export const UpcomingUnitsSection: React.FC<UpcomingUnitsSectionProps> = ({
  onOpenDegreePlanModal,
  onOpenSyllabusModal,
  onOpenAddUnitModal,
}) => {
  const { units, currentSemester, updateUnitStatus, deleteUnit, addUnit } = useDashboardStore();
  const [isExpanded, setIsExpanded] = useState(true);
  const [editingSemesterId, setEditingSemesterId] = useState<string | null>(null);
  const [tempSemester, setTempSemester] = useState('');

  // Filter for upcoming / future planned units:
  // 1. Units explicitly marked upcoming
  // 2. Units belonging to other/future semesters
  // 3. Units in current semester that do not have syllabus/assessments uploaded yet
  const upcomingUnits = units.filter((u) => {
    if (u.status === 'finished') return false;
    if (u.status === 'upcoming') return true;
    const isDifferentSemester = u.semester?.trim() !== currentSemester?.trim();
    const hasNoSyllabus = !u.syllabusUploaded && (!u.assessments || u.assessments.length === 0);
    return isDifferentSemester || hasNoSyllabus;
  });

  const totalUpcomingCP = upcomingUnits.reduce((acc, u) => acc + (u.creditPoints || 6), 0);

  const handleEnrollNow = async (unit: Unit) => {
    // Promotes the upcoming unit to the current active semester
    await updateUnitStatus(unit.id, 'active', { semester: currentSemester });
  };

  const handleSaveSemester = async (unitId: string) => {
    if (tempSemester.trim()) {
      await updateUnitStatus(unitId, 'upcoming', { semester: tempSemester.trim() });
    }
    setEditingSemesterId(null);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs transition-all">
      {/* Section Header with Expand/Collapse */}
      <div className="px-4 sm:px-5 py-3.5 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity cursor-pointer"
          aria-expanded={isExpanded}
        >
          <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 border border-teal-200/60 dark:border-teal-800/60">
            <BookMarked className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 font-mono uppercase tracking-tight">
                Upcoming Planned Units ({upcomingUnits.length})
              </h3>
              {upcomingUnits.length > 0 && (
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                  {totalUpcomingCP} CP Planned
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-500 font-mono">
              Degree progression roadmap · Ingest syllabi when released or enroll for {currentSemester}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-2">
          {/* Quick Upload Degree Plan Button */}
          <button
            onClick={onOpenDegreePlanModal}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer"
            title="Upload photo or PDF of your university degree progression plan"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span className="hidden sm:inline">Upload Degree Plan</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
            aria-label="Toggle upcoming units section"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="p-4 sm:p-5 bg-zinc-50/40 dark:bg-zinc-950/40 space-y-4">
          {upcomingUnits.length === 0 ? (
            /* Empty State Banner */
            <div className="border border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl p-6 text-center space-y-3 bg-white dark:bg-zinc-900">
              <Calendar className="w-8 h-8 text-zinc-400 mx-auto" />
              <div>
                <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase font-mono tracking-tight">
                  No upcoming units in your roadmap yet
                </h4>
                <p className="text-xs text-zinc-500 font-mono mt-1 max-w-md mx-auto">
                  Upload a photo of your degree progression map (USYD CUSP diagram or course tables) to automatically populate all your future units.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  onClick={onOpenDegreePlanModal}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Upload Degree Plan (Photo / PDF)</span>
                </button>
                <button
                  onClick={onOpenAddUnitModal}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Unit Manually</span>
                </button>
              </div>
            </div>
          ) : (
            /* Upcoming Units Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {upcomingUnits.map((unit) => {
                const hasSyllabus =
                  unit.syllabusUploaded || unit.assessments.length > 0;
                const isEditingSemester = editingSemesterId === unit.id;

                return (
                  <div
                    key={unit.id}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl p-4 space-y-3 shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-zinc-950 dark:text-zinc-50">
                            {unit.code}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-semibold">
                            {unit.creditPoints} CP
                          </span>
                        </div>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate mt-0.5">
                          {unit.name}
                        </p>
                      </div>

                      {/* Syllabus status badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold border shrink-0 ${
                          hasSyllabus
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700'
                        }`}
                      >
                        {hasSyllabus ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            <span>Syllabus Ready</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3" />
                            <span>Syllabus Pending</span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* Semester Scheduled & Edit */}
                    <div className="flex items-center justify-between text-xs font-mono text-zinc-500 py-1.5 px-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                      <span className="text-[11px] text-zinc-400">Scheduled:</span>
                      {isEditingSemester ? (
                        <div className="flex items-center gap-1.5">
                          <select
                            value={tempSemester}
                            onChange={(e) => setTempSemester(e.target.value)}
                            className="px-2 py-0.5 text-xs font-mono bg-white dark:bg-zinc-900 border border-emerald-500 rounded text-zinc-900 dark:text-zinc-100"
                          >
                            {STANDARD_SEMESTERS.map((sem) => (
                              <option key={sem} value={sem}>
                                {sem}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleSaveSemester(unit.id)}
                            className="px-2 py-0.5 text-[10px] bg-emerald-600 text-white font-mono rounded cursor-pointer"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setTempSemester(unit.semester);
                            setEditingSemesterId(unit.id);
                          }}
                          className="hover:underline text-zinc-700 dark:text-zinc-300 font-semibold cursor-pointer"
                          title="Click to change scheduled semester"
                        >
                          {unit.semester} ✎
                        </button>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-1 gap-2 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-center gap-1.5">
                        {/* Upload Syllabus for this unit */}
                        <button
                          onClick={onOpenSyllabusModal}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg transition-colors cursor-pointer"
                          title="Upload unit outline PDF to extract assessments"
                        >
                          <FileUp className="w-3 h-3 text-emerald-600" />
                          <span>{hasSyllabus ? 'Update Syllabus' : 'Upload Syllabus'}</span>
                        </button>

                        <button
                          onClick={() => deleteUnit(unit.id)}
                          className="p-1 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors"
                          title="Remove planned unit"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Promote to Current Semester */}
                      <button
                        onClick={() => handleEnrollNow(unit)}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-mono font-semibold shadow-2xs transition-colors cursor-pointer"
                        title={`Move into active enrolled units for ${currentSemester}`}
                      >
                        <span>Enroll Now</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
