import { Exercise } from './types';

export const EXERCISES: Exercise[] = [
  // ── Powerlifting Big 3 ──────────────────────────────────────────────────────
  { id: 'squat', name: 'Barbell Back Squat', category: 'compound', muscleGroups: ['Quads', 'Glutes', 'Hamstrings'], movement: 'squat' },
  { id: 'bench', name: 'Barbell Bench Press', category: 'compound', muscleGroups: ['Chest', 'Triceps', 'Front Delt'], movement: 'push' },
  { id: 'deadlift', name: 'Barbell Deadlift', category: 'compound', muscleGroups: ['Hamstrings', 'Glutes', 'Back', 'Traps'], movement: 'hinge' },
  { id: 'ohp', name: 'Barbell Overhead Press', category: 'compound', muscleGroups: ['Front Delt', 'Triceps', 'Upper Chest'], movement: 'push' },

  // ── Squat Variations ────────────────────────────────────────────────────────
  { id: 'front-squat', name: 'Front Squat', category: 'compound', muscleGroups: ['Quads', 'Upper Back', 'Core'], movement: 'squat' },
  { id: 'low-bar-squat', name: 'Low Bar Squat', category: 'compound', muscleGroups: ['Quads', 'Glutes', 'Hamstrings'], movement: 'squat' },
  { id: 'hack-squat', name: 'Hack Squat', category: 'accessory', muscleGroups: ['Quads', 'Glutes'], movement: 'squat' },
  { id: 'leg-press', name: 'Leg Press', category: 'accessory', muscleGroups: ['Quads', 'Glutes', 'Hamstrings'], movement: 'squat' },
  { id: 'bulgarian-split-squat', name: 'Bulgarian Split Squat', category: 'accessory', muscleGroups: ['Quads', 'Glutes'], movement: 'squat' },
  { id: 'walking-lunges', name: 'Walking Lunges', category: 'accessory', muscleGroups: ['Quads', 'Glutes', 'Hamstrings'], movement: 'squat' },
  { id: 'goblet-squat', name: 'Goblet Squat', category: 'accessory', muscleGroups: ['Quads', 'Glutes', 'Core'], movement: 'squat' },
  { id: 'box-squat', name: 'Box Squat', category: 'accessory', muscleGroups: ['Quads', 'Glutes', 'Hamstrings'], movement: 'squat' },

  // ── Hinge / Deadlift Variations ─────────────────────────────────────────────
  { id: 'rdl', name: 'Romanian Deadlift', category: 'accessory', muscleGroups: ['Hamstrings', 'Glutes', 'Lower Back'], movement: 'hinge' },
  { id: 'stiff-leg-dl', name: 'Stiff-Leg Deadlift', category: 'accessory', muscleGroups: ['Hamstrings', 'Glutes', 'Lower Back'], movement: 'hinge' },
  { id: 'sumo-deadlift', name: 'Sumo Deadlift', category: 'compound', muscleGroups: ['Glutes', 'Hamstrings', 'Quads', 'Inner Thigh'], movement: 'hinge' },
  { id: 'trap-bar-dl', name: 'Trap Bar Deadlift', category: 'compound', muscleGroups: ['Quads', 'Glutes', 'Hamstrings', 'Back'], movement: 'hinge' },
  { id: 'rack-pull', name: 'Rack Pull', category: 'accessory', muscleGroups: ['Upper Back', 'Traps', 'Glutes'], movement: 'hinge' },
  { id: 'good-morning', name: 'Good Morning', category: 'accessory', muscleGroups: ['Hamstrings', 'Glutes', 'Lower Back'], movement: 'hinge' },
  { id: 'hip-thrust', name: 'Hip Thrust', category: 'accessory', muscleGroups: ['Glutes', 'Hamstrings'], movement: 'hinge' },

  // ── Horizontal Push ──────────────────────────────────────────────────────────
  { id: 'incline-bench', name: 'Incline Barbell Bench Press', category: 'compound', muscleGroups: ['Upper Chest', 'Front Delt', 'Triceps'], movement: 'push' },
  { id: 'decline-bench', name: 'Decline Bench Press', category: 'compound', muscleGroups: ['Lower Chest', 'Triceps'], movement: 'push' },
  { id: 'db-bench', name: 'Dumbbell Bench Press', category: 'accessory', muscleGroups: ['Chest', 'Front Delt', 'Triceps'], movement: 'push' },
  { id: 'incline-db-bench', name: 'Incline Dumbbell Press', category: 'accessory', muscleGroups: ['Upper Chest', 'Front Delt'], movement: 'push' },
  { id: 'close-grip-bench', name: 'Close Grip Bench Press', category: 'accessory', muscleGroups: ['Triceps', 'Chest'], movement: 'push' },
  { id: 'cable-fly', name: 'Cable Fly', category: 'isolation', muscleGroups: ['Chest'], movement: 'push' },
  { id: 'pec-deck', name: 'Pec Deck', category: 'isolation', muscleGroups: ['Chest'], movement: 'push' },
  { id: 'floor-press', name: 'Floor Press', category: 'accessory', muscleGroups: ['Chest', 'Triceps'], movement: 'push' },

  // ── Vertical Push ────────────────────────────────────────────────────────────
  { id: 'db-ohp', name: 'Dumbbell Overhead Press', category: 'accessory', muscleGroups: ['Front Delt', 'Triceps', 'Side Delt'], movement: 'push' },
  { id: 'arnold-press', name: 'Arnold Press', category: 'accessory', muscleGroups: ['Front Delt', 'Side Delt'], movement: 'push' },
  { id: 'push-press', name: 'Push Press', category: 'compound', muscleGroups: ['Front Delt', 'Triceps', 'Legs'], movement: 'push' },
  { id: 'landmine-press', name: 'Landmine Press', category: 'accessory', muscleGroups: ['Upper Chest', 'Front Delt'], movement: 'push' },

  // ── Horizontal Pull ──────────────────────────────────────────────────────────
  { id: 'barbell-row', name: 'Barbell Row', category: 'compound', muscleGroups: ['Lats', 'Upper Back', 'Biceps', 'Rear Delt'], movement: 'pull' },
  { id: 'pendlay-row', name: 'Pendlay Row', category: 'compound', muscleGroups: ['Lats', 'Upper Back', 'Biceps'], movement: 'pull' },
  { id: 'db-row', name: 'Dumbbell Row', category: 'accessory', muscleGroups: ['Lats', 'Upper Back', 'Biceps'], movement: 'pull' },
  { id: 'cable-row', name: 'Cable Row', category: 'accessory', muscleGroups: ['Lats', 'Upper Back', 'Biceps'], movement: 'pull' },
  { id: 'chest-supported-row', name: 'Chest Supported Row', category: 'accessory', muscleGroups: ['Upper Back', 'Rear Delt', 'Lats'], movement: 'pull' },
  { id: 't-bar-row', name: 'T-Bar Row', category: 'accessory', muscleGroups: ['Lats', 'Upper Back'], movement: 'pull' },
  { id: 'machine-row', name: 'Machine Row', category: 'accessory', muscleGroups: ['Lats', 'Upper Back'], movement: 'pull' },

  // ── Vertical Pull ────────────────────────────────────────────────────────────
  { id: 'pull-ups', name: 'Pull-Ups', category: 'compound', muscleGroups: ['Lats', 'Biceps', 'Upper Back'], movement: 'pull' },
  { id: 'chin-ups', name: 'Chin-Ups', category: 'compound', muscleGroups: ['Lats', 'Biceps'], movement: 'pull' },
  { id: 'lat-pulldown', name: 'Lat Pulldown', category: 'accessory', muscleGroups: ['Lats', 'Biceps'], movement: 'pull' },
  { id: 'neutral-pulldown', name: 'Neutral Grip Pulldown', category: 'accessory', muscleGroups: ['Lats', 'Biceps'], movement: 'pull' },
  { id: 'straight-arm-pulldown', name: 'Straight Arm Pulldown', category: 'isolation', muscleGroups: ['Lats'], movement: 'pull' },
  { id: 'weighted-pull-ups', name: 'Weighted Pull-Ups', category: 'compound', muscleGroups: ['Lats', 'Biceps', 'Upper Back'], movement: 'pull' },

  // ── Arms ─────────────────────────────────────────────────────────────────────
  { id: 'barbell-curl', name: 'Barbell Curl', category: 'isolation', muscleGroups: ['Biceps'], movement: 'isolation' },
  { id: 'db-curl', name: 'Dumbbell Curl', category: 'isolation', muscleGroups: ['Biceps'], movement: 'isolation' },
  { id: 'hammer-curl', name: 'Hammer Curl', category: 'isolation', muscleGroups: ['Biceps', 'Brachialis'], movement: 'isolation' },
  { id: 'preacher-curl', name: 'Preacher Curl', category: 'isolation', muscleGroups: ['Biceps'], movement: 'isolation' },
  { id: 'cable-curl', name: 'Cable Curl', category: 'isolation', muscleGroups: ['Biceps'], movement: 'isolation' },
  { id: 'incline-db-curl', name: 'Incline Dumbbell Curl', category: 'isolation', muscleGroups: ['Biceps'], movement: 'isolation' },
  { id: 'tricep-pushdown', name: 'Tricep Pushdown', category: 'isolation', muscleGroups: ['Triceps'], movement: 'isolation' },
  { id: 'rope-pushdown', name: 'Rope Pushdown', category: 'isolation', muscleGroups: ['Triceps'], movement: 'isolation' },
  { id: 'skull-crusher', name: 'Skull Crusher', category: 'isolation', muscleGroups: ['Triceps'], movement: 'isolation' },
  { id: 'jm-press', name: 'JM Press', category: 'accessory', muscleGroups: ['Triceps'], movement: 'push' },
  { id: 'overhead-tricep-ext', name: 'Overhead Tricep Extension', category: 'isolation', muscleGroups: ['Triceps'], movement: 'isolation' },
  { id: 'dips', name: 'Dips', category: 'accessory', muscleGroups: ['Triceps', 'Chest', 'Front Delt'], movement: 'push' },

  // ── Shoulders ────────────────────────────────────────────────────────────────
  { id: 'lateral-raise', name: 'Lateral Raise', category: 'isolation', muscleGroups: ['Side Delt'], movement: 'isolation' },
  { id: 'cable-lateral-raise', name: 'Cable Lateral Raise', category: 'isolation', muscleGroups: ['Side Delt'], movement: 'isolation' },
  { id: 'rear-delt-fly', name: 'Rear Delt Fly', category: 'isolation', muscleGroups: ['Rear Delt'], movement: 'isolation' },
  { id: 'face-pulls', name: 'Face Pulls', category: 'isolation', muscleGroups: ['Rear Delt', 'Rotator Cuff', 'Traps'], movement: 'pull' },
  { id: 'upright-row', name: 'Upright Row', category: 'isolation', muscleGroups: ['Side Delt', 'Traps'], movement: 'pull' },
  { id: 'shrugs', name: 'Barbell Shrugs', category: 'isolation', muscleGroups: ['Traps'], movement: 'isolation' },

  // ── Legs Isolation ───────────────────────────────────────────────────────────
  { id: 'leg-extension', name: 'Leg Extension', category: 'isolation', muscleGroups: ['Quads'], movement: 'isolation' },
  { id: 'leg-curl', name: 'Leg Curl', category: 'isolation', muscleGroups: ['Hamstrings'], movement: 'isolation' },
  { id: 'nordic-curl', name: 'Nordic Curl', category: 'accessory', muscleGroups: ['Hamstrings'], movement: 'hinge' },
  { id: 'calf-raise', name: 'Calf Raise', category: 'isolation', muscleGroups: ['Calves'], movement: 'isolation' },
  { id: 'seated-calf-raise', name: 'Seated Calf Raise', category: 'isolation', muscleGroups: ['Calves'], movement: 'isolation' },

  // ── Core ─────────────────────────────────────────────────────────────────────
  { id: 'plank', name: 'Plank', category: 'isolation', muscleGroups: ['Core'], movement: 'carry' },
  { id: 'ab-wheel', name: 'Ab Wheel Rollout', category: 'isolation', muscleGroups: ['Core', 'Lats'], movement: 'carry' },
  { id: 'cable-crunch', name: 'Cable Crunch', category: 'isolation', muscleGroups: ['Core'], movement: 'isolation' },
  { id: 'weighted-situp', name: 'Weighted Sit-Up', category: 'isolation', muscleGroups: ['Core'], movement: 'isolation' },
];

export const exerciseMap = new Map(EXERCISES.map(e => [e.id, e]));

export function getExercise(id: string): Exercise | undefined {
  return exerciseMap.get(id);
}

export function getExerciseName(id: string): string {
  return exerciseMap.get(id)?.name ?? id;
}
