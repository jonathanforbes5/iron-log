'use client';

import Link from 'next/link';
import { useActiveProgram, useLogs, useReadiness, useMesocycle, useProfile, useCardio, useAICoach, useSync, useWeightLog, useSupplements, useRestDays, useDailyNotes } from '@/lib/store';
import {
  formatDate, formatDateShort, getPreviousBest, todayISO, totalVolume,
  workingSetCount, getMesocyclePhase, getPhaseColor, getPhaseLabel, getPeakDate,
  overallReadinessScore, getStreak,
} from '@/lib/utils';
import { getExerciseName } from '@/lib/exercises';
import { SUPPLEMENT_STACK, CORE_SUPPLEMENTS, TOTAL_CORE } from '@/lib/supplements';
import { AIAction } from '@/lib/types';
import { getDailyTip } from '@/lib/ai';
import { Dumbbell, Trophy, ChevronRight, Zap, Moon, Activity, TrendingUp, Settings, Cloud, CloudOff, Loader2, Brain, CheckCircle2, X, AlertCircle, Scale, Check, BedDouble, NotebookPen, Pill } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Dashboard() {
  const { program, currentDay, currentDayIndex } = useActiveProgram();
  const logs = useLogs();
  const { todayLog } = useReadiness();
  const { mesocycle } = useMesocycle();
  const { profile } = useProfile();
  const { cardioLogs } = useCardio();
  const { pendingAIActions, applyAction, dismiss } = useAICoach();
  const { syncing, syncError } = useSync();
  const { weightLogs, todayWeight, logWeight } = useWeightLog();
  const { supplementLogs } = useSupplements();
  const { restDays, toggle: toggleRestDay } = useRestDays();
  const { dailyNotes, setNote: setDailyNote } = useDailyNotes();

  const today = todayISO();
  const streak = getStreak(logs);
  const phase = getMesocyclePhase(mesocycle.currentWeek, mesocycle.totalWeeks);
  const phaseColor = getPhaseColor(phase);
  const phaseLabel = getPhaseLabel(phase);
  const peakDate = getPeakDate(mesocycle.startDate, mesocycle.totalWeeks - 1);
  const daysUntilPeak = Math.max(0, Math.round((peakDate.getTime() - Date.now()) / 86400000));

  const logDates = new Set(logs.map(l => l.date));
  const cardioDateSet = new Set(cardioLogs.map(c => c.date));

  const readinessScore = todayLog ? overallReadinessScore(todayLog) : null;

  const MAIN_LIFTS = ['squat', 'bench', 'deadlift', 'ohp'];
  const prs = MAIN_LIFTS.map(id => ({
    id, name: getExerciseName(id), pr: getPreviousBest(logs, id),
  })).filter(x => x.pr !== null);

  const lastLog = logs[0] ?? null;
  const lastCardio = cardioLogs[0] ?? null;

  // Supplement progress today
  const todaySupLog = supplementLogs.find(l => l.date === today);
  const coreTaken = CORE_SUPPLEMENTS.filter(id => todaySupLog?.taken.includes(id)).length;

  // Daily checklist
  const isRestDay = restDays.includes(today);
  const todayWorkout = logs.find(l => l.date === today);
  const todayCardio = cardioLogs.find(l => l.date === today);
  const activityDone = !!todayWorkout || !!todayCardio || isRestDay;

  const checklistItems = [
    { label: 'Weight logged', done: !!todayWeight, href: undefined, icon: <Scale size={13} /> },
    { label: 'Morning check-in', done: !!todayLog, href: '/readiness', icon: <Moon size={13} /> },
    { label: `Supplements ${coreTaken}/${TOTAL_CORE}`, done: coreTaken >= TOTAL_CORE, href: '/readiness', icon: <Pill size={13} /> },
    { label: activityDone ? (isRestDay ? 'Rest day logged' : 'Workout done') : 'Log activity / rest day', done: activityDone, href: '/workout', icon: <Dumbbell size={13} /> },
  ];
  const checklistDone = checklistItems.filter(i => i.done).length;

  // Daily AI tip
  const [dailyTip, setDailyTip] = useState('');
  const [tipLoading, setTipLoading] = useState(false);
  const tipKey = `dailytip_${today}`;
  useEffect(() => {
    const cached = typeof window !== 'undefined' ? localStorage.getItem(tipKey) : null;
    if (cached) { setDailyTip(cached); return; }
    if (!profile?.claudeApiKey || !profile) return;
    setTipLoading(true);
    getDailyTip(profile, logs.slice(0, 10), todayLog, profile.claudeApiKey)
      .then(tip => { setDailyTip(tip); localStorage.setItem(tipKey, tip); })
      .catch(() => {})
      .finally(() => setTipLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today, profile?.claudeApiKey]);

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

      {/* Daily Checklist */}
      <DailyChecklist
        items={checklistItems}
        doneCount={checklistDone}
        isRestDay={isRestDay}
        todayWeight={todayWeight}
        onToggleRestDay={() => toggleRestDay(today)}
        onLogWeight={(w) => logWeight({ date: today, weight: w })}
        dailyNote={dailyNotes[today] ?? ''}
        onSaveNote={note => setDailyNote(today, note)}
        dailyTip={dailyTip}
        tipLoading={tipLoading}
      />

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

      {/* Weight Widget */}
      <WeightWidget weightLogs={weightLogs} todayWeight={todayWeight} logWeight={logWeight} />

      {/* Today's Workout */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
          <Zap size={14} className="text-orange-500" />
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Today's Workout</span>
          {isRestDay && (
            <span className="ml-auto text-xs bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold px-2 py-0.5 rounded-full">Rest Day</span>
          )}
        </div>
        {program && currentDay && !isRestDay ? (
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
            <div className="flex gap-2">
              <button
                onClick={() => toggleRestDay(today)}
                className="flex items-center gap-1.5 border border-zinc-700 hover:border-blue-500/40 text-zinc-500 hover:text-blue-400 font-bold py-3 px-4 rounded-xl transition-colors text-sm flex-shrink-0"
              >
                <BedDouble size={15} /> Rest Day
              </button>
              <Link href="/workout"
                className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors active:scale-[0.98] text-base">
                <Dumbbell size={18} />
                Start Workout
              </Link>
            </div>
          </div>
        ) : isRestDay ? (
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <BedDouble size={24} className="text-blue-400" />
              <div>
                <p className="font-bold">Rest &amp; Recovery</p>
                <p className="text-xs text-zinc-500">No training today — focus on sleep, nutrition, hydration</p>
              </div>
            </div>
            <button
              onClick={() => toggleRestDay(today)}
              className="w-full border border-dashed border-zinc-700 hover:border-orange-500/50 text-zinc-500 hover:text-orange-400 py-2.5 rounded-xl text-sm transition-colors"
            >
              Actually going to train today
            </button>
            <Link href="/workout"
              className="w-full flex items-center justify-center gap-2 border border-zinc-700 hover:border-blue-500/40 text-zinc-500 hover:text-blue-400 font-semibold py-2.5 rounded-xl transition-colors text-sm"
            >
              <Activity size={14} /> Log Cardio Instead
            </Link>
          </div>
        ) : (
          <div className="p-4">
            <div className="text-center mb-4">
              <p className="text-zinc-500 text-sm mb-4">No active program.</p>
              <Link href="/program"
                className="inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-xl transition-colors">
                Choose Program <ChevronRight size={16} />
              </Link>
            </div>
            <button
              onClick={() => toggleRestDay(today)}
              className="w-full flex items-center justify-center gap-1.5 border border-dashed border-zinc-700 hover:border-blue-500/40 text-zinc-600 hover:text-blue-400 py-2.5 rounded-xl text-sm transition-colors"
            >
              <BedDouble size={14} /> Mark as rest day
            </button>
          </div>
        )}
      </div>

      {/* Weekly Activity + Cardio */}
      <WeekCalendar logDates={logDates} cardioDateSet={cardioDateSet} today={today} restDays={restDays} />

      {/* Mesocycle Full Calendar */}
      <MesocycleCalendar
        logs={logs}
        cardioLogs={cardioLogs}
        mesocycle={mesocycle}
        today={today}
        restDays={restDays}
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
// Daily Checklist + Journal
// ─────────────────────────────────────────────────────────────────────────────
function DailyChecklist({ items, doneCount, isRestDay, todayWeight, onToggleRestDay, onLogWeight, dailyNote, onSaveNote, dailyTip, tipLoading }: {
  items: { label: string; done: boolean; href?: string; icon: React.ReactNode }[];
  doneCount: number;
  isRestDay: boolean;
  todayWeight: number | null;
  onToggleRestDay: () => void;
  onLogWeight: (w: number) => void;
  dailyNote: string;
  onSaveNote: (note: string) => void;
  dailyTip: string;
  tipLoading: boolean;
}) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState(dailyNote);
  const [weightEditing, setWeightEditing] = useState(false);
  const [weightVal, setWeightVal] = useState('');
  const total = items.length;
  const allDone = doneCount >= total;

  function saveNote() {
    onSaveNote(noteDraft.trim());
    setNoteOpen(false);
  }

  function saveWeight() {
    const w = parseFloat(weightVal);
    if (!w || w < 50 || w > 500) return;
    onLogWeight(w);
    setWeightEditing(false);
    setWeightVal('');
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Today's Checklist</span>
            {allDone && <span className="text-[10px] bg-green-500/20 text-green-400 font-bold px-2 py-0.5 rounded-full">Done!</span>}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-full transition-all"
                style={{ width: `${(doneCount / total) * 100}%`, backgroundColor: allDone ? '#22c55e' : '#f97316' }}
              />
            </div>
            <span className="text-[10px] text-zinc-600 font-bold">{doneCount}/{total}</span>
          </div>
        </div>
        <button
          onClick={() => { setNoteOpen(o => !o); setNoteDraft(dailyNote); }}
          className={`p-2 rounded-xl border transition-colors ${dailyNote ? 'border-orange-500/30 text-orange-400' : 'border-zinc-700 text-zinc-600 hover:text-zinc-300'}`}
          title="Daily journal note"
        >
          <NotebookPen size={14} />
        </button>
      </div>

      {/* Checklist items */}
      <div className="divide-y divide-zinc-800/50">
        {items.map((item, i) => {
          const content = (
            <div className="flex items-center gap-3 px-4 py-3">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${item.done ? 'border-green-500 bg-green-500/20' : 'border-zinc-700'}`}>
                {item.done && <Check size={11} className="text-green-400" />}
              </div>
              <span className={`flex items-center gap-1.5 text-sm flex-1 ${item.done ? 'text-zinc-400' : 'text-zinc-200'}`}>
                <span className={item.done ? 'text-green-500/60' : 'text-zinc-500'}>{item.icon}</span>
                {item.label}
              </span>
              {!item.done && item.href && <ChevronRight size={13} className="text-zinc-700" />}
              {i === 0 && !item.done && (
                <button
                  onClick={e => { e.preventDefault(); e.stopPropagation(); setWeightEditing(true); }}
                  className="text-xs text-orange-400 font-semibold hover:text-orange-300 transition-colors"
                >
                  Log
                </button>
              )}
            </div>
          );
          return item.href && !item.done ? (
            <a key={i} href={item.href}>{content}</a>
          ) : (
            <div key={i}>{content}</div>
          );
        })}
      </div>

      {/* Inline weight entry */}
      {weightEditing && (
        <div className="px-4 pb-3 flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            placeholder="lbs"
            value={weightVal}
            onChange={e => setWeightVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveWeight()}
            autoFocus
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
          />
          <button onClick={saveWeight} className="bg-orange-500 text-white text-sm font-bold px-4 py-2 rounded-xl active:scale-95">Save</button>
          <button onClick={() => { setWeightEditing(false); setWeightVal(''); }} className="text-zinc-500 text-sm px-2 py-2">✕</button>
        </div>
      )}

      {/* Journal note */}
      {noteOpen && (
        <div className="px-4 pb-3 space-y-2 border-t border-zinc-800">
          <p className="text-xs text-zinc-500 font-semibold pt-2">Daily journal note</p>
          <textarea
            value={noteDraft}
            onChange={e => setNoteDraft(e.target.value)}
            placeholder="How's the day going? Energy, meals, life stress, anything worth remembering…"
            rows={3}
            autoFocus
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500 resize-none placeholder:text-zinc-600"
          />
          <div className="flex gap-2">
            <button onClick={saveNote} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold py-2.5 rounded-xl transition-colors">Save</button>
            <button onClick={() => setNoteOpen(false)} className="border border-zinc-700 text-zinc-500 text-sm font-bold py-2.5 px-4 rounded-xl">Cancel</button>
          </div>
        </div>
      )}
      {!noteOpen && dailyNote && (
        <div className="px-4 pb-3 border-t border-zinc-800 pt-2">
          <p className="text-xs text-zinc-500 italic truncate">{dailyNote}</p>
        </div>
      )}

      {/* AI daily tip */}
      {(dailyTip || tipLoading) && (
        <div className="px-4 pb-3 border-t border-zinc-800 pt-3">
          <div className="flex items-start gap-2">
            <Brain size={13} className="text-orange-400 mt-0.5 flex-shrink-0" />
            {tipLoading ? (
              <span className="text-xs text-zinc-500 animate-pulse">Getting today's tip…</span>
            ) : (
              <p className="text-xs text-zinc-300 leading-relaxed">{dailyTip}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Weight Widget
// ─────────────────────────────────────────────────────────────────────────────
function WeightWidget({ weightLogs, todayWeight, logWeight }: {
  weightLogs: { date: string; weight: number }[];
  todayWeight: number | null;
  logWeight: (log: { date: string; weight: number }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState('');

  const today = todayISO();

  const sorted = [...weightLogs].sort((a, b) => a.date.localeCompare(b.date));
  const recent = sorted.filter(l => l.date <= today).slice(-7);
  const prior = sorted.filter(l => l.date < (recent[0]?.date ?? today)).slice(-7);
  let trend: 'gaining' | 'losing' | 'stable' | null = null;
  if (recent.length >= 3 && prior.length >= 3) {
    const avgRecent = recent.reduce((s, l) => s + l.weight, 0) / recent.length;
    const avgPrior = prior.reduce((s, l) => s + l.weight, 0) / prior.length;
    const diff = avgRecent - avgPrior;
    trend = diff > 0.5 ? 'gaining' : diff < -0.5 ? 'losing' : 'stable';
  }

  const trendLabel = trend === 'gaining' ? '↑ gaining' : trend === 'losing' ? '↓ losing' : trend === 'stable' ? '→ maintaining' : null;
  const trendColor = trend === 'gaining' ? 'text-orange-400' : trend === 'losing' ? 'text-blue-400' : 'text-green-400';

  function save() {
    const w = parseFloat(val);
    if (!w || w < 50 || w > 500) return;
    logWeight({ date: today, weight: w });
    setEditing(false);
    setVal('');
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale size={14} className="text-green-400" />
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Bodyweight</span>
        </div>
        {trendLabel && <span className={`text-xs font-bold ${trendColor}`}>{trendLabel}</span>}
      </div>

      {editing ? (
        <div className="flex items-center gap-2 mt-3">
          <input
            type="number"
            inputMode="decimal"
            placeholder="lbs"
            value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && save()}
            autoFocus
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
          />
          <button onClick={save} className="bg-orange-500 text-white text-sm font-bold px-4 py-2 rounded-xl active:scale-95">Save</button>
          <button onClick={() => { setEditing(false); setVal(''); }} className="text-zinc-500 text-sm px-2 py-2">✕</button>
        </div>
      ) : todayWeight ? (
        <div className="flex items-center justify-between mt-2">
          <div>
            <span className="text-2xl font-black">{todayWeight}</span>
            <span className="text-sm text-zinc-500 ml-1">lbs</span>
          </div>
          <button onClick={() => { setVal(String(todayWeight)); setEditing(true); }} className="text-xs text-zinc-500 hover:text-zinc-300">Edit</button>
        </div>
      ) : (
        <button onClick={() => setEditing(true)} className="mt-3 w-full flex items-center justify-center gap-2 border border-dashed border-zinc-700 rounded-xl py-2.5 text-sm text-zinc-500 hover:border-zinc-500 hover:text-zinc-400 transition-colors">
          + Log today's weight
        </button>
      )}

      {recent.length > 1 && (
        <div className="flex items-end gap-1 mt-3 h-8">
          {recent.map((l, i) => {
            const min = Math.min(...recent.map(r => r.weight));
            const max = Math.max(...recent.map(r => r.weight));
            const range = max - min || 1;
            const pct = (l.weight - min) / range;
            return (
              <div key={i} title={`${l.date}: ${l.weight} lbs`}
                className="flex-1 rounded-sm bg-green-500/40 hover:bg-green-500/70 transition-colors cursor-default"
                style={{ height: `${Math.max(20, pct * 100)}%` }} />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Weekly Activity Strip (last 7 days)
// ─────────────────────────────────────────────────────────────────────────────
function WeekCalendar({ logDates, cardioDateSet, today, restDays }: {
  logDates: Set<string>;
  cardioDateSet: Set<string>;
  today: string;
  restDays: string[];
}) {
  const base = new Date();
  const dow = base.getDay();
  base.setDate(base.getDate() - (dow === 0 ? 6 : dow - 1));
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  const restSet = new Set(restDays);
  const workouts = days.filter(d => logDates.has(d)).length;
  const cardios  = days.filter(d => cardioDateSet.has(d)).length;
  const rests    = days.filter(d => restSet.has(d)).length;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">This Week</span>
        <div className="flex gap-3 text-[10px] text-zinc-600">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-orange-500 inline-block" /> {workouts} lifts</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-500 inline-block" /> {cardios} cardio</span>
          {rests > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-zinc-600 inline-block" /> {rests} rest</span>}
        </div>
      </div>
      <div className="flex gap-2">
        {days.map(date => {
          const isToday = date === today;
          const isWorkout = logDates.has(date);
          const isCardio = cardioDateSet.has(date) && !isWorkout;
          const isRest = restSet.has(date) && !isWorkout && !isCardio;
          const dayLabel = new Date(date + 'T12:00').toLocaleDateString('en-US', { weekday: 'narrow' });
          return (
            <div key={date} className="flex-1 flex flex-col items-center gap-1">
              <div className={`w-full rounded-lg transition-all ${isToday ? 'ring-2 ring-orange-500 ring-offset-1 ring-offset-zinc-900' : ''} ${isWorkout ? 'bg-orange-500' : isCardio ? 'bg-blue-500' : isRest ? 'bg-zinc-600' : 'bg-zinc-800'}`}
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
function MesocycleCalendar({ logs, cardioLogs, mesocycle, today, restDays }: {
  logs: ReturnType<typeof useLogs>;
  cardioLogs: ReturnType<typeof useCardio>['cardioLogs'];
  mesocycle: ReturnType<typeof useMesocycle>['mesocycle'];
  today: string;
  restDays: string[];
}) {
  const logDates = new Set(logs.map(l => l.date));
  const cardioDateSet = new Set(cardioLogs.map(c => c.date));
  const restSet = new Set(restDays);
  const start = new Date(mesocycle.startDate + 'T12:00');

  const weeks = Array.from({ length: mesocycle.totalWeeks }, (_, wi) => {
    return Array.from({ length: 7 }, (_, di) => {
      const d = new Date(start);
      d.setDate(d.getDate() + wi * 7 + di);
      return d.toISOString().slice(0, 10);
    });
  });

  const dayHeaders = (weeks[0] ?? []).map(d =>
    new Date(d + 'T12:00').toLocaleDateString('en-US', { weekday: 'narrow' })
  );

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-orange-400" />
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Mesocycle — {mesocycle.totalWeeks} Weeks</span>
        </div>
        <Link href="/review" className="text-xs text-orange-400">Review →</Link>
      </div>

      <div className="flex items-center gap-2 mb-1">
        <span className="w-5" />
        <div className="flex gap-1 flex-1">
          {dayHeaders.map((lbl, i) => (
            <span key={i} className="flex-1 text-center text-[9px] text-zinc-600">{lbl}</span>
          ))}
        </div>
        <span className="w-8" />
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
                  const isRest = restSet.has(date) && !isWorkout && !isCardio;
                  const isFuture = date > today;
                  return (
                    <div key={date}
                      title={date}
                      className={`flex-1 aspect-square rounded-sm transition-colors ${
                        isToday ? 'ring-1 ring-white/40' : ''
                      } ${isWorkout ? '' : isCardio ? 'bg-blue-500/70' : isRest ? 'bg-zinc-600/70' : isFuture ? 'bg-zinc-800/50' : 'bg-zinc-800'}`}
                      style={isWorkout ? { backgroundColor: phaseColor } : {}} />
                  );
                })}
              </div>
              {isCurrent && <span className="text-[9px] font-bold text-orange-400 uppercase">{getPhaseLabel(phase).slice(0,4)}</span>}
            </div>
          );
        })}
      </div>

      <div className="flex gap-3 mt-3 flex-wrap">
        {[['Accumulation','#3b82f6'],['Intensification','#f97316'],['Peak','#ef4444'],['Deload','#22c55e'],['Cardio','#3b82f6'],['Rest','#52525b']].map(([label, color]) => (
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
