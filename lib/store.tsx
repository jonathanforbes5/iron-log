'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import {
  AppState, AppAction, Program, WorkoutLog, SetLog,
  ActiveWorkout, UserProfile, ReadinessCheckin, CardioLog, WeeklyReview, Mesocycle,
} from './types';

const STORAGE_KEY = 'ironlog_v2';

const DEFAULT_MESOCYCLE: Mesocycle = {
  startDate: new Date().toISOString().slice(0, 10),
  totalWeeks: 7,
  currentWeek: 1,
};

const defaultState: AppState = {
  programs: [],
  activeProgramId: null,
  currentDayIndex: 0,
  workoutLogs: [],
  activeWorkout: null,
  settings: { weightUnit: 'lbs', defaultRestSeconds: 180 },
  userProfile: null,
  mesocycle: DEFAULT_MESOCYCLE,
  readinessLogs: [],
  cardioLogs: [],
  weeklyReviews: [],
};

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'LOAD_STATE':
      return { ...defaultState, ...action.state };

    case 'ADD_PROGRAM':
      return { ...state, programs: [...state.programs, action.program] };

    case 'DELETE_PROGRAM': {
      const programs = state.programs.filter(p => p.id !== action.id);
      const activeProgramId = state.activeProgramId === action.id ? null : state.activeProgramId;
      return { ...state, programs, activeProgramId };
    }

    case 'SET_ACTIVE_PROGRAM':
      return { ...state, activeProgramId: action.id, currentDayIndex: 0 };

    case 'START_WORKOUT':
      return { ...state, activeWorkout: action.workout };

    case 'LOG_SET':
      if (!state.activeWorkout) return state;
      return {
        ...state,
        activeWorkout: { ...state.activeWorkout, sets: [...state.activeWorkout.sets, action.set] },
      };

    case 'REMOVE_SET':
      if (!state.activeWorkout) return state;
      return {
        ...state,
        activeWorkout: {
          ...state.activeWorkout,
          sets: state.activeWorkout.sets.filter(s => s.id !== action.setId),
        },
      };

    case 'SWAP_EXERCISE':
      if (!state.activeWorkout) return state;
      return {
        ...state,
        activeWorkout: {
          ...state.activeWorkout,
          swaps: { ...state.activeWorkout.swaps, [action.originalId]: action.replacementId },
        },
      };

    case 'FINISH_WORKOUT': {
      const program = state.activeProgramId
        ? state.programs.find(p => p.id === state.activeProgramId)
        : null;
      const nextDayIndex = program
        ? (state.currentDayIndex + 1) % program.days.length
        : state.currentDayIndex;
      return {
        ...state,
        activeWorkout: null,
        currentDayIndex: nextDayIndex,
        workoutLogs: [action.log, ...state.workoutLogs],
      };
    }

    case 'CANCEL_WORKOUT':
      return { ...state, activeWorkout: null };

    case 'ADVANCE_DAY': {
      const program = state.activeProgramId
        ? state.programs.find(p => p.id === state.activeProgramId)
        : null;
      if (!program) return state;
      return { ...state, currentDayIndex: (state.currentDayIndex + 1) % program.days.length };
    }

    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.settings } };

    case 'SET_PROFILE':
      return { ...state, userProfile: action.profile };

    case 'UPDATE_MESOCYCLE':
      return { ...state, mesocycle: { ...state.mesocycle, ...action.mesocycle } };

    case 'ADD_READINESS':
      return {
        ...state,
        readinessLogs: [
          action.checkin,
          ...state.readinessLogs.filter(r => r.date !== action.checkin.date),
        ],
      };

    case 'ADD_CARDIO_LOG':
      return { ...state, cardioLogs: [action.log, ...state.cardioLogs] };

    case 'ADD_WEEKLY_REVIEW':
      return {
        ...state,
        weeklyReviews: [
          action.review,
          ...state.weeklyReviews.filter(r => r.weekNumber !== action.review.weekNumber),
        ],
      };

    default:
      return state;
  }
}

