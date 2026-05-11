export type WeightUnit = 'lbs' | 'kg';
export type MuscleReadiness = 1 | 2 | 3 | 4 | 5; // 1=low,2=tired,3=normal,4=great,5=extra
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type Goal = 'strength' | 'powerbuilding' | 'hypertrophy';
export type MesocyclePhase = 'accumulation' | 'intensification' | 'peak' | 'deload';

export interface Exercise {
  id: string;
  name: string;
  category: 'compound' | 'accessory' | 'isolation';
  muscleGroups: string[];
  movement: 'push' | 'pull' | 'hinge' | 'squat' | 'carry' | 'isolation';
}

export interface UserProfile {
  name: string;
  age: number;
  weight: number;       // lbs
  height: number;       // inches
  experience: ExperienceLevel;
  goal: Goal;
  maxLifts: Record<string, number>; // exerciseId → 1RM in lbs
  daysPerWeek: 3 | 4;
  onboardingComplete: boolean;
  claudeApiKey?: string;
  createdAt: string;
}

export interface ProgramExercise {
  exerciseId: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  rpeTarget?: number;
  notes?: string;
  alternatives?: string[]; // fallback exercise IDs
}

export interface ProgramDay {
  id: string;
  name: string;
  dayNumber: number;
  type: 'strength' | 'hypertrophy' | 'fullbody' | 'cardio' | 'optional' | 'rest';
  exercises: ProgramExercise[];
}

export interface Program {
  id: string;
  name: string;
  description: string;
  daysPerWeek: number;
  days: ProgramDay[];
  createdAt: string;
}

export interface SetLog {
  id: string;
  exerciseId: string;
  exerciseName: string;
  setNumber: number;
  weight: number;
  reps: number;
  rpe?: number;
  isWarmup: boolean;
  note?: string; // brief per-set note: "supinated", "paused", "close grip", etc.
}

export interface WorkoutLog {
  id: string;
  date: string;
  startTime: string;
  endTime?: string;
  programId?: string;
  dayName: string;
  sets: SetLog[];
  notes: string;
  exerciseNotes?: Record<string, string>; // exerciseId → note for that exercise
  rating?: 1 | 2 | 3 | 4 | 5;
  bodyweight?: number;
  durationMinutes?: number;
}

export interface ActiveWorkout {
  startTime: string;
  programId?: string;
  dayName: string;
  plannedExercises: ProgramExercise[];
  sets: SetLog[];
  swaps: Record<string, string>; // originalId → swappedId
  exerciseNotes: Record<string, string>; // exerciseId → note
}

export interface MuscleReadinessMap {
  chest: MuscleReadiness;
  back: MuscleReadiness;
  shoulders: MuscleReadiness;
  arms: MuscleReadiness;
  quads: MuscleReadiness;
  hamstrings: MuscleReadiness;
  glutes: MuscleReadiness;
  core: MuscleReadiness;
  lowerBack: MuscleReadiness;
}

export interface ReadinessCheckin {
  id: string;
  date: string;
  sleepHours: number;
  sleepQuality: 1 | 2 | 3 | 4 | 5;
  nutrition: 1 | 2 | 3 | 4 | 5;
  stress: 1 | 2 | 3 | 4 | 5;
  overallEnergy: 1 | 2 | 3 | 4 | 5;
  muscleReadiness: MuscleReadinessMap;
  notes: string;
  aiSuggestion?: string;
}

export interface WeeklyReview {
  id: string;
  weekNumber: number;
  date: string;
  overallRating: 1 | 2 | 3 | 4 | 5;
  strengthFeel: 1 | 2 | 3 | 4 | 5;
  recoveryFeel: 1 | 2 | 3 | 4 | 5;
  motivation: 1 | 2 | 3 | 4 | 5;
  jointHealth: 1 | 2 | 3 | 4 | 5;
  hitAllSessions: 'yes' | 'partial' | 'no';
  notes: string;
  aiAnalysis?: string;
}

