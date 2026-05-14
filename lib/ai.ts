import { UserProfile, ReadinessCheckin, WeeklyReview, WorkoutLog, ProgramDay, Program, AIAction, SetLog, WeightLog } from './types';
import { isAddedWeightExercise } from './exercises';
import { uid } from './utils';

// ── API call helper ──────────────────────────────────────────────────────────

async function callAI(
  apiKey: string,
  prompt: string,
  systemPrompt: string,
  maxTokens = 512,
  model = 'claude-haiku-4-5-20251001',
): Promise<string> {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, prompt, systemPrompt, maxTokens, model }),
  });
  if (!res.ok) throw new Error(await res.text() || 'AI request failed');
  const data = await res.json() as { text: string };
  return data.text;
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function isoWeekMonday(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00');
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return d.toISOString().slice(0, 10);
}

function buildWoWData(logs: WorkoutLog[]): string {
  const byWeek = new Map<string, WorkoutLog[]>();
  for (const log of logs) {
    const wk = isoWeekMonday(log.date);
    if (!byWeek.has(wk)) byWeek.set(wk, []);
    byWeek.get(wk)!.push(log);
  }
  const weeks = [...byWeek.keys()].sort().reverse();
  if (weeks.length < 2) return 'Insufficient history for week-over-week comparison.';

  function weekStats(weekLogs: WorkoutLog[]) {
    const stats: Record<string, { sets: number; volume: number; topWeight: number }> = {};
    for (const log of weekLogs) {
      for (const s of log.sets) {
        if (s.isWarmup) continue;
        if (!stats[s.exerciseName]) stats[s.exerciseName] = { sets: 0, volume: 0, topWeight: 0 };
        stats[s.exerciseName].sets++;
        stats[s.exerciseName].volume += s.weight * s.reps;
        stats[s.exerciseName].topWeight = Math.max(stats[s.exerciseName].topWeight, s.weight);
      }
    }
    return stats;
  }

  const thisStats = weekStats(byWeek.get(weeks[0])!);
  const lastStats = weekStats(byWeek.get(weeks[1])!);
  const allEx = new Set([...Object.keys(thisStats), ...Object.keys(lastStats)]);
  const lines: string[] = [`WoW (week of ${weeks[0]} vs ${weeks[1]}):`];
  for (const ex of allEx) {
    const t = thisStats[ex], l = lastStats[ex];
    if (!t || !l) continue;
    const wd = t.topWeight - l.topWeight;
    const vp = l.volume > 0 ? ((t.volume - l.volume) / l.volume * 100).toFixed(0) : '?';
    lines.push(`  ${ex}: sets ${l.sets}→${t.sets}, top ${l.topWeight}→${t.topWeight} lbs (${wd >= 0 ? '+' : ''}${wd}), vol ${vp}%`);
  }
  return lines.join('\n');
}

function formatNotes(log: WorkoutLog): string {
  const parts: string[] = [];
  if (log.notes) parts.push(`Workout note: "${log.notes}"`);
  if (log.exerciseNotes && Object.keys(log.exerciseNotes).length) {
    parts.push('Exercise notes: ' + Object.entries(log.exerciseNotes).map(([id, n]) => `${id}: "${n}"`).join('; '));
  }
  const setNotes = log.sets.filter((s: SetLog) => s.note).map((s: SetLog) => `${s.exerciseName} set ${s.setNumber}: "${s.note}"`);
  if (setNotes.length) parts.push('Set notes: ' + setNotes.join('; '));
  return parts.join('\n') || 'None';
}

function buildTargetContext(profile: UserProfile): string {
  const targets = profile.targetMaxLifts;
  if (!targets || !Object.keys(targets).length) return '';
  const liftNames: Record<string, string> = { squat: 'Squat', bench: 'Bench', deadlift: 'Deadlift', ohp: 'OHP' };
  const lines = Object.entries(targets).map(([id, target]) => {
    const current = profile.maxLifts[id];
    const name = liftNames[id] ?? id;
    if (current) {
      const pct = Math.round((current / target) * 100);
      return `${name}: ${current} → ${target} lbs (${pct}% of goal, ${target - current} lbs to go)`;
    }
    return `${name}: target ${target} lbs`;
  });
  return `Comeback targets:\n${lines.join('\n')}`;
}

