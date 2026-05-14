'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useWeeklyReview, useLogs, useProfile, useMesocycle, useAICoach, useReadiness, useCardio, useWeightLog, useActiveProgram, usePrograms } from '@/lib/store';
import { WeeklyReview, Program, ProgramDay } from '@/lib/types';
import { uid, totalVolume, workingSetCount, formatDate, todayISO } from '@/lib/utils';
import { getWeeklyReviewAnalysis, planNextWeek, NextWeekPlan } from '@/lib/ai';
import { getExerciseName } from '@/lib/exercises';
import { ChevronLeft, BarChart3, Loader2, CheckCircle2, TrendingUp, Brain, Calendar, Dumbbell, Activity, RefreshCw } from 'lucide-react';

const QUESTIONS: { key: keyof Pick<WeeklyReview,'overallRating'|'strengthFeel'|'recoveryFeel'|'motivation'|'jointHealth'>; label: string; desc: string }[] = [
  { key: 'overallRating',  label: 'Overall Week',   desc: 'How did this week go overall?' },
  { key: 'strengthFeel',   label: 'Strength',        desc: 'How strong did you feel in the gym?' },
  { key: 'recoveryFeel',   label: 'Recovery',        desc: 'How well did you recover between sessions?' },
  { key: 'motivation',     label: 'Motivation',      desc: 'How motivated and locked in were you?' },
  { key: 'jointHealth',    label: 'Joint Health',    desc: 'How do your joints, tendons, and connective tissue feel?' },
];

