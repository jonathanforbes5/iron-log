import { SetLog, WorkoutLog, UserProfile, MesocyclePhase } from './types';

// ── E1RM (Epley) ─────────────────────────────────────────────────────────────
export function calcE1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

// ── RPE + Reps → % of 1RM ────────────────────────────────────────────────────
// Rows = RPE (10 down to 6), Cols = reps 1–12
// Source: adapted from Reactive Training Systems RPE chart
const RPE_TABLE: Record<number, number[]> = {
  10:  [100.0, 95.5, 92.2, 89.2, 86.3, 83.7, 81.1, 78.6, 76.2, 73.9, 71.7, 69.6],
  9.5: [97.8,  93.9, 90.7, 87.8, 85.0, 82.4, 79.9, 77.4, 75.1, 72.9, 70.7, 68.7],
  9:   [95.5,  92.2, 89.2, 86.3, 83.7, 81.1, 78.6, 76.2, 73.9, 71.7, 69.6, 67.6],
  8.5: [93.9,  90.7, 87.8, 85.0, 82.4, 79.9, 77.4, 75.1, 72.9, 70.7, 68.7, 66.7],
  8:   [92.2,  89.2, 86.3, 83.7, 81.1, 78.6, 76.2, 73.9, 71.7, 69.6, 67.6, 65.7],
  7.5: [90.7,  87.8, 85.0, 82.4, 79.9, 77.4, 75.1, 72.9, 70.7, 68.7, 66.7, 64.8],
  7:   [89.2,  86.3, 83.7, 81.1, 78.6, 76.2, 73.9, 71.7, 69.6, 67.6, 65.7, 63.8],
  6:   [86.3,  83.7, 81.1, 78.6, 76.2, 73.9, 71.7, 69.6, 67.6, 65.7, 63.8, 62.1],
};

function rpePercent(rpe: number, reps: number): number {
  const row = RPE_TABLE[rpe] ?? RPE_TABLE[Math.round(rpe * 2) / 2];
  if (!row) return 0;
  const idx = Math.min(Math.max(reps - 1, 0), 11);
  return (row[idx] ?? 70) / 100;
}

export function roundToNearest5(weight: number): number {
  return Math.round(weight / 5) * 5;
}

// Returns suggested working weight given user's max lift and the set parameters
export function getSuggestedWeight(
  exerciseId: string,
  repsTarget: number,
  rpeTarget: number,
  profile: UserProfile | null
): number | null {
  if (!profile) return null;
  const max = profile.maxLifts[exerciseId];
  if (!max || max <= 0) return null;
  const pct = rpePercent(rpeTarget, repsTarget);
  if (pct <= 0) return null;
  return roundToNearest5(max * pct);
}

// Suggested weight range for a rep range (uses midpoint)
export function getSuggestedWeightRange(
  exerciseId: string,
  repsMin: number,
  repsMax: number,
  rpeTarget: number,
  profile: UserProfile | null
): { low: number; high: number } | null {
  const low = getSuggestedWeight(exerciseId, repsMax, rpeTarget, profile);
  const high = getSuggestedWeight(exerciseId, repsMin, rpeTarget, profile);
  if (!low || !high) return null;
  return { low, high };
}

// ── Accessory suggestion engine ───────────────────────────────────────────────

export interface AccessorySuggestion {
  weight: number;
  basis: 'history' | 'ratio';
  reason: string;       // shown to the user
  direction: '↑' | '→' | '↓' | null;
  isDumbbell: boolean;  // "per DB" label
}