function buildWeightTrend(weightLogs: WeightLog[]): string {
  if (!weightLogs.length) return '';
  const sorted = [...weightLogs].sort((a, b) => a.date.localeCompare(b.date));
  const recent = sorted.slice(-14);
  if (recent.length < 2) return `Current bodyweight: ${recent[0]?.weight ?? '?'} lbs`;
  const first = recent[0].weight;
  const last = recent[recent.length - 1].weight;
  const delta = (last - first).toFixed(1);
  const dir = last > first ? '+' : '';
  return `Bodyweight: ${last} lbs (${dir}${delta} lbs over last ${recent.length} entries)`;
}

function parseActions(raw: unknown[]): AIAction[] {
  return raw
    .filter((a): a is Record<string, unknown> => typeof a === 'object' && a !== null)
    .map(a => ({
      id: uid(),
      type: a.type as AIAction['type'],
      title: String(a.title ?? ''),
      description: String(a.description ?? ''),
      reason: String(a.reason ?? ''),
      data: (a.data as Record<string, unknown>) ?? {},
      autoApply: Boolean(a.autoApply),
      priority: (a.priority as AIAction['priority']) ?? 'medium',
      createdAt: new Date().toISOString(),
    }))
    .filter(a => ['ADJUST_MAX_LIFT','SWAP_PROGRAM_EXERCISE','MODIFY_SETS_REPS','ADD_DELOAD','COACH_INSIGHT','REST_TODAY'].includes(a.type));
}

// ── Advanced coaching analysis (post-workout) ─────────────────────────────────

const COACHING_SYSTEM = `You are an elite strength and hypertrophy coach. The athlete's PRIMARY goal is building muscle mass and looking great; SECONDARY goal is regaining their former strength. They have specific comeback targets for their main lifts. Analyze their data and return ONLY a valid JSON object:

{
  "analysis": "3-5 sentence coaching insight. Be SPECIFIC: reference actual weights, reps, and trends from their data. Vary your advice — cover technique, superset pairings, rep ranges, progression strategy, or recovery based on what the data shows. Do NOT give the same generic tip every session.",
  "actions": [
    {
      "type": "ACTION_TYPE",
      "title": "Short title under 8 words",
      "description": "Clear user-facing explanation",
      "reason": "Specific data-driven reason",
      "data": {},
      "autoApply": boolean,
      "priority": "low|medium|high"
    }
  ]
}

Available actions:

ADJUST_MAX_LIFT — Auto-applied. Use when free-weight e1RM exceeds current max by >5%.
  data: { "exerciseId": string, "newMax": number, "oldMax": number }
  autoApply: true

SWAP_PROGRAM_EXERCISE — Approval required. Permanently swap an exercise.
  data: { "dayId": string, "oldExerciseId": string, "newExerciseId": string, "dayName": string }
  autoApply: false

MODIFY_SETS_REPS — Approval required. Change volume/rep ranges.
  data: { "dayId": string, "exerciseId": string, "newSets": number, "newRepsMin": number, "newRepsMax": number }
  autoApply: false

ADD_DELOAD — Approval required. Suggest deload week.
  data: {}
  autoApply: false

COACH_INSIGHT — Auto-applied, text only.
  data: { "note": string }
  autoApply: true

REST_TODAY — Approval required. Recommend skipping today.
  data: {}
  autoApply: false

Rules:
- 0–3 actions max. Quality over quantity.
- Only ADJUST_MAX_LIFT on FREE WEIGHT barbell/dumbbell exercises (never machines or cables).
- Machine/cable weights are ADDED weight or stack setting — never use for e1RM.
- dayId must match exactly or omit the action.
- Return ONLY the JSON object — no markdown, no code fences.`;

