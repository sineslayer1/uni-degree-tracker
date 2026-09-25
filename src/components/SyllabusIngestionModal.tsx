import React, { useState } from 'react';
import { Dialog } from './ui/Dialog';
import { useDashboardStore } from '../store/useDashboardStore';
import { AssessmentKind, UnitGradingScheme, Unit } from '../types/dashboard';
import {
  FileUp,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Loader2,
  ShieldCheck,
  FileCheck,
} from 'lucide-react';

interface SyllabusIngestionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ExtractedAssessment {
  id: string;
  title: string;
  weight: number;
  kind: AssessmentKind;
  isHurdle: boolean;
  hurdleMinMark: number;
  hurdleDescription?: string;
  dueDate?: string;
}

export const SyllabusIngestionModal: React.FC<SyllabusIngestionModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { addUnit } = useDashboardStore();

  const [step, setStep] = useState<'input' | 'analyzing' | 'validation'>('input');
  const [inputText, setInputText] = useState('');
  const [fileName, setFileName] = useState('');
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // AI Extraction Data for Validation
  const [aiSummary, setAiSummary] = useState('');
  const [unitCode, setUnitCode] = useState('');
  const [unitName, setUnitName] = useState('');
  const [creditPoints, setCreditPoints] = useState(6);
  const [semester, setSemester] = useState('Semester 1, 2026');
  const [gradingScheme, setGradingScheme] = useState<UnitGradingScheme>('standard');
  const [assessments, setAssessments] = useState<ExtractedAssessment[]>([]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErrorMessage(null);

    try {
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        // Read file as base64 for native Gemini visual multimodal ingestion
        const reader = new FileReader();
        reader.onload = async () => {
          const result = reader.result as string;
          // Strip "data:application/pdf;base64," prefix
          const base64Data = result.split(',')[1] || result;
          setPdfBase64(base64Data);
          await runAiAnalysis({ pdfBase64: base64Data, fileName: file.name });
        };
        reader.onerror = () => {
          setErrorMessage('Could not read the PDF file. Please try pasting the syllabus text.');
        };
        reader.readAsDataURL(file);
      } else {
        // Text / Markdown outline
        const text = await file.text();
        setInputText(text);
        setPdfBase64(null);
        await runAiAnalysis({ syllabusText: text, fileName: file.name });
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Could not process the uploaded file. Please paste syllabus text directly.');
      setStep('input');
    }
  };

  const handleAnalyzeText = async () => {
    if (!inputText.trim()) {
      setErrorMessage('Please paste syllabus text or upload an outline file first.');
      return;
    }
    await runAiAnalysis({
      syllabusText: inputText.trim(),
      fileName: fileName || 'pasted_outline.txt',
    });
  };

  const runAiAnalysis = async (payload: {
    syllabusText?: string;
    pdfBase64?: string;
    fileName: string;
  }) => {
    setStep('analyzing');
    setErrorMessage(null);

    try {
      const res = await fetch('/api/extract-syllabus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'AI analysis failed');
      }

      // Populate validation screen with real Gemini output
      setAiSummary(data.aiSummary || 'Unit syllabus successfully analyzed by Gemini.');
      setUnitCode(data.code || '');
      setUnitName(data.name || '');
      setCreditPoints(data.creditPoints || 6);
      setSemester(data.semester || 'Semester 1, 2026');
      setGradingScheme(
        data.gradingScheme === 'foundation_plus_advanced'
          ? 'foundation_plus_advanced'
          : 'standard'
      );

      const parsedAssessments: ExtractedAssessment[] = (data.assessments || []).map(
        (a: any, index: number) => ({
          id: `ai-item-${Date.now()}-${index}`,
          title: a.title || `Assessment ${index + 1}`,
          weight: typeof a.weight === 'number' ? a.weight : 0,
          kind:
            (a.kind as AssessmentKind) ||
            (a.weight === 0 && a.isHurdle ? 'competency_hurdle' : 'standard'),
          isHurdle: Boolean(a.isHurdle),
          hurdleMinMark:
            typeof a.hurdleMinMark === 'number'
              ? a.hurdleMinMark
              : a.isHurdle
              ? 45
              : 0,
          hurdleDescription: a.hurdleDescription || '',
          dueDate: a.dueDate || '',
        })
      );

      setAssessments(parsedAssessments);
      setStep('validation');
    } catch (err: any) {
      console.error('AI parsing error:', err);
      setErrorMessage(
        err?.message ||
          'AI extraction failed. Please ensure the syllabus contains course details and try again.'
      );
      setStep('input');
    }
  };

  const handleUpdateAssessment = (
    index: number,
    field: keyof ExtractedAssessment,
    value: any
  ) => {
    const updated = [...assessments];
    updated[index] = { ...updated[index], [field]: value };
    setAssessments(updated);
  };

  const handleAddAssessmentRow = () => {
    setAssessments([
      ...assessments,
      {
        id: `custom-item-${Date.now()}`,
        title: 'New Assessment',
        weight: 10,
        kind: 'standard',
        isHurdle: false,
        hurdleMinMark: 0,
      },
    ]);
  };

  const handleRemoveAssessmentRow = (index: number) => {
    setAssessments(assessments.filter((_, i) => i !== index));
  };

  const handleConfirmAndAddUnit = () => {
    if (!unitCode.trim() || !unitName.trim()) {
      setErrorMessage('Please provide both Unit Code and Unit Name.');
      return;
    }

    const cleanCode = unitCode.trim().toUpperCase();

    const unitPayload: Unit = {
      id: `unit-${cleanCode.toLowerCase()}-${Date.now().toString(36)}`,
      code: cleanCode,
      name: unitName.trim(),
      creditPoints: Number(creditPoints),
      semester,
      year: 2026,
      gradingScheme,
      assessments: assessments.map((a) => ({
        id: a.id,
        unitId: `unit-${cleanCode.toLowerCase()}`,
        title: a.title,
        weight: Number(a.weight),
        mark: null,
        isHurdle: a.isHurdle,
        hurdleMinMark: Number(a.hurdleMinMark),
        hurdleDescription: a.hurdleDescription,
        dueDate: a.dueDate,
        completed: false,
        kind: a.kind,
        isCompetencyPassed: false,
        hypotheticalMark: null,
      })),
    };

    addUnit(unitPayload);
    handleClose();
  };

  const handleClose = () => {
    setStep('input');
    setInputText('');
    setFileName('');
    setPdfBase64(null);
    setErrorMessage(null);
    setAssessments([]);
    onClose();
  };

  const standardTotalWeight = assessments
    .filter((a) => a.kind === 'standard')
    .reduce((sum, a) => sum + Number(a.weight || 0), 0);

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} title="AI Syllabus Ingestion" maxWidth="max-w-3xl">
      <div className="space-y-6">
        {/* Step 1: Input / Upload */}
        {step === 'input' && (
          <div className="space-y-5">
            <div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 font-mono">
                Upload your official unit outline (PDF) or paste the syllabus text below. Gemini analyzes the actual PDF document layout to extract all assessment weightings, due dates, and pass hurdles with high accuracy.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-xl flex items-center gap-2 text-xs text-rose-800 dark:text-rose-200">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* File Dropzone */}
            <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 rounded-xl p-6 text-center transition-colors">
              <input
                type="file"
                id="syllabus-file"
                accept=".pdf,.txt,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label
                htmlFor="syllabus-file"
                className="flex flex-col items-center justify-center cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-2 text-zinc-600 dark:text-zinc-300">
                  <FileUp className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  {fileName ? fileName : 'Upload Syllabus PDF'}
                </span>
                <span className="text-[11px] font-mono text-zinc-400 mt-1">
                  Click to select file from your device (Gemini native PDF document inspection)
                </span>
              </label>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase font-mono">
                <span className="bg-white dark:bg-zinc-900 px-2 text-zinc-400">
                  Or paste outline text
                </span>
              </div>
            </div>

            {/* Text Area Input */}
            <div className="space-y-1.5">
              <textarea
                rows={6}
                placeholder="Paste course outline, assessment schedule, or syllabus description here..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="w-full p-3 text-xs font-mono bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs font-mono text-zinc-500 hover:text-zinc-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!inputText.trim()}
                onClick={handleAnalyzeText}
                className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 font-semibold rounded-xl text-xs transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <Sparkles className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
                <span>Analyze with AI</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Analyzing Loading Animation */}
        {step === 'analyzing' && (
          <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
            <div className="relative">
              <Loader2 className="w-10 h-10 animate-spin text-zinc-900 dark:text-zinc-100" />
              <Sparkles className="w-4 h-4 text-emerald-500 absolute -top-1 -right-1" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Gemini is Analyzing Your Course Outline
              </h3>
              <p className="text-xs font-mono text-zinc-500 mt-1 max-w-sm">
                Parsing unit code, assessment schedule, weighting distribution, and double-pass exam hurdles...
              </p>
            </div>
          </div>
        )}

        {/* Step 3: AI Validation & Review */}
        {step === 'validation' && (
          <div className="space-y-5">
            {/* AI Summary Banner */}
            <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>AI Syllabus Analysis Complete — Please Validate</span>
              </div>
              <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed font-sans">
                {aiSummary}
              </p>
            </div>

            {/* Unit Basic Details Validation */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 rounded-xl space-y-3">
              <span className="text-xs font-mono font-semibold text-zinc-700 dark:text-zinc-300 block">
                Unit Information:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-3">
                  <label className="text-[10px] font-mono text-zinc-400 block mb-1">Unit Code</label>
                  <input
                    type="text"
                    required
                    value={unitCode}
                    onChange={(e) => setUnitCode(e.target.value.toUpperCase())}
                    className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div className="sm:col-span-6">
                  <label className="text-[10px] font-mono text-zinc-400 block mb-1">Unit Title</label>
                  <input
                    type="text"
                    required
                    value={unitName}
                    onChange={(e) => setUnitName(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="text-[10px] font-mono text-zinc-400 block mb-1">Credit Points</label>
                  <input
                    type="number"
                    min="1"
                    max="48"
                    value={creditPoints}
                    onChange={(e) => setCreditPoints(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div className="pt-1">
                <label className="text-[10px] font-mono text-zinc-400 block mb-1">Grading Architecture</label>
                <select
                  value={gradingScheme}
                  onChange={(e) => setGradingScheme(e.target.value as UnitGradingScheme)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                >
                  <option value="standard">Standard Percentage Weighted (0-100%)</option>
                  <option value="foundation_plus_advanced">
                    Foundation 50P + Advanced Extension (e.g. INFO1110)
                  </option>
                </select>
              </div>
            </div>

            {/* Extracted Assessments Validation Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                  Extracted Assessments ({assessments.length}):
                </span>
                <span className={`text-xs font-mono font-medium ${standardTotalWeight === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  Total Standard Weight: {standardTotalWeight}% {standardTotalWeight === 100 ? '✓' : '(Target: 100%)'}
                </span>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {assessments.map((a, idx) => (
                  <div
                    key={a.id}
                    className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2 text-xs"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      <div className="sm:col-span-5">
                        <input
                          type="text"
                          value={a.title}
                          onChange={(e) => handleUpdateAssessment(idx, 'title', e.target.value)}
                          className="w-full px-2 py-1 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded font-semibold text-zinc-900 dark:text-zinc-100"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <select
                          value={a.kind}
                          onChange={(e) =>
                            handleUpdateAssessment(idx, 'kind', e.target.value as AssessmentKind)
                          }
                          className="w-full px-2 py-1 text-[11px] font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded"
                        >
                          <option value="standard">Standard (%)</option>
                          <option value="competency_hurdle">Pass/Fail Hurdle</option>
                          <option value="foundation_requirement">Foundation 50P Base</option>
                          <option value="advanced_extension">Advanced (+Pts)</option>
                        </select>
                      </div>

                      <div className="sm:col-span-3 flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={a.weight}
                          onChange={(e) =>
                            handleUpdateAssessment(idx, 'weight', Number(e.target.value))
                          }
                          className="w-16 px-2 py-1 text-xs font-mono text-center bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded"
                        />
                        <span className="text-xs font-mono text-zinc-400">%</span>
                      </div>

                      <div className="sm:col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveAssessmentRow(idx)}
                          className="p-1 text-zinc-400 hover:text-rose-600 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Hurdle Controls */}
                    <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-zinc-100 dark:border-zinc-800/60 text-[11px] font-mono">
                      <label className="flex items-center gap-1 text-zinc-700 dark:text-zinc-300">
                        <input
                          type="checkbox"
                          checked={a.isHurdle}
                          onChange={(e) => handleUpdateAssessment(idx, 'isHurdle', e.target.checked)}
                          className="rounded"
                        />
                        <span>Is Hurdle / Competency</span>
                      </label>

                      {a.isHurdle && a.kind === 'standard' && (
                        <div className="flex items-center gap-1">
                          <span className="text-zinc-400">Min Pass:</span>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={a.hurdleMinMark}
                            onChange={(e) =>
                              handleUpdateAssessment(idx, 'hurdleMinMark', Number(e.target.value))
                            }
                            className="w-12 px-1 py-0.5 text-xs text-center bg-zinc-50 dark:bg-zinc-800 border rounded"
                          />
                          <span className="text-zinc-400">%</span>
                        </div>
                      )}

                      {a.dueDate && (
                        <span className="text-zinc-400 ml-auto">
                          Due: {a.dueDate}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddAssessmentRow}
                className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add another assessment item</span>
              </button>
            </div>

            {/* Validation Confirmation Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setStep('input')}
                className="px-4 py-2 text-xs font-mono text-zinc-600 dark:text-zinc-400 hover:underline"
              >
                ← Back / Re-Upload
              </button>

              <button
                type="button"
                onClick={handleConfirmAndAddUnit}
                className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 font-semibold rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
                <span>Confirm & Add Unit to Dashboard</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
};
