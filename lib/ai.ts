import { UserProfile, ReadinessCheckin, WeeklyReview, WorkoutLog, ProgramDay } from './types';

// ── API call helper ──────────────────────────────────────────────────────────
async function callAI(apiKey: string, prompt: string, systemPrompt: string): Promise<string> {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, prompt, systemPrompt }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'AI request failed');
  }
  const data = await res.json() as { text: string };
  return data.text;
}

// ── Onboarding: generate program overview & starting weights ─────────────────
export async function generateOnboardingInsights(
  profile: UserProfile,
  apiKey: string
): Promise<string> {
  const system = `You are an elite powerbuilding coach. Be direct, practical, and motivating. Keep responses concise (under 200 words). Use plain text — no markdown headers, no bullet symbols.`;

  const prompt = `
New athlete profile:
- Name: ${profile.name}, Age: ${profile.age}, Weight: ${profile.weight} lbs, Height: ${profile.height}"
- Experience: ${profile.experience}, Goal: ${profile.goal}
- Days/week: ${profile.daysPerWeek}
- Current maxes: Squat ${profile.maxLifts['squat'] ?? 'unknown'} lbs, Bench ${profile.maxLifts['bench'] ?? 'unknown'} lbs, Deadlift ${profile.maxLifts['deadlift'] ?? 'unknown'} lbs, OHP ${profile.maxLifts['ohp'] ?? 'unknown'} lbs

Write a brief, personalized program overview for this athlete. Include: what phase to start in, what their initial RPE targets should be, any weak points to address based on their lift ratios, and a motivational note. Be specific to their numbers.`;

  return callAI(apiKey, prompt, system);
}

// ── Daily readiness: workout modification suggestions ─────────────────────────
export async function getReadinessFeedback(
  checkin: ReadinessCheckin,
  plannedDay: ProgramDay,
  apiKey: string
): Promise<string> {
  const system = `You are a powerbuilding coach reviewing an athlete's daily readiness. Give specific, actionable advice in 2–3 sentences. No markdown.`;

  const muscleList = Object.entries(checkin.muscleReadiness)
    .map(([m, v]) => `${m}: ${['','Low','Tired','Normal','Great','Extra'][v]}`)
    .join(', ');

  const prompt = `
Today's readiness:
- Sleep: ${checkin.sleepHours}h, quality ${checkin.sleepQuality}/5
- Nutrition: ${checkin.nutrition}/5, Stress: ${checkin.stress}/5, Energy: ${checkin.overallEnergy}/5
- Muscle readiness: ${muscleList}

Planned workout: ${plannedDay.name}
Exercises: ${plannedDay.exercises.slice(0,4).map(e => e.exerciseId).join(', ')}

Based on this readiness, give specific advice: should they train as planned, modify intensity, swap any exercises, or rest? Be direct.`;

  return callAI(apiKey, prompt, system);
}

// ── Weekly review: analysis + next-week adjustments ──────────────────────────
export async function getWeeklyReviewAnalysis(
  review: WeeklyReview,
  weekLogs: WorkoutLog[],
  profile: UserProfile,
  apiKey: string
): Promise<string> {
  const totalSets = weekLogs.reduce((t, l) => t + l.sets.filter(s => !s.isWarmup).length, 0);
  const sessions = weekLogs.length;

  const system = `You are an elite powerbuilding coach doing a weekly program review. Give specific, actionable recommendations for next week. Under 200 words. No markdown.`;

  const prompt = `
Weekly review for ${profile.name}:
Ratings: Overall ${review.overallRating}/5, Strength ${review.strengthFeel}/5, Recovery ${review.recoveryFeel}/5, Motivation ${review.motivation}/5, Joints ${review.jointHealth}/5
Sessions completed: ${sessions}/${profile.daysPerWeek}
Total working sets: ${totalSets}
Notes: "${review.notes}"

Based on this data, give specific recommendations for next week: should they increase load, maintain, deload, add/remove volume? Address any red flags (low joint health, low recovery). Be direct and specific.`;

  return callAI(apiKey, prompt, system);
}

// ── Post-workout: brief AI feedback ──────────────────────────────────────────
export async function getWorkoutFeedback(
  log: WorkoutLog,
  profile: UserProfile,
  apiKey: string
): Promise<string> {
  const sets = log.sets.filter(s => !s.isWarmup);
  const exercises = Array.from(new Set(sets.map(s => s.exerciseName)));
  const topSets = exercises.slice(0, 3).map(name => {
    const exSets = sets.filter(s => s.exerciseName === name);
    const top = exSets.reduce((b, s) => (s.weight > b.weight ? s : b), exSets[0]);
    return `${name}: ${top.weight}×${top.reps}${top.rpe ? ` @${top.rpe}` : ''}`;
  });

  const system = `You are a powerbuilding coach. Give brief, specific post-workout feedback in 2 sentences max. No markdown.`;

  const prompt = `
Post-workout for ${profile.name} (${log.dayName}):
Top sets: ${topSets.join(', ')}
Duration: ${log.durationMinutes ?? '?'}min, Rating: ${log.rating}/5
Goal: ${profile.goal}

Give brief, specific feedback on performance and one tip for next session.`;

  return callAI(apiKey, prompt, system);
}