export async function getAdvancedCoachingAnalysis(
  workoutLog: WorkoutLog,
  recentLogs: WorkoutLog[],
  profile: UserProfile,
  program: Program | null,
  apiKey: string,
  weightLogs: WeightLog[] = [],
): Promise<{ analysis: string; actions: AIAction[] }> {
  const workingSets = workoutLog.sets.filter(s => !s.isWarmup);

  const exerciseIds = Array.from(new Set(workingSets.map(s => s.exerciseId)));
  const exerciseSummaries = exerciseIds.map(id => {
    const sets = workingSets.filter(s => s.exerciseId === id);
    const isMachine = isAddedWeightExercise(id);
    const top = sets.reduce((b, s) => (s.weight * (1 + s.reps / 30) > b.weight * (1 + b.reps / 30) ? s : b), sets[0]);
    const e1rm = isMachine ? null : Math.round(top.weight * (1 + top.reps / 30));
    const currentMax = !isMachine ? (profile.maxLifts[id] ?? null) : null;
    const targetMax = !isMachine ? (profile.targetMaxLifts?.[id] ?? null) : null;
    const allSets = sets.map(s => `${s.weight}×${s.reps}${s.rpe ? `@${s.rpe}` : ''}`).join(', ');
    let line = `${top.exerciseName}${isMachine ? ' [machine/added-wt]' : ''}: sets=[${allSets}]`;
    if (e1rm) line += `, e1RM≈${e1rm}`;
    if (currentMax) line += ` (est.max: ${currentMax})`;
    if (targetMax) line += ` (target: ${targetMax})`;
    return line;
  });

  const todayDayInfo = program?.days
    .map(d => ({ id: d.id, name: d.name, exercises: d.exercises.map(e => e.exerciseId) })) ?? [];

  const wowData = buildWoWData([workoutLog, ...recentLogs]);
  const notesContext = formatNotes(workoutLog);
  const targetContext = buildTargetContext(profile);
  const weightContext = buildWeightTrend(weightLogs);

  const recentSessionNames = recentLogs.slice(0, 5).map(l => `${l.date}: ${l.dayName}`).join(', ');

  const prompt = `Athlete: ${profile.name}, ${profile.age}yo, ${profile.weight}lbs, ${profile.experience}
Primary goal: hypertrophy (look great). Secondary goal: strength comeback.
${targetContext}
${weightContext}

Today (${workoutLog.dayName}, ${workoutLog.durationMinutes ?? '?'}min, rating ${workoutLog.rating ?? '?'}/5):
${exerciseSummaries.join('\n')}

${wowData}

Recent sessions: ${recentSessionNames || 'first session'}

Program days (use exact dayId in actions):
${todayDayInfo.map(d => `"${d.name}" (id:${d.id}): ${d.exercises.join(', ')}`).join('\n')}

Athlete notes: ${notesContext}

Coaching focus this session: look at actual set data above. If they're hitting the top of their rep range on main lifts, suggest progressive overload. If volume is low, suggest a superset pairing. If performance dropped vs last week, address recovery. Reference specific exercises and numbers.`;

  try {
    const raw = await callAI(apiKey, prompt, COACHING_SYSTEM, 1200, 'claude-sonnet-4-6');
    const parsed = JSON.parse(raw.trim()) as { analysis?: string; actions?: unknown[] };
    return {
      analysis: parsed.analysis ?? '',
      actions: parseActions(parsed.actions ?? []),
    };
  } catch {
    return { analysis: '', actions: [] };
  }
}

// ── Weekly review coaching ────────────────────────────────────────────────────

