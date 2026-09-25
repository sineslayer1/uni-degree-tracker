import React, { useState } from 'react';
import { Sparkles, AlertTriangle, CheckCircle2, RotateCcw, X, Edit2 } from 'lucide-react';

interface GradeSliderProps {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  isWhatIf?: boolean;
  isHurdle?: boolean;
  hurdleMinMark?: number;
  label?: string;
  weight?: number;
  disabled?: boolean;
}

export const GradeSlider: React.FC<GradeSliderProps> = ({
  value,
  onChange,
  isWhatIf = false,
  isHurdle = false,
  hurdleMinMark = 45,
  label,
  weight,
  disabled = false,
}) => {
  const [isManualInput, setIsManualInput] = useState(false);
  const [tempManualValue, setTempManualValue] = useState('');

  const hasValue = typeof value === 'number' && !isNaN(value);
  const currentVal = hasValue ? value : 0;

  // Grade classification
  const getGradeTier = (mark: number) => {
    if (isHurdle && mark < hurdleMinMark) return { code: 'UF', name: 'Hurdle Missed', color: 'rose' };
    if (mark >= 85) return { code: 'HD', name: 'High Distinction', color: 'emerald' };
    if (mark >= 75) return { code: 'D', name: 'Distinction', color: 'teal' };
    if (mark >= 65) return { code: 'CR', name: 'Credit', color: 'blue' };
    if (mark >= 50) return { code: 'P', name: 'Pass', color: 'zinc' };
    return { code: 'FA', name: 'Fail', color: 'rose' };
  };

  const tier = hasValue ? getGradeTier(currentVal) : null;
  const isBreachingHurdle = isHurdle && hasValue && currentVal < hurdleMinMark;
  const isClearingHurdle = isHurdle && hasValue && currentVal >= hurdleMinMark;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    onChange(Math.max(0, Math.min(100, isNaN(val) ? 0 : val)));
  };

  const handlePreset = (presetVal: number) => {
    onChange(presetVal);
  };

  const handleNudge = (delta: number) => {
    const base = hasValue ? currentVal : 50;
    const next = Math.max(0, Math.min(100, base + delta));
    onChange(next);
  };

  const handleClear = () => {
    onChange(null);
    setIsManualInput(false);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempManualValue === '') {
      onChange(null);
    } else {
      const num = Number(tempManualValue);
      if (!isNaN(num)) {
        onChange(Math.max(0, Math.min(100, Math.round(num * 10) / 10)));
      }
    }
    setIsManualInput(false);
  };

  return (
    <div className="w-full space-y-2 select-none">
      {/* Top Row: Label, Hurdle Status Badge & Value Display */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 min-w-0">
          {isWhatIf ? (
            <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-1.5 py-0.5 rounded">
              <Sparkles className="w-3 h-3" />
              <span>{label || 'What-If Grade'}</span>
            </span>
          ) : (
            <span className="font-mono text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
              {label || 'Grade / Mark'}:
            </span>
          )}

          {/* Hurdle Badge */}
          {isHurdle && hasValue && (
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                isBreachingHurdle
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 animate-pulse'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              }`}
            >
              {isBreachingHurdle ? (
                <>
                  <AlertTriangle className="w-3 h-3" />
                  <span>Hurdle Fail &lt; {hurdleMinMark}%</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Hurdle Met ≥ {hurdleMinMark}%</span>
                </>
              )}
            </span>
          )}
        </div>

        {/* Value Display / Manual Input Toggle */}
        <div className="flex items-center gap-1.5 shrink-0">
          {!isManualInput ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setTempManualValue(hasValue ? String(currentVal) : '');
                  setIsManualInput(true);
                }}
                className={`font-mono font-bold text-sm px-2 py-0.5 rounded border transition-colors flex items-center gap-1 ${
                  !hasValue
                    ? 'text-zinc-400 bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700'
                    : isBreachingHurdle
                    ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800'
                    : isWhatIf
                    ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800'
                    : 'text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700'
                }`}
                title="Click to type exact mark"
              >
                <span>{hasValue ? `${currentVal}%` : 'Not Set (—)'}</span>
                {tier && <span className="text-[10px] opacity-70">({tier.code})</span>}
                <Edit2 className="w-2.5 h-2.5 opacity-40 ml-0.5" />
              </button>

              {hasValue && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1 text-zinc-400 hover:text-rose-600 transition-colors rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  title="Clear grade"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <form onSubmit={handleManualSubmit} className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                autoFocus
                value={tempManualValue}
                onChange={(e) => setTempManualValue(e.target.value)}
                placeholder="0-100"
                className="w-16 px-1.5 py-0.5 text-xs font-mono font-bold bg-white dark:bg-zinc-800 border border-zinc-400 dark:border-zinc-600 rounded text-center"
              />
              <button
                type="submit"
                className="px-2 py-0.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded text-xs font-mono font-semibold"
              >
                OK
              </button>
              <button
                type="button"
                onClick={() => setIsManualInput(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-3 h-3" />
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Main Slider Track */}
      <div className="relative pt-1 pb-1">
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          disabled={disabled}
          value={hasValue ? currentVal : 0}
          onChange={handleSliderChange}
          className={`w-full h-2.5 rounded-lg appearance-none cursor-pointer transition-all ${
            disabled ? 'opacity-40 cursor-not-allowed' : ''
          } ${
            !hasValue
              ? 'bg-zinc-200 dark:bg-zinc-800 accent-zinc-500'
              : isBreachingHurdle
              ? 'bg-rose-200 dark:bg-rose-950/80 accent-rose-600'
              : isWhatIf
              ? 'bg-emerald-200 dark:bg-emerald-950/80 accent-emerald-600'
              : 'bg-zinc-200 dark:bg-zinc-800 accent-zinc-900 dark:accent-zinc-100'
          }`}
          style={{
            touchAction: 'manipulation',
          }}
        />

        {/* Hurdle Threshold Marker Line */}
        {isHurdle && (
          <div
            className="absolute top-1 bottom-1 pointer-events-none flex flex-col items-center"
            style={{ left: `${hurdleMinMark}%` }}
          >
            <div className="w-0.5 h-full bg-rose-500/80 dark:bg-rose-400" />
            <span className="text-[9px] font-mono font-bold text-rose-600 dark:text-rose-400 -mt-0.5 whitespace-nowrap">
              | {hurdleMinMark}%
            </span>
          </div>
        )}
      </div>

      {/* Mobile-Friendly Quick Presets & Nudge Controls */}
      <div className="flex items-center justify-between gap-1 pt-0.5 overflow-x-auto no-scrollbar text-[11px] font-mono">
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => handleNudge(-5)}
            className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-[10px]"
            title="Minus 5%"
          >
            -5%
          </button>
          <button
            type="button"
            onClick={() => handleNudge(5)}
            className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-[10px]"
            title="Plus 5%"
          >
            +5%
          </button>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {[
            { label: '50 P', val: 50 },
            { label: '65 CR', val: 65 },
            { label: '75 D', val: 75 },
            { label: '85 HD', val: 85 },
          ].map((p) => {
            const isSelected = hasValue && Math.round(currentVal) === p.val;
            return (
              <button
                key={p.val}
                type="button"
                onClick={() => handlePreset(p.val)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                  isSelected
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
