'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWorkout, useActiveProgram, useLogs, useProfile, useCardio, useAICoach, useReadiness } from '@/lib/store';
import { ActiveWorkout, ProgramExercise, SetLog, CardioLog, WorkoutLog, ReadinessCheckin, MuscleReadiness } from '@/lib/types';
import { EXERCISES, getExerciseName, EXERCISE_ALTERNATIVES } from '@/lib/exercises';
import {
  calcE1RM, getLastPerformance, getPreviousBest, uid, rpeColor, formatDuration,
  getSuggestedWeightRange, getAccessorySuggestion, totalVolume, workingSetCount, calcPlates, getWarmupRamp, todayISO,
} from '@/lib/utils';
import { getAdvancedCoachingAnalysis } from '@/lib/ai';
import { Plus, Check, Timer, X, ChevronDown, RefreshCw, Info, Activity, Brain, Trophy, Minus, Zap, Eye, MessageSquare, FileText, Pencil, MapPin, Moon } from 'lucide-react';
import Link from 'next/link';

const LOCATIONS = [
  { id: 'commercial', label: 'Commercial Gym', emoji: '🏋️' },
  { id: 'home',       label: 'Home Gym',       emoji: '🏠' },
  { id: 'garage',     label: 'Garage Gym',     emoji: '🚗' },
  { id: 'outdoors',   label: 'Outdoors',        emoji: '🌳' },
  { id: 'hotel',      label: 'Hotel Gym',      emoji: '🏨' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────────────────────
export default function WorkoutPage() {
  const { activeWorkout, startWorkout, logSet, removeSet, updateSet, setExerciseNote, swapExercise, toggleSkipExercise, finishWorkout, cancelWorkout } = useWorkout();
  const { program, currentDay } = useActiveProgram();
  const logs = useLogs();
  const { profile } = useProfile();
  const { addCardio } = useCardio();
  const { addActions } = useAICoach();
  const { todayLog, addCheckin } = useReadiness();
  const [showCardio, setShowCardio] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [finishedLog, setFinishedLog] = useState<import('@/lib/types').WorkoutLog | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [preWorkout, setPreWorkout] = useState<{ dayName: string; exercises: ProgramExercise[] } | null>(null);

  function requestStart(dayName: string, plannedExercises: ProgramExercise[]) {
    setPreWorkout({ dayName, exercises: plannedExercises });
  }

  function handleStart(dayName: string, plannedExercises: ProgramExercise[], location?: string) {
    startWorkout({ startTime: new Date().toISOString(), programId: program?.id, dayName, plannedExercises, sets: [], swaps: {}, exerciseNotes: {}, skippedExercises: [], location });
    setPreWorkout(null);
  }

  async function handleFinishWorkout(log: import('@/lib/types').WorkoutLog) {
    finishWorkout(log);
    setFinishedLog(log);
    if (profile?.claudeApiKey) {
      setAiLoading(true);
      try {
        const { analysis, actions } = await getAdvancedCoachingAnalysis(
          log, logs.slice(0, 8), profile, program ?? null, profile.claudeApiKey,
        );
        if (analysis) setAiAnalysis(analysis);
        if (actions.length) addActions(actions);
      } catch { /* silent */ }
      setAiLoading(false);
    }
  }

  // Post-workout completion screen
  if (finishedLog) {
    const workingSets = finishedLog.sets.filter(s => !s.isWarmup).length;
    return (
      <div className="px-4 pt-8 pb-10 space-y-5">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-green-500/20 border border-green-500/30 rounded-2xl flex items-center justify-center mx-auto">
            <Check size={28} className="text-green-400" />
          </div>
          <h1 className="text-2xl font-black">{finishedLog.dayName} Done</h1>
          <div className="flex justify-center gap-4 text-sm text-zinc-500">
            <span>{workingSets} sets</span>
            <span>·</span>
            <span>{finishedLog.durationMinutes ?? 0} min</span>
          </div>
        </div>

        {aiLoading && (
          <div className="flex items-center gap-2 justify-center text-zinc-500">
            <Brain size={14} className="text-orange-400 animate-pulse" />
            <span className="text-sm">AI analyzing your session…</span>
          </div>
        )}

        {aiAnalysis && (
          <div className="bg-zinc-900 border border-orange-500/25 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Brain size={13} className="text-orange-400" />
              <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">AI Coach</span>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">{aiAnalysis}</p>
            {!aiLoading && (
              <p className="text-[11px] text-zinc-600 mt-2">Any adjustments from the AI are in Coach&apos;s Corner on the dashboard.</p>
            )}
          </div>
        )}

        <button onClick={() => { setFinishedLog(null); setAiAnalysis(''); }}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl transition-colors text-lg">
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (activeWorkout) {
    return (
      <ActiveWorkoutView
        workout={activeWorkout}
        logs={logs}
        profile={profile}
        onLogSet={logSet}
        onRemoveSet={removeSet}
        onUpdateSet={updateSet}
        onSetExerciseNote={setExerciseNote}
        onSwap={swapExercise}
        onToggleSkip={toggleSkipExercise}
        onFinish={handleFinishWorkout}
        onCancel={cancelWorkout}
      />
    );
  }

  if (showCardio) {
    return <CardioLogger onSave={(log) => { addCardio(log); setShowCardio(false); }} onCancel={() => setShowCardio(false)} />;
  }

  if (showPreview && program && currentDay) {
    return (
      <WorkoutPreview
        program={program}
        day={currentDay}
        logs={logs}
        profile={profile}
        onStart={() => { setShowPreview(false); requestStart(currentDay.name, currentDay.exercises); }}
        onClose={() => setShowPreview(false)}
      />
    );
  }

  return (
    <div className="px-4 pt-6 space-y-4">
      <h1 className="text-2xl font-black tracking-tight">Start Workout</h1>

      {!todayLog && (
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl px-4 py-3 flex items-center gap-3">
          <Moon size={16} className="text-amber-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-amber-300">No check-in today</p>
            <p className="text-xs text-amber-400/70">Log your readiness before training for better AI insights</p>
          </div>
          <Link href="/readiness" className="text-xs font-bold text-amber-400 hover:text-amber-300 flex-shrink-0">Check in →</Link>
        </div>
      )}

      {currentDay ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <p className="text-xs text-zinc-500 mb-0.5">{program?.name}</p>
            <h2 className="font-black text-lg">{currentDay.name}</h2>
          </div>
          <div className="p-4 space-y-2">
            {currentDay.exercises.map((ex, i) => {
              const suggested = profile ? getSuggestedWeightRange(ex.exerciseId, ex.repsMin, ex.repsMax, ex.rpeTarget ?? 8, profile) : null;
              const lastPerf = getLastPerformance(logs, ex.exerciseId);
              return (
                <div key={i} className="flex items-center gap-3 py-1">
                  <span className="text-zinc-700 text-xs w-4">{i+1}.</span>
                  <div className="flex-1">
                    <span className="text-sm font-semibold">{getExerciseName(ex.exerciseId)}</span>
                    {suggested && (
                      <span className="text-xs text-orange-400 ml-2">~{suggested.low}–{suggested.high}</span>
                    )}
                    {lastPerf && (
                      <span className="text-xs text-zinc-600 ml-2">Last: {lastPerf.weight}×{lastPerf.reps}</span>
                    )}
                  </div>
                  <span className="text-xs text-zinc-500 flex-shrink-0">
                    {ex.sets}×{ex.repsMin}–{ex.repsMax}{ex.rpeTarget ? ` @${ex.rpeTarget}` : ''}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="px-4 pb-4 flex gap-2">
            <button onClick={() => setShowPreview(true)}
              className="flex items-center gap-1.5 border border-zinc-700 hover:border-zinc-600 text-zinc-400 hover:text-zinc-200 font-bold py-3 px-4 rounded-xl transition-colors text-sm flex-shrink-0">
              <Eye size={15} /> Preview
            </button>
            <button onClick={() => requestStart(currentDay.name, currentDay.exercises)}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-black py-3 rounded-xl transition-colors active:scale-[0.98] text-base">
              Start Workout
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
          <p className="text-zinc-500 mb-4">No program active.</p>
          <Link href="/program" className="text-orange-400 font-bold text-sm">Choose a Program →</Link>
        </div>
      )}

      <button onClick={() => requestStart('Custom Workout', [])}
        className="w-full border border-dashed border-zinc-700 hover:border-zinc-600 text-zinc-500 hover:text-zinc-300 py-4 rounded-2xl text-sm font-semibold transition-colors">
        + Start Empty Workout
      </button>

      <button onClick={() => setShowCardio(true)}
        className="w-full flex items-center justify-center gap-2 border border-dashed border-blue-500/40 hover:border-blue-500/60 text-blue-400 hover:text-blue-300 py-4 rounded-2xl text-sm font-semibold transition-colors">
        <Activity size={16} />
        Log Cardio / Basketball
      </button>

      {preWorkout && (
        <PreWorkoutModal
          dayName={preWorkout.dayName}
          hasTodayCheckin={!!todayLog}
          onStart={(location, checkin) => {
            if (checkin) addCheckin(checkin);
            handleStart(preWorkout.dayName, preWorkout.exercises, location);
          }}
          onCancel={() => setPreWorkout(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Workout Preview (read-only, no timer started)
// ─────────────────────────────────────────────────────────────────────────────
function WorkoutPreview({ program, day, logs, profile, onStart, onClose }: {
  program: import('@/lib/types').Program;
  day: import('@/lib/types').ProgramDay;
  logs: WorkoutLog[];
  profile: ReturnType<typeof useProfile>['profile'];
  onStart: () => void;
  onClose: () => void;
}) {
  return (
    <div className="px-4 pt-6 pb-6 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors text-sm">← Back</button>
        <div className="flex-1">
          <p className="text-xs text-zinc-500">{program.name}</p>
          <h1 className="text-xl font-black">{day.name}</h1>
        </div>
        <span className="text-xs text-zinc-600">{day.exercises.length} exercises</span>
      </div>

      <div className="space-y-3">
        {day.exercises.map((ex, i) => {
          const suggested = profile
            ? getSuggestedWeightRange(ex.exerciseId, ex.repsMin, ex.repsMax, ex.rpeTarget ?? 8, profile)
            : null;
          const recent = getLastPerformance(logs, ex.exerciseId);
          // Find prior performance (most recent before the last one)
          const olderLogs = recent
            ? logs.filter(l => l.date < recent.date)
            : [];
          const prior = getLastPerformance(olderLogs, ex.exerciseId);

          return (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-600 text-xs">{i + 1}.</span>
                    <h3 className="font-bold truncate">{getExerciseName(ex.exerciseId)}</h3>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5 ml-4">
                    {ex.sets} sets × {ex.repsMin}–{ex.repsMax} reps
                    {ex.rpeTarget ? ` · RPE ${ex.rpeTarget}` : ''}
                  </p>
                </div>
                {suggested && (
                  <span className="text-orange-400 text-sm font-bold flex-shrink-0">
                    {suggested.low}–{suggested.high} lbs
                  </span>
                )}
              </div>
              {(recent || prior) && (
                <div className="mt-2 ml-4 flex gap-4 text-xs">
                  {recent && (
                    <span className="text-zinc-500">
                      Last: <span className="text-zinc-200 font-semibold">{recent.weight} × {recent.reps}</span>
                      <span className="text-zinc-600"> ({recent.date})</span>
                    </span>
                  )}
                  {prior && (
                    <span className="text-zinc-600">
                      Prior: {prior.weight} × {prior.reps}
                    </span>
                  )}
                </div>
              )}
              {ex.notes && (
                <p className="text-xs text-orange-400 italic mt-1.5 ml-4">{ex.notes}</p>
              )}
            </div>
          );
        })}
      </div>

      <button onClick={onStart}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-2xl transition-colors active:scale-[0.98] text-lg sticky bottom-4">
        Start Workout
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Active Workout
// ─────────────────────────────────────────────────────────────────────────────
function ActiveWorkoutView({ workout, logs, profile, onLogSet, onRemoveSet, onUpdateSet, onSetExerciseNote, onSwap, onToggleSkip, onFinish, onCancel }: {
  workout: ActiveWorkout;
  logs: ReturnType<typeof useLogs>;
  profile: ReturnType<typeof useProfile>['profile'];
  onLogSet: (s: SetLog) => void;
  onRemoveSet: (id: string) => void;
  onUpdateSet: (s: SetLog) => void;
  onSetExerciseNote: (exerciseId: string, note: string) => void;
  onSwap: (orig: string, rep: string) => void;
  onToggleSkip: (exerciseId: string) => void;
  onFinish: (log: import('@/lib/types').WorkoutLog) => void;
  onCancel: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [restTick, setRestTick] = useState<number | null>(null);
  const [finishModal, setFinishModal] = useState(false);
  const [discardConfirm, setDiscardConfirm] = useState(false);
  const [extraExercises, setExtraExercises] = useState<ProgramExercise[]>([]);
  const [workoutNote, setWorkoutNote] = useState('');
  const [notesPanelOpen, setNotesPanelOpen] = useState(false);

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

  useEffect(() => {
    if (restTick === 0) {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([100, 50, 100, 50, 200]);
      }
    }
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

  // All-time best e1RM per exercise (from completed workouts, for PR detection)
  const allTimeBests = Object.fromEntries(
    uniqueIds.map(id => [id, getPreviousBest(logs, id)?.e1rm ?? null])
  );

  const elapsedMin = Math.floor(elapsed / 60);
  const elapsedSec = elapsed % 60;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Sticky header */}
      <div className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs text-zinc-500">In Progress</p>
              {workout.location && (
                <span className="flex items-center gap-0.5 text-[10px] text-zinc-600">
                  <MapPin size={9} /> {workout.location}
                </span>
              )}
            </div>
            <h1 className="font-black">{workout.dayName}</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-zinc-400">
              {String(elapsedMin).padStart(2,'0')}:{String(elapsedSec).padStart(2,'0')}
            </span>
            {discardConfirm ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-red-400">Discard?</span>
                <button onClick={() => { setDiscardConfirm(false); onCancel(); }}
                  className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold py-2 px-2.5 rounded-lg transition-colors">
                  Yes
                </button>
                <button onClick={() => setDiscardConfirm(false)}
                  className="bg-zinc-700 text-zinc-300 text-xs font-bold py-2 px-2.5 rounded-lg transition-colors">
                  No
                </button>
              </div>
            ) : (
              <>
                <button onClick={() => setDiscardConfirm(true)}
                  className="border border-zinc-700 text-zinc-500 hover:text-red-400 hover:border-red-500/40 text-xs font-bold py-2 px-2.5 rounded-lg transition-colors">
                  Discard
                </button>
                <button onClick={() => setFinishModal(true)}
                  className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors">
                  Finish
                </button>
              </>
            )}
          </div>
        </div>
        {restTick !== null && restTick >= 0 && (
          <div className={`mt-2 rounded-xl overflow-hidden border transition-colors ${restTick === 0 ? 'border-green-500/50 bg-green-500/10' : 'border-zinc-700 bg-zinc-800/80'}`}>
            {/* Progress bar */}
            <div className="h-1 bg-zinc-700">
              <div className="h-full bg-orange-500 transition-all duration-1000"
                style={{ width: `${(restTick / 180) * 100}%`, backgroundColor: restTick <= 30 ? '#ef4444' : restTick === 0 ? '#22c55e' : '#f97316' }} />
            </div>
            <div className="flex items-center gap-2 px-3 py-2">
              <Timer size={13} className={restTick === 0 ? 'text-green-400' : 'text-orange-400'} />
              <span className={`text-sm font-black font-mono tabular-nums ${restTick === 0 ? 'text-green-400' : restTick <= 30 ? 'text-red-400' : 'text-white'}`}>
                {restTick === 0 ? 'Go!' : `${Math.floor(restTick/60)}:${String(restTick%60).padStart(2,'0')}`}
              </span>
              <div className="ml-auto flex items-center gap-2">
                {[60,90,180].map(t => (
                  <button key={t} onClick={() => setRestTick(t)}
                    className="text-[10px] font-bold text-zinc-500 hover:text-zinc-200 bg-zinc-700 hover:bg-zinc-600 px-1.5 py-0.5 rounded transition-colors">
                    {t < 60 ? `${t}s` : `${t/60}m`}
                  </button>
                ))}
                <button onClick={() => setRestTick(null)} className="text-zinc-600 hover:text-zinc-400 ml-1">
                  <X size={12} />
                </button>
              </div>
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

          const isSkipped = (workout.skippedExercises ?? []).includes(exerciseId);
          return (
            <ExerciseCard
              key={exerciseId}
              exerciseId={exerciseId}
              originalId={originalId}
              planned={meta}
              sets={exerciseSets}
              lastPerformance={lastPerf}
              allTimeBest={allTimeBests[exerciseId] ?? null}
              suggestedWeight={suggested}
              alternatives={alternatives}
              logs={logs}
              exerciseNote={workout.exerciseNotes?.[exerciseId] ?? ''}
              isSkipped={isSkipped}
              onLogSet={handleLogSet}
              onRemoveSet={onRemoveSet}
              onUpdateSet={onUpdateSet}
              onSetExerciseNote={note => onSetExerciseNote(exerciseId, note)}
              onSwap={rep => onSwap(originalId, rep)}
              onToggleSkip={() => onToggleSkip(exerciseId)}
            />
          );
        })}

        {/* Workout-level notes */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <button
            onClick={() => setNotesPanelOpen(o => !o)}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-left"
          >
            <FileText size={14} className={workoutNote ? 'text-orange-400' : 'text-zinc-600'} />
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex-1">Workout Notes</span>
            {workoutNote && !notesPanelOpen && (
              <span className="text-[10px] text-zinc-600 italic truncate max-w-[140px]">{workoutNote}</span>
            )}
            <ChevronDown size={12} className={`text-zinc-600 transition-transform ${notesPanelOpen ? 'rotate-180' : ''}`} />
          </button>
          {notesPanelOpen && (
            <div className="px-4 pb-4">
              <textarea
                value={workoutNote}
                onChange={e => setWorkoutNote(e.target.value)}
                placeholder="Felt strong today, left knee tight, PR on squat…"
                rows={3}
                autoFocus
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500 resize-none placeholder:text-zinc-600"
              />
            </div>
          )}
        </div>

        <AddExerciseButton onAdd={id => setExtraExercises(e => [...e, { exerciseId: id, sets: 3, repsMin: 8, repsMax: 12, alternatives: EXERCISE_ALTERNATIVES[id] }])} />
      </div>

      {finishModal && (
        <FinishModal
          workout={workout}
          elapsed={elapsed}
          initialNotes={workoutNote}
          onConfirm={(rating, notes, bw) => {
            const log: import('@/lib/types').WorkoutLog = {
              id: uid(), date: new Date().toISOString().slice(0,10),
              startTime: workout.startTime, endTime: new Date().toISOString(),
              programId: workout.programId, dayName: workout.dayName,
              sets: workout.sets, notes,
              exerciseNotes: Object.keys(workout.exerciseNotes ?? {}).length
                ? workout.exerciseNotes : undefined,
              skippedExercises: (workout.skippedExercises ?? []).length
                ? workout.skippedExercises : undefined,
              location: workout.location,
              rating, bodyweight: bw ? parseFloat(bw) : undefined,
              durationMinutes: elapsedMin,
            };
            onFinish(log);
          }}
          onCancel={() => setFinishModal(false)}
          onAbandon={() => { setFinishModal(false); onCancel(); }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise Card
// ─────────────────────────────────────────────────────────────────────────────
function ExerciseCard({ exerciseId, originalId, planned, sets, lastPerformance, allTimeBest, suggestedWeight, alternatives, logs, exerciseNote, isSkipped, onLogSet, onRemoveSet, onUpdateSet, onSetExerciseNote, onSwap, onToggleSkip }: {
  exerciseId: string;
  originalId: string;
  planned?: ProgramExercise;
  sets: SetLog[];
  lastPerformance: { weight: number; reps: number; date: string } | null;
  allTimeBest: number | null;
  suggestedWeight: { low: number; high: number } | null;
  alternatives: string[];
  logs: WorkoutLog[];
  exerciseNote: string;
  isSkipped: boolean;
  onLogSet: (s: SetLog) => void;
  onRemoveSet: (id: string) => void;
  onUpdateSet: (s: SetLog) => void;
  onSetExerciseNote: (note: string) => void;
  onSwap: (replacementId: string) => void;
  onToggleSkip: () => void;
}) {
  const initWeight = lastPerformance?.weight.toString() ?? suggestedWeight?.high.toString() ?? '';
  const [weight, setWeight] = useState(initWeight);
  const [reps, setReps] = useState(planned?.repsMin.toString() ?? '');
  const [rpe, setRpe] = useState('');
  const [isWarmup, setIsWarmup] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showSwap, setShowSwap] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showPlates, setShowPlates] = useState(false);
  const [quickLog, setQuickLog] = useState(false);
  const [note, setNote] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const [exNoteOpen, setExNoteOpen] = useState(false);
  const [exNoteDraft, setExNoteDraft] = useState(exerciseNote);
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [prSetIds, setPrSetIds] = useState<Set<string>>(new Set());
  // Track the best e1RM so far in this session (starts at allTimeBest)
  const sessionBest = useRef<number>(allTimeBest ?? 0);

  const workingSets = sets.filter(s => !s.isWarmup);
  const targetSets = planned?.sets ?? 3;
  const progress = Math.min(workingSets.length / targetSets, 1);
  const wNum = parseFloat(weight) || 0;
  const rNum = parseInt(reps) || 0;
  const e1rm = wNum && rNum ? calcE1RM(wNum, rNum) : null;
  const exercise = EXERCISES.find(e => e.id === exerciseId);
  const plates = calcPlates(wNum);
  const warmupSteps = getWarmupRamp(wNum);

  // Smart suggestion: only show when the exercise doesn't have a 1RM-based target
  // (main lifts get RPE targets; accessories/isolation get this smarter guide)
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);
  const accessorySuggestion = !suggestedWeight && !suggestionDismissed && workingSets.length === 0
    ? getAccessorySuggestion(exerciseId, planned?.repsMin ?? 6, planned?.repsMax ?? 12, null, logs)
    : null;

  function stepWeight(delta: number) {
    setWeight(v => {
      const next = (parseFloat(v) || 0) + delta;
      return String(Math.max(0, Math.round(next * 10) / 10));
    });
  }
  function stepReps(delta: number) {
    setReps(v => String(Math.max(1, (parseInt(v) || 0) + delta)));
  }
  function loadLast() {
    if (!lastPerformance) return;
    setWeight(String(lastPerformance.weight));
    setReps(String(lastPerformance.reps));
  }

  function handleLog() {
    const w = parseFloat(weight);
    const r = parseInt(reps);
    if (!w || !r) return;
    const setId = uid();
    if (!isWarmup) {
      const thisE1rm = calcE1RM(w, r);
      if (thisE1rm > sessionBest.current) {
        setPrSetIds(prev => new Set([...prev, setId]));
        sessionBest.current = thisE1rm;
      }
    }
    onLogSet({ id: setId, exerciseId, exerciseName: getExerciseName(exerciseId), setNumber: sets.length + 1, weight: w, reps: r, rpe: rpe ? parseFloat(rpe) : undefined, isWarmup, note: note.trim() || undefined });
    setNote('');
    setNoteOpen(false);
    setIsWarmup(false);
  }

  function handleQuickLogAll(w: number, repsArr: number[], warmup: boolean) {
    for (let i = 0; i < repsArr.length; i++) {
      const r = repsArr[i];
      if (!r) continue;
      const setId = uid();
      if (!warmup) {
        const thisE1rm = calcE1RM(w, r);
        if (thisE1rm > sessionBest.current) {
          setPrSetIds(prev => new Set([...prev, setId]));
          sessionBest.current = thisE1rm;
        }
      }
      onLogSet({ id: setId, exerciseId, exerciseName: getExerciseName(exerciseId), setNumber: sets.length + 1 + i, weight: w, reps: r, isWarmup: warmup });
    }
    setQuickLog(false);
  }

  return (
    <div className={`bg-zinc-900 border rounded-2xl overflow-hidden transition-colors ${isSkipped ? 'border-zinc-700 opacity-60' : workingSets.length >= targetSets ? 'border-green-500/30' : 'border-zinc-800'}`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <button onClick={() => setCollapsed(c => !c)} className="flex-1 flex items-center gap-3 text-left">
          <div className="flex-1">
            <h3 className={`font-black ${isSkipped ? 'line-through text-zinc-500' : ''}`}>{getExerciseName(exerciseId)}</h3>
            {isSkipped ? (
              <p className="text-[10px] text-zinc-600 italic">Skipped</p>
            ) : planned ? (
              <p className="text-xs text-zinc-500">
                {planned.sets}×{planned.repsMin}–{planned.repsMax}{planned.rpeTarget ? ` · RPE ${planned.rpeTarget}` : ''}
              </p>
            ) : null}
            {exerciseNote && !exNoteOpen && !isSkipped && (
              <p className="text-[10px] text-orange-400/80 italic mt-0.5 leading-snug">{exerciseNote}</p>
            )}
          </div>
          <div className="relative w-9 h-9 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="14" fill="none" stroke="#27272a" strokeWidth="3" />
              <circle cx="18" cy="18" r="14" fill="none" stroke={isSkipped ? '#71717a' : progress >= 1 ? '#22c55e' : '#f97316'} strokeWidth="3"
                strokeDasharray={`${(isSkipped ? 1 : progress) * 88} 88`} strokeLinecap="round" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">
              {isSkipped ? '—' : `${workingSets.length}/${targetSets}`}
            </span>
          </div>
        </button>
        <button
          onClick={onToggleSkip}
          className={`p-1 transition-colors text-xs font-bold rounded-lg border px-2 py-1 ${isSkipped ? 'border-zinc-600 text-zinc-400 bg-zinc-800' : 'border-zinc-700 text-zinc-600 hover:border-red-500/40 hover:text-red-400'}`}
          title={isSkipped ? 'Un-skip' : 'Skip this exercise'}
        >
          {isSkipped ? 'Undo' : 'Skip'}
        </button>
        <button
          onClick={() => { setExNoteOpen(o => !o); setExNoteDraft(exerciseNote); }}
          className={`p-1 transition-colors ${exerciseNote || exNoteOpen ? 'text-orange-400' : 'text-zinc-600 hover:text-zinc-300'}`}
          title="Note for this exercise"
        >
          <FileText size={14} />
        </button>
        {alternatives.length > 0 && (
          <button onClick={() => { setShowSwap(s => !s); setShowInfo(false); }}
            className="text-zinc-600 hover:text-zinc-300 transition-colors p-1">
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

      {/* Exercise-level note panel */}
      {exNoteOpen && (
        <div className="mx-4 mb-2 space-y-2">
          <textarea
            placeholder="Note for all sets (e.g. supinated grip, paused reps…)"
            value={exNoteDraft}
            onChange={e => setExNoteDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Escape') { setExNoteOpen(false); }
            }}
            rows={2}
            autoFocus
            className="w-full bg-zinc-800 border border-orange-500/40 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-500 placeholder:text-zinc-600 resize-none"
          />
          <div className="flex gap-2">
          <button
            onClick={() => { onSetExerciseNote(exNoteDraft.trim()); setExNoteOpen(false); }}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors"
          >
            Save
          </button>
          {exerciseNote && (
            <button
              onClick={() => { onSetExerciseNote(''); setExNoteDraft(''); setExNoteOpen(false); }}
              className="text-zinc-500 hover:text-zinc-300 text-xs px-3 py-2 rounded-xl border border-zinc-700 transition-colors"
            >
              Clear
            </button>
          )}
          </div>
        </div>
      )}

      {/* Info panel — muscle groups + warmup ramp */}
      {showInfo && exercise && (
        <div className="mx-4 mb-2 bg-zinc-800/60 rounded-xl p-3 space-y-2">
          <p className="text-xs text-zinc-400"><span className="text-zinc-300 font-semibold">Muscles:</span> {exercise.muscleGroups.join(', ')}</p>
          <p className="text-xs text-zinc-400"><span className="text-zinc-300 font-semibold">Type:</span> {exercise.category} · {exercise.movement}</p>
          {planned?.notes && <p className="text-xs text-orange-400 italic">{planned.notes}</p>}
          {wNum > 0 && warmupSteps.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Warmup Ramp</p>
              <div className="flex gap-2 flex-wrap">
                {warmupSteps.map((step, i) => (
                  <div key={i} className="bg-zinc-700/60 rounded-lg px-2.5 py-1.5 text-center">
                    <p className="text-xs font-bold text-zinc-200">{step.weight}</p>
                    <p className="text-[9px] text-zinc-500">×{step.reps}</p>
                  </div>
                ))}
                <div className="bg-orange-500/20 border border-orange-500/30 rounded-lg px-2.5 py-1.5 text-center">
                  <p className="text-xs font-bold text-orange-400">{wNum}</p>
                  <p className="text-[9px] text-orange-400/70">work</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Swap panel */}
      {showSwap && (
        <div className="mx-4 mb-3 bg-zinc-800/60 rounded-xl overflow-hidden">
          <div className="px-3 py-2 border-b border-zinc-700">
            <p className="text-xs text-zinc-500">Swap to:</p>
            {lastPerformance && (
              <p className="text-[10px] text-zinc-600 mt-0.5">
                Current last: <span className="text-zinc-400">{lastPerformance.weight} × {lastPerformance.reps}</span>
                <span className="ml-1">({lastPerformance.date})</span>
              </p>
            )}
          </div>
          <div className="max-h-52 overflow-y-auto">
            {alternatives.map(altId => {
              const altLast = getLastPerformance(logs, altId);
              return (
                <button key={altId} onClick={() => { onSwap(altId); setShowSwap(false); }}
                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-zinc-700 text-left transition-colors border-b border-zinc-700/50 last:border-0">
                  <div>
                    <span className="text-sm font-semibold">{getExerciseName(altId)}</span>
                    {altLast ? (
                      <p className="text-[10px] text-zinc-500 mt-0.5">
                        Last: {altLast.weight} × {altLast.reps}
                        <span className="text-zinc-600 ml-1">({altLast.date})</span>
                      </p>
                    ) : (
                      <p className="text-[10px] text-zinc-600 mt-0.5">No history</p>
                    )}
                  </div>
                  <Check size={13} className="text-zinc-600 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!collapsed && !isSkipped && (
        <>
          {/* Smart suggestion chip (accessories / isolation) */}
          {accessorySuggestion && (
            <div className="mx-4 mb-2 bg-blue-500/8 border border-blue-500/20 rounded-xl px-3 py-2.5 flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Suggested</span>
                  {accessorySuggestion.direction && (
                    <span className={`text-xs font-black ${accessorySuggestion.direction === '↑' ? 'text-green-400' : accessorySuggestion.direction === '↓' ? 'text-red-400' : 'text-zinc-400'}`}>
                      {accessorySuggestion.direction}
                    </span>
                  )}
                </div>
                <p className="text-sm font-black text-white">
                  {accessorySuggestion.weight} lbs{accessorySuggestion.isDumbbell ? ' each' : ''}
                  <span className="text-zinc-500 font-normal text-xs ml-1.5">
                    × {planned?.repsMin ?? 8}–{planned?.repsMax ?? 12}
                  </span>
                </p>
                <p className="text-[10px] text-zinc-500 mt-0.5 truncate">{accessorySuggestion.reason}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => { setWeight(String(accessorySuggestion.weight)); setReps(String(planned?.repsMin ?? 8)); setSuggestionDismissed(true); }}
                  className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors active:scale-95"
                >
                  Use
                </button>
                <button onClick={() => setSuggestionDismissed(true)} className="text-zinc-600 hover:text-zinc-400 transition-colors">
                  <X size={12} />
                </button>
              </div>
            </div>
          )}

          {/* Context row: RPE target (main lifts) + last perf + load last */}
          <div className="px-4 pb-2 flex items-center gap-2 flex-wrap">
            {suggestedWeight && (
              <span className="text-xs text-orange-400 font-semibold">
                Target: {suggestedWeight.low}–{suggestedWeight.high} lbs
              </span>
            )}
            {lastPerformance && (
              <span className="text-xs text-zinc-600">
                Last: {lastPerformance.weight}×{lastPerformance.reps}
              </span>
            )}
            {lastPerformance && (
              <button onClick={loadLast}
                className="ml-auto text-[10px] font-bold text-zinc-500 hover:text-orange-400 border border-zinc-700 hover:border-orange-500/50 px-2 py-1 rounded-lg transition-colors">
                Load Last
              </button>
            )}
          </div>

          {/* Logged sets */}
          {sets.length > 0 && (
            <div className="px-4 pb-2">
              <div className="grid grid-cols-[2rem_1fr_1fr_1fr_auto] text-[10px] text-zinc-600 mb-1 px-1 gap-1">
                <span>#</span><span>Weight</span><span>Reps</span><span>RPE</span><span />
              </div>
              {sets.map((set, i) => {
                const workingIdx = sets.filter((s, j) => !s.isWarmup && j < i).length;
                const isPR = prSetIds.has(set.id);
                const isEditing = editingSetId === set.id;

                if (isEditing) {
                  return (
                    <SetEditRow
                      key={set.id}
                      set={set}
                      onSave={updated => { onUpdateSet(updated); setEditingSetId(null); }}
                      onDelete={() => { onRemoveSet(set.id); setEditingSetId(null); }}
                      onCancel={() => setEditingSetId(null)}
                    />
                  );
                }

                return (
                  <div
                    key={set.id}
                    className={`rounded-lg mb-0.5 cursor-pointer active:opacity-70 transition-opacity ${set.isWarmup ? 'opacity-40' : isPR ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-zinc-800/50'}`}
                    onClick={() => setEditingSetId(set.id)}
                  >
                    <div className="grid grid-cols-[2rem_1fr_1fr_1fr_auto] items-center py-1.5 px-1 gap-1">
                      <span className="text-xs text-zinc-500">{set.isWarmup ? 'W' : workingIdx + 1}</span>
                      <span className="text-sm font-semibold">{set.weight}</span>
                      <span className="text-sm">{set.reps}</span>
                      <span className={`text-sm ${rpeColor(set.rpe)}`}>{set.rpe ?? '—'}</span>
                      <div className="flex items-center gap-1">
                        {isPR && <Trophy size={11} className="text-yellow-400" />}
                        <Pencil size={10} className="text-zinc-700" />
                      </div>
                    </div>
                    {set.note && (
                      <p className="px-2 pb-1.5 text-[10px] text-zinc-500 italic">— {set.note}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Input area — single set or quick multi-set */}
          <div className="px-4 pb-4 space-y-3">

            {/* Set counter + mode toggle row */}
            <div className="flex items-center justify-between">
              {isWarmup ? (
                <span className="text-xs font-bold text-yellow-400">Warm-up set</span>
              ) : workingSets.length < targetSets ? (
                <span className="text-xs font-bold text-zinc-400">
                  Set <span className="text-white">{workingSets.length + 1}</span> of {targetSets}
                </span>
              ) : (
                <span className="text-xs text-zinc-600">Bonus set</span>
              )}
              {!isWarmup && workingSets.length < targetSets && (
                <button onClick={() => setQuickLog(q => !q)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-colors ${quickLog ? 'border-orange-500/50 text-orange-400 bg-orange-500/10' : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'}`}>
                  {quickLog ? '← One at a time' : `All ${targetSets - workingSets.length} at once`}
                </button>
              )}
            </div>

            {quickLog && !isWarmup ? (
              <QuickLogPanel
                targetSets={targetSets - workingSets.length}
                initWeight={weight}
                initReps={planned?.repsMin ?? 5}
                onLogAll={(w, repsArr) => handleQuickLogAll(w, repsArr, false)}
                onCancel={() => setQuickLog(false)}
              />
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {/* Weight */}
                  <div>
                    <p className="text-[10px] text-zinc-600 mb-1 text-center">Weight (lbs)</p>
                    <div className="flex items-stretch">
                      <button onClick={() => stepWeight(-2.5)}
                        className="w-8 bg-zinc-700 hover:bg-zinc-600 rounded-l-lg flex items-center justify-center text-zinc-300 transition-colors active:scale-95 flex-shrink-0">
                        <Minus size={12} />
                      </button>
                      <input type="number" value={weight} onChange={e => setWeight(e.target.value)}
                        className="flex-1 min-w-0 bg-zinc-800 border-y border-zinc-700 text-center text-sm font-bold focus:outline-none focus:border-orange-500 no-spin py-2.5" />
                      <button onClick={() => stepWeight(2.5)}
                        className="w-8 bg-zinc-700 hover:bg-zinc-600 rounded-r-lg flex items-center justify-center text-zinc-300 transition-colors active:scale-95 flex-shrink-0">
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                  {/* Reps */}
                  <div>
                    <p className="text-[10px] text-zinc-600 mb-1 text-center">Reps</p>
                    <div className="flex items-stretch">
                      <button onClick={() => stepReps(-1)}
                        className="w-8 bg-zinc-700 hover:bg-zinc-600 rounded-l-lg flex items-center justify-center text-zinc-300 transition-colors active:scale-95 flex-shrink-0">
                        <Minus size={12} />
                      </button>
                      <input type="number" value={reps} onChange={e => setReps(e.target.value)}
                        className="flex-1 min-w-0 bg-zinc-800 border-y border-zinc-700 text-center text-sm font-bold focus:outline-none focus:border-orange-500 no-spin py-2.5" />
                      <button onClick={() => stepReps(1)}
                        className="w-8 bg-zinc-700 hover:bg-zinc-600 rounded-r-lg flex items-center justify-center text-zinc-300 transition-colors active:scale-95 flex-shrink-0">
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                  {/* RPE */}
                  <div>
                    <p className="text-[10px] text-zinc-600 mb-1 text-center">RPE</p>
                    <input type="number" placeholder="6–10" value={rpe} onChange={e => setRpe(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-2.5 text-center text-sm font-bold focus:outline-none focus:border-orange-500 no-spin" />
                  </div>
                </div>

                {/* e1RM + plate toggle */}
                {e1rm && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">
                      e1RM: <span className={`font-bold ${allTimeBest && e1rm > allTimeBest ? 'text-yellow-400' : 'text-orange-400'}`}>{e1rm} lbs</span>
                      {allTimeBest && e1rm > allTimeBest && <span className="text-yellow-400 ml-1">↑ PR</span>}
                    </span>
                    {plates.length > 0 && (
                      <button onClick={() => setShowPlates(p => !p)}
                        className="text-zinc-600 hover:text-zinc-300 underline decoration-dotted transition-colors">
                        {showPlates ? 'Hide' : 'Plates'}
                      </button>
                    )}
                  </div>
                )}

                {showPlates && plates.length > 0 && (
                  <div className="bg-zinc-800/60 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Bar + Plates (per side)</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="bg-zinc-600 rounded px-2 py-1 text-xs font-bold">45 bar</div>
                      {plates.map((p, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <div className={`rounded px-2 py-1 text-xs font-bold ${
                            p.weight === 45 ? 'bg-blue-600' : p.weight === 35 ? 'bg-yellow-600' :
                            p.weight === 25 ? 'bg-green-600' : p.weight === 10 ? 'bg-zinc-500' :
                            p.weight === 5 ? 'bg-zinc-600' : 'bg-zinc-700'
                          }`}>
                            {p.weight}
                          </div>
                          {p.count > 1 && <span className="text-xs text-zinc-500">×{p.count}</span>}
                        </div>
                      ))}
                      <span className="text-xs text-zinc-600">per side</span>
                    </div>
                  </div>
                )}

                {/* Note field */}
                {noteOpen && (
                  <input
                    type="text"
                    placeholder="Note: supinated, paused, close grip…"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLog()}
                    maxLength={60}
                    autoFocus
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500 placeholder:text-zinc-600"
                  />
                )}

                <div className="flex gap-2">
                  <button onClick={() => setIsWarmup(w => !w)}
                    className={`flex-shrink-0 text-xs font-bold py-2.5 px-3 rounded-lg border transition-colors ${isWarmup ? 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10' : 'border-zinc-700 text-zinc-500'}`}>
                    Warm-up
                  </button>
                  <button
                    onClick={() => { setNoteOpen(o => !o); if (noteOpen) setNote(''); }}
                    className={`flex-shrink-0 flex items-center justify-center py-2.5 px-3 rounded-lg border transition-colors ${noteOpen || note ? 'border-blue-500/50 text-blue-400 bg-blue-500/10' : 'border-zinc-700 text-zinc-600 hover:text-zinc-400'}`}
                    title="Add a note to this set"
                  >
                    <MessageSquare size={14} />
                  </button>
                  <button onClick={handleLog} disabled={!weight || !reps}
                    className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold py-2.5 rounded-lg transition-colors active:scale-[0.98]">
                    <Check size={15} />
                    Log Set
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// Inline set editor
// ─────────────────────────────────────────────────────────────────────────────
function SetEditRow({ set, onSave, onDelete, onCancel }: {
  set: SetLog;
  onSave: (updated: SetLog) => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  const [weight, setWeight] = useState(String(set.weight));
  const [reps, setReps]     = useState(String(set.reps));
  const [rpe, setRpe]       = useState(set.rpe ? String(set.rpe) : '');
  const [note, setNote]     = useState(set.note ?? '');

  function save() {
    const w = parseFloat(weight);
    const r = parseInt(reps);
    if (!w || !r) return;
    onSave({ ...set, weight: w, reps: r, rpe: rpe ? parseFloat(rpe) : undefined, note: note.trim() || undefined });
  }

  return (
    <div className="bg-zinc-800 border border-orange-500/30 rounded-xl p-2.5 mb-1 space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <div>
          <p className="text-[9px] text-zinc-500 mb-1 text-center">Weight</p>
          <input type="number" value={weight} onChange={e => setWeight(e.target.value)}
            className="w-full bg-zinc-700 border border-zinc-600 rounded-lg py-1.5 text-center text-sm font-bold focus:outline-none focus:border-orange-500 no-spin" />
        </div>
        <div>
          <p className="text-[9px] text-zinc-500 mb-1 text-center">Reps</p>
          <input type="number" value={reps} onChange={e => setReps(e.target.value)}
            className="w-full bg-zinc-700 border border-zinc-600 rounded-lg py-1.5 text-center text-sm font-bold focus:outline-none focus:border-orange-500 no-spin" />
        </div>
        <div>
          <p className="text-[9px] text-zinc-500 mb-1 text-center">RPE</p>
          <input type="number" placeholder="—" value={rpe} onChange={e => setRpe(e.target.value)}
            className="w-full bg-zinc-700 border border-zinc-600 rounded-lg py-1.5 text-center text-sm font-bold focus:outline-none focus:border-orange-500 no-spin" />
        </div>
      </div>
      <input
        type="text"
        placeholder="Note (optional)"
        value={note}
        onChange={e => setNote(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && save()}
        maxLength={60}
        className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-orange-500 placeholder:text-zinc-600"
      />
      <div className="flex gap-1.5">
        <button onClick={onDelete} className="text-red-400/70 hover:text-red-400 text-xs px-2 py-1.5 rounded-lg border border-red-500/20 hover:border-red-500/40 transition-colors">
          Delete
        </button>
        <button onClick={onCancel} className="flex-1 text-xs font-bold py-1.5 rounded-lg border border-zinc-600 text-zinc-400 hover:bg-zinc-700 transition-colors">
          Cancel
        </button>
        <button onClick={save} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold py-1.5 rounded-lg transition-colors">
          Save
        </button>
      </div>
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
// Quick Log Panel — log N sets at once with per-set reps
// ─────────────────────────────────────────────────────────────────────────────
function QuickLogPanel({ targetSets, initWeight, initReps, onLogAll, onCancel }: {
  targetSets: number;
  initWeight: string;
  initReps: number;
  onLogAll: (weight: number, repsArr: number[]) => void;
  onCancel: () => void;
}) {
  const [weight, setWeight] = useState(initWeight);
  const [repsArr, setRepsArr] = useState<string[]>(Array(targetSets).fill(String(initReps)));

  function setRepAt(i: number, val: string) {
    setRepsArr(prev => { const next = [...prev]; next[i] = val; return next; });
  }
  function stepRepAt(i: number, delta: number) {
    setRepsArr(prev => {
      const next = [...prev];
      next[i] = String(Math.max(1, (parseInt(next[i]) || 0) + delta));
      return next;
    });
  }

  function handleLogAll() {
    const w = parseFloat(weight);
    if (!w) return;
    onLogAll(w, repsArr.map(r => parseInt(r) || 0));
  }

  return (
    <div className="bg-zinc-800/50 rounded-xl p-3 space-y-3">
      {/* Shared weight */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-400 font-bold w-16 flex-shrink-0">Weight</span>
        <div className="flex items-stretch flex-1">
          <button onClick={() => setWeight(v => String(Math.max(0, Math.round(((parseFloat(v)||0) - 2.5)*10)/10)))}
            className="w-8 bg-zinc-700 hover:bg-zinc-600 rounded-l-lg flex items-center justify-center text-zinc-300 transition-colors">
            <Minus size={11} />
          </button>
          <input type="number" value={weight} onChange={e => setWeight(e.target.value)}
            className="flex-1 bg-zinc-800 border-y border-zinc-700 text-center text-sm font-bold focus:outline-none no-spin py-2" />
          <button onClick={() => setWeight(v => String(Math.round(((parseFloat(v)||0) + 2.5)*10)/10))}
            className="w-8 bg-zinc-700 hover:bg-zinc-600 rounded-r-lg flex items-center justify-center text-zinc-300 transition-colors">
            <Plus size={11} />
          </button>
        </div>
        <span className="text-xs text-zinc-600">lbs</span>
      </div>

      {/* Per-set reps */}
      <div className="space-y-2">
        {repsArr.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 w-10 flex-shrink-0 font-semibold">Set {i + 1}</span>
            <div className="flex items-stretch flex-1">
              <button onClick={() => stepRepAt(i, -1)}
                className="w-8 bg-zinc-700 hover:bg-zinc-600 rounded-l-lg flex items-center justify-center text-zinc-300 transition-colors">
                <Minus size={11} />
              </button>
              <input type="number" value={r} onChange={e => setRepAt(i, e.target.value)}
                className="flex-1 bg-zinc-800 border-y border-zinc-700 text-center text-sm font-bold focus:outline-none no-spin py-1.5" />
              <button onClick={() => stepRepAt(i, 1)}
                className="w-8 bg-zinc-700 hover:bg-zinc-600 rounded-r-lg flex items-center justify-center text-zinc-300 transition-colors">
                <Plus size={11} />
              </button>
            </div>
            <span className="text-xs text-zinc-600 w-7">reps</span>
          </div>
        ))}
      </div>

      <button onClick={handleLogAll} disabled={!parseFloat(weight)}
        className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold py-2.5 rounded-lg transition-colors active:scale-[0.98]">
        <Check size={14} />
        Log All {targetSets} Sets
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Finish Modal
// ─────────────────────────────────────────────────────────────────────────────
function FinishModal({ workout, elapsed, initialNotes, onConfirm, onCancel, onAbandon }: {
  workout: ActiveWorkout;
  elapsed: number;
  initialNotes?: string;
  onConfirm: (rating: 1|2|3|4|5, notes: string, bw: string) => void;
  onCancel: () => void;
  onAbandon: () => void;
}) {
  const [rating, setRating] = useState<1|2|3|4|5>(4);
  const [notes, setNotes] = useState(initialNotes ?? '');
  const [bw, setBw] = useState('');

  const workingSets = workout.sets.filter(s => !s.isWarmup);
  const exercises = Array.from(new Set(workout.sets.map(s => s.exerciseId)));
  const skipped = workout.skippedExercises ?? [];

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end">
      <div className="w-full max-w-lg mx-auto bg-zinc-900 border-t border-zinc-700 rounded-t-3xl flex flex-col" style={{ maxHeight: '90dvh' }}>
        {/* Drag handle + title */}
        <div className="flex-shrink-0 px-6 pt-4 pb-3 border-b border-zinc-800">
          <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-4" />
          <h2 className="text-xl font-black text-center">Finish Workout</h2>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
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
          {skipped.length > 0 && (
            <div className="bg-zinc-800/60 border border-zinc-700 rounded-xl px-4 py-3">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Skipped ({skipped.length})</p>
              <div className="flex flex-wrap gap-1.5">
                {skipped.map(id => (
                  <span key={id} className="text-xs bg-zinc-700 text-zinc-400 px-2 py-1 rounded-lg line-through">{getExerciseName(id)}</span>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Session Rating</p>
            <div className="flex gap-1 justify-center">
              {([1,2,3,4,5] as const).map(r => (
                <button key={r} onClick={() => setRating(r)}
                  className={`text-4xl transition-all active:scale-90 ${r <= rating ? 'text-orange-500' : 'text-zinc-700'}`}>★</button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Bodyweight (lbs)</p>
            <input type="number" placeholder="optional" value={bw} onChange={e => setBw(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 no-spin" />
          </div>

          <div>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Notes</p>
            <textarea placeholder="PRs, how it felt, what to change..." value={notes}
              onChange={e => setNotes(e.target.value)} rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 resize-none" />
          </div>
        </div>

        {/* Sticky action buttons */}
        <div className="flex-shrink-0 px-6 pt-3 pb-6 border-t border-zinc-800 space-y-2">
          <div className="flex gap-2">
            <button onClick={onCancel} className="flex-1 border border-zinc-700 text-zinc-400 font-bold py-3.5 rounded-xl hover:bg-zinc-800 transition-colors text-sm">
              Keep Going
            </button>
            <button onClick={() => onConfirm(rating, notes, bw)}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl transition-colors text-sm">
              Save Workout
            </button>
          </div>
          <button onClick={onAbandon} className="w-full text-red-400/70 hover:text-red-400 text-sm font-semibold py-2 transition-colors">
            Discard without saving
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

// ─────────────────────────────────────────────────────────────────────────────
// Pre-workout modal: check-in prompt + location picker
// ─────────────────────────────────────────────────────────────────────────────
function PreWorkoutModal({ dayName, hasTodayCheckin, onStart, onCancel }: {
  dayName: string;
  hasTodayCheckin: boolean;
  onStart: (location: string | undefined, checkin: ReadinessCheckin | null) => void;
  onCancel: () => void;
}) {
  const [location, setLocation] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [energy, setEnergy] = useState<1|2|3|4|5>(3);
  const [sleepHours, setSleepHours] = useState('7');
  const [skipCheckin, setSkipCheckin] = useState(hasTodayCheckin);

  const DEFAULT_MUSCLE_READINESS = {
    chest: 3, back: 3, shoulders: 3, arms: 3,
    quads: 3, hamstrings: 3, glutes: 3, core: 3, lowerBack: 3,
  } as const;

  const ENERGY_LABELS = ['', 'Low', 'Tired', 'Normal', 'Good', 'Great'];
  const ENERGY_COLORS = ['', 'text-red-400', 'text-orange-400', 'text-yellow-400', 'text-green-400', 'text-emerald-400'];

  function handleGo() {
    const finalLocation = customLocation.trim() || location || undefined;
    const checkin: ReadinessCheckin | null = skipCheckin ? null : {
      id: uid(),
      date: todayISO(),
      sleepHours: parseFloat(sleepHours) || 7,
      sleepQuality: energy,
      nutrition: 3,
      stress: 3,
      overallEnergy: energy,
      muscleReadiness: { ...DEFAULT_MUSCLE_READINESS } as unknown as import('@/lib/types').MuscleReadinessMap,
      notes: '',
    };
    onStart(finalLocation, checkin);
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end">
      <div className="w-full max-w-lg mx-auto bg-zinc-900 border-t border-zinc-700 rounded-t-3xl overflow-hidden" style={{ maxHeight: '88dvh' }}>
        <div className="overflow-y-auto">
          {/* Handle + title */}
          <div className="px-6 pt-4 pb-3 border-b border-zinc-800">
            <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-4" />
            <div>
              <p className="text-xs text-zinc-500 text-center">Starting</p>
              <h2 className="text-xl font-black text-center">{dayName}</h2>
            </div>
          </div>

          <div className="px-6 py-4 space-y-6">
            {/* Readiness quick check */}
            {!hasTodayCheckin && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Moon size={14} className="text-amber-400" />
                    <span className="text-sm font-bold">Quick Check-in</span>
                  </div>
                  <button
                    onClick={() => setSkipCheckin(s => !s)}
                    className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-colors ${skipCheckin ? 'border-zinc-600 text-zinc-500' : 'border-orange-500/40 text-orange-400 bg-orange-500/10'}`}
                  >
                    {skipCheckin ? 'Enable' : 'Skip'}
                  </button>
                </div>

                {!skipCheckin && (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-zinc-500 mb-2">How's your energy today?</p>
                      <div className="flex gap-2">
                        {([1,2,3,4,5] as const).map(v => (
                          <button key={v} onClick={() => setEnergy(v)}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-black border transition-colors ${energy === v ? 'bg-orange-500 border-orange-500 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}>
                            {v}
                          </button>
                        ))}
                      </div>
                      <div className="flex justify-between text-[9px] text-zinc-600 mt-1 px-0.5">
                        <span>Low</span><span>Average</span><span>Great</span>
                      </div>
                      {energy && (
                        <p className={`text-xs font-bold mt-1 ${ENERGY_COLORS[energy]}`}>{ENERGY_LABELS[energy]}</p>
                      )}
                    </div>

                    <div>
                      <p className="text-xs text-zinc-500 mb-2">Sleep last night (hours)</p>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setSleepHours(v => String(Math.max(3, parseFloat(v) - 0.5)))}
                          className="w-9 h-9 bg-zinc-800 hover:bg-zinc-700 rounded-xl flex items-center justify-center text-zinc-300 transition-colors font-bold">
                          −
                        </button>
                        <div className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl py-2 text-center font-black text-lg">
                          {sleepHours}
                        </div>
                        <button onClick={() => setSleepHours(v => String(Math.min(12, parseFloat(v) + 0.5)))}
                          className="w-9 h-9 bg-zinc-800 hover:bg-zinc-700 rounded-xl flex items-center justify-center text-zinc-300 transition-colors font-bold">
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {hasTodayCheckin && (
              <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
                <Check size={14} className="text-green-400" />
                <p className="text-sm text-green-300">Check-in done for today</p>
              </div>
            )}

            {/* Location */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MapPin size={14} className="text-zinc-400" />
                <span className="text-sm font-bold">Where are you training?</span>
                <span className="text-xs text-zinc-600">(optional)</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {LOCATIONS.map(loc => (
                  <button
                    key={loc.id}
                    onClick={() => { setLocation(loc.label); setCustomLocation(''); }}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition-colors flex flex-col items-center gap-1 ${location === loc.label && !customLocation ? 'bg-orange-500/20 border-orange-500/50 text-orange-300' : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-600'}`}
                  >
                    <span className="text-lg">{loc.emoji}</span>
                    <span>{loc.label.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Or type a custom location…"
                value={customLocation}
                onChange={e => { setCustomLocation(e.target.value); setLocation(''); }}
                maxLength={40}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500 placeholder:text-zinc-600"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 pb-8 pt-2 space-y-2">
            <button onClick={handleGo}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-2xl transition-colors text-lg active:scale-[0.98]">
              Let's Go
            </button>
            <button onClick={onCancel}
              className="w-full text-zinc-500 hover:text-zinc-300 py-2.5 text-sm transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
