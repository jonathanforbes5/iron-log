'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useWorkout, useActiveProgram, useLogs } from '@/lib/store';
import { ActiveWorkout, ProgramExercise, SetLog } from '@/lib/types';
import { EXERCISES, getExerciseName } from '@/lib/exercises';
import { calcE1RM, getLastPerformance, uid, rpeColor, formatDuration } from '@/lib/utils';
import { Plus, Check, Trash2, Timer, X, Star, ChevronDown, Info } from 'lucide-react';
import Link from 'next/link';

export default function WorkoutPage() {
  const { activeWorkout, startWorkout, logSet, removeSet, finishWorkout, cancelWorkout } = useWorkout();
  const { program, currentDay } = useActiveProgram();
  const logs = useLogs();

  if (activeWorkout) {
    return (
      <ActiveWorkoutView
        workout={activeWorkout}
        logs={logs}
        onLogSet={logSet}
        onRemoveSet={removeSet}
        onFinish={finishWorkout}
        onCancel={cancelWorkout}
      />
    );
  }

  function handleStart(dayName: string, plannedExercises: ProgramExercise[]) {
    const workout: ActiveWorkout = {
      startTime: new Date().toISOString(),
      programId: program?.id,
      dayName,
      plannedExercises,
      sets: [],
    };
    startWorkout(workout);
  }

  return (
    <div className="px-4 pt-6 space-y-6">
      <h1 className="text-2xl font-black tracking-tight">Start Workout</h1>

      {/* Start scheduled workout */}
      {currentDay ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <p className="text-xs text-zinc-500 mb-0.5">{program?.name}</p>
            <h2 className="font-black">{currentDay.name}</h2>
          </div>
          <div className="p-4 space-y-2">
            {currentDay.exercises.map((ex, i) => (
              <div key={i} className="flex items-center gap-3 py-1">
                <span className="text-zinc-700 text-sm w-5">{i + 1}.</span>
                <div className="flex-1">
                  <span className="text-sm font-semibold">{getExerciseName(ex.exerciseId)}</span>
                </div>
                <span className="text-xs text-zinc-500">
                  {ex.sets}×{ex.repsMin}‑{ex.repsMax}
                  {ex.rpeTarget ? ` @${ex.rpeTarget}` : ''}
                </span>
              </div>
            ))}
          </div>
          <div className="px-4 pb-4">
            <button
              onClick={() => handleStart(currentDay.name, currentDay.exercises)}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl transition-colors text-lg"
            >
              Start This Workout
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
          <p className="text-zinc-500 mb-4">No program active.</p>
          <Link href="/program" className="text-orange-400 font-bold text-sm hover:text-orange-300">
            Choose a Program →
          </Link>
        </div>
      )}

      {/* Empty / custom workout */}
      <button
        onClick={() => handleStart('Custom Workout', [])}
        className="w-full border border-dashed border-zinc-700 hover:border-zinc-600 text-zinc-500 hover:text-zinc-300 py-4 rounded-2xl text-sm font-semibold transition-colors"
      >
        + Start Empty Workout
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Active Workout View
// ─────────────────────────────────────────────────────────────────────────────

type LogsArg = ReturnType<typeof useLogs>;

function ActiveWorkoutView({
  workout,
  logs,
  onLogSet,
  onRemoveSet,
  onFinish,
  onCancel,
}: {
  workout: ActiveWorkout;
  logs: LogsArg;
  onLogSet: (set: SetLog) => void;
  onRemoveSet: (id: string) => void;
  onFinish: (log: import('@/lib/types').WorkoutLog) => void;
  onCancel: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [restTick, setRestTick] = useState(0);
  const [finishModal, setFinishModal] = useState(false);
  const [extraExercises, setExtraExercises] = useState<ProgramExercise[]>([]);

  // Elapsed timer
  useEffect(() => {
    const startMs = new Date(workout.startTime).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - startMs) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [workout.startTime]);

  // Rest timer countdown
  useEffect(() => {
    if (restTimer === null) return;
    if (restTick <= 0) { setRestTimer(null); return; }
    const id = setTimeout(() => setRestTick(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [restTimer, restTick]);

  function startRest(seconds: number) {
    setRestTimer(seconds);
    setRestTick(seconds);
  }

  function handleLogSet(set: SetLog) {
    onLogSet(set);
    startRest(180);
  }

  const allExercises: ProgramExercise[] = [...workout.plannedExercises, ...extraExercises];
  const uniqueExerciseIds = Array.from(new Set([
    ...allExercises.map(e => e.exerciseId),
    ...workout.sets.map(s => s.exerciseId),
  ]));

  const elapsedMin = Math.floor(elapsed / 60);
  const elapsedSec = elapsed % 60;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-500">In Progress</p>
            <h1 className="font-black leading-tight">{workout.dayName}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-zinc-400 text-sm font-mono">
              <Timer size={13} />
              {String(elapsedMin).padStart(2, '0')}:{String(elapsedSec).padStart(2, '0')}
            </div>
            <button
              onClick={() => setFinishModal(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors"
            >
              Finish
            </button>
          </div>
        </div>

        {/* Rest Timer */}
        {restTimer !== null && (
          <div className="mt-2 flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-2">
            <Timer size={13} className="text-orange-400" />
            <span className="text-xs text-zinc-400">Rest:</span>
            <span className={`text-sm font-bold font-mono ${restTick <= 30 ? 'text-orange-400' : 'text-white'}`}>
              {Math.floor(restTick / 60)}:{String(restTick % 60).padStart(2, '0')}
            </span>
            <button onClick={() => { setRestTimer(null); setRestTick(0); }} className="ml-auto text-zinc-600 hover:text-zinc-400">
              <X size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Exercise Cards */}
      <div className="flex-1 px-4 py-4 space-y-4">
        {uniqueExerciseIds.map(exerciseId => {
          const planned = allExercises.find(e => e.exerciseId === exerciseId);
          const exerciseSets = workout.sets.filter(s => s.exerciseId === exerciseId);
          const lastPerf = getLastPerformance(logs, exerciseId);

          return (
            <ExerciseCard
              key={exerciseId}
              exerciseId={exerciseId}
              planned={planned}
              sets={exerciseSets}
              lastPerformance={lastPerf}
              onLogSet={handleLogSet}
              onRemoveSet={onRemoveSet}
            />
          );
        })}

        {/* Add Exercise */}
        <AddExerciseButton onAdd={id => setExtraExercises(e => [...e, { exerciseId: id, sets: 3, repsMin: 8, repsMax: 12 }])} />
      </div>

      {/* Finish Modal */}
      {finishModal && (
        <FinishModal
          workout={workout}
          elapsed={elapsed}
          onConfirm={(rating, notes, bodyweight) => {
            const log: import('@/lib/types').WorkoutLog = {
              id: uid(),
              date: new Date().toISOString().slice(0, 10),
              startTime: workout.startTime,
              endTime: new Date().toISOString(),
              programId: workout.programId,
              dayName: workout.dayName,
              sets: workout.sets,
              notes,
              rating,
              bodyweight: bodyweight ? parseFloat(bodyweight) : undefined,
              durationMinutes: elapsedMin,
            };
            onFinish(log);
          }}
          onCancel={() => setFinishModal(false)}
          onAbandon={() => { if (confirm('Discard this workout?')) onCancel(); }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise Card
// ─────────────────────────────────────────────────────────────────────────────

function ExerciseCard({
  exerciseId,
  planned,
  sets,
  lastPerformance,
  onLogSet,
  onRemoveSet,
}: {
  exerciseId: string;
  planned?: ProgramExercise;
  sets: SetLog[];
  lastPerformance: { weight: number; reps: number; date: string } | null;
  onLogSet: (set: SetLog) => void;
  onRemoveSet: (id: string) => void;
}) {
  const [weight, setWeight] = useState(() => lastPerformance?.weight.toString() ?? '');
  const [reps, setReps] = useState(() => lastPerformance?.reps.toString() ?? planned?.repsMin.toString() ?? '');
  const [rpe, setRpe] = useState('');
  const [isWarmup, setIsWarmup] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const workingSets = sets.filter(s => !s.isWarmup);
  const targetSets = planned?.sets ?? 3;
  const progress = Math.min(workingSets.length / targetSets, 1);

  function handleLog() {
    const w = parseFloat(weight);
    const r = parseInt(reps);
    if (!w || !r) return;
    const set: SetLog = {
      id: uid(),
      exerciseId,
      exerciseName: getExerciseName(exerciseId),
      setNumber: sets.length + 1,
      weight: w,
      reps: r,
      rpe: rpe ? parseFloat(rpe) : undefined,
      isWarmup,
    };
    onLogSet(set);
    // Pre-fill weight for next set
    setReps(planned?.repsMin.toString() ?? '');
    setIsWarmup(false);
  }

  const e1rm = weight && reps ? calcE1RM(parseFloat(weight), parseInt(reps)) : null;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      {/* Exercise Header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <div className="flex-1">
          <h3 className="font-black text-base">{getExerciseName(exerciseId)}</h3>
          {planned && (
            <p className="text-xs text-zinc-500 mt-0.5">
              {planned.sets} sets · {planned.repsMin}–{planned.repsMax} reps
              {planned.rpeTarget ? ` · RPE ${planned.rpeTarget}` : ''}
            </p>
          )}
        </div>
        {/* Progress ring */}
        <div className="relative w-9 h-9 flex-shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="14" fill="none" stroke="#27272a" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="14" fill="none"
              stroke={progress >= 1 ? '#22c55e' : '#f97316'}
              strokeWidth="3"
              strokeDasharray={`${progress * 88} 88`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">
            {workingSets.length}/{targetSets}
          </span>
        </div>
        <ChevronDown size={15} className={`text-zinc-600 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
      </button>

      {!collapsed && (
        <>
          {/* Last performance */}
          {lastPerformance && (
            <div className="px-4 pb-2 flex items-center gap-2">
              <Info size={11} className="text-zinc-600" />
              <span className="text-xs text-zinc-600">
                Last: {lastPerformance.weight} × {lastPerformance.reps}
              </span>
            </div>
          )}

          {/* Logged sets */}
          {sets.length > 0 && (
            <div className="px-4 pb-2">
              <div className="grid grid-cols-[2rem_1fr_1fr_1fr_1.5rem] gap-1 text-[10px] text-zinc-600 mb-1 px-1">
                <span>#</span><span>Weight</span><span>Reps</span><span>RPE</span><span />
              </div>
              {sets.map((set, i) => (
                <div
                  key={set.id}
                  className={`grid grid-cols-[2rem_1fr_1fr_1fr_1.5rem] gap-1 items-center py-1.5 px-1 rounded-lg ${
                    set.isWarmup ? 'opacity-50' : 'bg-zinc-800/50'
                  }`}
                >
                  <span className="text-xs text-zinc-500">{set.isWarmup ? 'W' : i + 1 - sets.filter((s, j) => s.isWarmup && j < i).length}</span>
                  <span className="text-sm font-semibold">{set.weight}</span>
                  <span className="text-sm">{set.reps}</span>
                  <span className={`text-sm ${rpeColor(set.rpe)}`}>{set.rpe ?? '—'}</span>
                  <button
                    onClick={() => onRemoveSet(set.id)}
                    className="text-zinc-700 hover:text-red-400 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input row */}
          <div className="px-4 pb-4 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <p className="text-[10px] text-zinc-600 mb-1 text-center">Weight</p>
                <input
                  type="number"
                  placeholder="lbs"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-2 text-center text-sm font-bold focus:outline-none focus:border-orange-500 transition-colors no-spin"
                />
              </div>
              <div>
                <p className="text-[10px] text-zinc-600 mb-1 text-center">Reps</p>
                <input
                  type="number"
                  placeholder="reps"
                  value={reps}
                  onChange={e => setReps(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-2 text-center text-sm font-bold focus:outline-none focus:border-orange-500 transition-colors no-spin"
                />
              </div>
              <div>
                <p className="text-[10px] text-zinc-600 mb-1 text-center">RPE</p>
                <input
                  type="number"
                  placeholder="6–10"
                  value={rpe}
                  onChange={e => setRpe(e.target.value)}
                  min="1"
                  max="10"
                  step="0.5"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-2 text-center text-sm font-bold focus:outline-none focus:border-orange-500 transition-colors no-spin"
                />
              </div>
            </div>

            {e1rm && (
              <p className="text-center text-xs text-zinc-500">
                e1RM: <span className="text-orange-400 font-bold">{e1rm} lbs</span>
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setIsWarmup(w => !w)}
                className={`flex-shrink-0 text-xs font-bold py-2 px-3 rounded-lg border transition-colors ${
                  isWarmup ? 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10' : 'border-zinc-700 text-zinc-500 hover:border-zinc-600'
                }`}
              >
                Warm-up
              </button>
              <button
                onClick={handleLog}
                disabled={!weight || !reps}
                className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold py-2 rounded-lg transition-colors"
              >
                <Check size={15} />
                Log Set
              </button>
            </div>
          </div>

          {planned?.notes && (
            <div className="mx-4 mb-4 bg-zinc-800/50 rounded-lg px-3 py-2">
              <p className="text-xs text-zinc-500 italic">{planned.notes}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Add Exercise Button
// ─────────────────────────────────────────────────────────────────────────────

function AddExerciseButton({ onAdd }: { onAdd: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = EXERCISES.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.muscleGroups.some(m => m.toLowerCase().includes(search.toLowerCase()))
  ).slice(0, 15);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full border border-dashed border-zinc-700 hover:border-orange-500/50 text-zinc-500 hover:text-orange-400 py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
      >
        <Plus size={16} />
        Add Exercise
      </button>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-2xl overflow-hidden">
      <input
        autoFocus
        type="text"
        placeholder="Search exercises..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full bg-transparent px-4 py-3 text-sm focus:outline-none border-b border-zinc-800"
      />
      <div className="max-h-56 overflow-y-auto">
        {filtered.map(ex => (
          <button
            key={ex.id}
            onClick={() => { onAdd(ex.id); setOpen(false); setSearch(''); }}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800 text-left transition-colors border-b border-zinc-800/50 last:border-0"
          >
            <div>
              <p className="text-sm font-semibold">{ex.name}</p>
              <p className="text-xs text-zinc-500">{ex.muscleGroups.join(', ')}</p>
            </div>
            <Plus size={14} className="text-zinc-600" />
          </button>
        ))}
      </div>
      <button onClick={() => setOpen(false)} className="w-full py-2.5 text-xs text-zinc-500 hover:text-zinc-300 border-t border-zinc-800 transition-colors">
        Cancel
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Finish Modal
// ─────────────────────────────────────────────────────────────────────────────

function FinishModal({
  workout,
  elapsed,
  onConfirm,
  onCancel,
  onAbandon,
}: {
  workout: ActiveWorkout;
  elapsed: number;
  onConfirm: (rating: 1 | 2 | 3 | 4 | 5, notes: string, bodyweight: string) => void;
  onCancel: () => void;
  onAbandon: () => void;
}) {
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(4);
  const [notes, setNotes] = useState('');
  const [bodyweight, setBodyweight] = useState('');

  const workingSets = workout.sets.filter(s => !s.isWarmup);
  const exercises = Array.from(new Set(workout.sets.map(s => s.exerciseId)));

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end">
      <div className="w-full max-w-lg mx-auto bg-zinc-900 border-t border-zinc-700 rounded-t-3xl p-6 space-y-5">
        <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto -mt-2" />
        <h2 className="text-xl font-black text-center">Finish Workout</h2>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Duration', value: formatDuration(Math.floor(elapsed / 60)) },
            { label: 'Exercises', value: exercises.length.toString() },
            { label: 'Working Sets', value: workingSets.length.toString() },
          ].map(({ label, value }) => (
            <div key={label} className="bg-zinc-800 rounded-xl p-3 text-center">
              <p className="text-lg font-black">{value}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Rating */}
        <div>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">How was this session?</p>
          <div className="flex gap-2 justify-center">
            {([1, 2, 3, 4, 5] as const).map(r => (
              <button
                key={r}
                onClick={() => setRating(r)}
                className={`text-2xl transition-all ${r <= rating ? 'text-orange-500' : 'text-zinc-700 hover:text-zinc-500'}`}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        {/* Bodyweight */}
        <div>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Bodyweight (optional)</p>
          <input
            type="number"
            placeholder="lbs"
            value={bodyweight}
            onChange={e => setBodyweight(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500 no-spin"
          />
        </div>

        {/* Notes */}
        <div>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Notes</p>
          <textarea
            placeholder="How did it feel? Any PRs? Injuries to note..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500 resize-none"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onAbandon}
            className="flex-shrink-0 border border-red-900/50 text-red-400 hover:bg-red-900/20 text-sm font-bold py-3 px-4 rounded-xl transition-colors"
          >
            <Trash2 size={15} />
          </button>
          <button
            onClick={onCancel}
            className="flex-1 border border-zinc-700 text-zinc-400 hover:bg-zinc-800 font-bold py-3 rounded-xl transition-colors"
          >
            Keep Going
          </button>
          <button
            onClick={() => onConfirm(rating, notes, bodyweight)}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
