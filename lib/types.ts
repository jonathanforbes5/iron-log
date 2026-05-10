export type WeightUnit = 'lbs' | 'kg';

export interface Exercise {
  id: string;
  name: string;
  category: 'compound' | 'accessory' | 'isolation';
  muscleGroups: string[];
  movement: 'push' | 'pull' | 'hinge' | 'squat' | 'carry' | 'isolation';
}

export interface ProgramExercise {
  exerciseId: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  rpeTarget?: number;
  notes?: string;
}

export interface ProgramDay {
  id: string;
  name: string;
  dayNumber: number;
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
}

export type AppAction =
  | { type: 'ADD_PROGRAM'; program: Program }
  | { type: 'DELETE_PROGRAM'; id: string }
  | { type: 'SET_ACTIVE_PROGRAM'; id: string | null }
  | { type: 'START_WORKOUT'; workout: ActiveWorkout }
  | { type: 'LOG_SET'; set: SetLog }
  | { type: 'REMOVE_SET'; setId: string }
  | { type: 'FINISH_WORKOUT'; log: WorkoutLog }
  | { type: 'CANCEL_WORKOUT' }
  | { type: 'ADVANCE_DAY' }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<AppState['settings']> }
  | { type: 'LOAD_STATE'; state: AppState };
