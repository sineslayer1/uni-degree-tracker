import React, { useState } from 'react';
import { Unit, Assessment, AssessmentKind } from '../types/dashboard';
import { useDashboardStore } from '../store/useDashboardStore';
import {
  calculateUnitResult,
  calculateRequiredMark,
} from '../lib/grade-calculator';
import { HurdleProgressBar } from './ui/HurdleProgressBar';
import { GradeSlider } from './ui/GradeSlider';
import {
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Plus,
  Trash2,
  CheckCircle2,
  Lock,
  Sparkles,
  Check,
  Target,
} from 'lucide-react';

interface UnitCardProps {
  unit: Unit;
}

export const UnitCard: React.FC<UnitCardProps> = ({ unit }) => {
  const {
    isWhatIfMode,
    updateAssessmentMark,
    toggleCompetencyPassed,
    toggleHypotheticalCompetency,
    updateHypotheticalMark,
    deleteUnit,
    addAssessment,
    deleteAssessment,
  } = useDashboardStore();

  const [isExpanded, setIsExpanded] = useState(true);
  const [showAddAssessment, setShowAddAssessment] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newWeight, setNewWeight] = useState(20);
  const [newKind, setNewKind] = useState<AssessmentKind>('standard');
  const [newIsHurdle, setNewIsHurdle] = useState(false);
  const [newHurdleMin, setNewHurdleMin] = useState(45);

  const result = calculateUnitResult(unit, isWhatIfMode);
  const isFoundationUnit = unit.gradingScheme === 'foundation_plus_advanced';

  const handleAddAssessmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newAssessment: Assessment = {
      id: `a-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      unitId: unit.id,
      title: newTitle.trim(),
      weight:
        newKind === 'competency_hurdle' || newKind === 'foundation_requirement'
          ? 0
          : Number(newWeight),
      mark: null,
      isHurdle:
        newIsHurdle ||
        newKind === 'competency_hurdle' ||
        newKind === 'foundation_requirement',
      hurdleMinMark: newIsHurdle ? Number(newHurdleMin) : 0,
      completed: false,
      hypotheticalMark: null,
      kind: newKind,
      isCompetencyPassed: false,
      hypotheticalCompetency: null,
    };

    addAssessment(unit.id, newAssessment);
    setNewTitle('');
    setShowAddAssessment(false);
  };

  const neededForDistinction = calculateRequiredMark(result.earnedMark, result.completedWeight, 75);

  return (
    <div
      className={`bg-white dark:bg-zinc-900 border rounded-xl overflow-hidden transition-all ${
        result.hurdleFailRisk
          ? 'border-rose-300 dark:border-rose-900 shadow-rose-100/30 shadow-xs'
          : 'border-zinc-200/80 dark:border-zinc-800 shadow-xs'
      }`}
    >
      {/* Unit Header */}
      <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800/80">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs font-mono text-zinc-500">
              <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm tracking-tight">
                {unit.code}
              </span>
              <span className="text-zinc-300 dark:text-zinc-700">·</span>
              <span>{unit.creditPoints} CP</span>
              <span className="text-zinc-300 dark:text-zinc-700">·</span>
              <span>{unit.semester}</span>
              {isFoundationUnit && (
                <>
                  <span className="text-zinc-300 dark:text-zinc-700">·</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                    Foundation 50P + Advanced
                  </span>
                </>
              )}
            </div>

            <h3 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100 mt-1 truncate">
              {unit.name}
            </h3>
          </div>

          {/* Unit Status Score and Expand Button */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="text-right font-mono">
              <div className="flex items-baseline justify-end gap-1.5">
                <span className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-zinc-50 tabular-nums">
                  {result.earnedMark}
                </span>
                {isWhatIfMode && result.projectedFinalMark !== result.earnedMark && (
                  <span className="text-base sm:text-lg font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    → {result.projectedFinalMark}
                  </span>
                )}
                <span className="text-xs text-zinc-400">/ 100</span>
              </div>
              <span
                className={`text-[11px] font-bold block ${
                  result.hurdleFailRisk
                    ? 'text-rose-600 dark:text-rose-400'
                    : result.isPassing
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-zinc-500'
                }`}
              >
                {result.statusDisplay}
              </span>
            </div>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 sm:p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label={isExpanded ? 'Collapse unit' : 'Expand unit'}
            >
              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Requirements Banner for Distinction Goal */}
        {result.completedWeight < 100 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-mono text-zinc-500">
            <Target className="w-3.5 h-3.5 text-zinc-400" />
            <span>
              Target Distinction (75):{' '}
              <strong className={neededForDistinction.isPossible ? 'text-zinc-800 dark:text-zinc-200' : 'text-rose-500'}>
                {neededForDistinction.message}
              </strong>
            </span>
          </div>
        )}

        {/* Foundation 50 P Baseline Banner if applicable */}
        {isFoundationUnit && (
          <div
            className={`mt-3.5 p-3 rounded-lg border text-xs flex items-center justify-between ${
              result.foundationUnlocked
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {result.foundationUnlocked ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <div>
                <span className="font-semibold">
                  Foundation Base (50 P): {result.foundationUnlocked ? 'UNLOCKED' : 'PENDING'}
                </span>
                <p className="text-[11px] opacity-80 mt-0.5">
                  {result.foundationUnlocked
                    ? 'All foundation requirements satisfied. Minimum 50 P achieved.'
                    : 'Satisfy the foundation requirements below to secure the baseline 50 P pass grade.'}
                </p>
              </div>
            </div>
            <span className="font-mono font-bold text-xs sm:text-sm shrink-0 pl-2">
              {result.foundationUnlocked ? '50 P Baseline' : '0 / 50 P'}
            </span>
          </div>
        )}

        {/* Unit Overall Progress Bar */}
        <div className="mt-4">
          <HurdleProgressBar
            currentValue={result.earnedMark}
            projectedValue={isWhatIfMode ? result.projectedFinalMark : undefined}
            maxValue={100}
            showValues={false}
            size="md"
          />
        </div>

        {/* Hurdle Alert Callout if at risk */}
        {result.hurdleFailRisk && (
          <div className="mt-3 p-2.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-lg flex items-center gap-2 text-xs text-rose-800 dark:text-rose-200">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              <strong>Hurdle Alert:</strong> One or more mandatory requirements (e.g. lab competency or double-pass exam hurdle) are currently unfulfilled. Under university policy, this restricts your final grade to a Fail/UF.
            </span>
          </div>
        )}
      </div>

      {/* Expanded Assessments Breakdown */}
      {isExpanded && (
        <div className="p-3.5 sm:p-5 bg-zinc-50/50 dark:bg-zinc-950/30">
          <div className="space-y-4">
            {unit.assessments.map((assessment) => {
              const isCompetency = assessment.kind === 'competency_hurdle';
              const isFoundation = assessment.kind === 'foundation_requirement';
              const isAdvanced = assessment.kind === 'advanced_extension';
              const isCompetencyTask = isCompetency || isFoundation;

              // Competency pass determination
              const isCompetencyMet = Boolean(assessment.isCompetencyPassed);
              const isCompetencyHypoMet = Boolean(assessment.hypotheticalCompetency);
              const effectiveCompetency =
                isWhatIfMode &&
                assessment.hypotheticalCompetency !== null &&
                assessment.hypotheticalCompetency !== undefined
                  ? isCompetencyHypoMet
                  : isCompetencyMet;

              // Graded marks determination
              const hasActualMark =
                typeof assessment.mark === 'number' && !isNaN(assessment.mark);
              const hurdleStatus = !assessment.isHurdle
                ? undefined
                : isCompetencyTask
                ? effectiveCompetency
                  ? 'passed'
                  : 'pending'
                : hasActualMark
                ? assessment.mark! >= assessment.hurdleMinMark
                  ? 'passed'
                  : 'failed'
                : isWhatIfMode &&
                  typeof assessment.hypotheticalMark === 'number' &&
                  !isNaN(assessment.hypotheticalMark)
                ? assessment.hypotheticalMark >= assessment.hurdleMinMark
                  ? 'passed'
                  : 'failed'
                : 'pending';

              return (
                <div
                  key={assessment.id}
                  className={`p-3.5 sm:p-4 bg-white dark:bg-zinc-900 border rounded-xl transition-colors space-y-3 ${
                    isCompetencyTask && effectiveCompetency
                      ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20'
                      : assessment.isHurdle && hurdleStatus === 'failed'
                      ? 'border-rose-300 dark:border-rose-900 bg-rose-50/30'
                      : 'border-zinc-200/80 dark:border-zinc-800 shadow-2xs'
                  }`}
                >
                  {/* Top Header: Title, Badges & Delete */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {isFoundation ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold">
                            Foundation Hurdle (50P Base)
                          </span>
                        ) : isCompetency ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-bold">
                            Competency Hurdle (Pass/Fail)
                          </span>
                        ) : isAdvanced ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                            Advanced Extension (+{assessment.weight} Pts)
                          </span>
                        ) : assessment.isHurdle ? (
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                              hurdleStatus === 'passed'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : hurdleStatus === 'failed'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            <Lock className="w-3 h-3" />
                            <span>Exam Hurdle ≥ {assessment.hurdleMinMark}%</span>
                          </span>
                        ) : null}

                        <h4 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          {assessment.title}
                        </h4>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-zinc-400 mt-1">
                        {!isCompetencyTask && <span>Weight: {assessment.weight}%</span>}
                        {isCompetencyTask && <span>Pass/Fail Competency</span>}
                        {assessment.dueDate && (
                          <>
                            <span>·</span>
                            <span>Due: {assessment.dueDate}</span>
                          </>
                        )}
                        {assessment.hurdleDescription && (
                          <>
                            <span>·</span>
                            <span className="text-amber-600 dark:text-amber-400 italic">
                              {assessment.hurdleDescription}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Delete Item Button */}
                    <button
                      onClick={() => deleteAssessment(unit.id, assessment.id)}
                      className="p-1.5 text-zinc-400 hover:text-rose-600 transition-colors rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      title="Remove assessment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Input / Control Area: Interactive Slider or Competency Toggle */}
                  {isCompetencyTask ? (
                    <div className="pt-2 flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => toggleCompetencyPassed(unit.id, assessment.id)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-semibold transition-all border cursor-pointer ${
                          isCompetencyMet
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                        <span>{isCompetencyMet ? 'Satisfied / Passed' : 'Mark Passed'}</span>
                      </button>

                      {isWhatIfMode && !isCompetencyMet && (
                        <button
                          type="button"
                          onClick={() => toggleHypotheticalCompetency(unit.id, assessment.id)}
                          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-mono rounded-xl border transition-colors cursor-pointer ${
                            isCompetencyHypoMet
                              ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 font-semibold'
                              : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700'
                          }`}
                          title="Simulate passing this hurdle in What-If mode"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{isCompetencyHypoMet ? 'Simulated Met' : 'Simulate Pass'}</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    /* Interactive Grade Slider (Mobile & Desktop) */
                    <div className="pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
                      {isWhatIfMode ? (
                        <GradeSlider
                          value={assessment.hypotheticalMark ?? assessment.mark ?? null}
                          onChange={(val) => updateHypotheticalMark(unit.id, assessment.id, val)}
                          isWhatIf={true}
                          isHurdle={assessment.isHurdle}
                          hurdleMinMark={assessment.hurdleMinMark}
                          label="What-If Grade"
                          weight={assessment.weight}
                        />
                      ) : (
                        <GradeSlider
                          value={assessment.mark ?? null}
                          onChange={(val) => updateAssessmentMark(unit.id, assessment.id, val)}
                          isWhatIf={false}
                          isHurdle={assessment.isHurdle}
                          hurdleMinMark={assessment.hurdleMinMark}
                          label="Actual Mark"
                          weight={assessment.weight}
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add Assessment Form / Trigger */}
          {showAddAssessment ? (
            <form
              onSubmit={handleAddAssessmentSubmit}
              className="mt-4 p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-5">
                  <label className="text-[11px] font-mono text-zinc-500 block mb-1">
                    Assessment / Task Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lab Safety Competency Exam"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="text-[11px] font-mono text-zinc-500 block mb-1">
                    Assessment Type
                  </label>
                  <select
                    value={newKind}
                    onChange={(e) => setNewKind(e.target.value as AssessmentKind)}
                    className="w-full px-2 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-mono text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="standard">Standard Graded (Weight %)</option>
                    <option value="competency_hurdle">Pass/Fail Competency (No Grade, Required for P)</option>
                    <option value="foundation_requirement">Foundation Requirement (Unlocks 50P)</option>
                    <option value="advanced_extension">Advanced Extension (+Points above 50P)</option>
                  </select>
                </div>

                {newKind !== 'competency_hurdle' && newKind !== 'foundation_requirement' && (
                  <div className="sm:col-span-3">
                    <label className="text-[11px] font-mono text-zinc-500 block mb-1">
                      {newKind === 'advanced_extension' ? 'Max Points' : 'Weight (%)'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={newWeight}
                      onChange={(e) => setNewWeight(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-xs font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                )}
              </div>

              {newKind === 'standard' && (
                <div className="flex flex-wrap items-center gap-4 pt-1">
                  <label className="flex items-center gap-1.5 text-xs text-zinc-700 dark:text-zinc-300">
                    <input
                      type="checkbox"
                      checked={newIsHurdle}
                      onChange={(e) => setNewIsHurdle(e.target.checked)}
                      className="rounded"
                    />
                    <span>Double-Pass Exam Hurdle</span>
                  </label>

                  {newIsHurdle && (
                    <div className="flex items-center gap-1.5 text-xs font-mono">
                      <span className="text-zinc-500">Min Pass Threshold:</span>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={newHurdleMin}
                        onChange={(e) => setNewHurdleMin(Number(e.target.value))}
                        className="w-14 px-1.5 py-0.5 text-xs bg-zinc-50 dark:bg-zinc-800 border rounded text-center"
                      />
                      <span>%</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddAssessment(false)}
                  className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-700 font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 text-xs font-semibold rounded-lg"
                >
                  Add to Unit
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-zinc-200/60 dark:border-zinc-800 text-xs font-mono">
              <button
                onClick={() => setShowAddAssessment(true)}
                className="inline-flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium py-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Assessment Item</span>
              </button>

              <button
                onClick={() => deleteUnit(unit.id)}
                className="inline-flex items-center gap-1 text-zinc-400 hover:text-rose-600 transition-colors py-1"
                title="Remove Unit"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Unit</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
