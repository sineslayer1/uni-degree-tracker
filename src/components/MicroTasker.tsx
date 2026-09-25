import React, { useState } from 'react';
import { useDashboardStore } from '../store/useDashboardStore';
import { CheckSquare, Square, Plus, Trash2, Calendar, Tag, CheckCircle2 } from 'lucide-react';
import { MicroTask } from '../types/dashboard';

export const MicroTasker: React.FC = () => {
  const { tasks, addTask, toggleTask, deleteTask, units } = useDashboardStore();
  const [newTitle, setNewTitle] = useState('');
  const [newUnitCode, setNewUnitCode] = useState(units[0]?.code || 'GENERAL');
  const [newDueDate, setNewDueDate] = useState('');
  const [newTag, setNewTag] = useState<MicroTask['tag']>('lab');
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    addTask({
      title: newTitle.trim(),
      unitCode: newUnitCode,
      dueDate: newDueDate.trim() || 'This week',
      tag: newTag,
      completed: false,
    });

    setNewTitle('');
  };

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'pending') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  const pendingCount = tasks.filter((t) => !t.completed).length;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl p-5 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Canvas Micro-Tasker
            </h3>
            <span className="text-xs font-mono text-zinc-400">
              ({pendingCount} unweighted to-dos)
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Track unweighted tutorial sheets, pre-lab safety briefs, and discussion prompts ignored by LMS gradebooks.
          </p>
        </div>

        {/* Filter Segmented Control */}
        <div className="flex items-center p-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-xs font-mono">
          <button
            onClick={() => setFilter('pending')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              filter === 'pending'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs font-semibold'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              filter === 'all'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs font-semibold'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            All
          </button>
        </div>
      </div>

      {/* Quick Add Form */}
      <form onSubmit={handleAddTask} className="mt-3 grid grid-cols-1 sm:grid-cols-12 gap-2">
        <div className="sm:col-span-6">
          <input
            type="text"
            placeholder="Add unweighted to-do (e.g. Read week 8 control notes)..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
          />
        </div>

        <div className="sm:col-span-2">
          <select
            value={newUnitCode}
            onChange={(e) => setNewUnitCode(e.target.value)}
            className="w-full px-2 py-1.5 text-xs font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md"
          >
            {units.map((u) => (
              <option key={u.id} value={u.code}>
                {u.code}
              </option>
            ))}
            <option value="GENERAL">GENERAL</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <select
            value={newTag}
            onChange={(e) => setNewTag(e.target.value as MicroTask['tag'])}
            className="w-full px-2 py-1.5 text-xs font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md"
          >
            <option value="lab">Lab Prep</option>
            <option value="tutorial">Tutorial</option>
            <option value="reading">Reading</option>
            <option value="quiz">Quiz</option>
            <option value="general">General</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-1 px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 text-xs font-medium rounded-md hover:bg-zinc-800 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>
      </form>

      {/* Task List */}
      <div className="mt-4 space-y-1.5 max-h-60 overflow-y-auto pr-1">
        {filteredTasks.length === 0 ? (
          <div className="py-6 text-center text-xs text-zinc-400 font-mono">
            No micro-tasks in this view.
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className={`group flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${
                task.completed
                  ? 'bg-zinc-50/50 dark:bg-zinc-900/40 opacity-60'
                  : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
              }`}
            >
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => toggleTask(task.id)}
                  className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors shrink-0"
                >
                  {task.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>

                <span
                  className={`truncate ${
                    task.completed
                      ? 'line-through text-zinc-400'
                      : 'text-zinc-800 dark:text-zinc-200'
                  }`}
                >
                  {task.title}
                </span>

                {/* Unboxed Metadata with Typographic Separator */}
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 shrink-0">
                  <span className="font-semibold text-zinc-600 dark:text-zinc-300">
                    {task.unitCode}
                  </span>
                  <span>·</span>
                  <span>{task.tag}</span>
                  {task.dueDate && (
                    <>
                      <span>·</span>
                      <span>{task.dueDate}</span>
                    </>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => deleteTask(task.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-rose-600 transition-all ml-2"
                title="Delete task"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
