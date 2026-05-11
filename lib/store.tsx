'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import {
  AppState, AppAction, Program, WorkoutLog, SetLog,
  ActiveWorkout, UserProfile, ReadinessCheckin, CardioLog, WeeklyReview, Mesocycle, AIAction, DailySupplementLog, WeightLog,
  ProgressPhoto, BodyMeasurement,
} from './types';
import { applyAIAction } from './aiActions';
import { todayISO } from './utils';

const STORAGE_KEY = 'ironlog_v2';

const DEFAULT_MESOCYCLE: Mesocycle = {
  startDate: todayISO(),
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
  supplementLogs: [],
  weightLogs: [],
  pendingAIActions: [],
  restDays: [],
  dailyNotes: {},
  hydrationLogs: {},
  progressPhotos: [],
  bodyMeasurements: [],
  updatedAt: '',
};

function withTimestamp(state: AppState): AppState {
  return { ...state, updatedAt: new Date().toISOString() };
}

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'LOAD_STATE':
      return { ...defaultState, ...action.state };

    case 'ADD_PROGRAM':
      return withTimestamp({ ...state, programs: [...state.programs, action.program] });

    case 'DELETE_PROGRAM': {
      const programs = state.programs.filter(p => p.id !== action.id);
      const activeProgramId = state.activeProgramId === action.id ? null : state.activeProgramId;
      return withTimestamp({ ...state, programs, activeProgramId });
    }

    case 'SET_ACTIVE_PROGRAM':
      return withTimestamp({ ...state, activeProgramId: action.id, currentDayIndex: 0 });

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
      return withTimestamp({
        ...state,
        activeWorkout: null,
        currentDayIndex: nextDayIndex,
        workoutLogs: [action.log, ...state.workoutLogs],
      });
    }

    case 'CANCEL_WORKOUT':
      return { ...state, activeWorkout: null };

    case 'ADVANCE_DAY': {
      const program = state.activeProgramId
        ? state.programs.find(p => p.id === state.activeProgramId)
        : null;
      if (!program) return state;
      return withTimestamp({ ...state, currentDayIndex: (state.currentDayIndex + 1) % program.days.length });
    }

    case 'UPDATE_SETTINGS':
      return withTimestamp({ ...state, settings: { ...state.settings, ...action.settings } });

    case 'SET_PROFILE':
      return withTimestamp({ ...state, userProfile: action.profile });

    case 'UPDATE_PROFILE':
      if (!state.userProfile) return state;
      return withTimestamp({ ...state, userProfile: { ...state.userProfile, ...action.updates } });

    case 'UPDATE_MESOCYCLE':
      return withTimestamp({ ...state, mesocycle: { ...state.mesocycle, ...action.mesocycle } });

    case 'ADD_READINESS':
      return withTimestamp({
        ...state,
        readinessLogs: [
          action.checkin,
          ...state.readinessLogs.filter(r => r.date !== action.checkin.date),
        ],
      });

    case 'ADD_CARDIO_LOG':
      return withTimestamp({ ...state, cardioLogs: [action.log, ...state.cardioLogs] });

    case 'ADD_WEEKLY_REVIEW':
      return withTimestamp({
        ...state,
        weeklyReviews: [
          action.review,
          ...state.weeklyReviews.filter(r => r.weekNumber !== action.review.weekNumber),
        ],
      });

    case 'TOGGLE_SUPPLEMENT': {
      const existing = state.supplementLogs.find(l => l.date === action.date);
      const taken = existing?.taken ?? [];
      const newTaken = taken.includes(action.supplementId)
        ? taken.filter(id => id !== action.supplementId)
        : [...taken, action.supplementId];
      return withTimestamp({
        ...state,
        supplementLogs: [
          { date: action.date, taken: newTaken },
          ...(state.supplementLogs ?? []).filter(l => l.date !== action.date),
        ],
      });
    }

    case 'UPDATE_SET':
      if (!state.activeWorkout) return state;
      return {
        ...state,
        activeWorkout: {
          ...state.activeWorkout,
          sets: state.activeWorkout.sets.map(s => s.id === action.set.id ? action.set : s),
        },
      };

    case 'SET_EXERCISE_NOTE':
      if (!state.activeWorkout) return state;
      return {
        ...state,
        activeWorkout: {
          ...state.activeWorkout,
          exerciseNotes: {
            ...state.activeWorkout.exerciseNotes,
            [action.exerciseId]: action.note,
          },
        },
      };

    case 'LOG_WEIGHT':
      return withTimestamp({
        ...state,
        weightLogs: [
          action.log,
          ...(state.weightLogs ?? []).filter(l => l.date !== action.log.date),
        ],
      });

    case 'ADD_AI_ACTIONS': {
      // Auto-apply actions with autoApply=true immediately
      let nextState = state;
      const pending: AIAction[] = [];

      for (const a of action.actions) {
        if (a.autoApply) {
          const updates = applyAIAction(nextState, a);
          nextState = { ...nextState, ...updates };
        } else {
          pending.push(a);
        }
      }

      return withTimestamp({
        ...nextState,
        pendingAIActions: [...nextState.pendingAIActions, ...pending],
      });
    }

    case 'APPLY_AI_ACTION': {
      const target = state.pendingAIActions.find(a => a.id === action.actionId);
      if (!target) return state;
      const updates = applyAIAction(state, target);
      return withTimestamp({
        ...state,
        ...updates,
        pendingAIActions: state.pendingAIActions.filter(a => a.id !== action.actionId),
      });
    }

    case 'DISMISS_AI_ACTION':
      return withTimestamp({
        ...state,
        pendingAIActions: state.pendingAIActions.filter(a => a.id !== action.actionId),
      });

    case 'TOGGLE_SKIP_EXERCISE': {
      if (!state.activeWorkout) return state;
      const already = (state.activeWorkout.skippedExercises ?? []).includes(action.exerciseId);
      return {
        ...state,
        activeWorkout: {
          ...state.activeWorkout,
          skippedExercises: already
            ? (state.activeWorkout.skippedExercises ?? []).filter(id => id !== action.exerciseId)
            : [...(state.activeWorkout.skippedExercises ?? []), action.exerciseId],
        },
      };
    }

    case 'MARK_REST_DAY': {
      const already = (state.restDays ?? []).includes(action.date);
      return withTimestamp({
        ...state,
        restDays: already
          ? (state.restDays ?? []).filter(d => d !== action.date)
          : [...(state.restDays ?? []), action.date],
      });
    }

    case 'SET_DAILY_NOTE':
      return withTimestamp({
        ...state,
        dailyNotes: { ...(state.dailyNotes ?? {}), [action.date]: action.note },
      });

    case 'LOG_HYDRATION':
      return withTimestamp({
        ...state,
        hydrationLogs: { ...(state.hydrationLogs ?? {}), [action.date]: action.count },
      });

    case 'ADD_PROGRESS_PHOTO':
      return withTimestamp({
        ...state,
        progressPhotos: [action.photo, ...(state.progressPhotos ?? [])],
      });

    case 'DELETE_PROGRESS_PHOTO':
      return withTimestamp({
        ...state,
        progressPhotos: (state.progressPhotos ?? []).filter(p => p.id !== action.id),
      });

    case 'ADD_BODY_MEASUREMENT':
      return withTimestamp({
        ...state,
        bodyMeasurements: [
          action.measurement,
          ...(state.bodyMeasurements ?? []).filter(m => m.date !== action.measurement.date),
        ],
      });

    case 'DELETE_BODY_MEASUREMENT':
      return withTimestamp({
        ...state,
        bodyMeasurements: (state.bodyMeasurements ?? []).filter(m => m.id !== action.id),
      });

    default:
      return state;
  }
}