export default function ReviewPage() {
  const [tab, setTab] = useState<'weekly' | 'monthly'>('weekly');

  return (
    <div className="px-4 pt-6 pb-8 space-y-4">
      {/* Tab switcher */}
      <div className="flex gap-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-1.5">
        {(['weekly', 'monthly'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold capitalize transition-colors ${tab === t ? 'bg-orange-500 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'weekly' ? <WeeklyReviewContent /> : <MonthlyReviewContent />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Weekly Review
// ─────────────────────────────────────────────────────────────────────────────
function WeeklyReviewContent() {
  const router = useRouter();
  const { weeklyReviews, addReview } = useWeeklyReview();
  const logs = useLogs();
  const { profile } = useProfile();
  const { mesocycle, updateMesocycle } = useMesocycle();
  const { addActions } = useAICoach();
  const { weightLogs } = useWeightLog();
  const { program } = useActiveProgram();
  const { updateProgram } = usePrograms();

  const [step, setStep] = useState<'form' | 'preview' | 'done'>('form');
  const [ratings, setRatings] = useState<Record<string, 1|2|3|4|5>>({
    overallRating: 3, strengthFeel: 3, recoveryFeel: 3, motivation: 3, jointHealth: 3,
  });
  const [hitAllSessions, setHitAllSessions] = useState<'yes'|'partial'|'no'>('yes');
  const [notes, setNotes] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [nextWeekPlan, setNextWeekPlan] = useState<NextWeekPlan | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [savedWeekNum, setSavedWeekNum] = useState(mesocycle.currentWeek);
  const [savedReview, setSavedReview] = useState<WeeklyReview | null>(null);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const weekLogs = logs.filter(l => l.date >= weekStartStr);
  const weekVolume = weekLogs.reduce((t, l) => t + totalVolume(l.sets), 0);
  const weekSets   = weekLogs.reduce((t, l) => t + workingSetCount(l.sets), 0);

  const currentReview = weeklyReviews.find(r => r.weekNumber === mesocycle.currentWeek);

  function setRating(key: string, val: 1|2|3|4|5) {
    setRatings(r => ({ ...r, [key]: val }));
  }

  async function handleSave() {
    const review: WeeklyReview = {
      id: uid(),
      weekNumber: mesocycle.currentWeek,
      date: new Date().toISOString().slice(0, 10),
      overallRating:  ratings.overallRating  as 1|2|3|4|5,
      strengthFeel:   ratings.strengthFeel   as 1|2|3|4|5,
      recoveryFeel:   ratings.recoveryFeel   as 1|2|3|4|5,
      motivation:     ratings.motivation     as 1|2|3|4|5,
      jointHealth:    ratings.jointHealth    as 1|2|3|4|5,
      hitAllSessions,
      notes,
    };

    setSavedWeekNum(mesocycle.currentWeek);
    setSavedReview(review);
    addReview(review);
    setStep('preview');

    if (profile?.claudeApiKey) {
      setAiLoading(true);
      try {
        const [reviewResult, planResult] = await Promise.all([
          getWeeklyReviewAnalysis(review, weekLogs, profile, profile.claudeApiKey, weightLogs),
          program ? planNextWeek(review, weekLogs, profile, program, profile.claudeApiKey) : Promise.resolve(null),
        ]);
        if (reviewResult.analysis) { review.aiAnalysis = reviewResult.analysis; setAiAnalysis(reviewResult.analysis); }
        if (reviewResult.actions?.length) addActions(reviewResult.actions);
        if (planResult) setNextWeekPlan(planResult);
      } catch { /* silent */ }
      setAiLoading(false);
    }
  }

  async function handleTweak(request: string) {
    if (!profile?.claudeApiKey || !program || !savedReview) return;
    setAiLoading(true);
    try {
      const plan = await planNextWeek(savedReview, weekLogs, profile, program, profile.claudeApiKey, request);
      setNextWeekPlan(plan);
    } catch { /* silent */ }
    setAiLoading(false);
  }

  function handleConfirm(adjustedProgram?: Program) {
    if (adjustedProgram) updateProgram(adjustedProgram);
    updateMesocycle({ currentWeek: Math.min(savedWeekNum + 1, mesocycle.totalWeeks) });
    setStep('done');
  }

  // ── Done screen ───────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-black">Week {savedWeekNum} Complete</h1>
        <div className="bg-zinc-900 border border-green-500/30 rounded-2xl p-5 text-center space-y-2">
          <CheckCircle2 size={32} className="text-green-400 mx-auto" />
          <p className="font-bold">Week locked in!</p>
          <p className="text-sm text-zinc-500">Starting Week {savedWeekNum + 1}</p>
        </div>
        <button onClick={() => router.push('/')}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl transition-colors">
          Back to Dashboard
        </button>
      </div>
    );
  }

  // ── Preview screen ────────────────────────────────────────────────────────
  if (step === 'preview') {
    return (
      <NextWeekPreview
        weekNumber={savedWeekNum}
        nextWeekNumber={Math.min(savedWeekNum + 1, mesocycle.totalWeeks)}
        aiAnalysis={aiAnalysis}
        nextWeekPlan={nextWeekPlan}
        program={program}
        loading={aiLoading}
        hasApiKey={!!profile?.claudeApiKey}
        onTweak={handleTweak}
        onConfirm={handleConfirm}
      />
    );
  }

  // ── Already-completed review (read-only) ──────────────────────────────────
  if (currentReview) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-zinc-500 text-sm">
            <ChevronLeft size={16} /> Back
          </button>
          <h1 className="text-xl font-black">Week {mesocycle.currentWeek} Review</h1>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <p className="text-sm text-zinc-500 mb-3">Completed on {formatDate(currentReview.date)}</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {QUESTIONS.map(q => (
              <div key={q.key} className="flex items-center justify-between bg-zinc-800 rounded-lg px-3 py-2">
                <span className="text-zinc-500">{q.label}</span>
                <span className="font-bold">{'★'.repeat(currentReview[q.key])}{'☆'.repeat(5 - currentReview[q.key])}</span>
              </div>
            ))}
          </div>
          {currentReview.aiAnalysis && (
            <div className="mt-4 pt-4 border-t border-zinc-700">
              <p className="text-xs font-bold text-orange-400 mb-2">AI Analysis</p>
              <p className="text-xs text-zinc-400 leading-relaxed">{currentReview.aiAnalysis}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Review form ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-zinc-500 hover:text-white transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-black">Week {mesocycle.currentWeek} Review</h1>
          <p className="text-xs text-zinc-500">Week {mesocycle.currentWeek} of {mesocycle.totalWeeks}</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 size={15} className="text-orange-400" />
          <span className="text-sm font-bold">This Week's Numbers</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Sessions', value: weekLogs.length },
            { label: 'Working Sets', value: weekSets },
            { label: 'Volume', value: weekVolume > 0 ? `${(weekVolume/1000).toFixed(0)}k` : '0' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-zinc-800 rounded-xl p-3 text-center">
              <p className="text-lg font-black">{value}</p>
              <p className="text-[10px] text-zinc-500">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {QUESTIONS.map(({ key, label, desc }) => (
          <div key={key} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <p className="text-sm font-bold mb-0.5">{label}</p>
            <p className="text-xs text-zinc-500 mb-3">{desc}</p>
            <div className="flex gap-2">
              {([1,2,3,4,5] as const).map(v => (
                <button key={v} onClick={() => setRating(key, v)}
                  className={`flex-1 py-2 rounded-xl text-sm font-black border transition-colors ${ratings[key] === v ? 'bg-orange-500 border-orange-500 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-600'}`}>
                  {v}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-[9px] text-zinc-600 mt-1 px-1">
              <span>Bad</span><span>Average</span><span>Great</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
        <p className="text-sm font-bold mb-3">Did you hit all planned sessions?</p>
        <div className="flex gap-2">
          {(['yes','partial','no'] as const).map(opt => (
            <button key={opt} onClick={() => setHitAllSessions(opt)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold capitalize border transition-colors ${hitAllSessions === opt ? 'bg-orange-500 border-orange-500 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}>
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Notes / Comments</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
          placeholder="How did the week go? Any injuries, PRs, things to change..."
          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 resize-none placeholder:text-zinc-600" />
      </div>

      {profile?.claudeApiKey && (
        <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-3">
          <TrendingUp size={14} className="text-orange-400" />
          <p className="text-xs text-orange-400">AI will analyze your week and plan next week's training. You'll preview and approve before it locks in.</p>
        </div>
      )}

      <button onClick={handleSave}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl transition-colors text-lg">
        Complete Week Review
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Next Week Preview
// ─────────────────────────────────────────────────────────────────────────────
function NextWeekPreview({
  weekNumber, nextWeekNumber, aiAnalysis, nextWeekPlan, program, loading, hasApiKey, onTweak, onConfirm,
}: {
  weekNumber: number;
  nextWeekNumber: number;
  aiAnalysis: string;
  nextWeekPlan: NextWeekPlan | null;
  program: Program | null;
  loading: boolean;
  hasApiKey: boolean;
  onTweak: (request: string) => Promise<void>;
  onConfirm: (adjustedProgram?: Program) => void;
}) {
  const [tweakInput, setTweakInput] = useState('');

  const adjustedProgram = useMemo(() => {
    if (!program || !nextWeekPlan?.adjustments.length) return null;
    const prog = JSON.parse(JSON.stringify(program)) as Program;
    for (const adj of nextWeekPlan.adjustments) {
      const day = prog.days[adj.dayIndex];
      if (!day) continue;
      const ex = day.exercises.find(e => e.exerciseId === adj.exerciseId);
      if (!ex) continue;
      if (adj.sets !== undefined) ex.sets = adj.sets;
      if (adj.repsMin !== undefined) ex.repsMin = adj.repsMin;
      if (adj.repsMax !== undefined) ex.repsMax = adj.repsMax;
      if (adj.rpeTarget !== undefined) ex.rpeTarget = adj.rpeTarget;
      if (adj.notes !== undefined) ex.notes = adj.notes;
      if (adj.swapTo) ex.exerciseId = adj.swapTo;
    }
    return prog;
  }, [program, nextWeekPlan]);

  const displayProgram = adjustedProgram ?? program;
  const adjCount = nextWeekPlan?.adjustments.length ?? 0;

  async function handleTweakSubmit() {
    if (!tweakInput.trim() || loading) return;
    const req = tweakInput.trim();
    setTweakInput('');
    await onTweak(req);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-black">Week {nextWeekNumber} Preview</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Week {weekNumber} is done — review your next week before it locks in</p>
      </div>

      {/* AI loading */}
      {loading && (
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <Loader2 size={15} className="animate-spin text-orange-400 flex-shrink-0" />
          <span className="text-sm text-zinc-400">AI is analyzing your week and planning next...</span>
        </div>
      )}

      {/* Week analysis */}
      {aiAnalysis && (
        <div className="bg-zinc-900 border border-orange-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Brain size={13} className="text-orange-400" />
            <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">Week {weekNumber} Analysis</span>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed">{aiAnalysis}</p>
        </div>
      )}

      {/* Next week plan summary */}
      {nextWeekPlan?.weekSummary && !loading && (
        <div className="bg-zinc-900 border border-blue-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={13} className="text-blue-400" />
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
              Week {nextWeekNumber} Plan{adjCount > 0 ? ` · ${adjCount} adjustment${adjCount !== 1 ? 's' : ''}` : ''}
            </span>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed">{nextWeekPlan.weekSummary}</p>
        </div>
      )}

      {/* Program preview */}
      {displayProgram && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Next Week's Program</p>
          {displayProgram.days.map((day, i) => (
            <DayPreviewCard
              key={day.id}
              day={day}
              originalDay={program?.days[i]}
              hasAdjustments={!!(nextWeekPlan?.adjustments.some(a => a.dayIndex === i))}
            />
          ))}
        </div>
      )}

      {/* No program fallback */}
      {!displayProgram && !loading && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center text-zinc-500 text-sm">
          No active program — start one from the Program tab.
        </div>
      )}

      {/* Tweak request (API key only) */}
      {hasApiKey && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
          <div>
            <p className="text-sm font-bold mb-0.5">Request a tweak</p>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Core lifts (Bench, Squat, Deadlift, OHP) always stay in. Small adjustments only — big structural changes are outside scope.
            </p>
          </div>
          <textarea
            value={tweakInput}
            onChange={e => setTweakInput(e.target.value)}
            placeholder="e.g. 'my left shoulder is sore' · 'add more upper back' · 'shorter Day 2 this week'"
            rows={2}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500 resize-none placeholder:text-zinc-600"
          />
          <button
            onClick={handleTweakSubmit}
            disabled={!tweakInput.trim() || loading}
            className="w-full flex items-center justify-center gap-2 border border-orange-500/40 text-orange-400 hover:bg-orange-500/10 disabled:opacity-40 disabled:cursor-not-allowed py-2.5 rounded-xl text-sm font-bold transition-colors active:scale-[0.98]"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Updating plan...' : 'Update Plan'}
          </button>
        </div>
      )}

      {/* Confirm */}
      <button
        onClick={() => onConfirm(adjustedProgram ?? undefined)}
        disabled={loading}
        className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-black py-4 rounded-2xl transition-colors text-lg active:scale-[0.98]"
      >
        {loading ? 'Loading...' : `Lock In Week ${nextWeekNumber} →`}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Day Preview Card
// ─────────────────────────────────────────────────────────────────────────────
function DayPreviewCard({ day, originalDay, hasAdjustments }: {
  day: ProgramDay;
  originalDay?: ProgramDay;
  hasAdjustments: boolean;
}) {
  return (
    <div className={`bg-zinc-900 border rounded-2xl overflow-hidden ${hasAdjustments ? 'border-orange-500/25' : 'border-zinc-800'}`}>
      <div className="px-4 py-2.5 border-b border-zinc-800/80 flex items-center justify-between">
        <h3 className="font-bold text-sm">{day.name}</h3>
        {hasAdjustments && (
          <span className="text-[9px] font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30 px-1.5 py-0.5 rounded-md tracking-wide uppercase">adjusted</span>
        )}
      </div>
      <div className="px-4 py-3 space-y-1.5">
        {day.exercises.map((ex, i) => {
          const orig = originalDay?.exercises[i];
          const changed = orig && (
            orig.exerciseId !== ex.exerciseId ||
            orig.sets !== ex.sets ||
            orig.repsMin !== ex.repsMin ||
            orig.repsMax !== ex.repsMax ||
            (orig.rpeTarget ?? 0) !== (ex.rpeTarget ?? 0) ||
            orig.notes !== ex.notes
          );
          return (
            <div key={ex.exerciseId + i} className="flex items-center gap-2 py-0.5">
              <span className="text-[10px] text-zinc-600 w-4 flex-shrink-0">{i + 1}.</span>
              <span className={`text-sm flex-1 ${changed ? 'font-bold text-orange-300' : 'font-semibold'}`}>
                {getExerciseName(ex.exerciseId)}
              </span>
              <span className={`text-xs flex-shrink-0 ${changed ? 'text-orange-400 font-bold' : 'text-zinc-500'}`}>
                {ex.sets}×{ex.repsMin}–{ex.repsMax}{ex.rpeTarget ? ` @${ex.rpeTarget}` : ''}
              </span>
              {changed && <span className="text-orange-400 text-[9px] font-black flex-shrink-0">↑</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Monthly Review
// ─────────────────────────────────────────────────────────────────────────────
function MonthlyReviewContent() {
  const logs = useLogs();
  const { profile } = useProfile();
  const { readinessLogs } = useReadiness();
  const { cardioLogs } = useCardio();
  const today = todayISO();

  // Build list of available months from logs (most recent first)
  const monthSet = new Set<string>();
  for (const l of logs) monthSet.add(l.date.slice(0, 7));
  // Always include current month
  monthSet.add(today.slice(0, 7));
  const months = [...monthSet].sort().reverse();

  const [selectedMonth, setSelectedMonth] = useState(months[0] ?? today.slice(0, 7));

  // Stats for selected month
  const monthLogs = logs.filter(l => l.date.startsWith(selectedMonth));
  const monthCardio = cardioLogs.filter(l => l.date.startsWith(selectedMonth));
  const monthReadiness = readinessLogs.filter(l => l.date.startsWith(selectedMonth));

  const totalSets = monthLogs.reduce((t, l) => t + workingSetCount(l.sets), 0);
  const totalVol = monthLogs.reduce((t, l) => t + totalVolume(l.sets), 0);
  const avgDuration = monthLogs.length
    ? Math.round(monthLogs.reduce((t, l) => t + (l.durationMinutes ?? 0), 0) / monthLogs.length)
    : 0;

  // Top lifts this month
  const exerciseTops: Record<string, { weight: number; reps: number; date: string }> = {};
  for (const log of monthLogs) {
    for (const set of log.sets) {
      if (set.isWarmup) continue;
      const cur = exerciseTops[set.exerciseName];
      if (!cur || set.weight > cur.weight) {
        exerciseTops[set.exerciseName] = { weight: set.weight, reps: set.reps, date: log.date };
      }
    }
  }
  const topExercises = Object.entries(exerciseTops)
    .sort((a, b) => b[1].weight - a[1].weight)
    .slice(0, 6);

  // Avg readiness scores
  const avgEnergy = monthReadiness.length
    ? (monthReadiness.reduce((s, r) => s + r.overallEnergy, 0) / monthReadiness.length).toFixed(1)
    : null;
  const avgSleep = monthReadiness.length
    ? (monthReadiness.reduce((s, r) => s + r.sleepHours, 0) / monthReadiness.length).toFixed(1)
    : null;

  const monthLabel = new Date(selectedMonth + '-15').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Calendar size={16} className="text-orange-400" />
        <h2 className="text-xl font-black">{monthLabel}</h2>
      </div>

      {/* Month selector */}
      {months.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {months.slice(0, 6).map(m => {
            const lbl = new Date(m + '-15').toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            return (
              <button key={m} onClick={() => setSelectedMonth(m)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${selectedMonth === m ? 'bg-orange-500 border-orange-500 text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-500'}`}>
                {lbl}
              </button>
            );
          })}
        </div>
      )}

      {/* Key stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Workouts', value: monthLogs.length, icon: <Dumbbell size={14} className="text-orange-400" /> },
          { label: 'Cardio Sessions', value: monthCardio.length, icon: <Activity size={14} className="text-blue-400" /> },
          { label: 'Working Sets', value: totalSets, icon: <BarChart3 size={14} className="text-zinc-400" /> },
          { label: 'Avg Session', value: avgDuration ? `${avgDuration}m` : '—', icon: <TrendingUp size={14} className="text-green-400" /> },
        ].map(({ label, value, icon }) => (
          <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">{icon}<span className="text-xs text-zinc-500">{label}</span></div>
            <p className="text-2xl font-black">{value}</p>
          </div>
        ))}
      </div>

      {totalVol > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <p className="text-xs text-zinc-500 mb-1">Total Volume</p>
          <p className="text-2xl font-black">{(totalVol / 1000).toFixed(1)}k <span className="text-sm text-zinc-500 font-normal">lbs</span></p>
        </div>
      )}

      {/* Top lifts */}
      {topExercises.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Top Sets This Month</p>
          <div className="space-y-2">
            {topExercises.map(([name, { weight, reps, date }]) => (
              <div key={name} className="flex items-center justify-between py-1.5 border-b border-zinc-800/60 last:border-0">
                <div>
                  <p className="text-sm font-semibold">{name}</p>
                  <p className="text-[10px] text-zinc-600">{formatDate(date)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black">{weight} <span className="text-zinc-500 font-normal text-xs">lbs</span></p>
                  <p className="text-[10px] text-zinc-500">× {reps}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Readiness avg */}
      {(avgEnergy || avgSleep) && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Avg Readiness ({monthReadiness.length} check-ins)</p>
          <div className="grid grid-cols-2 gap-3">
            {avgEnergy && (
              <div className="bg-zinc-800 rounded-xl p-3 text-center">
                <p className="text-xl font-black">{avgEnergy}<span className="text-sm text-zinc-500">/5</span></p>
                <p className="text-[10px] text-zinc-500">Energy</p>
              </div>
            )}
            {avgSleep && (
              <div className="bg-zinc-800 rounded-xl p-3 text-center">
                <p className="text-xl font-black">{avgSleep}<span className="text-sm text-zinc-500">h</span></p>
                <p className="text-[10px] text-zinc-500">Sleep</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent workouts list */}
      {monthLogs.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider px-4 py-3 border-b border-zinc-800">
            Workouts This Month
          </p>
          <div className="divide-y divide-zinc-800/50">
            {monthLogs.map(log => {
              const working = log.sets.filter(s => !s.isWarmup);
              const skipped = log.skippedExercises ?? [];
              return (
                <div key={log.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{log.dayName}</p>
                      <p className="text-xs text-zinc-600">{formatDate(log.date)} · {log.durationMinutes ?? 0}min</p>
                      {log.notes && <p className="text-xs text-zinc-500 italic mt-0.5 truncate">{log.notes}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-black">{working.length} <span className="text-zinc-500 font-normal text-xs">sets</span></p>
                      {log.rating && <p className="text-[10px] text-orange-400">{'★'.repeat(log.rating)}</p>}
                    </div>
                  </div>
                  {skipped.length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-1.5">
                      {skipped.map(id => (
                        <span key={id} className="text-[9px] bg-zinc-800 text-zinc-600 px-1.5 py-0.5 rounded line-through">{getExerciseName(id)}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {monthLogs.length === 0 && monthCardio.length === 0 && (
        <div className="text-center py-8 text-zinc-600">
          <p className="text-sm">No activity logged in {monthLabel}</p>
        </div>
      )}
    </div>
  );
}