export async function getWeeklyReviewAnalysis(
  review: WeeklyReview,
  weekLogs: WorkoutLog[],
  profile: UserProfile,
  apiKey: string,
  weightLogs: WeightLog[] = [],
): Promise<{ analysis: string; actions: AIAction[] }> {
  const totalSets = weekLogs.reduce((t, l) => t + l.sets.filter(s => !s.isWarmup).length, 0);
  const wowData = buildWoWData(weekLogs);
  const targetContext = buildTargetContext(profile);
  const weightContext = buildWeightTrend(weightLogs);

  const topSets = weekLogs.flatMap(l => l.sets.filter(s => !s.isWarmup && !isAddedWeightExercise(s.exerciseId)))
    .reduce((acc, s) => {
      const e1rm = Math.round(s.weight * (1 + s.reps / 30));
      if (!acc[s.exerciseName] || e1rm > acc[s.exerciseName]) acc[s.exerciseName] = e1rm;
      return acc;
    }, {} as Record<string, number>);

  const prompt = `Weekly review — ${profile.name}:
Goals: hypertrophy first, strength comeback second.
${targetContext}
${weightContext}

Week ratings: Overall ${review.overallRating}/5, Strength feel ${review.strengthFeel}/5, Recovery ${review.recoveryFeel}/5, Motivation ${review.motivation}/5, Joints ${review.jointHealth}/5
Sessions: ${weekLogs.length}/${profile.daysPerWeek} | Working sets: ${totalSets}
Notes: "${review.notes}"

Best e1RMs this week (free weights only): ${Object.entries(topSets).map(([n,v]) => `${n}: ${v}`).join(', ') || 'none'}

${wowData}

Machine/cable weights = added weight only, not total resistance. Do not use for 1RM estimates.

Based on this data: adjust next week's volume, intensity, or exercise selection. If joints ≤2 recommend deload. Reference specific numbers. Suggest superset pairings if volume is the limiting factor for hypertrophy.`;

  try {
    const raw = await callAI(apiKey, prompt, COACHING_SYSTEM, 1200, 'claude-sonnet-4-6');
    const parsed = JSON.parse(raw.trim()) as { analysis?: string; actions?: unknown[] };
    return {
      analysis: parsed.analysis ?? '',
      actions: parseActions(parsed.actions ?? []),
    };
  } catch {
    return { analysis: '', actions: [] };
  }
}

// ── Daily readiness feedback ──────────────────────────────────────────────────

export async function getReadinessFeedback(
  checkin: ReadinessCheckin,
  plannedDay: ProgramDay,
  apiKey: string,
): Promise<string> {
  const system = `You are a strength and hypertrophy coach. Give specific, actionable advice in 2–3 sentences. No markdown.`;
  const muscleList = Object.entries(checkin.muscleReadiness)
    .map(([m, v]) => `${m}: ${['','Low','Tired','Normal','Great','Extra'][v]}`)
    .join(', ');

  const prompt = `Readiness: sleep ${checkin.sleepHours}h quality ${checkin.sleepQuality}/5, nutrition ${checkin.nutrition}/5, stress ${checkin.stress}/5, energy ${checkin.overallEnergy}/5
Muscles: ${muscleList}
Planned: ${plannedDay.name} (${plannedDay.exercises.slice(0,4).map(e => e.exerciseId).join(', ')})

Should they train as planned, modify intensity, swap exercises, or rest? Be direct.`;

  return callAI(apiKey, prompt, system);
}

// ── Onboarding insights ──────────────────────────────────────────────────────

export async function generateOnboardingInsights(
  profile: UserProfile,
  apiKey: string,
): Promise<string> {
  const system = `You are an elite strength and hypertrophy coach. Be direct, practical, motivating. Under 200 words. Plain text only.`;
  const targetLine = profile.targetMaxLifts
    ? `Comeback targets — Squat: ${profile.targetMaxLifts['squat'] ?? '?'}, Bench: ${profile.targetMaxLifts['bench'] ?? '?'}, Deadlift: ${profile.targetMaxLifts['deadlift'] ?? '?'}`
    : '';
  const prompt = `New athlete: ${profile.name}, ${profile.age}yo, ${profile.weight}lbs, ${profile.height}", ${profile.experience}
Primary goal: hypertrophy (look great). Secondary: strength comeback.
Current maxes — Squat: ${profile.maxLifts['squat'] ?? 'unknown'}, Bench: ${profile.maxLifts['bench'] ?? 'unknown'}, Deadlift: ${profile.maxLifts['deadlift'] ?? 'unknown'}
${targetLine}

Write a personalized program overview: hypertrophy-first approach, starting phase, rep range guidance, protein importance, and a motivational note about the comeback journey.`;
  return callAI(apiKey, prompt, system);
}

