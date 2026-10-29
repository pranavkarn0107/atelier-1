import React, { useState } from 'react';
import { AlertTriangle, Clock, Plus, Trash2 } from 'lucide-react';
import { ScheduleItem, ScheduleStatus } from '../types/event';
import {
  TimelineMetrics,
  validateScheduleInput,
} from '../utils/eventCalculations';

interface TimelineTabProps {
  timelineMetrics: TimelineMetrics;
  onAddScheduleItem: (item: Omit<ScheduleItem, 'id'>) => void;
  onUpdateScheduleStatus: (id: string, status: ScheduleStatus) => void;
  onDeleteScheduleItem: (id: string) => void;
}

export const TimelineTab: React.FC<TimelineTabProps> = ({
  timelineMetrics,
  onAddScheduleItem,
  onUpdateScheduleStatus,
  onDeleteScheduleItem,
}) => {
  const [startTime, setStartTime] = useState('22:30');
  const [endTime, setEndTime] = useState('23:15');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [leadContact, setLeadContact] = useState('Camille Laurent');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateScheduleInput({
      title,
      startTime,
      endTime,
      location,
    });
    if (!validation.valid) {
      setFormError(
        validation.error || 'Please verify schedule block times and title.'
      );
      return;
    }
    setFormError(null);
    onAddScheduleItem({
      startTime,
      endTime,
      title: title.trim(),
      location: location.trim(),
      leadContact: leadContact.trim() || 'Production Lead',
      status: 'scheduled',
      notes: notes.trim() || undefined,
    });
    setTitle('');
    setLocation('');
    setNotes('');
  };

  return (
    <div className="space-y-6">
      {timelineMetrics.conflictCount > 0 && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3 text-sm text-amber-900">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-semibold">
                Schedule Overlap Detected ({timelineMetrics.conflictCount}{' '}
                conflict{timelineMetrics.conflictCount > 1 ? 's' : ''}):
              </span>{' '}
              Two or more run-of-show blocks share overlapping time windows.
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Cols: Chronological Run-of-Show */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Master Run-of-Show Cue Sheet
              </h2>
              <p className="text-xs text-slate-500 font-mono tabular-nums">
                {timelineMetrics.blocks.length} sequential blocks ·{' '}
                {(timelineMetrics.totalDurationMinutes / 60).toFixed(1)} hours
                total runtime · {timelineMetrics.readinessPercent}% stage-ready ·{' '}
                {timelineMetrics.recommendedBufferMinutes}m min recommended stage
                buffer
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {timelineMetrics.blocks.map((block) => (
              <div
                key={block.id}
                className={`py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-3 -mx-3 rounded-lg transition-colors ${
                  block.hasConflict
                    ? 'bg-amber-50/70'
                    : 'hover:bg-slate-50/70'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-28 shrink-0 font-mono tabular-nums">
                    <div className="text-sm font-bold text-slate-900">
                      {block.startTime} – {block.endTime}
                    </div>
                    <div className="text-xs text-slate-500 inline-flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" aria-hidden="true" />
                      {block.durationMinutes} min
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {block.title}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span>Zone: {block.location}</span>
                      <span aria-hidden="true">·</span>
                      <span>Cue Lead: {block.leadContact}</span>
                      {block.bufferBeforeMinutes !== null &&
                        block.bufferBeforeMinutes >= 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span
                              className={
                                block.hasTightBuffer
                                  ? 'text-amber-700 font-medium font-mono tabular-nums'
                                  : 'text-emerald-700 font-mono tabular-nums'
                              }
                            >
                              {block.bufferBeforeMinutes === 0
                                ? 'Back-to-back stage transition (0m buffer)'
                                : `+${block.bufferBeforeMinutes}m stage transition buffer`}
                            </span>
                          </>
                        )}
                      {block.hasConflict && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-amber-700 font-semibold">
                            Overlaps with: {block.conflictingWithTitles.join(', ')}
                          </span>
                        </>
                      )}
                    </div>
                    {block.notes && (
                      <p className="text-xs text-slate-500 mt-1 italic">
                        {block.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <select
                    aria-label={`Readiness status for "${block.title}"`}
                    value={block.status}
                    onChange={(e) =>
                      onUpdateScheduleStatus(
                        block.id,
                        e.target.value as ScheduleStatus
                      )
                    }
                    className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="ready">Stage Ready</option>
                    <option value="completed">Completed</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => onDeleteScheduleItem(block.id)}
                    aria-label={`Delete schedule block "${block.title}"`}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 4 Cols: Add Schedule Cue Form */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-base font-bold text-slate-900 mb-1">
            Add Run-of-Show Block
          </h3>
          <p id="schedule-form-help" className="text-xs text-slate-500 mb-4">
            Sorted chronologically with overlap &amp; 15-min stage buffer checks.
          </p>

          <form
            onSubmit={handleSubmit}
            aria-describedby="schedule-form-help"
            className="space-y-4"
            noValidate
          >
            {formError && (
              <div
                id="schedule-form-error"
                role="alert"
                className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium"
              >
                {formError}
              </div>
            )}

            <div>
              <label
                htmlFor="schedule-title"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Cue / Activity Title
              </label>
              <input
                id="schedule-title"
                type="text"
                value={title}
                aria-label="Schedule cue or activity title"
                aria-describedby="schedule-form-help"
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., After-Hours Vinyl Lounge Set"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="schedule-start"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Start Time (24h)
                </label>
                <input
                  id="schedule-start"
                  type="time"
                  value={startTime}
                  aria-label="Schedule block start time"
                  aria-describedby="schedule-form-help"
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label
                  htmlFor="schedule-end"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  End Time (24h)
                </label>
                <input
                  id="schedule-end"
                  type="time"
                  value={endTime}
                  aria-label="Schedule block end time"
                  aria-describedby="schedule-form-help"
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="schedule-location"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Venue Zone / Room
                </label>
                <input
                  id="schedule-location"
                  type="text"
                  value={location}
                  aria-label="Venue zone or room"
                  aria-describedby="schedule-form-help"
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., South Conservatory"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label
                  htmlFor="schedule-lead"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Point of Contact
                </label>
                <input
                  id="schedule-lead"
                  type="text"
                  value={leadContact}
                  aria-label="Point of contact for schedule block"
                  aria-describedby="schedule-form-help"
                  onChange={(e) => setLeadContact(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="schedule-notes"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                AV / Stage Notes (Optional)
              </label>
              <input
                id="schedule-notes"
                type="text"
                value={notes}
                aria-label="AV or stage notes"
                aria-describedby="schedule-form-help"
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Cue lighting preset 4"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <button
              type="submit"
              aria-label="Add schedule block to master run-of-show"
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Schedule Block
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
