import React, { useState, useEffect } from 'react';
import { useDashboardStore } from './store/useDashboardStore';
import { Navbar } from './components/Navbar';
import { LoginView } from './components/LoginView';
import { OnboardingFlow } from './components/OnboardingFlow';
import { WamSummaryCard } from './components/WamSummaryCard';
import { WhatIfEngine } from './components/WhatIfEngine';
import { UnitCard } from './components/UnitCard';
import { MicroTasker } from './components/MicroTasker';
import { SyllabusIngestionModal } from './components/SyllabusIngestionModal';
import { CanvasSyncModal } from './components/CanvasSyncModal';
import { AddUnitModal } from './components/AddUnitModal';
import { BookOpen, Sparkles, Plus, Loader2, FileUp } from 'lucide-react';

export default function App() {
  const {
    units,
    isAuthenticated,
    isOnboarded,
    isAuthLoading,
    initAuthListener,
  } = useDashboardStore();

  const [isSyllabusOpen, setIsSyllabusOpen] = useState(false);
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = initAuthListener();
    return () => unsubscribe();
  }, [initAuthListener]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-900 dark:text-zinc-100" />
        <span className="text-xs font-mono text-zinc-500">
          Loading student profile...
        </span>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return <LoginView />;
  }

  // Authenticated but hasn't completed initial onboarding
  if (!isOnboarded) {
    return <OnboardingFlow />;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col antialiased selection:bg-emerald-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        onOpenSyllabusModal={() => setIsSyllabusOpen(true)}
        onOpenCanvasModal={() => setIsCanvasOpen(true)}
        onOpenAddUnitModal={() => setIsAddUnitOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Metric Summary Card (WAM / SAM, Academic Standing, Hurdle Status) */}
        <section aria-label="Academic Metrics Summary">
          <WamSummaryCard />
        </section>

        {/* What-If Forecasting Engine */}
        <section aria-label="What-If Projection Engine">
          <WhatIfEngine />
        </section>

        {/* Units & Tasks Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Units Column */}
          <section className="lg:col-span-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between pb-3 border-b border-zinc-200/80 dark:border-zinc-800 gap-2">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                <h2 className="text-sm font-semibold tracking-tight uppercase text-zinc-900 dark:text-zinc-100 font-mono">
                  Enrolled Units ({units.length})
                </h2>
              </div>

              {/* Prominent Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsSyllabusOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  title="Upload unit outline PDF to extract assessments"
                >
                  <FileUp className="w-3.5 h-3.5" />
                  <span>Upload Syllabus (PDF)</span>
                </button>
                <button
                  onClick={() => setIsAddUnitOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Manual Add</span>
                </button>
              </div>
            </div>

            {/* List of Units */}
            {units.length === 0 ? (
              <div className="p-8 bg-white dark:bg-zinc-900 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl text-center space-y-4">
                <BookOpen className="w-10 h-10 text-zinc-400 mx-auto" />
                <div>
                  <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
                    No units enrolled yet
                  </h3>
                  <p className="text-xs text-zinc-500 font-mono mt-1 max-w-md mx-auto">
                    Upload your course syllabus PDF to automatically extract your assessment schedule, or manually add your units.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setIsSyllabusOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs shadow-xs transition-colors"
                  >
                    <FileUp className="w-4 h-4" />
                    <span>Upload Syllabus Outline (PDF)</span>
                  </button>
                  <button
                    onClick={() => setIsAddUnitOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs font-mono font-medium hover:bg-zinc-200"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Manual Add Unit</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {units.map((unit) => (
                  <UnitCard key={unit.id} unit={unit} />
                ))}
              </div>
            )}
          </section>

          {/* Sidebar Column: Canvas Micro-Tasker & Course Policies */}
          <aside className="lg:col-span-4 space-y-6">
            {/* Canvas Micro-Tasker */}
            <MicroTasker />

            {/* Course Policies Reference */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl p-5 text-xs font-mono space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-[11px]">
                  Academic Policies & Hurdle Rules
                </span>
                <span className="text-[10px] text-zinc-400">USYD Handbook</span>
              </div>

              <div className="space-y-2 text-zinc-600 dark:text-zinc-400 leading-relaxed text-[11px]">
                <p>
                  <strong className="text-zinc-900 dark:text-zinc-200">Double-Pass Exam Hurdles:</strong> Missing an exam hurdle triggers an automatic UF / 45 FA grade regardless of coursework marks.
                </p>
                <p>
                  <strong className="text-zinc-900 dark:text-zinc-200">Weighted Average Mark (WAM):</strong> Calculated purely across all units as Σ(CP × Mark) / Σ(CP) weighted by credit points.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Modals & Slide-overs */}
      <SyllabusIngestionModal
        isOpen={isSyllabusOpen}
        onClose={() => setIsSyllabusOpen(false)}
      />

      <CanvasSyncModal
        isOpen={isCanvasOpen}
        onClose={() => setIsCanvasOpen(false)}
      />

      <AddUnitModal
        isOpen={isAddUnitOpen}
        onClose={() => setIsAddUnitOpen(false)}
      />
    </div>
  );
}
