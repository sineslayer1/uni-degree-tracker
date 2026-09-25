import React, { useState, useRef } from 'react';
import { useDashboardStore } from '../store/useDashboardStore';
import { Dialog } from './ui/Dialog';
import { DegreePlanExtraction, Unit } from '../types/dashboard';
import {
  FileImage,
  UploadCloud,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Plus,
  ArrowRight,
  Edit2,
  Calendar,
} from 'lucide-react';

interface DegreePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface EditablePlanUnit {
  code: string;
  name: string;
  creditPoints: number;
  semester: string;
  year: number;
}

const COMMON_SEMESTERS = [
  'Semester 1, 2026',
  'Semester 2, 2026',
  'Summer 2026/27',
  'Semester 1, 2027',
  'Semester 2, 2027',
  'Semester 1, 2028',
  'Semester 2, 2028',
  'Semester 1, 2029',
  'Semester 2, 2029',
];

export const DegreePlanModal: React.FC<DegreePlanModalProps> = ({ isOpen, onClose }) => {
  const {
    units: existingUnits,
    currentSemester,
    batchImportUpcomingUnits,
    updateAcademicProfile,
    setTotalDegreeCreditPoints,
    setDegreePlanImage,
  } = useDashboardStore();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [planText, setPlanText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [degreeNameInput, setDegreeNameInput] = useState('');
  const [totalCpInput, setTotalCpInput] = useState(192);
  const [editableUnits, setEditableUnits] = useState<EditablePlanUnit[] | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const existingCodes = new Set(existingUnits.map((u) => u.code.toUpperCase().trim()));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setError(null);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleProcessDegreePlan = async () => {
    if (!selectedFile && !planText.trim()) {
      setError('Please upload a picture of your degree plan or paste your course roadmap.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let imageBase64 = '';
      let mimeType = selectedFile?.type || 'image/png';

      if (selectedFile) {
        imageBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(selectedFile);
        });
      }

      const res = await fetch('/api/extract-degree-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          mimeType,
          planText: planText.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to extract degree plan');
      }

      const plan: DegreePlanExtraction = data.degreePlan;
      setDegreeNameInput(plan.degreeName || 'Engineering Degree');
      setTotalCpInput(plan.totalCreditPoints || 192);

      if (previewUrl) {
        setDegreePlanImage(previewUrl);
      }

      const formatted: EditablePlanUnit[] = (plan.recommendedUnits || []).map((u) => {
        const cleanCode = (u.code || 'UNIT').toUpperCase().trim();
        const yr = Number(u.year) || 2;
        let sem = u.semester ? u.semester.trim() : `Semester 1, ${2026 + (yr > 1 ? yr - 1 : 0)}`;
        if (!sem.includes('202')) {
          sem = sem.includes('2')
            ? `Semester 2, ${2026 + (yr > 1 ? yr - 1 : 0)}`
            : `Semester 1, ${2026 + (yr > 1 ? yr - 1 : 0)}`;
        }
        return {
          code: cleanCode,
          name: u.name?.trim() || cleanCode,
          creditPoints: Number(u.creditPoints) > 0 ? Number(u.creditPoints) : 6,
          semester: sem,
          year: yr,
        };
      });

      setEditableUnits(formatted);
    } catch (err: any) {
      setError(err?.message || 'Failed to analyze degree plan. Please ensure unit codes are visible.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnitChange = (index: number, field: keyof EditablePlanUnit, value: any) => {
    if (!editableUnits) return;
    const updated = [...editableUnits];
    updated[index] = {
      ...updated[index],
      [field]: field === 'code' ? String(value).toUpperCase().trim() : value,
    };
    setEditableUnits(updated);
  };

  const handleDeleteUnit = (index: number) => {
    if (!editableUnits) return;
    setEditableUnits(editableUnits.filter((_, i) => i !== index));
  };

  const handleAddCustomUnit = () => {
    const next: EditablePlanUnit = {
      code: 'ELEC2000',
      name: 'Planned Core / Elective',
      creditPoints: 6,
      semester: currentSemester || 'Semester 2, 2026',
      year: 2,
    };
    setEditableUnits(editableUnits ? [...editableUnits, next] : [next]);
  };

  const handleConfirmImport = async () => {
    if (!editableUnits || editableUnits.length === 0) return;

    setIsLoading(true);
    try {
      if (degreeNameInput.trim()) {
        await updateAcademicProfile({ degreeName: degreeNameInput.trim() });
      }
      if (totalCpInput) {
        setTotalDegreeCreditPoints(Number(totalCpInput));
      }

      // Filter and sanitize units
      const sanitized: Omit<Unit, 'id'>[] = editableUnits.map((item) => ({
        code: item.code.toUpperCase().trim() || 'UNIT',
        name: item.name.trim() || item.code.toUpperCase(),
        creditPoints: Number(item.creditPoints) > 0 ? Number(item.creditPoints) : 6,
        semester: item.semester.trim() || currentSemester,
        year: Number(item.year) || 2026,
        status: 'upcoming' as const,
        gradingScheme: 'standard' as const,
        syllabusUploaded: false,
        assessments: [],
      }));

      await batchImportUpcomingUnits(sanitized);
      resetState();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to import units.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetState = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setPlanText('');
    setEditableUnits(null);
    setError(null);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => {
        resetState();
        onClose();
      }}
      title="Degree Plan & Progression Map"
      description="Upload a photo of your degree progression map (e.g. CUSP flowchart) or paste your course roadmap. Review and edit any semesters before importing."
      maxWidth="max-w-3xl"
    >
      <div className="space-y-5">
        {!editableUnits ? (
          <>
            {/* Upload Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                selectedFile
                  ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20'
                  : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 bg-zinc-50/50 dark:bg-zinc-800/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />

              {previewUrl ? (
                <div className="space-y-3">
                  <img
                    src={previewUrl}
                    alt="Degree Plan Preview"
                    className="max-h-48 mx-auto rounded-lg border border-zinc-200 dark:border-zinc-700 object-contain"
                  />
                  <p className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                    {selectedFile?.name} (Click to change file)
                  </p>
                </div>
              ) : selectedFile ? (
                <div className="space-y-2">
                  <FileImage className="w-10 h-10 text-emerald-600 mx-auto" />
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs font-mono text-zinc-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB · Click to change file
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mx-auto">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      Upload photo or PDF of your Degree Progression Map
                    </span>
                    <p className="text-xs text-zinc-500 font-mono mt-1">
                      Supports JPG, PNG, WEBP, or PDF (e.g. CUSP flowcharts, Sydney Student enrolments)
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Optional Manual Text Ingestion */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-zinc-500 flex items-center justify-between">
                <span>Or paste course codes / degree requirements:</span>
                <span className="text-[10px] text-zinc-400">Optional</span>
              </label>
              <textarea
                value={planText}
                onChange={(e) => setPlanText(e.target.value)}
                placeholder="e.g. Year 2 Sem 2: MECH2400 (6 CP), ELEC2104 (6 CP), AMME2500 (6 CP)..."
                rows={3}
                className="w-full px-3 py-2 text-xs font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  setDegreeNameInput('Engineering Degree');
                  setEditableUnits([]);
                  handleAddCustomUnit();
                }}
                className="text-xs font-mono text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                + Create Degree Plan Manually
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-mono text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleProcessDegreePlan}
                  disabled={isLoading || (!selectedFile && !planText.trim())}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Analyzing Degree Plan...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Analyze with Gemini AI</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Editable Preview of Extracted Units */
          <div className="space-y-4 animate-in fade-in-0 duration-150">
            {/* Header info */}
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex-1">
                  <label className="text-[10px] font-mono uppercase text-emerald-800 dark:text-emerald-300 font-semibold block">
                    Degree Name:
                  </label>
                  <input
                    type="text"
                    value={degreeNameInput}
                    onChange={(e) => setDegreeNameInput(e.target.value)}
                    className="w-full text-sm font-bold bg-white dark:bg-zinc-800 border border-emerald-300 dark:border-emerald-700 rounded-lg px-2.5 py-1 text-emerald-950 dark:text-emerald-100 mt-1"
                  />
                </div>
                <div className="w-32">
                  <label className="text-[10px] font-mono uppercase text-emerald-800 dark:text-emerald-300 font-semibold block">
                    Total CP:
                  </label>
                  <input
                    type="number"
                    value={totalCpInput}
                    onChange={(e) => setTotalCpInput(Number(e.target.value))}
                    className="w-full text-xs font-mono bg-white dark:bg-zinc-800 border border-emerald-300 dark:border-emerald-700 rounded-lg px-2 py-1 text-emerald-950 dark:text-emerald-100 mt-1"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-mono text-emerald-700 dark:text-emerald-300 pt-1 border-t border-emerald-200/60 dark:border-emerald-800/60">
                <span>{editableUnits.length} Planned Units to Import</span>
                <span>Editable: Change code, name, credit points, or semester</span>
              </div>
            </div>

            {/* Editable Units List */}
            <div className="max-h-72 overflow-y-auto space-y-2 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 bg-zinc-50/50 dark:bg-zinc-900/50">
              {editableUnits.length === 0 ? (
                <div className="py-6 text-center text-xs font-mono text-zinc-500">
                  No units in list. Click "Add Unit" below.
                </div>
              ) : (
                editableUnits.map((unit, idx) => {
                  const isExisting = existingCodes.has(unit.code.toUpperCase().trim());
                  return (
                    <div
                      key={idx}
                      className={`p-3 bg-white dark:bg-zinc-800 border rounded-xl space-y-2 text-xs shadow-2xs ${
                        isExisting
                          ? 'border-amber-300 dark:border-amber-800'
                          : 'border-zinc-200/80 dark:border-zinc-700/80'
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Unit Code */}
                        <div className="w-28">
                          <label className="text-[9px] font-mono text-zinc-400 block">CODE</label>
                          <input
                            type="text"
                            value={unit.code}
                            onChange={(e) => handleUnitChange(idx, 'code', e.target.value)}
                            className="w-full uppercase font-mono font-bold px-2 py-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded text-zinc-900 dark:text-zinc-100"
                            placeholder="INFO1110"
                          />
                        </div>

                        {/* Unit Title */}
                        <div className="flex-1 min-w-[140px]">
                          <label className="text-[9px] font-mono text-zinc-400 block">TITLE</label>
                          <input
                            type="text"
                            value={unit.name}
                            onChange={(e) => handleUnitChange(idx, 'name', e.target.value)}
                            className="w-full px-2 py-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded text-zinc-900 dark:text-zinc-100"
                            placeholder="Unit Name"
                          />
                        </div>

                        {/* Credit Points */}
                        <div className="w-16">
                          <label className="text-[9px] font-mono text-zinc-400 block">CP</label>
                          <input
                            type="number"
                            min="1"
                            max="24"
                            value={unit.creditPoints}
                            onChange={(e) =>
                              handleUnitChange(idx, 'creditPoints', Number(e.target.value))
                            }
                            className="w-full px-1.5 py-1 text-center font-mono bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded text-zinc-900 dark:text-zinc-100"
                          />
                        </div>

                        {/* Semester Selection */}
                        <div className="w-44">
                          <label className="text-[9px] font-mono text-zinc-400 block">SEMESTER</label>
                          <select
                            value={unit.semester}
                            onChange={(e) => handleUnitChange(idx, 'semester', e.target.value)}
                            className="w-full px-2 py-1 font-mono text-[11px] bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded text-zinc-900 dark:text-zinc-100"
                          >
                            {COMMON_SEMESTERS.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                            {!COMMON_SEMESTERS.includes(unit.semester) && (
                              <option value={unit.semester}>{unit.semester}</option>
                            )}
                          </select>
                        </div>

                        {/* Delete Unit */}
                        <button
                          type="button"
                          onClick={() => handleDeleteUnit(idx)}
                          className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors self-end mb-0.5 cursor-pointer"
                          title="Remove unit from import"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {isExisting && (
                        <p className="text-[11px] font-mono text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Unit code already in your dashboard. It will be skipped if duplicate.</span>
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Add Custom Row Button */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleAddCustomUnit}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Another Planned Unit</span>
              </button>

              <span className="text-[11px] font-mono text-zinc-500">
                All units will be added to Upcoming Units
              </span>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setEditableUnits(null)}
                className="px-4 py-2 text-xs font-mono text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 cursor-pointer"
              >
                Back / Rescan
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={isLoading || editableUnits.length === 0}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <span>Import {editableUnits.length} Planned Units</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
};