// Evidence-based strength ratios: accessory → { related main lift, ratio, isDumbbell }
// Ratios represent % of the base lift's 1RM that a typical intermediate lifter uses.
const STRENGTH_RATIOS: Record<string, { base: string; ratio: number; isDumbbell?: boolean }> = {
  // ── Squat family ──────────────────────────────────────────────────────────
  'front-squat':           { base: 'squat', ratio: 0.80 },
  'low-bar-squat':         { base: 'squat', ratio: 1.05 },
  'box-squat':             { base: 'squat', ratio: 0.90 },
  'hack-squat':            { base: 'squat', ratio: 0.70 },
  'smith-squat':           { base: 'squat', ratio: 0.75 },
  'leg-press':             { base: 'squat', ratio: 1.80 },
  'bulgarian-split-squat': { base: 'squat', ratio: 0.38, isDumbbell: true },
  'goblet-squat':          { base: 'squat', ratio: 0.18 },
  'walking-lunges':        { base: 'squat', ratio: 0.30, isDumbbell: true },

  // ── Hinge / deadlift family ───────────────────────────────────────────────
  'rdl':          { base: 'deadlift', ratio: 0.60 },
  'stiff-leg-dl': { base: 'deadlift', ratio: 0.55 },
  'sumo-deadlift':{ base: 'deadlift', ratio: 0.97 },
  'trap-bar-dl':  { base: 'deadlift', ratio: 0.95 },
  'rack-pull':    { base: 'deadlift', ratio: 1.10 },
  'good-morning': { base: 'squat',    ratio: 0.38 },
  'hip-thrust':   { base: 'squat',    ratio: 0.85 },

  // ── Horizontal push ───────────────────────────────────────────────────────
  'incline-bench':    { base: 'bench', ratio: 0.85 },
  'decline-bench':    { base: 'bench', ratio: 1.02 },
  'close-grip-bench': { base: 'bench', ratio: 0.85 },
  'floor-press':      { base: 'bench', ratio: 0.90 },
  'smith-bench':      { base: 'bench', ratio: 0.92 },
  'machine-press':    { base: 'bench', ratio: 0.80 },
  'db-bench':         { base: 'bench', ratio: 0.36, isDumbbell: true },
  'incline-db-bench': { base: 'bench', ratio: 0.32, isDumbbell: true },

  // ── Vertical push ─────────────────────────────────────────────────────────
  'push-press':    { base: 'ohp', ratio: 1.15 },
  'db-ohp':        { base: 'ohp', ratio: 0.40, isDumbbell: true },
  'arnold-press':  { base: 'ohp', ratio: 0.36, isDumbbell: true },
  'landmine-press':{ base: 'ohp', ratio: 0.45 },

  // ── Horizontal pull ───────────────────────────────────────────────────────
  'barbell-row':         { base: 'deadlift', ratio: 0.60 },
  'pendlay-row':         { base: 'deadlift', ratio: 0.55 },
  't-bar-row':           { base: 'deadlift', ratio: 0.50 },
  'cable-row':           { base: 'deadlift', ratio: 0.45 },
  'machine-row':         { base: 'deadlift', ratio: 0.42 },
  'chest-supported-row': { base: 'deadlift', ratio: 0.42 },
  'db-row':              { base: 'deadlift', ratio: 0.28, isDumbbell: true },

  // ── Vertical pull ─────────────────────────────────────────────────────────
  'lat-pulldown':         { base: 'deadlift', ratio: 0.45 },
  'neutral-pulldown':     { base: 'deadlift', ratio: 0.43 },
  'straight-arm-pulldown':{ base: 'deadlift', ratio: 0.22 },

  // ── Triceps ───────────────────────────────────────────────────────────────
  'skull-crusher':        { base: 'bench', ratio: 0.40 },
  'overhead-tricep-ext':  { base: 'bench', ratio: 0.20, isDumbbell: true },
  'tricep-pushdown':      { base: 'bench', ratio: 0.18 },
  'rope-pushdown':        { base: 'bench', ratio: 0.16 },
  'jm-press':             { base: 'bench', ratio: 0.55 },
  'dips':                 { base: 'bench', ratio: 0.48 },

  // ── Biceps ────────────────────────────────────────────────────────────────
  'barbell-curl':   { base: 'bench', ratio: 0.30 },
  'db-curl':        { base: 'bench', ratio: 0.14, isDumbbell: true },
  'hammer-curl':    { base: 'bench', ratio: 0.16, isDumbbell: true },
  'preacher-curl':  { base: 'bench', ratio: 0.28 },
  'cable-curl':     { base: 'bench', ratio: 0.24 },
  'incline-db-curl':{ base: 'bench', ratio: 0.12, isDumbbell: true },

  // ── Shoulders (isolation) ─────────────────────────────────────────────────
  'lateral-raise':       { base: 'ohp', ratio: 0.13, isDumbbell: true },
  'cable-lateral-raise': { base: 'ohp', ratio: 0.11 },
  'rear-delt-fly':       { base: 'bench', ratio: 0.07, isDumbbell: true },
  'face-pulls':          { base: 'bench', ratio: 0.22 },
  'upright-row':         { base: 'ohp',  ratio: 0.55 },
  'shrugs':              { base: 'deadlift', ratio: 0.60 },

  // ── Legs (isolation) ─────────────────────────────────────────────────────
  'leg-extension': { base: 'squat', ratio: 0.30 },
  'leg-curl':      { base: 'squat', ratio: 0.26 },
  'calf-raise':    { base: 'squat', ratio: 0.60 },
  'seated-calf-raise': { base: 'squat', ratio: 0.50 },
};

