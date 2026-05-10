import { Program } from './types';

function uid() { return Math.random().toString(36).slice(2, 10); }

export const PROGRAM_TEMPLATES: Program[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // 4-Day Upper / Lower  Powerbuilding
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'upper-lower-4day',
    name: '4-Day Upper/Lower Powerbuilding',
    description: 'Heavy strength work on Days 1 & 2, hypertrophy focus on Days 3 & 4. Best for intermediate lifters wanting size and strength simultaneously.',
    daysPerWeek: 4,
    createdAt: new Date().toISOString(),
    days: [
      {
        id: uid(), name: 'Upper A — Strength', dayNumber: 1, type: 'strength',
        exercises: [
          { exerciseId: 'bench',          sets: 4, repsMin: 3, repsMax: 5, rpeTarget: 8, notes: 'Main movement — focus on bar speed', alternatives: ['db-bench','incline-bench','machine-press','smith-bench'] },
          { exerciseId: 'barbell-row',    sets: 4, repsMin: 4, repsMax: 6, rpeTarget: 8, alternatives: ['db-row','cable-row','chest-supported-row','t-bar-row'] },
          { exerciseId: 'incline-db-bench', sets: 3, repsMin: 8, repsMax: 12, rpeTarget: 8, alternatives: ['incline-bench','db-bench','cable-fly'] },
          { exerciseId: 'neutral-pulldown', sets: 3, repsMin: 8, repsMax: 12, rpeTarget: 8, alternatives: ['pull-ups','lat-pulldown','cable-row'] },
          { exerciseId: 'ohp',            sets: 3, repsMin: 6, repsMax: 10, rpeTarget: 7,  alternatives: ['db-ohp','arnold-press','landmine-press'] },
          { exerciseId: 'face-pulls',     sets: 3, repsMin: 15, repsMax: 20 },
          { exerciseId: 'tricep-pushdown',sets: 3, repsMin: 12, repsMax: 15, alternatives: ['rope-pushdown','skull-crusher'] },
          { exerciseId: 'ab-crunch-machine', sets: 3, repsMin: 15, repsMax: 20 },
        ],
      },
      {
        id: uid(), name: 'Lower A — Strength', dayNumber: 2, type: 'strength',
        exercises: [
          { exerciseId: 'squat',    sets: 4, repsMin: 3, repsMax: 5, rpeTarget: 8, notes: 'Brace hard, stay tight', alternatives: ['front-squat','box-squat','hack-squat','smith-squat'] },
          { exerciseId: 'rdl',      sets: 3, repsMin: 6, repsMax: 10, rpeTarget: 8, alternatives: ['stiff-leg-dl','good-morning','leg-curl'] },
          { exerciseId: 'leg-press',sets: 3, repsMin: 10, repsMax: 15, rpeTarget: 8, alternatives: ['hack-squat','goblet-squat'] },
          { exerciseId: 'leg-curl', sets: 3, repsMin: 10, repsMax: 15, alternatives: ['rdl','nordic-curl'] },
          { exerciseId: 'cable-twist', sets: 3, repsMin: 12, repsMax: 15, notes: 'Per side', alternatives: ['russian-twist','ab-crunch-machine'] },
          { exerciseId: 'calf-raise', sets: 4, repsMin: 15, repsMax: 20, alternatives: ['seated-calf-raise'] },
        ],
      },
      {
        id: uid(), name: 'Upper B — Hypertrophy', dayNumber: 3, type: 'hypertrophy',
        exercises: [
          { exerciseId: 'ohp',         sets: 4, repsMin: 6, repsMax: 10, rpeTarget: 8, alternatives: ['db-ohp','arnold-press'] },
          { exerciseId: 'pull-ups',    sets: 4, repsMin: 6, repsMax: 12, rpeTarget: 8, notes: 'Add weight if doing 12+ easily', alternatives: ['chin-ups','lat-pulldown','neutral-pulldown'] },
          { exerciseId: 'db-bench',    sets: 4, repsMin: 10, repsMax: 15, rpeTarget: 8, alternatives: ['incline-db-bench','cable-fly','machine-press'] },
          { exerciseId: 'cable-row',   sets: 3, repsMin: 12, repsMax: 15, rpeTarget: 8, alternatives: ['db-row','chest-supported-row','machine-row'] },
          { exerciseId: 'lateral-raise', sets: 4, repsMin: 15, repsMax: 20, alternatives: ['cable-lateral-raise'] },
          { exerciseId: 'db-curl',     sets: 3, repsMin: 10, repsMax: 15, alternatives: ['barbell-curl','hammer-curl','preacher-curl'] },
          { exerciseId: 'skull-crusher',sets: 3, repsMin: 10, repsMax: 15, alternatives: ['overhead-tricep-ext','tricep-pushdown'] },
          { exerciseId: 'ab-crunch-machine', sets: 3, repsMin: 15, repsMax: 20 },
        ],
      },
      {
        id: uid(), name: 'Lower B — Hypertrophy', dayNumber: 4, type: 'hypertrophy',
        exercises: [
          { exerciseId: 'deadlift',    sets: 4, repsMin: 3, repsMax: 5, rpeTarget: 8, notes: 'Pull the floor apart, keep lats tight', alternatives: ['sumo-deadlift','trap-bar-dl','rack-pull'] },
          { exerciseId: 'bulgarian-split-squat', sets: 3, repsMin: 8, repsMax: 12, rpeTarget: 8, notes: 'Per leg', alternatives: ['walking-lunges','leg-press','goblet-squat'] },
          { exerciseId: 'leg-extension',sets: 3, repsMin: 15, repsMax: 20, alternatives: ['leg-press','hack-squat'] },
          { exerciseId: 'leg-curl',    sets: 3, repsMin: 12, repsMax: 15, alternatives: ['rdl','nordic-curl'] },
          { exerciseId: 'hip-thrust',  sets: 3, repsMin: 10, repsMax: 15, alternatives: ['rdl','leg-curl'] },
          { exerciseId: 'cable-twist', sets: 3, repsMin: 12, repsMax: 15, notes: 'Per side' },
          { exerciseId: 'calf-raise',  sets: 4, repsMin: 15, repsMax: 20 },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 3-Day Full Body Powerbuilding + Optional 4th Day
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'fullbody-3day',
    name: '3-Day Full Body + Optional Day',
    description: 'Each session hits every major muscle group. Day 1 is squat/push anchor, Day 2 is deadlift/pull anchor, Day 3 is volume/pump. Optional Day 4 for extra upper body or weak points.',
    daysPerWeek: 3,
    createdAt: new Date().toISOString(),
    days: [
      {
        id: uid(), name: 'Day 1 — Squat & Push Focus', dayNumber: 1, type: 'fullbody',
        exercises: [
          { exerciseId: 'squat',     sets: 4, repsMin: 3, repsMax: 5, rpeTarget: 8, notes: 'Main strength movement', alternatives: ['front-squat','hack-squat','leg-press','smith-squat'] },
          { exerciseId: 'bench',     sets: 4, repsMin: 4, repsMax: 6, rpeTarget: 8, alternatives: ['db-bench','incline-bench','machine-press','smith-bench'] },
          { exerciseId: 'barbell-row', sets: 4, repsMin: 5, repsMax: 8, rpeTarget: 8, alternatives: ['db-row','cable-row','chest-supported-row'] },
          { exerciseId: 'rdl',       sets: 3, repsMin: 8, repsMax: 12, rpeTarget: 7, alternatives: ['stiff-leg-dl','leg-curl','good-morning'] },
          { exerciseId: 'ohp',       sets: 3, repsMin: 8, repsMax: 12, rpeTarget: 7, alternatives: ['db-ohp','arnold-press'] },
          { exerciseId: 'ab-crunch-machine', sets: 3, repsMin: 15, repsMax: 20, alternatives: ['cable-crunch','weighted-situp'] },
          { exerciseId: 'cable-twist', sets: 3, repsMin: 12, repsMax: 15, notes: 'Per side', alternatives: ['russian-twist'] },
        ],
      },
      {
        id: uid(), name: 'Day 2 — Deadlift & Pull Focus', dayNumber: 2, type: 'fullbody',
        exercises: [
          { exerciseId: 'deadlift',  sets: 4, repsMin: 3, repsMax: 5, rpeTarget: 8, notes: 'Main strength movement', alternatives: ['sumo-deadlift','trap-bar-dl','rack-pull'] },
          { exerciseId: 'incline-bench', sets: 4, repsMin: 6, repsMax: 10, rpeTarget: 8, alternatives: ['incline-db-bench','bench','db-bench','machine-press'] },
          { exerciseId: 'pull-ups',  sets: 4, repsMin: 6, repsMax: 10, rpeTarget: 8, alternatives: ['chin-ups','lat-pulldown','neutral-pulldown'] },
          { exerciseId: 'leg-press', sets: 3, repsMin: 10, repsMax: 15, rpeTarget: 7, alternatives: ['hack-squat','goblet-squat','bulgarian-split-squat'] },
          { exerciseId: 'lateral-raise', sets: 3, repsMin: 15, repsMax: 20, alternatives: ['cable-lateral-raise'] },
          { exerciseId: 'db-curl',   sets: 3, repsMin: 10, repsMax: 15, alternatives: ['barbell-curl','hammer-curl'] },
          { exerciseId: 'tricep-pushdown', sets: 3, repsMin: 10, repsMax: 15, alternatives: ['rope-pushdown','skull-crusher'] },
          { exerciseId: 'ab-crunch-machine', sets: 3, repsMin: 15, repsMax: 20 },
        ],
      },
      {
        id: uid(), name: 'Day 3 — Volume & Pump', dayNumber: 3, type: 'hypertrophy',
        exercises: [
          { exerciseId: 'hack-squat',  sets: 4, repsMin: 10, repsMax: 15, rpeTarget: 8, alternatives: ['leg-press','goblet-squat','bulgarian-split-squat'] },
          { exerciseId: 'incline-db-bench', sets: 4, repsMin: 10, repsMax: 15, rpeTarget: 8, alternatives: ['db-bench','cable-fly','pec-deck'] },
          { exerciseId: 'cable-row',   sets: 4, repsMin: 12, repsMax: 15, rpeTarget: 8, alternatives: ['chest-supported-row','machine-row','db-row'] },
          { exerciseId: 'hip-thrust',  sets: 3, repsMin: 12, repsMax: 15, alternatives: ['rdl','leg-curl'] },
          { exerciseId: 'leg-curl',    sets: 3, repsMin: 12, repsMax: 15, alternatives: ['rdl','nordic-curl'] },
          { exerciseId: 'lateral-raise', sets: 4, repsMin: 15, repsMax: 20 },
          { exerciseId: 'face-pulls',  sets: 3, repsMin: 15, repsMax: 20 },
          { exerciseId: 'cable-twist', sets: 3, repsMin: 12, repsMax: 15, notes: 'Per side' },
          { exerciseId: 'calf-raise',  sets: 4, repsMin: 15, repsMax: 20 },
        ],
      },
      {
        id: uid(), name: 'Day 4 — Optional Upper Pump', dayNumber: 4, type: 'optional',
        exercises: [
          { exerciseId: 'db-bench',    sets: 4, repsMin: 10, repsMax: 15, alternatives: ['cable-fly','pec-deck','incline-db-bench'] },
          { exerciseId: 'lat-pulldown',sets: 4, repsMin: 10, repsMax: 15, alternatives: ['neutral-pulldown','pull-ups','cable-row'] },
          { exerciseId: 'db-ohp',      sets: 3, repsMin: 12, repsMax: 15, alternatives: ['arnold-press','lateral-raise'] },
          { exerciseId: 'lateral-raise', sets: 4, repsMin: 15, repsMax: 20 },
          { exerciseId: 'barbell-curl',sets: 4, repsMin: 10, repsMax: 15, alternatives: ['db-curl','cable-curl','preacher-curl'] },
          { exerciseId: 'skull-crusher',sets: 3, repsMin: 10, repsMax: 15, alternatives: ['overhead-tricep-ext','rope-pushdown'] },
          { exerciseId: 'cable-fly',   sets: 3, repsMin: 12, repsMax: 15, alternatives: ['pec-deck','db-bench'] },
          { exerciseId: 'ab-crunch-machine', sets: 3, repsMin: 15, repsMax: 20 },
          { exerciseId: 'cable-twist', sets: 3, repsMin: 12, repsMax: 15, notes: 'Per side' },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 3-Day Push / Pull / Legs
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'ppl-3day',
    name: '3-Day Push / Pull / Legs',
    description: 'Classic PPL with powerbuilding bias. Bench and Squat/Deadlift as strength anchors, volume work throughout.',
    daysPerWeek: 3,
    createdAt: new Date().toISOString(),
    days: [
      {
        id: uid(), name: 'Push — Chest & Shoulders', dayNumber: 1, type: 'strength',
        exercises: [
          { exerciseId: 'bench',       sets: 4, repsMin: 3, repsMax: 5, rpeTarget: 8, alternatives: ['db-bench','incline-bench','machine-press'] },
          { exerciseId: 'ohp',         sets: 3, repsMin: 6, repsMax: 10, rpeTarget: 8, alternatives: ['db-ohp','arnold-press'] },
          { exerciseId: 'incline-db-bench', sets: 3, repsMin: 10, repsMax: 15, rpeTarget: 8 },
          { exerciseId: 'lateral-raise', sets: 4, repsMin: 15, repsMax: 20 },
          { exerciseId: 'cable-fly',   sets: 3, repsMin: 12, repsMax: 15 },
          { exerciseId: 'tricep-pushdown', sets: 3, repsMin: 12, repsMax: 15 },
          { exerciseId: 'skull-crusher',   sets: 3, repsMin: 10, repsMax: 12 },
          { exerciseId: 'ab-crunch-machine', sets: 3, repsMin: 15, repsMax: 20 },
        ],
      },
      {
        id: uid(), name: 'Pull — Back & Biceps', dayNumber: 2, type: 'strength',
        exercises: [
          { exerciseId: 'deadlift',    sets: 4, repsMin: 3, repsMax: 5, rpeTarget: 8, alternatives: ['sumo-deadlift','trap-bar-dl','rack-pull'] },
          { exerciseId: 'barbell-row', sets: 4, repsMin: 5, repsMax: 8, rpeTarget: 8, alternatives: ['db-row','cable-row','t-bar-row'] },
          { exerciseId: 'pull-ups',    sets: 3, repsMin: 6, repsMax: 12, rpeTarget: 8, alternatives: ['chin-ups','lat-pulldown','neutral-pulldown'] },
          { exerciseId: 'cable-row',   sets: 3, repsMin: 12, repsMax: 15 },
          { exerciseId: 'face-pulls',  sets: 3, repsMin: 15, repsMax: 20 },
          { exerciseId: 'barbell-curl',sets: 3, repsMin: 8, repsMax: 12, alternatives: ['db-curl','cable-curl'] },
          { exerciseId: 'hammer-curl', sets: 3, repsMin: 10, repsMax: 15 },
          { exerciseId: 'cable-twist', sets: 3, repsMin: 12, repsMax: 15, notes: 'Per side' },
        ],
      },
      {
        id: uid(), name: 'Legs — Squat Focus', dayNumber: 3, type: 'strength',
        exercises: [
          { exerciseId: 'squat',       sets: 4, repsMin: 3, repsMax: 5, rpeTarget: 8, alternatives: ['front-squat','hack-squat','leg-press'] },
          { exerciseId: 'rdl',         sets: 3, repsMin: 8, repsMax: 12, rpeTarget: 8 },
          { exerciseId: 'leg-press',   sets: 3, repsMin: 10, repsMax: 15, rpeTarget: 8 },
          { exerciseId: 'bulgarian-split-squat', sets: 3, repsMin: 10, repsMax: 12, notes: 'Per leg' },
          { exerciseId: 'leg-curl',    sets: 3, repsMin: 12, repsMax: 15 },
          { exerciseId: 'leg-extension',sets: 3, repsMin: 15, repsMax: 20 },
          { exerciseId: 'ab-crunch-machine', sets: 3, repsMin: 15, repsMax: 20 },
          { exerciseId: 'cable-twist', sets: 3, repsMin: 12, repsMax: 15, notes: 'Per side' },
          { exerciseId: 'calf-raise',  sets: 4, repsMin: 15, repsMax: 20 },
        ],
      },
    ],
  },
];