export interface CardioLog {
  id: string;
  date: string;
  type: 'basketball' | 'running' | 'cycling' | 'swimming' | 'other';
  duration: number; // minutes
  intensity: 'low' | 'moderate' | 'high';
  notes: string;
}

export interface DailySupplementLog {
  date: string;
  taken: string[]; // supplement IDs checked off that day
}

export interface WeightLog {
  date: string;   // YYYY-MM-DD
  weight: number; // lbs
}

export interface Mesocycle {
  startDate: string;
  totalWeeks: number;
  currentWeek: number; // 1-indexed
}

// ── AI coaching action system ─────────────────────────────────────────────────

export type AIActionType =
  | 'ADJUST_MAX_LIFT'        // auto-applies: update 1RM estimate from performance
  | 'SWAP_PROGRAM_EXERCISE'  // needs approval: permanently swap exercise in program
  | 'MODIFY_SETS_REPS'       // needs approval: change sets/reps for an exercise
  | 'ADD_DELOAD'             // needs approval: schedule a deload week
  | 'COACH_INSIGHT'          // auto-applies: informational only, no state change
  | 'REST_TODAY';            // needs approval: recommend rest day

export interface AIAction {
  id: string;
  type: AIActionType;
  title: string;
  description: string;
  reason: string;
  data: Record<string, unknown>;
  autoApply: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
}

export interface AppState {
  programs: Program[];
  activeProgramId: string | null;
  currentDayIndex: number;
  workoutLogs: WorkoutLog[];
  activeWorkout: ActiveWorkout | null;
  settings: {
    weightUnit: WeightUnit;
    defaultRestSeconds: number;
  };
  userProfile: UserProfile | null;
  mesocycle: Mesocycle;
  readinessLogs: ReadinessCheckin[];
  cardioLogs: CardioLog[];
  weeklyReviews: WeeklyReview[];
  supplementLogs: DailySupplementLog[];
  weightLogs: WeightLog[];
  pendingAIActions: AIAction[];
  updatedAt: string; // ISO timestamp for cross-device sync conflict resolution
}

export type AppAction =
  | { type: 'ADD_PROGRAM'; program: Program }
  | { type: 'DELETE_PROGRAM'; id: string }
  | { type: 'SET_ACTIVE_PROGRAM'; id: string | null }
  | { type: 'START_WORKOUT'; workout: ActiveWorkout }
  | { type: 'LOG_SET'; set: SetLog }
  | { type: 'REMOVE_SET'; setId: string }
  | { type: 'SWAP_EXERCISE'; originalId: string; replacementId: string }
  | { type: 'FINISH_WORKOUT'; log: WorkoutLog }
  | { type: 'CANCEL_WORKOUT' }
  | { type: 'ADVANCE_DAY' }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<AppState['settings']> }
  | { type: 'SET_PROFILE'; profile: UserProfile }
  | { type: 'UPDATE_PROFILE'; updates: Partial<UserProfile> }
  | { type: 'UPDATE_MESOCYCLE'; mesocycle: Partial<Mesocycle> }
  | { type: 'ADD_READINESS'; checkin: ReadinessCheckin }
  | { type: 'ADD_CARDIO_LOG'; log: CardioLog }
  | { type: 'ADD_WEEKLY_REVIEW'; review: WeeklyReview }
  | { type: 'TOGGLE_SUPPLEMENT'; date: string; supplementId: string }
  | { type: 'LOG_WEIGHT'; log: WeightLog }
  | { type: 'UPDATE_SET'; set: SetLog }
  | { type: 'SET_EXERCISE_NOTE'; exerciseId: string; note: string }
  | { type: 'ADD_AI_ACTIONS'; actions: AIAction[] }
  | { type: 'APPLY_AI_ACTION'; actionId: string }
  | { type: 'DISMISS_AI_ACTION'; actionId: string }
  | { type: 'LOAD_STATE'; state: AppState };
