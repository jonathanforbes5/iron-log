import { Exercise } from './types';

export const EXERCISES: Exercise[] = [
  // ── Big 4 ───────────────────────────────────────────────────────────────────
  { id: 'squat',     name: 'Barbell Back Squat',     category: 'compound',  muscleGroups: ['Quads','Glutes','Hamstrings'],          movement: 'squat' },
  { id: 'bench',     name: 'Barbell Bench Press',    category: 'compound',  muscleGroups: ['Chest','Triceps','Front Delt'],          movement: 'push'  },
  { id: 'deadlift',  name: 'Barbell Deadlift',       category: 'compound',  muscleGroups: ['Hamstrings','Glutes','Back','Traps'],    movement: 'hinge' },
  { id: 'ohp',       name: 'Barbell Overhead Press', category: 'compound',  muscleGroups: ['Front Delt','Triceps','Upper Chest'],    movement: 'push'  },

  // ── Squat Variations ────────────────────────────────────────────────────────
  { id: 'front-squat',          name: 'Front Squat',           category: 'compound',  muscleGroups: ['Quads','Upper Back','Core'],    movement: 'squat' },
  { id: 'low-bar-squat',        name: 'Low Bar Squat',         category: 'compound',  muscleGroups: ['Quads','Glutes','Hamstrings'],  movement: 'squat' },
  { id: 'hack-squat',           name: 'Hack Squat',            category: 'accessory', muscleGroups: ['Quads','Glutes'],               movement: 'squat' },
  { id: 'leg-press',            name: 'Leg Press',             category: 'accessory', muscleGroups: ['Quads','Glutes','Hamstrings'],  movement: 'squat' },
  { id: 'bulgarian-split-squat',name: 'Bulgarian Split Squat', category: 'accessory', muscleGroups: ['Quads','Glutes'],               movement: 'squat' },
  { id: 'walking-lunges',       name: 'Walking Lunges',        category: 'accessory', muscleGroups: ['Quads','Glutes','Hamstrings'],  movement: 'squat' },
  { id: 'goblet-squat',         name: 'Goblet Squat',          category: 'accessory', muscleGroups: ['Quads','Glutes','Core'],        movement: 'squat' },
  { id: 'box-squat',            name: 'Box Squat',             category: 'accessory', muscleGroups: ['Quads','Glutes','Hamstrings'],  movement: 'squat' },
  { id: 'smith-squat',          name: 'Smith Machine Squat',   category: 'accessory', muscleGroups: ['Quads','Glutes'],               movement: 'squat' },

  // ── Hinge / Deadlift Variations ─────────────────────────────────────────────
  { id: 'rdl',          name: 'Romanian Deadlift',    category: 'accessory', muscleGroups: ['Hamstrings','Glutes','Lower Back'], movement: 'hinge' },
  { id: 'stiff-leg-dl', name: 'Stiff-Leg Deadlift',  category: 'accessory', muscleGroups: ['Hamstrings','Glutes','Lower Back'], movement: 'hinge' },
  { id: 'sumo-deadlift',name: 'Sumo Deadlift',        category: 'compound',  muscleGroups: ['Glutes','Hamstrings','Quads'],      movement: 'hinge' },
  { id: 'trap-bar-dl',  name: 'Trap Bar Deadlift',    category: 'compound',  muscleGroups: ['Quads','Glutes','Hamstrings'],      movement: 'hinge' },
  { id: 'rack-pull',    name: 'Rack Pull',             category: 'accessory', muscleGroups: ['Upper Back','Traps','Glutes'],     movement: 'hinge' },
  { id: 'good-morning', name: 'Good Morning',          category: 'accessory', muscleGroups: ['Hamstrings','Glutes','Lower Back'],movement: 'hinge' },
  { id: 'hip-thrust',   name: 'Hip Thrust',            category: 'accessory', muscleGroups: ['Glutes','Hamstrings'],             movement: 'hinge' },

  // ── Horizontal Push ──────────────────────────────────────────────────────────
  { id: 'incline-bench',    name: 'Incline Barbell Bench',  category: 'compound',  muscleGroups: ['Upper Chest','Front Delt','Triceps'], movement: 'push' },
  { id: 'decline-bench',    name: 'Decline Bench Press',    category: 'compound',  muscleGroups: ['Lower Chest','Triceps'],               movement: 'push' },
  { id: 'db-bench',         name: 'Dumbbell Bench Press',   category: 'accessory', muscleGroups: ['Chest','Front Delt','Triceps'],        movement: 'push' },
  { id: 'incline-db-bench', name: 'Incline Dumbbell Press', category: 'accessory', muscleGroups: ['Upper Chest','Front Delt'],            movement: 'push' },
  { id: 'close-grip-bench', name: 'Close Grip Bench Press', category: 'accessory', muscleGroups: ['Triceps','Chest'],                     movement: 'push' },
  { id: 'cable-fly',        name: 'Cable Fly',              category: 'isolation', muscleGroups: ['Chest'],                               movement: 'push' },
  { id: 'pec-deck',         name: 'Pec Deck',               category: 'isolation', muscleGroups: ['Chest'],                               movement: 'push' },
  { id: 'floor-press',      name: 'Floor Press',            category: 'accessory', muscleGroups: ['Chest','Triceps'],                     movement: 'push' },
  { id: 'machine-press',    name: 'Machine Chest Press',    category: 'accessory', muscleGroups: ['Chest','Triceps'],                     movement: 'push' },
  { id: 'smith-bench',      name: 'Smith Machine Bench',    category: 'accessory', muscleGroups: ['Chest','Triceps'],                     movement: 'push' },

  // ── Vertical Push ────────────────────────────────────────────────────────────
  { id: 'db-ohp',       name: 'Dumbbell Overhead Press', category: 'accessory', muscleGroups: ['Front Delt','Triceps','Side Delt'], movement: 'push' },
  { id: 'arnold-press', name: 'Arnold Press',            category: 'accessory', muscleGroups: ['Front Delt','Side Delt'],           movement: 'push' },
  { id: 'push-press',   name: 'Push Press',              category: 'compound',  muscleGroups: ['Front Delt','Triceps','Legs'],      movement: 'push' },
  { id: 'landmine-press',name:'Landmine Press',          category: 'accessory', muscleGroups: ['Upper Chest','Front Delt'],         movement: 'push' },

  // ── Horizontal Pull ──────────────────────────────────────────────────────────
  { id: 'barbell-row',        name: 'Barbell Row',           category: 'compound',  muscleGroups: ['Lats','Upper Back','Biceps','Rear Delt'], movement: 'pull' },
  { id: 'pendlay-row',        name: 'Pendlay Row',           category: 'compound',  muscleGroups: ['Lats','Upper Back','Biceps'],             movement: 'pull' },
  { id: 'db-row',             name: 'Dumbbell Row',          category: 'accessory', muscleGroups: ['Lats','Upper Back','Biceps'],             movement: 'pull' },
  { id: 'cable-row',          name: 'Cable Row',             category: 'accessory', muscleGroups: ['Lats','Upper Back','Biceps'],             movement: 'pull' },
  { id: 'chest-supported-row',name: 'Chest Supported Row',  category: 'accessory', muscleGroups: ['Upper Back','Rear Delt','Lats'],          movement: 'pull' },
  { id: 't-bar-row',          name: 'T-Bar Row',             category: 'accessory', muscleGroups: ['Lats','Upper Back'],                      movement: 'pull' },
  { id: 'machine-row',        name: 'Machine Row',           category: 'accessory', muscleGroups: ['Lats','Upper Back'],                      movement: 'pull' },

  // ── Vertical Pull ────────────────────────────────────────────────────────────
  { id: 'pull-ups',         name: 'Pull-Ups',               category: 'compound',  muscleGroups: ['Lats','Biceps','Upper Back'], movement: 'pull' },
  { id: 'chin-ups',         name: 'Chin-Ups',               category: 'compound',  muscleGroups: ['Lats','Biceps'],             movement: 'pull' },
  { id: 'lat-pulldown',     name: 'Lat Pulldown',           category: 'accessory', muscleGroups: ['Lats','Biceps'],             movement: 'pull' },
  { id: 'neutral-pulldown', name: 'Neutral Grip Pulldown',  category: 'accessory', muscleGroups: ['Lats','Biceps'],             movement: 'pull' },
  { id: 'straight-arm-pulldown', name: 'Straight Arm Pulldown', category: 'isolation', muscleGroups: ['Lats'], movement: 'pull' },
  { id: 'weighted-pull-ups',name: 'Weighted Pull-Ups',      category: 'compound',  muscleGroups: ['Lats','Biceps','Upper Back'], movement: 'pull' },

  // ── Biceps ───────────────────────────────────────────────────────────────────
  { id: 'barbell-curl',   name: 'Barbell Curl',         category: 'isolation', muscleGroups: ['Biceps'],              movement: 'isolation' },
  { id: 'db-curl',        name: 'Dumbbell Curl',        category: 'isolation', muscleGroups: ['Biceps'],              movement: 'isolation' },
  { id: 'hammer-curl',    name: 'Hammer Curl',          category: 'isolation', muscleGroups: ['Biceps','Brachialis'], movement: 'isolation' },
  { id: 'preacher-curl',  name: 'Preacher Curl',        category: 'isolation', muscleGroups: ['Biceps'],              movement: 'isolation' },
  { id: 'cable-curl',     name: 'Cable Curl',           category: 'isolation', muscleGroups: ['Biceps'],              movement: 'isolation' },
  { id: 'incline-db-curl',name: 'Incline DB Curl',      category: 'isolation', muscleGroups: ['Biceps'],              movement: 'isolation' },

  // ── Triceps ──────────────────────────────────────────────────────────────────
  { id: 'tricep-pushdown',      name: 'Tricep Pushdown',          category: 'isolation', muscleGroups: ['Triceps'], movement: 'isolation' },
  { id: 'rope-pushdown',        name: 'Rope Pushdown',            category: 'isolation', muscleGroups: ['Triceps'], movement: 'isolation' },
  { id: 'skull-crusher',        name: 'Skull Crusher',            category: 'isolation', muscleGroups: ['Triceps'], movement: 'isolation' },
  { id: 'overhead-tricep-ext',  name: 'Overhead Tricep Extension',category: 'isolation', muscleGroups: ['Triceps'], movement: 'isolation' },
  { id: 'dips',                 name: 'Dips',                     category: 'accessory', muscleGroups: ['Triceps','Chest','Front Delt'], movement: 'push' },
  { id: 'jm-press',             name: 'JM Press',                 category: 'accessory', muscleGroups: ['Triceps'], movement: 'push' },

  // ── Shoulders ────────────────────────────────────────────────────────────────
  { id: 'lateral-raise',       name: 'Lateral Raise',       category: 'isolation', muscleGroups: ['Side Delt'],            movement: 'isolation' },
  { id: 'cable-lateral-raise', name: 'Cable Lateral Raise', category: 'isolation', muscleGroups: ['Side Delt'],            movement: 'isolation' },
  { id: 'rear-delt-fly',       name: 'Rear Delt Fly',       category: 'isolation', muscleGroups: ['Rear Delt'],            movement: 'isolation' },
  { id: 'face-pulls',          name: 'Face Pulls',           category: 'isolation', muscleGroups: ['Rear Delt','Traps'],   movement: 'pull'      },
  { id: 'upright-row',         name: 'Upright Row',          category: 'isolation', muscleGroups: ['Side Delt','Traps'],   movement: 'pull'      },
  { id: 'shrugs',              name: 'Barbell Shrugs',       category: 'isolation', muscleGroups: ['Traps'],               movement: 'isolation' },

  // ── Legs Isolation ───────────────────────────────────────────────────────────
  { id: 'leg-extension',    name: 'Leg Extension',      category: 'isolation', muscleGroups: ['Quads'],      movement: 'isolation' },
  { id: 'leg-curl',         name: 'Leg Curl',           category: 'isolation', muscleGroups: ['Hamstrings'], movement: 'isolation' },
  { id: 'nordic-curl',      name: 'Nordic Curl',        category: 'accessory', muscleGroups: ['Hamstrings'], movement: 'hinge'     },
  { id: 'calf-raise',       name: 'Calf Raise',         category: 'isolation', muscleGroups: ['Calves'],     movement: 'isolation' },
  { id: 'seated-calf-raise',name: 'Seated Calf Raise',  category: 'isolation', muscleGroups: ['Calves'],     movement: 'isolation' },

  // ── Core / Abs ───────────────────────────────────────────────────────────────
  { id: 'ab-crunch-machine', name: 'Ab Crunch Machine',       category: 'isolation', muscleGroups: ['Core','Abs'],          movement: 'isolation' },
  { id: 'cable-twist',       name: 'Cable Twist (Obliques)',  category: 'isolation', muscleGroups: ['Obliques','Core'],     movement: 'isolation' },
  { id: 'cable-crunch',      name: 'Cable Crunch',            category: 'isolation', muscleGroups: ['Abs','Core'],          movement: 'isolation' },
  { id: 'ab-wheel',          name: 'Ab Wheel Rollout',        category: 'isolation', muscleGroups: ['Core','Lats'],         movement: 'carry'     },
  { id: 'plank',             name: 'Plank',                   category: 'isolation', muscleGroups: ['Core'],                movement: 'carry'     },
  { id: 'weighted-situp',    name: 'Weighted Sit-Up',         category: 'isolation', muscleGroups: ['Abs','Core'],          movement: 'isolation' },
  { id: 'hanging-leg-raise', name: 'Hanging Leg Raise',       category: 'isolation', muscleGroups: ['Abs','Hip Flexors'],   movement: 'isolation' },
  { id: 'russian-twist',     name: 'Russian Twist',           category: 'isolation', muscleGroups: ['Obliques','Core'],     movement: 'isolation' },
];