interface StoreContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, defaultState);
  const initialized = React.useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AppState;
        dispatch({ type: 'LOAD_STATE', state: { ...defaultState, ...parsed } });
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!initialized.current) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }, [state]);

  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

// ── Convenience hooks ────────────────────────────────────────────────────────

export function useProfile() {
  const { state, dispatch } = useStore();
  const setProfile = useCallback((profile: UserProfile) => dispatch({ type: 'SET_PROFILE', profile }), [dispatch]);
  return { profile: state.userProfile, setProfile };
}

export function usePrograms() {
  const { state, dispatch } = useStore();
  const addProgram   = useCallback((program: Program) => dispatch({ type: 'ADD_PROGRAM', program }), [dispatch]);
  const deleteProgram = useCallback((id: string) => dispatch({ type: 'DELETE_PROGRAM', id }), [dispatch]);
  const setActive    = useCallback((id: string | null) => dispatch({ type: 'SET_ACTIVE_PROGRAM', id }), [dispatch]);
  return { programs: state.programs, activeProgramId: state.activeProgramId, addProgram, deleteProgram, setActive };
}

export function useActiveProgram() {
  const { state } = useStore();
  const program = state.programs.find(p => p.id === state.activeProgramId) ?? null;
  const currentDay = program?.days[state.currentDayIndex % program.days.length] ?? null;
  return { program, currentDay, currentDayIndex: state.currentDayIndex };
}

export function useWorkout() {
  const { state, dispatch } = useStore();
  return {
    activeWorkout: state.activeWorkout,
    startWorkout:   useCallback((w: ActiveWorkout) => dispatch({ type: 'START_WORKOUT', workout: w }), [dispatch]),
    logSet:         useCallback((s: SetLog) => dispatch({ type: 'LOG_SET', set: s }), [dispatch]),
    removeSet:      useCallback((id: string) => dispatch({ type: 'REMOVE_SET', setId: id }), [dispatch]),
    swapExercise:   useCallback((orig: string, rep: string) => dispatch({ type: 'SWAP_EXERCISE', originalId: orig, replacementId: rep }), [dispatch]),
    finishWorkout:  useCallback((log: WorkoutLog) => dispatch({ type: 'FINISH_WORKOUT', log }), [dispatch]),
    cancelWorkout:  useCallback(() => dispatch({ type: 'CANCEL_WORKOUT' }), [dispatch]),
  };
}

export function useLogs() {
  const { state } = useStore();
  return state.workoutLogs;
}

export function useReadiness() {
  const { state, dispatch } = useStore();
  const addCheckin = useCallback((c: ReadinessCheckin) => dispatch({ type: 'ADD_READINESS', checkin: c }), [dispatch]);
  const todayLog = state.readinessLogs.find(r => r.date === new Date().toISOString().slice(0, 10)) ?? null;
  return { readinessLogs: state.readinessLogs, todayLog, addCheckin };
}

export function useCardio() {
  const { state, dispatch } = useStore();
  const addCardio = useCallback((log: CardioLog) => dispatch({ type: 'ADD_CARDIO_LOG', log }), [dispatch]);
  return { cardioLogs: state.cardioLogs, addCardio };
}

export function useWeeklyReview() {
  const { state, dispatch } = useStore();
  const addReview = useCallback((r: WeeklyReview) => dispatch({ type: 'ADD_WEEKLY_REVIEW', review: r }), [dispatch]);
  return { weeklyReviews: state.weeklyReviews, addReview };
}

export function useMesocycle() {
  const { state, dispatch } = useStore();
  const update = useCallback((m: Partial<Mesocycle>) => dispatch({ type: 'UPDATE_MESOCYCLE', mesocycle: m }), [dispatch]);
  return { mesocycle: state.mesocycle, updateMesocycle: update };
}

export function useSettings() {
  const { state, dispatch } = useStore();
  const updateSettings = useCallback(
    (s: Partial<AppState['settings']>) => dispatch({ type: 'UPDATE_SETTINGS', settings: s }),
    [dispatch]
  );
  return { settings: state.settings, updateSettings };
}