interface StoreContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  syncing: boolean;
  syncError: boolean;
  hydrated: boolean;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, defaultState);
  const initialized = useRef(false);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [syncing, setSyncing] = React.useState(false);
  const [syncError, setSyncError] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);

  // Mount: load localStorage synchronously, then reconcile with KV
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    let localState: AppState | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) localState = { ...defaultState, ...JSON.parse(raw) as AppState };
    } catch { /* ignore */ }

    if (localState) {
      // Existing device: show immediately from localStorage, KV reconciles in background
      dispatch({ type: 'LOAD_STATE', state: localState });
      setHydrated(true);
    }
    // New device (no localStorage): wait for KV before marking hydrated so the
    // OnboardingGate doesn't fire before real profile data arrives

    async function fetchKV() {
      try {
        setSyncing(true);
        const res = await fetch('/api/sync');
        const { state: kvState } = await res.json() as { state: AppState | null };
        if (kvState) {
          const localNewer = localState && localState.updatedAt > (kvState.updatedAt ?? '');
          const merged = localNewer ? localState! : { ...defaultState, ...kvState };
          dispatch({ type: 'LOAD_STATE', state: merged });
        }
        setSyncError(false);
      } catch {
        setSyncError(true);
      } finally {
        setSyncing(false);
        if (!localState) setHydrated(true); // new device: unblock gate after KV attempt
      }
    }

    fetchKV();
  }, []);

  // On state change: save to localStorage + debounced push to KV
  useEffect(() => {
    if (!initialized.current || !state.updatedAt) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }

    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => {
      try {
        setSyncing(true);
        await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state }),
        });
        setSyncError(false);
      } catch {
        setSyncError(true);
      } finally {
        setSyncing(false);
      }
    }, 2000);
  }, [state]);

  return (
    <StoreContext.Provider value={{ state, dispatch, syncing, syncError, hydrated }}>
      {children}
    </StoreContext.Provider>
  );
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
  const updateProfile = useCallback((updates: Partial<UserProfile>) => dispatch({ type: 'UPDATE_PROFILE', updates }), [dispatch]);
  return { profile: state.userProfile, setProfile, updateProfile };
}

