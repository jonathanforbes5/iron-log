import { UserProfile, ReadinessCheckin, WeeklyReview, WorkoutLog, ProgramDay, Program, AIAction, SetLog } from './types';
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

// ── Week-over-week helper ─────────────────────────────────────────────────────

function isoWeekMonday(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00');
  const dow = d.getDay(); // 0=Sun
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

// ── Advanced coaching analysis (called after workouts, reviews, etc.) ─────────

const COACHING_SYSTEM = `You are an elite AI powerbuilding coach with full access to the athlete's performance data. Analyze their data deeply and return ONLY a valid JSON object in exactly this format:

{
  "analysis": "2-4 sentence coaching insight that is specific, data-driven, and actionable",
  "actions": [
    {
      "type": "ACTION_TYPE",
      "title": "Short title under 8 words",
      "description": "Clear user-facing explanation of what changes",
      "reason": "Specific data-driven reason",
      "data": {},
      "autoApply": boolean,
      "priority": "low|medium|high"
    }
  ]
}

Available action types and their data schemas:

ADJUST_MAX_LIFT — Auto-applied immediately. Use when set data clearly indicates 1RM is higher/lower than estimated.
  data: { "exerciseId": string, "newMax": number, "oldMax": number }
  autoApply: true
  When to use: athlete hit top of rep range at low RPE, or e1RM from logged sets exceeds estimate by >5%

SWAP_PROGRAM_EXERCISE — Requires approval. Permanently swap an exercise in the program.
  data: { "dayId": string, "oldExerciseId": string, "newExerciseId": string, "dayName": string }
  autoApply: false

MODIFY_SETS_REPS — Requires approval. Adjust volume/intensity for an exercise.
  data: { "dayId": string, "exerciseId": string, "newSets": number, "newRepsMin": number, "newRepsMax": number }
  autoApply: false

ADD_DELOAD — Requires approval. Suggest a deload week.
  data: {}
  autoApply: false
  When to use: joint health ≤2, recovery ≤2, or consecutive weeks of declining performance

COACH_INSIGHT — Auto-applied (text only, no state change). Use for important observations.
  data: { "note": string }
  autoApply: true

REST_TODAY — Requires approval. Recommend skipping today.
  data: {}
  autoApply: false

Rules:
- Return 0–4 actions. Quality over quantity.
- Only suggest ADJUST_MAX_LIFT if you have clear evidence from the logged sets (e.g. Epley e1RM > current max by >5%).
- Use correct exerciseIds (squat, bench, deadlift, ohp, rdl, row, pullup, etc.)
- dayId must match exactly. If unknown, omit the action.
- Return ONLY the JSON object — no markdown, no explanation, no code fences.`;

export async function getAdvancedCoachingAnalysis(
  workoutLog: WorkoutLog,
  recentLogs: WorkoutLog[],
  profile: UserProfile,
  program: Program | null,
  apiKey: string,
): Promise<{ analysis: string; actions: AIAction[] }> {
  const workingSets = workoutLog.sets.filter(s => !s.isWarmup);

  // Build per-exercise top set summaries with e1RM
  const exerciseIds = Array.from(new Set(workingSets.map(s => s.exerciseId)));
  const exerciseSummaries = exerciseIds.map(id => {
    const sets = workingSets.filter(s => s.exerciseId === id);
    const top = sets.reduce((b, s) => (s.weight * (1 + s.reps / 30) > b.weight * (1 + b.reps / 30) ? s : b), sets[0]);
    const e1rm = Math.round(top.weight * (1 + top.reps / 30));
    const currentMax = profile.maxLifts[id] ?? null;
    return `${top.exerciseName}: best set ${top.weight}×${top.reps}${top.rpe ? ` @RPE${top.rpe}` : ''}, e1RM≈${e1rm}${currentMax ? ` (current max: ${currentMax})` : ''}`;
  });

  // Recent trend for main lifts
  const recentTrend = ['squat','bench','deadlift','ohp']
    .map(id => {
      const sets = recentLogs.flatMap(l => l.sets).filter(s => s.exerciseId === id && !s.isWarmup);
      if (!sets.length) return null;
      const byDate = sets.reduce((acc, s) => {
        const d = s.id.slice(0,10); // approximation
        acc[d] = Math.max(acc[d] ?? 0, s.weight);
        return acc;
      }, {} as Record<string, number>);
      const vals = Object.values(byDate);
      const trend = vals.length > 1 ? (vals[vals.length - 1] > vals[0] ? 'up' : vals[vals.length - 1] < vals[0] ? 'down' : 'flat') : 'stable';
      return `${id}: trend ${trend}`;
    })
    .filter(Boolean);

  // Find today's program day (for dayId references)
  const todayDayInfo = program?.days
    .map(d => ({ id: d.id, name: d.name, exercises: d.exercises.map(e => e.exerciseId) })) ?? [];

  const wowData = buildWoWData([workoutLog, ...recentLogs]);
  const notesContext = formatNotes(workoutLog);

  const prompt = `Athlete: ${profile.name}, ${profile.age}yo, ${profile.weight}lbs, ${profile.experience}, goal: ${profile.goal}
Current maxes — Squat: ${profile.maxLifts['squat'] ?? '?'}, Bench: ${profile.maxLifts['bench'] ?? '?'}, Deadlift: ${profile.maxLifts['deadlift'] ?? '?'}, OHP: ${profile.maxLifts['ohp'] ?? '?'}

Today's workout (${workoutLog.dayName}, ${workoutLog.durationMinutes ?? '?'}min, rating ${workoutLog.rating ?? '?'}/5):
${exerciseSummaries.join('\n')}

${wowData}

Recent lift trends: ${recentTrend.join(', ') || 'insufficient data'}
Sessions this mesocycle: ${recentLogs.length}

Program days for reference (use exact dayId in actions):
${todayDayInfo.map(d => `Day "${d.name}" (id: ${d.id}): ${d.exercises.join(', ')}`).join('\n')}

${notesContext}

Analyze this session with special attention to week-over-week changes. If any e1RM clearly exceeds current max by >5%, suggest ADJUST_MAX_LIFT. Give direct, specific coaching.`;

  try {
    const raw = await callAI(apiKey, prompt, COACHING_SYSTEM, 1024, 'claude-sonnet-4-6');
    const parsed = JSON.parse(raw.trim()) as { analysis?: string; actions?: unknown[] };
    return {
      analysis: parsed.analysis ?? '',
      actions: parseActions(parsed.actions ?? []),
    };
  } catch {
    return { analysis: '', actions: [] };
  }
}

// ── Weekly review with structured coaching output ────────────────────────────

export async function getWeeklyReviewAnalysis(
  review: WeeklyReview,
  weekLogs: WorkoutLog[],
  profile: UserProfile,
  apiKey: string,
): Promise<{ analysis: string; actions: AIAction[] }> {
  const totalSets = weekLogs.reduce((t, l) => t + l.sets.filter(s => !s.isWarmup).length, 0);
  const wowData = buildWoWData(weekLogs);

  const prompt = `Weekly review for ${profile.name}:
Ratings: Overall ${review.overallRating}/5, Strength ${review.strengthFeel}/5, Recovery ${review.recoveryFeel}/5, Motivation ${review.motivation}/5, Joints ${review.jointHealth}/5
Sessions: ${weekLogs.length}/${profile.daysPerWeek}, Working sets: ${totalSets}
Notes: "${review.notes}"

${wowData}

Current maxes — Squat: ${profile.maxLifts['squat'] ?? '?'}, Bench: ${profile.maxLifts['bench'] ?? '?'}, Deadlift: ${profile.maxLifts['deadlift'] ?? '?'}, OHP: ${profile.maxLifts['ohp'] ?? '?'}

Provide next-week adjustments. Consider: joint health ≤2 → ADD_DELOAD. Recovery ≤2 → reduce volume. Strength ≥4 → potential load increase.`;

  try {
    const raw = await callAI(apiKey, prompt, COACHING_SYSTEM, 1024, 'claude-sonnet-4-6');
    const parsed = JSON.parse(raw.trim()) as { analysis?: string; actions?: unknown[] };
    return {
      analysis: parsed.analysis ?? '',
      actions: parseActions(parsed.actions ?? []),
    };
  } catch {
    return { analysis: '', actions: [] };
  }
}

// ── Daily readiness feedback (quick, no structured actions needed) ────────────

export async function getReadinessFeedback(
  checkin: ReadinessCheckin,
  plannedDay: ProgramDay,
  apiKey: string,
): Promise<string> {
  const system = `You are a powerbuilding coach. Give specific, actionable advice in 2–3 sentences based on today's readiness. No markdown.`;
  const muscleList = Object.entries(checkin.muscleReadiness)
    .map(([m, v]) => `${m}: ${['','Low','Tired','Normal','Great','Extra'][v]}`)
    .join(', ');

  const prompt = `Readiness: sleep ${checkin.sleepHours}h quality ${checkin.sleepQuality}/5, nutrition ${checkin.nutrition}/5, stress ${checkin.stress}/5, energy ${checkin.overallEnergy}/5
Muscles: ${muscleList}
Planned: ${plannedDay.name} (${plannedDay.exercises.slice(0,4).map(e => e.exerciseId).join(', ')})

Advise: train as planned, modify, swap exercises, or rest? Be direct.`;

  return callAI(apiKey, prompt, system);
}

// ── Onboarding insights ──────────────────────────────────────────────────────

export async function generateOnboardingInsights(
  profile: UserProfile,
  apiKey: string,
): Promise<string> {
  const system = `You are an elite powerbuilding coach. Be direct, practical, motivating. Under 200 words. Plain text only.`;
  const prompt = `New athlete: ${profile.name}, ${profile.age}yo, ${profile.weight}lbs, ${profile.height}", ${profile.experience}, goal: ${profile.goal}, ${profile.daysPerWeek}d/week
Maxes — Squat: ${profile.maxLifts['squat'] ?? 'unknown'}, Bench: ${profile.maxLifts['bench'] ?? 'unknown'}, Deadlift: ${profile.maxLifts['deadlift'] ?? 'unknown'}, OHP: ${profile.maxLifts['ohp'] ?? 'unknown'}

Write a personalized program overview: starting phase, initial RPE targets, weak points from lift ratios, motivational note.`;
  return callAI(apiKey, prompt, system);
}

// ── Daily tip (home screen, called once per day) ─────────────────────────────

export async function getDailyTip(
  profile: UserProfile,
  recentLogs: WorkoutLog[],
  todayCheckin: ReadinessCheckin | null,
  apiKey: string,
): Promise<string> {
  const system = `You are a powerbuilding coach. Give one short, specific coaching tip for today — 1-2 sentences max. No markdown, no greeting, no sign-off.`;
  const lastWorkout = recentLogs[0];
  const wowLine = recentLogs.length >= 2 ? buildWoWData(recentLogs.slice(0, 8)).split('\n').slice(0, 3).join('; ') : '';
  const prompt = `${profile.name}, ${profile.experience}, goal: ${profile.goal}
Last session: ${lastWorkout ? `${lastWorkout.dayName} on ${lastWorkout.date}` : 'none logged'}
Readiness today: ${todayCheckin ? `energy ${todayCheckin.overallEnergy}/5, sleep ${todayCheckin.sleepHours}h, stress ${todayCheckin.stress}/5` : 'no check-in yet'}
${wowLine ? `Recent trend: ${wowLine}` : ''}
Give one actionable tip for today's training or recovery.`;
  return callAI(apiKey, prompt, system, 200, 'claude-haiku-4-5-20251001');
}

// ── Post-workout brief feedback (text only, fast) ────────────────────────────

export async function getWorkoutFeedback(
  log: WorkoutLog,
  profile: UserProfile,
  apiKey: string,
): Promise<string> {
  const sets = log.sets.filter(s => !s.isWarmup);
  const exercises = Array.from(new Set(sets.map(s => s.exerciseName)));
  const topSets = exercises.slice(0, 3).map(name => {
    const exSets = sets.filter(s => s.exerciseName === name);
    const top = exSets.reduce((b, s) => (s.weight > b.weight ? s : b), exSets[0]);
    return `${name}: ${top.weight}×${top.reps}${top.rpe ? ` @${top.rpe}` : ''}`;
  });

  const system = `You are a powerbuilding coach. 2 sentences max. No markdown.`;
  const prompt = `Post-workout ${profile.name} (${log.dayName}): ${topSets.join(', ')} | ${log.durationMinutes ?? '?'}min, rating ${log.rating}/5, goal: ${profile.goal}. Brief feedback + one tip.`;
  return callAI(apiKey, prompt, system);
}
