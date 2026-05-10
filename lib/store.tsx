'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { AppState, AppAction, Program, WorkoutLog, SetLog, ActiveWorkout } from './types';

const STORAGE_KEY = 'wt_state_v1';

const defaultState: AppState = {
  programs: [],
  activeProgramId: null,
  currentDayIndex: 0,
  workoutLogs: [],
  activeWorkout: null,
  settings: {
    weightUnit: 'lbs',
    defaultRestSeconds: 180,
  },
};

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'LOAD_STATE':
      return action.state;

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
        activeWorkout: {
          ...state.activeWorkout,
          sets: [...state.activeWorkout.sets, action.set],
        },
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

  // Load from localStorage on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AppState;
        dispatch({ type: 'LOAD_STATE', state: { ...defaultState, ...parsed } });
      }
    } catch {
      // ignore corrupt state
    }
  }, []);

  // Persist to localStorage on every state change
  useEffect(() => {
    if (!initialized.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore storage errors
    }
  }, [state]);

  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

// Convenience hooks
export function usePrograms() {
  const { state, dispatch } = useStore();
  const addProgram = useCallback((program: Program) => dispatch({ type: 'ADD_PROGRAM', program }), [dispatch]);
  const deleteProgram = useCallback((id: string) => dispatch({ type: 'DELETE_PROGRAM', id }), [dispatch]);
  const setActive = useCallback((id: string | null) => dispatch({ type: 'SET_ACTIVE_PROGRAM', id }), [dispatch]);
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
  const startWorkout = useCallback((workout: ActiveWorkout) => dispatch({ type: 'START_WORKOUT', workout }), [dispatch]);
  const logSet = useCallback((set: SetLog) => dispatch({ type: 'LOG_SET', set }), [dispatch]);
  const removeSet = useCallback((setId: string) => dispatch({ type: 'REMOVE_SET', setId }), [dispatch]);
  const finishWorkout = useCallback((log: WorkoutLog) => dispatch({ type: 'FINISH_WORKOUT', log }), [dispatch]);
  const cancelWorkout = useCallback(() => dispatch({ type: 'CANCEL_WORKOUT' }), [dispatch]);
  return {
    activeWorkout: state.activeWorkout,
    startWorkout,
    logSet,
    removeSet,
    finishWorkout,
    cancelWorkout,
  };
}

export function useLogs() {
  const { state } = useStore();
  return state.workoutLogs;
}

export function useSettings() {
  const { state, dispatch } = useStore();
  const updateSettings = useCallback(
    (settings: Partial<AppState['settings']>) => dispatch({ type: 'UPDATE_SETTINGS', settings }),
    [dispatch]
  );
  return { settings: state.settings, updateSettings };
}
