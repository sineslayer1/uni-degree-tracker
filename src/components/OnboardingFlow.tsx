import React, { useState } from 'react';
import { useDashboardStore } from '../store/useDashboardStore';
import { Unit, Assessment } from '../types/dashboard';
import {
  GraduationCap,
  Target,
  User,
  Plus,
  Trash2,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

export const OnboardingFlow: React.FC = () => {
  const { displayName, degreeName, targetWam, setOnboardingData } = useDashboardStore();

  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 Form
  const [preferredName, setPreferredName] = useState(displayName || '');
  const [selectedDegree, setSelectedDegree] = useState(degreeName || '');
  const [wamGoal, setWamGoal] = useState<number>(targetWam || 75);

  // Step 2 Form
  const [stagedUnits, setStagedUnits] = useState<Unit[]>([]);

  // Unit input form
  const [customCode, setCustomCode] = useState('');
  const [customName, setCustomName] = useState('');
  const [customCP, setCustomCP] = useState(6);
  const [customScheme, setCustomScheme] = useState<'standard' | 'foundation_plus_advanced'>(
    'standard'
  );

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!preferredName.trim() || !selectedDegree.trim()) return;
    setStep(2);
  };

  const handleAddCustomUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCode.trim() || !customName.trim()) return;

    const formattedCode = customCode.trim().toUpperCase();
    const isFoundation = customScheme === 'foundation_plus_advanced';

    const defaultAssessments: Assessment[] = isFoundation
      ? [
          {
            id: `a-f1-${Date.now()}`,
            unitId: `unit-${formattedCode.toLowerCase()}`,
            title: 'Foundation Requirement (Test/Assignment)',
            weight: 0,
            mark: null,
            isHurdle: true,
            hurdleMinMark: 100,
            hurdleDescription: 'Required to unlock the 50 P baseline',
            completed: false,
            kind: 'foundation_requirement',
            isCompetencyPassed: false,
          },
          {
            id: `a-adv-${Date.now()}`,
            unitId: `unit-${formattedCode.toLowerCase()}`,
            title: 'Advanced Assessment / Project',
            weight: 50,
            mark: null,
            isHurdle: false,
            hurdleMinMark: 0,
            completed: false,
            kind: 'advanced_extension',
            hypotheticalMark: null,
          },
        ]
      : [
          {
            id: `a-1-${Date.now()}`,
            unitId: `unit-${formattedCode.toLowerCase()}`,
            title: 'Coursework / Assignment',
            weight: 40,
            mark: null,
            isHurdle: false,
            hurdleMinMark: 0,
            completed: false,
            kind: 'standard',
            hypotheticalMark: null,
          },
          {
            id: `a-2-${Date.now()}`,
            unitId: `unit-${formattedCode.toLowerCase()}`,
            title: 'Final Examination',
            weight: 60,
            mark: null,
            isHurdle: true,
            hurdleMinMark: 45,
            hurdleDescription: 'Must achieve ≥ 45% in final exam to pass',
            completed: false,
            kind: 'standard',
            hypotheticalMark: null,
          },
        ];

    const newUnit: Unit = {
      id: `unit-${formattedCode.toLowerCase()}-${Date.now().toString(36)}`,
      code: formattedCode,
      name: customName.trim(),
      creditPoints: Number(customCP),
      semester: 'Semester 1, 2026',
      year: 2026,
      gradingScheme: customScheme,
      assessments: defaultAssessments,
    };

    setStagedUnits([...stagedUnits, newUnit]);
    setCustomCode('');
    setCustomName('');
  };

  const handleRemoveStagedUnit = (id: string) => {
    setStagedUnits(stagedUnits.filter((u) => u.id !== id));
  };

  const handleFinalize = async () => {
    await setOnboardingData({
      preferredName: preferredName.trim(),
      degreeName: selectedDegree.trim(),
      targetWam: Number(wamGoal),
      units: stagedUnits,
    });
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 antialiased selection:bg-zinc-900 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-8 px-2">
          <div className="flex items-center gap-3">
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-bold ${
                step === 1
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {step > 1 ? '✓' : '1'}
            </span>
            <span
              className={`text-xs font-mono font-medium ${
                step === 1 ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'
              }`}
            >
              Your Details
            </span>
          </div>

          <div className="w-12 h-px bg-zinc-200 dark:bg-zinc-800" />

          <div className="flex items-center gap-3">
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-bold ${
                step === 2
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
              }`}
            >
              2
            </span>
            <span
              className={`text-xs font-mono font-medium ${
                step === 2 ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'
              }`}
            >
              Your Units
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div className="bg-white dark:bg-zinc-900 p-8 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs space-y-6">
          {step === 1 ? (
            /* STEP 1: Academic Profile */
            <form onSubmit={handleStep1Submit} className="space-y-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
                  Welcome to Apex Engineering
                </h2>
                <p className="mt-1 text-xs text-zinc-500 font-mono">
                  Please enter your details to set up your academic profile.
                </p>
              </div>

              {/* Preferred Name */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                  <User className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Your Name</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex, Sarah, Jordan..."
                  value={preferredName}
                  onChange={(e) => setPreferredName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              {/* Degree Name */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                  <GraduationCap className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Degree Name</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter your exact degree (e.g. Bachelor of Engineering Honours, Computer Science, etc.)"
                  value={selectedDegree}
                  onChange={(e) => setSelectedDegree(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              {/* Target WAM */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                    <Target className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Target WAM Goal</span>
                  </label>
                  <span className="text-base font-mono font-bold text-zinc-950 dark:text-zinc-50">
                    {wamGoal.toFixed(1)}
                  </span>
                </div>

                <input
                  type="range"
                  min="50"
                  max="95"
                  step="0.5"
                  value={wamGoal}
                  onChange={(e) => setWamGoal(Number(e.target.value))}
                  className="w-full accent-zinc-900 dark:accent-zinc-100"
                />

                <div className="flex items-center justify-between gap-2 pt-1">
                  {[
                    { label: 'Pass (50)', val: 50 },
                    { label: 'Credit (65)', val: 65 },
                    { label: 'Distinction (75)', val: 75 },
                    { label: 'High Dist (85)', val: 85 },
                  ].map((preset) => (
                    <button
                      type="button"
                      key={preset.val}
                      onClick={() => setWamGoal(preset.val)}
                      className={`flex-1 py-1 text-[11px] font-mono rounded border text-center transition-colors ${
                        wamGoal === preset.val
                          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 font-semibold'
                          : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={!preferredName.trim() || !selectedDegree.trim()}
                className="w-full mt-4 flex items-center justify-center gap-2 py-3 px-4 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 font-semibold rounded-xl text-sm transition-colors disabled:opacity-50 cursor-pointer"
              >
                <span>Continue to Add Units</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* STEP 2: Add First Units */
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
                  Add Your Units of Study
                </h2>
                <p className="mt-1 text-xs text-zinc-500 font-mono">
                  Enter the units you are currently taking for {selectedDegree}.
                </p>
              </div>

              {/* Units List */}
              <div className="space-y-3">
                <span className="text-xs font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                  Your Added Units ({stagedUnits.length}):
                </span>

                {stagedUnits.length === 0 ? (
                  <div className="p-6 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl text-center text-xs font-mono text-zinc-400">
                    No units added yet. Use the form below to enter your first unit of study.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {stagedUnits.map((u) => (
                      <div
                        key={u.id}
                        className="p-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 rounded-xl flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 font-mono">
                            <span className="font-bold text-zinc-900 dark:text-zinc-100">
                              {u.code}
                            </span>
                            <span className="text-zinc-300 dark:text-zinc-600">·</span>
                            <span className="text-zinc-500">{u.creditPoints} Credit Points</span>
                            {u.gradingScheme === 'foundation_plus_advanced' && (
                              <>
                                <span className="text-zinc-300 dark:text-zinc-600">·</span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold">
                                  Foundation 50P + Advanced
                                </span>
                              </>
                            )}
                          </div>
                          <p className="text-zinc-600 dark:text-zinc-300 truncate mt-0.5">
                            {u.name}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveStagedUnit(u.id)}
                          className="p-1.5 text-zinc-400 hover:text-rose-600 transition-colors"
                          title="Remove unit"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Custom Unit Form */}
              <form
                onSubmit={handleAddCustomUnit}
                className="p-4 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 rounded-xl space-y-3"
              >
                <span className="text-xs font-mono font-semibold text-zinc-800 dark:text-zinc-200 block">
                  Add Unit:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      placeholder="Unit Code (e.g. ELEC1601)"
                      value={customCode}
                      onChange={(e) => setCustomCode(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div className="sm:col-span-8">
                    <input
                      type="text"
                      placeholder="Unit Name"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-4">
                    <label className="text-[10px] font-mono text-zinc-400 block mb-1">Credit Points</label>
                    <input
                      type="number"
                      min="1"
                      max="48"
                      value={customCP}
                      onChange={(e) => setCustomCP(Number(e.target.value))}
                      className="w-full px-2 py-1.5 text-xs font-mono bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                    />
                  </div>

                  <div className="sm:col-span-8">
                    <label className="text-[10px] font-mono text-zinc-400 block mb-1">Grading Structure</label>
                    <select
                      value={customScheme}
                      onChange={(e) =>
                        setCustomScheme(e.target.value as 'standard' | 'foundation_plus_advanced')
                      }
                      className="w-full px-2 py-1.5 text-xs font-mono bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                    >
                      <option value="standard">Standard Percentage Weighted</option>
                      <option value="foundation_plus_advanced">
                        Foundation 50P + Advanced (e.g. INFO1110)
                      </option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={!customCode.trim() || !customName.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Unit</span>
                  </button>
                </div>
              </form>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 text-xs font-mono text-zinc-600 dark:text-zinc-400 hover:underline"
                >
                  ← Back to Details
                </button>

                <button
                  type="button"
                  onClick={handleFinalize}
                  className="flex items-center gap-2 py-3 px-6 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 font-semibold rounded-xl text-sm transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
                  <span>Launch Dashboard {stagedUnits.length > 0 ? `(${stagedUnits.length} Units)` : ''}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
