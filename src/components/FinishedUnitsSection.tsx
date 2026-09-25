import React, { useState } from 'react';
import { useDashboardStore } from '../store/useDashboardStore';
import { Unit } from '../types/dashboard';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Award,
  RotateCcw,
  Edit3,
  Calendar,
  Layers,
} from 'lucide-react';

export const FinishedUnitsSection: React.FC = () => {
  const { units, currentSemester, updateUnitStatus } = useDashboardStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [tempMark, setTempMark] = useState<string>('');

  // Finished units: either explicitly status === 'finished' or all assessments completed & marked
  const finishedUnits = units.filter(
    (u) =>
      u.status === 'finished' ||
      (u.status !== 'upcoming' &&
        u.assessments.length > 0 &&
        u.assessments.every((a) => a.completed && typeof a.mark === 'number'))
  );

  if (finishedUnits.length === 0) {
    return null;
  }

  // Calculate past units summary
  const totalCompletedCP = finishedUnits.reduce((acc, u) => acc + (u.creditPoints || 6), 0);
  const totalMarkCPProduct = finishedUnits.reduce((acc, u) => {
    const mark =
      typeof u.finalMark === 'number'
        ? u.finalMark
        : u.assessments.reduce(
            (sum, a) => sum + ((a.mark || 0) * a.weight) / 100,
            0
          );
    return acc + mark * (u.creditPoints || 6);
  }, 0);

  const pastWam = totalCompletedCP > 0 ? (totalMarkCPProduct / totalCompletedCP).toFixed(1) : '0.0';

  const handleStartEdit = (unit: Unit) => {
    const currentMark =
      typeof unit.finalMark === 'number'
        ? unit.finalMark
        : unit.assessments.reduce(
            (sum, a) => sum + ((a.mark || 0) * a.weight) / 100,
            0
          );
    setTempMark(String(Math.round(currentMark)));
    setEditingUnitId(unit.id);
  };

  const handleSaveMark = async (unitId: string) => {
    const num = parseFloat(tempMark);
    if (!isNaN(num) && num >= 0 && num <= 100) {
      await updateUnitStatus(unitId, 'finished', { finalMark: num });
    }
    setEditingUnitId(null);
  };

  const handleReactivate = async (unitId: string) => {
    await updateUnitStatus(unitId, 'active');
  };

  const getGradePill = (mark: number) => {
    if (mark >= 85) return { label: `${mark} HD`, color: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' };
    if (mark >= 75) return { label: `${mark} D`, color: 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-800' };
    if (mark >= 65) return { label: `${mark} CR`, color: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800' };
    if (mark >= 50) return { label: `${mark} P`, color: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700' };
    return { label: `${mark} FA`, color: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800' };
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs transition-all">
      {/* Collapsible Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer text-left"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200/60 dark:border-emerald-800/60">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 font-mono uppercase tracking-tight">
                Finished Units Archive ({finishedUnits.length})
              </h3>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                {totalCompletedCP} CP Completed
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 font-mono">
              Historical units contributing to cumulative WAM · Average: <strong className="text-emerald-600 dark:text-emerald-400">{pastWam}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-semibold text-zinc-500 hidden sm:inline">
            {isExpanded ? 'Hide' : 'Show Archive'}
          </span>
          <div className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </button>

      {/* Expanded Archive List */}
      {isExpanded && (
        <div className="border-t border-zinc-100 dark:border-zinc-800 p-4 sm:p-5 space-y-3 bg-zinc-50/40 dark:bg-zinc-950/40 animate-in slide-in-from-top-1 duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {finishedUnits.map((unit) => {
              const mark =
                typeof unit.finalMark === 'number'
                  ? unit.finalMark
                  : unit.assessments.reduce(
                      (sum, a) => sum + ((a.mark || 0) * a.weight) / 100,
                      0
                    );
              const pill = getGradePill(Math.round(mark));
              const isEditing = editingUnitId === unit.id;

              return (
                <div
                  key={unit.id}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 rounded-xl p-3.5 space-y-2.5 shadow-2xs relative group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-zinc-950 dark:text-zinc-50">
                          {unit.code}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400">
                          {unit.creditPoints} CP
                        </span>
                      </div>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate">
                        {unit.name}
                      </p>
                    </div>

                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={tempMark}
                          onChange={(e) => setTempMark(e.target.value)}
                          className="w-14 px-1.5 py-0.5 text-xs font-mono font-bold text-center border border-emerald-500 rounded bg-zinc-50 dark:bg-zinc-800"
                          min="0"
                          max="100"
                        />
                        <button
                          onClick={() => handleSaveMark(unit.id)}
                          className="px-2 py-0.5 text-[10px] bg-emerald-600 text-white font-mono rounded"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <span
                        onClick={() => handleStartEdit(unit)}
                        className={`px-2 py-0.5 rounded text-xs font-mono font-bold border cursor-pointer hover:opacity-80 transition-opacity ${pill.color}`}
                        title="Click to edit recorded official mark"
                      >
                        {pill.label}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-zinc-400" />
                      <span>{unit.semester}</span>
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleStartEdit(unit)}
                        className="hover:text-zinc-700 dark:hover:text-zinc-200 flex items-center gap-0.5"
                        title="Edit Mark"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <span>·</span>
                      <button
                        onClick={() => handleReactivate(unit.id)}
                        className="text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-0.5"
                        title="Move back to active current semester"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reactivate</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
