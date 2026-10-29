import React, { useState } from 'react';
import { Check, Plus, Search, Trash2 } from 'lucide-react';
import {
  EventTask,
  TaskPhase,
  TaskPriority,
  TaskStatus,
} from '../types/event';
import { TaskMetrics, validateTaskInput } from '../utils/eventCalculations';

interface TasksTabProps {
  tasks: EventTask[];
  taskMetrics: TaskMetrics;
  onAddTask: (task: Omit<EventTask, 'id'>) => void;
  onUpdateTaskStatus: (taskId: string, status: TaskStatus) => void;
  onDeleteTask: (taskId: string) => void;
}

const PHASES: ('All' | TaskPhase)[] = [
  'All',
  'Pre-Event',
  'Venue & Catering',
  'Guest Experience',
  'Day-Of Execution',
];

/**
 * Renders the 4-phase production task checklist with search, phase/status filtering, and milestone creation.
 */
export const TasksTab: React.FC<TasksTabProps> = ({
  tasks,
  taskMetrics,
  onAddTask,
  onUpdateTaskStatus,
  onDeleteTask,
}): React.ReactElement => {
  const [selectedPhase, setSelectedPhase] = useState<'All' | TaskPhase>('All');
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // New Task Form State
  const [title, setTitle] = useState('');
  const [phase, setPhase] = useState<TaskPhase>('Venue & Catering');
  const [priority, setPriority] = useState<TaskPriority>('high');
  const [dueDate, setDueDate] = useState('2026-11-05');
  const [assignee, setAssignee] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const filteredTasks = tasks.filter((t) => {
    if (selectedPhase !== 'All' && t.phase !== selectedPhase) return false;
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (
      searchQuery.trim() !== '' &&
      !t.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !t.assignee.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateTaskInput({ title, dueDate, assignee });
    if (!validation.valid) {
      setFormError(validation.error || 'Please check required task fields.');
      return;
    }
    setFormError(null);
    onAddTask({
      title: title.trim(),
      phase,
      priority,
      status: 'todo',
      dueDate: dueDate.trim(),
      assignee: assignee.trim(),
      notes: notes.trim() || undefined,
    });
    setTitle('');
    setAssignee('');
    setNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Phase Progress Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {taskMetrics.phases.map((p) => (
          <div
            key={p.phase}
            className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium text-slate-700">{p.phase}</span>
              <span className="font-mono tabular-nums">
                {p.completed}/{p.total}
              </span>
            </div>
            <div className="my-2 text-xl font-bold font-mono tabular-nums text-slate-900">
              {p.percent}%
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-slate-900 transition-all duration-200"
                style={{ width: `${p.percent}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Cols: Interactive Task List */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Production Task Checklist
              </h2>
              <p className="text-xs text-slate-500 font-mono tabular-nums">
                Showing {filteredTasks.length} of {tasks.length} tasks · {taskMetrics.completionPercent}% complete
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search task or assignee..."
                aria-label="Search tasks by title or assignee"
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Interactive Filter Controls (Segmented Buttons) */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
            <div
              role="group"
              aria-label="Filter tasks by phase"
              className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg"
            >
              {PHASES.map((ph) => (
                <button
                  key={ph}
                  type="button"
                  onClick={() => setSelectedPhase(ph)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    selectedPhase === ph
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {ph}
                </button>
              ))}
            </div>

            <div
              role="group"
              aria-label="Filter tasks by status"
              className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg"
            >
              {(['all', 'todo', 'in-progress', 'completed'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    statusFilter === st
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st === 'all'
                    ? 'All Statuses'
                    : st === 'todo'
                    ? 'To Do'
                    : st === 'in-progress'
                    ? 'In Progress'
                    : 'Completed'}
                </button>
              ))}
            </div>
          </div>

          {/* Task Rows */}
          {filteredTasks.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-slate-200 rounded-lg">
              <p className="text-sm font-medium text-slate-700">
                No tasks match the current filter criteria.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Try clearing your search query or switching phase tabs.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredTasks.map((task) => {
                const isDone = task.status === 'completed';
                return (
                  <div
                    key={task.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 px-2 -mx-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateTaskStatus(
                            task.id,
                            isDone ? 'todo' : 'completed'
                          )
                        }
                        aria-label={
                          isDone
                            ? `Mark "${task.title}" as incomplete`
                            : `Mark "${task.title}" as completed`
                        }
                        className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                          isDone
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 bg-white hover:border-slate-900'
                        }`}
                      >
                        {isDone && <Check className="w-3.5 h-3.5" />}
                      </button>

                      <div>
                        <div
                          className={`text-sm font-medium ${
                            isDone
                              ? 'line-through text-slate-400'
                              : 'text-slate-900'
                          }`}
                        >
                          {task.title}
                        </div>
                        {/* Clean unboxed metadata with typographic separators */}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                          <span>{task.phase}</span>
                          <span aria-hidden="true">·</span>
                          <span>Owner: {task.assignee}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">
                            Due {task.dueDate}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={
                              task.priority === 'high'
                                ? 'text-red-600 font-medium'
                                : task.priority === 'medium'
                                ? 'text-amber-700 font-medium'
                                : 'text-slate-500'
                            }
                          >
                            {task.priority.charAt(0).toUpperCase() +
                              task.priority.slice(1)}{' '}
                            Priority
                          </span>
                        </div>
                        {task.notes && (
                          <p className="text-xs text-slate-500 mt-1 italic">
                            {task.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <select
                        aria-label={`Status for "${task.title}"`}
                        value={task.status}
                        onChange={(e) =>
                          onUpdateTaskStatus(
                            task.id,
                            e.target.value as TaskStatus
                          )
                        }
                        className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer"
                      >
                        <option value="todo">To Do</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => onDeleteTask(task.id)}
                        aria-label={`Delete task "${task.title}"`}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 4 Cols: Add New Task Form */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-base font-bold text-slate-900 mb-1">
            Add Production Task
          </h3>
          <p id="task-form-help" className="text-xs text-slate-500 mb-4">
            Assign a milestone to a team lead and phase.
          </p>

          <form
            onSubmit={handleSubmit}
            aria-describedby="task-form-help"
            className="space-y-4"
            noValidate
          >
            {formError && (
              <div
                id="task-form-error"
                role="alert"
                className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium"
              >
                {formError}
              </div>
            )}

            <div>
              <label
                htmlFor="new-task-title"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Task Description
              </label>
              <input
                id="new-task-title"
                type="text"
                value={title}
                aria-label="Task description"
                aria-describedby="task-form-help"
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Confirm harpist arrival time"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="new-task-phase"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Phase
                </label>
                <select
                  id="new-task-phase"
                  value={phase}
                  aria-label="Task phase"
                  aria-describedby="task-form-help"
                  onChange={(e) => setPhase(e.target.value as TaskPhase)}
                  className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="Pre-Event">Pre-Event</option>
                  <option value="Venue & Catering">Venue &amp; Catering</option>
                  <option value="Guest Experience">Guest Experience</option>
                  <option value="Day-Of Execution">Day-Of Execution</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="new-task-priority"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Priority
                </label>
                <select
                  id="new-task-priority"
                  value={priority}
                  aria-label="Task priority"
                  aria-describedby="task-form-help"
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="new-task-duedate"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Due Date
                </label>
                <input
                  id="new-task-duedate"
                  type="date"
                  value={dueDate}
                  aria-label="Task due date"
                  aria-describedby="task-form-help"
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label
                  htmlFor="new-task-assignee"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Assignee
                </label>
                <input
                  id="new-task-assignee"
                  type="text"
                  value={assignee}
                  aria-label="Task assignee"
                  aria-describedby="task-form-help"
                  onChange={(e) => setAssignee(e.target.value)}
                  placeholder="e.g., Camille Laurent"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="new-task-notes"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Production Notes (Optional)
              </label>
              <input
                id="new-task-notes"
                type="text"
                value={notes}
                aria-label="Task production notes"
                aria-describedby="task-form-help"
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Vendor contact or setup notes"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <button
              type="submit"
              aria-label="Add task to checklist"
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Task to Checklist
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
