'use client';

import { useActiveProgram, useLogs, useStore } from '@/lib/store';
import { formatDate, formatDateShort, getPreviousBest, todayISO, totalVolume, workingSetCount } from '@/lib/utils';
import { getExerciseName } from '@/lib/exercises';
import Link from 'next/link';
import { Dumbbell, Flame, TrendingUp, Trophy, ChevronRight, Zap } from 'lucide-react';

export default function Dashboard() {
  const { program, currentDay } = useActiveProgram();
  const logs = useLogs();
  const { state } = useStore();

  // Last 7 days activity
  const today = todayISO();
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
  const logDates = new Set(logs.map(l => l.date));

  // Recent PRs (last 30 days)
  const recentCutoff = new Date();
  recentCutoff.setDate(recentCutoff.getDate() - 30);

  // Compute all-time e1RMs across logs to find PRs set recently
  const recentPRs: { exerciseName: string; weight: number; reps: number; date: string }[] = [];
  const exercisesSeen = new Set<string>();
  const sortedLogs = [...logs].sort((a, b) => b.date.localeCompare(a.date));

  for (const log of sortedLogs.slice(0, 20)) {
    const uniqueExercises = Array.from(new Set(log.sets.map(s => s.exerciseId)));
    for (const exId of uniqueExercises) {
      if (exercisesSeen.has(exId)) continue;
      const prev = getPreviousBest(logs, exId, log.id);
      const current = getPreviousBest([log], exId);
      if (current && (!prev || current.e1rm > prev.e1rm)) {
        recentPRs.push({
          exerciseName: getExerciseName(exId),
          weight: current.weight,
          reps: current.reps,
          date: log.date,
        });
        exercisesSeen.add(exId);
      }
    }
    if (recentPRs.length >= 4) break;
  }

  // Weekly stats
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekLogs = logs.filter(l => l.date >= weekStart.toISOString().slice(0, 10));
  const weekVolume = weekLogs.reduce((t, l) => t + totalVolume(l.sets), 0);
  const weekSets = weekLogs.reduce((t, l) => t + workingSetCount(l.sets), 0);

  const lastLog = logs[0];

  return (
    <div className="px-4 pt-6 space-y-6">
      {/* Header */}
      <div>
        <p className="text-zinc-500 text-sm">{formatDate(today)}</p>
        <h1 className="text-2xl font-black tracking-tight mt-0.5">
          {getGreeting()}, <span className="text-orange-500">Lifter</span>
        </h1>
      </div>

      {/* Next Workout Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-orange-600 to-orange-500 px-4 py-3 flex items-center gap-2">
          <Zap size={16} className="text-white" />
          <span className="text-sm font-bold text-white uppercase tracking-wider">Next Workout</span>
        </div>
        <div className="p-4">
          {program && currentDay ? (
            <>
              <p className="text-xs text-zinc-500 mb-1">{program.name}</p>
              <h2 className="text-lg font-black mb-3">{currentDay.name}</h2>
              <div className="space-y-1.5 mb-4">
                {currentDay.exercises.slice(0, 5).map((ex, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-zinc-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />
                    <span>{getExerciseName(ex.exerciseId)}</span>
                    <span className="text-zinc-600 ml-auto text-xs">
                      {ex.sets}×{ex.repsMin}{ex.repsMax !== ex.repsMin ? `‑${ex.repsMax}` : ''}
                      {ex.rpeTarget ? ` @${ex.rpeTarget}` : ''}
                    </span>
                  </div>
                ))}
                {currentDay.exercises.length > 5 && (
                  <p className="text-xs text-zinc-600 pl-3.5">+{currentDay.exercises.length - 5} more exercises</p>
                )}
              </div>
              <Link
                href="/workout"
                className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors"
              >
                <Dumbbell size={18} />
                Start Workout
              </Link>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-zinc-500 mb-4">No active program selected.</p>
              <Link
                href="/program"
                className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-xl transition-colors"
              >
                Choose a Program
                <ChevronRight size={16} />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Weekly Activity */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">This Week</h3>
          <span className="text-xs text-zinc-600">{weekLogs.length} session{weekLogs.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-end gap-2 mb-4">
          {last7.map(date => {
            const hit = logDates.has(date);
            const isToday = date === today;
            return (
              <div key={date} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={`w-full rounded-md transition-colors ${
                    hit ? 'bg-orange-500' : 'bg-zinc-800'
                  } ${isToday ? 'ring-1 ring-orange-400 ring-offset-1 ring-offset-zinc-900' : ''}`}
                  style={{ height: hit ? '32px' : '20px' }}
                />
                <span className="text-[9px] text-zinc-600">
                  {new Date(date + 'T12:00').toLocaleDateString('en-US', { weekday: 'narrow' })}
                </span>
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <StatPill label="Volume" value={weekVolume > 0 ? `${(weekVolume / 1000).toFixed(0)}k lbs` : '—'} icon={<Flame size={14} />} />
          <StatPill label="Working Sets" value={weekSets > 0 ? `${weekSets}` : '—'} icon={<TrendingUp size={14} />} />
        </div>
      </div>

      {/* Recent PRs */}
      {recentPRs.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={15} className="text-yellow-500" />
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Recent PRs</h3>
          </div>
          <div className="space-y-2">
            {recentPRs.slice(0, 4).map((pr, i) => (
              <div key={i} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{pr.exerciseName}</p>
                  <p className="text-xs text-zinc-500">{formatDateShort(pr.date)}</p>
                </div>
                <span className="text-sm font-bold text-orange-400">
                  {pr.weight} × {pr.reps}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last Workout */}
      {lastLog && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3">Last Workout</h3>
          <div className="flex items-start justify-between">
            <div>
              <p className="font-bold">{lastLog.dayName}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{formatDate(lastLog.date)}</p>
              <div className="flex gap-3 mt-2 text-xs text-zinc-400">
                <span>{workingSetCount(lastLog.sets)} sets</span>
                <span>{Array.from(new Set(lastLog.sets.map(s => s.exerciseId))).length} exercises</span>
                {lastLog.durationMinutes && <span>{lastLog.durationMinutes}m</span>}
              </div>
            </div>
            {lastLog.rating && (
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }, (_, i) => (
                  <span key={i} className={i < lastLog.rating! ? 'text-orange-500' : 'text-zinc-700'}>★</span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatPill({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-zinc-800 rounded-xl p-3">
      <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-lg font-black">{value}</p>
    </div>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}
