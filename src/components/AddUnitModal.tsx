import React, { useState } from 'react';
import { Dialog } from './ui/Dialog';
import { useDashboardStore } from '../store/useDashboardStore';
import { Unit, UnitZodSchema } from '../types/dashboard';
import { Plus, Trash2 } from 'lucide-react';

interface AddUnitModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddUnitModal: React.FC<AddUnitModalProps> = ({ isOpen, onClose }) => {
  const { addUnit } = useDashboardStore();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [creditPoints, setCreditPoints] = useState(6);
  const [semester, setSemester] = useState('Semester 1, 2026');
  const [error, setError] = useState<string | null>(null);

  const [assessments, setAssessments] = useState<
    Array<{
      id: string;
      title: string;
      weight: number;
      isHurdle: boolean;
      hurdleMinMark: number;
    }>
  >([
    { id: '1', title: 'Assignments / Coursework', weight: 40, isHurdle: false, hurdleMinMark: 0 },
    { id: '2', title: 'Final Examination (Hurdle)', weight: 60, isHurdle: true, hurdleMinMark: 45 },
  ]);

  const totalWeight = assessments.reduce((acc, curr) => acc + curr.weight, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanCode = code.toUpperCase().trim();

    const unitPayload: Unit = {
      id: `unit-${cleanCode.toLowerCase()}-${Date.now().toString(36)}`,
      code: cleanCode,
      name: name.trim(),
      creditPoints: Number(creditPoints),
      semester,
      year: 2026,
      assessments: assessments.map((a) => ({
        id: `a-${Date.now()}-${a.id}`,
        unitId: `unit-${cleanCode.toLowerCase()}`,
        title: a.title.trim(),
        weight: Number(a.weight),
        mark: null,
        isHurdle: a.isHurdle,
        hurdleMinMark: a.isHurdle ? Number(a.hurdleMinMark) : 0,
        completed: false,
        hypotheticalMark: a.isHurdle ? Number(a.hurdleMinMark) + 15 : 75,
      })),
    };

    const validated = UnitZodSchema.safeParse(unitPayload);
    if (!validated.success) {
      setError(validated.error.issues[0]?.message || 'Validation error');
      return;
    }

    addUnit(validated.data);
    onClose();
    reset();
  };

  const reset = () => {
    setCode('');
    setName('');
    setCreditPoints(6);
    setError(null);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => {
        onClose();
        reset();
      }}
      title="Add Unit of Study"
      description="Register an academic unit of study, credit points, and assessment schedule."
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-4">
            <label className="text-[11px] font-mono text-zinc-500 block mb-1">
              Unit Code (e.g. ELEC2104)
            </label>
            <input
              type="text"
              required
              placeholder="ELEC2104"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md"
            />
          </div>

          <div className="sm:col-span-8">
            <label className="text-[11px] font-mono text-zinc-500 block mb-1">Unit Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Electronic Devices and Circuits"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md"
            />
          </div>

          <div className="sm:col-span-6">
            <label className="text-[11px] font-mono text-zinc-500 block mb-1">
              Credit Points (CP)
            </label>
            <input
              type="number"
              min="1"
              max="24"
              value={creditPoints}
              onChange={(e) => setCreditPoints(Number(e.target.value))}
              className="w-full px-3 py-1.5 text-xs font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md"
            />
          </div>

          <div className="sm:col-span-6">
            <label className="text-[11px] font-mono text-zinc-500 block mb-1">Semester</label>
            <input
              type="text"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md"
            />
          </div>
        </div>

        {/* Assessment Weightings Section */}
        <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">Assessments</span>
            <span
              className={`font-mono text-[11px] ${
                totalWeight === 100
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              Total: {totalWeight}% / 100%
            </span>
          </div>

          <div className="space-y-2">
            {assessments.map((a, index) => (
              <div
                key={a.id}
                className="flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg text-xs"
              >
                <input
                  type="text"
                  placeholder="Assessment Name"
                  value={a.title}
                  onChange={(e) => {
                    const newAssessments = [...assessments];
                    newAssessments[index].title = e.target.value;
                    setAssessments(newAssessments);
                  }}
                  className="flex-1 px-2 py-1 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded"
                />

                <div className="flex items-center gap-1 w-20">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={a.weight}
                    onChange={(e) => {
                      const newAssessments = [...assessments];
                      newAssessments[index].weight = Number(e.target.value);
                      setAssessments(newAssessments);
                    }}
                    className="w-14 px-1.5 py-1 text-xs font-mono text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded"
                  />
                  <span className="text-[11px] font-mono text-zinc-400">%</span>
                </div>

                <label className="flex items-center gap-1 text-[11px] text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={a.isHurdle}
                    onChange={(e) => {
                      const newAssessments = [...assessments];
                      newAssessments[index].isHurdle = e.target.checked;
                      setAssessments(newAssessments);
                    }}
                    className="rounded"
                  />
                  <span>Hurdle</span>
                </label>

                {a.isHurdle && (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-zinc-400">≥</span>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={a.hurdleMinMark}
                      onChange={(e) => {
                        const newAssessments = [...assessments];
                        newAssessments[index].hurdleMinMark = Number(e.target.value);
                        setAssessments(newAssessments);
                      }}
                      className="w-12 px-1 py-1 text-xs font-mono text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded"
                    />
                    <span className="text-[10px] text-zinc-400">%</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setAssessments(assessments.filter((_, i) => i !== index))}
                  className="p-1 text-zinc-400 hover:text-rose-600"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              setAssessments([
                ...assessments,
                {
                  id: String(Date.now()),
                  title: 'New Assessment',
                  weight: 20,
                  isHurdle: false,
                  hurdleMinMark: 0,
                },
              ])
            }
            className="flex items-center gap-1 text-xs font-mono text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 mt-2"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Assessment</span>
          </button>
        </div>

        {error && (
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-md text-xs text-rose-800 dark:text-rose-200">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => {
              onClose();
              reset();
            }}
            className="px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200"
          >
            Add Unit
          </button>
        </div>
      </form>
    </Dialog>
  );
};