export function usePrograms() {
  const { state, dispatch } = useStore();
  const addProgram    = useCallback((program: Program) => dispatch({ type: 'ADD_PROGRAM', program }), [dispatch]);
  const deleteProgram = useCallback((id: string) => dispatch({ type: 'DELETE_PROGRAM', id }), [dispatch]);
  const setActive     = useCallback((id: string | null) => dispatch({ type: 'SET_ACTIVE_PROGRAM', id }), [dispatch]);
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
    startWorkout:  useCallback((w: ActiveWorkout) => dispatch({ type: 'START_WORKOUT', workout: w }), [dispatch]),
    logSet:        useCallback((s: SetLog) => dispatch({ type: 'LOG_SET', set: s }), [dispatch]),
    removeSet:     useCallback((id: string) => dispatch({ type: 'REMOVE_SET', setId: id }), [dispatch]),
    updateSet:        useCallback((s: SetLog) => dispatch({ type: 'UPDATE_SET', set: s }), [dispatch]),
    setExerciseNote:  useCallback((exerciseId: string, note: string) => dispatch({ type: 'SET_EXERCISE_NOTE', exerciseId, note }), [dispatch]),
    swapExercise:       useCallback((orig: string, rep: string) => dispatch({ type: 'SWAP_EXERCISE', originalId: orig, replacementId: rep }), [dispatch]),
    toggleSkipExercise: useCallback((id: string) => dispatch({ type: 'TOGGLE_SKIP_EXERCISE', exerciseId: id }), [dispatch]),
    finishWorkout: useCallback((log: WorkoutLog) => dispatch({ type: 'FINISH_WORKOUT', log }), [dispatch]),
    cancelWorkout: useCallback(() => dispatch({ type: 'CANCEL_WORKOUT' }), [dispatch]),
  };
}

