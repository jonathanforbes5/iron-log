import { SetLog, WorkoutLog } from './types';

// Epley formula: e1RM = weight × (1 + reps/30)
export function calcE1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

// Best e1RM across all sets for an exercise in a workout
export function bestE1RMForExercise(sets: SetLog[], exerciseId: string): number {
  return sets
    .filter(s => s.exerciseId === exerciseId && !s.isWarmup && s.weight > 0 && s.reps > 0)
    .reduce((best, s) => Math.max(best, calcE1RM(s.weight, s.reps)), 0);
}

// Find previous best performance for an exercise across workout logs
export function getPreviousBest(
  logs: WorkoutLog[],
  exerciseId: string,
  beforeWorkoutId?: string
): { weight: number; reps: number; e1rm: number; date: string } | null {
  const relevantLogs = beforeWorkoutId
    ? logs.filter(l => l.id !== beforeWorkoutId)
    : logs;

  let best: { weight: number; reps: number; e1rm: number; date: string } | null = null;

  for (const log of relevantLogs) {
    const sets = log.sets.filter(s => s.exerciseId === exerciseId && !s.isWarmup && s.weight > 0 && s.reps > 0);
    for (const set of sets) {
      const e1rm = calcE1RM(set.weight, set.reps);
      if (!best || e1rm > best.e1rm) {
        best = { weight: set.weight, reps: set.reps, e1rm, date: log.date };
      }
    }
  }
  return best;
}

// Get the last time an exercise was performed
export function getLastPerformance(
  logs: WorkoutLog[],
  exerciseId: string
): { weight: number; reps: number; date: string } | null {
  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date));
  for (const log of sorted) {
    const sets = log.sets.filter(s => s.exerciseId === exerciseId && !s.isWarmup && s.weight > 0);
    if (sets.length > 0) {
      const heaviest = sets.reduce((h, s) => (s.weight > h.weight ? s : h), sets[0]);
      return { weight: heaviest.weight, reps: heaviest.reps, date: log.date };
    }
  }
  return null;
}

// Group workout logs by exercise to build progress data points
export function getProgressData(
  logs: WorkoutLog[],
  exerciseId: string
): { date: string; e1rm: number; weight: number; reps: number }[] {
  const byDate: Record<string, number> = {};

  for (const log of logs) {
    const sets = log.sets.filter(
      s => s.exerciseId === exerciseId && !s.isWarmup && s.weight > 0 && s.reps > 0
    );
    if (sets.length === 0) continue;
    const maxE1rm = sets.reduce((m, s) => Math.max(m, calcE1RM(s.weight, s.reps)), 0);
    const existing = byDate[log.date] ?? 0;
    byDate[log.date] = Math.max(existing, maxE1rm);
  }

  return Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, e1rm]) => {
      const logForDate = logs.find(l => l.date === date);
      const sets = (logForDate?.sets ?? []).filter(
        s => s.exerciseId === exerciseId && !s.isWarmup
      );
      const topSet = sets.reduce(
        (best, s) => (calcE1RM(s.weight, s.reps) > calcE1RM(best.weight, best.reps) ? s : best),
        sets[0]
      );
      return { date, e1rm, weight: topSet?.weight ?? 0, reps: topSet?.reps ?? 0 };
    });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function rpeColor(rpe?: number): string {
  if (!rpe) return 'text-zinc-500';
  if (rpe >= 9.5) return 'text-red-400';
  if (rpe >= 8.5) return 'text-orange-400';
  if (rpe >= 7.5) return 'text-yellow-400';
  return 'text-green-400';
}

export function ratingLabel(r: number): string {
  return ['', 'Terrible', 'Bad', 'Okay', 'Good', 'Great'][r] ?? '';
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

// Total volume (sets × weight × reps) for a workout
export function totalVolume(sets: SetLog[]): number {
  return sets.filter(s => !s.isWarmup && s.weight > 0).reduce((t, s) => t + s.weight * s.reps, 0);
}

// Number of working sets in a workout
export function workingSetCount(sets: SetLog[]): number {
  return sets.filter(s => !s.isWarmup).length;
}