// How much to increment weight per session for each exercise category
function progressionIncrement(exerciseId: string): number {
  const ex = exerciseId;
  // Heavy barbell compounds: 5 lbs
  if (['rdl','stiff-leg-dl','sumo-deadlift','trap-bar-dl','rack-pull','good-morning',
       'barbell-row','pendlay-row','t-bar-row','incline-bench','decline-bench',
       'close-grip-bench','floor-press','hip-thrust','jm-press'].includes(ex)) return 5;
  // Light isolation / cables / DBs: 2.5 lbs
  return 2.5;
}

// All working sets from the most recent session for an exercise
function getLastSessionSets(logs: WorkoutLog[], exerciseId: string): SetLog[] {
  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date));
  for (const log of sorted) {
    const sets = log.sets.filter(s => s.exerciseId === exerciseId && !s.isWarmup && s.weight > 0 && s.reps > 0);
    if (sets.length > 0) return sets;
  }
  return [];
}

export function getAccessorySuggestion(
  exerciseId: string,
  repsMin: number,
  repsMax: number,
  profile: UserProfile | null,
  logs: WorkoutLog[],
): AccessorySuggestion | null {
  // ── Tier 1: history + progressive overload ────────────────────────────────
  const lastSets = getLastSessionSets(logs, exerciseId);
  if (lastSets.length > 0) {
    // Use the most common weight from last session (mode), falling back to heaviest
    const weightCounts = lastSets.reduce<Record<number, number>>((m, s) => {
      m[s.weight] = (m[s.weight] ?? 0) + 1; return m;
    }, {});
    const topWeight = Object.entries(weightCounts)
      .sort(([, a], [, b]) => b - a)[0];
    const workingWeight = topWeight ? parseFloat(topWeight[0]) : lastSets[0].weight;

    // Average reps at that weight
    const setsAtWeight = lastSets.filter(s => s.weight === workingWeight);
    const avgReps = setsAtWeight.reduce((s, x) => s + x.reps, 0) / setsAtWeight.length;
    const inc = progressionIncrement(exerciseId);

    if (avgReps >= repsMax) {
      const nextWeight = roundToNearest5(workingWeight + inc);
      return {
        weight: nextWeight, basis: 'history', isDumbbell: false,
        direction: '↑',
        reason: `Last: ${workingWeight} lbs × ${Math.round(avgReps)} reps — ready to progress`,
      };
    } else if (avgReps < repsMin) {
      const nextWeight = Math.max(roundToNearest5(workingWeight - inc), inc);
      return {
        weight: nextWeight, basis: 'history', isDumbbell: false,
        direction: '↓',
        reason: `Last: ${workingWeight} lbs × ${Math.round(avgReps)} reps — drop weight slightly`,
      };
    } else {
      return {
        weight: workingWeight, basis: 'history', isDumbbell: false,
        direction: '→',
        reason: `Last: ${workingWeight} lbs × ${Math.round(avgReps)} reps — match it`,
      };
    }
  }

  // ── Tier 2: strength ratio from a known 1RM ───────────────────────────────
  const ratioEntry = STRENGTH_RATIOS[exerciseId];
  if (ratioEntry && profile) {
    const baseMax = profile.maxLifts[ratioEntry.base];
    if (baseMax && baseMax > 0) {
      // Use midpoint of rep range at RPE 8 as target
      const midReps = Math.round((repsMin + repsMax) / 2);
      const rpePct = rpePercent(8, midReps) || 0.75;
      const raw = baseMax * ratioEntry.ratio * rpePct;
      const weight = roundToNearest5(raw);
      const baseLabel: Record<string, string> = { squat: 'squat', bench: 'bench', deadlift: 'deadlift', ohp: 'OHP' };
      return {
        weight,
        basis: 'ratio',
        isDumbbell: ratioEntry.isDumbbell ?? false,
        direction: null,
        reason: `~${Math.round(ratioEntry.ratio * 100)}% of your ${baseLabel[ratioEntry.base] ?? ratioEntry.base}${ratioEntry.isDumbbell ? ' (per DB)' : ''}`,
      };
    }
  }

  return null;
}

