import React, { useState } from 'react';
import { useDashboardStore } from '../store/useDashboardStore';
import { downloadAcademicCsv } from '../lib/export-csv';
import { ThemeToggle } from './ThemeToggle';
import {
  Sparkles,
  Calendar,
  FileUp,
  Plus,
  LogOut,
  Menu,
  X,
  Download,
  BookMarked,
} from 'lucide-react';

interface NavbarProps {
  onOpenSyllabusModal: () => void;
  onOpenCanvasModal: () => void;
  onOpenAddUnitModal: () => void;
  onOpenDegreePlanModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSyllabusModal,
  onOpenCanvasModal,
  onOpenAddUnitModal,
  onOpenDegreePlanModal,
}) => {
  const {
    units,
    isWhatIfMode,
    toggleWhatIfMode,
    metricView,
    setMetricView,
    userEmail,
    displayName,
    degreeName,
    targetWam,
    photoURL,
    syncStatus,
    logout,
  } = useDashboardStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleExportCsv = () => {
    downloadAcademicCsv({
      units,
      isWhatIfMode,
      metricView,
      studentName: displayName || undefined,
      studentEmail: userEmail || undefined,
      degreeName,
      targetWam,
    });
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-4">
          {/* Logo & Student Identity */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            {photoURL ? (
              <img
                src={photoURL}
                alt={displayName || 'User'}
                className="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-700 object-cover shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 flex items-center justify-center font-bold text-xs font-mono shrink-0">
                {displayName ? displayName[0]?.toUpperCase() : 'U'}
              </div>
            )}

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 truncate">
                <span className="font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 text-sm sm:text-base truncate">
                  Apex
                </span>
                <span className="text-zinc-400 dark:text-zinc-600 font-mono text-xs">/</span>
                <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400 truncate">
                  {displayName || 'Student'}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-zinc-500 font-mono">
                <span
                  className={`inline-flex items-center gap-1 font-medium ${
                    syncStatus === 'synced'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : syncStatus === 'saving'
                      ? 'text-amber-500'
                      : 'text-zinc-400'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      syncStatus === 'synced'
                        ? 'bg-emerald-500'
                        : syncStatus === 'saving'
                        ? 'bg-amber-500 animate-pulse'
                        : 'bg-zinc-400'
                    }`}
                  />
                  <span>
                    {syncStatus === 'synced' ? 'Synced' : syncStatus === 'saving' ? 'Saving' : 'Local'}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Metric View Segmented Control */}
          <div className="hidden xl:flex items-center p-1 bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200/60 dark:border-zinc-800">
            {(['WAM', 'SAM'] as const).map((view) => (
              <button
                key={view}
                onClick={() => setMetricView(view)}
                className={`px-3 py-1.5 text-xs font-mono font-medium rounded-md transition-all ${
                  metricView === view
                    ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-100 shadow-xs border border-zinc-200/50 dark:border-zinc-700'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                {view}
              </button>
            ))}
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Theme Toggle (Light / Dark / System) */}
            <ThemeToggle />

            {/* Prominent Upload Syllabus Button */}
            <button
              onClick={onOpenSyllabusModal}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs cursor-pointer shrink-0"
              title="Upload unit outline PDF to extract assessments"
            >
              <FileUp className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Upload Syllabus</span>
              <span className="sm:hidden">Syllabus</span>
            </button>

            {/* Export CSV Data Button */}
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-mono font-medium transition-colors shadow-2xs cursor-pointer shrink-0"
              title="Download academic record, WAM, and hurdle summary as CSV"
            >
              <Download className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
              <span className="hidden md:inline">Export CSV</span>
            </button>

            {/* Degree Plan Photo / Roadmap Button */}
            {onOpenDegreePlanModal && (
              <button
                onClick={onOpenDegreePlanModal}
                className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg text-xs font-mono font-medium transition-colors shadow-2xs shrink-0 cursor-pointer"
                title="Upload Degree Plan Photo / Progression Roadmap"
              >
                <BookMarked className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Degree Plan</span>
              </button>
            )}

            {/* What-If Toggle */}
            <button
              onClick={toggleWhatIfMode}
              className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all shrink-0 ${
                isWhatIfMode
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 shadow-xs'
                  : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
              }`}
              title="Toggle hypothetical grades for upcoming assessments"
            >
              <Sparkles
                className={`w-3.5 h-3.5 ${
                  isWhatIfMode ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'
                }`}
              />
              <span className="font-mono hidden sm:inline">What-If:</span>
              <span
                className={`font-semibold ${
                  isWhatIfMode ? 'text-emerald-700 dark:text-emerald-300' : 'text-zinc-500'
                }`}
              >
                {isWhatIfMode ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* Canvas Sync Button */}
            <button
              onClick={onOpenCanvasModal}
              className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg text-xs font-medium transition-colors shadow-xs shrink-0"
              title="Sync Canvas LMS Calendar"
            >
              <Calendar className="w-3.5 h-3.5 text-zinc-500" />
              <span>Canvas</span>
            </button>

            {/* Quick Add Unit Button */}
            <button
              onClick={onOpenAddUnitModal}
              className="p-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-lg transition-colors shrink-0"
              title="Manual Add Unit"
              aria-label="Add Unit"
            >
              <Plus className="w-4 h-4" />
            </button>

            {/* Mobile Menu Button for additional options */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg shrink-0"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Desktop Logout Button */}
            <button
              onClick={logout}
              className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-100 hover:bg-rose-50 hover:text-rose-700 dark:bg-zinc-800 dark:hover:bg-rose-950 dark:hover:text-rose-300 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-mono transition-colors shrink-0"
              title="Sign out of Google account"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2.5 animate-in slide-in-from-top duration-150">
            {/* Mobile Metric Switcher */}
            <div className="flex items-center justify-between p-2 bg-zinc-100 dark:bg-zinc-900 rounded-xl">
              <span className="text-xs font-mono text-zinc-500">Metric View:</span>
              <div className="flex items-center gap-1">
                {(['WAM', 'SAM'] as const).map((view) => (
                  <button
                    key={view}
                    onClick={() => {
                      setMetricView(view);
                      setMobileMenuOpen(false);
                    }}
                    className={`px-3 py-1 text-xs font-mono font-bold rounded-lg transition-all ${
                      metricView === view
                        ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-xs'
                        : 'text-zinc-500'
                    }`}
                  >
                    {view}
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => {
                  handleExportCsv();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl text-xs font-semibold shadow-2xs border border-zinc-200 dark:border-zinc-700"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export CSV</span>
              </button>

              {onOpenDegreePlanModal && (
                <button
                  onClick={() => {
                    onOpenDegreePlanModal();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200 rounded-xl text-xs font-semibold"
                >
                  <BookMarked className="w-3.5 h-3.5 text-teal-600" />
                  <span>Degree Plan</span>
                </button>
              )}

              <button
                onClick={() => {
                  onOpenCanvasModal();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-semibold"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Canvas Sync</span>
              </button>
            </div>

            {/* User Info & Logout on Mobile */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/80 text-xs font-mono text-zinc-400">
              <span className="truncate max-w-[200px]">{userEmail}</span>
              <button
                onClick={logout}
                className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold p-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