export function useLogs() {
  const { state } = useStore();
  return state.workoutLogs;
}

export function useReadiness() {
  const { state, dispatch } = useStore();
  const addCheckin = useCallback((c: ReadinessCheckin) => dispatch({ type: 'ADD_READINESS', checkin: c }), [dispatch]);
  const todayLog = state.readinessLogs.find(r => r.date === todayISO()) ?? null;
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
    [dispatch],
  );
  return { settings: state.settings, updateSettings };
}

export function useAICoach() {
  const { state, dispatch } = useStore();
  const addActions  = useCallback((actions: AIAction[]) => dispatch({ type: 'ADD_AI_ACTIONS', actions }), [dispatch]);
  const applyAction = useCallback((id: string) => dispatch({ type: 'APPLY_AI_ACTION', actionId: id }), [dispatch]);
  const dismiss     = useCallback((id: string) => dispatch({ type: 'DISMISS_AI_ACTION', actionId: id }), [dispatch]);
  return {
    pendingAIActions: state.pendingAIActions,
    addActions, applyAction, dismiss,
  };
}

export function useSync() {
  const { syncing, syncError } = useStore();
  return { syncing, syncError };
}

export function useSupplements() {
  const { state, dispatch } = useStore();
  const toggle = useCallback(
    (date: string, supplementId: string) => dispatch({ type: 'TOGGLE_SUPPLEMENT', date, supplementId }),
    [dispatch],
  );
  return { supplementLogs: state.supplementLogs ?? [], toggle };
}

export function useHydrated() {
  return useStore().hydrated;
}

export function useWeightLog() {
  const { state, dispatch } = useStore();
  const logWeight = useCallback(
    (log: WeightLog) => dispatch({ type: 'LOG_WEIGHT', log }),
    [dispatch],
  );
  const todayWeight = (state.weightLogs ?? []).find(l => l.date === todayISO())?.weight ?? null;
  return { weightLogs: state.weightLogs ?? [], todayWeight, logWeight };
}

export function useHydration() {
  const { state, dispatch } = useStore();
  const logHydration = useCallback(
    (date: string, count: number) => dispatch({ type: 'LOG_HYDRATION', date, count }),
    [dispatch],
  );
  return { hydrationLogs: state.hydrationLogs ?? {}, logHydration };
}

export function useProgressPhotos() {
  const { state, dispatch } = useStore();
  const addPhoto    = useCallback((photo: ProgressPhoto) => dispatch({ type: 'ADD_PROGRESS_PHOTO', photo }), [dispatch]);
  const deletePhoto = useCallback((id: string) => dispatch({ type: 'DELETE_PROGRESS_PHOTO', id }), [dispatch]);
  return { progressPhotos: state.progressPhotos ?? [], addPhoto, deletePhoto };
}

export function useBodyMeasurements() {
  const { state, dispatch } = useStore();
  const addMeasurement    = useCallback((m: BodyMeasurement) => dispatch({ type: 'ADD_BODY_MEASUREMENT', measurement: m }), [dispatch]);
  const deleteMeasurement = useCallback((id: string) => dispatch({ type: 'DELETE_BODY_MEASUREMENT', id }), [dispatch]);
  return { bodyMeasurements: state.bodyMeasurements ?? [], addMeasurement, deleteMeasurement };
}

export function useRestDays() {
  const { state, dispatch } = useStore();
  const toggle = useCallback((date: string) => dispatch({ type: 'MARK_REST_DAY', date }), [dispatch]);
  return { restDays: state.restDays ?? [], toggle };
}

export function useDailyNotes() {
  const { state, dispatch } = useStore();
  const setNote = useCallback(
    (date: string, note: string) => dispatch({ type: 'SET_DAILY_NOTE', date, note }),
    [dispatch],
  );
  return { dailyNotes: state.dailyNotes ?? {}, setNote };
}
