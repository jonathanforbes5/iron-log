'use client';

import { useState } from 'react';
import { usePrograms, useActiveProgram } from '@/lib/store';
import { PROGRAM_TEMPLATES } from '@/lib/templates';
import { Program, ProgramDay, ProgramExercise } from '@/lib/types';
import { EXERCISES, getExerciseName } from '@/lib/exercises';
import { uid } from '@/lib/utils';
import { Check, ChevronDown, ChevronUp, Plus, Trash2, Star, Copy, Info } from 'lucide-react';

export default function ProgramPage() {
  const { programs, activeProgramId, addProgram, deleteProgram, setActive } = usePrograms();
  const { currentDay, currentDayIndex } = useActiveProgram();
  const [view, setView] = useState<'list' | 'new' | 'detail'>('list');
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  function handleUseTemplate(template: Program) {
    const copy: Program = {
      ...template,
      id: uid(),
      createdAt: new Date().toISOString(),
      days: template.days.map(d => ({ ...d, id: uid() })),
    };
    addProgram(copy);
    setActive(copy.id);
  }

  function handleDelete(id: string) {
    if (confirm('Delete this program?')) deleteProgram(id);
  }

  if (view === 'detail' && selectedProgram) {
    return <ProgramDetail
      program={selectedProgram}
      isActive={selectedProgram.id === activeProgramId}
      currentDayIndex={currentDayIndex}
      onSetActive={() => { setActive(selectedProgram.id); setView('list'); }}
      onBack={() => setView('list')}
      expandedDay={expandedDay}
      setExpandedDay={setExpandedDay}
    />;
  }

  if (view === 'new') {
    return <NewProgram onSave={(p) => { addProgram(p); setActive(p.id); setView('list'); }} onCancel={() => setView('list')} />;
  }

  return (
    <div className="px-4 pt-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-tight">Programs</h1>
        <button
          onClick={() => setView('new')}
          className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold py-2 px-3 rounded-xl transition-colors"
        >
          <Plus size={15} />
          New
        </button>
      </div>

      {/* My Programs */}
      {programs.length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">My Programs</h2>
          <div className="space-y-3">
            {programs.map(program => (
              <div
                key={program.id}
                className={`bg-zinc-900 border rounded-2xl p-4 cursor-pointer transition-colors ${
                  program.id === activeProgramId ? 'border-orange-500/50' : 'border-zinc-800 hover:border-zinc-700'
                }`}
                onClick={() => { setSelectedProgram(program); setExpandedDay(null); setView('detail'); }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {program.id === activeProgramId && (
                        <span className="text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30 px-1.5 py-0.5 rounded-md">ACTIVE</span>
                      )}
                      <h3 className="font-bold truncate">{program.name}</h3>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">{program.daysPerWeek} days/week · {program.days.length} sessions</p>
                    {program.id === activeProgramId && currentDay && (
                      <p className="text-xs text-orange-400 mt-1">Next: {currentDay.name}</p>
                    )}
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(program.id); }}
                    className="text-zinc-600 hover:text-red-400 transition-colors ml-2 p-1"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Templates */}
      <section>
        <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Templates</h2>
        <div className="space-y-3">
          {PROGRAM_TEMPLATES.map(template => (
            <div key={template.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="font-bold">{template.name}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">{template.daysPerWeek} days/week</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setSelectedProgram(template); setExpandedDay(null); setView('detail'); }}
                    className="text-zinc-500 hover:text-zinc-300 p-1 transition-colors"
                  >
                    <Info size={15} />
                  </button>
                  <button
                    onClick={() => handleUseTemplate(template)}
                    className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-sm font-bold py-1.5 px-3 rounded-lg transition-colors"
                  >
                    <Copy size={13} />
                    Use
                  </button>
                </div>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">{template.description}</p>
              <div className="flex gap-2 mt-3 flex-wrap">
                {template.days.map(d => (
                  <span key={d.id} className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md">{d.name}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ProgramDetail({
  program,
  isActive,
  currentDayIndex,
  onSetActive,
  onBack,
  expandedDay,
  setExpandedDay,
}: {
  program: Program;
  isActive: boolean;
  currentDayIndex: number;
  onSetActive: () => void;
  onBack: () => void;
  expandedDay: string | null;
  setExpandedDay: (id: string | null) => void;
}) {
  return (
    <div className="px-4 pt-6 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-zinc-500 hover:text-white transition-colors text-sm">← Back</button>
      </div>
      <div>
        <h1 className="text-xl font-black">{program.name}</h1>
        <p className="text-sm text-zinc-500 mt-1">{program.description}</p>
      </div>
      {!isActive && (
        <button
          onClick={onSetActive}
          className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors"
        >
          <Star size={16} />
          Set as Active Program
        </button>
      )}
      {isActive && (
        <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 rounded-xl px-4 py-3">
          <Check size={15} className="text-orange-400" />
          <span className="text-sm font-semibold text-orange-400">Active Program — Next: Day {(currentDayIndex % program.days.length) + 1}</span>
        </div>
      )}
      <div className="space-y-3">
        {program.days.map((day, idx) => (
          <div key={day.id} className={`bg-zinc-900 border rounded-2xl overflow-hidden ${isActive && idx === currentDayIndex % program.days.length ? 'border-orange-500/40' : 'border-zinc-800'}`}>
            <button
              onClick={() => setExpandedDay(expandedDay === day.id ? null : day.id)}
              className="w-full flex items-center justify-between p-4"
            >
              <div className="text-left">
                <div className="flex items-center gap-2">
                  {isActive && idx === currentDayIndex % program.days.length && (
                    <span className="text-[10px] font-bold text-orange-400">NEXT</span>
                  )}
                  <span className="font-bold">{day.name}</span>
                </div>
                <span className="text-xs text-zinc-500">{day.exercises.length} exercises</span>
              </div>
              {expandedDay === day.id ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
            </button>
            {expandedDay === day.id && (
              <div className="border-t border-zinc-800">
                {day.exercises.map((ex, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-2.5 border-b border-zinc-800/50 last:border-0">
                    <span className="text-zinc-600 text-xs w-4 flex-shrink-0 pt-0.5">{i + 1}</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{getExerciseName(ex.exerciseId)}</p>
                      <p className="text-xs text-zinc-500">
                        {ex.sets} sets × {ex.repsMin}{ex.repsMax !== ex.repsMin ? `–${ex.repsMax}` : ''} reps
                        {ex.rpeTarget ? ` · RPE ${ex.rpeTarget}` : ''}
                      </p>
                      {ex.notes && <p className="text-xs text-zinc-600 mt-0.5 italic">{ex.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function NewProgram({ onSave, onCancel }: { onSave: (p: Program) => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [days, setDays] = useState<ProgramDay[]>([
    { id: uid(), name: 'Day 1', dayNumber: 1, exercises: [] },
  ]);
  const [editingDay, setEditingDay] = useState<string | null>(days[0].id);

  function addDay() {
    const newDay: ProgramDay = { id: uid(), name: `Day ${days.length + 1}`, dayNumber: days.length + 1, exercises: [] };
    setDays(d => [...d, newDay]);
  }

  function updateDay(id: string, updates: Partial<ProgramDay>) {
    setDays(d => d.map(day => day.id === id ? { ...day, ...updates } : day));
  }

  function addExercise(dayId: string, exerciseId: string) {
    const ex: ProgramExercise = { exerciseId, sets: 3, repsMin: 8, repsMax: 12, rpeTarget: 8 };
    setDays(d => d.map(day => day.id === dayId ? { ...day, exercises: [...day.exercises, ex] } : day));
  }

  function updateExercise(dayId: string, idx: number, updates: Partial<ProgramExercise>) {
    setDays(d => d.map(day => {
      if (day.id !== dayId) return day;
      const exercises = [...day.exercises];
      exercises[idx] = { ...exercises[idx], ...updates };
      return { ...day, exercises };
    }));
  }

  function removeExercise(dayId: string, idx: number) {
    setDays(d => d.map(day => {
      if (day.id !== dayId) return day;
      return { ...day, exercises: day.exercises.filter((_, i) => i !== idx) };
    }));
  }

  function handleSave() {
    if (!name.trim()) { alert('Add a program name'); return; }
    const program: Program = {
      id: uid(),
      name: name.trim(),
      description: '',
      daysPerWeek: days.length,
      days,
      createdAt: new Date().toISOString(),
    };
    onSave(program);
  }

  const currentDay = days.find(d => d.id === editingDay);

  return (
    <div className="px-4 pt-6 space-y-4 pb-6">
      <div className="flex items-center gap-3">
        <button onClick={onCancel} className="text-zinc-500 hover:text-white transition-colors text-sm">← Cancel</button>
        <h1 className="text-xl font-black flex-1">New Program</h1>
        <button
          onClick={handleSave}
          className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold py-2 px-4 rounded-xl transition-colors"
        >
          Save
        </button>
      </div>

      <input
        type="text"
        placeholder="Program name..."
        value={name}
        onChange={e => setName(e.target.value)}
        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:border-orange-500 transition-colors"
      />

      {/* Day tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {days.map(day => (
          <button
            key={day.id}
            onClick={() => setEditingDay(day.id)}
            className={`flex-shrink-0 text-xs font-bold py-1.5 px-3 rounded-lg transition-colors ${
              editingDay === day.id ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            {day.name}
          </button>
        ))}
        {days.length < 6 && (
          <button
            onClick={addDay}
            className="flex-shrink-0 flex items-center gap-1 text-xs font-bold py-1.5 px-3 rounded-lg bg-zinc-800 text-zinc-500 hover:bg-zinc-700 transition-colors"
          >
            <Plus size={12} />
          </button>
        )}
      </div>

      {currentDay && (
        <div className="space-y-3">
          <input
            type="text"
            value={currentDay.name}
            onChange={e => updateDay(currentDay.id, { name: e.target.value })}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-500 transition-colors"
            placeholder="Day name..."
          />

          {currentDay.exercises.map((ex, idx) => (
            <div key={idx} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{getExerciseName(ex.exerciseId)}</span>
                <button onClick={() => removeExercise(currentDay.id, idx)} className="text-zinc-600 hover:text-red-400 transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Sets', field: 'sets' as const, value: ex.sets },
                  { label: 'Min', field: 'repsMin' as const, value: ex.repsMin },
                  { label: 'Max', field: 'repsMax' as const, value: ex.repsMax },
                  { label: 'RPE', field: 'rpeTarget' as const, value: ex.rpeTarget ?? '' },
                ].map(({ label, field, value }) => (
                  <div key={field}>
                    <p className="text-[10px] text-zinc-600 mb-1">{label}</p>
                    <input
                      type="number"
                      value={value}
                      onChange={e => updateExercise(currentDay.id, idx, { [field]: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:border-orange-500 no-spin"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <ExercisePicker onSelect={id => addExercise(currentDay.id, id)} />
        </div>
      )}
    </div>
  );
}

function ExercisePicker({ onSelect }: { onSelect: (id: string) => void }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = EXERCISES.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.muscleGroups.some(m => m.toLowerCase().includes(search.toLowerCase()))
  ).slice(0, 20);

  return (
    <div>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-center gap-2 border border-dashed border-zinc-700 hover:border-orange-500/50 text-zinc-500 hover:text-orange-400 py-3 rounded-xl text-sm font-semibold transition-colors"
        >
          <Plus size={16} />
          Add Exercise
        </button>
      ) : (
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden">
          <input
            autoFocus
            type="text"
            placeholder="Search exercises..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-transparent px-4 py-3 text-sm focus:outline-none border-b border-zinc-800"
          />
          <div className="max-h-48 overflow-y-auto">
            {filtered.map(ex => (
              <button
                key={ex.id}
                onClick={() => { onSelect(ex.id); setSearch(''); setOpen(false); }}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-zinc-800 text-left transition-colors"
              >
                <span className="text-sm">{ex.name}</span>
                <span className="text-xs text-zinc-600">{ex.muscleGroups[0]}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-full py-2 text-xs text-zinc-500 hover:text-zinc-300 border-t border-zinc-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
