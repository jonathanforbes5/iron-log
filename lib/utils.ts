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
