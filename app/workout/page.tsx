'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWorkout, useActiveProgram, useLogs, useProfile, useCardio } from '@/lib/store';
import { ActiveWorkout, ProgramExercise, SetLog, CardioLog } from '@/lib/types';
import { EXERCISES, getExerciseName, EXERCISE_ALTERNATIVES } from '@/lib/exercises';
import {
  calcE1RM, getLastPerformance, uid, rpeColor, formatDuration,
  getSuggestedWeightRange, totalVolume, workingSetCount,
} from '@/lib/utils';
import { Plus, Check, Timer, X, Star, ChevronDown, RefreshCw, Info, Activity } from 'lucide-react';
import Link from 'next/link';

// ─────────────────────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────────────────────
export default function WorkoutPage() {
  const { activeWorkout, startWorkout, logSet, removeSet, swapExercise, finishWorkout, cancelWorkout } = useWorkout();
  const { program, currentDay } = useActiveProgram();
  const logs = useLogs();
  const { profile } = useProfile();
  const { addCardio } = useCardio();
  const [showCardio, setShowCardio] = useState(false);

  function handleStart(dayName: string, plannedExercises: ProgramExercise[]) {
    startWorkout({ startTime: new Date().toISOString(), programId: program?.id, dayName, plannedExercises, sets: [], swaps: {} });
  }

  if (activeWorkout) {
    return (
      <ActiveWorkoutView
        workout={activeWorkout}
        logs={logs}
        profile={profile}
        onLogSet={logSet}
        onRemoveSet={removeSet}
        onSwap={swapExercise}
        onFinish={finishWorkout}
        onCancel={cancelWorkout}
      />
    );
  }

  if (showCardio) {
    return <CardioLogger onSave={(log) => { addCardio(log); setShowCardio(false); }} onCancel={() => setShowCardio(false)} />;
  }

  return (
    <div className="px-4 pt-6 space-y-4">
      <h1 className="text-2xl font-black tracking-tight">Start Workout</h1>

      {currentDay ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <p className="text-xs text-zinc-500 mb-0.5">{program?.name}</p>
            <h2 className="font-black text-lg">{currentDay.name}</h2>
          </div>
          <div className="p-4 space-y-2">
            {currentDay.exercises.map((ex, i) => {
              const suggested = profile ? getSuggestedWeightRange(ex.exerciseId, ex.repsMin, ex.repsMax, ex.rpeTarget ?? 8, profile) : null;
              return (
                <div key={i} className="flex items-center gap-3 py-1">
                  <span className="text-zinc-700 text-xs w-4">{i+1}.</span>
                  <div className="flex-1">
                    <span className="text-sm font-semibold">{getExerciseName(ex.exerciseId)}</span>
                    {suggested && (
                      <span className="text-xs text-orange-400 ml-2">~{suggested.low}–{suggested.high} lbs</span>
                    )}
                  </div>
                  <span className="text-xs text-zinc-500 flex-shrink-0">
                    {ex.sets}×{ex.repsMin}–{ex.repsMax}{ex.rpeTarget ? ` @${ex.rpeTarget}` : ''}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="px-4 pb-4">
            <button onClick={() => handleStart(currentDay.name, currentDay.exercises)}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-xl transition-colors active:scale-[0.98] text-lg">
              Start This Workout
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
          <p className="text-zinc-500 mb-4">No program active.</p>
          <Link href="/program" className="text-orange-400 font-bold text-sm">Choose a Program →</Link>
        </div>
      )}

      <button onClick={() => handleStart('Custom Workout', [])}
        className="w-full border border-dashed border-zinc-700 hover:border-zinc-600 text-zinc-500 hover:text-zinc-300 py-4 rounded-2xl text-sm font-semibold transition-colors">
        + Start Empty Workout
      </button>

      <button onClick={() => setShowCardio(true)}
        className="w-full flex items-center justify-center gap-2 border border-dashed border-blue-500/40 hover:border-blue-500/60 text-blue-400 hover:text-blue-300 py-4 rounded-2xl text-sm font-semibold transition-colors">
        <Activity size={16} />
        Log Cardio / Basketball
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Active Workout
// ─────────────────────────────────────────────────────────────────────────────
function ActiveWorkoutView({ workout, logs, profile, onLogSet, onRemoveSet, onSwap, onFinish, onCancel }: {
  workout: ActiveWorkout;
  logs: ReturnType<typeof useLogs>;
  profile: ReturnType<typeof useProfile>['profile'];
  onLogSet: (s: SetLog) => void;
  onRemoveSet: (id: string) => void;
  onSwap: (orig: string, rep: string) => void;
  onFinish: (log: import('@/lib/types').WorkoutLog) => void;
  onCancel: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [restTick, setRestTick] = useState<number | null>(null);
  const [finishModal, setFinishModal] = useState(false);
  const [extraExercises, setExtraExercises] = useState<ProgramExercise[]>([]);

  useEffect(() => {
    const startMs = new Date(workout.startTime).getTime();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startMs) / 1000)), 1000);
    return () => clearInterval(id);
  }, [workout.startTime]);

  useEffect(() => {
    if (restTick === null || restTick <= 0) return;
    const id = setTimeout(() => setRestTick(t => (t ?? 1) - 1), 1000);
    return () => clearTimeout(id);
  }, [restTick]);

  function handleLogSet(set: SetLog) { onLogSet(set); setRestTick(180); }

  const planned = workout.plannedExercises.map(ex => ({
    ...ex,
    exerciseId: workout.swaps[ex.exerciseId] ?? ex.exerciseId,
    originalId: ex.exerciseId,
  }));

  const uniqueIds = Array.from(new Set([
    ...planned.map(e => e.exerciseId),
    ...extraExercises.map(e => e.exerciseId),
    ...workout.sets.map(s => s.exerciseId),
  ]));

  const elapsedMin = Math.floor(elapsed / 60);
  const elapsedSec = elapsed % 60;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Sticky header */}
      <div className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-500">In Progress</p>
            <h1 className="font-black">{workout.dayName}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono text-zinc-400">
              {String(elapsedMin).padStart(2,'0')}:{String(elapsedSec).padStart(2,'0')}
            </span>
            <button onClick={() => setFinishModal(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors">
              Finish
            </button>
          </div>
        </div>
        {restTick !== null && restTick > 0 && (
          <div className="mt-2 flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-2">
            <Timer size={13} className="text-orange-400" />
            <span className="text-xs text-zinc-400">Rest:</span>
            <span className={`text-sm font-bold font-mono ${restTick <= 30 ? 'text-orange-400' : 'text-white'}`}>
              {Math.floor(restTick/60)}:{String(restTick%60).padStart(2,'0')}
            </span>
            <div className="ml-auto flex gap-2">
              {[60,90,180].map(t => (
                <button key={t} onClick={() => setRestTick(t)} className="text-[10px] text-zinc-500 hover:text-zinc-300">{t}s</button>
              ))}
              <button onClick={() => setRestTick(null)}><X size={13} className="text-zinc-600" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Exercise cards */}
      <div className="flex-1 px-4 py-4 space-y-4">
        {uniqueIds.map(exerciseId => {
          const plannedEx = planned.find(e => e.exerciseId === exerciseId);
          const originalId = plannedEx?.originalId ?? exerciseId;
          const extraEx = extraExercises.find(e => e.exerciseId === exerciseId);
          const meta = plannedEx ?? extraEx;
          const exerciseSets = workout.sets.filter(s => s.exerciseId === exerciseId);
          const lastPerf = getLastPerformance(logs, exerciseId);
          const suggested = meta?.rpeTarget && profile
            ? getSuggestedWeightRange(originalId, meta.repsMin, meta.repsMax, meta.rpeTarget, profile)
            : null;
          const alternatives = EXERCISE_ALTERNATIVES[originalId] ?? [];

          return (
            <ExerciseCard
              key={exerciseId}
              exerciseId={exerciseId}
              originalId={originalId}
              planned={meta}
              sets={exerciseSets}
              lastPerformance={lastPerf}
              suggestedWeight={suggested}
              alternatives={alternatives}
              onLogSet={handleLogSet}
              onRemoveSet={onRemoveSet}
              onSwap={rep => onSwap(originalId, rep)}
            />
          );
        })}

        <AddExerciseButton onAdd={id => setExtraExercises(e => [...e, { exerciseId: id, sets: 3, repsMin: 8, repsMax: 12, alternatives: EXERCISE_ALTERNATIVES[id] }])} />
      </div>

      {finishModal && (
        <FinishModal
          workout={workout}
          elapsed={elapsed}
          onConfirm={(rating, notes, bw) => {
            const log: import('@/lib/types').WorkoutLog = {
              id: uid(), date: new Date().toISOString().slice(0,10),
              startTime: workout.startTime, endTime: new Date().toISOString(),
              programId: workout.programId, dayName: workout.dayName,
              sets: workout.sets, notes, rating, bodyweight: bw ? parseFloat(bw) : undefined,
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
function ExerciseCard({ exerciseId, originalId, planned, sets, lastPerformance, suggestedWeight, alternatives, onLogSet, onRemoveSet, onSwap }: {
  exerciseId: string;
  originalId: string;
  planned?: ProgramExercise;
  sets: SetLog[];
  lastPerformance: { weight: number; reps: number; date: string } | null;
  suggestedWeight: { low: number; high: number } | null;
  alternatives: string[];
  onLogSet: (s: SetLog) => void;
  onRemoveSet: (id: string) => void;
  onSwap: (replacementId: string) => void;
}) {
  const [weight, setWeight] = useState(() => lastPerformance?.weight.toString() ?? suggestedWeight?.high.toString() ?? '');
  const [reps, setReps] = useState(() => planned?.repsMin.toString() ?? '');
  const [rpe, setRpe] = useState('');
  const [isWarmup, setIsWarmup] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showSwap, setShowSwap] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const workingSets = sets.filter(s => !s.isWarmup);
  const targetSets = planned?.sets ?? 3;
  const progress = Math.min(workingSets.length / targetSets, 1);
  const e1rm = weight && reps ? calcE1RM(parseFloat(weight), parseInt(reps)) : null;
  const exercise = EXERCISES.find(e => e.id === exerciseId);

  function handleLog() {
    const w = parseFloat(weight);
    const r = parseInt(reps);
    if (!w || !r) return;
    onLogSet({ id: uid(), exerciseId, exerciseName: getExerciseName(exerciseId), setNumber: sets.length + 1, weight: w, reps: r, rpe: rpe ? parseFloat(rpe) : undefined, isWarmup });
    setIsWarmup(false);
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <button onClick={() => setCollapsed(c => !c)} className="flex-1 flex items-center gap-3 text-left">
          <div className="flex-1">
            <h3 className="font-black">{getExerciseName(exerciseId)}</h3>
            {planned && (
              <p className="text-xs text-zinc-500">
                {planned.sets}×{planned.repsMin}–{planned.repsMax}{planned.rpeTarget ? ` · RPE ${planned.rpeTarget}` : ''}
              </p>
            )}
          </div>
          {/* Progress circle */}
          <div className="relative w-9 h-9 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="14" fill="none" stroke="#27272a" strokeWidth="3" />
              <circle cx="18" cy="18" r="14" fill="none" stroke={progress >= 1 ? '#22c55e' : '#f97316'} strokeWidth="3"
                strokeDasharray={`${progress * 88} 88`} strokeLinecap="round" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">
              {workingSets.length}/{targetSets}
            </span>
          </div>
        </button>
        {/* Swap + Info buttons */}
        {alternatives.length > 0 && (
          <button onClick={() => { setShowSwap(s => !s); setShowInfo(false); }}
            className="text-zinc-600 hover:text-zinc-300 transition-colors p-1" title="Swap exercise">
            <RefreshCw size={14} />
          </button>
        )}
        {exercise && (
          <button onClick={() => { setShowInfo(s => !s); setShowSwap(false); }}
            className="text-zinc-600 hover:text-zinc-300 transition-colors p-1">
            <Info size={14} />
          </button>
        )}
      </div>

      {/* Exercise Info panel */}
      {showInfo && exercise && (
        <div className="mx-4 mb-2 bg-zinc-800/60 rounded-xl p-3">
          <p className="text-xs text-zinc-400"><span className="text-zinc-300 font-semibold">Muscles:</span> {exercise.muscleGroups.join(', ')}</p>
          <p className="text-xs text-zinc-400 mt-0.5"><span className="text-zinc-300 font-semibold">Type:</span> {exercise.category} · {exercise.movement}</p>
          {planned?.notes && <p className="text-xs text-orange-400 mt-1 italic">{planned.notes}</p>}
        </div>
      )}

      {/* Swap panel */}
      {showSwap && (
        <div className="mx-4 mb-3 bg-zinc-800/60 rounded-xl overflow-hidden">
          <p className="text-xs text-zinc-500 px-3 py-2 border-b border-zinc-700">Swap to:</p>
          <div className="max-h-40 overflow-y-auto">
            {alternatives.map(altId => (
              <button key={altId} onClick={() => { onSwap(altId); setShowSwap(false); }}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-zinc-700 text-left transition-colors border-b border-zinc-700/50 last:border-0">
                <span className="text-sm">{getExerciseName(altId)}</span>
                <Check size={13} className="text-zinc-600" />
              </button>
            ))}
          </div>
        </div>
      )}

      {!collapsed && (
        <>
          {/* Suggested weight */}
          {suggestedWeight && (
            <div className="px-4 pb-1">
              <p className="text-xs text-orange-400">
                Suggested: {suggestedWeight.low}–{suggestedWeight.high} lbs (based on your 1RM)
              </p>
            </div>
          )}

          {/* Last performance */}
          {lastPerformance && (
            <div className="px-4 pb-1">
              <p className="text-xs text-zinc-600">
                Last: {lastPerformance.weight} × {lastPerformance.reps}
              </p>
            </div>
          )}

          {/* Logged sets */}
          {sets.length > 0 && (
            <div className="px-4 pb-2">
              <div className="grid grid-cols-[2.5rem_1fr_1fr_1fr_1.5rem] text-[10px] text-zinc-600 mb-1 px-1">
                <span>#</span><span>Weight</span><span>Reps</span><span>RPE</span><span />
              </div>
              {sets.map((set, i) => {
                const workingIdx = sets.filter((s, j) => !s.isWarmup && j < i).length;
                return (
                  <div key={set.id} className={`grid grid-cols-[2.5rem_1fr_1fr_1fr_1.5rem] items-center py-2 px-1 rounded-lg mb-0.5 ${set.isWarmup ? 'opacity-50' : 'bg-zinc-800/50'}`}>
                    <span className="text-xs text-zinc-500">{set.isWarmup ? 'W' : workingIdx + 1}</span>
                    <span className="text-sm font-semibold">{set.weight}</span>
                    <span className="text-sm">{set.reps}</span>
                    <span className={`text-sm ${rpeColor(set.rpe)}`}>{set.rpe ?? '—'}</span>
                    <button onClick={() => onRemoveSet(set.id)} className="text-zinc-700 hover:text-red-400 transition-colors">
                      <X size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Input row */}
          <div className="px-4 pb-4 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Weight', val: weight, set: setWeight, ph: 'lbs' },
                { label: 'Reps',   val: reps,   set: setReps,   ph: 'reps' },
                { label: 'RPE',    val: rpe,    set: setRpe,    ph: '6–10' },
              ].map(({ label, val, set, ph }) => (
                <div key={label}>
                  <p className="text-[10px] text-zinc-600 mb-1 text-center">{label}</p>
                  <input type="number" placeholder={ph} value={val}
                    onChange={e => set(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-2.5 text-center text-sm font-bold focus:outline-none focus:border-orange-500 transition-colors no-spin" />
                </div>
              ))}
            </div>

            {e1rm && (
              <p className="text-center text-xs text-zinc-500">
                e1RM: <span className="text-orange-400 font-bold">{e1rm} lbs</span>
              </p>
            )}

            <div className="flex gap-2">
              <button onClick={() => setIsWarmup(w => !w)}
                className={`flex-shrink-0 text-xs font-bold py-2.5 px-3 rounded-lg border transition-colors ${isWarmup ? 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10' : 'border-zinc-700 text-zinc-500'}`}>
                Warm-up
              </button>
              <button onClick={handleLog} disabled={!weight || !reps}
                className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold py-2.5 rounded-lg transition-colors active:scale-[0.98]">
                <Check size={15} />
                Log Set
              </button>
            </div>
          </div>
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
      <button onClick={() => setOpen(true)}
        className="w-full border border-dashed border-zinc-700 hover:border-orange-500/50 text-zinc-500 hover:text-orange-400 py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
        <Plus size={16} /> Add Exercise
      </button>
    );
  }
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-2xl overflow-hidden">
      <input autoFocus type="text" placeholder="Search exercises..." value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full bg-transparent px-4 py-3 text-sm focus:outline-none border-b border-zinc-800" />
      <div className="max-h-56 overflow-y-auto">
        {filtered.map(ex => (
          <button key={ex.id} onClick={() => { onAdd(ex.id); setOpen(false); setSearch(''); }}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800 text-left transition-colors border-b border-zinc-800/50 last:border-0">
            <div>
              <p className="text-sm font-semibold">{ex.name}</p>
              <p className="text-xs text-zinc-500">{ex.muscleGroups.join(', ')}</p>
            </div>
            <Plus size={14} className="text-zinc-600" />
          </button>
        ))}
      </div>
      <button onClick={() => setOpen(false)} className="w-full py-2.5 text-xs text-zinc-500 border-t border-zinc-800">Cancel</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Finish Modal
// ─────────────────────────────────────────────────────────────────────────────
function FinishModal({ workout, elapsed, onConfirm, onCancel, onAbandon }: {
  workout: ActiveWorkout;
  elapsed: number;
  onConfirm: (rating: 1|2|3|4|5, notes: string, bw: string) => void;
  onCancel: () => void;
  onAbandon: () => void;
}) {
  const [rating, setRating] = useState<1|2|3|4|5>(4);
  const [notes, setNotes] = useState('');
  const [bw, setBw] = useState('');

  const workingSets = workout.sets.filter(s => !s.isWarmup);
  const exercises = Array.from(new Set(workout.sets.map(s => s.exerciseId)));

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end">
      <div className="w-full max-w-lg mx-auto bg-zinc-900 border-t border-zinc-700 rounded-t-3xl p-6 space-y-5">
        <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto -mt-2" />
        <h2 className="text-xl font-black text-center">Finish Workout</h2>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Duration', value: formatDuration(Math.floor(elapsed/60)) },
            { label: 'Exercises', value: String(exercises.length) },
            { label: 'Sets', value: String(workingSets.length) },
          ].map(({ label, value }) => (
            <div key={label} className="bg-zinc-800 rounded-xl p-3 text-center">
              <p className="text-lg font-black">{value}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <div>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Session Rating</p>
          <div className="flex gap-2 justify-center">
            {([1,2,3,4,5] as const).map(r => (
              <button key={r} onClick={() => setRating(r)}
                className={`text-3xl transition-all active:scale-90 ${r <= rating ? 'text-orange-500' : 'text-zinc-700'}`}>★</button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Bodyweight</p>
            <input type="number" placeholder="lbs" value={bw} onChange={e => setBw(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500 no-spin" />
          </div>
        </div>

        <div>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Notes</p>
          <textarea placeholder="PRs, how it felt, what to change..." value={notes}
            onChange={e => setNotes(e.target.value)} rows={2}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500 resize-none" />
        </div>

        <div className="flex gap-3">
          <button onClick={onAbandon} className="flex-shrink-0 border border-red-900/50 text-red-400 hover:bg-red-900/20 text-sm font-bold py-3 px-4 rounded-xl transition-colors">
            Discard
          </button>
          <button onClick={onCancel} className="flex-1 border border-zinc-700 text-zinc-400 font-bold py-3 rounded-xl hover:bg-zinc-800 transition-colors">
            Keep Going
          </button>
          <button onClick={() => onConfirm(rating, notes, bw)}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Cardio Logger
// ─────────────────────────────────────────────────────────────────────────────
function CardioLogger({ onSave, onCancel }: { onSave: (log: CardioLog) => void; onCancel: () => void }) {
  const [type, setType] = useState<CardioLog['type']>('basketball');
  const [duration, setDuration] = useState('60');
  const [intensity, setIntensity] = useState<CardioLog['intensity']>('moderate');
  const [notes, setNotes] = useState('');

  const TYPES: { id: CardioLog['type']; label: string; emoji: string }[] = [
    { id: 'basketball', label: 'Basketball', emoji: '🏀' },
    { id: 'running',    label: 'Running',    emoji: '🏃' },
    { id: 'cycling',    label: 'Cycling',    emoji: '🚴' },
    { id: 'swimming',   label: 'Swimming',   emoji: '🏊' },
    { id: 'other',      label: 'Other',      emoji: '⚡' },
  ];

  return (
    <div className="px-4 pt-6 pb-8 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onCancel} className="text-zinc-500 hover:text-white transition-colors text-sm">← Cancel</button>
        <h1 className="text-xl font-black">Log Cardio</h1>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Activity</label>
        <div className="grid grid-cols-3 gap-2">
          {TYPES.map(t => (
            <button key={t.id} onClick={() => setType(t.id)}
              className={`py-3 rounded-xl text-sm font-bold border transition-colors flex flex-col items-center gap-1 ${type === t.id ? 'bg-blue-500/20 border-blue-500/50 text-blue-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>
              <span className="text-xl">{t.emoji}</span>
              <span className="text-xs">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Duration (minutes)</label>
        <input type="number" value={duration} onChange={e => setDuration(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:border-blue-500 no-spin" />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Intensity</label>
        <div className="grid grid-cols-3 gap-2">
          {(['low','moderate','high'] as const).map(i => (
            <button key={i} onClick={() => setIntensity(i)}
              className={`py-2.5 rounded-xl text-sm font-bold capitalize border transition-colors ${intensity === i ? 'bg-blue-500 border-blue-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>
              {i}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Notes</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="How was the session?"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 resize-none placeholder:text-zinc-600" />
      </div>

      <button onClick={() => onSave({ id: uid(), date: new Date().toISOString().slice(0,10), type, duration: parseInt(duration)||0, intensity, notes })}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 rounded-2xl transition-colors text-lg">
        Save Cardio Session
      </button>
    </div>
  );
}