export const exerciseMap = new Map(EXERCISES.map(e => [e.id, e]));

export function getExercise(id: string): Exercise | undefined {
  return exerciseMap.get(id);
}

export function getExerciseName(id: string): string {
  return exerciseMap.get(id)?.name ?? id;
}

// Predefined swap alternatives for each exercise
export const EXERCISE_ALTERNATIVES: Record<string, string[]> = {
  // Main lifts
  'squat':     ['front-squat', 'hack-squat', 'leg-press', 'goblet-squat', 'box-squat', 'smith-squat'],
  'bench':     ['db-bench', 'incline-bench', 'machine-press', 'smith-bench', 'floor-press', 'close-grip-bench'],
  'deadlift':  ['sumo-deadlift', 'trap-bar-dl', 'rdl', 'rack-pull', 'stiff-leg-dl'],
  'ohp':       ['db-ohp', 'arnold-press', 'push-press', 'landmine-press'],

  // Squat variants
  'front-squat': ['squat', 'hack-squat', 'goblet-squat', 'leg-press'],
  'hack-squat':  ['leg-press', 'squat', 'front-squat', 'smith-squat'],
  'leg-press':   ['hack-squat', 'squat', 'goblet-squat', 'bulgarian-split-squat'],
  'bulgarian-split-squat': ['walking-lunges', 'leg-press', 'goblet-squat', 'smith-squat'],
  'walking-lunges': ['bulgarian-split-squat', 'leg-press', 'goblet-squat'],

  // Hinge variants
  'rdl':         ['stiff-leg-dl', 'good-morning', 'leg-curl', 'nordic-curl'],
  'hip-thrust':  ['rdl', 'leg-curl', 'cable-pull-through'],

  // Push
  'incline-bench':    ['incline-db-bench', 'bench', 'db-bench', 'machine-press'],
  'incline-db-bench': ['incline-bench', 'db-bench', 'cable-fly', 'pec-deck'],
  'db-bench':         ['bench', 'incline-db-bench', 'machine-press', 'cable-fly'],
  'db-ohp':           ['ohp', 'arnold-press', 'landmine-press'],

  // Pull
  'barbell-row':         ['db-row', 'cable-row', 'chest-supported-row', 't-bar-row', 'machine-row'],
  'pull-ups':            ['chin-ups', 'lat-pulldown', 'neutral-pulldown', 'weighted-pull-ups'],
  'chin-ups':            ['pull-ups', 'lat-pulldown', 'cable-curl'],
  'lat-pulldown':        ['pull-ups', 'neutral-pulldown', 'straight-arm-pulldown'],
  'neutral-pulldown':    ['lat-pulldown', 'pull-ups', 'cable-row'],
  'cable-row':           ['barbell-row', 'db-row', 'machine-row', 'chest-supported-row'],
  'db-row':              ['barbell-row', 'cable-row', 'machine-row', 't-bar-row'],

  // Isolation
  'lateral-raise':     ['cable-lateral-raise', 'upright-row'],
  'face-pulls':        ['rear-delt-fly', 'cable-lateral-raise'],
  'db-curl':           ['barbell-curl', 'cable-curl', 'hammer-curl', 'preacher-curl'],
  'barbell-curl':      ['db-curl', 'cable-curl', 'preacher-curl', 'incline-db-curl'],
  'hammer-curl':       ['db-curl', 'cable-curl', 'barbell-curl'],
  'tricep-pushdown':   ['rope-pushdown', 'skull-crusher', 'overhead-tricep-ext', 'dips'],
  'skull-crusher':     ['tricep-pushdown', 'overhead-tricep-ext', 'close-grip-bench', 'jm-press'],
  'leg-extension':     ['leg-press', 'hack-squat', 'goblet-squat'],
  'leg-curl':          ['rdl', 'nordic-curl', 'stiff-leg-dl'],
  'calf-raise':        ['seated-calf-raise'],

  // Core
  'ab-crunch-machine': ['cable-crunch', 'weighted-situp', 'hanging-leg-raise'],
  'cable-twist':       ['russian-twist', 'ab-crunch-machine'],
  'cable-crunch':      ['ab-crunch-machine', 'weighted-situp', 'ab-wheel'],
};

// Which muscles each exercise primarily stresses (for readiness warnings)
export const EXERCISE_MUSCLE_KEY: Record<string, string[]> = {
  'squat':     ['quads','glutes','lowerBack'],
  'bench':     ['chest','arms'],
  'deadlift':  ['hamstrings','glutes','lowerBack','back'],
  'ohp':       ['shoulders','arms'],
  'barbell-row': ['back','arms'],
  'rdl':       ['hamstrings','glutes','lowerBack'],
  'pull-ups':  ['back','arms'],
  'incline-bench': ['chest','arms','shoulders'],
  'leg-press': ['quads','glutes'],
  'hip-thrust': ['glutes','hamstrings'],
};
