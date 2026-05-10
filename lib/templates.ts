import { Program } from './types';

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export const PROGRAM_TEMPLATES: Program[] = [
  {
    id: 'upper-lower-4day',
    name: '4-Day Upper/Lower Powerbuilding',
    description: 'Heavy strength work on Day 1 & 2, hypertrophy focus on Day 3 & 4. Ideal for intermediate lifters wanting to build size and strength simultaneously.',
    daysPerWeek: 4,
    createdAt: new Date().toISOString(),
    days: [
      {
        id: uid(),
        name: 'Upper A — Strength',
        dayNumber: 1,
        exercises: [
          { exerciseId: 'bench', sets: 4, repsMin: 3, repsMax: 5, rpeTarget: 8, notes: 'Main strength movement — focus on bar speed' },
          { exerciseId: 'barbell-row', sets: 4, repsMin: 4, repsMax: 6, rpeTarget: 8 },
          { exerciseId: 'incline-db-bench', sets: 3, repsMin: 8, repsMax: 12, rpeTarget: 8 },
          { exerciseId: 'neutral-pulldown', sets: 3, repsMin: 8, repsMax: 12, rpeTarget: 8 },
          { exerciseId: 'ohp', sets: 3, repsMin: 6, repsMax: 10, rpeTarget: 7 },
          { exerciseId: 'face-pulls', sets: 3, repsMin: 15, repsMax: 20 },
          { exerciseId: 'tricep-pushdown', sets: 3, repsMin: 12, repsMax: 15 },
        ],
      },
      {
        id: uid(),
        name: 'Lower A — Strength',
        dayNumber: 2,
        exercises: [
          { exerciseId: 'squat', sets: 4, repsMin: 3, repsMax: 5, rpeTarget: 8, notes: 'Main strength movement — brace hard, stay tight' },
          { exerciseId: 'rdl', sets: 3, repsMin: 6, repsMax: 10, rpeTarget: 8 },
          { exerciseId: 'leg-press', sets: 3, repsMin: 10, repsMax: 15, rpeTarget: 8 },
          { exerciseId: 'leg-curl', sets: 3, repsMin: 10, repsMax: 15 },
          { exerciseId: 'calf-raise', sets: 4, repsMin: 15, repsMax: 20 },
        ],
      },
      {
        id: uid(),
        name: 'Upper B — Hypertrophy',
        dayNumber: 3,
        exercises: [
          { exerciseId: 'ohp', sets: 4, repsMin: 6, repsMax: 10, rpeTarget: 8 },
          { exerciseId: 'pull-ups', sets: 4, repsMin: 6, repsMax: 12, rpeTarget: 8, notes: 'Add weight if doing 12+ reps easily' },
          { exerciseId: 'db-bench', sets: 4, repsMin: 10, repsMax: 15, rpeTarget: 8 },
          { exerciseId: 'cable-row', sets: 3, repsMin: 12, repsMax: 15, rpeTarget: 8 },
          { exerciseId: 'lateral-raise', sets: 4, repsMin: 15, repsMax: 20 },
          { exerciseId: 'db-curl', sets: 3, repsMin: 10, repsMax: 15 },
          { exerciseId: 'skull-crusher', sets: 3, repsMin: 10, repsMax: 15 },
        ],
      },
      {
        id: uid(),
        name: 'Lower B — Hypertrophy',
        dayNumber: 4,
        exercises: [
          { exerciseId: 'deadlift', sets: 4, repsMin: 3, repsMax: 5, rpeTarget: 8, notes: 'Pull the floor apart, keep lats tight' },
          { exerciseId: 'bulgarian-split-squat', sets: 3, repsMin: 8, repsMax: 12, rpeTarget: 8, notes: 'Per leg' },
          { exerciseId: 'leg-extension', sets: 3, repsMin: 15, repsMax: 20 },
          { exerciseId: 'leg-curl', sets: 3, repsMin: 12, repsMax: 15 },
          { exerciseId: 'hip-thrust', sets: 3, repsMin: 10, repsMax: 15 },
          { exerciseId: 'calf-raise', sets: 4, repsMin: 15, repsMax: 20 },
        ],
      },
    ],
  },
  {
    id: 'ppl-3day',
    name: '3-Day Push/Pull/Legs',
    description: 'Classic PPL structure with powerbuilding bias. Squat and Deadlift as anchors, upper body strength and size work throughout.',
    daysPerWeek: 3,
    createdAt: new Date().toISOString(),
    days: [
      {
        id: uid(),
        name: 'Push — Chest & Shoulders',
        dayNumber: 1,
        exercises: [
          { exerciseId: 'bench', sets: 4, repsMin: 3, repsMax: 5, rpeTarget: 8 },
          { exerciseId: 'ohp', sets: 3, repsMin: 6, repsMax: 10, rpeTarget: 8 },
          { exerciseId: 'incline-db-bench', sets: 3, repsMin: 10, repsMax: 15, rpeTarget: 8 },
          { exerciseId: 'lateral-raise', sets: 4, repsMin: 15, repsMax: 20 },
          { exerciseId: 'cable-fly', sets: 3, repsMin: 12, repsMax: 15 },
          { exerciseId: 'tricep-pushdown', sets: 3, repsMin: 12, repsMax: 15 },
          { exerciseId: 'skull-crusher', sets: 3, repsMin: 10, repsMax: 12 },
        ],
      },
      {
        id: uid(),
        name: 'Pull — Back & Biceps',
        dayNumber: 2,
        exercises: [
          { exerciseId: 'deadlift', sets: 4, repsMin: 3, repsMax: 5, rpeTarget: 8 },
          { exerciseId: 'barbell-row', sets: 4, repsMin: 5, repsMax: 8, rpeTarget: 8 },
          { exerciseId: 'pull-ups', sets: 3, repsMin: 6, repsMax: 12, rpeTarget: 8 },
          { exerciseId: 'cable-row', sets: 3, repsMin: 12, repsMax: 15 },
          { exerciseId: 'face-pulls', sets: 3, repsMin: 15, repsMax: 20 },
          { exerciseId: 'barbell-curl', sets: 3, repsMin: 8, repsMax: 12 },
          { exerciseId: 'hammer-curl', sets: 3, repsMin: 10, repsMax: 15 },
        ],
      },
      {
        id: uid(),
        name: 'Legs — Squat Focus',
        dayNumber: 3,
        exercises: [
          { exerciseId: 'squat', sets: 4, repsMin: 3, repsMax: 5, rpeTarget: 8 },
          { exerciseId: 'rdl', sets: 3, repsMin: 8, repsMax: 12, rpeTarget: 8 },
          { exerciseId: 'leg-press', sets: 3, repsMin: 10, repsMax: 15, rpeTarget: 8 },
          { exerciseId: 'bulgarian-split-squat', sets: 3, repsMin: 10, repsMax: 12, notes: 'Per leg' },
          { exerciseId: 'leg-curl', sets: 3, repsMin: 12, repsMax: 15 },
          { exerciseId: 'leg-extension', sets: 3, repsMin: 15, repsMax: 20 },
          { exerciseId: 'calf-raise', sets: 4, repsMin: 15, repsMax: 20 },
        ],
      },
    ],
  },
];
