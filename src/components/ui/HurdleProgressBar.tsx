import React from 'react';
import { Lock, Unlock, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface HurdleProgressBarProps {
  currentValue: number; // e.g. 35
  projectedValue?: number; // e.g. 78 (with what-if)
  maxValue?: number; // default 100
  isHurdle?: boolean;
  hurdleMinMark?: number; // e.g. 45
  hurdleStatus?: 'pending' | 'passed' | 'failed';
  label?: string;
  showValues?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const HurdleProgressBar: React.FC<HurdleProgressBarProps> = ({
  currentValue,
  projectedValue,
  maxValue = 100,
  isHurdle = false,
  hurdleMinMark = 45,
  hurdleStatus = 'pending',
  label,
  showValues = true,
  size = 'md',
  className = '',
}) => {
  const currentPct = Math.min(100, Math.max(0, (currentValue / maxValue) * 100));
  const hasProjection = typeof projectedValue === 'number' && projectedValue > currentValue;
  const projectedPct = hasProjection ? Math.min(100, Math.max(0, (projectedValue! / maxValue) * 100)) : 0;
  const ghostPct = Math.max(0, projectedPct - currentPct);

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-3.5',
  };

  // Determine track & bar colors
  let solidBarClass = 'bg-zinc-900 dark:bg-zinc-100';
  let hurdleBadgeClass = 'text-zinc-500';

  if (isHurdle) {
    if (hurdleStatus === 'failed') {
      solidBarClass = 'bg-rose-600';
      hurdleBadgeClass = 'text-rose-600 dark:text-rose-400 font-semibold';
    } else if (hurdleStatus === 'passed') {
      solidBarClass = 'bg-emerald-600';
      hurdleBadgeClass = 'text-emerald-600 dark:text-emerald-400';
    } else {
      // Pending hurdle
      solidBarClass = 'bg-amber-600';
      hurdleBadgeClass = 'text-amber-600 dark:text-amber-400';
    }
  }

  return (
    <div className={`w-full ${className}`}>
      {(label || showValues || isHurdle) && (
        <div className="flex items-center justify-between text-xs mb-1.5 font-mono">
          <div className="flex items-center gap-1.5">
            {isHurdle && (
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono tracking-tight uppercase ${
                hurdleStatus === 'failed'
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                  : hurdleStatus === 'passed'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                  : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-900'
              }`}>
                {hurdleStatus === 'passed' ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                ) : hurdleStatus === 'failed' ? (
                  <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                ) : (
                  <Lock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                )}
                <span>HURDLE ≥{hurdleMinMark}%</span>
              </span>
            )}
            {label && <span className="text-zinc-700 dark:text-zinc-300 font-medium font-sans">{label}</span>}
          </div>

          {showValues && (
            <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 tabular-nums">
              <span>{Math.round(currentValue * 10) / 10}</span>
              {hasProjection && (
                <>
                  <span className="text-zinc-400">→</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    {Math.round(projectedValue! * 10) / 10}
                  </span>
                </>
              )}
              <span className="text-zinc-400">/ {maxValue}</span>
            </div>
          )}
        </div>
      )}

      {/* Progress Track */}
      <div className={`relative w-full ${heightClasses[size]} bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden border border-zinc-200/60 dark:border-zinc-700/60`}>
        {/* Hurdle Threshold Marker Line */}
        {isHurdle && (
          <div
            className="absolute top-0 bottom-0 w-[2px] bg-zinc-900 dark:bg-zinc-100 z-20 opacity-80"
            style={{ left: `${hurdleMinMark}%` }}
            title={`Hurdle threshold: ${hurdleMinMark}%`}
          />
        )}

        {/* Current Earned Bar */}
        <div
          className={`h-full transition-all duration-300 ease-out ${solidBarClass}`}
          style={{ width: `${currentPct}%` }}
        />

        {/* What-If Projected Extension (Striped Ghost Bar) */}
        {hasProjection && (
          <div
            className={`absolute top-0 h-full transition-all duration-300 ease-out z-10 ${
              isHurdle && hurdleStatus === 'failed'
                ? 'bg-rose-300 dark:bg-rose-800/60'
                : 'bg-emerald-400/80 dark:bg-emerald-500/50'
            }`}
            style={{
              left: `${currentPct}%`,
              width: `${ghostPct}%`,
              backgroundImage:
                'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0, 0, 0, 0.12) 4px, rgba(0, 0, 0, 0.12) 8px)',
            }}
          />
        )}
      </div>
    </div>
  );
};
