import { AppState, AIAction } from './types';

export function applyAIAction(state: AppState, action: AIAction): Partial<AppState> {
  switch (action.type) {
    case 'ADJUST_MAX_LIFT': {
      if (!state.userProfile) return {};
      const { exerciseId, newMax } = action.data as { exerciseId: string; newMax: number };
      if (!exerciseId || typeof newMax !== 'number') return {};
      return {
        userProfile: {
          ...state.userProfile,
          maxLifts: { ...state.userProfile.maxLifts, [exerciseId]: Math.round(newMax) },
        },
      };
    }

    case 'SWAP_PROGRAM_EXERCISE': {
      const { dayId, oldExerciseId, newExerciseId } = action.data as {
        dayId: string; oldExerciseId: string; newExerciseId: string;
      };
      if (!dayId || !oldExerciseId || !newExerciseId) return {};
      return {
        programs: state.programs.map(p => ({
          ...p,
          days: p.days.map(d => d.id !== dayId ? d : {
            ...d,
            exercises: d.exercises.map(e =>
              e.exerciseId === oldExerciseId ? { ...e, exerciseId: newExerciseId } : e
            ),
          }),
        })),
      };
    }

    case 'MODIFY_SETS_REPS': {
      const { dayId, exerciseId, newSets, newRepsMin, newRepsMax } = action.data as {
        dayId: string; exerciseId: string; newSets: number; newRepsMin: number; newRepsMax: number;
      };
      if (!dayId || !exerciseId) return {};
      return {
        programs: state.programs.map(p => ({
          ...p,
          days: p.days.map(d => d.id !== dayId ? d : {
            ...d,
            exercises: d.exercises.map(e =>
              e.exerciseId === exerciseId
                ? { ...e, sets: newSets ?? e.sets, repsMin: newRepsMin ?? e.repsMin, repsMax: newRepsMax ?? e.repsMax }
                : e
            ),
          }),
        })),
      };
    }

    case 'ADD_DELOAD':
      return {
        mesocycle: {
          ...state.mesocycle,
          totalWeeks: Math.max(state.mesocycle.totalWeeks, state.mesocycle.currentWeek + 1),
        },
      };

    case 'COACH_INSIGHT':
    case 'REST_TODAY':
    default:
      return {};
  }
}