// ── Daily tip (home screen, varies each day) ─────────────────────────────────

export async function getDailyTip(
  profile: UserProfile,
  recentLogs: WorkoutLog[],
  todayCheckin: ReadinessCheckin | null,
  apiKey: string,
  weightLogs: WeightLog[] = [],
  proteinToday?: boolean,
): Promise<string> {
  const system = `You are a hypertrophy and strength coach giving a daily coaching tip. Rules:
- Be SPECIFIC and DATA-DRIVEN — reference actual exercises, weights, or trends from their data
- VARY your advice daily: rotate between topics (progressive overload, superset technique, nutrition, sleep/recovery, mind-muscle connection, upcoming workout prep, protein timing, rep tempo, etc.)
- 2 sentences max. No markdown, no greeting, no sign-off.
- Never give a generic tip that ignores their actual data.`;

  const lastWorkout = recentLogs[0];
  const wowLine = recentLogs.length >= 2 ? buildWoWData(recentLogs.slice(0, 8)).split('\n').slice(0, 4).join(' | ') : '';
  const targetContext = buildTargetContext(profile);
  const weightContext = buildWeightTrend(weightLogs);

  // Summarize last session's top sets for context
  const lastTopSets = lastWorkout
    ? Array.from(new Set(lastWorkout.sets.filter(s => !s.isWarmup).map(s => s.exerciseName)))
        .slice(0, 3)
        .map(name => {
          const exSets = lastWorkout.sets.filter(s => s.exerciseName === name && !s.isWarmup);
          const top = exSets.reduce((b, s) => s.weight > b.weight ? s : b, exSets[0]);
          return `${name} ${top.weight}×${top.reps}`;
        }).join(', ')
    : null;

  const prompt = `${profile.name} — hypertrophy-first, strength comeback.
${targetContext}
${weightContext}
Last session (${lastWorkout?.date ?? 'none'}): ${lastTopSets ?? 'no data'} — ${lastWorkout?.dayName ?? ''}
Today's readiness: ${todayCheckin ? `energy ${todayCheckin.overallEnergy}/5, sleep ${todayCheckin.sleepHours}h, stress ${todayCheckin.stress}/5` : 'no check-in'}
Protein shake today: ${proteinToday ? 'yes' : 'not yet logged'}
${wowLine ? `Recent trend: ${wowLine}` : ''}
Sessions logged: ${recentLogs.length}

Give one specific, actionable coaching tip based on this data. Pick a different angle than yesterday.`;

  return callAI(apiKey, prompt, system, 150, 'claude-haiku-4-5-20251001');
}

// ── Post-workout brief feedback (fast text) ───────────────────────────────────

export async function getWorkoutFeedback(
  log: WorkoutLog,
  profile: UserProfile,
  apiKey: string,
): Promise<string> {
  const sets = log.sets.filter(s => !s.isWarmup);
  const exercises = Array.from(new Set(sets.map(s => s.exerciseName)));
  const topSets = exercises.slice(0, 4).map(name => {
    const exSets = sets.filter(s => s.exerciseName === name);
    const top = exSets.reduce((b, s) => (s.weight > b.weight ? s : b), exSets[0]);
    const isMachine = isAddedWeightExercise(exSets[0]?.exerciseId ?? '');
    return `${name}: ${top.weight}×${top.reps}${top.rpe ? ` @${top.rpe}` : ''}${isMachine ? ' (machine)' : ''}`;
  });
  const targetLine = buildTargetContext(profile);

  const system = `You are a hypertrophy and strength coach. 2 sentences. Specific feedback on performance + one actionable next-step. No markdown.`;
  const prompt = `Post-workout: ${profile.name} (${log.dayName}, ${log.durationMinutes ?? '?'}min, rating ${log.rating}/5)
Sets: ${topSets.join(' | ')}
Goal: hypertrophy first, strength comeback second.
${targetLine}`;
  return callAI(apiKey, prompt, system, 150);
}
