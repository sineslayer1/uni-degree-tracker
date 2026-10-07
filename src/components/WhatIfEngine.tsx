import React from 'react';
import { useDashboardStore } from '../store/useDashboardStore';
import { calculateUnitResult, calculateRequiredMark } from '../lib/grade-calculator';
import { Sparkles, RotateCcw, Target, ShieldCheck } from 'lucide-react';

export const WhatIfEngine: React.FC = () => {
  const {
    units,
    currentSemester,
    isWhatIfMode,
    toggleWhatIfMode,
    resetWhatIfMarks,
    updateHypotheticalMark,
  } = useDashboardStore();

  const semesterUnits = units.filter((u) => {
    if (u.status === 'finished' || u.status === 'upcoming') return false;
    const unitSem = u.semester ? u.semester.trim().toLowerCase() : '';
    const activeSem = currentSemester ? currentSemester.trim().toLowerCase() : '';
    return unitSem === activeSem && (u.syllabusUploaded || (u.assessments && u.assessments.length > 0));
  });

  if (!isWhatIfMode) {
    return (
      <div className="bg-zinc-50 dark:bg-zinc-900/40 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Enable <strong>What-If Mode</strong> to forecast your marks, simulate hypothetical exam scores with sliders, and test double-pass hurdle scenarios.
          </span>
        </div>
        <button
          onClick={toggleWhatIfMode}
          className="px-3.5 py-1.5 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 font-semibold rounded-lg text-xs font-mono transition-colors shrink-0 shadow-xs"
        >
          Turn What-If ON
        </button>
      </div>
    );
  }

  if (semesterUnits.length === 0) {
    return (
      <div className="bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/60 rounded-xl p-4 sm:p-5 text-xs font-mono space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-semibold">
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Interactive What-If Grade Simulator ({currentSemester})</span>
          </div>
          <button
            onClick={toggleWhatIfMode}
            className="text-[11px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline cursor-pointer"
          >
            Turn Off
          </button>
        </div>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">
          No active coursework units found for <strong>{currentSemester}</strong>. Units in this semester will appear here for simulation once active.
        </p>
      </div>
    );
  }

  const applyPreset = (targetMark: number) => {
    semesterUnits.forEach((u) => {
      u.assessments.forEach((a) => {
        if (!a.completed && a.mark === null) {
          updateHypotheticalMark(u.id, a.id, targetMark);
        }
      });
    });
  };

  return (
    <div className="bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/60 rounded-xl p-4 sm:p-6 shadow-xs space-y-4">
      {/* Header & Batch Presets */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-200/60 dark:border-emerald-800/40">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <h3 className="text-sm font-bold text-emerald-950 dark:text-emerald-100">
              Interactive What-If Grade Simulator ({currentSemester})
            </h3>
          </div>
          <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">
            Simulate hypothetical assessment marks and test double-pass hurdle scenarios for {currentSemester}.
          </p>
        </div>

        {/* Quick Batch Presets */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 sm:pt-0">
          <span className="text-[11px] font-mono text-emerald-900 dark:text-emerald-300 font-medium mr-1">
            Fill All:
          </span>
          {[
            { label: '85% (HD)', mark: 85 },
            { label: '75% (D)', mark: 75 },
            { label: '65% (CR)', mark: 65 },
            { label: '50% (P)', mark: 50 },
          ].map((preset) => (
            <button
              key={preset.mark}
              onClick={() => applyPreset(preset.mark)}
              className="px-2.5 py-1 bg-white dark:bg-zinc-900 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-mono font-semibold rounded-lg hover:bg-emerald-50 dark:hover:bg-zinc-800 transition-colors shadow-2xs"
            >
              {preset.label}
            </button>
          ))}
          <button
            onClick={resetWhatIfMarks}
            className="flex items-center gap-1 px-2.5 py-1 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 text-xs font-mono transition-colors ml-1"
            title="Reset hypothetical inputs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Mobile Card View (Phone Screens) */}
      <div className="sm:hidden space-y-2.5">
        {semesterUnits.map((unit) => {
          const res = calculateUnitResult(unit, isWhatIfMode);
          const remainingWeight = 100 - res.completedWeight;
          const reqCredit = calculateRequiredMark(res.earnedMark, res.completedWeight, 65);
          const reqDistinction = calculateRequiredMark(res.earnedMark, res.completedWeight, 75);
          const hurdle = unit.assessments.find((a) => a.isHurdle);

          return (
            <div
              key={unit.id}
              className="p-3 bg-white dark:bg-zinc-900 border border-emerald-100 dark:border-emerald-900/60 rounded-xl space-y-2 text-xs font-mono"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                  {unit.code}
                </span>
                <span className="text-zinc-500">
                  Earned: {res.earnedMark} / {res.completedWeight}%
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800 text-[11px]">
                <div>
                  <span className="text-zinc-400 block">Req. for Credit (65):</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {remainingWeight <= 0
                      ? res.projectedFinalMark >= 65
                        ? 'Achieved ✓'
                        : '—'
                      : reqCredit.isPossible
                      ? `${Math.max(0, reqCredit.requiredMark)}%`
                      : 'Unreachable'}
                  </span>
                </div>

                <div>
                  <span className="text-zinc-400 block">Req. for Distinction (75):</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {remainingWeight <= 0
                      ? res.projectedFinalMark >= 75
                        ? 'Achieved ✓'
                        : '—'
                      : reqDistinction.isPossible
                      ? `${Math.max(0, reqDistinction.requiredMark)}%`
                      : 'Unreachable'}
                  </span>
                </div>
              </div>

              {hurdle && (
                <div className="text-[10px] text-amber-700 dark:text-amber-400 flex items-center gap-1 pt-0.5">
                  <ShieldCheck className="w-3 h-3 shrink-0" />
                  <span>
                    Hurdle: {hurdle.title} (≥ {hurdle.hurdleMinMark}%)
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop Target Analysis Table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="text-zinc-400 border-b border-emerald-100 dark:border-emerald-800/40">
              <th className="pb-2 font-normal">Unit Code</th>
              <th className="pb-2 font-normal">Earned / Weight</th>
              <th className="pb-2 font-normal">Remaining Weight</th>
              <th className="pb-2 font-normal">Req. for Credit (65)</th>
              <th className="pb-2 font-normal">Req. for Distinction (75)</th>
              <th className="pb-2 font-normal">Hurdle Minimum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-100/60 dark:divide-emerald-800/30">
            {semesterUnits.map((unit) => {
              const res = calculateUnitResult(unit, isWhatIfMode);
              const remainingWeight = 100 - res.completedWeight;
              const reqCredit = calculateRequiredMark(res.earnedMark, res.completedWeight, 65);
              const reqDistinction = calculateRequiredMark(res.earnedMark, res.completedWeight, 75);
              const hurdle = unit.assessments.find((a) => a.isHurdle);

              return (
                <tr key={unit.id} className="text-zinc-700 dark:text-zinc-300">
                  <td className="py-2.5 font-bold text-zinc-900 dark:text-zinc-100">{unit.code}</td>
                  <td className="py-2.5">
                    {res.earnedMark} / {res.completedWeight}%
                  </td>
                  <td className="py-2.5">{remainingWeight}%</td>
                  <td className="py-2.5">
                    {remainingWeight <= 0 ? (
                      res.projectedFinalMark >= 65 ? (
                        <span className="text-emerald-600 font-semibold">Achieved</span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )
                    ) : reqCredit.isPossible ? (
                      <span>{Math.max(0, reqCredit.requiredMark)}%</span>
                    ) : (
                      <span className="text-rose-500">Unreachable</span>
                    )}
                  </td>
                  <td className="py-2.5">
                    {remainingWeight <= 0 ? (
                      res.projectedFinalMark >= 75 ? (
                        <span className="text-emerald-600 font-semibold">Achieved</span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )
                    ) : reqDistinction.isPossible ? (
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {Math.max(0, reqDistinction.requiredMark)}%
                      </span>
                    ) : (
                      <span className="text-rose-500">Unreachable</span>
                    )}
                  </td>
                  <td className="py-2.5">
                    {hurdle ? (
                      <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                        ≥ {hurdle.hurdleMinMark}% ({hurdle.title.slice(0, 16)}...)
                      </span>
                    ) : (
                      <span className="text-zinc-400">None</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
