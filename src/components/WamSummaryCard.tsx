import React, { useState } from 'react';
import { useDashboardStore } from '../store/useDashboardStore';
import { calculateAcademicMetrics } from '../lib/grade-calculator';
import { HurdleProgressBar } from './ui/HurdleProgressBar';
import { Award, ShieldAlert, ArrowRight, Target, Edit3, Check } from 'lucide-react';

export const WamSummaryCard: React.FC = () => {
  const {
    units,
    isWhatIfMode,
    metricView,
    degreeName,
    targetWam,
    updateAcademicProfile,
  } = useDashboardStore();

  const metrics = calculateAcademicMetrics(units, isWhatIfMode);

  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempDegree, setTempDegree] = useState(degreeName);
  const [tempTarget, setTempTarget] = useState(targetWam);

  const activeValue = metricView === 'SAM' ? metrics.sam : metrics.wam;
  const projectedValue = metricView === 'SAM' ? metrics.projectedSam : metrics.projectedWam;

  const activeStanding = isWhatIfMode ? metrics.projectedStanding : metrics.academicStanding;
  const anyHurdleRisk = metrics.unitResults.some((r) => r.hurdleFailRisk);

  const goal = targetWam || 75;
  const gap = projectedValue - goal;

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateAcademicProfile({
      degreeName: tempDegree,
      targetWam: Number(tempTarget),
    });
    setIsEditingGoal(false);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl p-4 sm:p-6 shadow-xs space-y-5 sm:space-y-6">
      {/* Degree Header & Student Target Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 sm:pb-4 border-b border-zinc-100 dark:border-zinc-800/80 gap-2">
        <div className="min-w-0">
          <span className="text-[10px] sm:text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
            Degree Program
          </span>
          <h2 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
            {degreeName || 'University Degree'}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {!isEditingGoal ? (
            <button
              onClick={() => {
                setTempDegree(degreeName);
                setTempTarget(targetWam);
                setIsEditingGoal(true);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
            >
              <Target className="w-3.5 h-3.5 text-zinc-500" />
              <span>Goal: {goal.toFixed(1)} WAM</span>
              <Edit3 className="w-3 h-3 text-zinc-400 ml-0.5" />
            </button>
          ) : (
            <form onSubmit={handleSaveGoal} className="flex items-center gap-1.5">
              <input
                type="number"
                min="50"
                max="95"
                step="0.5"
                value={tempTarget}
                onChange={(e) => setTempTarget(Number(e.target.value))}
                className="w-16 px-2 py-0.5 text-xs font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded"
              />
              <button
                type="submit"
                className="p-1 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded hover:bg-zinc-800"
                title="Save target"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Top Banner Alert if Hurdle Fail Risk exists */}
      {anyHurdleRisk && (
        <div className="p-3 sm:p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-xl flex items-start gap-2.5 sm:gap-3 text-xs text-rose-900 dark:text-rose-200">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-rose-800 dark:text-rose-300">
              Exam Hurdle Breach Detected!
            </p>
            <p className="mt-0.5 text-rose-700/90 dark:text-rose-400 text-[11px] sm:text-xs">
              One or more units have an overall projected mark ≥ 50%, but fail a mandatory exam hurdle. Under university policy, this results in an automatic Unit Fail (UF / 45 FA). Review assessment hurdles below!
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center">
        {/* Left: Giant Metric */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 uppercase tracking-wider">
            <span>Academic Performance</span>
            <span className="text-zinc-300 dark:text-zinc-700">/</span>
            <span className="text-zinc-900 dark:text-zinc-100 font-semibold">{metricView}</span>
          </div>

          <div className="mt-1.5 sm:mt-2 flex items-baseline gap-3 sm:gap-4">
            <span className="text-4xl sm:text-6xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 font-mono tabular-nums">
              {activeValue.toFixed(1)}
            </span>

            {isWhatIfMode && projectedValue !== activeValue && (
              <div className="flex items-center gap-1.5 sm:gap-2 text-emerald-600 dark:text-emerald-400 font-mono">
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-2xl sm:text-4xl font-semibold tabular-nums">
                    {projectedValue.toFixed(1)}
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-zinc-400 uppercase tracking-wider">
                    Projected
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Academic Standing */}
          <div className="mt-2.5 sm:mt-3 flex items-center gap-2 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
            <Award className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="font-medium truncate">{activeStanding}</span>
          </div>

          {/* Formula Explanation */}
          <div className="mt-2 text-[10px] sm:text-xs text-zinc-400 font-mono">
            <span>Weighted by credit points: Σ(CP × Mark) / Σ(CP)</span>
          </div>
        </div>

        {/* Right: Progress to Target WAM & Academic Benchmarks */}
        <div className="lg:col-span-7 flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-zinc-100 dark:border-zinc-800 pt-4 lg:pt-0 lg:pl-8">
          <div className="flex flex-wrap items-center justify-between text-xs mb-2 font-mono gap-1">
            <span className="text-zinc-500 uppercase tracking-wider text-[11px]">Goal Progress</span>
            <span className="text-zinc-700 dark:text-zinc-300 font-medium text-[11px] sm:text-xs">
              Target: {goal.toFixed(1)} (
              {gap >= 0 ? (
                <strong className="text-emerald-600 dark:text-emerald-400">+{gap.toFixed(1)} above goal</strong>
              ) : (
                <span className="text-amber-600">{Math.abs(gap).toFixed(1)} pts to goal</span>
              )}
              )
            </span>
          </div>

          <HurdleProgressBar
            currentValue={activeValue}
            projectedValue={isWhatIfMode ? projectedValue : undefined}
            maxValue={100}
            size="lg"
            showValues={false}
          />

          {/* Benchmark Labels */}
          <div className="flex justify-between text-[10px] sm:text-[11px] text-zinc-400 font-mono mt-2">
            <span>50 Pass</span>
            <span>65 Credit</span>
            <span>75 Distinction</span>
            <span>85 High Dist</span>
          </div>
        </div>
      </div>
    </div>
  );
};
