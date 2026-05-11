'use client';

import Link from 'next/link';
import { useActiveProgram, useLogs, useReadiness, useMesocycle, useProfile, useCardio, useAICoach, useSync } from '@/lib/store';
import {
  formatDate, formatDateShort, getPreviousBest, todayISO, totalVolume,
  workingSetCount, getMesocyclePhase, getPhaseColor, getPhaseLabel, getPeakDate,
  overallReadinessScore, getStreak,
} from '@/lib/utils';
import { getExerciseName } from '@/lib/exercises';
import { AIAction } from '@/lib/types';
import { Dumbbell, Trophy, ChevronRight, Zap, Moon, Activity, TrendingUp, Settings, Cloud, CloudOff, RefreshCw, Brain, CheckCircle2, X, AlertCircle, Loader2 } from 'lucide-react';

export default function Dashboard() {
  const { program, currentDay, currentDayIndex } = useActiveProgram();
  const logs = useLogs();
  const { todayLog } = useReadiness();
  const { mesocycle } = useMesocycle();
  const { profile } = useProfile();
  const { cardioLogs } = useCardio();
  const { pendingAIActions, applyAction, dismiss } = useAICoach();
  const { syncing, syncError } = useSync();

  const today = todayISO();
  const streak = getStreak(logs);
  const phase = getMesocyclePhase(mesocycle.currentWeek, mesocycle.totalWeeks);
  const phaseColor = getPhaseColor(phase);
  const phaseLabel = getPhaseLabel(phase);
  const peakDate = getPeakDate(mesocycle.startDate, mesocycle.totalWeeks - 1);
  const daysUntilPeak = Math.max(0, Math.round((peakDate.getTime() - Date.now()) / 86400000));

  // All calendar days (current mesocycle = weeks × 7 days)
  const logDates = new Set(logs.map(l => l.date));
  const cardioDateSet = new Set(cardioLogs.map(c => c.date));

  // Readiness score
  const readinessScore = todayLog ? overallReadinessScore(todayLog) : null;

  // Recent PRs
  const MAIN_LIFTS = ['squat', 'bench', 'deadlift', 'ohp'];
  const prs = MAIN_LIFTS.map(id => ({
    id, name: getExerciseName(id), pr: getPreviousBest(logs, id),
  })).filter(x => x.pr !== null);

  // Last workout
  const lastLog = logs[0] ?? null;
  const lastCardio = cardioLogs[0] ?? null;

  return (
    <div className="px-4 pt-6 pb-4 space-y-5">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-zinc-500 text-sm">{formatDate(today)}</p>
            {streak >= 2 && (
              <span className="text-xs font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full">
                🔥 {streak}d
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black tracking-tight mt-0.5">
            {getGreeting()}{profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Sync indicator */}
          <div title={syncError ? 'Sync unavailable — using local storage' : syncing ? 'Syncing…' : 'All devices in sync'}>
            {syncing ? <Loader2 size={12} className="text-zinc-600 animate-spin" />
              : syncError ? <CloudOff size={12} className="text-zinc-600" />
              : <Cloud size={12} className="text-green-500/60" />}
          </div>
          <Link href="/settings" className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors">
            <Settings size={16} className="text-zinc-500" />
          </Link>
          <Link href="/readiness"
            className={`flex flex-col items-center px-3 py-2 rounded-xl border transition-colors ${todayLog ? 'bg-green-500/10 border-green-500/30' : 'bg-zinc-900 border-zinc-700 hover:border-orange-500/50'}`}>
            <Moon size={16} className={todayLog ? 'text-green-400' : 'text-zinc-500'} />
            <span className="text-[10px] mt-0.5 font-bold text-zinc-500">
              {readinessScore !== null ? `${readinessScore}%` : 'Check-in'}
            </span>
          </Link>
        </div>
      </div>

      {/* Coach's Corner — pending AI actions */}
      {pendingAIActions.length > 0 && (
        <CoachsCorner actions={pendingAIActions} onApply={applyAction} onDismiss={dismiss} />
      )}

      {/* Mesocycle Phase Banner */}
      <div className="rounded-2xl overflow-hidden" style={{ background: `linear-gradient(135deg, ${phaseColor}22, ${phaseColor}11)`, borderColor: `${phaseColor}44`, borderWidth: 1 }}>
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: phaseColor }}>{phaseLabel} Phase</p>
              <p className="font-black">Week {mesocycle.currentWeek} <span className="text-zinc-500 font-normal text-sm">of {mesocycle.totalWeeks}</span></p>
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-500">Peak</p>
              <p className="text-sm font-bold">{phase === 'deload' ? 'Deload week' : daysUntilPeak === 0 ? 'Today!' : `${daysUntilPeak}d away`}</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{
              width: `${(mesocycle.currentWeek / mesocycle.totalWeeks) * 100}%`,
              backgroundColor: phaseColor,
            }} />
          </div>
          <div className="flex justify-between mt-1">
            {Array.from({ length: mesocycle.totalWeeks }, (_, i) => {
              const w = i + 1;
              const wPhase = getMesocyclePhase(w, mesocycle.totalWeeks);
              const wColor = getPhaseColor(wPhase);
              const isCurrent = w === mesocycle.currentWeek;
              return (
                <div key={w} className={`flex flex-col items-center ${isCurrent ? 'opacity-100' : 'opacity-40'}`}>
                  <div className="w-1.5 h-1.5 rounded-full mt-1" style={{ backgroundColor: wColor }} />
                  <span className="text-[8px] text-zinc-600 mt-0.5">W{w}</span>
                </div>
              );
            })}
          </div>
        </div>
        <Link href="/review"
          className="flex items-center justify-between px-4 py-2.5 border-t border-white/5 hover:bg-white/5 transition-colors">
          <span className="text-xs text-zinc-500">Week {mesocycle.currentWeek} Review</span>
          <ChevronRight size={13} className="text-zinc-600" />
        </Link>
      </div>

      {/* Today's Workout */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
          <Zap size={14} className="text-orange-500" />
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Today's Workout</span>
        </div>
        {program && currentDay ? (
          <div className="p-4">
            <p className="text-xs text-zinc-500 mb-1">{program.name}</p>
            <h2 className="font-black text-lg mb-3">{currentDay.name}</h2>
            {readinessScore !== null && readinessScore < 50 && (
              <div className="mb-3 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 text-xs text-red-400">
                Low readiness ({readinessScore}%). Consider reducing intensity today.
              </div>
            )}
            <div className="space-y-1.5 mb-4">
              {currentDay.exercises.slice(0, 5).map((ex, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />
                  <span className="text-zinc-300 flex-1">{getExerciseName(ex.exerciseId)}</span>
                  <span className="text-zinc-600 text-xs">
                    {ex.sets}×{ex.repsMin}{ex.repsMax !== ex.repsMin ? `–${ex.repsMax}` : ''}
                    {ex.rpeTarget ? ` @${ex.rpeTarget}` : ''}
                  </span>
                </div>
              ))}
              {currentDay.exercises.length > 5 && (
                <p className="text-xs text-zinc-600 pl-3.5">+{currentDay.exercises.length - 5} more</p>
              )}
            </div>
            <Link href="/workout"
              className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl transition-colors active:scale-[0.98] text-base">
              <Dumbbell size={18} />
              Start Workout
            </Link>
          </div>
        ) : (
          <div className="p-4 text-center">
            <p className="text-zinc-500 text-sm mb-4">No active program.</p>
            <Link href="/program"
              className="inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-xl transition-colors">
              Choose Program <ChevronRight size={16} />
            </Link>
          </div>
        )}
      </div>

      {/* Weekly Activity + Cardio */}
      <WeekCalendar logDates={logDates} cardioDateSet={cardioDateSet} today={today} />

      {/* Mesocycle Full Calendar */}
      <MesocycleCalendar
        logs={logs}
        cardioLogs={cardioLogs}
        mesocycle={mesocycle}
        today={today}
      />

      {/* Strength PRs */}
      {prs.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy size={14} className="text-yellow-500" />
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">All-Time PRs</span>
            </div>
            <Link href="/progress" className="text-xs text-orange-400 font-semibold">View Charts →</Link>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {prs.map(({ id, name, pr }) => (
              <div key={id} className="bg-zinc-800 rounded-xl p-3">
                <p className="text-xs text-zinc-500 truncate">{name}</p>
                <p className="text-base font-black mt-0.5">{pr!.weight}<span className="text-xs text-zinc-500 font-normal"> × {pr!.reps}</span></p>
                <p className="text-[10px] text-orange-400">e1RM {pr!.e1rm} lbs</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last Sessions */}
      <div className="grid grid-cols-2 gap-3">
        {lastLog && (
          <Link href="/history" className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 hover:border-zinc-700 transition-colors">
            <div className="flex items-center gap-1.5 mb-2">
              <Dumbbell size={12} className="text-orange-400" />
              <span className="text-[10px] font-bold text-zinc-500 uppercase">Last Workout</span>
            </div>
            <p className="text-sm font-bold truncate">{lastLog.dayName}</p>
            <p className="text-xs text-zinc-600 mt-0.5">{formatDateShort(lastLog.date)}</p>
            <p className="text-xs text-zinc-500 mt-1">{workingSetCount(lastLog.sets)} sets</p>
          </Link>
        )}
        {lastCardio && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Activity size={12} className="text-blue-400" />
              <span className="text-[10px] font-bold text-zinc-500 uppercase">Last Cardio</span>
            </div>
            <p className="text-sm font-bold capitalize">{lastCardio.type}</p>
            <p className="text-xs text-zinc-600 mt-0.5">{formatDateShort(lastCardio.date)}</p>
            <p className="text-xs text-zinc-500 mt-1">{lastCardio.duration} min · {lastCardio.intensity}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Weekly Activity Strip (last 7 days)
// ─────────────────────────────────────────────────────────────────────────────
function WeekCalendar({ logDates, cardioDateSet, today }: {
  logDates: Set<string>;
  cardioDateSet: Set<string>;
  today: string;
}) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });

  const workouts = days.filter(d => logDates.has(d)).length;
  const cardios  = days.filter(d => cardioDateSet.has(d)).length;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">This Week</span>
        <div className="flex gap-3 text-[10px] text-zinc-600">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-orange-500 inline-block" /> {workouts} lifts</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-500 inline-block" /> {cardios} cardio</span>
        </div>
      </div>
      <div className="flex gap-2">
        {days.map(date => {
          const isToday = date === today;
          const isWorkout = logDates.has(date);
          const isCardio = cardioDateSet.has(date) && !isWorkout;
          const dayLabel = new Date(date + 'T12:00').toLocaleDateString('en-US', { weekday: 'narrow' });
          return (
            <div key={date} className="flex-1 flex flex-col items-center gap-1">
              <div className={`w-full rounded-lg transition-all ${isToday ? 'ring-2 ring-orange-500 ring-offset-1 ring-offset-zinc-900' : ''} ${isWorkout ? 'bg-orange-500' : isCardio ? 'bg-blue-500' : 'bg-zinc-800'}`}
                style={{ height: isWorkout ? '36px' : isCardio ? '28px' : '20px' }} />
              <span className="text-[9px] text-zinc-600">{dayLabel}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Full Mesocycle Calendar
// ─────────────────────────────────────────────────────────────────────────────
function MesocycleCalendar({ logs, cardioLogs, mesocycle, today }: {
  logs: ReturnType<typeof useLogs>;
  cardioLogs: ReturnType<typeof useCardio>['cardioLogs'];
  mesocycle: ReturnType<typeof useMesocycle>['mesocycle'];
  today: string;
}) {
  const logDates = new Set(logs.map(l => l.date));
  const cardioDateSet = new Set(cardioLogs.map(c => c.date));
  const start = new Date(mesocycle.startDate + 'T12:00');
  const totalDays = mesocycle.totalWeeks * 7;

  const weeks = Array.from({ length: mesocycle.totalWeeks }, (_, wi) => {
    return Array.from({ length: 7 }, (_, di) => {
      const d = new Date(start);
      d.setDate(d.getDate() + wi * 7 + di);
      return d.toISOString().slice(0, 10);
    });
  });

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-orange-400" />
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Mesocycle — {mesocycle.totalWeeks} Weeks</span>
        </div>
        <Link href="/review" className="text-xs text-orange-400">Review →</Link>
      </div>

      <div className="space-y-2">
        {weeks.map((week, wi) => {
          const weekNum = wi + 1;
          const phase = getMesocyclePhase(weekNum, mesocycle.totalWeeks);
          const phaseColor = getPhaseColor(phase);
          const isCurrent = weekNum === mesocycle.currentWeek;
          return (
            <div key={wi} className={`flex items-center gap-2 ${isCurrent ? 'opacity-100' : weekNum < mesocycle.currentWeek ? 'opacity-60' : 'opacity-30'}`}>
              <span className="text-[10px] text-zinc-600 w-5">W{weekNum}</span>
              <div className="flex gap-1 flex-1">
                {week.map(date => {
                  const isToday = date === today;
                  const isWorkout = logDates.has(date);
                  const isCardio = cardioDateSet.has(date) && !isWorkout;
                  const isFuture = date > today;
                  return (
                    <div key={date}
                      title={date}
                      className={`flex-1 aspect-square rounded-sm transition-colors ${
                        isToday ? 'ring-1 ring-white/40' : ''
                      } ${isWorkout ? '' : isCardio ? 'bg-blue-500/70' : isFuture ? 'bg-zinc-800/50' : 'bg-zinc-800'}`}
                      style={isWorkout ? { backgroundColor: phaseColor } : {}} />
                  );
                })}
              </div>
              {isCurrent && <span className="text-[9px] font-bold text-orange-400 uppercase">{getPhaseLabel(phase).slice(0,4)}</span>}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-3 mt-3 flex-wrap">
        {[['Accumulation','#3b82f6'],['Intensification','#f97316'],['Peak','#ef4444'],['Deload','#22c55e'],['Cardio','#3b82f6']].map(([label, color]) => (
          <span key={label} className="flex items-center gap-1 text-[9px] text-zinc-600">
            <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: color, opacity: label === 'Cardio' ? 0.7 : 1 }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Coach's Corner — AI pending actions
// ─────────────────────────────────────────────────────────────────────────────
function CoachsCorner({ actions, onApply, onDismiss }: {
  actions: AIAction[];
  onApply: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const priorityIcon = (p: AIAction['priority']) =>
    p === 'high' ? <AlertCircle size={12} className="text-red-400" />
    : p === 'medium' ? <Brain size={12} className="text-orange-400" />
    : <Brain size={12} className="text-zinc-500" />;

  return (
    <div className="bg-zinc-900 border border-orange-500/25 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
        <Brain size={14} className="text-orange-400" />
        <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">Coach's Corner</span>
        <span className="ml-auto text-xs text-zinc-600">{actions.length} recommendation{actions.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="divide-y divide-zinc-800">
        {actions.map(action => (
          <div key={action.id} className="px-4 py-3 space-y-2">
            <div className="flex items-start gap-2">
              {priorityIcon(action.priority)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold leading-tight">{action.title}</p>
                <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{action.description}</p>
                <p className="text-[11px] text-zinc-600 mt-1 italic">"{action.reason}"</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onApply(action.id)}
                className="flex-1 flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold py-2 rounded-lg transition-colors">
                <CheckCircle2 size={12} /> Apply
              </button>
              <button
                onClick={() => onDismiss(action.id)}
                className="px-3 border border-zinc-700 text-zinc-500 hover:text-zinc-300 text-xs font-bold py-2 rounded-lg transition-colors">
                <X size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}
