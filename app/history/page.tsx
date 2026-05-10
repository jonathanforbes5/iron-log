'use client';

import { useState } from 'react';
import { useLogs } from '@/lib/store';
import { WorkoutLog } from '@/lib/types';
import { formatDate, totalVolume, workingSetCount, formatDuration, calcE1RM } from '@/lib/utils';
import { ChevronDown, ChevronUp, Dumbbell, Clock, BarChart3 } from 'lucide-react';

export default function HistoryPage() {
  const logs = useLogs();
  const [expanded, setExpanded] = useState<string | null>(null);

  if (logs.length === 0) {
    return (
      <div className="px-4 pt-6">
        <h1 className="text-2xl font-black tracking-tight mb-8">History</h1>
        <div className="text-center py-16 space-y-3">
          <Dumbbell size={40} className="mx-auto text-zinc-700" />
          <p className="text-zinc-500">No workouts logged yet.</p>
          <p className="text-sm text-zinc-600">Start your first session from the Workout tab.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 space-y-4">
      <h1 className="text-2xl font-black tracking-tight">History</h1>
      <p className="text-sm text-zinc-500">{logs.length} session{logs.length !== 1 ? 's' : ''} logged</p>

      <div className="space-y-3">
        {logs.map(log => (
          <WorkoutCard
            key={log.id}
            log={log}
            expanded={expanded === log.id}
            onToggle={() => setExpanded(expanded === log.id ? null : log.id)}
          />
        ))}
      </div>
    </div>
  );
}

function WorkoutCard({ log, expanded, onToggle }: { log: WorkoutLog; expanded: boolean; onToggle: () => void }) {
  const volume = totalVolume(log.sets);
  const sets = workingSetCount(log.sets);
  const exercises = Array.from(new Set(log.sets.map(s => s.exerciseId)));

  // Group sets by exercise for display
  const grouped = exercises.map(id => {
    const exSets = log.sets.filter(s => s.exerciseId === id);
    const best = exSets.reduce(
      (b, s) => (calcE1RM(s.weight, s.reps) > calcE1RM(b.weight, b.reps) ? s : b),
      exSets[0]
    );
    return { id, name: exSets[0].exerciseName, sets: exSets, best };
  });

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <button onClick={onToggle} className="w-full p-4 text-left">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-black">{log.dayName}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{formatDate(log.date)}</p>
          </div>
          <div className="flex items-center gap-3">
            {log.rating && (
              <span className="text-xs text-orange-400">
                {'★'.repeat(log.rating)}
                <span className="text-zinc-700">{'★'.repeat(5 - log.rating)}</span>
              </span>
            )}
            {expanded ? <ChevronUp size={15} className="text-zinc-600" /> : <ChevronDown size={15} className="text-zinc-600" />}
          </div>
        </div>

        <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500">
          {log.durationMinutes !== undefined && (
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {formatDuration(log.durationMinutes)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Dumbbell size={11} />
            {exercises.length} exercises
          </span>
          <span className="flex items-center gap-1">
            <BarChart3 size={11} />
            {sets} sets
          </span>
          {volume > 0 && (
            <span>{(volume / 1000).toFixed(0)}k lbs</span>
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-zinc-800">
          {grouped.map(({ id, name, sets: exSets }) => (
            <div key={id} className="px-4 py-3 border-b border-zinc-800/50 last:border-0">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold">{name}</p>
                <span className="text-xs text-zinc-600">{exSets.filter(s => !s.isWarmup).length} working sets</span>
              </div>
              <div className="space-y-1">
                {exSets.map((set, i) => (
                  <div key={set.id} className={`flex items-center gap-3 text-xs ${set.isWarmup ? 'text-zinc-600' : 'text-zinc-400'}`}>
                    <span className="w-5 text-right">{set.isWarmup ? 'W' : i + 1 - exSets.filter((s, j) => s.isWarmup && j < i).length}</span>
                    <span className="font-bold text-zinc-200">{set.weight} lbs</span>
                    <span>× {set.reps}</span>
                    {set.rpe && <span className="text-zinc-600">@ RPE {set.rpe}</span>}
                    <span className="text-zinc-700 ml-auto">e1RM: {calcE1RM(set.weight, set.reps)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {log.notes && (
            <div className="px-4 py-3 bg-zinc-800/30">
              <p className="text-xs text-zinc-400 italic">"{log.notes}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
