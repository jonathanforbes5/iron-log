export interface SupplementDef {
  id: string;
  name: string;
  timing: 'morning' | 'breakfast' | 'midday' | 'evening';
  conditional?: boolean; // optional/situational
}

export const TIMING_LABELS: Record<SupplementDef['timing'], string> = {
  morning:   'Morning',
  breakfast: 'Breakfast / Post-Workout',
  midday:    'Midday',
  evening:   'Evening',
};

export const TIMING_EMOJI: Record<SupplementDef['timing'], string> = {
  morning:   '🌅',
  breakfast: '🍳',
  midday:    '☀️',
  evening:   '🌙',
};

export const SUPPLEMENT_STACK: SupplementDef[] = [
  // Morning
  { id: 'creatine',      name: 'Creatine',            timing: 'morning' },
  { id: 'yerba_mate',    name: 'Yerba Mate',           timing: 'morning' },
  { id: 'electrolytes',  name: 'Electrolytes',         timing: 'morning', conditional: true },
  // Breakfast / Post-Workout
  { id: 'protein_shake', name: 'Protein Shake',        timing: 'breakfast' },
  { id: 'mens_multi',    name: "Men's Multi",          timing: 'breakfast' },
  { id: 'omega3',        name: 'Omega-3',              timing: 'breakfast' },
  { id: 'd3_k2',         name: 'D3/K2',               timing: 'breakfast', conditional: true },
  { id: 'collagen',      name: 'Collagen',             timing: 'breakfast' },
  { id: 'saw_palmetto',  name: 'Saw Palmetto',         timing: 'breakfast' },
  // Midday
  { id: 'teas',          name: 'Teas',                 timing: 'midday' },
  { id: 'fiber',         name: 'Fiber Source',         timing: 'midday' },
  // Evening
  { id: 'magnesium',     name: 'Magnesium',            timing: 'evening' },
  { id: 'glucosamine',   name: 'Glucosamine Sulfate',  timing: 'evening' },
];

export const CORE_SUPPLEMENTS = SUPPLEMENT_STACK.filter(s => !s.conditional).map(s => s.id);
export const TOTAL_CORE = CORE_SUPPLEMENTS.length;