// ── Progress helpers ─────────────────────────────────────────────────────────
export function bestE1RMForExercise(sets: SetLog[], exerciseId: string): number {
  return sets
    .filter(s => s.exerciseId === exerciseId && !s.isWarmup && s.weight > 0 && s.reps > 0)
    .reduce((best, s) => Math.max(best, calcE1RM(s.weight, s.reps)), 0);
}

export function getPreviousBest(
  logs: WorkoutLog[],
  exerciseId: string,
  beforeWorkoutId?: string
): { weight: number; reps: number; e1rm: number; date: string } | null {
  const relevant = beforeWorkoutId ? logs.filter(l => l.id !== beforeWorkoutId) : logs;
  let best: { weight: number; reps: number; e1rm: number; date: string } | null = null;
  for (const log of relevant) {
    for (const set of log.sets.filter(s => s.exerciseId === exerciseId && !s.isWarmup && s.weight > 0 && s.reps > 0)) {
      const e1rm = calcE1RM(set.weight, set.reps);
      if (!best || e1rm > best.e1rm) best = { weight: set.weight, reps: set.reps, e1rm, date: log.date };
    }
  }
  return best;
}

export function getLastPerformance(
  logs: WorkoutLog[],
  exerciseId: string
): { weight: number; reps: number; date: string } | null {
  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date));
  for (const log of sorted) {
    const sets = log.sets.filter(s => s.exerciseId === exerciseId && !s.isWarmup && s.weight > 0);
    if (sets.length > 0) {
      const top = sets.reduce((h, s) => (s.weight > h.weight ? s : h), sets[0]);
      return { weight: top.weight, reps: top.reps, date: log.date };
    }
  }
  return null;
}

export function getProgressData(
  logs: WorkoutLog[],
  exerciseId: string
): { date: string; e1rm: number; weight: number; reps: number }[] {
  const byDate: Record<string, number> = {};
  for (const log of logs) {
    const sets = log.sets.filter(s => s.exerciseId === exerciseId && !s.isWarmup && s.weight > 0 && s.reps > 0);
    if (!sets.length) continue;
    const max = sets.reduce((m, s) => Math.max(m, calcE1RM(s.weight, s.reps)), 0);
    byDate[log.date] = Math.max(byDate[log.date] ?? 0, max);
  }
  return Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, e1rm]) => {
      const log = logs.find(l => l.date === date);
      const sets = (log?.sets ?? []).filter(s => s.exerciseId === exerciseId && !s.isWarmup);
      const top = sets.reduce(
        (b, s) => (calcE1RM(s.weight, s.reps) > calcE1RM(b.weight, b.reps) ? s : b),
        sets[0]
      );
      return { date, e1rm, weight: top?.weight ?? 0, reps: top?.reps ?? 0 };
    });
}

// ── Mesocycle ────────────────────────────────────────────────────────────────
export function getMesocyclePhase(week: number, totalWeeks: number): MesocyclePhase {
  const pct = week / totalWeeks;
  if (week === totalWeeks) return 'deload';
  if (pct <= 0.35) return 'accumulation';
  if (pct <= 0.70) return 'intensification';
  return 'peak';
}

export function getPhaseColor(phase: MesocyclePhase): string {
  return { accumulation: '#3b82f6', intensification: '#f97316', peak: '#ef4444', deload: '#22c55e' }[phase];
}

export function getPhaseLabel(phase: MesocyclePhase): string {
  return { accumulation: 'Accumulation', intensification: 'Intensification', peak: 'Peak', deload: 'Deload' }[phase];
}

export function getPeakDate(startDate: string, totalWeeks: number): Date {
  const d = new Date(startDate);
  d.setDate(d.getDate() + (totalWeeks - 1) * 7);
  return d;
}

// ── Formatting ───────────────────────────────────────────────────────────────
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function todayISO(): string {
  // Use Eastern Time so midnight ET is the day boundary on all devices
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h === 0 ? `${m}m` : `${h}h ${m}m`;
}

