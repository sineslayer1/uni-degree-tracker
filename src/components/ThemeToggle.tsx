import React from 'react';
import { useTheme, ThemeMode } from '../lib/theme';
import { Sun, Moon, Laptop } from 'lucide-react';

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const options: { mode: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'light', label: 'Light', icon: <Sun className="w-3.5 h-3.5" /> },
    { mode: 'system', label: 'Auto', icon: <Laptop className="w-3.5 h-3.5" /> },
    { mode: 'dark', label: 'Dark', icon: <Moon className="w-3.5 h-3.5" /> },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Theme selection"
      className="flex items-center p-0.5 bg-zinc-100 dark:bg-zinc-800/80 rounded-lg border border-zinc-200/60 dark:border-zinc-700/60"
    >
      {options.map((opt) => {
        const isActive = theme === opt.mode;
        return (
          <button
            key={opt.mode}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => setTheme(opt.mode)}
            className={`p-1.5 rounded-md text-xs font-mono transition-all flex items-center justify-center cursor-pointer ${
              isActive
                ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-50 shadow-2xs font-semibold'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
            title={`Switch to ${opt.label} mode`}
          >
            {opt.icon}
            <span className="sr-only">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};
