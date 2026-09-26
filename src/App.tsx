import React, { useState, useEffect } from 'react';
import { useDashboardStore } from './store/useDashboardStore';
import { STANDARD_SEMESTERS } from './lib/semesters';
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
import { DegreePlanModal } from './components/DegreePlanModal';
import { FinishedUnitsSection } from './components/FinishedUnitsSection';
import { UpcomingUnitsSection } from './components/UpcomingUnitsSection';
import { GeminiChatbot } from './components/GeminiChatbot';
import { useTheme } from './lib/theme';
import {
  BookOpen,
  Sparkles,
  Plus,
  Loader2,
  FileUp,
  BookMarked,
  Calendar,
} from 'lucide-react';

export default function App() {
  useTheme();
  const {
    units,
    currentSemester,
    setCurrentSemester,
    isAuthenticated,
    isOnboarded,
    isAuthLoading,
    initAuthListener,
  } = useDashboardStore();

  const [isSyllabusOpen, setIsSyllabusOpen] = useState(false);
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);
  const [isDegreePlanOpen, setIsDegreePlanOpen] = useState(false);

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

  // Active units are strictly:
  // 1. NOT finished (past units stay in Finished Units Archive)
  // 2. NOT upcoming (future units stay in Upcoming Planned Units)
  // 3. Exactly match the selected currentSemester
  // 4. Have active syllabus / assessment data uploaded
  const activeUnits = units.filter((u) => {
    if (u.status === 'finished' || u.status === 'upcoming') {
      return false;
    }
    const unitSemester = u.semester ? u.semester.trim().toLowerCase() : '';
    const activeSemester = currentSemester ? currentSemester.trim().toLowerCase() : '';
    const matchesSemester = Boolean(unitSemester && activeSemester && unitSemester === activeSemester);
    const hasActiveSyllabus = Boolean(u.syllabusUploaded || (u.assessments && u.assessments.length > 0));
    return matchesSemester && hasActiveSyllabus;
  });

  const availableSemesters = Array.from(
    new Set([
      ...STANDARD_SEMESTERS,
      currentSemester,
      ...units.map((u) => u.semester?.trim()).filter(Boolean) as string[],
    ])
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col antialiased selection:bg-emerald-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        onOpenSyllabusModal={() => setIsSyllabusOpen(true)}
        onOpenCanvasModal={() => setIsCanvasOpen(true)}
        onOpenAddUnitModal={() => setIsAddUnitOpen(true)}
        onOpenDegreePlanModal={() => setIsDegreePlanOpen(true)}
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
          {/* Main Units Column */}
          <section className="lg:col-span-8 space-y-6">
            {/* 1. Finished Units Archive (Hideable / Collapsible Section) */}
            <FinishedUnitsSection />

            {/* 2. Active Enrolled Units for Current Term */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between pb-3 border-b border-zinc-200/80 dark:border-zinc-800 gap-2.5">
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold tracking-tight uppercase text-zinc-900 dark:text-zinc-100 font-mono">
                      Active Units ({activeUnits.length})
                    </h2>

                    {/* Current Semester Selector Dropdown */}
                    <div className="flex items-center gap-1.5 ml-2">
                      <span className="text-zinc-400 text-xs font-mono hidden sm:inline">·</span>
                      <div className="relative inline-flex items-center">
                        <select
                          value={currentSemester}
                          onChange={(e) => setCurrentSemester(e.target.value)}
                          className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-mono font-semibold py-1 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          title="Select current academic term"
                        >
                          {availableSemesters.map((sem) => (
                            <option key={sem} value={sem}>
                              {sem}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>


                {/* Header Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsSyllabusOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    title="Upload unit outline PDF to extract assessments"
                  >
                    <FileUp className="w-3.5 h-3.5" />
                    <span>Upload Syllabus</span>
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

              {/* List of Active Units */}
              {activeUnits.length === 0 ? (
                <div className="p-8 bg-white dark:bg-zinc-900 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl text-center space-y-4">
                  <BookOpen className="w-10 h-10 text-zinc-400 mx-auto" />
                  <div>
                    <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
                      No active units for {currentSemester}
                    </h3>
                    <p className="text-xs text-zinc-500 font-mono mt-1 max-w-md mx-auto">
                      Upload your course syllabus outline PDF to extract your assessment schedule, or enroll from your upcoming planned units below.
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
                  {activeUnits.map((unit) => (
                    <UnitCard key={unit.id} unit={unit} />
                  ))}
                </div>
              )}
            </div>

            {/* 3. Upcoming Planned Units Roadmap (Hideable / Collapsible Section) */}
            <UpcomingUnitsSection
              onOpenDegreePlanModal={() => setIsDegreePlanOpen(true)}
              onOpenSyllabusModal={() => setIsSyllabusOpen(true)}
              onOpenAddUnitModal={() => setIsAddUnitOpen(true)}
            />
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
                  <strong className="text-zinc-900 dark:text-zinc-200">Weighted Average Mark (WAM):</strong> Calculated purely across all finished and active units as Σ(CP × Mark) / Σ(CP) weighted by credit points.
                </p>
                <p>
                  <strong className="text-zinc-900 dark:text-zinc-200">Degree Progression:</strong> Upload your degree plan photo to populate your entire study pathway and attach unit outlines as they are published.
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

      <DegreePlanModal
        isOpen={isDegreePlanOpen}
        onClose={() => setIsDegreePlanOpen(false)}
      />

      {/* Multi-turn Gemini Academic Advisor Chatbot */}
      <GeminiChatbot />
    </div>
  );
}