export function totalVolume(sets: SetLog[]): number {
  return sets.filter(s => !s.isWarmup && s.weight > 0).reduce((t, s) => t + s.weight * s.reps, 0);
}

export function workingSetCount(sets: SetLog[]): number {
  return sets.filter(s => !s.isWarmup).length;
}

export function rpeColor(rpe?: number): string {
  if (!rpe) return 'text-zinc-500';
  if (rpe >= 9.5) return 'text-red-400';
  if (rpe >= 8.5) return 'text-orange-400';
  if (rpe >= 7.5) return 'text-yellow-400';
  return 'text-green-400';
}

// ── Plate calculator ─────────────────────────────────────────────────────────
export interface PlateGroup { weight: number; count: number }

export function calcPlates(targetWeight: number, barWeight = 45): PlateGroup[] {
  const perSide = (targetWeight - barWeight) / 2;
  if (perSide <= 0) return [];
  const available = [45, 35, 25, 10, 5, 2.5];
  const result: PlateGroup[] = [];
  let remaining = perSide;
  for (const p of available) {
    const count = Math.floor(remaining / p);
    if (count > 0) { result.push({ weight: p, count }); remaining = Math.round((remaining - count * p) * 100) / 100; }
  }
  return result;
}

// ── Warmup ramp ──────────────────────────────────────────────────────────────
export function getWarmupRamp(workingWeight: number): { weight: number; reps: number }[] {
  const steps = [
    { pct: 0, reps: 10 },   // bar only
    { pct: 0.50, reps: 5 },
    { pct: 0.65, reps: 3 },
    { pct: 0.80, reps: 2 },
  ];
  const seen = new Set<number>();
  return steps
    .map(({ pct, reps }) => {
      const w = pct === 0 ? 45 : Math.round((workingWeight * pct) / 5) * 5;
      return { weight: w, reps };
    })
    .filter(({ weight }) => {
      if (weight >= workingWeight || seen.has(weight)) return false;
      seen.add(weight);
      return true;
    });
}

// ── Streak (consecutive days with a workout) ──────────────────────────────────
export function getStreak(logs: WorkoutLog[]): number {
  if (!logs.length) return 0;
  const dates = Array.from(new Set(logs.map(l => l.date))).sort((a, b) => b.localeCompare(a));
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dates[0] !== today && dates[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1] + 'T12:00');
    const curr = new Date(dates[i] + 'T12:00');
    const diff = Math.round((prev.getTime() - curr.getTime()) / 86400000);
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

// ── Weekly sets per muscle group ─────────────────────────────────────────────
export function weeklyMuscleVolume(logs: WorkoutLog[]): Record<string, number> {
  const weekStart = new Date();
  const dow = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() - (dow === 0 ? 6 : dow - 1)); // anchor to Monday
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const result: Record<string, number> = {};
  for (const log of logs.filter(l => l.date >= weekStartStr)) {
    for (const set of log.sets.filter(s => !s.isWarmup)) {
      result[set.exerciseId] = (result[set.exerciseId] ?? 0) + 1;
    }
  }
  return result;
}

// ── Muscle readiness label and color
export function readinessLabel(v: number): string {
  return ['', 'Low', 'Tired', 'Normal', 'Great', 'Extra'][v] ?? 'Normal';
}

export function readinessColor(v: number): string {
  return ['', 'text-red-400', 'text-orange-400', 'text-yellow-400', 'text-green-400', 'text-purple-400'][v] ?? 'text-zinc-400';
}

export function readinessBg(v: number): string {
  return ['', 'bg-red-500/20 border-red-500/40', 'bg-orange-500/20 border-orange-500/40', 'bg-zinc-700/50 border-zinc-600', 'bg-green-500/20 border-green-500/40', 'bg-purple-500/20 border-purple-500/40'][v] ?? 'bg-zinc-700/50 border-zinc-600';
}

export function overallReadinessScore(checkin: import('./types').ReadinessCheckin): number {
  const mr = checkin.muscleReadiness;
  const muscles = Object.values(mr) as number[];
  const avgMuscle = muscles.reduce((a, b) => a + b, 0) / muscles.length;
  return Math.round(
    (checkin.sleepQuality * 0.3 + checkin.nutrition * 0.2 + (6 - checkin.stress) * 0.2 + checkin.overallEnergy * 0.15 + avgMuscle * 0.15) * 20
  );
}
